from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import (
    Clan,
    ClanMembership,
    MarketplaceRequest,
    OpportunityRelayOffer,
    OpportunityRelayRun,
    User,
)
from app.db.notification_models import Notification
from app.services.demand_supply_intelligence_service import (
    find_relay_supply_target_candidates,
)
from app.services.notification_service import create_notification

SOURCE_TYPE_MARKETPLACE_REQUEST = "marketplace_request"
RUN_STATUS_OPEN = "open"
RUN_STATUS_BOUNDARY_CROSSED = "boundary_crossed"
RUN_STATUS_EXPIRED = "expired"
RUN_STATUS_CANCELLED = "cancelled"
OFFER_STATUS_OFFERED = "offered"
OFFER_STATUS_ACCEPTED = "accepted"
OFFER_STATUS_DECLINED = "declined"
OFFER_STATUS_EXPIRED = "expired"
OFFER_STATUS_CANCELLED = "cancelled"
PRIVACY_MODE_BRIDGE_MINIMUM = "bridge_minimum"
DEFAULT_RESPONSE_WINDOW_SECONDS = 72 * 60 * 60
DEFAULT_MAX_ACTIVE_OFFERS = 3
MAX_CONFIGURED_ACTIVE_OFFERS = 8
PROTECTED_TARGET_MARKER = "[GSN_VISIBILITY_SCOPE:protected_target]"


class RelayNotFound(ValueError):
    pass


class RelayForbidden(ValueError):
    pass


class RelayConflict(ValueError):
    pass


class RelayUnavailable(ValueError):
    pass


@dataclass(frozen=True)
class RelayTargetCandidate:
    target_clan_id: int
    bridge_user_ids: tuple[int, ...]
    supply_match_count: int

    def private_dict(self) -> dict[str, Any]:
        return {
            "bridge_count": len(self.bridge_user_ids),
            "supply_match_count": self.supply_match_count,
        }


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def configured_relay_window_seconds() -> int:
    return _configured_int(
        "GSN_OPPORTUNITY_RELAY_RESPONSE_WINDOW_SECONDS",
        DEFAULT_RESPONSE_WINDOW_SECONDS,
        minimum=3600,
        maximum=7 * 24 * 60 * 60,
    )


def configured_max_active_offers() -> int:
    return _configured_int(
        "GSN_OPPORTUNITY_RELAY_MAX_ACTIVE_OFFERS",
        DEFAULT_MAX_ACTIVE_OFFERS,
        minimum=1,
        maximum=MAX_CONFIGURED_ACTIVE_OFFERS,
    )


def relay_authorized_target_clan_ids_for_demand(
    db: Session,
    *,
    demand_id: int,
    current_user_id: int,
) -> list[int]:
    demand = db.get(MarketplaceRequest, int(demand_id))
    if not demand or int(getattr(demand, "user_id", 0) or 0) != int(current_user_id):
        return []
    rows = (
        db.query(OpportunityRelayRun.target_clan_id)
        .filter(
            OpportunityRelayRun.source_type == SOURCE_TYPE_MARKETPLACE_REQUEST,
            OpportunityRelayRun.source_id == int(demand_id),
            OpportunityRelayRun.origin_clan_id == int(getattr(demand, "clan_id", 0) or 0),
            OpportunityRelayRun.status == RUN_STATUS_BOUNDARY_CROSSED,
            OpportunityRelayRun.boundary_crossed_at.isnot(None),
        )
        .distinct()
        .all()
    )
    return [int(row[0]) for row in rows]


def relay_authorized_source_demands_for_target_clan(
    db: Session,
    *,
    target_clan_id: int,
) -> list[MarketplaceRequest]:
    now = now_utc()
    return (
        db.query(MarketplaceRequest)
        .join(
            OpportunityRelayRun,
            and_(
                OpportunityRelayRun.source_type == SOURCE_TYPE_MARKETPLACE_REQUEST,
                OpportunityRelayRun.source_id == MarketplaceRequest.id,
            ),
        )
        .filter(
            OpportunityRelayRun.target_clan_id == int(target_clan_id),
            OpportunityRelayRun.status == RUN_STATUS_BOUNDARY_CROSSED,
            OpportunityRelayRun.boundary_crossed_at.isnot(None),
            MarketplaceRequest.status == "open",
            (MarketplaceRequest.expires_at.is_(None)) | (MarketplaceRequest.expires_at >= now),
        )
        .order_by(MarketplaceRequest.created_at.desc(), MarketplaceRequest.id.desc())
        .all()
    )


