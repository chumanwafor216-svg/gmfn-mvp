from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.deps import get_db
from app.db.models import User
from app.schemas.invites import (
    ClanInviteCreate,
    ClanInviteOut,
    InvitePreviewOut,
    InviteRevokeOut,
    JoinByInviteIn,
    JoinByInviteOut,
)
from app.services.invites_service import (
    api_join_link,
    create_clan_invite,
    frontend_join_link,
    join_clan_by_invite_code,
    list_clan_invites,
    preview_invite,
    revoke_invite,
)

router = APIRouter(prefix="/invites", tags=["invites"])


# -------------------------
# Create invite
# -------------------------
@router.post(
    "/clans/{clan_id}",
    response_model=ClanInviteOut,
    operation_id="invites_create_clan_invite",
)
def create_invite(
    clan_id: int,
    payload: ClanInviteCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    invite = create_clan_invite(
        db,
        clan_id=clan_id,
        created_by_user=user,
        expires_at=payload.expires_at,
        max_uses=payload.max_uses,
        relationship_evidence=(
            payload.relationship_evidence.model_dump(exclude_none=True)
            if payload.relationship_evidence
            else None
        ),
    )

    return {
        "id": invite.id,
        "clan_id": invite.clan_id,
        "created_by_user_id": invite.created_by_user_id,
        "code": invite.code,
        "is_active": invite.is_active,
        "max_uses": None,
        "uses": invite.uses,
        "created_at": invite.created_at,
        "expires_at": invite.expires_at,
        "revoked_at": invite.revoked_at,
        "share_link": frontend_join_link(invite.code),
        "api_link": api_join_link(request, invite.code),
    }


# -------------------------
# List clan invites
# -------------------------
@router.get(
    "/clans/{clan_id}",
    response_model=list[ClanInviteOut],
    operation_id="invites_list_clan_invites",
)
def get_clan_invites(
    clan_id: int,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    invites = list_clan_invites(db, clan_id=clan_id, user=user)

    return [
        {
            "id": inv.id,
            "clan_id": inv.clan_id,
            "created_by_user_id": inv.created_by_user_id,
            "code": inv.code,
            "is_active": inv.is_active,
            "max_uses": None,
            "uses": inv.uses,
            "created_at": inv.created_at,
            "expires_at": inv.expires_at,
            "revoked_at": inv.revoked_at,
            "share_link": frontend_join_link(inv.code),
            "api_link": api_join_link(request, inv.code),
        }
        for inv in invites
    ]


# -------------------------
# Share link helper
# -------------------------
@router.get(
    "/share/{code}",
    operation_id="invites_share_links",
)
def get_share_link(code: str, request: Request):
    return {
        "code": code,
        "share_link": frontend_join_link(code),
        "api_link": api_join_link(request, code),
    }


# -------------------------
# Public preview
# -------------------------
@router.get(
    "/preview/{code}",
    response_model=InvitePreviewOut,
    operation_id="invites_preview_by_code",
)
def get_invite_preview(
    code: str,
    db: Session = Depends(get_db),
):
    return preview_invite(db, code=code)


# -------------------------
# Join via invite
# -------------------------
@router.post(
    "/join",
    response_model=JoinByInviteOut,
    operation_id="invites_join_by_code",
)
def join_by_invite(
    payload: JoinByInviteIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return join_clan_by_invite_code(db, code=payload.code, user=user)


# -------------------------
# Revoke invite
# -------------------------
@router.post(
    "/revoke/{code}",
    response_model=InviteRevokeOut,
    operation_id="invites_revoke_by_code",
)
def revoke_invite_route(
    code: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    inv = revoke_invite(db, code=code, user=user)
    return {
        "code": inv.code,
        "is_active": inv.is_active,
        "revoked_at": inv.revoked_at,
    }
