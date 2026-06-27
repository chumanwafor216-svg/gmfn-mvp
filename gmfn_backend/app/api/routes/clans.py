from __future__ import annotations

import json
import os
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, List, Optional
from urllib.parse import quote, urlencode, urlparse

from fastapi import APIRouter, Body, Depends, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.services.notification_service import create_notification
from app.core.auth import get_current_user, is_user_activation_pending, oauth2_scheme
from app.core.clan_auth import (
    _is_default_clan_name,
    ensure_membership,
    get_current_clan_membership,
    list_visible_user_clans,
)
from app.core.dev_guard import require_dev_mode
from app.core.security import decode_token
from app.core.trust_event_types import TrustEventType
from app.db.database import get_db
from app.db.models import (
    Clan,
    ClanInvite,
    ClanJoinRequest,
    ClanJoinVote,
    ClanMembership,
    CommunityFollower,
    CommunityDomainAffiliation,
    CommunityMemberVerification,
    CommunityMemberVerificationRequest,
    TrustEvent,
    User,
)
from app.db.verification_models import IdentityVerificationCheck
from app.api.routes.entry import (
    _find_existing_user_by_identity_profile_checks,
    _identity_profile_payload_for_entry,
)
from app.services.invites_service import (
    api_join_link,
    create_clan_invite,
)
from app.services.global_identity_service import ensure_user_gmfn_id
from app.services.feature_entitlements_service import get_active_feature_quantity_for_scope
from app.services.trust_events_services import log_trust_event
from app.schemas.invites import ClanInviteRelationshipEvidence

router = APIRouter(prefix="/clans", tags=["clans"])

JOIN_APPROVAL_RATIO = Decimal("0.40")
DEFAULT_SHAREABLE_JOIN_INVITE_MAX_USES = 100
FREE_COMMUNITY_MEMBER_CAPACITY = 15
FEATURE_COMMUNITY_MEMBER_CAPACITY = "community_member_capacity"
JOIN_INVITATION_NOT_FOUND = (
    "This invitation link is no longer valid or was not copied fully. "
    "Ask the person who invited you to send a fresh GSN invite link."
)


def _active_clan_member_count(db: Session, *, clan_id: int) -> int:
    return (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .count()
    )


def _community_follower_count(db: Session, *, clan_id: int) -> int:
    return (
        db.query(CommunityFollower)
        .filter(CommunityFollower.clan_id == int(clan_id))
        .count()
    )


def _community_follower_row(
    db: Session,
    *,
    clan_id: int,
    follower_user_id: int,
) -> Optional[CommunityFollower]:
    return (
        db.query(CommunityFollower)
        .filter(
            CommunityFollower.clan_id == int(clan_id),
            CommunityFollower.follower_user_id == int(follower_user_id),
        )
        .first()
    )


def _community_member_capacity_snapshot(db: Session, *, clan_id: int) -> dict[str, int]:
    used = _active_clan_member_count(db, clan_id=int(clan_id))
    extra = get_active_feature_quantity_for_scope(
        db,
        feature_code=FEATURE_COMMUNITY_MEMBER_CAPACITY,
        clan_id=int(clan_id),
    )
    included = FREE_COMMUNITY_MEMBER_CAPACITY
    total = included + extra
    return {
        "included": included,
        "extra": extra,
        "total": total,
        "used": used,
        "remaining": max(0, total - used),
    }


def _assert_community_member_capacity_available(
    db: Session,
    *,
    clan_id: int,
) -> dict[str, int]:
    capacity = _community_member_capacity_snapshot(db, clan_id=int(clan_id))
    if capacity["used"] >= capacity["total"]:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_member_capacity_full",
                "message": (
                    "This community has reached its current member capacity. "
                    "Add an extra member place before approving or adding another member."
                ),
                "member_capacity": capacity,
            },
        )
    return capacity


