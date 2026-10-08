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

from app.admin.models import ArtDirectorCreator
from app.auth.models import Role, User
from app.core.config import Settings
from app.core.storage import Storage
from app.core.text import escape_like
from app.deliverables.models import Deliverable
from app.files.models import StoredFile
from app.files.service import claim_files
from app.products.models import Product
from app.references.models import Reference, ReferenceFavorite, ReferenceFile, ReferenceType
from app.references.schemas import (
    FilterProduct,
    ReferenceCounts,
    ReferenceCreate,
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


class ReferenceScope(enum.StrEnum):
    """Вкладка пула: все видимые референсы, созданные пользователем или его избранные."""

    ALL = "all"
    MINE = "mine"
    FAVORITES = "favorites"


@dataclass(frozen=True)
class ReferenceQuery:
    search: str = ""
    type: ReferenceType | None = None
    product_id: uuid.UUID | None = None
    author_id: uuid.UUID | None = None
    tag: str | None = None
    sort: ReferenceSort = ReferenceSort.NEWEST
    scope: ReferenceScope = ReferenceScope.ALL


def _assigned(user: User, product_id: Any) -> ColumnElement[bool]:
    """На пользователя назначен deliverable продукта."""
    return exists().where(Deliverable.product_id == product_id, Deliverable.assignee_id == user.id)


def _visible(user: User) -> ColumnElement[bool]:
    """Что из пула видит пользователь.

    Свои референсы, а арт-директор ещё и референсы продуктов, где на него назначен
    deliverable (docs/adr/0004). Креатор видит весь пул своих арт-директоров: их
    референсы и референсы их продуктов (docs/adr/0006). Бренд страницы пула не видит.
    """
    if user.role == Role.ART_DIRECTOR:
        return or_(Reference.owner_id == user.id, _assigned(user, Reference.product_id))
    if user.role == Role.CREATOR:
        art_directors = select(ArtDirectorCreator.art_director_id).where(
            ArtDirectorCreator.creator_id == user.id
        )
        return or_(
            Reference.owner_id == user.id,
            Reference.owner_id.in_(art_directors),
            exists().where(
                Deliverable.product_id == Reference.product_id,
                Deliverable.assignee_id.in_(art_directors),
            ),
        )
    return false()


async def visible_ids(db: AsyncSession, user: User, ids: set[uuid.UUID]) -> set[uuid.UUID]:
    """Те из ids, что пользователь видит в пуле: для чужих фич (съёмки, docs/adr/0007)."""
    if not ids:
        return set()
    return set(await db.scalars(select(Reference.id).where(Reference.id.in_(ids), _visible(user))))


def _favorite(user: User, reference_id: Any) -> ColumnElement[bool]:
    return exists().where(
        ReferenceFavorite.user_id == user.id, ReferenceFavorite.reference_id == reference_id
    )


def _filtered(user: User, params: ReferenceQuery) -> Select[Reference]:
    """Видимые референсы под поиском и фильтрами, без учёта вкладки."""
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
    # Счётчики всех вкладок одним проходом: поиск и фильтры у них общие.
    matched = query.subquery()
    sizes = (
        await db.execute(
            select(
                func.count().label("all"),
                func.count().filter(matched.c.owner_id == user.id).label("mine"),
                func.count().filter(_favorite(user, matched.c.id)).label("favorites"),
            ).select_from(matched)
        )
    ).one()
    counts = ReferenceCounts(all=sizes.all, mine=sizes.mine, favorites=sizes.favorites)
    total = counts.all
    if params.scope == ReferenceScope.MINE:
        query = query.where(Reference.owner_id == user.id)
        total = counts.mine
    elif params.scope == ReferenceScope.FAVORITES:
        query = query.where(_favorite(user, Reference.id))
        total = counts.favorites
    references = list(
        await db.scalars(
            query.order_by(*_ORDER[params.sort]).offset((page - 1) * per_page).limit(per_page)
        )
    )

    return ReferenceList(
        items=await to_responses(db, user, storage, references), total=total, counts=counts
    )


async def to_responses(
    db: AsyncSession, user: User, storage: Storage, references: list[Reference]
) -> list[ReferenceResponse]:
    """Референсы для ответа: файлы по порядку, имя автора и избранное пользователя.

    Три запроса на любое число референсов.
    """
    ids = [reference.id for reference in references]
    if not ids:
        return []
    files: dict[uuid.UUID, list[StoredFile]] = defaultdict(list)
    for row in await db.execute(
        select(ReferenceFile.reference_id, StoredFile)
        .join(StoredFile, StoredFile.id == ReferenceFile.file_id)
        .where(ReferenceFile.reference_id.in_(ids))
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
                ReferenceFavorite.user_id == user.id, ReferenceFavorite.reference_id.in_(ids)
            )
        )
    )
    return [
        ReferenceResponse.of(
            reference,
            authors.get(reference.owner_id),
            files[reference.id],
            storage,
            favorite=reference.id in favorites,
        )
        for reference in references
    ]


async def create_reference(
    db: AsyncSession, user: User, body: ReferenceCreate, storage: Storage
) -> ReferenceResponse:
    """Свой референс в пуле. Коммитит вызывающий.

    Продукт — только из тех, где на автора назначен deliverable; иначе 422,
    как у несуществующего.
    """
    if body.product_id is not None and not await db.scalar(
        select(_assigned(user, body.product_id))
    ):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Product not found")
    files = await claim_files(db, user, body.file_ids)

    reference = Reference(
        owner_id=user.id,
        product_id=body.product_id,
        title=body.title,
        type=body.type,
        link=str(body.link) if body.link else None,
        collection=body.collection,
        notes=body.notes,
        tags=body.tags,
    )
    db.add(reference)
    await db.flush()
    reference_files = [files[file_id] for file_id in body.file_ids]
    db.add_all(
        ReferenceFile(reference_id=reference.id, position=index, file_id=file.id)
        for index, file in enumerate(reference_files)
    )
    if body.favorite:
        db.add(ReferenceFavorite(user_id=user.id, reference_id=reference.id))
    await db.flush()
    return ReferenceResponse.of(
        reference, user.name, reference_files, storage, favorite=body.favorite
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
