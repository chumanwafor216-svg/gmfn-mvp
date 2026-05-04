from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models import MarketplaceProduct, MarketplaceShop, VaultAccessLink, VaultBlock
from app.services.feature_entitlements_service import has_active_feature
from app.services.vault_domain_service import (
    find_vault_block_for_product,
    log_vault_access,
)

FEATURE_VAULT_SLOT = "vault_slot"
VISIBILITY_VAULT = "vault_private"
DEFAULT_LINK_EXPIRY_HOURS = 72


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    text = str(value).strip()
    return text if text else default


def _to_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _generate_token() -> str:
    return secrets.token_urlsafe(24)


def _shop_payload(shop: MarketplaceShop) -> Dict[str, Any]:
    return {
        "id": int(shop.id),
        "clan_id": int(shop.clan_id) if shop.clan_id is not None else None,
        "owner_user_id": int(shop.owner_user_id),
        "name": _safe_str(getattr(shop, "name", None)),
        "description": getattr(shop, "description", None),
        "image_url": getattr(shop, "image_url", None),
        "is_active": bool(getattr(shop, "is_active", True)),
        "created_at": shop.created_at.isoformat() if getattr(shop, "created_at", None) else None,
    }


def _product_payload(product: MarketplaceProduct) -> Dict[str, Any]:
    return {
        "id": int(product.id),
        "shop_id": int(product.shop_id),
        "clan_id": int(product.clan_id),
        "seller_user_id": int(product.seller_user_id),
        "name": _safe_str(getattr(product, "name", None)),
        "description": getattr(product, "description", None),
        "price": getattr(product, "price", None),
        "currency": getattr(product, "currency", None),
        "image_url": getattr(product, "image_url", None),
        "video_url": getattr(product, "video_url", None),
        "visibility_mode": _safe_str(getattr(product, "visibility_mode", None), VISIBILITY_VAULT),
        "is_active": bool(getattr(product, "is_active", True)),
        "created_at": product.created_at.isoformat() if getattr(product, "created_at", None) else None,
    }


def _link_status(
    db: Session,
    *,
    link: VaultAccessLink,
    shop: Optional[MarketplaceShop] = None,
) -> str:
    current_time = _now_utc()

    raw_status = _safe_str(getattr(link, "status", None), "active").lower()
    if raw_status == "revoked" or getattr(link, "revoked_at", None) is not None:
        return "revoked"

    expires_at = _to_aware(getattr(link, "expires_at", None))
    if expires_at is not None and expires_at < current_time:
        return "expired"

    max_views = getattr(link, "max_views", None)
    views_used = int(getattr(link, "views_used", 0) or 0)
    if max_views is not None and views_used >= int(max_views):
        return "exhausted"

    shop_row = shop
    if shop_row is None:
        shop_row = (
            db.query(MarketplaceShop)
            .filter(MarketplaceShop.id == int(link.shop_id))
            .first()
        )

    if not shop_row or not bool(getattr(shop_row, "is_active", True)):
        return "shop_inactive"

    product_id = getattr(link, "product_id", None)
    block_id = getattr(link, "block_id", None)
    block: Optional[VaultBlock] = None
    if block_id is not None:
        block = db.get(VaultBlock, int(block_id))
        if (
            block is None
            or int(block.shop_id) != int(link.shop_id)
            or _safe_str(getattr(block, "state", None)) != "active"
        ):
            return "block_inactive"

    if product_id is not None:
        product = _vault_product_for_link_scope(
            db,
            shop_id=int(link.shop_id),
            product_id=int(product_id),
        )
        if product is None:
            return "product_inactive"
        if block is None:
            block = find_vault_block_for_product(db, product_id=int(product_id))
        if (
            block is None
            or _safe_str(getattr(block, "state", None)) != "active"
            or getattr(block, "product_id", None) is None
            or int(block.product_id) != int(product_id)
        ):
            return "block_inactive"

    if not has_active_feature(
        db,
        owner_user_id=int(link.owner_user_id),
        feature_code=FEATURE_VAULT_SLOT,
        shop_id=int(link.shop_id),
    ):
        return "subscription_inactive"

    return "active"


def get_vault_link_by_id(
    db: Session,
    *,
    link_id: int,
) -> Optional[VaultAccessLink]:
    return (
        db.query(VaultAccessLink)
        .filter(VaultAccessLink.id == int(link_id))
        .first()
    )


def get_vault_link_by_token(
    db: Session,
    *,
    token: str,
) -> Optional[VaultAccessLink]:
    return (
        db.query(VaultAccessLink)
        .filter(VaultAccessLink.token == _safe_str(token))
        .first()
    )


