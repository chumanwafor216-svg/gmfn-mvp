from __future__ import annotations

from app.db.database import SessionLocal
from app.db.models import PoolEvent


def _pool_event_count() -> int:
    db = SessionLocal()
    try:
        return db.query(PoolEvent).count()
    finally:
        db.close()


def test_pool_deposit_request_rejects_non_text_payload_before_event_write(
    client,
    seed_clan_member_membership,
    override_current_user_user,
):
    response = client.post(
        "/pool/deposits/request",
        json={
            "amount": 100,
            "currency": True,
            "note": {"bad": "x"},
        },
        headers={"X-Clan-Id": "1"},
    )

    assert response.status_code == 422, response.text
    assert "amount must be text" in response.text
    assert "currency must be text" in response.text
    assert "note must be text" in response.text
    assert _pool_event_count() == 0


def test_pool_withdrawal_request_rejects_non_text_payload_before_event_write(
    client,
    seed_clan_member_membership,
    override_current_user_user,
):
    response = client.post(
        "/pool/withdrawals/request",
        json={
            "amount": False,
            "currency": 1.5,
            "note": 12345,
        },
        headers={"X-Clan-Id": "1"},
    )

    assert response.status_code == 422, response.text
    assert "amount must be text" in response.text
    assert "currency must be text" in response.text
    assert "note must be text" in response.text
    assert _pool_event_count() == 0


def test_pool_deposit_request_accepts_text_payload(
    client,
    seed_clan_member_membership,
    override_current_user_user,
):
    response = client.post(
        "/pool/deposits/request",
        json={
            "amount": "25.50",
            "currency": "NGN",
            "note": "Member deposit request",
        },
        headers={"X-Clan-Id": "1"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["event_type"] == "deposit.requested"
    assert payload["amount"] == "25.50"
    assert payload["currency"] == "NGN"
    assert payload["note"] == "Member deposit request"
    assert _pool_event_count() == 1
