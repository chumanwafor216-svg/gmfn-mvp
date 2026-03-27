"""add_pool_events (sqlite-safe)

Revision ID: 10a0d435bd24
Revises: 2bef989afc5f
Create Date: 2026-02-22
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "10a0d435bd24"
down_revision = "2bef989afc5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ONLY create pool_events. Do NOT include unrelated autogen alters (SQLite can't ALTER COLUMN).
    op.create_table(
        "pool_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("clan_id", sa.Integer(), sa.ForeignKey("clans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="NGN"),
        sa.Column("reference", sa.String(length=64), nullable=True),
        sa.Column("note", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("confirmed_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )

    op.create_index("ix_pool_events_id", "pool_events", ["id"])
    op.create_index("ix_pool_events_clan_id", "pool_events", ["clan_id"])
    op.create_index("ix_pool_events_user_id", "pool_events", ["user_id"])
    op.create_index("ix_pool_events_event_type", "pool_events", ["event_type"])


def downgrade() -> None:
    op.drop_index("ix_pool_events_event_type", table_name="pool_events")
    op.drop_index("ix_pool_events_user_id", table_name="pool_events")
    op.drop_index("ix_pool_events_clan_id", table_name="pool_events")
    op.drop_index("ix_pool_events_id", table_name="pool_events")
    op.drop_table("pool_events")