from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import (
    Clan,
    ClanMembership,
    SupportCase,
    SupportCaseAttachment,
    SupportCaseMessage,
    User,
)
from app.services.notification_service import create_notification

router = APIRouter(prefix="/support-cases", tags=["support-cases"])

SUPPORT_CASE_STATUSES = {"waiting_admin", "waiting_user", "resolved"}
SUPPORT_CASE_ISSUE_TYPES = {
    "sign_in",
    "payment",
    "community",
    "shop",
    "marketplace",
    "trust",
    "technical",
    "other",
}
SUPPORT_CASE_UPLOAD_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
}
MAX_SUPPORT_UPLOAD_BYTES = 8 * 1024 * 1024


class SupportCaseCreateIn(BaseModel):
    issue_type: Literal[
        "sign_in",
        "payment",
        "community",
        "shop",
        "marketplace",
        "trust",
        "technical",
        "other",
    ] = "other"
    subject: str = Field(..., min_length=3, max_length=160)
    message: str = Field(..., min_length=3, max_length=2000)
    clan_id: Optional[int] = Field(default=None, ge=1)
    source_path: Optional[str] = Field(default=None, max_length=512)

    @field_validator("subject", "message", "source_path", mode="before")
    @classmethod
    def _reject_non_text(cls, value: Any, info: Any) -> Any:
        if value is None:
            return value
        if not isinstance(value, str):
            raise ValueError(f"{info.field_name} must be text.")
        return value

    @field_validator("subject", "message", "source_path")
    @classmethod
    def _strip_text(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return str(value).strip()


class SupportCaseMessageIn(BaseModel):
    body: str = Field(..., min_length=2, max_length=2000)

    @field_validator("body", mode="before")
    @classmethod
    def _reject_non_text(cls, value: Any) -> Any:
        if not isinstance(value, str):
            raise ValueError("body must be text.")
        return value

    @field_validator("body")
    @classmethod
    def _strip_body(cls, value: str) -> str:
        return value.strip()


class SupportCaseStatusIn(BaseModel):
    status: Literal["waiting_admin", "waiting_user", "resolved"]
    note: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("note", mode="before")
    @classmethod
    def _reject_non_text_note(cls, value: Any) -> Any:
        if value is None:
            return value
        if not isinstance(value, str):
            raise ValueError("note must be text.")
        return value

    @field_validator("note")
    @classmethod
    def _strip_note(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip() or None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _safe_str(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text if text else fallback


def _is_admin(user: Any) -> bool:
    return _safe_str(getattr(user, "role", "")).lower() == "admin" or bool(
        getattr(user, "is_admin", False)
    )


def _display_user(user: Optional[User]) -> str:
    if not user:
        return "GSN member"
    return _safe_str(
        getattr(user, "display_name", None)
        or getattr(user, "gmfn_id", None)
        or getattr(user, "email", None),
        "GSN member",
    )


def _user_payload(user: Optional[User]) -> dict[str, Any]:
    if not user:
        return {"id": None, "label": "GSN member", "gmfn_id": None, "email": None}
    return {
        "id": int(user.id),
        "label": _display_user(user),
        "gmfn_id": _safe_str(getattr(user, "gmfn_id", None)) or None,
        "email": _safe_str(getattr(user, "email", None)) or None,
    }


def _case_public_id() -> str:
    return f"GSN-HELP-{uuid4().hex[:10].upper()}"


def _attachment_payload(row: SupportCaseAttachment) -> dict[str, Any]:
    return {
        "id": int(row.id),
        "support_case_id": int(row.support_case_id),
        "message_id": int(row.message_id) if row.message_id is not None else None,
        "uploaded_by_user_id": int(row.uploaded_by_user_id),
        "file_name": _safe_str(row.file_name),
        "content_type": _safe_str(row.content_type),
        "url": _safe_str(row.url),
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _message_payload(row: SupportCaseMessage, attachments: list[SupportCaseAttachment]) -> dict[str, Any]:
    return {
        "id": int(row.id),
        "support_case_id": int(row.support_case_id),
        "author_user_id": int(row.author_user_id),
        "author_role": _safe_str(row.author_role, "user"),
        "author": _user_payload(row.author),
        "body": _safe_str(row.body),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "attachments": [_attachment_payload(item) for item in attachments if item.message_id == row.id],
    }


def _case_payload(db: Session, row: SupportCase, *, include_thread: bool = False) -> dict[str, Any]:
    clan = row.clan or (db.get(Clan, int(row.clan_id)) if row.clan_id else None)
    messages = []
    attachments = []
    if include_thread:
        messages = (
            db.query(SupportCaseMessage)
            .filter(SupportCaseMessage.support_case_id == int(row.id))
            .order_by(SupportCaseMessage.created_at.asc(), SupportCaseMessage.id.asc())
            .all()
        )
        attachments = (
            db.query(SupportCaseAttachment)
            .filter(SupportCaseAttachment.support_case_id == int(row.id))
            .order_by(SupportCaseAttachment.created_at.asc(), SupportCaseAttachment.id.asc())
            .all()
        )
    else:
        attachments = (
            db.query(SupportCaseAttachment)
            .filter(SupportCaseAttachment.support_case_id == int(row.id))
            .order_by(SupportCaseAttachment.created_at.asc(), SupportCaseAttachment.id.asc())
            .all()
        )
    return {
        "id": int(row.id),
        "public_id": _safe_str(row.public_id),
        "requester_user_id": int(row.requester_user_id),
        "requester": _user_payload(row.requester),
        "clan_id": int(row.clan_id) if row.clan_id is not None else None,
        "community": {
            "id": int(clan.id),
            "name": _safe_str(getattr(clan, "name", None)),
            "community_code": _safe_str(getattr(clan, "community_code", None)) or None,
        }
        if clan
        else None,
        "assigned_admin_user_id": int(row.assigned_admin_user_id) if row.assigned_admin_user_id is not None else None,
        "issue_type": _safe_str(row.issue_type, "other"),
        "subject": _safe_str(row.subject),
        "status": _safe_str(row.status, "waiting_admin"),
        "priority": _safe_str(row.priority, "normal"),
        "source_path": _safe_str(row.source_path) or None,
        "last_message_preview": _safe_str(row.last_message_preview) or None,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "last_activity_at": row.last_activity_at.isoformat() if row.last_activity_at else None,
        "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
        "message_count": len(messages) if include_thread else None,
        "attachment_count": len(attachments),
        "messages": [_message_payload(message, attachments) for message in messages] if include_thread else [],
        "attachments": [_attachment_payload(item) for item in attachments],
    }


def _require_case_visible(db: Session, case_id: int, current_user: User) -> SupportCase:
    row = db.get(SupportCase, int(case_id))
    if not row:
        raise HTTPException(status_code=404, detail="Support case not found")
    if int(row.requester_user_id) != int(current_user.id) and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="You can only open your own support cases")
    return row


def _require_admin(current_user: User) -> None:
    if not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only a GSN admin can use the support queue")


def _admin_recipient_ids(db: Session, *, clan_id: Optional[int] = None) -> list[int]:
    ids: list[int] = []
    seen: set[int] = set()
    for row in db.query(User.id).filter(User.role == "admin").all():
        user_id = int(row[0])
        if user_id not in seen:
            seen.add(user_id)
            ids.append(user_id)
    if clan_id is not None:
        memberships = (
            db.query(ClanMembership.user_id)
            .filter(
                ClanMembership.clan_id == int(clan_id),
                ClanMembership.role == "admin",
                ClanMembership.left_at.is_(None),
            )
            .all()
        )
        for row in memberships:
            user_id = int(row[0])
            if user_id not in seen:
                seen.add(user_id)
                ids.append(user_id)
    return ids


def _notify_admins(db: Session, row: SupportCase) -> int:
    recipients = [user_id for user_id in _admin_recipient_ids(db, clan_id=row.clan_id) if user_id != int(row.requester_user_id)]
    for user_id in recipients:
        create_notification(
            db,
            user_id=int(user_id),
            kind="support_case.opened",
            title="Support request waiting",
            message=f"{_display_user(row.requester)} needs help: {row.subject}",
            action_url=f"/app/command-center/support?case_id={int(row.id)}",
            action_label="Open Support Queue",
            commit=False,
            refresh=False,
        )
    return len(recipients)


def _notify_requester(db: Session, row: SupportCase, *, kind: str, title: str, message: str) -> None:
    create_notification(
        db,
        user_id=int(row.requester_user_id),
        kind=kind,
        title=title,
        message=message,
        action_url=f"/app/help?case_id={int(row.id)}",
        action_label="Open Help Desk",
        commit=False,
        refresh=False,
    )


def _touch_case(row: SupportCase, *, preview: str, status: Optional[str] = None, resolved: bool = False) -> None:
    now = _now()
    row.last_activity_at = now
    row.updated_at = now
    row.last_message_preview = preview[:220]
    if status:
        row.status = status
    if resolved:
        row.resolved_at = now
    elif status and status != "resolved":
        row.resolved_at = None


def _add_message(
    db: Session,
    *,
    row: SupportCase,
    author_user_id: int,
    author_role: str,
    body: str,
    status: Optional[str],
) -> SupportCaseMessage:
    message = SupportCaseMessage(
        support_case_id=int(row.id),
        author_user_id=int(author_user_id),
        author_role=author_role,
        body=body.strip(),
    )
    db.add(message)
    _touch_case(row, preview=body, status=status)
    return message


def _uploads_root() -> Path:
    raw = str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "").strip()
    return Path(raw or "uploads").expanduser()


def _support_upload_dir() -> Path:
    return _uploads_root() / "support-cases"


def _clean_filename(value: Any) -> str:
    filename = Path(_safe_str(value, "support-attachment")).name
    filename = re.sub(r"[^A-Za-z0-9._ -]+", "-", filename).strip(" .-")
    return filename[:180] or "support-attachment"


def _content_type(upload: UploadFile) -> str:
    return _safe_str(getattr(upload, "content_type", None)).lower()


async def _store_upload(upload: UploadFile) -> dict[str, str]:
    content_type = _content_type(upload)
    original_name = _clean_filename(getattr(upload, "filename", None))
    ext = SUPPORT_CASE_UPLOAD_TYPES.get(content_type)
    if not ext:
        suffix = Path(original_name).suffix.lower()
        if suffix in {".jpg", ".jpeg"}:
            content_type = "image/jpeg"
            ext = ".jpg"
        elif suffix == ".png":
            content_type = "image/png"
            ext = ".png"
        elif suffix == ".webp":
            content_type = "image/webp"
            ext = ".webp"
        elif suffix == ".gif":
            content_type = "image/gif"
            ext = ".gif"
        elif suffix == ".pdf":
            content_type = "application/pdf"
            ext = ".pdf"
    if not ext:
        raise HTTPException(status_code=415, detail="Attach an image or PDF for support review.")

    data = await upload.read()
    if not data:
        raise HTTPException(status_code=400, detail="Attachment file is empty.")
    if len(data) > MAX_SUPPORT_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Support attachments must be 8 MB or smaller.")

    upload_dir = _support_upload_dir()
    upload_dir.mkdir(parents=True, exist_ok=True)
    stored_name = f"{uuid4().hex}{ext}"
    (upload_dir / stored_name).write_bytes(data)
    return {
        "file_name": original_name,
        "content_type": content_type,
        "storage_key": f"support-cases/{stored_name}",
        "url": f"/uploads/support-cases/{stored_name}",
    }


@router.post("", response_model=dict[str, Any], status_code=201)
def create_support_case(
    payload: SupportCaseCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.clan_id is not None and db.get(Clan, int(payload.clan_id)) is None:
        raise HTTPException(status_code=404, detail="Community not found")

    requester = db.get(User, int(current_user.id)) or current_user
    row = SupportCase(
        public_id=_case_public_id(),
        requester_user_id=int(current_user.id),
        clan_id=int(payload.clan_id) if payload.clan_id is not None else None,
        issue_type=payload.issue_type,
        subject=payload.subject,
        status="waiting_admin",
        priority="normal",
        source_path=payload.source_path,
        last_message_preview=payload.message[:220],
    )
    db.add(row)
    db.flush()
    row.requester = requester if isinstance(requester, User) else None
    _add_message(
        db,
        row=row,
        author_user_id=int(current_user.id),
        author_role="user",
        body=payload.message,
        status="waiting_admin",
    )
    notifications_created = _notify_admins(db, row)
    db.commit()
    db.refresh(row)
    case_payload = _case_payload(db, row, include_thread=True)
    return {
        "ok": True,
        "support_case": case_payload,
        "case": case_payload,
        "notifications_created": int(notifications_created),
        "admin_notifications_created": int(notifications_created),
        "message": "Support request sent. A GSN admin can reply from the support queue.",
        "boundary": "This is an in-app support case. It is not a loan/support request, public notice, payment confirmation, identity verification, or Community Domain governance decision.",
    }


@router.get("/me", response_model=dict[str, Any])
def list_my_support_cases(
    status: Optional[str] = Query(default=None, max_length=24),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(SupportCase).filter(SupportCase.requester_user_id == int(current_user.id))
    clean_status = _safe_str(status).lower()
    if clean_status:
        if clean_status not in SUPPORT_CASE_STATUSES:
            raise HTTPException(status_code=422, detail="Unknown support case status")
        query = query.filter(SupportCase.status == clean_status)
    rows = query.order_by(SupportCase.last_activity_at.desc(), SupportCase.id.desc()).limit(int(limit)).all()
    return {
        "ok": True,
        "items": [_case_payload(db, row, include_thread=False) for row in rows],
        "total": len(rows),
    }


@router.get("/admin/queue", response_model=dict[str, Any])
def list_support_queue(
    status: Optional[str] = Query(default=None, max_length=24),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    query = db.query(SupportCase)
    clean_status = _safe_str(status).lower()
    if clean_status:
        if clean_status not in SUPPORT_CASE_STATUSES:
            raise HTTPException(status_code=422, detail="Unknown support case status")
        query = query.filter(SupportCase.status == clean_status)
    rows = query.order_by(SupportCase.last_activity_at.desc(), SupportCase.id.desc()).limit(int(limit)).all()
    counts = {
        item[0]: int(item[1])
        for item in db.query(SupportCase.status, func.count(SupportCase.id)).group_by(SupportCase.status).all()
    }
    return {
        "ok": True,
        "items": [_case_payload(db, row, include_thread=False) for row in rows],
        "total": len(rows),
        "counts": counts,
    }


@router.post("/admin/{case_id}/status", response_model=dict[str, Any])
def update_support_case_status(
    case_id: int,
    payload: SupportCaseStatusIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin(current_user)
    row = db.get(SupportCase, int(case_id))
    if not row:
        raise HTTPException(status_code=404, detail="Support case not found")
    row.assigned_admin_user_id = int(current_user.id)
    note = payload.note or f"Support case marked {payload.status.replace('_', ' ')}."
    _add_message(
        db,
        row=row,
        author_user_id=int(current_user.id),
        author_role="admin",
        body=note,
        status=payload.status,
    )
    if payload.status == "resolved":
        _touch_case(row, preview=note, status="resolved", resolved=True)
    _notify_requester(
        db,
        row,
        kind="support_case.status_updated",
        title="Support case updated",
        message=f"{row.public_id} is now {payload.status.replace('_', ' ')}.",
    )
    db.commit()
    db.refresh(row)
    return {"ok": True, "support_case": _case_payload(db, row, include_thread=True), "case": _case_payload(db, row, include_thread=True)}


@router.get("/{case_id}", response_model=dict[str, Any])
def get_support_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _require_case_visible(db, case_id, current_user)
    return {"ok": True, "support_case": _case_payload(db, row, include_thread=True), "case": _case_payload(db, row, include_thread=True)}


@router.post("/{case_id}/messages", response_model=dict[str, Any], status_code=201)
def add_support_case_message(
    case_id: int,
    payload: SupportCaseMessageIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _require_case_visible(db, case_id, current_user)
    if row.status == "resolved" and not _is_admin(current_user):
        raise HTTPException(status_code=409, detail="This support case is already resolved. Open a new case if help is still needed.")
    author_role = "admin" if _is_admin(current_user) else "user"
    next_status = "waiting_user" if author_role == "admin" else "waiting_admin"
    message = _add_message(
        db,
        row=row,
        author_user_id=int(current_user.id),
        author_role=author_role,
        body=payload.body,
        status=next_status,
    )
    if author_role == "admin":
        _notify_requester(
            db,
            row,
            kind="support_case.admin_reply",
            title="GSN support replied",
            message=f"Reply on {row.public_id}: {payload.body[:120]}",
        )
    else:
        _notify_admins(db, row)
    db.commit()
    db.refresh(message)
    db.refresh(row)
    return {
        "ok": True,
        "message": _message_payload(message, []),
        "support_case": _case_payload(db, row, include_thread=True),
        "case": _case_payload(db, row, include_thread=True),
    }


@router.post("/{case_id}/attachments", response_model=dict[str, Any], status_code=201)
async def upload_support_case_attachment(
    case_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = _require_case_visible(db, case_id, current_user)
    if row.status == "resolved" and not _is_admin(current_user):
        raise HTTPException(status_code=409, detail="This support case is already resolved. Open a new case if help is still needed.")
    stored = await _store_upload(file)
    author_role = "admin" if _is_admin(current_user) else "user"
    message = _add_message(
        db,
        row=row,
        author_user_id=int(current_user.id),
        author_role=author_role,
        body=f"Attachment added: {stored['file_name']}",
        status="waiting_user" if author_role == "admin" else "waiting_admin",
    )
    db.flush()
    attachment = SupportCaseAttachment(
        support_case_id=int(row.id),
        message_id=int(message.id),
        uploaded_by_user_id=int(current_user.id),
        file_name=stored["file_name"],
        content_type=stored["content_type"],
        storage_key=stored["storage_key"],
        url=stored["url"],
    )
    db.add(attachment)
    if author_role == "admin":
        _notify_requester(
            db,
            row,
            kind="support_case.admin_attachment",
            title="GSN support added a file",
            message=f"A file was added to {row.public_id}.",
        )
    else:
        _notify_admins(db, row)
    db.commit()
    db.refresh(attachment)
    db.refresh(row)
    return {
        "ok": True,
        "attachment": _attachment_payload(attachment),
        "support_case": _case_payload(db, row, include_thread=True),
        "case": _case_payload(db, row, include_thread=True),
    }







