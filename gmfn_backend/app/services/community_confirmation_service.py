from __future__ import annotations

import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from sqlalchemy import case, func, or_
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.db.models import (
    Clan,
    ClanJoinRequest,
    ClanJoinVote,
    ClanMembership,
    CommunityConfirmationContact,
    CommunityConfirmationDecision,
    CommunityConfirmationOutcome,
    CommunityConfirmationPolicy,
    CommunityConfirmationRequest,
    CommunityConfirmationResponse,
    CommunityConfirmationReviewCase,
    CommunityConfirmationReviewEvidence,
    TrustEvent,
    TrustSlip,
    User,
)
from app.db.notification_models import Notification
from app.services.community_confirmation_callback_delivery import (
    attempt_confirmation_callback_delivery,
)
from app.services.notification_service import create_notification
from app.services.trust_events_services import build_trust_meta, log_trust_event


POSITIVE_RESPONSES = {"known_here", "active_here", "good_standing"}
CAUTION_RESPONSES = {"ask_more_evidence", "known_but_caution", "cannot_confirm_now"}
OBJECTION_RESPONSES = {"concern", "inactive", "under_dispute", "not_known"}
VALID_RESPONSES = POSITIVE_RESPONSES | CAUTION_RESPONSES | OBJECTION_RESPONSES
INSTANT_WINDOW_SECONDS = 300
VALID_CONFIRMATION_DECISIONS = {
    "released",
    "partial_release",
    "reduced",
    "did_not_release",
    "deferred",
    "cancelled",
}
VALID_CONFIRMATION_DECISION_STATUSES = {
    "recorded",
    "issue_reported",
    "under_review",
    "settled",
    "cancelled",
}
VALID_CONFIRMATION_REQUEST_STATUSES = {
    "cancelled",
    "closed",
    "under_review",
}
VALID_CONFIRMATION_REVIEW_STATUSES = {
    "open",
    "in_review",
    "resolved",
    "dismissed",
}
VALID_CONFIRMATION_REVIEW_RESOLUTIONS = {
    "confirmed_clean",
    "resolved_with_caution",
    "insufficient_evidence",
    "concern_upheld",
    "dismissed",
}
VALID_CONFIRMATION_TRUST_IMPACTS = {
    "none",
    "positive",
    "caution",
    "negative",
}
VALID_CONFIRMATION_EVIDENCE_TYPES = {
    "note",
    "merchant_note",
    "member_statement",
    "community_statement",
    "system_snapshot",
    "external_reference",
}
DEFAULT_REVIEW_ATTENTION_AFTER_HOURS = 24
DEFAULT_REVIEW_OVERDUE_AFTER_HOURS = 72
COMMUNITY_VERIFY_PREFIXES = (
    "GMFN-C-",
    "GSN-C-",
    "GMFM-C-",
    "GSN-COM-",
    "GMFN-COM-",
    "GMFM-COM-",
)


def _confirmation_request_action_url(request_id: int) -> str:
    return f"/app/community-confirmations?request_id={int(request_id)}"


def _confirmation_public_outcome_action_url(request: CommunityConfirmationRequest) -> str:
    return f"/community-confirmations/public/{str(request.public_token)}"


def _response_category(response_type: str) -> str:
    if response_type in POSITIVE_RESPONSES:
        return "positive"
    if response_type in CAUTION_RESPONSES:
        return "caution"
    if response_type in OBJECTION_RESPONSES:
        return "objection"
    return "unknown"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _to_aware(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _seconds_between(start: Optional[datetime], end: Optional[datetime]) -> Optional[int]:
    start_at = _to_aware(start)
    end_at = _to_aware(end)
    if not start_at or not end_at:
        return None
    return max(0, int((end_at - start_at).total_seconds()))


def _public_token() -> str:
    return secrets.token_urlsafe(18)


def _json_loads(raw: Optional[str]) -> Dict[str, Any]:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except Exception:
        return {}


def _normalize_callback_channel(value: Optional[str]) -> str:
    raw = str(value or "").strip().lower().replace("-", "_")
    if raw in {"sms", "text"}:
        return "sms"
    if raw in {"whatsapp", "whats_app", "wa"}:
        return "whatsapp"
    return "none"


def _normalize_callback_contact(value: Optional[str]) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    kept = []
    for index, char in enumerate(raw):
        if char.isdigit():
            kept.append(char)
        elif char == "+" and index == 0:
            kept.append(char)
        elif char in {" ", "-", "(", ")"}:
            continue
        else:
            return ""
    normalized = "".join(kept)
    digits = "".join(ch for ch in normalized if ch.isdigit())
    if len(digits) < 7 or len(digits) > 15:
        return ""
    return normalized


def _mask_callback_contact(value: Optional[str]) -> str:
    raw = str(value or "").strip()
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return ""
    last4 = digits[-4:]
    return f"ending {last4}"


def _build_requester_callback(
    *,
    channel: Optional[str],
    contact: Optional[str],
    consent: bool,
) -> Dict[str, Any]:
    normalized_channel = _normalize_callback_channel(channel)
    normalized_contact = _normalize_callback_contact(contact)
    requested = (
        normalized_channel in {"sms", "whatsapp"}
        and bool(normalized_contact)
        and bool(consent)
    )
    return {
        "requested": requested,
        "channel": normalized_channel if requested else "none",
        "contact": normalized_contact if requested else None,
        "contact_masked": _mask_callback_contact(normalized_contact) if requested else None,
        "consent_recorded": bool(consent and normalized_contact),
        "delivery_status": "not_configured" if requested else "not_requested",
        "delivery_note": (
            "Return contact captured. The public result link remains the source of truth until SMS or WhatsApp delivery is configured."
            if requested
            else "No external return contact was requested."
        ),
    }


def _public_requester_callback(summary: Dict[str, Any]) -> Dict[str, Any]:
    raw = summary.get("requester_callback") or {}
    if not isinstance(raw, dict):
        raw = {}
    requested = bool(raw.get("requested"))
    return {
        "requested": requested,
        "channel": str(raw.get("channel") or "none") if requested else "none",
        "contact_masked": str(raw.get("contact_masked") or "") if requested else None,
        "consent_recorded": bool(raw.get("consent_recorded")) if requested else False,
        "delivery_status": str(raw.get("delivery_status") or "not_configured")
        if requested
        else "not_requested",
        "delivery_note": (
            str(raw.get("delivery_note") or "")
            if requested
            else "No external return contact was requested."
        ),
        "result_link_is_source_of_truth": True,
    }


def _active_member_count(db: Session, community_id: int) -> int:
    return int(
        db.query(func.count(ClanMembership.id))
        .filter(ClanMembership.clan_id == int(community_id))
        .filter(ClanMembership.left_at.is_(None))
        .scalar()
        or 0
    )


def _sponsor_signal_count(db: Session, community_id: int, subject_user_id: int) -> int:
    return int(
        db.query(func.count(ClanJoinVote.id))
        .join(ClanJoinRequest, ClanJoinRequest.id == ClanJoinVote.join_request_id)
        .filter(ClanJoinRequest.clan_id == int(community_id))
        .filter(ClanJoinRequest.applicant_user_id == int(subject_user_id))
        .filter(ClanJoinVote.vote.in_(["yes", "approve", "approved", "support"]))
        .scalar()
        or 0
    )


def _last_confirmation_at(
    db: Session,
    *,
    community_id: int,
    subject_user_id: int,
) -> Optional[str]:
    row = (
        db.query(CommunityConfirmationRequest)
        .filter(CommunityConfirmationRequest.community_id == int(community_id))
        .filter(CommunityConfirmationRequest.subject_user_id == int(subject_user_id))
        .filter(CommunityConfirmationRequest.visible_outcome.isnot(None))
        .order_by(CommunityConfirmationRequest.created_at.desc())
        .first()
    )
    created_at = _to_aware(getattr(row, "created_at", None)) if row else None
    return created_at.isoformat() if created_at else None


def _is_missing_confirmation_schema_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return (
        "no such table" in message
        and "community_confirmation_" in message
    )


def _safe_active_member_count(db: Session, community_id: int) -> int:
    try:
        return _active_member_count(db, int(community_id))
    except OperationalError as exc:
        if _is_missing_confirmation_schema_error(exc):
            db.rollback()
            return 0
        raise


def get_or_create_confirmation_policy(
    db: Session,
    *,
    community_id: int,
    commit: bool = False,
) -> CommunityConfirmationPolicy:
    policy = (
        db.query(CommunityConfirmationPolicy)
        .filter(CommunityConfirmationPolicy.community_id == int(community_id))
        .first()
    )
    if policy:
        return policy

    policy = CommunityConfirmationPolicy(
        community_id=int(community_id),
        relay_enabled=True,
        instant_pulse_enabled=True,
        minimum_positive_responses=2,
        maximum_relay_contacts=8,
        response_window_seconds=86400,
        review_attention_after_hours=DEFAULT_REVIEW_ATTENTION_AFTER_HOURS,
        review_overdue_after_hours=DEFAULT_REVIEW_OVERDUE_AFTER_HOURS,
        allow_admin_contacts=True,
        allow_sponsor_contacts=True,
        allow_voting_member_contacts=True,
        allow_subject_nominated_contacts=False,
        public_confirmation_enabled=True,
    )
    db.add(policy)
    if commit:
        db.commit()
        db.refresh(policy)
    return policy


def ensure_default_confirmation_contacts(
    db: Session,
    *,
    community_id: int,
    subject_user_id: Optional[int] = None,
    commit: bool = False,
) -> int:
    members = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == int(community_id))
        .filter(ClanMembership.left_at.is_(None))
        .all()
    )
    created = 0
    now = _now_utc()

    for membership in members:
        user_id = int(membership.user_id)
        if subject_user_id is not None and user_id == int(subject_user_id):
            continue

        existing = (
            db.query(CommunityConfirmationContact)
            .filter(CommunityConfirmationContact.community_id == int(community_id))
            .filter(CommunityConfirmationContact.user_id == user_id)
            .first()
        )
        if existing:
            continue

        role = str(getattr(membership, "role", "") or "member").lower()
        db.add(
            CommunityConfirmationContact(
                community_id=int(community_id),
                user_id=user_id,
                role_type="admin" if role == "admin" else "member",
                active=True,
                can_receive_relay_requests=True,
                can_receive_instant_pulse=True,
                priority_order=0 if role == "admin" else 10,
                standing_status="active",
                opted_in_at=now,
                last_active_at=now,
            )
        )
        created += 1

    if created:
        db.flush()
        if commit:
            db.commit()

    return created


def _eligible_contact_count(
    db: Session,
    *,
    community_id: int,
    subject_user_id: Optional[int] = None,
    instant: bool = False,
) -> int:
    query = (
        db.query(func.count(CommunityConfirmationContact.id))
        .filter(CommunityConfirmationContact.community_id == int(community_id))
        .filter(CommunityConfirmationContact.active.is_(True))
        .filter(CommunityConfirmationContact.can_receive_relay_requests.is_(True))
        .filter(CommunityConfirmationContact.opted_out_at.is_(None))
    )
    if instant:
        query = query.filter(CommunityConfirmationContact.can_receive_instant_pulse.is_(True))
    if subject_user_id is not None:
        query = query.filter(CommunityConfirmationContact.user_id != int(subject_user_id))
    return int(query.scalar() or 0)


def _eligible_confirmation_contacts(
    db: Session,
    *,
    community_id: int,
    subject_user_id: int,
    instant: bool = False,
    limit: Optional[int] = None,
) -> list[CommunityConfirmationContact]:
    query = (
        db.query(CommunityConfirmationContact)
        .filter(CommunityConfirmationContact.community_id == int(community_id))
        .filter(CommunityConfirmationContact.user_id != int(subject_user_id))
        .filter(CommunityConfirmationContact.active.is_(True))
        .filter(CommunityConfirmationContact.can_receive_relay_requests.is_(True))
        .filter(CommunityConfirmationContact.opted_out_at.is_(None))
    )
    if instant:
        query = query.filter(CommunityConfirmationContact.can_receive_instant_pulse.is_(True))
    query = query.order_by(
        CommunityConfirmationContact.priority_order.asc(),
        CommunityConfirmationContact.last_active_at.desc().nullslast(),
        CommunityConfirmationContact.id.asc(),
    )
    if limit is not None:
        query = query.limit(max(1, int(limit)))
    return list(query.all())


def _notify_confirmation_contacts(
    db: Session,
    *,
    request: CommunityConfirmationRequest,
    contacts: list[CommunityConfirmationContact],
) -> int:
    created = 0
    action_url = _confirmation_request_action_url(int(request.id))
    reason_label = str(request.reason_type or "community confirmation").replace("_", " ")
    risk_label = str(request.risk_level or "low").replace("_", " ")
    mode_label = (
        "instant community confirmation"
        if request.mode == "instant_pulse"
        else "community confirmation"
    )
    for contact in contacts:
        recipient_id = int(contact.user_id)
        if recipient_id <= 0 or recipient_id == int(request.subject_user_id):
            continue
        existing = (
            db.query(Notification.id)
            .filter(Notification.user_id == recipient_id)
            .filter(Notification.kind == "community_confirmation.request_to_respond")
            .filter(Notification.action_url == action_url)
            .first()
        )
        if existing:
            continue
        create_notification(
            db,
            user_id=recipient_id,
            kind="community_confirmation.request_to_respond",
            title="Community confirmation request",
            message=(
                f"A community member needs {mode_label} for a {risk_label} "
                f"{reason_label}. Respond only if you genuinely know them in this community."
            ),
            action_url=action_url,
            action_label="Respond",
            commit=False,
            refresh=False,
        )
        created += 1
    return created


def _notify_confirmation_requester(
    db: Session,
    *,
    request: CommunityConfirmationRequest,
    kind: str,
    title: str,
    message: str,
    action_label: str = "Open result",
) -> bool:
    requester_user_id = int(getattr(request, "requester_user_id", None) or 0)
    if requester_user_id <= 0:
        return False

    action_url = _confirmation_public_outcome_action_url(request)
    existing_unread = (
        db.query(Notification.id)
        .filter(Notification.user_id == requester_user_id)
        .filter(Notification.kind == kind)
        .filter(Notification.action_url == action_url)
        .filter(Notification.is_read.is_(False))
        .first()
    )
    if existing_unread:
        return False

    create_notification(
        db,
        user_id=requester_user_id,
        kind=kind,
        title=title,
        message=message,
        action_url=action_url,
        action_label=action_label,
        commit=False,
        refresh=False,
    )
    return True


def _mark_confirmation_request_notification_read(
    db: Session,
    *,
    request_id: int,
    responder_user_id: int,
) -> bool:
    action_url = _confirmation_request_action_url(int(request_id))
    row = (
        db.query(Notification)
        .filter(Notification.user_id == int(responder_user_id))
        .filter(Notification.kind == "community_confirmation.request_to_respond")
        .filter(Notification.action_url == action_url)
        .first()
    )
    if not row or row.is_read:
        return False
    row.is_read = True
    row.read_at = _now_utc()
    db.add(row)
    return True