def discover_relay_target_candidates(
    db: Session,
    *,
    request_id: int,
    current_user_id: int,
    limit: int = 10,
) -> list[RelayTargetCandidate]:
    demand = _require_source_demand_for_relay(
        db,
        request_id=int(request_id),
        current_user_id=int(current_user_id),
    )
    origin_clan_id = int(demand.clan_id)
    target_bridge_map = _active_overlap_bridge_user_ids(
        db,
        origin_clan_id=origin_clan_id,
        exclude_user_id=int(current_user_id),
    )
    if not target_bridge_map:
        return []

    target_clan_ids = sorted(target_bridge_map)
    supply_counts = find_relay_supply_target_candidates(
        db,
        demand=demand,
        target_clan_ids=target_clan_ids,
        limit_per_clan=1,
    )
    candidates: list[RelayTargetCandidate] = []
    for target_clan_id in target_clan_ids:
        supply_count = int(supply_counts.get(int(target_clan_id), 0) or 0)
        if supply_count <= 0:
            continue
        bridge_ids = tuple(target_bridge_map.get(int(target_clan_id), ()))
        if not bridge_ids:
            continue
        candidates.append(
            RelayTargetCandidate(
                target_clan_id=int(target_clan_id),
                bridge_user_ids=bridge_ids,
                supply_match_count=supply_count,
            )
        )
        if len(candidates) >= int(limit):
            break
    return candidates


def create_relay_run_for_demand(
    db: Session,
    *,
    request_id: int,
    current_user_id: int,
) -> OpportunityRelayRun:
    demand = _require_source_demand_for_relay(
        db,
        request_id=int(request_id),
        current_user_id=int(current_user_id),
    )
    existing = _existing_active_run_for_source(db, demand)
    if existing:
        return existing

    candidates = discover_relay_target_candidates(
        db,
        request_id=int(request_id),
        current_user_id=int(current_user_id),
        limit=1,
    )
    if not candidates:
        raise RelayUnavailable("No relay boundary currently has eligible bridges and plausible supply.")

    candidate = candidates[0]
    now = now_utc()
    window_seconds = configured_relay_window_seconds()
    max_active_offers = min(configured_max_active_offers(), len(candidate.bridge_user_ids))
    expires_at = now + timedelta(seconds=window_seconds)
    run = OpportunityRelayRun(
        source_type=SOURCE_TYPE_MARKETPLACE_REQUEST,
        source_id=int(demand.id),
        origin_clan_id=int(demand.clan_id),
        target_clan_id=int(candidate.target_clan_id),
        created_by_user_id=int(current_user_id),
        status=RUN_STATUS_OPEN,
        privacy_mode=PRIVACY_MODE_BRIDGE_MINIMUM,
        response_window_seconds=int(window_seconds),
        max_active_offers=int(max_active_offers),
        offered_at=now,
        expires_at=expires_at,
        meta_json=_json(
            {
                "source": "human_relay",
                "not_recommendation": True,
                "not_endorsement": True,
                "not_payment_proof": True,
                "pilot_hop_limit": 1,
                "candidate_supply_match_count": candidate.supply_match_count,
            }
        ),
        created_at=now,
        updated_at=now,
    )
    db.add(run)
    db.flush()

    for bridge_user_id in candidate.bridge_user_ids[:max_active_offers]:
        offer = OpportunityRelayOffer(
            relay_run_id=int(run.id),
            bridge_user_id=int(bridge_user_id),
            status=OFFER_STATUS_OFFERED,
            offered_at=now,
            expires_at=expires_at,
            idempotency_key=f"run:{int(run.id)}:bridge:{int(bridge_user_id)}",
            meta_json=_json({"privacy_mode": PRIVACY_MODE_BRIDGE_MINIMUM}),
            created_at=now,
            updated_at=now,
        )
        db.add(offer)
        db.flush()
        notification = create_notification(
            db,
            user_id=int(bridge_user_id),
            kind="opportunity_relay.offer",
            title="Help connect",
            message="A legitimate opportunity may be able to move through communities you belong to.",
            action_url=f"/app/notifications?relay_offer_id={int(offer.id)}",
            action_label="Help connect",
            commit=False,
            refresh=False,
        )
        db.flush()
        offer.notification_id = int(notification.id)

    db.commit()
    db.refresh(run)
    return run


