import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Role(enum.StrEnum):
    """Кто пользователь в продукте. Решает, что доступно внутри."""

    BRAND = "brand"
    ART_DIRECTOR = "art_director"
    CREATOR = "creator"


class Status(enum.StrEnum):
    """Где аккаунт в жизненном цикле. Решает, пускать ли в продукт вообще."""

    ONBOARDING = "onboarding"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"


def _string_enum(enum_class: type[enum.StrEnum], name: str) -> Enum:
    # VARCHAR + CHECK вместо типа ENUM в Postgres: новое значение не требует ALTER TYPE.
    return Enum(
        enum_class,
        name=name,
        native_enum=False,
        create_constraint=True,
        length=32,
        values_callable=lambda members: [member.value for member in members],
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Всегда в нижнем регистре, приводят схемы на входе.
    email: Mapped[str] = mapped_column(String(320), unique=True)
    # None у тех, кто вошёл только через Google.
    password_hash: Mapped[str | None]
    # Постоянный id аккаунта Google (claim `sub`); email в Google может смениться.
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True)
    email_verified: Mapped[bool] = mapped_column(default=False)
    role: Mapped[Role | None] = mapped_column(_string_enum(Role, "role"))
    status: Mapped[Status] = mapped_column(
        _string_enum(Status, "status"), default=Status.ONBOARDING
    )
    name: Mapped[str | None] = mapped_column(String(100))
    # Ключ аватара в хранилище (avatars/<uuid>.webp), URL строит core.storage.public_url.
    photo_key: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserSession(Base):
    __tablename__ = "sessions"

    # sha256 от токена из cookie: утечка таблицы не даёт войти под чужой сессией.
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
