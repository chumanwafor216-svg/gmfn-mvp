from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.trust_events_services import log_trust_event

from app.core.trust_policy import RULES, policy_version, infer_delta_str, rule_label, rule_kind

router = APIRouter(prefix="/admin/trust-events", tags=["admin"])


@router.post("/manual")
def admin_manual_trust_event(
    subject_user_id: int = Query(..., ge=1),
    event_type: str = Query(..., min_length=1),
    clan_id: Optional[int] = Query(default=None, ge=1),
    loan_id: Optional[int] = Query(default=None, ge=1),
    guarantor_id: Optional[int] = Query(default=None, ge=1),
    reason: Optional[str] = None,
    note: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Manual trust event injector (pilot/admin only).
    Enables negative events + markers with an evidence trail.
    """
    if (getattr(current_user, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    et = (event_type or "").strip().lower()
    if et not in RULES:
        raise HTTPException(status_code=400, detail="Unknown event_type for current policy")

    meta = {
        "system": False,
        "policy_version": policy_version(),
        "delta": infer_delta_str(et),
        "rule_label": rule_label(et),
        "rule_kind": rule_kind(et),
        "reason": (reason or et).strip(),
        "note": (note or "").strip() or None,
        "pilot_admin": True,
    }

    log_trust_event(
        db,
        event_type=et,
        clan_id=int(clan_id) if clan_id is not None else None,
        loan_id=int(loan_id) if loan_id is not None else None,
        guarantor_id=int(guarantor_id) if guarantor_id is not None else None,
        actor_user_id=int(current_user.id),
        subject_user_id=int(subject_user_id),
        meta=meta,
    )

    db.commit()
    return {"ok": True, "event_type": et, "subject_user_id": int(subject_user_id), "meta": meta}
