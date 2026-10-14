import datetime as dt
import enum
import uuid

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, Time, UniqueConstraint, func
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


class NoteType(enum.StrEnum):
    GENERAL = "general"
    CREATIVE = "creative"
    LOGISTICS = "logistics"
    FEEDBACK = "feedback"
    POST_PRODUCTION = "post_production"


class NoteVisibility(enum.StrEnum):
    # Вся команда съёмки.
    INTERNAL = "internal"
    # Автор, отмеченные в заметке и арт-директор съёмки.
    PRIVATE = "private"


class ShootNote(Base):
    """Заметка во вкладке Notes съёмки (docs/adr/0010)."""

    __tablename__ = "shoot_notes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    shoot_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoots.id", ondelete="CASCADE"), index=True
    )
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(200))
    type: Mapped[NoteType] = mapped_column(string_enum(NoteType, "note_type"))
    visibility: Mapped[NoteVisibility] = mapped_column(
        string_enum(NoteVisibility, "note_visibility")
    )
    # Текст; каждая непустая строка показывается пунктом списка.
    body: Mapped[str] = mapped_column(Text)
    pinned: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.clock_timestamp()
    )


class ShootNoteAssignee(Base):
    """Участник команды, отмеченный в заметке (Assign to)."""

    __tablename__ = "shoot_note_assignees"

    note_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoot_notes.id", ondelete="CASCADE"), primary_key=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    position: Mapped[int]


class TaskVersion(Base):
    """Версия готового контента задачи (docs/adr/0012).

    Пока не отправлена, это черновик: исполнители добавляют и убирают файлы, арт-директор
    его не видит. Черновик у задачи один. Номер растёт с 1 внутри deliverable.
    """

    __tablename__ = "task_versions"
    __table_args__ = (UniqueConstraint("deliverable_id", "number"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    deliverable_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoot_deliverables.id", ondelete="CASCADE"), index=True
    )
    number: Mapped[int]
    # Своё название версии («V1.01»); без него показывается номер.
    title: Mapped[str | None] = mapped_column(String(100))
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.clock_timestamp()
    )
    # Submit for review; до него версия — черновик.
    submitted_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class TaskVersionFile(Base):
    __tablename__ = "task_version_files"

    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("task_versions.id", ondelete="CASCADE"), primary_key=True
    )
    file_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"), primary_key=True, unique=True
    )
    position: Mapped[int]
