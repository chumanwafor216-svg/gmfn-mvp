from __future__ import annotations

from datetime import datetime, timezone
from math import floor
import os
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import (
    Clan,
    ClanMembership,
    MarketplaceBroadcast,
    MarketplaceProduct,
    MarketplaceProductRepost,
    MarketplaceReview,
    MarketplaceShop,
    User,
)
from app.services.feature_entitlements_service import (
    consume_feature_units,
    get_active_feature_quantity,
    has_active_feature,
)
from app.services.trust_events_services import log_trust_event
from app.services.vault_domain_service import (
    archive_vault_offer_for_product,
    attach_product_to_vault_block,
    ensure_vault_blocks,
    expire_vault_blocks,
    find_vault_block_for_product,
    sync_legacy_entitlements_to_blocks,
)

router = APIRouter(prefix="/marketplace", tags=["marketplace"])

FREE_COMMUNITY_PRODUCT_SLOTS = 12

TOTAL_DISTRIBUTION_SLOTS = 10
ORIGIN_SPOTLIGHT_RESERVED_SLOTS = 1
MAX_REPOST_SLOTS = TOTAL_DISTRIBUTION_SLOTS - ORIGIN_SPOTLIGHT_RESERVED_SLOTS

VISIBILITY_COMMUNITY = "community_visible"
VISIBILITY_VAULT = "vault_private"

SPOTLIGHT_FREE = "free"
SPOTLIGHT_PAID = "paid"

FEATURE_VAULT_SLOT = "vault_slot"
FEATURE_SPOTLIGHT_PRIORITY = "spotlight_priority"

# Temporary pilot override requested during live testing on 2026-04-23.
# It is now opt-in and date-limited so expired demo support cannot silently
# bypass spotlight capacity rules in production.
SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_ENABLED = str(
    os.getenv("GMFN_SPOTLIGHT_CAPACITY_OVERRIDE") or ""
).strip().lower() in {"1", "true", "yes", "on"}
SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_UNTIL = datetime(2026, 4, 24, 23, 59, 59, tzinfo=timezone.utc)

SHOP_IMAGE_ATTRS = (
    "image_url",
    "photo_url",
    "cover_image_url",
    "banner_url",
    "logo_url",
    "shop_logo_url",
)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _spotlight_capacity_pilot_override_active(now: Optional[datetime] = None) -> bool:
    if not SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_ENABLED:
        return False
    current_time = now or _now_utc()
    return current_time <= SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_UNTIL


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    s = str(value).strip()
    return s if s else default


def _uploads_root() -> Path:
    raw = str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "").strip()
    return Path(raw or "uploads").expanduser()


def _local_upload_exists(media_url: Any) -> bool:
    value = _safe_str(media_url)
    if not value:
        return False

    lowered = value.lower()
    if (
        lowered.startswith("http://")
        or lowered.startswith("https://")
        or lowered.startswith("blob:")
        or lowered.startswith("data:")
    ):
        return True

    if not value.startswith("/uploads/"):
        return True

    cleaned = value.split("?", 1)[0].split("#", 1)[0].replace("\\", "/")
    relative = cleaned[len("/uploads/") :].lstrip("/")
    if not relative:
        return False

    try:
        root = _uploads_root().resolve()
        candidate = (root / relative).resolve()
        candidate.relative_to(root)
    except Exception:
        return False

    return candidate.is_file()


def _available_media_url(media_url: Any) -> Optional[str]:
    value = _safe_str(media_url)
    if not value:
        return None
    return value if _local_upload_exists(value) else None


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _is_admin(user: Any) -> bool:
    return str(getattr(user, "role", "")).lower() == "admin"


def _resolve_visibility_mode(value: Any) -> str:
    raw = _safe_str(value, VISIBILITY_COMMUNITY).lower()

    if raw in {VISIBILITY_COMMUNITY, "public", "community"}:
        return VISIBILITY_COMMUNITY

    if raw in {VISIBILITY_VAULT, "vault", "private", "lockup", "lock-up"}:
        return VISIBILITY_VAULT

    raise HTTPException(
        status_code=400,
        detail="visibility_mode must be 'community_visible' or 'vault_private'",
    )


def _resolve_priority_mode(value: Any) -> str:
    raw = _safe_str(value, SPOTLIGHT_FREE).lower()

    if raw in {SPOTLIGHT_FREE, "standard"}:
        return SPOTLIGHT_FREE

    if raw in {SPOTLIGHT_PAID, "priority"}:
        return SPOTLIGHT_PAID

    raise HTTPException(
        status_code=400,
        detail="priority_mode must be 'free' or 'paid'",
    )


def _resolve_clan_id(
    *,
    current_user: User,
    db: Session,
    explicit_clan_id: Optional[int] = None,
    header_clan_id: Optional[str] = None,
) -> int:
    candidate = _safe_int(explicit_clan_id, 0)
    if candidate <= 0:
        candidate = _safe_int(header_clan_id, 0)

    if candidate <= 0:
        membership = (
            db.query(ClanMembership)
            .filter(
                ClanMembership.user_id == int(current_user.id),
                ClanMembership.left_at.is_(None),
            )
            .order_by(ClanMembership.created_at.asc(), ClanMembership.id.asc())
            .first()
        )
        if not membership or getattr(membership, "clan_id", None) is None:
            raise HTTPException(status_code=400, detail="No active clan selected")
        return int(membership.clan_id)

    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.clan_id == int(candidate),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not membership and not _is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="You are not an active member of this clan",
        )

    return int(candidate)


def _require_active_membership(
    *,
    db: Session,
    user_id: int,
    clan_id: int,
) -> ClanMembership:
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(user_id),
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=403,
            detail="You are not an active member of this clan",
        )
    return membership


def _get_active_clan_ids_for_user(
    *,
    db: Session,
    user_id: int,
) -> list[int]:
    rows = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(user_id),
            ClanMembership.left_at.is_(None),
        )
        .order_by(ClanMembership.created_at.asc(), ClanMembership.id.asc())
        .all()
    )
    out: list[int] = []
    seen: set[int] = set()
    for row in rows:
        clan_id = int(row.clan_id)
        if clan_id not in seen:
            out.append(clan_id)
            seen.add(clan_id)
    return out


def _get_repost_count(db: Session, *, product_id: int) -> int:
    return (
        db.query(MarketplaceProductRepost)
        .filter(MarketplaceProductRepost.original_product_id == int(product_id))
        .count()
    )


def _remaining_distribution_slots(db: Session, *, product_id: int) -> int:
    repost_count = _get_repost_count(db, product_id=int(product_id))
    remaining = MAX_REPOST_SLOTS - repost_count
    return max(0, remaining)


def _shop_is_visible_in_clan(
    db: Session,
    *,
    shop: MarketplaceShop,
    clan_id: int,
) -> bool:
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(shop.owner_user_id),
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    return membership is not None


def _get_canonical_shop_by_owner(
    db: Session,
    *,
    owner_user_id: int,
) -> Optional[MarketplaceShop]:
    return (
        db.query(MarketplaceShop)
        .filter(
            MarketplaceShop.owner_user_id == int(owner_user_id),
            MarketplaceShop.is_active.is_(True),
        )
        .order_by(MarketplaceShop.created_at.asc(), MarketplaceShop.id.asc())
        .first()
    )


def _get_user_by_identity_key(
    db: Session,
    *,
    identity_key: str,
) -> Optional[User]:
    raw = _safe_str(identity_key)
    if not raw:
        return None

    user = db.query(User).filter(User.gmfn_id == raw).first()
    if user:
        return user

    numeric_id = _safe_int(raw, 0)
    if numeric_id > 0:
        return db.query(User).filter(User.id == int(numeric_id)).first()

    return None


def _count_active_spotlights_for_clan(
    *,
    db: Session,
    clan_id: int,
    now: Optional[datetime] = None,
) -> int:
    current_time = now or _now_utc()
    return (
        db.query(MarketplaceBroadcast)
        .filter(
            MarketplaceBroadcast.clan_id == int(clan_id),
            (MarketplaceBroadcast.expires_at.is_(None))
            | (MarketplaceBroadcast.expires_at > current_time),
        )
        .count()
    )


def _count_active_paid_spotlights_for_shop(
    *,
    db: Session,
    shop_id: int,
    now: Optional[datetime] = None,
) -> int:
    current_time = now or _now_utc()
    return (
        db.query(MarketplaceBroadcast)
        .filter(MarketplaceBroadcast.shop_id == int(shop_id))
        .filter(MarketplaceBroadcast.priority_mode == SPOTLIGHT_PAID)
        .filter(
            (MarketplaceBroadcast.expires_at.is_(None))
            | (MarketplaceBroadcast.expires_at > current_time),
        )
        .count()
    )


