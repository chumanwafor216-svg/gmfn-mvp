from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import MarketplaceShop, User
from app.services.vault_domain_service import vault_status_for_shop


router = APIRouter(prefix="/vault", tags=["vault"])


def _is_admin(user: Any) -> bool:
    return str(getattr(user, "role", "") or "").strip().lower() == "admin"


def _require_shop_owner(db: Session, *, shop_id: int, current_user: User) -> MarketplaceShop:
    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(shop_id))
        .first()
    )
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    if int(shop.owner_user_id) != int(current_user.id) and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only the shop owner can manage Vault")
    return shop


@router.get("/shops/{shop_id}/status")
def get_vault_shop_status(
    shop_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    shop = _require_shop_owner(db, shop_id=int(shop_id), current_user=current_user)
    out = vault_status_for_shop(
        db,
        shop_id=int(shop.id),
        owner_user_id=int(shop.owner_user_id),
    )
    db.commit()
    return out
