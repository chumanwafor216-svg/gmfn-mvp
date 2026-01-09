"""add loan decision audit fields

Revision ID: 37ee40c970ca
Revises: 9ae4d08cbb51
Create Date: 2026-01-06 09:33:32.183524

"""
from alembic import op
import sqlalchemy as sa

revision = "37ee40c970ca"
down_revision = "9ae4d08cbb51"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("loans", sa.Column("decision_by_user_id", sa.Integer(), nullable=True))
    op.add_column("loans", sa.Column("decision_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("loans", "decision_at")
    op.drop_column("loans", "decision_by_user_id")
