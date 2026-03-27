"""add marketplace requests

Revision ID: 20260321_add_marketplace_requests
Revises: 662d715feb98, e4cf68bffd20
Create Date: 2026-03-21
"""

from alembic import op
import sqlalchemy as sa


revision = "20260321_add_marketplace_requests"
down_revision = ("662d715feb98", "e4cf68bffd20")
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "marketplace_requests",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=80), nullable=True),
        sa.Column("urgency", sa.String(length=20), nullable=True),
        sa.Column("area", sa.String(length=120), nullable=True),
        sa.Column("whatsapp_number", sa.String(length=40), nullable=True),
        sa.Column("payment_mode", sa.String(length=40), nullable=True),
        sa.Column("allow_trust_credit", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index("ix_marketplace_requests_id", "marketplace_requests", ["id"])
    op.create_index("ix_marketplace_requests_user_id", "marketplace_requests", ["user_id"])
    op.create_index("ix_marketplace_requests_status", "marketplace_requests", ["status"])
    op.create_index("ix_marketplace_requests_expires_at", "marketplace_requests", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_marketplace_requests_expires_at", table_name="marketplace_requests")
    op.drop_index("ix_marketplace_requests_status", table_name="marketplace_requests")
    op.drop_index("ix_marketplace_requests_user_id", table_name="marketplace_requests")
    op.drop_index("ix_marketplace_requests_id", table_name="marketplace_requests")
    op.drop_table("marketplace_requests")