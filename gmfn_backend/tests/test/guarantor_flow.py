import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from decimal import Decimal
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.models import Base, User, Clan, ClanMembership, Loan, LoanGuarantor
from app.services.guarantor_service import update_loan_guarantor_status
from app.services.guarantor_expiry_service import expire_stale_support_loans
from app.services.repayments_service import create_repayment

TEST_DB_URL = "sqlite:///./test_guarantor_flow.db"


@pytest.fixture()
def db():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def seed_basic(db):
    clan = Clan(name="Test Clan")
    db.add(clan)
    db.commit()
    db.refresh(clan)

    borrower = User(email="b@example.com", hashed_password="x", role="user", personal_pool_balance=Decimal("0"))
    g1 = User(email="g1@example.com", hashed_password="x", role="user", personal_pool_balance=Decimal("50000"))
    g2 = User(email="g2@example.com", hashed_password="x", role="user", personal_pool_balance=Decimal("100000"))
    admin = User(email="a@example.com", hashed_password="x", role="admin", personal_pool_balance=Decimal("0"))
    db.add_all([borrower, g1, g2, admin])
    db.commit()
    for u in (borrower, g1, g2, admin):
        db.refresh(u)

    # Memberships (minimal)
    db.add_all([
        ClanMembership(clan_id=clan.id, user_id=borrower.id, role="user"),
        ClanMembership(clan_id=clan.id, user_id=g1.id, role="user"),
        ClanMembership(clan_id=clan.id, user_id=g2.id, role="user"),
        ClanMembership(clan_id=clan.id, user_id=admin.id, role="admin"),
    ])
    db.commit()

    loan = Loan(
        clan_id=clan.id,
        borrower_user_id=borrower.id,
        amount=Decimal("100000"),
        currency="NGN",
        status="pending",
        guarantors_required=2,
        guarantee_gap=Decimal("100000"),
        guarantor_pool=Decimal("0"),
        service_fee=Decimal("0"),
        net_disbursed_amount=Decimal("0"),
        platform_revenue=Decimal("0"),
        paid_total=Decimal("0"),
        remaining_amount=Decimal("100000"),
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)

    lg1 = LoanGuarantor(
        loan_id=loan.id,
        clan_id=clan.id,
        guarantor_user_id=g1.id,
        pledge_amount=Decimal("25000"),
        status="pending",
        is_locked=False,
        locked_amount=Decimal("0"),
        released_amount=Decimal("0"),
    )
    lg2 = LoanGuarantor(
        loan_id=loan.id,
        clan_id=clan.id,
        guarantor_user_id=g2.id,
        pledge_amount=Decimal("75000"),
        status="pending",
        is_locked=False,
        locked_amount=Decimal("0"),
        released_amount=Decimal("0"),
    )
    db.add_all([lg1, lg2])
    db.commit()
    db.refresh(lg1)
    db.refresh(lg2)

    return clan, borrower, g1, g2, admin, loan, lg1, lg2


def test_approve_locks_funds(db):
    clan, borrower, g1, g2, admin, loan, lg1, lg2 = seed_basic(db)

    result = update_loan_guarantor_status(
        db,
        loan_id=loan.id,
        clan_id=clan.id,
        loan_guarantor_id=lg1.id,
        new_status="approved",
        decided_by_user_id=admin.id,
    )
    assert result.status == "approved"
    db.refresh(g1)
    db.refresh(lg1)
    db.refresh(loan)
    assert g1.personal_pool_balance == Decimal("50000")
    assert lg1.is_locked is True
    assert lg1.locked_amount == Decimal("25000")
    assert loan.status == "incomplete"


def test_auto_approves_when_enough(db):
    clan, borrower, g1, g2, admin, loan, lg1, lg2 = seed_basic(db)

    update_loan_guarantor_status(
        db,
        loan_id=loan.id,
        clan_id=clan.id,
        loan_guarantor_id=lg1.id,
        new_status="approved",
        decided_by_user_id=admin.id,
    )
    result = update_loan_guarantor_status(
        db,
        loan_id=loan.id,
        clan_id=clan.id,
        loan_guarantor_id=lg2.id,
        new_status="approved",
        decided_by_user_id=admin.id,
    )

    assert result.status == "approved"
    db.refresh(loan)
    assert loan.status == "approved"
    db.refresh(lg1)
    db.refresh(lg2)
    assert lg1.locked_amount == Decimal("25000")
    assert lg2.locked_amount == Decimal("75000")


