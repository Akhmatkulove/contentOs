import uuid
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import BrandArtDirector
from app.auth.models import Role, Status, User
from app.core.config import Settings
from app.core.db import get_session
from app.main import create_app
from tests.test_products import sign_up


@pytest.fixture
async def client(settings: Settings, db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    app = create_app(settings)
    app.dependency_overrides[get_session] = lambda: db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


async def user_id(db: AsyncSession, email: str) -> uuid.UUID | None:
    return await db.scalar(select(User.id).where(User.email == email))


async def link(db: AsyncSession, brand: str, art_director: str) -> None:
    db.add(
        BrandArtDirector(
            brand_id=await user_id(db, brand), art_director_id=await user_id(db, art_director)
        )
    )
    await db.flush()


async def test_brand_sees_only_its_approved_art_directors(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await sign_up(client, db_session, "zara@example.com", Role.ART_DIRECTOR, "Zara")
    await sign_up(client, db_session, "amina@example.com", Role.ART_DIRECTOR, "Amina")
    await sign_up(client, db_session, "other@example.com", Role.ART_DIRECTOR, "Other")
    await sign_up(client, db_session, "gone@example.com", Role.ART_DIRECTOR, "Gone")
    await sign_up(client, db_session, "rival@example.com", Role.BRAND, "Rival")
    await sign_up(client, db_session, "brand@example.com", Role.BRAND, "Acme")
    for art_director in ("zara", "amina", "gone"):
        await link(db_session, "brand@example.com", f"{art_director}@example.com")
    await link(db_session, "rival@example.com", "other@example.com")
    await db_session.execute(
        update(User).where(User.email == "gone@example.com").values(status=Status.REJECTED)
    )

    response = await client.get("/api/team/art-directors")

    assert response.status_code == 200
    assert [member["name"] for member in response.json()] == ["Amina", "Zara"]
    assert set(response.json()[0]) == {"id", "name", "photo_url"}


async def test_only_brands_list_art_directors(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await sign_up(client, db_session, "amina@example.com", Role.ART_DIRECTOR, "Amina")

    response = await client.get("/api/team/art-directors")

    assert response.status_code == 403
