from __future__ import annotations

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.api.routes import marketplace
from app.core.security import create_access_token
from app.db.database import engine


def _seed_commercial_spotlight() -> None:
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id)
            VALUES
                (1, 'advert-owner@example.com', 'hashed', 'Advert Owner', 'user', 'GMFN-U-ADOWNER'),
                (2, 'advert-viewer@example.com', 'hashed', 'Advert Viewer', 'user', 'GMFN-U-ADVIEWER'),
                (3, 'advert-other@example.com', 'hashed', 'Other Viewer', 'user', 'GMFN-U-ADOTHER')
        """))
        conn.execute(text("""
            INSERT INTO clans (id, name, marketplace_name, invite_code, community_code)
            VALUES (1, 'Advert Community', 'Advert Business Area', 'ADVERT1', 'GMFN-C-ADVERT1')
        """))
        conn.execute(text("""
            INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
            VALUES
                (1, 1, 1, 'member', 0),
                (2, 1, 2, 'member', 0),
                (3, 1, 3, 'member', 0)
        """))
        conn.execute(text("""
            INSERT INTO spotlight_campaigns (
                id, owner_user_id, origin_clan_id, content_kind,
                content_fingerprint, status, serving_status, source_kind,
                commercial_mode, distribution_scope, activated_at
            ) VALUES (
                1, 1, 1, 'broadcast_snapshot', 'advert-preference-test',
                'active', 'serving', 'gsn_house', 'paid',
                'direct_communities', CURRENT_TIMESTAMP
            )
        """))
        conn.execute(text("""
            INSERT INTO marketplace_broadcasts (
                id, spotlight_campaign_id, clan_id, author_user_id,
                message, advertiser_contact_phone, priority_mode,
                visibility_scope, serving_status
            ) VALUES (
                1, 1, 1, 1,
                'Premium commercial advert | Private engagement test',
                '+441234567890', 'paid', 'direct_communities', 'serving'
            )
        """))


def _headers(email: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token({'sub': email})}"}


def test_private_advert_save_like_are_idempotent_retrievable_and_removable(client):
    _seed_commercial_spotlight()
    viewer_headers = _headers('advert-viewer@example.com')

    first_save = client.post('/marketplace/spotlight-adverts/1/save', headers=viewer_headers)
    assert first_save.status_code == 200, first_save.text
    assert first_save.json()['saved'] is True

    second_save = client.post('/marketplace/spotlight-adverts/1/save', headers=viewer_headers)
    assert second_save.status_code == 200, second_save.text
    assert second_save.json()['already_saved'] is True

    first_like = client.put('/marketplace/spotlight-adverts/1/like', headers=viewer_headers)
    assert first_like.status_code == 200, first_like.text
    assert first_like.json()['liked'] is True

    preferences = client.get(
        '/marketplace/spotlight-adverts/preferences',
        headers=viewer_headers,
    )
    assert preferences.status_code == 200, preferences.text
    payload = preferences.json()
    assert payload['saved_campaign_ids'] == [1]
    assert payload['liked_campaign_ids'] == [1]
    assert payload['saved_adverts'][0]['spotlight_campaign_id'] == 1
    assert 'like_count' not in payload['saved_adverts'][0]
    assert 'save_count' not in payload['saved_adverts'][0]

    unlike = client.delete('/marketplace/spotlight-adverts/1/like', headers=viewer_headers)
    assert unlike.status_code == 200, unlike.text
    assert unlike.json()['liked'] is False
    after_unlike = client.get(
        '/marketplace/spotlight-adverts/preferences',
        headers=viewer_headers,
    ).json()
    assert after_unlike['saved_campaign_ids'] == [1]
    assert after_unlike['liked_campaign_ids'] == []

    unsave = client.delete('/marketplace/spotlight-adverts/1/save', headers=viewer_headers)
    assert unsave.status_code == 200, unsave.text
    assert unsave.json()['saved'] is False
    after_unsave = client.get(
        '/marketplace/spotlight-adverts/preferences',
        headers=viewer_headers,
    ).json()
    assert after_unsave['saved_campaign_ids'] == []
    assert after_unsave['liked_campaign_ids'] == []


def test_advert_preferences_are_private_and_owner_actions_are_blocked(client):
    _seed_commercial_spotlight()
    viewer_headers = _headers('advert-viewer@example.com')
    other_headers = _headers('advert-other@example.com')
    owner_headers = _headers('advert-owner@example.com')

    assert client.post(
        '/marketplace/spotlight-adverts/1/save',
        headers=viewer_headers,
    ).status_code == 200
    assert client.put(
        '/marketplace/spotlight-adverts/1/like',
        headers=viewer_headers,
    ).status_code == 200

    other_preferences = client.get(
        '/marketplace/spotlight-adverts/preferences',
        headers=other_headers,
    )
    assert other_preferences.status_code == 200, other_preferences.text
    assert other_preferences.json()['saved_campaign_ids'] == []
    assert other_preferences.json()['liked_campaign_ids'] == []

    owner_save = client.post('/marketplace/spotlight-adverts/1/save', headers=owner_headers)
    owner_like = client.put('/marketplace/spotlight-adverts/1/like', headers=owner_headers)
    assert owner_save.status_code == 403, owner_save.text
    assert owner_like.status_code == 403, owner_like.text


def test_preference_write_retries_once_after_a_concurrent_insert(monkeypatch):
    writes: list[dict[str, object]] = []

    def record_write(_db, **kwargs):
        writes.append(kwargs)

    class ConcurrentInsertSession:
        def __init__(self):
            self.commit_count = 0
            self.rollback_count = 0

        def commit(self):
            self.commit_count += 1
            if self.commit_count == 1:
                raise IntegrityError('insert', {}, Exception('unique collision'))

        def rollback(self):
            self.rollback_count += 1

    monkeypatch.setattr(
        marketplace,
        '_write_spotlight_campaign_preference',
        record_write,
    )
    session = ConcurrentInsertSession()

    marketplace._commit_spotlight_campaign_preference(
        session,
        campaign_id=9,
        user_id=4,
        field='liked',
        enabled=True,
    )

    assert session.commit_count == 2
    assert session.rollback_count == 1
    assert len(writes) == 2
    assert writes[0] == writes[1]
