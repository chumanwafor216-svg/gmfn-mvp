from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
from zoneinfo import ZoneInfo

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.db.models import SpotlightCampaign
from app.services.pipeline_credit_service import (
    ACCOUNT_PURPOSE_CUSTOMER,
    allocate_pipeline_credits,
    get_pipeline_credit_account,
    pipeline_credit_balance,
)
from app.services.spotlight_exposure_diversity_allocation_service import (
    SpotlightDiversityAllocationResult,
)
from app.services.spotlight_exposure_ledger_service import (
    record_spotlight_qualifying_impression,
)
from app.services.spotlight_frequency_control_service import apply_spotlight_frequency_control
from app.services.spotlight_opportunity_candidate_service import (
    build_spotlight_opportunity_candidates,
)
from app.services.spotlight_slice2_rehearsal_service import (
    debit_rehearsal_booking_credit,
    derive_rehearsal_delivery_report,
    restore_rehearsal_shortfall_credit,
    run_controlled_opportunity_supply,
)
from app.services.spotlight_slice2_simulation_service import preview_programmes


BASE_TIME = datetime(2027, 4, 5, 5, 0, tzinfo=timezone.utc)


def _seed_people_and_community() -> None:
    with engine.begin() as conn:
        for user_id in range(1, 15):
            conn.execute(
                text(
                    "INSERT INTO users (id, email, hashed_password, role, gmfn_id, display_name) "
                    "VALUES (:id, :email, 'hashed', 'member', :gmfn_id, :name)"
                ),
                {
                    "id": user_id,
                    "email": f"slice2-{user_id}@example.com",
                    "gmfn_id": f"GSN-S2-{user_id:04d}",
                    "name": f"Slice 2 User {user_id}",
                },
            )
        conn.execute(
            text(
                "INSERT INTO clans (id, name, marketplace_name, community_code, status, invite_code, invite_uses, created_at) "
                "VALUES (1, 'Slice 2 Community', 'Slice 2 Market', 'GSN-S2-C1', 'active', 'S2-C1', 0, CURRENT_TIMESTAMP)"
            )
        )
        for membership_id, user_id in enumerate(range(1, 15), start=1):
            conn.execute(
                text(
                    "INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance) "
                    "VALUES (:id, 1, :user_id, 'member', 0)"
                ),
                {"id": membership_id, "user_id": user_id},
            )


def _campaign(db, *, owner_user_id: int, key: str) -> SpotlightCampaign:
    fingerprint = hashlib.sha256(key.encode("utf-8")).hexdigest()
    existing = db.query(SpotlightCampaign).filter(
        SpotlightCampaign.content_fingerprint == fingerprint
    ).one_or_none()
    if existing is not None:
        return existing
    campaign = SpotlightCampaign(
        owner_user_id=owner_user_id,
        origin_clan_id=1,
        content_kind="broadcast_snapshot",
        content_fingerprint=fingerprint,
        status="active",
        serving_status="serving",
        source_kind="slice2_rehearsal",
        commercial_mode="pipeline_credit",
        distribution_scope="direct_communities",
        opportunity_intent="offer",
        opportunity_category="business_service",
        opportunity_geo_scope="community",
        opportunity_availability="available",
        created_at=BASE_TIME,
        activated_at=BASE_TIME,
        expires_at=BASE_TIME + timedelta(hours=18, minutes=30),
        authorized_expires_at=BASE_TIME + timedelta(hours=18, minutes=30),
    )
    db.add(campaign)
    db.flush()
    return campaign


def _diversity(viewer_user_id: int, candidate):
    return SpotlightDiversityAllocationResult(
        viewer_user_id=viewer_user_id,
        candidates=(candidate,),
        warmup_active=False,
        warmup_complete=True,
        viewer_qualifying_impression_count=0,
        qualifying_history_count_used=0,
        configured_window_size=25,
        warmup_threshold=0,
        source_concentration_threshold=1.0,
        source_counts={},
        source_ratios={},
        candidate_order_before=(candidate.campaign_id,),
        candidate_order_after=(candidate.campaign_id,),
        candidate_allocations=(),
        diversity_pressure_applied=False,
    )


