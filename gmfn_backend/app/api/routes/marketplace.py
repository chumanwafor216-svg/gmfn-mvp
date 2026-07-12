from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import floor
import os
from pathlib import Path
import re
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import (
    Clan,
    ClanMembership,
    FeatureEntitlement,
    MarketplaceBroadcast,
    MarketplaceProduct,
    MarketplaceProductRepost,
    MarketplaceReview,
    MarketplaceShop,
    ShopFollower,
    User,
)
from app.db.notification_models import Notification
from app.services.feature_entitlements_service import (
    consume_feature_units,
    get_active_feature_quantity,
    has_active_feature,
)
from app.services.notification_service import create_notification
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
FEATURE_EXTRA_SHOP_BLOCK = "extra_shop_block"

# Historical test-week capacity override. It is kept only so older status
# payloads can report whether that date-limited bypass is active; current free
# Spotlight fairness is enforced by the daily global-identity rule below.
SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_UNTIL = datetime(2026, 5, 17, 23, 59, 59, tzinfo=timezone.utc)

# Live pilot fairness rule: one global member identity gets one free
# direct-community Spotlight run per UTC day. Paid Spotlight and Network Repost
# credits stay separate.
FREE_SPOTLIGHT_DAILY_LIMIT_PER_AUTHOR = 1

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
    current_time = now or _now_utc()
    return current_time <= SPOTLIGHT_CAPACITY_PILOT_OVERRIDE_UNTIL


def _safe_str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    s = str(value).strip()
    return s if s else default


def _public_identity_name(*values: Any, fallback: str) -> str:
    for value in values:
        text = _safe_str(value)
        if not text:
            continue

        lowered = text.lower()
        if "@" in lowered:
            continue
        if lowered.endswith(".local"):
            continue
        digits = "".join(ch for ch in text if ch.isdigit())
        if len(digits) >= 7 and len(digits) >= max(1, len(text.replace(" ", "")) - 2):
            continue

        return text

    return fallback


def _public_product_display_text(value: Any) -> str:
    text = _safe_str(value)
    if not text:
        return ""

    text = re.sub(r"^\[BLOCK:\d+\]\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^\[LABEL:.+?\]\s*", "", text, flags=re.IGNORECASE)
    return text.strip()


def _public_product_block_number(value: Any) -> Optional[int]:
    match = re.match(r"^\[BLOCK:(\d+)\]\s*", _safe_str(value), flags=re.IGNORECASE)
    if not match:
        return None

    block_number = _safe_int(match.group(1), 0)
    if block_number < 1:
        return None

    return block_number


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


def _stored_media_url(media_url: Any) -> Optional[str]:
    value = _safe_str(media_url)
    return value or None


def _media_url_available(media_url: Any) -> bool:
    return bool(_local_upload_exists(media_url))


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except Exception:
        return default


def _clan_public_code(clan: Optional[Clan]) -> Optional[str]:
    if clan is None:
        return None
    saved = _safe_str(getattr(clan, "community_code", None))
    if saved:
        return saved
    clan_id = _safe_int(getattr(clan, "id", None), 0)
    return f"GMFN-C-{clan_id:06d}" if clan_id else None


def _community_code_candidates(value: Any) -> list[str]:
    raw = _safe_str(value).upper()
    if not raw:
        return []
    compact = re.sub(r"\s+", "", raw)
    candidates = {compact}

    for prefix in ("GSN-C-", "GMFM-C-"):
        if compact.startswith(prefix):
            candidates.add(f"GMFN-C-{compact[len(prefix):]}")

    if compact.startswith("GSN-COM-"):
        candidates.add(f"GMFN-COM-{compact[len('GSN-COM-'):]}")

    return sorted(candidates)


def _resolve_repost_target_clan(db: Session, payload: Any) -> Clan:
    target_clan_id = _safe_int(getattr(payload, "target_clan_id", None), 0)
    target_code = _safe_str(getattr(payload, "target_community_code", None))

    if target_clan_id:
        clan = db.query(Clan).filter(Clan.id == target_clan_id).first()
    elif target_code:
        clan = None
        numeric_id = _safe_int(target_code, 0)
        candidates = _community_code_candidates(target_code)
        if candidates:
            clan = (
                db.query(Clan)
                .filter(func.upper(Clan.community_code).in_(candidates))
                .first()
            )
        if clan is None:
            match = re.search(r"(?:GMFN|GMFM|GSN)-C-(\d+)$", target_code.upper().strip())
            if match:
                numeric_id = _safe_int(match.group(1), 0)
        if clan is None and numeric_id:
            clan = db.query(Clan).filter(Clan.id == numeric_id).first()
    else:
        raise HTTPException(
            status_code=400,
            detail="Enter the target community ID for this Network Spotlight placement.",
        )

    if clan is None:
        raise HTTPException(
            status_code=404,
            detail="Target community not found. Use the community ID, for example GSN-C-000008.",
        )

    status = _safe_str(getattr(clan, "status", None)).lower()
    if status and status not in {"active", "open", "approved"}:
        raise HTTPException(
            status_code=400,
            detail="Target community is not open for Network Spotlight placement.",
        )

    return clan


_REPOST_TARGET_STOP_WORDS = {
    "and",
    "are",
    "best",
    "brand",
    "community",
    "delivery",
    "fresh",
    "from",
    "general",
    "good",
    "item",
    "market",
    "marketplace",
    "new",
    "offer",
    "product",
    "products",
    "shop",
    "the",
    "trusted",
    "with",
}


def _repost_target_tokens(*values: Any) -> list[str]:
    seen: set[str] = set()
    tokens: list[str] = []
    for value in values:
        text = _public_product_display_text(value).lower()
        for token in re.findall(r"[a-z0-9]{3,}", text):
            if token in _REPOST_TARGET_STOP_WORDS:
                continue
            if token in seen:
                continue
            seen.add(token)
            tokens.append(token)
    return tokens[:12]


def _match_repost_tokens(tokens: list[str], *values: Any) -> list[str]:
    haystack = " ".join(_safe_str(value).lower() for value in values if value is not None)
    if not haystack or not tokens:
        return []
    return [token for token in tokens if token in haystack]


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
            raise HTTPException(status_code=400, detail="No active community selected")
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
            detail="You are not an active member of this community",
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
            detail="You are not an active member of this community",
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


def _shop_follower_count(db: Session, *, shop_id: int) -> int:
    return (
        db.query(ShopFollower)
        .filter(ShopFollower.shop_id == int(shop_id))
        .count()
    )


def _shop_follower_row(
    db: Session,
    *,
    shop_id: int,
    follower_user_id: int,
) -> Optional[ShopFollower]:
    return (
        db.query(ShopFollower)
        .filter(
            ShopFollower.shop_id == int(shop_id),
            ShopFollower.follower_user_id == int(follower_user_id),
        )
        .first()
    )


def _current_user_can_see_shop(
    db: Session,
    *,
    shop: MarketplaceShop,
    user: User,
) -> bool:
    if _is_admin(user):
        return True

    if int(getattr(shop, "owner_user_id", 0) or 0) == int(user.id):
        return True

    active_clan_ids = _get_active_clan_ids_for_user(db=db, user_id=int(user.id))
    return any(
        _shop_is_visible_in_clan(db, shop=shop, clan_id=int(clan_id))
        for clan_id in active_clan_ids
    )


def _follower_can_receive_shop_notice(
    db: Session,
    *,
    shop: MarketplaceShop,
    follower_user_id: int,
    clan_ids: Optional[list[int]] = None,
) -> bool:
    follower_user_id = int(follower_user_id)
    if follower_user_id == int(getattr(shop, "owner_user_id", 0) or 0):
        return False

    active_clan_ids = _get_active_clan_ids_for_user(db=db, user_id=follower_user_id)
    if not active_clan_ids:
        return False

    active_set = {int(clan_id) for clan_id in active_clan_ids}
    candidate_ids = (
        [int(clan_id) for clan_id in clan_ids if int(clan_id) in active_set]
        if clan_ids is not None
        else active_clan_ids
    )

    return any(
        _shop_is_visible_in_clan(db, shop=shop, clan_id=int(clan_id))
        for clan_id in candidate_ids
    )


def _shop_public_action_url(
    db: Session,
    *,
    shop: MarketplaceShop,
    clan_id: Optional[int] = None,
    product_id: Optional[int] = None,
    broadcast_id: Optional[int] = None,
) -> str:
    owner = db.query(User).filter(User.id == int(shop.owner_user_id)).first()
    gmfn_id = _safe_str(getattr(owner, "gmfn_id", None))
    path = f"/shop/{gmfn_id}" if gmfn_id else "/app/shop"

    params: list[str] = []
    if clan_id is not None and int(clan_id) > 0:
        params.append(f"clan_id={int(clan_id)}")
    if product_id is not None and int(product_id) > 0:
        params.append(f"product_id={int(product_id)}")
    if broadcast_id is not None and int(broadcast_id) > 0:
        params.append(f"broadcast_id={int(broadcast_id)}")

    return f"{path}?{'&'.join(params)}" if params else path


