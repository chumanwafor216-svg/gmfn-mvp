# app/api/routes/loans.py
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.auth import get_current_user
from app.core.clan_auth import get_current_clan_membership

from app.db.models import User, Loan, ClanMembership, LoanGuarantor

from app.schemas.repayments import RepaymentCreate, RepaymentOut, RepaymentsListResponse
from app.schemas.loans import (
    LoansListResponse,
    LoanCreate,
    LoanUpdate,
    LoanOut,
    LoanGuarantorCreate,
    LoanGuarantorOut,
    LoanSummaryOut,
    LoanGuarantorsListResponse,
    LoanGuarantorUpdate,
)
from app.schemas.guarantor_suggestions import GuarantorSuggestionsResponse

from app.services.repayments_service import create_repayment, list_repayments
from app.services.trust_events_services import log_trust_event
from app.services.loan_approval import approve_loan
from app.services.loans_service import (
    add_loan_guarantor,
    list_loan_guarantors,
    update_loan_guarantor_status,
    count_approved_guarantors,
)

# Trust enforcement (B3) — OFF by default via env flag
from app.services.trust_score_service import trust_enforcement_enabled, loan_policy_for_band

# Guarantor suggestions (C2)
from app.services.guarantor_suggestions_service import suggest_guarantors_for_loan


router = APIRouter(prefix="/loans", tags=["loans"])


def _uid(user: User) -> int:
    return int(user.id)


def _require_clan_admin(membership: ClanMembership) -> None:
    if (membership.role or "").lower() != "admin":
        raise HTTPException(status_code=403, detail="Clan admin privileges required")


def _require_same_clan(loan: Loan, clan_id: int) -> None:
    if int(loan.clan_id) != int(clan_id):
        raise HTTPException(status_code=403, detail="Not allowed (wrong clan context)")


