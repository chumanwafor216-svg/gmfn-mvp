from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy import and_, or_
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import Clan, ClanMembership, MarketplaceRequest, User, UserSettings
from app.services.community_integrity_service import _user_settings_table_exists
from app.services.community_domain_feature_policy import require_domain_demand_box_enabled
from app.schemas.marketplace_requests import (
    MarketplaceRequestCreate,
    MarketplaceRequestOut,
    MarketplaceRequestUpdateStatus,
)

router = APIRouter(prefix="/marketplace/requests", tags=["marketplace-requests"])

MAX_REQUESTS_PER_USER_24H = 5
REQUEST_QUOTA_WINDOW_HOURS = 24
DEFAULT_EXPIRY_HOURS = 48


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_urgency(value: str | None) -> str:
    raw = str(value or "medium").strip().lower()
    if raw not in {"low", "medium", "high"}:
        return "medium"
    return raw


def _cleanup_expired_requests(db: Session) -> None:
    now = _now_utc()
    rows = (
        db.query(MarketplaceRequest)
        .filter(
            MarketplaceRequest.status == "open",
            MarketplaceRequest.expires_at.isnot(None),
            MarketplaceRequest.expires_at < now,
        )
        .all()
    )
    changed = False
    for row in rows:
        row.status = "expired"
        changed = True
    if changed:
        db.commit()


def _recent_open_request_count(db: Session, user_id: int) -> int:
    now = _now_utc()
    window_start = now - timedelta(hours=REQUEST_QUOTA_WINDOW_HOURS)
    return (
        db.query(MarketplaceRequest)
        .filter(
            MarketplaceRequest.user_id == user_id,
            MarketplaceRequest.status == "open",
            MarketplaceRequest.created_at >= window_start,
            (
                (MarketplaceRequest.expires_at.is_(None))
                | (MarketplaceRequest.expires_at >= now)
            ),
        )
        .count()
    )


def _community_code(clan: Clan | None) -> str | None:
    if not clan:
        return None
    saved = str(getattr(clan, "community_code", "") or "").strip()
    if saved:
        return saved
    return f"GMFN-C-{int(clan.id):06d}"


def _approved_whatsapp_contact(db: Session, user: User | None) -> str | None:
    if not user:
        return None
    phone = str(getattr(user, "phone_e164", "") or "").strip()
    if not phone or not getattr(user, "phone_verified_at", None):
        return None
    if not _user_settings_table_exists(db):
        return phone
    try:
        settings = (
            db.query(UserSettings)
            .filter(UserSettings.user_id == int(user.id))
            .first()
        )
    except OperationalError:
        db.rollback()
        return phone
    if settings is not None and not bool(getattr(settings, "show_whatsapp_public", False)):
        return None
    return phone


def _active_clan_ids_for_user(db: Session, user_id: int) -> list[int]:
    rows = (
        db.query(ClanMembership.clan_id)
        .filter(
            ClanMembership.user_id == int(user_id),
            ClanMembership.left_at.is_(None),
        )
        .distinct()
        .all()
    )
    return [int(row[0]) for row in rows]


def _require_request_clan(
    db: Session,
    *,
    current_user_id: int,
    requested_clan_id: int | None,
) -> int:
    active_clan_ids = _active_clan_ids_for_user(db, int(current_user_id))

    if requested_clan_id is None:
        if len(active_clan_ids) == 1:
            return int(active_clan_ids[0])
        if len(active_clan_ids) > 1:
            raise HTTPException(
                status_code=400,
                detail="Choose the community this demand should come from.",
            )
        raise HTTPException(
            status_code=400,
            detail="Join or create a community before posting a demand.",
        )

    clan = db.get(Clan, int(requested_clan_id))
    if not clan:
        raise HTTPException(status_code=404, detail="Community not found")

    if int(requested_clan_id) not in active_clan_ids:
        raise HTTPException(
            status_code=403,
            detail="You must belong to this community before posting a demand from it.",
        )

    return int(requested_clan_id)


