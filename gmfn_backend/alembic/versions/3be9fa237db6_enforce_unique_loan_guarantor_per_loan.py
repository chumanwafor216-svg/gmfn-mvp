"""enforce unique loan guarantor per loan

Revision ID: 3be9fa237db6
Revises: b8534fc8c044
Create Date: 2026-01-11 08:53:47.507107

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3be9fa237db6'
down_revision: Union[str, Sequence[str], None] = 'b8534fc8c044'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

from alembic import op

def upgrade() -> None:
    op.create_index(
        "uq_loan_guarantors_loan_id_guarantor_user_id",
        "loan_guarantors",
        ["loan_id", "guarantor_user_id"],
        unique=True,
    )

def downgrade() -> None:
    op.drop_index(
        "uq_loan_guarantors_loan_id_guarantor_user_id",
        table_name="loan_guarantors",
    )
