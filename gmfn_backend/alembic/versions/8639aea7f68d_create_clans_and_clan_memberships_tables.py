"""create clans and clan_memberships tables

Revision ID: 8639aea7f68d
Revises: ac0855336945
Create Date: 2026-01-09 22:44:13.077463

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8639aea7f68d'
down_revision: Union[str, Sequence[str], None] = 'ac0855336945'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
