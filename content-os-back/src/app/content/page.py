"""Страница контента (docs/adr/0026): отправленный бренду deliverable целиком.

Видят её те же, кто видит его файлы на странице Content, и только эти файлы.
Комментируют бренд продукта и арт-директор съёмки; в избранное добавляет и
одобряет бренд. Коммитит вызывающий.
"""

import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import and_, delete, exists, func, select, tuple_, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.activity import service as activity
from app.activity.models import ActivityType
from app.auth.models import User
from app.content.models import ContentComment, ContentFavorite, ContentItem, ContentStatus
from app.content.schemas import (
    ContentCommentResponse,
    ContentDetails,
    ContentMaterial,
    ContentPerson,
    ContentProduct,
    ContentShoot,
    ContentVersion,
)
from app.content.service import joined, shoot_visible, visible
from app.core.config import Settings
from app.core.storage import Storage
from app.files.models import StoredFile
from app.files.schemas import FileResponse
from app.notifications import service as notifications
from app.products.models import Product, ProductPhoto
from app.references import service as references
from app.references.models import Reference
from app.shoots.models import (
    Shoot,
    ShootDeliverable,
    ShootDeliverableReference,
    ShootMember,
    TaskVersion,
    TaskVersionFile,
)
from app.team.schemas import TeamMember


def _not_found() -> HTTPException:
    # Чужой контент отвечает так же, как несуществующий.
    return HTTPException(status.HTTP_404_NOT_FOUND, "Content not found")


async def _materials(db: AsyncSession, user: User, deliverable_id: uuid.UUID) -> list[Any]:
    """Видимые пользователю файлы deliverable по порядку; нет ни одного — 404."""
    rows = (
        await db.execute(
            joined(ContentItem, StoredFile, shoot_visible(user).label("shoot_visible"))
            .where(ContentItem.deliverable_id == deliverable_id, visible(user))
            .order_by(ContentItem.position, ContentItem.id)
        )
    ).all()
    if not rows:
        raise _not_found()
    return list(rows)


async def _sent(
    db: AsyncSession, user: User, deliverable_id: uuid.UUID
) -> tuple[ShootDeliverable, Shoot, Product]:
    """Deliverable, его съёмка и продукт, если пользователь видит его контент."""
    row = (
        await db.execute(
            joined(ShootDeliverable, Shoot, Product)
            .where(ContentItem.deliverable_id == deliverable_id, visible(user))
            .limit(1)
        )
    ).one_or_none()
    if row is None:
        raise _not_found()
    return row.ShootDeliverable, row.Shoot, row.Product


async def _neighbours(
    db: AsyncSession, user: User, deliverable_id: uuid.UUID
) -> tuple[uuid.UUID | None, uuid.UUID | None]:
    """Соседи в порядке страницы Content: новые первыми, без учёта её фильтров."""
    sent = (
        joined(
            ContentItem.deliverable_id.label("id"),
            func.min(ContentItem.created_at).label("sent_at"),
        )
        .where(visible(user))
        .group_by(ContentItem.deliverable_id)
        .subquery()
    )
    current = select(sent.c.sent_at, sent.c.id).where(sent.c.id == deliverable_id).subquery()
    key = tuple_(sent.c.sent_at, sent.c.id)
    here = tuple_(current.c.sent_at, current.c.id)
    previous = await db.scalar(
        select(sent.c.id).where(key > here).order_by(sent.c.sent_at, sent.c.id).limit(1)
    )
    following = await db.scalar(
        select(sent.c.id)
        .where(key < here)
        .order_by(sent.c.sent_at.desc(), sent.c.id.desc())
        .limit(1)
    )
    return previous, following


async def _comments(
    db: AsyncSession, settings: Settings, deliverable_id: uuid.UUID
) -> list[ContentCommentResponse]:
    rows = await db.execute(
        select(ContentComment, User)
        .join(User, User.id == ContentComment.author_id)
        .where(ContentComment.deliverable_id == deliverable_id)
        .order_by(ContentComment.created_at.desc(), ContentComment.id.desc())
    )
    return [_comment(row.ContentComment, row.User, settings) for row in rows]


def _comment(comment: ContentComment, author: User, settings: Settings) -> ContentCommentResponse:
    return ContentCommentResponse(
        id=comment.id,
        author=TeamMember.of(author, settings),
        role=author.role,
        body=comment.body,
        created_at=comment.created_at,
    )


