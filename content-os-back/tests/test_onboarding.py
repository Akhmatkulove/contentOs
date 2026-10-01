import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Status, User


async def complete(client: AsyncClient) -> None:
    response = await client.patch("/api/me/onboarding", json={"role": "creator", "name": "Anna"})
    assert response.status_code == 200


async def test_new_user_starts_at_role_step(user_client: AsyncClient) -> None:
    me = (await user_client.get("/api/me")).json()

    assert me["onboarding_step"] == "role"


async def test_answers_are_saved_step_by_step(user_client: AsyncClient) -> None:
    response = await user_client.patch("/api/me/onboarding", json={"role": "art_director"})
    assert response.json()["role"] == "art_director"
    assert response.json()["onboarding_step"] == "profile"

    response = await user_client.patch("/api/me/onboarding", json={"name": "  Anna  "})
    assert response.json()["name"] == "Anna"
    assert response.json()["role"] == "art_director"
    assert response.json()["onboarding_step"] == "review"

    # Вернулся позже, с другого устройства: продолжает с того же места.
    assert (await user_client.get("/api/me")).json()["onboarding_step"] == "review"


async def test_role_can_be_changed_during_onboarding(user_client: AsyncClient) -> None:
    await complete(user_client)

    response = await user_client.patch("/api/me/onboarding", json={"role": "brand"})

    assert response.json()["role"] == "brand"


@pytest.mark.parametrize("body", [{"role": "admin"}, {"name": "   "}, {"name": "x" * 101}])
async def test_invalid_answers_are_rejected(user_client: AsyncClient, body: dict[str, str]) -> None:
    response = await user_client.patch("/api/me/onboarding", json=body)

    assert response.status_code == 422


async def test_submit_sends_application_for_review(user_client: AsyncClient) -> None:
    await complete(user_client)

    response = await user_client.post("/api/me/onboarding/submit")

    assert response.status_code == 200
    assert response.json()["status"] == "pending_review"
    assert response.json()["onboarding_step"] is None


@pytest.mark.parametrize("body", [{}, {"role": "creator"}, {"name": "Anna"}])
async def test_incomplete_application_cannot_be_submitted(
    user_client: AsyncClient, body: dict[str, str]
) -> None:
    await user_client.patch("/api/me/onboarding", json=body)

    response = await user_client.post("/api/me/onboarding/submit")

    assert response.status_code == 422
    assert (await user_client.get("/api/me")).json()["status"] == "onboarding"


async def test_answers_are_locked_while_under_review(user_client: AsyncClient) -> None:
    await complete(user_client)
    await user_client.post("/api/me/onboarding/submit")

    response = await user_client.patch("/api/me/onboarding", json={"role": "brand"})

    assert response.status_code == 409
    assert (await user_client.get("/api/me")).json()["role"] == "creator"


async def test_cannot_submit_twice(user_client: AsyncClient) -> None:
    await complete(user_client)
    await user_client.post("/api/me/onboarding/submit")

    assert (await user_client.post("/api/me/onboarding/submit")).status_code == 409


@pytest.mark.parametrize("status", [Status.PENDING_REVIEW, Status.REJECTED])
async def test_reopen_returns_application_to_onboarding(
    user_client: AsyncClient, db_session: AsyncSession, status: Status
) -> None:
    await complete(user_client)
    await db_session.execute(update(User).values(status=status))

    response = await user_client.post("/api/me/onboarding/reopen")

    assert response.status_code == 200
    assert response.json()["status"] == "onboarding"
    # Ответы сохранились, человек попадает на проверку и может поправить любой шаг.
    assert response.json()["onboarding_step"] == "review"
    assert (
        await user_client.patch("/api/me/onboarding", json={"role": "brand"})
    ).status_code == 200


@pytest.mark.parametrize("status", [Status.ONBOARDING, Status.APPROVED])
async def test_reopen_is_only_for_submitted_applications(
    user_client: AsyncClient, db_session: AsyncSession, status: Status
) -> None:
    await complete(user_client)
    await db_session.execute(update(User).values(status=status))

    assert (await user_client.post("/api/me/onboarding/reopen")).status_code == 409


async def test_approved_user_cannot_change_role(
    user_client: AsyncClient, db_session: AsyncSession
) -> None:
    await complete(user_client)
    await db_session.execute(update(User).values(status=Status.APPROVED))

    response = await user_client.patch("/api/me/onboarding", json={"role": "brand"})

    assert response.status_code == 409


async def test_onboarding_requires_session(client: AsyncClient) -> None:
    assert (await client.patch("/api/me/onboarding", json={})).status_code == 401
    assert (await client.post("/api/me/onboarding/submit")).status_code == 401
    assert (await client.post("/api/me/onboarding/reopen")).status_code == 401
