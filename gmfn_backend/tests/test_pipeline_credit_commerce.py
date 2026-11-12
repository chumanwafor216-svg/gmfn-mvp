from __future__ import annotations

from decimal import Decimal

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.services.pipeline_credit_commerce_service import (
    set_acquisition_pack,
    set_commercial_control,
    set_pricing_policy,
    set_service_price,
)
from app.services.pipeline_credit_service import (
    ACCOUNT_PURPOSE_CUSTOMER,
    allocate_pipeline_credits,
)


def _seed_vault_owner() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id)
                VALUES (1, 'vault-credit-owner@example.com', 'hashed', 'Vault Credit Owner', 'user', 'GMFN-U-PCV')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES (1, 'Pipeline Credit Clan', 'Pipeline Credit Marketplace', 'PCVAULT1')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 1, 1, 'member', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active
                ) VALUES (
                    1, 1, 1, 'Pipeline Credit Vault Shop', 'Vault debit test shop', 1
                )
                """
            )
        )


def _configure_vault_price(*, credit_cost: str = "20.00", duration_days: int = 30) -> None:
    with SessionLocal() as db:
        set_service_price(
            db,
            service_code="vault.slot",
            region_code="global",
            pricing_mode="fixed_credits",
            credit_cost=credit_cost,
            duration_days=duration_days,
            unit_label="block",
            actor_user_id=1,
        )


def _set_commercial_status(status: str = "enforced") -> None:
    with SessionLocal() as db:
        set_commercial_control(
            db,
            lifecycle_status=status,
            decision_note=f"Test commercial status configured as {status}",
            actor_user_id=1,
        )


def _fund_customer(amount: str) -> None:
    with SessionLocal() as db:
        allocate_pipeline_credits(
            db,
            owner_type="user",
            owner_user_id=1,
            account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
            pricing_region="global",
            currency="PC",
            amount=amount,
            workflow_key="test.customer_service_funding",
            idempotency_key=f"test-customer-funding-{amount}",
            created_by_user_id=1,
        )


def _quote(client, *, quantity: int, key: str):
    return client.post(
        "/pipeline-credits/service-quotes",
        json={
            "service_code": "vault.slot",
            "quantity": quantity,
            "region_code": "global",
            "context": {"shop_id": 1, "clan_id": 1},
            "idempotency_key": key,
        },
    )


def test_operator_catalogue_starts_vacant_and_requires_admin(
    client,
    override_current_user_user,
):
    denied = client.get("/pipeline-credits/admin/pricing-catalogue")
    assert denied.status_code == 403

    catalogue = client.get("/pipeline-credits/service-catalogue")
    assert catalogue.status_code == 200, catalogue.text
    body = catalogue.json()
    assert body["pricing_policy"] is None
    vault = next(item for item in body["services"] if item["service_code"] == "vault.slot")
    assert vault["configured"] is False
    assert vault["credit_cost"] is None


def test_conversion_change_versions_service_without_rewriting_old_quote(
    client,
    override_current_user,
):
    _seed_vault_owner()

    policy = client.put(
        "/pipeline-credits/admin/pricing-policy",
        json={
            "region_code": "global",
            "currency": "GBP",
            "credits_per_currency_unit": "5",
        },
    )
    assert policy.status_code == 200, policy.text

    service = client.put(
        "/pipeline-credits/admin/service-prices/vault.slot",
        json={
            "region_code": "global",
            "pricing_mode": "conversion",
            "cash_reference_amount": "4",
            "cash_reference_currency": "GBP",
            "duration_days": 30,
            "unit_label": "block",
        },
    )
    assert service.status_code == 200, service.text
    first_version = next(
        item for item in service.json()["services"] if item["service_code"] == "vault.slot"
    )
    assert first_version["credit_cost"] == "20.00"
    assert first_version["version"] == 1

    _set_commercial_status()

    old_quote = _quote(client, quantity=1, key="vault-conversion-quote-v1")
    assert old_quote.status_code == 201, old_quote.text
    assert old_quote.json()["quote"]["total_credit_cost"] == "20.00"
    assert old_quote.json()["quote"]["service_version"] == 1

    repriced = client.put(
        "/pipeline-credits/admin/pricing-policy",
        json={
            "region_code": "global",
            "currency": "GBP",
            "credits_per_currency_unit": "6",
        },
    )
    assert repriced.status_code == 200, repriced.text
    active = next(
        item for item in repriced.json()["services"] if item["service_code"] == "vault.slot"
    )
    assert active["credit_cost"] == "24.00"
    assert active["version"] == 2

    new_quote = _quote(client, quantity=1, key="vault-conversion-quote-v2")
    assert new_quote.status_code == 201, new_quote.text
    assert new_quote.json()["quote"]["total_credit_cost"] == "24.00"
    assert new_quote.json()["quote"]["service_version"] == 2

    with engine.begin() as conn:
        immutable_old_cost = conn.execute(
            text(
                """
                SELECT total_credit_cost
                FROM pipeline_credit_service_quotes
                WHERE idempotency_key = 'vault-conversion-quote-v1'
                """
            )
        ).scalar_one()
    assert Decimal(str(immutable_old_cost)) == Decimal("20.00")


def test_service_spend_is_blocked_while_payment_operations_are_suspended(
    client,
    override_current_user_user,
    monkeypatch,
):
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "0")
    _seed_vault_owner()
    _configure_vault_price(credit_cost="10.00")
    _fund_customer("20.00")
    _set_commercial_status()

    quoted = _quote(client, quantity=1, key="vault-suspended-spend-quote")
    assert quoted.status_code == 201, quoted.text
    quote = quoted.json()["quote"]

    spent = client.post(
        "/pipeline-credits/service-spends",
        json={
            "quote_key": quote["quote_key"],
            "idempotency_key": f"spend-{quote['quote_key']}",
        },
    )
    assert spent.status_code == 409, spent.text
    assert spent.json()["detail"]["code"] == "payment_operations_suspended"

    with engine.begin() as conn:
        assert conn.execute(
            text("SELECT balance FROM pipeline_credit_accounts WHERE account_key = 'customer_service:user:1'")
        ).scalar_one() == 20
        assert conn.execute(
            text("SELECT COUNT(*) FROM pipeline_credit_ledger_entries WHERE entry_type = 'debit'")
        ).scalar_one() == 0
        assert conn.execute(text("SELECT COUNT(*) FROM vault_orders")).scalar_one() == 0


def test_vault_quote_spend_atomically_debits_and_unlocks_blocks(
    client,
    override_current_user_user,
    monkeypatch,
):
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    _seed_vault_owner()
    _configure_vault_price(credit_cost="10.00", duration_days=45)
    _set_commercial_status()

    untouched = client.get("/pipeline-credits/me-service-balance")
    assert untouched.status_code == 200, untouched.text
    assert untouched.json()["configured"] is False
    assert untouched.json()["account"]["balance"] == "0.00"
    with engine.begin() as conn:
        assert conn.execute(text("SELECT COUNT(*) FROM pipeline_credit_accounts")).scalar_one() == 0

    _fund_customer("50.00")
    quoted = _quote(client, quantity=2, key="vault-two-block-quote")
    assert quoted.status_code == 201, quoted.text
    quote = quoted.json()["quote"]
    assert quote["total_credit_cost"] == "20.00"
    assert quote["balance"] == "50.00"
    assert quote["resulting_balance"] == "30.00"
    assert quote["has_sufficient_balance"] is True

    spent = client.post(
        "/pipeline-credits/service-spends",
        json={
            "quote_key": quote["quote_key"],
            "idempotency_key": f"spend-{quote['quote_key']}",
        },
    )
    assert spent.status_code == 201, spent.text
    spend = spent.json()["spend"]
    assert spend["status"] == "completed"
    assert spend["total_credit_cost"] == "20.00"
    assert spend["balance"] == "30.00"
    assert spend["result"]["activated"] == 2

    replay = client.post(
        "/pipeline-credits/service-spends",
        json={
            "quote_key": quote["quote_key"],
            "idempotency_key": f"spend-{quote['quote_key']}",
        },
    )
    assert replay.status_code == 201, replay.text
    assert replay.json()["spend"]["order_id"] == spend["order_id"]

    with engine.begin() as conn:
        account = conn.execute(
            text(
                """
                SELECT account_purpose, currency, balance
                FROM pipeline_credit_accounts
                WHERE account_key = 'customer_service:user:1'
                """
            )
        ).mappings().one()
        assert account["account_purpose"] == "customer_service"
        assert account["currency"] == "PC"
        assert Decimal(str(account["balance"])) == Decimal("30.00")
        assert conn.execute(
            text("SELECT COUNT(*) FROM pipeline_credit_ledger_entries WHERE entry_type = 'debit'")
        ).scalar_one() == 1
        assert conn.execute(
            text("SELECT COUNT(*) FROM vault_blocks WHERE state = 'active'")
        ).scalar_one() == 2
        order = conn.execute(
            text("SELECT payment_method, currency, status FROM vault_orders")
        ).mappings().one()
        assert dict(order) == {
            "payment_method": "pipeline_credit",
            "currency": "PC",
            "status": "confirmed",
        }
        entitlement = conn.execute(
            text(
                """
                SELECT quantity_total, status
                FROM feature_entitlements
                WHERE feature_code = 'vault_slot'
                """
            )
        ).mappings().one()
        assert entitlement["quantity_total"] == 2
        assert entitlement["status"] == "active"


def test_insufficient_balance_does_not_debit_or_unlock(
    client,
    override_current_user_user,
    monkeypatch,
):
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    _seed_vault_owner()
    _configure_vault_price(credit_cost="20.00")
    _fund_customer("10.00")
    _set_commercial_status()

    quoted = _quote(client, quantity=1, key="vault-insufficient-quote")
    assert quoted.status_code == 201, quoted.text
    quote = quoted.json()["quote"]
    assert quote["has_sufficient_balance"] is False

    spent = client.post(
        "/pipeline-credits/service-spends",
        json={
            "quote_key": quote["quote_key"],
            "idempotency_key": f"spend-{quote['quote_key']}",
        },
    )
    assert spent.status_code == 409, spent.text
    assert spent.json()["detail"]["code"] == "insufficient_credits"

    with engine.begin() as conn:
        assert conn.execute(
            text("SELECT balance FROM pipeline_credit_accounts WHERE account_key = 'customer_service:user:1'")
        ).scalar_one() == 10
        assert conn.execute(
            text("SELECT COUNT(*) FROM pipeline_credit_ledger_entries WHERE entry_type = 'debit'")
        ).scalar_one() == 0
        assert conn.execute(text("SELECT COUNT(*) FROM vault_orders")).scalar_one() == 0
        assert conn.execute(
            text("SELECT COUNT(*) FROM vault_blocks WHERE state = 'active'")
        ).scalar_one() == 0


def test_direct_vault_bank_instruction_is_retired(
    client,
    override_current_user_user,
):
    _seed_vault_owner()

    response = client.post(
        "/payment-instructions/vault",
        json={
            "clan_id": 1,
            "shop_id": 1,
            "quantity_total": 1,
            "currency": "GBP",
        },
    )

    assert response.status_code == 409, response.text
    assert response.json()["detail"]["code"] == "vault_uses_pipeline_credits"
    with engine.begin() as conn:
        assert conn.execute(
            text("SELECT COUNT(*) FROM expected_payments WHERE expected_type = 'vault_subscription'")
        ).scalar_one() == 0


def test_control_lifecycle_keeps_research_dormant_and_regions_server_owned(
    client,
    override_current_user,
    monkeypatch,
):
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    _seed_vault_owner()
    _configure_vault_price(credit_cost="10.00")

    blocked = _quote(client, quantity=1, key="commercial-research-quote")
    assert blocked.status_code == 409, blocked.text
    assert blocked.json()["detail"]["code"] == "commercial_quotes_disabled"

    shadow = client.put(
        "/pipeline-credits/admin/commercial-control",
        json={"lifecycle_status": "shadow"},
    )
    assert shadow.status_code == 200, shadow.text
    shadow_quote = client.post(
        "/pipeline-credits/service-quotes",
        json={
            "service_code": "vault.slot",
            "quantity": 1,
            "region_code": "nigeria",
            "context": {"shop_id": 1, "clan_id": 1},
            "idempotency_key": "commercial-shadow-quote",
        },
    )
    assert shadow_quote.status_code == 201, shadow_quote.text
    shadow_body = shadow_quote.json()["quote"]
    assert shadow_body["status"] == "shadow"
    assert shadow_body["commercial_status"] == "shadow"
    assert shadow_body["spendable"] is False
    assert shadow_body["region_code"] == "global"

    shadow_spend = client.post(
        "/pipeline-credits/service-spends",
        json={
            "quote_key": shadow_body["quote_key"],
            "idempotency_key": "commercial-shadow-spend",
        },
    )
    assert shadow_spend.status_code == 409, shadow_spend.text
    assert shadow_spend.json()["detail"]["code"] == "commercial_enforcement_disabled"

    enforced = client.put(
        "/pipeline-credits/admin/commercial-control",
        json={"lifecycle_status": "enforced", "decision_note": "Pilot evidence accepted"},
    )
    assert enforced.status_code == 200, enforced.text
    fresh = client.post(
        "/pipeline-credits/service-quotes",
        json={
            "service_code": "vault.slot",
            "quantity": 1,
            "region_code": "united_kingdom",
            "context": {"shop_id": 1, "clan_id": 1},
            "idempotency_key": "commercial-enforced-quote",
        },
    )
    assert fresh.status_code == 201, fresh.text
    fresh_body = fresh.json()["quote"]
    assert fresh_body["status"] == "issued"
    assert fresh_body["commercial_status"] == "enforced"
    assert fresh_body["spendable"] is True
    assert fresh_body["region_code"] == "global"


def test_acquisition_pack_versions_are_immutable_and_catalogue_returns_latest(
    client,
    override_current_user,
):
    with SessionLocal() as db:
        first = set_acquisition_pack(
            db,
            profile_code="emerging-ng",
            profile_label="Nigeria discovery",
            country_codes=["ng", "NG"],
            currency="NGN",
            pack_code="starter",
            credit_quantity="5",
            cash_amount="500",
            lifecycle_status="draft",
            decision_note=None,
            actor_user_id=1,
        )
        second = set_acquisition_pack(
            db,
            profile_code="emerging-ng",
            profile_label="Nigeria discovery",
            country_codes=["ng", "NG"],
            currency="NGN",
            pack_code="starter",
            credit_quantity="5",
            cash_amount="450",
            lifecycle_status="shadow",
            decision_note="Shadow acquisition pack",
            actor_user_id=1,
        )
        first_version = int(first.version)
        second_version = int(second.version)

    assert first_version == 1
    assert second_version == 2

    catalogue_response = client.get(
        "/pipeline-credits/admin/pricing-catalogue",
        params={"currency": "NGN"},
    )
    assert catalogue_response.status_code == 200, catalogue_response.text
    catalogue = catalogue_response.json()
    packs = catalogue["acquisition_packs"]
    assert len(packs) == 1
    assert catalogue["region_code"] == "global"
    assert catalogue["currency"] == "NGN"
    assert packs[0]["profile_code"] == "emerging-ng"
    assert packs[0]["profile_label"] == "Nigeria discovery"
    assert packs[0]["pack_code"] == "starter"
    assert packs[0]["version"] == 2
    assert packs[0]["country_codes"] == ["NG"]
    assert packs[0]["currency"] == "NGN"
    assert packs[0]["credit_quantity"] == "5.00"
    assert packs[0]["cash_amount"] == "450.00"
    assert packs[0]["lifecycle_status"] == "shadow"
    assert packs[0]["credits_per_currency_unit"] == "0.0111"

    with engine.begin() as conn:
        assert conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM pipeline_credit_acquisition_pack_versions
                WHERE profile_code = 'emerging-ng' AND pack_code = 'starter'
                """
            )
        ).scalar_one() == 2