def _shop_notice_already_exists(
    db: Session,
    *,
    user_id: int,
    kind: str,
    action_url: str,
) -> bool:
    return (
        db.query(Notification.id)
        .filter(
            Notification.user_id == int(user_id),
            Notification.kind == kind,
            Notification.action_url == action_url,
        )
        .first()
        is not None
    )


def _notify_shop_followers(
    db: Session,
    *,
    shop: MarketplaceShop,
    kind: str,
    title: str,
    message: str,
    action_url: str,
    clan_ids: Optional[list[int]] = None,
) -> int:
    follower_rows = (
        db.query(ShopFollower)
        .filter(ShopFollower.shop_id == int(shop.id))
        .order_by(ShopFollower.created_at.asc(), ShopFollower.id.asc())
        .all()
    )

    created = 0
    seen_user_ids: set[int] = set()
    for follower in follower_rows:
        follower_user_id = int(follower.follower_user_id)
        if follower_user_id in seen_user_ids:
            continue
        seen_user_ids.add(follower_user_id)

        if not _follower_can_receive_shop_notice(
            db,
            shop=shop,
            follower_user_id=follower_user_id,
            clan_ids=clan_ids,
        ):
            continue

        if _shop_notice_already_exists(
            db,
            user_id=follower_user_id,
            kind=kind,
            action_url=action_url,
        ):
            continue

        create_notification(
            db,
            user_id=follower_user_id,
            kind=kind,
            title=title,
            message=message,
            action_url=action_url,
            action_label="Open shop",
            commit=False,
            refresh=False,
        )
        created += 1

    return created


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


_DEFAULT_PUBLIC_SHOP_NAMES = {
    "",
    "my gsn shop",
    "my gmfn shop",
    "public gsn shop",
    "gsn public shop",
    "public shop",
}


def _is_default_public_shop_name(value: Any) -> bool:
    return _safe_str(value).lower() in _DEFAULT_PUBLIC_SHOP_NAMES


def _public_shop_product_count(
    db: Session,
    *,
    shop_id: int,
    owner_user_id: int,
) -> int:
    return (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.shop_id == int(shop_id))
        .filter(MarketplaceProduct.seller_user_id == int(owner_user_id))
        .filter(MarketplaceProduct.is_active.is_(True))
        .filter(
            MarketplaceProduct.visibility_mode.in_(
                [VISIBILITY_COMMUNITY, "public", "community"]
            )
        )
        .count()
    )


def _get_public_shop_identity_by_owner(
    db: Session,
    *,
    owner_user_id: int,
) -> Optional[MarketplaceShop]:
    shops = (
        db.query(MarketplaceShop)
        .filter(
            MarketplaceShop.owner_user_id == int(owner_user_id),
            MarketplaceShop.is_active.is_(True),
        )
        .order_by(MarketplaceShop.created_at.asc(), MarketplaceShop.id.asc())
        .all()
    )
    if not shops:
        return None

    def rank(shop: MarketplaceShop) -> tuple[int, int, int, float, int]:
        has_real_name = 0 if _is_default_public_shop_name(getattr(shop, "name", None)) else 1
        public_count = _public_shop_product_count(
            db,
            shop_id=int(shop.id),
            owner_user_id=int(owner_user_id),
        )
        has_image = 1 if _safe_str(_get_shop_image_value(shop)) else 0
        created_at = getattr(shop, "created_at", None)
        created_ts = created_at.timestamp() if hasattr(created_at, "timestamp") else 0.0
        return (
            has_real_name,
            public_count,
            has_image,
            created_ts,
            int(getattr(shop, "id", 0) or 0),
        )

    return max(shops, key=rank)


def _get_user_by_identity_key(
    db: Session,
    *,
    identity_key: str,
) -> Optional[User]:
    raw = _safe_str(identity_key)
    if not raw:
        return None

    identity_candidates = [raw]
    upper_raw = raw.upper()
    if upper_raw.startswith("GSN-U-"):
        identity_candidates.append(f"GMFN-U-{raw[6:]}")
    elif upper_raw.startswith("GMFN-U-"):
        identity_candidates.append(f"GSN-U-{raw[7:]}")

    seen_candidates = set()
    for candidate in identity_candidates:
        normalized_candidate = _safe_str(candidate)
        if not normalized_candidate:
            continue
        candidate_key = normalized_candidate.upper()
        if candidate_key in seen_candidates:
            continue
        seen_candidates.add(candidate_key)
        user = (
            db.query(User)
            .filter(func.upper(User.gmfn_id) == candidate_key)
            .first()
        )
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
            MarketplaceBroadcast.priority_mode != SPOTLIGHT_PAID,
            (MarketplaceBroadcast.expires_at.is_(None))
            | (MarketplaceBroadcast.expires_at > current_time),
        )
        .count()
    )


def _free_spotlight_day_bounds(now: Optional[datetime] = None) -> tuple[datetime, datetime]:
    current_time = now or _now_utc()
    if current_time.tzinfo is None:
        current_time = current_time.replace(tzinfo=timezone.utc)
    else:
        current_time = current_time.astimezone(timezone.utc)
    start = current_time.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1)


def _count_free_spotlight_runs_for_author_today(
    *,
    db: Session,
    author_user_id: int,
    now: Optional[datetime] = None,
) -> int:
    start, end = _free_spotlight_day_bounds(now)
    return (
        db.query(MarketplaceBroadcast)
        .filter(MarketplaceBroadcast.author_user_id == int(author_user_id))
        .filter(MarketplaceBroadcast.priority_mode != SPOTLIGHT_PAID)
        .filter(MarketplaceBroadcast.created_at >= start)
        .filter(MarketplaceBroadcast.created_at < end)
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
        .filter(MarketplaceBroadcast.visibility_scope != "marketplace_repost")
        .filter(
            (MarketplaceBroadcast.expires_at.is_(None))
            | (MarketplaceBroadcast.expires_at > current_time),
        )
        .count()
    )


def _active_spotlight_rows_for_clan_ids(
    *,
    db: Session,
    clan_ids: list[int],
    limit: int,
    now: Optional[datetime] = None,
) -> list[MarketplaceBroadcast]:
    current_time = now or _now_utc()
    clean_clan_ids: list[int] = []
    seen: set[int] = set()
    for clan_id in clan_ids:
        safe_clan_id = int(clan_id or 0)
        if safe_clan_id <= 0 or safe_clan_id in seen:
            continue
        clean_clan_ids.append(safe_clan_id)
        seen.add(safe_clan_id)

    if not clean_clan_ids:
        return []

    priority_rank = case(
        (MarketplaceBroadcast.priority_mode == SPOTLIGHT_PAID, 1),
        else_=0,
    )

    return (
        db.query(MarketplaceBroadcast)
        .filter(MarketplaceBroadcast.clan_id.in_(clean_clan_ids))
        .filter(
            (MarketplaceBroadcast.expires_at.is_(None))
            | (MarketplaceBroadcast.expires_at > current_time)
        )
        .order_by(
            priority_rank.desc(),
            MarketplaceBroadcast.created_at.desc(),
            MarketplaceBroadcast.id.desc(),
        )
        .limit(int(limit))
        .all()
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


def _provided_model_fields(payload: Any) -> set[str]:
    fields = getattr(payload, "model_fields_set", None)
    if fields is None:
        fields = getattr(payload, "__fields_set__", set())
    return set(fields or set())


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
    visibility_modes = (
        [VISIBILITY_COMMUNITY, "public", "community"]
        if str(visibility_mode) == VISIBILITY_COMMUNITY
        else [str(visibility_mode)]
    )
    q = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.shop_id == int(shop_id))
        .filter(MarketplaceProduct.is_active.is_(True))
        .filter(MarketplaceProduct.visibility_mode.in_(visibility_modes))
    )

    if exclude_product_id is not None:
        q = q.filter(MarketplaceProduct.id != int(exclude_product_id))

    return q.count()


def _product_newest_rank(product: MarketplaceProduct) -> tuple[datetime, int]:
    created_at = getattr(product, "created_at", None)
    if isinstance(created_at, datetime):
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
    else:
        created_at = datetime.min.replace(tzinfo=timezone.utc)

    return (created_at, int(getattr(product, "id", 0) or 0))


def _display_public_block_assignments(
    items: list[MarketplaceProduct],
) -> dict[int, MarketplaceProduct]:
    explicit: dict[int, MarketplaceProduct] = {}
    overflow: list[MarketplaceProduct] = []

    for product in items:
        block_number = _public_product_block_number(
            getattr(product, "description", None)
        )
        if block_number is not None:
            current = explicit.get(int(block_number))
            if current is None or _product_newest_rank(product) > _product_newest_rank(current):
                explicit[int(block_number)] = product
            continue

        overflow.append(product)

    assignments = dict(explicit)
    for product in sorted(overflow, key=_product_newest_rank, reverse=True):
        for block_number in range(1, FREE_COMMUNITY_PRODUCT_SLOTS + 1):
            if block_number not in assignments:
                assignments[block_number] = product
                break

    return assignments


