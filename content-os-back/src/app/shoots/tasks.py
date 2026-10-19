"""Страница My tasks: deliverables съёмок как задачи (docs/adr/0011).

Арт-директор видит deliverables своих съёмок, креатор — те, где он исполнитель.
Статус задачи арт-директора — статус deliverable, креатора — его собственный
(docs/adr/0015): одобренная работа одного не ждёт проверки другого.
"""

import enum
import uuid
from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from sqlalchemy import (
    ColumnElement,
    Row,
    Select,
    case,
    exists,
    false,
    func,
    nulls_last,
    or_,
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import QueryableAttribute, aliased

from app.auth.models import Role, User
from app.core.config import Settings
from app.core.storage import Storage
from app.core.text import escape_like
from app.deliverables.models import DeliverableStatus
from app.files.models import StoredFile
from app.files.schemas import FileResponse
from app.products.models import Product, ProductPhoto
from app.references import service as references
from app.references.models import Reference
from app.shoots.models import (
    Shoot,
    ShootDeliverable,
    ShootDeliverableAssignee,
    ShootDeliverableReference,
)
from app.shoots.schemas import (
    TaskCounts,
    TaskFilterOption,
    TaskFilters,
    TaskItem,
    TaskList,
    TaskProduct,
    TaskShoot,
)
from app.team.schemas import TeamMember

# Сколько референсов задачи показывает строка; остальные — числом «+N».
SHOWN_REFERENCES = 3


class TaskSort(enum.StrEnum):
    # Сначала то, что ждёт действия пользователя, затем по сроку.
    PRIORITY = "priority"
    # Ближайший срок первым, без срока — в конце.
    DUE_DATE = "due_date"
    NAME_ASC = "name_asc"


# Порядок статусов для Priority: арт-директор проверяет загрузки, креатор
# переделывает и снимает.
_PRIORITY: dict[Role, list[DeliverableStatus]] = {
    Role.ART_DIRECTOR: [
        DeliverableStatus.NEEDS_REVIEW,
        DeliverableStatus.NEEDS_CHANGES,
        DeliverableStatus.IN_PROGRESS,
        DeliverableStatus.TO_SHOOT,
        DeliverableStatus.APPROVED,
    ],
    Role.CREATOR: [
        DeliverableStatus.NEEDS_CHANGES,
        DeliverableStatus.TO_SHOOT,
        DeliverableStatus.IN_PROGRESS,
        DeliverableStatus.NEEDS_REVIEW,
        DeliverableStatus.APPROVED,
    ],
}


@dataclass(frozen=True)
class TaskQuery:
    search: str = ""
    status: DeliverableStatus | None = None
    shoot_id: uuid.UUID | None = None
    product_id: uuid.UUID | None = None
    assignee_id: uuid.UUID | None = None
    sort: TaskSort = TaskSort.PRIORITY


# Строка исполнителя-пользователя в задачах креатора: алиас, чтобы подзапросы по
# исполнителям (поиск, фильтр) не связывались с ней.
_mine = aliased(ShootDeliverableAssignee, name="mine")


def task_status(user: User) -> QueryableAttribute[DeliverableStatus]:
    """Статус задачи для пользователя: креатору — его собственный."""
    if user.role == Role.CREATOR:
        return _mine.status
    return ShootDeliverable.status


def _assigned(user_id: uuid.UUID) -> ColumnElement[bool]:
    return exists().where(
        ShootDeliverableAssignee.deliverable_id == ShootDeliverable.id,
        ShootDeliverableAssignee.user_id == user_id,
    )


def visible_tasks(user: User) -> Select[ShootDeliverable, Shoot, Product, DeliverableStatus]:
    """Арт-директор — deliverables своих съёмок, креатор — где он исполнитель.

    Последняя колонка `task_status` — статус задачи для пользователя.
    """
    query = (
        select(ShootDeliverable, Shoot, Product, task_status(user).label("task_status"))
        .join(Shoot, Shoot.id == ShootDeliverable.shoot_id)
        .join(Product, Product.id == ShootDeliverable.product_id)
    )
    if user.role == Role.ART_DIRECTOR:
        return query.where(Shoot.art_director_id == user.id)
    if user.role == Role.CREATOR:
        return query.join(
            _mine, (_mine.deliverable_id == ShootDeliverable.id) & (_mine.user_id == user.id)
        )
    return query.where(false())


TaskRow = Row[ShootDeliverable, Shoot, Product, DeliverableStatus]


def _filtered(
    user: User, params: TaskQuery
) -> Select[ShootDeliverable, Shoot, Product, DeliverableStatus]:
    """Под поиском и фильтрами, без статуса: по ним считаются вкладки."""
    query = visible_tasks(user)
    if params.search:
        pattern = f"%{escape_like(params.search)}%"
        query = query.where(
            or_(
                ShootDeliverable.name.ilike(pattern, escape="\\"),
                Product.name.ilike(pattern, escape="\\"),
                Shoot.name.ilike(pattern, escape="\\"),
                exists()
                .where(
                    ShootDeliverableAssignee.deliverable_id == ShootDeliverable.id,
                    ShootDeliverableAssignee.user_id == User.id,
                )
                .where(User.name.ilike(pattern, escape="\\")),
            )
        )
    if params.shoot_id is not None:
        query = query.where(ShootDeliverable.shoot_id == params.shoot_id)
    if params.product_id is not None:
        query = query.where(ShootDeliverable.product_id == params.product_id)
    if params.assignee_id is not None:
        query = query.where(_assigned(params.assignee_id))
    return query


def _order(user: User, sort: TaskSort) -> tuple[Any, ...]:
    due = nulls_last(ShootDeliverable.due_date.asc())
    if sort == TaskSort.NAME_ASC:
        return (func.lower(ShootDeliverable.name).asc(), ShootDeliverable.id.asc())
    tail = (Shoot.date.asc(), ShootDeliverable.position.asc(), ShootDeliverable.id.asc())
    if sort == TaskSort.DUE_DATE:
        return (due, *tail)
    order = _PRIORITY[Role.ART_DIRECTOR if user.role == Role.ART_DIRECTOR else Role.CREATOR]
    status = task_status(user)
    rank = case(
        *((status == value, index) for index, value in enumerate(order)),
        else_=len(order),
    )
    return (rank, due, *tail)


async def list_tasks(
    db: AsyncSession,
    user: User,
    storage: Storage,
    settings: Settings,
    params: TaskQuery,
    page: int,
    per_page: int,
) -> TaskList:
    matched = (
        _filtered(user, params).with_only_columns(task_status(user).label("status")).subquery()
    )
    sizes = (
        await db.execute(
            select(
                func.count().label("all"),
                *(
                    func.count().filter(matched.c.status == value.value).label(value.value)
                    for value in DeliverableStatus
                ),
            ).select_from(matched)
        )
    ).one()
    counts = TaskCounts.model_validate(sizes._asdict())

    query = _filtered(user, params)
    total = counts.all
    if params.status is not None:
        query = query.where(task_status(user) == params.status)
        total = getattr(counts, params.status.value)
    rows = (
        await db.execute(
            query.order_by(*_order(user, params.sort)).offset((page - 1) * per_page).limit(per_page)
        )
    ).all()
    return TaskList(
        items=await to_items(db, user, storage, settings, rows), total=total, counts=counts
    )


async def to_items(
    db: AsyncSession,
    user: User,
    storage: Storage,
    settings: Settings,
    rows: Sequence[TaskRow],
) -> list[TaskItem]:
    """Фото продуктов, исполнители и референсы: число запросов не зависит от страницы."""
    if not rows:
        return []
    ids = [row.ShootDeliverable.id for row in rows]

    photos: dict[uuid.UUID, StoredFile] = {
        row.product_id: row.StoredFile
        for row in await db.execute(
            select(ProductPhoto.product_id, StoredFile)
            .join(StoredFile, StoredFile.id == ProductPhoto.file_id)
            .where(
                ProductPhoto.product_id.in_({row.Product.id for row in rows}),
                ProductPhoto.position == 0,
            )
        )
    }

    assignees: dict[uuid.UUID, list[TeamMember]] = defaultdict(list)
    for row in await db.execute(
        select(ShootDeliverableAssignee.deliverable_id, User)
        .join(User, User.id == ShootDeliverableAssignee.user_id)
        .where(ShootDeliverableAssignee.deliverable_id.in_(ids))
        .order_by(ShootDeliverableAssignee.deliverable_id, ShootDeliverableAssignee.position)
    ):
        assignees[row.deliverable_id].append(TeamMember.of(row.User, settings))

    # Первые SHOWN_REFERENCES референсов каждой задачи и их общее число.
    numbered = (
        select(
            ShootDeliverableReference.deliverable_id,
            ShootDeliverableReference.reference_id,
            func.row_number()
            .over(
                partition_by=ShootDeliverableReference.deliverable_id,
                order_by=ShootDeliverableReference.position,
            )
            .label("number"),
            func.count().over(partition_by=ShootDeliverableReference.deliverable_id).label("total"),
        )
        .where(ShootDeliverableReference.deliverable_id.in_(ids))
        .subquery()
    )
    shown: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    reference_totals: dict[uuid.UUID, int] = {}
    for row in await db.execute(
        select(numbered)
        .where(numbered.c.number <= SHOWN_REFERENCES)
        .order_by(numbered.c.deliverable_id, numbered.c.number)
    ):
        shown[row.deliverable_id].append(row.reference_id)
        reference_totals[row.deliverable_id] = row.total
    wanted = {reference_id for ids_ in shown.values() for reference_id in ids_}
    loaded = list(await db.scalars(select(Reference).where(Reference.id.in_(wanted))))
    responses = {
        response.id: response
        for response in await references.to_responses(db, user, storage, loaded)
    }

    def product(item: Product) -> TaskProduct:
        photo = photos.get(item.id)
        return TaskProduct(
            id=item.id,
            name=item.name,
            sku=item.sku,
            photo=FileResponse.of(photo, storage) if photo is not None else None,
        )

    return [
        TaskItem(
            id=row.ShootDeliverable.id,
            name=row.ShootDeliverable.name,
            status=row.task_status,
            due_date=row.ShootDeliverable.due_date,
            shoot=TaskShoot(id=row.Shoot.id, name=row.Shoot.name, date=row.Shoot.date),
            product=product(row.Product),
            assignees=assignees[row.ShootDeliverable.id],
            references=[
                responses[reference_id]
                for reference_id in shown[row.ShootDeliverable.id]
                if reference_id in responses
            ],
            references_total=reference_totals.get(row.ShootDeliverable.id, 0),
        )
        for row in rows
    ]


async def list_filters(db: AsyncSession, user: User, settings: Settings) -> TaskFilters:
    """Съёмки, продукты и исполнители задач пользователя: варианты фильтров."""
    tasks = (
        visible_tasks(user)
        .with_only_columns(
            ShootDeliverable.id, ShootDeliverable.shoot_id, ShootDeliverable.product_id
        )
        .subquery()
    )
    shoots = await db.execute(
        select(Shoot.id, Shoot.name)
        .where(Shoot.id.in_(select(tasks.c.shoot_id)))
        .order_by(Shoot.date.desc(), Shoot.id)
    )
    products = await db.execute(
        select(Product.id, Product.name)
        .where(Product.id.in_(select(tasks.c.product_id)))
        .order_by(Product.name, Product.id)
    )
    people = await db.scalars(
        select(User)
        .where(
            User.id.in_(
                select(ShootDeliverableAssignee.user_id).where(
                    ShootDeliverableAssignee.deliverable_id.in_(select(tasks.c.id))
                )
            )
        )
        .order_by(User.name, User.id)
    )
    return TaskFilters(
        shoots=[TaskFilterOption(id=row.id, name=row.name) for row in shoots],
        products=[TaskFilterOption(id=row.id, name=row.name) for row in products],
        assignees=[TeamMember.of(person, settings) for person in people],
    )
