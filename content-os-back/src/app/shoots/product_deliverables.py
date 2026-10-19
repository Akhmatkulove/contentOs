"""Связь deliverable съёмки с заказом бренда — deliverable продукта (docs/adr/0017).

Статус заказа выводится из deliverables съёмок, которые его закрывают (docs/adr/0018).
"""

import uuid
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass

from fastapi import HTTPException, status
from sqlalchemy import Subquery, case, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.deliverables.models import Deliverable, DeliverableStatus
from app.shoots.models import Shoot, ShootDeliverable
from app.shoots.schemas import PlannedShoot, ProductDeliverableOption, ShootDeliverableDraft


def _unprocessable(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail)


async def require_linkable(
    db: AsyncSession,
    art_director: User,
    drafts: list[ShootDeliverableDraft],
    existing: dict[uuid.UUID, ShootDeliverable],
) -> None:
    """Каждый deliverable съёмки закрывает заказ своего продукта.

    Новый для съёмки заказ — назначенный на арт-директора. Заказы, которые уже
    закрывает эта съёмка, проходят без проверки назначения: его могли снять
    после. Без заказа остаётся только сохранённый deliverable, чей заказ бренд
    убрал из продукта (`existing` — сохранённые deliverables съёмки).
    """
    for draft in drafts:
        if draft.product_deliverable_id is not None:
            continue
        if draft.id is None or existing[draft.id].product_deliverable_id is not None:
            raise _unprocessable("Pick the product deliverable")

    wanted = {d.product_deliverable_id for d in drafts if d.product_deliverable_id is not None}
    linked = {d.product_deliverable_id for d in existing.values()}
    found = {
        row.id: row
        for row in await db.execute(
            select(Deliverable.id, Deliverable.product_id, Deliverable.assignee_id).where(
                Deliverable.id.in_(wanted)
            )
        )
    }
    # Чужой заказ отвечает так же, как несуществующий.
    if any(
        id_ not in found or (id_ not in linked and found[id_].assignee_id != art_director.id)
        for id_ in wanted
    ):
        raise _unprocessable("Product deliverable not found")
    for draft in drafts:
        if draft.product_deliverable_id is None:
            continue
        if found[draft.product_deliverable_id].product_id != draft.product_id:
            raise _unprocessable("A deliverable's product deliverable is for another product")


def derived() -> Subquery:
    """Статус и число съёмок каждого запланированного заказа (docs/adr/0018).

    Статус — из статусов deliverables съёмок, которые закрывают заказ: хоть один
    отправлен бренду — approved, по заказу есть готовый контент. Иначе — как у
    deliverable съёмки из статусов исполнителей (docs/adr/0015, combined_status):
    проверка, доработка, работа, to_shoot. Незапланированных заказов здесь нет:
    для них to_shoot и 0 съёмок.
    """
    value = ShootDeliverable.status
    return (
        select(
            ShootDeliverable.product_deliverable_id.label("id"),
            func.count(distinct(ShootDeliverable.shoot_id)).label("shoots"),
            case(
                *(
                    (func.bool_or(value == status), status.value)
                    for status in (
                        DeliverableStatus.APPROVED,
                        DeliverableStatus.NEEDS_REVIEW,
                        DeliverableStatus.NEEDS_CHANGES,
                    )
                ),
                (
                    func.bool_or(value != DeliverableStatus.TO_SHOOT),
                    DeliverableStatus.IN_PROGRESS.value,
                ),
                else_=DeliverableStatus.TO_SHOOT.value,
            ).label("status"),
        )
        .where(ShootDeliverable.product_deliverable_id.is_not(None))
        .group_by(ShootDeliverable.product_deliverable_id)
        .subquery("derived")
    )


async def any_in_work(db: AsyncSession, ids: Iterable[uuid.UUID]) -> bool:
    """Хоть один из заказов уже снимают: его deliverable съёмки не в to_shoot,
    в том числе отправлен бренду (docs/adr/0021).

    Deliverables съёмки блокируются до конца транзакции: исполнитель не начнёт
    работу между проверкой и удалением заказа.
    """
    wanted = set(ids)
    if not wanted:
        return False
    statuses = await db.scalars(
        select(ShootDeliverable.status)
        .where(ShootDeliverable.product_deliverable_id.in_(wanted))
        .order_by(ShootDeliverable.id)
        .with_for_update()
    )
    return any(value != DeliverableStatus.TO_SHOOT for value in statuses)


