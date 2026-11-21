from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.advertising_revenue_models  # noqa: F401
import app.db.bank_models  # noqa: F401
import app.db.models  # noqa: F401
import app.db.pipeline_credit_models  # noqa: F401
import app.db.spotlight_commercial_models  # noqa: F401
from app.db.advertising_revenue_models import AdvertisingCampaignSettlement
from app.db.bank_models import BankCredit, ExpectedPayment
from app.db.base import Base
from app.db.models import (
    Clan,
    ClanMembership,
    MarketplaceBroadcast,
    SpotlightCampaign,
    SpotlightExposureEvent,
    SpotlightPresentationLease,
    User,
)
from app.db.pipeline_credit_models import (
    PipelineCreditAccount,
    PipelineCreditAcquisitionApplication,
    PipelineCreditAcquisitionOrder,
    PipelineCreditAcquisitionRefund,
    PipelineCreditLedgerEntry,
    PipelineCreditServiceSpendOrder,
)
from app.db.spotlight_commercial_models import (
    SpotlightCommercialBooking,
    SpotlightCommercialOpportunity,
    SpotlightCommercialRemedy,
    SpotlightCommercialServiceCreditObligation,
)
from app.services.advertising_revenue_service import (
    reconcile_spotlight_booking_settlement,
    spotlight_commercial_settlement_readiness,
)
from app.services.bank_application_service import apply_expected_payment_match
from app.services.pipeline_credit_acquisition_service import (
    PipelineCreditAcquisitionError,
    create_acquisition_instruction,
    record_acquisition_refund,
)
from app.services.pipeline_credit_commerce_service import (
    PipelineCreditCommerceError,
    issue_service_quote,
    set_acquisition_pack,
    set_commercial_control,
    set_pricing_policy,
    set_service_price,
    spend_service_quote,
)
from app.services.reconciliation_service import create_bank_event, reconcile_batch
from app.services.spotlight_capacity_measurement_service import spotlight_capacity_measurement_report
from app.services.payment_operations_policy import (
    PaymentOperationsSuspended,
    require_payment_operations_enabled,
)
from app.services.spotlight_commercial_access_service import (
    SpotlightCommercialAccessError,
    grant_spotlight_pilot_entitlement,
    require_spotlight_payment_operations_enabled,
    revoke_spotlight_pilot_entitlement,
)
from app.services.spotlight_commercial_service import record_capacity_evidence


