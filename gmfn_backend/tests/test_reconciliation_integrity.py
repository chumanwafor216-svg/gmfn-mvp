# tests/test_reconciliation_integrity.py
from __future__ import annotations

import json
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base as CoreBase
from app.db.database import Base as BankBase
from app.db.bank_models import BankEvent, ExpectedPayment
from app.db.models import Clan, ClanMembership, Loan, LoanGuarantor, PoolEvent, TrustEvent, User
from app.services.expected_payments_service import ensure_loan_repayment_expected_payment
from app.services.payment_instruction_service import (
    create_loan_repayment_instruction,
    create_pool_deposit_instruction,
)
from app.services.reconciliation_service import (
    create_bank_event,
    normalize_reference,
    reconcile_batch,
)


@pytest.fixture()
def db():
    """
    Self-contained SQLite in-memory DB shared across connections.

    - Deterministic
    - No reliance on dev gmfn.db
    - No reliance on project conftest fixtures
    """
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    CoreBase.metadata.create_all(bind=engine)
    BankBase.metadata.create_all(bind=engine)

    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def _insert_expected(
    db,
    *,
    clan_id: int,
    user_id: int,
    reference_display: str,
    amount: Decimal,
    currency: str = "NGN",
    expected_type: str = "contribution",
) -> ExpectedPayment:
    ep = ExpectedPayment(
        clan_id=int(clan_id),
        user_id=int(user_id),
        expected_type=expected_type,
        amount=amount.quantize(Decimal("0.01")),
        currency=(currency or "").upper(),
        due_at=None,
        reference_display=reference_display,
        reference_normalized=normalize_reference(reference_display) or reference_display,
        status="expected",
        status_reason=None,
        bank_event_id=None,
        trust_event_id=None,
        meta_json=None,
    )
    db.add(ep)
    db.commit()
    db.refresh(ep)
    return ep


