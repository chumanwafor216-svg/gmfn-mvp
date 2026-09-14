import json
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import text

from app.api.routes import marketplace_requests, pool
from app.db.database import SessionLocal, engine
from app.schemas.marketplace_requests import MarketplaceRequestCreate


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _fake_current_user():
    return Obj(id=1, email="pytest@example.com", role="admin", gmfn_id="GSN-U-TEST")


def _fake_second_user():
    return Obj(id=2, email="responder@example.com", role="member", gmfn_id="GSN-U-RESPONDER")


def _seed_primary_clan() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES (1, 'pytest@example.com', 'hashed', 'admin', 'GSN-U-TEST')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans
                    (
                        id,
                        name,
                        marketplace_name,
                        community_code,
                        status,
                        invite_code,
                        invite_uses,
                        created_at
                    )
                VALUES (
                    1,
                    'Test Clan',
                    'Test Marketplace',
                    'GMFN-C-000001',
                    'active',
                    'invite-test-1',
                    0,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships
                    (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 1, 1, 'admin', 0)
                """
            )
        )
        clan_count = conn.execute(text("SELECT COUNT(*) FROM clans WHERE id = 1")).scalar()
        membership_count = conn.execute(
            text(
                """
                SELECT COUNT(*) FROM clan_memberships
                WHERE clan_id = 1 AND user_id = 1 AND left_at IS NULL
                """
            )
        ).scalar()
        assert clan_count == 1
        assert membership_count == 1


def _add_second_member_to_primary_clan() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES (2, 'responder@example.com', 'hashed', 'member', 'GSN-U-RESPONDER')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships
                    (clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 2, 'member', 0)
                """
            )
        )