def _controlled_clock(index, snapshot):
    local_zone = ZoneInfo("UTC")
    daypart_index = index // 10
    daypart_start_hour = (5, 12, 18)[daypart_index]
    local_time = datetime(2027, 4, 5, daypart_start_hour, tzinfo=local_zone)
    interval_minutes = (38, 38, 35)[daypart_index]
    requested_time = local_time + timedelta(minutes=interval_minutes * (index % 10))
    next_eligible = snapshot.next_eligible_delivery_at
    if next_eligible is None:
        return requested_time
    return max(requested_time, next_eligible.astimezone(local_zone))


def test_stateful_spotlight_rehearsal_reconciles_workflow_records_across_fresh_sessions() -> None:
    _seed_people_and_community()
    with SessionLocal() as db:
        allocation = allocate_pipeline_credits(
            db,
            owner_type="user",
            owner_user_id=1,
            account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
            pricing_region="global",
            currency="PC",
            amount="10.00",
            workflow_key="spotlight.slice2.rehearsal.funding",
            idempotency_key="spotlight-slice2-rehearsal-funding",
            created_by_user_id=1,
        )
        account_id = int(allocation.account_id)
        fulfilled_campaign = _campaign(db, owner_user_id=1, key="fulfilled")
        shortfall_campaign = _campaign(db, owner_user_id=3, key="shortfall")
        debit_rehearsal_booking_credit(
            db,
            account_id=account_id,
            actor_user_id=1,
            booking_key="fulfilled",
            funding_classification="paid",
        )
        debit_rehearsal_booking_credit(
            db,
            account_id=account_id,
            actor_user_id=1,
            booking_key="shortfall",
            funding_classification="sponsored",
        )
        db.commit()
        fulfilled_id = int(fulfilled_campaign.id)
        shortfall_id = int(shortfall_campaign.id)

    failed_reservation = preview_programmes(
        [{
            "plan_id": "failed-reservation",
            "advert_id": "failed-reservation-advert",
            "community_ids": [1],
            "credits": 2,
            "funding_classification": "paid",
            "service_date": "2027-03-28",
            "timezone": "Europe/London",
            "region": "GB-SCT",
        }],
        existing_reservations={"2027-03-28|Europe/London|1|evening": 299},
    )["programmes"][0]
    assert failed_reservation["capacity"]["has_conflict"] is True

    with SessionLocal() as db:
        fulfilled_supply = run_controlled_opportunity_supply(
            db,
            campaign_id=fulfilled_id,
            requested_opportunities=30,
            clock=_controlled_clock,
            provider_accepts=lambda _index: True,
        )
        shortfall_supply = run_controlled_opportunity_supply(
            db,
            campaign_id=shortfall_id,
            requested_opportunities=30,
            clock=_controlled_clock,
            provider_accepts=lambda index: index != 15,
        )
        candidate = build_spotlight_opportunity_candidates(
            db,
            viewer_user_id=2,
            campaign_ids=[fulfilled_id],
            now=BASE_TIME + timedelta(hours=1),
        )[0]
        for index in range(4):
            record_spotlight_qualifying_impression(
                db,
                viewer_user_id=2,
                candidate=candidate,
                idempotency_key=f"slice2-frequency-{index + 1}",
                event_at=BASE_TIME + timedelta(hours=1, minutes=index),
            )
        fifth = apply_spotlight_frequency_control(
            db,
            viewer_user_id=2,
            diversity_result=_diversity(2, candidate),
            viewer_campaign_frequency_cap=5,
            demandbox_frequency_override_extra=0,
        )
        assert fifth.suppressed_campaign_ids == ()
        record_spotlight_qualifying_impression(
            db,
            viewer_user_id=2,
            candidate=candidate,
            idempotency_key="slice2-frequency-5",
            event_at=BASE_TIME + timedelta(hours=1, minutes=5),
        )
        sixth = apply_spotlight_frequency_control(
            db,
            viewer_user_id=2,
            diversity_result=_diversity(2, candidate),
            viewer_campaign_frequency_cap=5,
            demandbox_frequency_override_extra=0,
        )
        assert sixth.suppressed_campaign_ids == (fulfilled_id,)
        assert len([row for row in shortfall_supply if not row["supplied"]]) == 1, [
            row for row in shortfall_supply if not row["supplied"]
        ]

        outstanding = derive_rehearsal_delivery_report(
            db,
            campaign_id=shortfall_id,
            purchased_by_daypart={"morning": 10, "afternoon": 10, "evening": 10},
            supply_outcomes=shortfall_supply,
            timezone_name="UTC",
        )
        assert outstanding["supplied_by_daypart"] == {
            "morning": 10,
            "afternoon": 9,
            "evening": 10,
        }, outstanding["supplied_by_daypart"]
        assert outstanding["missed_opportunities"] == 1
        assert outstanding["remedy"]["status"] == "outstanding"
        remedy = restore_rehearsal_shortfall_credit(
            db,
            owner_user_id=1,
            booking_key="shortfall",
            actor_user_id=1,
            funding_classification="sponsored",
        )
        remedy_retry = restore_rehearsal_shortfall_credit(
            db,
            owner_user_id=1,
            booking_key="shortfall",
            actor_user_id=1,
            funding_classification="sponsored",
        )
        assert remedy_retry.id == remedy.id
        fulfilled_report = derive_rehearsal_delivery_report(
            db,
            campaign_id=fulfilled_id,
            purchased_by_daypart={"morning": 10, "afternoon": 10, "evening": 10},
            supply_outcomes=fulfilled_supply,
            timezone_name="UTC",
        )
        remedied_report = derive_rehearsal_delivery_report(
            db,
            campaign_id=shortfall_id,
            purchased_by_daypart={"morning": 10, "afternoon": 10, "evening": 10},
            supply_outcomes=shortfall_supply,
            timezone_name="UTC",
            remedy_entry_id=int(remedy.id),
        )
        assert fulfilled_report["supplied_opportunities"] == 30
        assert fulfilled_report["qualifying_impressions"] == 5
        assert fulfilled_report["reporting_equation_balanced"] is True
        assert remedied_report["supplied_opportunities"] == 29
        assert remedied_report["remedy"]["status"] == "applied"
        db.commit()

    with SessionLocal() as first_request:
        account = get_pipeline_credit_account(
            first_request,
            owner_type="user",
            owner_user_id=1,
            account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
        )
        first = debit_rehearsal_booking_credit(
            first_request,
            account_id=int(account.id),
            actor_user_id=1,
            booking_key="batch-a",
            funding_classification="house",
        )
        first_request.commit()
        first_id = int(first.id)

    with SessionLocal() as resumed_request:
        account = get_pipeline_credit_account(
            resumed_request,
            owner_type="user",
            owner_user_id=1,
            account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
        )
        replay = debit_rehearsal_booking_credit(
            resumed_request,
            account_id=int(account.id),
            actor_user_id=1,
            booking_key="batch-a",
            funding_classification="house",
        )
        second = debit_rehearsal_booking_credit(
            resumed_request,
            account_id=int(account.id),
            actor_user_id=1,
            booking_key="batch-b",
            funding_classification="house",
        )
        third = debit_rehearsal_booking_credit(
            resumed_request,
            account_id=int(account.id),
            actor_user_id=1,
            booking_key="batch-c",
            funding_classification="house",
        )
        resumed_request.commit()
        assert int(replay.id) == first_id
        assert len({int(replay.id), int(second.id), int(third.id)}) == 3
        assert pipeline_credit_balance(resumed_request, account_id=int(account.id)) == 6
