"""add trustslip snapshot fields

Revision ID: 20260307_add_trustslip_snapshot_fields
Revises: 20260307_add_user_merchant_visibility_level
Create Date: 2026-03-07
"""

from alembic import op
import sqlalchemy as sa


revision = "20260307_add_trustslip_snapshot_fields"
down_revision = "20260307_add_user_merchant_visibility_level"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("trust_slips", sa.Column("snapshot_json", sa.Text(), nullable=True))
    op.add_column("trust_slips", sa.Column("snapshot_visibility_level", sa.String(length=20), nullable=True))
    op.add_column("trust_slips", sa.Column("snapshot_version", sa.String(length=32), nullable=True))
    op.add_column("trust_slips", sa.Column("snapshot_checksum", sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column("trust_slips", "snapshot_checksum")
    op.drop_column("trust_slips", "snapshot_version")
    op.drop_column("trust_slips", "snapshot_visibility_level")
    op.drop_column("trust_slips", "snapshot_json")