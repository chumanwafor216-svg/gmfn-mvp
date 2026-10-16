from __future__ import annotations

from datetime import datetime, timezone

import pytest
from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.db.member_credit_models import (
    FinancialNotificationOutbox,
    MemberCreditAwardObligation,
    MemberCreditPackVersion,
    MemberCreditProviderPayment,
    MemberServiceCreditAccount,
    MemberServiceCreditLedgerEntry,
)
from app.db.models import TrustEvent, User
from app.services import member_credit_service as service
from app.services.member_credit_service import MemberCreditError


NOW = datetime(2026, 10, 16, 12, 0, tzinfo=timezone.utc)


def _seed_members_and_pack(*, amount_minor: int = 1000, units: int = 1) -> int:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, trust_score, trust_band)
                VALUES
                    (1, 'credit-one@example.com', 'hashed', 'member', 55, 'C'),
                    (2, 'credit-two@example.com', 'hashed', 'member', 61, 'B')
                """
            )
        )
    with SessionLocal() as db:
        pack = MemberCreditPackVersion(
            pack_code="synthetic.test.pack",
            version=1,
            credit_units=units,
            quoted_amount_minor=amount_minor,
            currency="TST",
            status="test_active",
            terms_json='{"synthetic": true}',
            created_at=NOW,
        )
        db.add(pack)
        db.commit()
        return int(pack.id)


def _payment(db, *, transaction_id: str, amount_minor: int) -> MemberCreditProviderPayment:
    row = MemberCreditProviderPayment(
        provider_key="synthetic-test-provider",
        merchant_key="synthetic-test-merchant",
        provider_transaction_id=transaction_id,
        amount_minor=amount_minor,
        allocated_minor=0,
        currency="TST",
        verification_status="test_verified",
        received_at=NOW,
        created_at=NOW,
    )
    db.add(row)
    db.flush()
    return row


def test_repeated_notification_and_award_replay_produce_one_fulfilment() -> None:
    pack_id = _seed_members_and_pack(units=3)
    with SessionLocal() as db:
        order = service.create_purchase_order(
            db,
            member_user_id=1,
            pack_version_id=pack_id,
            idempotency_key="order-one",
            now=NOW,
            commit=False,
        )
        payment = _payment(db, transaction_id="provider-txn-one", amount_minor=1000)
        allocation = service.allocate_verified_payment(
            db,
            provider_payment_id=int(payment.id),
            purchase_order_id=int(order.id),
            amount_minor=1000,
            policy_key="synthetic-exact-payment",
            allow_partial_contributions=False,
            now=NOW,
            commit=False,
        )
        replay = service.allocate_verified_payment(
            db,
            provider_payment_id=int(payment.id),
            purchase_order_id=int(order.id),
            amount_minor=1000,
            policy_key="synthetic-exact-payment",
            allow_partial_contributions=False,
            now=NOW,
            commit=False,
        )
        assert replay.id == allocation.id
        obligation = db.query(MemberCreditAwardObligation).filter_by(purchase_order_id=order.id).one()
        first = service.apply_award_obligation(db, obligation_id=int(obligation.id), now=NOW, commit=True)
        payment.settled_at = NOW
        db.commit()
        second = service.apply_award_obligation(db, obligation_id=int(obligation.id), now=NOW, commit=True)

        assert first.balance_units == 3
        assert second.deduped is True
        assert db.query(MemberServiceCreditLedgerEntry).count() == 1
        assert db.query(FinancialNotificationOutbox).count() == 1
        assert db.query(MemberCreditAwardObligation).count() == 1


def test_two_allowed_contributions_fund_one_order_and_second_full_transfer_stays_visible() -> None:
    pack_id = _seed_members_and_pack()
    with SessionLocal() as db:
        order = service.create_purchase_order(
            db,
            member_user_id=1,
            pack_version_id=pack_id,
            idempotency_key="part-order",
            now=NOW,
            commit=False,
        )
        first_payment = _payment(db, transaction_id="part-40", amount_minor=400)
        second_payment = _payment(db, transaction_id="part-60", amount_minor=600)
        service.allocate_verified_payment(
            db,
            provider_payment_id=int(first_payment.id),
            purchase_order_id=int(order.id),
            amount_minor=400,
            policy_key="synthetic-part-payment-enabled",
            allow_partial_contributions=True,
            now=NOW,
            commit=False,
        )
        assert order.status == "partially_funded"
        service.allocate_verified_payment(
            db,
            provider_payment_id=int(second_payment.id),
            purchase_order_id=int(order.id),
            amount_minor=600,
            policy_key="synthetic-part-payment-enabled",
            allow_partial_contributions=True,
            now=NOW,
            commit=False,
        )
        obligation = db.query(MemberCreditAwardObligation).filter_by(purchase_order_id=order.id).one()
        service.apply_award_obligation(db, obligation_id=int(obligation.id), now=NOW, commit=True)

        extra_payment = _payment(db, transaction_id="second-full-transfer", amount_minor=1000)
        db.commit()
        with pytest.raises(MemberCreditError, match="purchase_order_already_fulfilled"):
            service.allocate_verified_payment(
                db,
                provider_payment_id=int(extra_payment.id),
                purchase_order_id=int(order.id),
                amount_minor=1000,
                policy_key="synthetic-exact-payment",
                allow_partial_contributions=False,
                now=NOW,
                commit=True,
            )
        db.refresh(extra_payment)
        assert extra_payment.allocated_minor == 0
        assert extra_payment.exception_code == "fulfilled_order_additional_payment_unallocated"
        assert db.query(MemberCreditProviderPayment).count() == 3
        assert db.query(MemberCreditAwardObligation).count() == 1


def test_interrupted_award_rolls_back_and_obligation_remains_retryable(monkeypatch) -> None:
    pack_id = _seed_members_and_pack(units=2)
    with SessionLocal() as db:
        order = service.create_purchase_order(
            db,
            member_user_id=1,
            pack_version_id=pack_id,
            idempotency_key="recover-order",
            now=NOW,
            commit=False,
        )
        payment = _payment(db, transaction_id="recover-payment", amount_minor=1000)
        service.allocate_verified_payment(
            db,
            provider_payment_id=int(payment.id),
            purchase_order_id=int(order.id),
            amount_minor=1000,
            policy_key="synthetic-exact-payment",
            allow_partial_contributions=False,
            now=NOW,
            commit=True,
        )
        obligation = db.query(MemberCreditAwardObligation).filter_by(purchase_order_id=order.id).one()
        original = service._persist_award_outbox

        def fail_outbox(*args, **kwargs):
            raise RuntimeError("synthetic outbox failure")

        monkeypatch.setattr(service, "_persist_award_outbox", fail_outbox)
        with pytest.raises(RuntimeError, match="synthetic outbox failure"):
            service.apply_award_obligation(db, obligation_id=int(obligation.id), now=NOW, commit=True)
        assert db.query(MemberServiceCreditLedgerEntry).count() == 0
        assert db.query(MemberServiceCreditAccount).count() == 0
        assert db.get(MemberCreditAwardObligation, int(obligation.id)).status == "pending"

        monkeypatch.setattr(service, "_persist_award_outbox", original)
        recovered = service.apply_award_obligation(db, obligation_id=int(obligation.id), now=NOW, commit=True)
        assert recovered.balance_units == 2
        assert service.reconcile_member_credit_account(db, account_id=recovered.account_id) == {
            "account_id": recovered.account_id,
            "stored_balance": 2,
            "ledger_total": 2,
            "balanced": True,
            "chain_valid": True,
            "entry_count": 1,
        }


def test_member_accounts_are_personal_and_financial_activity_is_not_trust_evidence() -> None:
    pack_id = _seed_members_and_pack()
    with SessionLocal() as db:
        before_scores = {row.id: row.trust_score for row in db.query(User).order_by(User.id).all()}
        before_events = db.query(TrustEvent).count()
        order = service.create_purchase_order(
            db,
            member_user_id=1,
            pack_version_id=pack_id,
            idempotency_key="isolation-order",
            now=NOW,
            commit=False,
        )
        payment = _payment(db, transaction_id="isolation-payment", amount_minor=1000)
        service.allocate_verified_payment(
            db,
            provider_payment_id=int(payment.id),
            purchase_order_id=int(order.id),
            amount_minor=1000,
            policy_key="synthetic-exact-payment",
            allow_partial_contributions=False,
            now=NOW,
            commit=False,
        )
        obligation = db.query(MemberCreditAwardObligation).filter_by(purchase_order_id=order.id).one()
        awarded = service.apply_award_obligation(db, obligation_id=int(obligation.id), now=NOW, commit=True)
        db.execute(
            text(
                """
                INSERT INTO clans (id, name, community_code, status, invite_code, invite_uses)
                VALUES
                    (1, 'Credit Community One', 'CREDIT-C1', 'active', 'CREDIT-C1', 0),
                    (2, 'Credit Community Two', 'CREDIT-C2', 'active', 'CREDIT-C2', 0)
                """
            )
        )
        db.execute(
            text(
                """
                INSERT INTO clan_memberships (clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 1, 'member', 0)
                """
            )
        )
        db.commit()
        balance_before_community_change = db.get(MemberServiceCreditAccount, awarded.account_id).balance_units
        db.execute(text("UPDATE clan_memberships SET clan_id = 2 WHERE user_id = 1"))
        db.commit()
        assert db.get(MemberServiceCreditAccount, awarded.account_id).balance_units == balance_before_community_change
        db.add(MemberServiceCreditAccount(member_user_id=2, balance_units=0, version=0, status="active", created_at=NOW, updated_at=NOW))
        db.commit()

        accounts = db.query(MemberServiceCreditAccount).order_by(MemberServiceCreditAccount.member_user_id).all()
        assert [(row.member_user_id, row.balance_units) for row in accounts] == [(1, 1), (2, 0)]
        assert not hasattr(accounts[0], "clan_id")
        assert db.query(TrustEvent).count() == before_events
        assert {row.id: row.trust_score for row in db.query(User).order_by(User.id).all()} == before_scores
        assert service.reconcile_member_credit_account(db, account_id=awarded.account_id)["balanced"] is True


def test_purchase_order_idempotency_key_rejects_changed_payload() -> None:
    pack_id = _seed_members_and_pack()
    with SessionLocal() as db:
        service.create_purchase_order(
            db,
            member_user_id=1,
            pack_version_id=pack_id,
            idempotency_key="same-order-key",
            now=NOW,
            commit=True,
        )
        with pytest.raises(MemberCreditError, match="conflicting_idempotency_fingerprint"):
            service.create_purchase_order(
                db,
                member_user_id=2,
                pack_version_id=pack_id,
                idempotency_key="same-order-key",
                now=NOW,
                commit=True,
            )
