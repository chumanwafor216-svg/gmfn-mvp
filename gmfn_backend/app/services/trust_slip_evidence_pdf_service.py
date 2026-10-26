from __future__ import annotations

from decimal import Decimal, InvalidOperation
import hashlib
from io import BytesIO
import os
from typing import Any, Dict, Optional
from urllib.parse import quote
from xml.sax.saxutils import escape

from reportlab.graphics.barcode import qr
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from app.db.models import TrustEvent
from app.services.evidence_lifecycle_service import resolve_trust_event_lifecycle
from app.services.institutional_pdf import (
    GSN_BLUE,
    GSN_BORDER,
    GSN_GOLD,
    GSN_MUTED,
    GSN_NAVY,
    draw_institutional_footer,
    draw_institutional_header,
    safe_pdf_text,
    utc_generated_label,
)


CANONICAL_REPAYMENT_EVENTS = {"loan_repaid", "loan.repaid"}
LEGACY_REPAYMENT_EVENTS = {
    "loan_fully_repaid",
    "repaid",
    "repayment_full",
    "full_repayment",
    "loan_repayment_completed",
}

PUBLIC_FRONTEND_ORIGIN = "https://gmfn-frontend.onrender.com"
PALE_BLUE = colors.HexColor("#F4F8FB")
PALE_GOLD = colors.HexColor("#FFF8E8")
SUCCESS_GREEN = colors.HexColor("#176B4D")
WARNING_AMBER = colors.HexColor("#9A6500")


def _public_frontend_base_url() -> str:
    for key in ("FRONTEND_BASE_URL", "GMFN_FRONTEND_BASE_URL", "PUBLIC_FRONTEND_URL"):
        raw = str(os.getenv(key) or "").strip().rstrip("/")
        if raw:
            return raw
    return PUBLIC_FRONTEND_ORIGIN


def _find_latest_full_repayment_event(db: Session, user_id: int) -> Optional[TrustEvent]:
    if user_id <= 0:
        return None
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
        lifecycle_decision = resolve_trust_event_lifecycle(db, row, consumer="public_evidence")
        if not lifecycle_decision.is_clean_current_evidence:
            continue
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
        subtitle="A portable public record for careful, current decisions.",
        generated_at=generated_at,
        reference=pack_id,
    )
    draw_institutional_footer(canvas, A4[0], footer_text)
    canvas.restoreState()


def _qr_block(url: str) -> Drawing:
    q = qr.QrCodeWidget(url)
    bounds = q.getBounds()
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    drawing = Drawing(76, 76, transform=[76.0 / width, 0, 0, 76.0 / height, 0, 0])
    drawing.add(q)
    return drawing


def _pdf_value(value: Any, fallback: str = "Not shown") -> str:
    return escape(safe_pdf_text(value, fallback=fallback))


def _fallback_pack_id(generated_at: str) -> str:
    token = "".join(ch for ch in safe_pdf_text(generated_at) if ch.isdigit())
    suffix = token[:12] if token else "PENDING"
    return f"GSN-PACK-TRUSTSLIP-{suffix}"


def _styles() -> Dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    return {
        "body": ParagraphStyle("GSNBody", parent=sample["Normal"], fontName="Helvetica", fontSize=8.4, leading=11.5, textColor=GSN_BLUE),
        "small": ParagraphStyle("GSNSmall", parent=sample["Normal"], fontName="Helvetica", fontSize=7.2, leading=9.6, textColor=GSN_MUTED),
        "eyebrow": ParagraphStyle("GSNEyebrow", parent=sample["Normal"], fontName="Helvetica-Bold", fontSize=7.6, leading=9, textColor=GSN_GOLD, tracking=0.8),
        "decision": ParagraphStyle("GSNDecision", parent=sample["Heading1"], fontName="Helvetica-Bold", fontSize=19, leading=22, textColor=GSN_NAVY, spaceAfter=5),
        "section": ParagraphStyle("GSNSection", parent=sample["Heading2"], fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=GSN_NAVY, spaceBefore=0, spaceAfter=5),
        "fact_label": ParagraphStyle("GSNFactLabel", parent=sample["Normal"], fontName="Helvetica-Bold", fontSize=6.8, leading=8, textColor=GSN_MUTED, uppercase=True),
        "fact_value": ParagraphStyle("GSNFactValue", parent=sample["Normal"], fontName="Helvetica-Bold", fontSize=9.4, leading=11.4, textColor=GSN_NAVY),
        "table_label": ParagraphStyle("GSNTableLabel", parent=sample["Normal"], fontName="Helvetica-Bold", fontSize=7.5, leading=9.4, textColor=GSN_MUTED),
        "table_value": ParagraphStyle("GSNTableValue", parent=sample["Normal"], fontName="Helvetica", fontSize=7.8, leading=9.8, textColor=GSN_BLUE),
    }


