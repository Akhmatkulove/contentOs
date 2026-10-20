import uuid
from typing import Any

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role
from app.deliverables.models import Deliverable, DeliverableType
from app.references.models import Reference
from app.shoots.models import ShootDeliverableReference
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
    assert listing["counts"] == {"all": 2, "mine": 2, "favorites": 0}


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
        {"all": 2, "mine": 1, "favorites": 0},
        "Shoot 04",
    )
    assert authors(await content(client, scope="mine")) == ["Lana"]
    await log_in(client, "other@example.com")
    assert (await content(client))["counts"] == {"all": 2, "mine": 0, "favorites": 0}

    # The brand sees its product's content, but not the shoot.
    await log_in(client, "brand@example.com")
    listing = await content(client)
    assert listing["counts"] == {"all": 2, "mine": 2, "favorites": 0}
    assert [item["shoot"] for item in listing["items"]] == [None, None]
    assert (await filters(client))["shoots"] == []
    assert (await content(client, search="Shoot 04"))["total"] == 0

    for email in ("ad2@example.com", "brand2@example.com"):
        await log_in(client, email)
        assert (await content(client))["counts"] == {"all": 0, "mine": 0, "favorites": 0}
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
    assert (await content(client, search="nothing"))["counts"] == {
        "all": 0,
        "mine": 0,
        "favorites": 0,
    }
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
    assert listing["counts"] == {"all": 2, "mine": 0, "favorites": 0}
    assert [item["shoot"] for item in listing["items"]] == [None, None]
    assert (await filters(client))["shoots"] == []


async def test_the_brand_is_notified_that_the_order_is_ready(client: AsyncClient) -> None:
    task_id = await sent_close_up(client)
    # A later rename doesn't reach what the brand was sent.
    await edit_close_up(client, task_id, name="Renamed")

    await log_in(client, "brand@example.com")
    response = await client.get("/api/notifications")
    assert response.status_code == 200, response.text
    listing = response.json()
    assert listing["unread"] == 1
    [ready] = listing["items"]
    assert (ready["type"], ready["actor"]["name"], ready["product"]["name"]) == (
        "content_sent",
        "Amina",
        "Dress",
    )
    assert (ready["deliverable"]["name"], ready["count"], ready["read"]) == ("Close-up", 2, False)


async def content_page(client: AsyncClient, task_id: str, status: int = 200) -> dict[str, Any]:
    response = await client.get(f"/api/content/{task_id}")
    assert response.status_code == status, response.text
    body: dict[str, Any] = response.json()
    return body


async def comment(client: AsyncClient, task_id: str, body: str, status: int = 201) -> None:
    response = await client.post(f"/api/content/{task_id}/comments", json={"body": body})
    assert response.status_code == status, response.text


async def delete_comment(client: AsyncClient, task_id: str, comment_id: str, status: int) -> None:
    response = await client.delete(f"/api/content/{task_id}/comments/{comment_id}")
    assert response.status_code == status, response.text


async def notifications(client: AsyncClient) -> list[dict[str, Any]]:
    response = await client.get("/api/notifications")
    assert response.status_code == 200, response.text
    items: list[dict[str, Any]] = response.json()["items"]
    return items


async def test_the_content_page_shows_the_whole_sent_deliverable(client: AsyncClient) -> None:
    task_id = await sent_close_up(client)
    listing = await content(client)
    assert {item["deliverable_id"] for item in listing["items"]} == {task_id}

    page = await content_page(client, task_id)
    assert (page["name"], page["type"], page["status"], page["product"]["name"]) == (
        "Close-up",
        "video",
        "new",
        "Dress",
    )
    assert page["shoot"]["name"] == "Shoot 04"
    assert [person["member"]["name"] for person in page["people"]] == ["Lana", "Odina"]
    assert [m["id"] for m in page["materials"]] == [item["id"] for item in listing["items"]]
    # Versions only for the shoot's art director; no favorites or approval for them.
    assert sorted(v["author"]["name"] for v in page["versions"]) == ["Lana", "Odina"]
    assert all(v["size"] > 0 and v["review"] == "approved" for v in page["versions"])
    assert (page["can_comment"], page["can_favorite"], page["can_approve"]) == (True, False, False)
    assert (page["previous_id"], page["next_id"]) == (None, None)

    await log_in(client, "lana@example.com")
    page = await content_page(client, task_id)
    assert (page["versions"], page["can_comment"], page["shoot"]["name"]) == (
        None,
        False,
        "Shoot 04",
    )

    await log_in(client, "brand@example.com")
    page = await content_page(client, task_id)
    assert (page["shoot"], page["references"], page["versions"]) == (None, [], None)
    assert (page["can_comment"], page["can_favorite"], page["can_approve"]) == (True, True, True)


