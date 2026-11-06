from __future__ import annotations

import io
import json
import subprocess
import wave

import imageio_ffmpeg
import pytest
from sqlalchemy import text

from app.core.auth import get_current_user
from app.db.database import SessionLocal, engine
from app.db.models import CommunityNoticeVoiceAttachment
from app.main import app
from app.services.marketplace_media_cleanup_service import (
    process_marketplace_media_deletion_tasks,
)


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


def _durationless_webm_bytes(tmp_path) -> bytes:
    output_path = tmp_path / "android-community-voice.webm"
    result = subprocess.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(),
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=880:duration=1.2",
            "-c:a",
            "libopus",
            "-f",
            "webm",
            "-live",
            "1",
            str(output_path),
        ],
        capture_output=True,
        timeout=20,
        check=False,
    )
    assert result.returncode == 0, result.stderr.decode(errors="replace")
    return output_path.read_bytes()


def _seed_notice_voice_context(*, approval_required: bool = False) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users
                    (id, email, hashed_password, display_name, role, gmfn_id)
                VALUES
                    (1, 'notice-admin@example.com', 'hashed', 'Notice Admin', 'user', 'GSN-U-NOTICE-ADMIN'),
                    (2, 'notice-member@example.com', 'hashed', 'Notice Member', 'user', 'GSN-U-NOTICE-MEMBER'),
                    (3, 'notice-outsider@example.com', 'hashed', 'Notice Outsider', 'user', 'GSN-U-NOTICE-OUTSIDER')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans
                    (id, name, marketplace_name, community_code, status, invite_code, invite_uses, notice_posting_policy, created_at)
                VALUES
                    (1, 'Voice Community', 'Voice Community Market', 'GMFN-C-NOTICE-VOICE', 'active', 'notice-voice-invite', 0, 'members', CURRENT_TIMESTAMP)
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
                    (1, 2, 'member', 0)
                """
            )
        )
        if approval_required:
            conn.execute(
                text(
                    """
                    INSERT INTO trust_events
                        (event_type, clan_id, actor_user_id, subject_user_id, meta_json, created_at)
                    VALUES
                        (
                            'community.governance_profile_selected',
                            1,
                            1,
                            1,
                            :meta_json,
                            CURRENT_TIMESTAMP
                        )
                    """
                ),
                {
                    "meta_json": json.dumps(
                        {
                            "preset_key": "voice-community",
                            "policies": {
                                "enable_community_records": True,
                                "allow_member_record_submissions": True,
                                "require_admin_approval_for_records": True,
                            },
                        }
                    )
                },
            )


@pytest.fixture()
def acting_notice_user():
    selected = {"user_id": 1}

    def current_user():
        users = {
            1: Obj(id=1, email="notice-admin@example.com", display_name="Notice Admin", role="user", gmfn_id="GSN-U-NOTICE-ADMIN"),
            2: Obj(id=2, email="notice-member@example.com", display_name="Notice Member", role="user", gmfn_id="GSN-U-NOTICE-MEMBER"),
            3: Obj(id=3, email="notice-outsider@example.com", display_name="Notice Outsider", role="user", gmfn_id="GSN-U-NOTICE-OUTSIDER"),
        }
        return users[selected["user_id"]]

    app.dependency_overrides[get_current_user] = current_user

    def select(user_id: int) -> None:
        selected["user_id"] = int(user_id)

    yield select
    app.dependency_overrides.pop(get_current_user, None)


def test_voice_only_notice_accepts_android_webm_and_follows_public_delete_boundary(
    client,
    acting_notice_user,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _seed_notice_voice_context()
    payload = {
        "clan_id": 1,
        "body": "",
        "public_qr_enabled": True,
    }
    created = client.post(
        "/community-notices/voice",
        data={"payload_json": json.dumps(payload)},
        files={
            "audio": (
                "android-community-voice.webm",
                _durationless_webm_bytes(tmp_path),
                "audio/webm;codecs=opus",
            )
        },
    )
    assert created.status_code == 200, created.text
    notice = created.json()["notice"]
    attachment_id = int(notice["voice_attachment_id"])
    assert notice["body"] == "Voice announcement"
    assert 1.0 <= float(notice["voice_duration_seconds"]) <= 1.3
    assert notice["voice_speaker_gmfn_id"] == "GSN-U-NOTICE-ADMIN"
    assert notice["voice_can_delete"] is True

    with SessionLocal() as db:
        attachment = db.get(CommunityNoticeVoiceAttachment, attachment_id)
        assert attachment is not None
        storage_key = attachment.storage_key

    assert client.get(f"/uploads/.private-community-notice-voice/{storage_key}").status_code == 404
    assert client.get(f"/community-notices/voice/protected/{attachment_id}").status_code == 200
    assert client.get(f"/community-notices/voice/public/{attachment_id}").status_code == 200

    public_notice = client.get(
        f"/community-notices/public/{notice['public_code']}"
    )
    assert public_notice.status_code == 200, public_notice.text
    assert public_notice.json()["notice"]["voice_attachment_id"] == attachment_id
    assert public_notice.json()["notice"]["voice_can_delete"] is False

    acting_notice_user(3)
    assert client.get(f"/community-notices/voice/protected/{attachment_id}").status_code == 403
    assert client.post(
        f"/community-notices/voice/{attachment_id}/delete",
        json={"confirmation": "DELETE VOICE NOTE"},
    ).status_code == 403

    acting_notice_user(1)
    deleted = client.post(
        f"/community-notices/voice/{attachment_id}/delete",
        json={"confirmation": "DELETE VOICE NOTE"},
    )
    assert deleted.status_code == 200, deleted.text
    assert client.get(f"/community-notices/voice/public/{attachment_id}").status_code == 404
    listed = client.get("/community-notices", params={"clan_id": 1}).json()["notices"][0]
    assert listed["voice_attachment_id"] is None
    assert listed["voice_deleted_at"]

    with SessionLocal() as db:
        assert process_marketplace_media_deletion_tasks(db, limit=10) == [
            {
                "media_url": f"/uploads/.private-community-notice-voice/{storage_key}",
                "status": "deleted",
                "provider": "local",
            }
        ]


def test_member_voice_submission_moves_to_published_notice_after_officer_approval(
    client,
    acting_notice_user,
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _seed_notice_voice_context(approval_required=True)
    acting_notice_user(2)
    created = client.post(
        "/community-notices/voice",
        data={
            "payload_json": json.dumps(
                {
                    "clan_id": 1,
                    "body": "Village water meeting update.",
                    "public_qr_enabled": True,
                }
            )
        },
        files={"audio": ("community-voice.wav", _wav_bytes(), "audio/wav")},
    )
    assert created.status_code == 200, created.text
    created_body = created.json()
    assert created_body["submitted_for_review"] is True
    submission = created_body["submission"]
    submission_id = int(submission["submission_event_id"])
    attachment_id = int(submission["voice_attachment_id"])
    assert client.get(f"/community-notices/voice/protected/{attachment_id}").status_code == 200
    assert client.get(f"/community-notices/voice/public/{attachment_id}").status_code == 404

    acting_notice_user(1)
    queue = client.get("/community-notices/review-queue", params={"clan_id": 1})
    assert queue.status_code == 200, queue.text
    assert queue.json()["submissions"][0]["voice_attachment_id"] == attachment_id
    assert client.get(f"/community-notices/voice/protected/{attachment_id}").status_code == 200

    approved = client.post(
        f"/community-notices/review-queue/{submission_id}/decision",
        json={"clan_id": 1, "decision": "approve"},
    )
    assert approved.status_code == 200, approved.text
    notice = approved.json()["notice"]
    assert notice["voice_attachment_id"] == attachment_id
    assert notice["voice_speaker_gmfn_id"] == "GSN-U-NOTICE-MEMBER"
    assert notice["voice_can_delete"] is False
    assert client.get(f"/community-notices/voice/public/{attachment_id}").status_code == 200

    with SessionLocal() as db:
        attachment = db.get(CommunityNoticeVoiceAttachment, attachment_id)
        assert attachment is not None
        assert attachment.event_kind == "notice"
        assert attachment.source_submission_event_id == submission_id
        assert attachment.event_id == int(notice["event_id"])