@pytest.fixture(autouse=True)
def _slice4_flags(monkeypatch):
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED", "1")
    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_V1_ENABLED", "1")


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    session = Session()
    session.add_all(
        [
            User(id=1, email="slice4-admin@example.com", hashed_password="hashed", role="admin", gmfn_id="GSN-S4-1"),
            User(id=2, email="slice4-merchant@example.com", hashed_password="hashed", role="user", gmfn_id="GSN-S4-2"),
            Clan(id=1, name="Slice 4", invite_code="S4-C1", community_code="GMFN-C-004001", status="active", invite_uses=0),
            ClanMembership(id=1, clan_id=1, user_id=1, role="admin", personal_pool_balance=0),
            ClanMembership(id=2, clan_id=1, user_id=2, role="member", personal_pool_balance=0),
        ]
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _pack(db, *, amount: str = "8.00", credits: str = "16.00", code: str = "pilot-8"):
    return set_acquisition_pack(
        db,
        profile_code="gb-pilot",
        profile_label="UK controlled pilot",
        country_codes=["GB"],
        currency="GBP",
        pack_code=code,
        credit_quantity=credits,
        cash_amount=amount,
        lifecycle_status="enforced",
        decision_note="Slice 4 focused test",
        actor_user_id=1,
    )


def _entitle(db, *, role: str = "merchant", user_id: int = 1):
    return grant_spotlight_pilot_entitlement(
        db,
        user_id=user_id,
        clan_id=1,
        entitlement_role=role,
        granted_by_user_id=1,
        decision_note="Slice 4 test cohort",
    )


def _pay(db, *, order: PipelineCreditAcquisitionOrder, amount: str, txn: str, currency: str = "GBP"):
    expected = db.get(ExpectedPayment, int(order.expected_payment_id))
    event = create_bank_event(
        db,
        clan_id=1,
        source_type="webhook_api",
        source_id=txn,
        direction="credit",
        amount=Decimal(amount),
        currency=currency,
        reference_raw=expected.reference_display,
        description_raw="Slice 4 acquisition",
        bank_txn_id=txn,
        posted_at=None,
        value_at=None,
        meta={"test": "slice4"},
    )
    reconcile_batch(db, clan_id=1, limit=50)
    db.refresh(expected)
    return event, expected


def _campaign(db):
    campaign = SpotlightCampaign(
        owner_user_id=1,
        origin_clan_id=1,
        content_kind="broadcast_snapshot",
        content_fingerprint="slice4-advert",
        status="active",
        serving_status="serving",
        source_kind="direct_broadcast",
        commercial_mode="pipeline_credit",
        distribution_scope="direct_communities",
        opportunity_intent="offer",
        opportunity_category="product",
        opportunity_geo_scope="community",
        opportunity_availability="available",
        created_at=datetime(2026, 11, 21, tzinfo=timezone.utc),
        activated_at=datetime(2026, 11, 21, tzinfo=timezone.utc),
        expires_at=datetime(2028, 1, 1, tzinfo=timezone.utc),
        authorized_expires_at=datetime(2028, 1, 1, tzinfo=timezone.utc),
    )
    db.add(campaign)
    db.flush()
    db.add(
        MarketplaceBroadcast(
            publication_key="slice4-publication",
            serving_status="serving",
            content_version=1,
            spotlight_campaign_id=int(campaign.id),
            clan_id=1,
            author_user_id=1,
            message="Slice 4 advert",
            priority_mode="paid",
            visibility_scope="direct_communities",
            expires_at=datetime(2028, 1, 1, tzinfo=timezone.utc),
            authorized_expires_at=datetime(2028, 1, 1, tzinfo=timezone.utc),
        )
    )
    db.commit()
    return campaign


def _configure_booking(db, *, campaign_id: int, funding: str = "merchant_paid"):
    set_pricing_policy(db, region_code="global", currency="GBP", credits_per_currency_unit="2.0000", actor_user_id=1)
    set_service_price(
        db,
        service_code="paid_spotlight.day",
        region_code="global",
        pricing_mode="fixed_credits",
        credit_cost="1.00",
        duration_days=1,
        unit_label="30 scheduled opportunities",
        actor_user_id=1,
    )
    set_commercial_control(db, lifecycle_status="enforced", decision_note="Slice 4 test", actor_user_id=1)
    record_capacity_evidence(
        db,
        clan_id=1,
        region_code="GB-SCT",
        timezone_name="Europe/London",
        service_date="2027-01-15",
        observed_supplied_opportunities={"morning": 100, "afternoon": 100, "evening": 100},
        safety_factor_bps=5000,
        evidence_source="slice4-controlled-observation",
        actor_user_id=1,
        evidence={"test": True},
    )
    quote = issue_service_quote(
        db,
        actor_user_id=1,
        service_code="paid_spotlight.day",
        quantity=1,
        region_code="global",
        context={
            "campaign_id": int(campaign_id),
            "clan_id": 1,
            "funding_classification": funding,
            "region_code": "GB-SCT",
            "timezone": "Europe/London",
            "service_date": "2027-01-15",
            "booking_key": f"slice4-{funding}",
        },
        idempotency_key=f"slice4-quote-{funding}",
    )
    return quote


def test_confirmed_eight_pounds_allocates_exactly_sixteen_credits_once(db):
    _entitle(db)
    pack = _pack(db)
    order = create_acquisition_instruction(
        db,
        purchaser_user_id=1,
        beneficiary_user_id=1,
        clan_id=1,
        pack_version_id=int(pack.id),
        funding_classification="merchant_paid",
        idempotency_key="slice4-acquisition-8",
    )
    _, expected = _pay(db, order=order, amount="4.00", txn="S4-PARTIAL-1")
    assert expected.status == "partial"
    assert db.query(PipelineCreditLedgerEntry).count() == 0
    event, expected = _pay(db, order=order, amount="4.00", txn="S4-PARTIAL-2")
    assert expected.status == "confirmed"
    account = db.query(PipelineCreditAccount).filter_by(account_key="customer_service:user:1").one()
    assert Decimal(str(account.balance)) == Decimal("16.00")
    assert db.query(PipelineCreditLedgerEntry).count() == 1
    repeated = apply_expected_payment_match(db, bank_event_id=int(event.id), expected_payment_id=int(expected.id))
    assert repeated["applied"] is False
    assert repeated["reason"] == "already_applied"
    assert db.query(PipelineCreditLedgerEntry).count() == 1


def test_overpayment_currency_mismatch_and_stale_pack_do_not_overallocate(db):
    _entitle(db)
    one_pack = _pack(db, amount="1.00", credits="2.00", code="pilot-1")
    order = create_acquisition_instruction(
        db,
        purchaser_user_id=1,
        beneficiary_user_id=1,
        clan_id=1,
        pack_version_id=int(one_pack.id),
        funding_classification="merchant_paid",
        idempotency_key="slice4-overpay",
    )
    _, expected = _pay(db, order=order, amount="2.00", txn="S4-OVERPAY")
    assert expected.status == "confirmed"
    assert db.query(BankCredit).one().amount == Decimal("1.00")
    assert db.query(PipelineCreditLedgerEntry).one().credit_amount == Decimal("2.00")

    newer = _pack(db, amount="1.00", credits="2.00", code="pilot-1")
    assert int(newer.id) != int(one_pack.id)
    with pytest.raises(PipelineCreditAcquisitionError, match="stale"):
        create_acquisition_instruction(
            db,
            purchaser_user_id=1,
            beneficiary_user_id=1,
            clan_id=1,
            pack_version_id=int(one_pack.id),
            funding_classification="merchant_paid",
            idempotency_key="slice4-stale-pack",
        )

    other = _pack(db, amount="8.00", credits="16.00", code="pilot-currency")
    mismatch = create_acquisition_instruction(
        db,
        purchaser_user_id=1,
        beneficiary_user_id=1,
        clan_id=1,
        pack_version_id=int(other.id),
        funding_classification="merchant_paid",
        idempotency_key="slice4-currency-mismatch",
    )
    _, mismatch_expected = _pay(db, order=mismatch, amount="8.00", txn="S4-USD", currency="USD")
    assert mismatch_expected.status == "expected"
    assert db.query(PipelineCreditLedgerEntry).count() == 1


def test_unauthorised_or_disabled_acquisition_creates_no_expected_payment(db, monkeypatch):
    pack = _pack(db)
    with pytest.raises(PipelineCreditAcquisitionError) as unauthorised:
        create_acquisition_instruction(
            db,
            purchaser_user_id=2,
            beneficiary_user_id=2,
            clan_id=1,
            pack_version_id=int(pack.id),
            funding_classification="merchant_paid",
            idempotency_key="slice4-unauthorised",
        )
    assert unauthorised.value.code == "spotlight_pilot_not_authorised"
    assert db.query(ExpectedPayment).count() == 0

    _entitle(db, user_id=2)
    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED", "0")
    with pytest.raises(PipelineCreditAcquisitionError) as disabled:
        create_acquisition_instruction(
            db,
            purchaser_user_id=2,
            beneficiary_user_id=2,
            clan_id=1,
            pack_version_id=int(pack.id),
            funding_classification="merchant_paid",
            idempotency_key="slice4-disabled",
        )
    assert disabled.value.code == "spotlight_payment_operations_suspended"
    assert db.query(ExpectedPayment).count() == 0


def test_cash_backed_booking_defers_then_earns_and_refund_is_not_duplicate_revenue(db):
    _entitle(db)
    _entitle(db, role="operator")
    pack = _pack(db)
    acquisition = create_acquisition_instruction(
        db,
        purchaser_user_id=1,
        beneficiary_user_id=1,
        clan_id=1,
        pack_version_id=int(pack.id),
        funding_classification="merchant_paid",
        idempotency_key="slice4-booking-cash",
    )
    _pay(db, order=acquisition, amount="8.00", txn="S4-BOOKING-CASH")
    refund = record_acquisition_refund(
        db,
        acquisition_order_id=int(acquisition.id),
        credit_amount="2.00",
        idempotency_key="slice4-refund-unspent",
        reason="Controlled test refund classification",
        actor_user_id=1,
    )
    repeated_refund = record_acquisition_refund(
        db,
        acquisition_order_id=int(acquisition.id),
        credit_amount="2.00",
        idempotency_key="slice4-refund-unspent",
        reason="Controlled test refund classification",
        actor_user_id=1,
    )
    assert int(repeated_refund.id) == int(refund.id)
    assert refund.status == "recorded_not_disbursed"
    assert refund.cash_amount == Decimal("1.00")
    assert db.query(PipelineCreditAcquisitionRefund).count() == 1
    with pytest.raises(PipelineCreditAcquisitionError) as duplicate_conflict:
        record_acquisition_refund(
            db,
            acquisition_order_id=int(acquisition.id),
            credit_amount="1.00",
            idempotency_key="slice4-refund-unspent",
            reason="Different refund details",
            actor_user_id=1,
        )
    assert duplicate_conflict.value.code == "idempotency_conflict"

    campaign = _campaign(db)
    quote = _configure_booking(db, campaign_id=int(campaign.id))
    order = spend_service_quote(db, actor_user_id=1, quote_key=quote.quote_key, idempotency_key="slice4-booking-spend")
    booking = db.get(SpotlightCommercialBooking, int(order.delivery_reference_id))
    application = db.query(PipelineCreditAcquisitionApplication).filter_by(booking_id=int(booking.id)).one()
    assert application.credit_amount == Decimal("1.00")
    assert application.cash_amount == Decimal("0.50")
    settlement = db.query(AdvertisingCampaignSettlement).filter_by(spotlight_booking_id=int(booking.id)).one()
    assert settlement.status == "payment_confirmed"
    assert settlement.deferred_revenue_amount == Decimal("0.50")
    assert settlement.earned_revenue_amount == Decimal("0.00")

    db.query(SpotlightCommercialOpportunity).filter_by(booking_id=int(booking.id)).update({"status": "supplied"})
    booking.status = "fulfilled"
    db.add(booking)
    db.commit()
    finalized = reconcile_spotlight_booking_settlement(db, booking_id=int(booking.id), actor_user_id=1)
    assert finalized.status == "delivery_finalized"
    assert finalized.earned_revenue_amount == Decimal("0.50")
    assert db.query(AdvertisingCampaignSettlement).filter_by(spotlight_booking_id=int(booking.id)).count() == 1

    remedy = SpotlightCommercialRemedy(
        booking_id=int(booking.id),
        remedy_key="slice4-restored-obligation",
        remedy_type="pipeline_credit_restore",
        missed_opportunities=30,
        credit_amount=Decimal("1.00"),
        status="applied",
    )
    db.add(remedy)
    db.flush()
    db.add(
        SpotlightCommercialServiceCreditObligation(
            remedy_id=int(remedy.id),
            account_id=int(booking.account_id),
            original_booking_id=int(booking.id),
            credit_amount=Decimal("1.00"),
            remaining_credit_amount=Decimal("1.00"),
            status="outstanding",
        )
    )
    booking.status = "remedied"
    db.commit()
    deferred_again = reconcile_spotlight_booking_settlement(db, booking_id=int(booking.id), actor_user_id=1)
    assert deferred_again.earned_revenue_amount == Decimal("0.00")
    assert deferred_again.outstanding_service_credit_amount == Decimal("1.00")


def test_disabled_spotlight_spend_reserves_nothing(db, monkeypatch):
    _entitle(db)
    pack = _pack(db)
    acquisition = create_acquisition_instruction(
        db,
        purchaser_user_id=1,
        beneficiary_user_id=1,
        clan_id=1,
        pack_version_id=int(pack.id),
        funding_classification="merchant_paid",
        idempotency_key="slice4-disabled-spend-cash",
    )
    _pay(db, order=acquisition, amount="8.00", txn="S4-DISABLED-SPEND")
    campaign = _campaign(db)
    quote = _configure_booking(db, campaign_id=int(campaign.id))
    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED", "0")
    with pytest.raises(PipelineCreditCommerceError) as exc:
        spend_service_quote(db, actor_user_id=1, quote_key=quote.quote_key, idempotency_key="slice4-disabled-spend")
    assert exc.value.code == "spotlight_payment_operations_suspended"
    db.rollback()
    assert db.query(SpotlightCommercialBooking).count() == 0
    assert db.query(PipelineCreditServiceSpendOrder).count() == 0


def test_measurement_only_report_creates_no_paid_commitment(db):
    before = db.query(PipelineCreditServiceSpendOrder).count()
    report = spotlight_capacity_measurement_report(
        db,
        clan_id=1,
        service_date="2026-11-21",
        timezone_name="Europe/London",
    )
    after = db.query(PipelineCreditServiceSpendOrder).count()
    assert before == after == 0
    assert report["safety"]["created_paid_service_commitment"] is False
    assert report["safety"]["selection_is_supplied_turn"] is False
    assert report["observed"]["final_presentations_issued"] == 0

def test_payment_gate_isolation_and_operator_entitlement(db, monkeypatch):
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "0")
    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED", "1")
    with pytest.raises(PaymentOperationsSuspended):
        require_payment_operations_enabled()
    with pytest.raises(SpotlightCommercialAccessError) as global_stop:
        require_spotlight_payment_operations_enabled()
    assert global_stop.value.code == "payment_operations_suspended"

    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED", "0")
    require_payment_operations_enabled()
    with pytest.raises(SpotlightCommercialAccessError) as scoped_stop:
        require_spotlight_payment_operations_enabled()
    assert scoped_stop.value.code == "spotlight_payment_operations_suspended"

    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_PAYMENT_OPERATIONS_ENABLED", "1")
    operator = _entitle(db, role="operator")
    pack = _pack(db, amount="1.00", credits="2.00", code="operator-sponsored")
    sponsored = create_acquisition_instruction(
        db,
        purchaser_user_id=1,
        beneficiary_user_id=2,
        clan_id=1,
        pack_version_id=int(pack.id),
        funding_classification="sponsor_funded",
        idempotency_key="slice4a-operator-sponsored",
    )
    assert sponsored.status == "pending_payment"
    revoke_spotlight_pilot_entitlement(
        db,
        entitlement_id=int(operator.id),
        revoked_by_user_id=1,
        decision_note="End controlled operator permission",
    )
    with pytest.raises(PipelineCreditAcquisitionError) as revoked:
        create_acquisition_instruction(
            db,
            purchaser_user_id=1,
            beneficiary_user_id=2,
            clan_id=1,
            pack_version_id=int(pack.id),
            funding_classification="sponsor_funded",
            idempotency_key="slice4a-revoked-operator",
        )
    assert revoked.value.code == "spotlight_pilot_not_authorised"


