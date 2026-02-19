# app/api/routes/evidence_pack.py
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.auth import get_current_user
from app.db.models import User

from app.services.trust_slips_services import get_trust_slip_payload
from app.services.evidence_pack_service import build_evidence_pack_zip, build_evidence_pack_meta

router = APIRouter(prefix="/trust/me", tags=["evidence-pack"])


@router.get("/evidence-pack/meta")
def get_evidence_pack_meta(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return build_evidence_pack_meta(db, current_user=current_user)


@router.get("/evidence-pack.zip")
def download_evidence_pack_zip(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # TrustSlip summary is the same payload you already return from /trust-slips/me/summary
    summary = get_trust_slip_payload(db, user_id=int(current_user.id))
    zbytes = build_evidence_pack_zip(db, current_user=current_user, trustslip_summary=summary)

    headers = {
        "Content-Disposition": 'attachment; filename="gmfn_evidence_pack.zip"',
        "Content-Type": "application/zip",
    }
    return Response(content=zbytes, headers=headers, media_type="application/zip")