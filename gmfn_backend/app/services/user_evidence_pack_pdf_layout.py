from __future__ import annotations

from datetime import datetime, timezone
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

EVENT_LABELS = {
    "loan.created": "Support request recorded",
    "guarantor.requested": "Supporter request recorded",
    "guarantor.decided": "Supporter decision recorded",
    "repayment.made": "Repayment recorded",
    "repayment.claimed": "Payment reported by member",
    "repayment.created": "Payment confirmed",
    "repayment.auto_applied": "Confirmed payment applied to support",
    "loan.repaid": "Full repayment recorded",
    "repayment.reversed": "Repayment record reversed",
    "loan_fully_repaid_reversed": "Full repayment status reversed",
    "guarantor_success_reversed": "Support outcome reversed",
    "loan.auto_approved_by_guarantors": "Support request approved by supporter decisions",
    "clan_join_via_invite": "Joined a community by invite",
    "trust.score_updated": "Trust snapshot updated",
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


def _event_label(value: Any) -> str:
    return EVENT_LABELS.get(str(value or "").strip().lower(), "Other recorded activity")


def _reference_fingerprint(reference: str, generated_at: str) -> str:
    digest = hashlib.sha256(
        f"{reference}|{generated_at}|member-evidence".encode("utf-8")
    ).hexdigest().upper()
    return "-".join(digest[index : index + 4] for index in range(0, 24, 4))


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "eyebrow": ParagraphStyle(
            "MemberEvidenceEyebrow", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=7.5, leading=9, textColor=GSN_GOLD,
        ),
        "answer": ParagraphStyle(
            "MemberEvidenceAnswer", parent=base["Heading1"], fontName="Helvetica-Bold",
            fontSize=17, leading=20, textColor=GSN_NAVY,
        ),
        "section": ParagraphStyle(
            "MemberEvidenceSection", parent=base["Heading2"], fontName="Helvetica-Bold",
            fontSize=10, leading=12, textColor=GSN_NAVY, spaceBefore=1, spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "MemberEvidenceBody", parent=base["BodyText"], fontName="Helvetica",
            fontSize=8.2, leading=10.5, textColor=GSN_NAVY,
        ),
        "small": ParagraphStyle(
            "MemberEvidenceSmall", parent=base["BodyText"], fontName="Helvetica",
            fontSize=7.1, leading=8.8, textColor=GSN_MUTED,
        ),
        "fact_label": ParagraphStyle(
            "MemberEvidenceFactLabel", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=6.4, leading=8, textColor=GSN_MUTED,
        ),
        "fact_value": ParagraphStyle(
            "MemberEvidenceFactValue", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=9, leading=10.5, textColor=GSN_NAVY,
        ),
        "table_head": ParagraphStyle(
            "MemberEvidenceTableHead", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=6.5, leading=8, textColor=colors.white,
        ),
        "table_cell": ParagraphStyle(
            "MemberEvidenceTableCell", parent=base["Normal"], fontName="Helvetica",
            fontSize=7, leading=8.7, textColor=GSN_NAVY,
        ),
    }


