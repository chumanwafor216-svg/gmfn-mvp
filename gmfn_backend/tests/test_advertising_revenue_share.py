from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from app.db.advertising_revenue_models import (
    AdvertisingCampaignSettlement,
    AdvertisingCommunityEarning,
    AdvertisingCommunityPayout,
    CommunityAdvertisingPayoutMandate,
)
from app.db.bank_models import BankEvent, ExpectedPayment
from app.db.database import SessionLocal
from app.db.models import (
    Clan,
    FeatureEntitlement,
    MarketplaceBroadcast,
    SpotlightCampaign,
    SpotlightExposureEvent,
    User,
    UserPayoutDestination,
)
from app.services.advertising_revenue_service import (
    AdvertisingRevenueError,
    _allocate_pool_by_weight,
    accept_payout_mandate,
    appoint_payout_beneficiary,
    calculate_settlement_amounts,
    finalize_campaign_delivery,
    prepare_community_payout,
    record_community_payout_paid,
)
from app.services.bank_application_service import apply_expected_payment_match


NOW = datetime.now(timezone.utc)


def test_small_pool_rounding_never_creates_a_negative_community_share():
    shares = _allocate_pool_by_weight(
        Decimal("0.04"),
        {clan_id: 1 for clan_id in range(1, 7)},
    )

    assert sum(shares.values(), Decimal("0.00")) == Decimal("0.04")
    assert all(amount >= Decimal("0.00") for amount in shares.values())


def _seed_foundation(db) -> SpotlightCampaign:
    db.add_all(
        [
            User(id=1, email="admin@example.com", hashed_password="x", role="admin"),
            User(id=2, email="beneficiary@example.com", hashed_password="x", role="user"),
            User(id=3, email="viewer@example.com", hashed_password="x", role="user"),
            User(id=4, email="viewer2@example.com", hashed_password="x", role="user"),
            Clan(id=10, name="Paid Community A", invite_code="paid-a", status="active", created_by_user_id=1),
            Clan(id=11, name="Paid Community B", invite_code="paid-b", status="active", created_by_user_id=1),
            Clan(id=12, name="Free Community", invite_code="free-c", status="active", created_by_user_id=1),
        ]
    )
    db.flush()
    campaign = SpotlightCampaign(
        owner_user_id=1,
        origin_clan_id=10,
        source_kind="gsn_house",
        commercial_mode="house",
        content_fingerprint="ad-revenue-test",
        status="expired",
        serving_status="expired",
        activated_at=NOW - timedelta(days=2),
        expires_at=NOW - timedelta(days=1),
        authorized_expires_at=NOW - timedelta(days=1),
    )
    db.add(campaign)
    db.flush()
    for clan_id in (10, 11, 12):
        db.add(
            MarketplaceBroadcast(
                spotlight_campaign_id=int(campaign.id),
                clan_id=clan_id,
                author_user_id=1,
                message="A governed campaign",
                priority_mode="house",
                visibility_scope="direct_communities",
                expires_at=NOW - timedelta(days=1),
            )
        )
    db.add_all(
        [
            FeatureEntitlement(
                owner_user_id=1,
                clan_id=10,
                feature_code="community_domain",
                plan_code="community-domain-annual-a",
                payment_reference="CD-PAID-A",
                starts_at=NOW - timedelta(days=30),
                expires_at=NOW + timedelta(days=300),
                status="active",
            ),
            FeatureEntitlement(
                owner_user_id=1,
                clan_id=11,
                feature_code="community_domain",
                plan_code="community-domain-annual-b",
                payment_reference="CD-PAID-B",
                starts_at=NOW - timedelta(days=30),
                expires_at=NOW + timedelta(days=300),
                status="active",
            ),
        ]
    )
    db.flush()
    event_id = 1
    for clan_id, count in ((10, 3), (11, 1), (12, 5)):
        placement = (
            db.query(MarketplaceBroadcast)
            .filter(MarketplaceBroadcast.spotlight_campaign_id == int(campaign.id))
            .filter(MarketplaceBroadcast.clan_id == clan_id)
            .one()
        )
        for index in range(count):
            db.add(
                SpotlightExposureEvent(
                    id=event_id,
                    viewer_user_id=3 if index % 2 == 0 else 4,
                    campaign_id=int(campaign.id),
                    event_type="qualifying_impression",
                    event_at=NOW - timedelta(days=1, hours=1),
                    allocation_route_type="community",
                    allocation_route_clan_id=clan_id,
                    placement_broadcast_id=int(placement.id),
                    idempotency_key=f"ad-revenue-{clan_id}-{index}",
                )
            )
            event_id += 1
    db.flush()
    return campaign


def test_net_revenue_pool_is_five_percent_after_explicit_direct_costs_only():
    result = calculate_settlement_amounts(
        gross_amount="100.00",
        tax_amount="5.00",
        refund_amount="2.00",
        chargeback_amount="1.00",
        processing_fee_amount="3.00",
        delivery_cost_amount="9.00",
        share_bps=500,
    )
    assert result["total_deductions"] == Decimal("20.00")
    assert result["distributable_net_amount"] == Decimal("80.00")
    assert result["community_pool_amount"] == Decimal("4.00")
    assert "General GSN salaries" in result["excluded_from_deductions"]