def test_late_confirmed_payment_after_revocation_is_held_and_retryable(db):
    entitlement = _entitle(db)
    pack = _pack(db, amount="1.00", credits="2.00", code="late-revocation")
    order = create_acquisition_instruction(
        db,
        purchaser_user_id=1,
        beneficiary_user_id=1,
        clan_id=1,
        pack_version_id=int(pack.id),
        funding_classification="merchant_paid",
        idempotency_key="slice4a-late-revocation",
    )
    revoke_spotlight_pilot_entitlement(
        db,
        entitlement_id=int(entitlement.id),
        revoked_by_user_id=1,
        decision_note="Permission ended before cash arrived",
    )
    event, expected = _pay(db, order=order, amount="1.00", txn="S4A-LATE-REVOKED")
    db.refresh(order)
    db.refresh(event)
    assert expected.status == "confirmed"
    assert event.status == "confirmed"
    assert "application_hold:spotlight_pilot_not_authorised" in str(event.status_reason)
    assert order.status == "payment_received_permission_hold"
    assert order.allocation_ledger_entry_id is None
    assert db.query(PipelineCreditLedgerEntry).count() == 0

    _entitle(db)
    applied = apply_expected_payment_match(
        db,
        bank_event_id=int(event.id),
        expected_payment_id=int(expected.id),
    )
    assert applied["applied"] is True
    db.refresh(order)
    assert order.status == "allocated"
    assert order.remaining_credit_amount == Decimal("2.00")
    assert db.query(PipelineCreditLedgerEntry).count() == 1


