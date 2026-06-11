from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from reportlab.lib import colors
from reportlab.lib.units import mm


GSN_NAVY = colors.HexColor("#061827")
GSN_BLUE = colors.HexColor("#0B2D4A")
GSN_GOLD = colors.HexColor("#D6AA45")
GSN_MUTED = colors.HexColor("#617085")
GSN_BORDER = colors.HexColor("#D8E3EE")


def utc_generated_label() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def safe_pdf_text(value: Any, fallback: str = "-") -> str:
    text = str(value if value is not None else "").strip()
    if not text:
        return fallback

    replacements = {
        "\u2014": "-",
        "\u2013": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2022": "-",
        "\u00a0": " ",
        "\u00e2\u20ac\u201d": "-",
        "\u00e2\u20ac\u2122": "'",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def _set_alpha(pdf_canvas: Any, value: float) -> None:
    if hasattr(pdf_canvas, "setFillAlpha"):
        pdf_canvas.setFillAlpha(value)
    if hasattr(pdf_canvas, "setStrokeAlpha"):
        pdf_canvas.setStrokeAlpha(value)


def draw_gsn_watermark(pdf_canvas: Any, width: float, height: float) -> None:
    pdf_canvas.saveState()
    _set_alpha(pdf_canvas, 0.055)
    pdf_canvas.translate(width * 0.58, height * 0.49)
    pdf_canvas.rotate(32)
    pdf_canvas.setFillColor(GSN_GOLD)
    pdf_canvas.setFont("Helvetica-Bold", 78)
    pdf_canvas.drawCentredString(0, 0, "GSN")
    pdf_canvas.setFont("Helvetica-Bold", 12)
    pdf_canvas.drawCentredString(0, -22, "GLOBAL SUPPORT NETWORK")
    pdf_canvas.restoreState()


def draw_institutional_header(
    pdf_canvas: Any,
    width: float,
    height: float,
    *,
    title: str,
    subtitle: str,
    generated_at: str,
    reference: str,
    classification: str = "Official GSN evidence paper",
) -> float:
    draw_gsn_watermark(pdf_canvas, width, height)
    left = 18 * mm
    right = width - 18 * mm
    top = height - 18 * mm

    pdf_canvas.saveState()
    pdf_canvas.setStrokeColor(GSN_BORDER)
    pdf_canvas.setLineWidth(1)
    pdf_canvas.roundRect(left, 16 * mm, right - left, height - 32 * mm, 8 * mm, stroke=1, fill=0)

    pdf_canvas.setFillColor(GSN_NAVY)
    pdf_canvas.setFont("Helvetica-Bold", 10)
    pdf_canvas.drawString(left + 4 * mm, top - 5 * mm, "GSN | GLOBAL SUPPORT NETWORK")

    pdf_canvas.setFillColor(GSN_GOLD)
    pdf_canvas.roundRect(right - 52 * mm, top - 9 * mm, 48 * mm, 8 * mm, 2.6 * mm, stroke=0, fill=1)
    pdf_canvas.setFillColor(colors.white)
    pdf_canvas.setFont("Helvetica-Bold", 7.5)
    pdf_canvas.drawCentredString(right - 28 * mm, top - 6.7 * mm, classification.upper()[:34])

    pdf_canvas.setStrokeColor(GSN_GOLD)
    pdf_canvas.setLineWidth(1.2)
    pdf_canvas.line(left + 4 * mm, top - 13 * mm, right - 4 * mm, top - 13 * mm)

    pdf_canvas.setFillColor(GSN_NAVY)
    pdf_canvas.setFont("Helvetica-Bold", 18)
    pdf_canvas.drawString(left + 4 * mm, top - 25 * mm, safe_pdf_text(title))

    pdf_canvas.setFillColor(GSN_MUTED)
    pdf_canvas.setFont("Helvetica", 9)
    pdf_canvas.drawString(left + 4 * mm, top - 32 * mm, safe_pdf_text(subtitle))

    pdf_canvas.setFont("Helvetica-Bold", 8)
    pdf_canvas.drawString(left + 4 * mm, top - 42 * mm, f"Generated: {safe_pdf_text(generated_at)}")
    pdf_canvas.drawString(left + 74 * mm, top - 42 * mm, f"Reference: {safe_pdf_text(reference)}")
    pdf_canvas.restoreState()
    return top - 52 * mm


def draw_institutional_footer(pdf_canvas: Any, width: float, footer_text: str) -> None:
    left = 22 * mm
    pdf_canvas.saveState()
    pdf_canvas.setStrokeColor(GSN_BORDER)
    pdf_canvas.setLineWidth(0.7)
    pdf_canvas.line(left, 13 * mm, width - left, 13 * mm)
    pdf_canvas.setFillColor(GSN_MUTED)
    pdf_canvas.setFont("Helvetica", 8)
    pdf_canvas.drawString(
        left,
        8.5 * mm,
        safe_pdf_text(
            footer_text
            or "GSN evidence paper - controlled community trust record, not a bank guarantee."
        ),
    )
    pdf_canvas.restoreState()
