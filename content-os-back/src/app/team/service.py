"""Команда пользователя: кого он может выбрать по связкам из админки (docs/adr/0002).

Один источник для списков в формах (GET /api/team/…) и для проверок при сохранении,
чтобы то, что фронт предлагает, и то, что бэк принимает, не разошлось.
"""

import uuid

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, Status, User
from app.team.models import ArtDirectorCreator, BrandArtDirector


def art_director_ids(brand_id: uuid.UUID) -> Select[uuid.UUID]:
    """Одобренные арт-директора бренда: исполнители deliverables его продуктов."""
    return (
        select(User.id)
        .join(BrandArtDirector, BrandArtDirector.art_director_id == User.id)
        .where(
            BrandArtDirector.brand_id == brand_id,
            User.role == Role.ART_DIRECTOR,
            User.status == Status.APPROVED,
        )
    )


def creator_ids(art_director_id: uuid.UUID) -> Select[uuid.UUID]:
    """Одобренные креаторы арт-директора: из них он собирает съёмку."""
    return (
        select(User.id)
        .join(ArtDirectorCreator, ArtDirectorCreator.creator_id == User.id)
        .where(
            ArtDirectorCreator.art_director_id == art_director_id,
            User.role == Role.CREATOR,
            User.status == Status.APPROVED,
        )
    )


def art_directors_of_creator(creator_id: uuid.UUID) -> Select[uuid.UUID]:
    """Арт-директора, в чьей команде креатор: их пул он видит (docs/adr/0006)."""
    return select(ArtDirectorCreator.art_director_id).where(
        ArtDirectorCreator.creator_id == creator_id
    )


async def all_in(db: AsyncSession, team: Select[uuid.UUID], ids: set[uuid.UUID]) -> bool:
    """Все ли ids из team (art_director_ids, creator_ids)."""
    if not ids:
        return True
    return set(await db.scalars(team.where(User.id.in_(ids)))) == ids
