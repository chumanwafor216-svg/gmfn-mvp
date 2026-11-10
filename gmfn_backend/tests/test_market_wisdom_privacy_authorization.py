from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.core.security import create_access_token
from app.db.database import SessionLocal, engine
from app.db.models import User
from app.services import daily_insight_service, market_wisdom_commerce_signal_service
from app.services.demand_box_access_service import (
    PROTECTED_TARGET_MARKER,
    visible_open_request_count,
)


FIXED_NOW = datetime(2026, 11, 10, 12, 0, tzinfo=timezone.utc)


def _insert_users_clans_and_memberships() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES
                    (1, 'requester@example.com', 'hashed', 'user', 'GMFN-U-REQUESTER'),
                    (2, 'target@example.com', 'hashed', 'user', 'GMFN-U-TARGET'),
                    (3, 'long-target@example.com', 'hashed', 'user', 'GMFN-U-TARGET-EXTRA'),
                    (4, 'member@example.com', 'hashed', 'user', 'GMFN-U-MEMBER'),
                    (5, 'outsider@example.com', 'hashed', 'user', 'GMFN-U-OUTSIDER'),
                    (6, 'former@example.com', 'hashed', 'user', 'GMFN-U-FORMER')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, invite_code, status)
                VALUES
                    (1, 'Privacy Clan', 'PRIVACY-1', 'active'),
                    (2, 'Outside Clan', 'PRIVACY-2', 'active')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships
                    (id, clan_id, user_id, role, personal_pool_balance, left_at)
                VALUES
                    (1, 1, 1, 'member', 0, NULL),
                    (2, 1, 2, 'member', 0, NULL),
                    (3, 1, 3, 'member', 0, NULL),
                    (4, 1, 4, 'member', 0, NULL),
                    (5, 2, 5, 'member', 0, NULL),
                    (6, 1, 6, 'member', 0, :left_at)
                """
            ),
            {"left_at": FIXED_NOW - timedelta(days=1)},
        )


def _request_description(body: str) -> str:
    return f"{PROTECTED_TARGET_MARKER}\n\n{body}"


def test_visible_open_request_count_enforces_exact_target_and_active_membership():
    _insert_users_clans_and_memberships()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_requests
                    (id, clan_id, user_id, title, description, status, expires_at, created_at)
                VALUES
                    (1, 1, 1, 'General request', NULL, 'open', :future, :created),
                    (2, 1, 1, 'For @GMFN-U-TARGET', :target, 'open', :future, :created),
                    (3, 1, 1, 'For @GMFN-U-TARGET-EXTRA', :long_target, 'open', :future, :created),
                    (4, 1, 1, 'For @GMFN-U-MISSING', :missing, 'open', :future, :created),
                    (5, 1, 1, 'Expired general request', NULL, 'open', :expired, :created),
                    (6, 1, 1, 'Closed general request', NULL, 'closed', :future, :created)
                """
            ),
            {
                "future": FIXED_NOW + timedelta(days=2),
                "expired": FIXED_NOW - timedelta(seconds=1),
                "created": FIXED_NOW - timedelta(days=1),
                "target": _request_description("Please ask @GMFN-U-TARGET."),
                "long_target": _request_description("Please ask @GMFN-U-TARGET-EXTRA."),
                "missing": _request_description("Please ask @GMFN-U-MISSING."),
            },
        )

    expected = {
        1: (True, 4),
        2: (True, 2),
        3: (True, 2),
        4: (True, 1),
        5: (False, None),
        6: (False, None),
    }
    with SessionLocal() as db:
        for user_id, (available, count) in expected.items():
            result = visible_open_request_count(
                db,
                current_user=db.get(User, user_id),
                clan_id=1,
                now=FIXED_NOW,
            )
            assert result.available is available
            assert result.count == count


