"""content sent notifications

Revision ID: f3cbd546b4a9
Revises: 2477aedb8c35
Create Date: 2026-10-20 04:38:02.419342

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f3cbd546b4a9"
down_revision: str | Sequence[str] | None = "2477aedb8c35"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Уведомление бренду «заказ готов» (docs/adr/0025): новый тип и отправленный deliverable.
    op.drop_constraint(op.f("ck_notifications_notification_type"), "notifications", type_="check")
    op.create_check_constraint(
        op.f("ck_notifications_notification_type"),
        "notifications",
        "type IN ('deliverables_assigned', 'content_sent')",
    )
    op.add_column("notifications", sa.Column("deliverable_id", sa.Uuid(), nullable=True))
    op.create_index(
        op.f("ix_notifications_deliverable_id"), "notifications", ["deliverable_id"], unique=False
    )
    op.create_foreign_key(
        op.f("fk_notifications_deliverable_id_shoot_deliverables"),
        "notifications",
        "shoot_deliverables",
        ["deliverable_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.execute("DELETE FROM notifications WHERE type = 'content_sent'")
    op.drop_constraint(
        op.f("fk_notifications_deliverable_id_shoot_deliverables"),
        "notifications",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_notifications_deliverable_id"), table_name="notifications")
    op.drop_column("notifications", "deliverable_id")
    op.drop_constraint(op.f("ck_notifications_notification_type"), "notifications", type_="check")
    op.create_check_constraint(
        op.f("ck_notifications_notification_type"),
        "notifications",
        "type IN ('deliverables_assigned')",
    )
