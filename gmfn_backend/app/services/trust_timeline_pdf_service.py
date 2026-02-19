# app/services/trust_timeline_pdf_service.py

from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

from sqlalchemy.orm import Session

from app.services.trust_timeline_service import list_trust_timeline


def build_trust_timeline_pdf(
    db: Session,
    *,
    user_id: int,
    limit: int = 200,
    audience: str = "user",
    pack_id: Optional[str] = None,
    protocol_version: Optional[str] = None,
    footer: Optional[str] = None,
    score: Optional[str] = None,
    last_change: Optional[Dict[str, Any]] = None,
) -> bytes:
    """
    Produce a printable Trust Timeline PDF ("Why did my trust change?") for evidence packs / pilot support.
    - Deterministic: derived from TrustEvent timeline service.
    - Safe: never relies on floats; deltas are strings in input.
    """

    items: List[Dict[str, Any]] = list_trust_timeline(
        db,
        user_id=int(user_id),
        limit=int(limit),
        audience="admin" if audience == "admin" else "user",
        hide_zero_deltas_for_user=True,
    )

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title="GMFN Trust Timeline Snapshot",
        author="GMFN",
    )

    styles = getSampleStyleSheet()
    elements: List[Any] = []

    elements.append(Paragraph("GMFN Trust Timeline Snapshot", styles["Heading1"]))
    elements.append(Spacer(1, 0.18 * inch))

    meta_lines: List[str] = []
    meta_lines.append(f"User ID: {int(user_id)}")
    if pack_id:
        meta_lines.append(f"Evidence Pack ID: {pack_id}")
    if protocol_version:
        meta_lines.append(f"Protocol: {protocol_version}")
    if score:
        meta_lines.append(f"Score (current): {score}")

    elements.append(Paragraph("<br/>".join(meta_lines), styles["Normal"]))
    elements.append(Spacer(1, 0.18 * inch))

    # Explainability block (reason + note)
    if last_change:
        lc_type = last_change.get("event_type") or last_change.get("source") or "unknown"
        lc_when = last_change.get("created_at") or "—"
        lc_reason = last_change.get("reason") or "—"
        lc_note = last_change.get("note") or "—"

        elements.append(Paragraph("Why did my trust change? (latest)", styles["Heading2"]))
        elements.append(
            Paragraph(
                f"<b>Type:</b> {lc_type}<br/>"
                f"<b>When:</b> {lc_when}<br/>"
                f"<b>Reason:</b> {lc_reason}<br/>"
                f"<b>Note:</b> {lc_note}",
                styles["Normal"],
            )
        )
        elements.append(Spacer(1, 0.2 * inch))

    # Table
    elements.append(Paragraph("Events", styles["Heading2"]))
    elements.append(Spacer(1, 0.10 * inch))

    header = ["When (UTC)", "Type", "Label", "Delta", "Refs", "Reason / Note"]
    rows: List[List[str]] = [header]

    def _safe(s: Any) -> str:
        return "" if s is None else str(s)

    for ev in items:
        created_at = _safe(ev.get("created_at"))
        ev_type = _safe(ev.get("event_type"))
        label = _safe(ev.get("label"))
        delta = _safe(ev.get("delta"))

        loan_id = ev.get("loan_id")
        payment_reference = ev.get("payment_reference")
        guarantor_id = ev.get("guarantor_id")

        refs_bits: List[str] = []
        if loan_id:
            refs_bits.append(f"loan:{loan_id}")
        if payment_reference:
            refs_bits.append(f"ref:{payment_reference}")
        if guarantor_id:
            refs_bits.append(f"guarantor:{guarantor_id}")
        refs = ", ".join(refs_bits) if refs_bits else "—"

        reason = _safe(ev.get("reason"))
        note = _safe(ev.get("note"))
        reason_note = reason if reason else "—"
        if note:
            reason_note = f"{reason_note} | {note}"

        rows.append([created_at, ev_type, label, delta, refs, reason_note])

    table = Table(
        rows,
        colWidths=[1.35 * inch, 1.15 * inch, 1.35 * inch, 0.65 * inch, 1.05 * inch, 2.25 * inch],
        repeatRows=1,
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.whitesmoke),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )

    elements.append(table)
    elements.append(Spacer(1, 0.20 * inch))

    elements.append(
        Paragraph(
            "Disclaimer: This timeline is a community trust record (pilot). It is not a bank guarantee and does not auto-debit any guarantor.",
            styles["Normal"],
        )
    )
    elements.append(Spacer(1, 0.10 * inch))
    elements.append(Paragraph(f"Generated at (UTC): {datetime.now(timezone.utc).isoformat()}", styles["Normal"]))

    if footer:
        elements.append(Spacer(1, 0.15 * inch))
        elements.append(Paragraph(footer, styles["Normal"]))

    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf