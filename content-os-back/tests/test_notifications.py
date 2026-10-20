import uuid
from typing import Any

from httpx import AsyncClient

from tests.test_products import deliverable, edit, edit_body, log_in
from tests.test_shoots import client, products

__all__ = ["client"]


async def notifications(client: AsyncClient) -> dict[str, Any]:
    response = await client.get("/api/notifications")
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


def summary(listing: dict[str, Any]) -> list[tuple[str, int, bool]]:
    return [(n["product"]["name"], n["count"], n["read"]) for n in listing["items"]]


async def add_deliverables(client: AsyncClient, product_id: str, count: int) -> None:
    """Бренд добавляет в продукт ещё `count` deliverables для Amina."""
    await log_in(client, "brand@example.com")
    current = (await client.get(f"/api/products/{product_id}")).json()
    amina = current["deliverables"][0]["assignee"]["id"]
    await edit(
        client,
        product_id,
        edit_body(
            current, deliverables=[deliverable(amina, name=f"Extra {n}") for n in range(count)]
        ),
    )
    await log_in(client, "amina@example.com")


async def test_art_director_is_notified_once_per_product(client: AsyncClient) -> None:
    # The fixture's brand created Abaya, then Dress, each with a deliverable for Amina.
    listing = await notifications(client)
    assert summary(listing) == [("Dress", 1, False), ("Abaya", 1, False)]
    assert listing["unread"] == 2
    [dress, _] = listing["items"]
    assert (dress["type"], dress["actor"]["name"]) == ("deliverables_assigned", "Acme")
    assert dress["product"]["photo"]["url"]

    # The brand itself gets nothing.
    await log_in(client, "brand@example.com")
    assert (await notifications(client))["items"] == []


async def test_more_deliverables_add_up_until_read(client: AsyncClient) -> None:
    abaya = (await products(client))["Abaya"]
    await add_deliverables(client, abaya, 2)
    # Still one about Abaya, now on top and counting all three.
    assert summary(await notifications(client)) == [("Abaya", 3, False), ("Dress", 1, False)]

    first = (await notifications(client))["items"][0]["id"]
    assert (await client.post(f"/api/notifications/{first}/read")).status_code == 204
    assert (await notifications(client))["unread"] == 1
    # Read, it stays as it was; the next assignment starts a new one.
    await add_deliverables(client, abaya, 1)
    assert summary(await notifications(client)) == [
        ("Abaya", 1, False),
        ("Abaya", 3, True),
        ("Dress", 1, False),
    ]

    assert (await client.post("/api/notifications/read")).status_code == 204
    listing = await notifications(client)
    assert listing["unread"] == 0
    assert all(n["read"] for n in listing["items"])


async def test_clear_all_deletes_only_the_users_own(client: AsyncClient) -> None:
    await log_in(client, "lana@example.com")
    lanas = len((await notifications(client))["items"])
    await log_in(client, "amina@example.com")

    assert (await client.delete("/api/notifications")).status_code == 204
    assert await notifications(client) == {"items": [], "unread": 0}
    # A new assignment comes as a new notification, not added to the cleared one.
    await add_deliverables(client, (await products(client))["Abaya"], 2)
    assert summary(await notifications(client)) == [("Abaya", 2, False)]

    await log_in(client, "lana@example.com")
    assert len((await notifications(client))["items"]) == lanas


async def test_notifications_are_the_users_own(client: AsyncClient) -> None:
    mine = (await notifications(client))["items"][0]["id"]
    await log_in(client, "lana@example.com")
    assert (await client.post(f"/api/notifications/{mine}/read")).status_code == 404
    assert (await client.post(f"/api/notifications/{uuid.uuid4()}/read")).status_code == 404
    await log_in(client, "amina@example.com")
    assert (await notifications(client))["unread"] == 2


async def test_a_product_taken_away_takes_its_notification(client: AsyncClient) -> None:
    abaya = (await products(client))["Abaya"]
    await log_in(client, "brand@example.com")
    current = (await client.get(f"/api/products/{abaya}")).json()
    await edit(client, abaya, edit_body(current, deliverable_ids=[]))
    await log_in(client, "amina@example.com")
    listing = await notifications(client)
    assert (summary(listing), listing["unread"]) == ([("Dress", 1, False)], 1)


async def test_a_new_assignment_after_unassigning_starts_over(client: AsyncClient) -> None:
    abaya = (await products(client))["Abaya"]
    await log_in(client, "brand@example.com")
    current = (await client.get(f"/api/products/{abaya}")).json()
    await edit(client, abaya, edit_body(current, deliverable_ids=[]))
    await log_in(client, "amina@example.com")
    await add_deliverables_to_empty(client, abaya)
    # Counts the new one only, not the removed one before it.
    assert summary(await notifications(client))[0] == ("Abaya", 1, False)


async def add_deliverables_to_empty(client: AsyncClient, product_id: str) -> None:
    await log_in(client, "brand@example.com")
    current = (await client.get(f"/api/products/{product_id}")).json()
    amina = (await client.get("/api/team/art-directors")).json()[0]["id"]
    await edit(client, product_id, edit_body(current, deliverables=[deliverable(amina)]))
    await log_in(client, "amina@example.com")
