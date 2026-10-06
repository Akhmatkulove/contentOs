import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.auth.deps import ApprovedUser
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.core.storage import StorageDep
from app.references import service
from app.references.models import ReferenceType
from app.references.schemas import ReferenceFilters, ReferenceList
from app.references.service import ReferenceQuery, ReferenceScope, ReferenceSort

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
    scope: ReferenceScope = ReferenceScope.ALL,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
) -> ReferenceList:
    """Поиск по названию, описанию, тегам и коллекции, без учёта регистра.

    `scope=favorites` — только избранное пользователя; `counts` — размеры обеих вкладок.
    """
    params = ReferenceQuery(search.strip(), type, product_id, author_id, tag, sort, scope)
    return await service.list_references(db, user, storage, params, page, per_page)


@router.get("/filters")
async def list_filters(
    user: ApprovedUser, db: SessionDep, settings: SettingsDep
) -> ReferenceFilters:
    """Варианты для фильтров Product, Creator и Tags."""
    return await service.list_filters(db, user, settings)


@router.put("/{reference_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def add_favorite(reference_id: uuid.UUID, user: ApprovedUser, db: SessionDep) -> None:
    """Добавить в избранное; повторный вызов ничего не меняет."""
    await service.set_favorite(db, user, reference_id, favorite=True)
    await db.commit()


@router.delete("/{reference_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(reference_id: uuid.UUID, user: ApprovedUser, db: SessionDep) -> None:
    """Убрать из избранного; если его там нет, ничего не меняет."""
    await service.set_favorite(db, user, reference_id, favorite=False)
    await db.commit()
