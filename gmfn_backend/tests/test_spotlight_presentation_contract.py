from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.core.security import create_access_token
from app.db.database import SessionLocal, engine
os.environ.setdefault("SECRET_KEY", "pytest-spotlight-presentation-contract-secret")

from app.services.spotlight_presentation_service import (
    SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO,
    SPOTLIGHT_PRESENTATION_REPLAY_TTL_SECONDS,
    SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS,
    SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP,
    SPOTLIGHT_PRESENTATION_TOKEN_TYPE,
    list_spotlight_presentation_replays,
    record_spotlight_presentation_qualification,
    select_spotlight_presentation,
)


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _fingerprint(campaign_id: int) -> str:
    return f"{int(campaign_id):064d}"[-64:]


def _seed_users_and_clans(*, owner_user_id: int = 2) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, role, gmfn_id,
                    display_name, trust_score, trust_band, trust_score_updated_at
                ) VALUES
                    (1, 'phase4e2-viewer@example.com', 'hashed', 'member',
                     'GSN-P4E2-VIEWER', 'Phase 4E2 Viewer', 70, 'B', CURRENT_TIMESTAMP),
                    (:owner_user_id, 'phase4e2-owner@example.com', 'hashed', 'member',
                     'GSN-P4E2-OWNER', 'Phase 4E2 Owner', 72, 'B', CURRENT_TIMESTAMP)
                """
            ),
            {"owner_user_id": owner_user_id},
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, marketplace_name, community_code, status,
                    invite_code, invite_uses, created_at
                ) VALUES (
                    1, 'Phase 4E2 Community', 'Phase 4E2 Market', 'GMFN-P4E2-0001',
                    'active', 'P4E2-0001', 0, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 1, 'member', 0),
                    (2, 1, :owner_user_id, 'member', 0)
                """
            ),
            {"owner_user_id": owner_user_id},
        )


def _seed_campaign_and_broadcast(*, campaign_id: int = 1, owner_user_id: int = 2) -> None:
    current_time = _now()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaigns (
                    id, owner_user_id, shop_id, origin_clan_id, source_product_id,
                    content_kind, content_fingerprint, status, source_kind,
                    commercial_mode, distribution_scope, opportunity_intent,
                    opportunity_category, opportunity_subcategory,
                    opportunity_geo_scope, opportunity_availability,
                    created_at, activated_at, expires_at
                ) VALUES (
                    :campaign_id, :owner_user_id, NULL, 1, NULL,
                    'broadcast_snapshot', :fingerprint, 'active', 'direct_broadcast',
                    'free', 'direct_communities', 'offer',
                    'business_service', 'phase4e2', 'community', 'available',
                    :created_at, :activated_at, :expires_at
                )
                """
            ),
            {
                "campaign_id": campaign_id,
                "owner_user_id": owner_user_id,
                "fingerprint": _fingerprint(campaign_id),
                "created_at": current_time - timedelta(hours=1),
                "activated_at": current_time - timedelta(hours=1),
                "expires_at": current_time + timedelta(days=30),
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, spotlight_campaign_id, clan_id, author_user_id, message,
                    priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    :broadcast_id, :campaign_id, 1, :owner_user_id,
                    'Phase 4E2 canonical public shop presentation',
                    'free', 'direct_communities', :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "broadcast_id": campaign_id,
                "campaign_id": campaign_id,
                "owner_user_id": owner_user_id,
                "expires_at": current_time + timedelta(days=30),
            },
        )


def _ledger_count() -> int:
    with engine.begin() as conn:
        return int(conn.execute(text("SELECT COUNT(*) FROM spotlight_exposure_events")).scalar_one())


def _attention_count() -> int:
    with engine.begin() as conn:
        return int(conn.execute(text("SELECT COUNT(*) FROM marketplace_attention_events")).scalar_one())


def _consumed_rounds() -> int:
    with engine.begin() as conn:
        return int(
            conn.execute(
                text("SELECT COALESCE(SUM(consumed_delivery_rounds), 0) FROM spotlight_campaign_pacing_states")
            ).scalar_one()
        )


def _set_next_delivery_now(campaign_id: int, when: datetime) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE spotlight_campaign_pacing_states
                SET next_eligible_delivery_at = :when, exhausted = 0
                WHERE campaign_id = :campaign_id
                """
            ),
            {"when": when, "campaign_id": campaign_id},
        )


