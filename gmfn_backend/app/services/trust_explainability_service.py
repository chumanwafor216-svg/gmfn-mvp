from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy.orm import Session

from app.db.models import TrustEvent, User


def _to_decimal(value: Any) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal("0")


def _decimal_str(value: Any) -> str:
    return str(_to_decimal(value))


def _normalize_meta(value: Any) -> Any:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    if isinstance(value, dict):
        return {str(k): _normalize_meta(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalize_meta(v) for v in value]
    return value


def _event_delta(event: TrustEvent) -> Decimal:
    meta = _event_meta(event)

    for attr in ("delta", "points_delta", "score_delta", "trust_delta"):
        if hasattr(event, attr):
            return _to_decimal(getattr(event, attr))

    for key in ("delta", "points_delta", "score_delta", "trust_delta"):
        if key in meta:
            return _to_decimal(meta.get(key))

    return Decimal("0")


def _event_meta(event: TrustEvent) -> Dict[str, Any]:
    meta = getattr(event, "meta", None)
    if isinstance(meta, dict):
        return _normalize_meta(meta)
    return {}


def _event_created_at_iso(event: TrustEvent) -> str:
    created_at = getattr(event, "created_at", None)
    if isinstance(created_at, datetime):
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        return created_at.isoformat()
    return ""


def _band_for_score(score: Decimal) -> str:
    if score >= Decimal("80"):
        return "Band A"
    if score >= Decimal("60"):
        return "Band B"
    if score >= Decimal("40"):
        return "Band C"
    if score >= Decimal("20"):
        return "Band D"
    return "Band E"


def _user_label(user: Optional[User]) -> Optional[str]:
    if user is None:
        return None

    for attr in ("nickname", "display_name", "email"):
        val = getattr(user, attr, None)
        if isinstance(val, str) and val.strip():
            if attr == "email":
                return val.split("@")[0]
            return val.strip()

    user_id = getattr(user, "id", None)
    if user_id is not None:
        return f"user-{user_id}"
    return None


def build_trust_explainability(
    db: Session,
    *,
    user_id: int,
    recent_limit: int = 10,
) -> Dict[str, Any]:
    rows: List[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(max(1, min(recent_limit, 100)))
        .all()
    )

    all_rows: Iterable[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.asc(), TrustEvent.id.asc())
        .all()
    )

    current_score = Decimal("0")
    for row in all_rows:
        current_score += _event_delta(row)

    latest_reason: Optional[str] = None
    latest_note: Optional[str] = None
    latest_source: Optional[str] = None

    if rows:
        latest_meta = _event_meta(rows[0])
        latest_reason = latest_meta.get("reason")
        latest_note = latest_meta.get("note")
        latest_source = getattr(rows[0], "event_type", None)

    recent_events: List[Dict[str, Any]] = []
    for row in rows:
        meta = _event_meta(row)
        recent_events.append(
            {
                "id": int(getattr(row, "id")),
                "subject_user_id": int(
                    getattr(row, "subject_user_id", getattr(row, "user_id", user_id))
                ),
                "actor_user_id": int(
                    getattr(
                        row,
                        "actor_user_id",
                        getattr(row, "subject_user_id", getattr(row, "user_id", user_id)),
                    )
                ),
                "event_type": str(getattr(row, "event_type", "trust.event")),
                "delta": _decimal_str(_event_delta(row)),
                "created_at": _event_created_at_iso(row),
                "reason": meta.get("reason"),
                "note": meta.get("note"),
                "meta": meta,
            }
        )

    return {
        "user_id": int(user_id),
        "current_score": _decimal_str(current_score),
        "band": _band_for_score(current_score),
        "latest_reason": latest_reason,
        "latest_note": latest_note,
        "latest_source": latest_source,
        "recent_events": recent_events,
    }


def build_recent_trust_events_admin(
    db: Session,
    *,
    limit: int = 50,
    user_id: Optional[int] = None,
    event_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    q = db.query(TrustEvent, User).outerjoin(User, User.id == TrustEvent.subject_user_id)

    if user_id is not None:
        q = q.filter(TrustEvent.subject_user_id == int(user_id))

    if event_type:
        q = q.filter(TrustEvent.event_type == event_type)

    rows = (
        q.order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(max(1, min(limit, 200)))
        .all()
    )

    out: List[Dict[str, Any]] = []
    for event, user in rows:
        meta = _event_meta(event)
        out.append(
            {
                "id": int(getattr(event, "id")),
                "subject_user_id": int(getattr(event, "subject_user_id")),
                "actor_user_id": int(getattr(event, "actor_user_id")),
                "user_label": _user_label(user),
                "event_type": str(getattr(event, "event_type", "trust.event")),
                "delta": _decimal_str(_event_delta(event)),
                "created_at": _event_created_at_iso(event),
                "reason": meta.get("reason"),
                "note": meta.get("note"),
                "meta": meta,
            }
        )
    return out


def log_trust_event_with_meta(
    db: Session,
    *,
    actor_user_id: int,
    subject_user_id: int,
    event_type: str,
    delta: Decimal | str | int | float,
    clan_id: Optional[int] = None,
    loan_id: Optional[int] = None,
    guarantor_id: Optional[int] = None,
    reason: Optional[str] = None,
    note: Optional[str] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> TrustEvent:
    payload: Dict[str, Any] = dict(meta or {})
    if reason is not None:
        payload["reason"] = reason
    if note is not None:
        payload["note"] = note

    payload["delta"] = str(_to_decimal(delta))
    payload = _normalize_meta(payload)

    event = TrustEvent(
        event_type=event_type,
        clan_id=clan_id,
        loan_id=loan_id,
        guarantor_id=guarantor_id,
        actor_user_id=int(actor_user_id),
        subject_user_id=int(subject_user_id),
        meta=payload,
    )

    db.add(event)
    db.flush()
    return event
