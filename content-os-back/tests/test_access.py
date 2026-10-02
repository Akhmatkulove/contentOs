"""Каждый эндпоинт без сессии отвечает 401, кроме явно перечисленных публичных."""

import re
import uuid

from httpx import AsyncClient

from app.core.config import Settings
from app.main import create_app

# Открыты без сессии. Новый публичный эндпоинт добавляется сюда осознанно.
PUBLIC = {
    ("GET", "/api/health"),
    ("POST", "/api/auth/signup"),
    ("POST", "/api/auth/login"),
    ("POST", "/api/auth/logout"),
    ("GET", "/api/auth/google"),
    ("GET", "/api/auth/google/callback"),
    ("POST", "/api/telegram/webhook"),  # проверяется секретом Telegram
    ("POST", "/api/dev/review"),  # не подключается в production
}


def endpoints(settings: Settings) -> set[tuple[str, str]]:
    paths = create_app(settings).openapi()["paths"]
    return {(method.upper(), path) for path, item in paths.items() for method in item}


def test_public_list_has_no_stale_entries(settings: Settings) -> None:
    assert endpoints(settings) >= PUBLIC


async def test_every_other_endpoint_requires_a_session(
    client: AsyncClient, settings: Settings
) -> None:
    # Зависимость сессии срабатывает раньше проверки тела и параметров,
    # поэтому пустого запроса достаточно.
    answers = {}
    for method, path in sorted(endpoints(settings) - PUBLIC):
        url = re.sub(r"\{[^}]+\}", str(uuid.uuid4()), path)
        answers[method, path] = (await client.request(method, url)).status_code

    assert {endpoint: code for endpoint, code in answers.items() if code != 401} == {}
