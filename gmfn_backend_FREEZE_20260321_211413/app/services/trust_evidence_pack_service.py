# app/services/trust_evidence_pack_service.py
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


def _safe_json(meta_json: Optional[str]) -> Dict[str, Any]:
    if not meta_json:
        return {}
    try:
        obj = json.loads(meta_json)
        return obj if isinstance(obj, dict) else {}
    except Exception:
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

    out: List[Dict[str, Any]] = []
    for r in rows:
        out.append(
            {
                "event_type": getattr(r, "event_type", None),
                "created_at": r.created_at.isoformat() if getattr(r, "created_at", None) else None,
                "loan_id": getattr(r, "loan_id", None),
                "clan_id": getattr(r, "clan_id", None),
                "actor_user_id": getattr(r, "actor_user_id", None),
                "subject_user_id": getattr(r, "subject_user_id", None),
                "meta": _safe_json(getattr(r, "meta_json", None)),
            }
        )
    return out


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
        "event_type": getattr(row, "event_type", None),
        "created_at": row.created_at.isoformat() if getattr(row, "created_at", None) else None,
        "loan_id": getattr(row, "loan_id", None),
        "clan_id": getattr(row, "clan_id", None),
        "actor_user_id": getattr(row, "actor_user_id", None),
        "subject_user_id": getattr(row, "subject_user_id", None),
        "meta": _safe_json(getattr(row, "meta_json", None)),
    }


