from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import (
    ClanMembership,
    MarketplaceProduct,
    MarketplaceRequest,
    MarketplaceShop,
    User,
)

REASON_SAME_COMMUNITY = "SAME_COMMUNITY"
REASON_LIVE_DEMAND = "LIVE_DEMAND"
REASON_ACTIVE_SUPPLY = "ACTIVE_SUPPLY"
REASON_CATEGORY_MATCH = "CATEGORY_MATCH"
REASON_AREA_COMPATIBLE = "AREA_COMPATIBLE"

PRODUCT_VISIBILITY_COMMUNITY = "community_visible"
PRODUCT_VISIBLE_MODES = {PRODUCT_VISIBILITY_COMMUNITY, "community", "public"}
OPEN_DEMAND_STATUS = "open"
PROTECTED_TARGET_MARKER = "[GSN_VISIBILITY_SCOPE:protected_target]"

_TOKEN_PATTERN = re.compile(r"[a-z0-9]+")
_HANDLE_PATTERN = re.compile(r"@([A-Za-z0-9._-]{3,})")
_STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "best",
    "brand",
    "community",
    "delivery",
    "for",
    "fresh",
    "from",
    "general",
    "good",
    "in",
    "is",
    "item",
    "market",
    "marketplace",
    "near",
    "new",
    "of",
    "offer",
    "on",
    "or",
    "product",
    "products",
    "shop",
    "the",
    "to",
    "trusted",
    "with",
}
_GENERIC_CATEGORY_TOKENS = {
    "ask",
    "help",
    "home",
    "misc",
    "miscellaneous",
    "need",
    "other",
    "request",
    "service",
    "services",
    "support",
}


@dataclass(frozen=True)
class DemandSupplyMatch:
    demand_id: int
    product_id: int
    shop_id: int
    clan_id: int
    demand_category: str | None
    demand_area: str | None
    product_title: str
    shop_name: str
    reason_codes: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "demand_id": self.demand_id,
            "product_id": self.product_id,
            "shop_id": self.shop_id,
            "clan_id": self.clan_id,
            "demand_category": self.demand_category,
            "demand_area": self.demand_area,
            "product_title": self.product_title,
            "shop_name": self.shop_name,
            "reason_codes": list(self.reason_codes),
        }


def find_supply_for_demand(
    db: Session,
    *,
    demand_id: int,
    current_user_id: int,
    limit: int = 25,
) -> list[dict[str, Any]]:
    demand = db.get(MarketplaceRequest, int(demand_id))
    if not demand or not _is_visible_live_demand(
        db, demand, current_user_id=int(current_user_id)
    ):
        return []

    matches: list[DemandSupplyMatch] = []
    for product, shop in _active_visible_supply_rows(
        db,
        clan_id=int(demand.clan_id),
    ):
        match = _build_match(demand=demand, product=product, shop=shop)
        if match:
            matches.append(match)
        if len(matches) >= limit:
            break
    return [match.to_dict() for match in matches]


def find_demands_for_supply(
    db: Session,
    *,
    product_id: int,
    current_user_id: int,
    limit: int = 25,
) -> list[dict[str, Any]]:
    row = (
        db.query(MarketplaceProduct, MarketplaceShop)
        .join(MarketplaceShop, MarketplaceShop.id == MarketplaceProduct.shop_id)
        .filter(MarketplaceProduct.id == int(product_id))
        .first()
    )
    if not row:
        return []
    product, shop = row
    if not _is_active_visible_supply(product=product, shop=shop):
        return []
    if not _has_active_clan_membership(
        db,
        current_user_id=int(current_user_id),
        clan_id=int(product.clan_id),
    ):
        return []

    matches: list[DemandSupplyMatch] = []
    demands = (
        db.query(MarketplaceRequest)
        .filter(MarketplaceRequest.clan_id == int(product.clan_id))
        .filter(MarketplaceRequest.status == OPEN_DEMAND_STATUS)
        .order_by(MarketplaceRequest.created_at.desc(), MarketplaceRequest.id.desc())
        .all()
    )
    for demand in demands:
        if not _is_visible_live_demand(
            db,
            demand,
            current_user_id=int(current_user_id),
        ):
            continue
        match = _build_match(demand=demand, product=product, shop=shop)
        if match:
            matches.append(match)
        if len(matches) >= limit:
            break
    return [match.to_dict() for match in matches]


def resolve_demand_supply_trade_handoff(
    db: Session,
    *,
    demand_id: int,
    product_id: int,
    shop_id: int,
    current_user_id: int,
) -> dict[str, Any] | None:
    demand = db.get(MarketplaceRequest, int(demand_id))
    if not demand or not _is_visible_live_demand(
        db, demand, current_user_id=int(current_user_id)
    ):
        return None

    row = (
        db.query(MarketplaceProduct, MarketplaceShop)
        .join(MarketplaceShop, MarketplaceShop.id == MarketplaceProduct.shop_id)
        .filter(MarketplaceProduct.id == int(product_id))
        .filter(MarketplaceShop.id == int(shop_id))
        .first()
    )
    if not row:
        return None

    product, shop = row
    if not _is_active_visible_supply(product=product, shop=shop):
        return None

    match = _build_match(demand=demand, product=product, shop=shop)
    if not match:
        return None

    return {
        **match.to_dict(),
        "demand_title": _clean_text(getattr(demand, "title", None)) or "DemandBox request",
        "requester_user_id": int(getattr(demand, "user_id", 0) or 0),
        "seller_user_id": int(getattr(product, "seller_user_id", 0) or 0)
        or int(getattr(shop, "owner_user_id", 0) or 0),
    }


