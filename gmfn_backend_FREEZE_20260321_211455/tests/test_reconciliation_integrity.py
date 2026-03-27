# tests/test_reconciliation_integrity.py
from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.db.bank_models import BankEvent, ExpectedPayment
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

    Base.metadata.create_all(bind=engine)

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
    