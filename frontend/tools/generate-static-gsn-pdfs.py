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
    "Institutional Community Domain",
]


CAPABILITY_EXPLANATIONS = {
    "Release Before Payment": (
        "Real-world decision: a seller may release goods, service, or credit "
        "to someone they only partly know. Risk: promises can fail after value "
        "moves. GSN changes the decision by asking what evidence exists before "
        "release. Tools: community verification, merchant verification, "
        "TrustSlip, protected trade record, and merchant release rail. Evidence "
        "left: merchant release record, trade evidence, community context, and "
        "future TrustSlip evidence. Boundary: not a full escrow or automated "
        "release rail."
    ),
    "Evidence-Backed Buying and Selling": (
        "Real-world decision: buyers, sellers, and suppliers meet through "
        "messages, referrals, or posts with thin identity context. Risk: a "
        "good-looking offer can hide a weak seller or false buyer. GSN changes "
        "the decision by letting both sides read shop identity, TrustSlip, "
        "community evidence, and trade history before acting. Tools: public "
        "shop, merchant verification, TrustSlip, release rail, shop diary, and "
        "vault. Evidence left: shop identity, shelf activity, followers, trade "
        "records, and verification links."
    ),
    "Cross-Community Trade": (
        "Real-world decision: a person trusted in one market, church, union, "
        "or family circle may be unknown in another. Risk: good members restart "
        "from zero while bad actors can move without visible history. GSN "
        "changes the decision by carrying identity and community evidence with "
        "clear boundaries. Tools: GSN ID, community record, public shop, "
        "TrustSlip, and community credential. Evidence left: cross-community "
        "identity trail, member credential, shop record, and confirmation."
    ),
    "Fraud Reduction Before Action": (
        "Real-world decision: fraud often looks ordinary before goods, money, "
        "work, or access moves. Risk: the warning signs may become obvious only "
        "after loss. GSN changes the decision by surfacing weak evidence, stale "
        "records, mismatch warnings, and confirmation paths before action. "
        "Tools: trust reading, TrustSlip verify, community member verify, and "
        "Trust Passport limits. Evidence left: caution notes, missing-evidence "
        "signals, verification limits, and current reading."
    ),
    "Spotlight Visibility": (
        "Real-world decision: a useful shop update or service offer can vanish "
        "before the right community sees it. Risk: attention can reward noise "
        "instead of recorded value. GSN changes the decision by giving approved "
        "updates a clearer place to be seen while keeping visibility separate "
        "from verification. Tools: Spotlight, public shop, marketplace "
        "broadcast, and shop gallery. Evidence left: published spotlight, "
        "owner identity, community placement, media record, and timestamp."
    ),
    "Reputation-Based Visibility": (
        "Real-world decision: serious members can be harder to find when reach "
        "depends only on posting volume. Risk: opportunity can flow toward "
        "noise while better evidence stays hidden. GSN changes the decision by "
        "letting recorded reputation support reach while showing limits. "
        "Tools: reputation signals, trust reading, Spotlight ranking, and "
        "marketplace visibility. Evidence left: trust band, activity trail, "
        "shop status, community context, and public record."
    ),
    "Marketplace Presence Across Communities": (
        "Real-world decision: a merchant may sell across communities using "
        "scattered chats, screenshots, and repeated introductions. Risk: "
        "customers cannot tell whether shop, owner, shelf, and contact path "
        "belong together. GSN changes the decision with one controlled shop "
        "presence tied to community context. Tools: public shop, gallery, "
        "Spotlight, WhatsApp contact, and merchant verification. Evidence left: "
        "public shop link, shelf items, media, owner GSN ID, and verification."
    ),
    "People-Backed Loans": (
        "Real-world decision: a person may need school fees, stock, emergency "
        "support, or working capital before formal finance will listen. Risk: "
        "unclear amount, purpose, duration, and backing turn support into blind "
        "lending or pressure. GSN changes the decision by making the request "
        "reviewable. Tools: loan support, support draft, fit check, "
        "supporter list, and guarantor request. Evidence left: amount, purpose, "
        "duration, repayment plan, fit signal, supporters, and request record."
    ),
    "Supporting Others": (
        "Real-world decision: someone may want to stand behind another person "
        "without knowing the full responsibility. Risk: help can become hidden "
        "obligation or emotional pressure. GSN changes the decision by showing "
        "request, relationship context, trust reading, and responsibility "
        "before a yes. Tools: supporter check, guarantor inbox, Trust Passport, "
        "and community relationship evidence. Evidence left: invitation, "
        "relationship context, guarantor decision, and support trail."
    ),
    "Emergency Support": (
        "Real-world decision: urgent help often arrives through calls, chats, "
        "or relatives before anyone has time to verify. Risk: a real emergency "
        "can be delayed, while a false request can pull money away from safer "
        "decisions. GSN changes the decision by putting identity, community "
        "confirmation, TrustSlip, and need record together. Tools: TrustSlip, "
        "community confirmation, Demand Box, support request, and identity "
        "record. Evidence left: urgent need record, member identity, "
        "confirmation, TrustSlip code, and response."
    ),
    "Diaspora Trust Bridge": (
        "Real-world decision: diaspora members may send support, goods, or "
        "opportunity from far away using only family reports or messages. Risk: "
        "distance weakens context and can make one-sided claims look complete. "
        "GSN changes the decision by giving distant readers controlled "
        "community evidence. Tools: community record, TrustSlip, public shop, "
        "community confirmation, and GSN ID. Evidence left: membership, public "
        "identity, shop record, confirmation notes, and verification link."
    ),
    "Trust Savings (ROSCA Support)": (
        "Real-world decision: savings circles depend on repeated contribution, "
        "timing, and mutual confidence. Risk: when memory and informal pressure "
        "are the record, missed contributions and payout disputes are harder to "
        "resolve. GSN changes the decision by adding contribution and payout "
        "context without becoming the bank. Tools: ROSCA desk, contribution "
        "cycle, payout record, and member evidence. Evidence left: cycle setup, "
        "selected members, schedule, payout record, and community context."
    ),
    "Contribution Tracking": (
        "Real-world decision: people contribute, repay, support, volunteer, "
        "sell, and follow through, but much of that history disappears. Risk: "
        "future decisions return to hearsay after evidence has already been "
        "earned. GSN changes the decision by turning useful behaviour into "
        "reviewable records. Tools: Trust Events, finance records, repayment "
        "record, support evidence, and Trust Passport. Evidence left: "
        "contribution events, repayment behaviour, support records, timestamps, "
        "and community source."
    ),
    "Continuity Across Distance": (
        "Real-world decision: people move, reconnect, change work, and join "
        "new circles while still needing their history to make sense. Risk: "
        "responsible members can look unknown while old accountability becomes "
        "hard to find. GSN changes the decision by keeping identity, role, and "
        "trust trail readable without merging communities. Tools: GSN ID, "
        "community membership, Trust Passport, and community record. Evidence "
        "left: GSN ID, active community count, roles, membership, and trail."
    ),
    "Portable Trust Identity": (
        "Real-world decision: a person known locally may still need to present "
        "identity and trust outside that circle. Risk: screenshots, nicknames, "
        "and introductions can expose too much or prove too little. GSN changes "
        "the decision with a portable identity package and protected evidence "
        "boundary. Tools: GSN ID, Trust Passport, TrustSlip, photo or selfie, "
        "and community credential. Evidence left: GSN ID, display name, photo "
        "status, credential, TrustSlip code, and verification boundary."
    ),
    "Reputation Mobility": (
        "Real-world decision: a good name can be real but trapped in one "
        "street, shop, contact list, or circle. Risk: opportunity stays local "
        "and new readers fall back to gossip. GSN changes the decision by "
        "moving reputation with behaviour evidence and community context. "
        "Tools: Trust Passport, Trust Graph, community record, and TrustSlip. "
        "Evidence left: recorded activity, relationship evidence, community "
        "footprint, TrustSlip, and current reading."
    ),
    "One Global Shop": (
        "Real-world decision: a shop may be represented by chats, photos, "
        "flyers, and personal contacts scattered across many places. Risk: "
        "customers may not know whether item, owner, contact route, and "
        "verification signal belong together. GSN changes the decision with one "
        "public shop home. Tools: public shop, vault, shop gallery, Spotlight, "
        "and merchant verification. Evidence left: public shop link, shelf "
        "blocks, owner GSN ID, media, and verification actions."
    ),
    "Service Economy Participation": (
        "Real-world decision: service work often happens through referrals, "
        "chats, and one-off introductions. Risk: good workers remain invisible "
        "while buyers hire from weak claims because previous work is not easy "
        "to review. GSN changes the decision by connecting demand, public "
        "identity, community context, and follow-up evidence. Tools: Demand "
        "Box, public shop, TrustSlip, community activity, and shop diary. "
        "Evidence left: service offer, response, context, identity, and follow-up."
    ),
    "Trust-Based Hiring": (
        "Real-world decision: hiring, task assignment, and household service "
        "choices often depend on referrals or a quick conversation. Risk: weak "
        "claims can sound strong, and strong workers can look ordinary without "
        "evidence. GSN changes the decision by helping the reader check "
        "identity, role evidence, activity, and confirmation. Tools: Trust "
        "Passport, community credential, TrustSlip, and community confirmation. "
        "Evidence left: identity status, role evidence, activity, TrustSlip, "
        "and confirmation note."
    ),
    "Demand Box": (
        "Real-world decision: people need work, goods, services, stock, help, "
        "or buyers before the right person knows they exist. Risk: opportunity "
        "is missed when demand stays hidden inside private chats or late "
        "conversations. GSN changes the decision by making demand visible early "
        "enough to match need and supply. Tools: Demand Box, marketplace needs, "
        "public shop, and community broadcast. Evidence left: need or offer "
        "post, placement, requester context, and response trail."
    ),
    "Community Economic Power": (
        "Real-world decision: a community may hold identity, trade, support, "
        "finance, trust, and opportunity records in disconnected places. Risk: "
        "the community cannot see its own economic power or protect members "
        "consistently. GSN changes the decision by connecting records into one "
        "operating layer while separating personal, shop, and institutional "
        "claims. Tools: community home, marketplace, finance, Trust Passport, "
        "and Community Domain. Evidence left: community identity, activity, "
        "marketplace records, finance evidence, and trust records."
    ),
    "Commitment Builder": (
        "Real-world decision: people make savings, repayment, retirement "
        "readiness, business, and personal commitments that require follow-through. "
        "Risk: intention fades when there is no visible execution trail. GSN "
        "changes the decision by turning intention into a focused commitment "
        "record with progress and reminders. Tools: Commitment Builder, Focus "
        "Commitments, reminders, and progress evidence. Evidence left: "
        "commitment record, progress steps, completion trail, and follow-through "
        "signal."
    ),
    "Institutional Community Domain": (
        "Real-world decision: schools, unions, churches, cooperatives, markets, "
        "and associations need membership, roles, branches, policies, and public "
        "claims. Risk: if institutional identity is mixed with personal "
        "marketplaces, authority and public trust become confusing. GSN changes "
        "the decision with a Community Domain for governance, membership, "
        "services, and controlled claims. Tools: Community Domain, settings, "
        "governance roles, service panels, and public community record. Evidence "
        "left: domain identity, member placement, unit records, roles, service "
        "status, and public claim."
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
        "connecting community evidence, portable trust identity, decision support, evidence-backed commerce, "
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
    line(f"{len(CAPABILITIES)} decisions GSN helps members make", size=12, gap=16, bold=True)
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
