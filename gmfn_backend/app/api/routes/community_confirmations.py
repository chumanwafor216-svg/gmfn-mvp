from __future__ import annotations

from typing import Annotated, Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import or_
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user, oauth2_scheme
from app.core.security import decode_token
from app.core.rate_limit import client_ip, rate_limiter
from app.db.database import get_db
from app.db.models import User
from app.services.community_confirmation_service import (
    VALID_CONFIRMATION_CALLBACK_CHANNELS,
    VALID_CONFIRMATION_CONTACT_ROLE_TYPES,
    VALID_CONFIRMATION_CONTACT_STANDING_STATUSES,
    VALID_CONFIRMATION_DECISIONS,
    VALID_CONFIRMATION_DECISION_STATUSES,
    VALID_CONFIRMATION_EVIDENCE_TYPES,
    VALID_CONFIRMATION_REQUEST_MODES,
    VALID_CONFIRMATION_REQUEST_STATUSES,
    VALID_CONFIRMATION_REVIEW_RESOLUTIONS,
    VALID_CONFIRMATION_REVIEW_STATUSES,
    VALID_CONFIRMATION_TRUST_IMPACTS,
    VALID_RESPONSES,
    add_confirmation_review_evidence,
    assign_confirmation_review_case,
    build_community_confirmation_summary,
    create_confirmation_request,
    get_admin_confirmation_policy,
    get_confirmation_decision_for_actor,
    get_confirmation_review_case,
    list_confirmation_review_evidence,
    list_confirmation_review_cases,
    list_my_confirmation_contact_settings,
    list_confirmation_inbox,
    public_community_member_verification,
    public_community_verification,
    public_confirmation_outcome,
    record_confirmation_decision,
    request_public_community_verification_confirmation as create_public_community_verification_confirmation_request,
    scan_confirmation_review_sla_events,
    submit_confirmation_response,
    update_confirmation_decision_status,
    update_confirmation_review_case,
    update_confirmation_request_status,
    update_admin_confirmation_contact,
    update_admin_confirmation_policy,
    update_my_confirmation_contact_setting,
)


router = APIRouter(tags=["community-confirmations"])

VALID_REVIEW_CASE_INBOX_STATUSES = VALID_CONFIRMATION_REVIEW_STATUSES | {"all"}
VALID_REVIEW_CASE_INBOX_SCOPES = {"all_visible", "assigned_to_me", "unassigned"}
VALID_REVIEW_CASE_INBOX_SORTS = {"recent", "urgency"}
PositivePathId = Annotated[int, Path(ge=1)]


def _optional_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = decode_token(token)
    except Exception:
        return None
    subject = str((payload.get("sub") if isinstance(payload, dict) else "") or "").strip()
    if not subject:
        return None
    return (
        db.query(User)
        .filter(or_(User.email == subject, User.gmfn_id == subject))
        .first()
    )


def _throttle_public(request: Request, route_name: str, *, max_requests: int) -> None:
    key = f"{route_name}:{client_ip(request.headers)}"
    result = rate_limiter.check(
        key=key,
        max_requests=max_requests,
        window_seconds=60,
    )
    if not result.ok:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Try again in {result.reset_in_seconds} seconds.",
            headers={"Retry-After": str(result.reset_in_seconds)},
        )


def _reject_non_bool_control(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, bool):
        raise ValueError(f"{field_name} must be boolean.")
    return value