def _member_count_for_clan(
    *,
    db: Session,
    clan_id: int,
) -> int:
    return (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .count()
    )


def _max_spotlights_for_clan(
    *,
    db: Session,
    clan_id: int,
) -> int:
    member_count = _member_count_for_clan(db=db, clan_id=int(clan_id))
    return max(1, floor(member_count * 0.4))


def _get_shop_image_value(shop: MarketplaceShop) -> Optional[str]:
    for attr in SHOP_IMAGE_ATTRS:
        if hasattr(shop, attr):
            value = _safe_str(getattr(shop, attr, None))
            if value:
                return value
    return None


def _set_shop_image_value(shop: MarketplaceShop, value: Optional[str]) -> bool:
    existing_attrs = [attr for attr in SHOP_IMAGE_ATTRS if hasattr(shop, attr)]
    if not existing_attrs:
        return False

    changed = False
    primary = existing_attrs[0]
    normalized = _safe_str(value) or None

    if getattr(shop, primary, None) != normalized:
        setattr(shop, primary, normalized)
        changed = True

    for attr in existing_attrs[1:]:
        if getattr(shop, attr, None) is not None:
            setattr(shop, attr, None)
            changed = True

    return changed


def _clear_shop_image_value(shop: MarketplaceShop) -> bool:
    changed = False
    for attr in SHOP_IMAGE_ATTRS:
        if hasattr(shop, attr) and getattr(shop, attr, None) is not None:
            setattr(shop, attr, None)
            changed = True
    return changed


def _shop_owner_can_manage(
    *,
    current_user: User,
    shop: MarketplaceShop,
) -> bool:
    return _is_admin(current_user) or int(shop.owner_user_id) == int(current_user.id)


def _product_owner_can_manage(
    *,
    db: Session,
    current_user: User,
    product: MarketplaceProduct,
) -> bool:
    if _is_admin(current_user):
        return True

    if int(product.seller_user_id) == int(current_user.id):
        return True

    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(product.shop_id))
        .first()
    )
    if shop and int(shop.owner_user_id) == int(current_user.id):
        return True

    return False


def _remove_product_reposts(
    db: Session,
    *,
    product_id: int,
) -> int:
    rows = (
        db.query(MarketplaceProductRepost)
        .filter(MarketplaceProductRepost.original_product_id == int(product_id))
        .all()
    )
    count = len(rows)
    for row in rows:
        db.delete(row)
    return count


def _count_active_products_for_shop(
    db: Session,
    *,
    shop_id: int,
    visibility_mode: str,
    exclude_product_id: Optional[int] = None,
) -> int:
    q = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.shop_id == int(shop_id))
        .filter(MarketplaceProduct.is_active.is_(True))
        .filter(MarketplaceProduct.visibility_mode == str(visibility_mode))
    )

    if exclude_product_id is not None:
        q = q.filter(MarketplaceProduct.id != int(exclude_product_id))

    return q.count()


class MarketplaceShopCreateIn(BaseModel):
    clan_id: Optional[int] = None
    name: str = Field(min_length=2, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    whatsapp_number: Optional[str] = Field(default=None, max_length=32)
    telegram_handle: Optional[str] = Field(default=None, max_length=64)
    image_url: Optional[str] = Field(default=None, max_length=4000)


class MarketplaceShopUpdateIn(BaseModel):
    clan_id: Optional[int] = None
    name: Optional[str] = Field(default=None, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    whatsapp_number: Optional[str] = Field(default=None, max_length=32)
    telegram_handle: Optional[str] = Field(default=None, max_length=64)
    image_url: Optional[str] = Field(default=None, max_length=4000)
    clear_image: Optional[bool] = False
    remove_image: Optional[bool] = False
    delete_image: Optional[bool] = False


class MarketplaceProductCreateIn(BaseModel):
    clan_id: Optional[int] = None
    shop_id: int = Field(gt=0)
    name: str = Field(min_length=2, max_length=160)
    description: Optional[str] = Field(default=None, max_length=4000)
    price: Optional[str] = Field(default=None, max_length=32)
    currency: Optional[str] = Field(default="NGN", max_length=8)
    image_url: Optional[str] = Field(default=None, max_length=4000)
    video_url: Optional[str] = Field(default=None, max_length=4000)
    visibility_mode: Optional[str] = Field(default=VISIBILITY_COMMUNITY, max_length=32)
    vault_slot_number: Optional[int] = Field(default=None, ge=1, le=6)


class MarketplaceProductUpdateIn(BaseModel):
    clan_id: Optional[int] = None
    shop_id: Optional[int] = Field(default=None, gt=0)
    name: Optional[str] = Field(default=None, max_length=160)
    description: Optional[str] = Field(default=None, max_length=4000)
    price: Optional[str] = Field(default=None, max_length=32)
    currency: Optional[str] = Field(default=None, max_length=8)
    image_url: Optional[str] = Field(default=None, max_length=4000)
    video_url: Optional[str] = Field(default=None, max_length=4000)
    visibility_mode: Optional[str] = Field(default=None, max_length=32)
    vault_slot_number: Optional[int] = Field(default=None, ge=1, le=6)
    clear_image: Optional[bool] = False
    remove_image: Optional[bool] = False
    delete_image: Optional[bool] = False
    archived: Optional[bool] = None
    is_active: Optional[bool] = None
    status: Optional[str] = Field(default=None, max_length=40)


class MarketplaceBroadcastCreateIn(BaseModel):
    clan_id: Optional[int] = None
    shop_id: Optional[int] = Field(default=None, gt=0)
    message: str = Field(min_length=2, max_length=2000)
    image_url: Optional[str] = Field(default=None, max_length=4000)
    video_url: Optional[str] = Field(default=None, max_length=4000)
    expires_at: Optional[datetime] = None
    priority_mode: Optional[str] = Field(default=SPOTLIGHT_FREE, max_length=20)
    visibility_scope: Optional[str] = Field(default="direct_communities", max_length=32)


class MarketplaceRepostCreateIn(BaseModel):
    target_clan_id: int = Field(gt=0)


def _shop_out(db: Session, shop: MarketplaceShop) -> Dict[str, Any]:
    owner = db.query(User).filter(User.id == int(shop.owner_user_id)).first()
    clan = db.query(Clan).filter(Clan.id == int(shop.clan_id)).first()

    owner_gmfn_id = _safe_str(getattr(owner, "gmfn_id", None)) or None
    owner_display_name = (
        _safe_str(getattr(owner, "display_name", None))
        or owner_gmfn_id
        or _safe_str(getattr(owner, "email", None))
        or f"Member {int(shop.owner_user_id)}"
    )

    trust_band = (
        _safe_str(getattr(owner, "trust_band", None))
        or _safe_str(getattr(owner, "trust_class", None))
        or None
    )
    trust_score = getattr(owner, "trust_score", None) if owner else None

    clan_name = (
        _safe_str(getattr(clan, "marketplace_name", None))
        or _safe_str(getattr(clan, "name", None))
        or None
    )

    image_url = _get_shop_image_value(shop)

    return {
        "id": int(shop.id),
        "clan_id": int(shop.clan_id) if shop.clan_id is not None else None,
        "owner_user_id": int(shop.owner_user_id),
        "gmfn_id": owner_gmfn_id,
        "owner_gmfn_id": owner_gmfn_id,
        "owner_name": owner_display_name,
        "owner_display_name": owner_display_name,
        "owner_nickname": _safe_str(getattr(owner, "nickname", None)) or None,
        "trust_band": trust_band,
        "trust_score": trust_score,
        "name": getattr(shop, "name", None),
        "description": shop.description,
        "whatsapp_number": shop.whatsapp_number,
        "telegram_handle": shop.telegram_handle,
        "image_url": image_url,
        "photo_url": image_url,
        "cover_image_url": image_url,
        "banner_url": image_url,
        "logo_url": image_url,
        "shop_logo_url": image_url,
        "marketplace_name": clan_name,
        "clan_name": clan_name,
        "community_name": clan_name,
        "is_active": bool(shop.is_active),
        "created_at": shop.created_at.isoformat() if shop.created_at else None,
    }


def _product_out(db: Session, product: MarketplaceProduct) -> Dict[str, Any]:
    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(product.shop_id))
        .first()
    )
    seller = db.query(User).filter(User.id == int(product.seller_user_id)).first()
    repost_count = _get_repost_count(db, product_id=int(product.id))
    remaining_slots = _remaining_distribution_slots(db, product_id=int(product.id))
    visibility_mode = _safe_str(
        getattr(product, "visibility_mode", None),
        VISIBILITY_COMMUNITY,
    )
    image_url = _available_media_url(getattr(product, "image_url", None))
    video_url = _available_media_url(getattr(product, "video_url", None))
    vault_block = None
    if visibility_mode == VISIBILITY_VAULT:
        vault_block = find_vault_block_for_product(db, product_id=int(product.id))

    return {
        "id": int(product.id),
        "clan_id": int(product.clan_id),
        "shop_id": int(product.shop_id),
        "seller_user_id": int(product.seller_user_id),
        "seller_gmfn_id": _safe_str(getattr(seller, "gmfn_id", None)) or None,
        "name": getattr(product, "name", None),
        "description": product.description,
        "price": product.price,
        "currency": product.currency,
        "image_url": image_url,
        "video_url": video_url,
        "image_url_available": bool(image_url),
        "video_url_available": bool(video_url),
        "visibility_mode": visibility_mode,
        "vault_slot_number": (
            int(vault_block.slot_number)
            if vault_block is not None and getattr(vault_block, "slot_number", None) is not None
            else None
        ),
        "vault_block_id": (
            int(vault_block.id)
            if vault_block is not None and getattr(vault_block, "id", None) is not None
            else None
        ),
        "is_active": bool(product.is_active),
        "created_at": product.created_at.isoformat() if product.created_at else None,
        "origin_clan_id": int(product.clan_id),
        "origin_shop_id": int(product.shop_id),
        "origin_shop_name": getattr(shop, "name", None) if shop else None,
        "distribution_slots_total": TOTAL_DISTRIBUTION_SLOTS,
        "distribution_slots_reserved_for_origin_spotlight": ORIGIN_SPOTLIGHT_RESERVED_SLOTS,
        "reposts_used": repost_count,
        "distribution_slots_remaining": remaining_slots,
        "shop_product_slots_total": FREE_COMMUNITY_PRODUCT_SLOTS,
    }


