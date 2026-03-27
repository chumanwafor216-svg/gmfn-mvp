# app/services/shipment_progress_service.py
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, Optional, List

from sqlalchemy.orm import Session

from app.db.models import TrustEvent


STAGES = [
    ("Released", "merchant.release_recorded"),
    ("Dispatched", "merchant.dispatched"),
    ("In transit", "merchant.in_transit"),
    ("Delivered", "merchant.delivered"),
    ("Buyer confirmed", "merchant.delivery_confirmed"),
]

ALT_RELEASE_TYPES = {"merchant.release_recorded", "merchant_release_recorded", "merchant.release"}
ALT_DELIVERED_TYPES = {"merchant.delivered", "courier.delivered"}  # courier can also report delivered


def _to_iso(dt: Optional[datetime]) -> Optional[str]:
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def _latest_event_for_types(
    db: Session,
    *,
    user_id: int,
    loan_id: int,
    event_types: set[str],
) -> Optional[TrustEvent]:
    return (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .filter(TrustEvent.loan_id == int(loan_id))
        .filter(TrustEvent.event_type.in_(list(event_types)))
        .order_by(TrustEvent.created_at.desc())
        .first()
    )


def _latest_relevant_loan_id(db: Session, *, user_id: int, lookback_days: int = 45) -> Optional[int]:
    """
    Finds the most recent loan_id where shipment-related events exist for this user.
    Keeps it simple + reliable for merchant verification.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=int(lookback_days))

    row = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .filter(TrustEvent.loan_id.isnot(None))
        .filter(TrustEvent.loan_id > 0)
        .filter(TrustEvent.created_at >= cutoff)
        .filter(
            (TrustEvent.event_type.like("merchant.%"))
            | (TrustEvent.event_type.like("courier.%"))
            | (TrustEvent.event_type == "merchant.delivery_confirmed")
        )
        .order_by(TrustEvent.created_at.desc())
        .first()
    )
    if not row:
        return None
    return int(getattr(row, "loan_id") or 0) or None


def get_shipment_progress(
    db: Session,
    *,
    user_id: int,
    loan_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Returns a merchant-friendly shipment progress model.
    """
    if loan_id is None:
        loan_id = _latest_relevant_loan_id(db, user_id=int(user_id))

    if not loan_id:
        return {
            "ok": True,
            "loan_id": None,
            "steps": [{"name": s[0], "done": False, "at": None} for s in STAGES],
            "note": "No shipment activity recorded yet.",
        }

    # Released
    released_ev = _latest_event_for_types(db, user_id=int(user_id), loan_id=int(loan_id), event_types=set(ALT_RELEASE_TYPES))

    # Dispatched / In transit / Delivered (merchant events)
    dispatched_ev = _latest_event_for_types(db, user_id=int(user_id), loan_id=int(loan_id), event_types={"merchant.dispatched"})
    transit_ev = _latest_event_for_types(db, user_id=int(user_id), loan_id=int(loan_id), event_types={"merchant.in_transit"})

    delivered_ev = _latest_event_for_types(
        db,
        user_id=int(user_id),
        loan_id=int(loan_id),
        event_types=set(ALT_DELIVERED_TYPES) | {"merchant.delivered"},
    )

    confirmed_ev = _latest_event_for_types(db, user_id=int(user_id), loan_id=int(loan_id), event_types={"merchant.delivery_confirmed"})

    steps = [
        {"name": "Released", "done": bool(released_ev), "at": _to_iso(getattr(released_ev, "created_at", None))},
        {"name": "Dispatched", "done": bool(dispatched_ev), "at": _to_iso(getattr(dispatched_ev, "created_at", None))},
        {"name": "In transit", "done": bool(transit_ev), "at": _to_iso(getattr(transit_ev, "created_at", None))},
        {"name": "Delivered", "done": bool(delivered_ev), "at": _to_iso(getattr(delivered_ev, "created_at", None))},
        {"name": "Buyer confirmed", "done": bool(confirmed_ev), "at": _to_iso(getattr(confirmed_ev, "created_at", None))},
    ]

    return {
        "ok": True,
        "loan_id": int(loan_id),
        "steps": steps,
        "note": "Shipment status is based on self-reported confirmations. Not a delivery guarantee.",
    }