def list_vault_links_for_shop(
    db: Session,
    *,
    shop_id: int,
) -> List[VaultAccessLink]:
    return (
        db.query(VaultAccessLink)
        .filter(VaultAccessLink.shop_id == int(shop_id))
        .order_by(VaultAccessLink.created_at.desc(), VaultAccessLink.id.desc())
        .all()
    )


def _active_vault_product_count(
    db: Session,
    *,
    shop_id: int,
) -> int:
    return (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.shop_id == int(shop_id))
        .filter(MarketplaceProduct.is_active.is_(True))
        .filter(MarketplaceProduct.visibility_mode == VISIBILITY_VAULT)
        .count()
    )


def _vault_product_for_link_scope(
    db: Session,
    *,
    shop_id: int,
    product_id: Optional[int],
) -> Optional[MarketplaceProduct]:
    if product_id is None:
        return None
    return (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.id == int(product_id))
        .filter(MarketplaceProduct.shop_id == int(shop_id))
        .filter(MarketplaceProduct.visibility_mode == VISIBILITY_VAULT)
        .filter(MarketplaceProduct.is_active.is_(True))
        .first()
    )


def create_vault_access_link(
    db: Session,
    *,
    shop_id: int,
    owner_user_id: int,
    product_id: Optional[int] = None,
    expires_at: Optional[datetime] = None,
    max_views: Optional[int] = None,
    allow_download: bool = False,
    allow_print: bool = False,
    allow_reshare: bool = False,
    watermark_enabled: bool = True,
    commit: bool = True,
    refresh: bool = True,
) -> VaultAccessLink:
    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(shop_id))
        .first()
    )
    if not shop:
        raise ValueError("Shop not found")

    if int(shop.owner_user_id) != int(owner_user_id):
        raise ValueError("Only the shop owner can create Vault access links")

    if not bool(getattr(shop, "is_active", True)):
        raise ValueError("Shop is inactive")

    if _active_vault_product_count(db, shop_id=int(shop_id)) <= 0:
        raise ValueError("No active Vault products exist for this shop")

    if product_id is None:
        raise ValueError("Vault link must point to one selected private block")

    scoped_product = _vault_product_for_link_scope(
        db,
        shop_id=int(shop_id),
        product_id=int(product_id),
    )
    if scoped_product is None:
        raise ValueError("Vault link must point to an active private offer in this shop")

    scoped_block = find_vault_block_for_product(db, product_id=int(scoped_product.id))
    if (
        scoped_block is None
        or int(scoped_block.shop_id) != int(shop_id)
        or _safe_str(getattr(scoped_block, "state", None)) != "active"
    ):
        raise ValueError("Vault link must point to an active paid Vault block")

    if not has_active_feature(
        db,
        owner_user_id=int(owner_user_id),
        feature_code=FEATURE_VAULT_SLOT,
        shop_id=int(shop_id),
    ):
        raise ValueError("No active Vault slot entitlement found for this shop")

    exp = _to_aware(expires_at) or (_now_utc() + timedelta(hours=DEFAULT_LINK_EXPIRY_HOURS))
    if exp is not None and exp <= _now_utc():
        raise ValueError("expires_at must be in the future")

    token = _generate_token()
    while (
        db.query(VaultAccessLink)
        .filter(VaultAccessLink.token == token)
        .first()
        is not None
    ):
        token = _generate_token()

    if scoped_product is not None:
        active_links = (
            db.query(VaultAccessLink)
            .filter(VaultAccessLink.shop_id == int(shop_id))
            .filter(VaultAccessLink.product_id == int(scoped_product.id))
            .filter(VaultAccessLink.status == "active")
            .all()
        )
        for existing in active_links:
            existing.status = "revoked"
            existing.revoked_at = _now_utc()
            db.add(existing)

        active_block_links = (
            db.query(VaultAccessLink)
            .filter(VaultAccessLink.shop_id == int(shop_id))
            .filter(VaultAccessLink.block_id == int(scoped_block.id))
            .filter(VaultAccessLink.status == "active")
            .all()
        )
        for existing in active_block_links:
            existing.status = "revoked"
            existing.revoked_at = _now_utc()
            db.add(existing)

    row = VaultAccessLink(
        shop_id=int(shop_id),
        product_id=int(scoped_product.id) if scoped_product is not None else None,
        block_id=int(scoped_block.id),
        owner_user_id=int(owner_user_id),
        token=token,
        status="active",
        expires_at=exp,
        max_views=int(max_views) if max_views is not None else None,
        views_used=0,
        allow_download=bool(allow_download),
        allow_print=bool(allow_print),
        allow_reshare=bool(allow_reshare),
        watermark_enabled=bool(watermark_enabled),
        revoked_at=None,
        last_opened_at=None,
    )

    db.add(row)
    if commit:
        db.commit()
        if refresh:
            db.refresh(row)
    else:
        db.flush()
        if refresh:
            db.refresh(row)

    return row


