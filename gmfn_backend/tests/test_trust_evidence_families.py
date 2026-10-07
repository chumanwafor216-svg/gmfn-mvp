from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.trust_evidence_families import (
    ALL_EVIDENCE_FAMILY_LABELS,
    EVIDENCE_FAMILY_SOURCE_DECLARED,
    EVIDENCE_FAMILY_SOURCE_INFERRED,
    PACK_EVIDENCE_FAMILY_FILTERS,
    PUBLIC_EVIDENCE_FAMILY_LABELS,
    PUBLIC_EVIDENCE_FAMILY_USES,
    PUBLIC_EVIDENCE_SIGNAL_FAMILIES,
    PUBLIC_EVIDENCE_SIGNAL_LABELS,
    PUBLIC_EVIDENCE_SIGNAL_USES,
    evidence_signal_matches_family,
    public_trust_event_evidence_signal,
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
    assert public_trust_event_evidence_family("community.notice.availability_response") == "community_responsiveness"
    assert public_trust_event_evidence_family("community.notice.posted") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.notice.posted") == "community_responsiveness"
    assert public_trust_event_evidence_family("community.notice.review_decided") == "leadership_governance"
    assert public_trust_event_evidence_family("join_request.vote_recorded") == "leadership_governance"
    assert public_trust_event_evidence_family("join_request.qr_preapproval_matched") == "relationship_path"
    assert public_trust_event_evidence_family("community_domain.lifecycle_changed") == "leadership_governance"
    assert public_trust_event_evidence_family("community_domain.pilot_reservation_started") == "leadership_governance"
    assert public_trust_event_evidence_family("community.meeting.reminder_created") == "community_responsiveness"
    assert public_trust_event_evidence_family("community.meeting.summary_recorded") == "community_responsiveness"
    assert public_trust_event_evidence_family("community.meeting.attendance_checkin_recorded") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_confirmation.review_case_opened") == "leadership_governance"
    assert public_trust_event_evidence_family("community_confirmation.review_case_overdue") == "leadership_governance"
    assert public_trust_event_evidence_family("community_confirmation.review_case_resolved") == "leadership_governance"
    assert public_trust_event_evidence_family("community_confirmation.non_response_recorded") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_confirmation.requested") == "identity_membership"
    assert public_trust_event_evidence_family("community_confirmation.delivery_pool_prepared") == "identity_membership"
    assert public_trust_event_evidence_family("community_confirmation.outcome_recorded") == "identity_membership"
    assert public_trust_event_evidence_family("community_confirmation.request_expired") == "identity_membership"
    assert public_trust_event_evidence_family("community_confirmation.requester_notified") == "identity_membership"
    assert public_trust_event_evidence_family("community_confirmation.merchant_decision_recorded") == "service_trade"
    assert public_trust_event_evidence_family("community_confirmation.decision_status_updated") == "service_trade"
    assert public_trust_event_evidence_family("community_confirmation.decision_status_updated", {"issue_reported": True, "settled": False}) == "dispute_caution"
    assert public_trust_event_evidence_family("community_confirmation.contact_preference_updated") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_confirmation.policy_updated") == "leadership_governance"
    assert public_trust_event_evidence_family("community_confirmation.contact_eligibility_updated") == "leadership_governance"
    assert public_trust_event_evidence_family("community.governance.neutral") == "leadership_governance"
    assert public_trust_event_evidence_family("trust_slip.shared") == "trust_document_activity"
    assert public_trust_event_evidence_family("feature.vault_subscription.activated") == "business_visibility"
    assert public_trust_event_evidence_family("feature.community_domain_subscription.used") == "business_visibility"
    assert public_trust_event_evidence_family("community_domain.school_fee_expected_payment.created") == "focus_commitment"
    assert public_trust_event_evidence_family("community_domain.expected_payment_created") == "focus_commitment"
    assert public_trust_event_evidence_family("community_domain.payment_reminder_sent") == "focus_commitment"
    assert public_trust_event_evidence_family("community_domain.school_fee_payment_proof.logged") == "bank_payment"
    assert public_trust_event_evidence_family("community_domain.collection_instruction") == "leadership_governance"
    assert public_trust_event_evidence_family("community_domain.attendance_session.opened") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.attendance_checkin.recorded") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.attendance_parent_notification.logged") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.school_guardian_contact.recorded") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.response_channel.opened") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.response.recorded") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.beneficiary_outcome_recorded") == "community_participation"
    assert public_trust_event_evidence_family("community_domain.beneficiary_outcome_confirmation_requested") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.beneficiary_outcome_confirmation_delivery_prepared") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.beneficiary_outcome_confirmation_delivery_recorded") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.beneficiary_outcome_confirmation_delivery_receipt_corrected") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.beneficiary_outcome_provider_send_blocked") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.beneficiary_outcome_contact_consent_recorded") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.beneficiary_outcome_contact_consent_withdrawn") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.beneficiary_outcome_confirmation_response") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.beneficiary_outcome_response_recorded") == "community_responsiveness"
    assert public_trust_event_evidence_family("community_domain.beneficiary_outcome_correction_reviewed") == "leadership_governance"
    assert public_trust_event_evidence_family(
        "community.notice.acknowledged",
        {
            "source": "community_domain_activity_catalogue_v1",
            "activity_type": "leadership_duty",
            "evidence_dimension": "leadership",
        },
    ) == "community_responsiveness"
    assert public_trust_event_evidence_family(
        "community_domain.activity_recorded",
        {
            "source": "community_domain_activity_catalogue_v1",
            "activity_type": "leadership_duty",
            "evidence_dimension": "leadership",
        },
    ) == "leadership_governance"
    assert public_trust_event_evidence_family(
        "community_domain.activity_recorded",
        {
            "source": "community_domain_activity_catalogue_v1",
            "activity_type": "church_programme_attendance",
            "evidence_dimension": "participation",
        },
    ) == "community_responsiveness"
    assert public_trust_event_evidence_family(
        "community_domain.activity_recorded",
        {
            "source": "community_domain_activity_catalogue_v1",
            "activity_type": "volunteer_service",
            "evidence_dimension": "service",
        },
    ) == "community_participation"
    assert public_trust_event_evidence_family(
        "community_domain.activity_recorded",
        {
            "source": "community_domain_activity_catalogue_v1",
            "activity_type": "school_fee_follow_up",
            "evidence_dimension": "finance_follow_up",
        },
    ) == "focus_commitment"

