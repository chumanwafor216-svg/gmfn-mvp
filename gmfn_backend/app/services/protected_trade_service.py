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
from app.services.demand_supply_intelligence_service import resolve_demand_supply_trade_handoff
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


def _source_handoff_requested(payload: ProtectedTradeCreateIn) -> bool:
    return any(
        _positive_int(value)
        for value in (
            payload.source_demand_id,
            payload.source_match_product_id,
            payload.source_match_shop_id,
        )
    )


def _reason_codes(values: Optional[Iterable[Any]]) -> list[str]:
    out: list[str] = []
    for value in values or []:
        text = _safe_str(value).upper()
        if text and text not in out:
            out.append(text[:80])
    return out[:12]


def _resolve_source_handoff(
    db: Session,
    *,
    payload: ProtectedTradeCreateIn,
    actor_id: int,
) -> Optional[Dict[str, Any]]:
    if not _source_handoff_requested(payload):
        return None

    demand_id = _positive_int(payload.source_demand_id)
    product_id = _positive_int(payload.source_match_product_id)
    shop_id = _positive_int(payload.source_match_shop_id)
    if not demand_id or not product_id or not shop_id:
        raise ValueError("DemandBox match handoff needs demand, product, and shop identifiers.")

    handoff = resolve_demand_supply_trade_handoff(
        db,
        demand_id=demand_id,
        product_id=product_id,
        shop_id=shop_id,
        current_user_id=actor_id,
    )
    if not handoff:
        raise PermissionError("DemandBox match handoff is not permitted.")
    if int(handoff.get("requester_user_id") or 0) != int(actor_id):
        raise PermissionError("Only the requester can start this DemandBox trade evidence record.")

    seller_user_id = _positive_int(handoff.get("seller_user_id"))
    if not seller_user_id:
        raise ValueError("Matched supply provider could not be resolved.")
    if payload.seller_user_id and _positive_int(payload.seller_user_id) != seller_user_id:
        raise PermissionError("DemandBox match provider does not match the supplied seller.")
    if payload.buyer_user_id and _positive_int(payload.buyer_user_id) != actor_id:
        raise PermissionError("DemandBox match buyer must be the authenticated requester.")

    return handoff

RELEASE_RECORDED_VALUES = {"released", "recorded", "approved"}
RECEIPT_CONFIRMED_VALUES = {"received", "confirmed", "delivered"}
RECEIPT_NOT_RECEIVED_VALUES = {"not_received", "not received", "missing"}
UNRESOLVED_DISPUTE_VALUES = {
    "opened",
    "open_note_added",
    "open",
    "raised",
    "pending",
    "in_review",
    "under_review",
    "unresolved",
}
RESOLVED_DISPUTE_VALUES = {"resolved", "closed", "settled"}
CANCELLED_TRADE_VALUES = {"cancelled", "canceled"}
DERIVED_OUTCOME_BOUNDARY_NOTE = (
    "Derived from existing Protected Trade lifecycle fields and events. It does not "
    "create a TrustEvent, rating, score, payment proof, delivery guarantee, or new "
    "fulfilment workflow. Closed means lifecycle closure unless release and receipt "
    "evidence independently establish fulfilment."
)


def _trade_state_value(trade: ProtectedTradeRecord, field_name: str) -> str:
    return _safe_str(getattr(trade, field_name, "")).lower()


def _event_actor_id(event: ProtectedTradeEvent) -> Optional[int]:
    return _positive_int(getattr(event, "actor_user_id", None))


def _event_of_type(event: ProtectedTradeEvent, event_key: str) -> bool:
    return _event_key(getattr(event, "event_type", "")) == event_key


def _has_actor_event(
    events: Iterable[ProtectedTradeEvent],
    *,
    event_key: str,
    actor_user_id: Optional[int],
) -> bool:
    if not actor_user_id:
        return False
    return any(
        _event_of_type(event, event_key)
        and _event_actor_id(event) == int(actor_user_id)
        for event in events
    )


