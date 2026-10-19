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
    status: DeliverableStatus = DeliverableStatus.TO_SHOOT
    due_date: date | None = None
    brief: LongText = None


class DeliverableResponse(BaseModel):
    id: uuid.UUID
    name: str
    type: DeliverableType
    # None: исполнителя сняли (связку убрали или аккаунт удалён).
    assignee: TeamMember | None
    status: DeliverableStatus
    due_date: date | None
    brief: str | None

    @classmethod
    def of(cls, deliverable: Deliverable, assignee: TeamMember | None) -> "DeliverableResponse":
        return cls(
            id=deliverable.id,
            name=deliverable.name,
            type=deliverable.type,
            assignee=assignee,
            status=deliverable.status,
            due_date=deliverable.due_date,
            brief=deliverable.brief,
        )
