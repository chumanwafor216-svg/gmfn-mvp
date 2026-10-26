from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional, Any

from sqlalchemy.orm import Session

from app.db.models import Loan, Clan, User, LoanGuarantor, Repayment, TrustEvent
from app.services.institutional_pdf import utc_generated_label
from app.services.loan_evidence_pack_pdf_layout import build_support_evidence_document
from app.services.trust_score_service import trust_band_for_score, compute_trust_score_explained


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _loads_meta(meta_json: Optional[str]) -> dict[str, Any]:
    if not meta_json:
        return {}
    try:
        return json.loads(meta_json)
    except Exception:
        return {}


def _private_member_boundary() -> str:
    return "private member reference redacted"


def _get_user_trust_snapshot(db: Session, user: Optional[User]) -> dict[str, Any]:
    """
    C1: Stored-only + fallback compute (no DB write).
    Returns: {score, band, updated_at, breakdown}
    """
    if not user:
        return {"score": None, "band": None, "updated_at": None, "breakdown": {}}

    score = getattr(user, "trust_score", None)
    band = getattr(user, "trust_band", None)
    updated_at = getattr(user, "trust_score_updated_at", None)
    breakdown_json = getattr(user, "trust_breakdown_json", None)

    breakdown: dict[str, Any] = {}
    if breakdown_json:
        try:
            breakdown = json.loads(breakdown_json)
        except Exception:
            breakdown = {}

    # fallback compute if missing
    if score is None:
        computed = compute_trust_score_explained(db, user_id=int(user.id))
        score = computed.get("score")
        breakdown = computed.get("breakdown") or breakdown
        band = band or trust_band_for_score(int(score) if score is not None else 50)[0]

    if band is None and score is not None:
        band = trust_band_for_score(int(score))[0]

    return {
        "score": int(score) if score is not None else None,
        "band": band,
        "updated_at": updated_at,
        "breakdown": breakdown or {},
    }


