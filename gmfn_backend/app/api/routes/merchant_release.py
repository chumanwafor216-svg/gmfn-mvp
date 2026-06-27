from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import TrustEvent
from app.schemas.merchant_release import MerchantReleaseIn
from app.services.merchant_verify_service import verify_merchant_token, mark_token_used, is_token_used
from app.services.public_rate_limit_service import check_rate_limit, RateLimitRule
from app.services.trust_events_services import log_trust_event

router = APIRouter(prefix="/merchant", tags=["merchant"])


ALLOWED_TRADE_CONTEXTS = {"gsn_external", "external_gsn", "gsn_gsn"}
ALLOWED_RECEIPT_STATUSES = {"awaiting_delivery", "received", "not_received", "disputed"}


def _parse_decimal(s: str) -> Decimal:
    try:
        d = Decimal(str(s))
    except (InvalidOperation, ValueError):
        raise HTTPException(status_code=400, detail="Invalid goods_value. Use a decimal string like '140.00'.")
    if d <= Decimal("0"):
        raise HTTPException(status_code=400, detail="goods_value must be greater than 0.")
    return d


def _clean_text(value: Any) -> str | None:
    text = str(value or "").strip()
    return text or None


def _checked_value(value: str, allowed: set[str], *, fallback: str, field_name: str) -> str:
    text = str(value or fallback).strip().lower()
    if text not in allowed:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}.")
    return text


@router.post("/releases")
def record_release(
    payload: MerchantReleaseIn,
    request: Request,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Public endpoint (no auth):
    - verifies the signed merchant token and expiry
    - records one release evidence event per token
    - marks the token as used if public verification has not already done so
    """
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(bucket="merchant_release", key=ip, rule=RateLimitRule(window_seconds=60, max_requests=20)):
        raise HTTPException(status_code=429, detail="Too many requests. Please try again shortly.")

    try:
        info = verify_merchant_token(db, token=payload.token)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link.")

    uid = int(info["uid"])
    jti = str(info["jti"])
    link_id = info.get("link_id")
    pack_id = info.get("pack_id")
    token_level = str(info.get("lvl") or "standard")

    release_dedupe_key = f"merchant-release:{jti}"
    existing_release = (
        db.query(TrustEvent)
        .filter(TrustEvent.event_type == "merchant.release_recorded")
        .filter(TrustEvent.dedupe_key == release_dedupe_key)
        .first()
    )
    if existing_release:
        raise HTTPException(status_code=400, detail="This merchant release has already been recorded.")

    amount = _parse_decimal(payload.goods_value)
    currency = str(payload.currency or "NGN")
    trade_context = _checked_value(
        payload.trade_context,
        ALLOWED_TRADE_CONTEXTS,
        fallback="gsn_external",
        field_name="trade_context",
    )
    receipt_status = _checked_value(
        payload.receipt_status,
        ALLOWED_RECEIPT_STATUSES,
        fallback="awaiting_delivery",
        field_name="receipt_status",
    )
    trade_packet_id = f"MTP-{jti[:6].upper()}" if jti else None
    evidence_slots = {
        "product": bool(_clean_text(payload.product_evidence_note)),
        "invoice": bool(_clean_text(payload.invoice_reference) or _clean_text(payload.invoice_evidence_note)),
        "agreement": bool(_clean_text(payload.agreement_evidence_note)),
        "courier": bool(
            _clean_text(payload.courier_name)
            or _clean_text(payload.tracking_number)
            or _clean_text(payload.expected_delivery_date)
            or _clean_text(payload.released_to_courier_at)
        ),
        "payment_schedule": bool(_clean_text(payload.payment_schedule_note)),
    }
    trade_packet = {
        "trade_packet_id": trade_packet_id,
        "trade_context": trade_context,
        "item_title": _clean_text(payload.item_title),
        "counterparty_label": _clean_text(payload.counterparty_label),
        "counterparty_whatsapp_label": _clean_text(payload.counterparty_whatsapp_label),
        "product_evidence_note": _clean_text(payload.product_evidence_note),
        "invoice_reference": _clean_text(payload.invoice_reference),
        "invoice_evidence_note": _clean_text(payload.invoice_evidence_note),
        "agreement_evidence_note": _clean_text(payload.agreement_evidence_note),
        "courier_name": _clean_text(payload.courier_name),
        "courier_contact_label": _clean_text(payload.courier_contact_label),
        "tracking_number": _clean_text(payload.tracking_number),
        "released_to_courier_at": _clean_text(payload.released_to_courier_at),
        "expected_delivery_date": _clean_text(payload.expected_delivery_date),
        "payment_schedule_note": _clean_text(payload.payment_schedule_note),
        "receipt_status": receipt_status,
        "evidence_slots": evidence_slots,
        "conversation_system_of_record": "whatsapp_or_parties",
        "gsn_record_scope": "minimum_structured_evidence_packet",
        "external_counterparty_supported": trade_context in {"gsn_external", "external_gsn"},
        "redaction_reminder": "Record only the final evidence needed for reference. Avoid unnecessary private chat, address, bank, or third-party details.",
    }

    token_was_used = is_token_used(db, jti=jti)
    if not token_was_used:
        mark_token_used(
            db,
            actor_user_id=uid,
            subject_user_id=uid,
            jti=jti,
            link_id=link_id,
            pack_id=pack_id,
        )

    # append-only merchant release evidence
    release_event = log_trust_event(
        db,
        event_type="merchant.release_recorded",
        clan_id=None,
        loan_id=None,
        guarantor_id=None,
        actor_user_id=uid,
        subject_user_id=uid,
        meta={
            "policy": "trust_constitution_v1",
            "trust_delta": "0.00",
            "reason": "merchant_release_recorded",
            "goods_value": str(amount),
            "currency": currency,
            "merchant_note": payload.merchant_note,
            "trade_packet_id": trade_packet_id,
            "trade_packet": trade_packet,
            "jti": jti,
            "link_id": link_id,
            "pack_id": pack_id,
            "token_level": token_level,
            "actor_context": "external_merchant_public_release_rail",
            "global_id_subject_user_id": uid,
            "release_evidence_only": True,
            "minimum_trade_packet": True,
            "whatsapp_conversation_not_stored": True,
            "courier_not_controlled_by_gsn": True,
            "not_escrow": True,
            "not_money_custody": True,
            "not_payout": True,
            "not_bank_confirmation": True,
            "not_delivery_guarantee": True,
            "not_release_authority": True,
        },
        dedupe_key=release_dedupe_key,
    )

    return {
        "ok": True,
        "release_recorded": True,
        "release_event_id": release_event.id,
        "verification_link_id": link_id,
        "pack_id": pack_id,
        "trade_packet_id": trade_packet_id,
        "trade_packet": trade_packet,
        "goods_value": str(amount),
        "currency": currency,
        "token_used": True,
        "token_was_already_used": token_was_used,
        "evidence_boundary": (
            "Release recorded as GSN evidence only. This is not escrow, money custody, "
            "payout approval, bank confirmation, delivery guarantee, or automatic release authority."
        ),
        "message": "Merchant release recorded as evidence.",
    }
