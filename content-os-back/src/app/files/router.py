import uuid
from datetime import timedelta

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.auth.deps import ApprovedUser
from app.core import rate_limit
from app.core.db import SessionDep
from app.core.storage import StorageDep, delete_quietly
from app.files import service
from app.files.media import (
    ALLOWED_MESSAGE,
    DECLARED_IMAGE_TYPES,
    DECLARED_VIDEO_TYPES,
    MAX_IMAGE_BYTES,
    MAX_VIDEO_BYTES,
)
from app.files.models import FileKind, StoredFile
from app.files.schemas import FileResponse, UploadStart, UploadTicket

router = APIRouter(tags=["files"])

UPLOADS_PER_USER = 300
UPLOAD_WINDOW = timedelta(hours=1)


@router.post("/uploads", status_code=status.HTTP_201_CREATED)
async def start_upload(
    body: UploadStart, user: ApprovedUser, db: SessionDep, storage: StorageDep
) -> UploadTicket:
    """Ссылка, по которой браузер кладёт файл прямо в хранилище (docs/adr/0013).

    Тип и размер здесь со слов клиента: только чтобы не гонять заведомо лишнее.
    Настоящая проверка — в POST /api/uploads/{id}/complete.
    """
    await rate_limit.check(db, f"upload:{user.id}", UPLOADS_PER_USER, UPLOAD_WINDOW)
    if body.content_type in DECLARED_IMAGE_TYPES:
        kind, limit, label = FileKind.IMAGE, MAX_IMAGE_BYTES, "Image must be at most 15 MB"
    elif body.content_type in DECLARED_VIDEO_TYPES:
        kind, limit, label = FileKind.VIDEO, MAX_VIDEO_BYTES, "Video must be at most 100 MB"
    else:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, ALLOWED_MESSAGE)
    if body.size > limit:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, label)

    stored = StoredFile(
        owner_id=user.id,
        key=f"uploads/{uuid.uuid4()}",
        kind=kind,
        content_type=body.content_type,
        size=body.size,
        name=body.name,
        pending=True,
    )
    db.add(stored)
    await db.commit()
    return UploadTicket(
        id=stored.id,
        url=storage.presigned_put_url(stored.key, body.content_type),
        headers={"Content-Type": body.content_type},
    )


@router.post("/uploads/{file_id}/complete")
async def complete_upload(
    file_id: uuid.UUID, user: ApprovedUser, db: SessionDep, storage: StorageDep
) -> FileResponse:
    """Проверяет файл в хранилище по содержимому. Дальше его id передают в продукт,
    референс или задачу (docs/adr/0003).

    Фото перекодируется в WebP без EXIF, видео копируется на постоянный ключ. Не прошедший
    проверку файл удаляется. Повтор для уже проверенного файла отдаёт его же.
    """
    stored = await db.scalar(
        select(StoredFile)
        .where(StoredFile.id == file_id, StoredFile.owner_id == user.id)
        .with_for_update()
    )
    if stored is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Upload not found")
    if not stored.pending:
        return FileResponse.of(stored, storage)

    uploaded_key = stored.key
    try:
        await service.finish_upload(stored, storage)
    except service.RejectedUploadError as exc:
        await db.delete(stored)
        await db.commit()
        await delete_quietly(storage, uploaded_key)
        raise HTTPException(exc.status_code, exc.detail) from exc
    await db.commit()
    await delete_quietly(storage, uploaded_key)
    return FileResponse.of(stored, storage)
