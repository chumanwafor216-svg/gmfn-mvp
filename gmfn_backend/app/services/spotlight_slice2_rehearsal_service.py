from __future__ import annotations

from collections import Counter
from datetime import datetime
from decimal import Decimal
import os
from typing import Any, Callable, Iterable
from zoneinfo import ZoneInfo

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import SpotlightExposureEvent
from app.services.pipeline_credit_service import (
    ACCOUNT_PURPOSE_CUSTOMER,
    allocate_pipeline_credits,
    debit_pipeline_credits,
)
from app.services.spotlight_exposure_ledger_service import (
    SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION,
)
from app.services.spotlight_pacing_state_service import (
    SPOTLIGHT_GSN_HOUSE_PILOT_MAX_DELIVERY_ROUNDS,
    consume_spotlight_delivery_round,
    get_or_create_spotlight_campaign_pacing_state,
)
from app.services.spotlight_delivery_pacing_service import SpotlightDeliveryWindowPolicy


REHEARSAL_WORKFLOW_KEY = "spotlight.slice2.rehearsal"


def _require_test_rehearsal() -> None:
    if str(os.getenv("PYTEST_RUNNING", "") or "").strip() != "1":
        raise RuntimeError("Spotlight Slice 2 stateful rehearsal is restricted to the test database.")


def debit_rehearsal_booking_credit(
    db: Session,
    *,
    account_id: int,
    actor_user_id: int,
    booking_key: str,
    funding_classification: str,
):
    _require_test_rehearsal()
    return debit_pipeline_credits(
        db,
        account_id=int(account_id),
        account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
        amount=Decimal("1.00"),
        workflow_key=REHEARSAL_WORKFLOW_KEY,
        idempotency_key=f"spotlight-slice2-rehearsal-booking:{booking_key}",
        reference_type="spotlight_rehearsal_booking",
        reference_id=booking_key,
        note="Isolated Spotlight Slice 2 rehearsal booking",
        created_by_user_id=int(actor_user_id),
        meta={"funding_classification": funding_classification, "simulation": True},
        commit=False,
    )


def restore_rehearsal_shortfall_credit(
    db: Session,
    *,
    owner_user_id: int,
    booking_key: str,
    actor_user_id: int,
    funding_classification: str,
):
    _require_test_rehearsal()
    return allocate_pipeline_credits(
        db,
        owner_type="user",
        owner_user_id=int(owner_user_id),
        account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
        pricing_region="global",
        currency="PC",
        amount=Decimal("1.00"),
        workflow_key=f"{REHEARSAL_WORKFLOW_KEY}.remedy",
        idempotency_key=f"spotlight-slice2-rehearsal-remedy:{booking_key}",
        reference_type="spotlight_rehearsal_remedy",
        reference_id=booking_key,
        note="Isolated shortfall remedy rehearsal",
        created_by_user_id=int(actor_user_id),
        meta={"funding_classification": funding_classification, "simulation": True},
        commit=False,
    )


def run_controlled_opportunity_supply(
    db: Session,
    *,
    campaign_id: int,
    requested_opportunities: int,
    clock: Callable[[int, Any], datetime],
    provider_accepts: Callable[[int], bool],
    delivery_window_policy: SpotlightDeliveryWindowPolicy | None = None,
) -> list[dict[str, Any]]:
    _require_test_rehearsal()
    snapshot = get_or_create_spotlight_campaign_pacing_state(
        db,
        campaign_id=int(campaign_id),
        default_max_delivery_rounds=max(
            int(requested_opportunities),
            SPOTLIGHT_GSN_HOUSE_PILOT_MAX_DELIVERY_ROUNDS,
        ),
        default_delivery_window_policy=delivery_window_policy,
    )
    outcomes: list[dict[str, Any]] = []
    for index in range(max(int(requested_opportunities), 0)):
        opportunity_at = clock(index, snapshot)
        if not provider_accepts(index):
            outcomes.append(
                {
                    "sequence": index + 1,
                    "opportunity_at": opportunity_at,
                    "supplied": False,
                    "reason": "controlled_provider_unavailable",
                }
            )
            continue
        result = consume_spotlight_delivery_round(
            db,
            campaign_id=int(campaign_id),
            now=opportunity_at,
            expected_version=snapshot.version,
            expected_consumed_rounds=snapshot.consumed_delivery_rounds,
        )
        outcomes.append(
            {
                "sequence": index + 1,
                "opportunity_at": opportunity_at,
                "supplied": bool(result.consumed),
                "reason": result.blocked_reason,
                "pacing_version": result.version_after,
            }
        )
        snapshot = get_or_create_spotlight_campaign_pacing_state(
            db,
            campaign_id=int(campaign_id),
        )
    db.flush()
    return outcomes


def derive_rehearsal_delivery_report(
    db: Session,
    *,
    campaign_id: int,
    purchased_by_daypart: dict[str, int],
    supply_outcomes: Iterable[dict[str, Any]],
    timezone_name: str,
    remedy_entry_id: int | None = None,
) -> dict[str, Any]:
    _require_test_rehearsal()
    timezone = ZoneInfo(timezone_name)
    supplied_by_daypart: Counter[str] = Counter()
    supplied_records = [row for row in supply_outcomes if bool(row.get("supplied"))]
    for row in supplied_records:
        supplied_by_daypart[_daypart(row["opportunity_at"].astimezone(timezone))] += 1
    purchased = {key: max(int(value), 0) for key, value in purchased_by_daypart.items()}
    supplied = {key: int(supplied_by_daypart.get(key, 0)) for key in purchased}
    missed = {key: max(purchased[key] - supplied[key], 0) for key in purchased}
    campaign_impressions = int(
        db.query(func.count(SpotlightExposureEvent.id))
        .filter(SpotlightExposureEvent.campaign_id == int(campaign_id))
        .filter(
            SpotlightExposureEvent.event_type
            == SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION
        )
        .scalar()
        or 0
    )
    recognised_reach = int(
        db.query(func.count(func.distinct(SpotlightExposureEvent.viewer_user_id)))
        .filter(SpotlightExposureEvent.campaign_id == int(campaign_id))
        .filter(
            SpotlightExposureEvent.event_type
            == SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION
        )
        .scalar()
        or 0
    )
    purchased_total = sum(purchased.values())
    supplied_total = sum(supplied.values())
    missed_total = sum(missed.values())
    return {
        "campaign_id": int(campaign_id),
        "purchased_opportunities": purchased_total,
        "purchased_by_daypart": purchased,
        "supplied_opportunities": supplied_total,
        "supplied_by_daypart": supplied,
        "missed_opportunities": missed_total,
        "missed_by_daypart": missed,
        "qualifying_impressions": campaign_impressions,
        "recognised_unique_reach": recognised_reach,
        "remedy": {
            "status": "applied" if remedy_entry_id is not None else "outstanding" if missed_total else "not_required",
            "ledger_entry_id": remedy_entry_id,
        },
        "reporting_equation_balanced": supplied_total + missed_total == purchased_total,
        "source": "canonical_pacing_and_exposure_records",
    }


def _daypart(value: datetime) -> str:
    if value.hour < 12:
        return "morning"
    if value.hour < 18:
        return "afternoon"
    return "evening"
