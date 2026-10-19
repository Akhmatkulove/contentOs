"""Страница задачи и версии готового контента (docs/adr/0012, 0015).

Задачу видят те же, кто видит её в My tasks. Каждый исполнитель собирает свой
черновик версии и отправляет его на проверку; после этого можно начинать следующую.
Версию, по которой просили изменения, исполнитель правит и отправляет снова (0016).
Коммитит вызывающий.
"""

import uuid
from collections import defaultdict

from fastapi import HTTPException, status
from sqlalchemy import delete, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.config import Settings
from app.core.storage import Storage
from app.deliverables.models import DeliverableStatus
from app.files.models import StoredFile
from app.files.schemas import FileResponse
from app.files.service import claim_files
from app.references import service as references
from app.references.models import Reference
from app.references.schemas import ReferenceResponse
from app.shoots.models import (
    ShootDeliverable,
    ShootDeliverableAssignee,
    ShootDeliverableReference,
    TaskVersion,
    TaskVersionFile,
    VersionReview,
)
from app.shoots.schemas import (
    TaskDraftFiles,
    TaskDraftTitle,
    TaskFile,
    TaskResponse,
    TaskVersionFiles,
    TaskVersionResponse,
)
from app.shoots.statuses import sync_status, work_statuses
from app.shoots.tasks import TASK_PAGE_REFERENCES, TaskRow, to_items, visible_tasks
from app.team.schemas import TeamMember


def _not_found(what: str = "Task") -> HTTPException:
    # Чужая задача отвечает так же, как несуществующая.
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{what} not found")


async def task_row(
    db: AsyncSession, user: User, task_id: uuid.UUID, *, lock: bool = False
) -> TaskRow:
    query = visible_tasks(user).where(ShootDeliverable.id == task_id)
    if lock:
        # Версии, проверка и статусы одной задачи меняются по очереди.
        query = query.with_for_update(of=ShootDeliverable)
    row = (await db.execute(query)).one_or_none()
    if row is None:
        raise _not_found()
    return row


async def _assignee(
    db: AsyncSession, user: User, task_id: uuid.UUID
) -> ShootDeliverableAssignee | None:
    return await db.get(ShootDeliverableAssignee, (task_id, user.id))


async def _require_assignee(
    db: AsyncSession, user: User, task_id: uuid.UUID
) -> ShootDeliverableAssignee:
    assignee = await _assignee(db, user, task_id)
    if assignee is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the task's assignees upload content")
    return assignee


async def _draft(db: AsyncSession, user: User, task_id: uuid.UUID) -> TaskVersion | None:
    return await db.scalar(
        select(TaskVersion).where(
            TaskVersion.deliverable_id == task_id,
            TaskVersion.author_id == user.id,
            TaskVersion.submitted_at.is_(None),
        )
    )


async def version_responses(
    db: AsyncSession,
    storage: Storage,
    settings: Settings,
    task_id: uuid.UUID,
    *,
    author_id: uuid.UUID | None = None,
    submitted_only: bool = True,
) -> list[TaskVersionResponse]:
    """Версии задачи с файлами, новые первыми: двумя запросами на любое их число."""
    query = (
        select(TaskVersion, User)
        .join(User, User.id == TaskVersion.author_id)
        .where(TaskVersion.deliverable_id == task_id)
        # Черновик (без submitted_at) — первым: он новее всех отправленных.
        .order_by(TaskVersion.submitted_at.desc().nulls_first(), TaskVersion.number.desc())
    )
    if author_id is not None:
        query = query.where(TaskVersion.author_id == author_id)
    if submitted_only:
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
    return [
        TaskVersionResponse(
            id=version.TaskVersion.id,
            number=version.TaskVersion.number,
            title=version.TaskVersion.title,
            author=TeamMember.of(version.User, settings),
            created_at=version.TaskVersion.created_at,
            submitted_at=version.TaskVersion.submitted_at,
            review=version.TaskVersion.review,
            reviewed_at=version.TaskVersion.reviewed_at,
            feedback=version.TaskVersion.feedback,
            files=files[version.TaskVersion.id],
        )
        for version in versions
    ]


