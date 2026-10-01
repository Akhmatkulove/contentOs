"""Ограничение размера тела запроса.

FastAPI разбирает тело (в том числе multipart с файлами) до зависимостей, то есть до
проверки сессии. Без лимита кто угодно без аккаунта может забить диск временными файлами.
"""

from starlette.types import ASGIApp, Message, Receive, Scope, Send

DEFAULT_LIMIT = 1024 * 1024
# Фото до 5 МБ плюс накладные расходы multipart.
PATH_LIMITS = {"/api/me/photo": 6 * 1024 * 1024}


class BodyTooLargeError(Exception):
    pass


class BodyLimitMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        limit = PATH_LIMITS.get(scope["path"], DEFAULT_LIMIT)
        headers = dict(scope["headers"])
        declared = headers.get(b"content-length")
        if declared is not None and (not declared.isdigit() or int(declared) > limit):
            await _send_413(send)
            return

        # Без Content-Length (chunked) или если клиент соврал: считаем байты на лету.
        received = 0
        exceeded = False

        async def limited_receive() -> Message:
            nonlocal received, exceeded
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    exceeded = True
                    raise BodyTooLargeError
            return message

        response_started = False

        async def guarded_send(message: Message) -> None:
            nonlocal response_started
            # FastAPI превращает ошибку чтения тела в 400; отвечаем честным 413.
            if exceeded:
                if not response_started:
                    response_started = True
                    await _send_413(send)
                return
            if message["type"] == "http.response.start":
                response_started = True
            await send(message)

        try:
            await self.app(scope, limited_receive, guarded_send)
        except BodyTooLargeError:
            if not response_started:
                await _send_413(send)


async def _send_413(send: Send) -> None:
    body = b'{"detail":"Request body is too large"}'
    await send(
        {
            "type": "http.response.start",
            "status": 413,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})
