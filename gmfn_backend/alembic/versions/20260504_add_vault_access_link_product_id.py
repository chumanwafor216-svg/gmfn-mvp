"""add vault access link product scope

Revision ID: 20260504_add_vault_access_link_product_id
Revises: 20260427_add_user_profile_image_url
Create Date: 2026-05-04
"""

from alembic import op
import sqlalchemy as sa


revision = "20260504_add_vault_access_link_product_id"
down_revision = "20260427_add_user_profile_image_url"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    table = "vault_access_links"
    index = "ix_vault_access_links_product_id"

    if not _has_table(bind, table):
        return

    if not _has_column(bind, table, "product_id"):
        op.add_column(table, sa.Column("product_id", sa.Integer(), nullable=True))

    if not _has_index(bind, table, index):
        op.create_index(index, table, ["product_id"])


def downgrade() -> None:
    bind = op.get_bind()
    table = "vault_access_links"
    index = "ix_vault_access_links_product_id"

    if not _has_table(bind, table):
        return

    if _has_index(bind, table, index):
        op.drop_index(index, table_name=table)

    if _has_column(bind, table, "product_id"):
        op.drop_column(table, "product_id")
