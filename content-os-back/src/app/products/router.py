from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.auth.deps import ApprovedUser, require_role
from app.auth.models import Role, User
from app.core.db import SessionDep
from app.core.storage import StorageDep
from app.products import service
from app.products.schemas import ProductCreate, ProductList, ProductOption, ProductResponse

router = APIRouter(prefix="/products", tags=["products"])

BrandUser = Annotated[User, Depends(require_role(Role.BRAND))]


@router.get("")
async def list_products(
    user: ApprovedUser,
    db: SessionDep,
    storage: StorageDep,
    search: Annotated[str, Query(max_length=100)] = "",
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
) -> ProductList:
    """Поиск по названию, SKU и коллекции, без учёта регистра."""
    return await service.list_products(db, user, storage, search.strip(), page, per_page)


@router.get("/options")
async def list_options(user: ApprovedUser, db: SessionDep) -> list[ProductOption]:
    """Все продукты, которые видит пользователь, по названию: для поля Product."""
    return await service.list_options(db, user)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate, brand: BrandUser, db: SessionDep, storage: StorageDep
) -> ProductResponse:
    """Продукт с фото и референсами одной транзакцией (docs/adr/0003)."""
    product = await service.create_product(db, brand, body, storage)
    await db.commit()
    return product
