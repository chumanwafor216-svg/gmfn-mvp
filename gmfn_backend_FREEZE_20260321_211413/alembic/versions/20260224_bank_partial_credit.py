"""add partial payment fields + bank credits (safe-create)

Revision ID: 20260224_bank_partial_credit
Revises: 10a0d435bd24
Create Date: 2026-02-24
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260224_bank_partial_credit"
down_revision = "10a0d435bd24"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    # 1) Add partial fields if not present
    columns = [col["name"] for col in inspector.get_columns("expected_payments")]

    with op.batch_alter_table("expected_payments") as batch:
        if "paid_amount" not in columns:
            batch.add_column(
                sa.Column(
                    "paid_amount",
                    sa.Numeric(18, 2),
                    nullable=False,
                    server_default="0.00",
                )
            )

        if "remaining_amount" not in columns:
            batch.add_column(
                sa.Column(
                    "remaining_amount",
                    sa.Numeric(18, 2),
                    nullable=False,
                    server_default="0.00",
                )
            )

    # Backfill remaining_amount safely
    op.execute('''
    UPDATE expected_payments
    SET remaining_amount = amount
    WHERE remaining_amount = 0.00
    ''')

    # 2) Create bank_credits only if it does not exist
    tables = inspector.get_table_names()
    if "bank_credits" not in tables:
        op.create_table(
            "bank_credits",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("clan_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("currency", sa.String(length=8), nullable=False),
            sa.Column("amount", sa.Numeric(18, 2), nullable=False),
            sa.Column("source_bank_event_id", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("meta_json", sa.Text(), nullable=True),
            sa.UniqueConstraint(
                "source_bank_event_id",
                name="uq_bank_credits_source_be_v1",
            ),
        )
        op.create_index(
            "ix_bank_credits_clan_user_ccy_v1",
            "bank_credits",
            ["clan_id", "user_id", "currency"],
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)

    tables = inspector.get_table_names()
    if "bank_credits" in tables:
        op.drop_index("ix_bank_credits_clan_user_ccy_v1", table_name="bank_credits")
        op.drop_table("bank_credits")

    columns = [col["name"] for col in inspector.get_columns("expected_payments")]
    with op.batch_alter_table("expected_payments") as batch:
        if "remaining_amount" in columns:
            batch.drop_column("remaining_amount")
        if "paid_amount" in columns:
            batch.drop_column("paid_amount")
