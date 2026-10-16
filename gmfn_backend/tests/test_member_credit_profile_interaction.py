from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app.db.database import SessionLocal
from app.db.member_credit_models import (
    MemberCreditPackVersion,
    MemberCreditPurchaseOrder,
    MemberCreditServiceSpendOrder,
    MemberCreditServiceVersion,
    MemberServiceCreditLedgerEntry,
)
from app.db.models import MarketplaceRelayConsentEvent, MarketplaceRelayPolicy, User, UserSettings
from app.db.pipeline_credit_models import PipelineCreditAccount, PipelineCreditLedgerEntry
from app.main import app
from app.services.member_credit_permissions import (
    get_member_credit_service_permissions,
    set_member_credit_service_permission,
)


NOW = datetime(2026, 10, 17, 9, 0, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def _isolated_catalogue(monkeypatch):
    monkeypatch.setenv("PYTEST_RUNNING", "1")
    monkeypatch.setenv("GSN_MEMBER_CREDIT_TEST_QUOTES_ENABLED", "1")
    monkeypatch.setenv("GSN_MEMBER_CREDIT_SPOTLIGHT_WRITES_ENABLED", "1")
    monkeypatch.setenv("GSN_MEMBER_CREDIT_SYNTHETIC_PAYMENTS_ENABLED", "1")
    monkeypatch.setenv("GSN_MEMBER_CREDIT_COLLECTION_PROVIDER", "synthetic-test-provider")


def _seed_profile_catalogue() -> None:
    with SessionLocal() as db:
        db.add_all(
            [
                User(id=1, email="member-one@example.com", hashed_password="x", role="member"),
                User(id=2, email="member-two@example.com", hashed_password="x", role="member"),
                MemberCreditPackVersion(
                    pack_code="synthetic.profile.pack",
                    version=4,
                    credit_units=6,
                    quoted_amount_minor=3200,
                    currency="TST",
                    status="test_active",
                    terms_json='{"synthetic":true}',
                    created_at=NOW,
                ),
                MemberCreditServiceVersion(
                    service_code="spotlight.single_day",
                    version=2,
                    credit_cost=2,
                    duration_seconds=86400,
                    status="test_active",
                    terms_json='{"synthetic":true}',
                    created_at=NOW,
                ),
            ]
        )
        db.flush()
        community = PipelineCreditAccount(
            account_key="community:77",
            owner_type="community",
            clan_id=77,
            currency="GBP",
            status="active",
            created_at=NOW,
            updated_at=NOW,
        )
        db.add(community)
        db.flush()
        db.add(
            PipelineCreditLedgerEntry(
                account_id=int(community.id),
                clan_id=77,
                entry_type="allocation",
                credit_amount=Decimal("12.00"),
                balance_after=Decimal("12.00"),
                workflow_key="synthetic-profile-boundary",
                idempotency_key="synthetic-profile-boundary",
                created_at=NOW,
            )
        )
        db.commit()


def test_profile_catalogue_is_member_bound_server_owned_and_suspended(
    client, override_current_user_user, monkeypatch
) -> None:
    _seed_profile_catalogue()
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "0")

    response = client.get("/member-credits/catalogue")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["member_user_id"] == 1
    assert body["balance_units"] == 0
    assert body["purchase_operations_enabled"] is False
    assert body["spending_operations_enabled"] is False
    assert body["catalogue_mode"] == "isolated_test"
    assert body["packs"] == [
        {
            "pack_version_id": body["packs"][0]["pack_version_id"],
            "pack_code": "synthetic.profile.pack",
            "catalog_version": 4,
            "credit_units": 6,
            "amount_minor": 3200,
            "currency": "TST",
            "terms_json": '{"synthetic":true}',
        }
    ]
    service = body["services"][0]
    assert service["service_code"] == "spotlight.single_day"
    assert service["service_name"] == "Spotlight"
    assert service["credit_cost"] == 2
    assert service["duration_seconds"] == 86400
    assert service["permission_enabled"] is False
    assert service["spending_enabled"] is False
    assert service["has_sufficient_balance"] is False
    assert service["workflow_url"].startswith("/app/shop-control")

    quote = client.post(
        "/member-credits/purchase-quotes",
        json={"pack_version_id": body["packs"][0]["pack_version_id"], "idempotency_key": "suspended-profile"},
    )
    assert quote.status_code == 503
    with SessionLocal() as db:
        assert db.query(MemberCreditPurchaseOrder).count() == 0


