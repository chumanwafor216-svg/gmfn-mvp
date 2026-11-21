from __future__ import annotations

import json
import math
import os
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Any, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import (
    Clan,
    MarketplaceBroadcast,
    SpotlightCampaign,
    SpotlightExposureEvent,
    SpotlightPresentationLease,
    User,
)
from app.db.pipeline_credit_models import (
    PipelineCreditLedgerEntry,
    PipelineCreditPricingPolicy,
    PipelineCreditServiceQuote,
    PipelineCreditServiceSpendOrder,
)
from app.db.spotlight_commercial_models import (
    SpotlightCommercialAllocation,
    SpotlightCommercialAuditEvent,
    SpotlightCommercialBooking,
    SpotlightCommercialCapacityWindow,
    SpotlightCommercialOpportunity,
    SpotlightCommercialPresentationAttribution,
    SpotlightCommercialRemedy,
    SpotlightCommercialServiceCreditApplication,
    SpotlightCommercialServiceCreditObligation,
)
from app.services.advertising_revenue_service import (
    spotlight_commercial_settlement_readiness,
)
from app.services.pipeline_credit_service import ACCOUNT_PURPOSE_CUSTOMER, allocate_pipeline_credits


SERVICE_CODE = "paid_spotlight.day"
OPPORTUNITIES_PER_CREDIT = 30
DAYPART_ALLOCATION_PER_CREDIT = 10
VIEWER_DAILY_ADVERT_CAP = 5
PRIVACY_REACH_THRESHOLD = 5
FUNDING_CLASSIFICATIONS = frozenset({"merchant_paid", "sponsor_funded", "gifted", "waived", "house"})
ACTIVE_BOOKING_STATUSES = frozenset({"reserved", "serving", "on_hold"})
SUPPLY_BOOKING_STATUSES = frozenset({"reserved", "serving"})
DEFAULT_DAYPARTS = {
    "morning": (time(5, 0), time(12, 0)),
    "afternoon": (time(12, 0), time(18, 0)),
    "evening": (time(18, 0), time(0, 0)),
}


class SpotlightCommercialError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def spotlight_commercial_enabled() -> bool:
    return str(os.getenv("GSN_PAID_SPOTLIGHT_V1_ENABLED", "0") or "0").strip().lower() in {
        "1", "true", "yes", "on"
    }


def require_spotlight_commercial_enabled() -> None:
    if not spotlight_commercial_enabled():
        raise SpotlightCommercialError(
            "paid_spotlight_disabled",
            "The production-capable Paid Spotlight workflow is installed but disabled.",
        )


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)


def _json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def _parse_service_date(value: Any) -> date:
    try:
        return date.fromisoformat(str(value or "").strip())
    except ValueError as exc:
        raise SpotlightCommercialError("invalid_service_date", "service_date must be YYYY-MM-DD") from exc


def _zone(value: Any) -> ZoneInfo:
    name = str(value or "").strip()
    try:
        return ZoneInfo(name)
    except ZoneInfoNotFoundError as exc:
        raise SpotlightCommercialError("invalid_timezone", "timezone must be a valid IANA timezone") from exc


def _daypart_bounds(service_day: date, timezone_name: str) -> dict[str, tuple[datetime, datetime]]:
    zone = _zone(timezone_name)
    result: dict[str, tuple[datetime, datetime]] = {}
    for code, (start_clock, end_clock) in DEFAULT_DAYPARTS.items():
        end_day = service_day + timedelta(days=1) if end_clock == time(0, 0) else service_day
        local_start = datetime.combine(service_day, start_clock, tzinfo=zone)
        local_end = datetime.combine(end_day, end_clock, tzinfo=zone)
        result[code] = (local_start.astimezone(timezone.utc), local_end.astimezone(timezone.utc))
    return result


def _audit(
    db: Session,
    *,
    event_type: str,
    booking_id: Optional[int] = None,
    actor_user_id: Optional[int] = None,
    detail: Optional[dict[str, Any]] = None,
) -> None:
    db.add(
        SpotlightCommercialAuditEvent(
            booking_id=booking_id,
            event_type=event_type,
            actor_user_id=actor_user_id,
            detail_json=_json(detail or {}),
            created_at=_now(),
        )
    )


def record_capacity_evidence(
    db: Session,
    *,
    clan_id: int,
    region_code: str,
    timezone_name: str,
    service_date: str,
    observed_supplied_opportunities: dict[str, int],
    safety_factor_bps: int,
    evidence_source: str,
    actor_user_id: int,
    evidence: Optional[dict[str, Any]] = None,
    commit: bool = True,
) -> list[SpotlightCommercialCapacityWindow]:
    require_spotlight_commercial_enabled()
    if db.get(Clan, int(clan_id)) is None:
        raise SpotlightCommercialError("community_not_found", "The selected community does not exist")
    service_day = _parse_service_date(service_date)
    bounds = _daypart_bounds(service_day, timezone_name)
    factor = int(safety_factor_bps)
    if factor < 1 or factor > 10000:
        raise SpotlightCommercialError("invalid_safety_factor", "safety_factor_bps must be between 1 and 10000")
    rows: list[SpotlightCommercialCapacityWindow] = []
    for code, (starts_at, ends_at) in bounds.items():
        observed = max(int(observed_supplied_opportunities.get(code, 0)), 0)
        reservable = math.floor(observed * factor / 10000)
        latest = (
            db.query(func.max(SpotlightCommercialCapacityWindow.version))
            .filter(SpotlightCommercialCapacityWindow.clan_id == int(clan_id))
            .filter(SpotlightCommercialCapacityWindow.region_code == str(region_code))
            .filter(SpotlightCommercialCapacityWindow.timezone_name == str(timezone_name))
            .filter(SpotlightCommercialCapacityWindow.service_date == service_day.isoformat())
            .filter(SpotlightCommercialCapacityWindow.daypart == code)
            .scalar()
        )
        db.query(SpotlightCommercialCapacityWindow).filter(
            SpotlightCommercialCapacityWindow.clan_id == int(clan_id),
            SpotlightCommercialCapacityWindow.region_code == str(region_code),
            SpotlightCommercialCapacityWindow.timezone_name == str(timezone_name),
            SpotlightCommercialCapacityWindow.service_date == service_day.isoformat(),
            SpotlightCommercialCapacityWindow.daypart == code,
            SpotlightCommercialCapacityWindow.status == "calibrated",
        ).update({"status": "retired"}, synchronize_session=False)
        row = SpotlightCommercialCapacityWindow(
            clan_id=int(clan_id),
            region_code=str(region_code),
            timezone_name=str(timezone_name),
            service_date=service_day.isoformat(),
            daypart=code,
            window_starts_at=starts_at,
            window_ends_at=ends_at,
            observed_supplied_opportunities=observed,
            safety_factor_bps=factor,
            reservable_opportunities=reservable,
            evidence_source=str(evidence_source).strip(),
            evidence_json=_json(evidence or {}),
            status="calibrated",
            version=int(latest or 0) + 1,
            created_by_user_id=int(actor_user_id),
            created_at=_now(),
        )
        db.add(row)
        rows.append(row)
    _audit(
        db,
        event_type="capacity.calibrated",
        actor_user_id=actor_user_id,
        detail={
            "clan_id": clan_id,
            "region_code": region_code,
            "timezone": timezone_name,
            "service_date": service_day.isoformat(),
            "observed": observed_supplied_opportunities,
            "safety_factor_bps": factor,
        },
    )
    if commit:
        db.commit()
        for row in rows:
            db.refresh(row)
    else:
        db.flush()
    return rows


