from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import DateTime, Integer, Numeric, String, Text, UniqueConstraint, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


class GuarantorEarning(Base):
    __tablename__ = "guarantor_earnings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    loan_id: Mapped[int] = mapped_column(Integer, nullable=False)
    loan_guarantor_id: Mapped[int] = mapped_column(Integer, nullable=False)
    guarantor_user_id: Mapped[int] = mapped_column(Integer, nullable=False)

    earned_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="NGN")

    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending")
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=_now_utc)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("loan_guarantor_id", name="uq_guarantor_earnings_loan_guarantor_id_v1"),
        Index("ix_guarantor_earnings_loan_id_v1", "loan_id"),
        Index("ix_guarantor_earnings_guarantor_user_id_v1", "guarantor_user_id"),
        Index("ix_guarantor_earnings_status_v1", "status"),
    )