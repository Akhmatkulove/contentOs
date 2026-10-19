"""Продукты: список, страница продукта, создание и редактирование. Коммитит вызывающий."""

import enum
import uuid
from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import (
    ColumnElement,
    UnaryExpression,
    case,
    delete,
    exists,
    false,
    func,
    or_,
    select,
    update,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, User
from app.collections import service as collections
from app.core.config import Settings
from app.core.storage import Storage
from app.core.text import escape_like
from app.deliverables.models import Deliverable
from app.deliverables.schemas import DeliverableDraft, DeliverableResponse
from app.files.models import FileKind, StoredFile
from app.files.schemas import FileResponse
from app.files.service import claim_files
from app.notifications import service as notifications
from app.products.models import Product, ProductPhoto, ProductStatus
from app.products.schemas import (
    ProductCreate,
    ProductFilters,
    ProductList,
    ProductListItem,
    ProductOption,
    ProductPatch,
    ProductResponse,
    ProductUpdate,
)
from app.references import service as references
from app.references.models import Reference, ReferenceFile
from app.references.schemas import ReferenceDraft
from app.shoots import product_deliverables
from app.team import service as team
from app.team.schemas import TeamMember

# Поля формы, которые копируются в продукт как есть. Коллекция приходит именем
# и выбирается или создаётся (docs/adr/0014).
_FIELDS = ("name", "about", "notes", "category", "sku", "status", "tags")


def _unprocessable(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail)


def _not_found() -> HTTPException:
    # Чужой продукт отвечает так же, как несуществующий.
    return HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")


async def _require_own_art_directors(db: AsyncSession, brand: User, ids: set[uuid.UUID]) -> None:
    """Исполнитель deliverable — одобренный арт-директор из связок бренда (docs/adr/0002)."""
    # Чужой арт-директор отвечает так же, как несуществующий пользователь.
    if not await team.all_in(db, team.art_director_ids(brand.id), ids):
        raise _unprocessable("Assignee is not the brand's art director")


async def _claim(
    db: AsyncSession, brand: User, body: ProductCreate, kept_photos: set[uuid.UUID]
) -> dict[uuid.UUID, StoredFile]:
    """Новые файлы запроса: фото, которых у продукта ещё нет, и файлы новых референсов."""
    new = [file_id for file_id in body.file_ids() if file_id not in kept_photos]
    files = await claim_files(db, brand, new)
    if any(files[i].kind != FileKind.IMAGE for i in body.photo_ids if i in files):
        raise _unprocessable("Product photos must be images")
    return files


def _add_photos(db: AsyncSession, product: Product, photo_ids: list[uuid.UUID]) -> None:
    db.add_all(
        ProductPhoto(product_id=product.id, position=index, file_id=file_id)
        for index, file_id in enumerate(photo_ids)
    )


async def _add_references(
    db: AsyncSession,
    brand: User,
    product: Product,
    drafts: list[ReferenceDraft],
    files: dict[uuid.UUID, StoredFile],
) -> None:
    for draft in drafts:
        reference = Reference(
            owner_id=brand.id,
            product_id=product.id,
            title=draft.title,
            type=draft.type,
            link=str(draft.link) if draft.link else None,
            # Референс из продукта получает его коллекцию (docs/adr/0003).
            collection_id=product.collection_id,
            notes=draft.notes,
            tags=draft.tags,
        )
        db.add(reference)
        await db.flush()
        db.add_all(
            ReferenceFile(reference_id=reference.id, position=index, file_id=files[file_id].id)
            for index, file_id in enumerate(draft.file_ids)
        )


async def _add_deliverables(
    db: AsyncSession,
    brand: User,
    product: Product,
    drafts: list[DeliverableDraft],
    start: int = 0,
) -> None:
    """Новые deliverables; их арт-директора получают уведомление (docs/adr/0020)."""
    db.add_all(
        Deliverable(product_id=product.id, position=start + index, **draft.model_dump())
        for index, draft in enumerate(drafts)
    )
    await notifications.deliverables_assigned(
        db, brand, product.id, Counter(draft.assignee_id for draft in drafts)
    )


async def create_product(db: AsyncSession, brand: User, body: ProductCreate) -> Product:
    """Продукт с фото, референсами и deliverables одной транзакцией (docs/adr/0003, 0004)."""
    await _require_own_art_directors(db, brand, {d.assignee_id for d in body.deliverables})
    files = await _claim(db, brand, body, kept_photos=set())

    product = Product(
        brand_id=brand.id,
        collection_id=await collections.resolve(db, brand, body.collection),
        **body.model_dump(include=set(_FIELDS)),
    )
    db.add(product)
    await db.flush()
    _add_photos(db, product, body.photo_ids)
    await _add_references(db, brand, product, body.references, files)
    await _add_deliverables(db, brand, product, body.deliverables)
    await db.flush()
    await db.refresh(product, ["collection"])
    return product


def _require_subset(
    existing: Sequence[uuid.UUID], kept: list[uuid.UUID], what: str
) -> set[uuid.UUID]:
    """Сохранённые id; оставить можно только из них, иначе 422."""
    if not set(kept) <= set(existing):
        raise _unprocessable(f"Unknown {what}")
    return set(existing)


async def _own_product(db: AsyncSession, brand: User, product_id: uuid.UUID) -> Product:
    """Продукт бренда, заблокированный до конца транзакции; чужой — 404, как несуществующий.

    Блокировка: два сохранения подряд не перемешают фото и позиции. NO KEY
    UPDATE: сохранение съёмки ссылается на продукт (KEY SHARE) и не ждёт её,
    иначе блокировки deliverables съёмок дали бы взаимоблокировку (docs/adr/0022).
    """
    product = await db.scalar(
        select(Product)
        .where(Product.id == product_id, Product.brand_id == brand.id)
        .with_for_update(key_share=True)
    )
    if product is None:
        raise _not_found()
    return product


async def patch_product(
    db: AsyncSession, brand: User, product_id: uuid.UUID, body: ProductPatch
) -> Product:
    """Меняет только переданные поля (сейчас статус: архив и возврат).

    Продукт, по которому идёт работа в съёмках, в архив не уходит (docs/adr/0022).
    """
    product = await _own_product(db, brand, product_id)
    if (
        body.status == ProductStatus.ARCHIVED
        and product.status != ProductStatus.ARCHIVED
        and await product_deliverables.products_in_work(db, [product.id], lock=True)
    ):
        raise _unprocessable("A product in work can't be archived")
    product.status = body.status
    await db.flush()
    return product


async def update_product(
    db: AsyncSession, brand: User, product_id: uuid.UUID, body: ProductUpdate
) -> tuple[Product, list[str]]:
    """Сохраняет форму редактирования целиком (docs/adr/0005). Только бренд-владелец.

    Вместе с продуктом возвращает ключи файлов убранных фото и референсов: из
    хранилища вызывающий удаляет их после commit.
    """
    product = await _own_product(db, brand, product_id)
    await _require_own_art_directors(db, brand, {d.assignee_id for d in body.deliverables})

    photos = set(
        await db.scalars(select(ProductPhoto.file_id).where(ProductPhoto.product_id == product.id))
    )
    files = await _claim(db, brand, body, kept_photos=photos)

    own_references = _require_subset(
        (
            await db.scalars(
                select(Reference.id).where(
                    Reference.product_id == product.id, Reference.owner_id == brand.id
                )
            )
        ).all(),
        body.reference_ids,
        "reference",
    )
    deliverables = _require_subset(
        (
            await db.scalars(select(Deliverable.id).where(Deliverable.product_id == product.id))
        ).all(),
        body.deliverable_ids,
        "deliverable",
    )

    # Убранные фото и референсы удаляются вместе с файлами. Референсы — из пула
    # тоже: бренд пула не видит, а без продукта их не увидит и арт-директор.
    removed_keys = list(
        await db.scalars(
            delete(StoredFile)
            .where(StoredFile.id.in_(photos - set(body.photo_ids)))
            .returning(StoredFile.key)
        )
    )
    removed_keys += await references.delete_with_files(db, own_references - set(body.reference_ids))
    # Без deliverable арт-директор теряет доступ к продукту (docs/adr/0004).
    if removed := deliverables - set(body.deliverable_ids):
        # По заказу уже снимают: работа команды осталась бы без заказа (docs/adr/0021).
        # Запланированный, но не начатый удаляется: deliverable съёмки остаётся без него.
        if await product_deliverables.any_in_work(db, removed):
            raise _unprocessable("A deliverable in work can't be removed")
        await db.execute(delete(Deliverable).where(Deliverable.id.in_(removed)))
        await notifications.forget_unassigned(db, product.id)
    if body.deliverable_ids:
        positions = {deliverable_id: i for i, deliverable_id in enumerate(body.deliverable_ids)}
        await db.execute(
            update(Deliverable)
            .where(Deliverable.id.in_(positions))
            .values(position=case(positions, value=Deliverable.id))
        )

    # Позиции фото — часть первичного ключа: проще записать их заново.
    await db.execute(delete(ProductPhoto).where(ProductPhoto.product_id == product.id))
    for field in _FIELDS:
        setattr(product, field, getattr(body, field))
    product.collection_id = await collections.resolve(db, brand, body.collection)
    _add_photos(db, product, body.photo_ids)
    await _add_references(db, brand, product, body.references, files)
    await _add_deliverables(db, brand, product, body.deliverables, start=len(body.deliverable_ids))
    await db.flush()
    await db.refresh(product, ["collection"])
    return product, removed_keys


async def get_product(
    db: AsyncSession, user: User, storage: Storage, settings: Settings, product_id: uuid.UUID
) -> ProductResponse:
    """Страница продукта для того, кто его видит (_visible); остальным 404."""
    product = await db.scalar(select(Product).where(Product.id == product_id, _visible(user)))
    if product is None:
        raise _not_found()
    return await product_response(db, user, storage, settings, product)


async def product_response(
    db: AsyncSession, user: User, storage: Storage, settings: Settings, product: Product
) -> ProductResponse:
    """Продукт со всем, что показывает его страница: фото, референсы, deliverables.

    Референсы продукта видит каждый, кто видит продукт: бренд-владелец, назначенные
    арт-директора (docs/adr/0004) и их креаторы (docs/adr/0024); deliverables
    арт-директору — только его, креатору — его арт-директоров.
    Число запросов не зависит от размера продукта.
    """
    photos = list(
        await db.scalars(
            select(StoredFile)
            .join(ProductPhoto, ProductPhoto.file_id == StoredFile.id)
            .where(ProductPhoto.product_id == product.id)
            .order_by(ProductPhoto.position)
        )
    )
    product_references = list(
        await db.scalars(
            select(Reference)
            .where(Reference.product_id == product.id)
            .order_by(Reference.created_at.desc(), Reference.id.desc())
        )
    )
    # Арт-директор видит только свои deliverables, креатор — своих арт-директоров,
    # бренд — все (docs/adr/0005, 0024).
    deliverable_query = select(Deliverable).where(Deliverable.product_id == product.id)
    if user.role == Role.ART_DIRECTOR:
        deliverable_query = deliverable_query.where(Deliverable.assignee_id == user.id)
    elif user.role == Role.CREATOR:
        deliverable_query = deliverable_query.where(
            Deliverable.assignee_id.in_(team.art_directors_of_creator(user.id))
        )
    deliverables = list(
        await db.scalars(deliverable_query.order_by(Deliverable.position, Deliverable.id))
    )
    assignee_ids = {d.assignee_id for d in deliverables if d.assignee_id is not None}
    assignees = (
        {
            member.id: TeamMember.of(member, settings)
            for member in await db.scalars(select(User).where(User.id.in_(assignee_ids)))
        }
        if assignee_ids
        else {}
    )

    progresses = await product_deliverables.progress(db, (d.id for d in deliverables))
    deliverable_responses = []
    for deliverable in deliverables:
        progress = progresses.get(deliverable.id, product_deliverables.NOT_SCHEDULED)
        assignee = assignees.get(deliverable.assignee_id) if deliverable.assignee_id else None
        deliverable_responses.append(
            DeliverableResponse.of(deliverable, assignee, progress.status, progress.shoots)
        )

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
        references=await references.to_responses(db, user, storage, product_references),
        deliverables=deliverable_responses,
        created_at=product.created_at,
        in_work=bool(await product_deliverables.products_in_work(db, [product.id])),
        can_edit=product.brand_id == user.id,
    )


