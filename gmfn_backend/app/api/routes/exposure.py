# app/api/routes/exposure.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.clan_auth import get_current_clan_membership
from app.db.database import get_db
from app.db.models import User
from app.services.exposure_service import get_clan_exposure_rows

router = APIRouter(prefix="/exposure", tags=["exposure"])


@router.get("/admin", operation_id="exposure_get_admin_exposure")
def get_exposure_admin(
    clan_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Clan-admin: view exposure rows for a clan.
    NOTE: Guarantor expiry is handled centrally via:
      POST /admin/trust-events/expire-guarantors
    """
    # Must be admin in THIS clan
    clan, membership, _ = get_current_clan_membership(db=db, current_user=current_user)

    if clan.id != clan_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Clan admin only")

    items = get_clan_exposure_rows(db, clan_id=clan_id)

    totals_pool = sum(x.get("pool_balance", 0) for x in items)
    totals_exposure = sum(x.get("exposure", 0) for x in items)
    totals_available = sum(x.get("available", 0) for x in items)

    return {
        "clan_id": clan_id,
        "items": items,
        "totals": {
            "pool_balance": totals_pool,
            "exposure": totals_exposure,
            "available": totals_available,
        },
        "total": len(items),
    }
