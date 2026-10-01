from functools import lru_cache
from typing import Annotated, Literal

from fastapi import Depends, Request
from pydantic import PostgresDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["local", "test", "production"] = "local"
    database_url: PostgresDsn
    # Адрес фронта: туда возвращаем после входа через Google. API доступен под ним же (/api).
    app_url: str = "http://localhost:5173"
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

    # Вход через Google. Без них кнопка входа отвечает 404.
    google_client_id: str | None = None
    google_client_secret: SecretStr | None = None

    # S3-совместимое хранилище файлов: локально MinIO из compose.yaml.
    # Без бакета загрузка файлов отвечает 404.
    s3_endpoint_url: str | None = None  # None — сам AWS S3
    s3_region: str = "us-east-1"
    s3_access_key: SecretStr | None = None
    s3_secret_key: SecretStr | None = None
    s3_bucket: str | None = None
    # Откуда браузер читает публичные файлы (аватары): адрес бакета или CDN перед ним.
    s3_public_url: str | None = None

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