def _notified_non_response_user_ids(
    db: Session,
    *,
    request: CommunityConfirmationRequest,
) -> list[int]:
    action_url = _confirmation_request_action_url(int(request.id))
    notified_ids = {
        int(user_id)
        for (user_id,) in (
            db.query(Notification.user_id)
            .filter(Notification.kind == "community_confirmation.request_to_respond")
            .filter(Notification.action_url == action_url)
            .all()
        )
        if int(user_id or 0) > 0
    }
    responded_ids = {
        int(user_id)
        for (user_id,) in (
            db.query(CommunityConfirmationResponse.responder_user_id)
            .filter(CommunityConfirmationResponse.request_id == int(request.id))
            .all()
        )
        if int(user_id or 0) > 0
    }
    notified_ids.discard(int(request.subject_user_id))
    return sorted(notified_ids - responded_ids)


def _log_confirmation_non_response_events(
    db: Session,
    *,
    request: CommunityConfirmationRequest,
    user_ids: list[int],
) -> int:
    created = 0
    expires_at = (
        _to_aware(request.expires_at).isoformat() if request.expires_at else None
    )
    for user_id in user_ids:
        log_trust_event(
            db,
            event_type="community_confirmation.non_response_recorded",
            clan_id=int(request.community_id),
            actor_user_id=int(user_id),
            subject_user_id=int(request.subject_user_id),
            meta=build_trust_meta(
                reason="community_confirmation_no_timely_response",
                trust_delta="0.00",
                system=True,
                extra={
                    "request_id": int(request.id),
                    "mode": request.mode,
                    "reason_type": request.reason_type,
                    "risk_level": request.risk_level,
                    "status": "expired",
                    "expires_at": expires_at,
                    "outwardly_anonymous": True,
                    "internally_attributable": True,
                    "private_contacts_exposed": False,
                },
            ),
            dedupe_key=f"cc-non-response:{int(request.id)}:{int(user_id)}",
            commit=False,
            refresh=False,
        )
        created += 1
    return created


def build_community_confirmation_summary(
    db: Session,
    *,
    community_id: int,
    subject_user_id: Optional[int] = None,
) -> Dict[str, Any]:
    community = db.query(Clan).filter(Clan.id == int(community_id)).first()
    if not community:
        return {
            "community_status": "not_found",
            "relay_available": False,
            "plain_language": "This community could not be found for confirmation.",
        }

    if subject_user_id is not None:
        ensure_default_confirmation_contacts(
            db,
            community_id=int(community_id),
            subject_user_id=int(subject_user_id),
        )

    community_status = str(getattr(community, "status", "") or "active")

    try:
        policy = get_or_create_confirmation_policy(db, community_id=int(community_id))
        active_members = _active_member_count(db, int(community_id))
        contactable = _eligible_contact_count(
            db,
            community_id=int(community_id),
            subject_user_id=subject_user_id,
        )
        sponsor_signals = (
            _sponsor_signal_count(db, int(community_id), int(subject_user_id))
            if subject_user_id is not None
            else 0
        )
        relay_available = bool(policy.relay_enabled and contactable > 0)
        instant_pulse_available = bool(policy.instant_pulse_enabled and contactable > 0)
        request_action = "request_community_confirmation" if relay_available else None
        plain_language = (
            "This person belongs to a real GSN community. If a higher-risk decision needs "
            "stronger assurance, GSN can ask eligible community members to respond now. "
            "The result is calculated from responses, not from an admin's personal approval, "
            "and private contact details stay protected."
            if relay_available
            else "This community is visible, but no private relay contact path is currently available."
        )
    except OperationalError as exc:
        if not _is_missing_confirmation_schema_error(exc):
            raise
        db.rollback()
        active_members = _safe_active_member_count(db, int(community_id))
        contactable = 0
        sponsor_signals = 0
        relay_available = False
        instant_pulse_available = False
        request_action = None
        plain_language = (
            "This community is visible in GSN, but live member confirmation is temporarily "
            "unavailable on this server. The community record can still be checked, and "
            "private member details remain protected."
        )

    return {
        "community_status": community_status,
        "community_name": getattr(community, "name", None),
        "community_id": int(community_id),
        "community_code": getattr(community, "community_code", None),
        "approval_type": "Response-based community confirmation",
        "active_member_count": active_members,
        "contactable_reference_count": contactable,
        "sponsor_signal_count": sponsor_signals,
        "last_community_confirmation": (
            _last_confirmation_at(
                db,
                community_id=int(community_id),
                subject_user_id=int(subject_user_id),
            )
            if subject_user_id is not None
            else None
        ),
        "relay_available": relay_available,
        "instant_pulse_available": instant_pulse_available,
        "request_action": request_action,
        "plain_language": plain_language,
    }


def create_confirmation_request(
    db: Session,
    *,
    trust_slip_code: Optional[str] = None,
    subject_user_id: Optional[int] = None,
    community_id: Optional[int] = None,
    requester_user_id: Optional[int] = None,
    requester_external_label: Optional[str] = None,
    requester_callback_channel: Optional[str] = None,
    requester_callback_contact: Optional[str] = None,
    requester_callback_consent: bool = False,
    reason_type: str = "merchant_trust_check",
    risk_level: str = "low",
    mode: str = "relay",
) -> Dict[str, Any]:
    slip = None
    if trust_slip_code:
        slip = db.query(TrustSlip).filter(TrustSlip.code == trust_slip_code.strip()).first()
        if not slip:
            raise ValueError("TrustSlip not found")
        subject_user_id = int(slip.holder_user_id)
        community_id = int(slip.clan_id)

    if not subject_user_id or not community_id:
        raise ValueError("subject_user_id and community_id are required")

    membership = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == int(community_id))
        .filter(ClanMembership.user_id == int(subject_user_id))
        .filter(ClanMembership.left_at.is_(None))
        .first()
    )
    if not membership:
        raise ValueError("Subject is not an active member of this community")

    normalized_mode = "instant_pulse" if mode == "instant_pulse" else "relay"
    policy = get_or_create_confirmation_policy(db, community_id=int(community_id))
    if normalized_mode == "instant_pulse" and not policy.instant_pulse_enabled:
        raise ValueError("Instant pulse is not enabled for this community")
    if normalized_mode == "relay" and not policy.relay_enabled:
        raise ValueError("Community confirmation relay is not enabled for this community")

    ensure_default_confirmation_contacts(
        db,
        community_id=int(community_id),
        subject_user_id=int(subject_user_id),
    )
    eligible_contacts = _eligible_contact_count(
        db,
        community_id=int(community_id),
        subject_user_id=int(subject_user_id),
        instant=normalized_mode == "instant_pulse",
    )
    active_members = _active_member_count(db, int(community_id))
    if eligible_contacts <= 0:
        raise ValueError("No eligible community confirmation contacts are available")
    delivery_contacts = _eligible_confirmation_contacts(
        db,
        community_id=int(community_id),
        subject_user_id=int(subject_user_id),
        instant=normalized_mode == "instant_pulse",
        limit=policy.maximum_relay_contacts or None,
    )

    now = _now_utc()
    window_seconds = (
        INSTANT_WINDOW_SECONDS
        if normalized_mode == "instant_pulse"
        else int(policy.response_window_seconds or 86400)
    )
    request = CommunityConfirmationRequest(
        public_token=_public_token(),
        requester_user_id=int(requester_user_id) if requester_user_id else None,
        requester_external_label=(requester_external_label or "").strip()[:120] or None,
        subject_user_id=int(subject_user_id),
        community_id=int(community_id),
        trust_slip_id=int(slip.id) if slip else None,
        reason_type=(reason_type or "merchant_trust_check").strip()[:48],
        risk_level=(risk_level or "low").strip()[:24],
        mode=normalized_mode,
        status="pending",
        expires_at=now + timedelta(seconds=window_seconds),
    )
    db.add(request)
    db.flush()

    summary = {
        "positive_count": 0,
        "caution_count": 0,
        "objection_count": 0,
        "eligible_contact_count": eligible_contacts,
        "active_member_count": active_members,
        "confidence_level": "pending",
        "private_contacts_exposed": False,
        "requester_callback": _build_requester_callback(
            channel=requester_callback_channel,
            contact=requester_callback_contact,
            consent=bool(requester_callback_consent),
        ),
    }
    request.outcome_summary = summary

    actor_user_id = int(requester_user_id or subject_user_id)
    responder_notifications_created = _notify_confirmation_contacts(
        db,
        request=request,
        contacts=delivery_contacts,
    )
    log_trust_event(
        db,
        event_type="community_confirmation.requested",
        clan_id=int(community_id),
        actor_user_id=actor_user_id,
        subject_user_id=int(subject_user_id),
        meta=build_trust_meta(
            reason="community_confirmation_requested",
            trust_delta="0.00",
            system=requester_user_id is None,
            extra={
                "mode": normalized_mode,
                "reason_type": request.reason_type,
                "risk_level": request.risk_level,
                "trust_slip_code": trust_slip_code,
                "eligible_contact_count": eligible_contacts,
                "delivery_contact_count": len(delivery_contacts),
                "responder_notifications_created": responder_notifications_created,
                "active_member_count": active_members,
                "requester_callback_channel": summary["requester_callback"]["channel"],
                "requester_callback_requested": bool(summary["requester_callback"]["requested"]),
                "requester_callback_delivery_status": summary["requester_callback"][
                    "delivery_status"
                ],
                "private_contacts_exposed": False,
            },
        ),
        commit=False,
        refresh=False,
    )

    log_trust_event(
        db,
        event_type="community_confirmation.delivery_pool_prepared",
        clan_id=int(community_id),
        actor_user_id=int(subject_user_id),
        subject_user_id=int(subject_user_id),
        meta=build_trust_meta(
            reason="community_confirmation_delivery_pool_prepared",
            trust_delta="0.00",
            system=True,
            extra={
                "request_id": int(request.id),
                "mode": normalized_mode,
                "delivery_channel": "in_app_confirmation_inbox",
                "eligible_contact_count": eligible_contacts,
                "delivery_contact_count": len(delivery_contacts),
                "responder_notifications_created": responder_notifications_created,
                "active_member_count": active_members,
                "private_contacts_exposed": False,
            },
        ),
        dedupe_key=f"cc-delivery-pool:{int(request.id)}",
        commit=False,
        refresh=False,
    )

    db.commit()
    db.refresh(request)

    return public_confirmation_outcome(db, public_token=str(request.public_token))


def _request_eligible_for_responder(
    db: Session,
    *,
    request: CommunityConfirmationRequest,
    responder_user_id: int,
) -> bool:
    if int(request.subject_user_id) == int(responder_user_id):
        return False

    contact = (
        db.query(CommunityConfirmationContact)
        .filter(CommunityConfirmationContact.community_id == int(request.community_id))
        .filter(CommunityConfirmationContact.user_id == int(responder_user_id))
        .filter(CommunityConfirmationContact.active.is_(True))
        .filter(CommunityConfirmationContact.can_receive_relay_requests.is_(True))
        .filter(CommunityConfirmationContact.opted_out_at.is_(None))
        .first()
    )
    if contact:
        if request.mode == "instant_pulse" and not contact.can_receive_instant_pulse:
            return False
        return True

    membership = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == int(request.community_id))
        .filter(ClanMembership.user_id == int(responder_user_id))
        .filter(ClanMembership.left_at.is_(None))
        .first()
    )
    if not membership:
        return False

    ensure_default_confirmation_contacts(
        db,
        community_id=int(request.community_id),
        subject_user_id=int(request.subject_user_id),
    )
    return True


def list_confirmation_inbox(db: Session, *, responder_user_id: int) -> Dict[str, Any]:
    ensure_contacts_for_user_communities(db, user_id=int(responder_user_id))
    now = _now_utc()
    rows = (
        db.query(CommunityConfirmationRequest)
        .join(
            CommunityConfirmationContact,
            CommunityConfirmationContact.community_id == CommunityConfirmationRequest.community_id,
        )
        .filter(CommunityConfirmationContact.user_id == int(responder_user_id))
        .filter(CommunityConfirmationContact.active.is_(True))
        .filter(CommunityConfirmationContact.can_receive_relay_requests.is_(True))
        .filter(CommunityConfirmationContact.opted_out_at.is_(None))
        .filter(CommunityConfirmationRequest.subject_user_id != int(responder_user_id))
        .filter(CommunityConfirmationRequest.status.in_(["pending", "responded"]))
        .filter(CommunityConfirmationRequest.expires_at > now)
        .order_by(CommunityConfirmationRequest.created_at.desc())
        .all()
    )

    items = []
    for request in rows:
        existing = (
            db.query(CommunityConfirmationResponse.id)
            .filter(CommunityConfirmationResponse.request_id == int(request.id))
            .filter(CommunityConfirmationResponse.responder_user_id == int(responder_user_id))
            .first()
        )
        if existing:
            continue
        items.append(_private_request_item(db, request))

    return {"items": items, "total": len(items)}


def ensure_contacts_for_user_communities(db: Session, *, user_id: int) -> None:
    memberships = (
        db.query(ClanMembership)
        .filter(ClanMembership.user_id == int(user_id))
        .filter(ClanMembership.left_at.is_(None))
        .all()
    )
    for membership in memberships:
        ensure_default_confirmation_contacts(
            db,
            community_id=int(membership.clan_id),
            subject_user_id=None,
        )


def _contact_setting_item(
    db: Session,
    contact: CommunityConfirmationContact,
) -> Dict[str, Any]:
    community = db.query(Clan).filter(Clan.id == int(contact.community_id)).first()
    return {
        "community_id": int(contact.community_id),
        "community_name": getattr(community, "name", None),
        "community_code": getattr(community, "community_code", None),
        "role_type": contact.role_type,
        "active": bool(contact.active),
        "can_receive_relay_requests": bool(contact.can_receive_relay_requests),
        "can_receive_instant_pulse": bool(contact.can_receive_instant_pulse),
        "standing_status": contact.standing_status,
        "opted_in_at": _to_aware(contact.opted_in_at).isoformat()
        if contact.opted_in_at
        else None,
        "opted_out_at": _to_aware(contact.opted_out_at).isoformat()
        if contact.opted_out_at
        else None,
        "last_active_at": _to_aware(contact.last_active_at).isoformat()
        if contact.last_active_at
        else None,
        "plain_language": (
            "You can receive community confirmation requests for this community."
            if contact.active
            and contact.can_receive_relay_requests
            and not contact.opted_out_at
            else "You are not currently receiving community confirmation requests for this community."
        ),
    }


def list_my_confirmation_contact_settings(
    db: Session,
    *,
    user_id: int,
    community_id: Optional[int] = None,
) -> Dict[str, Any]:
    ensure_contacts_for_user_communities(db, user_id=int(user_id))
    query = (
        db.query(CommunityConfirmationContact)
        .filter(CommunityConfirmationContact.user_id == int(user_id))
        .order_by(CommunityConfirmationContact.community_id.asc())
    )
    if community_id is not None:
        query = query.filter(CommunityConfirmationContact.community_id == int(community_id))
    items = [_contact_setting_item(db, row) for row in query.all()]
    return {
        "items": items,
        "total": len(items),
        "privacy_note": "GSN never exposes your private phone number through public confirmation papers.",
    }


