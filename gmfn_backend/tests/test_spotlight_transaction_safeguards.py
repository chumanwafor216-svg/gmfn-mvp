from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text

os.environ.setdefault("SECRET_KEY", "pytest-spotlight-transaction-safeguards-secret")

from app.db.database import SessionLocal, engine
from app.db.models import (
    FeatureEntitlement,
    FeatureUsageEvent,
    MarketplaceBroadcast,
    SpotlightCampaign,
    SpotlightCampaignPacingState,
    SpotlightPresentationLease,
)
from app.services import feature_entitlements_service as entitlements
from app.services import spotlight_presentation_service as presentations
from app.services.feature_entitlements_service import consume_feature_units
from app.services.spotlight_lifecycle_service import permanently_withdraw, replace_content


NOW = datetime(2026, 10, 16, 15, 0, tzinfo=timezone.utc)


def _seed_foundation() -> int:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES
                    (1, 'atomic-viewer@example.com', 'hashed', 'member', 'GSN-ATOMIC-VIEWER'),
                    (2, 'atomic-owner@example.com', 'hashed', 'member', 'GSN-ATOMIC-OWNER')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, community_code, status, invite_code, invite_uses)
                VALUES (1, 'Atomic Community', 'ATOMIC-1', 'active', 'ATOMIC', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 1, 1, 'member', 0), (2, 1, 2, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (id, clan_id, owner_user_id, shop_name, is_active)
                VALUES (1, 1, 2, 'Atomic Shop', 1)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title,
                    visibility_mode, is_active
                ) VALUES (1, 1, 1, 2, 'Atomic Product', 'community_visible', 1)
                """
            )
        )
    with SessionLocal() as db:
        campaign = SpotlightCampaign(
            owner_user_id=2,
            shop_id=1,
            origin_clan_id=1,
            source_product_id=1,
            content_kind="product_snapshot",
            content_fingerprint="a" * 64,
            status="active",
            serving_status="serving",
            content_version=1,
            source_kind="direct_broadcast",
            commercial_mode="paid",
            distribution_scope="direct_communities",
            opportunity_intent="offer",
            opportunity_category="product",
            opportunity_geo_scope="community",
            opportunity_availability="available",
            created_at=NOW,
            activated_at=NOW,
            expires_at=NOW + timedelta(hours=24),
            authorized_expires_at=NOW + timedelta(hours=24),
            serving_status_changed_at=NOW,
        )
        db.add(campaign)
        db.flush()
        db.add(
            MarketplaceBroadcast(
                spotlight_campaign_id=int(campaign.id),
                serving_status="serving",
                content_version=1,
                clan_id=1,
                author_user_id=2,
                shop_id=1,
                message="Atomic presentation",
                priority_mode="paid",
                visibility_scope="direct_communities",
                expires_at=NOW + timedelta(hours=24),
                authorized_expires_at=NOW + timedelta(hours=24),
                serving_status_changed_at=NOW,
                created_at=NOW,
            )
        )
        db.commit()
        return int(campaign.id)


def test_lease_insert_failure_consumes_zero_rounds(monkeypatch) -> None:
    campaign_id = _seed_foundation()

    def fail_after_insert(db, *, lease):
        db.add(lease)
        db.flush()
        raise RuntimeError("synthetic lease evidence failure")

    monkeypatch.setattr(presentations, "_persist_presentation_lease", fail_after_insert)
    with SessionLocal() as db:
        with pytest.raises(RuntimeError, match="synthetic lease evidence failure"):
            presentations.select_spotlight_presentation(
                db,
                viewer_user_id=1,
                now=NOW,
                issuance_key="failed-atomic-issuance",
            )
        state = db.query(SpotlightCampaignPacingState).filter_by(campaign_id=campaign_id).one()
        assert state.consumed_delivery_rounds == 0
        assert db.query(SpotlightPresentationLease).count() == 0


@pytest.mark.parametrize(
    ("action", "expected_reason"),
    (("replace", "content_replaced"), ("withdraw", "withdrawn")),
)
def test_idempotent_retry_preserves_accounting_but_never_reauthorizes_changed_state(
    monkeypatch, action: str, expected_reason: str
) -> None:
    monkeypatch.setenv("GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED", "1")
    campaign_id = _seed_foundation()
    with SessionLocal() as db:
        first = presentations.select_spotlight_presentation(
            db,
            viewer_user_id=1,
            now=NOW,
            issuance_key=f"retry-after-{action}",
        )
        db.commit()
        original_deadline = first.token_expires_at
        campaign = db.get(SpotlightCampaign, campaign_id)
        if action == "replace":
            replace_content(
                db,
                campaign=campaign,
                content_kind="product_snapshot",
                content_fingerprint="b" * 64,
                source_product_id=1,
                message="Replacement",
                image_url=None,
                video_url=None,
                now=NOW + timedelta(seconds=1),
            )
        else:
            permanently_withdraw(db, campaign=campaign, now=NOW + timedelta(seconds=1))
        db.commit()
        replay = presentations.select_spotlight_presentation(
            db,
            viewer_user_id=1,
            now=NOW + timedelta(seconds=2),
            issuance_key=f"retry-after-{action}",
        )
        state = db.query(SpotlightCampaignPacingState).filter_by(campaign_id=campaign_id).one()
        assert replay.selected is False
        assert replay.presentation_id == first.presentation_id
        assert replay.token_expires_at == original_deadline
        assert replay.rejection_code == expected_reason
        assert state.consumed_delivery_rounds == 1
        assert db.query(SpotlightPresentationLease).count() == 1


def test_issuance_key_reuse_with_changed_payload_is_a_conflict() -> None:
    _seed_foundation()
    with SessionLocal() as db:
        first = presentations.select_spotlight_presentation(
            db,
            viewer_user_id=1,
            now=NOW,
            issuance_key="same-key-changed-payload",
        )
        db.commit()
        conflict = presentations.select_spotlight_presentation(
            db,
            viewer_user_id=1,
            now=NOW + timedelta(seconds=1),
            surface="different-approved-nowhere-surface",
            issuance_key="same-key-changed-payload",
        )
        assert first.selected is True
        assert conflict.selected is False
        assert conflict.rejection_code == "issuance_key_payload_conflict"
        assert db.query(SpotlightPresentationLease).count() == 1


def test_legacy_expiry_equality_is_ineligible() -> None:
    _seed_foundation()
    with SessionLocal() as db:
        db.add(
            FeatureEntitlement(
                owner_user_id=2,
                shop_id=1,
                feature_code="spotlight_priority",
                plan_code="legacy-test",
                quantity_total=1,
                quantity_used=0,
                status="active",
                starts_at=NOW - timedelta(days=1),
                expires_at=NOW,
                payment_reference="expires-at-equality",
            )
        )
        db.commit()
        result = consume_feature_units(
            db,
            owner_user_id=2,
            feature_code="spotlight_priority",
            shop_id=1,
            reference_key="expiry-equality",
            now=NOW,
        )
        assert result == {
            "ok": False,
            "consumed": 0,
            "requested": 1,
            "reason": "no_active_entitlement",
        }
        assert db.query(FeatureEntitlement).one().quantity_used == 0


def test_failed_multi_row_legacy_consumption_rolls_back_every_row(monkeypatch) -> None:
    _seed_foundation()
    with SessionLocal() as db:
        for index in (1, 2):
            db.add(
                FeatureEntitlement(
                    owner_user_id=2,
                    shop_id=1,
                    feature_code="spotlight_priority",
                    plan_code="legacy-test",
                    quantity_total=1,
                    quantity_used=0,
                    status="active",
                    starts_at=NOW - timedelta(days=1),
                    expires_at=NOW + timedelta(days=1),
                    payment_reference=f"multi-row-{index}",
                )
            )
        db.commit()
        original = entitlements._persist_feature_usage
        calls = 0

        def fail_second(db, *, usage):
            nonlocal calls
            calls += 1
            original(db, usage=usage)
            if calls == 2:
                raise RuntimeError("synthetic second-row evidence failure")

        monkeypatch.setattr(entitlements, "_persist_feature_usage", fail_second)
        with pytest.raises(RuntimeError, match="synthetic second-row evidence failure"):
            consume_feature_units(
                db,
                owner_user_id=2,
                feature_code="spotlight_priority",
                units=2,
                shop_id=1,
                reference_key="multi-row-atomic",
                now=NOW,
                commit=False,
            )
        assert [row.quantity_used for row in db.query(FeatureEntitlement).order_by(FeatureEntitlement.id).all()] == [0, 0]
        assert db.query(FeatureUsageEvent).count() == 0


def test_legacy_retry_fingerprint_is_exact_and_durable() -> None:
    _seed_foundation()
    with SessionLocal() as db:
        db.add(
            FeatureEntitlement(
                owner_user_id=2,
                shop_id=1,
                feature_code="spotlight_priority",
                plan_code="legacy-test",
                quantity_total=2,
                quantity_used=0,
                status="active",
                starts_at=NOW - timedelta(days=1),
                expires_at=NOW + timedelta(days=1),
                payment_reference="fingerprint-entitlement",
            )
        )
        db.commit()
        first = consume_feature_units(
            db,
            owner_user_id=2,
            feature_code="spotlight_priority",
            units=1,
            shop_id=1,
            reference_key="fingerprint-key",
            now=NOW,
        )
        replay = consume_feature_units(
            db,
            owner_user_id=2,
            feature_code="spotlight_priority",
            units=1,
            shop_id=1,
            reference_key="fingerprint-key",
            now=NOW,
        )
        conflict = consume_feature_units(
            db,
            owner_user_id=2,
            feature_code="spotlight_priority",
            units=2,
            shop_id=1,
            reference_key="fingerprint-key",
            now=NOW,
        )
        assert first["ok"] is True and first["deduped"] is False
        assert replay["ok"] is True and replay["deduped"] is True
        assert conflict["ok"] is False
        assert conflict["reason"] == "conflicting_idempotency_fingerprint"
        assert db.query(FeatureEntitlement).one().quantity_used == 1
        assert db.query(FeatureUsageEvent).count() == 1
