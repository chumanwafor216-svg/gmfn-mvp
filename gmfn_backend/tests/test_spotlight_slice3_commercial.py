from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.db.models import MarketplaceBroadcast, SpotlightCampaign, SpotlightExposureEvent, SpotlightPresentationLease
from app.db.spotlight_commercial_models import (
    SpotlightCommercialBooking,
    SpotlightCommercialOpportunity,
    SpotlightCommercialPresentationAttribution,
    SpotlightCommercialRemedy,
    SpotlightCommercialServiceCreditApplication,
    SpotlightCommercialServiceCreditObligation,
)
from app.services.advertising_revenue_service import (
    spotlight_commercial_settlement_readiness,
)
from app.services.pipeline_credit_commerce_service import (
    PipelineCreditCommerceError,
    issue_service_quote,
    set_commercial_control,
    set_pricing_policy,
    set_service_price,
    spend_service_quote,
)
from app.services.pipeline_credit_service import ACCOUNT_PURPOSE_CUSTOMER, allocate_pipeline_credits, pipeline_credit_balance
from app.services.spotlight_commercial_service import (
    acknowledge_supplied_presentation,
    apply_remedy,
    bind_commercial_presentation_lease,
    booking_report,
    commercial_frequency_policy,
    reconcile_booking,
    reconcile_due_bookings,
    record_commercial_qualifying_impression,
    record_capacity_evidence,
)
from app.services.spotlight_presentation_service import (
    record_spotlight_presentation_qualification,
    record_spotlight_presentation_supply,
    select_spotlight_presentation,
)


def _seed() -> None:
    with engine.begin() as conn:
        for user_id, role in (
            (1, "admin"),
            (2, "user"),
            (3, "user"),
            (4, "user"),
            (5, "user"),
            (6, "user"),
            (7, "user"),
        ):
            conn.execute(
                text("INSERT INTO users (id, email, hashed_password, role, gmfn_id) VALUES (:id, :email, 'hashed', :role, :gmfn)"),
                {"id": user_id, "email": f"slice3-{user_id}@example.com", "role": role, "gmfn": f"GSN-S3-{user_id}"},
            )
        conn.execute(text("INSERT INTO clans (id, name, marketplace_name, invite_code, status) VALUES (1, 'Slice 3', 'Slice 3 Market', 'S3-C1', 'active')"))
        conn.execute(text("INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance) VALUES (1, 1, 1, 'admin', 0), (2, 1, 2, 'member', 0), (3, 1, 3, 'member', 0)"))


def _campaign(db, *, owner_user_id: int = 1, fingerprint: str = "slice3-advert") -> tuple[SpotlightCampaign, MarketplaceBroadcast]:
    campaign = SpotlightCampaign(
        owner_user_id=owner_user_id,
        origin_clan_id=1,
        content_kind="broadcast_snapshot",
        content_fingerprint=fingerprint,
        status="active",
        serving_status="serving",
        source_kind="direct_broadcast",
        commercial_mode="pipeline_credit",
        distribution_scope="direct_communities",
        opportunity_intent="offer",
        opportunity_category="product",
        opportunity_geo_scope="community",
        opportunity_availability="available",
        created_at=datetime(2027, 1, 1, tzinfo=timezone.utc),
        activated_at=datetime(2027, 1, 1, tzinfo=timezone.utc),
        expires_at=datetime(2028, 1, 1, tzinfo=timezone.utc),
        authorized_expires_at=datetime(2028, 1, 1, tzinfo=timezone.utc),
    )
    db.add(campaign)
    db.flush()
    broadcast = MarketplaceBroadcast(
        publication_key=f"slice3-{fingerprint}",
        serving_status="serving",
        content_version=1,
        spotlight_campaign_id=int(campaign.id),
        clan_id=1,
        author_user_id=owner_user_id,
        message="Slice 3 paid advert",
        priority_mode="paid",
        visibility_scope="direct_communities",
        expires_at=datetime(2028, 1, 1, tzinfo=timezone.utc),
        authorized_expires_at=datetime(2028, 1, 1, tzinfo=timezone.utc),
    )
    db.add(broadcast)
    db.commit()
    return campaign, broadcast


