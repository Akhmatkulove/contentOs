"""Уведомления в колокольчике (docs/adr/0020). Коммитит вызывающий."""

import uuid
from collections import Counter

from fastapi import HTTPException, status
from sqlalchemy import ColumnElement, and_, delete, exists, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.config import Settings
from app.core.storage import Storage
from app.deliverables.models import Deliverable
from app.files.models import StoredFile
from app.files.schemas import FileResponse
from app.notifications.models import Notification, NotificationType
from app.notifications.schemas import (
    NotificationList,
    NotificationProduct,
    NotificationResponse,
)
from app.products.models import Product, ProductPhoto
from app.team.schemas import TeamMember


async def deliverables_assigned(
    db: AsyncSession, brand: User, product_id: uuid.UUID, assignees: Counter[uuid.UUID]
) -> None:
    """Арт-директорам — сколько deliverables продукта на них назначено.

    Непрочитанное уведомление о том же продукте растёт и поднимается наверх:
    одно на продукт, сколько бы сохранений ни было, пока его не прочли.
    """
    for user_id, count in assignees.items():
        if user_id == brand.id:
            continue
        bumped = await db.scalar(
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.type == NotificationType.DELIVERABLES_ASSIGNED,
                Notification.product_id == product_id,
                Notification.read_at.is_(None),
            )
            .values(
                count=Notification.count + count,
                actor_id=brand.id,
                created_at=func.clock_timestamp(),
            )
            .returning(Notification.id)
        )
        if bumped is None:
            db.add(
                Notification(
                    user_id=user_id,
                    type=NotificationType.DELIVERABLES_ASSIGNED,
                    actor_id=brand.id,
                    product_id=product_id,
                    count=count,
                )
            )
    await db.flush()


async def forget_unassigned(db: AsyncSession, product_id: uuid.UUID) -> None:
    """Непрочитанные уведомления о продукте у тех, на ком больше нет его
    deliverables, удаляются: иначе следующее назначение прибавилось бы к уже
    снятым и показало неверное число."""
    await db.execute(
        delete(Notification).where(
            Notification.product_id == product_id,
            Notification.type == NotificationType.DELIVERABLES_ASSIGNED,
            Notification.read_at.is_(None),
            ~exists().where(
                Deliverable.product_id == product_id,
                Deliverable.assignee_id == Notification.user_id,
            ),
        )
    )


def _visible(user: User) -> ColumnElement[bool]:
    """Свои уведомления о том, что пользователь ещё видит: о назначении — пока на
    нём есть deliverable продукта (связку с брендом могли снять, docs/adr/0004)."""
    still_assigned = exists().where(
        Deliverable.product_id == Notification.product_id,
        Deliverable.assignee_id == user.id,
    )
    return and_(
        Notification.user_id == user.id,
        or_(Notification.type != NotificationType.DELIVERABLES_ASSIGNED, still_assigned),
    )


async def list_notifications(
    db: AsyncSession, user: User, storage: Storage, settings: Settings, limit: int
) -> NotificationList:
    unread = await db.scalar(
        select(func.count()).where(_visible(user), Notification.read_at.is_(None))
    )
    notifications = list(
        await db.scalars(
            select(Notification)
            .where(_visible(user))
            .order_by(Notification.created_at.desc(), Notification.id.desc())
            .limit(limit)
        )
    )
    actor_ids = {n.actor_id for n in notifications if n.actor_id is not None}
    actors = {
        actor.id: TeamMember.of(actor, settings)
        for actor in await db.scalars(select(User).where(User.id.in_(actor_ids)))
    }
    product_ids = {n.product_id for n in notifications if n.product_id is not None}
    products = {
        row.Product.id: NotificationProduct(
            id=row.Product.id,
            name=row.Product.name,
            photo=FileResponse.of(row.StoredFile, storage) if row.StoredFile else None,
        )
        for row in await db.execute(
            select(Product, StoredFile)
            .outerjoin(
                ProductPhoto,
                and_(ProductPhoto.product_id == Product.id, ProductPhoto.position == 0),
            )
            .outerjoin(StoredFile, StoredFile.id == ProductPhoto.file_id)
            .where(Product.id.in_(product_ids))
        )
    }
    return NotificationList(
        items=[
            NotificationResponse(
                id=n.id,
                type=n.type,
                created_at=n.created_at,
                read=n.read_at is not None,
                actor=actors.get(n.actor_id) if n.actor_id else None,
                product=products.get(n.product_id) if n.product_id else None,
                count=n.count,
            )
            for n in notifications
        ],
        unread=unread or 0,
    )


async def mark_read(db: AsyncSession, user: User, notification_id: uuid.UUID | None) -> None:
    """Одно уведомление или все (`None`). Чужое — 404, как несуществующее."""
    query = update(Notification).where(
        Notification.user_id == user.id, Notification.read_at.is_(None)
    )
    if notification_id is not None:
        if not await db.scalar(
            select(
                exists().where(Notification.id == notification_id, Notification.user_id == user.id)
            )
        ):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
        query = query.where(Notification.id == notification_id)
    await db.execute(query.values(read_at=func.now()))