def _signed_presentation_token(*, presentation_id: str, campaign_id: int = 1, viewer_user_id: int = 1) -> str:
    return create_access_token(
        {
            "typ": SPOTLIGHT_PRESENTATION_TOKEN_TYPE,
            "sid": presentation_id,
            "viewer_user_id": viewer_user_id,
            "campaign_id": campaign_id,
            "surface": SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP,
            "issued_at": _now().isoformat(),
        },
        expires_delta=timedelta(minutes=10),
    )


def test_public_shop_presentation_fetch_consumes_delivery_round_but_not_impression(
    client,
    override_current_user_user,
):
    _seed_users_and_clans()
    _seed_campaign_and_broadcast()

    response = client.get("/marketplace/public/shop/GSN-P4E2-OWNER/spotlight-opportunity")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["item"]["is_canonical_opportunity"] is True
    assert body["presentation"]["surface"] == SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP
    assert body["presentation"]["delivery_round_consumed"] is True
    assert _consumed_rounds() == 1
    assert _ledger_count() == 0


def test_visible_presentation_qualifies_once_and_retry_dedupes(client, override_current_user_user):
    _seed_users_and_clans()
    _seed_campaign_and_broadcast()
    token_response = client.get("/marketplace/public/shop/GSN-P4E2-OWNER/spotlight-opportunity")
    body = token_response.json()
    token = body["presentation"]["presentation_token"]
    presentation_id = body["presentation"]["presentation_id"]
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE spotlight_presentation_leases
                SET issued_at = :issued_at
                WHERE presentation_id = :presentation_id
                """
            ),
            {
                "issued_at": _now() - timedelta(seconds=2),
                "presentation_id": presentation_id,
            },
        )

    hidden = client.post(
        "/marketplace/spotlight-presentations/qualify",
        json={
            "presentation_token": token,
            "qualification_key": presentation_id,
            "visible_ms": SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS,
            "visible_ratio": SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO,
            "document_visible": False,
        },
    )
    assert hidden.status_code == 200, hidden.text
    assert hidden.json()["recorded"] is False
    assert hidden.json()["rejection_code"] == "document_hidden"
    assert _ledger_count() == 0

    valid_payload = {
        "presentation_token": token,
        "qualification_key": presentation_id,
        "visible_ms": SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS,
        "visible_ratio": SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO,
        "document_visible": True,
    }
    first = client.post("/marketplace/spotlight-presentations/qualify", json=valid_payload)
    retry = client.post("/marketplace/spotlight-presentations/qualify", json=valid_payload)
    changed_key_retry = client.post(
        "/marketplace/spotlight-presentations/qualify",
        json={**valid_payload, "qualification_key": f"{presentation_id}:changed-client-key"},
    )

    assert first.status_code == 200, first.text
    assert retry.status_code == 200, retry.text
    assert changed_key_retry.status_code == 200, changed_key_retry.text
    assert first.json()["recorded"] is True
    assert retry.json()["recorded"] is False
    assert retry.json()["deduped"] is True
    assert changed_key_retry.json()["recorded"] is False
    assert changed_key_retry.json()["deduped"] is True
    assert _ledger_count() == 1
    assert _attention_count() == 0
    with engine.begin() as conn:
        attribution = conn.execute(
            text(
                """
                SELECT content_version, presentation_id
                FROM spotlight_exposure_events
                """
            )
        ).mappings().one()
    assert int(attribution["content_version"]) == 1
    assert attribution["presentation_id"] == presentation_id


def test_own_public_shop_can_present_another_member_without_self_delivery(
    client,
    override_current_user_user,
):
    _seed_users_and_clans()
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE users SET gmfn_id = 'GSN-P4E2-OTHER' WHERE id = 2")
        )
        conn.execute(
            text("UPDATE users SET gmfn_id = 'GSN-P4E2-OWNER' WHERE id = 1")
        )
    _seed_campaign_and_broadcast(owner_user_id=1)
    _seed_campaign_and_broadcast(campaign_id=2, owner_user_id=2)

    response = client.get("/marketplace/public/shop/GSN-P4E2-OWNER/spotlight-opportunity")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["item"]["id"] == 2
    assert body["item"]["author_gmfn_id"] == "GSN-P4E2-OTHER"
    assert body["item"]["is_canonical_opportunity"] is True
    assert body["presentation"]["campaign_id"] == 2
    assert body["fallback"] is None
    assert body["serving_contract_version"] == 2
    assert body["rejection_code"] is None
    assert _consumed_rounds() == 1
    assert _ledger_count() == 0


def test_later_presentation_can_qualify_but_frequency_cap_blocks_forbidden_repeat():
    _seed_users_and_clans()
    _seed_campaign_and_broadcast()
    first_time = _now()

    with SessionLocal() as db:
        first = select_spotlight_presentation(db, viewer_user_id=1, now=first_time)
        db.commit()
        assert first.selected is True
        first_result = record_spotlight_presentation_qualification(
            db,
            viewer_user_id=1,
            presentation_token=first.presentation_token or "",
            qualification_key="first-visible",
            event_at=first_time + timedelta(seconds=2),
            visible_ms=SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS,
            visible_ratio=SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO,
            document_visible=True,
        )
        db.commit()

    assert first_result.recorded is True

    second_time = first_time + timedelta(minutes=30)
    third_time = first_time + timedelta(hours=1)
    with engine.begin() as conn:
        for presentation_id, issued_at in (
            ("second-visible", second_time),
            ("third-visible", third_time),
        ):
            conn.execute(
                text(
                    """
                    INSERT INTO spotlight_presentation_leases (
                        presentation_id, issuance_key, viewer_user_id, campaign_id,
                        placement_broadcast_id, content_version, surface, status,
                        issued_at, lease_expires_at
                    ) VALUES (
                        :presentation_id, :presentation_id, 1, 1,
                        1, 1, :surface, 'issued', :issued_at, :lease_expires_at
                    )
                    """
                ),
                {
                    "presentation_id": presentation_id,
                    "surface": SPOTLIGHT_PRESENTATION_SURFACE_PUBLIC_SHOP,
                    "issued_at": issued_at,
                    "lease_expires_at": issued_at + timedelta(seconds=30),
                },
            )

    with SessionLocal() as db:
        second_result = record_spotlight_presentation_qualification(
            db,
            viewer_user_id=1,
            presentation_token=_signed_presentation_token(presentation_id="second-visible"),
            qualification_key="second-visible",
            event_at=second_time + timedelta(seconds=2),
            visible_ms=SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS,
            visible_ratio=SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO,
            document_visible=True,
        )
        third_result = record_spotlight_presentation_qualification(
            db,
            viewer_user_id=1,
            presentation_token=_signed_presentation_token(presentation_id="third-visible"),
            qualification_key="third-visible",
            event_at=third_time + timedelta(seconds=2),
            visible_ms=SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS,
            visible_ratio=SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO,
            document_visible=True,
        )
        db.commit()

    assert second_result.recorded is True
    assert third_result.recorded is False
    assert third_result.rejection_code == "candidate_not_currently_presentable"
    assert _ledger_count() == 2


def test_unlinked_repost_fallback_stays_outside_canonical_ledger(client, override_current_user_user):
    _seed_users_and_clans()
    current_time = _now()
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, spotlight_campaign_id, clan_id, author_user_id, message,
                    priority_mode, visibility_scope, expires_at, created_at
                ) VALUES (
                    90, NULL, 1, 2, 'Legacy unlinked repost fallback',
                    'paid', 'marketplace_repost', :expires_at, CURRENT_TIMESTAMP
                )
                """
            ),
            {"expires_at": current_time + timedelta(days=2)},
        )

    response = client.get("/marketplace/public/shop/GSN-P4E2-OWNER/spotlight-opportunity")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["item"] is None
    assert body["fallback"] is None
    assert body["serving_contract_version"] == 2
    assert _consumed_rounds() == 0
    assert _ledger_count() == 0


