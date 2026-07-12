from __future__ import annotations

import base64
import json
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


def _decode_signed_token_body(token: str) -> dict:
    body, _signature = token.split(".", 1)
    body += "=" * ((4 - (len(body) % 4)) % 4)
    decoded = base64.urlsafe_b64decode(body.encode("utf-8")).decode("utf-8")
    return json.loads(decoded)


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


def test_trust_score_explained_clan_route_is_mounted(
    client: TestClient,
    override_clan_ctx_member,
    seed_clan_member_membership,
):
    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="loan.repaid",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                meta={"reason": "mounted_route_probe"},
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    response = client.get("/trust/score/explained-clan?limit=8")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["scope"]["clan_id"] == 1
    assert payload["user_id"] == 1
    assert payload["counts"]["loan.repaid"] == 1


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
    assert payload["pack_id"].startswith("GSN-WHY-")
    assert "TP-U" not in payload["pack_id"]
    assert "-U1-" not in payload["pack_id"]
    assert payload["checksum"]
    assert payload["links"]["evidence_pack_meta"] == "/trust/me/evidence-pack/meta"
    assert "policy_timeline_estimate" in payload


def test_user_trust_why_evidence_json_uses_share_safe_reference(
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
                meta={"reason": "portable_trustwhy_probe"},
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    response = client.get("/evidence-pack/me/trust-why.json?limit=5")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["pack_id"].startswith("GSN-WHY-")
    assert "TP-U" not in payload["pack_id"]
    assert "-U1-" not in payload["pack_id"]
    assert "user_id" not in payload
    assert payload["holder"]["private_member_reference"] == "redacted for user evidence pack"
    assert "user_id" not in payload["trust_why"]


def test_evidence_verification_route_uses_opaque_holder_reference(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
):
    response = client.get("/evidence-pack/me/verify")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert "user_id" not in payload
    assert payload["holder"]["private_member_reference"] == "redacted for evidence verification"
    assert payload["computed"]["pack_id"].startswith("GSN-EVID-")
    assert "TP-" not in payload["computed"]["pack_id"]
    assert "-U1-" not in payload["computed"]["pack_id"]


def test_public_evidence_verification_keeps_identity_private(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
    monkeypatch,
):
    monkeypatch.setenv("SECRET_KEY", "test-evidence-secret")

    issued = client.get("/evidence-pack/me/merchant-token")
    assert issued.status_code == 200, issued.text
    issued_payload = issued.json()
    assert issued_payload["pack_id"].startswith("GSN-EVID-")
    assert "TP-" not in issued_payload["pack_id"]
    token_body = _decode_signed_token_body(issued_payload["token"])
    assert "user_id" not in token_body
    assert token_body["pack_id"].startswith("GSN-EVID-")

    public = client.get(issued_payload["public_verify_url"])
    assert public.status_code == 200, public.text
    public_payload = public.json()
    assert public_payload["ok"] is True
    assert public_payload["pack_id"].startswith("GSN-EVID-")
    assert "user_id" not in public_payload
    assert "gmfn_id" not in public_payload


def test_trust_why_user_explanation_redacts_operational_references(
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
                meta={
                    "reason": "loan_fully_repaid",
                    "note": "Repayment confirmed",
                    "payment_reference": "PRIVATE-WHY-REF-123",
                },
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    response = client.get(
        "/trust/me/why?limit=5&mode=detailed&include_policy_timeline=true&group_by_loan=true"
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["events"]
    item = payload["events"][0]
    assert item["reference_label"] == "Private trust record"
    assert item["detail_boundary"] == "Private operational details redacted for trust explanation"
    assert item["reason"] == "loan_fully_repaid"
    assert item["note"] == "Repayment confirmed"
    for key in (
        "id",
        "payment_reference",
        "loan_id",
        "clan_id",
        "guarantor_id",
        "actor_user_id",
        "subject_user_id",
        "meta",
    ):
        assert key not in item

    assert payload["policy_timeline_estimate"]
    assert "event_id" not in payload["policy_timeline_estimate"][0]
    assert "event_number" in payload["policy_timeline_estimate"][0]
    assert payload["grouped_by_loan"][0]["reference_label"] == "Private support group"
    assert "loan_id" not in payload["grouped_by_loan"][0]
    assert "PRIVATE-WHY-REF-123" not in response.text


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


def test_my_trust_timeline_shows_follow_attention_as_neutral_user_signal(
    client: TestClient,
    override_current_user_user,
    seed_clan_member_membership,
):
    with SessionLocal() as db:
        db.add_all(
            [
                TrustEvent(
                    event_type="community.followed",
                    clan_id=1,
                    actor_user_id=1,
                    subject_user_id=1,
                    meta={
                        "reason": "community_followed",
                        "trust_delta": "0.00",
                        "community_name": "Private Community Name",
                        "not_membership": True,
                        "not_endorsement": True,
                        "not_verification": True,
                    },
                    created_at=datetime(2026, 6, 27, 10, 0, tzinfo=timezone.utc),
                ),
                TrustEvent(
                    event_type="marketplace.shop.followed",
                    clan_id=1,
                    actor_user_id=1,
                    subject_user_id=1,
                    meta={
                        "reason": "shop_followed",
                        "trust_delta": "0.00",
                        "shop_name": "Private Shop Name",
                        "not_endorsement": True,
                        "not_verification": True,
                    },
                    created_at=datetime(2026, 6, 27, 10, 1, tzinfo=timezone.utc),
                ),
            ]
        )
        db.commit()

    response = client.get("/trust/me/timeline?limit=5")

    assert response.status_code == 200, response.text
    payload = response.json()
    labels = [item["label"] for item in payload["items"]]
    assert "Followed a shop" in labels
    assert "Followed a community" in labels
    follow_items = [
        item
        for item in payload["items"]
        if item["event_type"] in {"community.followed", "marketplace.shop.followed"}
    ]
    assert follow_items
    assert {item["delta"] for item in follow_items} == {"0.00"}
    assert {item["reason"] for item in follow_items} == {"Attention event"}
    assert all("Attention only." in item["note"] for item in follow_items)
    assert all("not membership" in item["note"] for item in follow_items)
    assert all("trust-score increase" in item["note"] for item in follow_items)
    assert "Private Community Name" not in response.text
    assert "Private Shop Name" not in response.text
    assert "actor_user_id" not in response.text
    assert "subject_user_id" not in response.text


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
