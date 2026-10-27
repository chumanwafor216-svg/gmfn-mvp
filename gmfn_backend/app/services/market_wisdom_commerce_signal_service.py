from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.db.models import (
    MarketplaceAttentionEvent,
    MarketplaceBroadcast,
    MarketplaceProduct,
    MarketplaceRequest,
    MarketplaceShop,
)


COMMERCE_WINDOW_DAYS = 7
VISIBLE_PRODUCT_MODES = {"community_visible", "community", "public"}
ATTENTION_EVENT_TYPES = {
    "shop_visit",
    "product_open",
    "spotlight_impression",
    "spotlight_shop_click",
    "contact_tap",
}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _unavailable_signal(
    *,
    state: str,
    now: datetime,
    shop: Optional[MarketplaceShop] = None,
    clan_id: Optional[int] = None,
) -> dict[str, Any]:
    return {
        "available": False,
        "state": state,
        "observed_at": now.isoformat(),
        "window_days": COMMERCE_WINDOW_DAYS,
        "shop_id": int(shop.id) if shop is not None else None,
        "clan_id": int(clan_id) if clan_id is not None else None,
        "headline": "",
        "why_it_matters": "",
        "first_action_label": "",
        "first_action_route": "",
        "evidence_counts": {},
        "ranking_signals": [],
        "boundaries": [
            "Missing commerce data is not a zero-activity finding.",
            "No private member or buyer identity is included.",
        ],
    }


