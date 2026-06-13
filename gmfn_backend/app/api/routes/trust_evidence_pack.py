# app/api/routes/trust_evidence_pack.py
from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.trust_evidence_pack_service import build_trust_evidence_pack_zip_with_meta

router = APIRouter(prefix="/trust", tags=["trust"])


@router.get("/me/evidence-pack/meta")
def evidence_pack_meta(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns pack_id + meta without downloading the zip.
    Useful for UI copy/paste + institutional referencing.
    """
    _zip_bytes, meta = build_trust_evidence_pack_zip_with_meta(db, user_id=int(current_user.id))
    return meta


@router.get("/me/evidence-pack.zip")
def evidence_pack_zip(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    zip_bytes, meta = build_trust_evidence_pack_zip_with_meta(db, user_id=int(current_user.id))

    filename = f"GSN-EvidencePack-{meta.get('pack_id','pack')}.zip"

    return StreamingResponse(
        iter([zip_bytes]),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
