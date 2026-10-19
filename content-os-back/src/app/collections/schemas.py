import uuid

from pydantic import BaseModel


class CollectionOption(BaseModel):
    """Коллекция в списке поля Collection."""

    id: uuid.UUID
    name: str
