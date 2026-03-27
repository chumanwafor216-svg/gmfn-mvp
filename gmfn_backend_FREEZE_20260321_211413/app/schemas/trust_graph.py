from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class TrustGraphEdgeOut(BaseModel):
    edge_type: str
    source_user_id: int
    source_gmfn_id: Optional[str] = None
    target_user_id: int
    target_gmfn_id: Optional[str] = None

    clan_id: Optional[int] = None
    loan_id: Optional[int] = None

    weight: str = "0.00"
    confidence: str = "0.00"
    event_count: int = 0

    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None

    provenance: list[str] = Field(default_factory=list)
    meta: dict[str, Any] = Field(default_factory=dict)


class TrustGraphSummaryOut(BaseModel):
    user_id: int
    gmfn_id: Optional[str] = None
    email: Optional[str] = None

    active_clan_count: int = 0
    sponsor_count: int = 0
    inbound_trust_edges: int = 0
    outbound_trust_edges: int = 0
    unique_counterparties: int = 0

    repayment_edge_count: int = 0
    guarantee_edge_count: int = 0
    invite_edge_count: int = 0
    merchant_edge_count: int = 0

    graph_score: str = "0.00"
    cci_score: str = "0.00"
    risk_flags: list[str] = Field(default_factory=list)

    explainability: dict[str, Any] = Field(default_factory=dict)


class TrustGraphNodeOut(BaseModel):
    user_id: int
    gmfn_id: Optional[str] = None
    email: Optional[str] = None
    phone_verified: bool = False
    trust_score: Optional[int] = None
    trust_band: Optional[str] = None
    summary: TrustGraphSummaryOut
    edges: list[TrustGraphEdgeOut] = Field(default_factory=list)


class TrustGraphCciOut(BaseModel):
    user_id: int
    gmfn_id: Optional[str] = None
    cci_score: str = "0.00"
    graph_score: str = "0.00"
    sponsor_count: int = 0
    active_clan_count: int = 0
    unique_counterparties: int = 0
    risk_flags: list[str] = Field(default_factory=list)
    explainability: dict[str, Any] = Field(default_factory=dict)
    