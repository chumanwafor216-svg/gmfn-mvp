from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.db.models import (
    ClanMembership,
    MarketplaceRequest,
    ProtectedTradeEvent,
    ProtectedTradeRecord,
)
from app.services.demand_supply_intelligence_service import find_supply_for_demand
from app.services.protected_trade_service import derive_protected_trade_outcome

TRUTH_LIVE_DEMAND = "LIVE_DEMAND"
TRUTH_RECENT_DEMAND_SIGNAL = "RECENT_DEMAND_SIGNAL"
TRUTH_RECURRING_REQUEST_PATTERN = "RECURRING_REQUEST_PATTERN"
TRUTH_LIMITED_CONFIRMED_RESOLUTION = "LIMITED_CONFIRMED_RESOLUTION"
TRUTH_RESOLUTION_EVIDENCE_AVAILABLE = "RESOLUTION_EVIDENCE_AVAILABLE"

SUPPRESSION_BELOW_THRESHOLD = "BELOW_PRIVACY_THRESHOLD"
SUPPRESSION_PROTECTED_TARGET = "PROTECTED_TARGET_REQUEST"
SUPPRESSION_SENSITIVE_CATEGORY = "SENSITIVE_CATEGORY"
SUPPRESSION_OUT_OF_SCOPE_COMMUNITY = "OUT_OF_SCOPE_COMMUNITY"

PROTECTED_TARGET_MARKER = "[GSN_VISIBILITY_SCOPE:protected_target]"
OPEN_STATUS = "open"
FULFILLED_STATUS = "fulfilled"
MUTUALLY_CONFIRMED_STATE = "MUTUALLY_CONFIRMED"
DEFAULT_WINDOW_DAYS = 90
DEFAULT_MIN_REQUEST_COUNT = 3
DEFAULT_MIN_DISTINCT_REQUESTERS = 2
MAX_WINDOW_DAYS = 365

_TOKEN_PATTERN = re.compile(r"[a-z0-9]+")
_STOP_WORDS = {
    "and",
    "ask",
    "community",
    "for",
    "from",
    "general",
    "help",
    "need",
    "needs",
    "request",
    "service",
    "services",
    "support",
    "the",
    "with",
}
_SENSITIVE_TERMS = {
    "abuse",
    "asylum",
    "autism",
    "bail",
    "borrow",
    "borrowing",
    "cancer",
    "care",
    "child",
    "children",
    "court",
    "debt",
    "depression",
    "disability",
    "disabled",
    "domestic",
    "eviction",
    "family",
    "hardship",
    "health",
    "homeless",
    "housing",
    "immigration",
    "legal",
    "loan",
    "medical",
    "medicine",
    "mental",
    "police",
    "politics",
    "rent",
    "safeguarding",
    "school",
    "shelter",
    "trauma",
    "violence",
    "welfare",
}


@dataclass(frozen=True)
class DemandIntelligencePolicy:
    window_days: int = DEFAULT_WINDOW_DAYS
    min_request_count: int = DEFAULT_MIN_REQUEST_COUNT
    min_distinct_requesters: int = DEFAULT_MIN_DISTINCT_REQUESTERS

    @classmethod
    def from_env(cls) -> "DemandIntelligencePolicy":
        return cls(
            window_days=_configured_int(
                "GSN_DEMAND_INTELLIGENCE_WINDOW_DAYS",
                DEFAULT_WINDOW_DAYS,
                minimum=1,
                maximum=MAX_WINDOW_DAYS,
            ),
            min_request_count=_configured_int(
                "GSN_DEMAND_INTELLIGENCE_MIN_REQUEST_COUNT",
                DEFAULT_MIN_REQUEST_COUNT,
                minimum=2,
                maximum=100,
            ),
            min_distinct_requesters=_configured_int(
                "GSN_DEMAND_INTELLIGENCE_MIN_DISTINCT_REQUESTERS",
                DEFAULT_MIN_DISTINCT_REQUESTERS,
                minimum=2,
                maximum=50,
            ),
        )


