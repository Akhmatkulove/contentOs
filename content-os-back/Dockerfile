FROM python:3.13-slim AS builder
COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0
WORKDIR /app

# Сначала только зависимости: слой кешируется, пока не меняется uv.lock.
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project --no-cache

COPY . .
RUN uv sync --locked --no-dev --no-editable --no-cache


FROM python:3.13-slim
RUN groupadd --system app && useradd --system --gid app --no-create-home app
WORKDIR /app

COPY --from=builder --chown=app:app /app/.venv /app/.venv
COPY --chown=app:app alembic.ini ./
COPY --chown=app:app migrations ./migrations

# FORWARDED_ALLOW_IPS: адрес клиента — из X-Forwarded-For, который дописал reverse proxy
# из частной сети Docker (rate limit по IP, см. CLAUDE.md). Не "*": тогда uvicorn берёт
# самый левый адрес, а его присылает сам клиент.
# UVICORN_TIMEOUT_KEEP_ALIVE дольше простоя соединений у прокси (Traefik — 90 с): иначе
# прокси шлёт запрос в соединение, которое uvicorn уже закрыл, и отвечает 502.
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    FORWARDED_ALLOW_IPS="10.0.0.0/8,172.16.0.0/12,192.168.0.0/16" \
    UVICORN_TIMEOUT_KEEP_ALIVE=100
USER app
EXPOSE 8000

# Миграции перед стартом: деплой — это просто перезапуск контейнера. Один экземпляр API,
# поэтому гонки двух alembic за схему нет. exec — сигналы остановки идут прямо uvicorn.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8000"]
