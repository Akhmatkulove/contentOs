from typing import Annotated

from fastapi import APIRouter, Query

from app.auth.deps import ApprovedUser
from app.core.db import SessionDep
from app.core.storage import StorageDep
from app.references import service
from app.references.schemas import ReferenceList

router = APIRouter(prefix="/references", tags=["references"])


@router.get("")
async def list_references(
    user: ApprovedUser,
    db: SessionDep,
    storage: StorageDep,
    search: Annotated[str, Query(max_length=100)] = "",
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
) -> ReferenceList:
    """Поиск по названию и коллекции, без учёта регистра."""
    return await service.list_references(db, user, storage, search.strip(), page, per_page)
