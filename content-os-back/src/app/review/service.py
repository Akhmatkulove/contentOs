"""Проверка заявок: отправка в Telegram, отзыв, решение. Коммитит вызывающий,
кроме decide(): решение должно попасть в БД до правки сообщения."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Status, User
from app.review.models import ReviewMessage
from app.review.notifier import Decision, ReviewNotifier

DECISION_STATUS: dict[Decision, Status] = {
    "approve": Status.APPROVED,
    "reject": Status.REJECTED,
}
DECISION_NOTE: dict[Decision, str] = {"approve": "✅ Одобрено", "reject": "❌ Отклонено"}
STALE_NOTE = "⚪️ Заявка неактуальна"


async def send_for_review(db: AsyncSession, user: User, notifier: ReviewNotifier) -> None:
    """Отправляет заявку. Бросает TelegramError, если отправить не удалось."""
    message_id = await notifier.send_application(user)
    if message_id is not None:
        await db.merge(ReviewMessage(user_id=user.id, message_id=message_id))


async def withdraw(db: AsyncSession, user: User, notifier: ReviewNotifier) -> None:
    message = await db.get(ReviewMessage, user.id)
    if message is None:
        return
    await db.delete(message)
    await notifier.close_application(message.message_id, user, "↩️ Заявка отозвана")


async def decide(
    db: AsyncSession, user: User, decision: Decision, notifier: ReviewNotifier
) -> None:
    user.status = DECISION_STATUS[decision]
    message = await db.get(ReviewMessage, user.id)
    if message is not None:
        await db.delete(message)
    await db.commit()
    if message is not None:
        await notifier.close_application(message.message_id, user, DECISION_NOTE[decision])


def parse_callback(data: str) -> tuple[Decision, uuid.UUID] | None:
    decision, _, user_id = data.partition(":")
    if decision not in DECISION_STATUS:
        return None
    try:
        return decision, uuid.UUID(user_id)
    except ValueError:
        return None


async def decide_from_telegram(
    db: AsyncSession, data: str, message_id: int, notifier: ReviewNotifier
) -> str:
    """Обрабатывает нажатие кнопки и возвращает текст всплывающего ответа."""
    parsed = parse_callback(data)
    if parsed is None:
        return "Неизвестная команда"
    decision, user_id = parsed

    user = await db.get(User, user_id)
    if user is None:
        return "Пользователь не найден"

    current = await db.get(ReviewMessage, user_id)
    if current is None or current.message_id != message_id or user.status != Status.PENDING_REVIEW:
        await notifier.close_application(message_id, user, STALE_NOTE)
        return "Заявка неактуальна"

    await decide(db, user, decision, notifier)
    return DECISION_NOTE[decision]
