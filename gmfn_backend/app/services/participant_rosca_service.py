from __future__ import annotations

import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import RoscaObligation, RoscaParticipant, RoscaRun, User
from app.db.notification_models import Notification
from app.services.notification_service import create_notification

RUN_DRAFT = "draft"
RUN_INVITING = "inviting"
RUN_READY = "ready_to_activate"
RUN_ACTIVE = "active"
RUN_COMPLETED = "completed"
RUN_CANCELLED = "cancelled"

PARTICIPANT_INVITED = "invited"
PARTICIPANT_ACCEPTED = "accepted"
PARTICIPANT_DECLINED = "declined"
PARTICIPANT_REVOKED = "revoked"
PARTICIPANT_REMOVED = "removed"
PARTICIPANT_WITHDRAW_REQUESTED = "withdraw_requested"
PARTICIPANT_WITHDRAWN = "withdrawn"

OBLIGATION_CONTRIBUTION = "contribution"
OBLIGATION_PAYOUT = "payout"
OBLIGATION_SCHEDULED = "scheduled"
OBLIGATION_REPORTED = "reported"
OBLIGATION_CONFIRMED = "confirmed"

ROSCA_INVITATION_NOTIFICATION_KIND = "participant_rosca.invitation"

TERMINAL_PARTICIPANT_STATES = {
    PARTICIPANT_DECLINED,
    PARTICIPANT_REVOKED,
    PARTICIPANT_REMOVED,
    PARTICIPANT_WITHDRAWN,
}


class ParticipantRoscaNotFound(Exception):
    pass


class ParticipantRoscaForbidden(Exception):
    pass


class ParticipantRoscaConflict(Exception):
    pass


class ParticipantRoscaValidation(Exception):
    pass


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _decimal(value: Any) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _currency(value: str) -> str:
    raw = (value or "NGN").strip().upper()
    if not raw:
        return "NGN"
    return raw[:8]


def _public_id() -> str:
    return "ROSCA-" + secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:12].upper()


