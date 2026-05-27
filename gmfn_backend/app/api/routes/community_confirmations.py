from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.rate_limit import client_ip, rate_limiter
from app.db.database import get_db
from app.services.community_confirmation_service import (
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
    public_community_verification,
    public_confirmation_outcome,
    record_confirmation_decision,
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


class CommunityConfirmationRequestIn(BaseModel):
    trust_slip_code: Optional[str] = Field(default=None, max_length=64)
    subject_user_id: Optional[int] = Field(default=None, ge=1)
    community_id: Optional[int] = Field(default=None, ge=1)
    requester_external_label: Optional[str] = Field(default=None, max_length=120)
    reason_type: str = Field(default="merchant_trust_check", max_length=48)
    risk_level: str = Field(default="low", max_length=24)
    mode: str = Field(default="relay", max_length=24)


class CommunityConfirmationResponseIn(BaseModel):
    response_type: str = Field(..., max_length=48)
    response_reason: Optional[str] = Field(default=None, max_length=80)
    response_note: Optional[str] = Field(default=None, max_length=500)


class CommunityConfirmationDecisionIn(BaseModel):
    decision: str = Field(..., max_length=32)
    amount_band: Optional[str] = Field(default=None, max_length=32)
    issue_reported: Optional[bool] = None
    settled: Optional[bool] = None
    decision_note: Optional[str] = Field(default=None, max_length=500)


class CommunityConfirmationDecisionStatusIn(BaseModel):
    status: str = Field(..., max_length=24)
    issue_reported: Optional[bool] = None
    settled: Optional[bool] = None
    decision_note: Optional[str] = Field(default=None, max_length=500)


class CommunityConfirmationRequestStatusIn(BaseModel):
    status: str = Field(..., max_length=24)
    status_reason: Optional[str] = Field(default=None, max_length=80)
    status_note: Optional[str] = Field(default=None, max_length=500)


class CommunityConfirmationReviewStatusIn(BaseModel):
    status: str = Field(..., max_length=24)
    resolution: Optional[str] = Field(default=None, max_length=48)
    trust_impact: Optional[str] = Field(default=None, max_length=24)
    resolution_note: Optional[str] = Field(default=None, max_length=500)


class CommunityConfirmationReviewAssignmentIn(BaseModel):
    assigned_to_user_id: Optional[int] = Field(default=None, ge=1)
    assignment_note: Optional[str] = Field(default=None, max_length=500)


class CommunityConfirmationReviewEvidenceIn(BaseModel):
    evidence_type: str = Field(default="note", max_length=32)
    title: str = Field(..., min_length=1, max_length=160)
    body: Optional[str] = Field(default=None, max_length=2000)
    external_ref: Optional[str] = Field(default=None, max_length=240)


class CommunityConfirmationContactSettingIn(BaseModel):
    can_receive_relay_requests: Optional[bool] = None
    can_receive_instant_pulse: Optional[bool] = None
    opted_out: Optional[bool] = None


class CommunityConfirmationPolicyAdminIn(BaseModel):
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


class CommunityConfirmationContactAdminIn(BaseModel):
    active: Optional[bool] = None
    can_receive_relay_requests: Optional[bool] = None
    can_receive_instant_pulse: Optional[bool] = None
    role_type: Optional[str] = Field(default=None, max_length=32)
    standing_status: Optional[str] = Field(default=None, max_length=24)
    priority_order: Optional[int] = Field(default=None, ge=0, le=100)


def _service_error(exc: Exception) -> HTTPException:
    if isinstance(exc, PermissionError):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(exc, OperationalError):
        message = str(exc).lower()
        if "no such table" in message and "community_confirmation_" in message:
            return HTTPException(
                status_code=503,
                detail=(
                    "Community confirmation is temporarily unavailable on this server. "
                    "The GSN owner needs to refresh the server database setup."
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
            requester_external_label=payload.requester_external_label,
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
    community_id: Optional[int] = None,
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
    community_id: int,
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
    community_id: int,
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
    community_id: int,
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
    community_id: int,
    target_user_id: int,
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
    request_id: int,
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
    request_id: int,
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
    request_id: int,
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
    decision_id: int,
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
    request_id: int,
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
    request_id: int,
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
    community_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
) -> Dict[str, Any]:
    try:
        return list_confirmation_review_cases(
            db,
            actor_user_id=int(getattr(current_user, "id")),
            actor_role=getattr(current_user, "role", None),
            status=status,
            scope=scope,
            sort=sort,
            community_id=community_id,
            limit=limit,
            offset=offset,
        )
    except Exception as exc:
        raise _service_error(exc) from exc


@router.post("/community-confirmations/review-cases/scan-sla-events")
def scan_community_confirmation_review_sla_events(
    community_id: Optional[int] = None,
    limit: int = 200,
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
    review_case_id: int,
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
    review_case_id: int,
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
    review_case_id: int,
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
    review_case_id: int,
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
    community_id: int,
    request: Request,
    subject_user_id: Optional[int] = None,
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
