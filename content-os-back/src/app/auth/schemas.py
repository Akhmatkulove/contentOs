import uuid
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, EmailStr, Field, computed_field

from app.auth.models import Role, Status, User
from app.core.config import Settings
from app.core.storage import public_url

Email = Annotated[EmailStr, AfterValidator(str.lower)]


class SignupRequest(BaseModel):
    email: Email
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: Email
    password: str = Field(max_length=128)


OnboardingStep = Literal["role", "profile", "review"]


class MeResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: Role | None
    status: Status
    name: str | None
    photo_url: str | None

    @classmethod
    def of(cls, user: User, settings: Settings) -> "MeResponse":
        return cls(
            id=user.id,
            email=user.email,
            role=user.role,
            status=user.status,
            name=user.name,
            photo_url=public_url(settings, user.photo_key),
        )

    @computed_field  # type: ignore[prop-decorator]
    @property
    def onboarding_step(self) -> OnboardingStep | None:
        """Шаг, с которого продолжить онбординг: первый незаполненный, иначе проверка."""
        if self.status != Status.ONBOARDING:
            return None
        if self.role is None:
            return "role"
        if not self.name:
            return "profile"
        return "review"
