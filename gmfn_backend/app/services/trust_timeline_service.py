# app/services/trust_timeline_service.py
from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Literal

from sqlalchemy.orm import Session
from app.db.models import TrustEvent

Audience = Literal["user", "admin"]

DELTA_FULL_REPAY = Decimal("0.10")
DELTA_GUARANTOR_SUCCESS = Decimal("0.03")
DELTA_MISSED = Decimal("-0.30")
DELTA_DEFAULT = Decimal("-0.70")
DELTA_FRAUD = Decimal("-1.50")

EV_FULL_REPAID = "loan_fully_repaid"
EV_GUARANTOR_SUCCESS = "guarantor_success"
EV_MISSED = "missed_payment"
EV_DEFAULT = "default"
EV_FRAUD = "fraud_flag"

ALIASES = {
    EV_FULL_REPAID: {
        "loan_fully_repaid",
        "loan_repaid",
        "repaid",
        "repayment_full",
        "full_repayment",
        "loan_repayment_completed",
    },
    EV_GUARANTOR_SUCCESS: {
        "guarantor_success",
        "guarantor_repayment_success",
        "guarantor_supported_repaid",
        "guarantor_credit",
    },
    EV_MISSED: {"missed_payment", "repayment_missed", "late_payment", "overdue"},
    EV_DEFAULT: {"default", "loan_defaulted", "write_off", "chargeoff"},
    EV_FRAUD: {"fraud_flag", "fraud", "abuse_flag", "ban"},
}


def _to_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _normalize_event_type(et: str) -> str:
    raw = (et or "").strip()
    if not raw:
        return raw
    for canonical, bucket in ALIASES.items():
        if raw == canonical or raw in bucket:
            return canonical
    return raw


def _delta_for_event(canonical: str) -> Decimal:
    if canonical == EV_FULL_REPAID:
        return DELTA_FULL_REPAY
    if canonical == EV_GUARANTOR_SUCCESS:
        return DELTA_GUARANTOR_SUCCESS
    if canonical == EV_MISSED:
        return DELTA_MISSED
    if canonical == EV_DEFAULT:
        return DELTA_DEFAULT
    if canonical == EV_FRAUD:
        return DELTA_FRAUD
    return Decimal("0.00")


def _parse_meta(meta_json: Optional[str]) -> Dict[str, Any]:
    if not meta_json:
        return {}
    try:
        obj = json.loads(meta_json)
        return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def _humane_label(event_type_raw: str, canonical: str, meta: Dict[str, Any]) -> str:
    # Trust-changing events
    if canonical == EV_FULL_REPAID:
        return "Full repayment ✅"
    if canonical == EV_GUARANTOR_SUCCESS:
        return "You supported a repaid loan 🤝"
    if canonical == EV_MISSED:
        return "Payment missed ⚠️"
    if canonical == EV_DEFAULT:
        return "Loan not repaid ❗"
    if canonical == EV_FRAUD:
        return "Safety flag 🚫"

    et = (event_type_raw or "").strip()
    et_lower = et.lower()
    et_upper = et.upper()

    # Loan / community lifecycle
    if et == "loan.created":
        return "You asked for support 💬"
    if et_upper == "LOAN_AUTO_APPROVED":
        return "Your community approved ✅"
    if et_upper == "LOAN_INCOMPLETE":
        return "Needs more support 👥"
    if et_upper == "LOAN_CANCELLED":
        return "Request cancelled"

    if et_upper == "GUARANTOR_APPROVED":
        return "A supporter backed you 🤝"
    if et_upper == "GUARANTOR_DECLINED":
        return "A supporter declined 🙏"
    if et_upper == "GUARANTOR_EXPIRED":
        return "Support request expired ⏳"

    if et_lower in ("repayment.claimed", "repayment_claimed", "repayment.claim"):
        return "You said you paid 💸"

    # Merchant / trade lifecycle
    if et_lower in ("merchant.release_recorded", "merchant_release_recorded"):
        return "Merchant recorded goods release 🧾"
    if et_lower == "merchant.dispatched":
        return "Goods dispatched 🚚"
    if et_lower == "merchant.in_transit":
        return "Package in transit 🚚"
    if et_lower == "merchant.delivered":
        return "Marked as delivered 📦"
    if et_lower == "merchant.delivery_issue":
        return "Delivery issue reported ⚠️"
    if et_lower == "merchant.delivery_confirmed":
        return "Delivery confirmed ✅"

    # Courier acknowledgments
    if et_lower == "courier.received":
        return "Courier acknowledged receipt 📦"
    if et_lower == "courier.in_transit":
        return "Courier marked in transit 🚚"
    if et_lower == "courier.delivered":
        return "Courier marked delivered 📬"

    # Invites
    if et == "invite_created":
        return "Invite link created 🔗"
    if et == "invite_joined":
        return "Someone joined via invite 🎉"

    # System
    if et == "trust.score_updated":
        return "Internal update"

    return "Activity"


def _admin_label(event_type_raw: str, canonical: str) -> str:
    return canonical if canonical != (event_type_raw or "").strip() else (event_type_raw or canonical or "activity")


def _should_hide_for_user(event_type_raw: str) -> bool:
    return (event_type_raw or "").strip() == "trust.score_updated"


def list_trust_timeline(
    db: Session,
    *,
    user_id: int,
    limit: int = 50,
    audience: Audience = "user",
    hide_zero_deltas_for_user: bool = True,
) -> List[Dict[str, Any]]:
    limit = max(1, min(int(limit), 200))

    rows: List[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.desc())
        .limit(limit)
        .all()
    )

    out: List[Dict[str, Any]] = []
    for r in rows:
        raw_type = getattr(r, "event_type", "") or ""
        canonical = _normalize_event_type(raw_type)
        delta = _delta_for_event(canonical)

        meta = _parse_meta(getattr(r, "meta_json", None))
        reason = meta.get("reason") or meta.get("meta", {}).get("reason")
        note = meta.get("note") or meta.get("meta", {}).get("note")
        payment_reference = meta.get("payment_reference")

        if audience == "user":
            if _should_hide_for_user(raw_type):
                continue

            if hide_zero_deltas_for_user and delta == Decimal("0.00"):
                keep = False
                rt = (raw_type or "").strip().lower()

                # Keep meaningful zero-delta events
                if raw_type == "loan.created":
                    keep = True
                if (raw_type or "").upper() in {"LOAN_CANCELLED", "LOAN_INCOMPLETE"}:
                    keep = True
                if rt in {"repayment.claimed", "repayment_claimed", "repayment.claim"}:
                    keep = True

                # Merchant + courier lifecycle should stay visible
                if rt.startswith("merchant.") or rt.startswith("courier."):
                    keep = True

                if not keep:
                    continue

        created_at = _to_aware(getattr(r, "created_at", None))
        label = _humane_label(raw_type, canonical, meta) if audience == "user" else _admin_label(raw_type, canonical)

        out.append(
            {
                "event_type": canonical if audience == "user" else (raw_type or canonical),
                "label": label,
                "delta": str(delta),
                "reason": reason,
                "note": note,
                "payment_reference": payment_reference,
                "loan_id": getattr(r, "loan_id", None),
                "clan_id": getattr(r, "clan_id", None),
                "guarantor_id": getattr(r, "guarantor_id", None),
                "actor_user_id": getattr(r, "actor_user_id", None),
                "subject_user_id": getattr(r, "subject_user_id", None),
                "created_at": created_at.isoformat() if created_at else None,
            }
        )

    return out