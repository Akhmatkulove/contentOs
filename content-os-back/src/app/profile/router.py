import uuid

from fastapi import APIRouter, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.auth.deps import CurrentUser
from app.auth.schemas import MeResponse
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.core.storage import StorageDep, delete_quietly
from app.profile.images import MAX_UPLOAD_BYTES, InvalidImageError, make_avatar

router = APIRouter(prefix="/me/photo", tags=["profile"])


@router.put("")
async def upload_photo(
    photo: UploadFile,
    user: CurrentUser,
    db: SessionDep,
    settings: SettingsDep,
    storage: StorageDep,
) -> MeResponse:
    # Транзакцию, открытую проверкой сессии, не держим, пока идёт обработка и загрузка.
    await db.commit()
    data = await photo.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Photo must be at most 5 MB")
    try:
        avatar = await run_in_threadpool(make_avatar, data)
    except InvalidImageError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(exc)) from exc

    # Новый ключ на каждую загрузку: URL можно кэшировать навсегда.
    key = f"avatars/{uuid.uuid4()}.webp"
    await storage.put(key, avatar, "image/webp")
    old_key, user.photo_key = user.photo_key, key
    await db.commit()
    await delete_quietly(storage, old_key)
    return MeResponse.of(user, settings)
