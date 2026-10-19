"""Статус deliverable съёмки из статусов его исполнителей (docs/adr/0015)."""

import uuid
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.ext.asyncio import AsyncSession

from app.deliverables.models import DeliverableStatus
from app.shoots.models import ShootDeliverable, ShootDeliverableAssignee, TaskVersion, VersionReview

_DECIDED = {
    None: DeliverableStatus.NEEDS_REVIEW,
    VersionReview.APPROVED: DeliverableStatus.APPROVED,
    VersionReview.CHANGES_REQUESTED: DeliverableStatus.NEEDS_CHANGES,
}


def combined_status(statuses: Iterable[DeliverableStatus]) -> DeliverableStatus:
    """Статус deliverable, пока он не отправлен бренду.

    Сначала то, что ждёт арт-директора: проверка, затем доработка. Когда одобрены
    все, deliverable всё ещё ждёт его — отправки бренду.
    """
    present = list(statuses)
    if DeliverableStatus.NEEDS_REVIEW in present:
        return DeliverableStatus.NEEDS_REVIEW
    if DeliverableStatus.NEEDS_CHANGES in present:
        return DeliverableStatus.NEEDS_CHANGES
    if present and all(value == DeliverableStatus.APPROVED for value in present):
        return DeliverableStatus.NEEDS_REVIEW
    if any(value != DeliverableStatus.TO_SHOOT for value in present):
        return DeliverableStatus.IN_PROGRESS
    return DeliverableStatus.TO_SHOOT


def can_send(deliverable: ShootDeliverable, statuses: Iterable[DeliverableStatus]) -> bool:
    """Send to brand: есть исполнители, одобрена работа каждого, ещё не отправлен."""
    present = list(statuses)
    return (
        deliverable.status != DeliverableStatus.APPROVED
        and bool(present)
        and all(value == DeliverableStatus.APPROVED for value in present)
    )


async def assignee_statuses(db: AsyncSession, deliverable_id: uuid.UUID) -> list[DeliverableStatus]:
    return list(
        await db.scalars(
            select(ShootDeliverableAssignee.status).where(
                ShootDeliverableAssignee.deliverable_id == deliverable_id
            )
        )
    )


async def sync_status(db: AsyncSession, deliverable: ShootDeliverable) -> None:
    """Пересчитывает статус deliverable после изменения статуса исполнителя.

    Отправленный бренду (`approved`) больше не меняется.
    """
    if deliverable.status == DeliverableStatus.APPROVED:
        return
    await db.flush()
    deliverable.status = combined_status(await assignee_statuses(db, deliverable.id))


async def work_statuses(
    db: AsyncSession, deliverable_ids: Iterable[uuid.UUID]
) -> dict[tuple[uuid.UUID, uuid.UUID], DeliverableStatus]:
    """Статус работы каждого автора по его версиям: (deliverable_id, user_id) → статус.

    Выбранная (одобренная) версия — работа одобрена; иначе есть версия без решения —
    ждёт проверки; иначе по всем просили изменения; только черновик — в работе
    (docs/adr/0016). Кого нет в ответе, тот ещё не начинал. Совпадает с тем, что
    хранится у исполнителя, и годится, чтобы вернуть статус снятому и вновь
    назначенному исполнителю.
    """
    # Одна строка на автора: отправленная одобренная, иначе без решения, иначе
    # с наибольшим номером; только черновик — сам черновик.
    rows = await db.execute(
        select(
            TaskVersion.deliverable_id,
            TaskVersion.author_id,
            TaskVersion.submitted_at,
            TaskVersion.review,
        )
        .where(TaskVersion.deliverable_id.in_(list(deliverable_ids)))
        .ext(distinct_on(TaskVersion.deliverable_id, TaskVersion.author_id))
        .order_by(
            TaskVersion.deliverable_id,
            TaskVersion.author_id,
            TaskVersion.submitted_at.is_(None),
            TaskVersion.review.is_distinct_from(VersionReview.APPROVED),
            TaskVersion.review.is_not(None),
            TaskVersion.number.desc(),
        )
    )
    return {
        (row.deliverable_id, row.author_id): (
            _DECIDED[row.review] if row.submitted_at is not None else DeliverableStatus.IN_PROGRESS
        )
        for row in rows
    }
