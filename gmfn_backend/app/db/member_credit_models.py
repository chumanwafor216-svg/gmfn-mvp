from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class MemberCreditPackVersion(Base):
    __tablename__ = "member_credit_pack_versions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    pack_code: Mapped[str] = mapped_column(String(80), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    credit_units: Mapped[int] = mapped_column(Integer, nullable=False)
    quoted_amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="inactive")
    terms_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    __table_args__ = (
        UniqueConstraint("pack_code", "version", name="uq_member_credit_pack_version_v1"),
        Index("ix_member_credit_pack_status_v1", "status"),
    )


class MemberCreditServiceVersion(Base):
    __tablename__ = "member_credit_service_versions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    service_code: Mapped[str] = mapped_column(String(96), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    credit_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="inactive")
    terms_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    __table_args__ = (
        UniqueConstraint("service_code", "version", name="uq_member_credit_service_version_v1"),
        Index("ix_member_credit_service_status_v1", "status"),
    )


class MemberCreditPurchaseOrder(Base):
    __tablename__ = "member_credit_purchase_orders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_key: Mapped[str] = mapped_column(String(96), nullable=False)
    member_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    pack_version_id: Mapped[int] = mapped_column(ForeignKey("member_credit_pack_versions.id", ondelete="RESTRICT"), nullable=False)
    quoted_amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    credit_units: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="awaiting_payment")
    funded_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    request_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    fulfilled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    __table_args__ = (
        UniqueConstraint("order_key", name="uq_member_credit_purchase_order_key_v1"),
        UniqueConstraint("idempotency_key", name="uq_member_credit_purchase_order_idem_v1"),
        Index("ix_member_credit_purchase_member_v1", "member_user_id", "created_at"),
    )


class MemberCreditProviderPayment(Base):
    __tablename__ = "member_credit_provider_payments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider_key: Mapped[str] = mapped_column(String(64), nullable=False)
    merchant_key: Mapped[str] = mapped_column(String(96), nullable=False)
    provider_transaction_id: Mapped[str] = mapped_column(String(160), nullable=False)
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    allocated_minor: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    verification_status: Mapped[str] = mapped_column(String(32), nullable=False)
    exception_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    __table_args__ = (
        UniqueConstraint(
            "provider_key", "merchant_key", "provider_transaction_id",
            name="uq_member_credit_provider_payment_identity_v1",
        ),
        Index("ix_member_credit_provider_payment_status_v1", "verification_status", "created_at"),
    )


class MemberCreditPaymentAllocation(Base):
    __tablename__ = "member_credit_payment_allocations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    provider_payment_id: Mapped[int] = mapped_column(ForeignKey("member_credit_provider_payments.id", ondelete="RESTRICT"), nullable=False)
    purchase_order_id: Mapped[int] = mapped_column(ForeignKey("member_credit_purchase_orders.id", ondelete="RESTRICT"), nullable=False)
    amount_minor: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="allocated")
    policy_key: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    __table_args__ = (
        UniqueConstraint("provider_payment_id", "purchase_order_id", name="uq_member_credit_payment_order_allocation_v1"),
        Index("ix_member_credit_allocation_order_v1", "purchase_order_id", "created_at"),
    )


class MemberCreditAwardObligation(Base):
    __tablename__ = "member_credit_award_obligations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    purchase_order_id: Mapped[int] = mapped_column(ForeignKey("member_credit_purchase_orders.id", ondelete="RESTRICT"), nullable=False)
    member_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    credit_units: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="pending")
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    request_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    applied_ledger_entry_id: Mapped[Optional[int]] = mapped_column(ForeignKey("member_service_credit_ledger_entries.id", ondelete="RESTRICT"), nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    applied_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    __table_args__ = (
        UniqueConstraint("purchase_order_id", name="uq_member_credit_award_order_v1"),
        UniqueConstraint("idempotency_key", name="uq_member_credit_award_idem_v1"),
    )


class MemberServiceCreditAccount(Base):
    __tablename__ = "member_service_credit_accounts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    member_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    balance_units: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    __table_args__ = (UniqueConstraint("member_user_id", name="uq_member_service_credit_account_member_v1"),)


class MemberServiceCreditLedgerEntry(Base):
    __tablename__ = "member_service_credit_ledger_entries"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("member_service_credit_accounts.id", ondelete="RESTRICT"), nullable=False)
    units_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    balance_after: Mapped[int] = mapped_column(Integer, nullable=False)
    entry_type: Mapped[str] = mapped_column(String(32), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    request_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    reference_type: Mapped[str] = mapped_column(String(64), nullable=False)
    reference_id: Mapped[str] = mapped_column(String(96), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_member_service_credit_ledger_idem_v1"),
        Index("ix_member_service_credit_ledger_account_v1", "account_id", "created_at"),
    )


class MemberCreditServiceSpendOrder(Base):
    __tablename__ = "member_credit_service_spend_orders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    member_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    service_version_id: Mapped[int] = mapped_column(ForeignKey("member_credit_service_versions.id", ondelete="RESTRICT"), nullable=False)
    funding_source: Mapped[str] = mapped_column(String(32), nullable=False)
    credit_cost: Mapped[int] = mapped_column(Integer, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    request_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    spotlight_campaign_id: Mapped[Optional[int]] = mapped_column(ForeignKey("spotlight_campaigns.id", ondelete="RESTRICT"), nullable=True)
    result_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_member_credit_spend_idem_v1"),
        Index("ix_member_credit_spend_member_v1", "member_user_id", "created_at"),
    )


class MemberCreditAdjustment(Base):
    __tablename__ = "member_credit_adjustments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("member_service_credit_accounts.id", ondelete="RESTRICT"), nullable=False)
    ledger_entry_id: Mapped[Optional[int]] = mapped_column(ForeignKey("member_service_credit_ledger_entries.id", ondelete="RESTRICT"), nullable=True)
    units_delta: Mapped[int] = mapped_column(Integer, nullable=False)
    reason_code: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="recorded")
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    __table_args__ = (UniqueConstraint("idempotency_key", name="uq_member_credit_adjustment_idem_v1"),)


class FinancialNotificationOutbox(Base):
    __tablename__ = "financial_notification_outbox"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    aggregate_type: Mapped[str] = mapped_column(String(64), nullable=False)
    aggregate_id: Mapped[str] = mapped_column(String(96), nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    dedupe_key: Mapped[str] = mapped_column(String(160), nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    __table_args__ = (
        UniqueConstraint("dedupe_key", name="uq_financial_notification_outbox_dedupe_v1"),
        Index("ix_financial_notification_outbox_status_v1", "status", "created_at"),
    )
