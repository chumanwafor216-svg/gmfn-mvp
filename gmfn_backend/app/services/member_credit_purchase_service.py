from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional, Protocol

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.member_credit_models import (
    MemberCreditAwardObligation,
    MemberCreditCollectionAttempt,
    MemberCreditPackVersion,
    MemberCreditProviderPayment,
    MemberCreditPurchaseOrder,
    MemberCreditPurchaseQuote,
    MemberServiceCreditAccount,
    MemberServiceCreditLedgerEntry,
)
from app.services.member_credit_service import (
    MemberCreditError,
    allocate_verified_payment,
    apply_award_obligation,
    request_fingerprint,
)
from app.services.payment_operations_policy import require_payment_operations_enabled


SYNTHETIC_PAYMENTS_ENV = "GSN_MEMBER_CREDIT_SYNTHETIC_PAYMENTS_ENABLED"


@dataclass(frozen=True)
class CollectionSession:
    provider_session_id: str
    collection_reference: str
    public_payload: dict[str, object]


@dataclass(frozen=True)
class VerifiedTransfer:
    provider_transaction_id: str
    merchant_key: str
    collection_reference: str
    amount_minor: int
    currency: str
    verified_at: datetime
    settled_at: Optional[datetime] = None


class CollectionAdapter(Protocol):
    provider_key: str
    merchant_key: str

    def create_session(self, *, idempotency_key: str, reference: str, amount_minor: int, currency: str) -> CollectionSession: ...
    def check_session(self, *, provider_session_id: str) -> list[VerifiedTransfer]: ...


def require_synthetic_purchase_runtime() -> None:
    require_payment_operations_enabled()
    enabled = str(os.getenv(SYNTHETIC_PAYMENTS_ENV, "0")).strip().lower() in {"1", "true", "yes", "on"}
    if not enabled or str(os.getenv("PYTEST_RUNNING", "0")) != "1":
        raise MemberCreditError("synthetic_member_credit_runtime_not_enabled")


def _now(value: Optional[datetime] = None) -> datetime:
    result = value or datetime.now(timezone.utc)
    if result.tzinfo is None:
        return result.replace(tzinfo=timezone.utc)
    return result.astimezone(timezone.utc)


def _key(prefix: str, value: str) -> str:
    return f"{prefix}-{hashlib.sha256(value.encode('utf-8')).hexdigest()[:24]}"


def issue_purchase_quote(
    db: Session, *, member_user_id: int, pack_version_id: int,
    idempotency_key: str, now: Optional[datetime] = None,
) -> MemberCreditPurchaseQuote:
    require_synthetic_purchase_runtime()
    safe_key = str(idempotency_key or "").strip()
    if not safe_key:
        raise MemberCreditError("idempotency_key_required")
    pack = db.get(MemberCreditPackVersion, int(pack_version_id))
    if pack is None or str(pack.status) != "test_active":
        raise MemberCreditError("pack_version_not_test_active")
    scoped_key = f"member:{int(member_user_id)}:{safe_key}"
    fingerprint = request_fingerprint({"member_user_id": int(member_user_id), "pack_version_id": int(pack.id)})
    existing = db.query(MemberCreditPurchaseQuote).filter_by(
        member_user_id=int(member_user_id), idempotency_key=scoped_key
    ).one_or_none()
    if existing is not None:
        if str(existing.request_fingerprint) != fingerprint:
            raise MemberCreditError("conflicting_idempotency_fingerprint")
        return existing
    issued_at = _now(now)
    quote = MemberCreditPurchaseQuote(
        quote_key=_key("mcq", scoped_key), member_user_id=int(member_user_id),
        pack_version_id=int(pack.id), pack_code=str(pack.pack_code),
        catalog_version=int(pack.version), credit_units=int(pack.credit_units),
        amount_minor=int(pack.quoted_amount_minor), currency=str(pack.currency),
        terms_json=pack.terms_json, status="issued",
        expires_at=issued_at + timedelta(minutes=15), idempotency_key=scoped_key,
        request_fingerprint=fingerprint, created_at=issued_at,
    )
    db.add(quote)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        replay = db.query(MemberCreditPurchaseQuote).filter_by(
            member_user_id=int(member_user_id), idempotency_key=scoped_key
        ).one_or_none()
        if replay is None or str(replay.request_fingerprint) != fingerprint:
            raise MemberCreditError("purchase_quote_concurrency_conflict")
        return replay
    db.refresh(quote)
    return quote


