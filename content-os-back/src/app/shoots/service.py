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
    delete,
    exists,
    false,
    func,
    or_,
    select,
    text,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, User
from app.core.config import Settings
from app.core.storage import Storage
from app.core.text import escape_like
from app.deliverables.models import Deliverable, DeliverableStatus
from app.files.models import StoredFile
from app.files.schemas import FileResponse
from app.products.models import Product, ProductPhoto, ProductStatus
from app.references import service as references
from app.references.models import Reference
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
    DeliverableCounts,
    ShootCounts,
    ShootCreate,
    ShootDeliverableDraft,
    ShootDeliverableResponse,
    ShootList,
    ShootListItem,
    ShootProductItem,
    ShootResponse,
    ShootStatus,
)
from app.shoots.statuses import combined_status, work_statuses
from app.team import service as team
from app.team.schemas import TeamMember

# Съёмки проходят в Узбекистане (адреса — из подсказок по Узбекистану): «уже
# началась» и «эта неделя» считаются по ташкентскому времени.
TIMEZONE = "Asia/Tashkent"


def _unprocessable(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail)


async def _require_own_creators(db: AsyncSession, art_director: User, ids: set[uuid.UUID]) -> None:
    """Команда съёмки — одобренные креаторы арт-директора (docs/adr/0002)."""
    # Чужой креатор отвечает так же, как несуществующий пользователь.
    if not await team.all_in(db, team.creator_ids(art_director.id), ids):
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
    # Архивный продукт в новые съёмки не берётся (docs/adr/0005).
    if await db.scalar(
        select(exists().where(Product.id.in_(ids), Product.status == ProductStatus.ARCHIVED))
    ):
        raise _unprocessable("Product is archived")


async def _check(
    db: AsyncSession, art_director: User, body: ShootCreate, shoot: Shoot | None = None
) -> None:
    """Команда, продукты и референсы — те, что арт-директор может взять в съёмку.

    При редактировании уже стоящие в съёмке проходят без проверки: связку с
    креатором или назначение на продукт могли снять, а продукт — отправить в
    архив после создания.
    """
    members: set[uuid.UUID] = set()
    products: set[uuid.UUID] = set()
    shoot_references: set[uuid.UUID] = set()
    if shoot is not None:
        members = set(
            await db.scalars(select(ShootMember.user_id).where(ShootMember.shoot_id == shoot.id))
        )
        products = set(
            await db.scalars(
                select(ShootProduct.product_id).where(ShootProduct.shoot_id == shoot.id)
            )
        )
        shoot_references = set(
            await db.scalars(
                select(ShootReference.reference_id).where(ShootReference.shoot_id == shoot.id)
            )
        )
    await _require_own_creators(db, art_director, set(body.team_ids()) - members)
    await _require_assigned_products(db, art_director, set(body.product_ids) - products)
    wanted = set(body.reference_ids) - shoot_references
    if await references.visible_ids(db, art_director, wanted) != wanted:
        raise _unprocessable("Reference not found")


def _set_fields(shoot: Shoot, body: ShootCreate) -> None:
    shoot.name = body.name
    shoot.date = body.date
    shoot.start_time = body.start_time
    shoot.duration_minutes = body.duration_minutes
    shoot.location = body.location or None


def _add_links(db: AsyncSession, shoot: Shoot, body: ShootCreate) -> None:
    """Команда, продукты и референсы съёмки в порядке запроса."""
    roles = [(user_id, ShootRole.CREATOR) for user_id in body.creator_ids]
    roles += [(user_id, ShootRole.MOBILOGRAPHER) for user_id in body.mobilographer_ids]
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


