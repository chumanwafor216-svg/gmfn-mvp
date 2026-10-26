from __future__ import annotations

from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.models import Base, Clan, ClanMembership, Loan, LoanGuarantor, TrustEvent, User
from app.api.routes.repayment_claims import (
    create_repayment_claim,
    list_repayment_claims_admin,
)
from app.schemas.repayment_claims import RepaymentClaimCreate
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


def test_full_repayment_records_trust_evidence_and_releases_guarantor_lock(db):
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
    assert "guarantor_success" in event_types
    assert "loan.repaid" in event_types

    guarantor_success_event = (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan.id))
        .filter(TrustEvent.event_type == "guarantor_success")
        .one()
    )
    assert guarantor_success_event.subject_user_id == int(_guarantor.id)
    assert guarantor_success_event.guarantor_id == int(guarantor_row.id)
    assert guarantor_success_event.meta["reason"] == "loan_fully_repaid"

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

    from app.services.user_evidence_pack_pdf_service import build_user_evidence_pack_pdf
    import fitz

    borrower.gmfn_id = "GSN-U-REPAYMENT-EVIDENCE"
    borrower.trust_score = 74
    borrower.trust_band = "B"
    db.commit()

    pdf_bytes = build_user_evidence_pack_pdf(db, user_id=int(borrower.id), redact=True)
    with fitz.open(stream=pdf_bytes, filetype="pdf") as document:
        evidence_text = " ".join(" ".join(page.get_text().split()) for page in document)

    assert "Payment confirmed" in evidence_text
    assert "Full repayment recorded" in evidence_text
    assert "repayment.created" not in evidence_text
    assert "loan.repaid" not in evidence_text
    assert "GMFN-LR-1-1" not in evidence_text


def test_part_payment_claim_allows_next_instalment_after_confirmation(db):
    _clan, borrower, _guarantor, loan, _guarantor_row = _seed_approved_supported_loan(db)
    finance_admin = User(
        email="finance-admin@example.com",
        hashed_password="x",
        role="admin",
    )
    db.add(finance_admin)
    db.commit()
    db.refresh(finance_admin)

    payment_reference = f"GMFN-REPAY-LOAN-{loan.id}-U{borrower.id}"
    claim_payload = RepaymentClaimCreate(
        payment_reference=payment_reference,
        note="Repayment choice: Pay part | Amount declared: NGN 40.00",
    )

    first_claim = create_repayment_claim(
        loan_id=int(loan.id),
        payload=claim_payload,
        db=db,
        current_user=borrower,
    )
    duplicate_click = create_repayment_claim(
        loan_id=int(loan.id),
        payload=claim_payload,
        db=db,
        current_user=borrower,
    )

    assert first_claim["ok"] is True
    assert first_claim.get("already_claimed") is None
    assert duplicate_click["already_claimed"] is True
    pending_before_confirmation = list_repayment_claims_admin(
        db=db,
        current_user=finance_admin,
        limit=50,
    )
    assert pending_before_confirmation["total"] == 1
    assert (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan.id))
        .filter(TrustEvent.event_type == "repayment.claimed")
        .count()
        == 1
    )

    _repayment, updated_loan = create_repayment(
        db=db,
        loan_id=int(loan.id),
        payer=borrower,
        amount=Decimal("40.00"),
        payment_reference=claim_payload.payment_reference,
        confirmed_by_user_id=int(borrower.id),
    )
    pending_after_confirmation = list_repayment_claims_admin(
        db=db,
        current_user=finance_admin,
        limit=50,
    )
    second_claim = create_repayment_claim(
        loan_id=int(loan.id),
        payload=claim_payload,
        db=db,
        current_user=borrower,
    )

    assert updated_loan.status == "approved"
    assert updated_loan.paid_total == Decimal("40.00")
    assert updated_loan.remaining_amount == Decimal("60.00")
    assert pending_after_confirmation["total"] == 0
    assert second_claim["ok"] is True
    assert second_claim.get("already_claimed") is None
    pending_second_instalment = list_repayment_claims_admin(
        db=db,
        current_user=finance_admin,
        limit=50,
    )
    assert pending_second_instalment["total"] == 1
    assert pending_second_instalment["items"][0]["id"] != pending_before_confirmation["items"][0]["id"]
    assert (
        db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan.id))
        .filter(TrustEvent.event_type == "repayment.claimed")
        .count()
        == 2
    )


def test_repayment_claim_rejects_fully_repaid_loan(db):
    _clan, borrower, _guarantor, loan, _guarantor_row = _seed_approved_supported_loan(db)
    create_repayment(
        db=db,
        loan_id=int(loan.id),
        payer=borrower,
        amount=Decimal("100.00"),
        payment_reference=f"GMFN-REPAY-LOAN-{loan.id}-U{borrower.id}",
        confirmed_by_user_id=int(borrower.id),
    )

    with pytest.raises(HTTPException) as exc_info:
        create_repayment_claim(
            loan_id=int(loan.id),
            payload=RepaymentClaimCreate(
                payment_reference=f"GMFN-REPAY-LOAN-{loan.id}-U{borrower.id}",
                note="Duplicate report after closure",
            ),
            db=db,
            current_user=borrower,
        )

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Cannot claim repayment for a repaid loan"
