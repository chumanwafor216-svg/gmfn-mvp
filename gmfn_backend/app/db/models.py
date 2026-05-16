from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
import json
from typing import Any, Dict, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship, synonym
from sqlalchemy.sql import func

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    display_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    profile_image_url: Mapped[Optional[str]] = mapped_column(
        String(512),
        nullable=True,
    )

    role: Mapped[str] = mapped_column(
        String(20),
        default="user",
        server_default="user",
    )

    gmfn_id: Mapped[Optional[str]] = mapped_column(
        String(32),
        unique=True,
        index=True,
        nullable=True,
    )

    phone_e164: Mapped[Optional[str]] = mapped_column(
        String(32),
        unique=True,
        index=True,
        nullable=True,
    )
    phone_verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    merchant_visibility_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="standard",
        server_default="standard",
    )

    personal_pool_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )

    trust_score: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=50,
        server_default="50",
    )
    trust_band: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    trust_breakdown_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    trust_score_updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Clan(Base):
    __tablename__ = "clans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)

    marketplace_name = Column(String(120), nullable=True)
    marketplace_description = Column(Text, nullable=True)

    # Persistent system identity for community / marketplace lineage
    community_code = Column(String(32), unique=True, nullable=True, index=True)

    # Who created this community originally
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Lifecycle state
    # active = running normally
    # dormant = inactive but recoverable
    # closed = intentionally closed; preserved for history/lineage
    status = Column(String(20), nullable=False, default="active", index=True)

    closed_at = Column(DateTime(timezone=True), nullable=True)
    closed_reason = Column(Text, nullable=True)

    invite_code = Column(String(255), nullable=True, index=True)
    invite_created_at = Column(DateTime(timezone=True), nullable=True)
    invite_expires_at = Column(DateTime(timezone=True), nullable=True)
    invite_max_uses = Column(Integer, nullable=True)
    invite_uses = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    creator = relationship("User", foreign_keys=[created_by_user_id])


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

    role: Mapped[str] = mapped_column(
        String(20),
        default="user",
        server_default="user",
    )

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

    left_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


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
    currency: Mapped[str] = mapped_column(
        String(8),
        default="NGN",
        server_default="NGN",
    )
    personal_pool_at_request: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )
    pool_used: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )
    guarantee_gap: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )
    guarantors_required: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(32),
        default="pending",
        server_default="pending",
        nullable=False,
    )

    decision_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    decision_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    service_fee: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )
    net_disbursed_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )
    guarantor_pool: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )
    platform_revenue: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )

    paid_total: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )
    remaining_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )
    repaid_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    due_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

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

    code: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="0",
        nullable=False,
    )

    max_uses: Mapped[int] = mapped_column(
        Integer,
        default=1,
        server_default="1",
        nullable=False,
    )
    uses: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default="0",
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class ClanJoinRequest(Base):
    __tablename__ = "clan_join_requests"

    __table_args__ = (
        Index(
            "uq_clan_join_requests_pending_user_clan",
            "clan_id",
            "applicant_user_id",
            unique=True,
            sqlite_where=text("status = 'pending'"),
            postgresql_where=text("status = 'pending'"),
        ),
    )

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

    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        server_default="pending",
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    decided_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    activation_link: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    activation_message: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    activation_generated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    activation_delivery_status: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        index=True,
    )
    activation_delivered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


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

    vote: Mapped[str] = mapped_column(String(10), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class CommunityConfirmationContact(Base):
    __tablename__ = "community_confirmation_contacts"

    __table_args__ = (
        UniqueConstraint(
            "community_id",
            "user_id",
            name="uq_community_confirmation_contact",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    community_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role_type: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="member",
        server_default="member",
    )
    active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    can_receive_relay_requests: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    can_receive_instant_pulse: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    priority_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=10,
        server_default="10",
    )
    standing_status: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default="active",
        server_default="active",
    )
    last_active_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    opted_in_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    opted_out_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class CommunityConfirmationPolicy(Base):
    __tablename__ = "community_confirmation_policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    community_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    relay_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    instant_pulse_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    minimum_positive_responses: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=2,
        server_default="2",
    )
    maximum_relay_contacts: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=8,
        server_default="8",
    )
    response_window_seconds: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=86400,
        server_default="86400",
    )
    review_attention_after_hours: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=24,
        server_default="24",
    )
    review_overdue_after_hours: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=72,
        server_default="72",
    )
    allow_admin_contacts: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    allow_sponsor_contacts: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    allow_voting_member_contacts: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    allow_subject_nominated_contacts: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )
    public_confirmation_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class CommunityConfirmationRequest(Base):
    __tablename__ = "community_confirmation_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    public_token: Mapped[str] = mapped_column(
        String(80),
        unique=True,
        nullable=False,
        index=True,
    )
    requester_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    requester_external_label: Mapped[Optional[str]] = mapped_column(
        String(120),
        nullable=True,
    )
    subject_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    community_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    trust_slip_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("trust_slips.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    reason_type: Mapped[str] = mapped_column(String(48), nullable=False, index=True)
    risk_level: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default="low",
        server_default="low",
    )
    mode: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default="relay",
        server_default="relay",
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default="pending",
        server_default="pending",
        index=True,
    )
    visible_outcome: Mapped[Optional[str]] = mapped_column(String(24), nullable=True)
    outcome_summary_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    abuse_flag: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    def _get_outcome_summary(self) -> Optional[Dict[str, Any]]:
        if not self.outcome_summary_json:
            return None
        try:
            raw = json.loads(self.outcome_summary_json)
            return raw if isinstance(raw, dict) else None
        except Exception:
            return None

    def _set_outcome_summary(self, value: Optional[Dict[str, Any]]) -> None:
        self.outcome_summary_json = json.dumps(value) if value is not None else None

    outcome_summary = synonym(
        "outcome_summary_json",
        descriptor=property(_get_outcome_summary, _set_outcome_summary),
    )


