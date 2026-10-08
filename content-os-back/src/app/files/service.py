"""Загруженные файлы: передача в продукт или референс и уборка неиспользованных.

Коммитит вызывающий.
"""

import uuid
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import Column, delete, exists, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.db import Base
from app.files.models import StoredFile


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
            select(StoredFile).where(StoredFile.id.in_(ids), StoredFile.owner_id == owner.id)
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
    """Удаляет файлы, загруженные до uploaded_before и нигде не использованные.

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
