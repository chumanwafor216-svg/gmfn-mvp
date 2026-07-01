from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


def _reject_non_text_value(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    return value


def _reject_bool_integer(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be an integer, not a boolean.")
    if isinstance(value, float):
        raise ValueError(f"{field_name} must be an integer, not a float.")
    return value


class ClanInviteRelationshipEvidence(BaseModel):
    evidence_source: Optional[str] = Field(default=None, max_length=80)
    invitation_context: Optional[str] = Field(default=None, max_length=80)
    relationship_type: Optional[str] = Field(default=None, max_length=80)
    known_duration: Optional[str] = Field(default=None, max_length=80)
    confidence_level: Optional[str] = Field(default=None, max_length=40)
    relationship_context: Optional[str] = Field(default=None, max_length=500)
    first_circle_role: Optional[str] = Field(default=None, max_length=80)
    first_circle_ready_count: Optional[int] = Field(default=None, ge=0, le=1000)
    first_circle_selected_count: Optional[int] = Field(default=None, ge=0, le=1000)

    @field_validator(
        "evidence_source",
        "invitation_context",
        "relationship_type",
        "known_duration",
        "confidence_level",
        "relationship_context",
        "first_circle_role",
        mode="before",
    )
    @classmethod
    def _reject_non_text_relationship_evidence(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)

    @field_validator(
        "first_circle_ready_count",
        "first_circle_selected_count",
        mode="before",
    )
    @classmethod
    def _reject_bool_relationship_counts(cls, value: Any, info: Any) -> Any:
        return _reject_bool_integer(value, info.field_name)


class ClanInviteCreate(BaseModel):
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = Field(default=None, ge=1)
    relationship_evidence: Optional[ClanInviteRelationshipEvidence] = None

    @field_validator("max_uses", mode="before")
    @classmethod
    def _reject_bool_max_uses(cls, value: Any) -> Any:
        return _reject_bool_integer(value, "max_uses")


class ClanInviteOut(BaseModel):
    id: int
    clan_id: int
    created_by_user_id: int
    code: str
    is_active: bool
    max_uses: Optional[int] = None
    uses: int
    created_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    share_link: Optional[str] = None
    api_link: Optional[str] = None

    model_config = {"from_attributes": True}


class JoinByInviteIn(BaseModel):
    code: str

    @field_validator("code", mode="before")
    @classmethod
    def _reject_non_text_code(cls, value: Any) -> Any:
        return _reject_non_text_value(value, "code")


class JoinByInviteOut(BaseModel):
    clan_id: int
    clan_name: str
    membership_id: int
    user_id: Optional[int] = None
    gmfn_id: Optional[str] = None
    result_status: str = "joined_successfully"
    existing_identity: bool = True
    identity_reused: bool = True


class InvitePreviewOut(BaseModel):
    code: str
    clan_id: int
    clan_name: str
    is_active: bool
    uses: int
    max_uses: Optional[int] = None
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class InviteRevokeOut(BaseModel):
    code: str
    is_active: bool
    revoked_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
