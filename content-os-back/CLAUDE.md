# content-os-back

Python 3.13, FastAPI, SQLAlchemy 2 (async, asyncpg), Alembic, PostgreSQL 18, pydantic-settings. Зависимости и venv: uv.

## Команды

- `cp .env.example .env` — один раз
- `docker compose up -d db minio minio-init`: Postgres на `localhost:5433` (5432 часто занят локальным Postgres), MinIO на `:9000` (консоль `:9001`, contentos / contentos)
- `uv run alembic upgrade head` · `uv run uvicorn app.main:create_app --factory --reload`: api на `:8000`, фронт проксирует туда `/api`
- `docker compose up --build`: весь стек в контейнерах (db → migrate → api); `docker compose watch` пересобирает при изменениях
- `uv run pytest` · `uv run ruff check` · `uv run ruff format` · `uv run mypy`
- После изменений прогоняй `pytest`, `ruff check`, `ruff format --check` и `mypy`. Pre-push hook (`content-os-front/.husky`) запускает то же самое и требует запущенный Docker, pre-commit проверяет ruff'ом staged-файлы. CI: `.github/workflows/backend.yml`.

## Структура

```
src/app/main.py        create_app(): фабрика приложения, все роутеры под /api
src/app/core/          config (Settings, SettingsDep), db (Base, engine, SessionDep), csrf, storage (S3),
                       body_limit (размер тела), rate_limit (счётчики попыток в Postgres)
src/app/auth/          пользователи, сессии, signup/login/logout/me, зависимости доступа
src/app/onboarding/    ответы онбординга, отправка и отзыв заявки
src/app/profile/       фото профиля: PUT/DELETE /api/me/photo
src/app/review/        проверка заявок: Telegram (webhook, кнопки), dev-эндпоинт POST /api/dev/review
src/app/<feature>/     код фичи: router.py, schemas.py, models.py, service.py
migrations/            Alembic
tests/                 pytest, по файлу на фичу: tests/test_<feature>.py
```

Правила:

1. Код группируется по фичам, а не по типам файлов. Файл в фиче создаётся, когда он нужен: пустые `service.py` и т. п. заранее не заводи.
2. Фичи импортируют `app.core`, но не друг друга, пока нет реальной необходимости. Общее выносится в `core`, когда появляется второй потребитель.
3. Настройки читаются только через `Settings` в `app.core.config`; `os.environ` в коде приложения не используй.
4. Сессия БД приходит через `SessionDep`. `commit()` делает тот, кто владеет операцией (обработчик или сервис), а не репозиторные функции.
5. Доступ проверяется зависимостями из `app.auth.deps`: `CurrentUser` (есть сессия), `ApprovedUser` (аккаунт одобрен, весь продукт за ней), `require_role(...)`. Владение ресурсом проверяет сервис фичи. Роль и статус — разные поля, см. `docs/adr/0001-auth-and-roles.md`.
6. Pydantic-схемы на входе и выходе API, ORM-модели наружу не отдаются. Обработчики возвращают схему, `response_model` выводится из аннотации.
7. Схемы — контракт с фронтом: фронт генерирует из них типы (`uv run python -m app.openapi` → `npm run gen:api` в content-os-front). Изменил схему или эндпоинт — перегенерируй типы на фронте, иначе упадёт CI фронта.

## Безопасность

- Размер тела ограничивает `BodyLimitMiddleware` (1 МБ, `/api/me/photo` — 6 МБ): FastAPI читает тело до проверки сессии. Новому эндпоинту с файлами добавь лимит в `PATH_LIMITS`.
- Дорогие или шумные действия (argon2, сообщения в Telegram) закрывай `rate_limit.check(...)` до самой работы.
- `rate_limit.client_ip` берёт адрес из `request.client`. За reverse proxy запускай uvicorn с `--proxy-headers --forwarded-allow-ips=<адрес прокси>`, иначе у всех клиентов будет один IP и общий лимит.

## База данных и миграции

- Модели наследуются от `app.core.db.Base`. Имена constraint'ов задаёт `NAMING_CONVENTION`, вручную их не пиши.
- Новую модель импортируй в `migrations/env.py` (рядом с `Base`), иначе autogenerate её не увидит.
- Миграция: `uv run alembic revision --autogenerate -m "add users"`. Сгенерированный файл всегда проверяй глазами и пиши рабочий `downgrade()`.
- `tests/test_migrations.py` проверяет, что миграции откатываются и накатываются и что модели совпадают со схемой. Если модель изменили без миграции, он упадёт.

## Тесты

- Тесты ходят в настоящий Postgres: testcontainers поднимает `postgres:18-alpine` на сессию (нужен запущенный Docker). Если задан `TEST_DATABASE_URL`, используется эта БД.
- Миграции накатываются один раз на сессию. Каждый тест работает в транзакции, которая откатывается. `commit()` в коде внутри теста становится savepoint'ом, так что его можно вызывать.
- Фикстура `client` даёт `httpx.AsyncClient` к приложению с тестовой сессией. Тестируй через HTTP API, а не через внутренние функции.
- Тесты асинхронные без декораторов (`asyncio_mode = auto`). Предупреждения считаются ошибками.
