"""Заметки съёмки (docs/adr/0010). Коммитит вызывающий."""

import uuid
from collections import defaultdict

from fastapi import HTTPException, status
from sqlalchemy import ColumnElement, delete, or_, select, true
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import User
from app.core.config import Settings
from app.shoots.models import (
    NoteVisibility,
    Shoot,
    ShootMember,
    ShootNote,
    ShootNoteAssignee,
)
from app.shoots.schemas import ShootNoteCreate, ShootNoteResponse
from app.shoots.service import _visible
from app.team.schemas import TeamMember


def _not_found(what: str = "Shoot") -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{what} not found")


async def _shoot(db: AsyncSession, user: User, shoot_id: uuid.UUID) -> Shoot:
    """Съёмка, которую видит пользователь (автор или команда); иначе 404."""
    shoot = await db.scalar(select(Shoot).where(Shoot.id == shoot_id, _visible(user)))
    if shoot is None:
        raise _not_found()
    return shoot


async def _team(db: AsyncSession, shoot: Shoot) -> set[uuid.UUID]:
    members = await db.scalars(select(ShootMember.user_id).where(ShootMember.shoot_id == shoot.id))
    return {shoot.art_director_id, *members}


def _readable(user: User, shoot: Shoot) -> ColumnElement[bool]:
    """Internal — вся команда; private — автор, отмеченные и арт-директор съёмки."""
    if shoot.art_director_id == user.id:
        return true()
    assigned = select(ShootNoteAssignee.note_id).where(ShootNoteAssignee.user_id == user.id)
    return or_(
        ShootNote.visibility == NoteVisibility.INTERNAL,
        ShootNote.author_id == user.id,
        ShootNote.id.in_(assigned),
    )


def _can_manage(user: User, shoot: Shoot, note: ShootNote) -> bool:
    return note.author_id == user.id or shoot.art_director_id == user.id


async def _responses(
    db: AsyncSession, user: User, shoot: Shoot, notes: list[ShootNote], settings: Settings
) -> list[ShootNoteResponse]:
    ids = [note.id for note in notes]
    assignees: dict[uuid.UUID, list[uuid.UUID]] = defaultdict(list)
    for row in await db.execute(
        select(ShootNoteAssignee.note_id, ShootNoteAssignee.user_id)
        .where(ShootNoteAssignee.note_id.in_(ids))
        .order_by(ShootNoteAssignee.position)
    ):
        assignees[row.note_id].append(row.user_id)
    wanted = {note.author_id for note in notes} | {u for ids_ in assignees.values() for u in ids_}
    people = {
        person.id: TeamMember.of(person, settings)
        for person in await db.scalars(select(User).where(User.id.in_(wanted)))
    }
    return [
        ShootNoteResponse(
            id=note.id,
            title=note.title,
            type=note.type,
            visibility=note.visibility,
            body=note.body,
            pinned=note.pinned,
            author=people[note.author_id],
            assignees=[people[u] for u in assignees[note.id] if u in people],
            created_at=note.created_at,
            can_manage=_can_manage(user, shoot, note),
        )
        for note in notes
    ]


async def list_notes(
    db: AsyncSession, user: User, settings: Settings, shoot_id: uuid.UUID
) -> list[ShootNoteResponse]:
    """Заметки, которые пользователь может читать: закреплённые первыми, затем новые."""
    shoot = await _shoot(db, user, shoot_id)
    notes = list(
        await db.scalars(
            select(ShootNote)
            .where(ShootNote.shoot_id == shoot.id, _readable(user, shoot))
            .order_by(ShootNote.pinned.desc(), ShootNote.created_at.desc(), ShootNote.id)
        )
    )
    return await _responses(db, user, shoot, notes, settings)


async def _write_assignees(
    db: AsyncSession, shoot: Shoot, note: ShootNote, ids: list[uuid.UUID]
) -> None:
    if not set(ids) <= await _team(db, shoot):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "An assignee is not on the shoot's team"
        )
    await db.execute(delete(ShootNoteAssignee).where(ShootNoteAssignee.note_id == note.id))
    db.add_all(
        ShootNoteAssignee(note_id=note.id, user_id=user_id, position=index)
        for index, user_id in enumerate(ids)
    )


async def create_note(
    db: AsyncSession, user: User, settings: Settings, shoot_id: uuid.UUID, body: ShootNoteCreate
) -> ShootNoteResponse:
    """Пишет заметку любой участник съёмки."""
    shoot = await _shoot(db, user, shoot_id)
    note = ShootNote(
        shoot_id=shoot.id,
        author_id=user.id,
        **body.model_dump(exclude={"assignee_ids"}),
    )
    db.add(note)
    await db.flush()
    await _write_assignees(db, shoot, note, body.assignee_ids)
    await db.flush()
    return (await _responses(db, user, shoot, [note], settings))[0]


async def _managed_note(
    db: AsyncSession, user: User, shoot_id: uuid.UUID, note_id: uuid.UUID
) -> tuple[Shoot, ShootNote]:
    """Заметка, которую пользователь может менять; иначе 404, как несуществующая."""
    shoot = await _shoot(db, user, shoot_id)
    note = await db.scalar(
        select(ShootNote).where(ShootNote.id == note_id, ShootNote.shoot_id == shoot.id)
    )
    if note is None or not _can_manage(user, shoot, note):
        raise _not_found("Note")
    return shoot, note


async def update_note(
    db: AsyncSession,
    user: User,
    settings: Settings,
    shoot_id: uuid.UUID,
    note_id: uuid.UUID,
    body: ShootNoteCreate,
) -> ShootNoteResponse:
    shoot, note = await _managed_note(db, user, shoot_id, note_id)
    for field, value in body.model_dump(exclude={"assignee_ids"}).items():
        setattr(note, field, value)
    await _write_assignees(db, shoot, note, body.assignee_ids)
    await db.flush()
    return (await _responses(db, user, shoot, [note], settings))[0]


async def pin_note(
    db: AsyncSession,
    user: User,
    settings: Settings,
    shoot_id: uuid.UUID,
    note_id: uuid.UUID,
    pinned: bool,
) -> ShootNoteResponse:
    shoot, note = await _managed_note(db, user, shoot_id, note_id)
    note.pinned = pinned
    await db.flush()
    return (await _responses(db, user, shoot, [note], settings))[0]


async def delete_note(
    db: AsyncSession, user: User, shoot_id: uuid.UUID, note_id: uuid.UUID
) -> None:
    _, note = await _managed_note(db, user, shoot_id, note_id)
    await db.delete(note)
