"""add user merchant visibility level

Revision ID: 20260307_add_user_merchant_visibility_level
Revises: 20260307_add_user_global_identity_fields
Create Date: 2026-03-07
"""

from alembic import op
import sqlalchemy as sa


revision = "20260307_add_user_merchant_visibility_level"
down_revision = "20260307_add_user_global_identity_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column(
            "merchant_visibility_level",
            sa.String(length=20),
            nullable=False,
            server_default="standard",
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "merchant_visibility_level")