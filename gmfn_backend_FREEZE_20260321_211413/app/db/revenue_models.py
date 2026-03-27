from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class RevenueAllocationLedger(Base):
    """
    One row per allocation bucket / recipient.

    Example for one loan:
    - gateway_provider
    - gmfn_platform
    - guarantor_reward (one row per guarantor)
    - clan_starter_reward
    """

    __tablename__ = "revenue_allocation_ledger"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    clan_id: Mapped[int] = mapped_column(Integer, nullable=False)
    loan_id: Mapped[int] = mapped_column(Integer, nullable=False)

    # nullable because GMFN/platform/provider rows may not belong to a user
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # gmfn_platform | gateway_provider | guarantor_reward | clan_starter_reward
    allocation_type: Mapped[str] = mapped_column(String(40), nullable=False)

    amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False)

    # pending | credited_internal | settled_external | cancelled
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")

    # internal_balance | external_payable | external_settled
    destination_mode: Mapped[str] = mapped_column(String(32), nullable=False)

    # e.g. GMFN_MAIN_ACCOUNT | PAYSTACK | user:42 | clan_founder:17
    destination_ref: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    settled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    meta_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_rev_alloc_clan_loan_v1", "clan_id", "loan_id"),
        Index("ix_rev_alloc_user_v1", "user_id"),
        Index("ix_rev_alloc_type_v1", "allocation_type"),
        Index("ix_rev_alloc_status_v1", "status"),
    )