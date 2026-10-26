from pathlib import Path
from decimal import Decimal
import importlib.util

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


ROOT = Path(__file__).resolve().parents[1]


def read_service(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def _session():
    from app.db.base import Base as CoreBase

    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    CoreBase.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    return engine, SessionLocal()


def _assert_pdf_bytes(pdf: bytes) -> None:
    assert isinstance(pdf, bytes)
    assert pdf.startswith(b"%PDF-")
    assert len(pdf) > 1000
    assert b"%%EOF" in pdf[-128:]


def _load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_shared_institutional_pdf_helper_exists():
    text = read_service("app/services/institutional_pdf.py")

    assert "def draw_gsn_watermark" in text
    assert "def wrap_pdf_text_lines" in text
    assert "_split_oversized_pdf_word" in text
    assert "_set_alpha(pdf_canvas, 1)" in text
    assert "GSN TRUST RECORD" in text
    assert "for x_factor, y_factor, rotation in" in text
    assert "def draw_institutional_header" in text
    assert "def draw_institutional_footer" in text
    assert "GLOBAL SUPPORT NETWORK" in text
    assert "GSN_WATERMARK_BLUE" in text
    assert "GSN_WATERMARK_GOLD" in text
    assert "Security marks: GSN watermark | UTC time | reference | limitation" in text


def test_shared_pdf_text_wrapper_keeps_lines_inside_page_width():
    from app.services.institutional_pdf import wrap_pdf_text_lines

    max_width = 160
    text = (
        "Use the redacted share copy for outside review. Use the complete record "
        "only when the reviewer is allowed to see private member evidence."
    )

    lines = wrap_pdf_text_lines(text, "Helvetica", 9, max_width)

    assert len(lines) > 1
    assert all(stringWidth(line, "Helvetica", 9) <= max_width for line in lines)
    assert wrap_pdf_text_lines("", "Helvetica", 9, max_width, fallback=None) == []

    long_word_lines = wrap_pdf_text_lines("GSN-" + ("A" * 90), "Helvetica", 9, max_width)
    assert len(long_word_lines) > 1
    assert all(stringWidth(line, "Helvetica", 9) <= max_width for line in long_word_lines)


def test_institutional_pdf_smoke_generator_writes_valid_review_artifact():
    module = _load_module(
        ROOT / "tools/generate_institutional_pdf_smoke.py",
        "generate_institutional_pdf_smoke",
    )
    output_path = ROOT.parent / "pytest-tmp-pdf-smoke" / "institutional-watermark-smoke.pdf"

    try:
        returned_path = module.build_smoke_pdf(output_path)

        assert returned_path == output_path
        assert returned_path.exists()
        _assert_pdf_bytes(returned_path.read_bytes())
    finally:
        output_path.unlink(missing_ok=True)

    text = read_service("tools/generate_institutional_pdf_smoke.py")
    assert "draw_institutional_header" in text
    assert "draw_institutional_footer" in text
    assert "not a live member, payment, or legal record" in text
    assert "not a bank guarantee" not in text


def test_institutional_pdf_smoke_renderer_writes_png_review_artifact():
    generator = _load_module(
        ROOT / "tools/generate_institutional_pdf_smoke.py",
        "generate_institutional_pdf_smoke_for_render",
    )
    renderer = _load_module(
        ROOT / "tools/render_pdf_to_png.py",
        "render_pdf_to_png",
    )
    temp_dir = ROOT.parent / "pytest-tmp-pdf-smoke"
    pdf_path = temp_dir / "institutional-watermark-smoke.pdf"
    png_path = temp_dir / "institutional-watermark-smoke.png"

    try:
        generator.build_smoke_pdf(pdf_path)
        returned_path = renderer.render_first_page(pdf_path, png_path, zoom=1.0)

        assert returned_path == png_path
        assert png_path.exists()
        assert png_path.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
        assert png_path.stat().st_size > 1000
    finally:
        pdf_path.unlink(missing_ok=True)
        png_path.unlink(missing_ok=True)

    text = read_service("tools/render_pdf_to_png.py")
    assert "import fitz" in text
    assert "def render_page" in text
    assert "--page" in text
    assert "render_first_page" in text


def test_service_pdf_smoke_generator_writes_member_evidence_pdf_and_png():
    module = _load_module(
        ROOT / "tools/generate_service_pdf_smoke.py",
        "generate_service_pdf_smoke",
    )
    temp_dir = ROOT.parent / "pytest-tmp-pdf-smoke"
    pdf_path = temp_dir / "member-evidence-pack-smoke.pdf"
    png_path = temp_dir / "member-evidence-pack-smoke.png"

    try:
        result = module.build_member_evidence_smoke(pdf_path, png_path)

        assert result["pdf"] == pdf_path
        assert result["png"] == png_path
        assert pdf_path.exists()
        assert png_path.exists()
        _assert_pdf_bytes(pdf_path.read_bytes())
        assert png_path.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
        assert png_path.stat().st_size > 1000

        import fitz

        with fitz.open(pdf_path) as document:
            assert len(document) == 1
            normalized_text = " ".join(" ".join(page.get_text() for page in document).split())
        assert "A trust snapshot is available; no matching recent activity is recorded." in normalized_text
        assert "Decision Boundary" in normalized_text
        assert "MEMBER REFERENCE GSN-U-SERVICE-SMOKE" in normalized_text
        assert "Evidence context" in normalized_text
        assert "Record security" in normalized_text
        assert "member-evidence-smoke@example.com" not in normalized_text

    finally:
        pdf_path.unlink(missing_ok=True)
        png_path.unlink(missing_ok=True)

    text = read_service("tools/generate_service_pdf_smoke.py")
    assert "build_user_evidence_pack_pdf" in text
    assert "GSN-U-SERVICE-SMOKE" in text
    assert "member-evidence-smoke@example.com" in text


def test_service_pdf_smoke_generator_writes_community_evidence_pdf_and_png():
    module = _load_module(
        ROOT / "tools/generate_service_pdf_smoke.py",
        "generate_service_pdf_community_smoke",
    )
    temp_dir = ROOT.parent / "pytest-tmp-pdf-smoke"
    pdf_path = temp_dir / "community-evidence-pack-smoke.pdf"
    png_path = temp_dir / "community-evidence-pack-smoke.png"

    try:
        result = module.build_community_evidence_smoke(pdf_path, png_path)

        assert result["pdf"] == pdf_path
        assert result["png"] == png_path
        assert pdf_path.exists()
        assert png_path.exists()
        _assert_pdf_bytes(pdf_path.read_bytes())
        assert png_path.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
        assert png_path.stat().st_size > 1000

        import fitz

        with fitz.open(pdf_path) as document:
            assert document.page_count == 1
            text = " ".join(page.get_text() for page in document)

        normalized_text = " ".join(text.split())
        assert "1 invite-led community entry is recorded." in normalized_text
        assert "Decision Boundary" in normalized_text
        assert "Recent invite-led entries" in normalized_text
        assert "Recorded activity summary" in normalized_text
        assert "Other recorded activity" in normalized_text
        assert "Redacted share copy" in normalized_text
        assert "***2345" in normalized_text
        assert "SMOKE-CODE-12345" not in normalized_text
        assert "opaque_internal_event" not in normalized_text
        assert "PRIVATE-EVIDENCE-META" not in normalized_text
        assert "community-owner-smoke@example.com" not in normalized_text
        assert "community-member-smoke@example.com" not in normalized_text
    finally:
        pdf_path.unlink(missing_ok=True)
        png_path.unlink(missing_ok=True)

    text = read_service("tools/generate_service_pdf_smoke.py")
    assert "build_clan_evidence_pack_pdf" in text
    assert "GSN-C-EVIDENCE-SMOKE" in text
    assert "community-owner-smoke@example.com" in text


def test_service_pdf_smoke_generator_writes_loan_evidence_pdf_and_png():
    module = _load_module(
        ROOT / "tools/generate_service_pdf_smoke.py",
        "generate_service_pdf_loan_smoke",
    )
    temp_dir = ROOT.parent / "pytest-tmp-pdf-smoke"
    pdf_path = temp_dir / "loan-evidence-pack-smoke.pdf"
    png_path = temp_dir / "loan-evidence-pack-smoke.png"

    try:
        result = module.build_loan_evidence_smoke(pdf_path, png_path)

        assert result["pdf"] == pdf_path
        assert result["png"] == png_path
        assert pdf_path.exists()
        assert png_path.exists()
        _assert_pdf_bytes(pdf_path.read_bytes())
        assert png_path.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
        assert png_path.stat().st_size > 1000

        import fitz

        with fitz.open(pdf_path) as document:
            assert len(document) == 1
            normalized_text = " ".join(" ".join(page.get_text() for page in document).split())
        assert "This support request is recorded as pending." in normalized_text
        assert "Decision Boundary" in normalized_text
        assert "SUPPORT GAP NGN 35,000.00" in normalized_text
        assert "Recorded evidence" in normalized_text
        assert "Record security" in normalized_text
        assert "support-borrower-smoke@example.com" not in normalized_text
    finally:
        pdf_path.unlink(missing_ok=True)
        png_path.unlink(missing_ok=True)

    text = read_service("tools/generate_service_pdf_smoke.py")
    assert "build_loan_evidence_pack_pdf" in text
    assert "GSN-U-SUPPORT-SMOKE" in text
    assert "GSN-C-SUPPORT-SMOKE" in text
    assert "support-borrower-smoke@example.com" in text


def test_service_pdf_smoke_generator_writes_trustslip_evidence_pdf_and_png():
    module = _load_module(
        ROOT / "tools/generate_service_pdf_smoke.py",
        "generate_service_pdf_trustslip_smoke",
    )
    temp_dir = ROOT.parent / "pytest-tmp-pdf-smoke"
    pdf_path = temp_dir / "trustslip-evidence-smoke.pdf"
    png_path = temp_dir / "trustslip-evidence-smoke.png"
    page2_png_path = temp_dir / "trustslip-evidence-smoke-page2.png"

    try:
        result = module.build_trustslip_evidence_smoke(pdf_path, png_path, page2_png_path)

        assert result["pdf"] == pdf_path
        assert result["png"] == png_path
        assert result["page2_png"] == page2_png_path
        assert pdf_path.exists()
        assert png_path.exists()
        assert page2_png_path.exists()
        _assert_pdf_bytes(pdf_path.read_bytes())
        assert png_path.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
        assert page2_png_path.read_bytes().startswith(b"\x89PNG\r\n\x1a\n")
        assert png_path.stat().st_size > 1000
        assert page2_png_path.stat().st_size > 1000
    finally:
        pdf_path.unlink(missing_ok=True)
        png_path.unlink(missing_ok=True)
        page2_png_path.unlink(missing_ok=True)

    text = read_service("tools/generate_service_pdf_smoke.py")
    assert "build_trust_slip_pdf" in text
    assert "render_page" in text
    assert "--trustslip-page2-png" in text
    assert "GSN-PACK-TRUSTSLIP-SMOKE" in text
    assert "trustslip-smoke@example.com" in text


def test_trustslip_evidence_smoke_pdf_text_keeps_private_fields_out():
    module = _load_module(
        ROOT / "tools/generate_service_pdf_smoke.py",
        "generate_service_pdf_trustslip_smoke_text_audit",
    )
    temp_dir = ROOT.parent / "pytest-tmp-pdf-smoke"
    pdf_path = temp_dir / "trustslip-evidence-smoke.pdf"

    try:
        result = module.build_trustslip_evidence_smoke(pdf_path, render_png=False)

        assert result["pdf"] == pdf_path
        assert pdf_path.exists()
        _assert_pdf_bytes(pdf_path.read_bytes())

        import fitz

        document = fitz.open(pdf_path)
        try:
            assert document.page_count == 2
            text = "\n".join(page.get_text() for page in document)
        finally:
            document.close()

        normalized_text = " ".join(text.split())
        assert "This TrustSlip was current when this paper was generated." in normalized_text
        assert "Decision Boundary" in normalized_text
        assert "Private member reference" in normalized_text
        assert "redacted for TrustSlip evidence paper" in normalized_text
        assert "Reconciliation reference" in normalized_text
        assert "private operational detail redacted" in normalized_text
        assert "Check the live TrustSlip" in normalized_text
        assert "Public code: GSN-SMOKE" in normalized_text
        assert "Public TrustSlip verification QR" not in text
        assert "Scan to open this public TrustSlip verification page." not in text
        assert "Merchant verification QR" not in text
        assert "Scan to open merchant verification view." not in text
        assert "trustslip-smoke@example.com" not in text
        assert "9201" not in text
        assert "user_id" not in text
        assert "actor_user_id" not in text
        assert "subject_user_id" not in text
        assert "confirmed_by" not in text
        assert "payment_reference" not in text
        assert "Payment reference" not in text
    finally:
        pdf_path.unlink(missing_ok=True)


def test_trust_timeline_smoke_pdf_is_two_page_plain_language_record():
    module = _load_module(
        ROOT / "tools/generate_service_pdf_smoke.py",
        "generate_service_pdf_timeline_smoke",
    )
    temp_dir = ROOT.parent / "pytest-tmp-pdf-smoke"
    pdf_path = temp_dir / "trust-timeline-smoke.pdf"
    png_path = temp_dir / "trust-timeline-smoke.png"
    page2_png_path = temp_dir / "trust-timeline-smoke-page2.png"

    try:
        result = module.build_trust_timeline_smoke(pdf_path, png_path, page2_png_path)
        assert result["pdf"] == pdf_path
        assert result["png"] == png_path
        assert result["page2_png"] == page2_png_path
        _assert_pdf_bytes(pdf_path.read_bytes())

        import fitz

        with fitz.open(pdf_path) as document:
            assert document.page_count == 2
            text = " ".join(page.get_text() for page in document)

        normalized_text = " ".join(text.split())
        assert "5 recent trust record changes are shown." in normalized_text
        assert "Decision Boundary" in normalized_text
        assert "Your recent trust record, newest first." in normalized_text
        assert "Full repayment recorded" in normalized_text
        assert "Support completed successfully" in normalized_text
        assert "Payment reported by member" in normalized_text
        assert "private event details redacted for timeline PDF" in normalized_text
        assert "loan_repaid" not in normalized_text
        assert "PRIVATE-TIMELINE-REF" not in normalized_text
        assert "timeline-smoke@example.com" not in normalized_text
    finally:
        pdf_path.unlink(missing_ok=True)
        png_path.unlink(missing_ok=True)
        page2_png_path.unlink(missing_ok=True)


class _RecordingPdfCanvas:
    def __init__(self):
        self.draw_strings = []
        self.round_rects = []
        self.fill_alphas = []
        self.stroke_alphas = []
        self.fonts = []
        self.transforms = []

    def saveState(self):
        pass

    def restoreState(self):
        pass

    def setFillAlpha(self, value):
        self.fill_alphas.append(value)

    def setStrokeAlpha(self, value):
        self.stroke_alphas.append(value)

    def translate(self, x, y):
        self.transforms.append(("translate", x, y))

    def rotate(self, degrees):
        self.transforms.append(("rotate", degrees))

    def setFillColor(self, color):
        pass

    def setStrokeColor(self, color):
        pass

    def setLineWidth(self, value):
        pass

    def setFont(self, name, size):
        self.fonts.append((name, size))

    def drawCentredString(self, x, y, text):
        self.draw_strings.append(("center", x, y, text))

    def drawString(self, x, y, text):
        self.draw_strings.append(("left", x, y, text))

    def roundRect(self, x, y, width, height, radius, stroke=1, fill=0):
        self.round_rects.append((x, y, width, height, radius, stroke, fill))

    def line(self, x1, y1, x2, y2):
        pass


def test_shared_institutional_pdf_watermark_draws_repeated_trust_record_field():
    from app.services.institutional_pdf import draw_gsn_watermark

    width, height = A4
    canvas = _RecordingPdfCanvas()

    draw_gsn_watermark(canvas, width, height)

    drawn_text = [row[3] for row in canvas.draw_strings]
    assert drawn_text.count("GSN") == 1
    assert drawn_text.count("GLOBAL SUPPORT NETWORK") == 1
    assert drawn_text.count("GSN TRUST RECORD") == 4
    assert canvas.fill_alphas.count(1) == 2
    assert ("Helvetica-Bold", 78) in canvas.fonts
    assert ("Helvetica-Bold", 26) in canvas.fonts

    rotations = [entry[1] for entry in canvas.transforms if entry[0] == "rotate"]
    assert 32 in rotations
    assert rotations.count(-18) == 2
    assert rotations.count(18) == 2


def test_shared_institutional_pdf_header_security_strip_has_safe_geometry():
    from app.services.institutional_pdf import draw_institutional_header

    width, height = A4
    canvas = _RecordingPdfCanvas()
    content_start_y = draw_institutional_header(
        canvas,
        width,
        height,
        title="GSN Rendered Evidence Smoke",
        subtitle="Generated paper layout smoke check.",
        generated_at="2026-06-27 12:00 UTC",
        reference="GSN-SMOKE-001",
    )

    security_rows = [
        row for row in canvas.draw_strings if "Security marks: GSN watermark" in row[3]
    ]
    assert len(security_rows) == 1
    _, security_x, security_y, security_text = security_rows[0]

    assert security_x > 0
    assert security_y > content_start_y
    assert security_y - content_start_y > 25
    assert len(security_text) <= 110
    assert all(ord(char) < 128 for char in security_text)

    filled_strips = [rect for rect in canvas.round_rects if rect[6] == 1]
    assert filled_strips, "Security strip background should be drawn as a filled rounded rectangle."
    strip_x, strip_y, strip_width, strip_height, *_ = filled_strips[-1]
    assert strip_x > 0
    assert strip_y > content_start_y
    assert strip_width < width
    assert strip_height > 0


def test_shared_institutional_pdf_footer_wraps_long_reader_boundary():
    from app.services.institutional_pdf import draw_institutional_footer

    width, _ = A4
    canvas = _RecordingPdfCanvas()
    footer_text = (
        "GSN TrustSlip evidence paper - controlled community trust record, "
        "not a bank guarantee, credit approval, payment instruction, or automatic debit authority."
    )

    draw_institutional_footer(canvas, width, footer_text)

    footer_lines = [
        row[3]
        for row in canvas.draw_strings
        if row[0] == "left" and "GSN TrustSlip evidence paper" in row[3]
    ]
    footer_lines += [
        row[3]
        for row in canvas.draw_strings
        if row[0] == "left" and "automatic debit authority" in row[3]
    ]

    assert len(footer_lines) == 2
    assert footer_lines[0].startswith("GSN TrustSlip evidence paper")
    assert footer_lines[1].endswith("automatic debit authority.")
    assert "Confidential / Evidence Record" not in "\n".join(footer_lines)

    max_width = width - (44 * mm)
    for line in footer_lines:
        assert stringWidth(line, "Helvetica", 8) <= max_width


def test_generated_simple_evidence_pack_pdfs_return_valid_pdf_bytes(monkeypatch):
    from app.db.models import Clan, Loan, User
    from app.services import evidence_pack_pdf_service
    from app.services.loan_evidence_pack_pdf_service import build_loan_evidence_pack_pdf
    from app.services.user_evidence_pack_pdf_service import build_user_evidence_pack_pdf

    engine, db = _session()
    try:
        user = User(
            id=1,
            email="paper-smoke@example.com",
            hashed_password="x",
            role="user",
            gmfn_id="GSN-U-PAPER-001",
            trust_score=74,
            trust_band="B",
        )
        clan = Clan(id=1, name="GSN Paper Smoke Community", community_code="GSN-C-PAPER-001")
        loan = Loan(
            id=1,
            borrower_user_id=1,
            clan_id=1,
            amount=Decimal("25000.00"),
            currency="NGN",
            status="pending",
        )
        db.add_all([user, clan, loan])
        db.commit()

        monkeypatch.setattr(
            evidence_pack_pdf_service,
            "get_invite_analytics",
            lambda db, clan_id, top_n=10: {
                "summary": {
                    "invites_created": 0,
                    "joins_via_invite": 0,
                    "invites_revoked": 0,
                    "unique_invites_used": 0,
                    "conversion_rate": 0,
                },
                "top_inviters": [],
            },
        )
        monkeypatch.setattr(evidence_pack_pdf_service, "get_recent_invite_joins", lambda db, clan_id, limit=20: [])
        monkeypatch.setattr(evidence_pack_pdf_service, "get_trust_events_timeline", lambda db, clan_id, limit=300: [])

        community_pdf = evidence_pack_pdf_service.build_clan_evidence_pack_pdf(db, clan_id=1)
        _assert_pdf_bytes(community_pdf)

        import fitz

        with fitz.open(stream=community_pdf, filetype="pdf") as document:
            community_text = " ".join(page.get_text() for page in document)
        normalized_community_text = " ".join(community_text.split())
        assert "No invite-led community entries are recorded." in normalized_community_text
        assert "No recent invite-led entries are recorded in this snapshot." in normalized_community_text
        assert "No recorded activity categories in this snapshot." in normalized_community_text
        _assert_pdf_bytes(build_loan_evidence_pack_pdf(db, loan_id=1))
        _assert_pdf_bytes(build_user_evidence_pack_pdf(db, user_id=1))
    finally:
        db.close()
        engine.dispose()


def test_populated_loan_evidence_pdf_is_two_page_decision_first_and_share_safe():
    from app.services.loan_evidence_pack_pdf_layout import build_support_evidence_document
    import fitz

    supporters = [
        {
            "member_reference": f"GSN-U-SUPPORTER-{index:02d}",
            "status": "approved" if index < 4 else "pending",
            "pledge_amount": 5000 + index,
            "score": 70 + index,
            "band": "B",
        }
        for index in range(1, 7)
    ]
    repayments = [
        {
            "created_at": f"2026-10-{20 - index:02d} 12:00 UTC",
            "payer_reference": "GSN-U-REQUESTER-LONG",
            "amount": 1250 + index,
        }
        for index in range(1, 7)
    ]
    timeline = [
        {
            "created_at": f"2026-10-26 {12 - index:02d}:00 UTC",
            "event_type": "repayment_confirmed" if index % 2 else "opaque_internal_event",
            "participants": f"GSN-U-MEMBER-{index:02d}",
            "has_metadata": True,
        }
        for index in range(1, 11)
    ]

    pdf = build_support_evidence_document(
        support_reference="GSN-SUPPORT-009999",
        community_name="GSN Long Evidence Community",
        community_reference="GSN-C-LONG-EVIDENCE",
        requester_reference="GSN-U-REQUESTER-LONG",
        requester_trust={"score": 78, "band": "B", "updated_at": "2026-10-26 12:00 UTC"},
        status="pending",
        amount="75000",
        currency="NGN",
        support_gap="25000",
        supporters_required=6,
        supporters=supporters,
        repayments=repayments,
        timeline=timeline,
        redact=True,
        generated_at="2026-10-26 12:00 UTC",
    )

    _assert_pdf_bytes(pdf)
    with fitz.open(stream=pdf, filetype="pdf") as document:
        assert len(document) == 2
        page_text = [" ".join(page.get_text().split()) for page in document]
    assert all("GSN Support Evidence Pack" in text for text in page_text)
    assert all("not a bank guarantee" in text for text in page_text)
    normalized_text = " ".join(page_text)
    assert "This support request is recorded as pending." in normalized_text
    assert "Other recorded activity" in normalized_text
    assert "Metadata redacted for share copy" in normalized_text
    assert "opaque_internal_event" not in normalized_text


def test_populated_member_evidence_pdf_is_two_page_decision_first_and_share_safe():
    from app.services.user_evidence_pack_pdf_layout import build_member_evidence_document
    import fitz

    event_types = [
        "loan.created",
        "guarantor.requested",
        "repayment.claimed",
        "repayment.created",
        "repayment.auto_applied",
        "loan.repaid",
        "repayment.reversed",
        "loan_fully_repaid_reversed",
        "guarantor_success_reversed",
        "clan_join_via_invite",
        "opaque_internal_event",
    ]
    events = [
        {
            "created_at": f"2026-10-26 {23 - index:02d}:00 UTC",
            "event_type": event_types[index % len(event_types)],
            "context": (
                "Private support record / GSN member record"
                if index % 3 == 0
                else "GSN member record"
            ),
        }
        for index in range(18)
    ]

    pdf = build_member_evidence_document(
        member_reference="GSN-U-MEMBER-LONG",
        score=81,
        band="B",
        updated_at="2026-10-26 12:00 UTC",
        category_summary=[
            ("Full repayments", 4),
            ("Support completed", 3),
            ("Missed payments", 1),
            ("Defaults", 0),
        ],
        events=events,
        days=30,
        redact=True,
        generated_at="2026-10-26 12:00 UTC",
    )

    _assert_pdf_bytes(pdf)
    with fitz.open(stream=pdf, filetype="pdf") as document:
        assert len(document) == 2
        page_text = [" ".join(page.get_text().split()) for page in document]
    assert all("GSN Member Evidence Pack" in text for text in page_text)
    assert all("not a bank guarantee" in text for text in page_text)
    normalized_text = " ".join(page_text)
    assert "A trust snapshot and 18 recent evidence entries are recorded." in normalized_text
    assert "Other recorded activity" in normalized_text
    assert "Private support record" in normalized_text
    assert "Payment reported by member" in normalized_text
    assert "Payment confirmed" in normalized_text
    assert "Confirmed payment applied to support" in normalized_text
    assert "Full repayment recorded" in normalized_text
    assert "Repayment record reversed" in normalized_text
    assert "Full repayment status reversed" in normalized_text
    assert "Support outcome reversed" in normalized_text
    assert "opaque_internal_event" not in normalized_text


def test_repayment_reversal_event_labels_are_plain_across_timeline_papers():
    from app.services.trust_timeline_pdf_layout import event_type_label

    assert event_type_label("repayment.reversed", audience="user") == "Repayment record reversed"
    assert (
        event_type_label("loan_fully_repaid_reversed", audience="user")
        == "Full repayment status reversed"
    )
    assert (
        event_type_label("guarantor_success_reversed", audience="user")
        == "Support outcome reversed"
    )


def test_generated_trustslip_and_timeline_pdfs_return_valid_pdf_bytes(monkeypatch):
    from app.db.models import User
    from app.services.trust_slip_evidence_pdf_service import build_trust_slip_pdf
    from app.services import trust_timeline_pdf_service

    engine, db = _session()
    try:
        user = User(
            id=2,
            email="timeline-smoke@example.com",
            hashed_password="x",
            role="user",
            gmfn_id="GSN-U-PAPER-002",
            trust_score=81,
            trust_band="A",
        )
        db.add(user)
        db.commit()

        trustslip_summary = {
            "user_id": 2,
            "gmfn_id": "GSN-U-PAPER-002",
            "lifetime_trust": "1200.00",
            "standing_score": "81",
            "trust_slip_limit": "50000.00",
            "cci_score": "78",
            "cci_band": "B",
            "sponsor_count": 3,
            "evidence_summary": {
                "capacity_context": {
                    "available_guarantee_capacity": "100000.00",
                    "current_locked_guarantees": "20000.00",
                    "overexposure_ratio": "0.20",
                    "risk_level": "controlled",
                },
                "readiness_context": {
                    "recommendation": "review current context",
                    "readiness_score": "76",
                    "estimated_guarantee_gap": "10000.00",
                    "capacity_ratio": "0.90",
                },
            },
            "counts": {
                "full_repayments": 4,
                "guarantor_success": 2,
                "missed_payments": 0,
                "defaults": 0,
                "fraud_flags": 0,
            },
        }

        monkeypatch.setattr(
            trust_timeline_pdf_service,
            "get_trust_slip_payload",
            lambda db, user_id: {
                "gmfn_id": "GSN-U-PAPER-002",
                "generated_at": "2026-06-28T07:00:00+00:00",
                "phone_verified": True,
                "trust_score": "81",
                "cci_score": "78",
                "cci_band": "B",
                "code": "TS-GSN-PAPER-002",
                "trust_limit": "50000.00",
                "currency": "NGN",
                "merchant_visibility_level": "standard",
                "status": "active",
                "expires_at": "2026-07-05T07:00:00+00:00",
                "evidence_summary": trustslip_summary["evidence_summary"],
                "sponsors": [],
            },
        )
        monkeypatch.setattr(trust_timeline_pdf_service, "_load_events", lambda db, user_id, limit: [])

        trustslip_pdf = build_trust_slip_pdf(db, trustslip_summary, pack_meta={})
        _assert_pdf_bytes(trustslip_pdf)

        import fitz

        with fitz.open(stream=trustslip_pdf, filetype="pdf") as document:
            trustslip_text = " ".join(
                page.get_text() for page in document
            )
        normalized_trustslip_text = " ".join(trustslip_text.split())
        assert "Public verification is unavailable" in normalized_trustslip_text
        assert "No public TrustSlip code was available" in normalized_trustslip_text
        _assert_pdf_bytes(trust_timeline_pdf_service.build_trust_timeline_pdf(db, user_id=2, limit=5))
    finally:
        db.close()
        engine.dispose()


def test_generated_report_pdfs_return_valid_pdf_bytes():
    from app.db.models import Clan, Loan, User
    from app.services.reports_service import build_clan_exposure_report_pdf, build_loan_trust_report_pdf

    borrower = User(
        id=3,
        email="report-smoke@example.com",
        hashed_password="x",
        role="user",
        gmfn_id="GSN-U-PAPER-003",
    )
    clan = Clan(id=3, name="GSN Report Smoke Community", community_code="GSN-C-PAPER-003")
    loan = Loan(
        id=3,
        borrower_user_id=3,
        clan_id=3,
        amount=Decimal("30000.00"),
        currency="NGN",
        status="pending",
        pool_used=Decimal("5000.00"),
        guarantee_gap=Decimal("25000.00"),
        guarantors_required=2,
    )
    exposure_rows = [
        {
            "user_id": 3,
            "email": "report-smoke@example.com",
            "gmfn_id": "GSN-U-PAPER-003",
            "pool_balance": "5000.00",
            "exposure": "0.00",
            "available": "5000.00",
        }
    ]

    _assert_pdf_bytes(
        build_loan_trust_report_pdf(
            loan=loan,
            clan=clan,
            borrower=borrower,
            guarantors=[],
            repayments=[],
            trust_events=[],
            user_email_by_id={3: "report-smoke@example.com"},
            clan_exposure_rows=exposure_rows,
            borrower_trust_score={
                "band": "B",
                "standing_score": "74",
                "level_label": "Established",
                "lifetime_trust": "1200.00",
                "recency_factor": "1.00",
                "counts": {},
                "gains": {},
                "penalties": {},
            },
            guarantor_trust_scores={},
        )
    )
    _assert_pdf_bytes(
        build_clan_exposure_report_pdf(
            clan_id=3,
            clan_name="GSN Report Smoke Community",
            clan_exposure_rows=exposure_rows,
        )
    )


def test_simple_evidence_pdfs_use_gsn_institutional_shell():
    user_text = read_service("app/services/user_evidence_pack_pdf_service.py")
    user_layout = read_service("app/services/user_evidence_pack_pdf_layout.py")
    assert "build_member_evidence_document" in user_text
    assert "member_reference=gsn_id" in user_text
    assert "draw_institutional_header" in user_layout
    assert "draw_institutional_footer" in user_layout
    assert "safe_pdf_text" in user_layout
    assert "SimpleDocTemplate" in user_layout
    assert "LongTable" in user_layout
    assert "repeatRows=1" in user_layout
    assert "MEMBER EVIDENCE SNAPSHOT" in user_layout
    assert "Decision Boundary" in user_layout
    assert "Evidence context" in user_layout
    assert "Record security" in user_layout
    assert "Official evidence summary" not in user_layout
    assert "GMFN Evidence Pack" not in user_layout

    loan_text = read_service("app/services/loan_evidence_pack_pdf_service.py")
    loan_layout = read_service("app/services/loan_evidence_pack_pdf_layout.py")
    assert "build_support_evidence_document" in loan_text
    assert "community_reference=community_reference" in loan_text
    assert "support_reference=support_reference" in loan_text
    assert "draw_institutional_header" in loan_layout
    assert "draw_institutional_footer" in loan_layout
    assert "safe_pdf_text" in loan_layout
    assert "SimpleDocTemplate" in loan_layout
    assert "LongTable" in loan_layout
    assert "repeatRows=1" in loan_layout
    assert "SUPPORT EVIDENCE SNAPSHOT" in loan_layout
    assert "Decision Boundary" in loan_layout
    assert "Record security" in loan_layout
    assert "SUPPORT RECORD" in loan_layout
    assert "SUPPORT GAP" in loan_layout
    assert 'kv("Clan"' not in loan_text
    assert 'kv("Loan ID", str(loan_id))' not in loan_text

    community_text = read_service("app/services/evidence_pack_pdf_service.py")
    assert "community_reference = (" in community_text
    assert "draw_institutional_header" in community_text
    assert "draw_institutional_footer" in community_text
    assert "safe_pdf_text" in community_text
    assert "SimpleDocTemplate" in community_text
    assert "COMMUNITY EVIDENCE SNAPSHOT" in community_text
    assert "Decision Boundary" in community_text
    assert "Recent invite-led entries" in community_text
    assert "Recorded activity summary" in community_text
    assert "LongTable" in community_text
    assert "repeatRows=1" in community_text
    assert "Member joined by invite" in community_text
    assert "Community ID: {clan_id}" not in community_text
    assert "TrustEvent summary counts" not in community_text
    assert "Official evidence summary" not in community_text

    assert "Trust snapshot" in loan_layout
    assert "Evidence timeline for this support record" in loan_layout
    assert "GSN Support Evidence Pack" in loan_layout
    assert "GSN support evidence paper" in loan_layout
    assert "private support, supporter, and repayment details" in loan_layout
    assert "GSN Loan Evidence Pack" not in loan_layout
    assert "GSN loan evidence paper" not in loan_layout
    assert "Loan summary" not in loan_layout
    assert "Trust Snapshot (Explainable)" not in loan_layout
    assert "Trust timeline (events linked to this loan)" not in loan_layout


def test_trust_slip_pdf_uses_gsn_title_and_watermark():
    text = read_service("app/services/trust_slip_evidence_pdf_service.py")

    assert 'title="GSN TrustSlip Evidence Snapshot"' in text
    assert "pagesize=A4" in text
    assert "GSN TrustSlip Evidence Snapshot" in text
    assert "draw_institutional_header" in text
    assert "draw_institutional_footer" in text
    assert "Support signal" in text
    assert "KeepTogether" in text
    assert 'Paragraph("Check the live TrustSlip", styles["section"])' in text
    assert "Public verification is unavailable" in text
    assert "Merchant verification QR" not in text
    assert "Available support capacity" in text
    assert "Support pressure reading" in text
    assert "Estimated support gap" in text
    assert "GSN-PACK-TRUSTSLIP-" in text
    assert '"Private member reference", "redacted for TrustSlip evidence paper"' in text
    assert "TP-UNKNOWN" not in text
    assert '"User ID", summary.get("user_id")' not in text
    assert "TrustSlip Limit" not in text
    assert "Available Guarantee Capacity" not in text
    assert "Overexposure ratio" not in text
    assert "Estimated Guarantee Gap" not in text
    assert "from reportlab.lib.units import mm" in text
    assert "topMargin=80 * mm" in text
    assert "Confirmed By (Actor ID)" not in text
    assert "Confirmed by record" not in text
    assert "confirmation_source = (" in text
    assert "\"GSN recorded trust event\"" in text
    assert "Confirmation source" in text
    assert "Support record" in text
    assert "Private support record" in text
    assert "Reconciliation reference" in text
    assert "private operational detail redacted" in text
    assert "Confidential / Evidence Record" not in text
    assert "GSN TrustSlip evidence paper - controlled community trust record" in text
    assert "Support record ID" not in text
    assert "loan_id = event.loan_id" not in text
    assert "Payment reference" not in text
    assert "payment_reference" not in text
    assert "/trust-slips/ping" not in text
    assert "GMFN TrustSlip Evidence Snapshot" not in text


def test_trust_slip_pdf_route_uses_gsn_filename():
    text = read_service("app/api/routes/trust_slip_evidence.py")

    assert 'filename="gsn-trustslip-evidence.pdf"' in text
    assert "trust_slip_evidence.pdf" not in text
    assert "get_trust_slip_payload" in text
    assert "except ValueError:" in text
    assert "compute_trust_breakdown" in text


def test_trust_slip_release_helper_page_is_institutional_and_bounded():
    text = read_service("app/api/routes/trust_slips.py")

    assert "GSN TrustSlip Release Evidence Paper" in text
    assert "Security marks: GSN watermark" in text
    assert "This page prepares a protected release evidence record only" in text
    assert "does not collect" in text
    assert "confirm bank receipt" in text
    assert "approve credit" in text
    assert "guarantee delivery" in text
    assert "permission to release goods, credit, or money" in text
    assert "Release evidence helper; not a bank" in text
    assert "automatic release authority" in text
    assert "Use Swagger" not in text
    assert "Open Swagger" not in text
    assert 'href="/docs"' not in text
    assert "Log Release (Admin)" not in text


def test_public_trust_slip_verify_page_title_and_links_are_institutional():
    text = read_service("app/api/routes/trust_slips.py")

    assert '<title>GSN TrustSlip Verification Paper</title>' in text
    assert '<title>TrustSlip Verification</title>' not in text
    assert 'safe_code_path = quote(str(code), safe="")' in text
    assert 'print_link = f"/trust-slips/verify/{safe_code_path}/print?level={visibility_level}"' in text
    assert 'qr_img = f"/trust-slips/verify/{safe_code_path}/qr.png?level={visibility_level}"' in text
    assert '<div class="watermark-field" aria-hidden="true">' in text
    assert "<span>Public</span><span>Trust</span>" in text
    assert "border: 22px solid rgba(11,99,209,0.085)" in text
    assert '"A": "Strong evidence"' in text
    assert '"B": "Generally steady evidence"' in text
    assert '"A": "Strongly trusted"' not in text
    assert '"B": "Generally trusted"' not in text


def test_legacy_merchant_verify_ui_is_bounded_and_escaped_if_reenabled():
    text = read_service("app/api/routes/trust_slips_verify_ui.py")

    assert "from html import escape" in text
    assert "def html_text" in text
    assert "escape(text or fallback, quote=True)" in text
    assert "<title>GSN Merchant Verification Record</title>" in text
    assert "GSN Merchant Verification Record" in text
    assert "Record found" in text
    assert "release authority" in text
    assert "TrustSlip limit signal" in text
    assert "GSN does not guarantee delivery, receipt, repayment, or release of goods, credit, or money" in text
    assert "{html_text(user_id)}" in text
    assert "{html_text(level)}" in text
    assert "{html_text(level_label)}" in text
    assert "{html_text(trust_limit)}" in text
    assert "{html_text(prog.get(\"loan_id\"))}" in text
    assert "<div class=\"pill\">Verified</div>" not in text
    assert "<title>GSN Verification</title>" not in text
    assert "Borrower ID" not in text
    assert "does not guarantee delivery performance" not in text


def test_trust_timeline_pdf_uses_institutional_shell():
    service = read_service("app/services/trust_timeline_pdf_service.py")
    layout = read_service("app/services/trust_timeline_pdf_layout.py")
    text = service + layout

    assert 'title="GSN Trust Timeline"' in layout
    assert "draw_institutional_header" in text
    assert "draw_institutional_footer" in text
    assert "PRIVATE TRUST RECORD" in layout
    assert "Decision Boundary" in layout
    assert "RECORDED ACTIVITY" in layout
    assert "LongTable" in layout
    assert "repeatRows=1" in layout
    assert "Support signal" in text
    assert "Available support capacity" in text
    assert "Private contact" in text
    assert "redacted for timeline PDF" in text
    assert "def _timeline_contact_boundary" in service
    assert "def _audience_label" in service
    assert "Reader boundary: redacted personal trust history for controlled review." in text
    assert "private event details redacted for timeline PDF" in text
    assert "redact: bool = True" in service
    assert "pack_meta: Optional[Dict[str, Any]] = None" in service
    assert "build_timeline_document" in service
    assert "except ValueError:" in service
    assert "compute_trust_breakdown" in service
    assert "User Email" not in text
    assert "Email: {_mask_email" not in text
    assert "def _mask_email" not in text
    assert "Audience: {_safe_str(audience, 'user')}" not in text
    assert "Trust Limit" not in text
    assert "Locked Guarantees" not in text
    assert "Available Capacity" not in text
    assert "Capacity Ratio" not in text
    assert '"payment_reference"' not in text
    assert "GMFN Trust Timeline Evidence Report" not in text


def test_trust_timeline_pdf_route_uses_gsn_filename_and_user_audience_guard():
    text = read_service("app/api/routes/trust_timeline_pdf.py")

    assert "is_platform_admin" in text
    assert 'pdf_audience = "admin" if audience == "admin" and is_platform_admin else "user"' in text
    assert "redact=True" in text
    assert "build_trust_evidence_pack_zip_with_meta" not in text
    assert "except ValueError:" in text
    assert "compute_trust_breakdown" in text
    assert 'filename = f"gsn-trust-timeline-u{user_id}-{visibility_level}.pdf"' in text
    assert '"X-GSN-Merchant-Visibility-Level"' in text
    assert '"X-GSN-TrustSlip-Code"' in text
    assert '"X-GSN-CCI-Score"' in text
    assert "gmfn_trust_timeline" not in text
    assert "X-GMFN-Merchant-Visibility-Level" not in text


def test_portable_evidence_pack_zip_is_visibility_bound():
    text = read_service("app/services/evidence_pack_service.py")

    assert "PACK_ID_PATTERN" in text
    assert "GSN-PACK-(MINIMAL|STANDARD|DETAILED)" in text
    assert "def _safe_requested_pack_id" in text
    assert '"holder": {' in text
    assert '"gsn_id": getattr(current_user, "gmfn_id", None)' in text
    assert '"private_contact_details": "redacted for portable evidence pack"' in text
    assert '"merchant_view": merchant_view' in text
    assert '"private_summary_boundary"' in text
    assert "complete TrustSlip internals are not included" in text
    assert '"full_summary": summary' not in text
    assert '"user": {' not in text
    assert '"email": getattr(current_user, "email", None)' not in text
    assert '"phone_e164": getattr(current_user, "phone_e164", None)' not in text
    assert "GSN-PACK-U" not in text


def test_portable_evidence_pack_route_preserves_displayed_reference():
    text = read_service("app/api/routes/evidence_pack.py")

    assert "pack_id: Optional[str] = None" in text
    assert "level=visibility_level" in text
    assert "pack_id=pack_id" in text


def test_trust_why_evidence_references_are_opaque():
    for path in (
        "app/api/routes/trust_why.py",
        "app/api/routes/evidence_pack_trustwhy.py",
        "app/api/routes/admin_evidence_trustwhy.py",
    ):
        text = read_service(path)

        assert 'return f"GSN-WHY-{day}-{digest}"' in text
        assert "TP-U" not in text


def test_user_trust_why_evidence_json_redacts_member_reference():
    text = read_service("app/api/routes/evidence_pack_trustwhy.py")

    assert 'why_share.pop("user_id", None)' in text
    assert '"holder": {' in text
    assert '"private_member_reference": "redacted for user evidence pack"' in text
    assert '"user_id": uid' not in text


def test_evidence_verification_references_are_opaque_and_holder_safe():
    text = read_service("app/api/routes/evidence_verify.py")

    assert "GSN-EVID-" in text
    assert '"holder": {' in text
    assert '"private_member_reference": "redacted for evidence verification"' in text
    assert 'return f"TP-' not in text
    assert '"user_id": uid' not in text
    assert "tp:{user_id}" not in text


def test_legacy_trust_evidence_pack_zip_uses_gsn_reference_and_redacts_holder():
    text = read_service("app/services/trust_evidence_pack_service.py")

    assert "GSN-PACK-TRUST-" in text
    assert '"holder": {' in text
    assert '"private_member_reference": "redacted for trust evidence pack"' in text
    assert 'return f"TP-' not in text
    assert '"user_id": int(user_id)' not in text


def test_shipment_schema_uses_gsn_evidence_reference_language():
    text = read_service("app/api/routes/shipment.py")

    assert "GSN evidence reference for this delivery/support record" in text
    assert "Evidence Pack ID (TP-...)" not in text


def test_report_pdfs_use_gsn_institutional_shells():
    text = read_service("app/services/reports_service.py")

    assert "GSN Loan Trust Report" in text
    assert "GSN Community Exposure Report" in text
    assert "draw_institutional_header" in text
    assert "draw_institutional_footer" in text
    assert "safe_pdf_text" in text
    assert "Official evidence summary" in text
    assert "Official exposure summary" in text
    assert text.count("Reader Boundary") == 2
    assert "Redacted support evidence for allowed GSN reviewers" in text
    assert "Use complete-record exports only for authorized admin review." in text
    assert "Use redact=false only for admin complete-record review." not in text
    assert "meta redacted for share copy" in text
    assert "private member reference redacted" in text
    assert "Support Gap" in text
    assert "Requester Trust Snapshot" in text
    assert "Private community exposure evidence for allowed GSN reviewers" in text
    assert 'p("Community", f"{getattr(clan, \'name\', None) or \'-\'} (ID: {getattr(loan, \'clan_id\', \'-\')})")' in text
    assert 'p("Clan"' not in text
    assert "def _mask_email" not in text
    assert "Guarantee Gap" not in text
    assert 'p("Borrower"' not in text
    assert "Borrower Trust Snapshot" not in text
    assert text.count("GSN loan trust report - controlled community trust record.") == 2
    assert text.count("GSN community exposure report - controlled community trust record.") == 2
    assert "GMFN Loan Trust Report" not in text
    assert "GMFN Clan Exposure Report" not in text
    assert "GSN Clan Exposure Report" not in text


def test_governance_pack_uses_gsn_community_language():
    text = read_service("app/api/routes/reports.py")

    assert "ClanMembership.left_at.is_(None)" in text
    assert "is_platform_admin" in text
    assert "def _ensure_can_view_complete_loan_report" in text
    assert "_ensure_can_view_complete_loan_report(db, current_user=current_user, loan=loan)" in text
    assert "redact: bool = True" in text
    assert "redact=False" in text
    assert "GSN Community Governance Pack" in text
    assert "Community ID:" in text
    assert "Community Name:" in text
    assert "GSN Support Evidence Pack" in text
    assert "Support record:" in text
    assert "gsn-community-{clan_id}-governance-pack" in text
    assert "gsn_community_governance_pack" in text
    assert "complete_admin_record" in text
    assert "Audience: community admin or platform admin only" in text
    assert "Privacy: complete private admin record" in text
    assert "membership_status" in text
    assert "left_at" in text
    assert "gsn-loan-{loan.id}-trust-report.csv" in text
    assert "gsn-loan-{loan.id}-trust-report.pdf" in text
    assert "gsn-loan-{loan.id}-evidence-pack-{ts}.zip" in text
    assert '"artifact": "gsn_loan_evidence_pack"' in text
    assert "Use the redacted support trust report PDF for borrower-facing or outside review." in text
    assert "GMFN Clan Governance Pack" not in text
    assert "GMFN Loan Evidence Pack" not in text
    assert "GSN Loan Evidence Pack" not in text
    assert "Loan ID: {loan.id}" not in text
    assert "gmfn-loan-{loan.id}-trust-report.csv" not in text
    assert "gmfn-loan-{loan.id}-trust-report.pdf" not in text
    assert "gmfn-loan-{loan.id}-evidence-pack-{ts}.zip" not in text
    assert '"artifact": "gmfn_loan_evidence_pack"' not in text
    assert "Clan ID:" not in text
    assert "Clan Name:" not in text
    assert "gmfn-clan-{clan_id}-governance-pack" not in text


def test_analytics_evidence_downloads_use_gsn_filenames():
    text = read_service("app/api/routes/analytics.py")

    assert "def _ensure_clan_admin_or_platform_admin" in text
    assert "def _ensure_can_view_loan_evidence" in text
    assert "def _ensure_can_view_complete_loan_evidence" in text
    assert "Community admin or platform admin only" in text
    assert "Loan not found" in text
    assert "redact: bool = True" in text
    assert "if not redact:" in text
    assert "_ensure_can_view_complete_loan_evidence(db, current_user=user, loan=loan)" in text
    assert "build_clan_evidence_pack_pdf(db, clan_id=clan_id, redact=True)" in text
    assert "build_loan_evidence_pack_pdf(db, loan_id=loan_id, redact=True)" in text
    assert text.count("_ensure_clan_admin_or_platform_admin(db, current_user=user, clan_id=int(clan_id))") == 7
    assert "gsn-community-{clan_id}-recent-invite-joins.csv" in text
    assert "gsn-community-{clan_id}-trust-events.csv" in text
    assert "gsn-community-{clan_id}-evidence-pack.pdf" in text
    assert "gsn-loan-{loan_id}-evidence-pack.pdf" in text
    assert "GMFN_clan_{clan_id}_evidence_pack.pdf" not in text
    assert "GMFN_loan_{loan_id}_evidence_pack.pdf" not in text
    assert "clan_{clan_id}_recent_invite_joins.csv" not in text
    assert "clan_{clan_id}_trust_events.csv" not in text


def test_dormant_loan_audit_share_links_are_redacted_if_reenabled():
    text = read_service("app/api/routes/share.py")

    assert "router = APIRouter(prefix=\"/share\", tags=[\"share\"])" in text
    assert "ClanMembership.left_at.is_(None)" in text
    assert "def _can_view_complete_loan_record" in text
    assert 'str(getattr(current_user, "role", "") or "").lower() == "admin"' in text
    assert (
        'csv_url = f"{base}/reports/loans/{loan_id}/trust-report.csv" if can_view_complete else None'
        in text
    )
    assert '"complete_record_available": bool(can_view_complete)' in text
    assert "GSN Support Evidence" in text
    assert "Redacted PDF:" in text
    assert "Complete CSV (admin only):" in text
    assert "GSN Loan Evidence" not in text


def test_simple_evidence_pdfs_keep_reader_boundaries_and_redaction_guards():
    clan_text = read_service("app/services/evidence_pack_pdf_service.py")
    loan_text = read_service("app/services/loan_evidence_pack_pdf_service.py")
    loan_layout = read_service("app/services/loan_evidence_pack_pdf_layout.py")
    user_text = read_service("app/services/user_evidence_pack_pdf_service.py")
    user_layout = read_service("app/services/user_evidence_pack_pdf_layout.py")

    assert "def _mask_code" in clan_text
    assert "redact: bool = True" in clan_text
    assert 'headers = ["WHEN", "ENTRY", "INVITE REFERENCE"]' in clan_text
    assert 'invite_reference = _mask_code(row.get("invite_code"))' in clan_text
    assert "Decision Boundary" in clan_text
    assert '"Privacy"' in clan_text
    assert "Private member contacts, internal member IDs, and complete invite codes are not printed" in clan_text
    assert 'return EVENT_LABELS.get(raw, "Other recorded activity")' in clan_text
    assert "def _aggregate_event_counts" in clan_text
    assert "def _member_contact_boundary" not in clan_text
    assert "private member contact redacted" not in clan_text
    assert "r['invited_by_user_id']" not in clan_text
    assert "r.get('joined_user_id')" not in clan_text
    assert "r.get('invited_by_user_id')" not in clan_text
    assert "def _mask_email" not in clan_text

    assert "def _private_member_boundary" in loan_text
    assert "def member_reference" in loan_text
    assert "private member reference redacted" in loan_text
    assert "redact: bool = True" in loan_text
    assert "Decision Boundary" in loan_layout
    assert "Metadata redacted for share copy" in loan_layout
    assert "private support, supporter, and repayment details" in loan_layout
    assert "Private contacts, internal member IDs, and event metadata are not printed" in loan_layout
    assert "def _mask_email" not in loan_text
    assert "show_email" not in loan_text
    assert "r['email'] or r['user_id']" not in loan_text
    assert "payer={payer_email or payer_id}" not in loan_text
    assert "actor={actor_email or actor_id}" not in loan_text
    assert "subject={subject_email or subject_id}" not in loan_text

    assert "redact: bool = True" in user_text
    assert 'context.append("Private support record")' in user_text
    assert 'context.append("GSN member record")' in user_text
    assert "Decision Boundary" in user_layout
    assert "private member evidence" in user_layout
    assert "Private contact details, internal member IDs, support record numbers, and event metadata are not printed" in user_layout
    assert "Other recorded activity" in user_layout
    assert "User ID: {user_id}" not in user_text
    assert "Email: {email or '-'}" not in user_text
    assert "reference=f\"User {user_id}\"" not in user_text
    assert "def _mask_email" not in user_text
    assert "loan={loan_id}" not in user_text
    assert "src={src}" not in user_text
    assert "meta_json" not in user_layout

    for text in [clan_text, loan_layout, user_layout]:
        assert "visa / partner framing" not in text
        assert "Visa/partner framing" not in text
        assert "bank guarantee, credit approval, payment instruction, or automatic debit authority" in text
