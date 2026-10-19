import datetime as dt
import enum
import uuid
from typing import Annotated, Self

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.deliverables.models import DeliverableStatus, DeliverableType
from app.files.schemas import FileResponse
from app.references.schemas import ReferenceResponse
from app.shoots.models import NoteType, NoteVisibility, ShootRole, VersionReview
from app.team.schemas import TeamMember

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Location = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)]

MAX_DELIVERABLES = 100


def _unique(ids: list[uuid.UUID]) -> bool:
    return len(set(ids)) == len(ids)


class ShootDeliverableDraft(BaseModel):
    """Deliverable съёмки: всё выбирается из того, что есть у съёмки."""

    # Уже сохранённый deliverable при редактировании; без id — новый.
    id: uuid.UUID | None = None
    name: Name
    type: DeliverableType
    # Один из продуктов съёмки.
    product_id: uuid.UUID
    # Из команды съёмки: креаторы и мобилограф. Увидят deliverable в My tasks.
    assignee_ids: list[uuid.UUID] = Field(default_factory=list, max_length=50)
    # Из референсов съёмки.
    reference_ids: list[uuid.UUID] = Field(default_factory=list, max_length=100)
    due_date: dt.date | None = None
    # Только у нового deliverable; без него — to_shoot. Статус сохранённого ведут
    # исполнители и проверка (docs/adr/0015), форма его не присылает.
    status: DeliverableStatus | None = None

    @model_validator(mode="after")
    def ids_unique(self) -> Self:
        if not _unique(self.assignee_ids) or not _unique(self.reference_ids):
            raise ValueError("Ids repeat")
        return self

    @model_validator(mode="after")
    def status_of_new_only(self) -> Self:
        if self.id is not None and self.status is not None:
            raise ValueError("A saved deliverable's status comes from its work and review")
        # Approved — отправлен бренду: это делает Send to brand после проверки.
        if self.status == DeliverableStatus.APPROVED:
            raise ValueError("Approve and send the deliverable from its review")
        return self


class ShootCreate(BaseModel):
    name: Name
    date: dt.date
    start_time: dt.time
    duration_minutes: int = Field(ge=30, le=720)
    location: Location = ""
    creator_ids: list[uuid.UUID] = Field(default_factory=list, max_length=50)
    mobilographer_id: uuid.UUID | None = None
    product_ids: list[uuid.UUID] = Field(min_length=1, max_length=50)
    # Референсы из пула; новые фронт сохраняет в пул заранее (docs/adr/0007).
    reference_ids: list[uuid.UUID] = Field(default_factory=list, max_length=100)
    deliverables: list[ShootDeliverableDraft] = Field(min_length=1, max_length=MAX_DELIVERABLES)

    def team_ids(self) -> list[uuid.UUID]:
        mobilographer = [self.mobilographer_id] if self.mobilographer_id else []
        return [*self.creator_ids, *mobilographer]

    @model_validator(mode="after")
    def consistent(self) -> Self:
        # У человека одна роль на съёмке.
        deliverable_ids = [d.id for d in self.deliverables if d.id is not None]
        for ids in (self.team_ids(), self.product_ids, self.reference_ids, deliverable_ids):
            if not _unique(ids):
                raise ValueError("Ids repeat")
        team, products, references = (
            set(self.team_ids()),
            set(self.product_ids),
            set(self.reference_ids),
        )
        for deliverable in self.deliverables:
            if deliverable.product_id not in products:
                raise ValueError("A deliverable's product is not in the shoot")
            if not set(deliverable.assignee_ids) <= team:
                raise ValueError("A deliverable's assignee is not in the shoot's team")
            if not set(deliverable.reference_ids) <= references:
                raise ValueError("A deliverable's reference is not in the shoot")
        return self


