from __future__ import annotations

from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from app.services.spotlight_slice2_simulation_service import (
    SPOTLIGHT_SLICE2_SIMULATION_ENV,
    preview_programmes,
    simulate_daily_frequency,
    simulation_programme_board,
)


def _service_date() -> str:
    return (date.today() + timedelta(days=1)).isoformat()


def test_preview_keeps_one_booking_entitlement_across_media_and_communities() -> None:
    preview = preview_programmes(
        [
            {
                "plan_id": "batch-one-booking",
                "advert_id": "offer-001",
                "media_ids": ["media-a", "media-b", "media-c"],
                "community_ids": [10, 20],
                "credits": 2,
                "funding_classification": "paid",
                "service_date": _service_date(),
                "timezone": "Europe/London",
                "region": "GB-SCT",
            }
        ]
    )

    programme = preview["programmes"][0]
    assert programme["quote"]["quoted_amount_gbp"] == "1.00"
    assert programme["entitlement"]["total_opportunities"] == 60
    assert programme["entitlement"]["by_daypart"] == {
        "morning": 20,
        "afternoon": 20,
        "evening": 20,
    }
    assert sum(
        item["allocated_opportunities"]
        for item in programme["entitlement"]["per_media_outcomes"]
    ) == 60
    assert programme["capacity"]["has_conflict"] is False
    assert preview["batch_summary"]["booking_count"] == 1
    assert preview["batch_summary"]["selection_does_not_multiply_entitlement"] is True


def test_daily_frequency_continues_across_bookings_and_communities() -> None:
    service_date = date.today() + timedelta(days=1)
    timezone = ZoneInfo("Europe/London")
    events = [
        {
            "viewer_id": "viewer-1",
            "advert_id": "advert-1",
            "booking_id": "booking-a" if index < 2 else "booking-b",
            "community_id": 10 if index % 2 == 0 else 20,
            "presented_at": datetime(
                service_date.year,
                service_date.month,
                service_date.day,
                7 + index,
                tzinfo=timezone,
            ).isoformat(),
        }
        for index in range(6)
    ]
    events.append(
        {
            "viewer_id": "viewer-1",
            "advert_id": "advert-1",
            "booking_id": "booking-c",
            "community_id": 30,
            "presented_at": datetime(
                (service_date + timedelta(days=1)).year,
                (service_date + timedelta(days=1)).month,
                (service_date + timedelta(days=1)).day,
                7,
                tzinfo=timezone,
            ).isoformat(),
        }
    )

    result = simulate_daily_frequency(events)

    assert result["accepted_count"] == 6
    assert result["suppressed_count"] == 1
    assert result["outcomes"][5]["accepted"] is False
    assert result["outcomes"][5]["qualifying_count_after"] == 5
    assert result["outcomes"][6]["accepted"] is True
    assert result["booking_and_community_changes_reset_count"] is False


def test_reference_board_reconciles_fulfilment_shortfall_and_recovery() -> None:
    board = simulation_programme_board()

    fulfilled = board["fulfilled_booking"]
    fulfilled_delivery = fulfilled["actual_delivery"]
    assert fulfilled["quote"]["funding_classification"] == "paid"
    assert fulfilled["quote"]["collection_status"] == "simulated_not_collected"
    assert fulfilled_delivery["purchased_opportunities"] == 30
    assert fulfilled_delivery["supplied_opportunities"] == 30
    assert fulfilled_delivery["qualifying_impressions"] == 18
    assert fulfilled_delivery["recognised_unique_reach"] == 12
    assert fulfilled_delivery["considered_counts_as_supplied"] is False
    assert fulfilled_delivery["reporting_equation_balanced"] is True

    shortfall = board["shortfall_booking"]
    shortfall_delivery = shortfall["actual_delivery"]
    assert shortfall["quote"]["funding_classification"] == "sponsored"
    assert shortfall_delivery["supplied_opportunities"] == 29
    assert shortfall_delivery["missed_by_daypart"]["afternoon"] == 1
    assert shortfall_delivery["remedy"]["restored_pipeline_credits"] == "1.00"
    assert shortfall_delivery["remedy"]["execution_count"] == 1
    assert shortfall_delivery["remedy"]["funding_classification"] == "sponsored"
    assert shortfall_delivery["remedy"]["live_ledger_mutation"] is False

    recovery = board["interrupted_batch_recovery"]
    assert recovery["interruption_after"] == 1
    assert recovery["final_unique_booking_count"] == 3
    assert recovery["duplicate_booking_count"] == 0
    assert recovery["recovered"] is True
    assert board["frequency_continuity_proof"]["accepted_count"] == 5
    assert board["frequency_continuity_proof"]["suppressed_count"] == 1
    assert board["settings"]["canonical_live_delivery_connected"] is False


def test_programme_board_route_is_admin_only_and_feature_gated(
    client,
    monkeypatch,
    override_current_user,
) -> None:
    monkeypatch.delenv(SPOTLIGHT_SLICE2_SIMULATION_ENV, raising=False)
    disabled = client.get("/marketplace/admin/gsn-house-campaigns/programme-board")
    assert disabled.status_code == 503
    assert disabled.json()["detail"]["code"] == "spotlight_slice2_simulation_disabled"

    monkeypatch.setenv(SPOTLIGHT_SLICE2_SIMULATION_ENV, "true")
    enabled = client.get("/marketplace/admin/gsn-house-campaigns/programme-board")
    assert enabled.status_code == 200, enabled.text
    assert enabled.json()["simulation"] is True
    assert enabled.json()["settings"]["protocol_version"] == "1.3"

    preview = client.post(
        "/marketplace/admin/gsn-house-campaigns/programme-board/preview",
        json={
            "programmes": [
                {
                    "plan_id": "scope-conflict",
                    "advert_id": "advert-1",
                    "media_ids": ["media-1", "media-2"],
                    "community_ids": [10, 20],
                    "credits": 1,
                    "funding_classification": "gifted",
                    "service_date": _service_date(),
                    "timezone": "Europe/London",
                    "region": "GB-SCT",
                }
            ]
        },
    )
    assert preview.status_code == 200, preview.text
    programme = preview.json()["programmes"][0]
    assert programme["entitlement"]["total_opportunities"] == 30
    assert programme["capacity"]["has_conflict"] is True
    assert programme["capacity"]["conflicts"][0]["code"] == (
        "audience_scope_exceeds_basic_allocations"
    )
