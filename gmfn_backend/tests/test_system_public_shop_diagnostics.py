from __future__ import annotations

from sqlalchemy import text

from app.db.database import engine
from app.db.models import MarketplaceProduct, MarketplaceShop


def _ensure_marketplace_tables() -> None:
    MarketplaceShop.__table__.create(bind=engine, checkfirst=True)
    MarketplaceProduct.__table__.create(bind=engine, checkfirst=True)


def test_public_shop_identity_diagnostics_finds_alias_ready_shop(
    client,
    override_current_user,
):
    _ensure_marketplace_tables()

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                ) VALUES (
                    1, 'seller@example.com', 'hashed', 'Seller Owner', 'admin', 'GMFN-U-DIAGSHOP'
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Golden boys', 'Golden boys Marketplace', 'DIAGSHOP1')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'DIAGNOSTIC SHOP', 'Public diagnostic shop', 1
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    visibility_mode, is_active
                ) VALUES (
                    1, 1, 1, 1, 'Diagnostic Rice', 'Visible product',
                    'community_visible', 1
                )
                """
            )
        )

    res = client.get("/system/public-shop-identity/GSN-U-DIAGSHOP")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["user_found"] is True
    assert body["matched_identity"] == "GMFN-U-DIAGSHOP"
    assert body["active_shop_count"] == 1
    assert body["public_product_count"] == 1
    assert body["public_shop_status"] == "ready"
    assert body["public_shop_ready"] is True


def test_public_shop_identity_diagnostics_reports_missing_identity(
    client,
    override_current_user,
):
    _ensure_marketplace_tables()

    res = client.get("/system/public-shop-identity/GMFN-U-NOTFOUND")
    assert res.status_code == 200, res.text
    body = res.json()

    assert body["user_found"] is False
    assert body["reason"] == "seller_identity_not_found"
    assert body["public_shop_status"] == "identity_missing"
    assert body["candidates_checked"] == ["GMFN-U-NOTFOUND", "GSN-U-NOTFOUND"]


def test_public_shop_identity_diagnostics_requires_admin(
    client,
    override_current_user_user,
):
    res = client.get("/system/public-shop-identity/GMFN-U-DIAGSHOP")
    assert res.status_code == 403


def test_finance_readiness_diagnostics_reports_schema_probes(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    res = client.get("/system/diagnostics/finance-readiness")
    assert res.status_code == 200, res.text

    body = res.json()
    assert body["ok"] is True
    assert body["diagnostic_version"] == "finance-readiness-2026-07-12"
    assert body["user_id"] == 1
    assert "DATABASE_URL" not in res.text
    assert "GMFN_SECRET_KEY" not in res.text
    assert "loans" in body["tables"]
    assert "loan_guarantors" in body["tables"]
    assert body["probes"]["active_memberships"]["ok"] is True
    assert body["alembic_version"]["ok"] is True


def test_finance_readiness_diagnostics_requires_admin(
    client,
    override_current_user_user,
):
    res = client.get("/system/diagnostics/finance-readiness")
    assert res.status_code == 403


def test_api_readiness_diagnostics_reports_provider_boundaries_without_secrets(
    client,
    override_current_user,
    monkeypatch,
):
    monkeypatch.setenv("GMFN_VERIFICATION_MODE", "live")
    monkeypatch.setenv("GMFN_BANK_PROVIDER_GB", "truelayer")
    monkeypatch.setenv("TRUELAYER_ACCESS_TOKEN", "secret-truelayer-token")
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION", "1")
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_COST_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION", "1.25")
    monkeypatch.setenv("GMFN_WEBHOOK_SECRET", "secret-webhook")
    monkeypatch.setenv("GSN_WEB_PUSH_PUBLIC_KEY", "public-key")
    monkeypatch.setenv("GSN_WEB_PUSH_PRIVATE_KEY", "private-key")
    monkeypatch.setenv("R2_ACCOUNT_ID", "r2-account")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "r2-key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "r2-secret")
    monkeypatch.setenv("R2_BUCKET_NAME", "r2-bucket")
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_STORAGE_CLOUDFLARE_R2_PRESIGNED_UPLOAD", "1")
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_COST_STORAGE_CLOUDFLARE_R2_PRESIGNED_UPLOAD", "0.20")
    monkeypatch.setenv("GMFN_CONFIRMATION_CALLBACK_WEBHOOK_URL", "https://callback.example/deliver")
    monkeypatch.setenv("GMFN_CONFIRMATION_CALLBACK_WEBHOOK_SECRET", "secret-callback")
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_COMMUNITY_CALLBACK_WEBHOOK_DELIVERY", "1")
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_COST_COMMUNITY_CALLBACK_WEBHOOK_DELIVERY", "0.75")

    res = client.get("/system/diagnostics/api-readiness")
    assert res.status_code == 200, res.text

    body = res.json()
    assert body["ok"] is True
    assert body["diagnostic_version"] == "api-readiness-2026-10-09"
    assert body["counts"]["total"] >= 8
    assert body["mode"]["verification_mode"] == "live"
    assert body["mode"]["gb_bank_provider"] == "truelayer"
    assert "payment.webhooks" in body["recommended_activation_order"]

    services = {item["key"]: item for item in body["services"]}
    assert services["bank.gb.truelayer"]["status"] == "live_ready"
    assert services["bank.gb.truelayer"]["live_ready"] is True
    assert services["bank.gb.truelayer"]["credit_meter_required"] is True
    assert services["payment.webhooks"]["status"] == "signature_ready"
    assert services["payment.webhooks"]["paid_provider"] is False
    assert services["payment.webhooks"]["credit_meter_required"] is False
    assert services["storage.cloudflare_r2"]["status"] == "community_admin_presign_route_ready_default_uploads_local"
    assert services["storage.cloudflare_r2"]["live_ready"] is False
    assert "default marketplace upload routes are still local" in services["storage.cloudflare_r2"]["boundary"]
    assert services["web_push.browser"]["status"] == "configured"
    assert services["community.callback_webhook"]["status"] == "configured_signed_live_ready"
    assert services["community.callback_webhook"]["live_ready"] is True

    assert "secret-truelayer-token" not in res.text
    assert "secret-webhook" not in res.text
    assert "private-key" not in res.text
    assert "r2-secret" not in res.text
    assert "secret-callback" not in res.text


def test_api_readiness_diagnostics_requires_admin(
    client,
    override_current_user_user,
):
    res = client.get("/system/diagnostics/api-readiness")
    assert res.status_code == 403

def test_api_readiness_diagnostics_blocks_truelayer_live_without_credit_meter(
    client,
    override_current_user,
    monkeypatch,
):
    monkeypatch.setenv("GMFN_VERIFICATION_MODE", "live")
    monkeypatch.setenv("GMFN_BANK_PROVIDER_GB", "truelayer")
    monkeypatch.setenv("TRUELAYER_ACCESS_TOKEN", "secret-truelayer-token")
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_DEFAULT_ACCOUNT_ID", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_DEFAULT_PROVIDER_COST", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_BANK_GB_TRUELAYER", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_COST_BANK_GB_TRUELAYER", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_COST_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION", raising=False)

    res = client.get("/system/diagnostics/api-readiness")
    assert res.status_code == 200, res.text
    services = {item["key"]: item for item in res.json()["services"]}
    truelayer = services["bank.gb.truelayer"]

    assert truelayer["configured"] is True
    assert truelayer["live_ready"] is False
    assert truelayer["status"] == "blocked_missing_pipeline_credit_meter"
    assert truelayer["credit_meter_required"] is True

def test_api_readiness_diagnostics_blocks_callback_webhook_without_credit_meter(
    client,
    override_current_user,
    monkeypatch,
):
    monkeypatch.setenv("GMFN_CONFIRMATION_CALLBACK_WEBHOOK_URL", "https://callback.example/deliver")
    monkeypatch.setenv("GMFN_CONFIRMATION_CALLBACK_WEBHOOK_SECRET", "secret-callback")
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_DEFAULT_ACCOUNT_ID", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_DEFAULT_PROVIDER_COST", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_COMMUNITY_CALLBACK_WEBHOOK", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_COST_COMMUNITY_CALLBACK_WEBHOOK", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_COMMUNITY_CALLBACK_WEBHOOK_DELIVERY", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_COST_COMMUNITY_CALLBACK_WEBHOOK_DELIVERY", raising=False)

    res = client.get("/system/diagnostics/api-readiness")
    assert res.status_code == 200, res.text
    services = {item["key"]: item for item in res.json()["services"]}
    callback = services["community.callback_webhook"]

    assert callback["configured"] is True
    assert callback["live_ready"] is False
    assert callback["status"] == "blocked_missing_pipeline_credit_meter"
    assert callback["credit_meter_required"] is True
    assert "secret-callback" not in res.text

def test_api_readiness_diagnostics_blocks_r2_without_credit_meter(
    client,
    override_current_user,
    monkeypatch,
):
    monkeypatch.setenv("R2_ACCOUNT_ID", "r2-account")
    monkeypatch.setenv("R2_ACCESS_KEY_ID", "r2-key")
    monkeypatch.setenv("R2_SECRET_ACCESS_KEY", "r2-secret")
    monkeypatch.setenv("R2_BUCKET_NAME", "r2-bucket")
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_DEFAULT_ACCOUNT_ID", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_DEFAULT_PROVIDER_COST", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_STORAGE_CLOUDFLARE_R2", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_COST_STORAGE_CLOUDFLARE_R2", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_STORAGE_CLOUDFLARE_R2_PRESIGNED_UPLOAD", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_COST_STORAGE_CLOUDFLARE_R2_PRESIGNED_UPLOAD", raising=False)

    res = client.get("/system/diagnostics/api-readiness")
    assert res.status_code == 200, res.text
    services = {item["key"]: item for item in res.json()["services"]}
    r2 = services["storage.cloudflare_r2"]

    assert r2["configured"] is True
    assert r2["live_ready"] is False
    assert r2["status"] == "blocked_missing_pipeline_credit_meter"
    assert r2["credit_meter_required"] is True
    assert "r2-secret" not in res.text

def test_api_readiness_diagnostics_sms_meter_ready_still_not_live_without_provider(
    client,
    override_current_user,
    monkeypatch,
):
    monkeypatch.setenv("GMFN_ENTRY_PHONE_DELIVERY", "sms")
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_PHONE_SMS_OR_VERIFY_DELIVERY", "1")
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_COST_PHONE_SMS_OR_VERIFY_DELIVERY", "0.12")

    res = client.get("/system/diagnostics/api-readiness")
    assert res.status_code == 200, res.text
    services = {item["key"]: item for item in res.json()["services"]}
    phone = services["phone.sms_or_verify"]

    assert phone["configured"] is True
    assert phone["live_ready"] is False
    assert phone["status"] == "meter_ready_provider_not_wired_no_sms_sent"
    assert phone["credit_meter_required"] is True
    assert "does not send SMS yet" in phone["boundary"]
