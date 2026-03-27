"""add trust score fields to users

Revision ID: ab472f0cdb57
Revises: ddac49b3215c
Create Date: 2026-02-08 15:48:11.775747

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab472f0cdb57'
down_revision: Union[str, Sequence[str], None] = 'ddac49b3215c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
