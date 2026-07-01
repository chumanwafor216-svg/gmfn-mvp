from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import MarketplaceShop, User, VaultAccessLink
from app.services.vault_access_service import (
    create_vault_access_link,
    extend_vault_access_link,
    get_vault_link_by_id,
    list_vault_links_for_shop,
    resolve_vault_access_view,
    revoke_vault_access_link,
)
from app.services.vault_domain_service import vault_status_for_shop


router = APIRouter(prefix="/marketplace", tags=["marketplace-vault-access"])


class VaultAccessLinkCreateIn(BaseModel):
    product_id: Optional[int] = None
    expires_at: Optional[datetime] = None
    max_views: Optional[int] = Field(default=None, ge=1)
    allow_download: bool = False
    allow_print: bool = False
    allow_reshare: bool = False
    watermark_enabled: bool = True

    @field_validator("product_id", "max_views", mode="before")
    @classmethod
    def _reject_malformed_integer_controls(cls, value: Any, info: Any) -> Any:
        if value is None:
            return value
        if isinstance(value, bool):
            raise ValueError(f"{info.field_name} must be an integer, not a boolean.")
        if isinstance(value, float):
            raise ValueError(f"{info.field_name} must be an integer, not a float.")
        return value

    @field_validator(
        "allow_download",
        "allow_print",
        "allow_reshare",
        "watermark_enabled",
        mode="before",
    )
    @classmethod
    def _reject_malformed_boolean_controls(cls, value: Any, info: Any) -> Any:
        if not isinstance(value, bool):
            raise ValueError(f"{info.field_name} must be boolean.")
        return value

    @field_validator("expires_at", mode="before")
    @classmethod
    def _reject_malformed_expires_at(cls, value: Any) -> Any:
        if value is None or isinstance(value, str) or isinstance(value, datetime):
            return value
        raise ValueError("expires_at must be an ISO datetime string.")


class VaultAccessLinkExtendIn(BaseModel):
    expires_at: datetime

    @field_validator("expires_at", mode="before")
    @classmethod
    def _reject_malformed_expires_at(cls, value: Any) -> Any:
        if isinstance(value, str) or isinstance(value, datetime):
            return value
        raise ValueError("expires_at must be an ISO datetime string.")


def _is_admin(user: Any) -> bool:
    return str(getattr(user, "role", "") or "").strip().lower() == "admin"


def _shop_or_404(db: Session, shop_id: int) -> MarketplaceShop:
    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(shop_id))
        .first()
    )
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    return shop


def _require_shop_manager(
    *,
    db: Session,
    shop_id: int,
    current_user: User,
) -> MarketplaceShop:
    shop = _shop_or_404(db, int(shop_id))
    if not (_is_admin(current_user) or int(shop.owner_user_id) == int(current_user.id)):
        raise HTTPException(
            status_code=403,
            detail="Only the shop owner can manage Vault access links",
        )
    return shop


def _link_or_404(db: Session, link_id: int) -> VaultAccessLink:
    link = get_vault_link_by_id(db, link_id=int(link_id))
    if not link:
        raise HTTPException(status_code=404, detail="Vault access link not found")
    return link


def _public_vault_path(token: str) -> str:
    return f"/vault/{token}"


def _link_out(link: VaultAccessLink) -> Dict[str, Any]:
    token = str(getattr(link, "token", "") or "")
    return {
        "id": int(link.id),
        "shop_id": int(link.shop_id),
        "product_id": int(link.product_id) if getattr(link, "product_id", None) is not None else None,
        "block_id": int(link.block_id) if getattr(link, "block_id", None) is not None else None,
        "owner_user_id": int(link.owner_user_id),
        "token": token,
        "status": str(getattr(link, "status", "") or "active"),
        "expires_at": link.expires_at.isoformat() if getattr(link, "expires_at", None) else None,
        "max_views": getattr(link, "max_views", None),
        "views_used": int(getattr(link, "views_used", 0) or 0),
        "allow_download": bool(getattr(link, "allow_download", False)),
        "allow_print": bool(getattr(link, "allow_print", False)),
        "allow_reshare": bool(getattr(link, "allow_reshare", False)),
        "watermark_enabled": bool(getattr(link, "watermark_enabled", True)),
        "revoked_at": link.revoked_at.isoformat() if getattr(link, "revoked_at", None) else None,
        "last_opened_at": (
            link.last_opened_at.isoformat()
            if getattr(link, "last_opened_at", None)
            else None
        ),
        "created_at": link.created_at.isoformat() if getattr(link, "created_at", None) else None,
        "access_url": _public_vault_path(token) if token else "",
        "frontend_hint_path": _public_vault_path(token) if token else "",
        "api_view_url": f"/marketplace/vault-access/{token}" if token else "",
    }


def _service_value_error(exc: ValueError) -> HTTPException:
    message = str(exc) or "Vault access request could not be completed"
    status = 403 if "Only the shop owner" in message else 400
    return HTTPException(status_code=status, detail=message)


@router.post("/shops/{shop_id}/vault-access-links")
def create_shop_vault_access_link(
    shop_id: int,
    payload: VaultAccessLinkCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    shop = _require_shop_manager(db=db, shop_id=int(shop_id), current_user=current_user)
    try:
        link = create_vault_access_link(
            db,
            shop_id=int(shop.id),
            owner_user_id=int(shop.owner_user_id),
            product_id=payload.product_id,
            expires_at=payload.expires_at,
            max_views=payload.max_views,
            allow_download=payload.allow_download,
            allow_print=payload.allow_print,
            allow_reshare=payload.allow_reshare,
            watermark_enabled=payload.watermark_enabled,
        )
    except ValueError as exc:
        raise _service_value_error(exc) from exc

    return {"ok": True, "item": _link_out(link)}


@router.get("/shops/{shop_id}/vault-access-links")
def list_shop_vault_access_links(
    shop_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _require_shop_manager(db=db, shop_id=int(shop_id), current_user=current_user)
    links = list_vault_links_for_shop(db, shop_id=int(shop_id))
    return {"ok": True, "items": [_link_out(link) for link in links]}


@router.get("/shops/{shop_id}/vault-status")
def get_shop_vault_status(
    shop_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    shop = _require_shop_manager(db=db, shop_id=int(shop_id), current_user=current_user)
    status = vault_status_for_shop(
        db,
        shop_id=int(shop.id),
        owner_user_id=int(shop.owner_user_id),
    )
    db.commit()
    return status


@router.post("/vault-access-links/{link_id}/revoke")
def revoke_shop_vault_access_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    link = _link_or_404(db, int(link_id))
    _require_shop_manager(db=db, shop_id=int(link.shop_id), current_user=current_user)
    return {"ok": True, "item": _link_out(revoke_vault_access_link(db, link=link))}


@router.post("/vault-access-links/{link_id}/extend")
def extend_shop_vault_access_link(
    link_id: int,
    payload: VaultAccessLinkExtendIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    link = _link_or_404(db, int(link_id))
    _require_shop_manager(db=db, shop_id=int(link.shop_id), current_user=current_user)
    try:
        updated = extend_vault_access_link(
            db,
            link=link,
            expires_at=payload.expires_at,
        )
    except ValueError as exc:
        raise _service_value_error(exc) from exc

    return {"ok": True, "item": _link_out(updated)}


@router.get("/vault-access/{token}")
def get_shop_vault_access_view(
    token: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    return resolve_vault_access_view(db, token=token, increment_view=False)


@router.post("/vault-access/{token}/open")
def record_shop_vault_access_open(
    token: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    return resolve_vault_access_view(db, token=token, increment_view=True)
