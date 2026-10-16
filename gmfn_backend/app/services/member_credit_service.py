from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.member_credit_models import (
    FinancialNotificationOutbox,
    MemberCreditAwardObligation,
    MemberCreditPackVersion,
    MemberCreditPaymentAllocation,
    MemberCreditProviderPayment,
    MemberCreditPurchaseOrder,
    MemberCreditServiceVersion,
    MemberServiceCreditAccount,
    MemberServiceCreditLedgerEntry,
)


class MemberCreditError(RuntimeError):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


@dataclass(frozen=True)
class MemberCreditAwardResult:
    obligation_id: int
    account_id: int
    ledger_entry_id: int
    balance_units: int
    deduped: bool


@dataclass(frozen=True)
class MemberCreditRecoveryResult:
    selected: int
    obligations_created: int
    awards_applied: int
    skipped: int
    failures: tuple[dict[str, Any], ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "selected": self.selected, "obligations_created": self.obligations_created,
            "awards_applied": self.awards_applied, "skipped": self.skipped,
            "failures": list(self.failures),
        }


def request_fingerprint(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def get_member_credit_self(db: Session, *, member_user_id: int, limit: int = 50) -> dict[str, Any]:
    account = db.query(MemberServiceCreditAccount).filter_by(member_user_id=int(member_user_id)).one_or_none()
    if account is None:
        return {"member_user_id": int(member_user_id), "account_status": "not_opened", "balance_units": 0, "entries": []}
    rows = db.query(MemberServiceCreditLedgerEntry).filter_by(account_id=int(account.id)).order_by(
        MemberServiceCreditLedgerEntry.created_at.desc(), MemberServiceCreditLedgerEntry.id.desc()
    ).limit(int(limit)).all()
    return {
        "member_user_id": int(member_user_id), "account_status": str(account.status),
        "balance_units": int(account.balance_units),
        "entries": [{
            "id": int(row.id), "units_delta": int(row.units_delta),
            "balance_after": int(row.balance_after), "entry_type": str(row.entry_type),
            "reference_type": str(row.reference_type), "reference_id": str(row.reference_id),
            "created_at": row.created_at,
        } for row in rows],
    }


def create_service_quote(
    db: Session, *, member_user_id: int, service_version_id: int,
    now: Optional[datetime] = None,
) -> dict[str, Any]:
    service = db.get(MemberCreditServiceVersion, int(service_version_id))
    if service is None or str(service.status) != "test_active":
        raise MemberCreditError("service_version_not_test_active")
    quoted_at = _aware(now)
    valid_until = quoted_at + timedelta(minutes=15)
    payload = {
        "member_user_id": int(member_user_id), "service_version_id": int(service.id),
        "service_code": str(service.service_code), "catalog_version": int(service.version),
        "credit_cost": int(service.credit_cost), "duration_seconds": int(service.duration_seconds),
        "terms_json": service.terms_json, "quoted_at": quoted_at, "valid_until": valid_until,
    }
    payload["quote_key"] = f"test-service-{request_fingerprint(payload)[:24]}"
    payload["commercial_status"] = "test_only_not_for_activation"
    payload["funding_source_required"] = True
    payload["selected_funding_source"] = None
    payload["activation_performed"] = False
    return payload


def create_purchase_order(
    db: Session,
    *,
    member_user_id: int,
    pack_version_id: int,
    idempotency_key: str,
    now: Optional[datetime] = None,
    commit: bool = True,
) -> MemberCreditPurchaseOrder:
    key = _required(idempotency_key, "idempotency_key_required")
    pack = db.get(MemberCreditPackVersion, int(pack_version_id))
    if pack is None or str(pack.status) != "test_active":
        raise MemberCreditError("pack_version_not_test_active")
    fingerprint = request_fingerprint(
        {"member_user_id": int(member_user_id), "pack_version_id": int(pack_version_id)}
    )
    existing = (
        db.query(MemberCreditPurchaseOrder)
        .filter(MemberCreditPurchaseOrder.idempotency_key == key)
        .one_or_none()
    )
    if existing is not None:
        _require_fingerprint(existing.request_fingerprint, fingerprint)
        return existing
    row = MemberCreditPurchaseOrder(
        order_key=f"mcp-{hashlib.sha256(key.encode('utf-8')).hexdigest()[:24]}",
        member_user_id=int(member_user_id),
        pack_version_id=int(pack.id),
        quoted_amount_minor=int(pack.quoted_amount_minor),
        currency=str(pack.currency),
        credit_units=int(pack.credit_units),
        terms_json=pack.terms_json,
        status="awaiting_payment",
        funded_minor=0,
        idempotency_key=key,
        request_fingerprint=fingerprint,
        created_at=_aware(now),
        updated_at=_aware(now),
    )
    db.add(row)
    db.flush()
    if commit:
        db.commit()
        db.refresh(row)
    return row


def allocate_verified_payment(
    db: Session,
    *,
    provider_payment_id: int,
    purchase_order_id: int,
    amount_minor: int,
    policy_key: str,
    allow_partial_contributions: bool,
    now: Optional[datetime] = None,
    commit: bool = True,
) -> MemberCreditPaymentAllocation:
    amount = int(amount_minor)
    if amount <= 0:
        raise MemberCreditError("allocation_amount_must_be_positive")
    payment = (
        db.query(MemberCreditProviderPayment)
        .filter(MemberCreditProviderPayment.id == int(provider_payment_id))
        .with_for_update()
        .one_or_none()
    )
    order = (
        db.query(MemberCreditPurchaseOrder)
        .filter(MemberCreditPurchaseOrder.id == int(purchase_order_id))
        .with_for_update()
        .one_or_none()
    )
    if payment is None or order is None:
        raise MemberCreditError("payment_or_order_missing")
    existing = (
        db.query(MemberCreditPaymentAllocation)
        .filter(MemberCreditPaymentAllocation.provider_payment_id == int(payment.id))
        .filter(MemberCreditPaymentAllocation.purchase_order_id == int(order.id))
        .one_or_none()
    )
    if existing is not None:
        if int(existing.amount_minor) != amount or str(existing.policy_key) != str(policy_key):
            raise MemberCreditError("conflicting_payment_allocation_replay")
        return existing
    if str(payment.verification_status) not in {"verified", "test_verified"}:
        raise MemberCreditError("payment_not_verified")
    if str(payment.currency) != str(order.currency):
        payment.exception_code = "currency_mismatch_unallocated"
        raise MemberCreditError("payment_currency_mismatch")
    if order.fulfilled_at is not None or str(order.status) == "fulfilled":
        payment.exception_code = "fulfilled_order_additional_payment_unallocated"
        if commit:
            db.commit()
        raise MemberCreditError("purchase_order_already_fulfilled")
    payment_available = int(payment.amount_minor) - int(payment.allocated_minor)
    order_remaining = int(order.quoted_amount_minor) - int(order.funded_minor)
    if amount > payment_available:
        raise MemberCreditError("payment_overallocation_rejected")
    if amount > order_remaining:
        raise MemberCreditError("order_overfunding_policy_unresolved")
    if amount < order_remaining and not allow_partial_contributions:
        payment.exception_code = "underpayment_policy_unresolved"
        if commit:
            db.commit()
        raise MemberCreditError("partial_contribution_policy_not_enabled")
    with db.begin_nested():
        allocation = _apply_payment_allocation(
            db,
            payment=payment,
            order=order,
            amount=amount,
            policy_key=policy_key,
            now=now,
        )
    if commit:
        db.commit()
        db.refresh(allocation)
    return allocation


def _apply_payment_allocation(
    db: Session,
    *,
    payment: MemberCreditProviderPayment,
    order: MemberCreditPurchaseOrder,
    amount: int,
    policy_key: str,
    now: Optional[datetime],
) -> MemberCreditPaymentAllocation:
    updated_payment = (
        db.query(MemberCreditProviderPayment)
        .filter(MemberCreditProviderPayment.id == int(payment.id))
        .filter(MemberCreditProviderPayment.allocated_minor == int(payment.allocated_minor))
        .filter(MemberCreditProviderPayment.allocated_minor + amount <= MemberCreditProviderPayment.amount_minor)
        .update(
            {MemberCreditProviderPayment.allocated_minor: MemberCreditProviderPayment.allocated_minor + amount},
            synchronize_session=False,
        )
    )
    updated_order = (
        db.query(MemberCreditPurchaseOrder)
        .filter(MemberCreditPurchaseOrder.id == int(order.id))
        .filter(MemberCreditPurchaseOrder.funded_minor == int(order.funded_minor))
        .filter(MemberCreditPurchaseOrder.funded_minor + amount <= MemberCreditPurchaseOrder.quoted_amount_minor)
        .update(
            {
                MemberCreditPurchaseOrder.funded_minor: MemberCreditPurchaseOrder.funded_minor + amount,
                MemberCreditPurchaseOrder.updated_at: _aware(now),
            },
            synchronize_session=False,
        )
    )
    if updated_payment != 1 or updated_order != 1:
        raise MemberCreditError("payment_allocation_conflict")
    allocation = MemberCreditPaymentAllocation(
        provider_payment_id=int(payment.id),
        purchase_order_id=int(order.id),
        amount_minor=amount,
        status="allocated",
        policy_key=_required(policy_key, "policy_key_required"),
        created_at=_aware(now),
    )
    db.add(allocation)
    db.flush()
    db.expire(order)
    if int(order.funded_minor) == int(order.quoted_amount_minor):
        order.status = "funded_award_pending"
        _ensure_award_obligation(db, order=order, now=now)
    else:
        order.status = "partially_funded"
    db.flush()
    return allocation


def apply_award_obligation(
    db: Session,
    *,
    obligation_id: int,
    now: Optional[datetime] = None,
    commit: bool = True,
) -> MemberCreditAwardResult:
    obligation = (
        db.query(MemberCreditAwardObligation)
        .filter(MemberCreditAwardObligation.id == int(obligation_id))
        .with_for_update()
        .one_or_none()
    )
    if obligation is None:
        raise MemberCreditError("award_obligation_missing")
    if str(obligation.status) == "applied":
        ledger = db.get(MemberServiceCreditLedgerEntry, int(obligation.applied_ledger_entry_id))
        account = db.get(MemberServiceCreditAccount, int(ledger.account_id)) if ledger else None
        if ledger is None or account is None:
            raise MemberCreditError("applied_award_invariant_broken")
        return MemberCreditAwardResult(int(obligation.id), int(account.id), int(ledger.id), int(ledger.balance_after), True)
    with db.begin_nested():
        result = _apply_pending_award(db, obligation=obligation, now=now)
    if commit:
        db.commit()
    return result


def _apply_pending_award(
    db: Session,
    *,
    obligation: MemberCreditAwardObligation,
    now: Optional[datetime],
) -> MemberCreditAwardResult:
    order = (
        db.query(MemberCreditPurchaseOrder)
        .filter(MemberCreditPurchaseOrder.id == int(obligation.purchase_order_id))
        .with_for_update()
        .one()
    )
    if int(order.funded_minor) != int(order.quoted_amount_minor):
        raise MemberCreditError("purchase_order_not_fully_funded")
    if _verified_allocated_total(db, order=order) != int(order.quoted_amount_minor):
        raise MemberCreditError("purchase_order_verified_funding_invariant_failed")
    account = _locked_or_created_account(db, member_user_id=int(obligation.member_user_id), now=now)
    before = int(account.balance_units)
    version = int(account.version)
    after = before + int(obligation.credit_units)
    updated = (
        db.query(MemberServiceCreditAccount)
        .filter(MemberServiceCreditAccount.id == int(account.id))
        .filter(MemberServiceCreditAccount.version == version)
        .update(
            {
                MemberServiceCreditAccount.balance_units: after,
                MemberServiceCreditAccount.version: version + 1,
                MemberServiceCreditAccount.updated_at: _aware(now),
            },
            synchronize_session=False,
        )
    )
    if updated != 1:
        raise MemberCreditError("member_credit_account_conflict")
    ledger = MemberServiceCreditLedgerEntry(
        account_id=int(account.id),
        units_delta=int(obligation.credit_units),
        balance_after=after,
        entry_type="purchase_award",
        idempotency_key=f"award:{int(obligation.id)}",
        request_fingerprint=str(obligation.request_fingerprint),
        reference_type="purchase_order",
        reference_id=str(order.id),
        created_at=_aware(now),
    )
    db.add(ledger)
    db.flush()
    obligation.status = "applied"
    obligation.applied_ledger_entry_id = int(ledger.id)
    obligation.applied_at = _aware(now)
    obligation.updated_at = _aware(now)
    order.status = "fulfilled"
    order.fulfilled_at = _aware(now)
    order.updated_at = _aware(now)
    _persist_award_outbox(
        db,
        row=FinancialNotificationOutbox(
            aggregate_type="member_credit_purchase_order",
            aggregate_id=str(order.id),
            event_type="member_credit_awarded",
            dedupe_key=f"member-credit-awarded:{order.id}",
            payload_json=json.dumps(
                {"order_id": int(order.id), "credit_units": int(obligation.credit_units)},
                sort_keys=True,
            ),
            status="pending",
            created_at=_aware(now),
        ),
    )
    db.flush()
    return MemberCreditAwardResult(
        int(obligation.id), int(account.id), int(ledger.id), after, False
    )


def recover_funded_purchase_awards(
    db: Session, *, limit: int = 100, now: Optional[datetime] = None
) -> MemberCreditRecoveryResult:
    if int(limit) < 1 or int(limit) > 1000:
        raise MemberCreditError("recovery_limit_out_of_range")
    bind = db.get_bind()
    with Session(bind=bind) as scan_db:
        ids = [int(row[0]) for row in scan_db.query(MemberCreditPurchaseOrder.id).filter(
            MemberCreditPurchaseOrder.status == "funded_award_pending",
            MemberCreditPurchaseOrder.funded_minor == MemberCreditPurchaseOrder.quoted_amount_minor,
        ).order_by(MemberCreditPurchaseOrder.id.asc()).limit(int(limit)).all()]
    created = applied = skipped = 0
    failures: list[dict[str, Any]] = []
    for order_id in ids:
        with Session(bind=bind) as recovery_db:
            outcome = _recover_one_purchase_award(recovery_db, order_id=order_id, now=now)
        created += int(outcome["created"])
        applied += int(outcome["applied"])
        skipped += int(outcome["skipped"])
        if outcome["failure"]:
            failures.append(outcome["failure"])
    return MemberCreditRecoveryResult(len(ids), created, applied, skipped, tuple(failures))


def _recover_one_purchase_award(db: Session, *, order_id: int, now: Optional[datetime]) -> dict[str, Any]:
    created = False
    try:
        if db.get_bind().dialect.name == "postgresql":
            db.execute(text("SET LOCAL lock_timeout = '250ms'"))
        order = db.query(MemberCreditPurchaseOrder).filter_by(id=int(order_id)).with_for_update(skip_locked=True).one_or_none()
        if order is None or str(order.status) != "funded_award_pending":
            db.rollback()
            return {"created": False, "applied": False, "skipped": True, "failure": None}
        obligation = db.query(MemberCreditAwardObligation).filter_by(
            purchase_order_id=int(order.id)
        ).with_for_update().one_or_none()
        if obligation is None:
            obligation = _ensure_award_obligation(db, order=order, now=now)
            created = True
        apply_award_obligation(db, obligation_id=int(obligation.id), now=now, commit=False)
        db.commit()
        return {"created": created, "applied": True, "skipped": False, "failure": None}
    except Exception as exc:
        db.rollback()
        obligation = db.query(MemberCreditAwardObligation).filter_by(purchase_order_id=int(order_id)).one_or_none()
        if obligation is not None and str(obligation.status) != "applied":
            obligation.last_error = str(getattr(exc, "code", type(exc).__name__))[:1000]
            obligation.updated_at = _aware(now)
            db.commit()
        return {
            "created": False, "applied": False, "skipped": False,
            "failure": {"order_id": int(order_id), "error": getattr(exc, "code", type(exc).__name__)},
        }


def _verified_allocated_total(db: Session, *, order: MemberCreditPurchaseOrder) -> int:
    rows = db.query(MemberCreditPaymentAllocation, MemberCreditProviderPayment).join(
        MemberCreditProviderPayment,
        MemberCreditProviderPayment.id == MemberCreditPaymentAllocation.provider_payment_id,
    ).filter(MemberCreditPaymentAllocation.purchase_order_id == int(order.id)).all()
    total = 0
    for allocation, payment in rows:
        if str(allocation.status) != "allocated" or str(payment.verification_status) not in {"verified", "test_verified"}:
            return -1
        if str(payment.currency) != str(order.currency):
            return -1
        total += int(allocation.amount_minor)
    return total


def reconcile_member_credit_account(db: Session, *, account_id: int) -> dict[str, Any]:
    account = db.get(MemberServiceCreditAccount, int(account_id))
    if account is None:
        raise MemberCreditError("member_credit_account_missing")
    rows = (
        db.query(MemberServiceCreditLedgerEntry)
        .filter(MemberServiceCreditLedgerEntry.account_id == int(account_id))
        .order_by(MemberServiceCreditLedgerEntry.id.asc())
        .all()
    )
    ledger_total = sum(int(row.units_delta) for row in rows)
    chain_valid = all(int(row.balance_after) == sum(int(item.units_delta) for item in rows[: index + 1]) for index, row in enumerate(rows))
    return {
        "account_id": int(account.id),
        "stored_balance": int(account.balance_units),
        "ledger_total": ledger_total,
        "balanced": int(account.balance_units) == ledger_total,
        "chain_valid": chain_valid,
        "entry_count": len(rows),
    }


def _ensure_award_obligation(
    db: Session, *, order: MemberCreditPurchaseOrder, now: Optional[datetime]
) -> MemberCreditAwardObligation:
    existing = (
        db.query(MemberCreditAwardObligation)
        .filter(MemberCreditAwardObligation.purchase_order_id == int(order.id))
        .one_or_none()
    )
    if existing is not None:
        return existing
    fingerprint = request_fingerprint(
        {"purchase_order_id": int(order.id), "member_user_id": int(order.member_user_id), "credit_units": int(order.credit_units)}
    )
    row = MemberCreditAwardObligation(
        purchase_order_id=int(order.id),
        member_user_id=int(order.member_user_id),
        credit_units=int(order.credit_units),
        status="pending",
        idempotency_key=f"purchase-order-award:{order.id}",
        request_fingerprint=fingerprint,
        created_at=_aware(now),
        updated_at=_aware(now),
    )
    db.add(row)
    db.flush()
    return row


def _persist_award_outbox(db: Session, *, row: FinancialNotificationOutbox) -> None:
    """Failure-injection seam; award, ledger, fulfilment and outbox stay one transaction."""
    db.add(row)
    db.flush()


def _locked_or_created_account(
    db: Session, *, member_user_id: int, now: Optional[datetime]
) -> MemberServiceCreditAccount:
    account = (
        db.query(MemberServiceCreditAccount)
        .filter(MemberServiceCreditAccount.member_user_id == int(member_user_id))
        .with_for_update()
        .one_or_none()
    )
    if account is not None:
        return account
    account = MemberServiceCreditAccount(
        member_user_id=int(member_user_id),
        balance_units=0,
        version=0,
        status="active",
        created_at=_aware(now),
        updated_at=_aware(now),
    )
    db.add(account)
    db.flush()
    return account


def _require_fingerprint(stored: str, expected: str) -> None:
    if str(stored) != str(expected):
        raise MemberCreditError("conflicting_idempotency_fingerprint")


def _required(value: str, code: str) -> str:
    safe = str(value or "").strip()
    if not safe:
        raise MemberCreditError(code)
    return safe


def _aware(value: Optional[datetime]) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
