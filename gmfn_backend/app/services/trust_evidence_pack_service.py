from __future__ import annotations

import json
import hashlib
import hmac
import os
import uuid
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple
from zipfile import ZipFile, ZIP_DEFLATED

from sqlalchemy.orm import Session

from app.core.constants import PROTOCOL_VERSION
from app.db.models import TrustEvent
from app.services.trust_slip_evidence_pdf_service import build_trust_slip_pdf
from app.services.trust_timeline_pdf_service import build_trust_timeline_pdf
from app.services.trust_timeline_service import list_trust_timeline
from app.services.trust_score_service import compute_trust_breakdown


# =========================
# SAFE HELPERS
# =========================

def _safe_json(meta: Any) -> Dict[str, Any]:
    if meta is None:
        return {}
    if isinstance(meta, dict):
        return meta
    if isinstance(meta, str):
        try:
            obj = json.loads(meta)
            return obj if isinstance(obj, dict) else {}
        except Exception:
            return {}
    return {}


def _events_like(db: Session, *, user_id: int, prefix: str, limit: int = 100) -> List[Dict[str, Any]]:
    limit = max(1, min(int(limit), 300))

    rows: List[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .filter(TrustEvent.event_type.like(prefix + "%"))
        .order_by(TrustEvent.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "event_type": r.event_type,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "loan_id": r.loan_id,
            "clan_id": r.clan_id,
            "actor_user_id": r.actor_user_id,
            "subject_user_id": r.subject_user_id,
            "meta": _safe_json(getattr(r, "meta", None)),
        }
        for r in rows
    ]


def _latest_event(db: Session, *, user_id: int, event_type: str) -> Optional[Dict[str, Any]]:
    row = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .filter(TrustEvent.event_type == event_type)
        .order_by(TrustEvent.created_at.desc())
        .first()
    )

    if not row:
        return None

    return {
        "event_type": row.event_type,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "loan_id": row.loan_id,
        "clan_id": row.clan_id,
        "actor_user_id": row.actor_user_id,
        "subject_user_id": row.subject_user_id,
        "meta": _safe_json(getattr(row, "meta", None)),
    }


def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _get_signing_secret() -> Optional[bytes]:
    v = (os.getenv("GMFN_SECRET_KEY") or os.getenv("SECRET_KEY") or "").strip()
    return v.encode("utf-8") if v else None


def _hmac_sha256_hex(secret: bytes, message: bytes) -> str:
    return hmac.new(secret, message, hashlib.sha256).hexdigest()


def _make_pack_id(now: datetime) -> str:
    return f"TP-{now.strftime('%Y%m%dT%H%M%SZ')}-{uuid.uuid4().hex[:8].upper()}"


# =========================
# MAIN BUILDER
# =========================

def build_trust_evidence_pack_zip_with_meta(
    db: Session,
    *,
    user_id: int,
) -> Tuple[bytes, Dict[str, Any]]:

    now = datetime.now(timezone.utc)
    pack_id = _make_pack_id(now)
    generated_at = now.isoformat()

    summary = compute_trust_breakdown(db, user_id=int(user_id))

    pack_meta = {
        "pack_id": pack_id,
        "generated_at_utc": generated_at,
        "protocol_version": PROTOCOL_VERSION,
    }

    # PDFs
    trust_slip_pdf = build_trust_slip_pdf(db, summary, pack_meta=pack_meta)
    trust_timeline_pdf = build_trust_timeline_pdf(
        db,
        user_id=int(user_id),
        audience="user",
        limit=50,
        pack_meta=pack_meta,
    )

    # JSON files
    trust_summary_json = json.dumps({
        "pack_id": pack_id,
        "generated_at_utc": generated_at,
        "protocol_version": PROTOCOL_VERSION,
        "user_id": int(user_id),
        "trust": summary,
    }, indent=2).encode()

    timeline_json = json.dumps({
        "pack_id": pack_id,
        "generated_at_utc": generated_at,
        "user_id": int(user_id),
        "items": list_trust_timeline(db, user_id=int(user_id), limit=50),
    }, indent=2).encode()

    shipment_json = json.dumps(
        _events_like(db, user_id=int(user_id), prefix="merchant."),
        indent=2,
    ).encode()

    courier_json = json.dumps(
        _events_like(db, user_id=int(user_id), prefix="courier."),
        indent=2,
    ).encode()

    delivery_json = json.dumps(
        _latest_event(db, user_id=int(user_id), event_type="merchant.delivery_confirmed"),
        indent=2,
    ).encode()

    files = [
        ("trust_slip.pdf", trust_slip_pdf),
        ("trust_timeline.pdf", trust_timeline_pdf),
        ("trust_summary.json", trust_summary_json),
        ("timeline.json", timeline_json),
        ("shipment_events.json", shipment_json),
        ("courier_confirmations.json", courier_json),
        ("delivery_confirmation.json", delivery_json),
    ]

    # checksum
    sha_lines = [f"{_sha256_hex(data)}  {name}" for name, data in files]
    sha256_txt = ("\n".join(sha_lines) + "\n").encode()

    # signature
    secret = _get_signing_secret()
    if secret:
        sig = _hmac_sha256_hex(secret, sha256_txt)
        signature_txt = f"signature: {sig}\n".encode()
    else:
        signature_txt = b"signature: none\n"

    files += [
        ("SHA256SUMS.txt", sha256_txt),
        ("SIGNATURE.txt", signature_txt),
    ]

    buf = BytesIO()
    with ZipFile(buf, "w", ZIP_DEFLATED) as zf:
        for name, data in files:
            zf.writestr(name, data)

    return buf.getvalue(), pack_meta


def build_trust_evidence_pack_zip(db: Session, *, user_id: int) -> bytes:
    data, _ = build_trust_evidence_pack_zip_with_meta(db, user_id=int(user_id))
    return data