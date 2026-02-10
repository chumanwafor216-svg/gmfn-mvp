"""add locking fields to loan_guarantors

Revision ID: 6aaa5a42228a
Revises: 9418bf2b1cdc
Create Date: 2026-01-30 08:36:00.944041

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6aaa5a42228a'
down_revision: Union[str, Sequence[str], None] = '9418bf2b1cdc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
