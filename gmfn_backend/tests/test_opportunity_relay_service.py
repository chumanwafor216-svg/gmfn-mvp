from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.auth import get_current_user
from app.db.database import SessionLocal, engine
from app.main import app
from app.services.demand_supply_intelligence_service import (
    REASON_RELAY_BOUNDARY_CROSSED,
    find_demands_for_supply,
    find_supply_for_demand,
)
from app.services.opportunity_relay_service import (
    OFFER_STATUS_ACCEPTED,
    OFFER_STATUS_CANCELLED,
    OFFER_STATUS_DECLINED,
    OFFER_STATUS_EXPIRED,
    OFFER_STATUS_OFFERED,
    RUN_STATUS_BOUNDARY_CROSSED,
    RUN_STATUS_EXPIRED,
    RUN_STATUS_OPEN,
    RelayConflict,
    RelayForbidden,
    RelayNotFound,
    accept_relay_offer,
    create_relay_run_for_demand,
    decline_relay_offer,
    discover_relay_target_candidates,
    expire_due_relay_offers,
)


PROTECTED_TARGET_MARKER = "[GSN_VISIBILITY_SCOPE:protected_target]"


class _CurrentUser:
    def __init__(self, user_id: int):
        self.id = int(user_id)
        self.email = f"relay-user-{int(user_id)}@example.com"
        self.role = "user"


def _override_current_user(user_id: int) -> None:
    app.dependency_overrides[get_current_user] = lambda: _CurrentUser(user_id)


def _clear_current_user_override() -> None:
    app.dependency_overrides.pop(get_current_user, None)


def _table_count(table_name: str) -> int:
    with engine.begin() as conn:
        return int(conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar_one())


