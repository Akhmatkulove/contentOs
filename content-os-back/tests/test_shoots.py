import uuid
from collections.abc import AsyncIterator
from datetime import date, timedelta
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role
from app.core.config import Settings
from app.core.db import get_session
from app.core.storage import get_storage
from app.deliverables.models import Deliverable, DeliverableStatus
from app.main import create_app
from app.shoots.models import Shoot, ShootDeliverable
from tests.fakes import FakeStorage
from tests.test_files import image_bytes, upload
from tests.test_products import (
    art_director,
    create,
    deliverable,
    edit,
    edit_body,
    log_in,
    product,
    sign_up,
    user_id,
)
from tests.test_team import add_creator

FUTURE = (date.today() + timedelta(days=30)).isoformat()
PAST = (date.today() - timedelta(days=30)).isoformat()


@pytest.fixture
async def client(settings: Settings, db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    """Бренд «Acme» с продуктом «Abaya» для арт-директора Amina; у Amina креаторы Lana и Odina.

    Клиент входит арт-директором Amina.
    """
    storage = FakeStorage()
    app = create_app(settings)
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[get_storage] = lambda: storage
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await sign_up(client, db_session, "brand@example.com", Role.BRAND, "Acme")
        amina = await art_director(client, db_session, "amina@example.com", "Amina")
        for name in ("Abaya", "Dress"):
            photo = await upload(client, image_bytes())
            await create(
                client, product([photo["id"]], name=name, deliverables=[deliverable(amina)])
            )
        for email, name in (("lana@example.com", "Lana"), ("odina@example.com", "Odina")):
            await sign_up(client, db_session, email, Role.CREATOR, name)
            await add_creator(db_session, "amina@example.com", email)
        await log_in(client, "amina@example.com")
        yield client


async def products(client: AsyncClient) -> dict[str, str]:
    response = await client.get("/api/products/options")
    assert response.status_code == 200
    return {item["name"]: item["id"] for item in response.json()}


async def product_deliverables(client: AsyncClient) -> dict[str, str]:
    """Заказ Amina в каждом продукте: название продукта → id deliverable продукта."""
    names = {id_: name for name, id_ in (await products(client)).items()}
    response = await client.get("/api/shoots/product-deliverables")
    assert response.status_code == 200, response.text
    return {names[item["product_id"]]: item["id"] for item in response.json()}


async def creators(client: AsyncClient) -> dict[str, str]:
    response = await client.get("/api/team/creators")
    assert response.status_code == 200
    return {item["name"]: item["id"] for item in response.json()}


async def shoot(client: AsyncClient, **fields: Any) -> dict[str, Any]:
    """Тело запроса: Lana — креатор, Odina — мобилограф, один deliverable на Abaya для Lana."""
    abaya = (await products(client))["Abaya"]
    ordered = (await product_deliverables(client))["Abaya"]
    team = await creators(client)
    return {
        "name": "Shoot 04 — Autumn Drop",
        "date": FUTURE,
        "start_time": "10:00",
        "duration_minutes": 120,
        "location": "Tashkent Studio",
        "creator_ids": [team["Lana"]],
        "mobilographer_ids": [team["Odina"]],
        "product_ids": [abaya],
        "deliverables": [
            {
                "name": "Walking transition",
                "type": "video",
                "product_id": abaya,
                "product_deliverable_id": ordered,
                "assignee_ids": [team["Lana"]],
            }
        ],
        **fields,
    }


async def post(client: AsyncClient, body: dict[str, Any]) -> dict[str, Any]:
    response = await client.post("/api/shoots", json=body)
    assert response.status_code == 201, response.text
    created: dict[str, Any] = response.json()
    return created


async def listing(client: AsyncClient, **params: Any) -> dict[str, Any]:
    response = await client.get("/api/shoots", params=params)
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


async def test_creates_shoot_with_team_and_progress(client: AsyncClient) -> None:
    created = await post(client, await shoot(client))

    assert created["name"] == "Shoot 04 — Autumn Drop"
    assert created["status"] == "upcoming"
    assert created["location"] == "Tashkent Studio"
    assert created["start_time"] == "10:00:00"
    assert (created["products"], created["deliverables"], created["approved"]) == (1, 1, 0)
    assert [member["name"] for member in created["team"]] == ["Amina", "Lana", "Odina"]
    assert created["photo"]["url"]
    assert (await listing(client))["items"] == [created]


async def test_team_sees_the_shoot_and_others_do_not(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    created = await post(client, await shoot(client))
    await sign_up(client, db_session, "other@example.com", Role.CREATOR, "Other")
    await add_creator(db_session, "amina@example.com", "other@example.com")
    await sign_up(client, db_session, "ad2@example.com", Role.ART_DIRECTOR, "Risolat")

    for email in ("lana@example.com", "odina@example.com"):
        await log_in(client, email)
        assert [item["id"] for item in (await listing(client))["items"]] == [created["id"]]
    for email in ("other@example.com", "ad2@example.com", "brand@example.com"):
        await log_in(client, email)
        assert (await listing(client))["total"] == 0


async def test_only_art_directors_create_shoots(client: AsyncClient) -> None:
    body = await shoot(client)
    for email in ("lana@example.com", "brand@example.com"):
        await log_in(client, email)
        assert (await client.post("/api/shoots", json=body)).status_code == 403


async def test_a_shoot_needs_a_product_and_a_deliverable(client: AsyncClient) -> None:
    fields: dict[str, Any]
    for fields in ({"deliverables": []}, {"product_ids": [], "deliverables": []}):
        response = await client.post("/api/shoots", json=await shoot(client, **fields))
        assert response.status_code == 422


async def test_deliverables_pick_from_the_shoot(client: AsyncClient) -> None:
    dress = (await products(client))["Dress"]
    team = await creators(client)
    body = await shoot(client)
    walk = body["deliverables"][0]
    for change in (
        {"product_id": dress},
        {"assignee_ids": [team["Odina"], team["Odina"]]},
        {"reference_ids": ["00000000-0000-0000-0000-000000000000"]},
        {"type": "audio"},
    ):
        body["deliverables"] = [{**walk, **change}]
        assert (await client.post("/api/shoots", json=body)).status_code == 422
    # The mobilographer is in the team too.
    body["deliverables"] = [{**walk, "assignee_ids": [team["Odina"]]}]
    await post(client, body)


async def test_rejects_what_the_art_director_does_not_have(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    # A creator outside Amina's team and the brand's product without her deliverable.
    await sign_up(client, db_session, "stranger@example.com", Role.CREATOR, "Stranger")
    stranger = str(await user_id(db_session, "stranger@example.com"))
    await log_in(client, "brand@example.com")
    photo = await upload(client, image_bytes())
    foreign = (await create(client, product([photo["id"]], name="Foreign")))["id"]
    await log_in(client, "amina@example.com")

    body = await shoot(client)
    fields: dict[str, Any]
    for fields in (
        {"creator_ids": [stranger]},
        {"mobilographer_ids": [stranger]},
        {"product_ids": [*body["product_ids"], foreign]},
        {"reference_ids": ["00000000-0000-0000-0000-000000000000"]},
    ):
        response = await client.post("/api/shoots", json={**body, **fields})
        assert response.status_code == 422, fields
    assert await db_session.scalar(select(func.count()).select_from(Shoot)) == 0


async def test_archived_products_stay_out_of_new_shoots(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    named = await products(client)
    body = await shoot(client)
    created = await post(client, body)
    await log_in(client, "brand@example.com")
    for name in ("Abaya", "Dress"):
        archived = await client.patch(f"/api/products/{named[name]}", json={"status": "archived"})
        assert archived.status_code == 200
    await log_in(client, "amina@example.com")

    response = await client.post("/api/shoots", json=body)
    assert (response.status_code, response.json()["detail"]) == (422, "Product is archived")
    # A shoot keeps the product it already has, but can't take another archived one.
    url = f"/api/shoots/{created['id']}"
    assert (await client.put(url, json={**body, "name": "Renamed"})).status_code == 200
    with_dress = {**body, "product_ids": [*body["product_ids"], named["Dress"]]}
    assert (await client.put(url, json=with_dress)).status_code == 422


async def test_status_follows_date_and_deliverables(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    created = await post(client, await shoot(client, date=PAST))
    assert created["status"] == "to_shoot"

    async def status_after(value: DeliverableStatus) -> str:
        await db_session.execute(update(ShootDeliverable).values(status=value))
        items = (await listing(client))["items"]
        return str(items[0]["status"])

    assert await status_after(DeliverableStatus.IN_PROGRESS) == "in_progress"
    assert await status_after(DeliverableStatus.NEEDS_REVIEW) == "needs_review"
    assert await status_after(DeliverableStatus.NEEDS_CHANGES) == "in_progress"
    assert await status_after(DeliverableStatus.APPROVED) == "completed"
    assert (await listing(client))["items"][0]["approved"] == 1


async def test_searches_filters_and_counts(client: AsyncClient) -> None:
    dress = (await products(client))["Dress"]
    ordered = (await product_deliverables(client))["Dress"]
    await post(client, await shoot(client, name="Autumn", location="White Studio"))
    await post(
        client,
        await shoot(
            client,
            name="Summer",
            date=PAST,
            product_ids=[dress],
            deliverables=[
                {
                    "name": "Close-up",
                    "type": "video",
                    "product_id": dress,
                    "product_deliverable_id": ordered,
                }
            ],
        ),
    )

    everything = await listing(client)
    assert [item["name"] for item in everything["items"]] == ["Autumn", "Summer"]
    assert everything["counts"] == {
        "all": 2,
        "upcoming": 1,
        "to_shoot": 1,
        "in_progress": 0,
        "needs_review": 0,
        "completed": 0,
    }
    assert [i["name"] for i in (await listing(client, sort="oldest"))["items"]] == [
        "Summer",
        "Autumn",
    ]

    upcoming = await listing(client, status="upcoming")
    assert ([i["name"] for i in upcoming["items"]], upcoming["total"]) == (["Autumn"], 1)
    # Counts ignore the picked status: they size the tabs.
    assert upcoming["counts"]["all"] == 2

    assert [i["name"] for i in (await listing(client, search="dre"))["items"]] == ["Summer"]
    assert [i["name"] for i in (await listing(client, search="white"))["items"]] == ["Autumn"]
    assert (await listing(client, period="last_3_months"))["total"] == 2


# --- Shoot page and editing ---


async def test_shoot_page_shows_team_products_and_deliverables(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    created = await post(client, await shoot(client))

    page = (await client.get(f"/api/shoots/{created['id']}")).json()
    assert page["can_edit"] is True
    assert page["art_director"]["name"] == "Amina"
    assert [m["name"] for m in page["creators"]] == ["Lana"]
    assert [m["name"] for m in page["mobilographers"]] == ["Odina"]
    [abaya] = page["products"]
    assert abaya["name"] == "Abaya"
    assert abaya["photo"]["url"]
    assert abaya["deliverables"] == {
        "total": 1,
        "to_shoot": 1,
        "in_progress": 0,
        "needs_review": 0,
        "needs_changes": 0,
        "approved": 0,
    }
    [walk] = page["deliverables"]
    assert (walk["name"], walk["type"]) == ("Walking transition", "video")
    assert walk["product_id"] == abaya["id"]
    assert [a["name"] for a in walk["assignees"]] == ["Lana"]

    # The team sees it but can't edit; others get 404.
    await log_in(client, "lana@example.com")
    response = await client.get(f"/api/shoots/{created['id']}")
    assert response.status_code == 200
    assert response.json()["can_edit"] is False
    await sign_up(client, db_session, "ad2@example.com", Role.ART_DIRECTOR, "Risolat")
    assert (await client.get(f"/api/shoots/{created['id']}")).status_code == 404


async def test_a_shoot_takes_several_mobilographers(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await sign_up(client, db_session, "dilya@example.com", Role.CREATOR, "Dilya")
    await add_creator(db_session, "amina@example.com", "dilya@example.com")
    await log_in(client, "amina@example.com")
    team = await creators(client)
    body = await shoot(client, mobilographer_ids=[team["Dilya"], team["Odina"]])
    walk = body["deliverables"][0]
    body["deliverables"] = [{**walk, "assignee_ids": [team["Odina"], team["Dilya"]]}]

    created = await post(client, body)
    page = (await client.get(f"/api/shoots/{created['id']}")).json()
    assert [m["name"] for m in page["mobilographers"]] == ["Dilya", "Odina"]
    # Every mobilographer is in the team and sees the shoot.
    await log_in(client, "dilya@example.com")
    assert (await client.get(f"/api/shoots/{created['id']}")).status_code == 200

    # One role per person: not a creator and a mobilographer, not a mobilographer twice.
    await log_in(client, "amina@example.com")
    for mobilographers in ([team["Lana"]], [team["Odina"], team["Odina"]]):
        # The deliverable is Lana's alone, so only the team itself is wrong.
        wrong = {**body, "mobilographer_ids": mobilographers, "deliverables": [walk]}
        response = await client.post("/api/shoots", json=wrong)
        assert response.status_code == 422, mobilographers


async def test_edits_the_shoot_keeping_deliverable_ids(client: AsyncClient) -> None:
    body = await shoot(client)
    created = await post(client, body)
    page = (await client.get(f"/api/shoots/{created['id']}")).json()
    walk = page["deliverables"][0]
    dress = (await products(client))["Dress"]
    ordered = (await product_deliverables(client))["Dress"]
    team = await creators(client)

    response = await client.put(
        f"/api/shoots/{created['id']}",
        json={
            **body,
            "name": "Renamed",
            "creator_ids": [team["Lana"], team["Odina"]],
            "mobilographer_ids": [],
            "product_ids": [*body["product_ids"], dress],
            "deliverables": [
                {
                    "name": "Close-up",
                    "type": "video",
                    "product_id": dress,
                    "product_deliverable_id": ordered,
                    "assignee_ids": [team["Odina"]],
                },
                {
                    "id": walk["id"],
                    "name": "Walk, renamed",
                    "type": "image",
                    "product_id": walk["product_id"],
                    "product_deliverable_id": walk["product_deliverable"]["id"],
                    "assignee_ids": [team["Odina"]],
                },
            ],
        },
    )
    assert response.status_code == 200, response.text
    edited = response.json()
    assert edited["name"] == "Renamed"
    assert [m["name"] for m in edited["creators"]] == ["Lana", "Odina"]
    assert edited["mobilographers"] == []
    assert [d["name"] for d in edited["deliverables"]] == ["Close-up", "Walk, renamed"]
    kept = edited["deliverables"][1]
    assert (kept["id"], kept["type"], kept["status"]) == (walk["id"], "image", "to_shoot")
    assert [a["name"] for a in kept["assignees"]] == ["Odina"]

    # Dropping a deliverable from the list deletes it.
    response = await client.put(
        f"/api/shoots/{created['id']}",
        json={**body, "deliverables": [{**body["deliverables"][0], "id": walk["id"]}]},
    )
    assert [d["id"] for d in response.json()["deliverables"]] == [walk["id"]]


async def test_only_the_author_edits_and_only_its_deliverables(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    body = await shoot(client)
    first = await post(client, body)
    second = await post(client, body)
    foreign = (await client.get(f"/api/shoots/{second['id']}")).json()["deliverables"][0]["id"]

    response = await client.put(
        f"/api/shoots/{first['id']}",
        json={**body, "deliverables": [{**body["deliverables"][0], "id": foreign}]},
    )
    assert response.status_code == 422

    await sign_up(client, db_session, "ad2@example.com", Role.ART_DIRECTOR, "Risolat")
    assert (await client.put(f"/api/shoots/{first['id']}", json=body)).status_code == 404
    await log_in(client, "lana@example.com")
    assert (await client.put(f"/api/shoots/{first['id']}", json=body)).status_code == 403


async def test_the_author_sets_member_responsibilities(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    body = await shoot(client)
    created = await post(client, body)
    team = await creators(client)
    url = f"/api/shoots/{created['id']}/members/{{}}/responsibilities"
    assert (await client.get(f"/api/shoots/{created['id']}")).json()["responsibilities"] == {}

    text = "  Model for product shots\nCreate short-form video  "
    response = await client.put(url.format(team["Lana"]), json={"responsibilities": text})
    assert response.status_code == 200, response.text
    lana = {team["Lana"]: "Model for product shots\nCreate short-form video"}
    assert response.json()["responsibilities"] == lana

    # Editing the shoot keeps them for whoever stays on the team.
    response = await client.put(f"/api/shoots/{created['id']}", json=body)
    assert response.json()["responsibilities"] == lana
    # An empty text clears them.
    response = await client.put(url.format(team["Lana"]), json={"responsibilities": " "})
    assert response.json()["responsibilities"] == {}

    # Only the team's creators and mobilographers, only by the author.
    art_director_id = created["team"][0]["id"]
    for user in (art_director_id, str(uuid.uuid4())):
        response = await client.put(url.format(user), json={"responsibilities": "x"})
        assert response.status_code == 404
    response = await client.put(url.format(team["Odina"]), json={"responsibilities": "x" * 2001})
    assert response.status_code == 422
    await log_in(client, "lana@example.com")
    response = await client.put(url.format(team["Lana"]), json={"responsibilities": "x"})
    assert response.status_code == 403
    await sign_up(client, db_session, "ad2@example.com", Role.ART_DIRECTOR, "Risolat")
    response = await client.put(url.format(team["Lana"]), json={"responsibilities": "x"})
    assert response.status_code == 404


# --- Product deliverables (docs/adr/0017) ---


async def test_a_deliverable_closes_a_product_deliverable_of_its_product(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    ordered = await product_deliverables(client)
    # Another art director's product deliverable in the same brand's product.
    await art_director(client, db_session, "ad2@example.com", "Risolat")
    risolat = str(await user_id(db_session, "ad2@example.com"))
    await log_in(client, "brand@example.com")
    photo = await upload(client, image_bytes())
    foreign = await create(
        client, product([photo["id"]], name="Foreign", deliverables=[deliverable(risolat)])
    )
    foreign_ordered = (await client.get(f"/api/products/{foreign['id']}")).json()
    await log_in(client, "amina@example.com")

    body = await shoot(client)
    walk = body["deliverables"][0]
    for change, detail in (
        ({"product_deliverable_id": None}, "Pick the product deliverable"),
        ({"product_deliverable_id": str(uuid.uuid4())}, "Product deliverable not found"),
        (
            {"product_deliverable_id": foreign_ordered["deliverables"][0]["id"]},
            "Product deliverable not found",
        ),
        (
            {"product_deliverable_id": ordered["Dress"]},
            "A deliverable's product deliverable is for another product",
        ),
    ):
        response = await client.post(
            "/api/shoots", json={**body, "deliverables": [{**walk, **change}]}
        )
        assert (response.status_code, response.json()["detail"]) == (422, detail), change

    created = await post(client, body)
    page = (await client.get(f"/api/shoots/{created['id']}")).json()
    assert page["deliverables"][0]["product_deliverable"] == {
        "id": ordered["Abaya"],
        "name": "Walking transition",
    }


async def test_lists_product_deliverables_with_their_shoots(client: AsyncClient) -> None:
    named = await products(client)
    created = await post(client, await shoot(client))

    response = await client.get(
        "/api/shoots/product-deliverables", params={"product_id": [named["Abaya"]]}
    )
    assert response.status_code == 200, response.text
    [abaya] = response.json()
    assert (abaya["product_id"], abaya["name"], abaya["type"]) == (
        named["Abaya"],
        "Walking transition",
        "video",
    )
    assert abaya["shoots"] == [
        {"id": created["id"], "name": created["name"], "date": created["date"]}
    ]
    everything = (await client.get("/api/shoots/product-deliverables")).json()
    assert sorted(item["product_id"] for item in everything) == sorted(named.values())
    assert [item["shoots"] for item in everything if item["product_id"] == named["Dress"]] == [[]]

    for email in ("lana@example.com", "brand@example.com"):
        await log_in(client, email)
        assert (await client.get("/api/shoots/product-deliverables")).status_code == 403


async def test_a_saved_deliverable_keeps_its_product_deliverable(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    body = await shoot(client)
    created = await post(client, body)
    url = f"/api/shoots/{created['id']}"
    walk = (await client.get(url)).json()["deliverables"][0]
    saved = {**body["deliverables"][0], "id": walk["id"]}

    # Unassigned from the product, Amina keeps what the shoot already closes,
    # but can't take it into another shoot.
    await db_session.execute(update(Deliverable).values(assignee_id=None))
    assert (await client.put(url, json={**body, "deliverables": [saved]})).status_code == 200
    assert (await client.post("/api/shoots", json=body)).status_code == 422
    # A saved deliverable can't drop its product deliverable.
    dropped = {**saved, "product_deliverable_id": None}
    assert (await client.put(url, json={**body, "deliverables": [dropped]})).status_code == 422

    # The brand removes the product deliverable: the shoot's deliverable stays without one.
    await log_in(client, "brand@example.com")
    abaya = (await client.get(f"/api/products/{body['product_ids'][0]}")).json()
    await edit(client, abaya["id"], edit_body(abaya, deliverable_ids=[]))
    await log_in(client, "amina@example.com")
    assert (await client.get(url)).json()["deliverables"][0]["product_deliverable"] is None
    response = await client.put(url, json={**body, "deliverables": [dropped]})
    assert response.status_code == 200, response.text
    # A new one still needs a product deliverable.
    new = {**body["deliverables"][0], "product_deliverable_id": None}
    response = await client.put(url, json={**body, "deliverables": [dropped, new]})
    assert response.status_code == 422


async def test_a_product_deliverable_takes_its_status_from_the_shoots(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    named = await products(client)
    url = f"/api/products/{named['Abaya']}"

    async def order() -> tuple[str, int]:
        [item] = (await client.get(url)).json()["deliverables"]
        return item["status"], item["shoots"]

    assert await order() == ("to_shoot", 0)
    first = await post(client, await shoot(client))
    second = await post(client, await shoot(client))
    assert await order() == ("to_shoot", 2)

    async def set_status(shoot_id: str, value: DeliverableStatus) -> None:
        await db_session.execute(
            update(ShootDeliverable)
            .where(ShootDeliverable.shoot_id == shoot_id)
            .values(status=value)
        )

    # The most urgent work wins; content sent to the brand wins over all.
    await set_status(first["id"], DeliverableStatus.IN_PROGRESS)
    assert await order() == ("in_progress", 2)
    await set_status(second["id"], DeliverableStatus.NEEDS_CHANGES)
    assert await order() == ("needs_changes", 2)
    await set_status(first["id"], DeliverableStatus.NEEDS_REVIEW)
    assert await order() == ("needs_review", 2)
    await set_status(second["id"], DeliverableStatus.APPROVED)
    assert await order() == ("approved", 2)
    # The brand sees it too, and the picker shows the same status.
    options = (await client.get("/api/shoots/product-deliverables")).json()
    assert [o["status"] for o in options if o["product_id"] == named["Abaya"]] == ["approved"]
    await log_in(client, "brand@example.com")
    assert await order() == ("approved", 2)


async def test_the_brand_cannot_remove_a_deliverable_in_work(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    body = await shoot(client)
    await post(client, body)
    url = f"/api/products/{body['product_ids'][0]}"

    async def remove() -> Any:
        await log_in(client, "brand@example.com")
        current = (await client.get(url)).json()
        response = await client.put(url, json=edit_body(current, deliverable_ids=[]))
        await log_in(client, "amina@example.com")
        return response

    in_work = set(DeliverableStatus) - {DeliverableStatus.TO_SHOOT}
    for value in sorted(in_work):
        await db_session.execute(update(ShootDeliverable).values(status=value))
        response = await remove()
        assert (response.status_code, response.json()["detail"]) == (
            422,
            "A deliverable in work can't be removed",
        ), value
    # The rest of the product still saves.
    await log_in(client, "brand@example.com")
    current = (await client.get(url)).json()
    assert (await client.put(url, json=edit_body(current, name="Renamed"))).status_code == 200

    # Planned but not started yet: it goes, the shoot keeps its deliverable.
    await db_session.execute(update(ShootDeliverable).values(status=DeliverableStatus.TO_SHOOT))
    assert (await remove()).status_code == 200


async def test_a_product_in_work_cannot_be_archived(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    body = await shoot(client)
    await post(client, body)
    abaya = body["product_ids"][0]
    url = f"/api/products/{abaya}"

    async def archive() -> Any:
        await log_in(client, "brand@example.com")
        response = await client.patch(url, json={"status": "archived"})
        await log_in(client, "amina@example.com")
        return response

    async def in_work() -> tuple[bool, bool]:
        await log_in(client, "brand@example.com")
        page = (await client.get(url)).json()["in_work"]
        listing = (await client.get("/api/products")).json()["items"]
        await log_in(client, "amina@example.com")
        return page, next(item["in_work"] for item in listing if item["id"] == abaya)

    assert await in_work() == (False, False)
    # Planned, nothing started: it can go and come back.
    assert (await archive()).status_code == 200
    await log_in(client, "brand@example.com")
    assert (await client.patch(url, json={"status": "active"})).status_code == 200
    await log_in(client, "amina@example.com")
    for value in (
        DeliverableStatus.IN_PROGRESS,
        DeliverableStatus.NEEDS_REVIEW,
        DeliverableStatus.NEEDS_CHANGES,
    ):
        await db_session.execute(update(ShootDeliverable).values(status=value))
        assert await in_work() == (True, True), value
        response = await archive()
        assert (response.status_code, response.json()["detail"]) == (
            422,
            "A product in work can't be archived",
        ), value

    # Everything sent to the brand: done, it can go.
    await db_session.execute(update(ShootDeliverable).values(status=DeliverableStatus.APPROVED))
    assert await in_work() == (False, False)
    assert (await archive()).status_code == 200
    # Restoring is always allowed, and archiving an archived one changes nothing.
    await db_session.execute(update(ShootDeliverable).values(status=DeliverableStatus.IN_PROGRESS))
    assert (await archive()).status_code == 200
    await log_in(client, "brand@example.com")
    assert (await client.patch(url, json={"status": "active"})).status_code == 200


async def test_new_work_on_an_archived_product_starts_as_to_shoot(client: AsyncClient) -> None:
    body = await shoot(client)
    created = await post(client, body)
    url = f"/api/shoots/{created['id']}"
    await log_in(client, "brand@example.com")
    archived = await client.patch(
        f"/api/products/{body['product_ids'][0]}", json={"status": "archived"}
    )
    assert archived.status_code == 200
    await log_in(client, "amina@example.com")
    page = (await client.get(url)).json()
    assert page["products"][0]["archived"] is True
    saved = {**body["deliverables"][0], "id": page["deliverables"][0]["id"]}

    def with_new(status: str) -> dict[str, Any]:
        return {**body, "deliverables": [saved, {**body["deliverables"][0], "status": status}]}

    for status in ("in_progress", "needs_review", "needs_changes"):
        response = await client.put(url, json=with_new(status))
        assert (response.status_code, response.json()["detail"]) == (
            422,
            "A new deliverable of an archived product starts as to shoot",
        ), status
    assert (await client.put(url, json=with_new("to_shoot"))).status_code == 200
    # Without a status it starts as to shoot too.
    planned = {**body, "deliverables": [saved, body["deliverables"][0]]}
    assert (await client.put(url, json=planned)).status_code == 200


async def test_a_saved_deliverable_keeps_its_product(client: AsyncClient) -> None:
    body = await shoot(client)
    created = await post(client, body)
    url = f"/api/shoots/{created['id']}"
    walk = (await client.get(url)).json()["deliverables"][0]
    named = await products(client)
    ordered = await product_deliverables(client)
    moved = {
        **body["deliverables"][0],
        "id": walk["id"],
        "product_id": named["Dress"],
        "product_deliverable_id": ordered["Dress"],
    }
    response = await client.put(
        url,
        json={**body, "product_ids": [named["Abaya"], named["Dress"]], "deliverables": [moved]},
    )
    assert (response.status_code, response.json()["detail"]) == (
        422,
        "A saved deliverable keeps its product",
    )


# --- Notes ---


def note(**fields: Any) -> dict[str, Any]:
    return {"title": "Studio reminders", "body": "Arrive early\nCheck outfits", **fields}


async def test_team_writes_and_reads_notes(client: AsyncClient, db_session: AsyncSession) -> None:
    created = await post(client, await shoot(client))
    url = f"/api/shoots/{created['id']}/notes"
    team = await creators(client)

    response = await client.post(url, json=note(pinned=True, assignee_ids=[team["Lana"]]))
    assert response.status_code == 201, response.text
    pinned = response.json()
    assert (pinned["author"]["name"], pinned["type"], pinned["visibility"]) == (
        "Amina",
        "general",
        "internal",
    )
    assert [a["name"] for a in pinned["assignees"]] == ["Lana"]
    assert pinned["can_manage"] is True

    # A creator on the team writes too; the list puts pinned notes first.
    await log_in(client, "lana@example.com")
    feedback = (await client.post(url, json=note(title="Creator feedback", type="feedback"))).json()
    listed = (await client.get(url)).json()
    assert [n["title"] for n in listed] == ["Studio reminders", "Creator feedback"]
    assert [n["can_manage"] for n in listed] == [False, True]
    # Someone else's note is not Lana's to change.
    response = await client.patch(f"{url}/{pinned['id']}", json={"pinned": False})
    assert response.status_code == 404

    # The art director manages every note; outsiders see nothing.
    await log_in(client, "amina@example.com")
    response = await client.put(f"{url}/{feedback['id']}", json=note(title="Edited"))
    assert response.json()["title"] == "Edited"
    assert (await client.delete(f"{url}/{feedback['id']}")).status_code == 204
    await sign_up(client, db_session, "other@example.com", Role.CREATOR, "Other")
    assert (await client.get(url)).status_code == 404


async def test_private_notes_reach_only_their_people(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    created = await post(client, await shoot(client))
    url = f"/api/shoots/{created['id']}/notes"
    team = await creators(client)
    await client.post(url, json=note(visibility="private", assignee_ids=[team["Odina"]]))

    for email, seen in (("odina@example.com", 1), ("lana@example.com", 0)):
        await log_in(client, email)
        assert len((await client.get(url)).json()) == seen


async def test_note_assignees_come_from_the_team(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    created = await post(client, await shoot(client))
    await sign_up(client, db_session, "stranger@example.com", Role.CREATOR, "Stranger")
    stranger = str(await user_id(db_session, "stranger@example.com"))
    await log_in(client, "amina@example.com")
    response = await client.post(
        f"/api/shoots/{created['id']}/notes", json=note(assignee_ids=[stranger])
    )
    assert response.status_code == 422
