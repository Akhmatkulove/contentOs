"""Страница Content: одобренные файлы, отправленные бренду (docs/adr/0025).

Бренд видит контент своих продуктов, арт-директор — своих съёмок и продуктов,
где на него назначен deliverable, креатор — съёмок своих арт-директоров и снятое
им самим. Съёмку видят только её арт-директор и креаторы его команды.
"""

import enum
import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy import (
    ColumnElement,
    Select,
    UnaryExpression,
    exists,
    false,
    func,
    or_,
    select,
    true,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, User
from app.content.models import ContentFavorite, ContentItem, ContentStatus
from app.content.schemas import (
    ContentCounts,
    ContentFilters,
    ContentItemResponse,
    ContentList,
    ContentOption,
)
from app.core.config import Settings
from app.core.storage import Storage
from app.core.text import escape_like
from app.deliverables.models import Deliverable
from app.files.models import StoredFile
from app.files.schemas import FileResponse
from app.products.models import Product
from app.shoots.models import (
    Shoot,
    ShootDeliverable,
    ShootDeliverableAssignee,
    TaskVersion,
    TaskVersionFile,
    VersionReview,
)
from app.team import service as team
from app.team.schemas import TeamMember


class ContentSort(enum.StrEnum):
    NEWEST = "newest"
    OLDEST = "oldest"
    # По названию deliverable.
    NAME_ASC = "name_asc"
    NAME_DESC = "name_desc"


class ContentScope(enum.StrEnum):
    ALL = "all"
    MINE = "mine"
    # Избранное бренда (docs/adr/0026); у остальных пусто.
    FAVORITES = "favorites"


@dataclass(frozen=True)
class ContentQuery:
    search: str = ""
    product_id: uuid.UUID | None = None
    shoot_id: uuid.UUID | None = None
    author_id: uuid.UUID | None = None
    status: ContentStatus | None = None
    sort: ContentSort = ContentSort.NEWEST
    scope: ContentScope = ContentScope.ALL


async def add_sent(db: AsyncSession, deliverable_id: uuid.UUID) -> int:
    """Send to brand: файлы одобренной версии каждого исполнителя — на страницу Content.

    Исполнителей, которых сняли с deliverable, отправка не касается. Возвращает,
    сколько файлов отправлено. Коммитит вызывающий.
    """
    deliverable = await db.get_one(ShootDeliverable, deliverable_id)
    rows = await db.execute(
        select(TaskVersionFile.file_id, TaskVersion.author_id)
        .join(TaskVersion, TaskVersion.id == TaskVersionFile.version_id)
        .join(
            ShootDeliverableAssignee,
            (ShootDeliverableAssignee.deliverable_id == TaskVersion.deliverable_id)
            & (ShootDeliverableAssignee.user_id == TaskVersion.author_id),
        )
        .where(
            TaskVersion.deliverable_id == deliverable_id,
            TaskVersion.review == VersionReview.APPROVED,
        )
        .order_by(ShootDeliverableAssignee.position, TaskVersionFile.position)
    )
    items = [
        ContentItem(
            file_id=row.file_id,
            deliverable_id=deliverable_id,
            name=deliverable.name,
            author_id=row.author_id,
            position=position,
        )
        for position, row in enumerate(rows)
    ]
    db.add_all(items)
    await db.flush()
    return len(items)


def joined(*columns: Any) -> Select[Any]:
    """Контент с deliverable, съёмкой, продуктом, файлом и автором: всё, что ищется."""
    return (
        select(*columns)
        .select_from(ContentItem)
        .join(ShootDeliverable, ShootDeliverable.id == ContentItem.deliverable_id)
        .join(Shoot, Shoot.id == ShootDeliverable.shoot_id)
        .join(Product, Product.id == ShootDeliverable.product_id)
        .join(StoredFile, StoredFile.id == ContentItem.file_id)
        .join(User, User.id == ContentItem.author_id)
    )


def shoot_visible(user: User) -> ColumnElement[bool]:
    """Съёмку видят её арт-директор и креаторы его команды (и автор файла); бренд — нет."""
    if user.role == Role.ART_DIRECTOR:
        return Shoot.art_director_id == user.id
    if user.role == Role.CREATOR:
        return or_(
            Shoot.art_director_id.in_(team.art_directors_of_creator(user.id)),
            ContentItem.author_id == user.id,
        )
    return false()


def visible(user: User) -> ColumnElement[bool]:
    if user.role == Role.BRAND:
        return Product.brand_id == user.id
    if user.role == Role.ART_DIRECTOR:
        return or_(
            Shoot.art_director_id == user.id,
            exists().where(
                Deliverable.product_id == ShootDeliverable.product_id,
                Deliverable.assignee_id == user.id,
            ),
        )
    if user.role == Role.CREATOR:
        return shoot_visible(user)
    return false()


def _mine(user: User) -> ColumnElement[bool]:
    """Вкладка My content: у бренда весь его контент и так свой."""
    if user.role == Role.ART_DIRECTOR:
        return Shoot.art_director_id == user.id
    if user.role == Role.CREATOR:
        return ContentItem.author_id == user.id
    return true()


def _favorite(user: User) -> ColumnElement[bool]:
    """Вкладка Favorites: deliverables в избранном бренда."""
    if user.role != Role.BRAND:
        return false()
    return exists().where(
        ContentFavorite.user_id == user.id,
        ContentFavorite.deliverable_id == ContentItem.deliverable_id,
    )


def _conditions(user: User, params: ContentQuery) -> list[ColumnElement[bool]]:
    """Видимый контент под поиском и фильтрами, без учёта вкладки."""
    conditions = [visible(user)]
    if params.search:
        pattern = f"%{escape_like(params.search)}%"
        conditions.append(
            or_(
                ContentItem.name.ilike(pattern, escape="\\"),
                Product.name.ilike(pattern, escape="\\"),
                User.name.ilike(pattern, escape="\\"),
                shoot_visible(user) & Shoot.name.ilike(pattern, escape="\\"),
            )
        )
    if params.product_id is not None:
        conditions.append(Product.id == params.product_id)
    if params.shoot_id is not None:
        conditions.append(shoot_visible(user) & (Shoot.id == params.shoot_id))
    if params.author_id is not None:
        conditions.append(ContentItem.author_id == params.author_id)
    if params.status is not None:
        conditions.append(ContentItem.status == params.status)
    return conditions


_ORDER: dict[ContentSort, tuple[UnaryExpression[Any], ...]] = {
    # Файлы одной отправки — в порядке исполнителей и версий.
    ContentSort.NEWEST: (
        ContentItem.created_at.desc(),
        ContentItem.position.asc(),
        ContentItem.id.asc(),
    ),
    ContentSort.OLDEST: (
        ContentItem.created_at.asc(),
        ContentItem.position.asc(),
        ContentItem.id.asc(),
    ),
    ContentSort.NAME_ASC: (
        ContentItem.name.asc(),
        ContentItem.created_at.desc(),
        ContentItem.position.asc(),
        ContentItem.id.asc(),
    ),
    ContentSort.NAME_DESC: (
        ContentItem.name.desc(),
        ContentItem.created_at.desc(),
        ContentItem.position.asc(),
        ContentItem.id.asc(),
    ),
}


async def list_content(
    db: AsyncSession,
    user: User,
    storage: Storage,
    settings: Settings,
    params: ContentQuery,
    page: int,
    per_page: int,
) -> ContentList:
    """Страница вкладки и размеры всех вкладок. Три запроса на страницу."""
    conditions = _conditions(user, params)
    scopes = {ContentScope.MINE: _mine(user), ContentScope.FAVORITES: _favorite(user)}
    sizes = (
        await db.execute(
            joined(
                func.count().label("all"),
                func.count().filter(scopes[ContentScope.MINE]).label("mine"),
                func.count().filter(scopes[ContentScope.FAVORITES]).label("favorites"),
            ).where(*conditions)
        )
    ).one()
    counts = ContentCounts(all=sizes.all, mine=sizes.mine, favorites=sizes.favorites)
    if params.scope in scopes:
        conditions.append(scopes[params.scope])

    shoot_shown = shoot_visible(user).label("shoot_visible")
    rows = (
        await db.execute(
            joined(
                ContentItem,
                Product.id.label("product_id"),
                Product.name.label("product_name"),
                Shoot.id.label("shoot_id"),
                Shoot.name.label("shoot_name"),
                shoot_shown,
                StoredFile,
                User,
            )
            .where(*conditions)
            .order_by(*_ORDER[params.sort])
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    ).all()
    return ContentList(
        items=[
            ContentItemResponse(
                id=row.ContentItem.id,
                deliverable_id=row.ContentItem.deliverable_id,
                file=FileResponse.of(row.StoredFile, storage),
                name=row.ContentItem.name,
                product=ContentOption(id=row.product_id, name=row.product_name),
                shoot=(
                    ContentOption(id=row.shoot_id, name=row.shoot_name)
                    if row.shoot_visible
                    else None
                ),
                author=TeamMember.of(row.User, settings),
                status=row.ContentItem.status,
                created_at=row.ContentItem.created_at,
            )
            for row in rows
        ],
        total={
            ContentScope.ALL: counts.all,
            ContentScope.MINE: counts.mine,
            ContentScope.FAVORITES: counts.favorites,
        }[params.scope],
        counts=counts,
    )


async def list_filters(db: AsyncSession, user: User, settings: Settings) -> ContentFilters:
    """Продукты, съёмки и авторы видимого контента: варианты для фильтров."""
    seen = visible(user)
    products = await db.execute(
        joined(Product.id, Product.name).where(seen).distinct().order_by(Product.name, Product.id)
    )
    shoots = await db.execute(
        joined(Shoot.id, Shoot.name)
        .where(seen, shoot_visible(user))
        .distinct()
        .order_by(Shoot.name, Shoot.id)
    )
    authors = await db.scalars(
        select(User)
        .where(User.id.in_(joined(ContentItem.author_id).where(seen).correlate(None)))
        .order_by(User.name, User.id)
    )
    return ContentFilters(
        products=[ContentOption(id=row.id, name=row.name) for row in products],
        shoots=[ContentOption(id=row.id, name=row.name) for row in shoots],
        creators=[TeamMember.of(author, settings) for author in authors],
    )
