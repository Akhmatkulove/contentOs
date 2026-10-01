from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from io import BytesIO

import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.db import get_session
from app.core.storage import get_storage
from app.main import create_app

PUBLIC_URL = "http://files.test/contentos"


@dataclass
class FakeStorage:
    files: dict[str, tuple[bytes, str]] = field(default_factory=dict)

    async def put(self, key: str, data: bytes, content_type: str) -> None:
        self.files[key] = (data, content_type)

    async def delete(self, key: str) -> None:
        self.files.pop(key, None)


@pytest.fixture
def storage() -> FakeStorage:
    return FakeStorage()


@pytest.fixture
async def client(
    settings: Settings, db_session: AsyncSession, storage: FakeStorage
) -> AsyncIterator[AsyncClient]:
    app = create_app(settings.model_copy(update={"s3_public_url": PUBLIC_URL}))
    app.dependency_overrides[get_session] = lambda: db_session
    app.dependency_overrides[get_storage] = lambda: storage
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post(
            "/api/auth/signup", json={"email": "anna@example.com", "password": "anna-password"}
        )
        yield client


def image_bytes(
    image_format: str = "JPEG",
    size: tuple[int, int] = (800, 600),
    mode: str = "RGB",
    color: str | tuple[int, ...] = "red",
    **save: object,
) -> bytes:
    output = BytesIO()
    Image.new(mode, size, color).save(output, format=image_format, **save)
    return output.getvalue()


async def upload(client: AsyncClient, data: bytes, filename: str = "me.jpg") -> dict[str, str]:
    response = await client.put("/api/me/photo", files={"photo": (filename, data, "image/jpeg")})
    assert response.status_code == 200, response.text
    body: dict[str, str] = response.json()
    return body


def stored_avatar(storage: FakeStorage, url: str) -> Image.Image:
    key = url.removeprefix(f"{PUBLIC_URL}/")
    data, content_type = storage.files[key]
    assert content_type == "image/webp"
    return Image.open(BytesIO(data))


async def test_new_user_has_no_photo(client: AsyncClient) -> None:
    assert (await client.get("/api/me")).json()["photo_url"] is None


async def test_upload_stores_square_webp_avatar(client: AsyncClient, storage: FakeStorage) -> None:
    me = await upload(client, image_bytes(size=(1200, 800)))

    assert me["photo_url"].startswith(f"{PUBLIC_URL}/avatars/")
    assert (await client.get("/api/me")).json()["photo_url"] == me["photo_url"]
    avatar = stored_avatar(storage, me["photo_url"])
    assert avatar.format == "WEBP"
    assert avatar.size == (512, 512)


async def test_png_with_transparency_is_accepted(client: AsyncClient, storage: FakeStorage) -> None:
    me = await upload(client, image_bytes("PNG", mode="RGBA", color=(255, 0, 0, 0)), "me.png")

    assert stored_avatar(storage, me["photo_url"]).mode == "RGBA"


async def test_exif_is_stripped_and_orientation_applied(
    client: AsyncClient, storage: FakeStorage
) -> None:
    exif = Image.Exif()
    exif[0x0112] = 6  # Orientation: повернуть на 90°
    exif[0x8825] = {2: (55.0, 45.0, 0.0)}  # GPSInfo: широта
    data = image_bytes(exif=exif)

    me = await upload(client, data)

    avatar = stored_avatar(storage, me["photo_url"])
    assert not avatar.getexif()
    assert "exif" not in avatar.info


async def test_replacing_photo_deletes_old_file(client: AsyncClient, storage: FakeStorage) -> None:
    first = await upload(client, image_bytes())
    second = await upload(client, image_bytes())

    assert first["photo_url"] != second["photo_url"]
    assert list(storage.files) == [second["photo_url"].removeprefix(f"{PUBLIC_URL}/")]


async def test_delete_photo(client: AsyncClient, storage: FakeStorage) -> None:
    await upload(client, image_bytes())

    response = await client.delete("/api/me/photo")

    assert response.json()["photo_url"] is None
    assert storage.files == {}


@pytest.mark.parametrize(
    "data",
    [
        b"definitely not an image",
        image_bytes("GIF", mode="P"),
        image_bytes("WEBP"),
    ],
)
async def test_only_jpeg_and_png_are_accepted(
    client: AsyncClient, storage: FakeStorage, data: bytes
) -> None:
    # Content-Type и расширение врут: проверяется содержимое.
    response = await client.put("/api/me/photo", files={"photo": ("me.jpg", data, "image/jpeg")})

    assert response.status_code == 422
    assert storage.files == {}


async def test_too_large_file_is_rejected(client: AsyncClient, storage: FakeStorage) -> None:
    data = image_bytes() + b"\0" * (5 * 1024 * 1024)

    response = await client.put("/api/me/photo", files={"photo": ("me.jpg", data, "image/jpeg")})

    assert response.status_code == 413
    assert storage.files == {}


async def test_huge_resolution_is_rejected_before_decoding(client: AsyncClient) -> None:
    # Маленький файл, но 50 Мпикс после распаковки.
    data = image_bytes("PNG", size=(10_000, 5_000), mode="1", optimize=True)

    response = await client.put("/api/me/photo", files={"photo": ("me.png", data, "image/png")})

    assert response.status_code == 422


async def test_photo_requires_session(client: AsyncClient) -> None:
    client.cookies.clear()

    response = await client.put(
        "/api/me/photo", files={"photo": ("me.jpg", image_bytes(), "image/jpeg")}
    )

    assert response.status_code == 401


async def test_photo_upload_is_absent_without_storage(
    settings: Settings, db_session: AsyncSession
) -> None:
    app = create_app(settings)
    app.dependency_overrides[get_session] = lambda: db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await client.post(
            "/api/auth/signup", json={"email": "anna@example.com", "password": "anna-password"}
        )
        response = await client.put(
            "/api/me/photo", files={"photo": ("me.jpg", image_bytes(), "image/jpeg")}
        )

    assert response.status_code == 404
