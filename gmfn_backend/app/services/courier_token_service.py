# app/services/courier_token_service.py
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict

from app.core.constants import ALLOW_DEV_SECRET_FALLBACK, DEV_FALLBACK_SECRET


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _get_secret() -> bytes:
    sk = os.getenv("GMFN_SECRET_KEY") or os.getenv("SECRET_KEY") or ""
    if sk:
        return sk.encode("utf-8")
    if ALLOW_DEV_SECRET_FALLBACK:
        return str(DEV_FALLBACK_SECRET).encode("utf-8")
    raise RuntimeError("Missing signing secret (GMFN_SECRET_KEY/SECRET_KEY) and dev fallback disabled.")


def _b64url_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode("utf-8").rstrip("=")


def _b64url_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode((s + pad).encode("utf-8"))


def _sign(payload_b64: str, secret: bytes) -> str:
    sig = hmac.new(secret, payload_b64.encode("utf-8"), hashlib.sha256).digest()
    return _b64url_encode(sig)


def make_courier_token(*, loan_id: int, borrower_user_id: int, expires_hours: int = 48) -> Dict[str, Any]:
    """
    Creates a signed courier token (no-login use).
    token contains:
    - loan_id
    - borrower_user_id
    - exp
    - jti
    """
    secret = _get_secret()
    exp = int((_now_utc() + timedelta(hours=int(expires_hours))).timestamp())
    jti = uuid.uuid4().hex

    payload = {"loan_id": int(loan_id), "borrower_user_id": int(borrower_user_id), "exp": exp, "jti": jti}
    payload_json = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    payload_b64 = _b64url_encode(payload_json)
    sig_b64 = _sign(payload_b64, secret)
    token = f"{payload_b64}.{sig_b64}"

    return {"token": token, "exp": exp, "jti": jti}


def verify_courier_token(token: str) -> Dict[str, Any]:
    secret = _get_secret()

    try:
        payload_b64, sig_b64 = token.split(".", 1)
    except ValueError:
        raise ValueError("Invalid token format")

    expected = _sign(payload_b64, secret)
    if not hmac.compare_digest(expected, sig_b64):
        raise ValueError("Invalid token signature")

    payload_raw = _b64url_decode(payload_b64)
    payload = json.loads(payload_raw.decode("utf-8"))

    exp = payload.get("exp")
    if not isinstance(exp, int):
        raise ValueError("Invalid exp")
    if exp < int(_now_utc().timestamp()):
        raise ValueError("Token expired")

    loan_id = payload.get("loan_id")
    borrower_user_id = payload.get("borrower_user_id")
    jti = payload.get("jti")

    if not isinstance(loan_id, int) or loan_id <= 0:
        raise ValueError("Invalid loan_id")
    if not isinstance(borrower_user_id, int) or borrower_user_id <= 0:
        raise ValueError("Invalid borrower_user_id")
    if not isinstance(jti, str) or len(jti) < 8:
        raise ValueError("Invalid jti")

    return {"loan_id": loan_id, "borrower_user_id": borrower_user_id, "exp": exp, "jti": jti}
    