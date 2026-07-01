from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


def _reject_non_text_value(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    return value


def _reject_bool_identifier(value: Any, field_name: str) -> Any:
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be an integer id, not a boolean.")
    if isinstance(value, float):
        raise ValueError(f"{field_name} must be an integer id, not a float.")
    return value


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

    @field_validator("invite_code", mode="before")
    @classmethod
    def _reject_non_text_invite_code(cls, value: Any) -> Any:
        return _reject_non_text_value(value, "invite_code")


class JoinByInviteOut(BaseModel):
    ok: bool
    clan_id: int
    clan_name: Optional[str] = None
    joined_user_id: int
    message: str
    gmfn_id: Optional[str] = None
    membership_id: Optional[int] = None
    result_status: str = "joined_successfully"
    existing_identity: bool = True
    identity_reused: bool = True


class ActiveCommunityOut(BaseModel):
    active_clan_id: Optional[int] = None
    active_clan_name: Optional[str] = None
    membership_role: Optional[str] = None


class SetActiveCommunityIn(BaseModel):
    clan_id: int

    @field_validator("clan_id", mode="before")
    @classmethod
    def _reject_bool_clan_id(cls, value: Any) -> Any:
        return _reject_bool_identifier(value, "clan_id")


class SetActiveCommunityOut(BaseModel):
    ok: bool
    active_clan_id: int
    active_clan_name: Optional[str] = None
    membership_role: Optional[str] = None
    message: str