def test_permission_persists_per_member_without_financial_or_community_effects(
    client, override_current_user_user, monkeypatch
) -> None:
    _seed_profile_catalogue()
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    with SessionLocal() as db:
        community_entries_before = db.query(PipelineCreditLedgerEntry).count()
        relay_policy_rows_before = db.query(MarketplaceRelayPolicy).count()
        relay_consent_rows_before = db.query(MarketplaceRelayConsentEvent).count()
        community_balance_before = Decimal(
            db.query(PipelineCreditLedgerEntry).one().balance_after
        )

    enabled = client.patch(
        "/member-credits/service-permissions/spotlight.single_day",
        json={"enabled": True},
    )
    assert enabled.status_code == 200, enabled.text
    assert enabled.json() == {"service_code": "spotlight.single_day", "enabled": True}
    assert client.get("/member-credits/catalogue").json()["services"][0]["permission_enabled"] is True

    with SessionLocal() as db:
        assert get_member_credit_service_permissions(
            db, member_user_id=1, service_codes=["spotlight.single_day"]
        )["spotlight.single_day"] is True
        assert get_member_credit_service_permissions(
            db, member_user_id=2, service_codes=["spotlight.single_day"]
        )["spotlight.single_day"] is False
        set_member_credit_service_permission(
            db,
            member_user_id=2,
            service_code="spotlight.single_day",
            enabled=True,
        )
        assert get_member_credit_service_permissions(
            db, member_user_id=1, service_codes=["spotlight.single_day"]
        )["spotlight.single_day"] is True
        assert db.query(MemberServiceCreditLedgerEntry).count() == 0
        assert db.query(MemberCreditServiceSpendOrder).count() == 0
        assert db.query(PipelineCreditLedgerEntry).count() == community_entries_before
        assert db.query(MarketplaceRelayPolicy).count() == relay_policy_rows_before
        assert db.query(MarketplaceRelayConsentEvent).count() == relay_consent_rows_before
        assert Decimal(
            db.query(PipelineCreditLedgerEntry).one().balance_after
        ) == community_balance_before

    disabled = client.patch(
        "/member-credits/service-permissions/spotlight.single_day",
        json={"enabled": False},
    )
    assert disabled.status_code == 200
    assert disabled.json()["enabled"] is False
    with SessionLocal() as db:
        assert db.query(UserSettings).filter(UserSettings.user_id == 1).one().member_credit_service_permissions_json == '{"spotlight.single_day":false}'


def test_profile_purchase_uses_server_catalogue_and_idempotent_existing_contracts(
    client, override_current_user_user, monkeypatch
) -> None:
    _seed_profile_catalogue()
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    catalogue = client.get("/member-credits/catalogue").json()
    pack = catalogue["packs"][0]

    quote_payload = {
        "pack_version_id": pack["pack_version_id"],
        "idempotency_key": "profile-review-one",
    }
    first_quote = client.post("/member-credits/purchase-quotes", json=quote_payload)
    replayed_quote = client.post("/member-credits/purchase-quotes", json=quote_payload)
    assert first_quote.status_code == 200, first_quote.text
    assert replayed_quote.status_code == 200, replayed_quote.text
    assert replayed_quote.json()["quote_key"] == first_quote.json()["quote_key"]
    assert first_quote.json()["credit_units"] == pack["credit_units"]
    assert first_quote.json()["amount_minor"] == pack["amount_minor"]
    assert first_quote.json()["currency"] == pack["currency"]

    confirmation = {
        "quote_key": first_quote.json()["quote_key"],
        "idempotency_key": "profile-confirm-one",
    }
    first_order = client.post("/member-credits/purchases", json=confirmation)
    replayed_order = client.post("/member-credits/purchases", json=confirmation)
    assert first_order.status_code == 200, first_order.text
    assert replayed_order.status_code == 200, replayed_order.text
    assert replayed_order.json()["order_key"] == first_order.json()["order_key"]
    assert first_order.json()["status"] == "verification_pending"
    assert first_order.json()["collection_action_url"] is None
    with SessionLocal() as db:
        assert db.query(MemberCreditPurchaseOrder).count() == 1


def test_profile_credit_contracts_require_authentication(client) -> None:
    _seed_profile_catalogue()
    previous = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    try:
        assert client.get("/member-credits/catalogue").status_code == 401
        assert client.patch(
            "/member-credits/service-permissions/spotlight.single_day",
            json={"enabled": True},
        ).status_code == 401
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(previous)
