import uuid

from pydantic import BaseModel

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
