from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, List, Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session
from app.services.notification_service import create_notification
from app.core.auth import get_current_user, get_password_hash
from app.core.clan_auth import ensure_membership, get_current_clan_membership
from app.core.dev_guard import require_dev_mode
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
    frontend_join_link,
)

router = APIRouter(prefix="/clans", tags=["clans"])

JOIN_APPROVAL_RATIO = Decimal("0.40")


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
    first_name: str = Field(..., min_length=1, max_length=80)
    surname: str = Field(..., min_length=1, max_length=80)
    phone_e164: str = Field(..., min_length=8, max_length=32)
    country: str = Field(..., min_length=2, max_length=80)
    business_name: Optional[str] = Field(default=None, max_length=160)
    note: Optional[str] = Field(default=None, max_length=500)


class VoteJoinRequestIn(BaseModel):
    vote: str = Field(..., pattern="^(approve|reject)$")


def _require_clan_admin(clan_ctx: tuple) -> tuple:
    clan, membership, current_user = clan_ctx
    if (membership.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Clan admin only")
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
    expires_at = _utc_aware(getattr(clan, "invite_expires_at", None))
    if expires_at is None:
        return False
    return expires_at < datetime.now(timezone.utc)


def _ensure_user_gmfn_id(db: Session, user: User) -> User:
    current = str(getattr(user, "gmfn_id", "") or "").strip()
    if current:
        return user

    for _ in range(20):
        candidate = "GMFN-U-" + secrets.token_hex(4).upper()
        exists = db.query(User).filter(User.gmfn_id == candidate).first()
        if not exists:
            user.gmfn_id = candidate
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

    raise HTTPException(status_code=500, detail="Could not generate unique GMFN ID")


def _current_join_status(
    db: Session,
    *,
    join_request: ClanJoinRequest,
) -> dict[str, Any]:
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

    active_members = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(join_request.clan_id),
            ClanMembership.left_at.is_(None),
        )
        .count()
    )
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
    }


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
    }

def _frontend_origin() -> str:
    return "http://127.0.0.1:5174"


def _frontend_community_join_link(
    request: Request,
    *,
    clan: Clan,
    invite_code: str,
    inviter: Optional[User] = None,
) -> str:
    origin = _frontend_origin()

    params = {
        "invite": invite_code,
        "community_name": _safe_str(clan.name),
        "community_code": _community_code(clan.id),
    }

    marketplace_name = _safe_str(getattr(clan, "marketplace_name", None))
    if marketplace_name:
        params["marketplace_name"] = marketplace_name

    inviter_name = _member_display(inviter)
    if inviter_name:
        params["inviter_name"] = inviter_name

    return f"{origin}/join/community/{int(clan.id)}?{urlencode(params)}"


def _frontend_activation_link(request: Request, gmfn_id: str) -> str:
    origin = _frontend_origin()
    return f"{origin}/activate-membership?{urlencode({'gmfn_id': gmfn_id})}"


