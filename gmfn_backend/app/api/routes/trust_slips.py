from __future__ import annotations

import io
import re
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from html import escape
from typing import Any, Dict, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, is_user_activation_pending
from app.core.rate_limit import client_ip, rate_limiter
from app.db.database import get_db
from app.db.models import Clan, ClanMembership, MarketplaceShop, TrustSlip, User
from app.services.feature_entitlements_service import has_active_feature
from app.services.community_confirmation_service import build_community_confirmation_summary
from app.services.trust_events_services import log_trust_event
from app.services.trust_slips_services import (
    backfill_missing_trustslip_snapshots,
    build_trust_slip_visibility_view,
    ensure_trust_slip_snapshot,
    get_current_trust_slip_for_user,
    get_trust_slip_payload,
    has_material_trustslip_change,
    issue_trust_slip_for_user,
    reissue_trust_slip,
)

try:
    import qrcode  # type: ignore
except Exception:
    qrcode = None


router = APIRouter(prefix="/trust-slips", tags=["trust-slips"])

FEATURE_MERCHANT_VERIFY = "merchant_verify"


def _is_admin(user: Any) -> bool:
    if user is None:
        return False
    return str(getattr(user, "role", "") or "").lower() == "admin"


def _require_admin(user: Any) -> None:
    if not _is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    s = str(value).strip()
    return s if s else default


def _html(value: Any, default: str = "") -> str:
    return escape(_safe_str(value, default), quote=True)


def _display_datetime(value: Any, default: str = "Not stated") -> str:
    raw = _safe_str(value)
    if not raw:
        return default
    try:
        cleaned = raw.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        dt = dt.astimezone(timezone.utc)
        return dt.strftime("%d %b %Y, %H:%M UTC")
    except Exception:
        return raw


def _no_store_headers() -> Dict[str, str]:
    return {
        "Cache-Control": "no-store, max-age=0",
        "Pragma": "no-cache",
    }


def _throttle_public(request: Request, route_name: str) -> None:
    ip = client_ip(request.headers, fallback="unknown")
    key = f"{route_name}:{ip}"
    res = rate_limiter.check(key=key, max_requests=30, window_seconds=60)
    if not res.ok:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Try again in {res.reset_in_seconds}s.",
            headers={"Retry-After": str(res.reset_in_seconds)},
        )


def _mask_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return None
    e = email.strip()
    if "@" not in e:
        return None
    user, domain = e.split("@", 1)
    if len(user) <= 2:
        user_mask = user[0] + "*"
    else:
        user_mask = user[:2] + "*" * (len(user) - 2)
    return f"{user_mask}@{domain}"


def _looks_like_public_identity_code(value: Any) -> bool:
    text = _safe_str(value).upper()
    return bool(re.match(r"^(GMFN|GSN|GMFM)-(U|P)-", text))


def _public_holder_name(holder: Optional[User], *fallbacks: Any) -> str:
    display_name = _safe_str(getattr(holder, "display_name", None) if holder else None)
    if display_name and not _looks_like_public_identity_code(display_name):
        return display_name

    for fallback in fallbacks:
        candidate = _safe_str(fallback)
        if candidate and not _looks_like_public_identity_code(candidate):
            return candidate

    return "Member name not set"


def _safe_visibility_level(user: Optional[User], requested_level: Optional[str]) -> str:
    raw = requested_level or getattr(user, "merchant_visibility_level", "standard") or "standard"
    level = str(raw).strip().lower()
    if level not in {"minimal", "standard", "detailed"}:
        return "standard"
    return level


def _public_visibility_level(
    *,
    stored_level: str,
    requested_level: Optional[str],
) -> str:
    ranks = {"minimal": 0, "standard": 1, "detailed": 2}
    stored = stored_level if stored_level in ranks else "standard"
    if not requested_level:
        return stored
    requested = str(requested_level).strip().lower()
    if requested not in ranks:
        return stored
    return requested if ranks[requested] <= ranks[stored] else stored


def _verify_page_url(code: str, level: Optional[str] = None) -> str:
    base = f"/t/{quote(str(code), safe='')}"
    if level in {"minimal", "standard", "detailed"}:
        return f"{base}?level={level}"
    return base


def _lite_page_url(code: str, level: Optional[str] = None) -> str:
    base = f"/t/{quote(str(code), safe='')}/lite"
    if level in {"minimal", "standard", "detailed"}:
        return f"{base}?level={level}"
    return base


def _safe_public_path_key(value: Any) -> str:
    text = _safe_str(value)
    if not text:
        return ""
    blocked = {
        "n/a",
        "na",
        "none",
        "null",
        "hidden",
        "not shown",
        "not available",
        "-",
    }
    if text.lower() in blocked:
        return ""
    return text


def _member_credential_page_url(*, community_key: Any, member_key: Any) -> str:
    community = _safe_public_path_key(community_key)
    member = _safe_public_path_key(member_key)
    if not community or not member:
        return ""
    if not _looks_like_public_identity_code(member):
        return ""
    community_path = quote(community, safe="")
    member_path = quote(member, safe="")
    return f"/verify/community/{community_path}/member/{member_path}"


def _member_credential_page_for_holder(
    db: Session,
    *,
    clan: Optional[Clan],
    holder: Optional[User],
) -> str:
    if clan is None or holder is None:
        return ""
    if str(getattr(clan, "status", "") or "active").strip().lower() != "active":
        return ""
    if is_user_activation_pending(holder):
        return ""

    clan_id = int(getattr(clan, "id", 0) or 0)
    holder_id = int(getattr(holder, "id", 0) or 0)
    if clan_id <= 0 or holder_id <= 0:
        return ""

    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == clan_id,
            ClanMembership.user_id == holder_id,
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if membership is None:
        return ""

    community_key = (
        _safe_str(getattr(clan, "community_code", None))
        or f"GSN-COM-{clan_id:04d}"
    )
    return _member_credential_page_url(
        community_key=community_key,
        member_key=getattr(holder, "gmfn_id", None),
    )


def _qr_png_bytes(url: str) -> bytes:
    if qrcode is None:
        raise HTTPException(
            status_code=501,
            detail="QR requires 'qrcode[pil]' (pip install qrcode[pil])",
        )
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _is_expired(expires_at: Optional[datetime]) -> bool:
    exp = _to_aware(expires_at)
    if exp is None:
        return False
    return exp < _now_utc()


def _get_holder_shop(
    db: Session,
    *,
    holder_user_id: int,
) -> Optional[MarketplaceShop]:
    return (
        db.query(MarketplaceShop)
        .filter(
            MarketplaceShop.owner_user_id == int(holder_user_id),
            MarketplaceShop.is_active.is_(True),
        )
        .order_by(MarketplaceShop.created_at.asc(), MarketplaceShop.id.asc())
        .first()
    )


def _merchant_verify_active_for_holder(
    db: Session,
    *,
    holder: Optional[User],
) -> bool:
    if holder is None or getattr(holder, "id", None) is None:
        return False

    shop = _get_holder_shop(db, holder_user_id=int(holder.id))

    if shop is not None and has_active_feature(
        db,
        owner_user_id=int(holder.id),
        feature_code=FEATURE_MERCHANT_VERIFY,
        shop_id=int(shop.id),
    ):
        return True

    return has_active_feature(
        db,
        owner_user_id=int(holder.id),
        feature_code=FEATURE_MERCHANT_VERIFY,
        shop_id=None,
    )


def _status_effective(
    status: str,
    expires_at: Optional[datetime],
    *,
    merchant_verify_active: bool = True,
) -> str:
    s = (status or "").lower().strip()

    if _is_expired(expires_at):
        return "expired"

    if s in {"revoked", "frozen"}:
        return s

    if s in {"active", "issued"}:
        if not merchant_verify_active:
            return "merchant_verify_inactive"
        return "active"

    return "invalid"


def _trust_slip_needs_refresh(slip: Optional[TrustSlip]) -> bool:
    if slip is None:
        return False
    raw_status = _safe_str(getattr(slip, "status", "")).lower()
    if raw_status in {"frozen", "revoked"}:
        return False
    return raw_status == "expired" or _is_expired(getattr(slip, "expires_at", None))


