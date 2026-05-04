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


def upgrade() -> None:
    bind = op.get_bind()

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
