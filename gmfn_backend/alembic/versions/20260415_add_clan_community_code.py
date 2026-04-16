"""add community_code to clan

Revision ID: 20260415_add_clan_community_code
Revises: 20260321_add_marketplace_requests
Create Date: 2026-04-15
"""

from alembic import op
import sqlalchemy as sa


revision = "20260415_add_clan_community_code"
down_revision = "20260321_add_marketplace_requests"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "clans",
        sa.Column("community_code", sa.String(length=32), nullable=True),
    )
    op.create_index(
        "ix_clans_community_code",
        "clans",
        ["community_code"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_clans_community_code", table_name="clans")
    op.drop_column("clans", "community_code")
