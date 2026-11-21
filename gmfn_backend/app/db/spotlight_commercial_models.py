from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class SpotlightCommercialCapacityWindow(Base):
    __tablename__ = "spotlight_commercial_capacity_windows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clan_id: Mapped[int] = mapped_column(ForeignKey("clans.id", ondelete="CASCADE"), nullable=False)
    region_code: Mapped[str] = mapped_column(String(80), nullable=False)
    timezone_name: Mapped[str] = mapped_column(String(80), nullable=False)
    service_date: Mapped[str] = mapped_column(String(10), nullable=False)
    daypart: Mapped[str] = mapped_column(String(16), nullable=False)
    window_starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    window_ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    observed_supplied_opportunities: Mapped[int] = mapped_column(Integer, nullable=False)
    safety_factor_bps: Mapped[int] = mapped_column(Integer, nullable=False)
    reservable_opportunities: Mapped[int] = mapped_column(Integer, nullable=False)
    evidence_source: Mapped[str] = mapped_column(String(120), nullable=False)
    evidence_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="calibrated")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_by_user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (
        UniqueConstraint(
            "clan_id", "region_code", "timezone_name", "service_date", "daypart", "version",
            name="uq_spotlight_commercial_capacity_window_v1",
        ),
        Index(
            "ix_spotlight_commercial_capacity_active_v1",
            "clan_id", "service_date", "daypart", "status",
        ),
    )


class SpotlightCommercialPilotEntitlement(Base):
    __tablename__ = "spotlight_commercial_pilot_entitlements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    clan_id: Mapped[Optional[int]] = mapped_column(ForeignKey("clans.id", ondelete="CASCADE"), nullable=True)
    entitlement_role: Mapped[str] = mapped_column(String(24), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="active", server_default="active")
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    granted_by_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    revoked_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    decision_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (
        Index(
            "uq_spotlight_pilot_entitlement_scoped_v1",
            "user_id",
            "clan_id",
            "entitlement_role",
            unique=True,
            sqlite_where=text("clan_id IS NOT NULL"),
            postgresql_where=text("clan_id IS NOT NULL"),
        ),
        Index(
            "uq_spotlight_pilot_entitlement_global_v1",
            "user_id",
            "entitlement_role",
            unique=True,
            sqlite_where=text("clan_id IS NULL"),
            postgresql_where=text("clan_id IS NULL"),
        ),
        Index("ix_spotlight_pilot_entitlement_active_v1", "user_id", "clan_id", "status"),
    )

class SpotlightCommercialBooking(Base):
    __tablename__ = "spotlight_commercial_bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    booking_key: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("spotlight_campaigns.id", ondelete="RESTRICT"), nullable=False)
    advert_key: Mapped[str] = mapped_column(String(160), nullable=False)
    account_id: Mapped[int] = mapped_column(ForeignKey("pipeline_credit_accounts.id", ondelete="RESTRICT"), nullable=False)
    quote_id: Mapped[int] = mapped_column(ForeignKey("pipeline_credit_service_quotes.id", ondelete="RESTRICT"), nullable=False, unique=True)
    spend_order_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pipeline_credit_service_spend_orders.id", ondelete="SET NULL"), nullable=True, unique=True)
    purchaser_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    clan_id: Mapped[int] = mapped_column(ForeignKey("clans.id", ondelete="RESTRICT"), nullable=False)
    funding_classification: Mapped[str] = mapped_column(String(32), nullable=False)
    region_code: Mapped[str] = mapped_column(String(80), nullable=False)
    timezone_name: Mapped[str] = mapped_column(String(80), nullable=False)
    service_date: Mapped[str] = mapped_column(String(10), nullable=False)
    service_starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    service_ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    purchased_credits: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    purchased_opportunities: Mapped[int] = mapped_column(Integer, nullable=False)
    reserved_opportunities: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="reserved")
    hold_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    withdrawal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (
        Index("ix_spotlight_commercial_booking_campaign_v1", "campaign_id", "status"),
        Index("ix_spotlight_commercial_booking_schedule_v1", "clan_id", "service_date", "status"),
        Index("ix_spotlight_commercial_booking_advert_v1", "advert_key", "service_date"),
    )


class SpotlightCommercialAllocation(Base):
    __tablename__ = "spotlight_commercial_allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("spotlight_commercial_bookings.id", ondelete="CASCADE"), nullable=False)
    capacity_window_id: Mapped[int] = mapped_column(ForeignKey("spotlight_commercial_capacity_windows.id", ondelete="RESTRICT"), nullable=False)
    daypart: Mapped[str] = mapped_column(String(16), nullable=False)
    allocated_opportunities: Mapped[int] = mapped_column(Integer, nullable=False)
    window_starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    window_ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (
        UniqueConstraint("booking_id", "daypart", name="uq_spotlight_commercial_booking_daypart_v1"),
        Index("ix_spotlight_commercial_allocation_capacity_v1", "capacity_window_id"),
    )


