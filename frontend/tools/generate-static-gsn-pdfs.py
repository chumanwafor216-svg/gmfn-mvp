from __future__ import annotations

from io import BytesIO
from pathlib import Path
import sys

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = ROOT / "gmfn_backend"
sys.path.insert(0, str(BACKEND_ROOT))

from app.services.institutional_pdf import (  # noqa: E402
    draw_institutional_footer,
    draw_institutional_header,
    safe_pdf_text,
)


STATIC_SUMMARY_GENERATED_AT = "2026-06-27 00:00 UTC"
STATIC_SUMMARY_REFERENCE = "GSN-EXECUTIVE-SUMMARY-2026-06-27"


CAPABILITIES = [
    "Recognised Community Identity",
    "Governed Membership and Roles",
    "Invite and QR Entry",
    "Official Announcements and Response Evidence",
    "Meetings, Attendance and Decision Memory",
    "TrustPassport and TrustSlip Evidence",
    "Community Marketplace and Public Shop",
    "DemandBox and Ask Community",
    "Support, Welfare and Contribution Records",
    "Opportunity and Activity Analytics",
    "Documents, Downloads and Bridges",
    "Continuity, Handover and Institutional Memory",
]


CAPABILITY_EXPLANATIONS = {
    "Recognised Community Identity": (
        "Real-world decision: a community needs a recognised identity beyond a chat name, paper list, or one leader's phone. "
        "Risk: authority, membership, public claims, and history become unclear when people or devices change. "
        "GSN changes the decision by giving the group a governed identity space. Tools: Community Domain, Community Profile, public community record, setup pack, and handover notes. "
        "Evidence left: community name, owner context, member boundary, public identity, setup material, and handover trail."
    ),
    "Governed Membership and Roles": (
        "Real-world decision: a group must decide who belongs, who manages, who publishes, and who only reads. "
        "Risk: if everyone has the same power, official surfaces, private evidence, and member safety weaken. "
        "GSN changes the decision by separating leaders, admins, members, visitors, and public readers. Tools: join path, invite or QR entry, member review, admin tools, and role-aware surfaces. "
        "Evidence left: entry path, membership status, role context, approval posture, and action boundary."
    ),
    "Invite and QR Entry": (
        "Real-world decision: people need to enter the right community, document, shop, or setup flow without typing long links. "
        "Risk: manual transfer creates wrong links, repeated questions, and weak onboarding evidence. "
        "GSN changes the decision by using invite and QR paths for the intended surface. Tools: invite links, QR entry, QR download index, and public/member link boundaries. "
        "Evidence left: invite path, QR target, document target, audience label, and access boundary."
    ),
    "Official Announcements and Response Evidence": (
        "Real-world decision: leaders need official notices to remain findable and response to be readable. "
        "Risk: important messages disappear under ordinary chat noise and follow-up becomes guesswork. "
        "GSN changes the decision by separating official notices from response signals. Tools: bulletin, acknowledgement, availability, response signals, and follow-up path. "
        "Evidence left: notice source, acknowledgement, availability, response path, timestamp, and follow-up need."
    ),
    "Meetings, Attendance and Decision Memory": (
        "Real-world decision: meetings need agenda, attendance, decisions, files, action owners, and follow-up. "
        "Risk: communities repeat decisions when memory is scattered or held by one former leader. "
        "GSN changes the decision by connecting meeting and handover evidence. Tools: meeting notice, attendance or sign-in, minutes, action owners, document links, and handover record. "
        "Evidence left: attendance, meeting record, decisions, document links, action ownership, and handover context."
    ),
    "TrustPassport and TrustSlip Evidence": (
        "Real-world decision: a member may need to present identity and trust context outside the circle that already knows them. "
        "Risk: screenshots and informal introductions can expose too much or prove too little. "
        "GSN changes the decision with bounded trust evidence. Tools: GSN ID, TrustPassport, TrustSlip, community credential, and verification boundary. "
        "Evidence left: identity status, credential, TrustSlip code, TrustPassport context, community source, and current verification limit."
    ),
    "Community Marketplace and Public Shop": (
        "Real-world decision: buyers need to know whether product, seller, contact route, media, and verification belong together. "
        "Risk: scattered screenshots and chats make evidence-backed commerce harder to read. "
        "GSN changes the decision with one organised public shop presence. Tools: public shop, shop gallery, Spotlight, WhatsApp or phone contact, and merchant verification. "
        "Evidence left: public shop link, shelf items, media, owner identity, contact path, Spotlight record, and verification entry point."
    ),
    "DemandBox and Ask Community": (
        "Real-world decision: people need work, goods, services, buyers, stock, or help before the right person sees the request. "
        "Risk: opportunity is missed when demand stays hidden in private chats or weak public posts. "
        "GSN changes the decision by routing needs and offers into a structured demand lane. Tools: Ask Community, DemandBox, marketplace needs, public shop, and response path. "
        "Evidence left: need or offer post, requester context, placement, response path, timestamp, and evidence boundary."
    ),
    "Support, Welfare and Contribution Records": (
        "Real-world decision: communities support members, collect contributions, back requests, manage welfare, and track repayment responsibility. "
        "Risk: without records, support becomes pressure and contribution history disappears. "
        "GSN changes the decision by making support and finance evidence reviewable without becoming a bank. Tools: support request, supporter context, finance records, contribution or ROSCA context, and TrustPassport. "
        "Evidence left: amount, purpose, duration, supporter responsibility, contribution event, repayment context, and community source."
    ),
    "Opportunity and Activity Analytics": (
        "Real-world decision: leaders need to read attention, participation, demand, shop movement, and opportunity signals from real activity. "
        "Risk: a view, click, chat, or busy screen can be mistaken for proof of a sale, approval, or guaranteed outcome. "
        "GSN changes the decision by separating signals from proof. Tools: Shop Control, Spotlight attention, DemandBox, Market Wisdom, Opportunity Engine, and analytics summaries. "
        "Evidence left: views, contact taps, demand signals, participation records, shop movement, analytics reading, and visible limits."
    ),
    "Documents, Downloads and Bridges": (
        "Real-world decision: setup papers, forms, QR sheets, public links, and private files need to reach the right people. "
        "Risk: a useful guide can be lost or the wrong material can be exposed. "
        "GSN changes the decision by packaging documents and bridges with audience and access boundaries. Tools: setup pack, QR download index, document links, bulletin bridge, and public/private boundary. "
        "Evidence left: document title, date, QR target, audience label, public/private status, and authenticity mark."
    ),
    "Continuity, Handover and Institutional Memory": (
        "Real-world decision: a community needs to preserve identity, roles, documents, decisions, support evidence, setup history, and handover. "
        "Risk: the organisation restarts whenever a leader changes or a device is lost. "
        "GSN changes the decision by keeping community memory and source material organised over time. Tools: Community Domain, setup pack, handover map, route/recovery map, evidence surfaces, and source-controlled docs. "
        "Evidence left: role structure, document trail, setup history, handover notes, community memory, and current route state."
    ),
}