def validate_spotlight_quote_context(
    db: Session,
    *,
    actor_user_id: int,
    quantity: int,
    context: dict[str, Any],
) -> dict[str, Any]:
    require_spotlight_commercial_enabled()
    pricing_policy = (
        db.query(PipelineCreditPricingPolicy)
        .filter(PipelineCreditPricingPolicy.region_code == "global")
        .filter(PipelineCreditPricingPolicy.currency == "GBP")
        .filter(PipelineCreditPricingPolicy.status == "active")
        .order_by(PipelineCreditPricingPolicy.version.desc())
        .first()
    )
    if pricing_policy is None or Decimal(str(pricing_policy.credits_per_currency_unit)) != Decimal("2.0000"):
        raise SpotlightCommercialError(
            "spotlight_pipeline_credit_price_mismatch",
            "Paid Spotlight requires the approved GBP pricing policy of two Pipeline Credits per pound.",
        )
    campaign_id = int(context.get("campaign_id") or 0)
    clan_id = int(context.get("clan_id") or 0)
    campaign = db.get(SpotlightCampaign, campaign_id)
    actor = db.get(User, int(actor_user_id))
    if campaign is None:
        raise SpotlightCommercialError("campaign_not_found", "The selected Spotlight campaign does not exist")
    is_admin = str(getattr(actor, "role", "") or "").lower() == "admin"
    if int(campaign.owner_user_id) != int(actor_user_id) and not is_admin:
        raise SpotlightCommercialError("campaign_owner_required", "Only the advert owner or a platform administrator can book it")
    if db.get(Clan, clan_id) is None:
        raise SpotlightCommercialError("community_not_found", "The selected eligible community does not exist")
    funding = str(context.get("funding_classification") or "merchant_paid").strip().lower()
    if funding not in FUNDING_CLASSIFICATIONS:
        raise SpotlightCommercialError("invalid_funding_classification", "Unknown Spotlight funding classification")
    if funding != "merchant_paid" and not is_admin:
        raise SpotlightCommercialError("funding_authority_required", "Only a platform administrator can approve non-merchant funding")
    service_day = _parse_service_date(context.get("service_date"))
    timezone_name = str(context.get("timezone") or "").strip()
    _zone(timezone_name)
    region_code = str(context.get("region_code") or "").strip()
    if not region_code:
        raise SpotlightCommercialError("region_required", "region_code is required")
    bounds = _daypart_bounds(service_day, timezone_name)
    expiry = bounds["evening"][1]
    requested_expiry = context.get("expires_at")
    if requested_expiry:
        try:
            parsed_expiry = datetime.fromisoformat(str(requested_expiry).replace("Z", "+00:00"))
        except ValueError as exc:
            raise SpotlightCommercialError("invalid_expiry", "expires_at must be an ISO date-time") from exc
        if _aware(parsed_expiry) != expiry:
            raise SpotlightCommercialError("expiry_contract_mismatch", "The basic offer expires at the end of the selected local service day")
    opportunities = int(quantity) * OPPORTUNITIES_PER_CREDIT
    return {
        "campaign_id": campaign_id,
        "clan_id": clan_id,
        "advert_key": str(campaign.content_fingerprint or f"campaign:{campaign_id}"),
        "funding_classification": funding,
        "service_date": service_day.isoformat(),
        "timezone": timezone_name,
        "region_code": region_code,
        "expires_at": expiry.isoformat(),
        "daypart_allocation": {code: int(quantity) * DAYPART_ALLOCATION_PER_CREDIT for code in DEFAULT_DAYPARTS},
        "purchased_opportunities": opportunities,
        "contract_version": "paid_spotlight.day.v1",
        "viewer_daily_advert_cap": VIEWER_DAILY_ADVERT_CAP,
        "booking_key": str(context.get("booking_key") or "").strip()[:120] or None,
    }


def capacity_preview(db: Session, *, quantity: int, context: dict[str, Any]) -> dict[str, Any]:
    rows: list[dict[str, Any]] = []
    complete = True
    for daypart, required in context["daypart_allocation"].items():
        window = (
            db.query(SpotlightCommercialCapacityWindow)
            .filter(SpotlightCommercialCapacityWindow.clan_id == int(context["clan_id"]))
            .filter(SpotlightCommercialCapacityWindow.region_code == context["region_code"])
            .filter(SpotlightCommercialCapacityWindow.timezone_name == context["timezone"])
            .filter(SpotlightCommercialCapacityWindow.service_date == context["service_date"])
            .filter(SpotlightCommercialCapacityWindow.daypart == daypart)
            .filter(SpotlightCommercialCapacityWindow.status == "calibrated")
            .order_by(SpotlightCommercialCapacityWindow.version.desc())
            .first()
        )
        if window is None:
            complete = False
            rows.append({"daypart": daypart, "required": required, "status": "uncalibrated", "available": 0})
            continue
        reserved = _reserved_for_capacity(db, int(window.id))
        available = max(int(window.reservable_opportunities) - reserved, 0)
        if available < required:
            complete = False
        rows.append({
            "daypart": daypart,
            "required": required,
            "observed_supplied": int(window.observed_supplied_opportunities),
            "reservable": int(window.reservable_opportunities),
            "reserved": reserved,
            "available": available,
            "status": "available" if available >= required else "conflict",
            "capacity_window_id": int(window.id),
            "evidence_source": window.evidence_source,
        })
    return {
        "available": complete,
        "quantity": int(quantity),
        "purchased_opportunities": int(context["purchased_opportunities"]),
        "dayparts": rows,
        "boundary": "Capacity is derived from measured supplied opportunities with an explicit safety factor; no simulated 300-allocation limit is used.",
    }


