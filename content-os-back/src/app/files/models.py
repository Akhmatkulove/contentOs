import enum
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, string_enum


class FileKind(enum.StrEnum):
    IMAGE = "image"
    VIDEO = "video"


class StoredFile(Base):
    """Загруженный файл в приватном хранилище (files/…).

    Пока его не использовали в продукте или референсе, он ничей, кроме загрузившего.
    """

    __tablename__ = "files"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String(255), unique=True)
    kind: Mapped[FileKind] = mapped_column(string_enum(FileKind, "file_kind"))
    content_type: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column(BigInteger)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
