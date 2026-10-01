import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from argon2 import PasswordHasher
from argon2.exceptions import VerificationError
from fastapi import Response
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.auth.google import GoogleError, GoogleProfile
from app.auth.models import User, UserSession
from app.core.config import Settings

SESSION_COOKIE = "session"

_hasher = PasswordHasher()
# Сверяем с ним, когда пользователя нет: ответ занимает столько же времени,
# и по задержке нельзя узнать, зарегистрирован ли email.
_DUMMY_HASH = _hasher.hash("dummy-password")


async def hash_password(password: str) -> str:
    # argon2 намеренно медленный, в event loop его не крутим.
    return await run_in_threadpool(_hasher.hash, password)


async def verify_password(password_hash: str | None, password: str) -> bool:
    try:
        await run_in_threadpool(_hasher.verify, password_hash or _DUMMY_HASH, password)
    except VerificationError:
        return False
    return password_hash is not None


def _session_id(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def create_session(db: AsyncSession, user: User, settings: Settings) -> str:
    """Заводит сессию и возвращает токен для cookie. Коммитит вызывающий."""
    token = secrets.token_urlsafe(32)
    db.add(
        UserSession(
            id=_session_id(token),
            user_id=user.id,
            expires_at=datetime.now(UTC) + timedelta(days=settings.session_ttl_days),
        )
    )
    return token


async def resolve_session(
    db: AsyncSession, token: str, settings: Settings
) -> tuple[User, bool] | None:
    """Пользователь по токену и флаг «сессию продлили, cookie надо перевыставить»."""
    row = (
        await db.execute(
            select(UserSession, User)
            .join(User, User.id == UserSession.user_id)
            .where(UserSession.id == _session_id(token))
        )
    ).one_or_none()
    if row is None:
        return None

    session, user = row
    now = datetime.now(UTC)
    if session.expires_at <= now:
        await db.delete(session)
        await db.commit()
        return None

    # Продлеваем, когда прошла половина срока, а не на каждом запросе: меньше записей в БД.
    ttl = timedelta(days=settings.session_ttl_days)
    if session.expires_at - now < ttl / 2:
        session.expires_at = now + ttl
        await db.commit()
        return user, True
    return user, False


async def delete_session(db: AsyncSession, token: str) -> None:
    await db.execute(delete(UserSession).where(UserSession.id == _session_id(token)))


async def sign_in_with_google(db: AsyncSession, profile: GoogleProfile) -> User:
    """Находит, привязывает или создаёт пользователя по профилю Google. Коммитит вызывающий."""
    user = await db.scalar(select(User).where(User.google_sub == profile.sub))
    if user is not None:
        return user
    if not profile.email_verified:
        raise GoogleError("Google account email is not verified")

    user = await db.scalar(select(User).where(User.email == profile.email))
    if user is None:
        user = User(email=profile.email, google_sub=profile.sub, email_verified=True)
        db.add(user)
        await db.flush()
        return user

    if user.google_sub is not None:
        raise GoogleError("Email is linked to another Google account")
    if not user.email_verified:
        # Аккаунт с паролем мог завести кто угодно на чужой email. Владелец почты,
        # подтверждённый Google, забирает аккаунт: пароль и все сессии сбрасываются.
        user.password_hash = None
        await db.execute(delete(UserSession).where(UserSession.user_id == user.id))
    user.google_sub = profile.sub
    user.email_verified = True
    return user


def set_session_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.session_ttl_days * 24 * 60 * 60,
        path="/api",
        httponly=True,
        samesite="lax",
        secure=settings.secure_cookies,
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(
        SESSION_COOKIE,
        path="/api",
        httponly=True,
        samesite="lax",
        secure=settings.secure_cookies,
    )
