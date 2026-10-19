import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.auth.deps import ApprovedUser, require_role
from app.auth.models import Role, User
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.core.storage import StorageDep
from app.shoots import notes, product_deliverables, service
from app.shoots.schemas import (
    ProductDeliverableOption,
    ShootCreate,
    ShootList,
    ShootListItem,
    ShootNoteCreate,
    ShootNotePatch,
    ShootNoteResponse,
    ShootResponse,
    ShootStatus,
)

router = APIRouter(prefix="/shoots", tags=["shoots"])

ArtDirectorUser = Annotated[User, Depends(require_role(Role.ART_DIRECTOR))]


@router.get("")
async def list_shoots(
    user: ApprovedUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
    search: Annotated[str, Query(max_length=100)] = "",
    status: ShootStatus | None = None,
    period: service.ShootPeriod | None = None,
    sort: service.ShootSort = service.ShootSort.NEWEST,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
) -> ShootList:
    """Съёмки арт-директора или те, где креатор в команде (docs/adr/0007).

    Поиск по названию, адресу и названиям продуктов без учёта регистра. `counts` —
    размеры вкладок по статусам под поиском и фильтрами, `total` — выбранного статуса.
    """
    params = service.ShootQuery(search.strip(), status, period, sort)
    return await service.list_shoots(db, user, storage, settings, params, page, per_page)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_shoot(
    body: ShootCreate,
    art_director: ArtDirectorUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> ShootListItem:
    """Съёмка одной транзакцией: команда, продукты, референсы, deliverables (docs/adr/0007)."""
    shoot = await service.create_shoot(db, art_director, body)
    await db.commit()
    return await service.get_item(db, art_director, storage, settings, shoot.id)


# До /{shoot_id}: иначе путь разберётся как id съёмки.
@router.get("/product-deliverables")
async def list_product_deliverables(
    art_director: ArtDirectorUser,
    db: SessionDep,
    product_id: Annotated[list[uuid.UUID], Query(default_factory=list, max_length=50)],
) -> list[ProductDeliverableOption]:
    """Заказы бренда, назначенные на арт-директора, для Add deliverable (docs/adr/0017).

    `product_id` — только этих продуктов (продукты съёмки); без него — все.
    """
    return await product_deliverables.list_options(db, art_director, product_id)


@router.get("/{shoot_id}")
async def get_shoot(
    shoot_id: uuid.UUID,
    user: ApprovedUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> ShootResponse:
    """Страница съёмки: автору и её команде, остальным 404 (docs/adr/0008)."""
    return await service.get_shoot(db, user, storage, settings, shoot_id)


@router.put("/{shoot_id}")
async def update_shoot(
    shoot_id: uuid.UUID,
    body: ShootCreate,
    art_director: ArtDirectorUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> ShootResponse:
    """Форма редактирования целиком; только автор съёмки (docs/adr/0008)."""
    shoot = await service.update_shoot(db, art_director, shoot_id, body)
    await db.commit()
    return await service.get_shoot(db, art_director, storage, settings, shoot.id)


@router.get("/{shoot_id}/notes")
async def list_notes(
    shoot_id: uuid.UUID, user: ApprovedUser, db: SessionDep, settings: SettingsDep
) -> list[ShootNoteResponse]:
    """Заметки съёмки, которые пользователь может читать (docs/adr/0010)."""
    return await notes.list_notes(db, user, settings, shoot_id)


@router.post("/{shoot_id}/notes", status_code=status.HTTP_201_CREATED)
async def create_note(
    shoot_id: uuid.UUID,
    body: ShootNoteCreate,
    user: ApprovedUser,
    db: SessionDep,
    settings: SettingsDep,
) -> ShootNoteResponse:
    note = await notes.create_note(db, user, settings, shoot_id, body)
    await db.commit()
    return note


@router.put("/{shoot_id}/notes/{note_id}")
async def update_note(
    shoot_id: uuid.UUID,
    note_id: uuid.UUID,
    body: ShootNoteCreate,
    user: ApprovedUser,
    db: SessionDep,
    settings: SettingsDep,
) -> ShootNoteResponse:
    """Только автор заметки и арт-директор съёмки; остальным 404."""
    note = await notes.update_note(db, user, settings, shoot_id, note_id, body)
    await db.commit()
    return note


@router.patch("/{shoot_id}/notes/{note_id}")
async def pin_note(
    shoot_id: uuid.UUID,
    note_id: uuid.UUID,
    body: ShootNotePatch,
    user: ApprovedUser,
    db: SessionDep,
    settings: SettingsDep,
) -> ShootNoteResponse:
    note = await notes.pin_note(db, user, settings, shoot_id, note_id, body.pinned)
    await db.commit()
    return note


@router.delete("/{shoot_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    shoot_id: uuid.UUID, note_id: uuid.UUID, user: ApprovedUser, db: SessionDep
) -> None:
    await notes.delete_note(db, user, shoot_id, note_id)
    await db.commit()
