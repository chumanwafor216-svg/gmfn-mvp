import json
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from fastapi import Response
from app.services.user_evidence_pack_pdf_service import build_user_evidence_pack_pdf

from app.core.auth import get_current_user
from app.deps import get_db
from app.db.models import User, TrustEvent
from app.schemas.trust import (
    TrustScoreOut,
    TrustScoreHistoryOut,
    TrustScoreHistoryPoint,
    TrustChangesOut,
    TrustChangeOut,
)
from app.services.trust_score_service import recompute_and_store_trust_score, trust_band_for_score

router = APIRouter(prefix="/trust", tags=["trust"])


@router.get("/me", response_model=TrustScoreOut)
def get_my_trust_score(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    breakdown = {}
    if getattr(user, "trust_breakdown_json", None):
        try:
            breakdown = json.loads(user.trust_breakdown_json)
        except Exception:
            breakdown = {}

    score = int(getattr(user, "trust_score", 50) or 50)
    band = getattr(user, "trust_band", None) or trust_band_for_score(score)[0]
    guidance = breakdown.get("guidance")

    return TrustScoreOut(
        user_id=int(user.id),
        score=score,
        band=band,
        guidance=guidance,
        updated_at=getattr(user, "trust_score_updated_at", None),
        breakdown=breakdown or {"score": score, "band": band},
    )


@router.post("/me/recompute", response_model=TrustScoreOut)
def recompute_my_trust_score(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    user = recompute_and_store_trust_score(db, user=user)

    breakdown = {}
    if user.trust_breakdown_json:
        try:
            breakdown = json.loads(user.trust_breakdown_json)
        except Exception:
            breakdown = {}

    return TrustScoreOut(
        user_id=int(user.id),
        score=int(user.trust_score),
        band=getattr(user, "trust_band", None),
        guidance=breakdown.get("guidance"),
        updated_at=user.trust_score_updated_at,
        breakdown=breakdown,
    )


@router.get("/events/recent")
def recent_trust_events(
    limit: int = Query(25, ge=1, le=200),
    clan_id: Optional[int] = Query(None),
    loan_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """
    Live activity feed. Returns actor/subject emails for nicer UI.
    """
    q = db.query(TrustEvent).order_by(TrustEvent.created_at.desc())
    if clan_id is not None:
        q = q.filter(TrustEvent.clan_id == int(clan_id))
    if loan_id is not None:
        q = q.filter(TrustEvent.loan_id == int(loan_id))

    rows = q.limit(int(limit)).all()

    # collect user ids for email lookup
    user_ids = set()
    for r in rows:
        if r.actor_user_id is not None:
            user_ids.add(int(r.actor_user_id))
        if r.subject_user_id is not None:
            user_ids.add(int(r.subject_user_id))

    email_map = {}
    if user_ids:
        pairs = db.query(User.id, User.email).filter(User.id.in_(list(user_ids))).all()
        email_map = {int(uid): str(email) for uid, email in pairs if uid is not None and email is not None}

    items = []
    for r in rows:
        meta = None
        if getattr(r, "meta_json", None):
            try:
                meta = json.loads(r.meta_json)
            except Exception:
                meta = None

        actor_id = int(r.actor_user_id) if r.actor_user_id is not None else None
        subject_id = int(r.subject_user_id) if r.subject_user_id is not None else None

        items.append(
            {
                "id": int(r.id),
                "created_at": r.created_at,
                "event_type": r.event_type,
                "clan_id": r.clan_id,
                "loan_id": r.loan_id,
                "guarantor_id": r.guarantor_id,
                "actor_user_id": actor_id,
                "actor_email": email_map.get(actor_id) if actor_id is not None else None,
                "subject_user_id": subject_id,
                "subject_email": email_map.get(subject_id) if subject_id is not None else None,
                "meta": meta,
            }
        )

    return {"items": items, "total": len(items)}


@router.get("/me/latest-source")
def trust_latest_source(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = (
        db.query(TrustEvent)
        .filter(TrustEvent.event_type == "trust.score_updated")
        .filter(TrustEvent.actor_user_id == int(user.id))
        .order_by(TrustEvent.created_at.desc())
        .first()
    )

    if not row:
        return {"user_id": int(user.id), "found": False}

    meta = {}
    if getattr(row, "meta_json", None):
        try:
            meta = json.loads(row.meta_json)
        except Exception:
            meta = {}

    return {
        "user_id": int(user.id),
        "found": True,
        "created_at": row.created_at,
        "score": meta.get("score"),
        "band": meta.get("band"),
        "source": meta.get("source"),
    }


@router.get("/me/history", response_model=TrustScoreHistoryOut)
def trust_score_history(
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(120, ge=10, le=1000),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    since = datetime.now(timezone.utc) - timedelta(days=int(days))

    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.event_type == "trust.score_updated")
        .filter(TrustEvent.actor_user_id == int(user.id))
        .filter(TrustEvent.created_at >= since)
        .order_by(TrustEvent.created_at.asc())
        .limit(int(limit))
        .all()
    )

    items: list[TrustScoreHistoryPoint] = []
    for r in rows:
        meta = {}
        if getattr(r, "meta_json", None):
            try:
                meta = json.loads(r.meta_json)
            except Exception:
                meta = {}

        score = int(meta.get("score", getattr(user, "trust_score", 50) or 50))
        band = meta.get("band")
        items.append(TrustScoreHistoryPoint(created_at=r.created_at, score=score, band=band))

    return TrustScoreHistoryOut(user_id=int(user.id), days=int(days), items=items, total=len(items))


def _delta_for_event(ev_type: str, meta: dict) -> int:
    if ev_type == "repayment.made":
        return +2
    if ev_type == "loan.created":
        return +1
    if ev_type == "guarantor.requested":
        return +1
    if ev_type == "guarantor.decided":
        status = (meta.get("status") or "").lower()
        if status == "approved":
            return +2
        if status == "declined":
            return -1
        return 0
    if ev_type == "loan.auto_approved_by_guarantors":
        return +1
    if ev_type == "clan_join_via_invite":
        return +1
    return 0


def _desc_for_event(ev_type: str, meta: dict, loan_id: Optional[int]) -> str:
    if ev_type == "repayment.made":
        return f"Repayment made{f' on Loan #{loan_id}' if loan_id else ''}"
    if ev_type == "loan.created":
        return f"Created Loan #{loan_id}" if loan_id else "Created a loan"
    if ev_type == "guarantor.requested":
        return f"Requested a guarantor{f' for Loan #{loan_id}' if loan_id else ''}"
    if ev_type == "guarantor.decided":
        st = meta.get("status") or "decision"
        return f"Guarantor {st}{f' on Loan #{loan_id}' if loan_id else ''}"
    if ev_type == "loan.auto_approved_by_guarantors":
        return f"Loan #{loan_id} auto-approved by guarantors" if loan_id else "Loan auto-approved by guarantors"
    if ev_type == "clan_join_via_invite":
        return "Joined a clan via invite / onboarded someone"
    return ev_type


@router.get("/me/recent-changes", response_model=TrustChangesOut)
def trust_recent_changes(
    limit: int = Query(20, ge=5, le=200),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    relevant = [
        "repayment.made",
        "loan.created",
        "guarantor.requested",
        "guarantor.decided",
        "loan.auto_approved_by_guarantors",
        "clan_join_via_invite",
    ]

    rows = (
        db.query(TrustEvent)
        .filter((TrustEvent.actor_user_id == int(user.id)) | (TrustEvent.subject_user_id == int(user.id)))
        .filter(TrustEvent.event_type.in_(relevant))
        .order_by(TrustEvent.created_at.desc())
        .limit(int(limit))
        .all()
    )

    items: list[TrustChangeOut] = []
    for r in rows:
        meta = {}
        if getattr(r, "meta_json", None):
            try:
                meta = json.loads(r.meta_json)
            except Exception:
                meta = {}

        delta = _delta_for_event(r.event_type, meta)
        desc = _desc_for_event(r.event_type, meta, r.loan_id)

        items.append(
            TrustChangeOut(
                created_at=r.created_at,
                event_type=r.event_type,
                delta=int(delta),
                description=desc,
                loan_id=r.loan_id,
                clan_id=r.clan_id,
            )
        )

    return TrustChangesOut(user_id=int(user.id), items=items, total=len(items))
@router.get("/me/evidence-pack.pdf")
def my_trust_evidence_pack_pdf(
    redact: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    pdf_bytes = build_user_evidence_pack_pdf(db, user_id=int(user.id), redact=redact, days=30)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="GMFN_my_trust_evidence_pack.pdf"'},
    )
