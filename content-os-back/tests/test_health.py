from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.main import create_app


@asynccontextmanager
async def running(app: FastAPI) -> AsyncIterator[AsyncClient]:
    """Клиент с настоящим lifespan: engine и сессии создаёт само приложение."""
    async with (
        app.router.lifespan_context(app),
        AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client,
    ):
        yield client


async def test_health_reports_ok_when_database_is_reachable(client: AsyncClient) -> None:
    response = await client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_app_connects_to_database_on_its_own(settings: Settings) -> None:
    async with running(create_app(settings)) as client:
        response = await client.get("/api/health")

    assert response.status_code == 200


async def test_health_reports_503_when_database_is_unreachable() -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url="postgresql+asyncpg://nobody:nothing@127.0.0.1:1/none",
    )

    async with running(create_app(settings)) as client:
        response = await client.get("/api/health")

    assert response.status_code == 503
