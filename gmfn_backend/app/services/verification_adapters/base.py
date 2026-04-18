from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional


VERIFICATION_STATUS_PENDING = "pending"
VERIFICATION_STATUS_MATCHED = "matched"
VERIFICATION_STATUS_PARTIAL_MATCH = "partial_match"
VERIFICATION_STATUS_FAILED = "failed"
VERIFICATION_STATUS_UNAVAILABLE = "unavailable"
VERIFICATION_STATUS_MANUAL_REVIEW = "manual_review_required"


@dataclass(slots=True)
class VerificationAdapterRequest:
    verification_type: str
    region_code: Optional[str]
    payload: Dict[str, Any]


@dataclass(slots=True)
class VerificationAdapterResult:
    provider_key: str
    status: str
    explanation: str
    confidence_score: Optional[int] = None
    normalized_identity: Dict[str, Any] = field(default_factory=dict)
    provider_response: Dict[str, Any] = field(default_factory=dict)


class VerificationAdapter:
    provider_key = "unconfigured"

    def verify(self, request: VerificationAdapterRequest) -> VerificationAdapterResult:
        raise NotImplementedError
