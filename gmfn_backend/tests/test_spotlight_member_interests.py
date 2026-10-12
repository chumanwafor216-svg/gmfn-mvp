from __future__ import annotations

import json

from sqlalchemy import text

from app.db.database import engine
from app.services.spotlight_member_interest_service import (
    SUPPORTED_SPOTLIGHT_INTERESTS,
    evaluate_spotlight_interest_relevance_for_interests,
    normalize_spotlight_interests,
)


def _seed_user(user_id: int = 1) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id, display_name)
                VALUES (:id, :email, 'hashed', 'member', :gmfn_id, :display_name)
                """
            ),
            {
                "id": user_id,
                "email": f"phase3d-settings-user-{user_id}@example.com",
                "gmfn_id": f"GSN-P3D-{user_id:04d}",
                "display_name": f"Phase 3D User {user_id}",
            },
        )


def _seed_campaign_row(*, campaign_id: int = 1, category: str = "employment") -> object:
    from app.db.models import SpotlightCampaign

    campaign = SpotlightCampaign(id=campaign_id)
    campaign.opportunity_category = category
    return campaign


def test_member_can_save_supported_spotlight_interests_via_private_settings(client, override_current_user):
    _seed_user(1)

    res = client.patch(
        "/settings/me",
        json={"spotlightInterests": ["employment", "property", "employment"]},
    )

    assert res.status_code == 200, res.text
    assert res.json()["spotlightInterests"] == ["employment", "property"]
    with engine.begin() as conn:
        raw = conn.execute(text("SELECT spotlight_interests_json FROM user_settings WHERE user_id = 1")).scalar_one()
    assert json.loads(raw) == ["employment", "property"]


def test_settings_contract_rejects_unsupported_spotlight_interest_values(client, override_current_user):
    _seed_user(1)

    rejected_other = client.patch("/settings/me", json={"spotlightInterests": ["other"]})
    rejected_unspecified = client.patch("/settings/me", json={"spotlightInterests": ["unspecified"]})
    rejected_free_text = client.patch("/settings/me", json={"spotlightInterests": ["plumbing"]})

    assert rejected_other.status_code == 400, rejected_other.text
    assert rejected_unspecified.status_code == 400, rejected_unspecified.text
    assert rejected_free_text.status_code == 400, rejected_free_text.text


def test_settings_update_replaces_complete_spotlight_interest_set(client, override_current_user):
    _seed_user(1)

    first = client.patch("/settings/me", json={"spotlightInterests": ["employment", "property"]})
    second = client.patch("/settings/me", json={"spotlightInterests": ["education_training"]})
    read_back = client.get("/settings/me")

    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    assert read_back.status_code == 200, read_back.text
    assert read_back.json()["spotlightInterests"] == ["education_training"]


def test_spotlight_interest_taxonomy_excludes_unspecified_and_other():
    assert "unspecified" not in SUPPORTED_SPOTLIGHT_INTERESTS
    assert "other" not in SUPPORTED_SPOTLIGHT_INTERESTS
    assert normalize_spotlight_interests(["employment", "employment", "product"]) == ("employment", "product")


def test_interest_evaluation_uses_only_campaign_category_not_raw_text_or_scores():
    campaign = _seed_campaign_row(category="property")
    result = evaluate_spotlight_interest_relevance_for_interests(
        campaign=campaign,
        selected_interests=["property", "employment"],
    )
    mismatch = evaluate_spotlight_interest_relevance_for_interests(
        campaign=_seed_campaign_row(campaign_id=2, category="business_service"),
        selected_interests=["property"],
    )

    assert result.relevant is True
    assert result.matched_interests == ("property",)
    assert result.campaign_category == "property"
    assert result.positive_reasons == ("explicit_interest_category_match",)
    assert result.privacy == "private_internal_preference_signal"
    assert mismatch.relevant is False
    assert mismatch.matched_interests == ()


def test_public_auth_profile_does_not_publish_spotlight_interests(client, override_current_user):
    _seed_user(1)
    saved = client.patch("/settings/me", json={"spotlightInterests": ["employment"]})
    profile = client.get("/auth/me")

    assert saved.status_code == 200, saved.text
    assert profile.status_code == 200, profile.text
    assert "spotlightInterests" not in profile.json()
    assert "spotlight_interests_json" not in profile.json()