def update_my_confirmation_contact_setting(
    db: Session,
    *,
    user_id: int,
    community_id: int,
    can_receive_relay_requests: Optional[bool] = None,
    can_receive_instant_pulse: Optional[bool] = None,
    opted_out: Optional[bool] = None,
) -> Dict[str, Any]:
    membership = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == int(community_id))
        .filter(ClanMembership.user_id == int(user_id))
        .filter(ClanMembership.left_at.is_(None))
        .first()
    )
    if not membership:
        raise PermissionError("User is not an active member of this community")

    contact = (
        db.query(CommunityConfirmationContact)
        .filter(CommunityConfirmationContact.community_id == int(community_id))
        .filter(CommunityConfirmationContact.user_id == int(user_id))
        .first()
    )
    now = _now_utc()
    if not contact:
        role = str(getattr(membership, "role", "") or "member").lower()
        contact = CommunityConfirmationContact(
            community_id=int(community_id),
            user_id=int(user_id),
            role_type="admin" if role == "admin" else "member",
            active=True,
            can_receive_relay_requests=True,
            can_receive_instant_pulse=True,
            priority_order=0 if role == "admin" else 10,
            standing_status="active",
            opted_in_at=now,
            last_active_at=now,
        )
        db.add(contact)
        db.flush()

    before = {
        "active": bool(contact.active),
        "can_receive_relay_requests": bool(contact.can_receive_relay_requests),
        "can_receive_instant_pulse": bool(contact.can_receive_instant_pulse),
        "opted_out": bool(contact.opted_out_at),
    }

    if opted_out is True:
        contact.can_receive_relay_requests = False
        contact.can_receive_instant_pulse = False
        contact.opted_out_at = now
    elif opted_out is False:
        contact.active = True
        contact.opted_out_at = None
        contact.opted_in_at = now
        if can_receive_relay_requests is None:
            contact.can_receive_relay_requests = True

    if can_receive_relay_requests is not None:
        contact.can_receive_relay_requests = bool(can_receive_relay_requests)
        if contact.can_receive_relay_requests:
            contact.opted_out_at = None
            contact.opted_in_at = contact.opted_in_at or now

    if can_receive_instant_pulse is not None:
        contact.can_receive_instant_pulse = bool(can_receive_instant_pulse)

    if not contact.can_receive_relay_requests:
        contact.can_receive_instant_pulse = False
        contact.opted_out_at = contact.opted_out_at or now

    contact.last_active_at = now
    contact.updated_at = now
    after = {
        "active": bool(contact.active),
        "can_receive_relay_requests": bool(contact.can_receive_relay_requests),
        "can_receive_instant_pulse": bool(contact.can_receive_instant_pulse),
        "opted_out": bool(contact.opted_out_at),
    }
    changed_fields = [key for key, value in after.items() if before.get(key) != value]
    if changed_fields:
        log_trust_event(
            db,
            event_type="community_confirmation.contact_preference_updated",
            clan_id=int(community_id),
            actor_user_id=int(user_id),
            subject_user_id=int(user_id),
            meta=build_trust_meta(
                reason="community_confirmation_contact_preference_updated",
                trust_delta="0.00",
                system=False,
                extra={
                    "community_id": int(community_id),
                    "contact_user_id": int(user_id),
                    "changed_fields": changed_fields,
                    "before": before,
                    "after": after,
                    "member_controlled": True,
                    "private_contacts_exposed": False,
                },
            ),
            commit=False,
            refresh=False,
        )
    db.commit()
    db.refresh(contact)
    return _contact_setting_item(db, contact)


def _is_platform_admin(role: Optional[str]) -> bool:
    return str(role or "").strip().lower() == "admin"


def _require_confirmation_policy_admin(
    db: Session,
    *,
    community_id: int,
    actor_user_id: int,
    actor_role: Optional[str] = None,
) -> ClanMembership:
    membership = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == int(community_id))
        .filter(ClanMembership.user_id == int(actor_user_id))
        .filter(ClanMembership.left_at.is_(None))
        .first()
    )
    if not membership:
        raise PermissionError("Community admin role required")

    membership_role = str(getattr(membership, "role", "") or "").lower()
    if membership_role != "admin" and not _is_platform_admin(actor_role):
        raise PermissionError("Community admin role required")
    return membership


def _policy_item(
    db: Session,
    *,
    community_id: int,
    policy: CommunityConfirmationPolicy,
) -> Dict[str, Any]:
    active_members = _active_member_count(db, community_id)
    contactable = _eligible_contact_count(db, community_id=community_id)
    return {
        "community_id": int(community_id),
        "relay_enabled": bool(policy.relay_enabled),
        "instant_pulse_enabled": bool(policy.instant_pulse_enabled),
        "minimum_positive_responses": int(policy.minimum_positive_responses or 0),
        "maximum_relay_contacts": int(policy.maximum_relay_contacts or 0),
        "response_window_seconds": int(policy.response_window_seconds or 0),
        "review_attention_after_hours": int(
            policy.review_attention_after_hours or DEFAULT_REVIEW_ATTENTION_AFTER_HOURS
        ),
        "review_overdue_after_hours": int(
            policy.review_overdue_after_hours or DEFAULT_REVIEW_OVERDUE_AFTER_HOURS
        ),
        "allow_admin_contacts": bool(policy.allow_admin_contacts),
        "allow_sponsor_contacts": bool(policy.allow_sponsor_contacts),
        "allow_voting_member_contacts": bool(policy.allow_voting_member_contacts),
        "allow_subject_nominated_contacts": bool(policy.allow_subject_nominated_contacts),
        "public_confirmation_enabled": bool(policy.public_confirmation_enabled),
        "active_member_count": active_members,
        "contactable_reference_count": contactable,
        "relay_available": bool(policy.relay_enabled and contactable > 0),
        "updated_at": _to_aware(policy.updated_at).isoformat()
        if getattr(policy, "updated_at", None)
        else None,
    }


def _admin_contact_item(
    db: Session,
    contact: CommunityConfirmationContact,
) -> Dict[str, Any]:
    user = db.query(User).filter(User.id == int(contact.user_id)).first()
    membership = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == int(contact.community_id))
        .filter(ClanMembership.user_id == int(contact.user_id))
        .filter(ClanMembership.left_at.is_(None))
        .first()
    )
    opted_out = bool(contact.opted_out_at)
    receiving = (
        bool(contact.active)
        and bool(contact.can_receive_relay_requests)
        and not opted_out
    )
    return {
        "community_id": int(contact.community_id),
        "user_id": int(contact.user_id),
        "display_name": getattr(user, "display_name", None) or f"Member {int(contact.user_id)}",
        "gsn_id": getattr(user, "gmfn_id", None),
        "profile_image_url": getattr(user, "profile_image_url", None),
        "phone_verified": bool(getattr(user, "phone_verified_at", None)),
        "membership_role": getattr(membership, "role", None),
        "role_type": contact.role_type,
        "active": bool(contact.active),
        "can_receive_relay_requests": bool(contact.can_receive_relay_requests),
        "can_receive_instant_pulse": bool(contact.can_receive_instant_pulse),
        "priority_order": int(contact.priority_order or 0),
        "standing_status": contact.standing_status,
        "receiving_requests": receiving,
        "member_opted_out": opted_out,
        "opted_out_at": _to_aware(contact.opted_out_at).isoformat()
        if contact.opted_out_at
        else None,
        "last_active_at": _to_aware(contact.last_active_at).isoformat()
        if contact.last_active_at
        else None,
        "plain_language": (
            "This member can receive relay requests."
            if receiving
            else "This member is not currently receiving relay requests."
        ),
    }


def get_admin_confirmation_policy(
    db: Session,
    *,
    community_id: int,
    actor_user_id: int,
    actor_role: Optional[str] = None,
) -> Dict[str, Any]:
    _require_confirmation_policy_admin(
        db,
        community_id=int(community_id),
        actor_user_id=int(actor_user_id),
        actor_role=actor_role,
    )
    community = db.query(Clan).filter(Clan.id == int(community_id)).first()
    if not community:
        raise ValueError("Community not found")

    ensure_default_confirmation_contacts(db, community_id=int(community_id))
    policy = get_or_create_confirmation_policy(db, community_id=int(community_id))
    contacts = (
        db.query(CommunityConfirmationContact)
        .filter(CommunityConfirmationContact.community_id == int(community_id))
        .order_by(
            CommunityConfirmationContact.priority_order.asc(),
            CommunityConfirmationContact.id.asc(),
        )
        .all()
    )
    return {
        "community": {
            "id": int(community.id),
            "name": getattr(community, "name", None),
            "community_code": getattr(community, "community_code", None),
            "status": getattr(community, "status", None),
        },
        "policy": _policy_item(db, community_id=int(community_id), policy=policy),
        "contacts": [_admin_contact_item(db, row) for row in contacts],
        "privacy_note": (
            "This admin view controls relay eligibility. It still does not expose "
            "member phone numbers or emails to outsiders."
        ),
    }


def update_admin_confirmation_policy(
    db: Session,
    *,
    community_id: int,
    actor_user_id: int,
    actor_role: Optional[str] = None,
    relay_enabled: Optional[bool] = None,
    instant_pulse_enabled: Optional[bool] = None,
    minimum_positive_responses: Optional[int] = None,
    maximum_relay_contacts: Optional[int] = None,
    response_window_seconds: Optional[int] = None,
    review_attention_after_hours: Optional[int] = None,
    review_overdue_after_hours: Optional[int] = None,
    allow_admin_contacts: Optional[bool] = None,
    allow_sponsor_contacts: Optional[bool] = None,
    allow_voting_member_contacts: Optional[bool] = None,
    allow_subject_nominated_contacts: Optional[bool] = None,
    public_confirmation_enabled: Optional[bool] = None,
) -> Dict[str, Any]:
    _require_confirmation_policy_admin(
        db,
        community_id=int(community_id),
        actor_user_id=int(actor_user_id),
        actor_role=actor_role,
    )
    policy = get_or_create_confirmation_policy(db, community_id=int(community_id))
    before = {
        "relay_enabled": bool(policy.relay_enabled),
        "instant_pulse_enabled": bool(policy.instant_pulse_enabled),
        "minimum_positive_responses": int(policy.minimum_positive_responses or 0),
        "maximum_relay_contacts": int(policy.maximum_relay_contacts or 0),
        "response_window_seconds": int(policy.response_window_seconds or 0),
        "review_attention_after_hours": int(
            policy.review_attention_after_hours or DEFAULT_REVIEW_ATTENTION_AFTER_HOURS
        ),
        "review_overdue_after_hours": int(
            policy.review_overdue_after_hours or DEFAULT_REVIEW_OVERDUE_AFTER_HOURS
        ),
        "allow_admin_contacts": bool(policy.allow_admin_contacts),
        "allow_sponsor_contacts": bool(policy.allow_sponsor_contacts),
        "allow_voting_member_contacts": bool(policy.allow_voting_member_contacts),
        "allow_subject_nominated_contacts": bool(policy.allow_subject_nominated_contacts),
        "public_confirmation_enabled": bool(policy.public_confirmation_enabled),
    }

    bool_updates = {
        "relay_enabled": relay_enabled,
        "instant_pulse_enabled": instant_pulse_enabled,
        "allow_admin_contacts": allow_admin_contacts,
        "allow_sponsor_contacts": allow_sponsor_contacts,
        "allow_voting_member_contacts": allow_voting_member_contacts,
        "allow_subject_nominated_contacts": allow_subject_nominated_contacts,
        "public_confirmation_enabled": public_confirmation_enabled,
    }
    for key, value in bool_updates.items():
        if value is not None:
            setattr(policy, key, bool(value))

    if minimum_positive_responses is not None:
        policy.minimum_positive_responses = max(1, min(int(minimum_positive_responses), 10))
    if maximum_relay_contacts is not None:
        policy.maximum_relay_contacts = max(1, min(int(maximum_relay_contacts), 50))
    if response_window_seconds is not None:
        policy.response_window_seconds = max(60, min(int(response_window_seconds), 604800))
    if review_attention_after_hours is not None:
        policy.review_attention_after_hours = max(
            1,
            min(int(review_attention_after_hours), 168),
        )
    if review_overdue_after_hours is not None:
        policy.review_overdue_after_hours = max(
            2,
            min(int(review_overdue_after_hours), 720),
        )
    if int(policy.review_overdue_after_hours or DEFAULT_REVIEW_OVERDUE_AFTER_HOURS) <= int(
        policy.review_attention_after_hours or DEFAULT_REVIEW_ATTENTION_AFTER_HOURS
    ):
        policy.review_overdue_after_hours = min(
            720,
            int(policy.review_attention_after_hours or DEFAULT_REVIEW_ATTENTION_AFTER_HOURS) + 1,
        )

    policy.updated_at = _now_utc()
    after = {
        "relay_enabled": bool(policy.relay_enabled),
        "instant_pulse_enabled": bool(policy.instant_pulse_enabled),
        "minimum_positive_responses": int(policy.minimum_positive_responses or 0),
        "maximum_relay_contacts": int(policy.maximum_relay_contacts or 0),
        "response_window_seconds": int(policy.response_window_seconds or 0),
        "review_attention_after_hours": int(
            policy.review_attention_after_hours or DEFAULT_REVIEW_ATTENTION_AFTER_HOURS
        ),
        "review_overdue_after_hours": int(
            policy.review_overdue_after_hours or DEFAULT_REVIEW_OVERDUE_AFTER_HOURS
        ),
        "allow_admin_contacts": bool(policy.allow_admin_contacts),
        "allow_sponsor_contacts": bool(policy.allow_sponsor_contacts),
        "allow_voting_member_contacts": bool(policy.allow_voting_member_contacts),
        "allow_subject_nominated_contacts": bool(policy.allow_subject_nominated_contacts),
        "public_confirmation_enabled": bool(policy.public_confirmation_enabled),
    }
    changed_fields = [key for key, value in after.items() if before.get(key) != value]
    if changed_fields:
        log_trust_event(
            db,
            event_type="community_confirmation.policy_updated",
            clan_id=int(community_id),
            actor_user_id=int(actor_user_id),
            subject_user_id=int(actor_user_id),
            meta=build_trust_meta(
                reason="community_confirmation_policy_updated",
                trust_delta="0.00",
                system=False,
                extra={
                    "community_id": int(community_id),
                    "changed_fields": changed_fields,
                    "before": before,
                    "after": after,
                    "admin_controlled": True,
                    "private_contacts_exposed": False,
                },
            ),
            commit=False,
            refresh=False,
        )
    db.commit()
    db.refresh(policy)
    return get_admin_confirmation_policy(
        db,
        community_id=int(community_id),
        actor_user_id=int(actor_user_id),
        actor_role=actor_role,
    )


