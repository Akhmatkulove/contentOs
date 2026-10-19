import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.auth.deps import ApprovedUser
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.core.storage import StorageDep
from app.notifications import service
from app.notifications.schemas import NotificationList

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    user: ApprovedUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> NotificationList:
    """Последние уведомления пользователя и число непрочитанных (docs/adr/0020)."""
    return await service.list_notifications(db, user, storage, settings, limit)


@router.post("/read", status_code=status.HTTP_204_NO_CONTENT)
async def read_all(user: ApprovedUser, db: SessionDep) -> None:
    """Mark all as read."""
    await service.mark_read(db, user, None)
    await db.commit()


@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def read_one(notification_id: uuid.UUID, user: ApprovedUser, db: SessionDep) -> None:
    """Прочитано одно, например по клику; чужое — 404."""
    await service.mark_read(db, user, notification_id)
    await db.commit()
