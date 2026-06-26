import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import text

from app.db.bank_models import ExpectedPayment
from app.db.database import SessionLocal, engine
from app.db.models import Clan, ClanMembership, Loan, LoanGuarantor, TrustEvent, User
from app.api.routes.bank import _expected_out
from app.api.routes.payment_instructions import _expected_payment_out
from app.services.loan_approval import approve_loan


def test_loan_creation_uses_confirmed_pool_events_for_pool_truth(
    client,
    override_clan_ctx_member,
    seed_clan_member_membership,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO pool_events
                    (clan_id, user_id, event_type, amount, currency, reference)
                VALUES
                    (1, 1, 'deposit.confirmed', 500, 'NGN', 'POOL-TRUTH-1')
                """
            )
        )

    response = client.post(
        "/loans",
        json={
            "clan_id": 1,
            "amount": "400",
            "currency": "NGN",
            "purpose": "Family support",
        },
    )

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["status"] == "approved"
    assert str(data["personal_pool_at_request"]) in {"500.00", "500"}
    assert str(data["pool_used"]) in {"400.00", "400"}
    assert str(data["guarantee_gap"]) in {"0.00", "0"}
    assert data["guarantors_required"] == 0


def test_loan_creation_does_not_use_legacy_membership_balance_as_money_truth(
    client,
    override_clan_ctx_member,
    seed_clan_member_membership,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE clan_memberships
                SET personal_pool_balance = 500
                WHERE clan_id = 1 AND user_id = 1
                """
            )
        )

    response = client.post(
        "/loans",
        json={
            "clan_id": 1,
            "amount": "400",
            "currency": "NGN",
            "purpose": "Family support",
        },
    )

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["status"] == "pending"
    assert str(data["personal_pool_at_request"]) in {"0.00", "0"}
    assert str(data["pool_used"]) in {"0.00", "0"}
    assert str(data["guarantee_gap"]) in {"400.00", "400"}
    assert data["guarantors_required"] > 0


def test_loan_creation_requires_support_purpose(
    client,
    override_clan_ctx_member,
    seed_clan_member_membership,
):
    response = client.post(
        "/loans",
        json={
            "clan_id": 1,
            "amount": "400",
            "currency": "NGN",
        },
    )

    assert response.status_code == 400, response.text
    assert response.json()["detail"] == "Purpose is required for a support request."


def test_auto_approved_loan_creates_repayment_expectation_with_plan(
    client,
    override_current_user_user,
    override_clan_ctx_member,
    seed_clan_member_membership,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO pool_events
                    (clan_id, user_id, event_type, amount, currency, reference)
                VALUES
                    (1, 1, 'deposit.confirmed', 500, 'NGN', 'POOL-PLAN-1')
                """
            )
        )

    response = client.post(
        "/loans",
        json={
            "clan_id": 1,
            "amount": "400",
            "currency": "NGN",
            "purpose": "School fees",
            "duration_days": 30,
            "repayment_cadence": "weekly",
        },
    )

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["status"] == "approved"
    assert data["purpose"] == "School fees"

    listed_response = client.get("/loans")
    assert listed_response.status_code == 200, listed_response.text
    listed = listed_response.json()
    assert listed["items"][0]["id"] == data["id"]
    assert listed["items"][0]["purpose"] == "School fees"

    summary_response = client.get(f"/loans/{int(data['id'])}/summary")
    assert summary_response.status_code == 200, summary_response.text
    assert summary_response.json()["purpose"] == "School fees"

    with engine.begin() as conn:
        expected = conn.execute(
            text(
                """
                SELECT *
                FROM expected_payments
                WHERE clan_id = 1
                  AND user_id = 1
                  AND expected_type = 'repayment'
                """
            )
        ).mappings().one()
        schedule_event = conn.execute(
            text(
                """
                SELECT *
                FROM trust_events
                WHERE loan_id = :loan_id
                  AND event_type = 'repayment.schedule.created'
                """
            ),
            {"loan_id": int(data["id"])},
        ).mappings().one()
        created_event = conn.execute(
            text(
                """
                SELECT *
                FROM trust_events
                WHERE loan_id = :loan_id
                  AND event_type = 'loan.created'
                """
            ),
            {"loan_id": int(data["id"])},
        ).mappings().one()
        commitment_event = conn.execute(
            text(
                """
                SELECT *
                FROM trust_events
                WHERE loan_id = :loan_id
                  AND event_type = 'commitment.created'
                """
            ),
            {"loan_id": int(data["id"])},
        ).mappings().one()
        auto_event = conn.execute(
            text(
                """
                SELECT *
                FROM trust_events
                WHERE loan_id = :loan_id
                  AND event_type = 'loan.auto_approved_by_pool'
                """
            ),
            {"loan_id": int(data["id"])},
        ).mappings().one()

    assert str(expected["amount"]) in {"400.00", "400"}
    assert expected["reference_display"] == f"GMFN-REPAY-LOAN-{int(data['id'])}-U1"

    meta = json.loads(expected["meta_json"] or "{}")
    assert meta["source"] == "loan.approval.repayment_schedule"
    assert meta["repayment_cadence"] == "weekly"
    assert meta["duration_days"] == 30
    assert len(meta["planned_installments"]) == 5
    assert sum(Decimal(item["amount"]) for item in meta["planned_installments"]) == Decimal("400.00")

    event_meta = json.loads(schedule_event["meta_json"] or "{}")
    assert event_meta["expected_payment_id"] == expected["id"]
    assert event_meta["repayment_cadence"] == "weekly"

    created_meta = json.loads(created_event["meta_json"] or "{}")
    assert created_meta["purpose"] == "School fees"
    assert "Purpose=School fees." in created_meta["note"]

    commitment_meta = json.loads(commitment_event["meta_json"] or "{}")
    assert commitment_meta["purpose"] == "School fees"
    assert commitment_meta["title"].endswith(": School fees")

    auto_meta = json.loads(auto_event["meta_json"] or "{}")
    assert auto_meta["purpose"] == "School fees"


def test_pending_support_loan_does_not_create_repayment_expectation_too_early(
    client,
    override_clan_ctx_member,
    seed_clan_member_membership,
):
    response = client.post(
        "/loans",
        json={
            "clan_id": 1,
            "amount": "400",
            "currency": "NGN",
            "purpose": "Community support",
            "duration_days": 30,
            "repayment_cadence": "monthly",
        },
    )

    assert response.status_code == 201, response.text
    assert response.json()["status"] == "pending"

    with engine.begin() as conn:
        count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM expected_payments
                WHERE clan_id = 1
                  AND user_id = 1
                  AND expected_type = 'repayment'
                """
            )
        ).scalar_one()

    assert count == 0


