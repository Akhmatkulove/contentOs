from datetime import UTC, datetime, timedelta
from typing import Any

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role
from tests.test_content import comment, sent_close_up
from tests.test_products import log_in, sign_up
from tests.test_shoots import client
from tests.test_tasks import by_name, decide, review_page, send, submit_version, tasks

__all__ = ["client"]


async def activity(client: AsyncClient, status: int = 200, **params: Any) -> dict[str, Any]:
    response = await client.get("/api/activity", params=params)
    assert response.status_code == status, response.text
    body: dict[str, Any] = response.json()
    return body


def kinds(feed: dict[str, Any]) -> list[str]:
    return [item["type"] for item in feed["items"]]


async def approved_by_brand(client: AsyncClient) -> str:
    """Close-up отправлен бренду; бренд оставил комментарий и одобрил его."""
    task_id = await sent_close_up(client)
    await log_in(client, "brand@example.com")
    await comment(client, task_id, "Looks great!")
    response = await client.post(f"/api/content/{task_id}/approve")
    assert response.status_code == 204, response.text
    return task_id


async def test_the_feed_follows_the_work(client: AsyncClient) -> None:
    task_id = await approved_by_brand(client)
    await log_in(client, "amina@example.com")

    feed = await activity(client)
    assert kinds(feed) == [
        "content_approved",
        "content_commented",
        "content_sent",
        "version_approved",
        "version_approved",
        "version_submitted",
        "version_submitted",
        "shoot_created",
        "shoot_created",
    ]
    approved, commented, sent = feed["items"][:3]
    assert (approved["actor"]["name"], approved["count"]) == ("Acme", 2)
    assert (approved["deliverable"]["id"], approved["product"]["name"]) == (task_id, "Dress")
    assert (commented["comment"], approved["shoot"]["name"]) == ("Looks great!", "Shoot 04")
    assert (sent["actor"]["name"], sent["count"]) == ("Amina", 2)
    reviewed = feed["items"][3]
    assert reviewed["subject"]["name"] in {"Lana", "Odina"}
    assert feed["items"][5]["count"] == 1
    assert feed["next_cursor"] is None


async def test_the_last_sent_deliverable_completes_the_shoot(client: AsyncClient) -> None:
    await sent_close_up(client)
    walking: str = (await tasks(client, search="walking"))["items"][0]["id"]
    await submit_version(client, walking, "lana@example.com")
    await log_in(client, "amina@example.com")
    [lana] = by_name(await review_page(client, walking)).values()
    await decide(client, walking, lana["versions"][0]["id"], "approved")
    await send(client, walking)

    assert kinds(await activity(client))[:2] == ["shoot_completed", "content_sent"]


async def test_who_sees_what(client: AsyncClient, db_session: AsyncSession) -> None:
    await approved_by_brand(client)
    await sign_up(client, db_session, "ad2@example.com", Role.ART_DIRECTOR, "Risolat")

    # A creator of the shoot sees the team's work, the brand only what reached it.
    await log_in(client, "odina@example.com")
    assert len(kinds(await activity(client))) == 9
    await log_in(client, "brand@example.com")
    feed = await activity(client)
    assert kinds(feed) == ["content_approved", "content_commented", "content_sent"]
    # The brand doesn't see the shoot, here as everywhere (docs/adr/0025).
    assert [item["shoot"] for item in feed["items"]] == [None, None, None]
    assert feed["items"][0]["deliverable"]["name"] == "Close-up"
    await log_in(client, "ad2@example.com")
    assert kinds(await activity(client)) == []


async def test_pages_follow_the_cursor(client: AsyncClient) -> None:
    await approved_by_brand(client)
    await log_in(client, "amina@example.com")
    everything = kinds(await activity(client))

    seen: list[str] = []
    cursor = None
    while True:
        page = await activity(client, limit=4, **({"cursor": cursor} if cursor else {}))
        seen += [item["id"] for item in page["items"]]
        cursor = page["next_cursor"]
        if cursor is None:
            break
    assert len(seen) == len(set(seen)) == len(everything)

    await activity(client, 422, cursor="not-a-cursor")


async def test_deleted_comment_leaves_the_feed(client: AsyncClient) -> None:
    task_id = await approved_by_brand(client)
    response = await client.get(f"/api/content/{task_id}")
    [own] = response.json()["comments"]
    response = await client.delete(f"/api/content/{task_id}/comments/{own['id']}")
    assert response.status_code == 204, response.text

    assert "content_commented" not in kinds(await activity(client))


async def test_tasks_sent_since(client: AsyncClient) -> None:
    await sent_close_up(client)
    now = datetime.now(UTC)

    hour_ago = (now - timedelta(hours=1)).isoformat()
    in_an_hour = (now + timedelta(hours=1)).isoformat()
    assert (await tasks(client, status="approved", sent_since=hour_ago))["total"] == 1
    assert (await tasks(client, status="approved", sent_since=in_an_hour))["total"] == 0
    response = await client.get("/api/tasks", params={"sent_since": "2026-10-01T00:00:00"})
    assert response.status_code == 422, response.text