def _visible_user_ids_for_marketplace_requests(
    db: Session,
    current_user_id: int,
    clan_id: int | None = None,
) -> list[int]:
    """
    System-level visibility rule for DemandBox:

    - Request ownership is user-level (one member creates the request)
    - Visibility is membership-driven
    - If clan_id is provided, show requests from users visible in that community only
    - If clan_id is not provided, show requests from users who share any community
      with the current user
    """
    if clan_id is not None:
        membership_in_target = (
            db.query(ClanMembership)
            .filter(
                ClanMembership.user_id == current_user_id,
                ClanMembership.clan_id == clan_id,
                ClanMembership.left_at.is_(None),
            )
            .first()
        )
        if not membership_in_target:
            return []

        rows = (
            db.query(ClanMembership.user_id)
            .filter(
                ClanMembership.clan_id == clan_id,
                ClanMembership.left_at.is_(None),
            )
            .distinct()
            .all()
        )
        return [row[0] for row in rows]

    my_clan_rows = (
        db.query(ClanMembership.clan_id)
        .filter(
            ClanMembership.user_id == current_user_id,
            ClanMembership.left_at.is_(None),
        )
        .distinct()
        .all()
    )
    my_clan_ids = [row[0] for row in my_clan_rows]
    if not my_clan_ids:
        return [current_user_id]

    rows = (
        db.query(ClanMembership.user_id)
        .filter(
            ClanMembership.clan_id.in_(my_clan_ids),
            ClanMembership.left_at.is_(None),
        )
        .distinct()
        .all()
    )
    visible_ids = [row[0] for row in rows]
    if current_user_id not in visible_ids:
        visible_ids.append(current_user_id)
    return visible_ids


_HANDLE_PATTERN = re.compile(r"@([A-Za-z0-9][A-Za-z0-9_.-]{2,63})")


def _safe_text(value: object) -> str:
    return str(value or "").strip()


def _request_text(row: MarketplaceRequest) -> str:
    return " ".join(
        part
        for part in [
            _safe_text(getattr(row, "title", None)),
            _safe_text(getattr(row, "description", None)),
            _safe_text(getattr(row, "category", None)),
            _safe_text(getattr(row, "area", None)),
        ]
        if part
    )


def _is_ask_community_request(row: MarketplaceRequest) -> bool:
    category = _safe_text(getattr(row, "category", None)).lower()
    description = _safe_text(getattr(row, "description", None)).lower()
    return (
        category in {"community ask", "ask community"}
        or "community ask posted through demandbox" in description
    )


def _request_source(row: MarketplaceRequest) -> str:
    return "ask_community" if _is_ask_community_request(row) else "demand_box"


def _request_source_label(row: MarketplaceRequest) -> str:
    return "Ask Community" if _request_source(row) == "ask_community" else "DemandBox"


def _request_need_type(row: MarketplaceRequest) -> str:
    return (
        _safe_text(getattr(row, "category", None))
        or _safe_text(getattr(row, "area", None))
        or "General"
    )


def _mentioned_handles(row: MarketplaceRequest) -> list[str]:
    found: list[str] = []
    seen: set[str] = set()
    for match in _HANDLE_PATTERN.finditer(_request_text(row)):
        token = match.group(1).strip(".,;:!?)]}")
        if not token:
            continue
        handle = f"@{token}"
        key = handle.lower()
        if key in seen:
            continue
        seen.add(key)
        found.append(handle)
        if len(found) >= 8:
            break
    return found


def _handle_key(value: str) -> str:
    return _safe_text(value).lstrip("@").lower()


def _mentioned_member_ids(db: Session, row: MarketplaceRequest) -> set[int]:
    handle_keys = {_handle_key(handle) for handle in _mentioned_handles(row)}
    handle_keys.discard("")
    clan_id = getattr(row, "clan_id", None)
    if not handle_keys or not clan_id:
        return set()

    rows = (
        db.query(User.id, User.gmfn_id)
        .join(ClanMembership, ClanMembership.user_id == User.id)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
            User.gmfn_id.isnot(None),
        )
        .all()
    )
    return {
        int(user_id)
        for user_id, gmfn_id in rows
        if _handle_key(str(gmfn_id)) in handle_keys
    }


