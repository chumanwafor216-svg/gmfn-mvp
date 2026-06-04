# app/api/routes/loans.py
from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.clan_auth import get_current_clan_membership
from app.db.database import get_db
from app.db.models import ClanMembership, Loan, LoanGuarantor, User
from app.schemas.guarantor_suggestions import GuarantorSuggestionsResponse
from app.schemas.loans import (
    LoanCreate,
    LoanGuarantorCreate,
    LoanGuarantorOut,
    LoanGuarantorUpdate,
    LoanGuarantorsListResponse,
    LoanOut,
    LoanSummaryOut,
    LoansListResponse,
    LoanUpdate,
)
from app.schemas.repayments import RepaymentCreate, RepaymentOut, RepaymentsListResponse
from app.services.guarantor_suggestions_service import suggest_guarantors_for_loan
from app.services.loan_overdue_service import run_overdue_default_scan
from app.services.loan_tier_rules import compute_loan_snapshot
from app.services.loans_service import (
    add_loan_guarantor,
    cancel_loan,
    count_approved_guarantors,
    list_loan_guarantors,
    update_loan_guarantor_status,
)
from app.services.pool_service import compute_pool_balances
from app.services.repayments_service import create_repayment, list_repayments
from app.services.trust_events_services import log_trust_event
from app.services.trust_score_service import loan_policy_for_band, trust_enforcement_enabled

router = APIRouter(prefix="/loans", tags=["loans"])


def _uid(user: User) -> int:
    return int(user.id)


def _require_clan_admin(membership: ClanMembership) -> None:
    if (membership.role or "").lower() != "admin":
        raise HTTPException(
            status_code=403,
            detail="Clan admin privileges required",
        )


def _require_same_clan(loan: Loan, clan_id: int) -> None:
    if int(loan.clan_id) != int(clan_id):
        raise HTTPException(
            status_code=403,
            detail="Not allowed (wrong clan context)",
        )


