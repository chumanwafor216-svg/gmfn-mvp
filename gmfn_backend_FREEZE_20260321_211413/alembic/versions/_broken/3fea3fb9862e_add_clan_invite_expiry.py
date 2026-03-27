"""add clan invite expiry

Revision ID: 3fea3fb9862e
Revises: 93152e0abe31
Create Date: 2026-02-07 01:09:37.980543

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3fea3fb9862e'
down_revision: Union[str, Sequence[str], None] = '93152e0abe31'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
