"""Печатает OpenAPI-схему API в stdout: `uv run python -m app.openapi`.

Из неё фронт генерирует типы (`npm run gen:api` в content-os-front). Приложение
только собирается, не запускается: база и внешние сервисы не нужны. Настройки как
в production, чтобы dev-эндпоинты не попали в контракт.
"""

import json
import sys

from app.core.config import Settings
from app.main import create_app


def main() -> None:
    settings = Settings(
        _env_file=None,
        environment="production",
        database_url="postgresql+asyncpg://unused@localhost/unused",
    )
    json.dump(create_app(settings).openapi(), sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
