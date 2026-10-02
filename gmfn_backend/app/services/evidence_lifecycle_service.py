from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.evidence_lifecycle import (
    ACTIVE,
    CORRECTED,
    DISPUTED,
    DISPUTE_RESOLUTIONS,
    EXPIRED,
    LIFECYCLE_MARKER_TYPES,
    LIFECYCLE_STATES,
    MARKER_CORRECTION,
    MARKER_DISPUTE,
    MARKER_EXPIRY,
    MARKER_RESOLUTION,
    MARKER_REVERSAL,
    MARKER_REVOCATION,
    MARKER_SUPERSESSION,
    NOT_MEASURED_YET,
    RESOLUTION_INSUFFICIENT_EVIDENCE,
    RESOLUTION_REVERSED,
    RESOLUTION_SETTLED_WITHOUT_FINDING,
    RESOLUTION_UNRESOLVED,
    RESOLUTION_UPHELD,
    RESOLVED,
    REVERSED,
    REVOKED,
    SOURCE_LOAN,
    SOURCE_PROTECTED_TRADE,
    SOURCE_REPAYMENT,
    SOURCE_TRUST_EVENT,
    SOURCE_TRUST_SLIP,
    STALE,
    SUPERSEDED,
)
from app.db.models import EvidenceLifecycleMarker, Loan, ProtectedTradeRecord, Repayment, TrustEvent, TrustSlip

FULL_REPAYMENT_EVENT_TYPES = {
    "loan.repaid",
    "loan_repaid",
    "loan_fully_repaid",
    "repayment_completed",
    "repayment.completed",
    "repayment_successful",
    "repayment.successful",
    "loan.repayment_confirmed",
    "loan_repayment_confirmed",
    "repayment.confirmed",
    "repayment_confirmed",
    "full_repayment_confirmed",
    "repayment_verified",
}
GUARANTOR_SUCCESS_EVENT_TYPES = {"guarantor_success"}
REPAYMENT_EVIDENCE_EVENT_TYPES = FULL_REPAYMENT_EVENT_TYPES | GUARANTOR_SUCCESS_EVENT_TYPES | {"repayment.created"}
REVERSAL_EVENT_TYPES = {
    "loan_fully_repaid_reversed",
    "guarantor_success_reversed",
    "repayment.reversed",
    "identity.photo_evidence_verified_reversed",
}
CORRECTION_EVENT_TYPES = {"identity.photo_evidence_review_corrected"}
DISPUTE_EVENT_TYPES = {"dispute.opened", "dispute.filed", "dispute.under_review"}
RESOLUTION_EVENT_TYPES = {"dispute.resolved", "dispute.closed"}
LIFECYCLE_EVENT_TYPES = REVERSAL_EVENT_TYPES | CORRECTION_EVENT_TYPES | DISPUTE_EVENT_TYPES | RESOLUTION_EVENT_TYPES

CLEAN_CONSEQUENTIAL_STATES = {ACTIVE}
CONDITIONAL_CONSEQUENTIAL_STATES = {RESOLVED}
NON_CLEAN_STATES = {DISPUTED, REVERSED, CORRECTED, SUPERSEDED, STALE, EXPIRED, REVOKED, NOT_MEASURED_YET}
NEUTRAL_RESOLUTIONS = {RESOLUTION_UNRESOLVED, RESOLUTION_INSUFFICIENT_EVIDENCE, RESOLUTION_SETTLED_WITHOUT_FINDING}


@dataclass(frozen=True)
class EvidenceLifecycleDecision:
    source_type: str
    source_id: str
    current_state: str
    resolution: Optional[str] = None
    reason: str = ""
    marker_id: Optional[int] = None
    related_source_type: Optional[str] = None
    related_source_id: Optional[str] = None
    related_trust_event_id: Optional[int] = None
    usable_for_scoring: bool = False
    usable_for_graph: bool = False
    usable_for_public_evidence: bool = False
    usable_for_decision_pack: bool = False
    requires_caution_label: bool = False

    @property
    def is_clean_current_evidence(self) -> bool:
        clean_state = self.current_state == ACTIVE or (
            self.current_state == RESOLVED and self.resolution == RESOLUTION_UPHELD
        )
        return clean_state and self.usable_for_scoring and self.usable_for_graph


