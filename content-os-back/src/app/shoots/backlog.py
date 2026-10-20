"""Бэклог арт-директора: заказы брендов, назначенные на него (docs/adr/0019).

Заказ — deliverable продукта (docs/adr/0004). Статус выводится из deliverables
съёмок, которые его закрывают (docs/adr/0018); to_shoot без съёмок — Not scheduled.
"""

import enum
import uuid
from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from sqlalchemy import ColumnElement, Row, Select, case, func, nulls_last, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.auth.models import User
from app.core.config import Settings
from app.core.storage import Storage
from app.core.text import escape_like
from app.deliverables.models import Deliverable, DeliverableStatus
from app.files.models import StoredFile
from app.files.schemas import FileResponse
from app.products.models import Product, ProductPhoto, ProductStatus
from app.shoots.models import Shoot, ShootDeliverable
from app.shoots.product_deliverables import derived
from app.shoots.schemas import (
    BrandDeliverableCounts,
    BrandDeliverableFilters,
    BrandDeliverableItem,
    BrandDeliverableList,
    BrandDeliverableStatus,
    PlannedShoot,
    TaskFilterOption,
    TaskProduct,
)
from app.team.schemas import TeamMember


class BrandDeliverableSort(enum.StrEnum):
    # Сначала то, что ещё не запланировано и не снято, затем по сроку.
    PRIORITY = "priority"
    # Ближайший срок первым, без срока — в конце.
    DUE_DATE = "due_date"
    NAME_ASC = "name_asc"


# Порядок вкладок для Priority: арт-директору сначала планировать, затем снимать.
_PRIORITY = [
    BrandDeliverableStatus.NOT_SCHEDULED,
    BrandDeliverableStatus.TO_SHOOT,
    BrandDeliverableStatus.IN_PROGRESS,
    BrandDeliverableStatus.NEEDS_CHANGES,
    BrandDeliverableStatus.NEEDS_REVIEW,
    BrandDeliverableStatus.APPROVED,
]


@dataclass(frozen=True)
class BrandDeliverableQuery:
    search: str = ""
    status: BrandDeliverableStatus | None = None
    product_id: uuid.UUID | None = None
    brand_id: uuid.UUID | None = None
    sort: BrandDeliverableSort = BrandDeliverableSort.PRIORITY


_brand = aliased(User, name="brand")


def _visible(art_director: User) -> Select[Any]:
    """Заказы арт-директора в действующих продуктах: архивный в съёмку не взять
    (docs/adr/0005). Колонки `status`, `shoots` и `state` — вывод из съёмок и вкладка.
    """
    table = derived(
        select(Deliverable.id).where(Deliverable.assignee_id == art_director.id).correlate(None)
    )
    shoots = func.coalesce(table.c.shoots, 0)
    order_status = func.coalesce(table.c.status, DeliverableStatus.TO_SHOOT.value)
    state = case(
        (shoots == 0, BrandDeliverableStatus.NOT_SCHEDULED.value),
        else_=order_status,
    )
    return (
        select(
            Deliverable,
            Product,
            _brand,
            order_status.label("status"),
            shoots.label("shoots"),
            state.label("state"),
        )
        .join(Product, Product.id == Deliverable.product_id)
        .join(_brand, _brand.id == Product.brand_id)
        .outerjoin(table, table.c.id == Deliverable.id)
        .where(
            Deliverable.assignee_id == art_director.id,
            Product.status != ProductStatus.ARCHIVED,
        )
    )


def _filtered(art_director: User, params: BrandDeliverableQuery) -> Select[Any]:
    """Под поиском и фильтрами, без вкладки: по ним считаются вкладки."""
    query = _visible(art_director)
    if params.search:
        pattern = f"%{escape_like(params.search)}%"
        query = query.where(
            or_(
                Deliverable.name.ilike(pattern, escape="\\"),
                Product.name.ilike(pattern, escape="\\"),
                _brand.name.ilike(pattern, escape="\\"),
            )
        )
    if params.product_id is not None:
        query = query.where(Deliverable.product_id == params.product_id)
    if params.brand_id is not None:
        query = query.where(Product.brand_id == params.brand_id)
    return query