class ShootStatus(enum.StrEnum):
    """Статус выводится из даты и deliverables, не хранится (docs/adr/0007)."""

    UPCOMING = "upcoming"
    TO_SHOOT = "to_shoot"
    IN_PROGRESS = "in_progress"
    # Хоть один deliverable ждёт проверки арт-директора (docs/adr/0009).
    NEEDS_REVIEW = "needs_review"
    COMPLETED = "completed"


class ShootListItem(BaseModel):
    id: uuid.UUID
    name: str
    date: dt.date
    start_time: dt.time
    duration_minutes: int
    location: str | None
    status: ShootStatus
    # Обложка — первое фото первого продукта съёмки, presigned URL.
    photo: FileResponse | None
    products: int
    deliverables: int
    # Deliverables в статусе approved: прогресс съёмки.
    approved: int
    # Арт-директор первым, затем креаторы и мобилограф.
    team: list[TeamMember]


class ShootCounts(BaseModel):
    """Размеры вкладок под текущими поиском и фильтрами."""

    all: int
    upcoming: int
    to_shoot: int
    in_progress: int
    needs_review: int
    completed: int


class ShootList(BaseModel):
    items: list[ShootListItem]
    total: int
    counts: ShootCounts


class DeliverableCounts(BaseModel):
    """Deliverables съёмки по статусам: прогресс продукта или всей съёмки."""

    total: int
    to_shoot: int
    in_progress: int
    needs_review: int
    needs_changes: int
    approved: int


class ShootProductItem(BaseModel):
    id: uuid.UUID
    name: str
    collection: str | None
    category: str | None
    # Первое фото продукта, presigned URL.
    photo: FileResponse | None
    # Deliverables этой съёмки по продукту.
    deliverables: DeliverableCounts


class ShootDeliverableResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: DeliverableType
    product_id: uuid.UUID
    assignees: list[TeamMember]
    # Из references съёмки, в порядке выбора.
    reference_ids: list[uuid.UUID]
    due_date: dt.date | None
    status: DeliverableStatus


class ShootResponse(BaseModel):
    """Страница съёмки и форма её редактирования (docs/adr/0008)."""

    id: uuid.UUID
    name: str
    date: dt.date
    start_time: dt.time
    duration_minutes: int
    location: str | None
    status: ShootStatus
    art_director: TeamMember
    creators: list[TeamMember]
    mobilographer: TeamMember | None
    products: list[ShootProductItem]
    references: list[ReferenceResponse]
    deliverables: list[ShootDeliverableResponse]
    # Пользователь — автор съёмки: ему доступно редактирование.
    can_edit: bool


NoteTitle = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
NoteBody = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]


class ShootNoteCreate(BaseModel):
    """Новая заметка или форма её редактирования целиком (docs/adr/0010)."""

    title: NoteTitle
    type: NoteType = NoteType.GENERAL
    visibility: NoteVisibility = NoteVisibility.INTERNAL
    body: NoteBody
    pinned: bool = False
    # Из команды съёмки: арт-директор, креаторы, мобилограф.
    assignee_ids: list[uuid.UUID] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def ids_unique(self) -> Self:
        if not _unique(self.assignee_ids):
            raise ValueError("Ids repeat")
        return self


class ShootNotePatch(BaseModel):
    """Закрепить или открепить из меню «…» заметки."""

    pinned: bool


class ShootNoteResponse(BaseModel):
    id: uuid.UUID
    title: str
    type: NoteType
    visibility: NoteVisibility
    body: str
    pinned: bool
    author: TeamMember
    assignees: list[TeamMember]
    created_at: dt.datetime
    # Edit, Pin и Delete: автору заметки и арт-директору съёмки.
    can_manage: bool


class TaskShoot(BaseModel):
    id: uuid.UUID
    name: str
    date: dt.date


class TaskProduct(BaseModel):
    id: uuid.UUID
    name: str
    sku: str | None
    # Первое фото продукта, presigned URL.
    photo: FileResponse | None


