# app/services/evidence_pack_service.py
from __future__ import annotations

import io
import json
import zipfile
from datetime import datetime, timezone
from hashlib import sha256
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models import TrustEvent, User
from app.core.constants import PROTOCOL_VERSION  # already in your constants.py

# Reuse your existing TrustSlip Evidence PDF builder
from app.services.trust_slip_evidence_pdf_service import build_trust_slip_pdf

# Reuse your trust timeline builder (data)
from app.services.trust_timeline_service import list_trust_timeline

# ✅ Canonical deterministic trust snapshot engine
from app.services.trust_score_service import apply_trust_score, compute_trust_breakdown

# Timeline PDF helper
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.lib import colors


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _stable_pack_id(*, user_id: int, dt: Optional[datetime] = None) -> str:
    """
    Pilot-safe Pack ID:
    - Stable for the same user for the same UTC day.
    - Prevents "pack id changes every click" confusion during pilots.
    """
    dt = dt or _now_utc()
    day = dt.strftime("%Y%m%d")  # UTC day
    seed = f"tp:{user_id}:{day}".encode("utf-8")
    h = sha256(seed).hexdigest()[:8].upper()
    return f"TP-{day}Z-{h}"


def _get_footer(dt: Optional[datetime] = None) -> str:
    dt = dt or _now_utc()
    return f"Confidential / Pilot Version / {dt.date().isoformat()}"


def _safe_json(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2, default=str)


def _query_recent_trust_events(db: Session, *, user_id: int, limit: int = 200) -> List[TrustEvent]:
    return (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(int(limit))
        .all()
    )


def _parse_meta(meta_json: Optional[str]) -> Dict[str, Any]:
    if not meta_json:
        return {}
    try:
        obj = json.loads(meta_json)
        return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def _latest_event_time(db: Session, *, user_id: int) -> Optional[datetime]:
    row: Optional[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .first()
    )
    return _to_aware(getattr(row, "created_at", None)) if row else None


def _checksum(pack_id: str, based_on_event_at: Optional[datetime]) -> str:
    ts = based_on_event_at.isoformat() if based_on_event_at else "none"
    seed = f"{pack_id}|{PROTOCOL_VERSION}|{ts}".encode("utf-8")
    return sha256(seed).hexdigest()


def _infer_delta(event_type: str) -> Optional[str]:
    """
    Deterministic delta mapping aligned with current repayment-only policy.
    NOTE: This is explainability display only; canonical score comes from trust engine.
    """
    t = (event_type or "").lower()
    if t in {"repayment.confirmed", "loan.repaid", "repayment.completed"}:
        return "+0.10"
    if t in {"guarantor.repayment.confirmed", "guarantor.support.confirmed"}:
        return "+0.03"
    return None


def _trust_explainability_payload(
    db: Session,
    *,
    user_id: int,
    limit: int = 10,
) -> Dict[str, Any]:
    """
    Tier-1 embedded trust explainability for evidence pack.
    - deterministic
    - includes canonical trust breakdown snapshot
    - includes last N TrustEvents with reason/note (if present)
    """
    lim = max(1, min(int(limit or 10), 50))

    # Canonical deterministic trust snapshot
    apply_trust_score(db, user_id=int(user_id))
    breakdown = compute_trust_breakdown(db, user_id=int(user_id))

    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(lim)
        .all()
    )

    events: List[Dict[str, Any]] = []
    for e in rows:
        meta = _parse_meta(getattr(e, "meta_json", None))
        events.append(
            {
                "id": getattr(e, "id", None),
                "created_at": getattr(e, "created_at", None).isoformat() if getattr(e, "created_at", None) else None,
                "event_type": getattr(e, "event_type", None),
                "delta": _infer_delta(getattr(e, "event_type", "") or ""),
                "clan_id": getattr(e, "clan_id", None),
                "loan_id": getattr(e, "loan_id", None),
                "guarantor_id": getattr(e, "guarantor_id", None),
                "actor_user_id": getattr(e, "actor_user_id", None),
                "subject_user_id": getattr(e, "subject_user_id", None),
                "reason": meta.get("reason"),
                "note": meta.get("note"),
            }
        )

    return {
        "computed": breakdown,
        "events": events,
        "policy_note": "Trust is deterministic and repayment-only in MVP. Deltas shown are policy-aligned explainability.",
    }


