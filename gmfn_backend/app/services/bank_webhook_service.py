from __future__ import annotations

import hashlib
import hmac
import json
import os
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional


def _safe_str(x: Any, default: str = "") -> str:
    if x is None:
        return default
    s = str(x).strip()
    return s if s else default


def _safe_decimal(x: Any, default: str = "0.00") -> Decimal:
    try:
        return Decimal(str(x))
    except Exception:
        return Decimal(default)


def _safe_int(x: Any, default: int = 0) -> int:
    try:
        return int(x)
    except Exception:
        return default


def _safe_dt(x: Any) -> Optional[datetime]:
    if not x:
        return None
    try:
        s = str(x).replace("Z", "+00:00")
        return datetime.fromisoformat(s)
    except Exception:
        return None


def webhook_secret() -> str:
    return _safe_str(os.getenv("GMFN_WEBHOOK_SECRET"))


def webhook_secret_is_configured() -> bool:
    return bool(webhook_secret())


def _dev_mode() -> bool:
    return _safe_str(os.getenv("GMFN_DEV_MODE")).lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def verify_webhook_signature(*, raw_body: bytes, provided_signature: Optional[str]) -> bool:
    """
    MVP-safe HMAC verification.

    Header expected:
      X-GMFN-Signature: sha256=<hex>

    If GMFN_WEBHOOK_SECRET is not configured, returns True only in dev mode.
    """
    secret = webhook_secret()
    if not secret:
        return _dev_mode()

    sig = _safe_str(provided_signature)
    if not sig:
        return False

    if sig.startswith("sha256="):
        sig = sig.split("=", 1)[1].strip()

    expected = hmac.new(
        secret.encode("utf-8"),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected, sig)


def _pick(payload: Dict[str, Any], *keys: str) -> Any:
    for k in keys:
        if k in payload and payload[k] not in (None, ""):
            return payload[k]
    return None


def parse_generic_webhook_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Canonical generic payload parser.

    Minimum useful keys:
    - clan_id
    - amount
    - currency
    - direction
    - reference / reference_raw
    """
    clan_id = _safe_int(_pick(payload, "clan_id"))
    if clan_id <= 0:
        raise ValueError("clan_id is required")

    amount = _safe_decimal(_pick(payload, "amount"))
    if amount <= Decimal("0.00"):
        raise ValueError("amount must be > 0")

    currency = _safe_str(_pick(payload, "currency"), "NGN").upper()
    direction = _safe_str(_pick(payload, "direction"), "credit").lower()
    if direction not in {"credit", "debit"}:
        raise ValueError("direction must be 'credit' or 'debit'")

    return {
        "clan_id": clan_id,
        "amount": amount,
        "currency": currency,
        "direction": direction,
        "reference_raw": _safe_str(_pick(payload, "reference", "reference_raw", "payment_reference"), ""),
        "description_raw": _safe_str(_pick(payload, "description", "narration", "memo"), ""),
        "source_id": _safe_str(_pick(payload, "provider_event_id", "source_id", "event_id"), "") or None,
        "bank_txn_id": _safe_str(_pick(payload, "bank_txn_id", "transaction_id", "txn_id"), "") or None,
        "posted_at": _safe_dt(_pick(payload, "posted_at", "posted_time", "occurred_at")),
        "value_at": _safe_dt(_pick(payload, "value_at", "value_time", "settled_at")),
        "meta": payload,
    }


def _parse_paystack(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Paystack-style mapping.
    Example shape often contains:
      event, data.reference, data.amount, data.currency, data.id, data.paid_at
    Amount may be in kobo.
    """
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload

    clan_id = _safe_int(_pick(data, "clan_id"))
    if clan_id <= 0:
        clan_id = _safe_int(_pick(payload, "clan_id"))
    if clan_id <= 0:
        raise ValueError("clan_id is required")

    raw_amount = _pick(data, "amount")
    amount = _safe_decimal(raw_amount)
    # Paystack often sends minor units
    if amount > Decimal("1000"):
        amount = (amount / Decimal("100")).quantize(Decimal("0.01"))

    currency = _safe_str(_pick(data, "currency"), "NGN").upper()
    reference = _safe_str(_pick(data, "reference"), "")
    direction = "credit"

    return {
        "clan_id": clan_id,
        "amount": amount,
        "currency": currency,
        "direction": direction,
        "reference_raw": reference,
        "description_raw": _safe_str(_pick(data, "message", "gateway_response", "channel"), ""),
        "source_id": _safe_str(_pick(data, "id"), "") or None,
        "bank_txn_id": _safe_str(_pick(data, "transaction_id", "id"), "") or None,
        "posted_at": _safe_dt(_pick(data, "paid_at", "created_at")),
        "value_at": _safe_dt(_pick(data, "paid_at", "created_at")),
        "meta": payload,
    }