class CommunityConfirmationResponse(Base):
    __tablename__ = "community_confirmation_responses"

    __table_args__ = (
        UniqueConstraint(
            "request_id",
            "responder_user_id",
            name="uq_community_confirmation_response_once",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    request_id: Mapped[int] = mapped_column(
        ForeignKey("community_confirmation_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    responder_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    response_type: Mapped[str] = mapped_column(String(48), nullable=False, index=True)
    response_reason: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    response_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    counted_in_outcome: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    responded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )


class CommunityConfirmationOutcome(Base):
    __tablename__ = "community_confirmation_outcomes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    request_id: Mapped[int] = mapped_column(
        ForeignKey("community_confirmation_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    positive_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    caution_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    objection_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    no_response_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    eligible_contact_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    confidence_level: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default="limited",
        server_default="limited",
        index=True,
    )
    visible_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    closed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class CommunityConfirmationDecision(Base):
    __tablename__ = "community_confirmation_decisions"

    __table_args__ = (
        UniqueConstraint(
            "request_id",
            "actor_user_id",
            name="uq_community_confirmation_decision_actor_once",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    request_id: Mapped[int] = mapped_column(
        ForeignKey("community_confirmation_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    community_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    actor_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    decision: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    amount_band: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    issue_reported: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    settled: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    status: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default="recorded",
        server_default="recorded",
        index=True,
    )
    decision_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence_snapshot_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def _get_confidence_snapshot(self) -> Optional[Dict[str, Any]]:
        if not self.confidence_snapshot_json:
            return None
        try:
            raw = json.loads(self.confidence_snapshot_json)
            return raw if isinstance(raw, dict) else None
        except Exception:
            return None

    def _set_confidence_snapshot(self, value: Optional[Dict[str, Any]]) -> None:
        self.confidence_snapshot_json = json.dumps(value) if value is not None else None

    confidence_snapshot = synonym(
        "confidence_snapshot_json",
        descriptor=property(_get_confidence_snapshot, _set_confidence_snapshot),
    )


class CommunityConfirmationReviewCase(Base):
    __tablename__ = "community_confirmation_review_cases"

    __table_args__ = (
        UniqueConstraint(
            "request_id",
            name="uq_community_confirmation_review_case_request",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    request_id: Mapped[int] = mapped_column(
        ForeignKey("community_confirmation_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    decision_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("community_confirmation_decisions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    community_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    opened_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    assigned_to_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default="open",
        server_default="open",
        index=True,
    )
    review_reason: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    reviewer_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolution: Mapped[Optional[str]] = mapped_column(String(48), nullable=True)
    resolution_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    trust_impact: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default="none",
        server_default="none",
    )
    evidence_summary_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def _get_evidence_summary(self) -> Optional[Dict[str, Any]]:
        if not self.evidence_summary_json:
            return None
        try:
            raw = json.loads(self.evidence_summary_json)
            return raw if isinstance(raw, dict) else None
        except Exception:
            return None

    def _set_evidence_summary(self, value: Optional[Dict[str, Any]]) -> None:
        self.evidence_summary_json = json.dumps(value) if value is not None else None

    evidence_summary = synonym(
        "evidence_summary_json",
        descriptor=property(_get_evidence_summary, _set_evidence_summary),
    )


class CommunityConfirmationReviewEvidence(Base):
    __tablename__ = "community_confirmation_review_evidence"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    review_case_id: Mapped[int] = mapped_column(
        ForeignKey("community_confirmation_review_cases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    request_id: Mapped[int] = mapped_column(
        ForeignKey("community_confirmation_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    community_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    added_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    evidence_type: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    external_ref: Mapped[Optional[str]] = mapped_column(String(240), nullable=True)
    visibility: Mapped[str] = mapped_column(
        String(24),
        nullable=False,
        default="internal",
        server_default="internal",
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )


class EntryPhoneVerification(Base):
    __tablename__ = "entry_phone_verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone_e164: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    code: Mapped[str] = mapped_column(String(12), nullable=False)
    bank_account_name: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    bank_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    bank_account_number: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    bank_country: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    bank_currency: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    bank_phone_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    bank_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    browser_locale: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    browser_timezone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    phone_country_hint: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    locale_country_hint: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    region_consistency_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    region_consistency_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    driver_licence_number: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    driver_licence_country: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    driver_licence_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    bank_details_recorded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    driver_licence_recorded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    consumed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class UserPayoutDestination(Base):
    __tablename__ = "user_payout_destinations"

    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_payout_destination_user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    destination_name: Mapped[str] = mapped_column(String(160), nullable=False)
    bank_name: Mapped[str] = mapped_column(String(120), nullable=False)
    account_number: Mapped[str] = mapped_column(String(64), nullable=False)
    phone_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verification_status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="recorded",
        server_default="recorded",
    )
    verification_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    phone_country_hint: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    locale_country_hint: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    region_consistency_status: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    region_consistency_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
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
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        server_default="pending",
        nullable=False,
    )

    is_locked: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="0",
        nullable=False,
    )
    locked_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )
    released_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=0,
        server_default="0",
        nullable=False,
    )

    responded_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


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

    loan = relationship("Loan")
    payer = relationship("User")


class PoolEvent(Base):
    __tablename__ = "pool_events"

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

    event_type: Mapped[str] = mapped_column(String(32), index=True, nullable=False)

    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        server_default="NGN",
    )

    reference: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    note: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    confirmed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    confirmed_by_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class TrustEvent(Base):
    __tablename__ = "trust_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    clan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    loan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("loans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    guarantor_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("loan_guarantors.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    actor_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    subject_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    meta_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    dedupe_key: Mapped[Optional[str]] = mapped_column(
        String(64),
        nullable=True,
        unique=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    def _get_meta(self) -> Optional[Dict[str, Any]]:
        if not self.meta_json:
            return None
        try:
            raw = json.loads(self.meta_json)
            return raw if isinstance(raw, dict) else None
        except Exception:
            return None

    def _set_meta(self, value: Optional[Dict[str, Any]]) -> None:
        self.meta_json = json.dumps(value) if value is not None else None

    meta = synonym("meta_json", descriptor=property(_get_meta, _set_meta))


class TrustSlip(Base):
    __tablename__ = "trust_slips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    code: Mapped[str] = mapped_column(
        String(64),
        unique=True,
        index=True,
        nullable=False,
    )

    clan_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    holder_user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    trust_limit: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=0,
        server_default="0",
    )
    currency: Mapped[str] = mapped_column(
        String(8),
        nullable=False,
        default="NGN",
        server_default="NGN",
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="active",
        server_default="active",
    )

    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    last_verified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_release_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    snapshot_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    snapshot_visibility_level: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
    )
    snapshot_version: Mapped[Optional[str]] = mapped_column(
        String(32),
        nullable=True,
    )
    snapshot_checksum: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
    )

    is_current: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
        index=True,
    )
    issued_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    supersedes_trust_slip_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    superseded_by_trust_slip_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )


