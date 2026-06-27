# app/api/routes/evidence_pack_trustwhy.py
from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.constants import PROTOCOL_VERSION
from app.db.database import get_db
from app.db.models import TrustEvent, User

# reuse your explainability engine (already built)
from app.api.routes.trust_why import trust_why_me

router = APIRouter(prefix="/evidence-pack", tags=["evidence-pack"])


def _to_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _latest_event_time(db: Session, user_id: int) -> Optional[datetime]:
    row: Optional[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .first()
    )
    return _to_aware(getattr(row, "created_at", None)) if row else None


def _build_pack_id(*, user_id: int, based_on_event_at: Optional[datetime]) -> str:
    if based_on_event_at is None:
        based_on_event_at = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    ts = based_on_event_at.astimezone(timezone.utc)
    day = ts.strftime("%Y%m%d")

    seed = f"{user_id}|{ts.isoformat()}|{PROTOCOL_VERSION}"
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest().upper()[:10]
    return f"GSN-WHY-{day}-{digest}"


def _checksum(pack_id: str, latest_event_at: Optional[datetime]) -> str:
    ts = latest_event_at.isoformat() if latest_event_at else "none"
    seed = f"{pack_id}|{PROTOCOL_VERSION}|{ts}"
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


@router.get("/me/trust-why.json")
def evidence_pack_trustwhy_json(
    limit: int = 10,
    mode: str = "standard",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    uid = int(current_user.id)

    latest_event_at = _latest_event_time(db, uid)
    pack_id = _build_pack_id(user_id=uid, based_on_event_at=latest_event_at)
    checksum = _checksum(pack_id, latest_event_at)

    why = trust_why_me(limit=limit, mode=mode, db=db, current_user=current_user)
    why_share = dict(why)
    why_share.pop("user_id", None)

    return {
        "pack_id": pack_id,
        "checksum": checksum,
        "protocol_version": PROTOCOL_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "based_on_event_at": latest_event_at.isoformat() if latest_event_at else None,
        "holder": {
            "gsn_id": getattr(current_user, "gmfn_id", None),
            "private_member_reference": "redacted for user evidence pack",
        },
        "trust_why": why_share,
        "links": {
            "trust_why_me": "/trust/me/why",
            "trust_score_explained": "/trust/score/explained",
            "trust_evidence_pack_zip": "/trust/me/evidence-pack.zip",
        },
        "note": "Screenshot-ready: pack_id + based_on_event_at + checksum prove timeline integrity.",
    }