def _fact_grid(facts: list[tuple[str, Any]], styles: dict[str, ParagraphStyle]) -> Table:
    cells = [
        [
            Paragraph(_pdf_value(label), styles["fact_label"]),
            Spacer(1, 2),
            Paragraph(_pdf_value(value), styles["fact_value"]),
        ]
        for label, value in facts
    ]
    table = Table([cells], colWidths=[166, 96, 96, 114])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE),
        ("BOX", (0, 0), (-1, -1), 0.6, GSN_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.35, GSN_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table


def _detail_table(rows: list[tuple[str, Any]], styles: dict[str, ParagraphStyle]) -> Table:
    data = [
        [Paragraph(_pdf_value(label), styles["fact_label"]), Paragraph(_pdf_value(value), styles["body"])]
        for label, value in rows
    ]
    table = Table(data, colWidths=[130, CONTENT_WIDTH - 130])
    table.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, PALE_BLUE]),
        ("BOX", (0, 0), (-1, -1), 0.5, GSN_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, GSN_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _event_table(rows: list[dict[str, Any]], styles: dict[str, ParagraphStyle]) -> LongTable:
    data: list[list[Paragraph]] = [[
        Paragraph("WHEN", styles["table_head"]),
        Paragraph("RECORDED ACTIVITY", styles["table_head"]),
        Paragraph("CONTEXT", styles["table_head"]),
    ]]
    if rows:
        for row in rows:
            data.append([
                Paragraph(_pdf_value(_fmt_dt(row.get("created_at"))), styles["table_cell"]),
                Paragraph(_pdf_value(_event_label(row.get("event_type"))), styles["table_cell"]),
                Paragraph(_pdf_value(row.get("context") or "GSN member record"), styles["table_cell"]),
            ])
    else:
        data.append([
            Paragraph("No matching activity is recorded in this evidence window.", styles["table_cell"]),
            Paragraph("", styles["table_cell"]),
            Paragraph("", styles["table_cell"]),
        ])
    table = LongTable(data, colWidths=[128, 202, 142], repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), GSN_NAVY),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_BLUE]),
        ("BOX", (0, 0), (-1, -1), 0.55, GSN_BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, GSN_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def _page_shell(canvas, _doc, *, generated_at: str, reference: str, footer: str) -> None:
    canvas.saveState()
    draw_institutional_header(
        canvas,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        title="GSN Member Evidence Pack",
        subtitle="A redacted snapshot of member trust evidence and recent recorded activity.",
        generated_at=generated_at,
        reference=reference,
    )
    draw_institutional_footer(canvas, PAGE_WIDTH, footer)
    canvas.setFillColor(GSN_MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(PAGE_WIDTH - 18 * mm, 9 * mm, f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


def build_member_evidence_document(
    *,
    member_reference: str,
    score: int,
    band: str,
    updated_at: Any,
    category_summary: list[tuple[str, Any]],
    events: list[dict[str, Any]],
    days: int,
    redact: bool,
    generated_at: str,
) -> bytes:
    styles = _styles()
    event_count = len(events)
    if event_count == 0:
        answer = "A trust snapshot is available; no matching recent activity is recorded."
    elif event_count == 1:
        answer = "A trust snapshot and 1 recent evidence entry are recorded."
    else:
        answer = f"A trust snapshot and {event_count} recent evidence entries are recorded."
    explanation = (
        f"This member record shows score {score} / 100, evidence band {_safe_str(band)}, "
        f"and matching activity from the last {days} days. It is evidence for review, not an approval."
    )
    footer = "GSN member evidence paper - controlled community trust record; not a bank guarantee, credit approval, payment instruction, or automatic debit authority."

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        title="GSN Member Evidence Pack",
        author="Global Support Network",
        subject="Redacted member trust evidence snapshot",
        pagesize=A4,
        leftMargin=48,
        rightMargin=48,
        topMargin=80 * mm,
        bottomMargin=48,
    )
    elements = [Paragraph("MEMBER EVIDENCE SNAPSHOT", styles["eyebrow"]), Spacer(1, 4)]
    decision = Table([
        [Paragraph(_pdf_value(answer), styles["answer"])],
        [Paragraph(_pdf_value(explanation), styles["body"])],
    ], colWidths=[CONTENT_WIDTH])
    decision.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_GOLD),
        ("BOX", (0, 0), (-1, -1), 0.7, GSN_GOLD),
        ("LINEBEFORE", (0, 0), (0, -1), 4, GSN_GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 13),
        ("RIGHTPADDING", (0, 0), (-1, -1), 13),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
        ("TOPPADDING", (0, 1), (-1, 1), 0),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 8),
    ]))
    evidence_context = [
        ("Trust last updated", _fmt_dt(updated_at)),
        ("Evidence window", f"Matching recorded activity from the last {days} days"),
    ]
    evidence_context.extend(
        category_summary or [("Category summary", "No category summary is stored in this snapshot.")]
    )
    elements.extend([
        decision,
        Spacer(1, 7),
        _fact_grid([
            ("MEMBER REFERENCE", member_reference),
            ("TRUST SCORE", f"{score} / 100"),
            ("EVIDENCE BAND", band),
            ("RECENT ACTIVITY", f"{event_count} in {days} days"),
        ], styles),
        Spacer(1, 7),
        Paragraph("Decision Boundary", styles["section"]),
        _detail_table([
            ("What this confirms", "The trust snapshot and matching member activity recorded in the stated evidence window at export."),
            ("What this does not confirm", "Government identity, current community membership, credit approval, a bank guarantee, payment movement, or automatic debit authority."),
            ("First thing to do", "Check the live GSN member record and current community evidence before a high-risk decision."),
            ("Privacy", "Private contact details, internal member IDs, support record numbers, and event metadata are not printed in this redacted share copy."),
        ], styles),
        Spacer(1, 7),
        Paragraph("Evidence context", styles["section"]),
        _detail_table(evidence_context, styles),
        Spacer(1, 7),
        Paragraph(f"Recent recorded evidence - last {days} days", styles["section"]),
        _event_table(events, styles),
        Spacer(1, 7),
    ])

    visibility = "Redacted share copy" if redact else "Controlled complete record"
    security = Table([[
        [Paragraph("VISIBILITY", styles["fact_label"]), Spacer(1, 2), Paragraph(_pdf_value(visibility), styles["fact_value"])],
        [Paragraph("REFERENCE FINGERPRINT", styles["fact_label"]), Spacer(1, 2), Paragraph(_pdf_value(_reference_fingerprint(member_reference, generated_at)), styles["fact_value"])],
    ]], colWidths=[188, CONTENT_WIDTH - 188])
    security.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE),
        ("BOX", (0, 0), (-1, -1), 0.5, GSN_BORDER),
        ("LINEBEFORE", (1, 0), (1, 0), 0.35, GSN_BORDER),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(KeepTogether([
        Paragraph("Record security", styles["section"]),
        security,
        Spacer(1, 3),
        Paragraph(
            f"Generated {_pdf_value(generated_at)}. The fingerprint is a lookup aid, not a digital signature. "
            "Use the complete record only when the reviewer is allowed to see private member evidence.",
            styles["small"],
        ),
    ]))

    def shell(canvas, built_doc):
        _page_shell(canvas, built_doc, generated_at=generated_at, reference=member_reference, footer=footer)

    doc.build(elements, onFirstPage=shell, onLaterPages=shell)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
