from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.database import engine


def _seed_meeting_entitlement(quantity: int = 1) -> None:
    now = datetime.now(timezone.utc)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    owner_user_id,
                    clan_id,
                    shop_id,
                    feature_code,
                    plan_code,
                    quantity_total,
                    quantity_used,
                    status,
                    starts_at,
                    expires_at,
                    payment_reference
                )
                VALUES (
                    1,
                    1,
                    NULL,
                    'community_meeting_pack',
                    'community_meeting_pack',
                    :quantity,
                    0,
                    'active',
                    :starts_at,
                    :expires_at,
                    'TEST-MEETING-ENGINE-REF'
                )
                """
            ),
            {
                "quantity": int(quantity),
                "starts_at": now - timedelta(days=1),
                "expires_at": now + timedelta(days=365),
            },
        )


def test_meeting_reminder_consumes_credit_and_records_trust_event(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_meeting_entitlement()

    res = client.post(
        "/community-meetings/reminders",
        json={
            "clan_id": 1,
            "title": "June contribution meeting",
            "purpose": "Agree next support priorities",
            "attendee_user_ids": [1, 2],
            "whatsapp_number": "+447700900123",
            "note": "Pilot meeting pack test",
        },
    )

    assert res.status_code == 200
    body = res.json()
    meeting = body["meeting"]
    assert meeting["meeting_id"].startswith("MTG-C1-")
    assert meeting["package_consumed"] is True
    assert "wa.me" in meeting["whatsapp_share_url"]
    assert body["remaining_after"] == 0

    meeting_id = meeting["meeting_id"]
    with engine.begin() as conn:
        usage_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM feature_usage_events
                WHERE feature_code = 'community_meeting_pack'
                  AND reference_key = :meeting_id
                """
            ),
            {"meeting_id": meeting_id},
        ).scalar_one()
        reminder_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type = 'community.meeting.reminder_created'
                  AND meta_json LIKE :meeting_like
                """
            ),
            {"meeting_like": f"%{meeting_id}%"},
        ).scalar_one()
        notification_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM notifications
                WHERE kind = 'community.meeting_reminder'
                  AND action_url LIKE :meeting_like
                """
            ),
            {"meeting_like": f"%{meeting_id}%"},
        ).scalar_one()

    assert usage_count == 1
    assert reminder_count == 1
    assert notification_count == 2


def test_meeting_summary_records_trust_event_without_second_credit(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_meeting_entitlement()

    reminder_res = client.post(
        "/community-meetings/reminders",
        json={
            "clan_id": 1,
            "title": "Savings circle check-in",
            "purpose": "Confirm meeting decisions",
            "attendee_user_ids": [1, 2],
        },
    )
    assert reminder_res.status_code == 200
    meeting_id = reminder_res.json()["meeting"]["meeting_id"]

    summary_res = client.post(
        f"/community-meetings/{meeting_id}/summary",
        json={
            "clan_id": 1,
            "summary": "Members agreed to keep the next contribution date unchanged.",
            "decisions": "Admin will share the final reminder in WhatsApp.",
            "attendance_count": 2,
            "attendee_user_ids": [1, 2],
        },
    )

    assert summary_res.status_code == 200
    body = summary_res.json()
    assert body["meeting"]["status"] == "summary_recorded"
    assert body["meeting"]["package_consumed"] is False
    assert "No extra meeting pack credit" in body["message"]

    list_res = client.get("/community-meetings?clan_id=1")
    assert list_res.status_code == 200
    meetings = list_res.json()["meetings"]
    assert meetings[0]["meeting_id"] == meeting_id
    assert meetings[0]["status"] == "summary_recorded"

    with engine.begin() as conn:
        usage_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM feature_usage_events
                WHERE feature_code = 'community_meeting_pack'
                """
            )
        ).scalar_one()
        summary_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type = 'community.meeting.summary_recorded'
                  AND meta_json LIKE :meeting_like
                """
            ),
            {"meeting_like": f"%{meeting_id}%"},
        ).scalar_one()

    assert usage_count == 1
    assert summary_count == 1