def _format_money(value: Any, currency: Any) -> str:
    raw = safe_pdf_text(value, fallback="").strip()
    if not raw:
        return "Not shown"
    try:
        amount = Decimal(raw.replace(",", ""))
    except (InvalidOperation, ValueError):
        return raw
    prefix = safe_pdf_text(currency, fallback="NGN")
    return f"{prefix} {amount:,.2f}"


def _status_context(summary: Dict[str, Any]) -> Dict[str, Any]:
    status = safe_pdf_text(summary.get("status"), fallback="not issued").strip().lower()
    has_code = bool(str(summary.get("code") or "").strip())
    is_current = bool(summary.get("is_current", True))
    active = bool(summary.get("active", status == "active")) and status == "active"
    if active and is_current and has_code:
        return {
            "label": "Current at export",
            "answer": "This TrustSlip was current when this paper was generated.",
            "explanation": "GSN recorded an active public TrustSlip for this holder. Check the live record before an important decision because status can change.",
            "colour": SUCCESS_GREEN,
        }
    if status == "expired":
        return {
            "label": "Expired",
            "answer": "Do not rely on this TrustSlip as current.",
            "explanation": "The TrustSlip had expired when this paper was generated. Ask the holder for a refreshed record.",
            "colour": WARNING_AMBER,
        }
    if status in {"revoked", "frozen", "superseded"} or not is_current:
        label = status.title() if status else "Not current"
        return {
            "label": label,
            "answer": "Do not rely on this TrustSlip as current.",
            "explanation": f"GSN marked this record as {label.lower()}. Open the live record or ask the holder for the current TrustSlip.",
            "colour": WARNING_AMBER,
        }
    if not has_code:
        return {
            "label": "No public code",
            "answer": "This export cannot be publicly checked.",
            "explanation": "No public TrustSlip code was available. Open the current TrustSlip in GSN before relying on this paper.",
            "colour": WARNING_AMBER,
        }
    return {
        "label": status.title() if status else "Check required",
        "answer": "Check this TrustSlip before relying on it.",
        "explanation": "The record is not shown as current and active. Use the live GSN page to confirm its latest status.",
        "colour": WARNING_AMBER,
    }


def _evidence_band(summary: Dict[str, Any]) -> str:
    band = safe_pdf_text(summary.get("band") or summary.get("cci_band"), fallback="").strip().upper()
    label = safe_pdf_text(summary.get("level_label"), fallback="").strip()
    if label:
        return f"{band} - {label}" if band else label
    labels = {
        "A": "Strong recorded evidence",
        "B": "Generally steady evidence",
        "C": "Developing evidence",
        "D": "Limited evidence",
    }
    if band:
        return f"{band} - {labels.get(band, 'Review the detail')}"
    return "Not shown"


def _verification_url(summary: Dict[str, Any], pack_meta: Dict[str, Any]) -> Optional[str]:
    explicit = str(
        pack_meta.get("trustslip_verify_ui_url")
        or pack_meta.get("merchant_verify_ui_url")
        or ""
    ).strip()
    if explicit:
        return explicit
    code = str(summary.get("code") or "").strip()
    if not code:
        return None
    return f"{_public_frontend_base_url()}/t/{quote(code, safe='')}"


def _reference_fingerprint(pack_id: str, code: Any, generated_at: str) -> str:
    material = f"{pack_id}|{safe_pdf_text(code, fallback='NO-CODE')}|{generated_at}"
    digest = hashlib.sha256(material.encode("utf-8")).hexdigest().upper()
    return "-".join(digest[index:index + 4] for index in range(0, 20, 4))


def _fact_card(label: str, value: Any, styles: Dict[str, ParagraphStyle]):
    return [
        Paragraph(escape(label.upper()), styles["fact_label"]),
        Spacer(1, 2),
        Paragraph(_pdf_value(value), styles["fact_value"]),
    ]


def _fact_grid(
    summary: Dict[str, Any],
    status: Dict[str, Any],
    styles: Dict[str, ParagraphStyle],
) -> Table:
    facts = [
        ("GSN ID", summary.get("gmfn_id")),
        ("Record status", status["label"]),
        ("Evidence band", _evidence_band(summary)),
        ("Valid until", summary.get("expires_at")),
    ]
    cells = [_fact_card(label, value, styles) for label, value in facts]
    table = Table(
        [[cells[0], cells[1]], [cells[2], cells[3]]],
        colWidths=[236, 236],
        rowHeights=[43, 43],
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.white),
        ("BOX", (0, 0), (-1, -1), 0.6, GSN_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, GSN_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return table


def _detail_table(
    rows: list[tuple[str, Any]],
    styles: Dict[str, ParagraphStyle],
) -> Table:
    data = [
        [
            Paragraph(escape(label), styles["table_label"]),
            Paragraph(_pdf_value(value), styles["table_value"]),
        ]
        for label, value in rows
    ]
    table = Table(data, colWidths=[157, 315], repeatRows=0)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), PALE_BLUE),
        ("BOX", (0, 0), (-1, -1), 0.5, GSN_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, GSN_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
    ]))
    return table


