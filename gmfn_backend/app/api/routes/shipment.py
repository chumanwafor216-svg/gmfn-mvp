# app/api/routes/shipment.py
from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import User

from app.services.shipment_service import (
    STAGES,
    log_shipment_event,
    list_shipment_events_for_pack,
    compute_shipment_progress,
)

router = APIRouter(prefix="/shipments", tags=["shipments"])


class ShipmentLogIn(BaseModel):
    pack_id: str = Field(..., description="Evidence Pack ID (TP-...)")
    stage: str = Field(..., description=f"One of: {', '.join(STAGES)}")

    # optional logistics fields
    courier_name: Optional[str] = None
    courier_phone: Optional[str] = None
    tracking_ref: Optional[str] = None
    expected_delivery_at: Optional[str] = None

    note: Optional[str] = None
    clan_id: Optional[int] = None


@router.post("/log")
def log_shipment(
    body: ShipmentLogIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Pilot-safe: Borrower logs shipment checkpoints.
    (Later: allow merchant/courier role-gated logging)
    """
    ev = log_shipment_event(
        db,
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        clan_id=body.clan_id,
        pack_id=str(body.pack_id),
        stage=str(body.stage),
        courier_name=body.courier_name,
        courier_phone=body.courier_phone,
        tracking_ref=body.tracking_ref,
        expected_delivery_at=body.expected_delivery_at,
        note=body.note,
    )

    return {
        "ok": True,
        "pack_id": str(body.pack_id),
        "stage": str(body.stage),
        "event_type": getattr(ev, "event_type", None),
        "created_at": getattr(ev, "created_at", None).isoformat() if getattr(ev, "created_at", None) else None,
    }


@router.get("/pack/{pack_id}")
def get_pack_progress(
    pack_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    events = list_shipment_events_for_pack(
        db,
        subject_user_id=int(current_user.id),
        pack_id=str(pack_id),
        limit=200,
    )
    progress = compute_shipment_progress(events)

    return {
        "ok": True,
        "pack_id": str(pack_id),
        "events": events,
        "progress": progress,
    }