"""add trust band to users

Revision ID: 6a82a0e464e2
Revises: ab472f0cdb57
Create Date: 2026-02-08 16:45:14.074641

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision = "6a82a0e464e2"
down_revision = "ab472f0cdb57"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clan_memberships", sa.Column("invited_by_user_id", sa.Integer(), nullable=True))
    op.add_column("clan_memberships", sa.Column("invite_id", sa.Integer(), nullable=True))
    op.add_column("clan_memberships", sa.Column("left_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("clan_memberships") as batch_op:
        batch_op.drop_column("left_at")
        batch_op.drop_column("invite_id")
        batch_op.drop_column("invited_by_user_id")
