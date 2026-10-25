from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


SourceKind = Literal[
    "community_invite",
    "community_qr",
    "social_campaign",
    "direct_referral",
    "community_event",
    "other",
]
ParticipantKind = Literal["member", "seller", "advertiser", "community_founder", "other"]


def _clean_text(value: Any, field_name: str) -> Any:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    cleaned = value.strip()
    return cleaned or None


class NetworkGrowthClaimCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    participant_gsn_id: str = Field(min_length=4, max_length=64)
    source_kind: SourceKind
    participant_kind: ParticipantKind = "member"
    source_reference: Optional[str] = Field(default=None, max_length=160)
    evidence_note: Optional[str] = Field(default=None, max_length=500)
    clan_id: Optional[int] = Field(default=None, ge=1)
    invite_id: Optional[int] = Field(default=None, ge=1)

    @field_validator(
        "participant_gsn_id",
        "source_reference",
        "evidence_note",
        mode="before",
    )
    @classmethod
    def clean_text_fields(cls, value: Any, info: Any) -> Any:
        return _clean_text(value, info.field_name)


class NetworkGrowthChallengeIn(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(min_length=5, max_length=500)

    @field_validator("reason", mode="before")
    @classmethod
    def clean_reason(cls, value: Any) -> Any:
        return _clean_text(value, "reason")


class NetworkGrowthPersonOut(BaseModel):
    user_id: int
    gsn_id: Optional[str] = None
    display_name: str


class NetworkGrowthMilestoneOut(BaseModel):
    recorded: bool
    count: int = 0
    first_recorded_at: Optional[datetime] = None
    evidence_source: str


class NetworkGrowthActivationEvidenceOut(BaseModel):
    community_membership: NetworkGrowthMilestoneOut
    shop_created: NetworkGrowthMilestoneOut
    spotlight_campaign_activated: NetworkGrowthMilestoneOut
    protected_trade_recorded: NetworkGrowthMilestoneOut
    boundary: str


class NetworkGrowthAttributionOut(BaseModel):
    id: int
    status: Literal["pending", "accepted", "challenged", "superseded"]
    authority: Literal[
        "awaiting_participant",
        "participant_confirmed",
        "participant_challenged",
        "superseded_by_participant_choice",
    ]
    source_kind: SourceKind
    participant_kind: ParticipantKind
    source_reference: Optional[str] = None
    evidence_note: Optional[str] = None
    source_evidence_status: Literal["claimant_statement", "verified_invite_record"]
    clan_id: Optional[int] = None
    invite_id: Optional[int] = None
    participant: NetworkGrowthPersonOut
    claimant: NetworkGrowthPersonOut
    created_at: datetime
    accepted_at: Optional[datetime] = None
    challenged_at: Optional[datetime] = None
    challenge_reason: Optional[str] = None
    activation_evidence: Optional[NetworkGrowthActivationEvidenceOut] = None
    financial_effect: Literal["none"] = "none"
    financial_boundary: str


class NetworkGrowthMineOut(BaseModel):
    incoming: list[NetworkGrowthAttributionOut]
    outgoing: list[NetworkGrowthAttributionOut]
    financial_effect: Literal["none"] = "none"
    boundary: str
