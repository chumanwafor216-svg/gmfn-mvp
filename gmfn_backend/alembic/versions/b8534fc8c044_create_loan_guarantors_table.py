"""create loan_guarantors table

Revision ID: b8534fc8c044
Revises: 8639aea7f68d
Create Date: 2026-01-10 11:56:28.310331

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8534fc8c044'
down_revision: Union[str, Sequence[str], None] = '8639aea7f68d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "loan_guarantors",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("loan_id", sa.Integer(), sa.ForeignKey("loans.id"), nullable=False),
        sa.Column("clan_id", sa.Integer(), sa.ForeignKey("clans.id"), nullable=False),
        sa.Column("guarantor_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("pledge_amount", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("responded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
    )
    op.create_index("ix_loan_guarantors_loan_id", "loan_guarantors", ["loan_id"], unique=False)
    op.create_index("ix_loan_guarantors_clan_id", "loan_guarantors", ["clan_id"], unique=False)
    op.create_index("ix_loan_guarantors_guarantor_user_id", "loan_guarantors", ["guarantor_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_loan_guarantors_guarantor_user_id", table_name="loan_guarantors")
    op.drop_index("ix_loan_guarantors_clan_id", table_name="loan_guarantors")
    op.drop_index("ix_loan_guarantors_loan_id", table_name="loan_guarantors")
    op.drop_table("loan_guarantors")