async def test_strangers_dont_see_the_content_page(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    task_id = await sent_close_up(client)
    await sign_up(client, db_session, "brand2@example.com", Role.BRAND, "Other brand")
    await content_page(client, str(uuid.uuid4()), 404)
    await log_in(client, "brand2@example.com")
    await content_page(client, task_id, 404)
    await comment(client, task_id, "Hi", 404)


async def test_brand_and_art_director_comment_and_the_rest_are_notified(
    client: AsyncClient,
) -> None:
    task_id = await sent_close_up(client)

    await log_in(client, "brand@example.com")
    await comment(client, task_id, "  Love it  ")
    await comment(client, task_id, "", 422)
    await log_in(client, "lana@example.com")
    await comment(client, task_id, "Thanks", 403)
    await log_in(client, "amina@example.com")
    await comment(client, task_id, "Glad you like it")

    page = await content_page(client, task_id)
    assert [(c["author"]["name"], c["role"], c["body"]) for c in page["comments"]] == [
        ("Amina", "art_director", "Glad you like it"),
        ("Acme", "brand", "Love it"),
    ]

    # Lana got both comments as one notification; the commenter is never notified.
    await log_in(client, "lana@example.com")
    [commented] = [n for n in await notifications(client) if n["type"] == "content_commented"]
    assert (commented["count"], commented["actor"]["name"]) == (2, "Amina")
    assert commented["deliverable"]["id"] == task_id
    await log_in(client, "brand@example.com")
    [commented] = [n for n in await notifications(client) if n["type"] == "content_commented"]
    assert (commented["count"], commented["actor"]["name"]) == (1, "Amina")


async def test_the_brand_approves_and_favorites_the_content(client: AsyncClient) -> None:
    task_id = await sent_close_up(client)
    await log_in(client, "lana@example.com")
    response = await client.post(f"/api/content/{task_id}/approve")
    assert response.status_code == 403, response.text
    response = await client.put(f"/api/content/{task_id}/favorite")
    assert response.status_code == 403, response.text

    await log_in(client, "brand@example.com")
    for _ in range(2):
        response = await client.post(f"/api/content/{task_id}/approve")
        assert response.status_code == 204, response.text
        response = await client.put(f"/api/content/{task_id}/favorite")
        assert response.status_code == 204, response.text
    page = await content_page(client, task_id)
    assert (page["status"], page["can_approve"], page["favorite"]) == ("approved", False, True)
    assert page["approved_at"] is not None
    assert (await content(client, status="approved"))["total"] == 2
    # The Favorites tab: every file of the starred deliverable.
    favorites = await content(client, scope="favorites")
    assert (favorites["total"], favorites["counts"]["favorites"]) == (2, 2)
    response = await client.delete(f"/api/content/{task_id}/favorite")
    assert response.status_code == 204, response.text
    assert (await content_page(client, task_id))["favorite"] is False
    assert (await content(client, scope="favorites"))["items"] == []

    # One notification each, however many times the brand pressed Approve.
    for email in ("amina@example.com", "odina@example.com"):
        await log_in(client, email)
        approved = [n for n in await notifications(client) if n["type"] == "content_approved"]
        assert [(n["actor"]["name"], n["count"]) for n in approved] == [("Acme", 2)]


async def test_the_page_shows_the_deliverables_and_products_references_to_everyone(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    task_id = await sent_close_up(client)
    page = await content_page(client, task_id)
    owner_id = uuid.UUID(page["people"][0]["member"]["id"])
    shoot_ref = Reference(owner_id=owner_id, title="Shoot ref", link="https://example.com/s")
    db_session.add(shoot_ref)
    await db_session.flush()
    db_session.add(
        ShootDeliverableReference(
            deliverable_id=uuid.UUID(task_id), reference_id=shoot_ref.id, position=0
        )
    )
    for title in ("Older", "Newer"):
        db_session.add(
            Reference(
                owner_id=owner_id,
                product_id=uuid.UUID(page["product"]["id"]),
                title=title,
                link=f"https://example.com/{title}",
            )
        )
        await db_session.flush()

    # The deliverable's first, then the product's (even added after sending),
    # newest first; the brand sees them all.
    expected = ["Shoot ref", "Newer", "Older"]
    assert [r["title"] for r in (await content_page(client, task_id))["references"]] == expected
    await log_in(client, "brand@example.com")
    assert [r["title"] for r in (await content_page(client, task_id))["references"]] == expected


async def test_only_the_author_deletes_a_comment(client: AsyncClient) -> None:
    task_id = await sent_close_up(client)
    await log_in(client, "brand@example.com")
    await comment(client, task_id, "Love it")
    [love_it] = (await content_page(client, task_id))["comments"]

    for email in ("amina@example.com", "lana@example.com"):
        await log_in(client, email)
        await delete_comment(client, task_id, love_it["id"], 403)
    await log_in(client, "brand@example.com")
    await delete_comment(client, task_id, str(uuid.uuid4()), 404)
    await delete_comment(client, task_id, love_it["id"], 204)
    assert (await content_page(client, task_id))["comments"] == []
