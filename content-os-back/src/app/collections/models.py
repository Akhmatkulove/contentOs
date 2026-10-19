import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Collection(Base):
    """Коллекция продуктов и референсов (docs/adr/0014).

    Владелец — тот, кто её создал. Её видит он и его команда по связкам: коллекцию
    бренда — его арт-директора и их креаторы, коллекцию арт-директора — его креаторы.
    """

    __tablename__ = "collections"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.clock_timestamp()
    )


# Одно имя у владельца — одна коллекция, без учёта регистра. Индекс по выражению:
# имя пишется вручную, NAMING_CONVENTION его не выводит.
Index(
    "uq_collections_owner_id_lower_name",
    Collection.owner_id,
    func.lower(Collection.name),
    unique=True,
)
