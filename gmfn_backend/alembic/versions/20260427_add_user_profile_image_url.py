"""add user profile image url

Revision ID: 20260427_add_user_profile_image_url
Revises: 20260422_add_join_request_activation_fields
Create Date: 2026-04-27
"""

from alembic import op
import sqlalchemy as sa


revision = "20260427_add_user_profile_image_url"
down_revision = "20260422_add_join_request_activation_fields"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    table = "users"

    if not _has_table(bind, table):
        return

    if not _has_column(bind, table, "profile_image_url"):
        op.add_column(
            table,
            sa.Column("profile_image_url", sa.String(length=512), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    table = "users"

    if not _has_table(bind, table):
        return

    if _has_column(bind, table, "profile_image_url"):
        op.drop_column(table, "profile_image_url")
