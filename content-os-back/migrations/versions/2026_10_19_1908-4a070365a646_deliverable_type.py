"""deliverable type

Revision ID: 4a070365a646
Revises: d5abd2d7230c
Create Date: 2026-10-19 19:08:55.714438

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "4a070365a646"
down_revision: str | Sequence[str] | None = "d5abd2d7230c"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Существующие deliverables становятся видео; новые всегда приходят с типом.
    for table, name in (
        ("deliverables", "deliverable_type"),
        ("shoot_deliverables", "shoot_deliverable_type"),
    ):
        op.add_column(
            table,
            sa.Column(
                "type",
                sa.Enum(
                    "video",
                    "image",
                    name=name,
                    native_enum=False,
                    create_constraint=True,
                    length=32,
                ),
                nullable=False,
                server_default="video",
            ),
        )
        op.alter_column(table, "type", server_default=None)


def downgrade() -> None:
    op.drop_column("shoot_deliverables", "type")
    op.drop_column("deliverables", "type")
