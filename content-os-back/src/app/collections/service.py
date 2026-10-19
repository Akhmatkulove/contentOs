"""Коллекции: кто какие видит и выбор по имени с созданием (docs/adr/0014).

Коммитит вызывающий.
"""

import uuid

from sqlalchemy import ColumnElement, Select, false, func, or_, select
from sqlalchemy.dialects.postgresql import distinct_on, insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, User
from app.collections.models import Collection
from app.collections.schemas import CollectionOption
from app.team import service as team


def _visible(user: User) -> ColumnElement[bool]:
    """Коллекции, которые видит пользователь: свои и тех, с кем он в связке выше.

    Бренд — только свои. Арт-директор — ещё коллекции своих брендов. Креатор —
    ещё коллекции своих арт-директоров и их брендов.
    """
    own = Collection.owner_id == user.id
    if user.role == Role.BRAND:
        return own
    if user.role == Role.ART_DIRECTOR:
        return or_(own, Collection.owner_id.in_(team.brands_of_art_directors([user.id])))
    if user.role == Role.CREATOR:
        art_directors = team.art_directors_of_creator(user.id)
        return or_(
            own,
            Collection.owner_id.in_(art_directors),
            Collection.owner_id.in_(team.brands_of_art_directors(art_directors)),
        )
    return false()


def _by_name(user: User) -> Select[Collection]:
    """Видимые коллекции, по одной на имя без учёта регистра: своя, иначе самая старая.

    Одно имя у разных владельцев (связку завели, когда у обоих уже была такая
    коллекция) показывается и выбирается как одна коллекция.
    """
    key = func.lower(Collection.name)
    return (
        select(Collection)
        .where(_visible(user))
        .ext(distinct_on(key))
        .order_by(
            key, (Collection.owner_id == user.id).desc(), Collection.created_at, Collection.id
        )
    )


async def list_options(db: AsyncSession, user: User) -> list[CollectionOption]:
    """Видимые коллекции по алфавиту без учёта регистра: варианты поля Collection."""
    collections = await db.scalars(_by_name(user))
    return [CollectionOption(id=c.id, name=c.name) for c in collections]


async def resolve(db: AsyncSession, user: User, name: str | None) -> uuid.UUID | None:
    """Коллекция с этим именем из видимых; если такой нет — новая, своя.

    Имя сравнивается без учёта регистра: «summer 26» выберет уже существующую
    «Summer 26», вторая такая же не создаётся.
    """
    if name is None:
        return None
    found = await db.scalar(
        _by_name(user).where(func.lower(Collection.name) == func.lower(name)).limit(1)
    )
    if found is not None:
        return found.id
    # Параллельный запрос мог создать её же: тогда берём ту, что уже есть.
    await db.execute(
        insert(Collection)
        .values(id=uuid.uuid4(), owner_id=user.id, name=name)
        .on_conflict_do_nothing()
    )
    created = await db.execute(
        select(Collection.id).where(
            Collection.owner_id == user.id, func.lower(Collection.name) == func.lower(name)
        )
    )
    return created.scalar_one()
