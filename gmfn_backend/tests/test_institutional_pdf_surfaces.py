from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth


ROOT = Path(__file__).resolve().parents[1]


def read_service(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_shared_institutional_pdf_helper_exists():
    text = read_service("app/services/institutional_pdf.py")

    assert "def draw_gsn_watermark" in text
    assert "def draw_institutional_header" in text
    assert "def draw_institutional_footer" in text
    assert "GLOBAL SUPPORT NETWORK" in text
    assert "Security marks: GSN watermark | UTC time | reference | limitation" in text


class _RecordingPdfCanvas:
    def __init__(self):
        self.draw_strings = []
        self.round_rects = []

    def saveState(self):
        pass

    def restoreState(self):
        pass

    def setFillAlpha(self, value):
        pass

    def setStrokeAlpha(self, value):
        pass

    def translate(self, x, y):
        pass

    def rotate(self, degrees):
        pass

    def setFillColor(self, color):
        pass

    def setStrokeColor(self, color):
        pass

    def setLineWidth(self, value):
        pass

    def setFont(self, name, size):
        pass

    def drawCentredString(self, x, y, text):
        self.draw_strings.append(("center", x, y, text))

    def drawString(self, x, y, text):
        self.draw_strings.append(("left", x, y, text))

    def roundRect(self, x, y, width, height, radius, stroke=1, fill=0):
        self.round_rects.append((x, y, width, height, radius, stroke, fill))

    def line(self, x1, y1, x2, y2):
        pass


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


def test_simple_evidence_pdfs_use_gsn_institutional_shell():
    for service in [
        "app/services/evidence_pack_pdf_service.py",
        "app/services/loan_evidence_pack_pdf_service.py",
        "app/services/user_evidence_pack_pdf_service.py",
    ]:
        text = read_service(service)

        assert "draw_institutional_header" in text
        assert "draw_institutional_footer" in text
        assert "safe_pdf_text" in text
        assert "Official evidence summary" in text
        assert "GMFN Evidence Pack" not in text

    loan_text = read_service("app/services/loan_evidence_pack_pdf_service.py")
    assert 'kv("Community", clan_name or "-")' in loan_text
    assert 'kv("Clan"' not in loan_text


def test_trust_slip_pdf_uses_gsn_title_and_watermark():
    text = read_service("app/services/trust_slip_evidence_pdf_service.py")

    assert 'title="GSN TrustSlip Evidence Snapshot"' in text
    assert "pagesize=A4" in text
    assert "GSN TrustSlip Evidence Snapshot" in text
    assert "draw_institutional_header" in text
    assert "draw_institutional_footer" in text
    assert "Trust-limit signal" in text
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
    assert "Confirmed By (Actor ID)" not in text
    assert "Confirmed by record" not in text
    assert "confirmation_source = \"GSN recorded trust event\"" in text
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
    assert "GMFN TrustSlip Evidence Snapshot" not in text


def test_trust_slip_pdf_route_uses_gsn_filename():
    text = read_service("app/api/routes/trust_slip_evidence.py")

    assert 'filename="gsn-trustslip-evidence.pdf"' in text
    assert "trust_slip_evidence.pdf" not in text


def test_trust_slip_release_helper_page_is_institutional_and_bounded():
    text = read_service("app/api/routes/trust_slips.py")

    assert "GSN TrustSlip Release Evidence Paper" in text
    assert "Security marks: GSN watermark" in text
    assert "This page prepares an admin release evidence record only" in text
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
    text = read_service("app/services/trust_timeline_pdf_service.py")

    assert "GSN Trust Timeline Evidence Report" in text
    assert "draw_institutional_header" in text
    assert "draw_institutional_footer" in text
    assert "safe_pdf_text(text)" in text
    assert "Trust-limit signal" in text
    assert "Available support capacity" in text
    assert "Current locked support" in text
    assert "Support capacity ratio" in text
    assert "Private contact" in text
    assert "redacted for timeline PDF" in text
    assert "def _timeline_contact_boundary" in text
    assert "def _audience_label" in text
    assert "Reader boundary: redacted personal trust history for controlled review." in text
    assert "private event details redacted for timeline PDF" in text
    assert "redact: bool = True" in text
    assert "pack_meta: Optional[Dict[str, Any]] = None" in text
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
    assert "GSN Loan Evidence Pack" in text
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
    assert "Use the redacted loan trust report PDF for borrower-facing or outside review." in text
    assert "GMFN Clan Governance Pack" not in text
    assert "GMFN Loan Evidence Pack" not in text
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
    assert text.count("_ensure_clan_admin_or_platform_admin(db, current_user=user, clan_id=int(clan_id))") == 6
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
    user_text = read_service("app/services/user_evidence_pack_pdf_service.py")

    assert "def _mask_code" in clan_text
    assert "def _member_contact_boundary" in clan_text
    assert "private member contact redacted" in clan_text
    assert "redact: bool = True" in clan_text
    assert "invite_code = _mask_code" in clan_text
    assert "Reader boundary" in clan_text
    assert "redacted share copy for outside review" in clan_text
    assert "r['invited_by_user_id']" not in clan_text
    assert "r.get('joined_user_id')" not in clan_text
    assert "r.get('invited_by_user_id')" not in clan_text
    assert "def _mask_email" not in clan_text

    assert "def _private_member_boundary" in loan_text
    assert "def member_reference" in loan_text
    assert "private member reference redacted" in loan_text
    assert "redact: bool = True" in loan_text
    assert "Reader boundary" in loan_text
    assert "meta: redacted for share copy" in loan_text
    assert "private loan, supporter, and repayment details" in loan_text
    assert "def _mask_email" not in loan_text
    assert "show_email" not in loan_text
    assert "r['email'] or r['user_id']" not in loan_text
    assert "payer={payer_email or payer_id}" not in loan_text
    assert "actor={actor_email or actor_id}" not in loan_text
    assert "subject={subject_email or subject_id}" not in loan_text

    assert "redact: bool = True" in user_text
    assert "Private member reference" in user_text
    assert "Private contact" in user_text
    assert "redacted for member evidence paper" in user_text
    assert "Reader boundary" in user_text
    assert "private member evidence" in user_text
    assert "support record=private operational detail redacted" in user_text
    assert "source=GSN member record" in user_text
    assert "User ID: {user_id}" not in user_text
    assert "Email: {email or '-'}" not in user_text
    assert "reference=f\"User {user_id}\"" not in user_text
    assert "def _mask_email" not in user_text
    assert "loan={loan_id}" not in user_text
    assert "src={src}" not in user_text

    for text in [clan_text, loan_text, user_text]:
        assert "visa / partner framing" not in text
        assert "Visa/partner framing" not in text
        assert "bank guarantee, credit approval, payment instruction, or automatic debit authority" in text
