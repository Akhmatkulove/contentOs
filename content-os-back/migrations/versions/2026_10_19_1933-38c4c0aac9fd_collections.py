"""collections

Revision ID: 38c4c0aac9fd
Revises: 4a070365a646
Create Date: 2026-10-19 19:33:48.851310

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "38c4c0aac9fd"
down_revision: str | Sequence[str] | None = "4a070365a646"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "collections",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("clock_timestamp()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["owner_id"],
            ["users.id"],
            name=op.f("fk_collections_owner_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_collections")),
    )
    op.create_index(
        "uq_collections_owner_id_lower_name",
        "collections",
        ["owner_id", sa.literal_column("lower(name)")],
        unique=True,
    )
    op.add_column("products", sa.Column("collection_id", sa.Uuid(), nullable=True))
    op.create_index(op.f("ix_products_collection_id"), "products", ["collection_id"], unique=False)
    op.create_foreign_key(
        op.f("fk_products_collection_id_collections"),
        "products",
        "collections",
        ["collection_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.add_column("references", sa.Column("collection_id", sa.Uuid(), nullable=True))
    op.create_index(
        op.f("ix_references_collection_id"), "references", ["collection_id"], unique=False
    )
    op.create_foreign_key(
        op.f("fk_references_collection_id_collections"),
        "references",
        "collections",
        ["collection_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Строки коллекций становятся коллекциями владельцев: бренда у продукта, автора у
    # референса. Одно имя без учёта регистра у владельца — одна коллекция.
    op.execute(
        """
        INSERT INTO collections (id, owner_id, name)
        SELECT gen_random_uuid(), owner_id, min(name)
        FROM (
            SELECT brand_id AS owner_id, collection AS name
            FROM products WHERE collection IS NOT NULL
            UNION ALL
            SELECT owner_id, collection FROM "references" WHERE collection IS NOT NULL
        ) AS named
        GROUP BY owner_id, lower(name)
        """
    )
    op.execute(
        """
        UPDATE products SET collection_id = c.id FROM collections c
        WHERE c.owner_id = products.brand_id AND lower(c.name) = lower(products.collection)
        """
    )
    op.execute(
        """
        UPDATE "references" SET collection_id = c.id FROM collections c
        WHERE c.owner_id = "references".owner_id
          AND lower(c.name) = lower("references".collection)
        """
    )
    op.drop_column("products", "collection")
    op.drop_column("references", "collection")


def downgrade() -> None:
    for table in ("products", "references"):
        op.add_column(
            table,
            sa.Column("collection", sa.VARCHAR(length=100), autoincrement=False, nullable=True),
        )
    op.execute(
        """
        UPDATE products SET collection = c.name FROM collections c
        WHERE c.id = products.collection_id
        """
    )
    op.execute(
        """
        UPDATE "references" SET collection = c.name FROM collections c
        WHERE c.id = "references".collection_id
        """
    )
    for table in ("products", "references"):
        op.drop_constraint(op.f(f"fk_{table}_collection_id_collections"), table, type_="foreignkey")
        op.drop_index(op.f(f"ix_{table}_collection_id"), table_name=table)
        op.drop_column(table, "collection_id")
    op.drop_index("uq_collections_owner_id_lower_name", table_name="collections")
    op.drop_table("collections")
