from __future__ import annotations

from datetime import datetime, timezone
import hashlib
from io import BytesIO
from typing import Any, Dict, Optional
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    LongTable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.services.institutional_pdf import (
    GSN_BLUE,
    GSN_BORDER,
    GSN_GOLD,
    GSN_MUTED,
    GSN_NAVY,
    draw_institutional_footer,
    draw_institutional_header,
    safe_pdf_text,
)


PAGE_WIDTH, PAGE_HEIGHT = A4
PALE_BLUE = colors.HexColor("#F4F8FB")
PALE_GOLD = colors.HexColor("#FFF8E8")
SUCCESS_GREEN = colors.HexColor("#176B4D")
WARNING_AMBER = colors.HexColor("#9A6500")


def _safe_str(value: Any, default: str = "Not shown") -> str:
    return safe_pdf_text(value, fallback=default)


def _fmt_dt(value: Any) -> str:
    if value is None:
        return "Not shown"
    if isinstance(value, datetime):
        try:
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
        except Exception:
            return safe_pdf_text(value)
    raw = str(value).strip()
    if not raw:
        return "Not shown"
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
    except Exception:
        return safe_pdf_text(raw)


def _pdf_value(value: Any, fallback: str = "Not shown") -> str:
    return escape(safe_pdf_text(value, fallback=fallback))


def _styles() -> Dict[str, ParagraphStyle]:
    sample = getSampleStyleSheet()
    return {
        "body": ParagraphStyle("TimelineBody", parent=sample["Normal"], fontName="Helvetica", fontSize=8.4, leading=11.5, textColor=GSN_BLUE),
        "small": ParagraphStyle("TimelineSmall", parent=sample["Normal"], fontName="Helvetica", fontSize=7.2, leading=9.5, textColor=GSN_MUTED),
        "eyebrow": ParagraphStyle("TimelineEyebrow", parent=sample["Normal"], fontName="Helvetica-Bold", fontSize=7.6, leading=9, textColor=GSN_GOLD, tracking=0.8),
        "decision": ParagraphStyle("TimelineDecision", parent=sample["Heading1"], fontName="Helvetica-Bold", fontSize=18, leading=21, textColor=GSN_NAVY, spaceAfter=4),
        "section": ParagraphStyle("TimelineSection", parent=sample["Heading2"], fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=GSN_NAVY, spaceAfter=5),
        "fact_label": ParagraphStyle("TimelineFactLabel", parent=sample["Normal"], fontName="Helvetica-Bold", fontSize=6.8, leading=8, textColor=GSN_MUTED),
        "fact_value": ParagraphStyle("TimelineFactValue", parent=sample["Normal"], fontName="Helvetica-Bold", fontSize=9.2, leading=11, textColor=GSN_NAVY),
        "table_label": ParagraphStyle("TimelineTableLabel", parent=sample["Normal"], fontName="Helvetica-Bold", fontSize=7.4, leading=9.2, textColor=GSN_MUTED),
        "table_value": ParagraphStyle("TimelineTableValue", parent=sample["Normal"], fontName="Helvetica", fontSize=7.8, leading=9.8, textColor=GSN_BLUE),
        "event_header": ParagraphStyle("TimelineEventHeader", parent=sample["Normal"], fontName="Helvetica-Bold", fontSize=7.2, leading=8.5, textColor=colors.white),
        "event_value": ParagraphStyle("TimelineEventValue", parent=sample["Normal"], fontName="Helvetica", fontSize=7.7, leading=10, textColor=GSN_BLUE),
        "event_title": ParagraphStyle("TimelineEventTitle", parent=sample["Normal"], fontName="Helvetica-Bold", fontSize=7.8, leading=10, textColor=GSN_NAVY),
    }