def _seed_supported_loan_for_reconciliation(db):
    clan = Clan(name="Repayment Proof Clan")
    borrower = User(
        email="repayment-borrower@example.com",
        hashed_password="x",
        role="user",
        personal_pool_balance=Decimal("0.00"),
    )
    guarantor = User(
        email="repayment-guarantor@example.com",
        hashed_password="x",
        role="user",
        personal_pool_balance=Decimal("500.00"),
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

    return clan, borrower, loan, guarantor_row


def test_reconciliation_determinism_idempotency_and_clan_isolation(db):
    """
    Phase 1 Integrity Test:
    - determinism: same inputs -> same outputs
    - idempotency: reconcile twice -> no drift
    - clan isolation: no cross-clan linking

    Scenario:
    - Two clans (1 and 2) use the same human reference string "GMFN-1234"
    - Each clan has its own ExpectedPayment
    - We ingest one BankEvent per clan with the same reference and same amount/currency
    - Reconcile twice
    - Assert each BankEvent links ONLY to its own clan's ExpectedPayment
    """
    ref = "GMFN-1234"
    ref_norm = normalize_reference(ref)
    assert ref_norm == "GMFN-1234"

    # Create expected payments in BOTH clans using the same reference string
    ep1 = _insert_expected(db, clan_id=1, user_id=10, reference_display=ref, amount=Decimal("10.00"), currency="NGN")
    ep2 = _insert_expected(db, clan_id=2, user_id=20, reference_display=ref, amount=Decimal("10.00"), currency="NGN")

    # Ingest one bank event per clan (same ref/amount/currency)
    be1 = create_bank_event(
        db,
        clan_id=1,
        source_type="statement_csv",
        source_id="fileA",
        direction="credit",
        amount=Decimal("10.00"),
        currency="NGN",
        reference_raw=ref,
        description_raw="test clan 1",
        bank_txn_id="TXN-CLAN1",
        posted_at=None,
        value_at=None,
        meta={"t": "c1"},
    )

    be2 = create_bank_event(
        db,
        clan_id=2,
        source_type="statement_csv",
        source_id="fileB",
        direction="credit",
        amount=Decimal("10.00"),
        currency="NGN",
        reference_raw=ref,
        description_raw="test clan 2",
        bank_txn_id="TXN-CLAN2",
        posted_at=None,
        value_at=None,
        meta={"t": "c2"},
    )

    # Sanity before reconcile
    assert be1.clan_id == 1
    assert be2.clan_id == 2
    assert be1.reference_normalized == ref_norm
    assert be2.reference_normalized == ref_norm
    assert (be1.status or "").lower() in {"detected", "pending_match", "confirmed"}
    assert (be2.status or "").lower() in {"detected", "pending_match", "confirmed"}

    # Run reconcile for each clan
    s1_first = reconcile_batch(db, clan_id=1, limit=50)
    s2_first = reconcile_batch(db, clan_id=2, limit=50)

    # Re-load from DB after reconcile
    be1_after = db.query(BankEvent).filter(BankEvent.id == be1.id).one()
    be2_after = db.query(BankEvent).filter(BankEvent.id == be2.id).one()
    ep1_after = db.query(ExpectedPayment).filter(ExpectedPayment.id == ep1.id).one()
    ep2_after = db.query(ExpectedPayment).filter(ExpectedPayment.id == ep2.id).one()

    # Assert confirmed linkage is correct and clan-isolated
    assert (be1_after.status or "").lower() == "confirmed"
    assert (be2_after.status or "").lower() == "confirmed"

    assert be1_after.expected_payment_id == ep1_after.id
    assert be2_after.expected_payment_id == ep2_after.id

    assert ep1_after.bank_event_id == be1_after.id
    assert ep2_after.bank_event_id == be2_after.id

    # Critical clan isolation assertion: ensure no cross-linking happened
    assert be1_after.expected_payment_id != ep2_after.id
    assert be2_after.expected_payment_id != ep1_after.id
    assert ep1_after.clan_id == 1
    assert ep2_after.clan_id == 2

    # Run reconcile again (idempotency + determinism)
    s1_second = reconcile_batch(db, clan_id=1, limit=50)
    s2_second = reconcile_batch(db, clan_id=2, limit=50)

    be1_again = db.query(BankEvent).filter(BankEvent.id == be1.id).one()
    be2_again = db.query(BankEvent).filter(BankEvent.id == be2.id).one()
    ep1_again = db.query(ExpectedPayment).filter(ExpectedPayment.id == ep1.id).one()
    ep2_again = db.query(ExpectedPayment).filter(ExpectedPayment.id == ep2.id).one()

    # No drift: links remain the same
    assert (be1_again.status or "").lower() == "confirmed"
    assert (be2_again.status or "").lower() == "confirmed"
    assert be1_again.expected_payment_id == ep1_again.id
    assert be2_again.expected_payment_id == ep2_again.id
    assert ep1_again.bank_event_id == be1_again.id
    assert ep2_again.bank_event_id == be2_again.id

    # Stats should be stable-ish (we only require no negative drift)
    assert s1_first["clan_id"] == 1
    assert s2_first["clan_id"] == 2
    assert s1_second["clan_id"] == 1
    assert s2_second["clan_id"] == 2


def test_create_bank_event_idempotent_by_hash(db):
    """
    Ingestion idempotency:
    create_bank_event called twice with same deterministic fields -> same row returned (via unique hash).
    """
    ref = "GMFN-7777"

    a = create_bank_event(
        db,
        clan_id=1,
        source_type="statement_csv",
        source_id="fileX",
        direction="credit",
        amount=Decimal("5.00"),
        currency="NGN",
        reference_raw=ref,
        description_raw="idem test",
        bank_txn_id="TXN-IDEM-1",
        posted_at=None,
        value_at=None,
        meta={"k": "v"},
    )

    b = create_bank_event(
        db,
        clan_id=1,
        source_type="statement_csv",
        source_id="fileX",
        direction="credit",
        amount=Decimal("5.00"),
        currency="NGN",
        reference_raw=ref,
        description_raw="idem test",
        bank_txn_id="TXN-IDEM-1",
        posted_at=None,
        value_at=None,
        meta={"k": "v"},
    )

    assert a.id == b.id
    assert a.hash == b.hash


def test_pool_instruction_links_pool_event_for_auto_reconciliation(db):
    """
    Pool Money In instructions must leave a pending PoolEvent behind so that
    bank reconciliation can turn the confirmed bank match into a confirmed pool
    deposit without manual admin cleanup.
    """
    instruction = create_pool_deposit_instruction(
        db,
        clan_id=7,
        user_id=42,
        amount=Decimal("12.50"),
        currency="NGN",
    )

    exp = db.get(ExpectedPayment, int(instruction["expected_payment_id"]))
    pool_event = db.get(PoolEvent, int(instruction["pool_event_id"]))

    assert exp is not None
    assert pool_event is not None
    assert pool_event.event_type == "deposit.requested"
    assert pool_event.reference == instruction["reference_display"]
    assert pool_event.reference == exp.reference_display

    meta = json.loads(exp.meta_json or "{}")
    assert meta["pool_event_id"] == pool_event.id
    assert meta["source"] == "payment_instruction.pool"

    bank_event = create_bank_event(
        db,
        clan_id=7,
        source_type="statement_csv",
        source_id="pool-file",
        direction="credit",
        amount=Decimal("12.50"),
        currency="NGN",
        reference_raw=instruction["reference_display"],
        description_raw="pool deposit",
        bank_txn_id="TXN-POOL-1",
        posted_at=None,
        value_at=None,
        meta={"test": "pool"},
    )

    stats = reconcile_batch(db, clan_id=7, limit=50)
    assert stats["confirmed"] == 1

    exp_after = db.get(ExpectedPayment, exp.id)
    pool_after = db.get(PoolEvent, pool_event.id)
    bank_after = db.get(BankEvent, bank_event.id)

    assert exp_after.status == "confirmed"
    assert bank_after.status == "confirmed"
    assert pool_after.event_type == "deposit.confirmed"
    assert pool_after.confirmed_at is not None
    assert "auto-confirmed by bank reconciliation" in (pool_after.note or "")


def test_loan_repayment_part_instruction_keeps_expected_total_outstanding(db):
    clan, borrower, loan, _guarantor_row = _seed_supported_loan_for_reconciliation(db)

    instruction = create_loan_repayment_instruction(
        db,
        clan_id=int(clan.id),
        user_id=int(borrower.id),
        loan_id=int(loan.id),
        amount=Decimal("40.00"),
        currency="NGN",
    )

    expected = db.get(ExpectedPayment, int(instruction["expected_payment_id"]))
    assert expected is not None

    assert instruction["amount"] == "40.00"
    assert instruction["expected_total_amount"] == "100.00"
    assert instruction["expected_remaining_amount"] == "100.00"
    assert expected.amount == Decimal("100.00")
    assert expected.paid_amount == Decimal("0.00")
    assert expected.remaining_amount == Decimal("100.00")

    repeat_instruction = create_loan_repayment_instruction(
        db,
        clan_id=int(clan.id),
        user_id=int(borrower.id),
        loan_id=int(loan.id),
        amount=Decimal("25.00"),
        currency="NGN",
    )

    assert repeat_instruction["expected_payment_id"] == instruction["expected_payment_id"]
    assert repeat_instruction["amount"] == "25.00"
    assert repeat_instruction["expected_total_amount"] == "100.00"


def test_loan_repayment_reconciliation_applies_part_payment_then_full_closure(db):
    clan, borrower, loan, guarantor_row = _seed_supported_loan_for_reconciliation(db)

    expected = ensure_loan_repayment_expected_payment(
        db,
        clan_id=int(clan.id),
        loan_id=int(loan.id),
        borrower_user_id=int(borrower.id),
        amount=Decimal("100.00"),
        currency="NGN",
        meta={"source": "test.loan-repayment.reconciliation"},
        commit=True,
        refresh=True,
    )

    part_event = create_bank_event(
        db,
        clan_id=int(clan.id),
        source_type="statement_csv",
        source_id="loan-repayment-part",
        direction="credit",
        amount=Decimal("40.00"),
        currency="NGN",
        reference_raw=expected.reference_display,
        description_raw="loan repayment part payment",
        bank_txn_id="TXN-LOAN-PART-1",
        posted_at=None,
        value_at=None,
        meta={"test": "loan-repayment-part"},
    )

    part_stats = reconcile_batch(db, clan_id=int(clan.id), limit=50)
    assert part_stats["partial"] == 1

    db.refresh(expected)
    db.refresh(loan)
    db.refresh(part_event)

    assert expected.status == "partial"
    assert expected.paid_amount == Decimal("40.00")
    assert expected.remaining_amount == Decimal("60.00")
    assert part_event.status == "partial"
    assert part_event.expected_payment_id == expected.id
    assert loan.status == "approved"
    assert loan.paid_total == Decimal("40.00")
    assert loan.remaining_amount == Decimal("60.00")

    event_types_after_part = [
        row.event_type
        for row in db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan.id))
        .order_by(TrustEvent.id.asc())
        .all()
    ]
    assert "repayment.created" in event_types_after_part
    assert "repayment.auto_applied" in event_types_after_part
    assert "loan.repaid" not in event_types_after_part

    part_meta = json.loads(expected.meta_json or "{}")
    assert part_meta["application_kind"] == "loan_repayment"
    assert part_meta["applied_to_loan_amount"] == "40.00"
    assert part_meta["loan_status_after_application"] == "approved"
    assert part_meta["loan_remaining_after_application"] == "60.00"

    final_event = create_bank_event(
        db,
        clan_id=int(clan.id),
        source_type="statement_csv",
        source_id="loan-repayment-final",
        direction="credit",
        amount=Decimal("60.00"),
        currency="NGN",
        reference_raw=expected.reference_display,
        description_raw="loan repayment final payment",
        bank_txn_id="TXN-LOAN-FINAL-1",
        posted_at=None,
        value_at=None,
        meta={"test": "loan-repayment-final"},
    )

    final_stats = reconcile_batch(db, clan_id=int(clan.id), limit=50)
    assert final_stats["confirmed"] == 1

    db.refresh(expected)
    db.refresh(loan)
    db.refresh(guarantor_row)
    db.refresh(final_event)

    assert expected.status == "confirmed"
    assert expected.paid_amount == Decimal("100.00")
    assert expected.remaining_amount == Decimal("0.00")
    assert final_event.status == "confirmed"
    assert final_event.expected_payment_id == expected.id
    assert loan.status == "repaid"
    assert loan.paid_total == Decimal("100.00")
    assert loan.remaining_amount == Decimal("0.00")
    assert guarantor_row.is_locked is False
    assert guarantor_row.locked_amount == Decimal("0.00")
    assert guarantor_row.released_amount == Decimal("100.00")

    event_types_after_final = [
        row.event_type
        for row in db.query(TrustEvent)
        .filter(TrustEvent.loan_id == int(loan.id))
        .order_by(TrustEvent.id.asc())
        .all()
    ]
    assert event_types_after_final.count("repayment.created") == 2
    assert event_types_after_final.count("repayment.auto_applied") == 2
    assert "guarantee.released" in event_types_after_final
    assert "loan.repaid" in event_types_after_final

    final_meta = json.loads(expected.meta_json or "{}")
    assert final_meta["applied_to_loan_amount"] == "100.00"
    assert final_meta["loan_status_after_application"] == "repaid"
    assert final_meta["loan_remaining_after_application"] == "0.00"
