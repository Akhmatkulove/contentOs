"""content items

Revision ID: 2477aedb8c35
Revises: 50a52c82c288
Create Date: 2026-10-20 04:17:59.153460

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "2477aedb8c35"
down_revision: str | Sequence[str] | None = "50a52c82c288"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Файлы, отправленные бренду (docs/adr/0025).
    op.create_table(
        "content_items",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=False),
        sa.Column("deliverable_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "new",
                "approved",
                name="content_status",
                native_enum=False,
                create_constraint=True,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["author_id"],
            ["users.id"],
            name=op.f("fk_content_items_author_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["deliverable_id"],
            ["shoot_deliverables.id"],
            name=op.f("fk_content_items_deliverable_id_shoot_deliverables"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["file_id"],
            ["files.id"],
            name=op.f("fk_content_items_file_id_files"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_content_items")),
        sa.UniqueConstraint("file_id", name=op.f("uq_content_items_file_id")),
    )
    op.create_index(
        op.f("ix_content_items_author_id"), "content_items", ["author_id"], unique=False
    )
    op.create_index(
        op.f("ix_content_items_deliverable_id"), "content_items", ["deliverable_id"], unique=False
    )
    # Уже отправленные deliverables: файлы одобренных версий их исполнителей.
    op.execute(
        """
        INSERT INTO content_items (id, file_id, deliverable_id, name, author_id,
                                   position, status, created_at)
        SELECT gen_random_uuid(), f.file_id, v.deliverable_id, d.name, v.author_id,
               row_number() OVER (
                   PARTITION BY v.deliverable_id ORDER BY a.position, f.position
               ) - 1,
               -- Время отправки не хранилось: последнее решение по deliverable.
               'new', coalesce(max(v.reviewed_at) OVER (PARTITION BY v.deliverable_id), now())
        FROM task_version_files f
        JOIN task_versions v ON v.id = f.version_id
        JOIN shoot_deliverables d ON d.id = v.deliverable_id
        JOIN shoot_deliverable_assignees a
          ON a.deliverable_id = v.deliverable_id AND a.user_id = v.author_id
        WHERE d.status = 'approved' AND v.review = 'approved'
        """
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_content_items_deliverable_id"), table_name="content_items")
    op.drop_index(op.f("ix_content_items_author_id"), table_name="content_items")
    op.drop_table("content_items")
