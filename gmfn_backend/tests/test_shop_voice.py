from __future__ import annotations

import io
import json
import wave
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import text

from app.core.auth import get_current_user
from app.db.database import SessionLocal, engine
from app.db.models import ShopVoiceAttachment
from app.main import app
from app.services.marketplace_media_cleanup_service import (
    process_marketplace_media_deletion_tasks,
)


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _wav_bytes(seconds: float = 0.25, sample_rate: int = 8000) -> bytes:
    frame_count = max(1, int(seconds * sample_rate))
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        audio.writeframes(bytes([0, 0]) * frame_count)
    return output.getvalue()


def _seed_shop_voice_context() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users
                    (id, email, hashed_password, display_name, role, gmfn_id)
                VALUES
                    (1, 'shop-owner@example.com', 'hashed', 'Shop Owner', 'user', 'GSN-U-SHOP-OWNER'),
                    (2, 'platform-admin@example.com', 'hashed', 'Platform Admin', 'admin', 'GSN-U-PLATFORM-ADMIN')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans
                    (id, name, marketplace_name, community_code, status, invite_code, invite_uses, created_at)
                VALUES
                    (1, 'Shop Voice Community', 'Shop Voice Market', 'GMFN-C-VOICE', 'active', 'shop-voice-invite', 0, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships
                    (clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 'admin', 0),
                    (1, 2, 'admin', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops
                    (id, clan_id, owner_user_id, shop_name, description, is_active, created_at)
                VALUES
                    (101, 1, 1, 'Shop Voice Test', 'Voice-enabled test shop', 1, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products
                    (
                        id, clan_id, shop_id, seller_user_id, title, description,
                        price, currency, visibility_mode, is_active, created_at
                    )
                VALUES
                    (
                        201, 1, 101, 1, 'Catering service', 'Fresh catering',
                        'Ask', 'GBP', 'community_visible', 1, CURRENT_TIMESTAMP
                    )
                """
            )
        )


@pytest.fixture()
def acting_shop_user():
    selected = {
        "user": Obj(
            id=1,
            email="shop-owner@example.com",
            display_name="Shop Owner",
            role="user",
            gmfn_id="GSN-U-SHOP-OWNER",
        )
    }

    def current_user():
        return selected["user"]

    app.dependency_overrides[get_current_user] = current_user

    def select(user_id: int) -> None:
        users = {
            1: Obj(
                id=1,
                email="shop-owner@example.com",
                display_name="Shop Owner",
                role="user",
                gmfn_id="GSN-U-SHOP-OWNER",
            ),
            2: Obj(
                id=2,
                email="platform-admin@example.com",
                display_name="Platform Admin",
                role="admin",
                gmfn_id="GSN-U-PLATFORM-ADMIN",
            ),
        }
        selected["user"] = users[user_id]

    yield select
    app.dependency_overrides.pop(get_current_user, None)


def _upload(client, path: str, *, seconds: float = 0.25):
    return client.post(
        path,
        files={"audio": ("shop-voice.wav", _wav_bytes(seconds), "audio/wav")},
    )


def test_welcome_and_product_voice_follow_owner_and_parent_visibility(
    client,
    acting_shop_user,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _seed_shop_voice_context()

    welcome = _upload(client, "/shop-voice/shops/101/welcome")
    assert welcome.status_code == 200, welcome.text
    welcome_body = welcome.json()
    welcome_id = welcome_body["voice_attachment_id"]
    assert welcome_body["voice_speaker_name"] == "Shop Owner"
    assert welcome_body["voice_speaker_gmfn_id"] == "GSN-U-SHOP-OWNER"

    with SessionLocal() as db:
        welcome_attachment = db.get(ShopVoiceAttachment, welcome_id)
        assert welcome_attachment is not None
        first_storage_key = welcome_attachment.storage_key

    assert client.get(f"/uploads/.private-shop-voice/{first_storage_key}").status_code == 404
    public_welcome = client.get(f"/shop-voice/public/{welcome_id}")
    assert public_welcome.status_code == 200
    assert public_welcome.content[:4] == b"RIFF"

    shop_payload = client.get("/marketplace/public/shop/GSN-U-SHOP-OWNER")
    assert shop_payload.status_code == 200, shop_payload.text
    assert shop_payload.json()["item"]["voice_attachment_id"] == welcome_id
    assert shop_payload.json()["item"]["voice_speaker_gmfn_id"] == "GSN-U-SHOP-OWNER"

    replacement = _upload(client, "/shop-voice/shops/101/welcome", seconds=0.5)
    assert replacement.status_code == 200, replacement.text
    assert replacement.json()["voice_attachment_id"] == welcome_id
    with SessionLocal() as db:
        rows = (
            db.query(ShopVoiceAttachment)
            .filter(ShopVoiceAttachment.parent_kind == "shop_welcome")
            .all()
        )
        assert len(rows) == 1
        replacement_storage_key = rows[0].storage_key
        cleanup_result = process_marketplace_media_deletion_tasks(db, limit=10)
        assert cleanup_result == [
            {
                "media_url": f"/uploads/.private-shop-voice/{first_storage_key}",
                "status": "deleted",
                "provider": "local",
            }
        ]
    assert not (tmp_path / ".private-shop-voice" / first_storage_key).exists()
    assert (tmp_path / ".private-shop-voice" / replacement_storage_key).is_file()

    product = _upload(client, "/shop-voice/products/201")
    assert product.status_code == 200, product.text
    product_id = product.json()["voice_attachment_id"]
    assert client.get(f"/shop-voice/public/{product_id}").status_code == 200

    shop_payload = client.get("/marketplace/public/shop/GSN-U-SHOP-OWNER")
    public_product = shop_payload.json()["products"][0]
    assert public_product["voice_attachment_id"] == product_id
    assert public_product["voice_speaker_gmfn_id"] == "GSN-U-SHOP-OWNER"

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE marketplace_products SET is_active = 0 WHERE id = 201")
        )
    assert client.get(f"/shop-voice/public/{product_id}").status_code == 404
    assert client.get(f"/shop-voice/protected/{product_id}").status_code == 200

    acting_shop_user(2)
    assert _upload(client, "/shop-voice/products/201").status_code == 403
    assert client.get(f"/shop-voice/protected/{product_id}").status_code == 403


def test_voice_first_shop_update_expires_publicly_but_remains_in_owner_history(
    client,
    acting_shop_user,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _seed_shop_voice_context()
    payload = {
        "clan_id": 1,
        "shop_id": 101,
        "activity_type": "other_update",
        "note": "",
        "is_public": True,
    }

    created = client.post(
        "/shop-voice/updates",
        data={"payload_json": json.dumps(payload)},
        files={"audio": ("shop-update.wav", _wav_bytes(), "audio/wav")},
    )
    assert created.status_code == 200, created.text
    body = created.json()
    entry_id = body["id"]
    attachment_id = body["voice_attachment_id"]
    assert body["note"] == "Voice update"
    assert body["voice_speaker_gmfn_id"] == "GSN-U-SHOP-OWNER"
    assert client.get(f"/shop-voice/public/{attachment_id}").status_code == 200

    public_entries = client.get("/shop-diaries/public/GSN-U-SHOP-OWNER")
    assert public_entries.status_code == 200, public_entries.text
    assert public_entries.json()["items"][0]["voice_attachment_id"] == attachment_id

    empty_text_only = client.post(
        "/shop-diaries",
        json={
            "clan_id": 1,
            "shop_id": 101,
            "activity_type": "other_update",
            "note": "",
            "is_public": True,
        },
    )
    assert empty_text_only.status_code == 400

    expired_at = datetime.now(timezone.utc) - timedelta(hours=25)
    with engine.begin() as conn:
        conn.execute(
            text(
                "UPDATE shop_diary_entries SET occurred_at = :expired_at WHERE id = :entry_id"
            ),
            {"expired_at": expired_at, "entry_id": entry_id},
        )

    assert client.get("/shop-diaries/public/GSN-U-SHOP-OWNER").json()["items"] == []
    assert client.get(f"/shop-voice/public/{attachment_id}").status_code == 404
    assert client.get(f"/shop-voice/protected/{attachment_id}").status_code == 200
    owner_entries = client.get("/shop-diaries/me", params={"shop_id": 101})
    assert owner_entries.status_code == 200, owner_entries.text
    assert owner_entries.json()["items"][0]["voice_attachment_id"] == attachment_id


def test_sender_delete_revokes_shop_voice_and_preserves_tombstone(
    client,
    acting_shop_user,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _seed_shop_voice_context()
    created = _upload(client, "/shop-voice/shops/101/welcome")
    assert created.status_code == 200, created.text
    attachment_id = created.json()["voice_attachment_id"]

    with SessionLocal() as db:
        attachment = db.get(ShopVoiceAttachment, attachment_id)
        assert attachment is not None
        storage_key = attachment.storage_key

    assert client.post(
        f"/shop-voice/{attachment_id}/delete",
        json={"confirmation": "delete"},
    ).status_code == 422

    acting_shop_user(2)
    assert client.post(
        f"/shop-voice/{attachment_id}/delete",
        json={"confirmation": "DELETE VOICE NOTE"},
    ).status_code == 403

    acting_shop_user(1)
    deleted = client.post(
        f"/shop-voice/{attachment_id}/delete",
        json={"confirmation": "DELETE VOICE NOTE"},
    )
    assert deleted.status_code == 200, deleted.text
    assert deleted.json()["status"] == "deleted"
    assert client.get(f"/shop-voice/public/{attachment_id}").status_code == 404
    assert client.get(f"/shop-voice/protected/{attachment_id}").status_code == 404

    shop_payload = client.get("/marketplace/public/shop/GSN-U-SHOP-OWNER")
    assert shop_payload.status_code == 200, shop_payload.text
    assert shop_payload.json()["item"]["voice_attachment_id"] is None
    assert shop_payload.json()["item"]["voice_deleted_at"]

    with SessionLocal() as db:
        attachment = db.get(ShopVoiceAttachment, attachment_id)
        assert attachment is not None
        assert attachment.deleted_at is not None
        assert attachment.created_by_user_id == 1
        assert attachment.original_filename is None
        cleanup_result = process_marketplace_media_deletion_tasks(db, limit=10)
        assert cleanup_result == [
            {
                "media_url": f"/uploads/.private-shop-voice/{storage_key}",
                "status": "deleted",
                "provider": "local",
            }
        ]
    assert not (tmp_path / ".private-shop-voice" / storage_key).exists()
