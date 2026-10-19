import datetime as dt
import enum
import uuid

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, Time, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, string_enum
from app.deliverables.models import DeliverableStatus, DeliverableType


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
    # Responsibilities на карточке Team; каждая непустая строка — пункт списка.
    responsibilities: Mapped[str | None] = mapped_column(Text)


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

    Отдельно от deliverables продукта (те назначают арт-директора, docs/adr/0004),
    но закрывает один из них (docs/adr/0017). Исполнители видят свои deliverables
    в My tasks.
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
    # Deliverable продукта (заказ бренда), который закрывает этот deliverable.
    # NULL: бренд убрал заказ из продукта (docs/adr/0017).
    product_deliverable_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("deliverables.id", ondelete="SET NULL"), index=True
    )
    name: Mapped[str] = mapped_column(String(200))
    type: Mapped[DeliverableType] = mapped_column(
        string_enum(DeliverableType, "shoot_deliverable_type")
    )
    status: Mapped[DeliverableStatus] = mapped_column(
        string_enum(DeliverableStatus, "shoot_deliverable_status"),
        default=DeliverableStatus.TO_SHOOT,
    )
    due_date: Mapped[dt.date | None] = mapped_column(Date)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ShootDeliverableAssignee(Base):
    """Исполнитель deliverable съёмки: из него строится страница My tasks.

    У каждого исполнителя своя работа над deliverable: свои версии и свой статус
    проверки (docs/adr/0015). Статус deliverable собирается из статусов исполнителей.
    """

    __tablename__ = "shoot_deliverable_assignees"

    deliverable_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoot_deliverables.id", ondelete="CASCADE"), primary_key=True
    )
    # Индекс для обратного поиска: задачи пользователя.
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    position: Mapped[int]
    # to_shoot → in_progress (черновик) → needs_review (отправил) → needs_changes | approved.
    status: Mapped[DeliverableStatus] = mapped_column(
        string_enum(DeliverableStatus, "shoot_deliverable_assignee_status"),
        default=DeliverableStatus.TO_SHOOT,
    )


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


class VersionReview(enum.StrEnum):
    APPROVED = "approved"
    CHANGES_REQUESTED = "changes_requested"


class TaskVersion(Base):
    """Версия готового контента исполнителя задачи (docs/adr/0012, 0015).

    Пока не отправлена, это черновик: автор добавляет и убирает файлы, арт-директор
    его не видит. У каждого исполнителя свой черновик и своя нумерация с 1.
    """

    __tablename__ = "task_versions"
    __table_args__ = (UniqueConstraint("deliverable_id", "author_id", "number"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Индекс не нужен: deliverable_id — начало уникального ключа.
    deliverable_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("shoot_deliverables.id", ondelete="CASCADE")
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
    # Решение арт-директора по отправленной версии; None — ещё не проверена.
    review: Mapped[VersionReview | None] = mapped_column(
        string_enum(VersionReview, "version_review")
    )
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    # Feedback for creator: что поправить (или комментарий к одобрению).
    feedback: Mapped[str | None] = mapped_column(Text)


class TaskVersionFile(Base):
    __tablename__ = "task_version_files"

    version_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("task_versions.id", ondelete="CASCADE"), primary_key=True
    )
    file_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("files.id", ondelete="CASCADE"), primary_key=True, unique=True
    )
    position: Mapped[int]
