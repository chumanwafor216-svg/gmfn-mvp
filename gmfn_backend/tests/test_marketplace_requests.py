import json
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import text

from app.api.routes import (
    analytics_liquidity,
    demand_box_interactions,
    guarantors_exposure,
    marketplace_requests,
    pool,
)
from app.core.auth import get_current_user
from app.db.database import SessionLocal, engine
from app.db.models import UserPayoutDestination
from app.main import app
from app.schemas.marketplace_requests import (
    MarketplaceProductEnquiryCreate,
    MarketplacePurchaseIntentionCreate,
    MarketplaceRequestCreate,
)
from app.services.notification_service import (
    list_my_notifications,
    mark_notification_read,
)


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _fake_current_user():
    return Obj(id=1, email="pytest@example.com", role="admin", gmfn_id="GSN-U-TEST")


def _fake_second_user():
    return Obj(id=2, email="responder@example.com", role="member", gmfn_id="GSN-U-RESPONDER")


def _fake_third_user():
    return Obj(id=3, email="third@example.com", role="member", gmfn_id="GSN-U-THIRD")


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




def _add_third_member_to_primary_clan() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES (3, 'third@example.com', 'hashed', 'member', 'GSN-U-THIRD')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships
                    (clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 3, 'member', 0)
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


def test_marketplace_request_uses_privacy_safe_requester_display_without_email():
    _seed_primary_clan()
    _add_second_member_to_primary_clan()

    with SessionLocal() as db:
        response = marketplace_requests.create_marketplace_request(
            MarketplaceRequestCreate(
                clan_id=1,
                title="Need electrician help",
                description="Socket repair needed before the weekend.",
                whatsapp_number="+447700900444",
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        created = response.model_dump()

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

    assert created["requester_email"] is None
    assert rows[0].requester_email is None
    assert created["requester_trust_score"] is None
    assert created["requester_trust_band"] is None
    assert rows[0].requester_trust_score is None
    assert rows[0].requester_trust_band is None
    assert created["requester_display_name"] == "GSN-U-TEST"
    assert rows[0].requester_display_name == "GSN-U-TEST"
    assert rows[0].requester_name == "GSN-U-TEST"
    assert "@" not in rows[0].requester_display_name
    assert rows[0].requester_gmfn_id == "GSN-U-TEST"
    assert rows[0].user_id == 1
    assert rows[0].whatsapp_number == "+447700900444"

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
            "action_url": "/app/demand-box?clan_id=1&queue=tagged&demand_id=1",
        },
        {
            "user_id": 1,
            "kind": "demand_posted",
            "title": "Your request is live",
            "action_url": "/app/demand-box?clan_id=1&queue=ask_community&demand_id=1",
        },
    ]


