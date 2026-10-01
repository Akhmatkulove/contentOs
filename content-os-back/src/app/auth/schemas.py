import uuid
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, computed_field

from app.auth.models import Role, Status

Email = Annotated[EmailStr, AfterValidator(str.lower)]


class SignupRequest(BaseModel):
    email: Email
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: Email
    password: str = Field(max_length=128)


OnboardingStep = Literal["role", "profile", "review"]


class MeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    role: Role | None
    status: Status
    name: str | None

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
