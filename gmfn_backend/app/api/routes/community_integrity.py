from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.schemas.community_integrity import (
    ActiveCommunityOut,
    InviteAuditOut,
    JoinByInviteIn,
    JoinByInviteOut,
    SetActiveCommunityIn,
    SetActiveCommunityOut,
)
from app.services.community_integrity_service import (
    audit_invite,
    get_active_clan_for_user,
    join_clan_via_invite,
    require_admin_membership,
    set_active_clan_for_user,
)

# Keep these aligned with your current project imports
from app.db.database import get_db
from app.core.auth import get_current_user

router = APIRouter(tags=["community-integrity"])


@router.get("/community/active", response_model=ActiveCommunityOut)
def get_active_community(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_active_clan_for_user(db, user=current_user)


@router.post("/community/active", response_model=SetActiveCommunityOut)
def set_active_community(
    payload: SetActiveCommunityIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return set_active_clan_for_user(
        db,
        user=current_user,
        clan_id=int(payload.clan_id),
    )


@router.post("/community/join-by-invite", response_model=JoinByInviteOut)
def join_by_invite(
    payload: JoinByInviteIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return join_clan_via_invite(
        db,
        user=current_user,
        invite_code=payload.invite_code,
    )


@router.get("/admin/community/invite-audit", response_model=InviteAuditOut)
def admin_invite_audit(
    invite_id: int = Query(..., ge=1),
    clan_id: int = Query(..., ge=1),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = str(getattr(current_user, "role", "") or "").lower()
    if role != "admin":
        require_admin_membership(
            db,
            user_id=int(getattr(current_user, "id")),
            clan_id=clan_id,
        )

    return audit_invite(db, invite_id=invite_id)