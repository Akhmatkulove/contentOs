from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import pytest
from fastapi import APIRouter, Depends
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.service import create_or_reset_admin
from app.auth.deps import ApprovedUser, require_role
from app.auth.models import Role, Status, User, UserSession
from app.core.config import Settings
from app.core.db import get_session
from app.main import create_app

PASSWORD = "correct-horse"  # noqa: S105


async def signup(client: AsyncClient, email: str = "anna@example.com") -> None:
    response = await client.post("/api/auth/signup", json={"email": email, "password": PASSWORD})
    assert response.status_code == 201


async def set_user(db: AsyncSession, **values: object) -> None:
    await db.execute(update(User).values(**values))


async def test_signup_starts_onboarding_and_logs_in(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/signup", json={"email": "Anna@Example.com", "password": PASSWORD}
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "anna@example.com"
    assert body["status"] == "onboarding"
    assert body["role"] is None

    me = await client.get("/api/me")
    assert me.status_code == 200
    assert me.json() == body


async def test_session_cookie_is_http_only(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/signup", json={"email": "anna@example.com", "password": PASSWORD}
    )

    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie
    assert "samesite=lax" in cookie
    assert "path=/api" in cookie


async def test_signup_rejects_taken_email_in_any_case(client: AsyncClient) -> None:
    await signup(client)

    response = await client.post(
        "/api/auth/signup", json={"email": "ANNA@example.com", "password": PASSWORD}
    )

    assert response.status_code == 409


async def test_signup_rejects_short_password(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/signup", json={"email": "anna@example.com", "password": "short"}
    )

    assert response.status_code == 422


async def test_login_with_correct_password(client: AsyncClient) -> None:
    await signup(client)
    client.cookies.clear()

    response = await client.post(
        "/api/auth/login", json={"email": "ANNA@example.com", "password": PASSWORD}
    )

    assert response.status_code == 200
    assert (await client.get("/api/me")).status_code == 200


@pytest.mark.parametrize(
    ("email", "password"),
    [("anna@example.com", "wrong-password"), ("nobody@example.com", PASSWORD)],
)
async def test_login_fails_the_same_way_for_wrong_password_and_unknown_email(
    client: AsyncClient, email: str, password: str
) -> None:
    await signup(client)
    client.cookies.clear()

    response = await client.post("/api/auth/login", json={"email": email, "password": password})

    assert response.status_code == 401
    assert response.json() == {"detail": "Invalid email or password"}


async def test_login_fails_for_account_without_password(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await signup(client)
    client.cookies.clear()
    await set_user(db_session, password_hash=None)

    response = await client.post(
        "/api/auth/login", json={"email": "anna@example.com", "password": PASSWORD}
    )

    assert response.status_code == 401


async def test_me_requires_session(client: AsyncClient) -> None:
    assert (await client.get("/api/me")).status_code == 401

    client.cookies.set("session", "made-up-token")
    assert (await client.get("/api/me")).status_code == 401


async def test_logout_ends_session(client: AsyncClient) -> None:
    await signup(client)
    token = client.cookies["session"]

    response = await client.post("/api/auth/logout")

    assert response.status_code == 204
    # Старый токен больше не работает, даже если его кто-то сохранил.
    client.cookies.set("session", token)
    assert (await client.get("/api/me")).status_code == 401


async def test_expired_session_is_rejected(client: AsyncClient, db_session: AsyncSession) -> None:
    await signup(client)
    await db_session.execute(
        update(UserSession).values(expires_at=datetime.now(UTC) - timedelta(seconds=1))
    )

    assert (await client.get("/api/me")).status_code == 401
    assert (await db_session.scalar(select(UserSession))) is None


async def test_session_is_extended_after_half_its_lifetime(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await signup(client)
    await db_session.execute(
        update(UserSession).values(expires_at=datetime.now(UTC) + timedelta(days=1))
    )

    response = await client.get("/api/me")

    assert response.status_code == 200
    assert "session=" in response.headers["set-cookie"]
    session = await db_session.scalar(select(UserSession))
    assert session is not None
    await db_session.refresh(session)
    assert session.expires_at > datetime.now(UTC) + timedelta(days=29)


async def test_fresh_session_is_not_rewritten(client: AsyncClient) -> None:
    await signup(client)

    response = await client.get("/api/me")

    assert "set-cookie" not in response.headers


async def test_mutating_request_from_foreign_origin_is_rejected(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/signup",
        json={"email": "anna@example.com", "password": PASSWORD},
        headers={"Origin": "https://evil.example"},
    )

    assert response.status_code == 403


async def test_mutating_request_from_frontend_origin_is_allowed(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/signup",
        json={"email": "anna@example.com", "password": PASSWORD},
        headers={"Origin": "http://localhost:5173"},
    )

    assert response.status_code == 201


@pytest.fixture
async def guarded_client(
    settings: Settings, db_session: AsyncSession
) -> AsyncIterator[AsyncClient]:
    """Приложение с тестовыми эндпоинтами за зависимостями доступа."""
    guarded = APIRouter(prefix="/api/test")

    @guarded.get("/product")
    async def product(user: ApprovedUser) -> dict[str, str]:
        return {"email": user.email}

    @guarded.get("/brand-only", dependencies=[Depends(require_role(Role.BRAND))])
    async def brand_only() -> dict[str, bool]:
        return {"ok": True}

    app = create_app(settings)
    app.include_router(guarded)
    app.dependency_overrides[get_session] = lambda: db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.mark.parametrize("status", [Status.ONBOARDING, Status.PENDING_REVIEW, Status.REJECTED])
async def test_product_is_closed_until_approved(
    guarded_client: AsyncClient, db_session: AsyncSession, status: Status
) -> None:
    await signup(guarded_client)
    await set_user(db_session, status=status, role=Role.BRAND)

    assert (await guarded_client.get("/api/test/product")).status_code == 403
    assert (await guarded_client.get("/api/test/brand-only")).status_code == 403


async def test_approved_user_enters_product(
    guarded_client: AsyncClient, db_session: AsyncSession
) -> None:
    await signup(guarded_client)
    await set_user(db_session, status=Status.APPROVED, role=Role.CREATOR)

    assert (await guarded_client.get("/api/test/product")).status_code == 200


async def test_role_gate_checks_role(guarded_client: AsyncClient, db_session: AsyncSession) -> None:
    await signup(guarded_client)

    await set_user(db_session, status=Status.APPROVED, role=Role.CREATOR)
    assert (await guarded_client.get("/api/test/brand-only")).status_code == 403

    await set_user(db_session, role=Role.BRAND)
    assert (await guarded_client.get("/api/test/brand-only")).status_code == 200


async def test_guards_require_session(guarded_client: AsyncClient) -> None:
    assert (await guarded_client.get("/api/test/product")).status_code == 401
    assert (await guarded_client.get("/api/test/brand-only")).status_code == 401


async def test_admin_is_kept_out_of_product(
    guarded_client: AsyncClient, db_session: AsyncSession
) -> None:
    await create_or_reset_admin(db_session, "admin@example.com", "admin-long-password")
    await db_session.commit()
    response = await guarded_client.post(
        "/api/auth/login", json={"email": "admin@example.com", "password": "admin-long-password"}
    )
    assert response.status_code == 200

    assert (await guarded_client.get("/api/test/product")).status_code == 403
