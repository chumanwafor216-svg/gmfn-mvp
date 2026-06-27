from __future__ import annotations

from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Dict, Iterable, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas
from sqlalchemy.orm import Session

from app.db.models import TrustEvent, User
from app.services.institutional_pdf import (
    draw_institutional_footer,
    draw_institutional_header,
    safe_pdf_text,
    utc_generated_label,
)
from app.services.trust_slips_services import get_trust_slip_payload

PAGE_WIDTH, PAGE_HEIGHT = A4

LEFT = 18 * mm
RIGHT = PAGE_WIDTH - 18 * mm
TOP = PAGE_HEIGHT - 18 * mm
BOTTOM = 16 * mm

FONT = "Helvetica"
FONT_BOLD = "Helvetica-Bold"


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_str(x: Any, default: str = "-") -> str:
    if x is None:
        return default
    s = str(x).strip()
    return s if s else default


def _safe_int(x: Any, default: int = 0) -> int:
    try:
        return int(x)
    except Exception:
        return default


def _timeline_contact_boundary() -> str:
    return "redacted for timeline PDF"


def _audience_label(audience: Any) -> str:
    value = _safe_str(audience, "user").strip().lower()
    if value == "admin":
        return "admin redacted review"
    return "controlled reader review"


def _fmt_dt(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, datetime):
        try:
            if value.tzinfo is None:
                value = value.replace(tzinfo=timezone.utc)
            return value.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        except Exception:
            return str(value)
    s = str(value).strip()
    return s or "-"


def _load_events(db: Session, *, user_id: int, limit: int) -> list[TrustEvent]:
    return (
        db.query(TrustEvent)
        .filter(TrustEvent.subject_user_id == int(user_id))
        .order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(int(limit))
        .all()
    )


def _line(c: canvas.Canvas, y: float, color=colors.HexColor("#E2E8F0"), width: float = 1.0) -> None:
    c.saveState()
    c.setStrokeColor(color)
    c.setLineWidth(width)
    c.line(LEFT, y, RIGHT, y)
    c.restoreState()


def _draw_text(c: canvas.Canvas, x: float, y: float, text: str, *, size: int = 10, bold: bool = False,
               color=colors.black) -> None:
    c.setFont(FONT_BOLD if bold else FONT, size)
    c.setFillColor(color)
    c.drawString(x, y, safe_pdf_text(text))


def _draw_right_text(c: canvas.Canvas, x_right: float, y: float, text: str, *, size: int = 10, bold: bool = False,
                     color=colors.black) -> None:
    font_name = FONT_BOLD if bold else FONT
    c.setFont(font_name, size)
    c.setFillColor(color)
    width = stringWidth(text, font_name, size)
    c.drawString(x_right - width, y, text)


def _wrap_text(c: canvas.Canvas, text: str, max_width: float, *, size: int = 10, bold: bool = False) -> list[str]:
    font_name = FONT_BOLD if bold else FONT
    c.setFont(font_name, size)

    words = (text or "").split()
    if not words:
        return ["-"]

    lines: list[str] = []
    current = words[0]

    for word in words[1:]:
        candidate = f"{current} {word}"
        if stringWidth(candidate, font_name, size) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word

    lines.append(current)
    return lines


def _draw_wrapped_block(
    c: canvas.Canvas,
    x: float,
    y: float,
    text: str,
    *,
    max_width: float,
    size: int = 10,
    leading: int = 13,
    bold: bool = False,
    color=colors.black,
) -> float:
    lines = _wrap_text(c, text, max_width, size=size, bold=bold)
    c.setFont(FONT_BOLD if bold else FONT, size)
    c.setFillColor(color)

    yy = y
    for line in lines:
        c.drawString(x, yy, line)
        yy -= leading
    return yy


def _ensure_space(c: canvas.Canvas, y: float, needed: float, footer_text: Optional[str]) -> float:
    if y - needed < BOTTOM:
        _draw_footer(c, footer_text=footer_text)
        c.showPage()
        return _draw_page_frame(c)
    return y


def _draw_page_frame(c: canvas.Canvas) -> float:
    return draw_institutional_header(
        c,
        PAGE_WIDTH,
        PAGE_HEIGHT,
        title="GSN Trust Timeline Evidence Report",
        subtitle="Trust history, TrustSlip portability, and cross-community integrity context.",
        generated_at=utc_generated_label(),
        reference="Trust Timeline",
    )


