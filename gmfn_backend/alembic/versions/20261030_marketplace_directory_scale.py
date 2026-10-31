"""add scalable marketplace directory indexes

Revision ID: 20261030_market_dir_scale
Revises: 20261027_notice_public_poll
Create Date: 2026-10-30
"""

from alembic import op


revision = "20261030_market_dir_scale"
down_revision = "20261027_notice_public_poll"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_marketplace_shop_active_name_id_v1",
        "marketplace_shops",
        ["is_active", "shop_name", "id"],
    )
    op.create_index(
        "ix_clan_membership_active_directory_v1",
        "clan_memberships",
        ["clan_id", "left_at", "user_id"],
    )
    op.create_index(
        "ix_marketplace_product_directory_v1",
        "marketplace_products",
        ["clan_id", "is_active", "visibility_mode", "shop_id"],
    )

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        op.execute(
            "CREATE INDEX ix_marketplace_shop_name_trgm_v1 "
            "ON marketplace_shops USING gin (lower(shop_name) gin_trgm_ops)"
        )
        op.execute(
            "CREATE INDEX ix_marketplace_shop_description_trgm_v1 "
            "ON marketplace_shops USING gin (lower(coalesce(description, '')) gin_trgm_ops)"
        )
        op.execute(
            "CREATE INDEX ix_marketplace_product_title_trgm_v1 "
            "ON marketplace_products USING gin (lower(title) gin_trgm_ops)"
        )
        op.execute(
            "CREATE INDEX ix_marketplace_product_description_trgm_v1 "
            "ON marketplace_products USING gin (lower(coalesce(description, '')) gin_trgm_ops)"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP INDEX IF EXISTS ix_marketplace_product_description_trgm_v1")
        op.execute("DROP INDEX IF EXISTS ix_marketplace_product_title_trgm_v1")
        op.execute("DROP INDEX IF EXISTS ix_marketplace_shop_description_trgm_v1")
        op.execute("DROP INDEX IF EXISTS ix_marketplace_shop_name_trgm_v1")

    op.drop_index(
        "ix_marketplace_product_directory_v1",
        table_name="marketplace_products",
    )
    op.drop_index(
        "ix_clan_membership_active_directory_v1",
        table_name="clan_memberships",
    )
    op.drop_index(
        "ix_marketplace_shop_active_name_id_v1",
        table_name="marketplace_shops",
    )