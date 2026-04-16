# app/services/trust_events_services.py

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.db.models import TrustEvent


PROTOCOL_VERSION = "GMFN_PROTOCOL_v1"


# =========================
# TIME
# =========================

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


# =========================
# META BUILDER
# =========================

def build_trust_meta(
    *,
    reason: str,
    note: Optional[str] = None,
    trust_delta: str = "0.00",
    system: bool = False,
    extra: Optional[dict] = None,
) -> Dict[str, Any]:
    """
    Canonical TrustEvent metadata builder.

    Ensures every event follows the same schema so analytics,
    evidence packs, and trust explanations remain stable.
    """

    meta: Dict[str, Any] = {
        "policy": PROTOCOL_VERSION,
        "reason": str(reason),
        "note": note,
        "trust_delta": str(trust_delta),
        "system": bool(system),
    }

    if extra and isinstance(extra, dict):
        meta.update(extra)

    return meta


# =========================
# CORE LOGGER
# =========================

def log_trust_event(
    db: Session,
    *,
    event_type: str,
    clan_id: Optional[int],
    actor_user_id: int,
    subject_user_id: int,
    loan_id: Optional[int] = None,
    guarantor_id: Optional[int] = None,
    meta: Optional[Dict[str, Any]] = None,
    dedupe_key: Optional[str] = None,
    commit: bool = True,
    refresh: bool = True,
) -> TrustEvent:
    """
    Canonical TrustEvent logger.

    All services should call this function to ensure
    consistent event creation.
    """

    if not event_type:
        raise ValueError("event_type is required")

    if actor_user_id <= 0:
        raise ValueError("actor_user_id must be positive")

    if subject_user_id <= 0:
        raise ValueError("subject_user_id must be positive")

    # -------------------------
    # DEDUPE PROTECTION
    # -------------------------

    if dedupe_key:
        existing = (
            db.query(TrustEvent)
            .filter(TrustEvent.dedupe_key == dedupe_key)
            .first()
        )
        if existing:
            return existing

    meta_json: Optional[str] = None

    if meta is not None:
        try:
            meta_json = json.dumps(meta, ensure_ascii=False)
        except Exception:
            meta_json = json.dumps({"raw_meta_error": True})

    event = TrustEvent(
        event_type=str(event_type),
        clan_id=int(clan_id) if clan_id else None,
        loan_id=int(loan_id) if loan_id else None,
        guarantor_id=int(guarantor_id) if guarantor_id else None,
        actor_user_id=int(actor_user_id),
        subject_user_id=int(subject_user_id),
        meta_json=meta_json,
        dedupe_key=dedupe_key,
        created_at=_now_utc(),
    )

    db.add(event)

    if commit:
        db.commit()

    if refresh:
        db.refresh(event)

    return event


# =========================
# SPECIALIZED HELPERS
# =========================

def log_guarantee_released(
    db: Session,
    *,
    clan_id: int,
    actor_user_id: int,
    borrower_user_id: int,
    guarantor_user_id: int,
    loan_id: int,
    guarantor_id: int,
    released_amount: Any,
    release_reason: str,
    note: Optional[str] = None,
    commit: bool = True,
    refresh: bool = True,
) -> TrustEvent:

    meta = build_trust_meta(
        reason=release_reason,
        note=note,
        system=True,
        extra={
            "released_amount": str(released_amount),
            "guarantor_user_id": guarantor_user_id,
        },
    )

    return log_trust_event(
        db,
        event_type="guarantee.released",
        clan_id=clan_id,
        loan_id=loan_id,
        guarantor_id=guarantor_id,
        actor_user_id=actor_user_id,
        subject_user_id=borrower_user_id,
        meta=meta,
        commit=commit,
        refresh=refresh,
    )


def log_guarantee_given(
    db: Session,
    *,
    clan_id: int,
    actor_user_id: int,
    borrower_user_id: int,
    guarantor_user_id: int,
    loan_id: int,
    guarantor_id: int,
    pledge_amount: Any,
    guarantee_gap: Any,
    reason: str,
    note: Optional[str] = None,
    commit: bool = True,
    refresh: bool = True,
) -> TrustEvent:
    meta = build_trust_meta(
        reason=reason,
        note=note,
        system=True,
        extra={
            "pledge_amount": str(pledge_amount),
            "guarantee_gap": str(guarantee_gap),
            "guarantor_user_id": guarantor_user_id,
        },
    )

    return log_trust_event(
        db,
        event_type="guarantee.given",
        clan_id=clan_id,
        loan_id=loan_id,
        guarantor_id=guarantor_id,
        actor_user_id=actor_user_id,
        subject_user_id=borrower_user_id,
        meta=meta,
        commit=commit,
        refresh=refresh,
    )


def log_loan_defaulted(
    db: Session,
    *,
    clan_id: int,
    actor_user_id: int,
    borrower_user_id: int,
    loan_id: int,
    default_amount: Any,
    days_past_due: Optional[int],
    trigger_mode: str,
    reason: str,
    note: Optional[str] = None,
    commit: bool = True,
    refresh: bool = True,
) -> TrustEvent:

    meta = build_trust_meta(
        reason=reason,
        note=note,
        system=True,
        extra={
            "default_amount": str(default_amount),
            "days_past_due": days_past_due,
            "trigger_mode": trigger_mode,
        },
    )

    return log_trust_event(
        db,
        event_type="loan.defaulted",
        clan_id=clan_id,
        loan_id=loan_id,
        actor_user_id=actor_user_id,
        subject_user_id=borrower_user_id,
        meta=meta,
        commit=commit,
        refresh=refresh,
    )
def log_loan_repaid(
    db,
    *,
    clan_id: int,
    actor_user_id: int,
    borrower_user_id: int,
    loan_id: int,
    repayment_amount,
    note: str | None = None,
    commit: bool = True,
    refresh: bool = True,
):
    event = log_trust_event(
        db,
        event_type="loan.repaid",
        clan_id=int(clan_id),
        loan_id=int(loan_id),
        guarantor_id=None,
        actor_user_id=int(actor_user_id),
        subject_user_id=int(borrower_user_id),
        meta={
            "repayment_amount": str(repayment_amount),
            "reason": "loan_repaid",
            "note": note,
        },
    )

    if commit:
        db.commit()

    return event    