def test_visible_open_request_count_is_not_capped_for_analytics():
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES (1, 'uncapped@example.com', 'hashed', 'user', 'GMFN-U-UNCAPPED')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, invite_code, status)
                VALUES (1, 'Uncapped Clan', 'UNCAPPED-1', 'active')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships
                    (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 1, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_requests
                    (id, clan_id, user_id, title, status, expires_at, created_at)
                VALUES
                    (:id, 1, 1, :title, 'open', :future, :created)
                """
            ),
            [
                {
                    "id": request_id,
                    "title": f"General request {request_id}",
                    "future": FIXED_NOW + timedelta(days=2),
                    "created": FIXED_NOW - timedelta(days=1),
                }
                for request_id in range(1, 126)
            ],
        )

    with SessionLocal() as db:
        result = visible_open_request_count(
            db,
            current_user=db.get(User, 1),
            clan_id=1,
            now=FIXED_NOW,
        )

    assert result.available is True
    assert result.count == 125


def test_inaccessible_protected_request_does_not_change_recommendation(
    monkeypatch,
):
    _insert_users_clans_and_memberships()
    monkeypatch.setattr(daily_insight_service, "_now", lambda: FIXED_NOW)
    monkeypatch.setattr(
        market_wisdom_commerce_signal_service,
        "_now_utc",
        lambda: FIXED_NOW,
    )
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops
                    (id, clan_id, owner_user_id, shop_name, is_active, created_at)
                VALUES (1, 1, 2, 'Target Shop', 1, :created)
                """
            ),
            {"created": FIXED_NOW - timedelta(days=2)},
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products
                    (id, clan_id, shop_id, seller_user_id, title, visibility_mode, is_active, created_at)
                VALUES (1, 1, 1, 2, 'Visible service', 'community_visible', 1, :created)
                """
            ),
            {"created": FIXED_NOW - timedelta(days=1)},
        )

    with SessionLocal() as db:
        viewer = db.get(User, 2)
        before = daily_insight_service.recommend_market_wisdom(
            db,
            user=viewer,
            clan_id=1,
            context="marketplace",
            signals=["demand"],
        )

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_requests
                    (id, clan_id, user_id, title, description, status, expires_at, created_at)
                VALUES
                    (1, 1, 1, 'Private request for another member', :description, 'open', :future, :created)
                """
            ),
            {
                "description": _request_description("Please ask @GMFN-U-MEMBER."),
                "future": FIXED_NOW + timedelta(days=2),
                "created": FIXED_NOW,
            },
        )

    with SessionLocal() as db:
        after = daily_insight_service.recommend_market_wisdom(
            db,
            user=db.get(User, 2),
            clan_id=1,
            context="marketplace",
            signals=["demand"],
        )

    assert after == before
    assert after["commerce_signal"]["evidence_counts"]["open_community_demands"] == 0


def test_explicit_and_inferred_unauthorized_scopes_fail_before_any_write(
    client,
    override_current_user_user,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES (1, 'pytest@example.com', 'hashed', 'user', 'GMFN-U-OWNER')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, invite_code, status)
                VALUES (2, 'Unauthorized Clan', 'UNAUTH-2', 'active')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops
                    (id, clan_id, owner_user_id, shop_name, is_active, created_at)
                VALUES (1, 2, 1, 'Unauthorized Shop', 1, CURRENT_TIMESTAMP)
                """
            )
        )

    requests = [
        client.get("/market-wisdom/recommendation?clan_id=2"),
        client.get("/market-wisdom/recommendation"),
        client.get("/market-wisdom/recommendation?clan_id=999"),
        client.post(
            "/market-wisdom/exposures",
            json={"public_id": "MW-NOT-SEEDED", "action": "shown", "clan_id": 2},
        ),
        client.post(
            "/market-wisdom/exposures",
            json={"public_id": "MW-NOT-SEEDED", "action": "shown"},
        ),
        client.post(
            "/market-wisdom/feedback",
            json={"public_id": "MW-NOT-SEEDED", "action": "opened", "clan_id": 2},
        ),
        client.post(
            "/market-wisdom/feedback",
            json={"public_id": "MW-NOT-SEEDED", "action": "opened"},
        ),
    ]
    for response in requests:
        assert response.status_code == 404, response.text
        assert response.json()["detail"] == "Community not found."

    with engine.begin() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM market_wisdom_entries")).scalar_one() == 0
        assert conn.execute(text("SELECT COUNT(*) FROM market_wisdom_generation_runs")).scalar_one() == 0
        assert conn.execute(text("SELECT COUNT(*) FROM market_wisdom_exposures")).scalar_one() == 0


def test_general_scope_without_shop_or_community_remains_valid(
    client,
    override_current_user_user,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES (1, 'pytest@example.com', 'hashed', 'user', 'GMFN-U-GENERAL')
                """
            )
        )

    recommendation = client.get("/market-wisdom/recommendation?context=dashboard")
    assert recommendation.status_code == 200, recommendation.text
    public_id = recommendation.json()["recommendation"]["public_id"]
    assert recommendation.json()["commerce_signal"]["state"] == "no_owned_shop"

    exposure = client.post(
        "/market-wisdom/exposures",
        json={"public_id": public_id, "action": "shown"},
    )
    feedback = client.post(
        "/market-wisdom/feedback",
        json={"public_id": public_id, "action": "opened", "feedback": "helpful"},
    )
    assert exposure.status_code == 200, exposure.text
    assert feedback.status_code == 200, feedback.text

    with engine.begin() as conn:
        clan_ids = conn.execute(
            text("SELECT clan_id FROM market_wisdom_exposures ORDER BY id")
        ).scalars().all()
    assert clan_ids == [None, None]


