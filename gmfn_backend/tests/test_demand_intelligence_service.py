from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.services.demand_intelligence_service import (
    SUPPRESSION_BELOW_THRESHOLD,
    SUPPRESSION_PROTECTED_TARGET,
    SUPPRESSION_SENSITIVE_CATEGORY,
    TRUTH_LIMITED_CONFIRMED_RESOLUTION,
    TRUTH_LIVE_DEMAND,
    TRUTH_RECENT_DEMAND_SIGNAL,
    TRUTH_RECURRING_REQUEST_PATTERN,
    TRUTH_RESOLUTION_EVIDENCE_AVAILABLE,
    DemandIntelligencePolicy,
    build_demand_intelligence_for_community,
)


ROOT = Path(__file__).resolve().parents[1]

def _seed_base() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id, display_name, trust_score)
                VALUES
                    (1, 'member@example.com', 'hashed', 'member', 'GSN-U-MEMBER', 'Member One', 10),
                    (2, 'seller@example.com', 'hashed', 'member', 'GSN-U-SELLER', 'Plumbing Seller', 10),
                    (3, 'requester-two@example.com', 'hashed', 'member', 'GSN-U-REQ2', 'Requester Two', 95),
                    (4, 'requester-three@example.com', 'hashed', 'member', 'GSN-U-REQ3', 'Requester Three', 5),
                    (5, 'other@example.com', 'hashed', 'member', 'GSN-U-OTHER', 'Other Member', 99),
                    (6, 'target@example.com', 'hashed', 'member', 'GSN-U-TARGET', 'Target Member', 50)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, marketplace_name, community_code, status, invite_code, invite_uses, created_at
                )
                VALUES
                    (1, 'Blessed Community', 'Blessed Marketplace', 'GMFN-C-000001', 'active', 'invite-1', 0, CURRENT_TIMESTAMP),
                    (2, 'Other Community', 'Other Marketplace', 'GMFN-C-000002', 'active', 'invite-2', 0, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 1, 2, 'member', 0),
                    (3, 1, 3, 'member', 0),
                    (4, 1, 4, 'member', 0),
                    (5, 2, 5, 'member', 0),
                    (6, 1, 6, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                )
                VALUES
                    (10, 1, 2, 'Blessed Plumbing Shop', 'Repairs in Ajah and Lekki', 1, CURRENT_TIMESTAMP),
                    (20, 2, 5, 'Other Plumbing Shop', 'Plumbing in another community', 1, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, video_url, visibility_mode, is_active, created_at
                )
                VALUES
                    (100, 1, 10, 2, 'Emergency Plumbing Repair', 'Plumbing service for Ajah homes', '12000', 'NGN', NULL, NULL, 'community_visible', 1, CURRENT_TIMESTAMP),
                    (200, 2, 20, 5, 'Other Community Plumbing', 'Plumbing outside allowed community', '12000', 'NGN', NULL, NULL, 'community_visible', 1, CURRENT_TIMESTAMP)
                """
            )
        )


def _seed_request(
    *,
    request_id: int,
    clan_id: int = 1,
    user_id: int = 1,
    title: str = "Need urgent plumbing help",
    description: str = "Pipe leak near Ajah",
    category: str = "plumbing",
    area: str | None = "Ajah",
    status: str = "open",
    expires_delta: timedelta | None = timedelta(days=1),
    created_delta: timedelta = timedelta(days=0),
) -> None:
    now = datetime.now(timezone.utc)
    expires_at = None if expires_delta is None else now + expires_delta
    created_at = now + created_delta
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_requests (
                    id, clan_id, user_id, title, description, category, urgency,
                    area, payment_mode, allow_trust_credit, status, expires_at, created_at
                )
                VALUES (
                    :id, :clan_id, :user_id, :title, :description, :category, 'medium',
                    :area, 'cash', 0, :status, :expires_at, :created_at
                )
                """
            ),
            {
                "id": request_id,
                "clan_id": clan_id,
                "user_id": user_id,
                "title": title,
                "description": description,
                "category": category,
                "area": area,
                "status": status,
                "expires_at": expires_at,
                "created_at": created_at,
            },
        )


