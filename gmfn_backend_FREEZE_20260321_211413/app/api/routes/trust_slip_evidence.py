# app/api/routes/trust_slip_evidence.py

from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from io import BytesIO

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.trust_score_service import compute_trust_breakdown
from app.services.trust_slip_evidence_pdf_service import build_trust_slip_pdf

router = APIRouter(prefix="/trust-slips", tags=["trust-slips"])


@router.get("/me/evidence.pdf")
def get_my_trust_slip_pdf(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trust_summary = compute_trust_breakdown(db, user_id=int(current_user.id))
    pdf_bytes = build_trust_slip_pdf(db, trust_summary)

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": "inline; filename=trust_slip_evidence.pdf"
        },
    )