def test_authorized_explicit_scope_preserves_shop_community_mismatch(
    client,
    override_current_user_user,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES (1, 'pytest@example.com', 'hashed', 'user', 'GMFN-U-MISMATCH')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, invite_code, status)
                VALUES
                    (1, 'Shop Clan', 'SHOP-1', 'active'),
                    (2, 'Selected Clan', 'SELECTED-2', 'active')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 2, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops
                    (id, clan_id, owner_user_id, shop_name, is_active, created_at)
                VALUES (1, 1, 1, 'Mismatch Shop', 1, CURRENT_TIMESTAMP)
                """
            )
        )

    response = client.get("/market-wisdom/recommendation?clan_id=2")
    assert response.status_code == 200, response.text
    assert response.json()["commerce_signal"]["state"] == "community_mismatch"


def test_shop_opportunity_engine_uses_actual_viewer_demand_authority(
    client,
    monkeypatch,
):
    monkeypatch.setenv("SECRET_KEY", "pytest-stage1-privacy-secret")
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES
                    (1, 'shop-owner@example.com', 'hashed', 'user', 'GMFN-U-SHOPOWNER'),
                    (2, 'requester@example.com', 'hashed', 'user', 'GMFN-U-REQUESTER'),
                    (3, 'other@example.com', 'hashed', 'user', 'GMFN-U-OTHER'),
                    (4, 'platform-admin@example.com', 'hashed', 'admin', 'GMFN-U-ADMIN')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, invite_code, status)
                VALUES (1, 'Analytics Clan', 'ANALYTICS-1', 'active')
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
                    (3, 1, 3, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops
                    (id, clan_id, owner_user_id, shop_name, is_active, created_at)
                VALUES (1, 1, 1, 'Analytics Shop', 1, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products
                    (id, clan_id, shop_id, seller_user_id, title, visibility_mode, is_active, created_at)
                VALUES (1, 1, 1, 1, 'Visible product', 'community_visible', 1, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_requests
                    (id, clan_id, user_id, title, description, status, expires_at, created_at)
                VALUES
                    (1, 1, 2, 'General need', NULL, 'open', :future, CURRENT_TIMESTAMP),
                    (2, 1, 2, 'For @GMFN-U-SHOPOWNER', :owner_target, 'open', :future, CURRENT_TIMESTAMP),
                    (3, 1, 2, 'For @GMFN-U-OTHER', :other_target, 'open', :future, CURRENT_TIMESTAMP)
                """
            ),
            {
                "future": datetime.now(timezone.utc) + timedelta(days=2),
                "owner_target": _request_description("Please ask @GMFN-U-SHOPOWNER."),
                "other_target": _request_description("Please ask @GMFN-U-OTHER."),
            },
        )

    owner_token = create_access_token({"sub": "shop-owner@example.com"})
    owner_response = client.get(
        "/marketplace/analytics/shops/1/summary",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert owner_response.status_code == 200, owner_response.text
    owner_engine = owner_response.json()["opportunity_engine"]
    assert owner_engine["demand_visibility"] == {
        "available": True,
        "count": 2,
        "state": "visible",
    }
    assert owner_engine["signal_groups"][2]["count"] == 2

    admin_token = create_access_token({"sub": "platform-admin@example.com"})
    admin_response = client.get(
        "/marketplace/analytics/shops/1/summary",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert admin_response.status_code == 200, admin_response.text
    admin_engine = admin_response.json()["opportunity_engine"]
    assert admin_engine["demand_visibility"] == {
        "available": False,
        "count": None,
        "state": "community_access_unavailable",
    }
    assert admin_engine["signal_groups"][0]["status"] == "Live"
    assert admin_engine["signal_groups"][0]["count"] == 1
    assert admin_engine["signal_groups"][2]["status"] == "Unavailable"
    assert admin_engine["signal_groups"][2]["count"] is None
    assert "not a zero-demand" in admin_engine["signal_groups"][2]["evidence"]
    assert admin_engine["evidence_ledger"][2]["records"] is None
    assert admin_engine["output_cards"][1]["confidence"] == "unavailable"
    assert "No demand interpretation" in admin_engine["output_cards"][1]["interpretation"]