def confirm_purchase(
    db: Session, *, member_user_id: int, quote_key: str,
    idempotency_key: str, now: Optional[datetime] = None,
) -> MemberCreditPurchaseOrder:
    require_synthetic_purchase_runtime()
    safe_key = str(idempotency_key or "").strip()
    if not safe_key:
        raise MemberCreditError("idempotency_key_required")
    quote = db.query(MemberCreditPurchaseQuote).filter_by(
        quote_key=str(quote_key), member_user_id=int(member_user_id)
    ).with_for_update().one_or_none()
    if quote is None:
        raise MemberCreditError("purchase_quote_not_found")
    scoped_key = f"member:{int(member_user_id)}:{safe_key}"
    fingerprint = request_fingerprint({"member_user_id": int(member_user_id), "quote_key": str(quote.quote_key)})
    replay = db.query(MemberCreditPurchaseOrder).filter_by(idempotency_key=scoped_key).one_or_none()
    if replay is not None:
        if str(replay.request_fingerprint) != fingerprint:
            raise MemberCreditError("conflicting_idempotency_fingerprint")
        if int(quote.confirmed_purchase_order_id or 0) != int(replay.id):
            raise MemberCreditError("purchase_quote_confirmation_conflict")
        return replay
    if quote.confirmed_purchase_order_id is not None:
        raise MemberCreditError("purchase_quote_already_confirmed")
    at = _now(now)
    expires_at = _now(quote.expires_at)
    if at >= expires_at:
        quote.status = "expired"
        db.commit()
        raise MemberCreditError("purchase_quote_expired")
    order = MemberCreditPurchaseOrder(
        order_key=_key("mcp", scoped_key), member_user_id=int(member_user_id),
        pack_version_id=int(quote.pack_version_id), quoted_amount_minor=int(quote.amount_minor),
        currency=str(quote.currency), credit_units=int(quote.credit_units), terms_json=quote.terms_json,
        status="awaiting_payment", funded_minor=0, idempotency_key=scoped_key,
        request_fingerprint=fingerprint, created_at=at, updated_at=at,
    )
    db.add(order)
    db.flush()
    quote.status = "confirmed"
    quote.confirmed_purchase_order_id = int(order.id)
    quote.confirmed_at = at
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        replay = db.query(MemberCreditPurchaseOrder).filter_by(idempotency_key=scoped_key).one_or_none()
        if replay is None or str(replay.request_fingerprint) != fingerprint:
            raise MemberCreditError("purchase_confirmation_concurrency_conflict")
        return replay
    db.refresh(order)
    return order