def _build_invite_text(
    *,
    clan: Clan,
    invite_link: str,
    inviter: Optional[User],
) -> str:
    inviter_name = _member_display(inviter)
    clan_name = _safe_str(clan.name, "our GMFN community")
    community_code = _community_code(clan.id)
    marketplace_name = _safe_str(getattr(clan, "marketplace_name", None))

    lines = [
        "Hello,",
        "",
        f"You have been invited to begin the join request process for {clan_name}.",
        f"Invited by: {inviter_name}",
        f"Community ID: {community_code}",
    ]

    if marketplace_name:
        lines.append(f"Community / Market: {marketplace_name}")

    lines.extend(
        [
            "",
            "GMFN is a trust-based community system for structured support, credibility, and economic coordination.",
            "This invitation does not mean automatic admission. The community will still review and vote on your request.",
            "",
            "Use this link to begin your request:",
            invite_link,
            "",
            "After review and approval, GMFN will issue your ID and invite you to activate your membership properly.",
            "",
            "— Sent via GMFN",
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
    activation_link = _frontend_activation_link(request, gmfn_id)
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

    activation = _build_activation_package(
        request=request,
        clan=clan,
        applicant=applicant,
        inviter=inviter,
        join_request=join_request,
    )

    join_request.status = "approved"
    join_request.decided_at = datetime.now(timezone.utc)
    join_request.activation_link = activation.get("activation_link")
    join_request.activation_message = activation.get("activation_message")
    join_request.activation_generated_at = datetime.now(timezone.utc)
    join_request.activation_delivery_status = "pending"

    db.add(join_request)
    db.commit()
    db.refresh(join_request)

    create_notification(
        db,
        user_id=int(applicant.id),
        kind="approval_success",
        title="You were approved",
        message="You can now activate your GMFN account.",
        action_url="/activate-membership",
        action_label="Activate",
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
    return {
        "ok": True,
        "status": "approved",
        "gmfn_id": applicant.gmfn_id,
        "user_id": int(applicant.id),
        "membership_id": int(membership.id),
        "message": "Applicant approved and GMFN ID issued.",
        **activation,
        "activation_generated_at": join_request.activation_generated_at,
        "activation_delivery_status": join_request.activation_delivery_status,
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

    m = ClanMembership(
        clan_id=clan.id,
        user_id=current_user.id,
        role="admin",
        personal_pool_balance=Decimal("0"),
    )
    db.add(m)
    db.commit()

    return _clan_out(clan)


@router.get("/me", response_model=MyClansOut)
def list_my_clans(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clans = (
        db.query(Clan)
        .join(ClanMembership, ClanMembership.clan_id == Clan.id)
        .filter(
            ClanMembership.user_id == current_user.id,
            ClanMembership.left_at.is_(None),
        )
        .order_by(Clan.id.desc())
        .all()
    )
    items = [_clan_out(clan) for clan in clans]
    return {"items": items, "total": len(items)}


@router.post("/{clan_id}/join", status_code=201, response_model=dict[str, Any])
def join_clan(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    clan = db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")

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
        raise HTTPException(status_code=409, detail="Already a member of this clan")

    m = ClanMembership(
        clan_id=clan_id,
        user_id=current_user.id,
        role="user",
        personal_pool_balance=Decimal("0"),
    )
    db.add(m)
    db.commit()
    db.refresh(m)

    return {
        "ok": True,
        "community_code": _community_code(clan_id),
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

    role = "admin" if (current_user.role or "").lower() == "admin" else "user"
    membership = ensure_membership(db=db, clan=clan, user=current_user, role=role)

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
    max_uses_n = _normalize_invite_max_uses(max_uses)

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=days_n)

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

    clan = _ensure_invite_expiry(db, clan, days=days)

    max_uses_norm = _normalize_invite_max_uses(max_uses)
    if max_uses is not None:
        clan.invite_max_uses = max_uses_norm
        if clan.invite_uses is None:
            clan.invite_uses = 0
        db.commit()
        db.refresh(clan)

    share_link = _frontend_community_join_link(
        request,
        clan=clan,
        invite_code=clan.invite_code,
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
        "invite_code": clan.invite_code,
        "invite_created_at": clan.invite_created_at,
        "invite_expires_at": clan.invite_expires_at,
        "invite_max_uses": clan.invite_max_uses,
        "invite_uses": int(getattr(clan, "invite_uses", 0) or 0),
        "invite_link": share_link,
        "invite_url": share_link,
        "url": share_link,
        "link": share_link,
        "share_link": share_link,
        "api_link": api_join_link(request, clan.invite_code),
        "invite_text": _build_invite_text(
            clan=clan,
            invite_link=share_link,
            inviter=current_user,
        ),
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

        expires_at = _utc_aware(getattr(clan, "invite_expires_at", None))
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
    db: Session = Depends(get_db),
):
    invite_code = (payload.invite_code or "").strip()
    if not invite_code:
        raise HTTPException(status_code=400, detail="invite_code is required")

    clan = db.query(Clan).filter(Clan.invite_code == invite_code).first()
    if not clan:
        raise HTTPException(status_code=404, detail="Invitation not found")

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

    applicant_email = (
        f"{payload.phone_e164.strip().replace('+', '').replace(' ', '')}@pending.gmfn.local"
    )

    existing_user = db.query(User).filter(User.email == applicant_email).first()
    if existing_user:
        applicant_user = existing_user
    else:
        applicant_user = User(
            email=applicant_email,
            hashed_password=get_password_hash("temp-password"),
            role="user",
        )
        db.add(applicant_user)
        db.commit()
        db.refresh(applicant_user)

    existing_request = (
        db.query(ClanJoinRequest)
        .filter(
            ClanJoinRequest.clan_id == int(clan.id),
            ClanJoinRequest.applicant_user_id == int(applicant_user.id),
            ClanJoinRequest.status == "pending",
        )
        .first()
    )
    if existing_request:
        raise HTTPException(
            status_code=409,
            detail="A pending join request already exists",
        )

    invite_row = (
        db.query(ClanInvite)
        .filter(ClanInvite.code == invite_code)
        .order_by(ClanInvite.created_at.desc(), ClanInvite.id.desc())
        .first()
    )

    join_request = ClanJoinRequest(
        clan_id=int(clan.id),
        applicant_user_id=int(applicant_user.id),
        invite_id=(int(invite_row.id) if invite_row else None),
        invited_by_user_id=invited_by_user_id,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    db.add(join_request)

    clan.invite_uses = invite_uses + 1
    db.add(clan)

    db.commit()
    db.refresh(join_request)

    admins = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan.id),
            ClanMembership.role == "admin",
            ClanMembership.left_at.is_(None),
        )
        .all()
    )

    for admin in admins:
        create_notification(
            db,
            user_id=int(admin.user_id),
            kind="approval_request",
            title="New join request",
            message=f"{payload.first_name} wants to join {clan.name}",
            action_url=f"/app/community/{clan.id}/join-requests",
            action_label="Review",
        )

    return {
        "ok": True,
        "message": "Join request submitted. Admission is subject to community approval.",
        "community_id": int(clan.id),
        "community_code": _community_code(clan.id),
        "community_name": clan.name,
        "marketplace_name": getattr(clan, "marketplace_name", None),
        "request": _join_request_out(db, join_request),
        "applicant_profile": {
            "first_name": payload.first_name,
            "surname": payload.surname,
            "phone_e164": payload.phone_e164,
            "country": payload.country,
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
    clan, _membership, _current_user = clan_ctx
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
        "community_name": clan.name,
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
    if not membership:
        raise HTTPException(status_code=403, detail="Only active community members can vote")

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
    approval_result = None

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

    return {
        "ok": True,
        "community_id": int(clan_id),
        "community_code": _community_code(clan_id),
        "approved_now": approved_now,
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

    gmfn_id = getattr(applicant, "gmfn_id", None) if applicant else None

    saved_activation_link = _safe_str(getattr(req, "activation_link", None))
    if not saved_activation_link and gmfn_id and str(req.status).lower() == "approved":
        saved_activation_link = _frontend_activation_link(request, gmfn_id)

    return {
        "request_id": int(req.id),
        "status": req.status,
        "gmfn_id": gmfn_id,
        "community_id": int(req.clan_id),
        "community_code": _community_code(req.clan_id, clan=clan),
        "community_name": (getattr(clan, "name", None) if clan else None),
        "marketplace_name": (getattr(clan, "marketplace_name", None) if clan else None),
        "invited_by_user_id": int(req.invited_by_user_id) if req.invited_by_user_id else None,
        "invited_by_email": (getattr(inviter, "email", None) if inviter else None),
        "invited_by_display": (_member_display(inviter) if inviter else None),
        "activation_link": saved_activation_link or None,
        "activation_message": getattr(req, "activation_message", None),
        "activation_generated_at": getattr(req, "activation_generated_at", None),
        "activation_delivery_status": getattr(req, "activation_delivery_status", None),
        "activation_delivered_at": getattr(req, "activation_delivered_at", None),
        "next_step": "activate-membership" if str(req.status).lower() == "approved" else None,
        "message": str(req.status).lower(),
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
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = clan_ctx
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

    members = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.id.asc())
        .all()
    )

    items = [_member_row(db, m) for m in members]
    return {"items": items, "total": len(items), "community_code": _community_code(clan_id)}


@router.post("/{clan_id}/members", status_code=201, response_model=dict[str, Any])
def add_member(
    clan_id: int,
    payload: AddMemberIn,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

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
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

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
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

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
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = _require_clan_admin(clan_ctx)
    if int(clan.id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed")

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