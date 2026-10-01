import json
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

import httpx
import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, User
from app.core.config import Settings
from app.core.db import get_session
from app.main import create_app
from app.review.notifier import TelegramError, TelegramNotifier, get_notifier

SECRET = "webhook-secret"  # noqa: S105
CHAT_ID = -100500
ADMIN_ID = 42


@dataclass
class FakeNotifier:
    next_message_id: int = 100
    fail: bool = False
    sent: list[str] = field(default_factory=list)
    closed: list[tuple[int, str]] = field(default_factory=list)
    answers: list[str] = field(default_factory=list)

    async def send_application(self, user: User) -> int:
        if self.fail:
            raise TelegramError("down")
        self.next_message_id += 1
        self.sent.append(user.email)
        return self.next_message_id

    async def close_application(self, message_id: int, user: User, note: str) -> None:
        self.closed.append((message_id, note))

    async def answer_callback(self, callback_id: str, text: str) -> None:
        self.answers.append(text)


@pytest.fixture
def notifier() -> FakeNotifier:
    return FakeNotifier()


@pytest.fixture
def review_settings(settings: Settings) -> Settings:
    return settings.model_copy(
        update={
            "telegram_webhook_secret": SecretStr(SECRET),
            "telegram_chat_id": CHAT_ID,
            "telegram_admin_id": ADMIN_ID,
        }
    )


def make_client(settings: Settings, db: AsyncSession, notifier: FakeNotifier) -> AsyncClient:
    app = create_app(settings)
    app.dependency_overrides[get_session] = lambda: db
    app.dependency_overrides[get_notifier] = lambda: notifier
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.fixture
async def client(
    review_settings: Settings, db_session: AsyncSession, notifier: FakeNotifier
) -> AsyncIterator[AsyncClient]:
    async with make_client(review_settings, db_session, notifier) as client:
        yield client


async def filled(client: AsyncClient) -> None:
    """Регистрирует пользователя и заполняет онбординг."""
    await client.post(
        "/api/auth/signup", json={"email": "anna@example.com", "password": "anna-password"}
    )
    await client.patch("/api/me/onboarding", json={"role": "creator", "name": "Anna"})


async def submitted(client: AsyncClient) -> str:
    """Отправляет заполненную заявку. Возвращает id пользователя."""
    await filled(client)
    response = await client.post("/api/me/onboarding/submit")
    assert response.status_code == 200
    user_id: str = response.json()["id"]
    return user_id


async def press(
    client: AsyncClient,
    data: str,
    message_id: int,
    *,
    sender: int = ADMIN_ID,
    chat: int = CHAT_ID,
    secret: str = SECRET,
) -> httpx.Response:
    return await client.post(
        "/api/telegram/webhook",
        headers={"X-Telegram-Bot-Api-Secret-Token": secret},
        json={
            "update_id": 1,
            "callback_query": {
                "id": "cb",
                "from": {"id": sender, "is_bot": False, "first_name": "Admin"},
                "message": {"message_id": message_id, "chat": {"id": chat}, "date": 0},
                "data": data,
            },
        },
    )


async def status_of(client: AsyncClient) -> str:
    status: str = (await client.get("/api/me")).json()["status"]
    return status


async def test_submit_sends_application(client: AsyncClient, notifier: FakeNotifier) -> None:
    await submitted(client)

    assert notifier.sent == ["anna@example.com"]


async def test_submit_fails_and_keeps_onboarding_when_telegram_is_down(
    client: AsyncClient, notifier: FakeNotifier
) -> None:
    await filled(client)
    notifier.fail = True

    assert (await client.post("/api/me/onboarding/submit")).status_code == 503
    assert await status_of(client) == "onboarding"


@pytest.mark.parametrize(
    ("decision", "status", "note"),
    [("approve", "approved", "✅ Одобрено"), ("reject", "rejected", "❌ Отклонено")],
)
async def test_admin_decides_from_telegram(
    client: AsyncClient, notifier: FakeNotifier, decision: str, status: str, note: str
) -> None:
    user_id = await submitted(client)

    response = await press(client, f"{decision}:{user_id}", notifier.next_message_id)

    assert response.status_code == 204
    assert await status_of(client) == status
    assert notifier.closed == [(notifier.next_message_id, note)]
    assert notifier.answers == [note]


async def test_rejected_user_can_fix_and_resubmit(
    client: AsyncClient, notifier: FakeNotifier
) -> None:
    user_id = await submitted(client)
    await press(client, f"reject:{user_id}", notifier.next_message_id)

    await client.post("/api/me/onboarding/reopen")
    await client.patch("/api/me/onboarding", json={"role": "brand"})
    await client.post("/api/me/onboarding/submit")
    await press(client, f"approve:{user_id}", notifier.next_message_id)

    me = (await client.get("/api/me")).json()
    assert me["status"] == "approved"
    assert me["role"] == "brand"


@pytest.mark.parametrize("secret", ["wrong", ""])
async def test_webhook_requires_secret(
    client: AsyncClient, notifier: FakeNotifier, secret: str
) -> None:
    user_id = await submitted(client)

    response = await press(client, f"approve:{user_id}", notifier.next_message_id, secret=secret)

    assert response.status_code == 403
    assert await status_of(client) == "pending_review"


