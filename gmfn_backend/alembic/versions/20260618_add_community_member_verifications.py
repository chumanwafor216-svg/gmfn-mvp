"""add community member verifications

Revision ID: 20260618_member_verifications
Revises: 20260618_community_domain_affiliations
Create Date: 2026-06-18
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260618_member_verifications"
down_revision = "20260618_community_domain_affiliations"
branch_labels = None
depends_on = None


def _has_table(table_name: str) -> bool:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def upgrade() -> None:
    if _has_table("community_member_verifications"):
        return

    op.create_table(
        "community_member_verifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("clan_id", sa.Integer(), nullable=False),
        sa.Column("subject_user_id", sa.Integer(), nullable=False),
        sa.Column("verifier_user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=24), server_default="active", nullable=False),
        sa.Column("verification_year", sa.Integer(), nullable=False),
        sa.Column("verification_note", sa.Text(), nullable=True),
        sa.Column("claim_label", sa.String(length=160), nullable=True),
        sa.Column("source", sa.String(length=32), server_default="member_witness", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("withdrawn_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("withdrawal_reason", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["subject_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["verifier_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "clan_id",
            "subject_user_id",
            "verifier_user_id",
            name="uq_community_member_verification_once",
        ),
    )
    op.create_index(
        "ix_community_member_verifications_clan_id",
        "community_member_verifications",
        ["clan_id"],
    )
    op.create_index(
        "ix_community_member_verifications_subject_user_id",
        "community_member_verifications",
        ["subject_user_id"],
    )
    op.create_index(
        "ix_community_member_verifications_verifier_user_id",
        "community_member_verifications",
        ["verifier_user_id"],
    )
    op.create_index(
        "ix_community_member_verifications_status",
        "community_member_verifications",
        ["status"],
    )
    op.create_index(
        "ix_community_member_verifications_verification_year",
        "community_member_verifications",
        ["verification_year"],
    )
    op.create_index(
        "ix_community_member_verifications_created_at",
        "community_member_verifications",
        ["created_at"],
    )
    op.create_index(
        "ix_community_member_verifications_valid_until",
        "community_member_verifications",
        ["valid_until"],
    )
    op.create_index(
        "ix_community_member_verifications_subject_status",
        "community_member_verifications",
        ["clan_id", "subject_user_id", "status"],
    )
    op.create_index(
        "ix_community_member_verifications_verifier_year",
        "community_member_verifications",
        ["clan_id", "verifier_user_id", "verification_year"],
    )


def downgrade() -> None:
    if not _has_table("community_member_verifications"):
        return

    op.drop_index(
        "ix_community_member_verifications_verifier_year",
        table_name="community_member_verifications",
    )
    op.drop_index(
        "ix_community_member_verifications_subject_status",
        table_name="community_member_verifications",
    )
    op.drop_index(
        "ix_community_member_verifications_valid_until",
        table_name="community_member_verifications",
    )
    op.drop_index(
        "ix_community_member_verifications_created_at",
        table_name="community_member_verifications",
    )
    op.drop_index(
        "ix_community_member_verifications_verification_year",
        table_name="community_member_verifications",
    )
    op.drop_index(
        "ix_community_member_verifications_status",
        table_name="community_member_verifications",
    )
    op.drop_index(
        "ix_community_member_verifications_verifier_user_id",
        table_name="community_member_verifications",
    )
    op.drop_index(
        "ix_community_member_verifications_subject_user_id",
        table_name="community_member_verifications",
    )
    op.drop_index(
        "ix_community_member_verifications_clan_id",
        table_name="community_member_verifications",
    )
    op.drop_table("community_member_verifications")