def _sha256_hex(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _get_signing_secret() -> Optional[bytes]:
    v = os.getenv("GMFN_SECRET_KEY") or os.getenv("SECRET_KEY")
    if not v:
        return None
    return v.encode("utf-8")


def _hmac_sha256_hex(secret: bytes, message: bytes) -> str:
    return hmac.new(secret, message, hashlib.sha256).hexdigest()


def _make_pack_id(now: datetime) -> str:
    now_stamp = now.strftime("%Y%m%dT%H%M%SZ")
    return f"TP-{now_stamp}-{uuid.uuid4().hex[:8].upper()}"


def build_trust_evidence_pack_zip_with_meta(db: Session, *, user_id: int) -> Tuple[bytes, Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    pack_id = _make_pack_id(now)
    generated_at_utc = now.isoformat()

    summary = compute_trust_breakdown(db, user_id=int(user_id))

    pack_meta: Dict[str, Any] = {
        "pack_id": pack_id,
        "generated_at_utc": generated_at_utc,
        "protocol_version": PROTOCOL_VERSION,
        "footer": f"Confidential / Pilot Version / {now.date().isoformat()}",
    }

    # PDFs receive pack_meta so they can print Pack ID
    trust_slip_pdf = build_trust_slip_pdf(db, summary, pack_meta=pack_meta)
    trust_timeline_pdf = build_trust_timeline_pdf(db, user_id=int(user_id), audience="user", limit=50, pack_meta=pack_meta)

    trust_summary_json_obj = {
        "pack_id": pack_id,
        "generated_at_utc": generated_at_utc,
        "protocol_version": PROTOCOL_VERSION,
        "user_id": int(user_id),
        "trust": {
            "lifetime_trust": summary.get("lifetime_trust"),
            "standing_score": summary.get("standing_score"),
            "recency_factor": summary.get("recency_factor"),
            "band": summary.get("band"),
            "level_label": summary.get("level_label"),
            "last_full_repayment_at": summary.get("last_full_repayment_at"),
            "days_since_last_full_repayment": summary.get("days_since_last_full_repayment"),
            "inactivity_decay_applied": summary.get("inactivity_decay_applied"),
        },
        "counts": summary.get("counts", {}),
        "gains": summary.get("gains", {}),
        "penalties": summary.get("penalties", {}),
        "disclaimer": "Community-backed integrity record. Not a bank guarantee. No auto-debit.",
    }
    trust_summary_json = json.dumps(trust_summary_json_obj, indent=2, ensure_ascii=False).encode("utf-8")

    timeline_rows = list_trust_timeline(db, user_id=int(user_id), limit=50, audience="user", hide_zero_deltas_for_user=True)
    timeline_json = json.dumps(
        {
            "pack_id": pack_id,
            "generated_at_utc": generated_at_utc,
            "protocol_version": PROTOCOL_VERSION,
            "user_id": int(user_id),
            "items": timeline_rows,
        },
        indent=2,
        ensure_ascii=False,
    ).encode("utf-8")

    shipment_events = _events_like(db, user_id=int(user_id), prefix="merchant.", limit=160)
    courier_events = _events_like(db, user_id=int(user_id), prefix="courier.", limit=160)
    delivery_confirm = _latest_event(db, user_id=int(user_id), event_type="merchant.delivery_confirmed")

    shipment_json = json.dumps(
        {"pack_id": pack_id, "generated_at_utc": generated_at_utc, "user_id": int(user_id), "items": shipment_events},
        indent=2,
        ensure_ascii=False,
    ).encode("utf-8")

    courier_json = json.dumps(
        {"pack_id": pack_id, "generated_at_utc": generated_at_utc, "user_id": int(user_id), "items": courier_events},
        indent=2,
        ensure_ascii=False,
    ).encode("utf-8")

    delivery_json = json.dumps(
        {"pack_id": pack_id, "generated_at_utc": generated_at_utc, "user_id": int(user_id), "item": delivery_confirm},
        indent=2,
        ensure_ascii=False,
    ).encode("utf-8")

    protocol_txt = f"""GMFN Evidence Pack
Pack ID: {pack_id}
Protocol: {PROTOCOL_VERSION}
Generated (UTC): {generated_at_utc}
User ID: {user_id}

Non-custodial MVP. Not a bank guarantee. No auto-debit.
""".encode("utf-8")

    evidence_pack_id_txt = f"{pack_id}\n".encode("utf-8")

    files: List[Tuple[str, bytes]] = [
        ("trust_slip.pdf", trust_slip_pdf),
        ("trust_timeline.pdf", trust_timeline_pdf),
        ("trust_summary.json", trust_summary_json),
        ("timeline.json", timeline_json),
        ("shipment_events.json", shipment_json),
        ("courier_confirmations.json", courier_json),
        ("delivery_confirmation.json", delivery_json),
        ("PROTOCOL.txt", protocol_txt),
        ("EVIDENCE_PACK_ID.txt", evidence_pack_id_txt),
    ]

    manifest_obj = {
        "pack_id": pack_id,
        "generated_at_utc": generated_at_utc,
        "protocol_version": PROTOCOL_VERSION,
        "user_id": int(user_id),
        "files": [n for n, _ in files],
        "disclaimer": "Community-backed integrity record. Not a bank guarantee. No auto-debit.",
    }
    manifest_json = json.dumps(manifest_obj, indent=2, ensure_ascii=False).encode("utf-8")
    files.append(("MANIFEST.json", manifest_json))

    sha_lines = [f"{_sha256_hex(data)}  {name}" for name, data in files]
    sha256sums_txt = ("\n".join(sha_lines) + "\n").encode("utf-8")

    secret = _get_signing_secret()
    if secret:
        msg = (f"pack_id={pack_id}\nprotocol={PROTOCOL_VERSION}\n" + "\n".join(sha_lines) + "\n").encode("utf-8")
        sig = _hmac_sha256_hex(secret, msg)
        signature_txt = f"present: true\npack_id: {pack_id}\nprotocol: {PROTOCOL_VERSION}\nsignature_hex: {sig}\n".encode("utf-8")
    else:
        signature_txt = f"present: false\npack_id: {pack_id}\nprotocol: {PROTOCOL_VERSION}\n".encode("utf-8")

    files.append(("SHA256SUMS.txt", sha256sums_txt))
    files.append(("SIGNATURE.txt", signature_txt))

    buf = BytesIO()
    with ZipFile(buf, "w", ZIP_DEFLATED) as zf:
        for name, data in files:
            zf.writestr(name, data)

    return buf.getvalue(), pack_meta


def build_trust_evidence_pack_zip(db: Session, *, user_id: int) -> bytes:
    zip_bytes, _ = build_trust_evidence_pack_zip_with_meta(db, user_id=int(user_id))
    return zip_bytes