"""add user global identity fields

Revision ID: 20260307_add_user_global_identity_fields
Revises:
Create Date: 2026-03-07
"""

from alembic import op
import sqlalchemy as sa


revision = "20260307_add_user_global_identity_fields"
down_revision = "20260224_bank_partial_credit"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("gmfn_id", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("phone_e164", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("phone_verified_at", sa.DateTime(timezone=True), nullable=True))

    op.create_index("ix_users_gmfn_id", "users", ["gmfn_id"], unique=True)
    op.create_index("ix_users_phone_e164", "users", ["phone_e164"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_phone_e164", table_name="users")
    op.drop_index("ix_users_gmfn_id", table_name="users")

    op.drop_column("users", "phone_verified_at")
    op.drop_column("users", "phone_e164")
    op.drop_column("users", "gmfn_id")