def _draw_footer(c: canvas.Canvas, *, footer_text: Optional[str]) -> None:
    draw_institutional_footer(
        c,
        PAGE_WIDTH,
        footer_text or "GSN trust timeline evidence paper - controlled community trust record.",
    )
    page_no = f"Page {c.getPageNumber()}"
    _draw_right_text(c, RIGHT, 9 * mm, page_no, size=8, color=colors.HexColor("#64748B"))


def _section_title(c: canvas.Canvas, y: float, title: str, subtitle: Optional[str] = None) -> float:
    _draw_text(c, LEFT, y, title, size=13, bold=True, color=colors.HexColor("#0F172A"))
    y -= 6 * mm
    if subtitle:
        y = _draw_wrapped_block(
            c,
            LEFT,
            y,
            subtitle,
            max_width=(RIGHT - LEFT),
            size=9,
            leading=11,
            color=colors.HexColor("#475569"),
        )
        y -= 2 * mm
    _line(c, y)
    y -= 5 * mm
    return y


def _kv_pair(c: canvas.Canvas, x: float, y: float, label: str, value: str, *, col_width: float) -> float:
    _draw_text(c, x, y, label, size=8, bold=True, color=colors.HexColor("#64748B"))
    y -= 4 * mm
    y = _draw_wrapped_block(
        c,
        x,
        y,
        value,
        max_width=col_width,
        size=10,
        leading=12,
        bold=True,
        color=colors.HexColor("#0F172A"),
    )
    return y


def _draw_identity_block(c: canvas.Canvas, y: float, user: Optional[User], trustslip: Dict[str, Any]) -> float:
    y = _section_title(
        c,
        y,
        "1. Identity & Evidence Context",
        "Permanent member identity and export alignment context used across GSN trust infrastructure.",
    )

    col_gap = 10 * mm
    total_width = RIGHT - LEFT
    col_width = (total_width - col_gap) / 2

    x1 = LEFT
    x2 = LEFT + col_width + col_gap

    y1 = _kv_pair(c, x1, y, "GSN ID", _safe_str(trustslip.get("gmfn_id")), col_width=col_width)
    y2 = _kv_pair(c, x2, y, "Private contact", _timeline_contact_boundary(), col_width=col_width)

    y_next = min(y1, y2) - 3 * mm

    y1 = _kv_pair(c, x1, y_next, "Phone Verification", "Verified" if trustslip.get("phone_verified") else "Not verified", col_width=col_width)
    y2 = _kv_pair(c, x2, y_next, "Export Generated At", _safe_str(trustslip.get("generated_at")), col_width=col_width)

    return min(y1, y2) - 5 * mm


def _draw_scoring_block(
    c: canvas.Canvas,
    y: float,
    trustslip: Dict[str, Any],
    score: Optional[str],
    last_change: Optional[Dict[str, Any]],
) -> float:
    y = _section_title(
        c,
        y,
        "2. Trust, CCI & TrustSlip Summary",
        "High-level integrity summary derived from TrustEvents, trust scoring, Cross-Community Integrity, and current support context.",
    )

    col_gap = 8 * mm
    cols = 3
    total_width = RIGHT - LEFT
    col_width = (total_width - (col_gap * (cols - 1))) / cols

    xs = [LEFT, LEFT + col_width + col_gap, LEFT + 2 * (col_width + col_gap)]

    row_y = y
    pairs = [
        ("Trust Score", _safe_str(score or trustslip.get("trust_score"))),
        ("CCI Score", _safe_str(trustslip.get("cci_score"))),
        ("CCI Band", _safe_str(trustslip.get("cci_band"))),
        ("TrustSlip Code", _safe_str(trustslip.get("code"))),
        ("Trust-limit signal", f"{_safe_str(trustslip.get('trust_limit'))} {_safe_str(trustslip.get('currency'), '')}".strip()),
        ("Visibility Policy", _safe_str(trustslip.get("merchant_visibility_level"), "standard")),
    ]

    for i in range(0, len(pairs), 3):
        chunk = pairs[i:i + 3]
        row_bottoms = []
        for j, (label, value) in enumerate(chunk):
            row_bottoms.append(_kv_pair(c, xs[j], row_y, label, value, col_width=col_width))
        row_y = min(row_bottoms) - 5 * mm

    if last_change:
        y = row_y
        _draw_text(c, LEFT, y, "Latest trust change", size=9, bold=True, color=colors.HexColor("#64748B"))
        y -= 4 * mm

        summary = (
            f"Type: {_safe_str(last_change.get('event_type'))} | "
            f"When: {_safe_str(last_change.get('created_at'))} | "
            f"Reason: {_safe_str(last_change.get('reason'))}"
        )
        y = _draw_wrapped_block(
            c,
            LEFT,
            y,
            summary,
            max_width=(RIGHT - LEFT),
            size=10,
            leading=12,
            color=colors.HexColor("#0F172A"),
        )
        y -= 4 * mm
        return y

    return row_y


