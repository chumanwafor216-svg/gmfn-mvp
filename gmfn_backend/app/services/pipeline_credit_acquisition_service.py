from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.bank_models import BankEvent, ExpectedPayment
from app.db.pipeline_credit_models import (
    PipelineCreditAcquisitionApplication,
    PipelineCreditAcquisitionOrder,
    PipelineCreditAcquisitionPackVersion,
    PipelineCreditAcquisitionRefund,
    PipelineCreditServiceSpendOrder,
)
from app.db.spotlight_commercial_models import SpotlightCommercialBooking
from app.services.expected_payments_service import create_expected_payment
from app.services.pipeline_credit_service import (
    ACCOUNT_PURPOSE_CUSTOMER,
    InsufficientPipelineCreditError,
    allocate_pipeline_credits,
    debit_pipeline_credits,
)
from app.services.spotlight_commercial_access_service import (
    SpotlightCommercialAccessError,
    require_spotlight_payment_operations_enabled,
    require_spotlight_pilot_entitlement,
)


CREDIT_QUANT = Decimal("0.01")
RATE = Decimal("2.0000")
EXPECTED_TYPE = "pipeline_credit_acquisition"
CASH_BACKED_FUNDING = frozenset({"merchant_paid", "sponsor_funded"})


class PipelineCreditAcquisitionError(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _money(value: Any, *, field: str) -> Decimal:
    try:
        amount = Decimal(str(value)).quantize(CREDIT_QUANT, rounding=ROUND_HALF_UP)
    except Exception as exc:
        raise PipelineCreditAcquisitionError("invalid_amount", f"{field} must be a decimal amount") from exc
    if amount <= Decimal("0.00"):
        raise PipelineCreditAcquisitionError("invalid_amount", f"{field} must be greater than zero")
    return amount


def _fingerprint(value: dict[str, Any]) -> str:
    payload = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _json_object(value: Any) -> dict[str, Any]:
    try:
        parsed = json.loads(value or "{}")
    except Exception:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _reference(*, user_id: int, clan_id: int) -> str:
    stamp = _now().strftime("%Y%m%d%H%M%S")
    return f"GSN-PC-ACQ-U{int(user_id)}-C{int(clan_id)}-{stamp}-{secrets.token_hex(3)}"


def _latest_pack(db: Session, row: PipelineCreditAcquisitionPackVersion) -> Optional[PipelineCreditAcquisitionPackVersion]:
    return (
        db.query(PipelineCreditAcquisitionPackVersion)
        .filter(PipelineCreditAcquisitionPackVersion.profile_code == row.profile_code)
        .filter(PipelineCreditAcquisitionPackVersion.pack_code == row.pack_code)
        .order_by(PipelineCreditAcquisitionPackVersion.version.desc(), PipelineCreditAcquisitionPackVersion.id.desc())
        .first()
    )


def _pack_or_error(db: Session, *, pack_version_id: int) -> PipelineCreditAcquisitionPackVersion:
    row = db.get(PipelineCreditAcquisitionPackVersion, int(pack_version_id))
    if row is None:
        raise PipelineCreditAcquisitionError("acquisition_pack_not_found", "Pipeline Credit acquisition pack not found")
    latest = _latest_pack(db, row)
    if latest is None or int(latest.id) != int(row.id):
        raise PipelineCreditAcquisitionError("stale_acquisition_pack", "This acquisition pack version is stale; request the current catalogue")
    if str(row.lifecycle_status or "").lower() not in {"pilot", "enforced"}:
        raise PipelineCreditAcquisitionError("acquisition_pack_not_available", "This acquisition pack is not available for purchase")
    cash = Decimal(str(row.cash_amount)).quantize(CREDIT_QUANT)
    credits = Decimal(str(row.credit_quantity)).quantize(CREDIT_QUANT)
    if str(row.currency or "").upper() != "GBP" or credits != (cash * RATE).quantize(CREDIT_QUANT):
        raise PipelineCreditAcquisitionError(
            "acquisition_pack_tariff_mismatch",
            "Paid Spotlight acquisition packs must preserve the approved tariff of two Pipeline Credits per pound",
        )
    return row


def create_acquisition_instruction(
    db: Session,
    *,
    purchaser_user_id: int,
    beneficiary_user_id: int,
    clan_id: int,
    pack_version_id: int,
    funding_classification: str,
    idempotency_key: str,
) -> PipelineCreditAcquisitionOrder:
    funding = str(funding_classification or "").strip().lower()
    if funding not in CASH_BACKED_FUNDING:
        raise PipelineCreditAcquisitionError("invalid_funding_classification", "Acquisition funding must be merchant_paid or sponsor_funded")
    idem = str(idempotency_key or "").strip()
    if len(idem) < 8:
        raise PipelineCreditAcquisitionError("idempotency_required", "idempotency_key must contain at least 8 characters")
    request = {
        "purchaser_user_id": int(purchaser_user_id),
        "beneficiary_user_id": int(beneficiary_user_id),
        "clan_id": int(clan_id),
        "pack_version_id": int(pack_version_id),
        "funding_classification": funding,
    }
    fingerprint = _fingerprint(request)
    existing = (
        db.query(PipelineCreditAcquisitionOrder)
        .filter(PipelineCreditAcquisitionOrder.purchaser_user_id == int(purchaser_user_id))
        .filter(PipelineCreditAcquisitionOrder.idempotency_key == idem)
        .one_or_none()
    )
    if existing is not None:
        if existing.request_fingerprint != fingerprint:
            raise PipelineCreditAcquisitionError("idempotency_conflict", "This acquisition key was already used for different details")
        return existing
    try:
        require_spotlight_payment_operations_enabled()
        require_spotlight_pilot_entitlement(
            db,
            user_id=int(purchaser_user_id),
            clan_id=int(clan_id),
            funding_classification=funding,
        )
    except SpotlightCommercialAccessError as exc:
        raise PipelineCreditAcquisitionError(exc.code, str(exc)) from exc
    if funding == "merchant_paid" and int(purchaser_user_id) != int(beneficiary_user_id):
        raise PipelineCreditAcquisitionError("merchant_beneficiary_mismatch", "A merchant acquisition must fund the purchasing merchant")
    pack = _pack_or_error(db, pack_version_id=int(pack_version_id))
    reference = _reference(user_id=int(purchaser_user_id), clan_id=int(clan_id))
    exp = create_expected_payment(
        db,
        clan_id=int(clan_id),
        user_id=int(purchaser_user_id),
        expected_type=EXPECTED_TYPE,
        amount=pack.cash_amount,
        currency=pack.currency,
        reference_display=reference,
        due_at=_now() + timedelta(days=7),
        meta={
            "source": "pipeline_credit.acquisition_pack",
            "pack_version_id": int(pack.id),
            "beneficiary_user_id": int(beneficiary_user_id),
            "funding_classification": funding,
            "credit_quantity": str(pack.credit_quantity),
            "cash_amount": str(pack.cash_amount),
            "tariff": "GBP1=2PC",
        },
        commit=False,
        refresh=True,
    )
    row = PipelineCreditAcquisitionOrder(
        acquisition_key=f"pca_{secrets.token_urlsafe(24)}",
        pack_version_id=int(pack.id),
        expected_payment_id=int(exp.id),
        purchaser_user_id=int(purchaser_user_id),
        beneficiary_user_id=int(beneficiary_user_id),
        clan_id=int(clan_id),
        funding_classification=funding,
        currency=str(pack.currency).upper(),
        cash_amount=pack.cash_amount,
        credit_quantity=pack.credit_quantity,
        allocated_credit_amount=Decimal("0.00"),
        remaining_credit_amount=Decimal("0.00"),
        status="pending_payment",
        idempotency_key=idem,
        request_fingerprint=fingerprint,
        created_at=_now(),
        updated_at=_now(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def apply_confirmed_acquisition(
    db: Session,
    *,
    bank_event: BankEvent,
    expected_payment: ExpectedPayment,
) -> dict[str, Any]:
    if str(expected_payment.status or "").lower() != "confirmed":
        return {"ok": True, "applied": False, "kind": EXPECTED_TYPE, "reason": "expected_not_fully_confirmed"}
    order = (
        db.query(PipelineCreditAcquisitionOrder)
        .filter(PipelineCreditAcquisitionOrder.expected_payment_id == int(expected_payment.id))
        .with_for_update()
        .one_or_none()
    )
    if order is None:
        return {"ok": False, "applied": False, "kind": EXPECTED_TYPE, "reason": "acquisition_order_missing"}
    if order.allocation_ledger_entry_id is not None:
        return {
            "ok": True,
            "applied": False,
            "kind": EXPECTED_TYPE,
            "reason": "already_applied",
            "pipeline_credit_ledger_entry_id": int(order.allocation_ledger_entry_id),
        }
    if str(expected_payment.currency or "").upper() != str(order.currency or "").upper():
        return {"ok": False, "applied": False, "kind": EXPECTED_TYPE, "reason": "currency_mismatch"}
    if Decimal(str(expected_payment.amount)).quantize(CREDIT_QUANT) != Decimal(str(order.cash_amount)).quantize(CREDIT_QUANT):
        return {"ok": False, "applied": False, "kind": EXPECTED_TYPE, "reason": "cash_amount_mismatch"}
    try:
        require_spotlight_payment_operations_enabled()
        require_spotlight_pilot_entitlement(
            db,
            user_id=int(order.purchaser_user_id),
            clan_id=int(order.clan_id),
            funding_classification=str(order.funding_classification),
        )
    except SpotlightCommercialAccessError as exc:
        order.bank_event_id = int(bank_event.id)
        order.status = "payment_received_permission_hold"
        order.updated_at = _now()

        expected_meta = _json_object(expected_payment.meta_json)

        expected_meta["pipeline_credit_acquisition_application_status"] = "permission_hold"
        expected_meta["pipeline_credit_acquisition_application_reason"] = exc.code
        expected_meta["pipeline_credit_acquisition_application_bank_event_id"] = int(bank_event.id)
        expected_meta["pipeline_credit_acquisition_application_held_at"] = _now().isoformat()
        expected_payment.meta_json = json.dumps(expected_meta, ensure_ascii=False)
        hold_reason = f"application_hold:{exc.code}"
        current_reason = str(bank_event.status_reason or "").strip()
        if hold_reason not in current_reason.split("|"):
            bank_event.status_reason = f"{current_reason}|{hold_reason}".strip("|")
        db.add(order)
        db.add(expected_payment)
        db.add(bank_event)
        db.commit()
        db.refresh(order)
        return {
            "ok": False,
            "applied": False,
            "kind": EXPECTED_TYPE,
            "reason": exc.code,
            "cash_preserved": True,
            "application_status": order.status,
            "acquisition_order_id": int(order.id),
            "expected_payment_id": int(expected_payment.id),
            "bank_event_id": int(bank_event.id),
        }
    entry = allocate_pipeline_credits(
        db,
        owner_type="user",
        owner_user_id=int(order.beneficiary_user_id),
        account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
        pricing_region="global",
        amount=order.credit_quantity,
        currency="PC",
        workflow_key="pipeline_credit.acquisition.bank_confirmed",
        idempotency_key=f"pipeline-credit-acquisition:expected-payment:{int(expected_payment.id)}",
        reference_type="pipeline_credit_acquisition_order",
        reference_id=str(int(order.id)),
        note="Pipeline Credits allocated from a confirmed versioned acquisition pack",
        created_by_user_id=int(order.purchaser_user_id),
        meta={
            "bank_event_id": int(bank_event.id),
            "expected_payment_id": int(expected_payment.id),
            "cash_amount": str(order.cash_amount),
            "cash_currency": order.currency,
            "funding_classification": order.funding_classification,
        },
        commit=False,
    )
    order.bank_event_id = int(bank_event.id)
    order.account_id = int(entry.account_id)
    order.allocated_credit_amount = order.credit_quantity
    order.remaining_credit_amount = order.credit_quantity
    order.allocation_ledger_entry_id = int(entry.id)
    order.status = "allocated"
    order.allocated_at = _now()
    order.updated_at = _now()

    expected_meta = _json_object(expected_payment.meta_json)

    expected_meta["pipeline_credit_acquisition_application_status"] = "allocated"
    expected_meta["pipeline_credit_acquisition_application_resolved_at"] = _now().isoformat()
    expected_payment.meta_json = json.dumps(expected_meta, ensure_ascii=False)
    db.add(expected_payment)
    db.add(order)
    db.commit()
    db.refresh(order)
    return {
        "ok": True,
        "applied": True,
        "kind": EXPECTED_TYPE,
        "acquisition_order_id": int(order.id),
        "pipeline_credit_ledger_entry_id": int(entry.id),
        "credit_quantity": f"{Decimal(str(order.credit_quantity)):.2f}",
    }


def apply_cash_backing_to_spend(
    db: Session,
    *,
    spend_order: PipelineCreditServiceSpendOrder,
    booking: SpotlightCommercialBooking,
    credit_amount: Any,
) -> list[PipelineCreditAcquisitionApplication]:
    required = _money(credit_amount, field="cash-backed credit amount")
    existing = (
        db.query(PipelineCreditAcquisitionApplication)
        .filter(PipelineCreditAcquisitionApplication.spend_order_id == int(spend_order.id))
        .order_by(PipelineCreditAcquisitionApplication.id.asc())
        .all()
    )
    if existing:
        total = sum((Decimal(str(row.credit_amount)) for row in existing), Decimal("0.00"))
        if total != required:
            raise PipelineCreditAcquisitionError("cash_backing_idempotency_conflict", "Existing cash backing does not match this spend")
        return existing
    if str(booking.funding_classification) not in CASH_BACKED_FUNDING:
        return []
    rows = (
        db.query(PipelineCreditAcquisitionOrder)
        .filter(PipelineCreditAcquisitionOrder.beneficiary_user_id == int(spend_order.actor_user_id))
        .filter(PipelineCreditAcquisitionOrder.clan_id == int(booking.clan_id))
        .filter(PipelineCreditAcquisitionOrder.funding_classification == str(booking.funding_classification))
        .filter(
            PipelineCreditAcquisitionOrder.status.in_(
                ("allocated", "partially_spent", "partially_refunded")
            )
        )
        .filter(PipelineCreditAcquisitionOrder.remaining_credit_amount > Decimal("0.00"))
        .order_by(PipelineCreditAcquisitionOrder.allocated_at.asc(), PipelineCreditAcquisitionOrder.id.asc())
        .with_for_update()
        .all()
    )
    remaining = required
    applications: list[PipelineCreditAcquisitionApplication] = []
    for order in rows:
        if remaining <= Decimal("0.00"):
            break
        available = Decimal(str(order.remaining_credit_amount)).quantize(CREDIT_QUANT)
        applied = min(available, remaining)
        rate = Decimal(str(order.cash_amount)) / Decimal(str(order.credit_quantity))
        cash = (applied * rate).quantize(CREDIT_QUANT, rounding=ROUND_HALF_UP)
        application = PipelineCreditAcquisitionApplication(
            acquisition_order_id=int(order.id),
            spend_order_id=int(spend_order.id),
            booking_id=int(booking.id),
            credit_amount=applied,
            cash_amount=cash,
            status="active",
            created_at=_now(),
        )
        db.add(application)
        applications.append(application)
        order.remaining_credit_amount = (available - applied).quantize(CREDIT_QUANT)
        order.status = "spent" if order.remaining_credit_amount == Decimal("0.00") else "partially_spent"
        order.updated_at = _now()
        db.add(order)
        remaining = (remaining - applied).quantize(CREDIT_QUANT)
    if remaining > Decimal("0.00"):
        raise PipelineCreditAcquisitionError(
            "cash_backing_unavailable",
            "The Pipeline Credit balance is not fully backed by reconciled Spotlight acquisition cash for this booking",
        )
    db.flush()
    return applications


def record_acquisition_refund(
    db: Session,
    *,
    acquisition_order_id: int,
    credit_amount: Any,
    idempotency_key: str,
    reason: str,
    actor_user_id: int,
) -> PipelineCreditAcquisitionRefund:
    idem = str(idempotency_key or "").strip()
    if len(idem) < 8:
        raise PipelineCreditAcquisitionError(
            "idempotency_required",
            "idempotency_key must contain at least 8 characters",
        )
    amount = _money(credit_amount, field="refund credit amount")
    normalized_reason = str(reason or "").strip()[:500] or "Operator-classified refund"
    existing = (
        db.query(PipelineCreditAcquisitionRefund)
        .filter(PipelineCreditAcquisitionRefund.idempotency_key == idem)
        .one_or_none()
    )
    if existing is not None:
        if (
            int(existing.acquisition_order_id) != int(acquisition_order_id)
            or Decimal(str(existing.reversed_credit_amount)).quantize(CREDIT_QUANT) != amount
            or str(existing.reason) != normalized_reason
        ):
            raise PipelineCreditAcquisitionError(
                "idempotency_conflict",
                "This refund key was already used for different details",
            )
        return existing
    order = (
        db.query(PipelineCreditAcquisitionOrder)
        .filter(PipelineCreditAcquisitionOrder.id == int(acquisition_order_id))
        .with_for_update()
        .one_or_none()
    )
    if order is None or order.account_id is None:
        raise PipelineCreditAcquisitionError("acquisition_not_refundable", "Allocated acquisition order not found")
    available = Decimal(str(order.remaining_credit_amount)).quantize(CREDIT_QUANT)
    if amount > available:
        raise PipelineCreditAcquisitionError("refund_exceeds_unspent_credits", "Only unspent acquisition credits can be classified for refund")
    try:
        require_spotlight_payment_operations_enabled()
    except SpotlightCommercialAccessError as exc:
        raise PipelineCreditAcquisitionError(exc.code, str(exc)) from exc
    try:
        ledger = debit_pipeline_credits(
            db,
            account_id=int(order.account_id),
            account_purpose=ACCOUNT_PURPOSE_CUSTOMER,
            amount=amount,
            workflow_key="pipeline_credit.acquisition.refund_reversal",
            idempotency_key=f"pipeline-credit-acquisition-refund:{idem}",
            reference_type="pipeline_credit_acquisition_order",
            reference_id=str(int(order.id)),
            note="Credit reversal for a classified cash refund; bank disbursement remains separate",
            created_by_user_id=int(actor_user_id),
            meta={"reason": normalized_reason},
            commit=False,
        )
    except InsufficientPipelineCreditError as exc:
        raise PipelineCreditAcquisitionError("refund_credit_balance_unavailable", str(exc)) from exc
    rate = Decimal(str(order.cash_amount)) / Decimal(str(order.credit_quantity))
    cash_amount = (amount * rate).quantize(CREDIT_QUANT, rounding=ROUND_HALF_UP)
    refund = PipelineCreditAcquisitionRefund(
        acquisition_order_id=int(order.id),
        cash_amount=cash_amount,
        reversed_credit_amount=amount,
        ledger_entry_id=int(ledger.id),
        status="recorded_not_disbursed",
        idempotency_key=idem,
        reason=normalized_reason,
        created_by_user_id=int(actor_user_id),
        created_at=_now(),
    )
    order.remaining_credit_amount = (available - amount).quantize(CREDIT_QUANT)
    order.status = "refunded" if order.remaining_credit_amount == Decimal("0.00") else "partially_refunded"
    order.updated_at = _now()
    db.add(order)
    db.add(refund)
    db.commit()
    db.refresh(refund)
    return refund


def acquisition_order_out(db: Session, row: PipelineCreditAcquisitionOrder) -> dict[str, Any]:
    exp = db.get(ExpectedPayment, int(row.expected_payment_id))
    refunds = (
        db.query(func.coalesce(func.sum(PipelineCreditAcquisitionRefund.cash_amount), 0))
        .filter(PipelineCreditAcquisitionRefund.acquisition_order_id == int(row.id))
        .scalar()
    )
    return {
        "id": int(row.id),
        "acquisition_key": row.acquisition_key,
        "pack_version_id": int(row.pack_version_id),
        "expected_payment_id": int(row.expected_payment_id),
        "reference": exp.reference_display if exp else None,
        "payment_status": exp.status if exp else None,
        "application_status": row.status,
        "payment_exception": (
            _json_object(exp.meta_json).get("pipeline_credit_acquisition_application_reason")
            if exp and str(exp.meta_json or "").strip()
            else None
        ),
        "cash_amount": f"{Decimal(str(row.cash_amount)):.2f}",
        "currency": row.currency,
        "credit_quantity": f"{Decimal(str(row.credit_quantity)):.2f}",
        "allocated_credit_amount": f"{Decimal(str(row.allocated_credit_amount)):.2f}",
        "remaining_credit_amount": f"{Decimal(str(row.remaining_credit_amount)):.2f}",
        "refund_cash_classified": f"{Decimal(str(refunds or 0)):.2f}",
        "funding_classification": row.funding_classification,
        "status": row.status,
        "collection_enabled": True,
        "real_collection_performed_by_this_endpoint": False,
    }
