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
