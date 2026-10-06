import enum
import uuid
from datetime import datetime

from sqlalchemy import ARRAY, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, string_enum


class ReferenceType(enum.StrEnum):
    IMAGE = "image"
    VIDEO = "video"
    MOODBOARD = "moodboard"


class Reference(Base):
    """Референс из общего пула: файлы (один или подборка) или ссылка на пост."""

    __tablename__ = "references"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Автор: в интерфейсе поле Creator, показывается его имя.
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # Продукт, в котором референс создан. Продукт удалили — референс остаётся в пуле.
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="SET NULL"), index=True
    )
    title: Mapped[str | None] = mapped_column(String(200))
    type: Mapped[ReferenceType | None] = mapped_column(string_enum(ReferenceType, "reference_type"))
    link: Mapped[str | None] = mapped_column(String(2048))
    # Копия коллекции продукта на момент создания; у референса из пула может быть своя.
    collection: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(50)), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ReferenceFile(Base):
    __tablename__ = "reference_files"

    reference_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("references.id", ondelete="CASCADE"), primary_key=True
    )
    position: Mapped[int] = mapped_column(primary_key=True)
    # Файл принадлежит одному месту: unique и здесь, и в product_photos.
    file_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"), unique=True
    )
