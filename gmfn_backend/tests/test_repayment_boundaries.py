from __future__ import annotations

from sqlalchemy import text

from app.db.database import engine


def _repayment_boundary_counts() -> tuple[int, int]:
    with engine.begin() as conn:
        repayments = conn.execute(text("SELECT COUNT(*) FROM repayments")).scalar_one()
        trust_events = conn.execute(text("SELECT COUNT(*) FROM trust_events")).scalar_one()
    return int(repayments), int(trust_events)


def test_loan_repayment_rejects_malformed_amount_before_repayment_write(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    seed_loan,
):
    for bad_value in (False, 1.5, "not-money", "   "):
        rejected = client.post(
            "/loans/1/repayments",
            json={"amount": bad_value, "currency": "USD"},
        )
        assert rejected.status_code == 422, (bad_value, rejected.text)
        assert "amount must be a decimal string" in rejected.text
        assert _repayment_boundary_counts() == (0, 0)
