from __future__ import annotations

from collections import Counter
from datetime import date, datetime, time, timedelta
from decimal import Decimal
import os
from typing import Any, Iterable, Optional
from zoneinfo import ZoneInfo

from app.services.pipeline_credit_commerce_service import SERVICE_DEFINITIONS
from app.services.spotlight_exposure_ledger_service import (
    SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION,
)
from app.services.spotlight_lifecycle_service import (
    SPOTLIGHT_CORRECTION_HOLD,
    SPOTLIGHT_SERVING,
    SPOTLIGHT_WITHDRAWN,
)


SPOTLIGHT_SLICE2_SIMULATION_ENV = "GSN_SPOTLIGHT_SLICE2_SIMULATION_V1_ENABLED"
SPOTLIGHT_SLICE2_PROTOCOL_VERSION = "1.3"
SPOTLIGHT_SLICE2_PARAMETER_VERSION = "spotlight-slice2-sim-v1"
SPOTLIGHT_SERVICE_CODE = "paid_spotlight.day"
PIPELINE_CREDIT_GBP_PRICE = Decimal("0.50")
OPPORTUNITIES_PER_CREDIT = 30
OPPORTUNITIES_PER_DAYPART = 10
RECOGNISED_VIEWER_DAILY_CAP = 5
SIMULATION_ALLOCATION_CAPACITY_PER_COMMUNITY_DAYPART = 300
SIMULATION_TIMEZONE = "Europe/London"
SIMULATION_REGION = "GB-SCT"

DAYPARTS = (
    ("morning", time(5, 0), time(12, 0)),
    ("afternoon", time(12, 0), time(18, 0)),
    ("evening", time(18, 0), time(0, 0)),
)

INACTIVE_WINDOWS = (
    ("overnight", time(0, 0), time(5, 0)),
)

FUNDING_CLASSIFICATIONS = frozenset({"paid", "sponsored", "gifted", "waived", "house"})


