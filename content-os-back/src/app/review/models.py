import uuid

from sqlalchemy import BigInteger, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class ReviewMessage(Base):
    """Сообщение в Telegram с текущей заявкой пользователя.

    Строка есть, только пока заявка ждёт решения. Кнопки сообщения, которого здесь нет
    (заявку отозвали, уже решили или отправили заново), ничего не меняют.
    """

    __tablename__ = "review_messages"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    message_id: Mapped[int] = mapped_column(BigInteger)
