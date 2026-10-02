from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.evidence_lifecycle import (
    ACTIVE,
    DISPUTED,
    EXPIRED,
    MARKER_RESOLUTION,
    MARKER_REVERSAL,
    NOT_MEASURED_YET,
    RESOLUTION_INSUFFICIENT_EVIDENCE,
    RESOLUTION_REVERSED,
    RESOLUTION_SETTLED_WITHOUT_FINDING,
    RESOLUTION_UNRESOLVED,
    REVERSED,
    SOURCE_PROTECTED_TRADE,
    SOURCE_REPAYMENT,
    SOURCE_TRUST_EVENT,
    SOURCE_TRUST_SLIP,
    SUPERSEDED,
)
from app.db.models import Base, Clan, ClanMembership, EvidenceLifecycleMarker, Loan, ProtectedTradeRecord, Repayment, TrustEvent, TrustSlip, User
from app.api.routes.admin_repayment_reversals import reverse_confirmed_repayment_effects
from app.schemas.admin_repayment_reversal import AdminRepaymentReverseIn
from app.services.trust_score_service import recompute_trust_for_user
from app.services.trust_recompute_service import recompute_trust_for_user as legacy_recompute_trust_for_user
from app.services.trust_slip_decision_packs import build_decision_pack_private_evidence_extract
from app.services.evidence_lifecycle_service import (
    backfill_deterministic_repayment_lifecycle_markers,
    create_lifecycle_marker,
    filter_trust_events_for_consumer,
    resolve_evidence_lifecycle,
    resolve_trust_event_lifecycle,
)


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def _seed_user_clan_loan(db):
    clan = Clan(name="Lifecycle Clan")
    borrower = User(email="borrower-lifecycle@example.com", hashed_password="x", role="user")
    admin = User(email="admin-lifecycle@example.com", hashed_password="x", role="admin")
    db.add_all([clan, borrower, admin])
    db.commit()
    loan = Loan(
        clan_id=clan.id,
        borrower_user_id=borrower.id,
        amount=Decimal("100.00"),
        currency="NGN",
        status="repaid",
        paid_total=Decimal("100.00"),
        remaining_amount=Decimal("0.00"),
        guarantors_required=0,
    )
    db.add(loan)
    db.commit()
    return clan, borrower, admin, loan


