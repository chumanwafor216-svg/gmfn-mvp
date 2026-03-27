"""add marketplace identity to clan

Revision ID: f3c2c95a3767
Revises: 646d515f2cbc
Create Date: 2026-03-15

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f3c2c95a3767"
down_revision: Union[str, None] = "646d515f2cbc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "clans",
        sa.Column("marketplace_name", sa.String(length=160), nullable=True),
    )
    op.add_column(
        "clans",
        sa.Column("marketplace_description", sa.Text(), nullable=True),
    )
    op.create_index(
        "ix_clans_marketplace_name",
        "clans",
        ["marketplace_name"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_clans_marketplace_name", table_name="clans")
    op.drop_column("clans", "marketplace_description")
    op.drop_column("clans", "marketplace_name")