USER_EVENT_LABELS = {
    "loan_repaid": "Full repayment recorded",
    "loan.repaid": "Full repayment recorded",
    "loan_fully_repaid": "Full repayment recorded",
    "repaid": "Full repayment recorded",
    "repayment_full": "Full repayment recorded",
    "full_repayment": "Full repayment recorded",
    "loan_repayment_completed": "Full repayment recorded",
    "guarantor_success": "Support completed successfully",
    "guarantor_repayment_success": "Support completed successfully",
    "guarantor_supported_repaid": "Support completed successfully",
    "guarantor_credit": "Support completed successfully",
    "missed_payment": "Payment missed",
    "repayment_missed": "Payment missed",
    "late_payment": "Payment missed",
    "overdue": "Payment overdue",
    "loan_defaulted": "Support request not repaid",
    "default": "Support request not repaid",
    "write_off": "Support request not repaid",
    "chargeoff": "Support request not repaid",
    "fraud_flag": "Safety flag recorded",
    "fraud": "Safety flag recorded",
    "abuse_flag": "Safety flag recorded",
    "ban": "Safety flag recorded",
    "guarantee_given": "Support promised",
    "guarantee_released": "Support released",
    "loan.created": "Support request created",
    "loan_auto_approved": "Community approval recorded",
    "loan_incomplete": "More support was needed",
    "loan_cancelled": "Support request cancelled",
    "guarantor_approved": "Supporter approval recorded",
    "guarantor_declined": "Supporter declined",
    "guarantor_expired": "Support request expired",
    "repayment.claimed": "Payment reported by member",
    "repayment_claimed": "Payment reported by member",
    "repayment.claim": "Payment reported by member",
    "repayment.reversed": "Repayment record reversed",
    "loan_fully_repaid_reversed": "Full repayment status reversed",
    "guarantor_success_reversed": "Support outcome reversed",
    "merchant.release_recorded": "Goods release recorded",
    "merchant_release_recorded": "Goods release recorded",
    "merchant.dispatched": "Goods dispatched",
    "merchant.in_transit": "Goods in transit",
    "merchant.delivered": "Delivery recorded",
    "merchant.delivery_issue": "Delivery issue recorded",
    "merchant.delivery_confirmed": "Delivery confirmation recorded",
    "courier.received": "Courier receipt recorded",
    "courier.in_transit": "Courier transit recorded",
    "courier.delivered": "Courier delivery recorded",
    "community.followed": "Community follow recorded",
    "community.unfollowed": "Community follow updated",
    "marketplace.shop.followed": "Shop follow recorded",
    "marketplace.shop.unfollowed": "Shop follow updated",
    "invite_created": "Invite link created",
    "invite_joined": "Invite used to join",
}


def event_type_label(event_type: Any, *, audience: str) -> str:
    raw = _safe_str(event_type, "").strip()
    normalized = raw.lower()
    if normalized in USER_EVENT_LABELS:
        return USER_EVENT_LABELS[normalized]
    if str(audience).strip().lower() == "admin" and raw:
        return raw.replace("_", " ").replace(".", " ").strip().title()
    return "Activity recorded"


def event_meta_summary(meta: Any, *, redact: bool = True) -> str:
    if not isinstance(meta, dict) or not meta:
        return "No additional timeline detail."
    if redact:
        return "private event details redacted for timeline PDF"
    parts: list[str] = []
    for key in ("reason", "note", "status", "amount", "currency"):
        if meta.get(key) not in (None, ""):
            label = key.replace("_", " ").title()
            parts.append(f"{label}: {safe_pdf_text(meta.get(key))}")
    return " | ".join(parts) or "No additional timeline detail."


def _evidence_band(summary: Dict[str, Any]) -> str:
    band = _safe_str(
        summary.get("band")
        or summary.get("trust_band")
        or summary.get("cci_band"),
        "",
    ).strip().upper()
    labels = {
        "A": "Strong recorded evidence",
        "B": "Generally steady evidence",
        "C": "Developing evidence",
        "D": "Limited evidence",
    }
    if not band:
        return "Not shown"
    return f"{band} - {labels.get(band, 'Review the detail')}"


def _status_context(summary: Dict[str, Any]) -> Dict[str, Any]:
    status = _safe_str(summary.get("status"), "not issued").strip().lower()
    has_code = bool(str(summary.get("code") or "").strip())
    is_current = bool(summary.get("is_current", True))
    active = bool(summary.get("active", status == "active")) and status == "active"
    if active and is_current and has_code:
        return {
            "label": "Current at export",
            "colour": SUCCESS_GREEN,
            "explanation": "The public TrustSlip was current when this private timeline was generated.",
        }
    if status == "expired":
        return {
            "label": "TrustSlip expired",
            "colour": WARNING_AMBER,
            "explanation": "The public TrustSlip had expired. The historical timeline remains a private record.",
        }
    if not has_code:
        return {
            "label": "No public TrustSlip shown",
            "colour": WARNING_AMBER,
            "explanation": "This private timeline has no public TrustSlip code to check.",
        }
    return {
        "label": status.title() if status else "Check required",
        "colour": WARNING_AMBER,
        "explanation": "The public TrustSlip is not shown as current and active.",
    }


