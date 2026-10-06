"""add reference favorites

Revision ID: a34e20fc497b
Revises: b89f0c632213
Create Date: 2026-10-06 19:16:36.815596

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "a34e20fc497b"
down_revision: str | Sequence[str] | None = "b89f0c632213"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reference_favorites",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("reference_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["reference_id"],
            ["references.id"],
            name=op.f("fk_reference_favorites_reference_id_references"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_reference_favorites_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "reference_id", name=op.f("pk_reference_favorites")),
    )
    op.create_index(
        op.f("ix_reference_favorites_reference_id"),
        "reference_favorites",
        ["reference_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_reference_favorites_reference_id"), table_name="reference_favorites")
    op.drop_table("reference_favorites")
