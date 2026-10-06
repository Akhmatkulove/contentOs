"""Общие типы текстовых полей схем."""

from typing import Annotated

from pydantic import AfterValidator, BeforeValidator, Field, StringConstraints


def _blank_to_none(value: object) -> object:
    # Пустая строка из формы значит «не заполнено».
    if isinstance(value, str):
        return value.strip() or None
    return value


def _unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(values))


ShortText = Annotated[
    Annotated[str, StringConstraints(max_length=100)] | None, BeforeValidator(_blank_to_none)
]
Title = Annotated[
    Annotated[str, StringConstraints(max_length=200)] | None, BeforeValidator(_blank_to_none)
]
LongText = Annotated[
    Annotated[str, StringConstraints(max_length=5000)] | None, BeforeValidator(_blank_to_none)
]
Tag = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
Tags = Annotated[list[Tag], Field(max_length=20), AfterValidator(_unique)]
