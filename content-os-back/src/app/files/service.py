"""Загруженные файлы: передача в продукт или референс. Коммитит вызывающий."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.files.models import StoredFile
from app.products.models import ProductPhoto
from app.references.models import ReferenceFile


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
        union_all(
            select(ProductPhoto.file_id).where(ProductPhoto.file_id.in_(ids)),
            select(ReferenceFile.file_id).where(ReferenceFile.file_id.in_(ids)),
        ).limit(1)
    )
    if used is not None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "File is already used")
    return files