def update_admin_confirmation_contact(
    db: Session,
    *,
    community_id: int,
    target_user_id: int,
    actor_user_id: int,
    actor_role: Optional[str] = None,
    active: Optional[bool] = None,
    can_receive_relay_requests: Optional[bool] = None,
    can_receive_instant_pulse: Optional[bool] = None,
    role_type: Optional[str] = None,
    standing_status: Optional[str] = None,
    priority_order: Optional[int] = None,
) -> Dict[str, Any]:
    _require_confirmation_policy_admin(
        db,
        community_id=int(community_id),
        actor_user_id=int(actor_user_id),
        actor_role=actor_role,
    )
    membership = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == int(community_id))
        .filter(ClanMembership.user_id == int(target_user_id))
        .filter(ClanMembership.left_at.is_(None))
        .first()
    )
    if not membership:
        raise ValueError("Target user is not an active member of this community")

    ensure_default_confirmation_contacts(db, community_id=int(community_id))
    contact = (
        db.query(CommunityConfirmationContact)
        .filter(CommunityConfirmationContact.community_id == int(community_id))
        .filter(CommunityConfirmationContact.user_id == int(target_user_id))
        .first()
    )
    if not contact:
        raise ValueError("Confirmation contact could not be created")

    before = {
        "active": bool(contact.active),
        "can_receive_relay_requests": bool(contact.can_receive_relay_requests),
        "can_receive_instant_pulse": bool(contact.can_receive_instant_pulse),
        "role_type": contact.role_type,
        "standing_status": contact.standing_status,
        "priority_order": int(contact.priority_order or 0),
        "member_opted_out": bool(contact.opted_out_at),
    }

    if active is not None:
        contact.active = bool(active)

    if can_receive_relay_requests is not None:
        if bool(can_receive_relay_requests) and contact.opted_out_at:
            raise PermissionError("This member has opted out of relay requests")
        contact.can_receive_relay_requests = bool(can_receive_relay_requests)

    if can_receive_instant_pulse is not None:
        if bool(can_receive_instant_pulse) and contact.opted_out_at:
            raise PermissionError("This member has opted out of instant pulse requests")
        contact.can_receive_instant_pulse = bool(can_receive_instant_pulse)

    if role_type is not None:
        clean_role = str(role_type or "").strip().lower()
        if clean_role in {"admin", "member", "sponsor", "voter", "nominated"}:
            contact.role_type = clean_role

    if standing_status is not None:
        clean_status = str(standing_status or "").strip().lower()
        if clean_status in {"active", "caution", "suspended", "inactive"}:
            contact.standing_status = clean_status

    if priority_order is not None:
        contact.priority_order = max(0, min(int(priority_order), 100))

    if not contact.active or not contact.can_receive_relay_requests:
        contact.can_receive_instant_pulse = False

    contact.updated_at = _now_utc()
    after = {
        "active": bool(contact.active),
        "can_receive_relay_requests": bool(contact.can_receive_relay_requests),
        "can_receive_instant_pulse": bool(contact.can_receive_instant_pulse),
        "role_type": contact.role_type,
        "standing_status": contact.standing_status,
        "priority_order": int(contact.priority_order or 0),
        "member_opted_out": bool(contact.opted_out_at),
    }
    changed_fields = [key for key, value in after.items() if before.get(key) != value]
    if changed_fields:
        log_trust_event(
            db,
            event_type="community_confirmation.contact_eligibility_updated",
            clan_id=int(community_id),
            actor_user_id=int(actor_user_id),
            subject_user_id=int(target_user_id),
            meta=build_trust_meta(
                reason="community_confirmation_contact_eligibility_updated",
                trust_delta="0.00",
                system=False,
                extra={
                    "community_id": int(community_id),
                    "contact_user_id": int(target_user_id),
                    "changed_fields": changed_fields,
                    "before": before,
                    "after": after,
                    "admin_controlled": True,
                    "member_opted_out": bool(contact.opted_out_at),
                    "private_contacts_exposed": False,
                },
            ),
            commit=False,
            refresh=False,
        )
    db.commit()
    db.refresh(contact)
    return get_admin_confirmation_policy(
        db,
        community_id=int(community_id),
        actor_user_id=int(actor_user_id),
        actor_role=actor_role,
    )


def _private_request_item(db: Session, request: CommunityConfirmationRequest) -> Dict[str, Any]:
    community = db.query(Clan).filter(Clan.id == int(request.community_id)).first()
    subject = db.query(User).filter(User.id == int(request.subject_user_id)).first()
    membership = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == int(request.community_id))
        .filter(ClanMembership.user_id == int(request.subject_user_id))
        .filter(ClanMembership.left_at.is_(None))
        .first()
    )
    responses = _response_counts(db, request_id=int(request.id))
    return {
        "id": int(request.id),
        "mode": request.mode,
        "reason_type": request.reason_type,
        "risk_level": request.risk_level,
        "community_id": int(request.community_id),
        "community_name": getattr(community, "name", None),
        "community_code": getattr(community, "community_code", None),
        "subject_user_id": int(request.subject_user_id),
        "subject_profile": {
            "user_id": int(request.subject_user_id),
            "display_name": getattr(subject, "display_name", None),
            "gmfn_id": getattr(subject, "gmfn_id", None),
            "profile_image_url": getattr(subject, "profile_image_url", None),
            "phone_verified": bool(getattr(subject, "phone_verified_at", None)),
            "membership_status": "active" if membership else "not_active",
            "membership_role": getattr(membership, "role", None) if membership else None,
        },
        "created_at": _to_aware(request.created_at).isoformat() if request.created_at else None,
        "expires_at": _to_aware(request.expires_at).isoformat() if request.expires_at else None,
        "current_response_counts": responses,
        "reader_note": "Respond only if you genuinely know the member in this community.",
    }


def submit_confirmation_response(
    db: Session,
    *,
    request_id: int,
    responder_user_id: int,
    response_type: str,
    response_reason: Optional[str] = None,
    response_note: Optional[str] = None,
) -> Dict[str, Any]:
    request = (
        db.query(CommunityConfirmationRequest)
        .filter(CommunityConfirmationRequest.id == int(request_id))
        .first()
    )
    if not request:
        raise ValueError("Community confirmation request not found")

    if _to_aware(request.expires_at) and _to_aware(request.expires_at) <= _now_utc():
        _mark_confirmation_request_expired(db, request=request, commit=True)
        raise ValueError("Community confirmation request has expired")

    normalized_response = (response_type or "").strip()
    if normalized_response not in VALID_RESPONSES:
        raise ValueError("Unsupported community confirmation response")

    if not _request_eligible_for_responder(
        db,
        request=request,
        responder_user_id=int(responder_user_id),
    ):
        raise PermissionError("User is not eligible to respond to this community confirmation")

    existing = (
        db.query(CommunityConfirmationResponse)
        .filter(CommunityConfirmationResponse.request_id == int(request_id))
        .filter(CommunityConfirmationResponse.responder_user_id == int(responder_user_id))
        .first()
    )
    if existing:
        raise ValueError("Responder has already answered this request")

    response = CommunityConfirmationResponse(
        request_id=int(request_id),
        responder_user_id=int(responder_user_id),
        response_type=normalized_response,
        response_reason=(response_reason or "").strip()[:80] or None,
        response_note=(response_note or "").strip()[:500] or None,
        responded_at=_now_utc(),
    )
    db.add(response)
    db.flush()
    responder_notification_marked_read = _mark_confirmation_request_notification_read(
        db,
        request_id=int(request_id),
        responder_user_id=int(responder_user_id),
    )

    log_trust_event(
        db,
        event_type="community_confirmation.response_recorded",
        clan_id=int(request.community_id),
        actor_user_id=int(responder_user_id),
        subject_user_id=int(request.subject_user_id),
        meta=build_trust_meta(
            reason="community_confirmation_response",
            trust_delta="0.00",
            system=False,
            extra={
                "request_id": int(request.id),
                "mode": request.mode,
                "response_type": normalized_response,
                "response_category": _response_category(normalized_response),
                "response_reason": response.response_reason,
                "response_note": response.response_note,
                "response_note_present": bool(response.response_note),
                "responder_notification_marked_read": responder_notification_marked_read,
                "responded_after_seconds": _seconds_between(
                    getattr(request, "created_at", None),
                    getattr(response, "responded_at", None),
                ),
                "outwardly_anonymous": True,
                "internally_attributable": True,
                "counted_in_outcome": True,
                "private_contacts_exposed": False,
            },
        ),
        commit=False,
        refresh=False,
    )

    outcome = recompute_confirmation_outcome(db, request_id=int(request_id))
    db.commit()

    return outcome


def _response_counts(db: Session, *, request_id: int) -> Dict[str, int]:
    rows = (
        db.query(CommunityConfirmationResponse.response_type, func.count(CommunityConfirmationResponse.id))
        .filter(CommunityConfirmationResponse.request_id == int(request_id))
        .filter(CommunityConfirmationResponse.counted_in_outcome.is_(True))
        .group_by(CommunityConfirmationResponse.response_type)
        .all()
    )
    positive = 0
    caution = 0
    objection = 0
    for response_type, count in rows:
        response_type = str(response_type or "")
        value = int(count or 0)
        if response_type in POSITIVE_RESPONSES:
            positive += value
        elif response_type in CAUTION_RESPONSES:
            caution += value
        elif response_type in OBJECTION_RESPONSES:
            objection += value
    return {
        "positive_count": positive,
        "caution_count": caution,
        "objection_count": objection,
    }


def _confidence_level(
    *,
    positive: int,
    caution: int,
    objection: int,
    eligible: int,
    required_positive: int = 2,
) -> str:
    if eligible <= 0:
        return "not_available"
    if objection > 0:
        return "caution"
    required = max(1, int(required_positive or 2))
    if positive >= max(3, required + 1):
        return "strong"
    if positive >= required and caution == 0:
        return "moderate"
    if positive >= 1:
        return "limited"
    if caution > 0:
        return "caution"
    return "pending"


def _visible_summary(
    confidence: str,
    positive: int,
    caution: int,
    objection: int,
    *,
    responses_received: int = 0,
    active_members: int = 0,
) -> str:
    response_line = (
        f" {responses_received} of {active_members} active community members responded."
        if active_members > 0
        else ""
    )
    if confidence == "strong":
        return (
            "Instant community confirmation is strong for this request."
            f"{response_line} Use it as evidence, not a guarantee."
        )
    if confidence == "moderate":
        return (
            "Instant community confirmation is moderate."
            f"{response_line} The person is known by responders, but you should still use judgement."
        )
    if confidence == "limited":
        return (
            "Limited instant community confirmation is visible."
            f"{response_line} Ask for more evidence before higher-risk decisions."
        )
    if confidence == "caution":
        if objection:
            return (
                "A caution or objection was raised."
                f"{response_line} Do not rely on this without deeper review."
            )
        if caution:
            return (
                "A caution response was recorded."
                f"{response_line} Ask for more evidence before relying on this."
            )
    if confidence == "not_available":
        return "No eligible community confirmation route is available."
    return (
        "Instant community confirmation is pending."
        f"{response_line} Wait for responses or ask for more evidence."
    )


def _log_confirmation_outcome_event(
    db: Session,
    *,
    request: CommunityConfirmationRequest,
    summary: Dict[str, Any],
    visible_summary: str,
    required_positive_responses: int,
) -> None:
    responses_received = (
        int(summary.get("positive_count") or 0)
        + int(summary.get("caution_count") or 0)
        + int(summary.get("objection_count") or 0)
    )
    confidence = str(summary.get("confidence_level") or "pending")
    dedupe_key = (
        f"cc-outcome:{int(request.id)}:{confidence}:"
        f"{int(summary.get('positive_count') or 0)}:"
        f"{int(summary.get('caution_count') or 0)}:"
        f"{int(summary.get('objection_count') or 0)}:"
        f"{int(summary.get('no_response_count') or 0)}"
    )[:64]
    log_trust_event(
        db,
        event_type="community_confirmation.outcome_recorded",
        clan_id=int(request.community_id),
        actor_user_id=int(request.subject_user_id),
        subject_user_id=int(request.subject_user_id),
        meta=build_trust_meta(
            reason="community_confirmation_outcome",
            note=visible_summary,
            trust_delta="0.00",
            system=True,
            extra={
                "request_id": int(request.id),
                "mode": request.mode,
                "reason_type": request.reason_type,
                "risk_level": request.risk_level,
                "confidence_level": confidence,
                "positive_count": int(summary.get("positive_count") or 0),
                "caution_count": int(summary.get("caution_count") or 0),
                "objection_count": int(summary.get("objection_count") or 0),
                "no_response_count": int(summary.get("no_response_count") or 0),
                "responses_received": responses_received,
                "eligible_contact_count": int(summary.get("eligible_contact_count") or 0),
                "active_member_count": int(summary.get("active_member_count") or 0),
                "required_positive_responses": int(required_positive_responses or 0),
                "outwardly_anonymous": True,
                "internally_attributable": True,
                "private_contacts_exposed": False,
            },
        ),
        dedupe_key=dedupe_key,
        commit=False,
        refresh=False,
    )


def _notify_confirmation_requester_outcome(
    db: Session,
    *,
    request: CommunityConfirmationRequest,
    summary: Dict[str, Any],
    visible_summary: str,
) -> bool:
    responses_received = (
        int(summary.get("positive_count") or 0)
        + int(summary.get("caution_count") or 0)
        + int(summary.get("objection_count") or 0)
    )
    eligible = int(summary.get("eligible_contact_count") or 0)
    confidence = str(summary.get("confidence_level") or "pending").replace("_", " ")
    return _notify_confirmation_requester(
        db,
        request=request,
        kind="community_confirmation.outcome_updated",
        title="Community confirmation updated",
        message=(
            f"{responses_received} of {eligible} requested community responders have answered. "
            f"Current reading: {confidence}. {visible_summary}"
        ),
        action_label="Open result",
    )


def _notify_confirmation_requester_expired(
    db: Session,
    *,
    request: CommunityConfirmationRequest,
    non_response_count: int,
) -> bool:
    return _notify_confirmation_requester(
        db,
        request=request,
        kind="community_confirmation.request_expired",
        title="Community confirmation expired",
        message=(
            "The community confirmation response window has closed. "
            f"{int(non_response_count or 0)} notified responder(s) did not answer before expiry."
        ),
        action_label="Open expired result",
    )


def _apply_requester_callback_delivery(
    *,
    request: CommunityConfirmationRequest,
    summary: Dict[str, Any],
    event: str,
    visible_summary: str,
    confidence: str,
    responses_received: int,
) -> Dict[str, Any]:
    callback = summary.get("requester_callback") or {}
    if not isinstance(callback, dict):
        callback = {}
    updated_callback = attempt_confirmation_callback_delivery(
        request=request,
        requester_callback=callback,
        event=event,
        visible_summary=visible_summary,
        confidence=confidence,
        responses_received=int(responses_received or 0),
    )
    if updated_callback == callback:
        return summary
    return {
        **summary,
        "requester_callback": updated_callback,
    }


