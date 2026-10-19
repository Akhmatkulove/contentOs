from datetime import date, timedelta
from typing import Any

from httpx import AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role
from app.deliverables.models import DeliverableStatus
from app.shoots.models import ShootDeliverable, ShootDeliverableAssignee
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
                {
                    "name": "Walking",
                    "type": "video",
                    "product_id": abaya,
                    "assignee_ids": [lana],
                    "due_date": LATER,
                },
                {
                    "name": "Close-up",
                    "type": "video",
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
                    "type": "video",
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


async def test_creator_sees_only_own_deliverables(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    ids = await two_shoots(client)
    await db_session.execute(
        update(ShootDeliverableAssignee)
        .where(
            ShootDeliverableAssignee.user_id == ids["Odina"],
            ShootDeliverableAssignee.deliverable_id.in_(
                select(ShootDeliverable.id).where(ShootDeliverable.name == "Portrait")
            ),
        )
        .values(status=DeliverableStatus.NEEDS_CHANGES)
    )

    # A creator's task has their own status, not the deliverable's (docs/adr/0015):
    # Close-up waits for review as a deliverable, but Lana hasn't uploaded yet.
    await log_in(client, "lana@example.com")
    listing = await tasks(client)
    assert names(listing) == ["Close-up", "Walking"]
    assert [item["status"] for item in listing["items"]] == ["to_shoot", "to_shoot"]
    assert (listing["counts"]["to_shoot"], listing["counts"]["needs_review"]) == (2, 0)
    assert (await tasks(client, status="needs_review"))["total"] == 0
    # A creator's priority: needs changes, then to shoot; their review waits last.
    await log_in(client, "odina@example.com")
    assert names(await tasks(client)) == ["Portrait", "Close-up"]
    assert names(await tasks(client, status="needs_changes")) == ["Portrait"]
    # Searching by assignee doesn't mix with the creator's own row.
    assert names(await tasks(client, search="lana")) == ["Close-up"]

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
                    "type": "video",
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
    # Still a draft: nothing went to review yet, the work is in progress.
    assert (page["status"], page["versions"]) == ("in_progress", [])
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


async def review_page(client: AsyncClient, task_id: str, status: int = 200) -> dict[str, Any]:
    response = await client.get(f"/api/tasks/{task_id}/review")
    assert response.status_code == status, response.text
    body: dict[str, Any] = response.json()
    return body


async def decide(
    client: AsyncClient,
    task_id: str,
    version_id: str,
    decision: str,
    feedback: str = "",
    status: int = 200,
) -> dict[str, Any]:
    response = await client.post(
        f"/api/tasks/{task_id}/versions/{version_id}/review",
        json={"decision": decision, "feedback": feedback},
    )
    assert response.status_code == status, response.text
    body: dict[str, Any] = response.json()
    return body


async def send(client: AsyncClient, task_id: str, status: int = 200) -> dict[str, Any]:
    response = await client.post(f"/api/tasks/{task_id}/send")
    assert response.status_code == status, response.text
    body: dict[str, Any] = response.json()
    return body


async def submit_version(client: AsyncClient, task_id: str, email: str) -> dict[str, Any]:
    """Исполнитель загружает файл и отправляет версию на проверку."""
    await log_in(client, email)
    file = await upload(client, image_bytes())
    await add_files(client, task_id, [file["id"]])
    return await submit(client, task_id)


async def close_up(client: AsyncClient) -> str:
    """Задача Close-up (исполнители Lana и Odina) на Shoot 04; клиент — арт-директор."""
    await two_shoots(client)
    task_id: str = (await tasks(client, search="close"))["items"][0]["id"]
    return task_id


def by_name(review: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {creator["member"]["name"]: creator for creator in review["creators"]}


async def test_each_assignee_works_on_own_versions(client: AsyncClient) -> None:
    task_id = await close_up(client)

    lana = await submit_version(client, task_id, "lana@example.com")
    assert (lana["status"], [v["number"] for v in lana["versions"]]) == ("needs_review", [1])
    # Odina doesn't see Lana's work and starts her own V1.
    await log_in(client, "odina@example.com")
    page = await task_page(client, task_id)
    assert (page["status"], page["versions"], page["draft"]) == ("to_shoot", [], None)
    file = await upload(client, image_bytes())
    assert (await add_files(client, task_id, [file["id"]]))["draft"]["number"] == 1
    assert (await submit(client, task_id))["versions"][0]["author"]["name"] == "Odina"

    # The art director sees everyone's submitted versions.
    await log_in(client, "amina@example.com")
    page = await task_page(client, task_id)
    assert sorted(v["author"]["name"] for v in page["versions"]) == ["Lana", "Odina"]
    assert page["status"] == "needs_review"


async def test_art_director_reviews_each_creator_then_sends(client: AsyncClient) -> None:
    task_id = await close_up(client)
    await submit_version(client, task_id, "lana@example.com")
    await log_in(client, "amina@example.com")

    # Odina hasn't uploaded: the deliverable waits for her.
    review = await review_page(client, task_id)
    assert [c["member"]["name"] for c in review["creators"]] == ["Lana", "Odina"]
    assert [c["role"] for c in review["creators"]] == ["creator", "creator"]
    lana, odina = by_name(review)["Lana"], by_name(review)["Odina"]
    assert (lana["status"], odina["status"], odina["versions"]) == ("needs_review", "to_shoot", [])
    assert review["can_send"] is False
    await send(client, task_id, status=409)

    lana_v1 = lana["versions"][0]["id"]
    await decide(client, task_id, lana_v1, "changes_requested", status=422)
    await decide(client, task_id, lana_v1, "changes_requested", " x " * 400, status=422)
    review = await decide(client, task_id, lana_v1, "approved")
    assert (by_name(review)["Lana"]["status"], review["status"]) == ("approved", "in_progress")
    assert by_name(review)["Lana"]["versions"][0]["review"] == "approved"
    assert review["can_send"] is False

    # Lana's work is done; Odina gets feedback on hers.
    await log_in(client, "lana@example.com")
    page = await task_page(client, task_id)
    assert (page["status"], page["can_upload"]) == ("approved", False)
    file = await upload(client, image_bytes())
    await add_files(client, task_id, [file["id"]], status=409)

    odina_v1 = (await submit_version(client, task_id, "odina@example.com"))["versions"][0]["id"]
    await log_in(client, "amina@example.com")
    assert (await review_page(client, task_id))["status"] == "needs_review"
    review = await decide(
        client, task_id, odina_v1, "changes_requested", "  Start slightly closer  "
    )
    assert (by_name(review)["Odina"]["status"], review["status"]) == (
        "needs_changes",
        "needs_changes",
    )
    await log_in(client, "odina@example.com")
    page = await task_page(client, task_id)
    assert page["status"] == "needs_changes"
    assert (page["versions"][0]["review"], page["versions"][0]["feedback"]) == (
        "changes_requested",
        "Start slightly closer",
    )

    # V2 goes to review; V1 is history now.
    odina_v2 = (await submit_version(client, task_id, "odina@example.com"))["versions"][0]["id"]
    await log_in(client, "amina@example.com")
    await decide(client, task_id, odina_v1, "approved", status=409)
    review = await decide(client, task_id, odina_v2, "approved")
    assert [v["number"] for v in by_name(review)["Odina"]["versions"]] == [2, 1]
    # Everyone approved: it still waits for the art director to send it.
    assert (review["status"], review["can_send"]) == ("needs_review", True)

    review = await send(client, task_id)
    assert (review["status"], review["can_send"]) == ("approved", False)
    await send(client, task_id, status=409)
    await decide(client, task_id, odina_v2, "changes_requested", "More", status=409)
    assert names(await tasks(client, status="approved")) == ["Close-up"]


async def test_review_is_the_shoots_art_directors_only(
    client: AsyncClient, db_session: AsyncSession
) -> None:
    task_id = await close_up(client)
    version = (await submit_version(client, task_id, "lana@example.com"))["versions"][0]["id"]

    # The assignee can't review their own work.
    await review_page(client, task_id, status=404)
    await decide(client, task_id, version, "approved", status=404)
    await send(client, task_id, status=404)

    await sign_up(client, db_session, "ad2@example.com", Role.ART_DIRECTOR, "Risolat")
    await review_page(client, task_id, status=404)
    await decide(client, task_id, version, "approved", status=404)

    await log_in(client, "brand@example.com")
    await review_page(client, task_id, status=403)

    # A version of another task isn't found here.
    await log_in(client, "amina@example.com")
    other = (await tasks(client, search="walking"))["items"][0]["id"]
    await decide(client, other, version, "approved", status=404)


async def edit_close_up(
    client: AsyncClient, task_id: str, expect: int = 200, **changes: Any
) -> None:
    """Сохраняет форму съёмки Close-up как есть, с изменениями этого deliverable."""
    shoot_id = (await review_page(client, task_id))["shoot"]["id"]
    page = (await client.get(f"/api/shoots/{shoot_id}")).json()
    response = await client.put(
        f"/api/shoots/{shoot_id}",
        json={
            "name": page["name"],
            "date": page["date"],
            "start_time": page["start_time"],
            "duration_minutes": page["duration_minutes"],
            "creator_ids": [member["id"] for member in page["creators"]],
            "product_ids": [product["id"] for product in page["products"]],
            "deliverables": [
                {
                    "id": item["id"],
                    "name": item["name"],
                    "type": item["type"],
                    "product_id": item["product_id"],
                    "assignee_ids": [a["id"] for a in item["assignees"]],
                    "due_date": item["due_date"],
                    **(changes if item["id"] == task_id else {}),
                }
                for item in page["deliverables"]
            ],
        },
    )
    assert response.status_code == expect, response.text


async def test_editing_the_shoot_keeps_assignees_work(client: AsyncClient) -> None:
    task_id = await close_up(client)
    version = (await submit_version(client, task_id, "lana@example.com"))["versions"][0]["id"]
    await log_in(client, "amina@example.com")
    await decide(client, task_id, version, "approved")
    people = by_name(await review_page(client, task_id))
    lana, odina = people["Lana"]["member"]["id"], people["Odina"]["member"]["id"]

    # Odina leaves Close-up: only Lana's approved work is left.
    await edit_close_up(client, task_id, assignee_ids=[lana])
    review = await review_page(client, task_id)
    assert [(c["member"]["name"], c["status"]) for c in review["creators"]] == [
        ("Lana", "approved")
    ]
    assert (review["status"], review["can_send"]) == ("needs_review", True)

    # Lana leaves and comes back: her work comes back with her.
    await edit_close_up(client, task_id, assignee_ids=[odina])
    await edit_close_up(client, task_id, assignee_ids=[lana, odina])
    review = await review_page(client, task_id)
    assert [c["status"] for c in review["creators"]] == ["approved", "to_shoot"]
    assert review["status"] == "in_progress"


async def test_the_form_sets_the_status_of_new_deliverables_only(client: AsyncClient) -> None:
    task_id = await close_up(client)
    # A saved deliverable's status comes from its work and review, not the form.
    await edit_close_up(client, task_id, 422, status="to_shoot")
    # Approved means sent to the brand: only the review sends.
    response = await client.post(
        "/api/shoots",
        json=await shoot(
            client,
            deliverables=[
                {
                    "name": "Walking",
                    "type": "video",
                    "product_id": (await products(client))["Abaya"],
                    "status": "approved",
                }
            ],
        ),
    )
    assert response.status_code == 422, response.text

    version = (await submit_version(client, task_id, "lana@example.com"))["versions"][0]["id"]
    await log_in(client, "amina@example.com")
    await decide(client, task_id, version, "approved")
    lana = by_name(await review_page(client, task_id))["Lana"]["member"]["id"]
    await edit_close_up(client, task_id, assignee_ids=[lana])
    await send(client, task_id)

    # Sent stays sent when the shoot is saved again.
    await edit_close_up(client, task_id)
    assert (await review_page(client, task_id))["status"] == "approved"