def test_qualified_presentation_replays_without_new_delivery_or_exposure(
    client,
    override_current_user_user,
):
    _seed_users_and_clans()
    _seed_campaign_and_broadcast()

    issued = client.get(
        "/marketplace/public/shop/GSN-P4E2-OWNER/spotlight-opportunity"
    )
    assert issued.status_code == 200, issued.text
    issued_body = issued.json()
    presentation_id = issued_body["presentation"]["presentation_id"]
    token = issued_body["presentation"]["presentation_token"]
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE spotlight_presentation_leases
                SET issued_at = :issued_at
                WHERE presentation_id = :presentation_id
                """
            ),
            {
                "issued_at": _now() - timedelta(seconds=2),
                "presentation_id": presentation_id,
            },
        )

    qualified = client.post(
        "/marketplace/spotlight-presentations/qualify",
        json={
            "presentation_token": token,
            "qualification_key": presentation_id,
            "visible_ms": SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS,
            "visible_ratio": SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO,
            "document_visible": True,
        },
    )
    assert qualified.status_code == 200, qualified.text
    assert qualified.json()["recorded"] is True
    rounds_before = _consumed_rounds()
    exposures_before = _ledger_count()

    replay_response = client.get(
        "/marketplace/public/shop/GSN-P4E2-OWNER/spotlight-opportunity"
    )

    assert replay_response.status_code == 200, replay_response.text
    replay_body = replay_response.json()
    replay = replay_body["item"]
    assert replay_body["presentation"] is None
    assert replay["is_canonical_opportunity"] is True
    assert replay["is_canonical_replay"] is True
    assert replay["opportunity_presentation_id"] == presentation_id
    assert replay["opportunity_presentation_token"] is None
    assert replay["opportunity_counts_as_delivery"] is False
    assert replay["opportunity_counts_as_exposure"] is False
    assert datetime.fromisoformat(replay["opportunity_replay_expires_at"]) > _now()
    assert _consumed_rounds() == rounds_before == 1
    assert _ledger_count() == exposures_before == 1


def test_frequency_capped_due_campaign_replays_without_new_counting(
    client,
    override_current_user_user,
):
    _seed_users_and_clans()
    _seed_campaign_and_broadcast()

    latest_presentation_id = ''
    for qualification_number in range(2):
        issued = client.get(
            '/marketplace/public/shop/GSN-P4E2-OWNER/spotlight-opportunity'
        )
        assert issued.status_code == 200, issued.text
        issued_body = issued.json()
        assert issued_body['presentation'] is not None
        latest_presentation_id = issued_body['presentation']['presentation_id']
        token = issued_body['presentation']['presentation_token']
        with engine.begin() as conn:
            conn.execute(
                text(
                    '''
                    UPDATE spotlight_presentation_leases
                    SET issued_at = :issued_at
                    WHERE presentation_id = :presentation_id
                    '''
                ),
                {
                    'issued_at': _now() - timedelta(seconds=2),
                    'presentation_id': latest_presentation_id,
                },
            )

        qualified = client.post(
            '/marketplace/spotlight-presentations/qualify',
            json={
                'presentation_token': token,
                'qualification_key': latest_presentation_id,
                'visible_ms': SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS,
                'visible_ratio': SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO,
                'document_visible': True,
            },
        )
        assert qualified.status_code == 200, qualified.text
        assert qualified.json()['recorded'] is True
        if qualification_number == 0:
            _set_next_delivery_now(1, _now() - timedelta(seconds=1))

    _set_next_delivery_now(1, _now() - timedelta(seconds=1))
    rounds_before = _consumed_rounds()
    exposures_before = _ledger_count()
    attention_before = _attention_count()
    with engine.begin() as conn:
        leases_before = int(
            conn.execute(
                text('SELECT COUNT(*) FROM spotlight_presentation_leases')
            ).scalar_one()
        )
    requested_at = _now()

    replay_response = client.get(
        '/marketplace/public/shop/GSN-P4E2-OWNER/spotlight-opportunity'
    )

    assert replay_response.status_code == 200, replay_response.text
    replay_body = replay_response.json()
    replay = replay_body['item']
    replay_expires_at = datetime.fromisoformat(
        replay['opportunity_replay_expires_at']
    )
    assert replay_body['presentation'] is None
    assert replay['is_canonical_replay'] is True
    assert replay['opportunity_presentation_id'] == latest_presentation_id
    assert replay['opportunity_presentation_token'] is None
    assert replay['opportunity_counts_as_delivery'] is False
    assert replay['opportunity_counts_as_exposure'] is False
    assert requested_at < replay_expires_at
    assert replay_expires_at <= requested_at + timedelta(
        seconds=SPOTLIGHT_PRESENTATION_REPLAY_TTL_SECONDS + 2
    )
    assert _consumed_rounds() == rounds_before == 2
    assert _ledger_count() == exposures_before == 2
    assert _attention_count() == attention_before
    with engine.begin() as conn:
        assert int(
            conn.execute(
                text('SELECT COUNT(*) FROM spotlight_presentation_leases')
            ).scalar_one()
        ) == leases_before


def test_exhausted_campaign_replays_qualified_item_without_new_counting(
    client,
    override_current_user_user,
):
    _seed_users_and_clans()
    _seed_campaign_and_broadcast()

    issued = client.get(
        "/marketplace/public/shop/GSN-P4E2-OWNER/spotlight-opportunity"
    )
    assert issued.status_code == 200, issued.text
    issued_body = issued.json()
    presentation_id = issued_body["presentation"]["presentation_id"]
    token = issued_body["presentation"]["presentation_token"]
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE spotlight_presentation_leases
                SET issued_at = :issued_at
                WHERE presentation_id = :presentation_id
                """
            ),
            {
                "issued_at": _now() - timedelta(seconds=2),
                "presentation_id": presentation_id,
            },
        )

    qualified = client.post(
        "/marketplace/spotlight-presentations/qualify",
        json={
            "presentation_token": token,
            "qualification_key": presentation_id,
            "visible_ms": SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS,
            "visible_ratio": SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO,
            "document_visible": True,
        },
    )
    assert qualified.status_code == 200, qualified.text
    assert qualified.json()["recorded"] is True

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE spotlight_campaign_pacing_states
                SET consumed_delivery_rounds = max_delivery_rounds,
                    next_eligible_delivery_at = NULL,
                    exhausted = 1
                WHERE campaign_id = 1
                """
            )
        )
    rounds_before = _consumed_rounds()
    exposures_before = _ledger_count()
    requested_at = _now()

    replay_response = client.get(
        "/marketplace/public/shop/GSN-P4E2-OWNER/spotlight-opportunity"
    )

    assert replay_response.status_code == 200, replay_response.text
    replay_body = replay_response.json()
    replay = replay_body["item"]
    replay_expires_at = datetime.fromisoformat(
        replay["opportunity_replay_expires_at"]
    )
    assert replay_body["presentation"] is None
    assert replay["is_canonical_opportunity"] is True
    assert replay["is_canonical_replay"] is True
    assert replay["opportunity_presentation_id"] == presentation_id
    assert replay["opportunity_presentation_token"] is None
    assert replay["opportunity_counts_as_delivery"] is False
    assert replay["opportunity_counts_as_exposure"] is False
    assert requested_at < replay_expires_at
    assert replay_expires_at <= requested_at + timedelta(
        seconds=SPOTLIGHT_PRESENTATION_REPLAY_TTL_SECONDS + 2
    )
    assert _consumed_rounds() == rounds_before
    assert _ledger_count() == exposures_before == 1


def test_replay_revalidates_viewer_and_exact_community_route(
    client,
    override_current_user_user,
):
    _seed_users_and_clans()
    _seed_campaign_and_broadcast()
    issued = client.get(
        "/marketplace/public/shop/GSN-P4E2-OWNER/spotlight-opportunity"
    ).json()
    presentation_id = issued["presentation"]["presentation_id"]
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE spotlight_presentation_leases
                SET issued_at = :issued_at
                WHERE presentation_id = :presentation_id
                """
            ),
            {
                "issued_at": _now() - timedelta(seconds=2),
                "presentation_id": presentation_id,
            },
        )
    qualified = client.post(
        "/marketplace/spotlight-presentations/qualify",
        json={
            "presentation_token": issued["presentation"]["presentation_token"],
            "qualification_key": presentation_id,
            "visible_ms": SPOTLIGHT_PRESENTATION_QUALIFYING_VISIBLE_MS,
            "visible_ratio": SPOTLIGHT_PRESENTATION_MIN_VISIBLE_RATIO,
            "document_visible": True,
        },
    )
    assert qualified.json()["recorded"] is True

    with SessionLocal() as db:
        assert len(list_spotlight_presentation_replays(db, viewer_user_id=1)) == 1
        assert list_spotlight_presentation_replays(db, viewer_user_id=2) == []

    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM clan_memberships WHERE clan_id = 1 AND user_id = 1")
        )

    with SessionLocal() as db:
        assert list_spotlight_presentation_replays(db, viewer_user_id=1) == []
