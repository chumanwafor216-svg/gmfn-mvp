from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.database import engine


def test_attention_spine_summarizes_server_owned_attention(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    now = datetime.now(timezone.utc)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO notifications (
                    user_id,
                    kind,
                    title,
                    message,
                    action_url,
                    action_label,
                    is_read,
                    created_at
                )
                VALUES (
                    1,
                    'approval_request',
                    'Pending join request',
                    'A member is waiting for admin review.',
                    '/app/community/1/join-requests?request_id=7',
                    'Review',
                    0,
                    :created_at
                )
                """
            ),
            {"created_at": now},
        )
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type,
                    clan_id,
                    actor_user_id,
                    subject_user_id,
                    meta_json,
                    created_at
                )
                VALUES (
                    'community.notice.posted',
                    1,
                    1,
                    1,
                    :meta_json,
                    :created_at
                )
                """
            ),
            {
                "created_at": now,
                "meta_json": json.dumps(
                    {
                        "body": "End of year planning meeting.",
                        "expires_at": (now + timedelta(days=3)).isoformat(),
                    }
                ),
            },
        )
        conn.execute(
            text(
                """
                INSERT INTO trust_events (
                    event_type,
                    clan_id,
                    actor_user_id,
                    subject_user_id,
                    meta_json,
                    created_at
                )
                VALUES (
                    'community.meeting.reminder_created',
                    1,
                    1,
                    1,
                    :meta_json,
                    :created_at
                )
                """
            ),
            {
                "created_at": now,
                "meta_json": json.dumps(
                    {
                        "meeting_id": "MTG-C1-TEST",
                        "title": "Monthly management meeting",
                        "scheduled_at": (now + timedelta(days=1)).isoformat(),
                        "action_url": "/app/shop-control?clan_id=1&meeting_id=MTG-C1-TEST#shop-control-community-packages",
                    }
                ),
            },
        )

    res = client.get("/attention-spine/me", params={"clan_id": 1})

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["engineReady"] is True
    assert body["version"] == "attention_spine_v1"
    assert body["readClanIds"] == [1]
    assert body["sourceStatus"]["focusCommitments"] == "frontend_local_until_persistence_contract"
    assert "does not create a second inbox" in body["boundary"]

    signals = body["signals"]
    sources = {row["source"] for row in signals}
    assert {"action_inbox", "bulletin", "meeting"}.issubset(sources)
    assert body["summary"]["counts"]["red"] >= 1
    assert body["summary"]["workCount"] >= 2
    assert body["summary"]["nextSignal"]["actionTo"]


def test_attention_spine_is_read_only_for_notifications(
    client,
    override_current_user,
    seed_clan_admin_membership,
):
    now = datetime.now(timezone.utc)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO notifications (
                    user_id,
                    kind,
                    title,
                    message,
                    action_url,
                    action_label,
                    is_read,
                    created_at
                )
                VALUES (
                    1,
                    'assistant.reminder',
                    'Check pending support actions',
                    'A support action is waiting.',
                    '/app/loans',
                    'Open Loans & Support',
                    0,
                    :created_at
                )
                """
            ),
            {"created_at": now},
        )

    res = client.get("/attention-spine/me")
    assert res.status_code == 200, res.text

    with engine.begin() as conn:
        unread_count = conn.execute(
            text("SELECT COUNT(*) FROM notifications WHERE user_id = 1 AND is_read = 0")
        ).scalar_one()

    assert unread_count == 1