def _as_dict(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str) and value:
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, dict) else {}
        except Exception:
            return {}
    return {}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _source_id(value: Any) -> str:
    return str(value) if value is not None else ""


def _event_meta(event: TrustEvent) -> dict[str, Any]:
    return _as_dict(getattr(event, "meta", None) or getattr(event, "meta_json", None))


def is_lifecycle_marker_event_type(event_type: Optional[str]) -> bool:
    return bool(event_type and event_type in LIFECYCLE_EVENT_TYPES)


def _validate_marker(marker_type: str, state: str, resolution: Optional[str]) -> None:
    if marker_type not in LIFECYCLE_MARKER_TYPES:
        raise ValueError(f"Unsupported evidence lifecycle marker type: {marker_type}")
    if state not in LIFECYCLE_STATES:
        raise ValueError(f"Unsupported evidence lifecycle state: {state}")
    if resolution is not None and resolution not in DISPUTE_RESOLUTIONS:
        raise ValueError(f"Unsupported evidence lifecycle resolution: {resolution}")


def _marker_priority(marker: EvidenceLifecycleMarker) -> int:
    state = marker.state
    if state == REVOKED:
        return 100
    if state == REVERSED:
        return 95
    if state == CORRECTED:
        return 90
    if state == SUPERSEDED:
        return 85
    if state == DISPUTED:
        return 80
    if state in {EXPIRED, STALE}:
        return 70
    if state == RESOLVED:
        if marker.resolution == RESOLUTION_UPHELD:
            return 20
        return 75
    if state == NOT_MEASURED_YET:
        return 65
    return 10


def _latest_marker_for_source(
    db: Session,
    *,
    source_type: str,
    source_id: Any,
    trust_event_id: Optional[int] = None,
) -> Optional[EvidenceLifecycleMarker]:
    sid = _source_id(source_id)
    clauses = [
        (EvidenceLifecycleMarker.source_type == source_type)
        & (EvidenceLifecycleMarker.source_id == sid)
    ]
    if trust_event_id is not None:
        clauses.append(EvidenceLifecycleMarker.trust_event_id == trust_event_id)
    markers = (
        db.query(EvidenceLifecycleMarker)
        .filter(or_(*clauses))
        .order_by(EvidenceLifecycleMarker.created_at.desc(), EvidenceLifecycleMarker.id.desc())
        .all()
    )
    if not markers:
        return None
    return sorted(markers, key=_marker_priority, reverse=True)[0]


def _decision_from_state(
    *,
    source_type: str,
    source_id: Any,
    state: str,
    resolution: Optional[str] = None,
    reason: str = "",
    marker: Optional[EvidenceLifecycleMarker] = None,
    related_source_type: Optional[str] = None,
    related_source_id: Optional[Any] = None,
    related_trust_event_id: Optional[int] = None,
) -> EvidenceLifecycleDecision:
    clean = state in CLEAN_CONSEQUENTIAL_STATES or (
        state in CONDITIONAL_CONSEQUENTIAL_STATES and resolution == RESOLUTION_UPHELD
    )
    lifecycle_labeled_public = state not in {NOT_MEASURED_YET}
    decision_pack_usable = lifecycle_labeled_public and state not in {REVOKED, EXPIRED}
    caution = (state in NON_CLEAN_STATES) or (resolution in NEUTRAL_RESOLUTIONS) or resolution == RESOLUTION_REVERSED
    return EvidenceLifecycleDecision(
        source_type=source_type,
        source_id=_source_id(source_id),
        current_state=state,
        resolution=resolution,
        reason=reason,
        marker_id=getattr(marker, "id", None),
        related_source_type=related_source_type or getattr(marker, "related_source_type", None),
        related_source_id=_source_id(related_source_id) if related_source_id is not None else getattr(marker, "related_source_id", None),
        related_trust_event_id=related_trust_event_id or getattr(marker, "related_trust_event_id", None),
        usable_for_scoring=clean,
        usable_for_graph=clean,
        usable_for_public_evidence=lifecycle_labeled_public,
        usable_for_decision_pack=decision_pack_usable,
        requires_caution_label=caution,
    )