def _reject_blank_string_control(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if isinstance(value, str) and not value.strip():
        raise ValueError(f"{field_name} must not be blank.")
    return value


def _reject_unsupported_string_control(
    value: Any,
    field_name: str,
    allowed_values: set[str],
) -> Any:
    if value is None:
        return value
    clean_value = str(value).strip()
    if clean_value and clean_value not in allowed_values:
        raise ValueError(f"Unsupported community confirmation {field_name}.")
    return value


def _reject_unsupported_lower_string_control(
    value: Any,
    field_name: str,
    allowed_values: set[str],
) -> Any:
    if value is None:
        return value
    clean_value = str(value).strip().lower()
    if clean_value and clean_value not in allowed_values:
        raise ValueError(f"Unsupported community confirmation {field_name}.")
    return value


def _reject_unsupported_callback_channel(value: Any) -> Any:
    if value is None:
        return value
    clean_value = str(value).strip().lower().replace("-", "_")
    if clean_value and clean_value not in VALID_CONFIRMATION_CALLBACK_CHANNELS:
        raise ValueError("Unsupported community confirmation requester_callback_channel.")
    return value


def _reject_invalid_callback_contact(value: Any) -> Any:
    if value is None:
        return value
    raw_value = str(value).strip()
    if not raw_value:
        return value
    kept = []
    for index, char in enumerate(raw_value):
        if char.isdigit():
            kept.append(char)
        elif char == "+" and index == 0:
            kept.append(char)
        elif char in {" ", "-", "(", ")"}:
            continue
        else:
            raise ValueError("requester_callback_contact must be a valid phone contact.")
    digits = "".join(ch for ch in kept if ch.isdigit())
    if len(digits) < 7 or len(digits) > 15:
        raise ValueError("requester_callback_contact must be a valid phone contact.")
    return value


def _requests_callback_delivery(value: Any) -> bool:
    clean_value = str(value or "").strip().lower().replace("-", "_")
    return clean_value in {"sms", "text", "whatsapp", "whats_app", "wa"}


def _clean_query_control(
    value: Optional[str],
    *,
    field_name: str,
    allowed_values: set[str],
    default: str,
) -> str:
    if value is None:
        return default
    clean_value = str(value).strip().lower()
    if not clean_value:
        raise HTTPException(status_code=422, detail=f"{field_name} must not be blank.")
    if clean_value not in allowed_values:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported community confirmation review case {field_name}.",
        )
    return clean_value


class CommunityConfirmationPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CommunityConfirmationRequestIn(CommunityConfirmationPayload):
    trust_slip_code: Optional[str] = Field(default=None, max_length=64)
    subject_user_id: Optional[int] = Field(default=None, ge=1)
    community_id: Optional[int] = Field(default=None, ge=1)
    requester_external_label: Optional[str] = Field(default=None, max_length=120)
    requester_callback_channel: Optional[str] = Field(default=None, max_length=24)
    requester_callback_contact: Optional[str] = Field(default=None, max_length=64)
    requester_callback_consent: bool = False
    reason_type: str = Field(default="merchant_trust_check", max_length=48)
    risk_level: str = Field(default="low", max_length=24)
    mode: str = Field(default="relay", max_length=24)

    @field_validator("subject_user_id", "community_id", mode="before")
    @classmethod
    def _reject_bool_request_id(cls, value: Any) -> Any:
        if isinstance(value, bool):
            raise ValueError("Community confirmation request ids must not be boolean.")
        if isinstance(value, float):
            raise ValueError("Community confirmation request ids must not be float.")
        return value

    @field_validator("trust_slip_code", mode="before")
    @classmethod
    def _reject_blank_trust_slip_code(cls, value: Any) -> Any:
        return _reject_blank_string_control(value, "trust_slip_code")

    @field_validator("requester_callback_consent", mode="before")
    @classmethod
    def _reject_non_bool_requester_callback_consent(cls, value: Any) -> Any:
        return _reject_non_bool_control(value, "requester_callback_consent")

    @field_validator("requester_callback_channel", mode="before")
    @classmethod
    def _reject_unknown_requester_callback_channel(cls, value: Any) -> Any:
        return _reject_unsupported_callback_channel(value)

    @field_validator("requester_callback_contact", mode="before")
    @classmethod
    def _reject_bad_requester_callback_contact(cls, value: Any) -> Any:
        return _reject_invalid_callback_contact(value)

    @field_validator("reason_type", "risk_level", "mode", mode="before")
    @classmethod
    def _reject_blank_request_controls(cls, value: Any, info: Any) -> Any:
        return _reject_blank_string_control(value, info.field_name)

    @field_validator("mode")
    @classmethod
    def _reject_unsupported_request_mode(cls, value: Any) -> Any:
        return _reject_unsupported_string_control(
            value,
            "request mode",
            VALID_CONFIRMATION_REQUEST_MODES,
        )

    @model_validator(mode="after")
    def _reject_ambiguous_request_target(self) -> "CommunityConfirmationRequestIn":
        has_trust_slip = bool(str(self.trust_slip_code or "").strip())
        has_subject = self.subject_user_id is not None
        has_community = self.community_id is not None
        if has_trust_slip and (has_subject or has_community):
            raise ValueError(
                "Use trust_slip_code or subject_user_id/community_id, not both."
            )
        if not has_trust_slip and has_subject != has_community:
            raise ValueError("subject_user_id and community_id must be supplied together.")
        if not has_trust_slip and not has_subject and not has_community:
            raise ValueError(
                "Provide trust_slip_code or both subject_user_id and community_id."
            )
        return self

    @model_validator(mode="after")
    def _reject_incomplete_callback_request(self) -> "CommunityConfirmationRequestIn":
        has_callback_channel = _requests_callback_delivery(self.requester_callback_channel)
        has_callback_contact = bool(str(self.requester_callback_contact or "").strip())
        if (
            (has_callback_channel or has_callback_contact)
            and self.requester_callback_consent is not True
        ):
            raise ValueError(
                "requester_callback_consent must be true when callback channel or contact is supplied."
            )
        if self.requester_callback_consent is True and (
            has_callback_channel != has_callback_contact
        ):
            raise ValueError(
                "requester_callback_channel and requester_callback_contact must be supplied together when callback consent is true."
            )
        return self