def _fallback_reference(generated_at: str) -> str:
    token = "".join(ch for ch in safe_pdf_text(generated_at) if ch.isdigit())
    suffix = token[:12] if token else "PENDING"
    return f"GSN-TIMELINE-{suffix}"


def _reference_fingerprint(reference: str, gsn_id: Any, generated_at: str) -> str:
    material = f"{reference}|{_safe_str(gsn_id, 'NO-GSN-ID')}|{generated_at}"
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
    events: list[Dict[str, Any]],
    styles: Dict[str, ParagraphStyle],
) -> Table:
    latest_activity = _fmt_dt(events[0].get("created_at")) if events else "No recent activity"
    facts = [
        ("GSN ID", summary.get("gmfn_id")),
        ("Current record", status["label"]),
        ("Evidence band", _evidence_band(summary)),
        ("Latest activity", latest_activity),
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
    table = Table(data, colWidths=[157, 315])
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


def _event_table(
    events: list[Dict[str, Any]],
    styles: Dict[str, ParagraphStyle],
) -> LongTable:
    header = [
        Paragraph("WHEN", styles["event_header"]),
        Paragraph("WHAT CHANGED", styles["event_header"]),
        Paragraph("EVIDENCE NOTE", styles["event_header"]),
    ]
    rows: list[list[Any]] = [header]
    if not events:
        rows.append([
            Paragraph("No recent activity", styles["event_value"]),
            Paragraph("No recent trust record changes are shown.", styles["event_title"]),
            Paragraph("This does not mean older history is absent.", styles["event_value"]),
        ])
    else:
        for event in events:
            rows.append([
                Paragraph(_pdf_value(_fmt_dt(event.get("created_at"))), styles["event_value"]),
                Paragraph(_pdf_value(event.get("label")), styles["event_title"]),
                Paragraph(_pdf_value(event.get("note")), styles["event_value"]),
            ])
    table = LongTable(
        rows,
        colWidths=[103, 160, 209],
        repeatRows=1,
        splitByRow=1,
    )
    style_rows = [
        ("BACKGROUND", (0, 0), (-1, 0), GSN_NAVY),
        ("BOX", (0, 0), (-1, -1), 0.5, GSN_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, GSN_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    for row_index in range(2, len(rows), 2):
        style_rows.append(("BACKGROUND", (0, row_index), (-1, row_index), PALE_BLUE))
    table.setStyle(TableStyle(style_rows))
    return table


def _page_shell(
    canvas,
    doc,
    *,
    generated_at: str,
    reference: str,
    footer_text: str,
) -> None:
    canvas.saveState()
    draw_institutional_header(
        canvas,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        title="GSN Trust Timeline",
        subtitle="A private, chronological record of trust evidence and recorded activity.",
        generated_at=generated_at,
        reference=reference,
    )
    draw_institutional_footer(canvas, PAGE_WIDTH, footer_text)
    canvas.setFillColor(GSN_MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(PAGE_WIDTH - 18 * mm, 9 * mm, f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


def build_timeline_document(
    *,
    summary: Dict[str, Any],
    events: list[Dict[str, Any]],
    audience: str,
    generated_at: str,
    reference: Optional[str],
    protocol_version: Optional[str],
    footer: Optional[str],
    score: Optional[str],
    private_contact: str,
) -> bytes:
    styles = _styles()
    record_reference = _safe_str(reference, "").strip() or _fallback_reference(generated_at)
    status = _status_context(summary)
    event_count = len(events)
    answer = (
        f"{event_count} recent trust record change{'s are' if event_count != 1 else ' is'} shown."
        if event_count
        else "No recent trust record changes are shown."
    )
    answer_explanation = (
        "Start with the newest row. Each row is a recorded event, not a promise, approval, or complete account of every private detail."
        if event_count
        else "The requested period contains no recent rows. This does not mean older trust history is absent."
    )
    base_footer = (
        "GSN Trust Timeline - redacted private trust history; not a bank guarantee, "
        "credit approval, payment instruction, or automatic debit authority."
    )
    footer_text = f"{safe_pdf_text(footer)} | {base_footer}" if footer else base_footer

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        title="GSN Trust Timeline",
        author="Global Support Network",
        subject="Private chronological trust evidence record",
        pagesize=A4,
        leftMargin=48,
        rightMargin=48,
        topMargin=80 * mm,
        bottomMargin=48,
    )
    elements = []

    elements.append(Paragraph("PRIVATE TRUST RECORD", styles["eyebrow"]))
    elements.append(Spacer(1, 4))
    decision = Table(
        [
            [Paragraph(_pdf_value(answer), styles["decision"])],
            [Paragraph(_pdf_value(answer_explanation), styles["body"])],
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
    elements.append(_fact_grid(summary, status, events, styles))
    elements.append(Spacer(1, 9))

    use_panel = Table(
        [[
            [
                Paragraph("How to use this timeline", styles["section"]),
                Paragraph(
                    "Read from newest to oldest. If a row matters to a decision, ask the holder for the matching complete record inside GSN.",
                    styles["body"],
                ),
            ],
            [
                Paragraph("CURRENT PUBLIC RECORD", styles["fact_label"]),
                Spacer(1, 2),
                Paragraph(_pdf_value(status["label"]), styles["fact_value"]),
                Spacer(1, 3),
                Paragraph(_pdf_value(status["explanation"]), styles["small"]),
            ],
        ]],
        colWidths=[285, 187],
    )
    use_panel.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE),
        ("BOX", (0, 0), (-1, -1), 0.6, GSN_BORDER),
        ("LINEBEFORE", (1, 0), (1, 0), 0.5, GSN_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    elements.append(KeepTogether([use_panel]))
    elements.append(Spacer(1, 9))

    elements.append(Paragraph("Decision Boundary", styles["section"]))
    elements.append(_detail_table([
        ("What this confirms", "The event labels and dates recorded by GSN in the requested recent period."),
        ("What this does not confirm", "Identity certainty, credit approval, payment receipt, delivery, or a bank guarantee."),
        ("First thing to do", "Review the newest event, then open the complete private record if the decision carries risk."),
    ], styles))
    elements.append(Spacer(1, 9))

    evidence_summary = summary.get("evidence_summary", {}) or {}
    capacity = evidence_summary.get("capacity_context", {}) or {}
    readiness = evidence_summary.get("readiness_context", {}) or {}
    currency = _safe_str(summary.get("currency"), "NGN")
    support_value = summary.get("trust_limit") or summary.get("trust_slip_limit")
    elements.append(Paragraph("Current evidence context", styles["section"]))
    elements.append(_detail_table([
        ("Current standing score", score or summary.get("standing_score") or summary.get("trust_score")),
        ("Community consistency signal", f"{_safe_str(summary.get('cci_score'))} / {_safe_str(summary.get('cci_band'))}"),
        ("Public TrustSlip code", summary.get("code")),
        ("Support signal", f"{currency} {_safe_str(support_value)}"),
        ("Available support capacity", f"{currency} {_safe_str(capacity.get('available_guarantee_capacity'))}"),
        ("Readiness recommendation", readiness.get("recommendation")),
    ], styles))
    elements.append(Spacer(1, 9))

    elements.append(PageBreak())
    elements.append(Paragraph("RECORDED ACTIVITY", styles["eyebrow"]))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("Your recent trust record, newest first.", styles["decision"]))
    elements.append(
        Paragraph(
            "Reader boundary: redacted personal trust history for controlled review. "
            "Private contacts, payment references, support IDs, and event notes are not printed.",
            styles["body"],
        )
    )
    elements.append(Spacer(1, 9))
    elements.append(_event_table(events, styles))
    elements.append(Spacer(1, 8))
    elements.append(Paragraph("Record details", styles["section"]))
    elements.append(_detail_table([
        ("Audience", _safe_str(audience)),
        ("Private contact", private_contact),
        ("Generated at (UTC)", generated_at),
        ("Evidence reference", record_reference),
        ("Protocol version", protocol_version),
        (
            "Reference fingerprint",
            _reference_fingerprint(
                record_reference,
                summary.get("gmfn_id"),
                generated_at,
            ),
        ),
    ], styles))
    elements.append(Spacer(1, 8))
    elements.append(
        Paragraph(
            "A recorded event shows that GSN captured an activity. It does not by itself prove payment receipt, delivery, identity, endorsement, or future behaviour.",
            styles["small"],
        )
    )

    def shell(canvas, built_doc):
        _page_shell(
            canvas,
            built_doc,
            generated_at=generated_at,
            reference=record_reference,
            footer_text=footer_text,
        )

    doc.build(elements, onFirstPage=shell, onLaterPages=shell)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf
