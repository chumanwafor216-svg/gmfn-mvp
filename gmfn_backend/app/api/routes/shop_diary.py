from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import (
    ClanMembership,
    MarketplaceProduct,
    MarketplaceShop,
    ProtectedTradeRecord,
    ShopDiaryEntry,
    User,
)
from app.schemas.shop_diary import ShopDiaryEntryCreateIn, ShopDiaryEntryListOut, ShopDiaryEntryOut
from app.services.community_domain_feature_policy import require_domain_shop_diary_enabled
from app.services.protected_trade_service import derive_protected_trade_outcome
from app.services.trust_events_services import log_trust_event


router = APIRouter(prefix="/shop-diaries", tags=["shop-diaries"])

ACTIVITY_LABELS = {
    "work_completed": "Work completed",
    "sale_order": "Sale/order",
    "product_update": "New stock/product update",
    "business_milestone": "Business milestone",
    "event_activity": "Event/activity",
    "customer_delivery": "Customer delivery",
    "other_update": "Other update",
}

EVIDENCE_LABELS = {
    "owner_update": "Owner update",
    "system_recorded": "Recorded by GSN",
    "counterparty_confirmed": "Confirmed activity",
    "gsn_insight": "GSN insight",
}

EVIDENCE_BOUNDARIES = {
    "owner_update": "The shop owner says this happened. It is not formal Trade Evidence by itself.",
    "system_recorded": "GSN recorded the platform activity, but that alone does not prove real-world completion.",
    "counterparty_confirmed": "This update is linked to stronger Trade Evidence with confirmation signals.",
    "gsn_insight": "This is a system interpretation and should stay out of public diary claims unless explicitly approved.",
}

CONFIRMED_TRADE_STATES = {"MUTUALLY_CONFIRMED", "PROVIDER_REPORTED_COMPLETED", "REQUESTER_REPORTED_RECEIVED"}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_str(value: Any, default: str = "") -> str:
    text = str(value or "").strip()
    return text or default


def _is_admin(user: Any) -> bool:
    return bool(getattr(user, "is_admin", False)) or _safe_str(getattr(user, "role", "")).lower() == "admin"


def _active_membership(db: Session, *, user_id: int, clan_id: Optional[int]) -> Optional[ClanMembership]:
    if clan_id is None:
        return None
    return (
        db.query(ClanMembership)
        .filter(ClanMembership.user_id == int(user_id))
        .filter(ClanMembership.clan_id == int(clan_id))
        .filter(ClanMembership.left_at.is_(None))
        .first()
    )


def _require_owner_shop(db: Session, *, shop_id: int, current_user: User) -> MarketplaceShop:
    shop = db.query(MarketplaceShop).filter(MarketplaceShop.id == int(shop_id)).first()
    if not shop or not bool(getattr(shop, "is_active", True)):
        raise HTTPException(status_code=404, detail="Shop not found")
    if int(shop.owner_user_id) != int(current_user.id) and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Only the shop owner can manage this diary")
    return shop


def _validate_product_link(
    db: Session,
    *,
    product_id: Optional[int],
    shop_id: int,
    owner_user_id: int,
) -> Optional[MarketplaceProduct]:
    if not product_id:
        return None
    product = db.query(MarketplaceProduct).filter(MarketplaceProduct.id == int(product_id)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Linked product was not found")
    if int(product.shop_id) != int(shop_id) or int(product.seller_user_id) != int(owner_user_id):
        raise HTTPException(status_code=403, detail="Linked product must belong to this shop")
    return product


def _validate_trade_link(
    db: Session,
    *,
    trade_id: Optional[int],
    shop_id: int,
    current_user: User,
) -> tuple[Optional[ProtectedTradeRecord], Optional[dict[str, Any]]]:
    if not trade_id:
        return None, None
    trade = db.query(ProtectedTradeRecord).filter(ProtectedTradeRecord.id == int(trade_id)).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Linked Trade Evidence record was not found")
    participant_ids = {
        int(value)
        for value in (trade.creator_user_id, trade.seller_user_id, trade.buyer_user_id)
        if value is not None
    }
    if int(current_user.id) not in participant_ids and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="You cannot link that Trade Evidence record")
    if trade.shop_id is None or int(trade.shop_id) != int(shop_id):
        raise HTTPException(status_code=403, detail="Trade Evidence must belong to this shop")
    outcome = derive_protected_trade_outcome(trade)
    return trade, outcome