def accept_relay_offer(
    db: Session,
    *,
    offer_id: int,
    current_user_id: int,
) -> OpportunityRelayRun:
    offer = _get_offer_for_actor(db, offer_id=int(offer_id), current_user_id=int(current_user_id))
    run = _get_run_for_update(db, int(offer.relay_run_id))
    now = now_utc()

    if offer.status == OFFER_STATUS_ACCEPTED and run.status == RUN_STATUS_BOUNDARY_CROSSED:
        return run
    if offer.status != OFFER_STATUS_OFFERED or run.status != RUN_STATUS_OPEN:
        raise RelayConflict("This relay offer is no longer active.")
    if _as_aware_utc(offer.expires_at) < now or _as_aware_utc(run.expires_at) < now:
        _expire_run_and_offers(db, run, now=now)
        db.commit()
        raise RelayConflict("This relay offer has expired.")

    demand = db.get(MarketplaceRequest, int(run.source_id))
    if not _live_public_source_demand(demand):
        raise RelayConflict("The source DemandBox request is no longer open.")
    if not _has_active_membership(db, user_id=int(current_user_id), clan_id=int(run.origin_clan_id)):
        raise RelayForbidden("Bridge membership in the origin community is no longer active.")
    if not _has_active_membership(db, user_id=int(current_user_id), clan_id=int(run.target_clan_id)):
        raise RelayForbidden("Bridge membership in the target community is no longer active.")

    offer.status = OFFER_STATUS_ACCEPTED
    offer.responded_at = now
    offer.updated_at = now
    run.status = RUN_STATUS_BOUNDARY_CROSSED
    run.boundary_crossed_at = now
    run.boundary_crossed_by_user_id = int(current_user_id)
    run.updated_at = now

    competing = (
        db.query(OpportunityRelayOffer)
        .filter(
            OpportunityRelayOffer.relay_run_id == int(run.id),
            OpportunityRelayOffer.id != int(offer.id),
            OpportunityRelayOffer.status == OFFER_STATUS_OFFERED,
        )
        .all()
    )
    for other in competing:
        other.status = OFFER_STATUS_CANCELLED
        other.responded_at = now
        other.updated_at = now
        _stale_notification(db, getattr(other, "notification_id", None), now=now)
    _stale_notification(db, getattr(offer, "notification_id", None), now=now)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise RelayConflict("Another bridge has already accepted this relay offer.") from exc
    db.refresh(run)
    return run


def decline_relay_offer(
    db: Session,
    *,
    offer_id: int,
    current_user_id: int,
    decline_reason: str | None = None,
) -> OpportunityRelayOffer:
    offer = _get_offer_for_actor(db, offer_id=int(offer_id), current_user_id=int(current_user_id))
    now = now_utc()
    if offer.status == OFFER_STATUS_DECLINED:
        return offer
    if offer.status != OFFER_STATUS_OFFERED:
        raise RelayConflict("This relay offer is no longer active.")
    offer.status = OFFER_STATUS_DECLINED
    offer.responded_at = now
    offer.decline_reason = str(decline_reason or "").strip()[:120] or None
    offer.updated_at = now
    _stale_notification(db, getattr(offer, "notification_id", None), now=now)
    db.commit()
    db.refresh(offer)
    return offer


