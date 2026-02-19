# app/api/routes/trust_timeline_pdf.py

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.deps import get_db
from app.core.auth import get_current_user 
from app.services.trust_timeline_pdf_service import build_trust_timeline_pdf

# pack meta is optional — if service/route doesn't exist, we still render the PDF
try:
    from app.services.trust_evidence_pack_service import get_evidence_pack_meta_for_user  # type: ignore
except Exception:
    get_evidence_pack_meta_for_user = None  # type: ignore

# optional explained score for "why did my trust change?"
try:
    from app.services.trust_score_service import get_trust_score_explained_for_user  # type: ignore
except Exception:
    get_trust_score_explained_for_user = None  # type: ignore

router = APIRouter(prefix="/trust/me", tags=["trust"])


def _safe_str(x: Any) -> Optional[str]:
    if x is None:
        return None
    return str(x)


@router.get("/timeline.pdf")
def download_my_trust_timeline_pdf(
    limit: int = 200,
    audience: str = "user",
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> Response:
    """
    Authenticated Trust Timeline PDF snapshot ("Why did my trust change?").
    """
    user_id = int(getattr(current_user, "id"))

    pack_id = None
    protocol_version = None
    footer = None

    if get_evidence_pack_meta_for_user:
        try:
            meta = get_evidence_pack_meta_for_user(db, user_id=user_id)  # type: ignore
            pack_id = _safe_str(meta.get("pack_id")) if isinstance(meta, dict) else None
            protocol_version = _safe_str(meta.get("protocol_version")) if isinstance(meta, dict) else None
            footer = _safe_str(meta.get("footer")) if isinstance(meta, dict) else None
        except Exception:
            pass

    score = None
    last_change: Optional[Dict[str, Any]] = None
    if get_trust_score_explained_for_user:
        try:
            explained = get_trust_score_explained_for_user(db, user_id=user_id)  # type: ignore
            if isinstance(explained, dict):
                score = _safe_str(explained.get("score"))
                last_change = explained.get("last_change") if isinstance(explained.get("last_change"), dict) else None
        except Exception:
            pass

    pdf = build_trust_timeline_pdf(
        db,
        user_id=user_id,
        limit=max(1, min(int(limit), 300)),
        audience="admin" if audience == "admin" else "user",
        pack_id=pack_id,
        protocol_version=protocol_version,
        footer=footer,
        score=score,
        last_change=last_change,
    )

    filename = f"gmfn_trust_timeline_u{user_id}.pdf"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }
    return Response(content=pdf, media_type="application/pdf", headers=headers)


@router.get("/trust-timeline.pdf")
def download_my_trust_timeline_pdf_alias(
    limit: int = 200,
    audience: str = "user",
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> Response:
    """
    Alias endpoint for stability (some UIs expect this naming).
    """
    return download_my_trust_timeline_pdf(limit=limit, audience=audience, db=db, current_user=current_user)