def test_guarantor_approved_loan_creates_repayment_expectation_after_approval():
    with SessionLocal() as db:
        clan = Clan(id=1, name="Test Clan", invite_code="test-invite-1", community_code="GMFN-C-000001")
        borrower = User(id=1, email="borrower@example.com", hashed_password="hashed", role="user")
        guarantor = User(id=2, email="guarantor@example.com", hashed_password="hashed", role="user")
        db.add_all([clan, borrower, guarantor])
        db.flush()
        db.add_all(
            [
                ClanMembership(clan_id=1, user_id=1, role="user"),
                ClanMembership(clan_id=1, user_id=2, role="user"),
            ]
        )
        due_at = datetime.now(timezone.utc) + timedelta(days=14)
        loan = Loan(
            clan_id=1,
            borrower_user_id=1,
            amount=Decimal("120.00"),
            currency="NGN",
            status="pending",
            guarantors_required=1,
            personal_pool_at_request=Decimal("0.00"),
            pool_used=Decimal("0.00"),
            guarantee_gap=Decimal("120.00"),
            remaining_amount=Decimal("120.00"),
            due_at=due_at,
        )
        db.add(loan)
        db.flush()
        db.add(
            TrustEvent(
                event_type="commitment.created",
                clan_id=1,
                loan_id=int(loan.id),
                actor_user_id=1,
                subject_user_id=1,
                meta_json=json.dumps(
                    {
                        "reason": "loan_repayment_commitment_created",
                        "cadence": "biweekly",
                        "duration_days": 14,
                        "due_date": due_at.isoformat(),
                    }
                ),
            )
        )
        db.add(
            LoanGuarantor(
                loan_id=int(loan.id),
                clan_id=1,
                guarantor_user_id=2,
                pledge_amount=Decimal("120.00"),
                status="approved",
                is_locked=True,
                locked_amount=Decimal("120.00"),
                released_amount=Decimal("0.00"),
            )
        )
        db.commit()
        db.refresh(loan)

        approved = approve_loan(db, loan=loan, decided_by_user_id=1)

        assert approved.status == "approved"
        expected = (
            db.query(ExpectedPayment)
            .filter(ExpectedPayment.clan_id == 1)
            .filter(ExpectedPayment.user_id == 1)
            .filter(ExpectedPayment.expected_type == "repayment")
            .one()
        )
        meta = json.loads(expected.meta_json or "{}")
        assert expected.amount == Decimal("120.00")
        assert expected.reference_display == f"GMFN-REPAY-LOAN-{int(loan.id)}-U1"
    assert meta["repayment_cadence"] == "biweekly"
    assert len(meta["planned_installments"]) == 1


def test_repayment_expected_payment_serializers_expose_schedule_metadata():
    row = ExpectedPayment(
        id=99,
        clan_id=1,
        user_id=1,
        expected_type="repayment",
        amount=Decimal("120.00"),
        currency="NGN",
        paid_amount=Decimal("0.00"),
        remaining_amount=Decimal("120.00"),
        reference_display="GMFN-REPAY-LOAN-5-U1",
        reference_normalized="GMFNREPAYLOAN5U1",
        status="expected",
        meta_json=json.dumps(
            {
                "loan_id": 5,
                "repayment_cadence": "weekly",
                "planned_installments": [
                    {"sequence": 1, "amount": "60.00", "due_at": "2026-07-03T00:00:00+00:00"},
                    {"sequence": 2, "amount": "60.00", "due_at": "2026-07-10T00:00:00+00:00"},
                ],
            }
        ),
        created_at=datetime.now(timezone.utc),
    )

    for serializer in (_expected_out, _expected_payment_out):
        out = serializer(row)
        assert out["loan_id"] == 5
        assert out["meta"]["repayment_cadence"] == "weekly"
        assert len(out["meta"]["planned_installments"]) == 2
        assert out["meta_json"]["loan_id"] == 5
