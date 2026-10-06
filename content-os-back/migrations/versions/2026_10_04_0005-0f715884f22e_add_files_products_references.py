"""add files products references

Revision ID: 0f715884f22e
Revises: 70f44b1aa4f6
Create Date: 2026-10-04 00:05:31.983665

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0f715884f22e"
down_revision: str | Sequence[str] | None = "70f44b1aa4f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "files",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column(
            "kind",
            sa.Enum(
                "image",
                "video",
                name="file_kind",
                native_enum=False,
                create_constraint=True,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column("content_type", sa.String(length=100), nullable=False),
        sa.Column("size", sa.BigInteger(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"], ["users.id"], name=op.f("fk_files_owner_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_files")),
        sa.UniqueConstraint("key", name=op.f("uq_files_key")),
    )
    op.create_index(op.f("ix_files_owner_id"), "files", ["owner_id"], unique=False)
    op.create_table(
        "products",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("brand_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("about", sa.Text(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("collection", sa.String(length=100), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("sku", sa.String(length=100), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "active",
                "archived",
                name="product_status",
                native_enum=False,
                create_constraint=True,
                length=32,
            ),
            nullable=False,
        ),
        sa.Column("tags", sa.ARRAY(sa.String(length=50)), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["brand_id"], ["users.id"], name=op.f("fk_products_brand_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_products")),
    )
    op.create_index(op.f("ix_products_brand_id"), "products", ["brand_id"], unique=False)
    op.create_table(
        "product_photos",
        sa.Column("product_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["file_id"],
            ["files.id"],
            name=op.f("fk_product_photos_file_id_files"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name=op.f("fk_product_photos_product_id_products"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("product_id", "position", name=op.f("pk_product_photos")),
        sa.UniqueConstraint("file_id", name=op.f("uq_product_photos_file_id")),
    )
    op.create_table(
        "references",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("product_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column(
            "type",
            sa.Enum(
                "image",
                "video",
                "moodboard",
                name="reference_type",
                native_enum=False,
                create_constraint=True,
                length=32,
            ),
            nullable=True,
        ),
        sa.Column("link", sa.String(length=2048), nullable=True),
        sa.Column("collection", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("tags", sa.ARRAY(sa.String(length=50)), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            name=op.f("fk_references_owner_id_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["products.id"],
            name=op.f("fk_references_product_id_products"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_references")),
    )
    op.create_index(op.f("ix_references_owner_id"), "references", ["owner_id"], unique=False)
    op.create_index(op.f("ix_references_product_id"), "references", ["product_id"], unique=False)
    op.create_table(
        "reference_files",
        sa.Column("reference_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("file_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(
            ["file_id"],
            ["files.id"],
            name=op.f("fk_reference_files_file_id_files"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["reference_id"],
            ["references.id"],
            name=op.f("fk_reference_files_reference_id_references"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("reference_id", "position", name=op.f("pk_reference_files")),
        sa.UniqueConstraint("file_id", name=op.f("uq_reference_files_file_id")),
    )


def downgrade() -> None:
    op.drop_table("reference_files")
    op.drop_index(op.f("ix_references_product_id"), table_name="references")
    op.drop_index(op.f("ix_references_owner_id"), table_name="references")
    op.drop_table("references")
    op.drop_table("product_photos")
    op.drop_index(op.f("ix_products_brand_id"), table_name="products")
    op.drop_table("products")
    op.drop_index(op.f("ix_files_owner_id"), table_name="files")
    op.drop_table("files")
