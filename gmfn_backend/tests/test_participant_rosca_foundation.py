from __future__ import annotations

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.auth import get_current_user
from app.db.database import engine
from app.main import app


class _CurrentUser:
    def __init__(self, user_id: int, role: str = "user"):
        self.id = int(user_id)
        self.email = f"participant-rosca-{int(user_id)}@example.com"
        self.role = role


def _override_current_user(user_id: int, role: str = "user") -> None:
    app.dependency_overrides[get_current_user] = lambda: _CurrentUser(user_id, role=role)


def _clear_current_user_override() -> None:
    app.dependency_overrides.pop(get_current_user, None)


def _table_count(table_name: str) -> int:
    with engine.begin() as conn:
        return int(conn.execute(text(f"SELECT COUNT(*) FROM {table_name}")).scalar_one())


def _seed_base() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, role, gmfn_id, display_name, trust_score)
                VALUES
                    (1, 'coord@example.com', 'hashed', 'member', 'GSN-U-COORD', 'Coordinator', 10),
                    (2, 'participant-a@example.com', 'hashed', 'member', 'GSN-U-A', 'Participant A', 10),
                    (3, 'participant-b@example.com', 'hashed', 'member', 'GSN-U-B', 'Participant B', 10),
                    (4, 'origin-admin@example.com', 'hashed', 'member', 'GSN-U-ADMIN', 'Origin Admin', 10)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, community_code, status, invite_code, invite_uses, created_at)
                VALUES (1, 'Origin Community', 'Origin Marketplace', 'GMFN-C-000001', 'active', 'origin-invite', 0, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance, left_at)
                VALUES
                    (1, 1, 1, 'member', 0, NULL),
                    (2, 1, 2, 'member', 0, NULL),
                    (3, 1, 3, 'member', 0, CURRENT_TIMESTAMP),
                    (4, 1, 4, 'admin', 0, NULL)
                """
            )
        )


def _draft_payload(**overrides):
    payload = {
        "name": "Participant ROSCA",
        "amount": "100.00",
        "currency": "NGN",
        "frequency_unit": "monthly",
        "frequency_interval": 1,
        "participant_count_required": 2,
        "round_count": 2,
        "start_rule": "on_all_acceptance",
        "rotation_method": "explicit_order",
        "origin_clan_id": 1,
        "note": "Agreement only",
    }
    payload.update(overrides)
    return payload


def _create_run(client) -> dict:
    _override_current_user(1)
    response = client.post("/rosca-runs/drafts", json=_draft_payload())
    assert response.status_code == 200, response.text
    return response.json()


def _invite(client, run_id: int, gsn_id: str, rotation_position: int) -> dict:
    _override_current_user(1)
    response = client.post(
        f"/rosca-runs/{run_id}/invitations",
        json={
            "invitee_gsn_id": gsn_id,
            "rotation_position": rotation_position,
            "idempotency_key": f"invite-{gsn_id}-{rotation_position}",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def _accept(client, run: dict, user_id: int) -> dict:
    _override_current_user(user_id)
    response = client.post(
        f"/rosca-runs/{run['id']}/participants/me/accept",
        json={
            "terms_version": run["terms_version"],
            "terms_hash": run["terms_hash"],
            "acceptance_source": "app",
            "idempotency_key": f"accept-{user_id}",
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def _active_run(client) -> dict:
    run = _create_run(client)
    _invite(client, run["id"], "GSN-U-A", 1)
    _invite(client, run["id"], "GSN-U-B", 2)
    _accept(client, run, 2)
    _accept(client, run, 3)
    _override_current_user(1)
    response = client.post(f"/rosca-runs/{run['id']}/activate")
    assert response.status_code == 200, response.text
    return response.json()


def test_invitation_creates_no_obligations_or_legacy_events(client):
    _seed_base()
    run = _create_run(client)

    invite = _invite(client, run["id"], "GSN-U-A", 1)

    assert invite["status"] == "invited"
    assert _table_count("rosca_obligations") == 0
    assert _table_count("expected_payments") == 0
    assert _table_count("pool_events") == 0
    assert _table_count("trust_events") == 0

    _clear_current_user_override()


def test_accept_and_decline_are_intended_participant_only_and_non_portable(client):
    _seed_base()
    run = _create_run(client)
    _invite(client, run["id"], "GSN-U-A", 1)
    _invite(client, run["id"], "GSN-U-B", 2)

    _override_current_user(4)
    forbidden = client.post(
        f"/rosca-runs/{run['id']}/participants/me/accept",
        json={"terms_version": run["terms_version"], "terms_hash": run["terms_hash"], "acceptance_source": "app"},
    )
    assert forbidden.status_code == 403

    accepted = _accept(client, run, 2)
    assert accepted["status"] == "accepted"
    assert accepted["accepted_terms_version"] == run["terms_version"]
    assert accepted["accepted_terms_hash"] == run["terms_hash"]

    _override_current_user(3)
    declined = client.post(
        f"/rosca-runs/{run['id']}/participants/me/decline",
        json={"reason": "Not this cycle", "idempotency_key": "decline-3"},
    )
    assert declined.status_code == 200, declined.text
    assert declined.json()["status"] == "declined"
    assert _table_count("trust_events") == 0

    _clear_current_user_override()


def test_terms_change_before_activation_requires_renewed_acceptance(client):
    _seed_base()
    run = _create_run(client)
    _invite(client, run["id"], "GSN-U-A", 1)
    _accept(client, run, 2)

    _override_current_user(1)
    changed = client.patch(
        f"/rosca-runs/{run['id']}/terms",
        json=_draft_payload(amount="125.00"),
    )
    assert changed.status_code == 200, changed.text
    changed_run = changed.json()
    assert changed_run["terms_version"] == run["terms_version"] + 1
    assert changed_run["terms_hash"] != run["terms_hash"]
    participant = next(row for row in changed_run["participants"] if row["user_id"] == 2)
    assert participant["status"] == "invited"
    assert participant["accepted_terms_hash"] is None

    _clear_current_user_override()


def test_activation_creates_dedicated_obligations_only_and_is_idempotent(client):
    _seed_base()
    active = _active_run(client)

    assert active["status"] == "active"
    assert len(active["obligations"]) == 6
    assert {row["obligation_type"] for row in active["obligations"]} == {"contribution", "payout"}
    assert _table_count("rosca_obligations") == 6
    assert _table_count("expected_payments") == 0
    assert _table_count("pool_events") == 0
    assert _table_count("trust_events") == 0

    _override_current_user(1)
    second = client.post(f"/rosca-runs/{active['id']}/activate")
    assert second.status_code == 200, second.text
    assert _table_count("rosca_obligations") == 6

    _clear_current_user_override()


def test_duplicate_participant_and_duplicate_rotation_are_rejected(client):
    _seed_base()
    run = _create_run(client)
    _invite(client, run["id"], "GSN-U-A", 1)

    _override_current_user(1)
    duplicate_user = client.post(
        f"/rosca-runs/{run['id']}/invitations",
        json={"invitee_gsn_id": "GSN-U-A", "rotation_position": 2},
    )
    assert duplicate_user.status_code == 409

    duplicate_rotation = client.post(
        f"/rosca-runs/{run['id']}/invitations",
        json={"invitee_gsn_id": "GSN-U-B", "rotation_position": 1},
    )
    assert duplicate_rotation.status_code == 409

    _clear_current_user_override()


def test_contribution_provenance_distinguishes_reported_from_confirmed(client):
    _seed_base()
    active = _active_run(client)
    contribution = next(
        row
        for row in active["obligations"]
        if row["obligation_type"] == "contribution" and row["user_id"] == 2 and row["round_number"] == 1
    )

    _override_current_user(1)
    reported = client.post(
        f"/rosca-runs/{active['id']}/obligations/{contribution['id']}/contribution-records",
        json={"amount_recorded": "100.00", "note": "Coordinator saw payment", "idempotency_key": "record-1"},
    )
    assert reported.status_code == 200, reported.text
    assert reported.json()["state"] == "reported"
    assert reported.json()["reported_by_user_id"] == 1
    assert reported.json()["confirmed_by_user_id"] is None

    duplicate = client.post(
        f"/rosca-runs/{active['id']}/obligations/{contribution['id']}/contribution-records",
        json={"amount_recorded": "100.00", "note": "Duplicate", "idempotency_key": "record-1"},
    )
    assert duplicate.status_code == 200, duplicate.text
    assert duplicate.json()["state"] == "reported"
    assert _table_count("trust_events") == 0

    second_contribution = next(
        row
        for row in active["obligations"]
        if row["obligation_type"] == "contribution" and row["user_id"] == 2 and row["round_number"] == 2
    )
    _override_current_user(2)
    confirmed = client.post(
        f"/rosca-runs/{active['id']}/obligations/{second_contribution['id']}/contribution-records",
        json={"amount_recorded": "100.00", "note": "I paid", "idempotency_key": "record-2"},
    )
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["state"] == "confirmed"
    assert confirmed.json()["confirmed_by_user_id"] == 2
    assert _table_count("trust_events") == 0

    _clear_current_user_override()


def test_origin_community_admin_gets_no_participant_rosca_authority(client):
    _seed_base()
    run = _create_run(client)

    _override_current_user(4)
    response = client.post(
        f"/rosca-runs/{run['id']}/invitations",
        json={"invitee_gsn_id": "GSN-U-A", "rotation_position": 1},
    )
    assert response.status_code == 403

    _clear_current_user_override()


def test_origin_membership_loss_does_not_remove_intended_participant_acceptance(client):
    _seed_base()
    run = _create_run(client)
    _invite(client, run["id"], "GSN-U-B", 1)

    accepted = _accept(client, run, 3)

    assert accepted["status"] == "accepted"
    assert _table_count("trust_events") == 0

    _clear_current_user_override()



def test_double_accept_is_idempotent_and_revoked_invitation_cannot_be_accepted(client):
    _seed_base()
    run = _create_run(client)
    first_invite = _invite(client, run["id"], "GSN-U-A", 1)
    second_invite = _invite(client, run["id"], "GSN-U-B", 2)

    first_accept = _accept(client, run, 2)
    second_accept = _accept(client, run, 2)
    assert second_accept["id"] == first_accept["id"]
    assert second_accept["status"] == "accepted"
    assert _table_count("trust_events") == 0

    _override_current_user(1)
    revoked = client.post(f"/rosca-runs/{run['id']}/participants/{second_invite['id']}/revoke")
    assert revoked.status_code == 200, revoked.text
    assert revoked.json()["status"] == "revoked"

    _override_current_user(3)
    late_accept = client.post(
        f"/rosca-runs/{run['id']}/participants/me/accept",
        json={"terms_version": run["terms_version"], "terms_hash": run["terms_hash"], "acceptance_source": "app"},
    )
    assert late_accept.status_code == 409
    assert _table_count("trust_events") == 0

    _clear_current_user_override()


def test_obligation_uniqueness_is_enforced_per_participant_round_and_type(client):
    _seed_base()
    active = _active_run(client)
    contribution = next(row for row in active["obligations"] if row["obligation_type"] == "contribution")

    with pytest.raises(IntegrityError):
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO rosca_obligations (
                        rosca_run_id,
                        participant_id,
                        user_id,
                        round_number,
                        obligation_type,
                        amount,
                        currency,
                        amount_recorded,
                        amount_outstanding,
                        state,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        :run_id,
                        :participant_id,
                        :user_id,
                        :round_number,
                        :obligation_type,
                        100,
                        'NGN',
                        0,
                        100,
                        'scheduled',
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    )
                    """
                ),
                {
                    "run_id": contribution["rosca_run_id"],
                    "participant_id": contribution["participant_id"],
                    "user_id": contribution["user_id"],
                    "round_number": contribution["round_number"],
                    "obligation_type": contribution["obligation_type"],
                },
            )

    _clear_current_user_override()