# Работа по продукту идёт: снято или снимается, но ещё не отправлено бренду.
IN_WORK = (
    DeliverableStatus.IN_PROGRESS,
    DeliverableStatus.NEEDS_REVIEW,
    DeliverableStatus.NEEDS_CHANGES,
)


async def products_in_work(
    db: AsyncSession, product_ids: Iterable[uuid.UUID], *, lock: bool = False
) -> set[uuid.UUID]:
    """Продукты, по которым идёт работа: deliverable съёмки в работе (docs/adr/0022).

    Считаются все deliverables съёмок продукта, со связью с заказом и без.
    `lock` блокирует их до конца транзакции: исполнитель не начнёт работу между
    проверкой и архивом.
    """
    wanted = set(product_ids)
    if not wanted:
        return set()
    query = select(ShootDeliverable.product_id, ShootDeliverable.status).where(
        ShootDeliverable.product_id.in_(wanted)
    )
    if lock:
        query = query.order_by(ShootDeliverable.id).with_for_update()
    return {row.product_id for row in await db.execute(query) if row.status in IN_WORK}


@dataclass(frozen=True)
class Progress:
    status: DeliverableStatus
    # Сколько съёмок закрывают заказ; 0 — ещё не запланирован.
    shoots: int


NOT_SCHEDULED = Progress(DeliverableStatus.TO_SHOOT, 0)


async def progress(db: AsyncSession, ids: Iterable[uuid.UUID]) -> dict[uuid.UUID, Progress]:
    """Статус и число съёмок каждого заказа одним запросом. Незапланированных в
    ответе нет: для них — `NOT_SCHEDULED`."""
    wanted = set(ids)
    if not wanted:
        return {}
    table = derived()
    rows = await db.execute(select(table).where(table.c.id.in_(wanted)))
    return {row.id: Progress(DeliverableStatus(row.status), row.shoots) for row in rows}


async def names(db: AsyncSession, ids: Iterable[uuid.UUID | None]) -> dict[uuid.UUID, str]:
    wanted = {id_ for id_ in ids if id_ is not None}
    if not wanted:
        return {}
    rows = await db.execute(
        select(Deliverable.id, Deliverable.name).where(Deliverable.id.in_(wanted))
    )
    return {row.id: row.name for row in rows}


async def list_options(
    db: AsyncSession, art_director: User, product_ids: list[uuid.UUID]
) -> list[ProductDeliverableOption]:
    """Заказы продуктов, назначенные на арт-директора, по порядку в продукте.

    У каждого — его съёмки, где заказ уже закрывает deliverable.
    """
    query = select(Deliverable).where(Deliverable.assignee_id == art_director.id)
    if product_ids:
        query = query.where(Deliverable.product_id.in_(product_ids))
    deliverables = list(
        await db.scalars(
            query.order_by(Deliverable.product_id, Deliverable.position, Deliverable.id)
        )
    )
    progresses = await progress(db, (d.id for d in deliverables))
    shoots: dict[uuid.UUID, list[PlannedShoot]] = defaultdict(list)
    for row in await db.execute(
        select(ShootDeliverable.product_deliverable_id, Shoot.id, Shoot.name, Shoot.date)
        .distinct()
        .join(Shoot, Shoot.id == ShootDeliverable.shoot_id)
        .where(
            ShootDeliverable.product_deliverable_id.in_([d.id for d in deliverables]),
            Shoot.art_director_id == art_director.id,
        )
        .order_by(ShootDeliverable.product_deliverable_id, Shoot.date, Shoot.id)
    ):
        shoots[row.product_deliverable_id].append(
            PlannedShoot(id=row.id, name=row.name, date=row.date)
        )
    return [
        ProductDeliverableOption(
            id=deliverable.id,
            product_id=deliverable.product_id,
            name=deliverable.name,
            type=deliverable.type,
            brief=deliverable.brief,
            due_date=deliverable.due_date,
            status=progresses.get(deliverable.id, NOT_SCHEDULED).status,
            shoots=shoots[deliverable.id],
        )
        for deliverable in deliverables
    ]
