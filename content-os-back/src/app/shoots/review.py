"""Проверка deliverable арт-директором (docs/adr/0015).

У каждого исполнителя свои версии и свой статус. Арт-директор одобряет или
возвращает на доработку любую отправленную версию; одобренная — выбранная, у
исполнителя она одна (docs/adr/0016). Когда одобрена работа всех, арт-директор
отправляет deliverable бренду. Страница и действия — только арт-директору
съёмки, остальным 404. Коммитит вызывающий.
"""

import uuid
from collections import defaultdict

from fastapi import HTTPException, status
from sqlalchemy import exists, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.activity import service as activity
from app.activity.models import ActivityType
from app.auth.models import Role, User
from app.content import service as content
from app.core.config import Settings
from app.core.storage import Storage
from app.deliverables.models import DeliverableStatus
from app.notifications import service as notifications
from app.shoots.models import (
    Shoot,
    ShootDeliverable,
    ShootDeliverableAssignee,
    ShootMember,
    TaskVersion,
    VersionReview,
)
from app.shoots.schemas import (
    DeliverableReviewResponse,
    ReviewCreator,
    TaskVersionResponse,
    VersionReviewCreate,
)
from app.shoots.statuses import assignee_statuses, can_send, sync_status, work_statuses
from app.shoots.tasks import TaskRow, to_items
from app.shoots.versions import task_row, version_responses
from app.team.schemas import TeamMember


async def _reviewed(
    db: AsyncSession, user: User, task_id: uuid.UUID, *, lock: bool = False
) -> TaskRow:
    # Креатор не видит чужую работу: для него страницы нет, как и чужой задачи.
    if user.role != Role.ART_DIRECTOR:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Task not found")
    return await task_row(db, user, task_id, lock=lock)


def _require_not_sent(deliverable: ShootDeliverable) -> None:
    if deliverable.status == DeliverableStatus.APPROVED:
        raise HTTPException(status.HTTP_409_CONFLICT, "The deliverable is already sent")


async def get_review(
    db: AsyncSession, user: User, storage: Storage, settings: Settings, task_id: uuid.UUID
) -> DeliverableReviewResponse:
    """Работа каждого исполнителя: статус и отправленные версии, новые первыми."""
    row = await _reviewed(db, user, task_id)
    [item] = await to_items(db, user, storage, settings, [row])
    assignees = (
        await db.execute(
            select(ShootDeliverableAssignee, User, ShootMember.role)
            .join(User, User.id == ShootDeliverableAssignee.user_id)
            .outerjoin(
                ShootMember,
                (ShootMember.shoot_id == row.Shoot.id)
                & (ShootMember.user_id == ShootDeliverableAssignee.user_id),
            )
            .where(ShootDeliverableAssignee.deliverable_id == task_id)
            .order_by(ShootDeliverableAssignee.position)
        )
    ).all()
    versions: dict[uuid.UUID, list[TaskVersionResponse]] = defaultdict(list)
    for version in await version_responses(db, storage, settings, task_id):
        versions[version.author.id].append(version)

    return DeliverableReviewResponse(
        **dict(item),
        creators=[
            ReviewCreator(
                member=TeamMember.of(assignee.User, settings),
                role=assignee.role,
                status=assignee.ShootDeliverableAssignee.status,
                versions=versions[assignee.User.id],
            )
            for assignee in assignees
        ],
        can_send=can_send(
            row.ShootDeliverable,
            [assignee.ShootDeliverableAssignee.status for assignee in assignees],
        ),
    )


async def decide(
    db: AsyncSession,
    user: User,
    task_id: uuid.UUID,
    version_id: uuid.UUID,
    body: VersionReviewCreate,
) -> None:
    """Approve или Request changes по любой отправленной версии исполнителя.

    Approve выбирает версию: прежняя выбранная того же исполнителя теряет
    одобрение. Пока deliverable не отправлен бренду, решение можно поменять.
    """
    row = await _reviewed(db, user, task_id, lock=True)
    deliverable = row.ShootDeliverable
    _require_not_sent(deliverable)
    version = await db.scalar(
        select(TaskVersion).where(
            TaskVersion.id == version_id,
            TaskVersion.deliverable_id == task_id,
            TaskVersion.submitted_at.is_not(None),
        )
    )
    if version is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Version not found")
    assignee = await db.get(ShootDeliverableAssignee, (task_id, version.author_id))
    if assignee is None:
        # Автора убрали из исполнителей: его работа больше не проверяется.
        raise HTTPException(status.HTTP_409_CONFLICT, "The author is no longer an assignee")
    if body.decision == VersionReview.APPROVED:
        await db.execute(
            update(TaskVersion)
            .where(
                TaskVersion.deliverable_id == task_id,
                TaskVersion.author_id == version.author_id,
                TaskVersion.id != version.id,
                TaskVersion.review == VersionReview.APPROVED,
            )
            .values(review=None, reviewed_at=None)
        )

    version.review = body.decision
    version.reviewed_at = await db.scalar(select(func.now()))
    version.feedback = body.feedback or None
    await db.flush()
    # Из всех версий автора: решение по старой не перекрывает выбранную и ждущую.
    statuses = await work_statuses(db, [task_id])
    assignee.status = statuses[(task_id, version.author_id)]
    await sync_status(db, deliverable)
    activity.record(
        db,
        ActivityType.VERSION_APPROVED
        if body.decision == VersionReview.APPROVED
        else ActivityType.CHANGES_REQUESTED,
        user,
        deliverable.shoot_id,
        deliverable=deliverable,
        subject_id=version.author_id,
    )
    await db.flush()


async def send(db: AsyncSession, user: User, task_id: uuid.UUID) -> None:
    """Send to brand: когда одобрена работа каждого исполнителя.

    Файлы одобренных версий уходят на страницу Content, бренд получает
    уведомление «заказ готов» (docs/adr/0025).
    """
    row = await _reviewed(db, user, task_id, lock=True)
    deliverable = row.ShootDeliverable
    _require_not_sent(deliverable)
    if not can_send(deliverable, await assignee_statuses(db, task_id)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Every assignee's work must be approved")
    deliverable.status = DeliverableStatus.APPROVED
    deliverable.sent_at = await db.scalar(select(func.now()))
    await db.flush()
    files = await content.add_sent(db, task_id)
    await notifications.content_sent(db, user, deliverable, files)
    activity.record(
        db,
        ActivityType.CONTENT_SENT,
        user,
        deliverable.shoot_id,
        deliverable=deliverable,
        count=files,
    )
    # Отправлен последний: съёмка завершена (docs/adr/0007). Строка съёмки блокируется:
    # две одновременные отправки последних deliverables не пропустят событие.
    await db.execute(select(Shoot.id).where(Shoot.id == deliverable.shoot_id).with_for_update())
    unsent = await db.scalar(
        select(
            exists().where(
                ShootDeliverable.shoot_id == deliverable.shoot_id,
                ShootDeliverable.status != DeliverableStatus.APPROVED,
            )
        )
    )
    if not unsent:
        activity.record(db, ActivityType.SHOOT_COMPLETED, user, deliverable.shoot_id)
    await db.flush()
