# app/api/routes/evidence_pack.py
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User
from app.services.evidence_pack_service import (
    build_evidence_pack_meta,
    build_evidence_pack_zip,
)
from app.services.trust_slips_services import (
    build_trust_slip_visibility_view,
    get_trust_slip_payload,
)

router = APIRouter(prefix="/trust/me", tags=["evidence-pack"])


def _safe_visibility_level(current_user: User, requested_level: Optional[str]) -> str:
    raw = (requested_level or getattr(current_user, "merchant_visibility_level", "standard") or "").strip().lower()
    if raw not in {"minimal", "standard", "detailed"}:
        return "standard"
    return raw


@router.get("/evidence-pack/meta")
def get_evidence_pack_meta(
    level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    visibility_level = _safe_visibility_level(current_user, level)

    meta = build_evidence_pack_meta(db, current_user=current_user)
    if isinstance(meta, dict):
        meta["merchant_visibility_level"] = visibility_level
        meta["evidence_alignment"] = "trustslip_visibility_bound"
    return meta


@router.get("/evidence-pack.zip")
def download_evidence_pack_zip(
    level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    full_summary = get_trust_slip_payload(db, user_id=int(current_user.id))
    visibility_level = _safe_visibility_level(current_user, level)

    merchant_view = build_trust_slip_visibility_view(
        full_summary,
        level=visibility_level,
    )

    summary = dict(full_summary)
    summary["merchant_visibility_level"] = visibility_level
    summary["merchant_view"] = merchant_view
    summary["evidence_alignment"] = "trustslip_visibility_bound"

    zbytes = build_evidence_pack_zip(
        db,
        current_user=current_user,
        trustslip_summary=summary,
    )

    headers = {
        "Content-Disposition": 'attachment; filename="gmfn_evidence_pack.zip"',
        "Content-Type": "application/zip",
    }
    return Response(content=zbytes, headers=headers, media_type="application/zip")