from datetime import date, timedelta
from typing import Any

from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role
from app.deliverables.models import DeliverableStatus
from app.shoots.models import ShootDeliverable
from tests.test_products import log_in, sign_up
from tests.test_references import add_reference
from tests.test_shoots import client, creators, post, products, shoot

__all__ = ["client"]

SOON = (date.today() + timedelta(days=2)).isoformat()
LATER = (date.today() + timedelta(days=9)).isoformat()


async def tasks(client: AsyncClient, **params: Any) -> dict[str, Any]:
    response = await client.get("/api/tasks", params=params)
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


def names(listing: dict[str, Any]) -> list[str]:
    return [item["name"] for item in listing["items"]]


async def two_shoots(client: AsyncClient) -> dict[str, str]:
    """Shoot 04: Walking (Lana) и Close-up (Lana, Odina); Shoot 05: Portrait (Odina)."""
    found = await products(client)
    abaya, dress = found["Abaya"], found["Dress"]
    team = await creators(client)
    lana, odina = team["Lana"], team["Odina"]
    first = await post(
        client,
        await shoot(
            client,
            name="Shoot 04",
            creator_ids=[lana, odina],
            mobilographer_id=None,
            product_ids=[abaya, dress],
            deliverables=[
                {"name": "Walking", "product_id": abaya, "assignee_ids": [lana], "due_date": LATER},
                {
                    "name": "Close-up",
                    "product_id": dress,
                    "assignee_ids": [lana, odina],
                    "due_date": SOON,
                    "status": "needs_review",
                },
            ],
        ),
    )
    second = await post(
        client,
        await shoot(
            client,
            name="Shoot 05",
            creator_ids=[odina],
            mobilographer_id=None,
            deliverables=[
                {
                    "name": "Portrait",
                    "product_id": abaya,
                    "assignee_ids": [odina],
                    "status": "needs_changes",
                }
            ],
        ),
    )
    return {"Shoot 04": first["id"], "Shoot 05": second["id"], "Lana": lana, "Odina": odina}


async def test_art_director_sees_deliverables_of_own_shoots(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await two_shoots(client)

    listing = await tasks(client)
    # Priority: needs review, then needs changes, then the rest by due date.
    assert names(listing) == ["Close-up", "Portrait", "Walking"]
    assert listing["counts"] == {
        "all": 3,
        "to_shoot": 1,
        "in_progress": 0,
        "needs_review": 1,
        "needs_changes": 1,
        "approved": 0,
    }
    close_up = listing["items"][0]
    assert close_up["shoot"]["name"] == "Shoot 04"
    assert close_up["product"]["name"] == "Dress"
    assert close_up["product"]["photo"]["url"]
    assert [member["name"] for member in close_up["assignees"]] == ["Lana", "Odina"]
    assert (close_up["references"], close_up["references_total"]) == ([], 0)

    await sign_up(client, db_session, "ad2@example.com", Role.ART_DIRECTOR, "Risolat")
    assert (await tasks(client))["total"] == 0


async def test_creator_sees_only_own_deliverables(client: AsyncClient) -> None:
    await two_shoots(client)

    # A creator's priority: needs changes, then to shoot; their review waits last.
    await log_in(client, "lana@example.com")
    assert names(await tasks(client)) == ["Walking", "Close-up"]
    await log_in(client, "odina@example.com")
    assert names(await tasks(client)) == ["Portrait", "Close-up"]

    await log_in(client, "brand@example.com")
    assert (await client.get("/api/tasks")).status_code == 403


async def test_searches_filters_sorts_and_counts(client: AsyncClient) -> None:
    ids = await two_shoots(client)

    needs_review = await tasks(client, status="needs_review")
    assert (names(needs_review), needs_review["total"]) == (["Close-up"], 1)
    # Counts ignore the picked status: they size the tabs.
    assert needs_review["counts"]["all"] == 3

    assert names(await tasks(client, search="odin")) == ["Close-up", "Portrait"]
    assert names(await tasks(client, search="shoot 05")) == ["Portrait"]
    assert names(await tasks(client, search="dress")) == ["Close-up"]
    assert names(await tasks(client, shoot_id=ids["Shoot 04"])) == ["Close-up", "Walking"]
    assert names(await tasks(client, assignee_id=ids["Lana"])) == ["Close-up", "Walking"]
    abaya = (await products(client))["Abaya"]
    assert names(await tasks(client, product_id=abaya)) == ["Portrait", "Walking"]
    # No due date goes last.
    assert names(await tasks(client, sort="due_date")) == ["Close-up", "Walking", "Portrait"]
    assert names(await tasks(client, sort="name_asc")) == ["Close-up", "Portrait", "Walking"]
    page = await tasks(client, per_page=2, page=2)
    assert (names(page), page["total"]) == (["Walking"], 3)


async def test_status_change_moves_the_task_between_tabs(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await two_shoots(client)
    await db_session.execute(
        update(ShootDeliverable)
        .where(ShootDeliverable.name == "Walking")
        .values(status=DeliverableStatus.APPROVED)
    )
    assert names(await tasks(client, status="approved")) == ["Walking"]


async def test_filters_list_what_the_tasks_have(client: AsyncClient) -> None:
    await two_shoots(client)

    response = await client.get("/api/tasks/filters")
    assert response.status_code == 200
    filters = response.json()
    assert {item["name"] for item in filters["shoots"]} == {"Shoot 04", "Shoot 05"}
    assert [item["name"] for item in filters["products"]] == ["Abaya", "Dress"]
    assert [item["name"] for item in filters["assignees"]] == ["Lana", "Odina"]

    await log_in(client, "lana@example.com")
    filters = (await client.get("/api/tasks/filters")).json()
    assert [item["name"] for item in filters["shoots"]] == ["Shoot 04"]


async def test_shows_the_first_references_and_how_many(client: AsyncClient) -> None:
    refs = [
        (await add_reference(client, link=f"https://example.com/{n}", title=f"Ref {n}"))["id"]
        for n in range(5)
    ]
    abaya = (await products(client))["Abaya"]
    lana = (await creators(client))["Lana"]
    await post(
        client,
        await shoot(
            client,
            reference_ids=refs,
            deliverables=[
                {
                    "name": "Walking",
                    "product_id": abaya,
                    "assignee_ids": [lana],
                    "reference_ids": list(reversed(refs)),
                }
            ],
        ),
    )

    await log_in(client, "lana@example.com")
    item = (await tasks(client))["items"][0]
    assert [ref["title"] for ref in item["references"]] == ["Ref 4", "Ref 3", "Ref 2"]
    assert item["references_total"] == 5
