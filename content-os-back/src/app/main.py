from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI

from app.auth.router import router as auth_router
from app.core.config import Settings, get_settings
from app.core.csrf import origin_check
from app.core.db import create_engine, create_sessionmaker
from app.core.storage import build_storage
from app.health.router import router as health_router
from app.onboarding.router import router as onboarding_router
from app.profile.router import router as profile_router
from app.review.router import dev_router as review_dev_router
from app.review.router import router as review_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        engine = create_engine(str(settings.database_url))
        app.state.sessionmaker = create_sessionmaker(engine)
        yield
        await engine.dispose()

    app = FastAPI(
        title="ContentOS API",
        lifespan=lifespan,
        docs_url="/api/docs" if settings.docs_enabled else None,
        openapi_url="/api/openapi.json" if settings.docs_enabled else None,
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.storage = build_storage(settings)
    app.middleware("http")(origin_check(settings.allowed_origins))

    api = APIRouter(prefix="/api")
    api.include_router(health_router)
    api.include_router(auth_router)
    api.include_router(onboarding_router)
    api.include_router(profile_router)
    api.include_router(review_router)
    if settings.dev_endpoints_enabled:
        api.include_router(review_dev_router)
    app.include_router(api)

    return app
