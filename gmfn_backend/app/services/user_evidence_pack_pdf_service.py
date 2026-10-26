from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db.models import User, TrustEvent
from app.services.institutional_pdf import utc_generated_label
from app.services.trust_score_service import compute_trust_score_explained, trust_band_for_score
from app.services.user_evidence_pack_pdf_layout import build_member_evidence_document


MEMBER_EVIDENCE_EVENT_TYPES = (
    "loan.created",
    "guarantor.requested",
    "guarantor.decided",
    "repayment.made",
    "repayment.claimed",
    "repayment.created",
    "repayment.auto_applied",
    "loan.repaid",
    "repayment.reversed",
    "loan_fully_repaid_reversed",
    "guarantor_success_reversed",
    "loan.auto_approved_by_guarantors",
    "clan_join_via_invite",
    "trust.score_updated",
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _loads_meta(meta_json: Optional[str]) -> dict[str, Any]:
    if not meta_json:
        return {}
    try:
        return json.loads(meta_json)
    except Exception:
        return {}


def build_user_evidence_pack_pdf(
    db: Session,
    *,
    user_id: int,
    redact: bool = True,
    days: int = 30,
) -> bytes:
    user = db.get(User, user_id)
    if not user:
        raise ValueError("User not found")

    gsn_id = getattr(user, "gmfn_id", None) or "GSN member reference unavailable"

    # trust snapshot (stored + fallback compute)
    score = getattr(user, "trust_score", None)
    band = getattr(user, "trust_band", None)
    updated_at = getattr(user, "trust_score_updated_at", None)
    breakdown = {}
    if getattr(user, "trust_breakdown_json", None):
        try:
            breakdown = json.loads(user.trust_breakdown_json)
        except Exception:
            breakdown = {}

    if score is None:
        computed = compute_trust_score_explained(db, user_id=int(user.id))
        score = computed.get("score", 50)
        breakdown = computed.get("breakdown") or breakdown
    score = int(score or 50)
    if band is None:
        band = trust_band_for_score(score)[0]

    # recent trust-relevant events
    since = _utcnow() - timedelta(days=int(days))
    rows = (
        db.query(TrustEvent)
        .filter((TrustEvent.actor_user_id == int(user.id)) | (TrustEvent.subject_user_id == int(user.id)))
        .filter(TrustEvent.created_at >= since)
        .filter(TrustEvent.event_type.in_(MEMBER_EVIDENCE_EVENT_TYPES))
        .order_by(TrustEvent.created_at.desc())
        .limit(50)
        .all()
    )

    category_summary: list[tuple[str, Any]] = []
    counts = breakdown.get("counts") if isinstance(breakdown, dict) else None
    if isinstance(counts, dict):
        for key, label in [
            ("full_repayments", "Full repayments"),
            ("guarantor_success", "Support completed"),
            ("missed_payments", "Missed payments"),
            ("defaults", "Defaults"),
        ]:
            if key in counts:
                category_summary.append((label, counts.get(key)))
    else:
        for key, label in [
            ("invite", "Community entry evidence"),
            ("guarantor", "Support evidence"),
            ("repayment", "Repayment evidence"),
            ("participation", "Participation evidence"),
            ("penalties", "Caution adjustment"),
        ]:
            value = breakdown.get(key) if isinstance(breakdown, dict) else None
            if value is None:
                continue
            if isinstance(value, dict):
                value = value.get("total", "Available in the complete member record")
            elif isinstance(value, (list, tuple, set)):
                value = f"{len(value)} recorded items"
            category_summary.append((label, value))

    event_rows: list[dict[str, Any]] = []
    for row in rows:
        meta = _loads_meta(getattr(row, "meta_json", None))
        context: list[str] = []
        if getattr(row, "loan_id", None):
            context.append("Private support record")
        if meta.get("source"):
            context.append("GSN member record")
        event_rows.append(
            {
                "created_at": getattr(row, "created_at", None),
                "event_type": getattr(row, "event_type", None),
                "context": " / ".join(context) or "GSN member record",
            }
        )

    return build_member_evidence_document(
        member_reference=gsn_id,
        score=score,
        band=str(band),
        updated_at=updated_at,
        category_summary=category_summary,
        events=event_rows,
        days=int(days),
        redact=bool(redact),
        generated_at=utc_generated_label(),
    )
