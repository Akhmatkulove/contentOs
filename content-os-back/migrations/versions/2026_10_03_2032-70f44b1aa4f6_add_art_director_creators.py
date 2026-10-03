"""add art director creators

Revision ID: 70f44b1aa4f6
Revises: dd68e5be1f48
Create Date: 2026-10-03 20:32:39.880756

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

ACTION_CHECK = "ck_admin_actions_admin_action_type"
OLD_ACTIONS = "'assign_art_director', 'unassign_art_director'"
NEW_ACTIONS = f"{OLD_ACTIONS}, 'assign_creator', 'unassign_creator'"

revision: str = "70f44b1aa4f6"
down_revision: str | Sequence[str] | None = "dd68e5be1f48"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "art_director_creators",
        sa.Column("art_director_id", sa.Uuid(), nullable=False),
        sa.Column("creator_id", sa.Uuid(), nullable=False),
        sa.Column("assigned_by", sa.Uuid(), nullable=True),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["art_director_id"],
            ["users.id"],
            name=op.f("fk_art_director_creators_art_director_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["assigned_by"],
            ["users.id"],
            name=op.f("fk_art_director_creators_assigned_by_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["creator_id"],
            ["users.id"],
            name=op.f("fk_art_director_creators_creator_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "art_director_id", "creator_id", name=op.f("pk_art_director_creators")
        ),
    )
    op.create_index(
        op.f("ix_art_director_creators_creator_id"),
        "art_director_creators",
        ["creator_id"],
        unique=False,
    )
    op.add_column("admin_actions", sa.Column("creator_id", sa.Uuid(), nullable=True))
    # Тип действия — VARCHAR + CHECK (string_enum): новые значения добавляются в CHECK.
    op.drop_constraint(op.f(ACTION_CHECK), "admin_actions", type_="check")
    op.create_check_constraint(op.f(ACTION_CHECK), "admin_actions", f"action IN ({NEW_ACTIONS})")


def downgrade() -> None:
    op.execute("DELETE FROM admin_actions WHERE action IN ('assign_creator', 'unassign_creator')")
    op.drop_constraint(op.f(ACTION_CHECK), "admin_actions", type_="check")
    op.create_check_constraint(op.f(ACTION_CHECK), "admin_actions", f"action IN ({OLD_ACTIONS})")
    op.drop_column("admin_actions", "creator_id")
    op.drop_index(op.f("ix_art_director_creators_creator_id"), table_name="art_director_creators")
    op.drop_table("art_director_creators")
