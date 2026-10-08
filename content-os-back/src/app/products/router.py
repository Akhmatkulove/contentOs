import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.auth.deps import ApprovedUser, require_role
from app.auth.models import Role, User
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.core.storage import StorageDep, delete_quietly
from app.products import service
from app.products.models import ProductStatus
from app.products.schemas import (
    ProductCreate,
    ProductFilters,
    ProductList,
    ProductOption,
    ProductPatch,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter(prefix="/products", tags=["products"])

BrandUser = Annotated[User, Depends(require_role(Role.BRAND))]


@router.get("")
async def list_products(
    user: ApprovedUser,
    db: SessionDep,
    storage: StorageDep,
    search: Annotated[str, Query(max_length=100)] = "",
    collection: Annotated[str | None, Query(max_length=100)] = None,
    status: ProductStatus | None = None,
    sort: service.ProductSort = service.ProductSort.NEWEST,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
    per_page: Annotated[int, Query(ge=1, le=50)] = 20,
) -> ProductList:
    """Поиск по названию, SKU и коллекции без учёта регистра; коллекция — точно."""
    params = service.ProductQuery(search.strip(), collection, status, sort)
    return await service.list_products(db, user, storage, params, page, per_page)


@router.get("/filters")
async def list_filters(user: ApprovedUser, db: SessionDep) -> ProductFilters:
    """Варианты фильтра Collection: коллекции видимых продуктов."""
    return await service.list_filters(db, user)


@router.get("/options")
async def list_options(user: ApprovedUser, db: SessionDep) -> list[ProductOption]:
    """Все продукты, которые видит пользователь, по названию: для поля Product."""
    return await service.list_options(db, user)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate,
    brand: BrandUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> ProductResponse:
    """Продукт с фото, референсами и deliverables одной транзакцией (docs/adr/0003)."""
    product = await service.create_product(db, brand, body)
    await db.commit()
    return await service.product_response(db, brand, storage, settings, product)


@router.get("/{product_id}")
async def get_product(
    product_id: uuid.UUID,
    user: ApprovedUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> ProductResponse:
    """Страница продукта: бренду-владельцу и арт-директорам с его deliverables (docs/adr/0005)."""
    return await service.get_product(db, user, storage, settings, product_id)


@router.put("/{product_id}")
async def update_product(
    product_id: uuid.UUID,
    body: ProductUpdate,
    brand: BrandUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> ProductResponse:
    """Форма редактирования целиком: поля, фото, референсы и deliverables (docs/adr/0005)."""
    product, removed_keys = await service.update_product(db, brand, product_id, body)
    await db.commit()
    await delete_quietly(storage, *removed_keys)
    return await service.product_response(db, brand, storage, settings, product)


@router.patch("/{product_id}")
async def patch_product(
    product_id: uuid.UUID,
    body: ProductPatch,
    brand: BrandUser,
    db: SessionDep,
    storage: StorageDep,
    settings: SettingsDep,
) -> ProductResponse:
    """Статус продукта из меню «…»: Archive product и обратно (docs/adr/0005)."""
    product = await service.patch_product(db, brand, product_id, body)
    await db.commit()
    return await service.product_response(db, brand, storage, settings, product)
