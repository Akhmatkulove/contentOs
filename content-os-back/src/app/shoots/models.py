import datetime as dt
import enum
import uuid

from sqlalchemy import Date, DateTime, ForeignKey, String, Time, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, string_enum
from app.deliverables.models import DeliverableStatus


class Shoot(Base):
    """Съёмка арт-директора: команда, продукты, референсы и deliverables (docs/adr/0007)."""

    __tablename__ = "shoots"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Тот, кто создал съёмку.
    art_director_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    date: Mapped[dt.date] = mapped_column(Date)
    start_time: Mapped[dt.time] = mapped_column(Time)
    duration_minutes: Mapped[int]
    # Адрес из подсказок Яндекса, текстом.
    location: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.clock_timestamp()
    )


class ShootRole(enum.StrEnum):
    CREATOR = "creator"
    MOBILOGRAPHER = "mobilographer"


class ShootMember(Base):
    """Креатор или мобилограф съёмки: видит её в списке."""

    __tablename__ = "shoot_members"

    shoot_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoots.id", ondelete="CASCADE"), primary_key=True
    )
    # Индекс для обратного поиска: съёмки пользователя.
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    role: Mapped[ShootRole] = mapped_column(string_enum(ShootRole, "shoot_role"))
    position: Mapped[int]


class ShootProduct(Base):
    __tablename__ = "shoot_products"

    shoot_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoots.id", ondelete="CASCADE"), primary_key=True
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    position: Mapped[int]


class ShootReference(Base):
    __tablename__ = "shoot_references"

    shoot_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoots.id", ondelete="CASCADE"), primary_key=True
    )
    reference_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("references.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    position: Mapped[int]


class ShootDeliverable(Base):
    """Что снять на съёмке: продукт, исполнители из команды, референсы съёмки.

    Отдельно от deliverables продукта (те назначают арт-директора, docs/adr/0004).
    Исполнители увидят свои deliverables в My tasks.
    """

    __tablename__ = "shoot_deliverables"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    shoot_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoots.id", ondelete="CASCADE"), index=True
    )
    position: Mapped[int]
    product_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    status: Mapped[DeliverableStatus] = mapped_column(
        string_enum(DeliverableStatus, "shoot_deliverable_status"),
        default=DeliverableStatus.TO_SHOOT,
    )
    due_date: Mapped[dt.date | None] = mapped_column(Date)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ShootDeliverableAssignee(Base):
    """Исполнитель deliverable съёмки: из него строится страница My tasks."""

    __tablename__ = "shoot_deliverable_assignees"

    deliverable_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoot_deliverables.id", ondelete="CASCADE"), primary_key=True
    )
    # Индекс для обратного поиска: задачи пользователя.
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    position: Mapped[int]


class ShootDeliverableReference(Base):
    __tablename__ = "shoot_deliverable_references"

    deliverable_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoot_deliverables.id", ondelete="CASCADE"), primary_key=True
    )
    reference_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("references.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    position: Mapped[int]