def build_trust_slip_pdf(
    db: Session,
    summary: Dict[str, Any],
    pack_meta: Optional[Dict[str, Any]] = None,
) -> bytes:
    meta = pack_meta or {}
    footer_text = meta.get("footer") or (
        "GSN TrustSlip evidence paper - controlled community trust record; "
        "not a bank guarantee, credit approval, payment instruction, or automatic debit authority."
    )
    generated_at = (
        safe_pdf_text(meta.get("generated_at_utc"), fallback="").strip()
        or utc_generated_label()
    )
    pack_id = (
        safe_pdf_text(meta.get("pack_id"), fallback="").strip()
        or _fallback_pack_id(generated_at)
    )
    verification_url = _verification_url(summary, meta)
    status = _status_context(summary)
    styles = _styles()

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        title="GSN TrustSlip Evidence Snapshot",
        author="Global Support Network",
        subject="Portable public TrustSlip evidence snapshot",
        pagesize=A4,
        leftMargin=48,
        rightMargin=48,
        topMargin=80 * mm,
        bottomMargin=48,
    )
    elements = []

    elements.append(Paragraph("OFFICIAL PUBLIC EVIDENCE", styles["eyebrow"]))
    elements.append(Spacer(1, 4))
    decision = Table(
        [
            [Paragraph(_pdf_value(status["answer"]), styles["decision"])],
            [Paragraph(_pdf_value(status["explanation"]), styles["body"])],
        ],
        colWidths=[472],
    )
    decision.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_GOLD),
        ("BOX", (0, 0), (-1, -1), 0.7, GSN_GOLD),
        ("LINEBEFORE", (0, 0), (0, -1), 4, status["colour"]),
        ("LEFTPADDING", (0, 0), (-1, -1), 13),
        ("RIGHTPADDING", (0, 0), (-1, -1), 13),
        ("TOPPADDING", (0, 0), (-1, 0), 10),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
        ("TOPPADDING", (0, 1), (-1, 1), 0),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 10),
    ]))
    elements.append(decision)
    elements.append(Spacer(1, 9))
    elements.append(_fact_grid(summary, status, styles))
    elements.append(Spacer(1, 10))

    if verification_url:
        verification_copy = [
            Paragraph("Check the live TrustSlip", styles["section"]),
            Paragraph(
                "Scan this code before an important decision. "
                "The live page is the source for the latest public status.",
                styles["body"],
            ),
            Spacer(1, 5),
            Paragraph(
                f"Public code: <b>{_pdf_value(summary.get('code'))}</b>",
                styles["small"],
            ),
        ]
        verification_panel = Table(
            [[verification_copy, _qr_block(verification_url)]],
            colWidths=[374, 98],
        )
    else:
        verification_copy = [
            Paragraph("Public verification is unavailable", styles["section"]),
            Paragraph(
                "No public TrustSlip code was available for this export. "
                "Open the current TrustSlip in GSN before relying on this paper.",
                styles["body"],
            ),
        ]
        verification_panel = Table([[verification_copy]], colWidths=[472])
    verification_panel.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE),
        ("BOX", (0, 0), (-1, -1), 0.6, GSN_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(KeepTogether([verification_panel]))
    elements.append(Spacer(1, 10))

    boundary_rows = [
        (
            "What this confirms",
            "The status and selected GSN evidence recorded when this paper was generated.",
        ),
        (
            "What this does not confirm",
            "Identity certainty, credit approval, a promise of payment, or a bank guarantee.",
        ),
        (
            "First thing to do",
            "Check the live TrustSlip, match the GSN ID, and ask the holder if anything is unclear.",
        ),
    ]
    elements.append(Paragraph("Decision Boundary", styles["section"]))
    elements.append(_detail_table(boundary_rows, styles))

    elements.append(PageBreak())
    elements.append(Paragraph("EVIDENCE BEHIND THIS RECORD", styles["eyebrow"]))
    elements.append(Spacer(1, 4))
    elements.append(
        Paragraph(
            "Read the evidence, then make your own decision.",
            styles["decision"],
        )
    )
    elements.append(
        Paragraph(
            "These facts explain the snapshot without exposing the holder's "
            "private account reference or operational payment details.",
            styles["body"],
        )
    )
    elements.append(Spacer(1, 9))

    elements.append(Paragraph("Record details", styles["section"]))
    record_rows = [
        ("Evidence Pack ID", pack_id),
        ("Private member reference", "redacted for TrustSlip evidence paper"),
        ("GSN ID", summary.get("gmfn_id")),
        ("Public TrustSlip code", summary.get("code")),
        ("Generated at (UTC)", generated_at),
        (
            "Reference fingerprint",
            _reference_fingerprint(pack_id, summary.get("code"), generated_at),
        ),
    ]
    elements.append(_detail_table(record_rows, styles))
    elements.append(Spacer(1, 9))

    breakdown = summary.get("counts", {}) or summary.get("breakdown", {}) or {}
    evidence_rows = [
        ("Recorded trust history", summary.get("lifetime_trust")),
        (
            "Current standing score",
            summary.get("standing_score") or summary.get("trust_score"),
        ),
        (
            "Community consistency signal",
            f"{safe_pdf_text(summary.get('cci_score'))} / "
            f"{safe_pdf_text(summary.get('cci_band'))}",
        ),
        ("Sponsor links on record", summary.get("sponsor_count")),
        (
            "Completed repayments",
            breakdown.get("full_repayments")
            or breakdown.get("loan_repaid")
            or 0,
        ),
        (
            "Successful support records",
            breakdown.get("guarantor_success")
            or breakdown.get("guarantor_approved")
            or 0,
        ),
        (
            "Missed payments on record",
            breakdown.get("missed_payments")
            or breakdown.get("missed_payment")
            or 0,
        ),
        (
            "Defaults on record",
            breakdown.get("defaults") or breakdown.get("default") or 0,
        ),
    ]
    elements.append(Paragraph("Trust evidence", styles["section"]))
    elements.append(_detail_table(evidence_rows, styles))
    elements.append(Spacer(1, 9))

    evidence_summary = summary.get("evidence_summary", {}) or {}
    capacity_context = evidence_summary.get("capacity_context", {}) or {}
    readiness_context = evidence_summary.get("readiness_context", {}) or {}
    event = _find_latest_full_repayment_event(
        db,
        int(summary.get("user_id") or 0),
    )
    confirmed_at = event.created_at.isoformat() if event and event.created_at else None
    confirmation_source = (
        "GSN recorded trust event"
        if event
        else "No recent full-repayment confirmation shown"
    )
    support_record = (
        "Private support record"
        if event
        else "No recent support record shown"
    )
    risk_flags = [
        safe_pdf_text(item)
        for item in list(summary.get("risk_flags", []) or [])
        if safe_pdf_text(item).strip()
    ]
    risk_copy = (
        "; ".join(risk_flags)
        if risk_flags
        else (
            "No risk flags were included in this snapshot. "
            "This is not proof that risk is absent."
        )
    )
    context_rows = [
        (
            "Support signal",
            _format_money(
                summary.get("trust_slip_limit") or summary.get("trust_limit"),
                summary.get("currency"),
            ),
        ),
        (
            "Available support capacity",
            _format_money(
                capacity_context.get("available_guarantee_capacity"),
                summary.get("currency"),
            ),
        ),
        (
            "Current committed support",
            _format_money(
                capacity_context.get("current_locked_guarantees"),
                summary.get("currency"),
            ),
        ),
        (
            "Support pressure reading",
            capacity_context.get("overexposure_ratio"),
        ),
        (
            "Readiness recommendation",
            readiness_context.get("recommendation"),
        ),
        (
            "Estimated support gap",
            _format_money(
                readiness_context.get("estimated_guarantee_gap"),
                summary.get("currency"),
            ),
        ),
        ("Last full repayment", summary.get("last_full_repayment_at")),
        ("Support record", support_record),
        (
            "Reconciliation reference",
            "private operational detail redacted",
        ),
        ("Confirmed at", confirmed_at),
        ("Confirmation source", confirmation_source),
        ("Current caution", risk_copy),
        (
            "Reference fingerprint",
            "Lookup aid only; not a digital signature.",
        ),
    ]
    elements.append(
        Paragraph("Support and repayment context", styles["section"])
    )
    elements.append(_detail_table(context_rows, styles))

    doc.build(
        elements,
        onFirstPage=lambda canvas, built_doc: _page_shell(
            canvas,
            built_doc,
            footer_text,
            generated_at,
            pack_id,
        ),
        onLaterPages=lambda canvas, built_doc: _page_shell(
            canvas,
            built_doc,
            footer_text,
            generated_at,
            pack_id,
        ),
    )
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