def _draw_trustslip_block(c: canvas.Canvas, y: float, trustslip: Dict[str, Any]) -> float:
    y = _section_title(
        c,
        y,
        "3. TrustSlip Portability Summary",
        "Portable evidence snapshot intended for verification, context, and careful merchant judgement.",
    )

    col_gap = 10 * mm
    total_width = RIGHT - LEFT
    col_width = (total_width - col_gap) / 2

    x1 = LEFT
    x2 = LEFT + col_width + col_gap

    y1 = _kv_pair(c, x1, y, "Status", _safe_str(trustslip.get("status"), "active"), col_width=col_width)
    y2 = _kv_pair(c, x2, y, "Expires At", _safe_str(trustslip.get("expires_at")), col_width=col_width)

    y_next = min(y1, y2) - 3 * mm

    y1 = _kv_pair(c, x1, y_next, "Last Full Repayment", _safe_str(trustslip.get("last_full_repayment_at")), col_width=col_width)
    y2 = _kv_pair(c, x2, y_next, "Last Merchant Release", _safe_str(trustslip.get("last_release_at")), col_width=col_width)

    y = min(y1, y2) - 4 * mm

    disclaimer = _safe_str(
        trustslip.get("disclaimer"),
        "Community-backed integrity signal. Not a bank guarantee. No auto-debit.",
    )
    y = _draw_wrapped_block(
        c,
        LEFT,
        y,
        f"Disclaimer: {disclaimer}",
        max_width=(RIGHT - LEFT),
        size=9,
        leading=11,
        color=colors.HexColor("#475569"),
    )

    return y - 4 * mm


def _iter_sponsors(trustslip: Dict[str, Any]) -> Iterable[Dict[str, Any]]:
    sponsors = trustslip.get("sponsors")
    if isinstance(sponsors, list):
        for row in sponsors:
            if isinstance(row, dict):
                yield row


def _draw_sponsors_block(c: canvas.Canvas, y: float, trustslip: Dict[str, Any], footer_text: Optional[str]) -> float:
    sponsors = list(_iter_sponsors(trustslip))
    if not sponsors:
        return y

    y = _section_title(
        c,
        y,
        "4. Sponsor / Support References",
        "Limited support references associated with TrustGraph-backed TrustSlip issuance.",
    )

    for idx, sponsor in enumerate(sponsors[:6], start=1):
        y = _ensure_space(c, y, 28 * mm, footer_text)

        c.setStrokeColor(colors.HexColor("#E2E8F0"))
        c.setFillColor(colors.HexColor("#F8FAFC"))
        c.roundRect(LEFT, y - 16 * mm, RIGHT - LEFT, 14 * mm, 3 * mm, stroke=1, fill=1)

        _draw_text(c, LEFT + 3 * mm, y - 4 * mm, f"Sponsor {idx}", size=9, bold=True, color=colors.HexColor("#0F172A"))
        _draw_text(c, LEFT + 3 * mm, y - 8 * mm, f"GSN ID: {_safe_str(sponsor.get('gmfn_id'))}", size=9)
        _draw_text(c, LEFT + 70 * mm, y - 8 * mm, f"Type: {_safe_str(sponsor.get('edge_type'))}", size=9)
        _draw_text(c, LEFT + 3 * mm, y - 12 * mm, f"Contact: {_timeline_contact_boundary()}", size=9)
        _draw_text(c, LEFT + 70 * mm, y - 12 * mm, f"Phone verified: {'Yes' if sponsor.get('phone_verified') else 'No'}", size=9)

        weight = sponsor.get("weight")
        confidence = sponsor.get("confidence")
        if weight is not None or confidence is not None:
            _draw_text(
                c,
                LEFT + 120 * mm,
                y - 12 * mm,
                f"W: {_safe_str(weight)}  C: {_safe_str(confidence)}",
                size=8,
                color=colors.HexColor("#475569"),
            )

        y -= 19 * mm

    return y


