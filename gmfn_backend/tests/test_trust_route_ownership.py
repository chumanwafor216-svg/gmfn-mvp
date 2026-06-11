from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.db.models import TrustEvent, User
from app.main import app


def _route_owners(path: str, method: str = "GET") -> list[str]:
    owners: list[str] = []
    for route in app.routes:
        endpoint = getattr(route, "endpoint", None)
        methods = getattr(route, "methods", set()) or set()
        if endpoint is None or getattr(route, "path", "") != path or method not in methods:
            continue
        owners.append(f"{endpoint.__module__}.{endpoint.__name__}")
    return owners


def test_trust_evidence_routes_have_single_active_owner():
    assert _route_owners("/trust/me/evidence-pack/meta") == [
        "app.api.routes.evidence_pack.get_evidence_pack_meta"
    ]
    assert _route_owners("/trust/me/evidence-pack.zip") == [
        "app.api.routes.evidence_pack.download_evidence_pack_zip"
    ]
    assert _route_owners("/trust/why/{user_id}") == [
        "app.api.routes.trust_why.trust_why_user"
    ]
    assert _route_owners("/admin/trust/why/{user_id}") == [
        "app.api.routes.admin_trust_why.admin_trust_why"
    ]
    assert _route_owners("/admin/trust-events/recent") == [
        "app.api.routes.trust_events.admin_recent_trust_events"
    ]


def test_trust_why_route_serves_pack_checksum_contract(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
):
    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="loan.repaid",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                meta={"reason": "route_owner_probe"},
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    response = client.get("/trust/why/1?limit=5&include_policy_timeline=true")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["user_id"] == 1
    assert payload["pack_id"]
    assert payload["checksum"]
    assert payload["links"]["evidence_pack_meta"] == "/trust/me/evidence-pack/meta"
    assert "policy_timeline_estimate" in payload


def test_admin_trust_events_recent_filters_match_frontend_query_contract(
    client: TestClient,
    override_current_user,
    seed_clan_admin_membership,
    seed_user2_non_member,
):
    with SessionLocal() as db:
        user2 = db.get(User, 2)
        assert user2 is not None
        db.add_all(
            [
                TrustEvent(
                    event_type="loan.repaid",
                    clan_id=1,
                    actor_user_id=1,
                    subject_user_id=1,
                    meta={"reason": "wrong_subject"},
                    created_at=datetime.now(timezone.utc),
                ),
                TrustEvent(
                    event_type="guarantee.released",
                    clan_id=1,
                    actor_user_id=1,
                    subject_user_id=2,
                    meta={"reason": "right_subject"},
                    created_at=datetime.now(timezone.utc),
                ),
            ]
        )
        db.commit()

    response = client.get("/admin/trust-events/recent?limit=10&clan_id=1&user_id=2")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["total"] == 1
    assert payload["items"][0]["subject_user_id"] == 2
    assert payload["items"][0]["reason"] == "right_subject"