def expire_due_relay_offers(db: Session) -> int:
    now = now_utc()
    changed = 0
    runs = (
        db.query(OpportunityRelayRun)
        .filter(
            OpportunityRelayRun.status == RUN_STATUS_OPEN,
            OpportunityRelayRun.expires_at < now,
        )
        .all()
    )
    for run in runs:
        _expire_run_and_offers(db, run, now=now)
        changed += 1
    if changed:
        db.commit()
    return changed


def relay_run_to_private_response(db: Session, run: OpportunityRelayRun) -> dict[str, Any]:
    return {
        "relay_run_id": int(run.id),
        "source_type": str(run.source_type),
        "source_id": int(run.source_id),
        "status": str(run.status),
        "privacy_mode": str(run.privacy_mode),
        "response_window_seconds": int(run.response_window_seconds),
        "offered_at": run.offered_at,
        "expires_at": run.expires_at,
        "boundary_crossed_at": run.boundary_crossed_at,
        "boundary_note": (
            "Relay status is operational only. It is not a recommendation, endorsement, "
            "payment proof, TrustScore, CCI, or portable reputation evidence."
        ),
    }


def relay_offer_to_bridge_payload(db: Session, offer: OpportunityRelayOffer) -> dict[str, Any]:
    run = db.get(OpportunityRelayRun, int(offer.relay_run_id))
    demand = db.get(MarketplaceRequest, int(run.source_id)) if run else None
    return {
        "offer_id": int(offer.id),
        "relay_run_id": int(offer.relay_run_id),
        "status": str(offer.status),
        "source_type": SOURCE_TYPE_MARKETPLACE_REQUEST,
        "opportunity_category": _safe_str(getattr(demand, "category", None)) or "General",
        "opportunity_area": _safe_str(getattr(demand, "area", None)) or None,
        "opportunity_context": "A legitimate opportunity may be able to move through communities you belong to.",
        "privacy_mode": PRIVACY_MODE_BRIDGE_MINIMUM,
        "offered_at": offer.offered_at,
        "expires_at": offer.expires_at,
        "actions": ["Help connect", "Not now"],
        "not_recommendation": True,
        "not_endorsement": True,
        "not_payment_proof": True,
    }


def list_my_relay_offers(db: Session, *, current_user_id: int) -> list[dict[str, Any]]:
    expire_due_relay_offers(db)
    rows = (
        db.query(OpportunityRelayOffer)
        .filter(
            OpportunityRelayOffer.bridge_user_id == int(current_user_id),
            OpportunityRelayOffer.status == OFFER_STATUS_OFFERED,
        )
        .order_by(OpportunityRelayOffer.offered_at.desc(), OpportunityRelayOffer.id.desc())
        .all()
    )
    return [relay_offer_to_bridge_payload(db, row) for row in rows]


def _configured_int(name: str, default: int, *, minimum: int, maximum: int) -> int:
    raw = str(os.getenv(name, "") or "").strip()
    try:
        value = int(raw) if raw else int(default)
    except ValueError:
        value = int(default)
    return max(minimum, min(maximum, value))