async def _versions(
    db: AsyncSession, settings: Settings, deliverable_id: uuid.UUID
) -> list[ContentVersion]:
    """Отправленные версии всех исполнителей, новые первыми, с размером файлов."""
    rows = await db.execute(
        select(TaskVersion, User, func.coalesce(func.sum(StoredFile.size), 0).label("size"))
        .join(User, User.id == TaskVersion.author_id)
        .outerjoin(TaskVersionFile, TaskVersionFile.version_id == TaskVersion.id)
        .outerjoin(StoredFile, StoredFile.id == TaskVersionFile.file_id)
        .where(
            TaskVersion.deliverable_id == deliverable_id,
            TaskVersion.submitted_at.is_not(None),
        )
        .group_by(TaskVersion.id, User.id)
        .order_by(TaskVersion.submitted_at.desc(), TaskVersion.number.desc(), TaskVersion.id)
    )
    return [
        ContentVersion(
            id=row.TaskVersion.id,
            number=row.TaskVersion.number,
            title=row.TaskVersion.title,
            author=TeamMember.of(row.User, settings),
            submitted_at=row.TaskVersion.submitted_at,
            review=row.TaskVersion.review,
            size=row.size,
        )
        for row in rows
    ]


async def _people(
    db: AsyncSession, settings: Settings, shoot_id: uuid.UUID, author_ids: list[uuid.UUID]
) -> list[ContentPerson]:
    """Исполнители в порядке их файлов, с ролью в съёмке."""
    rows = await db.execute(
        select(User, ShootMember.role)
        .outerjoin(
            ShootMember, and_(ShootMember.shoot_id == shoot_id, ShootMember.user_id == User.id)
        )
        .where(User.id.in_(author_ids))
    )
    found = {row.User.id: row for row in rows}
    return [
        ContentPerson(member=TeamMember.of(found[id_].User, settings), role=found[id_].role)
        for id_ in author_ids
        if id_ in found
    ]


async def _references(
    db: AsyncSession, deliverable_id: uuid.UUID, product_id: uuid.UUID
) -> list[Reference]:
    """Референсы deliverable съёмки по порядку, затем референсы продукта, новые
    первыми. Видят все, кому видна страница, бренд тоже."""
    found: list[Reference] = list(
        await db.scalars(
            select(Reference)
            .join(ShootDeliverableReference, ShootDeliverableReference.reference_id == Reference.id)
            .where(ShootDeliverableReference.deliverable_id == deliverable_id)
            .order_by(ShootDeliverableReference.position)
        )
    )
    found += await db.scalars(
        select(Reference)
        .where(Reference.product_id == product_id)
        .order_by(Reference.created_at.desc(), Reference.id.desc())
    )
    # Референс продукта мог попасть и в deliverable: один раз, на первом месте.
    return list({reference.id: reference for reference in found}.values())


async def _product(db: AsyncSession, storage: Storage, product: Product) -> ContentProduct:
    photo = await db.scalar(
        select(StoredFile)
        .join(ProductPhoto, ProductPhoto.file_id == StoredFile.id)
        .where(ProductPhoto.product_id == product.id, ProductPhoto.position == 0)
    )
    return ContentProduct(
        id=product.id,
        name=product.name,
        photo=FileResponse.of(photo, storage) if photo else None,
    )


async def get_page(
    db: AsyncSession,
    user: User,
    storage: Storage,
    settings: Settings,
    deliverable_id: uuid.UUID,
) -> ContentDetails:
    rows = await _materials(db, user, deliverable_id)
    deliverable, shoot, product = await _sent(db, user, deliverable_id)
    # Креатор видит съёмку своих арт-директоров или если сам снимал.
    shows_shoot = any(row.shoot_visible for row in rows)
    items: list[ContentItem] = [row.ContentItem for row in rows]
    approved = all(item.status == ContentStatus.APPROVED for item in items)
    author_ids = list(dict.fromkeys(item.author_id for item in items))

    picked = await _references(db, deliverable_id, product.id)

    is_brand = user.id == product.brand_id
    favorite = is_brand and bool(
        await db.scalar(
            select(
                exists().where(
                    ContentFavorite.user_id == user.id,
                    ContentFavorite.deliverable_id == deliverable_id,
                )
            )
        )
    )
    previous_id, next_id = await _neighbours(db, user, deliverable_id)
    return ContentDetails(
        id=deliverable.id,
        name=items[0].name,
        type=deliverable.type,
        status=ContentStatus.APPROVED if approved else ContentStatus.NEW,
        sent_at=min(item.created_at for item in items),
        approved_at=max(
            (item.approved_at for item in items if item.approved_at is not None), default=None
        ),
        product=await _product(db, storage, product),
        shoot=(
            ContentShoot(id=shoot.id, name=shoot.name, date=shoot.date, location=shoot.location)
            if shows_shoot
            else None
        ),
        people=await _people(db, settings, shoot.id, author_ids),
        materials=[
            ContentMaterial(
                id=row.ContentItem.id,
                file=FileResponse.of(row.StoredFile, storage),
                author_id=row.ContentItem.author_id,
            )
            for row in rows
        ],
        references=await references.to_responses(db, user, storage, picked),
        versions=(
            await _versions(db, settings, deliverable_id)
            if user.id == shoot.art_director_id
            else None
        ),
        comments=await _comments(db, settings, deliverable_id),
        favorite=favorite,
        can_favorite=is_brand,
        can_comment=user.id in (product.brand_id, shoot.art_director_id),
        can_approve=is_brand and not approved,
        previous_id=previous_id,
        next_id=next_id,
    )