def test_public_trust_event_evidence_signal_preserves_public_safe_subfamilies():
    assert public_trust_event_evidence_signal("spotlight.reposted") == "spotlight_or_repost"
    assert public_trust_event_evidence_signal("demand_box.request_answered") == "demand_response"
    assert public_trust_event_evidence_signal("market_wisdom.analysis_opened") == "market_wisdom_review"
    assert public_trust_event_evidence_signal("commitment.completed") == "commitment_completion"
    assert public_trust_event_evidence_signal("community.notice.acknowledged") == "notice_acknowledgement"
    assert public_trust_event_evidence_signal("community.notice.availability_response") == "notice_availability_response"
    assert public_trust_event_evidence_signal("community.notice.posted") == "notice_or_announcement_record"
    assert public_trust_event_evidence_signal("community_domain.notice.posted") == "notice_or_announcement_record"
    assert public_trust_event_evidence_signal("community.notice.submitted") == "notice_or_announcement_record"
    assert public_trust_event_evidence_signal("community.notice.review_decided") == "approval_or_review"
    assert public_trust_event_evidence_signal("join_request.vote_recorded") == "membership_vote_record"
    assert public_trust_event_evidence_signal("join_request.qr_preapproval_matched") == "join_preapproval_match_record"
    assert public_trust_event_evidence_signal("community_domain.lifecycle_changed") == "domain_lifecycle_record"
    assert public_trust_event_evidence_signal("community_domain.pilot_reservation_started") == "domain_pilot_reservation_record"
    assert public_trust_event_evidence_signal("community.meeting.reminder_created") == "meeting_reminder_record"
    assert public_trust_event_evidence_signal("community.meeting.summary_recorded") == "meeting_summary_record"
    assert public_trust_event_evidence_signal("community.meeting.attendance_checkin_recorded") == "attendance_or_meeting"
    assert public_trust_event_evidence_signal("community_confirmation.review_case_opened") == "approval_or_review"
    assert public_trust_event_evidence_signal("community_confirmation.review_case_overdue") == "approval_or_review"
    assert public_trust_event_evidence_signal("community_confirmation.review_case_resolved") == "approval_or_review"
    assert public_trust_event_evidence_signal("community_confirmation.response_recorded") == "community_response"
    assert public_trust_event_evidence_signal("community_confirmation.non_response_recorded") == "community_non_response_record"
    assert public_trust_event_evidence_signal("community_confirmation.requested") == "community_confirmation_request_record"
    assert public_trust_event_evidence_signal("community_confirmation.delivery_pool_prepared") == "community_confirmation_workflow_record"
    assert public_trust_event_evidence_signal("community_confirmation.outcome_recorded") == "community_confirmation_outcome_record"
    assert public_trust_event_evidence_signal("community_confirmation.request_expired") == "community_confirmation_expiry_record"
    assert public_trust_event_evidence_signal("community_confirmation.requester_notified") == "community_confirmation_workflow_record"
    assert public_trust_event_evidence_signal("community_confirmation.merchant_decision_recorded") == "community_confirmation_decision_record"
    assert public_trust_event_evidence_signal("community_confirmation.decision_status_updated") == "community_confirmation_decision_status_record"
    assert public_trust_event_evidence_signal("community_confirmation.decision_status_updated", {"issue_reported": True, "settled": False}) == "review_or_caution"
    assert public_trust_event_evidence_signal("community_confirmation.contact_preference_updated") == "community_confirmation_preference_record"
    assert public_trust_event_evidence_signal("community_confirmation.policy_updated") == "community_confirmation_policy_record"
    assert public_trust_event_evidence_signal("community_confirmation.contact_eligibility_updated") == "community_confirmation_contact_eligibility_record"
    assert public_trust_event_evidence_signal("community.governance.neutral") == "neutral_review"
    assert public_trust_event_evidence_signal("feature.vault_subscription.activated") == "platform_feature_activation"
    assert public_trust_event_evidence_signal("feature.community_domain_subscription.used") == "platform_feature_activation"
    assert public_trust_event_evidence_signal("community_domain.school_fee_expected_payment.created") == "expected_payment_record"
    assert public_trust_event_evidence_signal("community_domain.expected_payment_created") == "expected_payment_record"
    assert public_trust_event_evidence_signal("community_domain.payment_reminder_sent") == "payment_followup_record"
    assert public_trust_event_evidence_signal("community_domain.school_fee_payment_proof.logged") == "payment_proof_review_record"
    assert public_trust_event_evidence_signal("community_domain.collection_instruction") == "collection_instruction_record"
    assert public_trust_event_evidence_signal("community_domain.attendance_session.opened") == "attendance_session_record"
    assert public_trust_event_evidence_signal("community_domain.attendance_checkin.recorded") == "attendance_checkin_record"
    assert public_trust_event_evidence_signal("community_domain.attendance_parent_notification.logged") == "attendance_parent_notification_record"
    assert public_trust_event_evidence_signal("community_domain.school_guardian_contact.recorded") == "school_guardian_contact_record"
    assert public_trust_event_evidence_signal("community_domain.response_channel.opened") == "response_channel_record"
    assert public_trust_event_evidence_signal("community_domain.response.recorded") == "community_response"
    assert public_trust_event_evidence_signal("community_domain.beneficiary_outcome_recorded") == "beneficiary_outcome_record"
    assert public_trust_event_evidence_signal("community_domain.beneficiary_outcome_confirmation_requested") == "beneficiary_outcome_confirmation_request"
    assert public_trust_event_evidence_signal("community_domain.beneficiary_outcome_confirmation_delivery_prepared") == "beneficiary_outcome_delivery_record"
    assert public_trust_event_evidence_signal("community_domain.beneficiary_outcome_confirmation_delivery_recorded") == "beneficiary_outcome_delivery_record"
    assert public_trust_event_evidence_signal("community_domain.beneficiary_outcome_confirmation_delivery_receipt_corrected") == "beneficiary_outcome_delivery_record"
    assert public_trust_event_evidence_signal("community_domain.beneficiary_outcome_provider_send_blocked") == "beneficiary_outcome_delivery_blocked"
    assert public_trust_event_evidence_signal("community_domain.beneficiary_outcome_contact_consent_recorded") == "beneficiary_outcome_contact_consent_record"
    assert public_trust_event_evidence_signal("community_domain.beneficiary_outcome_contact_consent_withdrawn") == "beneficiary_outcome_contact_consent_withdrawal"
    assert public_trust_event_evidence_signal("community_domain.beneficiary_outcome_confirmation_response") == "beneficiary_outcome_response_record"
    assert public_trust_event_evidence_signal("community_domain.beneficiary_outcome_response_recorded") == "beneficiary_outcome_response_record"
    assert public_trust_event_evidence_signal("community_domain.beneficiary_outcome_correction_reviewed") == "beneficiary_outcome_correction_review"
    assert public_trust_event_evidence_signal(
        "community.notice.acknowledged",
        {
            "source": "community_domain_activity_catalogue_v1",
            "activity_type": "leadership_duty",
            "evidence_dimension": "leadership",
        },
    ) == "notice_acknowledgement"
    assert public_trust_event_evidence_signal(
        "community_domain.activity_recorded",
        {
            "source": "community_domain_activity_catalogue_v1",
            "activity_type": "leadership_duty",
            "evidence_dimension": "leadership",
        },
    ) == "admin_or_leadership"
    assert public_trust_event_evidence_signal(
        "community_domain.activity_recorded",
        {
            "source": "community_domain_activity_catalogue_v1",
            "activity_type": "church_programme_attendance",
            "evidence_dimension": "participation",
        },
    ) == "attendance_or_meeting"
    assert public_trust_event_evidence_signal(
        "community_domain.activity_recorded",
        {
            "source": "community_domain_activity_catalogue_v1",
            "activity_type": "volunteer_service",
            "evidence_dimension": "service",
        },
    ) == "community_participation_record"
    assert public_trust_event_evidence_signal(
        "community_domain.activity_recorded",
        {
            "source": "community_domain_activity_catalogue_v1",
            "activity_type": "school_fee_follow_up",
            "evidence_dimension": "finance_follow_up",
        },
    ) == "commitment_record"
    assert public_trust_event_evidence_signal(
        "spotlight.reposted",
        {
            "evidence_family": "community_responsiveness",
            "evidence_signal": "notice_acknowledgement",
        },
    ) == "notice_acknowledgement"
    assert public_trust_event_evidence_signal(
        "spotlight.reposted",
        {"evidence_signal": "notice_acknowledgement"},
    ) is None
    assert public_trust_event_evidence_signal(
        "spotlight.reposted",
        {
            "evidence_family": "community_responsiveness",
            "evidence_signal": "spotlight_or_repost",
        },
    ) is None


