import uuid
from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, Field, StringConstraints, model_validator

from app.core.text import LongText, ShortText, Tags
from app.deliverables.schemas import DeliverableDraft, DeliverableResponse
from app.files.schemas import FileResponse
from app.products.models import ProductStatus
from app.references.schemas import ReferenceDraft, ReferenceResponse

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
About = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=5000)]

# Референсов бренда и deliverables у одного продукта.
MAX_REFERENCES = 50
MAX_DELIVERABLES = 50


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
    # Назначенные арт-директора начинают видеть продукт (docs/adr/0004).
    deliverables: list[DeliverableDraft] = Field(default_factory=list, max_length=MAX_DELIVERABLES)

    def file_ids(self) -> list[uuid.UUID]:
        """Все файлы запроса: фото и файлы референсов."""
        return [*self.photo_ids, *(file_id for ref in self.references for file_id in ref.file_ids)]

    @model_validator(mode="after")
    def files_used_once(self) -> Self:
        ids = self.file_ids()
        if len(set(ids)) != len(ids):
            raise ValueError("Each file can be used once")
        return self


class ProductUpdate(ProductCreate):
    """Полное состояние продукта из формы редактирования (docs/adr/0005).

    `photo_ids` — все фото по порядку: оставшиеся и новые загруженные. `references` и
    `deliverables` — только новые; из уже сохранённых остаются перечисленные в
    `reference_ids` и `deliverable_ids`, остальные удаляются.
    """

    # Референсы бренда в этом продукте; чужие (арт-директоров) форма не трогает.
    reference_ids: list[uuid.UUID] = Field(default_factory=list, max_length=MAX_REFERENCES)
    # Порядок оставшихся deliverables; новые идут после них.
    deliverable_ids: list[uuid.UUID] = Field(default_factory=list, max_length=MAX_DELIVERABLES)

    @model_validator(mode="after")
    def ids_unique_and_within_limits(self) -> Self:
        for ids in (self.reference_ids, self.deliverable_ids):
            if len(set(ids)) != len(ids):
                raise ValueError("Ids repeat")
        # Лимиты на продукт целиком, а не на одно сохранение.
        if len(self.reference_ids) + len(self.references) > MAX_REFERENCES:
            raise ValueError(f"A product has at most {MAX_REFERENCES} references")
        if len(self.deliverable_ids) + len(self.deliverables) > MAX_DELIVERABLES:
            raise ValueError(f"A product has at most {MAX_DELIVERABLES} deliverables")
        return self


class ProductPatch(BaseModel):
    """Частичное изменение без формы: меню «…» продукта (архив и возврат)."""

    status: ProductStatus


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
    deliverables: list[DeliverableResponse]
    created_at: datetime
    # По продукту идёт работа в съёмках: архив недоступен (docs/adr/0022).
    in_work: bool
    # Пользователь — бренд-владелец: ему доступны редактирование и кнопки «+».
    can_edit: bool


class ProductListItem(BaseModel):
    id: uuid.UUID
    name: str
    collection: str | None
    sku: str | None
    status: ProductStatus
    # Первое фото продукта, presigned URL.
    photo: FileResponse | None
    created_at: datetime
    # По продукту идёт работа в съёмках: архив недоступен (docs/adr/0022).
    in_work: bool


class ProductOption(BaseModel):
    """Продукт в выпадающем списке: только то, что нужно для выбора."""

    id: uuid.UUID
    name: str


class ProductList(BaseModel):
    items: list[ProductListItem]
    # Сколько всего подходит под поиск: для пагинации.
    total: int


class ProductFilters(BaseModel):
    """Варианты фильтров списка: только то, что есть у видимых продуктов."""

    collections: list[str]
