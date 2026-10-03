import uuid
from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import AdminAction, AdminActionType
from app.admin.service import NotAnAdminError, create_or_reset_admin
from app.auth.models import Role, Status, User, UserSession

ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin-long-password"  # noqa: S105
PASSWORD = "user-password"  # noqa: S105


async def make_admin(db: AsyncSession) -> None:
    assert await create_or_reset_admin(db, ADMIN_EMAIL, ADMIN_PASSWORD)
    await db.commit()


async def login(client: AsyncClient, email: str, password: str) -> None:
    client.cookies.clear()
    response = await client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200


async def add_user(
    client: AsyncClient, db: AsyncSession, email: str, role: Role, status: Status = Status.APPROVED
) -> uuid.UUID:
    client.cookies.clear()
    response = await client.post("/api/auth/signup", json={"email": email, "password": PASSWORD})
    assert response.status_code == 201
    user_id = uuid.UUID(response.json()["id"])
    await db.execute(update(User).where(User.id == user_id).values(role=role, status=status))
    client.cookies.clear()
    return user_id


@pytest.fixture
async def admin_client(client: AsyncClient, db_session: AsyncSession) -> AsyncClient:
    await make_admin(db_session)
    await login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    return client


def link_path(brand_id: uuid.UUID, art_director_id: uuid.UUID) -> str:
    return f"/api/admin/brands/{brand_id}/art-directors/{art_director_id}"


def creator_path(art_director_id: uuid.UUID, creator_id: uuid.UUID) -> str:
    return f"/api/admin/art-directors/{art_director_id}/creators/{creator_id}"


async def actions(db: AsyncSession) -> list[tuple[AdminActionType, uuid.UUID | None]]:
    rows = await db.execute(
        select(AdminAction.action, AdminAction.brand_id).order_by(AdminAction.created_at)
    )
    return [(row.action, row.brand_id) for row in rows]


# --- Создание админа ---


async def test_admin_signs_in_with_password_and_is_marked_in_me(
    admin_client: AsyncClient,
) -> None:
    me = (await admin_client.get("/api/me")).json()

    assert me["is_admin"] is True
    assert me["role"] is None
    assert me["status"] == "approved"
    assert me["onboarding_step"] is None


async def test_regular_user_is_not_admin(user_client: AsyncClient) -> None:
    assert (await user_client.get("/api/me")).json()["is_admin"] is False


async def test_signup_ignores_is_admin(client: AsyncClient) -> None:
    response = await client.post(
        "/api/auth/signup",
        json={"email": "sneaky@example.com", "password": PASSWORD, "is_admin": True},
    )

    assert response.json()["is_admin"] is False


async def test_onboarding_cannot_pick_admin_role(user_client: AsyncClient) -> None:
    response = await user_client.patch("/api/me/onboarding", json={"role": "admin"})

    assert response.status_code == 422