def _measurement_lease(
    db,
    *,
    broadcast_id: int,
    campaign_id: int,
    presentation_id: str,
    issued_at: datetime,
    viewer_user_id: int,
):
    lease = SpotlightPresentationLease(
        presentation_id=presentation_id,
        issuance_key=f"issuance-{presentation_id}",
        viewer_user_id=viewer_user_id,
        campaign_id=campaign_id,
        placement_broadcast_id=broadcast_id,
        content_version=1,
        surface="marketplace",
        status="qualified",
        issued_at=issued_at,
        lease_expires_at=issued_at + timedelta(minutes=5),
        qualified_at=issued_at + timedelta(seconds=5),
    )
    db.add(lease)
    db.add_all(
        [
            SpotlightExposureEvent(
                presentation_id=presentation_id,
                event_type=event_type,
                viewer_user_id=viewer_user_id,
                campaign_id=campaign_id,
                event_at=issued_at + timedelta(seconds=offset),
                allocation_route_type="community",
                allocation_source_kind="broadcast",
                allocation_source_id=broadcast_id,
                allocation_route_clan_id=1,
                placement_broadcast_id=broadcast_id,
                idempotency_key=f"{presentation_id}-{event_type}",
                presentation_surface="marketplace",
            )
            for event_type, offset in (("served", 1), ("qualifying_impression", 5))
        ]
    )


