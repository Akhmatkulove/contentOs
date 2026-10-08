"""deliverable needs review status

Revision ID: 1f164dab9dd5
Revises: f8f12d5bb9b9
Create Date: 2026-10-08 19:30:03.130171

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "1f164dab9dd5"
down_revision: str | Sequence[str] | None = "f8f12d5bb9b9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# The status CHECK of both deliverable tables (string_enum, docs/adr/0009).
TABLES = {
    "deliverables": "ck_deliverables_deliverable_status",
    "shoot_deliverables": "ck_shoot_deliverables_shoot_deliverable_status",
}
OLD = ("to_shoot", "in_progress", "needs_changes", "approved")
NEW = ("to_shoot", "in_progress", "needs_review", "needs_changes", "approved")


def _set_statuses(statuses: tuple[str, ...]) -> None:
    values = ", ".join(f"'{status}'" for status in statuses)
    for table, constraint in TABLES.items():
        op.drop_constraint(op.f(constraint), table, type_="check")
        op.create_check_constraint(op.f(constraint), table, f"status IN ({values})")


def upgrade() -> None:
    _set_statuses(NEW)


def downgrade() -> None:
    # Work waiting for review goes back to "in progress".
    for table in TABLES:
        rows = sa.table(table, sa.column("status"))
        op.execute(
            rows.update().where(rows.c.status == "needs_review").values(status="in_progress")
        )
    _set_statuses(OLD)