def _request_queue_keys(
    row: MarketplaceRequest,
    *,
    current_user_id: int | None,
    mentioned_member_ids: set[int] | None = None,
) -> list[str]:
    keys: list[str] = []
    tagged_member_ids = mentioned_member_ids or set()
    is_mine = current_user_id is not None and int(row.user_id) == int(current_user_id)
    if is_mine:
        keys.append("mine")
    else:
        keys.append("for_me")
    if current_user_id is not None and int(current_user_id) in tagged_member_ids:
        keys.append("tagged_for_me")
    if tagged_member_ids:
        keys.append("direct_tag")
    if _is_ask_community_request(row):
        keys.append("ask_community")
    if _normalize_urgency(getattr(row, "urgency", None)) == "high":
        keys.append("urgent")
    need_key = _request_need_type(row).strip().lower().replace(" ", "_")
    if need_key:
        keys.append(f"need_type:{need_key}")
    return keys


def _request_routing_status(
    row: MarketplaceRequest,
    *,
    mentioned_member_ids: set[int] | None = None,
) -> str:
    if mentioned_member_ids:
        return "member_tagged"
    return "handle_text_detected" if _mentioned_handles(row) else "community_queue"


def _request_routing_hint(
    row: MarketplaceRequest,
    *,
    mentioned_member_ids: set[int] | None = None,
) -> str:
    if mentioned_member_ids:
        return "Matched GSN member handles were routed to the tagged queue."
    if _mentioned_handles(row):
        return "Handle text was detected, but no same-community GSN member was matched."
    if _is_ask_community_request(row):
        return "Visible in the Ask Community lane and the wider community queue."
    return "Visible through the community queue."


def _request_action_url(row: MarketplaceRequest, queue: str | None = None) -> str:
    clan_id = getattr(row, "clan_id", None)
    queue_key = queue or ("ask_community" if _is_ask_community_request(row) else "open")
    if clan_id:
        return f"/app/demand-box?clan_id={int(clan_id)}&queue={queue_key}"
    return f"/app/demand-box?queue={queue_key}"


def _to_out(
    db: Session,
    row: MarketplaceRequest,
    user: User | None = None,
    current_user_id: int | None = None,
) -> MarketplaceRequestOut:
    owner = row.user or db.get(User, int(row.user_id)) or user
    is_mine = current_user_id is not None and int(row.user_id) == int(current_user_id)
    clan = db.get(Clan, int(row.clan_id)) if getattr(row, "clan_id", None) else None
    mentioned_member_ids = _mentioned_member_ids(db, row)
    is_tagged_for_me = (
        current_user_id is not None and int(current_user_id) in mentioned_member_ids
    )
    return MarketplaceRequestOut(
        id=row.id,
        clan_id=getattr(row, "clan_id", None),
        user_id=row.user_id,
        community_code=_community_code(clan),
        clan_name=getattr(clan, "name", None) if clan else None,
        marketplace_name=getattr(clan, "marketplace_name", None) if clan else None,
        title=row.title,
        description=row.description,
        category=row.category,
        urgency=row.urgency,
        area=row.area,
        whatsapp_number=row.whatsapp_number or _approved_whatsapp_contact(db, owner),
        payment_mode=row.payment_mode,
        allow_trust_credit=bool(row.allow_trust_credit),
        status=row.status,
        created_at=row.created_at,
        expires_at=row.expires_at,
        requester_name=getattr(owner, "email", None),
        requester_nickname=None,
        requester_gmfn_id=getattr(owner, "gmfn_id", None),
        requester_email=getattr(owner, "email", None),
        requester_trust_score=(
            float(owner.trust_score)
            if getattr(owner, "trust_score", None) is not None
            else None
        ),
        requester_trust_band=getattr(owner, "trust_band", None),
        is_mine=is_mine,
        mine=is_mine,
        source=_request_source(row),
        source_label=_request_source_label(row),
        need_type=_request_need_type(row),
        queue_keys=_request_queue_keys(
            row,
            current_user_id=current_user_id,
            mentioned_member_ids=mentioned_member_ids,
        ),
        mentioned_handles=_mentioned_handles(row),
        mentioned_member_count=len(mentioned_member_ids),
        is_tagged_for_me=is_tagged_for_me,
        routing_status=_request_routing_status(
            row,
            mentioned_member_ids=mentioned_member_ids,
        ),
        routing_hint=_request_routing_hint(
            row,
            mentioned_member_ids=mentioned_member_ids,
        ),
    )