def _trust_event(db, *, event_type, actor, subject, clan=None, loan=None, meta=None):
    event = TrustEvent(
        event_type=event_type,
        clan_id=getattr(clan, "id", None),
        loan_id=getattr(loan, "id", None),
        actor_user_id=getattr(actor, "id", None),
        subject_user_id=getattr(subject, "id", None),
        meta=meta or {},
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def test_explicit_reversal_marker_preserves_original_event_and_blocks_clean_use(db):
    clan, borrower, admin, loan = _seed_user_clan_loan(db)
    original = _trust_event(
        db,
        event_type="loan.repaid",
        actor=borrower,
        subject=borrower,
        clan=clan,
        loan=loan,
        meta={"reason": "loan_fully_repaid"},
    )
    reversal = _trust_event(
        db,
        event_type="loan_fully_repaid_reversed",
        actor=admin,
        subject=borrower,
        clan=clan,
        loan=loan,
        meta={"reverses_event_id": original.id},
    )
    marker = create_lifecycle_marker(
        db,
        source_type=SOURCE_TRUST_EVENT,
        source_id=original.id,
        trust_event_id=original.id,
        marker_type=MARKER_REVERSAL,
        state=REVERSED,
        resolution=RESOLUTION_REVERSED,
        actor_user_id=admin.id,
        authority_type="admin_review",
        reason="Repayment evidence reversed after admin review.",
        related_trust_event_id=reversal.id,
    )
    db.commit()

    decision = resolve_trust_event_lifecycle(db, original, consumer="trust_score")

    assert db.get(TrustEvent, original.id) is not None
    assert db.get(EvidenceLifecycleMarker, marker.id) is not None
    assert decision.current_state == REVERSED
    assert decision.usable_for_scoring is False
    assert decision.usable_for_graph is False
    assert decision.usable_for_decision_pack is True
    assert decision.requires_caution_label is True
    assert filter_trust_events_for_consumer(db, [original], consumer="trust_score") == []


def test_trust_score_uses_lifecycle_interpreted_inputs(db):
    clan, borrower, admin, loan = _seed_user_clan_loan(db)
    original = _trust_event(
        db,
        event_type="loan.repaid",
        actor=borrower,
        subject=borrower,
        clan=clan,
        loan=loan,
        meta={"reason": "loan_fully_repaid"},
    )

    before = recompute_trust_for_user(db, user_id=borrower.id)
    assert before["counts"]["full_repayments"] == 1

    create_lifecycle_marker(
        db,
        source_type=SOURCE_TRUST_EVENT,
        source_id=original.id,
        trust_event_id=original.id,
        marker_type=MARKER_REVERSAL,
        state=REVERSED,
        resolution=RESOLUTION_REVERSED,
        actor_user_id=admin.id,
        authority_type="admin_review",
        reason="Repayment evidence reversed after admin review.",
    )
    db.commit()

    after = recompute_trust_for_user(db, user_id=borrower.id)
    assert after["counts"]["full_repayments"] == 0
    assert after["counts"]["full_repayments_reversed"] == 0
    assert after["counts"]["lifecycle_limited_events_excluded"] == 1


def test_disputed_loan_context_is_neutral_and_not_clean_current_evidence(db):
    clan, borrower, admin, loan = _seed_user_clan_loan(db)
    event = _trust_event(
        db,
        event_type="loan.repaid",
        actor=borrower,
        subject=borrower,
        clan=clan,
        loan=loan,
    )
    loan.status = "disputed"
    db.add(loan)
    db.commit()

    decision = resolve_trust_event_lifecycle(db, event, consumer="trust_score")

    assert decision.current_state == DISPUTED
    assert decision.resolution == RESOLUTION_UNRESOLVED
    assert decision.usable_for_scoring is False
    assert decision.usable_for_graph is False
    assert decision.usable_for_public_evidence is True
    assert "neutral" in decision.reason


def test_resolution_without_finding_does_not_become_positive_or_negative_evidence(db):
    clan, borrower, admin, loan = _seed_user_clan_loan(db)
    event = _trust_event(
        db,
        event_type="loan.repaid",
        actor=borrower,
        subject=borrower,
        clan=clan,
        loan=loan,
    )
    for resolution in (RESOLUTION_INSUFFICIENT_EVIDENCE, RESOLUTION_SETTLED_WITHOUT_FINDING):
        create_lifecycle_marker(
            db,
            source_type=SOURCE_TRUST_EVENT,
            source_id=event.id,
            trust_event_id=event.id,
            marker_type=MARKER_RESOLUTION,
            state="resolved",
            resolution=resolution,
            actor_user_id=admin.id,
            authority_type="admin_review",
            reason=f"Resolution is {resolution}.",
        )
        db.commit()
        decision = resolve_trust_event_lifecycle(db, event, consumer="trust_score")
        assert decision.resolution == resolution
        assert decision.usable_for_scoring is False
        assert decision.usable_for_graph is False
        assert decision.requires_caution_label is True
        db.query(EvidenceLifecycleMarker).delete()
        db.commit()


def test_missing_repayment_linkage_is_not_measured_not_adverse(db):
    decision = resolve_evidence_lifecycle(
        db,
        source_type=SOURCE_REPAYMENT,
        source_id="missing-repayment-id",
        consumer="decision_pack",
    )

    assert decision.current_state == NOT_MEASURED_YET
    assert decision.usable_for_scoring is False
    assert decision.usable_for_graph is False
    assert decision.usable_for_public_evidence is False
    assert "unknown remains unknown" in decision.reason.lower()


def test_repayment_row_in_disputed_loan_context_is_not_clean_current_evidence(db):
    clan, borrower, _admin, loan = _seed_user_clan_loan(db)
    repayment = Repayment(loan_id=loan.id, payer_user_id=borrower.id, amount=Decimal("100.00"))
    db.add(repayment)
    db.commit()
    db.refresh(repayment)
    loan.status = "disputed"
    db.add(loan)
    db.commit()

    decision = resolve_evidence_lifecycle(
        db,
        source_type=SOURCE_REPAYMENT,
        source_id=repayment.id,
        consumer="decision_pack",
    )

    assert decision.current_state == DISPUTED
    assert decision.resolution == RESOLUTION_UNRESOLVED
    assert decision.usable_for_scoring is False
    assert decision.usable_for_decision_pack is True


def test_identity_photo_reversal_is_derived_without_rewriting_original_event(db):
    clan, subject, admin, _loan = _seed_user_clan_loan(db)
    verified = _trust_event(
        db,
        event_type="identity.photo_evidence_verified",
        actor=admin,
        subject=subject,
        clan=clan,
        meta={"verification_check_id": 44},
    )
    _trust_event(
        db,
        event_type="identity.photo_evidence_verified_reversed",
        actor=admin,
        subject=subject,
        clan=clan,
        meta={"verification_check_id": 44},
    )

    decision = resolve_trust_event_lifecycle(db, verified, consumer="trust_score")

    assert db.get(TrustEvent, verified.id) is not None
    assert decision.current_state == REVERSED
    assert decision.usable_for_scoring is False
    assert decision.related_trust_event_id is not None


def test_trust_slip_superseded_and_expired_are_lifecycle_limited(db):
    clan, holder, _admin, _loan = _seed_user_clan_loan(db)
    superseded = TrustSlip(
        code="TS-SUPERSEDED",
        clan_id=clan.id,
        holder_user_id=holder.id,
        trust_limit=Decimal("50.00"),
        currency="NGN",
        status="active",
        is_current=False,
        superseded_by_trust_slip_id=999,
    )
    expired = TrustSlip(
        code="TS-EXPIRED",
        clan_id=clan.id,
        holder_user_id=holder.id,
        trust_limit=Decimal("50.00"),
        currency="NGN",
        status="active",
        expires_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    db.add_all([superseded, expired])
    db.commit()

    superseded_decision = resolve_evidence_lifecycle(
        db,
        source_type=SOURCE_TRUST_SLIP,
        source_id=superseded.id,
        consumer="decision_pack",
    )
    expired_decision = resolve_evidence_lifecycle(
        db,
        source_type=SOURCE_TRUST_SLIP,
        source_id=expired.id,
        consumer="decision_pack",
    )

    assert superseded_decision.current_state == SUPERSEDED
    assert superseded_decision.usable_for_scoring is False
    assert expired_decision.current_state == EXPIRED
    assert expired_decision.usable_for_scoring is False


def test_protected_trade_dispute_and_active_states_are_interpreted(db):
    clan, seller, buyer, _loan = _seed_user_clan_loan(db)
    trade = ProtectedTradeRecord(
        trade_code="PT-LIFE-1",
        clan_id=clan.id,
        creator_user_id=seller.id,
        seller_user_id=seller.id,
        buyer_user_id=buyer.id,
        item_title="Lifecycle item",
        amount=Decimal("10.00"),
        currency="NGN",
        status="active",
        dispute_status="opened",
    )
    db.add(trade)
    db.commit()
    db.refresh(trade)

    disputed = resolve_evidence_lifecycle(
        db,
        source_type=SOURCE_PROTECTED_TRADE,
        source_id=trade.id,
        consumer="decision_pack",
    )
    trade.dispute_status = "none"
    db.add(trade)
    db.commit()
    active = resolve_evidence_lifecycle(
        db,
        source_type=SOURCE_PROTECTED_TRADE,
        source_id=trade.id,
        consumer="decision_pack",
    )

    assert disputed.current_state == DISPUTED
    assert disputed.usable_for_scoring is False
    assert disputed.usable_for_decision_pack is True
    assert active.current_state == ACTIVE
    assert active.usable_for_scoring is True


def test_admin_repayment_reversal_links_lifecycle_markers_when_repayment_is_known(db):
    clan, borrower, admin, loan = _seed_user_clan_loan(db)
    repayment = Repayment(loan_id=loan.id, payer_user_id=borrower.id, amount=Decimal("100.00"))
    db.add(repayment)
    db.commit()
    db.refresh(repayment)
    original = _trust_event(
        db,
        event_type="loan.repaid",
        actor=borrower,
        subject=borrower,
        clan=clan,
        loan=loan,
        meta={"reason": "loan_fully_repaid"},
    )

    response = reverse_confirmed_repayment_effects(
        loan_id=loan.id,
        payload=AdminRepaymentReverseIn(
            note="Admin reversal after correction",
            payment_reference="WP3A-REP-1",
            repayment_id=repayment.id,
        ),
        db=db,
        current_user=admin,
    )

    repayment_decision = resolve_evidence_lifecycle(
        db,
        source_type=SOURCE_REPAYMENT,
        source_id=repayment.id,
        consumer="decision_pack",
    )
    event_decision = resolve_trust_event_lifecycle(db, original, consumer="trust_score")

    assert response["repayment_lifecycle_linkage"] == "provided"
    assert response["repayment_lifecycle_marker_source_id"] == repayment.id
    assert repayment_decision.current_state == REVERSED
    assert repayment_decision.usable_for_scoring is False
    assert event_decision.current_state == REVERSED
    assert event_decision.usable_for_scoring is False
    assert db.get(Repayment, repayment.id) is not None
    assert db.get(TrustEvent, original.id) is not None
    assert db.get(Loan, loan.id).status == "disputed"


def test_decision_pack_separates_lifecycle_context_from_clean_counts(db):
    clan, borrower, admin, loan = _seed_user_clan_loan(db)
    db.add(ClanMembership(clan_id=clan.id, user_id=borrower.id, role="user"))
    slip = TrustSlip(
        code="TS-LIFE-CONTEXT",
        clan_id=clan.id,
        holder_user_id=borrower.id,
        trust_limit=Decimal("100.00"),
        currency="NGN",
        status="active",
    )
    db.add(slip)
    db.commit()
    clean = _trust_event(
        db,
        event_type="loan.repaid",
        actor=borrower,
        subject=borrower,
        clan=clan,
        loan=loan,
    )
    limited = _trust_event(
        db,
        event_type="loan.repaid",
        actor=borrower,
        subject=borrower,
        clan=clan,
        loan=loan,
    )
    create_lifecycle_marker(
        db,
        source_type=SOURCE_TRUST_EVENT,
        source_id=limited.id,
        trust_event_id=limited.id,
        marker_type=MARKER_REVERSAL,
        state=REVERSED,
        resolution=RESOLUTION_REVERSED,
        actor_user_id=admin.id,
        authority_type="admin_review",
        reason="Repayment evidence reversed after review.",
    )
    db.commit()

    extract = build_decision_pack_private_evidence_extract(
        db,
        slip=slip,
        context={"decision_pack_key": "housing_decision"},
    )

    finance_category = next(row for row in extract["categories"] if row["key"] == "finance_repayment")
    assert finance_category["evidence_count"] == 1
    context_row = next(row for row in extract["lifecycle_context"] if row["key"] == "finance_repayment_lifecycle_context")
    assert context_row["evidence_count"] == 1
    assert context_row["state_counts"][REVERSED] == 1
    assert context_row["dispute_neutral"] is True
    assert "hidden adverse score" in extract["lifecycle_context_boundary_note"]
    assert clean.id != limited.id


def test_legacy_recompute_delegates_to_canonical_lifecycle_aware_score(db):
    clan, borrower, admin, loan = _seed_user_clan_loan(db)
    event = _trust_event(
        db,
        event_type="loan.repaid",
        actor=borrower,
        subject=borrower,
        clan=clan,
        loan=loan,
    )
    create_lifecycle_marker(
        db,
        source_type=SOURCE_TRUST_EVENT,
        source_id=event.id,
        trust_event_id=event.id,
        marker_type=MARKER_REVERSAL,
        state=REVERSED,
        resolution=RESOLUTION_REVERSED,
        actor_user_id=admin.id,
        authority_type="admin_review",
        reason="Repayment evidence reversed after review.",
    )
    db.commit()

    canonical = recompute_trust_for_user(db, user_id=borrower.id)
    legacy = legacy_recompute_trust_for_user(db, user_id=borrower.id, limit=1)

    assert legacy.score == canonical["score"]
    assert legacy.band == canonical["trust_band"]
    assert legacy.breakdown["legacy_recompute_compatibility"]["source"] == "canonical_lifecycle_aware_trust_score_service"
    assert legacy.breakdown["legacy_recompute_compatibility"]["limit_applied"] is False
    assert legacy.breakdown["counts"]["lifecycle_limited_events_excluded"] == 1


def test_deterministic_repayment_backfill_only_marks_provable_linkage(db):
    clan, borrower, admin, loan = _seed_user_clan_loan(db)
    repayment = Repayment(loan_id=loan.id, payer_user_id=borrower.id, amount=Decimal("100.00"))
    db.add(repayment)
    db.commit()
    original = _trust_event(
        db,
        event_type="loan.repaid",
        actor=borrower,
        subject=borrower,
        clan=clan,
        loan=loan,
    )
    _trust_event(
        db,
        event_type="loan_fully_repaid_reversed",
        actor=admin,
        subject=borrower,
        clan=clan,
        loan=loan,
        meta={"reverses_event_id": original.id},
    )

    dry_run = backfill_deterministic_repayment_lifecycle_markers(db, apply=False)
    assert dry_run["trust_event_markers_created"] == 1
    assert dry_run["repayment_markers_created"] == 1
    assert db.query(EvidenceLifecycleMarker).count() == 0

    applied = backfill_deterministic_repayment_lifecycle_markers(db, apply=True)
    db.commit()
    assert applied["trust_event_markers_created"] == 1
    assert applied["repayment_markers_created"] == 1
    assert resolve_trust_event_lifecycle(db, original, consumer="trust_score").current_state == REVERSED
    assert resolve_evidence_lifecycle(db, source_type=SOURCE_REPAYMENT, source_id=repayment.id).current_state == REVERSED
