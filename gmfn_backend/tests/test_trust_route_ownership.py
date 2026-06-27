from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.db.database import SessionLocal
from app.db.models import TrustEvent, User
from app.api.router import api_router
from app.api.routes.admin_trust_why import router as admin_trust_why_router
from app.api.routes.evidence_pack import router as evidence_pack_router
from app.api.routes.trust_events import router as trust_events_router
from app.api.routes.trust_why import router as trust_why_router
from app.main import app


def _route_owners(path: str, method: str = "GET") -> list[str]:
    owners: list[str] = []
    seen: set[str] = set()
    route_sources = [
        app.routes,
        api_router.routes,
        evidence_pack_router.routes,
        trust_why_router.routes,
        admin_trust_why_router.routes,
        trust_events_router.routes,
    ]
    for route in [route for source in route_sources for route in source]:
        endpoint = getattr(route, "endpoint", None)
        methods = getattr(route, "methods", set()) or set()
        if endpoint is None or getattr(route, "path", "") != path or method not in methods:
            continue
        owner = f"{endpoint.__module__}.{endpoint.__name__}"
        if owner in seen:
            continue
        seen.add(owner)
        owners.append(owner)
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


def test_my_trust_timeline_redacts_operational_references_for_user(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
):
    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="loan.repaid",
                clan_id=1,
                loan_id=77,
                guarantor_id=33,
                actor_user_id=2,
                subject_user_id=1,
                meta={"reason": "loan_fully_repaid", "payment_reference": "PRIVATE-REF-123"},
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    response = client.get("/trust/me/timeline?limit=5")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["items"]
    item = payload["items"][0]
    assert item["reference_label"] == "Private support record"
    assert "payment_reference" not in item
    assert "loan_id" not in item
    assert "guarantor_id" not in item
    assert "actor_user_id" not in item
    assert "subject_user_id" not in item
    assert "PRIVATE-REF-123" not in response.text


def test_admin_trust_timeline_keeps_operational_references_for_admin(
    client: TestClient,
    override_current_user,
    seed_clan_admin_membership,
):
    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="loan.repaid",
                clan_id=1,
                loan_id=88,
                guarantor_id=44,
                actor_user_id=1,
                subject_user_id=1,
                meta={"reason": "loan_fully_repaid", "payment_reference": "ADMIN-REF-456"},
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    response = client.get("/trust/timeline/1?limit=5")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["items"]
    item = payload["items"][0]
    assert item["payment_reference"] == "ADMIN-REF-456"
    assert item["loan_id"] == 88
    assert item["guarantor_id"] == 44
    assert item["actor_user_id"] == 1
    assert item["subject_user_id"] == 1


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