def _active_public_products_for_block(
    db: Session,
    *,
    shop_id: int,
    block_number: int,
    exclude_product_id: Optional[int] = None,
) -> list[MarketplaceProduct]:
    if int(block_number or 0) < 1:
        return []

    q = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.shop_id == int(shop_id))
        .filter(MarketplaceProduct.is_active.is_(True))
        .filter(MarketplaceProduct.visibility_mode.in_([VISIBILITY_COMMUNITY, "public", "community"]))
    )

    if exclude_product_id is not None:
        q = q.filter(MarketplaceProduct.id != int(exclude_product_id))

    products = q.all()
    explicit_matches = [
        product
        for product in products
        if _public_product_block_number(getattr(product, "description", None)) == int(block_number)
    ]
    assigned_product = _display_public_block_assignments(products).get(int(block_number))
    if assigned_product is None:
        return explicit_matches

    assigned_id = int(getattr(assigned_product, "id", 0) or 0)
    if any(int(getattr(product, "id", 0) or 0) == assigned_id for product in explicit_matches):
        return explicit_matches

    return [*explicit_matches, assigned_product]


def _retire_replaced_public_block_products(
    db: Session,
    *,
    shop_id: int,
    block_number: int,
    keep_product_id: int,
) -> tuple[int, int]:
    retired_products = 0
    removed_reposts = 0
    for product in _active_public_products_for_block(
        db,
        shop_id=int(shop_id),
        block_number=int(block_number),
        exclude_product_id=int(keep_product_id),
    ):
        product.is_active = False
        db.add(product)
        retired_products += 1
        removed_reposts += _remove_product_reposts(db, product_id=int(product.id))

    return retired_products, removed_reposts


def _dedupe_active_public_block_products(
    items: list[MarketplaceProduct],
) -> list[MarketplaceProduct]:
    newest_by_block: dict[tuple[int, int], MarketplaceProduct] = {}
    visible: list[MarketplaceProduct] = []

    for product in items:
        visibility_mode = _safe_str(
            getattr(product, "visibility_mode", None),
            VISIBILITY_COMMUNITY,
        )
        block_number = _public_product_block_number(
            getattr(product, "description", None)
        )
        is_public_block = (
            bool(getattr(product, "is_active", True))
            and visibility_mode in {VISIBILITY_COMMUNITY, "public", "community"}
            and block_number is not None
        )
        if is_public_block:
            key = (int(getattr(product, "shop_id", 0) or 0), int(block_number))
            current_best = newest_by_block.get(key)
            if current_best is None:
                newest_by_block[key] = product
                continue

            if _product_newest_rank(product) > _product_newest_rank(current_best):
                newest_by_block[key] = product

    for product in items:
        visibility_mode = _safe_str(
            getattr(product, "visibility_mode", None),
            VISIBILITY_COMMUNITY,
        )
        block_number = _public_product_block_number(
            getattr(product, "description", None)
        )
        is_public_block = (
            bool(getattr(product, "is_active", True))
            and visibility_mode in {VISIBILITY_COMMUNITY, "public", "community"}
            and block_number is not None
        )
        if is_public_block:
            key = (int(getattr(product, "shop_id", 0) or 0), int(block_number))
            chosen = newest_by_block.get(key)
            if chosen is None or int(getattr(chosen, "id", 0) or 0) != int(product.id):
                continue

        visible.append(product)

    return visible


def _shop_public_product_slots_total(
    db: Session,
    *,
    shop: Optional[MarketplaceShop],
) -> int:
    if shop is None:
        return FREE_COMMUNITY_PRODUCT_SLOTS

    now = _now_utc()
    shop_scoped_extra_slots = (
        db.query(
            func.coalesce(
                func.sum(
                    case(
                        (
                            FeatureEntitlement.quantity_total > FeatureEntitlement.quantity_used,
                            FeatureEntitlement.quantity_total - FeatureEntitlement.quantity_used,
                        ),
                        else_=0,
                    )
                ),
                0,
            )
        )
        .filter(
            FeatureEntitlement.shop_id == int(shop.id),
            FeatureEntitlement.feature_code == FEATURE_EXTRA_SHOP_BLOCK,
            FeatureEntitlement.status == "active",
            FeatureEntitlement.revoked_at.is_(None),
            FeatureEntitlement.starts_at <= now,
            (FeatureEntitlement.expires_at.is_(None) | (FeatureEntitlement.expires_at >= now)),
        )
        .scalar()
    )
    if int(shop_scoped_extra_slots or 0) > 0:
        return FREE_COMMUNITY_PRODUCT_SLOTS + int(shop_scoped_extra_slots or 0)

    extra_slots = get_active_feature_quantity(
        db,
        owner_user_id=int(shop.owner_user_id),
        feature_code=FEATURE_EXTRA_SHOP_BLOCK,
        shop_id=int(shop.id),
    )
    return FREE_COMMUNITY_PRODUCT_SLOTS + max(0, int(extra_slots or 0))


def _public_product_capacity_detail(limit: int) -> str:
    return (
        f"Maximum of {int(limit)} community-visible products allowed per shop. "
        "Buy extra shop blocks from Shop Control to add more."
    )


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
    target_clan_id: Optional[int] = Field(default=None, gt=0)
    target_community_code: Optional[str] = Field(default=None, max_length=64)
    duration_days: Optional[int] = Field(default=1, ge=1, le=365)


def _shop_out(db: Session, shop: MarketplaceShop) -> Dict[str, Any]:
    owner = db.query(User).filter(User.id == int(shop.owner_user_id)).first()
    clan = db.query(Clan).filter(Clan.id == int(shop.clan_id)).first()

    owner_gmfn_id = _safe_str(getattr(owner, "gmfn_id", None)) or None
    owner_display_name = _public_identity_name(
        getattr(owner, "display_name", None),
        getattr(owner, "nickname", None),
        fallback="GSN member",
    )
    shop_display_name = _public_identity_name(
        getattr(shop, "name", None),
        fallback="Public GSN Shop",
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
    public_slots_total = _shop_public_product_slots_total(db, shop=shop)
    follower_count = _shop_follower_count(db, shop_id=int(shop.id))

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
        "name": shop_display_name,
        "shop_name": shop_display_name,
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
        "shop_product_slots_free": FREE_COMMUNITY_PRODUCT_SLOTS,
        "shop_product_slots_extra": max(0, public_slots_total - FREE_COMMUNITY_PRODUCT_SLOTS),
        "shop_product_slots_total": public_slots_total,
        "follower_count": follower_count,
        "followers_count": follower_count,
        "shop_follower_count": follower_count,
    }


def _product_out(
    db: Session,
    product: MarketplaceProduct,
    *,
    display_block_number: Optional[int] = None,
) -> Dict[str, Any]:
    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(product.shop_id))
        .first()
    )
    seller = db.query(User).filter(User.id == int(product.seller_user_id)).first()
    repost_count = _get_repost_count(db, product_id=int(product.id))
    remaining_slots = _remaining_distribution_slots(db, product_id=int(product.id))
    public_slots_total = _shop_public_product_slots_total(db, shop=shop)
    visibility_mode = _safe_str(
        getattr(product, "visibility_mode", None),
        VISIBILITY_COMMUNITY,
    )
    image_url = _stored_media_url(getattr(product, "image_url", None))
    video_url = _stored_media_url(getattr(product, "video_url", None))
    public_block_number = _public_product_block_number(
        getattr(product, "description", None)
    )
    display_block = (
        int(display_block_number)
        if display_block_number is not None and int(display_block_number) >= 1
        else None
    )
    output_block_number = public_block_number if public_block_number is not None else display_block
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
        "image_url_available": _media_url_available(image_url),
        "video_url_available": _media_url_available(video_url),
        "visibility_mode": visibility_mode,
        "public_block_number": output_block_number,
        "slot_number": output_block_number,
        "display_block_number": output_block_number,
        "metadata_block_number": public_block_number,
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
        "origin_shop_name": (
            _public_identity_name(getattr(shop, "name", None), fallback="")
            if shop
            else None
        ),
        "distribution_slots_total": TOTAL_DISTRIBUTION_SLOTS,
        "distribution_slots_reserved_for_origin_spotlight": ORIGIN_SPOTLIGHT_RESERVED_SLOTS,
        "reposts_used": repost_count,
        "distribution_slots_remaining": remaining_slots,
        "shop_product_slots_free": FREE_COMMUNITY_PRODUCT_SLOTS,
        "shop_product_slots_extra": max(0, public_slots_total - FREE_COMMUNITY_PRODUCT_SLOTS),
        "shop_product_slots_total": public_slots_total,
    }


def _products_out(
    db: Session,
    products: list[MarketplaceProduct],
    *,
    assignment_products: Optional[list[MarketplaceProduct]] = None,
) -> list[Dict[str, Any]]:
    assignments = _display_public_block_assignments(
        [
            product
            for product in (assignment_products or products)
            if bool(getattr(product, "is_active", True))
            and _safe_str(
                getattr(product, "visibility_mode", None),
                VISIBILITY_COMMUNITY,
            )
            in {VISIBILITY_COMMUNITY, "public", "community"}
        ]
    )
    display_blocks_by_product_id = {
        int(getattr(product, "id", 0) or 0): int(block_number)
        for block_number, product in assignments.items()
    }

    return [
        _product_out(
            db,
            product,
            display_block_number=display_blocks_by_product_id.get(
                int(getattr(product, "id", 0) or 0)
            ),
        )
        for product in products
    ]


