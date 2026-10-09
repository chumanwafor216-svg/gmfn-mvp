from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
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
    owner_type: Mapped[str] = mapped_column(String(32), nullable=False)
    owner_user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    clan_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sponsor_ref: Mapped[Optional[str]] = mapped_column(String(96), nullable=True)

    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="GBP")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)

    __table_args__ = (
        UniqueConstraint("account_key", name="uq_pipeline_credit_accounts_key_v1"),
        Index("ix_pipeline_credit_accounts_owner_v1", "owner_type", "owner_user_id", "clan_id"),
        Index("ix_pipeline_credit_accounts_clan_v1", "clan_id"),
        Index("ix_pipeline_credit_accounts_status_v1", "status"),
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
