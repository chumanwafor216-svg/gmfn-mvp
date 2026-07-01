from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, Optional, List

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from app.deps import get_db
from app.api.routes.auth import get_current_user
from app.db.models import User, Loan, LoanGuarantor, ClanMembership, TrustEvent

router = APIRouter(prefix="/admin/behaviour", tags=["admin"])


def _is_admin(user: Any) -> bool:
    return str(getattr(user, "role", "") or "").lower() == "admin"


def _safe_div(n: float, d: float) -> Optional[float]:
    if d == 0:
        return None
    return n / d


def _hours_between(a: Optional[datetime], b: Optional[datetime]) -> Optional[float]:
    if not a or not b:
        return None
    delta = b - a
    return max(0.0, delta.total_seconds() / 3600.0)


def _dec(v: Any) -> Decimal:
    try:
        return Decimal(str(v or "0"))
    except Exception:
        return Decimal("0")


@router.get("/metrics/{user_id}")
def behaviour_metrics(
    user_id: int = Path(..., ge=1),
    clan_id: Optional[int] = Query(default=None, ge=1),
    lookback_days: int = Query(default=180, ge=30, le=365),
    db: Session = Depends(get_db),
    actor: Any = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Admin-only deterministic behaviour metrics derived from ledger + loan history.
    No psychology. No automated decisions. No trust mutation.
    """
    if not _is_admin(actor):
        raise HTTPException(status_code=403, detail="Admin only.")

    subj = db.query(User).filter(User.id == user_id).first()
    if not subj:
        raise HTTPException(status_code=404, detail="User not found.")

    now = datetime.utcnow()
    since = now - timedelta(days=int(lookback_days))

    # -------------------------
    # Borrower repayment metrics
    # -------------------------
    loans_q = db.query(Loan).filter(Loan.borrower_user_id == user_id)
    if clan_id:
        loans_q = loans_q.filter(Loan.clan_id == int(clan_id))
    loans = loans_q.all()

    total_loans = len(loans)
    repaid_loans = []
    for l in loans:
        st = str(getattr(l, "status", "") or "").lower()
        if st == "repaid" or getattr(l, "repaid_at", None) is not None:
            repaid_loans.append(l)
    repaid_count = len(repaid_loans)

    repayment_consistency_index = _safe_div(float(repaid_count), float(total_loans)) if total_loans else None

    late_count = 0
    delay_hours: List[float] = []
    for l in repaid_loans:
        due_at = getattr(l, "due_at", None)
        repaid_at = getattr(l, "repaid_at", None)
        if due_at and repaid_at:
            if repaid_at > due_at:
                late_count += 1
            h = _hours_between(due_at, repaid_at)
            if h is not None:
                delay_hours.append(h)

    late_repayment_rate = _safe_div(float(late_count), float(repaid_count)) if repaid_count else None
    avg_repayment_delay_hours = (sum(delay_hours) / len(delay_hours)) if delay_hours else None

    # -------------------------
    # Guarantor responsiveness
    # -------------------------
    gq = db.query(LoanGuarantor).filter(LoanGuarantor.guarantor_user_id == user_id)
    if clan_id:
        gq = gq.filter(LoanGuarantor.clan_id == int(clan_id))
    # if created_at exists, limit to window
    try:
        gq = gq.filter(LoanGuarantor.created_at >= since)  # type: ignore
    except Exception:
        pass

    gs = gq.all()
    response_times: List[float] = []
    for g in gs:
        created_at = getattr(g, "created_at", None)
        responded_at = getattr(g, "responded_at", None)
        h = _hours_between(created_at, responded_at)
        if h is not None:
            response_times.append(h)

    avg_guarantor_response_hours = (sum(response_times) / len(response_times)) if response_times else None

    # -------------------------
    # Exposure ratio (guarantor locked / personal pool)
    # -------------------------
    exposure_ratio = None
    pool_balance = None
    locked_exposure = None

    if clan_id:
        mem = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == int(clan_id))
            .filter(ClanMembership.user_id == user_id)
            .first()
        )
        pool_balance = getattr(mem, "personal_pool_balance", None) if mem else None

        locked_sum = Decimal("0")
        for g in (
            db.query(LoanGuarantor)
            .filter(LoanGuarantor.guarantor_user_id == user_id)
            .filter(LoanGuarantor.clan_id == int(clan_id))
            .all()
        ):
            st = str(getattr(g, "status", "") or "").lower()
            if st != "approved":
                continue
            la = _dec(getattr(g, "locked_amount", None))
            ra = _dec(getattr(g, "released_amount", None))
            locked_sum += max(Decimal("0"), la - ra)

        locked_exposure = locked_sum
        pb = _dec(pool_balance)
        if pb > 0:
            exposure_ratio = float(locked_sum / pb)

    # -------------------------
    # TrustEvent balance (conservative classification)
    # -------------------------
    te_q = db.query(TrustEvent).filter(TrustEvent.subject_user_id == user_id)
    try:
        te_q = te_q.filter(TrustEvent.created_at >= since)  # type: ignore
    except Exception:
        pass
    if clan_id:
        try:
            te_q = te_q.filter(TrustEvent.clan_id == int(clan_id))  # type: ignore
        except Exception:
            pass

    events = te_q.all()
    pos = 0
    neg = 0
    for ev in events:
        et = str(getattr(ev, "event_type", "") or "").lower()
        if "repay" in et or "positive" in et or "approve" in et:
            pos += 1
        if "default" in et or "late" in et or "negative" in et or "decline" in et:
            neg += 1

    neg_share = _safe_div(float(neg), float(pos + neg)) if (pos + neg) else None

    return {
        "user": {"id": int(getattr(subj, "id", 0)), "email": getattr(subj, "email", None)},
        "context": {"clan_id": int(clan_id) if clan_id else None, "lookback_days": int(lookback_days), "since": since.isoformat()},
        "repayment_consistency_index": None if repayment_consistency_index is None else round(float(repayment_consistency_index), 4),
        "late_repayment_rate": None if late_repayment_rate is None else round(float(late_repayment_rate), 4),
        "avg_repayment_delay_hours": None if avg_repayment_delay_hours is None else round(float(avg_repayment_delay_hours), 2),
        "avg_guarantor_response_hours": None if avg_guarantor_response_hours is None else round(float(avg_guarantor_response_hours), 2),
        "exposure_ratio": None if exposure_ratio is None else round(float(exposure_ratio), 4),
        "trust_event_balance": {
            "events_total": int(len(events)),
            "positive_count": int(pos),
            "negative_count": int(neg),
            "negative_share_of_classified": None if neg_share is None else round(float(neg_share), 4),
        },
        "explain": {
            "total_loans": int(total_loans),
            "repaid_loans": int(repaid_count),
            "late_repaid_loans": int(late_count),
            "pool_balance": str(pool_balance) if pool_balance is not None else None,
            "locked_exposure": str(locked_exposure) if locked_exposure is not None else None,
        },
        "policy": {"no_psychology": True, "no_automated_decision": True, "derived_from_ledger": True},
    }
