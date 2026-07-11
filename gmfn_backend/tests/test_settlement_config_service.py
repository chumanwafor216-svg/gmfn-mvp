from __future__ import annotations

from app.services.settlement_config_service import get_settlement_config


def _clear_country_settlement_env(monkeypatch, country: str) -> None:
    for name in (
        "BANK_NAME",
        "ACCOUNT_NAME",
        "ACCOUNT_NUMBER",
        "SORT_CODE",
        "BANK_CODE",
        "BRANCH_CODE",
        "IBAN",
        "SWIFT_BIC",
        "BIC",
        "SUPPORT_NOTE",
    ):
        monkeypatch.delenv(f"GMFN_SETTLEMENT_{country}_{name}", raising=False)


def test_country_specific_settlement_prefers_uk_prefix(monkeypatch):
    _clear_country_settlement_env(monkeypatch, "UK")
    _clear_country_settlement_env(monkeypatch, "GB")
    monkeypatch.setenv("GMFN_SETTLEMENT_COUNTRY", "NG")
    monkeypatch.setenv("GMFN_SETTLEMENT_BANK_NAME", "Nigeria Fallback Bank")
    monkeypatch.setenv("GMFN_SETTLEMENT_ACCOUNT_NAME", "GSN Nigeria")
    monkeypatch.setenv("GMFN_SETTLEMENT_ACCOUNT_NUMBER", "1111111111")
    monkeypatch.setenv("GMFN_SETTLEMENT_UK_BANK_NAME", "Pilot UK Bank")
    monkeypatch.setenv("GMFN_SETTLEMENT_UK_ACCOUNT_NAME", "GSN UK Pilot")
    monkeypatch.setenv("GMFN_SETTLEMENT_UK_ACCOUNT_NUMBER", "12345678")
    monkeypatch.setenv("GMFN_SETTLEMENT_UK_SORT_CODE", "12-34-56")

    settlement = get_settlement_config("United Kingdom")

    assert settlement["country"] == "GB"
    assert settlement["country_label"] == "United Kingdom"
    assert settlement["bank_name"] == "Pilot UK Bank"
    assert settlement["account_name"] == "GSN UK Pilot"
    assert settlement["account_number"] == "12345678"
    assert settlement["sort_code"] == "12-34-56"
    assert settlement["configured"] is True


def test_other_country_does_not_reuse_global_bank_details(monkeypatch):
    _clear_country_settlement_env(monkeypatch, "UK")
    _clear_country_settlement_env(monkeypatch, "GB")
    monkeypatch.setenv("GMFN_SETTLEMENT_COUNTRY", "NG")
    monkeypatch.setenv("GMFN_SETTLEMENT_BANK_NAME", "Nigeria Fallback Bank")
    monkeypatch.setenv("GMFN_SETTLEMENT_ACCOUNT_NAME", "GSN Nigeria")
    monkeypatch.setenv("GMFN_SETTLEMENT_ACCOUNT_NUMBER", "1111111111")

    settlement = get_settlement_config("GB")

    assert settlement["country"] == "GB"
    assert settlement["account_number"] == "To be assigned"
    assert settlement["configured"] is False
