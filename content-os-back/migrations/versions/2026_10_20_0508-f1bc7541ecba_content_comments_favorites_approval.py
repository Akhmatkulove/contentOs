"""content comments favorites approval

Revision ID: f1bc7541ecba
Revises: f3cbd546b4a9
Create Date: 2026-10-20 05:08:16.118368

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "f1bc7541ecba"
down_revision: str | Sequence[str] | None = "f3cbd546b4a9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

NEW_TYPES = ("content_commented", "content_approved")


def _notification_types(*types: str) -> None:
    op.drop_constraint(op.f("ck_notifications_notification_type"), "notifications", type_="check")
    listed = ", ".join(f"'{type_}'" for type_ in types)
    op.create_check_constraint(
        op.f("ck_notifications_notification_type"), "notifications", f"type IN ({listed})"
    )


def upgrade() -> None:
    # Страница контента (docs/adr/0026): комментарии, избранное бренда, одобрение.
    op.create_table(
        "content_comments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("deliverable_id", sa.Uuid(), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["author_id"],
            ["users.id"],
            name=op.f("fk_content_comments_author_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["deliverable_id"],
            ["shoot_deliverables.id"],
            name=op.f("fk_content_comments_deliverable_id_shoot_deliverables"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_content_comments")),
    )
    op.create_index(
        op.f("ix_content_comments_deliverable_id"),
        "content_comments",
        ["deliverable_id"],
        unique=False,
    )
    op.create_table(
        "content_favorites",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("deliverable_id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["deliverable_id"],
            ["shoot_deliverables.id"],
            name=op.f("fk_content_favorites_deliverable_id_shoot_deliverables"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_content_favorites_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", "deliverable_id", name=op.f("pk_content_favorites")),
    )
    op.create_index(
        op.f("ix_content_favorites_deliverable_id"),
        "content_favorites",
        ["deliverable_id"],
        unique=False,
    )
    op.add_column(
        "content_items", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True)
    )
    _notification_types("deliverables_assigned", "content_sent", *NEW_TYPES)


def downgrade() -> None:
    op.execute("DELETE FROM notifications WHERE type IN ('content_commented', 'content_approved')")
    _notification_types("deliverables_assigned", "content_sent")
    op.drop_column("content_items", "approved_at")
    op.drop_index(op.f("ix_content_favorites_deliverable_id"), table_name="content_favorites")
    op.drop_table("content_favorites")
    op.drop_index(op.f("ix_content_comments_deliverable_id"), table_name="content_comments")
    op.drop_table("content_comments")