async def _related(
    db: AsyncSession, deliverable_id: uuid.UUID, shoot: Shoot, product: Product
) -> set[uuid.UUID]:
    """Все, кого касается контент: бренд, арт-директор съёмки и авторы файлов."""
    authors = await db.scalars(
        select(ContentItem.author_id).where(ContentItem.deliverable_id == deliverable_id).distinct()
    )
    return {product.brand_id, shoot.art_director_id, *authors}


async def add_comment(
    db: AsyncSession, user: User, settings: Settings, deliverable_id: uuid.UUID, body: str
) -> ContentCommentResponse:
    """Комментарий бренда или арт-директора съёмки; остальным, кого касается, — уведомление."""
    deliverable, shoot, product = await _sent(db, user, deliverable_id)
    if user.id not in (product.brand_id, shoot.art_director_id):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN, "Only the brand and the art director can comment"
        )
    comment = ContentComment(deliverable_id=deliverable_id, author_id=user.id, body=body)
    db.add(comment)
    await db.flush()
    await db.refresh(comment, ["created_at"])
    recipients = await _related(db, deliverable_id, shoot, product) - {user.id}
    await notifications.content_commented(db, user, deliverable, recipients)
    activity.record(
        db,
        ActivityType.CONTENT_COMMENTED,
        user,
        shoot.id,
        deliverable=deliverable,
        comment_id=comment.id,
    )
    await db.flush()
    return _comment(comment, user, settings)


async def delete_comment(
    db: AsyncSession, user: User, deliverable_id: uuid.UUID, comment_id: uuid.UUID
) -> None:
    """Удалить свой комментарий; чужой — 403, несуществующий или невидимый — 404."""
    await _sent(db, user, deliverable_id)
    comment = await db.scalar(
        select(ContentComment).where(
            ContentComment.id == comment_id, ContentComment.deliverable_id == deliverable_id
        )
    )
    if comment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found")
    if comment.author_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the author can delete a comment")
    await db.delete(comment)


async def _require_brand(
    db: AsyncSession, user: User, deliverable_id: uuid.UUID
) -> tuple[ShootDeliverable, Shoot, Product]:
    deliverable, shoot, product = await _sent(db, user, deliverable_id)
    if user.id != product.brand_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the brand can do this")
    return deliverable, shoot, product


async def approve(db: AsyncSession, user: User, deliverable_id: uuid.UUID) -> None:
    """Бренд одобряет весь отправленный deliverable; повторно — ничего не меняет.

    Арт-директор съёмки и авторы файлов получают уведомление.
    """
    deliverable, shoot, product = await _require_brand(db, user, deliverable_id)
    # Строки блокируются: двойное нажатие не пришлёт уведомления дважды.
    approved = list(
        await db.scalars(
            update(ContentItem)
            .where(
                ContentItem.deliverable_id == deliverable_id,
                ContentItem.status != ContentStatus.APPROVED,
            )
            .values(status=ContentStatus.APPROVED, approved_at=func.now())
            .returning(ContentItem.id)
        )
    )
    if not approved:
        return
    recipients = await _related(db, deliverable_id, shoot, product) - {user.id}
    files = await db.scalar(
        select(func.count()).where(ContentItem.deliverable_id == deliverable_id)
    )
    await notifications.content_approved(db, user, deliverable, recipients, files or 0)
    activity.record(
        db,
        ActivityType.CONTENT_APPROVED,
        user,
        shoot.id,
        deliverable=deliverable,
        count=files or 0,
    )
    await db.flush()


async def set_favorite(
    db: AsyncSession, user: User, deliverable_id: uuid.UUID, *, favorite: bool
) -> None:
    """Избранное бренда; повторный вызов ничего не меняет."""
    await _require_brand(db, user, deliverable_id)
    if favorite:
        await db.execute(
            insert(ContentFavorite)
            .values(user_id=user.id, deliverable_id=deliverable_id)
            .on_conflict_do_nothing()
        )
    else:
        await db.execute(
            delete(ContentFavorite).where(
                ContentFavorite.user_id == user.id,
                ContentFavorite.deliverable_id == deliverable_id,
            )
        )
