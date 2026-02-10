"""add trust slips

Revision ID: 375c4be49afa
Revises: 7a32a1e5470f
Create Date: 2026-02-10 10:11:47.803425

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '375c4be49afa'
down_revision: Union[str, Sequence[str], None] = '7a32a1e5470f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trust_slips",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(), nullable=False),
        sa.Column("clan_id", sa.Integer(), nullable=False),
        sa.Column("holder_user_id", sa.Integer(), nullable=False),
        sa.Column("trust_limit", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(), nullable=False, server_default="NGN"),
        sa.Column("status", sa.String(), nullable=False, server_default="active"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_release_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_trust_slips_code", "trust_slips", ["code"], unique=True)
    op.create_index("ix_trust_slips_clan_id", "trust_slips", ["clan_id"])
    op.create_index("ix_trust_slips_holder_user_id", "trust_slips", ["holder_user_id"])


def downgrade() -> None:
    op.drop_index("ix_trust_slips_holder_user_id", table_name="trust_slips")
    op.drop_index("ix_trust_slips_clan_id", table_name="trust_slips")
    op.drop_index("ix_trust_slips_code", table_name="trust_slips")
    op.drop_table("trust_slips")
