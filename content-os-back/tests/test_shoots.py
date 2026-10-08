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
from app.deliverables.models import DeliverableStatus
from app.main import create_app
from app.shoots.models import Shoot, ShootDeliverable
from tests.fakes import FakeStorage
from tests.test_files import image_bytes, upload
from tests.test_products import (
    art_director,
    create,
    deliverable,
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


async def creators(client: AsyncClient) -> dict[str, str]:
    response = await client.get("/api/team/creators")
    assert response.status_code == 200
    return {item["name"]: item["id"] for item in response.json()}


async def shoot(client: AsyncClient, **fields: Any) -> dict[str, Any]:
    """Тело запроса: Lana — креатор, Odina — мобилограф, один deliverable на Abaya для Lana."""
    abaya = (await products(client))["Abaya"]
    team = await creators(client)
    return {
        "name": "Shoot 04 — Autumn Drop",
        "date": FUTURE,
        "start_time": "10:00",
        "duration_minutes": 120,
        "location": "Tashkent Studio",
        "creator_ids": [team["Lana"]],
        "mobilographer_id": team["Odina"],
        "product_ids": [abaya],
        "deliverables": [
            {"name": "Walking transition", "product_id": abaya, "assignee_ids": [team["Lana"]]}
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
        {"product_ids": [*body["product_ids"], foreign]},
        {"reference_ids": ["00000000-0000-0000-0000-000000000000"]},
    ):
        response = await client.post("/api/shoots", json={**body, **fields})
        assert response.status_code == 422, fields
    assert await db_session.scalar(select(func.count()).select_from(Shoot)) == 0


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
    await post(client, await shoot(client, name="Autumn", location="White Studio"))
    await post(
        client,
        await shoot(
            client,
            name="Summer",
            date=PAST,
            product_ids=[dress],
            deliverables=[{"name": "Close-up", "product_id": dress}],
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
    assert page["mobilographer"]["name"] == "Odina"
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
    assert walk["name"] == "Walking transition"
    assert walk["product_id"] == abaya["id"]
    assert [a["name"] for a in walk["assignees"]] == ["Lana"]

    # The team sees it but can't edit; others get 404.
    await log_in(client, "lana@example.com")
    response = await client.get(f"/api/shoots/{created['id']}")
    assert response.status_code == 200
    assert response.json()["can_edit"] is False
    await sign_up(client, db_session, "ad2@example.com", Role.ART_DIRECTOR, "Risolat")
    assert (await client.get(f"/api/shoots/{created['id']}")).status_code == 404


async def test_edits_the_shoot_keeping_deliverable_ids(client: AsyncClient) -> None:
    body = await shoot(client)
    created = await post(client, body)
    page = (await client.get(f"/api/shoots/{created['id']}")).json()
    walk = page["deliverables"][0]
    dress = (await products(client))["Dress"]
    team = await creators(client)

    response = await client.put(
        f"/api/shoots/{created['id']}",
        json={
            **body,
            "name": "Renamed",
            "creator_ids": [team["Lana"], team["Odina"]],
            "mobilographer_id": None,
            "product_ids": [*body["product_ids"], dress],
            "deliverables": [
                {"name": "Close-up", "product_id": dress, "assignee_ids": [team["Odina"]]},
                {
                    "id": walk["id"],
                    "name": "Walk, renamed",
                    "product_id": walk["product_id"],
                    "assignee_ids": [team["Odina"]],
                    "status": "approved",
                },
            ],
        },
    )
    assert response.status_code == 200, response.text
    edited = response.json()
    assert edited["name"] == "Renamed"
    assert [m["name"] for m in edited["creators"]] == ["Lana", "Odina"]
    assert edited["mobilographer"] is None
    assert [d["name"] for d in edited["deliverables"]] == ["Close-up", "Walk, renamed"]
    kept = edited["deliverables"][1]
    assert (kept["id"], kept["status"]) == (walk["id"], "approved")
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
