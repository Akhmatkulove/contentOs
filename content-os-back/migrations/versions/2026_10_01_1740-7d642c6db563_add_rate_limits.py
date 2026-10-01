"""add rate limits

Revision ID: 7d642c6db563
Revises: daefaffb2b6f
Create Date: 2026-10-01 17:40:30.947355

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "7d642c6db563"
down_revision: str | Sequence[str] | None = "daefaffb2b6f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "rate_limits",
        sa.Column("key", sa.String(length=400), nullable=False),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("hits", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("key", name=op.f("pk_rate_limits")),
    )


def downgrade() -> None:
    op.drop_table("rate_limits")
