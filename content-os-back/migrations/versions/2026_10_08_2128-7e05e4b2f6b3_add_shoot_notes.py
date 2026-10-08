"""add shoot notes

Revision ID: 7e05e4b2f6b3
Revises: 1f164dab9dd5
Create Date: 2026-10-08 21:28:30.733071

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "7e05e4b2f6b3"
down_revision: str | Sequence[str] | None = "1f164dab9dd5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "shoot_notes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("shoot_id", sa.Uuid(), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column(
            "type",
            sa.Enum(
                "general",
                "creative",
                "logistics",
                "feedback",
                "post_production",
                name="note_type",
                native_enum=False,
                create_constraint=True,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column(
            "visibility",
            sa.Enum(
                "internal",
                "private",
                name="note_visibility",
                native_enum=False,
                create_constraint=True,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("pinned", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["author_id"],
            ["users.id"],
            name=op.f("fk_shoot_notes_author_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["shoot_id"],
            ["shoots.id"],
            name=op.f("fk_shoot_notes_shoot_id_shoots"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_shoot_notes")),
    )
    op.create_index(op.f("ix_shoot_notes_shoot_id"), "shoot_notes", ["shoot_id"], unique=False)
    op.create_table(
        "shoot_note_assignees",
        sa.Column("note_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["note_id"],
            ["shoot_notes.id"],
            name=op.f("fk_shoot_note_assignees_note_id_shoot_notes"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_shoot_note_assignees_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("note_id", "user_id", name=op.f("pk_shoot_note_assignees")),
    )
    op.create_index(
        op.f("ix_shoot_note_assignees_user_id"), "shoot_note_assignees", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_shoot_note_assignees_user_id"), table_name="shoot_note_assignees")
    op.drop_table("shoot_note_assignees")
    op.drop_index(op.f("ix_shoot_notes_shoot_id"), table_name="shoot_notes")
    op.drop_table("shoot_notes")
