from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.constants import PROTOCOL_VERSION
from app.core.trust_policy import (
    infer_delta_str,
    policy_version,
    rule_kind,
    rule_label,
)
from app.db.database import get_db
from app.db.models import TrustEvent, User
from app.services.trust_score_service import apply_trust_score, compute_trust_breakdown

router = APIRouter(prefix="/trust", tags=["trust"])


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


def _build_pack_id(*, user_id: int, based_on_event_at: Optional[datetime]) -> str:
    """
    Deterministic Pack ID:
    - Stable for a given latest TrustEvent timestamp
    - Changes when the timeline changes
    """
    if based_on_event_at is None:
        based_on_event_at = datetime.now(timezone.utc).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

    ts = based_on_event_at.astimezone(timezone.utc)
    day = ts.strftime("%Y%m%d")

    seed = f"{user_id}|{ts.isoformat()}|{PROTOCOL_VERSION}"
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest().upper()[:10]
    return f"TP-U{user_id}-{day}-{digest}"


def _safe_meta(raw: Any) -> dict[str, Any]:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            v = json.loads(raw)
            return v if isinstance(v, dict) else {}
        except Exception:
            return {}
    return {}


@router.get("/score/explained")
def get_my_trust_score_explained(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Friendly, explainable trust score.
    Trust increases only when a loan is fully repaid.
    """
    apply_trust_score(db, user_id=int(current_user.id))
    return compute_trust_breakdown(db, user_id=int(current_user.id))


@router.get("/me/latest-source")
def trust_latest_source(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Minimal latest-source endpoint.
    """
    return {
        "event_type": "REPAYMENT_ONLY_POLICY",
        "note": "Trust increases only when a loan is fully repaid.",
    }


@router.get("/me/evidence-pack/meta")
def get_my_evidence_pack_meta(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Evidence Pack metadata:
    - pack_id (deterministic)
    - timestamps
    - standard evidence endpoints
    """
    uid = int(current_user.id)
    based_on_event_at = _latest_event_time(db, uid)
    pack_id = _build_pack_id(user_id=uid, based_on_event_at=based_on_event_at)
    generated_at = datetime.now(timezone.utc).isoformat()

    return {
        "pack_id": pack_id,
        "user_id": uid,
        "protocol_version": PROTOCOL_VERSION,
        "generated_at": generated_at,
        "based_on_event_at": based_on_event_at.isoformat() if based_on_event_at else None,
        "endpoints": {
            "trust_slip_evidence_pdf": "/trust-slips/me/evidence.pdf",
            "trust_evidence_pack_pdf": "/trust/me/evidence-pack.pdf",
            "trust_timeline": "/trust/me/timeline?limit=50",
        },
        "note": "Quote this Pack ID when speaking to a merchant or admin during the pilot.",
    }


@router.get("/why/{user_id}")
def trust_why_user(
    user_id: int,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Explainable trust change feed for a user.
    Access control can be tightened later if needed.
    """
    lim = max(1, min(int(limit or 10), 50))

    target = db.get(User, int(user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    apply_trust_score(db, user_id=int(user_id))
    breakdown = compute_trust_breakdown(db, user_id=int(user_id))

    rows: list[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(lim)
        .all()
    )

    events_out: list[dict[str, Any]] = []
    for e in rows:
        meta = _safe_meta(getattr(e, "meta", None) or getattr(e, "meta_json", None))
        events_out.append(
            {
                "id": int(e.id),
                "event_type": e.event_type,
                "delta": infer_delta_str(e.event_type),
                "delta_rule": rule_label(e.event_type) or None,
                "clan_id": e.clan_id,
                "loan_id": e.loan_id,
                "guarantor_id": e.guarantor_id,
                "actor_user_id": int(e.actor_user_id),
                "subject_user_id": int(e.subject_user_id),
                "reason": meta.get("reason"),
                "note": meta.get("note"),
                "created_at": getattr(e, "created_at", None),
            }
        )

    return {
        "user_id": int(user_id),
        "protocol_version": PROTOCOL_VERSION,
        "trust_policy_version": policy_version(),
        "computed": breakdown,
        "events": events_out,
    }


@router.get("/me")
def trust_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Single trust snapshot endpoint.
    Returns current trust snapshot + last change in one payload.
    Must never crash.
    """
    uid = int(current_user.id)

    apply_trust_score(db, user_id=uid)
    breakdown = compute_trust_breakdown(db, user_id=uid)

    last: Optional[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == uid)
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .first()
    )

    last_change: Dict[str, Any] = {
        "event_type": None,
        "delta": None,
        "reason": None,
        "note": None,
        "clan_id": None,
        "loan_id": None,
        "created_at": None,
        "rule_label": None,
        "rule_kind": None,
        "policy_version": policy_version(),
    }

    if last is not None:
        meta = _safe_meta(getattr(last, "meta", None) or getattr(last, "meta_json", None))
        et = getattr(last, "event_type", None) or ""
        last_change = {
            "event_type": getattr(last, "event_type", None),
            "delta": infer_delta_str(et),
            "reason": meta.get("reason"),
            "note": meta.get("note"),
            "clan_id": getattr(last, "clan_id", None),
            "loan_id": getattr(last, "loan_id", None),
            "created_at": getattr(last, "created_at", None),
            "rule_label": rule_label(et),
            "rule_kind": rule_kind(et),
            "policy_version": policy_version(),
        }

    try:
        event_count = int(
            db.query(TrustEvent)
            .filter(TrustEvent.subject_user_id == uid)
            .count()
        )
    except Exception:
        event_count = None

    try:
        invite_join_events = int(
            db.query(TrustEvent)
            .filter(TrustEvent.subject_user_id == uid)
            .filter(TrustEvent.event_type == "invite_join")
            .count()
        )
    except Exception:
        invite_join_events = None

    identity_conf = {
        "event_count": event_count,
        "account_age_days": None,
        "invite_join_events": invite_join_events,
    }

    score_value = (
        breakdown.get("standing_score")
        or breakdown.get("score")
        or breakdown.get("trust_score")
        or "0.00"
    )
    band_value = breakdown.get("band")

    return {
        "user_id": uid,
        "email": getattr(current_user, "email", None),
        "trust_score": str(score_value),
        "trust_band": band_value,
        "computed": breakdown,
        "last_change": last_change,
        "policy_note": "Trust is rule-based and increases only when a loan is fully repaid.",
        "trust_policy_version": policy_version(),
        "identity_confidence": identity_conf,
    }