"""add community confirmation review evidence

Revision ID: 20260516_add_community_confirmation_review_evidence
Revises: 20260516_add_community_confirmation_review_cases
Create Date: 2026-05-16
"""

from alembic import op
import sqlalchemy as sa


revision = "20260516_add_community_confirmation_review_evidence"
down_revision = "20260516_add_community_confirmation_review_cases"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def _create_index_if_missing(
    bind,
    index_name: str,
    table_name: str,
    columns: list[str],
    *,
    unique: bool = False,
) -> None:
    if _has_table(bind, table_name) and not _has_index(bind, table_name, index_name):
        op.create_index(index_name, table_name, columns, unique=unique)


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "community_confirmation_review_evidence"):
        op.create_table(
            "community_confirmation_review_evidence",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("review_case_id", sa.Integer(), nullable=False),
            sa.Column("request_id", sa.Integer(), nullable=False),
            sa.Column("community_id", sa.Integer(), nullable=False),
            sa.Column("subject_user_id", sa.Integer(), nullable=False),
            sa.Column("added_by_user_id", sa.Integer(), nullable=False),
            sa.Column("evidence_type", sa.String(length=32), nullable=False),
            sa.Column("title", sa.String(length=160), nullable=False),
            sa.Column("body", sa.Text(), nullable=True),
            sa.Column("external_ref", sa.String(length=240), nullable=True),
            sa.Column("visibility", sa.String(length=24), server_default="internal", nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["added_by_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["community_id"], ["clans.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["request_id"], ["community_confirmation_requests.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["review_case_id"], ["community_confirmation_review_cases.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["subject_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    _create_index_if_missing(bind, "ix_community_confirmation_review_evidence_id", "community_confirmation_review_evidence", ["id"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_evidence_review_case_id", "community_confirmation_review_evidence", ["review_case_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_evidence_request_id", "community_confirmation_review_evidence", ["request_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_evidence_community_id", "community_confirmation_review_evidence", ["community_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_evidence_subject_user_id", "community_confirmation_review_evidence", ["subject_user_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_evidence_added_by_user_id", "community_confirmation_review_evidence", ["added_by_user_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_evidence_evidence_type", "community_confirmation_review_evidence", ["evidence_type"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_evidence_visibility", "community_confirmation_review_evidence", ["visibility"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_evidence_created_at", "community_confirmation_review_evidence", ["created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, "community_confirmation_review_evidence"):
        op.drop_table("community_confirmation_review_evidence")
