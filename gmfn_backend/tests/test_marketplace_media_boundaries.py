from __future__ import annotations

import os
import shutil
from pathlib import Path

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.services.pipeline_credit_service import allocate_pipeline_credits


def _upload_root() -> Path:
    root = Path("test_uploads") / f"marketplace_media_boundaries_{os.getpid()}"
    shutil.rmtree(root, ignore_errors=True)
    return root


def test_marketplace_upload_url_rejects_malformed_text_controls(
    client,
    monkeypatch,
):
    upload_root = _upload_root()
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(upload_root))

    base_payload = {
        "filename": "cover.jpg",
        "content_type": "image/jpeg",
        "media_type": "image",
    }

    for field_name in base_payload:
        payload = dict(base_payload)
        payload[field_name] = False

        response = client.post("/marketplace/media/upload-url", json=payload)

        assert response.status_code == 422, response.text
        assert f"{field_name} must be text" in response.text
        assert not (upload_root / "marketplace").exists()

        payload[field_name] = 1.5

        response = client.post("/marketplace/media/upload-url", json=payload)

        assert response.status_code == 422, response.text
        assert f"{field_name} must be text" in response.text
        assert not (upload_root / "marketplace").exists()

    shutil.rmtree(upload_root, ignore_errors=True)


def test_marketplace_upload_url_valid_image_still_returns_direct_upload_contract(
    client,
    monkeypatch,
):
    upload_root = _upload_root()
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(upload_root))

    response = client.post(
        "/marketplace/media/upload-url",
        json={
            "filename": "cover.jpg",
            "content_type": "image/jpeg",
            "media_type": "image",
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["ok"] is True
    assert body["media_type"] == "image"
    assert body["object_key"].startswith("marketplace/images/")
    assert body["upload_url"].startswith("http://testserver/marketplace/media/upload-direct/images/")
    assert body["public_url"].startswith("/uploads/marketplace/images/")
    assert body["max_bytes"] > 0
    assert (upload_root / "marketplace" / "images").is_dir()
    assert (upload_root / "marketplace" / "videos").is_dir()

    shutil.rmtree(upload_root, ignore_errors=True)


class FakeR2Client:
    def __init__(self) -> None:
        self.calls = []

    def generate_presigned_url(self, *, ClientMethod, Params, ExpiresIn):
        self.calls.append(
            {
                "ClientMethod": ClientMethod,
                "Params": Params,
                "ExpiresIn": ExpiresIn,
            }
        )
        return f"https://r2.example/{Params['Bucket']}/{Params['Key']}?signed=1"


def _configure_r2(monkeypatch) -> None:
    monkeypatch.setenv("R2_ACCOUNT_ID", "acct123")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "access-key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "secret-key")
    monkeypatch.setenv("R2_BUCKET_NAME", "gsn-marketplace-media")


def test_marketplace_r2_upload_url_debits_pipeline_credit_without_local_route_migration(
    client,
    monkeypatch,
    override_current_user,
):
    upload_root = _upload_root()
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(upload_root))
    _configure_r2(monkeypatch)
    fake_client = FakeR2Client()
    monkeypatch.setattr("app.services.storage_service.boto3.client", lambda *args, **kwargs: fake_client)

    with SessionLocal() as db:
        entry = allocate_pipeline_credits(
            db,
            owner_type="platform",
            amount="2.00",
            idempotency_key="alloc-marketplace-r2-presign-test",
            note="Marketplace R2 presign test account",
        )
        account_id = int(entry.account_id)

    monkeypatch.setenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_STORAGE_CLOUDFLARE_R2_PRESIGNED_UPLOAD", str(account_id))
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_COST_STORAGE_CLOUDFLARE_R2_PRESIGNED_UPLOAD", "0.20")

    response = client.post(
        "/marketplace/media/r2-upload-url",
        json={
            "filename": "cover.jpg",
            "content_type": "image/jpeg",
            "media_type": "image",
            "clan_id": 1,
            "expires": 900,
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["ok"] is True
    assert body["storage_provider"] == "cloudflare_r2"
    assert body["media_type"] == "image"
    assert body["object_key"].startswith("marketplace/images/")
    assert body["upload_url"].startswith("https://r2.example/gsn-marketplace-media/marketplace/images/")
    assert body["public_url"].startswith("https://acct123.r2.cloudflarestorage.com/gsn-marketplace-media/marketplace/images/")
    assert body["pipeline_credit_gate"]["ok"] is True
    assert body["pipeline_credit_gate"]["ledger_entry"]["credit_amount"] == "-0.20"
    assert "does not migrate existing local upload routes" in body["boundary"]
    assert not (upload_root / "marketplace").exists()
    assert fake_client.calls and fake_client.calls[0]["ExpiresIn"] == 900

    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT workflow_key, provider_key, reference_type, clan_id, user_id
                FROM pipeline_credit_ledger_entries
                WHERE reference_type = 'marketplace_media_r2_upload'
                ORDER BY id DESC
                LIMIT 1
                """
            )
        ).fetchone()

    assert row is not None
    assert row[0] == "storage.cloudflare_r2.presigned_upload"
    assert row[1] == "storage.cloudflare_r2"
    assert row[2] == "marketplace_media_r2_upload"
    assert row[3] == 1
    assert row[4] == 1

    shutil.rmtree(upload_root, ignore_errors=True)


def test_marketplace_r2_upload_url_rejects_non_admin_before_paid_provider_access(
    client,
    monkeypatch,
    override_current_user_user,
):
    _configure_r2(monkeypatch)
    fake_client = FakeR2Client()
    monkeypatch.setattr("app.services.storage_service.boto3.client", lambda *args, **kwargs: fake_client)

    response = client.post(
        "/marketplace/media/r2-upload-url",
        json={
            "filename": "cover.jpg",
            "content_type": "image/jpeg",
            "media_type": "image",
        },
    )

    assert response.status_code == 403, response.text
    assert "community id and community admin access" in response.text
    assert fake_client.calls == []

def _seed_community_membership(*, clan_id: int, user_id: int = 1, role: str = "admin") -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, display_name, role, gmfn_id)
                VALUES (:user_id, :email, 'hashed', 'Media Owner', 'user', :gmfn_id)
                """
            ),
            {"user_id": user_id, "email": f"media-owner-{clan_id}-{user_id}@example.com", "gmfn_id": f"GMFN-U-MEDIA{clan_id}{user_id}"},
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clans (id, name, status, invite_uses, created_at)
                VALUES (:clan_id, :name, 'active', 0, CURRENT_TIMESTAMP)
                """
            ),
            {"clan_id": clan_id, "name": f"R2 Media Community {clan_id}"},
        )
        conn.execute(
            text(
                """
                INSERT OR REPLACE INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance, created_at, left_at)
                VALUES (:membership_id, :clan_id, :user_id, :role, 0, CURRENT_TIMESTAMP, NULL)
                """
            ),
            {
                "membership_id": 910000 + clan_id + user_id,
                "clan_id": clan_id,
                "user_id": user_id,
                "role": role,
            },
        )


def test_marketplace_r2_upload_url_allows_community_admin_with_community_pipeline_credits(
    client,
    monkeypatch,
    override_current_user_user,
):
    clan_id = 77
    _seed_community_membership(clan_id=clan_id, role="admin")
    _configure_r2(monkeypatch)
    fake_client = FakeR2Client()
    monkeypatch.setattr("app.services.storage_service.boto3.client", lambda *args, **kwargs: fake_client)

    with SessionLocal() as db:
        entry = allocate_pipeline_credits(
            db,
            owner_type="community",
            clan_id=clan_id,
            amount="1.00",
            idempotency_key="alloc-marketplace-r2-community-presign-test",
            note="Marketplace R2 community presign test account",
        )
        account_id = int(entry.account_id)

    monkeypatch.delenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_STORAGE_CLOUDFLARE_R2_PRESIGNED_UPLOAD", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_STORAGE_CLOUDFLARE_R2", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_DEFAULT_ACCOUNT_ID", raising=False)
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_COST_STORAGE_CLOUDFLARE_R2_PRESIGNED_UPLOAD", "0.20")

    response = client.post(
        "/marketplace/media/r2-upload-url",
        json={
            "filename": "community-cover.jpg",
            "content_type": "image/jpeg",
            "media_type": "image",
            "clan_id": clan_id,
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["ok"] is True
    assert body["spend_account_scope"] == "community"
    assert body["pipeline_credit_gate"]["ledger_entry"]["account_id"] == account_id
    assert body["pipeline_credit_gate"]["ledger_entry"]["credit_amount"] == "-0.20"
    assert fake_client.calls

    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT account_id, clan_id, user_id, balance_after
                FROM pipeline_credit_ledger_entries
                WHERE reference_type = 'marketplace_media_r2_upload'
                  AND clan_id = :clan_id
                ORDER BY id DESC
                LIMIT 1
                """
            ),
            {"clan_id": clan_id},
        ).fetchone()

    assert row is not None
    assert row[0] == account_id
    assert row[1] == clan_id
    assert row[2] == 1
    assert float(row[3]) == 0.8


def test_marketplace_r2_upload_url_rejects_ordinary_community_member_before_provider_access(
    client,
    monkeypatch,
    override_current_user_user,
):
    clan_id = 78
    _seed_community_membership(clan_id=clan_id, role="user")
    _configure_r2(monkeypatch)
    fake_client = FakeR2Client()
    monkeypatch.setattr("app.services.storage_service.boto3.client", lambda *args, **kwargs: fake_client)

    response = client.post(
        "/marketplace/media/r2-upload-url",
        json={
            "filename": "member-cover.jpg",
            "content_type": "image/jpeg",
            "media_type": "image",
            "clan_id": clan_id,
        },
    )

    assert response.status_code == 403, response.text
    assert "Community admin access required" in response.text
    assert fake_client.calls == []