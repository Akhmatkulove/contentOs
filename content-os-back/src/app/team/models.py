import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

# Кто с кем работает (docs/adr/0002). Связки задаёт и снимает админка (app.admin),
# остальные фичи по ним решают, кого пользователь может выбрать и что он видит.


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
