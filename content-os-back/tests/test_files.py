import mimetypes
from collections.abc import AsyncIterator
from io import BytesIO
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient, Response
from PIL import Image
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, Status, User
from app.core.config import Settings
from app.core.db import get_session
from app.core.storage import get_storage
from app.files.media import DECLARED_IMAGE_TYPES, DECLARED_VIDEO_TYPES
from app.main import create_app
from tests.fakes import FakeStorage, put_presigned

MP4 = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 100
MOV = b"\x00\x00\x00\x14ftypqt  " + b"\x00" * 100
WEBM = b"\x1a\x45\xdf\xa3\x9f\x42\x86\x81\x01\x42\x82\x84webm" + b"\x00" * 100


def image_bytes(image_format: str = "JPEG", size: tuple[int, int] = (800, 600)) -> bytes:
    output = BytesIO()
    Image.new("RGB", size, "red").save(output, format=image_format)
    return output.getvalue()


@pytest.fixture
def storage() -> FakeStorage:
    return FakeStorage()


@pytest.fixture
async def client(
    settings: Settings, db_session: AsyncSession, storage: FakeStorage
) -> AsyncIterator[AsyncClient]:
    """Одобренный бренд с хранилищем в памяти."""
    app = create_app(settings)
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[get_storage] = lambda: storage
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post(
            "/api/auth/signup", json={"email": "brand@example.com", "password": "brand-password"}
        )
        await db_session.execute(update(User).values(role=Role.BRAND, status=Status.APPROVED))
        yield client


def declared_type(filename: str) -> str:
    """Что заявил бы браузер: по расширению; проверяет сервер всё равно по содержимому."""
    guessed, _ = mimetypes.guess_type(filename)
    return guessed if guessed in DECLARED_IMAGE_TYPES | DECLARED_VIDEO_TYPES else "image/jpeg"


async def start(
    client: AsyncClient, data: bytes, filename: str = "file", status: int = 201
) -> dict[str, Any]:
    response = await client.post(
        "/api/uploads",
        json={"name": filename, "size": len(data), "content_type": declared_type(filename)},
    )
    assert response.status_code == status, response.text
    body: dict[str, Any] = response.json()
    return body


async def complete(client: AsyncClient, upload_id: str) -> Response:
    return await client.post(f"/api/uploads/{upload_id}/complete")


async def upload(client: AsyncClient, data: bytes, filename: str = "file") -> dict[str, str]:
    """Как браузер: заявка, PUT прямо в хранилище, проверка (docs/adr/0013)."""
    ticket = await start(client, data, filename)
    put_presigned(ticket["url"], data, ticket["headers"]["Content-Type"])
    response = await complete(client, ticket["id"])
    assert response.status_code == 200, response.text
    body: dict[str, str] = response.json()
    return body


async def test_image_is_reencoded_to_private_webp(
    client: AsyncClient, storage: FakeStorage
) -> None:
    body = await upload(client, image_bytes(size=(4000, 3000)), "photo.jpg")

    assert body["kind"] == "image"
    assert body["content_type"] == "image/webp"
    # The browser's original is gone: only the WebP stays.
    [(key, (data, content_type))] = storage.files.items()
    assert key.startswith("files/")
    assert key.endswith(".webp")
    assert content_type == "image/webp"
    assert storage.public == set()
    assert body["url"] == storage.presigned_url(key)
    with Image.open(BytesIO(data)) as image:
        assert image.format == "WEBP"
        assert image.size == (2560, 1920)


@pytest.mark.parametrize(
    ("data", "content_type", "extension"),
    [(MP4, "video/mp4", "mp4"), (MOV, "video/quicktime", "mov"), (WEBM, "video/webm", "webm")],
)
async def test_videos_are_copied_as_is(
    client: AsyncClient, storage: FakeStorage, data: bytes, content_type: str, extension: str
) -> None:
    body = await upload(client, data, "clip.bin")

    assert body["kind"] == "video"
    assert body["content_type"] == content_type
    [(key, stored)] = storage.files.items()
    assert key.startswith("files/")
    assert key.endswith(f".{extension}")
    assert stored == (data, content_type)


async def test_ticket_is_a_presigned_put_for_the_declared_type(
    client: AsyncClient, storage: FakeStorage
) -> None:
    ticket = await start(client, image_bytes(), "photo.jpg")

    assert ticket["headers"] == {"Content-Type": "image/jpeg"}
    assert ticket["url"].startswith(f"http://storage.test/{storage.number}/uploads/")
    # Nothing is a file until it is checked: a product can't take it yet.
    body = {"name": "Linen shirt", "about": "Summer linen shirt", "photo_ids": [ticket["id"]]}
    response = await client.post("/api/products", json=body)
    assert response.json()["detail"] == "Unknown file"
    put_presigned(ticket["url"], image_bytes())
    assert (await complete(client, ticket["id"])).status_code == 200
    assert (await client.post("/api/products", json=body)).status_code == 201


@pytest.mark.parametrize(
    ("declared", "size", "status"),
    [
        ("image/gif", 100, 422),
        ("application/pdf", 100, 422),
        ("image/jpeg", 15 * 1024 * 1024 + 1, 413),
        ("video/mp4", 100 * 1024 * 1024 + 1, 413),
    ],
)
async def test_start_turns_away_what_cannot_pass(
    client: AsyncClient, declared: str, size: int, status: int
) -> None:
    response = await client.post(
        "/api/uploads", json={"name": "a", "size": size, "content_type": declared}
    )

    assert response.status_code == status


@pytest.mark.parametrize(
    ("data", "status"),
    [
        (b"<html>not an image</html>", 422),
        (image_bytes("GIF"), 422),
        (image_bytes()[:200], 422),
        (b"\xff\xd8\xff" + b"\x00" * (15 * 1024 * 1024), 413),
    ],
)
async def test_type_and_size_come_from_the_stored_file(
    client: AsyncClient, storage: FakeStorage, data: bytes, status: int
) -> None:
    # The browser claimed a small JPEG and sent something else.
    ticket = await start(client, b"small", "photo.jpg")
    put_presigned(ticket["url"], data)

    response = await complete(client, ticket["id"])

    assert response.status_code == status
    # A rejected upload is deleted with its row.
    assert storage.files == {}
    assert (await complete(client, ticket["id"])).status_code == 404


async def test_complete_waits_for_the_file_and_repeats_safely(client: AsyncClient) -> None:
    ticket = await start(client, MP4, "walk.mp4")
    assert (await complete(client, ticket["id"])).status_code == 409

    put_presigned(ticket["url"], MP4)
    first = await complete(client, ticket["id"])
    again = await complete(client, ticket["id"])
    assert first.status_code == again.status_code == 200
    assert first.json()["id"] == again.json()["id"]


async def test_only_the_uploader_completes(client: AsyncClient, db_session: AsyncSession) -> None:
    ticket = await start(client, MP4, "walk.mp4")
    put_presigned(ticket["url"], MP4)
    await client.post("/api/auth/logout")
    await client.post(
        "/api/auth/signup", json={"email": "other@example.com", "password": "other-password"}
    )
    await db_session.execute(
        update(User)
        .where(User.email == "other@example.com")
        .values(role=Role.BRAND, status=Status.APPROVED)
    )

    assert (await complete(client, ticket["id"])).status_code == 404


async def test_upload_needs_approved_account(client: AsyncClient, db_session: AsyncSession) -> None:
    await db_session.execute(update(User).values(status=Status.PENDING_REVIEW))

    response = await client.post(
        "/api/uploads", json={"name": "a.jpg", "size": 10, "content_type": "image/jpeg"}
    )

    assert response.status_code == 403
