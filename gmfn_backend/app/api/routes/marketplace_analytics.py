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
    MarketplaceRequest,
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


def _open_demand_count_for_shop_community(db: Session, *, shop: MarketplaceShop, now: datetime) -> int:
    clan_id = _safe_positive_int(getattr(shop, "clan_id", None))
    if clan_id is None:
        return 0
    return (
        db.query(MarketplaceRequest)
        .filter(
            MarketplaceRequest.clan_id == clan_id,
            MarketplaceRequest.status == "open",
            (MarketplaceRequest.expires_at.is_(None)) | (MarketplaceRequest.expires_at >= now),
        )
        .count()
    )


def _active_shop_product_count(db: Session, *, shop_id: int) -> int:
    return (
        db.query(MarketplaceProduct)
        .filter(
            MarketplaceProduct.shop_id == int(shop_id),
            MarketplaceProduct.is_active.is_(True),
        )
        .count()
    )


def _opportunity_engine_summary(
    db: Session,
    *,
    shop: MarketplaceShop,
    now: datetime,
    period_last_7_days: dict[str, Any],
    spotlight: dict[str, Any],
    recommendation_actions: dict[str, Any],
    trade_outcomes: dict[str, Any],
    follower_count: int,
) -> dict[str, Any]:
    shop_id = int(shop.id)
    clan_id = _safe_positive_int(getattr(shop, "clan_id", None))
    active_products = _active_shop_product_count(db, shop_id=shop_id)
    open_demand = _open_demand_count_for_shop_community(db, shop=shop, now=now)
    active_spotlights = int(spotlight.get("active_spotlights") or 0)
    spotlight_impressions = int(period_last_7_days.get("spotlight_impressions") or 0)
    shop_visits = int(period_last_7_days.get("shop_visits") or 0)
    product_opens = int(period_last_7_days.get("product_opens") or 0)
    contact_taps = int(period_last_7_days.get("contact_taps") or 0)
    attention_events = sum(
        int(period_last_7_days.get(key) or 0)
        for key in ("shop_visits", "product_opens", "spotlight_impressions", "spotlight_shop_clicks", "contact_taps")
    )
    protected_trade_records = int(trade_outcomes.get("last_7_days") or 0)
    released_trade_records = int(trade_outcomes.get("released_records") or 0)
    payment_claimed_records = int(trade_outcomes.get("payment_claimed_or_recorded") or 0)
    receipt_confirmed_records = int(trade_outcomes.get("receipt_confirmed") or 0)
    recommendation_action_count = int(recommendation_actions.get("last_7_days") or 0)
    acquisition_signals = shop_visits + product_opens + contact_taps + max(int(follower_count or 0), 0)
    outcome_signals = protected_trade_records + released_trade_records + payment_claimed_records + receipt_confirmed_records
    has_acquisition_trail = acquisition_signals > 0
    has_outcome_trail = outcome_signals > 0
    unit_economics_status = (
        "Ready to estimate"
        if has_acquisition_trail and has_outcome_trail
        else "Partial"
        if has_acquisition_trail or has_outcome_trail or open_demand > 0
        else "Not ready"
    )

    signal_groups = [
        {
            "key": "shop_marketplace",
            "label": "Shop and Marketplace",
            "status": "Live" if active_products > 0 else "Next",
            "count": active_products,
            "evidence": "Active shop products counted from marketplace_products for this shop.",
        },
        {
            "key": "spotlight_attention",
            "label": "Spotlight attention",
            "status": "Live" if active_spotlights > 0 or spotlight_impressions > 0 else "Next",
            "count": spotlight_impressions,
            "evidence": "Active spotlights plus last-7-days spotlight impressions from marketplace attention events.",
        },
        {
            "key": "demand_box",
            "label": "DemandBox",
            "status": "Live" if open_demand > 0 else "Next",
            "count": open_demand,
            "evidence": "Open non-expired MarketplaceRequest rows scoped to the shop community.",
        },
        {
            "key": "protected_trade",
            "label": "Protected trade evidence",
            "status": "Live" if protected_trade_records > 0 else "Next",
            "count": protected_trade_records,
            "evidence": "ProtectedTradeRecord rows linked by shop_id or seller_user_id in this window.",
        },
        {
            "key": "community_context",
            "label": "Community context",
            "status": "Live" if clan_id is not None else "Next",
            "count": 1 if clan_id is not None else 0,
            "evidence": "The shop has a selected clan_id context for local readings.",
        },
        {
            "key": "advice_action_trail",
            "label": "Advice action trail",
            "status": "Live" if recommendation_action_count > 0 else "Next",
            "count": recommendation_action_count,
            "evidence": "Owner recommendation_actioned events from the existing marketplace attention table.",
        },
    ]
    live_count = sum(1 for row in signal_groups if row["status"] == "Live")
    unit_economics_readiness = {
        "title": "CAC/LTV readiness",
        "status": unit_economics_status,
        "summary": (
            "GSN has early acquisition and outcome evidence, but still needs cost and repeat-value records before a real CAC/LTV ratio."
            if unit_economics_status == "Ready to estimate"
            else "GSN has part of the signal trail, but not enough to compare customer acquisition cost against lifetime value."
            if unit_economics_status == "Partial"
            else "GSN cannot estimate CAC/LTV until traffic, cost, outcome, and repeat-customer evidence exist."
        ),
        "cac_side": (
            f"{shop_visits} visitors, {product_opens} product opens, {contact_taps} contact taps, and {int(follower_count or 0)} followers can describe attention and intent."
            if has_acquisition_trail
            else "No acquisition trail yet. CAC needs tracked outreach cost, channel, visits, contact intent, and owner effort."
        ),
        "ltv_side": (
            f"{protected_trade_records} protected records, {released_trade_records} releases, {payment_claimed_records} payment signals, and {receipt_confirmed_records} receipt confirmations can begin the value trail."
            if has_outcome_trail
            else "No value trail yet. LTV needs completed outcomes, repeat purchases, retention, margin, support cost, and trust evidence."
        ),
        "current_evidence": [
            f"Acquisition signals: {acquisition_signals}",
            f"Outcome signals: {outcome_signals}",
            f"DemandBox signals: {open_demand}",
        ],
        "missing_evidence": [
            "Paid or effort cost by channel before a true CAC calculation.",
            "Completed sale value, margin, repeat purchase, and retention before a true LTV calculation.",
            "Enough records over time to avoid treating one contact or one sale as a business model.",
        ],
        "next_step": (
            "Start recording the cost or effort behind each promoted channel, then connect serious outcomes to Protected Trade or TrustSlip evidence."
            if has_acquisition_trail
            else "Create one measurable visibility path first, then record whether it produces contact and protected outcomes."
        ),
        "boundary": "Readiness only. This is not CAC, not LTV, not ROI, not profit, and not investor-grade unit economics yet.",
    }
    measurement_plan = [
        {
            "step": "Capture acquisition cost",
            "metric": "CAC input",
            "currently_available": False,
            "reads": "No cash-cost, airtime, data, helper-cost, or owner-effort cost table is wired into this shop summary yet.",
            "owner_action": "Record the channel, spend, airtime/data, helper cost, and time behind each promoted shop push before comparing CAC with LTV.",
            "boundary": "Visits are not free acquisition if real owner effort or money was spent to create them.",
        },
        {
            "step": "Trace the acquisition path",
            "metric": "Channel-to-contact path",
            "currently_available": has_acquisition_trail,
            "reads": "Shop visits, product opens, contact taps, follower count, share response, and Spotlight attention events.",
            "owner_action": "Keep using attributed shop links, Spotlight posts, follower notices, and contact taps so GSN can see which path produced serious contact.",
            "boundary": "Attention describes possible intent; it is not a buyer, payment, or delivery proof.",
        },
        {
            "step": "Connect value outcomes",
            "metric": "LTV input",
            "currently_available": has_outcome_trail,
            "reads": "ProtectedTradeRecord rows linked by shop_id or seller_user_id, including released, payment-claimed, and receipt-confirmed states.",
            "owner_action": "Move serious sales or support outcomes through Protected Trade or TrustSlip evidence so the value trail is not only chat or memory.",
            "boundary": "A protected record starts evidence; it is not profit, margin, satisfaction, or lifetime value by itself.",
        },
        {
            "step": "Mark repeat value",
            "metric": "Retention input",
            "currently_available": False,
            "reads": "No repeat-customer, margin, retention, or support-cost trail is wired into this shop summary yet.",
            "owner_action": "Later connect repeat buyer outcomes, margin, support cost, and retention windows before calling anything LTV.",
            "boundary": "One sale, one contact, or one release cannot define lifetime value.",
        },
        {
            "step": "Review sample quality",
            "metric": "Decision quality",
            "currently_available": attention_events >= 5 and protected_trade_records > 0,
            "reads": "The current seven-day attention window, DemandBox count, protected records, and recommendation action trail.",
            "owner_action": "Use small experiments until repeated records over time show the same direction.",
            "boundary": "Tiny samples are learning signals, not a business model, investor metric, or guarantee.",
        },
    ]
    experiment_plan = [
        {
            "title": "One-offer clarity test",
            "trigger": "Attention exists, but contact intent still needs proof.",
            "hypothesis": "A clearer product title, price, or buyer instruction may improve the path from view to contact.",
            "metric": "Product opens to contact taps",
            "owner_action": "Change only one visible offer detail, then keep the next seven-day attention window comparable.",
            "review_window": "7 days",
            "success_signal": "Contact taps rise without needing more manual explanation outside GSN.",
            "stop_rule": "Stop calling it product demand if views remain curiosity only and contact taps stay flat.",
            "boundary": "This is an experiment suggestion, not proof of demand, buyer intent, or future sales.",
        },
        {
            "title": "DemandBox fit check",
            "trigger": "Community requests can reveal local need only when requests repeat or match shop capability.",
            "hypothesis": "A repeated DemandBox pattern may point to an offer the shop can test safely.",
            "metric": "Open DemandBox requests and matched shop offers",
            "owner_action": "Compare the next real community request with one existing shop offer before creating a new product push.",
            "review_window": "90 days",
            "success_signal": "More than one independent request points to the same need or service gap.",
            "stop_rule": "Do not treat one request or founder memory as market size.",
            "boundary": "DemandBox is a signal lane, not a guaranteed customer list or community-wide vote.",
        },
        {
            "title": "Protected outcome close-loop",
            "trigger": "Protected Trade records exist, but outcome quality must be checked before scaling attention.",
            "hypothesis": "Resolved trade evidence may show which offers deserve more traffic and which need trust repair.",
            "metric": "Released, payment-claimed, and receipt-confirmed protected records",
            "owner_action": "Review unresolved or recent protected records before increasing Spotlight or follower-notice pressure.",
            "review_window": "now",
            "success_signal": "A promoted offer also has clean completion evidence, not only clicks.",
            "stop_rule": "Pause promotion if records show unresolved, disputed, or unclear outcomes.",
            "boundary": "Completion evidence is stronger than attention, but still not profit, LTV, or satisfaction by itself.",
        },
        {
            "title": "Cost note discipline",
            "trigger": "CAC cannot be calculated until owner cost and effort are captured beside traffic.",
            "hypothesis": "A cheap channel that produces serious contact may beat a noisy channel that only creates views.",
            "metric": "Cost or effort per serious contact",
            "owner_action": "For each push, record channel, spend, airtime/data, helper cost, and owner time in the operating notes until a formal cost table exists.",
            "review_window": "30 days",
            "success_signal": "The owner can compare attention and outcomes against actual effort, not just total views.",
            "stop_rule": "Do not call a channel efficient until cost, contact, and outcome are all visible together.",
            "boundary": "This is measurement discipline, not accounting, tax advice, ROI, or investor-grade CAC.",
        },
    ]
    advanced_lanes = [
        {
            "key": "signals",
            "label": "Signals",
            "status": "Live" if live_count > 0 else "Next",
            "reads": "Existing owner summary signal groups, attention counts, DemandBox count, protected records, and recommendation actions.",
            "unlocks": "Shows what changed recently before any opportunity claim is made.",
            "boundary": "Computed owner summary only; not saved AI, not external research, and not a guarantee.",
        },
        {
            "key": "market",
            "label": "Market",
            "status": "Partial" if active_products > 0 or open_demand > 0 else "Next",
            "reads": "Active shop products, public offer attention, contact taps, and open DemandBox requests.",
            "unlocks": "Supports product, demand, pricing, and traffic hypotheses when records repeat.",
            "boundary": "One request, one view spike, or one contact must not be treated as market size.",
        },
        {
            "key": "economic",
            "label": "Economic",
            "status": "Partial" if has_acquisition_trail or has_outcome_trail else "Next",
            "reads": "CAC/LTV readiness, protected outcome trail, and missing cost/repeat-value evidence.",
            "unlocks": "Prepares affordability, cost, revenue, and value questions once proper cost and outcome records exist.",
            "boundary": "Not financial advice, accounting, profit, ROI, CAC, or LTV calculation.",
        },
        {
            "key": "social",
            "label": "Social",
            "status": "Partial" if clan_id is not None or open_demand > 0 else "Next",
            "reads": "Selected community context and DemandBox counts only in this shop slice.",
            "unlocks": "May later show household, community, education, faith, or support patterns when governed data exists.",
            "boundary": "No wellbeing, demographic, safeguarding, or community-wide conclusion is made here.",
        },
        {
            "key": "technology",
            "label": "Technology",
            "status": "Next",
            "reads": "No device notification, delivery automation, media-performance, or integration readiness table is wired yet.",
            "unlocks": "Could later identify automation, phone notification, media, payment, or operations improvements.",
            "boundary": "Not proof that push alerts, WhatsApp delivery, API integrations, or automation are live.",
        },
        {
            "key": "governance",
            "label": "Governance",
            "status": "Partial" if clan_id is not None else "Next",
            "reads": "Selected community context only; no governed role, consent, policy, or publication workflow is wired into this shop slice.",
            "unlocks": "Prepares community or institutional review before publishing wider recommendations.",
            "boundary": "Not approval, delegated authority, legal mandate, or community decision evidence.",
        },
        {
            "key": "legal_risk",
            "label": "Legal and Risk",
            "status": "Partial" if protected_trade_records > 0 else "Next",
            "reads": "Protected Trade states and truthful analytics boundaries.",
            "unlocks": "Flags where unresolved evidence or risky claims should stop promotion from scaling.",
            "boundary": "Not legal advice, compliance approval, dispute judgment, or regulated recommendation.",
        },
        {
            "key": "place_environment",
            "label": "Place and Environment",
            "status": "Blocked",
            "reads": "No governed outside-context source, geography rule, weather, transport, housing, or local event feed is wired yet.",
            "unlocks": "Could later connect local place changes to GSN evidence when cited sources and review rules exist.",
            "boundary": "No external-market, political, health, legal, financial, weather, or place conclusion is made.",
        },
        {
            "key": "opportunities",
            "label": "Opportunities",
            "status": "Partial" if live_count > 0 else "Next",
            "reads": "Reviewed output cards, measurement plan, experiment plan, and evidence ledger.",
            "unlocks": "Turns repeated evidence into cautious opportunity options for owner review.",
            "boundary": "Opportunity options are not instructions, guarantees, customer promises, or investment advice.",
        },
        {
            "key": "next_moves",
            "label": "Next Moves",
            "status": "Live" if len(experiment_plan) > 0 else "Next",
            "reads": "Small experiment plan and CAC/LTV measurement plan.",
            "unlocks": "Gives practical next tests that can be reviewed against later GSN records.",
            "boundary": "Next moves are optional experiments, not orders or proof that the test will work.",
        },
    ]
    feature_touchpoints = [
        {
            "feature": "Shop Diary and Marketplace",
            "status": "Live" if active_products > 0 else "Next",
            "reads": "Active products, public shop visits, product opens, contact taps, followers, and Spotlight traffic.",
            "can_help": "Shows which offers deserve clearer copy, price testing, or a small visibility experiment.",
            "next_wiring": "Add cost and channel notes so attention can be compared with acquisition effort.",
            "boundary": "Attention is not sales proof, CAC, LTV, or market size.",
        },
        {
            "feature": "DemandBox",
            "status": "Live" if open_demand > 0 else "Next",
            "reads": "Open non-expired community requests that are scoped to the shop community.",
            "can_help": "Compares repeated needs with public offers before creating more promotion.",
            "next_wiring": "Add matching evidence between requests, shop offers, and completed protected outcomes.",
            "boundary": "A request is a demand clue, not a buyer list, promise, or community-wide vote.",
        },
        {
            "feature": "Protected Trade",
            "status": "Live" if protected_trade_records > 0 else "Next",
            "reads": "Protected trade state counts linked by shop_id or seller_user_id.",
            "can_help": "Checks whether promoted attention is supported by cleaner completion evidence.",
            "next_wiring": "Connect unresolved, released, payment, receipt, and dispute states to opportunity review.",
            "boundary": "A protected record is evidence state, not automatic satisfaction, profit, or legal judgment.",
        },
        {
            "feature": "TrustPassport and TrustSlip",
            "status": "Next",
            "reads": "Not wired into this shop Opportunity Engine slice yet.",
            "can_help": "Later, verified identity and decision evidence can help explain why some offers or people should be handled more carefully.",
            "next_wiring": "Add governed trust-evidence summaries without exposing private documents, scores, or cross-community identity.",
            "boundary": "No trust score, private document, personal risk label, or identity inference is exposed here.",
        },
        {
            "feature": "Trust Graph",
            "status": "Next",
            "reads": "Not wired into this shop Opportunity Engine slice yet.",
            "can_help": "Later, relationship evidence can show where trust movement is strong enough for referral, guarantee, or support workflows.",
            "next_wiring": "Add permissioned graph summaries with role and consent controls before any recommendation uses them.",
            "boundary": "No private relationship map, social ranking, or cross-silo discovery is created.",
        },
        {
            "feature": "Community Home and Bulletin",
            "status": "Partial" if clan_id is not None else "Next",
            "reads": "Selected community context only in this shop slice.",
            "can_help": "Frames opportunity readings inside the owner-selected community instead of treating all GSN activity as one market.",
            "next_wiring": "Add governed bulletin/share-output evidence only after publication settings are explicit.",
            "boundary": "This is not community approval, not public broadcast proof, and not a permission to post externally.",
        },
        {
            "feature": "Market Wisdom",
            "status": "Partial" if live_count > 0 else "Next",
            "reads": "Reviewed summaries can later provide a small Market Wisdom snapshot after human review.",
            "can_help": "Turns evidence into cautious weekly learning without changing the frozen dashboard presentation.",
            "next_wiring": "Persist reviewed snapshots and cadence rules before feeding the dashboard wisdom lane.",
            "boundary": "This does not modify frozen Market Wisdom UI and does not publish automatic advice.",
        },
        {
            "feature": "Notifications and WhatsApp Bridge",
            "status": "Next",
            "reads": "No push-notification, vibration, social-forwarding, or delivery-state table is wired here yet.",
            "can_help": "Later, real-time alerts and external bulletin links can bring people back to GSN action pages.",
            "next_wiring": "Build notification permissions, delivery logs, and bridge-output rules before automation.",
            "boundary": "No automatic WhatsApp/social/email delivery or phone vibration is live from this summary.",
        },
    ]
    commercial_checkpoints = [
        {
            "stage": "Pilot value proof",
            "status": "Live" if live_count > 0 else "Next",
            "requires": "Owner can see useful signals from real GSN activity without manual storytelling.",
            "owner_value": "Shows what to test next and what not to claim yet.",
            "pricing_signal": "People ask to keep using the reading after the demo or after the first shop test.",
            "boundary": "Do not charge as full Advanced Analytics until saved reports, permission rules, and repeat review exist.",
        },
        {
            "stage": "Evidence quality",
            "status": "Partial" if has_acquisition_trail or has_outcome_trail else "Next",
            "requires": "Acquisition signals, outcome signals, DemandBox patterns, and sample-size warnings are visible together.",
            "owner_value": "Prevents bad decisions from one view, one request, or founder memory.",
            "pricing_signal": "Owner trusts the evidence enough to change a listing, offer, or outreach plan inside GSN.",
            "boundary": "This is decision support, not proof of sales, profit, CAC/LTV, market size, or customer satisfaction.",
        },
        {
            "stage": "Paid package readiness",
            "status": "Next",
            "requires": "Billing gate, entitlements, saved reviewed reports, report history, and clear free-vs-paid limits.",
            "owner_value": "Makes Advanced Analytics feel like a dependable business tool rather than a one-time insight.",
            "pricing_signal": "Owner returns weekly or monthly for reviewed opportunity readings and measurable next tests.",
            "boundary": "Not charged yet from this summary and not an entitlement record.",
        },
        {
            "stage": "Retention and LTV proof",
            "status": "Next",
            "requires": "Repeat use, repeat outcomes, margin or value notes, support cost, and churn or renewal evidence.",
            "owner_value": "Shows whether the feature deserves ongoing payment instead of only initial excitement.",
            "pricing_signal": "The same owner keeps paying because the guidance repeatedly improves decisions or saves effort.",
            "boundary": "LTV is not available until repeat paid value and retention are measured over time.",
        },
    ]
    access_model = [
        {
            "level": "Free owner preview",
            "status": "Live" if live_count > 0 else "Next",
            "includes": "One current computed summary, visible signal counts, simple Market Intelligence guidance, and caution boundaries.",
            "excluded": "No saved report history, no AI-assisted forecast, no external context, no CAC/LTV ratio, and no private trust inference.",
            "why": "Lets a shop owner understand GSN value before paying, while keeping claims small and auditable.",
            "boundary": "Free preview is evidence reading only; it is not a full Advanced Analytics subscription.",
        },
        {
            "level": "Paid Advanced Analytics candidate",
            "status": "Next",
            "includes": "Saved reviewed reports, repeated experiments, cost notes, retention tracking, and owner-specific opportunity readings.",
            "excluded": "No automatic legal, medical, financial, political, or investment advice; no unreviewed private identity conclusions.",
            "why": "This becomes chargeable only when it repeatedly saves effort or improves owner decisions.",
            "boundary": "Not active billing and not an entitlement until the billing gate and report history exist.",
        },
        {
            "level": "Governed intelligence add-on",
            "status": "Blocked",
            "includes": "External context, AI-assisted inference, cross-feature pattern review, and community-level opportunity analysis after governance rules exist.",
            "excluded": "No outside-market claims, sensitive-topic analysis, cross-community profiling, or automatic publication from the current summary.",
            "why": "This is where the larger Opportunity Engine may grow, but only after source, consent, role, and review controls are real.",
            "boundary": "Blocked in this slice; do not sell, demo, or describe it as live functionality.",
        },
    ]
    evidence_ledger = [
        {
            "source": "Marketplace and Shop Diary",
            "status": "Live" if active_products > 0 else "Next",
            "records": active_products,
            "reads": "Active marketplace_products rows for this shop.",
            "privacy_boundary": "Owner analytics only; does not expose private buyer identity or prove sales.",
        },
        {
            "source": "Spotlight attention",
            "status": "Live" if active_spotlights > 0 or spotlight_impressions > 0 else "Next",
            "records": spotlight_impressions,
            "reads": "Active marketplace_broadcasts plus marketplace_attention_events in this window.",
            "privacy_boundary": "Counts attention events; not full identity, payment, or delivery proof.",
        },
        {
            "source": "DemandBox",
            "status": "Live" if open_demand > 0 else "Next",
            "records": open_demand,
            "reads": "Open non-expired marketplace_requests rows in the selected community.",
            "privacy_boundary": "Request count only; no private response thread or personal scoring exposed.",
        },
        {
            "source": "Protected Trade",
            "status": "Live" if protected_trade_records > 0 else "Next",
            "records": protected_trade_records,
            "reads": "ProtectedTradeRecord rows linked by shop_id or seller_user_id.",
            "privacy_boundary": "Evidence state only; not automatic sales, receipt, dispute, or satisfaction proof.",
        },
        {
            "source": "TrustPassport, TrustSlip, Trust Graph",
            "status": "Next",
            "records": 0,
            "reads": "Not wired into this shop Opportunity Engine slice yet.",
            "privacy_boundary": "No trust score, identity exposure, or cross-community relationship inference is made.",
        },
        {
            "source": "External context",
            "status": "Blocked",
            "records": 0,
            "reads": "Not connected until source, geography, sensitive-topic, and review rules exist.",
            "privacy_boundary": "No political, health, legal, financial, or outside-market conclusion is made.",
        },
    ]
    output_cards = [
        {
            "lens": "Signals",
            "signal": f"{attention_events} shop-attention events were recorded in the last 7 days.",
            "evidence": "Last-7-days shop visits, product opens, Spotlight impressions, Spotlight shop clicks, and contact taps.",
            "interpretation": "This may show whether the offer is receiving attention before GSN claims demand or sales.",
            "opportunity": "Tune one visible offer, price, or buyer instruction and recheck the next attention window.",
            "risk": "Views and taps can be curiosity only; they are not buyer proof, payment proof, or fulfilment proof.",
            "time_horizon": "now",
            "confidence": "medium" if attention_events >= 5 else "low",
            "suggested_next_step": "Review the strongest public item and keep the next experiment small.",
            "human_review": "Owner reviews before acting or publishing.",
        },
        {
            "lens": "Market",
            "signal": f"{open_demand} open DemandBox requests are visible in this shop community.",
            "evidence": "Open non-expired MarketplaceRequest rows scoped to the selected community.",
            "interpretation": "DemandBox can become a local demand clue when requests repeat, but zero or tiny counts are still only a gap signal.",
            "opportunity": "Compare the shop's public offers with the next real community request before adding more promotion.",
            "risk": "One request, or no request, must not be presented as market size or guaranteed customer demand.",
            "time_horizon": "90 days",
            "confidence": "medium" if open_demand >= 3 else "low",
            "suggested_next_step": "Watch for repeated community requests before treating this as a product direction.",
            "human_review": "Owner reviews before acting or publishing.",
        },
        {
            "lens": "Trust and risk",
            "signal": f"{protected_trade_records} protected trade records are linked in the last 7 days.",
            "evidence": "ProtectedTradeRecord rows linked by shop_id or seller_user_id in this analytics window.",
            "interpretation": "Outcome evidence may be forming when protected records exist, but the record state decides what it proves.",
            "opportunity": "Use resolved protected records to learn what buyers actually completed or where trust broke down.",
            "risk": "Protected trade activity is not automatic sales proof and must not hide unresolved or disputed records.",
            "time_horizon": "now",
            "confidence": "medium" if protected_trade_records > 0 else "low",
            "suggested_next_step": "Open unresolved or recent protected records before increasing traffic pressure.",
            "human_review": "Owner reviews before acting or publishing.",
        },
    ]

    return {
        "aggregator_ready": True,
        "engine_state": "computed_owner_summary",
        "live_signal_count": live_count,
        "signal_group_count": len(signal_groups),
        "signal_groups": signal_groups,
        "output_cards": output_cards,
        "unit_economics_readiness": unit_economics_readiness,
        "evidence_ledger": evidence_ledger,
        "measurement_plan": measurement_plan,
        "experiment_plan": experiment_plan,
        "advanced_lanes": advanced_lanes,
        "feature_touchpoints": feature_touchpoints,
        "commercial_checkpoints": commercial_checkpoints,
        "access_model": access_model,
        "field_coverage": {
            "shop_and_marketplace": active_products > 0,
            "spotlight_attention": active_spotlights > 0 or spotlight_impressions > 0,
            "demand_box": open_demand > 0,
            "protected_trade": protected_trade_records > 0,
            "community_context": clan_id is not None,
            "advice_action_trail": recommendation_action_count > 0,
            "governed_outside_context": False,
            "ai_inference": False,
            "saved_reports": False,
            "billing_gate": False,
        },
        "snapshot": {
            "title": "Opportunity Engine backend snapshot",
            "headline": f"{live_count} of {len(signal_groups)} owner-summary signal groups are live.",
            "evidence": "Computed from the existing shop analytics summary, DemandBox request count, protected trade records, and marketplace attention events.",
            "next_step": "Persist reviewed snapshots before treating this as a saved paid Advanced Analytics report.",
        },
        "boundary_label": "Computed owner analytics only. This is not saved AI inference, billing entitlement, external-context research, sales proof, or a trust score.",
        "count_method": "Owner-only computed summary from marketplace_products, marketplace_broadcasts, marketplace_requests, marketplace_attention_events, and protected_trade_records.",
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
    today_period = _period_summary(db, shop_id=int(shop.id), since=today_start)
    last_7_days_period = _period_summary(db, shop_id=int(shop.id), since=last_7_days)
    requested_period = _period_summary(db, shop_id=int(shop.id), since=requested_start)
    spotlight_summary = _active_spotlight_reach(db, shop_id=int(shop.id), now=now)
    recommendation_actions = _recommendation_action_summary(db, shop_id=int(shop.id), since=last_7_days)
    trade_outcomes = _protected_trade_outcome_summary(db, shop=shop, since=last_7_days)
    return {
        "ok": True,
        "shop_id": int(shop.id),
        "shop_owner_user_id": _safe_positive_int(getattr(shop, "owner_user_id", None)),
        "days": int(days),
        "periods": {
            "today": today_period,
            "last_7_days": last_7_days_period,
            "requested": requested_period,
        },
        "spotlight": spotlight_summary,
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
        "recommendation_actions": recommendation_actions,
        "trade_outcomes": trade_outcomes,
        "opportunity_engine": _opportunity_engine_summary(
            db,
            shop=shop,
            now=now,
            period_last_7_days=last_7_days_period,
            spotlight=spotlight_summary,
            recommendation_actions=recommendation_actions,
            trade_outcomes=trade_outcomes,
            follower_count=follower_count,
        ),
        "source_breakdown": _source_breakdown_summary(db, shop_id=int(shop.id), since=last_7_days),
        "top_products": top_products,
        "boundary_note": "Visitors, views, and taps help a seller improve the shop. They are not buyers, sales, verification, payment evidence, or trust score.",
    }
