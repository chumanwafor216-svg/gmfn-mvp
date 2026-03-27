from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class TrustEventExplainOut(BaseModel):
    id: int
    user_id: int
    event_type: str
    delta: str
    created_at: str
    reason: Optional[str] = None
    note: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)


class TrustExplainOut(BaseModel):
    user_id: int
    current_score: str
    band: str
    latest_reason: Optional[str] = None
    latest_note: Optional[str] = None
    latest_source: Optional[str] = None
    recent_events: List[TrustEventExplainOut] = Field(default_factory=list)


class AdminRecentTrustEventOut(BaseModel):
    id: int
    user_id: int
    user_label: Optional[str] = None
    event_type: str
    delta: str
    created_at: str
    reason: Optional[str] = None
    note: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict)