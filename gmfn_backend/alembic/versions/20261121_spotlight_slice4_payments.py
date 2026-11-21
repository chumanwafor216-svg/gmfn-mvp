"""add Spotlight Slice 4 cash-backed commercial controls"""

from alembic import op
import sqlalchemy as sa


revision = "20261121_spotlight_slice4_payments"
down_revision = "20261121_spotlight_slice3a_integrity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "spotlight_commercial_pilot_entitlements",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("clan_id", sa.Integer(), sa.ForeignKey("clans.id", ondelete="CASCADE"), nullable=True),
        sa.Column("entitlement_role", sa.String(24), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="active"),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("granted_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("revoked_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("decision_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        "uq_spotlight_pilot_entitlement_scoped_v1",
        "spotlight_commercial_pilot_entitlements",
        ["user_id", "clan_id", "entitlement_role"],
        unique=True,
        sqlite_where=sa.text("clan_id IS NOT NULL"),
        postgresql_where=sa.text("clan_id IS NOT NULL"),
    )
    op.create_index(
        "uq_spotlight_pilot_entitlement_global_v1",
        "spotlight_commercial_pilot_entitlements",
        ["user_id", "entitlement_role"],
        unique=True,
        sqlite_where=sa.text("clan_id IS NULL"),
        postgresql_where=sa.text("clan_id IS NULL"),
    )
    op.create_index(
        "ix_spotlight_pilot_entitlement_active_v1",
        "spotlight_commercial_pilot_entitlements",
        ["user_id", "clan_id", "status"],
    )

    op.create_table(
        "pipeline_credit_acquisition_orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("acquisition_key", sa.String(96), nullable=False),
        sa.Column("pack_version_id", sa.Integer(), sa.ForeignKey("pipeline_credit_acquisition_pack_versions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("expected_payment_id", sa.Integer(), sa.ForeignKey("expected_payments.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("bank_event_id", sa.Integer(), sa.ForeignKey("bank_events.id", ondelete="SET NULL"), nullable=True),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("pipeline_credit_accounts.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("purchaser_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("beneficiary_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("clan_id", sa.Integer(), sa.ForeignKey("clans.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("funding_classification", sa.String(32), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False),
        sa.Column("cash_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("credit_quantity", sa.Numeric(18, 2), nullable=False),
        sa.Column("allocated_credit_amount", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("remaining_credit_amount", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("status", sa.String(32), nullable=False, server_default="pending_payment"),
        sa.Column("allocation_ledger_entry_id", sa.Integer(), sa.ForeignKey("pipeline_credit_ledger_entries.id", ondelete="SET NULL"), nullable=True),
        sa.Column("idempotency_key", sa.String(160), nullable=False),
        sa.Column("request_fingerprint", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("allocated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("acquisition_key", name="uq_pipeline_credit_acquisition_key_v1"),
        sa.UniqueConstraint("expected_payment_id", name="uq_pipeline_credit_acquisition_expected_v1"),
        sa.UniqueConstraint("allocation_ledger_entry_id", name="uq_pipeline_credit_acquisition_ledger_v1"),
        sa.UniqueConstraint("purchaser_user_id", "idempotency_key", name="uq_pipeline_credit_acquisition_idem_v1"),
    )
    op.create_index("ix_pipeline_credit_acquisition_beneficiary_v1", "pipeline_credit_acquisition_orders", ["beneficiary_user_id", "status"])
    op.create_index("ix_pipeline_credit_acquisition_clan_v1", "pipeline_credit_acquisition_orders", ["clan_id", "status"])

    op.create_table(
        "pipeline_credit_acquisition_applications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("acquisition_order_id", sa.Integer(), sa.ForeignKey("pipeline_credit_acquisition_orders.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("spend_order_id", sa.Integer(), sa.ForeignKey("pipeline_credit_service_spend_orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("booking_id", sa.Integer(), sa.ForeignKey("spotlight_commercial_bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("credit_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("cash_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("acquisition_order_id", "spend_order_id", name="uq_pipeline_credit_acquisition_application_v1"),
    )
    op.create_index("ix_pipeline_credit_acquisition_application_spend_v1", "pipeline_credit_acquisition_applications", ["spend_order_id", "status"])
    op.create_index("ix_pipeline_credit_acquisition_application_booking_v1", "pipeline_credit_acquisition_applications", ["booking_id", "status"])

    op.create_table(
        "pipeline_credit_acquisition_refunds",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("acquisition_order_id", sa.Integer(), sa.ForeignKey("pipeline_credit_acquisition_orders.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("cash_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("reversed_credit_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("ledger_entry_id", sa.Integer(), sa.ForeignKey("pipeline_credit_ledger_entries.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="recorded_not_disbursed"),
        sa.Column("idempotency_key", sa.String(160), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("idempotency_key", name="uq_pipeline_credit_acquisition_refund_idem_v1"),
        sa.UniqueConstraint("ledger_entry_id", name="uq_pipeline_credit_acquisition_refund_ledger_v1"),
    )
    op.create_index("ix_pipeline_credit_acquisition_refund_order_v1", "pipeline_credit_acquisition_refunds", ["acquisition_order_id", "status"])

    with op.batch_alter_table("advertising_campaign_settlements") as batch:
        batch.add_column(sa.Column("settlement_scope", sa.String(32), nullable=False, server_default="house_campaign"))
        batch.add_column(sa.Column("spotlight_booking_id", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("funding_classification", sa.String(32), nullable=True))
        batch.add_column(sa.Column("deferred_revenue_amount", sa.Numeric(18, 2), nullable=False, server_default="0"))
        batch.add_column(sa.Column("earned_revenue_amount", sa.Numeric(18, 2), nullable=False, server_default="0"))
        batch.add_column(sa.Column("outstanding_service_credit_amount", sa.Numeric(18, 2), nullable=False, server_default="0"))
        batch.create_foreign_key(
            "fk_ad_campaign_settlement_spotlight_booking_v2",
            "spotlight_commercial_bookings",
            ["spotlight_booking_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch.drop_constraint("uq_ad_campaign_settlement_campaign_v1", type_="unique")
        batch.create_unique_constraint("uq_ad_campaign_settlement_spotlight_booking_v2", ["spotlight_booking_id"])
    op.create_index("ix_ad_campaign_settlement_spotlight_booking_v2", "advertising_campaign_settlements", ["spotlight_booking_id"])
    op.create_index("ix_ad_campaign_settlement_funding_v2", "advertising_campaign_settlements", ["funding_classification"])
    op.create_index(
        "uq_ad_campaign_settlement_house_campaign_v2",
        "advertising_campaign_settlements",
        ["campaign_id"],
        unique=True,
        sqlite_where=sa.text("settlement_scope = 'house_campaign'"),
        postgresql_where=sa.text("settlement_scope = 'house_campaign'"),
    )


def downgrade() -> None:
    op.drop_index("uq_ad_campaign_settlement_house_campaign_v2", table_name="advertising_campaign_settlements")
    op.drop_index("ix_ad_campaign_settlement_funding_v2", table_name="advertising_campaign_settlements")
    op.drop_index("ix_ad_campaign_settlement_spotlight_booking_v2", table_name="advertising_campaign_settlements")
    op.execute("DELETE FROM advertising_campaign_settlements WHERE settlement_scope = 'spotlight_booking'")
    with op.batch_alter_table("advertising_campaign_settlements") as batch:
        batch.drop_constraint("uq_ad_campaign_settlement_spotlight_booking_v2", type_="unique")
        batch.drop_constraint("fk_ad_campaign_settlement_spotlight_booking_v2", type_="foreignkey")
        batch.create_unique_constraint("uq_ad_campaign_settlement_campaign_v1", ["campaign_id"])
        batch.drop_column("outstanding_service_credit_amount")
        batch.drop_column("earned_revenue_amount")
        batch.drop_column("deferred_revenue_amount")
        batch.drop_column("funding_classification")
        batch.drop_column("spotlight_booking_id")
        batch.drop_column("settlement_scope")
    op.drop_table("pipeline_credit_acquisition_refunds")
    op.drop_table("pipeline_credit_acquisition_applications")
    op.drop_table("pipeline_credit_acquisition_orders")
    op.drop_table("spotlight_commercial_pilot_entitlements")