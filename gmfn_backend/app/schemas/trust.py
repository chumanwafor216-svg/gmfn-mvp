from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class TrustScoreOut(BaseModel):
    user_id: int
    score: int
    band: Optional[str] = None
    guidance: Optional[str] = None
    updated_at: Optional[datetime] = None
    breakdown: Dict[str, Any]


class TrustScoreHistoryPoint(BaseModel):
    created_at: datetime
    score: int
    band: Optional[str] = None


class TrustScoreHistoryOut(BaseModel):
    user_id: int
    days: int
    items: List[TrustScoreHistoryPoint]
    total: int


class TrustChangeOut(BaseModel):
    created_at: datetime
    event_type: str
    delta: int
    description: str
    loan_id: Optional[int] = None
    clan_id: Optional[int] = None


class TrustChangesOut(BaseModel):
    user_id: int
    items: List[TrustChangeOut]
    total: int
