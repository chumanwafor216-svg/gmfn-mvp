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

    NOTE (SQLite safety):
    We avoid Column(index=True) for fields that previously created auto-index names
    that can collide across DB files (e.g. ix_expected_payments_status).
    We instead define explicit Index(...) names under __table_args__.
    """

    __tablename__ = "bank_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    clan_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # source_type: statement_csv | webhook_api | email_alert | sms_alert
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
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="detected",
    )  # detected|pending_match|matched_unconfirmed|confirmed|rejected|mismatch_flagged|duplicate
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
        # Query patterns in reconciliation:
        # - by clan_id + reference_normalized + currency
        # - by clan_id + match_key
        Index("ix_bank_events_clan_refnorm_v1", "clan_id", "reference_normalized"),
        Index("ix_bank_events_clan_matchkey_v1", "clan_id", "match_key"),
        Index("ix_bank_events_clan_status_v1", "clan_id", "status"),
        # Optional performance helper (safe, deterministic): speeds lookups if you extend matching later
        Index("ix_bank_events_clan_refnorm_ccy_amt_v1", "clan_id", "reference_normalized", "currency", "amount"),
        # Idempotency: global unique hash (hash includes clan_id in the service computation)
        Index("uq_bank_events_hash_v1", "hash", unique=True),
    )


class ExpectedPayment(Base):
    """
    System-generated expected transaction (deposit/contribution/repayment later).
    BankEvents match to ExpectedPayments primarily by reference_normalized, then amount/currency.
    """

    __tablename__ = "expected_payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    clan_id: Mapped[int] = mapped_column(Integer, nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # contribution | repayment | payout (later)
    expected_type: Mapped[str] = mapped_column(String(32), nullable=False)

    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)

    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # reference standard (bank instruction)
    # IMPORTANT: references must be unique PER CLAN (not globally), otherwise multi-tenant collisions break real-world use.
    reference_display: Mapped[str] = mapped_column(String(64), nullable=False)
    reference_normalized: Mapped[str] = mapped_column(String(128), nullable=False)

    # IMPORTANT: do NOT use index=True here (to avoid ix_expected_payments_status collision)
    # expected | matched_unconfirmed | confirmed | expired | defaulted | cancelled
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="expected")
    status_reason: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # linkage back (optional)
    # Hardening: bank_event_id should be unique so one bank event cannot be linked to multiple expected payments.
    bank_event_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    trust_event_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    meta_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_expected_payments_clan_user_v1", "clan_id", "user_id"),
        Index("ix_expected_payments_clan_type_v1", "clan_id", "expected_type"),
        Index("ix_expected_payments_status_v1", "status"),  # custom name avoids old ix_expected_payments_status
        # Match path uses clan_id + reference_normalized + currency
        Index("ix_expected_payments_clan_refnorm_v1", "clan_id", "reference_normalized"),
        Index("ix_expected_payments_clan_refnorm_ccy_v1", "clan_id", "reference_normalized", "currency"),
        # Enforce tenant-safe uniqueness:
        UniqueConstraint("clan_id", "reference_display", name="uq_expected_payments_clan_refdisp_v1"),
        UniqueConstraint("clan_id", "reference_normalized", name="uq_expected_payments_clan_refnorm_v1"),
        # Concurrency / race hardening:
        UniqueConstraint("bank_event_id", name="uq_expected_payments_bank_event_id_v1"),
    )