async def _write_deliverables(
    db: AsyncSession,
    shoot: Shoot,
    drafts: list[ShootDeliverableDraft],
    existing: dict[uuid.UUID, ShootDeliverable],
    progress: dict[tuple[uuid.UUID, uuid.UUID], DeliverableStatus],
) -> None:
    """Deliverables по порядку: с `id` — обновляются (из `existing`), без — создаются.

    `progress` — статусы работы авторов по их версиям: она не сбрасывается.
    Статус из формы — только у нового. У сохранённого, где кто-то работал, он
    собирается из статусов оставшихся исполнителей; отправленный бренду остаётся
    отправленным (docs/adr/0015).
    """
    for index, draft in enumerate(drafts):
        deliverable = existing[draft.id] if draft.id is not None else None
        if deliverable is None:
            deliverable = ShootDeliverable(
                shoot_id=shoot.id, status=draft.status or DeliverableStatus.TO_SHOOT
            )
            db.add(deliverable)
        deliverable.position = index
        deliverable.product_id = draft.product_id
        deliverable.name = draft.name
        deliverable.type = draft.type
        deliverable.due_date = draft.due_date
        await db.flush()
        statuses = [
            progress.get((deliverable.id, user_id), DeliverableStatus.TO_SHOOT)
            for user_id in draft.assignee_ids
        ]
        # Работал хоть кто-то, в том числе снятый сейчас с deliverable.
        worked = any(key[0] == deliverable.id for key in progress)
        if worked and deliverable.status != DeliverableStatus.APPROVED:
            deliverable.status = combined_status(statuses)
        db.add_all(
            ShootDeliverableAssignee(
                deliverable_id=deliverable.id, user_id=user_id, position=i, status=status
            )
            for i, (user_id, status) in enumerate(zip(draft.assignee_ids, statuses, strict=True))
        )
        db.add_all(
            ShootDeliverableReference(
                deliverable_id=deliverable.id, reference_id=reference_id, position=i
            )
            for i, reference_id in enumerate(draft.reference_ids)
        )


async def create_shoot(db: AsyncSession, art_director: User, body: ShootCreate) -> Shoot:
    """Съёмка с командой, продуктами, референсами и deliverables одной транзакцией."""
    if any(draft.id is not None for draft in body.deliverables):
        raise _unprocessable("Unknown deliverable")
    await _check(db, art_director, body)
    shoot = Shoot(art_director_id=art_director.id)
    _set_fields(shoot, body)
    db.add(shoot)
    await db.flush()
    _add_links(db, shoot, body)
    await _write_deliverables(db, shoot, body.deliverables, {}, {})
    await db.flush()
    return shoot


async def update_shoot(
    db: AsyncSession, art_director: User, shoot_id: uuid.UUID, body: ShootCreate
) -> Shoot:
    """Форма редактирования целиком (docs/adr/0008). Только автор съёмки, остальным 404.

    Команда, продукты и референсы записываются заново. Deliverables с `id`
    обновляются и сохраняют свой id (на нём будут задачи и загрузки), без `id` —
    создаются, не перечисленные — удаляются.
    """
    shoot = await db.scalar(
        select(Shoot)
        .where(Shoot.id == shoot_id, Shoot.art_director_id == art_director.id)
        .with_for_update()
    )
    if shoot is None:
        raise _not_found()
    await _check(db, art_director, body, shoot)
    # Исполнители меняют версии и статусы под блокировкой deliverable: ждём их.
    existing = {
        deliverable.id: deliverable
        for deliverable in await db.scalars(
            select(ShootDeliverable)
            .where(ShootDeliverable.shoot_id == shoot.id)
            .order_by(ShootDeliverable.id)
            .with_for_update()
        )
    }
    kept = {draft.id for draft in body.deliverables if draft.id is not None}
    if not kept <= set(existing):
        raise _unprocessable("Unknown deliverable")

    for model in (ShootMember, ShootProduct, ShootReference):
        await db.execute(delete(model).where(model.shoot_id == shoot.id))
    if removed := set(existing) - kept:
        await db.execute(delete(ShootDeliverable).where(ShootDeliverable.id.in_(removed)))
    # По версиям, а не по строкам исполнителей: вновь назначенный получает свою работу назад.
    progress = await work_statuses(db, kept) if kept else {}
    if kept:
        for link in (ShootDeliverableAssignee, ShootDeliverableReference):
            await db.execute(delete(link).where(link.deliverable_id.in_(kept)))
    _set_fields(shoot, body)
    _add_links(db, shoot, body)
    await _write_deliverables(db, shoot, body.deliverables, existing, progress)
    await db.flush()
    return shoot


