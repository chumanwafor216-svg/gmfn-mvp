from __future__ import annotations

import os
from typing import Optional

from app.services.verification_adapters.bank_truelayer_gb import (
    TrueLayerGBBankVerificationAdapter,
)
from app.services.verification_adapters.base import (
    VERIFICATION_STATUS_MANUAL_REVIEW,
    VERIFICATION_STATUS_UNAVAILABLE,
    VerificationAdapter,
    VerificationAdapterRequest,
    VerificationAdapterResult,
)


class UnavailableVerificationAdapter(VerificationAdapter):
    def __init__(self, provider_key: str, explanation: str) -> None:
        self.provider_key = provider_key
        self._explanation = explanation

    def verify(self, request: VerificationAdapterRequest) -> VerificationAdapterResult:
        return VerificationAdapterResult(
            provider_key=self.provider_key,
            status=VERIFICATION_STATUS_UNAVAILABLE,
            explanation=self._explanation,
            confidence_score=None,
            normalized_identity={},
            provider_response={
                "provider_configured": False,
                "region_code": request.region_code,
                "verification_type": request.verification_type,
            },
        )


class ManualReviewAdapter(VerificationAdapter):
    def __init__(self, provider_key: str, explanation: str) -> None:
        self.provider_key = provider_key
        self._explanation = explanation

    def verify(self, request: VerificationAdapterRequest) -> VerificationAdapterResult:
        return VerificationAdapterResult(
            provider_key=self.provider_key,
            status=VERIFICATION_STATUS_MANUAL_REVIEW,
            explanation=self._explanation,
            confidence_score=25,
            normalized_identity={},
            provider_response={
                "provider_configured": False,
                "region_code": request.region_code,
                "verification_type": request.verification_type,
            },
        )


def _region(value: object) -> Optional[str]:
    raw = str(value or "").strip().upper()
    return raw or None


def _bank_provider_for_region(region: str) -> str:
    if region == "GB":
        return str(os.getenv("GMFN_BANK_PROVIDER_GB") or "").strip().lower()
    return str(os.getenv(f"GMFN_BANK_PROVIDER_{region}") or "").strip().lower()


def _pilot_record_only_enabled() -> bool:
    raw = str(os.getenv("GMFN_VERIFICATION_MODE") or "").strip().lower()
    if raw in {"live", "provider", "providers", "external"}:
        return False
    if raw in {"record-only", "record", "pilot", "manual", ""}:
        return True
    return True


def route_bank_verification(region_code: object) -> VerificationAdapter:
    region = _region(region_code)
    if not region:
        return ManualReviewAdapter(
            "bank.manual-review",
            "Bank verification needs a clear region code before a provider can be selected.",
        )

    provider = _bank_provider_for_region(region)
    if _pilot_record_only_enabled():
        provider_key = f"bank.{region.lower()}.record-only"
        return UnavailableVerificationAdapter(
            provider_key,
            f"Live bank verification is suspended during pilot testing for region {region}. The system recorded the details as reviewable evidence instead.",
        )

    if region == "GB" and provider == "truelayer":
        return TrueLayerGBBankVerificationAdapter()

    provider_map = {
        "GB": "bank.gb.stub",
        "NG": "bank.ng.stub",
        "US": "bank.us.stub",
        "IN": "bank.in.stub",
        "KE": "bank.ke.stub",
        "GH": "bank.gh.stub",
    }
    provider_key = provider_map.get(region, f"bank.{region.lower()}.stub")
    return UnavailableVerificationAdapter(
        provider_key,
        f"Live bank verification is not configured yet for region {region}. The system can record the request and route it to a provider later.",
    )


def route_drivers_licence_verification(region_code: object) -> VerificationAdapter:
    region = _region(region_code)
    if not region:
        return ManualReviewAdapter(
            "drivers-licence.manual-review",
            "Driver's licence verification needs a clear issuing region before a provider can be selected.",
        )

    provider_map = {
        "GB": "drivers-licence.gb.stub",
        "US": "drivers-licence.us.stub",
        "IN": "drivers-licence.in.stub",
        "AU": "drivers-licence.au.stub",
        "NG": "drivers-licence.ng.stub",
    }
    provider_key = provider_map.get(region, f"drivers-licence.{region.lower()}.stub")
    return UnavailableVerificationAdapter(
        provider_key,
        f"Live driver's licence verification is not configured yet for region {region}. The system can record the request and route it to a provider later.",
    )
