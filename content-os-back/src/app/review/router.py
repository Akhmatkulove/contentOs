from secrets import compare_digest
from typing import Annotated

from fastapi import APIRouter, Header, HTTPException, status
from sqlalchemy import select

from app.auth.models import Status, User
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.review import service
from app.review.notifier import NotifierDep
from app.review.schemas import DevReviewRequest, TelegramUpdate

router = APIRouter(tags=["review"])


@router.post("/telegram/webhook", status_code=status.HTTP_204_NO_CONTENT)
async def telegram_webhook(
    update: TelegramUpdate,
    db: SessionDep,
    settings: SettingsDep,
    notifier: NotifierDep,
    secret: Annotated[str | None, Header(alias="X-Telegram-Bot-Api-Secret-Token")] = None,
) -> None:
    expected = settings.telegram_webhook_secret
    if expected is None or not compare_digest(
        (secret or "").encode(), expected.get_secret_value().encode()
    ):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Invalid secret")

    query = update.callback_query
    # Остальные обновления (сообщения боту и т. п.) молча принимаем, иначе Telegram их повторит.
    if query is None or query.message is None or query.data is None:
        return
    if (
        query.sender.id != settings.telegram_admin_id
        or query.message.chat.id != settings.telegram_chat_id
    ):
        await notifier.answer_callback(query.id, "Нет доступа")
        return

    answer = await service.decide_from_telegram(db, query.data, query.message.message_id, notifier)
    await notifier.answer_callback(query.id, answer)


# Одобрение без Telegram для локальной разработки и тестов. В production не подключается.
dev_router = APIRouter(prefix="/dev", tags=["dev"])


@dev_router.post("/review", status_code=status.HTTP_204_NO_CONTENT)
async def dev_review(body: DevReviewRequest, db: SessionDep, notifier: NotifierDep) -> None:
    user = await db.scalar(select(User).where(User.email == body.email.lower()))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    if user.status != Status.PENDING_REVIEW:
        raise HTTPException(status.HTTP_409_CONFLICT, "Application is not under review")
    await service.decide(db, user, body.decision, notifier)
