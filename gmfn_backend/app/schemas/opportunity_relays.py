from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class MarketplaceRelayPolicyIn(BaseModel):
    outbound_enabled: bool
    inbound_enabled: bool

    @field_validator("outbound_enabled", "inbound_enabled", mode="before")
    @classmethod
    def _strict_bool(cls, value):
        if not isinstance(value, bool):
            raise ValueError("relay policy values must be booleans")
        return value


class MarketplaceRelayPolicyOut(BaseModel):
    clan_id: int
    version: int
    outbound_enabled: bool
    inbound_enabled: bool
    issued_at: Optional[datetime] = None
    issued_by_user_id: Optional[int] = None
    defaulted: bool = False


class MarketplaceRelayConsentIn(BaseModel):
    granted: bool

    @field_validator("granted", mode="before")
    @classmethod
    def _strict_bool(cls, value):
        if not isinstance(value, bool):
            raise ValueError("granted must be a boolean")
        return value


class MarketplaceRelayConsentOut(BaseModel):
    request_id: int
    version: int
    granted: bool
    scope: str = "one_hop"
    recorded_at: Optional[datetime] = None
    defaulted: bool = False


class RelayCandidateSummaryOut(BaseModel):
    request_id: int
    has_relay_candidate: bool
    boundary_note: str = (
        "Candidate communities and supply details stay hidden until a legitimate bridge accepts."
    )


class OpportunityRelayRunOut(BaseModel):
    relay_run_id: int
    source_type: str
    source_id: int
    status: str
    privacy_mode: str
    response_window_seconds: int
    offered_at: datetime
    expires_at: datetime
    boundary_crossed_at: Optional[datetime] = None
    boundary_note: str


class OpportunityRelayOfferOut(BaseModel):
    offer_id: int
    relay_run_id: int
    status: str
    source_type: str
    opportunity_category: str
    opportunity_area: Optional[str] = None
    opportunity_context: str
    privacy_mode: str
    offered_at: datetime
    expires_at: datetime
    actions: list[str] = Field(default_factory=list)
    not_recommendation: bool = True
    not_endorsement: bool = True
    not_payment_proof: bool = True


class OpportunityRelayOfferListOut(BaseModel):
    count: int
    offers: list[OpportunityRelayOfferOut] = Field(default_factory=list)
    boundary_note: str = (
        "Relay offers ask for consent to move an opportunity across one boundary. "
        "They do not expose endpoint identities or create portable trust evidence."
    )


class OpportunityRelayDeclineIn(BaseModel):
    decline_reason: Optional[str] = Field(default=None, max_length=120)
