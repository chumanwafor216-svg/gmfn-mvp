from __future__ import annotations

import json
import secrets
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Iterable, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import ProtectedTradeEvent, ProtectedTradeRecord, TrustEvent, User
from app.schemas.protected_trades import ProtectedTradeCreateIn, ProtectedTradeEventIn
from app.services.trust_events_services import log_trust_event


BOUNDARY_NOTE = (
    "GSN Protected Trade Record is a non-custodial evidence rail. "
    "It records trade terms, payment claims, release decisions, receipt claims, "
    "disputes, and evidence references. It is not escrow, not automatic payout, "
    "not a bank guarantee, and not a delivery guarantee."
)

TERMINAL_STATUSES = {"closed", "cancelled"}
TRADE_EVENT_PREFIX = "protected_trade."

EVENT_EFFECTS: Dict[str, Dict[str, str]] = {
    "terms.agreed": {"status": "agreed"},
    "payment.instruction_added": {
        "status": "payment_instructed",
        "payment_status": "instruction_added",
    },
    "payment.claimed": {
        "status": "payment_claimed",
        "payment_status": "claimed",
    },
    "payment.under_review": {
        "status": "payment_under_review",
        "payment_status": "under_review",
    },
    "payment.recorded": {
        "status": "payment_under_review",
        "payment_status": "recorded_not_bank_confirmed",
    },
    "release.requested": {
        "status": "release_pending",
        "release_status": "requested",
    },
    "release.recorded": {
        "status": "released",
        "release_status": "released",
    },
    "release.declined": {
        "release_status": "declined",
    },
    "receipt.confirmed": {
        "status": "received",
        "receipt_status": "received",
    },
    "receipt.not_received": {
        "status": "not_received",
        "receipt_status": "not_received",
    },
    "dispute.opened": {
        "status": "disputed",
        "dispute_status": "opened",
    },
    "dispute.note_added": {
        "dispute_status": "open_note_added",
    },
    "dispute.resolved": {
        "dispute_status": "resolved",
    },
    "evidence.attached": {},
    "community.note_added": {},
    "trade.closed": {"status": "closed"},
    "trade.cancelled": {"status": "cancelled"},
}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _safe_str(value: Any, default: str = "") -> str:
    text = str(value or "").strip()
    return text or default


def _json(value: Optional[Dict[str, Any]]) -> Optional[str]:
    if not value:
        return None
    return json.dumps(value, ensure_ascii=False, default=str)


def _currency(value: Any) -> str:
    return _safe_str(value, "NGN").upper()[:8]


def _positive_int(value: Any) -> Optional[int]:
    if value is None:
        return None
    try:
        number = int(value)
    except Exception:
        return None
    return number if number > 0 else None


def _amount(value: Any) -> Optional[Decimal]:
    if value is None or value == "":
        return None
    amount = Decimal(str(value))
    if amount <= Decimal("0"):
        raise ValueError("amount must be greater than zero when provided")
    return amount.quantize(Decimal("0.01"))


def _event_key(raw: str) -> str:
    text = _safe_str(raw).lower()
    if text.startswith(TRADE_EVENT_PREFIX):
        text = text[len(TRADE_EVENT_PREFIX) :]
    return text


def _trust_event_type(event_key: str) -> str:
    return f"{TRADE_EVENT_PREFIX}{event_key}"


def _make_trade_code() -> str:
    stamp = _now_utc().strftime("%Y%m%d%H%M%S")
    return f"GSN-TRADE-{stamp}-{secrets.token_hex(4).upper()}"


def _is_admin(user: Any) -> bool:
    if bool(getattr(user, "is_admin", False)):
        return True
    return _safe_str(getattr(user, "role", "")).lower() == "admin"


def _participant_ids(trade: ProtectedTradeRecord) -> set[int]:
    ids = {
        _positive_int(trade.creator_user_id),
        _positive_int(trade.seller_user_id),
        _positive_int(trade.buyer_user_id),
    }
    return {int(item) for item in ids if item is not None}


def assert_trade_access(trade: ProtectedTradeRecord, current_user: User) -> None:
    user_id = _positive_int(getattr(current_user, "id", None))
    if not user_id:
        raise PermissionError("Not authenticated")
    if _is_admin(current_user) or user_id in _participant_ids(trade):
        return
    raise PermissionError("Not permitted for this protected trade record")


def _subject_user_id(trade: ProtectedTradeRecord, actor_user_id: int) -> int:
    if trade.buyer_user_id and int(trade.buyer_user_id) != int(actor_user_id):
        return int(trade.buyer_user_id)
    if trade.seller_user_id and int(trade.seller_user_id) != int(actor_user_id):
        return int(trade.seller_user_id)
    return int(actor_user_id)


