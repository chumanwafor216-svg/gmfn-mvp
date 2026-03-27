"""add clan invite expiry

Revision ID: 2daff2d6106d
Revises: 3fea3fb9862e
Create Date: 2026-02-07 01:15:37.958045

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2daff2d6106d'
down_revision: Union[str, Sequence[str], None] = '15ada8104ff2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "clans",
        sa.Column("invite_created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "clans",
        sa.Column("invite_expires_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("clans", "invite_expires_at")
    op.drop_column("clans", "invite_created_at")