def _broadcast_out(db: Session, item: MarketplaceBroadcast) -> Dict[str, Any]:
    author = db.query(User).filter(User.id == int(item.author_user_id)).first()
    clan = db.query(Clan).filter(Clan.id == int(item.clan_id)).first()
    canonical_shop = None

    if getattr(item, "shop_id", None):
        canonical_shop = (
            db.query(MarketplaceShop)
            .filter(MarketplaceShop.id == int(item.shop_id))
            .first()
        )

    if canonical_shop is None:
        canonical_shop = _get_canonical_shop_by_owner(
            db,
            owner_user_id=int(item.author_user_id),
        )

    author_name = None
    if author:
        author_name = (
            _safe_str(getattr(author, "display_name", None))
            or _safe_str(getattr(author, "gmfn_id", None))
            or _safe_str(getattr(author, "email", None))
            or f"Member {int(author.id)}"
        )

    clan_display_name = None
    if clan:
        clan_display_name = (
            _safe_str(getattr(clan, "marketplace_name", None))
            or _safe_str(getattr(clan, "name", None))
            or f"Clan {int(clan.id)}"
        )

    shop_display_name = None
    if canonical_shop:
        shop_display_name = (
            _safe_str(getattr(canonical_shop, "name", None))
            or author_name
            or "Community seller"
        )

    trust_band = None
    trust_score = None
    if author:
        trust_band = _safe_str(getattr(author, "trust_band", None)) or None
        trust_score = getattr(author, "trust_score", None)

    author_gmfn_id = None
    if author:
        author_gmfn_id = (
            _safe_str(getattr(author, "gmfn_id", None))
            or str(author.id)
        )

    return {
        "id": int(item.id),
        "clan_id": int(item.clan_id),
        "author_user_id": int(item.author_user_id),
        "author_gmfn_id": author_gmfn_id,
        "shop_id": int(item.shop_id) if getattr(item, "shop_id", None) is not None else None,
        "message": item.message,
        "image_url": _available_media_url(getattr(item, "image_url", None)),
        "video_url": _available_media_url(getattr(item, "video_url", None)),
        "priority_mode": _safe_str(getattr(item, "priority_mode", None), SPOTLIGHT_FREE),
        "visibility_scope": _safe_str(
            getattr(item, "visibility_scope", None),
            "direct_communities",
        ),
        "expires_at": item.expires_at.isoformat() if item.expires_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "author_name": author_name,
        "source_shop_name": shop_display_name,
        "source_clan_name": clan_display_name,
        "trust_band": trust_band,
        "trust_score": trust_score,
    }


def _repost_out(db: Session, repost: MarketplaceProductRepost) -> Dict[str, Any]:
    product = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.id == int(repost.original_product_id))
        .first()
    )
    remaining_slots = (
        _remaining_distribution_slots(db, product_id=int(product.id))
        if product
        else 0
    )

    return {
        "id": int(repost.id),
        "original_product_id": int(repost.original_product_id),
        "reposted_by_user_id": int(repost.reposted_by_user_id),
        "target_clan_id": int(repost.target_clan_id),
        "created_at": repost.created_at.isoformat() if repost.created_at else None,
        "remaining_distribution_slots": remaining_slots,
    }


