from decimal import Decimal

import pytest
from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.services.pool_service import compute_pool_balances, request_withdrawal


def test_pending_withdrawal_reduces_next_withdrawable_amount():
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role)
                VALUES (1, 'pool-owner@example.com', 'hashed', 'user')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, invite_code, community_code)
                VALUES (1, 'Pool Clan', 'pool-clan', 'GMFN-C-000001')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 1, 'user', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO pool_events
                    (clan_id, user_id, event_type, amount, currency, reference)
                VALUES
                    (1, 1, 'deposit.confirmed', 100, 'NGN', 'POOL-WD-1')
                """
            )
        )

    with SessionLocal() as db:
        balances_before = compute_pool_balances(
            db,
            clan_id=1,
            user_id=1,
            currency="NGN",
        )
        assert balances_before["effective_available"] == Decimal("100")
        assert balances_before["withdrawable_now"] == Decimal("100")

        first = request_withdrawal(
            db,
            clan_id=1,
            user_id=1,
            amount="80",
            currency="NGN",
            note="First pending withdrawal",
        )
        db.commit()
        assert first.event_type == "withdrawal.requested"

        balances_after_first = compute_pool_balances(
            db,
            clan_id=1,
            user_id=1,
            currency="NGN",
        )
        assert balances_after_first["effective_available"] == Decimal("100")
        assert balances_after_first["pending_withdrawals"] == Decimal("80")
        assert balances_after_first["withdrawable_now"] == Decimal("20")

        with pytest.raises(ValueError, match="insufficient withdrawable pool balance"):
            request_withdrawal(
                db,
                clan_id=1,
                user_id=1,
                amount="80",
                currency="NGN",
                note="Second duplicate pending withdrawal",
            )
