from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.auth.deps import require_role
from app.auth.models import Role, User
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.team import service
from app.team.schemas import TeamMember

router = APIRouter(prefix="/team", tags=["team"])

BrandUser = Annotated[User, Depends(require_role(Role.BRAND))]
ArtDirectorUser = Annotated[User, Depends(require_role(Role.ART_DIRECTOR))]


@router.get("/art-directors")
async def list_art_directors(
    brand: BrandUser, db: SessionDep, settings: SettingsDep
) -> list[TeamMember]:
    """Арт-директора из связок бренда (docs/adr/0002): из них бренд выбирает исполнителей."""
    users = await db.scalars(
        select(User)
        .where(User.id.in_(service.art_director_ids(brand.id)))
        .order_by(User.name, User.id)
    )
    return [TeamMember.of(user, settings) for user in users]


@router.get("/creators")
async def list_creators(
    art_director: ArtDirectorUser, db: SessionDep, settings: SettingsDep
) -> list[TeamMember]:
    """Креаторы из команды арт-директора (docs/adr/0002): из них он собирает съёмку —
    креаторов и мобилографа (роль одна, «Creator / Mobilograph»)."""
    users = await db.scalars(
        select(User)
        .where(User.id.in_(service.creator_ids(art_director.id)))
        .order_by(User.name, User.id)
    )
    return [TeamMember.of(user, settings) for user in users]
