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


CAPABILITIES = [
    "Release before payment",
    "Trusted buying and selling",
    "Cross-community trade",
    "Fraud reduction before action",
    "Spotlight visibility",
    "Reputation-based visibility",
    "Marketplace presence across communities",
    "People-backed support",
    "Supporting others",
    "Emergency support",
    "Diaspora trust bridge",
    "Trust savings and ROSCA support",
    "Contribution tracking",
    "Continuity across distance",
    "Portable trust identity",
    "Reputation mobility",
    "One global shop",
    "Service economy participation",
    "Trust-based hiring",
    "Demand Box",
    "Community economic power",
]


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
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    generated_at = "Current institutional summary"
    reference = "GSN-EXECUTIVE-SUMMARY"
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
    line("21 core capabilities", size=12, gap=16, bold=True)
    for index, capability in enumerate(CAPABILITIES, start=1):
        line(f"{index}. {capability}", size=9, gap=11)

    line("")
    line("How each capability works", size=12, gap=16, bold=True)
    for index, capability in enumerate(CAPABILITIES, start=1):
        line(f"{index}. {capability}", size=10, gap=13, bold=True)
        paragraph(
            "What it is: real community trust made visible in GSN. "
            "How it works: identity, community context, evidence, and reader-safe verification. "
            "Why it matters: improves access, reduces confusion, and helps people make proportionate decisions.",
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
