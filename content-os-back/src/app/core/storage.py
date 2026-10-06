"""Файлы в S3-совместимом хранилище (MinIO, AWS S3, R2, Yandex Object Storage…)."""

from typing import TYPE_CHECKING, Annotated, BinaryIO, Protocol

import boto3
from fastapi import Depends, HTTPException, Request, status
from starlette.concurrency import run_in_threadpool

from app.core.config import Settings

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client


# Приватные файлы (files/) читаются по presigned URL столько времени.
PRESIGN_TTL_SECONDS = 60 * 60


class Storage(Protocol):
    async def put(self, key: str, data: bytes, content_type: str, *, public: bool = False) -> None:
        """public — файл из публичного префикса (avatars/), его можно кэшировать где угодно."""
        ...

    async def put_stream(self, key: str, stream: BinaryIO, content_type: str) -> None:
        """Как put, но читает по частям: для больших файлов (видео)."""
        ...

    async def delete(self, key: str) -> None: ...

    def presigned_url(self, key: str) -> str:
        """Временная ссылка на приватный файл. Считается локально, без запроса в S3."""
        ...


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
            # Ключи уникальные и не переиспользуются, поэтому кэшировать можно навсегда.
            CacheControl=f"{'public' if public else 'private'}, max-age=31536000, immutable",
        )

    async def put_stream(self, key: str, stream: BinaryIO, content_type: str) -> None:
        await run_in_threadpool(
            self._client.upload_fileobj,
            stream,
            self._bucket,
            key,
            ExtraArgs={
                "ContentType": content_type,
                "CacheControl": "private, max-age=31536000, immutable",
            },
        )

    async def delete(self, key: str) -> None:
        await run_in_threadpool(self._client.delete_object, Bucket=self._bucket, Key=key)

    def presigned_url(self, key: str) -> str:
        return self._presign_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self._bucket, "Key": key},
            ExpiresIn=PRESIGN_TTL_SECONDS,
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