async def get_task(
    db: AsyncSession, user: User, storage: Storage, settings: Settings, task_id: uuid.UUID
) -> TaskResponse:
    row = await task_row(db, user, task_id)
    [item] = await to_items(db, user, storage, settings, [row], TASK_PAGE_REFERENCES)
    assignee = await _assignee(db, user, task_id)
    # Исполнитель видит свою работу вместе с черновиком; арт-директор — все
    # отправленные версии, черновики — нет.
    responses = await version_responses(
        db,
        storage,
        settings,
        task_id,
        author_id=user.id if assignee is not None else None,
        submitted_only=assignee is None,
    )
    return TaskResponse(
        **dict(item),
        versions=[version for version in responses if version.submitted_at is not None],
        draft=next((version for version in responses if version.submitted_at is None), None),
        can_upload=assignee is not None and _is_open(row.ShootDeliverable, assignee),
    )


async def list_references(
    db: AsyncSession, user: User, storage: Storage, task_id: uuid.UUID
) -> list[ReferenceResponse]:
    """Все референсы задачи по порядку: «+N» страницы задачи догружает остальные."""
    await task_row(db, user, task_id)
    loaded = list(
        await db.scalars(
            select(Reference)
            .join(ShootDeliverableReference, ShootDeliverableReference.reference_id == Reference.id)
            .where(ShootDeliverableReference.deliverable_id == task_id)
            .order_by(ShootDeliverableReference.position)
        )
    )
    return await references.to_responses(db, user, storage, loaded)


def _is_open(deliverable: ShootDeliverable, assignee: ShootDeliverableAssignee) -> bool:
    """Отправленный бренду deliverable и одобренная работа больше не меняются."""
    return (
        deliverable.status != DeliverableStatus.APPROVED
        and assignee.status != DeliverableStatus.APPROVED
    )


def _require_open(deliverable: ShootDeliverable, assignee: ShootDeliverableAssignee) -> None:
    if not _is_open(deliverable, assignee):
        raise HTTPException(status.HTTP_409_CONFLICT, "The work is approved: no more versions")


async def add_draft_files(
    db: AsyncSession, user: User, task_id: uuid.UUID, body: TaskDraftFiles
) -> None:
    """Файлы в свой черновик следующей версии; черновика нет — он создаётся (V1, V2, …)."""
    row = await task_row(db, user, task_id, lock=True)
    assignee = await _require_assignee(db, user, task_id)
    _require_open(row.ShootDeliverable, assignee)
    await claim_files(db, user, body.file_ids)

    draft = await _draft(db, user, task_id)
    if draft is None:
        last = await db.scalar(
            select(func.max(TaskVersion.number)).where(
                TaskVersion.deliverable_id == task_id, TaskVersion.author_id == user.id
            )
        )
        draft = TaskVersion(deliverable_id=task_id, number=(last or 0) + 1, author_id=user.id)
        db.add(draft)
        if assignee.status == DeliverableStatus.TO_SHOOT:
            assignee.status = DeliverableStatus.IN_PROGRESS
            await sync_status(db, row.ShootDeliverable)
        await db.flush()
    start = await db.scalar(select(func.count()).where(TaskVersionFile.version_id == draft.id))
    db.add_all(
        TaskVersionFile(version_id=draft.id, file_id=file_id, position=(start or 0) + index)
        for index, file_id in enumerate(body.file_ids)
    )
    await db.flush()


async def _own_draft(
    db: AsyncSession, user: User, task_id: uuid.UUID
) -> tuple[TaskVersion, ShootDeliverable, ShootDeliverableAssignee]:
    row = await task_row(db, user, task_id, lock=True)
    assignee = await _require_assignee(db, user, task_id)
    draft = await _draft(db, user, task_id)
    if draft is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "No draft: upload files first")
    return draft, row.ShootDeliverable, assignee


async def save_draft(
    db: AsyncSession, user: User, task_id: uuid.UUID, body: TaskDraftTitle
) -> None:
    """Save draft: название черновика без отправки; файлы в нём и так сохранены."""
    draft, _, _ = await _own_draft(db, user, task_id)
    draft.title = body.title or None
    await db.flush()


