"""add protected trade records

Revision ID: 20260627_add_protected_trade_records
Revises: 20260626_add_community_pay_in_accounts
Create Date: 2026-06-27
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260627_add_protected_trade_records"
down_revision = "20260626_add_community_pay_in_accounts"
branch_labels = None
depends_on = None

TRADE_TABLE = "protected_trade_records"
EVENT_TABLE = "protected_trade_events"


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    if not _has_table(bind, table_name):
        return False
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, TRADE_TABLE):
        op.create_table(
            TRADE_TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("trade_code", sa.String(length=64), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("creator_user_id", sa.Integer(), nullable=False),
            sa.Column("seller_user_id", sa.Integer(), nullable=True),
            sa.Column("buyer_user_id", sa.Integer(), nullable=True),
            sa.Column("shop_id", sa.Integer(), nullable=True),
            sa.Column("product_id", sa.Integer(), nullable=True),
            sa.Column("vault_access_link_id", sa.Integer(), nullable=True),
            sa.Column("trust_slip_code", sa.String(length=64), nullable=True),
            sa.Column("expected_payment_id", sa.Integer(), nullable=True),
            sa.Column("shipment_pack_id", sa.String(length=96), nullable=True),
            sa.Column("evidence_pack_id", sa.String(length=96), nullable=True),
            sa.Column("item_title", sa.String(length=160), nullable=True),
            sa.Column("terms_summary", sa.Text(), nullable=True),
            sa.Column("amount", sa.Numeric(18, 2), nullable=True),
            sa.Column("currency", sa.String(length=8), nullable=False, server_default="NGN"),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
            sa.Column("payment_status", sa.String(length=32), nullable=False, server_default="not_started"),
            sa.Column("release_status", sa.String(length=32), nullable=False, server_default="not_requested"),
            sa.Column("receipt_status", sa.String(length=32), nullable=False, server_default="not_confirmed"),
            sa.Column("dispute_status", sa.String(length=32), nullable=False, server_default="none"),
            sa.Column("meta_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["buyer_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["creator_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["product_id"], ["marketplace_products.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["seller_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["vault_access_link_id"], ["vault_access_links.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("trade_code", name="uq_ptr_trade_code"),
        )

    trade_indexes = (
        ("ix_ptr_id", ["id"]),
        ("ix_ptr_trade_code", ["trade_code"]),
        ("ix_ptr_clan_id", ["clan_id"]),
        ("ix_ptr_creator_user_id", ["creator_user_id"]),
        ("ix_ptr_seller_user_id", ["seller_user_id"]),
        ("ix_ptr_buyer_user_id", ["buyer_user_id"]),
        ("ix_ptr_shop_id", ["shop_id"]),
        ("ix_ptr_product_id", ["product_id"]),
        ("ix_ptr_vault_access_link_id", ["vault_access_link_id"]),
        ("ix_ptr_trust_slip_code", ["trust_slip_code"]),
        ("ix_ptr_expected_payment_id", ["expected_payment_id"]),
        ("ix_ptr_shipment_pack_id", ["shipment_pack_id"]),
        ("ix_ptr_evidence_pack_id", ["evidence_pack_id"]),
        ("ix_ptr_status", ["status"]),
        ("ix_ptr_payment_status", ["payment_status"]),
        ("ix_ptr_release_status", ["release_status"]),
        ("ix_ptr_receipt_status", ["receipt_status"]),
        ("ix_ptr_dispute_status", ["dispute_status"]),
        ("ix_ptr_created_at", ["created_at"]),
        ("ix_ptr_closed_at", ["closed_at"]),
        ("ix_ptr_seller_status", ["seller_user_id", "status"]),
        ("ix_ptr_buyer_status", ["buyer_user_id", "status"]),
        ("ix_ptr_clan_status", ["clan_id", "status"]),
    )
    for index_name, columns in trade_indexes:
        if not _has_index(bind, TRADE_TABLE, index_name):
            op.create_index(index_name, TRADE_TABLE, columns, unique=False)

    if not _has_table(bind, EVENT_TABLE):
        op.create_table(
            EVENT_TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("trade_id", sa.Integer(), nullable=False),
            sa.Column("actor_user_id", sa.Integer(), nullable=False),
            sa.Column("event_type", sa.String(length=64), nullable=False),
            sa.Column("status_from", sa.String(length=32), nullable=True),
            sa.Column("status_to", sa.String(length=32), nullable=True),
            sa.Column("trust_event_id", sa.Integer(), nullable=True),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("meta_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["actor_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["trade_id"], [f"{TRADE_TABLE}.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["trust_event_id"], ["trust_events.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    event_indexes = (
        ("ix_pte_id", ["id"]),
        ("ix_pte_trade_id", ["trade_id"]),
        ("ix_pte_actor_user_id", ["actor_user_id"]),
        ("ix_pte_event_type", ["event_type"]),
        ("ix_pte_status_to", ["status_to"]),
        ("ix_pte_trust_event_id", ["trust_event_id"]),
        ("ix_pte_created_at", ["created_at"]),
    )
    for index_name, columns in event_indexes:
        if not _has_index(bind, EVENT_TABLE, index_name):
            op.create_index(index_name, EVENT_TABLE, columns, unique=False)


def downgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, EVENT_TABLE):
        for index_name in (
            "ix_pte_created_at",
            "ix_pte_trust_event_id",
            "ix_pte_status_to",
            "ix_pte_event_type",
            "ix_pte_actor_user_id",
            "ix_pte_trade_id",
            "ix_pte_id",
        ):
            if _has_index(bind, EVENT_TABLE, index_name):
                op.drop_index(index_name, table_name=EVENT_TABLE)
        op.drop_table(EVENT_TABLE)

    if _has_table(bind, TRADE_TABLE):
        for index_name in (
            "ix_ptr_clan_status",
            "ix_ptr_buyer_status",
            "ix_ptr_seller_status",
            "ix_ptr_closed_at",
            "ix_ptr_created_at",
            "ix_ptr_dispute_status",
            "ix_ptr_receipt_status",
            "ix_ptr_release_status",
            "ix_ptr_payment_status",
            "ix_ptr_status",
            "ix_ptr_evidence_pack_id",
            "ix_ptr_shipment_pack_id",
            "ix_ptr_expected_payment_id",
            "ix_ptr_trust_slip_code",
            "ix_ptr_vault_access_link_id",
            "ix_ptr_product_id",
            "ix_ptr_shop_id",
            "ix_ptr_buyer_user_id",
            "ix_ptr_seller_user_id",
            "ix_ptr_creator_user_id",
            "ix_ptr_clan_id",
            "ix_ptr_trade_code",
            "ix_ptr_id",
        ):
            if _has_index(bind, TRADE_TABLE, index_name):
                op.drop_index(index_name, table_name=TRADE_TABLE)
        op.drop_table(TRADE_TABLE)