def create_lifecycle_marker(
    db: Session,
    *,
    source_type: str,
    source_id: Any,
    marker_type: str,
    state: str,
    resolution: Optional[str] = None,
    trust_event_id: Optional[int] = None,
    actor_user_id: Optional[int] = None,
    authority_type: Optional[str] = None,
    reason: Optional[str] = None,
    note: Optional[str] = None,
    related_source_type: Optional[str] = None,
    related_source_id: Optional[Any] = None,
    related_trust_event_id: Optional[int] = None,
    meta: Optional[dict[str, Any]] = None,
) -> EvidenceLifecycleMarker:
    _validate_marker(marker_type, state, resolution)
    marker = EvidenceLifecycleMarker(
        source_type=source_type,
        source_id=_source_id(source_id),
        trust_event_id=trust_event_id,
        marker_type=marker_type,
        state=state,
        resolution=resolution,
        actor_user_id=actor_user_id,
        authority_type=authority_type,
        reason=reason,
        note=note,
        related_source_type=related_source_type,
        related_source_id=_source_id(related_source_id) if related_source_id is not None else None,
        related_trust_event_id=related_trust_event_id,
        meta=meta,
    )
    db.add(marker)
    db.flush()
    return marker


def _decision_from_marker(marker: EvidenceLifecycleMarker, *, source_type: str, source_id: Any) -> EvidenceLifecycleDecision:
    return _decision_from_state(
        source_type=source_type,
        source_id=source_id,
        state=marker.state,
        resolution=marker.resolution,
        reason=marker.reason or f"Evidence lifecycle marker: {marker.marker_type}",
        marker=marker,
    )


def _find_identity_correction(db: Session, event: TrustEvent) -> Optional[EvidenceLifecycleDecision]:
    meta = _event_meta(event)
    check_id = meta.get("verification_check_id") or meta.get("identity_verification_check_id")
    if not check_id:
        return None
    later = db.query(TrustEvent).filter(TrustEvent.id > event.id)
    later = later.filter(TrustEvent.subject_user_id == event.subject_user_id)
    if event.event_type == "identity.photo_evidence_verified":
        reversal = (
            later.filter(TrustEvent.event_type == "identity.photo_evidence_verified_reversed")
            .order_by(TrustEvent.id.desc())
            .all()
        )
        for row in reversal:
            if _event_meta(row).get("verification_check_id") == check_id:
                return _decision_from_state(
                    source_type=SOURCE_TRUST_EVENT,
                    source_id=event.id,
                    state=REVERSED,
                    resolution=RESOLUTION_REVERSED,
                    reason="Identity photo evidence was later reversed for the same verification check.",
                    related_trust_event_id=row.id,
                )
    if event.event_type == "identity.photo_evidence_rejected":
        correction = (
            later.filter(TrustEvent.event_type == "identity.photo_evidence_review_corrected")
            .order_by(TrustEvent.id.desc())
            .all()
        )
        for row in correction:
            if _event_meta(row).get("verification_check_id") == check_id:
                return _decision_from_state(
                    source_type=SOURCE_TRUST_EVENT,
                    source_id=event.id,
                    state=CORRECTED,
                    reason="Identity photo evidence was later corrected for the same verification check.",
                    related_trust_event_id=row.id,
                )
    return None


def _find_financial_reversal(db: Session, event: TrustEvent) -> Optional[EvidenceLifecycleDecision]:
    if event.event_type not in REPAYMENT_EVIDENCE_EVENT_TYPES:
        return None
    if not event.loan_id:
        return None
    if event.event_type in FULL_REPAYMENT_EVENT_TYPES:
        reversal_types = {"loan_fully_repaid_reversed"}
    elif event.event_type in GUARANTOR_SUCCESS_EVENT_TYPES:
        reversal_types = {"guarantor_success_reversed"}
    else:
        reversal_types = {"repayment.reversed"}
    rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == event.loan_id)
        .filter(TrustEvent.id > event.id)
        .filter(TrustEvent.event_type.in_(reversal_types))
        .order_by(TrustEvent.id.desc())
        .all()
    )
    for row in rows:
        meta = _event_meta(row)
        reverses_event_id = meta.get("reverses_event_id") or meta.get("reversed_trust_event_id")
        if reverses_event_id is not None and str(reverses_event_id) != str(event.id):
            continue
        return _decision_from_state(
            source_type=SOURCE_TRUST_EVENT,
            source_id=event.id,
            state=REVERSED,
            resolution=RESOLUTION_REVERSED,
            reason="A later financial reversal targets this evidence or its loan context.",
            related_source_type=SOURCE_LOAN,
            related_source_id=event.loan_id,
            related_trust_event_id=row.id,
        )
    return None


