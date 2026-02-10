from __future__ import annotations

from datetime import datetime
from decimal import Decimal
import json
from typing import Any, Dict, Optional, List

from app.db.base import Base

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import relationship

from sqlalchemy.orm import relationship

from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym
from sqlalchemy.sql import func

from app.db.base import Base

# =========================
# USER
# =========================
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)

    role: Mapped[str] = mapped_column(String(20), default="user", server_default="user")

    personal_pool_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
from sqlalchemy import Integer, Text, DateTime
from datetime import datetime, timezone

def utcnow():
    return datetime.now(timezone.utc)

trust_score = Column(Integer, nullable=False, default=50)
trust_band = Column(String(2), nullable=True)
trust_breakdown_json = Column(Text, nullable=True)
trust_score_updated_at = Column(DateTime(timezone=True), nullable=True)


# =========================
# CLAN
# =========================
class Clan(Base):
    __tablename__ = "clans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    invite_code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    invite_created_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    invite_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    max_members: Mapped[int] = mapped_column(Integer, default=15, server_default="15", nullable=False)
    auto_refill_invites: Mapped[bool] = mapped_column(default=True, server_default="1", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


# =========================
# CLAN MEMBERSHIP
# =========================
class ClanMembership(Base):
    __tablename__ = "clan_memberships"

    __table_args__ = (
        UniqueConstraint("clan_id", "user_id", name="uq_clan_membership"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    role: Mapped[str] = mapped_column(String(20), default="user", server_default="user")

    personal_pool_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ✅ provenance
    invited_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    invite_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clan_invites.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ✅ exit tracking
    left_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

# =========================
# LOAN
# =========================
class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    borrower_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="NGN", server_default="NGN")

    guarantors_required: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(32), default="pending", server_default="pending", nullable=False
    )

    # decision tracking (admin/system decision)
    decision_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    decision_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Fee & disbursement
    service_fee: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, server_default="0", nullable=False
    )
    net_disbursed_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, server_default="0", nullable=False
    )
    guarantor_pool: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, server_default="0", nullable=False
    )
    platform_revenue: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, server_default="0", nullable=False
    )

    # Repayment tracking
    paid_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, server_default="0", nullable=False
    )
    remaining_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, server_default="0", nullable=False
    )
    repaid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
# =========================
class ClanInvite(Base):
    __tablename__ = "clan_invites"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    created_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    code: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)

    is_active: Mapped[bool] = mapped_column(default=False, server_default="0", nullable=False)

    max_uses: Mapped[int] = mapped_column(Integer, default=1, server_default="1", nullable=False)
    uses: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
# =========================

class ClanJoinRequest(Base):
    __tablename__ = "clan_join_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    applicant_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    invite_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clan_invites.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    invited_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(String(20), default="pending", server_default="pending", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

# =========================
class ClanJoinVote(Base):
    __tablename__ = "clan_join_votes"

    __table_args__ = (
        UniqueConstraint("join_request_id", "voter_user_id", name="uq_join_vote_once"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    join_request_id: Mapped[int] = mapped_column(
        ForeignKey("clan_join_requests.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    voter_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    vote: Mapped[str] = mapped_column(String(10), nullable=False)  # approve | reject
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

# =========================
# LOAN GUARANTOR
# =========================
class LoanGuarantor(Base):
    __tablename__ = "loan_guarantors"

    __table_args__ = (
        UniqueConstraint("loan_id", "guarantor_user_id", name="uq_loan_guarantor"),
        ForeignKeyConstraint(
            ["clan_id", "guarantor_user_id"],
            ["clan_memberships.clan_id", "clan_memberships.user_id"],
            name="fk_guarantor_must_be_clan_member",
            ondelete="RESTRICT",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    loan_id: Mapped[int] = mapped_column(
        ForeignKey("loans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    guarantor_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    pledge_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, server_default="0", nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(20), default="pending", server_default="pending", nullable=False
    )

    # Guarantor liability lock
    is_locked: Mapped[bool] = mapped_column(default=False, server_default="0", nullable=False)
    locked_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, server_default="0", nullable=False
    )
    released_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2), default=0, server_default="0", nullable=False
    )

    responded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


# =========================
# REPAYMENTS
# =========================
class Repayment(Base):
    __tablename__ = "repayments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    loan_id: Mapped[int] = mapped_column(
        ForeignKey("loans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    payer_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # relationships (optional but useful)
    loan = relationship("Loan")
    payer = relationship("User")


# =========================
# TRUST EVENTS (Append-only trust ledger)
# =========================

# =========================
class TrustEvent(Base):
    """
    Append-only event log for social trust signals.
    This is the foundation of CCI / alternative credit data.
    """
    __tablename__ = "trust_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # event_type values should come from app.core.trust_event_types.TrustEventType
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    # ? Make clan_id optional (some trust events may be global/user-level)
    clan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # ? Make loan_id optional (e.g., ADMIN_POOL_TOPUP is not tied to a loan)
    loan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("loans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Optional reference to the guarantor row
    guarantor_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("loan_guarantors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Actor = who performed the action (e.g. guarantor/admin)
    actor_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Subject = who the action is about (e.g. borrower)
    subject_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Stored as JSON string (SQLite-friendly)
    meta_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # --- expose meta as dict, but store in meta_json ---
    def _get_meta(self) -> Optional[Dict[str, Any]]:
        if not self.meta_json:
            return None
        return json.loads(self.meta_json)

    def _set_meta(self, value: Optional[Dict[str, Any]]) -> None:
        self.meta_json = json.dumps(value) if value is not None else None

    # ? makes TrustEvent(meta=...) valid in constructor
    meta = synonym("meta_json", descriptor=property(_get_meta, _set_meta))


class TrustSlip(Base):
    __tablename__ = "trust_slips"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(32), unique=True, index=True, nullable=False)

    clan_id = Column(Integer, ForeignKey("clans.id"), nullable=False)
    issuer_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # optional link to a loan if you want
    loan_id = Column(Integer, ForeignKey("loans.id"), nullable=True)

    amount = Column(String(50), nullable=False)      # store as string for SQLite simplicity
    currency = Column(String(10), nullable=False, default="NGN")

    payee_label = Column(String(200), nullable=True) # “Vendor name / shop”
    note = Column(Text, nullable=True)

    status = Column(String(20), nullable=False, default="issued")  # issued | verified | released | void
    is_active = Column(Boolean, nullable=False, default=True)

    issued_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=True)
    released_at = Column(DateTime, nullable=True)