class SpotlightSlice2SimulationError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def spotlight_slice2_simulation_enabled() -> bool:
    return str(os.getenv(SPOTLIGHT_SLICE2_SIMULATION_ENV, "") or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def simulation_settings() -> dict[str, Any]:
    service = SERVICE_DEFINITIONS[SPOTLIGHT_SERVICE_CODE]
    return {
        "protocol_version": SPOTLIGHT_SLICE2_PROTOCOL_VERSION,
        "parameter_version": SPOTLIGHT_SLICE2_PARAMETER_VERSION,
        "mode": "isolated_simulation",
        "live_customer_promise": False,
        "service_code": SPOTLIGHT_SERVICE_CODE,
        "canonical_service_catalogued": True,
        "canonical_live_delivery_connected": bool(service.get("connected")),
        "pipeline_credit_price_gbp": f"{PIPELINE_CREDIT_GBP_PRICE:.2f}",
        "opportunities_per_credit": OPPORTUNITIES_PER_CREDIT,
        "daypart_allocation_per_credit": {
            "morning": OPPORTUNITIES_PER_DAYPART,
            "afternoon": OPPORTUNITIES_PER_DAYPART,
            "evening": OPPORTUNITIES_PER_DAYPART,
        },
        "audience_scope": "one_named_authorised_community_rotation_per_basic_allocation",
        "audience_target_or_ceiling": None,
        "region": SIMULATION_REGION,
        "timezone": SIMULATION_TIMEZONE,
        "dayparts": [
            {
                "code": code,
                "starts_at": start.strftime("%H:%M"),
                "ends_at": end.strftime("%H:%M"),
            }
            for code, start, end in DAYPARTS
        ],
        "inactive_windows": [
            {
                "code": code,
                "starts_at": start.strftime("%H:%M"),
                "ends_at": end.strftime("%H:%M"),
                "allocated_opportunities": 0,
                "policy": "no_active_allocation_policy",
            }
            for code, start, end in INACTIVE_WINDOWS
        ],
        "late_booking_policy": "next_complete_service_day",
        "recognised_viewer_same_advert_daily_cap": RECOGNISED_VIEWER_DAILY_CAP,
        "sixth_automatic_presentation": "suppressed",
        "demand_box_frequency_override": "does_not_override_daily_cap",
        "remedy_test_policy": "restore_affected_one_credit_package_once_for_gsn_caused_shortfall",
        "capacity_parameter": {
            "basic_allocations_per_community_daypart": SIMULATION_ALLOCATION_CAPACITY_PER_COMMUNITY_DAYPART,
            "status": "simulation_parameter_not_live_limit",
        },
    }


def preview_programmes(
    programmes: Iterable[dict[str, Any]],
    *,
    existing_reservations: Optional[dict[str, int]] = None,
) -> dict[str, Any]:
    reservation_state = {
        str(key): max(int(value or 0), 0)
        for key, value in dict(existing_reservations or {}).items()
    }
    previews: list[dict[str, Any]] = []
    for index, raw in enumerate(programmes):
        previews.append(
            _preview_programme(
                raw,
                index=index,
                reservation_state=reservation_state,
            )
        )
    return {
        "ok": True,
        "simulation": True,
        "settings": simulation_settings(),
        "programmes": previews,
        "batch_summary": {
            "programme_count": len(previews),
            "booking_count": len(previews),
            "total_credits": sum(int(item["quote"]["credits"]) for item in previews),
            "total_entitlement": sum(
                int(item["entitlement"]["total_opportunities"]) for item in previews
            ),
            "conflict_count": sum(1 for item in previews if item["capacity"]["has_conflict"]),
            "selection_does_not_multiply_entitlement": True,
        },
    }


def _preview_programme(
    raw: dict[str, Any],
    *,
    index: int,
    reservation_state: dict[str, int],
) -> dict[str, Any]:
    plan_id = _clean(raw.get("plan_id")) or f"programme-{index + 1}"
    advert_id = _clean(raw.get("advert_id"))
    if not advert_id:
        raise SpotlightSlice2SimulationError("advert_required", "Each programme needs one advert identity.")
    media_ids = _unique_text(raw.get("media_ids") or [advert_id])
    if not media_ids:
        media_ids = [advert_id]
    community_ids = _unique_positive_ints(raw.get("community_ids") or [])
    if not community_ids:
        raise SpotlightSlice2SimulationError(
            "authorised_community_required",
            "Each programme needs at least one authorised community.",
        )
    credits = max(int(raw.get("credits") or 0), 0)
    if credits <= 0:
        raise SpotlightSlice2SimulationError("credits_required", "Credits must be at least one.")
    funding = _clean(raw.get("funding_classification")).lower()
    if funding not in FUNDING_CLASSIFICATIONS:
        raise SpotlightSlice2SimulationError(
            "funding_classification_required",
            "Funding must be paid, sponsored, gifted, waived or house.",
        )
    service_date = _service_date(raw.get("service_date"))
    timezone_name = _clean(raw.get("timezone")) or SIMULATION_TIMEZONE
    region = _clean(raw.get("region")) or SIMULATION_REGION
    timezone = _timezone(timezone_name)

    total_entitlement = credits * OPPORTUNITIES_PER_CREDIT
    daypart_entitlement = {
        code: credits * OPPORTUNITIES_PER_DAYPART for code, _, _ in DAYPARTS
    }
    scope_conflict = len(community_ids) > credits
    daypart_capacity: dict[str, dict[str, Any]] = {}
    capacity_conflict = False
    if not scope_conflict:
        for daypart, _, _ in DAYPARTS:
            required_by_community = Counter(
                community_ids[credit_index % len(community_ids)]
                for credit_index in range(credits)
            )
            rows: list[dict[str, Any]] = []
            for community_id, required in sorted(required_by_community.items()):
                key = _capacity_key(service_date, timezone_name, community_id, daypart)
                already_reserved = reservation_state.get(key, 0)
                available_before = max(
                    SIMULATION_ALLOCATION_CAPACITY_PER_COMMUNITY_DAYPART - already_reserved,
                    0,
                )
                accepted = required <= available_before
                capacity_conflict = capacity_conflict or not accepted
                if accepted:
                    reservation_state[key] = already_reserved + required
                rows.append(
                    {
                        "community_id": community_id,
                        "required_basic_allocations": required,
                        "available_before": available_before,
                        "reserved_after": reservation_state.get(key, already_reserved),
                        "accepted": accepted,
                    }
                )
            daypart_capacity[daypart] = {
                "required_opportunities": daypart_entitlement[daypart],
                "community_reservations": rows,
                "accepted": all(row["accepted"] for row in rows),
            }

    conflicts: list[dict[str, str]] = []
    if scope_conflict:
        conflicts.append(
            {
                "code": "audience_scope_exceeds_basic_allocations",
                "message": (
                    "The v1.3 test setting allows one named community rotation per credit. "
                    "Select fewer communities or explicitly add credits; communities do not multiply entitlement."
                ),
            }
        )
    if capacity_conflict:
        conflicts.append(
            {
                "code": "daypart_capacity_unavailable",
                "message": "At least one simulated daypart cannot reserve the requested basic allocations.",
            }
        )

    schedule = {
        "service_date": service_date.isoformat(),
        "timezone": timezone_name,
        "region": region,
        "starts_at": datetime.combine(service_date, time(5, 0), tzinfo=timezone).isoformat(),
        "expires_at": datetime.combine(
            service_date + timedelta(days=1), time(0, 0), tzinfo=timezone
        ).isoformat(),
        "dayparts": [
            {
                "code": code,
                "starts_at": datetime.combine(service_date, start, tzinfo=timezone).isoformat(),
                "ends_at": datetime.combine(
                    service_date + (timedelta(days=1) if code == "evening" else timedelta()),
                    end,
                    tzinfo=timezone,
                ).isoformat(),
                "allocated_opportunities": daypart_entitlement[code],
            }
            for code, start, end in DAYPARTS
        ],
        "inactive_windows": [
            {
                "code": code,
                "starts_at": datetime.combine(service_date, start, tzinfo=timezone).isoformat(),
                "ends_at": datetime.combine(service_date, end, tzinfo=timezone).isoformat(),
                "allocated_opportunities": 0,
                "policy": "no_active_allocation_policy",
            }
            for code, start, end in INACTIVE_WINDOWS
        ],
        "authoritative_timezone_source": "programme_booking",
        "browser_timezone_authoritative": False,
    }
    per_media = _allocate_media_outcomes(media_ids, daypart_entitlement)
    quote_amount = PIPELINE_CREDIT_GBP_PRICE * credits
    booking_id = f"sim-booking-{plan_id}"
    return {
        "plan_id": plan_id,
        "booking_id": booking_id,
        "programme_type": _programme_type(funding),
        "advert": {
            "advert_id": advert_id,
            "media_ids": media_ids,
            "selected_media_count": len(media_ids),
            "one_advert_identity": True,
        },
        "authorised_audience": {
            "community_ids": community_ids,
            "selected_community_count": len(community_ids),
            "fixed_person_target": None,
            "fixed_person_ceiling": None,
        },
        "quote": {
            "quote_id": f"sim-quote-{plan_id}",
            "service_code": SPOTLIGHT_SERVICE_CODE,
            "protocol_version": SPOTLIGHT_SLICE2_PROTOCOL_VERSION,
            "credits": credits,
            "unit_price_gbp": f"{PIPELINE_CREDIT_GBP_PRICE:.2f}",
            "quoted_amount_gbp": f"{quote_amount:.2f}",
            "funding_classification": funding,
            "collection_status": "simulated_not_collected",
            "live_pipeline_credit_debit": "0.00",
            "simulated_pipeline_credit_commitment": f"{Decimal(credits):.2f}",
        },
        "entitlement": {
            "total_opportunities": total_entitlement,
            "by_daypart": daypart_entitlement,
            "selection_does_not_multiply_entitlement": True,
            "per_media_outcomes": per_media,
        },
        "schedule": schedule,
        "capacity": {
            "status": "conflict" if conflicts else "reserved_in_simulation",
            "has_conflict": bool(conflicts),
            "by_daypart": daypart_capacity,
            "conflicts": conflicts,
            "live_capacity_changed": False,
            "unknown_capacity_is_unlimited": False,
        },
        "lifecycle": {
            "state": "scheduled" if not conflicts else "planning_conflict",
            "reversible_pause_authority": SPOTLIGHT_CORRECTION_HOLD,
            "serving_authority": SPOTLIGHT_SERVING,
            "permanent_stop_authority": SPOTLIGHT_WITHDRAWN,
            "pause_is_permanent_stop": False,
            "general_pause_resume_available": False,
            "correction_hold_is_general_pause": False,
        },
        "simulation_boundary": {
            "booking_persisted_live": False,
            "campaign_activated_live": False,
            "payment_collected": False,
            "credit_spent": False,
            "customer_promise_created": False,
        },
    }


def simulation_programme_board() -> dict[str, Any]:
    service_date = datetime.now(ZoneInfo(SIMULATION_TIMEZONE)).date() + timedelta(days=1)
    plans = [
        {
            "plan_id": "merchant-fulfilled",
            "advert_id": "offer-merchant-001",
            "media_ids": ["media-merchant-front", "media-merchant-detail"],
            "community_ids": [101],
            "credits": 1,
            "funding_classification": "paid",
            "service_date": service_date.isoformat(),
            "timezone": SIMULATION_TIMEZONE,
            "region": SIMULATION_REGION,
        },
        {
            "plan_id": "sponsor-shortfall",
            "advert_id": "offer-sponsor-001",
            "media_ids": ["media-sponsor-primary"],
            "community_ids": [102],
            "credits": 1,
            "funding_classification": "sponsored",
            "service_date": service_date.isoformat(),
            "timezone": SIMULATION_TIMEZONE,
            "region": SIMULATION_REGION,
        },
        {
            "plan_id": "house-recovered-batch",
            "advert_id": "offer-house-001",
            "media_ids": ["media-house-a", "media-house-b", "media-house-c"],
            "community_ids": [103],
            "credits": 1,
            "funding_classification": "house",
            "service_date": service_date.isoformat(),
            "timezone": SIMULATION_TIMEZONE,
            "region": SIMULATION_REGION,
        },
    ]
    preview = preview_programmes(plans)
    programmes = preview["programmes"]
    programmes[0]["actual_delivery"] = _delivery_report(
        programme=programmes[0],
        supplied={"morning": 10, "afternoon": 10, "evening": 10},
        considered=47,
        viewer_impressions={
            "viewer-01": 5,
            "viewer-02": 2,
            "viewer-03": 2,
            "viewer-04": 1,
            "viewer-05": 1,
            "viewer-06": 1,
            "viewer-07": 1,
            "viewer-08": 1,
            "viewer-09": 1,
            "viewer-10": 1,
            "viewer-11": 1,
            "viewer-12": 1,
        },
        shortfall_reason=None,
        apply_test_remedy=False,
    )
    programmes[1]["actual_delivery"] = _delivery_report(
        programme=programmes[1],
        supplied={"morning": 10, "afternoon": 9, "evening": 10},
        considered=44,
        viewer_impressions={
            "viewer-21": 5,
            "viewer-22": 2,
            "viewer-23": 2,
            "viewer-24": 1,
            "viewer-25": 1,
            "viewer-26": 1,
            "viewer-27": 1,
            "viewer-28": 1,
            "viewer-29": 1,
            "viewer-30": 1,
            "viewer-31": 1,
            "viewer-32": 1,
        },
        shortfall_reason="gsn_delivery_failure",
        apply_test_remedy=True,
    )
    programmes[2]["actual_delivery"] = {
        "state": "scheduled_after_recovery",
        "purchased_opportunities": 30,
        "supplied_opportunities": 0,
        "qualifying_impressions": 0,
        "recognised_unique_reach": 0,
        "note": "Recovered planning does not fabricate supplied delivery before the service day.",
    }
    recovery = simulate_interrupted_batch_recovery(
        ["batch-item-a", "batch-item-b", "batch-item-c"],
        interrupt_after=1,
    )
    frequency = simulate_daily_frequency(
        [
            {
                "viewer_id": "viewer-cap",
                "advert_id": "offer-merchant-001",
                "booking_id": "booking-original" if index < 3 else "booking-additional",
                "community_id": 101 if index % 2 == 0 else 201,
                "presented_at": datetime.combine(
                    service_date,
                    time(7 + index * 2, 0),
                    tzinfo=ZoneInfo(SIMULATION_TIMEZONE),
                ).isoformat(),
            }
            for index in range(6)
        ]
    )
    contract_change = simulate_contract_change_rejection(programmes[0], added_community_id=999)
    schedule_overview = _schedule_overview(programmes, service_date=service_date)
    return {
        **preview,
        "programme_board": {
            "default_view": "day",
            "available_views": ["day", "week", "accessible_list"],
            "accessible_list": programmes,
            "programme_count": len(programmes),
            "source_classifications": ["house", "paid", "sponsored"],
            "filters": {
                "service_dates": schedule_overview["service_dates"],
                "regions": schedule_overview["regions"],
                "timezones": schedule_overview["timezones"],
                "funding_classifications": schedule_overview["funding_classifications"],
                "programme_types": schedule_overview["programme_types"],
                "statuses": schedule_overview["statuses"],
            },
            "day_view": schedule_overview["day_view"],
            "week_overview": schedule_overview["week_overview"],
            "overnight_policy": "no_active_allocation_policy",
            "drag_and_drop_required": False,
            "drag_and_drop_can_publish_or_charge": False,
        },
        "fulfilled_booking": programmes[0],
        "shortfall_booking": programmes[1],
        "interrupted_batch_recovery": recovery,
        "frequency_continuity_proof": frequency,
        "contract_change_rejection_proof": contract_change,
        "authority_reuse": {
            "payment_reconciliation": "existing advertising settlement and payment-reconciliation authority; not invoked in simulation",
            "pipeline_credit": f"canonical {SPOTLIGHT_SERVICE_CODE} catalogue entry and quote/spend authority; live spend remains disconnected",
            "campaign": "existing SpotlightCampaign identity and source classifications",
            "permission": "existing community destination eligibility and owner controls",
            "pacing": "existing Spotlight pacing authority; v1.3 dayparts modelled without live mutation",
            "reporting": "existing qualifying-impression event meaning",
            "qualifying_event_type": SPOTLIGHT_EXPOSURE_EVENT_QUALIFYING_IMPRESSION,
        },
        "remaining_live_decisions": [
            "Approve the one-community-per-credit audience term or replace it with a priced multi-community term.",
            "Approve Europe/London and 05:00-12:00, 12:00-18:00, 18:00-00:00 as the first live service clock.",
            "Approve exact cash-refund, replacement-service and whole-credit restoration terms.",
            "Connect canonical paid_spotlight.day quote spending to one atomic campaign booking and capacity reservation.",
            "Replace the live campaign-lifetime 2+1 frequency rule with an authoritative same-advert, recognised-viewer, service-day rule before paid serving.",
            "Approve a live capacity limit and operational headroom; the simulation value is not saleable capacity.",
            "Define aggregate privacy suppression for advertiser reach and frequency reporting.",
        ],
}


def simulate_contract_change_rejection(
    programme: dict[str, Any],
    *,
    added_community_id: int,
) -> dict[str, Any]:
    original_communities = list(programme["authorised_audience"]["community_ids"])
    attempted_communities = _unique_positive_ints([*original_communities, added_community_id])
    credits = int(programme["quote"]["credits"])
    rejected = len(attempted_communities) > credits
    return {
        "change": "add_authorised_community",
        "status": "rejected" if rejected else "accepted_in_simulation",
        "reason_code": "audience_scope_exceeds_basic_allocations" if rejected else None,
        "original_community_ids": original_communities,
        "attempted_community_ids": attempted_communities,
        "credits_before": credits,
        "credits_after": credits,
        "entitlement_before": int(programme["entitlement"]["total_opportunities"]),
        "entitlement_after": int(programme["entitlement"]["total_opportunities"]),
        "quoted_amount_before_gbp": programme["quote"]["quoted_amount_gbp"],
        "quoted_amount_after_gbp": programme["quote"]["quoted_amount_gbp"],
        "live_booking_changed": False,
        "live_capacity_changed": False,
        "live_credit_changed": False,
    }


def _schedule_overview(
    programmes: list[dict[str, Any]],
    *,
    service_date: date,
) -> dict[str, Any]:
    service_dates = sorted({item["schedule"]["service_date"] for item in programmes})
    regions = sorted({item["schedule"]["region"] for item in programmes})
    timezones = sorted({item["schedule"]["timezone"] for item in programmes})
    funding = sorted({item["quote"]["funding_classification"] for item in programmes})
    programme_types = sorted({item["programme_type"] for item in programmes})
    statuses = sorted({item["lifecycle"]["state"] for item in programmes})
    day_rows: list[dict[str, Any]] = []
    for code, start, end in (*INACTIVE_WINDOWS, *DAYPARTS):
        active = code != "overnight"
        day_rows.append(
            {
                "code": code,
                "starts_at": start.strftime("%H:%M"),
                "ends_at": end.strftime("%H:%M"),
                "policy": "scheduled_allocation" if active else "no_active_allocation_policy",
                "programmes": [
                    {
                        "plan_id": item["plan_id"],
                        "allocated_opportunities": int(item["entitlement"]["by_daypart"].get(code, 0)),
                        "status": item["lifecycle"]["state"],
                        "capacity_status": item["capacity"]["status"],
                    }
                    for item in programmes
                ] if active else [],
            }
        )
    week_rows = []
    for offset in range(7):
        current = service_date + timedelta(days=offset)
        scheduled = [item for item in programmes if item["schedule"]["service_date"] == current.isoformat()]
        week_rows.append(
            {
                "service_date": current.isoformat(),
                "programme_count": len(scheduled),
                "planned_opportunities": sum(
                    int(item["entitlement"]["total_opportunities"]) for item in scheduled
                ),
                "plan_ids": [item["plan_id"] for item in scheduled],
            }
        )
    return {
        "service_dates": service_dates,
        "regions": regions,
        "timezones": timezones,
        "funding_classifications": funding,
        "programme_types": programme_types,
        "statuses": statuses,
        "day_view": {
            "service_date": service_date.isoformat(),
            "authoritative_timezone": SIMULATION_TIMEZONE,
            "rows": day_rows,
        },
        "week_overview": {
            "starts_on": service_date.isoformat(),
            "days": week_rows,
        },
    }


def _delivery_report(
    *,
    programme: dict[str, Any],
    supplied: dict[str, int],
    considered: int,
    viewer_impressions: dict[str, int],
    shortfall_reason: Optional[str],
    apply_test_remedy: bool,
) -> dict[str, Any]:
    purchased = dict(programme["entitlement"]["by_daypart"])
    safe_supplied = {code: max(int(supplied.get(code, 0)), 0) for code in purchased}
    missing = {code: max(int(purchased[code]) - safe_supplied[code], 0) for code in purchased}
    supplied_total = sum(safe_supplied.values())
    missing_total = sum(missing.values())
    impression_total = sum(max(int(value), 0) for value in viewer_impressions.values())
    over_limit = {
        viewer_id: count
        for viewer_id, count in viewer_impressions.items()
        if int(count) > RECOGNISED_VIEWER_DAILY_CAP
    }
    remedy = {
        "status": "not_required",
        "restored_pipeline_credits": "0.00",
        "execution_count": 0,
        "funding_classification": programme["quote"]["funding_classification"],
        "live_ledger_mutation": False,
    }
    if missing_total > 0:
        remedy = {
            "status": "simulated_applied" if apply_test_remedy else "outstanding",
            "policy": "whole_package_restore_once_for_gsn_caused_shortfall",
            "restored_pipeline_credits": "1.00" if apply_test_remedy else "0.00",
            "execution_count": 1 if apply_test_remedy else 0,
            "idempotency_key": f"sim-remedy-{programme['booking_id']}",
            "funding_classification": programme["quote"]["funding_classification"],
            "live_ledger_mutation": False,
            "cash_refund_status": "not_executed_requires_live_terms",
        }
    return {
        "state": "fulfilled" if missing_total == 0 else "shortfall_remedied_in_simulation",
        "purchased_opportunities": sum(purchased.values()),
        "purchased_by_daypart": purchased,
        "supplied_opportunities": supplied_total,
        "supplied_by_daypart": safe_supplied,
        "considered_by_selection_system": max(int(considered), 0),
        "considered_counts_as_supplied": False,
        "missed_opportunities": missing_total,
        "missed_by_daypart": missing,
        "shortfall_reason": shortfall_reason,
        "qualifying_impressions": impression_total,
        "recognised_unique_reach": len(viewer_impressions),
        "frequency_distribution": dict(sorted(Counter(viewer_impressions.values()).items())),
        "over_five_diagnostic_count": len(over_limit),
        "over_five_viewers_exposed": False,
        "remedy": remedy,
        "reporting_equation_balanced": supplied_total + missing_total == sum(purchased.values()),
    }


def simulate_daily_frequency(events: Iterable[dict[str, Any]]) -> dict[str, Any]:
    accepted_counts: Counter[tuple[str, str, str]] = Counter()
    outcomes: list[dict[str, Any]] = []
    for event in events:
        viewer_id = _clean(event.get("viewer_id"))
        advert_id = _clean(event.get("advert_id"))
        presented_at = _datetime(event.get("presented_at"))
        if not viewer_id or not advert_id or presented_at is None:
            raise SpotlightSlice2SimulationError(
                "frequency_event_invalid",
                "Frequency events need viewer_id, advert_id and presented_at.",
            )
        local_day = presented_at.astimezone(ZoneInfo(SIMULATION_TIMEZONE)).date().isoformat()
        key = (viewer_id, advert_id, local_day)
        prior = accepted_counts[key]
        accepted = prior < RECOGNISED_VIEWER_DAILY_CAP
        if accepted:
            accepted_counts[key] += 1
        outcomes.append(
            {
                "viewer_id": viewer_id,
                "advert_id": advert_id,
                "service_day": local_day,
                "booking_id": _clean(event.get("booking_id")) or None,
                "community_id": int(event.get("community_id") or 0) or None,
                "accepted": accepted,
                "qualifying_count_after": accepted_counts[key],
                "suppression_reason": None if accepted else "same_advert_recognised_viewer_daily_cap_reached",
            }
        )
    return {
        "cap": RECOGNISED_VIEWER_DAILY_CAP,
        "authoritative_timezone": SIMULATION_TIMEZONE,
        "accepted_count": sum(1 for item in outcomes if item["accepted"]),
        "suppressed_count": sum(1 for item in outcomes if not item["accepted"]),
        "booking_and_community_changes_reset_count": False,
        "outcomes": outcomes,
    }


def simulate_interrupted_batch_recovery(
    item_keys: Iterable[str],
    *,
    interrupt_after: int,
) -> dict[str, Any]:
    keys = _unique_text(item_keys)
    completed: dict[str, str] = {}
    first_attempt: list[dict[str, Any]] = []
    for key in keys[: max(int(interrupt_after), 0)]:
        booking_id = f"sim-batch-booking-{key}"
        completed[key] = booking_id
        first_attempt.append({"item_key": key, "booking_id": booking_id, "status": "completed"})
    resumed: list[dict[str, Any]] = []
    for key in keys:
        if key in completed:
            resumed.append(
                {
                    "item_key": key,
                    "booking_id": completed[key],
                    "status": "idempotent_replay",
                }
            )
            continue
        booking_id = f"sim-batch-booking-{key}"
        completed[key] = booking_id
        resumed.append({"item_key": key, "booking_id": booking_id, "status": "completed"})
    return {
        "batch_id": "sim-interrupted-batch-v1",
        "requested_item_count": len(keys),
        "first_attempt": first_attempt,
        "interruption_after": len(first_attempt),
        "resume": resumed,
        "final_unique_booking_count": len(set(completed.values())),
        "duplicate_booking_count": len(completed) - len(set(completed.values())),
        "recovered": len(completed) == len(keys),
        "entitlement_per_booking": OPPORTUNITIES_PER_CREDIT,
        "selection_did_not_multiply_existing_booking_entitlement": True,
    }


def _allocate_media_outcomes(
    media_ids: list[str],
    daypart_entitlement: dict[str, int],
) -> list[dict[str, Any]]:
    allocations = {
        media_id: {daypart: 0 for daypart in daypart_entitlement}
        for media_id in media_ids
    }
    for daypart, count in daypart_entitlement.items():
        for index in range(count):
            allocations[media_ids[index % len(media_ids)]][daypart] += 1
    return [
        {
            "media_id": media_id,
            "allocated_opportunities": sum(by_daypart.values()),
            "by_daypart": by_daypart,
        }
        for media_id, by_daypart in allocations.items()
    ]


def _service_date(value: Any) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    text = _clean(value)
    if not text:
        raise SpotlightSlice2SimulationError("service_date_required", "Service date is required.")
    try:
        return date.fromisoformat(text)
    except ValueError as exc:
        raise SpotlightSlice2SimulationError(
            "service_date_invalid",
            "Service date must use YYYY-MM-DD.",
        ) from exc


def _datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo is not None else value.replace(tzinfo=ZoneInfo("UTC"))
    text = _clean(value)
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise SpotlightSlice2SimulationError(
            "datetime_invalid",
            "Simulation event times must be ISO datetimes.",
        ) from exc
    return parsed if parsed.tzinfo is not None else parsed.replace(tzinfo=ZoneInfo("UTC"))


def _timezone(value: str) -> ZoneInfo:
    try:
        return ZoneInfo(value)
    except Exception as exc:
        raise SpotlightSlice2SimulationError(
            "timezone_invalid",
            "Use a valid IANA timezone such as Europe/London.",
        ) from exc


def _capacity_key(
    service_date: date,
    timezone_name: str,
    community_id: int,
    daypart: str,
) -> str:
    return f"{service_date.isoformat()}|{timezone_name}|{community_id}|{daypart}"


def _unique_text(values: Iterable[Any]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for value in values or []:
        text = _clean(value)
        if text and text not in seen:
            seen.add(text)
            out.append(text)
    return out


def _unique_positive_ints(values: Iterable[Any]) -> list[int]:
    out: list[int] = []
    seen: set[int] = set()
    for value in values or []:
        try:
            number = int(value)
        except (TypeError, ValueError):
            continue
        if number > 0 and number not in seen:
            seen.add(number)
            out.append(number)
    return out


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _programme_type(funding_classification: str) -> str:
    if funding_classification == "house":
        return "house_campaign"
    if funding_classification == "sponsored":
        return "sponsor_programme"
    return "merchant_purchase"
