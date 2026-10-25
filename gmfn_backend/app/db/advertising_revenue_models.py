from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class AdvertisingCampaignSettlement(Base):
    """Cash-receipt and explicit-cost record for one GSN house campaign."""

    __tablename__ = "advertising_campaign_settlements"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'awaiting_payment', 'payment_confirmed', "
            "'delivery_finalized', 'reversed')",
            name="ck_ad_campaign_settlement_status_v1",
        ),
        CheckConstraint(
            "community_pool_bps >= 0 AND community_pool_bps <= 10000",
            name="ck_ad_campaign_settlement_pool_bps_v1",
        ),
        UniqueConstraint("campaign_id", name="uq_ad_campaign_settlement_campaign_v1"),
        UniqueConstraint("expected_payment_id", name="uq_ad_campaign_settlement_expected_v1"),
        UniqueConstraint("bank_event_id", name="uq_ad_campaign_settlement_bank_event_v1"),
        UniqueConstraint("idempotency_key", name="uq_ad_campaign_settlement_idem_v1"),
        Index("ix_ad_campaign_settlement_status_v1", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campaign_id: Mapped[int] = mapped_column(
        ForeignKey("spotlight_campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    payer_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    expected_payment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("expected_payments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    bank_event_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("bank_events.id", ondelete="SET NULL"), nullable=True, index=True
    )

    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="GBP")
    gross_received_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=Decimal("0.00")
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=Decimal("0.00")
    )
    refund_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=Decimal("0.00")
    )
    chargeback_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=Decimal("0.00")
    )
    processing_fee_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=Decimal("0.00")
    )
    delivery_cost_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=Decimal("0.00")
    )
    distributable_net_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=Decimal("0.00")
    )
    community_pool_bps: Mapped[int] = mapped_column(Integer, nullable=False, default=500)
    community_pool_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=Decimal("0.00")
    )

    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="draft", server_default="draft", index=True
    )
    payment_reference: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    idempotency_key: Mapped[str] = mapped_column(String(160), nullable=False)
    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivery_finalized_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reversed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reversal_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now_utc
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now_utc, onupdate=_now_utc
    )


class CommunityAdvertisingPayoutMandate(Base):
    """Separate community appointment and beneficiary acceptance for payout."""

    __tablename__ = "community_advertising_payout_mandates"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending_beneficiary', 'active', 'revoked')",
            name="ck_community_ad_payout_mandate_status_v1",
        ),
        Index(
            "uq_community_ad_payout_mandate_active_v1",
            "clan_id",
            unique=True,
            sqlite_where=text("status = 'active'"),
            postgresql_where=text("status = 'active'"),
        ),
        Index("ix_community_ad_payout_mandate_beneficiary_v1", "beneficiary_user_id", "status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    beneficiary_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    payout_destination_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("user_payout_destinations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    appointed_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    accepted_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending_beneficiary", server_default="pending_beneficiary"
    )
    authority_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now_utc
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now_utc, onupdate=_now_utc
    )


class AdvertisingCommunityPayout(Base):
    """Manual payout instruction; it never claims provider execution by itself."""

    __tablename__ = "advertising_community_payouts"
    __table_args__ = (
        CheckConstraint(
            "status IN ('prepared', 'paid_recorded', 'cancelled', 'reversed')",
            name="ck_ad_community_payout_status_v1",
        ),
        UniqueConstraint("reference", name="uq_ad_community_payout_reference_v1"),
        UniqueConstraint("idempotency_key", name="uq_ad_community_payout_idem_v1"),
        Index("ix_ad_community_payout_clan_status_v1", "clan_id", "status"),
        Index("ix_ad_community_payout_beneficiary_v1", "beneficiary_user_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    mandate_id: Mapped[int] = mapped_column(
        ForeignKey("community_advertising_payout_mandates.id", ondelete="RESTRICT"),
        nullable=False,
    )
    beneficiary_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    payout_destination_id: Mapped[int] = mapped_column(
        ForeignKey("user_payout_destinations.id", ondelete="RESTRICT"), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    reference: Mapped[str] = mapped_column(String(96), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="prepared", server_default="prepared", index=True
    )
    destination_snapshot_json: Mapped[str] = mapped_column(Text, nullable=False)
    earning_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    idempotency_key: Mapped[str] = mapped_column(String(160), nullable=False)
    prepared_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    paid_recorded_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    external_transaction_reference: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now_utc
    )
    paid_recorded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now_utc, onupdate=_now_utc
    )


class AdvertisingCommunityEarning(Base):
    """Per-community allocation backed by qualifying Spotlight evidence."""

    __tablename__ = "advertising_community_earnings"
    __table_args__ = (
        CheckConstraint(
            "status IN ('held', 'accrued', 'payout_prepared', 'paid_recorded', 'reversed')",
            name="ck_ad_community_earning_status_v1",
        ),
        UniqueConstraint("settlement_id", "clan_id", name="uq_ad_community_earning_settlement_clan_v1"),
        Index("ix_ad_community_earning_clan_status_v1", "clan_id", "status"),
        Index("ix_ad_community_earning_campaign_v1", "campaign_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    settlement_id: Mapped[int] = mapped_column(
        ForeignKey("advertising_campaign_settlements.id", ondelete="CASCADE"), nullable=False, index=True
    )
    campaign_id: Mapped[int] = mapped_column(
        ForeignKey("spotlight_campaigns.id", ondelete="CASCADE"), nullable=False, index=True
    )
    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    qualifying_impressions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    eligible_impressions_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=Decimal("0.00")
    )
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    eligibility_status: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="held", server_default="held", index=True
    )
    mandate_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("community_advertising_payout_mandates.id", ondelete="SET NULL"), nullable=True
    )
    beneficiary_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    payout_destination_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("user_payout_destinations.id", ondelete="SET NULL"), nullable=True
    )
    payout_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("advertising_community_payouts.id", ondelete="SET NULL"), nullable=True, index=True
    )
    calculation_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now_utc
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now_utc, onupdate=_now_utc
    )
