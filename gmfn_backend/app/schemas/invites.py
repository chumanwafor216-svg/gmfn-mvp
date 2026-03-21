from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ClanInviteCreate(BaseModel):
    expires_at: Optional[datetime] = None
    max_uses: Optional[int] = Field(default=None, ge=1)


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