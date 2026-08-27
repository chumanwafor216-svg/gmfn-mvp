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

    for value in (False, 1234567890):
        rejected_scheduled_at = client.post(
            "/community-meetings/reminders",
            json={
                "clan_id": 1,
                "title": "Boundary meeting",
                "scheduled_at": value,
            },
        )
        assert rejected_scheduled_at.status_code == 422, rejected_scheduled_at.text
        assert "scheduled_at must be an ISO datetime string" in rejected_scheduled_at.text

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


def test_meeting_interest_records_latest_planning_response(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_meeting_entitlement()

    reminder_res = client.post(
        "/community-meetings/reminders",
        json={
            "clan_id": 1,
            "title": "Friday planning meeting",
            "purpose": "Estimate chairs and refreshments before Friday.",
            "attendee_user_ids": [1, 2],
        },
    )
    assert reminder_res.status_code == 200, reminder_res.text
    meeting_id = reminder_res.json()["meeting"]["meeting_id"]

    yes_res = client.post(
        f"/community-meetings/{meeting_id}/interest",
        json={"clan_id": 1, "response": "yes", "note": "I plan to attend."},
    )
    assert yes_res.status_code == 200, yes_res.text
    assert yes_res.json()["meeting"]["interest_summary"]["yes"] == 1
    assert yes_res.json()["meeting"]["interest_summary"]["own_response"] == "yes"

    no_res = client.post(
        f"/community-meetings/{meeting_id}/interest",
        json={"clan_id": 1, "response": "no", "note": "I can no longer attend."},
    )
    assert no_res.status_code == 200, no_res.text

    list_res = client.get("/community-meetings", params={"clan_id": 1})
    assert list_res.status_code == 200, list_res.text
    meeting = list_res.json()["meetings"][0]
    assert meeting["meeting_id"] == meeting_id
    assert meeting["interest_summary"] == {
        "yes": 0,
        "no": 1,
        "maybe": 0,
        "total": 1,
        "own_response": "no",
        "planning_ready": False,
    }

    with engine.begin() as conn:
        interest_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type = 'community.meeting.interest_recorded'
                  AND meta_json LIKE :meeting_like
                """
            ),
            {"meeting_like": f"%{meeting_id}%"},
        ).scalar_one()
        usage_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM feature_usage_events
                WHERE feature_code = 'community_meeting_pack'
                """
            )
        ).scalar_one()

    assert interest_count == 2
    assert usage_count == 1


