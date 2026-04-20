from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import Clan, ClanMembership, MarketplaceRequest, User
from app.schemas.marketplace_requests import (
    MarketplaceRequestCreate,
    MarketplaceRequestOut,
    MarketplaceRequestUpdateStatus,
)

router = APIRouter(prefix="/marketplace/requests", tags=["marketplace-requests"])

MAX_ACTIVE_REQUESTS = 2
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


def _active_request_count(db: Session, user_id: int) -> int:
    now = _now_utc()
    return (
        db.query(MarketplaceRequest)
        .filter(
            MarketplaceRequest.user_id == user_id,
            MarketplaceRequest.status == "open",
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
    System-level visibility rule for Demand Box:

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


def _to_out(
    db: Session,
    row: MarketplaceRequest,
    user: User | None = None,
) -> MarketplaceRequestOut:
    owner = user or row.user
    clan = db.get(Clan, int(row.clan_id)) if getattr(row, "clan_id", None) else None
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
        whatsapp_number=row.whatsapp_number,
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
    )


@router.post("", response_model=MarketplaceRequestOut)
def create_marketplace_request(
    payload: MarketplaceRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.notification_service import create_notification

    _cleanup_expired_requests(db)

    active_count = _active_request_count(db, current_user.id)
    if active_count >= MAX_ACTIVE_REQUESTS:
        raise HTTPException(
            status_code=400,
            detail="You already have 2 active requests. Close one or wait for expiry before posting another.",
        )

    expires_in_hours = payload.expires_in_hours or DEFAULT_EXPIRY_HOURS
    urgency = _normalize_urgency(payload.urgency)
    request_clan_id = _require_request_clan(
        db,
        current_user_id=int(current_user.id),
        requested_clan_id=payload.clan_id,
    )

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

    for uid in visible_user_ids:
        if uid == current_user.id:
            continue

        create_notification(
            db,
            user_id=uid,
            kind="demand_new",
            title="New request near you",
            message=f"{current_user.email} needs: {payload.title}",
            action_url="/app/demand-box",
            action_label="View request",
        )

    create_notification(
        db,
        user_id=current_user.id,
        kind="demand_posted",
        title="Your request is live",
        message=f"Your request '{payload.title}' is now visible.",
        action_url="/app/demand-box",
        action_label="View your post",
    )

    return _to_out(db, row, current_user)


@router.get("", response_model=List[MarketplaceRequestOut])
def list_marketplace_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status: str = Query(default="open"),
    category: str | None = Query(default=None),
    urgency: str | None = Query(default=None),
    area: str | None = Query(default=None),
    mine_only: bool = Query(default=False),
    clan_id: int | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
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

    rows = q.order_by(MarketplaceRequest.created_at.desc()).limit(limit).all()

    return [_to_out(db, row) for row in rows]


@router.get("/{request_id}", response_model=MarketplaceRequestOut)
def get_marketplace_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    clan_id: int | None = Query(default=None),
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

    return _to_out(db, row)


@router.post("/{request_id}/status", response_model=MarketplaceRequestOut)
def update_marketplace_request_status(
    request_id: int,
    payload: MarketplaceRequestUpdateStatus,
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
    return _to_out(db, row, current_user)
