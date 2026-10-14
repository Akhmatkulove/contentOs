"""Загруженные файлы: проверка после прямой загрузки, передача в продукт или референс
и уборка неиспользованных.

Коммитит вызывающий.
"""

import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Column, delete, exists, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.auth.models import User
from app.core.db import Base
from app.core.storage import Storage
from app.files.media import (
    ALLOWED_MESSAGE,
    MAX_IMAGE_BYTES,
    MAX_VIDEO_BYTES,
    InvalidFileError,
    is_image,
    prepare_image,
    sniff_video,
)
from app.files.models import FileKind, StoredFile


class RejectedUploadError(HTTPException):
    """Файл не прошёл проверку: вызывающий удаляет и строку, и загруженное."""


async def finish_upload(stored: StoredFile, storage: Storage) -> None:
    """Проверяет то, что браузер положил по presigned URL, и переносит на постоянный ключ.

    Тип — по первым байтам, размер — по хранилищу, а не по словам клиента. Фото
    перекодируется в WebP без EXIF, видео копируется внутри хранилища. Временный ключ
    вызывающий удаляет после commit.
    """
    size = await storage.size(stored.key)
    if size is None:
        # Строку не трогаем: браузер мог ещё не дослать файл и повторит.
        raise HTTPException(status.HTTP_409_CONFLICT, "The file has not been uploaded")
    head = await storage.read(stored.key, 64)
    video = sniff_video(head)
    if is_image(head):
        if size > MAX_IMAGE_BYTES:
            raise RejectedUploadError(
                status.HTTP_413_CONTENT_TOO_LARGE, "Image must be at most 15 MB"
            )
        try:
            prepared = await run_in_threadpool(prepare_image, await storage.read(stored.key))
        except InvalidFileError as exc:
            raise RejectedUploadError(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
        key = f"files/{uuid.uuid4()}.webp"
        await storage.put(key, prepared, "image/webp")
        stored.kind, stored.content_type, stored.size = FileKind.IMAGE, "image/webp", len(prepared)
    elif video is not None:
        if size > MAX_VIDEO_BYTES:
            raise RejectedUploadError(
                status.HTTP_413_CONTENT_TOO_LARGE, "Video must be at most 100 MB"
            )
        key = f"files/{uuid.uuid4()}.{video.extension}"
        await storage.copy(stored.key, key, video.content_type)
        stored.kind, stored.content_type, stored.size = FileKind.VIDEO, video.content_type, size
    else:
        raise RejectedUploadError(status.HTTP_422_UNPROCESSABLE_CONTENT, ALLOWED_MESSAGE)
    stored.key = key
    stored.pending = False


def _links() -> list[Column[Any]]:
    """Колонки, которые ссылаются на файл (ForeignKey на files.id): файл с такой ссылкой занят.

    Берутся из метаданных, а не перечисляются: файлы новой модели учитываются сами,
    и уборка их не удалит. Модели к этому времени импортированы приложением.
    """
    file_id = StoredFile.__table__.c.id
    return [
        column
        for table in Base.metadata.tables.values()
        for column in table.columns
        if any(key.column is file_id for key in column.foreign_keys)
    ]


async def claim_files(
    db: AsyncSession, owner: User, ids: list[uuid.UUID]
) -> dict[uuid.UUID, StoredFile]:
    """Файлы, которые owner загрузил сам и ещё нигде не использовал."""
    files = {
        file.id: file
        for file in await db.scalars(
            select(StoredFile).where(
                StoredFile.id.in_(ids),
                StoredFile.owner_id == owner.id,
                # Не проверенный после загрузки файл ещё не файл.
                StoredFile.pending.is_(False),
            )
        )
    }
    # Чужой файл отвечает так же, как несуществующий: не подтверждаем, что он есть.
    if len(files) != len(set(ids)):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Unknown file")
    used = await db.scalar(
        union_all(*(select(column).where(column.in_(ids)) for column in _links())).limit(1)
    )
    if used is not None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "File is already used")
    return files


async def delete_unused(db: AsyncSession, uploaded_before: datetime) -> list[str]:
    """Удаляет файлы, загруженные до uploaded_before и нигде не использованные, в том числе
    так и не проверенные (браузер не дослал файл или не позвал complete).

    Возвращает их ключи: файлы из хранилища вызывающий удаляет после commit.
    """
    unused = [~exists().where(column == StoredFile.id) for column in _links()]
    return list(
        await db.scalars(
            delete(StoredFile)
            .where(StoredFile.created_at < uploaded_before, *unused)
            .returning(StoredFile.key)
        )
    )
