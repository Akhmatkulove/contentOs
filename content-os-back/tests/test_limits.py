from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.rate_limit import RateLimitCounter

PASSWORD = "anna-password"  # noqa: S105


async def signup(client: AsyncClient, email: str = "anna@example.com") -> int:
    response = await client.post("/api/auth/signup", json={"email": email, "password": PASSWORD})
    return response.status_code


async def login(client: AsyncClient, password: str, email: str = "anna@example.com") -> int:
    response = await client.post("/api/auth/login", json={"email": email, "password": password})
    return response.status_code


# --- Размер тела ---


async def test_declared_oversized_body_is_rejected_before_reading(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/login",
        content=b"{}",
        headers={"Content-Type": "application/json", "Content-Length": str(2 * 1024 * 1024)},
    )

    assert response.status_code == 413


async def test_chunked_oversized_body_is_cut_off(client: AsyncClient) -> None:
    async def chunks() -> AsyncIterator[bytes]:
        for _ in range(3):
            yield b"x" * (512 * 1024)

    # Без Content-Length: размер виден только при чтении.
    response = await client.post(
        "/api/auth/login", content=chunks(), headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 413


async def test_photo_endpoint_has_its_own_larger_limit(client: AsyncClient) -> None:
    await signup(client)
    body = b"x" * (3 * 1024 * 1024)

    response = await client.put("/api/me/photo", files={"photo": ("me.jpg", body, "image/jpeg")})

    # Тело принято (больше общего лимита в 1 МБ) и отвергнуто уже как не-картинка.
    assert response.status_code != 413


async def test_oversized_upload_without_session_is_rejected(client: AsyncClient) -> None:
    body = b"x" * (7 * 1024 * 1024)

    response = await client.put("/api/me/photo", files={"photo": ("me.jpg", body, "image/jpeg")})

    assert response.status_code == 413


# --- Вход ---


async def test_failed_logins_per_email_are_limited(client: AsyncClient) -> None:
    await signup(client)
    client.cookies.clear()

    for _ in range(10):
        assert await login(client, "wrong-password") == 401
    response = await client.post(
        "/api/auth/login", json={"email": "anna@example.com", "password": PASSWORD}
    )

    # Даже верный пароль не проверяется, пока окно не истечёт.
    assert response.status_code == 429
    assert 0 < int(response.headers["retry-after"]) <= 15 * 60


async def test_successful_logins_do_not_count_against_email(client: AsyncClient) -> None:
    await signup(client)

    for _ in range(12):
        assert await login(client, PASSWORD) == 200


async def test_email_limit_does_not_block_other_emails(client: AsyncClient) -> None:
    await signup(client)
    await signup(client, "boris@example.com")
    for _ in range(10):
        await login(client, "wrong-password")

    assert await login(client, PASSWORD, "boris@example.com") == 200


async def test_login_attempts_per_ip_are_limited(client: AsyncClient) -> None:
    # Подбор по разным email с одного адреса.
    statuses = [await login(client, "x", f"user{i}@example.com") for i in range(31)]

    assert statuses[:30] == [401] * 30
    assert statuses[30] == 429


async def test_limit_resets_after_window(client: AsyncClient, db_session: AsyncSession) -> None:
    await signup(client)
    for _ in range(10):
        await login(client, "wrong-password")
    await db_session.execute(
        update(RateLimitCounter).values(window_start=datetime.now(UTC) - timedelta(minutes=16))
    )

    assert await login(client, PASSWORD) == 200


# --- Регистрация ---


async def test_signups_per_ip_are_limited(client: AsyncClient) -> None:
    statuses = [await signup(client, f"user{i}@example.com") for i in range(11)]

    assert statuses[:10] == [201] * 10
    assert statuses[10] == 429


# --- Отправка заявки ---


@pytest.fixture
async def filled(user_client: AsyncClient) -> AsyncClient:
    await user_client.patch("/api/me/onboarding", json={"role": "creator", "name": "Anna"})
    return user_client


async def test_resubmits_are_limited(filled: AsyncClient) -> None:
    for _ in range(5):
        assert (await filled.post("/api/me/onboarding/submit")).status_code == 200
        assert (await filled.post("/api/me/onboarding/reopen")).status_code == 200

    response = await filled.post("/api/me/onboarding/submit")

    assert response.status_code == 429
    assert (await filled.get("/api/me")).json()["status"] == "onboarding"
