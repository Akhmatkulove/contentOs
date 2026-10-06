from collections.abc import AsyncIterator
from io import BytesIO

import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, Status, User
from app.core.config import Settings
from app.core.db import get_session
from app.core.storage import get_storage
from app.main import create_app
from tests.fakes import FakeStorage

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


async def upload(client: AsyncClient, data: bytes, filename: str = "file") -> dict[str, str]:
    response = await client.post("/api/uploads", files={"file": (filename, data)})
    assert response.status_code == 201, response.text
    body: dict[str, str] = response.json()
    return body


async def test_image_is_reencoded_to_private_webp(
    client: AsyncClient, storage: FakeStorage
) -> None:
    body = await upload(client, image_bytes(size=(4000, 3000)), "photo.jpg")

    assert body["kind"] == "image"
    assert body["content_type"] == "image/webp"
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
async def test_videos_are_stored_as_is(
    client: AsyncClient, storage: FakeStorage, data: bytes, content_type: str, extension: str
) -> None:
    body = await upload(client, data, "clip.bin")

    assert body["kind"] == "video"
    assert body["content_type"] == content_type
    [(key, stored)] = storage.files.items()
    assert key.endswith(f".{extension}")
    assert stored == (data, content_type)


async def test_type_comes_from_content_not_name(client: AsyncClient) -> None:
    response = await client.post(
        "/api/uploads", files={"file": ("photo.jpg", b"<html>not an image</html>", "image/jpeg")}
    )

    assert response.status_code == 422


async def test_gif_is_rejected(client: AsyncClient) -> None:
    response = await client.post("/api/uploads", files={"file": ("a.gif", image_bytes("GIF"))})

    assert response.status_code == 422


async def test_broken_image_is_rejected(client: AsyncClient) -> None:
    broken = image_bytes()[:200]

    response = await client.post("/api/uploads", files={"file": ("a.jpg", broken)})

    assert response.status_code == 422


async def test_image_over_15_mb_is_rejected(client: AsyncClient) -> None:
    big = b"\xff\xd8\xff" + b"\x00" * (15 * 1024 * 1024)

    response = await client.post("/api/uploads", files={"file": ("a.jpg", big)})

    assert response.status_code == 413


async def test_upload_needs_approved_account(client: AsyncClient, db_session: AsyncSession) -> None:
    await db_session.execute(update(User).values(status=Status.PENDING_REVIEW))

    response = await client.post("/api/uploads", files={"file": ("a.jpg", image_bytes())})

    assert response.status_code == 403
