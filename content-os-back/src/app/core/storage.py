"""Файлы в S3-совместимом хранилище (MinIO, AWS S3, R2, Yandex Object Storage…)."""

import logging
from typing import TYPE_CHECKING, Annotated, Protocol

import boto3
from botocore.exceptions import ClientError
from fastapi import Depends, HTTPException, Request, status
from starlette.concurrency import run_in_threadpool

from app.core.config import Settings

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client

logger = logging.getLogger(__name__)

# Приватные файлы (files/) читаются по presigned URL столько времени.
PRESIGN_TTL_SECONDS = 60 * 60
# Столько живёт ссылка, по которой браузер кладёт файл в хранилище сам (docs/adr/0013).
UPLOAD_TTL_SECONDS = 15 * 60
# Ключи неизменяемые: файл по ключу не меняется, кэшировать можно навсегда.
PRIVATE_CACHE = "private, max-age=31536000, immutable"
PUBLIC_CACHE = "public, max-age=31536000, immutable"


class Storage(Protocol):
    async def put(self, key: str, data: bytes, content_type: str, *, public: bool = False) -> None:
        """public — файл из публичного префикса (avatars/), его можно кэшировать где угодно."""
        ...

    async def delete(self, key: str) -> None: ...

    def presigned_url(self, key: str) -> str:
        """Временная ссылка на приватный файл. Считается локально, без запроса в S3."""
        ...

    def presigned_put_url(self, key: str, content_type: str) -> str:
        """Ссылка, по которой браузер кладёт файл сам (PUT с этим Content-Type)."""
        ...

    async def size(self, key: str) -> int | None:
        """Размер файла в байтах; None, если его нет."""
        ...

    async def read(self, key: str, length: int | None = None) -> bytes:
        """Файл целиком или первые length байт."""
        ...

    async def copy(self, source: str, target: str, content_type: str) -> None:
        """Копия внутри хранилища, без скачивания: для больших файлов (видео)."""
        ...


async def delete_quietly(storage: Storage, *keys: str | None) -> None:
    """Удаляет файлы, на которые больше ничто не ссылается: после commit.

    Если удалить не вышло, остаётся только мусор в хранилище — ошибка в лог, не клиенту.
    """
    for key in keys:
        if key is None:
            continue
        try:
            await storage.delete(key)
        except Exception:
            logger.exception("Could not delete %s", key)


def public_url(settings: Settings, key: str | None) -> str | None:
    """URL файла из публичного префикса (например, avatars/)."""
    if key is None or settings.s3_public_url is None:
        return None
    return f"{settings.s3_public_url.rstrip('/')}/{key}"


def _client(settings: Settings, endpoint_url: str | None) -> "S3Client":
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        region_name=settings.s3_region,
        aws_access_key_id=(
            settings.s3_access_key.get_secret_value() if settings.s3_access_key else None
        ),
        aws_secret_access_key=(
            settings.s3_secret_key.get_secret_value() if settings.s3_secret_key else None
        ),
    )


class S3Storage:
    def __init__(self, settings: Settings, bucket: str) -> None:
        self._bucket = bucket
        self._client = _client(settings, settings.s3_endpoint_url)
        # Подпись включает хост: ссылки для браузера подписываем его адресом хранилища.
        self._presign_client = _client(
            settings, settings.s3_presign_endpoint_url or settings.s3_endpoint_url
        )

    # boto3 синхронный, поэтому вызовы уходят в пул потоков.
    async def put(self, key: str, data: bytes, content_type: str, *, public: bool = False) -> None:
        await run_in_threadpool(
            self._client.put_object,
            Bucket=self._bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
            CacheControl=PUBLIC_CACHE if public else PRIVATE_CACHE,
        )

    async def delete(self, key: str) -> None:
        await run_in_threadpool(self._client.delete_object, Bucket=self._bucket, Key=key)

    def presigned_url(self, key: str) -> str:
        return self._presign_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=PRESIGN_TTL_SECONDS,
        )

    def presigned_put_url(self, key: str, content_type: str) -> str:
        # Content-Type входит в подпись: браузер должен прислать именно его.
        return self._presign_client.generate_presigned_url(
            "put_object",
            Params={"Bucket": self._bucket, "Key": key, "ContentType": content_type},
            ExpiresIn=UPLOAD_TTL_SECONDS,
        )

    async def size(self, key: str) -> int | None:
        try:
            head = await run_in_threadpool(self._client.head_object, Bucket=self._bucket, Key=key)
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                return None
            raise
        return head["ContentLength"]

    async def read(self, key: str, length: int | None = None) -> bytes:
        def get() -> bytes:
            if length is None:
                response = self._client.get_object(Bucket=self._bucket, Key=key)
            else:
                response = self._client.get_object(
                    Bucket=self._bucket, Key=key, Range=f"bytes=0-{length - 1}"
                )
            return response["Body"].read()

        return await run_in_threadpool(get)

    async def copy(self, source: str, target: str, content_type: str) -> None:
        await run_in_threadpool(
            self._client.copy_object,
            Bucket=self._bucket,
            Key=target,
            CopySource={"Bucket": self._bucket, "Key": source},
            # Свои метаданные вместо тех, что прислал браузер.
            MetadataDirective="REPLACE",
            ContentType=content_type,
            CacheControl=PRIVATE_CACHE,
        )


def build_storage(settings: Settings) -> Storage | None:
    if settings.s3_bucket is None:
        return None
    return S3Storage(settings, settings.s3_bucket)


def get_storage(request: Request) -> Storage:
    storage: Storage | None = request.app.state.storage
    if storage is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File storage is not configured")
    return storage


StorageDep = Annotated[Storage, Depends(get_storage)]