def _not_found() -> HTTPException:
    # Чужая съёмка отвечает так же, как несуществующая.
    return HTTPException(status.HTTP_404_NOT_FOUND, "Shoot not found")


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
    completed; хоть один ждёт проверки — needs_review (docs/adr/0009); хоть один
    начат — in_progress; иначе upcoming, пока съёмка не началась, и to_shoot после.
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
            func.count()
            .filter(ShootDeliverable.status == DeliverableStatus.NEEDS_REVIEW)
            .label("in_review"),
        )
        .group_by(ShootDeliverable.shoot_id)
        .subquery()
    )
    total = func.coalesce(stats.c.total, 0)
    approved = func.coalesce(stats.c.approved, 0)
    started = func.coalesce(stats.c.started, 0)
    in_review = func.coalesce(stats.c.in_review, 0)
    starts_at = func.timezone(TIMEZONE, Shoot.date + Shoot.start_time)
    shoot_status = case(
        (and_(total > 0, approved == total), ShootStatus.COMPLETED.value),
        (in_review > 0, ShootStatus.NEEDS_REVIEW.value),
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
        raise _not_found()
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


async def get_shoot(
    db: AsyncSession, user: User, storage: Storage, settings: Settings, shoot_id: uuid.UUID
) -> ShootResponse:
    """Страница съёмки: автору и команде (_visible), остальным 404.

    Число запросов не зависит от размера съёмки.
    """
    row = (await db.execute(_with_status(user).where(Shoot.id == shoot_id))).one_or_none()
    if row is None:
        raise _not_found()
    shoot: Shoot = row.Shoot

    members = (
        await db.execute(
            select(ShootMember.user_id, ShootMember.role)
            .where(ShootMember.shoot_id == shoot.id)
            .order_by(ShootMember.position)
        )
    ).all()
    deliverables = list(
        await db.scalars(
            select(ShootDeliverable)
            .where(ShootDeliverable.shoot_id == shoot.id)
            .order_by(ShootDeliverable.position, ShootDeliverable.id)
        )
    )
    deliverable_ids = [deliverable.id for deliverable in deliverables]
    assignees: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    for row_ in await db.execute(
        select(ShootDeliverableAssignee.deliverable_id, ShootDeliverableAssignee.user_id)
        .where(ShootDeliverableAssignee.deliverable_id.in_(deliverable_ids))
        .order_by(ShootDeliverableAssignee.position)
    ):
        assignees[row_.deliverable_id].append(row_.user_id)
    deliverable_references: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    for row_ in await db.execute(
        select(ShootDeliverableReference.deliverable_id, ShootDeliverableReference.reference_id)
        .where(ShootDeliverableReference.deliverable_id.in_(deliverable_ids))
        .order_by(ShootDeliverableReference.position)
    ):
        deliverable_references[row_.deliverable_id].append(row_.reference_id)

    wanted = {
        shoot.art_director_id,
        *(member.user_id for member in members),
        *(user_id for ids in assignees.values() for user_id in ids),
    }
    people = {
        person.id: person for person in await db.scalars(select(User).where(User.id.in_(wanted)))
    }

    def member(user_id: uuid.UUID) -> TeamMember:
        return TeamMember.of(people[user_id], settings)

    products = (
        await db.execute(
            select(Product, StoredFile)
            .join(ShootProduct, ShootProduct.product_id == Product.id)
            .outerjoin(
                ProductPhoto,
                and_(ProductPhoto.product_id == Product.id, ProductPhoto.position == 0),
            )
            .outerjoin(StoredFile, StoredFile.id == ProductPhoto.file_id)
            .where(ShootProduct.shoot_id == shoot.id)
            .order_by(ShootProduct.position)
        )
    ).all()

    def counts(items: list[ShootDeliverable]) -> DeliverableCounts:
        by_status = dict.fromkeys(DeliverableStatus, 0)
        for item in items:
            by_status[item.status] += 1
        return DeliverableCounts(total=len(items), **{k.value: v for k, v in by_status.items()})

    shoot_references = list(
        await db.scalars(
            select(Reference)
            .join(ShootReference, ShootReference.reference_id == Reference.id)
            .where(ShootReference.shoot_id == shoot.id)
            .order_by(ShootReference.position)
        )
    )

    return ShootResponse(
        id=shoot.id,
        name=shoot.name,
        date=shoot.date,
        start_time=shoot.start_time,
        duration_minutes=shoot.duration_minutes,
        location=shoot.location,
        status=ShootStatus(row.status),
        art_director=member(shoot.art_director_id),
        creators=[member(m.user_id) for m in members if m.role == ShootRole.CREATOR],
        mobilographers=[member(m.user_id) for m in members if m.role == ShootRole.MOBILOGRAPHER],
        products=[
            ShootProductItem(
                id=product.id,
                name=product.name,
                collection=product.collection,
                category=product.category,
                photo=FileResponse.of(photo, storage) if photo is not None else None,
                deliverables=counts([d for d in deliverables if d.product_id == product.id]),
            )
            for product, photo in products
        ],
        references=await references.to_responses(db, user, storage, shoot_references),
        deliverables=[
            ShootDeliverableResponse(
                id=deliverable.id,
                name=deliverable.name,
                type=deliverable.type,
                product_id=deliverable.product_id,
                assignees=[member(user_id) for user_id in assignees[deliverable.id]],
                reference_ids=deliverable_references[deliverable.id],
                due_date=deliverable.due_date,
                status=deliverable.status,
            )
            for deliverable in deliverables
        ],
        can_edit=shoot.art_director_id == user.id,
    )
