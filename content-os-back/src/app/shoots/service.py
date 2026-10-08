"""Съёмки: создание и список. Коммитит вызывающий (docs/adr/0007)."""

import enum
import uuid
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import (
    ColumnElement,
    Date,
    Select,
    UnaryExpression,
    and_,
    case,
    cast,
    exists,
    false,
    func,
    or_,
    select,
    text,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import ArtDirectorCreator
from app.auth.models import Role, Status, User
from app.core.config import Settings
from app.core.storage import Storage
from app.core.text import escape_like
from app.deliverables.models import Deliverable, DeliverableStatus
from app.files.models import StoredFile
from app.files.schemas import FileResponse
from app.products.models import Product, ProductPhoto
from app.references import service as references
from app.shoots.models import (
    Shoot,
    ShootDeliverable,
    ShootDeliverableAssignee,
    ShootDeliverableReference,
    ShootMember,
    ShootProduct,
    ShootReference,
    ShootRole,
)
from app.shoots.schemas import (
    ShootCounts,
    ShootCreate,
    ShootList,
    ShootListItem,
    ShootStatus,
)
from app.team.schemas import TeamMember

# Съёмки проходят в Узбекистане (адреса — из подсказок по Узбекистану): «уже
# началась» и «эта неделя» считаются по ташкентскому времени.
TIMEZONE = "Asia/Tashkent"


def _unprocessable(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail)


async def _require_own_creators(db: AsyncSession, art_director: User, ids: set[uuid.UUID]) -> None:
    """Команда съёмки — одобренные креаторы арт-директора (docs/adr/0002)."""
    if not ids:
        return
    linked = set(
        await db.scalars(
            select(User.id)
            .join(ArtDirectorCreator, ArtDirectorCreator.creator_id == User.id)
            .where(
                ArtDirectorCreator.art_director_id == art_director.id,
                User.id.in_(ids),
                User.status == Status.APPROVED,
            )
        )
    )
    # Чужой креатор отвечает так же, как несуществующий пользователь.
    if linked != ids:
        raise _unprocessable("Not your creator")


async def _require_assigned_products(
    db: AsyncSession, art_director: User, ids: set[uuid.UUID]
) -> None:
    """Продукты — те, где на арт-директора назначен deliverable (docs/adr/0004)."""
    assigned = set(
        await db.scalars(
            select(Deliverable.product_id)
            .where(Deliverable.product_id.in_(ids), Deliverable.assignee_id == art_director.id)
            .distinct()
        )
    )
    if assigned != ids:
        raise _unprocessable("Product not found")


async def create_shoot(db: AsyncSession, art_director: User, body: ShootCreate) -> Shoot:
    """Съёмка с командой, продуктами, референсами и deliverables одной транзакцией."""
    await _require_own_creators(db, art_director, set(body.team_ids()))
    await _require_assigned_products(db, art_director, set(body.product_ids))
    wanted = set(body.reference_ids)
    if await references.visible_ids(db, art_director, wanted) != wanted:
        raise _unprocessable("Reference not found")

    shoot = Shoot(
        art_director_id=art_director.id,
        name=body.name,
        date=body.date,
        start_time=body.start_time,
        duration_minutes=body.duration_minutes,
        location=body.location or None,
    )
    db.add(shoot)
    await db.flush()

    roles = [(user_id, ShootRole.CREATOR) for user_id in body.creator_ids]
    if body.mobilographer_id:
        roles.append((body.mobilographer_id, ShootRole.MOBILOGRAPHER))
    db.add_all(
        ShootMember(shoot_id=shoot.id, user_id=user_id, role=role, position=index)
        for index, (user_id, role) in enumerate(roles)
    )
    db.add_all(
        ShootProduct(shoot_id=shoot.id, product_id=product_id, position=index)
        for index, product_id in enumerate(body.product_ids)
    )
    db.add_all(
        ShootReference(shoot_id=shoot.id, reference_id=reference_id, position=index)
        for index, reference_id in enumerate(body.reference_ids)
    )
    for index, draft in enumerate(body.deliverables):
        deliverable = ShootDeliverable(
            shoot_id=shoot.id,
            position=index,
            product_id=draft.product_id,
            name=draft.name,
            status=draft.status,
            due_date=draft.due_date,
        )
        db.add(deliverable)
        await db.flush()
        db.add_all(
            ShootDeliverableAssignee(deliverable_id=deliverable.id, user_id=user_id, position=i)
            for i, user_id in enumerate(draft.assignee_ids)
        )
        db.add_all(
            ShootDeliverableReference(
                deliverable_id=deliverable.id, reference_id=reference_id, position=i
            )
            for i, reference_id in enumerate(draft.reference_ids)
        )
    await db.flush()
    return shoot


def _visible(user: User) -> ColumnElement[bool]:
    """Съёмки, которые видит пользователь: арт-директор — свои, креатор — те, где он в команде."""
    if user.role == Role.ART_DIRECTOR:
        return Shoot.art_director_id == user.id
    if user.role == Role.CREATOR:
        return exists().where(ShootMember.shoot_id == Shoot.id, ShootMember.user_id == user.id)
    return false()


class ShootPeriod(enum.StrEnum):
    """Фильтр Date и период Shoot overview: по дате съёмки."""

    THIS_WEEK = "this_week"
    THIS_MONTH = "this_month"
    # С этого дня N месяцев назад, будущие съёмки тоже.
    LAST_3_MONTHS = "last_3_months"
    LAST_6_MONTHS = "last_6_months"


class ShootSort(enum.StrEnum):
    # По дате съёмки.
    NEWEST = "newest"
    OLDEST = "oldest"
    NAME_ASC = "name_asc"
    NAME_DESC = "name_desc"


_ORDER: dict[ShootSort, tuple[UnaryExpression[Any], ...]] = {
    ShootSort.NEWEST: (Shoot.date.desc(), Shoot.start_time.desc(), Shoot.id.desc()),
    ShootSort.OLDEST: (Shoot.date.asc(), Shoot.start_time.asc(), Shoot.id.asc()),
    ShootSort.NAME_ASC: (func.lower(Shoot.name).asc(), Shoot.id.asc()),
    ShootSort.NAME_DESC: (func.lower(Shoot.name).desc(), Shoot.id.desc()),
}


@dataclass(frozen=True)
class ShootQuery:
    search: str = ""
    status: ShootStatus | None = None
    period: ShootPeriod | None = None
    sort: ShootSort = ShootSort.NEWEST


def _today() -> ColumnElement[Any]:
    return cast(func.timezone(TIMEZONE, func.now()), Date)


def _in_period(period: ShootPeriod) -> ColumnElement[bool]:
    today = _today()
    if period == ShootPeriod.THIS_WEEK:
        start = cast(func.date_trunc("week", today), Date)
        return and_(Shoot.date >= start, Shoot.date < start + 7)
    if period == ShootPeriod.THIS_MONTH:
        start = cast(func.date_trunc("month", today), Date)
        return and_(Shoot.date >= start, Shoot.date < start + text("interval '1 month'"))
    months = 3 if period == ShootPeriod.LAST_3_MONTHS else 6
    return Shoot.date >= today - text(f"interval '{months} months'")


def _with_status(user: User) -> Select[Any]:
    """Видимые съёмки со статусом и прогрессом.

    Статус выводится, а не хранится (docs/adr/0007): все deliverables approved —
    completed; хоть один начат — in_progress; иначе upcoming, пока съёмка не началась,
    и to_shoot после.
    """
    stats = (
        select(
            ShootDeliverable.shoot_id,
            func.count().label("total"),
            func.count()
            .filter(ShootDeliverable.status == DeliverableStatus.APPROVED)
            .label("approved"),
            func.count()
            .filter(ShootDeliverable.status != DeliverableStatus.TO_SHOOT)
            .label("started"),
        )
        .group_by(ShootDeliverable.shoot_id)
        .subquery()
    )
    total = func.coalesce(stats.c.total, 0)
    approved = func.coalesce(stats.c.approved, 0)
    started = func.coalesce(stats.c.started, 0)
    starts_at = func.timezone(TIMEZONE, Shoot.date + Shoot.start_time)
    shoot_status = case(
        (and_(total > 0, approved == total), ShootStatus.COMPLETED.value),
        (started > 0, ShootStatus.IN_PROGRESS.value),
        (starts_at > func.now(), ShootStatus.UPCOMING.value),
        else_=ShootStatus.TO_SHOOT.value,
    )
    return (
        select(
            Shoot,
            shoot_status.label("status"),
            total.label("total"),
            approved.label("approved"),
        )
        .outerjoin(stats, stats.c.shoot_id == Shoot.id)
        .where(_visible(user))
    )


def _filtered(user: User, params: ShootQuery) -> Select[Any]:
    """Под поиском и фильтрами, без статуса: по ним считаются вкладки."""
    query = _with_status(user)
    if params.search:
        pattern = f"%{escape_like(params.search)}%"
        query = query.where(
            or_(
                Shoot.name.ilike(pattern, escape="\\"),
                Shoot.location.ilike(pattern, escape="\\"),
                exists()
                .where(ShootProduct.shoot_id == Shoot.id, ShootProduct.product_id == Product.id)
                .where(Product.name.ilike(pattern, escape="\\")),
            )
        )
    if params.period is not None:
        query = query.where(_in_period(params.period))
    return query


async def list_shoots(
    db: AsyncSession,
    user: User,
    storage: Storage,
    settings: Settings,
    params: ShootQuery,
    page: int,
    per_page: int,
) -> ShootList:
    matched = _filtered(user, params).subquery()
    status_column = matched.c.status
    sizes = (
        await db.execute(
            select(
                func.count().label("all"),
                *(
                    func.count().filter(status_column == value.value).label(value.value)
                    for value in ShootStatus
                ),
            ).select_from(matched)
        )
    ).one()
    counts = ShootCounts.model_validate(sizes._asdict())

    query = _filtered(user, params)
    total = counts.all
    if params.status is not None:
        query = query.where(query.selected_columns.status == params.status.value)
        total = getattr(counts, params.status.value)
    rows = (
        await db.execute(
            query.order_by(*_ORDER[params.sort]).offset((page - 1) * per_page).limit(per_page)
        )
    ).all()
    return ShootList(items=await _to_items(db, storage, settings, rows), total=total, counts=counts)


async def get_item(
    db: AsyncSession, user: User, storage: Storage, settings: Settings, shoot_id: uuid.UUID
) -> ShootListItem:
    """Съёмка в виде строки списка: ответ на создание."""
    rows = (await db.execute(_with_status(user).where(Shoot.id == shoot_id))).all()
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Shoot not found")
    return (await _to_items(db, storage, settings, rows))[0]


async def _to_items(
    db: AsyncSession, storage: Storage, settings: Settings, rows: list[Any]
) -> list[ShootListItem]:
    """Обложка, число продуктов и команда: три запроса на любое число съёмок."""
    ids = [row.Shoot.id for row in rows]
    if not ids:
        return []
    products: dict[uuid.UUID, int] = {
        row.shoot_id: row.products
        for row in await db.execute(
            select(ShootProduct.shoot_id, func.count().label("products"))
            .where(ShootProduct.shoot_id.in_(ids))
            .group_by(ShootProduct.shoot_id)
        )
    }
    # Обложка — первое фото первого продукта.
    covers: dict[uuid.UUID, StoredFile] = {
        row.shoot_id: row.StoredFile
        for row in await db.execute(
            select(ShootProduct.shoot_id, StoredFile)
            .join(ProductPhoto, ProductPhoto.product_id == ShootProduct.product_id)
            .join(StoredFile, StoredFile.id == ProductPhoto.file_id)
            .where(
                ShootProduct.shoot_id.in_(ids),
                ShootProduct.position == 0,
                ProductPhoto.position == 0,
            )
        )
    }
    members: dict[uuid.UUID, list[User]] = defaultdict(list)
    for row in await db.execute(
        select(ShootMember.shoot_id, User)
        .join(User, User.id == ShootMember.user_id)
        .where(ShootMember.shoot_id.in_(ids))
        .order_by(ShootMember.shoot_id, ShootMember.position)
    ):
        members[row.shoot_id].append(row.User)
    art_directors: dict[uuid.UUID, User] = {
        user.id: user
        for user in await db.scalars(
            select(User).where(User.id.in_({row.Shoot.art_director_id for row in rows}))
        )
    }

    def team(shoot: Shoot) -> list[TeamMember]:
        people = [art_directors[shoot.art_director_id], *members[shoot.id]]
        return [TeamMember.of(person, settings) for person in people]

    return [
        ShootListItem(
            id=row.Shoot.id,
            name=row.Shoot.name,
            date=row.Shoot.date,
            start_time=row.Shoot.start_time,
            duration_minutes=row.Shoot.duration_minutes,
            location=row.Shoot.location,
            status=ShootStatus(row.status),
            photo=FileResponse.of(covers[row.Shoot.id], storage)
            if row.Shoot.id in covers
            else None,
            products=products.get(row.Shoot.id, 0),
            deliverables=row.total,
            approved=row.approved,
            team=team(row.Shoot),
        )
        for row in rows
    ]
