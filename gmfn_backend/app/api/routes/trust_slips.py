# app/api/routes/trust_slips.py
from __future__ import annotations

import io
import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.rate_limit import client_ip, rate_limiter
from app.db.database import get_db
from app.db.models import TrustEvent, TrustSlip, User
from app.services.trust_slips_services import get_trust_slip_payload

try:
    import qrcode  # type: ignore
except Exception:
    qrcode = None


router = APIRouter(prefix="/trust-slips", tags=["trust-slips"])


# ----------------------------
# Admin helpers
# ----------------------------
def _is_admin(user: Any) -> bool:
    if user is None:
        return False
    role = str(getattr(user, "role", "") or "").lower()
    return role == "admin"


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


def _no_store_headers() -> Dict[str, str]:
    # Low-end devices + privacy: discourage caching of verification pages.
    return {
        "Cache-Control": "no-store, max-age=0",
        "Pragma": "no-cache",
    }


def _throttle_public(request: Request, route_name: str) -> None:
    """
    MVP public throttle: 30 requests / 60 seconds per IP per route.
    """
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


def _verify_page_url(code: str) -> str:
    return f"/trust-slips/verify/{code}/page"


def _lite_page_url(code: str) -> str:
    return f"/trust-slips/verify/{code}/lite"


def _qr_png_bytes(url: str) -> bytes:
    if qrcode is None:
        raise HTTPException(status_code=501, detail="QR requires 'qrcode[pil]' (pip install qrcode[pil])")
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _is_expired(expires_at: Optional[datetime]) -> bool:
    exp = _to_aware(expires_at)
    if exp is None:
        return False
    return exp < _now_utc()


def _status_effective(status: str, expires_at: Optional[datetime]) -> str:
    """
    Merchant enforcement: VALID only if active and not expired.
    """
    s = (status or "").lower().strip()
    if _is_expired(expires_at):
        return "expired"
    if s in {"revoked", "frozen"}:
        return s
    if s == "active":
        return "active"
    return "invalid"


def _merchant_badge(effective_status: str) -> tuple[str, str]:
    if effective_status == "active":
        return ("VALID — OK TO RELEASE GOODS", "#0a7")
    if effective_status == "expired":
        return ("EXPIRED — DO NOT RELEASE", "#b00")
    if effective_status == "revoked":
        return ("REVOKED — DO NOT RELEASE", "#b00")
    if effective_status == "frozen":
        return ("FROZEN — CONTACT ADMIN", "#b00")
    return ("NOT VALID — DO NOT RELEASE", "#b00")


def _log_trust_event(
    db: Session,
    *,
    event_type: str,
    clan_id: Optional[int],
    actor_user_id: int,
    subject_user_id: int,
    meta: Dict[str, Any],
) -> TrustEvent:
    te = TrustEvent(
        event_type=event_type,
        clan_id=int(clan_id) if clan_id is not None else None,
        loan_id=None,
        guarantor_id=None,
        actor_user_id=int(actor_user_id),
        subject_user_id=int(subject_user_id),
        meta_json=json.dumps(meta) if meta else None,
        created_at=_now_utc(),
    )
    db.add(te)
    return te


# ----------------------------
# Schemas
# ----------------------------
class TrustSlipReleaseIn(BaseModel):
    supplier_name: Optional[str] = None
    supplier_phone: Optional[str] = None
    amount_released: Optional[Decimal] = Field(default=None, gt=Decimal("0"))
    note: Optional[str] = None


class TrustSlipExtendIn(BaseModel):
    days: int = Field(default=7, ge=1, le=365)


# ----------------------------
# Basic routes
# ----------------------------
@router.get("/ping")
def ping() -> Dict[str, Any]:
    return {"ok": True, "service": "trust-slips"}