def _reserved_for_capacity(db: Session, capacity_window_id: int) -> int:
    value = (
        db.query(func.coalesce(func.sum(SpotlightCommercialAllocation.allocated_opportunities), 0))
        .join(SpotlightCommercialBooking, SpotlightCommercialBooking.id == SpotlightCommercialAllocation.booking_id)
        .filter(SpotlightCommercialAllocation.capacity_window_id == int(capacity_window_id))
        .filter(SpotlightCommercialBooking.status.in_(tuple(ACTIVE_BOOKING_STATUSES)))
        .scalar()
    )
    return int(value or 0)


def _current_scheduled_opportunity(
    db: Session,
    *,
    booking: SpotlightCommercialBooking,
    at: datetime,
    lock_for_update: bool = False,
) -> tuple[Optional[SpotlightCommercialOpportunity], Optional[datetime]]:
    allocation_query = (
        db.query(SpotlightCommercialAllocation)
        .filter(SpotlightCommercialAllocation.booking_id == int(booking.id))
        .filter(SpotlightCommercialAllocation.window_starts_at <= at)
        .filter(SpotlightCommercialAllocation.window_ends_at > at)
        .order_by(SpotlightCommercialAllocation.window_starts_at.asc())
    )
    if lock_for_update:
        allocation_query = allocation_query.with_for_update()
    allocation = allocation_query.first()
    if allocation is None:
        return None, None
    opportunity_query = (
        db.query(SpotlightCommercialOpportunity)
        .filter(SpotlightCommercialOpportunity.booking_id == int(booking.id))
        .filter(SpotlightCommercialOpportunity.allocation_id == int(allocation.id))
        .filter(SpotlightCommercialOpportunity.scheduled_at <= at)
        .filter(SpotlightCommercialOpportunity.status.in_(("reserved", "available")))
        .order_by(
            SpotlightCommercialOpportunity.scheduled_at.desc(),
            SpotlightCommercialOpportunity.sequence_number.desc(),
        )
    )
    if lock_for_update:
        opportunity_query = opportunity_query.with_for_update()
    opportunity = opportunity_query.first()
    if opportunity is None:
        return None, None
    next_scheduled_at = (
        db.query(func.min(SpotlightCommercialOpportunity.scheduled_at))
        .filter(SpotlightCommercialOpportunity.allocation_id == int(allocation.id))
        .filter(SpotlightCommercialOpportunity.scheduled_at > opportunity.scheduled_at)
        .scalar()
    )
    turn_ends_at = _aware(next_scheduled_at or allocation.window_ends_at)
    if at >= turn_ends_at:
        return None, None
    return opportunity, turn_ends_at


def _active_campaign_bookings(
    db: Session,
    *,
    campaign_id: int,
    at: datetime,
    lock_for_update: bool = False,
) -> list[SpotlightCommercialBooking]:
    query = (
        db.query(SpotlightCommercialBooking)
        .filter(SpotlightCommercialBooking.campaign_id == int(campaign_id))
        .filter(SpotlightCommercialBooking.status.in_(tuple(SUPPLY_BOOKING_STATUSES)))
        .filter(SpotlightCommercialBooking.service_starts_at <= at)
        .filter(SpotlightCommercialBooking.service_ends_at > at)
        .order_by(SpotlightCommercialBooking.id.asc())
    )
    if lock_for_update:
        query = query.with_for_update()
    return list(query.all())


def bind_commercial_presentation_lease(
    db: Session,
    *,
    lease: SpotlightPresentationLease,
    selected_at: Optional[datetime] = None,
) -> dict[str, Any]:
    if not spotlight_commercial_enabled():
        return {"commercial": False, "attributed": False, "reason": "paid_spotlight_disabled"}
    current_time = _aware(selected_at or _now())
    existing = (
        db.query(SpotlightCommercialPresentationAttribution)
        .filter(
            SpotlightCommercialPresentationAttribution.presentation_id
            == str(lease.presentation_id)
        )
        .one_or_none()
    )
    if existing is not None:
        return {
            "commercial": True,
            "attributed": True,
            "deduped": True,
            "booking_id": int(existing.booking_id),
            "opportunity_id": int(existing.opportunity_id),
        }
    bookings = _active_campaign_bookings(
        db,
        campaign_id=int(lease.campaign_id),
        at=current_time,
        lock_for_update=True,
    )
    if not bookings:
        return {"commercial": False, "attributed": False, "reason": "no_active_commercial_booking"}
    placement = db.get(MarketplaceBroadcast, int(lease.placement_broadcast_id))
    if placement is None:
        return {"commercial": True, "attributed": False, "reason": "commercial_placement_missing"}
    current_turns: list[
        tuple[SpotlightCommercialBooking, SpotlightCommercialOpportunity, datetime]
    ] = []
    for booking in bookings:
        if int(booking.clan_id) != int(placement.clan_id):
            continue
        opportunity, turn_ends_at = _current_scheduled_opportunity(
            db,
            booking=booking,
            at=current_time,
            lock_for_update=True,
        )
        if opportunity is not None and turn_ends_at is not None:
            current_turns.append((booking, opportunity, turn_ends_at))
    if not current_turns:
        return {
            "commercial": True,
            "attributed": False,
            "reason": "commercial_scheduled_turn_not_due",
        }
    booking, opportunity, turn_ends_at = sorted(
        current_turns,
        key=lambda row: (
            0 if row[1].status == "reserved" else 1,
            row[1].scheduled_at,
            row[0].id,
        ),
    )[0]
    first_availability = opportunity.status == "reserved"
    if first_availability:
        opportunity.status = "available"
        opportunity.available_at = current_time
        opportunity.availability_expires_at = turn_ends_at
        opportunity.presentation_id = str(lease.presentation_id)
        opportunity.viewer_user_id = int(lease.viewer_user_id)
        opportunity.supplied_at = current_time
    attribution = SpotlightCommercialPresentationAttribution(
        presentation_id=str(lease.presentation_id),
        booking_id=int(booking.id),
        opportunity_id=int(opportunity.id),
        campaign_id=int(lease.campaign_id),
        clan_id=int(booking.clan_id),
        viewer_user_id=int(lease.viewer_user_id),
        selected_at=current_time,
        created_at=current_time,
    )
    db.add(opportunity)
    db.add(attribution)
    if first_availability:
        booking.status = "serving"
        booking.updated_at = current_time
        _audit(
            db,
            event_type="opportunity.made_available",
            booking_id=int(booking.id),
            actor_user_id=int(lease.viewer_user_id),
            detail={
                "opportunity_id": int(opportunity.id),
                "presentation_id": lease.presentation_id,
                "scheduled_at": _aware(opportunity.scheduled_at).isoformat(),
                "turn_ends_at": turn_ends_at.isoformat(),
            },
        )
    db.flush()
    return {
        "commercial": True,
        "attributed": True,
        "deduped": False,
        "booking_id": int(booking.id),
        "opportunity_id": int(opportunity.id),
        "turn_first_made_available": first_availability,
        "scheduled_at": _aware(opportunity.scheduled_at).isoformat(),
        "turn_ends_at": turn_ends_at.isoformat(),
    }


