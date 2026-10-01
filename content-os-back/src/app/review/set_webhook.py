"""Регистрирует webhook бота: `uv run python -m app.review.set_webhook https://<домен>`.

Запускается один раз на окружение (и при смене домена или секрета).
Локально домен даёт туннель: ngrok, cloudflared.
"""

import asyncio
import sys

import httpx

from app.core.config import get_settings


async def main(base_url: str) -> None:
    settings = get_settings()
    if settings.telegram_bot_token is None or settings.telegram_webhook_secret is None:
        sys.exit("Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_WEBHOOK_SECRET")

    token = settings.telegram_bot_token.get_secret_value()
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            f"https://api.telegram.org/bot{token}/setWebhook",
            json={
                "url": f"{base_url.rstrip('/')}/api/telegram/webhook",
                "secret_token": settings.telegram_webhook_secret.get_secret_value(),
                "allowed_updates": ["callback_query"],
            },
        )
    sys.stdout.write(f"{response.json()}\n")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    asyncio.run(main(sys.argv[1]))