def test_meeting_reminder_requires_active_credit(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    res = client.post(
        "/community-meetings/reminders",
        json={
            "clan_id": 1,
            "title": "No credit meeting",
        },
    )

    assert res.status_code == 409
    assert "No active meeting pack credit" in res.json()["detail"]


def test_meeting_reminder_rejects_malformed_boundary_fields(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    for field_name in ("title", "purpose", "whatsapp_number", "note"):
        payload = {
            "clan_id": 1,
            "title": "Boundary meeting",
            "purpose": "Keep meeting evidence typed.",
            "whatsapp_number": "+447700900123",
            "note": "Boundary note",
        }
        payload[field_name] = False
        rejected_bool_text = client.post("/community-meetings/reminders", json=payload)
        assert rejected_bool_text.status_code == 422, (
            field_name,
            rejected_bool_text.text,
        )
        assert f"{field_name} must be text" in rejected_bool_text.text

        payload[field_name] = 1.5
        rejected_float_text = client.post("/community-meetings/reminders", json=payload)
        assert rejected_float_text.status_code == 422, (
            field_name,
            rejected_float_text.text,
        )
        assert f"{field_name} must be text" in rejected_float_text.text

    for value, expected in (
        (True, "clan_id must be an integer id"),
        (1.5, "clan_id must be an integer id"),
    ):
        rejected_clan_id = client.post(
            "/community-meetings/reminders",
            json={
                "clan_id": value,
                "title": "Boundary meeting",
            },
        )
        assert rejected_clan_id.status_code == 422, rejected_clan_id.text
        assert expected in rejected_clan_id.text

    for value, expected in (
        (True, "attendee_user_ids must be an integer id"),
        (1.5, "attendee_user_ids must be an integer id"),
    ):
        rejected_attendee = client.post(
            "/community-meetings/reminders",
            json={
                "clan_id": 1,
                "title": "Boundary meeting",
                "attendee_user_ids": [value],
            },
        )
        assert rejected_attendee.status_code == 422, rejected_attendee.text
        assert expected in rejected_attendee.text


def test_meeting_summary_rejects_malformed_boundary_fields(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    meeting_id = "MTG-C1-BOUNDARY"

    for field_name in ("summary", "decisions", "note"):
        payload = {
            "clan_id": 1,
            "summary": "Members agreed to keep typed meeting evidence.",
            "decisions": "Admin will share typed decisions.",
            "note": "Boundary note",
        }
        payload[field_name] = False
        rejected_bool_text = client.post(
            f"/community-meetings/{meeting_id}/summary",
            json=payload,
        )
        assert rejected_bool_text.status_code == 422, (
            field_name,
            rejected_bool_text.text,
        )
        assert f"{field_name} must be text" in rejected_bool_text.text

        payload[field_name] = 1.5
        rejected_float_text = client.post(
            f"/community-meetings/{meeting_id}/summary",
            json=payload,
        )
        assert rejected_float_text.status_code == 422, (
            field_name,
            rejected_float_text.text,
        )
        assert f"{field_name} must be text" in rejected_float_text.text

    for field_name, value, expected in (
        ("clan_id", True, "clan_id must be an integer id"),
        ("clan_id", 1.5, "clan_id must be an integer id"),
        ("attendance_count", True, "attendance_count must be an integer"),
        ("attendance_count", 1.5, "attendance_count must be an integer"),
    ):
        payload = {
            "clan_id": 1,
            "summary": "Members agreed to keep typed meeting evidence.",
        }
        payload[field_name] = value
        rejected_number = client.post(
            f"/community-meetings/{meeting_id}/summary",
            json=payload,
        )
        assert rejected_number.status_code == 422, (
            field_name,
            rejected_number.text,
        )
        assert expected in rejected_number.text

    for value, expected in (
        (True, "attendee_user_ids must be an integer id"),
        (1.5, "attendee_user_ids must be an integer id"),
    ):
        rejected_attendee = client.post(
            f"/community-meetings/{meeting_id}/summary",
            json={
                "clan_id": 1,
                "summary": "Members agreed to keep typed meeting evidence.",
                "attendee_user_ids": [value],
            },
        )
        assert rejected_attendee.status_code == 422, rejected_attendee.text
        assert expected in rejected_attendee.text
