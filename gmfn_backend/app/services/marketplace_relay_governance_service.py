from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import (
    Clan,
    ClanMembership,
    MarketplaceRelayConsentEvent,
    MarketplaceRelayPolicy,
    MarketplaceRequest,
    OpportunityRelayOffer,
    OpportunityRelayRun,
)
from app.db.notification_models import Notification


RELAY_SCOPE_ONE_HOP = "one_hop"


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def require_community_admin(db: Session, *, clan_id: int, user_id: int, platform_admin: bool = False) -> None:
    if platform_admin:
        return
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(user_id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not membership or str(getattr(membership, "role", "") or "").lower() != "admin":
        raise PermissionError("Community admin access required")


def latest_relay_policy(db: Session, *, clan_id: int) -> MarketplaceRelayPolicy | None:
    return (
        db.query(MarketplaceRelayPolicy)
        .filter(MarketplaceRelayPolicy.clan_id == int(clan_id))
        .order_by(MarketplaceRelayPolicy.version.desc(), MarketplaceRelayPolicy.id.desc())
        .first()
    )


def relay_policy_payload(policy: MarketplaceRelayPolicy | None, *, clan_id: int) -> dict:
    if policy is None:
        return {
            "clan_id": int(clan_id),
            "version": 0,
            "outbound_enabled": False,
            "inbound_enabled": False,
            "issued_at": None,
            "issued_by_user_id": None,
            "defaulted": True,
        }
    return {
        "clan_id": int(policy.clan_id),
        "version": int(policy.version),
        "outbound_enabled": bool(policy.outbound_enabled),
        "inbound_enabled": bool(policy.inbound_enabled),
        "issued_at": policy.created_at,
        "issued_by_user_id": int(policy.issued_by_user_id),
        "defaulted": False,
    }


def issue_relay_policy(
    db: Session,
    *,
    clan_id: int,
    actor_user_id: int,
    outbound_enabled: bool,
    inbound_enabled: bool,
) -> MarketplaceRelayPolicy:
    db.query(Clan.id).filter(Clan.id == int(clan_id)).with_for_update().one()
    current_version = (
        db.query(func.max(MarketplaceRelayPolicy.version))
        .filter(MarketplaceRelayPolicy.clan_id == int(clan_id))
        .scalar()
        or 0
    )
    row = MarketplaceRelayPolicy(
        clan_id=int(clan_id),
        version=int(current_version) + 1,
        outbound_enabled=bool(outbound_enabled),
        inbound_enabled=bool(inbound_enabled),
        issued_by_user_id=int(actor_user_id),
        created_at=now_utc(),
    )
    db.add(row)
    db.flush()
    if not outbound_enabled or not inbound_enabled:
        _cancel_open_runs_for_policy_change(
            db,
            clan_id=int(clan_id),
            cancel_outbound=not bool(outbound_enabled),
            cancel_inbound=not bool(inbound_enabled),
        )
    db.commit()
    db.refresh(row)
    return row


def latest_relay_consent(
    db: Session, *, request_id: int
) -> MarketplaceRelayConsentEvent | None:
    return (
        db.query(MarketplaceRelayConsentEvent)
        .filter(MarketplaceRelayConsentEvent.marketplace_request_id == int(request_id))
        .order_by(
            MarketplaceRelayConsentEvent.version.desc(),
            MarketplaceRelayConsentEvent.id.desc(),
        )
        .first()
    )


def relay_consent_payload(
    event: MarketplaceRelayConsentEvent | None, *, request_id: int
) -> dict:
    if event is None:
        return {
            "request_id": int(request_id),
            "version": 0,
            "granted": False,
            "scope": RELAY_SCOPE_ONE_HOP,
            "recorded_at": None,
            "defaulted": True,
        }
    return {
        "request_id": int(event.marketplace_request_id),
        "version": int(event.version),
        "granted": bool(event.granted),
        "scope": str(event.scope),
        "recorded_at": event.created_at,
        "defaulted": False,
    }


def record_relay_consent(
    db: Session,
    *,
    demand: MarketplaceRequest,
    requester_user_id: int,
    granted: bool,
) -> MarketplaceRelayConsentEvent:
    if int(demand.user_id) != int(requester_user_id):
        raise PermissionError("Only the requester can change relay consent")
    db.query(MarketplaceRequest.id).filter(
        MarketplaceRequest.id == int(demand.id)
    ).with_for_update().one()
    current_version = (
        db.query(func.max(MarketplaceRelayConsentEvent.version))
        .filter(MarketplaceRelayConsentEvent.marketplace_request_id == int(demand.id))
        .scalar()
        or 0
    )
    event = MarketplaceRelayConsentEvent(
        marketplace_request_id=int(demand.id),
        requester_user_id=int(requester_user_id),
        version=int(current_version) + 1,
        granted=bool(granted),
        scope=RELAY_SCOPE_ONE_HOP,
        created_at=now_utc(),
    )
    db.add(event)
    db.flush()
    if not granted:
        _cancel_open_runs_for_request(db, request_id=int(demand.id))
    return event


def relay_consent_is_current(db: Session, *, demand: MarketplaceRequest) -> bool:
    event = latest_relay_consent(db, request_id=int(demand.id))
    return bool(event and event.granted and event.scope == RELAY_SCOPE_ONE_HOP)


def current_relay_governance_authorizes(
    db: Session,
    *,
    demand: MarketplaceRequest,
    origin_clan_id: int,
    target_clan_id: int,
) -> bool:
    if int(getattr(demand, "clan_id", 0) or 0) != int(origin_clan_id):
        return False
    if int(origin_clan_id) == int(target_clan_id):
        return False
    origin_policy = latest_relay_policy(db, clan_id=int(origin_clan_id))
    target_policy = latest_relay_policy(db, clan_id=int(target_clan_id))
    return bool(
        origin_policy
        and origin_policy.outbound_enabled
        and target_policy
        and target_policy.inbound_enabled
        and relay_consent_is_current(db, demand=demand)
    )


def inbound_enabled_clan_ids(db: Session, clan_ids: Iterable[int]) -> set[int]:
    requested = {int(value) for value in clan_ids if int(value) > 0}
    if not requested:
        return set()
    latest = (
        db.query(
            MarketplaceRelayPolicy.clan_id.label("clan_id"),
            func.max(MarketplaceRelayPolicy.version).label("version"),
        )
        .filter(MarketplaceRelayPolicy.clan_id.in_(requested))
        .group_by(MarketplaceRelayPolicy.clan_id)
        .subquery()
    )
    rows = (
        db.query(MarketplaceRelayPolicy.clan_id)
        .join(
            latest,
            (latest.c.clan_id == MarketplaceRelayPolicy.clan_id)
            & (latest.c.version == MarketplaceRelayPolicy.version),
        )
        .filter(MarketplaceRelayPolicy.inbound_enabled.is_(True))
        .all()
    )
    return {int(row[0]) for row in rows}


def _cancel_open_runs_for_request(db: Session, *, request_id: int) -> None:
    runs = (
        db.query(OpportunityRelayRun)
        .filter(
            OpportunityRelayRun.source_type == "marketplace_request",
            OpportunityRelayRun.source_id == int(request_id),
            OpportunityRelayRun.status == "open",
        )
        .all()
    )
    _cancel_runs(db, runs)


def _cancel_open_runs_for_policy_change(
    db: Session,
    *,
    clan_id: int,
    cancel_outbound: bool,
    cancel_inbound: bool,
) -> None:
    filters = []
    if cancel_outbound:
        filters.append(OpportunityRelayRun.origin_clan_id == int(clan_id))
    if cancel_inbound:
        filters.append(OpportunityRelayRun.target_clan_id == int(clan_id))
    if not filters:
        return
    query = db.query(OpportunityRelayRun).filter(OpportunityRelayRun.status == "open")
    from sqlalchemy import or_

    runs = query.filter(or_(*filters)).all()
    _cancel_runs(db, runs)


def _cancel_runs(db: Session, runs: list[OpportunityRelayRun]) -> None:
    now = now_utc()
    for run in runs:
        run.status = "cancelled"
        run.cancelled_at = now
        run.updated_at = now
        offers = (
            db.query(OpportunityRelayOffer)
            .filter(
                OpportunityRelayOffer.relay_run_id == int(run.id),
                OpportunityRelayOffer.status == "offered",
            )
            .all()
        )
        for offer in offers:
            offer.status = "cancelled"
            offer.responded_at = now
            offer.updated_at = now
            if offer.notification_id:
                notification = db.get(Notification, int(offer.notification_id))
                if notification:
                    notification.is_read = True
                    notification.read_at = now
