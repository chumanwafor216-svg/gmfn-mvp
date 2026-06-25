"""add shop followers

Revision ID: 20260625_add_shop_followers
Revises: 20260619_member_witness_pending_pair_guard
Create Date: 2026-06-25
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260625_add_shop_followers"
down_revision = "20260619_member_witness_pending_pair_guard"
branch_labels = None
depends_on = None

TABLE_NAME = "shop_followers"


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, TABLE_NAME):
        op.create_table(
            TABLE_NAME,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("shop_id", sa.Integer(), nullable=False),
            sa.Column("follower_user_id", sa.Integer(), nullable=False),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.ForeignKeyConstraint(
                ["follower_user_id"],
                ["users.id"],
                ondelete="CASCADE",
            ),
            sa.ForeignKeyConstraint(
                ["shop_id"],
                ["marketplace_shops.id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "shop_id",
                "follower_user_id",
                name="uq_shop_followers_shop_user",
            ),
        )

    indexes = (
        ("ix_shop_followers_shop_id", ["shop_id"]),
        ("ix_shop_followers_follower_user_id", ["follower_user_id"]),
        ("ix_shop_followers_created_at", ["created_at"]),
        ("ix_shop_followers_shop_user", ["shop_id", "follower_user_id"]),
        ("ix_shop_followers_user_created", ["follower_user_id", "created_at"]),
    )
    for index_name, columns in indexes:
        if not _has_index(bind, TABLE_NAME, index_name):
            op.create_index(index_name, TABLE_NAME, columns, unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_table(bind, TABLE_NAME):
        return

    for index_name in (
        "ix_shop_followers_user_created",
        "ix_shop_followers_shop_user",
        "ix_shop_followers_created_at",
        "ix_shop_followers_follower_user_id",
        "ix_shop_followers_shop_id",
    ):
        if _has_index(bind, TABLE_NAME, index_name):
            op.drop_index(index_name, table_name=TABLE_NAME)

    op.drop_table(TABLE_NAME)
