"""shoot deliverable product deliverable

Revision ID: 933f0f7741c9
Revises: f3c8117a848b
Create Date: 2026-10-20 01:28:58.526737

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "933f0f7741c9"
down_revision: str | Sequence[str] | None = "f3c8117a848b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Какой заказ бренда закрывает deliverable съёмки (docs/adr/0017). У уже
    # созданных связи нет: остаются без заказа, как после его удаления брендом.
    op.add_column(
        "shoot_deliverables", sa.Column("product_deliverable_id", sa.Uuid(), nullable=True)
    )
    op.create_index(
        op.f("ix_shoot_deliverables_product_deliverable_id"),
        "shoot_deliverables",
        ["product_deliverable_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("fk_shoot_deliverables_product_deliverable_id_deliverables"),
        "shoot_deliverables",
        "deliverables",
        ["product_deliverable_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        op.f("fk_shoot_deliverables_product_deliverable_id_deliverables"),
        "shoot_deliverables",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_shoot_deliverables_product_deliverable_id"), table_name="shoot_deliverables"
    )
    op.drop_column("shoot_deliverables", "product_deliverable_id")
