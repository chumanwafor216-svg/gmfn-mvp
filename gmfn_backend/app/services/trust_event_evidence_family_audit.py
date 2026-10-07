from __future__ import annotations

from collections import Counter
from typing import Any

from sqlalchemy.orm import Session

from app.core.trust_evidence_families import (
    ALL_EVIDENCE_FAMILY_LABELS,
    evidence_family_from_meta,
    infer_trust_event_evidence_family,
)
from app.db.models import TrustEvent


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
    Read-only audit for TrustEvent evidence-family metadata.

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
    samples: list[dict[str, Any]] = []
    already_annotated = 0
    missing_inferable = 0
    missing_not_inferable = 0
    invalid_declared = 0

    for row in rows:
        meta = _safe_meta(row)
        raw_family = meta.get("evidence_family")
        existing_family = evidence_family_from_meta(meta)
        inferred_family = infer_trust_event_evidence_family(getattr(row, "event_type", None))

        if existing_family:
            already_annotated += 1
            by_existing_family[existing_family] += 1
            continue

        if raw_family:
            invalid_declared += 1

        if inferred_family:
            missing_inferable += 1
            by_inferred_family[inferred_family] += 1
            action = "would_add_or_correct_family"
        else:
            missing_not_inferable += 1
            by_unmapped_event_type[str(getattr(row, "event_type", "") or "")] += 1
            action = "needs_event_mapping_review"

        if len(samples) < safe_sample_limit:
            samples.append(
                {
                    "id": int(getattr(row, "id", 0) or 0),
                    "event_type": str(getattr(row, "event_type", "") or ""),
                    "existing_family_valid": False,
                    "raw_family_present": bool(raw_family),
                    "inferred_family": inferred_family,
                    "inferred_label": ALL_EVIDENCE_FAMILY_LABELS.get(inferred_family or ""),
                    "action": action,
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
        "samples": samples,
        "safe_to_apply": False,
        "note": (
            "This is a read-only audit. It does not backfill historical rows and "
            "does not expose raw TrustEvent metadata. Any write job should be a separate, "
            "dry-run-first operation."
        ),
    }
