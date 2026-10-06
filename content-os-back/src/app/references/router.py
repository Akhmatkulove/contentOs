import uuid
from typing import Annotated

from fastapi import APIRouter, Query

from app.auth.deps import ApprovedUser
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.core.storage import StorageDep
from app.references import service
from app.references.models import ReferenceType
from app.references.schemas import ReferenceFilters, ReferenceList
from app.references.service import ReferenceQuery, ReferenceSort

router = APIRouter(prefix="/references", tags=["references"])


@router.get("")
async def list_references(
    user: ApprovedUser,
    db: SessionDep,
    storage: StorageDep,
    search: Annotated[str, Query(max_length=100)] = "",
    type: ReferenceType | None = None,  # noqa: A002 — имя параметра в API
    product_id: uuid.UUID | None = None,
    author_id: uuid.UUID | None = None,
    tag: Annotated[str | None, Query(max_length=50)] = None,
    sort: ReferenceSort = ReferenceSort.NEWEST,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
) -> ReferenceList:
    """Поиск по названию, описанию, тегам и коллекции, без учёта регистра."""
    params = ReferenceQuery(search.strip(), type, product_id, author_id, tag, sort)
    return await service.list_references(db, user, storage, params, page, per_page)


@router.get("/filters")
async def list_filters(
    user: ApprovedUser, db: SessionDep, settings: SettingsDep
) -> ReferenceFilters:
    """Варианты для фильтров Product, Creator и Tags."""
    return await service.list_filters(db, user, settings)
