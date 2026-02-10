from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.auth import get_current_user
from app.core.clan_auth import get_current_clan_membership
from app.db.models import User
from app.schemas.trust_slips import (
    TrustSlipIssueRequest,
    TrustSlipOut,
    TrustSlipListOut,
    TrustSlipVerifyOut,
    TrustSlipReleaseRequest,
)
from app.services.trust_slips_service import issue_trust_slip, verify_trust_slip, release_goods

router = APIRouter(prefix="/trust-slips", tags=["trust-slips"])


@router.post("", response_model=TrustSlipOut, status_code=201)
def create_trust_slip(
    payload: TrustSlipIssueRequest,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    slip = issue_trust_slip(
        db,
        clan_id=int(clan.id),
        holder=current_user,
        currency=payload.currency or "NGN",
        expires_days=int(payload.expires_days or 7),
    )
    return slip


@router.get("/me", response_model=TrustSlipListOut)
def list_my_trust_slips(
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    rows = (
        db.query(__import__("app.db.models", fromlist=["TrustSlip"]).TrustSlip)
        .filter_by(holder_user_id=int(current_user.id), clan_id=int(clan.id))
        .order_by(__import__("app.db.models", fromlist=["TrustSlip"]).TrustSlip.id.desc())
        .all()
    )
    return {"items": rows, "total": len(rows)}


@router.get("/{code}/verify", response_model=TrustSlipVerifyOut)
def verify(code: str, db: Session = Depends(get_db)):
    data = verify_trust_slip(db, code=code)
    return data


@router.post("/{code}/release", response_model=TrustSlipOut)
def supplier_release(code: str, payload: TrustSlipReleaseRequest, db: Session = Depends(get_db)):
    slip = release_goods(db, code=code, payload=payload.dict())
    return slip