def _configure_and_fund(db) -> None:
    set_pricing_policy(
        db,
        region_code="global",
        currency="GBP",
        credits_per_currency_unit="2.0000",
        actor_user_id=1,
    )
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
    set_commercial_control(
        db,
        lifecycle_status="enforced",
        decision_note="Slice 3 controlled test",
        actor_user_id=1,
    )
    allocate_pipeline_credits(
        db,
        owner_type="user",
        owner_user_id=1,
        account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
        pricing_region="global",
        currency="PC",
        amount="10.00",
        workflow_key="test.slice3.funding",
        idempotency_key="test-slice3-funding",
        created_by_user_id=1,
    )


def _capacity(db, *, service_date: str, region: str = "GB-SCT", timezone_name: str = "Europe/London", observed: int = 100) -> None:
    record_capacity_evidence(
        db,
        clan_id=1,
        region_code=region,
        timezone_name=timezone_name,
        service_date=service_date,
        observed_supplied_opportunities={"morning": observed, "afternoon": observed, "evening": observed},
        safety_factor_bps=10000,
        evidence_source="controlled-serving-records-v1",
        evidence={"fixture": True, "simultaneous_activity_included": True},
        actor_user_id=1,
    )


def _book(db, *, campaign_id: int, service_date: str, key: str):
    quote = issue_service_quote(
        db,
        actor_user_id=1,
        service_code="paid_spotlight.day",
        quantity=1,
        region_code="global",
        context={
            "campaign_id": campaign_id,
            "clan_id": 1,
            "funding_classification": "merchant_paid",
            "region_code": "GB-SCT",
            "timezone": "Europe/London",
            "service_date": service_date,
            "booking_key": key,
        },
        idempotency_key=f"quote-{key}",
    )
    order = spend_service_quote(db, actor_user_id=1, quote_key=quote.quote_key, idempotency_key=f"spend-{key}")
    return quote, order, db.get(SpotlightCommercialBooking, int(order.delivery_reference_id))


def _supply(db, *, booking: SpotlightCommercialBooking, broadcast: MarketplaceBroadcast, count: int) -> list[str]:
    opportunities = (
        db.query(SpotlightCommercialOpportunity)
        .filter(SpotlightCommercialOpportunity.booking_id == int(booking.id))
        .order_by(SpotlightCommercialOpportunity.sequence_number.asc())
        .limit(count)
        .all()
    )
    presentation_ids: list[str] = []
    for index, opportunity in enumerate(opportunities, start=1):
        supplied_at = opportunity.scheduled_at
        presentation_id = f"slice3-presentation-{booking.id}-{index}"
        lease = SpotlightPresentationLease(
            presentation_id=presentation_id,
            issuance_key=f"slice3-issuance-{booking.id}-{index}",
            viewer_user_id=2,
            campaign_id=int(booking.campaign_id),
            placement_broadcast_id=int(broadcast.id),
            content_version=1,
            surface="public_shop_spotlight_rail",
            status="issued",
            issued_at=supplied_at - timedelta(seconds=2),
            lease_expires_at=supplied_at + timedelta(minutes=2),
        )
        db.add(lease)
        db.flush()
        binding = bind_commercial_presentation_lease(
            db,
            lease=lease,
            selected_at=supplied_at,
        )
        assert binding["attributed"] is True
        assert binding["opportunity_id"] == int(opportunity.id)
        result = acknowledge_supplied_presentation(db, lease=lease, supplied_at=supplied_at)
        assert result["recorded"] is True
        presentation_ids.append(presentation_id)
    return presentation_ids


