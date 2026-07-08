from __future__ import annotations

from datetime import datetime, timezone

from app.api.routes.auth import get_current_user
from app.main import app
from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, User
from app.db.notification_models import Notification, WebPushSubscription


def _seed_push_notice_community() -> None:
    with SessionLocal() as db:
        admin = User(
            id=1,
            email="push-admin@example.com",
            hashed_password="hashed",
            role="admin",
        )
        member = User(
            id=2,
            email="push-member@example.com",
            hashed_password="hashed",
            role="user",
        )
        clan = Clan(
            id=1,
            name="Push Notice Society",
            invite_code="push-notice-test",
            invite_created_at=datetime.now(timezone.utc),
            created_by_user_id=1,
        )
        db.add_all([admin, member, clan])
        db.flush()
        db.add_all(
            [
                ClanMembership(
                    id=1,
                    clan_id=1,
                    user_id=1,
                    role="admin",
                    personal_pool_balance=0,
                ),
                ClanMembership(
                    id=2,
                    clan_id=1,
                    user_id=2,
                    role="member",
                    personal_pool_balance=0,
                ),
            ]
        )
        db.commit()


def test_web_push_subscription_status_and_registration(client, monkeypatch):
    member = User(
        id=2,
        email="push-member@example.com",
        hashed_password="hashed",
        role="user",
    )
    with SessionLocal() as db:
        db.add(member)
        db.commit()

    current_member = User(
        id=2,
        email="push-member@example.com",
        hashed_password="hashed",
        role="user",
    )

    monkeypatch.setenv("GSN_WEB_PUSH_PUBLIC_KEY", "BElocalPublicKey")
    monkeypatch.setenv("GSN_WEB_PUSH_PRIVATE_KEY", "localPrivateKey")
    monkeypatch.setattr("app.services.web_push_service.webpush", lambda **kwargs: None)

    try:
        app.dependency_overrides[get_current_user] = lambda: current_member

        status_res = client.get("/web-push/status")
        assert status_res.status_code == 200, status_res.text
        status = status_res.json()
        assert status["configured"] is True
        assert status["public_key"] == "BElocalPublicKey"
        assert status["active_subscriptions"] == 0

        register_res = client.post(
            "/web-push/subscriptions",
            json={
                "endpoint": "https://push.example/subscription/one",
                "keys": {
                    "p256dh": "p256dh-key-material",
                    "auth": "auth-secret",
                },
                "permission_state": "granted",
            },
        )
        assert register_res.status_code == 200, register_res.text
        assert register_res.json()["active_subscriptions"] == 1

        with SessionLocal() as db:
            row = db.query(WebPushSubscription).one()
            assert row.user_id == 2
            assert row.is_active is True
            assert row.permission_state == "granted"
            assert row.endpoint_hash

        remove_res = client.request(
            "DELETE",
            "/web-push/subscriptions",
            json={"endpoint": "https://push.example/subscription/one"},
        )
        assert remove_res.status_code == 200, remove_res.text
        assert remove_res.json()["removed"] is True
        assert remove_res.json()["active_subscriptions"] == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_web_push_status_reports_not_configured_without_vapid_keys(
    client,
    monkeypatch,
):
    member = User(
        id=2,
        email="push-unconfigured@example.com",
        hashed_password="hashed",
        role="user",
    )
    with SessionLocal() as db:
        db.add(member)
        db.commit()

    current_member = User(
        id=2,
        email="push-unconfigured@example.com",
        hashed_password="hashed",
        role="user",
    )
    monkeypatch.delenv("GSN_WEB_PUSH_PUBLIC_KEY", raising=False)
    monkeypatch.delenv("GSN_WEB_PUSH_PRIVATE_KEY", raising=False)
    monkeypatch.delenv("VAPID_PUBLIC_KEY", raising=False)
    monkeypatch.delenv("VAPID_PRIVATE_KEY", raising=False)

    try:
        app.dependency_overrides[get_current_user] = lambda: current_member
        res = client.get("/web-push/status")
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["configured"] is False
        assert body["public_key"] is None
        assert body["active_subscriptions"] == 0
        assert "browser" in body["truth"].lower()
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_official_notice_dispatches_web_push_to_registered_member(
    client,
    monkeypatch,
):
    _seed_push_notice_community()
    admin = User(
        id=1,
        email="push-admin@example.com",
        hashed_password="hashed",
        role="admin",
    )

    sent_payloads: list[dict] = []

    def fake_send(*, subscription_info, payload):
        sent_payloads.append(
            {
                "endpoint": subscription_info["endpoint"],
                "payload": payload,
            }
        )

    monkeypatch.setenv("GSN_WEB_PUSH_PUBLIC_KEY", "BElocalPublicKey")
    monkeypatch.setenv("GSN_WEB_PUSH_PRIVATE_KEY", "localPrivateKey")
    monkeypatch.setattr("app.services.web_push_service.webpush", lambda **kwargs: None)
    monkeypatch.setattr("app.services.web_push_service._send_web_push_payload", fake_send)

    with SessionLocal() as db:
        db.add(
            WebPushSubscription(
                user_id=2,
                endpoint_hash="test-endpoint-hash",
                endpoint="https://push.example/subscription/member",
                p256dh="p256dh-key-material",
                auth="auth-secret",
                permission_state="granted",
                is_active=True,
            )
        )
        db.commit()

    try:
        app.dependency_overrides[get_current_user] = lambda: admin
        res = client.post(
            "/community-notices",
            json={"clan_id": 1, "body": "Meeting Saturday 4 pm."},
        )
        assert res.status_code == 200, res.text
        assert res.json()["notifications_created"] == 1

        assert len(sent_payloads) == 1
        assert sent_payloads[0]["endpoint"] == "https://push.example/subscription/member"
        payload = sent_payloads[0]["payload"]
        assert payload["kind"] == "community.notice.posted"
        assert payload["title"] == "Official community notice"
        assert payload["body"] == "Meeting Saturday 4 pm."
        assert payload["action_url"] == (
            "/app/marketplace?clan_id=1#marketplace-official-board"
        )

        with SessionLocal() as db:
            notification = db.query(Notification).one()
            subscription = db.query(WebPushSubscription).one()
            assert notification.user_id == 2
            assert subscription.failure_count == 0
            assert subscription.last_success_at is not None
    finally:
        app.dependency_overrides.pop(get_current_user, None)