def _resolved_evidence_class(requested: str, trade_outcome: Optional[dict[str, Any]]) -> str:
    requested = _safe_str(requested, "owner_update").lower()
    if requested == "counterparty_confirmed":
        state = _safe_str((trade_outcome or {}).get("derived_outcome_state"))
        if state in CONFIRMED_TRADE_STATES:
            return "counterparty_confirmed"
        raise HTTPException(
            status_code=400,
            detail="Linked Trade Evidence is not confirmed enough for a Shop Diary confirmed activity",
        )
    if requested == "system_recorded":
        return "owner_update"
    if requested == "gsn_insight":
        return "owner_update"
    return "owner_update"


def _entry_out(db: Session, entry: ShopDiaryEntry) -> dict[str, Any]:
    product = None
    trade = None
    trade_outcome = None
    if entry.product_id:
        product = db.query(MarketplaceProduct).filter(MarketplaceProduct.id == int(entry.product_id)).first()
    if entry.protected_trade_id:
        trade = db.query(ProtectedTradeRecord).filter(ProtectedTradeRecord.id == int(entry.protected_trade_id)).first()
        if trade:
            trade_outcome = derive_protected_trade_outcome(trade)

    evidence_class = _safe_str(getattr(entry, "evidence_class", None), "owner_update")
    return {
        "id": int(entry.id),
        "clan_id": int(entry.clan_id) if entry.clan_id is not None else None,
        "shop_id": int(entry.shop_id),
        "owner_user_id": int(entry.owner_user_id),
        "activity_type": entry.activity_type,
        "activity_label": ACTIVITY_LABELS.get(entry.activity_type, "Other update"),
        "evidence_class": evidence_class,
        "evidence_label": EVIDENCE_LABELS.get(evidence_class, "Owner update"),
        "evidence_boundary": EVIDENCE_BOUNDARIES.get(evidence_class, EVIDENCE_BOUNDARIES["owner_update"]),
        "note": entry.note,
        "image_url": entry.image_url,
        "video_url": entry.video_url,
        "occurred_at": entry.occurred_at,
        "product_id": int(entry.product_id) if entry.product_id is not None else None,
        "product_name": _safe_str(getattr(product, "name", None)) or None,
        "protected_trade_id": int(entry.protected_trade_id) if entry.protected_trade_id is not None else None,
        "protected_trade_code": _safe_str(getattr(trade, "trade_code", None)) or None,
        "protected_trade_outcome": trade_outcome,
        "is_public": bool(entry.is_public),
        "is_active": bool(entry.is_active),
        "created_at": entry.created_at,
        "updated_at": entry.updated_at,
    }


