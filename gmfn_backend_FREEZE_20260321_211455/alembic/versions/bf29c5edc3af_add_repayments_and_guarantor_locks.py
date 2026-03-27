"""add repayments and guarantor locks

Revision ID: bf29c5edc3af
Revises: 522714b1ac38
Create Date: 2026-01-27
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "bf29c5edc3af"
down_revision: Union[str, None] = "522714b1ac38"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # ✅ 1) Create repayments table ONLY if it doesn't already exist
    has_repayments = bind.exec_driver_sql(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='repayments';"
    ).fetchone()

    if not has_repayments:
        op.create_table(
            "repayments",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("loan_id", sa.Integer(), nullable=False),
            sa.Column("payer_user_id", sa.Integer(), nullable=False),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_repayments_loan_id", "repayments", ["loan_id"])
        op.create_index("ix_repayments_payer_user_id", "repayments", ["payer_user_id"])

    # ✅ 2) Add guarantor lock fields (no FK/constraint changes)
    op.add_column("loan_guarantors", sa.Column("is_locked", sa.Boolean(), server_default="0", nullable=False))
    op.add_column("loan_guarantors", sa.Column("locked_amount", sa.Numeric(12, 2), server_default="0", nullable=False))
    op.add_column("loan_guarantors", sa.Column("released_amount", sa.Numeric(12, 2), server_default="0", nullable=False))

    # ✅ 3) Add repayment tracking fields to loans
    op.add_column("loans", sa.Column("paid_total", sa.Numeric(12, 2), server_default="0", nullable=False))
    op.add_column("loans", sa.Column("remaining_amount", sa.Numeric(12, 2), server_default="0", nullable=False))
    op.add_column("loans", sa.Column("repaid_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("loans", sa.Column("due_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Best-effort downgrade for SQLite
    op.drop_column("loans", "due_at")
    op.drop_column("loans", "repaid_at")
    op.drop_column("loans", "remaining_amount")
    op.drop_column("loans", "paid_total")

    op.drop_column("loan_guarantors", "released_amount")
    op.drop_column("loan_guarantors", "locked_amount")
    op.drop_column("loan_guarantors", "is_locked")

    # drop repayments table if exists
    bind = op.get_bind()
    has_repayments = bind.exec_driver_sql(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='repayments';"
    ).fetchone()
    if has_repayments:
        op.drop_index("ix_repayments_payer_user_id", table_name="repayments")
        op.drop_index("ix_repayments_loan_id", table_name="repayments")
        op.drop_table("repayments")
