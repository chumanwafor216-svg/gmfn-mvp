from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import parse_qs, urlparse

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from jose import JWTError
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import oauth2_scheme
from app.core.security import decode_token
from app.db.database import get_db
from app.db.notification_models import Notification
from app.db.models import (
    ClanMembership,
    MarketplaceAttentionEvent,
    MarketplaceBroadcast,
    MarketplaceProduct,
    MarketplaceShop,
    ProtectedTradeRecord,
    ShopFollower,
    User,
)

router = APIRouter(prefix="/marketplace/analytics", tags=["marketplace-analytics"])

EVENT_SHOP_VISIT = "shop_visit"
EVENT_PRODUCT_OPEN = "product_open"
EVENT_SPOTLIGHT_IMPRESSION = "spotlight_impression"
EVENT_SPOTLIGHT_SHOP_CLICK = "spotlight_shop_click"
EVENT_CONTACT_TAP = "contact_tap"
EVENT_SHARE_ACTION = "share_action"
EVENT_RECOMMENDATION_ACTIONED = "recommendation_actioned"

ATTENTION_EVENT_TYPES = {
    EVENT_SHOP_VISIT,
    EVENT_PRODUCT_OPEN,
    EVENT_SPOTLIGHT_IMPRESSION,
    EVENT_SPOTLIGHT_SHOP_CLICK,
    EVENT_CONTACT_TAP,
    EVENT_SHARE_ACTION,
    EVENT_RECOMMENDATION_ACTIONED,
}

DAILY_DEDUPE_EVENT_TYPES = {EVENT_SHOP_VISIT, EVENT_PRODUCT_OPEN}
SHORT_BUCKET_DEDUPE_EVENT_TYPES = {
    EVENT_SPOTLIGHT_IMPRESSION,
    EVENT_SPOTLIGHT_SHOP_CLICK,
    EVENT_CONTACT_TAP,
    EVENT_SHARE_ACTION,
    EVENT_RECOMMENDATION_ACTIONED,
}
SHOP_FOLLOWER_NOTICE_KINDS = {
    "marketplace.shop.broadcast_created",
    "marketplace.shop.product_created",
    "marketplace.shop.product_updated",
    "marketplace.shop.spotlight_created",
}

