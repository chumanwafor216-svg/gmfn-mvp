from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ClanMembership, User
from app.services.loan_readiness_service import build_loan_readiness_plan

router = APIRouter(prefix="/loans", tags=["loan-readiness"])


def _is_platform_admin(user: User) -> bool:
    return str(getattr(user, "role", "") or "").strip().lower() == "admin"


def _active_membership(db: Session, *, clan_id: int, user_id: int) -> ClanMembership | None:
    return (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(user_id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )


def _require_readiness_scope(
    db: Session,
    *,
    clan_id: int,
    borrower_user_id: Optional[int],
    current_user: User,
) -> int:
    current_user_id = int(getattr(current_user, "id", 0) or 0)
    if current_user_id <= 0:
        raise HTTPException(status_code=403, detail="Not allowed to inspect loan readiness")

    resolved_borrower_user_id = int(borrower_user_id) if borrower_user_id is not None else current_user_id

    if _is_platform_admin(current_user):
        return resolved_borrower_user_id

    membership = _active_membership(db, clan_id=int(clan_id), user_id=current_user_id)
    if not membership:
        raise HTTPException(status_code=403, detail="Not allowed to inspect loan readiness for this community")

    if resolved_borrower_user_id == current_user_id:
        return resolved_borrower_user_id

    is_clan_admin = str(getattr(membership, "role", "") or "").strip().lower() == "admin"
    if not is_clan_admin:
        raise HTTPException(status_code=403, detail="Not allowed to inspect another borrower readiness plan")

    target_membership = _active_membership(
        db,
        clan_id=int(clan_id),
        user_id=resolved_borrower_user_id,
    )
    if not target_membership:
        raise HTTPException(status_code=403, detail="Borrower is not an active member of this community")

    return resolved_borrower_user_id


@router.get("/readiness/plan")
def get_loan_readiness_plan(
    clan_id: int = Query(..., ge=1),
    requested_amount: str = Query(...),
    borrower_user_id: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    resolved_borrower_user_id = _require_readiness_scope(
        db,
        clan_id=int(clan_id),
        borrower_user_id=borrower_user_id,
        current_user=current_user,
    )

    try:
        result = build_loan_readiness_plan(
            db,
            clan_id=int(clan_id),
            requested_amount=requested_amount,
            borrower_user_id=resolved_borrower_user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result["viewer_user_id"] = int(getattr(current_user, "id", 0) or 0)
    result["viewer_role"] = str(getattr(current_user, "role", "") or "")
    result["access_scope"] = "platform_admin" if _is_platform_admin(current_user) else "community_member_or_admin"
    return result