async def test_webhook_is_closed_when_secret_is_not_configured(
    settings: Settings, db_session: AsyncSession, notifier: FakeNotifier
) -> None:
    async with make_client(settings, db_session, notifier) as client:
        response = await press(client, "approve:whatever", 1)

    assert response.status_code == 403


@pytest.mark.parametrize(("sender", "chat"), [(7, CHAT_ID), (ADMIN_ID, 7)])
async def test_only_admin_in_review_chat_can_decide(
    client: AsyncClient, notifier: FakeNotifier, sender: int, chat: int
) -> None:
    user_id = await submitted(client)

    await press(client, f"approve:{user_id}", notifier.next_message_id, sender=sender, chat=chat)

    assert await status_of(client) == "pending_review"
    assert notifier.answers == ["Нет доступа"]


async def test_reopen_withdraws_application_message(
    client: AsyncClient, notifier: FakeNotifier
) -> None:
    user_id = await submitted(client)
    old_message = notifier.next_message_id

    await client.post("/api/me/onboarding/reopen")

    assert notifier.closed == [(old_message, "↩️ Заявка отозвана")]
    # Кнопка в отозванном сообщении ничего не меняет.
    await press(client, f"approve:{user_id}", old_message)
    assert await status_of(client) == "onboarding"
    assert notifier.answers == ["Заявка неактуальна"]


async def test_old_message_is_stale_after_resubmit(
    client: AsyncClient, notifier: FakeNotifier
) -> None:
    user_id = await submitted(client)
    old_message = notifier.next_message_id
    await client.post("/api/me/onboarding/reopen")
    await client.post("/api/me/onboarding/submit")

    await press(client, f"reject:{user_id}", old_message)

    assert await status_of(client) == "pending_review"
    assert notifier.answers == ["Заявка неактуальна"]


async def test_second_press_after_decision_changes_nothing(
    client: AsyncClient, notifier: FakeNotifier
) -> None:
    user_id = await submitted(client)
    message = notifier.next_message_id
    await press(client, f"approve:{user_id}", message)

    await press(client, f"reject:{user_id}", message)

    assert await status_of(client) == "approved"
    assert notifier.answers == ["✅ Одобрено", "Заявка неактуальна"]


@pytest.mark.parametrize(
    "data", ["promote:00000000-0000-0000-0000-000000000000", "approve:not-a-uuid"]
)
async def test_unknown_callback_is_ignored(
    client: AsyncClient, notifier: FakeNotifier, data: str
) -> None:
    await submitted(client)

    await press(client, data, notifier.next_message_id)

    assert await status_of(client) == "pending_review"
    assert notifier.answers == ["Неизвестная команда"]


async def test_non_button_updates_are_accepted(client: AsyncClient) -> None:
    response = await client.post(
        "/api/telegram/webhook",
        headers={"X-Telegram-Bot-Api-Secret-Token": SECRET},
        json={"update_id": 1, "message": {"text": "hi"}},
    )

    assert response.status_code == 204


async def test_dev_endpoint_decides_without_telegram(client: AsyncClient) -> None:
    await submitted(client)

    response = await client.post(
        "/api/dev/review", json={"email": "anna@example.com", "decision": "approve"}
    )

    assert response.status_code == 204
    assert await status_of(client) == "approved"
    # Уже решённую заявку повторно не решить.
    response = await client.post(
        "/api/dev/review", json={"email": "anna@example.com", "decision": "reject"}
    )
    assert response.status_code == 409


async def test_dev_endpoint_is_absent_in_production(
    review_settings: Settings, db_session: AsyncSession, notifier: FakeNotifier
) -> None:
    production = review_settings.model_copy(update={"environment": "production"})
    async with make_client(production, db_session, notifier) as client:
        response = await client.post(
            "/api/dev/review", json={"email": "anna@example.com", "decision": "approve"}
        )

    assert response.status_code == 404


async def test_telegram_notifier_sends_escaped_application_with_buttons() -> None:
    requests: list[tuple[str, dict[str, Any]]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append((request.url.path, json.loads(request.content)))
        return httpx.Response(200, json={"ok": True, "result": {"message_id": 7}})

    notifier = TelegramNotifier("TOKEN", CHAT_ID, transport=httpx.MockTransport(handler))
    user = User(id=uuid.uuid4(), email="a@example.com", name="<b>Anna</b>", role=Role.ART_DIRECTOR)

    assert await notifier.send_application(user) == 7

    path, payload = requests[0]
    assert path == "/botTOKEN/sendMessage"
    assert payload["chat_id"] == CHAT_ID
    assert "&lt;b&gt;Anna&lt;/b&gt;" in payload["text"]
    assert "Арт-директор" in payload["text"]
    buttons = payload["reply_markup"]["inline_keyboard"][0]
    assert [b["callback_data"] for b in buttons] == [f"approve:{user.id}", f"reject:{user.id}"]


async def test_telegram_notifier_raises_when_telegram_refuses() -> None:
    transport = httpx.MockTransport(
        lambda _: httpx.Response(400, json={"ok": False, "description": "chat not found"})
    )
    notifier = TelegramNotifier("TOKEN", CHAT_ID, transport=transport)

    with pytest.raises(TelegramError, match="chat not found"):
        await notifier.send_application(User(email="a@example.com"))
