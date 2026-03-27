"""add invite usage limits

Revision ID: d52331b29d03
Revises: 2daff2d6106d
Create Date: 2026-02-07 19:26:10.038156

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd52331b29d03'
down_revision: Union[str, Sequence[str], None] = '2daff2d6106d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
