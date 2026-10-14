import uuid
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.core.storage import Storage
from app.files.models import FileKind, StoredFile


class FileResponse(BaseModel):
    id: uuid.UUID
    kind: FileKind
    content_type: str
    # Presigned URL, живёт час: не сохраняй его, запрашивай заново.
    url: str

    @classmethod
    def of(cls, file: StoredFile, storage: Storage) -> "FileResponse":
        return cls(
            id=file.id,
            kind=file.kind,
            content_type=file.content_type,
            url=storage.presigned_url(file.key),
        )


class UploadStart(BaseModel):
    """Что браузер собирается загрузить; проверяется ещё раз по самому файлу."""

    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]
    size: int = Field(ge=1)
    content_type: Annotated[str, StringConstraints(max_length=100)]


class UploadTicket(BaseModel):
    # С ним потом POST /api/uploads/{id}/complete.
    id: uuid.UUID
    # Presigned PUT URL хранилища, живёт 15 минут.
    url: str
    # Заголовки PUT-запроса: Content-Type входит в подпись.
    headers: dict[str, str]
