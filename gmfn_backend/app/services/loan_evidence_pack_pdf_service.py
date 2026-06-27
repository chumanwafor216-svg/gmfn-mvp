from __future__ import annotations

import json
from datetime import datetime, timezone
from io import BytesIO
from typing import Optional, Any

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.db.models import Loan, Clan, User, LoanGuarantor, Repayment, TrustEvent
from app.services.institutional_pdf import (
    draw_institutional_footer,
    draw_institutional_header,
    safe_pdf_text,
    utc_generated_label,
)
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

    # -------------------------
    # Build PDF
    # -------------------------
    bio = BytesIO()
    c = canvas.Canvas(bio, pagesize=A4)
    width, height = A4
    ts = utc_generated_label()
    y = draw_institutional_header(
        c,
        width,
        height,
        title="GSN Loan Evidence Pack",
        subtitle="Loan, trust snapshot, supporter, repayment, and timeline evidence.",
        generated_at=ts,
        reference=f"Loan {loan_id}",
    )

    def line(text: str, size: int = 11, gap: int = 16, bold: bool = False):
        nonlocal y
        if y < 60:
            draw_institutional_footer(c, width, "GSN loan evidence paper")
            c.showPage()
            y = draw_institutional_header(
                c,
                width,
                height,
                title="GSN Loan Evidence Pack",
                subtitle="Loan, trust snapshot, supporter, repayment, and timeline evidence.",
                generated_at=ts,
                reference=f"Loan {loan_id}",
            )
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        c.drawString(56, y, safe_pdf_text(text))
        y -= gap

    def kv(label: str, value: str):
        line(f"{label}: {value}", size=10, gap=14)

    line("Official evidence summary", size=14, gap=20, bold=True)
    kv("Generated", ts)
    kv("Loan ID", str(loan_id))
    kv("Community", clan_name or "-")
    kv("Borrower", borrower_reference)
    kv("Redaction", "ON (member references redacted)" if redact else "OFF (authorized complete-record contact)")
    line("")

    # Trust Snapshot
    line("Trust Snapshot (Explainable)", bold=True)
    kv("Borrower score", str(borrower_trust.get("score")) if borrower_trust.get("score") is not None else "-")
    kv("Borrower band", borrower_trust.get("band") or "-")
    if borrower_trust.get("updated_at"):
        kv("Borrower trust updated", str(borrower_trust.get("updated_at")))
    else:
        kv("Borrower trust updated", "-")

    if guarantor_trust_rows:
        line("Supporter trust (stored + fallback compute)", size=10, gap=14, bold=True)
        for r in guarantor_trust_rows[:12]:
            line(
                f"- {r['member_reference']} | score={r['score'] if r['score'] is not None else '-'} | band={r['band'] or '-'}",
                size=9,
                gap=13,
            )
    else:
        line("- No supporters yet", size=10, gap=14)

    line("")

    # Loan summary
    line("Loan summary", bold=True)
    kv("Status", str(getattr(loan, "status", "-")))
    kv("Amount", str(getattr(loan, "amount", getattr(loan, "principal_amount", "-"))))
    kv("Created", str(getattr(loan, "created_at", "-")))
    kv("Due date", str(getattr(loan, "due_date", "-")))
    line("")

    # Supporters list
    line("Supporters (decisions)", bold=True)
    if not guarantors:
        line("- None", size=10, gap=14)
    else:
        for g in guarantors:
            gid = getattr(g, "guarantor_user_id", None)
            gmember = member_reference(gid)
            status = getattr(g, "status", "-")
            responded_at = getattr(g, "responded_at", None)
            expires_at = getattr(g, "expires_at", None)

            txt = f"- {gmember} | status={status}"
            if responded_at:
                txt += f" | responded={responded_at}"
            if expires_at:
                txt += f" | expires={expires_at}"
            line(txt, size=9, gap=13)

    line("")

    # Repayments
    line("Repayments", bold=True)
    if not repayments:
        line("- None", size=10, gap=14)
    else:
        for r in repayments[:60]:
            payer_id = getattr(r, "payer_user_id", None)
            payer_member = member_reference(payer_id)
            amount = getattr(r, "amount", "-")
            created_at = getattr(r, "created_at", "-")
            line(f"- {created_at} | payer={payer_member} | amount={amount}", size=9, gap=13)
        if len(repayments) > 60:
            line(f"... ({len(repayments)-60} more not shown)", size=9, gap=13)

    line("")

    # Trust timeline
    line("Trust timeline (events linked to this loan)", bold=True)
    if not trust_events:
        line("- None", size=10, gap=14)
    else:
        for ev in trust_events[:90]:
            created_at = getattr(ev, "created_at", "-")
            etype = getattr(ev, "event_type", "-")
            actor_id = getattr(ev, "actor_user_id", None)
            subject_id = getattr(ev, "subject_user_id", None)
            actor_member = member_reference(actor_id)
            subject_member = member_reference(subject_id)
            meta = _loads_meta(getattr(ev, "meta_json", None))

            meta_small = ""
            if meta and redact:
                meta_small = " | meta: redacted for share copy"
            elif meta:
                keys = list(meta.keys())[:3]
                meta_small = " | meta: " + ", ".join([f"{k}={meta.get(k)}" for k in keys])

            line(
                f"- {created_at} | {etype} | actor={actor_member} | subject={subject_member}{meta_small}",
                size=8,
                gap=12,
            )
        if len(trust_events) > 90:
            line(f"... ({len(trust_events)-90} more not shown)", size=8, gap=12)

    line("")
    line("Reader boundary", bold=True, gap=18)
    line(
        "This paper supports a trust decision. It is not a bank guarantee, credit approval, payment instruction, or automatic debit authority.",
        size=9,
        gap=13,
    )
    line(
        "Use the redacted share copy for outside review. Use the complete record only when the reviewer is allowed to see private loan, supporter, and repayment details.",
        size=9,
        gap=13,
    )

    draw_institutional_footer(c, width, "GSN loan evidence paper - controlled community trust record.")
    c.showPage()
    c.save()

    pdf_bytes = bio.getvalue()
    bio.close()
    return pdf_bytes