def _parse_flutterwave(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Flutterwave-style mapping.
    """
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload

    clan_id = _safe_int(_pick(data, "clan_id"))
    if clan_id <= 0:
        clan_id = _safe_int(_pick(payload, "clan_id"))
    if clan_id <= 0:
        raise ValueError("clan_id is required")

    amount = _safe_decimal(_pick(data, "amount"))
    if amount <= Decimal("0.00"):
        raise ValueError("amount must be > 0")

    return {
        "clan_id": clan_id,
        "amount": amount,
        "currency": _safe_str(_pick(data, "currency"), "NGN").upper(),
        "direction": "credit",
        "reference_raw": _safe_str(_pick(data, "tx_ref", "flw_ref", "payment_reference"), ""),
        "description_raw": _safe_str(_pick(data, "narration", "processor_response"), ""),
        "source_id": _safe_str(_pick(data, "id"), "") or None,
        "bank_txn_id": _safe_str(_pick(data, "flw_ref", "id"), "") or None,
        "posted_at": _safe_dt(_pick(data, "created_at")),
        "value_at": _safe_dt(_pick(data, "created_at")),
        "meta": payload,
    }


def _parse_stripe(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Stripe-style mapping.
    Works best when your upstream system includes clan_id in metadata.
    """
    data_outer = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    data = data_outer.get("object") if isinstance(data_outer.get("object"), dict) else payload
    metadata = data.get("metadata") if isinstance(data.get("metadata"), dict) else {}

    clan_id = _safe_int(_pick(metadata, "clan_id"))
    if clan_id <= 0:
        clan_id = _safe_int(_pick(data, "clan_id"))
    if clan_id <= 0:
        raise ValueError("clan_id is required")

    raw_amount = _pick(data, "amount_received", "amount")
    amount = _safe_decimal(raw_amount)
    if amount > Decimal("1000"):
        amount = (amount / Decimal("100")).quantize(Decimal("0.01"))

    currency = _safe_str(_pick(data, "currency"), "NGN").upper()
    reference = _safe_str(_pick(metadata, "reference", "payment_reference"), "")
    if not reference:
        reference = _safe_str(_pick(data, "id"), "")

    return {
        "clan_id": clan_id,
        "amount": amount,
        "currency": currency,
        "direction": "credit",
        "reference_raw": reference,
        "description_raw": _safe_str(_pick(data, "description"), ""),
        "source_id": _safe_str(_pick(payload, "id"), "") or None,
        "bank_txn_id": _safe_str(_pick(data, "id", "payment_intent"), "") or None,
        "posted_at": None,
        "value_at": None,
        "meta": payload,
    }


def _parse_monnify(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Monnify-style mapping.
    """
    data = payload.get("eventData") if isinstance(payload.get("eventData"), dict) else payload

    clan_id = _safe_int(_pick(data, "clan_id"))
    if clan_id <= 0:
        clan_id = _safe_int(_pick(payload, "clan_id"))
    if clan_id <= 0:
        raise ValueError("clan_id is required")

    amount = _safe_decimal(_pick(data, "amountPaid", "amount"))
    if amount <= Decimal("0.00"):
        raise ValueError("amount must be > 0")

    return {
        "clan_id": clan_id,
        "amount": amount,
        "currency": _safe_str(_pick(data, "currency"), "NGN").upper(),
        "direction": "credit",
        "reference_raw": _safe_str(
            _pick(data, "paymentReference", "transactionReference", "productReference"),
            "",
        ),
        "description_raw": _safe_str(_pick(data, "paymentDescription"), ""),
        "source_id": _safe_str(_pick(payload, "eventType"), "") or None,
        "bank_txn_id": _safe_str(_pick(data, "transactionReference"), "") or None,
        "posted_at": _safe_dt(_pick(data, "paidOn")),
        "value_at": _safe_dt(_pick(data, "paidOn")),
        "meta": payload,
    }


def parse_provider_webhook_payload(provider: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    p = _safe_str(provider).lower()

    if p in {"generic", "manual", "bank"}:
        out = parse_generic_webhook_payload(payload)
        out["provider"] = p
        return out

    if p == "paystack":
        out = _parse_paystack(payload)
        out["provider"] = p
        return out

    if p == "flutterwave":
        out = _parse_flutterwave(payload)
        out["provider"] = p
        return out

    if p == "stripe":
        out = _parse_stripe(payload)
        out["provider"] = p
        return out

    if p == "monnify":
        out = _parse_monnify(payload)
        out["provider"] = p
        return out

    out = parse_generic_webhook_payload(payload)
    out["provider"] = p or "unknown"
    return out


def dump_json(data: Dict[str, Any]) -> str:
    return json.dumps(data, ensure_ascii=False)