class PublicCommunityVerificationRequestIn(CommunityConfirmationPayload):
    requester_external_label: Optional[str] = Field(default=None, max_length=120)


class CommunityConfirmationResponseIn(CommunityConfirmationPayload):
    response_type: str = Field(..., max_length=48)
    response_reason: Optional[str] = Field(default=None, max_length=80)
    response_note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("response_type", mode="before")
    @classmethod
    def _reject_blank_response_type(cls, value: Any) -> Any:
        return _reject_blank_string_control(value, "response_type")

    @field_validator("response_type")
    @classmethod
    def _reject_unsupported_response_type(cls, value: Any) -> Any:
        return _reject_unsupported_string_control(value, "response_type", VALID_RESPONSES)


class CommunityConfirmationDecisionIn(CommunityConfirmationPayload):
    decision: str = Field(..., max_length=32)
    amount_band: Optional[str] = Field(default=None, max_length=32)
    issue_reported: Optional[bool] = None
    settled: Optional[bool] = None
    decision_note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("issue_reported", "settled", mode="before")
    @classmethod
    def _reject_non_bool_decision_flags(cls, value: Any, info: Any) -> Any:
        return _reject_non_bool_control(value, info.field_name)

    @field_validator("decision", mode="before")
    @classmethod
    def _reject_blank_decision(cls, value: Any) -> Any:
        return _reject_blank_string_control(value, "decision")

    @field_validator("decision")
    @classmethod
    def _reject_unsupported_decision(cls, value: Any) -> Any:
        return _reject_unsupported_string_control(
            value,
            "decision",
            VALID_CONFIRMATION_DECISIONS,
        )


class CommunityConfirmationDecisionStatusIn(CommunityConfirmationPayload):
    status: str = Field(..., max_length=24)
    issue_reported: Optional[bool] = None
    settled: Optional[bool] = None
    decision_note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("issue_reported", "settled", mode="before")
    @classmethod
    def _reject_non_bool_decision_status_flags(cls, value: Any, info: Any) -> Any:
        return _reject_non_bool_control(value, info.field_name)

    @field_validator("status", mode="before")
    @classmethod
    def _reject_blank_decision_status(cls, value: Any) -> Any:
        return _reject_blank_string_control(value, "status")

    @field_validator("status")
    @classmethod
    def _reject_unsupported_decision_status(cls, value: Any) -> Any:
        return _reject_unsupported_string_control(
            value,
            "decision status",
            VALID_CONFIRMATION_DECISION_STATUSES,
        )

    @model_validator(mode="after")
    def _reject_conflicting_decision_status_flags(
        self,
    ) -> "CommunityConfirmationDecisionStatusIn":
        clean_status = str(self.status or "").strip()
        if clean_status == "settled" and self.settled is not True:
            raise ValueError("status=settled requires settled=true.")
        if clean_status == "issue_reported" and self.issue_reported is not True:
            raise ValueError("status=issue_reported requires issue_reported=true.")
        if clean_status == "cancelled" and self.settled is True:
            raise ValueError("status=cancelled cannot be combined with settled=true.")
        return self


