"""add personal_pool_balance to users

Revision ID: 9418bf2b1cdc
Revises: fcf019838244
Create Date: 2026-01-30 07:43:07.232039

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9418bf2b1cdc'
down_revision: Union[str, Sequence[str], None] = 'fcf019838244'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "personal_pool_balance",
            sa.Numeric(12, 2),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "personal_pool_balance")
