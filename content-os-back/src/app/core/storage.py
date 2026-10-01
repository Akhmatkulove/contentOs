"""Файлы в S3-совместимом хранилище (MinIO, AWS S3, R2, Yandex Object Storage…)."""

from typing import TYPE_CHECKING, Annotated, Protocol

import boto3
from fastapi import Depends, HTTPException, Request, status
from starlette.concurrency import run_in_threadpool

from app.core.config import Settings

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client


class Storage(Protocol):
    async def put(self, key: str, data: bytes, content_type: str) -> None: ...

    async def delete(self, key: str) -> None: ...


def public_url(settings: Settings, key: str | None) -> str | None:
    """URL файла из публичного префикса (например, avatars/)."""
    if key is None or settings.s3_public_url is None:
        return None
    return f"{settings.s3_public_url.rstrip('/')}/{key}"


class S3Storage:
    def __init__(self, settings: Settings, bucket: str) -> None:
        self._bucket = bucket
        self._client: S3Client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            region_name=settings.s3_region,
            aws_access_key_id=(
                settings.s3_access_key.get_secret_value() if settings.s3_access_key else None
            ),
            aws_secret_access_key=(
                settings.s3_secret_key.get_secret_value() if settings.s3_secret_key else None
            ),
        )

    # boto3 синхронный, поэтому вызовы уходят в пул потоков.
    async def put(self, key: str, data: bytes, content_type: str) -> None:
        await run_in_threadpool(
            self._client.put_object,
            Bucket=self._bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
            # Ключи уникальные и не переиспользуются, поэтому кэшировать можно навсегда.
            CacheControl="public, max-age=31536000, immutable",
        )

    async def delete(self, key: str) -> None:
        await run_in_threadpool(self._client.delete_object, Bucket=self._bucket, Key=key)


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
