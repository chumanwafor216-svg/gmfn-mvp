from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from sqlalchemy.orm import Session

from app.db.models import Clan
from app.services.invite_analytics_service import (
    get_invite_analytics,
    get_recent_invite_joins,
    get_trust_events_timeline,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _mask_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return email
    if "@" not in email:
        return email
    name, domain = email.split("@", 1)
    if len(name) <= 2:
        masked = "*" * len(name)
    else:
        masked = name[:2] + "***"
    return f"{masked}@{domain}"


def build_clan_evidence_pack_pdf(
    db: Session,
    *,
    clan_id: int,
    redact: bool = False,
) -> bytes:
    clan = db.get(Clan, clan_id)
    clan_name = getattr(clan, "name", None) if clan else None

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

    y = height - 50

    def line(text: str, size: int = 11, gap: int = 16, bold: bool = False):
        nonlocal y
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        c.drawString(50, y, text)
        y -= gap

    ts = _utcnow().strftime("%Y-%m-%d %H:%M UTC")

    line("GMFN Evidence Pack (Invite Growth + Trust Audit)", size=16, gap=22, bold=True)
    line(f"Clan ID: {clan_id}", bold=True)
    line(f"Clan Name: {clan_name or '—'}", bold=True)
    line(f"Generated: {ts}")
    line("")

    s = analytics["summary"]
    line("Invite KPIs", bold=True)
    line(f"- Invites created: {s['invites_created']}")
    line(f"- Joins via invite: {s['joins_via_invite']}")
    line(f"- Invites revoked: {s['invites_revoked']}")
    line(f"- Unique invite codes used: {s['unique_invites_used']}")
    line(f"- Conversion rate: {round(s['conversion_rate'] * 100, 1)}%")
    line("")

    line("Top inviters (by joins)", bold=True)
    top_inviters = analytics["top_inviters"]
    if not top_inviters:
        line("- None yet")
    else:
        for r in top_inviters[:8]:
            email = r.get("invited_by_email")
            if redact:
                email = _mask_email(email)
            line(f"- {r['invited_by_user_id']}  |  {email or '—'}  |  joins: {r['joins']}", size=10, gap=14)
    line("")

    line("Recent joins via invite", bold=True)
    if not recent:
        line("- None yet")
    else:
        for r in recent[:10]:
            inviter_email = r.get("invited_by_email")
            joiner_email = r.get("joined_user_email")
            if redact:
                inviter_email = _mask_email(inviter_email)
                joiner_email = _mask_email(joiner_email)
            when = r["joined_at"].strftime("%Y-%m-%d %H:%M") if hasattr(r["joined_at"], "strftime") else str(r["joined_at"])
            line(
                f"- {when} | joiner: {joiner_email or r.get('joined_user_id')} | inviter: {inviter_email or r.get('invited_by_user_id')} | code: {r.get('invite_code')}",
                size=9,
                gap=13,
            )

    line("")
    line("TrustEvent summary counts", bold=True)
    for k in sorted(counts.keys()):
        line(f"- {k}: {counts[k]}")

    line("")
    line("Why this matters (visa / partner framing)", bold=True, gap=18)
    line(
        "GMFN is a trust infrastructure: invite creation, invite use, join actions and revocations are logged as TrustEvents.",
        size=9,
        gap=13,
    )
    line(
        "This creates auditable, privacy-aware accountability in community finance—supporting safer inclusion and scalable governance.",
        size=9,
        gap=13,
    )

    c.showPage()
    c.save()

    pdf_bytes = bio.getvalue()
    bio.close()
    return pdf_bytes
