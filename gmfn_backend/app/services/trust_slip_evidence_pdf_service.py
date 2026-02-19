# app/services/trust_slip_evidence_pdf_service.py
from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from typing import Optional, Dict, Any

from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing

from app.db.models import TrustEvent
from sqlalchemy.orm import Session


def _find_latest_full_repayment_event(db: Session, user_id: int) -> Optional[TrustEvent]:
    return (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == user_id)
        .filter(TrustEvent.event_type == "loan_fully_repaid")
        .order_by(TrustEvent.created_at.desc())
        .first()
    )


def _footer(canvas, doc, footer_text: str):
    canvas.saveState()
    canvas.setFont("Helvetica", 9)
    canvas.drawString(48, 24, footer_text)
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
    """
    Generates TrustSlip Evidence PDF from summary payload.
    Phase 3: includes Pack ID + Confidential footer + QR (merchant verify UI).
    """

    pack_id = (pack_meta or {}).get("pack_id") or "TP-UNKNOWN"
    footer_text = (pack_meta or {}).get("footer") or "Confidential / Pilot Version"
    qr_url = (pack_meta or {}).get("merchant_verify_ui_url") or "http://127.0.0.1:8000/trust-slips/ping"

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        title="GMFN TrustSlip Evidence Snapshot",
        leftMargin=48,
        rightMargin=48,
        topMargin=48,
        bottomMargin=48,
    )
    elements = []

    styles = getSampleStyleSheet()

    elements.append(Paragraph("GMFN TrustSlip Evidence Snapshot", styles["Heading1"]))
    elements.append(Paragraph(f"Evidence Pack ID: <b>{pack_id}</b>", styles["Normal"]))
    elements.append(Spacer(1, 0.25 * inch))

    elements.append(Paragraph(f"User ID: {summary.get('user_id')}", styles["Normal"]))
    elements.append(Paragraph(f"Lifetime Trust: {summary.get('lifetime_trust')}", styles["Normal"]))
    elements.append(Paragraph(f"Standing Score: {summary.get('standing_score')}", styles["Normal"]))
    elements.append(Paragraph(f"TrustSlip Limit: {summary.get('trust_slip_limit')}", styles["Normal"]))
    elements.append(Spacer(1, 0.2 * inch))

    elements.append(Paragraph("Recent Repayment Activity:", styles["Heading2"]))
    elements.append(Paragraph(f"Last Full Repayment: {summary.get('last_full_repayment_at')}", styles["Normal"]))
    elements.append(Paragraph(f"Days Since Last Repayment: {summary.get('days_since_last_full_repayment')}", styles["Normal"]))

    # Fetch payment reference from TrustEvent meta
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
            import json as _json
            meta = _json.loads(event.meta_json) if event.meta_json else {}
            payment_reference = meta.get("payment_reference")
        except Exception:
            payment_reference = None

    elements.append(Spacer(1, 0.15 * inch))
    elements.append(Paragraph(f"Loan ID: {loan_id}", styles["Normal"]))
    elements.append(Paragraph(f"Payment Reference: {payment_reference}", styles["Normal"]))
    elements.append(Paragraph(f"Confirmed At: {confirmed_at}", styles["Normal"]))
    elements.append(Paragraph(f"Confirmed By (Admin ID): {confirmed_by}", styles["Normal"]))
    elements.append(Spacer(1, 0.25 * inch))

    elements.append(Paragraph("Merchant verification (QR):", styles["Heading2"]))
    elements.append(Paragraph("Scan to open merchant verification view.", styles["Normal"]))
    elements.append(Spacer(1, 0.1 * inch))
    elements.append(_qr_block(str(qr_url)))
    elements.append(Spacer(1, 0.25 * inch))

    elements.append(Paragraph("Trust Breakdown:", styles["Heading2"]))

    breakdown = summary.get("counts", {}) or summary.get("breakdown", {}) or {}
    breakdown_items = [
        f"Full Repayments: {breakdown.get('full_repayments')}",
        f"Guarantor Success: {breakdown.get('guarantor_success')}",
        f"Missed Payments: {breakdown.get('missed_payments')}",
        f"Defaults: {breakdown.get('defaults')}",
        f"Fraud Flags: {breakdown.get('fraud_flags')}",
    ]

    elements.append(
        ListFlowable(
            [ListItem(Paragraph(item, styles["Normal"])) for item in breakdown_items],
            bulletType="bullet",
        )
    )

    elements.append(Spacer(1, 0.25 * inch))
    elements.append(
        Paragraph(
            "Disclaimer: This TrustSlip is a community-backed integrity limit. "
            "It is not a bank guarantee and does not auto-debit any guarantor.",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 0.15 * inch))
    elements.append(Paragraph(f"Generated at (UTC): {datetime.now(timezone.utc).isoformat()}", styles["Normal"]))

    doc.build(elements, onFirstPage=lambda c, d: _footer(c, d, footer_text), onLaterPages=lambda c, d: _footer(c, d, footer_text))
    pdf = buffer.getvalue()
    buffer.close()
    return pdf