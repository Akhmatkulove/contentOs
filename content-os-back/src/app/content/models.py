import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, string_enum


class ContentStatus(enum.StrEnum):
    # Арт-директор отправил бренду, бренд ещё не решил.
    NEW = "new"
    # Бренд одобрил.
    APPROVED = "approved"


class ContentItem(Base):
    """Файл на странице Content (docs/adr/0025).

    Появляется, когда арт-директор отправляет deliverable бренду: каждый файл
    одобренной версии каждого исполнителя.
    """

    __tablename__ = "content_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    file_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"), unique=True
    )
    deliverable_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoot_deliverables.id", ondelete="CASCADE"), index=True
    )
    # Название deliverable на момент отправки: форма съёмки может его поменять,
    # а отправленное бренду остаётся как было.
    name: Mapped[str] = mapped_column(String(200))
    # Исполнитель, чья версия одобрена.
    author_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    # Порядок файлов одной отправки: по исполнителям, затем как в версии.
    position: Mapped[int]
    status: Mapped[ContentStatus] = mapped_column(
        string_enum(ContentStatus, "content_status"), default=ContentStatus.NEW
    )
    # Когда отправлен бренду.
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Когда бренд одобрил (docs/adr/0026); одобряется весь deliverable разом.
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ContentComment(Base):
    """Комментарий на странице контента (docs/adr/0026): к отправленному deliverable.

    Пишут бренд продукта и арт-директор съёмки, читают все, кто видит контент.
    """

    __tablename__ = "content_comments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    deliverable_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoot_deliverables.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.clock_timestamp()
    )


class ContentFavorite(Base):
    """Отправленный deliverable в избранном бренда (docs/adr/0026)."""

    __tablename__ = "content_favorites"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    # Индекс для обратного поиска: у кого deliverable в избранном.
    deliverable_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoot_deliverables.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
