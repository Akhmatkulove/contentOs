import uuid

from pydantic import BaseModel

from app.auth.models import User
from app.core.config import Settings
from app.core.storage import public_url


class TeamMember(BaseModel):
    id: uuid.UUID
    name: str | None
    photo_url: str | None

    @classmethod
    def of(cls, user: User, settings: Settings) -> "TeamMember":
        return cls(id=user.id, name=user.name, photo_url=public_url(settings, user.photo_key))
