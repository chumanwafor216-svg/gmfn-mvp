"""add community domain review apply audit

Revision ID: 20260628_comm_domain_review_apply_audit
Revises: 20260628_comm_domain_review_evidence
Create Date: 2026-06-28
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260628_comm_domain_review_apply_audit"
down_revision = "20260628_comm_domain_review_evidence"
branch_labels = None
depends_on = None

TABLE = "community_domain_action_reviews"
APPLIER_COLUMN = "applied_by_user_id"
APPLIED_AT_COLUMN = "applied_at"
APPLIER_INDEX = "ix_comm_action_reviews_applied_by"
APPLIED_AT_INDEX = "ix_comm_action_reviews_applied_at"
APPLIER_FK = "fk_comm_action_reviews_applied_by"


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

    needs_applier = not _has_column(bind, TABLE, APPLIER_COLUMN)
    needs_applied_at = not _has_column(bind, TABLE, APPLIED_AT_COLUMN)
    needs_fk = not _has_foreign_key(bind, TABLE, APPLIER_FK)
    if needs_applier or needs_applied_at or needs_fk:
        with op.batch_alter_table(TABLE) as batch_op:
            if needs_applier:
                batch_op.add_column(sa.Column(APPLIER_COLUMN, sa.Integer(), nullable=True))
            if needs_applied_at:
                batch_op.add_column(
                    sa.Column(APPLIED_AT_COLUMN, sa.DateTime(timezone=True), nullable=True)
                )
            if needs_fk:
                batch_op.create_foreign_key(
                    APPLIER_FK,
                    "users",
                    [APPLIER_COLUMN],
                    ["id"],
                    ondelete="SET NULL",
                )

    if not _has_index(bind, TABLE, APPLIER_INDEX):
        op.create_index(APPLIER_INDEX, TABLE, [APPLIER_COLUMN], unique=False)
    if not _has_index(bind, TABLE, APPLIED_AT_INDEX):
        op.create_index(APPLIED_AT_INDEX, TABLE, [APPLIED_AT_COLUMN], unique=False)


def downgrade() -> None:
    bind = op.get_bind()
    if not _has_table(bind, TABLE):
        return

    for index_name in (APPLIED_AT_INDEX, APPLIER_INDEX):
        if _has_index(bind, TABLE, index_name):
            op.drop_index(index_name, table_name=TABLE)

    has_applier = _has_column(bind, TABLE, APPLIER_COLUMN)
    has_applied_at = _has_column(bind, TABLE, APPLIED_AT_COLUMN)
    has_fk = _has_foreign_key(bind, TABLE, APPLIER_FK)
    if has_applier or has_applied_at or has_fk:
        with op.batch_alter_table(TABLE) as batch_op:
            if has_fk:
                batch_op.drop_constraint(APPLIER_FK, type_="foreignkey")
            if has_applied_at:
                batch_op.drop_column(APPLIED_AT_COLUMN)
            if has_applier:
                batch_op.drop_column(APPLIER_COLUMN)
