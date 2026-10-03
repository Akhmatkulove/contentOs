"""Админка: связки бренд ↔ арт-директор ↔ креатор и создание админов. Коммитит вызывающий."""

import uuid
from dataclasses import dataclass, field

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import InstrumentedAttribute

from app.admin.models import AdminAction, AdminActionType, ArtDirectorCreator, BrandArtDirector
from app.auth.models import Role, Status, User, UserSession
from app.auth.service import hash_password


@dataclass
class Directory:
    users: list[User]
    brand_art_directors: list[BrandArtDirector] = field(default_factory=list)
    art_director_creators: list[ArtDirectorCreator] = field(default_factory=list)


async def list_users(db: AsyncSession) -> Directory:
    users = await db.scalars(
        select(User).where(User.is_admin.is_(False)).order_by(User.created_at.desc())
    )
    brands = await db.scalars(select(BrandArtDirector).order_by(BrandArtDirector.assigned_at))
    creators = await db.scalars(select(ArtDirectorCreator).order_by(ArtDirectorCreator.assigned_at))
    return Directory(list(users), list(brands), list(creators))


@dataclass(frozen=True)
class LinkKind:
    """Связка двух ролей: кто с кем (`owner` ↔ `member`), где хранится и как пишется в журнал."""

    model: type[BrandArtDirector] | type[ArtDirectorCreator]
    owner: InstrumentedAttribute[uuid.UUID]
    member: InstrumentedAttribute[uuid.UUID]
    owner_role: Role
    member_role: Role
    assign: AdminActionType
    unassign: AdminActionType


BRAND_ART_DIRECTOR = LinkKind(
    BrandArtDirector,
    BrandArtDirector.brand_id,
    BrandArtDirector.art_director_id,
    Role.BRAND,
    Role.ART_DIRECTOR,
    AdminActionType.ASSIGN_ART_DIRECTOR,
    AdminActionType.UNASSIGN_ART_DIRECTOR,
)
ART_DIRECTOR_CREATOR = LinkKind(
    ArtDirectorCreator,
    ArtDirectorCreator.art_director_id,
    ArtDirectorCreator.creator_id,
    Role.ART_DIRECTOR,
    Role.CREATOR,
    AdminActionType.ASSIGN_CREATOR,
    AdminActionType.UNASSIGN_CREATOR,
)


async def _require_approved(db: AsyncSession, user_id: uuid.UUID, role: Role) -> None:
    # Внешний ключ роль не проверяет: без этого брендом в связке мог бы оказаться креатор.
    user = await db.get(User, user_id)
    if user is None or user.role != role or user.status != Status.APPROVED:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, f"{user_id} is not an approved {role}"
        )


async def assign(
    db: AsyncSession, admin: User, kind: LinkKind, owner_id: uuid.UUID, member_id: uuid.UUID
) -> None:
    await _require_approved(db, owner_id, kind.owner_role)
    await _require_approved(db, member_id, kind.member_role)
    inserted = await db.scalar(
        insert(kind.model)
        .values({kind.owner.key: owner_id, kind.member.key: member_id, "assigned_by": admin.id})
        .on_conflict_do_nothing()
        .returning(kind.owner)
    )
    # Повторное назначение ничего не меняет и в журнал не пишется.
    if inserted is not None:
        _log(db, admin, kind, kind.assign, owner_id, member_id)


async def unassign(
    db: AsyncSession, admin: User, kind: LinkKind, owner_id: uuid.UUID, member_id: uuid.UUID
) -> None:
    deleted = await db.scalar(
        delete(kind.model)
        .where(kind.owner == owner_id, kind.member == member_id)
        .returning(kind.owner)
    )
    if deleted is not None:
        _log(db, admin, kind, kind.unassign, owner_id, member_id)


def _log(
    db: AsyncSession,
    admin: User,
    kind: LinkKind,
    action: AdminActionType,
    owner_id: uuid.UUID,
    member_id: uuid.UUID,
) -> None:
    # Колонки журнала названы как в таблицах связок: brand_id, art_director_id, creator_id.
    db.add(
        AdminAction(
            admin_id=admin.id,
            action=action,
            **{kind.owner.key: owner_id, kind.member.key: member_id},
        )
    )


class NotAnAdminError(Exception):
    """Email занят обычным пользователем: админом его CLI не делает."""


async def create_or_reset_admin(db: AsyncSession, email: str, password: str) -> bool:
    """Создаёт админа или меняет пароль существующему (и выкидывает его сессии).

    Возвращает True, если админ создан. email уже приведён к нижнему регистру.
    """
    password_hash = await hash_password(password)
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        db.add(
            User(
                email=email,
                password_hash=password_hash,
                is_admin=True,
                status=Status.APPROVED,
            )
        )
        return True
    if not user.is_admin:
        raise NotAnAdminError(email)
    user.password_hash = password_hash
    await db.execute(delete(UserSession).where(UserSession.user_id == user.id))
    return False
