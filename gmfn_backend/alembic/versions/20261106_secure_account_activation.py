"""secure account activation grants

Revision ID: 20261106_secure_activation
Revises: 20261102_taxonomy_authority
Create Date: 2026-11-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261106_secure_activation"
down_revision: Union[str, Sequence[str], None] = "20261102_taxonomy_authority"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "account_activation_grants",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("join_request_id", sa.Integer(), nullable=True),
        sa.Column("source_type", sa.String(length=32), nullable=False),
        sa.Column("status_token_digest", sa.String(length=64), nullable=True),
        sa.Column("activation_token_digest", sa.String(length=64), nullable=False),
        sa.Column("status_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("activation_authorized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("activation_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["join_request_id"], ["clan_join_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("activation_token_digest"),
        sa.UniqueConstraint("join_request_id"),
        sa.UniqueConstraint("status_token_digest"),
    )
    op.create_index(op.f("ix_account_activation_grants_id"), "account_activation_grants", ["id"], unique=False)
    op.create_index(op.f("ix_account_activation_grants_user_id"), "account_activation_grants", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_account_activation_grants_user_id"), table_name="account_activation_grants")
    op.drop_index(op.f("ix_account_activation_grants_id"), table_name="account_activation_grants")
    op.drop_table("account_activation_grants")
