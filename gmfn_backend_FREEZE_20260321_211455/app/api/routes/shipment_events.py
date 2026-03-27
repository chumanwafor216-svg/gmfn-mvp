# app/api/routes/shipment_events.py
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User, Loan
from app.schemas.shipment import ShipmentUpdateIn, CourierLinkOut, BorrowerDeliveryConfirmIn
from app.services.courier_token_service import make_courier_token
from app.services.trust_events_services import log_trust_event

router = APIRouter(prefix="/loans", tags=["shipment"])

MERCHANT_STAGES = {"dispatched", "in_transit", "delivered", "delivery_issue"}


def _is_admin(u: User) -> bool:
    role = str(getattr(u, "role", "") or "").lower()
    return bool(getattr(u, "is_admin", False)) or role == "admin"


def _require_merchant_or_admin(u: User) -> None:
    role = str(getattr(u, "role", "") or "").lower()
    if _is_admin(u):
        return
    if role not in ("merchant", "admin"):
        raise HTTPException(status_code=403, detail="Merchant or admin access required")


@router.post("/{loan_id}/shipment")
def merchant_update_shipment(
    loan_id: int,
    payload: ShipmentUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Merchant/admin logs shipment stages (pilot safe):
    - merchant.dispatched
    - merchant.in_transit
    - merchant.delivered
    - merchant.delivery_issue
    """
    _require_merchant_or_admin(current_user)

    loan = db.query(Loan).filter(Loan.id == int(loan_id)).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    stage = payload.stage
    if stage not in MERCHANT_STAGES:
        raise HTTPException(status_code=400, detail="Invalid stage")

    event_type = f"merchant.{stage}"
    log_trust_event(
        db,
        event_type=event_type,
        clan_id=int(getattr(loan, "clan_id")),
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=int(current_user.id),
        subject_user_id=int(getattr(loan, "borrower_user_id")),
        meta={
            "policy": "trust_constitution_v1",
            "trust_delta": "0.00",
            "reason": "shipment_stage",
            "stage": stage,
            "carrier_name": payload.carrier_name,
            "tracking_number": payload.tracking_number,
            "expected_delivery_date": payload.expected_delivery_date,
            "contact_phone": payload.contact_phone,
            "note": payload.note,
            "self_reported": True,
            "source": "merchant",
        },
    )

    return {"ok": True, "loan_id": int(loan.id), "stage": stage, "event_type": event_type}


@router.get("/{loan_id}/courier-link", response_model=CourierLinkOut)
def get_courier_link(
    loan_id: int,
    expires_hours: int = 48,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Merchant/admin generates courier confirmation link to share via WhatsApp/SMS.
    Courier does NOT log in. Link expires.
    """
    _require_merchant_or_admin(current_user)

    loan = db.query(Loan).filter(Loan.id == int(loan_id)).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    borrower_user_id = int(getattr(loan, "borrower_user_id"))
    tok = make_courier_token(loan_id=int(loan.id), borrower_user_id=borrower_user_id, expires_hours=int(expires_hours))

    path = f"/courier/confirm-ui/{tok['token']}"
    return {
        "ok": True,
        "loan_id": int(loan.id),
        "borrower_user_id": borrower_user_id,
        "expires_hours": int(expires_hours),
        "path": path,
    }


@router.post("/{loan_id}/delivery-confirm")
def borrower_confirm_delivery(
    loan_id: int,
    payload: BorrowerDeliveryConfirmIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Borrower confirms delivery (C model).
    This increases peace-of-mind + dispute clarity, but does not alter trust score yet.
    """
    loan = db.query(Loan).filter(Loan.id == int(loan_id)).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    borrower_user_id = int(getattr(loan, "borrower_user_id"))
    if int(current_user.id) != borrower_user_id and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="Not permitted")

    log_trust_event(
        db,
        event_type="merchant.delivery_confirmed",
        clan_id=int(getattr(loan, "clan_id")),
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=int(current_user.id),
        subject_user_id=borrower_user_id,
        meta={
            "policy": "trust_constitution_v1",
            "trust_delta": "0.00",
            "reason": "delivery_confirmed",
            "note": payload.note,
            "source": "borrower",
        },
    )

    return {"ok": True, "loan_id": int(loan.id), "event_type": "merchant.delivery_confirmed"}