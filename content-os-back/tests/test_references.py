import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role
from app.core.config import Settings
from app.core.db import get_session
from app.core.storage import get_storage
from app.deliverables.models import Deliverable
from app.main import create_app
from app.references.models import Reference
from app.team.models import ArtDirectorCreator
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


EMPTY = {"items": [], "total": 0, "counts": {"all": 0, "mine": 0, "favorites": 0}}


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

    assert await listing(client) == EMPTY


async def test_creator_sees_the_pool_of_their_art_directors(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    odina = await art_director(client, db_session, "odina@example.com", "Odina")
    await product_with_references(
        client, "Abaya", [amina], [{"title": "Brand", "link": "https://example.com/b"}]
    )
    await product_with_references(
        client, "Hijab", [odina], [{"title": "Other", "link": "https://example.com/o"}]
    )
    await log_in(client, "amina@example.com")
    await add_reference(client, title="Amina", link="https://example.com/a")
    await log_in(client, "odina@example.com")
    await add_reference(client, title="Odina", link="https://example.com/d")
    await sign_up(client, db_session, "creator@example.com", Role.CREATOR, "Kai")
    await add_creator(db_session, "amina@example.com", "creator@example.com")
    await log_in(client, "creator@example.com")

    # Всё, что видит арт-директор: его референсы и референсы его продуктов.
    body = await listing(client)
    assert {item["title"] for item in body["items"]} == {"Amina", "Brand"}
    assert body["counts"] == {"all": 2, "mine": 0, "favorites": 0}
    filters = (await client.get("/api/references/filters")).json()
    assert {author["name"] for author in filters["authors"]} == {"Acme", "Amina"}

    # Снятие креатора из команды убирает и пул арт-директора.
    await db_session.execute(delete(ArtDirectorCreator))
    assert await listing(client) == EMPTY


@pytest.mark.parametrize("role", [Role.BRAND, Role.CREATOR])
async def test_others_see_an_empty_pool(
    client: AsyncClient, db_session: AsyncSession, role: Role
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    await product_with_references(
        client, "Abaya", [amina], [{"link": "https://example.com/", "tags": ["pose"]}]
    )
    await sign_up(client, db_session, "member@example.com", role, "Member")

    assert await listing(client) == EMPTY
    filters = (await client.get("/api/references/filters")).json()
    assert filters == {"products": [], "authors": [], "tags": []}


async def test_list_rejects_bad_paging(client: AsyncClient) -> None:
    for params in ({"page": 0}, {"per_page": 51}, {"search": "x" * 101}):
        assert (await client.get("/api/references", params=params)).status_code == 422


async def favorite(client: AsyncClient, reference_id: str, on: bool = True) -> int:
    path = f"/api/references/{reference_id}/favorite"
    response = await (client.put(path) if on else client.delete(path))
    return response.status_code


async def test_adds_and_removes_favorites(client: AsyncClient, db_session: AsyncSession) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    await product_with_references(
        client,
        "Abaya",
        [amina],
        [{"title": t, "link": f"https://example.com/{t}"} for t in ("Walk", "Drape")],
    )
    await log_in(client, "amina@example.com")
    walk = next(i for i in (await listing(client))["items"] if i["title"] == "Walk")

    assert await favorite(client, walk["id"]) == 204
    # Повторный вызов ничего не меняет.
    assert await favorite(client, walk["id"]) == 204
    marks = {i["title"]: i["favorite"] for i in (await listing(client))["items"]}
    assert marks == {"Walk": True, "Drape": False}

    assert await favorite(client, walk["id"], on=False) == 204
    assert await favorite(client, walk["id"], on=False) == 204
    assert all(not i["favorite"] for i in (await listing(client))["items"])


async def test_favorites_are_personal(client: AsyncClient, db_session: AsyncSession) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    odina = await art_director(client, db_session, "odina@example.com", "Odina")
    await product_with_references(
        client, "Abaya", [amina, odina], [{"title": "Walk", "link": "https://example.com/"}]
    )
    await log_in(client, "amina@example.com")
    [walk] = (await listing(client))["items"]
    assert await favorite(client, walk["id"]) == 204

    await log_in(client, "odina@example.com")
    [seen] = (await listing(client))["items"]
    assert seen["favorite"] is False


async def test_only_visible_references_can_be_favorited(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    await art_director(client, db_session, "odina@example.com", "Odina")
    await product_with_references(
        client, "Abaya", [amina], [{"title": "Walk", "link": "https://example.com/"}]
    )
    await log_in(client, "amina@example.com")
    [walk] = (await listing(client))["items"]

    await log_in(client, "odina@example.com")
    assert await favorite(client, walk["id"]) == 404
    assert await favorite(client, str(uuid.uuid4())) == 404


async def test_favorites_tab_lists_only_favorites_with_tab_counts(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    odina = await art_director(client, db_session, "odina@example.com", "Odina")
    await product_with_references(
        client,
        "Abaya",
        [amina, odina],
        [
            {"title": t, "link": f"https://example.com/{t}", "tags": [tag]}
            for t, tag in (("Walk", "street"), ("Drape", "studio"), ("Turn", "street"))
        ],
    )
    await log_in(client, "amina@example.com")
    ids = {i["title"]: i["id"] for i in (await listing(client))["items"]}
    for title in ("Walk", "Drape"):
        assert await favorite(client, ids[title]) == 204

    body = await listing(client, scope="favorites")
    assert {i["title"] for i in body["items"]} == {"Walk", "Drape"}
    assert all(i["favorite"] for i in body["items"])
    assert body["total"] == 2
    assert body["counts"] == {"all": 3, "mine": 0, "favorites": 2}

    # Поиск и фильтры общие у обеих вкладок, счётчики тоже под ними.
    body = await listing(client, scope="favorites", tag="street")
    assert [i["title"] for i in body["items"]] == ["Walk"]
    assert body["counts"] == {"all": 2, "mine": 0, "favorites": 1}
    body = await listing(client, tag="street", per_page=1)
    assert body["total"] == 2
    assert body["counts"] == {"all": 2, "mine": 0, "favorites": 1}

    # Избранное своё: у другого арт-директора вкладка пуста.
    await log_in(client, "odina@example.com")
    body = await listing(client, scope="favorites")
    assert body["items"] == []
    assert body["counts"] == {"all": 3, "mine": 0, "favorites": 0}


async def test_lost_access_hides_favorites(client: AsyncClient, db_session: AsyncSession) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    await product_with_references(
        client, "Abaya", [amina], [{"title": "Walk", "link": "https://example.com/"}]
    )
    await log_in(client, "amina@example.com")
    [walk] = (await listing(client))["items"]
    assert await favorite(client, walk["id"]) == 204

    await db_session.execute(update(Deliverable).values(assignee_id=None))
    body = await listing(client, scope="favorites")
    assert body["items"] == []
    assert body["counts"] == {"all": 0, "mine": 0, "favorites": 0}


async def test_list_rejects_unknown_scope(client: AsyncClient) -> None:
    response = await client.get("/api/references", params={"scope": "recent"})
    assert response.status_code == 422


# --- Свои референсы ---


async def add_reference(client: AsyncClient, **body: Any) -> dict[str, Any]:
    response = await client.post("/api/references", json=body)
    assert response.status_code == 201, response.text
    created: dict[str, Any] = response.json()
    return created


async def product_options(client: AsyncClient) -> dict[str, str]:
    response = await client.get("/api/products/options")
    assert response.status_code == 200, response.text
    return {option["name"]: option["id"] for option in response.json()}


async def test_art_director_adds_own_reference_to_an_assigned_product(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    odina = await art_director(client, db_session, "odina@example.com", "Odina")
    await product_with_references(client, "Abaya", [amina, odina], [])
    await log_in(client, "amina@example.com")
    abaya = (await product_options(client))["Abaya"]
    files = [await upload(client, image_bytes()), await upload(client, MP4)]

    created = await add_reference(
        client,
        title="Linen inspiration",
        type="moodboard",
        file_ids=[f["id"] for f in files],
        product_id=abaya,
        collection="Summer 26",
        tags=["linen"],
        notes="Soft light",
        favorite=True,
    )
    assert created["author"] == "Amina"
    assert created["product_id"] == abaya
    assert created["collection"] == "Summer 26"
    assert created["favorite"] is True
    assert [f["id"] for f in created["files"]] == [f["id"] for f in files]

    [listed] = (await listing(client, scope="favorites"))["items"]
    assert listed["id"] == created["id"]
    # Референс продукта виден всем, кто на нём работает; избранное — только автору.
    await log_in(client, "odina@example.com")
    [seen] = (await listing(client))["items"]
    assert seen["id"] == created["id"]
    assert seen["favorite"] is False


async def test_mine_tab_lists_only_own_references_with_tab_counts(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    await product_with_references(
        client, "Abaya", [amina], [{"title": "Brand", "link": "https://example.com/brand"}]
    )
    await log_in(client, "amina@example.com")
    abaya = (await product_options(client))["Abaya"]
    await add_reference(client, title="Walk", link="https://example.com/1", tags=["street"])
    await add_reference(client, title="Drape", link="https://example.com/2", product_id=abaya)

    body = await listing(client, scope="mine")
    assert {i["title"] for i in body["items"]} == {"Walk", "Drape"}
    assert body["total"] == 2
    assert body["counts"] == {"all": 3, "mine": 2, "favorites": 0}

    # Поиск и фильтры общие со всеми вкладками.
    body = await listing(client, scope="mine", tag="street")
    assert [i["title"] for i in body["items"]] == ["Walk"]
    assert body["counts"] == {"all": 1, "mine": 1, "favorites": 0}


async def test_reference_without_product_is_visible_only_to_its_author(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await art_director(client, db_session, "amina@example.com", "Amina")
    await art_director(client, db_session, "odina@example.com", "Odina")
    await sign_up(client, db_session, "creator@example.com", Role.CREATOR, "Kai")
    await log_in(client, "amina@example.com")
    created = await add_reference(client, link="https://www.instagram.com/p/abc/")
    assert created["product_id"] is None
    assert created["favorite"] is False
    assert [i["id"] for i in (await listing(client))["items"]] == [created["id"]]

    await log_in(client, "odina@example.com")
    assert await listing(client) == EMPTY

    # Креатор тоже ведёт свои референсы.
    await log_in(client, "creator@example.com")
    own = await add_reference(client, link="https://example.com/")
    assert [i["id"] for i in (await listing(client))["items"]] == [own["id"]]


async def test_product_must_be_assigned_to_the_author(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    await art_director(client, db_session, "odina@example.com", "Odina")
    await product_with_references(client, "Abaya", [amina], [])
    await log_in(client, "amina@example.com")
    abaya = (await product_options(client))["Abaya"]

    await log_in(client, "odina@example.com")
    for product_id in (abaya, str(uuid.uuid4())):
        response = await client.post(
            "/api/references", json={"link": "https://example.com/", "product_id": product_id}
        )
        assert response.status_code == 422
        assert response.json()["detail"] == "Product not found"


async def test_own_reference_needs_own_unused_files_or_a_link(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await art_director(client, db_session, "amina@example.com", "Amina")
    brand_file = await upload(client, image_bytes())
    await log_in(client, "amina@example.com")

    for body in (
        {},
        {"link": "ftp://example.com/"},
        {"file_ids": [brand_file["id"]]},
        {"link": "https://example.com/", "collection": "x" * 101},
    ):
        assert (await client.post("/api/references", json=body)).status_code == 422

    file = await upload(client, image_bytes())
    await add_reference(client, file_ids=[file["id"]])
    response = await client.post("/api/references", json={"file_ids": [file["id"]]})
    assert response.json()["detail"] == "File is already used"


async def test_brand_cannot_add_references_to_the_pool(client: AsyncClient) -> None:
    response = await client.post("/api/references", json={"link": "https://example.com/"})
    assert response.status_code == 403


# --- Удаление ---


async def test_author_deletes_own_reference(client: AsyncClient, db_session: AsyncSession) -> None:
    await art_director(client, db_session, "amina@example.com", "Amina")
    await log_in(client, "amina@example.com")
    created = await add_reference(client, title="Walk", link="https://example.com/")
    assert await favorite(client, created["id"]) == 204

    response = await client.delete(f"/api/references/{created['id']}")
    assert response.status_code == 204
    assert await listing(client) == EMPTY
    assert (await client.delete(f"/api/references/{created['id']}")).status_code == 404


async def test_deleting_a_reference_deletes_its_files(
    client: AsyncClient, db_session: AsyncSession, storage: FakeStorage
) -> None:
    await art_director(client, db_session, "amina@example.com", "Amina")
    await log_in(client, "amina@example.com")
    kept = await upload(client, image_bytes())
    files = [await upload(client, image_bytes()), await upload(client, MP4)]
    created = await add_reference(client, file_ids=[f["id"] for f in files])
    assert len(storage.files) == 3

    assert (await client.delete(f"/api/references/{created['id']}")).status_code == 204
    # Остался только файл, который в референс не входил; его можно использовать дальше.
    assert len(storage.files) == 1
    reused = await add_reference(client, file_ids=[kept["id"]])
    assert [f["id"] for f in reused["files"]] == [kept["id"]]


async def test_only_the_author_deletes_a_reference(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    odina = await art_director(client, db_session, "odina@example.com", "Odina")
    await art_director(client, db_session, "zara@example.com", "Zara")
    await product_with_references(
        client, "Abaya", [amina, odina], [{"title": "Brand", "link": "https://example.com/b"}]
    )
    await log_in(client, "amina@example.com")
    abaya = (await product_options(client))["Abaya"]
    own = await add_reference(client, title="Walk", link="https://example.com/", product_id=abaya)
    brand = next(i for i in (await listing(client))["items"] if i["title"] == "Brand")

    # Чужой видимый — 403, в том числе референс бренда в продукте.
    assert (await client.delete(f"/api/references/{brand['id']}")).status_code == 403
    await log_in(client, "odina@example.com")
    assert (await client.delete(f"/api/references/{own['id']}")).status_code == 403
    # Невидимый — 404, как несуществующий.
    await log_in(client, "zara@example.com")
    assert (await client.delete(f"/api/references/{own['id']}")).status_code == 404

    await log_in(client, "amina@example.com")
    assert {i["title"] for i in (await listing(client))["items"]} == {"Walk", "Brand"}
