from datetime import datetime, timezone

from sqlalchemy import text

import app.services.spotlight_retention_service as retention
from app.db.database import SessionLocal, engine


NOW = datetime(2026, 10, 18, 12, 0, tzinfo=timezone.utc)
FINGERPRINT = "retention-fingerprint"
IMAGE_URL = "/uploads/marketplace/images/retention.jpg"
VIDEO_URL = "/uploads/marketplace/videos/retention.mp4"


def _seed_spotlight_payload(expires_at):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role)
                VALUES
                    (1, 'retention-owner@example.com', 'hashed', 'user'),
                    (2, 'retention-viewer@example.com', 'hashed', 'user')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clans (
                    id, name, community_code, status, invite_uses, created_at
                ) VALUES (
                    1, 'Retention Clan', 'RETENTION-CLAN-1', 'active', 0, :created_at
                )
                """
            ),
            {"created_at": NOW},
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clan_memberships (
                    id, clan_id, user_id, role, personal_pool_balance, created_at
                ) VALUES (
                    1, 1, 1, 'owner', 0, :created_at
                )
                """
            ),
            {"created_at": NOW},
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description,
                    is_active, created_at
                ) VALUES (
                    10, 1, 1, 'Retention Shop', 'Retention test shop',
                    1, :created_at
                )
                """
            ),
            {"created_at": NOW},
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaigns (
                    id, serving_status, content_version, owner_user_id, shop_id,
                    origin_clan_id, source_product_id, content_kind,
                    content_fingerprint, status, source_kind, commercial_mode,
                    distribution_scope, created_at, activated_at, expires_at,
                    authorized_expires_at, serving_status_changed_at
                ) VALUES (
                    20, 'serving', 1, 1, 10, 1, NULL,
                    'broadcast_snapshot', :fingerprint, 'active',
                    'direct_broadcast', 'free', 'direct_communities',
                    :created_at, :activated_at, :expires_at, :expires_at,
                    :activated_at
                )
                """
            ),
            {
                "fingerprint": FINGERPRINT,
                "created_at": NOW,
                "activated_at": NOW,
                "expires_at": expires_at,
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, publication_key, serving_status, content_version,
                    spotlight_campaign_id, clan_id, author_user_id, shop_id,
                    message, image_url, video_url, priority_mode,
                    visibility_scope, expires_at, authorized_expires_at,
                    serving_status_changed_at, created_at
                ) VALUES (
                    30, 'retention-placement', 'serving', 1, 20, 1, 1, 10,
                    'Retention payload', :image_url, :video_url, 'free',
                    'direct_communities', :expires_at, :expires_at, :created_at,
                    :created_at
                )
                """
            ),
            {
                "image_url": IMAGE_URL,
                "video_url": VIDEO_URL,
                "expires_at": expires_at,
                "created_at": NOW,
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_content_versions (
                    id, campaign_id, version, content_kind, content_fingerprint,
                    source_product_id, message, image_url, video_url,
                    change_kind, activated_at
                ) VALUES (
                    40, 20, 1, 'broadcast_snapshot', :fingerprint, NULL,
                    'Retention payload', :image_url, :video_url, 'activation',
                    :activated_at
                )
                """
            ),
            {
                "fingerprint": FINGERPRINT,
                "image_url": IMAGE_URL,
                "video_url": VIDEO_URL,
                "activated_at": NOW,
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaign_pacing_states (
                    id, campaign_id, max_delivery_rounds,
                    consumed_delivery_rounds, pacing_profile, exhausted,
                    version, created_at, updated_at
                ) VALUES (
                    45, 20, 10, 1, 'neutral', 0, 1, :created_at, :created_at
                )
                """
            ),
            {"created_at": NOW},
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_presentation_leases (
                    id, presentation_id, issuance_key, viewer_user_id,
                    campaign_id, placement_broadcast_id, content_version,
                    surface, status, issued_at, lease_expires_at
                ) VALUES (
                    50, 'retention-presentation', 'retention-issuance', 2,
                    20, 30, 1, 'public_shop', 'qualified', :issued_at,
                    :lease_expires_at
                )
                """
            ),
            {"issued_at": NOW, "lease_expires_at": expires_at},
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_exposure_events (
                    id, content_version, presentation_id, event_type,
                    viewer_user_id, campaign_id, event_at,
                    allocation_route_type, allocation_source_kind,
                    allocation_source_id, allocation_route_clan_id,
                    placement_broadcast_id, idempotency_key,
                    presentation_surface, created_at
                ) VALUES (
                    60, 1, 'retention-presentation', 'qualifying_impression',
                    2, 20, :event_at, 'direct_community', 'clan', 1, 1, 30,
                    'retention-exposure', 'public_shop', :event_at
                )
                """
            ),
            {"event_at": NOW},
        )


def test_compaction_deletes_payload_but_preserves_campaign_version_audit_and_exposure(
    seed_clan_member_membership,
):
    _seed_spotlight_payload(NOW.replace(hour=11))
    with SessionLocal() as db:
        result = retention.compact_expired_spotlight_payloads(db, now=NOW, limit=10)

    assert result["scanned_campaigns"] == 1
    assert result["campaigns_compacted"] == 1
    assert result["placement_rows_deleted"] == 1
    assert result["presentation_leases_deleted"] == 1
    assert result["pacing_rows_deleted"] == 1
    assert result["content_versions_scrubbed"] == 1
    assert result["exposure_links_detached"] == 1
    assert result["media_cleanup_queued"] == 2
    assert result["media_cleanup"] == [
        {"media_url": IMAGE_URL, "status": "already_absent", "provider": "local"},
        {"media_url": VIDEO_URL, "status": "already_absent", "provider": "local"},
    ]

    with engine.begin() as conn:
        campaign = conn.execute(
            text(
                """
                SELECT status, serving_status, payload_compacted_at,
                       source_product_id
                FROM spotlight_campaigns
                WHERE id = 20
                """
            )
        ).one()
        assert campaign.status == "expired"
        assert campaign.serving_status == "expired"
        assert campaign.payload_compacted_at is not None
        assert campaign.source_product_id is None
        assert conn.execute(
            text("SELECT COUNT(*) FROM marketplace_broadcasts WHERE id = 30")
        ).scalar_one() == 0
        assert conn.execute(
            text("SELECT COUNT(*) FROM spotlight_campaign_pacing_states WHERE campaign_id = 20")
        ).scalar_one() == 0
        assert conn.execute(
            text("SELECT COUNT(*) FROM spotlight_presentation_leases WHERE campaign_id = 20")
        ).scalar_one() == 0
        version = conn.execute(
            text(
                """
                SELECT content_fingerprint, message, image_url, video_url
                FROM spotlight_content_versions
                WHERE id = 40
                """
            )
        ).one()
        assert version.content_fingerprint == FINGERPRINT
        assert version.message == ""
        assert version.image_url is None
        assert version.video_url is None
        assert conn.execute(
            text("SELECT COUNT(*) FROM spotlight_exposure_events WHERE id = 60")
        ).scalar_one() == 1
        assert conn.execute(
            text(
                "SELECT placement_broadcast_id FROM spotlight_exposure_events WHERE id = 60"
            )
        ).scalar_one() is None
        assert conn.execute(
            text("SELECT COUNT(*) FROM marketplace_media_deletion_tasks")
        ).scalar_one() == 0


def test_compaction_leaves_unexpired_campaign_untouched(
    seed_clan_member_membership,
):
    _seed_spotlight_payload(NOW.replace(hour=13))
    with SessionLocal() as db:
        result = retention.compact_expired_spotlight_payloads(db, now=NOW, limit=10)

    assert result == {
        "scanned_campaigns": 0,
        "campaigns_compacted": 0,
        "placement_rows_deleted": 0,
        "presentation_leases_deleted": 0,
        "pacing_rows_deleted": 0,
        "content_versions_scrubbed": 0,
        "exposure_links_detached": 0,
        "attention_links_detached": 0,
        "media_cleanup": [],
        "media_cleanup_queued": 0,
    }
    with engine.begin() as conn:
        broadcast = conn.execute(
            text("SELECT message, image_url, video_url FROM marketplace_broadcasts WHERE id = 30")
        ).one()
        version = conn.execute(
            text("SELECT message, image_url, video_url FROM spotlight_content_versions WHERE id = 40")
        ).one()
    assert tuple(broadcast) == ("Retention payload", IMAGE_URL, VIDEO_URL)
    assert tuple(version) == ("Retention payload", IMAGE_URL, VIDEO_URL)


def test_compaction_is_idempotent(seed_clan_member_membership):
    _seed_spotlight_payload(NOW.replace(hour=11))
    with SessionLocal() as db:
        first = retention.compact_expired_spotlight_payloads(db, now=NOW, limit=10)
    with SessionLocal() as db:
        second = retention.compact_expired_spotlight_payloads(db, now=NOW, limit=10)

    assert first["campaigns_compacted"] == 1
    assert second["scanned_campaigns"] == 0
    assert second["campaigns_compacted"] == 0
    assert second["media_cleanup"] == []