@router.get("/me")
def get_my_trust_slip(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    if getattr(current_user, "id", None) is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return get_trust_slip_payload(db, user_id=int(current_user.id))


@router.get("/me/summary")
def get_my_trust_slip_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    if getattr(current_user, "id", None) is None:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return get_trust_slip_payload(db, user_id=int(current_user.id))


# ----------------------------
# Public verify JSON (rate-limited)
# IMPORTANT: must be above /{code}/... and /{user_id}
# ----------------------------
@router.get("/verify/{code}")
def verify_trust_slip_public(
    code: str,
    request: Request,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _throttle_public(request, "trustslip_verify_json")

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    holder = db.get(User, int(slip.holder_user_id)) if getattr(slip, "holder_user_id", None) else None
    effective = _status_effective(getattr(slip, "status", "") or "", getattr(slip, "expires_at", None))
    badge_text, _ = _merchant_badge(effective)
    exp = _to_aware(getattr(slip, "expires_at", None))

    return {
        "code": slip.code,
        "status": getattr(slip, "status", None),
        "effective_status": effective,
        "merchant_message": badge_text,
        "trust_limit": str(getattr(slip, "trust_limit", "0")),
        "currency": getattr(slip, "currency", None),
        "expires_at": exp.isoformat() if exp else None,
        "last_release_at": getattr(slip, "last_release_at", None).isoformat() if getattr(slip, "last_release_at", None) else None,
        "holder_email_masked": _mask_email(getattr(holder, "email", None)),
        "verify_page": _verify_page_url(slip.code),
        "lite_page": _lite_page_url(slip.code),
        "verified_at": _now_utc().isoformat(),
        "offline_note": "If network drops, screenshot this page. Use the code to re-verify later.",
        "pilot_note": "GMFN is non-custodial in MVP. This verifies TrustSlip validity only.",
    }


# ----------------------------
# B-min: Public share text (copy/paste)
# ----------------------------
@router.get("/verify/{code}/share-text")
def trust_slip_share_text_public(
    code: str,
    request: Request,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _throttle_public(request, "trustslip_share_text")

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    effective = _status_effective(getattr(slip, "status", "") or "", getattr(slip, "expires_at", None))
    msg, _ = _merchant_badge(effective)

    verify_page = _verify_page_url(code)
    text = f"TrustSlip verify: {verify_page}  Code: {code}  Status: {msg}"

    return {
        "code": code,
        "verify_page": verify_page,
        "text": text,
        "offline_note": "If link fails, open /trust-slips/verify/{code} or show this message to an admin.",
    }


# ----------------------------
# B-min: Ultra-light HTML (no images)
# ----------------------------
@router.get("/verify/{code}/lite", response_class=HTMLResponse)
def trust_slip_verify_lite_page(
    code: str,
    request: Request,
    db: Session = Depends(get_db),
) -> HTMLResponse:
    _throttle_public(request, "trustslip_verify_lite")

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    effective = _status_effective(getattr(slip, "status", "") or "", getattr(slip, "expires_at", None))
    msg, color = _merchant_badge(effective)

    exp = _to_aware(getattr(slip, "expires_at", None))
    expires_text = exp.isoformat() if exp else "No expiry"

    trust_limit = str(getattr(slip, "trust_limit", "0"))
    currency = getattr(slip, "currency", "") or ""

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
    <div class="row"><b>Expires:</b> {expires_text}</div>
    <div class="muted">Verified at: {_now_utc().isoformat()} (UTC)</div>
    <div class="muted">If network drops, screenshot this page.</div>
  </body>
</html>"""
    return HTMLResponse(content=html, headers=_no_store_headers())


# ----------------------------
# QR endpoint (PNG)
# ----------------------------
@router.get("/verify/{code}/qr.png")
def trust_slip_verify_qr_png(code: str, request: Request, db: Session = Depends(get_db)) -> Response:
    _throttle_public(request, "trustslip_verify_qr")

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    png = _qr_png_bytes(_verify_page_url(slip.code))
    return Response(content=png, media_type="image/png", headers=_no_store_headers())


# ----------------------------
# Merchant HTML verify page + Print view (rate-limited)
# ----------------------------
@router.get("/verify/{code}/page", response_class=HTMLResponse)
def trust_slip_verify_page(code: str, request: Request, db: Session = Depends(get_db)) -> HTMLResponse:
    _throttle_public(request, "trustslip_verify_page")

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    holder = db.get(User, int(slip.holder_user_id)) if getattr(slip, "holder_user_id", None) else None

    effective = _status_effective(getattr(slip, "status", "") or "", getattr(slip, "expires_at", None))
    badge_text, badge_color = _merchant_badge(effective)

    now = _now_utc()
    exp = _to_aware(getattr(slip, "expires_at", None))
    expires_text = exp.isoformat() if exp else "No expiry"

    trust_limit = str(getattr(slip, "trust_limit", "0"))
    currency = getattr(slip, "currency", "") or ""

    release_link = f"/trust-slips/{code}/release/page"
    print_link = f"/trust-slips/verify/{code}/print"
    qr_img = f"/trust-slips/verify/{code}/qr.png"
    lite_link = _lite_page_url(code)

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
        max-width: 720px;
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
      <div class="row"><b>Status:</b> {getattr(slip, "status", "")}</div>
      <div class="row"><b>Expires:</b> {expires_text}</div>
      <div class="row"><b>Holder:</b> {_mask_email(getattr(holder, "email", None)) or "Hidden"}</div>

      <div class="row muted">
        Verified at: {now.isoformat()} (UTC)
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
def trust_slip_verify_print(code: str, request: Request, db: Session = Depends(get_db)) -> HTMLResponse:
    _throttle_public(request, "trustslip_verify_print")
    resp = trust_slip_verify_page(code=code, request=request, db=db)
    return HTMLResponse(content=resp.body.decode("utf-8"), headers=_no_store_headers())


# ----------------------------
# B-min: Authenticated share bundle (WhatsApp/SMS)
# ----------------------------
@router.get("/{code}/share")
def trust_slip_share_bundle(
    code: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Authenticated share bundle for borrower/admin.
    Copy/paste friendly for WhatsApp/SMS.
    """
    if getattr(current_user, "id", None) is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="TrustSlip not found")

    effective = _status_effective(getattr(slip, "status", "") or "", getattr(slip, "expires_at", None))
    msg, _ = _merchant_badge(effective)

    exp = _to_aware(getattr(slip, "expires_at", None))
    expires_text = exp.isoformat() if exp else "No expiry"

    trust_limit = str(getattr(slip, "trust_limit", "0"))
    currency = getattr(slip, "currency", "") or ""
    verify_page = _verify_page_url(code)

    whatsapp_text = (
        f"Please verify TrustSlip before releasing goods:\n"
        f"{verify_page}\n"
        f"Code: {code}\n"
        f"Trust Limit: {trust_limit} {currency}\n"
        f"Expires: {expires_text}\n"
        f"Status: {msg}"
    )
    sms_text = f"Verify TrustSlip: {verify_page} | Code: {code} | Limit: {trust_limit} {currency} | Expires: {expires_text}"

    return {
        "code": code,
        "verify_page": verify_page,
        "lite_page": _lite_page_url(code),
        "expires_at": expires_text,
        "merchant_message": msg,
        "whatsapp_text": whatsapp_text,
        "sms_text": sms_text,
        "note": "WhatsApp-first: copy and paste whatsapp_text. If network drops, merchant can screenshot the verify page.",
    }


# ----------------------------
# Admin-only release logging (JSON) + TrustEvent
# ----------------------------
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

    now = _now_utc()
    slip.last_release_at = now
    db.add(slip)

    meta = {
        "supplier_name": payload.supplier_name,
        "supplier_phone": payload.supplier_phone,
        "amount_released": str(payload.amount_released) if payload.amount_released is not None else None,
        "note": payload.note,
        "verify_page": _verify_page_url(slip.code),
    }

    te = _log_trust_event(
        db,
        event_type="trust_slip.release_logged",
        clan_id=getattr(slip, "clan_id", None),
        actor_user_id=int(current_user.id),
        subject_user_id=int(getattr(slip, "holder_user_id")),
        meta=meta,
    )
    db.add(te)

    db.commit()
    db.refresh(slip)

    return {
        "ok": True,
        "code": slip.code,
        "status": getattr(slip, "status", None),
        "last_release_at": slip.last_release_at.isoformat() if slip.last_release_at else None,
        "event_type": te.event_type,
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


# ----------------------------
# Lifecycle controls (admin-only) + TrustEvent
# ----------------------------
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

    slip.status = "revoked"
    db.add(slip)
    te = _log_trust_event(
        db,
        event_type="trust_slip.revoked",
        clan_id=getattr(slip, "clan_id", None),
        actor_user_id=int(current_user.id),
        subject_user_id=int(getattr(slip, "holder_user_id")),
        meta={"code": slip.code},
    )
    db.add(te)

    db.commit()
    db.refresh(slip)
    return {"ok": True, "code": slip.code, "status": slip.status}


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

    slip.status = "frozen"
    db.add(slip)
    te = _log_trust_event(
        db,
        event_type="trust_slip.frozen",
        clan_id=getattr(slip, "clan_id", None),
        actor_user_id=int(current_user.id),
        subject_user_id=int(getattr(slip, "holder_user_id")),
        meta={"code": slip.code},
    )
    db.add(te)

    db.commit()
    db.refresh(slip)
    return {"ok": True, "code": slip.code, "status": slip.status}


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

    slip.status = "active"
    db.add(slip)
    te = _log_trust_event(
        db,
        event_type="trust_slip.unfrozen",
        clan_id=getattr(slip, "clan_id", None),
        actor_user_id=int(current_user.id),
        subject_user_id=int(getattr(slip, "holder_user_id")),
        meta={"code": slip.code},
    )
    db.add(te)

    db.commit()
    db.refresh(slip)
    return {"ok": True, "code": slip.code, "status": slip.status}


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

    now = _now_utc()
    days = int(payload.days or 7)
    slip.expires_at = now + timedelta(days=days)
    db.add(slip)

    te = _log_trust_event(
        db,
        event_type="trust_slip.extended",
        clan_id=getattr(slip, "clan_id", None),
        actor_user_id=int(current_user.id),
        subject_user_id=int(getattr(slip, "holder_user_id")),
        meta={"code": slip.code, "days": days, "expires_at": slip.expires_at.isoformat() if slip.expires_at else None},
    )
    db.add(te)

    db.commit()
    db.refresh(slip)
    return {"ok": True, "code": slip.code, "status": slip.status, "expires_at": slip.expires_at.isoformat() if slip.expires_at else None}


# ----------------------------
# Admin-only: view any user's TrustSlip
# KEEP THIS LAST (route conflict safety)
# ----------------------------
@router.get("/{user_id}")
def get_user_trust_slip_admin(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_admin(current_user)

    if user_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    return get_trust_slip_payload(db, user_id=int(user_id))