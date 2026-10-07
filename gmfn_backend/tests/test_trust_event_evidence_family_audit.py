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
        db.add_all([annotated, missing, invalid, unknown])
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
        db.commit()

        result = audit_trust_event_evidence_family_metadata(db, limit=10, sample_limit=10)

        assert result["mode"] == "read_only_audit"
        assert result["total_scanned"] == 4
        assert result["already_annotated"] == 1
        assert result["missing_inferable"] == 2
        assert result["missing_not_inferable"] == 1
        assert result["invalid_declared"] == 1
        assert result["by_existing_family"] == {"business_visibility": 1}
        assert result["by_inferred_family"] == {
            "business_analysis": 1,
            "demand_activity": 1,
        }
        assert result["by_unmapped_event_type"] == {"misc.pulse": 1}
        assert result["safe_to_apply"] is False
        assert all("reason" not in sample for sample in result["samples"])

        db.expire_all()
        persisted_missing = db.get(TrustEvent, missing.id)
        assert persisted_missing.meta == {"reason": "old demand row"}
    finally:
        db.close()
