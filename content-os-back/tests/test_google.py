import base64
import hashlib
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.google import GoogleOAuth, get_google
from app.auth.models import User
from app.core.config import Settings
from app.core.db import get_session
from app.main import create_app

APP_URL = "http://localhost:5173"
PASSWORD = "anna-password"  # noqa: S105


@dataclass
class FakeGoogle:
    """Google, который отдаёт заданный профиль. Запоминает запросы к token endpoint."""

    profile: dict[str, Any] = field(
        default_factory=lambda: {
            "sub": "google-1",
            "email": "Anna@Gmail.com",
            "email_verified": True,
        }
    )
    token_ok: bool = True
    token_requests: list[dict[str, list[str]]] = field(default_factory=list)

    def handle(self, request: httpx.Request) -> httpx.Response:
        if request.url.path == "/token":
            self.token_requests.append(parse_qs(request.content.decode()))
            if not self.token_ok:
                return httpx.Response(400, json={"error": "invalid_grant"})
            return httpx.Response(200, json={"access_token": "access"})
        assert request.headers["authorization"] == "Bearer access"
        return httpx.Response(200, json=self.profile)


@pytest.fixture
def google() -> FakeGoogle:
    return FakeGoogle()


@pytest.fixture
async def client(
    settings: Settings, db_session: AsyncSession, google: FakeGoogle
) -> AsyncIterator[AsyncClient]:
    app = create_app(
        settings.model_copy(
            update={"google_client_id": "client-id", "google_client_secret": SecretStr("s")}
        )
    )
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[get_google] = lambda: GoogleOAuth(
        "client-id",
        "s",
        f"{APP_URL}/api/auth/google/callback",
        transport=httpx.MockTransport(google.handle),
    )
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


async def start(client: AsyncClient) -> dict[str, str]:
    """Уходит на Google и возвращает параметры URL авторизации."""
    response = await client.get("/api/auth/google")
    assert response.status_code == 302
    location = urlparse(response.headers["location"])
    assert location.netloc == "accounts.google.com"
    return {key: values[0] for key, values in parse_qs(location.query).items()}


async def sign_in(client: AsyncClient) -> httpx.Response:
    params = await start(client)
    return await client.get(
        "/api/auth/google/callback", params={"code": "code", "state": params["state"]}
    )


def assert_failed(response: httpx.Response) -> None:
    assert response.status_code == 302
    assert response.headers["location"] == f"{APP_URL}/login?error=google"


async def test_new_google_user_starts_onboarding(client: AsyncClient) -> None:
    response = await sign_in(client)

    assert response.status_code == 302
    assert response.headers["location"] == f"{APP_URL}/"
    me = (await client.get("/api/me")).json()
    assert me["email"] == "anna@gmail.com"
    assert me["status"] == "onboarding"
    assert me["onboarding_step"] == "role"


async def test_authorization_request_uses_pkce(client: AsyncClient, google: FakeGoogle) -> None:
    params = await start(client)
    assert params["code_challenge_method"] == "S256"
    assert params["redirect_uri"] == f"{APP_URL}/api/auth/google/callback"

    await client.get("/api/auth/google/callback", params={"code": "c", "state": params["state"]})

    verifier = google.token_requests[0]["code_verifier"][0]
    digest = hashlib.sha256(verifier.encode()).digest()
    assert base64.urlsafe_b64encode(digest).rstrip(b"=").decode() == params["code_challenge"]


async def test_returning_user_is_found_by_google_id_even_if_email_changed(
    client: AsyncClient, google: FakeGoogle
) -> None:
    await sign_in(client)
    first_id = (await client.get("/api/me")).json()["id"]
    client.cookies.clear()

    google.profile["email"] = "anna.new@gmail.com"
    await sign_in(client)

    assert (await client.get("/api/me")).json()["id"] == first_id


async def test_wrong_state_is_rejected(client: AsyncClient) -> None:
    await start(client)

    response = await client.get(
        "/api/auth/google/callback", params={"code": "code", "state": "forged"}
    )

    assert_failed(response)
    assert (await client.get("/api/me")).status_code == 401


async def test_callback_without_started_flow_is_rejected(client: AsyncClient) -> None:
    response = await client.get(
        "/api/auth/google/callback", params={"code": "code", "state": "anything"}
    )

    assert_failed(response)


async def test_user_declined_on_google(client: AsyncClient) -> None:
    params = await start(client)

    response = await client.get(
        "/api/auth/google/callback", params={"error": "access_denied", "state": params["state"]}
    )

    assert_failed(response)


async def test_failed_code_exchange(client: AsyncClient, google: FakeGoogle) -> None:
    google.token_ok = False

    assert_failed(await sign_in(client))
    assert (await client.get("/api/me")).status_code == 401


async def test_unverified_google_email_is_rejected(client: AsyncClient, google: FakeGoogle) -> None:
    google.profile["email_verified"] = False

    assert_failed(await sign_in(client))


async def signup_with_password(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/signup", json={"email": "anna@gmail.com", "password": PASSWORD}
    )
    assert response.status_code == 201


async def test_google_takes_over_unverified_password_account(client: AsyncClient) -> None:
    # Кто-то (возможно, не владелец почты) зарегистрировался на этот email с паролем.
    await signup_with_password(client)
    squatter_token = client.cookies["session"]
    await client.patch("/api/me/onboarding", json={"role": "brand"})
    client.cookies.clear()

    await sign_in(client)

    # Владелец почты получил тот же аккаунт с уже введёнными ответами...
    assert (await client.get("/api/me")).json()["role"] == "brand"
    # ...а старые сессии и пароль больше не работают.
    client.cookies.clear()
    client.cookies.set("session", squatter_token)
    assert (await client.get("/api/me")).status_code == 401
    response = await client.post(
        "/api/auth/login", json={"email": "anna@gmail.com", "password": PASSWORD}
    )
    assert response.status_code == 401


async def test_verified_password_account_keeps_password_when_linking(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await signup_with_password(client)
    await db_session.execute(update(User).values(email_verified=True))
    client.cookies.clear()

    await sign_in(client)

    client.cookies.clear()
    response = await client.post(
        "/api/auth/login", json={"email": "anna@gmail.com", "password": PASSWORD}
    )
    assert response.status_code == 200


async def test_email_linked_to_another_google_account_is_rejected(
    client: AsyncClient, google: FakeGoogle
) -> None:
    await sign_in(client)
    client.cookies.clear()

    google.profile["sub"] = "google-2"

    assert_failed(await sign_in(client))


async def test_google_sign_in_is_absent_when_not_configured(
    settings: Settings, db_session: AsyncSession
) -> None:
    app = create_app(settings)
    app.dependency_overrides[get_session] = lambda: db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/auth/google")

    assert response.status_code == 404
