from __future__ import annotations

import argparse
import sys
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
REPO_ROOT = ROOT.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.institutional_pdf import (  # noqa: E402
    draw_institutional_footer,
    draw_institutional_header,
)


def build_smoke_pdf(output_path: Path) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    width, height = A4
    pdf = canvas.Canvas(str(output_path), pagesize=A4)
    y = draw_institutional_header(
        pdf,
        width,
        height,
        title="GSN Institutional Evidence Smoke",
        subtitle="Visual smoke page for shared official document shell.",
        generated_at="2026-07-03 12:00 UTC",
        reference="GSN-SMOKE-20260703",
    )

    left = 24 * mm
    pdf.setFillColorRGB(0.02, 0.09, 0.15)
    pdf.setFont("Helvetica-Bold", 13)
    pdf.drawString(left, y - 4 * mm, "What this page should prove")

    pdf.setFont("Helvetica", 10)
    lines = [
        "The paper should show a clear GSN registry header, security strip, border, footer,",
        "one main GSN watermark, and repeated trust-record marks through the body.",
        "The marks must be visible enough to brand the document without blocking text.",
    ]
    y -= 13 * mm
    for line in lines:
        pdf.drawString(left, y, line)
        y -= 6 * mm

    pdf.setFont("Helvetica-Bold", 11)
    pdf.drawString(left, y - 8 * mm, "Boundary")
    pdf.setFont("Helvetica", 10)
    pdf.drawString(
        left,
        y - 15 * mm,
        "This is a smoke artifact only; it is not a live member, payment, or legal record.",
    )

    draw_institutional_footer(
        pdf,
        width,
        "GSN smoke evidence paper - generated locally to inspect official PDF shell, watermark, reference, and limitation.",
    )
    pdf.showPage()
    pdf.save()
    return output_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate a local institutional PDF smoke artifact for visual review."
    )
    parser.add_argument(
        "--output",
        default=str(REPO_ROOT / "screenshots" / "pdf-smoke" / "institutional-watermark-smoke.pdf"),
        help="Path for the generated PDF.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_path = build_smoke_pdf(Path(args.output))
    print(output_path.resolve())


if __name__ == "__main__":
    main()
