import datetime as dt
import enum
import uuid
from typing import Annotated, Self

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.deliverables.models import DeliverableStatus
from app.files.schemas import FileResponse
from app.team.schemas import TeamMember

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Location = Annotated[str, StringConstraints(strip_whitespace=True, max_length=300)]

MAX_DELIVERABLES = 100


def _unique(ids: list[uuid.UUID]) -> bool:
    return len(set(ids)) == len(ids)


class ShootDeliverableDraft(BaseModel):
    """Deliverable новой съёмки: всё выбирается из того, что есть у съёмки."""

    name: Name
    # Один из продуктов съёмки.
    product_id: uuid.UUID
    # Из команды съёмки: креаторы и мобилограф. Увидят deliverable в My tasks.
    assignee_ids: list[uuid.UUID] = Field(default_factory=list, max_length=50)
    # Из референсов съёмки.
    reference_ids: list[uuid.UUID] = Field(default_factory=list, max_length=100)
    due_date: dt.date | None = None
    status: DeliverableStatus = DeliverableStatus.TO_SHOOT

    @model_validator(mode="after")
    def ids_unique(self) -> Self:
        if not _unique(self.assignee_ids) or not _unique(self.reference_ids):
            raise ValueError("Ids repeat")
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
        for ids in (self.team_ids(), self.product_ids, self.reference_ids):
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
    completed: int


class ShootList(BaseModel):
    items: list[ShootListItem]
    total: int
    counts: ShootCounts
