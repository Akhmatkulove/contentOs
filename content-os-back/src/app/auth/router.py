from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.auth.deps import CurrentUser
from app.auth.models import User
from app.auth.schemas import LoginRequest, MeResponse, SignupRequest
from app.auth.service import (
    SESSION_COOKIE,
    clear_session_cookie,
    create_session,
    delete_session,
    hash_password,
    set_session_cookie,
    verify_password,
)
from app.core.config import SettingsDep
from app.core.db import SessionDep

router = APIRouter(tags=["auth"])


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
