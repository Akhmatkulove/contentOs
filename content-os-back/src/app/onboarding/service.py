"""Переходы статуса заявки. Коммитит вызывающий."""

from datetime import timedelta

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Status, User
from app.core import rate_limit
from app.onboarding.schemas import OnboardingUpdate
from app.review import service as review
from app.review.notifier import ReviewNotifier, TelegramError


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


# Каждая отправка — сообщение админу. Цикл «отозвать → отправить» не должен заспамить чат.
SUBMITS_PER_USER = 5
SUBMIT_WINDOW = timedelta(hours=1)


async def submit(db: AsyncSession, user: User, notifier: ReviewNotifier) -> None:
    _require_status(user, Status.ONBOARDING)
    if user.role is None or not user.name:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Onboarding is not complete")
    await rate_limit.check(db, f"submit:{user.id}", SUBMITS_PER_USER, SUBMIT_WINDOW)
    # Сначала отправляем: заявка не должна оказаться на проверке, о которой никто не знает.
    try:
        await review.send_for_review(db, user, notifier)
    except TelegramError as exc:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Could not send application, try again"
        ) from exc
    user.status = Status.PENDING_REVIEW


async def reopen(db: AsyncSession, user: User, notifier: ReviewNotifier) -> None:
    """«Edit my details»: заявка отзывается с проверки или после отклонения."""
    _require_status(user, Status.PENDING_REVIEW, Status.REJECTED)
    await review.withdraw(db, user, notifier)
    user.status = Status.ONBOARDING
