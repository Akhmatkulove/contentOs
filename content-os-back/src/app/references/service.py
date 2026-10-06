"""Пул референсов: что видит пользователь."""

import uuid
from collections import defaultdict

from sqlalchemy import exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role, User
from app.core.storage import Storage
from app.core.text import escape_like
from app.deliverables.models import Deliverable
from app.files.models import StoredFile
from app.references.models import Reference, ReferenceFile
from app.references.schemas import ReferenceList, ReferenceResponse


async def list_references(
    db: AsyncSession, user: User, storage: Storage, search: str, page: int, per_page: int
) -> ReferenceList:
    """Референсы пула, которые видит пользователь, новые первыми.

    Арт-директор видит референсы продуктов, где на него назначен deliverable
    (docs/adr/0004). Креатор получит их через съёмки; пока список пустой.
    """
    if user.role != Role.ART_DIRECTOR:
        return ReferenceList(items=[], total=0)

    query = select(Reference).where(
        exists().where(
            Deliverable.product_id == Reference.product_id, Deliverable.assignee_id == user.id
        )
    )
    if search:
        pattern = f"%{escape_like(search)}%"
        query = query.where(
            or_(
                Reference.title.ilike(pattern, escape="\\"),
                Reference.collection.ilike(pattern, escape="\\"),
            )
        )

    total = await db.scalar(select(func.count()).select_from(query.subquery())) or 0
    references = list(
        await db.scalars(
            query.order_by(Reference.created_at.desc(), Reference.id.desc())
            .offset((page - 1) * per_page)
            .limit(per_page)
        )
    )

    files: dict[uuid.UUID, list[StoredFile]] = defaultdict(list)
    for row in await db.execute(
        select(ReferenceFile.reference_id, StoredFile)
        .join(StoredFile, StoredFile.id == ReferenceFile.file_id)
        .where(ReferenceFile.reference_id.in_([reference.id for reference in references]))
        .order_by(ReferenceFile.reference_id, ReferenceFile.position)
    ):
        files[row.reference_id].append(row.StoredFile)
    authors: dict[uuid.UUID, str | None] = {
        row.id: row.name
        for row in await db.execute(
            select(User.id, User.name).where(
                User.id.in_({reference.owner_id for reference in references})
            )
        )
    }

    return ReferenceList(
        items=[
            ReferenceResponse.of(
                reference, authors.get(reference.owner_id), files[reference.id], storage
            )
            for reference in references
        ],
        total=total,
    )
