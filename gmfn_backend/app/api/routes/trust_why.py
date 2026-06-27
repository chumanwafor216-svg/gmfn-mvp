from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.constants import PROTOCOL_VERSION
from app.db.database import get_db
from app.db.models import TrustEvent, User
from app.services.trust_score_service import apply_trust_score, compute_trust_breakdown

router = APIRouter(prefix="/trust", tags=["trust"])


ExplainMode = Literal["minimal", "standard", "detailed"]


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
    """
    Deterministic Pack ID:
    - Stable for a given latest event timestamp
    - Changes when the timeline changes
    """
    if based_on_event_at is None:
        based_on_event_at = datetime.now(timezone.utc).replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        )

    ts = based_on_event_at.astimezone(timezone.utc)
    day = ts.strftime("%Y%m%d")

    seed = f"{user_id}|{ts.isoformat()}|{PROTOCOL_VERSION}"
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest().upper()[:10]
    return f"TP-U{user_id}-{day}-{digest}"


def _safe_meta(raw: Any) -> dict[str, Any]:
    if raw is None:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            v = json.loads(raw)
            return v if isinstance(v, dict) else {}
        except Exception:
            return {}
    return {}


def _infer_delta(event_type: str) -> Optional[Decimal]:
    """
    Deterministic delta mapping aligned with current policy.

    This is only an explainability estimate.
    Source of truth remains the deterministic trust engine.
    """
    t = (event_type or "").lower()

    if t in {"repayment.confirmed", "loan.repaid", "repayment.completed", "loan_fully_repaid"}:
        return Decimal("0.10")

    if t in {"guarantor.repayment.confirmed", "guarantor.support.confirmed", "guarantor_success"}:
        return Decimal("0.03")

    return None


def _delta_rule(event_type: str) -> Optional[str]:
    t = (event_type or "").lower()

    if t in {"repayment.confirmed", "loan.repaid", "repayment.completed", "loan_fully_repaid"}:
        return "repayment-only-policy:borrower:+0.10"

    if t in {"guarantor.repayment.confirmed", "guarantor.support.confirmed", "guarantor_success"}:
        return "repayment-only-policy:guarantor:+0.03"

    return None


def _checksum(*, pack_id: str, latest_event_at: Optional[datetime], event_ids: list[int]) -> str:
    ts = latest_event_at.isoformat() if latest_event_at else "none"
    seed = f"{pack_id}|{PROTOCOL_VERSION}|{ts}|{','.join(map(str, event_ids))}"
    return hashlib.sha256(seed.encode("utf-8")).hexdigest()


def _serialize_dt(value: Any) -> Any:
    if isinstance(value, datetime):
        return _to_aware(value).isoformat() if _to_aware(value) else None
    return value


def _mode_redact_event(e: dict[str, Any], mode: ExplainMode) -> dict[str, Any]:
    out = dict(e)
    has_private_reference = any(
        out.get(key) not in (None, "")
        for key in (
            "id",
            "clan_id",
            "loan_id",
            "guarantor_id",
            "actor_user_id",
            "subject_user_id",
        )
    ) or bool(out.get("meta"))

    safe = {
        "event_type": out.get("event_type"),
        "delta": out.get("delta"),
        "delta_rule": out.get("delta_rule"),
        "reason": out.get("reason"),
        "note": out.get("note"),
        "created_at": out.get("created_at"),
    }
    if has_private_reference:
        safe["reference_label"] = "Private trust record"
        safe["detail_boundary"] = "Private operational details redacted for trust explanation"

    if mode == "detailed":
        return safe

    if mode == "standard":
        return safe

    if mode == "minimal":
        return {
            "event_type": safe.get("event_type"),
            "delta": safe.get("delta"),
            "delta_rule": safe.get("delta_rule"),
            "reference_label": safe.get("reference_label"),
            "created_at": safe.get("created_at"),
        }

    return safe