class CommunityConfirmationRequestStatusIn(CommunityConfirmationPayload):
    status: str = Field(..., max_length=24)
    status_reason: Optional[str] = Field(default=None, max_length=80)
    status_note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("status", mode="before")
    @classmethod
    def _reject_blank_request_status(cls, value: Any) -> Any:
        return _reject_blank_string_control(value, "status")

    @field_validator("status")
    @classmethod
    def _reject_unsupported_request_status(cls, value: Any) -> Any:
        return _reject_unsupported_string_control(
            value,
            "request status",
            VALID_CONFIRMATION_REQUEST_STATUSES,
        )


class CommunityConfirmationReviewStatusIn(CommunityConfirmationPayload):
    status: str = Field(..., max_length=24)
    resolution: Optional[str] = Field(default=None, max_length=48)
    trust_impact: Optional[str] = Field(default=None, max_length=24)
    resolution_note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("status", mode="before")
    @classmethod
    def _reject_blank_review_status(cls, value: Any) -> Any:
        return _reject_blank_string_control(value, "status")

    @field_validator("resolution", "trust_impact", mode="before")
    @classmethod
    def _reject_blank_review_outcome_controls(cls, value: Any, info: Any) -> Any:
        return _reject_blank_string_control(value, info.field_name)

    @field_validator("status")
    @classmethod
    def _reject_unsupported_review_status(cls, value: Any) -> Any:
        return _reject_unsupported_string_control(
            value,
            "review status",
            VALID_CONFIRMATION_REVIEW_STATUSES,
        )

    @field_validator("resolution")
    @classmethod
    def _reject_unsupported_review_resolution(cls, value: Any) -> Any:
        return _reject_unsupported_string_control(
            value,
            "review resolution",
            VALID_CONFIRMATION_REVIEW_RESOLUTIONS,
        )

    @field_validator("trust_impact")
    @classmethod
    def _reject_unsupported_review_trust_impact(cls, value: Any) -> Any:
        return _reject_unsupported_string_control(
            value,
            "review trust impact",
            VALID_CONFIRMATION_TRUST_IMPACTS,
        )

    @model_validator(mode="after")
    def _reject_incomplete_resolved_review(
        self,
    ) -> "CommunityConfirmationReviewStatusIn":
        clean_status = str(self.status or "").strip()
        if clean_status == "resolved":
            if not str(self.resolution or "").strip():
                raise ValueError("status=resolved requires resolution.")
            if not str(self.trust_impact or "").strip():
                raise ValueError("status=resolved requires trust_impact.")
        if clean_status == "dismissed":
            if str(self.resolution or "").strip() != "dismissed":
                raise ValueError("status=dismissed requires resolution=dismissed.")
            clean_impact = str(self.trust_impact or "none").strip()
            if clean_impact != "none":
                raise ValueError("status=dismissed cannot carry trust impact.")
        if clean_status in {"open", "in_review"} and (
            self.resolution is not None or self.trust_impact is not None
        ):
            raise ValueError(
                "resolution and trust_impact are only allowed when resolving or dismissing a review."
            )
        return self


class CommunityConfirmationReviewAssignmentIn(CommunityConfirmationPayload):
    assigned_to_user_id: Optional[int] = Field(default=None, ge=1)
    assignment_note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("assigned_to_user_id", mode="before")
    @classmethod
    def _reject_bool_assignment_id(cls, value: Any) -> Any:
        if isinstance(value, bool):
            raise ValueError("Community confirmation review assignment id must not be boolean.")
        if isinstance(value, float):
            raise ValueError("Community confirmation review assignment id must not be float.")
        return value


class CommunityConfirmationReviewEvidenceIn(CommunityConfirmationPayload):
    evidence_type: str = Field(default="note", max_length=32)
    title: str = Field(..., min_length=1, max_length=160)
    body: Optional[str] = Field(default=None, max_length=2000)
    external_ref: Optional[str] = Field(default=None, max_length=240)

    @field_validator("evidence_type", "title", mode="before")
    @classmethod
    def _reject_blank_evidence_controls(cls, value: Any, info: Any) -> Any:
        return _reject_blank_string_control(value, info.field_name)

    @field_validator("evidence_type")
    @classmethod
    def _reject_unsupported_evidence_type(cls, value: Any) -> Any:
        return _reject_unsupported_string_control(
            value,
            "review evidence type",
            VALID_CONFIRMATION_EVIDENCE_TYPES,
        )