def test_evidence_signal_family_compatibility_prevents_misfiled_signal_rows():
    assert evidence_signal_matches_family("spotlight_or_repost", "business_visibility") is True
    assert evidence_signal_matches_family("notice_acknowledgement", "community_responsiveness") is True
    assert evidence_signal_matches_family("spotlight_or_repost", "community_responsiveness") is False



def test_public_evidence_signal_map_is_complete_and_uses_known_families():
    assert set(PUBLIC_EVIDENCE_SIGNAL_FAMILIES) == set(PUBLIC_EVIDENCE_SIGNAL_LABELS)
    assert set(PUBLIC_EVIDENCE_SIGNAL_USES) == set(PUBLIC_EVIDENCE_SIGNAL_LABELS)
    assert set(PUBLIC_EVIDENCE_SIGNAL_FAMILIES.values()).issubset(set(ALL_EVIDENCE_FAMILY_LABELS))


def test_public_member_activity_label_uses_same_families_for_trustslip_summary():
    assert public_member_activity_label("spotlight.reposted") == "Business visibility"
    assert public_member_activity_label("demand_box.request_answered") == "DemandBox activity"
    assert public_member_activity_label("market_wisdom.analysis_opened") == "Business analysis"
    assert public_member_activity_label("commitment.completed") == "Focus commitments"
    assert public_member_activity_label("community.notice.acknowledged") == "Community response"
    assert public_member_activity_label("community.governance.neutral") == "Leadership and governance"
    assert public_member_activity_label("feature.vault_subscription.activated") == "Business visibility"


