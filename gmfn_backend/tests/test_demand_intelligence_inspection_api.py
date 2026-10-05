from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.database import engine


ENDPOINT = "/analytics/clans/1/demand-intelligence"


def _seed_inspection_base(*, user_one_membership_role: str = "admin", user_one_clan_id: int = 1) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id, display_name, trust_score)
                VALUES
                    (1, 'operator@example.com', 'hashed', 'user', 'GSN-U-OPERATOR', 'Operator One', 90),
                    (2, 'seller@example.com', 'hashed', 'user', 'GSN-U-SELLER', 'Plumbing Seller', 10),
                    (3, 'requester-two@example.com', 'hashed', 'user', 'GSN-U-REQ2', 'Requester Two', 95),
                    (4, 'requester-three@example.com', 'hashed', 'user', 'GSN-U-REQ3', 'Requester Three', 5),
                    (5, 'ordinary@example.com', 'hashed', 'user', 'GSN-U-ORDINARY', 'Ordinary Member', 50),
                    (6, 'target@example.com', 'hashed', 'user', 'GSN-U-TARGET', 'Target Member', 50)
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
                    (1, :user_one_clan_id, 1, :user_one_membership_role, 0),
                    (2, 1, 2, 'member', 0),
                    (3, 1, 3, 'member', 0),
                    (4, 1, 4, 'member', 0),
                    (5, 1, 5, 'member', 0),
                    (6, 1, 6, 'member', 0)
                """
            ),
            {
                "user_one_clan_id": user_one_clan_id,
                "user_one_membership_role": user_one_membership_role,
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                )
                VALUES
                    (10, 1, 2, 'Blessed Plumbing Shop', 'Repairs in Ajah and Lekki', 1, CURRENT_TIMESTAMP)
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
                    (100, 1, 10, 2, 'Emergency Plumbing Repair', 'Plumbing service for Ajah homes', '12000', 'NGN', NULL, NULL, 'community_visible', 1, CURRENT_TIMESTAMP)
                """
            )
        )


