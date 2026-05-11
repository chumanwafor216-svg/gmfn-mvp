from __future__ import annotations


class TrustEventType:
    """
    Canonical Trust Event Types for GMFN.

    These are used across:
    - TrustEvent ledger
    - TrustGraph edge builder
    - Trust scoring
    - Evidence packs
    """

    # -------------------------
    # Invite lifecycle
    # -------------------------
    INVITE_CREATED = "invite_created"
    INVITE_REVOKED = "invite_revoked"
    INVITE_ACCEPTED = "invite_accepted"
    INVITE_SUCCESSFUL_ONBOARDING = "invite_successful_onboarding"

    # -------------------------
    # Clan membership
    # -------------------------
    CLAN_JOINED = "clan_joined"
    CLAN_JOIN_VIA_INVITE = "clan_join_via_invite"

    # -------------------------
    # Loan lifecycle
    # -------------------------
    LOAN_REQUESTED = "loan_requested"
    LOAN_APPROVED = "loan_approved"
    LOAN_DISBURSED = "loan_disbursed"
    LOAN_REPAID = "loan_repaid"
    LOAN_DEFAULTED = "loan_defaulted"
    LOAN_AUTO_APPROVED = "loan_auto_approved"
    LOAN_INCOMPLETE = "loan_incomplete"
    LOAN_CANCELLED = "loan_cancelled"

    # -------------------------
    # Guarantor actions
    # -------------------------
    GUARANTOR_REQUESTED = "guarantor_requested"
    GUARANTOR_APPROVED = "guarantor_approved"
    GUARANTOR_DECLINED = "guarantor_declined"
    GUARANTOR_EXPIRED = "guarantor_expired"

    # -------------------------
    # System signals
    # -------------------------
    TRUST_RECALCULATED = "trust_recalculated"
