"""add task versions

Revision ID: 4a01d73eaf36
Revises: 7e05e4b2f6b3
Create Date: 2026-10-14 15:17:47.125252

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "4a01d73eaf36"
down_revision: str | Sequence[str] | None = "7e05e4b2f6b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "task_versions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deliverable_id", sa.Uuid(), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=100), nullable=True),
        sa.Column("author_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["author_id"],
            ["users.id"],
            name=op.f("fk_task_versions_author_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["deliverable_id"],
            ["shoot_deliverables.id"],
            name=op.f("fk_task_versions_deliverable_id_shoot_deliverables"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_task_versions")),
        sa.UniqueConstraint(
            "deliverable_id", "number", name=op.f("uq_task_versions_deliverable_id_number")
        ),
    )
    op.create_index(
        op.f("ix_task_versions_deliverable_id"), "task_versions", ["deliverable_id"], unique=False
    )
    op.create_table(
        "task_version_files",
        sa.Column("version_id", sa.Uuid(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["file_id"],
            ["files.id"],
            name=op.f("fk_task_version_files_file_id_files"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["version_id"],
            ["task_versions.id"],
            name=op.f("fk_task_version_files_version_id_task_versions"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("version_id", "file_id", name=op.f("pk_task_version_files")),
        sa.UniqueConstraint("file_id", name=op.f("uq_task_version_files_file_id")),
    )
    op.add_column("files", sa.Column("name", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("files", "name")
    op.drop_table("task_version_files")
    op.drop_index(op.f("ix_task_versions_deliverable_id"), table_name="task_versions")
    op.drop_table("task_versions")