def build_loan_evidence_pack_pdf(
    db: Session,
    *,
    loan_id: int,
    redact: bool = True,
    trust_limit: int = 200,
    repayments_limit: int = 200,
) -> bytes:
    loan = db.get(Loan, loan_id)
    if not loan:
        raise ValueError("Loan not found")

    clan = db.get(Clan, getattr(loan, "clan_id", None))
    clan_name = getattr(clan, "name", None) if clan else None
    community_reference = getattr(clan, "community_code", None) or f"GSN-C-{int(getattr(loan, 'clan_id', 0) or 0):06d}"
    support_reference = f"GSN-SUPPORT-{int(loan_id):06d}"

    borrower_user_id = getattr(loan, "borrower_user_id", None)
    borrower: Optional[User] = db.get(User, borrower_user_id) if borrower_user_id is not None else None
    borrower_email: Optional[str] = getattr(borrower, "email", None) if borrower else None

    # Guarantors
    guarantors = (
        db.query(LoanGuarantor)
        .filter(LoanGuarantor.loan_id == loan_id)
        .order_by(LoanGuarantor.id.asc())
        .all()
    )

    # Repayments
    repayments = (
        db.query(Repayment)
        .filter(Repayment.loan_id == loan_id)
        .order_by(Repayment.created_at.asc())
        .limit(repayments_limit)
        .all()
    )

    # Trust events for this loan
    trust_events = (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == loan_id)
        .order_by(TrustEvent.created_at.asc())
        .limit(trust_limit)
        .all()
    )

    # Collect user IDs for email lookup
    user_ids: set[int] = set()
    if isinstance(borrower_user_id, int):
        user_ids.add(borrower_user_id)

    for g in guarantors:
        gid = getattr(g, "guarantor_user_id", None)
        if isinstance(gid, int):
            user_ids.add(gid)

    for r in repayments:
        pid = getattr(r, "payer_user_id", None)
        if isinstance(pid, int):
            user_ids.add(pid)

    for ev in trust_events:
        a = getattr(ev, "actor_user_id", None)
        s = getattr(ev, "subject_user_id", None)
        if isinstance(a, int):
            user_ids.add(a)
        if isinstance(s, int):
            user_ids.add(s)

    email_map: dict[int, str] = {}
    gsn_id_map: dict[int, str] = {}
    if user_ids:
        rows = db.query(User.id, User.email, User.gmfn_id).filter(User.id.in_(list(user_ids))).all()
        email_map = {int(uid): str(email) for uid, email, _ in rows if uid is not None and email is not None}
        gsn_id_map = {int(uid): str(gsn_id) for uid, _, gsn_id in rows if uid is not None and gsn_id is not None}

    def member_reference(uid: Optional[int], fallback: Optional[str] = None) -> str:
        email = fallback or (email_map.get(uid) if isinstance(uid, int) else None)
        gsn_id = gsn_id_map.get(uid) if isinstance(uid, int) else None
        if redact:
            return gsn_id or _private_member_boundary()
        return email or gsn_id or _private_member_boundary()

    borrower_reference = member_reference(borrower_user_id, borrower_email)

    # -------------------------
    # C1: Trust Snapshot section (borrower + guarantors)
    # -------------------------
    borrower_trust = _get_user_trust_snapshot(db, borrower)

    guarantor_users: dict[int, User] = {}
    for g in guarantors:
        gid = getattr(g, "guarantor_user_id", None)
        if isinstance(gid, int) and gid not in guarantor_users:
            u = db.get(User, gid)
            if u:
                guarantor_users[gid] = u

    guarantor_trust_rows: list[dict[str, Any]] = []
    for gid, gu in guarantor_users.items():
        snap = _get_user_trust_snapshot(db, gu)
        guarantor_trust_rows.append(
            {
                "user_id": gid,
                "member_reference": member_reference(gid),
                "score": snap["score"],
                "band": snap["band"],
                "updated_at": snap["updated_at"],
            }
        )

    trust_by_user_id = {int(row["user_id"]): row for row in guarantor_trust_rows}
    supporter_rows = []
    for guarantor in guarantors:
        guarantor_user_id = getattr(guarantor, "guarantor_user_id", None)
        trust = trust_by_user_id.get(int(guarantor_user_id), {}) if isinstance(guarantor_user_id, int) else {}
        supporter_rows.append(
            {
                "member_reference": member_reference(guarantor_user_id),
                "status": getattr(guarantor, "status", None),
                "pledge_amount": getattr(guarantor, "pledge_amount", 0),
                "score": trust.get("score"),
                "band": trust.get("band"),
            }
        )

    repayment_rows = [
        {
            "created_at": getattr(repayment, "created_at", None),
            "payer_reference": member_reference(getattr(repayment, "payer_user_id", None)),
            "amount": getattr(repayment, "amount", 0),
        }
        for repayment in repayments
    ]

    timeline_rows = []
    for event in trust_events:
        actor = member_reference(getattr(event, "actor_user_id", None))
        subject = member_reference(getattr(event, "subject_user_id", None))
        timeline_rows.append(
            {
                "created_at": getattr(event, "created_at", None),
                "event_type": getattr(event, "event_type", None),
                "participants": actor if actor == subject else f"{actor} / {subject}",
                "has_metadata": bool(_loads_meta(getattr(event, "meta_json", None))),
            }
        )

    return build_support_evidence_document(
        support_reference=support_reference,
        community_name=clan_name or "Not shown",
        community_reference=community_reference,
        requester_reference=borrower_reference,
        requester_trust=borrower_trust,
        status=str(getattr(loan, "status", "not shown") or "not shown"),
        amount=getattr(loan, "amount", 0),
        currency=str(getattr(loan, "currency", "NGN") or "NGN"),
        support_gap=getattr(loan, "guarantee_gap", 0),
        supporters_required=int(getattr(loan, "guarantors_required", 0) or 0),
        supporters=supporter_rows,
        repayments=repayment_rows,
        timeline=timeline_rows,
        redact=bool(redact),
        generated_at=utc_generated_label(),
    )