def test_decision_pack_family_filters_reference_known_evidence_families():
    assert set(PUBLIC_EVIDENCE_FAMILY_USES) == set(PUBLIC_EVIDENCE_FAMILY_LABELS)
    for pack_key, families in PACK_EVIDENCE_FAMILY_FILTERS.items():
        assert families, f"{pack_key} must expose at least one evidence family"
        unknown = set(families) - set(ALL_EVIDENCE_FAMILY_LABELS)
        assert unknown == set(), f"{pack_key} references unknown evidence families: {sorted(unknown)}"

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
    assert inferred["evidence_signal"] == "market_wisdom_review"
    assert inferred["evidence_signal_label"] == "Market Wisdom or analysis review"
    assert inferred["reason"] == "member opened analysis"

    declared = annotate_trust_event_meta_with_evidence_family(
        event_type="spotlight.reposted",
        meta={"evidence_family": "focus_commitment"},
    )
    assert declared is not None
    assert declared["evidence_family"] == "focus_commitment"
    assert declared["evidence_family_source"] == EVIDENCE_FAMILY_SOURCE_DECLARED
    assert "evidence_signal" not in declared
    assert "evidence_signal_label" not in declared


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
        assert event.meta["evidence_signal"] == "demand_response"
        assert event.meta["reason"] == "member answered a demand"
    finally:
        db.close()