def _merchant_badge(effective_status: str) -> tuple[str, str]:
    if effective_status == "active":
        return ("VALID NOW - CURRENT TRUSTSLIP FOUND", "#166534")
    if effective_status == "merchant_verify_inactive":
        return ("PUBLIC RECORD ONLY - MERCHANT VERIFY NOT ACTIVE", "#92400E")
    if effective_status == "expired":
        return ("FRESH TRUSTSLIP REQUIRED", "#92400E")
    if effective_status == "revoked":
        return ("REVOKED - VERIFICATION BLOCKED", "#991B1B")
    if effective_status == "frozen":
        return ("FROZEN - CONTACT GSN ADMIN", "#991B1B")
    return ("NOT CURRENT - ASK FOR UPDATED VERIFICATION", "#991B1B")


def _band_short_label(value: Any) -> str:
    raw = _safe_str(value).upper()
    match = re.search(r"\b([A-F])\b", raw)
    band = match.group(1) if match else raw[:1]
    return {
        "A": "Strongly trusted",
        "B": "Generally trusted",
        "C": "Mixed",
        "D": "Needs attention",
        "E": "High pressure",
        "F": "Not enough evidence",
    }.get(band, "")


def _band_with_label(value: Any, default: str = "Not shown") -> str:
    band = _safe_str(value, default)
    label = _band_short_label(band)
    if not label:
        return band
    return f"{band.upper()[:1]} - {label}"


def _slip_subject_user_id(slip: TrustSlip) -> int:
    user_id = getattr(slip, "holder_user_id", None)
    if user_id is None:
        raise HTTPException(status_code=500, detail="TrustSlip missing holder_user_id")
    return int(user_id)


def _slip_holder(db: Session, slip: TrustSlip) -> Optional[User]:
    user_id = getattr(slip, "holder_user_id", None)
    if user_id is None:
        return None
    return db.get(User, int(user_id))


def _payload_with_identity(
    db: Session,
    *,
    user_id: int,
    requested_level: Optional[str] = None,
) -> Dict[str, Any]:
    payload = get_trust_slip_payload(db, user_id=int(user_id))
    user = db.get(User, int(user_id))
    visibility_level = _safe_visibility_level(user, requested_level)

    payload["gmfn_id"] = getattr(user, "gmfn_id", None) if user else None
    payload["phone_verified"] = bool(
        getattr(user, "phone_verified_at", None) and getattr(user, "phone_e164", None)
    ) if user else False
    payload["merchant_visibility_level"] = visibility_level
    payload["merchant_view"] = build_trust_slip_visibility_view(
        payload,
        level=visibility_level,
    )
    return payload


def _aligned_snapshot_for_slip(
    db: Session,
    *,
    slip: TrustSlip,
    requested_level: Optional[str] = None,
) -> Dict[str, Any]:
    holder = _slip_holder(db, slip)
    if holder is None:
        raise HTTPException(status_code=404, detail="TrustSlip holder not found")

    full_payload = _payload_with_identity(
        db,
        user_id=int(holder.id),
        requested_level=None,
    )

    snapshot = ensure_trust_slip_snapshot(
        db,
        slip=slip,
        user=holder,
        full_payload=full_payload,
    )

    stored_level = _safe_visibility_level(holder, snapshot.get("merchant_visibility_level"))
    effective_level = _public_visibility_level(
        stored_level=stored_level,
        requested_level=requested_level,
    )
    stored_full_summary = dict(snapshot.get("full_summary") or {})
    full_summary = {**full_payload, **stored_full_summary}

    # Older snapshots should keep their recorded trust facts, but additive
    # reader-context fields can be filled from the current payload so old
    # TrustSlip links do not look emptier than newly issued links.
    for key in (
        "profile_image_url",
        "identity_context",
        "community_context",
        "cci_explainer",
        "identity_status_label",
        "community_global_id",
        "community_code",
        "holder_role",
        "community_member_count",
        "active_member_count",
        "total_member_count",
    ):
        if not full_summary.get(key) and full_payload.get(key) is not None:
            full_summary[key] = full_payload.get(key)

    if requested_level and effective_level != stored_level:
        merchant_view = build_trust_slip_visibility_view(
            dict(full_summary),
            level=effective_level,
        )
    else:
        merchant_view = dict(snapshot.get("merchant_view") or {})

    if "snapshot_checksum" not in snapshot and getattr(slip, "snapshot_checksum", None):
        snapshot["snapshot_checksum"] = getattr(slip, "snapshot_checksum", None)
    if "snapshot_version" not in snapshot and getattr(slip, "snapshot_version", None):
        snapshot["snapshot_version"] = getattr(slip, "snapshot_version", None)

    return {
        "holder": holder,
        "snapshot": snapshot,
        "merchant_view": merchant_view,
        "visibility_level": effective_level,
        "full_summary": full_summary,
    }


def _can_manage_trust_slip(
    *,
    current_user: User,
    holder: Optional[User],
    slip: TrustSlip,
) -> bool:
    if _is_admin(current_user):
        return True
    if holder is not None and getattr(holder, "id", None) is not None:
        return int(holder.id) == int(current_user.id)
    return int(getattr(slip, "holder_user_id", 0) or 0) == int(current_user.id)