class CommunityConfirmationContactSettingIn(CommunityConfirmationPayload):
    can_receive_relay_requests: Optional[bool] = None
    can_receive_instant_pulse: Optional[bool] = None
    opted_out: Optional[bool] = None

    @field_validator(
        "can_receive_relay_requests",
        "can_receive_instant_pulse",
        "opted_out",
        mode="before",
    )
    @classmethod
    def _reject_non_bool_contact_settings(cls, value: Any, info: Any) -> Any:
        return _reject_non_bool_control(value, info.field_name)

    @model_validator(mode="after")
    def _reject_conflicting_member_contact_controls(
        self,
    ) -> "CommunityConfirmationContactSettingIn":
        if self.opted_out is True and (
            self.can_receive_relay_requests is True
            or self.can_receive_instant_pulse is True
        ):
            raise ValueError(
                "opted_out cannot be combined with receiving relay or instant pulse requests."
            )
        if self.opted_out is False and self.can_receive_relay_requests is False:
            raise ValueError("opted_out=false requires receiving relay requests.")
        if (
            self.can_receive_instant_pulse is True
            and self.can_receive_relay_requests is False
        ):
            raise ValueError(
                "can_receive_instant_pulse requires receiving relay requests."
            )
        return self


class CommunityConfirmationPolicyAdminIn(CommunityConfirmationPayload):
    relay_enabled: Optional[bool] = None
    instant_pulse_enabled: Optional[bool] = None
    minimum_positive_responses: Optional[int] = Field(default=None, ge=1, le=10)
    maximum_relay_contacts: Optional[int] = Field(default=None, ge=1, le=50)
    response_window_seconds: Optional[int] = Field(default=None, ge=60, le=604800)
    review_attention_after_hours: Optional[int] = Field(default=None, ge=1, le=168)
    review_overdue_after_hours: Optional[int] = Field(default=None, ge=2, le=720)
    allow_admin_contacts: Optional[bool] = None
    allow_sponsor_contacts: Optional[bool] = None
    allow_voting_member_contacts: Optional[bool] = None
    allow_subject_nominated_contacts: Optional[bool] = None
    public_confirmation_enabled: Optional[bool] = None

    @field_validator(
        "relay_enabled",
        "instant_pulse_enabled",
        "allow_admin_contacts",
        "allow_sponsor_contacts",
        "allow_voting_member_contacts",
        "allow_subject_nominated_contacts",
        "public_confirmation_enabled",
        mode="before",
    )
    @classmethod
    def _reject_non_bool_policy_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_bool_control(value, info.field_name)

    @field_validator(
        "minimum_positive_responses",
        "maximum_relay_contacts",
        "response_window_seconds",
        "review_attention_after_hours",
        "review_overdue_after_hours",
        mode="before",
    )
    @classmethod
    def _reject_bool_numeric_policy_control(cls, value: Any) -> Any:
        if isinstance(value, bool):
            raise ValueError("Numeric confirmation policy controls must not be boolean.")
        if isinstance(value, float):
            raise ValueError("Numeric confirmation policy controls must not be float.")
        return value

    @model_validator(mode="after")
    def _reject_conflicting_review_windows(self) -> "CommunityConfirmationPolicyAdminIn":
        if (
            self.review_attention_after_hours is not None
            and self.review_overdue_after_hours is not None
            and self.review_overdue_after_hours <= self.review_attention_after_hours
        ):
            raise ValueError(
                "review_overdue_after_hours must be greater than review_attention_after_hours."
            )
        return self


