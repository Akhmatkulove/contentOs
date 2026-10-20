"""Подсказки адресов: API Геосаджеста Яндекс Карт, только Узбекистан."""

import logging
from typing import Annotated, Any

import httpx
from fastapi import Depends, HTTPException, Request, status

from app.core.config import Settings
from app.locations.schemas import LocationSuggestion

SUGGEST_URL = "https://suggest-maps.yandex.ru/v1/suggest"
COUNTRY_CODE = "uz"
# Название страны в ответе при lang=ru: им проверяем, что Яндекс не подмешал соседей.
COUNTRY_NAME = "Узбекистан"
MAX_RESULTS = 7

# httpx на уровне INFO пишет URL каждого запроса, а ключ Геосаджеста передаётся в URL.
logging.getLogger("httpx").setLevel(logging.WARNING)


class GeosuggestError(Exception):
    pass


def _country(item: dict[str, Any]) -> str | None:
    components = (item.get("address") or {}).get("component") or []
    for component in components:
        if "COUNTRY" in (component.get("kind") or []):
            return str(component.get("name"))
    return None


def _suggestion(item: dict[str, Any]) -> LocationSuggestion | None:
    title = (item.get("title") or {}).get("text")
    if not title:
        return None
    subtitle = (item.get("subtitle") or {}).get("text") or None
    address = (item.get("address") or {}).get("formatted_address") or (
        f"{title}, {subtitle}" if subtitle else title
    )
    return LocationSuggestion(title=title, subtitle=subtitle, address=address)


def parse_results(body: dict[str, Any]) -> list[LocationSuggestion]:
    """Подсказки из ответа Яндекса. Объекты другой страны отбрасываются, если
    Яндекс их всё же вернул; объекты без страны в адресе (организации) остаются."""
    suggestions = []
    for item in body.get("results") or []:
        country = _country(item)
        if country is not None and country != COUNTRY_NAME:
            continue
        if suggestion := _suggestion(item):
            suggestions.append(suggestion)
    return suggestions


class Geosuggest:
    def __init__(self, api_key: str, transport: httpx.AsyncBaseTransport | None = None) -> None:
        self._api_key = api_key
        # Один клиент на приложение: подсказки идут на каждый ввод, и соединение с
        # Яндексом переиспользуется, а не открывается заново (TLS) на каждый запрос.
        # transport подставляют тесты (httpx.MockTransport).
        self._client = httpx.AsyncClient(timeout=5, transport=transport)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def suggest(self, text: str) -> list[LocationSuggestion]:
        try:
            response = await self._client.get(
                SUGGEST_URL,
                params={
                    "apikey": self._api_key,
                    "text": text,
                    "lang": "ru",
                    "countries": COUNTRY_CODE,
                    "print_address": 1,
                    "results": MAX_RESULTS,
                },
            )
            response.raise_for_status()
            body = response.json()
        except httpx.HTTPError:
            # Без цепочки: в тексте ошибки httpx URL запроса, а в URL ключ — он попал бы в лог.
            raise GeosuggestError("Geosuggest request failed") from None
        except ValueError as exc:
            raise GeosuggestError("Geosuggest returned invalid JSON") from exc
        if not isinstance(body, dict):
            raise GeosuggestError("Geosuggest returned an unexpected body")
        return parse_results(body)


def build_geosuggest(settings: Settings) -> Geosuggest | None:
    if settings.yandex_geosuggest_api_key is None:
        return None
    return Geosuggest(settings.yandex_geosuggest_api_key.get_secret_value())


def get_geosuggest(request: Request) -> Geosuggest:
    geosuggest: Geosuggest | None = request.app.state.geosuggest
    if geosuggest is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Location search is not configured")
    return geosuggest


GeosuggestDep = Annotated[Geosuggest, Depends(get_geosuggest)]
