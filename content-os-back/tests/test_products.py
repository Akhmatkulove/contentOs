import uuid
from collections.abc import AsyncIterator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, Status, User
from app.core.config import Settings
from app.core.db import get_session
from app.core.storage import get_storage
from app.files.models import StoredFile
from app.main import create_app
from app.products.models import Product
from app.references.models import Reference
from app.team.models import BrandArtDirector
from tests.fakes import FakeStorage
from tests.test_files import MP4, image_bytes, upload


@pytest.fixture
def storage() -> FakeStorage:
    return FakeStorage()


async def sign_up(client: AsyncClient, db: AsyncSession, email: str, role: Role, name: str) -> None:
    client.cookies.clear()
    response = await client.post("/api/auth/signup", json={"email": email, "password": "password"})
    assert response.status_code == 201
    await db.execute(
        update(User).where(User.email == email).values(role=role, status=Status.APPROVED, name=name)
    )


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


def product(photo_ids: list[str], **fields: Any) -> dict[str, Any]:
    return {"name": "Linen shirt", "about": "Summer linen shirt", "photo_ids": photo_ids, **fields}


async def create(client: AsyncClient, body: dict[str, Any]) -> dict[str, Any]:
    response = await client.post("/api/products", json=body)
    assert response.status_code == 201, response.text
    created: dict[str, Any] = response.json()
    return created


async def test_creates_product_with_photos_in_order(client: AsyncClient) -> None:
    first = await upload(client, image_bytes())
    second = await upload(client, image_bytes("PNG"))

    body = await create(
        client,
        product(
            [second["id"], first["id"]],
            collection="  Summer 26 ",
            category="",
            sku="LS-01",
            tags=["linen", "summer", "linen"],
            notes="Iron before the shoot",
        ),
    )

    assert body["name"] == "Linen shirt"
    assert body["collection"] == "Summer 26"
    assert body["category"] is None
    assert body["status"] == "active"
    assert body["tags"] == ["linen", "summer"]
    assert [photo["id"] for photo in body["photos"]] == [second["id"], first["id"]]
    assert body["photos"][0]["url"].startswith("http://signed.test/files/")
    assert body["references"] == []


