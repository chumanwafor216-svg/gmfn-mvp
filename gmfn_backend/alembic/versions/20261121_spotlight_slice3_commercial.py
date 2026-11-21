"""add disabled production Spotlight commercial records"""

from alembic import op
import sqlalchemy as sa


revision = "20261121_spotlight_slice3_commercial"
down_revision = "20261120_public_discovery_coverage"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "spotlight_commercial_capacity_windows",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("clan_id", sa.Integer(), sa.ForeignKey("clans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("region_code", sa.String(80), nullable=False),
        sa.Column("timezone_name", sa.String(80), nullable=False),
        sa.Column("service_date", sa.String(10), nullable=False),
        sa.Column("daypart", sa.String(16), nullable=False),
        sa.Column("window_starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("window_ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("observed_supplied_opportunities", sa.Integer(), nullable=False),
        sa.Column("safety_factor_bps", sa.Integer(), nullable=False),
        sa.Column("reservable_opportunities", sa.Integer(), nullable=False),
        sa.Column("evidence_source", sa.String(120), nullable=False),
        sa.Column("evidence_json", sa.Text(), nullable=True),
        sa.Column("status", sa.String(24), nullable=False, server_default="calibrated"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("clan_id", "region_code", "timezone_name", "service_date", "daypart", "version", name="uq_spotlight_commercial_capacity_window_v1"),
    )
    op.create_index("ix_spotlight_commercial_capacity_active_v1", "spotlight_commercial_capacity_windows", ["clan_id", "service_date", "daypart", "status"])
    op.create_table(
        "spotlight_commercial_bookings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("booking_key", sa.String(120), nullable=False, unique=True),
        sa.Column("campaign_id", sa.Integer(), sa.ForeignKey("spotlight_campaigns.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("advert_key", sa.String(160), nullable=False),
        sa.Column("account_id", sa.Integer(), sa.ForeignKey("pipeline_credit_accounts.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("quote_id", sa.Integer(), sa.ForeignKey("pipeline_credit_service_quotes.id", ondelete="RESTRICT"), nullable=False, unique=True),
        sa.Column("spend_order_id", sa.Integer(), sa.ForeignKey("pipeline_credit_service_spend_orders.id", ondelete="SET NULL"), nullable=True, unique=True),
        sa.Column("purchaser_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("clan_id", sa.Integer(), sa.ForeignKey("clans.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("funding_classification", sa.String(32), nullable=False),
        sa.Column("region_code", sa.String(80), nullable=False),
        sa.Column("timezone_name", sa.String(80), nullable=False),
        sa.Column("service_date", sa.String(10), nullable=False),
        sa.Column("service_starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("service_ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("purchased_credits", sa.Numeric(18, 2), nullable=False),
        sa.Column("purchased_opportunities", sa.Integer(), nullable=False),
        sa.Column("reserved_opportunities", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="reserved"),
        sa.Column("hold_reason", sa.Text(), nullable=True),
        sa.Column("withdrawal_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_spotlight_commercial_booking_campaign_v1", "spotlight_commercial_bookings", ["campaign_id", "status"])
    op.create_index("ix_spotlight_commercial_booking_schedule_v1", "spotlight_commercial_bookings", ["clan_id", "service_date", "status"])
    op.create_index("ix_spotlight_commercial_booking_advert_v1", "spotlight_commercial_bookings", ["advert_key", "service_date"])
    op.create_table(
        "spotlight_commercial_allocations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("booking_id", sa.Integer(), sa.ForeignKey("spotlight_commercial_bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("capacity_window_id", sa.Integer(), sa.ForeignKey("spotlight_commercial_capacity_windows.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("daypart", sa.String(16), nullable=False),
        sa.Column("allocated_opportunities", sa.Integer(), nullable=False),
        sa.Column("window_starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("window_ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("booking_id", "daypart", name="uq_spotlight_commercial_booking_daypart_v1"),
    )
    op.create_index("ix_spotlight_commercial_allocation_capacity_v1", "spotlight_commercial_allocations", ["capacity_window_id"])
    op.create_table(
        "spotlight_commercial_opportunities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("booking_id", sa.Integer(), sa.ForeignKey("spotlight_commercial_bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("allocation_id", sa.Integer(), sa.ForeignKey("spotlight_commercial_allocations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sequence_number", sa.Integer(), nullable=False),
        sa.Column("daypart", sa.String(16), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="reserved"),
        sa.Column("presentation_id", sa.String(80), nullable=True, unique=True),
        sa.Column("viewer_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("supplied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_code", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("booking_id", "sequence_number", name="uq_spotlight_commercial_opportunity_sequence_v1"),
    )
    op.create_index("ix_spotlight_commercial_opportunity_supply_v1", "spotlight_commercial_opportunities", ["booking_id", "daypart", "status"])
    op.create_table(
        "spotlight_commercial_remedies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("booking_id", sa.Integer(), sa.ForeignKey("spotlight_commercial_bookings.id", ondelete="CASCADE"), nullable=False),
        sa.Column("remedy_key", sa.String(160), nullable=False, unique=True),
        sa.Column("remedy_type", sa.String(40), nullable=False),
        sa.Column("missed_opportunities", sa.Integer(), nullable=False),
        sa.Column("credit_amount", sa.Numeric(18, 2), nullable=False),
        sa.Column("status", sa.String(24), nullable=False, server_default="outstanding"),
        sa.Column("ledger_entry_id", sa.Integer(), sa.ForeignKey("pipeline_credit_ledger_entries.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("applied_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_spotlight_commercial_remedy_booking_v1", "spotlight_commercial_remedies", ["booking_id", "status"])
    op.create_table(
        "spotlight_commercial_audit_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("booking_id", sa.Integer(), sa.ForeignKey("spotlight_commercial_bookings.id", ondelete="CASCADE"), nullable=True),
        sa.Column("event_type", sa.String(64), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("detail_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_spotlight_commercial_audit_booking_v1", "spotlight_commercial_audit_events", ["booking_id", "created_at"])


def downgrade() -> None:
    op.drop_table("spotlight_commercial_audit_events")
    op.drop_table("spotlight_commercial_remedies")
    op.drop_table("spotlight_commercial_opportunities")
    op.drop_table("spotlight_commercial_allocations")
    op.drop_table("spotlight_commercial_bookings")
    op.drop_table("spotlight_commercial_capacity_windows")
