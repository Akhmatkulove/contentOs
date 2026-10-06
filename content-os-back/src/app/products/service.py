"""Продукты: список и создание вместе с фото и референсами. Коммитит вызывающий."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, User
from app.core.storage import Storage
from app.files.models import FileKind, StoredFile
from app.files.schemas import FileResponse
from app.products.models import Product, ProductPhoto
from app.products.schemas import (
    ProductCreate,
    ProductList,
    ProductListItem,
    ProductResponse,
)
from app.references.models import Reference, ReferenceFile
from app.references.schemas import ReferenceResponse


def _unprocessable(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail)


async def _claim_files(
    db: AsyncSession, owner: User, ids: list[uuid.UUID]
) -> dict[uuid.UUID, StoredFile]:
    """Файлы, которые owner загрузил сам и ещё нигде не использовал."""
    files = {
        file.id: file
        for file in await db.scalars(
            select(StoredFile).where(StoredFile.id.in_(ids), StoredFile.owner_id == owner.id)
        )
    }
    # Чужой файл отвечает так же, как несуществующий: не подтверждаем, что он есть.
    if len(files) != len(set(ids)):
        raise _unprocessable("Unknown file")
    used = await db.scalar(
        union_all(
            select(ProductPhoto.file_id).where(ProductPhoto.file_id.in_(ids)),
            select(ReferenceFile.file_id).where(ReferenceFile.file_id.in_(ids)),
        ).limit(1)
    )
    if used is not None:
        raise _unprocessable("File is already used")
    return files


async def create_product(
    db: AsyncSession, brand: User, body: ProductCreate, storage: Storage
) -> ProductResponse:
    files = await _claim_files(db, brand, body.file_ids())
    photos = [files[file_id] for file_id in body.photo_ids]
    if any(photo.kind != FileKind.IMAGE for photo in photos):
        raise _unprocessable("Product photos must be images")

    product = Product(
        brand_id=brand.id,
        **body.model_dump(include={"name", "about", "notes", "collection", "category", "sku"}),
        status=body.status,
        tags=body.tags,
    )
    db.add(product)
    await db.flush()
    db.add_all(
        ProductPhoto(product_id=product.id, position=index, file_id=photo.id)
        for index, photo in enumerate(photos)
    )

    references = []
    for draft in body.references:
        reference = Reference(
            owner_id=brand.id,
            product_id=product.id,
            title=draft.title,
            type=draft.type,
            link=str(draft.link) if draft.link else None,
            # Референс из продукта получает его коллекцию (docs/adr/0003).
            collection=product.collection,
            notes=draft.notes,
            tags=draft.tags,
        )
        db.add(reference)
        await db.flush()
        reference_files = [files[file_id] for file_id in draft.file_ids]
        db.add_all(
            ReferenceFile(reference_id=reference.id, position=index, file_id=file.id)
            for index, file in enumerate(reference_files)
        )
        references.append((reference, reference_files))
    await db.flush()

    return ProductResponse(
        id=product.id,
        name=product.name,
        about=product.about,
        notes=product.notes,
        collection=product.collection,
        category=product.category,
        sku=product.sku,
        status=product.status,
        tags=product.tags,
        photos=[FileResponse.of(photo, storage) for photo in photos],
        references=[
            ReferenceResponse.of(reference, brand.name, reference_files, storage)
            for reference, reference_files in references
        ],
        created_at=product.created_at,
    )


def _escape_like(text: str) -> str:
    # Пользовательский поиск ищет буквально: % и _ не должны работать как шаблоны.
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


async def list_products(
    db: AsyncSession, user: User, storage: Storage, search: str, page: int, per_page: int
) -> ProductList:
    """Продукты, которые видит пользователь, новые первыми.

    Бренд видит свои. Арт-директор и креатор будут видеть продукты по назначениям
    (docs/adr/0002); назначений пока нет, поэтому список у них пустой.
    """
    if user.role != Role.BRAND:
        return ProductList(items=[], total=0)

    query = select(Product).where(Product.brand_id == user.id)
    if search:
        pattern = f"%{_escape_like(search)}%"
        query = query.where(
            or_(
                Product.name.ilike(pattern, escape="\\"),
                Product.sku.ilike(pattern, escape="\\"),
                Product.collection.ilike(pattern, escape="\\"),
            )
        )

    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    products = list(
        await db.scalars(
            query.order_by(Product.created_at.desc(), Product.id.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    )

    # Обложка — фото на первой позиции.
    covers: dict[uuid.UUID, StoredFile] = {
        row.product_id: row.StoredFile
        for row in await db.execute(
            select(ProductPhoto.product_id, StoredFile)
            .join(StoredFile, StoredFile.id == ProductPhoto.file_id)
            .where(
                ProductPhoto.product_id.in_([product.id for product in products]),
                ProductPhoto.position == 0,
            )
        )
    }
    return ProductList(
        items=[
            ProductListItem(
                id=product.id,
                name=product.name,
                collection=product.collection,
                sku=product.sku,
                status=product.status,
                photo=FileResponse.of(covers[product.id], storage)
                if product.id in covers
                else None,
                created_at=product.created_at,
            )
            for product in products
        ],
        total=total,
    )
