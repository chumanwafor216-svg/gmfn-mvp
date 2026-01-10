"""create clans and clan_memberships tables

Revision ID: ac0855336945
Revises: e2ae44a31eb1
Create Date: 2026-01-09 22:42:13.884370

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ac0855336945'
down_revision: Union[str, Sequence[str], None] = 'e2ae44a31eb1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
