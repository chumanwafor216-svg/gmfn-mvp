from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.advertising_revenue_models import (
    AdvertisingCampaignSettlement,
    AdvertisingCommunityPayout,
    CommunityAdvertisingPayoutMandate,
)
from app.db.database import get_db
from app.db.models import Clan, ClanMembership, User
from app.services.advertising_revenue_service import (
    ACCOUNTING_BOUNDARY,
    ADVERTISING_COMMUNITY_SHARE_BPS_ENV,
    ADVERTISING_SETTLEMENT_CLAN_ENV,
    AdvertisingRevenueError,
    accept_payout_mandate,
    appoint_payout_beneficiary,
    calculate_settlement_amounts,
    community_share_bps,
    community_statement,
    create_campaign_payment_instruction,
    earning_payload,
    finalize_campaign_delivery,
    mandate_payload,
    payout_payload,
    prepare_community_payout,
    record_community_payout_paid,
    revoke_payout_mandate,
    save_settlement_draft,
    settlement_payload,
)
from app.services.payment_operations_policy import PaymentOperationsSuspended


router = APIRouter(prefix="/advertising-revenue", tags=["advertising-revenue"])


def _is_platform_admin(user: User) -> bool:
    return bool(getattr(user, "is_admin", False)) or str(
        getattr(user, "role", "") or ""
    ).strip().lower() == "admin"


def _require_platform_admin(user: User) -> None:
    if not _is_platform_admin(user):
        raise HTTPException(status_code=403, detail="GSN platform administrator access is required.")


def _community_authority(db: Session, *, clan_id: int, user: User) -> bool:
    if _is_platform_admin(user):
        return True
    clan = db.get(Clan, int(clan_id))
    if clan is None:
        raise HTTPException(status_code=404, detail="Community not found.")
    if int(getattr(clan, "created_by_user_id", 0) or 0) == int(user.id):
        return True
    membership = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == int(clan_id))
        .filter(ClanMembership.user_id == int(user.id))
        .filter(ClanMembership.left_at.is_(None))
        .one_or_none()
    )
    return str(getattr(membership, "role", "") or "").strip().lower() in {
        "admin",
        "owner",
        "founder",
    }


def _require_community_authority(db: Session, *, clan_id: int, user: User) -> None:
    if not _community_authority(db, clan_id=int(clan_id), user=user):
        raise HTTPException(
            status_code=403,
            detail="Only an authorised community owner or administrator can manage its advertising beneficiary.",
        )


def _raise_service_error(exc: AdvertisingRevenueError) -> None:
    status_code = 404 if exc.code.endswith("not_found") else 409
    if exc.code in {
        "invalid_amount",
        "negative_amount",
        "invalid_currency",
        "invalid_share_rate",
        "deductions_exceed_gross",
        "idempotency_key_required",
        "external_transaction_reference_required",
    }:
        status_code = 400
    raise HTTPException(
        status_code=status_code,
        detail={"code": exc.code, "message": str(exc)},
    ) from exc


class SettlementDraftIn(BaseModel):
    currency: str = Field(default="GBP", min_length=3, max_length=8)
    gross_amount: str = Field(min_length=1, max_length=40)
    tax_amount: str = Field(default="0", max_length=40)
    refund_amount: str = Field(default="0", max_length=40)
    chargeback_amount: str = Field(default="0", max_length=40)
    processing_fee_amount: str = Field(default="0", max_length=40)
    delivery_cost_amount: str = Field(default="0", max_length=40)
    idempotency_key: str = Field(min_length=8, max_length=160)

    @field_validator(
        "currency",
        "gross_amount",
        "tax_amount",
        "refund_amount",
        "chargeback_amount",
        "processing_fee_amount",
        "delivery_cost_amount",
        "idempotency_key",
        mode="before",
    )
    @classmethod
    def reject_non_text(cls, value: Any, info):
        if not isinstance(value, str):
            raise ValueError(f"{info.field_name} must be text.")
        return value


class PaymentInstructionIn(BaseModel):
    payer_user_id: int = Field(gt=0)
    settlement_country: Optional[str] = Field(default=None, max_length=8)


class PayoutAppointmentIn(BaseModel):
    beneficiary_user_id: int = Field(gt=0)
    authority_note: Optional[str] = Field(default=None, max_length=500)
    confirm_separate_beneficiary_authority: bool = False


class PayoutPreparationIn(BaseModel):
    clan_id: int = Field(gt=0)
    currency: str = Field(min_length=3, max_length=8)
    idempotency_key: str = Field(min_length=8, max_length=160)


class PayoutPaidIn(BaseModel):
    external_transaction_reference: str = Field(min_length=4, max_length=160)
    confirm_external_transfer_completed: bool = False


