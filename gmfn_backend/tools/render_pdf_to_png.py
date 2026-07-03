from __future__ import annotations

import argparse
from pathlib import Path

try:
    import fitz
except ImportError as exc:  # pragma: no cover - exercised only when dev deps are missing.
    raise SystemExit(
        "PyMuPDF is required for PDF visual QA. Install gmfn_backend/requirements-dev.txt."
    ) from exc


REPO_ROOT = Path(__file__).resolve().parents[2]


def render_page(pdf_path: Path, output_path: Path, *, page_number: int = 1, zoom: float = 2.0) -> Path:
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")
    if page_number < 1:
        raise ValueError("page_number must be at least 1")
    if zoom <= 0:
        raise ValueError("zoom must be greater than zero")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    document = fitz.open(pdf_path)
    try:
        if document.page_count < 1:
            raise ValueError(f"PDF has no pages: {pdf_path}")
        if page_number > document.page_count:
            raise ValueError(f"PDF has only {document.page_count} pages: {pdf_path}")
        page = document.load_page(page_number - 1)
        matrix = fitz.Matrix(zoom, zoom)
        pixmap = page.get_pixmap(matrix=matrix, alpha=False)
        pixmap.save(output_path)
    finally:
        document.close()
    return output_path


def render_first_page(pdf_path: Path, output_path: Path, *, zoom: float = 2.0) -> Path:
    return render_page(pdf_path, output_path, page_number=1, zoom=zoom)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Render a page of a local PDF to PNG for visual QA."
    )
    parser.add_argument(
        "--pdf",
        default=str(REPO_ROOT / "screenshots" / "pdf-smoke" / "institutional-watermark-smoke.pdf"),
        help="Path to the source PDF.",
    )
    parser.add_argument(
        "--output",
        default=str(REPO_ROOT / "screenshots" / "pdf-smoke" / "institutional-watermark-smoke.png"),
        help="Path for the rendered PNG.",
    )
    parser.add_argument(
        "--zoom",
        type=float,
        default=2.0,
        help="Render zoom factor.",
    )
    parser.add_argument(
        "--page",
        type=int,
        default=1,
        help="One-based PDF page number to render.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    output_path = render_page(Path(args.pdf), Path(args.output), page_number=args.page, zoom=args.zoom)
    print(output_path.resolve())


if __name__ == "__main__":
    main()
