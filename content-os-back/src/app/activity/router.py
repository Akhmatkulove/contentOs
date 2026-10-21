from typing import Annotated

from fastapi import APIRouter, Query

from app.activity import service
from app.activity.schemas import ActivityList
from app.auth.deps import ApprovedUser
from app.core.config import SettingsDep
from app.core.db import SessionDep

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("")
async def list_activity(
    user: ApprovedUser,
    db: SessionDep,
    settings: SettingsDep,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    cursor: Annotated[str | None, Query(max_length=200)] = None,
) -> ActivityList:
    """Лента Activity (docs/adr/0027): события съёмок пользователя, новые первыми.

    Следующая страница — с `cursor` из `next_cursor` предыдущей.
    """
    return await service.list_activity(db, user, settings, limit, cursor)