def test_meeting_interest_rejects_invalid_response(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_meeting_entitlement()

    reminder_res = client.post(
        "/community-meetings/reminders",
        json={"clan_id": 1, "title": "Invalid response planning"},
    )
    assert reminder_res.status_code == 200, reminder_res.text
    meeting_id = reminder_res.json()["meeting"]["meeting_id"]

    invalid_res = client.post(
        f"/community-meetings/{meeting_id}/interest",
        json={"clan_id": 1, "response": "thumbs_up"},
    )

    assert invalid_res.status_code == 400, invalid_res.text
    assert "yes, no, or maybe" in invalid_res.text



def test_meeting_qr_attendance_session_records_member_checkin_once(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_meeting_entitlement()

    reminder_res = client.post(
        "/community-meetings/reminders",
        json={
            "clan_id": 1,
            "title": "Attendance registry meeting",
            "purpose": "Record who showed up and when.",
            "attendee_user_ids": [1, 2],
        },
    )
    assert reminder_res.status_code == 200, reminder_res.text
    meeting_id = reminder_res.json()["meeting"]["meeting_id"]

    session_res = client.post(
        f"/community-meetings/{meeting_id}/attendance-sessions",
        json={"clan_id": 1, "method": "qr", "window_minutes": 45},
    )
    assert session_res.status_code == 200, session_res.text
    session = session_res.json()["attendance_session"]
    assert session["method"] == "qr"
    assert session["evidence_strength"] == "moderate"
    assert session["automatic_bluetooth_scan"] is False
    assert "attendance_token=" in session["checkin_url"]

    checkin_res = client.post(
        f"/community-meetings/{meeting_id}/attendance-check-ins",
        json={
            "clan_id": 1,
            "attendance_token": session["attendance_token"],
            "method": "qr",
        },
    )
    assert checkin_res.status_code == 200, checkin_res.text
    checkin = checkin_res.json()["attendance_checkin"]
    assert checkin_res.json()["already_recorded"] is False
    assert checkin["checked_in_user_id"] == 1
    assert checkin["attendance_method"] == "qr"
    assert checkin["checked_in_at"]
    assert checkin["evidence_strength"] == "moderate"
    assert checkin["automatic_bluetooth_scan"] is False

    duplicate_res = client.post(
        f"/community-meetings/{meeting_id}/attendance-check-ins",
        json={
            "clan_id": 1,
            "attendance_token": session["attendance_token"],
            "method": "qr",
        },
    )
    assert duplicate_res.status_code == 200, duplicate_res.text
    assert duplicate_res.json()["already_recorded"] is True

    list_res = client.get("/community-meetings", params={"clan_id": 1})
    assert list_res.status_code == 200, list_res.text
    meeting = list_res.json()["meetings"][0]
    assert meeting["meeting_id"] == meeting_id
    assert meeting["attendance_summary"]["checkin_count"] == 1
    assert meeting["attendance_summary"]["checked_in_user_ids"] == [1]
    assert meeting["attendance_summary"]["method_counts"] == {"qr": 1}
    assert meeting["attendance_summary"]["active_session"]["method"] == "qr"
    assert meeting["attendance_summary"]["active_session"]["attendance_token"] == session["attendance_token"]
    assert "Presence Evidence only" in meeting["attendance_summary"]["presence_evidence_boundary"]

    with engine.begin() as conn:
        checkin_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type = 'community.meeting.attendance_checkin_recorded'
                  AND meta_json LIKE :meeting_like
                """
            ),
            {"meeting_like": f"%{meeting_id}%"},
        ).scalar_one()

    assert checkin_count == 1


def test_meeting_attendance_rejects_invalid_token(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    _seed_meeting_entitlement()

    reminder_res = client.post(
        "/community-meetings/reminders",
        json={"clan_id": 1, "title": "Invalid attendance token"},
    )
    assert reminder_res.status_code == 200, reminder_res.text
    meeting_id = reminder_res.json()["meeting"]["meeting_id"]

    invalid_res = client.post(
        f"/community-meetings/{meeting_id}/attendance-check-ins",
        json={
            "clan_id": 1,
            "attendance_token": "not-the-active-token",
            "method": "qr",
        },
    )

    assert invalid_res.status_code == 409, invalid_res.text
    assert "closed or invalid" in invalid_res.text


def test_meeting_proximity_attendance_is_recorded_as_nonautomatic_presence_evidence(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    _seed_meeting_entitlement()

    reminder_res = client.post(
        "/community-meetings/reminders",
        json={"clan_id": 1, "title": "Proximity attendance boundary"},
    )
    assert reminder_res.status_code == 200, reminder_res.text
    meeting_id = reminder_res.json()["meeting"]["meeting_id"]

    session_res = client.post(
        f"/community-meetings/{meeting_id}/attendance-sessions",
        json={
            "clan_id": 1,
            "method": "bluetooth_proximity",
            "window_minutes": 30,
        },
    )
    assert session_res.status_code == 200, session_res.text
    session = session_res.json()["attendance_session"]
    assert session["method"] == "bluetooth_proximity"
    assert session["automatic_bluetooth_scan"] is False

    checkin_res = client.post(
        f"/community-meetings/{meeting_id}/attendance-check-ins",
        json={
            "clan_id": 1,
            "attendance_token": session["attendance_token"],
            "method": "bluetooth_proximity",
            "note": "Recorder confirmed proximity; browser Bluetooth scan is not connected.",
        },
    )
    assert checkin_res.status_code == 200, checkin_res.text
    checkin = checkin_res.json()["attendance_checkin"]
    assert checkin["attendance_method"] == "bluetooth_proximity"
    assert checkin["evidence_strength"] == "stronger_when_enabled"
    assert checkin["automatic_bluetooth_scan"] is False


def test_meeting_proximity_window_allows_qr_fallback_without_stronger_evidence(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    _seed_meeting_entitlement()

    reminder_res = client.post(
        "/community-meetings/reminders",
        json={"clan_id": 1, "title": "Proximity fallback attendance"},
    )
    assert reminder_res.status_code == 200, reminder_res.text
    meeting_id = reminder_res.json()["meeting"]["meeting_id"]

    session_res = client.post(
        f"/community-meetings/{meeting_id}/attendance-sessions",
        json={
            "clan_id": 1,
            "method": "bluetooth_proximity",
            "window_minutes": 30,
        },
    )
    assert session_res.status_code == 200, session_res.text
    session = session_res.json()["attendance_session"]

    checkin_res = client.post(
        f"/community-meetings/{meeting_id}/attendance-check-ins",
        json={
            "clan_id": 1,
            "attendance_token": session["attendance_token"],
            "method": "qr",
            "note": "Member used QR fallback because Bluetooth was not available.",
        },
    )
    assert checkin_res.status_code == 200, checkin_res.text
    checkin = checkin_res.json()["attendance_checkin"]
    assert checkin["attendance_method"] == "qr"
    assert checkin["evidence_strength"] == "moderate"
    assert checkin["automatic_bluetooth_scan"] is False

    list_res = client.get("/community-meetings", params={"clan_id": 1})
    assert list_res.status_code == 200, list_res.text
    meeting = list_res.json()["meetings"][0]
    assert meeting["attendance_summary"]["method_counts"] == {"qr": 1}


def test_meeting_qr_window_rejects_bluetooth_method_inflation(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    _seed_meeting_entitlement()

    reminder_res = client.post(
        "/community-meetings/reminders",
        json={"clan_id": 1, "title": "Reject inflated attendance method"},
    )
    assert reminder_res.status_code == 200, reminder_res.text
    meeting_id = reminder_res.json()["meeting"]["meeting_id"]

    session_res = client.post(
        f"/community-meetings/{meeting_id}/attendance-sessions",
        json={"clan_id": 1, "method": "qr", "window_minutes": 30},
    )
    assert session_res.status_code == 200, session_res.text
    session = session_res.json()["attendance_session"]

    checkin_res = client.post(
        f"/community-meetings/{meeting_id}/attendance-check-ins",
        json={
            "clan_id": 1,
            "attendance_token": session["attendance_token"],
            "method": "bluetooth_proximity",
        },
    )
    assert checkin_res.status_code == 400, checkin_res.text
    assert "does not match the active attendance window" in checkin_res.text
