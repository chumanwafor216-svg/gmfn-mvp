"""add clan invite_code

Revision ID: 93152e0abe31
Revises: 15ada8104ff2
Create Date: 2026-02-07 00:10:11.478754

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '93152e0abe31'
down_revision: Union[str, Sequence[str], None] = '15ada8104ff2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
