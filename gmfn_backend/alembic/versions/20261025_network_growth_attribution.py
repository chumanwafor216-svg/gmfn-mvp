"""add consent-bound network growth attribution

Revision ID: 20261025_network_growth
Revises: 20261023_spotlight_contact
Create Date: 2026-10-25
"""

from alembic import op
import sqlalchemy as sa


revision = "20261025_network_growth"
down_revision = "20261023_spotlight_contact"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "network_growth_attributions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("claim_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("participant_user_id", sa.Integer(), nullable=False),
        sa.Column("claimant_user_id", sa.Integer(), nullable=False),
        sa.Column("source_kind", sa.String(length=32), nullable=False),
        sa.Column(
            "participant_kind",
            sa.String(length=32),
            server_default="member",
            nullable=False,
        ),
        sa.Column("source_reference", sa.String(length=160), nullable=True),
        sa.Column("evidence_note", sa.Text(), nullable=True),
        sa.Column(
            "source_evidence_status",
            sa.String(length=32),
            server_default="claimant_statement",
            nullable=False,
        ),
        sa.Column("clan_id", sa.Integer(), nullable=True),
        sa.Column("invite_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("challenge_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("challenged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "source_kind IN ('community_invite', 'community_qr', 'social_campaign', "
            "'direct_referral', 'community_event', 'other')",
            name="ck_network_growth_attributions_source_kind",
        ),
        sa.CheckConstraint(
            "participant_kind IN ('member', 'seller', 'advertiser', "
            "'community_founder', 'other')",
            name="ck_network_growth_attributions_participant_kind",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'accepted', 'challenged', 'superseded')",
            name="ck_network_growth_attributions_status",
        ),
        sa.CheckConstraint(
            "source_evidence_status IN ('claimant_statement', 'verified_invite_record')",
            name="ck_network_growth_attributions_evidence_status",
        ),
        sa.CheckConstraint(
            "participant_user_id <> claimant_user_id",
            name="ck_network_growth_attributions_distinct_people",
        ),
        sa.ForeignKeyConstraint(["participant_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["claimant_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["invite_id"], ["clan_invites.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "claim_fingerprint",
            name="uq_network_growth_attributions_fingerprint",
        ),
    )
    op.create_index(
        "uq_network_growth_attributions_one_accepted_participant",
        "network_growth_attributions",
        ["participant_user_id"],
        unique=True,
        sqlite_where=sa.text("status = 'accepted'"),
        postgresql_where=sa.text("status = 'accepted'"),
    )
    op.create_index(
        "ix_network_growth_attributions_participant_status",
        "network_growth_attributions",
        ["participant_user_id", "status"],
    )
    op.create_index(
        "ix_network_growth_attributions_claimant_status",
        "network_growth_attributions",
        ["claimant_user_id", "status"],
    )
    op.create_index(
        "ix_network_growth_attributions_source_kind",
        "network_growth_attributions",
        ["source_kind"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_network_growth_attributions_source_kind",
        table_name="network_growth_attributions",
    )
    op.drop_index(
        "ix_network_growth_attributions_claimant_status",
        table_name="network_growth_attributions",
    )
    op.drop_index(
        "ix_network_growth_attributions_participant_status",
        table_name="network_growth_attributions",
    )
    op.drop_index(
        "uq_network_growth_attributions_one_accepted_participant",
        table_name="network_growth_attributions",
    )
    op.drop_table("network_growth_attributions")