def commercial_presentation_attribution(
    db: Session,
    *,
    presentation_id: str,
) -> Optional[SpotlightCommercialPresentationAttribution]:
    return (
        db.query(SpotlightCommercialPresentationAttribution)
        .filter(
            SpotlightCommercialPresentationAttribution.presentation_id
            == str(presentation_id)
        )
        .one_or_none()
    )


def record_commercial_qualifying_impression(
    db: Session,
    *,
    presentation_id: str,
    exposure_event_id: int,
    qualified_at: datetime,
) -> Optional[SpotlightCommercialPresentationAttribution]:
    attribution = commercial_presentation_attribution(
        db,
        presentation_id=presentation_id,
    )
    if attribution is None:
        return None
    if attribution.exposure_event_id is not None:
        return attribution
    attribution.exposure_event_id = int(exposure_event_id)
    attribution.qualified_at = _aware(qualified_at)
    db.add(attribution)
    db.flush()
    return attribution


def _apply_restored_service_credit_obligations(
    db: Session,
    *,
    booking: SpotlightCommercialBooking,
) -> None:
    remaining_to_apply = Decimal(str(booking.purchased_credits))
    if remaining_to_apply <= Decimal("0.00"):
        return
    obligations = (
        db.query(SpotlightCommercialServiceCreditObligation)
        .filter(
            SpotlightCommercialServiceCreditObligation.account_id
            == int(booking.account_id)
        )
        .filter(
            SpotlightCommercialServiceCreditObligation.status.in_(
                ("outstanding", "partially_rebooked")
            )
        )
        .filter(
            SpotlightCommercialServiceCreditObligation.remaining_credit_amount
            > Decimal("0.00")
        )
        .order_by(
            SpotlightCommercialServiceCreditObligation.created_at.asc(),
            SpotlightCommercialServiceCreditObligation.id.asc(),
        )
        .with_for_update()
        .all()
    )
    for obligation in obligations:
        if remaining_to_apply <= Decimal("0.00"):
            break
        available = Decimal(str(obligation.remaining_credit_amount))
        applied = min(available, remaining_to_apply)
        db.add(
            SpotlightCommercialServiceCreditApplication(
                obligation_id=int(obligation.id),
                replacement_booking_id=int(booking.id),
                credit_amount=applied,
                status="active",
                created_at=_now(),
            )
        )
        obligation.remaining_credit_amount = available - applied
        obligation.status = (
            "rebooked"
            if obligation.remaining_credit_amount == Decimal("0.00")
            else "partially_rebooked"
        )
        obligation.updated_at = _now()
        db.add(obligation)
        remaining_to_apply -= applied


def _resolve_restored_service_credit_applications(
    db: Session,
    *,
    booking: SpotlightCommercialBooking,
    outcome: str,
    resolved_at: datetime,
) -> None:
    applications = (
        db.query(SpotlightCommercialServiceCreditApplication)
        .filter(
            SpotlightCommercialServiceCreditApplication.replacement_booking_id
            == int(booking.id)
        )
        .filter(SpotlightCommercialServiceCreditApplication.status == "active")
        .with_for_update()
        .all()
    )
    for application in applications:
        application.status = (
            "fulfilled" if outcome == "fulfilled" else "transferred_to_shortfall"
        )
        application.resolved_at = resolved_at
        obligation = (
            db.query(SpotlightCommercialServiceCreditObligation)
            .filter(
                SpotlightCommercialServiceCreditObligation.id
                == int(application.obligation_id)
            )
            .with_for_update()
            .one()
        )
        if Decimal(str(obligation.remaining_credit_amount)) > Decimal("0.00"):
            obligation.status = "partially_rebooked"
        else:
            obligation.status = (
                "fulfilled"
                if outcome == "fulfilled"
                else "transferred_to_shortfall"
            )
            obligation.fulfilled_at = resolved_at if outcome == "fulfilled" else None
        obligation.updated_at = resolved_at
        db.add(application)
        db.add(obligation)


def _release_restored_service_credit_applications(
    db: Session,
    *,
    booking: SpotlightCommercialBooking,
) -> None:
    applications = (
        db.query(SpotlightCommercialServiceCreditApplication)
        .filter(
            SpotlightCommercialServiceCreditApplication.replacement_booking_id
            == int(booking.id)
        )
        .filter(SpotlightCommercialServiceCreditApplication.status == "active")
        .with_for_update()
        .all()
    )
    for application in applications:
        obligation = (
            db.query(SpotlightCommercialServiceCreditObligation)
            .filter(
                SpotlightCommercialServiceCreditObligation.id
                == int(application.obligation_id)
            )
            .with_for_update()
            .one()
        )
        obligation.remaining_credit_amount = (
            Decimal(str(obligation.remaining_credit_amount))
            + Decimal(str(application.credit_amount))
        )
        obligation.status = "outstanding"
        obligation.updated_at = _now()
        application.status = "released"
        application.resolved_at = _now()
        db.add(obligation)
        db.add(application)


