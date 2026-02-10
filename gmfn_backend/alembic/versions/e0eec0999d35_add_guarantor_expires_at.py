"""add guarantor expires_at

Revision ID: e0eec0999d35
Revises: 965f8c77c87d
Create Date: 2026-01-29 11:00:20.307047

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e0eec0999d35'
down_revision: Union[str, Sequence[str], None] = '965f8c77c87d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
