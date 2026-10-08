from collections.abc import AsyncIterator
from datetime import UTC, datetime, timedelta

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, Status, User, UserSession
from app.cleanup import cleanup
from app.core.config import Settings
from app.core.db import get_session
from app.core.rate_limit import RateLimitCounter
from app.core.storage import get_storage
from app.files.models import StoredFile
from app.main import create_app
from tests.fakes import FakeStorage
from tests.test_files import image_bytes, upload


@pytest.fixture
def storage() -> FakeStorage:
    return FakeStorage()


@pytest.fixture
async def client(
    settings: Settings, db_session: AsyncSession, storage: FakeStorage
) -> AsyncIterator[AsyncClient]:
    """Одобренный бренд с хранилищем в памяти."""
    app = create_app(settings)
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[get_storage] = lambda: storage
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post(
            "/api/auth/signup", json={"email": "brand@example.com", "password": "brand-password"}
        )
        await db_session.execute(update(User).values(role=Role.BRAND, status=Status.APPROVED))
        yield client


async def file_ids(db: AsyncSession) -> set[str]:
    return {str(file_id) for file_id in await db.scalars(select(StoredFile.id))}


async def test_deletes_only_old_unused_files(
    client: AsyncClient, db_session: AsyncSession, storage: FakeStorage
) -> None:
    unused, photo, reference_file = [await upload(client, image_bytes()) for _ in range(3)]
    response = await client.post(
        "/api/products",
        json={
            "name": "Linen shirt",
            "about": "Summer linen shirt",
            "photo_ids": [photo["id"]],
            "references": [{"title": "Walk", "file_ids": [reference_file["id"]]}],
        },
    )
    assert response.status_code == 201, response.text

    # Сутки ещё не прошли: форму могут сохранить.
    report = await cleanup(db_session, storage, datetime.now(UTC))
    assert report.files == 0
    assert len(storage.files) == 3

    report = await cleanup(db_session, storage, datetime.now(UTC) + timedelta(days=2))
    assert report.files == 1
    remaining = await file_ids(db_session)
    assert unused["id"] not in remaining
    assert remaining == {photo["id"], reference_file["id"]}
    assert len(storage.files) == 2


async def test_keeps_files_without_storage(
    client: AsyncClient, db_session: AsyncSession, storage: FakeStorage
) -> None:
    unused = await upload(client, image_bytes())

    report = await cleanup(db_session, None, datetime.now(UTC) + timedelta(days=2))

    assert report.files == 0
    assert await file_ids(db_session) == {unused["id"]}


async def test_deletes_expired_sessions(client: AsyncClient, db_session: AsyncSession) -> None:
    user_id = await db_session.scalar(select(User.id))
    assert user_id is not None
    now = datetime.now(UTC)
    db_session.add(UserSession(id="expired", user_id=user_id, expires_at=now - timedelta(days=1)))
    await db_session.flush()

    report = await cleanup(db_session, FakeStorage(), now)

    assert report.sessions == 1
    # Осталась только сессия, с которой бренд зарегистрировался.
    assert list(await db_session.scalars(select(UserSession.user_id))) == [user_id]


async def test_deletes_stale_rate_limit_counters(db_session: AsyncSession) -> None:
    now = datetime.now(UTC)
    db_session.add_all(
        [
            RateLimitCounter(key="stale", window_start=now - timedelta(days=2), hits=3),
            RateLimitCounter(key="fresh", window_start=now - timedelta(minutes=5), hits=3),
        ]
    )
    await db_session.flush()

    report = await cleanup(db_session, FakeStorage(), now)

    assert report.rate_limits == 1
    assert list(await db_session.scalars(select(RateLimitCounter.key))) == ["fresh"]