def _loan_context_decision(db: Session, event: TrustEvent) -> Optional[EvidenceLifecycleDecision]:
    if not event.loan_id or event.event_type in LIFECYCLE_EVENT_TYPES:
        return None
    loan = db.get(Loan, event.loan_id)
    if loan is None:
        return _decision_from_state(
            source_type=SOURCE_TRUST_EVENT,
            source_id=event.id,
            state=NOT_MEASURED_YET,
            reason="Loan context could not be resolved; system uncertainty is not human adverse evidence.",
            related_source_type=SOURCE_LOAN,
            related_source_id=event.loan_id,
        )
    if loan.status == "disputed":
        return _decision_from_state(
            source_type=SOURCE_TRUST_EVENT,
            source_id=event.id,
            state=DISPUTED,
            resolution=RESOLUTION_UNRESOLVED,
            reason="Loan context is currently disputed; dispute is neutral until resolved.",
            related_source_type=SOURCE_LOAN,
            related_source_id=loan.id,
        )
    if loan.status in {"cancelled", "void", "revoked"}:
        return _decision_from_state(
            source_type=SOURCE_TRUST_EVENT,
            source_id=event.id,
            state=REVOKED,
            reason="Loan context is no longer valid for current consequential use.",
            related_source_type=SOURCE_LOAN,
            related_source_id=loan.id,
        )
    return None


def _protected_trade_event_decision(db: Session, event: TrustEvent) -> Optional[EvidenceLifecycleDecision]:
    meta = _event_meta(event)
    trade_id = meta.get("trade_id") or meta.get("protected_trade_id")
    if not trade_id:
        return None
    trade = db.get(ProtectedTradeRecord, int(trade_id)) if str(trade_id).isdigit() else None
    if trade is None:
        return _decision_from_state(
            source_type=SOURCE_TRUST_EVENT,
            source_id=event.id,
            state=NOT_MEASURED_YET,
            reason="Protected Trade context could not be resolved; system uncertainty is not human adverse evidence.",
            related_source_type=SOURCE_PROTECTED_TRADE,
            related_source_id=trade_id,
        )
    return _protected_trade_decision(trade)


def _protected_trade_decision(trade: ProtectedTradeRecord) -> EvidenceLifecycleDecision:
    dispute_status = getattr(trade, "dispute_status", None)
    status = getattr(trade, "status", None)
    if dispute_status in {"opened", "under_review", "open_note_added"}:
        return _decision_from_state(
            source_type=SOURCE_PROTECTED_TRADE,
            source_id=trade.id,
            state=DISPUTED,
            resolution=RESOLUTION_UNRESOLVED,
            reason="Protected Trade record has an unresolved dispute.",
        )
    if dispute_status in {"resolved", "closed"}:
        return _decision_from_state(
            source_type=SOURCE_PROTECTED_TRADE,
            source_id=trade.id,
            state=RESOLVED,
            resolution=RESOLUTION_UPHELD,
            reason="Protected Trade dispute is recorded as resolved; use only with its evidence context.",
        )
    if status in {"cancelled", "revoked", "void"}:
        return _decision_from_state(
            source_type=SOURCE_PROTECTED_TRADE,
            source_id=trade.id,
            state=REVOKED,
            reason="Protected Trade record is no longer valid for current consequential use.",
        )
    return _decision_from_state(
        source_type=SOURCE_PROTECTED_TRADE,
        source_id=trade.id,
        state=ACTIVE,
        reason="Protected Trade record has no lifecycle limiting marker.",
    )


