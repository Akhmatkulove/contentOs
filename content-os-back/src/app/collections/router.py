from fastapi import APIRouter

from app.auth.deps import ApprovedUser
from app.collections import service
from app.collections.schemas import CollectionOption
from app.core.db import SessionDep

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("")
async def list_collections(user: ApprovedUser, db: SessionDep) -> list[CollectionOption]:
    """Коллекции, которые видит пользователь (docs/adr/0014): варианты поля Collection."""
    return await service.list_options(db, user)