def _event_meta_summary(meta: Any, *, redact: bool = True) -> str:
    if not isinstance(meta, dict):
        return ""

    if redact and any(value not in (None, "") for value in meta.values()):
        return "private event details redacted for timeline PDF"

    parts: list[str] = []

    for key in (
        "reason",
        "note",
        "status",
        "amount",
        "currency",
        "released_amount",
        "default_amount",
    ):
        if key in meta and meta.get(key) not in (None, ""):
            parts.append(f"{key}={meta.get(key)}")

    return " | ".join(parts)


def _draw_capacity_block(c: canvas.Canvas, y: float, trustslip: Dict[str, Any]) -> float:
    evidence_summary = trustslip.get("evidence_summary", {}) or {}
    capacity = evidence_summary.get("capacity_context", {}) or {}
    readiness = evidence_summary.get("readiness_context", {}) or {}

    y = _section_title(
        c,
        y,
        "5. Current Support Capacity & Readiness Context",
        "Current support-capacity and coverability summary aligned to the same evidence surface.",
    )

    col_gap = 8 * mm
    cols = 3
    total_width = RIGHT - LEFT
    col_width = (total_width - (col_gap * (cols - 1))) / cols
    xs = [LEFT, LEFT + col_width + col_gap, LEFT + 2 * (col_width + col_gap)]

    row_y = y
    pairs = [
        ("Available support capacity", _safe_str(capacity.get("available_guarantee_capacity"))),
        ("Current locked support", _safe_str(capacity.get("current_locked_guarantees"))),
        ("Risk Level", _safe_str(capacity.get("risk_level"))),
        ("Readiness", _safe_str(readiness.get("recommendation"))),
        ("Readiness Score", _safe_str(readiness.get("readiness_score"))),
        ("Support capacity ratio", _safe_str(readiness.get("capacity_ratio"))),
    ]

    for i in range(0, len(pairs), 3):
        chunk = pairs[i:i + 3]
        row_bottoms = []
        for j, (label, value) in enumerate(chunk):
            row_bottoms.append(_kv_pair(c, xs[j], row_y, label, value, col_width=col_width))
        row_y = min(row_bottoms) - 5 * mm

    reasons = list(readiness.get("reasons", []) or [])
    if reasons:
        _draw_text(c, LEFT, row_y, "Readiness reasons", size=9, bold=True, color=colors.HexColor("#64748B"))
        row_y -= 4 * mm
        row_y = _draw_wrapped_block(
            c,
            LEFT,
            row_y,
            ", ".join(str(r) for r in reasons),
            max_width=(RIGHT - LEFT),
            size=9,
            leading=11,
            color=colors.HexColor("#475569"),
        )
        row_y -= 4 * mm

    return row_y


def _draw_events_block(
    c: canvas.Canvas,
    y: float,
    events: list[TrustEvent],
    *,
    footer_text: Optional[str],
    redact: bool = True,
) -> float:
    y = _section_title(
        c,
        y,
        "6. Recent Trust Events",
        "Append-only event trail supporting deterministic trust explanation and auditability.",
    )

    if not events:
        _draw_text(c, LEFT, y, "No recent trust events found.", size=10, color=colors.HexColor("#475569"))
        return y - 8 * mm

    header_y = y
    _draw_text(c, LEFT, header_y, "When", size=8, bold=True, color=colors.HexColor("#64748B"))
    _draw_text(c, LEFT + 40 * mm, header_y, "Event Type", size=8, bold=True, color=colors.HexColor("#64748B"))
    _draw_text(c, LEFT + 92 * mm, header_y, "Notes", size=8, bold=True, color=colors.HexColor("#64748B"))
    y -= 4 * mm
    _line(c, y)
    y -= 5 * mm

    for e in events:
        y = _ensure_space(c, y, 18 * mm, footer_text)

        when_text = _fmt_dt(getattr(e, "created_at", None))
        event_type = _safe_str(getattr(e, "event_type", None))
        meta_summary = _event_meta_summary(getattr(e, "meta", None), redact=redact)

        _draw_text(c, LEFT, y, when_text, size=8, color=colors.HexColor("#0F172A"))
        event_bottom = _draw_wrapped_block(
            c,
            LEFT + 40 * mm,
            y,
            event_type,
            max_width=48 * mm,
            size=8,
            leading=10,
            bold=True,
            color=colors.HexColor("#0F172A"),
        )
        notes_bottom = _draw_wrapped_block(
            c,
            LEFT + 92 * mm,
            y,
            meta_summary or "-",
            max_width=(RIGHT - (LEFT + 92 * mm)),
            size=8,
            leading=10,
            color=colors.HexColor("#475569"),
        )

        y = min(event_bottom, notes_bottom) - 3 * mm
        _line(c, y, color=colors.HexColor("#F1F5F9"), width=0.7)
        y -= 4 * mm

    return y