def _bind_presentation(
    db,
    *,
    booking: SpotlightCommercialBooking,
    broadcast: MarketplaceBroadcast,
    viewer_user_id: int,
    presentation_id: str,
    selected_at: datetime,
) -> dict:
    lease = SpotlightPresentationLease(
        presentation_id=presentation_id,
        issuance_key=f"issuance-{presentation_id}",
        viewer_user_id=viewer_user_id,
        campaign_id=int(booking.campaign_id),
        placement_broadcast_id=int(broadcast.id),
        content_version=1,
        surface="public_shop_spotlight_rail",
        status="issued",
        issued_at=selected_at,
        lease_expires_at=selected_at + timedelta(minutes=2),
    )
    db.add(lease)
    db.flush()
    return bind_commercial_presentation_lease(
        db,
        lease=lease,
        selected_at=selected_at,
    )


def _attribute_impression(
    db,
    *,
    campaign: SpotlightCampaign,
    broadcast: MarketplaceBroadcast,
    presentation_id: str,
    viewer_user_id: int,
    event_at: datetime,
) -> None:
    event = SpotlightExposureEvent(
        presentation_id=presentation_id,
        event_type="qualifying_impression",
        viewer_user_id=viewer_user_id,
        campaign_id=int(campaign.id),
        event_at=event_at,
        allocation_route_type="direct_community",
        allocation_route_clan_id=1,
        placement_broadcast_id=int(broadcast.id),
        idempotency_key=f"qualifying-{presentation_id}",
        presentation_surface="public_shop_spotlight_rail",
    )
    db.add(event)
    db.flush()
    record_commercial_qualifying_impression(
        db,
        presentation_id=presentation_id,
        exposure_event_id=int(event.id),
        qualified_at=event_at,
    )


