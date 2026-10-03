import enum
import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base, string_enum


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


class User(Base):
    __tablename__ = "users"
    # Админ — служебный аккаунт вне продукта, роли у него нет. См. docs/adr/0002.
    __table_args__ = (CheckConstraint("NOT is_admin OR role IS NULL", name="admin_has_no_role"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Всегда в нижнем регистре, приводят схемы на входе.
    email: Mapped[str] = mapped_column(String(320), unique=True)
    # None у тех, кто вошёл только через Google.
    password_hash: Mapped[str | None]
    # Постоянный id аккаунта Google (claim `sub`); email в Google может смениться.
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True)
    email_verified: Mapped[bool] = mapped_column(default=False)
    role: Mapped[Role | None] = mapped_column(string_enum(Role, "role"))
    status: Mapped[Status] = mapped_column(string_enum(Status, "status"), default=Status.ONBOARDING)
    name: Mapped[str | None] = mapped_column(String(100))
    # Ключ аватара в хранилище (avatars/<uuid>.webp), URL строит core.storage.public_url.
    photo_key: Mapped[str | None] = mapped_column(String(255))
    # Ставит только CLI `app.admin.create_admin`, публичные схемы его не принимают.
    is_admin: Mapped[bool] = mapped_column(default=False)
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