def derive_protected_trade_outcome(
    trade: ProtectedTradeRecord,
    *,
    events: Optional[Iterable[ProtectedTradeEvent]] = None,
) -> Dict[str, Any]:
    """Return read-only outcome truth from existing ProtectedTrade state/events."""

    event_rows = list(events or [])
    seller_user_id = _positive_int(getattr(trade, "seller_user_id", None))
    buyer_user_id = _positive_int(getattr(trade, "buyer_user_id", None))

    status = _trade_state_value(trade, "status")
    release_status = _trade_state_value(trade, "release_status")
    receipt_status = _trade_state_value(trade, "receipt_status")
    dispute_status = _trade_state_value(trade, "dispute_status")

    has_release_evidence = release_status in RELEASE_RECORDED_VALUES
    has_receipt_evidence = receipt_status in RECEIPT_CONFIRMED_VALUES
    has_not_received = receipt_status in RECEIPT_NOT_RECEIVED_VALUES
    has_unresolved_dispute = dispute_status in UNRESOLVED_DISPUTE_VALUES
    has_resolved_dispute_history = dispute_status in RESOLVED_DISPUTE_VALUES or any(
        _event_of_type(event, "dispute.resolved") for event in event_rows
    )
    has_cancelled = status in CANCELLED_TRADE_VALUES

    has_provider_release_event = _has_actor_event(
        event_rows,
        event_key="release.recorded",
        actor_user_id=seller_user_id,
    )
    has_requester_receipt_event = _has_actor_event(
        event_rows,
        event_key="receipt.confirmed",
        actor_user_id=buyer_user_id,
    )
    has_release_event = any(_event_of_type(event, "release.recorded") for event in event_rows)
    has_receipt_event = any(_event_of_type(event, "receipt.confirmed") for event in event_rows)
    has_not_received_event = any(_event_of_type(event, "receipt.not_received") for event in event_rows)

    evidence_basis: list[str] = []
    if has_release_evidence:
        evidence_basis.append("release_status records release/completion evidence")
    if has_provider_release_event:
        evidence_basis.append("seller/provider recorded release/completion")
    elif has_release_event:
        evidence_basis.append("release event exists but seller/provider actor provenance is not established")
    elif has_release_evidence:
        evidence_basis.append("release field exists without actor-specific release provenance")

    if has_receipt_evidence:
        evidence_basis.append("receipt_status records receipt/acceptance evidence")
    if has_requester_receipt_event:
        evidence_basis.append("buyer/requester confirmed receipt")
    elif has_receipt_event:
        evidence_basis.append("receipt event exists but buyer/requester actor provenance is not established")
    elif has_receipt_evidence:
        evidence_basis.append("receipt field exists without actor-specific receipt provenance")

    if has_not_received:
        evidence_basis.append("receipt_status records not received")
    elif has_not_received_event:
        evidence_basis.append("not-received event exists in trade history")
    if has_unresolved_dispute:
        evidence_basis.append("unresolved dispute is recorded")
    if has_resolved_dispute_history:
        evidence_basis.append("resolved dispute history is recorded")
    if status == "closed" and not (has_release_evidence and has_receipt_evidence):
        evidence_basis.append("closed lifecycle state is not treated as fulfilment by itself")
    if has_cancelled:
        evidence_basis.append("trade lifecycle is cancelled")

    actor_provenance_available = bool(event_rows)
    actor_provenance_supports_mutual = (
        has_provider_release_event and has_requester_receipt_event
    )
    field_only_mutual = (
        has_release_evidence and has_receipt_evidence and not actor_provenance_available
    )

    state = "UNCONFIRMED"
    label = "In progress"
    if has_cancelled:
        state = "CANCELLED"
        label = "Cancelled"
    elif has_unresolved_dispute:
        state = "DISPUTED"
        label = "Disputed"
    elif has_not_received:
        state = "NOT_RECEIVED"
        label = "Not received"
    elif has_release_evidence and has_receipt_evidence and (
        actor_provenance_supports_mutual or field_only_mutual
    ):
        state = "MUTUALLY_CONFIRMED"
        if has_resolved_dispute_history:
            label = "Mutually confirmed after resolved dispute"
        elif field_only_mutual and not actor_provenance_supports_mutual:
            label = "Release and receipt recorded"
        else:
            label = "Mutually confirmed"
    elif has_provider_release_event:
        state = "PROVIDER_REPORTED_COMPLETED"
        label = "Provider recorded completion"
    elif has_requester_receipt_event:
        state = "REQUESTER_REPORTED_RECEIVED"
        label = "Requester confirmed receipt"

    return {
        "derived_outcome_state": state,
        "derived_outcome_label": label,
        "evidence_basis": evidence_basis,
        "has_provider_release_event": has_provider_release_event,
        "has_requester_receipt_event": has_requester_receipt_event,
        "has_unresolved_dispute": has_unresolved_dispute,
        "has_resolved_dispute_history": has_resolved_dispute_history,
        "derived_outcome_boundary_note": DERIVED_OUTCOME_BOUNDARY_NOTE,
    }

