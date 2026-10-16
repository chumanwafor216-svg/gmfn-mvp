from __future__ import annotations

import os

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.schemas.member_credits import (
    MemberCreditSelfOut,
    PurchaseConfirmIn,
    PurchaseQuoteCreateIn,
    PurchaseQuoteOut,
    PurchaseStatusOut,
    ServiceQuoteOut,
)
from app.services.member_credit_service import MemberCreditError, create_service_quote, get_member_credit_self
from app.services.member_credit_purchase_service import (
    CollectionAdapter,
    SyntheticCollectionAdapter,
    check_purchase_payment,
    confirm_purchase,
    ensure_collection_session,
    issue_purchase_quote,
    list_member_purchases,
    purchase_status,
)
from app.services.payment_operations_policy import PaymentOperationsSuspended
from app.services.stripe_member_credit_service import StripeCheckoutCollectionAdapter


router = APIRouter(prefix="/member-credits", tags=["member-credits"])
_synthetic_adapter = SyntheticCollectionAdapter()


def _collection_adapter() -> CollectionAdapter:
    provider = str(os.getenv("GSN_MEMBER_CREDIT_COLLECTION_PROVIDER", "") or "").strip().lower()
    synthetic_enabled = (
        str(os.getenv("PYTEST_RUNNING", "0")) == "1"
        and str(os.getenv("GSN_MEMBER_CREDIT_SYNTHETIC_PAYMENTS_ENABLED", "0")).strip().lower()
        in {"1", "true", "yes", "on"}
    )
    if provider == "stripe":
        return StripeCheckoutCollectionAdapter.from_environment()
    if synthetic_enabled and provider in {"", "synthetic-test-provider"}:
        return _synthetic_adapter
    raise MemberCreditError("member_credit_collection_provider_not_configured")


def _test_quotes_enabled() -> bool:
    return (
        str(os.getenv("PYTEST_RUNNING", "0")) == "1"
        and str(os.getenv("GSN_MEMBER_CREDIT_TEST_QUOTES_ENABLED", "0")).strip().lower()
        in {"1", "true", "yes", "on"}
    )


def _raise_api_error(exc: Exception) -> None:
    if isinstance(exc, PaymentOperationsSuspended):
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    code = str(getattr(exc, "code", type(exc).__name__))
    if code in {"purchase_quote_not_found", "purchase_order_not_found"}:
        raise HTTPException(status_code=404, detail=code) from exc
    if code in {"synthetic_member_credit_runtime_not_enabled", "pack_version_not_available"}:
        raise HTTPException(status_code=404, detail=code) from exc
    if code == "member_credit_collection_provider_not_configured" or code.endswith("_required"):
        raise HTTPException(status_code=503, detail=code) from exc
    raise HTTPException(status_code=409, detail=code) from exc


@router.get("/me", response_model=MemberCreditSelfOut)
def read_my_member_credits(
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    return get_member_credit_self(db, member_user_id=int(current_user.id), limit=limit)


@router.post("/purchase-quotes", response_model=PurchaseQuoteOut)
def create_my_purchase_quote(
    payload: PurchaseQuoteCreateIn, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        row = issue_purchase_quote(
            db, member_user_id=int(current_user.id), pack_version_id=payload.pack_version_id,
            idempotency_key=payload.idempotency_key,
        )
        return {
            "quote_key": row.quote_key, "pack_code": row.pack_code,
            "catalog_version": row.catalog_version, "credit_units": row.credit_units,
            "amount_minor": row.amount_minor, "currency": row.currency,
            "terms_json": row.terms_json, "status": row.status,
            "expires_at": row.expires_at, "created_at": row.created_at,
        }
    except (MemberCreditError, PaymentOperationsSuspended) as exc:
        _raise_api_error(exc)


@router.get("/quotes/services/{service_version_id}", response_model=ServiceQuoteOut)
def quote_test_service(
    service_version_id: int = Path(..., ge=1), db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not _test_quotes_enabled():
        raise HTTPException(status_code=404, detail="test_quote_contract_not_enabled")
    try:
        return create_service_quote(
            db, member_user_id=int(current_user.id), service_version_id=service_version_id,
        )
    except MemberCreditError as exc:
        _raise_api_error(exc)


@router.post("/purchases", response_model=PurchaseStatusOut)
def confirm_my_purchase(
    payload: PurchaseConfirmIn, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        order = confirm_purchase(
            db, member_user_id=int(current_user.id), quote_key=payload.quote_key,
            idempotency_key=payload.idempotency_key,
        )
        ensure_collection_session(
            db, member_user_id=int(current_user.id), order_key=str(order.order_key),
            idempotency_key=payload.idempotency_key, adapter=_collection_adapter(),
        )
        return purchase_status(db, member_user_id=int(current_user.id), order_key=str(order.order_key))
    except (MemberCreditError, PaymentOperationsSuspended) as exc:
        _raise_api_error(exc)


@router.get("/me/purchases", response_model=list[PurchaseStatusOut])
def read_my_purchases(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user),
):
    return list_member_purchases(db, member_user_id=int(current_user.id))


@router.get("/purchases/{order_key}", response_model=PurchaseStatusOut)
def read_my_purchase(
    order_key: str, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return purchase_status(db, member_user_id=int(current_user.id), order_key=order_key)
    except MemberCreditError as exc:
        _raise_api_error(exc)


@router.post("/purchases/{order_key}/check-payment", response_model=PurchaseStatusOut)
def check_my_purchase_payment(
    order_key: str, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return check_purchase_payment(
            db, member_user_id=int(current_user.id), order_key=order_key,
            adapter=_collection_adapter(),
        )
    except (MemberCreditError, PaymentOperationsSuspended) as exc:
        _raise_api_error(exc)
