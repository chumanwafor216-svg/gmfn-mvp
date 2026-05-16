"""add community confirmation review cases

Revision ID: 20260516_add_community_confirmation_review_cases
Revises: 20260515_add_community_confirmation_decisions
Create Date: 2026-05-16
"""

from alembic import op
import sqlalchemy as sa


revision = "20260516_add_community_confirmation_review_cases"
down_revision = "20260515_add_community_confirmation_decisions"
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

    if not _has_table(bind, "community_confirmation_review_cases"):
        op.create_table(
            "community_confirmation_review_cases",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("request_id", sa.Integer(), nullable=False),
            sa.Column("decision_id", sa.Integer(), nullable=True),
            sa.Column("community_id", sa.Integer(), nullable=False),
            sa.Column("subject_user_id", sa.Integer(), nullable=False),
            sa.Column("opened_by_user_id", sa.Integer(), nullable=False),
            sa.Column("assigned_to_user_id", sa.Integer(), nullable=True),
            sa.Column("status", sa.String(length=24), server_default="open", nullable=False),
            sa.Column("review_reason", sa.String(length=80), nullable=True),
            sa.Column("reviewer_note", sa.Text(), nullable=True),
            sa.Column("resolution", sa.String(length=48), nullable=True),
            sa.Column("resolution_note", sa.Text(), nullable=True),
            sa.Column("trust_impact", sa.String(length=24), server_default="none", nullable=False),
            sa.Column("evidence_summary_json", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["assigned_to_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["community_id"], ["clans.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["decision_id"], ["community_confirmation_decisions.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["opened_by_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["request_id"], ["community_confirmation_requests.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["subject_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("request_id", name="uq_community_confirmation_review_case_request"),
        )

    _create_index_if_missing(bind, "ix_community_confirmation_review_cases_id", "community_confirmation_review_cases", ["id"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_cases_request_id", "community_confirmation_review_cases", ["request_id"], unique=True)
    _create_index_if_missing(bind, "ix_community_confirmation_review_cases_decision_id", "community_confirmation_review_cases", ["decision_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_cases_community_id", "community_confirmation_review_cases", ["community_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_cases_subject_user_id", "community_confirmation_review_cases", ["subject_user_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_cases_opened_by_user_id", "community_confirmation_review_cases", ["opened_by_user_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_cases_assigned_to_user_id", "community_confirmation_review_cases", ["assigned_to_user_id"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_cases_status", "community_confirmation_review_cases", ["status"])
    _create_index_if_missing(bind, "ix_community_confirmation_review_cases_created_at", "community_confirmation_review_cases", ["created_at"])


def downgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, "community_confirmation_review_cases"):
        op.drop_table("community_confirmation_review_cases")