@router.post(
    "/dev/bootstrap",
    response_model=dict[str, Any],
    dependencies=[Depends(require_dev_mode)],
)
def dev_bootstrap_clan(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    suffix = secrets.token_hex(3)
    name = f"Dev Community {now.strftime('%Y%m%d-%H%M%S')}-{suffix}"

    clan = Clan(
        name=name,
        description="DEV bootstrap clan (fresh)",
        marketplace_name=f"{name} Marketplace",
        marketplace_description="Marketplace identity for this development community.",
        invite_code=secrets.token_urlsafe(16),
        invite_created_at=now,
        invite_expires_at=now + timedelta(days=7),
        invite_max_uses=None,
        invite_uses=0,
    )
    db.add(clan)
    db.commit()
    db.refresh(clan)

    membership = ensure_membership(db=db, clan=clan, user=current_user, role="admin")

    return {
        "ok": True,
        "clan_id": int(clan.id),
        "community_code": _community_code(clan.id),
        "membership_id": int(membership.id),
        "membership_role": membership.role,
        "user_id": int(current_user.id),
        "email": current_user.email,
        "clan_name": clan.name,
        "marketplace_name": clan.marketplace_name,
        "marketplace_description": clan.marketplace_description,
    }


class ClanCreateIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    description: Optional[str] = Field(default=None, max_length=500)
    marketplace_name: Optional[str] = Field(default=None, max_length=120)
    marketplace_description: Optional[str] = Field(default=None, max_length=500)


class ClanOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    marketplace_name: Optional[str] = None
    marketplace_description: Optional[str] = None
    community_code: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MyClansOut(BaseModel):
    items: List[ClanOut]
    total: int


class AddMemberIn(BaseModel):
    user_id: int
    role: str = Field(default="user")


class SetMemberPoolIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: int
    balance: Decimal = Field(
        default=Decimal("0"),
        validation_alias=AliasChoices("balance", "amount"),
    )


class PatchMemberPoolIn(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    pool_balance: Decimal = Field(
        default=Decimal("0"),
        validation_alias=AliasChoices("pool_balance", "amount", "balance"),
    )


class InviteSettingsUpdateIn(BaseModel):
    days: Optional[int] = None
    max_uses: Optional[int] = None
    rotate: bool = False


class ClanInviteCreateBody(BaseModel):
    relationship_evidence: Optional[ClanInviteRelationshipEvidence] = None


class CommunityAffiliationRequestIn(BaseModel):
    parent_community_key: str = Field(..., min_length=1, max_length=64)
    request_note: Optional[str] = Field(default=None, max_length=500)


class CommunityAffiliationDecisionIn(BaseModel):
    decision: str = Field(..., min_length=3, max_length=24)
    decision_note: Optional[str] = Field(default=None, max_length=500)


class CommunityExternalRegistrationRecordIn(BaseModel):
    registration_type: str = Field(default="CAC", max_length=40)
    registration_reference: Optional[str] = Field(default=None, max_length=120)
    registered_name: Optional[str] = Field(default=None, max_length=180)
    issuing_body: Optional[str] = Field(default=None, max_length=120)
    note: Optional[str] = Field(default=None, max_length=500)


class CommunityMemberVerificationIn(BaseModel):
    subject_user_id: int
    claim_label: Optional[str] = Field(default=None, max_length=160)
    verification_note: Optional[str] = Field(default=None, max_length=500)


class CommunityMemberVerificationRequestIn(BaseModel):
    verifier_user_id: int
    claim_label: Optional[str] = Field(default=None, max_length=160)
    request_note: Optional[str] = Field(default=None, max_length=500)


class CommunityMemberVerificationRequestDecisionIn(BaseModel):
    decision: str = Field(..., max_length=24)
    one_time_code: Optional[str] = Field(default=None, max_length=16)
    response_note: Optional[str] = Field(default=None, max_length=500)


class CommunityMemberVerificationWithdrawIn(BaseModel):
    reason: Optional[str] = Field(default=None, max_length=500)


class JoinApplicationIn(BaseModel):
    invite_code: str = Field(..., min_length=3, max_length=128)
    existing_gmfn_id: Optional[str] = Field(default=None, min_length=6, max_length=64)
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    surname: Optional[str] = Field(default=None, min_length=1, max_length=80)
    phone_e164: Optional[str] = Field(default=None, min_length=8, max_length=32)
    country: Optional[str] = Field(default=None, min_length=2, max_length=80)
    date_of_birth: Optional[str] = Field(default=None, max_length=32)
    birth_country: Optional[str] = Field(default=None, max_length=64)
    birth_place: Optional[str] = Field(default=None, max_length=160)
    country_of_origin: Optional[str] = Field(default=None, max_length=64)
    residential_area: Optional[str] = Field(default=None, max_length=160)
    business_name: Optional[str] = Field(default=None, max_length=160)
    note: Optional[str] = Field(default=None, max_length=500)


class VoteJoinRequestIn(BaseModel):
    vote: str = Field(..., pattern="^(approve|reject|neutral)$")
    reason_code: str = Field(..., min_length=2, max_length=80)
    reason_text: Optional[str] = Field(default=None, max_length=240)


_DEFAULT_VOTE_REASON_TEXT = {
    "approve": "I know this person well enough to support the request.",
    "reject": "I have a concern and cannot support the request.",
    "neutral": "I do not know this person well enough to decide.",
}


def _clean_vote_reason(payload: VoteJoinRequestIn) -> dict[str, str]:
    vote = _safe_str(payload.vote).lower()
    reason_code = _safe_str(payload.reason_code).lower().replace(" ", "_")
    reason_text = _safe_str(payload.reason_text)

    if not reason_code:
        raise HTTPException(status_code=422, detail="Vote reason is required")

    return {
        "reason_code": reason_code[:80],
        "reason_text": (reason_text or _DEFAULT_VOTE_REASON_TEXT.get(vote, "Reason recorded."))[:240],
    }


def _invite_preview_payload(
    *,
    valid: bool,
    status: str,
    message: str,
    clan: Optional[Clan] = None,
    invite_row: Optional[ClanInvite] = None,
    invited_by_user_id: Optional[int] = None,
) -> dict[str, Any]:
    expires_at = None
    uses = None
    max_uses = None
    invite_id = None
    invite_code = None

    if invite_row is not None:
        invite_id = int(invite_row.id)
        invite_code = invite_row.code
        expires_at = _effective_invite_expires_at(
            created_at=getattr(invite_row, "created_at", None),
            expires_at=getattr(invite_row, "expires_at", None),
        )
        uses = int(getattr(invite_row, "uses", 0) or 0)
        max_uses = None
    elif clan is not None:
        invite_code = getattr(clan, "invite_code", None)
        expires_at = _effective_invite_expires_at(
            created_at=getattr(clan, "invite_created_at", None),
            expires_at=getattr(clan, "invite_expires_at", None),
        )
        uses = int(getattr(clan, "invite_uses", 0) or 0)
        max_uses = None

    return {
        "ok": True,
        "valid": bool(valid),
        "status": status,
        "message": message,
        "invite_id": invite_id,
        "invite_code": invite_code,
        "community_id": int(clan.id) if clan is not None else None,
        "community_code": _community_code(clan.id, clan=clan) if clan is not None else None,
        "community_name": getattr(clan, "name", None) if clan is not None else None,
        "marketplace_name": getattr(clan, "marketplace_name", None) if clan is not None else None,
        "invited_by_user_id": invited_by_user_id,
        "expires_at": expires_at,
        "uses": uses,
        "max_uses": max_uses,
    }


def _require_clan_admin(clan_ctx: tuple) -> tuple:
    clan, membership, current_user = clan_ctx
    if (membership.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Community admin only")
    return clan, membership, current_user


def _resolve_target_clan_membership(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
) -> tuple[Clan, ClanMembership, User]:
    visible_clans = list_visible_user_clans(db=db, user=current_user)
    clan = next((item for item in visible_clans if int(item.id) == int(clan_id)), None)

    if clan is None:
        clan = db.get(Clan, int(clan_id))

    if not clan or _is_default_clan_name(getattr(clan, "name", None)):
        raise HTTPException(status_code=404, detail="Community not found")

    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not allowed")

    return clan, membership, current_user


def _community_code(clan_id: int | Any, clan: Optional[Clan] = None) -> str:
    if clan is not None:
        saved = _safe_str(getattr(clan, "community_code", None))
        if saved:
            return saved

    try:
        cid = int(clan_id)
    except Exception:
        cid = 0
    return f"GMFN-C-{cid:06d}"


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    s = str(value).strip()
    return s if s else default


def _optional_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[User]:
    if not token:
        return None

    try:
        payload = decode_token(token)
    except Exception:
        return None

    subject = _safe_str(payload.get("sub") if isinstance(payload, dict) else "")
    if not subject:
        return None

    return (
        db.query(User)
        .filter(or_(User.email == subject, User.gmfn_id == subject))
        .first()
    )


def _member_display(user: Optional[User]) -> str:
    if not user:
        return "A GSN member"
    return _safe_str(
        getattr(user, "display_name", None)
        or getattr(user, "name", None)
        or getattr(user, "full_name", None)
        or getattr(user, "gmfn_id", None)
        or getattr(user, "email", None)
        or "A GSN member",
        "A GSN member",
    )


def _member_row(db: Session, m: ClanMembership) -> dict[str, Any]:
    u = db.get(User, m.user_id)
    clan = db.get(Clan, m.clan_id)
    return {
        "id": int(m.id),
        "clan_id": int(m.clan_id),
        "community_code": _community_code(m.clan_id),
        "clan_name": (clan.name if clan else None),
        "user_id": int(m.user_id),
        "email": (u.email if u else None),
        "gmfn_id": (getattr(u, "gmfn_id", None) if u else None),
        "role": m.role,
        "personal_pool_balance": str(m.personal_pool_balance or Decimal("0")),
        "created_at": m.created_at,
    }


def _verification_strength_label(active_count: int) -> str:
    count = max(0, int(active_count or 0))
    if count >= 10:
        return "community_established"
    if count >= 6:
        return "strongly_verified"
    if count >= 3:
        return "community_verified"
    if count >= 1:
        return "lightly_verified"
    return "joined"


def _verification_strength_text(active_count: int) -> str:
    return {
        "community_established": "Community Established",
        "strongly_verified": "Strongly Verified",
        "community_verified": "Community Verified",
        "lightly_verified": "Lightly Verified",
        "joined": "Joined / Unverified",
    }[_verification_strength_label(active_count)]


def _aware_utc(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _membership_renewal_status(valid_until: datetime | None, *, now: datetime | None = None) -> str:
    if valid_until is None:
        return "not_started"
    current = _aware_utc(now) or datetime.now(timezone.utc)
    expiry = _aware_utc(valid_until)
    if expiry is None:
        return "not_started"
    if expiry < current:
        return "expired"
    if expiry <= current + timedelta(days=30):
        return "renewal_due"
    return "active"


def _membership_renewal_status_text(status: str) -> str:
    return {
        "active": "Active",
        "renewal_due": "Renewal Due",
        "expired": "Expired",
        "not_started": "Not Started",
    }.get(_safe_str(status, "not_started").lower(), "Not Started")


def _member_witness_can_renew(valid_until: datetime | None, *, now: datetime) -> bool:
    return _membership_renewal_status(valid_until, now=now) in {"renewal_due", "expired"}


def _member_verification_payload(
    db: Session,
    row: CommunityMemberVerification,
    *,
    include_private_fields: bool = False,
) -> dict[str, Any]:
    subject = db.get(User, int(row.subject_user_id))
    verifier = db.get(User, int(row.verifier_user_id))
    payload = {
        "id": int(row.id),
        "community_id": int(row.clan_id),
        "community_code": _community_code(row.clan_id),
        "subject_user_id": int(row.subject_user_id),
        "subject_gsn_id": _safe_str(getattr(subject, "gmfn_id", None)) or None,
        "subject_display_name": _member_display(subject),
        "verifier_user_id": int(row.verifier_user_id),
        "verifier_gsn_id": _safe_str(getattr(verifier, "gmfn_id", None)) or None,
        "verifier_display_name": _member_display(verifier),
        "status": _safe_str(row.status, "active").lower(),
        "verification_year": int(row.verification_year),
        "claim_label": _safe_str(row.claim_label) or None,
        "source": _safe_str(row.source, "member_witness"),
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "valid_until": row.valid_until,
        "withdrawn_at": row.withdrawn_at,
    }
    if include_private_fields:
        payload["verification_note"] = _safe_str(row.verification_note) or None
        payload["withdrawal_reason"] = _safe_str(row.withdrawal_reason) or None
    return payload


def _member_verification_summary(
    db: Session,
    *,
    clan_id: int,
    subject_user_id: int,
) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    active_member_rows = (
        db.query(ClanMembership, User)
        .join(User, User.id == ClanMembership.user_id)
        .filter(ClanMembership.clan_id == int(clan_id))
        .filter(ClanMembership.left_at.is_(None))
        .all()
    )
    active_member_ids = {
        int(membership.user_id)
        for membership, user in active_member_rows
        if not is_user_activation_pending(user)
    }
    rows = (
        db.query(CommunityMemberVerification)
        .filter(CommunityMemberVerification.clan_id == int(clan_id))
        .filter(CommunityMemberVerification.subject_user_id == int(subject_user_id))
        .order_by(CommunityMemberVerification.created_at.desc(), CommunityMemberVerification.id.desc())
        .all()
    )
    eligible_rows = [
        row
        for row in rows
        if _safe_str(getattr(row, "status", None), "active").lower() == "active"
        and getattr(row, "withdrawn_at", None) is None
        and int(row.verifier_user_id) in active_member_ids
        and int(row.subject_user_id) in active_member_ids
    ]
    active_rows = [
        row
        for row in eligible_rows
        if (_aware_utc(getattr(row, "valid_until", None)) is None or _aware_utc(getattr(row, "valid_until", None)) >= now)
    ]
    active_count = len(active_rows)
    latest_valid_until = max(
        [row.valid_until for row in active_rows if row.valid_until is not None],
        default=max(
            [
                row.valid_until
                for row in eligible_rows
                if row.valid_until is not None
            ],
            default=None,
        ),
    )
    next_witness_renewal_at = min(
        [row.valid_until for row in active_rows if row.valid_until is not None],
        default=None,
    )
    next_witness_renewal_status = _membership_renewal_status(
        next_witness_renewal_at,
        now=now,
    )
    renewal_status = _membership_renewal_status(latest_valid_until, now=now)
    return {
        "community_id": int(clan_id),
        "community_code": _community_code(clan_id),
        "subject_user_id": int(subject_user_id),
        "active_verification_count": active_count,
        "total_verification_count": len(rows),
        "strength": _verification_strength_label(active_count),
        "strength_label": _verification_strength_text(active_count),
        "public_label": (
            "Verified Community Member"
            if active_count >= 3
            else "Community Membership Not Fully Verified"
        ),
        "renewal_status": renewal_status,
        "renewal_status_label": _membership_renewal_status_text(renewal_status),
        "valid_until": latest_valid_until,
        "next_witness_renewal_at": next_witness_renewal_at,
        "next_witness_renewal_status": next_witness_renewal_status,
        "next_witness_renewal_status_label": _membership_renewal_status_text(
            next_witness_renewal_status
        ),
        "items": [_member_verification_payload(db, row) for row in rows],
    }


def _member_verification_request_payload(
    db: Session,
    row: CommunityMemberVerificationRequest,
    *,
    include_one_time_code: bool = False,
) -> dict[str, Any]:
    subject = db.get(User, int(row.subject_user_id))
    verifier = db.get(User, int(row.verifier_user_id))
    requester = db.get(User, int(row.requested_by_user_id))
    payload = {
        "id": int(row.id),
        "community_id": int(row.clan_id),
        "community_code": _community_code(row.clan_id),
        "subject_user_id": int(row.subject_user_id),
        "subject_gsn_id": _safe_str(getattr(subject, "gmfn_id", None)) or None,
        "subject_display_name": _member_display(subject),
        "verifier_user_id": int(row.verifier_user_id),
        "verifier_gsn_id": _safe_str(getattr(verifier, "gmfn_id", None)) or None,
        "verifier_display_name": _member_display(verifier),
        "requested_by_user_id": int(row.requested_by_user_id),
        "requester_gsn_id": _safe_str(getattr(requester, "gmfn_id", None)) or None,
        "requester_display_name": _member_display(requester),
        "public_token": row.public_token,
        "status": _safe_str(row.status, "pending").lower(),
        "claim_label": _safe_str(row.claim_label) or None,
        "request_note": _safe_str(row.request_note) or None,
        "response_note": _safe_str(row.response_note) or None,
        "created_at": row.created_at,
        "updated_at": row.updated_at,
        "expires_at": row.expires_at,
        "decided_at": row.decided_at,
        "resulting_verification_id": (
            int(row.resulting_verification_id) if row.resulting_verification_id else None
        ),
        "approval_path": (
            f"/app/community-confirmations/policy?community_id={int(row.clan_id)}"
            f"&member_witness_request={quote(row.public_token)}"
        ),
    }
    if include_one_time_code:
        payload["one_time_code"] = row.one_time_code
    return payload


def _member_witness_approval_token() -> str:
    return secrets.token_urlsafe(18)


def _member_witness_one_time_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def _has_current_member_witness_standing(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
    now: datetime,
) -> bool:
    active_member_rows = (
        db.query(ClanMembership, User)
        .join(User, User.id == ClanMembership.user_id)
        .filter(ClanMembership.clan_id == int(clan_id))
        .filter(ClanMembership.left_at.is_(None))
        .all()
    )
    active_member_ids = {
        int(membership.user_id)
        for membership, user in active_member_rows
        if not is_user_activation_pending(user)
    }
    if int(user_id) not in active_member_ids:
        return False

    rows = (
        db.query(CommunityMemberVerification)
        .filter(CommunityMemberVerification.clan_id == int(clan_id))
        .filter(CommunityMemberVerification.subject_user_id == int(user_id))
        .filter(CommunityMemberVerification.status == "active")
        .filter(CommunityMemberVerification.withdrawn_at.is_(None))
        .all()
    )
    for row in rows:
        if int(row.verifier_user_id) not in active_member_ids:
            continue
        valid_until = _aware_utc(getattr(row, "valid_until", None))
        if valid_until is None or valid_until >= now:
            return True
    return False


def _member_witness_community_is_active(clan: Clan) -> bool:
    return _safe_str(getattr(clan, "status", None), "active").lower() == "active"


def _require_member_witness_active_community(clan: Clan) -> None:
    if not _member_witness_community_is_active(clan):
        raise HTTPException(
            status_code=403,
            detail="Member witness verification is only available for active communities",
        )


def _is_activation_ready_user(db: Session, user_id: int) -> bool:
    user = db.get(User, int(user_id))
    return bool(user is not None and not is_user_activation_pending(user))


def _community_domain_is_active(clan: Clan) -> bool:
    return _safe_str(getattr(clan, "status", None), "active").lower() == "active"


def _require_active_domain_admin(
    db: Session,
    clan_ctx: tuple,
    *,
    action_label: str = "community domain action",
) -> tuple[Clan, ClanMembership, User]:
    clan, membership, current_user = _require_clan_admin(clan_ctx)
    if not _is_activation_ready_user(db, int(current_user.id)):
        raise HTTPException(
            status_code=403,
            detail=f"Only activated community admins can manage this {action_label}",
        )
    if not _community_domain_is_active(clan):
        raise HTTPException(
            status_code=403,
            detail=f"This {action_label} is only available for active community domains",
        )
    return clan, membership, current_user


def _member_witness_yearly_limit(verifier_role: str) -> int:
    return 100 if _safe_str(verifier_role).lower() == "admin" else 20


def _member_witness_yearly_count(
    db: Session,
    *,
    clan_id: int,
    verifier_user_id: int,
    year: int,
    exclude_subject_user_id: Optional[int] = None,
) -> int:
    query = (
        db.query(CommunityMemberVerification)
        .filter(CommunityMemberVerification.clan_id == int(clan_id))
        .filter(CommunityMemberVerification.verifier_user_id == int(verifier_user_id))
        .filter(CommunityMemberVerification.verification_year == int(year))
    )
    if exclude_subject_user_id is not None:
        query = query.filter(
            CommunityMemberVerification.subject_user_id != int(exclude_subject_user_id)
        )
    return int(query.count())


def _member_witness_pending_request_count(
    db: Session,
    *,
    clan_id: int,
    verifier_user_id: int,
    year: int,
    now: datetime,
    exclude_subject_user_id: Optional[int] = None,
) -> int:
    query = (
        db.query(CommunityMemberVerificationRequest)
        .filter(CommunityMemberVerificationRequest.clan_id == int(clan_id))
        .filter(CommunityMemberVerificationRequest.verifier_user_id == int(verifier_user_id))
        .filter(CommunityMemberVerificationRequest.status == "pending")
        .filter(CommunityMemberVerificationRequest.expires_at >= _aware_utc(now))
    )
    if exclude_subject_user_id is not None:
        query = query.filter(
            CommunityMemberVerificationRequest.subject_user_id != int(exclude_subject_user_id)
        )
    return int(query.count())


def _member_witness_reserved_count(
    db: Session,
    *,
    clan_id: int,
    verifier_user_id: int,
    year: int,
    now: datetime,
    exclude_subject_user_id: Optional[int] = None,
) -> int:
    return _member_witness_yearly_count(
        db,
        clan_id=clan_id,
        verifier_user_id=verifier_user_id,
        year=year,
        exclude_subject_user_id=exclude_subject_user_id,
    ) + _member_witness_pending_request_count(
        db,
        clan_id=clan_id,
        verifier_user_id=verifier_user_id,
        year=year,
        now=now,
        exclude_subject_user_id=exclude_subject_user_id,
    )


def _record_member_verification_for_verifier(
    db: Session,
    *,
    clan: Clan,
    subject_user_id: int,
    verifier_user_id: int,
    verifier_membership: ClanMembership,
    claim_label: Optional[str] = None,
    verification_note: Optional[str] = None,
    source: str = "member_witness",
) -> tuple[CommunityMemberVerification, str]:
    subject_user_id = int(subject_user_id)
    verifier_user_id = int(verifier_user_id)
    _require_member_witness_active_community(clan)
    if subject_user_id == verifier_user_id:
        raise HTTPException(status_code=400, detail="A member cannot verify themselves")

    subject_membership = _is_active_membership(
        db,
        clan_id=int(clan.id),
        user_id=subject_user_id,
    )
    if subject_membership is None:
        raise HTTPException(status_code=404, detail="Subject is not an active member of this community")
    if not _is_activation_ready_user(db, subject_user_id):
        raise HTTPException(status_code=404, detail="Subject is not an active member of this community")
    if not _is_activation_ready_user(db, verifier_user_id):
        raise HTTPException(status_code=403, detail="Only activated community members can verify another member")

    now = datetime.now(timezone.utc)
    year = int(now.year)
    verifier_role = _safe_str(getattr(verifier_membership, "role", None)).lower()
    verifier_is_admin = verifier_role == "admin"
    if not verifier_is_admin and not _has_current_member_witness_standing(
        db,
        clan_id=int(clan.id),
        user_id=verifier_user_id,
        now=now,
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "This verifier must have current community witness standing before "
                "they can verify another member. Ask a community admin or already "
                "verified member to stand for this person."
            ),
        )

    existing = (
        db.query(CommunityMemberVerification)
        .filter(CommunityMemberVerification.clan_id == int(clan.id))
        .filter(CommunityMemberVerification.subject_user_id == subject_user_id)
        .filter(CommunityMemberVerification.verifier_user_id == verifier_user_id)
        .first()
    )

    existing_valid_until = _aware_utc(getattr(existing, "valid_until", None)) if existing else None
    existing_is_current = (
        existing is not None
        and _safe_str(existing.status).lower() == "active"
        and existing.withdrawn_at is None
        and (existing_valid_until is None or existing_valid_until >= now)
    )
    if existing_is_current:
        if not _member_witness_can_renew(existing_valid_until, now=now):
            return existing, "You already have an active witness confirmation for this member."

    yearly_limit = _member_witness_yearly_limit(verifier_role)
    reserved_this_year = _member_witness_reserved_count(
        db,
        clan_id=int(clan.id),
        verifier_user_id=verifier_user_id,
        year=year,
        now=now,
        exclude_subject_user_id=subject_user_id,
    )

    if reserved_this_year >= yearly_limit:
        raise HTTPException(
            status_code=409,
            detail=(
                "This verifier has reached the current yearly member-witness limit. "
                "Ask another active community member with witness standing to stand for this person."
            ),
        )

    note = _safe_str(verification_note)[:500] or None
    claim = _safe_str(claim_label)[:160] or None
    valid_until = now + timedelta(days=365)

    if existing is None:
        row = CommunityMemberVerification(
            clan_id=int(clan.id),
            subject_user_id=subject_user_id,
            verifier_user_id=verifier_user_id,
            status="active",
            verification_year=year,
            verification_note=note,
            claim_label=claim,
            source=_safe_str(source, "member_witness")[:32],
            valid_until=valid_until,
        )
        db.add(row)
    else:
        row = existing
        row.status = "active"
        row.verification_year = year
        row.verification_note = note
        row.claim_label = claim
        row.source = _safe_str(source, "member_witness")[:32]
        row.valid_until = valid_until
        row.withdrawn_at = None
        row.withdrawal_reason = None
        row.updated_at = now

    db.flush()
    log_trust_event(
        db,
        event_type=TrustEventType.COMMUNITY_MEMBER_VERIFIED,
        clan_id=int(clan.id),
        actor_user_id=verifier_user_id,
        subject_user_id=subject_user_id,
        meta={
            "reason": "community_member_witness_confirmation",
            "claim_label": claim,
            "source": _safe_str(source, "member_witness"),
            "valid_until": valid_until.isoformat(),
        },
        dedupe_key=f"community-member-verified-{int(row.id)}-{year}",
        commit=False,
        refresh=False,
    )
    return row, "Member witness confirmation recorded."


def _is_last_admin(db: Session, *, clan_id: int) -> bool:
    admins_count = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id, ClanMembership.role == "admin")
        .count()
    )
    return admins_count <= 1


def _normalize_invite_days(days: Optional[int]) -> int:
    if days is None:
        return 7
    if days < 1:
        return 1
    if days > 30:
        return 30
    return days


def _normalize_invite_max_uses(max_uses: Optional[int]) -> Optional[int]:
    if max_uses is None:
        return None
    if max_uses < 1:
        return 1
    if max_uses > 100:
        return 100
    return max_uses


def _shareable_join_invite_max_uses(
    clan: Clan,
    requested_max_uses: Optional[int],
) -> int:
    requested = _normalize_invite_max_uses(requested_max_uses)
    if requested is not None:
        return int(requested)

    clan_setting = _normalize_invite_max_uses(getattr(clan, "invite_max_uses", None))
    if clan_setting is not None:
        return int(clan_setting)

    return DEFAULT_SHAREABLE_JOIN_INVITE_MAX_USES


def _minimum_invite_ttl_hours() -> int:
    raw = str(os.getenv("GMFN_JOIN_INVITE_MIN_TTL_HOURS") or "24").strip()
    try:
        hours = int(raw)
    except ValueError:
        hours = 24
    return max(0, min(hours, 24 * 30))


def _effective_invite_expires_at(
    *,
    created_at: Optional[datetime],
    expires_at: Optional[datetime],
) -> Optional[datetime]:
    safe_expires_at = _utc_aware(expires_at)
    safe_created_at = _utc_aware(created_at)
    min_hours = _minimum_invite_ttl_hours()

    if safe_expires_at is None or safe_created_at is None or min_hours <= 0:
        return safe_expires_at

    minimum_expires_at = safe_created_at + timedelta(hours=min_hours)
    if safe_expires_at < minimum_expires_at:
        return minimum_expires_at
    return safe_expires_at


def _ensure_invite_expiry(
    db: Session,
    clan: Clan,
    *,
    days: Optional[int] = None,
) -> Clan:
    now = datetime.now(timezone.utc)
    days = _normalize_invite_days(days)
    changed = False

    if not getattr(clan, "invite_code", None):
        clan.invite_code = secrets.token_urlsafe(16)
        changed = True

    if getattr(clan, "invite_created_at", None) is None:
        clan.invite_created_at = now
        changed = True

    if getattr(clan, "invite_expires_at", None) is None:
        clan.invite_expires_at = now + timedelta(days=days)
        changed = True

    if getattr(clan, "invite_uses", None) is None:
        clan.invite_uses = 0
        changed = True

    if changed:
        db.commit()
        db.refresh(clan)

    return clan


def _utc_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _is_invite_expired(clan: Clan) -> bool:
    expires_at = _effective_invite_expires_at(
        created_at=getattr(clan, "invite_created_at", None),
        expires_at=getattr(clan, "invite_expires_at", None),
    )
    if expires_at is None:
        return False
    return expires_at < datetime.now(timezone.utc)


def _is_clan_invite_expired(invite: ClanInvite) -> bool:
    expires_at = _effective_invite_expires_at(
        created_at=getattr(invite, "created_at", None),
        expires_at=getattr(invite, "expires_at", None),
    )
    if expires_at is None:
        return False
    return expires_at < datetime.now(timezone.utc)


def _is_clan_invite_used_up(invite: ClanInvite) -> bool:
    return False


def _latest_usable_clan_invite(
    db: Session,
    *,
    clan_id: int,
) -> Optional[ClanInvite]:
    rows = (
        db.query(ClanInvite)
        .filter(ClanInvite.clan_id == int(clan_id))
        .order_by(ClanInvite.created_at.desc(), ClanInvite.id.desc())
        .all()
    )

    for invite in rows:
        if not bool(getattr(invite, "is_active", True)):
            continue
        if getattr(invite, "revoked_at", None) is not None:
            continue
        if _is_clan_invite_expired(invite):
            continue
        if _is_clan_invite_used_up(invite):
            continue
        return invite

    return None


def _retire_active_clan_invites(
    db: Session,
    *,
    clan_id: int,
) -> int:
    rows = (
        db.query(ClanInvite)
        .filter(ClanInvite.clan_id == int(clan_id))
        .order_by(ClanInvite.created_at.desc(), ClanInvite.id.desc())
        .all()
    )

    retired = 0
    now = datetime.now(timezone.utc)
    for invite in rows:
        if not bool(getattr(invite, "is_active", True)):
            continue
        if getattr(invite, "revoked_at", None) is not None:
            continue
        invite.is_active = False
        invite.revoked_at = now
        retired += 1

    if retired:
        db.commit()

    return retired


def _invite_matches_share_policy(
    invite: ClanInvite,
    *,
    desired_max_uses: int,
    strict: bool,
) -> bool:
    return True


def _clan_from_community_code(
    db: Session,
    community_code: Optional[str],
) -> Optional[Clan]:
    safe_code = _safe_str(community_code).upper()
    if not safe_code:
        return None

    clan = db.query(Clan).filter(Clan.community_code == safe_code).first()
    if clan is not None:
        return clan

    prefix = "GMFN-C-"
    if safe_code.startswith(prefix):
        suffix = safe_code[len(prefix) :].strip()
        if suffix.isdigit():
            return db.get(Clan, int(suffix))

    return None


def _clan_from_community_key(db: Session, community_key: Optional[str]) -> Optional[Clan]:
    key = _safe_str(community_key).upper()
    if not key:
        return None

    if key.isdigit():
        return db.get(Clan, int(key))

    clan = db.query(Clan).filter(Clan.community_code == key).first()
    if clan is not None:
        return clan

    for prefix in ("GMFN-C-", "GSN-C-", "GMFM-C-"):
        if key.startswith(prefix):
            suffix = key[len(prefix) :].strip()
            if suffix.isdigit():
                return db.get(Clan, int(suffix))

    return None


def _community_affiliation_payload(row: CommunityDomainAffiliation) -> dict[str, Any]:
    parent = getattr(row, "parent", None)
    affiliate = getattr(row, "affiliate", None)
    return {
        "id": int(row.id),
        "parent_community_id": int(row.parent_clan_id),
        "parent_community_code": _community_code(row.parent_clan_id, clan=parent),
        "parent_community_name": getattr(parent, "name", None),
        "affiliate_community_id": int(row.affiliate_clan_id),
        "affiliate_community_code": _community_code(row.affiliate_clan_id, clan=affiliate),
        "affiliate_community_name": getattr(affiliate, "name", None),
        "status": _safe_str(row.status, "pending"),
        "request_note": getattr(row, "request_note", None),
        "decision_note": getattr(row, "decision_note", None),
        "requested_by_user_id": int(row.requested_by_user_id),
        "decided_by_user_id": (
            int(row.decided_by_user_id)
            if getattr(row, "decided_by_user_id", None) is not None
            else None
        ),
        "created_at": getattr(row, "created_at", None),
        "updated_at": getattr(row, "updated_at", None),
        "decided_at": getattr(row, "decided_at", None),
    }


def _external_registration_fingerprint(
    *,
    registration_type: str,
    registration_reference: Optional[str],
    registered_name: Optional[str],
    issuing_body: Optional[str],
) -> Optional[str]:
    raw_parts = [
        registration_type,
        registration_reference or "",
        registered_name or "",
        issuing_body or "",
    ]
    normalized = "|".join(_safe_str(part).strip().upper() for part in raw_parts)
    if not normalized.strip("|"):
        return None
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:24]


