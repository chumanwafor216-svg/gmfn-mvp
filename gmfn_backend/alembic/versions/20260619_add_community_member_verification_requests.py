"""add community member verification requests

Revision ID: 20260619_member_verification_requests
Revises: 20260618_member_verifications
Create Date: 2026-06-19
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260619_member_verification_requests"
down_revision = "20260618_member_verifications"
branch_labels = None
depends_on = None

TABLE_NAME = "community_member_verification_requests"
PENDING_PAIR_INDEX = "uq_community_member_verification_requests_pending_pair"


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def _duplicate_pending_pairs(bind) -> list[tuple[int, int, int, int]]:
    rows = bind.execute(
        sa.text(
            f"""
            SELECT clan_id, subject_user_id, verifier_user_id, COUNT(*) AS count
            FROM {TABLE_NAME}
            WHERE status = 'pending'
            GROUP BY clan_id, subject_user_id, verifier_user_id
            HAVING COUNT(*) > 1
            """
        )
    ).fetchall()
    return [
        (
            int(row[0]),
            int(row[1]),
            int(row[2]),
            int(row[3]),
        )
        for row in rows
    ]


def _create_pending_pair_index() -> None:
    bind = op.get_bind()
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
            PENDING_PAIR_INDEX,
            TABLE_NAME,
            ["clan_id", "subject_user_id", "verifier_user_id"],
            unique=True,
            postgresql_where=sa.text("status = 'pending'"),
        )
        return

    if dialect == "sqlite":
        op.create_index(
            PENDING_PAIR_INDEX,
            TABLE_NAME,
            ["clan_id", "subject_user_id", "verifier_user_id"],
            unique=True,
            sqlite_where=sa.text("status = 'pending'"),
        )
        return

    # Partial unique indexes are not portable to every deployment dialect.
    # Route-level idempotency remains the runtime guard on unsupported dialects.


def upgrade() -> None:
    if _has_table(TABLE_NAME):
        if not _has_index(TABLE_NAME, PENDING_PAIR_INDEX):
            _create_pending_pair_index()
        return

    op.create_table(
        TABLE_NAME,
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("clan_id", sa.Integer(), nullable=False),
        sa.Column("subject_user_id", sa.Integer(), nullable=False),
        sa.Column("verifier_user_id", sa.Integer(), nullable=False),
        sa.Column("requested_by_user_id", sa.Integer(), nullable=False),
        sa.Column("resulting_verification_id", sa.Integer(), nullable=True),
        sa.Column("public_token", sa.String(length=80), nullable=False),
        sa.Column("one_time_code", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=24), server_default="pending", nullable=False),
        sa.Column("claim_label", sa.String(length=160), nullable=True),
        sa.Column("request_note", sa.Text(), nullable=True),
        sa.Column("response_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["verifier_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["resulting_verification_id"],
            ["community_member_verifications.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "public_token",
            name="uq_community_member_verification_request_token",
        ),
    )
    op.create_index(
        "ix_community_member_verification_requests_clan_id",
        TABLE_NAME,
        ["clan_id"],
    )
    op.create_index(
        "ix_community_member_verification_requests_subject_user_id",
        TABLE_NAME,
        ["subject_user_id"],
    )
    op.create_index(
        "ix_community_member_verification_requests_verifier_user_id",
        TABLE_NAME,
        ["verifier_user_id"],
    )
    op.create_index(
        "ix_community_member_verification_requests_requested_by_user_id",
        TABLE_NAME,
        ["requested_by_user_id"],
    )
    op.create_index(
        "ix_community_member_verification_requests_resulting_verification_id",
        TABLE_NAME,
        ["resulting_verification_id"],
    )
    op.create_index(
        "ix_community_member_verification_requests_public_token",
        TABLE_NAME,
        ["public_token"],
    )
    op.create_index(
        "ix_community_member_verification_requests_one_time_code",
        TABLE_NAME,
        ["one_time_code"],
    )
    op.create_index(
        "ix_community_member_verification_requests_status",
        TABLE_NAME,
        ["status"],
    )
    op.create_index(
        "ix_community_member_verification_requests_created_at",
        TABLE_NAME,
        ["created_at"],
    )
    op.create_index(
        "ix_community_member_verification_requests_expires_at",
        TABLE_NAME,
        ["expires_at"],
    )
    op.create_index(
        "ix_community_member_verification_requests_subject_status",
        TABLE_NAME,
        ["clan_id", "subject_user_id", "status"],
    )
    op.create_index(
        "ix_community_member_verification_requests_verifier_status",
        TABLE_NAME,
        ["clan_id", "verifier_user_id", "status"],
    )
    _create_pending_pair_index()


def downgrade() -> None:
    if not _has_table(TABLE_NAME):
        return

    if _has_index(TABLE_NAME, PENDING_PAIR_INDEX):
        op.drop_index(
            PENDING_PAIR_INDEX,
            table_name=TABLE_NAME,
        )
    op.drop_index(
        "ix_community_member_verification_requests_verifier_status",
        table_name=TABLE_NAME,
    )
    op.drop_index(
        "ix_community_member_verification_requests_subject_status",
        table_name="community_member_verification_requests",
    )
    op.drop_index(
        "ix_community_member_verification_requests_expires_at",
        table_name="community_member_verification_requests",
    )
    op.drop_index(
        "ix_community_member_verification_requests_created_at",
        table_name="community_member_verification_requests",
    )
    op.drop_index(
        "ix_community_member_verification_requests_status",
        table_name="community_member_verification_requests",
    )
    op.drop_index(
        "ix_community_member_verification_requests_one_time_code",
        table_name="community_member_verification_requests",
    )
    op.drop_index(
        "ix_community_member_verification_requests_public_token",
        table_name="community_member_verification_requests",
    )
    op.drop_index(
        "ix_community_member_verification_requests_resulting_verification_id",
        table_name="community_member_verification_requests",
    )
    op.drop_index(
        "ix_community_member_verification_requests_requested_by_user_id",
        table_name="community_member_verification_requests",
    )
    op.drop_index(
        "ix_community_member_verification_requests_verifier_user_id",
        table_name="community_member_verification_requests",
    )
    op.drop_index(
        "ix_community_member_verification_requests_subject_user_id",
        table_name="community_member_verification_requests",
    )
    op.drop_index(
        "ix_community_member_verification_requests_clan_id",
        table_name="community_member_verification_requests",
    )
    op.drop_table("community_member_verification_requests")