def ensure_collection_session(
    db: Session, *, member_user_id: int, order_key: str,
    idempotency_key: str, adapter: CollectionAdapter,
    now: Optional[datetime] = None,
) -> MemberCreditCollectionAttempt:
    require_synthetic_purchase_runtime()
    order = db.query(MemberCreditPurchaseOrder).filter_by(
        order_key=str(order_key), member_user_id=int(member_user_id)
    ).one_or_none()
    if order is None:
        raise MemberCreditError("purchase_order_not_found")
    safe_key = str(idempotency_key or "").strip()
    if not safe_key:
        raise MemberCreditError("idempotency_key_required")
    fingerprint = request_fingerprint({
        "member_user_id": int(member_user_id), "order_key": str(order.order_key),
        "provider_key": str(adapter.provider_key), "merchant_key": str(adapter.merchant_key),
    })
    attempt = db.query(MemberCreditCollectionAttempt).filter_by(
        purchase_order_id=int(order.id)
    ).one_or_none()
    if attempt is None:
        attempt = MemberCreditCollectionAttempt(
            attempt_key=_key("mca", f"{order.id}:{safe_key}"),
            purchase_order_id=int(order.id), provider_key=str(adapter.provider_key),
            merchant_key=str(adapter.merchant_key),
            collection_reference=_key("mcr", str(order.order_key)),
            status="creating", idempotency_key=safe_key,
            request_fingerprint=fingerprint, created_at=_now(now), updated_at=_now(now),
        )
        db.add(attempt)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            attempt = db.query(MemberCreditCollectionAttempt).filter_by(
                purchase_order_id=int(order.id)
            ).one()
    if str(attempt.request_fingerprint) != fingerprint or str(attempt.idempotency_key) != safe_key:
        raise MemberCreditError("conflicting_collection_session_replay")
    if attempt.provider_session_id and str(attempt.status) in {"ready", "verification_pending", "verified"}:
        return attempt
    attempt_id = int(attempt.id)
    attempt_key = str(attempt.attempt_key)
    collection_reference = str(attempt.collection_reference)
    amount_minor = int(order.quoted_amount_minor)
    currency = str(order.currency)
    # The durable attempt is committed before calling the adapter. No database
    # or financial row lock is held while an external collection system runs.
    db.commit()
    try:
        session = adapter.create_session(
            idempotency_key=attempt_key, reference=collection_reference,
            amount_minor=amount_minor, currency=currency,
        )
        _persist_collection_session(db, attempt_id=attempt_id, session=session, now=now)
    except Exception as exc:
        db.rollback()
        stored = db.get(MemberCreditCollectionAttempt, attempt_id)
        if stored is not None:
            stored.status = "creation_unknown"
            stored.last_error = type(exc).__name__
            stored.updated_at = _now(now)
            db.commit()
        raise
    return db.get(MemberCreditCollectionAttempt, attempt_id)


def _persist_collection_session(
    db: Session, *, attempt_id: int, session: CollectionSession,
    now: Optional[datetime],
) -> None:
    attempt = db.query(MemberCreditCollectionAttempt).filter_by(id=int(attempt_id)).with_for_update().one()
    if str(session.collection_reference) != str(attempt.collection_reference):
        raise MemberCreditError("provider_collection_reference_mismatch")
    if attempt.provider_session_id and str(attempt.provider_session_id) != str(session.provider_session_id):
        raise MemberCreditError("provider_session_identity_conflict")
    attempt.provider_session_id = str(session.provider_session_id)
    attempt.provider_payload_json = json.dumps(session.public_payload, sort_keys=True)
    attempt.status = "ready"
    attempt.last_error = None
    attempt.updated_at = _now(now)
    db.commit()


class SyntheticCollectionAdapter:
    provider_key = "synthetic-test-provider"
    merchant_key = "synthetic-test-merchant"

    def __init__(self) -> None:
        self.sessions: dict[str, CollectionSession] = {}
        self.transfers: dict[str, list[VerifiedTransfer]] = {}

    def create_session(self, *, idempotency_key: str, reference: str, amount_minor: int, currency: str) -> CollectionSession:
        existing = self.sessions.get(idempotency_key)
        if existing is not None:
            return existing
        result = CollectionSession(
            provider_session_id=_key("synthetic-session", idempotency_key),
            collection_reference=reference,
            public_payload={"kind": "synthetic_test_session", "amount_minor": amount_minor, "currency": currency},
        )
        self.sessions[idempotency_key] = result
        self.transfers[result.provider_session_id] = []
        return result

    def check_session(self, *, provider_session_id: str) -> list[VerifiedTransfer]:
        return list(self.transfers.get(provider_session_id, []))

    def record_transfer(self, *, provider_session_id: str, transfer: VerifiedTransfer) -> None:
        if provider_session_id not in self.transfers:
            raise MemberCreditError("synthetic_session_not_found")
        self.transfers[provider_session_id].append(transfer)


