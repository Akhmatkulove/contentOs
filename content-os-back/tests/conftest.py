import os
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from app.core.config import Settings
from app.core.db import create_engine, get_session
from app.main import create_app

# Colima/Docker Desktop: Ryuk монтирует сокет изнутри VM, а не путь хоста из DOCKER_HOST.
os.environ.setdefault("TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE", "/var/run/docker.sock")
from testcontainers.community.postgres import PostgresContainer

ROOT = Path(__file__).parent.parent


@pytest.fixture(scope="session")
def database_url() -> Iterator[str]:
    # В CI можно отдать готовую БД через TEST_DATABASE_URL, локально поднимаем контейнер.
    if url := os.environ.get("TEST_DATABASE_URL"):
        yield url
        return
    with PostgresContainer("postgres:18-alpine", driver="asyncpg") as postgres:
        yield postgres.get_connection_url()


@pytest.fixture(scope="session")
def alembic_config(database_url: str) -> Config:
    config = Config(ROOT / "alembic.ini")
    config.set_main_option("sqlalchemy.url", database_url)
    return config


@pytest.fixture(scope="session")
def migrated_database_url(database_url: str, alembic_config: Config) -> str:
    command.upgrade(alembic_config, "head")
    return database_url


@pytest.fixture(scope="session")
def settings(migrated_database_url: str) -> Settings:
    # Без .env: локальные токены Telegram, Google и хранилища в тесты попадать не должны.
    return Settings(_env_file=None, environment="test", database_url=migrated_database_url)


@pytest.fixture(scope="session")
async def engine(settings: Settings) -> AsyncIterator[AsyncEngine]:
    engine = create_engine(str(settings.database_url))
    yield engine
    await engine.dispose()


@pytest.fixture
async def db_session(engine: AsyncEngine) -> AsyncIterator[AsyncSession]:
    """Сессия внутри внешней транзакции: commit() в коде становится savepoint'ом,
    а после теста всё откатывается."""
    async with engine.connect() as connection:
        transaction = await connection.begin()
        session = AsyncSession(
            bind=connection,
            join_transaction_mode="create_savepoint",
            expire_on_commit=False,
        )
        yield session
        await session.close()
        await transaction.rollback()


@pytest.fixture
async def client(settings: Settings, db_session: AsyncSession) -> AsyncIterator[AsyncClient]:
    app = create_app(settings)
    app.dependency_overrides[get_session] = lambda: db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.fixture
async def user_client(client: AsyncClient) -> AsyncClient:
    """Клиент только что зарегистрированного пользователя: статус onboarding, роли нет."""
    response = await client.post(
        "/api/auth/signup", json={"email": "user@example.com", "password": "user-password"}
    )
    assert response.status_code == 201
    return client
