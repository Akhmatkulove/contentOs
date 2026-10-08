"""add shoots

Revision ID: f8f12d5bb9b9
Revises: d7a2b4e81c06
Create Date: 2026-10-08 17:03:00.782461

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f8f12d5bb9b9"
down_revision: str | Sequence[str] | None = "d7a2b4e81c06"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "shoots",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("art_director_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=False),
        sa.Column("location", sa.String(length=300), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["art_director_id"],
            ["users.id"],
            name=op.f("fk_shoots_art_director_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_shoots")),
    )
    op.create_index(op.f("ix_shoots_art_director_id"), "shoots", ["art_director_id"], unique=False)
    op.create_table(
        "shoot_deliverables",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("shoot_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "to_shoot",
                "in_progress",
                "needs_changes",
                "approved",
                name="shoot_deliverable_status",
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
            ["product_id"],
            ["products.id"],
            name=op.f("fk_shoot_deliverables_product_id_products"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["shoot_id"],
            ["shoots.id"],
            name=op.f("fk_shoot_deliverables_shoot_id_shoots"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_shoot_deliverables")),
    )
    op.create_index(
        op.f("ix_shoot_deliverables_product_id"), "shoot_deliverables", ["product_id"], unique=False
    )
    op.create_index(
        op.f("ix_shoot_deliverables_shoot_id"), "shoot_deliverables", ["shoot_id"], unique=False
    )
    op.create_table(
        "shoot_members",
        sa.Column("shoot_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "creator",
                "mobilographer",
                name="shoot_role",
                native_enum=False,
                create_constraint=True,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["shoot_id"],
            ["shoots.id"],
            name=op.f("fk_shoot_members_shoot_id_shoots"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_shoot_members_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("shoot_id", "user_id", name=op.f("pk_shoot_members")),
    )
    op.create_index(op.f("ix_shoot_members_user_id"), "shoot_members", ["user_id"], unique=False)
    op.create_table(
        "shoot_products",
        sa.Column("shoot_id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name=op.f("fk_shoot_products_product_id_products"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["shoot_id"],
            ["shoots.id"],
            name=op.f("fk_shoot_products_shoot_id_shoots"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("shoot_id", "product_id", name=op.f("pk_shoot_products")),
    )
    op.create_index(
        op.f("ix_shoot_products_product_id"), "shoot_products", ["product_id"], unique=False
    )
    op.create_table(
        "shoot_deliverable_assignees",
        sa.Column("deliverable_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["deliverable_id"],
            ["shoot_deliverables.id"],
            name=op.f("fk_shoot_deliverable_assignees_deliverable_id_shoot_deliverables"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_shoot_deliverable_assignees_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "deliverable_id", "user_id", name=op.f("pk_shoot_deliverable_assignees")
        ),
    )
    op.create_index(
        op.f("ix_shoot_deliverable_assignees_user_id"),
        "shoot_deliverable_assignees",
        ["user_id"],
        unique=False,
    )
    op.create_table(
        "shoot_deliverable_references",
        sa.Column("deliverable_id", sa.Uuid(), nullable=False),
        sa.Column("reference_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["deliverable_id"],
            ["shoot_deliverables.id"],
            name=op.f("fk_shoot_deliverable_references_deliverable_id_shoot_deliverables"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["reference_id"],
            ["references.id"],
            name=op.f("fk_shoot_deliverable_references_reference_id_references"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint(
            "deliverable_id", "reference_id", name=op.f("pk_shoot_deliverable_references")
        ),
    )
    op.create_index(
        op.f("ix_shoot_deliverable_references_reference_id"),
        "shoot_deliverable_references",
        ["reference_id"],
        unique=False,
    )
    op.create_table(
        "shoot_references",
        sa.Column("shoot_id", sa.Uuid(), nullable=False),
        sa.Column("reference_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["reference_id"],
            ["references.id"],
            name=op.f("fk_shoot_references_reference_id_references"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["shoot_id"],
            ["shoots.id"],
            name=op.f("fk_shoot_references_shoot_id_shoots"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("shoot_id", "reference_id", name=op.f("pk_shoot_references")),
    )
    op.create_index(
        op.f("ix_shoot_references_reference_id"), "shoot_references", ["reference_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_shoot_references_reference_id"), table_name="shoot_references")
    op.drop_table("shoot_references")
    op.drop_index(
        op.f("ix_shoot_deliverable_references_reference_id"),
        table_name="shoot_deliverable_references",
    )
    op.drop_table("shoot_deliverable_references")
    op.drop_index(
        op.f("ix_shoot_deliverable_assignees_user_id"), table_name="shoot_deliverable_assignees"
    )
    op.drop_table("shoot_deliverable_assignees")
    op.drop_index(op.f("ix_shoot_products_product_id"), table_name="shoot_products")
    op.drop_table("shoot_products")
    op.drop_index(op.f("ix_shoot_members_user_id"), table_name="shoot_members")
    op.drop_table("shoot_members")
    op.drop_index(op.f("ix_shoot_deliverables_shoot_id"), table_name="shoot_deliverables")
    op.drop_index(op.f("ix_shoot_deliverables_product_id"), table_name="shoot_deliverables")
    op.drop_table("shoot_deliverables")
    op.drop_index(op.f("ix_shoots_art_director_id"), table_name="shoots")
    op.drop_table("shoots")
