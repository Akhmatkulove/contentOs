from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role
from app.core.config import Settings
from app.core.db import get_session
from app.core.storage import get_storage
from app.main import create_app
from app.team.models import BrandArtDirector
from tests.fakes import FakeStorage
from tests.test_files import image_bytes, upload
from tests.test_products import art_director, create, log_in, product, sign_up, user_id
from tests.test_references import add_reference
from tests.test_team import add_creator


@pytest.fixture
def storage() -> FakeStorage:
    return FakeStorage()


@pytest.fixture
async def client(
    settings: Settings, db_session: AsyncSession, storage: FakeStorage
) -> AsyncIterator[AsyncClient]:
    """Одобренный бренд «Acme» с хранилищем в памяти."""
    app = create_app(settings)
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[get_storage] = lambda: storage
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await sign_up(client, db_session, "brand@example.com", Role.BRAND, "Acme")
        yield client


async def collections(client: AsyncClient) -> list[str]:
    response = await client.get("/api/collections")
    assert response.status_code == 200, response.text
    return [item["name"] for item in response.json()]


async def make_product(client: AsyncClient, **fields: Any) -> dict[str, Any]:
    photo = await upload(client, image_bytes())
    return await create(client, product([photo["id"]], **fields))


async def test_product_creates_collection_once(client: AsyncClient) -> None:
    first = await make_product(client, collection="Summer 26")
    # Тот же текст в другом регистре выбирает существующую коллекцию.
    second = await make_product(client, collection=" summer 26 ")
    await make_product(client, collection="autumn")
    await make_product(client)

    assert first["collection"] == second["collection"] == "Summer 26"
    assert await collections(client) == ["autumn", "Summer 26"]


async def test_editing_product_picks_or_creates_collection(client: AsyncClient) -> None:
    created = await make_product(client, collection="Summer 26")
    body = {
        **{field: created[field] for field in ("name", "about", "status", "tags")},
        "photo_ids": [photo["id"] for photo in created["photos"]],
        "collection": "Resort",
    }
    response = await client.put(f"/api/products/{created['id']}", json=body)
    assert response.status_code == 200, response.text
    assert response.json()["collection"] == "Resort"
    assert await collections(client) == ["Resort", "Summer 26"]


async def test_brand_collections_are_shared_down_the_team(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await art_director(client, db_session, "amina@example.com", "Amina")
    await sign_up(client, db_session, "odina@example.com", Role.ART_DIRECTOR, "Odina")
    await sign_up(client, db_session, "lana@example.com", Role.CREATOR, "Lana")
    await sign_up(client, db_session, "other@example.com", Role.CREATOR, "Other")
    await add_creator(db_session, "amina@example.com", "lana@example.com")
    await add_creator(db_session, "odina@example.com", "other@example.com")
    await log_in(client, "brand@example.com")
    await make_product(client, collection="Summer 26")

    # Арт-директор бренда и его креатор видят коллекцию бренда, остальные — нет.
    for email, expected in (
        ("amina@example.com", ["Summer 26"]),
        ("lana@example.com", ["Summer 26"]),
        ("odina@example.com", []),
        ("other@example.com", []),
    ):
        await log_in(client, email)
        assert await collections(client) == expected, email


async def test_art_director_collections_are_hidden_from_the_brand(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await art_director(client, db_session, "amina@example.com", "Amina")
    await sign_up(client, db_session, "lana@example.com", Role.CREATOR, "Lana")
    await add_creator(db_session, "amina@example.com", "lana@example.com")
    await log_in(client, "amina@example.com")
    reference = await add_reference(client, link="https://example.com/", collection="Moodboards")
    assert reference["collection"] == "Moodboards"

    assert await collections(client) == ["Moodboards"]
    await log_in(client, "lana@example.com")
    assert await collections(client) == ["Moodboards"]
    await log_in(client, "brand@example.com")
    assert await collections(client) == []


async def test_reference_reuses_a_visible_collection(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await art_director(client, db_session, "amina@example.com", "Amina")
    await make_product(client, collection="Summer 26")

    await log_in(client, "amina@example.com")
    reference = await add_reference(client, link="https://example.com/", collection="SUMMER 26")
    # Новая коллекция не создана: арт-директор взял коллекцию бренда.
    assert reference["collection"] == "Summer 26"
    assert await collections(client) == ["Summer 26"]


async def test_same_name_from_two_owners_is_listed_once(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await sign_up(client, db_session, "amina@example.com", Role.ART_DIRECTOR, "Amina")
    reference = await add_reference(client, link="https://example.com/", collection="summer")
    await log_in(client, "brand@example.com")
    await make_product(client, collection="Summer")
    # Связку завели, когда у обоих уже была такая коллекция.
    db_session.add(
        BrandArtDirector(
            brand_id=await user_id(db_session, "brand@example.com"),
            art_director_id=await user_id(db_session, "amina@example.com"),
        )
    )
    await db_session.flush()

    await log_in(client, "amina@example.com")
    assert await collections(client) == ["summer"]
    second = await add_reference(client, link="https://example.org/", collection="SUMMER")
    assert reference["collection"] == second["collection"] == "summer"


async def test_collection_name_is_limited(client: AsyncClient) -> None:
    photo = await upload(client, image_bytes())
    response = await client.post("/api/products", json=product([photo["id"]], collection="x" * 101))
    assert response.status_code == 422
