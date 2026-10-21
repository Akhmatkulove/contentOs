"""Лента Activity (docs/adr/0027): запись событий и чтение ленты. Коммитит вызывающий."""

import base64
import uuid
from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy import ColumnElement, and_, func, select, tuple_, union_all
from sqlalchemy.ext.asyncio import AsyncSession

from app.activity.models import BRAND_TYPES, ActivityEvent, ActivityType
from app.activity.schemas import ActivityItem, ActivityList, ActivityRef
from app.auth.models import Role, User
from app.content.models import ContentComment
from app.core.config import Settings
from app.products.models import Product
from app.shoots.models import Shoot, ShootDeliverable, ShootMember
from app.team.schemas import TeamMember

# Сколько символов комментария показывает строка ленты.
COMMENT_EXCERPT = 140


def record(
    db: AsyncSession,
    kind: ActivityType,
    actor: User,
    shoot_id: uuid.UUID,
    *,
    deliverable: ShootDeliverable | None = None,
    subject_id: uuid.UUID | None = None,
    comment_id: uuid.UUID | None = None,
    count: int = 1,
) -> None:
    """Событие в той же транзакции, что и само действие."""
    db.add(
        ActivityEvent(
            type=kind,
            actor_id=actor.id,
            subject_id=subject_id,
            shoot_id=shoot_id,
            product_id=deliverable.product_id if deliverable else None,
            deliverable_id=deliverable.id if deliverable else None,
            comment_id=comment_id,
            count=count,
        )
    )


def _visible(user: User) -> ColumnElement[bool]:
    """Команде — события её съёмок: арт-директору своих, креатору тех, где он в
    команде; бренду — события из BRAND_TYPES по своим продуктам."""
    if user.role in (Role.ART_DIRECTOR, Role.CREATOR):
        shoots = union_all(
            select(Shoot.id).where(Shoot.art_director_id == user.id),
            select(ShootMember.shoot_id).where(ShootMember.user_id == user.id),
        )
        return ActivityEvent.shoot_id.in_(shoots)
    if user.role == Role.BRAND:
        return and_(
            ActivityEvent.type.in_(BRAND_TYPES),
            ActivityEvent.product_id.in_(select(Product.id).where(Product.brand_id == user.id)),
        )
    return ActivityEvent.id.is_(None)


def _encode(event: ActivityEvent) -> str:
    raw = f"{event.created_at.isoformat()}|{event.id}"
    return base64.urlsafe_b64encode(raw.encode()).decode()


def _decode(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        created_at, event_id = base64.urlsafe_b64decode(cursor.encode()).decode().split("|")
        at = datetime.fromisoformat(created_at)
        if at.tzinfo is None:
            raise ValueError("A cursor time needs a time zone")
        return at, uuid.UUID(event_id)
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, "Invalid cursor") from error


async def list_activity(
    db: AsyncSession, user: User, settings: Settings, limit: int, cursor: str | None
) -> ActivityList:
    """События, новые первыми, страницами по курсору: новое событие не сдвигает
    следующую страницу, как сдвинул бы offset.

    Число запросов не зависит от размера страницы.
    """
    query = select(ActivityEvent).where(_visible(user))
    if cursor is not None:
        created_at, event_id = _decode(cursor)
        query = query.where(
            tuple_(ActivityEvent.created_at, ActivityEvent.id) < tuple_(created_at, event_id)
        )
    # Одна лишняя строка говорит, есть ли следующая страница.
    events = list(
        await db.scalars(
            query.order_by(ActivityEvent.created_at.desc(), ActivityEvent.id.desc()).limit(
                limit + 1
            )
        )
    )
    more = len(events) > limit
    events = events[:limit]
    if not events:
        return ActivityList(items=[], next_cursor=None)

    user_ids = {
        user_id for event in events for user_id in (event.actor_id, event.subject_id) if user_id
    }
    people = {
        person.id: TeamMember.of(person, settings)
        for person in await db.scalars(select(User).where(User.id.in_(user_ids)))
    }
    shoots = {
        row.id: ActivityRef(id=row.id, name=row.name)
        for row in await db.execute(
            select(Shoot.id, Shoot.name).where(Shoot.id.in_({e.shoot_id for e in events}))
        )
    }
    products = {
        row.id: ActivityRef(id=row.id, name=row.name)
        for row in await db.execute(
            select(Product.id, Product.name).where(
                Product.id.in_({e.product_id for e in events if e.product_id})
            )
        )
    }
    deliverables = {
        row.id: ActivityRef(id=row.id, name=row.name)
        for row in await db.execute(
            select(ShootDeliverable.id, ShootDeliverable.name).where(
                ShootDeliverable.id.in_({e.deliverable_id for e in events if e.deliverable_id})
            )
        )
    }
    comments = {
        row.id: row.excerpt
        for row in await db.execute(
            select(
                ContentComment.id, func.left(ContentComment.body, COMMENT_EXCERPT).label("excerpt")
            ).where(ContentComment.id.in_({e.comment_id for e in events if e.comment_id}))
        )
    }

    def person(user_id: uuid.UUID | None) -> TeamMember | None:
        return people.get(user_id) if user_id else None

    return ActivityList(
        items=[
            ActivityItem(
                id=event.id,
                type=event.type,
                created_at=event.created_at,
                actor=person(event.actor_id),
                subject=person(event.subject_id),
                shoot=None if user.role == Role.BRAND else shoots[event.shoot_id],
                product=products.get(event.product_id) if event.product_id else None,
                deliverable=(
                    deliverables.get(event.deliverable_id) if event.deliverable_id else None
                ),
                comment=comments.get(event.comment_id) if event.comment_id else None,
                count=event.count,
            )
            for event in events
        ],
        next_cursor=_encode(events[-1]) if more else None,
    )
