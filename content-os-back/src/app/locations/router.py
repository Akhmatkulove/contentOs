import logging
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.auth.deps import ApprovedUser
from app.core import rate_limit
from app.core.db import SessionDep
from app.locations.geosuggest import GeosuggestDep, GeosuggestError
from app.locations.schemas import LocationSuggestion

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/locations", tags=["locations"])

# Подсказки нужны с пары букв: по одной Яндекс отдаёт шум и тратит суточную квоту.
MIN_QUERY_LENGTH = 2
# Фронт шлёт запрос не чаще раза в 300 мс набора; лимит защищает квоту от скриптов.
SUGGESTS_PER_USER = 60
SUGGEST_WINDOW = timedelta(minutes=1)


@router.get("/suggest")
async def suggest_locations(
    user: ApprovedUser,
    db: SessionDep,
    geosuggest: GeosuggestDep,
    q: Annotated[str, Query(max_length=200)] = "",
) -> list[LocationSuggestion]:
    """Подсказки адресов в Узбекистане для поля Location (API Геосаджеста)."""
    text = q.strip()
    if len(text) < MIN_QUERY_LENGTH:
        return []
    await rate_limit.check(db, f"location-suggest:{user.id}", SUGGESTS_PER_USER, SUGGEST_WINDOW)
    try:
        return await geosuggest.suggest(text)
    except GeosuggestError:
        logger.exception("Location suggest failed")
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Location search is unavailable") from None
