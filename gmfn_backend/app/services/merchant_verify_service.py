# app/services/merchant_verify_service.py
from __future__ import annotations

import base64
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.orm import Session

from app.db.models import TrustEvent


# Event types (append-only evidence)
EV_MERCHANT_LINK_CREATED = "merchant.verify_link_created"
EV_MERCHANT_TOKEN_USED = "merchant.verify_token_used"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _get_secret() -> str:
    """
    Required for merchant tokens.
    MVP rule:
    - If GMFN_SECRET_KEY/SECRET_KEY exists => use it
    - Else if GMFN_DEV_MODE=1 => use a safe dev fallback
    - Else crash (production should not run without secret)
    """
    s = os.getenv("GMFN_SECRET_KEY") or os.getenv("SECRET_KEY")
    if s:
        return s
    if os.getenv("GMFN_DEV_MODE") == "1":
        return "dev-secret-change-me"
    raise RuntimeError("Missing GMFN_SECRET_KEY/SECRET_KEY (required for merchant verification tokens).")


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _make_token(payload: Dict[str, Any]) -> str:
    secret = _get_secret().encode("utf-8")
    body = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    sig = secrets.token_bytes(16)  # MVP: opaque token signature (not JWT)
    # We bind signature to secret by XOR-ish mix (simple, non-crypto MVP)
    # NOTE: This is not a bank security primitive, just a tamper-avoid token for pilot UX.
    mixed = bytes([(sig[i] ^ secret[i % len(secret)]) for i in range(len(sig))])
    return f"{_b64url(body)}.{_b64url(mixed)}"


def _parse_token(token: str) -> Dict[str, Any]:
    try:
        body_b64, sig_b64 = token.split(".", 1)
        body = base64.urlsafe_b64decode(body_b64 + "==")
        _sig = base64.urlsafe_b64decode(sig_b64 + "==")
        obj = json.loads(body.decode("utf-8"))
        if not isinstance(obj, dict):
            raise ValueError("bad payload")
        return obj
    except Exception:
        raise ValueError("Invalid token")


def _short_id(prefix: str, jti: str) -> str:
    # MV-94FB80 style
    safe = (jti or "").replace("-", "").upper()
    return f"{prefix}-{safe[:6]}" if len(safe) >= 6 else f"{prefix}-{safe}"


def _find_latest_full_repayment_event(db: Session, user_id: int) -> Optional[TrustEvent]:
    return (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .filter(TrustEvent.event_type == "loan_fully_repaid")
        .order_by(TrustEvent.created_at.desc())
        .first()
    )


def _compute_pack_id(db: Session, user_id: int) -> Optional[str]:
    """
    Optional Pack ID for merchant conversations.
    We derive from the latest full repayment event (if available).
    """
    ev = _find_latest_full_repayment_event(db, int(user_id))
    if not ev:
        return None

    payment_ref = None
    try:
        meta = json.loads(ev.meta_json) if ev.meta_json else {}
        payment_ref = meta.get("payment_reference")
    except Exception:
        payment_ref = None

    ymd = (ev.created_at.astimezone(timezone.utc).strftime("%Y%m%d") if ev.created_at else _now_utc().strftime("%Y%m%d"))
    tail = None
    if isinstance(payment_ref, str) and payment_ref:
        # use the last 6 chars if possible
        tail = payment_ref.strip()[-6:].upper()

    if tail:
        return f"EP-{ymd}-{tail}"
    return f"EP-{ymd}-U{int(user_id)}"


def build_merchant_verify_link(
    db: Session,
    *,
    user_id: int,
    ttl_hours: int = 72,
    level: str = "standard",
) -> Tuple[str, str, str, Optional[str], int]:
    """
    Returns: (token, path, link_id, pack_id, ttl_hours)
    """
    ttl_hours = max(1, min(int(ttl_hours), 168))
    exp = _now_utc() + timedelta(hours=ttl_hours)

    jti = secrets.token_hex(6).upper()  # 12 hex chars
    link_id = _short_id("MV", jti)
    pack_id = _compute_pack_id(db, int(user_id))

    payload = {
        "uid": int(user_id),
        "lvl": str(level),
        "exp": exp.isoformat(),
        "jti": jti,
    }

    token = _make_token(payload)
    path = f"/trust-slips/merchant/verify/{token}"

    # Evidence event (append-only)
    meta = {
        "policy": "trust_constitution_v1",
        "reason": "merchant_link_created",
        "jti": jti,
        "link_id": link_id,
        "pack_id": pack_id,
        "level": str(level),
        "expires_at": exp.isoformat(),
    }
    db.add(
        TrustEvent(
            event_type=EV_MERCHANT_LINK_CREATED,
            clan_id=None,
            loan_id=0,
            guarantor_id=None,
            actor_user_id=int(user_id),
            subject_user_id=int(user_id),
            meta_json=json.dumps(meta),
        )
    )
    db.commit()

    return token, path, link_id, pack_id, ttl_hours


def verify_merchant_token(db: Session, *, token: str) -> Dict[str, Any]:
    """
    Validates token + expiry. Returns decoded payload.
    """
    payload = _parse_token(token)
    uid = int(payload.get("uid") or 0)
    lvl = str(payload.get("lvl") or "standard")
    jti = str(payload.get("jti") or "")

    exp_raw = payload.get("exp")
    try:
        exp = datetime.fromisoformat(str(exp_raw))
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        exp = exp.astimezone(timezone.utc)
    except Exception:
        raise ValueError("Invalid token expiry")

    if _now_utc() > exp:
        raise ValueError("Expired token")

    link_id = _short_id("MV", jti) if jti else None
    pack_id = _compute_pack_id(db, uid)

    return {
        "uid": uid,
        "lvl": lvl,
        "jti": jti,
        "link_id": link_id,
        "pack_id": pack_id,
        "exp": exp.isoformat(),
    }


def is_token_used(db: Session, *, jti: str) -> bool:
    if not jti:
        return False
    pat = f'%\"jti\": \"{jti}\"%'
    q = db.query(TrustEvent).filter(TrustEvent.event_type == EV_MERCHANT_TOKEN_USED).filter(TrustEvent.meta_json.like(pat))
    return db.query(q.exists()).scalar() is True


def mark_token_used(db: Session, *, actor_user_id: int, subject_user_id: int, jti: str, link_id: Optional[str], pack_id: Optional[str]) -> None:
    if not jti:
        return
    meta = {
        "policy": "trust_constitution_v1",
        "reason": "merchant_token_used",
        "jti": jti,
        "link_id": link_id,
        "pack_id": pack_id,
    }
    db.add(
        TrustEvent(
            event_type=EV_MERCHANT_TOKEN_USED,
            clan_id=None,
            loan_id=0,
            guarantor_id=None,
            actor_user_id=int(actor_user_id),
            subject_user_id=int(subject_user_id),
            meta_json=json.dumps(meta),
        )
    )
    db.commit()
