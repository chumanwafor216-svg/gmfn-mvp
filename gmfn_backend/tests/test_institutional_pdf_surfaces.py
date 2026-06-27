from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_service(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_shared_institutional_pdf_helper_exists():
    text = read_service("app/services/institutional_pdf.py")

    assert "def draw_gsn_watermark" in text
    assert "def draw_institutional_header" in text
    assert "def draw_institutional_footer" in text
    assert "GLOBAL SUPPORT NETWORK" in text


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
    assert "Estimated support gap" in text
    assert "TrustSlip Limit" not in text
    assert "Available Guarantee Capacity" not in text
    assert "Estimated Guarantee Gap" not in text
    assert "Confirmed By (Actor ID)" not in text
    assert "Confirmed by record" not in text
    assert "confirmation_source = \"GSN recorded trust event\"" in text
    assert "Confirmation source" in text
    assert "Support record" in text
    assert "Private support record" in text
    assert "Reconciliation reference" in text
    assert "private operational detail redacted" in text
    assert "Support record ID" not in text
    assert "loan_id = event.loan_id" not in text
    assert "Payment reference" not in text
    assert "payment_reference" not in text
    assert "GMFN TrustSlip Evidence Snapshot" not in text


def test_trust_slip_pdf_route_uses_gsn_filename():
    text = read_service("app/api/routes/trust_slip_evidence.py")

    assert 'filename="gsn-trustslip-evidence.pdf"' in text
    assert "trust_slip_evidence.pdf" not in text


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
    assert "Reader boundary: redacted personal trust history for controlled review." in text
    assert "private event details redacted for timeline PDF" in text
    assert "redact: bool = True" in text
    assert "pack_meta: Optional[Dict[str, Any]] = None" in text
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
    assert "Use redact=false only for admin complete-record review." in text
    assert "meta redacted for share copy" in text
    assert "Private community exposure evidence for allowed GSN reviewers" in text
    assert 'p("Community", f"{getattr(clan, \'name\', None) or \'-\'} (ID: {getattr(loan, \'clan_id\', \'-\')})")' in text
    assert 'p("Clan"' not in text
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
    assert "Community admin or platform admin only" in text
    assert "Loan not found" in text
    assert "redact: bool = True" in text
    assert text.count("_ensure_clan_admin_or_platform_admin(db, current_user=user, clan_id=int(clan_id))") == 6
    assert "gsn-community-{clan_id}-recent-invite-joins.csv" in text
    assert "gsn-community-{clan_id}-trust-events.csv" in text
    assert "gsn-community-{clan_id}-evidence-pack.pdf" in text
    assert "gsn-loan-{loan_id}-evidence-pack.pdf" in text
    assert "GMFN_clan_{clan_id}_evidence_pack.pdf" not in text
    assert "GMFN_loan_{loan_id}_evidence_pack.pdf" not in text
    assert "clan_{clan_id}_recent_invite_joins.csv" not in text
    assert "clan_{clan_id}_trust_events.csv" not in text


def test_simple_evidence_pdfs_keep_reader_boundaries_and_redaction_guards():
    clan_text = read_service("app/services/evidence_pack_pdf_service.py")
    loan_text = read_service("app/services/loan_evidence_pack_pdf_service.py")
    user_text = read_service("app/services/user_evidence_pack_pdf_service.py")

    assert "def _mask_code" in clan_text
    assert "invite_code = _mask_code" in clan_text
    assert "Reader boundary" in clan_text
    assert "redacted share copy for outside review" in clan_text

    assert "Reader boundary" in loan_text
    assert "meta: redacted for share copy" in loan_text
    assert "private loan, supporter, and repayment details" in loan_text

    assert "Reader boundary" in user_text
    assert "private member evidence" in user_text
    assert "support record=private operational detail redacted" in user_text
    assert "source=GSN member record" in user_text
    assert "loan={loan_id}" not in user_text
    assert "src={src}" not in user_text

    for text in [clan_text, loan_text, user_text]:
        assert "visa / partner framing" not in text
        assert "Visa/partner framing" not in text
        assert "bank guarantee, credit approval, payment instruction, or automatic debit authority" in text
