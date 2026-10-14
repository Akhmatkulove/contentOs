"""pending uploads

Revision ID: d5abd2d7230c
Revises: 4a01d73eaf36
Create Date: 2026-10-14 16:00:32.341419

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "d5abd2d7230c"
down_revision: str | Sequence[str] | None = "4a01d73eaf36"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "files", sa.Column("pending", sa.Boolean(), server_default=sa.text("false"), nullable=False)
    )


def downgrade() -> None:
    # Без флага непроверенная загрузка выглядела бы готовым файлом; объекты uploads/…
    # в хранилище останутся мусором.
    op.execute("DELETE FROM files WHERE pending")
    op.drop_column("files", "pending")