def build_demand_intelligence_for_community(
    db: Session,
    *,
    current_user_id: int,
    clan_id: int,
    policy: DemandIntelligencePolicy | None = None,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Return privacy-safe demand intelligence for one permitted community.

    This is a read model. It does not create notifications, TrustEvents,
    marketplace requests, protected trades, or relay state.
    """

    active_policy = policy or DemandIntelligencePolicy.from_env()
    current = _as_aware_utc(now or _now_utc())
    window_start = current - timedelta(days=int(active_policy.window_days))
    safe_clan_id = int(clan_id)
    safe_user_id = int(current_user_id)

    if not _has_active_membership(db, user_id=safe_user_id, clan_id=safe_clan_id):
        return _empty_result(
            clan_id=safe_clan_id,
            policy=active_policy,
            now=current,
            window_start=window_start,
            visibility_authorized=False,
        )

    rows = (
        db.query(MarketplaceRequest)
        .filter(MarketplaceRequest.clan_id == safe_clan_id)
        .filter(MarketplaceRequest.created_at >= window_start)
        .order_by(MarketplaceRequest.created_at.desc(), MarketplaceRequest.id.desc())
        .all()
    )

    buckets: dict[str, dict[str, Any]] = {}
    suppression_counts: dict[str, int] = {}
    eligible_request_total = 0
    live_request_total = 0

    for row in rows:
        if int(getattr(row, "clan_id", 0) or 0) != safe_clan_id:
            _increment(suppression_counts, SUPPRESSION_OUT_OF_SCOPE_COMMUNITY)
            continue
        if _is_protected_target(row):
            _increment(suppression_counts, SUPPRESSION_PROTECTED_TARGET)
            continue
        if _is_sensitive_request(row):
            _increment(suppression_counts, SUPPRESSION_SENSITIVE_CATEGORY)
            continue

        category = _safe_category(row)
        bucket = buckets.setdefault(
            category,
            {
                "safe_category": category,
                "request_count": 0,
                "requester_ids": set(),
                "live_request_count": 0,
                "fulfilled_requester_side_count": 0,
                "plausible_supply_signal": False,
                "confirmed_resolution_count": 0,
            },
        )
        bucket["request_count"] += 1
        bucket["requester_ids"].add(int(getattr(row, "user_id", 0) or 0))
        eligible_request_total += 1

        status = _safe_str(getattr(row, "status", None)).lower()
        if status == FULFILLED_STATUS:
            bucket["fulfilled_requester_side_count"] += 1
        if _is_live(row, now=current):
            bucket["live_request_count"] += 1
            live_request_total += 1
            if find_supply_for_demand(
                db,
                demand_id=int(row.id),
                current_user_id=safe_user_id,
                limit=1,
            ):
                bucket["plausible_supply_signal"] = True

        bucket["confirmed_resolution_count"] += _confirmed_resolution_count_for_demand(
            db,
            demand_id=int(row.id),
        )

    categories: list[dict[str, Any]] = []
    for bucket in buckets.values():
        requester_count = len(bucket["requester_ids"])
        request_count = int(bucket["request_count"])
        if (
            request_count < int(active_policy.min_request_count)
            or requester_count < int(active_policy.min_distinct_requesters)
        ):
            _increment(suppression_counts, SUPPRESSION_BELOW_THRESHOLD)
            continue
        confirmed_resolution_count = int(bucket["confirmed_resolution_count"])
        truth_labels = _truth_labels(
            live_request_count=int(bucket["live_request_count"]),
            request_count=request_count,
            requester_count=requester_count,
            confirmed_resolution_count=confirmed_resolution_count,
        )
        categories.append(
            {
                "community_id": safe_clan_id,
                "safe_category": str(bucket["safe_category"]),
                "analysis_window": _analysis_window(
                    policy=active_policy,
                    now=current,
                    window_start=window_start,
                ),
                "legitimate_request_count": request_count,
                "distinct_requester_count": requester_count,
                "live_request_count": int(bucket["live_request_count"]),
                "plausible_supply_signal": bool(bucket["plausible_supply_signal"]),
                "confirmed_resolution_count": confirmed_resolution_count,
                "requester_side_fulfilled_count": int(
                    bucket["fulfilled_requester_side_count"]
                ),
                "truth_labels": truth_labels,
                "boundary_note": (
                    "Demand intelligence is aggregate community evidence only. "
                    "It does not identify requesters, prove current need, prove market size, "
                    "rank providers, certify supply, or create trust evidence."
                ),
            }
        )

    categories.sort(
        key=lambda item: (
            -int(item["live_request_count"]),
            -int(item["legitimate_request_count"]),
            str(item["safe_category"]),
        )
    )

    return {
        "community_id": safe_clan_id,
        "visibility_authorized": True,
        "analysis_window": _analysis_window(
            policy=active_policy,
            now=current,
            window_start=window_start,
        ),
        "thresholds": {
            "min_request_count": int(active_policy.min_request_count),
            "min_distinct_requesters": int(active_policy.min_distinct_requesters),
        },
        "eligible_request_count": eligible_request_total,
        "live_request_count": live_request_total,
        "category_count": len(categories),
        "categories": categories,
        "suppression_summary": _suppression_summary(suppression_counts),
        "deferred_scope": {
            "cross_community_o3_aggregation": False,
            "notifications": False,
            "frontend_surface": False,
            "social_ranking": False,
            "paid_priority": False,
        },
    }


def _empty_result(
    *,
    clan_id: int,
    policy: DemandIntelligencePolicy,
    now: datetime,
    window_start: datetime,
    visibility_authorized: bool,
) -> dict[str, Any]:
    return {
        "community_id": int(clan_id),
        "visibility_authorized": visibility_authorized,
        "analysis_window": _analysis_window(
            policy=policy,
            now=now,
            window_start=window_start,
        ),
        "thresholds": {
            "min_request_count": int(policy.min_request_count),
            "min_distinct_requesters": int(policy.min_distinct_requesters),
        },
        "eligible_request_count": 0,
        "live_request_count": 0,
        "category_count": 0,
        "categories": [],
        "suppression_summary": [],
        "deferred_scope": {
            "cross_community_o3_aggregation": False,
            "notifications": False,
            "frontend_surface": False,
            "social_ranking": False,
            "paid_priority": False,
        },
    }


def _truth_labels(
    *,
    live_request_count: int,
    request_count: int,
    requester_count: int,
    confirmed_resolution_count: int,
) -> list[str]:
    labels = [TRUTH_RECENT_DEMAND_SIGNAL]
    if live_request_count > 0:
        labels.insert(0, TRUTH_LIVE_DEMAND)
    if request_count >= 2 and requester_count >= 2:
        labels.append(TRUTH_RECURRING_REQUEST_PATTERN)
    if confirmed_resolution_count > 0:
        labels.append(TRUTH_RESOLUTION_EVIDENCE_AVAILABLE)
    else:
        labels.append(TRUTH_LIMITED_CONFIRMED_RESOLUTION)
    return labels


def _confirmed_resolution_count_for_demand(db: Session, *, demand_id: int) -> int:
    rows = db.query(ProtectedTradeRecord).all()
    count = 0
    for trade in rows:
        meta = _meta_dict(getattr(trade, "meta", None), getattr(trade, "meta_json", None))
        if int(meta.get("source_demand_id") or 0) != int(demand_id):
            continue
        events = (
            db.query(ProtectedTradeEvent)
            .filter(ProtectedTradeEvent.trade_id == int(trade.id))
            .order_by(ProtectedTradeEvent.created_at.asc(), ProtectedTradeEvent.id.asc())
            .all()
        )
        outcome = derive_protected_trade_outcome(trade, events=events)
        if outcome.get("derived_outcome_state") == MUTUALLY_CONFIRMED_STATE:
            count += 1
    return count


def _analysis_window(
    *,
    policy: DemandIntelligencePolicy,
    now: datetime,
    window_start: datetime,
) -> dict[str, Any]:
    return {
        "window_days": int(policy.window_days),
        "started_at": window_start.isoformat(),
        "ended_at": now.isoformat(),
    }


def _suppression_summary(counts: dict[str, int]) -> list[dict[str, Any]]:
    return [
        {"reason": reason, "count": int(count)}
        for reason, count in sorted(counts.items())
        if int(count) > 0
    ]


def _safe_category(row: MarketplaceRequest) -> str:
    category_tokens = _tokens(getattr(row, "category", None))
    if category_tokens:
        return " ".join(sorted(category_tokens)[:3])
    fallback_tokens = _tokens(getattr(row, "title", None))
    if fallback_tokens:
        return " ".join(sorted(fallback_tokens)[:3])
    return "general"


def _is_sensitive_request(row: MarketplaceRequest) -> bool:
    tokens = _tokens(
        getattr(row, "category", None),
        getattr(row, "title", None),
        getattr(row, "description", None),
        getattr(row, "area", None),
    )
    return bool(tokens & _SENSITIVE_TERMS)


def _tokens(*values: object) -> set[str]:
    tokens: set[str] = set()
    for value in values:
        for token in _TOKEN_PATTERN.findall(str(value or "").lower()):
            if len(token) < 3 or token in _STOP_WORDS:
                continue
            tokens.add(token)
    return tokens


def _is_live(row: MarketplaceRequest, *, now: datetime) -> bool:
    if _safe_str(getattr(row, "status", None)).lower() != OPEN_STATUS:
        return False
    expires_at = getattr(row, "expires_at", None)
    if expires_at is not None and _as_aware_utc(expires_at) < now:
        return False
    return True


def _is_protected_target(row: MarketplaceRequest) -> bool:
    return PROTECTED_TARGET_MARKER in str(getattr(row, "description", "") or "")


def _has_active_membership(db: Session, *, user_id: int, clan_id: int) -> bool:
    return (
        db.query(ClanMembership.id)
        .filter(
            ClanMembership.user_id == int(user_id),
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .first()
        is not None
    )


def _meta_dict(*values: Any) -> dict[str, Any]:
    for value in values:
        if isinstance(value, dict):
            return value
        if isinstance(value, str) and value.strip():
            try:
                parsed = json.loads(value)
            except Exception:
                continue
            if isinstance(parsed, dict):
                return parsed
    return {}


def _configured_int(name: str, default: int, *, minimum: int, maximum: int) -> int:
    raw = str(os.getenv(name, "") or "").strip()
    try:
        value = int(raw) if raw else int(default)
    except ValueError:
        value = int(default)
    return max(minimum, min(maximum, value))


def _increment(counts: dict[str, int], reason: str) -> None:
    counts[reason] = int(counts.get(reason, 0) or 0) + 1


def _safe_str(value: Any) -> str:
    return str(value or "").strip()


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
