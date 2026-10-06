"""Продукты: список и создание вместе с фото и референсами. Коммитит вызывающий."""

import uuid

from fastapi import HTTPException, status
from sqlalchemy import ColumnElement, exists, false, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models import BrandArtDirector
from app.auth.models import Role, Status, User
from app.core.storage import Storage
from app.core.text import escape_like
from app.deliverables.models import Deliverable
from app.deliverables.schemas import DeliverableResponse
from app.files.models import FileKind, StoredFile
from app.files.schemas import FileResponse
from app.files.service import claim_files
from app.products.models import Product, ProductPhoto
from app.products.schemas import (
    ProductCreate,
    ProductList,
    ProductListItem,
    ProductOption,
    ProductResponse,
)
from app.references.models import Reference, ReferenceFile
from app.references.schemas import ReferenceResponse


def _unprocessable(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail)


async def _require_own_art_directors(db: AsyncSession, brand: User, ids: set[uuid.UUID]) -> None:
    """Исполнитель deliverable — одобренный арт-директор из связок бренда (docs/adr/0002)."""
    if not ids:
        return
    linked = set(
        await db.scalars(
            select(User.id)
            .join(BrandArtDirector, BrandArtDirector.art_director_id == User.id)
            .where(
                BrandArtDirector.brand_id == brand.id,
                User.id.in_(ids),
                User.role == Role.ART_DIRECTOR,
                User.status == Status.APPROVED,
            )
        )
    )
    # Чужой арт-директор отвечает так же, как несуществующий пользователь.
    if linked != ids:
        raise _unprocessable("Assignee is not the brand's art director")


async def create_product(
    db: AsyncSession, brand: User, body: ProductCreate, storage: Storage
) -> ProductResponse:
    await _require_own_art_directors(db, brand, {d.assignee_id for d in body.deliverables})
    files = await claim_files(db, brand, body.file_ids())
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

    deliverables = [
        Deliverable(product_id=product.id, position=index, **draft.model_dump())
        for index, draft in enumerate(body.deliverables)
    ]
    db.add_all(deliverables)
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
        deliverables=[DeliverableResponse.of(deliverable) for deliverable in deliverables],
        created_at=product.created_at,
    )


def _visible(user: User) -> ColumnElement[bool]:
    """Продукты, которые видит пользователь.

    Бренд видит свои, арт-директор — те, где на него назначен хотя бы один deliverable
    (docs/adr/0004). Креатор увидит продукты по съёмкам; их пока нет.
    """
    if user.role == Role.BRAND:
        return Product.brand_id == user.id
    if user.role == Role.ART_DIRECTOR:
        return exists().where(
            Deliverable.product_id == Product.id, Deliverable.assignee_id == user.id
        )
    return false()


async def list_options(db: AsyncSession, user: User) -> list[ProductOption]:
    """Все видимые продукты по названию: варианты для поля Product."""
    rows = await db.execute(
        select(Product.id, Product.name).where(_visible(user)).order_by(Product.name, Product.id)
    )
    return [ProductOption(id=row.id, name=row.name) for row in rows]


async def list_products(
    db: AsyncSession, user: User, storage: Storage, search: str, page: int, per_page: int
) -> ProductList:
    """Продукты, которые видит пользователь (_visible), новые первыми."""
    query = select(Product).where(_visible(user))

    if search:
        pattern = f"%{escape_like(search)}%"
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