@router.get("/shops")
def list_marketplace_shops(
    clan_id: Optional[int] = Query(default=None),
    only_active: bool = Query(default=True),
    limit: int = Query(default=50, ge=1, le=200),
    x_clan_id: Optional[str] = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    resolved_clan_id = _resolve_clan_id(
        current_user=current_user,
        db=db,
        explicit_clan_id=clan_id,
        header_clan_id=x_clan_id,
    )

    q = db.query(MarketplaceShop)
    if only_active:
        q = q.filter(MarketplaceShop.is_active.is_(True))

    rows = (
        q.order_by(MarketplaceShop.created_at.desc(), MarketplaceShop.id.desc())
        .all()
    )

    visible = [
        row for row in rows if _shop_is_visible_in_clan(db, shop=row, clan_id=resolved_clan_id)
    ][: int(limit)]

    return {
        "items": [_shop_out(db, x) for x in visible],
        "total": len(visible),
        "clan_id": resolved_clan_id,
    }


@router.get("/shops/by-gmfn/{gmfn_id}")
def get_marketplace_shop_by_gmfn_id(
    gmfn_id: str,
    clan_id: Optional[int] = Query(default=None),
    x_clan_id: Optional[str] = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    requested_clan_id = _resolve_clan_id(
        current_user=current_user,
        db=db,
        explicit_clan_id=clan_id,
        header_clan_id=x_clan_id,
    )

    owner = _get_user_by_identity_key(db, identity_key=gmfn_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Seller identity not found")

    shop = _get_canonical_shop_by_owner(
        db,
        owner_user_id=int(owner.id),
    )
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    resolved_clan_id = int(requested_clan_id)
    if (
        int(owner.id) == int(current_user.id)
        and not _shop_is_visible_in_clan(db, shop=shop, clan_id=resolved_clan_id)
    ):
        shop_clan_id = int(getattr(shop, "clan_id", 0) or 0)
        if shop_clan_id > 0:
            resolved_clan_id = shop_clan_id

    if not _shop_is_visible_in_clan(db, shop=shop, clan_id=resolved_clan_id):
        raise HTTPException(
            status_code=404,
            detail="Shop is not visible in the selected community",
        )

    product_rows = (
        db.query(MarketplaceProduct)
        .filter(
            MarketplaceProduct.shop_id == int(shop.id),
            MarketplaceProduct.is_active.is_(True),
        )
        .order_by(MarketplaceProduct.created_at.desc(), MarketplaceProduct.id.desc())
        .all()
    )

    visible_products = [
        _product_out(db, p)
        for p in product_rows
        if _safe_str(getattr(p, "visibility_mode", None), VISIBILITY_COMMUNITY)
        == VISIBILITY_COMMUNITY
    ]

    return {
        "ok": True,
        "item": _shop_out(db, shop),
        "products": visible_products,
        "gmfn_id": _safe_str(getattr(owner, "gmfn_id", None)) or gmfn_id,
        "clan_id": resolved_clan_id,
    }


@router.get("/public/shop/{gmfn_id}")
def get_public_marketplace_shop_by_gmfn_id(
    gmfn_id: str,
    clan_id: Optional[int] = Query(default=None),
    product_id: Optional[int] = Query(default=None),
    product_limit: int = Query(default=100, ge=1, le=300),
    broadcast_limit: int = Query(default=24, ge=1, le=100),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    owner = _get_user_by_identity_key(db, identity_key=gmfn_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Seller identity not found")

    shop = _get_canonical_shop_by_owner(
        db,
        owner_user_id=int(owner.id),
    )
    if not shop or not bool(getattr(shop, "is_active", True)):
        raise HTTPException(status_code=404, detail="Shop not found")

    requested_clan_id = _safe_int(clan_id, 0)
    requested_clan = None
    if requested_clan_id > 0:
        if not _shop_is_visible_in_clan(db, shop=shop, clan_id=requested_clan_id):
            raise HTTPException(
                status_code=404,
                detail="Shop is not visible in the selected community",
            )
        requested_clan = (
            db.query(Clan)
            .filter(Clan.id == int(requested_clan_id))
            .first()
        )

    product_query = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.shop_id == int(shop.id))
        .filter(MarketplaceProduct.is_active.is_(True))
        .filter(MarketplaceProduct.visibility_mode == VISIBILITY_COMMUNITY)
    )
    if requested_clan_id > 0:
        product_query = product_query.filter(
            MarketplaceProduct.clan_id == int(requested_clan_id)
        )

    product_rows = (
        product_query.order_by(
            MarketplaceProduct.created_at.desc(),
            MarketplaceProduct.id.desc(),
        )
        .limit(int(product_limit))
        .all()
    )

    requested_product_id = _safe_int(product_id, 0)
    if requested_product_id > 0 and all(
        int(getattr(row, "id", 0) or 0) != requested_product_id
        for row in product_rows
    ):
        requested_product = (
            db.query(MarketplaceProduct)
            .filter(MarketplaceProduct.id == int(requested_product_id))
            .filter(MarketplaceProduct.shop_id == int(shop.id))
            .filter(MarketplaceProduct.is_active.is_(True))
            .filter(MarketplaceProduct.visibility_mode == VISIBILITY_COMMUNITY)
            .first()
        )
        if requested_product is not None:
            product_rows = [requested_product, *product_rows]

    current_time = _now_utc()
    broadcast_query = (
        db.query(MarketplaceBroadcast)
        .filter(MarketplaceBroadcast.author_user_id == int(owner.id))
        .filter(
            (MarketplaceBroadcast.expires_at.is_(None))
            | (MarketplaceBroadcast.expires_at > current_time)
        )
    )
    if requested_clan_id > 0:
        broadcast_query = broadcast_query.filter(
            MarketplaceBroadcast.clan_id == int(requested_clan_id)
        )

    broadcast_rows = (
        broadcast_query.order_by(
            MarketplaceBroadcast.created_at.desc(),
            MarketplaceBroadcast.id.desc(),
        )
        .limit(int(broadcast_limit))
        .all()
    )

    effective_clan = requested_clan
    if effective_clan is None and requested_clan_id > 0:
        effective_clan = (
            db.query(Clan)
            .filter(Clan.id == int(requested_clan_id))
            .first()
        )

    return {
        "ok": True,
        "item": _shop_out(db, shop),
        "products": [_product_out(db, row) for row in product_rows],
        "broadcasts": [_broadcast_out(db, row) for row in broadcast_rows],
        "primary_broadcast": _broadcast_out(db, broadcast_rows[0]) if broadcast_rows else None,
        "gmfn_id": _safe_str(getattr(owner, "gmfn_id", None)) or gmfn_id,
        "clan_id": requested_clan_id if requested_clan_id > 0 else None,
        "community_name": (
            _safe_str(getattr(effective_clan, "marketplace_name", None))
            or _safe_str(getattr(effective_clan, "name", None))
            or None
        ),
        "is_public_shop_face": True,
    }


@router.post("/shops")
def create_marketplace_shop(
    payload: MarketplaceShopCreateIn,
    x_clan_id: Optional[str] = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    resolved_clan_id = _resolve_clan_id(
        current_user=current_user,
        db=db,
        explicit_clan_id=payload.clan_id,
        header_clan_id=x_clan_id,
    )

    _require_active_membership(
        db=db,
        user_id=int(current_user.id),
        clan_id=resolved_clan_id,
    )

    existing_shop = _get_canonical_shop_by_owner(
        db,
        owner_user_id=int(current_user.id),
    )

    if existing_shop:
        changed = False

        if _safe_str(payload.name) and existing_shop.name != _safe_str(payload.name):
            existing_shop.name = _safe_str(payload.name)
            changed = True

        if payload.description is not None:
            new_description = _safe_str(payload.description) or None
            if existing_shop.description != new_description:
                existing_shop.description = new_description
                changed = True

        if payload.whatsapp_number is not None:
            new_whatsapp = _safe_str(payload.whatsapp_number) or None
            if existing_shop.whatsapp_number != new_whatsapp:
                existing_shop.whatsapp_number = new_whatsapp
                changed = True

        if payload.telegram_handle is not None:
            new_telegram = _safe_str(payload.telegram_handle) or None
            if existing_shop.telegram_handle != new_telegram:
                existing_shop.telegram_handle = new_telegram
                changed = True

        if payload.image_url is not None:
            changed = _set_shop_image_value(
                existing_shop,
                _safe_str(payload.image_url) or None,
            ) or changed

        if existing_shop.clan_id is None:
            existing_shop.clan_id = int(resolved_clan_id)
            changed = True

        if changed:
            db.add(existing_shop)
            db.commit()
            db.refresh(existing_shop)

            log_trust_event(
                db,
                event_type="marketplace.shop.updated",
                clan_id=resolved_clan_id,
                actor_user_id=int(current_user.id),
                subject_user_id=int(current_user.id),
                loan_id=None,
                guarantor_id=None,
                meta={
                    "shop_id": int(existing_shop.id),
                    "shop_name": getattr(existing_shop, "name", None),
                    "reason": "marketplace_shop_updated_via_upsert",
                },
                commit=False,
                refresh=False,
            )
            db.commit()

        return {
            "ok": True,
            "item": _shop_out(db, existing_shop),
            "detail": "Existing canonical shop returned.",
        }

    shop = MarketplaceShop(
        clan_id=int(resolved_clan_id),
        owner_user_id=int(current_user.id),
        name=_safe_str(payload.name),
        description=_safe_str(payload.description) or None,
        whatsapp_number=_safe_str(payload.whatsapp_number) or None,
        telegram_handle=_safe_str(payload.telegram_handle) or None,
        is_active=True,
        created_at=_now_utc(),
    )

    _set_shop_image_value(shop, _safe_str(payload.image_url) or None)

    db.add(shop)
    db.commit()
    db.refresh(shop)

    log_trust_event(
        db,
        event_type="marketplace.shop.created",
        clan_id=resolved_clan_id,
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        loan_id=None,
        guarantor_id=None,
        meta={
            "shop_id": int(shop.id),
            "shop_name": getattr(shop, "name", None),
            "canonical_shop": True,
            "reason": "marketplace_shop_created",
        },
        commit=False,
        refresh=False,
    )
    db.commit()

    return {"ok": True, "item": _shop_out(db, shop)}


@router.put("/shops/{shop_id}")
@router.patch("/shops/{shop_id}")
def update_marketplace_shop(
    shop_id: int,
    payload: MarketplaceShopUpdateIn,
    x_clan_id: Optional[str] = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(shop_id))
        .first()
    )
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    if not _shop_owner_can_manage(current_user=current_user, shop=shop):
        raise HTTPException(status_code=403, detail="Only the shop owner can update this shop")

    resolved_clan_id = _resolve_clan_id(
        current_user=current_user,
        db=db,
        explicit_clan_id=payload.clan_id or int(shop.clan_id or 0),
        header_clan_id=x_clan_id,
    )

    _require_active_membership(
        db=db,
        user_id=int(current_user.id),
        clan_id=resolved_clan_id,
    )

    provided = set(payload.__fields_set__ or set())
    changed = False

    if "name" in provided and payload.name is not None:
        new_name = _safe_str(payload.name)
        if not new_name:
            raise HTTPException(status_code=400, detail="Shop name cannot be empty")
        if shop.name != new_name:
            shop.name = new_name
            changed = True

    if "description" in provided:
        new_description = _safe_str(payload.description) or None
        if shop.description != new_description:
            shop.description = new_description
            changed = True

    if "whatsapp_number" in provided:
        new_whatsapp = _safe_str(payload.whatsapp_number) or None
        if shop.whatsapp_number != new_whatsapp:
            shop.whatsapp_number = new_whatsapp
            changed = True

    if "telegram_handle" in provided:
        new_telegram = _safe_str(payload.telegram_handle) or None
        if shop.telegram_handle != new_telegram:
            shop.telegram_handle = new_telegram
            changed = True

    clear_image_requested = bool(
        payload.clear_image or payload.remove_image or payload.delete_image
    )

    if clear_image_requested:
        changed = _clear_shop_image_value(shop) or changed
    elif "image_url" in provided:
        changed = _set_shop_image_value(
            shop,
            _safe_str(payload.image_url) or None,
        ) or changed

    if changed:
        db.add(shop)
        db.commit()
        db.refresh(shop)

        log_trust_event(
            db,
            event_type="marketplace.shop.updated",
            clan_id=resolved_clan_id,
            actor_user_id=int(current_user.id),
            subject_user_id=int(current_user.id),
            loan_id=None,
            guarantor_id=None,
            meta={
                "shop_id": int(shop.id),
                "shop_name": getattr(shop, "name", None),
                "reason": "marketplace_shop_updated",
            },
            commit=False,
            refresh=False,
        )
        db.commit()

    return {
        "ok": True,
        "item": _shop_out(db, shop),
        "detail": "Shop updated.",
    }


@router.get("/products")
def list_marketplace_products(
    clan_id: Optional[int] = Query(default=None),
    shop_id: Optional[int] = Query(default=None),
    only_active: bool = Query(default=True),
    include_reposted: bool = Query(default=True),
    include_private_manage: bool = Query(default=False),
    limit: int = Query(default=100, ge=1, le=300),
    x_clan_id: Optional[str] = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    resolved_clan_id = _resolve_clan_id(
        current_user=current_user,
        db=db,
        explicit_clan_id=clan_id,
        header_clan_id=x_clan_id,
    )

    if include_private_manage and shop_id and int(shop_id) > 0:
        shop = (
            db.query(MarketplaceShop)
            .filter(MarketplaceShop.id == int(shop_id))
            .first()
        )
        if not shop:
            raise HTTPException(status_code=404, detail="Shop not found")

        if not _shop_owner_can_manage(current_user=current_user, shop=shop):
            raise HTTPException(
                status_code=403,
                detail="Only the shop owner can open private shop management items",
            )

        q = db.query(MarketplaceProduct).filter(
            MarketplaceProduct.shop_id == int(shop_id)
        )

        if only_active:
            q = q.filter(MarketplaceProduct.is_active.is_(True))

        items = (
            q.order_by(MarketplaceProduct.created_at.desc(), MarketplaceProduct.id.desc())
            .limit(int(limit))
            .all()
        )

        return {
            "items": [_product_out(db, x) for x in items],
            "total": len(items),
            "clan_id": resolved_clan_id,
            "shop_id": int(shop_id),
            "include_private_manage": True,
        }

    q = db.query(MarketplaceProduct).filter(
        MarketplaceProduct.visibility_mode == VISIBILITY_COMMUNITY
    )

    if only_active:
        q = q.filter(MarketplaceProduct.is_active.is_(True))

    if shop_id and int(shop_id) > 0:
        q = q.filter(MarketplaceProduct.shop_id == int(shop_id))

    items = q.all()

    visible_items: list[MarketplaceProduct] = []
    for item in items:
        if _safe_str(getattr(item, "visibility_mode", None), VISIBILITY_COMMUNITY) != VISIBILITY_COMMUNITY:
            continue

        shop = (
            db.query(MarketplaceShop)
            .filter(MarketplaceShop.id == int(item.shop_id))
            .first()
        )
        if not shop:
            continue
        if not _shop_is_visible_in_clan(db, shop=shop, clan_id=resolved_clan_id):
            continue
        visible_items.append(item)

    visible_items.sort(
        key=lambda x: (
            x.created_at or _now_utc(),
            x.id or 0,
        ),
        reverse=True,
    )
    visible_items = visible_items[: int(limit)]

    return {
        "items": [_product_out(db, x) for x in visible_items],
        "total": len(visible_items),
        "clan_id": resolved_clan_id,
    }


@router.post("/products")
def create_marketplace_product(
    payload: MarketplaceProductCreateIn,
    x_clan_id: Optional[str] = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    resolved_clan_id = _resolve_clan_id(
        current_user=current_user,
        db=db,
        explicit_clan_id=payload.clan_id,
        header_clan_id=x_clan_id,
    )

    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(payload.shop_id))
        .first()
    )
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    if int(shop.owner_user_id) != int(current_user.id) and not _is_admin(current_user):
        raise HTTPException(
            status_code=403,
            detail="Only the shop owner can add products",
        )

    _require_active_membership(
        db=db,
        user_id=int(current_user.id),
        clan_id=resolved_clan_id,
    )

    if not _safe_str(payload.name):
        raise HTTPException(status_code=400, detail="Product name is required")

    if not _safe_str(payload.price):
        raise HTTPException(status_code=400, detail="Product price is required")

    if not _safe_str(payload.image_url):
        raise HTTPException(status_code=400, detail="Product image is required")

    visibility_mode = _resolve_visibility_mode(payload.visibility_mode)

    if visibility_mode == VISIBILITY_COMMUNITY:
        active_product_count = _count_active_products_for_shop(
            db,
            shop_id=int(shop.id),
            visibility_mode=VISIBILITY_COMMUNITY,
        )
        if active_product_count >= FREE_COMMUNITY_PRODUCT_SLOTS:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum of {FREE_COMMUNITY_PRODUCT_SLOTS} community-visible products allowed per shop",
            )
    else:
        sync_legacy_entitlements_to_blocks(
            db,
            shop_id=int(shop.id),
            owner_user_id=int(current_user.id),
        )
        expire_vault_blocks(db, shop_id=int(shop.id))
        vault_blocks = ensure_vault_blocks(db, shop_id=int(shop.id))
        active_empty_blocks = [
            block
            for block in vault_blocks
            if str(getattr(block, "state", "") or "") == "active"
            and getattr(block, "product_id", None) is None
        ]
        if payload.vault_slot_number is not None:
            requested = next(
                (block for block in vault_blocks if int(block.slot_number) == int(payload.vault_slot_number)),
                None,
            )
            if requested is None or str(getattr(requested, "state", "") or "") != "active":
                raise HTTPException(
                    status_code=403,
                    detail="Selected Vault block is not active. Activate a paid Vault slot first.",
                )
            if getattr(requested, "product_id", None) is not None:
                raise HTTPException(
                    status_code=400,
                    detail="Selected Vault block already has private content. Edit that block or choose an empty one.",
                )
            active_empty_blocks = [requested]

        if not active_empty_blocks:
            raise HTTPException(
                status_code=403,
                detail="No active empty Vault block is available for this shop.",
            )

    product = MarketplaceProduct(
        clan_id=resolved_clan_id,
        shop_id=int(shop.id),
        seller_user_id=int(current_user.id),
        name=_safe_str(payload.name),
        description=_safe_str(payload.description) or None,
        price=_safe_str(payload.price) or None,
        currency=_safe_str(payload.currency, "NGN") or "NGN",
        image_url=_safe_str(payload.image_url) or None,
        visibility_mode=visibility_mode,
        is_active=True,
        created_at=_now_utc(),
    )

    if hasattr(product, "video_url"):
        setattr(product, "video_url", _safe_str(payload.video_url) or None)

    try:
        db.add(product)
        db.flush()
        if visibility_mode == VISIBILITY_VAULT:
            attach_product_to_vault_block(
                db,
                shop_id=int(shop.id),
                owner_user_id=int(current_user.id),
                product=product,
                slot_number=payload.vault_slot_number,
            )
        db.commit()
        db.refresh(product)
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    log_trust_event(
        db,
        event_type="marketplace.product.created",
        clan_id=resolved_clan_id,
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        loan_id=None,
        guarantor_id=None,
        meta={
            "product_id": int(product.id),
            "shop_id": int(shop.id),
            "name": getattr(product, "name", None),
            "price": product.price,
            "currency": product.currency,
            "image_url": product.image_url,
            "video_url": getattr(product, "video_url", None),
            "visibility_mode": visibility_mode,
            "distribution_slots_total": TOTAL_DISTRIBUTION_SLOTS,
            "distribution_slots_reserved_for_origin_spotlight": ORIGIN_SPOTLIGHT_RESERVED_SLOTS,
            "distribution_slots_remaining": _remaining_distribution_slots(
                db,
                product_id=int(product.id),
            ),
            "shop_product_slots_total": FREE_COMMUNITY_PRODUCT_SLOTS,
            "reason": "marketplace_product_created",
        },
        commit=False,
        refresh=False,
    )
    db.commit()

    return {"ok": True, "item": _product_out(db, product)}


@router.put("/products/{product_id}")
@router.patch("/products/{product_id}")
def update_marketplace_product(
    product_id: int,
    payload: MarketplaceProductUpdateIn,
    x_clan_id: Optional[str] = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    product = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.id == int(product_id))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if not _product_owner_can_manage(db=db, current_user=current_user, product=product):
        raise HTTPException(status_code=403, detail="Only the shop owner can update this product")

    resolved_clan_id = _resolve_clan_id(
        current_user=current_user,
        db=db,
        explicit_clan_id=payload.clan_id or int(product.clan_id or 0),
        header_clan_id=x_clan_id,
    )

    _require_active_membership(
        db=db,
        user_id=int(current_user.id),
        clan_id=int(product.clan_id),
    )

    provided = set(payload.__fields_set__ or set())
    changed = False
    removed_reposts = 0

    target_shop_id = int(product.shop_id)
    if "shop_id" in provided and payload.shop_id is not None and int(payload.shop_id) != int(product.shop_id):
        shop = (
            db.query(MarketplaceShop)
            .filter(MarketplaceShop.id == int(payload.shop_id))
            .first()
        )
        if not shop:
            raise HTTPException(status_code=404, detail="Target shop not found")
        if not _shop_owner_can_manage(current_user=current_user, shop=shop):
            raise HTTPException(status_code=403, detail="You cannot move this product to that shop")
        product.shop_id = int(payload.shop_id)
        target_shop_id = int(payload.shop_id)
        changed = True

    if "name" in provided and payload.name is not None:
        new_name = _safe_str(payload.name)
        if not new_name:
            raise HTTPException(status_code=400, detail="Product name cannot be empty")
        if product.name != new_name:
            product.name = new_name
            changed = True

    if "description" in provided:
        new_description = _safe_str(payload.description) or None
        if product.description != new_description:
            product.description = new_description
            changed = True

    if "price" in provided:
        new_price = _safe_str(payload.price) or None
        if product.price != new_price:
            product.price = new_price
            changed = True

    if "currency" in provided and payload.currency is not None:
        new_currency = _safe_str(payload.currency) or "NGN"
        if product.currency != new_currency:
            product.currency = new_currency
            changed = True

    clear_image_requested = bool(
        payload.clear_image or payload.remove_image or payload.delete_image
    )
    if clear_image_requested:
        if getattr(product, "image_url", None) is not None:
            product.image_url = None
            changed = True
    elif "image_url" in provided:
        new_image = _safe_str(payload.image_url) or None
        if getattr(product, "image_url", None) != new_image:
            product.image_url = new_image
            changed = True

    if hasattr(product, "video_url") and "video_url" in provided:
        new_video = _safe_str(payload.video_url) or None
        if getattr(product, "video_url", None) != new_video:
            setattr(product, "video_url", new_video)
            changed = True

    current_visibility = _safe_str(
        getattr(product, "visibility_mode", None),
        VISIBILITY_COMMUNITY,
    )
    target_visibility = current_visibility
    if "visibility_mode" in provided and payload.visibility_mode is not None:
        target_visibility = _resolve_visibility_mode(payload.visibility_mode)

    current_active = bool(getattr(product, "is_active", True))
    soft_remove_requested = (
        payload.archived is True
        or payload.is_active is False
        or _safe_str(payload.status).lower() in {"removed", "archived", "deleted", "inactive"}
    )
    restore_requested = (
        not soft_remove_requested
        and (
            payload.is_active is True
            or _safe_str(payload.status).lower() in {"active", "restore", "restored", "live"}
        )
    )
    target_active = False if soft_remove_requested else True if restore_requested else current_active

    if target_active and target_visibility == VISIBILITY_COMMUNITY:
        active_product_count = _count_active_products_for_shop(
            db,
            shop_id=int(target_shop_id),
            visibility_mode=VISIBILITY_COMMUNITY,
            exclude_product_id=int(product.id),
        )
        if active_product_count >= FREE_COMMUNITY_PRODUCT_SLOTS:
            raise HTTPException(
                status_code=400,
                detail=f"Maximum of {FREE_COMMUNITY_PRODUCT_SLOTS} community-visible products allowed per shop",
            )
    elif target_active:
        sync_legacy_entitlements_to_blocks(
            db,
            shop_id=int(target_shop_id),
            owner_user_id=int(current_user.id),
        )
        expire_vault_blocks(db, shop_id=int(target_shop_id))
        vault_blocks = ensure_vault_blocks(db, shop_id=int(target_shop_id))
        current_block = next(
            (
                block
                for block in vault_blocks
                if getattr(block, "product_id", None) is not None
                and int(block.product_id) == int(product.id)
            ),
            None,
        )
        if payload.vault_slot_number is not None:
            requested = next(
                (block for block in vault_blocks if int(block.slot_number) == int(payload.vault_slot_number)),
                None,
            )
            if requested is None or str(getattr(requested, "state", "") or "") != "active":
                raise HTTPException(
                    status_code=403,
                    detail="Selected Vault block is not active. Activate a paid Vault slot first.",
                )
            if (
                getattr(requested, "product_id", None) is not None
                and int(requested.product_id) != int(product.id)
            ):
                raise HTTPException(
                    status_code=400,
                    detail="Selected Vault block already has private content. Edit that block or choose an empty one.",
                )
        active_empty_exists = any(
            str(getattr(block, "state", "") or "") == "active"
            and getattr(block, "product_id", None) is None
            for block in vault_blocks
        )
        if current_block is None and not active_empty_exists and payload.vault_slot_number is None:
            raise HTTPException(
                status_code=403,
                detail="No active empty Vault block is available for this shop.",
            )
        if (
            payload.vault_slot_number is not None
            and current_block is not None
            and int(current_block.slot_number) != int(payload.vault_slot_number)
        ):
            changed = True

    if target_visibility != current_visibility:
        if target_visibility == VISIBILITY_VAULT:
            removed_reposts += _remove_product_reposts(db, product_id=int(product.id))
        product.visibility_mode = target_visibility
        changed = True

    if soft_remove_requested and bool(getattr(product, "is_active", True)):
        product.is_active = False
        removed_reposts += _remove_product_reposts(db, product_id=int(product.id))
        changed = True
    elif restore_requested and not bool(getattr(product, "is_active", True)):
        product.is_active = True
        changed = True

    if changed:
        try:
            db.add(product)
            db.flush()

            if target_visibility == VISIBILITY_VAULT and bool(getattr(product, "is_active", True)):
                attach_product_to_vault_block(
                    db,
                    shop_id=int(target_shop_id),
                    owner_user_id=int(current_user.id),
                    product=product,
                    slot_number=payload.vault_slot_number,
                )
            elif current_visibility == VISIBILITY_VAULT or target_visibility == VISIBILITY_VAULT:
                archive_vault_offer_for_product(db, product_id=int(product.id))

            event_type = "marketplace.product.updated"
            reason = "marketplace_product_updated"
            if soft_remove_requested:
                event_type = "marketplace.product.removed"
                reason = "marketplace_product_removed"
            elif restore_requested:
                event_type = "marketplace.product.restored"
                reason = "marketplace_product_restored"

            log_trust_event(
                db,
                event_type=event_type,
                clan_id=resolved_clan_id,
                actor_user_id=int(current_user.id),
                subject_user_id=int(current_user.id),
                loan_id=None,
                guarantor_id=None,
                meta={
                    "product_id": int(product.id),
                    "shop_id": int(product.shop_id),
                    "visibility_mode": _safe_str(getattr(product, "visibility_mode", None), VISIBILITY_COMMUNITY),
                    "removed_reposts": removed_reposts,
                    "image_url": getattr(product, "image_url", None),
                    "reason": reason,
                },
                commit=False,
                refresh=False,
            )
            db.commit()
            db.refresh(product)
        except ValueError as exc:
            db.rollback()
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "ok": True,
        "item": _product_out(db, product),
        "removed_reposts": removed_reposts,
        "detail": (
            "Product restored to visible blocks."
            if restore_requested
            else "Product updated."
            if not soft_remove_requested
            else "Product removed from visible blocks."
        ),
    }


@router.delete("/products/{product_id}")
@router.post("/products/{product_id}/delete")
@router.post("/products/{product_id}/archive")
def delete_marketplace_product(
    product_id: int,
    x_clan_id: Optional[str] = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    product = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.id == int(product_id))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if not _product_owner_can_manage(db=db, current_user=current_user, product=product):
        raise HTTPException(status_code=403, detail="Only the shop owner can delete this product")

    resolved_clan_id = _resolve_clan_id(
        current_user=current_user,
        db=db,
        explicit_clan_id=int(product.clan_id or 0),
        header_clan_id=x_clan_id,
    )

    _require_active_membership(
        db=db,
        user_id=int(current_user.id),
        clan_id=int(product.clan_id),
    )

    removed_reposts = _remove_product_reposts(db, product_id=int(product.id))
    snapshot = _product_out(db, product)

    if hasattr(product, "is_active"):
        product.is_active = False
        db.add(product)
        db.commit()
        db.refresh(product)

        log_trust_event(
            db,
            event_type="marketplace.product.removed",
            clan_id=resolved_clan_id,
            actor_user_id=int(current_user.id),
            subject_user_id=int(current_user.id),
            loan_id=None,
            guarantor_id=None,
            meta={
                "product_id": int(product.id),
                "shop_id": int(product.shop_id),
                "visibility_mode": _safe_str(getattr(product, "visibility_mode", None), VISIBILITY_COMMUNITY),
                "removed_reposts": removed_reposts,
                "reason": "marketplace_product_deleted_soft",
            },
            commit=False,
            refresh=False,
        )
        db.commit()

        return {
            "ok": True,
            "item": _product_out(db, product),
            "removed_reposts": removed_reposts,
            "detail": "Product block removed.",
        }

    db.delete(product)
    db.commit()

    log_trust_event(
        db,
        event_type="marketplace.product.removed",
        clan_id=resolved_clan_id,
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        loan_id=None,
        guarantor_id=None,
        meta={
            "product_id": int(snapshot["id"]),
            "shop_id": int(snapshot["shop_id"]),
            "visibility_mode": snapshot.get("visibility_mode"),
            "removed_reposts": removed_reposts,
            "reason": "marketplace_product_deleted_hard",
        },
        commit=False,
        refresh=False,
    )
    db.commit()

    return {
        "ok": True,
        "item": snapshot,
        "removed_reposts": removed_reposts,
        "detail": "Product block removed.",
    }


@router.post("/products/{product_id}/repost")
def repost_marketplace_product(
    product_id: int,
    payload: MarketplaceRepostCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    product = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.id == int(product_id))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if _safe_str(getattr(product, "visibility_mode", None), VISIBILITY_COMMUNITY) != VISIBILITY_COMMUNITY:
        raise HTTPException(
            status_code=400,
            detail="Vault products cannot be reposted into ordinary community distribution.",
        )

    target_clan_id = int(payload.target_clan_id)
    origin_clan_id = int(product.clan_id)

    if target_clan_id == origin_clan_id:
        raise HTTPException(
            status_code=400,
            detail="Cannot repost a product back into its origin clan",
        )

    _require_active_membership(
        db=db,
        user_id=int(current_user.id),
        clan_id=target_clan_id,
    )

    existing = (
        db.query(MarketplaceProductRepost)
        .filter(
            MarketplaceProductRepost.original_product_id == int(product.id),
            MarketplaceProductRepost.reposted_by_user_id == int(current_user.id),
            MarketplaceProductRepost.target_clan_id == target_clan_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="You already reposted this product to that clan",
        )

    remaining_slots = _remaining_distribution_slots(db, product_id=int(product.id))
    if remaining_slots <= 0:
        raise HTTPException(
            status_code=400,
            detail="No distribution slots remaining for this product",
        )

    repost = MarketplaceProductRepost(
        original_product_id=int(product.id),
        reposted_by_user_id=int(current_user.id),
        target_clan_id=target_clan_id,
        created_at=_now_utc(),
    )
    db.add(repost)
    db.commit()
    db.refresh(repost)

    remaining_after = _remaining_distribution_slots(db, product_id=int(product.id))

    log_trust_event(
        db,
        event_type="marketplace.product.reposted",
        clan_id=target_clan_id,
        actor_user_id=int(current_user.id),
        subject_user_id=int(product.seller_user_id),
        loan_id=None,
        guarantor_id=None,
        meta={
            "product_id": int(product.id),
            "origin_clan_id": origin_clan_id,
            "target_clan_id": target_clan_id,
            "repost_id": int(repost.id),
            "visibility_mode": _safe_str(getattr(product, "visibility_mode", None), VISIBILITY_COMMUNITY),
            "distribution_slots_total": TOTAL_DISTRIBUTION_SLOTS,
            "distribution_slots_reserved_for_origin_spotlight": ORIGIN_SPOTLIGHT_RESERVED_SLOTS,
            "distribution_slots_remaining": remaining_after,
            "reason": "marketplace_product_reposted",
        },
        commit=False,
        refresh=False,
    )
    db.commit()

    return {
        "ok": True,
        "item": _repost_out(db, repost),
        "product": _product_out(db, product),
    }


@router.get("/products/{product_id}/reposts")
def list_marketplace_product_reposts(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    product = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.id == int(product_id))
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    _require_active_membership(
        db=db,
        user_id=int(current_user.id),
        clan_id=int(product.clan_id),
    )

    rows = (
        db.query(MarketplaceProductRepost)
        .filter(MarketplaceProductRepost.original_product_id == int(product.id))
        .order_by(
            MarketplaceProductRepost.created_at.desc(),
            MarketplaceProductRepost.id.desc(),
        )
        .all()
    )

    return {
        "items": [_repost_out(db, x) for x in rows],
        "total": len(rows),
        "product": _product_out(db, product),
    }


@router.get("/shops/{shop_id}/spotlight-status")
def get_shop_spotlight_status(
    shop_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(shop_id))
        .first()
    )
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    if not _shop_owner_can_manage(current_user=current_user, shop=shop):
        raise HTTPException(
            status_code=403,
            detail="Only the shop owner can view paid spotlight status",
        )

    now = _now_utc()
    available_paid_credits = get_active_feature_quantity(
        db,
        owner_user_id=int(current_user.id),
        feature_code=FEATURE_SPOTLIGHT_PRIORITY,
        shop_id=int(shop.id),
    )
    active_paid_spotlights = _count_active_paid_spotlights_for_shop(
        db=db,
        shop_id=int(shop.id),
        now=now,
    )

    return {
        "ok": True,
        "shop_id": int(shop.id),
        "feature_code": FEATURE_SPOTLIGHT_PRIORITY,
        "available_paid_credits": int(available_paid_credits),
        "active_paid_spotlights": int(active_paid_spotlights),
        "can_publish_paid_spotlight": bool(
            available_paid_credits > 0 and active_paid_spotlights <= 0
        ),
        "payment_context": "spotlight_subscription",
        "priority_mode": SPOTLIGHT_PAID,
    }


@router.get("/broadcasts")
def list_marketplace_broadcasts(
    clan_id: Optional[int] = Query(default=None),
    active_only: bool = Query(default=True),
    limit: int = Query(default=100, ge=1, le=300),
    x_clan_id: Optional[str] = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    explicit_candidate = _safe_int(clan_id, 0)
    header_candidate = _safe_int(x_clan_id, 0)

    selected_clan_id: Optional[int] = None
    if explicit_candidate > 0:
        selected_clan_id = int(explicit_candidate)
    elif header_candidate > 0:
        selected_clan_id = int(header_candidate)

    if selected_clan_id is not None:
        _require_active_membership(
            db=db,
            user_id=int(current_user.id),
            clan_id=int(selected_clan_id),
        )
        clan_ids = [int(selected_clan_id)]
    else:
        clan_ids = _get_active_clan_ids_for_user(
            db=db,
            user_id=int(current_user.id),
        )
        if not clan_ids:
            return {
                "items": [],
                "total": 0,
                "clan_id": None,
            }

    q = db.query(MarketplaceBroadcast).filter(
        MarketplaceBroadcast.clan_id.in_(clan_ids)
    )

    if active_only:
        now = _now_utc()
        q = q.filter(
            (MarketplaceBroadcast.expires_at.is_(None))
            | (MarketplaceBroadcast.expires_at > now)
        )

    matching_total = q.count()
    video_total = q.filter(
        MarketplaceBroadcast.video_url.isnot(None),
        MarketplaceBroadcast.video_url != "",
    ).count()
    image_total = q.filter(
        MarketplaceBroadcast.image_url.isnot(None),
        MarketplaceBroadcast.image_url != "",
    ).count()

    items = (
        q.order_by(MarketplaceBroadcast.created_at.desc(), MarketplaceBroadcast.id.desc())
        .limit(int(limit))
        .all()
    )

    return {
        "items": [_broadcast_out(db, x) for x in items],
        "total": len(items),
        "matching_total": matching_total,
        "active_total": matching_total if active_only else None,
        "video_total": video_total,
        "image_total": image_total,
        "clan_id": selected_clan_id,
        "spotlight_capacity_pilot_override_active": _spotlight_capacity_pilot_override_active(),
    }


@router.post("/broadcasts")
def create_marketplace_broadcast(
    payload: MarketplaceBroadcastCreateIn,
    x_clan_id: Optional[str] = Header(default=None, alias="X-Clan-Id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    priority_mode = _resolve_priority_mode(payload.priority_mode)
    visibility_scope = _safe_str(payload.visibility_scope, "direct_communities").lower()

    shop = None
    if payload.shop_id:
        shop = (
            db.query(MarketplaceShop)
            .filter(MarketplaceShop.id == int(payload.shop_id))
            .first()
        )
        if not shop:
            raise HTTPException(status_code=404, detail="Shop not found")

        if not _shop_owner_can_manage(current_user=current_user, shop=shop):
            raise HTTPException(
                status_code=403,
                detail="Only the shop owner can create a spotlight for this shop",
            )

        shop_clan_id = int(getattr(shop, "clan_id", 0) or 0)
        if shop_clan_id <= 0:
            raise HTTPException(
                status_code=400,
                detail="Shop is not attached to a community.",
            )
        resolved_clan_id = shop_clan_id
    else:
        requested_clan_id = _resolve_clan_id(
            current_user=current_user,
            db=db,
            explicit_clan_id=payload.clan_id,
            header_clan_id=x_clan_id,
        )
        resolved_clan_id = int(requested_clan_id)

    _require_active_membership(
        db=db,
        user_id=int(current_user.id),
        clan_id=resolved_clan_id,
    )

    expires_at = payload.expires_at
    if expires_at is None:
        expires_at = _now_utc().replace(microsecond=0)
        expires_at = expires_at.replace(hour=23, minute=59, second=59)
    else:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at = expires_at.astimezone(timezone.utc)

    if expires_at <= _now_utc():
        raise HTTPException(status_code=400, detail="expires_at must be in the future")

    target_clan_ids = (
        [int(resolved_clan_id)]
        if shop is not None
        else _get_active_clan_ids_for_user(
            db=db,
            user_id=int(current_user.id),
        )
    )
    if not target_clan_ids:
        raise HTTPException(status_code=400, detail="No active clan memberships found")

    current_time = _now_utc()

    if priority_mode == SPOTLIGHT_PAID:
        if not shop:
            raise HTTPException(
                status_code=400,
                detail="Paid spotlight requires a shop_id.",
            )

        if not has_active_feature(
            db,
            owner_user_id=int(current_user.id),
            feature_code=FEATURE_SPOTLIGHT_PRIORITY,
            shop_id=int(shop.id),
        ):
            raise HTTPException(
                status_code=403,
                detail="No active paid spotlight entitlement found for this shop.",
            )

        active_paid_count = _count_active_paid_spotlights_for_shop(
            db=db,
            shop_id=int(shop.id),
            now=current_time,
        )
        if active_paid_count > 0:
            raise HTTPException(
                status_code=400,
                detail="A paid spotlight is already active for this shop. Wait for it to end before starting another one.",
            )
    elif not _spotlight_capacity_pilot_override_active(current_time):
        for clan_id in target_clan_ids:
            active_count = _count_active_spotlights_for_clan(
                db=db,
                clan_id=int(clan_id),
                now=current_time,
            )
            max_allowed = _max_spotlights_for_clan(
                db=db,
                clan_id=int(clan_id),
            )
            if active_count >= max_allowed:
                raise HTTPException(
                    status_code=400,
                    detail=f"Spotlight capacity reached for clan {clan_id}. Wait for an active spotlight to expire.",
                )

    created_at = _now_utc()
    created_items: list[MarketplaceBroadcast] = []

    for clan_id in target_clan_ids:
        item = MarketplaceBroadcast(
            clan_id=int(clan_id),
            author_user_id=int(current_user.id),
            shop_id=int(shop.id) if shop is not None else None,
            message=_safe_str(payload.message),
            image_url=_safe_str(payload.image_url) or None,
            video_url=_safe_str(payload.video_url) or None,
            priority_mode=priority_mode,
            visibility_scope=visibility_scope,
            expires_at=expires_at,
            created_at=created_at,
        )
        db.add(item)
        created_items.append(item)

    if priority_mode == SPOTLIGHT_PAID:
        db.flush()
        primary_for_usage = next(
            (x for x in created_items if int(x.clan_id) == int(resolved_clan_id)),
            created_items[0],
        )
        usage = consume_feature_units(
            db,
            owner_user_id=int(current_user.id),
            feature_code=FEATURE_SPOTLIGHT_PRIORITY,
            units=1,
            shop_id=int(shop.id),
            reference_key=f"marketplace.broadcast:{int(primary_for_usage.id)}",
            note="Subscription Spotlight publish",
            commit=False,
        )
        if not bool(usage.get("ok")):
            db.rollback()
            raise HTTPException(
                status_code=403,
                detail="No unused paid spotlight credit is available for this shop.",
            )

    db.commit()

    for item in created_items:
        db.refresh(item)

    canonical_shop = shop
    if canonical_shop is None:
        canonical_shop = _get_canonical_shop_by_owner(
            db,
            owner_user_id=int(current_user.id),
        )

    for item in created_items:
        log_trust_event(
            db,
            event_type="marketplace.broadcast.created",
            clan_id=int(item.clan_id),
            actor_user_id=int(current_user.id),
            subject_user_id=int(current_user.id),
            loan_id=None,
            guarantor_id=None,
            meta={
                "broadcast_id": int(item.id),
                "shop_id": int(canonical_shop.id) if canonical_shop else None,
                "message_preview": _safe_str(item.message)[:120],
                "image_url": item.image_url,
                "video_url": getattr(item, "video_url", None),
                "priority_mode": priority_mode,
                "visibility_scope": visibility_scope,
                "expires_at": item.expires_at.isoformat() if item.expires_at else None,
                "propagated_to_all_active_clans": True,
                "propagated_clan_count": len(target_clan_ids),
                "reason": "marketplace_broadcast_created",
            },
            commit=False,
            refresh=False,
        )
    db.commit()

    primary_item = next(
        (x for x in created_items if int(x.clan_id) == int(resolved_clan_id)),
        created_items[0],
    )

    return {
        "ok": True,
        "item": _broadcast_out(db, primary_item),
        "items": [_broadcast_out(db, x) for x in created_items],
        "propagated_clan_ids": target_clan_ids,
        "propagated_count": len(created_items),
        "spotlight_capacity_pilot_override_active": _spotlight_capacity_pilot_override_active(),
    }


@router.delete("/broadcasts/{broadcast_id}")
def delete_marketplace_broadcast(
    broadcast_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    item = (
        db.query(MarketplaceBroadcast)
        .filter(MarketplaceBroadcast.id == int(broadcast_id))
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Spotlight post not found")

    if int(item.author_user_id) != int(current_user.id) and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="You can only delete your own spotlight post")

    sibling_rows = (
        db.query(MarketplaceBroadcast)
        .filter(
            MarketplaceBroadcast.author_user_id == int(item.author_user_id),
            MarketplaceBroadcast.created_at == item.created_at,
            MarketplaceBroadcast.message == item.message,
            MarketplaceBroadcast.image_url == item.image_url,
            MarketplaceBroadcast.video_url == getattr(item, "video_url", None),
            MarketplaceBroadcast.expires_at == item.expires_at,
            MarketplaceBroadcast.priority_mode == item.priority_mode,
        )
        .all()
    )

    deleted_snapshots = [_broadcast_out(db, row) for row in sibling_rows]

    for row in sibling_rows:
        db.delete(row)
    db.commit()

    for deleted_snapshot in deleted_snapshots:
        log_trust_event(
            db,
            event_type="marketplace.broadcast.deleted",
            clan_id=int(deleted_snapshot["clan_id"]),
            actor_user_id=int(current_user.id),
            subject_user_id=int(current_user.id),
            loan_id=None,
            guarantor_id=None,
            meta={
                "broadcast_id": int(deleted_snapshot["id"]),
                "shop_id": deleted_snapshot.get("shop_id"),
                "priority_mode": deleted_snapshot.get("priority_mode"),
                "visibility_scope": deleted_snapshot.get("visibility_scope"),
                "message_preview": _safe_str(deleted_snapshot.get("message"))[:120],
                "image_url": deleted_snapshot.get("image_url"),
                "video_url": deleted_snapshot.get("video_url"),
                "propagated_delete": True,
                "reason": "marketplace_broadcast_deleted",
            },
            commit=False,
            refresh=False,
        )
    db.commit()

    return {
        "ok": True,
        "deleted": deleted_snapshots[0] if deleted_snapshots else None,
        "deleted_items": deleted_snapshots,
        "deleted_count": len(deleted_snapshots),
    }
