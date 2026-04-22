from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.models import Base, Clan, ClanMembership, Loan, LoanGuarantor, User
from app.services.revenue_allocation_service import get_my_guarantor_earnings


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


def _seed_supported_loan(db, *, loan_status: str = "approved"):
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
        personal_pool_balance=Decimal("1000"),
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
        amount=Decimal("1000.00"),
        currency="NGN",
        status=loan_status,
        guarantors_required=1,
        service_fee=Decimal("100.00"),
        platform_revenue=Decimal("20.00"),
        guarantor_pool=Decimal("80.00"),
        paid_total=Decimal("0.00"),
        remaining_amount=Decimal("1000.00"),
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)

    row = LoanGuarantor(
        loan_id=loan.id,
        clan_id=clan.id,
        guarantor_user_id=guarantor.id,
        pledge_amount=Decimal("1000.00"),
        status="approved",
        is_locked=True,
        locked_amount=Decimal("1000.00"),
        released_amount=Decimal("0.00"),
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return clan, borrower, guarantor, loan, row


def test_guarantor_share_is_pending_until_loan_is_repaid(db):
    clan, _borrower, guarantor, _loan, row = _seed_supported_loan(db, loan_status="approved")

    result = get_my_guarantor_earnings(db, user_id=int(guarantor.id))

    assert result["total_estimated"] == "80.00"
    assert result["total_earned"] == "0.00"
    assert result["total_payable"] == "0.00"
    assert result["total_pending"] == "80.00"

    item = result["items"][0]
    assert item["clan_id"] == int(clan.id)
    assert item["loan_guarantor_id"] == int(row.id)
    assert item["share_amount"] == "80.00"
    assert item["estimated_amount"] == "80.00"
    assert item["payable_amount"] == "0.00"
    assert item["status"] == "pending"
    assert item["earning_status"] == "pending"


def test_guarantor_share_becomes_earned_after_full_repayment(db):
    _clan, _borrower, guarantor, loan, _row = _seed_supported_loan(db, loan_status="approved")

    loan.status = "repaid"
    loan.paid_total = Decimal("1000.00")
    loan.remaining_amount = Decimal("0.00")
    loan.repaid_at = datetime.now(timezone.utc)
    db.add(loan)
    db.commit()

    result = get_my_guarantor_earnings(db, user_id=int(guarantor.id))

    assert result["total_estimated"] == "80.00"
    assert result["total_earned"] == "80.00"
    assert result["total_payable"] == "80.00"
    assert result["total_pending"] == "0.00"
    assert result["items"][0]["status"] == "earned"
    assert result["items"][0]["payable_amount"] == "80.00"
