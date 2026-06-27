from __future__ import annotations

from io import BytesIO
import os
from typing import Optional, Dict, Any
from xml.sax.saxutils import escape

from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer
from sqlalchemy.orm import Session

from app.db.models import TrustEvent
from app.services.institutional_pdf import (
    draw_institutional_footer,
    draw_institutional_header,
    safe_pdf_text,
    utc_generated_label,
)


CANONICAL_REPAYMENT_EVENTS = {"loan_repaid"}
LEGACY_REPAYMENT_EVENTS = {
    "loan_fully_repaid",
    "repaid",
    "repayment_full",
    "full_repayment",
    "loan_repayment_completed",
}

PUBLIC_FRONTEND_ORIGIN = "https://gmfn-frontend.onrender.com"


def _public_frontend_base_url() -> str:
    for key in ("FRONTEND_BASE_URL", "GMFN_FRONTEND_BASE_URL", "PUBLIC_FRONTEND_URL"):
        raw = str(os.getenv(key) or "").strip().rstrip("/")
        if raw:
            return raw
    return PUBLIC_FRONTEND_ORIGIN


def _find_latest_full_repayment_event(db: Session, user_id: int) -> Optional[TrustEvent]:
    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(100)
        .all()
    )

    canonical_match: Optional[TrustEvent] = None
    legacy_match: Optional[TrustEvent] = None

    for row in rows:
        event_type = str(getattr(row, "event_type", "") or "").lower()
        if event_type in CANONICAL_REPAYMENT_EVENTS:
            canonical_match = row
            break
        if legacy_match is None and event_type in LEGACY_REPAYMENT_EVENTS:
            legacy_match = row

    return canonical_match or legacy_match


def _page_shell(canvas, doc, footer_text: str, generated_at: str, pack_id: str):
    canvas.saveState()
    draw_institutional_header(
        canvas,
        A4[0],
        A4[1],
        title="GSN TrustSlip Evidence Snapshot",
        subtitle="Portable current trust evidence for careful reader judgement.",
        generated_at=generated_at,
        reference=pack_id,
    )
    draw_institutional_footer(canvas, A4[0], footer_text)
    canvas.restoreState()


def _qr_block(url: str) -> Drawing:
    q = qr.QrCodeWidget(url)
    bounds = q.getBounds()
    w = bounds[2] - bounds[0]
    h = bounds[3] - bounds[1]
    d = Drawing(72, 72, transform=[72.0 / w, 0, 0, 72.0 / h, 0, 0])
    d.add(q)
    return d


def _pdf_value(value: Any, fallback: str = "-") -> str:
    return escape(safe_pdf_text(value, fallback=fallback))


def _paragraph(label: str, value: Any, styles: Any):
    return Paragraph(f"{escape(label)}: {_pdf_value(value)}", styles["Normal"])


def _fallback_pack_id(generated_at: str) -> str:
    token = "".join(ch for ch in safe_pdf_text(generated_at) if ch.isdigit())
    suffix = token[:12] if token else "PENDING"
    return f"GSN-PACK-TRUSTSLIP-{suffix}"


