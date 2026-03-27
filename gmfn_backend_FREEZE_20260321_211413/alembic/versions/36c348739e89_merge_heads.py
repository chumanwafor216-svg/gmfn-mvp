"""merge heads

Revision ID: 36c348739e89
Revises: 6aaa5a42228a, 6c4b341e82a7
Create Date: 2026-02-04 09:44:54.654005

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '36c348739e89'
down_revision: Union[str, Sequence[str], None] = ('6aaa5a42228a', '6c4b341e82a7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