def _external_registration_record_payload(row: TrustEvent) -> dict[str, Any]:
    meta = getattr(row, "meta", None) or {}
    if not isinstance(meta, dict):
        meta = {}
    return {
        "id": int(row.id),
        "event_type": row.event_type,
        "community_id": int(row.clan_id) if row.clan_id is not None else None,
        "recorded_by_user_id": int(row.actor_user_id),
        "status": "recorded",
        "registration_type": _safe_str(meta.get("registration_type"), "CAC"),
        "registration_reference_recorded": bool(meta.get("registration_reference_present")),
        "registered_name_recorded": bool(meta.get("registered_name_present")),
        "issuing_body": _safe_str(meta.get("issuing_body")) or None,
        "note_recorded": bool(meta.get("note_present")),
        "evidence_fingerprint": _safe_str(meta.get("evidence_fingerprint")) or None,
        "raw_reference_stored": bool(meta.get("raw_reference_stored")),
        "record_detail_storage": _safe_str(meta.get("record_detail_storage")),
        "record_purpose": "supporting_domain_claim_evidence",
        "verification_effect": "none",
        "public_exposure": "private_admin_record_only",
        "boundary": (
            "Recorded supporting evidence only. This is not GSN verification, "
            "not current leadership evidence, not community consent, and not member belonging."
        ),
        "created_at": getattr(row, "created_at", None),
    }


_ensure_user_gmfn_id = ensure_user_gmfn_id


def _current_join_status(
    db: Session,
    *,
    join_request: ClanJoinRequest,
) -> dict[str, Any]:
    active_membership_count = _active_clan_member_count(
        db,
        clan_id=int(join_request.clan_id),
    )
    reviewer_rows = _active_reviewer_memberships(
        db,
        clan_id=int(join_request.clan_id),
    )
    votes = (
        db.query(ClanJoinVote)
        .filter(ClanJoinVote.join_request_id == int(join_request.id))
        .all()
    )

    approvals = sum(
        1 for v in votes if str(getattr(v, "vote", "")).lower() == "approve"
    )
    rejects = sum(
        1 for v in votes if str(getattr(v, "vote", "")).lower() == "reject"
    )
    neutrals = sum(
        1 for v in votes if str(getattr(v, "vote", "")).lower() == "neutral"
    )
    total_votes = len(votes)

    active_reviewers = len(reviewer_rows)
    required = max(
        1,
        int(
            (Decimal(active_reviewers) * JOIN_APPROVAL_RATIO).to_integral_value(
                rounding="ROUND_CEILING"
            )
        ),
    )

    return {
        "approvals": approvals,
        "rejects": rejects,
        "neutrals": neutrals,
        "total_votes": total_votes,
        "active_member_count": active_reviewers,
        "active_membership_count": active_membership_count,
        "active_reviewer_count": active_reviewers,
        "required_approvals": required,
        "threshold_ratio": str(JOIN_APPROVAL_RATIO),
        "eligible_reviewers": [
            {
                "user_id": int(user.id),
                "gmfn_id": _safe_str(getattr(user, "gmfn_id", None)) or None,
                "display": _member_display(user),
                "role": _safe_str(getattr(membership, "role", None), "user"),
            }
            for membership, user in reviewer_rows
        ],
    }


def _is_reviewer_eligible_user(user: Optional[User]) -> bool:
    return not is_user_activation_pending(user)


def _active_reviewer_memberships(
    db: Session,
    *,
    clan_id: int,
) -> list[tuple[ClanMembership, User]]:
    rows = (
        db.query(ClanMembership, User)
        .join(User, User.id == ClanMembership.user_id)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.created_at.asc(), ClanMembership.id.asc())
        .all()
    )
    return [(membership, user) for membership, user in rows if _is_reviewer_eligible_user(user)]


def _join_request_out(db: Session, req: ClanJoinRequest) -> dict[str, Any]:
    clan = db.get(Clan, int(req.clan_id))
    inviter = (
        db.get(User, int(req.invited_by_user_id)) if req.invited_by_user_id else None
    )
    invite = db.get(ClanInvite, int(req.invite_id)) if req.invite_id else None
    applicant = (
        db.get(User, int(req.applicant_user_id)) if req.applicant_user_id else None
    )
    stats = _current_join_status(db, join_request=req)

    return {
        "id": int(req.id),
        "clan_id": int(req.clan_id),
        "community_code": _community_code(req.clan_id),
        "clan_name": (clan.name if clan else None),
        "marketplace_name": (getattr(clan, "marketplace_name", None) if clan else None),
        "applicant_user_id": (
            int(req.applicant_user_id) if req.applicant_user_id is not None else None
        ),
        "applicant_email": (applicant.email if applicant else None),
        "applicant_gmfn_id": (getattr(applicant, "gmfn_id", None) if applicant else None),
        "invite_id": (int(req.invite_id) if req.invite_id is not None else None),
        "invite_code": (invite.code if invite else None),
        "invited_by_user_id": (
            int(req.invited_by_user_id) if req.invited_by_user_id is not None else None
        ),
        "invited_by_email": (inviter.email if inviter else None),
        "invited_by_display": (_member_display(inviter) if inviter else None),
        "status": req.status,
        "created_at": req.created_at,
        "decided_at": req.decided_at,
        "approvals": stats["approvals"],
        "rejects": stats["rejects"],
        "neutrals": stats["neutrals"],
        "total_votes": stats["total_votes"],
        "active_member_count": stats["active_member_count"],
        "active_membership_count": stats["active_membership_count"],
        "active_reviewer_count": stats["active_reviewer_count"],
        "required_approvals": stats["required_approvals"],
        "threshold_ratio": stats["threshold_ratio"],
        "eligible_reviewers": stats["eligible_reviewers"],
    }


def _pending_applicant_email(phone_e164: str) -> str:
    digits = "".join(ch for ch in _safe_str(phone_e164) if ch.isdigit())
    return f"{digits}@pending.gmfn.local"


def _join_applicant_display_name(payload: JoinApplicationIn) -> str:
    return " ".join(
        part
        for part in (_safe_str(payload.first_name), _safe_str(payload.surname))
        if part
    )


def _join_identity_profile_payload(
    payload: JoinApplicationIn,
    *,
    applicant_email: str,
) -> dict[str, Any]:
    return _identity_profile_payload_for_entry(
        display_name=_join_applicant_display_name(payload),
        phone_e164=payload.phone_e164,
        email=applicant_email,
        country=payload.country,
        date_of_birth=payload.date_of_birth,
        birth_country=payload.birth_country or payload.country,
        birth_place=payload.birth_place,
        country_of_origin=payload.country_of_origin,
        residential_area=payload.residential_area,
        browser_locale=None,
        browser_timezone=None,
        client_fingerprint=None,
        device_label=None,
    )


def _join_identity_match_error(
    *,
    user: User,
    signal: str,
    invite_code: str,
    clan: Clan,
) -> HTTPException:
    return HTTPException(
        status_code=409,
        detail={
            "code": "join_identity_match_review_required",
            "message": (
                "These join details look like an existing GSN identity. "
                "Enter the existing GSN ID if it belongs to you, or ask "
                "the community helper to review this before a second identity "
                "is created."
            ),
            "signal": signal,
            "next_action": "use_gsn_id_or_identity_review",
            "next_action_label": "Use GSN ID or review identity",
            "invite_code": invite_code,
            "community_id": int(clan.id),
            "community_code": _community_code(clan.id, clan=clan),
            "community_name": clan.name,
            "marketplace_name": getattr(clan, "marketplace_name", None),
            "gmfn_id": _safe_str(getattr(user, "gmfn_id", None)) or None,
        },
    )


def _raise_if_join_profile_matches_existing_identity(
    db: Session,
    *,
    payload: JoinApplicationIn,
    applicant_email: str,
    invite_code: str,
    clan: Clan,
) -> dict[str, Any]:
    profile_payload = _join_identity_profile_payload(
        payload,
        applicant_email=applicant_email,
    )
    profile_check = IdentityVerificationCheck(
        verification_type="identity_profile",
        provider_key="join.profile_and_place",
        status="recorded",
        subject_reference=profile_payload.get("display_name"),
        confidence_score=20,
        submitted_payload_json=json.dumps(profile_payload, sort_keys=True),
    )
    profile_match, profile_signal = _find_existing_user_by_identity_profile_checks(
        db,
        checks=[profile_check],
    )
    if profile_match is not None:
        raise _join_identity_match_error(
            user=profile_match,
            signal=profile_signal,
            invite_code=invite_code,
            clan=clan,
        )
    return profile_payload


def _record_join_identity_profile_check(
    db: Session,
    *,
    applicant_user: User,
    profile_payload: dict[str, Any],
) -> None:
    existing_check = (
        db.query(IdentityVerificationCheck)
        .filter(
            IdentityVerificationCheck.user_id == int(applicant_user.id),
            IdentityVerificationCheck.verification_type == "identity_profile",
            IdentityVerificationCheck.provider_key == "join.profile_and_place",
        )
        .order_by(IdentityVerificationCheck.id.asc())
        .first()
    )
    normalized_payload = {
        "display_name_key": profile_payload.get("display_name_key"),
        "date_of_birth": profile_payload.get("date_of_birth"),
        "country_key": profile_payload.get("country_key"),
        "birth_country_key": profile_payload.get("birth_country_key"),
        "birth_place_key": profile_payload.get("birth_place_key"),
        "country_of_origin_key": profile_payload.get("country_of_origin_key"),
        "residential_area_key": profile_payload.get("residential_area_key"),
    }
    check = existing_check or IdentityVerificationCheck(
        user_id=int(applicant_user.id),
        verification_type="identity_profile",
        provider_key="join.profile_and_place",
        status="recorded",
        confidence_score=20,
        explanation=(
            "Join request profile evidence was recorded for identity-risk review. "
            "This is not external identity verification."
        ),
    )
    check.region_code = profile_payload.get("country_key")
    check.subject_reference = profile_payload.get("display_name")
    check.submitted_payload_json = json.dumps(profile_payload, sort_keys=True)
    check.normalized_identity_json = json.dumps(normalized_payload, sort_keys=True)
    db.add(check)


def _is_active_membership(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
) -> Optional[ClanMembership]:
    return (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(user_id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )


def _already_member_join_payload(
    db: Session,
    *,
    clan: Clan,
    user: User,
    membership: ClanMembership,
) -> dict[str, Any]:
    return {
        "ok": True,
        "result_status": "already_member",
        "code": "already_member",
        "message": (
            "You already belong to this community. Your existing GSN identity "
            "was reused; no new identity was created."
        ),
        "community_id": int(clan.id),
        "community_code": _community_code(clan.id, clan=clan),
        "community_name": clan.name,
        "marketplace_name": getattr(clan, "marketplace_name", None),
        "user_id": int(user.id),
        "gmfn_id": _safe_str(getattr(user, "gmfn_id", None)) or None,
        "membership": _member_row(db, membership),
        "request": None,
        "existing_identity": True,
        "identity_reused": True,
    }


def _join_request_status_payload(
    db: Session,
    request: Request,
    req: ClanJoinRequest,
) -> dict[str, Any]:
    applicant = (
        db.get(User, int(req.applicant_user_id))
        if req.applicant_user_id is not None
        else None
    )
    clan = db.get(Clan, int(req.clan_id))
    inviter = (
        db.get(User, int(req.invited_by_user_id))
        if req.invited_by_user_id is not None
        else None
    )
    stats = _current_join_status(db, join_request=req)

    gmfn_id = getattr(applicant, "gmfn_id", None) if applicant else None
    safe_status = str(req.status).lower()
    existing_identity_marker = (
        _safe_str(getattr(req, "activation_delivery_status", None)).lower()
        == "not_required"
    )
    activation_not_required = (
        safe_status == "approved"
        and existing_identity_marker
    )
    activation_required = bool(safe_status == "approved" and not activation_not_required)

    saved_activation_link = _safe_str(getattr(req, "activation_link", None))
    if (
        activation_required
        and not saved_activation_link
        and gmfn_id
        and str(req.status).lower() == "approved"
    ):
        saved_activation_link = _frontend_activation_link(request, gmfn_id, int(req.id))

    saved_activation_path = _safe_str(getattr(req, "activation_path", None))
    if (
        activation_required
        and not saved_activation_path
        and gmfn_id
        and str(req.status).lower() == "approved"
    ):
        saved_activation_path = _frontend_activation_path(gmfn_id, int(req.id))

    request_id = int(req.id)
    pending_status_path = f"/pending-approval?request_id={request_id}"
    approval_path = f"/join-approval/{request_id}"

    if safe_status == "approved" and not activation_required:
        result_channel = "approved-existing-member"
        result_path = f"/app/community/{int(req.clan_id)}"
    elif safe_status == "approved":
        result_channel = "activation-ready"
        result_path = saved_activation_path or approval_path
    elif safe_status == "rejected":
        result_channel = "request-rejected"
        result_path = approval_path
    else:
        result_channel = "pending-review"
        result_path = pending_status_path

    return {
        "request_id": request_id,
        "status": req.status,
        "gmfn_id": gmfn_id,
        "community_id": int(req.clan_id),
        "community_code": _community_code(req.clan_id, clan=clan),
        "community_name": (getattr(clan, "name", None) if clan else None),
        "marketplace_name": (getattr(clan, "marketplace_name", None) if clan else None),
        "invited_by_user_id": int(req.invited_by_user_id) if req.invited_by_user_id else None,
        "invited_by_email": (getattr(inviter, "email", None) if inviter else None),
        "invited_by_display": (_member_display(inviter) if inviter else None),
        "pending_status_path": pending_status_path,
        "approval_path": approval_path,
        "result_channel": result_channel,
        "result_path": result_path,
        "activation_path": saved_activation_path or None,
        "activation_link": saved_activation_link or None,
        "activation_message": getattr(req, "activation_message", None),
        "activation_required": activation_required,
        "existing_identity": existing_identity_marker,
        "identity_reused": existing_identity_marker,
        "activation_generated_at": (
            req.activation_generated_at.isoformat()
            if getattr(req, "activation_generated_at", None)
            else None
        ),
        "activation_delivery_status": getattr(req, "activation_delivery_status", None),
        "activation_delivered_at": (
            req.activation_delivered_at.isoformat()
            if getattr(req, "activation_delivered_at", None)
            else None
        ),
        "approvals": stats["approvals"],
        "rejects": stats["rejects"],
        "neutrals": stats["neutrals"],
        "total_votes": stats["total_votes"],
        "active_member_count": stats["active_member_count"],
        "active_membership_count": stats["active_membership_count"],
        "active_reviewer_count": stats["active_reviewer_count"],
        "required_approvals": stats["required_approvals"],
        "threshold_ratio": stats["threshold_ratio"],
        "eligible_reviewers": stats["eligible_reviewers"],
        "next_step": (
            "open-community"
            if safe_status == "approved" and not activation_required
            else "activate-membership"
            if safe_status == "approved"
            else "review-decision"
            if safe_status == "rejected"
            else None
        ),
        "message": str(req.status).lower(),
    }


def _existing_join_request_conflict_detail(
    db: Session,
    request: Request,
    *,
    req: ClanJoinRequest,
) -> dict[str, Any]:
    if str(getattr(req, "status", "")).lower() == "approved":
        req = _mark_activation_opened_if_needed(db, req=req)

    payload = _join_request_status_payload(db, request, req)
    safe_status = _safe_str(getattr(req, "status", None)).lower()
    message = (
        "A pending join request already exists"
        if safe_status == "pending"
        else "This join request was already approved"
        if safe_status == "approved"
        else "This join request already has a final decision"
    )

    return {
        "code": f"{safe_status or 'existing'}_request_exists",
        "message": message,
        "submitted_at": (
            req.created_at.isoformat() if getattr(req, "created_at", None) else None
        ),
        **payload,
    }


def _mark_activation_opened_if_needed(
    db: Session,
    *,
    req: ClanJoinRequest,
) -> ClanJoinRequest:
    if str(getattr(req, "status", "")).lower() != "approved":
        return req

    if (
        _safe_str(getattr(req, "activation_delivery_status", None)).lower()
        == "not_required"
    ):
        return req

    current_delivery = _safe_str(getattr(req, "activation_delivery_status", None)).lower()
    if current_delivery == "opened" and getattr(req, "activation_delivered_at", None):
        return req

    req.activation_delivery_status = "opened"
    if getattr(req, "activation_delivered_at", None) is None:
        req.activation_delivered_at = datetime.now(timezone.utc)

    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def _resolve_public_join_clan(
    db: Session,
    *,
    invite_code: str,
    community_code: Optional[str] = None,
) -> tuple[Optional[Clan], Optional[ClanInvite]]:
    safe_invite_code = _safe_str(invite_code)
    if safe_invite_code:
        invite_row = (
            db.query(ClanInvite)
            .filter(ClanInvite.code == safe_invite_code)
            .order_by(ClanInvite.created_at.desc(), ClanInvite.id.desc())
            .first()
        )
        if invite_row:
            clan = db.get(Clan, int(invite_row.clan_id))
            if clan:
                return clan, invite_row

        legacy_clan = db.query(Clan).filter(Clan.invite_code == safe_invite_code).first()
        if legacy_clan is not None:
            return legacy_clan, None

    community_clan = _clan_from_community_code(db, community_code)
    if community_clan is not None:
        return community_clan, None

    return None, None

PUBLIC_FRONTEND_ORIGIN = "https://gmfn-frontend.onrender.com"


def _is_private_frontend_host(hostname: str) -> bool:
    host = _safe_str(hostname).lower()
    if host in {"localhost", "127.0.0.1", "0.0.0.0", "::1"}:
        return True
    if host.startswith("192.168.") or host.startswith("10."):
        return True
    parts = host.split(".")
    if len(parts) >= 2 and parts[0] == "172":
        try:
            second = int(parts[1])
        except ValueError:
            return False
        return 16 <= second <= 31
    return False


def _is_public_frontend_origin(origin: str) -> bool:
    text = _safe_str(origin)
    if not text:
        return False
    try:
        parsed = urlparse(text)
    except Exception:
        return False
    return (
        parsed.scheme in {"http", "https"}
        and bool(parsed.hostname)
        and not _is_private_frontend_host(parsed.hostname)
    )


def _frontend_origin(request: Request) -> str:
    configured = _safe_str(
        os.getenv("FRONTEND_BASE_URL")
        or os.getenv("GMFN_FRONTEND_BASE_URL")
        or os.getenv("PUBLIC_FRONTEND_URL")
    )
    if configured:
        return configured.rstrip("/")

    request_origin = _safe_str(request.headers.get("origin"))
    if _is_public_frontend_origin(request_origin):
        return request_origin.rstrip("/")

    return PUBLIC_FRONTEND_ORIGIN


def _frontend_community_join_link(
    request: Request,
    *,
    clan: Clan,
    invite_code: str,
    inviter: Optional[User] = None,
) -> str:
    origin = _frontend_origin(request)
    safe_invite_code = quote(str(invite_code or "").strip(), safe="")
    query_params = {
        "invite": str(invite_code or "").strip(),
        "community_code": _community_code(clan.id, clan=clan),
        "community_name": _safe_str(getattr(clan, "name", None)),
        "marketplace_name": _safe_str(getattr(clan, "marketplace_name", None)),
        "inviter_name": _member_display(inviter),
    }
    query = urlencode({k: v for k, v in query_params.items() if _safe_str(v)})
    return f"{origin}/start/join/{safe_invite_code}?{query}" if query else f"{origin}/start/join/{safe_invite_code}"


def _ready_join_preview_for_clan(
    db: Session,
    *,
    clan: Clan,
    message: str,
) -> Optional[dict[str, Any]]:
    latest_invite = _latest_usable_clan_invite(db, clan_id=int(clan.id))
    if latest_invite is not None:
        invited_by_user_id = getattr(latest_invite, "created_by_user_id", None)
        return _invite_preview_payload(
            valid=True,
            status="ready",
            message=message,
            clan=clan,
            invite_row=latest_invite,
            invited_by_user_id=(
                int(invited_by_user_id) if invited_by_user_id is not None else None
            ),
        )

    clan = _ensure_invite_expiry(db, clan, days=None)
    if _is_invite_expired(clan):
        return None

    inviter_membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan.id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.created_at.asc(), ClanMembership.id.asc())
        .first()
    )

    return _invite_preview_payload(
        valid=True,
        status="ready",
        message=message,
        clan=clan,
        invited_by_user_id=(
            int(inviter_membership.user_id) if inviter_membership else None
        ),
    )


