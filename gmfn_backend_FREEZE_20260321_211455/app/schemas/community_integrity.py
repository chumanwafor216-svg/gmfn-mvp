from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class InviteAuditOut(BaseModel):
    id: int
    clan_id: int
    clan_name: Optional[str] = None
    created_by_user_id: Optional[int] = None
    invite_code: str
    created_at: str
    expires_at: str
    is_expired: bool
    seconds_until_expiry: int


class JoinByInviteIn(BaseModel):
    invite_code: str = Field(min_length=3, max_length=255)


class JoinByInviteOut(BaseModel):
    ok: bool
    clan_id: int
    clan_name: Optional[str] = None
    joined_user_id: int
    message: str


class ActiveCommunityOut(BaseModel):
    active_clan_id: Optional[int] = None
    active_clan_name: Optional[str] = None
    membership_role: Optional[str] = None


class SetActiveCommunityIn(BaseModel):
    clan_id: int


class SetActiveCommunityOut(BaseModel):
    ok: bool
    active_clan_id: int
    active_clan_name: Optional[str] = None
    membership_role: Optional[str] = None
    message: str