class SpotlightCommercialOpportunity(Base):
    __tablename__ = "spotlight_commercial_opportunities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("spotlight_commercial_bookings.id", ondelete="CASCADE"), nullable=False)
    allocation_id: Mapped[int] = mapped_column(ForeignKey("spotlight_commercial_allocations.id", ondelete="CASCADE"), nullable=False)
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    daypart: Mapped[str] = mapped_column(String(16), nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    available_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    availability_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="reserved")
    presentation_id: Mapped[Optional[str]] = mapped_column(String(80), nullable=True, unique=True)
    viewer_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    supplied_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_code: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (
        UniqueConstraint("booking_id", "sequence_number", name="uq_spotlight_commercial_opportunity_sequence_v1"),
        Index("ix_spotlight_commercial_opportunity_supply_v1", "booking_id", "daypart", "status"),
    )


class SpotlightCommercialPresentationAttribution(Base):
    __tablename__ = "spotlight_commercial_presentation_attributions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    presentation_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    booking_id: Mapped[int] = mapped_column(
        ForeignKey("spotlight_commercial_bookings.id", ondelete="CASCADE"), nullable=False
    )
    opportunity_id: Mapped[int] = mapped_column(
        ForeignKey("spotlight_commercial_opportunities.id", ondelete="CASCADE"), nullable=False
    )
    campaign_id: Mapped[int] = mapped_column(
        ForeignKey("spotlight_campaigns.id", ondelete="RESTRICT"), nullable=False
    )
    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="RESTRICT"), nullable=False
    )
    viewer_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    selected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    visible_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    qualified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    exposure_event_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("spotlight_exposure_events.id", ondelete="SET NULL"), nullable=True, unique=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now_utc
    )

    __table_args__ = (
        Index(
            "ix_spotlight_commercial_attribution_booking_v1",
            "booking_id",
            "selected_at",
        ),
        Index(
            "ix_spotlight_commercial_attribution_opportunity_v1",
            "opportunity_id",
            "selected_at",
        ),
    )


class SpotlightCommercialRemedy(Base):
    __tablename__ = "spotlight_commercial_remedies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    booking_id: Mapped[int] = mapped_column(ForeignKey("spotlight_commercial_bookings.id", ondelete="CASCADE"), nullable=False)
    remedy_key: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    remedy_type: Mapped[str] = mapped_column(String(40), nullable=False)
    missed_opportunities: Mapped[int] = mapped_column(Integer, nullable=False)
    credit_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="outstanding")
    ledger_entry_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pipeline_credit_ledger_entries.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    applied_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (Index("ix_spotlight_commercial_remedy_booking_v1", "booking_id", "status"),)


class SpotlightCommercialServiceCreditObligation(Base):
    __tablename__ = "spotlight_commercial_service_credit_obligations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    remedy_id: Mapped[int] = mapped_column(
        ForeignKey("spotlight_commercial_remedies.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    account_id: Mapped[int] = mapped_column(
        ForeignKey("pipeline_credit_accounts.id", ondelete="RESTRICT"), nullable=False
    )
    original_booking_id: Mapped[int] = mapped_column(
        ForeignKey("spotlight_commercial_bookings.id", ondelete="RESTRICT"), nullable=False
    )
    credit_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    remaining_credit_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="outstanding")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now_utc
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now_utc
    )
    fulfilled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index(
            "ix_spotlight_commercial_credit_obligation_account_v1",
            "account_id",
            "status",
        ),
    )


class SpotlightCommercialServiceCreditApplication(Base):
    __tablename__ = "spotlight_commercial_service_credit_applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    obligation_id: Mapped[int] = mapped_column(
        ForeignKey("spotlight_commercial_service_credit_obligations.id", ondelete="CASCADE"),
        nullable=False,
    )
    replacement_booking_id: Mapped[int] = mapped_column(
        ForeignKey("spotlight_commercial_bookings.id", ondelete="CASCADE"), nullable=False
    )
    credit_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now_utc
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint(
            "obligation_id",
            "replacement_booking_id",
            name="uq_spotlight_commercial_credit_application_v1",
        ),
        Index(
            "ix_spotlight_commercial_credit_application_booking_v1",
            "replacement_booking_id",
            "status",
        ),
    )


class SpotlightCommercialAuditEvent(Base):
    __tablename__ = "spotlight_commercial_audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    booking_id: Mapped[Optional[int]] = mapped_column(ForeignKey("spotlight_commercial_bookings.id", ondelete="CASCADE"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    detail_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (Index("ix_spotlight_commercial_audit_booking_v1", "booking_id", "created_at"),)
