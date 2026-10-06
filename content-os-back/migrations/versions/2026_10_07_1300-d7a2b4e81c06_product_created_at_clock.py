"""product created_at: clock_timestamp

Продукты, созданные одной транзакцией, получают разное время: сортировка
«новые первыми» однозначна (docs/adr/0005).

Revision ID: d7a2b4e81c06
Revises: c51e0d9a7f3b
Create Date: 2026-10-07 13:00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d7a2b4e81c06"
down_revision: str | Sequence[str] | None = "c51e0d9a7f3b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("products", "created_at", server_default=sa.text("clock_timestamp()"))


def downgrade() -> None:
    op.alter_column("products", "created_at", server_default=sa.text("now()"))
