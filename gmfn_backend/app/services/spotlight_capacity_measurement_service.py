from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import MarketplaceBroadcast, SpotlightCampaign, SpotlightExposureEvent, SpotlightPresentationLease
from app.db.pipeline_credit_models import PipelineCreditServiceSpendOrder
from app.db.spotlight_commercial_models import SpotlightCommercialBooking, SpotlightCommercialOpportunity


DAYPARTS = {
    "morning": (time(5, 0), time(12, 0)),
    "afternoon": (time(12, 0), time(18, 0)),
    "evening": (time(18, 0), time(0, 0)),
}


class SpotlightCapacityMeasurementError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def _bounds(service_date: str, timezone_name: str) -> tuple[date, ZoneInfo, datetime, datetime]:
    try:
        service_day = date.fromisoformat(str(service_date or "").strip())
    except ValueError as exc:
        raise SpotlightCapacityMeasurementError("invalid_service_date", "service_date must be YYYY-MM-DD") from exc
    try:
        zone = ZoneInfo(str(timezone_name or "").strip())
    except ZoneInfoNotFoundError as exc:
        raise SpotlightCapacityMeasurementError("invalid_timezone", "timezone must be a valid IANA timezone") from exc
    starts_at = datetime.combine(service_day, time(0, 0), tzinfo=zone).astimezone(timezone.utc)
    ends_at = datetime.combine(service_day + timedelta(days=1), time(0, 0), tzinfo=zone).astimezone(timezone.utc)
    return service_day, zone, starts_at, ends_at


def _daypart(at: datetime, zone: ZoneInfo) -> str:
    local_time = (at.replace(tzinfo=timezone.utc) if at.tzinfo is None else at).astimezone(zone).time()
    if time(5, 0) <= local_time < time(12, 0):
        return "morning"
    if time(12, 0) <= local_time < time(18, 0):
        return "afternoon"
    return "evening"


def spotlight_capacity_measurement_report(
    db: Session,
    *,
    clan_id: int,
    service_date: str,
    timezone_name: str,
) -> dict[str, Any]:
    service_day, zone, starts_at, ends_at = _bounds(service_date, timezone_name)
    commitments_before = db.query(PipelineCreditServiceSpendOrder).filter(
        PipelineCreditServiceSpendOrder.service_code == "paid_spotlight.day"
    ).count()
    leases = (
        db.query(SpotlightPresentationLease)
        .join(MarketplaceBroadcast, MarketplaceBroadcast.id == SpotlightPresentationLease.placement_broadcast_id)
        .filter(MarketplaceBroadcast.clan_id == int(clan_id))
        .filter(SpotlightPresentationLease.issued_at >= starts_at)
        .filter(SpotlightPresentationLease.issued_at < ends_at)
        .order_by(SpotlightPresentationLease.issued_at.asc(), SpotlightPresentationLease.id.asc())
        .all()
    )
    presentation_ids = [str(row.presentation_id) for row in leases]
    events = (
        db.query(SpotlightExposureEvent)
        .filter(SpotlightExposureEvent.presentation_id.in_(presentation_ids))
        .filter(SpotlightExposureEvent.event_at >= starts_at)
        .filter(SpotlightExposureEvent.event_at < ends_at)
        .all()
        if presentation_ids
        else []
    )
    events_by_type: dict[str, list[SpotlightExposureEvent]] = {}
    for event in events:
        events_by_type.setdefault(str(event.event_type), []).append(event)
    dayparts: dict[str, dict[str, int]] = {
        code: {
            "final_presentations_issued": 0,
            "visible_presentations": 0,
            "qualifying_impressions": 0,
            "interrupted_or_unqualified": 0,
        }
        for code in DAYPARTS
    }
    for lease in leases:
        code = _daypart(lease.issued_at, zone)
        dayparts[code]["final_presentations_issued"] += 1
        if lease.qualified_at is None and str(lease.status or "").lower() != "qualified":
            dayparts[code]["interrupted_or_unqualified"] += 1
    for event in events_by_type.get("served", []):
        dayparts[_daypart(event.event_at, zone)]["visible_presentations"] += 1
    for event in events_by_type.get("qualifying_impression", []):
        dayparts[_daypart(event.event_at, zone)]["qualifying_impressions"] += 1
    active_campaigns = (
        db.query(func.count(func.distinct(SpotlightCampaign.id)))
        .join(MarketplaceBroadcast, MarketplaceBroadcast.spotlight_campaign_id == SpotlightCampaign.id)
        .filter(MarketplaceBroadcast.clan_id == int(clan_id))
        .filter(SpotlightCampaign.status == "active")
        .scalar()
        or 0
    )
    commercial_rows = (
        db.query(SpotlightCommercialBooking)
        .filter(SpotlightCommercialBooking.clan_id == int(clan_id))
        .filter(SpotlightCommercialBooking.service_date == service_day.isoformat())
        .filter(SpotlightCommercialBooking.status.in_(("reserved", "serving", "on_hold")))
        .all()
    )
    booking_ids = [int(row.id) for row in commercial_rows]
    paid_outstanding = (
        db.query(func.count(SpotlightCommercialOpportunity.id))
        .filter(SpotlightCommercialOpportunity.booking_id.in_(booking_ids))
        .filter(SpotlightCommercialOpportunity.status.in_(("reserved", "available")))
        .scalar()
        if booking_ids
        else 0
    )
    commitments_after = db.query(PipelineCreditServiceSpendOrder).filter(
        PipelineCreditServiceSpendOrder.service_code == "paid_spotlight.day"
    ).count()
    return {
        "measurement_version": "spotlight-capacity-observation.v1",
        "community_id": int(clan_id),
        "service_date": service_day.isoformat(),
        "timezone": str(timezone_name),
        "utc_window": {"starts_at": starts_at.isoformat(), "ends_at": ends_at.isoformat()},
        "observed": {
            "final_presentations_issued": len(leases),
            "recognised_viewers_with_final_presentations": len({int(row.viewer_user_id) for row in leases}),
            "visible_presentations": len(events_by_type.get("served", [])),
            "qualifying_impressions": len(events_by_type.get("qualifying_impression", [])),
            "interrupted_or_unqualified": sum(
                1 for row in leases if row.qualified_at is None and str(row.status or "").lower() != "qualified"
            ),
            "dayparts": dayparts,
        },
        "existing_promotional_obligations": {
            "active_campaigns": int(active_campaigns),
            "active_paid_bookings": len(commercial_rows),
            "paid_opportunities_not_yet_closed": int(paid_outstanding or 0),
        },
        "safety": {
            "paid_service_commitments_before": int(commitments_before),
            "paid_service_commitments_after": int(commitments_after),
            "created_paid_service_commitment": commitments_after != commitments_before,
            "selection_is_supplied_turn": False,
            "elapsed_time_is_supplied_turn": False,
            "repeated_presentations_are_distinct_scheduled_turns": False,
        },
        "limitations": (
            "Final presentations issued are observed viewer-triggered serving activity, not sellable capacity and not supplied paid turns. "
            "Use several representative days, failure rates, existing obligations, and a conservative safety factor before approving capacity."
        ),
    }