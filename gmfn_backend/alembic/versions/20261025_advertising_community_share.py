"""add advertising community share accounting

Revision ID: 20261025_ad_share
Revises: 20261025_network_growth
Create Date: 2026-10-25
"""

from alembic import op
import sqlalchemy as sa


revision = "20261025_ad_share"
down_revision = "20261025_network_growth"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Older installations created the canonical bank tables through the legacy
    # schema bootstrap rather than Alembic. Advertising settlement now has an
    # explicit bank-event dependency, so a fresh migration-only database must
    # receive the same canonical table instead of silently dropping the FK.
    inspector = sa.inspect(op.get_bind())
    if not inspector.has_table("bank_events"):
        op.create_table(
            "bank_events",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=False),
            sa.Column("source_type", sa.String(length=32), nullable=False),
            sa.Column("source_id", sa.String(length=64), nullable=True),
            sa.Column("ingested_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("bank_txn_id", sa.String(length=128), nullable=True),
            sa.Column("posted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("value_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("direction", sa.String(length=16), nullable=False),
            sa.Column("amount", sa.Numeric(18, 2), nullable=False),
            sa.Column("currency", sa.String(length=8), nullable=False),
            sa.Column("reference_raw", sa.String(length=128), nullable=True),
            sa.Column("reference_normalized", sa.String(length=128), nullable=True),
            sa.Column("description_raw", sa.Text(), nullable=True),
            sa.Column("match_key", sa.String(length=128), nullable=False),
            sa.Column("status", sa.String(length=32), server_default="detected", nullable=False),
            sa.Column("status_reason", sa.String(length=64), nullable=True),
            sa.Column("confidence", sa.Integer(), server_default="0", nullable=False),
            sa.Column("canonical", sa.Boolean(), server_default=sa.false(), nullable=False),
            sa.Column("expected_payment_id", sa.Integer(), nullable=True),
            sa.Column("meta_json", sa.Text(), nullable=True),
            sa.Column("hash", sa.String(length=64), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_bank_events_clan_refnorm_v1",
            "bank_events",
            ["clan_id", "reference_normalized"],
        )
        op.create_index(
            "ix_bank_events_clan_matchkey_v1",
            "bank_events",
            ["clan_id", "match_key"],
        )
        op.create_index(
            "ix_bank_events_clan_status_v1",
            "bank_events",
            ["clan_id", "status"],
        )
        op.create_index(
            "ix_bank_events_clan_refnorm_ccy_amt_v1",
            "bank_events",
            ["clan_id", "reference_normalized", "currency", "amount"],
        )
        op.create_index("uq_bank_events_hash_v1", "bank_events", ["hash"], unique=True)

    op.create_table(
        "advertising_campaign_settlements",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column("payer_user_id", sa.Integer(), nullable=True),
        sa.Column("expected_payment_id", sa.Integer(), nullable=True),
        sa.Column("bank_event_id", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("gross_received_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("tax_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("refund_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("chargeback_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("processing_fee_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("delivery_cost_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("distributable_net_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("community_pool_bps", sa.Integer(), nullable=False),
        sa.Column("community_pool_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="draft", nullable=False),
        sa.Column("payment_reference", sa.String(length=128), nullable=True),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivery_finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reversed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reversal_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('draft', 'awaiting_payment', 'payment_confirmed', "
            "'delivery_finalized', 'reversed')",
            name="ck_ad_campaign_settlement_status_v1",
        ),
        sa.CheckConstraint(
            "community_pool_bps >= 0 AND community_pool_bps <= 10000",
            name="ck_ad_campaign_settlement_pool_bps_v1",
        ),
        sa.ForeignKeyConstraint(["campaign_id"], ["spotlight_campaigns.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["payer_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["expected_payment_id"], ["expected_payments.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["bank_event_id"], ["bank_events.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("campaign_id", name="uq_ad_campaign_settlement_campaign_v1"),
        sa.UniqueConstraint("expected_payment_id", name="uq_ad_campaign_settlement_expected_v1"),
        sa.UniqueConstraint("bank_event_id", name="uq_ad_campaign_settlement_bank_event_v1"),
        sa.UniqueConstraint("idempotency_key", name="uq_ad_campaign_settlement_idem_v1"),
    )
    op.create_index("ix_ad_campaign_settlement_campaign_id", "advertising_campaign_settlements", ["campaign_id"])
    op.create_index("ix_ad_campaign_settlement_payer_user_id", "advertising_campaign_settlements", ["payer_user_id"])
    op.create_index("ix_ad_campaign_settlement_expected_payment_id", "advertising_campaign_settlements", ["expected_payment_id"])
    op.create_index("ix_ad_campaign_settlement_bank_event_id", "advertising_campaign_settlements", ["bank_event_id"])
    op.create_index("ix_ad_campaign_settlement_status_v1", "advertising_campaign_settlements", ["status", "created_at"])

    op.create_table(
        "community_advertising_payout_mandates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("clan_id", sa.Integer(), nullable=False),
        sa.Column("beneficiary_user_id", sa.Integer(), nullable=False),
        sa.Column("payout_destination_id", sa.Integer(), nullable=True),
        sa.Column("appointed_by_user_id", sa.Integer(), nullable=False),
        sa.Column("accepted_by_user_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), server_default="pending_beneficiary", nullable=False),
        sa.Column("authority_note", sa.Text(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_by_user_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('pending_beneficiary', 'active', 'revoked')",
            name="ck_community_ad_payout_mandate_status_v1",
        ),
        sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["beneficiary_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["payout_destination_id"], ["user_payout_destinations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["appointed_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["accepted_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["revoked_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_community_ad_payout_mandate_clan_id", "community_advertising_payout_mandates", ["clan_id"])
    op.create_index("ix_community_ad_payout_mandate_payout_destination_id", "community_advertising_payout_mandates", ["payout_destination_id"])
    op.create_index("ix_community_ad_payout_mandate_beneficiary_v1", "community_advertising_payout_mandates", ["beneficiary_user_id", "status"])
    op.create_index(
        "uq_community_ad_payout_mandate_active_v1",
        "community_advertising_payout_mandates",
        ["clan_id"],
        unique=True,
        sqlite_where=sa.text("status = 'active'"),
        postgresql_where=sa.text("status = 'active'"),
    )

    op.create_table(
        "advertising_community_payouts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("clan_id", sa.Integer(), nullable=False),
        sa.Column("mandate_id", sa.Integer(), nullable=False),
        sa.Column("beneficiary_user_id", sa.Integer(), nullable=False),
        sa.Column("payout_destination_id", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("reference", sa.String(length=96), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="prepared", nullable=False),
        sa.Column("destination_snapshot_json", sa.Text(), nullable=False),
        sa.Column("earning_count", sa.Integer(), nullable=False),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("prepared_by_user_id", sa.Integer(), nullable=False),
        sa.Column("paid_recorded_by_user_id", sa.Integer(), nullable=True),
        sa.Column("external_transaction_reference", sa.String(length=160), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("paid_recorded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('prepared', 'paid_recorded', 'cancelled', 'reversed')",
            name="ck_ad_community_payout_status_v1",
        ),
        sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["mandate_id"], ["community_advertising_payout_mandates.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["beneficiary_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["payout_destination_id"], ["user_payout_destinations.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["prepared_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["paid_recorded_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reference", name="uq_ad_community_payout_reference_v1"),
        sa.UniqueConstraint("idempotency_key", name="uq_ad_community_payout_idem_v1"),
    )
    op.create_index("ix_ad_community_payout_clan_status_v1", "advertising_community_payouts", ["clan_id", "status"])
    op.create_index("ix_ad_community_payout_beneficiary_v1", "advertising_community_payouts", ["beneficiary_user_id", "created_at"])

    op.create_table(
        "advertising_community_earnings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("settlement_id", sa.Integer(), nullable=False),
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column("clan_id", sa.Integer(), nullable=False),
        sa.Column("qualifying_impressions", sa.Integer(), nullable=False),
        sa.Column("eligible_impressions_total", sa.Integer(), nullable=False),
        sa.Column("amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("eligibility_status", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=32), server_default="held", nullable=False),
        sa.Column("mandate_id", sa.Integer(), nullable=True),
        sa.Column("beneficiary_user_id", sa.Integer(), nullable=True),
        sa.Column("payout_destination_id", sa.Integer(), nullable=True),
        sa.Column("payout_id", sa.Integer(), nullable=True),
        sa.Column("calculation_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "status IN ('held', 'accrued', 'payout_prepared', 'paid_recorded', 'reversed')",
            name="ck_ad_community_earning_status_v1",
        ),
        sa.ForeignKeyConstraint(["settlement_id"], ["advertising_campaign_settlements.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["campaign_id"], ["spotlight_campaigns.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["mandate_id"], ["community_advertising_payout_mandates.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["beneficiary_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["payout_destination_id"], ["user_payout_destinations.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["payout_id"], ["advertising_community_payouts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("settlement_id", "clan_id", name="uq_ad_community_earning_settlement_clan_v1"),
    )
    op.create_index("ix_ad_community_earning_settlement_id", "advertising_community_earnings", ["settlement_id"])
    op.create_index("ix_ad_community_earning_clan_status_v1", "advertising_community_earnings", ["clan_id", "status"])
    op.create_index("ix_ad_community_earning_campaign_v1", "advertising_community_earnings", ["campaign_id", "created_at"])
    op.create_index("ix_ad_community_earning_payout_id", "advertising_community_earnings", ["payout_id"])


def downgrade() -> None:
    op.drop_table("advertising_community_earnings")
    op.drop_table("advertising_community_payouts")
    op.drop_table("community_advertising_payout_mandates")
    op.drop_table("advertising_campaign_settlements")
