from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel


class InviteAnalyticsSummaryOut(BaseModel):
    clan_id: int
    from_dt: Optional[datetime] = None
    to_dt: Optional[datetime] = None

    invites_created: int
    invites_revoked: int
    joins_via_invite: int
    unique_invites_used: int
    conversion_rate: float


class TopInviterRowOut(BaseModel):
    invited_by_user_id: int
    invited_by_email: Optional[str] = None
    joins: int


class InviteUsageRowOut(BaseModel):
    invite_code: str
    joins: int
    last_used_at: Optional[datetime] = None


class InviteAnalyticsOut(BaseModel):
    summary: InviteAnalyticsSummaryOut
    top_inviters: list[TopInviterRowOut]
    top_invite_codes: list[InviteUsageRowOut]


class RecentInviteJoinRowOut(BaseModel):
    joined_at: datetime
    invite_code: str

    invited_by_user_id: Optional[int] = None
    invited_by_email: Optional[str] = None

    joined_user_id: int
    joined_user_email: Optional[str] = None


class TrustEventRowOut(BaseModel):
    created_at: datetime
    event_type: str

    actor_user_id: Optional[int] = None
    actor_email: Optional[str] = None

    subject_user_id: Optional[int] = None
    subject_email: Optional[str] = None

    clan_id: Optional[int] = None
    loan_id: Optional[int] = None
    guarantor_id: Optional[int] = None

    meta: Optional[dict[str, Any]] = None
