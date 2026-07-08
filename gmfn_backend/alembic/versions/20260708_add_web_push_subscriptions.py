"""add web push subscriptions

Revision ID: 20260708_add_web_push_subscriptions
Revises: 20260628_comm_domain_review_apply_audit
Create Date: 2026-07-08
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260708_add_web_push_subscriptions"
down_revision = "20260628_comm_domain_review_apply_audit"
branch_labels = None
depends_on = None

TABLE = "web_push_subscriptions"


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    if not _has_table(bind, table_name):
        return False
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, TABLE):
        op.create_table(
            TABLE,
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("endpoint_hash", sa.String(length=64), nullable=False),
            sa.Column("endpoint", sa.Text(), nullable=False),
            sa.Column("p256dh", sa.Text(), nullable=False),
            sa.Column("auth", sa.Text(), nullable=False),
            sa.Column("user_agent", sa.String(length=255), nullable=True),
            sa.Column("permission_state", sa.String(length=24), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("failure_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_failure_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("endpoint_hash", name="uq_web_push_endpoint_hash_v1"),
        )

    indexes = (
        ("ix_web_push_subscriptions_id", ["id"]),
        ("ix_web_push_subscriptions_user_id", ["user_id"]),
        ("ix_web_push_user_active_v1", ["user_id", "is_active"]),
    )
    for index_name, columns in indexes:
        if not _has_index(bind, TABLE, index_name):
            op.create_index(index_name, TABLE, columns, unique=False)


def downgrade() -> None:
    bind = op.get_bind()

    for index_name in (
        "ix_web_push_user_active_v1",
        "ix_web_push_subscriptions_user_id",
        "ix_web_push_subscriptions_id",
    ):
        if _has_index(bind, TABLE, index_name):
            op.drop_index(index_name, table_name=TABLE)

    if _has_table(bind, TABLE):
        op.drop_table(TABLE)