def test_slice3_paid_service_trace_shortfall_remedy_conflict_and_regions(monkeypatch) -> None:
    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_V1_ENABLED", "1")
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    _seed()
    with SessionLocal() as db:
        _configure_and_fund(db)
        campaign, broadcast = _campaign(db)
        _capacity(db, service_date="2027-03-28")
        _, order, fulfilled = _book(db, campaign_id=int(campaign.id), service_date="2027-03-28", key="fulfilled-slice3")
        assert order.delivery_reference_type == "spotlight_commercial_booking"
        assert pipeline_credit_balance(db, account_id=int(order.account_id)) == Decimal("9.00")
        fulfilled_presentations = _supply(
            db,
            booking=fulfilled,
            broadcast=broadcast,
            count=30,
        )

        for index in range(5):
            event = SpotlightExposureEvent(
                presentation_id=fulfilled_presentations[index],
                event_type="qualifying_impression",
                viewer_user_id=2,
                campaign_id=int(campaign.id),
                event_at=datetime(2027, 3, 28, 12, index, tzinfo=timezone.utc),
                allocation_route_type="direct_community",
                allocation_route_clan_id=1,
                placement_broadcast_id=int(broadcast.id),
                idempotency_key=f"slice3-qualified-{index}",
                presentation_surface="public_shop_spotlight_rail",
            )
            db.add(event)
            db.flush()
            record_commercial_qualifying_impression(
                db,
                presentation_id=fulfilled_presentations[index],
                exposure_event_id=int(event.id),
                qualified_at=event.event_at,
            )
        db.commit()
        fifth_boundary = commercial_frequency_policy(
            db,
            campaign_id=int(campaign.id),
            viewer_user_id=2,
            at=datetime(2027, 3, 28, 12, 30, tzinfo=timezone.utc),
        )
        assert fifth_boundary["prior_qualifying_impressions"] == 5
        assert fifth_boundary["suppressed"] is True
        fulfilled = reconcile_booking(db, booking_id=int(fulfilled.id), now=datetime(2027, 3, 29, 0, 1, tzinfo=timezone.utc))
        assert fulfilled.status == "fulfilled"
        report = booking_report(db, booking_id=int(fulfilled.id))
        assert report["opportunities"] == {
            "purchased": 30,
            "reserved": 30,
            "scheduled": 30,
            "supplied": 30,
            "made_available": 30,
            "visible_presentations": 30,
            "missed": 0,
            "outstanding": 0,
        }
        assert report["measurement"]["qualifying_impressions"] == 5
        assert report["finance"]["cash_collected"] is None
        assert report["finance"]["earned_revenue"] is None
        assert report["finance"]["credits_acquired_total"] == "10.00"
        assert report["finance"]["credits_spent"] == "1.00"
        assert report["finance"]["credits_purchased_from_cash"] is None

        fulfilled_quote_key = db.execute(text("SELECT quote_key FROM pipeline_credit_service_quotes WHERE id = :id"), {"id": order.quote_id}).scalar_one()
        with SessionLocal() as fresh_db:
            replay = spend_service_quote(fresh_db, actor_user_id=1, quote_key=fulfilled_quote_key, idempotency_key="spend-fulfilled-slice3")
            assert int(replay.id) == int(order.id)
        assert db.query(SpotlightCommercialBooking).filter(SpotlightCommercialBooking.booking_key == "fulfilled-slice3").count() == 1

        _capacity(db, service_date="2027-03-29")
        _, short_order, shortfall = _book(db, campaign_id=int(campaign.id), service_date="2027-03-29", key="shortfall-slice3")
        _supply(db, booking=shortfall, broadcast=broadcast, count=29)
        reconciliation = reconcile_due_bookings(
            db,
            now=datetime(2027, 3, 30, 0, 1, tzinfo=timezone.utc),
        )
        assert int(shortfall.id) in reconciliation["reconciled"]
        shortfall = db.get(SpotlightCommercialBooking, int(shortfall.id))
        assert shortfall.status == "shortfall"
        remedy = db.query(SpotlightCommercialRemedy).filter(SpotlightCommercialRemedy.booking_id == int(shortfall.id)).one()
        before_remedy = pipeline_credit_balance(db, account_id=int(short_order.account_id))
        first_apply = apply_remedy(db, remedy_id=int(remedy.id), actor_user_id=1)
        second_apply = apply_remedy(db, remedy_id=int(remedy.id), actor_user_id=1)
        assert first_apply.status == second_apply.status == "applied"
        assert int(first_apply.ledger_entry_id) == int(second_apply.ledger_entry_id)
        assert pipeline_credit_balance(db, account_id=int(short_order.account_id)) == before_remedy + Decimal("1.00")

        _capacity(db, service_date="2027-03-30", observed=10)
        _book(db, campaign_id=int(campaign.id), service_date="2027-03-30", key="capacity-winner-slice3")
        competing_campaign, _ = _campaign(db, owner_user_id=3, fingerprint="slice3-competing-advert")
        balance_before_conflict = pipeline_credit_balance(db, account_id=int(order.account_id))
        conflict_quote = issue_service_quote(
            db,
            actor_user_id=1,
            service_code="paid_spotlight.day",
            quantity=1,
            region_code="global",
            context={"campaign_id": int(competing_campaign.id), "clan_id": 1, "funding_classification": "merchant_paid", "region_code": "GB-SCT", "timezone": "Europe/London", "service_date": "2027-03-30", "booking_key": "capacity-loser-slice3"},
            idempotency_key="quote-capacity-loser-slice3",
        )
        with SessionLocal() as competing_db, pytest.raises(PipelineCreditCommerceError) as conflict:
            spend_service_quote(competing_db, actor_user_id=1, quote_key=conflict_quote.quote_key, idempotency_key="spend-capacity-loser-slice3")
            competing_db.rollback()
        assert conflict.value.code in {"spotlight_capacity_unavailable", "spotlight_capacity_conflict"}
        db.rollback()
        assert pipeline_credit_balance(db, account_id=int(order.account_id)) == balance_before_conflict

        london = record_capacity_evidence(
            db, clan_id=1, region_code="GB-SCT", timezone_name="Europe/London", service_date="2027-10-31",
            observed_supplied_opportunities={"morning": 20, "afternoon": 20, "evening": 20}, safety_factor_bps=8000,
            evidence_source="dst-test-london", actor_user_id=1,
        )
        lagos = record_capacity_evidence(
            db, clan_id=1, region_code="NG", timezone_name="Africa/Lagos", service_date="2027-10-31",
            observed_supplied_opportunities={"morning": 20, "afternoon": 20, "evening": 20}, safety_factor_bps=8000,
            evidence_source="regional-test-lagos", actor_user_id=1,
        )
        assert london[0].window_starts_at != lagos[0].window_starts_at
        assert all(int(row.reservable_opportunities) == 16 for row in london + lagos)
        nigeria_quote = issue_service_quote(
            db,
            actor_user_id=1,
            service_code="paid_spotlight.day",
            quantity=1,
            region_code="global",
            context={"campaign_id": int(competing_campaign.id), "clan_id": 1, "funding_classification": "sponsor_funded", "region_code": "NG", "timezone": "Africa/Lagos", "service_date": "2027-10-31", "booking_key": "lagos-sponsored-slice3"},
            idempotency_key="quote-lagos-sponsored-slice3",
        )
        nigeria_order = spend_service_quote(db, actor_user_id=1, quote_key=nigeria_quote.quote_key, idempotency_key="spend-lagos-sponsored-slice3")
        nigeria_booking = db.get(SpotlightCommercialBooking, int(nigeria_order.delivery_reference_id))
        assert nigeria_booking.funding_classification == "sponsor_funded"
        assert nigeria_booking.region_code == "NG"
        assert nigeria_booking.timezone_name == "Africa/Lagos"
        assert nigeria_booking.service_starts_at != fulfilled.service_starts_at


