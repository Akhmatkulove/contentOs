import uuid
from datetime import timedelta

from fastapi import APIRouter, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.auth.deps import ApprovedUser
from app.core import rate_limit
from app.core.db import SessionDep
from app.core.storage import StorageDep
from app.files.media import (
    MAX_IMAGE_BYTES,
    MAX_VIDEO_BYTES,
    InvalidFileError,
    is_image,
    prepare_image,
    sniff_video,
)
from app.files.models import FileKind, StoredFile
from app.files.schemas import FileResponse

router = APIRouter(tags=["files"])

UPLOADS_PER_USER = 300
UPLOAD_WINDOW = timedelta(hours=1)


@router.post("/uploads", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile, user: ApprovedUser, db: SessionDep, storage: StorageDep
) -> FileResponse:
    """Загружает один файл. Дальше его id передают в продукт или референс (docs/adr/0003)."""
    await rate_limit.check(db, f"upload:{user.id}", UPLOADS_PER_USER, UPLOAD_WINDOW)

    # Тип по первым байтам, а не по имени файла или Content-Type от клиента.
    head = await file.read(64)
    await file.seek(0)
    video = sniff_video(head)
    size = file.size or 0
    if is_image(head):
        if size > MAX_IMAGE_BYTES:
            raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Image must be at most 15 MB")
        data = await file.read(MAX_IMAGE_BYTES + 1)
        if len(data) > MAX_IMAGE_BYTES:
            raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Image must be at most 15 MB")
        try:
            prepared = await run_in_threadpool(prepare_image, data)
        except InvalidFileError as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc
        stored = StoredFile(
            owner_id=user.id,
            key=f"files/{uuid.uuid4()}.webp",
            kind=FileKind.IMAGE,
            content_type="image/webp",
            size=len(prepared),
        )
        await storage.put(stored.key, prepared, stored.content_type)
    elif video is not None:
        if size > MAX_VIDEO_BYTES:
            raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Video must be at most 100 MB")
        stored = StoredFile(
            owner_id=user.id,
            key=f"files/{uuid.uuid4()}.{video.extension}",
            kind=FileKind.VIDEO,
            content_type=video.content_type,
            size=size,
        )
        await storage.put_stream(stored.key, file.file, stored.content_type)
    else:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "Only JPEG, PNG, WebP images and MP4, MOV, WebM videos are allowed",
        )

    db.add(stored)
    await db.commit()
    return FileResponse.of(stored, storage)
