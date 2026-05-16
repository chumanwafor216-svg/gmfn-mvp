"""add dedicated vault domain tables

Revision ID: 20260504_add_vault_domain_tables
Revises: 20260504_add_vault_access_link_product_id
Create Date: 2026-05-04
"""

from alembic import op
import sqlalchemy as sa


revision = "20260504_add_vault_domain_tables"
down_revision = "20260504_add_vault_access_link_product_id"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def _create_index_if_missing(
    bind,
    index_name: str,
    table_name: str,
    columns: list[str],
    *,
    unique: bool = False,
) -> None:
    if _has_table(bind, table_name) and not _has_index(bind, table_name, index_name):
        op.create_index(index_name, table_name, columns, unique=unique)


def _ensure_marketplace_domain_tables(bind) -> None:
    """Create missing marketplace tables before Vault adds foreign keys.

    Render Postgres applies real foreign-key checks while SQLite permits a
    reference to a table that does not exist yet. The Vault migration depends on
    the shop/product marketplace tables, so this deploy-safe backfill must run
    before vault_orders/vault_blocks are created.
    """

    if not _has_table(bind, "marketplace_shops"):
        op.create_table(
            "marketplace_shops",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("owner_user_id", sa.Integer(), nullable=False),
            sa.Column("shop_name", sa.String(length=120), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("whatsapp_number", sa.String(length=32), nullable=True),
            sa.Column("telegram_handle", sa.String(length=64), nullable=True),
            sa.Column("image_url", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("owner_user_id", name="uq_marketplace_shop_owner_global"),
        )

    _create_index_if_missing(bind, "ix_marketplace_shops_id", "marketplace_shops", ["id"])
    _create_index_if_missing(bind, "ix_marketplace_shops_clan_id", "marketplace_shops", ["clan_id"])
    _create_index_if_missing(bind, "ix_marketplace_shops_owner_user_id", "marketplace_shops", ["owner_user_id"])
    _create_index_if_missing(bind, "ix_marketplace_shops_shop_name", "marketplace_shops", ["shop_name"])
    _create_index_if_missing(bind, "ix_marketplace_shops_is_active", "marketplace_shops", ["is_active"])
    _create_index_if_missing(bind, "ix_marketplace_shops_created_at", "marketplace_shops", ["created_at"])

    if not _has_table(bind, "marketplace_products"):
        op.create_table(
            "marketplace_products",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=False),
            sa.Column("shop_id", sa.Integer(), nullable=False),
            sa.Column("seller_user_id", sa.Integer(), nullable=False),
            sa.Column("title", sa.String(length=160), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("price", sa.String(length=32), nullable=True),
            sa.Column("currency", sa.String(length=8), server_default="NGN", nullable=True),
            sa.Column("image_url", sa.Text(), nullable=True),
            sa.Column("video_url", sa.Text(), nullable=True),
            sa.Column("visibility_mode", sa.String(length=32), server_default="community_visible", nullable=False),
            sa.Column("is_active", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["seller_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    _create_index_if_missing(bind, "ix_marketplace_products_id", "marketplace_products", ["id"])
    _create_index_if_missing(bind, "ix_marketplace_products_clan_id", "marketplace_products", ["clan_id"])
    _create_index_if_missing(bind, "ix_marketplace_products_shop_id", "marketplace_products", ["shop_id"])
    _create_index_if_missing(bind, "ix_marketplace_products_seller_user_id", "marketplace_products", ["seller_user_id"])
    _create_index_if_missing(bind, "ix_marketplace_products_title", "marketplace_products", ["title"])
    _create_index_if_missing(bind, "ix_marketplace_products_visibility_mode", "marketplace_products", ["visibility_mode"])
    _create_index_if_missing(bind, "ix_marketplace_products_is_active", "marketplace_products", ["is_active"])
    _create_index_if_missing(bind, "ix_marketplace_products_created_at", "marketplace_products", ["created_at"])

    if not _has_table(bind, "marketplace_broadcasts"):
        op.create_table(
            "marketplace_broadcasts",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=False),
            sa.Column("author_user_id", sa.Integer(), nullable=False),
            sa.Column("shop_id", sa.Integer(), nullable=True),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("image_url", sa.Text(), nullable=True),
            sa.Column("video_url", sa.Text(), nullable=True),
            sa.Column("priority_mode", sa.String(length=20), server_default="free", nullable=False),
            sa.Column("visibility_scope", sa.String(length=32), server_default="direct_communities", nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["author_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    _create_index_if_missing(bind, "ix_marketplace_broadcasts_id", "marketplace_broadcasts", ["id"])
    _create_index_if_missing(bind, "ix_marketplace_broadcasts_clan_id", "marketplace_broadcasts", ["clan_id"])
    _create_index_if_missing(bind, "ix_marketplace_broadcasts_author_user_id", "marketplace_broadcasts", ["author_user_id"])
    _create_index_if_missing(bind, "ix_marketplace_broadcasts_shop_id", "marketplace_broadcasts", ["shop_id"])
    _create_index_if_missing(bind, "ix_marketplace_broadcasts_priority_mode", "marketplace_broadcasts", ["priority_mode"])
    _create_index_if_missing(bind, "ix_marketplace_broadcasts_visibility_scope", "marketplace_broadcasts", ["visibility_scope"])
    _create_index_if_missing(bind, "ix_marketplace_broadcasts_expires_at", "marketplace_broadcasts", ["expires_at"])
    _create_index_if_missing(bind, "ix_marketplace_broadcasts_created_at", "marketplace_broadcasts", ["created_at"])

    if not _has_table(bind, "marketplace_reviews"):
        op.create_table(
            "marketplace_reviews",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=True),
            sa.Column("shop_id", sa.Integer(), nullable=True),
            sa.Column("reviewer_user_id", sa.Integer(), nullable=False),
            sa.Column("merchant_user_id", sa.Integer(), nullable=False),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("review_text", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["merchant_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["product_id"], ["marketplace_products.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["reviewer_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    _create_index_if_missing(bind, "ix_marketplace_reviews_id", "marketplace_reviews", ["id"])
    _create_index_if_missing(bind, "ix_marketplace_reviews_clan_id", "marketplace_reviews", ["clan_id"])
    _create_index_if_missing(bind, "ix_marketplace_reviews_product_id", "marketplace_reviews", ["product_id"])
    _create_index_if_missing(bind, "ix_marketplace_reviews_shop_id", "marketplace_reviews", ["shop_id"])
    _create_index_if_missing(bind, "ix_marketplace_reviews_reviewer_user_id", "marketplace_reviews", ["reviewer_user_id"])
    _create_index_if_missing(bind, "ix_marketplace_reviews_merchant_user_id", "marketplace_reviews", ["merchant_user_id"])
    _create_index_if_missing(bind, "ix_marketplace_reviews_rating", "marketplace_reviews", ["rating"])
    _create_index_if_missing(bind, "ix_marketplace_reviews_created_at", "marketplace_reviews", ["created_at"])

    if not _has_table(bind, "marketplace_product_reposts"):
        op.create_table(
            "marketplace_product_reposts",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("original_product_id", sa.Integer(), nullable=False),
            sa.Column("reposted_by_user_id", sa.Integer(), nullable=False),
            sa.Column("target_clan_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["original_product_id"], ["marketplace_products.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["reposted_by_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["target_clan_id"], ["clans.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    _create_index_if_missing(bind, "ix_marketplace_product_reposts_id", "marketplace_product_reposts", ["id"])
    _create_index_if_missing(bind, "ix_marketplace_product_reposts_original_product_id", "marketplace_product_reposts", ["original_product_id"])
    _create_index_if_missing(bind, "ix_marketplace_product_reposts_reposted_by_user_id", "marketplace_product_reposts", ["reposted_by_user_id"])
    _create_index_if_missing(bind, "ix_marketplace_product_reposts_target_clan_id", "marketplace_product_reposts", ["target_clan_id"])
    _create_index_if_missing(bind, "ix_marketplace_product_reposts_created_at", "marketplace_product_reposts", ["created_at"])


def upgrade() -> None:
    bind = op.get_bind()
    _ensure_marketplace_domain_tables(bind)

    if not _has_table(bind, "vault_orders"):
        op.create_table(
            "vault_orders",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("shop_id", sa.Integer(), nullable=False),
            sa.Column("owner_user_id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("slot_count", sa.Integer(), nullable=False),
            sa.Column("amount_due", sa.Numeric(12, 2), nullable=False),
            sa.Column("currency", sa.String(length=8), server_default="GBP", nullable=False),
            sa.Column("pricing_rule", sa.String(length=32), server_default="unit", nullable=False),
            sa.Column("payment_method", sa.String(length=32), server_default="bank_transfer", nullable=False),
            sa.Column("payment_reference", sa.String(length=128), nullable=False),
            sa.Column("expected_payment_id", sa.Integer(), nullable=True),
            sa.Column("bank_event_id", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=32), server_default="instruction_generated", nullable=False),
            sa.Column("instruction_expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("payment_reference", name="uq_vault_orders_payment_reference"),
        )
        op.create_index("ix_vault_orders_shop_id", "vault_orders", ["shop_id"])
        op.create_index("ix_vault_orders_owner_user_id", "vault_orders", ["owner_user_id"])
        op.create_index("ix_vault_orders_clan_id", "vault_orders", ["clan_id"])
        op.create_index("ix_vault_orders_expected_payment_id", "vault_orders", ["expected_payment_id"])
        op.create_index("ix_vault_orders_bank_event_id", "vault_orders", ["bank_event_id"])
        op.create_index("ix_vault_orders_status", "vault_orders", ["status"])
        op.create_index("ix_vault_orders_instruction_expires_at", "vault_orders", ["instruction_expires_at"])
        op.create_index("ix_vault_orders_created_at", "vault_orders", ["created_at"])

    if not _has_table(bind, "vault_blocks"):
        op.create_table(
            "vault_blocks",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("shop_id", sa.Integer(), nullable=False),
            sa.Column("slot_number", sa.Integer(), nullable=False),
            sa.Column("state", sa.String(length=20), server_default="inactive", nullable=False),
            sa.Column("current_order_id", sa.Integer(), nullable=True),
            sa.Column("product_id", sa.Integer(), nullable=True),
            sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["current_order_id"], ["vault_orders.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["product_id"], ["marketplace_products.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("shop_id", "slot_number", name="uq_vault_blocks_shop_slot_v1"),
        )
        op.create_index("ix_vault_blocks_shop_id", "vault_blocks", ["shop_id"])
        op.create_index("ix_vault_blocks_state", "vault_blocks", ["state"])
        op.create_index("ix_vault_blocks_current_order_id", "vault_blocks", ["current_order_id"])
        op.create_index("ix_vault_blocks_product_id", "vault_blocks", ["product_id"])
        op.create_index("ix_vault_blocks_expires_at", "vault_blocks", ["expires_at"])
        op.create_index("ix_vault_blocks_created_at", "vault_blocks", ["created_at"])
        op.create_index("ix_vault_blocks_shop_state_v1", "vault_blocks", ["shop_id", "state"])

    if not _has_table(bind, "vault_private_offers"):
        op.create_table(
            "vault_private_offers",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("block_id", sa.Integer(), nullable=False),
            sa.Column("shop_id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=True),
            sa.Column("media_type", sa.String(length=20), nullable=True),
            sa.Column("media_url", sa.Text(), nullable=True),
            sa.Column("thumbnail_url", sa.Text(), nullable=True),
            sa.Column("caption", sa.Text(), nullable=True),
            sa.Column("owner_note", sa.Text(), nullable=True),
            sa.Column("status", sa.String(length=20), server_default="draft", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["block_id"], ["vault_blocks.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["product_id"], ["marketplace_products.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_vault_private_offers_block_id", "vault_private_offers", ["block_id"])
        op.create_index("ix_vault_private_offers_shop_id", "vault_private_offers", ["shop_id"])
        op.create_index("ix_vault_private_offers_product_id", "vault_private_offers", ["product_id"])
        op.create_index("ix_vault_private_offers_status", "vault_private_offers", ["status"])
        op.create_index("ix_vault_private_offers_created_at", "vault_private_offers", ["created_at"])

    if not _has_table(bind, "vault_access_logs"):
        op.create_table(
            "vault_access_logs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("link_id", sa.Integer(), nullable=True),
            sa.Column("token_hash", sa.String(length=128), nullable=True),
            sa.Column("viewed_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("user_agent", sa.Text(), nullable=True),
            sa.Column("result", sa.String(length=32), nullable=False),
            sa.ForeignKeyConstraint(["link_id"], ["vault_access_links.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_vault_access_logs_link_id", "vault_access_logs", ["link_id"])
        op.create_index("ix_vault_access_logs_token_hash", "vault_access_logs", ["token_hash"])
        op.create_index("ix_vault_access_logs_viewed_at", "vault_access_logs", ["viewed_at"])
        op.create_index("ix_vault_access_logs_result", "vault_access_logs", ["result"])

    if _has_table(bind, "vault_access_links") and not _has_column(bind, "vault_access_links", "block_id"):
        op.add_column("vault_access_links", sa.Column("block_id", sa.Integer(), nullable=True))
    if _has_table(bind, "vault_access_links") and not _has_index(bind, "vault_access_links", "ix_vault_access_links_block_id"):
        op.create_index("ix_vault_access_links_block_id", "vault_access_links", ["block_id"])


def downgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, "vault_access_links") and _has_index(bind, "vault_access_links", "ix_vault_access_links_block_id"):
        op.drop_index("ix_vault_access_links_block_id", table_name="vault_access_links")
    if _has_table(bind, "vault_access_links") and _has_column(bind, "vault_access_links", "block_id"):
        op.drop_column("vault_access_links", "block_id")

    for table in ("vault_access_logs", "vault_private_offers", "vault_blocks", "vault_orders"):
        if _has_table(bind, table):
            op.drop_table(table)