def _seed_relay_base(*, demand_status: str = "open", protected: bool = False) -> None:
    description = "Kitchen needs painting near Ajah"
    if protected:
        description = f"{PROTECTED_TARGET_MARKER}\n\n{description}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=1)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id, display_name, trust_score)
                VALUES
                    (1, 'requester@example.com', 'hashed', 'member', 'GSN-U-REQ', 'Requester', 10),
                    (2, 'bridge-one@example.com', 'hashed', 'member', 'GSN-U-BRIDGE1', 'Bridge One', 10),
                    (3, 'bridge-two@example.com', 'hashed', 'member', 'GSN-U-BRIDGE2', 'Bridge Two', 10),
                    (4, 'bridge-three@example.com', 'hashed', 'member', 'GSN-U-BRIDGE3', 'Bridge Three', 10),
                    (5, 'seller-b@example.com', 'hashed', 'member', 'GSN-U-SELLERB', 'B Seller', 10),
                    (6, 'seller-c@example.com', 'hashed', 'member', 'GSN-U-SELLERC', 'C Seller', 10),
                    (7, 'inactive-bridge@example.com', 'hashed', 'member', 'GSN-U-INACTIVEBRIDGE', 'Inactive Bridge', 10)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, community_code, status, invite_code, invite_uses, created_at)
                VALUES
                    (1, 'Community A', 'A Marketplace', 'GMFN-C-000001', 'active', 'invite-a', 0, CURRENT_TIMESTAMP),
                    (2, 'Community B', 'B Marketplace', 'GMFN-C-000002', 'active', 'invite-b', 0, CURRENT_TIMESTAMP),
                    (3, 'Community C', 'C Marketplace', 'GMFN-C-000003', 'active', 'invite-c', 0, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance, left_at)
                VALUES
                    (1, 1, 1, 'member', 0, NULL),
                    (2, 1, 2, 'member', 0, NULL),
                    (3, 2, 2, 'member', 0, NULL),
                    (4, 1, 3, 'member', 0, NULL),
                    (5, 2, 3, 'member', 0, NULL),
                    (6, 1, 4, 'member', 0, NULL),
                    (7, 2, 4, 'member', 0, NULL),
                    (8, 2, 5, 'member', 0, NULL),
                    (9, 3, 6, 'member', 0, NULL),
                    (10, 1, 7, 'member', 0, NULL),
                    (11, 2, 7, 'member', 0, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_requests (
                    id, clan_id, user_id, title, description, category, urgency,
                    area, payment_mode, allow_trust_credit, status, expires_at, created_at
                )
                VALUES (
                    1000, 1, 1, 'Need a painter', :description, 'painting', 'medium',
                    'Ajah', 'cash', 0, :status, :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {"description": description, "status": demand_status, "expires_at": expires_at},
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (id, clan_id, owner_user_id, shop_name, description, is_active, created_at)
                VALUES
                    (20, 2, 5, 'B Painting Shop', 'Painting in Ajah', 1, CURRENT_TIMESTAMP),
                    (30, 3, 6, 'C Painting Shop', 'Painting in Ajah', 1, CURRENT_TIMESTAMP)
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
                    (2000, 2, 20, 5, 'Painter service', 'Painting rooms in Ajah', NULL, 'NGN', NULL, NULL, 'community_visible', 1, CURRENT_TIMESTAMP),
                    (3000, 3, 30, 6, 'Painter service in C', 'Painting rooms in Ajah', NULL, 'NGN', NULL, NULL, 'community_visible', 1, CURRENT_TIMESTAMP)
                """
            )
        )


def _offer_rows() -> list[tuple[int, int, str, int | None]]:
    with engine.begin() as conn:
        return conn.execute(
            text(
                """
                SELECT id, bridge_user_id, status, notification_id
                FROM opportunity_relay_offers
                ORDER BY id ASC
                """
            )
        ).fetchall()


def test_relay_discovers_only_overlap_targets_with_plausible_supply():
    _seed_relay_base()
    with SessionLocal() as db:
        candidates = discover_relay_target_candidates(db, request_id=1000, current_user_id=1)

    assert [candidate.target_clan_id for candidate in candidates] == [2]
    assert candidates[0].bridge_user_ids == (2, 3, 4)
    assert candidates[0].supply_match_count == 1


def test_candidate_api_is_privacy_safe_and_does_not_enumerate_hidden_supply(client, override_current_user_user):
    _seed_relay_base()

    response = client.get("/marketplace/requests/1000/relay-candidates")

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["has_relay_candidate"] is True
    assert "candidate_boundary_count" not in data
    assert "target_clan_id" not in data
    assert "product" not in str(data).lower()
    assert "seller" not in str(data).lower()
    assert _table_count("opportunity_relay_runs") == 0
    assert _table_count("notifications") == 0
    assert _table_count("trust_events") == 0


def test_requester_relay_run_response_hides_bridge_pool_counts(client, override_current_user_user, monkeypatch):
    _seed_relay_base()
    monkeypatch.setenv("GSN_OPPORTUNITY_RELAY_MAX_ACTIVE_OFFERS", "3")

    response = client.post("/marketplace/requests/1000/relay-runs")

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == RUN_STATUS_OPEN
    assert data["response_window_seconds"] > 0
    assert data["expires_at"]
    assert "max_active_offers" not in data
    assert "offer_count" not in data
    assert "accepted_offer_count" not in data
    assert "declined_offer_count" not in data
    assert "expired_offer_count" not in data
    assert "cancelled_offer_count" not in data
    assert "target_clan_id" not in data
    assert "boundary_crossed_by_user_id" not in data
    assert "community b" not in str(data).lower()


def test_relay_creation_uses_bounded_wave_and_excludes_inactive_members(monkeypatch):
    _seed_relay_base()
    monkeypatch.setenv("GSN_OPPORTUNITY_RELAY_MAX_ACTIVE_OFFERS", "2")
    before_trust_events = _table_count("trust_events")

    with SessionLocal() as db:
        run = create_relay_run_for_demand(db, request_id=1000, current_user_id=1)
        response = run.status

    offers = _offer_rows()
    assert response == RUN_STATUS_OPEN
    assert _table_count("opportunity_relay_runs") == 1
    assert len(offers) == 2
    assert [row[1] for row in offers] == [2, 3]
    assert 7 not in [row[1] for row in offers]
    assert _table_count("notifications") == 2
    assert _table_count("trust_events") == before_trust_events


def test_o1_cannot_return_b_supply_before_crossing_but_can_after_accept(monkeypatch):
    _seed_relay_base()
    monkeypatch.setenv("GSN_OPPORTUNITY_RELAY_MAX_ACTIVE_OFFERS", "2")

    with SessionLocal() as db:
        before = find_supply_for_demand(db, demand_id=1000, current_user_id=1)
        run = create_relay_run_for_demand(db, request_id=1000, current_user_id=1)
        offer_id = _offer_rows()[0][0]
        accepted = accept_relay_offer(db, offer_id=offer_id, current_user_id=2)
        after = find_supply_for_demand(db, demand_id=1000, current_user_id=1)
        reciprocal = find_demands_for_supply(db, product_id=2000, current_user_id=5)

    assert before == []
    assert int(run.target_clan_id) == 2
    assert accepted.status == RUN_STATUS_BOUNDARY_CROSSED
    assert [match["product_id"] for match in after] == [2000]
    assert REASON_RELAY_BOUNDARY_CROSSED in after[0]["reason_codes"]
    assert [match["demand_id"] for match in reciprocal] == [1000]


def test_accept_is_idempotent_atomic_and_cancels_competing_offers(monkeypatch):
    _seed_relay_base()
    monkeypatch.setenv("GSN_OPPORTUNITY_RELAY_MAX_ACTIVE_OFFERS", "3")
    with SessionLocal() as db:
        create_relay_run_for_demand(db, request_id=1000, current_user_id=1)
        offers = _offer_rows()
        winning_offer_id = offers[0][0]
        competing_offer_id = offers[1][0]
        first = accept_relay_offer(db, offer_id=winning_offer_id, current_user_id=2)
        second = accept_relay_offer(db, offer_id=winning_offer_id, current_user_id=2)
        with pytest.raises(RelayConflict):
            accept_relay_offer(db, offer_id=competing_offer_id, current_user_id=3)

    statuses = {row[1]: row[2] for row in _offer_rows()}
    assert first.id == second.id
    assert first.status == RUN_STATUS_BOUNDARY_CROSSED
    assert statuses[2] == OFFER_STATUS_ACCEPTED
    assert statuses[3] == OFFER_STATUS_CANCELLED
    assert statuses[4] == OFFER_STATUS_CANCELLED
    assert _table_count("trust_events") == 0


def test_database_prevents_two_accepted_offers_for_one_run(monkeypatch):
    _seed_relay_base()
    monkeypatch.setenv("GSN_OPPORTUNITY_RELAY_MAX_ACTIVE_OFFERS", "3")
    with SessionLocal() as db:
        create_relay_run_for_demand(db, request_id=1000, current_user_id=1)
        offers = _offer_rows()
        accept_relay_offer(db, offer_id=offers[0][0], current_user_id=2)
        competing_offer_id = offers[1][0]

    with pytest.raises(IntegrityError):
        with engine.begin() as conn:
            conn.execute(
                text("UPDATE opportunity_relay_offers SET status='accepted' WHERE id=:id"),
                {"id": competing_offer_id},
            )

    statuses = [row[2] for row in _offer_rows()]
    assert statuses.count(OFFER_STATUS_ACCEPTED) == 1


def test_decline_and_expiry_do_not_cross_boundary(monkeypatch):
    _seed_relay_base()
    monkeypatch.setenv("GSN_OPPORTUNITY_RELAY_MAX_ACTIVE_OFFERS", "2")
    with SessionLocal() as db:
        run = create_relay_run_for_demand(db, request_id=1000, current_user_id=1)
        run_id = int(run.id)
        offer_id = _offer_rows()[0][0]
        declined = decline_relay_offer(db, offer_id=offer_id, current_user_id=2, decline_reason="not now")
        declined_status = declined.status
        run.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        db.commit()
        changed = expire_due_relay_offers(db)

    assert declined_status == OFFER_STATUS_DECLINED
    assert changed == 1
    with engine.begin() as conn:
        run_status = conn.execute(text("SELECT status FROM opportunity_relay_runs WHERE id=:id"), {"id": run_id}).scalar_one()
        offer_statuses = [row[0] for row in conn.execute(text("SELECT status FROM opportunity_relay_offers ORDER BY id"))]
    assert run_status == RUN_STATUS_EXPIRED
    assert OFFER_STATUS_ACCEPTED not in offer_statuses
    assert OFFER_STATUS_EXPIRED in offer_statuses
    assert _table_count("trust_events") == 0


def test_closed_demand_and_membership_loss_prevent_late_crossing(monkeypatch):
    _seed_relay_base()
    monkeypatch.setenv("GSN_OPPORTUNITY_RELAY_MAX_ACTIVE_OFFERS", "2")
    with SessionLocal() as db:
        create_relay_run_for_demand(db, request_id=1000, current_user_id=1)
        offers = _offer_rows()
        first_offer_id = offers[0][0]
        second_offer_id = offers[1][0]
        db.execute(text("UPDATE marketplace_requests SET status='fulfilled' WHERE id=1000"))
        db.commit()
        with pytest.raises(RelayConflict):
            accept_relay_offer(db, offer_id=first_offer_id, current_user_id=2)

        db.execute(text("UPDATE marketplace_requests SET status='open' WHERE id=1000"))
        db.execute(
            text("UPDATE clan_memberships SET left_at=CURRENT_TIMESTAMP WHERE clan_id=2 AND user_id=3")
        )
        db.commit()
        with pytest.raises(RelayForbidden):
            accept_relay_offer(db, offer_id=second_offer_id, current_user_id=3)

    assert _table_count("trust_events") == 0


def test_relay_notification_payload_is_actionable_and_privacy_safe_for_bridge(client):
    _seed_relay_base()
    with SessionLocal() as db:
        create_relay_run_for_demand(db, request_id=1000, current_user_id=1)
    offer_id = _offer_rows()[0][0]

    _override_current_user(2)
    try:
        response = client.get("/notifications/me")
    finally:
        _clear_current_user_override()

    assert response.status_code == 200, response.text
    data = response.json()
    relay_items = [item for item in data["items"] if item["kind"] == "opportunity_relay.offer"]
    assert len(relay_items) == 1
    item = relay_items[0]
    assert item["action_label"] == "Help connect"
    assert f"relay_offer_id={offer_id}" in item["action_url"]
    relay_offer = item["relay_offer"]
    assert relay_offer["offer_id"] == offer_id
    assert relay_offer["opportunity_category"] == "painting"
    assert relay_offer["opportunity_area"] == "Ajah"
    assert relay_offer["actions"] == ["Help connect", "Not now"]
    assert relay_offer["not_recommendation"] is True
    assert relay_offer["not_endorsement"] is True
    assert relay_offer["not_payment_proof"] is True

    flat = str(item).lower()
    assert "requester" not in flat
    assert "seller" not in flat
    assert "community b" not in flat
    assert "target_clan_id" not in flat
    assert "trust_score" not in flat
    assert "cci" not in flat


def test_relay_offer_actions_are_only_available_to_intended_bridge(client):
    _seed_relay_base()
    with SessionLocal() as db:
        create_relay_run_for_demand(db, request_id=1000, current_user_id=1)
    offer_id = _offer_rows()[0][0]

    _override_current_user(3)
    try:
        forbidden_accept = client.post(f"/opportunity-relays/offers/{offer_id}/accept")
        forbidden_decline = client.post(
            f"/opportunity-relays/offers/{offer_id}/decline",
            json={"decline_reason": "not mine"},
        )
    finally:
        _clear_current_user_override()

    assert forbidden_accept.status_code == 404
    assert forbidden_decline.status_code == 404

    _override_current_user(2)
    try:
        accepted = client.post(f"/opportunity-relays/offers/{offer_id}/accept")
    finally:
        _clear_current_user_override()

    assert accepted.status_code == 200, accepted.text
    body = accepted.json()
    assert body["status"] == RUN_STATUS_BOUNDARY_CROSSED
    assert body["boundary_crossed_at"]
    assert "target_clan_id" not in body
    assert "boundary_crossed_by_user_id" not in body
    assert "max_active_offers" not in body
    assert "offer_count" not in body
    assert "accepted_offer_count" not in body
    assert "declined_offer_count" not in body
    assert "expired_offer_count" not in body
    assert "cancelled_offer_count" not in body
    assert _table_count("trust_events") == 0


def test_not_now_declines_relay_offer_without_crossing_or_trust_event(client):
    _seed_relay_base()
    with SessionLocal() as db:
        create_relay_run_for_demand(db, request_id=1000, current_user_id=1)
    offer_id = _offer_rows()[0][0]

    _override_current_user(2)
    try:
        response = client.post(
            f"/opportunity-relays/offers/{offer_id}/decline",
            json={"decline_reason": "Not now"},
        )
    finally:
        _clear_current_user_override()

    assert response.status_code == 200, response.text
    assert response.json()["status"] == OFFER_STATUS_DECLINED
    with engine.begin() as conn:
        run_status = conn.execute(text("SELECT status FROM opportunity_relay_runs")).scalar_one()
    assert run_status == RUN_STATUS_OPEN
    assert _table_count("trust_events") == 0


def test_protected_target_demand_cannot_be_used_for_relay_probe():
    _seed_relay_base(protected=True)
    with SessionLocal() as db:
        with pytest.raises(RelayNotFound):
            discover_relay_target_candidates(db, request_id=1000, current_user_id=1)

    assert _table_count("opportunity_relay_runs") == 0
    assert _table_count("notifications") == 0
    assert _table_count("trust_events") == 0
