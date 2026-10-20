import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.auth.deps import ApprovedUser
from app.content import page, service
from app.content.models import ContentStatus
from app.content.schemas import (
    ContentCommentCreate,
    ContentCommentResponse,
    ContentDetails,
    ContentFilters,
    ContentList,
)
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

    `scope=mine` — My content, `scope=favorites` — избранное бренда;
    `counts` — размеры всех вкладок.
    """
    params = ContentQuery(search.strip(), product_id, shoot_id, author_id, status, sort, scope)
    return await service.list_content(db, user, storage, settings, params, page, per_page)


@router.get("/filters")
async def list_filters(user: ApprovedUser, db: SessionDep, settings: SettingsDep) -> ContentFilters:
    """Варианты для фильтров Product, Shoot и Creator."""
    return await service.list_filters(db, user, settings)


@router.get("/{deliverable_id}")
async def get_content(
    deliverable_id: uuid.UUID,
    user: ApprovedUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> ContentDetails:
    """Страница контента: отправленный deliverable целиком (docs/adr/0026)."""
    return await page.get_page(db, user, storage, settings, deliverable_id)


@router.post("/{deliverable_id}/comments", status_code=status.HTTP_201_CREATED)
async def add_comment(
    deliverable_id: uuid.UUID,
    body: ContentCommentCreate,
    user: ApprovedUser,
    db: SessionDep,
    settings: SettingsDep,
) -> ContentCommentResponse:
    """Пишут бренд продукта и арт-директор съёмки; остальным, кого касается, — уведомление."""
    comment = await page.add_comment(db, user, settings, deliverable_id, body.body)
    await db.commit()
    return comment


@router.delete("/{deliverable_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    deliverable_id: uuid.UUID, comment_id: uuid.UUID, user: ApprovedUser, db: SessionDep
) -> None:
    """Удалить свой комментарий."""
    await page.delete_comment(db, user, deliverable_id, comment_id)
    await db.commit()


@router.post("/{deliverable_id}/approve", status_code=status.HTTP_204_NO_CONTENT)
async def approve(deliverable_id: uuid.UUID, user: ApprovedUser, db: SessionDep) -> None:
    """Бренд одобряет контент; повторный вызов ничего не меняет."""
    await page.approve(db, user, deliverable_id)
    await db.commit()


@router.put("/{deliverable_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def add_favorite(deliverable_id: uuid.UUID, user: ApprovedUser, db: SessionDep) -> None:
    """В избранное бренда; повторный вызов ничего не меняет."""
    await page.set_favorite(db, user, deliverable_id, favorite=True)
    await db.commit()


@router.delete("/{deliverable_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(deliverable_id: uuid.UUID, user: ApprovedUser, db: SessionDep) -> None:
    """Убрать из избранного; если его там нет, ничего не меняет."""
    await page.set_favorite(db, user, deliverable_id, favorite=False)
    await db.commit()
