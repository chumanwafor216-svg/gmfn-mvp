from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import TrustSlip, Clan, User
from app.services.trust_events_services import log_trust_event


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _trust_label(score: int) -> str:
    if score >= 80:
        return "🟢 STRONG"
    if score >= 60:
        return "🟦 GOOD"
    if score >= 30:
        return "🟨 BUILDING"
    return "🔴 LOW"


def _default_limit_for_score(score: int) -> Decimal:
    # MVP heuristic; you can tune per region later
    if score >= 80:
        return Decimal("1200000")
    if score >= 60:
        return Decimal("600000")
    if score >= 30:
        return Decimal("200000")
    return Decimal("50000")


def issue_trust_slip(
    db: Session,
    *,
    clan_id: int,
    holder: User,
    currency: str = "NGN",
    expires_days: int = 7,
) -> TrustSlip:
    clan = db.get(Clan, clan_id)
    if not clan:
        raise HTTPException(status_code=404, detail="Clan not found")

    score = int(getattr(holder, "trust_score", 50) or 50)
    limit_amt = _default_limit_for_score(score)

    expires_at = _utcnow() + timedelta(days=max(1, int(expires_days)))

    slip = TrustSlip(
        clan_id=int(clan_id),
        holder_user_id=int(holder.id),
        trust_limit=limit_amt,
        currency=currency or "NGN",
        status="active",
        expires_at=expires_at,
        created_at=_utcnow(),
    )
    db.add(slip)
    db.commit()
    db.refresh(slip)

    log_trust_event(
        db,
        event_type="trust_slip.issued",
        clan_id=int(clan_id),
        loan_id=None,
        guarantor_id=None,
        actor_user_id=int(holder.id),
        subject_user_id=int(holder.id),
        meta={
            "code": slip.code,
            "trust_limit": str(limit_amt),
            "currency": slip.currency,
            "expires_at": slip.expires_at.isoformat() if slip.expires_at else None,
        },
    )
    return slip


def verify_trust_slip(db: Session, *, code: str) -> dict:
    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="Trust slip not found")

    if slip.status != "active":
        raise HTTPException(status_code=400, detail="Trust slip not active")

    if slip.expires_at and slip.expires_at <= _utcnow():
        slip.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Trust slip expired")

    clan = db.get(Clan, slip.clan_id)
    holder = db.get(User, slip.holder_user_id)

    slip.last_verified_at = _utcnow()
    db.commit()

    # Log verification (supplier is anonymous in MVP)
    log_trust_event(
        db,
        event_type="trust_slip.verified",
        clan_id=int(slip.clan_id),
        loan_id=None,
        guarantor_id=None,
        actor_user_id=int(slip.holder_user_id),
        subject_user_id=int(slip.holder_user_id),
        meta={"code": slip.code},
    )

    score = int(getattr(holder, "trust_score", 50) or 50) if holder else 50

    return {
        "code": slip.code,
        "clan_id": int(slip.clan_id),
        "clan_name": getattr(clan, "name", None) or "—",
        "holder_user_id": int(slip.holder_user_id),
        "holder_email": getattr(holder, "email", None) if holder else None,
        "trust_limit": slip.trust_limit,
        "currency": slip.currency,
        "status": slip.status,
        "expires_at": slip.expires_at,
        "trust_level_label": _trust_label(score),
        "trust_recent_line": None,
    }


def release_goods(db: Session, *, code: str, payload: dict) -> TrustSlip:
    slip = db.query(TrustSlip).filter(TrustSlip.code == code).first()
    if not slip:
        raise HTTPException(status_code=404, detail="Trust slip not found")

    if slip.status != "active":
        raise HTTPException(status_code=400, detail="Trust slip not active")

    if slip.expires_at and slip.expires_at <= _utcnow():
        slip.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Trust slip expired")

    slip.last_release_at = _utcnow()
    db.commit()
    db.refresh(slip)

    log_trust_event(
        db,
        event_type="trust_slip.released",
        clan_id=int(slip.clan_id),
        loan_id=None,
        guarantor_id=None,
        actor_user_id=int(slip.holder_user_id),
        subject_user_id=int(slip.holder_user_id),
        meta={
            "code": slip.code,
            "supplier_name": payload.get("supplier_name"),
            "supplier_phone": payload.get("supplier_phone"),
            "amount_released": str(payload.get("amount_released")) if payload.get("amount_released") is not None else None,
            "note": payload.get("note"),
        },
    )

    return slip
