from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

import httpx
import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.models import Role
from app.core.config import Settings
from app.core.db import get_session
from app.locations.geosuggest import Geosuggest, get_geosuggest
from app.locations.router import SUGGESTS_PER_USER
from app.main import create_app
from tests.test_products import sign_up

API_KEY = "test-key"


def item(title: str, subtitle: str | None, country: str | None = "Узбекистан") -> dict[str, Any]:
    components = [{"name": country, "kind": ["COUNTRY"]}] if country else []
    result: dict[str, Any] = {
        "title": {"text": title},
        "address": {
            "formatted_address": f"{country}, {subtitle}, {title}" if country else title,
            "component": components,
        },
    }
    if subtitle:
        result["subtitle"] = {"text": subtitle}
    return result


@dataclass
class FakeYandex:
    """Геосаджест, который отдаёт заданные подсказки и запоминает параметры запросов."""

    results: list[dict[str, Any]] = field(
        default_factory=lambda: [item("улица Фурката, 6", "Ташкент")]
    )
    status: int = 200
    requests: list[dict[str, str]] = field(default_factory=list)

    def handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(dict(request.url.params))
        if self.status != 200:
            return httpx.Response(self.status, json={"message": "Invalid api key"})
        return httpx.Response(200, json={"results": self.results})


@pytest.fixture
def yandex() -> FakeYandex:
    return FakeYandex()


@pytest.fixture
async def client(
    settings: Settings, db_session: AsyncSession, yandex: FakeYandex
) -> AsyncIterator[AsyncClient]:
    """Одобренный арт-директор; Геосаджест настроен и подменён."""
    app = create_app(settings.model_copy(update={"yandex_geosuggest_api_key": SecretStr(API_KEY)}))
    app.dependency_overrides[get_session] = lambda: db_session
    geosuggest = Geosuggest(API_KEY, transport=httpx.MockTransport(yandex.handle))
    app.dependency_overrides[get_geosuggest] = lambda: geosuggest
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await sign_up(client, db_session, "ad@example.com", Role.ART_DIRECTOR, "Risolat")
        yield client
    await geosuggest.aclose()


async def test_suggests_addresses_in_uzbekistan(client: AsyncClient, yandex: FakeYandex) -> None:
    response = await client.get("/api/locations/suggest", params={"q": "  Фурката "})

    assert response.status_code == 200
    assert response.json() == [
        {
            "title": "улица Фурката, 6",
            "subtitle": "Ташкент",
            "address": "Узбекистан, Ташкент, улица Фурката, 6",
        }
    ]
    [params] = yandex.requests
    assert params["text"] == "Фурката"
    assert params["countries"] == "uz"
    assert params["lang"] == "ru"
    assert params["apikey"] == API_KEY


async def test_drops_places_outside_uzbekistan(client: AsyncClient, yandex: FakeYandex) -> None:
    yandex.results = [
        item("Чиланзар", "Ташкент"),
        item("Алматы", "Казахстан", country="Казахстан"),
        # Организация без страны в адресе остаётся.
        item("White Studio", None, country=None),
    ]

    response = await client.get("/api/locations/suggest", params={"q": "ст"})

    assert [s["title"] for s in response.json()] == ["Чиланзар", "White Studio"]
    assert response.json()[1] == {
        "title": "White Studio",
        "subtitle": None,
        "address": "White Studio",
    }


async def test_short_query_does_not_reach_yandex(client: AsyncClient, yandex: FakeYandex) -> None:
    for q in ("", " ", "Т"):
        response = await client.get("/api/locations/suggest", params={"q": q})
        assert response.status_code == 200
        assert response.json() == []
    assert yandex.requests == []


async def test_yandex_failure_is_a_bad_gateway(client: AsyncClient, yandex: FakeYandex) -> None:
    yandex.status = 403

    response = await client.get("/api/locations/suggest", params={"q": "Ташкент"})

    assert response.status_code == 502
    assert response.json() == {"detail": "Location search is unavailable"}
    assert API_KEY not in response.text


async def test_suggests_are_rate_limited_per_user(client: AsyncClient, yandex: FakeYandex) -> None:
    for _ in range(SUGGESTS_PER_USER):
        assert (await client.get("/api/locations/suggest", params={"q": "Таш"})).status_code == 200

    response = await client.get("/api/locations/suggest", params={"q": "Таш"})

    assert response.status_code == 429
    assert len(yandex.requests) == SUGGESTS_PER_USER


async def test_not_configured_answers_404(settings: Settings, db_session: AsyncSession) -> None:
    app = create_app(settings)
    app.dependency_overrides[get_session] = lambda: db_session
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        await sign_up(client, db_session, "ad@example.com", Role.ART_DIRECTOR, "Risolat")
        response = await client.get("/api/locations/suggest", params={"q": "Ташкент"})

    assert response.status_code == 404
