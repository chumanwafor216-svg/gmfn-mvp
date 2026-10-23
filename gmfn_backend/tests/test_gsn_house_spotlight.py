from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy import text

from app.api.routes import marketplace as marketplace_routes
from app.db.database import SessionLocal, engine
from app.services.spotlight_opportunity_eligibility_service import (
    REJECTION_GSN_HOUSE_ADVERTISING_EXCLUDED,
    evaluate_spotlight_eligibility,
)
from app.services.spotlight_pacing_state_service import (
    SPOTLIGHT_GSN_HOUSE_PILOT_MAX_DELIVERY_ROUNDS,
    get_or_create_spotlight_campaign_pacing_state,
)


def _seed_house_campaign_destinations() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id)
                VALUES
                    (1, 'platform-admin@example.com', 'hashed', 'Platform Admin', 'admin', 'GSN-U-ADMIN'),
                    (2, 'domain-owner@example.com', 'hashed', 'Domain Owner', 'user', 'GSN-U-OWNER'),
                    (3, 'viewer@example.com', 'hashed', 'Community Viewer', 'user', 'GSN-U-VIEWER')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, marketplace_name, community_code, invite_code,
                    status, invite_uses, created_at
                ) VALUES
                    (1, 'Opted In Community', 'Opted In Market', 'GSN-C-000001', 'HOUSE-1', 'active', 0, CURRENT_TIMESTAMP),
                    (2, 'No Advertising Policy', 'No Policy Market', 'GSN-C-000002', 'HOUSE-2', 'active', 0, CURRENT_TIMESTAMP),
                    (3, 'Spotlight Disabled', 'Disabled Market', 'GSN-C-000003', 'HOUSE-3', 'active', 0, CURRENT_TIMESTAMP),
                    (9, 'No Community Domain', 'No Domain Market', 'GMFN-C-000009', 'HOUSE-9', 'active', 0, CURRENT_TIMESTAMP),
                    (10, 'Advertising Excluded', 'Excluded Market', 'GSN-C-000010', 'HOUSE-10', 'active', 0, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 1, 3, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO community_domains (
                    id, domain_name, display_name, domain_type, template_key,
                    owner_user_id, clan_id, status, verification_status,
                    created_at, updated_at
                ) VALUES
                    (101, 'opted-in', 'Opted In Domain', 'generic_association', 'generic_association', 2, 1, 'active', 'verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    (102, 'no-policy', 'No Policy Domain', 'generic_association', 'generic_association', 2, 2, 'active', 'verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    (103, 'spotlight-off', 'Spotlight Disabled Domain', 'generic_association', 'generic_association', 2, 3, 'active', 'verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    (110, 'advertising-excluded', 'Advertising Excluded Domain', 'generic_association', 'generic_association', 2, 10, 'active', 'verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )
        policies = [
            {
                "id": 201,
                "domain_id": 101,
                "policy_key": "domain.central_advertising",
                "action_key": "domain.central_advertising.configure",
                "summary": "Allow GSN house campaigns",
                "config": json.dumps({"allow_gsn_house_campaigns": True}),
            },
            {
                "id": 202,
                "domain_id": 103,
                "policy_key": "domain.central_advertising",
                "action_key": "domain.central_advertising.configure",
                "summary": "Allow GSN house campaigns",
                "config": json.dumps({"allow_gsn_house_campaigns": True}),
            },
            {
                "id": 203,
                "domain_id": 103,
                "policy_key": "domain.feature_policy",
                "action_key": "domain.features.configure",
                "summary": "Disable Spotlight",
                "config": json.dumps({"features": {"spotlight": "off"}}),
            },
            {
                "id": 210,
                "domain_id": 110,
                "policy_key": "domain.central_advertising",
                "action_key": "domain.central_advertising.configure",
                "summary": "Exclude GSN house campaigns",
                "config": json.dumps({"allow_gsn_house_campaigns": False}),
            },
        ]
        conn.execute(
            text(
                """
                INSERT INTO community_domain_policies (
                    id, community_domain_id, policy_key, action_key, scope_type,
                    review_mode, required_role, status, policy_summary,
                    config_json, created_by_user_id, created_at, updated_at
                ) VALUES (
                    :id, :domain_id, :policy_key, :action_key, 'domain',
                    'domain_admin_review', 'owner_admin', 'active', :summary,
                    :config, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            policies,
        )


def test_house_campaign_routes_require_platform_admin(
    client,
    override_current_user_user,
) -> None:
    _seed_house_campaign_destinations()

    preview = client.post(
        "/marketplace/admin/gsn-house-campaigns/preview",
        json={"clan_ids": [1]},
    )
    destinations = client.get(
        "/marketplace/admin/gsn-house-campaigns/destinations",
    )
    campaigns = client.get("/marketplace/admin/gsn-house-campaigns")
    discard = client.post(
        "/marketplace/admin/gsn-house-campaigns/media/discard",
        json={"media_url": "/uploads/marketplace/images/review.jpg"},
    )
    stop = client.post(
        "/marketplace/admin/gsn-house-campaigns/1/stop",
        json={"reason": "Permission check", "confirm_withdrawal": True},
    )
    publish = client.post(
        "/marketplace/admin/gsn-house-campaigns",
        json={
            "clan_ids": [1],
            "message": "GSN service announcement",
            "image_url": "https://cdn.example.test/gsn/house.jpg",
            "idempotency_key": "gsn-house-permission-check",
        },
    )

    assert preview.status_code == 403, preview.text
    assert destinations.status_code == 403, destinations.text
    assert campaigns.status_code == 403, campaigns.text
    assert discard.status_code == 403, discard.text
    assert stop.status_code == 403, stop.text
    assert publish.status_code == 403, publish.text


def test_house_campaign_destination_catalogue_is_named_and_governed(
    client,
    override_current_user,
) -> None:
    _seed_house_campaign_destinations()

    all_destinations = client.get(
        "/marketplace/admin/gsn-house-campaigns/destinations",
    )
    searched = client.get(
        "/marketplace/admin/gsn-house-campaigns/destinations",
        params={"q": "Disabled"},
    )
    missing_domain_by_name = client.get(
        "/marketplace/admin/gsn-house-campaigns/destinations",
        params={"q": "No Community Domain"},
    )
    missing_domain_by_code = client.get(
        "/marketplace/admin/gsn-house-campaigns/destinations",
        params={"q": "GMFN-C-000009"},
    )

    assert all_destinations.status_code == 200, all_destinations.text
    all_body = all_destinations.json()
    assert all_body["returned_count"] == 5
    assert all_body["eligible_count"] == 3
    assert all_body["excluded_count"] == 2
    assert {
        row["community_name"]: row["community_code"]
        for row in all_body["items"]
    } == {
        "Opted In Market": "GSN-C-000001",
        "No Policy Market": "GSN-C-000002",
        "Disabled Market": "GSN-C-000003",
        "No Domain Market": "GMFN-C-000009",
        "Excluded Market": "GSN-C-000010",
    }
    assert {
        row["community_name"]: row["reason_code"]
        for row in all_body["items"]
    } == {
        "Opted In Market": "eligible",
        "No Policy Market": "eligible",
        "Disabled Market": "community_domain_spotlight_disabled",
        "No Domain Market": "eligible_free_community",
        "Excluded Market": "gsn_house_campaign_excluded",
    }

    assert searched.status_code == 200, searched.text
    searched_body = searched.json()
    assert searched_body["returned_count"] == 1
    assert searched_body["items"][0]["community_domain_name"] == "Spotlight Disabled Domain"
    assert searched_body["items"][0]["reason_code"] == "community_domain_spotlight_disabled"

    for response in (missing_domain_by_name, missing_domain_by_code):
        assert response.status_code == 200, response.text
        missing_body = response.json()
        assert missing_body["matching_total"] == 1
        assert missing_body["returned_count"] == 1
        assert missing_body["items"][0]["community_code"] == "GMFN-C-000009"
        assert missing_body["items"][0]["eligible"] is True
        assert missing_body["items"][0]["reason_code"] == "eligible_free_community"


def test_house_campaign_preview_defaults_free_communities_and_respects_exclusions(
    client,
    override_current_user,
) -> None:
    _seed_house_campaign_destinations()

    response = client.post(
        "/marketplace/admin/gsn-house-campaigns/preview",
        json={"clan_ids": [1, 2, 3, 9, 10, 999]},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["eligible_clan_ids"] == [1, 2, 9]
    assert body["eligible_count"] == 3
    excluded = {row["clan_id"]: row["reason_code"] for row in body["excluded_destinations"]}
    assert excluded == {
        3: "community_domain_spotlight_disabled",
        10: "gsn_house_campaign_excluded",
        999: "community_not_found",
    }
    assert body["governance_boundary"]["community_endorsement"] is False
    assert body["governance_boundary"]["trust_signal"] is False


def test_house_campaign_rejects_whitespace_only_idempotency_key(
    client,
    override_current_user,
) -> None:
    _seed_house_campaign_destinations()

    response = client.post(
        "/marketplace/admin/gsn-house-campaigns",
        json={
            "clan_ids": [1],
            "message": "GSN service announcement",
            "image_url": "https://cdn.example.test/gsn/house.jpg",
            "idempotency_key": "        ",
        },
    )

    assert response.status_code == 400, response.text
    assert response.json()["detail"]["code"] == "gsn_house_campaign_idempotency_key_required"


def test_house_campaign_publishes_canonically_without_member_quota_or_shop_identity(
    client,
    override_current_user,
) -> None:
    _seed_house_campaign_destinations()
    payload = {
        "clan_ids": [1, 2, 3],
        "message": "GSN service announcement",
        "image_url": "https://cdn.example.test/gsn/house.jpg",
        "idempotency_key": "gsn-house-publish-0001",
    }

    first = client.post("/marketplace/admin/gsn-house-campaigns", json=payload)
    replay = client.post("/marketplace/admin/gsn-house-campaigns", json=payload)

    assert first.status_code == 200, first.text
    assert replay.status_code == 200, replay.text
    body = first.json()
    assert body["propagated_clan_ids"] == [1, 2]
    assert body["excluded_count"] == 1
    assert body["idempotent_replay"] is False
    assert replay.json()["idempotent_replay"] is True

    item = body["item"]
    assert item["author_name"] == "Global Support Network"
    assert item["author_gmfn_id"] == "GSN-HOUSE"
    assert item["source_shop_name"] is None
    assert item["spotlight_contact_available"] is False
    assert item["spotlight_detail_available"] is False
    assert item["campaign_source_kind"] == "gsn_house"
    assert item["campaign_commercial_mode"] == "house"
    assert item["content_class"] == "gsn_house"

    with engine.begin() as conn:
        publisher = conn.execute(
            text("SELECT id, role FROM users WHERE gmfn_id = 'GSN-HOUSE'")
        ).mappings().one()
        campaign = conn.execute(
            text(
                """
                SELECT owner_user_id, source_kind, commercial_mode, distribution_scope
                FROM spotlight_campaigns
                """
            )
        ).mappings().one()
        placements = conn.execute(
            text("SELECT clan_id, author_user_id, shop_id FROM marketplace_broadcasts")
        ).mappings().all()
        events = conn.execute(
            text(
                """
                SELECT actor_user_id, subject_user_id
                FROM trust_events
                WHERE event_type = 'marketplace.gsn_house_campaign.published'
                """
            )
        ).mappings().all()

    assert publisher["role"] == "system"
    assert campaign == {
        "owner_user_id": publisher["id"],
        "source_kind": "gsn_house",
        "commercial_mode": "house",
        "distribution_scope": "selected_communities",
    }
    assert placements == [
        {"clan_id": 1, "author_user_id": publisher["id"], "shop_id": None},
        {"clan_id": 2, "author_user_id": publisher["id"], "shop_id": None},
    ]
    assert events == [
        {"actor_user_id": 1, "subject_user_id": publisher["id"]},
        {"actor_user_id": 1, "subject_user_id": publisher["id"]},
    ]

    with SessionLocal() as db:
        member_quota_use = marketplace_routes._count_free_spotlight_runs_for_author_today(
            db=db,
            author_user_id=1,
        )
        eligibility = evaluate_spotlight_eligibility(
            db,
            viewer_user_id=3,
            campaign_id=body["item"]["spotlight_campaign_id"],
        )

    assert member_quota_use == 0
    assert eligibility.eligible is True
    assert [route.route_clan_id for route in eligibility.routes] == [1]

    with SessionLocal() as db:
        pacing = get_or_create_spotlight_campaign_pacing_state(
            db,
            campaign_id=body["item"]["spotlight_campaign_id"],
        )
    assert pacing.max_delivery_rounds == SPOTLIGHT_GSN_HOUSE_PILOT_MAX_DELIVERY_ROUNDS

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE community_domain_policies
                SET config_json = '{"allow_gsn_house_campaigns": false}'
                WHERE community_domain_id = 101
                  AND policy_key = 'domain.central_advertising'
                """
            )
        )
    with SessionLocal() as db:
        after_opt_out = evaluate_spotlight_eligibility(
            db,
            viewer_user_id=3,
            campaign_id=body["item"]["spotlight_campaign_id"],
        )

    assert after_opt_out.eligible is False
    assert after_opt_out.rejection_code == REJECTION_GSN_HOUSE_ADVERTISING_EXCLUDED


def test_house_campaign_inventory_allows_parallel_active_promotions(
    client,
    override_current_user,
) -> None:
    _seed_house_campaign_destinations()
    first = client.post(
        "/marketplace/admin/gsn-house-campaigns",
        json={
            "clan_ids": [1],
            "message": "First launch promotion",
            "image_url": "https://cdn.example.test/gsn/launch-one.jpg",
            "idempotency_key": "gsn-house-inventory-0001",
        },
    )
    second = client.post(
        "/marketplace/admin/gsn-house-campaigns",
        json={
            "clan_ids": [1],
            "message": "Second launch promotion",
            "image_url": "https://cdn.example.test/gsn/launch-two.jpg",
            "idempotency_key": "gsn-house-inventory-0002",
        },
    )

    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    first_id = int(first.json()["item"]["spotlight_campaign_id"])
    second_id = int(second.json()["item"]["spotlight_campaign_id"])
    assert first_id != second_id

    operations = client.get("/marketplace/admin/gsn-house-campaigns")
    assert operations.status_code == 200, operations.text
    body = operations.json()
    assert body["active_count"] == 2
    assert {int(item["campaign_id"]) for item in body["active"]} == {first_id, second_id}
    assert body["history"] == []


def test_existing_house_pacing_state_moves_to_bounded_pilot_ceiling(
    client,
    override_current_user,
) -> None:
    _seed_house_campaign_destinations()
    published = client.post(
        "/marketplace/admin/gsn-house-campaigns",
        json={
            "clan_ids": [1],
            "message": "Existing pacing migration promotion",
            "image_url": "https://cdn.example.test/gsn/pacing-migration.jpg",
            "idempotency_key": "gsn-house-pacing-migration-0001",
        },
    )
    assert published.status_code == 200, published.text
    campaign_id = int(published.json()["item"]["spotlight_campaign_id"])

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaign_pacing_states (
                    campaign_id, max_delivery_rounds, consumed_delivery_rounds,
                    pacing_profile, exhausted, version, created_at, updated_at
                ) VALUES (
                    :campaign_id, 10, 10, 'neutral', 1, 10,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {"campaign_id": campaign_id},
        )

    with SessionLocal() as db:
        pacing = get_or_create_spotlight_campaign_pacing_state(
            db,
            campaign_id=campaign_id,
        )
        assert pacing.max_delivery_rounds == SPOTLIGHT_GSN_HOUSE_PILOT_MAX_DELIVERY_ROUNDS
        assert pacing.consumed_delivery_rounds == 10
        assert pacing.exhausted is False


def test_house_campaign_inventory_accepts_sixty_active_promotions(
    client,
    override_current_user,
) -> None:
    _seed_house_campaign_destinations()
    campaign_ids: set[int] = set()

    for index in range(60):
        response = client.post(
            "/marketplace/admin/gsn-house-campaigns",
            json={
                "clan_ids": [1],
                "message": f"Launch inventory promotion {index + 1}",
                "image_url": f"https://cdn.example.test/gsn/inventory-{index + 1}.jpg",
                "idempotency_key": f"gsn-house-sixty-{index + 1:03d}",
            },
        )
        assert response.status_code == 200, response.text
        campaign_ids.add(int(response.json()["item"]["spotlight_campaign_id"]))

    assert len(campaign_ids) == 60
    operations = client.get(
        "/marketplace/admin/gsn-house-campaigns",
        params={"limit": 100},
    )
    assert operations.status_code == 200, operations.text
    body = operations.json()
    assert body["active_count"] == 60
    assert len(body["active"]) == 60
    assert {int(item["campaign_id"]) for item in body["active"]} == campaign_ids

    with engine.begin() as conn:
        placement_count = conn.execute(
            text(
                "SELECT COUNT(*) FROM marketplace_broadcasts "
                "WHERE serving_status = 'serving'"
            )
        ).scalar_one()
    assert int(placement_count) == 60

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (
                    id, clan_id, user_id, role, personal_pool_balance
                ) VALUES (100, 1, 1, 'admin', 0)
                """
            )
        )
    first_batch = client.get(
        "/marketplace/broadcasts",
        params={"clan_id": 1, "active_only": True, "limit": 5, "offset": 0},
    )
    second_batch = client.get(
        "/marketplace/broadcasts",
        params={"clan_id": 1, "active_only": True, "limit": 5, "offset": 5},
    )
    assert first_batch.status_code == 200, first_batch.text
    assert second_batch.status_code == 200, second_batch.text
    assert first_batch.json()["next_offset"] == 5
    assert second_batch.json()["next_offset"] == 10
    assert {
        int(item["id"]) for item in first_batch.json()["items"]
    }.isdisjoint({int(item["id"]) for item in second_batch.json()["items"]})


def test_house_campaign_inventory_stops_at_configured_pilot_limit(
    client,
    override_current_user,
    monkeypatch,
) -> None:
    _seed_house_campaign_destinations()
    monkeypatch.setattr(
        marketplace_routes,
        "GSN_HOUSE_PILOT_ACTIVE_INVENTORY_LIMIT",
        2,
    )

    for index in range(2):
        response = client.post(
            "/marketplace/admin/gsn-house-campaigns",
            json={
                "clan_ids": [1],
                "message": f"Bounded pilot promotion {index + 1}",
                "image_url": f"https://cdn.example.test/gsn/bounded-{index + 1}.jpg",
                "idempotency_key": f"gsn-house-bounded-{index + 1:03d}",
            },
        )
        assert response.status_code == 200, response.text

    blocked = client.post(
        "/marketplace/admin/gsn-house-campaigns",
        json={
            "clan_ids": [1],
            "message": "Promotion beyond the bounded pilot inventory",
            "image_url": "https://cdn.example.test/gsn/bounded-3.jpg",
            "idempotency_key": "gsn-house-bounded-003",
        },
    )
    assert blocked.status_code == 409, blocked.text
    assert blocked.json()["detail"]["code"] == "gsn_house_pilot_inventory_limit_reached"


def test_house_campaign_operations_report_and_audited_stop(
    client,
    override_current_user,
) -> None:
    _seed_house_campaign_destinations()
    published = client.post(
        "/marketplace/admin/gsn-house-campaigns",
        json={
            "clan_ids": [1],
            "message": "Pilot operations announcement",
            "image_url": "https://cdn.example.test/gsn/operations.jpg",
            "idempotency_key": "gsn-house-operations-0001",
        },
    )
    assert published.status_code == 200, published.text
    campaign_id = int(published.json()["item"]["spotlight_campaign_id"])
    broadcast_id = int(published.json()["item"]["id"])

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaign_pacing_states (
                    campaign_id, max_delivery_rounds, consumed_delivery_rounds,
                    pacing_profile, exhausted, version, created_at, updated_at
                ) VALUES (
                    :campaign_id, 10, 3, 'neutral', 0, 3,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {"campaign_id": campaign_id},
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_presentation_leases (
                    presentation_id, issuance_key, viewer_user_id, campaign_id,
                    placement_broadcast_id, content_version, surface, status,
                    issued_at, lease_expires_at
                ) VALUES (
                    'house-operations-issued', 'house-operations-issued', 3,
                    :campaign_id, :broadcast_id, 1, 'public_shop_spotlight_rail',
                    'issued', CURRENT_TIMESTAMP, '2099-01-01 00:00:00'
                )
                """
            ),
            {"campaign_id": campaign_id, "broadcast_id": broadcast_id},
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_exposure_events (
                    content_version, presentation_id, event_type, viewer_user_id,
                    campaign_id, event_at, allocation_route_type,
                    allocation_source_kind, allocation_source_id,
                    allocation_route_clan_id, placement_broadcast_id,
                    idempotency_key, presentation_surface, created_at
                ) VALUES (
                    1, 'house-operations-qualified', 'qualifying_impression', 3,
                    :campaign_id, CURRENT_TIMESTAMP, 'direct_shared_community',
                    'clan', 1, 1, :broadcast_id,
                    'house-operations-qualified', 'public_shop_spotlight_rail',
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {"campaign_id": campaign_id, "broadcast_id": broadcast_id},
        )

    operations = client.get("/marketplace/admin/gsn-house-campaigns")
    assert operations.status_code == 200, operations.text
    current = operations.json()["current"]
    assert current["campaign_id"] == campaign_id
    assert current["state"] == "live"
    assert current["content"]["message"] == "Pilot operations announcement"
    assert current["delivery"] == {
        "placement_count": 1,
        "currently_eligible_destination_count": 1,
        "currently_excluded_destination_count": 0,
        "max_delivery_rounds": 10,
        "consumed_delivery_rounds": 3,
        "remaining_delivery_rounds": 7,
        "issued_presentation_count": 1,
        "qualified_presentation_count": 1,
        "unique_qualified_viewer_accounts": 1,
    }
    assert "not video-play" in current["reporting_boundary"].lower()

    missing_confirmation = client.post(
        f"/marketplace/admin/gsn-house-campaigns/{campaign_id}/stop",
        json={"reason": "Pilot correction", "confirm_withdrawal": False},
    )
    assert missing_confirmation.status_code == 400, missing_confirmation.text
    assert missing_confirmation.json()["detail"]["code"] == "withdrawal_confirmation_required"

    stopped = client.post(
        f"/marketplace/admin/gsn-house-campaigns/{campaign_id}/stop",
        json={"reason": "Pilot correction", "confirm_withdrawal": True},
    )
    replay = client.post(
        f"/marketplace/admin/gsn-house-campaigns/{campaign_id}/stop",
        json={"reason": "Pilot correction", "confirm_withdrawal": True},
    )
    assert stopped.status_code == 200, stopped.text
    assert stopped.json()["campaign"]["state"] == "stopped"
    assert stopped.json()["campaign"]["can_stop"] is False
    assert stopped.json()["campaign"]["withdrawal_audit"]["reason"] == "Pilot correction"
    assert stopped.json()["campaign"]["withdrawal_audit"]["invalidated_presentation_count"] == 1
    assert replay.status_code == 200, replay.text
    assert replay.json()["idempotent_replay"] is True

    after_stop = client.get("/marketplace/admin/gsn-house-campaigns").json()
    assert after_stop["current"] is None
    assert after_stop["history"][0]["state"] == "stopped"

    with engine.begin() as conn:
        campaign_state = conn.execute(
            text(
                "SELECT status, serving_status FROM spotlight_campaigns WHERE id = :id"
            ),
            {"id": campaign_id},
        ).mappings().one()
        placement_state = conn.execute(
            text(
                "SELECT serving_status FROM marketplace_broadcasts WHERE id = :id"
            ),
            {"id": broadcast_id},
        ).scalar_one()
        lease_state = conn.execute(
            text(
                "SELECT status FROM spotlight_presentation_leases WHERE presentation_id = 'house-operations-issued'"
            )
        ).scalar_one()
        withdrawal_events = conn.execute(
            text(
                "SELECT COUNT(*) FROM trust_events WHERE event_type = 'marketplace.gsn_house_campaign.withdrawn'"
            )
        ).scalar_one()
    assert campaign_state == {"status": "ended", "serving_status": "withdrawn"}
    assert placement_state == "withdrawn"
    assert lease_state == "invalidated"
    assert int(withdrawal_events) == 1


def test_house_campaign_review_media_discard_is_reference_safe(
    client,
    override_current_user,
    tmp_path: Path,
    monkeypatch,
) -> None:
    _seed_house_campaign_destinations()
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    image_dir = tmp_path / "marketplace" / "images"
    image_dir.mkdir(parents=True)

    abandoned = image_dir / "abandoned-review.jpg"
    abandoned.write_bytes(b"review-media")
    abandoned_url = "/uploads/marketplace/images/abandoned-review.jpg"
    discarded = client.post(
        "/marketplace/admin/gsn-house-campaigns/media/discard",
        json={"media_url": abandoned_url},
    )
    assert discarded.status_code == 200, discarded.text
    assert discarded.json()["status"] == "deleted"
    assert abandoned.exists() is False

    published_media = image_dir / "published-review.jpg"
    published_media.write_bytes(b"published-media")
    published_url = "/uploads/marketplace/images/published-review.jpg"
    published = client.post(
        "/marketplace/admin/gsn-house-campaigns",
        json={
            "clan_ids": [1],
            "message": "Reference-safe media announcement",
            "image_url": published_url,
            "idempotency_key": "gsn-house-media-reference-0001",
        },
    )
    assert published.status_code == 200, published.text
    retained = client.post(
        "/marketplace/admin/gsn-house-campaigns/media/discard",
        json={"media_url": published_url},
    )
    assert retained.status_code == 200, retained.text
    assert retained.json()["status"] == "retained_referenced"
    assert published_media.exists() is True


def test_house_campaign_keeps_one_campaign_across_multiple_members_and_communities(
    client,
    override_current_user,
) -> None:
    _seed_house_campaign_destinations()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id)
                VALUES (4, 'second-viewer@example.com', 'hashed', 'Second Viewer', 'user', 'GSN-U-VIEWER-2')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, marketplace_name, community_code, invite_code,
                    status, invite_uses, created_at
                ) VALUES (
                    4, 'Second Opted Community', 'Second Opted Market',
                    'GSN-C-000004', 'HOUSE-4', 'active', 0, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (2, 4, 3, 'member', 0),
                    (3, 4, 4, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO community_domains (
                    id, domain_name, display_name, domain_type, template_key,
                    owner_user_id, clan_id, status, verification_status,
                    created_at, updated_at
                ) VALUES (
                    104, 'second-opted-in', 'Second Opted In Domain',
                    'generic_association', 'generic_association', 2, 4,
                    'active', 'verified', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO community_domain_policies (
                    id, community_domain_id, policy_key, action_key, scope_type,
                    review_mode, required_role, status, policy_summary,
                    config_json, created_by_user_id, created_at, updated_at
                ) VALUES (
                    204, 104, 'domain.central_advertising',
                    'domain.central_advertising.configure', 'domain',
                    'domain_admin_review', 'owner_admin', 'active',
                    'Allow GSN house campaigns', :config, 2,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {"config": json.dumps({"allow_gsn_house_campaigns": True})},
        )

    published = client.post(
        "/marketplace/admin/gsn-house-campaigns",
        json={
            "clan_ids": [1, 4],
            "message": "Two-community pilot announcement",
            "image_url": "https://cdn.example.test/gsn/two-community.jpg",
            "idempotency_key": "gsn-house-two-community-0001",
        },
    )
    assert published.status_code == 200, published.text
    body = published.json()
    campaign_id = int(body["item"]["spotlight_campaign_id"])
    assert body["propagated_clan_ids"] == [1, 4]
    assert {int(item["spotlight_campaign_id"]) for item in body["items"]} == {campaign_id}

    with SessionLocal() as db:
        multi_member = evaluate_spotlight_eligibility(
            db,
            viewer_user_id=3,
            campaign_id=campaign_id,
        )
        second_member = evaluate_spotlight_eligibility(
            db,
            viewer_user_id=4,
            campaign_id=campaign_id,
        )

    assert multi_member.eligible is True
    assert [route.route_clan_id for route in multi_member.routes] == [1, 4]
    assert second_member.eligible is True
    assert [route.route_clan_id for route in second_member.routes] == [4]

    with engine.begin() as conn:
        campaign_count = conn.execute(
            text("SELECT COUNT(*) FROM spotlight_campaigns WHERE source_kind = 'gsn_house'")
        ).scalar_one()
        placement_count = conn.execute(
            text(
                "SELECT COUNT(*) FROM marketplace_broadcasts WHERE spotlight_campaign_id = :campaign_id"
            ),
            {"campaign_id": campaign_id},
        ).scalar_one()
    assert int(campaign_count) == 1
    assert int(placement_count) == 2
