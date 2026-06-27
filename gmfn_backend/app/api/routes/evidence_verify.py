# app/api/routes/evidence_verify.py
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.constants import PROTOCOL_VERSION
from app.db.database import get_db
from app.db.models import TrustEvent, User

router = APIRouter(prefix="/evidence-pack", tags=["evidence-pack"])


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _latest_event_time(db: Session, user_id: int) -> Optional[datetime]:
    row: Optional[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .first()
    )
    return _to_aware(getattr(row, "created_at", None)) if row else None


def _stable_pack_id(*, user_id: int, dt: datetime) -> str:
    """
    Stable evidence verification reference for the signed-in holder.
    Does not expose the raw internal user id.
    """
    day = dt.strftime("%Y%m%d")
    seed = f"gsn-evidence:{user_id}:{day}:{PROTOCOL_VERSION}".encode("utf-8")
    h = hashlib.sha256(seed).hexdigest()[:10].upper()
    return f"GSN-EVID-{day}Z-{h}"


def _checksum(pack_id: str, based_on_event_at: Optional[datetime]) -> str:
    ts = based_on_event_at.isoformat() if based_on_event_at else "none"
    seed = f"{pack_id}|{PROTOCOL_VERSION}|{ts}".encode("utf-8")
    return hashlib.sha256(seed).hexdigest()


def _get_hmac_secret() -> bytes:
    """
    Secret for signing merchant verification tokens.
    Priority:
    - GMFN_HMAC_SECRET
    - SECRET_KEY
    """
    s = (os.getenv("GMFN_HMAC_SECRET") or os.getenv("SECRET_KEY") or "").strip()
    if not s:
        # Fail closed: don't issue unverifiable tokens
        raise RuntimeError("Missing GMFN_HMAC_SECRET (or SECRET_KEY) for merchant verify tokens")
    return s.encode("utf-8")


def _b64url_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode("utf-8").rstrip("=")


def _b64url_decode(s: str) -> bytes:
    pad = "=" * ((4 - (len(s) % 4)) % 4)
    return base64.urlsafe_b64decode((s + pad).encode("utf-8"))


def _sign(payload: dict[str, Any]) -> str:
    secret = _get_hmac_secret()
    body = json.dumps(payload, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    sig = hmac.new(secret, body, hashlib.sha256).digest()
    return f"{_b64url_encode(body)}.{_b64url_encode(sig)}"


def _verify_token(token: str) -> dict[str, Any]:
    """
    Returns payload if valid, otherwise raises HTTPException.
    """
    try:
        body_b64, sig_b64 = token.split(".", 1)
        body = _b64url_decode(body_b64)
        sig = _b64url_decode(sig_b64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token format")

    secret = _get_hmac_secret()
    expected = hmac.new(secret, body, hashlib.sha256).digest()
    if not hmac.compare_digest(expected, sig):
        raise HTTPException(status_code=400, detail="Invalid token signature")

    try:
        payload = json.loads(body.decode("utf-8"))
        if not isinstance(payload, dict):
            raise ValueError("not a dict")
        return payload
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid token payload")


@router.get("/me/verify")
def verify_my_evidence_pack(
    pack_id: Optional[str] = None,
    checksum: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Verify evidence pack integrity for the logged-in user.

    If pack_id/checksum are provided, we verify they match the recomputed values.
    If not provided, we simply return the current computed values.
    """
    uid = int(current_user.id)
    now = _now_utc()

    computed_pack_id = _stable_pack_id(user_id=uid, dt=now)
    based_on_event_at = _latest_event_time(db, uid)
    computed_checksum = _checksum(computed_pack_id, based_on_event_at)

    ok = True
    if pack_id is not None and str(pack_id) != str(computed_pack_id):
        ok = False
    if checksum is not None and str(checksum) != str(computed_checksum):
        ok = False

    return {
        "ok": ok,
        "holder": {
            "gsn_id": getattr(current_user, "gmfn_id", None),
            "private_member_reference": "redacted for evidence verification",
        },
        "protocol_version": PROTOCOL_VERSION,
        "computed": {
            "pack_id": computed_pack_id,
            "checksum": computed_checksum,
            "based_on_event_at": based_on_event_at.isoformat() if based_on_event_at else None,
            "verified_at": now.isoformat(),
        },
        "input": {
            "pack_id": pack_id,
            "checksum": checksum,
        },
        "note": "This checks whether the supplied evidence reference still matches the current account evidence anchor.",
    }


@router.get("/me/merchant-token")
def issue_merchant_verify_token(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Issue a signed token the user/admin can share with a merchant for public verification.
    Minimal disclosure: the signed token carries only the evidence anchor, not the raw account id.
    """
    uid = int(current_user.id)
    now = _now_utc()

    pack_id = _stable_pack_id(user_id=uid, dt=now)
    based_on_event_at = _latest_event_time(db, uid)
    checksum = _checksum(pack_id, based_on_event_at)

    payload = {
        "v": 1,
        "protocol_version": PROTOCOL_VERSION,
        "pack_id": pack_id,
        "checksum": checksum,
        "based_on_event_at": based_on_event_at.isoformat() if based_on_event_at else None,
        "issued_at": now.isoformat(),
    }

    token = _sign(payload)

    return {
        "pack_id": pack_id,
        "checksum": checksum,
        "based_on_event_at": payload["based_on_event_at"],
        "protocol_version": PROTOCOL_VERSION,
        "public_verify_url": "/evidence-pack/public/verify?token=" + token,
        "merchant_verify_url": "/evidence-pack/public/verify?token=" + token,
        "token": token,
        "note": "Share the verification link only with someone who needs a minimal current evidence check.",
    }


@router.get("/public/verify")
def public_verify(
    token: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """
    Public, minimal merchant verification.
    Returns no user identifiers, emails, or loan details.
    """
    payload = _verify_token(token)
    now = _now_utc()

    ok = (
        bool(payload.get("pack_id"))
        and bool(payload.get("checksum"))
        and payload.get("protocol_version") == PROTOCOL_VERSION
    )

    return {
        "ok": bool(ok),
        "protocol_version": PROTOCOL_VERSION,
        "pack_id": payload.get("pack_id"),
        "checksum": payload.get("checksum"),
        "based_on_event_at": payload.get("based_on_event_at"),
        "verified_at": now.isoformat(),
        "note": "Minimal server-signed evidence check only: no identity or loan details are exposed.",
    }