def check_purchase_payment(
    db: Session, *, member_user_id: int, order_key: str,
    adapter: CollectionAdapter, now: Optional[datetime] = None,
) -> dict[str, object]:
    require_synthetic_purchase_runtime()
    order = db.query(MemberCreditPurchaseOrder).filter_by(
        order_key=str(order_key), member_user_id=int(member_user_id)
    ).one_or_none()
    if order is None:
        raise MemberCreditError("purchase_order_not_found")
    attempt = db.query(MemberCreditCollectionAttempt).filter_by(
        purchase_order_id=int(order.id)
    ).one_or_none()
    if attempt is None or not attempt.provider_session_id:
        raise MemberCreditError("collection_session_not_ready")
    if str(attempt.provider_key) != str(adapter.provider_key) or str(attempt.merchant_key) != str(adapter.merchant_key):
        raise MemberCreditError("collection_adapter_identity_mismatch")
    provider_session_id = str(attempt.provider_session_id)
    db.commit()
    transfers = adapter.check_session(provider_session_id=provider_session_id)
    for transfer in transfers:
        _record_verified_transfer(db, order_id=int(order.id), attempt_id=int(attempt.id), transfer=transfer, now=now)
    _apply_order_award_if_pending(db, order_id=int(order.id), now=now)
    attempt = db.get(MemberCreditCollectionAttempt, int(attempt.id))
    attempt.status = "verified" if db.get(MemberCreditPurchaseOrder, int(order.id)).funded_minor else "verification_pending"
    attempt.updated_at = _now(now)
    db.commit()
    return purchase_status(db, member_user_id=member_user_id, order_key=order_key)


