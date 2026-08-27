from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ClanMembership, User
from app.services.community_meeting_service import (
    COMMUNITY_MEETING_ATTENDANCE_METHODS,
    create_meeting_reminder,
    list_community_meetings,
    open_meeting_attendance_session,
    record_meeting_attendance_checkin,
    record_meeting_interest,
    record_meeting_summary,
)

router = APIRouter(prefix="/community-meetings", tags=["community-meetings"])


def _reject_bool_identifier(value: Any, field_name: str) -> Any:
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be an integer id, not a boolean.")
    if isinstance(value, float):
        raise ValueError(f"{field_name} must be an integer id, not a float.")
    return value


def _reject_bool_integer(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if isinstance(value, bool):
        raise ValueError(f"{field_name} must be an integer, not a boolean.")
    if isinstance(value, float):
        raise ValueError(f"{field_name} must be an integer, not a float.")
    return value


def _reject_non_text_value(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    return value


def _reject_non_datetime_string(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be an ISO datetime string.")
    return value


def _reject_bool_identifier_list(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, list):
        return value
    for item in value:
        _reject_bool_identifier(item, field_name)
    return value


class CommunityMeetingReminderIn(BaseModel):
    clan_id: int = Field(..., ge=1)
    title: str = Field(..., min_length=3, max_length=140)
    scheduled_at: Optional[datetime] = None
    purpose: Optional[str] = Field(default=None, max_length=700)
    attendee_user_ids: Optional[List[int]] = None
    whatsapp_number: Optional[str] = Field(default=None, max_length=40)
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("clan_id", mode="before")
    @classmethod
    def _reject_bool_ids(cls, value: Any) -> Any:
        return _reject_bool_identifier(value, "clan_id")

    @field_validator("attendee_user_ids", mode="before")
    @classmethod
    def _reject_bool_attendee_ids(cls, value: Any) -> Any:
        return _reject_bool_identifier_list(value, "attendee_user_ids")

    @field_validator("title", "purpose", "whatsapp_number", "note", mode="before")
    @classmethod
    def _reject_non_text_reminder_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)

    @field_validator("scheduled_at", mode="before")
    @classmethod
    def _reject_scheduled_at_boundary_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_datetime_string(value, info.field_name)


class CommunityMeetingInterestIn(BaseModel):
    clan_id: int = Field(..., ge=1)
    response: str = Field(..., min_length=2, max_length=12)
    note: Optional[str] = Field(default=None, max_length=300)

    @field_validator("clan_id", mode="before")
    @classmethod
    def _reject_bool_ids(cls, value: Any) -> Any:
        return _reject_bool_identifier(value, "clan_id")

    @field_validator("response", "note", mode="before")
    @classmethod
    def _reject_non_text_interest_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


class CommunityMeetingSummaryIn(BaseModel):
    clan_id: int = Field(..., ge=1)
    summary: str = Field(..., min_length=5, max_length=2000)
    decisions: Optional[str] = Field(default=None, max_length=1500)
    attendance_count: Optional[int] = Field(default=None, ge=0, le=100000)
    attendee_user_ids: Optional[List[int]] = None
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("clan_id", "attendance_count", mode="before")
    @classmethod
    def _reject_bool_summary_numbers(cls, value: Any, info: Any) -> Any:
        if info.field_name == "clan_id":
            return _reject_bool_identifier(value, info.field_name)
        return _reject_bool_integer(value, info.field_name)

    @field_validator("attendee_user_ids", mode="before")
    @classmethod
    def _reject_bool_attendee_ids(cls, value: Any) -> Any:
        return _reject_bool_identifier_list(value, "attendee_user_ids")

    @field_validator("summary", "decisions", "note", mode="before")
    @classmethod
    def _reject_non_text_summary_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


class CommunityMeetingAttendanceSessionIn(BaseModel):
    clan_id: int = Field(..., ge=1)
    method: str = Field(default="qr", min_length=2, max_length=40)
    window_minutes: int = Field(default=120, ge=5, le=720)
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("clan_id", mode="before")
    @classmethod
    def _reject_bool_ids(cls, value: Any) -> Any:
        return _reject_bool_identifier(value, "clan_id")

    @field_validator("window_minutes", mode="before")
    @classmethod
    def _reject_bool_window(cls, value: Any) -> Any:
        return _reject_bool_integer(value, "window_minutes")

    @field_validator("method", "note", mode="before")
    @classmethod
    def _reject_non_text_attendance_session_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)

    @field_validator("method")
    @classmethod
    def _enforce_known_method(cls, value: str) -> str:
        method = str(value or "").strip().lower()
        if method not in COMMUNITY_MEETING_ATTENDANCE_METHODS:
            raise ValueError("Attendance method is not supported for meeting evidence.")
        return method


class CommunityMeetingAttendanceCheckinIn(BaseModel):
    clan_id: int = Field(..., ge=1)
    attendance_token: str = Field(..., min_length=8, max_length=140)
    method: str = Field(default="qr", min_length=2, max_length=40)
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("clan_id", mode="before")
    @classmethod
    def _reject_bool_ids(cls, value: Any) -> Any:
        return _reject_bool_identifier(value, "clan_id")

    @field_validator("attendance_token", "method", "note", mode="before")
    @classmethod
    def _reject_non_text_checkin_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)

    @field_validator("method")
    @classmethod
    def _enforce_known_method(cls, value: str) -> str:
        method = str(value or "").strip().lower()
        if method not in COMMUNITY_MEETING_ATTENDANCE_METHODS:
            raise ValueError("Attendance method is not supported for meeting evidence.")
        return method


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
        viewer_user_id=int(current_user.id),
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



@router.post("/{meeting_id}/attendance-sessions")
def open_attendance_session(
    meeting_id: str,
    payload: CommunityMeetingAttendanceSessionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_clan_admin(db, clan_id=int(payload.clan_id), current_user=current_user)
    try:
        result = open_meeting_attendance_session(
            db,
            clan_id=int(payload.clan_id),
            meeting_id=str(meeting_id),
            actor_user_id=int(current_user.id),
            method=payload.method,
            window_minutes=int(payload.window_minutes),
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


@router.post("/{meeting_id}/attendance-check-ins")
def record_attendance_checkin(
    meeting_id: str,
    payload: CommunityMeetingAttendanceCheckinIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_clan_member(db, clan_id=int(payload.clan_id), current_user=current_user)
    try:
        result = record_meeting_attendance_checkin(
            db,
            clan_id=int(payload.clan_id),
            meeting_id=str(meeting_id),
            actor_user_id=int(current_user.id),
            attendance_token=payload.attendance_token,
            method=payload.method,
            note=payload.note,
        )
    except ValueError as exc:
        message = str(exc).lower()
        status_code = 404 if "not found" in message else 409 if "closed" in message or "invalid" in message else 400
        raise HTTPException(status_code=status_code, detail=str(exc))

    return {
        "ok": True,
        "engine_ready": True,
        **result,
    }


@router.post("/{meeting_id}/interest")
def record_interest(
    meeting_id: str,
    payload: CommunityMeetingInterestIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _require_clan_member(db, clan_id=int(payload.clan_id), current_user=current_user)
    try:
        result = record_meeting_interest(
            db,
            clan_id=int(payload.clan_id),
            meeting_id=str(meeting_id),
            actor_user_id=int(current_user.id),
            response=payload.response,
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
