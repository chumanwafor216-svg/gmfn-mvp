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


def test_trust_slip_pdf_uses_gsn_title_and_watermark():
    text = read_service("app/services/trust_slip_evidence_pdf_service.py")

    assert 'title="GSN TrustSlip Evidence Snapshot"' in text
    assert "pagesize=A4" in text
    assert "GSN TrustSlip Evidence Snapshot" in text
    assert "draw_gsn_watermark" in text
    assert "draw_institutional_footer" in text
    assert "GMFN TrustSlip Evidence Snapshot" not in text
