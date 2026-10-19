import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth.deps import require_role
from app.auth.models import Role, User
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.core.storage import StorageDep, delete_quietly
from app.deliverables.models import DeliverableStatus
from app.shoots import review, tasks, versions
from app.shoots.schemas import (
    DeliverableReviewResponse,
    TaskDraftFiles,
    TaskDraftTitle,
    TaskFilters,
    TaskList,
    TaskResponse,
    TaskVersionFiles,
    VersionReviewCreate,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])

TeamUser = Annotated[User, Depends(require_role(Role.ART_DIRECTOR, Role.CREATOR))]


@router.get("")
async def list_tasks(
    user: TeamUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
    search: Annotated[str, Query(max_length=100)] = "",
    status: DeliverableStatus | None = None,
    shoot_id: uuid.UUID | None = None,
    product_id: uuid.UUID | None = None,
    assignee_id: uuid.UUID | None = None,
    sort: tasks.TaskSort = tasks.TaskSort.PRIORITY,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
) -> TaskList:
    """My tasks: deliverables съёмок арт-директора или те, где креатор исполнитель.

    Поиск по deliverable, продукту, съёмке и исполнителю без учёта регистра.
    `counts` — размеры вкладок по статусам под поиском и фильтрами (docs/adr/0011).
    """
    params = tasks.TaskQuery(search.strip(), status, shoot_id, product_id, assignee_id, sort)
    return await tasks.list_tasks(db, user, storage, settings, params, page, per_page)


@router.get("/filters")
async def list_filters(user: TeamUser, db: SessionDep, settings: SettingsDep) -> TaskFilters:
    """Съёмки, продукты и исполнители задач пользователя: варианты фильтров."""
    return await tasks.list_filters(db, user, settings)


@router.get("/{task_id}")
async def get_task(
    task_id: uuid.UUID, user: TeamUser, db: SessionDep, storage: StorageDep, settings: SettingsDep
) -> TaskResponse:
    """Страница задачи с версиями готового контента; кому задача не видна в My tasks — 404."""
    return await versions.get_task(db, user, storage, settings, task_id)


@router.post("/{task_id}/draft/files")
async def add_draft_files(
    task_id: uuid.UUID,
    body: TaskDraftFiles,
    user: TeamUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> TaskResponse:
    """Файлы из POST /api/uploads в черновик следующей версии; только исполнитель.

    Первые файлы создают черновик V1, после отправки — V2 и т. д. (docs/adr/0012).
    """
    await versions.add_draft_files(db, user, task_id, body)
    await db.commit()
    return await versions.get_task(db, user, storage, settings, task_id)


@router.patch("/{task_id}/draft")
async def save_draft(
    task_id: uuid.UUID,
    body: TaskDraftTitle,
    user: TeamUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> TaskResponse:
    """Save draft: название черновика без отправки на проверку; без черновика 409."""
    await versions.save_draft(db, user, task_id, body)
    await db.commit()
    return await versions.get_task(db, user, storage, settings, task_id)


@router.post("/{task_id}/draft/submit")
async def submit_draft(
    task_id: uuid.UUID,
    body: TaskDraftTitle,
    user: TeamUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> TaskResponse:
    """Submit for review: черновик становится версией, задача — needs review."""
    await versions.submit_draft(db, user, task_id, body)
    await db.commit()
    return await versions.get_task(db, user, storage, settings, task_id)


@router.delete("/{task_id}/draft/files/{file_id}")
async def remove_draft_file(
    task_id: uuid.UUID,
    file_id: uuid.UUID,
    user: TeamUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> TaskResponse:
    """Убирает файл из черновика; черновик без файлов удаляется."""
    key = await versions.remove_draft_file(db, user, task_id, file_id)
    await db.commit()
    await delete_quietly(storage, key)
    return await versions.get_task(db, user, storage, settings, task_id)


@router.put("/{task_id}/versions/{version_id}/files")
async def edit_version(
    task_id: uuid.UUID,
    version_id: uuid.UUID,
    body: TaskVersionFiles,
    user: TeamUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> TaskResponse:
    """Правка своей версии после Request changes: файлы целиком (оставленные и новые
    из POST /api/uploads), версия снова на проверке (docs/adr/0016).

    Версия без Request changes или работа уже одобрена — 409; файлы не изменились — 422.
    """
    keys = await versions.edit_version(db, user, task_id, version_id, body)
    await db.commit()
    await delete_quietly(storage, *keys)
    return await versions.get_task(db, user, storage, settings, task_id)


@router.get("/{task_id}/review")
async def get_review(
    task_id: uuid.UUID, user: TeamUser, db: SessionDep, storage: StorageDep, settings: SettingsDep
) -> DeliverableReviewResponse:
    """Страница проверки deliverable: работа каждого исполнителя (docs/adr/0015).

    Только арт-директору съёмки, остальным 404.
    """
    return await review.get_review(db, user, storage, settings, task_id)


@router.post("/{task_id}/versions/{version_id}/review")
async def review_version(
    task_id: uuid.UUID,
    version_id: uuid.UUID,
    body: VersionReviewCreate,
    user: TeamUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> DeliverableReviewResponse:
    """Approve или Request changes по любой отправленной версии исполнителя.

    Approve выбирает версию: у исполнителя одобрена одна (docs/adr/0016).
    Deliverable уже отправлен бренду или автор больше не исполнитель — 409.
    """
    await review.decide(db, user, task_id, version_id, body)
    await db.commit()
    return await review.get_review(db, user, storage, settings, task_id)


@router.post("/{task_id}/send")
async def send_to_brand(
    task_id: uuid.UUID, user: TeamUser, db: SessionDep, storage: StorageDep, settings: SettingsDep
) -> DeliverableReviewResponse:
    """Send to brand: deliverable становится approved; пока одобрены не все — 409."""
    await review.send(db, user, task_id)
    await db.commit()
    return await review.get_review(db, user, storage, settings, task_id)
