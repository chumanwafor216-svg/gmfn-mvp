from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from jose import JWTError
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import oauth2_scheme
from app.core.security import decode_token
from app.db.database import get_db
from app.db.models import (
    ClanMembership,
    MarketplaceAttentionEvent,
    MarketplaceBroadcast,
    MarketplaceProduct,
    MarketplaceShop,
    User,
)

router = APIRouter(prefix="/marketplace/analytics", tags=["marketplace-analytics"])

EVENT_SHOP_VISIT = "shop_visit"
EVENT_PRODUCT_OPEN = "product_open"
EVENT_SPOTLIGHT_IMPRESSION = "spotlight_impression"
EVENT_SPOTLIGHT_SHOP_CLICK = "spotlight_shop_click"
EVENT_CONTACT_TAP = "contact_tap"

ATTENTION_EVENT_TYPES = {
    EVENT_SHOP_VISIT,
    EVENT_PRODUCT_OPEN,
    EVENT_SPOTLIGHT_IMPRESSION,
    EVENT_SPOTLIGHT_SHOP_CLICK,
    EVENT_CONTACT_TAP,
}

DAILY_DEDUPE_EVENT_TYPES = {EVENT_SHOP_VISIT, EVENT_PRODUCT_OPEN}
SHORT_BUCKET_DEDUPE_EVENT_TYPES = {
    EVENT_SPOTLIGHT_IMPRESSION,
    EVENT_SPOTLIGHT_SHOP_CLICK,
    EVENT_CONTACT_TAP,
}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_str(value: Any, fallback: str = "", *, max_length: int = 240) -> str:
    text = str(value if value is not None else fallback).strip()
    if len(text) > max_length:
        return text[:max_length]
    return text


def _safe_positive_int(value: Any) -> Optional[int]:
    try:
        parsed = int(value)
    except Exception:
        return None
    return parsed if parsed > 0 else None


def _hash_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _period_start(days: int, now: Optional[datetime] = None) -> datetime:
    current = now or _now_utc()
    return current - timedelta(days=max(1, int(days)))


def _day_bucket(now: datetime) -> str:
    return now.astimezone(timezone.utc).strftime("%Y-%m-%d")


