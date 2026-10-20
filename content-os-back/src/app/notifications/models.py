import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, string_enum


class NotificationType(enum.StrEnum):
    # Бренд назначил пользователю deliverables продукта (docs/adr/0020).
    DELIVERABLES_ASSIGNED = "deliverables_assigned"
    # Арт-директор отправил бренду готовый deliverable (docs/adr/0025).
    CONTENT_SENT = "content_sent"
    # Комментарий на странице контента (docs/adr/0026); непрочитанные склеиваются.
    CONTENT_COMMENTED = "content_commented"
    # Бренд одобрил отправленный контент (docs/adr/0026).
    CONTENT_APPROVED = "content_approved"


class Notification(Base):
    """Уведомление пользователя в колокольчике (docs/adr/0020).

    Пока не прочитано, новые назначения в тот же продукт добавляются к нему:
    одно уведомление на продукт, а не на каждый deliverable. Об отправке бренду —
    по уведомлению на каждый отправленный deliverable.
    """

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    type: Mapped[NotificationType] = mapped_column(
        string_enum(NotificationType, "notification_type")
    )
    # Кто сделал: бренд. NULL — аккаунт удалён.
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    # Отправленный deliverable съёмки (content_sent, content_commented, content_approved).
    deliverable_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("shoot_deliverables.id", ondelete="CASCADE"), index=True
    )
    # Сколько deliverables назначено, файлов отправлено или комментариев оставлено.
    count: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.clock_timestamp()
    )
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
