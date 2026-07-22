"""add market wisdom engine tables

Revision ID: 20260722_market_wisdom_engine
Revises: 20260709_clan_notice_posting_policy
Create Date: 2026-07-22
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260722_market_wisdom_engine"
down_revision = "20260709_clan_notice_posting_policy"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "market_wisdom_sources"):
        op.create_table(
            "market_wisdom_sources",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("source_type", sa.String(length=40), nullable=False),
            sa.Column("source_title", sa.String(length=240), nullable=True),
            sa.Column("source_author", sa.String(length=160), nullable=True),
            sa.Column("source_year", sa.String(length=20), nullable=True),
            sa.Column("source_url", sa.Text(), nullable=True),
            sa.Column("source_note", sa.Text(), nullable=True),
            sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _has_table(bind, "market_wisdom_entries"):
        op.create_table(
            "market_wisdom_entries",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("public_id", sa.String(length=64), nullable=False),
            sa.Column("title", sa.String(length=180), nullable=False),
            sa.Column("principle", sa.Text(), nullable=False),
            sa.Column("short_message", sa.String(length=280), nullable=False),
            sa.Column("explanation", sa.Text(), nullable=True),
            sa.Column("business_application", sa.Text(), nullable=True),
            sa.Column("community_application", sa.Text(), nullable=True),
            sa.Column("leadership_application", sa.Text(), nullable=True),
            sa.Column("action_prompt", sa.String(length=280), nullable=True),
            sa.Column("warning", sa.Text(), nullable=True),
            sa.Column("when_to_apply", sa.Text(), nullable=True),
            sa.Column("when_not_to_apply", sa.Text(), nullable=True),
            sa.Column("category", sa.String(length=80), nullable=False),
            sa.Column("subcategory", sa.String(length=120), nullable=True),
            sa.Column("behaviour_tags_json", sa.Text(), nullable=True),
            sa.Column("context_tags_json", sa.Text(), nullable=True),
            sa.Column("audience_tags_json", sa.Text(), nullable=True),
            sa.Column("related_gsn_modules_json", sa.Text(), nullable=True),
            sa.Column("source_id", sa.Integer(), nullable=True),
            sa.Column("source_type", sa.String(length=40), nullable=False),
            sa.Column("source_title", sa.String(length=240), nullable=True),
            sa.Column("source_author", sa.String(length=160), nullable=True),
            sa.Column("source_year", sa.String(length=20), nullable=True),
            sa.Column("source_url", sa.Text(), nullable=True),
            sa.Column("source_note", sa.Text(), nullable=True),
            sa.Column("evidence_level", sa.String(length=40), nullable=False, server_default="practical"),
            sa.Column("confidence_level", sa.String(length=40), nullable=False, server_default="medium"),
            sa.Column("ethical_risk_level", sa.String(length=40), nullable=False, server_default="low"),
            sa.Column("sensitivity_level", sa.String(length=40), nullable=False, server_default="low"),
            sa.Column("originality_hash", sa.String(length=64), nullable=False),
            sa.Column("semantic_fingerprint", sa.Text(), nullable=False),
            sa.Column("generation_method", sa.String(length=80), nullable=False, server_default="seeded"),
            sa.Column("generation_reason", sa.Text(), nullable=True),
            sa.Column("validation_json", sa.Text(), nullable=True),
            sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("status", sa.String(length=40), nullable=False, server_default="draft"),
            sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("language", sa.String(length=16), nullable=False, server_default="en"),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("reviewed_by", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["source_id"], ["market_wisdom_sources.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("public_id", name="uq_market_wisdom_entries_public_id"),
            sa.UniqueConstraint("originality_hash", name="uq_market_wisdom_entries_originality_hash"),
        )

    if not _has_table(bind, "market_wisdom_exposures"):
        op.create_table(
            "market_wisdom_exposures",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("wisdom_entry_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=True),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("shown_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("opened_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("dismissed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("acted_on_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("feedback", sa.String(length=40), nullable=True),
            sa.Column("outcome_signal", sa.String(length=160), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["wisdom_entry_id"], ["market_wisdom_entries.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _has_table(bind, "market_wisdom_generation_runs"):
        op.create_table(
            "market_wisdom_generation_runs",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("run_type", sa.String(length=60), nullable=False),
            sa.Column("category", sa.String(length=80), nullable=True),
            sa.Column("requested_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("generated_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("approved_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("review_required_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("rejected_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("stop_reason", sa.Text(), nullable=True),
            sa.Column("validation_summary_json", sa.Text(), nullable=True),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    for table_name, columns in {
        "market_wisdom_sources": ["id", "source_type", "source_title", "source_author"],
        "market_wisdom_entries": ["id", "public_id", "source_id", "status", "category", "subcategory", "source_type", "originality_hash", "language", "created_at"],
        "market_wisdom_exposures": ["id", "wisdom_entry_id", "user_id", "clan_id", "shown_at", "feedback", "created_at"],
        "market_wisdom_generation_runs": ["id", "run_type", "category", "created_at"],
    }.items():
        for column in columns:
            index_name = op.f(f"ix_{table_name}_{column}")
            if not _has_index(bind, table_name, index_name):
                op.create_index(index_name, table_name, [column], unique=False)

    if not _has_index(bind, "market_wisdom_entries", "ix_market_wisdom_status_category"):
        op.create_index("ix_market_wisdom_status_category", "market_wisdom_entries", ["status", "category"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()

    for table_name in (
        "market_wisdom_generation_runs",
        "market_wisdom_exposures",
        "market_wisdom_entries",
        "market_wisdom_sources",
    ):
        if _has_table(bind, table_name):
            op.drop_table(table_name)
