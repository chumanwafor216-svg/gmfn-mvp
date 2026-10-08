"""add shop diary entries

Revision ID: 20261008_shop_diary_entries
Revises: 20261007_trustslip_share_invitations
Create Date: 2026-10-08
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20261008_shop_diary_entries"
down_revision = "20261007_trustslip_share_invitations"
branch_labels = None
depends_on = None

TABLE = "shop_diary_entries"


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, TABLE):
        op.create_table(
            TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("shop_id", sa.Integer(), nullable=False),
            sa.Column("owner_user_id", sa.Integer(), nullable=False),
            sa.Column("product_id", sa.Integer(), nullable=True),
            sa.Column("protected_trade_id", sa.Integer(), nullable=True),
            sa.Column("activity_type", sa.String(length=40), nullable=False),
            sa.Column("evidence_class", sa.String(length=40), nullable=False, server_default="owner_update"),
            sa.Column("note", sa.Text(), nullable=False),
            sa.Column("image_url", sa.Text(), nullable=True),
            sa.Column("video_url", sa.Text(), nullable=True),
            sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("is_public", sa.Boolean(), nullable=False, server_default="1"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["product_id"], ["marketplace_products.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["protected_trade_id"], ["protected_trade_records.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    indexes = (
        ("ix_shop_diary_entries_id", ["id"]),
        ("ix_shop_diary_entries_clan_id", ["clan_id"]),
        ("ix_shop_diary_entries_shop_id", ["shop_id"]),
        ("ix_shop_diary_entries_owner_user_id", ["owner_user_id"]),
        ("ix_shop_diary_entries_product_id", ["product_id"]),
        ("ix_shop_diary_entries_protected_trade_id", ["protected_trade_id"]),
        ("ix_shop_diary_entries_activity_type", ["activity_type"]),
        ("ix_shop_diary_entries_evidence_class", ["evidence_class"]),
        ("ix_shop_diary_entries_occurred_at", ["occurred_at"]),
        ("ix_shop_diary_entries_is_public", ["is_public"]),
        ("ix_shop_diary_entries_is_active", ["is_active"]),
        ("ix_shop_diary_entries_created_at", ["created_at"]),
        ("ix_shop_diary_entries_updated_at", ["updated_at"]),
        ("ix_shop_diary_entries_shop_occurred", ["shop_id", "occurred_at"]),
        ("ix_shop_diary_entries_owner_occurred", ["owner_user_id", "occurred_at"]),
        ("ix_shop_diary_entries_shop_public", ["shop_id", "is_public", "is_active"]),
    )
    for name, columns in indexes:
        if not _has_index(bind, TABLE, name):
            op.create_index(name, TABLE, columns)


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_table(bind, TABLE):
        return

    for name in (
        "ix_shop_diary_entries_shop_public",
        "ix_shop_diary_entries_owner_occurred",
        "ix_shop_diary_entries_shop_occurred",
        "ix_shop_diary_entries_updated_at",
        "ix_shop_diary_entries_created_at",
        "ix_shop_diary_entries_is_active",
        "ix_shop_diary_entries_is_public",
        "ix_shop_diary_entries_occurred_at",
        "ix_shop_diary_entries_evidence_class",
        "ix_shop_diary_entries_activity_type",
        "ix_shop_diary_entries_protected_trade_id",
        "ix_shop_diary_entries_product_id",
        "ix_shop_diary_entries_owner_user_id",
        "ix_shop_diary_entries_shop_id",
        "ix_shop_diary_entries_clan_id",
        "ix_shop_diary_entries_id",
    ):
        if _has_index(bind, TABLE, name):
            op.drop_index(name, table_name=TABLE)

    op.drop_table(TABLE)