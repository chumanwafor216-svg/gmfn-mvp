from __future__ import annotations

from collections import Counter
from typing import Any

from sqlalchemy.orm import Session

from app.core.trust_evidence_families import (
    ALL_EVIDENCE_FAMILY_LABELS,
    PUBLIC_EVIDENCE_SIGNAL_LABELS,
    evidence_family_from_meta,
    evidence_signal_from_meta,
    infer_trust_event_evidence_family,
    infer_trust_event_evidence_signal,
    evidence_signal_matches_family,
)
from app.db.models import TrustEvent


def _recommended_next_actions(
    *,
    missing_inferable: int,
    missing_not_inferable: int,
    invalid_declared: int,
    signal_missing_inferable: int,
    signal_missing_not_inferable: int,
    signal_invalid_declared: int,
    signal_family_conflict: int,
) -> list[dict[str, Any]]:
    actions: list[dict[str, Any]] = []

    if signal_family_conflict:
        actions.append(
            {
                "key": "review_signal_family_conflicts_before_backfill",
                "priority": "review_first",
                "count": signal_family_conflict,
                "count_subject": "signal_conflicts",
                "reason": (
                    "Some evidence signals do not belong under the effective evidence "
                    "family. Review them before any signal normalization."
                ),
            }
        )

    invalid_total = invalid_declared + signal_invalid_declared
    if invalid_total:
        actions.append(
            {
                "key": "review_invalid_declared_metadata",
                "priority": "review_first",
                "count": invalid_total,
                "count_subject": "invalid_metadata_values",
                "reason": (
                    "Some rows carry declared evidence metadata that is not recognized "
                    "by the public evidence dictionary."
                ),
            }
        )

    unmapped_total = missing_not_inferable + signal_missing_not_inferable
    if unmapped_total:
        actions.append(
            {
                "key": "add_or_review_event_type_mappings",
                "priority": "map_before_backfill",
                "count": unmapped_total,
                "count_subject": "unmapped_metadata_gaps",
                "reason": (
                    "Some event types cannot yet be translated into an evidence family "
                    "or signal. Decide the mapping before normalization."
                ),
            }
        )

    inferable_total = missing_inferable + signal_missing_inferable
    if inferable_total:
        priority = "after_review" if actions else "ready_for_dry_run_planning"
        actions.append(
            {
                "key": "prepare_dry_run_for_inferable_metadata",
                "priority": priority,
                "count": inferable_total,
                "count_subject": "inferable_metadata_gaps",
                "reason": (
                    "Some metadata gaps can be normalized from known event types, but any write "
                    "job must be separate, dry-run-first, and explicitly approved."
                ),
            }
        )

    if not actions:
        actions.append(
            {
                "key": "no_metadata_action_required_for_scanned_rows",
                "priority": "none",
                "count": 0,
                "count_subject": "metadata_gaps",
                "reason": "No evidence-family or evidence-signal metadata gaps were found in the scanned rows.",
            }
        )

    return actions


def _safe_meta(row: TrustEvent) -> dict[str, Any]:
    meta = getattr(row, "meta", None)
    return meta if isinstance(meta, dict) else {}


