# app/schemas/trust_events.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class TrustEventOut(BaseModel):
    id: int
    event_type: str

    clan_id: Optional[int] = None
    loan_id: Optional[int] = None
    guarantor_id: Optional[int] = None

    actor_user_id: int
    subject_user_id: int
    created_at: datetime

    reason: Optional[str] = None
    note: Optional[str] = None
    meta: dict[str, Any] = {}


class TrustEventsListOut(BaseModel):
    items: list[TrustEventOut]
    total: int