def _draw_evidence_block(
    c: canvas.Canvas,
    y: float,
    *,
    pack_id: Optional[str],
    protocol_version: Optional[str],
    footer_text: Optional[str],
) -> float:
    y = _section_title(
        c,
        y,
        "7. Evidence Pack Context",
        "Export-level metadata used to align this PDF with ZIP evidence packs and protocol snapshots.",
    )

    col_gap = 10 * mm
    total_width = RIGHT - LEFT
    col_width = (total_width - col_gap) / 2

    x1 = LEFT
    x2 = LEFT + col_width + col_gap

    y1 = _kv_pair(c, x1, y, "Pack ID", _safe_str(pack_id), col_width=col_width)
    y2 = _kv_pair(c, x2, y, "Protocol Version", _safe_str(protocol_version), col_width=col_width)

    y = min(y1, y2) - 4 * mm

    y = _draw_wrapped_block(
        c,
        LEFT,
        y,
        f"Footer / alignment note: {_safe_str(footer_text)}",
        max_width=(RIGHT - LEFT),
        size=9,
        leading=11,
        color=colors.HexColor("#475569"),
    )

    return y - 4 * mm


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
    pack_meta: Optional[Dict[str, Any]] = None,
    redact: bool = True,
) -> bytes:
    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)

    if isinstance(pack_meta, dict):
        pack_id = pack_id or _safe_str(pack_meta.get("pack_id"), "")
        protocol_version = protocol_version or _safe_str(pack_meta.get("protocol_version"), "")

    user = db.get(User, int(user_id))
    trustslip = get_trust_slip_payload(db, user_id=int(user_id))
    events = _load_events(db, user_id=int(user_id), limit=max(1, min(int(limit), 300)))

    y = _draw_page_frame(c)

    _draw_right_text(c, RIGHT, y, f"Audience: {_audience_label(audience)}", size=9, bold=True, color=colors.HexColor("#475569"))
    y -= 5 * mm
    _line(c, y)
    y -= 6 * mm

    y = _draw_wrapped_block(
        c,
        LEFT,
        y,
        "Reader boundary: redacted personal trust history for controlled review. Not a bank guarantee, credit approval, payment instruction, or automatic debit authority.",
        max_width=(RIGHT - LEFT),
        size=9,
        leading=11,
        bold=True,
        color=colors.HexColor("#475569"),
    )
    y -= 4 * mm

    y = _draw_identity_block(c, y, user, trustslip)
    y = _ensure_space(c, y, 42 * mm, footer)

    y = _draw_scoring_block(c, y, trustslip, score, last_change)
    y = _ensure_space(c, y, 36 * mm, footer)

    y = _draw_trustslip_block(c, y, trustslip)
    y = _ensure_space(c, y, 32 * mm, footer)

    y = _draw_sponsors_block(c, y, trustslip, footer)
    y = _ensure_space(c, y, 42 * mm, footer)

    y = _draw_capacity_block(c, y, trustslip)
    y = _ensure_space(c, y, 60 * mm, footer)

    y = _draw_events_block(c, y, events, footer_text=footer, redact=redact)
    y = _ensure_space(c, y, 30 * mm, footer)

    y = _draw_evidence_block(
        c,
        y,
        pack_id=pack_id,
        protocol_version=protocol_version,
        footer_text=footer,
    )

    _draw_footer(c, footer_text=footer)
    c.showPage()
    c.save()

    data = buf.getvalue()
    buf.close()
    return data
