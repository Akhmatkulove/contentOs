"""add admins and brand art directors

Revision ID: dd68e5be1f48
Revises: 7d642c6db563
Create Date: 2026-10-03 20:21:30.943409

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "dd68e5be1f48"
down_revision: str | Sequence[str] | None = "7d642c6db563"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "admin_actions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("admin_id", sa.Uuid(), nullable=False),
        sa.Column(
            "action",
            sa.Enum(
                "assign_art_director",
                "unassign_art_director",
                name="admin_action_type",
                native_enum=False,
                create_constraint=True,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column("brand_id", sa.Uuid(), nullable=True),
        sa.Column("art_director_id", sa.Uuid(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admin_actions")),
    )
    op.create_index(
        op.f("ix_admin_actions_created_at"), "admin_actions", ["created_at"], unique=False
    )
    op.create_table(
        "brand_art_directors",
        sa.Column("brand_id", sa.Uuid(), nullable=False),
        sa.Column("art_director_id", sa.Uuid(), nullable=False),
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
            name=op.f("fk_brand_art_directors_art_director_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["assigned_by"],
            ["users.id"],
            name=op.f("fk_brand_art_directors_assigned_by_users"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["brand_id"],
            ["users.id"],
            name=op.f("fk_brand_art_directors_brand_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("brand_id", "art_director_id", name=op.f("pk_brand_art_directors")),
    )
    op.create_index(
        op.f("ix_brand_art_directors_art_director_id"),
        "brand_art_directors",
        ["art_director_id"],
        unique=False,
    )
    # server_default только для уже существующих строк, дальше значение ставит модель.
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.alter_column("users", "is_admin", server_default=None)
    op.create_check_constraint(
        op.f("ck_users_admin_has_no_role"), "users", "NOT is_admin OR role IS NULL"
    )


def downgrade() -> None:
    op.drop_constraint(op.f("ck_users_admin_has_no_role"), "users", type_="check")
    op.drop_column("users", "is_admin")
    op.drop_index(op.f("ix_brand_art_directors_art_director_id"), table_name="brand_art_directors")
    op.drop_table("brand_art_directors")
    op.drop_index(op.f("ix_admin_actions_created_at"), table_name="admin_actions")
    op.drop_table("admin_actions")