def _trust_slip_decision(slip: TrustSlip) -> EvidenceLifecycleDecision:
    if slip.status in {"revoked", "frozen", "cancelled"}:
        return _decision_from_state(
            source_type=SOURCE_TRUST_SLIP,
            source_id=slip.id,
            state=REVOKED,
            reason="TrustSlip is revoked, frozen, or cancelled.",
        )
    if not slip.is_current or slip.superseded_by_trust_slip_id is not None:
        return _decision_from_state(
            source_type=SOURCE_TRUST_SLIP,
            source_id=slip.id,
            state=SUPERSEDED,
            reason="TrustSlip has been superseded by a later TrustSlip.",
            related_source_type=SOURCE_TRUST_SLIP,
            related_source_id=slip.superseded_by_trust_slip_id,
        )
    if slip.expires_at is not None:
        expires_at = slip.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < _now_utc():
            return _decision_from_state(
                source_type=SOURCE_TRUST_SLIP,
                source_id=slip.id,
                state=EXPIRED,
                reason="TrustSlip has expired.",
            )
    return _decision_from_state(
        source_type=SOURCE_TRUST_SLIP,
        source_id=slip.id,
        state=ACTIVE,
        reason="TrustSlip is current and active.",
    )


def resolve_trust_event_lifecycle(
    db: Session,
    event: TrustEvent,
    *,
    consumer: str = "generic",
) -> EvidenceLifecycleDecision:
    marker = _latest_marker_for_source(
        db,
        source_type=SOURCE_TRUST_EVENT,
        source_id=event.id,
        trust_event_id=event.id,
    )
    if marker is not None:
        return _decision_from_marker(marker, source_type=SOURCE_TRUST_EVENT, source_id=event.id)

    if event.event_type in REVERSAL_EVENT_TYPES:
        return EvidenceLifecycleDecision(
            source_type=SOURCE_TRUST_EVENT,
            source_id=_source_id(event.id),
            current_state=ACTIVE,
            resolution=None,
            reason="Lifecycle reversal marker event; not itself adverse human evidence.",
            related_source_type=SOURCE_LOAN if event.loan_id else None,
            related_source_id=_source_id(event.loan_id) if event.loan_id else None,
            usable_for_scoring=False,
            usable_for_graph=False,
            usable_for_public_evidence=True,
            usable_for_decision_pack=True,
            requires_caution_label=True,
        )
    if event.event_type in CORRECTION_EVENT_TYPES:
        return EvidenceLifecycleDecision(
            source_type=SOURCE_TRUST_EVENT,
            source_id=_source_id(event.id),
            current_state=ACTIVE,
            resolution=None,
            reason="Lifecycle correction marker event; not itself adverse human evidence.",
            usable_for_scoring=False,
            usable_for_graph=False,
            usable_for_public_evidence=True,
            usable_for_decision_pack=True,
            requires_caution_label=True,
        )
    if event.event_type in DISPUTE_EVENT_TYPES:
        return _decision_from_state(
            source_type=SOURCE_TRUST_EVENT,
            source_id=event.id,
            state=DISPUTED,
            resolution=RESOLUTION_UNRESOLVED,
            reason="Dispute marker; neutral until legitimately resolved.",
        )
    if event.event_type in RESOLUTION_EVENT_TYPES:
        resolution = _event_meta(event).get("resolution") or RESOLUTION_UNRESOLVED
        if resolution not in DISPUTE_RESOLUTIONS:
            resolution = RESOLUTION_UNRESOLVED
        return _decision_from_state(
            source_type=SOURCE_TRUST_EVENT,
            source_id=event.id,
            state=RESOLVED,
            resolution=resolution,
            reason="Dispute resolution marker; its resolution controls consequential use.",
        )

    for resolver in (_find_identity_correction, _find_financial_reversal, _loan_context_decision, _protected_trade_event_decision):
        decision = resolver(db, event)
        if decision is not None:
            return decision

    return _decision_from_state(
        source_type=SOURCE_TRUST_EVENT,
        source_id=event.id,
        state=ACTIVE,
        reason="No lifecycle limiting evidence was found.",
    )


