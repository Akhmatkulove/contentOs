import logging
import uuid

from fastapi import APIRouter, HTTPException, UploadFile, status
from starlette.concurrency import run_in_threadpool

from app.auth.deps import CurrentUser
from app.auth.schemas import MeResponse
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.core.storage import Storage, StorageDep
from app.profile.images import MAX_UPLOAD_BYTES, InvalidImageError, make_avatar

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/me/photo", tags=["profile"])


async def _delete_quietly(storage: Storage, key: str | None) -> None:
    # Старый файл больше ни на что не ссылается; если удалить не вышло, это только мусор.
    if key is None:
        return
    try:
        await storage.delete(key)
    except Exception:
        logger.exception("Could not delete %s", key)


@router.put("")
async def upload_photo(
    photo: UploadFile,
    user: CurrentUser,
    db: SessionDep,
    settings: SettingsDep,
    storage: StorageDep,
) -> MeResponse:
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
    await _delete_quietly(storage, old_key)
    return MeResponse.of(user, settings)


@router.delete("")
async def delete_photo(
    user: CurrentUser, db: SessionDep, settings: SettingsDep, storage: StorageDep
) -> MeResponse:
    old_key, user.photo_key = user.photo_key, None
    await db.commit()
    await _delete_quietly(storage, old_key)
    return MeResponse.of(user, settings)
