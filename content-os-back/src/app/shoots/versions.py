"""Страница задачи и версии готового контента (docs/adr/0012).

Задачу видят те же, кто видит её в My tasks. Исполнители собирают черновик версии
и отправляют его на проверку; после этого можно начинать следующую.
Коммитит вызывающий.
"""

import uuid
from collections import defaultdict

from fastapi import HTTPException, status
from sqlalchemy import Row, delete, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.config import Settings
from app.core.storage import Storage
from app.deliverables.models import DeliverableStatus
from app.files.models import StoredFile
from app.files.schemas import FileResponse
from app.files.service import claim_files
from app.products.models import Product
from app.shoots.models import (
    Shoot,
    ShootDeliverable,
    ShootDeliverableAssignee,
    TaskVersion,
    TaskVersionFile,
)
from app.shoots.schemas import (
    TaskDraftFiles,
    TaskDraftTitle,
    TaskFile,
    TaskResponse,
    TaskVersionResponse,
)
from app.shoots.tasks import to_items, visible_tasks
from app.team.schemas import TeamMember


def _not_found(what: str = "Task") -> HTTPException:
    # Чужая задача отвечает так же, как несуществующая.
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{what} not found")


async def _task(
    db: AsyncSession, user: User, task_id: uuid.UUID, *, lock: bool = False
) -> Row[ShootDeliverable, Shoot, Product]:
    query = visible_tasks(user).where(ShootDeliverable.id == task_id)
    if lock:
        # Версии одной задачи нумеруются по очереди.
        query = query.with_for_update(of=ShootDeliverable)
    row = (await db.execute(query)).one_or_none()
    if row is None:
        raise _not_found()
    return row


async def _is_assignee(db: AsyncSession, user: User, task_id: uuid.UUID) -> bool:
    return bool(
        await db.scalar(
            select(
                exists().where(
                    ShootDeliverableAssignee.deliverable_id == task_id,
                    ShootDeliverableAssignee.user_id == user.id,
                )
            )
        )
    )


async def _require_assignee(db: AsyncSession, user: User, task_id: uuid.UUID) -> None:
    if not await _is_assignee(db, user, task_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the task's assignees upload content")


async def _draft(db: AsyncSession, task_id: uuid.UUID) -> TaskVersion | None:
    return await db.scalar(
        select(TaskVersion).where(
            TaskVersion.deliverable_id == task_id, TaskVersion.submitted_at.is_(None)
        )
    )


async def get_task(
    db: AsyncSession, user: User, storage: Storage, settings: Settings, task_id: uuid.UUID
) -> TaskResponse:
    row = await _task(db, user, task_id)
    [item] = await to_items(db, user, storage, settings, [row])
    can_upload = await _is_assignee(db, user, task_id)

    query = (
        select(TaskVersion, User)
        .join(User, User.id == TaskVersion.author_id)
        .where(TaskVersion.deliverable_id == task_id)
        .order_by(TaskVersion.number.desc())
    )
    if not can_upload:
        # Черновик — работа исполнителей, арт-директор видит только отправленное.
        query = query.where(TaskVersion.submitted_at.is_not(None))
    versions = (await db.execute(query)).all()
    files: dict[uuid.UUID, list[TaskFile]] = defaultdict(list)
    for link in await db.execute(
        select(TaskVersionFile.version_id, StoredFile)
        .join(StoredFile, StoredFile.id == TaskVersionFile.file_id)
        .where(TaskVersionFile.version_id.in_([version.TaskVersion.id for version in versions]))
        .order_by(TaskVersionFile.version_id, TaskVersionFile.position)
    ):
        file = link.StoredFile
        files[link.version_id].append(
            TaskFile(
                **FileResponse.of(file, storage).model_dump(),
                name=file.name,
                size=file.size,
            )
        )

    responses = [
        TaskVersionResponse(
            id=version.TaskVersion.id,
            number=version.TaskVersion.number,
            title=version.TaskVersion.title,
            author=TeamMember.of(version.User, settings),
            created_at=version.TaskVersion.created_at,
            submitted_at=version.TaskVersion.submitted_at,
            files=files[version.TaskVersion.id],
        )
        for version in versions
    ]
    return TaskResponse(
        **dict(item),
        versions=[version for version in responses if version.submitted_at is not None],
        draft=next((version for version in responses if version.submitted_at is None), None),
        can_upload=can_upload,
    )


async def add_draft_files(
    db: AsyncSession, user: User, task_id: uuid.UUID, body: TaskDraftFiles
) -> None:
    """Файлы в черновик следующей версии; черновика нет — он создаётся (V1, V2, …)."""
    await _task(db, user, task_id, lock=True)
    await _require_assignee(db, user, task_id)
    await claim_files(db, user, body.file_ids)

    draft = await _draft(db, task_id)
    if draft is None:
        last = await db.scalar(
            select(func.max(TaskVersion.number)).where(TaskVersion.deliverable_id == task_id)
        )
        draft = TaskVersion(deliverable_id=task_id, number=(last or 0) + 1, author_id=user.id)
        db.add(draft)
        await db.flush()
    start = await db.scalar(select(func.count()).where(TaskVersionFile.version_id == draft.id))
    db.add_all(
        TaskVersionFile(version_id=draft.id, file_id=file_id, position=(start or 0) + index)
        for index, file_id in enumerate(body.file_ids)
    )
    await db.flush()


async def _own_draft(db: AsyncSession, user: User, task_id: uuid.UUID) -> TaskVersion:
    await _task(db, user, task_id, lock=True)
    await _require_assignee(db, user, task_id)
    draft = await _draft(db, task_id)
    if draft is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "No draft: upload files first")
    return draft


async def save_draft(
    db: AsyncSession, user: User, task_id: uuid.UUID, body: TaskDraftTitle
) -> None:
    """Save draft: название черновика без отправки; файлы в нём и так сохранены."""
    draft = await _own_draft(db, user, task_id)
    draft.title = body.title or None
    await db.flush()


async def submit_draft(
    db: AsyncSession, user: User, task_id: uuid.UUID, body: TaskDraftTitle
) -> None:
    """Submit for review: черновик становится версией, задача уходит на проверку (ADR 0009)."""
    draft = await _own_draft(db, user, task_id)
    deliverable = await db.get_one(ShootDeliverable, task_id)
    draft.title = body.title or None
    draft.submitted_at = await db.scalar(select(func.now()))
    deliverable.status = DeliverableStatus.NEEDS_REVIEW
    await db.flush()


async def remove_draft_file(
    db: AsyncSession, user: User, task_id: uuid.UUID, file_id: uuid.UUID
) -> str:
    """Убирает файл из черновика; черновик без файлов удаляется. Отправленные версии —
    история того, что видел арт-директор: их не меняют.

    Возвращает ключ файла: из хранилища его удаляет вызывающий после commit.
    """
    await _task(db, user, task_id, lock=True)
    await _require_assignee(db, user, task_id)
    draft = await _draft(db, task_id)
    if draft is None:
        raise _not_found("File")
    key: str | None = await db.scalar(
        delete(StoredFile)
        .where(
            StoredFile.id == file_id,
            exists().where(
                TaskVersionFile.version_id == draft.id, TaskVersionFile.file_id == file_id
            ),
        )
        .returning(StoredFile.key)
    )
    if key is None:
        raise _not_found("File")
    left = await db.scalar(select(exists().where(TaskVersionFile.version_id == draft.id)))
    if not left:
        await db.delete(draft)
    await db.flush()
    return key