def resolve_evidence_lifecycle(
    db: Session,
    *,
    source_type: str,
    source_id: Any,
    trust_event_id: Optional[int] = None,
    consumer: str = "generic",
) -> EvidenceLifecycleDecision:
    if source_type == SOURCE_TRUST_EVENT or trust_event_id is not None:
        event = db.get(TrustEvent, int(trust_event_id or source_id))
        if event is None:
            return _decision_from_state(
                source_type=SOURCE_TRUST_EVENT,
                source_id=trust_event_id or source_id,
                state=NOT_MEASURED_YET,
                reason="TrustEvent could not be resolved; unknown remains unknown.",
            )
        return resolve_trust_event_lifecycle(db, event, consumer=consumer)

    marker = _latest_marker_for_source(db, source_type=source_type, source_id=source_id)
    if marker is not None:
        return _decision_from_marker(marker, source_type=source_type, source_id=source_id)

    if source_type == SOURCE_REPAYMENT:
        repayment = db.get(Repayment, int(source_id)) if str(source_id).isdigit() else None
        if repayment is None:
            return _decision_from_state(
                source_type=SOURCE_REPAYMENT,
                source_id=source_id,
                state=NOT_MEASURED_YET,
                reason="Repayment could not be linked safely; unknown remains unknown.",
            )
        loan = db.get(Loan, repayment.loan_id)
        if loan is not None and loan.status == "disputed":
            return _decision_from_state(
                source_type=SOURCE_REPAYMENT,
                source_id=source_id,
                state=DISPUTED,
                resolution=RESOLUTION_UNRESOLVED,
                reason="Repayment belongs to a disputed loan context.",
                related_source_type=SOURCE_LOAN,
                related_source_id=loan.id,
            )
        return _decision_from_state(
            source_type=SOURCE_REPAYMENT,
            source_id=source_id,
            state=ACTIVE,
            reason="Repayment has no lifecycle limiting marker.",
        )

    if source_type == SOURCE_LOAN:
        loan = db.get(Loan, int(source_id)) if str(source_id).isdigit() else None
        if loan is None:
            return _decision_from_state(
                source_type=SOURCE_LOAN,
                source_id=source_id,
                state=NOT_MEASURED_YET,
                reason="Loan could not be resolved; unknown remains unknown.",
            )
        if loan.status == "disputed":
            return _decision_from_state(
                source_type=SOURCE_LOAN,
                source_id=source_id,
                state=DISPUTED,
                resolution=RESOLUTION_UNRESOLVED,
                reason="Loan is currently disputed.",
            )
        if loan.status in {"cancelled", "void", "revoked"}:
            return _decision_from_state(
                source_type=SOURCE_LOAN,
                source_id=source_id,
                state=REVOKED,
                reason="Loan is no longer valid for current consequential use.",
            )
        return _decision_from_state(
            source_type=SOURCE_LOAN,
            source_id=source_id,
            state=ACTIVE,
            reason="Loan has no lifecycle limiting marker.",
        )

    if source_type == SOURCE_PROTECTED_TRADE:
        trade = db.get(ProtectedTradeRecord, int(source_id)) if str(source_id).isdigit() else None
        if trade is None:
            return _decision_from_state(
                source_type=SOURCE_PROTECTED_TRADE,
                source_id=source_id,
                state=NOT_MEASURED_YET,
                reason="Protected Trade record could not be resolved; unknown remains unknown.",
            )
        return _protected_trade_decision(trade)

    if source_type == SOURCE_TRUST_SLIP:
        slip = db.get(TrustSlip, int(source_id)) if str(source_id).isdigit() else None
        if slip is None:
            return _decision_from_state(
                source_type=SOURCE_TRUST_SLIP,
                source_id=source_id,
                state=NOT_MEASURED_YET,
                reason="TrustSlip could not be resolved; unknown remains unknown.",
            )
        return _trust_slip_decision(slip)

    return _decision_from_state(
        source_type=source_type,
        source_id=source_id,
        state=NOT_MEASURED_YET,
        reason="No lifecycle interpreter exists for this source type yet.",
    )


def _source_marker_exists(
    db: Session,
    *,
    source_type: str,
    source_id: Any,
    marker_type: str,
) -> bool:
    q = (
        db.query(EvidenceLifecycleMarker)
        .filter(EvidenceLifecycleMarker.source_type == source_type)
        .filter(EvidenceLifecycleMarker.source_id == _source_id(source_id))
        .filter(EvidenceLifecycleMarker.marker_type == marker_type)
    )
    return db.query(q.exists()).scalar() is True


