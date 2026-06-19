"""add member witness pending pair guard

Revision ID: 20260619_member_witness_pending_pair_guard
Revises: 20260619_member_verification_requests
Create Date: 2026-06-19
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260619_member_witness_pending_pair_guard"
down_revision = "20260619_member_verification_requests"
branch_labels = None
depends_on = None

TABLE_NAME = "community_member_verification_requests"
INDEX_NAME = "uq_community_member_verification_requests_pending_pair"


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def _duplicate_pending_pairs(bind) -> list[tuple[int, int, int, int]]:
    rows = bind.execute(
        sa.text(
            f"""
            SELECT clan_id, subject_user_id, verifier_user_id, COUNT(*) AS duplicate_count
            FROM {TABLE_NAME}
            WHERE status = 'pending'
            GROUP BY clan_id, subject_user_id, verifier_user_id
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()
    return [(int(row[0]), int(row[1]), int(row[2]), int(row[3])) for row in rows]


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, TABLE_NAME):
        return

    if _has_index(bind, TABLE_NAME, INDEX_NAME):
        return

    duplicates = _duplicate_pending_pairs(bind)
    if duplicates:
        sample = ", ".join(
            f"(clan_id={clan_id}, subject_user_id={subject_id}, verifier_user_id={verifier_id}, count={count})"
            for clan_id, subject_id, verifier_id, count in duplicates[:8]
        )
        raise RuntimeError(
            "Cannot add pending member-witness request uniqueness guard while "
            f"duplicate pending requests exist: {sample}"
        )

    dialect = bind.dialect.name
    if dialect == "postgresql":
        op.create_index(
            INDEX_NAME,
            TABLE_NAME,
            ["clan_id", "subject_user_id", "verifier_user_id"],
            unique=True,
            postgresql_where=sa.text("status = 'pending'"),
        )
        return

    if dialect == "sqlite":
        op.create_index(
            INDEX_NAME,
            TABLE_NAME,
            ["clan_id", "subject_user_id", "verifier_user_id"],
            unique=True,
            sqlite_where=sa.text("status = 'pending'"),
        )
        return

    # Partial unique indexes are not portable to every deployment dialect.
    # Route-level idempotency remains the runtime guard on unsupported dialects.


def downgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, TABLE_NAME):
        return

    if _has_index(bind, TABLE_NAME, INDEX_NAME):
        op.drop_index(INDEX_NAME, table_name=TABLE_NAME)