def _seed_mutually_confirmed_trade_for_demand(*, demand_id: int, trade_id: int = 900) -> None:
    now = datetime.now(timezone.utc)
    meta_json = json.dumps(
        {
            "source": "demand_supply_match",
            "source_demand_id": demand_id,
            "source_match_product_id": 100,
            "source_match_shop_id": 10,
            "not_recommendation": True,
            "not_endorsement": True,
            "not_payment_proof": True,
        }
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO protected_trade_records (
                    id, trade_code, clan_id, creator_user_id, seller_user_id, buyer_user_id,
                    shop_id, product_id, item_title, terms_summary, currency, status,
                    payment_status, release_status, receipt_status, dispute_status,
                    meta_json, created_at, updated_at
                )
                VALUES (
                    :trade_id, :trade_code, 1, 1, 2, 1,
                    10, 100, 'Emergency Plumbing Repair', 'DemandBox plumbing job',
                    'NGN', 'received', 'not_started', 'released', 'received', 'none',
                    :meta_json, :now, :now
                )
                """
            ),
            {
                "trade_id": trade_id,
                "trade_code": f"PT-{trade_id}",
                "meta_json": meta_json,
                "now": now,
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO protected_trade_events (
                    id, trade_id, actor_user_id, event_type, status_from, status_to, note, meta_json, created_at
                )
                VALUES
                    (:release_id, :trade_id, 2, 'release.recorded', NULL, 'released', 'Provider completed.', NULL, :now),
                    (:receipt_id, :trade_id, 1, 'receipt.confirmed', NULL, 'received', 'Requester received.', NULL, :now)
                """
            ),
            {
                "release_id": trade_id * 10 + 1,
                "receipt_id": trade_id * 10 + 2,
                "trade_id": trade_id,
                "now": now,
            },
        )


def _policy() -> DemandIntelligencePolicy:
    return DemandIntelligencePolicy(
        window_days=90,
        min_request_count=3,
        min_distinct_requesters=2,
    )


def _build() -> dict:
    with SessionLocal() as db:
        return build_demand_intelligence_for_community(
            db,
            current_user_id=1,
            clan_id=1,
            policy=_policy(),
        )


def _table_count(table_name: str) -> int:
    with engine.begin() as conn:
        return int(conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar_one())


def test_multi_requester_repeated_demand_creates_recurring_pattern_without_identity_leak():
    _seed_base()
    _seed_request(request_id=1, user_id=1)
    _seed_request(request_id=2, user_id=3)
    _seed_request(request_id=3, user_id=4)

    result = _build()

    assert result["category_count"] == 1
    row = result["categories"][0]
    assert row["safe_category"] == "plumbing"
    assert row["legitimate_request_count"] == 3
    assert row["distinct_requester_count"] == 3
    assert row["live_request_count"] == 3
    assert row["plausible_supply_signal"] is True
    assert row["confirmed_resolution_count"] == 0
    assert row["truth_labels"] == [
        TRUTH_LIVE_DEMAND,
        TRUTH_RECENT_DEMAND_SIGNAL,
        TRUTH_RECURRING_REQUEST_PATTERN,
        TRUTH_LIMITED_CONFIRMED_RESOLUTION,
    ]
    serialized = json.dumps(result).lower()
    assert "requester" in serialized
    assert "requester_ids" not in serialized
    assert "request_id" not in serialized
    assert "member@example.com" not in serialized
    assert "gsn-u-member" not in serialized
    assert "pipe leak" not in serialized
    assert "trust_score" not in serialized
    assert "cci" not in serialized


def test_repeated_posts_from_one_requester_cannot_create_broad_recurring_pattern():
    _seed_base()
    _seed_request(request_id=1, user_id=1)
    _seed_request(request_id=2, user_id=1)
    _seed_request(request_id=3, user_id=1)

    result = _build()

    assert result["categories"] == []
    assert result["suppression_summary"] == [
        {"reason": SUPPRESSION_BELOW_THRESHOLD, "count": 1}
    ]


def test_below_threshold_protected_target_and_sensitive_categories_are_suppressed():
    _seed_base()
    _seed_request(request_id=1, user_id=1)
    _seed_request(
        request_id=2,
        user_id=3,
        title="Private ask for @GSN-U-TARGET",
        description="[GSN_VISIBILITY_SCOPE:protected_target]\nNeed private plumbing help from @GSN-U-TARGET",
    )
    _seed_request(
        request_id=3,
        user_id=4,
        title="Need medical support",
        description="Health and medicine request",
        category="medical",
    )

    result = _build()

    assert result["categories"] == []
    summary = {row["reason"]: row["count"] for row in result["suppression_summary"]}
    assert summary[SUPPRESSION_BELOW_THRESHOLD] == 1
    assert summary[SUPPRESSION_PROTECTED_TARGET] == 1
    assert summary[SUPPRESSION_SENSITIVE_CATEGORY] == 1
    serialized = json.dumps(result).lower()
    assert "medical" not in serialized
    assert "gsn-u-target" not in serialized


