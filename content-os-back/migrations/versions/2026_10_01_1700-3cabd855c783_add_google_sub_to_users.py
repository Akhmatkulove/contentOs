"""add google sub to users

Revision ID: 3cabd855c783
Revises: 109882ba7255
Create Date: 2026-10-01 17:00:12.061940

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "3cabd855c783"
down_revision: str | Sequence[str] | None = "109882ba7255"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("google_sub", sa.String(length=255), nullable=True))
    op.create_unique_constraint(op.f("uq_users_google_sub"), "users", ["google_sub"])


def downgrade() -> None:
    op.drop_constraint(op.f("uq_users_google_sub"), "users", type_="unique")
    op.drop_column("users", "google_sub")