def _order(state: ColumnElement[Any], sort: BrandDeliverableSort) -> tuple[Any, ...]:
    tail = (func.lower(Product.name).asc(), Deliverable.position.asc(), Deliverable.id.asc())
    if sort == BrandDeliverableSort.NAME_ASC:
        return (func.lower(Deliverable.name).asc(), Deliverable.id.asc())
    due = nulls_last(Deliverable.due_date.asc())
    if sort == BrandDeliverableSort.DUE_DATE:
        return (due, *tail)
    rank = case(
        *((state == value.value, index) for index, value in enumerate(_PRIORITY)),
        else_=len(_PRIORITY),
    )
    return (rank, due, *tail)


async def list_brand_deliverables(
    db: AsyncSession,
    art_director: User,
    storage: Storage,
    settings: Settings,
    params: BrandDeliverableQuery,
    page: int,
    per_page: int,
) -> BrandDeliverableList:
    query = _filtered(art_director, params)
    state = query.selected_columns.state
    matched = query.with_only_columns(state).subquery()
    sizes = (
        await db.execute(
            select(
                func.count().label("all"),
                *(
                    func.count().filter(matched.c.state == value.value).label(value.value)
                    for value in BrandDeliverableStatus
                ),
            ).select_from(matched)
        )
    ).one()
    counts = BrandDeliverableCounts.model_validate(sizes._asdict())

    total = counts.all
    if params.status is not None:
        query = query.where(state == params.status.value)
        total = getattr(counts, params.status.value)
    rows = (
        await db.execute(
            query.order_by(*_order(state, params.sort))
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).all()
    return BrandDeliverableList(
        items=await _to_items(db, art_director, storage, settings, rows),
        total=total,
        counts=counts,
    )


async def _to_items(
    db: AsyncSession,
    art_director: User,
    storage: Storage,
    settings: Settings,
    rows: Sequence[Row[Any]],
) -> list[BrandDeliverableItem]:
    """Фото продуктов и съёмки арт-директора: два запроса на любую страницу."""
    if not rows:
        return []
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
    shoots: dict[uuid.UUID, list[PlannedShoot]] = defaultdict(list)
    for row in await db.execute(
        select(ShootDeliverable.product_deliverable_id, Shoot.id, Shoot.name, Shoot.date)
        .distinct()
        .join(Shoot, Shoot.id == ShootDeliverable.shoot_id)
        .where(
            ShootDeliverable.product_deliverable_id.in_([row.Deliverable.id for row in rows]),
            Shoot.art_director_id == art_director.id,
        )
        .order_by(ShootDeliverable.product_deliverable_id, Shoot.date, Shoot.id)
    ):
        shoots[row.product_deliverable_id].append(
            PlannedShoot(id=row.id, name=row.name, date=row.date)
        )

    def product(item: Product) -> TaskProduct:
        photo = photos.get(item.id)
        return TaskProduct(
            id=item.id,
            name=item.name,
            sku=item.sku,
            photo=FileResponse.of(photo, storage) if photo is not None else None,
        )

    return [
        BrandDeliverableItem(
            id=row.Deliverable.id,
            name=row.Deliverable.name,
            type=row.Deliverable.type,
            brief=row.Deliverable.brief,
            due_date=row.Deliverable.due_date,
            status=DeliverableStatus(row.status),
            shoots_total=row.shoots,
            shoots=shoots[row.Deliverable.id],
            product=product(row.Product),
            brand=TeamMember.of(row.brand, settings),
        )
        for row in rows
    ]


async def list_filters(
    db: AsyncSession, art_director: User, settings: Settings
) -> BrandDeliverableFilters:
    """Продукты и бренды, которые встречаются в бэклоге арт-директора."""
    visible = _visible(art_director).with_only_columns(Deliverable.product_id).subquery()
    products = await db.execute(
        select(Product.id, Product.name)
        .where(Product.id.in_(select(visible.c.product_id)))
        .order_by(Product.name, Product.id)
    )
    brands = await db.scalars(
        select(User)
        .where(
            User.id.in_(
                select(Product.brand_id).where(Product.id.in_(select(visible.c.product_id)))
            )
        )
        .order_by(User.name, User.id)
    )
    return BrandDeliverableFilters(
        products=[TaskFilterOption(id=row.id, name=row.name) for row in products],
        brands=[TeamMember.of(brand, settings) for brand in brands],
    )
