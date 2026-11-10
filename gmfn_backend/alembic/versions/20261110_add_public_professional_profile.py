"""add opt-in public professional profile

Revision ID: 20261110_public_profile
Revises: 20261106_assisted_activation
Create Date: 2026-11-10
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261110_public_profile"
down_revision: Union[str, Sequence[str], None] = "20261106_assisted_activation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("professional_headline", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("professional_summary", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "public_professional_profile_enabled",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "public_professional_profile_enabled")
    op.drop_column("users", "professional_summary")
    op.drop_column("users", "professional_headline")
