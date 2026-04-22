from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.models import Base, Clan, ClanMembership, Loan, LoanGuarantor, TrustEvent, User
from app.services.repayments_service import create_repayment


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


def _seed_approved_supported_loan(db):
    clan = Clan(name="Aberdeen City")
    borrower = User(
        email="borrower@example.com",
        hashed_password="x",
        role="user",
        personal_pool_balance=Decimal("0"),
    )
    guarantor = User(
        email="guarantor@example.com",
        hashed_password="x",
        role="user",
        personal_pool_balance=Decimal("1000.00"),
    )
    db.add_all([clan, borrower, guarantor])
    db.commit()
    db.refresh(clan)
    db.refresh(borrower)
    db.refresh(guarantor)

    db.add_all(
        [
            ClanMembership(clan_id=clan.id, user_id=borrower.id, role="user"),
            ClanMembership(clan_id=clan.id, user_id=guarantor.id, role="user"),
        ]
    )
    db.commit()

    loan = Loan(
        clan_id=clan.id,
        borrower_user_id=borrower.id,
        amount=Decimal("100.00"),
        currency="NGN",
        status="approved",
        personal_pool_at_request=Decimal("0.00"),
        pool_used=Decimal("0.00"),
        guarantee_gap=Decimal("100.00"),
        guarantors_required=1,
        paid_total=Decimal("0.00"),
        remaining_amount=Decimal("100.00"),
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)

    guarantor_row = LoanGuarantor(
        loan_id=loan.id,
        clan_id=clan.id,
        guarantor_user_id=guarantor.id,
        pledge_amount=Decimal("100.00"),
        status="approved",
        is_locked=True,
        locked_amount=Decimal("100.00"),
        released_amount=Decimal("0.00"),
    )
    db.add(guarantor_row)
    db.commit()
    db.refresh(guarantor_row)

    return clan, borrower, guarantor, loan, guarantor_row


def test_full_repayment_records_trust_proof_and_releases_guarantor_lock(db):
    clan, borrower, _guarantor, loan, guarantor_row = _seed_approved_supported_loan(db)

    repayment, updated_loan = create_repayment(
        db=db,
        loan_id=int(loan.id),
        payer=borrower,
        amount=Decimal("100.00"),
        payment_reference="GMFN-LR-1-1",
        confirmed_by_user_id=int(borrower.id),
    )

    db.refresh(guarantor_row)

    assert repayment.amount == Decimal("100.00")
    assert updated_loan.status == "repaid"
    assert updated_loan.remaining_amount == Decimal("0.00")
    assert guarantor_row.is_locked is False
    assert guarantor_row.locked_amount == Decimal("0.00")
    assert guarantor_row.released_amount == Decimal("100.00")

    event_types = [
        row.event_type
        for row in db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan.id))
        .order_by(TrustEvent.id.asc())
        .all()
    ]
    assert "repayment.created" in event_types
    assert "guarantee.released" in event_types
    assert "loan.repaid" in event_types

    repaid_event = (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan.id))
        .filter(TrustEvent.event_type == "loan.repaid")
        .one()
    )
    assert repaid_event.clan_id == int(clan.id)
    assert repaid_event.meta["reason"] == "loan_fully_repaid"
    assert repaid_event.meta["payment_reference"] == "GMFN-LR-1-1"
    assert repaid_event.meta["confirmed_by_user_id"] == int(borrower.id)
