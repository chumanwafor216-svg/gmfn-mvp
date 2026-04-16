"""add missing clan lifecycle columns

Revision ID: 20260415_add_missing_clan_lifecycle_columns
Revises: 20260415_add_clan_community_code
Create Date: 2026-04-15
"""

from alembic import op
import sqlalchemy as sa


revision = "20260415_add_missing_clan_lifecycle_columns"
down_revision = "20260415_add_clan_community_code"
branch_labels = None
depends_on = None


def _has_column(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_column(bind, "clans", "created_by_user_id"):
        op.add_column(
            "clans",
            sa.Column("created_by_user_id", sa.Integer(), nullable=True),
        )
    if not _has_index(bind, "clans", "ix_clans_created_by_user_id"):
        op.create_index(
            "ix_clans_created_by_user_id",
            "clans",
            ["created_by_user_id"],
            unique=False,
        )

    if not _has_column(bind, "clans", "status"):
        op.add_column(
            "clans",
            sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        )
    if not _has_index(bind, "clans", "ix_clans_status"):
        op.create_index("ix_clans_status", "clans", ["status"], unique=False)

    if not _has_column(bind, "clans", "closed_at"):
        op.add_column(
            "clans",
            sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        )

    if not _has_column(bind, "clans", "closed_reason"):
        op.add_column(
            "clans",
            sa.Column("closed_reason", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()

    if _has_column(bind, "clans", "closed_reason"):
        op.drop_column("clans", "closed_reason")

    if _has_column(bind, "clans", "closed_at"):
        op.drop_column("clans", "closed_at")

    if _has_index(bind, "clans", "ix_clans_status"):
        op.drop_index("ix_clans_status", table_name="clans")
    if _has_column(bind, "clans", "status"):
        op.drop_column("clans", "status")

    if _has_index(bind, "clans", "ix_clans_created_by_user_id"):
        op.drop_index("ix_clans_created_by_user_id", table_name="clans")
    if _has_column(bind, "clans", "created_by_user_id"):
        op.drop_column("clans", "created_by_user_id")
