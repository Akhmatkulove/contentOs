import uuid
from datetime import datetime

from pydantic import BaseModel

from app.activity.models import ActivityType
from app.team.schemas import TeamMember


class ActivityRef(BaseModel):
    id: uuid.UUID
    # Текущее название: переименованная съёмка показывается по-новому.
    name: str


class ActivityItem(BaseModel):
    id: uuid.UUID
    type: ActivityType
    created_at: datetime
    # Кто сделал; None — аккаунт удалён.
    actor: TeamMember | None
    # Чью версию проверили (version_approved, changes_requested).
    subject: TeamMember | None
    # Бренду — None: съёмку он не видит (docs/adr/0025).
    shoot: ActivityRef | None
    product: ActivityRef | None
    # Deliverable съёмки, если событие о нём.
    deliverable: ActivityRef | None
    # Начало комментария (content_commented).
    comment: str | None
    # Файлов в версии, отправлено или одобрено; у остальных 1.
    count: int


class ActivityList(BaseModel):
    """Страница ленты, новые первыми."""

    items: list[ActivityItem]
    # Курсор следующей страницы; None — это последняя.
    next_cursor: str | None
