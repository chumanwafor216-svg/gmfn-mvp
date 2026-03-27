"""add loan pool accounting fields

Revision ID: 6eb34d0a081d
Revises: b2dd956ea030
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "6eb34d0a081d"
down_revision = "b2dd956ea030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("loans", sa.Column("personal_pool_at_request", sa.Numeric(18, 2), nullable=False, server_default="0"))
    op.add_column("loans", sa.Column("pool_used", sa.Numeric(18, 2), nullable=False, server_default="0"))
    op.add_column("loans", sa.Column("guarantee_gap", sa.Numeric(18, 2), nullable=False, server_default="0"))


def downgrade() -> None:
    with op.batch_alter_table("loans") as batch:
        batch.drop_column("guarantee_gap")
        batch.drop_column("pool_used")
        batch.drop_column("personal_pool_at_request")