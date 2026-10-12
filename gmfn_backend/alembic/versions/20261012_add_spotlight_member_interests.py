"""add spotlight member interests

Revision ID: 20261012_spotlight_member_interests
Revises: 20261012_spotlight_campaigns
Create Date: 2026-10-12
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20261012_spotlight_member_interests"
down_revision = "20261012_spotlight_campaigns"
branch_labels = None
depends_on = None

TABLE = "user_settings"
COLUMN = "spotlight_interests_json"


def _has_table(bind, table_name: str) -> bool:
    return sa.inspect(bind).has_table(table_name)


def _has_column(bind, table_name: str, column_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    return any(col.get("name") == column_name for col in sa.inspect(bind).get_columns(table_name))


def _has_index(bind, table_name: str, index_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    return any(index.get("name") == index_name for index in sa.inspect(bind).get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, TABLE):
        op.create_table(
            TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("tone_preset", sa.String(length=32), nullable=False, server_default="professional-blue"),
            sa.Column("text_size", sa.String(length=16), nullable=False, server_default="standard"),
            sa.Column("contrast", sa.String(length=16), nullable=False, server_default="standard"),
            sa.Column("motion", sa.String(length=16), nullable=False, server_default="normal"),
            sa.Column("density", sa.String(length=16), nullable=False, server_default="comfortable"),
            sa.Column("preferred_language", sa.String(length=40), nullable=False, server_default="English"),
            sa.Column("preferred_currency", sa.String(length=10), nullable=False, server_default="NGN"),
            sa.Column("trust_share_level", sa.String(length=16), nullable=False, server_default="standard"),
            sa.Column("show_phone_public", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("show_whatsapp_public", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("show_telegram_public", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("show_shop_public", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("preferred_community_id", sa.Integer(), nullable=True),
            sa.Column("preferred_landing_tab", sa.String(length=16), nullable=False, server_default="guide"),
            sa.Column("notifications_mode", sa.String(length=16), nullable=False, server_default="summary"),
            sa.Column("quiet_notifications", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("sound_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("unread_first", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("open_actions_directly", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column(COLUMN, sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["preferred_community_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", name="uq_user_settings_user_id"),
        )
    elif not _has_column(bind, TABLE, COLUMN):
        op.add_column(TABLE, sa.Column(COLUMN, sa.Text(), nullable=True))

    for index_name, columns in (
        ("ix_user_settings_id", ["id"]),
        ("ix_user_settings_user_id", ["user_id"]),
        ("ix_user_settings_preferred_community_id", ["preferred_community_id"]),
    ):
        if not _has_index(bind, TABLE, index_name):
            op.create_index(index_name, TABLE, columns)


def downgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, TABLE) and _has_column(bind, TABLE, COLUMN):
        with op.batch_alter_table(TABLE) as batch_op:
            batch_op.drop_column(COLUMN)