def backfill_deterministic_repayment_lifecycle_markers(
    db: Session,
    *,
    apply: bool = False,
    limit: int = 500,
) -> dict[str, Any]:
    safe_limit = max(1, min(int(limit), 5000))
    reversal_rows = (
        db.query(TrustEvent)
        .filter(TrustEvent.event_type.in_([
            "loan_fully_repaid_reversed",
            "guarantor_success_reversed",
            "repayment.reversed",
        ]))
        .order_by(TrustEvent.id.asc())
        .limit(safe_limit)
        .all()
    )

    stats = {
        "apply": bool(apply),
        "reversal_events_scanned": len(reversal_rows),
        "trust_event_markers_created": 0,
        "repayment_markers_created": 0,
        "already_marked": 0,
        "missing_target_event": 0,
        "ambiguous_repayment_linkage": 0,
        "not_measured_yet": 0,
    }

    for reversal in reversal_rows:
        meta = _event_meta(reversal)
        target_event_id = meta.get("reverses_event_id") or meta.get("reversed_trust_event_id")
        target_event = db.get(TrustEvent, int(target_event_id)) if str(target_event_id or "").isdigit() else None
        if target_event is None:
            stats["missing_target_event"] += 1
            continue

        if _source_marker_exists(
            db,
            source_type=SOURCE_TRUST_EVENT,
            source_id=target_event.id,
            marker_type=MARKER_REVERSAL,
        ):
            stats["already_marked"] += 1
        elif apply:
            create_lifecycle_marker(
                db,
                source_type=SOURCE_TRUST_EVENT,
                source_id=target_event.id,
                trust_event_id=target_event.id,
                marker_type=MARKER_REVERSAL,
                state=REVERSED,
                resolution=RESOLUTION_REVERSED,
                actor_user_id=getattr(reversal, "actor_user_id", None),
                authority_type="deterministic_backfill",
                reason="Backfilled from reversal TrustEvent with explicit reverses_event_id.",
                related_source_type=SOURCE_LOAN if getattr(target_event, "loan_id", None) else None,
                related_source_id=getattr(target_event, "loan_id", None),
                related_trust_event_id=reversal.id,
                meta={"backfill_source": "explicit_reverses_event_id"},
            )
            stats["trust_event_markers_created"] += 1
        else:
            stats["trust_event_markers_created"] += 1

        repayment_id = meta.get("repayment_id")
        repayment = None
        repayment_source = None
        if str(repayment_id or "").isdigit():
            repayment = db.get(Repayment, int(repayment_id))
            repayment_source = "explicit_repayment_id"
        elif getattr(target_event, "loan_id", None):
            repayments = db.query(Repayment).filter(Repayment.loan_id == int(target_event.loan_id)).all()
            if len(repayments) == 1:
                repayment = repayments[0]
                repayment_source = "single_repayment_on_target_loan"
            elif repayments:
                stats["ambiguous_repayment_linkage"] += 1
            else:
                stats["not_measured_yet"] += 1

        if repayment is None:
            continue
        if _source_marker_exists(
            db,
            source_type=SOURCE_REPAYMENT,
            source_id=repayment.id,
            marker_type=MARKER_REVERSAL,
        ):
            stats["already_marked"] += 1
            continue
        if apply:
            create_lifecycle_marker(
                db,
                source_type=SOURCE_REPAYMENT,
                source_id=repayment.id,
                marker_type=MARKER_REVERSAL,
                state=REVERSED,
                resolution=RESOLUTION_REVERSED,
                actor_user_id=getattr(reversal, "actor_user_id", None),
                authority_type="deterministic_backfill",
                reason="Backfilled from deterministic repayment reversal linkage.",
                related_source_type=SOURCE_TRUST_EVENT,
                related_source_id=target_event.id,
                related_trust_event_id=reversal.id,
                meta={"backfill_source": repayment_source},
            )
            stats["repayment_markers_created"] += 1
        else:
            stats["repayment_markers_created"] += 1

    if apply:
        db.flush()
    return stats


def filter_trust_events_for_consumer(
    db: Session,
    events: Iterable[TrustEvent],
    *,
    consumer: str,
) -> list[TrustEvent]:
    usable: list[TrustEvent] = []
    for event in events:
        decision = resolve_trust_event_lifecycle(db, event, consumer=consumer)
        if consumer == "trust_score" and decision.usable_for_scoring:
            usable.append(event)
        elif consumer == "trust_graph" and decision.usable_for_graph:
            usable.append(event)
        elif consumer == "decision_pack" and decision.usable_for_decision_pack:
            usable.append(event)
        elif consumer == "public_evidence" and decision.usable_for_public_evidence:
            usable.append(event)
    return usable