@router.get("/policy")
def advertising_revenue_policy(current_user: User = Depends(get_current_user)):
    _ = current_user
    bps = community_share_bps()
    return {
        "community_share_bps": bps,
        "community_share_percent": f"{bps / 100:.2f}",
        "basis": "distributable_net_advertising_revenue",
        "deductible_costs": [
            "tax",
            "refunds",
            "chargebacks",
            "payment_processing_fees",
            "campaign_specific_delivery_costs",
        ],
        "general_overhead_deducted": False,
        "rate_configuration": ADVERTISING_COMMUNITY_SHARE_BPS_ENV,
        "settlement_clan_configuration": ADVERTISING_SETTLEMENT_CLAN_ENV,
        "boundary": ACCOUNTING_BOUNDARY,
    }


@router.post("/preview")
def preview_advertising_revenue(
    payload: SettlementDraftIn,
    current_user: User = Depends(get_current_user),
):
    _require_platform_admin(current_user)
    try:
        amounts = calculate_settlement_amounts(
            gross_amount=payload.gross_amount,
            tax_amount=payload.tax_amount,
            refund_amount=payload.refund_amount,
            chargeback_amount=payload.chargeback_amount,
            processing_fee_amount=payload.processing_fee_amount,
            delivery_cost_amount=payload.delivery_cost_amount,
        )
    except AdvertisingRevenueError as exc:
        _raise_service_error(exc)
    return {
        key: str(value) if hasattr(value, "quantize") else value
        for key, value in amounts.items()
    } | {"currency": payload.currency.strip().upper(), "financial_effect": "none"}


