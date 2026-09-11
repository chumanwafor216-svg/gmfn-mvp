"""add marketplace attention events

Revision ID: 20260911_market_attention
Revises: 20260908_comm_domain_gov_packages
Create Date: 2026-09-11
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260911_market_attention"
down_revision: Union[str, Sequence[str], None] = "20260908_comm_domain_gov_packages"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLE_NAME = "marketplace_attention_events"


def _has_table(bind, table_name: str) -> bool:
    return sa.inspect(bind).has_table(table_name)


def _has_index(bind, table_name: str, index_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    return any(index.get("name") == index_name for index in sa.inspect(bind).get_indexes(table_name))


def _create_index(bind, index_name: str, columns: list[str]) -> None:
    if not _has_index(bind, TABLE_NAME, index_name):
        op.create_index(index_name, TABLE_NAME, columns, unique=False)


def _drop_index(bind, index_name: str) -> None:
    if _has_index(bind, TABLE_NAME, index_name):
        op.drop_index(index_name, table_name=TABLE_NAME)


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, TABLE_NAME):
        op.create_table(
            TABLE_NAME,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("event_type", sa.String(length=40), nullable=False),
            sa.Column("shop_id", sa.Integer(), nullable=True),
            sa.Column("product_id", sa.Integer(), nullable=True),
            sa.Column("broadcast_id", sa.Integer(), nullable=True),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("shop_owner_user_id", sa.Integer(), nullable=True),
            sa.Column("viewer_user_id", sa.Integer(), nullable=True),
            sa.Column("anonymous_key_hash", sa.String(length=64), nullable=True),
            sa.Column("user_agent_hash", sa.String(length=64), nullable=True),
            sa.Column("source", sa.String(length=40), nullable=False, server_default="public_shop"),
            sa.Column("source_path", sa.String(length=240), nullable=True),
            sa.Column("dedupe_key", sa.String(length=128), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.ForeignKeyConstraint(["broadcast_id"], ["marketplace_broadcasts.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["product_id"], ["marketplace_products.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["shop_owner_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["viewer_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("dedupe_key", name="uq_marketplace_attention_dedupe_key"),
        )

    indexes = (
        ("ix_marketplace_attention_events_id", ["id"]),
        ("ix_marketplace_attention_events_event_type", ["event_type"]),
        ("ix_marketplace_attention_events_shop_id", ["shop_id"]),
        ("ix_marketplace_attention_events_product_id", ["product_id"]),
        ("ix_marketplace_attention_events_broadcast_id", ["broadcast_id"]),
        ("ix_marketplace_attention_events_clan_id", ["clan_id"]),
        ("ix_marketplace_attention_events_shop_owner_user_id", ["shop_owner_user_id"]),
        ("ix_marketplace_attention_events_viewer_user_id", ["viewer_user_id"]),
        ("ix_marketplace_attention_events_anonymous_key_hash", ["anonymous_key_hash"]),
        ("ix_marketplace_attention_events_source", ["source"]),
        ("ix_marketplace_attention_events_created_at", ["created_at"]),
        ("ix_marketplace_attention_shop_type_created", ["shop_id", "event_type", "created_at"]),
        ("ix_marketplace_attention_product_type_created", ["product_id", "event_type", "created_at"]),
        ("ix_marketplace_attention_broadcast_type_created", ["broadcast_id", "event_type", "created_at"]),
        ("ix_marketplace_attention_owner_created", ["shop_owner_user_id", "created_at"]),
        ("ix_marketplace_attention_unique_viewer", ["event_type", "viewer_user_id", "anonymous_key_hash"]),
    )
    for index_name, columns in indexes:
        _create_index(bind, index_name, columns)


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_table(bind, TABLE_NAME):
        return

    for index_name in (
        "ix_marketplace_attention_unique_viewer",
        "ix_marketplace_attention_owner_created",
        "ix_marketplace_attention_broadcast_type_created",
        "ix_marketplace_attention_product_type_created",
        "ix_marketplace_attention_shop_type_created",
        "ix_marketplace_attention_events_created_at",
        "ix_marketplace_attention_events_source",
        "ix_marketplace_attention_events_anonymous_key_hash",
        "ix_marketplace_attention_events_viewer_user_id",
        "ix_marketplace_attention_events_shop_owner_user_id",
        "ix_marketplace_attention_events_clan_id",
        "ix_marketplace_attention_events_broadcast_id",
        "ix_marketplace_attention_events_product_id",
        "ix_marketplace_attention_events_shop_id",
        "ix_marketplace_attention_events_event_type",
        "ix_marketplace_attention_events_id",
    ):
        _drop_index(bind, index_name)

    op.drop_table(TABLE_NAME)