class TaskItem(BaseModel):
    """Строка My tasks: deliverable съёмки с её продуктом и референсами (docs/adr/0011)."""

    id: uuid.UUID
    name: str
    status: DeliverableStatus
    due_date: dt.date | None
    shoot: TaskShoot
    product: TaskProduct
    assignees: list[TeamMember]
    # Первые три референса deliverable по порядку; всего — references_total.
    references: list[ReferenceResponse]
    references_total: int


class TaskCounts(BaseModel):
    """Размеры вкладок по статусам под текущими поиском и фильтрами."""

    all: int
    to_shoot: int
    in_progress: int
    needs_review: int
    needs_changes: int
    approved: int


class TaskList(BaseModel):
    items: list[TaskItem]
    total: int
    counts: TaskCounts


class TaskFilterOption(BaseModel):
    id: uuid.UUID
    name: str


class TaskFilters(BaseModel):
    """Варианты фильтров My tasks: только то, что встречается в задачах пользователя."""

    shoots: list[TaskFilterOption]
    products: list[TaskFilterOption]
    assignees: list[TeamMember]


VersionTitle = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]


class TaskDraftFiles(BaseModel):
    """Файлы из POST /api/uploads в черновик версии (docs/adr/0012)."""

    file_ids: list[uuid.UUID] = Field(min_length=1, max_length=50)

    @model_validator(mode="after")
    def ids_unique(self) -> Self:
        if not _unique(self.file_ids):
            raise ValueError("Ids repeat")
        return self


class TaskDraftTitle(BaseModel):
    """Название черновика: Save draft сохраняет его, Submit for review — тоже."""

    # Пусто — версия показывается номером («V2»).
    title: VersionTitle = ""


class TaskFile(FileResponse):
    # Имя файла у пользователя; у старых загрузок его нет.
    name: str | None
    size: int


class TaskVersionResponse(BaseModel):
    id: uuid.UUID
    # Свой у каждого исполнителя: V1, V2, … (docs/adr/0015).
    number: int
    title: str | None
    author: TeamMember
    created_at: dt.datetime
    # None — черновик.
    submitted_at: dt.datetime | None
    # Решение арт-директора; None — ещё не проверена (или черновик).
    review: VersionReview | None
    reviewed_at: dt.datetime | None
    feedback: str | None
    files: list[TaskFile]


class TaskResponse(TaskItem):
    """Страница задачи: строка My tasks и версии готового контента (docs/adr/0012)."""

    # Отправленные на проверку, новые первыми.
    versions: list[TaskVersionResponse]
    # Неотправленная версия; видят только исполнители.
    draft: TaskVersionResponse | None
    # Загружает исполнитель задачи, пока его работа не одобрена и deliverable не
    # отправлен бренду; арт-директор только смотрит.
    can_upload: bool


FEEDBACK_MAX = 1000

Feedback = Annotated[str, StringConstraints(strip_whitespace=True, max_length=FEEDBACK_MAX)]


class VersionReviewCreate(BaseModel):
    """Approve или Request changes по последней версии исполнителя (docs/adr/0015)."""

    decision: VersionReview
    # Feedback for creator; для Request changes обязателен.
    feedback: Feedback = ""

    @model_validator(mode="after")
    def feedback_for_changes(self) -> Self:
        if self.decision == VersionReview.CHANGES_REQUESTED and not self.feedback:
            raise ValueError("Tell the creator what to change")
        return self


class ReviewCreator(BaseModel):
    """Исполнитель (креатор или мобилограф) на странице проверки: статус и версии."""

    member: TeamMember
    # Роль на съёмке; None — человека уже убрали из команды съёмки.
    role: ShootRole | None
    status: DeliverableStatus
    # Отправленные, новые первыми.
    versions: list[TaskVersionResponse]


class DeliverableReviewResponse(TaskItem):
    """Страница проверки deliverable арт-директором (docs/adr/0015)."""

    # Исполнители в порядке назначения.
    creators: list[ReviewCreator]
    # Send to brand: все исполнители одобрены, deliverable ещё не отправлен.
    can_send: bool
