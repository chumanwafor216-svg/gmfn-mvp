"""add community_code to clan

Revision ID: 20260415_add_clan_community_code
Revises: 20260321_add_marketplace_requests
Create Date: 2026-04-15
"""

from alembic import op
import sqlalchemy as sa


revision = "20260415_add_clan_community_code"
down_revision = "20260321_add_marketplace_requests"
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

    if not _has_column(bind, "clans", "community_code"):
        op.add_column(
            "clans",
            sa.Column("community_code", sa.String(length=32), nullable=True),
        )
    if not _has_index(bind, "clans", "ix_clans_community_code"):
        op.create_index(
            "ix_clans_community_code",
            "clans",
            ["community_code"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()

    if _has_index(bind, "clans", "ix_clans_community_code"):
        op.drop_index("ix_clans_community_code", table_name="clans")
    if _has_column(bind, "clans", "community_code"):
        op.drop_column("clans", "community_code")
