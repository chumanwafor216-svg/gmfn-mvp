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
    "Release Before Payment",
    "Evidence-Backed Buying and Selling",
    "Cross-Community Trade",
    "Fraud Reduction Before Action",
    "Spotlight Visibility",
    "Reputation-Based Visibility",
    "Marketplace Presence Across Communities",
    "People-Backed Loans",
    "Supporting Others",
    "Emergency Support",
    "Diaspora Trust Bridge",
    "Trust Savings (ROSCA Support)",
    "Contribution Tracking",
    "Continuity Across Distance",
    "Portable Trust Identity",
    "Reputation Mobility",
    "One Global Shop",
    "Service Economy Participation",
    "Trust-Based Hiring",
    "Demand Box",
    "Community Economic Power",
    "Commitment Builder",
]


CAPABILITY_EXPLANATIONS = {
    "Release Before Payment": (
        "What it is: a trust-first trade posture where evidence is checked "
        "before goods, services, or value are released on confidence. How it "
        "works: GSN can surface TrustSlip, community context, shop identity, "
        "and reader warnings before a decision. Why it matters: it lowers the "
        "chance of preventable loss without pretending that GSN is already a "
        "full escrow or automated release rail."
    ),
    "Evidence-Backed Buying and Selling": (
        "What it is: marketplace activity strengthened by identity, community "
        "signals, and readable trust evidence. How it works: GSN gives buyers "
        "and sellers public shop, TrustSlip, demand, and verification cues so "
        "they can ask better questions before acting. Why it matters: commerce "
        "becomes less dependent on guesswork, screenshots, or noise."
    ),
    "Cross-Community Trade": (
        "What it is: the ability for trust earned in one community to support "
        "decisions in another. How it works: GSN connects community membership, "
        "shop presence, TrustSlip, and public verification so a person or "
        "merchant does not restart from zero. Why it matters: trustworthy "
        "people and businesses can travel farther without losing accountability."
    ),
    "Fraud Reduction Before Action": (
        "What it is: a prevention layer that encourages checks before money, "
        "goods, work, or support are committed. How it works: GSN exposes "
        "limited trust evidence, mismatch warnings, stale-record warnings, and "
        "community confirmation paths. Why it matters: the strongest fraud "
        "control is often a timely question before the loss happens."
    ),
    "Spotlight Visibility": (
        "What it is: a focused way to show one product, service, update, or "
        "community signal without turning the app into a noisy feed. How it "
        "works: GSN presents active spotlight material with status, context, "
        "and contact routes. Why it matters: visibility becomes tied to useful "
        "community context instead of attention alone."
    ),
    "Reputation-Based Visibility": (
        "What it is: a visibility model where trust quality can shape how "
        "people, shops, and opportunities are presented. How it works: GSN "
        "can combine trust readings, community evidence, and marketplace "
        "context into calmer decision surfaces. Why it matters: better "
        "reputation should create clearer access while weak evidence stays "
        "appropriately limited."
    ),
    "Marketplace Presence Across Communities": (
        "What it is: a merchant or member presence that can be understood "
        "outside one local group. How it works: GSN links public shop, gallery, "
        "vault, demand, community, and TrustSlip surfaces. Why it matters: "
        "market access can grow while the reader still sees where the claim "
        "comes from."
    ),
    "People-Backed Loans": (
        "What it is: support shaped by people, responsibility, and repayment "
        "context, not only a form submission. How it works: GSN can show "
        "support needs, supporter fit, guarantor responsibility, expected "
        "payments, and expiry windows. Why it matters: access improves while "
        "risk, obligation, and follow-through remain visible."
    ),
    "Supporting Others": (
        "What it is: a way for trusted members to stand behind another person "
        "with clearer responsibility. How it works: GSN records support "
        "decisions, locked responsibility, earnings or service-fee context, "
        "and repayment status where available. Why it matters: help becomes "
        "more accountable than a private promise."
    ),
    "Emergency Support": (
        "What it is: urgent help made easier when identity, community, and "
        "trust context are already organized. How it works: GSN can reuse the "
        "support and TrustSlip layer so a serious need is not judged from a "
        "blank page. Why it matters: urgency should reduce confusion, not "
        "remove accountability."
    ),
    "Diaspora Trust Bridge": (
        "What it is: portable confidence for people supporting, trading, or "
        "verifying across distance. How it works: GSN lets a reader use public "
        "verification, TrustSlip, shop, and community evidence without needing "
        "to personally know the local circle. Why it matters: distance should "
        "not erase trustworthy history."
    ),
    "Trust Savings (ROSCA Support)": (
        "What it is: familiar rotating savings and contribution culture with "
        "a clearer evidence layer. How it works: GSN can connect Money In, "
        "expected payments, linked responsibilities, and community readings. "
        "Why it matters: savings discipline becomes easier to read without "
        "turning every private record into a public claim."
    ),
    "Contribution Tracking": (
        "What it is: a clearer record of who contributed, what was expected, "
        "and what still needs reconciliation. How it works: GSN can show "
        "payment references, expected-payment status, pool events, and manual "
        "pilot review where needed. Why it matters: community capital grows "
        "when contribution memory becomes durable and reviewable."
    ),
    "Continuity Across Distance": (
        "What it is: trust history that survives movement between places, "
        "phones, markets, and communities. How it works: GSN ties identity, "
        "community membership, TrustSlip, shop, and finance context into a "
        "portable record. Why it matters: a person should not lose every "
        "earned signal when life moves."
    ),
    "Portable Trust Identity": (
        "What it is: a way to carry a good name beyond the place where people "
        "already know you. How it works: Trust Passport holds broader private "
        "context while TrustSlip shares a smaller checkable paper. Why it "
        "matters: informal credibility can become useful evidence without "
        "forcing private life into the open."
    ),
    "Reputation Mobility": (
        "What it is: earned reputation becoming usable in new decisions and "
        "new communities. How it works: GSN can present trust readings, "
        "community confirmation, and public verification in proportion to the "
        "reader's need. Why it matters: opportunity should follow dependable "
        "behaviour, not stay trapped in one place."
    ),
    "One Global Shop": (
        "What it is: one merchant identity that can serve more than one local "
        "audience. How it works: GSN connects public shop, gallery, owner "
        "contact, vault access, and trust context. Why it matters: a small "
        "seller can grow reach without scattering their credibility across "
        "unconnected pages."
    ),
    "Service Economy Participation": (
        "What it is: trust evidence for work that is often informal, local, "
        "or relationship-based. How it works: GSN can connect services, "
        "TrustSlip, demand signals, marketplace presence, and reader-safe "
        "verification. Why it matters: dependable workers and service "
        "providers can show credibility before a buyer takes a risk."
    ),
    "Trust-Based Hiring": (
        "What it is: hiring support based on visible credibility, not only CV "
        "claims or personal referrals. How it works: GSN can provide Trust "
        "Passport, TrustSlip, community confirmation, and work/service signals "
        "as decision support. Why it matters: employers and households can "
        "make better proportionate decisions without overexposing the person."
    ),
    "Demand Box": (
        "What it is: a way to record real needs before the market misses them. "
        "How it works: GSN can collect demand, route it toward marketplace and "
        "shop surfaces, and connect it to trust context. Why it matters: "
        "opportunity becomes easier to match when demand is visible and "
        "organized."
    ),
    "Community Economic Power": (
        "What it is: the shared strength created when contribution, trust, "
        "trade, support, and participation can be read together. How it works: "
        "GSN combines community finance, marketplace, TrustSlip, support, and "
        "commitment surfaces into one operating layer. Why it matters: a "
        "community can convert demonstrated value into practical access."
    ),
    "Commitment Builder": (
        "What it is: structured execution discipline for savings, repayment, "
        "retirement readiness, business targets, and dependable follow-through. "
        "How it works: GSN can turn intentions into clearer plans, reminders, "
        "progress guidance, and visible commitment support. Why it matters: "
        "trust becomes stronger when people can show not only who knows them, "
        "but also how they keep commitments over time."
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
        "Modern SaaS, e-commerce, and community platforms often move activity online without carrying the "
        "real trust history that makes people reliable in their communities. GSN addresses that gap by "
        "connecting community evidence, portable trust identity, decision support, trusted commerce, "
        "community capital, and commitment discipline in one institutional layer.",
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
    line("22 things GSN does", size=12, gap=16, bold=True)
    for index, capability in enumerate(CAPABILITIES, start=1):
        line(f"{index}. {capability}", size=9, gap=11)

    line("")
    line("How each capability works", size=12, gap=16, bold=True)
    for index, capability in enumerate(CAPABILITIES, start=1):
        line(f"{index}. {capability}", size=10, gap=13, bold=True)
        paragraph(
            CAPABILITY_EXPLANATIONS.get(
                capability,
                "What it is: explanation pending. How it works: explanation pending. "
                "Why it matters: explanation pending.",
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
