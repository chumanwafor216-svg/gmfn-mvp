from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
import os
from typing import Optional, Dict, Any

from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer
from sqlalchemy.orm import Session

from app.db.models import TrustEvent
from app.services.institutional_pdf import draw_gsn_watermark, draw_institutional_footer


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


def _footer(canvas, doc, footer_text: str):
    canvas.saveState()
    draw_gsn_watermark(canvas, A4[0], A4[1])
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


def build_trust_slip_pdf(db: Session, summary: Dict[str, Any], pack_meta: Optional[Dict[str, Any]] = None) -> bytes:
    pack_id = (pack_meta or {}).get("pack_id") or "TP-UNKNOWN"
    footer_text = (pack_meta or {}).get("footer") or "Confidential / Evidence Record"
    qr_url = (pack_meta or {}).get("merchant_verify_ui_url") or f"{_public_frontend_base_url()}/trust-slips/ping"

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        title="GSN TrustSlip Evidence Snapshot",
        pagesize=A4,
        leftMargin=48,
        rightMargin=48,
        topMargin=48,
        bottomMargin=48,
    )
    elements = []

    styles = getSampleStyleSheet()

    elements.append(Paragraph("GSN TrustSlip Evidence Snapshot", styles["Heading1"]))
    elements.append(Paragraph("Global Support Network official evidence paper", styles["Normal"]))
    elements.append(Paragraph(f"Evidence Pack ID: <b>{pack_id}</b>", styles["Normal"]))
    elements.append(Spacer(1, 0.25 * inch))

    elements.append(Paragraph(f"User ID: {summary.get('user_id')}", styles["Normal"]))
    elements.append(Paragraph(f"GSN ID: {summary.get('gmfn_id')}", styles["Normal"]))
    elements.append(Paragraph(f"Lifetime Trust: {summary.get('lifetime_trust')}", styles["Normal"]))
    elements.append(Paragraph(f"Standing Score: {summary.get('standing_score')}", styles["Normal"]))
    elements.append(Paragraph(f"TrustSlip Limit: {summary.get('trust_slip_limit') or summary.get('trust_limit')}", styles["Normal"]))
    elements.append(Paragraph(f"CCI Score / Band: {summary.get('cci_score')} / {summary.get('cci_band')}", styles["Normal"]))
    elements.append(Paragraph(f"Sponsor Count: {summary.get('sponsor_count')}", styles["Normal"]))
    elements.append(Spacer(1, 0.2 * inch))

    evidence_summary = summary.get("evidence_summary", {}) or {}
    capacity_context = evidence_summary.get("capacity_context", {}) or {}
    readiness_context = evidence_summary.get("readiness_context", {}) or {}

    elements.append(Paragraph("Support & Capacity Context:", styles["Heading2"]))
    elements.append(Paragraph(f"Available Guarantee Capacity: {capacity_context.get('available_guarantee_capacity')}", styles["Normal"]))
    elements.append(Paragraph(f"Current Locked Guarantees: {capacity_context.get('current_locked_guarantees')}", styles["Normal"]))
    elements.append(Paragraph(f"Overexposure Ratio: {capacity_context.get('overexposure_ratio')}", styles["Normal"]))
    elements.append(Paragraph(f"Risk Level: {capacity_context.get('risk_level')}", styles["Normal"]))
    elements.append(Paragraph(f"Readiness Recommendation: {readiness_context.get('recommendation')}", styles["Normal"]))
    elements.append(Paragraph(f"Readiness Score: {readiness_context.get('readiness_score')}", styles["Normal"]))
    elements.append(Paragraph(f"Estimated Guarantee Gap: {readiness_context.get('estimated_guarantee_gap')}", styles["Normal"]))
    elements.append(Paragraph(f"Capacity Ratio: {readiness_context.get('capacity_ratio')}", styles["Normal"]))
    elements.append(Spacer(1, 0.2 * inch))

    elements.append(Paragraph("Recent Repayment Activity:", styles["Heading2"]))
    elements.append(Paragraph(f"Last Full Repayment: {summary.get('last_full_repayment_at')}", styles["Normal"]))
    elements.append(Paragraph(f"Days Since Last Repayment: {summary.get('days_since_last_full_repayment')}", styles["Normal"]))

    user_id = int(summary.get("user_id") or 0)
    event = _find_latest_full_repayment_event(db, user_id)

    payment_reference = None
    confirmed_by = None
    confirmed_at = None
    loan_id = None

    if event:
        confirmed_at = event.created_at.isoformat() if event.created_at else None
        confirmed_by = event.actor_user_id
        loan_id = event.loan_id
        try:
            meta = getattr(event, "meta", None) or {}
            if not isinstance(meta, dict):
                meta = {}
            payment_reference = meta.get("payment_reference")
        except Exception:
            payment_reference = None

    elements.append(Spacer(1, 0.15 * inch))
    elements.append(Paragraph(f"Loan ID: {loan_id}", styles["Normal"]))
    elements.append(Paragraph(f"Payment Reference: {payment_reference}", styles["Normal"]))
    elements.append(Paragraph(f"Confirmed At: {confirmed_at}", styles["Normal"]))
    elements.append(Paragraph(f"Confirmed By (Actor ID): {confirmed_by}", styles["Normal"]))
    elements.append(Spacer(1, 0.25 * inch))

    elements.append(Paragraph("Merchant verification (QR):", styles["Heading2"]))
    elements.append(Paragraph("Scan to open merchant verification view.", styles["Normal"]))
    elements.append(Spacer(1, 0.1 * inch))
    elements.append(_qr_block(str(qr_url)))
    elements.append(Spacer(1, 0.25 * inch))

    elements.append(Paragraph("Trust Breakdown:", styles["Heading2"]))

    breakdown = summary.get("counts", {}) or summary.get("breakdown", {}) or {}
    breakdown_items = [
        f"Full Repayments: {breakdown.get('full_repayments') or breakdown.get('loan_repaid') or 0}",
        f"Guarantor Success: {breakdown.get('guarantor_success') or breakdown.get('guarantor_approved') or 0}",
        f"Missed Payments: {breakdown.get('missed_payments') or breakdown.get('missed_payment') or 0}",
        f"Defaults: {breakdown.get('defaults') or breakdown.get('default') or 0}",
        f"Fraud Flags: {breakdown.get('fraud_flags') or breakdown.get('fraud') or 0}",
    ]

    elements.append(
        ListFlowable(
            [ListItem(Paragraph(item, styles["Normal"])) for item in breakdown_items],
            bulletType="bullet",
        )
    )

    risk_flags = list(summary.get("risk_flags", []) or [])
    if risk_flags:
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(Paragraph("Current Risk Flags:", styles["Heading2"]))
        elements.append(
            ListFlowable(
                [ListItem(Paragraph(str(item), styles["Normal"])) for item in risk_flags],
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
    elements.append(Paragraph(f"Generated at (UTC): {datetime.now(timezone.utc).isoformat()}", styles["Normal"]))

    doc.build(
        elements,
        onFirstPage=lambda c, d: _footer(c, d, footer_text),
        onLaterPages=lambda c, d: _footer(c, d, footer_text),
    )
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
