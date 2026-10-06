from collections.abc import AsyncIterator
from datetime import UTC, datetime
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
from app.references.models import Reference
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
    # Созданы в одной транзакции: created_at одинаковый, порядок не проверяем.
    link, moodboard = sorted(body["items"], key=lambda item: item["title"] or "")
    assert link["link"] == "https://www.instagram.com/p/abc/"
    assert link["files"] == []
    assert moodboard["title"] == "Beach light"
    assert moodboard["author"] == "Acme"
    assert moodboard["collection"] == "Summer 26"
    assert [file["id"] for file in moodboard["files"]] == [image["id"], video["id"]]
    assert moodboard["files"][0]["url"].startswith("http://signed.test/files/")


async def test_searches_title_notes_tags_and_collection_and_pages(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    await product_with_references(
        client,
        "Abaya",
        [amina],
        [
            {"title": "Light", "link": "https://example.com/1"},
            {"title": "Pose", "link": "https://example.com/2", "notes": "Slow turn"},
            {"title": "100%", "link": "https://example.com/3", "tags": ["fabric"]},
        ],
    )

    await log_in(client, "amina@example.com")

    async def found(search: str) -> set[str]:
        return {item["title"] for item in (await listing(client, search=search))["items"]}

    assert await found("LIGHT") == {"Light"}
    assert await found("turn") == {"Pose"}
    assert await found("fabr") == {"100%"}
    assert await found("%") == {"100%"}
    assert await found("summer") == {"Light", "Pose", "100%"}
    first = await listing(client, per_page=2)
    assert (len(first["items"]), first["total"]) == (2, 3)


async def test_filters_by_type_product_author_and_tag(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    await product_with_references(
        client,
        "Abaya",
        [amina],
        [
            {"title": "Walk", "type": "video", "link": "https://example.com/1", "tags": ["pose"]},
            {"title": "Drape", "type": "image", "link": "https://example.com/2"},
        ],
    )
    await product_with_references(
        client, "Hijab", [amina], [{"title": "Wrap", "link": "https://example.com/3"}]
    )
    await log_in(client, "amina@example.com")
    filters = (await client.get("/api/references/filters")).json()
    abaya = next(p["id"] for p in filters["products"] if p["name"] == "Abaya")
    acme = filters["authors"][0]["id"]

    async def titles(**params: Any) -> set[str]:
        return {item["title"] for item in (await listing(client, **params))["items"]}

    assert await titles(type="video") == {"Walk"}
    assert await titles(product_id=abaya) == {"Walk", "Drape"}
    assert await titles(product_id=abaya, type="image") == {"Drape"}
    assert await titles(author_id=acme) == {"Walk", "Drape", "Wrap"}
    assert await titles(tag="pose") == {"Walk"}
    assert await titles(tag="Pose") == set()


async def test_sorts_by_date_and_title(client: AsyncClient, db_session: AsyncSession) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    await product_with_references(
        client,
        "Abaya",
        [amina],
        [{"title": t, "link": f"https://example.com/{t}"} for t in ("b", "a", "c")]
        + [{"link": "https://example.com/untitled"}],
    )
    # В одной транзакции now() одинаковый: разводим даты руками.
    for days, title in enumerate(["b", "a", "c", None]):
        await db_session.execute(
            update(Reference)
            .where(Reference.title.is_(None) if title is None else Reference.title == title)
            .values(created_at=datetime(2026, 10, 1 + days, tzinfo=UTC))
        )
    await log_in(client, "amina@example.com")

    async def order(sort: str) -> list[str | None]:
        return [item["title"] for item in (await listing(client, sort=sort))["items"]]

    assert await order("newest") == [None, "c", "a", "b"]
    assert await order("oldest") == ["b", "a", "c", None]
    assert await order("title_asc") == ["a", "b", "c", None]
    assert await order("title_desc") == ["c", "b", "a", None]
    assert (await client.get("/api/references", params={"sort": "random"})).status_code == 422


async def test_filters_list_only_the_visible_pool(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    odina = await art_director(client, db_session, "odina@example.com", "Odina")
    await product_with_references(
        client,
        "Abaya",
        [amina],
        [
            {"link": "https://example.com/1", "tags": ["pose", "light"]},
            {"link": "https://example.com/2", "tags": ["light"]},
        ],
    )
    await product_with_references(
        client, "Hijab", [odina], [{"link": "https://example.com/3", "tags": ["wrap"]}]
    )
    await product_with_references(client, "Plain", [amina], [])

    await log_in(client, "amina@example.com")
    filters = (await client.get("/api/references/filters")).json()

    assert [product["name"] for product in filters["products"]] == ["Abaya"]
    assert [(a["name"], a["photo_url"]) for a in filters["authors"]] == [("Acme", None)]
    assert filters["tags"] == ["light", "pose"]


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
    await product_with_references(
        client, "Abaya", [amina], [{"link": "https://example.com/", "tags": ["pose"]}]
    )
    await sign_up(client, db_session, "member@example.com", role, "Member")

    assert await listing(client) == {"items": [], "total": 0}
    filters = (await client.get("/api/references/filters")).json()
    assert filters == {"products": [], "authors": [], "tags": []}


async def test_list_rejects_bad_paging(client: AsyncClient) -> None:
    for params in ({"page": 0}, {"per_page": 51}, {"search": "x" * 101}):
        assert (await client.get("/api/references", params=params)).status_code == 422