@router.get("", response_model=LoansListResponse)
def list_my_loans(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, current_user = clan_ctx

    items = (
        db.query(Loan)
        .filter(Loan.clan_id == int(clan.id))
        .filter(Loan.borrower_user_id == _uid(current_user))
        .order_by(Loan.id.desc())
        .limit(int(limit))
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
        raise HTTPException(
            status_code=400,
            detail="amount must be > 0",
        )

    ccy = (getattr(payload, "currency", None) or "NGN").strip().upper() or "NGN"
    pool_balances = compute_pool_balances(
        db,
        clan_id=int(clan.id),
        user_id=_uid(current_user),
        currency=ccy,
    )
    personal_pool = Decimal(str(pool_balances.get("effective_available") or "0"))

    snap = compute_loan_snapshot(
        loan_amount=requested,
        personal_pool_at_request=personal_pool,
        max_guarantors=12,
        starter_guarantors_when_pool_zero=4,
    )

    pool_used = snap.pool_used
    guarantee_gap = snap.guarantee_gap
    guarantors_required = int(snap.guarantors_required)
    within_pool = guarantee_gap == Decimal("0")

    new_status = "approved" if within_pool else "pending"
    decision_by_user_id = _uid(current_user) if within_pool else None
    decision_at = datetime.now(timezone.utc) if within_pool else None

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
            policy_min = int(policy.get("min_guarantors") or 0)
            guarantors_required = max(int(guarantors_required), policy_min)
            guarantors_required = min(12, int(guarantors_required))

    loan = Loan(
        clan_id=clan.id,
        borrower_user_id=_uid(current_user),
        amount=requested,
        currency=ccy,
        status=new_status,
        guarantors_required=int(guarantors_required),
        personal_pool_at_request=personal_pool,
        pool_used=pool_used,
        guarantee_gap=guarantee_gap,
        decision_by_user_id=decision_by_user_id,
        decision_at=decision_at,
    )
    db.add(loan)

    db.commit()
    db.refresh(loan)

    log_trust_event(
        db,
        event_type="loan.created",
        clan_id=int(clan.id),
        loan_id=int(loan.id),
        guarantor_id=None,
        actor_user_id=_uid(current_user),
        subject_user_id=_uid(current_user),
        meta={
            "reason": "loan_created",
            "note": (
                f"Loan request created for {loan.currency} {str(requested)}. "
                f"Personal pool at request={str(personal_pool)}. "
                f"Pool used={str(pool_used)}. "
                f"Guarantee gap={str(guarantee_gap)}. "
                f"Guarantors required={int(guarantors_required)}. "
                f"Status='{loan.status}'. "
                f"{'Covered fully by personal pool.' if within_pool else 'Guarantors required to cover gap beyond personal pool.'}"
            ),
            "amount": str(requested),
            "currency": loan.currency,
            "status": loan.status,
            "guarantors_required": int(guarantors_required),
            "within_personal_pool": bool(within_pool),
            "personal_pool_at_request": str(personal_pool),
            "pool_used": str(pool_used),
            "guarantee_gap": str(guarantee_gap),
        },
    )

    if within_pool:
        log_trust_event(
            db,
            event_type="loan.auto_approved_by_pool",
            clan_id=int(clan.id),
            loan_id=int(loan.id),
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
                "personal_pool_after": str(
                    Decimal(str(personal_pool)) - Decimal(str(requested))
                ),
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
    """
    Manual loan status mutation is disabled.

    GMFN frozen protocol:
    - admins cannot approve loans alone
    - admins cannot reject loans alone
    - loan outcomes must remain deterministic
    """
    clan, membership, current_user = clan_ctx
    _require_clan_admin(membership)

    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    _require_same_clan(loan, clan.id)

    requested_status = (getattr(payload, "status", None) or "").strip().lower()

    if requested_status in {"approved", "rejected", "defaulted", "repaid", "pending", "incomplete", "cancelled"}:
        raise HTTPException(
            status_code=403,
            detail="Manual loan status changes are disabled. Loan outcomes are determined by protocol logic only.",
        )

    raise HTTPException(
        status_code=400,
        detail="Unsupported loan status update.",
    )


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
        raise HTTPException(
            status_code=403,
            detail="Only the borrower or clan admin can add guarantors",
        )

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
        clan_id=int(clan.id),
        loan_id=int(loan.id),
        guarantor_id=int(guarantor.id),
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


@router.post("/{loan_id}/cancel")
def cancel_loan_route(
    loan_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, current_user = clan_ctx

    loan = cancel_loan(
        db,
        loan_id=int(loan_id),
        clan_id=int(clan.id),
        actor_user_id=_uid(current_user),
    )

    return {"ok": True, "loan_id": int(loan.id), "status": loan.status}


@router.post("/overdue/run")
def run_overdue_detector(
    dry_run: bool = Query(True),
    grace_days: int = Query(3, ge=0, le=60),
    limit: int = Query(200, ge=1, le=2000),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx
    _require_clan_admin(membership)

    return run_overdue_default_scan(
        db,
        actor_user_id=_uid(current_user),
        clan_id=int(clan.id),
        grace_days=int(grace_days),
        limit=int(limit),
        dry_run=bool(dry_run),
    )


@router.get("/{loan_id}/guarantors", response_model=LoanGuarantorsListResponse)
def get_loan_guarantors(
    loan_id: int,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = clan_ctx

    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    _require_same_clan(loan, clan.id)

    items = list_loan_guarantors(db, loan_id=loan_id, clan_id=clan.id)
    return {"items": items, "total": len(items)}


@router.get(
    "/{loan_id}/guarantors/suggestions",
    response_model=GuarantorSuggestionsResponse,
)
def get_guarantor_suggestions(
    loan_id: int,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, _membership, _current_user = clan_ctx

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
        raise HTTPException(
            status_code=403,
            detail="Only the guarantor or a clan admin can decide",
        )

    if int(loan.borrower_user_id) == _uid(current_user) and not is_guarantor:
        raise HTTPException(
            status_code=403,
            detail="Borrower cannot decide guarantees",
        )

    result = update_loan_guarantor_status(
        db,
        guarantor_id=guarantor_id,
        clan_id=int(clan.id),
        status=payload.status,
        decided_by_user_id=_uid(current_user),
        reason=getattr(payload, "reason", None),
        note=getattr(payload, "note", None),
    )

    return result


@router.post("/{loan_id}/repayments", response_model=RepaymentOut, status_code=201)
def repay_loan(
    loan_id: int,
    payload: RepaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    repayment, _loan = create_repayment(
        db=db,
        loan_id=loan_id,
        payer=current_user,
        amount=Decimal(str(payload.amount)),
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
        db.query(LoanGuarantor).filter(LoanGuarantor.loan_id == loan.id).count()
    )

    def s(x) -> str:
        return str(x if x is not None else 0)

    return {
        "id": int(loan.id),
        "clan_id": int(loan.clan_id),
        "borrower_user_id": int(loan.borrower_user_id),
        "status": loan.status,
        "amount": s(getattr(loan, "amount", 0) or 0),
        "currency": loan.currency,
        "service_fee": s(getattr(loan, "service_fee", 0) or 0),
        "net_disbursed_amount": s(getattr(loan, "net_disbursed_amount", 0) or 0),
        "guarantor_pool": s(getattr(loan, "guarantor_pool", 0) or 0),
        "platform_revenue": s(getattr(loan, "platform_revenue", 0) or 0),
        "paid_total": s(getattr(loan, "paid_total", 0) or 0),
        "remaining_amount": s(getattr(loan, "remaining_amount", 0) or 0),
        "repaid_at": getattr(loan, "repaid_at", None),
        "due_at": getattr(loan, "due_at", None),
        "guarantors_required": int(getattr(loan, "guarantors_required", 0) or 0),
        "guarantors_total": int(guarantors_total),
        "approved_guarantors": int(approved_guarantors),
        "personal_pool_at_request": s(
            getattr(loan, "personal_pool_at_request", 0) or 0
        ),
        "pool_used": s(getattr(loan, "pool_used", 0) or 0),
        "guarantee_gap": s(getattr(loan, "guarantee_gap", 0) or 0),
        "created_at": getattr(loan, "created_at", None),
        "decision_at": getattr(loan, "decision_at", None),
    }


@router.get("/{loan_id}/trustslip_preview")
def trustslip_preview(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from sqlalchemy import func

    from app.db.models import Clan, Repayment, TrustEvent

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

    clan = db.get(Clan, int(loan.clan_id))

    ev = (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == loan.id, TrustEvent.event_type == "loan.created")
        .order_by(TrustEvent.id.asc())
        .first()
    )

    pool_used = None
    guarantee_gap = None
    personal_pool_at_request = None

    if ev:
        try:
            meta = ev.meta or {}
            pool_used = meta.get("pool_used")
            guarantee_gap = meta.get("guarantee_gap")
            personal_pool_at_request = meta.get("personal_pool_at_request")
        except Exception:
            try:
                if getattr(ev, "meta_json", None):
                    meta = json.loads(ev.meta_json)
                    pool_used = meta.get("pool_used")
                    guarantee_gap = meta.get("guarantee_gap")
                    personal_pool_at_request = meta.get("personal_pool_at_request")
            except Exception:
                pass

    approved_guarantors = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == loan.id, LoanGuarantor.status == "approved")
        .count()
    )

    pledged_coverage_raw = (
        db.query(func.coalesce(func.sum(LoanGuarantor.locked_amount), 0))
        .filter(LoanGuarantor.loan_id == loan.id, LoanGuarantor.status == "approved")
        .scalar()
        or 0
    )

    last_repayment = (
        db.query(Repayment)
        .filter(Repayment.loan_id == loan.id)
        .order_by(Repayment.id.desc())
        .first()
    )

    return {
        "title": "GMFN TrustSlip Preview (MVP)",
        "borrower_user_id": int(loan.borrower_user_id),
        "clan_id": int(loan.clan_id),
        "clan_name": getattr(clan, "name", None) if clan else None,
        "currency": loan.currency,
        "authorized_trust_limit": str(getattr(loan, "amount", 0) or 0),
        "personal_pool_at_request": personal_pool_at_request,
        "pool_used": pool_used,
        "guarantee_gap": guarantee_gap,
        "guarantors_required": int(getattr(loan, "guarantors_required", 0) or 0),
        "approved_guarantors": int(approved_guarantors),
        "pledged_coverage": str(Decimal(str(pledged_coverage_raw))),
        "loan_status": loan.status,
        "last_repayment_amount": str(getattr(last_repayment, "amount", 0) or 0)
        if last_repayment
        else None,
        "last_repayment_at": getattr(last_repayment, "created_at", None)
        if last_repayment
        else None,
        "breach_consequence": (
            "If trust is breached, guarantors are notified and future trust access may be reduced. "
            "This is not a bank guarantee."
        ),
    }
