from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.admin.models import BrandArtDirector
from app.auth.deps import require_role
from app.auth.models import Role, Status, User
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.team.schemas import TeamMember

router = APIRouter(prefix="/team", tags=["team"])

BrandUser = Annotated[User, Depends(require_role(Role.BRAND))]


@router.get("/art-directors")
async def list_art_directors(
    brand: BrandUser, db: SessionDep, settings: SettingsDep
) -> list[TeamMember]:
    """Арт-директора из связок бренда (docs/adr/0002): из них бренд выбирает исполнителей."""
    users = await db.scalars(
        select(User)
        .join(BrandArtDirector, BrandArtDirector.art_director_id == User.id)
        .where(BrandArtDirector.brand_id == brand.id, User.status == Status.APPROVED)
        .order_by(User.name, User.id)
    )
    return [TeamMember.of(user, settings) for user in users]
