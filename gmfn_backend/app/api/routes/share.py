# app/api/routes/share.py
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.auth import get_current_user
from app.db.models import User, Loan, ClanMembership

router = APIRouter(prefix="/share", tags=["share"])


def _ensure_can_view_loan(db: Session, *, current_user: User, loan: Loan) -> None:
    is_platform_admin = str(getattr(current_user, "role", "") or "").lower() == "admin"
    if is_platform_admin:
        return

    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.clan_id == loan.clan_id,
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=403, detail="Not allowed")

    is_owner = int(loan.borrower_user_id) == int(current_user.id)
    is_admin = (m.role == "admin")
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Not allowed")


def _can_view_complete_loan_record(db: Session, *, current_user: User, loan: Loan) -> bool:
    is_platform_admin = str(getattr(current_user, "role", "") or "").lower() == "admin"
    if is_platform_admin:
        return True

    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.clan_id == loan.clan_id,
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    return bool(m) and str(getattr(m, "role", "") or "").lower() == "admin"


@router.get("/loans/{loan_id}/audit-links", response_model=Dict[str, Any])
def get_loan_audit_links(
    loan_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns shareable URLs for the support trust report assets.
    Frontend can implement "Copy support evidence link" using these.
    """
    loan = db.get(Loan, int(loan_id))
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    _ensure_can_view_loan(db, current_user=current_user, loan=loan)

    base = str(request.base_url).rstrip("/")

    pdf_url = f"{base}/reports/loans/{loan_id}/trust-report.pdf"
    can_view_complete = _can_view_complete_loan_record(db, current_user=current_user, loan=loan)
    csv_url = f"{base}/reports/loans/{loan_id}/trust-report.csv" if can_view_complete else None

    copy_lines = [
        "GSN Support Evidence",
        f"Redacted PDF: {pdf_url}",
    ]
    if csv_url:
        copy_lines.append(f"Complete CSV (admin only): {csv_url}")

    out = {
        "loan_id": int(loan.id),
        "clan_id": int(loan.clan_id),
        "pdf_url": pdf_url,
        "redacted_pdf_url": pdf_url,
        "csv_url": csv_url,
        "complete_csv_url": csv_url,
        "complete_record_available": bool(can_view_complete),
        "copy_text": "\n".join(copy_lines),
    }
    return out
