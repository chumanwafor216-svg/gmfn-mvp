from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.schemas.loan_hardening import (
    LoanCoverageCheckIn,
    LoanCoverageCheckOut,
    LoanTimeoutOut,
    TrustEventDedupCheckIn,
    TrustEventDedupCheckOut,
)
from app.services.loan_hardening_service import (
    coverage_ok_for_loan,
    timeout_status,
    trust_event_duplicate_exists,
)

# Keep aligned with your project imports
from app.db.database import get_db
from app.core.auth import get_current_user

router = APIRouter(tags=["loan-hardening"])


@router.post("/loans/coverage-check", response_model=LoanCoverageCheckOut)
def post_loan_coverage_check(
    payload: LoanCoverageCheckIn,
    current_user=Depends(get_current_user),
):
    _ = current_user
    result = coverage_ok_for_loan(
        loan_amount=payload.loan_amount,
        personal_pool=payload.personal_pool,
        approved_locked_total=payload.approved_locked_total,
        pledge_amount=payload.pledge_amount,
    )

    return {
        "loan_amount": str(result["loan_amount"]),
        "personal_pool": str(result["personal_pool"]),
        "pool_used": str(result["pool_used"]),
        "guarantee_gap": str(result["guarantee_gap"]),
        "approved_locked_total": str(result["approved_locked_total"]),
        "pledge_amount": str(result["pledge_amount"]),
        "has_positive_gap": bool(result["has_positive_gap"]),
        "pledge_required": bool(result["pledge_required"]),
        "pledge_valid": bool(result["pledge_valid"]),
        "coverage_ok": bool(result["coverage_ok"]),
        "message": str(result["message"]),
    }


@router.get("/loans/timeout-status", response_model=LoanTimeoutOut)
def get_loan_timeout_status(
    created_at: str | None = Query(default=None),
    expires_at: str | None = Query(default=None),
    ttl_hours: int = Query(default=48, ge=1, le=720),
    current_user=Depends(get_current_user),
):
    _ = current_user

    from datetime import datetime

    created_dt = datetime.fromisoformat(created_at) if created_at else None
    expires_dt = datetime.fromisoformat(expires_at) if expires_at else None

    return timeout_status(
        created_at=created_dt,
        expires_at=expires_dt,
        ttl_hours=ttl_hours,
    )


@router.post("/admin/trust-events/dedup-check", response_model=TrustEventDedupCheckOut)
def post_trust_event_dedup_check(
    payload: TrustEventDedupCheckIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    role = str(getattr(current_user, "role", "") or "").lower()
    if role != "admin":
        return {
            "duplicate_found": False,
            "message": "Admin access required",
        }

    duplicate_found = trust_event_duplicate_exists(
        db,
        user_id=payload.user_id,
        event_type=payload.event_type,
        loan_id=payload.loan_id,
        guarantor_id=payload.guarantor_id,
        reason=payload.reason,
    )

    return {
        "duplicate_found": duplicate_found,
        "message": "Duplicate found" if duplicate_found else "No duplicate found",
    }