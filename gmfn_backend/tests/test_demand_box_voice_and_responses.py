from __future__ import annotations

import io
import json
import wave

import pytest
from sqlalchemy import text

from app.core.auth import get_current_user
from app.db.database import engine
from app.db.models import DemandAudioAttachment
from app.db.database import SessionLocal
from app.main import app


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _wav_bytes(seconds: float = 0.25, sample_rate: int = 8000) -> bytes:
    frame_count = max(1, int(seconds * sample_rate))
    output = io.BytesIO()
    with wave.open(output, "wb") as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(sample_rate)
        audio.writeframes(b"\x00\x00" * frame_count)
    return output.getvalue()


def _seed_demand_community() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users
                    (id, email, hashed_password, display_name, profile_image_url, role, gmfn_id)
                VALUES
                    (1, 'owner@example.com', 'hashed', 'Owner One', '/uploads/profile/users/owner.jpg', 'admin', 'GSN-U-OWNER'),
                    (2, 'responder@example.com', 'hashed', 'Responder Two', '/uploads/profile/users/responder.jpg', 'member', 'GSN-U-RESPONDER'),
                    (3, 'other@example.com', 'hashed', 'Other Three', NULL, 'member', 'GSN-U-OTHER'),
                    (4, 'outsider@example.com', 'hashed', 'Outsider Four', NULL, 'member', 'GSN-U-OUTSIDER')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans
                    (
                        id,
                        name,
                        marketplace_name,
                        community_code,
                        status,
                        invite_code,
                        invite_uses,
                        created_at
                    )
                VALUES (
                    1,
                    'Voice Test Clan',
                    'Voice Test Marketplace',
                    'GMFN-C-000001',
                    'active',
                    'voice-test-invite',
                    0,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships
                    (clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 'admin', 0),
                    (1, 2, 'member', 0),
                    (1, 3, 'member', 0)
                """
            )
        )


@pytest.fixture()
def acting_user():
    selected = {
        "user": Obj(
            id=1,
            email="owner@example.com",
            display_name="Owner One",
            profile_image_url="/uploads/profile/users/owner.jpg",
            role="admin",
            gmfn_id="GSN-U-OWNER",
        )
    }

    def current_user():
        return selected["user"]

    app.dependency_overrides[get_current_user] = current_user

    def select(user_id: int) -> None:
        users = {
            1: Obj(
                id=1,
                email="owner@example.com",
                display_name="Owner One",
                profile_image_url="/uploads/profile/users/owner.jpg",
                role="admin",
                gmfn_id="GSN-U-OWNER",
            ),
            2: Obj(
                id=2,
                email="responder@example.com",
                display_name="Responder Two",
                profile_image_url="/uploads/profile/users/responder.jpg",
                role="member",
                gmfn_id="GSN-U-RESPONDER",
            ),
            3: Obj(
                id=3,
                email="other@example.com",
                display_name="Other Three",
                profile_image_url=None,
                role="member",
                gmfn_id="GSN-U-OTHER",
            ),
            4: Obj(
                id=4,
                email="outsider@example.com",
                display_name="Outsider Four",
                profile_image_url=None,
                role="member",
                gmfn_id="GSN-U-OUTSIDER",
            ),
        }
        selected["user"] = users[user_id]

    yield select
    app.dependency_overrides.pop(get_current_user, None)


def _post_voice_request(client, *, client_request_id: str, seconds: float = 0.25):
    payload = {
        "clan_id": 1,
        "title": "Taxi needed",
        "description": "Please take me to the clinic.",
        "category": "Transport",
        "area": "Town centre",
        "client_request_id": client_request_id,
        "show_sender_photo": True,
    }
    return client.post(
        "/demand-box/requests/voice",
        data={"payload_json": json.dumps(payload)},
        files={"audio": ("request.wav", _wav_bytes(seconds), "audio/wav")},
    )


def test_voice_request_is_protected_and_photo_requires_explicit_consent(
    client,
    acting_user,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _seed_demand_community()

    created = _post_voice_request(
        client,
        client_request_id="voice-request-0001",
    )
    assert created.status_code == 200, created.text
    body = created.json()
    assert body["audio_attachment_id"]
    assert 0 < body["audio_duration_seconds"] <= 60
    assert body["requester_profile_image_url"] == "/uploads/profile/users/owner.jpg"
    request_id = body["id"]
    attachment_id = body["audio_attachment_id"]

    duplicate = _post_voice_request(
        client,
        client_request_id="voice-request-0001",
    )
    assert duplicate.status_code == 200, duplicate.text
    assert duplicate.json()["id"] == request_id
    assert duplicate.json()["audio_attachment_id"] == attachment_id

    with SessionLocal() as db:
        attachment = db.get(DemandAudioAttachment, attachment_id)
        assert attachment is not None
        storage_key = attachment.storage_key

    direct_static = client.get(f"/uploads/.private-demandbox/{storage_key}")
    assert direct_static.status_code == 404

    acting_user(2)
    member_playback = client.get(f"/demand-box/audio/{attachment_id}")
    assert member_playback.status_code == 200
    assert member_playback.content[:4] == b"RIFF"

    acting_user(4)
    outsider_playback = client.get(f"/demand-box/audio/{attachment_id}")
    assert outsider_playback.status_code == 404

    acting_user(1)
    plain = client.post(
        "/marketplace/requests",
        json={
            "clan_id": 1,
            "title": "Books needed",
            "category": "Books",
            "client_request_id": "plain-request-0002",
            "show_sender_photo": False,
        },
    )
    assert plain.status_code == 200, plain.text
    assert plain.json()["requester_profile_image_url"] is None


def test_private_response_exchange_and_linked_repost(
    client,
    acting_user,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _seed_demand_community()
    created = _post_voice_request(
        client,
        client_request_id="voice-request-1001",
    )
    assert created.status_code == 200, created.text
    request_id = created.json()["id"]

    acting_user(2)
    responder_reply = client.post(
        f"/demand-box/requests/{request_id}/responses",
        data={
            "payload_json": json.dumps(
                {
                    "text": "I can help after 3pm.",
                    "client_response_id": "response-key-1001",
                    "show_sender_photo": True,
                }
            )
        },
    )
    assert responder_reply.status_code == 200, responder_reply.text
    response_body = responder_reply.json()
    assert response_body["author_profile_image_url"] == (
        "/uploads/profile/users/responder.jpg"
    )

    duplicate_reply = client.post(
        f"/demand-box/requests/{request_id}/responses",
        data={
            "payload_json": json.dumps(
                {
                    "text": "This duplicate must not create a second row.",
                    "client_response_id": "response-key-1001",
                    "show_sender_photo": False,
                }
            )
        },
    )
    assert duplicate_reply.status_code == 200
    assert duplicate_reply.json()["id"] == response_body["id"]

    acting_user(3)
    unrelated_thread = client.get(
        f"/demand-box/requests/{request_id}/responses"
    )
    assert unrelated_thread.status_code == 200
    assert unrelated_thread.json() == []

    acting_user(1)
    owner_thread = client.get(f"/demand-box/requests/{request_id}/responses")
    assert owner_thread.status_code == 200
    assert len(owner_thread.json()) == 1

    owner_reply = client.post(
        f"/demand-box/requests/{request_id}/responses",
        data={
            "payload_json": json.dumps(
                {
                    "text": "Thank you. Please message me here.",
                    "client_response_id": "response-key-1002",
                    "recipient_user_id": 2,
                    "show_sender_photo": False,
                }
            )
        },
    )
    assert owner_reply.status_code == 200, owner_reply.text
    assert owner_reply.json()["recipient_user_id"] == 2
    assert owner_reply.json()["author_profile_image_url"] is None

    with engine.begin() as conn:
        messages = conn.execute(
            text(
                """
                SELECT message
                FROM notifications
                WHERE user_id = 2
                ORDER BY id ASC
                """
            )
        ).scalars().all()
    assert messages
    assert all("owner@example.com" not in message for message in messages)

    closed = client.post(
        f"/marketplace/requests/{request_id}/status",
        json={"status": "fulfilled"},
    )
    assert closed.status_code == 200, closed.text

    repost = client.post(
        f"/demand-box/requests/{request_id}/repost",
        json={"client_request_id": "repost-key-1001"},
    )
    assert repost.status_code == 200, repost.text
    repost_body = repost.json()
    assert repost_body["id"] != request_id
    assert repost_body["reposted_from_request_id"] == request_id
    assert repost_body["relay_consent_granted"] is False
    assert repost_body["requester_profile_image_url"] is None
    assert repost_body["audio_attachment_id"]

    duplicate_repost = client.post(
        f"/demand-box/requests/{request_id}/repost",
        json={"client_request_id": "repost-key-1001"},
    )
    assert duplicate_repost.status_code == 200
    assert duplicate_repost.json()["id"] == repost_body["id"]

    history = client.get(f"/demand-box/requests/{request_id}/history")
    assert history.status_code == 200
    event_types = {
        activity["event_type"] for activity in history.json()["activities"]
    }
    assert {"created", "voice_added", "response_added", "fulfilled", "reposted"} <= event_types


def test_voice_request_rejects_unplayable_and_overlong_audio(
    client,
    acting_user,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _seed_demand_community()
    payload = {
        "clan_id": 1,
        "title": "Transport needed",
        "category": "Transport",
        "client_request_id": "invalid-voice-0001",
    }
    invalid = client.post(
        "/demand-box/requests/voice",
        data={"payload_json": json.dumps(payload)},
        files={"audio": ("fake.wav", b"not-audio", "audio/wav")},
    )
    assert invalid.status_code == 400

    payload["client_request_id"] = "mismatched-voice-0002"
    mismatched = client.post(
        "/demand-box/requests/voice",
        data={"payload_json": json.dumps(payload)},
        files={"audio": ("claimed.mp3", _wav_bytes(), "audio/mpeg")},
    )
    assert mismatched.status_code == 400

    payload["client_request_id"] = "overlong-voice-0003"
    overlong = client.post(
        "/demand-box/requests/voice",
        data={"payload_json": json.dumps(payload)},
        files={"audio": ("long.wav", _wav_bytes(61), "audio/wav")},
    )
    assert overlong.status_code == 400
    assert "60 seconds" in overlong.json()["detail"]
