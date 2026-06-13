from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import (
    ClanMembership,
    MarketplaceBroadcast,
    MarketplaceProduct,
    MarketplaceShop,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _require_active_clan_membership(
    db: Session,
    *,
    clan_id: int,
    user_id: int,
) -> ClanMembership:
    membership = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == clan_id)
        .filter(ClanMembership.user_id == user_id)
        .filter(ClanMembership.left_at.is_(None))
        .first()
    )
    if not membership:
        raise ValueError("User is not an active member of this community.")
    return membership


def create_shop(
    db: Session,
    *,
    clan_id: int,
    owner_user_id: int,
    name: str,
    description: Optional[str] = None,
    whatsapp_number: Optional[str] = None,
    telegram_handle: Optional[str] = None,
) -> MarketplaceShop:
    _require_active_clan_membership(db, clan_id=clan_id, user_id=owner_user_id)

    existing = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.clan_id == clan_id)
        .filter(MarketplaceShop.owner_user_id == owner_user_id)
        .filter(MarketplaceShop.is_active.is_(True))
        .first()
    )
    if existing:
        raise ValueError("You already have an active shop in this community.")

    shop = MarketplaceShop(
        clan_id=clan_id,
        owner_user_id=owner_user_id,
        name=name.strip(),
        description=description.strip() if description else None,
        whatsapp_number=whatsapp_number.strip() if whatsapp_number else None,
        telegram_handle=telegram_handle.strip() if telegram_handle else None,
    )

    db.add(shop)
    db.commit()
    db.refresh(shop)
    return shop


def list_shops(
    db: Session,
    *,
    clan_id: int,
    only_active: bool = True,
    limit: int = 100,
) -> list[MarketplaceShop]:
    query = db.query(MarketplaceShop).filter(MarketplaceShop.clan_id == clan_id)

    if only_active:
        query = query.filter(MarketplaceShop.is_active.is_(True))

    return (
        query.order_by(MarketplaceShop.created_at.desc())
        .limit(limit)
        .all()
    )


def create_product(
    db: Session,
    *,
    clan_id: int,
    shop_id: int,
    seller_user_id: int,
    name: str,
    description: Optional[str] = None,
    price: Optional[str] = None,
    currency: Optional[str] = None,
    image_url: Optional[str] = None,
) -> MarketplaceProduct:
    _require_active_clan_membership(db, clan_id=clan_id, user_id=seller_user_id)

    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == shop_id)
        .filter(MarketplaceShop.clan_id == clan_id)
        .filter(MarketplaceShop.owner_user_id == seller_user_id)
        .filter(MarketplaceShop.is_active.is_(True))
        .first()
    )
    if not shop:
        raise ValueError(
            "Active shop not found for this seller in the selected community."
        )

    normalized_price = price.strip() if price else None
    normalized_currency = (currency or "NGN").strip().upper()

    product = MarketplaceProduct(
        clan_id=clan_id,
        shop_id=shop_id,
        seller_user_id=seller_user_id,
        name=name.strip(),
        description=description.strip() if description else None,
        price=normalized_price,
        currency=normalized_currency,
        image_url=image_url.strip() if image_url else None,
    )

    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def list_products(
    db: Session,
    *,
    clan_id: int,
    shop_id: Optional[int] = None,
    only_active: bool = True,
    limit: int = 100,
) -> list[MarketplaceProduct]:
    query = db.query(MarketplaceProduct).filter(
        MarketplaceProduct.clan_id == clan_id
    )

    if shop_id is not None:
        query = query.filter(MarketplaceProduct.shop_id == shop_id)

    if only_active:
        query = query.filter(MarketplaceProduct.is_active.is_(True))

    return (
        query.order_by(MarketplaceProduct.created_at.desc())
        .limit(limit)
        .all()
    )


def create_broadcast(
    db: Session,
    *,
    clan_id: int,
    author_user_id: int,
    message: str,
    expires_at: Optional[datetime] = None,
) -> MarketplaceBroadcast:
    _require_active_clan_membership(db, clan_id=clan_id, user_id=author_user_id)

    broadcast = MarketplaceBroadcast(
        clan_id=clan_id,
        author_user_id=author_user_id,
        message=message.strip(),
        expires_at=expires_at,
    )

    db.add(broadcast)
    db.commit()
    db.refresh(broadcast)
    return broadcast


def list_broadcasts(
    db: Session,
    *,
    clan_id: int,
    include_expired: bool = False,
    limit: int = 50,
) -> list[MarketplaceBroadcast]:
    query = db.query(MarketplaceBroadcast).filter(
        MarketplaceBroadcast.clan_id == clan_id
    )

    if not include_expired:
        now = utcnow()
        query = query.filter(
            (MarketplaceBroadcast.expires_at.is_(None))
            | (MarketplaceBroadcast.expires_at > now)
        )

    return (
        query.order_by(MarketplaceBroadcast.created_at.desc())
        .limit(limit)
        .all()
    )
