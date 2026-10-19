import uuid
from datetime import date
from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.core.text import LongText
from app.deliverables.models import Deliverable, DeliverableStatus, DeliverableType
from app.team.schemas import TeamMember

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class DeliverableDraft(BaseModel):
    """Новый deliverable. Исполнитель — арт-директор из связок бренда (docs/adr/0002)."""

    name: Name
    type: DeliverableType
    assignee_id: uuid.UUID
    due_date: date | None = None
    brief: LongText = None


class DeliverableResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: DeliverableType
    # None: исполнителя сняли (связку убрали или аккаунт удалён).
    assignee: TeamMember | None
    # Из deliverables съёмок, которые его закрывают (docs/adr/0018).
    status: DeliverableStatus
    # Сколько съёмок его закрывают; 0 — ещё не запланирован.
    shoots: int
    due_date: date | None
    brief: str | None

    @classmethod
    def of(
        cls,
        deliverable: Deliverable,
        assignee: TeamMember | None,
        status: DeliverableStatus,
        shoots: int,
    ) -> "DeliverableResponse":
        return cls(
            id=deliverable.id,
            name=deliverable.name,
            type=deliverable.type,
            assignee=assignee,
            status=status,
            shoots=shoots,
            due_date=deliverable.due_date,
            brief=deliverable.brief,
        )
