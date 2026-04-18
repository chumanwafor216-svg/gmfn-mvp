from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
import uuid
from typing import Any, Dict, Optional

from app.services.verification_adapters.base import (
    VERIFICATION_STATUS_FAILED,
    VERIFICATION_STATUS_MANUAL_REVIEW,
    VERIFICATION_STATUS_MATCHED,
    VERIFICATION_STATUS_PARTIAL_MATCH,
    VERIFICATION_STATUS_UNAVAILABLE,
    VerificationAdapter,
    VerificationAdapterRequest,
    VerificationAdapterResult,
)


class TrueLayerGBBankVerificationAdapter(VerificationAdapter):
    provider_key = "bank.gb.truelayer"

    def __init__(
        self,
        *,
        access_token: Optional[str] = None,
        api_base_url: Optional[str] = None,
        poll_attempts: int = 4,
        poll_delay_seconds: float = 0.4,
    ) -> None:
        self.access_token = str(
            access_token or os.getenv("TRUELAYER_ACCESS_TOKEN") or ""
        ).strip()
        self.api_base_url = str(
            api_base_url
            or os.getenv("TRUELAYER_API_BASE_URL")
            or "https://api.truelayer.com"
        ).strip().rstrip("/")
        self.poll_attempts = max(1, int(poll_attempts))
        self.poll_delay_seconds = max(0.0, float(poll_delay_seconds))

    def verify(self, request: VerificationAdapterRequest) -> VerificationAdapterResult:
        if not self.access_token:
            return VerificationAdapterResult(
                provider_key=self.provider_key,
                status=VERIFICATION_STATUS_UNAVAILABLE,
                explanation=(
                    "TrueLayer is selected for GB bank verification, but TRUELAYER_ACCESS_TOKEN is not configured yet."
                ),
                provider_response={"provider_configured": False},
            )

        payload = request.payload or {}
        account_holder_name = str(payload.get("destination_name") or "").strip()
        account_number = str(payload.get("account_number") or "").strip().replace(" ", "")
        sort_code = (
            str(payload.get("sort_code") or "")
            .strip()
            .replace(" ", "")
            .replace("-", "")
        )
        iban = str(payload.get("iban") or "").strip().replace(" ", "")

        if not account_holder_name:
            return VerificationAdapterResult(
                provider_key=self.provider_key,
                status=VERIFICATION_STATUS_MANUAL_REVIEW,
                explanation="GB verification needs the account holder name before the bank check can run.",
                confidence_score=20,
                provider_response={"provider_configured": True},
            )

        account_identifier: Optional[Dict[str, Any]] = None
        if sort_code and account_number:
            account_identifier = {
                "type": "sort_code_account_number",
                "sort_code": sort_code,
                "account_number": account_number,
            }
        elif iban:
            account_identifier = {
                "type": "iban",
                "iban": iban,
            }

        if not account_identifier:
            return VerificationAdapterResult(
                provider_key=self.provider_key,
                status=VERIFICATION_STATUS_MANUAL_REVIEW,
                explanation=(
                    "GB verification needs either a sort code and account number, or an IBAN, before TrueLayer can check the account."
                ),
                confidence_score=25,
                provider_response={"provider_configured": True},
            )

        request_body = {
            "account_holder_name": account_holder_name,
            "account_identifier": account_identifier,
        }

        try:
            created = self._request_json(
                method="POST",
                url=f"{self.api_base_url}/v3/account-holder-verifications/requests",
                body=request_body,
            )
        except urllib.error.HTTPError as exc:
            detail = self._read_error(exc)
            return VerificationAdapterResult(
                provider_key=self.provider_key,
                status=VERIFICATION_STATUS_FAILED,
                explanation=f"TrueLayer rejected the GB bank verification request. {detail}",
                confidence_score=0,
                provider_response={"http_status": exc.code, "detail": detail},
            )
        except Exception as exc:  # pragma: no cover - defensive
            return VerificationAdapterResult(
                provider_key=self.provider_key,
                status=VERIFICATION_STATUS_FAILED,
                explanation=f"TrueLayer GB bank verification could not be completed. {exc}",
                confidence_score=0,
                provider_response={"error": str(exc)},
            )

        verification_id = str(created.get("id") or "").strip()
        if not verification_id:
            return VerificationAdapterResult(
                provider_key=self.provider_key,
                status=VERIFICATION_STATUS_FAILED,
                explanation="TrueLayer accepted the request but did not return a verification id.",
                confidence_score=0,
                provider_response=created,
            )

        last_response: Dict[str, Any] = created
        for attempt in range(self.poll_attempts):
            if attempt > 0 and self.poll_delay_seconds > 0:
                time.sleep(self.poll_delay_seconds)
            try:
                last_response = self._request_json(
                    method="GET",
                    url=f"{self.api_base_url}/v3/account-holder-verifications/requests/{verification_id}",
                )
            except Exception as exc:  # pragma: no cover - defensive
                return VerificationAdapterResult(
                    provider_key=self.provider_key,
                    status=VERIFICATION_STATUS_FAILED,
                    explanation=f"TrueLayer GB bank verification could not be monitored. {exc}",
                    confidence_score=0,
                    provider_response={"verification_id": verification_id, "error": str(exc)},
                )

            status = str(last_response.get("status") or "").strip().lower()
            if status == "pending":
                continue

            match_result = last_response.get("match_result") or {}
            match_type = str(match_result.get("type") or "").strip().lower()

            if status == "completed" and match_type == "match":
                return VerificationAdapterResult(
                    provider_key=self.provider_key,
                    status=VERIFICATION_STATUS_MATCHED,
                    explanation="The account holder name matched the bank details returned by TrueLayer for this GB account.",
                    confidence_score=95,
                    normalized_identity={
                        "account_holder_name": account_holder_name,
                        "account_number_last4": account_number[-4:] if account_number else None,
                        "sort_code": sort_code or None,
                        "iban_last4": iban[-4:] if iban else None,
                    },
                    provider_response=last_response,
                )

            if status == "completed" and match_type == "partial_match":
                account_holder_returned = str(match_result.get("account_holder_name") or "").strip()
                return VerificationAdapterResult(
                    provider_key=self.provider_key,
                    status=VERIFICATION_STATUS_PARTIAL_MATCH,
                    explanation=(
                        "TrueLayer found a partial name match for this GB account."
                        + (f" Returned account holder name: {account_holder_returned}." if account_holder_returned else "")
                    ),
                    confidence_score=60,
                    normalized_identity={
                        "account_holder_name": account_holder_returned or account_holder_name,
                        "account_number_last4": account_number[-4:] if account_number else None,
                        "sort_code": sort_code or None,
                        "iban_last4": iban[-4:] if iban else None,
                    },
                    provider_response=last_response,
                )

            if status == "completed" and match_type == "no_match":
                return VerificationAdapterResult(
                    provider_key=self.provider_key,
                    status=VERIFICATION_STATUS_FAILED,
                    explanation="TrueLayer reported that the submitted account holder name did not match this GB bank account.",
                    confidence_score=5,
                    provider_response=last_response,
                )

            if status == "completed" and match_type == "match_not_possible":
                failure_reason = str(match_result.get("failure_reason") or match_result.get("reason") or "").strip()
                return VerificationAdapterResult(
                    provider_key=self.provider_key,
                    status=VERIFICATION_STATUS_MANUAL_REVIEW,
                    explanation=(
                        "TrueLayer could not confirm a direct match for this GB bank account."
                        + (f" {failure_reason}" if failure_reason else "")
                    ),
                    confidence_score=30,
                    provider_response=last_response,
                )

            if status == "failed":
                failure_reason = str(last_response.get("failure_reason") or "").strip()
                return VerificationAdapterResult(
                    provider_key=self.provider_key,
                    status=VERIFICATION_STATUS_FAILED,
                    explanation=(
                        "TrueLayer reported a provider failure for this GB bank verification."
                        + (f" {failure_reason}" if failure_reason else "")
                    ),
                    confidence_score=0,
                    provider_response=last_response,
                )

        return VerificationAdapterResult(
            provider_key=self.provider_key,
            status=VERIFICATION_STATUS_MANUAL_REVIEW,
            explanation=(
                "TrueLayer accepted the GB bank verification request, but the result did not complete quickly enough to confirm automatically."
            ),
            confidence_score=35,
            provider_response=last_response,
        )

    def _request_json(
        self,
        *,
        method: str,
        url: str,
        body: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        data = None
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
        }
        if body is not None:
            data = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
            headers["Idempotency-Key"] = str(uuid.uuid4())

        req = urllib.request.Request(
            url=url,
            data=data,
            headers=headers,
            method=method.upper(),
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            payload = resp.read().decode("utf-8")
            return json.loads(payload) if payload else {}

    def _read_error(self, exc: urllib.error.HTTPError) -> str:
        try:
            payload = exc.read().decode("utf-8")
            if not payload:
                return f"HTTP {exc.code}"
            try:
                parsed = json.loads(payload)
            except Exception:
                return payload
            if isinstance(parsed, dict):
                return str(
                    parsed.get("detail")
                    or parsed.get("title")
                    or parsed.get("message")
                    or payload
                )
            return payload
        except Exception:
            return f"HTTP {exc.code}"
