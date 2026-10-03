import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, string_enum


class BrandArtDirector(Base):
    """Арт-директор работает с брендом. Связки задаёт только админ."""

    __tablename__ = "brand_art_directors"

    brand_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    # Индекс для обратного поиска: бренды арт-директора.
    art_director_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    # Кто из админов назначил. SET NULL: связка переживает удаление админа.
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ArtDirectorCreator(Base):
    """Креатор в команде арт-директора: из них арт-директор собирает съёмки.

    Связки задаёт только админ.
    """

    __tablename__ = "art_director_creators"

    art_director_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    # Индекс для обратного поиска: арт-директора креатора.
    creator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    assigned_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class AdminActionType(enum.StrEnum):
    ASSIGN_ART_DIRECTOR = "assign_art_director"
    UNASSIGN_ART_DIRECTOR = "unassign_art_director"
    ASSIGN_CREATOR = "assign_creator"
    UNASSIGN_CREATOR = "unassign_creator"


class AdminAction(Base):
    """Журнал действий админов, записи только добавляются.

    Без внешних ключей на пользователей: история переживает удаление аккаунтов.
    """

    __tablename__ = "admin_actions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    admin_id: Mapped[uuid.UUID]
    action: Mapped[AdminActionType] = mapped_column(
        string_enum(AdminActionType, "admin_action_type")
    )
    # Заполнены те, кого касается действие: бренд и арт-директор или арт-директор и креатор.
    brand_id: Mapped[uuid.UUID | None]
    art_director_id: Mapped[uuid.UUID | None]
    creator_id: Mapped[uuid.UUID | None]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
