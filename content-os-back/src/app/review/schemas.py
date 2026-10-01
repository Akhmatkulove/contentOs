from pydantic import BaseModel, EmailStr, Field

from app.review.notifier import Decision

# Только нужные поля Telegram Update, остальное pydantic отбрасывает.


class TelegramUser(BaseModel):
    id: int


class TelegramChat(BaseModel):
    id: int


class TelegramMessage(BaseModel):
    message_id: int
    chat: TelegramChat


class TelegramCallbackQuery(BaseModel):
    id: str
    sender: TelegramUser = Field(alias="from")
    message: TelegramMessage | None = None
    data: str | None = None


class TelegramUpdate(BaseModel):
    update_id: int
    callback_query: TelegramCallbackQuery | None = None


class DevReviewRequest(BaseModel):
    email: EmailStr
    decision: Decision