def test_expired_alone_does_not_become_unmet_and_demandbox_fulfilled_is_requester_side_only():
    _seed_base()
    _seed_request(request_id=1, user_id=1, status="fulfilled")
    _seed_request(request_id=2, user_id=3, expires_delta=timedelta(days=-1))
    _seed_request(request_id=3, user_id=4, expires_delta=timedelta(days=-2))

    result = _build()

    assert result["category_count"] == 1
    row = result["categories"][0]
    assert row["live_request_count"] == 0
    assert row["requester_side_fulfilled_count"] == 1
    assert row["confirmed_resolution_count"] == 0
    assert TRUTH_LIVE_DEMAND not in row["truth_labels"]
    assert TRUTH_LIMITED_CONFIRMED_RESOLUTION in row["truth_labels"]
    assert "UNMET" not in json.dumps(result)
    assert "MARKET_DEMAND" not in json.dumps(result)


def test_o2_mutually_confirmed_outcome_counts_as_strong_resolution():
    _seed_base()
    _seed_request(request_id=1, user_id=1)
    _seed_request(request_id=2, user_id=3)
    _seed_request(request_id=3, user_id=4)
    _seed_mutually_confirmed_trade_for_demand(demand_id=1)

    result = _build()

    row = result["categories"][0]
    assert row["confirmed_resolution_count"] == 1
    assert TRUTH_RESOLUTION_EVIDENCE_AVAILABLE in row["truth_labels"]
    assert TRUTH_LIMITED_CONFIRMED_RESOLUTION not in row["truth_labels"]


def test_service_is_single_community_only_and_does_not_use_cross_community_supply():
    _seed_base()
    _seed_request(request_id=1, user_id=1)
    _seed_request(request_id=2, user_id=3)
    _seed_request(request_id=3, user_id=4)
    _seed_request(request_id=20, clan_id=2, user_id=5)
    _seed_request(request_id=21, clan_id=2, user_id=5)
    _seed_request(request_id=22, clan_id=2, user_id=5)

    result = _build()

    assert result["community_id"] == 1
    assert result["eligible_request_count"] == 3
    assert result["deferred_scope"]["cross_community_o3_aggregation"] is False
    assert len(result["categories"]) == 1
    assert result["categories"][0]["community_id"] == 1


def test_paid_spotlight_trustscore_cci_and_attention_do_not_influence_demand_intelligence():
    _seed_base()
    _seed_request(request_id=1, user_id=1)
    _seed_request(request_id=2, user_id=3)
    _seed_request(request_id=3, user_id=4)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    id, owner_user_id, clan_id, shop_id, feature_code, plan_code,
                    quantity_total, quantity_used, status, starts_at, expires_at,
                    revoked_at, payment_reference, created_at, updated_at
                )
                VALUES (
                    1, 2, 1, 10, 'spotlight_priority', 'spotlight_credit_pack',
                    10, 0, 'active', CURRENT_TIMESTAMP, NULL,
                    NULL, 'paid-spotlight', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_attention_events (
                    id, event_type, shop_id, product_id, clan_id, shop_owner_user_id,
                    viewer_user_id, source, source_path, dedupe_key, created_at
                )
                VALUES (
                    1, 'match_available', 10, 100, 1, 2,
                    1, 'demand_box_intelligence', '/app/demand-box?demand_id=1',
                    'dedupe-o4a', CURRENT_TIMESTAMP
                )
                """
            )
        )

    result = _build()
    source = (ROOT / "app/services/demand_intelligence_service.py").read_text().lower()

    assert result["categories"][0]["plausible_supply_signal"] is True
    assert result["deferred_scope"]["paid_priority"] is False
    assert result["deferred_scope"]["social_ranking"] is False
    assert "featureentitlement" not in source
    assert "marketplacebroadcast" not in source
    assert "spotlight" not in source
    assert "trust_score" not in source
    assert "cci" not in source


def test_demand_intelligence_read_model_creates_no_rows_or_events():
    _seed_base()
    _seed_request(request_id=1, user_id=1)
    _seed_request(request_id=2, user_id=3)
    _seed_request(request_id=3, user_id=4)
    before = {
        "marketplace_requests": _table_count("marketplace_requests"),
        "protected_trade_records": _table_count("protected_trade_records"),
        "protected_trade_events": _table_count("protected_trade_events"),
        "marketplace_attention_events": _table_count("marketplace_attention_events"),
        "trust_events": _table_count("trust_events"),
        "notifications": _table_count("notifications"),
    }

    _build()

    after = {table: _table_count(table) for table in before}
    assert after == before