def test_log_trust_event_uses_community_domain_activity_metadata_for_evidence_signal():
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
            event_type="community_domain.activity_recorded",
            clan_id=None,
            actor_user_id=1,
            subject_user_id=1,
            meta={
                "source": "community_domain_activity_catalogue_v1",
                "activity_type": "leadership_duty",
                "evidence_dimension": "leadership",
                "activity_label": "Community role coordination",
                "trust_delta": "0.00",
            },
        )

        assert event.meta["evidence_family"] == "leadership_governance"
        assert event.meta["evidence_family_source"] == EVIDENCE_FAMILY_SOURCE_INFERRED
        assert event.meta["evidence_signal"] == "admin_or_leadership"
        assert event.meta["evidence_signal_label"] == "Admin or leadership action"
        assert event.meta["activity_label"] == "Community role coordination"
        assert event.meta["trust_delta"] == "0.00"
    finally:
        db.close()


def test_direct_trust_event_insert_does_not_persist_incompatible_inferred_signal():
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
            meta={
                "evidence_family": "community_responsiveness",
                "reason": "spotlight workflow was used to answer a community call",
            },
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        assert event.meta["evidence_family"] == "community_responsiveness"
        assert "evidence_signal" not in event.meta
        assert "evidence_signal_label" not in event.meta
        assert event.meta["reason"] == "spotlight workflow was used to answer a community call"
    finally:
        db.close()


def test_direct_trust_event_insert_rejects_explicit_signal_against_inferred_family():
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
            meta={
                "evidence_signal": "notice_acknowledgement",
                "reason": "producer supplied a signal that conflicts with the inferred family",
            },
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        assert event.meta["evidence_family"] == "business_visibility"
        assert event.meta["evidence_family_source"] == EVIDENCE_FAMILY_SOURCE_INFERRED
        assert "evidence_signal" not in event.meta
        assert "evidence_signal_label" not in event.meta
        assert event.meta["evidence_signal_conflict"] == "family_mismatch"
        assert event.meta["evidence_signal_rejected"] == "notice_acknowledgement"
        assert event.meta["evidence_signal_conflict_family"] == "business_visibility"
        assert event.meta["reason"] == "producer supplied a signal that conflicts with the inferred family"
    finally:
        db.close()

def test_direct_trust_event_insert_rejects_incompatible_explicit_signal():
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
            meta={
                "evidence_family": "community_responsiveness",
                "evidence_signal": "spotlight_or_repost",
                "reason": "producer supplied a conflicting derived signal",
            },
        )
        db.add(event)
        db.commit()
        db.refresh(event)

        assert event.meta["evidence_family"] == "community_responsiveness"
        assert "evidence_signal" not in event.meta
        assert "evidence_signal_label" not in event.meta
        assert event.meta["evidence_signal_conflict"] == "family_mismatch"
        assert event.meta["evidence_signal_rejected"] == "spotlight_or_repost"
        assert event.meta["evidence_signal_conflict_family"] == "community_responsiveness"
        assert event.meta["reason"] == "producer supplied a conflicting derived signal"
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
        assert event.meta["evidence_signal"] == "spotlight_or_repost"
        assert event.meta["reason"] == "shop owner reposted Spotlight"
    finally:
        db.close()