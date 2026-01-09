from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.services.loans_service import count_approved_guarantors

from app.deps import get_db
from app.core.auth import get_current_user
from app.core.clan_auth import get_current_clan_membership
from app.db.models import User, Loan, ClanMembership, LoanGuarantor
from app.schemas.loans import (
    LoansListResponse,
    LoanCreate,
    LoanUpdate,
    LoanOut,
    LoanGuarantorCreate,
    LoanGuarantorOut,
    LoanGuarantorsListResponse,
    LoanGuarantorUpdate,
)
from app.services.loans_service import (
    add_loan_guarantor,
    list_loan_guarantors,
    update_loan_guarantor_status,
)


router = APIRouter(prefix="/loans", tags=["loans"])


def _borrower_id(user: User) -> int:
    return user.id


@router.get("/admin/all", response_model=LoansListResponse)
def list_all_loans_admin(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Determine admin's clan via default clan membership
    clan, membership, _ = get_current_clan_membership(db=db, current_user=current_user)

    # Must be clan admin
    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Clan admin privileges required")

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
        .filter(Loan.borrower_user_id == _borrower_id(current_user))
        .order_by(Loan.id.desc())
        .all()
    )
    return {"items": items, "total": len(items)}


from decimal import Decimal

@router.post("", response_model=LoanOut, status_code=201)
def create_loan(
    payload: LoanCreate,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    requested = Decimal(str(payload.amount))
    personal_pool = membership.personal_pool_balance or Decimal("0")

    # Decide if within pool
    within_pool = requested <= personal_pool

    # beyond personal pool → require guarantors
    guarantors_required = 0 if within_pool else 2

    # Auto-approve if within personal pool
    status = "approved" if within_pool else "pending"
    decision_by_user_id = current_user.id if within_pool else None
    decision_at = datetime.now(timezone.utc) if within_pool else None

    loan = Loan(
        clan_id=clan.id,
        borrower_user_id=_borrower_id(current_user),
        amount=requested,
        currency="NGN",
        status=status,
        guarantors_required=guarantors_required,
        decision_by_user_id=decision_by_user_id,
        decision_at=decision_at,
    )

    db.add(loan)

    # ✅ Deduct from personal pool only if auto-approved
    if within_pool:
        # Re-load membership from THIS db session to ensure it's tracked
        db_membership = db.get(ClanMembership, membership.id)
        db_membership.personal_pool_balance = personal_pool - requested


    db.commit()
    db.refresh(loan)
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

    # Admins can view any loan in their clan; users can view only their own
    m = db.query(ClanMembership).filter(
        ClanMembership.user_id == current_user.id,
        ClanMembership.clan_id == loan.clan_id,
    ).first()

    if not m:
        raise HTTPException(status_code=403, detail="Not allowed")

    is_owner = loan.borrower_user_id == _borrower_id(current_user)
    is_clan_admin = m.role == "admin"

    if not (is_owner or is_clan_admin):
        raise HTTPException(status_code=403, detail="Not allowed")

    return loan


@router.patch("/{loan_id}", response_model=LoanOut)
def update_loan_status(
    loan_id: int,
    payload: LoanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    # Must be clan admin for THIS loan's clan
    m = db.query(ClanMembership).filter(
        ClanMembership.user_id == current_user.id,
        ClanMembership.clan_id == loan.clan_id,
    ).first()

    if not m or m.role != "admin":
        raise HTTPException(status_code=403, detail="Clan admin privileges required")

    # ✅ Enforce guarantor rule before approval
    if payload.status == "approved":
        approved_count = count_approved_guarantors(db, loan_id=loan.id)
        required = loan.guarantors_required or 0

        if approved_count < required:
            raise HTTPException(
                status_code=400,
                detail=f"Loan requires {required} approved guarantor(s); currently {approved_count}.",
            )

    # ✅ Now it is safe to update the loan
    loan.status = payload.status

    if payload.status in ("approved", "rejected"):
        loan.decision_by_user_id = current_user.id
        loan.decision_at = datetime.now(timezone.utc)

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

    # Only allow guarantors to be added within the same clan context
    if loan.clan_id != clan.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    guarantor = add_loan_guarantor(
        db,
        loan_id=loan_id,
        clan_id=clan.id,
        guarantor_user_id=payload.guarantor_user_id,
        pledge_amount=payload.pledge_amount,
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

    if loan.clan_id != clan.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    items = list_loan_guarantors(db, loan_id=loan_id, clan_id=clan.id)
    return {"items": items, "total": len(items)}
@router.patch("/{loan_id}/guarantors/{guarantor_id}", response_model=LoanGuarantorOut)
def decide_loan_guarantor(
    loan_id: int,
    guarantor_id: int,
    payload: LoanGuarantorUpdate,
    db: Session = Depends(get_db),
    clan_ctx: tuple = Depends(get_current_clan_membership),
):
    clan, membership, current_user = clan_ctx

    # Must be clan admin
    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Clan admin privileges required")

    # Ensure loan exists and belongs to clan
    loan = db.get(Loan, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.clan_id != clan.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    # Ensure guarantor exists and belongs to this loan
    g = db.get(LoanGuarantor, guarantor_id)
    if not g or g.loan_id != loan_id:
        raise HTTPException(status_code=404, detail="Guarantor not found")

    return update_loan_guarantor_status(
    db,
    guarantor_id=guarantor_id,
    clan_id=clan.id,
    status=payload.status,
    decided_by_user_id=current_user.id,
) 