def _mark_confirmation_request_expired(
    db: Session,
    *,
    request: CommunityConfirmationRequest,
    commit: bool = False,
) -> None:
    if request.status == "expired":
        return

    previous_status = request.status
    non_response_user_ids = _notified_non_response_user_ids(db, request=request)
    prior_summary = _json_loads(getattr(request, "outcome_summary_json", None))
    responses_received = (
        int(prior_summary.get("positive_count") or 0)
        + int(prior_summary.get("caution_count") or 0)
        + int(prior_summary.get("objection_count") or 0)
    )
    request.status = "expired"
    expired_summary = {
        **prior_summary,
        "no_response_count": len(non_response_user_ids),
        "private_contacts_exposed": False,
    }
    expired_summary = _apply_requester_callback_delivery(
        request=request,
        summary=expired_summary,
        event="community_confirmation.request_expired",
        visible_summary=(
            "The community confirmation response window has closed. "
            f"{len(non_response_user_ids)} notified responder(s) did not answer before expiry."
        ),
        confidence=str(expired_summary.get("confidence_level") or "pending"),
        responses_received=responses_received,
    )
    request.outcome_summary = expired_summary
    log_trust_event(
        db,
        event_type="community_confirmation.request_expired",
        clan_id=int(request.community_id),
        actor_user_id=int(request.subject_user_id),
        subject_user_id=int(request.subject_user_id),
        meta=build_trust_meta(
            reason="community_confirmation_request_expired",
            trust_delta="0.00",
            system=True,
            extra={
                "request_id": int(request.id),
                "mode": request.mode,
                "reason_type": request.reason_type,
                "risk_level": request.risk_level,
                "previous_status": previous_status,
                "status": "expired",
                "expires_at": _to_aware(request.expires_at).isoformat()
                if request.expires_at
                else None,
                "non_response_count": len(non_response_user_ids),
                "private_contacts_exposed": False,
            },
        ),
        dedupe_key=f"cc-request-expired:{int(request.id)}",
        commit=False,
        refresh=False,
    )
    _log_confirmation_non_response_events(
        db,
        request=request,
        user_ids=non_response_user_ids,
    )
    requester_expiry_notification_created = _notify_confirmation_requester_expired(
        db,
        request=request,
        non_response_count=len(non_response_user_ids),
    )
    if requester_expiry_notification_created:
        log_trust_event(
            db,
            event_type="community_confirmation.requester_notified",
            clan_id=int(request.community_id),
            actor_user_id=int(request.subject_user_id),
            subject_user_id=int(request.subject_user_id),
            meta=build_trust_meta(
                reason="community_confirmation_requester_notified",
                trust_delta="0.00",
                system=True,
                extra={
                    "request_id": int(request.id),
                    "notification_kind": "community_confirmation.request_expired",
                    "action_url": _confirmation_public_outcome_action_url(request),
                    "private_contacts_exposed": False,
                },
            ),
            dedupe_key=f"cc-requester-expired-notified:{int(request.id)}",
            commit=False,
            refresh=False,
        )
    db.flush()
    if commit:
        db.commit()


def recompute_confirmation_outcome(db: Session, *, request_id: int) -> Dict[str, Any]:
    request = (
        db.query(CommunityConfirmationRequest)
        .filter(CommunityConfirmationRequest.id == int(request_id))
        .first()
    )
    if not request:
        raise ValueError("Community confirmation request not found")

    prior_summary = _json_loads(getattr(request, "outcome_summary_json", None))
    counts = _response_counts(db, request_id=int(request_id))
    current_eligible = _eligible_contact_count(
        db,
        community_id=int(request.community_id),
        subject_user_id=int(request.subject_user_id),
        instant=request.mode == "instant_pulse",
    )
    eligible = int(prior_summary.get("eligible_contact_count") or current_eligible or 0)
    active_members = int(
        prior_summary.get("active_member_count")
        or _active_member_count(db, int(request.community_id))
        or 0
    )
    policy = get_or_create_confirmation_policy(db, community_id=int(request.community_id))
    received = counts["positive_count"] + counts["caution_count"] + counts["objection_count"]
    no_response = max(eligible - received, 0)
    confidence = _confidence_level(
        positive=counts["positive_count"],
        caution=counts["caution_count"],
        objection=counts["objection_count"],
        eligible=eligible,
        required_positive=int(policy.minimum_positive_responses or 2),
    )
    summary = {
        **counts,
        "eligible_contact_count": eligible,
        "active_member_count": active_members,
        "no_response_count": no_response,
        "confidence_level": confidence,
        "private_contacts_exposed": False,
        "requester_callback": prior_summary.get("requester_callback") or {},
    }
    visible = _visible_summary(
        confidence,
        counts["positive_count"],
        counts["caution_count"],
        counts["objection_count"],
        responses_received=received,
        active_members=active_members,
    )
    summary = _apply_requester_callback_delivery(
        request=request,
        summary=summary,
        event="community_confirmation.outcome_updated",
        visible_summary=visible,
        confidence=confidence,
        responses_received=received,
    )

    outcome = (
        db.query(CommunityConfirmationOutcome)
        .filter(CommunityConfirmationOutcome.request_id == int(request_id))
        .first()
    )
    if not outcome:
        outcome = CommunityConfirmationOutcome(request_id=int(request_id))
        db.add(outcome)

    outcome.positive_count = counts["positive_count"]
    outcome.caution_count = counts["caution_count"]
    outcome.objection_count = counts["objection_count"]
    outcome.no_response_count = no_response
    outcome.eligible_contact_count = eligible
    outcome.confidence_level = confidence
    outcome.visible_summary = visible
    outcome.closed_at = _now_utc()

    request.visible_outcome = confidence
    request.outcome_summary = summary
    request.status = "responded" if received else "pending"
    if confidence in {"strong", "moderate", "caution"}:
        request.status = "closed"

    _log_confirmation_outcome_event(
        db,
        request=request,
        summary=summary,
        visible_summary=visible,
        required_positive_responses=int(policy.minimum_positive_responses or 2),
    )
    requester_outcome_notification_created = _notify_confirmation_requester_outcome(
        db,
        request=request,
        summary=summary,
        visible_summary=visible,
    )
    if requester_outcome_notification_created:
        log_trust_event(
            db,
            event_type="community_confirmation.requester_notified",
            clan_id=int(request.community_id),
            actor_user_id=int(request.subject_user_id),
            subject_user_id=int(request.subject_user_id),
            meta=build_trust_meta(
                reason="community_confirmation_requester_notified",
                trust_delta="0.00",
                system=True,
                extra={
                    "request_id": int(request.id),
                    "notification_kind": "community_confirmation.outcome_updated",
                    "action_url": _confirmation_public_outcome_action_url(request),
                    "private_contacts_exposed": False,
                },
            ),
            dedupe_key=f"cc-requester-notified:{int(request.id)}:{received}",
            commit=False,
            refresh=False,
        )

    db.flush()
    return public_confirmation_outcome(db, public_token=str(request.public_token))


def record_confirmation_decision(
    db: Session,
    *,
    request_id: int,
    actor_user_id: int,
    decision: str,
    amount_band: Optional[str] = None,
    issue_reported: Optional[bool] = None,
    settled: Optional[bool] = None,
    decision_note: Optional[str] = None,
) -> Dict[str, Any]:
    request = (
        db.query(CommunityConfirmationRequest)
        .filter(CommunityConfirmationRequest.id == int(request_id))
        .first()
    )
    if not request:
        raise ValueError("Community confirmation request not found")
    if int(actor_user_id) == int(request.subject_user_id):
        raise PermissionError("The subject cannot record the outsider decision for this confirmation")

    normalized_decision = (decision or "").strip()
    if normalized_decision not in VALID_CONFIRMATION_DECISIONS:
        raise ValueError("Unsupported confirmation decision")

    summary = _json_loads(getattr(request, "outcome_summary_json", None))
    responses_received = (
        int(summary.get("positive_count") or 0)
        + int(summary.get("caution_count") or 0)
        + int(summary.get("objection_count") or 0)
    )
    clean_amount_band = (amount_band or "").strip()[:32] or None
    clean_note = (decision_note or "").strip()[:500] or None
    confidence_snapshot = {
        "confidence_level": str(summary.get("confidence_level") or request.visible_outcome or "pending"),
        "responses_received": responses_received,
        "positive_count": int(summary.get("positive_count") or 0),
        "caution_count": int(summary.get("caution_count") or 0),
        "objection_count": int(summary.get("objection_count") or 0),
        "eligible_contact_count": int(summary.get("eligible_contact_count") or 0),
        "active_member_count": int(summary.get("active_member_count") or 0),
        "private_contacts_exposed": False,
    }
    decision_row = (
        db.query(CommunityConfirmationDecision)
        .filter(CommunityConfirmationDecision.request_id == int(request.id))
        .filter(CommunityConfirmationDecision.actor_user_id == int(actor_user_id))
        .first()
    )
    now = _now_utc()
    if not decision_row:
        decision_row = CommunityConfirmationDecision(
            request_id=int(request.id),
            community_id=int(request.community_id),
            subject_user_id=int(request.subject_user_id),
            actor_user_id=int(actor_user_id),
            created_at=now,
        )
        db.add(decision_row)

    decision_row.decision = normalized_decision
    decision_row.amount_band = clean_amount_band
    decision_row.issue_reported = issue_reported
    decision_row.settled = settled
    decision_row.status = "recorded"
    decision_row.decision_note = clean_note
    decision_row.confidence_snapshot = confidence_snapshot
    decision_row.updated_at = now
    db.flush()

    log_trust_event(
        db,
        event_type="community_confirmation.merchant_decision_recorded",
        clan_id=int(request.community_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(request.subject_user_id),
        meta=build_trust_meta(
            reason="community_confirmation_merchant_decision",
            note=clean_note,
            trust_delta="0.00",
            system=False,
            extra={
                "request_id": int(request.id),
                "decision_id": int(decision_row.id),
                "mode": request.mode,
                "reason_type": request.reason_type,
                "risk_level": request.risk_level,
                "decision": normalized_decision,
                "decision_status": decision_row.status,
                "amount_band": clean_amount_band,
                "issue_reported": issue_reported,
                "settled": settled,
                **confidence_snapshot,
            },
        ),
        dedupe_key=f"cc-decision:{int(request.id)}:{int(actor_user_id)}:{normalized_decision}"[:64],
        commit=False,
        refresh=False,
    )
    db.commit()
    return {
        "decision_recorded": True,
        "decision_id": int(decision_row.id),
        "decision": normalized_decision,
        "decision_status": decision_row.status,
        "request": public_confirmation_outcome(db, public_token=str(request.public_token)),
    }


def _decision_public_item(decision_row: CommunityConfirmationDecision) -> Dict[str, Any]:
    return {
        "decision_id": int(decision_row.id),
        "request_id": int(decision_row.request_id),
        "decision": decision_row.decision,
        "amount_band": decision_row.amount_band,
        "issue_reported": decision_row.issue_reported,
        "settled": decision_row.settled,
        "status": decision_row.status,
        "decision_note": decision_row.decision_note,
        "confidence_snapshot": decision_row.confidence_snapshot or {},
        "created_at": _to_aware(decision_row.created_at).isoformat()
        if decision_row.created_at
        else None,
        "updated_at": _to_aware(decision_row.updated_at).isoformat()
        if decision_row.updated_at
        else None,
        "private_contacts_exposed": False,
    }


def get_confirmation_decision_for_actor(
    db: Session,
    *,
    request_id: int,
    actor_user_id: int,
    actor_role: Optional[str] = None,
) -> Dict[str, Any]:
    request = (
        db.query(CommunityConfirmationRequest)
        .filter(CommunityConfirmationRequest.id == int(request_id))
        .first()
    )
    if not request:
        raise ValueError("Community confirmation request not found")

    query = db.query(CommunityConfirmationDecision).filter(
        CommunityConfirmationDecision.request_id == int(request_id)
    )
    role = str(actor_role or "").lower()
    if role != "admin":
        query = query.filter(CommunityConfirmationDecision.actor_user_id == int(actor_user_id))

    decision_row = query.order_by(CommunityConfirmationDecision.updated_at.desc().nullslast()).first()
    if not decision_row:
        return {
            "decision_found": False,
            "request_id": int(request_id),
            "private_contacts_exposed": False,
        }

    return {
        "decision_found": True,
        **_decision_public_item(decision_row),
    }


def update_confirmation_decision_status(
    db: Session,
    *,
    decision_id: int,
    actor_user_id: int,
    actor_role: Optional[str] = None,
    status: str,
    issue_reported: Optional[bool] = None,
    settled: Optional[bool] = None,
    decision_note: Optional[str] = None,
) -> Dict[str, Any]:
    decision_row = (
        db.query(CommunityConfirmationDecision)
        .filter(CommunityConfirmationDecision.id == int(decision_id))
        .first()
    )
    if not decision_row:
        raise ValueError("Community confirmation decision not found")

    role = str(actor_role or "").lower()
    if int(actor_user_id) != int(decision_row.actor_user_id) and role != "admin":
        raise PermissionError("Only the provider who recorded the decision or an admin can update it")

    normalized_status = (status or "").strip()
    if normalized_status not in VALID_CONFIRMATION_DECISION_STATUSES:
        raise ValueError("Unsupported confirmation decision status")

    previous_status = decision_row.status
    previous_issue = decision_row.issue_reported
    previous_settled = decision_row.settled
    clean_note = (decision_note or "").strip()[:500] or None

    decision_row.status = normalized_status
    if issue_reported is not None:
        decision_row.issue_reported = issue_reported
    if settled is not None:
        decision_row.settled = settled
    if clean_note:
        decision_row.decision_note = clean_note
    decision_row.updated_at = _now_utc()
    db.flush()

    log_trust_event(
        db,
        event_type="community_confirmation.decision_status_updated",
        clan_id=int(decision_row.community_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(decision_row.subject_user_id),
        meta=build_trust_meta(
            reason="community_confirmation_decision_status_update",
            note=clean_note,
            trust_delta="0.00",
            system=False,
            extra={
                "decision_id": int(decision_row.id),
                "request_id": int(decision_row.request_id),
                "decision": decision_row.decision,
                "previous_status": previous_status,
                "status": decision_row.status,
                "previous_issue_reported": previous_issue,
                "issue_reported": decision_row.issue_reported,
                "previous_settled": previous_settled,
                "settled": decision_row.settled,
                "private_contacts_exposed": False,
            },
        ),
        commit=False,
        refresh=False,
    )
    review_case = None
    if normalized_status == "under_review":
        request = (
            db.query(CommunityConfirmationRequest)
            .filter(CommunityConfirmationRequest.id == int(decision_row.request_id))
            .first()
        )
        if request:
            request.status = "under_review"
            review_case = _open_confirmation_review_case(
                db,
                request=request,
                actor_user_id=int(actor_user_id),
                review_reason="provider_decision_review",
                reviewer_note=clean_note,
                decision_id=int(decision_row.id),
            )
    db.commit()
    return {
        "decision_updated": True,
        "decision_id": int(decision_row.id),
        "status": decision_row.status,
        "issue_reported": decision_row.issue_reported,
        "settled": decision_row.settled,
        "review_case": _review_case_public_item(
            review_case,
            include_private_note=True,
            db=db,
            actor_user_id=int(actor_user_id),
            **(
                _review_case_policy_kwargs(db, int(review_case.community_id))
                if review_case
                else {}
            ),
        ),
    }


def _can_manage_confirmation_request(
    db: Session,
    *,
    request: CommunityConfirmationRequest,
    actor_user_id: int,
    actor_role: Optional[str] = None,
) -> bool:
    if _is_platform_admin(actor_role):
        return True
    if request.requester_user_id and int(request.requester_user_id) == int(actor_user_id):
        return True
    if int(request.subject_user_id) == int(actor_user_id):
        return True

    membership = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == int(request.community_id))
        .filter(ClanMembership.user_id == int(actor_user_id))
        .filter(ClanMembership.left_at.is_(None))
        .first()
    )
    if membership and str(getattr(membership, "role", "") or "").lower() == "admin":
        return True

    decision = (
        db.query(CommunityConfirmationDecision.id)
        .filter(CommunityConfirmationDecision.request_id == int(request.id))
        .filter(CommunityConfirmationDecision.actor_user_id == int(actor_user_id))
        .first()
    )
    return bool(decision)