def reserve_spotlight_booking(
    db: Session,
    *,
    quote: PipelineCreditServiceQuote,
    order: PipelineCreditServiceSpendOrder,
    actor_user_id: int,
    context: dict[str, Any],
) -> SpotlightCommercialBooking:
    require_spotlight_commercial_enabled()
    existing = db.query(SpotlightCommercialBooking).filter(SpotlightCommercialBooking.quote_id == int(quote.id)).one_or_none()
    if existing is not None:
        return existing
    if Decimal(str(quote.unit_credit_cost)) != Decimal("1.00"):
        raise SpotlightCommercialError("spotlight_price_contract_mismatch", "Paid Spotlight must cost exactly one Pipeline Credit per package")
    preview = capacity_preview(db, quantity=int(quote.quantity), context=context)
    if not preview["available"]:
        raise SpotlightCommercialError("spotlight_capacity_unavailable", "Measured Spotlight capacity cannot safely fulfil this booking")
    booking_key = str(context.get("booking_key") or f"paid-spotlight-quote-{int(quote.id)}")
    starts_at = min(_aware(datetime.fromisoformat(row["window_starts_at"])) if isinstance(row.get("window_starts_at"), str) else _aware(db.get(SpotlightCommercialCapacityWindow, row["capacity_window_id"]).window_starts_at) for row in preview["dayparts"])
    ends_at = max(_aware(db.get(SpotlightCommercialCapacityWindow, row["capacity_window_id"]).window_ends_at) for row in preview["dayparts"])
    booking = SpotlightCommercialBooking(
        booking_key=booking_key,
        campaign_id=int(context["campaign_id"]),
        advert_key=context["advert_key"],
        account_id=int(quote.account_id),
        quote_id=int(quote.id),
        spend_order_id=int(order.id),
        purchaser_user_id=int(actor_user_id),
        clan_id=int(context["clan_id"]),
        funding_classification=context["funding_classification"],
        region_code=context["region_code"],
        timezone_name=context["timezone"],
        service_date=context["service_date"],
        service_starts_at=starts_at,
        service_ends_at=ends_at,
        expires_at=ends_at,
        purchased_credits=Decimal(str(quote.total_credit_cost)),
        purchased_opportunities=int(context["purchased_opportunities"]),
        reserved_opportunities=int(context["purchased_opportunities"]),
        status="reserved",
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(booking)
    db.flush()
    sequence = 0
    for row in preview["dayparts"]:
        window = (
            db.query(SpotlightCommercialCapacityWindow)
            .filter(SpotlightCommercialCapacityWindow.id == int(row["capacity_window_id"]))
            .with_for_update()
            .one()
        )
        required = int(row["required"])
        if int(window.reservable_opportunities) - _reserved_for_capacity(db, int(window.id)) < required:
            raise SpotlightCommercialError("spotlight_capacity_conflict", "Spotlight capacity changed while this booking was being reserved")
        allocation = SpotlightCommercialAllocation(
            booking_id=int(booking.id),
            capacity_window_id=int(window.id),
            daypart=window.daypart,
            allocated_opportunities=required,
            window_starts_at=window.window_starts_at,
            window_ends_at=window.window_ends_at,
            created_at=_now(),
        )
        db.add(allocation)
        db.flush()
        start = _aware(window.window_starts_at)
        duration = _aware(window.window_ends_at) - start
        for offset in range(required):
            sequence += 1
            db.add(
                SpotlightCommercialOpportunity(
                    booking_id=int(booking.id),
                    allocation_id=int(allocation.id),
                    sequence_number=sequence,
                    daypart=window.daypart,
                    scheduled_at=start + duration * (offset / max(required, 1)),
                    status="reserved",
                    created_at=_now(),
                )
            )
    _audit(
        db,
        event_type="booking.reserved",
        booking_id=int(booking.id),
        actor_user_id=actor_user_id,
        detail={"quote_id": int(quote.id), "opportunities": int(context["purchased_opportunities"]), "allocation": context["daypart_allocation"]},
    )
    _apply_restored_service_credit_obligations(db, booking=booking)
    db.flush()
    return booking


def acknowledge_supplied_presentation(
    db: Session,
    *,
    lease: SpotlightPresentationLease,
    supplied_at: Optional[datetime] = None,
) -> dict[str, Any]:
    if not spotlight_commercial_enabled():
        return {"commercial": False, "recorded": False, "reason": "paid_spotlight_disabled"}
    current_time = _aware(supplied_at or _now())
    attribution = (
        db.query(SpotlightCommercialPresentationAttribution)
        .filter(
            SpotlightCommercialPresentationAttribution.presentation_id
            == str(lease.presentation_id)
        )
        .with_for_update()
        .one_or_none()
    )
    if attribution is None:
        active = _active_campaign_bookings(
            db,
            campaign_id=int(lease.campaign_id),
            at=current_time,
        )
        return {
            "commercial": bool(active),
            "recorded": False,
            "reason": (
                "commercial_presentation_not_attributed"
                if active
                else "no_active_commercial_booking"
            ),
        }
    recorded = attribution.visible_at is None
    if recorded:
        attribution.visible_at = current_time
        db.add(attribution)
        _audit(
            db,
            event_type="presentation.visible",
            booking_id=int(attribution.booking_id),
            actor_user_id=int(lease.viewer_user_id),
            detail={
                "opportunity_id": int(attribution.opportunity_id),
                "presentation_id": lease.presentation_id,
            },
        )
        db.commit()
    return {
        "commercial": True,
        "recorded": recorded,
        "deduped": not recorded,
        "opportunity_id": int(attribution.opportunity_id),
        "booking_id": int(attribution.booking_id),
        "counts_as_supplied_opportunity": False,
        "counts_as_visible_presentation": recorded,
    }


def reconcile_booking(db: Session, *, booking_id: int, now: Optional[datetime] = None) -> SpotlightCommercialBooking:
    current_time = _aware(now or _now())
    booking = db.query(SpotlightCommercialBooking).filter(SpotlightCommercialBooking.id == int(booking_id)).with_for_update().one()
    if current_time < _aware(booking.service_ends_at):
        return booking
    opportunities = db.query(SpotlightCommercialOpportunity).filter(SpotlightCommercialOpportunity.booking_id == int(booking.id)).all()
    supplied = sum(1 for row in opportunities if row.status == "supplied")
    supplied += sum(1 for row in opportunities if row.status == "available")
    for row in opportunities:
        if row.status == "reserved":
            row.status = "missed"
            row.failure_code = "service_window_ended_unsupplied"
    missed = len(opportunities) - supplied
    booking.status = "fulfilled" if missed == 0 else "shortfall"
    booking.updated_at = current_time
    _resolve_restored_service_credit_applications(
        db,
        booking=booking,
        outcome=booking.status,
        resolved_at=current_time,
    )
    if missed:
        credit_amount = Decimal(str(max(1, math.ceil(missed / OPPORTUNITIES_PER_CREDIT))))
        remedy_key = f"paid-spotlight-shortfall:{int(booking.id)}:v1"
        remedy = db.query(SpotlightCommercialRemedy).filter(SpotlightCommercialRemedy.remedy_key == remedy_key).one_or_none()
        if remedy is None:
            db.add(
                SpotlightCommercialRemedy(
                    booking_id=int(booking.id),
                    remedy_key=remedy_key,
                    remedy_type="pipeline_credit_restore",
                    missed_opportunities=missed,
                    credit_amount=credit_amount,
                    status="outstanding",
                    created_at=current_time,
                )
            )
    _audit(db, event_type="booking.reconciled", booking_id=int(booking.id), detail={"supplied": supplied, "missed": missed, "status": booking.status})
    db.commit()
    db.refresh(booking)
    return booking


def reconcile_due_bookings(
    db: Session,
    *,
    now: Optional[datetime] = None,
    limit: int = 100,
) -> dict[str, Any]:
    require_spotlight_commercial_enabled()
    current_time = _aware(now or _now())
    booking_ids = [
        int(row[0])
        for row in (
            db.query(SpotlightCommercialBooking.id)
            .filter(SpotlightCommercialBooking.status.in_(tuple(ACTIVE_BOOKING_STATUSES)))
            .filter(SpotlightCommercialBooking.service_ends_at <= current_time)
            .order_by(SpotlightCommercialBooking.service_ends_at.asc(), SpotlightCommercialBooking.id.asc())
            .limit(max(1, min(int(limit), 500)))
            .all()
        )
    ]
    reconciled: list[int] = []
    failed: list[int] = []
    for booking_id in booking_ids:
        try:
            reconcile_booking(db, booking_id=booking_id, now=current_time)
            reconciled.append(booking_id)
        except Exception:
            db.rollback()
            failed.append(booking_id)
    return {
        "due": len(booking_ids),
        "reconciled": reconciled,
        "failed": failed,
        "at": current_time.isoformat(),
    }


def apply_remedy(db: Session, *, remedy_id: int, actor_user_id: int) -> SpotlightCommercialRemedy:
    remedy = db.query(SpotlightCommercialRemedy).filter(SpotlightCommercialRemedy.id == int(remedy_id)).with_for_update().one()
    booking = db.get(SpotlightCommercialBooking, int(remedy.booking_id))
    existing_obligation = (
        db.query(SpotlightCommercialServiceCreditObligation)
        .filter(
            SpotlightCommercialServiceCreditObligation.remedy_id == int(remedy.id)
        )
        .one_or_none()
    )
    if remedy.status == "applied" and existing_obligation is not None:
        return remedy
    ledger = allocate_pipeline_credits(
        db,
        account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
        owner_type="user",
        owner_user_id=int(booking.purchaser_user_id),
        pricing_region="global",
        currency="PC",
        amount=remedy.credit_amount,
        workflow_key="service.paid_spotlight.day.remedy",
        idempotency_key=remedy.remedy_key,
        reference_type="spotlight_commercial_remedy",
        reference_id=str(int(remedy.id)),
        note="Idempotent Paid Spotlight delivery shortfall remedy",
        created_by_user_id=int(actor_user_id),
        meta={"booking_id": int(booking.id), "missed_opportunities": int(remedy.missed_opportunities)},
        commit=False,
    )
    remedy.ledger_entry_id = int(ledger.id)
    remedy.status = "applied"
    remedy.applied_at = _now()
    if existing_obligation is None:
        db.add(
            SpotlightCommercialServiceCreditObligation(
                remedy_id=int(remedy.id),
                account_id=int(booking.account_id),
                original_booking_id=int(booking.id),
                credit_amount=Decimal(str(remedy.credit_amount)),
                remaining_credit_amount=Decimal(str(remedy.credit_amount)),
                status="outstanding",
                created_at=_now(),
                updated_at=_now(),
            )
        )
    booking.status = "remedied"
    booking.updated_at = _now()
    _audit(db, event_type="remedy.applied", booking_id=int(booking.id), actor_user_id=actor_user_id, detail={"remedy_id": int(remedy.id), "ledger_entry_id": int(ledger.id)})
    db.commit()
    db.refresh(remedy)
    return remedy


def commercial_frequency_policy(
    db: Session,
    *,
    campaign_id: int,
    viewer_user_id: int,
    at: Optional[datetime] = None,
) -> Optional[dict[str, Any]]:
    if not spotlight_commercial_enabled():
        return None
    current_time = _aware(at or _now())
    booking = (
        db.query(SpotlightCommercialBooking)
        .filter(SpotlightCommercialBooking.campaign_id == int(campaign_id))
        .filter(SpotlightCommercialBooking.service_starts_at <= current_time)
        .filter(SpotlightCommercialBooking.service_ends_at > current_time)
        .filter(SpotlightCommercialBooking.status.in_(tuple(SUPPLY_BOOKING_STATUSES)))
        .order_by(SpotlightCommercialBooking.created_at.asc())
        .first()
    )
    if booking is None:
        return None
    related_campaign_ids = [
        int(row[0])
        for row in db.query(SpotlightCommercialBooking.campaign_id)
        .filter(SpotlightCommercialBooking.advert_key == booking.advert_key)
        .filter(SpotlightCommercialBooking.service_date == booking.service_date)
        .distinct()
        .all()
    ]
    prior = (
        db.query(func.count(SpotlightExposureEvent.id))
        .filter(SpotlightExposureEvent.viewer_user_id == int(viewer_user_id))
        .filter(SpotlightExposureEvent.campaign_id.in_(related_campaign_ids))
        .filter(SpotlightExposureEvent.event_type == "qualifying_impression")
        .filter(SpotlightExposureEvent.event_at >= booking.service_starts_at)
        .filter(SpotlightExposureEvent.event_at < booking.service_ends_at)
        .scalar()
    )
    supply_available = any(
        _current_scheduled_opportunity(
            db,
            booking=related_booking,
            at=current_time,
        )[0]
        is not None
        for campaign_id in related_campaign_ids
        for related_booking in _active_campaign_bookings(
            db,
            campaign_id=int(campaign_id),
            at=current_time,
        )
    )
    return {
        "advert_key": booking.advert_key,
        "service_date": booking.service_date,
        "prior_qualifying_impressions": int(prior or 0),
        "cap": VIEWER_DAILY_ADVERT_CAP,
        "suppressed": int(prior or 0) >= VIEWER_DAILY_ADVERT_CAP,
        "supply_available": supply_available,
    }


def booking_report(db: Session, *, booking_id: int) -> dict[str, Any]:
    booking = db.get(SpotlightCommercialBooking, int(booking_id))
    if booking is None:
        raise SpotlightCommercialError("booking_not_found", "Spotlight booking not found")
    status_counts = dict(
        db.query(SpotlightCommercialOpportunity.status, func.count(SpotlightCommercialOpportunity.id))
        .filter(SpotlightCommercialOpportunity.booking_id == int(booking.id))
        .group_by(SpotlightCommercialOpportunity.status)
        .all()
    )
    attributed_events = (
        db.query(SpotlightExposureEvent)
        .join(
            SpotlightCommercialPresentationAttribution,
            SpotlightCommercialPresentationAttribution.exposure_event_id
            == SpotlightExposureEvent.id,
        )
        .filter(
            SpotlightCommercialPresentationAttribution.booking_id == int(booking.id)
        )
        .filter(SpotlightExposureEvent.event_type == "qualifying_impression")
        .all()
    )
    legacy_presentation_ids = [
        str(row[0])
        for row in (
            db.query(SpotlightCommercialOpportunity.presentation_id)
            .filter(
                SpotlightCommercialOpportunity.booking_id == int(booking.id)
            )
            .filter(SpotlightCommercialOpportunity.presentation_id.isnot(None))
            .all()
        )
        if row[0]
    ]
    legacy_events = (
        db.query(SpotlightExposureEvent)
        .filter(SpotlightExposureEvent.presentation_id.in_(legacy_presentation_ids))
        .filter(SpotlightExposureEvent.event_type == "qualifying_impression")
        .all()
        if legacy_presentation_ids
        else []
    )
    event_by_id = {
        int(row.id): row
        for row in [*legacy_events, *attributed_events]
    }
    impressions = len(event_by_id)
    reach = len({int(row.viewer_user_id) for row in event_by_id.values()})
    visible_presentations = int(
        db.query(func.count(SpotlightCommercialPresentationAttribution.id))
        .filter(
            SpotlightCommercialPresentationAttribution.booking_id == int(booking.id)
        )
        .filter(SpotlightCommercialPresentationAttribution.visible_at.isnot(None))
        .scalar()
        or 0
    )
    remedy = db.query(SpotlightCommercialRemedy).filter(SpotlightCommercialRemedy.booking_id == int(booking.id)).order_by(SpotlightCommercialRemedy.id.desc()).first()
    acquired_credits = Decimal(str(
        db.query(func.coalesce(func.sum(PipelineCreditLedgerEntry.credit_amount), 0))
        .filter(PipelineCreditLedgerEntry.account_id == int(booking.account_id))
        .filter(PipelineCreditLedgerEntry.entry_type == "allocation")
        .scalar() or 0
    ))
    credit_obligations = (
        db.query(SpotlightCommercialServiceCreditObligation)
        .join(
            SpotlightCommercialRemedy,
            SpotlightCommercialRemedy.id
            == SpotlightCommercialServiceCreditObligation.remedy_id,
        )
        .filter(SpotlightCommercialRemedy.booking_id == int(booking.id))
        .order_by(SpotlightCommercialServiceCreditObligation.id.asc())
        .all()
    )
    obligation_rows: list[dict[str, Any]] = []
    unbooked_restored_credits = Decimal("0.00")
    active_replacement_credits = Decimal("0.00")
    for obligation in credit_obligations:
        applications = (
            db.query(SpotlightCommercialServiceCreditApplication)
            .filter(
                SpotlightCommercialServiceCreditApplication.obligation_id
                == int(obligation.id)
            )
            .order_by(SpotlightCommercialServiceCreditApplication.id.asc())
            .all()
        )
        unbooked_restored_credits += Decimal(
            str(obligation.remaining_credit_amount)
        )
        active_replacement_credits += sum(
            (
                Decimal(str(application.credit_amount))
                for application in applications
                if application.status == "active"
            ),
            Decimal("0.00"),
        )
        obligation_rows.append(
            {
                "id": int(obligation.id),
                "status": obligation.status,
                "credit_amount": f"{Decimal(str(obligation.credit_amount)):.2f}",
                "remaining_credit_amount": (
                    f"{Decimal(str(obligation.remaining_credit_amount)):.2f}"
                ),
                "applications": [
                    {
                        "replacement_booking_id": int(
                            application.replacement_booking_id
                        ),
                        "credit_amount": (
                            f"{Decimal(str(application.credit_amount)):.2f}"
                        ),
                        "status": application.status,
                    }
                    for application in applications
                ],
            }
        )
    original_shortfall_outstanding = bool(
        remedy is not None and remedy.status != "applied"
    )
    supplied_opportunities = int(status_counts.get("supplied", 0)) + int(
        status_counts.get("available", 0)
    )
    settlement = spotlight_commercial_settlement_readiness(
        funding_classification=booking.funding_classification,
        booking_status=booking.status,
        purchased_credits=booking.purchased_credits,
        supplied_opportunities=supplied_opportunities,
        missed_opportunities=int(status_counts.get("missed", 0)),
        original_shortfall_outstanding=original_shortfall_outstanding,
        restored_service_credits_outstanding=(
            unbooked_restored_credits + active_replacement_credits
        ),
    )
    return {
        "booking_id": int(booking.id),
        "booking_key": booking.booking_key,
        "campaign_id": int(booking.campaign_id),
        "funding_classification": booking.funding_classification,
        "schedule": {"community_id": int(booking.clan_id), "region_code": booking.region_code, "timezone": booking.timezone_name, "service_date": booking.service_date, "starts_at": _aware(booking.service_starts_at).isoformat(), "ends_at": _aware(booking.service_ends_at).isoformat()},
        "status": booking.status,
        "opportunities": {
            "purchased": int(booking.purchased_opportunities),
            "reserved": int(booking.reserved_opportunities),
            "scheduled": int(booking.reserved_opportunities),
            "supplied": supplied_opportunities,
            "made_available": supplied_opportunities,
            "visible_presentations": visible_presentations,
            "missed": int(status_counts.get("missed", 0)),
            "outstanding": int(status_counts.get("reserved", 0)),
        },
        "measurement": {
            "qualifying_impressions": impressions,
            "recognised_unique_viewers": reach if reach >= PRIVACY_REACH_THRESHOLD else None,
            "reach_privacy_suppressed": reach < PRIVACY_REACH_THRESHOLD,
            "no_sales_claim": "Opening or contacting a Shop is not reported as a sale.",
            "attribution_scope": "This booking's presentation attributions only.",
        },
        "finance": {
            "cash_collected": None,
            "cash_collection_status": "not_proven_by_pipeline_credit_spend",
            "credits_acquired_total": f"{acquired_credits:.2f}",
            "credits_purchased_from_cash": None,
            "credit_purchase_status": "cash purchase is not inferred from an allocation ledger entry",
            "credits_spent": f"{Decimal(str(booking.purchased_credits)):.2f}",
            "approved_credit_conversion": "GBP 0.50 per Pipeline Credit",
            "earned_revenue": settlement["earned_revenue_amount"],
            "earned_revenue_status": settlement["revenue_recognition_status"],
            "delivery_cost": settlement["direct_cost_amount"],
            "company_overhead": None,
            "community_allocation": settlement["community_allocation_amount"],
            "outstanding_service_liability": {
                "original_shortfall_opportunities": (
                    int(status_counts.get("missed", 0))
                    if original_shortfall_outstanding
                    else 0
                ),
                "restored_credits_unbooked": f"{unbooked_restored_credits:.2f}",
                "restored_credits_in_active_replacement": (
                    f"{active_replacement_credits:.2f}"
                ),
                "double_count_policy": (
                    "A restored credit moves the obligation from the original "
                    "shortfall to an unbooked credit or replacement booking; "
                    "the same obligation is not added twice."
                ),
            },
            "settlement_readiness": settlement,
        },
        "remedy": None if remedy is None else {"id": int(remedy.id), "type": remedy.remedy_type, "status": remedy.status, "missed_opportunities": int(remedy.missed_opportunities), "credit_amount": f"{Decimal(str(remedy.credit_amount)):.2f}", "cash_refund": False, "replacement_campaign": False},
        "restored_service_credit_obligations": obligation_rows,
    }


def programme_board(db: Session) -> dict[str, Any]:
    bookings = db.query(SpotlightCommercialBooking).order_by(SpotlightCommercialBooking.created_at.desc()).all()
    audits = db.query(SpotlightCommercialAuditEvent).order_by(SpotlightCommercialAuditEvent.created_at.desc()).all()
    return {
        "ok": True,
        "enabled": spotlight_commercial_enabled(),
        "live_collection_enabled": False,
        "contract_version": "paid_spotlight.day.v1",
        "bookings": [booking_report(db, booking_id=int(row.id)) for row in bookings],
        "audit_history": [
            {"id": int(row.id), "booking_id": row.booking_id, "event_type": row.event_type, "actor_user_id": row.actor_user_id, "detail": json.loads(row.detail_json or "{}"), "created_at": _aware(row.created_at).isoformat()}
            for row in audits
        ],
        "boundaries": {
            "real_collection": "disabled",
            "real_spending": "disabled unless both this feature flag, Pipeline Credit enforcement, and payment operations are separately enabled",
            "capacity": "requires measured capacity evidence for every community, region, date and daypart",
        },
    }


def set_booking_lifecycle(
    db: Session,
    *,
    booking_id: int,
    action: str,
    reason: str,
    actor_user_id: int,
) -> SpotlightCommercialBooking:
    booking = db.query(SpotlightCommercialBooking).filter(
        SpotlightCommercialBooking.id == int(booking_id)
    ).with_for_update().one_or_none()
    if booking is None:
        raise SpotlightCommercialError("booking_not_found", "Spotlight booking not found")
    operation = str(action or "").strip().lower()
    if operation == "hold":
        if booking.status not in {"reserved", "serving"}:
            raise SpotlightCommercialError("booking_not_holdable", "Only a reserved or serving booking can be held")
        booking.status = "on_hold"
        booking.hold_reason = str(reason).strip()
    elif operation == "resume":
        if booking.status != "on_hold":
            raise SpotlightCommercialError("booking_not_held", "Only a held booking can be resumed")
        booking.status = "serving" if _now() >= _aware(booking.service_starts_at) else "reserved"
        booking.hold_reason = None
    elif operation == "withdraw":
        if booking.status in {"fulfilled", "remedied", "withdrawn"}:
            raise SpotlightCommercialError("booking_not_withdrawable", "This booking cannot be permanently withdrawn")
        booking.status = "withdrawn"
        booking.withdrawal_reason = str(reason).strip()
        db.query(SpotlightCommercialOpportunity).filter(
            SpotlightCommercialOpportunity.booking_id == int(booking.id),
            SpotlightCommercialOpportunity.status == "reserved",
        ).update({"status": "cancelled", "failure_code": "operator_withdrawal"}, synchronize_session=False)
        _release_restored_service_credit_applications(db, booking=booking)
    else:
        raise SpotlightCommercialError("invalid_lifecycle_action", "Unknown booking lifecycle action")
    booking.updated_at = _now()
    _audit(
        db,
        event_type=f"booking.{operation}",
        booking_id=int(booking.id),
        actor_user_id=int(actor_user_id),
        detail={"reason": str(reason).strip(), "status": booking.status},
    )
    db.commit()
    db.refresh(booking)
    return booking
