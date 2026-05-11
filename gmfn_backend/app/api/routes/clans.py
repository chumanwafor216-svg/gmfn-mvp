from __future__ import annotations

import os
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, List, Optional
from urllib.parse import quote, urlencode, urlparse

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import HTMLResponse
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sqlalchemy import or_
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
    User,
)
from app.services.invites_service import (
    api_join_link,
    create_clan_invite,
)
from app.services.global_identity_service import ensure_user_gmfn_id
from app.services.trust_events_services import log_trust_event

router = APIRouter(prefix="/clans", tags=["clans"])

JOIN_APPROVAL_RATIO = Decimal("0.40")
DEFAULT_SHAREABLE_JOIN_INVITE_MAX_USES = 100
JOIN_INVITATION_NOT_FOUND = (
    "This invitation link is no longer valid or was not copied fully. "
    "Ask the person who invited you to send a fresh GSN invite link."
)


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
    name = f"Dev Clan {now.strftime('%Y%m%d-%H%M%S')}-{suffix}"

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


class JoinApplicationIn(BaseModel):
    invite_code: str = Field(..., min_length=3, max_length=128)
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    surname: Optional[str] = Field(default=None, min_length=1, max_length=80)
    phone_e164: Optional[str] = Field(default=None, min_length=8, max_length=32)
    country: Optional[str] = Field(default=None, min_length=2, max_length=80)
    business_name: Optional[str] = Field(default=None, max_length=160)
    note: Optional[str] = Field(default=None, max_length=500)