async def test_reset_changes_password_and_drops_sessions(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    assert not await create_or_reset_admin(db_session, ADMIN_EMAIL, "new-long-password")
    await db_session.commit()

    assert (await admin_client.get("/api/me")).status_code == 401
    await login(admin_client, ADMIN_EMAIL, "new-long-password")


async def test_regular_user_is_not_turned_into_admin(
    user_client: AsyncClient, db_session: AsyncSession
) -> None:
    with pytest.raises(NotAnAdminError):
        await create_or_reset_admin(db_session, "user@example.com", ADMIN_PASSWORD)

    assert (await user_client.get("/api/me")).json()["is_admin"] is False


async def test_admin_cannot_have_a_role(db_session: AsyncSession) -> None:
    await make_admin(db_session)

    with pytest.raises(Exception, match="admin_has_no_role"):
        await db_session.execute(
            update(User).where(User.email == ADMIN_EMAIL).values(role=Role.BRAND)
        )


# --- Сессия админа ---


async def test_admin_session_is_short(admin_client: AsyncClient, db_session: AsyncSession) -> None:
    expires_at = await db_session.scalar(select(UserSession.expires_at))

    assert expires_at is not None
    assert expires_at - datetime.now(UTC) <= timedelta(hours=12)


async def test_admin_session_is_never_extended(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    soon = datetime.now(UTC) + timedelta(minutes=5)
    await db_session.execute(update(UserSession).values(expires_at=soon))

    response = await admin_client.get("/api/me")

    assert response.status_code == 200
    assert "set-cookie" not in response.headers
    assert await db_session.scalar(select(UserSession.expires_at)) == soon


# --- Доступ к админке ---


async def test_admin_api_is_hidden_from_regular_users(
    user_client: AsyncClient, db_session: AsyncSession
) -> None:
    await db_session.execute(update(User).values(status=Status.APPROVED, role=Role.BRAND))
    some_id = uuid.uuid4()

    assert (await user_client.get("/api/admin/users")).status_code == 404
    assert (await user_client.put(link_path(some_id, some_id))).status_code == 404
    assert (await user_client.delete(link_path(some_id, some_id))).status_code == 404
    assert (await user_client.put(creator_path(some_id, some_id))).status_code == 404
    assert (await user_client.delete(creator_path(some_id, some_id))).status_code == 404


async def test_admin_cannot_use_onboarding(admin_client: AsyncClient) -> None:
    response = await admin_client.patch("/api/me/onboarding", json={"name": "Admin"})

    assert response.status_code == 409


# --- Пользователи и связки ---


async def test_lists_everyone_but_admins(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    brand = await add_user(admin_client, db_session, "brand@example.com", Role.BRAND)
    creator = await add_user(
        admin_client, db_session, "creator@example.com", Role.CREATOR, Status.PENDING_REVIEW
    )
    await login(admin_client, ADMIN_EMAIL, ADMIN_PASSWORD)

    body = (await admin_client.get("/api/admin/users")).json()

    # Порядок по created_at внутри одной тестовой транзакции не определён: now() один.
    statuses = {user["id"]: user["status"] for user in body["users"]}
    assert statuses == {str(brand): "approved", str(creator): "pending_review"}
    assert body["brand_art_directors"] == []


async def test_assigns_and_unassigns_art_director(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    brand = await add_user(admin_client, db_session, "brand@example.com", Role.BRAND)
    director = await add_user(admin_client, db_session, "ad@example.com", Role.ART_DIRECTOR)
    await login(admin_client, ADMIN_EMAIL, ADMIN_PASSWORD)

    assert (await admin_client.put(link_path(brand, director))).status_code == 204
    links = (await admin_client.get("/api/admin/users")).json()["brand_art_directors"]
    assert [(link["brand_id"], link["art_director_id"]) for link in links] == [
        (str(brand), str(director))
    ]

    assert (await admin_client.delete(link_path(brand, director))).status_code == 204
    assert (await admin_client.get("/api/admin/users")).json()["brand_art_directors"] == []
    assert await actions(db_session) == [
        (AdminActionType.ASSIGN_ART_DIRECTOR, brand),
        (AdminActionType.UNASSIGN_ART_DIRECTOR, brand),
    ]


async def test_repeated_calls_change_nothing_and_are_not_logged(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    brand = await add_user(admin_client, db_session, "brand@example.com", Role.BRAND)
    director = await add_user(admin_client, db_session, "ad@example.com", Role.ART_DIRECTOR)
    await login(admin_client, ADMIN_EMAIL, ADMIN_PASSWORD)

    for _ in range(2):
        assert (await admin_client.put(link_path(brand, director))).status_code == 204
    assert len((await admin_client.get("/api/admin/users")).json()["brand_art_directors"]) == 1
    for _ in range(2):
        assert (await admin_client.delete(link_path(brand, director))).status_code == 204

    assert len(await actions(db_session)) == 2


async def test_art_director_works_with_several_brands(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    first = await add_user(admin_client, db_session, "one@example.com", Role.BRAND)
    second = await add_user(admin_client, db_session, "two@example.com", Role.BRAND)
    director = await add_user(admin_client, db_session, "ad@example.com", Role.ART_DIRECTOR)
    await login(admin_client, ADMIN_EMAIL, ADMIN_PASSWORD)

    await admin_client.put(link_path(first, director))
    await admin_client.put(link_path(second, director))

    links = (await admin_client.get("/api/admin/users")).json()["brand_art_directors"]
    assert {link["brand_id"] for link in links} == {str(first), str(second)}


@pytest.mark.parametrize(
    ("brand_role", "brand_status", "director_role"),
    [
        (Role.CREATOR, Status.APPROVED, Role.ART_DIRECTOR),  # не бренд
        (Role.BRAND, Status.APPROVED, Role.CREATOR),  # не арт-директор
        (Role.BRAND, Status.PENDING_REVIEW, Role.ART_DIRECTOR),  # бренд не одобрен
        (Role.ART_DIRECTOR, Status.APPROVED, Role.BRAND),  # перепутаны местами
    ],
)
async def test_link_needs_approved_brand_and_art_director(
    admin_client: AsyncClient,
    db_session: AsyncSession,
    brand_role: Role,
    brand_status: Status,
    director_role: Role,
) -> None:
    brand = await add_user(admin_client, db_session, "brand@example.com", brand_role, brand_status)
    director = await add_user(admin_client, db_session, "ad@example.com", director_role)
    await login(admin_client, ADMIN_EMAIL, ADMIN_PASSWORD)

    response = await admin_client.put(link_path(brand, director))

    assert response.status_code == 422
    assert await db_session.scalar(select(func.count()).select_from(AdminAction)) == 0


async def test_link_to_unknown_user_is_rejected(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    director = await add_user(admin_client, db_session, "ad@example.com", Role.ART_DIRECTOR)
    await login(admin_client, ADMIN_EMAIL, ADMIN_PASSWORD)

    assert (await admin_client.put(link_path(uuid.uuid4(), director))).status_code == 422


# --- Креаторы арт-директора ---


async def test_assigns_and_unassigns_creator(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    director = await add_user(admin_client, db_session, "ad@example.com", Role.ART_DIRECTOR)
    creator = await add_user(admin_client, db_session, "creator@example.com", Role.CREATOR)
    await login(admin_client, ADMIN_EMAIL, ADMIN_PASSWORD)

    for _ in range(2):
        assert (await admin_client.put(creator_path(director, creator))).status_code == 204
    links = (await admin_client.get("/api/admin/users")).json()["art_director_creators"]
    assert [(link["art_director_id"], link["creator_id"]) for link in links] == [
        (str(director), str(creator))
    ]

    for _ in range(2):
        assert (await admin_client.delete(creator_path(director, creator))).status_code == 204
    assert (await admin_client.get("/api/admin/users")).json()["art_director_creators"] == []

    rows = await db_session.execute(
        select(AdminAction.action, AdminAction.art_director_id, AdminAction.creator_id).order_by(
            AdminAction.created_at
        )
    )
    assert [tuple(row) for row in rows] == [
        (AdminActionType.ASSIGN_CREATOR, director, creator),
        (AdminActionType.UNASSIGN_CREATOR, director, creator),
    ]


async def test_creator_works_with_several_art_directors(
    admin_client: AsyncClient, db_session: AsyncSession
) -> None:
    first = await add_user(admin_client, db_session, "one@example.com", Role.ART_DIRECTOR)
    second = await add_user(admin_client, db_session, "two@example.com", Role.ART_DIRECTOR)
    creator = await add_user(admin_client, db_session, "creator@example.com", Role.CREATOR)
    await login(admin_client, ADMIN_EMAIL, ADMIN_PASSWORD)

    await admin_client.put(creator_path(first, creator))
    await admin_client.put(creator_path(second, creator))

    links = (await admin_client.get("/api/admin/users")).json()["art_director_creators"]
    assert {link["art_director_id"] for link in links} == {str(first), str(second)}


@pytest.mark.parametrize(
    ("director_role", "creator_role", "creator_status"),
    [
        (Role.BRAND, Role.CREATOR, Status.APPROVED),  # не арт-директор
        (Role.ART_DIRECTOR, Role.BRAND, Status.APPROVED),  # не креатор
        (Role.ART_DIRECTOR, Role.CREATOR, Status.REJECTED),  # креатор не одобрен
        (Role.CREATOR, Role.ART_DIRECTOR, Status.APPROVED),  # перепутаны местами
    ],
)
async def test_creator_link_needs_approved_art_director_and_creator(
    admin_client: AsyncClient,
    db_session: AsyncSession,
    director_role: Role,
    creator_role: Role,
    creator_status: Status,
) -> None:
    director = await add_user(admin_client, db_session, "ad@example.com", director_role)
    creator = await add_user(
        admin_client, db_session, "creator@example.com", creator_role, creator_status
    )
    await login(admin_client, ADMIN_EMAIL, ADMIN_PASSWORD)

    assert (await admin_client.put(creator_path(director, creator))).status_code == 422
    assert await db_session.scalar(select(func.count()).select_from(AdminAction)) == 0
