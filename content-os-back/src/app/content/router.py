import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.auth.deps import ApprovedUser
from app.content import service
from app.content.models import ContentStatus
from app.content.schemas import ContentFilters, ContentList
from app.content.service import ContentQuery, ContentScope, ContentSort
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.core.storage import StorageDep

router = APIRouter(prefix="/content", tags=["content"])


@router.get("")
async def list_content(
    user: ApprovedUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
    search: Annotated[str, Query(max_length=100)] = "",
    product_id: uuid.UUID | None = None,
    shoot_id: uuid.UUID | None = None,
    author_id: uuid.UUID | None = None,
    status: ContentStatus | None = None,
    sort: ContentSort = ContentSort.NEWEST,
    scope: ContentScope = ContentScope.ALL,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
) -> ContentList:
    """Поиск по deliverable, продукту, съёмке и креатору, без учёта регистра.

    `scope=mine` — My content; `counts` — размеры обеих вкладок.
    """
    params = ContentQuery(search.strip(), product_id, shoot_id, author_id, status, sort, scope)
    return await service.list_content(db, user, storage, settings, params, page, per_page)


@router.get("/filters")
async def list_filters(user: ApprovedUser, db: SessionDep, settings: SettingsDep) -> ContentFilters:
    """Варианты для фильтров Product, Shoot и Creator."""
    return await service.list_filters(db, user, settings)