class VoteJoinRequestIn(BaseModel):
    vote: str = Field(..., pattern="^(approve|reject)$")


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
        max_uses = getattr(invite_row, "max_uses", None)
    elif clan is not None:
        invite_code = getattr(clan, "invite_code", None)
        expires_at = _effective_invite_expires_at(
            created_at=getattr(clan, "invite_created_at", None),
            expires_at=getattr(clan, "invite_expires_at", None),
        )
        uses = int(getattr(clan, "invite_uses", 0) or 0)
        max_uses = getattr(clan, "invite_max_uses", None)

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
        raise HTTPException(status_code=403, detail="Clan admin only")
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
        raise HTTPException(status_code=404, detail="Clan not found")

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
        return "A GMFN member"
    return _safe_str(
        getattr(user, "gmfn_id", None)
        or getattr(user, "email", None)
        or "A GMFN member",
        "A GMFN member",
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
    max_uses = getattr(invite, "max_uses", None)
    uses = int(getattr(invite, "uses", 0) or 0)
    return max_uses is not None and uses >= int(max_uses)


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
    current_max_uses = getattr(invite, "max_uses", None)
    try:
        current_value = int(current_max_uses)
    except (TypeError, ValueError):
        return False

    desired_value = int(desired_max_uses)
    if strict:
        return current_value == desired_value
    return current_value >= desired_value


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


_ensure_user_gmfn_id = ensure_user_gmfn_id


def _current_join_status(
    db: Session,
    *,
    join_request: ClanJoinRequest,
) -> dict[str, Any]:
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
    total_votes = len(votes)

    active_members = len(reviewer_rows)
    required = max(
        1,
        int(
            (Decimal(active_members) * JOIN_APPROVAL_RATIO).to_integral_value(
                rounding="ROUND_CEILING"
            )
        ),
    )

    return {
        "approvals": approvals,
        "rejects": rejects,
        "total_votes": total_votes,
        "active_member_count": active_members,
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
        "total_votes": stats["total_votes"],
        "active_member_count": stats["active_member_count"],
        "required_approvals": stats["required_approvals"],
        "threshold_ratio": stats["threshold_ratio"],
        "eligible_reviewers": stats["eligible_reviewers"],
    }


def _pending_applicant_email(phone_e164: str) -> str:
    digits = "".join(ch for ch in _safe_str(phone_e164) if ch.isdigit())
    return f"{digits}@pending.gmfn.local"


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
            "You already belong to this community. Your existing GMFN identity "
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
        result_path = f"/app/marketplace?community={int(req.clan_id)}"
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
        "total_votes": stats["total_votes"],
        "active_member_count": stats["active_member_count"],
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
    invite_max_uses = getattr(clan, "invite_max_uses", None)
    invite_uses = int(getattr(clan, "invite_uses", 0) or 0)
    if _is_invite_expired(clan):
        return None
    if invite_max_uses is not None and invite_uses >= int(invite_max_uses):
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
        f"{inviter_name} is inviting you to join {clan_name} on GSN.",
        f"Invited by: {inviter_name}",
        f"Community ID: {community_code}",
    ]

    if marketplace_name:
        lines.append(f"Community / Market: {marketplace_name}")

    lines.extend(
        [
            "",
            "We have already built trust by knowing, helping, lending, supporting, and standing for one another.",
            "GSN helps make that trust visible, recordable, and useful, so the good things people do for each other can become proof for tomorrow.",
            "With GSN, a trusted circle can trade, support small needs, lend, borrow, repay, and build a clearer record of reliability.",
            "Over time, those records can help members carry their good name further, even beyond the people who already know them.",
            "",
            "This invitation does not mean automatic entry. The community will still review your request so trust stays protected.",
            "",
            "Use this link to begin your request:",
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
        f"Your GMFN ID is: {gmfn_id}",
        f"Community ID: {community_code}",
        f"Invited by: {inviter_name}",
    ]

    if marketplace_name:
        lines.append(f"Community / Market: {marketplace_name}")

    lines.extend(
        [
            "",
            "Use the link below to activate your GMFN membership and create your password:",
            activation_link,
            "",
            "Once activation is completed, you will be able to enter your workspace properly.",
            "",
            "— Sent via GMFN",
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
        raise HTTPException(status_code=404, detail="Clan not found")

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
                f"{clan.name} approved your request. Your existing GMFN ID was reused; "
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
            message="You can now activate your GMFN account.",
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
            "Applicant approved with existing GMFN ID."
            if existing_identity
            else "Applicant approved and GMFN ID issued."
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
        raise HTTPException(status_code=404, detail="Clan not found")

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
        raise HTTPException(status_code=400, detail="Clan name already exists")

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


@router.post("/{clan_id}/join", status_code=201, response_model=dict[str, Any])
def join_clan(
    clan_id: int,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan = db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")
    if _is_default_clan_name(getattr(clan, "name", None)):
        raise HTTPException(status_code=404, detail="Clan not found")

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
            "message": "You already belong to this community. Your existing GMFN identity was reused.",
            "community_id": int(clan_id),
            "community_code": _community_code(clan_id),
            "community_name": clan.name,
            "user_id": int(current_user.id),
            "gmfn_id": _safe_str(getattr(current_user, "gmfn_id", None)) or None,
            "existing_identity": True,
            "identity_reused": True,
            "membership": _member_row(db, exists),
        }

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
        "message": "Community membership created using your existing GMFN identity.",
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
        raise HTTPException(status_code=404, detail="You are not a member of this clan")

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
        raise HTTPException(status_code=404, detail="Clan not found")
    if _is_default_clan_name(getattr(clan, "name", None)):
        raise HTTPException(status_code=404, detail="Clan not found")

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
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    days_n = _normalize_invite_days(days)
    max_uses_n = _shareable_join_invite_max_uses(clan, max_uses)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=days_n)
    retired_live_invites = _retire_active_clan_invites(db, clan_id=int(clan_id))

    inv = create_clan_invite(
        db,
        clan_id=int(clan_id),
        created_by_user=current_user,
        expires_at=expires_at,
        max_uses=max_uses_n,
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
        "max_uses": inv.max_uses,
        "retired_live_invites": retired_live_invites,
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
    clan, _membership, current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    max_uses_norm = _shareable_join_invite_max_uses(clan, max_uses)
    strict_max_uses = max_uses is not None
    if max_uses is not None:
        clan = _ensure_invite_expiry(db, clan, days=days)
        clan.invite_max_uses = max_uses_norm
        if clan.invite_uses is None:
            clan.invite_uses = 0
        db.commit()
        db.refresh(clan)

    latest_invite = _latest_usable_clan_invite(db, clan_id=int(clan.id))

    if latest_invite is not None and not _invite_matches_share_policy(
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
            max_uses=max_uses_norm,
        )

    if latest_invite is not None:
        share_link = _frontend_community_join_link(
            request,
            clan=clan,
            invite_code=latest_invite.code,
            inviter=current_user,
        )

        return {
            "clan_id": int(clan.id),
            "community_code": _community_code(clan.id),
            "community_name": clan.name,
            "marketplace_name": getattr(clan, "marketplace_name", None),
            "invited_by_user_id": int(current_user.id),
            "invited_by_email": getattr(current_user, "email", None),
            "invited_by_display": _member_display(current_user),
            "invite_code": latest_invite.code,
            "invite_created_at": latest_invite.created_at,
            "invite_expires_at": latest_invite.expires_at,
            "invite_max_uses": latest_invite.max_uses,
            "invite_uses": int(getattr(latest_invite, "uses", 0) or 0),
            "invite_status": "ready",
            "invite_source": "clan_invite",
            "invite_link": share_link,
            "invite_url": share_link,
            "url": share_link,
            "link": share_link,
            "share_link": share_link,
            "api_link": api_join_link(request, latest_invite.code),
            "invite_text": _build_invite_text(
                clan=clan,
                invite_link=share_link,
                inviter=current_user,
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

        invite_max_uses = getattr(invite_row, "max_uses", None)
        invite_uses = int(getattr(invite_row, "uses", 0) or 0)
        if invite_max_uses is not None and invite_uses >= int(invite_max_uses):
            recovered = _ready_join_preview_for_clan(
                db,
                clan=clan,
                message="A newer live invitation was found for this community. You can continue with your join request.",
            )
            if recovered and _safe_str(recovered.get("invite_code")) != invite_code:
                return recovered
            return _invite_preview_payload(
                valid=False,
                status="usage_limit",
                message="This invitation has already been used enough times. Ask for a fresh GSN invite link.",
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
        invite_max_uses = getattr(legacy_clan, "invite_max_uses", None)
        invite_uses = int(getattr(legacy_clan, "invite_uses", 0) or 0)

        if _is_invite_expired(legacy_clan):
            return _invite_preview_payload(
                valid=False,
                status="expired",
                message="This invitation has expired. Ask for a fresh GSN invite link.",
                clan=legacy_clan,
            )

        if invite_max_uses is not None and invite_uses >= int(invite_max_uses):
            return _invite_preview_payload(
                valid=False,
                status="usage_limit",
                message="This invitation has already been used enough times. Ask for a fresh GSN invite link.",
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

    clan_name = "—"
    community_code = "—"
    expires_text = "—"
    usage_text = "—"
    remaining_text = "—"
    status_text = ""
    status_color = "#666"

    now = datetime.now(timezone.utc)

    if not clan:
        status_text = "Invalid invite code ❌"
        status_color = "#b00"
    else:
        clan_name = getattr(clan, "name", "—")
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

        if max_uses is None:
            usage_text = f"{uses} / unlimited"
            remaining_text = "Unlimited"
        else:
            max_u = int(max_uses)
            remaining = max(0, max_u - uses)
            usage_text = f"{uses} / {max_u}"
            remaining_text = str(remaining)

        expired = False
        if expires_at is not None and expires_at < now:
            expired = True

        used_up = False
        if max_uses is not None and uses >= int(max_uses):
            used_up = True

        if expired:
            status_text = "Invite expired ❌"
            status_color = "#b00"
        elif used_up:
            status_text = "Invite used up ❌"
            status_color = "#b00"
        else:
            status_text = "Invite valid ✅"
            status_color = "#0a7"

    return f"""
<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<title>Join GMFN Community</title>
<style>
body {{ font-family: Arial, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 16px; }}
.box {{ border: 1px solid #ddd; border-radius: 10px; padding: 18px; }}
.badge {{ display:inline-block; padding: 6px 10px; border-radius:999px; font-size:13px; color:#fff; background:{status_color}; }}
.kv {{ display:grid; grid-template-columns: 160px 1fr; gap: 6px 12px; margin-top: 12px; }}
.muted {{ color:#666; font-size:14px; line-height:1.6; }}
</style>
</head>
<body>
<h2>Join a GMFN Community</h2>
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

        invite_max_uses = getattr(invite_row, "max_uses", None)
        invite_uses = int(getattr(invite_row, "uses", 0) or 0)
        if invite_max_uses is not None and invite_uses >= int(invite_max_uses):
            raise HTTPException(status_code=400, detail="Invitation usage limit reached")

        invited_by_user_id = int(invite_row.created_by_user_id)
    else:
        clan = db.query(Clan).filter(Clan.invite_code == invite_code).first()
        if not clan:
            raise HTTPException(status_code=404, detail=JOIN_INVITATION_NOT_FOUND)

        clan = _ensure_invite_expiry(db, clan, days=None)

        if _is_invite_expired(clan):
            raise HTTPException(status_code=400, detail="Invitation has expired")

        invite_max_uses = getattr(clan, "invite_max_uses", None)
        invite_uses = int(getattr(clan, "invite_uses", 0) or 0)
        if invite_max_uses is not None and invite_uses >= int(invite_max_uses):
            raise HTTPException(status_code=400, detail="Invitation usage limit reached")

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

    existing_identity_join = bool(
        current_user is not None and not is_user_activation_pending(current_user)
    )

    submitted_phone = _safe_str(payload.phone_e164)
    if existing_identity_join:
        applicant_user = _ensure_user_gmfn_id(db, current_user)
    else:
        missing_fields = [
            label
            for label, value in (
                ("first_name", payload.first_name),
                ("surname", payload.surname),
                ("phone_e164", payload.phone_e164),
                ("country", payload.country),
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
                    "code": "existing_account_login_required",
                    "message": (
                        "This phone number is already tied to an existing GMFN identity. "
                        "Sign in to that account first, then continue this community join "
                        "with the same GMFN ID."
                    ),
                    "login_path": "/login",
                    "invite_code": invite_code,
                    "community_id": int(clan.id),
                    "community_code": _community_code(clan.id, clan=clan),
                    "community_name": clan.name,
                    "marketplace_name": getattr(clan, "marketplace_name", None),
                    "gmfn_id": _safe_str(getattr(existing_identity_user, "gmfn_id", None)) or None,
                },
            )

        existing_user = db.query(User).filter(User.email == applicant_email).first()
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

    if (
        submitted_phone
        and not _safe_str(getattr(applicant_user, "phone_e164", None))
    ):
        applicant_user.phone_e164 = submitted_phone
        db.add(applicant_user)
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
        return {
            "ok": True,
            "message": f"Request already {req.status}.",
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

    if str(req.status).lower() != "pending":
        return {
            "ok": True,
            "pilot_override": True,
            "approved_now": False,
            "message": f"Request already {req.status}.",
            "community_id": int(clan_id),
            "community_code": _community_code(clan_id),
            "request": _join_request_out(db, req),
        }

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

    members = [
        membership
        for membership, _user in _active_reviewer_memberships(db, clan_id=int(clan_id))
    ]

    items = [_member_row(db, m) for m in members]
    return {"items": items, "total": len(items), "community_code": _community_code(clan_id)}


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
        raise HTTPException(status_code=409, detail="User already in clan")

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