def _frontend_activation_path(gmfn_id: str, request_id: Optional[int] = None) -> str:
    params: dict[str, Any] = {"gmfn_id": gmfn_id}
    if request_id is not None:
        params["request_id"] = int(request_id)
    return f"/activate-membership?{urlencode(params)}"


def _frontend_activation_link(
    request: Request,
    gmfn_id: str,
    request_id: Optional[int] = None,
) -> str:
    origin = _frontend_origin(request)
    return f"{origin}{_frontend_activation_path(gmfn_id, request_id)}"


def _build_invite_text(
    *,
    clan: Clan,
    invite_link: str,
    inviter: Optional[User],
) -> str:
    inviter_name = _member_display(inviter)
    clan_name = _safe_str(clan.name, "our GSN community")
    community_code = _community_code(clan.id)
    marketplace_name = _safe_str(getattr(clan, "marketplace_name", None))

    lines = [
        "Hello,",
        "",
        f"{inviter_name} is inviting you to begin the GSN join request for {clan_name}.",
        "This link lets you send your request back to the community for review. It is not automatic entry.",
        f"Invited by: {inviter_name}",
        f"Community ID: {community_code}",
    ]

    if marketplace_name:
        lines.append(f"Community / Market: {marketplace_name}")

    lines.extend(
        [
            "",
            "We have already built trust by knowing, helping, lending, supporting, and standing for one another.",
            "GSN helps make that trust visible, recordable, and useful, so the good things people do for each other can become a trust record for tomorrow.",
            "With GSN, a trusted circle can trade, support small needs, lend, borrow, repay, and build a clearer record of reliability.",
            "Over time, those records can help members carry their good name further, even beyond the people who already know them.",
            "",
            "Open secure join link:",
            invite_link,
            "",
            "Sent through GSN",
        ]
    )

    return "\n".join(lines)


def _build_activation_package(
    *,
    request: Request,
    clan: Clan,
    applicant: User,
    inviter: Optional[User],
    join_request: ClanJoinRequest,
) -> dict[str, Any]:
    gmfn_id = _safe_str(getattr(applicant, "gmfn_id", None))
    activation_path = _frontend_activation_path(gmfn_id, int(join_request.id))
    activation_link = _frontend_activation_link(request, gmfn_id, int(join_request.id))
    community_code = _community_code(clan.id)
    inviter_name = _member_display(inviter)
    marketplace_name = _safe_str(getattr(clan, "marketplace_name", None))

    lines = [
        "Congratulations,",
        "",
        f"Your request to join {clan.name} has been approved.",
        f"Your GSN ID is: {gmfn_id}",
        f"Community ID: {community_code}",
        f"Invited by: {inviter_name}",
    ]

    if marketplace_name:
        lines.append(f"Community / Market: {marketplace_name}")

    lines.extend(
        [
            "",
            "Use the link below to activate your GSN membership and create your password:",
            activation_link,
            "",
            "Once activation is completed, you will be able to enter your workspace properly.",
            "",
            "- Sent via GSN",
        ]
    )

    return {
        "gmfn_id": gmfn_id,
        "community_id": int(clan.id),
        "community_code": community_code,
        "community_name": clan.name,
        "marketplace_name": marketplace_name or None,
        "invited_by_user_id": int(join_request.invited_by_user_id) if join_request.invited_by_user_id else None,
        "invited_by_email": (getattr(inviter, "email", None) if inviter else None),
        "invited_by_display": inviter_name,
        "activation_path": activation_path,
        "activation_link": activation_link,
        "activation_message": "\n".join(lines),
        "lineage": {
            "origin_community_id": int(clan.id),
            "origin_community_code": community_code,
            "origin_community_name": clan.name,
            "inviter_user_id": int(join_request.invited_by_user_id) if join_request.invited_by_user_id else None,
            "invite_id": int(join_request.invite_id) if join_request.invite_id else None,
            "join_request_id": int(join_request.id),
        },
    }


def _build_rejection_package(
    *,
    clan: Clan,
    inviter: Optional[User],
    join_request: ClanJoinRequest,
) -> dict[str, Any]:
    community_code = _community_code(clan.id)
    inviter_name = _member_display(inviter)
    marketplace_name = _safe_str(getattr(clan, "marketplace_name", None))
    approval_path = f"/join-approval/{int(join_request.id)}"

    return {
        "community_id": int(clan.id),
        "community_code": community_code,
        "community_name": clan.name,
        "marketplace_name": marketplace_name or None,
        "invited_by_user_id": int(join_request.invited_by_user_id) if join_request.invited_by_user_id else None,
        "invited_by_email": (getattr(inviter, "email", None) if inviter else None),
        "invited_by_display": inviter_name,
        "approval_path": approval_path,
        "decision_message": (
            f"Your request to join {clan.name} was not approved by the community at this time. "
            "Open the decision page to review the status."
        ),
        "lineage": {
            "origin_community_id": int(clan.id),
            "origin_community_code": community_code,
            "origin_community_name": clan.name,
            "inviter_user_id": int(join_request.invited_by_user_id) if join_request.invited_by_user_id else None,
            "invite_id": int(join_request.invite_id) if join_request.invite_id else None,
            "join_request_id": int(join_request.id),
        },
    }


