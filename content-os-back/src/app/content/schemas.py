import datetime as dt
import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, StringConstraints

from app.auth.models import Role
from app.content.models import ContentStatus
from app.deliverables.models import DeliverableType
from app.files.schemas import FileResponse
from app.references.schemas import ReferenceResponse
from app.shoots.models import ShootRole, VersionReview
from app.team.schemas import TeamMember


class ContentOption(BaseModel):
    id: uuid.UUID
    name: str


class ContentItemResponse(BaseModel):
    id: uuid.UUID
    # Отправленный deliverable съёмки: по нему открывается страница контента.
    deliverable_id: uuid.UUID
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
    # Избранное бренда (docs/adr/0026); у остальных 0.
    favorites: int


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


class ContentProduct(BaseModel):
    id: uuid.UUID
    name: str
    # Первое фото продукта.
    photo: FileResponse | None


class ContentShoot(BaseModel):
    id: uuid.UUID
    name: str
    date: dt.date
    location: str | None


class ContentPerson(BaseModel):
    """Исполнитель, чьи файлы на странице, и его роль в съёмке."""

    member: TeamMember
    # None — его уже нет в команде съёмки.
    role: ShootRole | None


class ContentMaterial(BaseModel):
    # Строка content_items: её id открывает страницу с этого файла.
    id: uuid.UUID
    file: FileResponse
    author_id: uuid.UUID


class ContentVersion(BaseModel):
    """Отправленная версия исполнителя: только арт-директору съёмки."""

    id: uuid.UUID
    number: int
    title: str | None
    author: TeamMember
    submitted_at: dt.datetime
    review: VersionReview | None
    # Суммарный размер файлов версии, байты.
    size: int


class ContentCommentResponse(BaseModel):
    id: uuid.UUID
    author: TeamMember
    # Бренд или арт-директор: подпись под именем.
    role: Role
    body: str
    created_at: dt.datetime


class ContentCommentCreate(BaseModel):
    body: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]


class ContentDetails(BaseModel):
    """Страница контента (docs/adr/0026): отправленный бренду deliverable целиком."""

    # Deliverable съёмки.
    id: uuid.UUID
    name: str
    type: DeliverableType
    # approved — бренд одобрил; одобряется весь deliverable разом.
    status: ContentStatus
    sent_at: dt.datetime
    approved_at: dt.datetime | None
    product: ContentProduct
    # Только арт-директору съёмки и креаторам его команды; бренду — None.
    shoot: ContentShoot | None
    people: list[ContentPerson]
    # Файлы по порядку отправки: по исполнителям, затем как в версии.
    materials: list[ContentMaterial]
    # Референсы deliverable съёмки, затем продукта; видят все, бренд тоже.
    references: list[ReferenceResponse]
    # Только арт-директору съёмки, иначе None. Новые первыми.
    versions: list[ContentVersion] | None
    # Новые первыми.
    comments: list[ContentCommentResponse]
    # Избранное бренда; у остальных всегда false.
    favorite: bool
    can_favorite: bool
    # Пишут бренд продукта и арт-директор съёмки.
    can_comment: bool
    # Бренд, пока контент не одобрен.
    can_approve: bool
    # Соседние отправленные deliverables в порядке страницы Content (новые первыми).
    previous_id: uuid.UUID | None
    next_id: uuid.UUID | None
