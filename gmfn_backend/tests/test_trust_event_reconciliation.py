from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.evidence_lifecycle import MARKER_REVERSAL, RESOLUTION_REVERSED, REVERSED, SOURCE_TRUST_EVENT
from app.db.models import Base, Clan, EvidenceLifecycleMarker, Loan, LoanGuarantor, TrustEvent, User
from app.services.evidence_lifecycle_service import create_lifecycle_marker
from app.services.trust_score_service import recompute_trust_for_user


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


def _seed_people(db):
    clan = Clan(name="Trust Event Reconciliation")
    borrower = User(email="borrower-reconcile@example.com", hashed_password="x", role="user")
    guarantor = User(email="guarantor-reconcile@example.com", hashed_password="x", role="user")
    admin = User(email="admin-reconcile@example.com", hashed_password="x", role="admin")
    db.add_all([clan, borrower, guarantor, admin])
    db.commit()
    return clan, borrower, guarantor, admin


def _loan(db, clan, borrower, *, status="repaid", amount="100.00", paid_total="100.00", remaining="0.00"):
    row = Loan(
        clan_id=clan.id,
        borrower_user_id=borrower.id,
        amount=Decimal(amount),
        currency="NGN",
        status=status,
        paid_total=Decimal(paid_total),
        remaining_amount=Decimal(remaining),
        guarantors_required=0,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _guarantor_row(db, clan, loan, guarantor):
    row = LoanGuarantor(
        loan_id=loan.id,
        clan_id=clan.id,
        guarantor_user_id=guarantor.id,
        pledge_amount=Decimal("100.00"),
        status="approved",
        is_locked=False,
        locked_amount=Decimal("0.00"),
        released_amount=Decimal("100.00"),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def _event(db, *, event_type, actor, subject, clan=None, loan=None, guarantor=None, meta=None):
    row = TrustEvent(
        event_type=event_type,
        clan_id=getattr(clan, "id", None),
        loan_id=getattr(loan, "id", None),
        guarantor_id=getattr(guarantor, "id", None),
        actor_user_id=actor.id,
        subject_user_id=subject.id,
        meta=meta or {},
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def test_canonical_full_repayment_counts_once(db):
    clan, borrower, _guarantor, _admin = _seed_people(db)
    loan = _loan(db, clan, borrower)
    _event(db, event_type="loan.repaid", actor=borrower, subject=borrower, clan=clan, loan=loan)

    result = recompute_trust_for_user(db, user_id=borrower.id)

    assert result["counts"]["full_repayments"] == 1
    assert result["gains"]["borrower"] == "0.10"
    assert result["score"] == "0.10"


def test_legacy_full_repayment_counts_only_with_sufficient_provenance(db):
    clan, borrower, _guarantor, _admin = _seed_people(db)
    loan = _loan(db, clan, borrower)
    _event(
        db,
        event_type="loan.repayment_confirmed",
        actor=borrower,
        subject=borrower,
        clan=clan,
        loan=loan,
        meta={"reason": "loan_fully_repaid"},
    )

    result = recompute_trust_for_user(db, user_id=borrower.id)

    assert result["counts"]["full_repayments"] == 1
    assert result["counts"]["contextual_legacy_full_repayments_counted"] == 1
    assert result["gains"]["borrower"] == "0.10"


def test_ambiguous_legacy_repayment_confirmation_is_preserved_but_not_scored(db):
    clan, borrower, _guarantor, _admin = _seed_people(db)
    _event(
        db,
        event_type="loan.repayment_confirmed",
        actor=borrower,
        subject=borrower,
        clan=clan,
        meta={"role": "borrower", "reason": "Repayment confirmed"},
    )

    result = recompute_trust_for_user(db, user_id=borrower.id)

    assert result["counts"]["full_repayments"] == 0
    assert result["counts"]["ambiguous_repayment_events_preserved"] == 1
    assert result["penalties"]["total"] == "0.00"
    assert result["score"] == "0.00"


@pytest.mark.parametrize(
    "event_type",
    [
        "repayment.created",
        "repayment.claimed",
        "repayment.schedule.created",
        "repayment.reversed",
    ],
)
def test_partial_progress_and_reversal_repayment_events_do_not_award_full_repayment(db, event_type):
    clan, borrower, _guarantor, _admin = _seed_people(db)
    loan = _loan(db, clan, borrower)
    _event(
        db,
        event_type=event_type,
        actor=borrower,
        subject=borrower,
        clan=clan,
        loan=loan,
        meta={"reason": "loan_fully_repaid"},
    )

    result = recompute_trust_for_user(db, user_id=borrower.id)

    assert result["counts"]["full_repayments"] == 0
    assert result["counts"]["partial_repayment_events_preserved"] == 1
    assert result["score"] == "0.00"


def test_canonical_and_legacy_same_loan_are_not_double_counted(db):
    clan, borrower, _guarantor, _admin = _seed_people(db)
    loan = _loan(db, clan, borrower)
    _event(
        db,
        event_type="loan.repayment_confirmed",
        actor=borrower,
        subject=borrower,
        clan=clan,
        loan=loan,
        meta={"reason": "loan_fully_repaid"},
    )
    _event(db, event_type="loan.repaid", actor=borrower, subject=borrower, clan=clan, loan=loan)

    result = recompute_trust_for_user(db, user_id=borrower.id)

    assert result["counts"]["full_repayments"] == 1
    assert result["counts"]["duplicate_outcome_events_skipped"] == 1
    assert result["gains"]["borrower"] == "0.10"


def test_three_distinct_completed_loans_count_as_thirty_points(db):
    clan, borrower, _guarantor, _admin = _seed_people(db)
    for _idx in range(3):
        loan = _loan(db, clan, borrower)
        _event(
            db,
            event_type="loan.repayment_confirmed",
            actor=borrower,
            subject=borrower,
            clan=clan,
            loan=loan,
            meta={"reason": "loan_fully_repaid"},
        )

    result = recompute_trust_for_user(db, user_id=borrower.id)

    assert result["counts"]["full_repayments"] == 3
    assert result["gains"]["borrower"] == "0.30"
    assert result["score"] == "0.30"


def test_guarantor_success_counts_once_and_release_alone_does_not(db):
    clan, borrower, guarantor, _admin = _seed_people(db)
    loan = _loan(db, clan, borrower)
    guarantor_row = _guarantor_row(db, clan, loan, guarantor)
    _event(
        db,
        event_type="guarantor_success",
        actor=borrower,
        subject=guarantor,
        clan=clan,
        loan=loan,
        guarantor=guarantor_row,
    )
    _event(
        db,
        event_type="guarantor_success",
        actor=borrower,
        subject=guarantor,
        clan=clan,
        loan=loan,
        guarantor=guarantor_row,
    )
    _event(
        db,
        event_type="guarantee.released",
        actor=borrower,
        subject=guarantor,
        clan=clan,
        loan=loan,
        guarantor=guarantor_row,
        meta={"reason": "loan_fully_repaid"},
    )

    result = recompute_trust_for_user(db, user_id=guarantor.id)

    assert result["counts"]["guarantor_success"] == 1
    assert result["counts"]["duplicate_outcome_events_skipped"] == 1
    assert result["gains"]["guarantor"] == "0.03"


@pytest.mark.parametrize("event_type", ["loan.defaulted", "loan_defaulted"])
def test_default_vocabularies_are_normalized(db, event_type):
    clan, borrower, _guarantor, _admin = _seed_people(db)
    loan = _loan(db, clan, borrower, status="defaulted", paid_total="0.00", remaining="100.00")
    _event(db, event_type=event_type, actor=borrower, subject=borrower, clan=clan, loan=loan)

    result = recompute_trust_for_user(db, user_id=borrower.id)

    assert result["counts"]["defaults"] == 1
    assert result["penalties"]["default"] == "0.70"


def test_lifecycle_limited_legacy_full_repayment_is_excluded(db):
    clan, borrower, _guarantor, admin = _seed_people(db)
    loan = _loan(db, clan, borrower)
    original = _event(
        db,
        event_type="loan.repayment_confirmed",
        actor=borrower,
        subject=borrower,
        clan=clan,
        loan=loan,
        meta={"reason": "loan_fully_repaid"},
    )
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
        reason="Legacy full repayment evidence was reversed.",
    )
    db.commit()

    result = recompute_trust_for_user(db, user_id=borrower.id)

    assert result["counts"]["full_repayments"] == 0
    assert result["counts"]["lifecycle_limited_events_excluded"] == 1
    assert result["score"] == "0.00"
    assert db.query(EvidenceLifecycleMarker).count() == 1
