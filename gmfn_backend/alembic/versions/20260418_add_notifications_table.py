"""add notifications table

Revision ID: 20260418_add_notifications_table
Revises: 20260418_add_entry_bank_details_and_payout_destinations
Create Date: 2026-04-18
"""

from alembic import op
import sqlalchemy as sa


revision = "20260418_add_notifications_table"
down_revision = "20260418_add_entry_bank_details_and_payout_destinations"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "notifications"):
        op.create_table(
            "notifications",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("kind", sa.String(length=64), nullable=False),
            sa.Column("title", sa.String(length=200), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("action_url", sa.String(length=255), nullable=True),
            sa.Column("action_label", sa.String(length=100), nullable=True),
            sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _has_index(bind, "notifications", op.f("ix_notifications_id")):
        op.create_index(op.f("ix_notifications_id"), "notifications", ["id"], unique=False)
    if not _has_index(bind, "notifications", op.f("ix_notifications_user_id")):
        op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)
    if not _has_index(bind, "notifications", "ix_notifications_user_read_v1"):
        op.create_index(
            "ix_notifications_user_read_v1",
            "notifications",
            ["user_id", "is_read"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()

    if _has_index(bind, "notifications", "ix_notifications_user_read_v1"):
        op.drop_index("ix_notifications_user_read_v1", table_name="notifications")
    if _has_index(bind, "notifications", op.f("ix_notifications_user_id")):
        op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    if _has_index(bind, "notifications", op.f("ix_notifications_id")):
        op.drop_index(op.f("ix_notifications_id"), table_name="notifications")
    if _has_table(bind, "notifications"):
        op.drop_table("notifications")