def trade_to_dict(
    trade: ProtectedTradeRecord,
    *,
    events: Optional[Iterable[ProtectedTradeEvent]] = None,
) -> Dict[str, Any]:
    event_rows = list(events or [])
    derived_outcome = derive_protected_trade_outcome(trade, events=event_rows)
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
        **derived_outcome,
        "events": [event_to_dict(event) for event in event_rows],
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

    source_handoff = _resolve_source_handoff(db, payload=payload, actor_id=actor_id)
    role = "buyer" if source_handoff else _safe_str(payload.participant_role, "seller").lower()
    seller_user_id = _positive_int(payload.seller_user_id)
    buyer_user_id = _positive_int(payload.buyer_user_id)
    clan_id = _positive_int(payload.clan_id)
    shop_id = _positive_int(payload.shop_id)
    product_id = _positive_int(payload.product_id)
    source_meta: Dict[str, Any] = {}

    if source_handoff:
        seller_user_id = _positive_int(source_handoff.get("seller_user_id"))
        buyer_user_id = actor_id
        clan_id = _positive_int(source_handoff.get("clan_id"))
        shop_id = _positive_int(source_handoff.get("shop_id"))
        product_id = _positive_int(source_handoff.get("product_id"))
        source_meta = {
            "source": "demand_supply_match",
            "source_demand_id": _positive_int(source_handoff.get("demand_id")),
            "source_match_product_id": product_id,
            "source_match_shop_id": shop_id,
            "source_match_reason_codes": _reason_codes(
                payload.source_match_reason_codes or source_handoff.get("reason_codes")
            ),
            "source_demand_title": _safe_str(source_handoff.get("demand_title")) or None,
            "source_product_title": _safe_str(source_handoff.get("product_title")) or None,
            "source_shop_name": _safe_str(source_handoff.get("shop_name")) or None,
            "not_recommendation": True,
            "not_endorsement": True,
            "not_payment_proof": True,
        }
    else:
        if role == "seller" and seller_user_id is None:
            seller_user_id = actor_id
        if role == "buyer" and buyer_user_id is None:
            buyer_user_id = actor_id

    trade = ProtectedTradeRecord(
        trade_code=_make_trade_code(),
        clan_id=clan_id,
        creator_user_id=actor_id,
        seller_user_id=seller_user_id,
        buyer_user_id=buyer_user_id,
        shop_id=shop_id,
        product_id=product_id,
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
        meta_json=_json(_merge_meta(source_meta, payload.meta)),
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
            meta=_merge_meta({"source": "protected_trade_create"}, source_meta),
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
