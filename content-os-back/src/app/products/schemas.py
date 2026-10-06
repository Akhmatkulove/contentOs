import uuid
from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.core.text import LongText, ShortText, Tags
from app.files.schemas import FileResponse
from app.products.models import ProductStatus
from app.references.schemas import ReferenceDraft, ReferenceResponse

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
About = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]


class ProductCreate(BaseModel):
    name: Name
    about: About
    notes: LongText = None
    collection: ShortText = None
    category: ShortText = None
    sku: ShortText = None
    status: ProductStatus = ProductStatus.ACTIVE
    tags: Tags = Field(default_factory=list)
    # Загруженные заранее (POST /api/uploads), в этом порядке.
    photo_ids: list[uuid.UUID] = Field(min_length=1, max_length=20)
    references: list[ReferenceDraft] = Field(default_factory=list, max_length=20)

    def file_ids(self) -> list[uuid.UUID]:
        """Все файлы запроса: фото и файлы референсов."""
        return [*self.photo_ids, *(file_id for ref in self.references for file_id in ref.file_ids)]

    @model_validator(mode="after")
    def files_used_once(self) -> Self:
        ids = self.file_ids()
        if len(set(ids)) != len(ids):
            raise ValueError("Each file can be used once")
        return self


class ProductResponse(BaseModel):
    id: uuid.UUID
    name: str
    about: str
    notes: str | None
    collection: str | None
    category: str | None
    sku: str | None
    status: ProductStatus
    tags: list[str]
    photos: list[FileResponse]
    references: list[ReferenceResponse]
    created_at: datetime


class ProductListItem(BaseModel):
    id: uuid.UUID
    name: str
    collection: str | None
    sku: str | None
    status: ProductStatus
    # Первое фото продукта, presigned URL.
    photo: FileResponse | None
    created_at: datetime


class ProductList(BaseModel):
    items: list[ProductListItem]
    # Сколько всего подходит под поиск: для пагинации.
    total: int
