"""marketplace relay policy and requester consent history

Revision ID: 20261016_relay_governance_v1
Revises: 20261016_member_credit_v1
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20261016_relay_governance_v1"
down_revision = "20261016_member_credit_v1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "marketplace_relay_policies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("clan_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("outbound_enabled", sa.Boolean(), nullable=False),
        sa.Column("inbound_enabled", sa.Boolean(), nullable=False),
        sa.Column("issued_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["issued_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("clan_id", "version", name="uq_marketplace_relay_policy_clan_version_v1"),
    )
    op.create_index("ix_marketplace_relay_policies_id", "marketplace_relay_policies", ["id"])
    op.create_index("ix_marketplace_relay_policies_clan_id", "marketplace_relay_policies", ["clan_id"])
    op.create_index("ix_marketplace_relay_policies_issued_by_user_id", "marketplace_relay_policies", ["issued_by_user_id"])
    op.create_index("ix_marketplace_relay_policy_clan_version_v1", "marketplace_relay_policies", ["clan_id", "version"])

    op.create_table(
        "marketplace_relay_consent_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("marketplace_request_id", sa.Integer(), nullable=False),
        sa.Column("requester_user_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("scope", sa.String(length=32), server_default="one_hop", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["marketplace_request_id"], ["marketplace_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requester_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("marketplace_request_id", "version", name="uq_marketplace_relay_consent_request_version_v1"),
    )
    op.create_index("ix_marketplace_relay_consent_events_id", "marketplace_relay_consent_events", ["id"])
    op.create_index("ix_marketplace_relay_consent_events_marketplace_request_id", "marketplace_relay_consent_events", ["marketplace_request_id"])
    op.create_index("ix_marketplace_relay_consent_events_requester_user_id", "marketplace_relay_consent_events", ["requester_user_id"])
    op.create_index("ix_marketplace_relay_consent_request_version_v1", "marketplace_relay_consent_events", ["marketplace_request_id", "version"])


def downgrade() -> None:
    bind = op.get_bind()
    consent_count = int(bind.execute(sa.text("SELECT COUNT(*) FROM marketplace_relay_consent_events")).scalar() or 0)
    policy_count = int(bind.execute(sa.text("SELECT COUNT(*) FROM marketplace_relay_policies")).scalar() or 0)
    if consent_count or policy_count:
        raise RuntimeError("Unsafe downgrade refused: marketplace relay governance history exists; roll forward instead.")
    op.drop_table("marketplace_relay_consent_events")
    op.drop_table("marketplace_relay_policies")