def _hash_payload(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _identifier_hash(value: str) -> str:
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


def _safe_meta(value: Optional[Dict[str, Any]]) -> str:
    return json.dumps(value or {}, sort_keys=True, separators=(",", ":"))


def build_terms_snapshot(payload: Any) -> Dict[str, Any]:
    start_at = getattr(payload, "start_at", None)
    return {
        "name": str(getattr(payload, "name", "")).strip(),
        "amount": str(_decimal(getattr(payload, "amount"))),
        "currency": _currency(getattr(payload, "currency", "NGN")),
        "frequency_unit": getattr(payload, "frequency_unit", "monthly"),
        "frequency_interval": int(getattr(payload, "frequency_interval", 1)),
        "participant_count_required": int(getattr(payload, "participant_count_required")),
        "round_count": int(getattr(payload, "round_count")),
        "start_rule": getattr(payload, "start_rule", "on_all_acceptance"),
        "start_at": start_at.isoformat() if start_at else None,
        "rotation_method": getattr(payload, "rotation_method", "explicit_order"),
        "origin_clan_id": getattr(payload, "origin_clan_id", None),
        "external_money_moved_by_gsn": False,
        "non_custodial_note": "GSN records agreement and evidence only; money moves outside GSN.",
    }


def terms_hash(snapshot: Dict[str, Any]) -> str:
    return _hash_payload(snapshot)


def _apply_terms(run: RoscaRun, payload: Any, *, next_version: Optional[int] = None) -> None:
    snapshot = build_terms_snapshot(payload)
    run.name = snapshot["name"]
    run.amount = _decimal(snapshot["amount"])
    run.currency = snapshot["currency"]
    run.frequency_unit = snapshot["frequency_unit"]
    run.frequency_interval = snapshot["frequency_interval"]
    run.round_count = snapshot["round_count"]
    run.participant_count_required = snapshot["participant_count_required"]
    run.start_rule = snapshot["start_rule"]
    raw_start = snapshot.get("start_at")
    run.start_at = datetime.fromisoformat(raw_start) if raw_start else None
    run.rotation_method = snapshot["rotation_method"]
    run.origin_clan_id = snapshot["origin_clan_id"]
    if next_version is not None:
        run.terms_version = next_version
    run.terms_snapshot = snapshot
    run.terms_hash = terms_hash(snapshot)
    run.external_money_moved_by_gsn = False



def _rosca_invitation_action_url(run_id: int) -> str:
    return f"/app/commitments?rosca_run_id={int(run_id)}"


def _coordinator_label(db: Session, run: RoscaRun) -> str:
    coordinator = db.get(User, int(run.coordinator_user_id)) if run.coordinator_user_id else None
    if coordinator is None:
        return "Your coordinator"
    return (
        str(getattr(coordinator, "display_name", "") or "").strip()
        or str(getattr(coordinator, "gmfn_id", "") or "").strip()
        or "Your coordinator"
    )


def _ensure_invitation_notification(db: Session, *, run: RoscaRun, participant: RoscaParticipant) -> None:
    action_url = _rosca_invitation_action_url(int(run.id))
    existing = (
        db.query(Notification)
        .filter(
            Notification.user_id == int(participant.user_id),
            Notification.kind == ROSCA_INVITATION_NOTIFICATION_KIND,
            Notification.action_url == action_url,
        )
        .order_by(Notification.id.desc())
        .first()
    )
    if existing:
        return

    coordinator_label = _coordinator_label(db, run)
    run_name = str(run.name or "ROSCA").strip() or "ROSCA"
    create_notification(
        db,
        user_id=int(participant.user_id),
        kind=ROSCA_INVITATION_NOTIFICATION_KIND,
        title="ROSCA invitation",
        message=f"{coordinator_label} invited you to {run_name}.",
        action_url=action_url,
        action_label="Review invitation",
        commit=False,
        refresh=False,
    )


def _stale_invitation_notifications_for_participant(
    db: Session,
    *,
    run_id: int,
    user_id: int,
    now: Optional[datetime] = None,
) -> int:
    action_url = _rosca_invitation_action_url(int(run_id))
    timestamp = now or now_utc()
    rows = (
        db.query(Notification)
        .filter(
            Notification.user_id == int(user_id),
            Notification.kind == ROSCA_INVITATION_NOTIFICATION_KIND,
            Notification.action_url == action_url,
            Notification.is_read == False,  # noqa: E712
        )
        .all()
    )
    for row in rows:
        row.is_read = True
        row.read_at = timestamp
        db.add(row)
    return len(rows)


def stale_invitation_notifications_for_run(db: Session, *, run_id: int, now: Optional[datetime] = None) -> int:
    action_url = _rosca_invitation_action_url(int(run_id))
    timestamp = now or now_utc()
    rows = (
        db.query(Notification)
        .filter(
            Notification.kind == ROSCA_INVITATION_NOTIFICATION_KIND,
            Notification.action_url == action_url,
            Notification.is_read == False,  # noqa: E712
        )
        .all()
    )
    for row in rows:
        row.is_read = True
        row.read_at = timestamp
        db.add(row)
    return len(rows)

def _participant_out(row: RoscaParticipant) -> Dict[str, Any]:
    return {
        "id": row.id,
        "user_id": row.user_id,
        "role": row.role,
        "status": row.status,
        "rotation_position": row.rotation_position,
        "accepted_terms_version": row.accepted_terms_version,
        "accepted_terms_hash": row.accepted_terms_hash,
        "accepted_at": row.accepted_at,
        "acceptance_source": row.acceptance_source,
        "invited_at": row.invited_at,
        "responded_at": row.responded_at,
    }


def participant_to_response(row: RoscaParticipant) -> Dict[str, Any]:
    return _participant_out(row)


def _obligation_out(row: RoscaObligation) -> Dict[str, Any]:
    return {
        "id": row.id,
        "rosca_run_id": row.rosca_run_id,
        "participant_id": row.participant_id,
        "user_id": row.user_id,
        "round_number": row.round_number,
        "obligation_type": row.obligation_type,
        "amount": row.amount,
        "currency": row.currency,
        "amount_recorded": row.amount_recorded,
        "amount_outstanding": row.amount_outstanding,
        "due_at": row.due_at,
        "state": row.state,
        "external_reference": row.external_reference,
        "reported_by_user_id": row.reported_by_user_id,
        "reported_at": row.reported_at,
        "confirmed_by_user_id": row.confirmed_by_user_id,
        "confirmed_at": row.confirmed_at,
    }


def obligation_to_response(row: RoscaObligation) -> Dict[str, Any]:
    return _obligation_out(row)


def _participants_for_run(db: Session, run_id: int) -> List[RoscaParticipant]:
    return (
        db.query(RoscaParticipant)
        .filter(RoscaParticipant.rosca_run_id == run_id)
        .order_by(RoscaParticipant.rotation_position.asc(), RoscaParticipant.id.asc())
        .all()
    )


def _obligations_for_run(db: Session, run_id: int) -> List[RoscaObligation]:
    return (
        db.query(RoscaObligation)
        .filter(RoscaObligation.rosca_run_id == run_id)
        .order_by(RoscaObligation.round_number.asc(), RoscaObligation.obligation_type.asc(), RoscaObligation.id.asc())
        .all()
    )


def run_to_response(db: Session, run: RoscaRun, *, include_obligations: bool = True) -> Dict[str, Any]:
    return {
        "id": run.id,
        "public_id": run.public_id,
        "status": run.status,
        "name": run.name,
        "amount": run.amount,
        "currency": run.currency,
        "frequency_unit": run.frequency_unit,
        "frequency_interval": run.frequency_interval,
        "participant_count_required": run.participant_count_required,
        "round_count": run.round_count,
        "start_rule": run.start_rule,
        "start_at": run.start_at,
        "rotation_method": run.rotation_method,
        "terms_version": run.terms_version,
        "terms_hash": run.terms_hash,
        "origin_clan_id": run.origin_clan_id,
        "created_by_user_id": run.created_by_user_id,
        "coordinator_user_id": run.coordinator_user_id,
        "external_money_moved_by_gsn": bool(run.external_money_moved_by_gsn),
        "activated_at": run.activated_at,
        "cancelled_at": run.cancelled_at,
        "completed_at": run.completed_at,
        "created_at": run.created_at,
        "updated_at": run.updated_at,
        "participants": [_participant_out(row) for row in _participants_for_run(db, run.id)],
        "obligations": [_obligation_out(row) for row in _obligations_for_run(db, run.id)] if include_obligations else [],
    }


def _require_run(db: Session, run_id: int) -> RoscaRun:
    run = db.query(RoscaRun).filter(RoscaRun.id == run_id).first()
    if not run:
        raise ParticipantRoscaNotFound("ROSCA run not found")
    return run


def _is_coordinator(run: RoscaRun, user_id: int) -> bool:
    return run.coordinator_user_id == user_id


def _participant_for_user(db: Session, run_id: int, user_id: int) -> Optional[RoscaParticipant]:
    return (
        db.query(RoscaParticipant)
        .filter(RoscaParticipant.rosca_run_id == run_id, RoscaParticipant.user_id == user_id)
        .first()
    )


def _require_visible_run(db: Session, run_id: int, user_id: int) -> RoscaRun:
    run = _require_run(db, run_id)
    if _is_coordinator(run, user_id) or _participant_for_user(db, run_id, user_id):
        return run
    raise ParticipantRoscaForbidden("Only the coordinator or invited participant can access this ROSCA run")


def _require_coordinator(run: RoscaRun, user_id: int) -> None:
    if not _is_coordinator(run, user_id):
        raise ParticipantRoscaForbidden("Only the ROSCA coordinator can perform this action")


def _resolve_invitee_by_gsn_id(db: Session, gsn_id: str) -> User:
    identifier = (gsn_id or "").strip()
    if not identifier:
        raise ParticipantRoscaValidation("Invitee GSN ID is required")
    user = db.query(User).filter(User.gmfn_id == identifier).first()
    if not user:
        raise ParticipantRoscaNotFound("No user found for that exact GSN ID")
    return user


def _frequency_delta(run: RoscaRun) -> timedelta:
    interval = max(int(run.frequency_interval or 1), 1)
    if run.frequency_unit == "daily":
        return timedelta(days=interval)
    if run.frequency_unit == "weekly":
        return timedelta(weeks=interval)
    if run.frequency_unit == "custom_days":
        return timedelta(days=interval)
    return timedelta(days=30 * interval)


def _round_due_at(run: RoscaRun, round_number: int, activated_at: datetime) -> datetime:
    start = run.start_at or activated_at
    return start + (_frequency_delta(run) * (round_number - 1))


def _maybe_ready(db: Session, run: RoscaRun) -> None:
    accepted_count = (
        db.query(RoscaParticipant)
        .filter(RoscaParticipant.rosca_run_id == run.id, RoscaParticipant.status == PARTICIPANT_ACCEPTED)
        .count()
    )
    if accepted_count >= int(run.participant_count_required):
        run.status = RUN_READY
    elif run.status in {RUN_DRAFT, RUN_READY}:
        run.status = RUN_INVITING
    run.updated_at = now_utc()


def create_draft_run(db: Session, current_user_id: int, payload: Any) -> RoscaRun:
    run = RoscaRun(
        public_id=_public_id(),
        created_by_user_id=current_user_id,
        coordinator_user_id=current_user_id,
        status=RUN_DRAFT,
        terms_version=1,
        meta_json=_safe_meta(
            {
                "source": "participant_rosca",
                "origin_clan_id_is_provenance_only": True,
                "creates_expected_payments": False,
                "creates_pool_events": False,
                "creates_trust_events": False,
            }
        ),
    )
    _apply_terms(run, payload, next_version=1)
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def update_run_terms(db: Session, run_id: int, current_user_id: int, payload: Any) -> RoscaRun:
    run = _require_run(db, run_id)
    _require_coordinator(run, current_user_id)
    if run.status == RUN_ACTIVE:
        raise ParticipantRoscaConflict("Active ROSCA financial and rotation terms are locked")
    if run.status in {RUN_COMPLETED, RUN_CANCELLED}:
        raise ParticipantRoscaConflict("Terminal ROSCA runs cannot change terms")
    _apply_terms(run, payload, next_version=int(run.terms_version or 1) + 1)
    for participant in _participants_for_run(db, run.id):
        if participant.status == PARTICIPANT_ACCEPTED:
            participant.status = PARTICIPANT_INVITED
            participant.accepted_terms_version = None
            participant.accepted_terms_hash = None
            participant.accepted_at = None
            participant.acceptance_source = None
            participant.responded_at = None
            participant.updated_at = now_utc()
    run.status = RUN_INVITING
    run.updated_at = now_utc()
    db.commit()
    db.refresh(run)
    return run


def invite_participant(db: Session, run_id: int, current_user_id: int, payload: Any) -> RoscaParticipant:
    run = _require_run(db, run_id)
    _require_coordinator(run, current_user_id)
    if run.status in {RUN_ACTIVE, RUN_COMPLETED, RUN_CANCELLED}:
        raise ParticipantRoscaConflict("Participants can only be invited before activation")
    invitee = _resolve_invitee_by_gsn_id(db, payload.invitee_gsn_id)
    existing = _participant_for_user(db, run.id, invitee.id)
    if existing:
        if getattr(payload, "idempotency_key", None) and existing.idempotency_key == payload.idempotency_key:
            _ensure_invitation_notification(db, run=run, participant=existing)
            db.commit()
            db.refresh(existing)
            return existing
        raise ParticipantRoscaConflict("This participant is already invited to the run")
    if int(payload.rotation_position) > int(run.round_count):
        raise ParticipantRoscaValidation("Rotation position cannot exceed round count")
    conflict = (
        db.query(RoscaParticipant)
        .filter(
            RoscaParticipant.rosca_run_id == run.id,
            RoscaParticipant.rotation_position == int(payload.rotation_position),
            RoscaParticipant.status.in_([PARTICIPANT_INVITED, PARTICIPANT_ACCEPTED]),
        )
        .first()
    )
    if conflict:
        raise ParticipantRoscaConflict("Rotation position is already assigned")
    participant = RoscaParticipant(
        rosca_run_id=run.id,
        user_id=invitee.id,
        role=payload.role,
        status=PARTICIPANT_INVITED,
        rotation_position=int(payload.rotation_position),
        invited_by_user_id=current_user_id,
        idempotency_key=getattr(payload, "idempotency_key", None),
        invitation_token_hash=_hash_payload({"run": run.id, "user": invitee.id, "nonce": secrets.token_urlsafe(16)}),
        invitee_identifier_hash=_identifier_hash(payload.invitee_gsn_id),
        meta_json=_safe_meta(
            {
                "invitation_only": True,
                "creates_rosca_obligations": False,
                "creates_expected_payments": False,
                "creates_pool_events": False,
                "creates_trust_events": False,
                "portable_negative_evidence_on_no_response": False,
            }
        ),
    )
    db.add(participant)
    if run.status == RUN_DRAFT:
        run.status = RUN_INVITING
    run.updated_at = now_utc()
    _ensure_invitation_notification(db, run=run, participant=participant)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ParticipantRoscaConflict("Participant invitation conflicts with existing run state") from exc
    db.refresh(participant)
    return participant


def accept_invitation(db: Session, run_id: int, current_user_id: int, payload: Any) -> RoscaParticipant:
    run = _require_run(db, run_id)
    participant = _participant_for_user(db, run.id, current_user_id)
    if run.status in {RUN_ACTIVE, RUN_COMPLETED, RUN_CANCELLED}:
        raise ParticipantRoscaConflict("This invitation is no longer active")
    if not participant:
        raise ParticipantRoscaForbidden("Only the intended participant can accept this ROSCA invitation")
    if participant.status == PARTICIPANT_ACCEPTED:
        if participant.accepted_terms_version == payload.terms_version and participant.accepted_terms_hash == payload.terms_hash:
            return participant
        raise ParticipantRoscaConflict("Participant has already accepted a different terms version")
    if participant.status in TERMINAL_PARTICIPANT_STATES:
        raise ParticipantRoscaConflict("This invitation is no longer active")
    if int(payload.terms_version) != int(run.terms_version) or payload.terms_hash != run.terms_hash:
        raise ParticipantRoscaConflict("Current terms must be accepted before activation")
    participant.status = PARTICIPANT_ACCEPTED
    participant.accepted_terms_version = int(payload.terms_version)
    participant.accepted_terms_hash = payload.terms_hash
    participant.acceptance_source = payload.acceptance_source
    participant.accepted_at = now_utc()
    participant.responded_at = participant.accepted_at
    participant.idempotency_key = payload.idempotency_key or participant.idempotency_key
    participant.meta_json = _safe_meta(
        {
            **participant.meta,
            "accepted_terms_are_run_snapshot": True,
            "accepted_terms_version": int(payload.terms_version),
            "accepted_terms_hash": payload.terms_hash,
            "creates_trust_events": False,
        }
    )
    _maybe_ready(db, run)
    _stale_invitation_notifications_for_participant(
        db,
        run_id=int(run.id),
        user_id=int(current_user_id),
        now=participant.accepted_at,
    )
    db.commit()
    db.refresh(participant)
    return participant


def decline_invitation(db: Session, run_id: int, current_user_id: int, payload: Any) -> RoscaParticipant:
    run = _require_run(db, run_id)
    participant = _participant_for_user(db, run.id, current_user_id)
    if run.status in {RUN_ACTIVE, RUN_COMPLETED, RUN_CANCELLED}:
        raise ParticipantRoscaConflict("This invitation is no longer active")
    if not participant:
        raise ParticipantRoscaForbidden("Only the intended participant can decline this ROSCA invitation")
    if participant.status == PARTICIPANT_DECLINED:
        _stale_invitation_notifications_for_participant(db, run_id=int(run.id), user_id=int(current_user_id))
        db.commit()
        db.refresh(participant)
        return participant
    if participant.status in {PARTICIPANT_REVOKED, PARTICIPANT_REMOVED, PARTICIPANT_WITHDRAWN}:
        raise ParticipantRoscaConflict("This invitation is no longer active")
    participant.status = PARTICIPANT_DECLINED
    participant.responded_at = now_utc()
    participant.idempotency_key = payload.idempotency_key or participant.idempotency_key
    participant.meta_json = _safe_meta(
        {
            **participant.meta,
            "decline_reason": getattr(payload, "reason", None),
            "portable_negative_evidence": False,
            "creates_trust_events": False,
        }
    )
    _maybe_ready(db, run)
    _stale_invitation_notifications_for_participant(
        db,
        run_id=int(run.id),
        user_id=int(current_user_id),
        now=participant.responded_at,
    )
    db.commit()
    db.refresh(participant)
    return participant


def revoke_invitation(db: Session, run_id: int, participant_id: int, current_user_id: int) -> RoscaParticipant:
    run = _require_run(db, run_id)
    _require_coordinator(run, current_user_id)
    if run.status == RUN_ACTIVE:
        raise ParticipantRoscaConflict("Active ROSCA participation cannot be revoked through invitation flow")
    participant = (
        db.query(RoscaParticipant)
        .filter(RoscaParticipant.rosca_run_id == run.id, RoscaParticipant.id == participant_id)
        .first()
    )
    if not participant:
        raise ParticipantRoscaNotFound("Participant not found")
    if participant.status == PARTICIPANT_REVOKED:
        _stale_invitation_notifications_for_participant(db, run_id=int(run.id), user_id=int(participant.user_id))
        db.commit()
        db.refresh(participant)
        return participant
    participant.status = PARTICIPANT_REVOKED
    participant.revoked_at = now_utc()
    participant.meta_json = _safe_meta({**participant.meta, "portable_negative_evidence": False, "creates_trust_events": False})
    _maybe_ready(db, run)
    _stale_invitation_notifications_for_participant(
        db,
        run_id=int(run.id),
        user_id=int(participant.user_id),
        now=participant.revoked_at,
    )
    db.commit()
    db.refresh(participant)
    return participant


def cancel_run(db: Session, run_id: int, current_user_id: int) -> RoscaRun:
    run = _require_run(db, run_id)
    _require_coordinator(run, current_user_id)
    if run.status == RUN_CANCELLED:
        stale_invitation_notifications_for_run(db, run_id=int(run.id))
        db.commit()
        db.refresh(run)
        return run
    if run.status in {RUN_ACTIVE, RUN_COMPLETED}:
        raise ParticipantRoscaConflict("Active or completed ROSCA runs cannot be cancelled through invitation flow")
    cancelled_at = now_utc()
    run.status = RUN_CANCELLED
    run.cancelled_at = cancelled_at
    run.updated_at = cancelled_at
    run.meta_json = _safe_meta({**run.meta, "portable_negative_evidence": False, "creates_trust_events": False})
    stale_invitation_notifications_for_run(db, run_id=int(run.id), now=cancelled_at)
    db.commit()
    db.refresh(run)
    return run

def _accepted_participants(db: Session, run: RoscaRun) -> List[RoscaParticipant]:
    return (
        db.query(RoscaParticipant)
        .filter(RoscaParticipant.rosca_run_id == run.id, RoscaParticipant.status == PARTICIPANT_ACCEPTED)
        .order_by(RoscaParticipant.rotation_position.asc(), RoscaParticipant.id.asc())
        .all()
    )


def _validate_activation(db: Session, run: RoscaRun) -> List[RoscaParticipant]:
    accepted = _accepted_participants(db, run)
    if len(accepted) < int(run.participant_count_required):
        raise ParticipantRoscaConflict("Required participant count has not accepted")
    if len(accepted) != int(run.participant_count_required):
        raise ParticipantRoscaConflict("V1 activation requires exactly the required participant count")
    positions = [row.rotation_position for row in accepted]
    if any(position is None for position in positions):
        raise ParticipantRoscaConflict("Every accepted participant needs a rotation position")
    if len(set(positions)) != len(positions):
        raise ParticipantRoscaConflict("Rotation positions must be unique")
    expected_positions = set(range(1, int(run.participant_count_required) + 1))
    if set(positions) != expected_positions:
        raise ParticipantRoscaConflict("Rotation must be complete for the accepted participants")
    for participant in accepted:
        if participant.accepted_terms_version != run.terms_version or participant.accepted_terms_hash != run.terms_hash:
            raise ParticipantRoscaConflict("Every participant must accept the current terms hash")
    if run.start_rule == "on_date_after_all_acceptance" and run.start_at and run.start_at > now_utc():
        raise ParticipantRoscaConflict("Start date has not arrived")
    return accepted


def activate_run(db: Session, run_id: int, current_user_id: int) -> RoscaRun:
    run = _require_run(db, run_id)
    _require_coordinator(run, current_user_id)
    if run.status == RUN_ACTIVE:
        return run
    if run.status in {RUN_COMPLETED, RUN_CANCELLED}:
        raise ParticipantRoscaConflict("Terminal ROSCA runs cannot be activated")
    accepted = _validate_activation(db, run)
    existing_obligations = db.query(RoscaObligation).filter(RoscaObligation.rosca_run_id == run.id).count()
    if existing_obligations:
        raise ParticipantRoscaConflict("Activation cannot continue because obligations already exist")
    activated_at = now_utc()
    amount = _decimal(run.amount)
    for round_number in range(1, int(run.round_count) + 1):
        due_at = _round_due_at(run, round_number, activated_at)
        recipient = next((row for row in accepted if int(row.rotation_position or 0) == round_number), None)
        for participant in accepted:
            db.add(
                RoscaObligation(
                    rosca_run_id=run.id,
                    participant_id=participant.id,
                    user_id=participant.user_id,
                    round_number=round_number,
                    obligation_type=OBLIGATION_CONTRIBUTION,
                    amount=amount,
                    currency=run.currency,
                    amount_recorded=Decimal("0"),
                    amount_outstanding=amount,
                    due_at=due_at,
                    state=OBLIGATION_SCHEDULED,
                    meta_json=_safe_meta({"created_by_activation": True, "creates_expected_payment": False}),
                )
            )
        if recipient:
            db.add(
                RoscaObligation(
                    rosca_run_id=run.id,
                    participant_id=recipient.id,
                    user_id=recipient.user_id,
                    round_number=round_number,
                    obligation_type=OBLIGATION_PAYOUT,
                    amount=amount * Decimal(len(accepted)),
                    currency=run.currency,
                    amount_recorded=Decimal("0"),
                    amount_outstanding=amount * Decimal(len(accepted)),
                    due_at=due_at,
                    state=OBLIGATION_SCHEDULED,
                    meta_json=_safe_meta({"created_by_activation": True, "external_money_moved_by_gsn": False}),
                )
            )
    run.status = RUN_ACTIVE
    run.activated_at = activated_at
    run.updated_at = activated_at
    run.meta_json = _safe_meta({**run.meta, "activated_without_trust_event": True, "external_money_moved_by_gsn": False})
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise ParticipantRoscaConflict("ROSCA activation conflicted with existing obligation state") from exc
    db.refresh(run)
    return run


def list_my_runs(db: Session, current_user_id: int) -> List[RoscaRun]:
    participant_run_ids = (
        db.query(RoscaParticipant.rosca_run_id)
        .filter(RoscaParticipant.user_id == current_user_id)
        .subquery()
    )
    return (
        db.query(RoscaRun)
        .filter(or_(RoscaRun.coordinator_user_id == current_user_id, RoscaRun.id.in_(participant_run_ids)))
        .order_by(RoscaRun.updated_at.desc(), RoscaRun.id.desc())
        .all()
    )


def get_visible_run(db: Session, run_id: int, current_user_id: int) -> RoscaRun:
    return _require_visible_run(db, run_id, current_user_id)


def record_contribution(db: Session, run_id: int, obligation_id: int, current_user_id: int, payload: Any) -> RoscaObligation:
    run = _require_visible_run(db, run_id, current_user_id)
    if run.status != RUN_ACTIVE:
        raise ParticipantRoscaConflict("Contribution evidence can only be recorded for active ROSCA runs")
    obligation = (
        db.query(RoscaObligation)
        .filter(
            RoscaObligation.id == obligation_id,
            RoscaObligation.rosca_run_id == run.id,
            RoscaObligation.obligation_type == OBLIGATION_CONTRIBUTION,
        )
        .first()
    )
    if not obligation:
        raise ParticipantRoscaNotFound("Contribution obligation not found")
    actor_is_coordinator = _is_coordinator(run, current_user_id)
    actor_is_subject = obligation.user_id == current_user_id
    if not actor_is_coordinator and not actor_is_subject:
        raise ParticipantRoscaForbidden("Only the participant or coordinator can record this contribution")
    if getattr(payload, "idempotency_key", None) and obligation.meta.get("last_idempotency_key") == payload.idempotency_key:
        return obligation
    amount_recorded = _decimal(payload.amount_recorded)
    if amount_recorded <= 0:
        raise ParticipantRoscaValidation("Recorded amount must be positive")
    obligation.amount_recorded = amount_recorded
    obligation.amount_outstanding = max(_decimal(obligation.amount) - amount_recorded, Decimal("0"))
    obligation.external_reference = payload.external_reference
    obligation.reported_by_user_id = current_user_id
    obligation.reported_at = now_utc()
    if actor_is_subject:
        obligation.state = OBLIGATION_CONFIRMED
        obligation.confirmed_by_user_id = current_user_id
        obligation.confirmed_at = obligation.reported_at
    else:
        obligation.state = OBLIGATION_REPORTED
        obligation.confirmed_by_user_id = None
        obligation.confirmed_at = None
    obligation.evidence_json = _safe_meta(
        {
            "note": payload.note,
            "actor_user_id": current_user_id,
            "participant_user_id": obligation.user_id,
            "actor_is_participant": actor_is_subject,
            "actor_is_coordinator": actor_is_coordinator,
            "participant_confirmed": actor_is_subject,
            "external_money_moved_by_gsn": False,
            "creates_trust_event": False,
        }
    )
    obligation.meta_json = _safe_meta({**obligation.meta, "last_idempotency_key": getattr(payload, "idempotency_key", None)})
    obligation.updated_at = now_utc()
    db.commit()
    db.refresh(obligation)
    return obligation