@router.get("/admin/all", response_model=LoansListResponse)
def list_all_loans_admin(
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    _require_clan_admin(membership)

    items = (
        db.query(Loan)
        .filter(Loan.clan_id == clan.id)
        .order_by(Loan.id.desc())
        .all()
    )
    return {"items": items, "total": len(items)}


@router.get("", response_model=LoansListResponse)
def list_my_loans(
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    items = (
        db.query(Loan)
        .filter(Loan.clan_id == clan.id)
        .filter(Loan.borrower_user_id == _uid(current_user))
        .order_by(Loan.id.desc())
        .all()
    )
    return {"items": items, "total": len(items)}


@router.post("", response_model=LoanOut, status_code=201)
def create_loan(
    payload: LoanCreate,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    requested = Decimal(str(payload.amount))
    if requested <= 0:
        raise HTTPException(status_code=400, detail="amount must be > 0")

    personal_pool = getattr(membership, "personal_pool_balance", None) or Decimal("0")
    within_pool = requested <= personal_pool

    # Existing default rule:
    guarantors_required = 0 if within_pool else 2
    new_status = "approved" if within_pool else "pending"
    decision_by_user_id = _uid(current_user) if within_pool else None
    decision_at = datetime.now(timezone.utc) if within_pool else None

    # ✅ B3: Trust band enforcement (only if enabled)
    if trust_enforcement_enabled():
        band = getattr(current_user, "trust_band", None) or "C"
        policy = loan_policy_for_band(band)

        max_amount = Decimal(str(policy["max_amount"]))
        if requested > max_amount:
            raise HTTPException(
                status_code=400,
                detail=f"Trust band {band}: max loan amount is {policy['max_amount']}.",
            )

        if not within_pool:
            guarantors_required = max(int(guarantors_required), int(policy["min_guarantors"]))

    loan = Loan(
        clan_id=clan.id,
        borrower_user_id=_uid(current_user),
        amount=requested,
        currency=getattr(payload, "currency", None) or "NGN",
        status=new_status,
        guarantors_required=guarantors_required,
        decision_by_user_id=decision_by_user_id,
        decision_at=decision_at,
    )
    db.add(loan)

    # Auto-approved via personal pool: reduce personal balance
    if within_pool:
        db_membership = db.get(ClanMembership, membership.id)
        if db_membership:
            db_membership.personal_pool_balance = personal_pool - requested

    db.commit()
    db.refresh(loan)

    # ✅ TrustEvent: loan created (with explainable meta)
    log_trust_event(
        db,
        event_type="loan.created",
        clan_id=clan.id,
        loan_id=loan.id,
        guarantor_id=None,
        actor_user_id=_uid(current_user),
        subject_user_id=_uid(current_user),
        meta={
            "reason": "loan_created",
            "note": (
                f"Loan request created for {loan.currency} {str(requested)}. "
                f"Status set to '{loan.status}'. "
                f"{'Covered by personal pool (no guarantors required).' if within_pool else 'Guarantors required for approval.'}"
            ),
            "amount": str(requested),
            "currency": loan.currency,
            "status": loan.status,
            "guarantors_required": guarantors_required,
            "within_personal_pool": within_pool,
            "personal_pool_balance": str(personal_pool),
        },
    )

    if within_pool:
        log_trust_event(
            db,
            event_type="loan.auto_approved_by_pool",
            clan_id=clan.id,
            loan_id=loan.id,
            guarantor_id=None,
            actor_user_id=_uid(current_user),
            subject_user_id=_uid(current_user),
            meta={
                "reason": "loan_auto_approved_by_personal_pool",
                "note": (
                    f"Loan auto-approved because requested amount ({loan.currency} {str(requested)}) "
                    f"is within personal pool balance."
                ),
                "amount": str(requested),
                "currency": loan.currency,
                "personal_pool_before": str(personal_pool),
                "personal_pool_after": str(personal_pool - requested),
            },
        )

    return loan


@router.get("/{loan_id}", response_model=LoanOut)
def get_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == _uid(current_user),
            ClanMembership.clan_id == loan.clan_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=403, detail="Not allowed")

    is_owner = int(loan.borrower_user_id) == _uid(current_user)
    is_clan_admin = (m.role or "").lower() == "admin"

    if not (is_owner or is_clan_admin):
        raise HTTPException(status_code=403, detail="Not allowed")

    return loan


@router.patch("/{loan_id}", response_model=LoanOut)
def update_loan_status(
    loan_id: int,
    payload: LoanUpdate,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    _require_clan_admin(membership)

    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    _require_same_clan(loan, clan.id)

    if payload.status == "approved":
        approved_count = count_approved_guarantors(db, loan_id=loan.id)
        required = loan.guarantors_required or 0
        if approved_count < required:
            raise HTTPException(
                status_code=400,
                detail=f"Loan requires {required} approved guarantor(s); currently {approved_count}.",
            )

        approve_loan(db=db, loan=loan, decided_by_user_id=_uid(current_user))

        log_trust_event(
            db,
            event_type="loan.approved_by_admin",
            clan_id=clan.id,
            loan_id=loan.id,
            guarantor_id=None,
            actor_user_id=_uid(current_user),
            subject_user_id=int(loan.borrower_user_id),
            meta={
                "reason": "loan_approved_by_admin",
                "note": f"Loan approved by clan admin user #{_uid(current_user)}.",
                "status": loan.status,
            },
        )
        return loan

    if payload.status == "rejected":
        loan.status = "rejected"
        loan.decision_by_user_id = _uid(current_user)
        loan.decision_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(loan)

        log_trust_event(
            db,
            event_type="loan.rejected_by_admin",
            clan_id=clan.id,
            loan_id=loan.id,
            guarantor_id=None,
            actor_user_id=_uid(current_user),
            subject_user_id=int(loan.borrower_user_id),
            meta={
                "reason": "loan_rejected_by_admin",
                "note": f"Loan rejected by clan admin user #{_uid(current_user)}.",
                "status": loan.status,
            },
        )
        return loan

    loan.status = payload.status
    db.commit()
    db.refresh(loan)
    return loan


@router.post("/{loan_id}/guarantors", response_model=LoanGuarantorOut, status_code=201)
def create_loan_guarantor(
    loan_id: int,
    payload: LoanGuarantorCreate,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    _require_same_clan(loan, clan.id)

    is_owner = int(loan.borrower_user_id) == _uid(current_user)
    is_admin = (membership.role or "").lower() == "admin"
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Only the borrower or clan admin can add guarantors")

    guarantor = add_loan_guarantor(
        db,
        loan_id=loan_id,
        clan_id=clan.id,
        guarantor_user_id=payload.guarantor_user_id,
        pledge_amount=payload.pledge_amount,
    )

    log_trust_event(
        db,
        event_type="guarantor.requested",
        clan_id=clan.id,
        loan_id=loan.id,
        guarantor_id=guarantor.id,
        actor_user_id=_uid(current_user),
        subject_user_id=int(payload.guarantor_user_id),
        meta={
            "reason": "guarantor_request_sent",
            "note": (
                f"Guarantor request sent for loan #{loan.id}. "
                f"Requested pledge amount: {loan.currency} {str(payload.pledge_amount)}."
            ),
            "pledge_amount": str(payload.pledge_amount),
            "currency": loan.currency,
            "borrower_user_id": int(loan.borrower_user_id),
            "guarantor_user_id": int(payload.guarantor_user_id),
        },
    )

    return guarantor


@router.get("/{loan_id}/guarantors", response_model=LoanGuarantorsListResponse)
def get_loan_guarantors(
    loan_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    _require_same_clan(loan, clan.id)

    items = list_loan_guarantors(db, loan_id=loan_id, clan_id=clan.id)
    return {"items": items, "total": len(items)}


# ✅ C2: suggestions endpoint
@router.get("/{loan_id}/guarantors/suggestions", response_model=GuarantorSuggestionsResponse)
def get_guarantor_suggestions(
    loan_id: int,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    _require_same_clan(loan, clan.id)

    data = suggest_guarantors_for_loan(
        db,
        loan_id=int(loan_id),
        clan_id=int(clan.id),
        borrower_user_id=int(loan.borrower_user_id),
        limit=int(limit),
    )
    return data


@router.patch("/{loan_id}/guarantors/{guarantor_id}", response_model=LoanGuarantorOut)
def decide_loan_guarantor(
    loan_id: int,
    guarantor_id: int,
    payload: LoanGuarantorUpdate,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    _require_same_clan(loan, clan.id)

    g = db.get(LoanGuarantor, guarantor_id)
    if not g or int(g.loan_id) != int(loan_id):
        raise HTTPException(status_code=404, detail="Guarantor not found")

    is_guarantor = int(g.guarantor_user_id) == _uid(current_user)
    is_admin = (membership.role or "").lower() == "admin"

    if (not is_guarantor) and (not is_admin):
        raise HTTPException(status_code=403, detail="Only the guarantor or a clan admin can decide")

    if int(loan.borrower_user_id) == _uid(current_user) and not is_guarantor:
        raise HTTPException(status_code=403, detail="Borrower cannot decide guarantees")

    result = update_loan_guarantor_status(
        db,
        guarantor_id=guarantor_id,
        clan_id=clan.id,
        status=payload.status,
        decided_by_user_id=_uid(current_user),
    )

    meta = {
        "status": payload.status,
        "reason": getattr(payload, "reason", None) or f"guarantor_{payload.status}",
        "note": getattr(payload, "note", None)
        or f"Guarantor set status to '{payload.status}' for loan #{loan.id}.",
    }
    if getattr(payload, "reason", None):
        meta["reason"] = payload.reason
    if getattr(payload, "note", None):
        meta["note"] = payload.note

    log_trust_event(
        db,
        event_type="guarantor.decided",
        clan_id=clan.id,
        loan_id=loan.id,
        guarantor_id=guarantor_id,
        actor_user_id=_uid(current_user),
        subject_user_id=int(g.guarantor_user_id),
        meta=meta,
    )

    if payload.status == "approved":
        db.refresh(loan)
        if loan.status == "pending":
            approved_count = count_approved_guarantors(db, loan_id=loan.id)
            required = loan.guarantors_required or 0
            if required > 0 and approved_count >= required:
                approve_loan(db=db, loan=loan, decided_by_user_id=_uid(current_user))
                log_trust_event(
                    db,
                    event_type="loan.auto_approved_by_guarantors",
                    clan_id=clan.id,
                    loan_id=loan.id,
                    guarantor_id=None,
                    actor_user_id=_uid(current_user),
                    subject_user_id=int(loan.borrower_user_id),
                    meta={
                        "reason": "loan_auto_approved_by_guarantors",
                        "note": f"Loan auto-approved after enough guarantors approved ({approved_count}/{required}).",
                        "approved_count": approved_count,
                        "required": required,
                    },
                )

    return result


@router.post("/{loan_id}/repayments", response_model=RepaymentOut, status_code=201)
def repay_loan(
    loan_id: int,
    payload: RepaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repayment, loan = create_repayment(
        db=db,
        loan_id=loan_id,
        payer=current_user,
        amount=Decimal(str(payload.amount)),
    )

    log_trust_event(
        db,
        event_type="repayment.made",
        clan_id=int(loan.clan_id),
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=_uid(current_user),
        subject_user_id=int(loan.borrower_user_id),
        meta={
            "reason": "repayment_made",
            "note": (
                f"Repayment recorded for loan #{loan.id}: "
                f"{loan.currency} {str(payload.amount)} paid by user #{_uid(current_user)}."
            ),
            "amount": str(payload.amount),
            "currency": loan.currency,
            "payer_user_id": _uid(current_user),
            "borrower_user_id": int(loan.borrower_user_id),
        },
    )

    return repayment


@router.get("/{loan_id}/repayments", response_model=RepaymentsListResponse)
def get_repayments(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == _uid(current_user),
            ClanMembership.clan_id == loan.clan_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=403, detail="Not allowed")

    items = list_repayments(db, loan_id=loan_id) or []
    return {"items": items, "total": len(items)}


@router.get("/{loan_id}/summary", response_model=LoanSummaryOut)
def get_loan_summary(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == _uid(current_user),
            ClanMembership.clan_id == loan.clan_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=403, detail="Not allowed")

    is_clan_admin = (m.role or "").lower() == "admin"
    is_owner = int(loan.borrower_user_id) == _uid(current_user)

    if not (is_owner or is_clan_admin):
        raise HTTPException(status_code=403, detail="Not allowed")

    approved_guarantors = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == loan.id, LoanGuarantor.status == "approved")
        .count()
    )
    guarantors_total = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == loan.id)
        .count()
    )

    return {
        "id": loan.id,
        "clan_id": loan.clan_id,
        "borrower_user_id": loan.borrower_user_id,
        "status": loan.status,
        "amount": float(loan.amount),
        "currency": loan.currency,
        "service_fee": float(getattr(loan, "service_fee", 0) or 0),
        "net_disbursed_amount": float(getattr(loan, "net_disbursed_amount", 0) or 0),
        "guarantor_pool": float(getattr(loan, "guarantor_pool", 0) or 0),
        "platform_revenue": float(getattr(loan, "platform_revenue", 0) or 0),
        "paid_total": float(getattr(loan, "paid_total", 0) or 0),
        "remaining_amount": float(getattr(loan, "remaining_amount", 0) or 0),
        "repaid_at": getattr(loan, "repaid_at", None),
        "due_at": getattr(loan, "due_at", None),
        "guarantors_required": int(getattr(loan, "guarantors_required", 0) or 0),
        "guarantors_total": int(guarantors_total),
        "approved_guarantors": int(approved_guarantors),
        "created_at": getattr(loan, "created_at", None),
        "decision_at": getattr(loan, "decision_at", None),
    }
