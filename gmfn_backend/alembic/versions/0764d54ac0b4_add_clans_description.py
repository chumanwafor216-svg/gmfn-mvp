"""add clans description

Revision ID: 0764d54ac0b4
Revises: 6eb34d0a081d
Create Date: 2026-02-18
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "0764d54ac0b4"
down_revision = "6eb34d0a081d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("clans", sa.Column("description", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("clans") as batch:
        batch.drop_column("description")