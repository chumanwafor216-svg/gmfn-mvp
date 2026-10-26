from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
import hashlib
from io import BytesIO
from typing import Any
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, LongTable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.services.institutional_pdf import (
    GSN_BORDER,
    GSN_GOLD,
    GSN_MUTED,
    GSN_NAVY,
    draw_institutional_footer,
    draw_institutional_header,
    safe_pdf_text,
)


PAGE_WIDTH, PAGE_HEIGHT = A4
CONTENT_WIDTH = 472
PALE_BLUE = colors.HexColor("#F4F8FB")
PALE_GOLD = colors.HexColor("#FFF8E8")
SUCCESS_GREEN = colors.HexColor("#176B4D")
WARNING_AMBER = colors.HexColor("#9A6500")

EVENT_LABELS = {
    "loan_requested": "Support requested",
    "loan_approved": "Support request approved",
    "loan_declined": "Support request declined",
    "loan_disbursed": "Support released",
    "loan_repaid": "Full repayment recorded",
    "repayment.claimed": "Payment reported by member",
    "repayment_confirmed": "Payment confirmed",
    "guarantor_invited": "Supporter invited",
    "guarantor_accepted": "Supporter accepted",
    "guarantor_declined": "Supporter declined",
    "guarantor_success": "Support completed successfully",
}


def _safe_str(value: Any, default: str = "Not shown") -> str:
    return safe_pdf_text(value, fallback=default)


def _pdf_value(value: Any, default: str = "Not shown") -> str:
    return escape(_safe_str(value, default))


def _fmt_dt(value: Any) -> str:
    if value is None:
        return "Not shown"
    if isinstance(value, datetime):
        try:
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc).strftime("%d %b %Y, %H:%M UTC")
        except Exception:
            return _safe_str(value)
    return _safe_str(value)


def _fmt_money(value: Any, currency: str) -> str:
    try:
        amount = Decimal(str(value or 0))
    except (InvalidOperation, TypeError, ValueError):
        return _safe_str(value)
    return f"{_safe_str(currency, 'NGN')} {amount:,.2f}"


def _display_status(value: Any) -> str:
    raw = str(value or "not shown").strip().replace("_", " ")
    return raw[:1].upper() + raw[1:].lower() if raw else "Not shown"


def _event_label(value: Any) -> str:
    return EVENT_LABELS.get(str(value or "").strip().lower(), "Other recorded activity")


def _reference_fingerprint(reference: str, generated_at: str) -> str:
    digest = hashlib.sha256(f"{reference}|{generated_at}|support-evidence".encode("utf-8")).hexdigest().upper()
    return "-".join(digest[index : index + 4] for index in range(0, 24, 4))


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "eyebrow": ParagraphStyle("SupportEyebrow", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=7.5, leading=9, textColor=GSN_GOLD),
        "answer": ParagraphStyle("SupportAnswer", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=17, leading=20, textColor=GSN_NAVY),
        "section": ParagraphStyle("SupportSection", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=10, leading=12, textColor=GSN_NAVY, spaceBefore=1, spaceAfter=4),
        "body": ParagraphStyle("SupportBody", parent=base["BodyText"], fontName="Helvetica", fontSize=8.2, leading=10.5, textColor=GSN_NAVY),
        "small": ParagraphStyle("SupportSmall", parent=base["BodyText"], fontName="Helvetica", fontSize=7.1, leading=8.8, textColor=GSN_MUTED),
        "fact_label": ParagraphStyle("SupportFactLabel", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=6.4, leading=8, textColor=GSN_MUTED),
        "fact_value": ParagraphStyle("SupportFactValue", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=9, leading=10.5, textColor=GSN_NAVY),
        "table_head": ParagraphStyle("SupportTableHead", parent=base["Normal"], fontName="Helvetica-Bold", fontSize=6.5, leading=8, textColor=colors.white),
        "table_cell": ParagraphStyle("SupportTableCell", parent=base["Normal"], fontName="Helvetica", fontSize=7, leading=8.7, textColor=GSN_NAVY),
    }


