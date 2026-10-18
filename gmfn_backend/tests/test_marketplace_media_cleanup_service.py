from __future__ import annotations

import shutil
from pathlib import Path
from uuid import uuid4

import pytest
from sqlalchemy import text

import app.services.marketplace_media_cleanup_service as cleanup
from app.db.database import SessionLocal, engine


@pytest.fixture()
def upload_root(monkeypatch):
    parent = Path(__file__).resolve().parent / ".runtime_media_cleanup"
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


def test_canonical_reference_check_blocks_query_variant_deletion(
    seed_clan_member_membership,
    upload_root,
):
    canonical_url = "/uploads/marketplace/images/shared-canonical.jpg"
    variant_url = f"{canonical_url}?cache=attacker"
    media_path = upload_root / "marketplace" / "images" / "shared-canonical.jpg"
    media_path.parent.mkdir(parents=True, exist_ok=True)
    media_path.write_bytes(b"shared")
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, is_active, created_at
                ) VALUES (
                    90, 1, 1, 'Canonical Shop', 1, CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, price,
                    currency, image_url, visibility_mode, is_active, created_at
                ) VALUES (
                    91, 1, 90, 1, 'Shared product', 'Ask', 'GBP',
                    :image_url, 'community_visible', 1, CURRENT_TIMESTAMP
                )
                """
            ),
            {"image_url": canonical_url},
        )

    canonical = cleanup.canonical_marketplace_media_target(canonical_url)
    variant = cleanup.canonical_marketplace_media_target(variant_url)
    assert canonical is not None
    assert variant is not None
    assert canonical["canonical_key"] == variant["canonical_key"]
    with SessionLocal() as db:
        result = cleanup.delete_unreferenced_marketplace_media(
            db,
            media_url=variant_url,
        )

    assert result == {"status": "retained_referenced", "provider": None}
    assert media_path.is_file()


@pytest.mark.parametrize(
    "media_url",
    [
        "/uploads/marketplace/../profile.jpg",
        "/uploads/marketplace/%2e%2e/profile.jpg",
        "/uploads/marketplace/images/%2e%2e/%2e%2e/profile.jpg",
    ],
)
def test_marketplace_cleanup_rejects_path_traversal(upload_root, media_url):
    profile_path = upload_root / "profile.jpg"
    profile_path.write_bytes(b"profile")

    assert cleanup.canonical_marketplace_media_target(media_url) is None
    with SessionLocal() as db:
        result = cleanup.delete_unreferenced_marketplace_media(
            db,
            media_url=media_url,
        )

    assert result == {"status": "unmanaged", "provider": None}
    assert profile_path.is_file()


def test_failed_media_delete_stays_queued_and_retries(
    monkeypatch,
    upload_root,
):
    media_url = "/uploads/marketplace/images/retry.jpg"
    with SessionLocal() as db:
        queued = cleanup.queue_marketplace_media_deletions(
            db,
            media_urls=[media_url],
            source="retry_test",
        )
        db.commit()
        task_ids = queued["task_ids"]

    monkeypatch.setattr(
        cleanup,
        "delete_unreferenced_marketplace_media",
        lambda db, *, media_url: {
            "status": "delete_failed",
            "provider": "local",
        },
    )
    with SessionLocal() as db:
        first = cleanup.process_marketplace_media_deletion_tasks(
            db,
            task_ids=task_ids,
        )
    assert first == [
        {"media_url": media_url, "status": "delete_failed", "provider": "local"}
    ]
    with engine.begin() as conn:
        task = conn.execute(
            text(
                """
                SELECT attempts, last_error
                FROM marketplace_media_deletion_tasks
                """
            )
        ).one()
    assert task.attempts == 1
    assert task.last_error == "managed_object_delete_failed"

    monkeypatch.setattr(
        cleanup,
        "delete_unreferenced_marketplace_media",
        lambda db, *, media_url: {"status": "deleted", "provider": "local"},
    )
    with SessionLocal() as db:
        second = cleanup.process_marketplace_media_deletion_tasks(db, limit=10)
    assert second == [
        {"media_url": media_url, "status": "deleted", "provider": "local"}
    ]
    with engine.begin() as conn:
        assert conn.execute(
            text("SELECT COUNT(*) FROM marketplace_media_deletion_tasks")
        ).scalar_one() == 0
