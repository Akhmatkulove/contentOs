"""add review messages

Revision ID: 109882ba7255
Revises: 6566d6ab2e4e
Create Date: 2026-10-01 16:54:43.156159

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "109882ba7255"
down_revision: str | Sequence[str] | None = "6566d6ab2e4e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "review_messages",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("message_id", sa.BigInteger(), nullable=False),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_review_messages_user_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("user_id", name=op.f("pk_review_messages")),
    )


def downgrade() -> None:
    op.drop_table("review_messages")