def validate_capability_explanations() -> None:
    missing = [
        capability for capability in CAPABILITIES if capability not in CAPABILITY_EXPLANATIONS
    ]
    if missing:
        joined = ", ".join(missing)
        raise RuntimeError(f"Missing public PDF capability explanation(s): {joined}")


def wrap_text(text: str, *, max_chars: int = 92) -> list[str]:
    words = safe_pdf_text(text).split()
    lines: list[str] = []
    current: list[str] = []
    for word in words:
        candidate = " ".join([*current, word])
        if current and len(candidate) > max_chars:
            lines.append(" ".join(current))
            current = [word]
        else:
            current.append(word)
    if current:
        lines.append(" ".join(current))
    return lines or [""]


def build_executive_summary_pdf() -> bytes:
    validate_capability_explanations()

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    generated_at = STATIC_SUMMARY_GENERATED_AT
    reference = STATIC_SUMMARY_REFERENCE
    title = "GSN Executive Summary"
    subtitle = "Trust made visible, portable, and usable for stronger communities."

    y = draw_institutional_header(
        pdf,
        width,
        height,
        title=title,
        subtitle=subtitle,
        generated_at=generated_at,
        reference=reference,
        classification="Official GSN summary",
    )

    def new_page() -> None:
        nonlocal y
        draw_institutional_footer(
            pdf,
            width,
            "Global Support Network (GSN). Institutional summary; not a bank guarantee, credit approval, payment instruction, or automatic debit authority.",
        )
        pdf.showPage()
        y = draw_institutional_header(
            pdf,
            width,
            height,
            title=title,
            subtitle=subtitle,
            generated_at=generated_at,
            reference=reference,
            classification="Official GSN summary",
        )

    def line(text: str, *, size: int = 10, gap: int = 13, bold: bool = False) -> None:
        nonlocal y
        if y < 64:
            new_page()
        pdf.setFillColorRGB(0.027, 0.090, 0.173)
        pdf.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        pdf.drawString(56, y, safe_pdf_text(text))
        y -= gap

    def paragraph(text: str, *, size: int = 10, gap: int = 13, max_chars: int = 92) -> None:
        for wrapped in wrap_text(text, max_chars=max_chars):
            line(wrapped, size=size, gap=gap)

    line("Official GSN institutional summary", size=14, gap=20, bold=True)
    paragraph(
        "GSN makes trust visible, portable, and usable across real-world economic activity. "
        "It helps communities turn identity, contribution, repayment, support, trade, and participation "
        "into readable evidence without exposing private records unnecessarily.",
        size=10,
        gap=13,
    )
    line("")
    line("Institutional positioning", size=12, gap=16, bold=True)
    paragraph(
        "GSN is not a social feed and not a bank. It is community trust infrastructure: a way for people, "
        "shops, support circles, and local groups to carry clearer evidence into trade, finance, work, "
        "and decisions that need confidence.",
        size=10,
        gap=13,
    )
    line("")
    line("Strategic gap GSN is built for", size=12, gap=16, bold=True)
    paragraph(
        "Modern SaaS, e-commerce, chat groups, and community platforms often move activity online without "
        "carrying the real trust history, meeting memory, participation evidence, QR transfer, and governed identity that "
        "make people and institutions reliable. GSN addresses that gap by connecting community evidence, "
        "portable trust identity, decision support, evidence-backed commerce, DemandBox signals, community "
        "capital, institutional memory, and commitment discipline in one institutional layer.",
        size=9,
        gap=12,
        max_chars=100,
    )
    paragraph(
        "The ten-year view is simple: as life, commerce, work, support, and verification become more digital, "
        "people will need credible trust records that can travel without exposing private life. GSN is built "
        "to make that record visible, limited, explainable, and useful.",
        size=9,
        gap=12,
        max_chars=100,
    )
    line("")
    line("GSN Core Capabilities", size=12, gap=16, bold=True)
    for index, capability in enumerate(CAPABILITIES, start=1):
        line(f"{index}. {capability}", size=9, gap=11)

    line("")
    line("Decision guide", size=12, gap=16, bold=True)
    for index, capability in enumerate(CAPABILITIES, start=1):
        line(f"{index}. {capability}", size=10, gap=13, bold=True)
        paragraph(
            CAPABILITY_EXPLANATIONS.get(
                capability,
                "Real-world decision: explanation pending. Risk: explanation pending. "
                "GSN changes the decision: explanation pending. Tools: explanation pending. "
                "Evidence left: explanation pending.",
            ),
            size=8,
            gap=10,
            max_chars=105,
        )
        line("", gap=6)

    line("Reader boundary", size=12, gap=16, bold=True)
    paragraph(
        "This paper explains the GSN product and its institutional purpose. It is not a promise that every "
        "member, shop, community, TrustSlip, or support record is verified. Always reopen the current GSN "
        "record, TrustSlip, credential, or public verification link before relying on a screenshot or old copy.",
        size=9,
        gap=12,
    )
    paragraph(
        "Boundary: API-paid verification, regulated payout automation, and full protected trade-release rails "
        "are integration work. Do not read this summary as claiming those paid verification integrations are "
        "live until the current GSN environment proves them end to end.",
        size=9,
        gap=12,
    )

    draw_institutional_footer(
        pdf,
        width,
        "Global Support Network (GSN). Institutional summary; not a bank guarantee, credit approval, payment instruction, or automatic debit authority.",
    )
    pdf.showPage()
    pdf.save()
    data = buffer.getvalue()
    buffer.close()
    return data


def main() -> None:
    output_dir = ROOT / "frontend" / "public"
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_bytes = build_executive_summary_pdf()
    for name in [
        "GSN_FINAL_WHITE.pdf",
        "gmfn-executive-summary.pdf",
        "GMFN_FINAL_WHITE.pdf",
    ]:
        (output_dir / name).write_bytes(pdf_bytes)
    print(f"Wrote {len(pdf_bytes)} bytes to 3 static GSN PDF assets.")


if __name__ == "__main__":
    main()
