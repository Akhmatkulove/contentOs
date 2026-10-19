"""Связь deliverable съёмки с заказом бренда — deliverable продукта (docs/adr/0017)."""

import uuid
from collections import defaultdict
from collections.abc import Iterable

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.deliverables.models import Deliverable
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
            shoots=shoots[deliverable.id],
        )
        for deliverable in deliverables
    ]
