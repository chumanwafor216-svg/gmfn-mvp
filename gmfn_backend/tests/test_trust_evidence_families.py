from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.trust_evidence_families import (
    EVIDENCE_FAMILY_SOURCE_DECLARED,
    EVIDENCE_FAMILY_SOURCE_INFERRED,
    PACK_EVIDENCE_FAMILY_FILTERS,
    PUBLIC_EVIDENCE_FAMILY_USES,
    annotate_trust_event_meta_with_evidence_family,
    public_member_activity_label,
    public_trust_event_evidence_family,
)
from app.db.models import Base, TrustEvent
from app.services.trust_events_services import log_trust_event


def test_public_trust_event_evidence_family_covers_dream_trustslip_behaviours():
    assert public_trust_event_evidence_family("spotlight.reposted") == "business_visibility"
    assert public_trust_event_evidence_family("demand_box.request_answered") == "demand_activity"
    assert public_trust_event_evidence_family("market_wisdom.analysis_opened") == "business_analysis"
    assert public_trust_event_evidence_family("commitment.completed") == "focus_commitment"
    assert public_trust_event_evidence_family("community.notice.acknowledged") == "community_responsiveness"
    assert public_trust_event_evidence_family("community.governance.neutral") == "leadership_governance"
    assert public_trust_event_evidence_family("trust_slip.shared") == "trust_document_activity"
    assert public_trust_event_evidence_family("feature.vault_subscription.activated") == "business_visibility"


def test_public_member_activity_label_uses_same_families_for_trustslip_summary():
    assert public_member_activity_label("spotlight.reposted") == "Business visibility"
    assert public_member_activity_label("demand_box.request_answered") == "DemandBox activity"
    assert public_member_activity_label("market_wisdom.analysis_opened") == "Business analysis"
    assert public_member_activity_label("commitment.completed") == "Focus commitments"
    assert public_member_activity_label("community.notice.acknowledged") == "Community response"
    assert public_member_activity_label("community.governance.neutral") == "Leadership and governance"
    assert public_member_activity_label("feature.vault_subscription.activated") == "Business visibility"


def test_pack_filters_include_pattern_families_without_turning_analysis_into_success():
    business = PACK_EVIDENCE_FAMILY_FILTERS["business_partnership"]
    for key in (
        "business_visibility",
        "demand_activity",
        "business_analysis",
        "focus_commitment",
        "community_responsiveness",
        "leadership_governance",
    ):
        assert key in business
    assert "not proof of success" in PUBLIC_EVIDENCE_FAMILY_USES["business_analysis"]


def test_explicit_evidence_family_metadata_overrides_event_type_inference():
    meta = {"evidence_family": "community_responsiveness"}

    assert public_trust_event_evidence_family("spotlight.reposted", meta) == "community_responsiveness"
    assert public_member_activity_label("spotlight.reposted", meta) == "Community response"


def test_logger_annotation_adds_evidence_family_without_claiming_success():
    inferred = annotate_trust_event_meta_with_evidence_family(
        event_type="market_wisdom.analysis_opened",
        meta={"reason": "member opened analysis"},
    )
    assert inferred is not None
    assert inferred["evidence_family"] == "business_analysis"
    assert inferred["evidence_family_source"] == EVIDENCE_FAMILY_SOURCE_INFERRED
    assert inferred["evidence_family_label"] == "Business analysis and Market Wisdom evidence"
    assert inferred["reason"] == "member opened analysis"

    declared = annotate_trust_event_meta_with_evidence_family(
        event_type="spotlight.reposted",
        meta={"evidence_family": "focus_commitment"},
    )
    assert declared is not None
    assert declared["evidence_family"] == "focus_commitment"
    assert declared["evidence_family_source"] == EVIDENCE_FAMILY_SOURCE_DECLARED


def test_log_trust_event_persists_evidence_family_metadata():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        event = log_trust_event(
            db,
            event_type="demand_box.request_answered",
            clan_id=None,
            actor_user_id=1,
            subject_user_id=1,
            meta={"reason": "member answered a demand"},
        )

        assert event.meta["evidence_family"] == "demand_activity"
        assert event.meta["evidence_family_source"] == EVIDENCE_FAMILY_SOURCE_INFERRED
        assert event.meta["evidence_family_label"] == "DemandBox and request-response evidence"
        assert event.meta["reason"] == "member answered a demand"
    finally:
        db.close()


def test_direct_trust_event_insert_is_annotated_by_model_listener():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        event = TrustEvent(
            event_type="spotlight.reposted",
            clan_id=None,
            actor_user_id=1,
            subject_user_id=1,
            meta={"reason": "shop owner reposted Spotlight"},
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        assert event.meta["evidence_family"] == "business_visibility"
        assert event.meta["evidence_family_source"] == EVIDENCE_FAMILY_SOURCE_INFERRED
        assert event.meta["evidence_family_label"] == "Business visibility and promotion effort"
        assert event.meta["reason"] == "shop owner reposted Spotlight"
    finally:
        db.close()