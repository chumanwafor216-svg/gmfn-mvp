# app/db/bank_models.py
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class BankEvent(Base):
    """
    Canonical normalized bank transaction observation.

    Determinism requirements:
    - Idempotency: unique hash
    - Never guess matches if ambiguous
    - Status is finite-state and queryable
    """

    __tablename__ = "bank_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    clan_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # source_type: statement_csv | webhook_api | email_alert | sms_alert | manual_api
    source_type: Mapped[str] = mapped_column(String(32), nullable=False)
    source_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    ingested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    # Bank provided identifiers/timestamps (optional)
    bank_txn_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    value_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # credit | debit
    direction: Mapped[str] = mapped_column(String(16), nullable=False)

    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)

    reference_raw: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    reference_normalized: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    description_raw: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # derived
    match_key: Mapped[str] = mapped_column(String(128), nullable=False)

    # detected|pending_match|matched_unconfirmed|partial|confirmed|mismatch_flagged|duplicate
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="detected")
    status_reason: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    confidence: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    canonical: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # linkage to ExpectedPayment (optional)
    expected_payment_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # misc
    meta_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # hash for dedupe (stable)
    hash: Mapped[str] = mapped_column(String(64), nullable=False)

    __table_args__ = (
        Index("ix_bank_events_clan_refnorm_v1", "clan_id", "reference_normalized"),
        Index("ix_bank_events_clan_matchkey_v1", "clan_id", "match_key"),
        Index("ix_bank_events_clan_status_v1", "clan_id", "status"),
        Index("ix_bank_events_clan_refnorm_ccy_amt_v1", "clan_id", "reference_normalized", "currency", "amount"),
        Index("uq_bank_events_hash_v1", "hash", unique=True),
    )


class ExpectedPayment(Base):
    """
    System-generated expected transaction (contribution/repayment/etc).
    BankEvents match primarily by reference_normalized + currency, then amount preference.

    Determinism requirements:
    - Supports partial payments (paid_amount + remaining_amount)
    - Never auto-matches ambiguous references
    """

    __tablename__ = "expected_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    clan_id: Mapped[int] = mapped_column(Integer, nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # contribution | repayment | payout (later)
    expected_type: Mapped[str] = mapped_column(String(32), nullable=False)

    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)

    # NEW: deterministic partial tracking
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0.00"))
    remaining_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0.00"))

    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # reference standard (bank instruction)
    reference_display: Mapped[str] = mapped_column(String(64), nullable=False)
    reference_normalized: Mapped[str] = mapped_column(String(128), nullable=False)

    # expected | partial | confirmed | expired | defaulted | cancelled
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="expected")
    status_reason: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # linkage back (optional)
    bank_event_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    trust_event_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    meta_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_expected_payments_clan_user_v1", "clan_id", "user_id"),
        Index("ix_expected_payments_clan_type_v1", "clan_id", "expected_type"),
        Index("ix_expected_payments_status_v1", "status"),
        Index("ix_expected_payments_clan_refnorm_v1", "clan_id", "reference_normalized"),
        Index("ix_expected_payments_clan_refnorm_ccy_v1", "clan_id", "reference_normalized", "currency"),
        UniqueConstraint("clan_id", "reference_display", name="uq_expected_payments_clan_refdisp_v1"),
        UniqueConstraint("clan_id", "reference_normalized", name="uq_expected_payments_clan_refnorm_v1"),
        UniqueConstraint("bank_event_id", name="uq_expected_payments_bank_event_id_v1"),
    )


class BankCredit(Base):
    """
    Overpayment credit ledger (deterministic).
    When incoming amount > remaining_amount on an ExpectedPayment match,
    store the excess as a credit for (clan_id, user_id, currency).

    Credits can be applied later deterministically (oldest-first).
    """

    __tablename__ = "bank_credits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    clan_id: Mapped[int] = mapped_column(Integer, nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)

    currency: Mapped[str] = mapped_column(String(8), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)

    source_bank_event_id: Mapped[int] = mapped_column(Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    meta_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_bank_credits_clan_user_ccy_v1", "clan_id", "user_id", "currency"),
        UniqueConstraint("source_bank_event_id", name="uq_bank_credits_source_be_v1"),
    )