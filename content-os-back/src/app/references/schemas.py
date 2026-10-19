import uuid
from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, Field, HttpUrl, UrlConstraints, model_validator

from app.core.storage import Storage
from app.core.text import LongText, ShortText, Tags, Title
from app.files.models import StoredFile
from app.files.schemas import FileResponse
from app.references.models import Reference, ReferenceType
from app.team.schemas import TeamMember

Link = Annotated[HttpUrl, UrlConstraints(max_length=2048)]


class ReferenceDraft(BaseModel):
    """Новый референс: файлы (уже загруженные, POST /api/uploads) или ссылка."""

    title: Title = None
    type: ReferenceType | None = None
    link: Link | None = None
    file_ids: list[uuid.UUID] = Field(default_factory=list, max_length=20)
    tags: Tags = Field(default_factory=list)
    notes: LongText = None

    @model_validator(mode="after")
    def files_or_link(self) -> Self:
        if bool(self.file_ids) == (self.link is not None):
            raise ValueError("A reference has either files or a link")
        if len(set(self.file_ids)) != len(self.file_ids):
            raise ValueError("Files repeat")
        return self


class ReferenceCreate(ReferenceDraft):
    """Свой референс из пула: автор — тот, кто создаёт (docs/adr/0004)."""

    # Продукт из тех, что видит автор; без продукта референс виден только автору.
    product_id: uuid.UUID | None = None
    collection: ShortText = None
    # Сразу добавить в избранное автора.
    favorite: bool = False


class ReferenceResponse(BaseModel):
    id: uuid.UUID
    title: str | None
    type: ReferenceType | None
    link: str | None
    collection: str | None
    notes: str | None
    tags: list[str]
    product_id: uuid.UUID | None
    # Автор (поле Creator): бренд, если референс создан в продукте.
    author_id: uuid.UUID
    author: str | None
    files: list[FileResponse]
    # В избранном у того, кто запрашивает.
    favorite: bool
    created_at: datetime

    @classmethod
    def of(
        cls,
        reference: Reference,
        author: str | None,
        files: list[StoredFile],
        storage: Storage,
        favorite: bool = False,
    ) -> "ReferenceResponse":
        return cls(
            id=reference.id,
            title=reference.title,
            type=reference.type,
            link=reference.link,
            collection=reference.collection,
            notes=reference.notes,
            tags=reference.tags,
            product_id=reference.product_id,
            author_id=reference.owner_id,
            author=author,
            files=[FileResponse.of(file, storage) for file in files],
            favorite=favorite,
            created_at=reference.created_at,
        )


class ReferenceCounts(BaseModel):
    """Сколько референсов на каждой вкладке под текущими поиском и фильтрами."""

    all: int
    # Созданные пользователем.
    mine: int
    favorites: int
    # Коллекции, в которых что-то подходит: вкладка Collections.
    collections: int


class ReferenceList(BaseModel):
    items: list[ReferenceResponse]
    # Сколько всего подходит под поиск на выбранной вкладке: для пагинации.
    total: int
    counts: ReferenceCounts


class ReferenceCollection(BaseModel):
    """Коллекция на вкладке Collections: сколько в ней подходит и первые из них."""

    name: str
    total: int
    items: list[ReferenceResponse]


class ReferenceCollectionList(BaseModel):
    items: list[ReferenceCollection]
    # Сколько всего коллекций подходит: для пагинации.
    total: int
    counts: ReferenceCounts


class FilterProduct(BaseModel):
    id: uuid.UUID
    name: str


class ReferenceFilters(BaseModel):
    """Варианты фильтров пула: только то, что встречается в видимых референсах."""

    products: list[FilterProduct]
    # Авторы референсов (поле Creator).
    authors: list[TeamMember]
    tags: list[str]