def _merge_meta(*items: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    merged: Dict[str, Any] = {}
    for item in items:
        if item and isinstance(item, dict):
            merged.update(item)
    return merged


def trade_to_dict(
    trade: ProtectedTradeRecord,
    *,
    events: Optional[Iterable[ProtectedTradeEvent]] = None,
) -> Dict[str, Any]:
    return {
        "id": int(trade.id),
        "trade_code": trade.trade_code,
        "clan_id": trade.clan_id,
        "creator_user_id": int(trade.creator_user_id),
        "seller_user_id": trade.seller_user_id,
        "buyer_user_id": trade.buyer_user_id,
        "shop_id": trade.shop_id,
        "product_id": trade.product_id,
        "vault_access_link_id": trade.vault_access_link_id,
        "trust_slip_code": trade.trust_slip_code,
        "expected_payment_id": trade.expected_payment_id,
        "shipment_pack_id": trade.shipment_pack_id,
        "evidence_pack_id": trade.evidence_pack_id,
        "item_title": trade.item_title,
        "terms_summary": trade.terms_summary,
        "amount": trade.amount,
        "currency": trade.currency,
        "status": trade.status,
        "payment_status": trade.payment_status,
        "release_status": trade.release_status,
        "receipt_status": trade.receipt_status,
        "dispute_status": trade.dispute_status,
        "meta": trade.meta,
        "created_at": trade.created_at,
        "updated_at": trade.updated_at,
        "closed_at": trade.closed_at,
        "events": [event_to_dict(event) for event in events or []],
        "boundary_note": BOUNDARY_NOTE,
    }


def event_to_dict(event: ProtectedTradeEvent) -> Dict[str, Any]:
    return {
        "id": int(event.id),
        "trade_id": int(event.trade_id),
        "event_type": event.event_type,
        "actor_user_id": int(event.actor_user_id),
        "status_from": event.status_from,
        "status_to": event.status_to,
        "trust_event_id": event.trust_event_id,
        "note": event.note,
        "meta": event.meta,
        "created_at": event.created_at,
    }


def create_trade(
    db: Session,
    *,
    payload: ProtectedTradeCreateIn,
    current_user: User,
) -> ProtectedTradeRecord:
    actor_id = _positive_int(getattr(current_user, "id", None))
    if not actor_id:
        raise PermissionError("Not authenticated")

    role = _safe_str(payload.participant_role, "seller").lower()
    seller_user_id = _positive_int(payload.seller_user_id)
    buyer_user_id = _positive_int(payload.buyer_user_id)
    if role == "seller" and seller_user_id is None:
        seller_user_id = actor_id
    if role == "buyer" and buyer_user_id is None:
        buyer_user_id = actor_id

    trade = ProtectedTradeRecord(
        trade_code=_make_trade_code(),
        clan_id=_positive_int(payload.clan_id),
        creator_user_id=actor_id,
        seller_user_id=seller_user_id,
        buyer_user_id=buyer_user_id,
        shop_id=_positive_int(payload.shop_id),
        product_id=_positive_int(payload.product_id),
        vault_access_link_id=_positive_int(payload.vault_access_link_id),
        trust_slip_code=_safe_str(payload.trust_slip_code) or None,
        expected_payment_id=_positive_int(payload.expected_payment_id),
        shipment_pack_id=_safe_str(payload.shipment_pack_id) or None,
        evidence_pack_id=_safe_str(payload.evidence_pack_id) or None,
        item_title=_safe_str(payload.item_title)[:160] or None,
        terms_summary=_safe_str(payload.terms_summary) or None,
        amount=_amount(payload.amount),
        currency=_currency(payload.currency),
        status="draft",
        payment_status="not_started",
        release_status="not_requested",
        receipt_status="not_confirmed",
        dispute_status="none",
        meta_json=_json(payload.meta),
        created_at=_now_utc(),
        updated_at=_now_utc(),
    )
    db.add(trade)
    db.flush()
    add_trade_event(
        db,
        trade=trade,
        payload=ProtectedTradeEventIn(
            event_type="created",
            note="Protected trade record created.",
            meta={"source": "protected_trade_create"},
        ),
        current_user=current_user,
        commit=False,
    )
    db.commit()
    db.refresh(trade)
    return trade


def add_trade_event(
    db: Session,
    *,
    trade: ProtectedTradeRecord,
    payload: ProtectedTradeEventIn,
    current_user: User,
    commit: bool = True,
) -> ProtectedTradeEvent:
    assert_trade_access(trade, current_user)

    actor_id = int(getattr(current_user, "id"))
    event_key = _event_key(payload.event_type)
    if event_key == "created":
        effects = {}
    else:
        effects = EVENT_EFFECTS.get(event_key)
        if effects is None:
            raise ValueError("Unsupported protected trade event_type")

    old_status = str(trade.status or "draft")
    if old_status in TERMINAL_STATUSES and event_key not in {"community.note_added", "evidence.attached"}:
        raise ValueError("This protected trade record is already closed or cancelled")

    if payload.expected_payment_id is not None:
        trade.expected_payment_id = _positive_int(payload.expected_payment_id)
    if payload.shipment_pack_id:
        trade.shipment_pack_id = _safe_str(payload.shipment_pack_id)
    if payload.evidence_pack_id:
        trade.evidence_pack_id = _safe_str(payload.evidence_pack_id)
    if payload.trust_slip_code:
        trade.trust_slip_code = _safe_str(payload.trust_slip_code)

    for key, value in effects.items():
        setattr(trade, key, value)

    if trade.status in TERMINAL_STATUSES and trade.closed_at is None:
        trade.closed_at = _now_utc()
    trade.updated_at = _now_utc()

    meta = _merge_meta(
        {
            "source": "protected_trade_record",
            "trade_id": int(trade.id),
            "trade_code": trade.trade_code,
            "boundary_note": BOUNDARY_NOTE,
            "payment_status": trade.payment_status,
            "release_status": trade.release_status,
            "receipt_status": trade.receipt_status,
            "dispute_status": trade.dispute_status,
            "expected_payment_id": trade.expected_payment_id,
            "shipment_pack_id": trade.shipment_pack_id,
            "evidence_pack_id": trade.evidence_pack_id,
            "trust_slip_code": trade.trust_slip_code,
        },
        payload.meta,
    )

    trust_event: TrustEvent = log_trust_event(
        db,
        event_type=_trust_event_type(event_key),
        clan_id=trade.clan_id,
        actor_user_id=actor_id,
        subject_user_id=_subject_user_id(trade, actor_id),
        meta=meta,
        commit=False,
        refresh=False,
    )
    db.flush()

    event = ProtectedTradeEvent(
        trade_id=int(trade.id),
        actor_user_id=actor_id,
        event_type=_trust_event_type(event_key),
        status_from=old_status,
        status_to=str(trade.status or old_status),
        trust_event_id=int(trust_event.id),
        note=_safe_str(payload.note) or None,
        meta_json=_json(meta),
        created_at=_now_utc(),
    )
    db.add(trade)
    db.add(event)

    if commit:
        db.commit()
        db.refresh(event)
        db.refresh(trade)
    else:
        db.flush()
        db.refresh(event)

    return event


def get_trade_for_user(
    db: Session,
    *,
    trade_id: int,
    current_user: User,
) -> ProtectedTradeRecord:
    trade = db.get(ProtectedTradeRecord, int(trade_id))
    if trade is None:
        raise LookupError("Protected trade record not found")
    assert_trade_access(trade, current_user)
    return trade


def list_trades_for_user(
    db: Session,
    *,
    current_user: User,
    status: Optional[str] = None,
    limit: int = 50,
) -> list[ProtectedTradeRecord]:
    user_id = _positive_int(getattr(current_user, "id", None))
    if not user_id:
        raise PermissionError("Not authenticated")

    q = db.query(ProtectedTradeRecord)
    if not _is_admin(current_user):
        q = q.filter(
            or_(
                ProtectedTradeRecord.creator_user_id == user_id,
                ProtectedTradeRecord.seller_user_id == user_id,
                ProtectedTradeRecord.buyer_user_id == user_id,
            )
        )
    if status:
        q = q.filter(ProtectedTradeRecord.status == _safe_str(status).lower())
    return (
        q.order_by(ProtectedTradeRecord.updated_at.desc(), ProtectedTradeRecord.id.desc())
        .limit(max(1, min(int(limit or 50), 200)))
        .all()
    )


def list_trade_events(
    db: Session,
    *,
    trade_id: int,
    limit: int = 100,
) -> list[ProtectedTradeEvent]:
    return (
        db.query(ProtectedTradeEvent)
        .filter(ProtectedTradeEvent.trade_id == int(trade_id))
        .order_by(ProtectedTradeEvent.id.asc())
        .limit(max(1, min(int(limit or 100), 500)))
        .all()
    )
