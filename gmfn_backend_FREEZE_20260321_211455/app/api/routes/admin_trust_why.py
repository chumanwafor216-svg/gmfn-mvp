# app/api/routes/admin_trust_why.py
from __future__ import annotations

import json
from decimal import Decimal
from typing import Any, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.constants import PROTOCOL_VERSION
from app.db.database import get_db
from app.db.models import TrustEvent, User
from app.services.trust_score_service import apply_trust_score, compute_trust_breakdown

router = APIRouter(prefix="/admin/trust", tags=["admin"])

ExplainMode = Literal["minimal", "standard", "detailed"]


def _safe_meta(meta_json: Optional[str]) -> dict[str, Any]:
    if not meta_json:
        return {}
    try:
        v = json.loads(meta_json)
        return v if isinstance(v, dict) else {}
    except Exception:
        return {}


def _infer_delta(event_type: str) -> Optional[Decimal]:
    t = (event_type or "").lower()
    if t in {"repayment.confirmed", "loan.repaid", "repayment.completed"}:
        return Decimal("0.10")
    if t in {"guarantor.repayment.confirmed", "guarantor.support.confirmed"}:
        return Decimal("0.03")
    return None


@router.get("/why/{user_id}")
def admin_trust_why(
    user_id: int,
    limit: int = 10,
    mode: ExplainMode = "standard",
    event_type: Optional[str] = None,
    clan_id: Optional[int] = None,
    loan_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    if (current_user.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    lim = max(1, min(int(limit or 10), 50))

    u = db.get(User, int(user_id))
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    # Deterministic snapshot
    apply_trust_score(db, user_id=int(user_id))
    breakdown = compute_trust_breakdown(db, user_id=int(user_id))

    q = db.query(TrustEvent).filter(TrustEvent.subject_user_id == int(user_id))
    if event_type:
        q = q.filter(TrustEvent.event_type == event_type)
    if clan_id is not None:
        q = q.filter(TrustEvent.clan_id == int(clan_id))
    if loan_id is not None:
        q = q.filter(TrustEvent.loan_id == int(loan_id))

    rows = (
        q.order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(lim)
        .all()
    )

    items: list[dict[str, Any]] = []
    for e in rows:
        meta = _safe_meta(getattr(e, "meta_json", None))
        d = _infer_delta(getattr(e, "event_type", "") or "")
        items.append(
            {
                "id": e.id,
                "event_type": e.event_type,
                "delta": str(d) if d is not None else None,
                "clan_id": e.clan_id,
                "loan_id": e.loan_id,
                "guarantor_id": e.guarantor_id,
                "actor_user_id": e.actor_user_id,
                "subject_user_id": e.subject_user_id,
                "reason": meta.get("reason"),
                "note": meta.get("note"),
                "created_at": e.created_at,
                "meta": meta if mode == "detailed" else None,
            }
        )

    if mode == "minimal":
        items = [
            {"id": x.get("id"), "event_type": x.get("event_type"), "delta": x.get("delta"), "created_at": x.get("created_at")}
            for x in items
        ]
    elif mode == "standard":
        for x in items:
            x.pop("meta", None)

    return {
        "user_id": int(user_id),
        "protocol_version": PROTOCOL_VERSION,
        "computed": breakdown,
        "events": items,
    }