from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI

from app.activity.router import router as activity_router
from app.admin.router import router as admin_router
from app.auth.deps import get_approved_user
from app.auth.router import router as auth_router
from app.collections.router import router as collections_router
from app.content.router import router as content_router
from app.core.body_limit import BodyLimitMiddleware
from app.core.config import Settings, get_settings
from app.core.csrf import origin_check
from app.core.db import create_engine, create_sessionmaker
from app.core.storage import build_storage
from app.files.router import router as files_router
from app.health.router import router as health_router
from app.locations.geosuggest import build_geosuggest
from app.locations.router import router as locations_router
from app.notifications.router import router as notifications_router
from app.onboarding.router import router as onboarding_router
from app.products.router import router as products_router
from app.profile.router import router as profile_router
from app.references.router import router as references_router
from app.review.router import dev_router as review_dev_router
from app.review.router import router as review_router
from app.shoots.router import router as shoots_router
from app.shoots.tasks_router import router as tasks_router
from app.team.router import router as team_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        engine = create_engine(str(settings.database_url))
        app.state.sessionmaker = create_sessionmaker(engine)
        yield
        await engine.dispose()
        if app.state.geosuggest is not None:
            await app.state.geosuggest.aclose()

    app = FastAPI(
        title="ContentOS API",
        lifespan=lifespan,
        docs_url="/api/docs" if settings.docs_enabled else None,
        openapi_url="/api/openapi.json" if settings.docs_enabled else None,
        redoc_url=None,
    )
    app.state.settings = settings
    app.state.storage = build_storage(settings)
    app.state.geosuggest = build_geosuggest(settings)
    app.middleware("http")(origin_check(settings.allowed_origins))
    app.add_middleware(BodyLimitMiddleware)

    api = APIRouter(prefix="/api")
    api.include_router(health_router)
    api.include_router(auth_router)
    api.include_router(onboarding_router)
    api.include_router(profile_router)
    api.include_router(review_router)
    api.include_router(admin_router)
    if settings.dev_endpoints_enabled:
        api.include_router(review_dev_router)

    # The product itself: only approved users get in. Feature routers go here, so an
    # endpoint can't be left open by forgetting a dependency. Roles are checked on top.
    product = APIRouter(dependencies=[Depends(get_approved_user)])
    product.include_router(collections_router)
    product.include_router(content_router)
    product.include_router(files_router)
    product.include_router(locations_router)
    product.include_router(notifications_router)
    product.include_router(activity_router)
    product.include_router(products_router)
    product.include_router(references_router)
    product.include_router(shoots_router)
    product.include_router(tasks_router)
    product.include_router(team_router)
    api.include_router(product)
    app.include_router(api)

    return app
