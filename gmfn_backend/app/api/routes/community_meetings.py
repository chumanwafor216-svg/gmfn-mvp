from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ClanMembership, User
from app.services.community_meeting_service import (
    create_meeting_reminder,
    list_community_meetings,
    record_meeting_summary,
)

router = APIRouter(prefix="/community-meetings", tags=["community-meetings"])


class CommunityMeetingReminderIn(BaseModel):
    clan_id: int = Field(..., ge=1)
    title: str = Field(..., min_length=3, max_length=140)
    scheduled_at: Optional[datetime] = None
    purpose: Optional[str] = Field(default=None, max_length=700)
    attendee_user_ids: Optional[List[int]] = None
    whatsapp_number: Optional[str] = Field(default=None, max_length=40)
    note: Optional[str] = Field(default=None, max_length=500)


class CommunityMeetingSummaryIn(BaseModel):
    clan_id: int = Field(..., ge=1)
    summary: str = Field(..., min_length=5, max_length=2000)
    decisions: Optional[str] = Field(default=None, max_length=1500)
    attendance_count: Optional[int] = Field(default=None, ge=0, le=100000)
    attendee_user_ids: Optional[List[int]] = None
    note: Optional[str] = Field(default=None, max_length=500)


def _require_clan_member(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
) -> ClanMembership:
    is_admin = str(getattr(current_user, "role", "") or "").lower() == "admin"
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if membership:
        return membership
    if is_admin:
        return ClanMembership(
            clan_id=int(clan_id),
            user_id=int(current_user.id),
            role="admin",
        )
    raise HTTPException(status_code=403, detail="You are not a member of this community")


def _require_clan_admin(
    db: Session,
    *,
    clan_id: int,
    current_user: User,
) -> ClanMembership:
    membership = _require_clan_member(
        db,
        clan_id=int(clan_id),
        current_user=current_user,
    )
    is_platform_admin = str(getattr(current_user, "role", "") or "").lower() == "admin"
    is_clan_admin = str(getattr(membership, "role", "") or "").lower() == "admin"
    if not is_platform_admin and not is_clan_admin:
        raise HTTPException(
            status_code=403,
            detail="Only a community admin can manage meeting pack evidence",
        )
    return membership


@router.get("")
def list_meetings(
    clan_id: int = Query(..., ge=1),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_clan_member(db, clan_id=int(clan_id), current_user=current_user)
    meetings = list_community_meetings(
        db,
        clan_id=int(clan_id),
        limit=int(limit),
    )
    return {
        "ok": True,
        "engine_ready": True,
        "clan_id": int(clan_id),
        "meetings": meetings,
    }


@router.post("/reminders")
def create_reminder(
    payload: CommunityMeetingReminderIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_clan_admin(db, clan_id=int(payload.clan_id), current_user=current_user)
    try:
        result = create_meeting_reminder(
            db,
            clan_id=int(payload.clan_id),
            actor_user_id=int(current_user.id),
            title=payload.title,
            scheduled_at=payload.scheduled_at,
            purpose=payload.purpose,
            attendee_user_ids=payload.attendee_user_ids,
            whatsapp_number=payload.whatsapp_number,
            note=payload.note,
        )
    except ValueError as exc:
        status_code = 409 if "credit" in str(exc).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(exc))

    return {
        "ok": True,
        "engine_ready": True,
        **result,
    }


@router.post("/{meeting_id}/summary")
def record_summary(
    meeting_id: str,
    payload: CommunityMeetingSummaryIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_clan_admin(db, clan_id=int(payload.clan_id), current_user=current_user)
    try:
        result = record_meeting_summary(
            db,
            clan_id=int(payload.clan_id),
            meeting_id=str(meeting_id),
            actor_user_id=int(current_user.id),
            summary=payload.summary,
            decisions=payload.decisions,
            attendance_count=payload.attendance_count,
            attendee_user_ids=payload.attendee_user_ids,
            note=payload.note,
        )
    except ValueError as exc:
        status_code = 404 if "not found" in str(exc).lower() else 400
        raise HTTPException(status_code=status_code, detail=str(exc))

    return {
        "ok": True,
        "engine_ready": True,
        **result,
    }