def audit_trust_event_evidence_family_metadata(
    db: Session,
    *,
    limit: int = 1000,
    sample_limit: int = 20,
) -> dict[str, Any]:
    """
    Read-only audit for TrustEvent evidence-family and evidence-signal metadata.

    This intentionally does not return raw metadata, notes, actors, amounts, or
    references. It is for estimating historical normalization work before any
    write/backfill job is designed.
    """

    safe_limit = max(1, min(int(limit or 1000), 10000))
    safe_sample_limit = max(0, min(int(sample_limit or 0), 100))

    rows = (
        db.query(TrustEvent)
        .order_by(TrustEvent.id.desc())
        .limit(safe_limit)
        .all()
    )

    by_existing_family: Counter[str] = Counter()
    by_inferred_family: Counter[str] = Counter()
    by_unmapped_event_type: Counter[str] = Counter()
    by_existing_signal: Counter[str] = Counter()
    by_inferred_signal: Counter[str] = Counter()
    by_unmapped_signal_event_type: Counter[str] = Counter()
    by_signal_family_conflict: Counter[str] = Counter()
    samples: list[dict[str, Any]] = []
    already_annotated = 0
    missing_inferable = 0
    missing_not_inferable = 0
    invalid_declared = 0
    signal_already_annotated = 0
    signal_missing_inferable = 0
    signal_missing_not_inferable = 0
    signal_invalid_declared = 0
    signal_family_conflict = 0

    for row in rows:
        meta = _safe_meta(row)
        event_type = str(getattr(row, "event_type", "") or "")
        raw_family = meta.get("evidence_family")
        existing_family = evidence_family_from_meta(meta)
        inferred_family = infer_trust_event_evidence_family(event_type, meta)
        raw_signal = meta.get("evidence_signal")
        existing_signal = evidence_signal_from_meta(meta)
        inferred_signal = infer_trust_event_evidence_signal(event_type, meta)

        family_action = "none"
        if existing_family:
            already_annotated += 1
            by_existing_family[existing_family] += 1
            family_action = "already_has_family"
        else:
            if raw_family:
                invalid_declared += 1
            if inferred_family:
                missing_inferable += 1
                by_inferred_family[inferred_family] += 1
                family_action = "would_add_or_correct_family"
            else:
                missing_not_inferable += 1
                by_unmapped_event_type[event_type] += 1
                family_action = "needs_family_mapping_review"

        signal_action = "none"
        family_for_signal_check = existing_family or inferred_family
        if existing_signal:
            if family_for_signal_check and not evidence_signal_matches_family(existing_signal, family_for_signal_check):
                signal_family_conflict += 1
                by_signal_family_conflict[event_type] += 1
                signal_action = "signal_family_conflict"
            else:
                signal_already_annotated += 1
                by_existing_signal[existing_signal] += 1
                signal_action = "already_has_signal"
        else:
            if raw_signal:
                signal_invalid_declared += 1
            if inferred_signal and family_for_signal_check and not evidence_signal_matches_family(inferred_signal, family_for_signal_check):
                signal_family_conflict += 1
                by_signal_family_conflict[event_type] += 1
                signal_action = "signal_family_conflict"
            elif inferred_signal:
                signal_missing_inferable += 1
                by_inferred_signal[inferred_signal] += 1
                signal_action = "would_add_or_correct_signal"
            else:
                signal_missing_not_inferable += 1
                by_unmapped_signal_event_type[event_type] += 1
                signal_action = "needs_signal_mapping_review"

        if (family_action not in {"none", "already_has_family"} or signal_action not in {"none", "already_has_signal"}) and len(samples) < safe_sample_limit:
            samples.append(
                {
                    "id": int(getattr(row, "id", 0) or 0),
                    "event_type": event_type,
                    "existing_family_valid": bool(existing_family),
                    "raw_family_present": bool(raw_family),
                    "inferred_family": inferred_family,
                    "inferred_family_label": ALL_EVIDENCE_FAMILY_LABELS.get(inferred_family or ""),
                    "family_action": family_action,
                    "existing_signal_valid": bool(existing_signal),
                    "raw_signal_present": bool(raw_signal),
                    "inferred_signal": inferred_signal,
                    "inferred_signal_label": PUBLIC_EVIDENCE_SIGNAL_LABELS.get(inferred_signal or ""),
                    "signal_action": signal_action,
                }
            )

    return {
        "mode": "read_only_audit",
        "limit": safe_limit,
        "sample_limit": safe_sample_limit,
        "total_scanned": len(rows),
        "already_annotated": already_annotated,
        "missing_inferable": missing_inferable,
        "missing_not_inferable": missing_not_inferable,
        "invalid_declared": invalid_declared,
        "by_existing_family": dict(sorted(by_existing_family.items())),
        "by_inferred_family": dict(sorted(by_inferred_family.items())),
        "by_unmapped_event_type": dict(sorted(by_unmapped_event_type.items())),
        "signal_already_annotated": signal_already_annotated,
        "signal_missing_inferable": signal_missing_inferable,
        "signal_missing_not_inferable": signal_missing_not_inferable,
        "signal_invalid_declared": signal_invalid_declared,
        "signal_family_conflict": signal_family_conflict,
        "by_existing_signal": dict(sorted(by_existing_signal.items())),
        "by_inferred_signal": dict(sorted(by_inferred_signal.items())),
        "by_unmapped_signal_event_type": dict(sorted(by_unmapped_signal_event_type.items())),
        "by_signal_family_conflict": dict(sorted(by_signal_family_conflict.items())),
        "samples": samples,
        "recommended_next_actions": _recommended_next_actions(
            missing_inferable=missing_inferable,
            missing_not_inferable=missing_not_inferable,
            invalid_declared=invalid_declared,
            signal_missing_inferable=signal_missing_inferable,
            signal_missing_not_inferable=signal_missing_not_inferable,
            signal_invalid_declared=signal_invalid_declared,
            signal_family_conflict=signal_family_conflict,
        ),
        "safe_to_apply": False,
        "note": (
            "This is a read-only audit. It does not backfill historical rows and "
            "does not expose raw TrustEvent metadata. Any write job should be a separate, "
            "dry-run-first operation."
        ),
    }