SHOP_FOLLOWER_NOTICE_LABELS = {
    "marketplace.shop.broadcast_created": "Shop updates",
    "marketplace.shop.product_created": "Product posts",
    "marketplace.shop.product_updated": "Product updates",
    "marketplace.shop.spotlight_created": "Spotlights",
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


def _shop_follower_count(db: Session, *, shop_id: int) -> int:
    return (
        db.query(ShopFollower)
        .filter(ShopFollower.shop_id == int(shop_id))
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


def _attention_source_label(source: str) -> str:
    normalized = _safe_str(source, "unknown", max_length=80).lower()
    labels = {
        "public_shop_gallery": "Shop gallery",
        "public_shop_product": "Product card",
        "public_shop_product_contact": "Product contact",
        "public_shop_phone_contact": "Phone contact",
        "public_shop_whatsapp_contact": "WhatsApp contact",
        "public_shop_spotlight": "Spotlight feed",
        "public_shop_spotlight_contact": "Spotlight contact",
        "shop-diaries": "Shop diaries",
        "product": "Product action",
        "public_shop": "Public shop",
    }
    return labels.get(normalized, normalized.replace("_", " ").replace("-", " ").title())


def _share_source_label(value: str) -> str:
    normalized = _safe_str(value, "direct", max_length=80).lower()
    labels = {
        "copy_shop_link": "Copied shop link",
        "share_shop": "Shared shop",
        "share_product": "Shared product",
        "product_owner_share": "Shared product",
        "x": "X",
        "linkedin": "LinkedIn",
        "facebook": "Facebook",
        "instagram": "Instagram",
        "tiktok": "TikTok",
        "copy": "Copied message",
        "direct": "Direct or unknown",
    }
    return labels.get(normalized, normalized.replace("_", " ").replace("-", " ").title())


def _share_source_from_path(source_path: Optional[str]) -> str:
    raw = _safe_str(source_path, max_length=240)
    if not raw:
        return "direct"
    try:
        parsed = urlparse(raw)
        params = parse_qs(parsed.query)
    except Exception:
        return "direct"
    for key in ("gsn_share", "gsn_channel", "utm_source"):
        value = _safe_str((params.get(key) or [""])[0], max_length=80)
        if value:
            return value
    return "direct"


def _query_value_from_path(source_path: Optional[str], *keys: str, max_length: int = 80) -> str:
    raw = _safe_str(source_path, max_length=240)
    if not raw:
        return ""
    try:
        parsed = urlparse(raw)
        params = parse_qs(parsed.query)
    except Exception:
        return ""
    for key in keys:
        value = _safe_str((params.get(key) or [""])[0], max_length=max_length)
        if value:
            return value
    return ""


def _recommendation_action_label(value: str) -> str:
    normalized = _safe_str(value, "market_intelligence_action", max_length=80).lower()
    labels = {
        "open_demand_box": "Opened Demand Box",
        "mark_tried": "Marked advice tried",
        "improve_products": "Improve products",
        "improve_thumbnail": "Improve thumbnail or call-to-action",
        "increase_distribution": "Increase distribution",
        "review_spotlight": "Review spotlight",
    }
    return labels.get(normalized, normalized.replace("_", " ").replace("-", " ").title())

def _share_action_summary(db: Session, *, shop_id: int, since: datetime) -> dict[str, Any]:
    rows = (
        db.query(MarketplaceAttentionEvent.source_path)
        .filter(
            MarketplaceAttentionEvent.shop_id == int(shop_id),
            MarketplaceAttentionEvent.event_type == EVENT_SHARE_ACTION,
            MarketplaceAttentionEvent.created_at >= since,
        )
        .all()
    )
    by_source: dict[str, int] = {}
    for (source_path,) in rows:
        source_key = _share_source_from_path(source_path)
        by_source[source_key] = by_source.get(source_key, 0) + 1

    by_channel = [
        {
            "source": source,
            "label": _share_source_label(source),
            "count": count,
        }
        for source, count in sorted(by_source.items(), key=lambda item: (-item[1], _share_source_label(item[0])))
    ]
    return {
        "last_7_days": len(rows),
        "by_channel": by_channel[:8],
        "boundary_label": "Share actions are owner/user share attempts, not proof that a recipient opened the link.",
        "count_method": "Existing marketplace attention events with event_type=share_action and source_path campaign parameters.",
    }


def _recommendation_action_summary(db: Session, *, shop_id: int, since: datetime) -> dict[str, Any]:
    rows = (
        db.query(MarketplaceAttentionEvent.source_path)
        .filter(
            MarketplaceAttentionEvent.shop_id == int(shop_id),
            MarketplaceAttentionEvent.event_type == EVENT_RECOMMENDATION_ACTIONED,
            MarketplaceAttentionEvent.created_at >= since,
        )
        .all()
    )
    by_action: dict[str, dict[str, Any]] = {}
    for (source_path,) in rows:
        action_key = (
            _query_value_from_path(source_path, "gsn_action", "action")
            or "mark_tried"
        )
        diagnosis = _query_value_from_path(source_path, "gsn_diagnosis", "diagnosis")
        item = by_action.setdefault(
            action_key,
            {
                "action": action_key,
                "label": _recommendation_action_label(action_key),
                "count": 0,
                "diagnosis": diagnosis,
            },
        )
        item["count"] += 1
        if diagnosis and not item.get("diagnosis"):
            item["diagnosis"] = diagnosis

    action_rows = sorted(
        by_action.values(),
        key=lambda row: (-int(row.get("count") or 0), str(row.get("label") or "")),
    )
    return {
        "last_7_days": len(rows),
        "by_action": action_rows[:8],
        "boundary_label": "Recommendation actions mean the shop owner tapped or marked advice as tried; they do not prove the advice produced sales.",
        "count_method": "Existing marketplace attention events with event_type=recommendation_actioned and Market Intelligence action parameters.",
    }

def _share_response_summary(db: Session, *, shop_id: int, since: datetime) -> dict[str, Any]:
    rows = (
        db.query(
            MarketplaceAttentionEvent.event_type,
            MarketplaceAttentionEvent.source_path,
            MarketplaceAttentionEvent.viewer_user_id,
            MarketplaceAttentionEvent.anonymous_key_hash,
        )
        .filter(
            MarketplaceAttentionEvent.shop_id == int(shop_id),
            MarketplaceAttentionEvent.event_type.in_([
                EVENT_SHOP_VISIT,
                EVENT_PRODUCT_OPEN,
                EVENT_CONTACT_TAP,
            ]),
            MarketplaceAttentionEvent.created_at >= since,
        )
        .all()
    )
    by_source: dict[str, dict[str, Any]] = {}
    unique_visitors: set[str] = set()
    for event_type, source_path, viewer_user_id, anonymous_key_hash in rows:
        source_key = _share_source_from_path(source_path)
        if source_key == "direct":
            continue
        item = by_source.setdefault(
            source_key,
            {
                "source": source_key,
                "label": _share_source_label(source_key),
                "shop_visits": 0,
                "unique_visitors": set(),
                "product_opens": 0,
                "contact_taps": 0,
                "total_events": 0,
            },
        )
        item["total_events"] += 1
        if event_type == EVENT_SHOP_VISIT:
            item["shop_visits"] += 1
            viewer_key = (
                f"user:{int(viewer_user_id)}"
                if viewer_user_id is not None
                else f"anon:{anonymous_key_hash or ''}"
            )
            if viewer_key != "anon:":
                unique_visitors.add(viewer_key)
                item["unique_visitors"].add(viewer_key)
        elif event_type == EVENT_PRODUCT_OPEN:
            item["product_opens"] += 1
        elif event_type == EVENT_CONTACT_TAP:
            item["contact_taps"] += 1

    by_channel = []
    for item in by_source.values():
        by_channel.append(
            {
                "source": item["source"],
                "label": item["label"],
                "shop_visits": int(item["shop_visits"]),
                "unique_visitors": len(item["unique_visitors"]),
                "product_opens": int(item["product_opens"]),
                "contact_taps": int(item["contact_taps"]),
                "total_events": int(item["total_events"]),
            }
        )
    by_channel.sort(key=lambda item: (-int(item["total_events"]), str(item["label"])))

    return {
        "last_7_days": sum(int(item["total_events"]) for item in by_channel),
        "shop_visits": sum(int(item["shop_visits"]) for item in by_channel),
        "unique_visitors": len(unique_visitors),
        "product_opens": sum(int(item["product_opens"]) for item in by_channel),
        "contact_taps": sum(int(item["contact_taps"]) for item in by_channel),
        "by_channel": by_channel[:8],
        "boundary_label": "Share response counts attributed visits, opens, and taps after a shared link is opened; it is still not buyer, payment, or delivery proof.",
        "count_method": "Existing marketplace attention events whose source_path includes share attribution parameters.",
    }


def _follower_notification_response_summary(db: Session, *, shop_id: int, since: datetime) -> dict[str, Any]:
    rows = (
        db.query(
            MarketplaceAttentionEvent.event_type,
            MarketplaceAttentionEvent.source_path,
            MarketplaceAttentionEvent.viewer_user_id,
            MarketplaceAttentionEvent.anonymous_key_hash,
        )
        .filter(
            MarketplaceAttentionEvent.shop_id == int(shop_id),
            MarketplaceAttentionEvent.event_type.in_([
                EVENT_SHOP_VISIT,
                EVENT_PRODUCT_OPEN,
                EVENT_CONTACT_TAP,
            ]),
            MarketplaceAttentionEvent.created_at >= since,
        )
        .all()
    )

    by_notice: dict[str, dict[str, Any]] = {}
    unique_visitors: set[str] = set()
    totals = {"shop_visits": 0, "product_opens": 0, "contact_taps": 0}
    for event_type, source_path, viewer_user_id, anonymous_key_hash in rows:
        if _query_value_from_path(source_path, "gsn_source") != "shop_follower_notice":
            continue
        notice_kind = _query_value_from_path(source_path, "gsn_notice", max_length=120) or "shop_follower_notice"
        item = by_notice.setdefault(
            notice_kind,
            {
                "kind": notice_kind,
                "label": SHOP_FOLLOWER_NOTICE_LABELS.get(
                    notice_kind,
                    notice_kind.replace("_", " ").replace(".", " ").title(),
                ),
                "shop_visits": 0,
                "unique_visitors": set(),
                "product_opens": 0,
                "contact_taps": 0,
                "total_events": 0,
            },
        )
        item["total_events"] += 1
        if event_type == EVENT_SHOP_VISIT:
            item["shop_visits"] += 1
            totals["shop_visits"] += 1
            viewer_key = (
                f"user:{int(viewer_user_id)}"
                if viewer_user_id is not None
                else f"anon:{anonymous_key_hash or ''}"
            )
            if viewer_key != "anon:":
                unique_visitors.add(viewer_key)
                item["unique_visitors"].add(viewer_key)
        elif event_type == EVENT_PRODUCT_OPEN:
            item["product_opens"] += 1
            totals["product_opens"] += 1
        elif event_type == EVENT_CONTACT_TAP:
            item["contact_taps"] += 1
            totals["contact_taps"] += 1

    by_kind = []
    for item in by_notice.values():
        by_kind.append(
            {
                "kind": item["kind"],
                "label": item["label"],
                "shop_visits": int(item["shop_visits"]),
                "unique_visitors": len(item["unique_visitors"]),
                "product_opens": int(item["product_opens"]),
                "contact_taps": int(item["contact_taps"]),
                "total_events": int(item["total_events"]),
            }
        )
    by_kind.sort(key=lambda item: (-int(item["total_events"]), str(item["label"])))

    return {
        "last_7_days": sum(int(item["total_events"]) for item in by_kind),
        "shop_visits": totals["shop_visits"],
        "unique_visitors": len(unique_visitors),
        "product_opens": totals["product_opens"],
        "contact_taps": totals["contact_taps"],
        "by_kind": by_kind[:8],
        "boundary_label": "Follower notice response counts attributed visits, opens, and taps after a follower-notice link is opened; it is not buyer, payment, delivery, push-display, or sales proof.",
        "count_method": "Existing marketplace attention events whose source_path includes gsn_source=shop_follower_notice and a gsn_notice kind.",
    }


def _protected_trade_outcome_summary(db: Session, *, shop: MarketplaceShop, since: datetime) -> dict[str, Any]:
    shop_id = int(shop.id)
    owner_user_id = _safe_positive_int(getattr(shop, "owner_user_id", None))
    filters = [ProtectedTradeRecord.shop_id == shop_id]
    if owner_user_id is not None:
        filters.append(ProtectedTradeRecord.seller_user_id == owner_user_id)

    rows = (
        db.query(ProtectedTradeRecord)
        .filter(
            or_(*filters),
            ProtectedTradeRecord.created_at >= since,
        )
        .order_by(ProtectedTradeRecord.updated_at.desc(), ProtectedTradeRecord.id.desc())
        .limit(200)
        .all()
    )

    def status(row: ProtectedTradeRecord, field: str, fallback: str = "") -> str:
        return _safe_str(getattr(row, field, None), fallback, max_length=80).lower()

    recent_records = []
    for row in rows[:5]:
        recent_records.append(
            {
                "trade_id": int(row.id),
                "trade_code": _safe_str(getattr(row, "trade_code", None), max_length=80),
                "item_title": _safe_str(getattr(row, "item_title", None), "Protected trade", max_length=160),
                "status": status(row, "status", "draft"),
                "payment_status": status(row, "payment_status", "not_started"),
                "release_status": status(row, "release_status", "not_requested"),
                "receipt_status": status(row, "receipt_status", "not_confirmed"),
                "dispute_status": status(row, "dispute_status", "none"),
                "linked_to_shop": int(getattr(row, "shop_id", 0) or 0) == shop_id,
            }
        )

    return {
        "last_7_days": len(rows),
        "shop_linked_records": sum(1 for row in rows if int(getattr(row, "shop_id", 0) or 0) == shop_id),
        "seller_side_records": sum(1 for row in rows if owner_user_id is not None and int(getattr(row, "seller_user_id", 0) or 0) == owner_user_id),
        "released_records": sum(1 for row in rows if status(row, "status") == "released" or status(row, "release_status") == "released"),
        "payment_claimed_or_recorded": sum(1 for row in rows if status(row, "payment_status") in {"claimed", "recorded_not_bank_confirmed", "under_review"}),
        "receipt_confirmed": sum(1 for row in rows if status(row, "receipt_status") == "received"),
        "dispute_records": sum(1 for row in rows if status(row, "dispute_status") not in {"", "none", "resolved"}),
        "unresolved_records": sum(1 for row in rows if status(row, "status") not in {"released", "received", "closed", "cancelled"}),
        "recent_records": recent_records,
        "boundary_label": "Protected trade outcomes are recorded trade evidence, not automatic sales, payment confirmation, escrow, delivery proof, or buyer satisfaction proof.",
        "count_method": "Existing protected_trade_records linked by shop_id or seller_user_id within the last 7 days.",
    }

def _source_breakdown_summary(
    db: Session,
    *,
    shop_id: int,
    since: datetime,
) -> list[dict[str, Any]]:
    rows = (
        db.query(
            MarketplaceAttentionEvent.source,
            MarketplaceAttentionEvent.event_type,
            func.count(MarketplaceAttentionEvent.id).label("events"),
        )
        .filter(
            MarketplaceAttentionEvent.shop_id == int(shop_id),
            MarketplaceAttentionEvent.event_type.notin_([
                EVENT_SHARE_ACTION,
                EVENT_RECOMMENDATION_ACTIONED,
            ]),
            MarketplaceAttentionEvent.created_at >= since,
        )
        .group_by(MarketplaceAttentionEvent.source, MarketplaceAttentionEvent.event_type)
        .all()
    )
    by_source: dict[str, dict[str, Any]] = {}
    for source, event_type, event_count in rows:
        source_key = _safe_str(source, "unknown", max_length=80) or "unknown"
        item = by_source.setdefault(
            source_key,
            {
                "source": source_key,
                "label": _attention_source_label(source_key),
                "shop_visits": 0,
                "product_opens": 0,
                "spotlight_impressions": 0,
                "spotlight_shop_clicks": 0,
                "contact_taps": 0,
                "total_events": 0,
                "boundary_label": "Source counts show where attention was recorded, not who bought or paid.",
            },
        )
        count = int(event_count or 0)
        item["total_events"] += count
        if event_type == EVENT_SHOP_VISIT:
            item["shop_visits"] += count
        elif event_type == EVENT_PRODUCT_OPEN:
            item["product_opens"] += count
        elif event_type == EVENT_SPOTLIGHT_IMPRESSION:
            item["spotlight_impressions"] += count
        elif event_type == EVENT_SPOTLIGHT_SHOP_CLICK:
            item["spotlight_shop_clicks"] += count
        elif event_type == EVENT_CONTACT_TAP:
            item["contact_taps"] += count

    return sorted(
        by_source.values(),
        key=lambda item: (-int(item["total_events"]), str(item["label"])),
    )[:8]


def _shop_follower_notice_action_prefix(db: Session, *, shop: MarketplaceShop) -> str:
    owner = db.query(User).filter(User.id == int(shop.owner_user_id)).first()
    gmfn_id = _safe_str(getattr(owner, "gmfn_id", None), max_length=120)
    if gmfn_id:
        return f"/shop/{gmfn_id}"
    return "/app/shop"


def _shop_follower_notice_counts(
    db: Session,
    *,
    action_prefix: str,
    since: datetime,
) -> tuple[int, Optional[datetime], list[dict[str, Any]]]:
    rows = (
        db.query(
            Notification.kind,
            func.count(Notification.id).label("notice_count"),
            func.max(Notification.created_at).label("last_sent_at"),
        )
        .filter(
            Notification.kind.in_(sorted(SHOP_FOLLOWER_NOTICE_KINDS)),
            Notification.action_url.like(f"{action_prefix}%"),
            Notification.created_at >= since,
        )
        .group_by(Notification.kind)
        .all()
    )

    total = 0
    last_sent_at: Optional[datetime] = None
    by_kind: list[dict[str, Any]] = []
    for kind, count_value, latest in rows:
        safe_kind = _safe_str(kind, max_length=120)
        count = int(count_value or 0)
        total += count
        if latest is not None and (last_sent_at is None or latest > last_sent_at):
            last_sent_at = latest
        by_kind.append(
            {
                "kind": safe_kind,
                "label": SHOP_FOLLOWER_NOTICE_LABELS.get(safe_kind, safe_kind.replace("_", " ").replace(".", " ").title()),
                "count": count,
                "last_sent_at": latest.isoformat() if latest else None,
            }
        )

    by_kind.sort(key=lambda item: (-int(item["count"]), str(item["label"])))
    return total, last_sent_at, by_kind


def _shop_follower_notice_summary(
    db: Session,
    *,
    shop: MarketplaceShop,
    last_7_days: datetime,
    now: datetime,
) -> dict[str, Any]:
    action_prefix = _shop_follower_notice_action_prefix(db, shop=shop)
    year_start = now.astimezone(timezone.utc).replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    last_7_count, last_sent_at, by_kind = _shop_follower_notice_counts(
        db,
        action_prefix=action_prefix,
        since=last_7_days,
    )
    year_to_date_count, year_last_sent_at, _year_by_kind = _shop_follower_notice_counts(
        db,
        action_prefix=action_prefix,
        since=year_start,
    )
    last_seen = last_sent_at or year_last_sent_at
    return {
        "last_7_days": last_7_count,
        "year_to_date": year_to_date_count,
        "last_sent_at": last_seen.isoformat() if last_seen else None,
        "by_kind": by_kind,
        "delivery_label": "Action Inbox notices created for eligible followers; phone push is best-effort.",
        "boundary_label": "Follower notices are distribution records, not views, purchases, or push-delivery proof.",
        "count_method": "Existing notification rows filtered by shop follower notice kind and public shop action route.",
    }
def _daily_activity_summary(
    db: Session,
    *,
    shop_id: int,
    days: int,
    now: datetime,
) -> list[dict[str, Any]]:
    safe_days = max(1, min(int(days), 30))
    today_start = now.astimezone(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    start = today_start - timedelta(days=safe_days - 1)
    labels = [(start + timedelta(days=offset)).strftime("%Y-%m-%d") for offset in range(safe_days)]
    rows_by_day: dict[str, dict[str, Any]] = {
        label: {
            "date": label,
            "shop_visits": 0,
            "unique_shop_visitors": 0,
            "product_opens": 0,
            "spotlight_impressions": 0,
            "unique_spotlight_viewers": 0,
            "spotlight_shop_clicks": 0,
            "contact_taps": 0,
        }
        for label in labels
    }
    unique_shop_visitors: dict[str, set[str]] = {label: set() for label in labels}
    unique_spotlight_viewers: dict[str, set[str]] = {label: set() for label in labels}

    event_rows = (
        db.query(
            MarketplaceAttentionEvent.event_type,
            MarketplaceAttentionEvent.created_at,
            MarketplaceAttentionEvent.viewer_user_id,
            MarketplaceAttentionEvent.anonymous_key_hash,
        )
        .filter(
            MarketplaceAttentionEvent.shop_id == int(shop_id),
            MarketplaceAttentionEvent.created_at >= start,
        )
        .all()
    )

    for event_type, created_at, viewer_user_id, anonymous_key_hash in event_rows:
        created = created_at
        if created is None:
            continue
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        day = created.astimezone(timezone.utc).strftime("%Y-%m-%d")
        summary = rows_by_day.get(day)
        if summary is None:
            continue

        viewer_key = (
            f"user:{int(viewer_user_id)}"
            if viewer_user_id is not None
            else f"anon:{anonymous_key_hash or ''}"
        )

        if event_type == EVENT_SHOP_VISIT:
            summary["shop_visits"] += 1
            if viewer_key != "anon:":
                unique_shop_visitors[day].add(viewer_key)
        elif event_type == EVENT_PRODUCT_OPEN:
            summary["product_opens"] += 1
        elif event_type == EVENT_SPOTLIGHT_IMPRESSION:
            summary["spotlight_impressions"] += 1
            if viewer_key != "anon:":
                unique_spotlight_viewers[day].add(viewer_key)
        elif event_type == EVENT_SPOTLIGHT_SHOP_CLICK:
            summary["spotlight_shop_clicks"] += 1
        elif event_type == EVENT_CONTACT_TAP:
            summary["contact_taps"] += 1

    for day, viewers in unique_shop_visitors.items():
        rows_by_day[day]["unique_shop_visitors"] = len(viewers)
    for day, viewers in unique_spotlight_viewers.items():
        rows_by_day[day]["unique_spotlight_viewers"] = len(viewers)

    return [rows_by_day[label] for label in labels]

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
    follower_count = _shop_follower_count(db, shop_id=int(shop.id))

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
        "followers": {
            "follower_count": follower_count,
            "followers_count": follower_count,
            "notification_label": "Followers receive shop update notifications when visible shop products or spotlights are posted.",
            "boundary_label": "Followers are repeat audience, not buyers or payment evidence.",
        },
        "daily_activity": _daily_activity_summary(db, shop_id=int(shop.id), days=7, now=now),
        "follower_notifications": _shop_follower_notice_summary(
            db,
            shop=shop,
            last_7_days=last_7_days,
            now=now,
        ),
        "follower_notification_response": _follower_notification_response_summary(
            db,
            shop_id=int(shop.id),
            since=last_7_days,
        ),
        "share_actions": _share_action_summary(db, shop_id=int(shop.id), since=last_7_days),
        "share_response": _share_response_summary(db, shop_id=int(shop.id), since=last_7_days),
        "recommendation_actions": _recommendation_action_summary(db, shop_id=int(shop.id), since=last_7_days),
        "trade_outcomes": _protected_trade_outcome_summary(db, shop=shop, since=last_7_days),
        "source_breakdown": _source_breakdown_summary(db, shop_id=int(shop.id), since=last_7_days),
        "top_products": top_products,
        "boundary_note": "Visitors, views, and taps help a seller improve the shop. They are not buyers, sales, verification, payment evidence, or trust score.",
    }
