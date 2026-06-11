# app/api/routes/trust_events.py
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ClanMembership, User
from app.schemas.trust_events import TrustEventsListOut
from app.services.trust_events_services import build_trust_meta, log_trust_event
from app.services.trust_events_query_service import list_recent_admin, list_recent_for_subject

router = APIRouter(tags=["trust-events"])


FOCUS_COMMITMENT_EVENT_TYPES = {
    "created": "commitment.created",
    "checkin": "commitment.checkin",
    "milestone": "commitment.milestone",
    "replan": "commitment.replanned",
    "complete": "commitment.completed",
    "missed-reported": "commitment.missed_reported",
}


class FocusCommitmentTrustEventIn(BaseModel):
    clan_id: Optional[int] = None
    local_commitment_id: str = Field(..., min_length=1, max_length=80)
    local_event_id: str = Field(..., min_length=1, max_length=80)
    event_kind: str = Field(..., min_length=1, max_length=32)
    title: str = Field(..., min_length=1, max_length=160)
    category: Optional[str] = Field(default=None, max_length=40)
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    progress_value: Optional[float] = None
    unit: Optional[str] = Field(default=None, max_length=40)
    due_date: Optional[str] = Field(default=None, max_length=40)
    cadence: Optional[str] = Field(default=None, max_length=40)
    note: Optional[str] = Field(default=None, max_length=500)


@router.get("/trust-events/me", response_model=TrustEventsListOut)
def trust_events_me(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = list_recent_for_subject(db, subject_user_id=int(current_user.id), limit=limit)
    return {"items": items, "total": len(items)}


@router.post("/trust-events/me/focus-commitment")
def record_focus_commitment_trust_event(
    payload: FocusCommitmentTrustEventIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    event_kind = (payload.event_kind or "").strip().lower()
    event_type = FOCUS_COMMITMENT_EVENT_TYPES.get(event_kind)
    if not event_type:
        raise HTTPException(status_code=400, detail="Unsupported commitment event kind")

    local_event_id = payload.local_event_id.strip()
    local_commitment_id = payload.local_commitment_id.strip()
    dedupe_key = f"focus:{int(current_user.id)}:{local_event_id}"[:64]
    safe_clan_id = None
    if payload.clan_id:
        membership = (
            db.query(ClanMembership.id)
            .filter(ClanMembership.clan_id == int(payload.clan_id))
            .filter(ClanMembership.user_id == int(current_user.id))
            .first()
        )
        if membership:
            safe_clan_id = int(payload.clan_id)

    event = log_trust_event(
        db,
        event_type=event_type,
        clan_id=safe_clan_id,
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        meta=build_trust_meta(
            reason=f"focus_commitment_{event_kind}",
            note=payload.note,
            trust_delta="0.00",
            system=False,
            extra={
                "source": "dashboard_focus_commitment",
                "local_commitment_id": local_commitment_id,
                "local_event_id": local_event_id,
                "title": payload.title.strip(),
                "category": payload.category,
                "target_value": payload.target_value,
                "current_value": payload.current_value,
                "progress_value": payload.progress_value,
                "unit": payload.unit,
                "due_date": payload.due_date,
                "cadence": payload.cadence,
                "reader_note": (
                    "This is a personal commitment event recorded by the member. "
                    "It supports follow-through evidence, but it is not the same as a verified payment."
                ),
            },
        ),
        dedupe_key=dedupe_key,
    )

    return {
        "ok": True,
        "event_id": int(event.id),
        "event_type": event.event_type,
        "dedupe_key": dedupe_key,
    }


@router.get("/admin/trust-events/recent", response_model=TrustEventsListOut)
def admin_recent_trust_events(
    limit: int = 50,
    clan_id: Optional[int] = None,
    user_id: Optional[int] = None,
    loan_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if (getattr(current_user, "role", "") or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    items = list_recent_admin(
        db,
        limit=limit,
        clan_id=clan_id,
        subject_user_id=user_id,
        loan_id=loan_id,
    )
    return {"items": items, "total": len(items)}
