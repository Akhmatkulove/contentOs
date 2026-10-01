import secrets
from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.auth.deps import CurrentUser
from app.auth.google import GoogleDep, GoogleError, new_pkce_pair
from app.auth.models import User
from app.auth.schemas import LoginRequest, MeResponse, SignupRequest
from app.auth.service import (
    SESSION_COOKIE,
    clear_session_cookie,
    create_session,
    delete_session,
    hash_password,
    set_session_cookie,
    sign_in_with_google,
    verify_password,
)
from app.core.config import Settings, SettingsDep
from app.core.db import SessionDep

router = APIRouter(tags=["auth"])

# state и PKCE verifier между уходом на Google и возвратом. Видна только callback'у.
GOOGLE_COOKIE = "google_oauth"
GOOGLE_COOKIE_PATH = "/api/auth/google"


@router.post("/auth/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    body: SignupRequest, db: SessionDep, settings: SettingsDep, response: Response
) -> MeResponse:
    user = User(email=body.email, password_hash=await hash_password(body.password))
    db.add(user)
    try:
        await db.flush()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email is already registered") from exc

    token = await create_session(db, user, settings)
    await db.commit()
    set_session_cookie(response, token, settings)
    return MeResponse.model_validate(user)


@router.post("/auth/login")
async def login(
    body: LoginRequest, db: SessionDep, settings: SettingsDep, response: Response
) -> MeResponse:
    user = await db.scalar(select(User).where(User.email == body.email))
    # Пароль проверяем и для несуществующего email, см. verify_password.
    password_ok = await verify_password(user.password_hash if user else None, body.password)
    if user is None or not password_ok:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")

    token = await create_session(db, user, settings)
    await db.commit()
    set_session_cookie(response, token, settings)
    return MeResponse.model_validate(user)


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    db: SessionDep,
    settings: SettingsDep,
    response: Response,
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> None:
    if token:
        await delete_session(db, token)
        await db.commit()
    clear_session_cookie(response, settings)


@router.get("/me")
async def me(user: CurrentUser) -> MeResponse:
    return MeResponse.model_validate(user)


@router.get("/auth/google")
async def google_start(google: GoogleDep, settings: SettingsDep) -> RedirectResponse:
    state = secrets.token_urlsafe(32)
    verifier, challenge = new_pkce_pair()
    response = RedirectResponse(google.authorization_url(state, challenge), status.HTTP_302_FOUND)
    response.set_cookie(
        GOOGLE_COOKIE,
        f"{state}.{verifier}",
        max_age=10 * 60,
        path=GOOGLE_COOKIE_PATH,
        httponly=True,
        samesite="lax",
        secure=settings.secure_cookies,
    )
    return response


def _google_redirect(url: str, settings: Settings) -> RedirectResponse:
    response = RedirectResponse(url, status.HTTP_302_FOUND)
    response.delete_cookie(
        GOOGLE_COOKIE,
        path=GOOGLE_COOKIE_PATH,
        httponly=True,
        samesite="lax",
        secure=settings.secure_cookies,
    )
    return response


@router.get("/auth/google/callback")
async def google_callback(
    google: GoogleDep,
    db: SessionDep,
    settings: SettingsDep,
    code: str | None = None,
    state: str | None = None,
    pending: Annotated[str | None, Cookie(alias=GOOGLE_COOKIE)] = None,
) -> RedirectResponse:
    failed = f"{settings.app_url}/login?error=google"
    # Нет code, если человек отказался на экране Google; state не совпал — чужой callback.
    expected_state, _, verifier = (pending or "").partition(".")
    if (
        not code
        or not state
        or not expected_state
        or not secrets.compare_digest(state, expected_state)
    ):
        return _google_redirect(failed, settings)

    try:
        profile = await google.fetch_profile(code, verifier)
        user = await sign_in_with_google(db, profile)
    except GoogleError:
        await db.rollback()
        return _google_redirect(failed, settings)

    token = await create_session(db, user, settings)
    await db.commit()
    # Куда дальше (онбординг, статус, дашборд), решает фронт по /me.
    response = _google_redirect(f"{settings.app_url}/", settings)
    set_session_cookie(response, token, settings)
    return response
