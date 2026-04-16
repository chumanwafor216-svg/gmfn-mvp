from __future__ import annotations

import io
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.rate_limit import client_ip, rate_limiter
from app.db.database import get_db
from app.db.models import MarketplaceShop, TrustSlip, User
from app.services.feature_entitlements_service import has_active_feature
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


def _safe_visibility_level(user: Optional[User], requested_level: Optional[str]) -> str:
    raw = requested_level or getattr(user, "merchant_visibility_level", "standard") or "standard"
    level = str(raw).strip().lower()
    if level not in {"minimal", "standard", "detailed"}:
        return "standard"
    return level


def _verify_page_url(code: str, level: Optional[str] = None) -> str:
    base = f"/trust-slips/verify/{code}/page"
    if level in {"minimal", "standard", "detailed"}:
        return f"{base}?level={level}"
    return base


def _lite_page_url(code: str, level: Optional[str] = None) -> str:
    base = f"/trust-slips/verify/{code}/lite"
    if level in {"minimal", "standard", "detailed"}:
        return f"{base}?level={level}"
    return base


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


def _merchant_badge(effective_status: str) -> tuple[str, str]:
    if effective_status == "active":
        return ("VALID — OK TO RELEASE GOODS", "#0a7")
    if effective_status == "merchant_verify_inactive":
        return ("MERCHANT VERIFY INACTIVE — DO NOT RELEASE", "#b00")
    if effective_status == "expired":
        return ("EXPIRED — DO NOT RELEASE", "#b00")
    if effective_status == "revoked":
        return ("REVOKED — DO NOT RELEASE", "#b00")
    if effective_status == "frozen":
        return ("FROZEN — CONTACT ADMIN", "#b00")
    return ("NOT VALID — DO NOT RELEASE", "#b00")


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
    effective_level = _safe_visibility_level(holder, requested_level or stored_level)

    if requested_level and effective_level != stored_level:
        merchant_view = build_trust_slip_visibility_view(
            dict(snapshot.get("full_summary") or full_payload),
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
        "full_summary": dict(snapshot.get("full_summary") or full_payload),
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
        return {
            "ok": True,
            "active": False,
            "reason": "phone_unverified",
            "detail": "Verify your phone number to activate TrustSlip portability.",
            "gmfn_id": getattr(current_user, "gmfn_id", None),
            "merchant_verify_active": False,
            "merchant_verify_subscription_required": True,
        }

    current = get_current_trust_slip_for_user(db, user_id=int(current_user.id))
    if not current:
        try:
            issue_result = issue_trust_slip_for_user(db, user_id=int(current_user.id))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

        code = issue_result.get("code")
        if bool(issue_result.get("issued")):
            log_trust_event(
                db,
                event_type="trust_slip.issued",
                clan_id=0,
                actor_user_id=int(current_user.id),
                subject_user_id=int(current_user.id),
                loan_id=None,
                guarantor_id=None,
                meta={
                    "reason": issue_result.get("reason"),
                    "trust_slip_id": issue_result.get("trust_slip_id"),
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
    if slip:
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

    display_name = (
        merchant_view.get("display_name")
        or merchant_summary.get("display_name")
        or gmfn_id
        or _mask_email(getattr(holder, "email", None))
        or "Member"
    )

    community = (
        merchant_view.get("community")
        or merchant_summary.get("community")
        or merchant_summary.get("clan_name")
        or full_summary.get("clan_name")
        or full_summary.get("community")
        or "—"
    )

    band = (
        merchant_view.get("band")
        or merchant_summary.get("band")
        or full_summary.get("trust_band")
        or full_summary.get("band")
        or "—"
    )

    merchant_view_out = {
        **merchant_view,
        "display_name": display_name,
        "gmfn_id": gmfn_id,
        "community": community,
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

    return {
        "code": slip.code,
        "token": slip.code,
        "verification_token": slip.code,
        "verification_code": slip.code,
        "public_verify_url": _verify_page_url(slip.code, visibility_level),
        "status": getattr(slip, "status", None),
        "effective_status": effective,
        "merchant_verify_active": bool(merchant_verify_active),
        "merchant_verify_subscription_required": not bool(merchant_verify_active),
        "merchant_message": badge_text,
        "created_at": created_at_value,
        "issued_at": created_at_value,
        "expires_at": expires_at,
        "trust_limit": trust_limit,
        "trust_slip_limit": trust_limit,
        "currency": currency,
        "last_release_at": last_release_at_value,
        "holder_email_masked": _mask_email(getattr(holder, "email", None)),
        "holder_gmfn_id": gmfn_id,
        "verify_page": _verify_page_url(slip.code, visibility_level),
        "lite_page": _lite_page_url(slip.code, visibility_level),
        "verified_at": _now_utc().isoformat(),
        "offline_note": "If network drops, screenshot this page. Use the code to re-verify later.",
        "pilot_note": "GMFN is non-custodial in MVP. This verifies TrustSlip validity only.",
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

    text = (
        f"TrustSlip verify: {verify_page}  Code: {code}  "
        f"GMFN ID: {holder_gmfn_id or 'N/A'}  Visibility: {visibility_level}  Status: {msg}"
    )

    return {
        "code": code,
        "verify_page": verify_page,
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
    expires_text = _safe_str(merchant_summary.get("expires_at") or full_summary.get("expires_at"), "No expiry")

    html = f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>TrustSlip Verify</title>
    <style>
      body {{ font-family: Arial, sans-serif; margin: 14px; }}
      .badge {{ padding: 12px; border-radius: 10px; background: {color}; color: #fff; font-weight: 800; text-align:center; }}
      .row {{ margin-top: 10px; font-size: 18px; }}
      .muted {{ margin-top: 12px; font-size: 13px; color: #666; }}
      code {{ background:#f4f4f4; padding:2px 6px; border-radius:6px; }}
    </style>
  </head>
  <body>
    <div class="badge">{msg}</div>
    <div class="row"><b>Trust Limit:</b> {trust_limit} {currency}</div>
    <div class="row"><b>Code:</b> <code>{code}</code></div>
    <div class="row"><b>GMFN ID:</b> <code>{holder_gmfn_id}</code></div>
    <div class="row"><b>Visibility:</b> {visibility_level}</div>
    <div class="row"><b>Expires:</b> {expires_text}</div>
    <div class="muted">Verified at: {_now_utc().isoformat()} (UTC)</div>
    <div class="muted">If network drops, screenshot this page.</div>
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

    merchant_summary = merchant_view.get("merchant_summary") or {}
    trust_limit = _safe_str(merchant_summary.get("trust_limit") or full_summary.get("trust_limit"))
    currency = _safe_str(merchant_summary.get("currency") or full_summary.get("currency"))
    holder_gmfn_id = _safe_str(merchant_summary.get("gmfn_id") or getattr(holder, "gmfn_id", None), "Hidden")
    expires_text = _safe_str(merchant_summary.get("expires_at") or full_summary.get("expires_at"), "No expiry")

    cci_row = ""
    if merchant_summary.get("cci_score") not in (None, "", "—"):
        cci_band = _safe_str(merchant_summary.get("cci_band"), "")
        band_part = f" (Band {cci_band})" if cci_band else ""
        cci_row = f'<div class="row"><b>CCI:</b> {_safe_str(merchant_summary.get("cci_score"))}{band_part}</div>'

    print_link = f"/trust-slips/verify/{code}/print?level={visibility_level}"
    lite_link = _lite_page_url(code, visibility_level)
    qr_img = f"/trust-slips/verify/{code}/qr.png?level={visibility_level}"
    release_link = f"/trust-slips/{code}/release/page"

    html = f"""<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1"/>
    <title>TrustSlip Verification</title>
    <style>
      body {{
        font-family: Arial, sans-serif;
        margin: 18px;
        background: #ffffff;
        color: #111;
      }}
      .box {{
        border: 1px solid #ddd;
        border-radius: 12px;
        padding: 16px;
        max-width: 760px;
      }}
      .badge {{
        font-size: 18px;
        font-weight: 800;
        padding: 12px;
        border-radius: 10px;
        color: white;
        text-align: center;
        background: {badge_color};
        margin-bottom: 14px;
      }}
      .row {{ margin: 10px 0; }}
      .big {{ font-size: 18px; }}
      .muted {{ font-size: 13px; color: #666; }}
      .btn {{
        display: inline-block;
        padding: 10px 12px;
        border-radius: 10px;
        background: #111;
        color: #fff;
        text-decoration: none;
        margin-right: 8px;
        margin-top: 8px;
      }}
      .btn.secondary {{ background: #444; }}
      img.qr {{ width: 180px; height: 180px; border: 1px solid #eee; border-radius: 8px; }}
      @media print {{
        .noprint {{ display: none; }}
        body {{ margin: 0; }}
        .box {{ border: none; }}
      }}
    </style>
  </head>
  <body>
    <div class="box">
      <div class="badge">{badge_text}</div>

      <div class="row big"><b>Trust Limit:</b> {trust_limit} {currency}</div>
      <div class="row big"><b>Code:</b> {code}</div>
      <div class="row"><b>GMFN ID:</b> {holder_gmfn_id}</div>
      <div class="row"><b>Visibility:</b> {visibility_level}</div>
      <div class="row"><b>Status:</b> {effective}</div>
      <div class="row"><b>Merchant Verify:</b> {"Active" if merchant_verify_active else "Inactive"}</div>
      <div class="row"><b>Expires:</b> {expires_text}</div>
      <div class="row"><b>Holder:</b> {_mask_email(getattr(holder, "email", None)) or "Hidden"}</div>
      {cci_row}

      <div class="row muted">
        Verified at: {_now_utc().isoformat()} (UTC)
      </div>

      <div class="row noprint">
        <a class="btn secondary" href="{print_link}">Print / Save PDF</a>
        <a class="btn secondary" href="{lite_link}">Lite View</a>
        <a class="btn" href="{release_link}">Log Release (Admin)</a>
      </div>

      <div class="row noprint" style="margin-top:14px;">
        <div class="muted">QR (optional):</div>
        <img class="qr" src="{qr_img}" alt="QR code"/>
        <div class="muted" style="margin-top:6px;">
          If QR fails, your server may not have qrcode installed. The link still works.
        </div>
      </div>

      <div class="row muted" style="margin-top:16px;">
        Offline tip: Screenshot this page if network drops.
      </div>

      <div class="row muted" style="margin-top:6px;">
        Pilot note: GMFN is non-custodial in MVP. This page verifies TrustSlip validity only.
      </div>
    </div>
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
    trust_limit = merchant_summary.get("trust_limit") or full_summary.get("trust_limit")
    currency = merchant_summary.get("currency") or full_summary.get("currency")
    expires_text = merchant_summary.get("expires_at") or full_summary.get("expires_at")

    whatsapp_lines = [
        "Please verify TrustSlip before releasing goods:",
        verify_page,
        f"Code: {code}",
        f"GMFN ID: {holder_gmfn_id or 'N/A'}",
        f"Visibility: {visibility_level}",
        f"Trust Limit: {trust_limit} {currency}",
        f"Expires: {expires_text}",
        f"Status: {msg}",
    ]
    whatsapp_text = "\n".join(whatsapp_lines)

    sms_text = (
        f"Verify TrustSlip: {verify_page} | Code: {code} | GMFN ID: {holder_gmfn_id or 'N/A'} | "
        f"Visibility: {visibility_level} | Limit: {trust_limit} {currency} | Expires: {expires_text}"
    )

    return {
        "code": code,
        "gmfn_id": holder_gmfn_id,
        "merchant_visibility_level": visibility_level,
        "merchant_verify_active": bool(merchant_verify_active),
        "verify_page": verify_page,
        "lite_page": _lite_page_url(code, visibility_level),
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
      <div class="muted">GMFN ID: <b>{holder_gmfn_id}</b></div>
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