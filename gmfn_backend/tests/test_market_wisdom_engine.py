from __future__ import annotations

from sqlalchemy import text

from app.db.database import engine


def test_public_daily_insight_is_mounted_and_governed(client):
    res = client.get("/public/daily-insight")

    assert res.status_code == 200
    body = res.json()
    assert body["date"]
    assert body["text"]
    assert body["source"]
    assert body["public_id"].startswith("MW-")
    assert body["market_wisdom_entry"] is True
    assert body["source_attribution"].startswith(("Source context:", "Inspired by"))
    assert "confidence_level" in body


def test_market_wisdom_tables_are_created_by_migration(client):
    client.get("/public/daily-insight")

    with engine.begin() as conn:
        tables = {
            row[0]
            for row in conn.execute(
                text(
                    """
                    SELECT name
                    FROM sqlite_master
                    WHERE type='table'
                    """
                )
            ).fetchall()
        }

    assert "market_wisdom_entries" in tables
    assert "market_wisdom_sources" in tables
    assert "market_wisdom_exposures" in tables
    assert "market_wisdom_generation_runs" in tables


def test_admin_market_wisdom_review_requires_admin(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    res = client.get("/admin/market-wisdom/entries")

    assert res.status_code == 403


def test_admin_can_list_seeded_approved_market_wisdom(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    res = client.get("/admin/market-wisdom/entries?status=approved&limit=250")

    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["items"]
    assert len(body["items"]) >= 100
    assert body["items"][0]["status"] == "approved"
    assert body["items"][0]["originality_hash"]
    assert body["items"][0]["semantic_fingerprint"]


def test_seeded_market_wisdom_library_has_pilot_depth(client):
    client.get("/public/daily-insight")

    with engine.begin() as conn:
        total = conn.execute(text("SELECT COUNT(*) FROM market_wisdom_entries")).scalar_one()
        approved = conn.execute(
            text("SELECT COUNT(*) FROM market_wisdom_entries WHERE status = 'approved'")
        ).scalar_one()
        review_required = conn.execute(
            text("SELECT COUNT(*) FROM market_wisdom_entries WHERE status = 'review_required'")
        ).scalar_one()
        pilot_entries = conn.execute(
            text("SELECT COUNT(*) FROM market_wisdom_entries WHERE public_id LIKE 'MW-PILOT-%'")
        ).scalar_one()
        seeded_runs = conn.execute(
            text("SELECT COUNT(*) FROM market_wisdom_generation_runs WHERE category = 'pilot-library'")
        ).scalar_one()

    assert total >= 100
    assert approved >= 100
    assert review_required == 0
    assert pilot_entries >= 100
    assert seeded_runs >= 1


def test_admin_create_rejects_prohibited_or_character_judgement_language(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    payload = {
        "title": "Bad pressure",
        "principle": "Humiliate the weak person until they comply.",
        "short_message": "Use psychological pressure to dominate the room.",
        "category": "Leadership",
        "source_type": "general_practical_wisdom",
    }

    res = client.post("/admin/market-wisdom/entries", json=payload)

    assert res.status_code == 400
    assert "prohibited" in res.json()["detail"].lower() or "character" in res.json()["detail"].lower()


def test_admin_create_named_source_requires_author(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    payload = {
        "title": "Clarify the ask",
        "principle": "A request is easier to answer when the real ask is named.",
        "short_message": "Name the request before deciding.",
        "category": "Negotiation",
        "source_type": "named_source",
        "source_title": "Negotiation book",
    }

    res = client.post("/admin/market-wisdom/entries", json=payload)

    assert res.status_code == 400
    assert "source_author" in res.json()["detail"]


def test_recommendation_returns_policy_and_no_character_scoring(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    res = client.get("/market-wisdom/recommendation?context=missed+repayment&signals=loan")

    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["recommendation"]["public_id"].startswith("MW-")
    assert body["why_selected"]
    assert body["trigger_signal"]
    assert body["policy"]["describes_behaviour_not_character"] is True
    assert body["policy"]["no_social_scoring"] is True
    assert body["policy"]["no_public_behavioural_surveillance"] is True
    joined = str(body).lower()
    assert "dishonest person" not in joined
    assert "untrustworthy person" not in joined


def test_recommendation_reports_missing_owned_shop_without_manufacturing_zero_activity(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    res = client.get("/market-wisdom/recommendation?context=dashboard&clan_id=1")

    assert res.status_code == 200
    signal = res.json()["commerce_signal"]
    assert signal["available"] is False
    assert signal["state"] == "no_owned_shop"
    assert signal["evidence_counts"] == {}
    assert signal["first_action_route"] == ""
    assert "Missing commerce data is not a zero-activity finding." in signal["boundaries"]


def test_recommendation_uses_owner_and_community_scoped_shop_setup_signal(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, is_active, created_at
                )
                VALUES (11, 1, 1, 'Owner Shop', 1, CURRENT_TIMESTAMP)
                """
            )
        )

    res = client.get("/market-wisdom/recommendation?context=dashboard&clan_id=1")

    assert res.status_code == 200
    body = res.json()
    signal = body["commerce_signal"]
    assert body["signal_basis"] == "server_commerce"
    assert signal["available"] is True
    assert signal["state"] == "setup_needed"
    assert signal["shop_id"] == 11
    assert signal["clan_id"] == 1
    assert signal["evidence_counts"]["active_products"] == 0
    assert signal["first_action_label"] == "Add a shop item"
    assert signal["first_action_route"] == "/app/shop-assets"


def test_recommendation_treats_attention_and_demand_as_bounded_evidence(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, is_active, created_at
                )
                VALUES (11, 1, 1, 'Owner Shop', 1, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title,
                    visibility_mode, is_active, created_at
                )
                VALUES (
                    21, 1, 11, 1, 'Visible service',
                    'community_visible', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_requests (
                    id, clan_id, user_id, title, status, created_at
                )
                VALUES (31, 1, 1, 'Current community request', 'open', CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_attention_events (
                    id, event_type, shop_id, clan_id, shop_owner_user_id,
                    source, dedupe_key, created_at
                )
                VALUES (
                    41, 'contact_tap', 11, 1, 1,
                    'public_shop', 'market-wisdom-contact-1', CURRENT_TIMESTAMP
                )
                """
            )
        )

    res = client.get("/market-wisdom/recommendation?context=dashboard&clan_id=1")

    assert res.status_code == 200
    signal = res.json()["commerce_signal"]
    assert signal["available"] is True
    assert signal["state"] == "intent_recorded"
    assert signal["evidence_counts"]["active_products"] == 1
    assert signal["evidence_counts"]["contact_taps_7d"] == 1
    assert signal["evidence_counts"]["open_community_demands"] == 1
    assert signal["first_action_route"] == "/app/shop-control#shop-control-counts"
    joined = " ".join(signal["boundaries"]).lower()
    assert "not buyers" in joined
    assert "not confirmed matches" in joined


def test_recommendation_does_not_cross_selected_community_boundary(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, is_active, created_at
                )
                VALUES (11, NULL, 1, 'Unscoped Owner Shop', 1, CURRENT_TIMESTAMP)
                """
            )
        )

    res = client.get("/market-wisdom/recommendation?context=dashboard&clan_id=1")

    assert res.status_code == 200
    signal = res.json()["commerce_signal"]
    assert signal["available"] is False
    assert signal["state"] == "community_mismatch"
    assert signal["evidence_counts"] == {}
    assert signal["first_action_route"] == ""


def test_marketplace_recommendation_prefers_marketplace_tagged_entries(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    res = client.get(
        "/market-wisdom/recommendation"
        "?context=marketplace"
        "&signals=marketplace"
        "&signals=shop"
        "&signals=trade"
        "&signals=support"
        "&signals=demand"
        "&signals=rosca"
    )

    assert res.status_code == 200
    body = res.json()
    recommendation = body["recommendation"]
    searchable = " ".join(
        [
            recommendation.get("public_id", ""),
            recommendation.get("title", ""),
            recommendation.get("category", ""),
            recommendation.get("subcategory", ""),
            recommendation.get("short_message", ""),
            recommendation.get("action_prompt", ""),
        ]
    ).lower()

    assert recommendation["public_id"].startswith("MW-")
    assert "negotiation" not in searchable
    assert any(
        marker in searchable
        for marker in ("marketplace", "merchant", "shop", "trade", "demand", "spotlight")
    )


def test_exposure_and_feedback_are_recorded(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    daily = client.get("/public/daily-insight").json()

    shown = client.post(
        "/market-wisdom/exposures",
        json={"public_id": daily["public_id"], "action": "shown", "clan_id": 1},
    )
    feedback = client.post(
        "/market-wisdom/feedback",
        json={
            "public_id": daily["public_id"],
            "action": "opened",
            "clan_id": 1,
            "feedback": "helpful",
            "outcome_signal": "read-more",
        },
    )

    assert shown.status_code == 200
    assert feedback.status_code == 200
    assert feedback.json()["feedback"] == "helpful"

    with engine.begin() as conn:
        count = conn.execute(text("SELECT COUNT(*) FROM market_wisdom_exposures")).scalar_one()
    assert count == 2
