import os

from app.services.verification_adapters.base import (
    VERIFICATION_STATUS_MANUAL_REVIEW,
    VERIFICATION_STATUS_MATCHED,
    VERIFICATION_STATUS_UNAVAILABLE,
)
from app.services.verification_adapters.bank_truelayer_gb import (
    TrueLayerGBBankVerificationAdapter,
)
from app.services.verification_router import route_bank_verification


def test_route_bank_verification_records_only_by_default_for_gb(monkeypatch):
    monkeypatch.delenv("GMFN_VERIFICATION_MODE", raising=False)
    monkeypatch.setenv("GMFN_BANK_PROVIDER_GB", "truelayer")
    monkeypatch.delenv("TRUELAYER_ACCESS_TOKEN", raising=False)

    adapter = route_bank_verification("GB")

    result = adapter.verify(
        request=type(
            "Req",
            (),
            {
                "verification_type": "bank",
                "region_code": "GB",
                "payload": {"destination_name": "John Doe"},
            },
        )()
    )
    assert result.status == VERIFICATION_STATUS_UNAVAILABLE
    assert "suspended during pilot" in result.explanation.lower()


def test_route_bank_verification_uses_truelayer_for_gb_when_live_enabled(monkeypatch):
    monkeypatch.setenv("GMFN_VERIFICATION_MODE", "live")
    monkeypatch.setenv("GMFN_BANK_PROVIDER_GB", "truelayer")
    monkeypatch.delenv("TRUELAYER_ACCESS_TOKEN", raising=False)

    adapter = route_bank_verification("GB")

    assert isinstance(adapter, TrueLayerGBBankVerificationAdapter)


def test_truelayer_gb_adapter_requires_sort_code_or_iban(monkeypatch):
    monkeypatch.setenv("TRUELAYER_ACCESS_TOKEN", "token")
    adapter = TrueLayerGBBankVerificationAdapter()

    result = adapter.verify(
        request=type(
            "Req",
            (),
            {
                "verification_type": "bank",
                "region_code": "GB",
                "payload": {
                    "destination_name": "John Doe",
                    "account_number": "12345678",
                },
            },
        )()
    )

    assert result.status == VERIFICATION_STATUS_MANUAL_REVIEW
    assert "sort code" in result.explanation.lower() or "iban" in result.explanation.lower()


def test_truelayer_gb_adapter_maps_match_result(monkeypatch):
    monkeypatch.setenv("TRUELAYER_ACCESS_TOKEN", "token")
    adapter = TrueLayerGBBankVerificationAdapter()

    responses = [
        {"id": "ahv-123"},
        {"id": "ahv-123", "status": "completed", "match_result": {"type": "match"}},
    ]

    def fake_request_json(*, method, url, body=None):
        return responses.pop(0)

    adapter._request_json = fake_request_json  # type: ignore[attr-defined]

    result = adapter.verify(
        request=type(
            "Req",
            (),
            {
                "verification_type": "bank",
                "region_code": "GB",
                "payload": {
                    "destination_name": "John Doe",
                    "account_number": "12345678",
                    "sort_code": "123456",
                },
            },
        )()
    )

    assert result.status == VERIFICATION_STATUS_MATCHED
    assert "matched" in result.explanation.lower()
