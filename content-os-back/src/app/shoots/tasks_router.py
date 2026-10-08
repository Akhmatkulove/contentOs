import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth.deps import require_role
from app.auth.models import Role, User
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.core.storage import StorageDep
from app.deliverables.models import DeliverableStatus
from app.shoots import tasks
from app.shoots.schemas import TaskFilters, TaskList

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
