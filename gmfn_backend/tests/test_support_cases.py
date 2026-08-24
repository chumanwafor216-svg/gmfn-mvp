from app.core.auth import get_current_user
from app.db.database import SessionLocal, engine
from app.db.models import SupportCase, SupportCaseMessage
from app.db.notification_models import Notification
from tests.conftest import Obj, app
from sqlalchemy import text


def _seed_support_users():
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role, display_name, gmfn_id)
                VALUES
                  (1, 'member@example.com', 'hashed', 'user', 'Member One', 'GMFN-U-MEMBER1'),
                  (2, 'admin@example.com', 'hashed', 'admin', 'Admin Two', 'GMFN-U-ADMIN2'),
                  (3, 'other@example.com', 'hashed', 'user', 'Other User', 'GMFN-U-OTHER3')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clans (
                  id, name, invite_code, community_code, status, invite_uses, created_at
                )
                VALUES (1, 'Support Test Clan', 'support-invite', 'GMFN-C-SUPPORT', 'active', 0, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES
                  (1, 1, 1, 'user', 0),
                  (2, 1, 2, 'admin', 0)
                """
            )
        )


def _as_user(user_id: int, role: str):
    def fake_current_user():
        return Obj(id=user_id, email=f'user{user_id}@example.com', role=role)

    app.dependency_overrides[get_current_user] = fake_current_user


def _clear_user_override():
    app.dependency_overrides.pop(get_current_user, None)


def test_user_can_create_support_case_and_admin_is_notified(client):
    _seed_support_users()
    _as_user(1, 'user')
    try:
        response = client.post(
            '/support-cases',
            json={
                'issue_type': 'technical',
                'subject': 'Upload button is stuck',
                'message': 'I tried to upload a shop picture and it failed.',
                'clan_id': 1,
                'source_path': '/app/shop-control',
            },
        )
    finally:
        _clear_user_override()

    assert response.status_code == 201, response.text
    payload = response.json()
    case_payload = payload['case']
    assert case_payload['status'] == 'waiting_admin'
    assert case_payload['issue_type'] == 'technical'
    assert case_payload['messages'][0]['body'] == 'I tried to upload a shop picture and it failed.'
    assert payload['admin_notifications_created'] == 1

    with SessionLocal() as db:
        row = db.query(SupportCase).one()
        assert row.requester_user_id == 1
        assert row.clan_id == 1
        notice = db.query(Notification).filter(Notification.kind == 'support_case.opened').one()
        assert notice.user_id == 2
        assert '/app/command-center/support' in notice.action_url


def test_admin_can_reply_and_resolve_support_case(client):
    _seed_support_users()
    _as_user(1, 'user')
    try:
        created = client.post(
            '/support-cases',
            json={
                'issue_type': 'community',
                'subject': 'I cannot find my notice',
                'message': 'The notice board is difficult to find.',
                'clan_id': 1,
            },
        )
    finally:
        _clear_user_override()
    assert created.status_code == 201, created.text
    case_id = created.json()['case']['id']

    _as_user(2, 'admin')
    try:
        queue = client.get('/support-cases/admin/queue?status=waiting_admin')
        reply = client.post(
            f'/support-cases/{case_id}/messages',
            json={'body': 'Open Community Home, then Action Inbox if the notice was sent to you.'},
        )
        resolved = client.post(
            f'/support-cases/admin/{case_id}/status',
            json={'status': 'resolved', 'note': 'User was guided to the notice route.'},
        )
    finally:
        _clear_user_override()

    assert queue.status_code == 200, queue.text
    assert queue.json()['counts']['waiting_admin'] == 1
    assert reply.status_code == 201, reply.text
    assert reply.json()['case']['status'] == 'waiting_user'
    assert resolved.status_code == 200, resolved.text
    assert resolved.json()['case']['status'] == 'resolved'
    assert resolved.json()['case']['resolved_at']

    with SessionLocal() as db:
        messages = db.query(SupportCaseMessage).filter(SupportCaseMessage.support_case_id == case_id).all()
        assert len(messages) == 3
        requester_notices = (
            db.query(Notification)
            .filter(Notification.user_id == 1)
            .filter(Notification.kind.in_(['support_case.admin_reply', 'support_case.status_updated']))
            .all()
        )
        assert len(requester_notices) == 2
        assert all('/app/help' in row.action_url for row in requester_notices)


def test_user_cannot_open_another_users_support_case(client):
    _seed_support_users()
    _as_user(1, 'user')
    try:
        created = client.post(
            '/support-cases',
            json={
                'issue_type': 'other',
                'subject': 'Private support case',
                'message': 'Only I should see this.',
                'clan_id': 1,
            },
        )
    finally:
        _clear_user_override()
    assert created.status_code == 201, created.text
    case_id = created.json()['case']['id']

    _as_user(3, 'user')
    try:
        response = client.get(f'/support-cases/{case_id}')
    finally:
        _clear_user_override()

    assert response.status_code == 403


