"""add clan notice posting policy

Revision ID: 20260709_clan_notice_posting_policy
Revises: 20260708_add_web_push_subscriptions
Create Date: 2026-07-09
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260709_clan_notice_posting_policy"
down_revision = "20260708_add_web_push_subscriptions"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(bind, table_name: str, column_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    inspector = sa.inspect(bind)
    return any(column["name"] == column_name for column in inspector.get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    if not _has_column(bind, "clans", "notice_posting_policy"):
        op.add_column(
            "clans",
            sa.Column(
                "notice_posting_policy",
                sa.String(length=20),
                nullable=False,
                server_default="members",
            ),
        )


def downgrade() -> None:
    bind = op.get_bind()
    if _has_column(bind, "clans", "notice_posting_policy"):
        op.drop_column("clans", "notice_posting_policy")
