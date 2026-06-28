"""add community domain review revisions

Revision ID: 20260628_comm_domain_review_revisions
Revises: 20260628_comm_domain_review_decisions
Create Date: 2026-06-28
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260628_comm_domain_review_revisions"
down_revision = "20260628_comm_domain_review_decisions"
branch_labels = None
depends_on = None

TABLE = "community_domain_action_reviews"
COLUMN = "parent_review_id"
INDEX = "ix_comm_action_reviews_parent"
FK = "fk_comm_action_reviews_parent"


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    if not _has_table(bind, table_name):
        return False
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    if not _has_table(bind, table_name):
        return False
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def _has_foreign_key(bind, table_name: str, fk_name: str) -> bool:
    inspector = sa.inspect(bind)
    if not _has_table(bind, table_name):
        return False
    return any(fk.get("name") == fk_name for fk in inspector.get_foreign_keys(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    if not _has_table(bind, TABLE):
        return

    needs_column = not _has_column(bind, TABLE, COLUMN)
    needs_fk = not _has_foreign_key(bind, TABLE, FK)
    if needs_column or needs_fk:
        with op.batch_alter_table(TABLE) as batch_op:
            if needs_column:
                batch_op.add_column(sa.Column(COLUMN, sa.Integer(), nullable=True))
            if needs_fk:
                batch_op.create_foreign_key(
                    FK,
                    TABLE,
                    [COLUMN],
                    ["id"],
                    ondelete="SET NULL",
                )

    if not _has_index(bind, TABLE, INDEX):
        op.create_index(INDEX, TABLE, [COLUMN], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_table(bind, TABLE):
        return

    if _has_index(bind, TABLE, INDEX):
        op.drop_index(INDEX, table_name=TABLE)

    has_column = _has_column(bind, TABLE, COLUMN)
    has_fk = _has_foreign_key(bind, TABLE, FK)
    if has_column or has_fk:
        with op.batch_alter_table(TABLE) as batch_op:
            if has_fk:
                batch_op.drop_constraint(FK, type_="foreignkey")
            if has_column:
                batch_op.drop_column(COLUMN)
