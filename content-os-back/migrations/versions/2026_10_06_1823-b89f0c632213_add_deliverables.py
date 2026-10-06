"""add deliverables

Revision ID: b89f0c632213
Revises: 0f715884f22e
Create Date: 2026-10-06 18:23:23.080725

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b89f0c632213"
down_revision: str | Sequence[str] | None = "0f715884f22e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "deliverables",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("assignee_id", sa.Uuid(), nullable=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("brief", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "to_shoot",
                "in_progress",
                "needs_changes",
                "approved",
                name="deliverable_status",
                native_enum=False,
                create_constraint=True,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["assignee_id"],
            ["users.id"],
            name=op.f("fk_deliverables_assignee_id_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name=op.f("fk_deliverables_product_id_products"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_deliverables")),
    )
    op.create_index(
        op.f("ix_deliverables_assignee_id"), "deliverables", ["assignee_id"], unique=False
    )
    op.create_index(
        op.f("ix_deliverables_product_id"), "deliverables", ["product_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_deliverables_product_id"), table_name="deliverables")
    op.drop_index(op.f("ix_deliverables_assignee_id"), table_name="deliverables")
    op.drop_table("deliverables")