class MarketplaceShop(Base):
    __tablename__ = "marketplace_shops"

    __table_args__ = (
        UniqueConstraint(
            "owner_user_id",
            name="uq_marketplace_shop_owner_global",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    clan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    owner_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column("shop_name", String(120), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    telegram_handle: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )


class MarketplaceProduct(Base):
    __tablename__ = "marketplace_products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    shop_id: Mapped[int] = mapped_column(
        ForeignKey("marketplace_shops.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seller_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column("title", String(160), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    price: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(
        String(8),
        nullable=True,
        default="NGN",
        server_default="NGN",
    )

    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    video_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    visibility_mode: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="community_visible",
        server_default="community_visible",
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )


class MarketplaceBroadcast(Base):
    __tablename__ = "marketplace_broadcasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    shop_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("marketplace_shops.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    message: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    video_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    priority_mode: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="free",
        server_default="free",
        index=True,
    )

    visibility_scope: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="direct_communities",
        server_default="direct_communities",
        index=True,
    )

    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )


class MarketplaceReview(Base):
    __tablename__ = "marketplace_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    shop_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("marketplace_shops.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    reviewer_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    merchant_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    rating: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    review_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )


class MarketplaceProductRepost(Base):
    __tablename__ = "marketplace_product_reposts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    original_product_id: Mapped[int] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reposted_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_clan_id: Mapped[int] = mapped_column(
        ForeignKey("clans.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )


class FeaturePlan(Base):
    __tablename__ = "feature_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    feature_code: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    plan_code: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    billing_cycle: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="annual",
        server_default="annual",
    )
    currency: Mapped[str] = mapped_column(
        String(8),
        nullable=False,
        default="GBP",
        server_default="GBP",
    )
    price_amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
    )

    quantity_total: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )


