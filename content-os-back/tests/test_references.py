from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role
from app.core.config import Settings
from app.core.db import get_session
from app.core.storage import get_storage
from app.deliverables.models import Deliverable
from app.main import create_app
from tests.fakes import FakeStorage
from tests.test_files import MP4, image_bytes, upload
from tests.test_products import (
    art_director,
    create,
    deliverable,
    log_in,
    product,
    sign_up,
)


@pytest.fixture
async def client(settings: Settings, db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    """Одобренный бренд «Acme» с хранилищем в памяти."""
    storage = FakeStorage()
    app = create_app(settings)
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[get_storage] = lambda: storage
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await sign_up(client, db_session, "brand@example.com", Role.BRAND, "Acme")
        yield client


async def product_with_references(
    client: AsyncClient, name: str, assignees: list[str], references: list[dict[str, Any]]
) -> None:
    photo = await upload(client, image_bytes())
    await create(
        client,
        product(
            [photo["id"]],
            name=name,
            collection="Summer 26",
            references=references,
            deliverables=[deliverable(assignee) for assignee in assignees],
        ),
    )


async def listing(client: AsyncClient, **params: Any) -> dict[str, Any]:
    response = await client.get("/api/references", params=params)
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


async def test_art_director_sees_references_of_assigned_products(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    odina = await art_director(client, db_session, "odina@example.com", "Odina")
    image = await upload(client, image_bytes())
    video = await upload(client, MP4, "clip.mp4")
    await product_with_references(
        client,
        "Abaya",
        [amina],
        [
            {"title": "Beach light", "type": "moodboard", "file_ids": [image["id"], video["id"]]},
            {"link": "https://www.instagram.com/p/abc/", "tags": ["pose"]},
        ],
    )
    await product_with_references(
        client, "Hijab", [odina], [{"link": "https://www.tiktok.com/@x/video/1"}]
    )

    await log_in(client, "amina@example.com")
    body = await listing(client)

    assert body["total"] == 2
    link, moodboard = body["items"]
    assert link["link"] == "https://www.instagram.com/p/abc/"
    assert link["files"] == []
    assert moodboard["title"] == "Beach light"
    assert moodboard["author"] == "Acme"
    assert moodboard["collection"] == "Summer 26"
    assert [file["id"] for file in moodboard["files"]] == [image["id"], video["id"]]
    assert moodboard["files"][0]["url"].startswith("http://signed.test/files/")


async def test_searches_title_and_collection_and_pages(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    await product_with_references(
        client,
        "Abaya",
        [amina],
        [{"title": title, "link": "https://example.com/"} for title in ("Light", "Pose", "100%")],
    )

    await log_in(client, "amina@example.com")
    assert [item["title"] for item in (await listing(client, search="LIGHT"))["items"]] == ["Light"]
    assert [item["title"] for item in (await listing(client, search="%"))["items"]] == ["100%"]
    assert (await listing(client, search="summer"))["total"] == 3
    first = await listing(client, per_page=2)
    assert (len(first["items"]), first["total"]) == (2, 3)


async def test_references_go_with_the_deliverables(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    await product_with_references(client, "Abaya", [amina], [{"link": "https://example.com/"}])
    await log_in(client, "amina@example.com")
    assert (await listing(client))["total"] == 1

    # Так снимает с deliverables админка, когда убирает связку с брендом (docs/adr/0004).
    await db_session.execute(update(Deliverable).values(assignee_id=None))

    assert await listing(client) == {"items": [], "total": 0}


@pytest.mark.parametrize("role", [Role.BRAND, Role.CREATOR])
async def test_others_see_an_empty_pool(
    client: AsyncClient, db_session: AsyncSession, role: Role
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    await product_with_references(client, "Abaya", [amina], [{"link": "https://example.com/"}])
    await sign_up(client, db_session, "member@example.com", role, "Member")

    assert await listing(client) == {"items": [], "total": 0}


async def test_list_rejects_bad_paging(client: AsyncClient) -> None:
    for params in ({"page": 0}, {"per_page": 51}, {"search": "x" * 101}):
        assert (await client.get("/api/references", params=params)).status_code == 422
