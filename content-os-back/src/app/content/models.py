import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
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