@router.post("", response_model=MarketplaceRequestOut)
def create_marketplace_request(
    payload: MarketplaceRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.notification_service import create_notification

    _cleanup_expired_requests(db)

    recent_open_count = _recent_open_request_count(db, current_user.id)
    if recent_open_count >= MAX_REQUESTS_PER_USER_24H:
        raise HTTPException(
            status_code=400,
            detail=(
                "You already have 5 active DemandBox requests in 24 hours. "
                "Close one or wait before posting another."
            ),
        )

    expires_in_hours = payload.expires_in_hours or DEFAULT_EXPIRY_HOURS
    urgency = _normalize_urgency(payload.urgency)
    request_clan_id = _require_request_clan(
        db,
        current_user_id=int(current_user.id),
        requested_clan_id=payload.clan_id,
    )
    require_domain_demand_box_enabled(db, clan_id=request_clan_id)

    row = MarketplaceRequest(
        clan_id=request_clan_id,
        user_id=current_user.id,
        title=payload.title.strip(),
        description=(payload.description or "").strip() or None,
        category=(payload.category or "").strip() or None,
        urgency=urgency,
        area=(payload.area or "").strip() or None,
        whatsapp_number=(payload.whatsapp_number or "").strip() or None,
        payment_mode=(payload.payment_mode or "").strip() or None,
        allow_trust_credit=bool(payload.allow_trust_credit),
        status="open",
        created_at=_now_utc(),
        expires_at=_now_utc() + timedelta(hours=expires_in_hours),
    )

    db.add(row)
    db.commit()
    db.refresh(row)

    visible_user_ids = _visible_user_ids_for_marketplace_requests(
        db=db,
        current_user_id=current_user.id,
        clan_id=request_clan_id,
    )
    mentioned_member_ids = _mentioned_member_ids(db, row)
    target_user_ids = [
        uid
        for uid in visible_user_ids
        if uid != current_user.id
        and (not mentioned_member_ids or uid in mentioned_member_ids)
    ]

    for uid in target_user_ids:
        tagged_for_recipient = uid in mentioned_member_ids
        create_notification(
            db,
            user_id=uid,
            kind="demand_tagged" if tagged_for_recipient else "demand_new",
            title=(
                "Demand tagged for you"
                if tagged_for_recipient
                else "New request near you"
            ),
            message=f"{current_user.email} needs: {payload.title}",
            action_url=_request_action_url(
                row,
                "tagged" if tagged_for_recipient else None,
            ),
            action_label="View request",
        )

    create_notification(
        db,
        user_id=current_user.id,
        kind="demand_posted",
        title="Your request is live",
        message=f"Your request '{payload.title}' is now visible.",
        action_url=_request_action_url(row),
        action_label="View your post",
    )

    return _to_out(db, row, current_user, current_user_id=int(current_user.id))


@router.get("", response_model=List[MarketplaceRequestOut])
def list_marketplace_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status: str = Query(default="open"),
    category: str | None = Query(default=None),
    urgency: str | None = Query(default=None),
    area: str | None = Query(default=None),
    mine_only: bool = Query(default=False),
    clan_id: int | None = Query(default=None, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    _cleanup_expired_requests(db)

    q = db.query(MarketplaceRequest).join(User, User.id == MarketplaceRequest.user_id)

    if mine_only:
        q = q.filter(MarketplaceRequest.user_id == current_user.id)
        if clan_id is not None:
            q = q.filter(MarketplaceRequest.clan_id == int(clan_id))
    else:
        if clan_id is not None:
            visible_user_ids = _visible_user_ids_for_marketplace_requests(
                db=db,
                current_user_id=current_user.id,
                clan_id=clan_id,
            )
            if not visible_user_ids:
                return []
            q = q.filter(
                MarketplaceRequest.clan_id == int(clan_id),
                MarketplaceRequest.user_id.in_(visible_user_ids),
            )
        else:
            visible_clan_ids = _active_clan_ids_for_user(db, int(current_user.id))
            visible_user_ids = _visible_user_ids_for_marketplace_requests(
                db=db,
                current_user_id=current_user.id,
                clan_id=None,
            )
            visibility_filters = [MarketplaceRequest.user_id == current_user.id]
            if visible_clan_ids:
                visibility_filters.append(
                    MarketplaceRequest.clan_id.in_(visible_clan_ids)
                )
            if visible_user_ids:
                visibility_filters.append(
                    and_(
                        MarketplaceRequest.clan_id.is_(None),
                        MarketplaceRequest.user_id.in_(visible_user_ids),
                    )
                )
            q = q.filter(or_(*visibility_filters))

    status_raw = str(status or "open").strip().lower()
    if status_raw == "open":
        q = q.filter(MarketplaceRequest.status == "open")
    elif status_raw == "closed":
        q = q.filter(
            MarketplaceRequest.status.in_(["fulfilled", "cancelled", "expired"])
        )
    elif status_raw != "all":
        q = q.filter(MarketplaceRequest.status == status_raw)

    if category:
        q = q.filter(MarketplaceRequest.category.ilike(f"%{category.strip()}%"))

    if urgency:
        q = q.filter(MarketplaceRequest.urgency == _normalize_urgency(urgency))

    if area:
        q = q.filter(MarketplaceRequest.area.ilike(f"%{area.strip()}%"))

    offset_value = offset if isinstance(offset, int) else 0

    rows = (
        q.order_by(MarketplaceRequest.created_at.desc())
        .offset(offset_value)
        .limit(limit)
        .all()
    )

    return [_to_out(db, row, current_user_id=int(current_user.id)) for row in rows]


@router.get("/{request_id}", response_model=MarketplaceRequestOut)
def get_marketplace_request(
    request_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    clan_id: int | None = Query(default=None, ge=1),
):
    _cleanup_expired_requests(db)

    q = db.query(MarketplaceRequest).join(User, User.id == MarketplaceRequest.user_id)

    if clan_id is not None:
        visible_user_ids = _visible_user_ids_for_marketplace_requests(
            db=db,
            current_user_id=current_user.id,
            clan_id=clan_id,
        )
        if not visible_user_ids:
            raise HTTPException(status_code=404, detail="Request not found")
        q = q.filter(
            MarketplaceRequest.clan_id == int(clan_id),
            MarketplaceRequest.user_id.in_(visible_user_ids),
        )
    else:
        visible_clan_ids = _active_clan_ids_for_user(db, int(current_user.id))
        visible_user_ids = _visible_user_ids_for_marketplace_requests(
            db=db,
            current_user_id=current_user.id,
            clan_id=None,
        )
        visibility_filters = [MarketplaceRequest.user_id == current_user.id]
        if visible_clan_ids:
            visibility_filters.append(MarketplaceRequest.clan_id.in_(visible_clan_ids))
        if visible_user_ids:
            visibility_filters.append(
                and_(
                    MarketplaceRequest.clan_id.is_(None),
                    MarketplaceRequest.user_id.in_(visible_user_ids),
                )
            )
        q = q.filter(or_(*visibility_filters))

    row = q.filter(MarketplaceRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    return _to_out(db, row, current_user_id=int(current_user.id))


@router.post("/{request_id}/status", response_model=MarketplaceRequestOut)
def update_marketplace_request_status(
    payload: MarketplaceRequestUpdateStatus,
    request_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _cleanup_expired_requests(db)

    row = (
        db.query(MarketplaceRequest)
        .filter(MarketplaceRequest.id == request_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    if row.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own request",
        )

    new_status = str(payload.status).strip().lower()
    if new_status not in {"fulfilled", "cancelled"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    row.status = new_status
    db.commit()
    db.refresh(row)
    return _to_out(db, row, current_user, current_user_id=int(current_user.id))
