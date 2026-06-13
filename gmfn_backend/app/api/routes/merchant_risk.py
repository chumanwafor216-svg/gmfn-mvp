from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.clan_auth import get_current_clan_membership
from app.db.database import get_db
from app.db.models import User
from app.services.trust_score_service import apply_trust_score, compute_trust_breakdown

router = APIRouter(prefix="/merchant", tags=["merchant"])


@router.get("/risk/{user_id}")
def merchant_risk_summary(
    user_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
) -> Dict[str, Any]:
    """
    Merchant risk summary (read-only).
    Authenticated in pilot via clan membership.
    """
    clan, membership, current_user = clan_ctx

    target = db.get(User, int(user_id))
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    apply_trust_score(db, user_id=int(user_id))
    breakdown = compute_trust_breakdown(db, user_id=int(user_id))

    return {
        "user_id": int(user_id),
        "email": getattr(target, "email", None),
        "clan_id": int(clan.id),
        "trust_score": str(breakdown.get("score") or "0.00"),
        "band": breakdown.get("band"),
        "level_label": breakdown.get("level_label"),
        "last_full_repayment_at": breakdown.get("last_full_repayment_at"),
        "standing_score": breakdown.get("standing_score"),
        "lifetime_trust": breakdown.get("lifetime_trust"),
        "note": "Risk summary. TrustSlip is not a bank guarantee; GSN is non-custodial.",
    }