def _is_community_admin_for_confirmation(
    db: Session,
    *,
    community_id: int,
    actor_user_id: int,
    actor_role: Optional[str] = None,
) -> bool:
    if _is_platform_admin(actor_role):
        return True
    membership = (
        db.query(ClanMembership)
        .filter(ClanMembership.clan_id == int(community_id))
        .filter(ClanMembership.user_id == int(actor_user_id))
        .filter(ClanMembership.left_at.is_(None))
        .first()
    )
    return bool(membership and str(getattr(membership, "role", "") or "").lower() == "admin")


def _review_case_sla(
    reading_started_at: Optional[datetime],
    status: Optional[str],
    *,
    attention_after_hours: int = DEFAULT_REVIEW_ATTENTION_AFTER_HOURS,
    overdue_after_hours: int = DEFAULT_REVIEW_OVERDUE_AFTER_HOURS,
) -> Dict[str, Any]:
    attention_hours = max(1, min(int(attention_after_hours or DEFAULT_REVIEW_ATTENTION_AFTER_HOURS), 168))
    overdue_hours = max(
        attention_hours + 1,
        min(int(overdue_after_hours or DEFAULT_REVIEW_OVERDUE_AFTER_HOURS), 720),
    )
    normalized_status = (status or "").strip().lower()
    if normalized_status in {"resolved", "dismissed"}:
        return {
            "age_hours": None,
            "status": "closed",
            "label": "Closed",
            "meaning": "This review case has already been closed.",
            "attention_after_hours": attention_hours,
            "overdue_after_hours": overdue_hours,
        }

    started_at = _to_aware(reading_started_at)
    if not started_at:
        return {
            "age_hours": None,
            "status": "unknown",
            "label": "Age not shown",
            "meaning": "GSN cannot read when this review case started.",
            "attention_after_hours": attention_hours,
            "overdue_after_hours": overdue_hours,
        }

    age_hours = max(0, int((_now_utc() - started_at).total_seconds() // 3600))
    if age_hours >= overdue_hours:
        return {
            "age_hours": age_hours,
            "status": "overdue",
            "label": "Overdue",
            "meaning": (
                f"This case has been waiting for more than {overdue_hours} "
                "hours and needs review attention."
            ),
            "attention_after_hours": attention_hours,
            "overdue_after_hours": overdue_hours,
        }
    if age_hours >= attention_hours:
        return {
            "age_hours": age_hours,
            "status": "needs_attention",
            "label": "Needs attention",
            "meaning": f"This case has been waiting for more than {attention_hours} hours.",
            "attention_after_hours": attention_hours,
            "overdue_after_hours": overdue_hours,
        }
    return {
        "age_hours": age_hours,
        "status": "fresh",
        "label": "Fresh",
        "meaning": f"This case is still inside the first {attention_hours} hours.",
        "attention_after_hours": attention_hours,
        "overdue_after_hours": overdue_hours,
    }


def _review_case_policy_kwargs(db: Session, community_id: int) -> Dict[str, int]:
    policy = get_or_create_confirmation_policy(db, community_id=int(community_id))
    return {
        "review_attention_after_hours": int(
            policy.review_attention_after_hours or DEFAULT_REVIEW_ATTENTION_AFTER_HOURS
        ),
        "review_overdue_after_hours": int(
            policy.review_overdue_after_hours or DEFAULT_REVIEW_OVERDUE_AFTER_HOURS
        ),
    }


def _record_review_case_sla_event(
    db: Session,
    *,
    review_case: CommunityConfirmationReviewCase,
    sla: Dict[str, Any],
    actor_user_id: Optional[int] = None,
) -> Optional[str]:
    status = str(sla.get("status") or "").strip()
    if status not in {"needs_attention", "overdue"}:
        return None
    case_status = str(getattr(review_case, "status", "") or "").strip().lower()
    if case_status in {"resolved", "dismissed"}:
        return None

    fallback_actor_id = (
        actor_user_id
        or review_case.assigned_to_user_id
        or review_case.opened_by_user_id
        or review_case.subject_user_id
    )
    if not fallback_actor_id:
        return None

    dedupe_key = f"cc-review-sla:{int(review_case.id)}:{status}"
    existing = db.query(TrustEvent.id).filter(TrustEvent.dedupe_key == dedupe_key).first()
    if existing:
        return None

    log_trust_event(
        db,
        event_type=f"community_confirmation.review_case_{status}",
        clan_id=int(review_case.community_id),
        actor_user_id=int(fallback_actor_id),
        subject_user_id=int(review_case.subject_user_id),
        meta=build_trust_meta(
            reason=f"community_confirmation_review_case_{status}",
            trust_delta="0.00",
            system=actor_user_id is None,
            extra={
                "review_case_id": int(review_case.id),
                "request_id": int(review_case.request_id),
                "decision_id": int(review_case.decision_id) if review_case.decision_id else None,
                "status": status,
                "label": sla.get("label"),
                "meaning": sla.get("meaning"),
                "age_hours": sla.get("age_hours"),
                "attention_after_hours": sla.get("attention_after_hours"),
                "overdue_after_hours": sla.get("overdue_after_hours"),
                "review_case_status": review_case.status,
                "affects_trust_reading": False,
                "policy_note": (
                    "Review SLA markers are audit evidence only. They do not change trust "
                    "readings until a review outcome is resolved with explicit impact."
                ),
                "private_contacts_exposed": False,
            },
        ),
        dedupe_key=dedupe_key,
        commit=True,
        refresh=False,
    )
    return status


def _review_case_sla_notification_recipients(
    db: Session,
    *,
    review_case: CommunityConfirmationReviewCase,
) -> list[int]:
    recipients: list[int] = []
    if review_case.assigned_to_user_id:
        recipients.append(int(review_case.assigned_to_user_id))
    elif review_case.opened_by_user_id:
        recipients.append(int(review_case.opened_by_user_id))

    admin_ids = [
        int(row.user_id)
        for row in (
            db.query(ClanMembership.user_id)
            .filter(ClanMembership.clan_id == int(review_case.community_id))
            .filter(ClanMembership.role == "admin")
            .filter(ClanMembership.left_at.is_(None))
            .all()
        )
    ]
    recipients.extend(admin_ids)

    seen: set[int] = set()
    clean_recipients: list[int] = []
    for recipient_id in recipients:
        if recipient_id <= 0 or recipient_id in seen:
            continue
        seen.add(recipient_id)
        clean_recipients.append(recipient_id)
    return clean_recipients


def _notify_review_case_sla_event(
    db: Session,
    *,
    review_case: CommunityConfirmationReviewCase,
    sla: Dict[str, Any],
    status: str,
) -> int:
    if status not in {"needs_attention", "overdue"}:
        return 0

    threshold_key = (
        "overdue_after_hours" if status == "overdue" else "attention_after_hours"
    )
    threshold_hours = int(sla.get(threshold_key) or 0)
    action_url = (
        "/app/community-confirmations"
        f"?status=all&scope=all_visible&sort=urgency&case_id={int(review_case.id)}"
    )
    kind = f"community_confirmation.review_case_{status}"
    title = (
        "Overdue community confirmation review"
        if status == "overdue"
        else "Community confirmation review needs attention"
    )
    message = (
        f"Review case {int(review_case.id)} in community "
        f"{int(review_case.community_id)} has been waiting for more than "
        f"{threshold_hours} hours. Check the case and record evidence before resolving it."
    )

    created = 0
    for recipient_id in _review_case_sla_notification_recipients(
        db,
        review_case=review_case,
    ):
        existing = (
            db.query(Notification.id)
            .filter(Notification.user_id == int(recipient_id))
            .filter(Notification.kind == kind)
            .filter(Notification.action_url == action_url)
            .first()
        )
        if existing:
            continue
        create_notification(
            db,
            user_id=int(recipient_id),
            kind=kind,
            title=title,
            message=message,
            action_url=action_url,
            action_label="Review case",
            commit=False,
            refresh=False,
        )
        created += 1
    return created


def _review_case_public_item(
    review_case: Optional[CommunityConfirmationReviewCase],
    *,
    include_private_note: bool = False,
    review_attention_after_hours: int = DEFAULT_REVIEW_ATTENTION_AFTER_HOURS,
    review_overdue_after_hours: int = DEFAULT_REVIEW_OVERDUE_AFTER_HOURS,
    db: Optional[Session] = None,
    actor_user_id: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    if not review_case:
        return None
    sla = _review_case_sla(
        review_case.created_at,
        review_case.status,
        attention_after_hours=review_attention_after_hours,
        overdue_after_hours=review_overdue_after_hours,
    )
    if db is not None:
        _record_review_case_sla_event(
            db,
            review_case=review_case,
            sla=sla,
            actor_user_id=actor_user_id,
        )
    item = {
        "review_case_id": int(review_case.id),
        "request_id": int(review_case.request_id),
        "decision_id": int(review_case.decision_id) if review_case.decision_id else None,
        "community_id": int(review_case.community_id),
        "subject_user_id": int(review_case.subject_user_id),
        "opened_by_user_id": int(review_case.opened_by_user_id),
        "assigned_to_user_id": (
            int(review_case.assigned_to_user_id) if review_case.assigned_to_user_id else None
        ),
        "status": review_case.status,
        "review_reason": review_case.review_reason,
        "resolution": review_case.resolution,
        "trust_impact": review_case.trust_impact,
        "trust_reading_effect": _review_trust_effect(
            review_case.trust_impact,
            review_case.resolution,
        ),
        "review_age_hours": sla.get("age_hours"),
        "review_sla_status": sla.get("status"),
        "review_sla_label": sla.get("label"),
        "review_sla_meaning": sla.get("meaning"),
        "review_attention_after_hours": sla.get("attention_after_hours"),
        "review_overdue_after_hours": sla.get("overdue_after_hours"),
        "created_at": (
            _to_aware(review_case.created_at).isoformat()
            if review_case.created_at
            else None
        ),
        "updated_at": (
            _to_aware(review_case.updated_at).isoformat()
            if review_case.updated_at
            else None
        ),
        "resolved_at": (
            _to_aware(review_case.resolved_at).isoformat()
            if review_case.resolved_at
            else None
        ),
        "private_contacts_exposed": False,
    }
    if include_private_note:
        item["reviewer_note"] = review_case.reviewer_note
        item["resolution_note"] = review_case.resolution_note
        item["evidence_summary"] = review_case.evidence_summary
    return item


def _review_evidence_public_item(
    evidence: CommunityConfirmationReviewEvidence,
) -> Dict[str, Any]:
    return {
        "evidence_id": int(evidence.id),
        "review_case_id": int(evidence.review_case_id),
        "request_id": int(evidence.request_id),
        "evidence_type": evidence.evidence_type,
        "title": evidence.title,
        "body": evidence.body,
        "external_ref": evidence.external_ref,
        "visibility": evidence.visibility,
        "created_at": _to_aware(evidence.created_at).isoformat() if evidence.created_at else None,
        "private_contacts_exposed": False,
    }


def _can_access_review_case(
    db: Session,
    *,
    review_case: CommunityConfirmationReviewCase,
    actor_user_id: int,
    actor_role: Optional[str] = None,
) -> bool:
    if _is_community_admin_for_confirmation(
        db,
        community_id=int(review_case.community_id),
        actor_user_id=int(actor_user_id),
        actor_role=actor_role,
    ):
        return True
    return bool(
        int(review_case.opened_by_user_id) == int(actor_user_id)
        or (
            review_case.assigned_to_user_id is not None
            and int(review_case.assigned_to_user_id) == int(actor_user_id)
        )
    )


def _review_trust_delta(trust_impact: Optional[str]) -> str:
    impact = (trust_impact or "none").strip()
    if impact == "positive":
        return "0.03"
    if impact == "caution":
        return "-0.03"
    if impact == "negative":
        return "-0.08"
    return "0.00"


def _review_trust_effect(trust_impact: Optional[str], resolution: Optional[str]) -> Dict[str, Any]:
    impact = (trust_impact or "none").strip()
    res = (resolution or "").strip()
    if impact == "positive":
        label = "Helps trust"
        meaning = "The review found support for the person's record."
        reader_action = "This can support confidence, while still keeping the decision proportionate."
    elif impact == "caution":
        label = "Adds caution"
        meaning = "The review did not prove misconduct, but it found enough weakness or thin evidence to require care."
        reader_action = "Do not rely heavily on this record without more evidence."
    elif impact == "negative":
        label = "Creates pressure"
        meaning = "The review found a material concern that should weigh against heavy reliance."
        reader_action = "Reduce risk or do not proceed until the concern is resolved."
    else:
        label = "No trust-score effect"
        meaning = "The review was recorded as evidence but should not change the trust reading by itself."
        reader_action = "Use the review note as context only."
    return {
        "impact": impact,
        "resolution": res or None,
        "trust_delta": _review_trust_delta(impact),
        "label": label,
        "plain_language": meaning,
        "reader_action": reader_action,
    }


def _open_confirmation_review_case(
    db: Session,
    *,
    request: CommunityConfirmationRequest,
    actor_user_id: int,
    review_reason: Optional[str] = None,
    reviewer_note: Optional[str] = None,
    decision_id: Optional[int] = None,
) -> CommunityConfirmationReviewCase:
    clean_reason = (review_reason or "").strip()[:80] or "manual_review_needed"
    clean_note = (reviewer_note or "").strip()[:500] or None
    now = _now_utc()

    decision_row = None
    if decision_id is not None:
        decision_row = (
            db.query(CommunityConfirmationDecision)
            .filter(CommunityConfirmationDecision.id == int(decision_id))
            .filter(CommunityConfirmationDecision.request_id == int(request.id))
            .first()
        )
        if not decision_row:
            raise ValueError("Community confirmation decision not found for this request")
    elif actor_user_id:
        decision_row = (
            db.query(CommunityConfirmationDecision)
            .filter(CommunityConfirmationDecision.request_id == int(request.id))
            .filter(CommunityConfirmationDecision.actor_user_id == int(actor_user_id))
            .first()
        )

    review_case = (
        db.query(CommunityConfirmationReviewCase)
        .filter(CommunityConfirmationReviewCase.request_id == int(request.id))
        .first()
    )
    created = review_case is None
    if not review_case:
        review_case = CommunityConfirmationReviewCase(
            request_id=int(request.id),
            decision_id=int(decision_row.id) if decision_row else None,
            community_id=int(request.community_id),
            subject_user_id=int(request.subject_user_id),
            opened_by_user_id=int(actor_user_id),
            status="open",
            review_reason=clean_reason,
            reviewer_note=clean_note,
            trust_impact="none",
            evidence_summary={
                "request_id": int(request.id),
                "mode": request.mode,
                "reason_type": request.reason_type,
                "risk_level": request.risk_level,
                "visible_outcome": request.visible_outcome,
                "outcome_summary": _json_loads(request.outcome_summary_json),
                "private_contacts_exposed": False,
            },
        )
        db.add(review_case)
        db.flush()
    else:
        review_case.status = "open" if review_case.status in {"dismissed", "resolved"} else review_case.status
        review_case.review_reason = clean_reason or review_case.review_reason
        review_case.reviewer_note = clean_note or review_case.reviewer_note
        if decision_row and not review_case.decision_id:
            review_case.decision_id = int(decision_row.id)
        review_case.updated_at = now

    if decision_row:
        decision_row.status = "under_review"
        decision_row.updated_at = now

    log_trust_event(
        db,
        event_type=(
            "community_confirmation.review_case_opened"
            if created
            else "community_confirmation.review_case_updated"
        ),
        clan_id=int(request.community_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(request.subject_user_id),
        meta=build_trust_meta(
            reason="community_confirmation_review_case_opened",
            note=clean_note,
            trust_delta="0.00",
            system=False,
            extra={
                "review_case_id": int(review_case.id),
                "request_id": int(request.id),
                "decision_id": int(review_case.decision_id) if review_case.decision_id else None,
                "review_case_created": created,
                "review_status": review_case.status,
                "review_reason": review_case.review_reason,
                "review_note_present": bool(clean_note),
                "request_status": request.status,
                "mode": request.mode,
                "reason_type": request.reason_type,
                "risk_level": request.risk_level,
                "private_contacts_exposed": False,
            },
        ),
        commit=False,
        refresh=False,
    )
    return review_case


def get_confirmation_review_case(
    db: Session,
    *,
    request_id: int,
    actor_user_id: int,
    actor_role: Optional[str] = None,
) -> Dict[str, Any]:
    request = (
        db.query(CommunityConfirmationRequest)
        .filter(CommunityConfirmationRequest.id == int(request_id))
        .first()
    )
    if not request:
        raise ValueError("Community confirmation request not found")
    review_case = (
        db.query(CommunityConfirmationReviewCase)
        .filter(CommunityConfirmationReviewCase.request_id == int(request.id))
        .first()
    )
    if review_case and not _can_access_review_case(
        db,
        review_case=review_case,
        actor_user_id=int(actor_user_id),
        actor_role=actor_role,
    ):
        raise PermissionError("Only the opener, assigned reviewer, or community admin can view this review")
    if not review_case and not _can_manage_confirmation_request(
        db,
        request=request,
        actor_user_id=int(actor_user_id),
        actor_role=actor_role,
    ):
        raise PermissionError("Only the requester, subject, provider, or community admin can view this review")

    evidence_rows = []
    if review_case:
        evidence_rows = (
            db.query(CommunityConfirmationReviewEvidence)
            .filter(CommunityConfirmationReviewEvidence.review_case_id == int(review_case.id))
            .order_by(CommunityConfirmationReviewEvidence.created_at.desc())
            .all()
        )

    return {
        "review_case_found": bool(review_case),
        "private_contacts_exposed": False,
        "review_case": _review_case_public_item(
            review_case,
            include_private_note=True,
            db=db,
            actor_user_id=int(actor_user_id),
            **(
                _review_case_policy_kwargs(db, int(review_case.community_id))
                if review_case
                else {}
            ),
        ),
        "evidence_items": [_review_evidence_public_item(row) for row in evidence_rows],
    }


def list_confirmation_review_cases(
    db: Session,
    *,
    actor_user_id: int,
    actor_role: Optional[str] = None,
    status: Optional[str] = None,
    scope: Optional[str] = None,
    sort: Optional[str] = None,
    community_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
) -> Dict[str, Any]:
    normalized_status = (status or "").strip()
    normalized_scope = (scope or "all_visible").strip().lower()
    normalized_sort = (sort or "recent").strip().lower()
    limit_value = max(1, min(int(limit or 50), 100))
    offset_value = max(0, int(offset or 0))
    query = db.query(CommunityConfirmationReviewCase)
    if normalized_status and normalized_status != "all":
        query = query.filter(CommunityConfirmationReviewCase.status == normalized_status)
    if normalized_scope == "assigned_to_me":
        query = query.filter(
            CommunityConfirmationReviewCase.assigned_to_user_id == int(actor_user_id)
        )
    elif normalized_scope == "unassigned":
        query = query.filter(CommunityConfirmationReviewCase.assigned_to_user_id.is_(None))
    if community_id is not None:
        query = query.filter(CommunityConfirmationReviewCase.community_id == int(community_id))

    if not _is_platform_admin(actor_role):
        admin_community_ids = [
            int(row.clan_id)
            for row in (
                db.query(ClanMembership.clan_id)
                .filter(ClanMembership.user_id == int(actor_user_id))
                .filter(ClanMembership.left_at.is_(None))
                .filter(ClanMembership.role == "admin")
                .all()
            )
        ]
        access_filters = [
            CommunityConfirmationReviewCase.assigned_to_user_id == int(actor_user_id),
            CommunityConfirmationReviewCase.opened_by_user_id == int(actor_user_id),
        ]
        if admin_community_ids:
            access_filters.append(CommunityConfirmationReviewCase.community_id.in_(admin_community_ids))
        query = query.filter(or_(*access_filters))

    total_available = int(query.count())

    if normalized_sort == "urgency":
        cases = (
            query.order_by(
                case(
                    (
                        CommunityConfirmationReviewCase.status.in_(("open", "in_review")),
                        0,
                    ),
                    else_=1,
                ),
                CommunityConfirmationReviewCase.created_at.asc(),
                CommunityConfirmationReviewCase.updated_at.desc().nullslast(),
            )
            .offset(offset_value)
            .limit(limit_value)
            .all()
        )
    else:
        normalized_sort = "recent"
        cases = (
            query.order_by(
                CommunityConfirmationReviewCase.updated_at.desc().nullslast(),
                CommunityConfirmationReviewCase.created_at.desc(),
            )
            .offset(offset_value)
            .limit(limit_value)
            .all()
        )
    items = []
    for review_case in cases:
        request = (
            db.query(CommunityConfirmationRequest)
            .filter(CommunityConfirmationRequest.id == int(review_case.request_id))
            .first()
        )
        community = (
            db.query(Clan)
            .filter(Clan.id == int(review_case.community_id))
            .first()
        )
        item = (
            _review_case_public_item(
                review_case,
                include_private_note=True,
                db=db,
                actor_user_id=int(actor_user_id),
                **_review_case_policy_kwargs(db, int(review_case.community_id)),
            )
            or {}
        )
        item.update(
            {
                "public_token": getattr(request, "public_token", None),
                "community_name": getattr(community, "name", None),
                "community_code": getattr(community, "community_code", None),
                "request_status": getattr(request, "status", None),
                "request_mode": getattr(request, "mode", None),
                "reason_type": getattr(request, "reason_type", None),
                "risk_level": getattr(request, "risk_level", None),
                "visible_outcome": getattr(request, "visible_outcome", None),
                "outcome_summary": _json_loads(getattr(request, "outcome_summary_json", None)),
            }
        )
        items.append(item)

    return {
        "items": items,
        "total": len(items),
        "returned_count": len(items),
        "total_available": total_available,
        "offset": offset_value,
        "limit": limit_value,
        "has_more": offset_value + len(items) < total_available,
        "next_offset": (
            offset_value + len(items)
            if offset_value + len(items) < total_available
            else None
        ),
        "previous_offset": max(0, offset_value - limit_value) if offset_value > 0 else None,
        "scope": normalized_scope,
        "sort": normalized_sort,
        "private_contacts_exposed": False,
    }


def scan_confirmation_review_sla_events(
    db: Session,
    *,
    actor_user_id: int,
    actor_role: Optional[str] = None,
    community_id: Optional[int] = None,
    limit: int = 200,
) -> Dict[str, Any]:
    if not _is_platform_admin(actor_role):
        if community_id is None:
            raise PermissionError("Community admins must scan one community at a time")
        if not _is_community_admin_for_confirmation(
            db,
            community_id=int(community_id),
            actor_user_id=int(actor_user_id),
            actor_role=actor_role,
        ):
            raise PermissionError("Only a platform or community admin can scan review SLA events")

    limit_value = max(1, min(int(limit or 200), 500))
    query = db.query(CommunityConfirmationReviewCase).filter(
        CommunityConfirmationReviewCase.status.in_(("open", "in_review"))
    )
    if community_id is not None:
        query = query.filter(CommunityConfirmationReviewCase.community_id == int(community_id))

    cases = (
        query.order_by(
            CommunityConfirmationReviewCase.created_at.asc(),
            CommunityConfirmationReviewCase.id.asc(),
        )
        .limit(limit_value)
        .all()
    )
    scanned = 0
    needs_attention = 0
    overdue = 0
    events_recorded = 0
    notifications_created = 0
    recorded_by_status = {"needs_attention": 0, "overdue": 0}
    sample_items = []

    for review_case in cases:
        scanned += 1
        policy_kwargs = _review_case_policy_kwargs(db, int(review_case.community_id))
        sla = _review_case_sla(
            review_case.created_at,
            review_case.status,
            attention_after_hours=policy_kwargs["review_attention_after_hours"],
            overdue_after_hours=policy_kwargs["review_overdue_after_hours"],
        )
        status = str(sla.get("status") or "")
        if status == "needs_attention":
            needs_attention += 1
        elif status == "overdue":
            overdue += 1
        recorded_status = _record_review_case_sla_event(
            db,
            review_case=review_case,
            sla=sla,
            actor_user_id=int(actor_user_id),
        )
        if recorded_status:
            events_recorded += 1
            recorded_by_status[recorded_status] = recorded_by_status.get(recorded_status, 0) + 1
            notifications_created += _notify_review_case_sla_event(
                db,
                review_case=review_case,
                sla=sla,
                status=recorded_status,
            )
            if len(sample_items) < 10:
                sample_items.append(
                    {
                        "review_case_id": int(review_case.id),
                        "request_id": int(review_case.request_id),
                        "community_id": int(review_case.community_id),
                        "subject_user_id": int(review_case.subject_user_id),
                        "sla_status": recorded_status,
                        "age_hours": sla.get("age_hours"),
                        "attention_after_hours": sla.get("attention_after_hours"),
                        "overdue_after_hours": sla.get("overdue_after_hours"),
                    }
                )

    if notifications_created:
        db.commit()

    return {
        "scan_completed": True,
        "scanned": scanned,
        "limit": limit_value,
        "community_id": int(community_id) if community_id is not None else None,
        "needs_attention_cases": needs_attention,
        "overdue_cases": overdue,
        "events_recorded": events_recorded,
        "notifications_created": notifications_created,
        "recorded_by_status": recorded_by_status,
        "sample_recorded_items": sample_items,
        "private_contacts_exposed": False,
        "policy_note": (
            "This scanner records missing review SLA audit markers only. It does not change trust scores, "
            "case status, or private contact visibility."
        ),
    }


def assign_confirmation_review_case(
    db: Session,
    *,
    review_case_id: int,
    actor_user_id: int,
    actor_role: Optional[str] = None,
    assigned_to_user_id: Optional[int] = None,
    assignment_note: Optional[str] = None,
) -> Dict[str, Any]:
    review_case = (
        db.query(CommunityConfirmationReviewCase)
        .filter(CommunityConfirmationReviewCase.id == int(review_case_id))
        .first()
    )
    if not review_case:
        raise ValueError("Community confirmation review case not found")
    if not _is_community_admin_for_confirmation(
        db,
        community_id=int(review_case.community_id),
        actor_user_id=int(actor_user_id),
        actor_role=actor_role,
    ):
        raise PermissionError("Only a platform or community admin can assign this review")

    target_user_id = int(assigned_to_user_id) if assigned_to_user_id else None
    if target_user_id is not None:
        target = db.query(User).filter(User.id == target_user_id).first()
        if not target:
            raise ValueError("Assigned reviewer not found")
        if not _is_platform_admin(actor_role):
            membership = (
                db.query(ClanMembership)
                .filter(ClanMembership.clan_id == int(review_case.community_id))
                .filter(ClanMembership.user_id == target_user_id)
                .filter(ClanMembership.left_at.is_(None))
                .first()
            )
            if not membership:
                raise ValueError("Assigned reviewer must belong to this community")

    previous_assignee = review_case.assigned_to_user_id
    previous_status = review_case.status
    clean_note = (assignment_note or "").strip()[:500] or None
    review_case.assigned_to_user_id = target_user_id
    if target_user_id is not None and review_case.status == "open":
        review_case.status = "in_review"
    review_case.updated_at = _now_utc()

    log_trust_event(
        db,
        event_type="community_confirmation.review_case_assigned",
        clan_id=int(review_case.community_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(review_case.subject_user_id),
        meta=build_trust_meta(
            reason="community_confirmation_review_case_assigned",
            note=clean_note,
            trust_delta="0.00",
            system=False,
            extra={
                "review_case_id": int(review_case.id),
                "request_id": int(review_case.request_id),
                "previous_assigned_to_user_id": (
                    int(previous_assignee) if previous_assignee else None
                ),
                "assigned_to_user_id": target_user_id,
                "previous_status": previous_status,
                "status": review_case.status,
                "assignment_note_present": bool(clean_note),
                "private_contacts_exposed": False,
            },
        ),
        commit=False,
        refresh=False,
    )
    db.commit()
    db.refresh(review_case)
    return {
        "review_case_assigned": True,
        "private_contacts_exposed": False,
        "review_case": _review_case_public_item(
            review_case,
            include_private_note=True,
            db=db,
            actor_user_id=int(actor_user_id),
            **_review_case_policy_kwargs(db, int(review_case.community_id)),
        ),
    }


def add_confirmation_review_evidence(
    db: Session,
    *,
    review_case_id: int,
    actor_user_id: int,
    actor_role: Optional[str] = None,
    evidence_type: str,
    title: str,
    body: Optional[str] = None,
    external_ref: Optional[str] = None,
) -> Dict[str, Any]:
    review_case = (
        db.query(CommunityConfirmationReviewCase)
        .filter(CommunityConfirmationReviewCase.id == int(review_case_id))
        .first()
    )
    if not review_case:
        raise ValueError("Community confirmation review case not found")
    if not _can_access_review_case(
        db,
        review_case=review_case,
        actor_user_id=int(actor_user_id),
        actor_role=actor_role,
    ):
        raise PermissionError("Only the opener, assigned reviewer, or community admin can add review evidence")

    normalized_type = (evidence_type or "").strip()
    if normalized_type not in VALID_CONFIRMATION_EVIDENCE_TYPES:
        raise ValueError("Unsupported confirmation review evidence type")
    clean_title = (title or "").strip()[:160]
    if not clean_title:
        raise ValueError("Evidence title is required")
    clean_body = (body or "").strip()[:2000] or None
    clean_ref = (external_ref or "").strip()[:240] or None

    evidence = CommunityConfirmationReviewEvidence(
        review_case_id=int(review_case.id),
        request_id=int(review_case.request_id),
        community_id=int(review_case.community_id),
        subject_user_id=int(review_case.subject_user_id),
        added_by_user_id=int(actor_user_id),
        evidence_type=normalized_type,
        title=clean_title,
        body=clean_body,
        external_ref=clean_ref,
        visibility="internal",
    )
    db.add(evidence)
    review_case.updated_at = _now_utc()
    db.flush()

    log_trust_event(
        db,
        event_type="community_confirmation.review_evidence_added",
        clan_id=int(review_case.community_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(review_case.subject_user_id),
        meta=build_trust_meta(
            reason="community_confirmation_review_evidence_added",
            note=clean_body,
            trust_delta="0.00",
            system=False,
            extra={
                "review_case_id": int(review_case.id),
                "evidence_id": int(evidence.id),
                "request_id": int(review_case.request_id),
                "evidence_type": evidence.evidence_type,
                "title": evidence.title,
                "body_present": bool(clean_body),
                "external_ref_present": bool(clean_ref),
                "visibility": evidence.visibility,
                "private_contacts_exposed": False,
            },
        ),
        commit=False,
        refresh=False,
    )
    db.commit()
    db.refresh(evidence)
    return {
        "evidence_added": True,
        "private_contacts_exposed": False,
        "evidence": _review_evidence_public_item(evidence),
    }


def list_confirmation_review_evidence(
    db: Session,
    *,
    review_case_id: int,
    actor_user_id: int,
    actor_role: Optional[str] = None,
) -> Dict[str, Any]:
    review_case = (
        db.query(CommunityConfirmationReviewCase)
        .filter(CommunityConfirmationReviewCase.id == int(review_case_id))
        .first()
    )
    if not review_case:
        raise ValueError("Community confirmation review case not found")
    if not _can_access_review_case(
        db,
        review_case=review_case,
        actor_user_id=int(actor_user_id),
        actor_role=actor_role,
    ):
        raise PermissionError("Only the opener, assigned reviewer, or community admin can view review evidence")

    rows = (
        db.query(CommunityConfirmationReviewEvidence)
        .filter(CommunityConfirmationReviewEvidence.review_case_id == int(review_case.id))
        .order_by(CommunityConfirmationReviewEvidence.created_at.desc())
        .all()
    )
    return {
        "items": [_review_evidence_public_item(row) for row in rows],
        "total": len(rows),
        "private_contacts_exposed": False,
    }


def update_confirmation_review_case(
    db: Session,
    *,
    review_case_id: int,
    actor_user_id: int,
    actor_role: Optional[str] = None,
    status: str,
    resolution: Optional[str] = None,
    trust_impact: Optional[str] = None,
    resolution_note: Optional[str] = None,
) -> Dict[str, Any]:
    review_case = (
        db.query(CommunityConfirmationReviewCase)
        .filter(CommunityConfirmationReviewCase.id == int(review_case_id))
        .first()
    )
    if not review_case:
        raise ValueError("Community confirmation review case not found")
    request = (
        db.query(CommunityConfirmationRequest)
        .filter(CommunityConfirmationRequest.id == int(review_case.request_id))
        .first()
    )
    if not request:
        raise ValueError("Community confirmation request not found")
    if not _can_manage_confirmation_request(
        db,
        request=request,
        actor_user_id=int(actor_user_id),
        actor_role=actor_role,
    ):
        raise PermissionError("Only the requester, subject, provider, or community admin can update this review")

    normalized_status = (status or "").strip()
    if normalized_status not in VALID_CONFIRMATION_REVIEW_STATUSES:
        raise ValueError("Unsupported confirmation review status")
    clean_resolution = (resolution or "").strip()[:48] or None
    if clean_resolution and clean_resolution not in VALID_CONFIRMATION_REVIEW_RESOLUTIONS:
        raise ValueError("Unsupported confirmation review resolution")
    normalized_impact = (trust_impact or "none").strip()
    if normalized_impact not in VALID_CONFIRMATION_TRUST_IMPACTS:
        raise ValueError("Unsupported confirmation review trust impact")

    previous_status = review_case.status
    clean_note = (resolution_note or "").strip()[:500] or None
    now = _now_utc()
    review_case.status = normalized_status
    review_case.resolution = clean_resolution
    review_case.resolution_note = clean_note
    review_case.trust_impact = normalized_impact
    review_case.updated_at = now
    if normalized_status in {"resolved", "dismissed"}:
        review_case.resolved_at = now
        if request.status == "under_review":
            request.status = "closed" if normalized_status == "resolved" else "cancelled"
    effective_impact = normalized_impact if normalized_status == "resolved" else "none"
    trust_reading_effect = _review_trust_effect(effective_impact, clean_resolution)

    log_trust_event(
        db,
        event_type="community_confirmation.review_case_resolved",
        clan_id=int(review_case.community_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(review_case.subject_user_id),
        meta=build_trust_meta(
            reason="community_confirmation_review_case_resolved",
            note=clean_note,
            trust_delta=trust_reading_effect["trust_delta"],
            system=False,
            extra={
                "review_case_id": int(review_case.id),
                "request_id": int(review_case.request_id),
                "decision_id": int(review_case.decision_id) if review_case.decision_id else None,
                "previous_status": previous_status,
                "status": review_case.status,
                "resolution": review_case.resolution,
                "trust_impact": review_case.trust_impact,
                "affects_trust_reading": effective_impact != "none",
                "trust_reading_effect": trust_reading_effect,
                "resolution_note_present": bool(clean_note),
                "request_status": request.status,
                "policy_note": (
                    "Only resolved review outcomes with explicit trust impact should affect the trust reading."
                ),
                "private_contacts_exposed": False,
            },
        ),
        commit=False,
        refresh=False,
    )
    db.commit()
    db.refresh(review_case)
    return {
        "review_case_updated": True,
        "private_contacts_exposed": False,
        "review_case": _review_case_public_item(
            review_case,
            include_private_note=True,
            db=db,
            actor_user_id=int(actor_user_id),
            **_review_case_policy_kwargs(db, int(review_case.community_id)),
        ),
    }


def update_confirmation_request_status(
    db: Session,
    *,
    request_id: int,
    actor_user_id: int,
    actor_role: Optional[str] = None,
    status: str,
    status_reason: Optional[str] = None,
    status_note: Optional[str] = None,
) -> Dict[str, Any]:
    request = (
        db.query(CommunityConfirmationRequest)
        .filter(CommunityConfirmationRequest.id == int(request_id))
        .first()
    )
    if not request:
        raise ValueError("Community confirmation request not found")

    if not _can_manage_confirmation_request(
        db,
        request=request,
        actor_user_id=int(actor_user_id),
        actor_role=actor_role,
    ):
        raise PermissionError("Only the requester, subject, provider, or community admin can close this confirmation")

    normalized_status = (status or "").strip()
    if normalized_status not in VALID_CONFIRMATION_REQUEST_STATUSES:
        raise ValueError("Unsupported confirmation request status")

    previous_status = request.status
    clean_reason = (status_reason or "").strip()[:80] or None
    clean_note = (status_note or "").strip()[:500] or None
    request.status = normalized_status
    review_case = None

    log_trust_event(
        db,
        event_type="community_confirmation.request_status_updated",
        clan_id=int(request.community_id),
        actor_user_id=int(actor_user_id),
        subject_user_id=int(request.subject_user_id),
        meta=build_trust_meta(
            reason="community_confirmation_request_status_updated",
            note=clean_note,
            trust_delta="0.00",
            system=False,
            extra={
                "request_id": int(request.id),
                "mode": request.mode,
                "reason_type": request.reason_type,
                "risk_level": request.risk_level,
                "previous_status": previous_status,
                "status": normalized_status,
                "status_reason": clean_reason,
                "status_note": clean_note,
                "status_note_present": bool(clean_note),
                "private_contacts_exposed": False,
            },
        ),
        commit=False,
        refresh=False,
    )
    if normalized_status == "under_review":
        review_case = _open_confirmation_review_case(
            db,
            request=request,
            actor_user_id=int(actor_user_id),
            review_reason=clean_reason,
            reviewer_note=clean_note,
        )
    db.commit()
    return {
        "request_updated": True,
        "request_id": int(request.id),
        "previous_status": previous_status,
        "status": request.status,
        "review_case": _review_case_public_item(
            review_case,
            include_private_note=True,
            db=db,
            actor_user_id=int(actor_user_id),
            **(
                _review_case_policy_kwargs(db, int(review_case.community_id))
                if review_case
                else {}
            ),
        ),
        "private_contacts_exposed": False,
        "request": public_confirmation_outcome(db, public_token=str(request.public_token)),
    }


def public_confirmation_outcome(db: Session, *, public_token: str) -> Dict[str, Any]:
    request = (
        db.query(CommunityConfirmationRequest)
        .filter(CommunityConfirmationRequest.public_token == public_token)
        .first()
    )
    if not request:
        raise ValueError("Community confirmation request not found")

    community = db.query(Clan).filter(Clan.id == int(request.community_id)).first()
    summary = _json_loads(getattr(request, "outcome_summary_json", None))
    outcome = (
        db.query(CommunityConfirmationOutcome)
        .filter(CommunityConfirmationOutcome.request_id == int(request.id))
        .first()
    )
    review_case = (
        db.query(CommunityConfirmationReviewCase)
        .filter(CommunityConfirmationReviewCase.request_id == int(request.id))
        .first()
    )

    expires_at = _to_aware(request.expires_at)
    expired = bool(expires_at and expires_at <= _now_utc())
    if expired and request.status not in {"closed", "expired"}:
        _mark_confirmation_request_expired(db, request=request, commit=True)

    confidence = (
        str(getattr(outcome, "confidence_level", "") or "")
        or str(summary.get("confidence_level") or "")
        or "pending"
    )

    return {
        "request_id": int(request.id),
        "public_token": request.public_token,
        "status": "expired" if expired and request.status != "closed" else request.status,
        "mode": request.mode,
        "reason_type": request.reason_type,
        "risk_level": request.risk_level,
        "community_name": getattr(community, "name", None),
        "community_id": int(request.community_id),
        "community_code": getattr(community, "community_code", None),
        "subject_user_id": int(request.subject_user_id),
        "review_case": _review_case_public_item(
            review_case,
            include_private_note=False,
            db=db,
            **(
                _review_case_policy_kwargs(db, int(review_case.community_id))
                if review_case
                else {}
            ),
        ),
        "created_at": _to_aware(request.created_at).isoformat() if request.created_at else None,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "community_response": {
            "requests_sent": int(summary.get("eligible_contact_count") or 0),
            "active_member_count": int(
                summary.get("active_member_count")
                or _active_member_count(db, int(request.community_id))
                or 0
            ),
            "responses_received": int(summary.get("positive_count") or 0)
            + int(summary.get("caution_count") or 0)
            + int(summary.get("objection_count") or 0),
            "confirmed_known_count": int(summary.get("positive_count") or 0),
            "caution_count": int(summary.get("caution_count") or 0),
            "objection_count": int(summary.get("objection_count") or 0),
            "community_confidence": confidence,
            "private_contacts_exposed": False,
        },
        "visible_summary": getattr(outcome, "visible_summary", None)
        or _visible_summary(
            confidence,
            int(summary.get("positive_count") or 0),
            int(summary.get("caution_count") or 0),
            int(summary.get("objection_count") or 0),
            responses_received=(
                int(summary.get("positive_count") or 0)
                + int(summary.get("caution_count") or 0)
                + int(summary.get("objection_count") or 0)
            ),
            active_members=int(
                summary.get("active_member_count")
                or _active_member_count(db, int(request.community_id))
                or 0
            ),
        ),
        "privacy_note": "GSN shows a controlled community outcome. It does not expose private member phone numbers.",
        "decision_note": "This is evidence for judgement, not a guarantee, payment instruction, or automatic approval.",
        "requester_callback": _public_requester_callback(summary),
    }


def _community_verify_lookup_parts(community_key: str) -> tuple[str, list[str], Optional[int]]:
    raw_key = str(community_key or "").strip()
    normalized_key = raw_key.upper()
    candidates: list[str] = []

    def add_candidate(value: str) -> None:
        candidate = str(value or "").strip()
        if candidate and candidate not in candidates:
            candidates.append(candidate)

    add_candidate(raw_key)
    add_candidate(normalized_key)

    lookup_id: Optional[int] = int(normalized_key) if normalized_key.isdigit() else None
    for prefix in COMMUNITY_VERIFY_PREFIXES:
        if not normalized_key.startswith(prefix):
            continue
        suffix = normalized_key[len(prefix) :].strip()
        if not suffix.isdigit():
            continue
        lookup_id = int(suffix)
        for code_prefix in ("GMFN-C-", "GSN-C-", "GMFM-C-"):
            add_candidate(f"{code_prefix}{lookup_id:06d}")
        for code_prefix in ("GSN-COM-", "GMFN-COM-", "GMFM-COM-"):
            add_candidate(f"{code_prefix}{lookup_id:04d}")
        break

    return normalized_key, candidates, lookup_id


def public_community_verification(db: Session, *, community_key: str) -> Dict[str, Any]:
    key = str(community_key or "").strip()
    normalized_key, code_candidates, lookup_id = _community_verify_lookup_parts(key)
    query = db.query(Clan)
    community = None
    if lookup_id is not None and key.isdigit():
        community = query.filter(Clan.id == int(lookup_id)).first()
    if not community:
        candidate_keys = [candidate.upper() for candidate in code_candidates]
        if candidate_keys:
            community = query.filter(func.upper(Clan.community_code).in_(candidate_keys)).first()
    if not community and lookup_id is not None:
        community = query.filter(Clan.id == int(lookup_id)).first()
    if not community:
        community = query.filter(Clan.name == key).first()
    if not community and normalized_key:
        community = query.filter(func.upper(Clan.name) == normalized_key).first()
    if not community:
        raise ValueError("Community not found")

    summary = build_community_confirmation_summary(
        db,
        community_id=int(community.id),
        subject_user_id=None,
    )
    return {
        "community_name": community.name,
        "community_id": int(community.id),
        "community_code": community.community_code,
        "status": community.status,
        "description": community.description,
        "active_member_count": summary["active_member_count"],
        "relay_available": summary["relay_available"],
        "instant_pulse_available": summary["instant_pulse_available"],
        "public_policy": summary.get("plain_language")
        or "Member confirmation is available through GSN relay when enabled. Private contact details are not publicly exposed.",
        "plain_language": summary.get("plain_language"),
        "hidden_by_design": [
            "full member list",
            "raw member phone numbers",
            "raw sponsor details",
            "internal disputes by default",
        ],
    }