def _visible(user: User) -> ColumnElement[bool]:
    """Продукты, которые видит пользователь.

    Бренд видит свои, арт-директор — те, где на него назначен хотя бы один deliverable
    (docs/adr/0004), креатор — всё, что видят арт-директора его команд (docs/adr/0024).
    """
    if user.role == Role.BRAND:
        return Product.brand_id == user.id
    if user.role == Role.ART_DIRECTOR:
        return exists().where(
            Deliverable.product_id == Product.id, Deliverable.assignee_id == user.id
        )
    if user.role == Role.CREATOR:
        return exists().where(
            Deliverable.product_id == Product.id,
            Deliverable.assignee_id.in_(team.art_directors_of_creator(user.id)),
        )
    return false()


async def list_options(db: AsyncSession, user: User) -> list[ProductOption]:
    """Все видимые продукты по названию: варианты для поля Product."""
    rows = await db.execute(
        select(Product.id, Product.name).where(_visible(user)).order_by(Product.name, Product.id)
    )
    return [ProductOption(id=row.id, name=row.name) for row in rows]


class ProductSort(enum.StrEnum):
    NEWEST = "newest"
    OLDEST = "oldest"
    NAME_ASC = "name_asc"
    NAME_DESC = "name_desc"


_ORDER: dict[ProductSort, tuple[UnaryExpression[Any], ...]] = {
    ProductSort.NEWEST: (Product.created_at.desc(), Product.id.desc()),
    ProductSort.OLDEST: (Product.created_at.asc(), Product.id.asc()),
    # Без учёта регистра: в базе C-collation, и «Zara» иначе встала бы раньше «abaya».
    ProductSort.NAME_ASC: (func.lower(Product.name).asc(), Product.id.asc()),
    ProductSort.NAME_DESC: (func.lower(Product.name).desc(), Product.id.desc()),
}