def _broadcast_repost_product(db: Session, item: MarketplaceBroadcast) -> Optional[MarketplaceProduct]:
    if _safe_str(getattr(item, "visibility_scope", None)) != "marketplace_repost":
        return None

    repost_query = (
        db.query(MarketplaceProductRepost)
        .filter(
            MarketplaceProductRepost.target_clan_id == int(item.clan_id),
            MarketplaceProductRepost.reposted_by_user_id == int(item.author_user_id),
        )
        .order_by(
            MarketplaceProductRepost.created_at.desc(),
            MarketplaceProductRepost.id.desc(),
        )
    )

    if getattr(item, "created_at", None) is not None:
        exact = repost_query.filter(
            MarketplaceProductRepost.created_at == item.created_at
        ).first()
        if exact:
            return (
                db.query(MarketplaceProduct)
                .filter(MarketplaceProduct.id == int(exact.original_product_id))
                .first()
            )

    for repost in repost_query.limit(12).all():
        product = (
            db.query(MarketplaceProduct)
            .filter(MarketplaceProduct.id == int(repost.original_product_id))
            .first()
        )
        if product and int(getattr(product, "shop_id", 0) or 0) == int(getattr(item, "shop_id", 0) or 0):
            return product

    return None


def _spotlight_message_parts(message: Any) -> Dict[str, Optional[str]]:
    raw = _safe_str(message)
    if not raw:
        return {
            "title": None,
            "description": None,
            "price_note": None,
            "availability": None,
        }

    parts = [part.strip() for part in raw.split(" - ") if part.strip()]
    title = parts[0] if parts else raw
    price_note = parts[1] if len(parts) >= 2 else None
    description = " - ".join(parts[2:]) if len(parts) >= 3 else (parts[1] if len(parts) == 2 else None)

    availability = None
    for part in parts[1:]:
        lowered = part.lower()
        if any(token in lowered for token in ("available", "today", "delivery", "order", "stock")):
            availability = part
            break

    return {
        "title": title or None,
        "description": description or raw,
        "price_note": price_note,
        "availability": availability,
    }


def _spotlight_availability_label(expires_at: Optional[datetime]) -> str:
    if expires_at is None:
        return "Active"

    expiry = expires_at
    now = _now_utc()
    if expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    return "Active" if expiry > now else "Expired"


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
        author_name = _public_identity_name(
            getattr(author, "display_name", None),
            getattr(author, "nickname", None),
            fallback="GSN member",
        )

    clan_display_name = None
    if clan:
        clan_display_name = (
            _safe_str(getattr(clan, "marketplace_name", None))
            or _safe_str(getattr(clan, "name", None))
            or f"Community {int(clan.id)}"
        )

    shop_display_name = None
    if canonical_shop:
        shop_display_name = _public_identity_name(
            getattr(canonical_shop, "name", None),
            author_name,
            fallback="Community seller",
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

    repost_product = _broadcast_repost_product(db, item)
    repost_block_number = (
        _public_product_block_number(getattr(repost_product, "description", None))
        if repost_product is not None
        else None
    )
    message_parts = _spotlight_message_parts(getattr(item, "message", None))
    source_product_title = (
        _safe_str(getattr(repost_product, "name", None))
        if repost_product is not None
        else message_parts["title"]
    )
    source_product_description = (
        _public_product_display_text(getattr(repost_product, "description", None))
        if repost_product is not None
        else message_parts["description"]
    )
    source_product_price = (
        _safe_str(getattr(repost_product, "price", None))
        if repost_product is not None
        else message_parts["price_note"]
    )
    source_product_currency = (
        _safe_str(getattr(repost_product, "currency", None))
        if repost_product is not None
        else None
    )
    source_product_image_url = (
        _stored_media_url(getattr(repost_product, "image_url", None))
        if repost_product is not None
        else _stored_media_url(getattr(item, "image_url", None))
    )
    source_product_video_url = (
        _stored_media_url(getattr(repost_product, "video_url", None))
        if repost_product is not None
        else _stored_media_url(getattr(item, "video_url", None))
    )
    source_product_category = (
        "Shop item" if repost_product is not None else "Spotlight update"
    )
    source_product_availability = _spotlight_availability_label(
        getattr(item, "expires_at", None)
    )
    if message_parts["availability"]:
        source_product_availability = message_parts["availability"]

    return {
        "id": int(item.id),
        "clan_id": int(item.clan_id),
        "author_user_id": int(item.author_user_id),
        "author_gmfn_id": author_gmfn_id,
        "shop_id": int(item.shop_id) if getattr(item, "shop_id", None) is not None else None,
        "message": item.message,
        "image_url": _stored_media_url(getattr(item, "image_url", None)),
        "video_url": _stored_media_url(getattr(item, "video_url", None)),
        "image_url_available": _media_url_available(getattr(item, "image_url", None)),
        "video_url_available": _media_url_available(getattr(item, "video_url", None)),
        "priority_mode": _safe_str(getattr(item, "priority_mode", None), SPOTLIGHT_FREE),
        "visibility_scope": _safe_str(
            getattr(item, "visibility_scope", None),
            "direct_communities",
        ),
        "expires_at": item.expires_at.isoformat() if item.expires_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "author_name": author_name,
        "source_shop_name": shop_display_name,
        "source_shop_whatsapp_number": (
            _safe_str(getattr(canonical_shop, "whatsapp_number", None)) or None
            if canonical_shop
            else None
        ),
        "source_clan_name": clan_display_name,
        "source_product_id": int(repost_product.id) if repost_product is not None else None,
        "source_product_block": repost_block_number,
        "source_product_slot_number": repost_block_number,
        "source_product_title": source_product_title or None,
        "source_product_description": source_product_description or None,
        "source_product_price": source_product_price or None,
        "source_product_currency": source_product_currency or None,
        "source_product_category": source_product_category,
        "source_product_availability": source_product_availability,
        "source_product_image_url": source_product_image_url or None,
        "source_product_video_url": source_product_video_url or None,
        "spotlight_title": source_product_title or shop_display_name or author_name,
        "spotlight_description": source_product_description or _safe_str(item.message) or None,
        "spotlight_owner": shop_display_name or author_name,
        "spotlight_community": clan_display_name,
        "spotlight_contact_available": bool(
            canonical_shop and _safe_str(getattr(canonical_shop, "whatsapp_number", None))
        ),
        "spotlight_detail_available": bool(author_gmfn_id),
        "trust_band": trust_band,
        "trust_score": trust_score,
    }


def _public_shop_verification_out(
    *,
    shop: MarketplaceShop,
    owner: User,
    effective_clan: Optional[Clan],
    effective_clan_id: int,
) -> Dict[str, Any]:
    owner_gmfn_id = _safe_str(getattr(owner, "gmfn_id", None))
    shop_path = (
        f"/shop/{owner_gmfn_id}"
        if owner_gmfn_id
        else f"/shop/{int(getattr(owner, 'id', 0) or 0)}"
    )
    community_name = (
        _safe_str(getattr(effective_clan, "marketplace_name", None))
        or _safe_str(getattr(effective_clan, "name", None))
        or None
    )
    has_community = int(effective_clan_id or 0) > 0

    return {
        "status": "community_record_ready" if has_community else "trust_evidence_on_request",
        "scan_kind": "community" if has_community else "shop",
        "primary_scan_path": (
            f"/verify/community/{int(effective_clan_id)}" if has_community else shop_path
        ),
        "community_verify_path": (
            f"/verify/community/{int(effective_clan_id)}" if has_community else None
        ),
        "public_shop_path": shop_path,
        "community_confirmation_mode": "owner_mediated",
        "trustslip_available": False,
        "trustslip_request_required": True,
        "community_id": int(effective_clan_id) if has_community else None,
        "community_name": community_name,
        "shop_owner_id": owner_gmfn_id or str(getattr(owner, "id", "")),
        "shop_name": _public_identity_name(
            getattr(shop, "name", None),
            fallback="Public GSN Shop",
        ),
        "plain_language": (
            "This shop has a public community record. Ask the owner for current TrustSlip evidence when you need a fresh check."
            if has_community
            else "This shop can be reopened by QR. Ask the owner for TrustSlip or community confirmation before trading."
        ),
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


def _owner_public_shop_payload(
    db: Session,
    *,
    owner: User,
    requested_clan_id: int,
    current_user: Optional[User] = None,
    product_limit: int = 300,
) -> Dict[str, Any]:
    shop = _get_public_shop_identity_by_owner(
        db,
        owner_user_id=int(owner.id),
    )
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    active_owner_shops = (
        db.query(MarketplaceShop)
        .filter(
            MarketplaceShop.owner_user_id == int(owner.id),
            MarketplaceShop.is_active.is_(True),
        )
        .order_by(MarketplaceShop.created_at.asc(), MarketplaceShop.id.asc())
        .all()
    )
    active_owner_shop_ids = [int(row.id) for row in active_owner_shops]
    if not active_owner_shop_ids:
        raise HTTPException(status_code=404, detail="Shop not found")

    resolved_clan_id = int(requested_clan_id)
    owner_is_current_user = (
        current_user is not None and int(owner.id) == int(current_user.id)
    )
    if owner_is_current_user and not _shop_is_visible_in_clan(
        db,
        shop=shop,
        clan_id=resolved_clan_id,
    ):
        shop_clan_id = int(getattr(shop, "clan_id", 0) or 0)
        if shop_clan_id > 0:
            resolved_clan_id = shop_clan_id

    if not _shop_is_visible_in_clan(db, shop=shop, clan_id=resolved_clan_id):
        raise HTTPException(
            status_code=404,
            detail="Shop is not visible in the selected community",
        )

    product_query = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.shop_id.in_(active_owner_shop_ids))
        .filter(MarketplaceProduct.seller_user_id == int(owner.id))
        .filter(MarketplaceProduct.is_active.is_(True))
        .filter(
            MarketplaceProduct.visibility_mode.in_(
                [VISIBILITY_COMMUNITY, "public", "community"]
            )
        )
        .order_by(MarketplaceProduct.created_at.desc(), MarketplaceProduct.id.desc())
    )
    product_context_rows = product_query.limit(300).all()
    product_rows = _dedupe_active_public_block_products(product_context_rows)[: int(product_limit)]

    return {
        "ok": True,
        "item": _shop_out(db, shop),
        "products": _products_out(
            db,
            product_rows,
            assignment_products=product_context_rows,
        ),
        "gmfn_id": _safe_str(getattr(owner, "gmfn_id", None)) or None,
        "clan_id": resolved_clan_id,
    }


