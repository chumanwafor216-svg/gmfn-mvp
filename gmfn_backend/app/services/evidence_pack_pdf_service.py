from __future__ import annotations

from datetime import datetime, timezone
import hashlib
from io import BytesIO
from typing import Any, Optional
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    KeepTogether,
    LongTable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from sqlalchemy.orm import Session

from app.db.models import Clan
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
from app.services.invite_analytics_service import (
    get_invite_analytics,
    get_recent_invite_joins,
    get_trust_events_timeline,
)


PAGE_WIDTH, PAGE_HEIGHT = A4
CONTENT_WIDTH = 472
PALE_BLUE = colors.HexColor("#F4F8FB")
PALE_GOLD = colors.HexColor("#FFF8E8")
SUCCESS_GREEN = colors.HexColor("#176B4D")
WARNING_AMBER = colors.HexColor("#9A6500")


EVENT_LABELS = {
    "invite_created": "Invite created",
    "invite_revoked": "Invite revoked",
    "clan_join_via_invite": "Member joined by invite",
    "community_joined": "Community entry recorded",
    "community_contribution": "Community contribution recorded",
    "contribution_made": "Community contribution recorded",
    "community_followed": "Community followed",
    "shop_followed": "Shop followed",
    "loan_requested": "Support requested",
    "loan_repaid": "Full repayment recorded",
    "repayment.claimed": "Payment reported by member",
    "repayment_confirmed": "Payment confirmed",
    "guarantor_success": "Support completed successfully",
    "merchant.delivered": "Delivery recorded",
}


def _safe_str(value: Any, default: str = "Not shown") -> str:
    return safe_pdf_text(value, fallback=default)


def _pdf_value(value: Any, default: str = "Not shown") -> str:
    return escape(_safe_str(value, default))


def _safe_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


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


def _mask_code(code: Optional[str]) -> str:
    raw = str(code or "").strip()
    if not raw:
        return "Not shown"
    tail = raw[-4:] if len(raw) > 4 else raw[-1:]
    return f"***{tail}"


def _event_label(event_type: Any) -> str:
    raw = str(event_type or "").strip().lower()
    if not raw:
        return "Other recorded activity"
    return EVENT_LABELS.get(raw, "Other recorded activity")


