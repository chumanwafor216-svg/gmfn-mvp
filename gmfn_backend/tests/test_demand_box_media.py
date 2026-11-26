from __future__ import annotations

import json

from sqlalchemy import text

from app.core.auth import get_current_user
from app.db.database import engine
from app.main import app


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _seed() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users
                    (id, email, hashed_password, display_name, role, gmfn_id)
                VALUES
                    (1, 'media-owner@example.com', 'hashed', 'Media Owner', 'admin', 'GSN-U-MEDIA-OWNER'),
                    (2, 'media-responder@example.com', 'hashed', 'Media Responder', 'member', 'GSN-U-MEDIA-RESPONDER'),
                    (3, 'media-member@example.com', 'hashed', 'Media Member', 'member', 'GSN-U-MEDIA-MEMBER'),
                    (4, 'media-outsider@example.com', 'hashed', 'Media Outsider', 'member', 'GSN-U-MEDIA-OUTSIDER')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clans
                    (id, name, marketplace_name, community_code, status, invite_code, invite_uses, created_at)
                VALUES
                    (1, 'Media Test Clan', 'Media Test Marketplace', 'GMFN-C-MEDIA', 'active', 'media-test', 0, CURRENT_TIMESTAMP)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (clan_id, user_id, role, personal_pool_balance)
                VALUES
                    (1, 1, 'admin', 0),
                    (1, 2, 'member', 0),
                    (1, 3, 'member', 0)
                """
            )
        )


def _user(user_id: int) -> Obj:
    values = {
        1: ("media-owner@example.com", "Media Owner", "GSN-U-MEDIA-OWNER", "admin"),
        2: ("media-responder@example.com", "Media Responder", "GSN-U-MEDIA-RESPONDER", "member"),
        3: ("media-member@example.com", "Media Member", "GSN-U-MEDIA-MEMBER", "member"),
        4: ("media-outsider@example.com", "Media Outsider", "GSN-U-MEDIA-OUTSIDER", "member"),
    }[user_id]
    return Obj(id=user_id, email=values[0], display_name=values[1], gmfn_id=values[2], role=values[3])


def test_request_media_is_validated_and_community_scoped(client, monkeypatch, tmp_path):
    selected = {"user": _user(1)}
    app.dependency_overrides[get_current_user] = lambda: selected["user"]
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _seed()
    try:
        created = client.post(
            "/marketplace/requests",
            json={"clan_id": 1, "title": "Need a school bag", "category": "General"},
        )
        assert created.status_code == 200, created.text
        request_id = created.json()["id"]

        invalid = client.post(
            f"/demand-box/requests/{request_id}/media",
            data={"kind": "link", "link": "javascript:alert(1)"},
        )
        assert invalid.status_code == 400

        attached = client.post(
            f"/demand-box/requests/{request_id}/media",
            data={"kind": "image"},
            files={"file": ("bag.jpg", b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xd9", "image/jpeg")},
        )
        assert attached.status_code == 200, attached.text
        attachment_id = attached.json()["id"]

        selected["user"] = _user(2)
        visible = client.get(f"/demand-box/media/{attachment_id}")
        assert visible.status_code == 200

        selected["user"] = _user(4)
        hidden = client.get(f"/demand-box/media/{attachment_id}")
        assert hidden.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_response_media_is_private_to_the_two_participants(client, monkeypatch):
    selected = {"user": _user(1)}
    app.dependency_overrides[get_current_user] = lambda: selected["user"]
    _seed()
    try:
        created = client.post(
            "/marketplace/requests",
            json={"clan_id": 1, "title": "Need a mechanic", "category": "Repairs"},
        )
        request_id = created.json()["id"]

        selected["user"] = _user(2)
        response = client.post(
            f"/demand-box/requests/{request_id}/responses",
            data={
                "payload_json": json.dumps(
                    {"text": "I can help", "client_response_id": "media-response-001"}
                )
            },
        )
        assert response.status_code == 200, response.text
        response_id = response.json()["id"]

        attached = client.post(
            f"/demand-box/responses/{response_id}/media",
            data={"kind": "link", "link": "https://example.com/offer"},
        )
        assert attached.status_code == 200, attached.text
        attachment_id = attached.json()["id"]

        selected["user"] = _user(1)
        owner_access = client.get(f"/demand-box/requests/{request_id}/responses")
        assert owner_access.status_code == 200
        assert owner_access.json()[0]["media_attachments"][0]["url"] == "https://example.com/offer"

        selected["user"] = _user(3)
        unrelated_member = client.get(f"/demand-box/media/{attachment_id}")
        assert unrelated_member.status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_response_document_is_private_and_downloadable(client, monkeypatch, tmp_path):
    selected = {"user": _user(1)}
    app.dependency_overrides[get_current_user] = lambda: selected["user"]
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    _seed()
    try:
        created = client.post(
            "/marketplace/requests",
            json={"clan_id": 1, "title": "Need a quotation", "category": "Services"},
        )
        request_id = created.json()["id"]

        selected["user"] = _user(2)
        response = client.post(
            f"/demand-box/requests/{request_id}/responses",
            data={
                "payload_json": json.dumps(
                    {"text": "Quotation attached", "client_response_id": "document-response-001"}
                )
            },
        )
        assert response.status_code == 200, response.text
        attached = client.post(
            f"/demand-box/responses/{response.json()['id']}/media",
            data={"kind": "document"},
            files={"file": ("quotation.pdf", b"%PDF-1.4\n%%EOF\n", "application/pdf")},
        )
        assert attached.status_code == 200, attached.text
        attachment_id = attached.json()["id"]
        assert attached.json()["kind"] == "document"

        selected["user"] = _user(1)
        downloaded = client.get(f"/demand-box/media/{attachment_id}")
        assert downloaded.status_code == 200
        assert downloaded.headers["content-type"].startswith("application/pdf")
        assert downloaded.content.startswith(b"%PDF-")

        selected["user"] = _user(3)
        assert client.get(f"/demand-box/media/{attachment_id}").status_code == 404
    finally:
        app.dependency_overrides.pop(get_current_user, None)
