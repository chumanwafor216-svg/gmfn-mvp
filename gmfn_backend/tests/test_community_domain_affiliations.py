from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient

from app.core.auth import PENDING_APPROVAL_SENTINEL, get_current_user
from app.core.trust_event_types import TrustEventType
from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, CommunityDomainAffiliation, TrustEvent, User
from app.main import app


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _seed_affiliation_context() -> None:
    with SessionLocal() as db:
        db.add(User(id=1, email="parent@example.com", hashed_password="hashed", role="user"))
        db.add(User(id=2, email="affiliate@example.com", hashed_password="hashed", role="user"))
        db.add(
            Clan(
                id=1,
                name="Onitsha Main Market",
                community_code="GMFN-C-000001",
                invite_code="parent-invite",
                status="active",
                invite_uses=0,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.add(
            Clan(
                id=2,
                name="Line F Electrical Traders",
                community_code="GMFN-C-000002",
                invite_code="affiliate-invite",
                status="active",
                invite_uses=0,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.flush()
        db.add(
            ClanMembership(
                id=1,
                clan_id=1,
                user_id=1,
                role="admin",
                personal_pool_balance=0,
            )
        )
        db.add(
            ClanMembership(
                id=2,
                clan_id=2,
                user_id=2,
                role="admin",
                personal_pool_balance=0,
            )
        )
        db.commit()


def test_affiliate_admin_requests_and_parent_admin_approves_domain_affiliation(
    client: TestClient,
):
    _seed_affiliation_context()

    try:
        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=2,
            email="affiliate@example.com",
            role="user",
        )
        requested = client.post(
            "/clans/2/domain-affiliation-requests",
            json={
                "parent_community_key": "GMFN-C-000001",
                "request_note": "Line F wants parent-domain acknowledgement.",
            },
        )
        assert requested.status_code == 200, requested.text
        request_data = requested.json()
        affiliation = request_data["affiliation"]
        assert affiliation["parent_community_id"] == 1
        assert affiliation["affiliate_community_id"] == 2
        assert affiliation["status"] == "pending"

        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=1,
            email="parent@example.com",
            role="user",
        )
        decided = client.post(
            f"/clans/1/domain-affiliation-requests/{affiliation['id']}/decision",
            json={
                "decision": "approve",
                "decision_note": "Acknowledged by the parent domain.",
            },
        )
        assert decided.status_code == 200, decided.text
        decision_data = decided.json()
        assert decision_data["affiliation"]["status"] == "approved"

        listed = client.get("/clans/1/domain-affiliations")
        assert listed.status_code == 200, listed.text
        incoming = listed.json()["incoming"]
        assert len(incoming) == 1
        assert incoming[0]["affiliate_community_name"] == "Line F Electrical Traders"
        assert incoming[0]["status"] == "approved"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_domain_affiliation_rejects_malformed_text_before_recording(
    client: TestClient,
):
    _seed_affiliation_context()

    try:
        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=2,
            email="affiliate@example.com",
            role="user",
        )
        malformed_request = client.post(
            "/clans/2/domain-affiliation-requests",
            json={
                "parent_community_key": True,
                "request_note": 1.5,
            },
        )
        assert malformed_request.status_code == 422, malformed_request.text
        assert "parent_community_key must be text" in malformed_request.text
        assert "request_note must be text" in malformed_request.text

        valid_request = client.post(
            "/clans/2/domain-affiliation-requests",
            json={
                "parent_community_key": "GMFN-C-000001",
                "request_note": "Line F wants parent-domain acknowledgement.",
            },
        )
        assert valid_request.status_code == 200, valid_request.text
        affiliation_id = valid_request.json()["affiliation"]["id"]

        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=1,
            email="parent@example.com",
            role="user",
        )
        malformed_decision = client.post(
            f"/clans/1/domain-affiliation-requests/{affiliation_id}/decision",
            json={
                "decision": False,
                "decision_note": 1.5,
            },
        )
        assert malformed_decision.status_code == 422, malformed_decision.text
        assert "decision must be text" in malformed_decision.text
        assert "decision_note must be text" in malformed_decision.text

        with SessionLocal() as db:
            rows = db.query(CommunityDomainAffiliation).all()
            assert len(rows) == 1
            assert rows[0].status == "pending"
            assert rows[0].decided_by_user_id is None
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_domain_affiliation_requires_active_domains_and_activated_admins(
    client: TestClient,
):
    _seed_affiliation_context()

    try:
        with SessionLocal() as db:
            affiliate_admin = db.get(User, 2)
            affiliate_admin.hashed_password = PENDING_APPROVAL_SENTINEL
            db.commit()

        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=2,
            email="affiliate@example.com",
            role="user",
        )
        pending_admin = client.post(
            "/clans/2/domain-affiliation-requests",
            json={"parent_community_key": "GMFN-C-000001"},
        )
        assert pending_admin.status_code == 403, pending_admin.text
        assert "activated community admins" in pending_admin.text

        with SessionLocal() as db:
            affiliate_admin = db.get(User, 2)
            affiliate = db.get(Clan, 2)
            affiliate_admin.hashed_password = "hashed"
            affiliate.status = "closed"
            db.commit()

        inactive_affiliate = client.post(
            "/clans/2/domain-affiliation-requests",
            json={"parent_community_key": "GMFN-C-000001"},
        )
        assert inactive_affiliate.status_code == 403, inactive_affiliate.text
        assert "active community domains" in inactive_affiliate.text

        with SessionLocal() as db:
            affiliate = db.get(Clan, 2)
            parent = db.get(Clan, 1)
            affiliate.status = "active"
            parent.status = "closed"
            db.commit()

        inactive_parent = client.post(
            "/clans/2/domain-affiliation-requests",
            json={"parent_community_key": "GMFN-C-000001"},
        )
        assert inactive_parent.status_code == 403, inactive_parent.text
        assert "Parent community domain is not active" in inactive_parent.text

        with SessionLocal() as db:
            assert db.query(CommunityDomainAffiliation).count() == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_domain_affiliation_listing_requires_active_domain_and_activated_admin(
    client: TestClient,
):
    _seed_affiliation_context()

    with SessionLocal() as db:
        db.add(
            CommunityDomainAffiliation(
                id=1,
                parent_clan_id=1,
                affiliate_clan_id=2,
                requested_by_user_id=2,
                status="pending",
                request_note="Line F request.",
            )
        )
        parent_admin = db.get(User, 1)
        parent_admin.hashed_password = PENDING_APPROVAL_SENTINEL
        db.commit()

    try:
        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=1,
            email="parent@example.com",
            role="user",
        )
        pending_admin_list = client.get("/clans/1/domain-affiliations")
        assert pending_admin_list.status_code == 403, pending_admin_list.text
        assert "activated community admins" in pending_admin_list.text

        with SessionLocal() as db:
            parent_admin = db.get(User, 1)
            parent = db.get(Clan, 1)
            parent_admin.hashed_password = "hashed"
            parent.status = "closed"
            db.commit()

        inactive_domain_list = client.get("/clans/1/domain-affiliations")
        assert inactive_domain_list.status_code == 403, inactive_domain_list.text
        assert "active community domains" in inactive_domain_list.text

        with SessionLocal() as db:
            parent = db.get(Clan, 1)
            parent.status = "active"
            db.commit()

        active_domain_list = client.get("/clans/1/domain-affiliations")
        assert active_domain_list.status_code == 200, active_domain_list.text
        assert len(active_domain_list.json()["incoming"]) == 1
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_parent_cannot_approve_closed_affiliate_domain(
    client: TestClient,
):
    _seed_affiliation_context()

    with SessionLocal() as db:
        db.add(
            CommunityDomainAffiliation(
                id=1,
                parent_clan_id=1,
                affiliate_clan_id=2,
                requested_by_user_id=2,
                status="pending",
                request_note="Line F request.",
            )
        )
        affiliate = db.get(Clan, 2)
        affiliate.status = "closed"
        db.commit()

    try:
        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=1,
            email="parent@example.com",
            role="user",
        )
        blocked = client.post(
            "/clans/1/domain-affiliation-requests/1/decision",
            json={"decision": "approve"},
        )
        assert blocked.status_code == 403, blocked.text
        assert "Affiliate community domain is not active" in blocked.text

        rejected = client.post(
            "/clans/1/domain-affiliation-requests/1/decision",
            json={"decision": "reject", "decision_note": "Affiliate is no longer active."},
        )
        assert rejected.status_code == 200, rejected.text
        assert rejected.json()["affiliation"]["status"] == "rejected"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_public_community_verification_shows_approved_parent_domain_affiliation(
    client: TestClient,
):
    _seed_affiliation_context()

    with SessionLocal() as db:
        db.add(
            CommunityDomainAffiliation(
                id=1,
                parent_clan_id=1,
                affiliate_clan_id=2,
                requested_by_user_id=2,
                decided_by_user_id=1,
                status="approved",
                request_note="Line F request.",
                decision_note="Approved.",
                decided_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    response = client.get("/verify/community/GMFN-C-000002")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["community_name"] == "Line F Electrical Traders"
    assert data["community_type"] == "market_association"
    assert data["community_type_label"] == "Market association"
    assert data["community_type_source"] == "Inferred from public community text"
    assert data["community_public_face_status"] == "affiliate_acknowledged_record"
    assert data["community_public_face_label"] == "Affiliate acknowledged public record"
    assert "not a full community profile" in data["community_public_face_scope"]
    assert data["community_next_evidence_label"] == "Use controlled confirmation before relying on a claim"
    assert "acknowledged affiliate record" in data["community_next_evidence_scope"]
    assert data["community_record_started_label"].startswith("GSN record since ")
    assert "not the date the real-world community was founded" in data["community_record_started_scope"]
    assert data["community_mobility_label"] == "Portable Community ID anchor"
    assert "outside the original room" in data["community_mobility_scope"]
    assert "does not transfer trust or approve a transaction" in data["community_mobility_scope"]
    assert data["community_reader_decision_label"] == "First check, not final decision"
    assert "serious trade, lending, membership" in data["community_reader_decision_scope"]
    assert "ask for current scoped evidence before acting" in data["community_reader_decision_scope"]
    assert data["community_evidence_currentness_status"] == "current_parent_acknowledgement"
    assert data["community_evidence_currentness_label"] == "Current parent community acknowledgement"
    assert "current parent community acknowledgement" in data["community_evidence_currentness_scope"]
    assert data["official_affiliate_status"] == "approved"
    assert data["official_affiliate_label"] == "Acknowledged affiliate under parent community"
    assert data["parent_domain"]["community_id"] == 1
    assert data["parent_domain"]["community_code"] == "GMFN-C-000001"
    assert data["parent_domain"]["community_name"] == "Onitsha Main Market"
    assert "Onitsha Main Market" in data["official_affiliate_note"]


def test_public_community_verification_marks_inactive_affiliation_not_current(
    client: TestClient,
):
    _seed_affiliation_context()

    with SessionLocal() as db:
        db.add(
            CommunityDomainAffiliation(
                id=1,
                parent_clan_id=1,
                affiliate_clan_id=2,
                requested_by_user_id=2,
                decided_by_user_id=1,
                status="approved",
                request_note="Line F request.",
                decision_note="Approved.",
                decided_at=datetime.now(timezone.utc),
            )
        )
        parent = db.get(Clan, 1)
        parent.status = "closed"
        db.commit()

    response = client.get("/verify/community/GMFN-C-000002")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["official_affiliate_status"] == "not_current"
    assert data["official_affiliate_label"] == "Parent community acknowledgement not current"
    assert "historical approved affiliation" in data["official_affiliate_note"]
    assert "does not treat it as current" in data["official_affiliate_note"]
    assert data["community_public_face_status"] == "basic_public_record"
    assert data["parent_domain"]["current"] is False
    assert data["community_evidence_currentness_status"] == "historical_parent_acknowledgement"
    assert data["community_evidence_currentness_label"] == "Parent community acknowledgement not current"
    assert "historical approved affiliation record" in data["community_evidence_currentness_scope"]


def test_admin_records_external_registration_as_supporting_evidence_not_verification(
    client: TestClient,
):
    _seed_affiliation_context()

    try:
        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=1,
            email="parent@example.com",
            role="user",
        )
        response = client.post(
            "/clans/1/external-registration-records",
            json={
                "registration_type": "CAC",
                "registration_reference": "RC-123456",
                "registered_name": "Onitsha Main Market Traders Association",
                "issuing_body": "Corporate Affairs Commission",
                "note": "Supplied during parent-domain claim review.",
            },
        )
        assert response.status_code == 200, response.text
        data = response.json()
        record = data["record"]
        assert record["status"] == "recorded"
        assert record["verification_effect"] == "none"
        assert record["registration_reference_recorded"] is True
        assert record["registered_name_recorded"] is True
        assert record["raw_reference_stored"] is False
        assert record["record_detail_storage"] == "fingerprint_and_presence_only"
        assert record["evidence_fingerprint"]
        assert "not GSN verification" in record["boundary"]
        assert "RC-123456" not in response.text
        assert "Onitsha Main Market Traders Association" not in response.text

        with SessionLocal() as db:
            event = (
                db.query(TrustEvent)
                .filter(
                    TrustEvent.clan_id == 1,
                    TrustEvent.event_type == TrustEventType.COMMUNITY_EXTERNAL_REGISTRATION_RECORDED,
                )
                .one()
            )
            meta = event.meta or {}
            assert meta["verification_effect"] == "none"
            assert meta["raw_reference_stored"] is False
            assert meta["record_detail_storage"] == "fingerprint_and_presence_only"
            assert meta["evidence_fingerprint"]
            assert "RC-123456" not in (event.meta_json or "")
            assert "Onitsha Main Market Traders Association" not in (event.meta_json or "")

        listed = client.get("/clans/1/external-registration-records")
        assert listed.status_code == 200, listed.text
        listed_data = listed.json()
        assert listed_data["community_id"] == 1
        assert "supporting evidence only" in listed_data["boundary"]
        assert len(listed_data["items"]) == 1
        listed_record = listed_data["items"][0]
        assert listed_record["verification_effect"] == "none"
        assert listed_record["raw_reference_stored"] is False
        assert listed_record["evidence_fingerprint"] == record["evidence_fingerprint"]
        assert "RC-123456" not in listed.text
        assert "Onitsha Main Market Traders Association" not in listed.text

        public_response = client.get("/verify/community/GMFN-C-000001")
        assert public_response.status_code == 200, public_response.text
        public_text = public_response.text
        public_data = public_response.json()
        assert public_data["community_name"] == "Onitsha Main Market"
        assert public_data["public_record"] == "Recorded in GSN"
        assert "RC-123456" not in public_text
        assert "Onitsha Main Market Traders Association" not in public_text
        assert record["evidence_fingerprint"] not in public_text
        assert "external_registration" not in public_text
        assert "registration_reference" not in public_text
        assert "registered_name" not in public_text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_external_registration_rejects_malformed_text_before_recording(
    client: TestClient,
):
    _seed_affiliation_context()

    try:
        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=1,
            email="parent@example.com",
            role="user",
        )

        for field_name in (
            "registration_type",
            "registration_reference",
            "registered_name",
            "issuing_body",
            "note",
        ):
            payload = {
                "registration_type": "CAC",
                "registration_reference": "RC-123456",
                "registered_name": "Onitsha Main Market Traders Association",
                "issuing_body": "Corporate Affairs Commission",
                "note": "Supplied during parent-domain claim review.",
            }
            payload[field_name] = False
            rejected_bool = client.post(
                "/clans/1/external-registration-records",
                json=payload,
            )
            assert rejected_bool.status_code == 422, (
                field_name,
                rejected_bool.text,
            )
            assert f"{field_name} must be text" in rejected_bool.text

            payload[field_name] = 1.5
            rejected_float = client.post(
                "/clans/1/external-registration-records",
                json=payload,
            )
            assert rejected_float.status_code == 422, (
                field_name,
                rejected_float.text,
            )
            assert f"{field_name} must be text" in rejected_float.text

        with SessionLocal() as db:
            assert (
                db.query(TrustEvent)
                .filter(
                    TrustEvent.event_type
                    == TrustEventType.COMMUNITY_EXTERNAL_REGISTRATION_RECORDED
                )
                .count()
                == 0
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_external_registration_structured_evidence_is_deduped_by_fingerprint(
    client: TestClient,
):
    _seed_affiliation_context()

    try:
        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=1,
            email="parent@example.com",
            role="user",
        )
        first = client.post(
            "/clans/1/external-registration-records",
            json={
                "registration_type": "CAC",
                "registration_reference": "RC-123456",
                "registered_name": "Onitsha Main Market Traders Association",
                "issuing_body": "Corporate Affairs Commission",
            },
        )
        assert first.status_code == 200, first.text
        first_record = first.json()["record"]

        duplicate = client.post(
            "/clans/1/external-registration-records",
            json={
                "registration_type": "cac",
                "registration_reference": " rc-123456 ",
                "registered_name": " onitsha main market traders association ",
                "issuing_body": "corporate affairs commission",
            },
        )
        assert duplicate.status_code == 200, duplicate.text
        duplicate_record = duplicate.json()["record"]
        assert duplicate_record["id"] == first_record["id"]
        assert duplicate_record["evidence_fingerprint"] == first_record["evidence_fingerprint"]

        second = client.post(
            "/clans/1/external-registration-records",
            json={
                "registration_type": "CAC",
                "registration_reference": "RC-654321",
                "issuing_body": "Corporate Affairs Commission",
            },
        )
        assert second.status_code == 200, second.text
        assert second.json()["record"]["id"] != first_record["id"]

        with SessionLocal() as db:
            assert (
                db.query(TrustEvent)
                .filter(TrustEvent.event_type == TrustEventType.COMMUNITY_EXTERNAL_REGISTRATION_RECORDED)
                .count()
                == 2
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_external_registration_record_requires_active_domain_and_activated_admin(
    client: TestClient,
):
    _seed_affiliation_context()

    try:
        with SessionLocal() as db:
            admin = db.get(User, 1)
            admin.hashed_password = PENDING_APPROVAL_SENTINEL
            db.commit()

        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=1,
            email="parent@example.com",
            role="user",
        )
        pending_admin_record = client.post(
            "/clans/1/external-registration-records",
            json={"registration_type": "CAC", "registration_reference": "RC-123456"},
        )
        assert pending_admin_record.status_code == 403, pending_admin_record.text
        assert "activated community admins" in pending_admin_record.text

        pending_admin_list = client.get("/clans/1/external-registration-records")
        assert pending_admin_list.status_code == 403, pending_admin_list.text
        assert "activated community admins" in pending_admin_list.text

        with SessionLocal() as db:
            admin = db.get(User, 1)
            parent = db.get(Clan, 1)
            admin.hashed_password = "hashed"
            parent.status = "closed"
            db.commit()

        inactive_domain_record = client.post(
            "/clans/1/external-registration-records",
            json={"registration_type": "CAC", "registration_reference": "RC-123456"},
        )
        assert inactive_domain_record.status_code == 403, inactive_domain_record.text
        assert "active community domains" in inactive_domain_record.text

        with SessionLocal() as db:
            assert (
                db.query(TrustEvent)
                .filter(TrustEvent.event_type == TrustEventType.COMMUNITY_EXTERNAL_REGISTRATION_RECORDED)
                .count()
                == 0
            )
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_non_admin_cannot_record_or_list_external_registration_evidence(client: TestClient):
    _seed_affiliation_context()

    try:
        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=2,
            email="affiliate@example.com",
            role="user",
        )
        response = client.post(
            "/clans/1/external-registration-records",
            json={
                "registration_type": "CAC",
                "registration_reference": "RC-123456",
            },
        )
        assert response.status_code == 403

        listed = client.get("/clans/1/external-registration-records")
        assert listed.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)