class FeatureEntitlement(Base):
    __tablename__ = "feature_entitlements"

    __table_args__ = (
        UniqueConstraint(
            "feature_code",
            "payment_reference",
            name="uq_feature_entitlements_feature_payment_ref_v1",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    owner_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    clan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    shop_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("marketplace_shops.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    feature_code: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )
    plan_code: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )

    quantity_total: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )
    quantity_used: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="active",
        server_default="active",
        index=True,
    )

    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    payment_reference: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class VaultOrder(Base):
    __tablename__ = "vault_orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    shop_id: Mapped[int] = mapped_column(
        ForeignKey("marketplace_shops.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    owner_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    clan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    slot_count: Mapped[int] = mapped_column(Integer, nullable=False)
    amount_due: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="GBP", server_default="GBP")
    pricing_rule: Mapped[str] = mapped_column(String(32), nullable=False, default="unit", server_default="unit")
    payment_method: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="bank_transfer",
        server_default="bank_transfer",
    )
    payment_reference: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    # expected_payments lives in the bank metadata in tests, so keep this as an
    # indexed id in the ORM model instead of a cross-metadata ForeignKey.
    expected_payment_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    bank_event_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)

    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="instruction_generated",
        server_default="instruction_generated",
        index=True,
    )
    instruction_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class VaultBlock(Base):
    __tablename__ = "vault_blocks"

    __table_args__ = (
        UniqueConstraint("shop_id", "slot_number", name="uq_vault_blocks_shop_slot_v1"),
        Index("ix_vault_blocks_shop_state_v1", "shop_id", "state"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    shop_id: Mapped[int] = mapped_column(
        ForeignKey("marketplace_shops.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    slot_number: Mapped[int] = mapped_column(Integer, nullable=False)
    state: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="inactive",
        server_default="inactive",
        index=True,
    )
    current_order_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("vault_orders.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    product_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    activated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class VaultPrivateOffer(Base):
    __tablename__ = "vault_private_offers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    block_id: Mapped[int] = mapped_column(
        ForeignKey("vault_blocks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    shop_id: Mapped[int] = mapped_column(
        ForeignKey("marketplace_shops.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    media_type: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    media_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    caption: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    owner_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="draft",
        server_default="draft",
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class VaultAccessLink(Base):
    __tablename__ = "vault_access_links"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    shop_id: Mapped[int] = mapped_column(
        ForeignKey("marketplace_shops.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("marketplace_products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    block_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("vault_blocks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    owner_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    token: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="active",
        server_default="active",
        index=True,
    )

    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    max_views: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    views_used: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    allow_download: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )
    allow_print: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )
    allow_reshare: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )
    watermark_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )

    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )
    last_opened_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )


class VaultAccessLog(Base):
    __tablename__ = "vault_access_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    link_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("vault_access_links.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    token_hash: Mapped[Optional[str]] = mapped_column(String(128), nullable=True, index=True)
    viewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        index=True,
    )
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result: Mapped[str] = mapped_column(String(32), nullable=False, index=True)


class FeatureUsageEvent(Base):
    __tablename__ = "feature_usage_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    entitlement_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("feature_entitlements.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    owner_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    clan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    shop_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("marketplace_shops.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    feature_code: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        index=True,
    )

    units_used: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    reference_key: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
        index=True,
    )

    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )


class MarketplaceRequest(Base):
    __tablename__ = "marketplace_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    clan_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    category: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    urgency: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        default="medium",
        server_default="medium",
    )
    area: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    whatsapp_number: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    payment_mode: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    allow_trust_credit: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="open",
        server_default="open",
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        index=True,
    )

    clan = relationship("Clan")
    user = relationship("User")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    tone_preset: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default="professional-blue",
        server_default="professional-blue",
    )
    text_size: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="standard",
        server_default="standard",
    )
    contrast: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="standard",
        server_default="standard",
    )
    motion: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="normal",
        server_default="normal",
    )
    density: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="comfortable",
        server_default="comfortable",
    )

    preferred_language: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="English",
        server_default="English",
    )
    preferred_currency: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        default="NGN",
        server_default="NGN",
    )

    trust_share_level: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="standard",
        server_default="standard",
    )

    show_phone_public: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )
    show_whatsapp_public: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    show_telegram_public: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )
    show_shop_public: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )

    preferred_community_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("clans.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    preferred_landing_tab: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="guide",
        server_default="guide",
    )

    notifications_mode: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default="summary",
        server_default="summary",
    )
    quiet_notifications: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )
    sound_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )
    unread_first: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )
    open_actions_directly: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="1",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
