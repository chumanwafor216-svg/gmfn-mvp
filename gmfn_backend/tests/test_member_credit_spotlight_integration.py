from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.db.member_credit_models import (
    MemberCreditAwardObligation,
    MemberCreditPackVersion,
    MemberCreditProviderPayment,
    MemberCreditServiceSpendOrder,
    MemberCreditServiceVersion,
    MemberServiceCreditAccount,
    MemberServiceCreditLedgerEntry,
)
from app.db.pipeline_credit_models import PipelineCreditAccount, PipelineCreditLedgerEntry
from app.db.models import (
    FeatureEntitlement,
    FeatureUsageEvent,
    MarketplaceBroadcast,
    SpotlightCampaign,
    SpotlightCampaignPacingState,
    TrustEvent,
)
from app.services import member_credit_spotlight_service as spotlight_spend
from app.services.member_credit_service import (
    MemberCreditError,
    allocate_verified_payment,
    apply_award_obligation,
    create_purchase_order,
)
from app.services.spotlight_lifecycle_service import (
    permanently_withdraw,
    place_correction_hold,
    replace_content,
)


ACTIVATED_AT = datetime(2026, 10, 16, 14, 35, tzinfo=timezone.utc)


def _seed_spotlight_foundation() -> tuple[int, int]:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id, trust_score, trust_band)
                VALUES (1, 'synthetic-owner@example.com', 'hashed', 'member', 'GSN-SYNTHETIC-OWNER', 58, 'C')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, community_code, status, invite_code, invite_uses)
                VALUES (1, 'Synthetic Community', 'Synthetic Market', 'SYNTHETIC-1', 'active', 'SYN-1', 0)
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
                INSERT INTO marketplace_shops (id, clan_id, owner_user_id, shop_name, is_active)
                VALUES (1, 1, 1, 'Synthetic Shop', 1)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id, clan_id, shop_id, seller_user_id, title, description,
                    price, currency, image_url, visibility_mode, is_active
                ) VALUES (
                    1, 1, 1, 1, 'Synthetic Product', 'No real payment',
                    '10', 'TST', '/synthetic-one.jpg', 'community_visible', 1
                )
                """
            )
        )
    with SessionLocal() as db:
        pack = MemberCreditPackVersion(
            pack_code="synthetic.integration.pack",
            version=1,
            credit_units=1,
            quoted_amount_minor=1000,
            currency="TST",
            status="test_active",
            terms_json='{"synthetic": true}',
            created_at=ACTIVATED_AT,
        )
        service = MemberCreditServiceVersion(
            service_code="spotlight.single_day",
            version=1,
            credit_cost=1,
            duration_seconds=86400,
            status="test_active",
            terms_json='{"synthetic": true, "delivery_contract": "unapproved"}',
            created_at=ACTIVATED_AT,
        )
        db.add_all([pack, service])
        provider_cost_account = PipelineCreditAccount(
            account_key="synthetic-provider-cost-account",
            owner_type="platform",
            currency="GBP",
            status="active",
            created_at=ACTIVATED_AT,
            updated_at=ACTIVATED_AT,
        )
        db.add(provider_cost_account)
        db.flush()
        db.add(
            PipelineCreditLedgerEntry(
                account_id=int(provider_cost_account.id),
                entry_type="allocation",
                credit_amount=Decimal("9.00"),
                balance_after=Decimal("9.00"),
                workflow_key="synthetic-provider-cost",
                idempotency_key="synthetic-provider-cost-allocation",
                created_at=ACTIVATED_AT,
            )
        )
        db.commit()
        return int(pack.id), int(service.id)


def _award_one_credit(db, *, pack_id: int) -> int:
    order = create_purchase_order(
        db,
        member_user_id=1,
        pack_version_id=pack_id,
        idempotency_key="synthetic-integration-order",
        now=ACTIVATED_AT - timedelta(minutes=5),
        commit=False,
    )
    payment = MemberCreditProviderPayment(
        provider_key="synthetic-test-provider",
        merchant_key="synthetic-test-merchant",
        provider_transaction_id="synthetic-verified-payment",
        amount_minor=1000,
        allocated_minor=0,
        currency="TST",
        verification_status="test_verified",
        received_at=ACTIVATED_AT - timedelta(minutes=4),
        created_at=ACTIVATED_AT - timedelta(minutes=4),
    )
    db.add(payment)
    db.flush()
    allocate_verified_payment(
        db,
        provider_payment_id=int(payment.id),
        purchase_order_id=int(order.id),
        amount_minor=1000,
        policy_key="synthetic-exact-payment",
        allow_partial_contributions=False,
        now=ACTIVATED_AT - timedelta(minutes=3),
        commit=False,
    )
    obligation = db.query(MemberCreditAwardObligation).filter_by(purchase_order_id=order.id).one()
    return apply_award_obligation(
        db,
        obligation_id=int(obligation.id),
        now=ACTIVATED_AT - timedelta(minutes=2),
        commit=True,
    ).account_id


def test_internal_synthetic_accounting_to_spotlight_journey(monkeypatch) -> None:
    monkeypatch.setenv("GSN_MEMBER_CREDIT_SPOTLIGHT_WRITES_ENABLED", "1")
    monkeypatch.setenv("GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED", "1")
    pack_id, service_id = _seed_spotlight_foundation()
    with SessionLocal() as db:
        account_id = _award_one_credit(db, pack_id=pack_id)
        trust_before = db.query(TrustEvent).count()
        result = spotlight_spend.activate_single_day_spotlight(
            db,
            member_user_id=1,
            service_version_id=service_id,
            funding_source="member_credit",
            shop_id=1,
            product_id=1,
            placement_clan_ids=[1],
            message="Original synthetic Spotlight",
            image_url="/synthetic-one.jpg",
            video_url=None,
            idempotency_key="synthetic-spotlight-spend",
            now=ACTIVATED_AT,
            commit=True,
        )
        assert result.activated_at == ACTIVATED_AT
        assert result.expires_at == ACTIVATED_AT + timedelta(hours=24)
        assert db.get(MemberServiceCreditAccount, account_id).balance_units == 0
        assert db.query(MemberServiceCreditLedgerEntry).count() == 2

        replay = spotlight_spend.activate_single_day_spotlight(
            db,
            member_user_id=1,
            service_version_id=service_id,
            funding_source="member_credit",
            shop_id=1,
            product_id=1,
            placement_clan_ids=[1],
            message="Original synthetic Spotlight",
            image_url="/synthetic-one.jpg",
            video_url=None,
            idempotency_key="synthetic-spotlight-spend",
            now=ACTIVATED_AT + timedelta(minutes=1),
            commit=True,
        )
        assert replay.deduped is True
        assert replay.campaign_id == result.campaign_id
        assert replay.expires_at == result.expires_at
        assert db.query(MemberServiceCreditLedgerEntry).count() == 2

        campaign = db.get(SpotlightCampaign, result.campaign_id)
        place_correction_hold(db, campaign=campaign, now=ACTIVATED_AT + timedelta(hours=1))
        db.commit()
        replace_content(
            db,
            campaign=campaign,
            content_kind="product_snapshot",
            content_fingerprint="b" * 64,
            source_product_id=1,
            message="Corrected synthetic wording",
            image_url="/synthetic-corrected.jpg",
            video_url=None,
            now=ACTIVATED_AT + timedelta(hours=2),
        )
        db.commit()
        db.refresh(campaign)
        assert campaign.activated_at.replace(tzinfo=timezone.utc) == ACTIVATED_AT
        assert campaign.authorized_expires_at.replace(tzinfo=timezone.utc) == ACTIVATED_AT + timedelta(hours=24)
        assert campaign.content_version == 2
        assert db.get(MemberServiceCreditAccount, account_id).balance_units == 0

        permanently_withdraw(db, campaign=campaign, now=ACTIVATED_AT + timedelta(hours=3))
        db.commit()
        db.refresh(campaign)
        assert campaign.serving_status == "withdrawn"
        assert db.get(MemberServiceCreditAccount, account_id).balance_units == 0
        assert db.query(TrustEvent).count() == trust_before
        assert db.query(MemberCreditServiceSpendOrder).count() == 1
        provider_cost_entries = db.query(PipelineCreditLedgerEntry).all()
        assert len(provider_cost_entries) == 1
        assert provider_cost_entries[0].credit_amount == Decimal("9.00")
        assert provider_cost_entries[0].balance_after == Decimal("9.00")


def test_member_credit_spotlight_writer_is_disabled_by_default(monkeypatch) -> None:
    monkeypatch.delenv("GSN_MEMBER_CREDIT_SPOTLIGHT_WRITES_ENABLED", raising=False)
    _, service_id = _seed_spotlight_foundation()
    with SessionLocal() as db:
        with pytest.raises(MemberCreditError, match="member_credit_spotlight_writers_disabled"):
            spotlight_spend.activate_single_day_spotlight(
                db,
                member_user_id=1,
                service_version_id=service_id,
                funding_source="member_credit",
                shop_id=1,
                product_id=1,
                placement_clan_ids=[1],
                message="Disabled",
                image_url=None,
                video_url=None,
                idempotency_key="disabled-writer",
                now=ACTIVATED_AT,
            )
        assert db.query(MemberCreditServiceSpendOrder).count() == 0
        assert db.query(SpotlightCampaign).count() == 0


def test_explicit_legacy_source_consumes_only_legacy_unit_and_pins_funding_choice(monkeypatch) -> None:
    monkeypatch.setenv("GSN_MEMBER_CREDIT_SPOTLIGHT_WRITES_ENABLED", "1")
    _, service_id = _seed_spotlight_foundation()
    with SessionLocal() as db:
        db.add(
            MemberServiceCreditAccount(
                member_user_id=1,
                balance_units=5,
                version=0,
                status="active",
                created_at=ACTIVATED_AT,
                updated_at=ACTIVATED_AT,
            )
        )
        db.add(
            FeatureEntitlement(
                owner_user_id=1,
                shop_id=1,
                feature_code="spotlight_priority",
                plan_code="legacy-test",
                quantity_total=1,
                quantity_used=0,
                status="active",
                starts_at=ACTIVATED_AT - timedelta(days=1),
                expires_at=ACTIVATED_AT + timedelta(days=1),
                payment_reference="explicit-legacy-source",
            )
        )
        db.commit()
        result = spotlight_spend.activate_single_day_spotlight(
            db,
            member_user_id=1,
            service_version_id=service_id,
            funding_source="legacy_entitlement",
            shop_id=1,
            product_id=1,
            placement_clan_ids=[1],
            message="Explicit legacy source",
            image_url=None,
            video_url=None,
            idempotency_key="explicit-legacy-spend",
            now=ACTIVATED_AT,
            commit=True,
        )
        assert result.funding_source == "legacy_entitlement"
        assert db.query(FeatureEntitlement).one().quantity_used == 1
        assert db.query(FeatureUsageEvent).count() == 1
        assert db.query(MemberServiceCreditAccount).one().balance_units == 5
        assert db.query(MemberServiceCreditLedgerEntry).count() == 0
        with pytest.raises(MemberCreditError, match="conflicting_idempotency_fingerprint"):
            spotlight_spend.activate_single_day_spotlight(
                db,
                member_user_id=1,
                service_version_id=service_id,
                funding_source="member_credit",
                shop_id=1,
                product_id=1,
                placement_clan_ids=[1],
                message="Explicit legacy source",
                image_url=None,
                video_url=None,
                idempotency_key="explicit-legacy-spend",
                now=ACTIVATED_AT,
                commit=True,
            )
        assert db.query(FeatureEntitlement).one().quantity_used == 1
        assert db.query(MemberServiceCreditAccount).one().balance_units == 5


def test_activation_failure_rolls_back_debit_campaign_placements_and_spend(monkeypatch) -> None:
    monkeypatch.setenv("GSN_MEMBER_CREDIT_SPOTLIGHT_WRITES_ENABLED", "1")
    pack_id, service_id = _seed_spotlight_foundation()
    with SessionLocal() as db:
        account_id = _award_one_credit(db, pack_id=pack_id)

        def fail_activation(*args, **kwargs):
            raise RuntimeError("synthetic activation failure")

        monkeypatch.setattr(spotlight_spend, "_persist_spotlight_activation", fail_activation)
        with pytest.raises(RuntimeError, match="synthetic activation failure"):
            spotlight_spend.activate_single_day_spotlight(
                db,
                member_user_id=1,
                service_version_id=service_id,
                funding_source="member_credit",
                shop_id=1,
                product_id=1,
                placement_clan_ids=[1],
                message="Must roll back",
                image_url=None,
                video_url=None,
                idempotency_key="failed-spotlight-spend",
                now=ACTIVATED_AT,
                commit=True,
            )
        assert db.get(MemberServiceCreditAccount, account_id).balance_units == 1
        assert db.query(MemberCreditServiceSpendOrder).count() == 0
        assert db.query(SpotlightCampaign).count() == 0
        assert db.query(MarketplaceBroadcast).count() == 0
        assert db.query(MemberServiceCreditLedgerEntry).count() == 1


def test_explicit_member_source_never_falls_back_to_legacy_and_exhausted_rejects_first(monkeypatch) -> None:
    monkeypatch.setenv("GSN_MEMBER_CREDIT_SPOTLIGHT_WRITES_ENABLED", "1")
    _, service_id = _seed_spotlight_foundation()
    with SessionLocal() as db:
        db.add(
            FeatureEntitlement(
                owner_user_id=1,
                shop_id=1,
                feature_code="spotlight_priority",
                plan_code="legacy-test",
                quantity_total=1,
                quantity_used=0,
                status="active",
                starts_at=ACTIVATED_AT - timedelta(days=1),
                expires_at=ACTIVATED_AT + timedelta(days=1),
                payment_reference="legacy-test-one",
            )
        )
        db.commit()
        with pytest.raises(MemberCreditError, match="insufficient_member_credits"):
            spotlight_spend.activate_single_day_spotlight(
                db,
                member_user_id=1,
                service_version_id=service_id,
                funding_source="member_credit",
                shop_id=1,
                product_id=1,
                placement_clan_ids=[1],
                message="No fallback",
                image_url=None,
                video_url=None,
                idempotency_key="no-funding-switch",
                now=ACTIVATED_AT,
                commit=True,
            )
        legacy = db.query(FeatureEntitlement).one()
        assert legacy.quantity_used == 0
        assert legacy.expires_at.replace(tzinfo=timezone.utc) == ACTIVATED_AT + timedelta(days=1)
        assert db.query(FeatureUsageEvent).count() == 0

        campaign = SpotlightCampaign(
            owner_user_id=1,
            shop_id=1,
            origin_clan_id=1,
            content_kind="product_snapshot",
            content_fingerprint="e" * 64,
            status="active",
            serving_status="serving",
            content_version=1,
            source_kind="legacy",
            commercial_mode="paid",
            distribution_scope="direct_communities",
            created_at=ACTIVATED_AT - timedelta(hours=1),
            activated_at=ACTIVATED_AT - timedelta(hours=1),
            expires_at=ACTIVATED_AT + timedelta(hours=23),
            authorized_expires_at=ACTIVATED_AT + timedelta(hours=23),
        )
        db.add(campaign)
        db.flush()
        db.add(
            SpotlightCampaignPacingState(
                campaign_id=int(campaign.id),
                max_delivery_rounds=10,
                consumed_delivery_rounds=10,
                exhausted=True,
                version=10,
                created_at=ACTIVATED_AT,
                updated_at=ACTIVATED_AT,
            )
        )
        db.commit()
        with pytest.raises(MemberCreditError, match="delivery_exhausted_purchase_rejected_before_consumption"):
            spotlight_spend.activate_single_day_spotlight(
                db,
                member_user_id=1,
                service_version_id=service_id,
                funding_source="legacy_entitlement",
                shop_id=1,
                product_id=1,
                placement_clan_ids=[1],
                message="Exhausted rejection",
                image_url=None,
                video_url=None,
                idempotency_key="exhausted-no-consume",
                now=ACTIVATED_AT,
                commit=True,
            )
        legacy = db.query(FeatureEntitlement).one()
        assert legacy.quantity_used == 0
        assert legacy.expires_at.replace(tzinfo=timezone.utc) == ACTIVATED_AT + timedelta(days=1)
        assert db.query(FeatureUsageEvent).count() == 0