def _add_second_clan_for_user() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO clans
                    (
                        id,
                        name,
                        marketplace_name,
                        community_code,
                        status,
                        invite_code,
                        invite_uses,
                        created_at
                    )
                VALUES (
                    2,
                    'Second Clan',
                    'Second Marketplace',
                    'GMFN-C-000002',
                    'active',
                    'invite-test-2',
                    0,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships
                    (clan_id, user_id, role, personal_pool_balance)
                VALUES (2, 1, 'member', 0)
                """
            )
        )


def _seed_community_domain_feature_policy(
    *,
    feature_key: str,
    mode: str = "off",
    domain_id: int = 980,
    policy_id: int = 981,
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO community_domains (
                    id,
                    domain_name,
                    display_name,
                    domain_type,
                    template_key,
                    owner_user_id,
                    clan_id,
                    status,
                    verification_status,
                    created_at,
                    updated_at
                )
                VALUES (
                    :domain_id,
                    :domain_name,
                    'Demand Feature Policy Domain',
                    'ngo_project_network',
                    'ngo_project_network',
                    1,
                    1,
                    'active',
                    'unverified',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "domain_id": domain_id,
                "domain_name": f"demand-feature-policy-{feature_key}",
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO community_domain_policies (
                    id,
                    community_domain_id,
                    policy_key,
                    action_key,
                    scope_type,
                    review_mode,
                    required_role,
                    status,
                    policy_summary,
                    config_json,
                    created_by_user_id,
                    created_at,
                    updated_at
                )
                VALUES (
                    :policy_id,
                    :domain_id,
                    'domain.feature_policy',
                    'domain.features.configure',
                    'domain',
                    'domain_admin_review',
                    'owner_admin',
                    'active',
                    'DemandBox route feature policy test',
                    :config_json,
                    1,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "policy_id": policy_id,
                "domain_id": domain_id,
                "config_json": json.dumps({"features": {feature_key: mode}}),
            },
        )


def _marketplace_request_counts() -> tuple[int, int]:
    with engine.begin() as conn:
        request_count = conn.execute(
            text("SELECT COUNT(*) FROM marketplace_requests")
        ).scalar_one()
        notification_count = conn.execute(
            text("SELECT COUNT(*) FROM notifications")
        ).scalar_one()
    return int(request_count), int(notification_count)


def test_marketplace_request_stores_selected_community():
    _seed_primary_clan()

    with SessionLocal() as db:
        response = marketplace_requests.create_marketplace_request(
            MarketplaceRequestCreate(
                clan_id=1,
                title="Need a plumber",
                description="Kitchen pipe needs help.",
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        data = response.model_dump()

        rows = marketplace_requests.list_marketplace_requests(
            db=db,
            current_user=_fake_current_user(),
            status="open",
            category=None,
            urgency=None,
            area=None,
            mine_only=False,
            clan_id=1,
            limit=50,
        )

    assert data["clan_id"] == 1
    assert data["community_code"] == "GMFN-C-000001"
    assert data["clan_name"] == "Test Clan"
    assert data["is_mine"] is True
    assert data["mine"] is True
    assert data["source"] == "demand_box"
    assert data["source_label"] == "DemandBox"
    assert data["need_type"] == "General"
    assert data["queue_keys"] == ["mine", "need_type:general"]
    assert data["mentioned_handles"] == []
    assert data["mentioned_member_count"] == 0
    assert data["is_tagged_for_me"] is False
    assert data["routing_status"] == "community_queue"
    assert data["routing_hint"] == "Visible through the community queue."
    assert len(rows) == 1
    assert rows[0].clan_id == 1
    assert rows[0].is_mine is True
    assert rows[0].mine is True


def test_marketplace_request_marks_visible_community_rows_not_mine():
    _seed_primary_clan()
    _add_second_member_to_primary_clan()

    with SessionLocal() as db:
        marketplace_requests.create_marketplace_request(
            MarketplaceRequestCreate(
                clan_id=1,
                title="Need food support",
                description="Community member is checking available food support.",
                category="food",
            ),
            db=db,
            current_user=_fake_current_user(),
        )

        rows = marketplace_requests.list_marketplace_requests(
            db=db,
            current_user=_fake_second_user(),
            status="open",
            category=None,
            urgency=None,
            area=None,
            mine_only=False,
            clan_id=1,
            limit=50,
        )

    assert len(rows) == 1
    assert rows[0].requester_gmfn_id == "GSN-U-TEST"
    assert rows[0].category == "food"
    assert rows[0].is_mine is False
    assert rows[0].mine is False
    assert rows[0].source == "demand_box"
    assert rows[0].source_label == "DemandBox"
    assert rows[0].need_type == "food"
    assert rows[0].queue_keys == ["for_me", "need_type:food"]
    assert rows[0].mentioned_handles == []
    assert rows[0].mentioned_member_count == 0
    assert rows[0].is_tagged_for_me is False
    assert rows[0].routing_status == "community_queue"


def test_marketplace_request_surfaces_ask_community_routing_metadata_and_links():
    _seed_primary_clan()
    _add_second_member_to_primary_clan()

    with SessionLocal() as db:
        response = marketplace_requests.create_marketplace_request(
            MarketplaceRequestCreate(
                clan_id=1,
                title="Food support for @GSN-U-RESPONDER",
                description=(
                    "Community Ask posted through DemandBox. "
                    "Please ask @GSN-U-RESPONDER before buying."
                ),
                category="Community Ask",
                urgency="high",
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        data = response.model_dump()

        rows = marketplace_requests.list_marketplace_requests(
            db=db,
            current_user=_fake_second_user(),
            status="open",
            category=None,
            urgency=None,
            area=None,
            mine_only=False,
            clan_id=1,
            limit=50,
        )

    with engine.begin() as conn:
        notices = conn.execute(
            text(
                """
                SELECT user_id, kind, title, action_url
                FROM notifications
                ORDER BY id ASC
                """
            )
        ).mappings().all()

    assert data["source"] == "ask_community"
    assert data["source_label"] == "Ask Community"
    assert data["need_type"] == "Community Ask"
    assert data["queue_keys"] == [
        "mine",
        "direct_tag",
        "ask_community",
        "urgent",
        "need_type:community_ask",
    ]
    assert data["mentioned_handles"] == ["@GSN-U-RESPONDER"]
    assert data["mentioned_member_count"] == 1
    assert data["is_tagged_for_me"] is False
    assert data["routing_status"] == "member_tagged"
    assert data["routing_hint"] == "Matched GSN member handles were routed to the tagged queue."

    assert len(rows) == 1
    assert rows[0].source == "ask_community"
    assert rows[0].source_label == "Ask Community"
    assert rows[0].queue_keys == [
        "for_me",
        "tagged_for_me",
        "direct_tag",
        "ask_community",
        "urgent",
        "need_type:community_ask",
    ]
    assert rows[0].mentioned_handles == ["@GSN-U-RESPONDER"]
    assert rows[0].mentioned_member_count == 1
    assert rows[0].is_tagged_for_me is True
    assert rows[0].routing_status == "member_tagged"
    assert [dict(row) for row in notices] == [
        {
            "user_id": 2,
            "kind": "demand_tagged",
            "title": "Demand tagged for you",
            "action_url": "/app/demand-box?clan_id=1&queue=tagged",
        },
        {
            "user_id": 1,
            "kind": "demand_posted",
            "title": "Your request is live",
            "action_url": "/app/demand-box?clan_id=1&queue=ask_community",
        },
    ]

def test_marketplace_request_keeps_unmatched_handles_as_text_only():
    _seed_primary_clan()
    _add_second_member_to_primary_clan()

    with SessionLocal() as db:
        response = marketplace_requests.create_marketplace_request(
            MarketplaceRequestCreate(
                clan_id=1,
                title="Need transport help from @UNKNOWN-HANDLE",
                description="Community Ask posted through DemandBox.",
                category="Community Ask",
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        data = response.model_dump()

        rows = marketplace_requests.list_marketplace_requests(
            db=db,
            current_user=_fake_second_user(),
            status="open",
            category=None,
            urgency=None,
            area=None,
            mine_only=False,
            clan_id=1,
            limit=50,
        )

    with engine.begin() as conn:
        notices = conn.execute(
            text(
                """
                SELECT user_id, kind, title, action_url
                FROM notifications
                ORDER BY id ASC
                """
            )
        ).mappings().all()

    assert data["mentioned_handles"] == ["@UNKNOWN-HANDLE"]
    assert data["mentioned_member_count"] == 0
    assert data["is_tagged_for_me"] is False
    assert data["routing_status"] == "handle_text_detected"
    assert data["routing_hint"] == "Handle text was detected, but no same-community GSN member was matched."
    assert data["queue_keys"] == ["mine", "ask_community", "need_type:community_ask"]

    assert len(rows) == 1
    assert rows[0].mentioned_handles == ["@UNKNOWN-HANDLE"]
    assert rows[0].mentioned_member_count == 0
    assert rows[0].is_tagged_for_me is False
    assert rows[0].routing_status == "handle_text_detected"
    assert rows[0].queue_keys == ["for_me", "ask_community", "need_type:community_ask"]
    assert [dict(row) for row in notices] == [
        {
            "user_id": 2,
            "kind": "demand_new",
            "title": "New request near you",
            "action_url": "/app/demand-box?clan_id=1&queue=ask_community",
        },
        {
            "user_id": 1,
            "kind": "demand_posted",
            "title": "Your request is live",
            "action_url": "/app/demand-box?clan_id=1&queue=ask_community",
        },
    ]

def test_marketplace_request_create_respects_disabled_community_domain_demand_box_policy(
    client,
    override_current_user,
):
    _seed_primary_clan()
    _seed_community_domain_feature_policy(feature_key="demand_box")

    response = client.post(
        "/marketplace/requests",
        json={
            "clan_id": 1,
            "title": "Need community hall chairs",
            "description": "Saturday event needs extra chairs.",
            "category": "event support",
            "urgency": "medium",
            "expires_in_hours": 48,
        },
    )

    assert response.status_code == 403, response.text
    detail = response.json()["detail"]
    assert detail["code"] == "community_domain_feature_disabled"
    assert detail["feature_key"] == "demand_box"
    assert "post new DemandBox requests" in detail["message"]
    assert _marketplace_request_counts() == (0, 0)


def test_marketplace_request_create_rejects_malformed_boundary_controls(
    client,
    override_current_user,
):
    _seed_primary_clan()
    base_payload = {
        "clan_id": 1,
        "title": "Need a plumber",
        "description": "Kitchen pipe needs help.",
        "category": "repairs",
        "urgency": "high",
        "area": "North side",
        "whatsapp_number": "+447700900333",
        "expires_in_hours": 48,
        "payment_mode": "cash",
        "allow_trust_credit": False,
    }

    for field_name in ("clan_id", "expires_in_hours"):
        payload = dict(base_payload)
        payload[field_name] = False

        response = client.post("/marketplace/requests", json=payload)

        assert response.status_code == 422, response.text
        assert f"{field_name} must be an integer, not a boolean" in response.text
        assert _marketplace_request_counts() == (0, 0)

        payload[field_name] = 1.5

        response = client.post("/marketplace/requests", json=payload)

        assert response.status_code == 422, response.text
        assert f"{field_name} must be an integer, not a float" in response.text
        assert _marketplace_request_counts() == (0, 0)

    for field_name in (
        "title",
        "description",
        "category",
        "urgency",
        "area",
        "whatsapp_number",
        "payment_mode",
    ):
        payload = dict(base_payload)
        payload[field_name] = False

        response = client.post("/marketplace/requests", json=payload)

        assert response.status_code == 422, response.text
        assert f"{field_name} must be text" in response.text
        assert _marketplace_request_counts() == (0, 0)

        payload[field_name] = 1.5

        response = client.post("/marketplace/requests", json=payload)

        assert response.status_code == 422, response.text
        assert f"{field_name} must be text" in response.text
        assert _marketplace_request_counts() == (0, 0)

    payload = dict(base_payload)
    payload["allow_trust_credit"] = "false"

    response = client.post("/marketplace/requests", json=payload)

    assert response.status_code == 422, response.text
    assert "allow_trust_credit must be a boolean" in response.text
    assert _marketplace_request_counts() == (0, 0)


def test_marketplace_request_create_rejects_non_positive_clan_before_write(
    client,
    override_current_user,
):
    _seed_primary_clan()

    response = client.post(
        "/marketplace/requests",
        json={
            "clan_id": 0,
            "title": "Need a plumber",
            "description": "Kitchen pipe needs help.",
        },
    )

    assert response.status_code == 422, response.text
    assert "clan_id" in response.text
    assert _marketplace_request_counts() == (0, 0)


def test_marketplace_request_read_routes_reject_non_positive_ids(
    client,
    override_current_user,
):
    list_response = client.get("/marketplace/requests", params={"clan_id": 0})
    detail_id_response = client.get("/marketplace/requests/0")
    detail_scope_response = client.get(
        "/marketplace/requests/1",
        params={"clan_id": 0},
    )

    assert list_response.status_code == 422, list_response.text
    assert detail_id_response.status_code == 422, detail_id_response.text
    assert detail_scope_response.status_code == 422, detail_scope_response.text
    assert "clan_id" in list_response.text
    assert "request_id" in detail_id_response.text
    assert "clan_id" in detail_scope_response.text


def test_marketplace_request_status_rejects_malformed_boundary_control(
    client,
    override_current_user,
):
    response = client.post("/marketplace/requests/1/status", json={"status": False})

    assert response.status_code == 422, response.text
    assert "status must be text" in response.text


def test_marketplace_request_status_rejects_non_positive_request_id(
    client,
    override_current_user,
):
    response = client.post(
        "/marketplace/requests/0/status",
        json={"status": "fulfilled"},
    )

    assert response.status_code == 422, response.text
    assert "request_id" in response.text


def test_marketplace_request_allows_five_open_requests_per_user_per_24_hours(
    client,
    override_current_user,
):
    _seed_primary_clan()

    for index in range(5):
        response = client.post(
            "/marketplace/requests",
            json={
                "clan_id": 1,
                "title": f"Need community item {index + 1}",
                "description": "Testing the pilot DemandBox quota.",
            },
        )
        assert response.status_code == 200, response.text

    blocked = client.post(
        "/marketplace/requests",
        json={
            "clan_id": 1,
            "title": "Need community item 6",
            "description": "This should wait for the next quota window.",
        },
    )

    assert blocked.status_code == 400, blocked.text
    assert "5 active DemandBox requests in 24 hours" in blocked.json()["detail"]
    assert _marketplace_request_counts() == (5, 5)


def test_marketplace_request_quota_ignores_open_requests_older_than_24_hours(
    client,
    override_current_user,
):
    _seed_primary_clan()
    old_created_at = datetime.now(timezone.utc) - timedelta(hours=25)
    future_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    with engine.begin() as conn:
        for index in range(5):
            conn.execute(
                text(
                    """
                    INSERT INTO marketplace_requests
                        (clan_id, user_id, title, description, urgency, status, created_at, expires_at)
                    VALUES
                        (1, 1, :title, 'Older open pilot request.', 'medium', 'open', :created_at, :expires_at)
                    """
                ),
                {
                    "title": f"Older DemandBox request {index + 1}",
                    "created_at": old_created_at,
                    "expires_at": future_expires_at,
                },
            )

    response = client.post(
        "/marketplace/requests",
        json={
            "clan_id": 1,
            "title": "Fresh community item",
            "description": "This should pass because older open requests are outside the 24-hour quota.",
        },
    )

    assert response.status_code == 200, response.text
    assert _marketplace_request_counts() == (6, 1)


def test_marketplace_request_requires_community_when_user_has_many():
    _seed_primary_clan()
    _add_second_clan_for_user()

    with SessionLocal() as db:
        with pytest.raises(HTTPException) as exc:
            marketplace_requests.create_marketplace_request(
                MarketplaceRequestCreate(
                    title="Need a painter",
                    description="Small room painting.",
                ),
                db=db,
                current_user=_fake_current_user(),
            )

    assert exc.value.status_code == 400
    assert "Choose the community" in exc.value.detail


def test_pool_summary_combines_member_communities():
    _seed_primary_clan()
    _add_second_clan_for_user()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO pool_events
                    (clan_id, user_id, event_type, amount, currency, reference)
                VALUES
                    (1, 1, 'deposit.confirmed', 100, 'NGN', 'R1'),
                    (2, 1, 'deposit.confirmed', 50, 'NGN', 'R2')
                """
            )
        )

    with SessionLocal() as db:
        data = pool.pool_me_summary(
            currency="NGN",
            db=db,
            current_user=_fake_current_user(),
        )

    assert data["communities_count"] == 2
    assert data["totals"]["available_balance"] == "150.00"
    assert len(data["items"]) == 2
