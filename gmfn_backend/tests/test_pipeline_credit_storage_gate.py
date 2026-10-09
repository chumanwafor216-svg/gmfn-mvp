from __future__ import annotations

from decimal import Decimal

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.services.pipeline_credit_service import allocate_pipeline_credits
from app.services.storage_service import StorageServiceError, create_presigned_upload, generate_object_key


class FakeS3Client:
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
    monkeypatch.setenv("R2_BUCKET_NAME", "gsn-test-bucket")


def test_r2_presigned_upload_requires_database_credit_gate(monkeypatch):
    _configure_r2(monkeypatch)
    fake_client = FakeS3Client()
    monkeypatch.setattr("app.services.storage_service.boto3.client", lambda *args, **kwargs: fake_client)

    try:
        create_presigned_upload(
            object_key="marketplace/images/demo.png",
            content_type="image/png",
        )
        assert False, "expected StorageServiceError"
    except StorageServiceError as exc:
        assert "pipeline credits" in str(exc).lower()

    assert fake_client.calls == []
    with engine.begin() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM pipeline_credit_ledger_entries")).scalar() == 0


def test_r2_presigned_upload_debits_pipeline_credit_before_returning_url(monkeypatch):
    _configure_r2(monkeypatch)
    fake_client = FakeS3Client()
    monkeypatch.setattr("app.services.storage_service.boto3.client", lambda *args, **kwargs: fake_client)

    with SessionLocal() as db:
        entry = allocate_pipeline_credits(
            db,
            owner_type="platform",
            amount="3.00",
            idempotency_key="alloc-r2-presign-test",
            note="Test R2 presign provider account",
        )
        account_id = int(entry.account_id)

    monkeypatch.setenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_STORAGE_CLOUDFLARE_R2_PRESIGNED_UPLOAD", str(account_id))
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_COST_STORAGE_CLOUDFLARE_R2_PRESIGNED_UPLOAD", "0.20")

    with SessionLocal() as db:
        result = create_presigned_upload(
            db=db,
            object_key="marketplace/images/demo.png",
            content_type="image/png",
            expires=900,
            reference_type="shop_media_upload",
            reference_id="shop-1-demo",
            clan_id=1,
            user_id=2,
        )

    assert result["upload_url"] == "https://r2.example/gsn-test-bucket/marketplace/images/demo.png?signed=1"
    assert result["object_key"] == "marketplace/images/demo.png"
    assert result["public_url"] == "https://acct123.r2.cloudflarestorage.com/gsn-test-bucket/marketplace/images/demo.png"
    assert result["pipeline_credit_gate"]["ok"] is True
    assert result["pipeline_credit_gate"]["ledger_entry"]["credit_amount"] == "-0.20"
    assert fake_client.calls == [
        {
            "ClientMethod": "put_object",
            "Params": {
                "Bucket": "gsn-test-bucket",
                "Key": "marketplace/images/demo.png",
                "ContentType": "image/png",
            },
            "ExpiresIn": 900,
        }
    ]

    with engine.begin() as conn:
        row = conn.execute(
            text(
                """
                SELECT credit_amount, balance_after, workflow_key, provider_key, clan_id, user_id
                FROM pipeline_credit_ledger_entries
                WHERE entry_type = 'debit'
                """
            )
        ).fetchone()

    assert row is not None
    assert Decimal(str(row[0])) == Decimal("-0.20")
    assert Decimal(str(row[1])) == Decimal("2.80")
    assert row[2] == "storage.cloudflare_r2.presigned_upload"
    assert row[3] == "storage.cloudflare_r2"
    assert row[4] == 1
    assert row[5] == 2


def test_generate_object_key_defaults_extension_and_prefix():
    key = generate_object_key("/evidence//", "receipt")
    assert key.startswith("evidence/")
    assert key.endswith(".bin")
