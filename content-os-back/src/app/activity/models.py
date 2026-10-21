import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, string_enum


class ActivityType(enum.StrEnum):
    # Арт-директор создал съёмку.
    SHOOT_CREATED = "shoot_created"
    # Исполнитель отправил версию на проверку (docs/adr/0012).
    VERSION_SUBMITTED = "version_submitted"
    # Арт-директор одобрил версию исполнителя (docs/adr/0015).
    VERSION_APPROVED = "version_approved"
    # Арт-директор вернул версию на доработку.
    CHANGES_REQUESTED = "changes_requested"
    # Арт-директор отправил deliverable бренду (docs/adr/0025).
    CONTENT_SENT = "content_sent"
    # Комментарий бренда или арт-директора на странице контента (docs/adr/0026).
    CONTENT_COMMENTED = "content_commented"
    # Бренд одобрил отправленный контент (docs/adr/0026).
    CONTENT_APPROVED = "content_approved"
    # Отправлен последний deliverable: съёмка завершена (docs/adr/0007).
    SHOOT_COMPLETED = "shoot_completed"


# Типы, которые видит и бренд продукта: то, что дошло до него. Остальное — работа
# команды внутри съёмки.
BRAND_TYPES = frozenset(
    {ActivityType.CONTENT_SENT, ActivityType.CONTENT_COMMENTED, ActivityType.CONTENT_APPROVED}
)


class ActivityEvent(Base):
    """Событие ленты Activity (docs/adr/0027).

    Каждое событие принадлежит съёмке: его видят её арт-директор и команда, а
    события из BRAND_TYPES — ещё и бренд продукта. Колонки типизированные, без jsonb:
    удаление съёмки, deliverable или комментария убирает их события через ForeignKey.
    """

    __tablename__ = "activity_events"
    __table_args__ = (
        # Лента пользователя: события его съёмок, новые первыми.
        Index("ix_activity_events_shoot_id_created_at", "shoot_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    type: Mapped[ActivityType] = mapped_column(string_enum(ActivityType, "activity_type"))
    # Кто сделал; NULL — аккаунт удалён.
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    # Чью работу проверили (version_approved, changes_requested).
    subject_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    shoot_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("shoots.id", ondelete="CASCADE"))
    # Продукт deliverable: по нему событие видит бренд.
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    deliverable_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("shoot_deliverables.id", ondelete="CASCADE"), index=True
    )
    # Комментарий content_commented: удалили комментарий — пропало и событие.
    comment_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("content_comments.id", ondelete="CASCADE"), index=True
    )
    # Сколько файлов в версии, отправлено или одобрено; у остальных 1.
    count: Mapped[int] = mapped_column(default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.clock_timestamp()
    )
