"""Уборка того, что копится само: `uv run python -m app.cleanup`. Запускать раз в сутки (cron).

- файлы, загруженные больше суток назад и нигде не использованные: форму так и не
  сохранили (docs/adr/0003);
- просроченные сессии, с которыми больше не приходили;
- счётчики rate limit, чьё окно давно закончилось.
"""

import asyncio
import sys
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

# Все модели приложения: занятые файлы ищутся по ссылкам из метаданных (app.files.service).
import app.main  # noqa: F401
from app.auth.service import delete_expired_sessions
from app.core import rate_limit
from app.core.config import get_settings
from app.core.db import create_engine, create_sessionmaker
from app.core.storage import Storage, build_storage, delete_quietly
from app.files.service import delete_unused

# Столько файл ждёт, пока его возьмут в продукт или референс: форма может быть
# открыта долго, а загрузка идёт до сохранения.
UNUSED_FILE_AGE = timedelta(days=1)


@dataclass(frozen=True)
class Report:
    files: int
    sessions: int
    rate_limits: int


async def cleanup(db: AsyncSession, storage: Storage | None, now: datetime) -> Report:
    """Удаляет всё за один commit; файлы из хранилища — после него."""
    # Без хранилища файлы не трогаем: их ключи потерялись бы вместе со строками.
    keys = await delete_unused(db, now - UNUSED_FILE_AGE) if storage is not None else []
    sessions = await delete_expired_sessions(db, now)
    counters = await rate_limit.delete_stale(db, now)
    await db.commit()
    if storage is not None:
        await delete_quietly(storage, *keys)
    return Report(files=len(keys), sessions=sessions, rate_limits=counters)


async def main() -> None:
    settings = get_settings()
    engine = create_engine(str(settings.database_url))
    try:
        async with create_sessionmaker(engine)() as db:
            report = await cleanup(db, build_storage(settings), datetime.now(UTC))
    finally:
        await engine.dispose()
    sys.stdout.write(
        f"Удалено: файлов {report.files}, сессий {report.sessions}, "
        f"счётчиков {report.rate_limits}\n"
    )


if __name__ == "__main__":
    asyncio.run(main())
