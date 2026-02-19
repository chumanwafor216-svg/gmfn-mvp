# app/api/routes/trust.py
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.constants import PROTOCOL_VERSION
from app.db.database import get_db
from app.db.models import User, TrustEvent
from app.services.trust_score_service import compute_trust_breakdown, apply_trust_score

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
        .order_by(TrustEvent.created_at.desc())
        .first()
    )
    return _to_aware(getattr(row, "created_at", None)) if row else None


def _build_pack_id(*, user_id: int, based_on_event_at: Optional[datetime]) -> str:
    """
    Deterministic Pack ID:
    - Stable for a given "latest event timestamp"
    - Changes when the timeline changes (new TrustEvent)
    """
    if based_on_event_at is None:
        # Still deterministic (per-day) when user has no events.
        based_on_event_at = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    ts = based_on_event_at.astimezone(timezone.utc)
    day = ts.strftime("%Y%m%d")

    seed = f"{user_id}|{ts.isoformat()}|{PROTOCOL_VERSION}"
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest().upper()[:10]
    return f"TP-U{user_id}-{day}-{digest}"


@router.get("/score/explained")
def get_my_trust_score_explained(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Friendly, explainable trust score.
    Trust increases ONLY when a loan is fully repaid.
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
    - standard evidence endpoints (UI can deep-link)
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
        "note": "Quote this Pack ID when speaking to a merchant/admin during the pilot.",
    }


def _safe_meta(meta_json: Optional[str]) -> dict[str, Any]:
    if not meta_json:
        return {}
    try:
        v = json.loads(meta_json)
        return v if isinstance(v, dict) else {}
    except Exception:
        return {}


def _infer_delta(event_type: str) -> Optional[str]:
    """
    Deterministic delta mapping aligned with current trust policy.
    Keep conservative: only map what we are sure about.
    """
    t = (event_type or "").lower()

    # Repayment-only trust growth (your policy)
    if t in {"repayment.confirmed", "loan.repaid", "repayment.completed"}:
        return "+0.10"
    if t in {"guarantor.repayment.confirmed", "guarantor.support.confirmed"}:
        return "+0.03"

    return None


@router.get("/why/{user_id}")
def trust_why_user(
    user_id: int,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Explainable trust change feed for a user (audit surface).
    - Deterministic: reads TrustEvents only (no fuzzy logic)
    - Returns last N events + meta.reason/meta.note when present
    - Includes current computed breakdown snapshot

    NOTE: Access control can be tightened later (admin/self only).
    For MVP/dev, this returns explainability for inspection/audit.
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
        meta = _safe_meta(getattr(e, "meta_json", None))
        reason = meta.get("reason") if isinstance(meta, dict) else None
        note = meta.get("note") if isinstance(meta, dict) else None

        events_out.append(
            {
                "id": e.id,
                "event_type": e.event_type,
                "delta": _infer_delta(e.event_type),
                "clan_id": e.clan_id,
                "loan_id": e.loan_id,
                "guarantor_id": e.guarantor_id,
                "actor_user_id": e.actor_user_id,
                "subject_user_id": e.subject_user_id,
                "reason": reason,
                "note": note,
                "created_at": e.created_at,
            }
        )

    return {
        "user_id": int(user_id),
        "protocol_version": PROTOCOL_VERSION,
        "computed": breakdown,
        "events": events_out,
    }