class CommunityConfirmationContactAdminIn(CommunityConfirmationPayload):
    active: Optional[bool] = None
    can_receive_relay_requests: Optional[bool] = None
    can_receive_instant_pulse: Optional[bool] = None
    role_type: Optional[str] = Field(default=None, max_length=32)
    standing_status: Optional[str] = Field(default=None, max_length=24)
    priority_order: Optional[int] = Field(default=None, ge=0, le=100)

    @field_validator(
        "active",
        "can_receive_relay_requests",
        "can_receive_instant_pulse",
        mode="before",
    )
    @classmethod
    def _reject_non_bool_contact_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_bool_control(value, info.field_name)

    @field_validator("role_type", "standing_status", mode="before")
    @classmethod
    def _reject_blank_contact_classification(cls, value: Any, info: Any) -> Any:
        return _reject_blank_string_control(value, info.field_name)

    @field_validator("role_type")
    @classmethod
    def _reject_unsupported_contact_role_type(cls, value: Any) -> Any:
        return _reject_unsupported_lower_string_control(
            value,
            "contact role type",
            VALID_CONFIRMATION_CONTACT_ROLE_TYPES,
        )

    @field_validator("standing_status")
    @classmethod
    def _reject_unsupported_contact_standing_status(cls, value: Any) -> Any:
        return _reject_unsupported_lower_string_control(
            value,
            "contact standing status",
            VALID_CONFIRMATION_CONTACT_STANDING_STATUSES,
        )

    @field_validator("priority_order", mode="before")
    @classmethod
    def _reject_bool_priority_order(cls, value: Any) -> Any:
        if isinstance(value, bool):
            raise ValueError("Confirmation contact priority_order must not be boolean.")
        if isinstance(value, float):
            raise ValueError("Confirmation contact priority_order must not be float.")
        return value

    @model_validator(mode="after")
    def _reject_conflicting_instant_pulse_contact_controls(
        self,
    ) -> "CommunityConfirmationContactAdminIn":
        if self.can_receive_instant_pulse is True and (
            self.active is False or self.can_receive_relay_requests is False
        ):
            raise ValueError(
                "can_receive_instant_pulse requires an active contact that can receive relay requests."
            )
        return self


def _service_error(exc: Exception) -> HTTPException:
    if isinstance(exc, PermissionError):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, OperationalError):
        message = str(exc).lower()
        missing_public_verification_schema = (
            "no such table" in message
            and (
                "community_confirmation_" in message
                or "community_domain_affiliations" in message
                or "community_member_verifications" in message
                or "community_member_verification_requests" in message
            )
        )
        if missing_public_verification_schema:
            return HTTPException(
                status_code=503,
                detail=(
                    "Community verification is temporarily unavailable on this server. "
                    "GSN needs to refresh the server database setup before this public check can run."
                ),
            )
    message = str(exc) or "Community confirmation request failed"
    status_code = 404 if "not found" in message.lower() else 400
    return HTTPException(status_code=status_code, detail=message)