@router.get("/me", response_model=ShopDiaryEntryListOut)
def list_my_shop_diary_entries(
    shop_id: int = Query(..., ge=1),
    include_inactive: bool = Query(default=False),
    limit: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shop = _require_owner_shop(db, shop_id=shop_id, current_user=current_user)
    q = db.query(ShopDiaryEntry).filter(ShopDiaryEntry.shop_id == int(shop.id))
    if not include_inactive:
        q = q.filter(ShopDiaryEntry.is_active.is_(True))
    rows = q.order_by(ShopDiaryEntry.occurred_at.desc(), ShopDiaryEntry.id.desc()).limit(int(limit)).all()
    return {"items": [_entry_out(db, row) for row in rows]}


@router.get("/public/{gmfn_id}", response_model=ShopDiaryEntryListOut)
def list_public_shop_diary_entries(
    gmfn_id: str,
    clan_id: Optional[int] = Query(default=None, ge=1),
    limit: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    owner = db.query(User).filter(User.gmfn_id == gmfn_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Shop owner not found")
    q = db.query(MarketplaceShop).filter(MarketplaceShop.owner_user_id == int(owner.id)).filter(MarketplaceShop.is_active.is_(True))
    if clan_id is not None:
        q = q.filter(MarketplaceShop.clan_id == int(clan_id))
    shop = q.order_by(MarketplaceShop.created_at.desc(), MarketplaceShop.id.desc()).first()
    if not shop:
        raise HTTPException(status_code=404, detail="Shop not found")
    rows = (
        db.query(ShopDiaryEntry)
        .filter(ShopDiaryEntry.shop_id == int(shop.id))
        .filter(ShopDiaryEntry.is_public.is_(True))
        .filter(ShopDiaryEntry.is_active.is_(True))
        .filter(ShopDiaryEntry.evidence_class != "gsn_insight")
        .order_by(ShopDiaryEntry.occurred_at.desc(), ShopDiaryEntry.id.desc())
        .limit(int(limit))
        .all()
    )
    return {"items": [_entry_out(db, row) for row in rows]}


@router.post("", response_model=ShopDiaryEntryOut, status_code=201)
def create_shop_diary_entry(
    payload: ShopDiaryEntryCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shop = _require_owner_shop(db, shop_id=int(payload.shop_id), current_user=current_user)
    clan_id = int(payload.clan_id or shop.clan_id or 0) or None
    if clan_id is not None and not _is_admin(current_user):
        membership = _active_membership(db, user_id=int(current_user.id), clan_id=clan_id)
        if not membership:
            raise HTTPException(status_code=403, detail="Use a community where this shop owner is an active member")
        require_domain_shop_diary_enabled(db, clan_id=clan_id)

    product = _validate_product_link(
        db,
        product_id=payload.product_id,
        shop_id=int(shop.id),
        owner_user_id=int(shop.owner_user_id),
    )
    trade, trade_outcome = _validate_trade_link(
        db,
        trade_id=payload.protected_trade_id,
        shop_id=int(shop.id),
        current_user=current_user,
    )
    if trade is not None:
        state = _safe_str((trade_outcome or {}).get("derived_outcome_state"))
        if state not in CONFIRMED_TRADE_STATES:
            raise HTTPException(
                status_code=400,
                detail="Linked Trade Evidence is not confirmed enough for a Shop Diary confirmed activity",
            )
    evidence_class = _resolved_evidence_class(payload.evidence_class, trade_outcome)
    occurred_at = payload.occurred_at or _now_utc()

    entry = ShopDiaryEntry(
        clan_id=clan_id,
        shop_id=int(shop.id),
        owner_user_id=int(shop.owner_user_id),
        product_id=int(product.id) if product is not None else None,
        protected_trade_id=int(trade.id) if trade is not None else None,
        activity_type=payload.activity_type,
        evidence_class=evidence_class,
        note=_safe_str(payload.note),
        image_url=_safe_str(payload.image_url) or None,
        video_url=_safe_str(payload.video_url) or None,
        occurred_at=occurred_at,
        is_public=bool(payload.is_public),
        is_active=True,
        created_at=_now_utc(),
        updated_at=_now_utc(),
    )
    db.add(entry)
    db.flush()

    log_trust_event(
        db,
        event_type="shop_diary.entry.created",
        clan_id=clan_id,
        actor_user_id=int(current_user.id),
        subject_user_id=int(shop.owner_user_id),
        loan_id=None,
        guarantor_id=None,
        meta={
            "shop_diary_entry_id": int(entry.id),
            "shop_id": int(shop.id),
            "product_id": int(product.id) if product is not None else None,
            "protected_trade_id": int(trade.id) if trade is not None else None,
            "activity_type": entry.activity_type,
            "evidence_class": entry.evidence_class,
            "reason": "shop_diary_entry_created",
        },
        commit=False,
        refresh=False,
    )
    db.commit()
    db.refresh(entry)
    return _entry_out(db, entry)