def _latest_event_by_types(
    db: Session,
    *,
    user_id: int,
    event_types: List[str],
) -> Optional[TrustEvent]:
    # Exact match search; keep list broad and tolerant
    q = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .filter(TrustEvent.event_type.in_(event_types))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
    )
    return q.first()


def _shipment_events(db: Session, *, user_id: int, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Shipment events are logged as TrustEvents.
    We accept multiple event type spellings to be robust.
    """
    shipment_prefixes = ("shipment.", "courier.", "logistics.")
    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(int(limit))
        .all()
    )

    out: List[Dict[str, Any]] = []
    for r in rows:
        et = (getattr(r, "event_type", "") or "").strip()
        if not et:
            continue
        if et.startswith(shipment_prefixes) or et in {
            "shipment.dispatched",
            "shipment.in_transit",
            "shipment.delivered",
            "shipment.confirmed",
            "shipment.created",
        }:
            meta = _parse_meta(getattr(r, "meta_json", None))
            out.append(
                {
                    "created_at": getattr(r, "created_at", None).isoformat() if getattr(r, "created_at", None) else None,
                    "event_type": et,
                    "loan_id": getattr(r, "loan_id", None),
                    "clan_id": getattr(r, "clan_id", None),
                    "actor_user_id": getattr(r, "actor_user_id", None),
                    "subject_user_id": getattr(r, "subject_user_id", None),
                    "meta": meta,
                }
            )
    # Reverse to oldest->newest for readability
    return list(reversed(out))


def _merchant_release_json(db: Session, *, user_id: int) -> Dict[str, Any]:
    """
    Merchant release evidence is logged as a TrustEvent by the merchant release endpoint.
    We tolerate multiple event_type spellings.
    """
    evt = _latest_event_by_types(
        db,
        user_id=user_id,
        event_types=[
            "merchant.release.recorded",
            "merchant_release_recorded",
            "merchant.release",
            "merchant_release",
        ],
    )

    if not evt:
        return {"ok": False, "message": "No merchant release evidence recorded yet."}

    meta = _parse_meta(getattr(evt, "meta_json", None))
    return {
        "ok": True,
        "created_at": getattr(evt, "created_at", None).isoformat() if getattr(evt, "created_at", None) else None,
        "event_type": getattr(evt, "event_type", None),
        "loan_id": getattr(evt, "loan_id", None),
        "clan_id": getattr(evt, "clan_id", None),
        "actor_user_id": getattr(evt, "actor_user_id", None),
        "subject_user_id": getattr(evt, "subject_user_id", None),
        "meta": meta,
    }


def _timeline_pdf_bytes(db: Session, *, user_id: int, pack_id: str, footer: str) -> bytes:
    """
    PDF snapshot of the 'Why did my trust change?' timeline.
    Uses list_trust_timeline(audience='user') so labels are humane.
    """
    items = list_trust_timeline(db, user_id=int(user_id), limit=80, audience="user", hide_zero_deltas_for_user=True)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf)
    styles = getSampleStyleSheet()
    elems: List[Any] = []

    elems.append(Paragraph("GMFN Trust Timeline Snapshot", styles["Heading1"]))
    elems.append(Spacer(1, 0.15 * inch))
    elems.append(Paragraph(f"User ID: {user_id}", styles["Normal"]))
    elems.append(Paragraph(f"Pack ID: {pack_id}", styles["Normal"]))
    elems.append(Paragraph(footer, styles["Normal"]))
    elems.append(Spacer(1, 0.2 * inch))

    if not items:
        elems.append(Paragraph("No visible trust timeline events yet.", styles["Normal"]))
        doc.build(elems)
        return buf.getvalue()

    data = [["When (UTC)", "What happened", "Delta", "Loan", "Ref"]]
    for it in items:
        when = (it.get("created_at") or "")[:19].replace("T", " ")
        label = it.get("label") or it.get("event_type") or "Activity"
        delta = it.get("delta") or "0.00"
        loan = it.get("loan_id") or ""
        pref = it.get("payment_reference") or ""
        data.append([when, str(label), str(delta), str(loan), str(pref)])

    tbl = Table(data, colWidths=[1.55 * inch, 3.1 * inch, 0.6 * inch, 0.55 * inch, 1.2 * inch])
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
            ]
        )
    )

    elems.append(tbl)
    elems.append(Spacer(1, 0.2 * inch))
    elems.append(
        Paragraph(
            "Note: This is a pilot snapshot for transparency and auditability. It does not imply GMFN processed funds.",
            styles["Normal"],
        )
    )

    doc.build(elems)
    return buf.getvalue()


def _hash_bytes(b: bytes) -> str:
    return sha256(b).hexdigest()


def build_evidence_pack_zip(db: Session, *, current_user: User, trustslip_summary: Dict[str, Any]) -> bytes:
    """
    Creates a single ZIP evidence pack for pilots.
    """
    now = _now_utc()
    user_id = int(getattr(current_user, "id"))
    pack_id = _stable_pack_id(user_id=user_id, dt=now)
    footer = _get_footer(now)

    based_on_event_at = _latest_event_time(db, user_id=user_id)
    checksum = _checksum(pack_id, based_on_event_at)

    # Core outputs
    trustslip_pdf = build_trust_slip_pdf(db, trustslip_summary)
    timeline_pdf = _timeline_pdf_bytes(db, user_id=user_id, pack_id=pack_id, footer=footer)

    merchant_release = _merchant_release_json(db, user_id=user_id)
    shipment_events = _shipment_events(db, user_id=user_id, limit=200)

    trust_explainability = _trust_explainability_payload(db, user_id=user_id, limit=10)

    trust_rows = _query_recent_trust_events(db, user_id=user_id, limit=200)
    trust_events = []
    for r in trust_rows:
        trust_events.append(
            {
                "id": getattr(r, "id", None),
                "created_at": getattr(r, "created_at", None).isoformat() if getattr(r, "created_at", None) else None,
                "event_type": getattr(r, "event_type", None),
                "clan_id": getattr(r, "clan_id", None),
                "loan_id": getattr(r, "loan_id", None),
                "guarantor_id": getattr(r, "guarantor_id", None),
                "actor_user_id": getattr(r, "actor_user_id", None),
                "subject_user_id": getattr(r, "subject_user_id", None),
                "meta": _parse_meta(getattr(r, "meta_json", None)),
            }
        )

    manifest = {
        "pack_id": pack_id,
        "checksum": checksum,
        "based_on_event_at": based_on_event_at.isoformat() if based_on_event_at else None,
        "generated_at_utc": now.isoformat(),
        "user_id": user_id,
        "protocol_version": PROTOCOL_VERSION,
        "footer": footer,
        "disclaimer": "Pilot evidence pack. GMFN is non-custodial in MVP and does not auto-debit anyone.",
        "files": [],
    }

    out = io.BytesIO()
    with zipfile.ZipFile(out, mode="w", compression=zipfile.ZIP_DEFLATED) as z:
        def add_bytes(name: str, content: bytes) -> None:
            z.writestr(name, content)
            manifest["files"].append({"name": name, "bytes": len(content), "sha256": _hash_bytes(content)})

        add_bytes("trustslip_evidence.pdf", trustslip_pdf)
        add_bytes("trust_timeline.pdf", timeline_pdf)
        add_bytes("merchant_release.json", _safe_json(merchant_release).encode("utf-8"))
        add_bytes("shipment_events.json", _safe_json(shipment_events).encode("utf-8"))
        add_bytes("trust_explainability.json", _safe_json(trust_explainability).encode("utf-8"))
        add_bytes("trust_events.json", _safe_json(trust_events).encode("utf-8"))
        add_bytes("manifest.json", _safe_json(manifest).encode("utf-8"))

    return out.getvalue()


def build_evidence_pack_meta(db: Session, *, current_user: User) -> Dict[str, Any]:
    now = _now_utc()
    user_id = int(getattr(current_user, "id"))
    pack_id = _stable_pack_id(user_id=user_id, dt=now)

    based_on_event_at = _latest_event_time(db, user_id=user_id)
    checksum = _checksum(pack_id, based_on_event_at)

    trust_explainability = _trust_explainability_payload(db, user_id=user_id, limit=10)

    return {
        "pack_id": pack_id,
        "checksum": checksum,
        "based_on_event_at": based_on_event_at.isoformat() if based_on_event_at else None,
        "generated_at_utc": now.isoformat(),
        "protocol_version": PROTOCOL_VERSION,
        "footer": _get_footer(now),
        "trust_explainability": trust_explainability,
        "links": {
            "trust_why_me": "/trust/me/why",
            "trust_score_explained": "/trust/score/explained",
            "trust_evidence_pack_zip": "/trust/me/evidence-pack.zip",
            "trust_evidence_pack_meta": "/trust/me/evidence-pack/meta",
            "verify_url": "/evidence-pack/me/verify",
        },
        "note": "Tier-1: evidence meta embeds trust explainability (snapshot + events).",
    }