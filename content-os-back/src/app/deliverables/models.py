import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, string_enum


class DeliverableStatus(enum.StrEnum):
    TO_SHOOT = "to_shoot"
    IN_PROGRESS = "in_progress"
    # Контент загружен и ждёт проверки арт-директора (docs/adr/0009).
    NEEDS_REVIEW = "needs_review"
    NEEDS_CHANGES = "needs_changes"
    APPROVED = "approved"


class Deliverable(Base):
    """Единица контента, которую нужно снять для продукта.

    Назначенный арт-директор видит продукт (docs/adr/0004).
    """

    __tablename__ = "deliverables"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int]
    # NULL: исполнителя сняли (связку с брендом убрали или аккаунт удалён).
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    brief: Mapped[str | None] = mapped_column(Text)
    status: Mapped[DeliverableStatus] = mapped_column(
        string_enum(DeliverableStatus, "deliverable_status"), default=DeliverableStatus.TO_SHOOT
    )
    due_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
