"""add pending join request uniqueness guard

Revision ID: 20260510_add_pending_join_request_unique_guard
Revises: 20260504_add_vault_domain_tables
Create Date: 2026-05-10
"""

from alembic import op
import sqlalchemy as sa


revision = "20260510_add_pending_join_request_unique_guard"
down_revision = "20260504_add_vault_domain_tables"
branch_labels = None
depends_on = None


INDEX_NAME = "uq_clan_join_requests_pending_user_clan"
TABLE_NAME = "clan_join_requests"


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def _duplicate_pending_requests(bind) -> list[tuple[int, int, int]]:
    rows = bind.execute(
        sa.text(
            """
            SELECT clan_id, applicant_user_id, COUNT(*) AS duplicate_count
            FROM clan_join_requests
            WHERE status = 'pending'
            GROUP BY clan_id, applicant_user_id
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()
    return [(int(row[0]), int(row[1]), int(row[2])) for row in rows]


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, TABLE_NAME):
        return

    if _has_index(bind, TABLE_NAME, INDEX_NAME):
        return

    duplicates = _duplicate_pending_requests(bind)
    if duplicates:
        sample = ", ".join(
            f"(clan_id={clan_id}, applicant_user_id={user_id}, count={count})"
            for clan_id, user_id, count in duplicates[:8]
        )
        raise RuntimeError(
            "Cannot add pending join request uniqueness guard while duplicate "
            f"pending requests exist: {sample}"
        )

    dialect = bind.dialect.name
    if dialect == "postgresql":
        op.create_index(
            INDEX_NAME,
            TABLE_NAME,
            ["clan_id", "applicant_user_id"],
            unique=True,
            postgresql_where=sa.text("status = 'pending'"),
        )
        return

    if dialect == "sqlite":
        op.create_index(
            INDEX_NAME,
            TABLE_NAME,
            ["clan_id", "applicant_user_id"],
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