def _record_verified_transfer(
    db: Session, *, order_id: int, attempt_id: int,
    transfer: VerifiedTransfer, now: Optional[datetime],
) -> MemberCreditProviderPayment:
    attempt = db.get(MemberCreditCollectionAttempt, int(attempt_id))
    order = db.get(MemberCreditPurchaseOrder, int(order_id))
    existing = db.query(MemberCreditProviderPayment).filter_by(
        provider_key=str(attempt.provider_key), merchant_key=str(transfer.merchant_key),
        provider_transaction_id=str(transfer.provider_transaction_id),
    ).one_or_none()
    if existing is not None:
        if (
            int(existing.collection_attempt_id or 0) != int(attempt.id)
            or int(existing.amount_minor) != int(transfer.amount_minor)
            or str(existing.currency) != str(transfer.currency)
        ):
            raise MemberCreditError("conflicting_provider_transaction_replay")
        if transfer.settled_at is not None and existing.settled_at is None:
            existing.settled_at = _now(transfer.settled_at)
            db.commit()
        return existing
    mismatch = None
    if str(transfer.merchant_key) != str(attempt.merchant_key):
        mismatch = "merchant_mismatch_unallocated"
    elif str(transfer.collection_reference) != str(attempt.collection_reference):
        mismatch = "collection_reference_mismatch_unallocated"
    elif str(transfer.currency) != str(order.currency):
        mismatch = "currency_mismatch_unallocated"
    payment = MemberCreditProviderPayment(
        provider_key=str(attempt.provider_key), merchant_key=str(transfer.merchant_key),
        provider_transaction_id=str(transfer.provider_transaction_id),
        collection_attempt_id=int(attempt.id), amount_minor=int(transfer.amount_minor),
        allocated_minor=0, currency=str(transfer.currency),
        verification_status="rejected_mismatch" if mismatch else "test_verified",
        exception_code=mismatch, received_at=_now(transfer.verified_at),
        settled_at=_now(transfer.settled_at) if transfer.settled_at else None,
        created_at=_now(now),
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    if mismatch:
        return payment
    db.refresh(order)
    if order.fulfilled_at is not None:
        payment.exception_code = "fulfilled_order_additional_payment_unallocated"
        db.commit()
        return payment
    remaining = int(order.quoted_amount_minor) - int(order.funded_minor)
    if int(payment.amount_minor) != remaining:
        payment.exception_code = "amount_mismatch_unallocated"
        db.commit()
        return payment
    allocate_verified_payment(
        db, provider_payment_id=int(payment.id), purchase_order_id=int(order.id),
        amount_minor=int(payment.amount_minor), policy_key="synthetic_exact_purchase_link",
        allow_partial_contributions=False, now=now, commit=True,
    )
    return payment


def _apply_order_award_if_pending(db: Session, *, order_id: int, now: Optional[datetime]) -> None:
    order = db.get(MemberCreditPurchaseOrder, int(order_id))
    if str(order.status) != "funded_award_pending":
        return
    obligation = db.query(MemberCreditAwardObligation).filter_by(purchase_order_id=int(order.id)).one()
    try:
        _apply_verified_award(db, obligation_id=int(obligation.id), now=now)
    except Exception as exc:
        db.rollback()
        obligation = db.get(MemberCreditAwardObligation, int(obligation.id))
        if obligation is not None and str(obligation.status) != "applied":
            obligation.last_error = str(getattr(exc, "code", type(exc).__name__))[:1000]
            obligation.updated_at = _now(now)
            db.commit()


def _apply_verified_award(db: Session, *, obligation_id: int, now: Optional[datetime]) -> None:
    apply_award_obligation(db, obligation_id=obligation_id, now=now, commit=True)


def purchase_status(db: Session, *, member_user_id: int, order_key: str) -> dict[str, object]:
    order = db.query(MemberCreditPurchaseOrder).filter_by(
        order_key=str(order_key), member_user_id=int(member_user_id)
    ).one_or_none()
    if order is None:
        raise MemberCreditError("purchase_order_not_found")
    attempt = db.query(MemberCreditCollectionAttempt).filter_by(purchase_order_id=int(order.id)).one_or_none()
    payments = [] if attempt is None else db.query(MemberCreditProviderPayment).filter_by(
        collection_attempt_id=int(attempt.id)
    ).order_by(MemberCreditProviderPayment.id.asc()).all()
    obligation = db.query(MemberCreditAwardObligation).filter_by(purchase_order_id=int(order.id)).one_or_none()
    if str(order.status) == "fulfilled":
        display_status = "awarded"
    elif str(order.status) == "funded_award_pending":
        display_status = "verified_award_pending"
    elif any(str(row.verification_status) == "test_verified" for row in payments):
        display_status = "verification_exception"
    elif attempt is not None and attempt.provider_session_id:
        display_status = "verification_pending"
    else:
        display_status = "awaiting_payment"
    account = db.query(MemberServiceCreditAccount).filter_by(member_user_id=int(member_user_id)).one_or_none()
    return {
        "order_key": str(order.order_key), "status": display_status,
        "amount_minor": int(order.quoted_amount_minor), "currency": str(order.currency),
        "credit_units": int(order.credit_units), "funded_minor": int(order.funded_minor),
        "collection_reference": str(attempt.collection_reference) if attempt else None,
        "provider_session_id": str(attempt.provider_session_id) if attempt and attempt.provider_session_id else None,
        "award_error": str(obligation.last_error) if obligation and obligation.last_error else None,
        "balance_units": int(account.balance_units) if account else 0,
        "receipts": [{
            "provider_transaction_id": str(row.provider_transaction_id),
            "amount_minor": int(row.amount_minor), "currency": str(row.currency),
            "verification_status": str(row.verification_status),
            "exception_code": row.exception_code, "received_at": row.received_at,
            "settled_at": row.settled_at,
        } for row in payments],
    }


def list_member_purchases(db: Session, *, member_user_id: int) -> list[dict[str, object]]:
    orders = db.query(MemberCreditPurchaseOrder).filter_by(member_user_id=int(member_user_id)).order_by(
        MemberCreditPurchaseOrder.created_at.desc(), MemberCreditPurchaseOrder.id.desc()
    ).all()
    return [purchase_status(db, member_user_id=member_user_id, order_key=str(order.order_key)) for order in orders]
