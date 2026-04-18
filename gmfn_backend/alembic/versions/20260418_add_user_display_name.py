"""add user display_name

Revision ID: 20260418_add_user_display_name
Revises: 20260415_add_missing_clan_lifecycle_columns
Create Date: 2026-04-18
"""

from alembic import op
import sqlalchemy as sa


revision = "20260418_add_user_display_name"
down_revision = "20260415_add_missing_clan_lifecycle_columns"
branch_labels = None
depends_on = None


def _has_column(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_column(bind, "users", "display_name"):
        op.add_column(
            "users",
            sa.Column("display_name", sa.String(length=120), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()

    if _has_column(bind, "users", "display_name"):
        op.drop_column("users", "display_name")
