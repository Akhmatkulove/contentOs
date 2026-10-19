"""shoot member responsibilities

Revision ID: 50a52c82c288
Revises: 4c0f0cfd7ef1
Create Date: 2026-10-20 03:19:47.857226

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "50a52c82c288"
down_revision: str | Sequence[str] | None = "4c0f0cfd7ef1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Responsibilities участника на вкладке Team съёмки.
    op.add_column("shoot_members", sa.Column("responsibilities", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("shoot_members", "responsibilities")