def _notification_rows() -> list[dict]:
    with engine.begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT id, user_id, kind, title, message, action_url, action_label, is_read
                FROM notifications
                ORDER BY id ASC
                """
            )
        ).mappings().all()
    return [dict(row) for row in rows]


def _rosca_notification_for_user(client, user_id: int, run_id: int) -> dict:
    _override_current_user(user_id)
    response = client.get("/notifications/me")
    assert response.status_code == 200, response.text
    items = [
        item
        for item in response.json()["items"]
        if item["kind"] == "participant_rosca.invitation"
        and item.get("rosca_invitation", {}).get("run_id") == int(run_id)
    ]
    assert len(items) == 1
    return items[0]


def test_participant_rosca_invitation_creates_one_privacy_safe_notification_and_attention(client):
    _seed_base()
    run = _create_run(client)
    invite = _invite(client, run["id"], "GSN-U-A", 1)

    rows = _notification_rows()
    assert len(rows) == 1
    row = rows[0]
    assert row["user_id"] == 2
    assert row["kind"] == "participant_rosca.invitation"
    assert row["title"] == "ROSCA invitation"
    assert row["message"] == "Coordinator invited you to Participant ROSCA."
    assert row["action_url"] == f"/app/commitments?rosca_run_id={run['id']}"
    assert row["action_label"] == "Review invitation"
    assert row["is_read"] in {False, 0}
    flat = str(row).lower()
    assert "gsn-u-a" not in flat
    assert "participant-a@example" not in flat
    assert "participant_id" not in row["action_url"]
    assert "invitee" not in row["action_url"]

    item = _rosca_notification_for_user(client, 2, run["id"])
    assert item["action_label"] == "Review invitation"
    assert item["action_url"] == f"/app/commitments?rosca_run_id={run['id']}"
    assert item["rosca_invitation"] == {
        "run_id": run["id"],
        "status": "invited",
        "run_status": "inviting",
        "actionable": True,
    }

    _override_current_user(2)
    attention = client.get("/attention-spine/me")
    assert attention.status_code == 200, attention.text
    notification_signals = [signal for signal in attention.json()["signals"] if signal["id"].startswith("notification:")]
    assert any(signal["summary"] == "ROSCA invitation" and signal["actionTo"] == f"/app/commitments?rosca_run_id={run['id']}" for signal in notification_signals)

    _override_current_user(3)
    other_user_notifications = client.get("/notifications/me")
    assert other_user_notifications.status_code == 200, other_user_notifications.text
    assert [item for item in other_user_notifications.json()["items"] if item["kind"] == "participant_rosca.invitation"] == []
    other_user_run = client.get(f"/rosca-runs/{run['id']}")
    assert other_user_run.status_code == 403
    other_user_accept = client.post(
        f"/rosca-runs/{run['id']}/participants/me/accept",
        json={"terms_version": run["terms_version"], "terms_hash": run["terms_hash"], "acceptance_source": "app"},
    )
    assert other_user_accept.status_code == 403
    assert _table_count("trust_events") == 0

    _override_current_user(1)
    retry = client.post(
        f"/rosca-runs/{run['id']}/invitations",
        json={"invitee_gsn_id": "GSN-U-A", "rotation_position": 1, "idempotency_key": "invite-GSN-U-A-1"},
    )
    assert retry.status_code == 200, retry.text
    assert _table_count("notifications") == 1
    assert _table_count("trust_events") == 0

    _clear_current_user_override()


def test_participant_rosca_accept_decline_revoke_and_cancel_stale_invitation_notifications(client):
    _seed_base()
    accepted_run = _create_run(client)
    _invite(client, accepted_run["id"], "GSN-U-A", 1)
    accepted_item = _rosca_notification_for_user(client, 2, accepted_run["id"])
    assert accepted_item["rosca_invitation"]["actionable"] is True

    _accept(client, accepted_run, 2)
    accepted_after = _rosca_notification_for_user(client, 2, accepted_run["id"])
    assert accepted_after["is_read"] is True
    assert accepted_after["action_url"] is None
    assert accepted_after["action_label"] is None
    assert accepted_after["rosca_invitation"]["status"] == "accepted"
    assert accepted_after["rosca_invitation"]["actionable"] is False

    declined_run = _create_run(client)
    _invite(client, declined_run["id"], "GSN-U-B", 1)
    _override_current_user(3)
    declined = client.post(
        f"/rosca-runs/{declined_run['id']}/participants/me/decline",
        json={"reason": "Not now", "idempotency_key": "decline-notification-3"},
    )
    assert declined.status_code == 200, declined.text
    declined_after = _rosca_notification_for_user(client, 3, declined_run["id"])
    assert declined_after["is_read"] is True
    assert declined_after["action_url"] is None
    assert declined_after["rosca_invitation"]["status"] == "declined"
    assert declined_after["rosca_invitation"]["actionable"] is False

    revoked_run = _create_run(client)
    revoked_participant = _invite(client, revoked_run["id"], "GSN-U-A", 1)
    _override_current_user(1)
    revoked = client.post(f"/rosca-runs/{revoked_run['id']}/participants/{revoked_participant['id']}/revoke")
    assert revoked.status_code == 200, revoked.text
    revoked_after = _rosca_notification_for_user(client, 2, revoked_run["id"])
    assert revoked_after["is_read"] is True
    assert revoked_after["action_url"] is None
    assert revoked_after["rosca_invitation"]["status"] == "revoked"
    assert revoked_after["rosca_invitation"]["actionable"] is False

    cancelled_run = _create_run(client)
    _invite(client, cancelled_run["id"], "GSN-U-B", 1)
    _override_current_user(1)
    cancelled = client.post(f"/rosca-runs/{cancelled_run['id']}/cancel")
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()["status"] == "cancelled"
    cancelled_after = _rosca_notification_for_user(client, 3, cancelled_run["id"])
    assert cancelled_after["is_read"] is True
    assert cancelled_after["action_url"] is None
    assert cancelled_after["rosca_invitation"]["run_status"] == "cancelled"
    assert cancelled_after["rosca_invitation"]["actionable"] is False

    late_accept = client.post(
        f"/rosca-runs/{cancelled_run['id']}/participants/me/accept",
        json={"terms_version": cancelled_run["terms_version"], "terms_hash": cancelled_run["terms_hash"], "acceptance_source": "app"},
    )
    assert late_accept.status_code == 403 or late_accept.status_code == 409
    assert _table_count("trust_events") == 0

    _clear_current_user_override()
