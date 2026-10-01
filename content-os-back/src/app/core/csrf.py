from collections.abc import Awaitable, Callable

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def origin_check(
    allowed_origins: list[str],
) -> Callable[[Request, Callable[[Request], Awaitable[Response]]], Awaitable[Response]]:
    """Отклоняет изменяющие запросы, которые браузер прислал с чужого origin.

    Cookie сессии и так SameSite=Lax, это второй слой. Запросы без Origin
    (не из браузера: curl, webhook'и) пропускаем: CSRF возможен только из браузера,
    а он Origin на POST/PUT/PATCH/DELETE отправляет всегда.
    """

    async def middleware(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        origin = request.headers.get("origin")
        if request.method not in SAFE_METHODS and origin and origin not in allowed_origins:
            return JSONResponse(
                {"detail": "Origin not allowed"}, status_code=status.HTTP_403_FORBIDDEN
            )
        return await call_next(request)

    return middleware