def _seed_request(
    *,
    request_id: int,
    user_id: int,
    title: str = "Need urgent plumbing help",
    description: str = "Pipe leak near Ajah",
    category: str = "plumbing",
    status: str = "open",
    expires_delta: timedelta | None = timedelta(days=1),
) -> None:
    now = datetime.now(timezone.utc)
    expires_at = None if expires_delta is None else now + expires_delta
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_requests (
                    id, clan_id, user_id, title, description, category, urgency,
                    area, payment_mode, allow_trust_credit, status, expires_at, created_at
                )
                VALUES (
                    :id, 1, :user_id, :title, :description, :category, 'medium',
                    'Ajah', 'cash', 0, :status, :expires_at, :created_at
                )
                """
            ),
            {
                "id": request_id,
                "user_id": user_id,
                "title": title,
                "description": description,
                "category": category,
                "status": status,
                "expires_at": expires_at,
                "created_at": now,
            },
        )


def _seed_thresholded_demand() -> None:
    _seed_request(request_id=1, user_id=1)
    _seed_request(request_id=2, user_id=3)
    _seed_request(request_id=3, user_id=4)
    _seed_request(
        request_id=4,
        user_id=5,
        title="Need gardening help",
        description="One-off garden request",
        category="gardening",
    )
    _seed_request(
        request_id=5,
        user_id=5,
        title="Need medical support",
        description="Health and medicine request",
        category="medical",
    )
    _seed_request(
        request_id=6,
        user_id=3,
        title="Private ask for @GSN-U-TARGET",
        description="[GSN_VISIBILITY_SCOPE:protected_target]\nNeed private plumbing help from @GSN-U-TARGET",
        category="plumbing",
    )


def _table_count(table_name: str) -> int:
    with engine.begin() as conn:
        return int(conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar_one())


def test_authorised_community_operator_can_inspect_aggregate_demand_intelligence(
    client,
    override_current_user_user,
):
    _seed_inspection_base(user_one_membership_role="admin")
    _seed_thresholded_demand()

    response = client.get(ENDPOINT)

    assert response.status_code == 200
    payload = response.json()
    assert payload["community_id"] == 1
    assert payload["visibility_authorized"] is True
    assert payload["thresholds"] == {
        "min_request_count": 3,
        "min_distinct_requesters": 2,
    }
    assert payload["category_count"] == 1
    category = payload["categories"][0]
    assert category["safe_category"] == "plumbing"
    assert category["legitimate_request_count"] == 3
    assert category["distinct_requester_count"] == 3
    assert category["live_request_count"] == 3
    assert category["plausible_supply_signal"] is True
    assert "LIVE_DEMAND" in category["truth_labels"]
    assert "RECURRING_REQUEST_PATTERN" in category["truth_labels"]


def test_ordinary_member_cannot_inspect_demand_intelligence(client, override_current_user_user):
    _seed_inspection_base(user_one_membership_role="member")
    _seed_thresholded_demand()

    response = client.get(ENDPOINT)

    assert response.status_code == 403


def test_other_community_admin_cannot_inspect_demand_intelligence(
    client,
    override_current_user_user,
):
    _seed_inspection_base(user_one_membership_role="admin", user_one_clan_id=2)
    _seed_thresholded_demand()

    response = client.get(ENDPOINT)

    assert response.status_code == 403


def test_platform_admin_can_inspect_without_being_exposed_as_visibility_subject(
    client,
    override_current_user,
):
    _seed_inspection_base(user_one_membership_role="member")
    _seed_thresholded_demand()
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM clan_memberships WHERE user_id = 1 AND clan_id = 1"))

    response = client.get(ENDPOINT)

    assert response.status_code == 200
    payload = response.json()
    assert payload["visibility_authorized"] is True
    assert payload["categories"][0]["safe_category"] == "plumbing"
    assert "GSN-U-OPERATOR" not in json.dumps(payload)


def test_inspection_response_does_not_leak_suppressed_or_individual_demand_data(
    client,
    override_current_user_user,
):
    _seed_inspection_base(user_one_membership_role="admin")
    _seed_thresholded_demand()

    response = client.get(ENDPOINT)

    assert response.status_code == 200
    payload = response.json()
    serialized = json.dumps(payload).lower()
    suppression = {row["reason"]: row["count"] for row in payload["suppression_summary"]}
    assert suppression == {
        "BELOW_PRIVACY_THRESHOLD": 1,
        "PROTECTED_TARGET_REQUEST": 1,
        "SENSITIVE_CATEGORY": 1,
    }
    assert "gardening" not in serialized
    assert "medical" not in serialized
    assert "gsn-u-target" not in serialized
    assert "pipe leak" not in serialized
    assert "operator@example.com" not in serialized
    assert "seller@example.com" not in serialized
    assert "requester-two@example.com" not in serialized
    assert "request_id" not in serialized
    assert "trust_score" not in serialized
    assert "cci" not in serialized


def test_inspection_endpoint_is_read_only_and_creates_no_events_or_analytics(
    client,
    override_current_user_user,
):
    _seed_inspection_base(user_one_membership_role="admin")
    _seed_thresholded_demand()
    before = {
        "marketplace_requests": _table_count("marketplace_requests"),
        "marketplace_shops": _table_count("marketplace_shops"),
        "marketplace_products": _table_count("marketplace_products"),
        "protected_trade_records": _table_count("protected_trade_records"),
        "protected_trade_events": _table_count("protected_trade_events"),
        "marketplace_attention_events": _table_count("marketplace_attention_events"),
        "trust_events": _table_count("trust_events"),
        "notifications": _table_count("notifications"),
    }

    response = client.get(ENDPOINT)

    assert response.status_code == 200
    after = {table: _table_count(table) for table in before}
    assert after == before