def demand_supply_coverage_summary(
    db: Session,
    *,
    current_user_id: int,
    clan_id: int | None = None,
) -> dict[str, Any]:
    query = db.query(MarketplaceRequest).filter(
        MarketplaceRequest.status == OPEN_DEMAND_STATUS
    )
    if clan_id is not None:
        query = query.filter(MarketplaceRequest.clan_id == int(clan_id))

    visible_live_demand_ids: list[int] = []
    matched_demand_ids: list[int] = []
    match_count = 0
    for demand in query.order_by(MarketplaceRequest.id.asc()).all():
        if not _is_visible_live_demand(
            db,
            demand,
            current_user_id=int(current_user_id),
        ):
            continue
        visible_live_demand_ids.append(int(demand.id))
        matches = find_supply_for_demand(
            db,
            demand_id=int(demand.id),
            current_user_id=int(current_user_id),
            limit=1,
        )
        if matches:
            matched_demand_ids.append(int(demand.id))
            match_count += len(matches)

    return {
        "visible_live_demands": len(visible_live_demand_ids),
        "demands_with_plausible_supply": len(matched_demand_ids),
        "demands_without_plausible_supply": (
            len(visible_live_demand_ids) - len(matched_demand_ids)
        ),
        "sample_matched_demand_ids": matched_demand_ids[:25],
        "sample_unmatched_demand_ids": [
            demand_id
            for demand_id in visible_live_demand_ids
            if demand_id not in set(matched_demand_ids)
        ][:25],
        "sample_match_count": match_count,
        "instrumentation_scope": "same_community_visible_live_demands",
    }


def _active_visible_supply_rows(
    db: Session,
    *,
    clan_id: int,
) -> Iterable[tuple[MarketplaceProduct, MarketplaceShop]]:
    return (
        db.query(MarketplaceProduct, MarketplaceShop)
        .join(MarketplaceShop, MarketplaceShop.id == MarketplaceProduct.shop_id)
        .filter(MarketplaceProduct.clan_id == int(clan_id))
        .filter(MarketplaceProduct.is_active.is_(True))
        .filter(MarketplaceShop.is_active.is_(True))
        .filter(
            or_(
                MarketplaceProduct.visibility_mode.is_(None),
                MarketplaceProduct.visibility_mode.in_(PRODUCT_VISIBLE_MODES),
            )
        )
        .order_by(MarketplaceProduct.created_at.desc(), MarketplaceProduct.id.desc())
        .all()
    )


def _build_match(
    *,
    demand: MarketplaceRequest,
    product: MarketplaceProduct,
    shop: MarketplaceShop,
) -> DemandSupplyMatch | None:
    if int(demand.clan_id or 0) != int(product.clan_id or 0):
        return None
    if not _category_compatible(demand=demand, product=product, shop=shop):
        return None

    reason_codes = [
        REASON_SAME_COMMUNITY,
        REASON_LIVE_DEMAND,
        REASON_ACTIVE_SUPPLY,
        REASON_CATEGORY_MATCH,
    ]
    if _area_compatible(demand=demand, product=product, shop=shop):
        reason_codes.append(REASON_AREA_COMPATIBLE)

    return DemandSupplyMatch(
        demand_id=int(demand.id),
        product_id=int(product.id),
        shop_id=int(shop.id),
        clan_id=int(demand.clan_id),
        demand_category=_clean_text(getattr(demand, "category", None)) or None,
        demand_area=_clean_text(getattr(demand, "area", None)) or None,
        product_title=_clean_text(getattr(product, "name", None)) or "Marketplace item",
        shop_name=_clean_text(getattr(shop, "name", None)) or "Marketplace shop",
        reason_codes=tuple(reason_codes),
    )


def _is_visible_live_demand(
    db: Session,
    demand: MarketplaceRequest,
    *,
    current_user_id: int,
) -> bool:
    clan_id = getattr(demand, "clan_id", None)
    if not clan_id:
        return False
    if not _has_active_clan_membership(
        db,
        current_user_id=int(current_user_id),
        clan_id=int(clan_id),
    ):
        return False
    if str(getattr(demand, "status", "") or "").lower() != OPEN_DEMAND_STATUS:
        return False
    expires_at = getattr(demand, "expires_at", None)
    if expires_at is not None and _as_aware_utc(expires_at) < _now_utc():
        return False
    if PROTECTED_TARGET_MARKER in str(getattr(demand, "description", "") or ""):
        return (
            int(getattr(demand, "user_id", 0) or 0) == int(current_user_id)
            or int(current_user_id) in _mentioned_member_ids(db, demand)
        )
    return True