async def submit_draft(
    db: AsyncSession, user: User, task_id: uuid.UUID, body: TaskDraftTitle
) -> None:
    """Submit for review: черновик становится версией, работа исполнителя уходит
    на проверку, deliverable — тоже (ADR 0009, 0015)."""
    draft, deliverable, assignee = await _own_draft(db, user, task_id)
    _require_open(deliverable, assignee)
    draft.title = body.title or None
    draft.submitted_at = await db.scalar(select(func.now()))
    assignee.status = DeliverableStatus.NEEDS_REVIEW
    await sync_status(db, deliverable)
    await db.flush()


async def remove_draft_file(
    db: AsyncSession, user: User, task_id: uuid.UUID, file_id: uuid.UUID
) -> str:
    """Убирает файл из черновика; черновик без файлов удаляется. Отправленные версии —
    история того, что видел арт-директор: их не меняют.

    Возвращает ключ файла: из хранилища его удаляет вызывающий после commit.
    """
    row = await task_row(db, user, task_id, lock=True)
    assignee = await _require_assignee(db, user, task_id)
    draft = await _draft(db, user, task_id)
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
        # Ничего не отправлено и черновика нет — работа снова не начата.
        submitted = await db.scalar(
            select(
                exists().where(
                    TaskVersion.deliverable_id == task_id,
                    TaskVersion.author_id == user.id,
                    TaskVersion.submitted_at.is_not(None),
                )
            )
        )
        if not submitted and assignee.status == DeliverableStatus.IN_PROGRESS:
            assignee.status = DeliverableStatus.TO_SHOOT
            await sync_status(db, row.ShootDeliverable)
    await db.flush()
    return key


async def edit_version(
    db: AsyncSession, user: User, task_id: uuid.UUID, version_id: uuid.UUID, body: TaskVersionFiles
) -> list[str]:
    """Правка своей версии, по которой арт-директор попросил изменения: её файлы
    теперь `body.file_ids` (оставленные и новые), и она снова ждёт проверки.
    Те же файлы в том же порядке — 422: без правки решение остаётся.

    Feedback остаётся: арт-директор видит, о чём просил. Возвращает ключи убранных
    файлов: из хранилища их удаляет вызывающий после commit.
    """
    row = await task_row(db, user, task_id, lock=True)
    assignee = await _require_assignee(db, user, task_id)
    _require_open(row.ShootDeliverable, assignee)
    version = await db.scalar(
        select(TaskVersion).where(
            TaskVersion.id == version_id,
            TaskVersion.deliverable_id == task_id,
            TaskVersion.author_id == user.id,
            TaskVersion.submitted_at.is_not(None),
        )
    )
    if version is None:
        raise _not_found("Version")
    if version.review != VersionReview.CHANGES_REQUESTED:
        raise HTTPException(
            status.HTTP_409_CONFLICT, "Only a version with requested changes is edited"
        )

    ordered = list(
        await db.scalars(
            select(TaskVersionFile.file_id)
            .where(TaskVersionFile.version_id == version.id)
            .order_by(TaskVersionFile.position)
        )
    )
    # Без правки версия на проверку не возвращается: решение по ней остаётся.
    if ordered == body.file_ids:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "Nothing changed: remove or add files"
        )
    current = set(ordered)
    added = [file_id for file_id in body.file_ids if file_id not in current]
    if added:
        await claim_files(db, user, added)
    keys = list(
        await db.scalars(
            delete(StoredFile)
            .where(StoredFile.id.in_(current - set(body.file_ids)))
            .returning(StoredFile.key)
        )
    )
    await db.execute(delete(TaskVersionFile).where(TaskVersionFile.version_id == version.id))
    db.add_all(
        TaskVersionFile(version_id=version.id, file_id=file_id, position=index)
        for index, file_id in enumerate(body.file_ids)
    )

    version.review = None
    version.reviewed_at = None
    version.submitted_at = await db.scalar(select(func.now()))
    await db.flush()
    assignee.status = (await work_statuses(db, [task_id]))[(task_id, user.id)]
    await sync_status(db, row.ShootDeliverable)
    await db.flush()
    return keys
