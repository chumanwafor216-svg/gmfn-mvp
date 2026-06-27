from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.services.trust_timeline_pdf_service import build_trust_timeline_pdf
from app.services.trust_slips_services import get_trust_slip_payload

try:
    from app.services.trust_evidence_pack_service import (  # type: ignore
        build_trust_evidence_pack_zip_with_meta,
    )
except Exception:
    build_trust_evidence_pack_zip_with_meta = None  # type: ignore

try:
    from app.services.trust_score_service import compute_trust_score_explained  # type: ignore
except Exception:
    compute_trust_score_explained = None  # type: ignore

router = APIRouter(prefix="/trust/me", tags=["trust"])


def _safe_str(x: Any) -> Optional[str]:
    if x is None:
        return None
    s = str(x).strip()
    return s or None


def _safe_visibility_level(current_user: Any, requested_level: Optional[str]) -> str:
    raw = (
        requested_level
        or getattr(current_user, "merchant_visibility_level", "standard")
        or "standard"
    )
    level = str(raw).strip().lower()
    if level not in {"minimal", "standard", "detailed"}:
        return "standard"
    return level


@router.get("/timeline.pdf")
def download_my_trust_timeline_pdf(
    limit: int = 200,
    audience: str = "user",
    level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> Response:
    """
    Authenticated Trust Timeline PDF snapshot.
    """

    user_id = int(getattr(current_user, "id"))
    visibility_level = _safe_visibility_level(current_user, level)

    pack_id = None
    protocol_version = None
    footer = None

    if build_trust_evidence_pack_zip_with_meta:
        try:
            _zip_bytes, meta = build_trust_evidence_pack_zip_with_meta(
                db,
                user_id=user_id,
            )
            if isinstance(meta, dict):
                pack_id = _safe_str(meta.get("pack_id"))
                protocol_version = _safe_str(meta.get("protocol_version"))
                footer = _safe_str(meta.get("footer"))
        except Exception:
            pass

    score = None
    last_change: Optional[Dict[str, Any]] = None

    if compute_trust_score_explained:
        try:
            explained = compute_trust_score_explained(db, user_id=user_id)
            if isinstance(explained, dict):
                score = _safe_str(
                    explained.get("standing_score")
                    or explained.get("score")
                    or explained.get("trust_score")
                )

                last_change = {
                    "event_type": None,
                    "delta": None,
                    "reason": None,
                    "note": None,
                    "created_at": None,
                }
        except Exception:
            pass

    trustslip_summary = get_trust_slip_payload(db, user_id=user_id)

    visibility_footer = f"Visibility: {visibility_level}"
    if footer:
        footer = f"{footer} | {visibility_footer}"
    else:
        footer = visibility_footer

    is_platform_admin = str(getattr(current_user, "role", "") or "").strip().lower() == "admin"
    pdf_audience = "admin" if audience == "admin" and is_platform_admin else "user"

    pdf = build_trust_timeline_pdf(
        db,
        user_id=user_id,
        limit=max(1, min(int(limit or 200), 300)),
        audience=pdf_audience,
        pack_id=pack_id,
        protocol_version=protocol_version,
        footer=footer,
        score=score,
        last_change=last_change,
        redact=True,
    )

    filename = f"gsn-trust-timeline-u{user_id}-{visibility_level}.pdf"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "X-GSN-Merchant-Visibility-Level": visibility_level,
        "X-GSN-TrustSlip-Code": str(trustslip_summary.get("code") or ""),
        "X-GSN-CCI-Score": str(
            trustslip_summary.get("cci_score")
            or trustslip_summary.get("trust_score")
            or ""
        ),
    }

    return Response(
        content=pdf,
        media_type="application/pdf",
        headers=headers,
    )


@router.get("/trust-timeline.pdf")
def download_my_trust_timeline_pdf_alias(
    limit: int = 200,
    audience: str = "user",
    level: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
) -> Response:
    """
    Alias endpoint for stability.
    """
    return download_my_trust_timeline_pdf(
        limit=limit,
        audience=audience,
        level=level,
        db=db,
        current_user=current_user,
    )
