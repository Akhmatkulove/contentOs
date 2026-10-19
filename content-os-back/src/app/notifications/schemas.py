import uuid
from datetime import datetime

from pydantic import BaseModel

from app.files.schemas import FileResponse
from app.notifications.models import NotificationType
from app.team.schemas import TeamMember


class NotificationProduct(BaseModel):
    id: uuid.UUID
    name: str
    # Первое фото продукта, presigned URL.
    photo: FileResponse | None


class NotificationResponse(BaseModel):
    id: uuid.UUID
    type: NotificationType
    # Последнее изменение: новые назначения в тот же продукт поднимают уведомление.
    created_at: datetime
    read: bool
    # Кто сделал; None — аккаунт удалён.
    actor: TeamMember | None
    product: NotificationProduct | None
    count: int


class NotificationList(BaseModel):
    """Последние уведомления, новые первыми, и число непрочитанных всего."""

    items: list[NotificationResponse]
    unread: int