def _aggregate_event_counts(events: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for event in events:
        label = _event_label(event.get("event_type"))
        counts[label] = counts.get(label, 0) + 1
    return counts


def _reference_fingerprint(reference: str, generated_at: str) -> str:
    digest = hashlib.sha256(
        f"{reference}|{generated_at}|community-evidence".encode("utf-8")
    ).hexdigest().upper()
    return "-".join(digest[index : index + 4] for index in range(0, 24, 4))


def _styles() -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    return {
        "eyebrow": ParagraphStyle(
            "CommunityEvidenceEyebrow",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=7.5,
            leading=9,
            textColor=GSN_GOLD,
            spaceAfter=2,
        ),
        "answer": ParagraphStyle(
            "CommunityEvidenceAnswer",
            parent=base["Heading1"],
            fontName="Helvetica-Bold",
            fontSize=17,
            leading=20,
            textColor=GSN_NAVY,
        ),
        "section": ParagraphStyle(
            "CommunityEvidenceSection",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=GSN_NAVY,
            spaceBefore=1,
            spaceAfter=4,
        ),
        "body": ParagraphStyle(
            "CommunityEvidenceBody",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.4,
            leading=11,
            textColor=GSN_NAVY,
        ),
        "small": ParagraphStyle(
            "CommunityEvidenceSmall",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.2,
            leading=9,
            textColor=GSN_MUTED,
        ),
        "fact_label": ParagraphStyle(
            "CommunityEvidenceFactLabel",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=6.5,
            leading=8,
            textColor=GSN_MUTED,
        ),
        "fact_value": ParagraphStyle(
            "CommunityEvidenceFactValue",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.3,
            leading=11,
            textColor=GSN_NAVY,
        ),
        "table_head": ParagraphStyle(
            "CommunityEvidenceTableHead",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=6.6,
            leading=8,
            textColor=colors.white,
        ),
        "table_cell": ParagraphStyle(
            "CommunityEvidenceTableCell",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=7.1,
            leading=9,
            textColor=GSN_NAVY,
        ),
    }


def _fact_grid(
    *,
    summary: dict[str, Any],
    community_reference: str,
    styles: dict[str, ParagraphStyle],
) -> Table:
    invites_created = _safe_int(summary.get("invites_created"))
    joins = _safe_int(summary.get("joins_via_invite"))
    conversion = float(summary.get("conversion_rate") or 0)
    facts = [
        ("COMMUNITY ID", community_reference),
        ("INVITES CREATED", str(invites_created)),
        ("JOINED BY INVITE", str(joins)),
        ("INVITE RESPONSE", f"{round(conversion * 100, 1)}%"),
    ]
    cells = []
    for label, value in facts:
        cells.append(
            [
                Paragraph(_pdf_value(label), styles["fact_label"]),
                Spacer(1, 2),
                Paragraph(_pdf_value(value), styles["fact_value"]),
            ]
        )
    table = Table([cells], colWidths=[190, 94, 94, 94])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE),
                ("BOX", (0, 0), (-1, -1), 0.6, GSN_BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, GSN_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def _detail_table(
    rows: list[tuple[str, Any]],
    styles: dict[str, ParagraphStyle],
) -> Table:
    data = [
        [
            Paragraph(_pdf_value(label), styles["fact_label"]),
            Paragraph(_pdf_value(value), styles["body"]),
        ]
        for label, value in rows
    ]
    table = Table(data, colWidths=[132, CONTENT_WIDTH - 132])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, PALE_BLUE]),
                ("BOX", (0, 0), (-1, -1), 0.5, GSN_BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, GSN_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def _entry_table(
    rows: list[dict[str, Any]],
    *,
    redact: bool,
    styles: dict[str, ParagraphStyle],
) -> LongTable:
    if redact:
        headers = ["WHEN", "ENTRY", "INVITE REFERENCE"]
        col_widths = [122, 218, 132]
    else:
        headers = ["WHEN", "JOINED MEMBER", "INVITED BY", "INVITE REFERENCE"]
        col_widths = [104, 132, 132, 104]

    data: list[list[Paragraph]] = [
        [Paragraph(label, styles["table_head"]) for label in headers]
    ]
    if not rows:
        empty = [
            Paragraph("No recent invite-led entries are recorded in this snapshot.", styles["table_cell"])
        ]
        empty.extend(Paragraph("", styles["table_cell"]) for _ in headers[1:])
        data.append(empty)
    else:
        for row in rows[:10]:
            invite_reference = _mask_code(row.get("invite_code"))
            if redact:
                values = [
                    _fmt_dt(row.get("joined_at")),
                    "Member entry recorded",
                    invite_reference,
                ]
            else:
                values = [
                    _fmt_dt(row.get("joined_at")),
                    row.get("joined_user_email") or "Private member contact unavailable",
                    row.get("invited_by_email") or "Private member contact unavailable",
                    str(row.get("invite_code") or "Not shown"),
                ]
            data.append(
                [Paragraph(_pdf_value(value), styles["table_cell"]) for value in values]
            )

    table = LongTable(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GSN_NAVY),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_BLUE]),
                ("BOX", (0, 0), (-1, -1), 0.55, GSN_BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, GSN_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def _activity_table(
    counts: dict[str, int],
    styles: dict[str, ParagraphStyle],
) -> Table:
    data = [
        [
            Paragraph("RECORDED ACTIVITY", styles["table_head"]),
            Paragraph("COUNT", styles["table_head"]),
        ]
    ]
    if counts:
        for label, count in sorted(counts.items()):
            data.append(
                [
                    Paragraph(_pdf_value(label), styles["table_cell"]),
                    Paragraph(_pdf_value(count), styles["table_cell"]),
                ]
            )
    else:
        data.append(
            [
                Paragraph("No recorded activity categories in this snapshot.", styles["table_cell"]),
                Paragraph("0", styles["table_cell"]),
            ]
        )
    table = Table(data, colWidths=[CONTENT_WIDTH - 76, 76], repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), GSN_BLUE),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE_BLUE]),
                ("BOX", (0, 0), (-1, -1), 0.55, GSN_BORDER),
                ("INNERGRID", (0, 0), (-1, -1), 0.3, GSN_BORDER),
                ("ALIGN", (1, 1), (1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def _page_shell(canvas, _doc, *, generated_at: str, reference: str, footer: str) -> None:
    canvas.saveState()
    draw_institutional_header(
        canvas,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        title="GSN Community Evidence Pack",
        subtitle="A redacted snapshot of community entry and recorded activity.",
        generated_at=generated_at,
        reference=reference,
    )
    draw_institutional_footer(canvas, PAGE_WIDTH, footer)
    canvas.setFillColor(GSN_MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(PAGE_WIDTH - 18 * mm, 9 * mm, f"Page {canvas.getPageNumber()}")
    canvas.restoreState()


def build_clan_evidence_pack_pdf(
    db: Session,
    *,
    clan_id: int,
    redact: bool = True,
) -> bytes:
    clan = db.get(Clan, clan_id)
    community_name = getattr(clan, "name", None) if clan else None
    community_reference = (
        getattr(clan, "community_code", None) if clan else None
    ) or f"GSN-C-{int(clan_id):06d}"

    analytics = get_invite_analytics(db, clan_id=clan_id, top_n=10) or {}
    recent = get_recent_invite_joins(db, clan_id=clan_id, limit=20) or []
    trust_events = get_trust_events_timeline(db, clan_id=clan_id, limit=300) or []
    summary = analytics.get("summary") or {}
    event_counts = _aggregate_event_counts(trust_events)
    event_total = sum(event_counts.values())
    joins = _safe_int(summary.get("joins_via_invite"))
    revoked = _safe_int(summary.get("invites_revoked"))
    unique_used = _safe_int(summary.get("unique_invites_used"))
    generated_at = utc_generated_label()
    latest_entry = _fmt_dt(recent[0].get("joined_at")) if recent else "None in this snapshot"

    if joins == 1:
        answer = "1 invite-led community entry is recorded."
    elif joins > 1:
        answer = f"{joins} invite-led community entries are recorded."
    else:
        answer = "No invite-led community entries are recorded."

    explanation = (
        f"This snapshot covers {_safe_str(community_name, 'this community')} at export. "
        "It shows recorded activity, not a person's current membership or identity."
    )
    decision_colour = SUCCESS_GREEN if joins or event_total else WARNING_AMBER
    styles = _styles()
    footer = (
        "GSN community evidence paper - controlled community trust record; "
        "not a bank guarantee, credit approval, payment instruction, or automatic debit authority."
    )

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        title="GSN Community Evidence Pack",
        author="Global Support Network",
        subject="Redacted community entry and activity evidence",
        pagesize=A4,
        leftMargin=48,
        rightMargin=48,
        topMargin=80 * mm,
        bottomMargin=48,
    )
    elements = []
    elements.append(Paragraph("COMMUNITY EVIDENCE SNAPSHOT", styles["eyebrow"]))
    elements.append(Spacer(1, 4))

    decision = Table(
        [
            [Paragraph(_pdf_value(answer), styles["answer"])],
            [Paragraph(_pdf_value(explanation), styles["body"])],
        ],
        colWidths=[CONTENT_WIDTH],
    )
    decision.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE_GOLD),
                ("BOX", (0, 0), (-1, -1), 0.7, GSN_GOLD),
                ("LINEBEFORE", (0, 0), (0, -1), 4, decision_colour),
                ("LEFTPADDING", (0, 0), (-1, -1), 13),
                ("RIGHTPADDING", (0, 0), (-1, -1), 13),
                ("TOPPADDING", (0, 0), (-1, 0), 9),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 2),
                ("TOPPADDING", (0, 1), (-1, 1), 0),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 9),
            ]
        )
    )
    elements.append(decision)
    elements.append(Spacer(1, 8))
    elements.append(
        _fact_grid(
            summary=summary,
            community_reference=community_reference,
            styles=styles,
        )
    )
    elements.append(Spacer(1, 8))

    elements.append(Paragraph("Decision Boundary", styles["section"]))
    elements.append(
        _detail_table(
            [
                (
                    "What this confirms",
                    "Invite creation, revocation, invite-led entry, and activity counts recorded for this community at export.",
                ),
                (
                    "What this does not confirm",
                    "A person's current membership, identity, payment, delivery, credit approval, or a guarantee.",
                ),
                (
                    "First thing to do",
                    "Check the current community membership or source record before a high-risk decision.",
                ),
                (
                    "Privacy",
                    "Private member contacts, internal member IDs, and complete invite codes are not printed in the redacted share copy.",
                ),
            ],
            styles,
        )
    )
    elements.append(Spacer(1, 8))

    elements.append(Paragraph("Recent invite-led entries", styles["section"]))
    elements.append(_entry_table(recent, redact=bool(redact), styles=styles))
    elements.append(Spacer(1, 8))

    visibility = "Redacted share copy" if redact else "Controlled complete record"
    security = Table(
        [
            [
                [
                    Paragraph("VISIBILITY", styles["fact_label"]),
                    Spacer(1, 2),
                    Paragraph(_pdf_value(visibility), styles["fact_value"]),
                ],
                [
                    Paragraph("REFERENCE FINGERPRINT", styles["fact_label"]),
                    Spacer(1, 2),
                    Paragraph(
                        _pdf_value(_reference_fingerprint(community_reference, generated_at)),
                        styles["fact_value"],
                    ),
                ],
            ]
        ],
        colWidths=[188, CONTENT_WIDTH - 188],
    )
    security.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PALE_BLUE),
                ("BOX", (0, 0), (-1, -1), 0.5, GSN_BORDER),
                ("LINEBEFORE", (1, 0), (1, 0), 0.35, GSN_BORDER),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    elements.append(
        KeepTogether(
            [
                Paragraph("Recorded activity summary", styles["section"]),
                _activity_table(event_counts, styles),
                Spacer(1, 8),
                Paragraph("Record security", styles["section"]),
                security,
                Spacer(1, 4),
                Paragraph(
                    f"Latest recorded entry: {_pdf_value(latest_entry)}. Invites revoked: {revoked}. Unique invite references used: {unique_used}. The fingerprint is a lookup aid, not a digital signature.",
                    styles["small"],
                ),
            ]
        )
    )

    def shell(canvas, built_doc):
        _page_shell(
            canvas,
            built_doc,
            generated_at=generated_at,
            reference=community_reference,
            footer=footer,
        )

    doc.build(elements, onFirstPage=shell, onLaterPages=shell)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