@router.get("/shops/me")
def get_my_marketplace_shop(
    clan_id: Optional[int] = Query(default=None),
    product_limit: int = Query(default=300, ge=1, le=300),
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

    return _owner_public_shop_payload(
        db,
        owner=current_user,
        requested_clan_id=requested_clan_id,
        current_user=current_user,
        product_limit=product_limit,
    )


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

    payload = _owner_public_shop_payload(
        db,
        owner=owner,
        requested_clan_id=requested_clan_id,
        current_user=current_user,
    )
    payload["gmfn_id"] = _safe_str(getattr(owner, "gmfn_id", None)) or gmfn_id
    return payload



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

    shop = _get_public_shop_identity_by_owner(
        db,
        owner_user_id=int(owner.id),
    )
    if not shop or not bool(getattr(shop, "is_active", True)):
        raise HTTPException(status_code=404, detail="Shop not found")

    active_owner_shops = (
        db.query(MarketplaceShop)
        .filter(
            MarketplaceShop.owner_user_id == int(owner.id),
            MarketplaceShop.is_active.is_(True),
        )
        .order_by(MarketplaceShop.created_at.asc(), MarketplaceShop.id.asc())
        .all()
    )
    active_owner_shop_ids = [int(row.id) for row in active_owner_shops]
    active_owner_clan_ids = [
        int(getattr(row, "clan_id", 0) or 0)
        for row in active_owner_shops
        if int(getattr(row, "clan_id", 0) or 0) > 0
    ]
    if not active_owner_shop_ids:
        raise HTTPException(status_code=404, detail="Shop not found")

    requested_clan_id = _safe_int(clan_id, 0)
    requested_product_id = _safe_int(product_id, 0)
    requested_product = None
    if requested_product_id > 0:
        requested_product = (
            db.query(MarketplaceProduct)
            .filter(MarketplaceProduct.id == int(requested_product_id))
            .filter(MarketplaceProduct.shop_id.in_(active_owner_shop_ids))
            .filter(MarketplaceProduct.seller_user_id == int(owner.id))
            .filter(MarketplaceProduct.is_active.is_(True))
            .filter(
                MarketplaceProduct.visibility_mode.in_(
                    [VISIBILITY_COMMUNITY, "public", "community"]
                )
            )
            .first()
        )
        if requested_product is not None:
            requested_shop_id = int(getattr(requested_product, "shop_id", 0) or 0)
            product_shop = next(
                (row for row in active_owner_shops if int(row.id) == requested_shop_id),
                None,
            )
            if product_shop is not None:
                shop = product_shop

    if requested_product is None and requested_clan_id > 0:
        clan_shop = next(
            (
                row
                for row in active_owner_shops
                if int(getattr(row, "clan_id", 0) or 0) == requested_clan_id
            ),
            None,
        )
        if clan_shop is not None:
            shop = clan_shop

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

    effective_clan = requested_clan
    if effective_clan is None:
        home_clan_id = requested_clan_id or _safe_int(getattr(shop, "clan_id", None), 0)
        effective_clan_id = int(home_clan_id or 0)
    else:
        effective_clan_id = int(requested_clan_id)
    if effective_clan is None and effective_clan_id > 0:
        effective_clan = (
            db.query(Clan)
            .filter(Clan.id == int(effective_clan_id))
            .first()
        )

    product_query = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.shop_id.in_(active_owner_shop_ids))
        .filter(MarketplaceProduct.seller_user_id == int(owner.id))
        .filter(MarketplaceProduct.is_active.is_(True))
        .filter(
            MarketplaceProduct.visibility_mode.in_(
                [VISIBILITY_COMMUNITY, "public", "community"]
            )
        )
    )

    product_context_rows = (
        product_query.order_by(
            MarketplaceProduct.created_at.desc(),
            MarketplaceProduct.id.desc(),
        )
        .limit(300)
        .all()
    )
    product_rows = product_context_rows[: int(product_limit)]

    if requested_product is None and requested_product_id > 0 and all(
        int(getattr(row, "id", 0) or 0) != requested_product_id
        for row in product_rows
    ):
        requested_product = (
            db.query(MarketplaceProduct)
            .filter(MarketplaceProduct.id == int(requested_product_id))
            .filter(MarketplaceProduct.shop_id.in_(active_owner_shop_ids))
            .filter(MarketplaceProduct.seller_user_id == int(owner.id))
            .filter(MarketplaceProduct.is_active.is_(True))
            .filter(
                MarketplaceProduct.visibility_mode.in_(
                    [VISIBILITY_COMMUNITY, "public", "community"]
                )
            )
            .first()
        )

    if requested_product is not None and all(
        int(getattr(row, "id", 0) or 0) != requested_product_id
        for row in product_rows
    ):
        product_rows = [requested_product, *product_rows]
    product_rows = _dedupe_active_public_block_products(product_rows)[: int(product_limit)]

    spotlight_clan_ids = (
        [int(effective_clan_id)]
        if int(effective_clan_id or 0) > 0
        else active_owner_clan_ids
    )
    broadcast_rows = _active_spotlight_rows_for_clan_ids(
        db=db,
        clan_ids=spotlight_clan_ids,
        limit=int(broadcast_limit),
    )

    return {
        "ok": True,
        "item": _shop_out(db, shop),
        "products": _products_out(
            db,
            product_rows,
            assignment_products=product_context_rows,
        ),
        "broadcasts": [_broadcast_out(db, row) for row in broadcast_rows],
        "primary_broadcast": _broadcast_out(db, broadcast_rows[0]) if broadcast_rows else None,
        "spotlight_scope": "community",
        "spotlight_clan_ids": [int(clan_id) for clan_id in spotlight_clan_ids],
        "gmfn_id": _safe_str(getattr(owner, "gmfn_id", None)) or gmfn_id,
        "clan_id": int(effective_clan_id) if int(effective_clan_id or 0) > 0 else None,
        "community_name": (
            _safe_str(getattr(effective_clan, "marketplace_name", None))
            or _safe_str(getattr(effective_clan, "name", None))
            or None
        ),
        "verification": _public_shop_verification_out(
            shop=shop,
            owner=owner,
            effective_clan=effective_clan,
            effective_clan_id=int(effective_clan_id or 0),
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

    existing_shop = _get_public_shop_identity_by_owner(
        db,
        owner_user_id=int(current_user.id),
    )

    if existing_shop:
        changed = False

        incoming_name = _safe_str(payload.name)
        if incoming_name and existing_shop.name != incoming_name:
            if not (
                _is_default_public_shop_name(incoming_name)
                and not _is_default_public_shop_name(existing_shop.name)
            ):
                existing_shop.name = incoming_name
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

    dormant_shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.owner_user_id == int(current_user.id))
        .order_by(MarketplaceShop.created_at.asc(), MarketplaceShop.id.asc())
        .first()
    )
    if dormant_shop:
        dormant_shop.is_active = True
        dormant_shop.clan_id = int(resolved_clan_id)

        if _safe_str(payload.name):
            dormant_shop.name = _safe_str(payload.name)

        if payload.description is not None:
            dormant_shop.description = _safe_str(payload.description) or None

        if payload.whatsapp_number is not None:
            dormant_shop.whatsapp_number = _safe_str(payload.whatsapp_number) or None

        if payload.telegram_handle is not None:
            dormant_shop.telegram_handle = _safe_str(payload.telegram_handle) or None

        if payload.image_url is not None:
            _set_shop_image_value(
                dormant_shop,
                _safe_str(payload.image_url) or None,
            )

        db.add(dormant_shop)
        db.commit()
        db.refresh(dormant_shop)

        log_trust_event(
            db,
            event_type="marketplace.shop.updated",
            clan_id=resolved_clan_id,
            actor_user_id=int(current_user.id),
            subject_user_id=int(current_user.id),
            loan_id=None,
            guarantor_id=None,
            meta={
                "shop_id": int(dormant_shop.id),
                "shop_name": getattr(dormant_shop, "name", None),
                "reason": "marketplace_shop_reactivated_via_public_link_refresh",
            },
            commit=False,
            refresh=False,
        )
        db.commit()

        return {
            "ok": True,
            "item": _shop_out(db, dormant_shop),
            "detail": "Existing canonical shop reactivated.",
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

    provided = _provided_model_fields(payload)
    changed = False

    if "name" in provided and payload.name is not None:
        new_name = _safe_str(payload.name)
        if not new_name:
            raise HTTPException(status_code=400, detail="Shop name cannot be empty")
        if shop.name != new_name:
            if not (
                _is_default_public_shop_name(new_name)
                and not _is_default_public_shop_name(shop.name)
            ):
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


@router.post("/shops/{shop_id}/follow")
def follow_marketplace_shop(
    shop_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    shop = (
        db.query(MarketplaceShop)
        .filter(
            MarketplaceShop.id == int(shop_id),
            MarketplaceShop.is_active.is_(True),
        )
        .first()
    )
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    if int(getattr(shop, "owner_user_id", 0) or 0) == int(current_user.id):
        raise HTTPException(status_code=400, detail="Shop owners cannot follow their own shop")

    if not _current_user_can_see_shop(db=db, shop=shop, user=current_user):
        raise HTTPException(status_code=403, detail="This shop is not visible to this account")

    existing = _shop_follower_row(
        db,
        shop_id=int(shop.id),
        follower_user_id=int(current_user.id),
    )
    if existing:
        follower_count = _shop_follower_count(db, shop_id=int(shop.id))
        return {
            "ok": True,
            "shop_id": int(shop.id),
            "is_following": True,
            "already_following": True,
            "follower_count": follower_count,
            "followers_count": follower_count,
        }

    follower = ShopFollower(
        shop_id=int(shop.id),
        follower_user_id=int(current_user.id),
        created_at=_now_utc(),
    )
    db.add(follower)
    db.flush()
    log_trust_event(
        db,
        event_type="marketplace.shop.followed",
        clan_id=getattr(shop, "clan_id", None),
        actor_user_id=int(current_user.id),
        subject_user_id=int(getattr(shop, "owner_user_id", None) or current_user.id),
        loan_id=None,
        guarantor_id=None,
        meta={
            "reason": "shop_followed",
            "trust_delta": "0.00",
            "shop_id": int(shop.id),
            "shop_name": getattr(shop, "name", None),
            "follower_user_id": int(current_user.id),
            "shop_owner_user_id": getattr(shop, "owner_user_id", None),
            "signal_strength": "weak_social_attention",
            "not_endorsement": True,
            "not_verification": True,
            "not_payment_evidence": True,
        },
        commit=False,
        refresh=False,
    )
    db.commit()

    follower_count = _shop_follower_count(db, shop_id=int(shop.id))
    return {
        "ok": True,
        "shop_id": int(shop.id),
        "is_following": True,
        "already_following": False,
        "follower_count": follower_count,
        "followers_count": follower_count,
    }


@router.delete("/shops/{shop_id}/follow")
def unfollow_marketplace_shop(
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

    existing = _shop_follower_row(
        db,
        shop_id=int(shop.id),
        follower_user_id=int(current_user.id),
    )
    if existing:
        db.delete(existing)
        log_trust_event(
            db,
            event_type="marketplace.shop.unfollowed",
            clan_id=getattr(shop, "clan_id", None),
            actor_user_id=int(current_user.id),
            subject_user_id=int(getattr(shop, "owner_user_id", None) or current_user.id),
            loan_id=None,
            guarantor_id=None,
            meta={
                "reason": "shop_unfollowed",
                "trust_delta": "0.00",
                "shop_id": int(shop.id),
                "shop_name": getattr(shop, "name", None),
                "follower_user_id": int(current_user.id),
                "shop_owner_user_id": getattr(shop, "owner_user_id", None),
                "signal_strength": "weak_social_attention",
                "not_endorsement": True,
                "not_verification": True,
                "not_payment_evidence": True,
            },
            commit=False,
            refresh=False,
        )
        db.commit()

    follower_count = _shop_follower_count(db, shop_id=int(shop.id))
    return {
        "ok": True,
        "shop_id": int(shop.id),
        "is_following": False,
        "follower_count": follower_count,
        "followers_count": follower_count,
    }


@router.get("/shops/{shop_id}/followers/count")
def get_marketplace_shop_follower_count(
    shop_id: int,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    shop = (
        db.query(MarketplaceShop)
        .filter(
            MarketplaceShop.id == int(shop_id),
            MarketplaceShop.is_active.is_(True),
        )
        .first()
    )
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    follower_count = _shop_follower_count(db, shop_id=int(shop.id))
    return {
        "ok": True,
        "shop_id": int(shop.id),
        "follower_count": follower_count,
        "followers_count": follower_count,
    }


@router.get("/shops/{shop_id}/follow-status")
def get_marketplace_shop_follow_status(
    shop_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    shop = (
        db.query(MarketplaceShop)
        .filter(
            MarketplaceShop.id == int(shop_id),
            MarketplaceShop.is_active.is_(True),
        )
        .first()
    )
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")

    is_owner = int(getattr(shop, "owner_user_id", 0) or 0) == int(current_user.id)
    can_see_shop = _current_user_can_see_shop(db=db, shop=shop, user=current_user)
    is_following = (
        _shop_follower_row(
            db,
            shop_id=int(shop.id),
            follower_user_id=int(current_user.id),
        )
        is not None
    )
    follower_count = _shop_follower_count(db, shop_id=int(shop.id))

    return {
        "ok": True,
        "shop_id": int(shop.id),
        "is_following": is_following,
        "can_follow": bool(can_see_shop and not is_owner),
        "can_see_shop": can_see_shop,
        "is_owner": is_owner,
        "follower_count": follower_count,
        "followers_count": follower_count,
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

        owner_shop_ids = [
            int(row.id)
            for row in (
                db.query(MarketplaceShop.id)
                .filter(
                    MarketplaceShop.owner_user_id == int(shop.owner_user_id),
                    MarketplaceShop.is_active.is_(True),
                )
                .all()
            )
        ]
        if not owner_shop_ids:
            owner_shop_ids = [int(shop_id)]

        q = db.query(MarketplaceProduct).filter(
            MarketplaceProduct.shop_id.in_(owner_shop_ids)
        )

        if only_active:
            q = q.filter(MarketplaceProduct.is_active.is_(True))

        context_items = (
            q.order_by(MarketplaceProduct.created_at.desc(), MarketplaceProduct.id.desc())
            .limit(300)
            .all()
        )
        items = _dedupe_active_public_block_products(context_items)[: int(limit)]

        return {
            "items": _products_out(
                db,
                items,
                assignment_products=context_items,
            ),
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
    visible_context_items = _dedupe_active_public_block_products(visible_items)
    visible_items = visible_context_items[: int(limit)]

    return {
        "items": _products_out(
            db,
            visible_items,
            assignment_products=visible_context_items,
        ),
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
    public_block_number = _public_product_block_number(payload.description)

    if visibility_mode == VISIBILITY_COMMUNITY:
        public_product_slots_total = _shop_public_product_slots_total(db, shop=shop)
        replaceable_products = (
            _active_public_products_for_block(
                db,
                shop_id=int(shop.id),
                block_number=int(public_block_number),
            )
            if public_block_number is not None
            else []
        )
        active_product_count = _count_active_products_for_shop(
            db,
            shop_id=int(shop.id),
            visibility_mode=VISIBILITY_COMMUNITY,
        )
        if active_product_count - len(replaceable_products) >= public_product_slots_total:
            raise HTTPException(
                status_code=400,
                detail=_public_product_capacity_detail(public_product_slots_total),
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
        replaced_public_block_products = 0
        replaced_public_block_reposts = 0
        if visibility_mode == VISIBILITY_COMMUNITY and public_block_number is not None:
            (
                replaced_public_block_products,
                replaced_public_block_reposts,
            ) = _retire_replaced_public_block_products(
                db,
                shop_id=int(shop.id),
                block_number=int(public_block_number),
                keep_product_id=int(product.id),
            )
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
            "shop_product_slots_total": _shop_public_product_slots_total(db, shop=shop),
            "replaced_public_block_products": replaced_public_block_products,
            "replaced_public_block_reposts": replaced_public_block_reposts,
            "reason": "marketplace_product_created",
        },
        commit=False,
        refresh=False,
    )
    if visibility_mode == VISIBILITY_COMMUNITY:
        shop_name = _public_identity_name(getattr(shop, "name", None), fallback="A shop you follow")
        _notify_shop_followers(
            db,
            shop=shop,
            kind="marketplace.shop.product_created",
            title="Shop update",
            message=f"{shop_name} added a new product.",
            action_url=_shop_public_action_url(
                db,
                shop=shop,
                clan_id=resolved_clan_id,
                product_id=int(product.id),
            ),
            clan_ids=[resolved_clan_id],
        )
    db.commit()

    return {
        "ok": True,
        "item": _product_out(db, product),
        "replaced_public_block_products": replaced_public_block_products,
        "replaced_public_block_reposts": replaced_public_block_reposts,
    }


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

    provided = _provided_model_fields(payload)
    changed = False
    removed_reposts = 0
    previous_shop_id = int(product.shop_id)
    previous_price = _safe_str(getattr(product, "price", None))
    previous_currency = _safe_str(getattr(product, "currency", None))
    previous_visibility = _safe_str(
        getattr(product, "visibility_mode", None),
        VISIBILITY_COMMUNITY,
    )
    previous_active = bool(getattr(product, "is_active", True))

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
    target_public_block_number = (
        _public_product_block_number(getattr(product, "description", None))
        if target_visibility == VISIBILITY_COMMUNITY
        else None
    )
    replaced_public_block_products = 0
    replaced_public_block_reposts = 0

    if target_active and target_visibility == VISIBILITY_COMMUNITY:
        target_shop = (
            db.query(MarketplaceShop)
            .filter(MarketplaceShop.id == int(target_shop_id))
            .first()
        )
        public_product_slots_total = _shop_public_product_slots_total(db, shop=target_shop)
        replaceable_products = (
            _active_public_products_for_block(
                db,
                shop_id=int(target_shop_id),
                block_number=int(target_public_block_number),
                exclude_product_id=int(product.id),
            )
            if target_public_block_number is not None
            else []
        )
        active_product_count = _count_active_products_for_shop(
            db,
            shop_id=int(target_shop_id),
            visibility_mode=VISIBILITY_COMMUNITY,
            exclude_product_id=int(product.id),
        )
        if active_product_count - len(replaceable_products) >= public_product_slots_total:
            raise HTTPException(
                status_code=400,
                detail=_public_product_capacity_detail(public_product_slots_total),
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
            if (
                target_visibility == VISIBILITY_COMMUNITY
                and target_public_block_number is not None
                and bool(getattr(product, "is_active", True))
            ):
                (
                    replaced_public_block_products,
                    replaced_public_block_reposts,
                ) = _retire_replaced_public_block_products(
                    db,
                    shop_id=int(target_shop_id),
                    block_number=int(target_public_block_number),
                    keep_product_id=int(product.id),
                )
                removed_reposts += replaced_public_block_reposts

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
                    "replaced_public_block_products": replaced_public_block_products,
                    "replaced_public_block_reposts": replaced_public_block_reposts,
                    "image_url": getattr(product, "image_url", None),
                    "reason": reason,
                },
                commit=False,
                refresh=False,
            )
            major_public_offer_update = (
                target_active
                and target_visibility == VISIBILITY_COMMUNITY
                and not soft_remove_requested
                and (
                    previous_price != _safe_str(getattr(product, "price", None))
                    or previous_currency != _safe_str(getattr(product, "currency", None))
                    or previous_visibility != target_visibility
                    or previous_shop_id != int(product.shop_id)
                    or (not previous_active and bool(getattr(product, "is_active", True)))
                )
            )
            if major_public_offer_update:
                notify_shop = (
                    db.query(MarketplaceShop)
                    .filter(MarketplaceShop.id == int(product.shop_id))
                    .first()
                )
                if notify_shop:
                    shop_name = _public_identity_name(
                        getattr(notify_shop, "name", None),
                        fallback="A shop you follow",
                    )
                    _notify_shop_followers(
                        db,
                        shop=notify_shop,
                        kind="marketplace.shop.product_updated",
                        title="Shop offer updated",
                        message=f"{shop_name} updated a shop offer.",
                        action_url=_shop_public_action_url(
                            db,
                            shop=notify_shop,
                            clan_id=resolved_clan_id,
                            product_id=int(product.id),
                        ),
                        clan_ids=[resolved_clan_id],
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
        "replaced_public_block_products": replaced_public_block_products,
        "replaced_public_block_reposts": replaced_public_block_reposts,
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


@router.get("/products/{product_id}/repost-targets")
def recommend_marketplace_repost_targets(
    product_id: int,
    limit: int = Query(default=6, ge=1, le=12),
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

    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(product.shop_id))
        .first()
    )
    if not shop:
        raise HTTPException(status_code=400, detail="Product shop is not ready.")

    if not _shop_owner_can_manage(current_user=current_user, shop=shop):
        raise HTTPException(
            status_code=403,
            detail="Only the shop owner can ask GSN for Network Spotlight target suggestions.",
        )

    if not bool(getattr(product, "is_active", True)):
        raise HTTPException(
            status_code=400,
            detail="Only active public shop blocks can be suggested for Network Spotlight placement.",
        )

    if _resolve_visibility_mode(getattr(product, "visibility_mode", None)) != VISIBILITY_COMMUNITY:
        raise HTTPException(
            status_code=400,
            detail="Only public shop blocks can be suggested for Network Spotlight placement.",
        )

    origin_clan_id = int(product.clan_id)
    product_tokens = _repost_target_tokens(
        getattr(product, "name", None),
        getattr(product, "description", None),
        getattr(shop, "name", None),
        getattr(shop, "description", None),
    )
    current_time = _now_utc()

    clans = (
        db.query(Clan)
        .filter(Clan.id != origin_clan_id)
        .filter(Clan.status.in_(["active", "open", "approved"]))
        .order_by(Clan.created_at.desc(), Clan.id.desc())
        .limit(50)
        .all()
    )

    suggestions: list[Dict[str, Any]] = []
    for clan in clans:
        clan_id = int(clan.id)
        community_code = _clan_public_code(clan)
        if not community_code:
            continue

        public_name = (
            _safe_str(getattr(clan, "marketplace_name", None))
            or _safe_str(getattr(clan, "name", None))
            or f"Community {clan_id}"
        )
        public_description = (
            _safe_str(getattr(clan, "marketplace_description", None))
            or _safe_str(getattr(clan, "description", None))
        )
        active_products_query = (
            db.query(MarketplaceProduct)
            .filter(MarketplaceProduct.clan_id == clan_id)
            .filter(MarketplaceProduct.is_active.is_(True))
            .filter(MarketplaceProduct.visibility_mode.in_([VISIBILITY_COMMUNITY, "public", "community"]))
        )
        active_product_count = active_products_query.count()
        active_products = (
            active_products_query
            .order_by(MarketplaceProduct.created_at.desc(), MarketplaceProduct.id.desc())
            .limit(8)
            .all()
        )
        active_spotlight_count = _count_active_spotlights_for_clan(
            db=db,
            clan_id=clan_id,
            now=current_time,
        )
        max_spotlights = _max_spotlights_for_clan(db=db, clan_id=clan_id)

        product_text = " ".join(
            f"{_safe_str(getattr(item, 'name', None))} {_safe_str(getattr(item, 'description', None))}"
            for item in active_products
        )
        matched_terms = sorted(
            set(
                _match_repost_tokens(product_tokens, public_name, public_description)
                + _match_repost_tokens(product_tokens, product_text)
            )
        )
        score = 20
        score += min(30, len(matched_terms) * 12)
        score += min(20, active_product_count * 4)
        if active_spotlight_count >= max_spotlights:
            score -= 8
        score = max(1, min(100, score))

        reasons: list[str] = []
        if matched_terms:
            reasons.append("Matches: " + ", ".join(matched_terms[:4]))
        if active_product_count:
            reasons.append(f"{active_product_count} public shop block{'' if active_product_count == 1 else 's'} live")
        if active_spotlight_count < max_spotlights:
            reasons.append("Spotlight lane has room")
        else:
            reasons.append("Spotlight capacity reached for community")
        if not reasons:
            reasons.append("Open community route")

        if score >= 70:
            confidence = "strong"
        elif score >= 45:
            confidence = "good"
        else:
            confidence = "explore"

        suggestions.append(
            {
                "community_id": clan_id,
                "community_code": community_code,
                "marketplace_name": public_name,
                "public_name": public_name,
                "matched_terms": matched_terms[:6],
                "score": score,
                "confidence": confidence,
                "reasons": reasons[:4],
                "active_public_blocks": active_product_count,
                "community_signal": "public-shop-active" if active_product_count else "open-route",
                "active_spotlights": active_spotlight_count,
                "max_spotlights": max_spotlights,
            }
        )

    suggestions.sort(
        key=lambda item: (
            int(item.get("score") or 0),
            int(item.get("active_public_blocks") or 0),
        ),
        reverse=True,
    )

    return {
        "ok": True,
        "product": _product_out(db, product),
        "origin_community_id": origin_clan_id,
        "origin_community_code": _clan_public_code(
            db.query(Clan).filter(Clan.id == origin_clan_id).first()
        ),
        "recommendation_basis": {
            "product_terms": product_tokens,
            "private_member_data_exposed": False,
            "note": "Suggestions use public community identity, public marketplace activity, and the selected product wording.",
        },
        "items": suggestions[: int(limit)],
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

    product_active = getattr(product, "is_active", True)
    if product_active is False or product_active == 0:
        raise HTTPException(
            status_code=400,
            detail="Only active public shop blocks can enter Network Spotlight.",
        )

    if _safe_str(getattr(product, "visibility_mode", None), VISIBILITY_COMMUNITY) != VISIBILITY_COMMUNITY:
        raise HTTPException(
            status_code=400,
            detail="Vault products cannot be reposted into ordinary community distribution.",
        )

    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(product.shop_id))
        .first()
    )
    if not shop:
        raise HTTPException(
            status_code=400,
            detail="Repost requires the product's shop to be active.",
        )
    if not bool(getattr(shop, "is_active", True)):
        raise HTTPException(
            status_code=400,
            detail="Repost requires the product's shop to be active.",
        )

    if int(getattr(shop, "owner_user_id", 0) or 0) != int(current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Only the shop owner can repost this product through Subscription Spotlight.",
        )

    target_clan = _resolve_repost_target_clan(db, payload)
    target_clan_id = int(target_clan.id)
    target_community_code = _clan_public_code(target_clan)
    origin_clan_id = int(product.clan_id)

    if target_clan_id == origin_clan_id:
        raise HTTPException(
            status_code=400,
            detail="Network Spotlight placement must target a different community.",
        )

    current_time = _now_utc()
    duration_days = max(1, min(_safe_int(getattr(payload, "duration_days", 1), 1), 365))
    required_spotlight_units = duration_days
    available_spotlight_units = get_active_feature_quantity(
        db,
        owner_user_id=int(current_user.id),
        feature_code=FEATURE_SPOTLIGHT_PRIORITY,
        shop_id=int(shop.id),
    )
    if available_spotlight_units < required_spotlight_units:
        raise HTTPException(
            status_code=403,
            detail=(
                "Live marketplace repost requires "
                f"{required_spotlight_units} unused Subscription Spotlight "
                f"credit{'' if required_spotlight_units == 1 else 's'} for this shop. "
                f"{available_spotlight_units} available."
            ),
        )

    spotlight_title = _safe_str(getattr(product, "name", None)) or "Marketplace repost"
    spotlight_detail = _public_product_display_text(getattr(product, "description", None))
    spotlight_message = (
        f"{spotlight_title} - {spotlight_detail}"
        if spotlight_detail and spotlight_detail != spotlight_title
        else spotlight_title
    )[:2000]
    spotlight_expires_at = (current_time + timedelta(days=duration_days)).replace(microsecond=0)

    repost = MarketplaceProductRepost(
        original_product_id=int(product.id),
        reposted_by_user_id=int(current_user.id),
        target_clan_id=target_clan_id,
        created_at=current_time,
    )
    broadcast = MarketplaceBroadcast(
        clan_id=target_clan_id,
        author_user_id=int(current_user.id),
        shop_id=int(product.shop_id),
        message=spotlight_message,
        image_url=_safe_str(getattr(product, "image_url", None)) or None,
        video_url=_safe_str(getattr(product, "video_url", None)) or None,
        priority_mode=SPOTLIGHT_PAID,
        visibility_scope="marketplace_repost",
        expires_at=spotlight_expires_at,
        created_at=current_time,
    )
    db.add(repost)
    db.add(broadcast)
    db.flush()

    usage = consume_feature_units(
        db,
        owner_user_id=int(current_user.id),
        feature_code=FEATURE_SPOTLIGHT_PRIORITY,
        units=required_spotlight_units,
        shop_id=int(shop.id),
        reference_key=f"marketplace.repost:{int(broadcast.id)}",
        note="Network Spotlight placement",
        commit=False,
    )
    if not usage.get("ok"):
        raise HTTPException(
            status_code=403,
            detail=(
                "Not enough unused Subscription Spotlight credits are available "
                "for this Network Spotlight duration."
            ),
        )

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
            "target_community_code": target_community_code,
            "repost_id": int(repost.id),
            "broadcast_id": int(broadcast.id),
            "duration_days": duration_days,
            "expires_at": spotlight_expires_at.isoformat(),
            "visibility_mode": _safe_str(getattr(product, "visibility_mode", None), VISIBILITY_COMMUNITY),
            "priority_mode": SPOTLIGHT_PAID,
            "feature_code": FEATURE_SPOTLIGHT_PRIORITY,
            "paid_feature_consumed": bool(usage.get("ok")),
            "paid_feature_units_required": required_spotlight_units,
            "paid_feature_units_consumed": int(usage.get("consumed") or 0),
            "distribution_slots_total": TOTAL_DISTRIBUTION_SLOTS,
            "distribution_slots_reserved_for_origin_spotlight": ORIGIN_SPOTLIGHT_RESERVED_SLOTS,
            "distribution_slots_remaining": remaining_after,
            "reason": "marketplace_product_network_spotlight",
        },
        commit=False,
        refresh=False,
    )
    shop_name = _public_identity_name(getattr(shop, "name", None), fallback="A shop you follow")
    _notify_shop_followers(
        db,
        shop=shop,
        kind="marketplace.shop.spotlight_created",
        title="Shop spotlight",
        message=f"{shop_name} placed a shop item in Spotlight.",
        action_url=_shop_public_action_url(
            db,
            shop=shop,
            clan_id=target_clan_id,
            product_id=int(product.id),
            broadcast_id=int(broadcast.id),
        ),
        clan_ids=[target_clan_id],
    )
    db.commit()
    db.refresh(repost)
    db.refresh(broadcast)

    return {
        "ok": True,
        "item": _repost_out(db, repost),
        "broadcast": _broadcast_out(db, broadcast),
        "product": _product_out(db, product),
        "target_community": {
            "id": target_clan_id,
            "community_code": target_community_code,
            "name": (
                _safe_str(getattr(target_clan, "marketplace_name", None))
                or _safe_str(getattr(target_clan, "name", None))
                or f"Community {target_clan_id}"
            ),
        },
        "duration_days": duration_days,
        "expires_at": spotlight_expires_at.isoformat(),
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

    if shop is not None:
        if priority_mode != SPOTLIGHT_PAID and visibility_scope == "direct_communities":
            target_clan_ids = [
                int(clan_id)
                for clan_id in _get_active_clan_ids_for_user(
                    db=db,
                    user_id=int(current_user.id),
                )
                if _shop_is_visible_in_clan(db, shop=shop, clan_id=int(clan_id))
            ]
        else:
            target_clan_ids = [int(resolved_clan_id)]
    else:
        target_clan_ids = _get_active_clan_ids_for_user(
            db=db,
            user_id=int(current_user.id),
        )
    if not target_clan_ids:
        raise HTTPException(status_code=400, detail="No active community memberships found")

    current_time = _now_utc()
    skipped_capacity_clan_ids: list[int] = []
    daily_free_spotlight_count = 0

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
    else:
        daily_free_spotlight_count = _count_free_spotlight_runs_for_author_today(
            db=db,
            author_user_id=int(current_user.id),
            now=current_time,
        )
        if daily_free_spotlight_count >= FREE_SPOTLIGHT_DAILY_LIMIT_PER_AUTHOR:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Your free Spotlight for today is already active. "
                    "Wait until the next UTC day or use paid Spotlight."
                ),
            )

    if not target_clan_ids:
        raise HTTPException(status_code=400, detail="No eligible community spotlight placements found")

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
                "skipped_capacity_clan_ids": skipped_capacity_clan_ids,
                "free_spotlight_daily_limit_per_author": (
                    FREE_SPOTLIGHT_DAILY_LIMIT_PER_AUTHOR
                ),
                "reason": "marketplace_broadcast_created",
            },
            commit=False,
            refresh=False,
        )
    primary_item = next(
        (x for x in created_items if int(x.clan_id) == int(resolved_clan_id)),
        created_items[0],
    )
    if canonical_shop is not None:
        shop_name = _public_identity_name(
            getattr(canonical_shop, "name", None),
            fallback="A shop you follow",
        )
        spotlight_publish = priority_mode == SPOTLIGHT_PAID
        _notify_shop_followers(
            db,
            shop=canonical_shop,
            kind=(
                "marketplace.shop.spotlight_created"
                if spotlight_publish
                else "marketplace.shop.broadcast_created"
            ),
            title="Shop spotlight" if spotlight_publish else "Shop update",
            message=(
                f"{shop_name} posted a new shop spotlight."
                if spotlight_publish
                else f"{shop_name} posted a new shop update."
            ),
            action_url=_shop_public_action_url(
                db,
                shop=canonical_shop,
                clan_id=int(primary_item.clan_id),
                broadcast_id=int(primary_item.id),
            ),
            clan_ids=target_clan_ids,
        )
    db.commit()

    return {
        "ok": True,
        "item": _broadcast_out(db, primary_item),
        "items": [_broadcast_out(db, x) for x in created_items],
        "propagated_clan_ids": target_clan_ids,
        "propagated_count": len(created_items),
        "skipped_capacity_clan_ids": skipped_capacity_clan_ids,
        "skipped_capacity_count": len(skipped_capacity_clan_ids),
        "free_spotlight_daily_limit_per_author": FREE_SPOTLIGHT_DAILY_LIMIT_PER_AUTHOR,
        "free_spotlight_used_today_before_publish": daily_free_spotlight_count,
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