@dataclass(frozen=True)
class ProductQuery:
    search: str = ""
    # Точное совпадение: варианты приходят из GET /api/products/filters.
    collection: str | None = None
    status: ProductStatus | None = None
    sort: ProductSort = ProductSort.NEWEST


async def list_filters(db: AsyncSession, user: User) -> ProductFilters:
    """Коллекции видимых продуктов, по алфавиту без учёта регистра: фильтр Collection."""
    collections = await db.scalars(
        select(Product.collection)
        .where(_visible(user), Product.collection.is_not(None))
        .group_by(Product.collection)
        .order_by(func.lower(Product.collection), Product.collection)
    )
    return ProductFilters(collections=[c for c in collections if c is not None])


async def list_products(
    db: AsyncSession,
    user: User,
    storage: Storage,
    params: ProductQuery,
    page: int,
    per_page: int,
) -> ProductList:
    """Продукты, которые видит пользователь (_visible), под поиском, фильтрами и сортировкой."""
    query = select(Product).where(_visible(user))
    if params.collection is not None:
        query = query.where(Product.collection == params.collection)
    if params.status is not None:
        query = query.where(Product.status == params.status)

    if params.search:
        pattern = f"%{escape_like(params.search)}%"
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
            query.order_by(*_ORDER[params.sort]).offset((page - 1) * per_page).limit(per_page)
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
    in_work = await product_deliverables.products_in_work(db, (p.id for p in products))
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
                in_work=product.id in in_work,
            )
            for product in products
        ],
        total=total,
    )
