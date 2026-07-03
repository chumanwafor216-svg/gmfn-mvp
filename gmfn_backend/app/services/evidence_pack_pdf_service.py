from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from sqlalchemy.orm import Session

from app.db.models import Clan
from app.services.institutional_pdf import (
    draw_institutional_footer,
    draw_institutional_header,
    safe_pdf_text,
    utc_generated_label,
    wrap_pdf_text_lines,
)
from app.services.invite_analytics_service import (
    get_invite_analytics,
    get_recent_invite_joins,
    get_trust_events_timeline,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _member_contact_boundary(email: Optional[str], *, redact: bool) -> str:
    if redact:
        return "private member contact redacted"
    value = str(email or "").strip()
    return value if value else "private member contact unavailable"


def _mask_code(code: Optional[str]) -> str:
    raw = str(code or "").strip()
    if not raw:
        return "-"
    tail = raw[-4:] if len(raw) > 4 else raw[-1:]
    return f"***{tail}"


def _event_label(event_type: str) -> str:
    labels = {
        "invite_created": "Invite created",
        "invite_revoked": "Invite revoked",
        "clan_join_via_invite": "Member joined by invite",
    }
    return labels.get(str(event_type or "").strip(), safe_pdf_text(event_type))


def build_clan_evidence_pack_pdf(
    db: Session,
    *,
    clan_id: int,
    redact: bool = True,
) -> bytes:
    clan = db.get(Clan, clan_id)
    clan_name = getattr(clan, "name", None) if clan else None
    community_reference = getattr(clan, "community_code", None) or f"GSN-C-{int(clan_id):06d}"

    analytics = get_invite_analytics(db, clan_id=clan_id, top_n=10)
    recent = get_recent_invite_joins(db, clan_id=clan_id, limit=20)
    trust_events = get_trust_events_timeline(db, clan_id=clan_id, limit=300)

    # Count event types (quick trust log summary)
    counts = {}
    for ev in trust_events:
        et = ev.get("event_type")
        if et:
            counts[et] = counts.get(et, 0) + 1

    # Prepare PDF
    buf = bytearray()
    from io import BytesIO
    bio = BytesIO()

    c = canvas.Canvas(bio, pagesize=A4)
    width, height = A4

    ts = utc_generated_label()
    y = draw_institutional_header(
        c,
        width,
        height,
        title="GSN Community Evidence Pack",
        subtitle="Invite growth, community entry, and trust audit evidence.",
        generated_at=ts,
        reference=community_reference,
    )
    content_left = 56
    content_width = width - (content_left * 2)

    def line(text: str, size: int = 11, gap: int = 16, bold: bool = False):
        nonlocal y
        if not str(text if text is not None else "").strip():
            y -= gap
            return

        font_name = "Helvetica-Bold" if bold else "Helvetica"
        for wrapped_line in wrap_pdf_text_lines(text, font_name, size, content_width):
            if y < 70:
                draw_institutional_footer(c, width, "GSN community evidence paper")
                c.showPage()
                y = draw_institutional_header(
                    c,
                    width,
                    height,
                    title="GSN Community Evidence Pack",
                    subtitle="Invite growth, community entry, and trust audit evidence.",
                    generated_at=ts,
                    reference=community_reference,
                )
            c.setFont(font_name, size)
            c.drawString(content_left, y, safe_pdf_text(wrapped_line))
            y -= gap

    line("Official evidence summary", size=14, gap=20, bold=True)
    line(f"Community ID: {community_reference}", bold=True)
    line(f"Community Name: {clan_name or '-'}", bold=True)
    line(f"Generated: {ts}")
    line("")

    s = analytics["summary"]
    line("Community entry summary", bold=True)
    line(f"- Invites created: {s['invites_created']}")
    line(f"- Members joined by invite: {s['joins_via_invite']}")
    line(f"- Invites revoked: {s['invites_revoked']}")
    line(f"- Unique invite codes used: {s['unique_invites_used']}")
    line(f"- Conversion rate: {round(s['conversion_rate'] * 100, 1)}%")
    line("")

    line("Invite activity", bold=True)
    top_inviters = analytics["top_inviters"]
    if not top_inviters:
        line("- None yet")
    else:
        for r in top_inviters[:8]:
            contact = _member_contact_boundary(r.get("invited_by_email"), redact=redact)
            line(f"- inviter contact: {contact} | joins: {r['joins']}", size=10, gap=14)
    line("")

    line("Recent community entries", bold=True)
    if not recent:
        line("- None yet")
    else:
        for r in recent[:10]:
            inviter_contact = _member_contact_boundary(r.get("invited_by_email"), redact=redact)
            joiner_contact = _member_contact_boundary(r.get("joined_user_email"), redact=redact)
            when = r["joined_at"].strftime("%Y-%m-%d %H:%M") if hasattr(r["joined_at"], "strftime") else str(r["joined_at"])
            invite_code = _mask_code(r.get("invite_code")) if redact else str(r.get("invite_code") or "-")
            line(
                f"- {when} | joiner: {joiner_contact} | inviter: {inviter_contact} | code: {invite_code}",
                size=9,
                gap=13,
            )

    line("")
    line("Evidence activity summary", bold=True)
    for k in sorted(counts.keys()):
        line(f"- {_event_label(k)}: {counts[k]}")

    line("")
    line("Reader boundary", bold=True, gap=18)
    line(
        "This paper is evidence for controlled community review. It is not a bank guarantee, credit approval, payment instruction, or automatic debit authority.",
        size=9,
        gap=13,
    )
    line(
        "Use the redacted share copy for outside review. Use the complete record only when the reviewer is allowed to see private member details.",
        size=9,
        gap=13,
    )

    draw_institutional_footer(c, width, "GSN community evidence paper - controlled community trust record.")
    c.showPage()
    c.save()

    pdf_bytes = bio.getvalue()
    bio.close()
    return pdf_bytes