def build_market_wisdom_commerce_signal(
    db: Session,
    *,
    user_id: Optional[int],
    clan_id: Optional[int] = None,
    now: Optional[datetime] = None,
) -> dict[str, Any]:
    """Return a small owner-scoped commerce observation, not a sales diagnosis."""

    observed_at = now or _now_utc()
    if not user_id:
        return _unavailable_signal(state="unavailable", now=observed_at, clan_id=clan_id)

    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.owner_user_id == int(user_id))
        .first()
    )
    if shop is None:
        return _unavailable_signal(state="no_owned_shop", now=observed_at, clan_id=clan_id)

    shop_clan_id = int(shop.clan_id) if shop.clan_id is not None else None
    if clan_id is not None and shop_clan_id != int(clan_id):
        return _unavailable_signal(
            state="community_mismatch",
            now=observed_at,
            shop=shop,
            clan_id=clan_id,
        )

    active_products = (
        db.query(func.count(MarketplaceProduct.id))
        .filter(
            MarketplaceProduct.shop_id == int(shop.id),
            MarketplaceProduct.is_active.is_(True),
            MarketplaceProduct.visibility_mode.in_(VISIBLE_PRODUCT_MODES),
        )
        .scalar()
        or 0
    )

    active_spotlights = (
        db.query(func.count(MarketplaceBroadcast.id))
        .filter(
            MarketplaceBroadcast.shop_id == int(shop.id),
            MarketplaceBroadcast.serving_status == "serving",
            or_(
                MarketplaceBroadcast.authorized_expires_at > observed_at,
                (
                    MarketplaceBroadcast.authorized_expires_at.is_(None)
                    & or_(
                        MarketplaceBroadcast.expires_at.is_(None),
                        MarketplaceBroadcast.expires_at > observed_at,
                    )
                ),
            ),
        )
        .scalar()
        or 0
    )

    attention_since = observed_at - timedelta(days=COMMERCE_WINDOW_DAYS)
    attention_rows = (
        db.query(
            MarketplaceAttentionEvent.event_type,
            func.count(MarketplaceAttentionEvent.id),
        )
        .filter(
            MarketplaceAttentionEvent.shop_id == int(shop.id),
            MarketplaceAttentionEvent.created_at >= attention_since,
            MarketplaceAttentionEvent.event_type.in_(ATTENTION_EVENT_TYPES),
        )
        .group_by(MarketplaceAttentionEvent.event_type)
        .all()
    )
    attention = {event_type: 0 for event_type in ATTENTION_EVENT_TYPES}
    for event_type, count in attention_rows:
        if event_type in attention:
            attention[event_type] = int(count or 0)

    open_demands = 0
    if shop_clan_id is not None:
        open_demands = (
            db.query(func.count(MarketplaceRequest.id))
            .filter(
                MarketplaceRequest.clan_id == shop_clan_id,
                MarketplaceRequest.status == "open",
                or_(
                    MarketplaceRequest.expires_at.is_(None),
                    MarketplaceRequest.expires_at > observed_at,
                ),
            )
            .scalar()
            or 0
        )

    evidence_counts = {
        "active_products": int(active_products),
        "active_spotlights": int(active_spotlights),
        "shop_visits_7d": attention["shop_visit"],
        "product_opens_7d": attention["product_open"],
        "spotlight_impressions_7d": attention["spotlight_impression"],
        "spotlight_shop_clicks_7d": attention["spotlight_shop_click"],
        "contact_taps_7d": attention["contact_tap"],
        "open_community_demands": int(open_demands),
    }
    attention_total = sum(attention.values())

    state = "ready_to_review"
    headline = "Your shop is ready for a calm activity review."
    why_it_matters = "A regular review helps you improve the next visible offer without treating attention as a sale."
    action_label = "Open Shop Analytics"
    action_route = "/app/shop-control#shop-control-counts"
    ranking_signals = ["shop", "marketplace", "commerce-review"]

    if not bool(shop.is_active):
        state = "shop_paused"
        headline = "Your shop is paused, so customers cannot use it as an active storefront."
        why_it_matters = "Review the shop state before spending time on promotion or interpreting activity."
        action_label = "Open Shop Control"
        action_route = "/app/shop-control"
        ranking_signals = ["shop", "merchant", "shop-paused"]
    elif active_products == 0:
        state = "setup_needed"
        headline = "Your shop has no active visible item yet."
        why_it_matters = "People need one clear visible offer before attention can become useful commerce evidence."
        action_label = "Add a shop item"
        action_route = "/app/shop-assets"
        ranking_signals = ["shop", "merchant", "product-clarity", "setup"]
    elif attention["contact_tap"] > 0 or attention["spotlight_shop_click"] > 0:
        state = "intent_recorded"
        headline = "Recent shop activity includes a contact or Spotlight shop tap."
        why_it_matters = "This is stronger intent evidence than a view, but it is still not a buyer, payment, or sale."
        ranking_signals = ["shop", "trade", "customer-intent", "follow-up"]
    elif attention_total > 0:
        state = "attention_recorded"
        headline = "Your shop recorded attention during the last seven days."
        why_it_matters = "Review which item or Spotlight earned attention before changing the next offer."
        ranking_signals = ["shop", "visibility", "spotlight", "attention"]
    elif open_demands > 0:
        state = "community_need_visible"
        headline = "Your community has open DemandBox requests to review."
        why_it_matters = "They show current community requests, not confirmed matches, buyers, or orders."
        action_label = "Review DemandBox"
        action_route = f"/app/demand-box?clan_id={shop_clan_id}"
        ranking_signals = ["shop", "demand", "community-need", "marketplace"]
    elif active_spotlights == 0:
        state = "visibility_quiet"
        headline = "No qualifying shop attention was recorded in the last seven days."
        why_it_matters = "That is an observed quiet window, not proof that no demand exists. Check the offer before increasing visibility."
        action_label = "Review Spotlight"
        action_route = "/app/free-spotlight"
        ranking_signals = ["shop", "visibility", "spotlight", "quiet-window"]

    return {
        "available": True,
        "state": state,
        "observed_at": observed_at.isoformat(),
        "window_days": COMMERCE_WINDOW_DAYS,
        "shop_id": int(shop.id),
        "clan_id": shop_clan_id,
        "headline": headline,
        "why_it_matters": why_it_matters,
        "first_action_label": action_label,
        "first_action_route": action_route,
        "evidence_counts": evidence_counts,
        "ranking_signals": ranking_signals,
        "boundaries": [
            "Views, opens, impressions, clicks, and contact taps are attention evidence, not buyers, sales, payments, delivery, verification, or trust scores.",
            "DemandBox counts are community request context, not confirmed matches, buyers, or orders.",
            "Spotlight impressions use the qualified visibility threshold; they do not prove meaningful attention or completion.",
        ],
    }
