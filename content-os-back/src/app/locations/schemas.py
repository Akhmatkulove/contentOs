from pydantic import BaseModel


class LocationSuggestion(BaseModel):
    # Как в подсказке Яндекса: «Ташкент Сити Молл» и «улица Фурката, 6/1, Ташкент».
    title: str
    subtitle: str | None
    # Полный адрес одной строкой: его фронт и сохраняет в съёмку.
    address: str