def test_marketplace_request_protected_target_is_only_visible_to_owner_and_matched_member():
    _seed_primary_clan()
    _add_second_member_to_primary_clan()
    _add_third_member_to_primary_clan()

    with SessionLocal() as db:
        response = marketplace_requests.create_marketplace_request(
            MarketplaceRequestCreate(
                clan_id=1,
                title="Please follow up privately with @GSN-U-RESPONDER",
                description="Member care follow-up after Sunday service.",
                category="Care follow-up",
                visibility_scope="protected_target",
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        data = response.model_dump()

        owner_rows = marketplace_requests.list_marketplace_requests(
            db=db,
            current_user=_fake_current_user(),
            status="open",
            category=None,
            urgency=None,
            area=None,
            mine_only=True,
            clan_id=1,
            limit=50,
        )
        target_rows = marketplace_requests.list_marketplace_requests(
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
        third_rows = marketplace_requests.list_marketplace_requests(
            db=db,
            current_user=_fake_third_user(),
            status="open",
            category=None,
            urgency=None,
            area=None,
            mine_only=False,
            clan_id=1,
            limit=50,
        )
        target_detail = marketplace_requests.get_marketplace_request(
            request_id=data["id"],
            db=db,
            current_user=_fake_second_user(),
            clan_id=1,
        )
        with pytest.raises(HTTPException) as third_detail_error:
            marketplace_requests.get_marketplace_request(
                request_id=data["id"],
                db=db,
                current_user=_fake_third_user(),
                clan_id=1,
            )

    with engine.begin() as conn:
        stored_description = conn.execute(
            text("SELECT description FROM marketplace_requests WHERE id = :id"),
            {"id": data["id"]},
        ).scalar_one()
        notices = conn.execute(
            text(
                """
                SELECT user_id, kind, title, action_url
                FROM notifications
                ORDER BY id ASC
                """
            )
        ).mappings().all()

    assert data["visibility_scope"] == "protected_target"
    assert data["source"] == "ask_person"
    assert data["source_label"] == "Ask Person"
    assert data["routing_status"] == "protected_member_targeted"
    assert data["routing_hint"] == "Protected request: visible only to the requester and matched target member."
    assert "protected_target" in data["queue_keys"]
    assert "GSN_VISIBILITY_SCOPE" not in (data["description"] or "")
    assert "GSN_VISIBILITY_SCOPE" in stored_description

    assert len(owner_rows) == 1
    assert len(target_rows) == 1
    assert target_rows[0].is_tagged_for_me is True
    assert target_rows[0].visibility_scope == "protected_target"
    assert target_detail.id == data["id"]
    assert third_rows == []
    assert third_detail_error.value.status_code == 404
    assert [dict(row) for row in notices] == [
        {
            "user_id": 2,
            "kind": "demand_tagged",
            "title": "Private request for you",
            "action_url": "/app/demand-box?clan_id=1&queue=tagged&demand_id=1",
        },
        {
            "user_id": 1,
            "kind": "demand_posted",
            "title": "Your request is live",
            "action_url": "/app/demand-box?clan_id=1&queue=tagged&demand_id=1",
        },
    ]


def test_tagged_demand_notification_is_actionable_only_while_unread_and_open():
    _seed_primary_clan()
    _add_second_member_to_primary_clan()

    with SessionLocal() as db:
        request = marketplace_requests.create_marketplace_request(
            MarketplaceRequestCreate(
                clan_id=1,
                title="Need dairy juice from @GSN-U-RESPONDER",
                description="Please confirm whether this can be supplied.",
                category="Groceries",
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        first_items = list_my_notifications(db, user_id=2)["items"]
        tagged = next(item for item in first_items if item["kind"] == "demand_tagged")
        assert tagged["attention_actionable"] is True
        assert tagged["action_url"].endswith(f"&demand_id={request.id}")

        mark_notification_read(
            db,
            user_id=2,
            notification_id=int(tagged["id"]),
        )
        read_items = list_my_notifications(db, user_id=2)["items"]
        read_tagged = next(item for item in read_items if item["id"] == tagged["id"])
        assert read_tagged["attention_actionable"] is False

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE notifications SET is_read = 0, read_at = NULL WHERE id = :id"),
            {"id": int(tagged["id"])},
        )
        conn.execute(
            text("UPDATE marketplace_requests SET status = 'closed' WHERE id = :id"),
            {"id": int(request.id)},
        )

    with SessionLocal() as db:
        closed_items = list_my_notifications(db, user_id=2)["items"]
        closed_tagged = next(item for item in closed_items if item["id"] == tagged["id"])
        assert closed_tagged["attention_actionable"] is False


def test_marketplace_request_rejects_protected_target_without_one_matched_member():
    _seed_primary_clan()
    _add_second_member_to_primary_clan()

    with SessionLocal() as db:
        with pytest.raises(HTTPException) as exc:
            marketplace_requests.create_marketplace_request(
                MarketplaceRequestCreate(
                    clan_id=1,
                    title="Please follow up privately with @UNKNOWN-HANDLE",
                    description="Private request should not fake delivery.",
                    visibility_scope="protected_target",
                ),
                db=db,
                current_user=_fake_current_user(),
            )

    assert exc.value.status_code == 400
    assert "exactly one matched GSN handle" in exc.value.detail

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
            "action_url": "/app/demand-box?clan_id=1&queue=ask_community&demand_id=1",
        },
        {
            "user_id": 1,
            "kind": "demand_posted",
            "title": "Your request is live",
            "action_url": "/app/demand-box?clan_id=1&queue=ask_community&demand_id=1",
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


def test_marketplace_request_allows_twenty_open_requests_per_user_per_24_hours(
    client,
    override_current_user,
):
    _seed_primary_clan()

    quota = marketplace_requests.MAX_REQUESTS_PER_USER_24H
    for index in range(quota):
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
            "title": f"Need community item {quota + 1}",
            "description": "This should wait for the next quota window.",
        },
    )

    assert blocked.status_code == 400, blocked.text
    assert f"{quota} active DemandBox requests in 24 hours" in blocked.json()["detail"]
    assert _marketplace_request_counts() == (quota, quota)


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


def test_marketplace_request_list_supports_offset_paging():
    _seed_primary_clan()
    _add_second_member_to_primary_clan()
    base_created_at = datetime.now(timezone.utc) - timedelta(minutes=10)
    future_expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

    with engine.begin() as conn:
        for index in range(3):
            conn.execute(
                text(
                    """
                    INSERT INTO marketplace_requests
                        (clan_id, user_id, title, description, urgency, status, created_at, expires_at)
                    VALUES
                        (1, 1, :title, 'Paging boundary request.', 'medium', 'open', :created_at, :expires_at)
                    """
                ),
                {
                    "title": f"Paged DemandBox request {index + 1}",
                    "created_at": base_created_at + timedelta(minutes=index),
                    "expires_at": future_expires_at,
                },
            )

    with SessionLocal() as db:
        rows = marketplace_requests.list_marketplace_requests(
            db=db,
            current_user=_fake_second_user(),
            status="open",
            category=None,
            urgency=None,
            area=None,
            mine_only=False,
            clan_id=1,
            limit=2,
            offset=1,
        )

    assert [row.title for row in rows] == [
        "Paged DemandBox request 2",
        "Paged DemandBox request 1",
    ]
    assert all(row.is_mine is False for row in rows)


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
                    (2, 1, 'deposit.confirmed', 50, 'NGN', 'R2'),
                    (1, 1, 'deposit.confirmed', 25, 'GBP', 'R3'),
                    (2, 1, 'deposit.confirmed', 10, 'GBP', 'R4')
                """
            )
        )

    with SessionLocal() as db:
        data = pool.pool_me_summary(
            currency="NGN",
            include_all_currencies=True,
            db=db,
            current_user=_fake_current_user(),
        )

    assert data["communities_count"] == 2
    assert data["totals"]["available_balance"] == "150.00"
    assert len(data["items"]) == 2
    summaries = {row["currency"]: row for row in data["currency_summaries"]}
    assert summaries["NGN"]["totals"]["available_balance"] == "150.00"
    assert summaries["GBP"]["totals"]["available_balance"] == "35.00"
    assert "membership_pool_balance" not in summaries["NGN"]["totals"]
    assert "membership_pool_balance" not in summaries["GBP"]["totals"]


def test_pool_summary_keeps_guarantee_locks_in_their_loan_currency():
    _seed_primary_clan()
    _add_second_member_to_primary_clan()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO loans
                    (id, borrower_user_id, amount, currency, status, clan_id, guarantors_required)
                VALUES
                    (101, 2, 100, 'GBP', 'approved', 1, 1),
                    (102, 2, 200, 'USD', 'approved', 1, 1)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO loan_guarantors
                    (
                        id,
                        loan_id,
                        clan_id,
                        guarantor_user_id,
                        pledge_amount,
                        status,
                        is_locked,
                        locked_amount,
                        released_amount
                    )
                VALUES
                    (101, 101, 1, 1, 40, 'approved', 1, 40, 5),
                    (102, 102, 1, 1, 60, 'approved', 1, 60, 10)
                """
            )
        )

    with SessionLocal() as db:
        data = pool.pool_me_summary(
            currency="GBP",
            include_all_currencies=True,
            db=db,
            current_user=_fake_current_user(),
        )

    assert data["totals"]["guarantee_locked_as_guarantor"] == "35.00"
    summaries = {row["currency"]: row for row in data["currency_summaries"]}
    assert summaries["GBP"]["totals"]["guarantee_locked_as_guarantor"] == "35.00"
    assert summaries["USD"]["totals"]["guarantee_locked_as_guarantor"] == "50.00"


