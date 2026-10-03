import uuid
from datetime import datetime

from pydantic import BaseModel

from app.auth.models import Role, Status, User
from app.core.config import Settings
from app.core.storage import public_url


class ManagedUser(BaseModel):
    id: uuid.UUID
    email: str
    name: str | None
    role: Role | None
    status: Status
    photo_url: str | None
    created_at: datetime

    @classmethod
    def of(cls, user: User, settings: Settings) -> "ManagedUser":
        return cls(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            status=user.status,
            photo_url=public_url(settings, user.photo_key),
            created_at=user.created_at,
        )


class BrandArtDirectorLink(BaseModel):
    brand_id: uuid.UUID
    art_director_id: uuid.UUID
    assigned_at: datetime


class ArtDirectorCreatorLink(BaseModel):
    art_director_id: uuid.UUID
    creator_id: uuid.UUID
    assigned_at: datetime


class AdminUsersResponse(BaseModel):
    """Все пользователи, кроме админов, новые первыми, и все связки между ними."""

    users: list[ManagedUser]
    brand_art_directors: list[BrandArtDirectorLink]
    art_director_creators: list[ArtDirectorCreatorLink]