def _approve_join_request(
    db: Session,
    *,
    join_request: ClanJoinRequest,
    request: Request,
) -> dict[str, Any]:
    applicant = db.get(User, int(join_request.applicant_user_id))
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant user missing")

    applicant = _ensure_user_gmfn_id(db, applicant)

    clan = db.get(Clan, int(join_request.clan_id))
    if not clan:
        raise HTTPException(status_code=404, detail="Community not found")

    if not _safe_str(getattr(clan, "community_code", None)):
        clan.community_code = f"GMFN-C-{int(clan.id):06d}"
        db.add(clan)
        db.commit()
        db.refresh(clan)

    inviter = (
        db.get(User, int(join_request.invited_by_user_id))
        if join_request.invited_by_user_id is not None
        else None
    )

    active_membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan.id),
            ClanMembership.user_id == int(applicant.id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if active_membership is None:
        _assert_community_member_capacity_available(db, clan_id=int(clan.id))

    membership = ensure_membership(db=db, clan=clan, user=applicant, role="user")

    existing_identity = (
        _safe_str(getattr(join_request, "activation_delivery_status", None)).lower()
        == "not_required"
    )

    join_request.status = "approved"
    join_request.decided_at = datetime.now(timezone.utc)

    if existing_identity:
        join_request.activation_link = None
        join_request.activation_message = None
        join_request.activation_generated_at = None
        join_request.activation_delivery_status = "not_required"
    else:
        activation = _build_activation_package(
            request=request,
            clan=clan,
            applicant=applicant,
            inviter=inviter,
            join_request=join_request,
        )
        join_request.activation_link = activation.get("activation_link")
        join_request.activation_message = activation.get("activation_message")
        join_request.activation_generated_at = datetime.now(timezone.utc)
        join_request.activation_delivery_status = "pending"

    db.add(join_request)
    db.commit()
    db.refresh(join_request)

    if existing_identity:
        create_notification(
            db,
            user_id=int(applicant.id),
            kind="approval_success",
            title="You were approved",
            message=(
                f"{clan.name} approved your request. Your existing GSN ID was reused; "
                "no new identity was created."
            ),
            action_url=f"/app/marketplace?community={int(clan.id)}",
            action_label="Open community",
        )
        activation = {
            "gmfn_id": applicant.gmfn_id,
            "community_id": int(clan.id),
            "community_code": _community_code(clan.id, clan=clan),
            "community_name": clan.name,
            "marketplace_name": _safe_str(getattr(clan, "marketplace_name", None)) or None,
            "invited_by_user_id": int(join_request.invited_by_user_id) if join_request.invited_by_user_id else None,
            "invited_by_email": (getattr(inviter, "email", None) if inviter else None),
            "invited_by_display": (_member_display(inviter) if inviter else None),
            "activation_path": None,
            "activation_link": None,
            "activation_message": None,
            "lineage": {
                "origin_community_id": int(clan.id),
                "origin_community_code": _community_code(clan.id, clan=clan),
                "origin_community_name": clan.name,
                "inviter_user_id": int(join_request.invited_by_user_id) if join_request.invited_by_user_id else None,
                "invite_id": int(join_request.invite_id) if join_request.invite_id else None,
                "join_request_id": int(join_request.id),
            },
        }
    else:
        create_notification(
            db,
            user_id=int(applicant.id),
            kind="approval_success",
            title="You were approved",
            message="You can now activate your GSN account.",
            action_url=_safe_str(activation.get("activation_path"), "/activate-membership"),
            action_label="Activate now",
        )
    
    create_notification(
        db,
        user_id=int(applicant.id),
        kind="trust_update",
        title="Your trust has changed",
        message="Your approval has updated your trust standing.",
        action_url="/app/trust",
        action_label="View Trust",
    )

    log_trust_event(
        db,
        event_type=TrustEventType.CLAN_JOIN_VIA_INVITE,
        clan_id=int(clan.id),
        actor_user_id=int(applicant.id),
        subject_user_id=int(applicant.id),
        meta={
            "reason": (
                "existing_user_join_request_approved"
                if existing_identity
                else "new_applicant_join_request_approved"
            ),
            "join_request_id": int(join_request.id),
            "invite_id": int(join_request.invite_id) if join_request.invite_id else None,
            "invited_by_user_id": int(join_request.invited_by_user_id) if join_request.invited_by_user_id else None,
            "membership_id": int(membership.id),
            "user_id": int(applicant.id),
            "gmfn_id": _safe_str(getattr(applicant, "gmfn_id", None)) or None,
            "identity_reused": existing_identity,
        },
        dedupe_key=f"join-request-approved:{int(join_request.id)}",
    )

    return {
        "ok": True,
        "status": "approved",
        "gmfn_id": applicant.gmfn_id,
        "user_id": int(applicant.id),
        "membership_id": int(membership.id),
        "existing_identity": existing_identity,
        "identity_reused": existing_identity,
        "activation_required": not existing_identity,
        "message": (
            "Applicant approved with existing GSN ID."
            if existing_identity
            else "Applicant approved and GSN ID issued."
        ),
        **activation,
        "activation_generated_at": join_request.activation_generated_at,
        "activation_delivery_status": join_request.activation_delivery_status,
    }


def _reject_join_request(
    db: Session,
    *,
    join_request: ClanJoinRequest,
) -> dict[str, Any]:
    applicant = db.get(User, int(join_request.applicant_user_id))
    if not applicant:
        raise HTTPException(status_code=404, detail="Applicant user missing")

    clan = db.get(Clan, int(join_request.clan_id))
    if not clan:
        raise HTTPException(status_code=404, detail="Community not found")

    if not _safe_str(getattr(clan, "community_code", None)):
        clan.community_code = f"GMFN-C-{int(clan.id):06d}"
        db.add(clan)
        db.commit()
        db.refresh(clan)

    inviter = (
        db.get(User, int(join_request.invited_by_user_id))
        if join_request.invited_by_user_id is not None
        else None
    )

    rejection = _build_rejection_package(
        clan=clan,
        inviter=inviter,
        join_request=join_request,
    )

    join_request.status = "rejected"
    join_request.decided_at = datetime.now(timezone.utc)

    db.add(join_request)
    db.commit()
    db.refresh(join_request)

    create_notification(
        db,
        user_id=int(applicant.id),
        kind="approval_rejected",
        title="Your request was not approved",
        message=f"The community did not approve your request to join {clan.name} yet.",
        action_url=_safe_str(rejection.get("approval_path"), f"/join-approval/{int(join_request.id)}"),
        action_label="View decision",
    )

    return {
        "ok": True,
        "status": "rejected",
        "user_id": int(applicant.id),
        "message": "Applicant was not approved by the community.",
        **rejection,
    }

def _clan_out(clan: Clan) -> dict[str, Any]:
    return {
        "id": int(clan.id),
        "name": clan.name,
        "description": clan.description,
        "marketplace_name": getattr(clan, "marketplace_name", None),
        "marketplace_description": getattr(clan, "marketplace_description", None),
        "community_code": _community_code(clan.id),
    }


@router.post("/", status_code=201, response_model=ClanOut)
def create_clan(
    payload: ClanCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_user = _ensure_user_gmfn_id(db, current_user)

    existing = db.query(Clan).filter(Clan.name == payload.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Community name already exists")

    now = datetime.now(timezone.utc)

    derived_marketplace_name = (
        (payload.marketplace_name or "").strip()
        or f"{payload.name.strip()} Marketplace"
    )
    derived_marketplace_description = (
        (payload.marketplace_description or "").strip()
        or f"Marketplace for {payload.name.strip()} community members."
    )

    clan = Clan(
        name=payload.name.strip(),
        description=(payload.description or "").strip() or None,
        marketplace_name=derived_marketplace_name,
        marketplace_description=derived_marketplace_description,
        invite_code=secrets.token_urlsafe(16),
        invite_created_at=now,
        invite_expires_at=now + timedelta(days=7),
        invite_max_uses=None,
        invite_uses=0,
    )
    db.add(clan)
    db.commit()
    db.refresh(clan)

    ensure_membership(db=db, clan=clan, user=current_user, role="admin")

    return _clan_out(clan)


@router.get("/me", response_model=MyClansOut)
def list_my_clans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clans = list_visible_user_clans(db=db, user=current_user)
    items = [_clan_out(clan) for clan in clans]
    return {"items": items, "total": len(items)}


def _followable_clan_or_404(db: Session, clan_id: int) -> Clan:
    clan = db.get(Clan, int(clan_id))
    if (
        not clan
        or _is_default_clan_name(getattr(clan, "name", None))
        or _safe_str(getattr(clan, "status", "active"), "active").lower() != "active"
    ):
        raise HTTPException(status_code=404, detail="Community not found")
    return clan


@router.post("/{clan_id}/follow", response_model=dict[str, Any])
def follow_community(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    clan = _followable_clan_or_404(db, clan_id)
    existing = _community_follower_row(
        db,
        clan_id=int(clan.id),
        follower_user_id=int(current_user.id),
    )
    if existing:
        follower_count = _community_follower_count(db, clan_id=int(clan.id))
        return {
            "ok": True,
            "community_id": int(clan.id),
            "community_code": _community_code(clan.id, clan=clan),
            "is_following": True,
            "already_following": True,
            "follower_count": follower_count,
            "followers_count": follower_count,
        }

    follower = CommunityFollower(
        clan_id=int(clan.id),
        follower_user_id=int(current_user.id),
        created_at=datetime.now(timezone.utc),
    )
    db.add(follower)
    db.flush()
    log_trust_event(
        db,
        event_type="community.followed",
        clan_id=int(clan.id),
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        loan_id=None,
        guarantor_id=None,
        meta={
            "reason": "community_followed",
            "trust_delta": "0.00",
            "community_id": int(clan.id),
            "community_code": _community_code(clan.id, clan=clan),
            "community_name": getattr(clan, "name", None),
            "marketplace_name": getattr(clan, "marketplace_name", None),
            "follower_user_id": int(current_user.id),
            "signal_strength": "weak_group_interest",
            "group_context": True,
            "not_membership": True,
            "not_endorsement": True,
            "not_verification": True,
            "not_payment_evidence": True,
        },
        commit=False,
        refresh=False,
    )
    db.commit()

    follower_count = _community_follower_count(db, clan_id=int(clan.id))
    return {
        "ok": True,
        "community_id": int(clan.id),
        "community_code": _community_code(clan.id, clan=clan),
        "is_following": True,
        "already_following": False,
        "follower_count": follower_count,
        "followers_count": follower_count,
    }


@router.delete("/{clan_id}/follow", response_model=dict[str, Any])
def unfollow_community(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    clan = _followable_clan_or_404(db, clan_id)
    existing = _community_follower_row(
        db,
        clan_id=int(clan.id),
        follower_user_id=int(current_user.id),
    )
    if existing:
        db.delete(existing)
        log_trust_event(
            db,
            event_type="community.unfollowed",
            clan_id=int(clan.id),
            actor_user_id=int(current_user.id),
            subject_user_id=int(current_user.id),
            loan_id=None,
            guarantor_id=None,
            meta={
                "reason": "community_unfollowed",
                "trust_delta": "0.00",
                "community_id": int(clan.id),
                "community_code": _community_code(clan.id, clan=clan),
                "community_name": getattr(clan, "name", None),
                "marketplace_name": getattr(clan, "marketplace_name", None),
                "follower_user_id": int(current_user.id),
                "signal_strength": "weak_group_interest",
                "group_context": True,
                "not_membership": True,
                "not_endorsement": True,
                "not_verification": True,
                "not_payment_evidence": True,
            },
            commit=False,
            refresh=False,
        )
        db.commit()

    follower_count = _community_follower_count(db, clan_id=int(clan.id))
    return {
        "ok": True,
        "community_id": int(clan.id),
        "community_code": _community_code(clan.id, clan=clan),
        "is_following": False,
        "follower_count": follower_count,
        "followers_count": follower_count,
    }


@router.get("/{clan_id}/followers/count", response_model=dict[str, Any])
def get_community_follower_count(
    clan_id: int,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    clan = _followable_clan_or_404(db, clan_id)
    follower_count = _community_follower_count(db, clan_id=int(clan.id))
    return {
        "ok": True,
        "community_id": int(clan.id),
        "community_code": _community_code(clan.id, clan=clan),
        "follower_count": follower_count,
        "followers_count": follower_count,
    }


@router.get("/{clan_id}/follow-status", response_model=dict[str, Any])
def get_community_follow_status(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    clan = _followable_clan_or_404(db, clan_id)
    is_following = (
        _community_follower_row(
            db,
            clan_id=int(clan.id),
            follower_user_id=int(current_user.id),
        )
        is not None
    )
    follower_count = _community_follower_count(db, clan_id=int(clan.id))
    return {
        "ok": True,
        "community_id": int(clan.id),
        "community_code": _community_code(clan.id, clan=clan),
        "is_following": is_following,
        "can_follow": True,
        "follower_count": follower_count,
        "followers_count": follower_count,
    }


@router.post("/{clan_id}/join", status_code=201, response_model=dict[str, Any])
def join_clan(
    clan_id: int,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan = db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Community not found")
    if _is_default_clan_name(getattr(clan, "name", None)):
        raise HTTPException(status_code=404, detail="Community not found")

    current_user = _ensure_user_gmfn_id(db, current_user)

    exists = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == current_user.id,
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if exists:
        response.status_code = 200
        log_trust_event(
            db,
            event_type=TrustEventType.CLAN_JOINED,
            clan_id=int(clan_id),
            actor_user_id=int(current_user.id),
            subject_user_id=int(current_user.id),
            meta={
                "reason": "direct_join_already_member",
                "membership_id": int(exists.id),
                "user_id": int(current_user.id),
                "gmfn_id": _safe_str(getattr(current_user, "gmfn_id", None)) or None,
                "identity_reused": True,
                "community_admission_status": "already_member",
            },
            dedupe_key=f"direct-join-already-member:{int(clan_id)}:{int(current_user.id)}",
        )
        return {
            "ok": True,
            "result_status": "already_member",
            "code": "already_member",
            "message": "You already belong to this community. Your existing GSN identity was reused.",
            "community_id": int(clan_id),
            "community_code": _community_code(clan_id),
            "community_name": clan.name,
            "user_id": int(current_user.id),
            "gmfn_id": _safe_str(getattr(current_user, "gmfn_id", None)) or None,
            "existing_identity": True,
            "identity_reused": True,
            "membership": _member_row(db, exists),
        }

    _assert_community_member_capacity_available(db, clan_id=int(clan_id))

    m = ClanMembership(
        clan_id=clan_id,
        user_id=current_user.id,
        role="user",
        personal_pool_balance=Decimal("0"),
    )
    db.add(m)
    db.commit()
    db.refresh(m)

    log_trust_event(
        db,
        event_type=TrustEventType.CLAN_JOINED,
        clan_id=int(clan_id),
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        meta={
            "reason": "direct_existing_user_membership_created",
            "membership_id": int(m.id),
            "user_id": int(current_user.id),
            "gmfn_id": _safe_str(getattr(current_user, "gmfn_id", None)) or None,
            "identity_reused": True,
            "community_admission_status": "joined",
        },
        dedupe_key=f"direct-join-created:{int(m.id)}",
    )

    return {
        "ok": True,
        "result_status": "joined_successfully",
        "code": "joined_successfully",
        "message": "Community membership created using your existing GSN identity.",
        "community_id": int(clan_id),
        "community_code": _community_code(clan_id),
        "community_name": clan.name,
        "user_id": int(current_user.id),
        "gmfn_id": _safe_str(getattr(current_user, "gmfn_id", None)) or None,
        "existing_identity": True,
        "identity_reused": True,
        "membership": _member_row(db, m),
    }


@router.delete("/{clan_id}/leave", response_model=dict[str, Any])
def leave_clan(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == current_user.id,
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="You are not a member of this community")

    if (m.role or "").lower() == "admin" and _is_last_admin(db, clan_id=clan_id):
        raise HTTPException(
            status_code=400,
            detail="Cannot leave: you are the last admin",
        )

    m.left_at = datetime.now(timezone.utc)
    db.add(m)
    db.commit()
    return {"ok": True, "community_code": _community_code(clan_id)}


@router.post("/{clan_id}/select", response_model=dict[str, Any])
def select_clan(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan = db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Community not found")
    if _is_default_clan_name(getattr(clan, "name", None)):
        raise HTTPException(status_code=404, detail="Community not found")

    membership = _is_active_membership(
        db,
        clan_id=int(clan.id),
        user_id=int(current_user.id),
    )
    if membership is None:
        raise HTTPException(
            status_code=403,
            detail="Join or be approved by this community before selecting it.",
        )

    return {
        "ok": True,
        "selected_clan_id": int(clan.id),
        "community_code": _community_code(clan.id),
        "membership_id": int(membership.id),
        "membership_role": membership.role,
        "use_this_header": {"X-Clan-Id": int(clan.id)},
    }


@router.post("/{clan_id}/invite", response_model=dict[str, Any])
def create_invite(
    clan_id: int,
    request: Request,
    days: Optional[int] = None,
    max_uses: Optional[int] = None,
    payload: Optional[ClanInviteCreateBody] = Body(default=None),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")
    if membership is None or getattr(membership, "left_at", None) is not None:
        raise HTTPException(status_code=403, detail="Only community members can create invite links")

    days_n = _normalize_invite_days(days)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=days_n)

    inv = create_clan_invite(
        db,
        clan_id=int(clan_id),
        created_by_user=current_user,
        expires_at=expires_at,
        max_uses=None,
        relationship_evidence=(
            payload.relationship_evidence.model_dump(exclude_none=True)
            if payload and payload.relationship_evidence
            else None
        ),
    )

    share_link = _frontend_community_join_link(
        request,
        clan=clan,
        invite_code=inv.code,
        inviter=current_user,
    )

    return {
        "clan_id": int(clan_id),
        "community_code": _community_code(clan_id),
        "community_name": clan.name,
        "marketplace_name": getattr(clan, "marketplace_name", None),
        "invited_by_user_id": int(current_user.id),
        "invited_by_email": getattr(current_user, "email", None),
        "invited_by_display": _member_display(current_user),
        "code": inv.code,
        "invite_code": inv.code,
        "created_at": inv.created_at,
        "expires_at": inv.expires_at,
        "is_active": bool(inv.is_active),
        "uses": int(inv.uses or 0),
        "max_uses": None,
        "retired_live_invites": 0,
        "share_link": share_link,
        "invite_link": share_link,
        "invite_url": share_link,
        "url": share_link,
        "link": share_link,
        "api_link": api_join_link(request, inv.code),
        "invite_text": _build_invite_text(
            clan=clan,
            invite_link=share_link,
            inviter=current_user,
        ),
    }


@router.get("/{clan_id}/invite-link", response_model=dict[str, Any])
def get_invite_link(
    clan_id: int,
    request: Request,
    days: Optional[int] = None,
    max_uses: Optional[int] = None,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    can_refresh_invite = True
    max_uses_norm = None
    strict_max_uses = False

    latest_invite = _latest_usable_clan_invite(db, clan_id=int(clan.id))

    if can_refresh_invite and latest_invite is not None and not _invite_matches_share_policy(
        latest_invite,
        desired_max_uses=max_uses_norm,
        strict=strict_max_uses,
    ):
        latest_invite = None

    if latest_invite is None:
        days_n = _normalize_invite_days(days)
        expires_at = datetime.now(timezone.utc) + timedelta(days=days_n)
        latest_invite = create_clan_invite(
            db,
            clan_id=int(clan.id),
            created_by_user=current_user,
            expires_at=expires_at,
            max_uses=None,
        )

    if latest_invite is not None:
        invite_creator = (
            db.get(User, int(latest_invite.created_by_user_id))
            if getattr(latest_invite, "created_by_user_id", None) is not None
            else None
        )
        invite_creator = invite_creator or current_user
        share_link = _frontend_community_join_link(
            request,
            clan=clan,
            invite_code=latest_invite.code,
            inviter=invite_creator,
        )

        return {
            "clan_id": int(clan.id),
            "community_code": _community_code(clan.id),
            "community_name": clan.name,
            "marketplace_name": getattr(clan, "marketplace_name", None),
            "invited_by_user_id": int(invite_creator.id),
            "invited_by_email": getattr(invite_creator, "email", None),
            "invited_by_display": _member_display(invite_creator),
            "invite_code": latest_invite.code,
            "invite_created_at": latest_invite.created_at,
            "invite_expires_at": latest_invite.expires_at,
            "invite_max_uses": None,
            "invite_uses": int(getattr(latest_invite, "uses", 0) or 0),
            "invite_status": "ready",
            "invite_source": "clan_invite",
            "can_refresh_invite": bool(can_refresh_invite),
            "requires_admin_refresh": False,
            "message": (
                "Official join link ready. Any active member may share it, and "
                "every join request still goes through community review."
            ),
            "invite_link": share_link,
            "invite_url": share_link,
            "url": share_link,
            "link": share_link,
            "share_link": share_link,
            "api_link": api_join_link(request, latest_invite.code),
            "invite_text": _build_invite_text(
                clan=clan,
                invite_link=share_link,
                inviter=invite_creator,
            ),
        }

    raise HTTPException(status_code=500, detail="Could not prepare a live GSN invite link")


@router.get("/join-invite/preview", response_model=dict[str, Any])
def preview_join_invite(
    code: str,
    community_code: Optional[str] = None,
    db: Session = Depends(get_db),
):
    invite_code = (code or "").strip()
    if not invite_code:
        return _invite_preview_payload(
            valid=False,
            status="missing",
            message=JOIN_INVITATION_NOT_FOUND,
        )

    invite_row = (
        db.query(ClanInvite)
        .filter(ClanInvite.code == invite_code)
        .order_by(ClanInvite.created_at.desc(), ClanInvite.id.desc())
        .first()
    )

    if invite_row:
        clan = db.get(Clan, int(invite_row.clan_id))
        if not clan:
            return _invite_preview_payload(
                valid=False,
                status="not_found",
                message=JOIN_INVITATION_NOT_FOUND,
            )

        if not bool(invite_row.is_active) or invite_row.revoked_at is not None:
            recovered = _ready_join_preview_for_clan(
                db,
                clan=clan,
                message="A newer live invitation was found for this community. You can continue with your join request.",
            )
            if recovered and _safe_str(recovered.get("invite_code")) != invite_code:
                return recovered
            return _invite_preview_payload(
                valid=False,
                status="inactive",
                message="This invitation is no longer active. Ask for a fresh GSN invite link.",
                clan=clan,
                invite_row=invite_row,
                invited_by_user_id=int(invite_row.created_by_user_id),
            )

        if _is_clan_invite_expired(invite_row):
            recovered = _ready_join_preview_for_clan(
                db,
                clan=clan,
                message="A newer live invitation was found for this community. You can continue with your join request.",
            )
            if recovered and _safe_str(recovered.get("invite_code")) != invite_code:
                return recovered
            return _invite_preview_payload(
                valid=False,
                status="expired",
                message="This invitation has expired. Ask for a fresh GSN invite link.",
                clan=clan,
                invite_row=invite_row,
                invited_by_user_id=int(invite_row.created_by_user_id),
            )

        return _invite_preview_payload(
            valid=True,
            status="ready",
            message="Invite is ready. You can send your join request for community review.",
            clan=clan,
            invite_row=invite_row,
            invited_by_user_id=int(invite_row.created_by_user_id),
        )

    legacy_clan = db.query(Clan).filter(Clan.invite_code == invite_code).first()
    if legacy_clan is not None:
        recovered = _ready_join_preview_for_clan(
            db,
            clan=legacy_clan,
            message="We found the latest live invitation for this community. You can continue with your join request.",
        )
        if recovered is not None:
            return recovered

        legacy_clan = _ensure_invite_expiry(db, legacy_clan, days=None)

        if _is_invite_expired(legacy_clan):
            return _invite_preview_payload(
                valid=False,
                status="expired",
                message="This invitation has expired. Ask for a fresh GSN invite link.",
                clan=legacy_clan,
            )

        return _invite_preview_payload(
            valid=True,
            status="ready",
            message="Invite is ready. You can send your join request for community review.",
            clan=legacy_clan,
        )

    community_clan = _clan_from_community_code(db, community_code)
    if community_clan is not None:
        recovered = _ready_join_preview_for_clan(
            db,
            clan=community_clan,
            message="We found the latest live invitation for this community. You can continue with your join request.",
        )
        if recovered is not None:
            return recovered

    return _invite_preview_payload(
        valid=False,
        status="not_found",
        message=JOIN_INVITATION_NOT_FOUND,
    )


@router.get("/join-invite/request-status", response_model=dict[str, Any])
def get_join_invite_request_status(
    code: str,
    phone_e164: str,
    request: Request,
    community_code: Optional[str] = None,
    db: Session = Depends(get_db),
):
    invite_code = _safe_str(code)
    phone = _safe_str(phone_e164)

    if not invite_code or not phone:
        return {"ok": True, "found": False}

    clan, _invite_row = _resolve_public_join_clan(
        db,
        invite_code=invite_code,
        community_code=community_code,
    )
    if clan is None:
        return {"ok": True, "found": False}

    pending_email = _pending_applicant_email(phone)
    applicant = (
        db.query(User)
        .filter(
            or_(
                User.phone_e164 == phone,
                User.email == pending_email,
            )
        )
        .order_by(User.id.desc())
        .first()
    )
    if applicant is None:
        return {
            "ok": True,
            "found": False,
            "community_id": int(clan.id),
            "community_code": _community_code(clan.id, clan=clan),
            "community_name": getattr(clan, "name", None),
            "marketplace_name": getattr(clan, "marketplace_name", None),
        }

    join_request = (
        db.query(ClanJoinRequest)
        .filter(
            ClanJoinRequest.clan_id == int(clan.id),
            ClanJoinRequest.applicant_user_id == int(applicant.id),
        )
        .order_by(ClanJoinRequest.created_at.desc(), ClanJoinRequest.id.desc())
        .first()
    )
    if join_request is None:
        return {
            "ok": True,
            "found": False,
            "community_id": int(clan.id),
            "community_code": _community_code(clan.id, clan=clan),
            "community_name": getattr(clan, "name", None),
            "marketplace_name": getattr(clan, "marketplace_name", None),
        }

    join_request = _mark_activation_opened_if_needed(db, req=join_request)

    return {
        "ok": True,
        "found": True,
        **_join_request_status_payload(db, request, join_request),
    }


@router.get("/join", response_class=HTMLResponse)
def join_landing_page(
    code: str,
    db: Session = Depends(get_db),
):
    safe_code = (code or "").strip()
    clan = db.query(Clan).filter(Clan.invite_code == safe_code).first()

    clan_name = "-"
    community_code = "-"
    expires_text = "-"
    usage_text = "-"
    remaining_text = "-"
    status_text = ""
    status_color = "#666"

    now = datetime.now(timezone.utc)

    if not clan:
        status_text = "Invalid invite code"
        status_color = "#b00"
    else:
        clan_name = getattr(clan, "name", "-")
        community_code = _community_code(clan.id)

        expires_at = _effective_invite_expires_at(
            created_at=getattr(clan, "invite_created_at", None),
            expires_at=getattr(clan, "invite_expires_at", None),
        )
        if expires_at is None:
            expires_text = "No expiry"
        else:
            expires_text = expires_at.strftime("%Y-%m-%d %H:%M UTC")

        uses = int(getattr(clan, "invite_uses", 0) or 0)
        max_uses = getattr(clan, "invite_max_uses", None)

        usage_text = f"{uses} / unlimited"
        remaining_text = "Unlimited"

        expired = False
        if expires_at is not None and expires_at < now:
            expired = True

        if expired:
            status_text = "Invite expired"
            status_color = "#b00"
        else:
            status_text = "Invite valid"
            status_color = "#0a7"

    return f"""
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Join GSN Community</title>
<style>
body {{ font-family: Arial, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 16px; }}
.box {{ border: 1px solid #ddd; border-radius: 10px; padding: 18px; }}
.badge {{ display:inline-block; padding: 6px 10px; border-radius:999px; font-size:13px; color:#fff; background:{status_color}; }}
.kv {{ display:grid; grid-template-columns: 160px 1fr; gap: 6px 12px; margin-top: 12px; }}
.muted {{ color:#666; font-size:14px; line-height:1.6; }}
</style>
</head>
<body>
<h2>Join a GSN Community</h2>
<div class="box">
<div class="badge">{status_text}</div>
<div class="kv">
<div class="muted">Community</div><div>{clan_name}</div>
<div class="muted">Community ID</div><div>{community_code}</div>
<div class="muted">Invite code</div><div>{safe_code}</div>
<div class="muted">Expires</div><div>{expires_text}</div>
<div class="muted">Usage</div><div>{usage_text}</div>
<div class="muted">Remaining</div><div>{remaining_text}</div>
</div>
<p class="muted" style="margin-top:18px;">
This invitation lets you begin the request-to-join process.
Registration or acceptance of this invite does not by itself guarantee admission.
Final admission depends on the community's existing approval requirements.
</p>
</div>
</body>
</html>
"""


@router.post("/join-requests", response_model=dict[str, Any], status_code=201)
def create_join_request(
    payload: JoinApplicationIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(_optional_current_user),
):
    invite_code = (payload.invite_code or "").strip()
    if not invite_code:
        raise HTTPException(status_code=400, detail="invite_code is required")

    invite_row = (
        db.query(ClanInvite)
        .filter(ClanInvite.code == invite_code)
        .order_by(ClanInvite.created_at.desc(), ClanInvite.id.desc())
        .first()
    )

    if invite_row:
        clan = db.get(Clan, int(invite_row.clan_id))
        if not clan:
            raise HTTPException(status_code=404, detail=JOIN_INVITATION_NOT_FOUND)

        if not bool(invite_row.is_active) or invite_row.revoked_at is not None:
            raise HTTPException(status_code=400, detail="Invitation is no longer active")

        if _is_clan_invite_expired(invite_row):
            raise HTTPException(status_code=400, detail="Invitation has expired")

        invite_max_uses = None
        invite_uses = int(getattr(invite_row, "uses", 0) or 0)

        invited_by_user_id = int(invite_row.created_by_user_id)
    else:
        clan = db.query(Clan).filter(Clan.invite_code == invite_code).first()
        if not clan:
            raise HTTPException(status_code=404, detail=JOIN_INVITATION_NOT_FOUND)

        clan = _ensure_invite_expiry(db, clan, days=None)

        if _is_invite_expired(clan):
            raise HTTPException(status_code=400, detail="Invitation has expired")

        invite_max_uses = None
        invite_uses = int(getattr(clan, "invite_uses", 0) or 0)

        inviter_membership = (
            db.query(ClanMembership)
            .filter(
                ClanMembership.clan_id == int(clan.id),
                ClanMembership.left_at.is_(None),
            )
            .order_by(ClanMembership.created_at.asc(), ClanMembership.id.asc())
            .first()
        )

        invited_by_user_id = int(inviter_membership.user_id) if inviter_membership else None

    submitted_existing_gmfn_id = _safe_str(payload.existing_gmfn_id).upper()
    claimed_existing_identity_user = None
    if submitted_existing_gmfn_id:
        claimed_existing_identity_user = (
            db.query(User)
            .filter(User.gmfn_id == submitted_existing_gmfn_id)
            .first()
        )
        if claimed_existing_identity_user is None or is_user_activation_pending(
            claimed_existing_identity_user
        ):
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "existing_gsn_id_not_found",
                    "message": (
                        "We could not find an active GSN identity with that number. "
                        "Check the number, or continue as new."
                    ),
                    "gmfn_id": submitted_existing_gmfn_id,
                    "invite_code": invite_code,
                    "community_id": int(clan.id),
                    "community_code": _community_code(clan.id, clan=clan),
                    "community_name": clan.name,
                    "marketplace_name": getattr(clan, "marketplace_name", None),
                },
            )

    existing_identity_join = bool(
        (
            current_user is not None
            and not is_user_activation_pending(current_user)
        )
        or claimed_existing_identity_user is not None
    )

    submitted_phone = _safe_str(payload.phone_e164)
    join_identity_profile_payload: dict[str, Any] | None = None
    if claimed_existing_identity_user is not None:
        missing_existing_fields = [
            label
            for label, value in (
                ("first_name", payload.first_name),
                ("surname", payload.surname),
                ("phone_e164", payload.phone_e164),
            )
            if not _safe_str(value)
        ]
        if missing_existing_fields:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "existing_gsn_applicant_details_required",
                    "message": (
                        "Add the applicant name and phone number with the GSN ID "
                        "so the community can recognize who is asking to join."
                    ),
                    "missing_fields": missing_existing_fields,
                },
            )
    if existing_identity_join:
        applicant_user = (
            claimed_existing_identity_user
            if claimed_existing_identity_user is not None
            else _ensure_user_gmfn_id(db, current_user)
        )
    else:
        missing_fields = [
            label
            for label, value in (
                ("first_name", payload.first_name),
                ("surname", payload.surname),
                ("phone_e164", payload.phone_e164),
                ("country", payload.country),
                ("date_of_birth", payload.date_of_birth),
                ("birth_place", payload.birth_place),
            )
            if not _safe_str(value)
        ]
        if missing_fields:
            raise HTTPException(
                status_code=422,
                detail={
                    "code": "new_applicant_details_required",
                    "message": "New applicants must provide basic join request details.",
                    "missing_fields": missing_fields,
                },
            )

        applicant_email = _pending_applicant_email(submitted_phone)
        existing_user = db.query(User).filter(User.email == applicant_email).first()
        if not existing_user:
            join_identity_profile_payload = _raise_if_join_profile_matches_existing_identity(
                db,
                payload=payload,
                applicant_email=applicant_email,
                invite_code=invite_code,
                clan=clan,
            )
        existing_identity_user = (
            db.query(User)
            .filter(User.phone_e164 == submitted_phone)
            .first()
        )
        existing_identity_email = _safe_str(
            getattr(existing_identity_user, "email", None)
        ).lower()
        if (
            existing_identity_user is not None
            and not existing_identity_email.endswith("@pending.gmfn.local")
            and not is_user_activation_pending(existing_identity_user)
        ):
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "existing_gsn_id_required",
                    "message": (
                        "This phone number is already tied to an existing GSN identity. "
                        "Enter that GSN ID on this invite so the community request "
                        "can reuse one identity."
                    ),
                    "invite_code": invite_code,
                    "community_id": int(clan.id),
                    "community_code": _community_code(clan.id, clan=clan),
                    "community_name": clan.name,
                    "marketplace_name": getattr(clan, "marketplace_name", None),
                    "gmfn_id": _safe_str(getattr(existing_identity_user, "gmfn_id", None)) or None,
                },
            )

        if existing_user:
            applicant_user = existing_user
        else:
            applicant_user = User(
                email=applicant_email,
                hashed_password="PENDING_APPROVAL",
                role="user",
            )
            db.add(applicant_user)
            db.commit()
            db.refresh(applicant_user)

        if join_identity_profile_payload:
            _record_join_identity_profile_check(
                db,
                applicant_user=applicant_user,
                profile_payload=join_identity_profile_payload,
            )

    applicant_phone_updated = False
    if (
        submitted_phone
        and not _safe_str(getattr(applicant_user, "phone_e164", None))
    ):
        applicant_user.phone_e164 = submitted_phone
        db.add(applicant_user)
        applicant_phone_updated = True

    if not existing_identity_join or applicant_phone_updated:
        db.commit()
        db.refresh(applicant_user)

    existing_membership = _is_active_membership(
        db,
        clan_id=int(clan.id),
        user_id=int(applicant_user.id),
    )
    if existing_membership:
        log_trust_event(
            db,
            event_type=TrustEventType.INVITE_ACCEPTED,
            clan_id=int(clan.id),
            actor_user_id=int(applicant_user.id),
            subject_user_id=int(applicant_user.id),
            meta={
                "reason": "existing_user_invite_already_member",
                "invite_code": invite_code,
                "invite_id": int(invite_row.id) if invite_row else None,
                "user_id": int(applicant_user.id),
                "gmfn_id": _safe_str(getattr(applicant_user, "gmfn_id", None)) or None,
                "membership_id": int(existing_membership.id),
                "identity_reused": True,
            },
            dedupe_key=(
                "join-request-already-member:"
                f"{int(clan.id)}:{int(applicant_user.id)}:{invite_code}"
            ),
        )
        return _already_member_join_payload(
            db,
            clan=clan,
            user=applicant_user,
            membership=existing_membership,
        )

    existing_request = (
        db.query(ClanJoinRequest)
        .filter(
            ClanJoinRequest.clan_id == int(clan.id),
            ClanJoinRequest.applicant_user_id == int(applicant_user.id),
        )
        .order_by(ClanJoinRequest.created_at.desc(), ClanJoinRequest.id.desc())
        .first()
    )
    if existing_request:
        raise HTTPException(
            status_code=409,
            detail=_existing_join_request_conflict_detail(
                db,
                request,
                req=existing_request,
            ),
        )

    join_request = ClanJoinRequest(
        clan_id=int(clan.id),
        applicant_user_id=int(applicant_user.id),
        invite_id=(int(invite_row.id) if invite_row else None),
        invited_by_user_id=invited_by_user_id,
        status="pending",
        activation_delivery_status=(
            "not_required" if existing_identity_join else None
        ),
        created_at=datetime.now(timezone.utc),
    )
    db.add(join_request)

    if invite_row:
        invite_row.uses = invite_uses + 1
        if (
            invite_max_uses is not None
            and int(invite_row.uses or 0) >= int(invite_max_uses)
        ):
            invite_row.is_active = False
        db.add(invite_row)
    else:
        clan.invite_uses = invite_uses + 1
        db.add(clan)

    db.commit()
    db.refresh(join_request)

    reviewers = _active_reviewer_memberships(db, clan_id=int(clan.id))
    applicant_label = (
        _member_display(applicant_user)
        if existing_identity_join
        else " ".join(
            part
            for part in (_safe_str(payload.first_name), _safe_str(payload.surname))
            if part
        )
        or _member_display(applicant_user)
    )

    notified_user_ids: set[int] = set()
    for reviewer, reviewer_user in reviewers:
        reviewer_user_id = int(reviewer.user_id)
        if reviewer_user_id in notified_user_ids:
            continue
        notified_user_ids.add(reviewer_user_id)
        create_notification(
            db,
            user_id=reviewer_user_id,
            kind="approval_request",
            title="New join request",
            message=(
                f"{applicant_label} wants to join {clan.name} "
                f"({ _community_code(clan.id, clan=clan) })."
            ),
            action_url=(
                f"/app/community/{clan.id}/join-requests"
                f"?request_id={int(join_request.id)}"
                f"&community_code={_community_code(clan.id, clan=clan)}"
            ),
            action_label="Review",
        )

    log_trust_event(
        db,
        event_type=TrustEventType.INVITE_ACCEPTED,
        clan_id=int(clan.id),
        actor_user_id=int(applicant_user.id),
        subject_user_id=int(applicant_user.id),
        meta={
            "reason": (
                "existing_user_join_request_created"
                if existing_identity_join
                else "new_applicant_join_request_created"
            ),
            "invite_code": invite_code,
            "invite_id": int(invite_row.id) if invite_row else None,
            "join_request_id": int(join_request.id),
            "user_id": int(applicant_user.id),
            "gmfn_id": _safe_str(getattr(applicant_user, "gmfn_id", None)) or None,
            "identity_reused": existing_identity_join,
            "community_admission_status": "pending",
            "applicant_profile": {
                "first_name": _safe_str(payload.first_name) or None,
                "surname": _safe_str(payload.surname) or None,
                "phone_e164": submitted_phone or None,
                "country": _safe_str(payload.country) or None,
                "business_name": _safe_str(payload.business_name) or None,
                "note": _safe_str(payload.note) or None,
            },
        },
        dedupe_key=f"join-request-created:{int(join_request.id)}",
    )

    return {
        "ok": True,
        "result_status": "pending_request_created",
        "message": "Join request submitted. Admission is subject to community approval.",
        "community_id": int(clan.id),
        "community_code": _community_code(clan.id),
        "community_name": clan.name,
        "marketplace_name": getattr(clan, "marketplace_name", None),
        "user_id": int(applicant_user.id),
        "gmfn_id": _safe_str(getattr(applicant_user, "gmfn_id", None)) or None,
        "existing_identity": existing_identity_join,
        "identity_reused": existing_identity_join,
        "request": _join_request_out(db, join_request),
        "applicant_profile": {
            "first_name": _safe_str(payload.first_name) or None,
            "surname": _safe_str(payload.surname) or None,
            "phone_e164": submitted_phone or None,
            "country": _safe_str(payload.country) or None,
            "date_of_birth": _safe_str(payload.date_of_birth) or None,
            "birth_country": _safe_str(payload.birth_country or payload.country) or None,
            "birth_place": _safe_str(payload.birth_place) or None,
            "country_of_origin": _safe_str(payload.country_of_origin) or None,
            "residential_area": _safe_str(payload.residential_area) or None,
            "business_name": payload.business_name,
            "note": payload.note,
        },
        "lineage": {
            "origin_community_id": int(clan.id),
            "origin_community_code": _community_code(clan.id),
            "origin_community_name": clan.name,
            "invited_by_user_id": invited_by_user_id,
            "invite_id": int(invite_row.id) if invite_row else None,
        },
    }

@router.get("/{clan_id}/join-requests", response_model=dict[str, Any])
def list_join_requests(
    clan_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, _current_user = clan_ctx
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    rows = (
        db.query(ClanJoinRequest)
        .filter(ClanJoinRequest.clan_id == int(clan_id))
        .order_by(ClanJoinRequest.created_at.desc(), ClanJoinRequest.id.desc())
        .all()
    )

    items = [_join_request_out(db, row) for row in rows]
    return {
        "items": items,
        "total": len(items),
        "community_id": int(clan.id),
        "community_code": _community_code(clan.id),
        "community_name": _safe_str(getattr(clan, "name", None)),
        "reviewer_role": _safe_str(getattr(membership, "role", None), "user"),
        "reviewer_can_pilot_approve": (_safe_str(getattr(membership, "role", None)).lower() == "admin"),
    }


@router.post("/{clan_id}/join-requests/{join_request_id}/vote", response_model=dict[str, Any])
def vote_join_request(
    clan_id: int,
    join_request_id: int,
    payload: VoteJoinRequestIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not membership or is_user_activation_pending(current_user):
        raise HTTPException(
            status_code=403,
            detail="Only activated community members can vote",
        )

    req = (
        db.query(ClanJoinRequest)
        .filter(
            ClanJoinRequest.id == int(join_request_id),
            ClanJoinRequest.clan_id == int(clan_id),
        )
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Join request not found")

    if str(req.status).lower() != "pending":
        status = _safe_str(req.status, "completed").lower()
        return {
            "ok": True,
            "status_already_final": True,
            "approved_now": False,
            "rejected_now": False,
            "approval_result": None,
            "rejection_result": None,
            "message": (
                f"This request is already {status}. No new vote was recorded."
            ),
            "community_id": int(clan_id),
            "community_code": _community_code(clan_id),
            "request": _join_request_out(db, req),
        }

    vote_reason = _clean_vote_reason(payload)

    existing_vote = (
        db.query(ClanJoinVote)
        .filter(
            ClanJoinVote.join_request_id == int(req.id),
            ClanJoinVote.voter_user_id == int(current_user.id),
        )
        .first()
    )
    if existing_vote:
        existing_vote.vote = payload.vote
        db.add(existing_vote)
    else:
        db.add(
            ClanJoinVote(
                join_request_id=int(req.id),
                clan_id=int(clan_id),
                voter_user_id=int(current_user.id),
                vote=payload.vote,
                created_at=datetime.now(timezone.utc),
            )
        )

    db.commit()
    db.refresh(req)

    log_trust_event(
        db,
        event_type="join_request.vote_recorded",
        clan_id=int(clan_id),
        actor_user_id=int(current_user.id),
        subject_user_id=int(req.applicant_user_id),
        meta={
            "reason": "join_request_vote_recorded",
            "join_request_id": int(req.id),
            "vote": _safe_str(payload.vote).lower(),
            "reason_code": vote_reason["reason_code"],
            "reason_text": vote_reason["reason_text"],
            "voter_user_id": int(current_user.id),
            "applicant_user_id": int(req.applicant_user_id),
            "invite_id": int(req.invite_id) if req.invite_id else None,
            "invited_by_user_id": int(req.invited_by_user_id)
            if req.invited_by_user_id
            else None,
        },
    )

    stats = _current_join_status(db, join_request=req)
    approved_now = False
    rejected_now = False
    approval_result = None
    rejection_result = None

    if stats["approvals"] >= stats["required_approvals"]:
        approval_result = _approve_join_request(
            db,
            join_request=req,
            request=request,
        )
        approved_now = True
        req = (
            db.query(ClanJoinRequest)
            .filter(ClanJoinRequest.id == int(join_request_id))
            .first()
        )
    elif stats["rejects"] >= stats["required_approvals"]:
        rejection_result = _reject_join_request(
            db,
            join_request=req,
        )
        rejected_now = True
        req = (
            db.query(ClanJoinRequest)
            .filter(ClanJoinRequest.id == int(join_request_id))
            .first()
        )

    return {
        "ok": True,
        "community_id": int(clan_id),
        "community_code": _community_code(clan_id),
        "approved_now": approved_now,
        "rejected_now": rejected_now,
        "approval_result": approval_result,
        "rejection_result": rejection_result,
        "request": _join_request_out(db, req),
    }


@router.post(
    "/{clan_id}/join-requests/{join_request_id}/pilot-approve",
    response_model=dict[str, Any],
)
def pilot_approve_join_request(
    clan_id: int,
    join_request_id: int,
    request: Request,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    req = (
        db.query(ClanJoinRequest)
        .filter(
            ClanJoinRequest.id == int(join_request_id),
            ClanJoinRequest.clan_id == int(clan_id),
        )
        .first()
    )
    if not req:
        raise HTTPException(status_code=404, detail="Join request not found")

    if str(req.status).lower() != "pending":
        status = _safe_str(req.status, "completed").lower()
        return {
            "ok": True,
            "pilot_override": True,
            "status_already_final": True,
            "approved_now": False,
            "rejected_now": False,
            "approval_result": None,
            "rejection_result": None,
            "message": (
                f"This request is already {status}. Admin override was not applied again."
            ),
            "community_id": int(clan_id),
            "community_code": _community_code(clan_id),
            "request": _join_request_out(db, req),
        }

    existing_vote = (
        db.query(ClanJoinVote)
        .filter(
            ClanJoinVote.join_request_id == int(req.id),
            ClanJoinVote.voter_user_id == int(current_user.id),
        )
        .first()
    )
    if existing_vote:
        existing_vote.vote = "approve"
        db.add(existing_vote)
    else:
        db.add(
            ClanJoinVote(
                join_request_id=int(req.id),
                clan_id=int(clan_id),
                voter_user_id=int(current_user.id),
                vote="approve",
                created_at=datetime.now(timezone.utc),
            )
        )

    db.commit()
    db.refresh(req)

    approval_result = _approve_join_request(
        db,
        join_request=req,
        request=request,
    )
    req = (
        db.query(ClanJoinRequest)
        .filter(ClanJoinRequest.id == int(join_request_id))
        .first()
    )

    return {
        "ok": True,
        "pilot_override": True,
        "approved_now": True,
        "message": "Admin review approved this join request.",
        "community_id": int(clan_id),
        "community_code": _community_code(clan_id),
        "approval_result": approval_result,
        "request": _join_request_out(db, req),
    }


@router.post("/join-requests/{join_request_id}/vote", response_model=dict[str, Any])
def vote_join_request_compat(
    join_request_id: int,
    payload: VoteJoinRequestIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    req = db.query(ClanJoinRequest).filter(ClanJoinRequest.id == int(join_request_id)).first()
    if not req:
        raise HTTPException(status_code=404, detail="Join request not found")

    return vote_join_request(
        clan_id=int(req.clan_id),
        join_request_id=int(join_request_id),
        payload=payload,
        request=request,
        db=db,
        current_user=current_user,
    )

@router.get("/join-requests/{join_request_id}/status", response_model=dict[str, Any])
def get_join_request_status(
    join_request_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    req = db.query(ClanJoinRequest).filter(ClanJoinRequest.id == int(join_request_id)).first()
    if not req:
        raise HTTPException(status_code=404, detail="Join request not found")

    req = _mark_activation_opened_if_needed(db, req=req)
    return _join_request_status_payload(db, request, req)


@router.get("/{clan_id}/member-verifications/summary", response_model=dict[str, Any])
def get_member_verification_summary(
    clan_id: int,
    subject_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    clan, membership, _current_user = clan_ctx
    if (
        membership is None
        or getattr(membership, "left_at", None) is not None
        or not _is_activation_ready_user(db, int(current_user.id))
    ):
        raise HTTPException(status_code=403, detail="Only active community members can view this summary")
    _require_member_witness_active_community(clan)

    subject_membership = _is_active_membership(
        db,
        clan_id=int(clan.id),
        user_id=int(subject_user_id),
    )
    if subject_membership is None:
        raise HTTPException(status_code=404, detail="Subject is not an active member of this community")
    if not _is_activation_ready_user(db, int(subject_user_id)):
        raise HTTPException(status_code=404, detail="Subject is not an active member of this community")

    return {
        "ok": True,
        "membership": _member_row(db, subject_membership),
        "verification_summary": _member_verification_summary(
            db,
            clan_id=int(clan.id),
            subject_user_id=int(subject_user_id),
        ),
    }


@router.post("/{clan_id}/member-verification-requests", response_model=dict[str, Any])
def create_member_verification_request(
    clan_id: int,
    payload: CommunityMemberVerificationRequestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    clan, subject_membership, _current_user = clan_ctx
    if (
        subject_membership is None
        or getattr(subject_membership, "left_at", None) is not None
        or not _is_activation_ready_user(db, int(current_user.id))
    ):
        raise HTTPException(status_code=403, detail="Only active community members can request member verification")
    _require_member_witness_active_community(clan)

    verifier_user_id = int(payload.verifier_user_id)
    subject_user_id = int(current_user.id)
    if verifier_user_id == subject_user_id:
        raise HTTPException(status_code=400, detail="A member cannot request self-verification")

    verifier_membership = _is_active_membership(
        db,
        clan_id=int(clan.id),
        user_id=verifier_user_id,
    )
    if verifier_membership is None or not _is_activation_ready_user(db, verifier_user_id):
        raise HTTPException(status_code=404, detail="Verifier is not an active member of this community")

    now = datetime.now(timezone.utc)
    verifier_role = _safe_str(getattr(verifier_membership, "role", None)).lower()
    if verifier_role != "admin" and not _has_current_member_witness_standing(
        db,
        clan_id=int(clan.id),
        user_id=verifier_user_id,
        now=now,
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "This verifier must have current community witness standing before "
                "they can verify another member. Ask a community admin or already "
                "verified member to stand for this person."
            ),
        )

    existing_verification = (
        db.query(CommunityMemberVerification)
        .filter(CommunityMemberVerification.clan_id == int(clan.id))
        .filter(CommunityMemberVerification.subject_user_id == subject_user_id)
        .filter(CommunityMemberVerification.verifier_user_id == verifier_user_id)
        .first()
    )
    existing_valid_until = (
        _aware_utc(getattr(existing_verification, "valid_until", None))
        if existing_verification is not None
        else None
    )
    if (
        existing_verification is not None
        and _safe_str(existing_verification.status, "active").lower() == "active"
        and existing_verification.withdrawn_at is None
        and (existing_valid_until is None or existing_valid_until >= now)
        and not _member_witness_can_renew(existing_valid_until, now=now)
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "This verifier already has a current witness confirmation for this member. "
                "Renew it when the current witness window is due or expired."
            ),
        )
    existing = (
        db.query(CommunityMemberVerificationRequest)
        .filter(CommunityMemberVerificationRequest.clan_id == int(clan.id))
        .filter(CommunityMemberVerificationRequest.subject_user_id == subject_user_id)
        .filter(CommunityMemberVerificationRequest.verifier_user_id == verifier_user_id)
        .filter(CommunityMemberVerificationRequest.status == "pending")
        .order_by(
            CommunityMemberVerificationRequest.created_at.desc(),
            CommunityMemberVerificationRequest.id.desc(),
        )
        .first()
    )
    if existing is not None and _aware_utc(existing.expires_at) and _aware_utc(existing.expires_at) < now:
        existing.status = "expired"
        existing.updated_at = now
        db.flush()
        existing = None

    reserved_this_year = _member_witness_reserved_count(
        db,
        clan_id=int(clan.id),
        verifier_user_id=verifier_user_id,
        year=int(now.year),
        now=now,
        exclude_subject_user_id=subject_user_id
        if existing_verification is not None or existing is not None
        else None,
    )
    if reserved_this_year >= _member_witness_yearly_limit(verifier_role):
        raise HTTPException(
            status_code=409,
            detail=(
                "This verifier has reached the current yearly member-witness limit. "
                "Ask another active community member with witness standing to stand for this person."
            ),
        )

    if existing is not None:
        return {
            "ok": True,
            "message": "A pending witness request already exists for this verifier.",
            "request": _member_verification_request_payload(
                db,
                existing,
                include_one_time_code=True,
            ),
        }

    row = CommunityMemberVerificationRequest(
        clan_id=int(clan.id),
        subject_user_id=subject_user_id,
        verifier_user_id=verifier_user_id,
        requested_by_user_id=subject_user_id,
        public_token=_member_witness_approval_token(),
        one_time_code=_member_witness_one_time_code(),
        status="pending",
        claim_label=_safe_str(payload.claim_label)[:160] or None,
        request_note=_safe_str(payload.request_note)[:500] or None,
        expires_at=now + timedelta(hours=72),
    )
    db.add(row)
    db.flush()
    log_trust_event(
        db,
        event_type=TrustEventType.COMMUNITY_MEMBER_VERIFICATION_REQUESTED,
        clan_id=int(clan.id),
        actor_user_id=subject_user_id,
        subject_user_id=subject_user_id,
        meta={
            "reason": "community_member_witness_requested",
            "request_id": int(row.id),
            "verifier_user_id": verifier_user_id,
            "claim_label": row.claim_label,
            "expires_at": _aware_utc(row.expires_at).isoformat() if row.expires_at else None,
        },
        dedupe_key=f"community-member-verification-requested-{int(row.id)}",
        commit=False,
        refresh=False,
    )
    try:
        db.commit()
        db.refresh(row)
    except IntegrityError as exc:
        db.rollback()
        existing_after_race = (
            db.query(CommunityMemberVerificationRequest)
            .filter(CommunityMemberVerificationRequest.clan_id == int(clan.id))
            .filter(CommunityMemberVerificationRequest.subject_user_id == subject_user_id)
            .filter(CommunityMemberVerificationRequest.verifier_user_id == verifier_user_id)
            .filter(CommunityMemberVerificationRequest.status == "pending")
            .order_by(
                CommunityMemberVerificationRequest.created_at.desc(),
                CommunityMemberVerificationRequest.id.desc(),
            )
            .first()
        )
        if existing_after_race is not None:
            return {
                "ok": True,
                "message": "A pending witness request already exists for this verifier.",
                "request": _member_verification_request_payload(
                    db,
                    existing_after_race,
                    include_one_time_code=True,
                ),
            }
        raise HTTPException(
            status_code=409,
            detail="GSN could not reserve this witness request. Try again.",
        ) from exc
    return {
        "ok": True,
        "message": "Member witness request created. Share the approval link or one-time code with the verifier.",
        "request": _member_verification_request_payload(
            db,
            row,
            include_one_time_code=True,
        ),
    }


@router.get("/{clan_id}/member-verification-requests/{public_token}", response_model=dict[str, Any])
def get_member_verification_request(
    clan_id: int,
    public_token: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    clan, membership, _current_user = clan_ctx
    if (
        membership is None
        or getattr(membership, "left_at", None) is not None
        or not _is_activation_ready_user(db, int(current_user.id))
    ):
        raise HTTPException(status_code=403, detail="Only active community members can view this request")
    _require_member_witness_active_community(clan)
    row = (
        db.query(CommunityMemberVerificationRequest)
        .filter(CommunityMemberVerificationRequest.clan_id == int(clan.id))
        .filter(CommunityMemberVerificationRequest.public_token == _safe_str(public_token))
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Member witness request not found")

    is_admin = _safe_str(getattr(membership, "role", None)).lower() == "admin"
    if int(current_user.id) not in {int(row.subject_user_id), int(row.verifier_user_id)} and not is_admin:
        raise HTTPException(status_code=403, detail="Only the subject, verifier, or community admin can view this request")

    now = datetime.now(timezone.utc)
    if _safe_str(row.status).lower() == "pending" and _aware_utc(row.expires_at) and _aware_utc(row.expires_at) < now:
        row.status = "expired"
        row.updated_at = now
        db.commit()
        db.refresh(row)

    return {
        "ok": True,
        "request": _member_verification_request_payload(
            db,
            row,
            include_one_time_code=int(current_user.id)
            in {int(row.subject_user_id), int(row.requested_by_user_id)},
        ),
    }


@router.post("/{clan_id}/member-verification-requests/{public_token}/decision", response_model=dict[str, Any])
def decide_member_verification_request(
    clan_id: int,
    public_token: str,
    payload: CommunityMemberVerificationRequestDecisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    clan, verifier_membership, _current_user = clan_ctx
    _require_member_witness_active_community(clan)
    row = (
        db.query(CommunityMemberVerificationRequest)
        .filter(CommunityMemberVerificationRequest.clan_id == int(clan.id))
        .filter(CommunityMemberVerificationRequest.public_token == _safe_str(public_token))
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Member witness request not found")
    if int(row.verifier_user_id) != int(current_user.id):
        raise HTTPException(status_code=403, detail="Only the assigned verifier can decide this request")
    if (
        verifier_membership is None
        or getattr(verifier_membership, "left_at", None) is not None
        or not _is_activation_ready_user(db, int(current_user.id))
    ):
        raise HTTPException(status_code=403, detail="Only active community members can verify another member")
    if not _is_activation_ready_user(db, int(row.subject_user_id)):
        raise HTTPException(status_code=404, detail="Subject is not an active member of this community")

    now = datetime.now(timezone.utc)
    if _safe_str(row.status).lower() != "pending":
        return {
            "ok": True,
            "message": f"This witness request is already {row.status}.",
            "request": _member_verification_request_payload(db, row),
            "verification_summary": _member_verification_summary(
                db,
                clan_id=int(clan.id),
                subject_user_id=int(row.subject_user_id),
            ),
        }
    if _aware_utc(row.expires_at) and _aware_utc(row.expires_at) < now:
        row.status = "expired"
        row.updated_at = now
        db.commit()
        db.refresh(row)
        raise HTTPException(status_code=410, detail="This member witness request has expired")

    provided_code = _safe_str(payload.one_time_code)
    if provided_code != _safe_str(row.one_time_code):
        raise HTTPException(status_code=400, detail="The one-time witness code is incorrect")

    decision = _safe_str(payload.decision).lower()
    response_note = _safe_str(payload.response_note)[:500] or None
    if decision not in {"approve", "approved", "decline", "declined", "reject", "rejected"}:
        raise HTTPException(status_code=400, detail="Decision must be approve or decline")

    if decision in {"decline", "declined", "reject", "rejected"}:
        row.status = "declined"
        row.response_note = response_note
        row.decided_at = now
        row.updated_at = now
        log_trust_event(
            db,
            event_type=TrustEventType.COMMUNITY_MEMBER_VERIFICATION_DECLINED,
            clan_id=int(clan.id),
            actor_user_id=int(current_user.id),
            subject_user_id=int(row.subject_user_id),
            meta={
                "reason": "community_member_witness_declined",
                "request_id": int(row.id),
                "response_note_present": bool(response_note),
            },
            dedupe_key=f"community-member-verification-declined-{int(row.id)}",
            commit=False,
            refresh=False,
        )
        db.commit()
        db.refresh(row)
        return {
            "ok": True,
            "message": "Member witness request declined.",
            "request": _member_verification_request_payload(db, row),
            "verification_summary": _member_verification_summary(
                db,
                clan_id=int(clan.id),
                subject_user_id=int(row.subject_user_id),
            ),
        }

    verification, message = _record_member_verification_for_verifier(
        db,
        clan=clan,
        subject_user_id=int(row.subject_user_id),
        verifier_user_id=int(current_user.id),
        verifier_membership=verifier_membership,
        claim_label=row.claim_label,
        verification_note=response_note or row.request_note,
        source="member_witness_request",
    )
    row.status = "approved"
    row.response_note = response_note
    row.decided_at = now
    row.updated_at = now
    row.resulting_verification_id = int(verification.id)
    log_trust_event(
        db,
        event_type=TrustEventType.COMMUNITY_MEMBER_VERIFICATION_APPROVED,
        clan_id=int(clan.id),
        actor_user_id=int(current_user.id),
        subject_user_id=int(row.subject_user_id),
        meta={
            "reason": "community_member_witness_request_approved",
            "request_id": int(row.id),
            "verification_id": int(verification.id),
            "response_note_present": bool(response_note),
        },
        dedupe_key=f"community-member-verification-approved-{int(row.id)}",
        commit=False,
        refresh=False,
    )
    db.commit()
    db.refresh(row)
    db.refresh(verification)
    return {
        "ok": True,
        "message": message,
        "request": _member_verification_request_payload(db, row),
        "verification": _member_verification_payload(
            db,
            verification,
            include_private_fields=True,
        ),
        "verification_summary": _member_verification_summary(
            db,
            clan_id=int(clan.id),
            subject_user_id=int(row.subject_user_id),
        ),
    }


@router.post("/{clan_id}/member-verifications", response_model=dict[str, Any])
def record_member_verification(
    clan_id: int,
    payload: CommunityMemberVerificationIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    clan, verifier_membership, _current_user = clan_ctx
    if (
        verifier_membership is None
        or getattr(verifier_membership, "left_at", None) is not None
        or not _is_activation_ready_user(db, int(current_user.id))
    ):
        raise HTTPException(status_code=403, detail="Only active community members can verify another member")

    subject_user_id = int(payload.subject_user_id)
    row, message = _record_member_verification_for_verifier(
        db,
        clan=clan,
        subject_user_id=subject_user_id,
        verifier_user_id=int(current_user.id),
        verifier_membership=verifier_membership,
        claim_label=payload.claim_label,
        verification_note=payload.verification_note,
        source="member_witness",
    )
    db.commit()
    db.refresh(row)

    return {
        "ok": True,
        "message": message,
        "verification": _member_verification_payload(
            db,
            row,
            include_private_fields=True,
        ),
        "verification_summary": _member_verification_summary(
            db,
            clan_id=int(clan.id),
            subject_user_id=subject_user_id,
        ),
    }


@router.post("/{clan_id}/member-verifications/{verification_id}/withdraw", response_model=dict[str, Any])
def withdraw_member_verification(
    clan_id: int,
    verification_id: int,
    payload: CommunityMemberVerificationWithdrawIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    clan, membership, _current_user = clan_ctx
    if (
        membership is None
        or getattr(membership, "left_at", None) is not None
        or not _is_activation_ready_user(db, int(current_user.id))
    ):
        raise HTTPException(status_code=403, detail="Only active community members can withdraw verification")

    row = db.get(CommunityMemberVerification, int(verification_id))
    if row is None or int(row.clan_id) != int(clan.id):
        raise HTTPException(status_code=404, detail="Member verification not found")

    is_admin = _safe_str(getattr(membership, "role", None)).lower() == "admin"
    if int(row.verifier_user_id) != int(current_user.id) and not is_admin:
        raise HTTPException(status_code=403, detail="Only the verifier or a community admin can withdraw this record")

    if _safe_str(row.status).lower() != "withdrawn":
        now = datetime.now(timezone.utc)
        row.status = "withdrawn"
        row.withdrawn_at = now
        row.updated_at = now
        row.withdrawal_reason = _safe_str(payload.reason)[:500] or "Verifier withdrew support."
        log_trust_event(
            db,
            event_type=TrustEventType.COMMUNITY_MEMBER_VERIFICATION_WITHDRAWN,
            clan_id=int(clan.id),
            actor_user_id=int(current_user.id),
            subject_user_id=int(row.subject_user_id),
            meta={
                "reason": "community_member_witness_withdrawn",
                "verification_id": int(row.id),
                "withdrawal_reason": row.withdrawal_reason,
            },
            dedupe_key=f"community-member-verification-withdrawn-{int(row.id)}",
            commit=False,
            refresh=False,
        )
        db.commit()
        db.refresh(row)

    return {
        "ok": True,
        "message": "Member witness confirmation withdrawn.",
        "verification": _member_verification_payload(
            db,
            row,
            include_private_fields=True,
        ),
        "verification_summary": _member_verification_summary(
            db,
            clan_id=int(clan.id),
            subject_user_id=int(row.subject_user_id),
        ),
    }


@router.get("/{clan_id}/domain-affiliations", response_model=dict[str, Any])
def list_domain_affiliations(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    clan, _membership, _current_user = _require_active_domain_admin(
        db,
        clan_ctx,
        action_label="domain affiliation listing",
    )

    incoming = (
        db.query(CommunityDomainAffiliation)
        .filter(CommunityDomainAffiliation.parent_clan_id == int(clan.id))
        .order_by(CommunityDomainAffiliation.created_at.desc(), CommunityDomainAffiliation.id.desc())
        .all()
    )
    outgoing = (
        db.query(CommunityDomainAffiliation)
        .filter(CommunityDomainAffiliation.affiliate_clan_id == int(clan.id))
        .order_by(CommunityDomainAffiliation.created_at.desc(), CommunityDomainAffiliation.id.desc())
        .all()
    )

    return {
        "ok": True,
        "community_id": int(clan.id),
        "community_code": _community_code(clan.id, clan=clan),
        "incoming": [_community_affiliation_payload(row) for row in incoming],
        "outgoing": [_community_affiliation_payload(row) for row in outgoing],
    }


@router.post("/{affiliate_clan_id}/domain-affiliation-requests", response_model=dict[str, Any])
def request_domain_affiliation(
    affiliate_clan_id: int,
    payload: CommunityAffiliationRequestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(affiliate_clan_id),
        current_user=current_user,
    )
    affiliate, _membership, _current_user = _require_active_domain_admin(
        db,
        clan_ctx,
        action_label="domain affiliation request",
    )

    parent = _clan_from_community_key(db, payload.parent_community_key)
    if parent is None or _is_default_clan_name(getattr(parent, "name", None)):
        raise HTTPException(status_code=404, detail="Parent community domain not found")
    if not _community_domain_is_active(parent):
        raise HTTPException(status_code=403, detail="Parent community domain is not active")
    if int(parent.id) == int(affiliate.id):
        raise HTTPException(status_code=400, detail="A community cannot affiliate under itself")

    existing = (
        db.query(CommunityDomainAffiliation)
        .filter(CommunityDomainAffiliation.parent_clan_id == int(parent.id))
        .filter(CommunityDomainAffiliation.affiliate_clan_id == int(affiliate.id))
        .first()
    )
    now = datetime.now(timezone.utc)
    note = _safe_str(payload.request_note)[:500] or None

    if existing is None:
        row = CommunityDomainAffiliation(
            parent_clan_id=int(parent.id),
            affiliate_clan_id=int(affiliate.id),
            requested_by_user_id=int(current_user.id),
            status="pending",
            request_note=note,
        )
        db.add(row)
    else:
        row = existing
        if _safe_str(row.status).lower() == "approved":
            return {
                "ok": True,
                "message": "This group is already an acknowledged affiliate under the parent domain.",
                "affiliation": _community_affiliation_payload(row),
            }
        row.status = "pending"
        row.request_note = note
        row.requested_by_user_id = int(current_user.id)
        row.decided_by_user_id = None
        row.decision_note = None
        row.decided_at = None
        row.updated_at = now

    db.commit()
    db.refresh(row)
    return {
        "ok": True,
        "message": "Affiliation request sent to the parent community domain.",
        "affiliation": _community_affiliation_payload(row),
    }


@router.post("/{parent_clan_id}/domain-affiliation-requests/{affiliation_id}/decision", response_model=dict[str, Any])
def decide_domain_affiliation(
    parent_clan_id: int,
    affiliation_id: int,
    payload: CommunityAffiliationDecisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(parent_clan_id),
        current_user=current_user,
    )
    parent, _membership, _current_user = _require_active_domain_admin(
        db,
        clan_ctx,
        action_label="domain affiliation decision",
    )

    row = db.get(CommunityDomainAffiliation, int(affiliation_id))
    if row is None or int(row.parent_clan_id) != int(parent.id):
        raise HTTPException(status_code=404, detail="Affiliation request not found")

    decision = _safe_str(payload.decision).lower().replace("-", "_")
    if decision in {"approve", "approved"}:
        status = "approved"
        affiliate = db.get(Clan, int(row.affiliate_clan_id))
        if affiliate is None or not _community_domain_is_active(affiliate):
            raise HTTPException(status_code=403, detail="Affiliate community domain is not active")
    elif decision in {"reject", "rejected", "decline", "declined"}:
        status = "rejected"
    elif decision in {"revoke", "revoked", "suspend", "suspended"}:
        status = "revoked"
    else:
        raise HTTPException(status_code=400, detail="Decision must be approve, reject, or revoke")

    now = datetime.now(timezone.utc)
    row.status = status
    row.decided_by_user_id = int(current_user.id)
    row.decision_note = _safe_str(payload.decision_note)[:500] or None
    row.decided_at = now
    row.updated_at = now
    db.commit()
    db.refresh(row)

    return {
        "ok": True,
        "message": f"Affiliation {status}.",
        "affiliation": _community_affiliation_payload(row),
    }


@router.get("/{clan_id}/external-registration-records", response_model=dict[str, Any])
def list_external_registration_evidence(
    clan_id: int,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if not _is_activation_ready_user(db, int(current_user.id)):
        raise HTTPException(status_code=403, detail="Only activated community admins can list external registration evidence")
    safe_limit = max(1, min(int(limit or 20), 100))
    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.clan_id == int(clan.id))
        .filter(TrustEvent.event_type == TrustEventType.COMMUNITY_EXTERNAL_REGISTRATION_RECORDED)
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(safe_limit)
        .all()
    )
    return {
        "ok": True,
        "community_id": int(clan.id),
        "community_code": _community_code(clan.id, clan=clan),
        "items": [_external_registration_record_payload(row) for row in rows],
        "boundary": (
            "External registration records are supporting evidence only. "
            "They do not verify the community, prove current leadership, or prove member belonging."
        ),
    }


@router.post("/{clan_id}/external-registration-records", response_model=dict[str, Any])
def record_external_registration_evidence(
    clan_id: int,
    payload: CommunityExternalRegistrationRecordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    clan, _membership, _current_user = _require_active_domain_admin(
        db,
        clan_ctx,
        action_label="external registration evidence record",
    )

    registration_type = _safe_str(payload.registration_type, "CAC")[:40] or "CAC"
    registration_reference = _safe_str(payload.registration_reference)[:120] or None
    registered_name = _safe_str(payload.registered_name)[:180] or None
    issuing_body = _safe_str(payload.issuing_body)[:120] or None
    note = _safe_str(payload.note)[:500] or None

    if not any([registration_reference, registered_name, issuing_body, note]):
        raise HTTPException(
            status_code=400,
            detail=(
                "Record at least one external registration detail. "
                "This records supporting evidence only; it does not verify the community."
            ),
        )

    evidence_fingerprint = _external_registration_fingerprint(
        registration_type=registration_type,
        registration_reference=registration_reference,
        registered_name=registered_name,
        issuing_body=issuing_body,
    )
    has_structured_registration_detail = any(
        [registration_reference, registered_name, issuing_body]
    )
    dedupe_key = (
        f"external-registration:{int(clan.id)}:{evidence_fingerprint}"
        if evidence_fingerprint and has_structured_registration_detail
        else None
    )

    meta = {
        "reason": "community_external_registration_recorded",
        "registration_type": registration_type,
        "registration_reference_present": bool(registration_reference),
        "registered_name_present": bool(registered_name),
        "issuing_body": issuing_body,
        "note_present": bool(note),
        "evidence_fingerprint": evidence_fingerprint,
        "raw_reference_stored": False,
        "record_detail_storage": "fingerprint_and_presence_only",
        "record_purpose": "supporting_domain_claim_evidence",
        "status": "recorded",
        "verification_effect": "none",
        "public_exposure": "private_admin_record_only",
        "boundary": (
            "Recorded supporting evidence only. Not GSN verification, current leadership evidence, "
            "community consent, shop ownership, or member belonging."
        ),
    }

    event = log_trust_event(
        db,
        event_type=TrustEventType.COMMUNITY_EXTERNAL_REGISTRATION_RECORDED,
        clan_id=int(clan.id),
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        meta=meta,
        dedupe_key=dedupe_key,
        commit=True,
        refresh=True,
    )

    return {
        "ok": True,
        "message": (
            "External registration evidence recorded. "
            "This is not GSN verification and is not public Community ID evidence."
        ),
        "community_id": int(clan.id),
        "community_code": _community_code(clan.id, clan=clan),
        "record": _external_registration_record_payload(event),
    }


@router.get("/{clan_id}/invite/settings", response_model=dict[str, Any])
def get_invite_settings(
    clan_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    clan = _ensure_invite_expiry(db, clan, days=None)

    return {
        "clan_id": int(clan.id),
        "community_code": _community_code(clan.id),
        "invite_code": clan.invite_code,
        "invite_created_at": clan.invite_created_at,
        "invite_expires_at": clan.invite_expires_at,
        "invite_max_uses": getattr(clan, "invite_max_uses", None),
        "invite_uses": int(getattr(clan, "invite_uses", 0) or 0),
        "is_expired": _is_invite_expired(clan),
    }


@router.patch("/{clan_id}/invite/settings", response_model=dict[str, Any])
def update_invite_settings(
    clan_id: int,
    payload: InviteSettingsUpdateIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    days_n = _normalize_invite_days(payload.days)
    max_uses_n = _normalize_invite_max_uses(payload.max_uses)

    now = datetime.now(timezone.utc)

    clan = _ensure_invite_expiry(db, clan, days=days_n)

    clan.invite_max_uses = max_uses_n
    clan.invite_created_at = now
    clan.invite_expires_at = now + timedelta(days=days_n)

    if payload.rotate:
        clan.invite_code = secrets.token_urlsafe(16)
        clan.invite_uses = 0

    db.commit()
    db.refresh(clan)

    return {
        "ok": True,
        "clan_id": int(clan.id),
        "community_code": _community_code(clan.id),
        "invite_code": clan.invite_code,
        "invite_created_at": clan.invite_created_at,
        "invite_expires_at": clan.invite_expires_at,
        "invite_max_uses": getattr(clan, "invite_max_uses", None),
        "invite_uses": int(getattr(clan, "invite_uses", 0) or 0),
    }


@router.get("/{clan_id}/members", response_model=dict[str, Any])
def list_members(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan, _membership, _current_user = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )

    member_rows = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.created_at.asc(), ClanMembership.id.asc())
        .all()
    )
    reviewer_members = [
        membership
        for membership, _user in _active_reviewer_memberships(db, clan_id=int(clan_id))
    ]

    items = [_member_row(db, m) for m in member_rows]
    reviewer_items = [_member_row(db, m) for m in reviewer_members]
    capacity = _community_member_capacity_snapshot(db, clan_id=int(clan_id))
    return {
        "items": items,
        "total": len(items),
        "active_membership_total": len(items),
        "reviewer_items": reviewer_items,
        "reviewer_total": len(reviewer_items),
        "community_code": _community_code(clan_id),
        "member_capacity_included": capacity["included"],
        "member_capacity_extra": capacity["extra"],
        "member_capacity_total": capacity["total"],
        "member_capacity_used": capacity["used"],
        "member_capacity_remaining": capacity["remaining"],
    }


@router.post("/{clan_id}/members", status_code=201, response_model=dict[str, Any])
def add_member(
    clan_id: int,
    payload: AddMemberIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)

    u = db.get(User, payload.user_id)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    exists = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == payload.user_id,
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if exists:
        raise HTTPException(status_code=409, detail="User already in community")

    _assert_community_member_capacity_available(db, clan_id=int(clan_id))

    role = payload.role if payload.role in ("user", "admin") else "user"

    m = ClanMembership(
        clan_id=clan_id,
        user_id=payload.user_id,
        role=role,
        personal_pool_balance=Decimal("0"),
    )
    db.add(m)
    db.commit()
    db.refresh(m)
    return _member_row(db, m)


@router.delete("/{clan_id}/members/{user_id}", response_model=dict[str, Any])
def remove_member(
    clan_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)

    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == user_id,
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")

    if (m.role or "").lower() == "admin" and _is_last_admin(db, clan_id=clan_id):
        raise HTTPException(status_code=400, detail="Cannot remove the last admin")

    m.left_at = datetime.now(timezone.utc)
    db.add(m)
    db.commit()
    return {"ok": True, "community_code": _community_code(clan_id)}


@router.post("/{clan_id}/members/{user_id}/toggle-role", response_model=dict[str, Any])
def toggle_member_role(
    clan_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)

    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == user_id,
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")

    if (m.role or "").lower() == "admin" and _is_last_admin(db, clan_id=clan_id):
        raise HTTPException(status_code=400, detail="Cannot demote the last admin")

    m.role = "admin" if (m.role or "").lower() != "admin" else "user"
    db.commit()
    db.refresh(m)
    return _member_row(db, m)


@router.patch("/{clan_id}/members/{user_id}/pool", response_model=dict[str, Any])
def patch_member_pool_balance_compat(
    clan_id: int,
    user_id: int,
    payload: PatchMemberPoolIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan_ctx = _resolve_target_clan_membership(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)

    if payload.pool_balance < 0:
        raise HTTPException(status_code=400, detail="pool_balance must be >= 0")

    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == user_id,
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")

    m.personal_pool_balance = payload.pool_balance
    db.commit()
    db.refresh(m)

    return {
        "pool_balance": float(m.personal_pool_balance or Decimal("0")),
        "community_code": _community_code(clan_id),
    }


@router.post("/{clan_id}/members/pool/set", response_model=dict[str, Any])
def set_member_pool_balance(
    clan_id: int,
    payload: SetMemberPoolIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    if payload.balance < 0:
        raise HTTPException(status_code=400, detail="balance must be >= 0")

    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == payload.user_id,
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")

    m.personal_pool_balance = payload.balance
    db.commit()
    db.refresh(m)

    return {
        "user_id": payload.user_id,
        "clan_id": clan_id,
        "community_code": _community_code(clan_id),
        "personal_pool_balance": str(m.personal_pool_balance or Decimal("0")),
    }