def test_guarantor_exposure_can_be_read_one_currency_at_a_time():
    _seed_primary_clan()
    _add_second_member_to_primary_clan()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO loans
                    (id, borrower_user_id, amount, currency, status, clan_id, guarantors_required)
                VALUES
                    (201, 2, 100, 'GBP', 'approved', 1, 1),
                    (202, 2, 200, 'USD', 'approved', 1, 1)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO loan_guarantors
                    (
                        id,
                        loan_id,
                        clan_id,
                        guarantor_user_id,
                        pledge_amount,
                        status,
                        is_locked,
                        locked_amount,
                        released_amount
                    )
                VALUES
                    (201, 201, 1, 1, 40, 'approved', 1, 40, 5),
                    (202, 202, 1, 1, 60, 'approved', 1, 60, 10)
                """
            )
        )

    clan_ctx = (Obj(id=1), Obj(clan_id=1, user_id=1), _fake_current_user())
    with SessionLocal() as db:
        gbp = guarantors_exposure.my_guarantor_exposure(
            currency="GBP",
            db=db,
            clan_ctx=clan_ctx,
        )
        usd = guarantors_exposure.my_guarantor_exposure(
            currency="usd",
            db=db,
            clan_ctx=clan_ctx,
        )
        gbp_liquidity = analytics_liquidity.clan_liquidity(
            currency="GBP",
            db=db,
            clan_ctx=clan_ctx,
        )

    assert gbp["currency"] == "GBP"
    assert float(gbp["total_locked"]) == 40.0
    assert float(gbp["total_released"]) == 5.0
    assert usd["currency"] == "USD"
    assert float(usd["total_locked"]) == 60.0
    assert float(usd["total_released"]) == 10.0
    assert gbp_liquidity["currency"] == "GBP"
    assert gbp_liquidity["active_loans_count"] == 1
    assert float(gbp_liquidity["pledged_total"]) == 40.0
    assert float(gbp_liquidity["locked_total"]) == 40.0
    assert float(gbp_liquidity["released_total"]) == 5.0


def test_product_enquiry_reuses_protected_demand_box_and_is_idempotent():
    _seed_primary_clan()
    _add_second_member_to_primary_clan()
    _add_third_member_to_primary_clan()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, is_active, created_at
                )
                VALUES (11, 1, 2, 'Responder Shop', 1, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, visibility_mode, is_active, created_at
                )
                VALUES (
                    21, 1, 11, 2, 'Branded school bag', 'Children school bag',
                    '5000', 'NGN', 'community_visible', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )
    with SessionLocal() as db:
        first = marketplace_requests.create_marketplace_product_enquiry(
            MarketplaceProductEnquiryCreate(
                product_id=21,
                shop_id=11,
                clan_id=1,
                client_request_id="product-enquiry-1001",
                note="Please confirm colours and collection options.",
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        duplicate = marketplace_requests.create_marketplace_product_enquiry(
            MarketplaceProductEnquiryCreate(
                product_id=21,
                shop_id=11,
                clan_id=1,
                client_request_id="product-enquiry-1001",
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        retry_with_new_key = marketplace_requests.create_marketplace_product_enquiry(
            MarketplaceProductEnquiryCreate(
                product_id=21,
                shop_id=11,
                clan_id=1,
                client_request_id="product-enquiry-1002",
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        seller_rows = marketplace_requests.list_marketplace_requests(
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
        seller_detail = marketplace_requests.get_marketplace_request(
            request_id=first.id,
            db=db,
            current_user=_fake_second_user(),
            clan_id=1,
        )
        buyer_responses = demand_box_interactions.list_request_responses(
            request_id=first.id,
            db=db,
            current_user=_fake_current_user(),
        )
        seller_responses = demand_box_interactions.list_request_responses(
            request_id=first.id,
            db=db,
            current_user=_fake_second_user(),
        )
        seller_notifications = list_my_notifications(db, user_id=2, limit=20)
        with pytest.raises(HTTPException) as unrelated_detail_error:
            marketplace_requests.get_marketplace_request(
                request_id=first.id,
                db=db,
                current_user=_fake_third_user(),
                clan_id=1,
            )
        with pytest.raises(HTTPException) as unrelated_response_error:
            demand_box_interactions.list_request_responses(
                request_id=first.id,
                db=db,
                current_user=_fake_third_user(),
            )

    first_data = first.model_dump()
    duplicate_data = duplicate.model_dump()
    assert first_data["id"] == duplicate_data["id"]
    retry_with_new_key_data = retry_with_new_key.model_dump()
    assert first_data["id"] == retry_with_new_key_data["id"]
    assert first_data["title"] == "Buying: Branded school bag"
    assert first_data["visibility_scope"] == "protected_target"
    assert first_data["routing_status"] == "protected_member_targeted"
    assert first_data["product_context"] == {
        "product_id": 21,
        "shop_id": 11,
        "product_title": "Branded school bag",
        "shop_name": "Responder Shop",
        "listed_price": "5000",
        "currency": "NGN",
        "shop_path": "/shop/GSN-U-RESPONDER?product_id=21&clan_id=1&gsn_source=demand_box_product_enquiry",
    }
    assert len(seller_rows) == 1
    assert seller_rows[0].id == first.id
    assert seller_rows[0].product_context.product_id == 21
    assert seller_detail.product_context.shop_id == 11
    assert len(buyer_responses) == 1
    assert len(seller_responses) == 1
    assert buyer_responses[0].id == seller_responses[0].id
    assert buyer_responses[0].author_user_id == 1
    assert buyer_responses[0].recipient_user_id == 2
    assert buyer_responses[0].recipient_display_name == "GSN-U-RESPONDER"
    assert buyer_responses[0].recipient_gmfn_id == "GSN-U-RESPONDER"
    assert buyer_responses[0].text == "Please confirm colours and collection options."
    product_enquiry_notifications = [
        item
        for item in seller_notifications["items"]
        if item["title"] == "New product enquiry"
    ]
    assert len(product_enquiry_notifications) == 1
    assert product_enquiry_notifications[0]["action_url"] == (
        f"/app/demand-box?clan_id=1&queue=tagged&demand_id={first.id}"
    )
    assert unrelated_detail_error.value.status_code == 404
    assert unrelated_response_error.value.status_code == 404


def test_purchase_intention_is_private_structured_idempotent_and_allows_repeat_purchase():
    _seed_primary_clan()
    _add_second_member_to_primary_clan()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, is_active, created_at
                )
                VALUES (31, 1, 2, 'Responder Shop', 1, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, visibility_mode, is_active, created_at
                )
                VALUES (
                    41, 1, 31, 2, 'Leather shoes', 'Formal shoes',
                    '15', 'GBP', 'community_visible', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaigns (
                    id, owner_user_id, shop_id, origin_clan_id, source_product_id,
                    content_kind, content_fingerprint, status, source_kind,
                    commercial_mode, distribution_scope, created_at, activated_at
                ) VALUES (
                    51, 2, 31, 1, 41, 'broadcast_snapshot', :fingerprint,
                    'active', 'direct_broadcast', 'free', 'direct_communities',
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {"fingerprint": "a" * 64},
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, spotlight_campaign_id, clan_id, author_user_id, shop_id,
                    message, image_url, priority_mode, visibility_scope, created_at
                ) VALUES (
                    61, 51, 1, 2, 31, 'Leather shoes',
                    'https://cdn.example.test/shoes.jpg', 'free',
                    'direct_communities', CURRENT_TIMESTAMP
                )
                """
            )
        )

    with SessionLocal() as db:
        first = marketplace_requests.create_marketplace_purchase_intention(
            MarketplacePurchaseIntentionCreate(
                product_id=41,
                shop_id=31,
                clan_id=1,
                client_request_id="spotlight-buy-41-1001",
                intent_type="buy_now",
                quantity=2,
                fulfilment_method="delivery",
                origin_source="spotlight",
                origin_campaign_id=51,
                origin_broadcast_id=61,
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        duplicate = marketplace_requests.create_marketplace_purchase_intention(
            MarketplacePurchaseIntentionCreate(
                product_id=41,
                shop_id=31,
                clan_id=1,
                client_request_id="spotlight-buy-41-1001",
                intent_type="buy_now",
                quantity=2,
                fulfilment_method="delivery",
                origin_source="spotlight",
                origin_campaign_id=51,
                origin_broadcast_id=61,
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        reopened_active = marketplace_requests.create_marketplace_purchase_intention(
            MarketplacePurchaseIntentionCreate(
                product_id=41,
                shop_id=31,
                clan_id=1,
                client_request_id="shop-buy-41-1002",
                intent_type="buy_now",
                quantity=1,
                fulfilment_method="collection",
                origin_source="shop",
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        repeat_purchase = marketplace_requests.create_marketplace_purchase_intention(
            MarketplacePurchaseIntentionCreate(
                product_id=41,
                shop_id=31,
                clan_id=1,
                client_request_id="spotlight-buy-41-1003",
                intent_type="buy_now",
                quantity=1,
                fulfilment_method="collection",
                origin_source="spotlight",
                origin_campaign_id=51,
                origin_broadcast_id=61,
                start_new_transaction=True,
            ),
            db=db,
            current_user=_fake_current_user(),
        )
        seller_rows = marketplace_requests.list_marketplace_requests(
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
        responses = demand_box_interactions.list_request_responses(
            request_id=first.id,
            db=db,
            current_user=_fake_current_user(),
        )
        seller_notifications = list_my_notifications(db, user_id=2, limit=20)
        purchase_activity_detail = db.execute(
            text(
                """
                SELECT detail
                FROM marketplace_request_activities
                WHERE marketplace_request_id = :request_id
                  AND event_type = 'purchase_intention_created'
                """
            ),
            {"request_id": int(first.id)},
        ).scalar_one()
        with pytest.raises(HTTPException) as invalid_attribution_error:
            marketplace_requests.create_marketplace_purchase_intention(
                MarketplacePurchaseIntentionCreate(
                    product_id=41,
                    shop_id=31,
                    clan_id=1,
                    client_request_id="spotlight-buy-invalid-origin",
                    intent_type="buy_now",
                    quantity=1,
                    fulfilment_method="collection",
                    origin_source="spotlight",
                    origin_campaign_id=999,
                    origin_broadcast_id=61,
                ),
                db=db,
                current_user=_fake_current_user(),
            )
        with pytest.raises(HTTPException) as self_purchase_error:
            marketplace_requests.create_marketplace_purchase_intention(
                MarketplacePurchaseIntentionCreate(
                    product_id=41,
                    shop_id=31,
                    clan_id=1,
                    client_request_id="spotlight-buy-self-1001",
                    intent_type="buy_now",
                    quantity=1,
                    fulfilment_method="collection",
                    origin_source="spotlight",
                ),
                db=db,
                current_user=_fake_second_user(),
            )

    first_data = first.model_dump()
    assert first.id == duplicate.id
    assert reopened_active.id == first.id
    assert repeat_purchase.id != first.id
    assert first.purchase_continuation.model_dump() == {
        "reused_existing": False,
        "current_stage": "purchase_requested",
    }
    assert duplicate.purchase_continuation.model_dump() == {
        "reused_existing": True,
        "current_stage": "purchase_requested",
    }
    assert reopened_active.purchase_continuation.model_dump() == {
        "reused_existing": True,
        "current_stage": "purchase_requested",
    }
    assert reopened_active.commercial_intent.model_dump() == first.commercial_intent.model_dump()
    assert first_data["visibility_scope"] == "protected_target"
    assert first_data["routing_status"] == "protected_member_targeted"
    assert first_data["product_context"] == {
        "product_id": 41,
        "shop_id": 31,
        "product_title": "Leather shoes",
        "shop_name": "Responder Shop",
        "listed_price": "15",
        "currency": "GBP",
        "shop_path": "/shop/GSN-U-RESPONDER?product_id=41&clan_id=1&gsn_source=spotlight_purchase_intention",
    }
    assert first_data["commercial_intent"] == {
        "intent_type": "buy_now",
        "quantity": 2,
        "fulfilment_method": "delivery",
        "origin_source": "spotlight",
        "status": "purchase_requested",
        "unit_price": "15",
        "currency": "GBP",
    }
    assert len(seller_rows) == 2
    assert len(responses) == 1
    assert responses[0].author_user_id == 1
    assert responses[0].recipient_user_id == 2
    assert responses[0].text == (
        "Purchase request confirmed for Leather shoes.\n"
        "Quantity: 2.\n"
        "Fulfilment: Delivery.\n"
        "Please confirm availability, final price and terms. No agreement or payment has been made yet."
    )
    purchase_activity = json.loads(
        purchase_activity_detail.removeprefix("purchase_intention:v1:")
    )
    assert purchase_activity["origin_campaign_id"] == 51
    assert purchase_activity["origin_broadcast_id"] == 61
    purchase_notifications = [
        item
        for item in seller_notifications["items"]
        if item["title"] == "Private request for you"
    ]
    assert len(purchase_notifications) == 2
    assert not [
        item
        for item in seller_notifications["items"]
        if item["title"] == "New purchase request"
    ]
    assert invalid_attribution_error.value.status_code == 400
    assert self_purchase_error.value.status_code == 400


def test_spotlight_purchase_two_user_acceptance_recovers_same_transaction_after_reauthentication(
    client,
):
    _seed_primary_clan()
    _add_second_member_to_primary_clan()
    _add_third_member_to_primary_clan()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, is_active, created_at
                ) VALUES (131, 1, 2, 'Acceptance Seller Shop', 1, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, visibility_mode, is_active, created_at
                ) VALUES (
                    141, 1, 131, 2, 'Acceptance leather shoes', 'Isolated test product',
                    '15', 'GBP', 'community_visible', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaigns (
                    id, owner_user_id, shop_id, origin_clan_id, source_product_id,
                    content_kind, content_fingerprint, status, source_kind,
                    commercial_mode, distribution_scope, created_at, activated_at
                ) VALUES (
                    151, 2, 131, 1, 141, 'broadcast_snapshot', :fingerprint,
                    'active', 'direct_broadcast', 'free', 'direct_communities',
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {"fingerprint": "b" * 64},
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, spotlight_campaign_id, clan_id, author_user_id, shop_id,
                    message, image_url, priority_mode, visibility_scope, created_at
                ) VALUES (
                    161, 151, 1, 2, 131, 'Acceptance leather shoes',
                    'https://acceptance.invalid/shoes.jpg', 'free',
                    'direct_communities', CURRENT_TIMESTAMP
                )
                """
            )
        )

    with SessionLocal() as db:
        db.add(
            UserPayoutDestination(
                user_id=2,
                destination_name="Acceptance Seller",
                bank_name="GSN Test Bank",
                account_number="00000000",
                country="GB",
                currency="GBP",
                note="UK Sort code: 00-00-00",
                verification_status="recorded",
            )
        )
        db.commit()

    selected_user = {"value": _fake_current_user()}
    app.dependency_overrides[get_current_user] = lambda: selected_user["value"]
    purchase_payload = {
        "product_id": 141,
        "shop_id": 131,
        "clan_id": 1,
        "client_request_id": "spotlight-two-user-acceptance-141",
        "intent_type": "buy_now",
        "quantity": 1,
        "fulfilment_method": "delivery",
        "origin_source": "spotlight",
        "origin_campaign_id": 151,
        "origin_broadcast_id": 161,
    }

    try:
        created = client.post(
            "/marketplace/requests/product-purchase-intentions",
            json=purchase_payload,
        )
        assert created.status_code == 200, created.text
        request_id = int(created.json()["id"])

        replay = client.post(
            "/marketplace/requests/product-purchase-intentions",
            json=purchase_payload,
        )
        assert replay.status_code == 200, replay.text
        assert int(replay.json()["id"]) == request_id

        buyer_thread = client.get(f"/demand-box/requests/{request_id}/responses")
        assert buyer_thread.status_code == 200, buyer_thread.text
        assert len(buyer_thread.json()) == 1
        initial_response_id = int(buyer_thread.json()[0]["id"])

        selected_user["value"] = _fake_second_user()
        seller_notifications = client.get("/notifications/me?limit=20")
        assert seller_notifications.status_code == 200, seller_notifications.text
        purchase_notifications = [
            item
            for item in seller_notifications.json()["items"]
            if item["title"] == "Private request for you"
            and f"demand_id={request_id}" in item["action_url"]
        ]
        assert len(purchase_notifications) == 1

        seller_thread = client.get(f"/demand-box/requests/{request_id}/responses")
        assert seller_thread.status_code == 200, seller_thread.text
        assert [int(item["id"]) for item in seller_thread.json()] == [initial_response_id]

        trade_created = client.post(
            "/protected-trades",
            json={
                "clan_id": 1,
                "participant_role": "seller",
                "source_demand_id": request_id,
                "source_match_product_id": 141,
                "source_match_shop_id": 131,
                "item_title": "Acceptance leather shoes",
                "terms_summary": "One pair; buyer reports payment before delivery.",
                "amount": "15.00",
                "currency": "GBP",
                "meta": {
                    "source": "isolated_two_user_acceptance",
                    "quantity": "1",
                    "payment_timing": "pay_now",
                },
            },
        )
        assert trade_created.status_code == 201, trade_created.text
        trade_id = int(trade_created.json()["id"])
        assert int(trade_created.json()["buyer_user_id"]) == 1
        assert int(trade_created.json()["seller_user_id"]) == 2
        assert int(trade_created.json()["meta"]["source_demand_id"]) == request_id

        selected_user["value"] = _fake_third_user()
        unrelated_thread = client.get(f"/demand-box/requests/{request_id}/responses")
        assert unrelated_thread.status_code == 404
        unrelated_trade = client.get(f"/protected-trades/{trade_id}")
        assert unrelated_trade.status_code == 403

        selected_user["value"] = _fake_current_user()
        accepted = client.post(
            f"/protected-trades/{trade_id}/events",
            json={
                "event_type": "terms.agreed",
                "note": "Buyer accepted the isolated seller-issued terms.",
            },
        )
        assert accepted.status_code == 201, accepted.text

        selected_user["value"] = _fake_second_user()
        payment_reference = client.post(
            f"/protected-trades/{trade_id}/payment-reference"
        )
        assert payment_reference.status_code == 201, payment_reference.text
        payment_payload = payment_reference.json()
        assert payment_payload["direct_to_seller"] is True
        assert payment_payload["automatic_bank_reconciliation"] is False

        app.dependency_overrides.pop(get_current_user, None)
        signed_out = client.get(f"/protected-trades/{trade_id}")
        assert signed_out.status_code in {401, 403}

        app.dependency_overrides[get_current_user] = lambda: selected_user["value"]
        selected_user["value"] = _fake_current_user()
        recovered = client.get(f"/protected-trades/{trade_id}")
        assert recovered.status_code == 200, recovered.text
        recovered_payload = recovered.json()
        assert int(recovered_payload["id"]) == trade_id
        assert recovered_payload["status"] == "payment_instructed"
        assert int(recovered_payload["expected_payment_id"]) == int(
            payment_payload["expected_payment_id"]
        )
        assert [event["event_type"] for event in recovered_payload["events"]][-2:] == [
            "protected_trade.terms.agreed",
            "protected_trade.payment.instruction_added",
        ]

        payment_reported = client.post(
            f"/protected-trades/{trade_id}/events",
            json={
                "event_type": "payment.claimed",
                "expected_payment_id": payment_payload["expected_payment_id"],
                "note": "Buyer reported a simulated external transfer; no bank confirmation.",
            },
        )
        assert payment_reported.status_code == 201, payment_reported.text

        selected_user["value"] = _fake_second_user()
        payment_received = client.post(
            f"/protected-trades/{trade_id}/events",
            json={
                "event_type": "payment.received",
                "note": "Seller acknowledged the simulated payment report.",
            },
        )
        assert payment_received.status_code == 201, payment_received.text
        released = client.post(
            f"/protected-trades/{trade_id}/events",
            json={
                "event_type": "release.recorded",
                "note": "Seller recorded fulfilment in the isolated acceptance run.",
            },
        )
        assert released.status_code == 201, released.text

        selected_user["value"] = _fake_current_user()
        receipt = client.post(
            f"/protected-trades/{trade_id}/events",
            json={
                "event_type": "receipt.confirmed",
                "note": "Buyer confirmed receipt in the isolated acceptance run.",
            },
        )
        assert receipt.status_code == 201, receipt.text
        completed = client.get(f"/protected-trades/{trade_id}")
        assert completed.status_code == 200, completed.text
        completed_payload = completed.json()
        assert completed_payload["status"] == "received"
        assert completed_payload["payment_status"] == "seller_confirmed_received"
        assert completed_payload["release_status"] == "released"
        assert completed_payload["receipt_status"] == "received"
        assert completed_payload["derived_outcome_state"] == "MUTUALLY_CONFIRMED"

        reopened_from_shop = client.post(
            "/marketplace/requests/product-purchase-intentions",
            json={
                **purchase_payload,
                "client_request_id": "shop-two-user-reopen-141",
                "quantity": 2,
                "fulfilment_method": "collection",
                "origin_source": "shop",
                "origin_campaign_id": None,
                "origin_broadcast_id": None,
            },
        )
        assert reopened_from_shop.status_code == 200, reopened_from_shop.text
        reopened_payload = reopened_from_shop.json()
        assert int(reopened_payload["id"]) == request_id
        assert reopened_payload["purchase_continuation"] == {
            "reused_existing": True,
            "current_stage": "received",
        }
        assert reopened_payload["commercial_intent"] == {
            "intent_type": "buy_now",
            "quantity": 1,
            "fulfilment_method": "delivery",
            "origin_source": "spotlight",
            "status": "purchase_requested",
            "unit_price": "15",
            "currency": "GBP",
        }

        with SessionLocal() as db:
            counts = {
                "requests": db.execute(
                    text(
                        "SELECT COUNT(*) FROM marketplace_requests "
                        "WHERE client_request_id = :client_request_id"
                    ),
                    {"client_request_id": purchase_payload["client_request_id"]},
                ).scalar_one(),
                "threads": db.execute(
                    text(
                        "SELECT COUNT(*) FROM marketplace_request_responses "
                        "WHERE marketplace_request_id = :request_id"
                    ),
                    {"request_id": request_id},
                ).scalar_one(),
                "trades": db.execute(
                    text(
                        "SELECT COUNT(*) FROM protected_trade_records "
                        "WHERE id = :trade_id"
                    ),
                    {"trade_id": trade_id},
                ).scalar_one(),
            }
        assert counts == {"requests": 1, "threads": 1, "trades": 1}
    finally:
        app.dependency_overrides.pop(get_current_user, None)
