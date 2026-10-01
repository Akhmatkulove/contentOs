from fastapi import APIRouter

from app.auth.deps import CurrentUser
from app.auth.schemas import MeResponse
from app.core.config import SettingsDep
from app.core.db import SessionDep
from app.onboarding import service
from app.onboarding.schemas import OnboardingUpdate
from app.review.notifier import NotifierDep

router = APIRouter(prefix="/me/onboarding", tags=["onboarding"])


@router.patch("")
async def update_onboarding(
    body: OnboardingUpdate, user: CurrentUser, db: SessionDep, settings: SettingsDep
) -> MeResponse:
    service.update_answers(user, body)
    await db.commit()
    return MeResponse.of(user, settings)


@router.post("/submit")
async def submit_onboarding(
    user: CurrentUser, db: SessionDep, notifier: NotifierDep, settings: SettingsDep
) -> MeResponse:
    await service.submit(db, user, notifier)
    await db.commit()
    return MeResponse.of(user, settings)


@router.post("/reopen")
async def reopen_onboarding(
    user: CurrentUser, db: SessionDep, notifier: NotifierDep, settings: SettingsDep
) -> MeResponse:
    await service.reopen(db, user, notifier)
    await db.commit()
    return MeResponse.of(user, settings)
