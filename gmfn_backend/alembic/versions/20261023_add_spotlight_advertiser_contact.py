"""add Spotlight advertiser contact phone

Revision ID: 20261023_spotlight_contact
Revises: 20261023_parallel_gsn_house
Create Date: 2026-10-23
"""

from alembic import op
import sqlalchemy as sa


revision = "20261023_spotlight_contact"
down_revision = "20261023_parallel_gsn_house"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "marketplace_broadcasts",
        sa.Column("advertiser_contact_phone", sa.String(length=32), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("marketplace_broadcasts", "advertiser_contact_phone")
