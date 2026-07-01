from __future__ import annotations

from sqlalchemy import text

from app.db.database import engine


def _counts() -> tuple[int, int]:
    with engine.begin() as conn:
        destinations = conn.execute(
            text("SELECT COUNT(*) FROM user_payout_destinations")
        ).scalar_one()
        bank_events = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type = 'identity.bank_destination_recorded'
                """
            )
        ).scalar_one()
    return int(destinations), int(bank_events)


def test_withdrawal_destination_rejects_malformed_text_controls(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    base_payload = {
        "destination_name": "Ada Member",
        "bank_name": "Pilot Bank",
        "account_number": "12345678",
        "sort_code": "12-34-56",
        "bank_sort_code": "12-34-56",
        "phone_number": "+447700900222",
        "country": "GB",
        "currency": "GBP",
        "note": "Main member payout route",
    }

    for field_name in base_payload:
        payload = dict(base_payload)
        payload[field_name] = False

        response = client.post("/withdrawal-destinations/me", json=payload)

        assert response.status_code == 422, response.text
        assert f"{field_name} must be text" in response.text
        assert _counts() == (0, 0)

        payload[field_name] = 1.5

        response = client.post("/withdrawal-destinations/me", json=payload)

        assert response.status_code == 422, response.text
        assert f"{field_name} must be text" in response.text
        assert _counts() == (0, 0)

