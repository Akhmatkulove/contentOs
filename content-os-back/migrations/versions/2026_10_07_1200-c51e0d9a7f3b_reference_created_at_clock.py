"""reference created_at: clock_timestamp

Референсы, созданные одной транзакцией, получают разное время и сохраняют
порядок создания (docs/adr/0005).

Revision ID: c51e0d9a7f3b
Revises: a34e20fc497b
Create Date: 2026-10-07 12:00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "c51e0d9a7f3b"
down_revision: str | Sequence[str] | None = "a34e20fc497b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column("references", "created_at", server_default=sa.text("clock_timestamp()"))


def downgrade() -> None:
    op.alter_column("references", "created_at", server_default=sa.text("now()"))
