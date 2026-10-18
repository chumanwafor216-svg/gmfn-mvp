from __future__ import annotations

import json
import shutil
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import text

from app.db.database import engine


@pytest.fixture()
def upload_root(monkeypatch):
    parent = Path(__file__).resolve().parent / ".runtime_marketplace_uploads"
    root = parent / uuid4().hex
    root.mkdir(parents=True)
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(root))
    try:
        yield root
    finally:
        shutil.rmtree(root, ignore_errors=True)
        try:
            parent.rmdir()
        except OSError:
            pass


def _seed_shop_and_product(
    *,
    product_id: int,
    image_url: str,
    video_url: str | None = None,
    shop_owner_user_id: int = 1,
    seller_user_id: int = 1,
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                ) VALUES (
                    40, 1, :shop_owner_user_id, 'Permanent Delete Shop', 'Owner shop', 1, CURRENT_TIMESTAMP
                )
                """
            ),
            {"shop_owner_user_id": shop_owner_user_id},
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, video_url, visibility_mode,
                    is_active, created_at
                ) VALUES (
                    :product_id, 1, 40, :seller_user_id, 'Delete me', 'No longer needed',
                    'Ask', 'GBP', :image_url, :video_url, 'community_visible',
                    1, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "product_id": product_id,
                "image_url": image_url,
                "video_url": video_url,
                "seller_user_id": seller_user_id,
            },
        )


def test_owner_delete_permanently_removes_product_and_unreferenced_local_media(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    upload_root,
):
    image_url = "/uploads/marketplace/images/delete-product.jpg"
    video_url = "/uploads/marketplace/videos/delete-product.mp4"
    image_path = upload_root / "marketplace" / "images" / "delete-product.jpg"
    video_path = upload_root / "marketplace" / "videos" / "delete-product.mp4"
    image_path.parent.mkdir(parents=True, exist_ok=True)
    video_path.parent.mkdir(parents=True, exist_ok=True)
    image_path.write_bytes(b"image")
    video_path.write_bytes(b"video")
    _seed_shop_and_product(product_id=41, image_url=image_url, video_url=video_url)

    response = client.delete("/marketplace/products/41")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["permanent_delete"] is True
    assert body["detail"] == "Product permanently deleted."
    assert {item["status"] for item in body["media_cleanup"]} == {"deleted"}
    assert not image_path.exists()
    assert not video_path.exists()
    with engine.begin() as conn:
        assert conn.execute(
            text("SELECT COUNT(*) FROM marketplace_products WHERE id = 41")
        ).scalar_one() == 0
        event_meta = conn.execute(
            text(
                """
                SELECT meta_json FROM trust_events
                WHERE event_type = 'marketplace.product.removed'
                ORDER BY id DESC LIMIT 1
                """
            )
        ).scalar_one()
    assert json.loads(event_meta)["reason"] == "marketplace_product_deleted_hard"


def test_owner_delete_retains_media_used_by_surviving_diary_evidence(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    upload_root,
):
    image_url = "/uploads/marketplace/images/diary-evidence.jpg"
    image_path = upload_root / "marketplace" / "images" / "diary-evidence.jpg"
    image_path.parent.mkdir(parents=True, exist_ok=True)
    image_path.write_bytes(b"evidence")
    _seed_shop_and_product(product_id=42, image_url=image_url)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO shop_diary_entries (
                    id, clan_id, shop_id, owner_user_id, product_id,
                    activity_type, evidence_class, note, image_url,
                    occurred_at, is_public, is_active, created_at, updated_at
                ) VALUES (
                    50, 1, 40, 1, 42, 'owner_update', 'owner_update',
                    'Historical shop update', :image_url, CURRENT_TIMESTAMP,
                    1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {"image_url": image_url},
        )

    response = client.delete("/marketplace/products/42")

    assert response.status_code == 200, response.text
    assert response.json()["media_cleanup"] == [
        {
            "media_url": image_url,
            "status": "retained_referenced",
            "provider": None,
        }
    ]
    assert image_path.is_file()
    with engine.begin() as conn:
        product_id = conn.execute(
            text("SELECT product_id FROM shop_diary_entries WHERE id = 50")
        ).scalar_one()
    assert product_id is None


def test_owner_delete_never_deletes_external_media_url(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    image_url = "https://images.example.invalid/uploads/marketplace/images/shared.jpg"
    _seed_shop_and_product(product_id=43, image_url=image_url)

    response = client.delete("/marketplace/products/43")

    assert response.status_code == 200, response.text
    assert response.json()["media_cleanup"] == [
        {"media_url": image_url, "status": "unmanaged", "provider": None}
    ]


def test_legacy_archive_alias_refuses_irreversible_deletion(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _seed_shop_and_product(
        product_id=45,
        image_url="/uploads/marketplace/images/archive-must-not-delete.jpg",
    )

    response = client.post("/marketplace/products/45/archive")

    assert response.status_code == 409, response.text
    assert "permanent delete action" in response.json()["detail"]
    with engine.begin() as conn:
        assert conn.execute(
            text("SELECT COUNT(*) FROM marketplace_products WHERE id = 45")
        ).scalar_one() == 1


def test_former_seller_cannot_permanently_delete_current_owners_product(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role)
                VALUES (2, 'current-shop-owner@example.com', 'hashed', 'user')
                """
            )
        )
    _seed_shop_and_product(
        product_id=46,
        image_url="/uploads/marketplace/images/not-former-sellers.jpg",
        shop_owner_user_id=2,
        seller_user_id=1,
    )

    response = client.delete("/marketplace/products/46")

    assert response.status_code == 403, response.text
    with engine.begin() as conn:
        assert conn.execute(
            text("SELECT COUNT(*) FROM marketplace_products WHERE id = 46")
        ).scalar_one() == 1


