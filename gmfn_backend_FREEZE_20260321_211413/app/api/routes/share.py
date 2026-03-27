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
    m = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.user_id == int(current_user.id),
            ClanMembership.clan_id == loan.clan_id,
        )
        .first()
    )
    if not m:
        raise HTTPException(status_code=403, detail="Not allowed")

    is_owner = int(loan.borrower_user_id) == int(current_user.id)
    is_admin = (m.role == "admin")
    if not (is_owner or is_admin):
        raise HTTPException(status_code=403, detail="Not allowed")


@router.get("/loans/{loan_id}/audit-links", response_model=Dict[str, Any])
def get_loan_audit_links(
    loan_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns shareable URLs for the loan trust report assets.
    Frontend can implement "Copy loan + audit link" using these.
    """
    loan = db.get(Loan, int(loan_id))
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    _ensure_can_view_loan(db, current_user=current_user, loan=loan)

    base = str(request.base_url).rstrip("/")

    pdf_url = f"{base}/reports/loans/{loan_id}/trust-report.pdf"
    csv_url = f"{base}/reports/loans/{loan_id}/trust-report.csv"

    return {
        "loan_id": int(loan.id),
        "clan_id": int(loan.clan_id),
        "pdf_url": pdf_url,
        "csv_url": csv_url,
        "copy_text": f"GMFN Loan Audit (Loan #{loan_id})\nPDF: {pdf_url}\nCSV: {csv_url}",
    }
