from datetime import date, timedelta
from typing import Any

from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role
from app.deliverables.models import DeliverableStatus
from app.shoots.models import ShootDeliverable
from tests.test_files import MP4, image_bytes, upload
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


async def task_page(client: AsyncClient, task_id: str, status: int = 200) -> dict[str, Any]:
    response = await client.get(f"/api/tasks/{task_id}")
    assert response.status_code == status, response.text
    body: dict[str, Any] = response.json()
    return body


async def add_files(
    client: AsyncClient, task_id: str, file_ids: list[str], status: int = 200
) -> dict[str, Any]:
    response = await client.post(f"/api/tasks/{task_id}/draft/files", json={"file_ids": file_ids})
    assert response.status_code == status, response.text
    body: dict[str, Any] = response.json()
    return body


async def submit(
    client: AsyncClient, task_id: str, title: str = "", status: int = 200
) -> dict[str, Any]:
    response = await client.post(f"/api/tasks/{task_id}/draft/submit", json={"title": title})
    assert response.status_code == status, response.text
    body: dict[str, Any] = response.json()
    return body


async def remove(client: AsyncClient, task_id: str, file_id: str) -> int:
    response = await client.delete(f"/api/tasks/{task_id}/draft/files/{file_id}")
    return response.status_code


async def walking(client: AsyncClient) -> str:
    """Задача Walking (исполнитель Lana) на Shoot 04; клиент входит как Lana."""
    await two_shoots(client)
    task_id: str = (await tasks(client, search="walking"))["items"][0]["id"]
    await log_in(client, "lana@example.com")
    return task_id


async def test_draft_collects_files_until_submitted(client: AsyncClient) -> None:
    task_id = await walking(client)
    page = await task_page(client, task_id)
    assert (page["name"], page["shoot"]["name"], page["product"]["name"]) == (
        "Walking",
        "Shoot 04",
        "Abaya",
    )
    assert (page["versions"], page["draft"], page["can_upload"]) == ([], None, True)

    video = await upload(client, MP4, "walking_take_1.mp4")
    page = await add_files(client, task_id, [video["id"]])
    photo = await upload(client, image_bytes(), "dress.jpg")
    page = await add_files(client, task_id, [photo["id"]])
    # Still a draft: nothing went to review yet.
    assert (page["status"], page["versions"]) == ("to_shoot", [])
    draft = page["draft"]
    assert (draft["number"], draft["submitted_at"], draft["author"]["name"]) == (1, None, "Lana")
    assert [(file["name"], file["kind"]) for file in draft["files"]] == [
        ("walking_take_1.mp4", "video"),
        ("dress.jpg", "image"),
    ]
    assert draft["files"][0]["url"]
    assert draft["files"][0]["size"] == len(MP4)

    page = await submit(client, task_id)
    assert (page["status"], page["draft"]) == ("needs_review", None)
    [first] = page["versions"]
    assert (first["number"], first["title"], len(first["files"])) == (1, None, 2)
    assert first["submitted_at"]
    await submit(client, task_id, status=409)

    # The next files start V2, which may get its own name, saved before submitting.
    response = await client.patch(f"/api/tasks/{task_id}/draft", json={"title": "V2"})
    assert response.status_code == 409
    again = await upload(client, image_bytes())
    assert (await add_files(client, task_id, [again["id"]]))["draft"]["number"] == 2
    response = await client.patch(f"/api/tasks/{task_id}/draft", json={"title": " Draft "})
    assert response.status_code == 200, response.text
    page = response.json()
    assert (page["draft"]["title"], page["status"], page["versions"][0]["number"]) == (
        "Draft",
        "needs_review",
        1,
    )
    page = await submit(client, task_id, title="  V1.01 ")
    assert [(v["number"], v["title"]) for v in page["versions"]] == [(2, "V1.01"), (1, None)]

    # A file goes into one version only.
    await add_files(client, task_id, [photo["id"]], status=422)


async def test_art_director_sees_submitted_versions_only(client: AsyncClient) -> None:
    task_id = await walking(client)
    first = await upload(client, image_bytes())
    await add_files(client, task_id, [first["id"]])
    await submit(client, task_id)
    second = await upload(client, image_bytes())
    await add_files(client, task_id, [second["id"]])

    await log_in(client, "amina@example.com")
    page = await task_page(client, task_id)
    assert (len(page["versions"]), page["draft"], page["can_upload"]) == (1, None, False)
    own = await upload(client, image_bytes())
    await add_files(client, task_id, [own["id"]], status=403)
    await submit(client, task_id, status=403)

    # Not the assignee: the task isn't there.
    await log_in(client, "odina@example.com")
    await task_page(client, task_id, status=404)
    await add_files(client, task_id, [own["id"]], status=404)


async def test_removes_files_from_the_draft_only(client: AsyncClient) -> None:
    task_id = await walking(client)
    sent = await upload(client, image_bytes())
    await add_files(client, task_id, [sent["id"]])
    await submit(client, task_id)
    assert await remove(client, task_id, sent["id"]) == 404

    first = await upload(client, image_bytes())
    second = await upload(client, image_bytes())
    await add_files(client, task_id, [first["id"], second["id"]])
    assert await remove(client, task_id, first["id"]) == 200
    page = await task_page(client, task_id)
    assert [file["id"] for file in page["draft"]["files"]] == [second["id"]]

    # The last file takes the draft with it.
    assert await remove(client, task_id, second["id"]) == 200
    assert (await task_page(client, task_id))["draft"] is None