def test_slice3a_reuses_current_turn_and_attributes_overlapping_bookings(monkeypatch) -> None:
    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_V1_ENABLED", "1")
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    _seed()
    with SessionLocal() as db:
        _configure_and_fund(db)
        campaign, broadcast = _campaign(db, fingerprint="slice3a-overlap")
        _capacity(db, service_date="2027-04-04")
        _, _, first_booking = _book(
            db,
            campaign_id=int(campaign.id),
            service_date="2027-04-04",
            key="slice3a-overlap-first",
        )
        _, _, second_booking = _book(
            db,
            campaign_id=int(campaign.id),
            service_date="2027-04-04",
            key="slice3a-overlap-second",
        )
        first_turn = (
            db.query(SpotlightCommercialOpportunity)
            .filter(
                SpotlightCommercialOpportunity.booking_id == int(first_booking.id)
            )
            .order_by(SpotlightCommercialOpportunity.sequence_number.asc())
            .first()
        )
        selected_at = first_turn.scheduled_at + timedelta(seconds=1)
        viewer_ids = (2, 3, 4, 5, 6, 7, 2)
        bindings = []
        for index, viewer_user_id in enumerate(viewer_ids, start=1):
            presentation_id = f"slice3a-overlap-presentation-{index}"
            binding = _bind_presentation(
                db,
                booking=first_booking,
                broadcast=broadcast,
                viewer_user_id=viewer_user_id,
                presentation_id=presentation_id,
                selected_at=selected_at,
            )
            assert binding["attributed"] is True
            bindings.append(binding)
            _attribute_impression(
                db,
                campaign=campaign,
                broadcast=broadcast,
                presentation_id=presentation_id,
                viewer_user_id=viewer_user_id,
                event_at=selected_at + timedelta(seconds=index),
            )
        db.commit()

        assert bindings[0]["booking_id"] == int(first_booking.id)
        assert bindings[1]["booking_id"] == int(second_booking.id)
        assert all(
            binding["booking_id"] == int(first_booking.id)
            for binding in bindings[2:]
        )
        status_counts = dict(
            db.query(
                SpotlightCommercialOpportunity.status,
                text("count(*)"),
            )
            .group_by(SpotlightCommercialOpportunity.status)
            .all()
        )
        assert status_counts["available"] == 2
        assert status_counts["reserved"] == 58

        first_report = booking_report(db, booking_id=int(first_booking.id))
        second_report = booking_report(db, booking_id=int(second_booking.id))
        assert first_report["measurement"]["qualifying_impressions"] == 6
        assert first_report["measurement"]["recognised_unique_viewers"] == 5
        assert second_report["measurement"]["qualifying_impressions"] == 1
        assert second_report["measurement"]["recognised_unique_viewers"] is None
        assert first_report["opportunities"]["made_available"] == 1
        assert second_report["opportunities"]["made_available"] == 1
        assert (
            db.query(SpotlightCommercialPresentationAttribution)
            .filter(
                SpotlightCommercialPresentationAttribution.booking_id
                == int(first_booking.id)
            )
            .count()
            == 6
        )


