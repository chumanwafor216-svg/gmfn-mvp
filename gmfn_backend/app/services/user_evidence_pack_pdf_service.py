from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from io import BytesIO
from typing import Any, Optional

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.db.models import User, TrustEvent
from app.services.institutional_pdf import (
    draw_institutional_footer,
    draw_institutional_header,
    safe_pdf_text,
    utc_generated_label,
    wrap_pdf_text_lines,
)
from app.services.trust_score_service import compute_trust_score_explained, trust_band_for_score


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _loads_meta(meta_json: Optional[str]) -> dict[str, Any]:
    if not meta_json:
        return {}
    try:
        return json.loads(meta_json)
    except Exception:
        return {}


def _member_contact_boundary() -> str:
    return "redacted for member evidence paper"


def build_user_evidence_pack_pdf(
    db: Session,
    *,
    user_id: int,
    redact: bool = True,
    days: int = 30,
) -> bytes:
    user = db.get(User, user_id)
    if not user:
        raise ValueError("User not found")

    gsn_id = getattr(user, "gmfn_id", None) or "GSN member reference unavailable"

    # trust snapshot (stored + fallback compute)
    score = getattr(user, "trust_score", None)
    band = getattr(user, "trust_band", None)
    updated_at = getattr(user, "trust_score_updated_at", None)
    breakdown = {}
    if getattr(user, "trust_breakdown_json", None):
        try:
            breakdown = json.loads(user.trust_breakdown_json)
        except Exception:
            breakdown = {}

    if score is None:
        computed = compute_trust_score_explained(db, user_id=int(user.id))
        score = computed.get("score", 50)
        breakdown = computed.get("breakdown") or breakdown
    score = int(score or 50)
    if band is None:
        band = trust_band_for_score(score)[0]

    # recent trust-relevant events
    since = _utcnow() - timedelta(days=int(days))
    relevant = [
        "loan.created",
        "guarantor.requested",
        "guarantor.decided",
        "repayment.made",
        "loan.auto_approved_by_guarantors",
        "clan_join_via_invite",
        "trust.score_updated",
    ]

    rows = (
        db.query(TrustEvent)
        .filter((TrustEvent.actor_user_id == int(user.id)) | (TrustEvent.subject_user_id == int(user.id)))
        .filter(TrustEvent.created_at >= since)
        .filter(TrustEvent.event_type.in_(relevant))
        .order_by(TrustEvent.created_at.desc())
        .limit(50)
        .all()
    )

    bio = BytesIO()
    c = canvas.Canvas(bio, pagesize=A4)
    width, height = A4
    ts = utc_generated_label()
    y = draw_institutional_header(
        c,
        width,
        height,
        title="GSN Member Evidence Pack",
        subtitle="Trust snapshot and recent evidence from the member record.",
        generated_at=ts,
        reference="GSN member evidence",
    )
    content_left = 56
    content_width = width - (content_left * 2)

    def line(text: str, size: int = 11, gap: int = 16, bold: bool = False):
        nonlocal y
        if not str(text if text is not None else "").strip():
            y -= gap
            return

        font_name = "Helvetica-Bold" if bold else "Helvetica"
        for wrapped_line in wrap_pdf_text_lines(text, font_name, size, content_width):
            if y < 60:
                draw_institutional_footer(c, width, "GSN member evidence paper")
                c.showPage()
                y = draw_institutional_header(
                    c,
                    width,
                    height,
                    title="GSN Member Evidence Pack",
                    subtitle="Trust snapshot and recent evidence from the member record.",
                    generated_at=ts,
                    reference="GSN member evidence",
                )
            c.setFont(font_name, size)
            c.drawString(content_left, y, safe_pdf_text(wrapped_line))
            y -= gap

    line("Official evidence summary", size=14, gap=20, bold=True)
    line(f"Generated: {ts}", size=10, gap=14)
    line(f"GSN ID: {gsn_id}", size=10, gap=14)
    line(f"Private member reference: {_member_contact_boundary()}", size=10, gap=14)
    line(f"Private contact: {_member_contact_boundary()}", size=10, gap=14)
    line("Redaction: ON (member share paper)", size=10, gap=14)
    line("")

    line("Trust Snapshot (Explainable)", bold=True)
    line(f"Score: {score} / 100", size=10, gap=14)
    line(f"Band: {band}", size=10, gap=14)
    line(f"Updated at: {updated_at or '-'}", size=10, gap=14)
    line("")

    line("Breakdown (summary)", bold=True)
    # keep short
    for k in ["invite", "guarantor", "repayment", "participation", "penalties"]:
        if k in breakdown:
            line(f"- {k}: {breakdown.get(k)}", size=10, gap=14)
    line("")

    line(f"Recent trust events (last {days} days)", bold=True)
    if not rows:
        line("- None yet", size=10, gap=14)
    else:
        for r in rows:
            meta = _loads_meta(getattr(r, "meta_json", None))
            when = str(getattr(r, "created_at", "-"))
            et = getattr(r, "event_type", "-")
            loan_id = getattr(r, "loan_id", None)
            src = meta.get("source")
            extra = []
            if loan_id:
                extra.append("support record=private operational detail redacted")
            if src:
                extra.append("source=GSN member record")
            tail = f" ({', '.join(extra)})" if extra else ""
            line(f"- {when} | {et}{tail}", size=8, gap=12)

    line("")
    line("Reader boundary", bold=True, gap=18)
    line(
        "This paper supports a trust decision. It is not a bank guarantee, credit approval, payment instruction, or automatic debit authority.",
        size=9,
        gap=13,
    )
    line(
        "Use the redacted share copy for outside review. Use the complete record only when the reviewer is allowed to see private member evidence.",
        size=9,
        gap=13,
    )

    draw_institutional_footer(c, width, "GSN member evidence paper - controlled community trust record.")
    c.showPage()
    c.save()

    out = bio.getvalue()
    bio.close()
    return out
