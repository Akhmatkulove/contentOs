"""Ограничение частоты запросов: счётчики с фиксированным окном в Postgres.

Postgres, а не память процесса: счётчики общие для всех воркеров и переживают рестарт.
"""

from datetime import UTC, datetime, timedelta
from math import ceil

from fastapi import HTTPException, Request, status
from sqlalchemy import DateTime, Integer, String, case, literal, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class RateLimitCounter(Base):
    __tablename__ = "rate_limits"

    # Например "login-ip:203.0.113.7" или "submit:<user id>".
    key: Mapped[str] = mapped_column(String(400), primary_key=True)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    hits: Mapped[int] = mapped_column(Integer)


def client_ip(request: Request) -> str:
    # За reverse proxy uvicorn должен запускаться с --proxy-headers и
    # --forwarded-allow-ips, иначе здесь будет адрес прокси и лимит станет общим на всех.
    return request.client.host if request.client else "unknown"


def _too_many(window_start: datetime, window: timedelta, now: datetime) -> HTTPException:
    retry_after = ceil((window_start + window - now).total_seconds())
    return HTTPException(
        status.HTTP_429_TOO_MANY_REQUESTS,
        "Too many attempts, try again later",
        headers={"Retry-After": str(max(retry_after, 1))},
    )


async def _hit(db: AsyncSession, key: str, window: timedelta) -> tuple[int, datetime]:
    now = datetime.now(UTC)
    window_expired = RateLimitCounter.window_start <= now - window
    statement = (
        insert(RateLimitCounter)
        .values(key=key, window_start=now, hits=1)
        .on_conflict_do_update(
            index_elements=[RateLimitCounter.key],
            set_={
                "hits": case((window_expired, literal(1)), else_=RateLimitCounter.hits + 1),
                "window_start": case(
                    (window_expired, literal(now)), else_=RateLimitCounter.window_start
                ),
            },
        )
        .returning(RateLimitCounter.hits, RateLimitCounter.window_start)
    )
    hits, window_start = (await db.execute(statement)).one()
    # Попытка остаётся засчитанной, даже если запрос дальше упадёт.
    await db.commit()
    return hits, window_start


async def check(db: AsyncSession, key: str, limit: int, window: timedelta) -> None:
    """Засчитывает попытку и отвечает 429, если в текущем окне их больше limit."""
    hits, window_start = await _hit(db, key, window)
    if hits > limit:
        raise _too_many(window_start, window, datetime.now(UTC))


async def record(db: AsyncSession, key: str, window: timedelta) -> None:
    """Засчитывает попытку без проверки: для счёта только неудачных попыток."""
    await _hit(db, key, window)


async def ensure_below(db: AsyncSession, key: str, limit: int, window: timedelta) -> None:
    """Отвечает 429, если записанных попыток уже limit, ничего не засчитывая."""
    # Не db.get(): счётчик меняется core-запросом мимо identity map сессии.
    row = (
        await db.execute(
            select(RateLimitCounter.hits, RateLimitCounter.window_start).where(
                RateLimitCounter.key == key
            )
        )
    ).one_or_none()
    now = datetime.now(UTC)
    if row is not None and row.window_start > now - window and row.hits >= limit:
        raise _too_many(row.window_start, window, now)
