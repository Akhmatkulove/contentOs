"""Сообщения о заявках в админский чат Telegram."""

import logging
from datetime import UTC, datetime
from html import escape
from typing import Annotated, Any, Literal, Protocol

import httpx
from fastapi import Depends

from app.auth.models import User
from app.core.config import Settings, SettingsDep

logger = logging.getLogger(__name__)
# httpx на уровне INFO пишет URL каждого запроса, а в URL Bot API лежит токен бота.
# Фиксируем уровень, чтобы общий INFO-логгинг не вывел токен в логи.
logging.getLogger("httpx").setLevel(logging.WARNING)

Decision = Literal["approve", "reject"]

ROLE_TITLES = {"brand": "Бренд", "art_director": "Арт-директор", "creator": "Креатор"}


class TelegramError(Exception):
    pass


class ReviewNotifier(Protocol):
    async def send_application(self, user: User) -> int | None:
        """Отправляет заявку с кнопками, возвращает id сообщения (None, если некуда)."""
        ...

    async def close_application(self, message_id: int, user: User, note: str) -> None:
        """Дописывает к сообщению итог и убирает кнопки."""
        ...

    async def answer_callback(self, callback_id: str, text: str) -> None: ...


def application_text(user: User) -> str:
    role = ROLE_TITLES.get(user.role or "", "—")
    return (
        "<b>Новая заявка</b>\n"
        f"Имя: {escape(user.name or '—')}\n"
        f"Email: {escape(user.email)}\n"
        f"Роль: {role}"
    )


def callback_data(decision: Decision, user: User) -> str:
    return f"{decision}:{user.id}"


def note_with_time(note: str) -> str:
    return f"{note} · {datetime.now(UTC):%d.%m %H:%M} UTC"


class TelegramNotifier:
    def __init__(
        self, token: str, chat_id: int, transport: httpx.AsyncBaseTransport | None = None
    ) -> None:
        self._url = f"https://api.telegram.org/bot{token}"
        self._chat_id = chat_id
        self._transport = transport  # тесты подставляют httpx.MockTransport

    async def _call(self, method: str, **params: Any) -> Any:
        try:
            async with httpx.AsyncClient(timeout=10, transport=self._transport) as client:
                response = await client.post(f"{self._url}/{method}", json=params)
            body = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise TelegramError(f"{method} failed") from exc
        if not body.get("ok"):
            raise TelegramError(f"{method} failed: {body.get('description')}")
        return body["result"]

    async def send_application(self, user: User) -> int:
        message = await self._call(
            "sendMessage",
            chat_id=self._chat_id,
            text=application_text(user),
            parse_mode="HTML",
            reply_markup={
                "inline_keyboard": [
                    [
                        {"text": "✅ Approve", "callback_data": callback_data("approve", user)},
                        {"text": "❌ Reject", "callback_data": callback_data("reject", user)},
                    ]
                ]
            },
        )
        message_id: int = message["message_id"]
        return message_id

    async def close_application(self, message_id: int, user: User, note: str) -> None:
        # Решение уже сохранено в БД, неудачная правка сообщения его не отменяет.
        try:
            await self._call(
                "editMessageText",
                chat_id=self._chat_id,
                message_id=message_id,
                text=f"{application_text(user)}\n\n{escape(note_with_time(note))}",
                parse_mode="HTML",
            )
        except TelegramError:
            logger.exception("Could not close application message %s", message_id)

    async def answer_callback(self, callback_id: str, text: str) -> None:
        try:
            await self._call("answerCallbackQuery", callback_query_id=callback_id, text=text)
        except TelegramError:
            logger.exception("Could not answer callback %s", callback_id)


class DisabledNotifier:
    """Telegram не настроен: заявки не отправляются, решения принимаются dev-эндпоинтом."""

    async def send_application(self, user: User) -> None:
        logger.info("Telegram is not configured, application of %s is not sent", user.email)

    async def close_application(self, message_id: int, user: User, note: str) -> None:
        pass

    async def answer_callback(self, callback_id: str, text: str) -> None:
        pass


def build_notifier(settings: Settings) -> ReviewNotifier:
    if settings.telegram_bot_token and settings.telegram_chat_id is not None:
        return TelegramNotifier(
            settings.telegram_bot_token.get_secret_value(), settings.telegram_chat_id
        )
    return DisabledNotifier()


def get_notifier(settings: SettingsDep) -> ReviewNotifier:
    return build_notifier(settings)


NotifierDep = Annotated[ReviewNotifier, Depends(get_notifier)]