@router.put("/admin/campaigns/{campaign_id}/settlement")
def save_advertising_settlement(
    campaign_id: int,
    payload: SettlementDraftIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_platform_admin(current_user)
    try:
        row = save_settlement_draft(
            db,
            campaign_id=int(campaign_id),
            actor_user_id=int(current_user.id),
            idempotency_key=payload.idempotency_key,
            currency=payload.currency,
            gross_amount=payload.gross_amount,
            tax_amount=payload.tax_amount,
            refund_amount=payload.refund_amount,
            chargeback_amount=payload.chargeback_amount,
            processing_fee_amount=payload.processing_fee_amount,
            delivery_cost_amount=payload.delivery_cost_amount,
        )
    except AdvertisingRevenueError as exc:
        _raise_service_error(exc)
    return {"ok": True, "settlement": settlement_payload(row), "financial_effect": "draft_only"}


@router.get("/admin/campaigns/{campaign_id}/settlement")
def get_advertising_settlement(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_platform_admin(current_user)
    row = (
        db.query(AdvertisingCampaignSettlement)
        .filter(AdvertisingCampaignSettlement.campaign_id == int(campaign_id))
        .one_or_none()
    )
    return {"settlement": settlement_payload(row) if row is not None else None, "boundary": ACCOUNTING_BOUNDARY}


@router.post("/admin/campaigns/{campaign_id}/payment-instruction")
def create_advertising_payment_instruction(
    campaign_id: int,
    payload: PaymentInstructionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_platform_admin(current_user)
    try:
        row, expected, settlement = create_campaign_payment_instruction(
            db,
            campaign_id=int(campaign_id),
            payer_user_id=int(payload.payer_user_id),
            actor_user_id=int(current_user.id),
            settlement_country=payload.settlement_country,
        )
    except PaymentOperationsSuspended as exc:
        raise HTTPException(status_code=409, detail={"code": "payment_operations_suspended", "message": str(exc)}) from exc
    except AdvertisingRevenueError as exc:
        _raise_service_error(exc)
    return {
        "ok": True,
        "settlement": settlement_payload(row),
        "payment_instruction": {
            "expected_payment_id": int(expected.id),
            "amount": str(expected.amount),
            "currency": expected.currency,
            "reference": expected.reference_display,
            "due_at": expected.due_at.isoformat() if expected.due_at else None,
            "settlement": settlement,
        },
        "boundary": "This creates an expected bank-transfer payment only; it does not confirm receipt.",
    }


@router.post("/admin/campaigns/{campaign_id}/finalize-delivery")
def finalize_advertising_delivery(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_platform_admin(current_user)
    try:
        rows = finalize_campaign_delivery(
            db,
            campaign_id=int(campaign_id),
            actor_user_id=int(current_user.id),
        )
    except AdvertisingRevenueError as exc:
        _raise_service_error(exc)
    return {
        "ok": True,
        "earnings": [earning_payload(row) for row in rows],
        "boundary": "Delivery is finalized from qualifying Spotlight evidence; no bank payout is executed.",
    }


@router.post("/communities/{clan_id}/payout-mandates")
def appoint_community_advertising_beneficiary(
    clan_id: int,
    payload: PayoutAppointmentIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_community_authority(db, clan_id=int(clan_id), user=current_user)
    if not payload.confirm_separate_beneficiary_authority:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "beneficiary_authority_confirmation_required",
                "message": (
                    "Confirm that this appointment creates payout-beneficiary authority only and does not grant "
                    "founder, operator, ownership, payer, or advertising-consent rights."
                ),
            },
        )
    try:
        row = appoint_payout_beneficiary(
            db,
            clan_id=int(clan_id),
            beneficiary_user_id=int(payload.beneficiary_user_id),
            appointed_by_user_id=int(current_user.id),
            authority_note=payload.authority_note,
        )
    except AdvertisingRevenueError as exc:
        _raise_service_error(exc)
    return {"ok": True, "mandate": mandate_payload(row)}


@router.get("/payout-mandates/mine")
def list_my_advertising_payout_appointments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(CommunityAdvertisingPayoutMandate)
        .filter(CommunityAdvertisingPayoutMandate.beneficiary_user_id == int(current_user.id))
        .order_by(CommunityAdvertisingPayoutMandate.created_at.desc(), CommunityAdvertisingPayoutMandate.id.desc())
        .all()
    )
    return {"items": [mandate_payload(row) for row in rows], "total": len(rows)}


@router.post("/payout-mandates/{mandate_id}/accept")
def accept_community_advertising_beneficiary(
    mandate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        row = accept_payout_mandate(
            db,
            mandate_id=int(mandate_id),
            beneficiary_user_id=int(current_user.id),
        )
    except AdvertisingRevenueError as exc:
        _raise_service_error(exc)
    return {"ok": True, "mandate": mandate_payload(row)}


@router.post("/payout-mandates/{mandate_id}/revoke")
def revoke_community_advertising_beneficiary(
    mandate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    row = db.get(CommunityAdvertisingPayoutMandate, int(mandate_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Payout appointment not found.")
    if int(row.beneficiary_user_id) != int(current_user.id):
        _require_community_authority(db, clan_id=int(row.clan_id), user=current_user)
    try:
        updated = revoke_payout_mandate(db, mandate_id=int(mandate_id), actor_user_id=int(current_user.id))
    except AdvertisingRevenueError as exc:
        _raise_service_error(exc)
    return {"ok": True, "mandate": mandate_payload(updated)}


@router.get("/communities/{clan_id}/statement")
def get_community_advertising_statement(
    clan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mandate = (
        db.query(CommunityAdvertisingPayoutMandate)
        .filter(CommunityAdvertisingPayoutMandate.clan_id == int(clan_id))
        .filter(CommunityAdvertisingPayoutMandate.status == "active")
        .first()
    )
    beneficiary = mandate is not None and int(mandate.beneficiary_user_id) == int(current_user.id)
    if not beneficiary:
        _require_community_authority(db, clan_id=int(clan_id), user=current_user)
    return community_statement(db, clan_id=int(clan_id))


@router.post("/admin/payouts/prepare")
def prepare_advertising_payout(
    payload: PayoutPreparationIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_platform_admin(current_user)
    try:
        row = prepare_community_payout(
            db,
            clan_id=int(payload.clan_id),
            currency=payload.currency,
            actor_user_id=int(current_user.id),
            idempotency_key=payload.idempotency_key,
        )
    except AdvertisingRevenueError as exc:
        _raise_service_error(exc)
    return {"ok": True, "payout": payout_payload(row, expose_destination=True), "money_moved": False}


@router.post("/admin/payouts/{payout_id}/record-paid")
def record_advertising_payout_paid(
    payout_id: int,
    payload: PayoutPaidIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_platform_admin(current_user)
    if not payload.confirm_external_transfer_completed:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "external_transfer_confirmation_required",
                "message": "Confirm that the transfer was completed outside GSN and record its real reference.",
            },
        )
    try:
        row = record_community_payout_paid(
            db,
            payout_id=int(payout_id),
            actor_user_id=int(current_user.id),
            external_transaction_reference=payload.external_transaction_reference,
        )
    except AdvertisingRevenueError as exc:
        _raise_service_error(exc)
    return {
        "ok": True,
        "payout": payout_payload(row, expose_destination=True),
        "provider_verified": False,
    }


@router.get("/admin/payouts/{payout_id}")
def get_advertising_payout(
    payout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_platform_admin(current_user)
    row = db.get(AdvertisingCommunityPayout, int(payout_id))
    if row is None:
        raise HTTPException(status_code=404, detail="Advertising payout instruction not found.")
    return {"payout": payout_payload(row, expose_destination=True)}