def build_trust_slip_pdf(db: Session, summary: Dict[str, Any], pack_meta: Optional[Dict[str, Any]] = None) -> bytes:
    footer_text = (pack_meta or {}).get("footer") or "Confidential / Evidence Record"
    qr_url = (pack_meta or {}).get("merchant_verify_ui_url") or f"{_public_frontend_base_url()}/trust-slips/ping"
    generated_at = utc_generated_label()
    pack_id = (pack_meta or {}).get("pack_id") or _fallback_pack_id(generated_at)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        title="GSN TrustSlip Evidence Snapshot",
        pagesize=A4,
        leftMargin=48,
        rightMargin=48,
        topMargin=162,
        bottomMargin=48,
    )
    elements = []

    styles = getSampleStyleSheet()

    elements.append(Paragraph("Official evidence summary", styles["Heading1"]))
    elements.append(Paragraph("Global Support Network official evidence paper", styles["Normal"]))
    elements.append(Paragraph(f"Evidence Pack ID: <b>{_pdf_value(pack_id)}</b>", styles["Normal"]))
    elements.append(Paragraph(f"Generated at (UTC): {_pdf_value(generated_at)}", styles["Normal"]))
    elements.append(Spacer(1, 0.25 * inch))

    elements.append(_paragraph("Private member reference", "redacted for TrustSlip evidence paper", styles))
    elements.append(_paragraph("GSN ID", summary.get("gmfn_id"), styles))
    elements.append(_paragraph("Lifetime Trust", summary.get("lifetime_trust"), styles))
    elements.append(_paragraph("Standing Score", summary.get("standing_score"), styles))
    elements.append(
        _paragraph(
            "Trust-limit signal",
            summary.get("trust_slip_limit") or summary.get("trust_limit"),
            styles,
        )
    )
    elements.append(
        _paragraph(
            "CCI Score / Band",
            f"{safe_pdf_text(summary.get('cci_score'))} / {safe_pdf_text(summary.get('cci_band'))}",
            styles,
        )
    )
    elements.append(_paragraph("Sponsor Count", summary.get("sponsor_count"), styles))
    elements.append(Spacer(1, 0.2 * inch))

    evidence_summary = summary.get("evidence_summary", {}) or {}
    capacity_context = evidence_summary.get("capacity_context", {}) or {}
    readiness_context = evidence_summary.get("readiness_context", {}) or {}

    elements.append(Paragraph("Support & capacity context", styles["Heading2"]))
    elements.append(_paragraph("Available support capacity", capacity_context.get("available_guarantee_capacity"), styles))
    elements.append(_paragraph("Current locked support", capacity_context.get("current_locked_guarantees"), styles))
    elements.append(_paragraph("Overexposure ratio", capacity_context.get("overexposure_ratio"), styles))
    elements.append(_paragraph("Risk level", capacity_context.get("risk_level"), styles))
    elements.append(_paragraph("Readiness recommendation", readiness_context.get("recommendation"), styles))
    elements.append(_paragraph("Readiness score", readiness_context.get("readiness_score"), styles))
    elements.append(_paragraph("Estimated support gap", readiness_context.get("estimated_guarantee_gap"), styles))
    elements.append(_paragraph("Capacity ratio", readiness_context.get("capacity_ratio"), styles))
    elements.append(Spacer(1, 0.2 * inch))

    elements.append(Paragraph("Recent repayment activity", styles["Heading2"]))
    elements.append(_paragraph("Last full repayment", summary.get("last_full_repayment_at"), styles))
    elements.append(_paragraph("Days since last repayment", summary.get("days_since_last_full_repayment"), styles))

    user_id = int(summary.get("user_id") or 0)
    event = _find_latest_full_repayment_event(db, user_id)

    confirmation_source = None
    confirmed_at = None
    support_record = None

    if event:
        confirmed_at = event.created_at.isoformat() if event.created_at else None
        confirmation_source = "GSN recorded trust event"
        support_record = "Private support record"

    elements.append(Spacer(1, 0.15 * inch))
    elements.append(_paragraph("Support record", support_record, styles))
    elements.append(_paragraph("Reconciliation reference", "private operational detail redacted", styles))
    elements.append(_paragraph("Confirmed at", confirmed_at, styles))
    elements.append(_paragraph("Confirmation source", confirmation_source, styles))
    elements.append(Spacer(1, 0.25 * inch))

    elements.append(Paragraph("Merchant verification QR", styles["Heading2"]))
    elements.append(Paragraph("Scan to open merchant verification view.", styles["Normal"]))
    elements.append(Spacer(1, 0.1 * inch))
    elements.append(_qr_block(str(qr_url)))
    elements.append(Spacer(1, 0.25 * inch))

    elements.append(Paragraph("Trust breakdown", styles["Heading2"]))

    breakdown = summary.get("counts", {}) or summary.get("breakdown", {}) or {}
    breakdown_items = [
        f"Full Repayments: {breakdown.get('full_repayments') or breakdown.get('loan_repaid') or 0}",
        f"Support Success: {breakdown.get('guarantor_success') or breakdown.get('guarantor_approved') or 0}",
        f"Missed Payments: {breakdown.get('missed_payments') or breakdown.get('missed_payment') or 0}",
        f"Defaults: {breakdown.get('defaults') or breakdown.get('default') or 0}",
        f"Fraud Flags: {breakdown.get('fraud_flags') or breakdown.get('fraud') or 0}",
    ]

    elements.append(
        ListFlowable(
            [ListItem(Paragraph(_pdf_value(item), styles["Normal"])) for item in breakdown_items],
            bulletType="bullet",
        )
    )

    risk_flags = list(summary.get("risk_flags", []) or [])
    if risk_flags:
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(Paragraph("Current Risk Flags:", styles["Heading2"]))
        elements.append(
            ListFlowable(
                [ListItem(Paragraph(_pdf_value(item), styles["Normal"])) for item in risk_flags],
                bulletType="bullet",
            )
        )

    elements.append(Spacer(1, 0.25 * inch))
    elements.append(
        Paragraph(
            "Disclaimer: This TrustSlip is a community-backed integrity signal. "
            "It is not a bank guarantee, credit approval, payment instruction, or automatic debit authority.",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 0.15 * inch))

    doc.build(
        elements,
        onFirstPage=lambda c, d: _page_shell(c, d, footer_text, generated_at, pack_id),
        onLaterPages=lambda c, d: _page_shell(c, d, footer_text, generated_at, pack_id),
    )
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
