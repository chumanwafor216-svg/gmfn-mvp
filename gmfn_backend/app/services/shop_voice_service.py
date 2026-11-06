from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import (
    MarketplaceProduct,
    MarketplaceShop,
    ShopDiaryEntry,
    ShopVoiceAttachment,
    User,
)


SHOP_VOICE_WELCOME = "shop_welcome"
SHOP_VOICE_UPDATE = "shop_update"
SHOP_VOICE_PRODUCT = "product"
SHOP_VOICE_PARENT_KINDS = {
    SHOP_VOICE_WELCOME,
    SHOP_VOICE_UPDATE,
    SHOP_VOICE_PRODUCT,
}
PUBLIC_SHOP_UPDATE_HOURS = 24


def _safe_text(value: object) -> str:
    return str(value or "").strip()


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def get_shop_voice_attachment(
    db: Session,
    *,
    parent_kind: str,
    parent_id: int,
    include_deleted: bool = False,
) -> ShopVoiceAttachment | None:
    query = db.query(ShopVoiceAttachment).filter(
        ShopVoiceAttachment.parent_kind == str(parent_kind),
        ShopVoiceAttachment.parent_id == int(parent_id),
    )
    if not include_deleted:
        query = query.filter(ShopVoiceAttachment.deleted_at.is_(None))
    return query.first()


def shop_voice_payload(
    db: Session,
    *,
    parent_kind: str,
    parent_id: int,
) -> dict[str, Any]:
    attachment = get_shop_voice_attachment(
        db,
        parent_kind=parent_kind,
        parent_id=parent_id,
        include_deleted=True,
    )
    if attachment is None:
        return {
            "voice_attachment_id": None,
            "voice_duration_seconds": None,
            "voice_deleted_at": None,
            "voice_speaker_name": None,
            "voice_speaker_gmfn_id": None,
        }
    speaker = db.get(User, int(attachment.created_by_user_id))
    active = attachment.deleted_at is None
    return {
        "voice_attachment_id": int(attachment.id) if active else None,
        "voice_duration_seconds": (
            float(attachment.duration_seconds) if active else None
        ),
        "voice_deleted_at": attachment.deleted_at,
        "voice_speaker_name": (
            _safe_text(getattr(speaker, "display_name", None))
            or _safe_text(getattr(speaker, "gmfn_id", None))
            or "GSN member"
        ),
        "voice_speaker_gmfn_id": (
            _safe_text(getattr(speaker, "gmfn_id", None)) or None
        ),
    }


def resolve_shop_voice_parent(
    db: Session,
    *,
    parent_kind: str,
    parent_id: int,
) -> tuple[MarketplaceShop, object]:
    if parent_kind == SHOP_VOICE_WELCOME:
        shop = db.get(MarketplaceShop, int(parent_id))
        if shop is None:
            raise HTTPException(status_code=404, detail="Shop not found")
        return shop, shop
    if parent_kind == SHOP_VOICE_PRODUCT:
        product = db.get(MarketplaceProduct, int(parent_id))
        if product is None:
            raise HTTPException(status_code=404, detail="Shop item not found")
        shop = db.get(MarketplaceShop, int(product.shop_id))
        if shop is None:
            raise HTTPException(status_code=404, detail="Shop not found")
        return shop, product
    if parent_kind == SHOP_VOICE_UPDATE:
        entry = db.get(ShopDiaryEntry, int(parent_id))
        if entry is None:
            raise HTTPException(status_code=404, detail="Shop update not found")
        shop = db.get(MarketplaceShop, int(entry.shop_id))
        if shop is None:
            raise HTTPException(status_code=404, detail="Shop not found")
        return shop, entry
    raise HTTPException(status_code=404, detail="Voice note not found")


def require_exact_shop_owner(shop: MarketplaceShop, current_user: User) -> None:
    if int(shop.owner_user_id) != int(current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Only the shop owner can manage this voice note",
        )


def shop_voice_is_public(
    db: Session,
    attachment: ShopVoiceAttachment,
) -> bool:
    if attachment.deleted_at is not None:
        return False
    try:
        shop, parent = resolve_shop_voice_parent(
            db,
            parent_kind=attachment.parent_kind,
            parent_id=int(attachment.parent_id),
        )
    except HTTPException:
        return False
    if not bool(getattr(shop, "is_active", True)):
        return False
    if attachment.parent_kind == SHOP_VOICE_WELCOME:
        return True
    if attachment.parent_kind == SHOP_VOICE_PRODUCT:
        return bool(getattr(parent, "is_active", True)) and _safe_text(
            getattr(parent, "visibility_mode", None)
        ) in {"community_visible", "public", "community"}
    if attachment.parent_kind == SHOP_VOICE_UPDATE:
        occurred_at = getattr(parent, "occurred_at", None)
        if occurred_at is None:
            return False
        if occurred_at.tzinfo is None:
            occurred_at = occurred_at.replace(tzinfo=timezone.utc)
        return (
            bool(getattr(parent, "is_active", True))
            and bool(getattr(parent, "is_public", False))
            and _safe_text(getattr(parent, "evidence_class", None)) != "gsn_insight"
            and occurred_at >= _now_utc() - timedelta(hours=PUBLIC_SHOP_UPDATE_HOURS)
        )
    return False
