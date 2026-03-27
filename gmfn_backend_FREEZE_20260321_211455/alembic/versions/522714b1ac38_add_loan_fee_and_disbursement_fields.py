"""add loan fee and disbursement fields

Revision ID: 522714b1ac38
Revises: 3be9fa237db6
Create Date: 2026-01-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "522714b1ac38"
down_revision: Union[str, None] = "3be9fa237db6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "loans",
        sa.Column("service_fee", sa.Numeric(12, 2), server_default="0", nullable=False),
    )
    op.add_column(
        "loans",
        sa.Column("net_disbursed_amount", sa.Numeric(12, 2), server_default="0", nullable=False),
    )
    op.add_column(
        "loans",
        sa.Column("guarantor_pool", sa.Numeric(12, 2), server_default="0", nullable=False),
    )
    op.add_column(
        "loans",
        sa.Column("platform_revenue", sa.Numeric(12, 2), server_default="0", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("loans", "platform_revenue")
    op.drop_column("loans", "guarantor_pool")
    op.drop_column("loans", "net_disbursed_amount")
    op.drop_column("loans", "service_fee")
