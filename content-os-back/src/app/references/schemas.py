import uuid
from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, Field, HttpUrl, UrlConstraints, model_validator

from app.core.storage import Storage
from app.core.text import LongText, Tags, Title
from app.files.models import StoredFile
from app.files.schemas import FileResponse
from app.references.models import Reference, ReferenceType

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


class ReferenceResponse(BaseModel):
    id: uuid.UUID
    title: str | None
    type: ReferenceType | None
    link: str | None
    collection: str | None
    notes: str | None
    tags: list[str]
    product_id: uuid.UUID | None
    # Имя автора (поле Creator): бренд, если референс создан в продукте.
    author: str | None
    files: list[FileResponse]
    created_at: datetime

    @classmethod
    def of(
        cls, reference: Reference, author: str | None, files: list[StoredFile], storage: Storage
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
            author=author,
            files=[FileResponse.of(file, storage) for file in files],
            created_at=reference.created_at,
        )
