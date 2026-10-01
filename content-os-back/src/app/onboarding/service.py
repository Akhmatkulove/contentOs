"""Переходы статуса заявки. Коммитит вызывающий."""

from fastapi import HTTPException, status

from app.auth.models import Status, User
from app.onboarding.schemas import OnboardingUpdate


def _require_status(user: User, *allowed: Status) -> None:
    if user.status not in allowed:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Not allowed while application is {user.status}"
        )


def update_answers(user: User, answers: OnboardingUpdate) -> None:
    _require_status(user, Status.ONBOARDING)
    if answers.role is not None:
        user.role = answers.role
    if answers.name is not None:
        user.name = answers.name


def submit(user: User) -> None:
    _require_status(user, Status.ONBOARDING)
    if user.role is None or not user.name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Onboarding is not complete")
    user.status = Status.PENDING_REVIEW


def reopen(user: User) -> None:
    """«Edit my details»: заявка отзывается с проверки или после отклонения."""
    _require_status(user, Status.PENDING_REVIEW, Status.REJECTED)
    user.status = Status.ONBOARDING