def _five_minute_bucket(now: datetime) -> str:
    current = now.astimezone(timezone.utc)
    minute = (current.minute // 5) * 5
    return current.replace(minute=minute, second=0, microsecond=0).isoformat()


def _dedupe_bucket(event_type: str, now: datetime) -> str:
    if event_type in DAILY_DEDUPE_EVENT_TYPES:
        return _day_bucket(now)
    if event_type in SHORT_BUCKET_DEDUPE_EVENT_TYPES:
        return _five_minute_bucket(now)
    return now.isoformat()


def _viewer_hash(
    *,
    request: Request,
    session_key: Optional[str],
    user_agent: str,
    now: datetime,
) -> str:
    remote = getattr(getattr(request, "client", None), "host", "") or "unknown"
    stable_key = _safe_str(session_key, max_length=160) or remote
    return _hash_text(f"marketplace-attention:{stable_key}:{user_agent}:{_day_bucket(now)}")


def _optional_current_user_from_token(db: Session, token: Optional[str]) -> Optional[User]:
    if not token:
        return None
    try:
        payload = decode_token(token)
    except (JWTError, RuntimeError):
        return None
    except Exception:
        return None

    subject = _safe_str(payload.get("sub"), max_length=120)
    if not subject:
        return None

    return (
        db.query(User)
        .filter((User.email == subject) | (User.gmfn_id == subject))
        .first()
    )


def _is_platform_admin(user: User) -> bool:
    return _safe_str(getattr(user, "role", None)).lower() == "admin"


def _require_shop_analytics_owner(shop: MarketplaceShop, user: User) -> None:
    if _is_platform_admin(user):
        return
    if int(getattr(shop, "owner_user_id", 0) or 0) == int(user.id):
        return
    raise HTTPException(status_code=403, detail="Only the shop owner can view this shop attention summary")


def _member_count_for_clan(db: Session, clan_id: int) -> int:
    return (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .count()
    )


class MarketplaceAttentionIn(BaseModel):
    event_type: str = Field(..., min_length=3, max_length=40)
    shop_id: Optional[int] = Field(default=None, ge=1)
    product_id: Optional[int] = Field(default=None, ge=1)
    broadcast_id: Optional[int] = Field(default=None, ge=1)
    clan_id: Optional[int] = Field(default=None, ge=1)
    source: str = Field(default="public_shop", max_length=40)
    source_path: Optional[str] = Field(default=None, max_length=240)
    session_key: Optional[str] = Field(default=None, max_length=160)
    client_event_id: Optional[str] = Field(default=None, max_length=120)

    @field_validator("event_type", "source", "source_path", "session_key", "client_event_id", mode="before")
    @classmethod
    def _reject_non_text(cls, value: Any) -> Any:
        if value is None:
            return value
        if not isinstance(value, str):
            raise ValueError("Value must be text.")
        return value


class MarketplaceAttentionOut(BaseModel):
    ok: bool
    recorded: bool
    event_id: Optional[int] = None
    event_type: str
    shop_id: int
    deduped: bool = False
    boundary_note: str


def _event_count(db: Session, *, shop_id: int, event_type: str, since: datetime) -> int:
    return (
        db.query(MarketplaceAttentionEvent)
        .filter(
            MarketplaceAttentionEvent.shop_id == int(shop_id),
            MarketplaceAttentionEvent.event_type == event_type,
            MarketplaceAttentionEvent.created_at >= since,
        )
        .count()
    )


def _unique_viewer_count(db: Session, *, shop_id: int, event_type: str, since: datetime) -> int:
    rows = (
        db.query(
            MarketplaceAttentionEvent.viewer_user_id,
            MarketplaceAttentionEvent.anonymous_key_hash,
        )
        .filter(
            MarketplaceAttentionEvent.shop_id == int(shop_id),
            MarketplaceAttentionEvent.event_type == event_type,
            MarketplaceAttentionEvent.created_at >= since,
        )
        .all()
    )
    seen: set[str] = set()
    for viewer_user_id, anonymous_key_hash in rows:
        if viewer_user_id is not None:
            seen.add(f"user:{int(viewer_user_id)}")
        elif anonymous_key_hash:
            seen.add(f"anon:{anonymous_key_hash}")
    return len(seen)


def _period_summary(db: Session, *, shop_id: int, since: datetime) -> dict[str, Any]:
    return {
        "shop_visits": _event_count(db, shop_id=shop_id, event_type=EVENT_SHOP_VISIT, since=since),
        "unique_shop_visitors": _unique_viewer_count(db, shop_id=shop_id, event_type=EVENT_SHOP_VISIT, since=since),
        "product_opens": _event_count(db, shop_id=shop_id, event_type=EVENT_PRODUCT_OPEN, since=since),
        "spotlight_impressions": _event_count(db, shop_id=shop_id, event_type=EVENT_SPOTLIGHT_IMPRESSION, since=since),
        "unique_spotlight_viewers": _unique_viewer_count(db, shop_id=shop_id, event_type=EVENT_SPOTLIGHT_IMPRESSION, since=since),
        "spotlight_shop_clicks": _event_count(db, shop_id=shop_id, event_type=EVENT_SPOTLIGHT_SHOP_CLICK, since=since),
        "contact_taps": _event_count(db, shop_id=shop_id, event_type=EVENT_CONTACT_TAP, since=since),
    }


def _active_spotlight_reach(db: Session, *, shop_id: int, now: datetime) -> dict[str, Any]:
    rows = (
        db.query(MarketplaceBroadcast)
        .filter(
            MarketplaceBroadcast.shop_id == int(shop_id),
            (MarketplaceBroadcast.expires_at.is_(None)) | (MarketplaceBroadcast.expires_at > now),
        )
        .all()
    )
    clan_ids: list[int] = []
    for row in rows:
        clan_id = _safe_positive_int(getattr(row, "clan_id", None))
        if clan_id is not None:
            clan_ids.append(clan_id)

    possible_reach = sum(_member_count_for_clan(db, clan_id=clan_id) for clan_id in clan_ids)
    return {
        "active_spotlights": len(rows),
        "target_community_count": len(set(clan_ids)),
        "possible_member_reach": possible_reach,
        "reach_label": "Possible member reach, not confirmed views",
    }


@router.post("/attention", response_model=MarketplaceAttentionOut)
def record_marketplace_attention(
    payload: MarketplaceAttentionIn,
    request: Request,
    user_agent: Optional[str] = Header(default=None, alias="User-Agent"),
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> dict[str, Any]:
    event_type = _safe_str(payload.event_type).lower()
    if event_type not in ATTENTION_EVENT_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported marketplace attention event")

    current_user = _optional_current_user_from_token(db, token)
    now = _now_utc()
    source = _safe_str(payload.source, "public_shop", max_length=40) or "public_shop"
    source_path = _safe_str(payload.source_path, max_length=240) or None
    user_agent_text = _safe_str(user_agent, max_length=500)

    shop_id = _safe_positive_int(payload.shop_id)
    product_id = _safe_positive_int(payload.product_id)
    broadcast_id = _safe_positive_int(payload.broadcast_id)
    clan_id = _safe_positive_int(payload.clan_id)

    broadcast = None
    if broadcast_id is not None:
        broadcast = db.query(MarketplaceBroadcast).filter(MarketplaceBroadcast.id == broadcast_id).first()
        if not broadcast:
            raise HTTPException(status_code=404, detail="Spotlight record not found")
        shop_id = shop_id or _safe_positive_int(getattr(broadcast, "shop_id", None))
        clan_id = clan_id or _safe_positive_int(getattr(broadcast, "clan_id", None))

    product = None
    if product_id is not None:
        product = db.query(MarketplaceProduct).filter(MarketplaceProduct.id == product_id).first()
        if not product or not bool(getattr(product, "is_active", True)):
            raise HTTPException(status_code=404, detail="Product record not found")
        product_shop_id = _safe_positive_int(getattr(product, "shop_id", None))
        if shop_id is not None and product_shop_id != shop_id:
            raise HTTPException(status_code=400, detail="Product does not belong to this shop")
        shop_id = shop_id or product_shop_id
        clan_id = clan_id or _safe_positive_int(getattr(product, "clan_id", None))

    if shop_id is None:
        raise HTTPException(status_code=400, detail="Attention event must belong to a shop")

    shop = db.query(MarketplaceShop).filter(MarketplaceShop.id == shop_id).first()
    if not shop or not bool(getattr(shop, "is_active", True)):
        raise HTTPException(status_code=404, detail="Shop not found")

    if broadcast is not None:
        broadcast_shop_id = _safe_positive_int(getattr(broadcast, "shop_id", None))
        if broadcast_shop_id is not None and broadcast_shop_id != int(shop.id):
            raise HTTPException(status_code=400, detail="Spotlight does not belong to this shop")

    clan_id = clan_id or _safe_positive_int(getattr(shop, "clan_id", None))
    anonymous_key_hash = _viewer_hash(
        request=request,
        session_key=payload.session_key,
        user_agent=user_agent_text,
        now=now,
    )
    viewer_user_id = int(current_user.id) if current_user is not None else None
    viewer_key = f"user:{viewer_user_id}" if viewer_user_id is not None else f"anon:{anonymous_key_hash}"
    bucket = _dedupe_bucket(event_type, now)
    client_event_id = _safe_str(payload.client_event_id, max_length=120)
    dedupe_basis = client_event_id or ":".join(
        [
            event_type,
            str(shop_id or 0),
            str(product_id or 0),
            str(broadcast_id or 0),
            viewer_key,
            source,
            bucket,
        ]
    )
    dedupe_key = _hash_text(f"marketplace-attention:{dedupe_basis}")[:64]

    existing = (
        db.query(MarketplaceAttentionEvent)
        .filter(MarketplaceAttentionEvent.dedupe_key == dedupe_key)
        .first()
    )
    if existing:
        return {
            "ok": True,
            "recorded": False,
            "event_id": int(existing.id),
            "event_type": event_type,
            "shop_id": int(shop.id),
            "deduped": True,
            "boundary_note": "Attention is not a buyer, payment, verification, or trust score.",
        }

    event = MarketplaceAttentionEvent(
        event_type=event_type,
        shop_id=int(shop.id),
        product_id=product_id,
        broadcast_id=broadcast_id,
        clan_id=clan_id,
        shop_owner_user_id=_safe_positive_int(getattr(shop, "owner_user_id", None)),
        viewer_user_id=viewer_user_id,
        anonymous_key_hash=anonymous_key_hash,
        user_agent_hash=_hash_text(user_agent_text)[:64] if user_agent_text else None,
        source=source,
        source_path=source_path,
        dedupe_key=dedupe_key,
        created_at=now,
    )
    db.add(event)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = (
            db.query(MarketplaceAttentionEvent)
            .filter(MarketplaceAttentionEvent.dedupe_key == dedupe_key)
            .first()
        )
        return {
            "ok": True,
            "recorded": False,
            "event_id": int(existing.id) if existing else None,
            "event_type": event_type,
            "shop_id": int(shop.id),
            "deduped": True,
            "boundary_note": "Attention is not a buyer, payment, verification, or trust score.",
        }

    db.refresh(event)
    return {
        "ok": True,
        "recorded": True,
        "event_id": int(event.id),
        "event_type": event_type,
        "shop_id": int(shop.id),
        "deduped": False,
        "boundary_note": "Attention is not a buyer, payment, verification, or trust score.",
    }


@router.get("/shops/{shop_id}/summary")
def get_marketplace_shop_attention_summary(
    shop_id: int,
    days: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> dict[str, Any]:
    current_user = _optional_current_user_from_token(db, token)
    if current_user is None:
        raise HTTPException(status_code=401, detail="Not authenticated")

    shop = db.query(MarketplaceShop).filter(MarketplaceShop.id == int(shop_id)).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    _require_shop_analytics_owner(shop, current_user)

    now = _now_utc()
    today_start = now.astimezone(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    last_7_days = _period_start(7, now)
    requested_start = _period_start(days, now)

    product_rows = (
        db.query(
            MarketplaceAttentionEvent.product_id,
            func.count(MarketplaceAttentionEvent.id).label("opens"),
        )
        .filter(
            MarketplaceAttentionEvent.shop_id == int(shop.id),
            MarketplaceAttentionEvent.event_type == EVENT_PRODUCT_OPEN,
            MarketplaceAttentionEvent.created_at >= requested_start,
            MarketplaceAttentionEvent.product_id.isnot(None),
        )
        .group_by(MarketplaceAttentionEvent.product_id)
        .order_by(func.count(MarketplaceAttentionEvent.id).desc())
        .limit(8)
        .all()
    )
    product_ids = [int(row.product_id) for row in product_rows if row.product_id is not None]
    product_map = {
        int(row.id): _safe_str(getattr(row, "name", None), "Shop item", max_length=160) or "Shop item"
        for row in db.query(MarketplaceProduct).filter(MarketplaceProduct.id.in_(product_ids)).all()
    } if product_ids else {}

    top_products = [
        {
            "product_id": int(row.product_id),
            "name": product_map.get(int(row.product_id), "Shop item"),
            "opens": int(row.opens or 0),
        }
        for row in product_rows
        if row.product_id is not None
    ]

    return {
        "ok": True,
        "shop_id": int(shop.id),
        "shop_owner_user_id": _safe_positive_int(getattr(shop, "owner_user_id", None)),
        "days": int(days),
        "periods": {
            "today": _period_summary(db, shop_id=int(shop.id), since=today_start),
            "last_7_days": _period_summary(db, shop_id=int(shop.id), since=last_7_days),
            "requested": _period_summary(db, shop_id=int(shop.id), since=requested_start),
        },
        "spotlight": _active_spotlight_reach(db, shop_id=int(shop.id), now=now),
        "top_products": top_products,
        "boundary_note": "Visitors, views, and taps help a seller improve the shop. They are not buyers, sales, verification, payment evidence, or trust score.",
    }