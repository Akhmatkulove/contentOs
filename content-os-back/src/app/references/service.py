"""Пул референсов: что видит пользователь и чем его фильтровать."""

import enum
import uuid
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import (
    ColumnElement,
    Select,
    UnaryExpression,
    delete,
    exists,
    false,
    func,
    literal,
    or_,
    select,
)
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, User
from app.core.config import Settings
from app.core.storage import Storage
from app.core.text import escape_like
from app.deliverables.models import Deliverable
from app.files.models import StoredFile
from app.products.models import Product
from app.references.models import Reference, ReferenceFavorite, ReferenceFile, ReferenceType
from app.references.schemas import (
    FilterProduct,
    ReferenceFilters,
    ReferenceList,
    ReferenceResponse,
)
from app.team.schemas import TeamMember


class ReferenceSort(enum.StrEnum):
    NEWEST = "newest"
    OLDEST = "oldest"
    TITLE_ASC = "title_asc"
    TITLE_DESC = "title_desc"


@dataclass(frozen=True)
class ReferenceQuery:
    search: str = ""
    type: ReferenceType | None = None
    product_id: uuid.UUID | None = None
    author_id: uuid.UUID | None = None
    tag: str | None = None
    sort: ReferenceSort = ReferenceSort.NEWEST


def _visible(user: User) -> ColumnElement[bool]:
    """Что из пула видит пользователь.

    Арт-директор — референсы продуктов, где на него назначен deliverable
    (docs/adr/0004). Креатор получит их через съёмки, бренд страницы пула не видит.
    """
    if user.role != Role.ART_DIRECTOR:
        return false()
    return exists().where(
        Deliverable.product_id == Reference.product_id, Deliverable.assignee_id == user.id
    )


def _filtered(user: User, params: ReferenceQuery) -> Select[Reference]:
    query = select(Reference).where(_visible(user))
    if params.search:
        pattern = f"%{escape_like(params.search)}%"
        query = query.where(
            or_(
                *(
                    column.ilike(pattern, escape="\\")
                    for column in (
                        Reference.title,
                        Reference.notes,
                        Reference.collection,
                        func.array_to_string(Reference.tags, " "),
                    )
                )
            )
        )
    if params.type is not None:
        query = query.where(Reference.type == params.type)
    if params.product_id is not None:
        query = query.where(Reference.product_id == params.product_id)
    if params.author_id is not None:
        query = query.where(Reference.owner_id == params.author_id)
    if params.tag:
        query = query.where(literal(params.tag) == func.any(Reference.tags))
    return query


_ORDER: dict[ReferenceSort, tuple[UnaryExpression[Any], ...]] = {
    ReferenceSort.NEWEST: (Reference.created_at.desc(), Reference.id.desc()),
    ReferenceSort.OLDEST: (Reference.created_at.asc(), Reference.id.asc()),
    # Без названия — в конце в обе стороны.
    ReferenceSort.TITLE_ASC: (Reference.title.asc().nulls_last(), Reference.id.asc()),
    ReferenceSort.TITLE_DESC: (Reference.title.desc().nulls_last(), Reference.id.desc()),
}


async def list_references(
    db: AsyncSession,
    user: User,
    storage: Storage,
    params: ReferenceQuery,
    page: int,
    per_page: int,
) -> ReferenceList:
    query = _filtered(user, params)
    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    references = list(
        await db.scalars(
            query.order_by(*_ORDER[params.sort]).offset((page - 1) * per_page).limit(per_page)
        )
    )

    files: dict[uuid.UUID, list[StoredFile]] = defaultdict(list)
    for row in await db.execute(
        select(ReferenceFile.reference_id, StoredFile)
        .join(StoredFile, StoredFile.id == ReferenceFile.file_id)
        .where(ReferenceFile.reference_id.in_([reference.id for reference in references]))
        .order_by(ReferenceFile.reference_id, ReferenceFile.position)
    ):
        files[row.reference_id].append(row.StoredFile)
    authors: dict[uuid.UUID, str | None] = {
        row.id: row.name
        for row in await db.execute(
            select(User.id, User.name).where(
                User.id.in_({reference.owner_id for reference in references})
            )
        )
    }

    favorites = set(
        await db.scalars(
            select(ReferenceFavorite.reference_id).where(
                ReferenceFavorite.user_id == user.id,
                ReferenceFavorite.reference_id.in_([reference.id for reference in references]),
            )
        )
    )

    return ReferenceList(
        items=[
            ReferenceResponse.of(
                reference,
                authors.get(reference.owner_id),
                files[reference.id],
                storage,
                favorite=reference.id in favorites,
            )
            for reference in references
        ],
        total=total,
    )


async def list_filters(db: AsyncSession, user: User, settings: Settings) -> ReferenceFilters:
    """Продукты, авторы и теги видимых референсов: варианты для фильтров пула."""
    pool = select(Reference).where(_visible(user)).subquery()
    products = await db.execute(
        select(Product.id, Product.name)
        .where(Product.id.in_(select(pool.c.product_id)))
        .order_by(Product.name, Product.id)
    )
    authors = await db.scalars(
        select(User).where(User.id.in_(select(pool.c.owner_id))).order_by(User.name, User.id)
    )
    tag = func.unnest(pool.c.tags).label("tag")
    tags: list[str] = list(await db.scalars(select(tag).distinct().order_by(tag)))
    return ReferenceFilters(
        products=[FilterProduct(id=row.id, name=row.name) for row in products],
        authors=[TeamMember.of(author, settings) for author in authors],
        tags=tags,
    )


async def set_favorite(
    db: AsyncSession, user: User, reference_id: uuid.UUID, favorite: bool
) -> None:
    """Добавляет в избранное или убирает; повторный вызов ничего не меняет. Коммитит вызывающий.

    В избранное можно добавить только видимый референс; невидимый отвечает 404,
    как несуществующий.
    """
    visible = await db.scalar(
        select(Reference.id).where(Reference.id == reference_id, _visible(user))
    )
    if visible is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reference not found")
    if favorite:
        await db.execute(
            insert(ReferenceFavorite)
            .values(user_id=user.id, reference_id=reference_id)
            .on_conflict_do_nothing()
        )
    else:
        await db.execute(
            delete(ReferenceFavorite).where(
                ReferenceFavorite.user_id == user.id,
                ReferenceFavorite.reference_id == reference_id,
            )
        )
