from functools import lru_cache
from typing import Annotated, Literal

from fastapi import Depends, Request
from pydantic import PostgresDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["local", "test", "production"] = "local"
    database_url: PostgresDsn
    # Origin'ы, с которых браузер может слать изменяющие запросы (защита от CSRF).
    allowed_origins: list[str] = ["http://localhost:5173"]
    session_ttl_days: int = 30

    # Заявки на проверку. Без этих настроек сообщения не отправляются,
    # а одобрять можно через dev-эндпоинт (не в production).
    telegram_bot_token: SecretStr | None = None
    telegram_webhook_secret: SecretStr | None = None
    # Чат, куда приходят заявки, и единственный, кто может их одобрять.
    telegram_chat_id: int | None = None
    telegram_admin_id: int | None = None

    @property
    def docs_enabled(self) -> bool:
        return self.environment != "production"

    @property
    def dev_endpoints_enabled(self) -> bool:
        return self.environment != "production"

    @property
    def secure_cookies(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def get_app_settings(request: Request) -> Settings:
    """Настройки, с которыми создано приложение (тесты передают свои)."""
    settings: Settings = request.app.state.settings
    return settings


SettingsDep = Annotated[Settings, Depends(get_app_settings)]