def test_slice3a_restored_credit_remains_service_obligation_until_fulfilled(monkeypatch) -> None:
    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_V1_ENABLED", "1")
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    _seed()
    with SessionLocal() as db:
        _configure_and_fund(db)
        campaign, broadcast = _campaign(db, fingerprint="slice3a-remedy")
        _capacity(db, service_date="2027-04-05")
        _, _, original = _book(
            db,
            campaign_id=int(campaign.id),
            service_date="2027-04-05",
            key="slice3a-remedy-original",
        )
        _supply(db, booking=original, broadcast=broadcast, count=29)
        reconcile_booking(
            db,
            booking_id=int(original.id),
            now=datetime(2027, 4, 6, 0, 1, tzinfo=timezone.utc),
        )
        remedy = (
            db.query(SpotlightCommercialRemedy)
            .filter(SpotlightCommercialRemedy.booking_id == int(original.id))
            .one()
        )
        apply_remedy(db, remedy_id=int(remedy.id), actor_user_id=1)
        obligation = (
            db.query(SpotlightCommercialServiceCreditObligation)
            .filter(
                SpotlightCommercialServiceCreditObligation.remedy_id
                == int(remedy.id)
            )
            .one()
        )
        assert obligation.status == "outstanding"
        assert obligation.remaining_credit_amount == Decimal("1.00")
        original_report = booking_report(db, booking_id=int(original.id))
        assert (
            original_report["finance"]["outstanding_service_liability"][
                "restored_credits_unbooked"
            ]
            == "1.00"
        )
        assert original_report["finance"]["settlement_readiness"][
            "service_obligation_open"
        ] is True

        _capacity(db, service_date="2027-04-06")
        _, _, replacement = _book(
            db,
            campaign_id=int(campaign.id),
            service_date="2027-04-06",
            key="slice3a-remedy-replacement",
        )
        application = (
            db.query(SpotlightCommercialServiceCreditApplication)
            .filter(
                SpotlightCommercialServiceCreditApplication.replacement_booking_id
                == int(replacement.id)
            )
            .one()
        )
        db.refresh(obligation)
        assert application.status == "active"
        assert obligation.status == "rebooked"
        assert obligation.remaining_credit_amount == Decimal("0.00")
        original_report = booking_report(db, booking_id=int(original.id))
        assert (
            original_report["finance"]["outstanding_service_liability"][
                "restored_credits_in_active_replacement"
            ]
            == "1.00"
        )

        _supply(db, booking=replacement, broadcast=broadcast, count=30)
        reconcile_booking(
            db,
            booking_id=int(replacement.id),
            now=datetime(2027, 4, 7, 0, 1, tzinfo=timezone.utc),
        )
        db.refresh(obligation)
        db.refresh(application)
        assert application.status == "fulfilled"
        assert obligation.status == "fulfilled"
        assert obligation.fulfilled_at is not None
        final_report = booking_report(db, booking_id=int(original.id))
        assert (
            final_report["finance"]["outstanding_service_liability"][
                "restored_credits_unbooked"
            ]
            == "0.00"
        )
        assert (
            final_report["finance"]["outstanding_service_liability"][
                "restored_credits_in_active_replacement"
            ]
            == "0.00"
        )
        assert final_report["finance"]["settlement_readiness"][
            "service_obligation_open"
        ] is False