def test_capacity_measurement_separates_overnight_and_dst_boundaries(db):
    campaign = _campaign(db)
    broadcast = db.query(MarketplaceBroadcast).filter_by(spotlight_campaign_id=int(campaign.id)).one()
    for code, issued_at in (
        ("overnight", datetime(2027, 3, 28, 0, 30, tzinfo=timezone.utc)),
        ("morning", datetime(2027, 3, 28, 4, 30, tzinfo=timezone.utc)),
        ("afternoon", datetime(2027, 3, 28, 11, 30, tzinfo=timezone.utc)),
        ("evening", datetime(2027, 3, 28, 17, 30, tzinfo=timezone.utc)),
    ):
        _measurement_lease(
            db,
            broadcast_id=int(broadcast.id),
            campaign_id=int(campaign.id),
            presentation_id=f"slice4a-{code}",
            issued_at=issued_at,
            viewer_user_id=1,
        )
    db.commit()

    london = spotlight_capacity_measurement_report(
        db,
        clan_id=1,
        service_date="2027-03-28",
        timezone_name="Europe/London",
    )
    starts_at = datetime.fromisoformat(london["utc_window"]["starts_at"])
    ends_at = datetime.fromisoformat(london["utc_window"]["ends_at"])
    assert ends_at - starts_at == timedelta(hours=23)
    for code in ("overnight", "morning", "afternoon", "evening"):
        assert london["observed"]["dayparts"][code]["final_presentations_issued"] == 1
        assert london["observed"]["dayparts"][code]["visible_presentations"] == 1
        assert london["observed"]["dayparts"][code]["qualifying_impressions"] == 1
    assert london["safety"]["overnight_is_sellable_capacity"] is False
    assert london["observed"]["scheduled_opportunities"] == 0
    assert london["observed"]["genuinely_supplied_opportunities"] == 0

    london_fall = spotlight_capacity_measurement_report(
        db,
        clan_id=1,
        service_date="2027-10-31",
        timezone_name="Europe/London",
    )
    fall_start = datetime.fromisoformat(london_fall["utc_window"]["starts_at"])
    fall_end = datetime.fromisoformat(london_fall["utc_window"]["ends_at"])
    assert fall_end - fall_start == timedelta(hours=25)

    lagos = spotlight_capacity_measurement_report(
        db,
        clan_id=1,
        service_date="2027-03-28",
        timezone_name="Africa/Lagos",
    )
    lagos_start = datetime.fromisoformat(lagos["utc_window"]["starts_at"])
    lagos_end = datetime.fromisoformat(lagos["utc_window"]["ends_at"])
    assert lagos_end - lagos_start == timedelta(hours=24)
    assert lagos["observed"]["dayparts"]["overnight"]["final_presentations_issued"] == 1
    assert lagos["observed"]["dayparts"]["morning"]["final_presentations_issued"] == 1


def test_spotlight_financial_costs_remain_pending_policy(db):
    output = spotlight_commercial_settlement_readiness(
        funding_classification="merchant_paid",
        booking_status="fulfilled",
        purchased_credits="1.00",
        supplied_opportunities=30,
        missed_opportunities=0,
        original_shortfall_outstanding=False,
        restored_service_credits_outstanding="0.00",
        cash_collected_amount="0.50",
        processing_cost_amount="0.00",
        processing_cost_policy_status="pending_policy",
        direct_cost_amount="0.00",
        direct_cost_policy_status="pending_policy",
        community_allocation_amount="0.00",
        community_allocation_policy_status="pending_policy",
    )
    assert output["processing_cost_amount"] is None
    assert output["processing_cost_status"] == "pending_policy"
    assert output["direct_cost_amount"] is None
    assert output["direct_cost_status"] == "pending_policy"
    assert output["community_allocation_amount"] is None
    assert output["community_allocation_status"] == "pending_policy"