async def test_references_get_product_collection_and_brand_as_author(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    photo = await upload(client, image_bytes())
    image = await upload(client, image_bytes())
    video = await upload(client, MP4)

    body = await create(
        client,
        product(
            [photo["id"]],
            collection="Summer 26",
            references=[
                {
                    "title": "Beach light",
                    "type": "moodboard",
                    "file_ids": [image["id"], video["id"]],
                    "tags": ["light"],
                },
                {"link": "https://www.instagram.com/p/abc/", "notes": "Pose"},
            ],
        ),
    )

    # Новые первыми: созданный последним идёт первым, даже внутри одного запроса.
    link_ref, files_ref = body["references"]
    for reference in (files_ref, link_ref):
        assert reference["product_id"] == body["id"]
        assert reference["collection"] == "Summer 26"
        assert reference["author"] == "Acme"
    assert [file["kind"] for file in files_ref["files"]] == ["image", "video"]
    assert files_ref["type"] == "moodboard"
    assert link_ref["link"] == "https://www.instagram.com/p/abc/"
    assert link_ref["files"] == []
    # В общем пуле: референсы — отдельные записи, а не часть продукта.
    assert await db_session.scalar(select(func.count()).select_from(Reference)) == 2


@pytest.mark.parametrize(
    "reference",
    [
        {"title": "Nothing attached"},
        {"link": "https://example.com/post", "file_ids": ["FILE"]},
        {"link": "javascript:alert(1)"},
        {"link": "ftp://example.com/post"},
    ],
)
async def test_reference_needs_files_or_http_link(
    client: AsyncClient, reference: dict[str, Any]
) -> None:
    photo = await upload(client, image_bytes())
    extra = await upload(client, image_bytes())
    reference = {k: [extra["id"]] if v == ["FILE"] else v for k, v in reference.items()}

    response = await client.post(
        "/api/products", json=product([photo["id"]], references=[reference])
    )

    assert response.status_code == 422


async def test_product_needs_name_about_and_a_photo(client: AsyncClient) -> None:
    photo = await upload(client, image_bytes())

    for body in (
        product([]),
        product([photo["id"]], name="   "),
        product([photo["id"]], about=""),
    ):
        assert (await client.post("/api/products", json=body)).status_code == 422


async def test_video_cannot_be_a_product_photo(client: AsyncClient) -> None:
    video = await upload(client, MP4)

    response = await client.post("/api/products", json=product([video["id"]]))

    assert response.status_code == 422


async def test_file_is_used_once(client: AsyncClient) -> None:
    photo = await upload(client, image_bytes())

    same_request = product([photo["id"]], references=[{"file_ids": [photo["id"]]}])
    assert (await client.post("/api/products", json=same_request)).status_code == 422

    await create(client, product([photo["id"]]))
    assert (await client.post("/api/products", json=product([photo["id"]]))).status_code == 422


async def test_cannot_use_someone_elses_file(client: AsyncClient, db_session: AsyncSession) -> None:
    photo = await upload(client, image_bytes())
    await sign_up(client, db_session, "other@example.com", Role.BRAND, "Other")

    response = await client.post("/api/products", json=product([photo["id"]]))
    unknown = await client.post("/api/products", json=product([str(uuid.uuid4())]))

    assert response.status_code == 422
    assert response.json() == unknown.json()


async def test_failed_request_creates_nothing(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    photo = await upload(client, image_bytes())

    response = await client.post(
        "/api/products",
        json=product([photo["id"]], references=[{"file_ids": [str(uuid.uuid4())]}]),
    )

    assert response.status_code == 422
    assert await db_session.scalar(select(func.count()).select_from(Product)) == 0


@pytest.mark.parametrize("role", [Role.ART_DIRECTOR, Role.CREATOR])
async def test_only_brands_create_products(
    client: AsyncClient, db_session: AsyncSession, role: Role
) -> None:
    await sign_up(client, db_session, "member@example.com", role, "Member")
    photo = await upload(client, image_bytes())

    response = await client.post("/api/products", json=product([photo["id"]]))

    assert response.status_code == 403


# --- Список ---


async def make_products(client: AsyncClient, *names: str, **fields: Any) -> list[str]:
    ids = []
    for name in names:
        photo = await upload(client, image_bytes())
        ids.append((await create(client, product([photo["id"]], name=name, **fields)))["id"])
    return ids


async def listing(client: AsyncClient, **params: Any) -> dict[str, Any]:
    response = await client.get("/api/products", params=params)
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


async def test_lists_own_products_with_cover_photo(client: AsyncClient) -> None:
    first = await upload(client, image_bytes())
    second = await upload(client, image_bytes())
    created = await create(
        client, product([first["id"], second["id"]], collection="Summer 26", sku="LS-01")
    )

    body = await listing(client)

    assert body["total"] == 1
    [item] = body["items"]
    assert item["id"] == created["id"]
    assert item["collection"] == "Summer 26"
    assert item["sku"] == "LS-01"
    assert item["status"] == "active"
    assert item["photo"]["id"] == first["id"]
    assert item["photo"]["url"].startswith("http://signed.test/files/")


async def test_pages_through_products(client: AsyncClient) -> None:
    await make_products(client, "A", "B", "C")

    first = await listing(client, per_page=2)
    second = await listing(client, per_page=2, page=2)

    assert first["total"] == second["total"] == 3
    assert len(first["items"]) == 2
    assert len(second["items"]) == 1
    names = {item["name"] for item in first["items"] + second["items"]}
    assert names == {"A", "B", "C"}


async def test_search_matches_name_sku_and_collection_literally(client: AsyncClient) -> None:
    await make_products(client, "Linen shirt", sku="LS-01")
    await make_products(client, "Silk dress", collection="Autumn")
    await make_products(client, "100% wool")

    async def found(search: str) -> set[str]:
        return {item["name"] for item in (await listing(client, search=search))["items"]}

    assert await found("LINEN") == {"Linen shirt"}
    assert await found("ls-0") == {"Linen shirt"}
    assert await found("autumn") == {"Silk dress"}
    # % ищется как символ, а не как «что угодно».
    assert await found("%") == {"100% wool"}
    assert (await listing(client, search="nothing"))["total"] == 0


async def test_filters_by_collection_and_status_and_sorts(client: AsyncClient) -> None:
    _, silk, _ = await make_products(client, "Linen", "Silk", "Wool", collection="Summer")
    await make_products(client, "abaya", collection="autumn")
    await make_products(client, "Plain")
    current = await detail(client, silk)
    await client.patch(f"/api/products/{current['id']}", json={"status": "archived"})

    async def names(**params: Any) -> list[str]:
        return [item["name"] for item in (await listing(client, **params))["items"]]

    assert await names(collection="Summer") == ["Wool", "Silk", "Linen"]
    assert await names(collection="summer") == []
    assert await names(collection="Summer", status="active", sort="oldest") == ["Linen", "Wool"]
    assert await names(status="archived") == ["Silk"]
    assert await names(sort="name_asc") == ["abaya", "Linen", "Plain", "Silk", "Wool"]
    assert await names(sort="name_desc", per_page=2) == ["Wool", "Silk"]
    assert (await client.get("/api/products", params={"sort": "price"})).status_code == 422

    filters = (await client.get("/api/products/filters")).json()
    assert filters == {"collections": ["autumn", "Summer"]}


async def test_brand_sees_only_own_products(client: AsyncClient, db_session: AsyncSession) -> None:
    await make_products(client, "Mine")
    await sign_up(client, db_session, "other@example.com", Role.BRAND, "Other")

    assert await listing(client) == {"items": [], "total": 0}


@pytest.mark.parametrize("role", [Role.ART_DIRECTOR, Role.CREATOR])
async def test_team_sees_nothing_until_assigned(
    client: AsyncClient, db_session: AsyncSession, role: Role
) -> None:
    await make_products(client, "Brand product")
    await sign_up(client, db_session, "member@example.com", role, "Member")

    assert await listing(client) == {"items": [], "total": 0}


async def test_options_list_every_visible_product_by_name(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await make_products(client, "Silk dress", "Abaya")
    response = await client.get("/api/products/options")
    assert response.status_code == 200
    assert [option["name"] for option in response.json()] == ["Abaya", "Silk dress"]
    assert set(response.json()[0]) == {"id", "name"}

    await sign_up(client, db_session, "other@example.com", Role.BRAND, "Other")
    assert (await client.get("/api/products/options")).json() == []


async def test_list_rejects_bad_paging(client: AsyncClient) -> None:
    for params in ({"page": 0}, {"per_page": 51}, {"search": "x" * 101}):
        assert (await client.get("/api/products", params=params)).status_code == 422


# --- Deliverables ---


async def log_in(client: AsyncClient, email: str) -> None:
    client.cookies.clear()
    response = await client.post("/api/auth/login", json={"email": email, "password": "password"})
    assert response.status_code == 200


async def user_id(db: AsyncSession, email: str) -> uuid.UUID:
    found = await db.scalar(select(User.id).where(User.email == email))
    assert found is not None
    return found


async def art_director(
    client: AsyncClient, db: AsyncSession, email: str, name: str, brand: str = "brand@example.com"
) -> str:
    """Арт-директор в связке с брендом; клиент снова входит брендом."""
    await sign_up(client, db, email, Role.ART_DIRECTOR, name)
    db.add(
        BrandArtDirector(
            brand_id=await user_id(db, brand), art_director_id=await user_id(db, email)
        )
    )
    await db.flush()
    await log_in(client, brand)
    return str(await user_id(db, email))


def deliverable(assignee_id: str, **fields: Any) -> dict[str, Any]:
    return {"name": "Walking transition", "type": "video", "assignee_id": assignee_id, **fields}


async def test_creates_deliverables_in_order(client: AsyncClient, db_session: AsyncSession) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    photo = await upload(client, image_bytes())

    body = await create(
        client,
        product(
            [photo["id"]],
            deliverables=[
                deliverable(amina, due_date="2024-09-18", brief="  Slow walk "),
                deliverable(amina, name=" Fabric close-up ", type="image", brief=""),
            ],
        ),
    )

    # Not in any shoot yet: to shoot (docs/adr/0018).
    assert [
        tuple(d[key] for key in ("name", "type", "status", "shoots", "due_date", "brief"))
        for d in body["deliverables"]
    ] == [
        ("Walking transition", "video", "to_shoot", 0, "2024-09-18", "Slow walk"),
        ("Fabric close-up", "image", "to_shoot", 0, None, None),
    ]
    assert [d["assignee"]["id"] for d in body["deliverables"]] == [amina, amina]


async def test_deliverable_needs_name_type_and_assignee(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    photo = await upload(client, image_bytes())
    for draft in (
        {"name": "Walk", "type": "video"},
        {"name": " ", "type": "video", "assignee_id": amina},
        {"name": "Walk", "assignee_id": amina},
        {"name": "Walk", "type": "audio", "assignee_id": amina},
    ):
        response = await client.post(
            "/api/products", json=product([photo["id"]], deliverables=[draft])
        )
        assert response.status_code == 422


async def test_assignee_must_be_the_brands_art_director(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await art_director(client, db_session, "own@example.com", "Own")
    await sign_up(client, db_session, "rival@example.com", Role.BRAND, "Rival")
    rivals = await art_director(
        client, db_session, "rivals@example.com", "Rival's", brand="rival@example.com"
    )
    await sign_up(client, db_session, "creator@example.com", Role.CREATOR, "Creator")
    creator = str(await user_id(db_session, "creator@example.com"))
    await log_in(client, "brand@example.com")
    photo = await upload(client, image_bytes())

    for assignee in (rivals, creator, str(uuid.uuid4())):
        response = await client.post(
            "/api/products", json=product([photo["id"]], deliverables=[deliverable(assignee)])
        )
        assert response.status_code == 422
        assert response.json()["detail"] == "Assignee is not the brand's art director"
    assert await db_session.scalar(select(func.count()).select_from(Product)) == 0


async def test_unapproved_art_director_cannot_be_assigned(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    await db_session.execute(
        update(User).where(User.email == "amina@example.com").values(status=Status.REJECTED)
    )
    photo = await upload(client, image_bytes())

    response = await client.post(
        "/api/products", json=product([photo["id"]], deliverables=[deliverable(amina)])
    )

    assert response.status_code == 422


async def test_art_director_sees_products_with_their_deliverables(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    odina = await art_director(client, db_session, "odina@example.com", "Odina")
    for name, assignees in (("Abaya", [amina, odina]), ("Hijab", [odina]), ("Plain", [])):
        photo = await upload(client, image_bytes())
        await create(
            client,
            product([photo["id"]], name=name, deliverables=[deliverable(a) for a in assignees]),
        )

    await log_in(client, "amina@example.com")
    assert [item["name"] for item in (await listing(client))["items"]] == ["Abaya"]
    await log_in(client, "odina@example.com")
    body = await listing(client, search="hij")
    assert [item["name"] for item in body["items"]] == ["Hijab"]
    assert (await listing(client))["total"] == 2


# --- Страница продукта ---


async def detail(client: AsyncClient, product_id: str) -> dict[str, Any]:
    response = await client.get(f"/api/products/{product_id}")
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


async def test_owner_gets_the_whole_product(client: AsyncClient, db_session: AsyncSession) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    photos = [await upload(client, image_bytes()) for _ in range(2)]
    image = await upload(client, image_bytes())
    created = await create(
        client,
        product(
            [photo["id"] for photo in photos],
            references=[{"title": "Light", "file_ids": [image["id"]]}],
            deliverables=[deliverable(amina, name="Walk"), deliverable(amina, name="Close-up")],
        ),
    )

    body = await detail(client, created["id"])

    assert body == created
    assert body["can_edit"] is True
    assert [photo["id"] for photo in body["photos"]] == [photo["id"] for photo in photos]
    assert [reference["title"] for reference in body["references"]] == ["Light"]
    assert body["references"][0]["author_id"] == str(await user_id(db_session, "brand@example.com"))
    assert [d["name"] for d in body["deliverables"]] == ["Walk", "Close-up"]
    assert body["deliverables"][0]["assignee"] == {"id": amina, "name": "Amina", "photo_url": None}


async def test_assigned_art_director_sees_product_but_cannot_edit(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    photo = await upload(client, image_bytes())
    product_id = (await create(client, product([photo["id"]], deliverables=[deliverable(amina)])))[
        "id"
    ]
    # Свой референс арт-директора в этом продукте тоже на странице.
    await log_in(client, "amina@example.com")
    response = await client.post(
        "/api/references", json={"link": "https://example.com/p", "product_id": product_id}
    )
    assert response.status_code == 201

    body = await detail(client, product_id)

    assert body["can_edit"] is False
    assert [reference["author"] for reference in body["references"]] == ["Amina"]
    assert (await client.put(f"/api/products/{product_id}", json={})).status_code == 403


async def test_product_is_hidden_from_everyone_else(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await art_director(client, db_session, "amina@example.com", "Amina")
    product_id = (await make_products(client, "Abaya"))[0]

    await sign_up(client, db_session, "rival@example.com", Role.BRAND, "Rival")
    assert (await client.get(f"/api/products/{product_id}")).status_code == 404
    await log_in(client, "amina@example.com")
    assert (await client.get(f"/api/products/{product_id}")).status_code == 404
    await log_in(client, "brand@example.com")
    assert (await client.get(f"/api/products/{uuid.uuid4()}")).status_code == 404


# --- Редактирование ---


def edit_body(current: dict[str, Any], **changes: Any) -> dict[str, Any]:
    """Форма редактирования без изменений: всё сохранённое остаётся."""
    return {
        **{field: current[field] for field in ("name", "about", "notes", "collection")},
        **{field: current[field] for field in ("category", "sku", "status", "tags")},
        "photo_ids": [photo["id"] for photo in current["photos"]],
        "reference_ids": [reference["id"] for reference in current["references"]],
        "deliverable_ids": [d["id"] for d in current["deliverables"]],
        **changes,
    }


async def edit(client: AsyncClient, product_id: str, body: dict[str, Any]) -> dict[str, Any]:
    response = await client.put(f"/api/products/{product_id}", json=body)
    assert response.status_code == 200, response.text
    edited: dict[str, Any] = response.json()
    return edited


async def test_edits_fields_and_photos(client: AsyncClient, storage: FakeStorage) -> None:
    first, second = [await upload(client, image_bytes()) for _ in range(2)]
    current = await create(client, product([first["id"], second["id"]]))
    added = await upload(client, image_bytes())

    body = await edit(
        client,
        current["id"],
        edit_body(
            current,
            name=" Linen shirt v2 ",
            sku="",
            tags=["linen"],
            status="archived",
            photo_ids=[added["id"], second["id"]],
        ),
    )

    assert (body["name"], body["sku"], body["tags"], body["status"]) == (
        "Linen shirt v2",
        None,
        ["linen"],
        "archived",
    )
    assert [photo["id"] for photo in body["photos"]] == [added["id"], second["id"]]
    assert await detail(client, current["id"]) == body
    # Убранное фото удалено вместе с файлом.
    assert len(storage.files) == 2
    response = await client.post("/api/products", json=product([first["id"]], name="Other"))
    assert (response.status_code, response.json()["detail"]) == (422, "Unknown file")


async def test_edits_references(
    client: AsyncClient, db_session: AsyncSession, storage: FakeStorage
) -> None:
    removed_file = await upload(client, image_bytes())
    current = await create(
        client,
        product(
            [(await upload(client, image_bytes()))["id"]],
            collection="Summer 26",
            references=[
                {"link": "https://example.com/a"},
                {"title": "Removed", "file_ids": [removed_file["id"]]},
            ],
        ),
    )
    kept = next(r for r in current["references"] if r["link"] == "https://example.com/a")
    image = await upload(client, image_bytes())

    body = await edit(
        client,
        current["id"],
        edit_body(
            current,
            reference_ids=[kept["id"]],
            references=[{"title": "New", "file_ids": [image["id"]]}],
        ),
    )

    assert {r["link"] or r["title"] for r in body["references"]} == {"https://example.com/a", "New"}
    assert all(r["collection"] == "Summer 26" for r in body["references"])
    # Убранный референс удалён вместе с файлами, а не отвязан: без продукта его никто
    # бы не увидел.
    assert await db_session.scalar(select(func.count()).select_from(Reference)) == 2
    assert await db_session.scalar(select(func.count()).select_from(StoredFile)) == 2
    assert len(storage.files) == 2


async def test_brand_cannot_remove_art_directors_references(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    photo = await upload(client, image_bytes())
    current = await create(client, product([photo["id"]], deliverables=[deliverable(amina)]))
    await log_in(client, "amina@example.com")
    response = await client.post(
        "/api/references", json={"link": "https://example.com/p", "product_id": current["id"]}
    )
    theirs = response.json()["id"]
    await log_in(client, "brand@example.com")

    response = await client.put(
        f"/api/products/{current['id']}", json=edit_body(current, reference_ids=[theirs])
    )
    assert response.status_code == 422
    assert response.json()["detail"] == "Unknown reference"

    # Форма не перечисляет чужие референсы, и они остаются.
    body = await edit(client, current["id"], edit_body(current))
    assert [r["id"] for r in body["references"]] == [theirs]


async def test_edits_deliverables(client: AsyncClient, db_session: AsyncSession) -> None:
    amina = await art_director(client, db_session, "amina@example.com", "Amina")
    odina = await art_director(client, db_session, "odina@example.com", "Odina")
    photo = await upload(client, image_bytes())
    current = await create(
        client,
        product(
            [photo["id"]],
            deliverables=[
                deliverable(amina, name="Walk"),
                deliverable(odina, name="Turn"),
                deliverable(amina, name="Close-up"),
            ],
        ),
    )
    walk, turn, close_up = (d["id"] for d in current["deliverables"])

    body = await edit(
        client,
        current["id"],
        edit_body(
            current,
            deliverable_ids=[close_up, walk],
            deliverables=[deliverable(amina, name="Story")],
        ),
    )

    assert [d["name"] for d in body["deliverables"]] == ["Close-up", "Walk", "Story"]
    assert turn not in {d["id"] for d in body["deliverables"]}
    # Без deliverables Одина больше не видит продукт.
    await log_in(client, "odina@example.com")
    assert (await client.get(f"/api/products/{current['id']}")).status_code == 404


@pytest.mark.parametrize(
    ("changes", "detail"),
    [
        ({"deliverable_ids": ["UNKNOWN"]}, "Unknown deliverable"),
        ({"reference_ids": ["UNKNOWN"]}, "Unknown reference"),
        ({"photo_ids": ["VIDEO"]}, "Product photos must be images"),
        ({"deliverables": [{"name": "Walk", "assignee_id": "UNKNOWN"}]}, None),
    ],
)
async def test_invalid_edit_changes_nothing(
    client: AsyncClient, changes: dict[str, Any], detail: str | None
) -> None:
    current = await create(client, product([(await upload(client, image_bytes()))["id"]]))
    video = await upload(client, MP4)
    swap = {"UNKNOWN": str(uuid.uuid4()), "VIDEO": video["id"]}

    def resolve(value: Any) -> Any:
        if isinstance(value, list):
            return [resolve(item) for item in value]
        if isinstance(value, dict):
            return {key: resolve(item) for key, item in value.items()}
        return swap.get(value, value)

    response = await client.put(
        f"/api/products/{current['id']}",
        json=edit_body(current, name="Changed", **resolve(changes)),
    )

    assert response.status_code == 422
    if detail:
        assert response.json()["detail"] == detail
    assert (await client.get(f"/api/products/{current['id']}")).json()["name"] == "Linen shirt"


async def test_only_owner_edits(client: AsyncClient, db_session: AsyncSession) -> None:
    current = await create(client, product([(await upload(client, image_bytes()))["id"]]))
    await sign_up(client, db_session, "rival@example.com", Role.BRAND, "Rival")
    photo = await upload(client, image_bytes())

    response = await client.put(
        f"/api/products/{current['id']}", json=edit_body(current, photo_ids=[photo["id"]])
    )

    assert response.status_code == 404


async def test_product_limits_count_saved_items(client: AsyncClient) -> None:
    current = await create(client, product([(await upload(client, image_bytes()))["id"]]))
    body = edit_body(
        current,
        reference_ids=[str(uuid.uuid4()) for _ in range(40)],
        references=[{"link": f"https://example.com/{i}"} for i in range(11)],
    )

    response = await client.put(f"/api/products/{current['id']}", json=body)

    assert response.status_code == 422


async def test_owner_archives_and_restores(client: AsyncClient, db_session: AsyncSession) -> None:
    current = await create(client, product([(await upload(client, image_bytes()))["id"]]))
    url = f"/api/products/{current['id']}"

    archived = await client.patch(url, json={"status": "archived"})
    assert archived.status_code == 200
    assert archived.json() == {**current, "status": "archived"}
    restored = await client.patch(url, json={"status": "active"})
    assert restored.json()["status"] == "active"

    assert (await client.patch(url, json={"status": "deleted"})).status_code == 422
    await sign_up(client, db_session, "rival@example.com", Role.BRAND, "Rival")
    assert (await client.patch(url, json={"status": "archived"})).status_code == 404