@router.post("/community-confirmations/request")
def request_community_confirmation(
    payload: CommunityConfirmationRequestIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(_optional_current_user),
) -> Dict[str, Any]:
    """
    Public-safe entry point.

    It creates a relay/pulse request, but never returns private member contacts.
    """
    _throttle_public(request, "community_confirmation_request", max_requests=20)
    try:
        return create_confirmation_request(
            db,
            trust_slip_code=payload.trust_slip_code,
            subject_user_id=payload.subject_user_id,
            community_id=payload.community_id,
            requester_user_id=(
                int(getattr(current_user, "id"))
                if current_user is not None and getattr(current_user, "id", None)
                else None
            ),
            requester_external_label=payload.requester_external_label,
            requester_callback_channel=payload.requester_callback_channel,
            requester_callback_contact=payload.requester_callback_contact,
            requester_callback_consent=payload.requester_callback_consent,
            reason_type=payload.reason_type,
            risk_level=payload.risk_level,
            mode=payload.mode,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.get("/community-confirmations/public/{public_token}")
def get_public_community_confirmation(
    public_token: str,
    request: Request,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _throttle_public(request, "community_confirmation_public", max_requests=80)
    try:
        return public_confirmation_outcome(db, public_token=public_token)
    except Exception as exc:
        raise _service_error(exc) from exc


@router.get("/community-confirmations/inbox")
def get_community_confirmation_inbox(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    return list_confirmation_inbox(
        db,
        responder_user_id=int(getattr(current_user, "id")),
    )


@router.get("/community-confirmations/my-contact-settings")
def get_my_community_confirmation_contact_settings(
    community_id: Optional[int] = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    return list_my_confirmation_contact_settings(
        db,
        user_id=int(getattr(current_user, "id")),
        community_id=community_id,
    )


@router.patch("/community-confirmations/my-contact-settings/{community_id}")
def update_my_community_confirmation_contact_setting(
    community_id: PositivePathId,
    payload: CommunityConfirmationContactSettingIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return update_my_confirmation_contact_setting(
            db,
            user_id=int(getattr(current_user, "id")),
            community_id=int(community_id),
            can_receive_relay_requests=payload.can_receive_relay_requests,
            can_receive_instant_pulse=payload.can_receive_instant_pulse,
            opted_out=payload.opted_out,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.get("/community-confirmations/community/{community_id}/policy")
def get_community_confirmation_policy(
    community_id: PositivePathId,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return get_admin_confirmation_policy(
            db,
            community_id=int(community_id),
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.patch("/community-confirmations/community/{community_id}/policy")
def update_community_confirmation_policy(
    community_id: PositivePathId,
    payload: CommunityConfirmationPolicyAdminIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return update_admin_confirmation_policy(
            db,
            community_id=int(community_id),
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
            relay_enabled=payload.relay_enabled,
            instant_pulse_enabled=payload.instant_pulse_enabled,
            minimum_positive_responses=payload.minimum_positive_responses,
            maximum_relay_contacts=payload.maximum_relay_contacts,
            response_window_seconds=payload.response_window_seconds,
            review_attention_after_hours=payload.review_attention_after_hours,
            review_overdue_after_hours=payload.review_overdue_after_hours,
            allow_admin_contacts=payload.allow_admin_contacts,
            allow_sponsor_contacts=payload.allow_sponsor_contacts,
            allow_voting_member_contacts=payload.allow_voting_member_contacts,
            allow_subject_nominated_contacts=payload.allow_subject_nominated_contacts,
            public_confirmation_enabled=payload.public_confirmation_enabled,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.patch("/community-confirmations/community/{community_id}/contacts/{target_user_id}")
def update_community_confirmation_contact(
    community_id: PositivePathId,
    target_user_id: PositivePathId,
    payload: CommunityConfirmationContactAdminIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return update_admin_confirmation_contact(
            db,
            community_id=int(community_id),
            target_user_id=int(target_user_id),
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
            active=payload.active,
            can_receive_relay_requests=payload.can_receive_relay_requests,
            can_receive_instant_pulse=payload.can_receive_instant_pulse,
            role_type=payload.role_type,
            standing_status=payload.standing_status,
            priority_order=payload.priority_order,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.post("/community-confirmations/{request_id}/respond")
def respond_to_community_confirmation(
    request_id: PositivePathId,
    payload: CommunityConfirmationResponseIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return submit_confirmation_response(
            db,
            request_id=int(request_id),
            responder_user_id=int(getattr(current_user, "id")),
            response_type=payload.response_type,
            response_reason=payload.response_reason,
            response_note=payload.response_note,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.post("/community-confirmations/{request_id}/decision")
def record_community_confirmation_decision(
    request_id: PositivePathId,
    payload: CommunityConfirmationDecisionIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return record_confirmation_decision(
            db,
            request_id=int(request_id),
            actor_user_id=int(getattr(current_user, "id")),
            decision=payload.decision,
            amount_band=payload.amount_band,
            issue_reported=payload.issue_reported,
            settled=payload.settled,
            decision_note=payload.decision_note,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.get("/community-confirmations/{request_id}/decision")
def get_my_community_confirmation_decision(
    request_id: PositivePathId,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return get_confirmation_decision_for_actor(
            db,
            request_id=int(request_id),
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.patch("/community-confirmations/decisions/{decision_id}")
def update_community_confirmation_decision_status(
    decision_id: PositivePathId,
    payload: CommunityConfirmationDecisionStatusIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return update_confirmation_decision_status(
            db,
            decision_id=int(decision_id),
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
            status=payload.status,
            issue_reported=payload.issue_reported,
            settled=payload.settled,
            decision_note=payload.decision_note,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.patch("/community-confirmations/{request_id}/status")
def update_community_confirmation_request_status(
    request_id: PositivePathId,
    payload: CommunityConfirmationRequestStatusIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return update_confirmation_request_status(
            db,
            request_id=int(request_id),
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
            status=payload.status,
            status_reason=payload.status_reason,
            status_note=payload.status_note,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.get("/community-confirmations/{request_id}/review-case")
def get_community_confirmation_review_case(
    request_id: PositivePathId,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return get_confirmation_review_case(
            db,
            request_id=int(request_id),
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.get("/community-confirmations/review-cases/inbox")
def get_community_confirmation_review_case_inbox(
    status: Optional[str] = "open",
    scope: Optional[str] = "all_visible",
    sort: Optional[str] = "recent",
    community_id: Optional[int] = Query(default=None, ge=1),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    clean_status = _clean_query_control(
        status,
        field_name="status",
        allowed_values=VALID_REVIEW_CASE_INBOX_STATUSES,
        default="open",
    )
    clean_scope = _clean_query_control(
        scope,
        field_name="scope",
        allowed_values=VALID_REVIEW_CASE_INBOX_SCOPES,
        default="all_visible",
    )
    clean_sort = _clean_query_control(
        sort,
        field_name="sort",
        allowed_values=VALID_REVIEW_CASE_INBOX_SORTS,
        default="recent",
    )
    try:
        return list_confirmation_review_cases(
            db,
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
            status=clean_status,
            scope=clean_scope,
            sort=clean_sort,
            community_id=community_id,
            limit=limit,
            offset=offset,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.post("/community-confirmations/review-cases/scan-sla-events")
def scan_community_confirmation_review_sla_events(
    community_id: Optional[int] = Query(default=None, ge=1),
    limit: int = Query(default=200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return scan_confirmation_review_sla_events(
            db,
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
            community_id=community_id,
            limit=limit,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.patch("/community-confirmations/review-cases/{review_case_id}/assignment")
def assign_community_confirmation_review_case(
    review_case_id: PositivePathId,
    payload: CommunityConfirmationReviewAssignmentIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return assign_confirmation_review_case(
            db,
            review_case_id=int(review_case_id),
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
            assigned_to_user_id=payload.assigned_to_user_id,
            assignment_note=payload.assignment_note,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.get("/community-confirmations/review-cases/{review_case_id}/evidence")
def get_community_confirmation_review_evidence(
    review_case_id: PositivePathId,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return list_confirmation_review_evidence(
            db,
            review_case_id=int(review_case_id),
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.post("/community-confirmations/review-cases/{review_case_id}/evidence")
def add_community_confirmation_review_evidence(
    review_case_id: PositivePathId,
    payload: CommunityConfirmationReviewEvidenceIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return add_confirmation_review_evidence(
            db,
            review_case_id=int(review_case_id),
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
            evidence_type=payload.evidence_type,
            title=payload.title,
            body=payload.body,
            external_ref=payload.external_ref,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.patch("/community-confirmations/review-cases/{review_case_id}")
def update_community_confirmation_review_case(
    review_case_id: PositivePathId,
    payload: CommunityConfirmationReviewStatusIn,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return update_confirmation_review_case(
            db,
            review_case_id=int(review_case_id),
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
            status=payload.status,
            resolution=payload.resolution,
            trust_impact=payload.trust_impact,
            resolution_note=payload.resolution_note,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.get("/community-confirmations/community/{community_id}/summary")
def community_confirmation_summary(
    community_id: PositivePathId,
    request: Request,
    subject_user_id: Optional[int] = Query(default=None, ge=1),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _throttle_public(request, "community_confirmation_summary", max_requests=80)
    return build_community_confirmation_summary(
        db,
        community_id=int(community_id),
        subject_user_id=subject_user_id,
    )


@router.get("/verify/community/{community_key}")
def verify_public_community(
    community_key: str,
    request: Request,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _throttle_public(request, "community_verify_public", max_requests=80)
    try:
        return public_community_verification(db, community_key=community_key)
    except Exception as exc:
        raise _service_error(exc) from exc


@router.get("/verify/community/{community_key}/member/{member_key}")
def verify_public_community_member(
    community_key: str,
    member_key: str,
    request: Request,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _throttle_public(request, "community_member_verify_public", max_requests=80)
    try:
        return public_community_member_verification(
            db,
            community_key=community_key,
            member_key=member_key,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.post("/verify/community/{community_key}/confirmation-request")
def request_public_community_verification_confirmation(
    community_key: str,
    payload: PublicCommunityVerificationRequestIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(_optional_current_user),
) -> Dict[str, Any]:
    _throttle_public(
        request,
        "community_verify_confirmation_request",
        max_requests=20,
    )
    try:
        return create_public_community_verification_confirmation_request(
            db,
            community_key=community_key,
            requester_user_id=(
                int(getattr(current_user, "id"))
                if current_user is not None and getattr(current_user, "id", None)
                else None
            ),
            requester_external_label=payload.requester_external_label,
        )
    except Exception as exc:
        raise _service_error(exc) from exc
