"""add pipeline credit ledger

Revision ID: 20261009_pipeline_credit_ledger
Revises: 20261008_shop_diary_entries
Create Date: 2026-10-09
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20261009_pipeline_credit_ledger"
down_revision = "20261008_shop_diary_entries"
branch_labels = None
depends_on = None

ACCOUNTS = "pipeline_credit_accounts"
ENTRIES = "pipeline_credit_ledger_entries"


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

    if not _has_table(bind, ACCOUNTS):
        op.create_table(
            ACCOUNTS,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("account_key", sa.String(length=160), nullable=False),
            sa.Column("owner_type", sa.String(length=32), nullable=False),
            sa.Column("owner_user_id", sa.Integer(), nullable=True),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("sponsor_ref", sa.String(length=96), nullable=True),
            sa.Column("currency", sa.String(length=8), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("account_key", name="uq_pipeline_credit_accounts_key_v1"),
        )

    for name, columns in (
        ("ix_pipeline_credit_accounts_owner_v1", ["owner_type", "owner_user_id", "clan_id"]),
        ("ix_pipeline_credit_accounts_clan_v1", ["clan_id"]),
        ("ix_pipeline_credit_accounts_status_v1", ["status"]),
    ):
        if not _has_index(bind, ACCOUNTS, name):
            op.create_index(name, ACCOUNTS, columns)

    if not _has_table(bind, ENTRIES):
        op.create_table(
            ENTRIES,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("account_id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("entry_type", sa.String(length=32), nullable=False),
            sa.Column("credit_amount", sa.Numeric(18, 2), nullable=False),
            sa.Column("balance_after", sa.Numeric(18, 2), nullable=False),
            sa.Column("workflow_key", sa.String(length=96), nullable=False),
            sa.Column("provider_key", sa.String(length=96), nullable=True),
            sa.Column("reference_type", sa.String(length=64), nullable=True),
            sa.Column("reference_id", sa.String(length=128), nullable=True),
            sa.Column("idempotency_key", sa.String(length=160), nullable=False),
            sa.Column("note", sa.Text(), nullable=True),
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
            sa.Column("meta_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["account_id"], [f"{ACCOUNTS}.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("idempotency_key", name="uq_pipeline_credit_entries_idem_v1"),
        )

    for name, columns in (
        ("ix_pipeline_credit_entries_account_v1", ["account_id", "created_at"]),
        ("ix_pipeline_credit_entries_clan_v1", ["clan_id", "created_at"]),
        ("ix_pipeline_credit_entries_user_v1", ["user_id", "created_at"]),
        ("ix_pipeline_credit_entries_workflow_v1", ["workflow_key", "created_at"]),
        ("ix_pipeline_credit_entries_provider_v1", ["provider_key", "created_at"]),
    ):
        if not _has_index(bind, ENTRIES, name):
            op.create_index(name, ENTRIES, columns)


def downgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, ENTRIES):
        for name in (
            "ix_pipeline_credit_entries_provider_v1",
            "ix_pipeline_credit_entries_workflow_v1",
            "ix_pipeline_credit_entries_user_v1",
            "ix_pipeline_credit_entries_clan_v1",
            "ix_pipeline_credit_entries_account_v1",
        ):
            if _has_index(bind, ENTRIES, name):
                op.drop_index(name, table_name=ENTRIES)
        op.drop_table(ENTRIES)

    if _has_table(bind, ACCOUNTS):
        for name in (
            "ix_pipeline_credit_accounts_status_v1",
            "ix_pipeline_credit_accounts_clan_v1",
            "ix_pipeline_credit_accounts_owner_v1",
        ):
            if _has_index(bind, ACCOUNTS, name):
                op.drop_index(name, table_name=ACCOUNTS)
        op.drop_table(ACCOUNTS)