@router.get("/me/why")
def trust_why_me(
    limit: int = 10,
    mode: ExplainMode = "standard",
    event_type: Optional[str] = None,
    clan_id: Optional[int] = None,
    loan_id: Optional[int] = None,
    group_by_loan: bool = False,
    include_policy_timeline: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return trust_why_user(
        user_id=int(current_user.id),
        limit=limit,
        mode=mode,
        event_type=event_type,
        clan_id=clan_id,
        loan_id=loan_id,
        group_by_loan=group_by_loan,
        include_policy_timeline=include_policy_timeline,
        db=db,
        current_user=current_user,
    )


@router.get("/why/{user_id}")
def trust_why_user(
    user_id: int,
    limit: int = 10,
    mode: ExplainMode = "standard",
    event_type: Optional[str] = None,
    clan_id: Optional[int] = None,
    loan_id: Optional[int] = None,
    group_by_loan: bool = False,
    include_policy_timeline: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    if int(user_id) != int(current_user.id):
        raise HTTPException(status_code=403, detail="Not allowed")

    lim = max(1, min(int(limit or 10), 50))

    u = db.get(User, int(user_id))
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    apply_trust_score(db, user_id=int(user_id))
    breakdown = compute_trust_breakdown(db, user_id=int(user_id))

    latest_event_at = _latest_event_time(db, int(user_id))
    pack_id = _build_pack_id(user_id=int(user_id), based_on_event_at=latest_event_at)

    q = db.query(TrustEvent).filter(TrustEvent.subject_user_id == int(user_id))
    if event_type:
        q = q.filter(TrustEvent.event_type == event_type)
    if clan_id is not None:
        q = q.filter(TrustEvent.clan_id == int(clan_id))
    if loan_id is not None:
        q = q.filter(TrustEvent.loan_id == int(loan_id))

    rows: list[TrustEvent] = (
        q.order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(lim)
        .all()
    )

    events_out: list[dict[str, Any]] = []
    event_ids: list[int] = []

    policy_timeline: list[dict[str, Any]] = []
    running = Decimal("0")

    grouped: dict[str, dict[str, Any]] = {}

    forward_rows = list(reversed(rows)) if include_policy_timeline else []

    for e in rows:
        event_ids.append(int(e.id))

        meta = _safe_meta(getattr(e, "meta", None) or getattr(e, "meta_json", None))
        delta_val = _infer_delta(e.event_type)
        delta_str = str(delta_val) if delta_val is not None else None

        ev = {
            "id": int(e.id),
            "event_type": e.event_type,
            "delta": delta_str,
            "delta_rule": _delta_rule(e.event_type),
            "clan_id": e.clan_id,
            "loan_id": e.loan_id,
            "guarantor_id": e.guarantor_id,
            "actor_user_id": int(e.actor_user_id),
            "subject_user_id": int(e.subject_user_id),
            "reason": meta.get("reason"),
            "note": meta.get("note"),
            "created_at": _serialize_dt(getattr(e, "created_at", None)),
            "meta": meta if mode == "detailed" else None,
        }

        events_out.append(_mode_redact_event(ev, mode))

    if include_policy_timeline:
        for e in forward_rows:
            d = _infer_delta(e.event_type)
            if d is not None:
                running += d

            policy_timeline.append(
                {
                    "event_number": len(policy_timeline) + 1,
                    "event_type": e.event_type,
                    "delta": str(d) if d is not None else None,
                    "policy_score_estimate": str(running),
                    "created_at": _serialize_dt(getattr(e, "created_at", None)),
                }
            )

    if group_by_loan:
        for e in rows:
            key = str(e.loan_id) if e.loan_id is not None else "none"

            if key not in grouped:
                grouped[key] = {
                    "loan_id": e.loan_id,
                    "events": 0,
                    "delta_total": Decimal("0"),
                    "last_event_at": None,
                }

            grouped[key]["events"] += 1

            d = _infer_delta(e.event_type)
            if d is not None:
                grouped[key]["delta_total"] += d

            t = _to_aware(getattr(e, "created_at", None))
            last = grouped[key]["last_event_at"]
            if last is None or (t is not None and t > last):
                grouped[key]["last_event_at"] = t

    checksum = _checksum(
        pack_id=pack_id,
        latest_event_at=latest_event_at,
        event_ids=event_ids,
    )

    out: dict[str, Any] = {
        "user_id": int(user_id),
        "mode": mode,
        "protocol_version": PROTOCOL_VERSION,
        "pack_id": pack_id,
        "latest_event_at": latest_event_at.isoformat() if latest_event_at else None,
        "checksum": checksum,
        "computed": breakdown,
        "events": events_out,
        "links": {
            "me": "/auth/me",
            "why_me": "/trust/me/why",
            "evidence_pack_meta": "/trust/me/evidence-pack/meta",
            "trust_score_explained": "/trust/score/explained",
        },
    }

    if include_policy_timeline:
        out["policy_timeline_estimate"] = policy_timeline

    if group_by_loan:
        out["grouped_by_loan"] = [
            {
                "reference_label": "Private support group"
                if v["loan_id"] is not None
                else "General trust records",
                "events": v["events"],
                "delta_total": str(v["delta_total"]),
                "last_event_at": v["last_event_at"].isoformat() if v["last_event_at"] else None,
            }
            for v in grouped.values()
        ]

    return out
