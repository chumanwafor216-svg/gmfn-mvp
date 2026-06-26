"""add community pay in accounts

Revision ID: 20260626_add_community_pay_in_accounts
Revises: 20260625_add_shop_followers
Create Date: 2026-06-26
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260626_add_community_pay_in_accounts"
down_revision = "20260625_add_shop_followers"
branch_labels = None
depends_on = None

TABLE_NAME = "community_pay_in_accounts"


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

    if not _has_table(bind, TABLE_NAME):
        op.create_table(
            TABLE_NAME,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=False),
            sa.Column("updated_by_user_id", sa.Integer(), nullable=True),
            sa.Column("account_name", sa.String(length=160), nullable=False),
            sa.Column("bank_name", sa.String(length=120), nullable=False),
            sa.Column("account_number", sa.String(length=64), nullable=False),
            sa.Column("sort_code", sa.String(length=32), nullable=True),
            sa.Column("routing_number", sa.String(length=64), nullable=True),
            sa.Column("iban", sa.String(length=64), nullable=True),
            sa.Column("swift_bic", sa.String(length=32), nullable=True),
            sa.Column("country", sa.String(length=64), nullable=True),
            sa.Column("currency", sa.String(length=8), nullable=False, server_default="NGN"),
            sa.Column("status", sa.String(length=32), nullable=False, server_default="recorded"),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["updated_by_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("clan_id", name="uq_community_pay_in_accounts_clan_id"),
        )

    indexes = (
        ("ix_community_pay_in_accounts_id", ["id"]),
        ("ix_community_pay_in_accounts_clan_id", ["clan_id"]),
        ("ix_community_pay_in_accounts_updated_by_user_id", ["updated_by_user_id"]),
    )
    for index_name, columns in indexes:
        if not _has_index(bind, TABLE_NAME, index_name):
            op.create_index(index_name, TABLE_NAME, columns, unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_table(bind, TABLE_NAME):
        return

    for index_name in (
        "ix_community_pay_in_accounts_updated_by_user_id",
        "ix_community_pay_in_accounts_clan_id",
        "ix_community_pay_in_accounts_id",
    ):
        if _has_index(bind, TABLE_NAME, index_name):
            op.drop_index(index_name, table_name=TABLE_NAME)
    op.drop_table(TABLE_NAME)
