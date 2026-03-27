"""merge heads after invite tracking

Revision ID: 7a32a1e5470f
Revises: 2d68c3a8033c, d7f63a000fd3
Create Date: 2026-02-08 20:58:46.798622

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a32a1e5470f'
down_revision: Union[str, Sequence[str], None] = ('2d68c3a8033c', 'd7f63a000fd3')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