def _mentioned_member_ids(db: Session, demand: MarketplaceRequest) -> set[int]:
    handle_keys = {_handle_key(handle) for handle in _mentioned_handles(demand)}
    handle_keys.discard("")
    clan_id = getattr(demand, "clan_id", None)
    if not handle_keys or not clan_id:
        return set()

    rows = (
        db.query(User.id, User.gmfn_id)
        .join(ClanMembership, ClanMembership.user_id == User.id)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
            User.gmfn_id.isnot(None),
        )
        .all()
    )
    return {
        int(user_id)
        for user_id, gmfn_id in rows
        if _handle_key(str(gmfn_id)) in handle_keys
    }


def _mentioned_handles(demand: MarketplaceRequest) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    request_text = " ".join(
        str(value or "")
        for value in (
            getattr(demand, "title", None),
            getattr(demand, "description", None),
        )
    )
    for match in _HANDLE_PATTERN.finditer(request_text):
        token = match.group(1).strip(".,;:!?)]}")
        key = _handle_key(token)
        if not key or key in seen:
            continue
        seen.add(key)
        found.append(f"@{token}")
        if len(found) >= 8:
            break
    return found


def _handle_key(value: str) -> str:
    return _clean_text(value).lstrip("@").lower()

def _is_active_visible_supply(
    *,
    product: MarketplaceProduct,
    shop: MarketplaceShop,
) -> bool:
    visibility_mode = str(
        getattr(product, "visibility_mode", PRODUCT_VISIBILITY_COMMUNITY)
        or PRODUCT_VISIBILITY_COMMUNITY
    ).lower()
    return (
        bool(getattr(product, "is_active", False))
        and bool(getattr(shop, "is_active", False))
        and visibility_mode in PRODUCT_VISIBLE_MODES
    )


def _has_active_clan_membership(
    db: Session,
    *,
    current_user_id: int,
    clan_id: int,
) -> bool:
    return (
        db.query(ClanMembership.id)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(current_user_id),
            ClanMembership.left_at.is_(None),
        )
        .first()
        is not None
    )


def _category_compatible(
    *,
    demand: MarketplaceRequest,
    product: MarketplaceProduct,
    shop: MarketplaceShop,
) -> bool:
    demand_tokens = _demand_compatibility_tokens(demand)
    supply_tokens = _supply_tokens(product=product, shop=shop)
    return bool(demand_tokens and supply_tokens and demand_tokens & supply_tokens)


def _area_compatible(
    *,
    demand: MarketplaceRequest,
    product: MarketplaceProduct,
    shop: MarketplaceShop,
) -> bool:
    area_tokens = _tokens(getattr(demand, "area", None))
    if not area_tokens:
        return False
    return bool(area_tokens & _supply_tokens(product=product, shop=shop))


def _demand_compatibility_tokens(demand: MarketplaceRequest) -> set[str]:
    category_tokens = _tokens(getattr(demand, "category", None))
    strong_category_tokens = category_tokens - _GENERIC_CATEGORY_TOKENS
    if strong_category_tokens:
        return strong_category_tokens
    fallback_tokens = _tokens(
        getattr(demand, "title", None),
        getattr(demand, "description", None),
    )
    return fallback_tokens - _GENERIC_CATEGORY_TOKENS


def _supply_tokens(
    *,
    product: MarketplaceProduct,
    shop: MarketplaceShop,
) -> set[str]:
    return _tokens(
        getattr(product, "name", None),
        getattr(product, "description", None),
        getattr(shop, "name", None),
        getattr(shop, "description", None),
        strip_marketplace_prefixes=True,
    )


def _tokens(*values: object, strip_marketplace_prefixes: bool = False) -> set[str]:
    tokens: set[str] = set()
    for value in values:
        text = _marketplace_display_text(value) if strip_marketplace_prefixes else str(value or "")
        for token in _TOKEN_PATTERN.findall(text.lower()):
            if len(token) < 3 or token in _STOP_WORDS:
                continue
            tokens.update(_token_variants(token))
    return tokens


def _token_variants(token: str) -> set[str]:
    variants = {token}
    if token.endswith("ing") and len(token) > 5:
        variants.add(token[:-3])
    if token.endswith("ers") and len(token) > 6:
        variants.add(token[:-3])
    elif token.endswith("er") and len(token) > 5:
        variants.add(token[:-2])
    if token.endswith("ants") and len(token) > 7:
        variants.add(token[:-4])
    elif token.endswith("ant") and len(token) > 6:
        variants.add(token[:-3])
    if token.endswith("s") and len(token) > 4:
        variants.add(token[:-1])
    return {variant for variant in variants if len(variant) >= 3 and variant not in _STOP_WORDS}


def _marketplace_display_text(value: object) -> str:
    text = str(value or "")
    if not text:
        return ""
    text = re.sub(r"^\[BLOCK:\d+\]\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^\[LABEL:.+?\]\s*", "", text, flags=re.IGNORECASE)
    return text.strip()


def _clean_text(value: Any) -> str:
    return " ".join(str(value or "").strip().split())


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
