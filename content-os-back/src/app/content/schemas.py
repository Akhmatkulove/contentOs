import uuid
from datetime import datetime

from pydantic import BaseModel

from app.content.models import ContentStatus
from app.files.schemas import FileResponse
from app.team.schemas import TeamMember


class ContentOption(BaseModel):
    id: uuid.UUID
    name: str


class ContentItemResponse(BaseModel):
    id: uuid.UUID
    file: FileResponse
    # Название deliverable съёмки.
    name: str
    product: ContentOption
    # Только арт-директору съёмки и креаторам его команды; бренду — None.
    shoot: ContentOption | None
    author: TeamMember
    status: ContentStatus
    created_at: datetime


class ContentCounts(BaseModel):
    """Сколько файлов на каждой вкладке под текущими поиском и фильтрами."""

    all: int
    # Креатору — снятое им, арт-директору — из его съёмок, бренду — то же, что all.
    mine: int


class ContentList(BaseModel):
    items: list[ContentItemResponse]
    # Сколько всего подходит на выбранной вкладке: для пагинации.
    total: int
    counts: ContentCounts


class ContentFilters(BaseModel):
    """Варианты фильтров: только то, что встречается в видимом контенте."""

    products: list[ContentOption]
    # Бренду съёмки не показываются: пустой список.
    shoots: list[ContentOption]
    creators: list[TeamMember]