def _fact_grid(facts: list[tuple[str, Any]], styles: dict[str, ParagraphStyle]) -> Table:
    cells = [[Paragraph(_pdf_value(label), styles["fact_label"]), Spacer(1, 2), Paragraph(_pdf_value(value), styles["fact_value"])] for label, value in facts]
    table = Table([cells], colWidths=[142, 94, 118, 118])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE), ("BOX", (0, 0), (-1, -1), 0.6, GSN_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, GSN_BORDER), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def _detail_table(rows: list[tuple[str, Any]], styles: dict[str, ParagraphStyle]) -> Table:
    data = [[Paragraph(_pdf_value(label), styles["fact_label"]), Paragraph(_pdf_value(value), styles["body"])] for label, value in rows]
    table = Table(data, colWidths=[126, CONTENT_WIDTH - 126])
    table.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, PALE_BLUE]), ("BOX", (0, 0), (-1, -1), 0.5, GSN_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, GSN_BORDER), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _evidence_table(headers: list[str], rows: list[list[Any]], widths: list[float], empty_message: str, styles: dict[str, ParagraphStyle]) -> LongTable:
    data: list[list[Paragraph]] = [[Paragraph(_pdf_value(header), styles["table_head"]) for header in headers]]
    if rows:
        data.extend([[Paragraph(_pdf_value(value), styles["table_cell"]) for value in row] for row in rows])
    else:
        data.append([Paragraph(_pdf_value(empty_message), styles["table_cell"])] + [Paragraph("", styles["table_cell"]) for _ in headers[1:]])
    table = LongTable(data, colWidths=widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GSN_NAVY), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_BLUE]),
        ("BOX", (0, 0), (-1, -1), 0.55, GSN_BORDER), ("INNERGRID", (0, 0), (-1, -1), 0.3, GSN_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _page_shell(canvas, _doc, *, generated_at: str, reference: str, footer: str) -> None:
    canvas.saveState()
    draw_institutional_header(
        canvas, PAGE_WIDTH, PAGE_HEIGHT, title="GSN Support Evidence Pack",
        subtitle="A redacted decision snapshot with support and repayment evidence.",
        generated_at=generated_at, reference=reference,
    )
    draw_institutional_footer(canvas, PAGE_WIDTH, footer)
    canvas.setFillColor(GSN_MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(PAGE_WIDTH - 18 * mm, 9 * mm, f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


def build_support_evidence_document(
    *, support_reference: str, community_name: str, community_reference: str,
    requester_reference: str, requester_trust: dict[str, Any], status: str,
    amount: Any, currency: str, support_gap: Any, supporters_required: int,
    supporters: list[dict[str, Any]], repayments: list[dict[str, Any]],
    timeline: list[dict[str, Any]], redact: bool, generated_at: str,
) -> bytes:
    styles = _styles()
    approved_supporters = sum(1 for row in supporters if str(row.get("status") or "").lower() == "approved")
    answer = f"This support request is recorded as {_display_status(status).lower()}."
    explanation = (
        f"The record shows {_fmt_money(amount, currency)} requested, {_fmt_money(support_gap, currency)} still requiring support, "
        f"and {approved_supporters} of {supporters_required} required supporters approved. "
        f"Community: {_safe_str(community_name)} ({community_reference})."
    )
    decision_colour = SUCCESS_GREEN if status.strip().lower() in {"approved", "active", "disbursed", "repaid", "completed"} else WARNING_AMBER
    footer = "GSN support evidence paper - controlled community trust record; not a bank guarantee, credit approval, payment instruction, or automatic debit authority."

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, title="GSN Support Evidence Pack", author="Global Support Network", subject="Redacted support decision and repayment evidence", pagesize=A4, leftMargin=48, rightMargin=48, topMargin=80 * mm, bottomMargin=48)
    elements = [Paragraph("SUPPORT EVIDENCE SNAPSHOT", styles["eyebrow"]), Spacer(1, 4)]
    decision = Table([[Paragraph(_pdf_value(answer), styles["answer"])], [Paragraph(_pdf_value(explanation), styles["body"])]], colWidths=[CONTENT_WIDTH])
    decision.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_GOLD), ("BOX", (0, 0), (-1, -1), 0.7, GSN_GOLD),
        ("LINEBEFORE", (0, 0), (0, -1), 4, decision_colour), ("LEFTPADDING", (0, 0), (-1, -1), 13),
        ("RIGHTPADDING", (0, 0), (-1, -1), 13), ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2), ("TOPPADDING", (0, 1), (-1, 1), 0),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 8),
    ]))
    elements.extend([
        decision, Spacer(1, 7),
        _fact_grid([("SUPPORT RECORD", support_reference), ("STATUS", _display_status(status)), ("REQUESTED", _fmt_money(amount, currency)), ("SUPPORT GAP", _fmt_money(support_gap, currency))], styles),
        Spacer(1, 7), Paragraph("Decision Boundary", styles["section"]),
        _detail_table([
            ("What this confirms", "The support status, recorded trust snapshot, supporter decisions, repayments, and linked activity available at export."),
            ("What this does not confirm", "Credit approval, a bank guarantee, payment movement, release of funds, or automatic debit authority."),
            ("First thing to do", "Check the live support record for its current status and support gap before relying on this paper."),
            ("Privacy", "Private contacts, internal member IDs, and event metadata are not printed in the redacted share copy."),
        ], styles),
        Spacer(1, 7), Paragraph("Trust snapshot", styles["section"]),
        _detail_table([
            ("Requester", requester_reference),
            ("Requester trust signal", f"Score {requester_trust.get('score')} / band {requester_trust.get('band') or 'Not shown'}" if requester_trust.get("score") is not None else "No trust score is shown"),
            ("Trust last updated", _fmt_dt(requester_trust.get("updated_at"))),
            ("Supporters approved", f"{approved_supporters} of {supporters_required} required"),
        ], styles), Spacer(1, 7),
    ])

    supporter_rows = [[row.get("member_reference"), _display_status(row.get("status")), _fmt_money(row.get("pledge_amount"), currency), f"{row.get('score')} / {row.get('band') or 'Not shown'}" if row.get("score") is not None else "Not shown"] for row in supporters]
    repayment_rows = [[_fmt_dt(row.get("created_at")), row.get("payer_reference"), _fmt_money(row.get("amount"), currency)] for row in reversed(repayments)]
    timeline_rows = [[_fmt_dt(row.get("created_at")), _event_label(row.get("event_type")), row.get("participants"), "Metadata redacted for share copy" if row.get("has_metadata") else "No note"] for row in reversed(timeline)]
    if not supporter_rows and not repayment_rows and not timeline_rows:
        elements.extend([
            Paragraph("Recorded evidence", styles["section"]),
            _detail_table([
                ("Supporter decisions", "No supporter decisions are recorded."),
                ("Repayment record", "No repayments are recorded."),
                ("Evidence timeline for this support record", "No linked activity is recorded."),
            ], styles),
            Spacer(1, 5),
        ])
    else:
        if supporter_rows:
            elements.extend([
                Paragraph("Supporter decisions", styles["section"]),
                _evidence_table(["SUPPORTER", "DECISION", "PLEDGED", "TRUST"], supporter_rows, [154, 90, 118, 110], "No supporter decisions are recorded.", styles),
                Spacer(1, 5),
            ])
        else:
            elements.append(Paragraph("Supporter decisions: No supporter decisions are recorded.", styles["small"]))
            elements.append(Spacer(1, 4))
        if repayment_rows:
            elements.extend([
                Paragraph("Repayment record", styles["section"]),
                _evidence_table(["WHEN", "RECORDED PAYER", "AMOUNT"], repayment_rows, [142, 190, 140], "No repayments are recorded.", styles),
                Spacer(1, 5),
            ])
        else:
            elements.append(Paragraph("Repayment record: No repayments are recorded.", styles["small"]))
            elements.append(Spacer(1, 4))
        if timeline_rows:
            elements.extend([
                Paragraph("Evidence timeline for this support record", styles["section"]),
                _evidence_table(["WHEN", "RECORDED ACTIVITY", "MEMBER REFERENCES", "NOTE"], timeline_rows, [100, 126, 148, 98], "No linked activity is recorded.", styles),
                Spacer(1, 5),
            ])
        else:
            elements.append(Paragraph("Evidence timeline for this support record: No linked activity is recorded.", styles["small"]))
            elements.append(Spacer(1, 4))

    visibility = "Redacted share copy" if redact else "Controlled complete record"
    security = Table([[ [Paragraph("VISIBILITY", styles["fact_label"]), Spacer(1, 2), Paragraph(_pdf_value(visibility), styles["fact_value"])], [Paragraph("REFERENCE FINGERPRINT", styles["fact_label"]), Spacer(1, 2), Paragraph(_pdf_value(_reference_fingerprint(support_reference, generated_at)), styles["fact_value"])] ]], colWidths=[188, CONTENT_WIDTH - 188])
    security.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE), ("BOX", (0, 0), (-1, -1), 0.5, GSN_BORDER),
        ("LINEBEFORE", (1, 0), (1, 0), 0.35, GSN_BORDER), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(KeepTogether([
        Paragraph("Record security", styles["section"]), security, Spacer(1, 3),
        Paragraph(f"Generated {_pdf_value(generated_at)}. The fingerprint is a lookup aid, not a digital signature. Use the complete record only when the reviewer is allowed to see private support, supporter, and repayment details.", styles["small"]),
    ]))

    def shell(canvas, built_doc):
        _page_shell(canvas, built_doc, generated_at=generated_at, reference=support_reference, footer=footer)

    doc.build(elements, onFirstPage=shell, onLaterPages=shell)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
