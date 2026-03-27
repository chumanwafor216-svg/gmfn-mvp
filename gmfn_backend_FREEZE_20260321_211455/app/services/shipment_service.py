# app/services/shipment_service.py
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import TrustEvent
from app.services.trust_events_services import log_trust_event


STAGES = [
    "released",      # merchant released goods
    "packaged",      # seller packaged + waybill prepared
    "dispatched",    # handed to courier
    "in_transit",    # in transit
    "arrived",       # arrived at destination city
    "delivered",     # delivered to borrower
    "confirmed",     # borrower confirms delivery ok
]

STAGE_LABEL = {
    "released": "Released",
    "packaged": "Packaged",
    "dispatched": "Dispatched",
    "in_transit": "In transit",
    "arrived": "Arrived",
    "delivered": "Delivered",
    "confirmed": "Confirmed",
}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _parse_meta(meta_json: Optional[str]) -> Dict[str, Any]:
    if not meta_json:
        return {}
    try:
        obj = json.loads(meta_json)
        return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def _validate_stage(stage: str) -> str:
    s = (stage or "").strip().lower()
    if s not in STAGES:
        raise HTTPException(status_code=400, detail=f"Invalid stage '{stage}'. Allowed: {', '.join(STAGES)}")
    return s


def log_shipment_event(
    db: Session,
    *,
    actor_user_id: int,
    subject_user_id: int,
    clan_id: Optional[int],
    pack_id: str,
    stage: str,
    courier_name: Optional[str] = None,
    courier_phone: Optional[str] = None,
    tracking_ref: Optional[str] = None,
    expected_delivery_at: Optional[str] = None,
    note: Optional[str] = None,
) -> TrustEvent:
    """
    Pilot-safe shipment logging.
    Stored as TrustEvent (append-only), so it is automatically auditable & included in evidence packs.
    """
    stage = _validate_stage(stage)
    pack_id = (pack_id or "").strip()
    if not pack_id:
        raise HTTPException(status_code=400, detail="pack_id is required")

    meta: Dict[str, Any] = {
        "policy": "trust_constitution_v1",
        "reason": f"shipment.{stage}",
        "pack_id": pack_id,
        "stage": stage,
        "stage_label": STAGE_LABEL.get(stage, stage),
        "trust_delta": "0.00",  # shipment events do not change trust in MVP
    }

    if courier_name:
        meta["courier_name"] = str(courier_name)
    if courier_phone:
        meta["courier_phone"] = str(courier_phone)
    if tracking_ref:
        meta["tracking_ref"] = str(tracking_ref)
    if expected_delivery_at:
        meta["expected_delivery_at"] = str(expected_delivery_at)
    if note:
        meta["note"] = str(note)

    # event_type namespace: shipment.*
    ev_type = f"shipment.{stage}"

    # We let clan_id be optional; if missing we store 0 to keep DB happy if clan_id is non-nullable.
    safe_clan_id = int(clan_id) if clan_id is not None else 0

    return log_trust_event(
        db,
        event_type=ev_type,
        clan_id=safe_clan_id,
        loan_id=0,
        guarantor_id=None,
        actor_user_id=int(actor_user_id),
        subject_user_id=int(subject_user_id),
        meta=meta,
    )


def list_shipment_events_for_pack(
    db: Session,
    *,
    subject_user_id: int,
    pack_id: str,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    """
    Returns shipment events (derived from TrustEvent ledger) for a given pack_id.
    """
    pack_id = (pack_id or "").strip()
    if not pack_id:
        raise HTTPException(status_code=400, detail="pack_id is required")

    limit = max(1, min(int(limit), 500))

    rows: List[TrustEvent] = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(subject_user_id))
        .order_by(TrustEvent.created_at.asc())
        .all()
    )

    out: List[Dict[str, Any]] = []
    for r in rows:
        et = str(getattr(r, "event_type", "") or "")
        if not et.startswith("shipment."):
            continue

        meta = _parse_meta(getattr(r, "meta_json", None))
        if str(meta.get("pack_id") or "") != pack_id:
            continue

        created_at = getattr(r, "created_at", None)
        if created_at and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)

        out.append(
            {
                "event_type": et,
                "stage": str(meta.get("stage") or et.replace("shipment.", "")),
                "stage_label": str(meta.get("stage_label") or STAGE_LABEL.get(meta.get("stage", ""), "")),
                "created_at": created_at.isoformat() if created_at else None,
                "actor_user_id": getattr(r, "actor_user_id", None),
                "note": meta.get("note"),
                "courier_name": meta.get("courier_name"),
                "courier_phone": meta.get("courier_phone"),
                "tracking_ref": meta.get("tracking_ref"),
                "expected_delivery_at": meta.get("expected_delivery_at"),
                "pack_id": pack_id,
            }
        )

    # trim last N
    if len(out) > limit:
        out = out[-limit:]

    return out


def compute_shipment_progress(
    events: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Returns current_stage and a normalized ordered map of stages.
    """
    seen: Dict[str, Dict[str, Any]] = {}
    for e in events:
        stage = (e.get("stage") or "").strip().lower()
        if not stage:
            continue
        seen[stage] = e

    # determine current stage by latest stage in STAGES order that exists
    current = None
    for s in reversed(STAGES):
        if s in seen:
            current = s
            break

    stages_out: List[Dict[str, Any]] = []
    for s in STAGES:
        ev = seen.get(s)
        stages_out.append(
            {
                "stage": s,
                "label": STAGE_LABEL.get(s, s),
                "done": ev is not None,
                "at": ev.get("created_at") if ev else None,
            }
        )

    return {
        "current_stage": current,
        "stages": stages_out,
    }