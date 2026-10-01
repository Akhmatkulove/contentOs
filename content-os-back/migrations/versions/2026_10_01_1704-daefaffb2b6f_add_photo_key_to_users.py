"""add photo key to users

Revision ID: daefaffb2b6f
Revises: 3cabd855c783
Create Date: 2026-10-01 17:04:34.445202

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "daefaffb2b6f"
down_revision: str | Sequence[str] | None = "3cabd855c783"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("photo_key", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "photo_key")
