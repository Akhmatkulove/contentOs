"""derived product deliverable status

Revision ID: 04d0fdbadc05
Revises: 933f0f7741c9
Create Date: 2026-10-20 01:49:00.791099

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "04d0fdbadc05"
down_revision: str | Sequence[str] | None = "933f0f7741c9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Статус заказа выводится из deliverables съёмок (docs/adr/0018); выбранный
    # брендом вручную больше не хранится.
    op.drop_column("deliverables", "status")


def downgrade() -> None:
    op.add_column(
        "deliverables",
        sa.Column(
            "status",
            sa.Enum(
                "to_shoot",
                "in_progress",
                "needs_review",
                "needs_changes",
                "approved",
                name="deliverable_status",
                native_enum=False,
                create_constraint=True,
                length=32,
            ),
            nullable=False,
            server_default="to_shoot",
        ),
    )
    op.alter_column("deliverables", "status", server_default=None)
    # Тот же вывод, что в app.shoots.product_deliverables.derived.
    op.execute(
        """
        UPDATE deliverables AS d
        SET status = derived.status
        FROM (
            SELECT product_deliverable_id, CASE
                WHEN bool_or(status = 'approved') THEN 'approved'
                WHEN bool_or(status = 'needs_review') THEN 'needs_review'
                WHEN bool_or(status = 'needs_changes') THEN 'needs_changes'
                WHEN bool_or(status <> 'to_shoot') THEN 'in_progress'
                ELSE 'to_shoot'
            END AS status
            FROM shoot_deliverables
            WHERE product_deliverable_id IS NOT NULL
            GROUP BY product_deliverable_id
        ) AS derived
        WHERE derived.product_deliverable_id = d.id
        """
    )
