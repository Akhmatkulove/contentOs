import uuid
from typing import Annotated

from pydantic import AfterValidator, BaseModel, EmailStr, Field

from app.auth.models import Role, Status

Email = Annotated[EmailStr, AfterValidator(str.lower)]


class SignupRequest(BaseModel):
    email: Email
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: Email
    password: str = Field(max_length=128)


class MeResponse(BaseModel):
    id: uuid.UUID
    email: str
    role: Role | None
    status: Status
    name: str | None
