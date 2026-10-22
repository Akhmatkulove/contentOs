from functools import lru_cache
from typing import Annotated, Literal

from fastapi import Depends, Request
from pydantic import PostgresDsn, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: Literal["local", "test", "production"] = "local"
    database_url: PostgresDsn
    # Адрес фронта: туда возвращаем после входа через Google.
    app_url: str = "http://localhost:5173"
    # Адрес API для браузера, если он не под APP_URL (свой поддомен): туда Google
    # возвращает после входа. None — API под APP_URL (/api), как локально через vite proxy.
    api_url: str | None = None
    # Origin'ы фронта: им открыт CORS с cookie, только с них принимаются изменяющие
    # запросы (защита от CSRF).
    allowed_origins: list[str] = ["http://localhost:5173"]
    session_ttl_days: int = 30
    # Сессия админа короче и не продлевается: вход раз в рабочий день.
    admin_session_ttl_hours: int = 12

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

    # Подсказки адресов (API Геосаджеста Яндекс Карт). Без ключа поиск адреса отвечает 404.
    yandex_geosuggest_api_key: SecretStr | None = None

    # S3-совместимое хранилище файлов: локально MinIO из compose.yaml.
    # Без бакета загрузка файлов отвечает 404.
    s3_endpoint_url: str | None = None  # None — сам AWS S3
    s3_region: str = "us-east-1"
    s3_access_key: SecretStr | None = None
    s3_secret_key: SecretStr | None = None
    s3_bucket: str | None = None
    # Отдельный публичный бакет для avatars/ (R2 открывает на чтение только бакет целиком).
    # None — avatars/ лежат в S3_BUCKET, как в MinIO, где публичен один префикс.
    s3_public_bucket: str | None = None
    # Откуда браузер читает публичные файлы (аватары): адрес публичного бакета или CDN перед ним.
    s3_public_url: str | None = None
    # Адрес хранилища для браузера в presigned URL приватных файлов, если API ходит
    # в хранилище по внутреннему адресу (в compose: http://minio:9000). None — S3_ENDPOINT_URL.
    s3_presign_endpoint_url: str | None = None

    @property
    def public_api_url(self) -> str:
        return self.api_url or self.app_url

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
