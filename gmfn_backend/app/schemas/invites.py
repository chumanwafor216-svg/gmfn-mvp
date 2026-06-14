from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


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


class ClanInviteCreate(BaseModel):
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = Field(default=None, ge=1)
    relationship_evidence: Optional[ClanInviteRelationshipEvidence] = None


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