def test_finalization_splits_one_pool_only_across_paid_community_impressions():
    with SessionLocal() as db:
        campaign = _seed_foundation(db)
        settlement = AdvertisingCampaignSettlement(
            campaign_id=int(campaign.id),
            currency="GBP",
            gross_received_amount=Decimal("100.00"),
            tax_amount=Decimal("0.00"),
            refund_amount=Decimal("0.00"),
            chargeback_amount=Decimal("0.00"),
            processing_fee_amount=Decimal("10.00"),
            delivery_cost_amount=Decimal("10.00"),
            distributable_net_amount=Decimal("80.00"),
            community_pool_bps=500,
            community_pool_amount=Decimal("4.00"),
            status="payment_confirmed",
            idempotency_key="settlement-finalize-1",
            created_by_user_id=1,
            confirmed_at=NOW,
        )
        db.add(settlement)
        db.commit()

        rows = finalize_campaign_delivery(db, campaign_id=int(campaign.id), actor_user_id=1)
        by_clan = {row.clan_id: row for row in rows}
        assert by_clan[10].amount == Decimal("3.00")
        assert by_clan[11].amount == Decimal("1.00")
        assert by_clan[12].amount == Decimal("0.00")
        assert by_clan[12].eligibility_status == "not_paid_when_impressions_occurred"
        assert sum((row.amount for row in rows), Decimal("0.00")) == Decimal("4.00")
        assert db.get(AdvertisingCampaignSettlement, settlement.id).status == "delivery_finalized"


def test_beneficiary_must_accept_and_payout_preparation_does_not_move_money():
    with SessionLocal() as db:
        campaign = _seed_foundation(db)
        destination = UserPayoutDestination(
            user_id=2,
            destination_name="Ada Example",
            bank_name="Example Bank",
            account_number="0123456789",
            country="NG",
            currency="GBP",
            verification_status="recorded",
        )
        db.add(destination)
        db.flush()
        mandate = appoint_payout_beneficiary(
            db,
            clan_id=10,
            beneficiary_user_id=2,
            appointed_by_user_id=1,
            authority_note="Community minute 2026-10-25",
        )
        assert mandate.status == "pending_beneficiary"
        mandate = accept_payout_mandate(db, mandate_id=mandate.id, beneficiary_user_id=2)
        assert mandate.status == "active"
        assert mandate.payout_destination_id == destination.id

        settlement = AdvertisingCampaignSettlement(
            campaign_id=int(campaign.id),
            currency="GBP",
            gross_received_amount=Decimal("100.00"),
            distributable_net_amount=Decimal("80.00"),
            community_pool_bps=500,
            community_pool_amount=Decimal("4.00"),
            status="payment_confirmed",
            idempotency_key="settlement-payout-1",
            created_by_user_id=1,
            confirmed_at=NOW,
        )
        db.add(settlement)
        db.commit()
        finalize_campaign_delivery(db, campaign_id=int(campaign.id), actor_user_id=1)

        with pytest.raises(AdvertisingRevenueError) as exc_info:
            prepare_community_payout(
                db,
                clan_id=10,
                currency="GBP",
                actor_user_id=1,
                idempotency_key="payout-blocked-unverified",
            )
        assert exc_info.value.code == "payout_destination_not_ready"
        destination.verification_status = "phone_verified_bank_recorded"
        db.commit()

        payout = prepare_community_payout(
            db,
            clan_id=10,
            currency="GBP",
            actor_user_id=1,
            idempotency_key="payout-community-10",
        )
        assert payout.amount == Decimal("3.00")
        assert payout.status == "prepared"
        earning = (
            db.query(AdvertisingCommunityEarning)
            .filter(AdvertisingCommunityEarning.clan_id == 10)
            .one()
        )
        assert earning.status == "payout_prepared"

        paid = record_community_payout_paid(
            db,
            payout_id=payout.id,
            actor_user_id=1,
            external_transaction_reference="BANK-TXN-001",
        )
        assert paid.status == "paid_recorded"
        assert paid.external_transaction_reference == "BANK-TXN-001"
        assert db.get(AdvertisingCommunityEarning, earning.id).status == "paid_recorded"


def test_reconciled_advertiser_payment_connects_expected_payment_to_settlement():
    with SessionLocal() as db:
        campaign = _seed_foundation(db)
        expected = ExpectedPayment(
            clan_id=10,
            user_id=2,
            expected_type="advertising_campaign",
            amount=Decimal("100.00"),
            currency="GBP",
            paid_amount=Decimal("100.00"),
            remaining_amount=Decimal("0.00"),
            reference_display="GSN-AD-C1-P2",
            reference_normalized="GSN-AD-C1-P2",
            status="confirmed",
        )
        db.add(expected)
        db.flush()
        bank_event = BankEvent(
            clan_id=10,
            source_type="statement_csv",
            direction="credit",
            amount=Decimal("100.00"),
            currency="GBP",
            reference_raw="GSN-AD-C1-P2",
            reference_normalized="GSN-AD-C1-P2",
            match_key="10|credit|GBP|100.00|GSN-AD-C1-P2",
            status="confirmed",
            confidence=100,
            canonical=True,
            expected_payment_id=int(expected.id),
            hash="advertising-payment-bank-event",
        )
        db.add(bank_event)
        db.flush()
        settlement = AdvertisingCampaignSettlement(
            campaign_id=int(campaign.id),
            payer_user_id=2,
            expected_payment_id=int(expected.id),
            currency="GBP",
            gross_received_amount=Decimal("100.00"),
            distributable_net_amount=Decimal("100.00"),
            community_pool_bps=500,
            community_pool_amount=Decimal("5.00"),
            status="awaiting_payment",
            idempotency_key="settlement-bank-apply",
            created_by_user_id=1,
        )
        db.add(settlement)
        db.commit()

        applied = apply_expected_payment_match(
            db,
            bank_event_id=int(bank_event.id),
            expected_payment_id=int(expected.id),
        )
        assert applied["applied"] is True
        refreshed = db.get(AdvertisingCampaignSettlement, int(settlement.id))
        assert refreshed.status == "payment_confirmed"
        assert refreshed.bank_event_id == bank_event.id