def revoke_vault_access_link(
    db: Session,
    *,
    link: VaultAccessLink,
    commit: bool = True,
    refresh: bool = True,
) -> VaultAccessLink:
    link.status = "revoked"
    link.revoked_at = _now_utc()
    db.add(link)

    if commit:
        db.commit()
        if refresh:
            db.refresh(link)
    else:
        db.flush()
        if refresh:
            db.refresh(link)

    return link


def extend_vault_access_link(
    db: Session,
    *,
    link: VaultAccessLink,
    expires_at: datetime,
    commit: bool = True,
    refresh: bool = True,
) -> VaultAccessLink:
    exp = _to_aware(expires_at)
    if exp is None or exp <= _now_utc():
        raise ValueError("expires_at must be in the future")

    link.expires_at = exp
    if _safe_str(getattr(link, "status", None), "active").lower() == "revoked":
        link.status = "active"
        link.revoked_at = None

    db.add(link)

    if commit:
        db.commit()
        if refresh:
            db.refresh(link)
    else:
        db.flush()
        if refresh:
            db.refresh(link)

    return link


def resolve_vault_access_view(
    db: Session,
    *,
    token: str,
    increment_view: bool = True,
) -> Dict[str, Any]:
    link = get_vault_link_by_token(db, token=_safe_str(token))
    if not link:
        log_vault_access(db, link=None, token=token, result="not_found")
        db.commit()
        return {
            "ok": False,
            "status": "not_found",
            "detail": "Vault access link not found.",
        }

    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(link.shop_id))
        .first()
    )

    status = _link_status(db, link=link, shop=shop)
    if status != "active":
        log_vault_access(db, link=link, token=token, result=status)
        db.commit()
        return {
            "ok": False,
            "status": status,
            "detail": {
                "revoked": "This Vault access link has been revoked.",
                "expired": "This Vault access link has expired.",
                "exhausted": "This Vault access link has reached its view limit.",
                "subscription_inactive": "Vault subscription is inactive for this shop.",
                "shop_inactive": "This shop is not currently active.",
                "block_inactive": "This private Vault block is no longer active.",
                "product_inactive": "This private Vault block is no longer available.",
            }.get(status, "Vault access is not available."),
            "restrictions": {
                "allow_download": bool(getattr(link, "allow_download", False)),
                "allow_print": bool(getattr(link, "allow_print", False)),
                "allow_reshare": bool(getattr(link, "allow_reshare", False)),
                "watermark_enabled": bool(getattr(link, "watermark_enabled", True)),
            },
            "expires_at": link.expires_at.isoformat() if getattr(link, "expires_at", None) else None,
            "max_views": getattr(link, "max_views", None),
            "views_used": int(getattr(link, "views_used", 0) or 0),
        }

    if increment_view:
        link.views_used = int(getattr(link, "views_used", 0) or 0) + 1
        link.last_opened_at = _now_utc()
        db.add(link)
        log_vault_access(db, link=link, token=token, result="opened")
        db.commit()
        db.refresh(link)

    product_query = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.shop_id == int(link.shop_id))
        .filter(MarketplaceProduct.is_active.is_(True))
        .filter(MarketplaceProduct.visibility_mode == VISIBILITY_VAULT)
    )
    if getattr(link, "product_id", None) is not None:
        product_query = product_query.filter(MarketplaceProduct.id == int(link.product_id))
    products = product_query.order_by(
        MarketplaceProduct.created_at.desc(),
        MarketplaceProduct.id.desc(),
    ).all()

    return {
        "ok": True,
        "status": "active",
        "detail": "Vault access active.",
        "token": link.token,
        "product_id": int(link.product_id) if getattr(link, "product_id", None) is not None else None,
        "block_id": int(link.block_id) if getattr(link, "block_id", None) is not None else None,
        "shop": _shop_payload(shop) if shop else None,
        "products": [_product_payload(p) for p in products],
        "restrictions": {
            "allow_download": bool(getattr(link, "allow_download", False)),
            "allow_print": bool(getattr(link, "allow_print", False)),
            "allow_reshare": bool(getattr(link, "allow_reshare", False)),
            "watermark_enabled": bool(getattr(link, "watermark_enabled", True)),
        },
        "expires_at": link.expires_at.isoformat() if getattr(link, "expires_at", None) else None,
        "max_views": getattr(link, "max_views", None),
        "views_used": int(getattr(link, "views_used", 0) or 0),
        "last_opened_at": link.last_opened_at.isoformat() if getattr(link, "last_opened_at", None) else None,
        "api_view_url": f"/vault-access/{link.token}",
        "frontend_hint_path": f"/vault/{link.token}",
    }
