# app/schemas/trust_events.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class TrustEventRowOut(BaseModel):
    id: int
    event_type: str

    clan_id: Optional[int] = None
    loan_id: Optional[int] = None
    guarantor_id: Optional[int] = None

    actor_user_id: int
    subject_user_id: int

    created_at: Optional[datetime] = None

    # Keep meta for full auditability
    meta: Optional[Dict[str, Any]] = None

    # Screenshot-ready fields (pulled from meta when present)
    reason: Optional[str] = None
    note: Optional[str] = None

    class Config:
        from_attributes = True


class TrustEventsListOut(BaseModel):
    items: List[TrustEventRowOut]
    total: int