def test_release_returns_funds(db):
    clan, borrower, g1, g2, admin, loan, lg1, lg2 = seed_basic(db)

    update_loan_guarantor_status(
        db,
        loan_id=loan.id,
        clan_id=clan.id,
        loan_guarantor_id=lg1.id,
        new_status="approved",
        decided_by_user_id=admin.id,
    )
    update_loan_guarantor_status(
        db,
        loan_id=loan.id,
        clan_id=clan.id,
        loan_guarantor_id=lg2.id,
        new_status="approved",
        decided_by_user_id=admin.id,
    )

    create_repayment(
        db=db,
        loan_id=int(loan.id),
        payer=borrower,
        amount=Decimal("100000"),
        payment_reference="TEST-FULL-REPAYMENT",
        confirmed_by_user_id=int(admin.id),
    )

    db.refresh(g1)
    db.refresh(g2)
    db.refresh(lg1)
    db.refresh(lg2)
    db.refresh(loan)

    assert g1.personal_pool_balance == Decimal("50000")
    assert g2.personal_pool_balance == Decimal("100000")
    assert lg1.is_locked is False
    assert lg2.is_locked is False
    assert lg1.released_amount == Decimal("25000")
    assert lg2.released_amount == Decimal("75000")
    assert loan.status == "repaid"


def test_stale_incomplete_support_window_cancels_and_releases_locks(db):
    clan, borrower, g1, g2, admin, loan, lg1, lg2 = seed_basic(db)

    update_loan_guarantor_status(
        db,
        loan_id=loan.id,
        clan_id=clan.id,
        loan_guarantor_id=lg1.id,
        new_status="approved",
        decided_by_user_id=admin.id,
    )

    old = datetime.now(timezone.utc) - timedelta(hours=27)
    db.refresh(loan)
    db.refresh(lg1)
    db.refresh(lg2)
    loan.created_at = old
    lg1.created_at = old
    lg1.responded_at = old
    lg2.created_at = old
    db.commit()

    result = expire_stale_support_loans(
        db,
        clan_id=int(clan.id),
        response_hours=24,
        cancel_grace_hours=1,
    )

    db.refresh(loan)
    db.refresh(lg1)
    db.refresh(lg2)

    assert result["expired_guarantors"] == 1
    assert result["cancelled_loans"] == 1
    assert loan.status == "cancelled"
    assert lg1.is_locked is False
    assert lg1.locked_amount == Decimal("0")
    assert lg1.released_amount == Decimal("25000")
    assert lg2.status == "expired"


def test_recent_incomplete_support_window_expires_pending_without_releasing_early(db):
    clan, borrower, g1, g2, admin, loan, lg1, lg2 = seed_basic(db)

    update_loan_guarantor_status(
        db,
        loan_id=loan.id,
        clan_id=clan.id,
        loan_guarantor_id=lg1.id,
        new_status="approved",
        decided_by_user_id=admin.id,
    )

    old = datetime.now(timezone.utc) - timedelta(hours=24, minutes=30)
    db.refresh(loan)
    db.refresh(lg1)
    db.refresh(lg2)
    loan.created_at = old
    lg1.created_at = old
    lg1.responded_at = old
    lg2.created_at = old
    db.commit()

    result = expire_stale_support_loans(
        db,
        clan_id=int(clan.id),
        response_hours=24,
        cancel_grace_hours=1,
    )

    db.refresh(loan)
    db.refresh(lg1)
    db.refresh(lg2)

    assert result["expired_guarantors"] == 1
    assert result["cancelled_loans"] == 0
    assert loan.status == "incomplete"
    assert lg1.is_locked is True
    assert lg1.locked_amount == Decimal("25000")
    assert lg2.status == "expired"
