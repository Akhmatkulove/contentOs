import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role
from app.deliverables.models import Deliverable, DeliverableType
from tests.test_products import art_director, log_in, sign_up
from tests.test_shoots import client, products
from tests.test_tasks import (
    by_name,
    close_up,
    decide,
    edit_close_up,
    review_page,
    send,
    submit_version,
)
from tests.test_team import add_creator

__all__ = ["client"]


async def content(client: AsyncClient, **params: Any) -> dict[str, Any]:
    response = await client.get("/api/content", params=params)
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


async def filters(client: AsyncClient) -> dict[str, Any]:
    response = await client.get("/api/content/filters")
    assert response.status_code == 200, response.text
    body: dict[str, Any] = response.json()
    return body


def authors(listing: dict[str, Any]) -> list[str]:
    return [item["author"]["name"] for item in listing["items"]]


async def sent_close_up(client: AsyncClient) -> str:
    """Close-up на Shoot 04: Lana и Odina отправили по версии, обе одобрены и
    отправлены бренду. Клиент — арт-директор."""
    task_id = await close_up(client)
    await submit_version(client, task_id, "lana@example.com")
    await submit_version(client, task_id, "odina@example.com")
    await log_in(client, "amina@example.com")
    for creator in by_name(await review_page(client, task_id)).values():
        await decide(client, task_id, creator["versions"][0]["id"], "approved")
    assert (await content(client))["total"] == 0
    await send(client, task_id)
    return task_id


async def test_send_to_brand_puts_approved_files_on_the_content_page(
    client: AsyncClient,
) -> None:
    await sent_close_up(client)

    listing = await content(client)
    assert authors(listing) == ["Lana", "Odina"]
    item = listing["items"][0]
    assert (item["name"], item["product"]["name"], item["shoot"]["name"], item["status"]) == (
        "Close-up",
        "Dress",
        "Shoot 04",
        "new",
    )
    assert item["file"]["kind"] == "image"
    assert listing["counts"] == {"all": 2, "mine": 2}


async def test_only_approved_versions_are_sent(client: AsyncClient) -> None:
    task_id = await close_up(client)
    await submit_version(client, task_id, "lana@example.com")
    await submit_version(client, task_id, "lana@example.com")
    await submit_version(client, task_id, "odina@example.com")
    await log_in(client, "amina@example.com")
    review = by_name(await review_page(client, task_id))
    # Lana's V1 is the pick, V2 isn't.
    lana_v1 = review["Lana"]["versions"][1]
    await decide(client, task_id, review["Lana"]["versions"][0]["id"], "changes_requested", "No")
    await decide(client, task_id, lana_v1["id"], "approved")
    await decide(client, task_id, review["Odina"]["versions"][0]["id"], "approved")
    await send(client, task_id)

    listing = await content(client)
    assert authors(listing) == ["Lana", "Odina"]
    assert listing["items"][0]["file"]["id"] == lana_v1["files"][0]["id"]


async def test_who_sees_the_content_and_the_shoot(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await sent_close_up(client)
    await sign_up(client, db_session, "other@example.com", Role.CREATOR, "Other")
    await add_creator(db_session, "amina@example.com", "other@example.com")
    await sign_up(client, db_session, "ad2@example.com", Role.ART_DIRECTOR, "Risolat")
    await sign_up(client, db_session, "brand2@example.com", Role.BRAND, "Other brand")

    # A creator sees the team's content; My content is their own.
    await log_in(client, "lana@example.com")
    listing = await content(client)
    assert (listing["counts"], listing["items"][0]["shoot"]["name"]) == (
        {"all": 2, "mine": 1},
        "Shoot 04",
    )
    assert authors(await content(client, scope="mine")) == ["Lana"]
    await log_in(client, "other@example.com")
    assert (await content(client))["counts"] == {"all": 2, "mine": 0}

    # The brand sees its product's content, but not the shoot.
    await log_in(client, "brand@example.com")
    listing = await content(client)
    assert listing["counts"] == {"all": 2, "mine": 2}
    assert [item["shoot"] for item in listing["items"]] == [None, None]
    assert (await filters(client))["shoots"] == []
    assert (await content(client, search="Shoot 04"))["total"] == 0

    for email in ("ad2@example.com", "brand2@example.com"):
        await log_in(client, email)
        assert (await content(client))["counts"] == {"all": 0, "mine": 0}
        assert await filters(client) == {"products": [], "shoots": [], "creators": []}


async def test_searches_filters_and_sorts(client: AsyncClient) -> None:
    await sent_close_up(client)

    options = await filters(client)
    assert [product["name"] for product in options["products"]] == ["Dress"]
    assert [shoot["name"] for shoot in options["shoots"]] == ["Shoot 04"]
    assert [creator["name"] for creator in options["creators"]] == ["Lana", "Odina"]
    odina = options["creators"][1]["id"]

    assert authors(await content(client, search="odi")) == ["Odina"]
    assert (await content(client, search="shoot 04"))["total"] == 2
    assert (await content(client, search="dress"))["total"] == 2
    assert (await content(client, search="nothing"))["counts"] == {"all": 0, "mine": 0}
    assert authors(await content(client, author_id=odina)) == ["Odina"]
    assert (await content(client, product_id=options["products"][0]["id"]))["total"] == 2
    assert (await content(client, shoot_id=options["shoots"][0]["id"]))["total"] == 2
    assert (await content(client, status="approved"))["total"] == 0
    assert authors(await content(client, sort="oldest")) == ["Lana", "Odina"]
    page = await content(client, per_page=1, page=2)
    assert (authors(page), page["total"]) == (["Odina"], 2)


async def test_sent_content_keeps_its_name(client: AsyncClient) -> None:
    task_id = await sent_close_up(client)
    await edit_close_up(client, task_id, name="Renamed")

    assert (await content(client))["items"][0]["name"] == "Close-up"
    assert (await content(client, search="renamed"))["total"] == 0


async def test_art_director_of_the_product_sees_content_of_others_shoots(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    await sent_close_up(client)
    dress = (await products(client))["Dress"]
    ad2 = await art_director(client, db_session, "ad2@example.com", "Risolat")
    db_session.add(
        Deliverable(
            product_id=uuid.UUID(dress),
            assignee_id=uuid.UUID(ad2),
            position=1,
            name="Extra",
            type=DeliverableType.VIDEO,
        )
    )
    await db_session.flush()

    await log_in(client, "ad2@example.com")
    listing = await content(client)
    # Amina's shoot: the files, but not the shoot.
    assert listing["counts"] == {"all": 2, "mine": 0}
    assert [item["shoot"] for item in listing["items"]] == [None, None]
    assert (await filters(client))["shoots"] == []
