"""add community domain affiliations

Revision ID: 20260618_community_domain_affiliations
Revises: 20260606_feature_entitlements
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260618_community_domain_affiliations"
down_revision = "20260606_feature_entitlements"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    return bool(sa.inspect(bind).has_table(name))


def upgrade() -> None:
    if _has_table("community_domain_affiliations"):
        return

    op.create_table(
        "community_domain_affiliations",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("parent_clan_id", sa.Integer(), nullable=False),
        sa.Column("affiliate_clan_id", sa.Integer(), nullable=False),
        sa.Column("requested_by_user_id", sa.Integer(), nullable=False),
        sa.Column("decided_by_user_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=24), nullable=False, server_default="pending"),
        sa.Column("request_note", sa.Text(), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["parent_clan_id"], ["clans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["affiliate_clan_id"], ["clans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requested_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["decided_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.UniqueConstraint(
            "parent_clan_id",
            "affiliate_clan_id",
            name="uq_community_domain_affiliation_parent_affiliate",
        ),
    )
    op.create_index("ix_community_domain_affiliations_parent_clan_id", "community_domain_affiliations", ["parent_clan_id"])
    op.create_index("ix_community_domain_affiliations_affiliate_clan_id", "community_domain_affiliations", ["affiliate_clan_id"])
    op.create_index("ix_community_domain_affiliations_requested_by_user_id", "community_domain_affiliations", ["requested_by_user_id"])
    op.create_index("ix_community_domain_affiliations_decided_by_user_id", "community_domain_affiliations", ["decided_by_user_id"])
    op.create_index("ix_community_domain_affiliations_status", "community_domain_affiliations", ["status"])
    op.create_index("ix_community_domain_affiliations_parent_status", "community_domain_affiliations", ["parent_clan_id", "status"])
    op.create_index("ix_community_domain_affiliations_affiliate_status", "community_domain_affiliations", ["affiliate_clan_id", "status"])


def downgrade() -> None:
    if not _has_table("community_domain_affiliations"):
        return

    op.drop_index("ix_community_domain_affiliations_affiliate_status", table_name="community_domain_affiliations")
    op.drop_index("ix_community_domain_affiliations_parent_status", table_name="community_domain_affiliations")
    op.drop_index("ix_community_domain_affiliations_status", table_name="community_domain_affiliations")
    op.drop_index("ix_community_domain_affiliations_decided_by_user_id", table_name="community_domain_affiliations")
    op.drop_index("ix_community_domain_affiliations_requested_by_user_id", table_name="community_domain_affiliations")
    op.drop_index("ix_community_domain_affiliations_affiliate_clan_id", table_name="community_domain_affiliations")
    op.drop_index("ix_community_domain_affiliations_parent_clan_id", table_name="community_domain_affiliations")
    op.drop_table("community_domain_affiliations")
