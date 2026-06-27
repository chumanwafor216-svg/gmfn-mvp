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
    assert "GMFN TrustSlip Evidence Snapshot" not in text


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
    assert "Trust Limit" not in text
    assert "Locked Guarantees" not in text
    assert "Available Capacity" not in text
    assert "Capacity Ratio" not in text
    assert "GMFN Trust Timeline Evidence Report" not in text


def test_report_pdfs_use_gsn_institutional_shells():
    text = read_service("app/services/reports_service.py")

    assert "GSN Loan Trust Report" in text
    assert "GSN Community Exposure Report" in text
    assert "draw_institutional_header" in text
    assert "draw_institutional_footer" in text
    assert "safe_pdf_text" in text
    assert "Official evidence summary" in text
    assert "Official exposure summary" in text
    assert 'p("Community", f"{getattr(clan, \'name\', None) or \'-\'} (ID: {getattr(loan, \'clan_id\', \'-\')})")' in text
    assert 'p("Clan"' not in text
    assert text.count("GSN loan trust report - controlled community trust record.") == 2
    assert text.count("GSN community exposure report - controlled community trust record.") == 2
    assert "GMFN Loan Trust Report" not in text
    assert "GMFN Clan Exposure Report" not in text
    assert "GSN Clan Exposure Report" not in text


def test_governance_pack_uses_gsn_community_language():
    text = read_service("app/api/routes/reports.py")

    assert "GSN Community Governance Pack" in text
    assert "Community ID:" in text
    assert "Community Name:" in text
    assert "GSN Loan Evidence Pack" in text
    assert "gsn-community-{clan_id}-governance-pack" in text
    assert "GMFN Clan Governance Pack" not in text
    assert "GMFN Loan Evidence Pack" not in text
    assert "Clan ID:" not in text
    assert "Clan Name:" not in text
    assert "gmfn-clan-{clan_id}-governance-pack" not in text


def test_analytics_evidence_downloads_use_gsn_filenames():
    text = read_service("app/api/routes/analytics.py")

    assert "gsn-community-{clan_id}-recent-invite-joins.csv" in text
    assert "gsn-community-{clan_id}-trust-events.csv" in text
    assert "gsn-community-{clan_id}-evidence-pack.pdf" in text
    assert "gsn-loan-{loan_id}-evidence-pack.pdf" in text
    assert "GMFN_clan_{clan_id}_evidence_pack.pdf" not in text
    assert "GMFN_loan_{loan_id}_evidence_pack.pdf" not in text
    assert "clan_{clan_id}_recent_invite_joins.csv" not in text
    assert "clan_{clan_id}_trust_events.csv" not in text