def test_owner_delete_retires_vault_payload_and_revokes_access(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    upload_root,
):
    image_url = "/uploads/marketplace/images/vault-delete.jpg"
    image_path = upload_root / "marketplace" / "images" / "vault-delete.jpg"
    image_path.parent.mkdir(parents=True, exist_ok=True)
    image_path.write_bytes(b"vault image")
    _seed_shop_and_product(product_id=44, image_url=image_url)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE marketplace_products
                SET visibility_mode = 'vault_private'
                WHERE id = 44
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO vault_blocks (
                    id, shop_id, slot_number, state, product_id,
                    activated_at, created_at, updated_at
                ) VALUES (
                    60, 40, 1, 'active', 44,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO vault_private_offers (
                    id, block_id, shop_id, product_id, media_type, media_url,
                    thumbnail_url, caption, owner_note, status, created_at, updated_at
                ) VALUES (
                    61, 60, 40, 44, 'image', :image_url,
                    :image_url, 'Private caption', 'Private owner note', 'published',
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {"image_url": image_url},
        )
        conn.execute(
            text(
                """
                INSERT INTO vault_access_links (
                    id, shop_id, product_id, block_id, owner_user_id, token,
                    status, views_used, allow_download, allow_print, allow_reshare,
                    watermark_enabled, created_at
                ) VALUES (
                    62, 40, 44, 60, 1, 'vault-delete-token',
                    'active', 0, 0, 0, 0, 1, CURRENT_TIMESTAMP
                )
                """
            )
        )

    response = client.delete("/marketplace/products/44")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["permanent_delete"] is True
    assert body["retired_vault_payload"] == {
        "vault_private_offers_archived": 1,
        "vault_access_links_revoked": 1,
    }
    assert body["media_cleanup"] == [
        {"media_url": image_url, "status": "deleted", "provider": "local"}
    ]
    assert not image_path.exists()

    with engine.begin() as conn:
        assert conn.execute(
            text("SELECT product_id FROM vault_blocks WHERE id = 60")
        ).scalar_one() is None
        offer = conn.execute(
            text(
                """
                SELECT product_id, media_url, thumbnail_url, caption, owner_note, status
                FROM vault_private_offers WHERE id = 61
                """
            )
        ).one()
        access_link = conn.execute(
            text(
                """
                SELECT product_id, status, revoked_at
                FROM vault_access_links WHERE id = 62
                """
            )
        ).one()

    assert offer.product_id is None
    assert offer.media_url is None
    assert offer.thumbnail_url is None
    assert offer.caption is None
    assert offer.owner_note is None
    assert offer.status == "archived"
    assert access_link.product_id is None
    assert access_link.status == "revoked"
    assert access_link.revoked_at is not None


def test_owner_delete_stops_and_compacts_linked_live_spotlight(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    upload_root,
):
    image_url = "/uploads/marketplace/images/live-product-spotlight.jpg"
    image_path = upload_root / "marketplace" / "images" / "live-product-spotlight.jpg"
    image_path.parent.mkdir(parents=True, exist_ok=True)
    image_path.write_bytes(b"live spotlight")
    _seed_shop_and_product(product_id=47, image_url=image_url)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role)
                VALUES (2, 'spotlight-viewer@example.com', 'hashed', 'user')
                """
            )
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
                    70, 'serving', 1, 1, 40, 1, 47, 'product_snapshot',
                    'deleted-product-fingerprint', 'active', 'product',
                    'free', 'direct_communities', CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP, '2026-10-19 12:00:00',
                    '2026-10-19 12:00:00', CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_broadcasts (
                    id, publication_key, serving_status, content_version,
                    spotlight_campaign_id, clan_id, author_user_id, shop_id,
                    message, image_url, priority_mode, visibility_scope,
                    expires_at, authorized_expires_at,
                    serving_status_changed_at, created_at
                ) VALUES (
                    71, 'deleted-product-placement', 'serving', 1, 70, 1, 1, 40,
                    'Still live product advert', :image_url, 'free',
                    'direct_communities', '2026-10-19 12:00:00',
                    '2026-10-19 12:00:00', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {"image_url": image_url},
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_content_versions (
                    id, campaign_id, version, content_kind, content_fingerprint,
                    source_product_id, message, image_url, change_kind, activated_at
                ) VALUES (
                    72, 70, 1, 'product_snapshot', 'deleted-product-fingerprint',
                    47, 'Still live product advert', :image_url, 'activation',
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {"image_url": image_url},
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_campaign_pacing_states (
                    id, campaign_id, max_delivery_rounds, consumed_delivery_rounds,
                    pacing_profile, exhausted, version, created_at, updated_at
                ) VALUES (
                    73, 70, 10, 1, 'neutral', 0, 1,
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_presentation_leases (
                    id, presentation_id, issuance_key, viewer_user_id,
                    campaign_id, placement_broadcast_id, content_version,
                    surface, status, issued_at, lease_expires_at
                ) VALUES (
                    74, 'deleted-product-presentation', 'deleted-product-issuance',
                    2, 70, 71, 1, 'public_shop', 'issued',
                    CURRENT_TIMESTAMP, '2026-10-19 12:00:00'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO spotlight_exposure_events (
                    id, content_version, presentation_id, event_type,
                    viewer_user_id, campaign_id, event_at, allocation_route_type,
                    allocation_source_kind, allocation_source_id,
                    allocation_route_clan_id, placement_broadcast_id,
                    idempotency_key, presentation_surface, created_at
                ) VALUES (
                    75, 1, 'deleted-product-presentation', 'served', 2, 70,
                    CURRENT_TIMESTAMP, 'direct_community', 'clan', 1, 1, 71,
                    'deleted-product-exposure', 'public_shop', CURRENT_TIMESTAMP
                )
                """
            )
        )

    response = client.delete("/marketplace/products/47")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["retired_spotlight_payload"]["campaigns_compacted"] == 1
    assert body["retired_spotlight_payload"]["presentation_leases_deleted"] == 1
    assert not image_path.exists()
    with engine.begin() as conn:
        campaign = conn.execute(
            text(
                """
                SELECT status, serving_status, source_product_id, payload_compacted_at
                FROM spotlight_campaigns WHERE id = 70
                """
            )
        ).one()
        version = conn.execute(
            text(
                """
                SELECT message, image_url, source_product_id
                FROM spotlight_content_versions WHERE id = 72
                """
            )
        ).one()
        exposure = conn.execute(
            text(
                """
                SELECT placement_broadcast_id
                FROM spotlight_exposure_events WHERE id = 75
                """
            )
        ).one()
        assert conn.execute(
            text("SELECT COUNT(*) FROM marketplace_broadcasts WHERE id = 71")
        ).scalar_one() == 0
    assert campaign.status == "ended"
    assert campaign.serving_status == "withdrawn"
    assert campaign.source_product_id is None
    assert campaign.payload_compacted_at is not None
    assert tuple(version) == ("", None, None)
    assert exposure.placement_broadcast_id is None