def _json(value: dict[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)


def _safe_str(value: Any) -> str:
    return str(value or "").strip()


def _as_aware_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _live_public_source_demand(demand: MarketplaceRequest | None) -> bool:
    if not demand:
        return False
    if int(getattr(demand, "clan_id", 0) or 0) <= 0:
        return False
    if _safe_str(getattr(demand, "status", None)).lower() != "open":
        return False
    expires_at = getattr(demand, "expires_at", None)
    if expires_at is not None and _as_aware_utc(expires_at) < now_utc():
        return False
    description = _safe_str(getattr(demand, "description", None))
    if PROTECTED_TARGET_MARKER in description:
        return False
    return True


def _require_source_demand_for_relay(
    db: Session,
    *,
    request_id: int,
    current_user_id: int,
) -> MarketplaceRequest:
    demand = db.get(MarketplaceRequest, int(request_id))
    if not demand or not _live_public_source_demand(demand):
        raise RelayNotFound("DemandBox request not found")
    if int(getattr(demand, "user_id", 0) or 0) != int(current_user_id):
        raise RelayForbidden("Only the requester can start relay for this DemandBox request.")
    if not _has_active_membership(
        db,
        user_id=int(current_user_id),
        clan_id=int(getattr(demand, "clan_id", 0) or 0),
    ):
        raise RelayForbidden("Requester must still belong to the origin community.")
    return demand


def _has_active_membership(db: Session, *, user_id: int, clan_id: int) -> bool:
    return (
        db.query(ClanMembership.id)
        .filter(
            ClanMembership.user_id == int(user_id),
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .first()
        is not None
    )


def _active_overlap_bridge_user_ids(
    db: Session,
    *,
    origin_clan_id: int,
    exclude_user_id: int,
) -> dict[int, tuple[int, ...]]:
    origin_members = (
        db.query(ClanMembership.user_id)
        .filter(
            ClanMembership.clan_id == int(origin_clan_id),
            ClanMembership.left_at.is_(None),
            ClanMembership.user_id != int(exclude_user_id),
        )
        .subquery()
    )
    rows = (
        db.query(ClanMembership.clan_id, ClanMembership.user_id)
        .join(origin_members, origin_members.c.user_id == ClanMembership.user_id)
        .join(User, User.id == ClanMembership.user_id)
        .join(Clan, Clan.id == ClanMembership.clan_id)
        .filter(
            ClanMembership.clan_id != int(origin_clan_id),
            ClanMembership.left_at.is_(None),
            Clan.status == "active",
        )
        .order_by(ClanMembership.clan_id.asc(), ClanMembership.user_id.asc())
        .all()
    )
    result: dict[int, list[int]] = {}
    for clan_id, user_id in rows:
        result.setdefault(int(clan_id), []).append(int(user_id))
    return {key: tuple(value) for key, value in result.items()}


def _existing_active_run_for_source(db: Session, demand: MarketplaceRequest) -> OpportunityRelayRun | None:
    return (
        db.query(OpportunityRelayRun)
        .filter(
            OpportunityRelayRun.source_type == SOURCE_TYPE_MARKETPLACE_REQUEST,
            OpportunityRelayRun.source_id == int(demand.id),
            OpportunityRelayRun.origin_clan_id == int(demand.clan_id),
            OpportunityRelayRun.status.in_([RUN_STATUS_OPEN, RUN_STATUS_BOUNDARY_CROSSED]),
        )
        .order_by(OpportunityRelayRun.created_at.desc(), OpportunityRelayRun.id.desc())
        .first()
    )


def _get_offer_for_actor(
    db: Session,
    *,
    offer_id: int,
    current_user_id: int,
) -> OpportunityRelayOffer:
    offer = db.get(OpportunityRelayOffer, int(offer_id))
    if not offer:
        raise RelayNotFound("Relay offer not found")
    if int(getattr(offer, "bridge_user_id", 0) or 0) != int(current_user_id):
        raise RelayNotFound("Relay offer not found")
    return offer


def _get_run_for_update(db: Session, run_id: int) -> OpportunityRelayRun:
    run = (
        db.query(OpportunityRelayRun)
        .filter(OpportunityRelayRun.id == int(run_id))
        .with_for_update()
        .first()
    )
    if not run:
        raise RelayNotFound("Relay run not found")
    return run


def _offers_for_run(db: Session, run_id: int) -> list[OpportunityRelayOffer]:
    return (
        db.query(OpportunityRelayOffer)
        .filter(OpportunityRelayOffer.relay_run_id == int(run_id))
        .order_by(OpportunityRelayOffer.id.asc())
        .all()
    )


def _stale_notification(db: Session, notification_id: int | None, *, now: datetime) -> None:
    if not notification_id:
        return
    notification = db.get(Notification, int(notification_id))
    if not notification:
        return
    notification.is_read = True
    notification.read_at = now


def _expire_run_and_offers(db: Session, run: OpportunityRelayRun, *, now: datetime) -> None:
    run.status = RUN_STATUS_EXPIRED
    run.updated_at = now
    for offer in _offers_for_run(db, int(run.id)):
        if offer.status != OFFER_STATUS_OFFERED:
            continue
        offer.status = OFFER_STATUS_EXPIRED
        offer.responded_at = now
        offer.updated_at = now
        _stale_notification(db, getattr(offer, "notification_id", None), now=now)
