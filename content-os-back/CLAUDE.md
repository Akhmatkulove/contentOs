# content-os-back

Python 3.13, FastAPI, SQLAlchemy 2 (async, asyncpg), Alembic, PostgreSQL 18, pydantic-settings. Зависимости и venv: uv.

## Команды

- `cp .env.example .env` — один раз
- `docker compose up -d db minio minio-init`: Postgres на `localhost:5433` (5432 часто занят локальным Postgres), MinIO на `:9000` (консоль `:9001`, contentos / contentos)
- `uv run alembic upgrade head` · `uv run uvicorn app.main:create_app --factory --reload`: api на `:8000`, фронт проксирует туда `/api`
- `docker compose up --build`: весь стек в контейнерах (db → migrate → api); `docker compose watch` пересобирает при изменениях
- `uv run pytest` · `uv run ruff check` · `uv run ruff format` · `uv run mypy`
- `uv run python -m app.cleanup`: уборка раз в сутки (cron) — неиспользованные загрузки старше суток, просроченные сессии, старые счётчики rate limit
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
src/app/files/         прямая загрузка в хранилище (docs/adr/0013): POST /api/uploads выдаёт presigned PUT, POST /api/uploads/{id}/complete проверяет по содержимому, WebP, приватные ключи files/; claim_files — передача файлов в продукт или референс; delete_unused — уборка ничьих и брошенных загрузок
src/app/products/      продукты: список, страница GET /api/products/{id}, создание POST и редактирование PUT вместе с фото, референсами и deliverables (docs/adr/0003, 0004, 0005; заказ в работе не удалить — 0021), PATCH status — архив, кроме продукта в работе (docs/adr/0022)
src/app/collections/   коллекции продуктов и референсов (docs/adr/0014): видимость по связкам, GET /api/collections, resolve — выбор по имени или создание
src/app/deliverables/  deliverables продукта (модели, схемы; создаются из продукта): назначенный арт-директор видит продукт
src/app/references/    референсы общего пула: GET /api/references (свои + референсы назначенных продуктов, docs/adr/0004; креатору — пул его арт-директоров, 0006), POST /api/references (свой референс), страница GET /api/references/{id}, DELETE /api/references/{id} (только автор)
src/app/shoots/        съёмки арт-директора: POST /api/shoots (команда, продукты, референсы, deliverables с исполнителями), GET /api/shoots (свои или где креатор в команде; статус выводится, docs/adr/0007), страница GET и редактирование PUT /api/shoots/{id} (docs/adr/0008), Responsibilities участника на вкладке Team PUT /api/shoots/{id}/members/{user_id}/responsibilities; My tasks GET /api/tasks — deliverables съёмок как задачи (docs/adr/0011); страница задачи GET /api/tasks/{id} и версии готового контента (docs/adr/0012); проверка арт-директором GET /api/tasks/{id}/review, решение по версии и Send to brand (docs/adr/0015); deliverable съёмки закрывает deliverable продукта, GET /api/shoots/product-deliverables (docs/adr/0017)
src/app/notifications/ уведомления в колокольчике (docs/adr/0020): GET /api/notifications, прочитать одно или все; deliverables_assigned создают сохранения продукта
src/app/team/          команда пользователя: связки бренд ↔ арт-директор ↔ креатор (models), кто чей (service: и списки, и проверки при сохранении), GET /api/team/art-directors, GET /api/team/creators
src/app/locations/     подсказки адресов в Узбекистане: GET /api/locations/suggest (прокси к Геосаджесту Яндекса, ключ YANDEX_GEOSUGGEST_API_KEY)
src/app/admin/         админка: пользователи, назначение и снятие связок (модели связок — в team), журнал, CLI create_admin
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
   Админка закрыта `AdminUser` (не-админу `404`). Админ — флаг `is_admin`, а не роль, в продукт он не входит; создаётся только `uv run python -m app.admin.create_admin <email>`, см. `docs/adr/0002-superadmin-and-brand-art-directors.md`.
   Роутер продуктовой фичи подключай в `product` в `create_app()`: он уже закрыт `get_approved_user`, роли проверяются поверх. `tests/test_access.py` требует 401 без сессии от любого эндпоинта не из списка `PUBLIC`; новый публичный эндпоинт добавляй туда осознанно.
6. Pydantic-схемы на входе и выходе API, ORM-модели наружу не отдаются. Обработчики возвращают схему, `response_model` выводится из аннотации.
7. Схемы — контракт с фронтом: фронт генерирует из них типы (`uv run python -m app.openapi` → `npm run gen:api` в content-os-front). Изменил схему или эндпоинт — перегенерируй типы на фронте, иначе упадёт CI фронта.

## Безопасность

- Размер тела ограничивает `BodyLimitMiddleware` (1 МБ, `/api/me/photo` — 6 МБ): FastAPI читает тело до проверки сессии. Новому эндпоинту с файлами добавь лимит в `PATH_LIMITS`.
- Файл занят, пока на него ссылается ForeignKey на `files.id` (ищутся по метаданным моделей); ничей файл старше суток удаляет `app.cleanup`. Убирая файл из продукта или референса, удаляй его сразу: строку до commit, объект в хранилище после (`delete_quietly`).
- Файлы контента (`files/…`) приватные: наружу только `storage.presigned_url(key)` (живёт час), не `public_url`. Публичный только префикс `avatars/` (`put(..., public=True)`). Тип файла определяй по содержимому (`app.files.media`), не по имени или `Content-Type`.
- Файлы контента браузер кладёт в хранилище сам по presigned PUT, байты через API не идут (docs/adr/0013). Всё, что прислал клиент (тип, размер), проверяется после загрузки в `complete`; до неё файл `pending` и не годится для `claim_files`.
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
