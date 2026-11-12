from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class PipelineCreditAccount(Base):
    """
    Internal GSN pipeline-credit account.

    This is a usage-control account for paid provider/API work. It is not a
    wallet, bank account, customer-funds ledger, loan account, or cash-out rail.
    """

    __tablename__ = "pipeline_credit_accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    account_key: Mapped[str] = mapped_column(String(160), nullable=False)
    account_purpose: Mapped[str] = mapped_column(
        String(32), nullable=False, default="provider_operations", server_default="provider_operations"
    )
    owner_type: Mapped[str] = mapped_column(String(32), nullable=False)
    owner_user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    clan_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sponsor_ref: Mapped[Optional[str]] = mapped_column(String(96), nullable=True)

    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="GBP")
    pricing_region: Mapped[str] = mapped_column(
        String(32), nullable=False, default="global", server_default="global"
    )
    balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 2), nullable=False, default=Decimal("0.00"), server_default=text("0")
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default=text("0"))
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (
        UniqueConstraint("account_key", name="uq_pipeline_credit_accounts_key_v1"),
        Index("ix_pipeline_credit_accounts_purpose_v1", "account_purpose", "owner_type"),
        Index("ix_pipeline_credit_accounts_owner_v1", "owner_type", "owner_user_id", "clan_id"),
        Index("ix_pipeline_credit_accounts_clan_v1", "clan_id"),
        Index("ix_pipeline_credit_accounts_status_v1", "status"),
    )


class PipelineCreditPricingPolicy(Base):
    __tablename__ = "pipeline_credit_pricing_policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    region_code: Mapped[str] = mapped_column(String(32), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    credits_per_currency_unit: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="active")
    created_by_user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (
        UniqueConstraint("region_code", "currency", "version", name="uq_pipeline_credit_pricing_policy_v1"),
        Index("ix_pipeline_credit_pricing_policy_active_v1", "region_code", "currency", "status"),
    )


class PipelineCreditServiceVersion(Base):
    __tablename__ = "pipeline_credit_service_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    service_code: Mapped[str] = mapped_column(String(96), nullable=False)
    service_label: Mapped[str] = mapped_column(String(120), nullable=False)
    region_code: Mapped[str] = mapped_column(String(32), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    pricing_mode: Mapped[str] = mapped_column(String(24), nullable=False)
    credit_cost: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    cash_reference_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(18, 2), nullable=True)
    cash_reference_currency: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_label: Mapped[str] = mapped_column(String(80), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="active")
    terms_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (
        UniqueConstraint("service_code", "region_code", "version", name="uq_pipeline_credit_service_version_v1"),
        Index("ix_pipeline_credit_service_active_v1", "service_code", "region_code", "status"),
    )


class PipelineCreditServiceQuote(Base):
    __tablename__ = "pipeline_credit_service_quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quote_key: Mapped[str] = mapped_column(String(96), nullable=False)
    actor_user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pipeline_credit_accounts.id", ondelete="RESTRICT"), nullable=False
    )
    service_version_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pipeline_credit_service_versions.id", ondelete="RESTRICT"), nullable=False
    )
    service_code: Mapped[str] = mapped_column(String(96), nullable=False)
    region_code: Mapped[str] = mapped_column(String(32), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_credit_cost: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    total_credit_cost: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    context_json: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="issued")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(160), nullable=False)
    request_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    spent_order_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (
        UniqueConstraint("quote_key", name="uq_pipeline_credit_service_quote_key_v1"),
        UniqueConstraint("actor_user_id", "idempotency_key", name="uq_pipeline_credit_service_quote_idem_v1"),
        Index("ix_pipeline_credit_service_quote_actor_v1", "actor_user_id", "created_at"),
    )


class PipelineCreditServiceSpendOrder(Base):
    __tablename__ = "pipeline_credit_service_spend_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    actor_user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    account_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pipeline_credit_accounts.id", ondelete="RESTRICT"), nullable=False
    )
    quote_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pipeline_credit_service_quotes.id", ondelete="RESTRICT"), nullable=False
    )
    service_version_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("pipeline_credit_service_versions.id", ondelete="RESTRICT"), nullable=False
    )
    service_code: Mapped[str] = mapped_column(String(96), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    total_credit_cost: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="pending")
    idempotency_key: Mapped[str] = mapped_column(String(160), nullable=False)
    request_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False)
    ledger_entry_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("pipeline_credit_ledger_entries.id", ondelete="RESTRICT"), nullable=True
    )
    delivery_reference_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    delivery_reference_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    result_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_pipeline_credit_service_spend_idem_v1"),
        UniqueConstraint("quote_id", name="uq_pipeline_credit_service_spend_quote_v1"),
        Index("ix_pipeline_credit_service_spend_actor_v1", "actor_user_id", "created_at"),
    )


class PipelineCreditLedgerEntry(Base):
    """
    Signed audit entry for internal pipeline credits.

    Positive amounts allocate/reverse credits. Negative amounts consume/expire
    credits. Provider debits must be idempotent.
    """

    __tablename__ = "pipeline_credit_ledger_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("pipeline_credit_accounts.id", ondelete="CASCADE"),
        nullable=False,
    )

    clan_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    entry_type: Mapped[str] = mapped_column(String(32), nullable=False)
    credit_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    balance_after: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)

    workflow_key: Mapped[str] = mapped_column(String(96), nullable=False)
    provider_key: Mapped[Optional[str]] = mapped_column(String(96), nullable=True)

    reference_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    reference_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    idempotency_key: Mapped[str] = mapped_column(String(160), nullable=False)

    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    meta_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (
        UniqueConstraint("idempotency_key", name="uq_pipeline_credit_entries_idem_v1"),
        Index("ix_pipeline_credit_entries_account_v1", "account_id", "created_at"),
        Index("ix_pipeline_credit_entries_clan_v1", "clan_id", "created_at"),
        Index("ix_pipeline_credit_entries_user_v1", "user_id", "created_at"),
        Index("ix_pipeline_credit_entries_workflow_v1", "workflow_key", "created_at"),
        Index("ix_pipeline_credit_entries_provider_v1", "provider_key", "created_at"),
    )
