"""Слои доступа: сессия → статус → роль, отдельно админ. Владение ресурсом проверяют сервисы фич."""

from collections.abc import Awaitable, Callable
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Response, status

from app.auth.models import Role, Status, User
from app.auth.service import SESSION_COOKIE, resolve_session, set_session_cookie
from app.core.config import SettingsDep
from app.core.db import SessionDep


async def get_current_user(
    db: SessionDep,
    settings: SettingsDep,
    response: Response,
    token: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> User:
    if not token or (resolved := await resolve_session(db, token, settings)) is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    user, extended = resolved
    if extended:
        set_session_cookie(response, token, user, settings)
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_approved_user(user: CurrentUser) -> User:
    # Админ — служебный аккаунт, в продукт он не входит (docs/adr/0002).
    if user.status != Status.APPROVED or user.is_admin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is not approved")
    return user


ApprovedUser = Annotated[User, Depends(get_approved_user)]


async def get_admin_user(user: CurrentUser) -> User:
    # 404, а не 403: не-админу незачем знать, что админка существует.
    if not user.is_admin:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Not Found")
    return user


AdminUser = Annotated[User, Depends(get_admin_user)]


def require_role(*roles: Role) -> Callable[[User], Awaitable[User]]:
    """`Depends(require_role(Role.BRAND))`: одобренный пользователь с одной из ролей."""

    async def dependency(user: ApprovedUser) -> User:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Role not allowed")
        return user

    return dependency
