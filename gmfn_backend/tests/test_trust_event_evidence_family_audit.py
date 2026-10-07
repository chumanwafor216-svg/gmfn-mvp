from __future__ import annotations

import json

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.models import Base, TrustEvent
from app.services.trust_event_evidence_family_audit import (
    audit_trust_event_evidence_family_metadata,
)


def _db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return TestingSessionLocal()


def _event(event_type: str, meta: dict | None = None) -> TrustEvent:
    return TrustEvent(
        event_type=event_type,
        clan_id=None,
        actor_user_id=1,
        subject_user_id=1,
        meta=meta or {},
    )


def test_trust_event_evidence_family_audit_reports_historical_gaps_without_writing():
    db = _db()
    try:
        annotated = _event("spotlight.reposted")
        missing = _event("demand_box.request_answered")
        invalid = _event("market_wisdom.analysis_opened", {"evidence_family": "not_real"})
        unknown = _event("misc.pulse")
        conflict = _event("spotlight.reposted", {"evidence_family": "community_responsiveness"})
        explicit_signal_conflict = _event("spotlight.reposted")
        db.add_all([annotated, missing, invalid, unknown, conflict, explicit_signal_conflict])
        db.commit()

        # Simulate historical rows that existed before automatic annotation.
        db.execute(
            text("UPDATE trust_events SET meta_json = :meta WHERE id = :id"),
            {"id": missing.id, "meta": json.dumps({"reason": "old demand row"})},
        )
        db.execute(
            text("UPDATE trust_events SET meta_json = :meta WHERE id = :id"),
            {"id": invalid.id, "meta": json.dumps({"evidence_family": "not_real"})},
        )
        db.execute(
            text("UPDATE trust_events SET meta_json = :meta WHERE id = :id"),
            {"id": unknown.id, "meta": json.dumps({"reason": "unmapped"})},
        )
        db.execute(
            text("UPDATE trust_events SET meta_json = :meta WHERE id = :id"),
            {"id": conflict.id, "meta": json.dumps({"evidence_family": "community_responsiveness"})},
        )
        db.execute(
            text("UPDATE trust_events SET meta_json = :meta WHERE id = :id"),
            {
                "id": explicit_signal_conflict.id,
                "meta": json.dumps(
                    {
                        "evidence_family": "community_responsiveness",
                        "evidence_signal": "spotlight_or_repost",
                    }
                ),
            },
        )
        db.commit()

        result = audit_trust_event_evidence_family_metadata(db, limit=10, sample_limit=10)

        assert result["mode"] == "read_only_audit"
        assert result["total_scanned"] == 6
        assert result["already_annotated"] == 3
        assert result["missing_inferable"] == 2
        assert result["missing_not_inferable"] == 1
        assert result["invalid_declared"] == 1
        assert result["by_existing_family"] == {"business_visibility": 1, "community_responsiveness": 2}
        assert result["by_inferred_family"] == {
            "business_analysis": 1,
            "demand_activity": 1,
        }
        assert result["by_unmapped_event_type"] == {"misc.pulse": 1}
        assert result["signal_already_annotated"] == 1
        assert result["signal_missing_inferable"] == 2
        assert result["signal_missing_not_inferable"] == 1
        assert result["signal_invalid_declared"] == 0
        assert result["signal_family_conflict"] == 2
        assert result["by_existing_signal"] == {"spotlight_or_repost": 1}
        assert result["by_inferred_signal"] == {
            "demand_response": 1,
            "market_wisdom_review": 1,
        }
        assert result["by_unmapped_signal_event_type"] == {"misc.pulse": 1}
        assert result["by_signal_family_conflict"] == {"spotlight.reposted": 2}
        assert result["safe_to_apply"] is False
        actions = result["recommended_next_actions"]
        assert [action["key"] for action in actions] == [
            "review_signal_family_conflicts_before_backfill",
            "review_invalid_declared_metadata",
            "add_or_review_event_type_mappings",
            "prepare_dry_run_for_inferable_metadata",
        ]
        assert [action["count"] for action in actions] == [2, 1, 2, 4]
        assert [action["count_subject"] for action in actions] == [
            "signal_conflicts",
            "invalid_metadata_values",
            "unmapped_metadata_gaps",
            "inferable_metadata_gaps",
        ]
        assert actions[-1]["priority"] == "after_review"
        assert all("reason" in action for action in actions)
        assert all("reason" not in sample for sample in result["samples"])
        assert any(sample["signal_action"] == "would_add_or_correct_signal" for sample in result["samples"])
        assert any(sample["signal_action"] == "signal_family_conflict" for sample in result["samples"])
        assert any(
            sample["signal_action"] == "signal_family_conflict" and sample["raw_signal_present"]
            for sample in result["samples"]
        )

        db.expire_all()
        persisted_missing = db.get(TrustEvent, missing.id)
        assert persisted_missing.meta == {"reason": "old demand row"}
    finally:
        db.close()

def test_trust_event_evidence_family_audit_reads_community_domain_activity_metadata():
    db = _db()
    try:
        event = _event("community_domain.activity_recorded")
        db.add(event)
        db.commit()

        db.execute(
            text("UPDATE trust_events SET meta_json = :meta WHERE id = :id"),
            {
                "id": event.id,
                "meta": json.dumps(
                    {
                        "source": "community_domain_activity_catalogue_v1",
                        "activity_type": "leadership_duty",
                        "evidence_dimension": "leadership",
                        "activity_label": "Community role coordination",
                    }
                ),
            },
        )
        db.commit()

        result = audit_trust_event_evidence_family_metadata(db, limit=10, sample_limit=5)

        assert result["total_scanned"] == 1
        assert result["missing_inferable"] == 1
        assert result["signal_missing_inferable"] == 1
        assert result["by_inferred_family"] == {"leadership_governance": 1}
        assert result["by_inferred_signal"] == {"admin_or_leadership": 1}
        assert result["samples"][0]["inferred_family"] == "leadership_governance"
        assert result["samples"][0]["inferred_signal"] == "admin_or_leadership"
        assert result["safe_to_apply"] is False

        db.expire_all()
        persisted = db.get(TrustEvent, event.id)
        assert persisted.meta == {
            "source": "community_domain_activity_catalogue_v1",
            "activity_type": "leadership_duty",
            "evidence_dimension": "leadership",
            "activity_label": "Community role coordination",
        }
    finally:
        db.close()
