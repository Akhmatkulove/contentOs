from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.auth.models import Role

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


class OnboardingUpdate(BaseModel):
    """Ответы шага онбординга. Неуказанные поля не меняются."""

    role: Role | None = None
    name: Name | None = None
