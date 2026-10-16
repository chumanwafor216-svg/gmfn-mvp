from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.db.models import (
    MarketplaceBroadcast,
    SpotlightCampaign,
    SpotlightCampaignPacingState,
    SpotlightContentVersion,
    SpotlightPresentationLease,
    TrustEvent,
)
from app.services.spotlight_lifecycle_service import (
    SPOTLIGHT_CORRECTION_HOLD,
    SPOTLIGHT_EXPIRED,
    SPOTLIGHT_SERVING,
    SPOTLIGHT_WITHDRAWN,
    SpotlightLifecycleError,
    activation_expiry,
    permanently_withdraw,
    place_correction_hold,
    replace_content,
)
from app.services.spotlight_presentation_service import (
    SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP,
    revalidate_spotlight_presentation,
    select_spotlight_presentation,
)


def _seed_foundation() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, role, gmfn_id, display_name
                ) VALUES
                    (1, 'spotlight-viewer@example.com', 'hashed', 'member',
                     'GSN-LIFECYCLE-VIEWER', 'Lifecycle Viewer'),
                    (2, 'spotlight-owner@example.com', 'hashed', 'member',
                     'GSN-LIFECYCLE-OWNER', 'Lifecycle Owner')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, marketplace_name, community_code, status,
                    invite_code, invite_uses
                ) VALUES (
                    1, 'Lifecycle Community', 'Lifecycle Market',
                    'GSN-LIFECYCLE-COMMUNITY', 'active', 'LIFECYCLE-1', 0
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (
                    id, clan_id, user_id, role, personal_pool_balance
                ) VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 1, 2, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 2, 'Lifecycle Shop', 'Correction test shop', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, visibility_mode, is_active
                ) VALUES (
                    1, 1, 1, 2, 'Corrected Product', 'Same-shop correction',
                    '10', 'GBP', 'community_visible', 1
                )
                """
            )
        )


def _seed_campaign(
    *,
    activated_at: datetime,
    campaign_expiry: datetime,
    placement_expiries: tuple[datetime, ...],
) -> int:
    with SessionLocal() as db:
        campaign = SpotlightCampaign(
            owner_user_id=2,
            shop_id=1,
            origin_clan_id=1,
            content_kind='broadcast_snapshot',
            content_fingerprint='a' * 64,
            status='active',
            serving_status=SPOTLIGHT_SERVING,
            content_version=1,
            source_kind='direct_broadcast',
            commercial_mode='paid',
            distribution_scope='direct_communities',
            created_at=activated_at,
            activated_at=activated_at,
            expires_at=campaign_expiry,
            authorized_expires_at=campaign_expiry,
            serving_status_changed_at=activated_at,
        )
        db.add(campaign)
        db.flush()
        for index, expiry in enumerate(placement_expiries, start=1):
            db.add(
                MarketplaceBroadcast(
                    spotlight_campaign_id=int(campaign.id),
                    serving_status=SPOTLIGHT_SERVING,
                    content_version=1,
                    clan_id=1,
                    author_user_id=2,
                    shop_id=1,
                    message=f'Original placement {index}',
                    priority_mode='paid',
                    visibility_scope='direct_communities',
                    expires_at=expiry,
                    authorized_expires_at=expiry,
                    serving_status_changed_at=activated_at,
                    created_at=activated_at,
                )
            )
        db.commit()
        return int(campaign.id)


def test_authorized_day_is_elapsed_time_from_activation() -> None:
    afternoon = datetime(2026, 10, 16, 15, 30, tzinfo=timezone.utc)
    before_midnight = datetime(2026, 10, 16, 23, 59, 59, tzinfo=timezone.utc)

    assert activation_expiry(afternoon) == datetime(2026, 10, 17, 15, 30, tzinfo=timezone.utc)
    assert activation_expiry(before_midnight) == datetime(2026, 10, 17, 23, 59, 59, tzinfo=timezone.utc)
    assert activation_expiry(afternoon, authorized_days=3) == datetime(
        2026, 10, 19, 15, 30, tzinfo=timezone.utc
    )


def test_correction_preserves_entitlement_rounds_and_per_placement_expiry(monkeypatch) -> None:
    monkeypatch.setenv('GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED', '1')
    _seed_foundation()
    activated_at = datetime(2026, 10, 16, 12, 0, tzinfo=timezone.utc)
    campaign_expiry = activated_at + timedelta(hours=24)
    placement_expiries = (
        activated_at + timedelta(hours=6),
        activated_at + timedelta(hours=20),
    )
    campaign_id = _seed_campaign(
        activated_at=activated_at,
        campaign_expiry=campaign_expiry,
        placement_expiries=placement_expiries,
    )

    with SessionLocal() as db:
        campaign = db.get(SpotlightCampaign, campaign_id)
        placements = (
            db.query(MarketplaceBroadcast)
            .filter(MarketplaceBroadcast.spotlight_campaign_id == campaign_id)
            .order_by(MarketplaceBroadcast.id.asc())
            .all()
        )
        db.add(
            SpotlightCampaignPacingState(
                campaign_id=campaign_id,
                max_delivery_rounds=10,
                consumed_delivery_rounds=10,
                exhausted=True,
            )
        )
        db.add(
            SpotlightPresentationLease(
                presentation_id='active-before-correction',
                issuance_key='active-before-correction',
                viewer_user_id=1,
                campaign_id=campaign_id,
                placement_broadcast_id=int(placements[0].id),
                content_version=1,
                surface=SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP,
                status='issued',
                issued_at=activated_at + timedelta(minutes=59),
                lease_expires_at=activated_at + timedelta(hours=1, seconds=29),
            )
        )
        db.commit()

        place_correction_hold(db, campaign=campaign, now=activated_at + timedelta(hours=1))
        db.commit()
        assert campaign.serving_status == SPOTLIGHT_CORRECTION_HOLD
        assert [row.authorized_expires_at.replace(tzinfo=timezone.utc) for row in placements] == list(
            placement_expiries
        )

        version = replace_content(
            db,
            campaign=campaign,
            content_kind='marketplace_product',
            content_fingerprint='b' * 64,
            source_product_id=1,
            message='Corrected wording',
            image_url='/uploads/corrected.jpg',
            video_url=None,
            now=activated_at + timedelta(hours=2),
        )
        db.commit()

        pacing = db.query(SpotlightCampaignPacingState).filter_by(campaign_id=campaign_id).one()
        lease = db.query(SpotlightPresentationLease).filter_by(
            presentation_id='active-before-correction'
        ).one()
        versions = (
            db.query(SpotlightContentVersion)
            .filter(SpotlightContentVersion.campaign_id == campaign_id)
            .order_by(SpotlightContentVersion.version.asc())
            .all()
        )
        db.refresh(campaign)
        for row in placements:
            db.refresh(row)

        assert campaign.activated_at.replace(tzinfo=timezone.utc) == activated_at
        assert campaign.authorized_expires_at.replace(tzinfo=timezone.utc) == campaign_expiry
        assert campaign.content_version == 2
        assert campaign.source_product_id == 1
        assert version.version == 2
        assert version.source_product_id == 1
        assert [row.authorized_expires_at.replace(tzinfo=timezone.utc) for row in placements] == list(
            placement_expiries
        )
        assert [row.serving_status for row in placements] == [SPOTLIGHT_SERVING, SPOTLIGHT_SERVING]
        assert (pacing.consumed_delivery_rounds, pacing.max_delivery_rounds, pacing.exhausted) == (
            10,
            10,
            True,
        )
        assert lease.status == 'invalidated'
        assert lease.invalidation_reason == 'correction_hold'
        assert [(row.version, row.change_kind) for row in versions] == [
            (1, 'activation'),
            (2, 'correction'),
        ]


def test_delayed_replacement_never_revives_an_expired_placement(monkeypatch) -> None:
    monkeypatch.setenv('GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED', '1')
    _seed_foundation()
    activated_at = datetime(2026, 10, 16, 12, 0, tzinfo=timezone.utc)
    campaign_expiry = activated_at + timedelta(hours=24)
    campaign_id = _seed_campaign(
        activated_at=activated_at,
        campaign_expiry=campaign_expiry,
        placement_expiries=(
            activated_at + timedelta(minutes=90),
            activated_at + timedelta(hours=20),
        ),
    )

    with SessionLocal() as db:
        campaign = db.get(SpotlightCampaign, campaign_id)
        place_correction_hold(db, campaign=campaign, now=activated_at + timedelta(hours=1))
        replace_content(
            db,
            campaign=campaign,
            content_kind='broadcast_snapshot',
            content_fingerprint='c' * 64,
            message='Replacement after a delay',
            image_url=None,
            video_url=None,
            now=activated_at + timedelta(hours=2),
        )
        db.commit()
        placements = (
            db.query(MarketplaceBroadcast)
            .filter_by(spotlight_campaign_id=campaign_id)
            .order_by(MarketplaceBroadcast.id.asc())
            .all()
        )

        assert placements[0].serving_status == SPOTLIGHT_EXPIRED
        assert placements[1].serving_status == SPOTLIGHT_SERVING
        assert placements[0].authorized_expires_at.replace(tzinfo=timezone.utc) == (
            activated_at + timedelta(minutes=90)
        )
        assert placements[1].authorized_expires_at.replace(tzinfo=timezone.utc) == (
            activated_at + timedelta(hours=20)
        )
        assert campaign.authorized_expires_at.replace(tzinfo=timezone.utc) == campaign_expiry


def test_expired_or_withdrawn_campaign_cannot_be_revived_and_withdrawal_is_idempotent(
    monkeypatch,
) -> None:
    monkeypatch.setenv('GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED', '1')
    _seed_foundation()
    activated_at = datetime(2026, 10, 16, 12, 0, tzinfo=timezone.utc)
    campaign_expiry = activated_at + timedelta(hours=24)
    campaign_id = _seed_campaign(
        activated_at=activated_at,
        campaign_expiry=campaign_expiry,
        placement_expiries=(campaign_expiry,),
    )

    with SessionLocal() as db:
        campaign = db.get(SpotlightCampaign, campaign_id)
        with pytest.raises(SpotlightLifecycleError) as expired:
            replace_content(
                db,
                campaign=campaign,
                content_kind='broadcast_snapshot',
                content_fingerprint='d' * 64,
                message='Too late',
                image_url=None,
                video_url=None,
                now=campaign_expiry,
            )
        assert expired.value.code == 'campaign_expired'

        permanently_withdraw(db, campaign=campaign, now=activated_at + timedelta(hours=3))
        permanently_withdraw(db, campaign=campaign, now=activated_at + timedelta(hours=4))
        db.commit()
        placement = db.query(MarketplaceBroadcast).filter_by(
            spotlight_campaign_id=campaign_id
        ).one()

        assert campaign.status == 'ended'
        assert campaign.serving_status == SPOTLIGHT_WITHDRAWN
        assert placement.serving_status == SPOTLIGHT_WITHDRAWN
        assert campaign.authorized_expires_at.replace(tzinfo=timezone.utc) == campaign_expiry
        assert db.query(MarketplaceBroadcast).filter_by(
            spotlight_campaign_id=campaign_id
        ).count() == 1
        assert db.query(TrustEvent).count() == 0

        with pytest.raises(SpotlightLifecycleError) as withdrawn:
            replace_content(
                db,
                campaign=campaign,
                content_kind='broadcast_snapshot',
                content_fingerprint='e' * 64,
                message='Do not revive',
                image_url=None,
                video_url=None,
                now=activated_at + timedelta(hours=5),
            )
        assert withdrawn.value.code == 'campaign_permanently_withdrawn'


def test_presentation_retry_reuses_lease_and_earliest_deadline(monkeypatch) -> None:
    monkeypatch.setenv('SECRET_KEY', 'pytest-controlled-spotlight-lease')
    _seed_foundation()
    now = datetime.now(timezone.utc).replace(microsecond=0)
    campaign_id = _seed_campaign(
        activated_at=now,
        campaign_expiry=now + timedelta(hours=24),
        placement_expiries=(now + timedelta(seconds=12),),
    )
    with SessionLocal() as db:
        campaign = db.get(SpotlightCampaign, campaign_id)
        campaign.opportunity_expires_at = now + timedelta(seconds=20)
        db.commit()

        first = select_spotlight_presentation(
            db,
            viewer_user_id=1,
            now=now,
            issuance_key='stable-network-retry-key',
        )
        db.commit()
        replay = select_spotlight_presentation(
            db,
            viewer_user_id=1,
            now=now + timedelta(seconds=3),
            issuance_key='stable-network-retry-key',
        )
        db.commit()
        pacing = db.query(SpotlightCampaignPacingState).filter_by(campaign_id=campaign_id).one()
        leases = db.query(SpotlightPresentationLease).filter_by(campaign_id=campaign_id).all()

        assert first.selected is True
        assert replay.selected is True
        assert replay.presentation_id == first.presentation_id
        assert replay.token_expires_at == first.token_expires_at
        assert replay.delivery_round_consumed is False
        assert first.token_expires_at == now + timedelta(seconds=12)
        assert pacing.consumed_delivery_rounds == 1
        assert len(leases) == 1
        assert revalidate_spotlight_presentation(
            db,
            viewer_user_id=1,
            presentation_token=first.presentation_token or '',
            now=now + timedelta(seconds=11),
        )['valid'] is True
        assert revalidate_spotlight_presentation(
            db,
            viewer_user_id=1,
            presentation_token=first.presentation_token or '',
            now=now + timedelta(seconds=12),
        )['valid'] is False


def test_active_display_is_invalidated_by_correction_hold(monkeypatch) -> None:
    monkeypatch.setenv('SECRET_KEY', 'pytest-controlled-spotlight-hold')
    monkeypatch.setenv('GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED', '1')
    _seed_foundation()
    now = datetime.now(timezone.utc).replace(microsecond=0)
    campaign_id = _seed_campaign(
        activated_at=now,
        campaign_expiry=now + timedelta(hours=24),
        placement_expiries=(now + timedelta(hours=24),),
    )
    with SessionLocal() as db:
        selection = select_spotlight_presentation(
            db,
            viewer_user_id=1,
            now=now,
            issuance_key='display-being-withdrawn',
        )
        db.commit()
        campaign = db.get(SpotlightCampaign, campaign_id)
        place_correction_hold(db, campaign=campaign, now=now + timedelta(seconds=1))
        db.commit()

        result = revalidate_spotlight_presentation(
            db,
            viewer_user_id=1,
            presentation_token=selection.presentation_token or '',
            now=now + timedelta(seconds=2),
        )
        assert result['valid'] is False
        assert result['rejection_code'] == 'correction_hold'


def test_lifecycle_writers_are_disabled_by_default(monkeypatch) -> None:
    monkeypatch.delenv('GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED', raising=False)
    _seed_foundation()
    now = datetime.now(timezone.utc).replace(microsecond=0)
    campaign_id = _seed_campaign(
        activated_at=now,
        campaign_expiry=now + timedelta(hours=24),
        placement_expiries=(now + timedelta(hours=24),),
    )
    with SessionLocal() as db:
        campaign = db.get(SpotlightCampaign, campaign_id)
        with pytest.raises(SpotlightLifecycleError) as disabled:
            place_correction_hold(db, campaign=campaign, now=now + timedelta(hours=1))
        assert disabled.value.code == 'spotlight_lifecycle_writers_disabled'
        with pytest.raises(SpotlightLifecycleError) as withdrawal_disabled:
            permanently_withdraw(db, campaign=campaign, now=now + timedelta(hours=1))
        assert withdrawal_disabled.value.code == 'spotlight_lifecycle_writers_disabled'


def test_publish_ignores_caller_expiry_and_exhausted_paid_retry_consumes_no_credit(
    client,
    override_current_user_user,
) -> None:
    now = datetime.now(timezone.utc)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, role, gmfn_id, display_name
                ) VALUES (
                    1, 'pytest@example.com', 'hashed', 'member',
                    'GSN-PUBLISH-OWNER', 'Publish Owner'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, marketplace_name, community_code,
                    status, invite_code, invite_uses
                ) VALUES (
                    1, 'Publish Community', 'Publish Market',
                    'GSN-PUBLISH-COMMUNITY', 'active', 'PUBLISH-1', 0
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (
                    id, clan_id, user_id, role, personal_pool_balance
                ) VALUES (1, 1, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Publish Shop', 'Duration and exhaustion test', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    id, owner_user_id, clan_id, shop_id, feature_code, plan_code,
                    quantity_total, quantity_used, status, starts_at, expires_at,
                    payment_reference
                ) VALUES (
                    1, 1, 1, 1, 'spotlight_priority', 'spotlight_credit_pack',
                    2, 0, 'active', :starts_at, :expires_at, 'LOCAL-EXHAUSTION'
                )
                """
            ),
            {
                'starts_at': now - timedelta(minutes=1),
                'expires_at': now + timedelta(days=30),
            },
        )

    payload = {
        'clan_id': 1,
        'shop_id': 1,
        'message': 'Same paid and free content',
        'priority_mode': 'free',
        'visibility_scope': 'direct_communities',
        'expires_at': '2035-01-01T00:00:00Z',
        'idempotency_key': 'local-free-activation-1',
    }
    activation = client.post('/marketplace/broadcasts', json=payload)
    assert activation.status_code == 200, activation.text
    item = activation.json()['item']
    activated_at = datetime.fromisoformat(item['activated_at'])
    authorized_expires_at = datetime.fromisoformat(item['authorized_expires_at'])
    activated_at = activated_at.replace(tzinfo=activated_at.tzinfo or timezone.utc)
    authorized_expires_at = authorized_expires_at.replace(
        tzinfo=authorized_expires_at.tzinfo or timezone.utc
    )
    assert authorized_expires_at - activated_at == timedelta(hours=24)
    assert authorized_expires_at.year != 2035

    campaign_id = int(item['spotlight_campaign_id'])
    paid_payload = dict(payload)
    paid_payload['priority_mode'] = 'paid'
    paid_payload['idempotency_key'] = 'local-paid-publication-1'
    with ThreadPoolExecutor(max_workers=2) as pool:
        concurrent_results = list(
            pool.map(
                lambda _: client.post('/marketplace/broadcasts', json=paid_payload),
                range(2),
            )
        )
    assert any(result.status_code == 200 for result in concurrent_results)
    assert {result.status_code for result in concurrent_results}.issubset({200, 409})
    paid_replay = client.post('/marketplace/broadcasts', json=paid_payload)
    assert paid_replay.status_code == 200, paid_replay.text
    assert paid_replay.json()['idempotent_replay'] is True
    assert paid_replay.json()['credit_consumed_by_replay'] is False

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaign_pacing_states (
                    campaign_id, max_delivery_rounds, consumed_delivery_rounds,
                    pacing_profile, exhausted, version
                ) VALUES (
                    :campaign_id, 10, 10, 'neutral', 1, 10
                )
                """
            ),
            {'campaign_id': campaign_id},
        )

    exhausted_payload = dict(paid_payload)
    exhausted_payload['idempotency_key'] = 'local-paid-after-exhaustion-2'
    rejected = client.post('/marketplace/broadcasts', json=exhausted_payload)
    assert rejected.status_code == 409, rejected.text
    assert rejected.json()['detail']['code'] == 'spotlight_delivery_rounds_exhausted'
    assert 'No credit was consumed' in rejected.json()['detail']['message']

    with engine.begin() as conn:
        used = conn.execute(
            text('SELECT quantity_used FROM feature_entitlements WHERE id = 1')
        ).scalar_one()
        usage_events = conn.execute(
            text('SELECT COUNT(*) FROM feature_usage_events')
        ).scalar_one()
        broadcasts = conn.execute(
            text('SELECT COUNT(*) FROM marketplace_broadcasts')
        ).scalar_one()
    assert int(used) == 1
    assert int(usage_events) == 1
    assert int(broadcasts) == 2
