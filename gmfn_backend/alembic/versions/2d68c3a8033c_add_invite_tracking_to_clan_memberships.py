"""add invite tracking to clan_memberships

Revision ID: 2d68c3a8033c
Revises: 6a82a0e464e2
Create Date: 2026-02-08 19:57:41.028388

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2d68c3a8033c'
down_revision: Union[str, Sequence[str], None] = '6a82a0e464e2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
