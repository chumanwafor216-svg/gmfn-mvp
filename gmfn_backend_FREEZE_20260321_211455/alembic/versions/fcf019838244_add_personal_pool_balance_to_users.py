"""add personal_pool_balance to users

Revision ID: fcf019838244
Revises: e0eec0999d35
Create Date: 2026-01-30 07:42:53.260357

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fcf019838244'
down_revision: Union[str, Sequence[str], None] = 'e0eec0999d35'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
