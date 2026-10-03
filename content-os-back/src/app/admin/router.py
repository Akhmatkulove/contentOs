import uuid

from fastapi import APIRouter, status

from app.admin import service
from app.admin.schemas import (
    AdminUsersResponse,
    ArtDirectorCreatorLink,
    BrandArtDirectorLink,
    ManagedUser,
)
from app.admin.service import ART_DIRECTOR_CREATOR, BRAND_ART_DIRECTOR
from app.auth.deps import AdminUser
from app.core.config import SettingsDep
from app.core.db import SessionDep

router = APIRouter(prefix="/admin", tags=["admin"])

BRAND_ART_DIRECTOR_PATH = "/brands/{brand_id}/art-directors/{art_director_id}"
ART_DIRECTOR_CREATOR_PATH = "/art-directors/{art_director_id}/creators/{creator_id}"


@router.get("/users")
async def list_users(_: AdminUser, db: SessionDep, settings: SettingsDep) -> AdminUsersResponse:
    directory = await service.list_users(db)
    return AdminUsersResponse(
        users=[ManagedUser.of(user, settings) for user in directory.users],
        brand_art_directors=[
            BrandArtDirectorLink(
                brand_id=link.brand_id,
                art_director_id=link.art_director_id,
                assigned_at=link.assigned_at,
            )
            for link in directory.brand_art_directors
        ],
        art_director_creators=[
            ArtDirectorCreatorLink(
                art_director_id=link.art_director_id,
                creator_id=link.creator_id,
                assigned_at=link.assigned_at,
            )
            for link in directory.art_director_creators
        ],
    )


@router.put(BRAND_ART_DIRECTOR_PATH, status_code=status.HTTP_204_NO_CONTENT)
async def assign_art_director(
    brand_id: uuid.UUID, art_director_id: uuid.UUID, admin: AdminUser, db: SessionDep
) -> None:
    await service.assign(db, admin, BRAND_ART_DIRECTOR, brand_id, art_director_id)
    await db.commit()


@router.delete(BRAND_ART_DIRECTOR_PATH, status_code=status.HTTP_204_NO_CONTENT)
async def unassign_art_director(
    brand_id: uuid.UUID, art_director_id: uuid.UUID, admin: AdminUser, db: SessionDep
) -> None:
    await service.unassign(db, admin, BRAND_ART_DIRECTOR, brand_id, art_director_id)
    await db.commit()


@router.put(ART_DIRECTOR_CREATOR_PATH, status_code=status.HTTP_204_NO_CONTENT)
async def assign_creator(
    art_director_id: uuid.UUID, creator_id: uuid.UUID, admin: AdminUser, db: SessionDep
) -> None:
    await service.assign(db, admin, ART_DIRECTOR_CREATOR, art_director_id, creator_id)
    await db.commit()


@router.delete(ART_DIRECTOR_CREATOR_PATH, status_code=status.HTTP_204_NO_CONTENT)
async def unassign_creator(
    art_director_id: uuid.UUID, creator_id: uuid.UUID, admin: AdminUser, db: SessionDep
) -> None:
    await service.unassign(db, admin, ART_DIRECTOR_CREATOR, art_director_id, creator_id)
    await db.commit()