def test_slice3a_actual_serving_path_reuses_turn_and_enforces_fifth_view(monkeypatch) -> None:
    monkeypatch.setenv("GSN_PAID_SPOTLIGHT_V1_ENABLED", "1")
    monkeypatch.setenv("GSN_PAYMENT_OPERATIONS_ENABLED", "1")
    monkeypatch.setenv("SECRET_KEY", "slice3a-serving-test-secret")
    _seed()
    with SessionLocal() as db:
        _configure_and_fund(db)
        campaign, _ = _campaign(db, fingerprint="slice3a-serving")
        _capacity(db, service_date="2027-04-07")
        _, _, booking = _book(
            db,
            campaign_id=int(campaign.id),
            service_date="2027-04-07",
            key="slice3a-serving-path",
        )
        first_turn = (
            db.query(SpotlightCommercialOpportunity)
            .filter(
                SpotlightCommercialOpportunity.booking_id == int(booking.id)
            )
            .order_by(SpotlightCommercialOpportunity.sequence_number.asc())
            .first()
        )
        base_time = first_turn.scheduled_at + timedelta(seconds=1)
        presentation_ids: list[str] = []
        for index in range(5):
            issued_at = base_time + timedelta(seconds=index * 3)
            selection = select_spotlight_presentation(
                db,
                viewer_user_id=2,
                candidate_campaign_ids=[int(campaign.id)],
                now=issued_at,
                issuance_key=f"slice3a-serving-issuance-{index}",
            )
            assert selection.selected is True
            presentation_ids.append(str(selection.presentation_id))
            supplied = record_spotlight_presentation_supply(
                db,
                viewer_user_id=2,
                presentation_token=str(selection.presentation_token),
                event_at=issued_at + timedelta(milliseconds=500),
                visible_ratio=1.0,
                document_visible=True,
            )
            assert supplied["recorded"] is True
            qualification = record_spotlight_presentation_qualification(
                db,
                viewer_user_id=2,
                presentation_token=str(selection.presentation_token),
                qualification_key=f"slice3a-serving-qualification-{index}",
                event_at=issued_at + timedelta(milliseconds=1500),
                visible_ms=1000,
                visible_ratio=1.0,
                document_visible=True,
            )
            assert qualification.accepted is True
            assert qualification.delivery_round_consumed is False

        sixth = select_spotlight_presentation(
            db,
            viewer_user_id=2,
            candidate_campaign_ids=[int(campaign.id)],
            now=base_time + timedelta(seconds=20),
            issuance_key="slice3a-serving-issuance-sixth",
        )
        assert sixth.selected is False
        assert int(campaign.id) in sixth.frequency_suppressed_campaign_ids
        report = booking_report(db, booking_id=int(booking.id))
        assert report["opportunities"]["made_available"] == 1
        assert report["opportunities"]["visible_presentations"] == 5
        assert report["measurement"]["qualifying_impressions"] == 5
        assert report["measurement"]["recognised_unique_viewers"] is None
        assert (
            db.query(SpotlightCommercialPresentationAttribution)
            .filter(
                SpotlightCommercialPresentationAttribution.presentation_id.in_(
                    presentation_ids
                )
            )
            .count()
            == 5
        )


@pytest.mark.parametrize(
    ("funding", "cash", "expected_status", "expected_revenue"),
    (
        ("merchant_paid", None, "unearned_cash_unconfirmed", None),
        ("sponsor_funded", "0.50", "earned_after_cash_and_delivery", "0.50"),
        ("gifted", None, "not_customer_revenue", "0.00"),
        ("waived", None, "not_customer_revenue", "0.00"),
        ("house", None, "not_customer_revenue", "0.00"),
    ),
)
def test_slice3a_settlement_readiness_preserves_funding_classification(
    funding,
    cash,
    expected_status,
    expected_revenue,
) -> None:
    settlement = spotlight_commercial_settlement_readiness(
        funding_classification=funding,
        booking_status="fulfilled",
        purchased_credits="1.00",
        supplied_opportunities=30,
        missed_opportunities=0,
        original_shortfall_outstanding=False,
        restored_service_credits_outstanding="0.00",
        cash_collected_amount=cash,
    )
    assert settlement["revenue_recognition_status"] == expected_status
    assert settlement["earned_revenue_amount"] == expected_revenue
    assert settlement["credit_restoration_is_cash_refund"] is False
    assert settlement["replacement_campaign_is_cash_refund"] is False
    assert settlement["company_overhead_included_as_direct_cost"] is False