def _ensure_my_trust_slip_payload(
    db: Session,
    *,
    current_user: User,
) -> Dict[str, Any]:
    if getattr(current_user, "id", None) is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if (
        not getattr(current_user, "phone_verified_at", None)
        or not getattr(current_user, "phone_e164", None)
    ):
        payload = _payload_with_identity(db, user_id=int(current_user.id))
        return {
            **payload,
            "ok": True,
            "active": False,
            "reason": "phone_unverified",
            "detail": "Verify your phone number to activate TrustSlip portability.",
            "gmfn_id": getattr(current_user, "gmfn_id", None),
            "merchant_verify_active": False,
            "merchant_verify_subscription_required": True,
        }

    current = get_current_trust_slip_for_user(db, user_id=int(current_user.id))
    if not current or _trust_slip_needs_refresh(current):
        try:
            issue_result = (
                reissue_trust_slip(
                    db,
                    user_id=int(current_user.id),
                    reason="expired_trustslip_auto_refresh",
                )
                if current
                else issue_trust_slip_for_user(db, user_id=int(current_user.id))
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        code = issue_result.get("code")
        if bool(issue_result.get("issued", True)):
            log_trust_event(
                db,
                event_type="trust_slip.reissued" if current else "trust_slip.issued",
                clan_id=0,
                actor_user_id=int(current_user.id),
                subject_user_id=int(current_user.id),
                loan_id=None,
                guarantor_id=None,
                meta={
                    "reason": issue_result.get("reason"),
                    "trust_slip_id": issue_result.get("trust_slip_id") or issue_result.get("new_trust_slip_id"),
                    "old_trust_slip_id": issue_result.get("old_trust_slip_id"),
                    "code": code,
                    "gmfn_id": issue_result.get("gmfn_id"),
                },
                commit=False,
                refresh=False,
            )
            db.commit()

    payload = _payload_with_identity(db, user_id=int(current_user.id))
    code = payload.get("code") or payload.get("token")
    merchant_verify_active = _merchant_verify_active_for_holder(
        db,
        holder=current_user,
    )

    return {
        **payload,
        "verification_token": code,
        "verification_code": code,
        "token": code,
        "public_verify_url": _verify_page_url(code) if code else None,
        "merchant_verify_active": bool(merchant_verify_active),
        "merchant_verify_subscription_required": not bool(merchant_verify_active),
        "merchant_verify_detail": (
            "External merchant verification is active."
            if merchant_verify_active
            else "External merchant verification requires an active merchant verification subscription."
        ),
    }


class TrustSlipReleaseIn(BaseModel):
    supplier_name: Optional[str] = None
    supplier_phone: Optional[str] = None
    amount_released: Optional[Decimal] = Field(default=None, gt=Decimal("0"))
    note: Optional[str] = None


class TrustSlipExtendIn(BaseModel):
    days: int = Field(default=7, ge=1, le=365)


class TrustSlipReissueIn(BaseModel):
    reason: str = Field(default="manual_reissue", min_length=3, max_length=255)
    force: bool = False


@router.get("/ping")
def ping() -> Dict[str, Any]:
    return {"ok": True, "service": "trust-slips"}


@router.get("/me")
def get_my_trust_slip(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    return _ensure_my_trust_slip_payload(db, current_user=current_user)


@router.get("/me/summary")
def get_my_trust_slip_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    return _ensure_my_trust_slip_payload(db, current_user=current_user)


@router.post("/me/issue")
def issue_my_trust_slip(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    if getattr(current_user, "id", None) is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        result = issue_trust_slip_for_user(db, user_id=int(current_user.id))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    code = result.get("code")

    if bool(result.get("issued")):
        log_trust_event(
            db,
            event_type="trust_slip.issued",
            clan_id=0,
            actor_user_id=int(current_user.id),
            subject_user_id=int(current_user.id),
            loan_id=None,
            guarantor_id=None,
            meta={
                "reason": result.get("reason"),
                "trust_slip_id": result.get("trust_slip_id"),
                "code": code,
                "gmfn_id": result.get("gmfn_id"),
            },
            commit=False,
            refresh=False,
        )
        db.commit()

    merchant_verify_active = _merchant_verify_active_for_holder(
        db,
        holder=current_user,
    )

    return {
        **result,
        "verification_token": code,
        "verification_code": code,
        "token": code,
        "public_verify_url": _verify_page_url(code) if code else None,
        "merchant_verify_active": bool(merchant_verify_active),
        "merchant_verify_subscription_required": not bool(merchant_verify_active),
    }


@router.get("/me/reissue-check")
def get_my_trust_slip_reissue_check(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    if getattr(current_user, "id", None) is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    slip = get_current_trust_slip_for_user(db, user_id=int(current_user.id))
    if not slip:
        return {
            "ok": True,
            "has_current_slip": False,
            "material_change": False,
            "changes": {},
        }

    if _trust_slip_needs_refresh(slip):
        return {
            "ok": True,
            "has_current_slip": True,
            "trust_slip_id": int(slip.id),
            "code": slip.code,
            "material_change": True,
            "changes": {
                "status": {
                    "old": "expired",
                    "new": "needs_current_trustslip",
                }
            },
        }

    out = has_material_trustslip_change(
        db,
        slip=slip,
        user=current_user,
    )
    return {
        "ok": True,
        "has_current_slip": True,
        "trust_slip_id": int(slip.id),
        "code": slip.code,
        "material_change": bool(out.get("material_change")),
        "changes": out.get("changes") or {},
    }


@router.post("/me/reissue")
def reissue_my_trust_slip(
    payload: TrustSlipReissueIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    if getattr(current_user, "id", None) is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    slip = get_current_trust_slip_for_user(db, user_id=int(current_user.id))
    slip_needs_refresh = _trust_slip_needs_refresh(slip)
    force_reissue = bool(payload.force)
    if slip and not slip_needs_refresh and not force_reissue:
        check = has_material_trustslip_change(
            db,
            slip=slip,
            user=current_user,
        )
        if not bool(check.get("material_change")):
            return {
                "ok": True,
                "reissued": False,
                "detail": "No material TrustSlip change detected.",
                "changes": {},
                "code": slip.code,
                "trust_slip_id": int(slip.id),
            }

    try:
        result = reissue_trust_slip(
            db,
            user_id=int(current_user.id),
            reason=payload.reason,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    log_trust_event(
        db,
        event_type="trust_slip.reissued",
        clan_id=0,
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        loan_id=None,
        guarantor_id=None,
        meta={
            "reason": payload.reason,
            "new_trust_slip_id": result.get("new_trust_slip_id"),
            "old_trust_slip_id": result.get("old_trust_slip_id"),
            "code": result.get("code"),
        },
        commit=False,
        refresh=False,
    )
    db.commit()

    return {
        "ok": True,
        "reissued": True,
        **result,
    }


@router.post("/admin/backfill-snapshots")
def admin_backfill_trustslip_snapshots(
    only_current: bool = True,
    limit: int = 500,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)
    return backfill_missing_trustslip_snapshots(
        db,
        only_current=bool(only_current),
        limit=int(limit),
    )


@router.get("/verify/{code}")
def verify_trust_slip_public(
    code: str,
    request: Request,
    level: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _throttle_public(request, "trustslip_verify_json")

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    aligned = _aligned_snapshot_for_slip(
        db,
        slip=slip,
        requested_level=level,
    )

    holder = aligned["holder"]
    snapshot = aligned["snapshot"]
    merchant_view = aligned["merchant_view"]
    visibility_level = aligned["visibility_level"]
    full_summary = aligned["full_summary"]

    merchant_verify_active = _merchant_verify_active_for_holder(
        db,
        holder=holder,
    )

    effective = _status_effective(
        getattr(slip, "status", "") or "",
        getattr(slip, "expires_at", None),
        merchant_verify_active=merchant_verify_active,
    )
    badge_text, _ = _merchant_badge(effective)

    merchant_summary = dict(merchant_view.get("merchant_summary") or {})

    gmfn_id = merchant_summary.get("gmfn_id") or getattr(holder, "gmfn_id", None)
    trust_limit = merchant_summary.get("trust_limit") or full_summary.get("trust_limit")
    currency = merchant_summary.get("currency") or full_summary.get("currency")
    expires_at = merchant_summary.get("expires_at") or full_summary.get("expires_at")

    created_at_value = (
        getattr(slip, "created_at", None).isoformat()
        if getattr(slip, "created_at", None)
        else None
    )

    last_release_at_value = (
        getattr(slip, "last_release_at", None).isoformat()
        if getattr(slip, "last_release_at", None)
        else None
    )

    display_name = _public_holder_name(
        holder,
        merchant_view.get("display_name"),
        merchant_summary.get("display_name"),
        full_summary.get("display_name"),
    )

    community = (
        merchant_view.get("community")
        or merchant_summary.get("community")
        or merchant_summary.get("clan_name")
        or full_summary.get("clan_name")
        or full_summary.get("community")
        or "-"
    )

    band = (
        merchant_view.get("band")
        or merchant_summary.get("band")
        or full_summary.get("trust_band")
        or full_summary.get("band")
        or "-"
    )

    merchant_view_out = {
        **merchant_view,
        "display_name": display_name,
        "gmfn_id": gmfn_id,
        "community": community,
        "profile_image_url": merchant_view.get("profile_image_url")
        or merchant_summary.get("profile_image_url")
        or full_summary.get("profile_image_url"),
        "identity_context": merchant_view.get("identity_context")
        or full_summary.get("identity_context")
        or {},
        "community_context": merchant_view.get("community_context")
        or full_summary.get("community_context")
        or {},
        "cci_explainer": merchant_view.get("cci_explainer")
        or merchant_summary.get("cci_explainer")
        or full_summary.get("cci_explainer")
        or {},
        "band": band,
        "visibility_level": visibility_level,
        "status": effective,
        "merchant_verify_active": bool(merchant_verify_active),
        "merchant_summary": {
            **merchant_summary,
            "code": merchant_summary.get("code") or slip.code,
            "gmfn_id": gmfn_id,
            "display_name": merchant_summary.get("display_name") or display_name,
            "community": merchant_summary.get("community") or community,
            "band": merchant_summary.get("band") or band,
            "expires_at": merchant_summary.get("expires_at") or expires_at,
        },
    }

    top_level_cci_score = merchant_view_out.get("cci_score") or merchant_summary.get("cci_score")
    top_level_cci_band = merchant_view_out.get("cci_band") or merchant_summary.get("cci_band")
    top_level_sponsor_count = (
        merchant_view_out.get("sponsor_count")
        if merchant_view_out.get("sponsor_count") is not None
        else merchant_summary.get("sponsor_count")
    )
    top_level_phone_verified = merchant_view_out.get("phone_verified")
    if top_level_phone_verified is None:
        top_level_phone_verified = merchant_summary.get("phone_verified")
    evidence_summary = full_summary.get("evidence_summary") or {}
    commitment_discipline = evidence_summary.get("commitment_discipline") or {}
    personal_commitment_discipline = evidence_summary.get("personal_commitment_discipline") or {}
    human_terms = evidence_summary.get("human_terms") or {}
    identity_context = merchant_view_out.get("identity_context") or {}
    community_context = merchant_view_out.get("community_context") or {}
    cci_explainer = merchant_view_out.get("cci_explainer") or {}
    member_credential_page = _member_credential_page_for_holder(
        db,
        clan=db.get(Clan, int(getattr(slip, "clan_id", 0) or 0)),
        holder=holder,
    )
    if member_credential_page:
        merchant_view_out["member_credential_page"] = member_credential_page
    membership_currentness_label = (
        merchant_view_out.get("membership_currentness_label")
        or merchant_summary.get("membership_currentness_label")
        or full_summary.get("membership_currentness_label")
        or community_context.get("membership_currentness_label")
    )
    membership_currentness_scope = (
        merchant_view_out.get("membership_currentness_scope")
        or merchant_summary.get("membership_currentness_scope")
        or full_summary.get("membership_currentness_scope")
        or community_context.get("membership_currentness_scope")
    )
    if membership_currentness_label:
        merchant_view_out["membership_currentness_label"] = membership_currentness_label
        merchant_view_out.setdefault("merchant_summary", {})[
            "membership_currentness_label"
        ] = membership_currentness_label
    if membership_currentness_scope:
        merchant_view_out["membership_currentness_scope"] = membership_currentness_scope
        merchant_view_out.setdefault("merchant_summary", {})[
            "membership_currentness_scope"
        ] = membership_currentness_scope
    community_confirmation: Dict[str, Any] = {}
    try:
        community_confirmation = build_community_confirmation_summary(
            db,
            community_id=int(getattr(slip, "clan_id")),
            subject_user_id=int(getattr(slip, "holder_user_id")),
        )
    except Exception:
        community_confirmation = {
            "relay_available": False,
            "plain_language": "Community confirmation could not be loaded for this TrustSlip.",
        }

    return {
        "code": slip.code,
        "token": slip.code,
        "verification_token": slip.code,
        "verification_code": slip.code,
        "public_verify_url": _verify_page_url(slip.code, visibility_level),
        "member_credential_page": member_credential_page or None,
        "holder_name": display_name,
        "display_name": display_name,
        "profile_image_url": merchant_view_out.get("profile_image_url") if visibility_level != "minimal" else None,
        "gmfn_id": gmfn_id,
        "holder_gmfn_id": gmfn_id,
        "community_name": community,
        "community": community,
        "identity_context": identity_context if visibility_level != "minimal" else {},
        "community_context": community_context if visibility_level != "minimal" else {},
        "community_confirmation": community_confirmation if visibility_level != "minimal" else {
            "relay_available": bool(community_confirmation.get("relay_available")),
            "plain_language": community_confirmation.get("plain_language"),
        },
        "cci_explainer": cci_explainer if visibility_level != "minimal" else {},
        "identity_verified": bool(identity_context.get("identity_verified")),
        "identity_status_label": identity_context.get("identity_status_label"),
        "community_global_id": community_context.get("community_global_id"),
        "community_code": community_context.get("community_code"),
        "holder_role": community_context.get("holder_role"),
        "community_member_count": community_context.get("active_member_count"),
        "active_member_count": community_context.get("active_member_count"),
        "total_member_count": community_context.get("total_member_count"),
        "trust_band": band,
        "band": band,
        "status": getattr(slip, "status", None),
        "effective_status": effective,
        "verification_status": effective,
        "merchant_verify_active": bool(merchant_verify_active),
        "merchant_verify_subscription_required": not bool(merchant_verify_active),
        "merchant_message": badge_text,
        "created_at": created_at_value,
        "issued_at": created_at_value,
        "expires_at": expires_at,
        "trust_limit": trust_limit,
        "trust_slip_limit": trust_limit,
        "currency": currency,
        "cci_score": top_level_cci_score,
        "cci_band": top_level_cci_band,
        "sponsor_count": top_level_sponsor_count,
        "phone_verified": bool(top_level_phone_verified),
        "membership_currentness_label": membership_currentness_label,
        "membership_currentness_scope": membership_currentness_scope,
        "visibility_level": visibility_level,
        "last_release_at": last_release_at_value,
        "last_full_repayment_at": merchant_view_out.get("last_full_repayment_at"),
        "days_since_last_full_repayment": merchant_view_out.get("days_since_last_full_repayment"),
        "risk_flags": merchant_view_out.get("risk_flags", []),
        "commitment_discipline": commitment_discipline if visibility_level != "minimal" else {},
        "personal_commitment_discipline": personal_commitment_discipline if visibility_level != "minimal" else {},
        "human_terms": human_terms if visibility_level != "minimal" else {},
        "holder_email_masked": _mask_email(getattr(holder, "email", None)),
        "verify_page": _verify_page_url(slip.code, visibility_level),
        "lite_page": _lite_page_url(slip.code, visibility_level),
        "verified_at": _now_utc().isoformat(),
        "offline_note": "If network drops, screenshot this page. Use the code to re-verify later.",
        "verification_note": "GSN is non-custodial. This checks TrustSlip public validity only.",
        "disclaimer": merchant_view_out.get("disclaimer")
        or "TrustSlip is a decision aid, not a bank guarantee, not auto-debit, and not automatic approval.",
        "snapshot_version": snapshot.get("snapshot_version"),
        "snapshot_checksum": snapshot.get("snapshot_checksum") or getattr(slip, "snapshot_checksum", None),
        "is_current": bool(getattr(slip, "is_current", True)),
        "issued_reason": getattr(slip, "issued_reason", None),
        "supersedes_trust_slip_id": getattr(slip, "supersedes_trust_slip_id", None),
        "superseded_by_trust_slip_id": getattr(slip, "superseded_by_trust_slip_id", None),
        "merchant_view": merchant_view_out,
    }


@router.get("/verify/{code}/share-text")
def trust_slip_share_text_public(
    code: str,
    request: Request,
    level: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _throttle_public(request, "trustslip_share_text")

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    holder = _slip_holder(db, slip)
    merchant_verify_active = _merchant_verify_active_for_holder(
        db,
        holder=holder,
    )

    effective = _status_effective(
        getattr(slip, "status", "") or "",
        getattr(slip, "expires_at", None),
        merchant_verify_active=merchant_verify_active,
    )
    msg, _ = _merchant_badge(effective)

    visibility_level = _safe_visibility_level(holder, level) if holder else "standard"
    verify_page = _verify_page_url(code, visibility_level)
    holder_gmfn_id = getattr(holder, "gmfn_id", None) if holder else None
    clan_id = int(getattr(slip, "clan_id", 0) or 0)
    clan = db.get(Clan, clan_id) if clan_id else None
    member_credential_page = _member_credential_page_for_holder(
        db,
        clan=clan,
        holder=holder,
    )

    text = (
        f"TrustSlip verify: {verify_page}  Code: {code}  "
        f"GSN ID: {holder_gmfn_id or 'N/A'}  Visibility: {visibility_level}  Status: {msg}"
    )
    if member_credential_page:
        text = f"{text}  Member credential: {member_credential_page}"
    text = f"{text}  Evidence only: not credit approval, payment instruction, or release permission."

    return {
        "code": code,
        "verify_page": verify_page,
        "member_credential_page": member_credential_page or None,
        "gmfn_id": holder_gmfn_id,
        "merchant_visibility_level": visibility_level,
        "merchant_verify_active": bool(merchant_verify_active),
        "text": text,
        "offline_note": "If link fails, open /trust-slips/verify/{code} or show this message to an admin.",
    }


@router.get("/verify/{code}/lite", response_class=HTMLResponse)
def trust_slip_verify_lite_page(
    code: str,
    request: Request,
    level: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> HTMLResponse:
    _throttle_public(request, "trustslip_verify_lite")

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    aligned = _aligned_snapshot_for_slip(
        db,
        slip=slip,
        requested_level=level,
    )

    holder = aligned["holder"]
    merchant_view = aligned["merchant_view"]
    visibility_level = aligned["visibility_level"]
    full_summary = aligned["full_summary"]

    merchant_verify_active = _merchant_verify_active_for_holder(
        db,
        holder=holder,
    )

    effective = _status_effective(
        getattr(slip, "status", "") or "",
        getattr(slip, "expires_at", None),
        merchant_verify_active=merchant_verify_active,
    )
    msg, color = _merchant_badge(effective)

    merchant_summary = merchant_view.get("merchant_summary") or {}
    trust_limit = _safe_str(merchant_summary.get("trust_limit") or full_summary.get("trust_limit"))
    currency = _safe_str(merchant_summary.get("currency") or full_summary.get("currency"))
    holder_gmfn_id = _safe_str(merchant_summary.get("gmfn_id") or getattr(holder, "gmfn_id", None), "N/A")
    member_credential_page = _member_credential_page_for_holder(
        db,
        clan=db.get(Clan, int(getattr(slip, "clan_id", 0) or 0)),
        holder=holder,
    )
    member_credential_row = (
        '<div class="row"><b>Member credential</b>'
        f'<span><a href="{_html(member_credential_page)}">Open scoped credential</a></span></div>'
        if member_credential_page
        else ""
    )
    expires_text = _display_datetime(
        merchant_summary.get("expires_at") or full_summary.get("expires_at"),
        "No expiry",
    )
    verified_text = _display_datetime(_now_utc().isoformat())
    status_label = {
        "active": "Current",
        "expired": "Fresh TrustSlip required",
        "merchant_verify_inactive": "Public record only",
        "revoked": "Revoked",
        "frozen": "Frozen",
    }.get(effective, "Not current")
    action_text = (
        "Use this only as a quick confirmation. For support, trade, or credit decisions, open the full public verification paper."
        if effective == "active"
        else "Ask the holder to refresh their TrustSlip in GSN and share the new public code or QR before relying on it."
    )

    html = f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>GSN TrustSlip Lite Verification</title>
    <style>
      * {{ box-sizing: border-box; }}
      body {{
        font-family: Inter, Arial, sans-serif;
        margin: 0;
        padding: 16px;
        background: #EEF5FD;
        color: #07172C;
      }}
      .paper {{
        max-width: 520px;
        margin: 0 auto;
        border: 1px solid rgba(37,78,119,0.18);
        border-radius: 24px;
        background: #FFFFFF;
        box-shadow: 0 22px 54px rgba(7,23,44,0.13);
        overflow: hidden;
      }}
      .head {{ padding: 18px 20px; border-bottom: 1px solid #D8E3EE; }}
      .eyebrow {{ color: #164E94; font-size: 12px; font-weight: 1000; letter-spacing: .08em; text-transform: uppercase; }}
      h1 {{ margin: 5px 0 0; font-size: 30px; line-height: 1; }}
      .brand {{ margin-top: 5px; color: #B7791F; font-size: 11px; font-weight: 1000; }}
      .body {{ padding: 18px 20px 20px; }}
      .badge {{
        padding: 15px;
        border-radius: 18px;
        background: {color};
        color: #fff;
        font-weight: 1000;
        text-align:center;
        line-height: 1.1;
        text-transform: uppercase;
      }}
      .note {{
        margin-top: 14px;
        border-left: 5px solid #D6AA45;
        border-radius: 14px;
        background: #FFF7E6;
        color: #5A3A00;
        padding: 12px 13px;
        font-size: 14px;
        font-weight: 850;
        line-height: 1.45;
      }}
      .row {{
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 10px;
        padding: 11px 0;
        border-bottom: 1px solid #D8E3EE;
        font-size: 15px;
        font-weight: 850;
      }}
      .row b {{ color: #07172C; }}
      .row span {{ text-align: right; overflow-wrap: anywhere; }}
      .row a {{ color: #0B63D1; font-weight: 1000; text-decoration: none; }}
      .row a:hover {{ text-decoration: underline; }}
      .muted {{ margin-top: 12px; font-size: 13px; color: #64748B; font-weight: 750; line-height: 1.45; }}
      code {{ background:#F1F7FF; padding:2px 6px; border-radius:6px; }}
    </style>
  </head>
  <body>
    <main class="paper">
      <header class="head">
        <div class="eyebrow">GSN public lite check</div>
        <h1>TrustSlip Lite</h1>
        <div class="brand">OPEN - TRUST - IMPACT</div>
      </header>
      <section class="body">
        <div class="badge">{_html(msg)}</div>
        <div class="note">{_html(action_text)}</div>
        <div class="row"><b>Status</b><span>{_html(status_label)}</span></div>
        <div class="row"><b>Trust-limit signal</b><span>{_html(trust_limit)} {_html(currency)}</span></div>
        <div class="row"><b>Code</b><span><code>{_html(code)}</code></span></div>
        <div class="row"><b>GSN ID</b><span><code>{_html(holder_gmfn_id)}</code></span></div>
        <div class="row"><b>Visibility</b><span>{_html(visibility_level)}</span></div>
        <div class="row"><b>Expires</b><span>{_html(expires_text)}</span></div>
        {member_credential_row}
        <div class="muted">Checked at: {_html(verified_text)}. If network drops, screenshot this page and re-check the code later.</div>
      </section>
    </main>
  </body>
</html>"""
    return HTMLResponse(content=html, headers=_no_store_headers())


@router.get("/verify/{code}/qr.png")
def trust_slip_verify_qr_png(
    code: str,
    request: Request,
    level: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> Response:
    _throttle_public(request, "trustslip_verify_qr")

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    holder = _slip_holder(db, slip)
    visibility_level = _safe_visibility_level(holder, level) if holder else "standard"

    png = _qr_png_bytes(_verify_page_url(slip.code, visibility_level))
    return Response(content=png, media_type="image/png", headers=_no_store_headers())


@router.get("/verify/{code}/page", response_class=HTMLResponse)
def trust_slip_verify_page(
    code: str,
    request: Request,
    level: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> HTMLResponse:
    _throttle_public(request, "trustslip_verify_page")

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    aligned = _aligned_snapshot_for_slip(
        db,
        slip=slip,
        requested_level=level,
    )

    holder = aligned["holder"]
    merchant_view = aligned["merchant_view"]
    visibility_level = aligned["visibility_level"]
    full_summary = aligned["full_summary"]

    merchant_verify_active = _merchant_verify_active_for_holder(
        db,
        holder=holder,
    )

    effective = _status_effective(
        getattr(slip, "status", "") or "",
        getattr(slip, "expires_at", None),
        merchant_verify_active=merchant_verify_active,
    )
    badge_text, badge_color = _merchant_badge(effective)
    status_class = (
        "status-valid"
        if effective == "active"
        else "status-caution"
        if effective in {"expired", "merchant_verify_inactive"}
        else "status-blocked"
    )

    merchant_summary = merchant_view.get("merchant_summary") or {}
    trust_limit = _safe_str(merchant_summary.get("trust_limit") or full_summary.get("trust_limit"))
    currency = _safe_str(merchant_summary.get("currency") or full_summary.get("currency"))
    holder_gmfn_id = _safe_str(merchant_summary.get("gmfn_id") or getattr(holder, "gmfn_id", None), "Hidden")
    display_name = _public_holder_name(
        holder,
        merchant_view.get("display_name"),
        merchant_summary.get("display_name"),
        full_summary.get("display_name"),
    )
    community_name = _safe_str(
        merchant_view.get("community")
        or merchant_summary.get("community")
        or full_summary.get("community"),
        "Not shown",
    )
    band = _band_with_label(
        merchant_view.get("band") or merchant_summary.get("band") or full_summary.get("band"),
        "Not shown",
    )
    sponsor_count = _safe_str(
        merchant_view.get("sponsor_count")
        or merchant_summary.get("sponsor_count")
        or full_summary.get("sponsor_count"),
        "0",
    )
    phone_verified = bool(
        merchant_view.get("phone_verified")
        or merchant_summary.get("phone_verified")
        or full_summary.get("phone_verified")
    )
    phone_status = "Verified" if phone_verified else "Not shown"
    raw_expires_text = _safe_str(merchant_summary.get("expires_at") or full_summary.get("expires_at"), "No expiry")
    expires_text = _display_datetime(raw_expires_text, "No expiry")
    issued_text = _display_datetime(getattr(slip, "created_at", None), "Not stated")
    verified_text = _display_datetime(_now_utc().isoformat())

    if effective == "active":
        plain_reading = (
            "This TrustSlip is current. It gives a public, community-backed trust summary "
            "for identity, support, trade, and low-risk decision checks. Use it as one "
            "careful input alongside your own judgement."
        )
        action_reading = (
            "You may continue with ordinary caution, match the decision to the visible "
            "evidence, and keep the TrustSlip code for later verification."
        )
    elif effective == "expired":
        plain_reading = (
            "This TrustSlip has passed its public verification window. It should not be "
            "used for a new decision until the holder refreshes it and shares a current "
            "TrustSlip."
        )
        action_reading = (
            "Ask the holder to open GSN, refresh their TrustSlip, and send the new public "
            "verification code or QR. Do not rely on this old code for support, release, "
            "credit, or emergency decisions."
        )
    else:
        plain_reading = (
            "This TrustSlip is not a current public decision paper. Treat it as a failed "
            "or limited verification and ask for a fresh TrustSlip before relying on it."
        )
        action_reading = (
            "Do not use this page as approval. Ask for a current public TrustSlip, or "
            "contact the holder/community through the normal GSN route."
        )

    cci_row = ""
    if merchant_summary.get("cci_score") not in (None, "", "-"):
        cci_band = _safe_str(merchant_summary.get("cci_band"), "")
        band_part = f" ({_band_with_label(cci_band)})" if cci_band else ""
        cci_value = f"{_safe_str(merchant_summary.get('cci_score'))}{band_part}"
        cci_row = f'<div class="row"><b>Cross-community consistency</b><span>{_html(cci_value)}</span></div>'
    member_credential_page = _member_credential_page_for_holder(
        db,
        clan=db.get(Clan, int(getattr(slip, "clan_id", 0) or 0)),
        holder=holder,
    )
    member_credential_row = (
        '<div class="row"><b>Member credential</b>'
        f'<span><a href="{_html(member_credential_page)}">Open scoped credential</a></span></div>'
        if member_credential_page
        else ""
    )
    member_credential_action = (
        f'<a class="btn secondary" href="{_html(member_credential_page)}">Member credential</a>'
        if member_credential_page
        else ""
    )

    status_label = {
        "active": "Current",
        "expired": "Fresh TrustSlip required",
        "merchant_verify_inactive": "Public record only",
        "revoked": "Revoked",
        "frozen": "Frozen",
    }.get(effective, "Not current")
    print_link = f"/trust-slips/verify/{code}/print?level={visibility_level}"
    lite_link = _lite_page_url(code, visibility_level)
    qr_img = f"/trust-slips/verify/{code}/qr.png?level={visibility_level}"
    holder_refresh_link = "/app/trust-slip"

    html = f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>TrustSlip Verification</title>
    <style>
      :root {{
        --navy: #07172C;
        --blue: #0B63D1;
        --gold: #D6AA45;
        --gold-soft: #FFF7E6;
        --line: #D8E3EE;
        --muted: #64748B;
        --status: {badge_color};
      }}
      * {{ box-sizing: border-box; }}
      body {{
        font-family: Inter, Arial, sans-serif;
        margin: 0;
        background: linear-gradient(180deg, #F6FAFF 0%, #EEF5FD 48%, #F8FBFF 100%);
        color: var(--navy);
        padding: 18px;
      }}
      .paper {{
        position: relative;
        max-width: 920px;
        margin: 0 auto;
        overflow: hidden;
        border: 1px solid rgba(37,78,119,0.18);
        border-radius: 28px;
        background: #FFFFFF;
        box-shadow: 0 28px 70px rgba(7,23,44,0.14);
      }}
      .paper::before {{
        content: "";
        display: block;
        height: 8px;
        background: linear-gradient(90deg, var(--navy), #164E94 48%, var(--gold));
      }}
      .watermark {{
        position: absolute;
        right: -70px;
        top: 120px;
        width: 260px;
        height: 260px;
        border-radius: 50%;
        border: 22px solid rgba(11,99,209,0.035);
        pointer-events: none;
      }}
      .trustmark {{
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 16px;
        border: 1px solid rgba(214,170,69,0.34);
        border-radius: 18px;
        background: linear-gradient(135deg, #FFFCF2, #F8FBFF);
        padding: 12px 14px;
        color: #5A3A00;
        font-size: 13px;
        font-weight: 900;
      }}
      .trustmark span {{
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }}
      .trustmark b {{
        color: var(--navy);
      }}
      .header {{
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 16px;
        padding: 26px 28px 18px;
        border-bottom: 1px solid rgba(216,227,238,0.82);
      }}
      .eyebrow {{
        color: #164E94;
        font-size: 13px;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
      }}
      h1 {{
        margin: 4px 0 0;
        font-size: clamp(34px, 7vw, 56px);
        line-height: .96;
        letter-spacing: 0;
      }}
      .subtitle {{
        margin: 10px 0 0;
        max-width: 620px;
        color: var(--muted);
        font-size: 17px;
        font-weight: 700;
        line-height: 1.45;
      }}
      .brand {{
        text-align: right;
        color: var(--navy);
        font-weight: 1000;
        font-size: 34px;
        line-height: 1;
      }}
      .brand small {{
        display: block;
        margin-top: 4px;
        color: #B7791F;
        font-size: 10px;
        font-weight: 1000;
        letter-spacing: .08em;
      }}
      .body {{
        position: relative;
        padding: 22px 28px 26px;
      }}
      .badge {{
        border-radius: 20px;
        padding: 18px;
        color: #FFFFFF;
        background: var(--status);
        box-shadow: 0 14px 32px rgba(7,23,44,0.16);
        font-size: clamp(21px, 5vw, 36px);
        font-weight: 1000;
        text-align: center;
        line-height: 1.05;
        text-transform: uppercase;
      }}
      .status-valid {{ background: #166534; }}
      .status-caution {{ background: linear-gradient(135deg, #92400E, #B7791F); }}
      .status-blocked {{ background: linear-gradient(135deg, #991B1B, #C02626); }}
      .plain {{
        background: #F8FBFF;
        border: 1px solid rgba(216,227,238,0.95);
        border-radius: 20px;
        padding: 18px;
        margin: 18px 0;
        line-height: 1.48;
        font-size: 18px;
        font-weight: 700;
      }}
      .plain strong {{ font-weight: 1000; }}
      .decision {{
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        margin-top: 14px;
        border-radius: 18px;
        border: 1px solid rgba(37,78,119,0.14);
        background: #FFFFFF;
        padding: 12px 14px;
      }}
      .decision small {{
        display: block;
        color: var(--muted);
        font-size: 12px;
        font-weight: 900;
        text-transform: uppercase;
      }}
      .decision b {{
        display: block;
        margin-top: 3px;
        color: var(--navy);
        font-size: 17px;
      }}
      .decision-code {{
        border-radius: 14px;
        background: #F1F7FF;
        padding: 9px 11px;
        color: #164E94;
        font-size: 13px;
        font-weight: 1000;
      }}
      .instruction {{
        margin-top: 12px;
        border-left: 5px solid var(--gold);
        border-radius: 14px;
        background: var(--gold-soft);
        padding: 13px 14px;
        color: #5A3A00;
        font-size: 15px;
        font-weight: 850;
        line-height: 1.45;
      }}
      .grid {{
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
        margin-top: 18px;
      }}
      .card {{
        border: 1px solid rgba(216,227,238,0.92);
        border-radius: 18px;
        background: #FFFFFF;
        padding: 14px;
        min-height: 82px;
      }}
      .label {{
        color: var(--muted);
        font-size: 12px;
        font-weight: 1000;
        text-transform: uppercase;
      }}
      .value {{
        margin-top: 7px;
        color: var(--navy);
        font-size: 19px;
        font-weight: 1000;
        line-height: 1.25;
        overflow-wrap: anywhere;
      }}
      .row {{
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid rgba(216,227,238,0.78);
        color: #334155;
        font-size: 16px;
        font-weight: 800;
      }}
      .row b {{ color: var(--navy); }}
      .row a {{
        color: #0B63D1;
        font-weight: 1000;
        text-decoration: none;
      }}
      .row a:hover {{ text-decoration: underline; }}
      .muted {{
        color: var(--muted);
        font-size: 13px;
        font-weight: 750;
        line-height: 1.45;
      }}
      .actions {{
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin-top: 18px;
      }}
      .btn {{
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 54px;
        padding: 12px 14px;
        border-radius: 16px;
        background: #0B63D1;
        color: #FFFFFF;
        text-decoration: none;
        text-align: center;
        font-size: 15px;
        font-weight: 1000;
      }}
      .btn.secondary {{ background: #FFFFFF; color: var(--navy); border: 1px solid rgba(37,78,119,0.18); }}
      .btn.warning {{ background: #FFF7E6; color: #92400E; border: 1px solid rgba(180,83,9,0.26); }}
      .qr-wrap {{
        margin-top: 20px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 18px;
        align-items: center;
        border-radius: 20px;
        border: 1px solid rgba(216,227,238,0.92);
        background: #F8FBFF;
        padding: 16px;
      }}
      img.qr {{
        width: 180px;
        height: 180px;
        border: 1px solid rgba(37,78,119,0.14);
        border-radius: 18px;
        background: #FFFFFF;
        padding: 8px;
      }}
      .footer {{
        margin-top: 20px;
        border-radius: 0 0 28px 28px;
        background: var(--navy);
        color: #F2C766;
        padding: 14px 22px;
        font-size: 13px;
        font-weight: 900;
      }}
      @media (max-width: 720px) {{
        body {{ padding: 14px; }}
        .header {{ grid-template-columns: 1fr; padding: 22px 18px 16px; }}
        .brand {{ text-align: left; font-size: 28px; }}
        .body {{ padding: 18px; }}
        .decision {{ grid-template-columns: 1fr; }}
        .grid {{ grid-template-columns: 1fr; }}
        .actions {{ grid-template-columns: 1fr; }}
        .qr-wrap {{ grid-template-columns: 1fr; }}
        img.qr {{ width: 100%; height: auto; max-width: 240px; }}
      }}
      @media print {{
        .noprint {{ display: none; }}
        body {{ margin: 0; background: #FFFFFF; padding: 0; }}
        .paper {{ box-shadow: none; border: none; border-radius: 0; }}
      }}
    </style>
  </head>
  <body>
    <main class="paper">
      <div class="watermark"></div>
      <header class="header">
        <div>
          <div class="eyebrow">Public Verification Paper</div>
          <h1>TrustSlip Verify</h1>
          <p class="subtitle">
            A public GSN trust check for identity, support, trade, and careful decision-making.
          </p>
        </div>
        <div class="brand">GSN<small>OPEN - TRUST - IMPACT</small></div>
      </header>

      <section class="body">
      <div class="trustmark">
        <span><b>Public / shareable / printable</b></span>
        <span>Protected public check - private details stay inside GSN</span>
      </div>
      <div class="badge {status_class}">{_html(badge_text)}</div>
      <div class="plain">
        <strong>Reader meaning:</strong> {_html(plain_reading)}
        <div class="decision">
          <div>
            <small>Current reader action</small>
            <b>{_html(status_label)}</b>
          </div>
          <div class="decision-code">Code: {_html(code)}</div>
        </div>
        <div class="instruction">
          {_html(action_reading)}
        </div>
      </div>

      <div class="grid">
        <div class="card"><div class="label">Holder</div><div class="value">{_html(display_name)}</div></div>
        <div class="card"><div class="label">GSN ID</div><div class="value">{_html(holder_gmfn_id)}</div></div>
        <div class="card"><div class="label">TrustSlip code</div><div class="value">{_html(code)}</div></div>
        <div class="card"><div class="label">Status</div><div class="value">{_html(status_label)}</div></div>
        <div class="card"><div class="label">Trust-limit signal</div><div class="value">{_html(trust_limit)} {_html(currency)}</div></div>
        <div class="card"><div class="label">Trust band</div><div class="value">{_html(band)}</div></div>
      </div>

      <div style="margin-top:18px;">
        <div class="row"><b>Community</b><span>{_html(community_name)}</span></div>
        <div class="row"><b>Community sponsor signals</b><span>{_html(sponsor_count)}</span></div>
        <div class="row"><b>Phone</b><span>{_html(phone_status)}</span></div>
        <div class="row"><b>Visibility</b><span>{_html(visibility_level)}</span></div>
        <div class="row"><b>Public verify access</b><span>{"Active" if merchant_verify_active else "Public record only"}</span></div>
        <div class="row"><b>Issued</b><span>{_html(issued_text)}</span></div>
        <div class="row"><b>Expires</b><span>{_html(expires_text)}</span></div>
        <div class="row"><b>Not a bank guarantee</b><span>Yes</span></div>
        <div class="row"><b>No auto-debit</b><span>Yes</span></div>
        <div class="row"><b>Not credit approval</b><span>Yes</span></div>
        {cci_row}
        {member_credential_row}
      </div>

      <div class="row muted">
        <b>Checked at</b><span>{_html(verified_text)}</span>
      </div>

      <div class="actions noprint">
        <a class="btn" href="{print_link}">Print / save PDF</a>
        <a class="btn secondary" href="{lite_link}">Lite view</a>
        {member_credential_action}
        <a class="btn warning" href="{holder_refresh_link}">Request current TrustSlip</a>
      </div>

      <div class="qr-wrap noprint">
        <img class="qr" src="{qr_img}" alt="QR code"/>
        <div>
          <div class="label">Public verification QR</div>
          <div class="value" style="font-size:16px;">Scan to check this TrustSlip code again.</div>
          <p class="muted">
            If this page says fresh verification is required, ask the holder to refresh their TrustSlip in GSN and share the new QR or code.
          </p>
        </div>
      </div>

      <div class="muted" style="margin-top:16px;">
        Evidence note: GSN is non-custodial. This page checks TrustSlip public validity only.
        It is not a payment guarantee, not automatic lending, not auto-debit, and not a replacement
        for formal identity, medical, legal, or regulatory checks. It is not permission to release
        goods or money without current context.
      </div>
      </section>
      <div class="footer">GSN Trust Evidence - public evidence first, private details protected, decision left with the reader.</div>
    </main>
  </body>
</html>"""
    return HTMLResponse(content=html, headers=_no_store_headers())


@router.get("/verify/{code}/print", response_class=HTMLResponse)
def trust_slip_verify_print(
    code: str,
    request: Request,
    level: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
) -> HTMLResponse:
    _throttle_public(request, "trustslip_verify_print")
    resp = trust_slip_verify_page(code=code, request=request, level=level, db=db)
    return HTMLResponse(content=resp.body.decode("utf-8"), headers=_no_store_headers())


@router.get("/{code}/share")
def trust_slip_share_bundle(
    code: str,
    level: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    if getattr(current_user, "id", None) is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    aligned = _aligned_snapshot_for_slip(
        db,
        slip=slip,
        requested_level=level,
    )

    holder = aligned["holder"]
    merchant_view = aligned["merchant_view"]
    visibility_level = aligned["visibility_level"]
    full_summary = aligned["full_summary"]

    if not _can_manage_trust_slip(
        current_user=current_user,
        holder=holder,
        slip=slip,
    ):
        raise HTTPException(
            status_code=403,
            detail="Only the TrustSlip holder or an admin can open this share bundle.",
        )

    merchant_verify_active = _merchant_verify_active_for_holder(
        db,
        holder=holder,
    )
    if not merchant_verify_active:
        raise HTTPException(
            status_code=403,
            detail="Merchant verification subscription is not active for this TrustSlip holder.",
        )

    effective = _status_effective(
        getattr(slip, "status", "") or "",
        getattr(slip, "expires_at", None),
        merchant_verify_active=merchant_verify_active,
    )
    msg, _ = _merchant_badge(effective)

    merchant_summary = merchant_view.get("merchant_summary") or {}
    verify_page = _verify_page_url(code, visibility_level)
    holder_gmfn_id = merchant_summary.get("gmfn_id") or getattr(holder, "gmfn_id", None)
    member_credential_page = _member_credential_page_for_holder(
        db,
        clan=db.get(Clan, int(getattr(slip, "clan_id", 0) or 0)),
        holder=holder,
    )
    trust_limit = merchant_summary.get("trust_limit") or full_summary.get("trust_limit")
    currency = merchant_summary.get("currency") or full_summary.get("currency")
    expires_text = _display_datetime(
        merchant_summary.get("expires_at") or full_summary.get("expires_at"),
        "No expiry",
    )

    whatsapp_lines = [
        "Please verify TrustSlip before making a trade decision:",
        verify_page,
        f"Code: {code}",
        f"GSN ID: {holder_gmfn_id or 'N/A'}",
        f"Visibility: {visibility_level}",
        f"Trust-limit signal: {trust_limit} {currency}",
        f"Expires: {expires_text}",
        f"Status: {msg}",
        "Evidence only - not approval to release goods, credit, or money.",
    ]
    if member_credential_page:
        whatsapp_lines.append(f"Member credential: {member_credential_page}")
    whatsapp_text = "\n".join(whatsapp_lines)

    sms_text = (
        f"Verify TrustSlip: {verify_page} | Code: {code} | GSN ID: {holder_gmfn_id or 'N/A'} | "
        f"Visibility: {visibility_level} | Trust-limit signal: {trust_limit} {currency} | Expires: {expires_text} | "
        "Evidence only, not release approval"
    )
    if member_credential_page:
        sms_text = f"{sms_text} | Member credential: {member_credential_page}"

    return {
        "code": code,
        "gmfn_id": holder_gmfn_id,
        "merchant_visibility_level": visibility_level,
        "merchant_verify_active": bool(merchant_verify_active),
        "verify_page": verify_page,
        "lite_page": _lite_page_url(code, visibility_level),
        "member_credential_page": member_credential_page or None,
        "expires_at": expires_text,
        "merchant_message": msg,
        "merchant_view": merchant_view,
        "whatsapp_text": whatsapp_text,
        "sms_text": sms_text,
        "note": "WhatsApp-first: copy and paste whatsapp_text. If network drops, merchant can screenshot the verify page.",
    }


@router.post("/{code}/release", response_model=Dict[str, Any])
def record_trust_slip_release(
    code: str,
    payload: TrustSlipReleaseIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    holder = _slip_holder(db, slip)

    now = _now_utc()
    slip.last_release_at = now
    db.add(slip)

    log_trust_event(
        db,
        event_type="trust_slip.release_logged",
        clan_id=int(getattr(slip, "clan_id", 0) or 0),
        actor_user_id=int(current_user.id),
        subject_user_id=_slip_subject_user_id(slip),
        loan_id=None,
        guarantor_id=None,
        meta={
            "supplier_name": payload.supplier_name,
            "supplier_phone": payload.supplier_phone,
            "amount_released": str(payload.amount_released) if payload.amount_released is not None else None,
            "note": payload.note,
            "verify_page": _verify_page_url(slip.code),
            "code": slip.code,
            "gmfn_id": getattr(holder, "gmfn_id", None) if holder else None,
        },
        commit=False,
        refresh=False,
    )

    db.commit()
    db.refresh(slip)

    return {
        "ok": True,
        "code": slip.code,
        "gmfn_id": getattr(holder, "gmfn_id", None) if holder else None,
        "status": getattr(slip, "status", None),
        "last_release_at": slip.last_release_at.isoformat() if slip.last_release_at else None,
        "event_type": "trust_slip.release_logged",
        "verify_page": _verify_page_url(slip.code),
    }


@router.get("/{code}/release/page", response_class=HTMLResponse)
def trust_slip_release_page(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HTMLResponse:
    _require_admin(current_user)

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    holder = _slip_holder(db, slip)
    holder_gmfn_id = getattr(holder, "gmfn_id", None) if holder else "N/A"

    html = f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>Log TrustSlip Release</title>
    <style>
      body {{ font-family: Arial, sans-serif; margin: 18px; }}
      .box {{ border:1px solid #ddd; border-radius:12px; padding:16px; max-width:720px; }}
      .btn {{ display:inline-block; padding:10px 12px; border-radius:10px; background:#111; color:#fff; text-decoration:none; margin-top:12px; }}
      .muted {{ color:#666; font-size:13px; }}
      pre {{ background:#f4f4f4; padding:10px; border-radius:10px; overflow:auto; }}
    </style>
  </head>
  <body>
    <div class="box">
      <h3>Log Release (Admin)</h3>
      <div class="muted">TrustSlip code: <b>{code}</b></div>
      <div class="muted">GSN ID: <b>{holder_gmfn_id}</b></div>
      <div class="muted">This is admin-only. It does not collect payments.</div>

      <p class="muted">Use Swagger to submit the actual release:</p>
      <div class="muted"><code>POST /trust-slips/{code}/release</code></div>

      <p class="muted" style="margin-top:12px;">Suggested JSON body:</p>
      <pre>{{
  "supplier_name": "Merchant name",
  "supplier_phone": "080...",
  "amount_released": "15000.00",
  "note": "Goods released"
}}</pre>

      <a class="btn" href="/docs">Open Swagger</a>
      <a class="btn" style="background:#444;" href="/trust-slips/verify/{code}/page">Back to Verify</a>
    </div>
  </body>
</html>"""
    return HTMLResponse(content=html, headers=_no_store_headers())


@router.post("/{code}/revoke")
def revoke_trust_slip(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)
    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    holder = _slip_holder(db, slip)

    slip.status = "revoked"
    db.add(slip)
    log_trust_event(
        db,
        event_type="trust_slip.revoked",
        clan_id=int(getattr(slip, "clan_id", 0) or 0),
        actor_user_id=int(current_user.id),
        subject_user_id=_slip_subject_user_id(slip),
        loan_id=None,
        guarantor_id=None,
        meta={"code": slip.code, "gmfn_id": getattr(holder, "gmfn_id", None) if holder else None},
        commit=False,
        refresh=False,
    )

    db.commit()
    db.refresh(slip)
    return {
        "ok": True,
        "code": slip.code,
        "gmfn_id": getattr(holder, "gmfn_id", None) if holder else None,
        "status": slip.status,
    }


@router.post("/{code}/freeze")
def freeze_trust_slip(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)
    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    holder = _slip_holder(db, slip)

    slip.status = "frozen"
    db.add(slip)
    log_trust_event(
        db,
        event_type="trust_slip.frozen",
        clan_id=int(getattr(slip, "clan_id", 0) or 0),
        actor_user_id=int(current_user.id),
        subject_user_id=_slip_subject_user_id(slip),
        loan_id=None,
        guarantor_id=None,
        meta={"code": slip.code, "gmfn_id": getattr(holder, "gmfn_id", None) if holder else None},
        commit=False,
        refresh=False,
    )

    db.commit()
    db.refresh(slip)
    return {
        "ok": True,
        "code": slip.code,
        "gmfn_id": getattr(holder, "gmfn_id", None) if holder else None,
        "status": slip.status,
    }


@router.post("/{code}/unfreeze")
def unfreeze_trust_slip(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)
    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    holder = _slip_holder(db, slip)

    slip.status = "active"
    db.add(slip)
    log_trust_event(
        db,
        event_type="trust_slip.unfrozen",
        clan_id=int(getattr(slip, "clan_id", 0) or 0),
        actor_user_id=int(current_user.id),
        subject_user_id=_slip_subject_user_id(slip),
        loan_id=None,
        guarantor_id=None,
        meta={"code": slip.code, "gmfn_id": getattr(holder, "gmfn_id", None) if holder else None},
        commit=False,
        refresh=False,
    )

    db.commit()
    db.refresh(slip)
    return {
        "ok": True,
        "code": slip.code,
        "gmfn_id": getattr(holder, "gmfn_id", None) if holder else None,
        "status": slip.status,
    }


@router.post("/{code}/extend")
def extend_trust_slip_expiry(
    code: str,
    payload: TrustSlipExtendIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)
    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    holder = _slip_holder(db, slip)

    now = _now_utc()
    days = int(payload.days or 7)
    slip.expires_at = now + timedelta(days=days)
    db.add(slip)

    log_trust_event(
        db,
        event_type="trust_slip.extended",
        clan_id=int(getattr(slip, "clan_id", 0) or 0),
        actor_user_id=int(current_user.id),
        subject_user_id=_slip_subject_user_id(slip),
        loan_id=None,
        guarantor_id=None,
        meta={
            "code": slip.code,
            "days": days,
            "gmfn_id": getattr(holder, "gmfn_id", None) if holder else None,
            "expires_at": slip.expires_at.isoformat() if slip.expires_at else None,
        },
        commit=False,
        refresh=False,
    )

    db.commit()
    db.refresh(slip)
    return {
        "ok": True,
        "code": slip.code,
        "gmfn_id": getattr(holder, "gmfn_id", None) if holder else None,
        "status": slip.status,
        "expires_at": slip.expires_at.isoformat() if slip.expires_at else None,
    }


@router.get("/{user_id}")
def get_user_trust_slip_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)

    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    payload = _payload_with_identity(db, user_id=int(user_id))
    holder = db.get(User, int(user_id))
    merchant_verify_active = _merchant_verify_active_for_holder(
        db,
        holder=holder,
    )

    return {
        **payload,
        "merchant_verify_active": bool(merchant_verify_active),
        "merchant_verify_subscription_required": not bool(merchant_verify_active),
    }
