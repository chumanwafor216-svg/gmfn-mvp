from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.db.database import SessionLocal
from app.db.models import (
    Clan,
    ClanMembership,
    CommunityDomain,
    CommunityDomainActionReview,
    CommunityDomainActionReviewComment,
    CommunityDomainActionReviewDecision,
    CommunityDomainActionReviewEvidence,
    CommunityDomainMembership,
    CommunityNode,
    CommunityNodeMembership,
    CommunityDomainPolicy,
    User,
)
from app.main import app


def _seed_owner() -> User:
    with SessionLocal() as db:
        owner = User(
            id=1,
            email="domain-owner@example.com",
            hashed_password="hashed",
            role="user",
        )
        db.add(owner)
        db.commit()
        db.refresh(owner)
        return User(
            id=int(owner.id),
            email=owner.email,
            hashed_password=owner.hashed_password,
            role=owner.role,
        )


def _seed_user(user_id: int, email: str, role: str = "user") -> User:
    with SessionLocal() as db:
        user = User(
            id=int(user_id),
            email=email,
            hashed_password="hashed",
            role=role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return User(
            id=int(user.id),
            email=user.email,
            hashed_password=user.hashed_password,
            role=user.role,
        )


def test_community_domain_availability_reports_available_and_taken(
    client: TestClient,
):
    owner = _seed_owner()

    available = client.get(
        "/community-domains/availability",
        params={"domain_name": "Onitsha Main Market"},
    )
    assert available.status_code == 200, available.text
    assert available.json() == {
        "domain_name": "Onitsha Main Market",
        "normalized_domain_name": "onitsha-main-market",
        "available": True,
        "reason": None,
    }

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Onitsha Main Market",
                "display_name": "Onitsha Main Market Traders Association",
                "domain_type": "market_association",
                "template_key": "market_association",
            },
        )
        assert created.status_code == 201, created.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    taken = client.get(
        "/community-domains/availability",
        params={"domain_name": "onitsha-main-market"},
    )
    assert taken.status_code == 200, taken.text
    assert taken.json()["available"] is False
    assert taken.json()["reason"] == "domain_name_taken"


def test_community_domain_templates_are_public_presets_not_activation(
    client: TestClient,
):
    response = client.get("/community-domains/templates")

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    assert payload["total"] >= 8
    assert "public presets" in payload["boundary"]
    assert "do not create a Community Domain" in payload["boundary"]
    assert "activate billing" in payload["boundary"]
    assert "verify ownership" in payload["boundary"]
    assert "separate schemas" in payload["boundary"]

    items = payload["items"]
    template_keys = {item["template_key"] for item in items}
    assert {
        "school_multi_branch",
        "church_religious_body",
        "union_professional_body",
        "market_cooperative",
        "generic_association",
    }.issubset(template_keys)

    for item in items:
        assert item["template_key"]
        assert item["domain_type"]
        assert item["label"]
        assert item["summary"]
        assert isinstance(item["typical_nodes"], list)
        assert item["typical_nodes"]
        assert isinstance(item["default_modules"], list)
        assert item["default_modules"]
        assert "does not create" in item["boundary"]
        assert "activate" in item["boundary"]
        assert "verify" in item["boundary"]
        assert "bill" in item["boundary"]

    with SessionLocal() as db:
        assert db.query(CommunityDomain).count() == 0
        assert db.query(CommunityNode).count() == 0
        assert db.query(CommunityDomainMembership).count() == 0
        assert db.query(Clan).count() == 0


def test_community_domain_draft_is_not_a_live_social_community(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        response = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Dominion College Abuja",
                "display_name": "Dominion College Abuja",
                "domain_type": "school",
                "template_key": "school_multi_branch",
                "country": "Nigeria",
                "state": "FCT",
                "public_profile": "Draft institutional domain for a school network.",
            },
        )
        assert response.status_code == 201, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    data = response.json()["community_domain"]
    assert data["domain_name"] == "dominion-college-abuja"
    assert data["display_name"] == "Dominion College Abuja"
    assert data["domain_type"] == "school"
    assert data["template_key"] == "school_multi_branch"
    assert data["status"] == "draft"
    assert data["verification_status"] == "unverified"
    assert data["country"] == "Nigeria"
    assert data["state"] == "FCT"
    assert data["public_profile"] == "Draft institutional domain for a school network."
    assert data["clan_id"] is None
    assert "does not create a social Community" in data["boundary"]
    assert "activate billing" in data["boundary"]
    assert "verify ownership" in data["boundary"]

    root_node = data["root_node"]
    assert root_node["name"] == "Dominion College Abuja"
    assert root_node["node_type"] == "root"
    assert root_node["node_kind"] == "institution"
    assert root_node["path"] == f"/{data['id']}"
    assert root_node["depth"] == 0

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        assert domain.domain_type == "school"
        assert domain.template_key == "school_multi_branch"
        assert domain.country == "Nigeria"
        assert domain.state == "FCT"
        assert domain.public_profile == "Draft institutional domain for a school network."
        assert domain.status == "draft"
        assert domain.verification_status == "unverified"
        domain_membership = db.query(CommunityDomainMembership).one()
        assert domain_membership.user_id == owner.id
        assert domain_membership.role == "owner"
        assert domain_membership.status == "active"
        assert db.query(CommunityNode).count() == 1
        assert db.query(Clan).count() == 0
        assert db.query(ClanMembership).count() == 0


def test_community_domain_draft_defaults_template_to_domain_type(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        response = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "National Teachers Union",
                "display_name": "National Teachers Union",
                "domain_type": "professional_union",
            },
        )
        assert response.status_code == 201, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    data = response.json()["community_domain"]
    assert data["domain_type"] == "professional_union"
    assert data["template_key"] == "professional_union"
    assert data["status"] == "draft"
    assert data["verification_status"] == "unverified"
    assert data["root_node"]["node_kind"] == "institution"

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        assert domain.template_key == "professional_union"
        assert domain.clan_id is None
        assert db.query(CommunityDomainMembership).one().role == "owner"
        assert db.query(CommunityNode).one().path == f"/{int(domain.id)}"
        assert db.query(Clan).count() == 0


def test_owner_can_preview_community_domain_package_quote_without_activation(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Dominion Schools Network",
                "display_name": "Dominion Schools Network",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        response = client.post(f"/community-domains/{domain_id}/package-quote")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    assert "does not create a payment instruction" in payload["boundary"]
    assert "activate a Community Domain" in payload["boundary"]
    assert "verify ownership" in payload["boundary"]

    quote = payload["quote"]
    assert quote["package_code"] == "community_domain_starter"
    assert quote["package_name"] == "Community Domain Starter"
    assert quote["quote_status"] == "draft_quote"
    assert quote["pricing_status"] == "pilot_quote_required"
    assert quote["billing_cycle"] == "manual_quote"
    assert quote["price_amount"] is None
    assert quote["currency"] is None
    assert quote["template_key"] == "school_multi_branch"
    assert quote["domain_type"] == "school"
    assert "governance" in quote["included_modules"]
    assert "members" in quote["included_modules"]
    assert quote["limits"]["included_nodes"] == 50
    assert quote["limits"]["included_members"] == 500
    assert quote["renewal_policy"]["status"] == "not_configured"
    assert "does not create a payment instruction" in quote["boundary"]
    assert "activate billing" in quote["boundary"]
    assert "verify ownership" in quote["boundary"]

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        assert domain.status == "draft"
        assert domain.verification_status == "unverified"
        assert db.query(CommunityDomainMembership).count() == 1
        assert db.query(CommunityNode).count() == 1
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(Clan).count() == 0


def test_outsider_cannot_preview_community_domain_package_quote(
    client: TestClient,
):
    owner = _seed_owner()
    outsider = _seed_user(2, "quote-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Market Leaders Association",
                "display_name": "Market Leaders Association",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        app.dependency_overrides[get_current_user] = lambda: outsider
        response = client.post(f"/community-domains/{domain_id}/package-quote")
        assert response.status_code == 403, response.text
        assert "owner or domain admin" in response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        assert domain.status == "draft"
        assert db.query(CommunityDomainMembership).count() == 1
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(Clan).count() == 0


def test_domain_admin_dashboard_summary_guides_next_action_without_activation(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "domain-dashboard-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Dominion Dashboard Schools",
                "display_name": "Dominion Dashboard Schools",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Abuja Campus",
                "parent_node_id": root_node_id,
                "node_type": "campus",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text

        member_response = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": member.id,
                "role": "member",
                "title": "Parent representative",
            },
        )
        assert member_response.status_code == 201, member_response.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "member-intake",
                "action_key": "member.add",
                "scope_type": "domain",
                "review_mode": "domain_admin_review",
                "policy_summary": "Domain admins review new members.",
            },
        )
        assert policy.status_code == 201, policy.text

        response = client.get(f"/community-domains/{domain_id}/dashboard")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    dashboard = payload["dashboard"]
    assert dashboard["community_domain"]["status"] == "draft"
    assert dashboard["community_domain"]["verification_status"] == "unverified"
    assert dashboard["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert dashboard["template"]["template_key"] == "school_multi_branch"
    assert dashboard["status"] == {
        "domain_status": "draft",
        "verification_status": "unverified",
        "billing_status": "quote_required",
        "activation_status": "not_active",
    }
    assert dashboard["counts"]["nodes"] == 2
    assert dashboard["counts"]["active_members"] == 2
    assert dashboard["counts"]["active_policies"] == 1
    assert dashboard["counts"]["open_reviews"] == 0
    assert dashboard["primary_next_action"]["action_key"] == "package_quote"
    assert dashboard["primary_next_action"]["requires_admin"] is True
    assert "package_quote" in dashboard
    assert dashboard["package_quote"]["pricing_status"] == "pilot_quote_required"
    assert dashboard["package_quote"]["price_amount"] is None
    lanes = {lane["lane_key"]: lane for lane in dashboard["lanes"]}
    assert lanes["identity"]["status"] == "draft"
    assert lanes["structure"]["count"] == 2
    assert lanes["members"]["count"] == 2
    assert lanes["governance"]["count"] == 0
    assert lanes["billing"]["status"] == "quote_required"
    assert "does not create a payment instruction" in dashboard["boundary"]
    assert "activate billing" in dashboard["boundary"]
    assert "verify ownership" in dashboard["boundary"]
    assert "private finance records" in dashboard["boundary"]

    with SessionLocal() as db:
        domain_row = db.query(CommunityDomain).one()
        assert domain_row.status == "draft"
        assert domain_row.verification_status == "unverified"
        assert db.query(CommunityDomainMembership).count() == 2
        assert db.query(CommunityNode).count() == 2
        assert db.query(CommunityDomainPolicy).count() == 1
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(Clan).count() == 0


def test_member_dashboard_hides_quote_and_outsider_is_rejected(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "domain-member-dashboard@example.com")
    outsider = _seed_user(3, "domain-dashboard-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Union Dashboard Domain",
                "display_name": "Union Dashboard Domain",
                "domain_type": "professional_union",
                "template_key": "union_professional_body",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        member_response = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": member.id,
                "role": "member",
                "title": "Union member",
            },
        )
        assert member_response.status_code == 201, member_response.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_dashboard = client.get(f"/community-domains/{domain_id}/dashboard")
        assert member_dashboard.status_code == 200, member_dashboard.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_dashboard = client.get(f"/community-domains/{domain_id}/dashboard")
        assert outsider_dashboard.status_code == 403, outsider_dashboard.text
        assert "active Community Domain members" in outsider_dashboard.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    dashboard = member_dashboard.json()["dashboard"]
    assert dashboard["viewer"] == {"user_id": member.id, "can_admin": False}
    assert "package_quote" not in dashboard
    assert dashboard["primary_next_action"]["action_key"] == "view_structure"
    assert dashboard["primary_next_action"]["requires_admin"] is False
    assert dashboard["counts"]["active_members"] == 2
    assert dashboard["status"]["verification_status"] == "unverified"
    assert "private member evidence" in dashboard["boundary"]


def test_service_settings_are_template_projection_without_activation(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Onitsha Service Settings Market",
                "display_name": "Onitsha Service Settings Market",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        response = client.get(f"/community-domains/{domain_id}/service-settings")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    settings = payload["service_settings"]
    assert settings["template_key"] == "market_cooperative"
    assert settings["domain_type"] == "market_cooperative"
    assert settings["editable"] is False
    assert settings["enabled_total"] >= 7
    assert "does not persist settings" in settings["boundary"]
    assert "enable or disable modules" in settings["boundary"]
    assert "activate billing" in settings["boundary"]
    assert "grant permissions" in settings["boundary"]

    by_key = {item["module_key"]: item for item in settings["items"]}
    assert by_key["shops"]["enabled"] is True
    assert by_key["shops"]["status"] == "enabled_by_template"
    assert by_key["shops"]["source"] == "template_default"
    assert by_key["shops"]["editable"] is False
    assert by_key["shops"]["admin_visible"] is True
    assert by_key["marketplace"]["enabled"] is False
    assert by_key["marketplace"]["status"] == "available_optional"
    assert by_key["marketplace"]["source"] == "module_catalog"
    assert "does not enable" in by_key["shops"]["boundary"]
    assert "grant permissions" in by_key["shops"]["boundary"]

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        assert domain.status == "draft"
        assert domain.verification_status == "unverified"
        assert db.query(CommunityDomainMembership).count() == 1
        assert db.query(CommunityNode).count() == 1
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(Clan).count() == 0


def test_member_can_read_service_settings_but_outsider_is_rejected(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "service-settings-member@example.com")
    outsider = _seed_user(3, "service-settings-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Church Service Settings Domain",
                "display_name": "Church Service Settings Domain",
                "domain_type": "religious_body",
                "template_key": "church_religious_body",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        member_response = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": member.id,
                "role": "member",
                "title": "Department member",
            },
        )
        assert member_response.status_code == 201, member_response.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_settings = client.get(f"/community-domains/{domain_id}/service-settings")
        assert member_settings.status_code == 200, member_settings.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_settings = client.get(f"/community-domains/{domain_id}/service-settings")
        assert outsider_settings.status_code == 403, outsider_settings.text
        assert "active Community Domain members" in outsider_settings.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    settings = member_settings.json()["service_settings"]
    by_key = {item["module_key"]: item for item in settings["items"]}
    assert by_key["governance"]["enabled"] is True
    assert by_key["governance"]["admin_visible"] is False
    assert by_key["verification"]["enabled"] is False
    assert settings["editable"] is False
    assert "private records" in settings["boundary"]


def test_economic_participation_projects_market_fit_without_marketplace_writes(
    client: TestClient,
):
    owner = _seed_owner()
    trader = _seed_user(2, "economic-trader@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Economic Market Domain",
                "display_name": "Economic Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert line.status_code == 201, line.text
        line_id = line.json()["node"]["id"]

        member_response = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": trader.id, "role": "member"},
        )
        assert member_response.status_code == 201, member_response.text

        placed = client.post(
            f"/community-domains/{domain_id}/nodes/{line_id}/members",
            json={"user_id": trader.id, "role": "trader"},
        )
        assert placed.status_code == 201, placed.text

        response = client.get(
            f"/community-domains/{domain_id}/economic-participation"
        )
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    economic = payload["economic_participation"]
    assert economic["editable"] is False
    assert economic["template"]["marketplace_role"] == "core"
    assert economic["template"]["template_key"] == "market_cooperative"
    assert economic["counts"]["nodes"] == 2
    assert economic["counts"]["active_members"] == 2
    assert economic["counts"]["active_node_memberships"] == 1
    assert economic["counts"]["shops"] == 0
    assert economic["counts"]["listings"] == 0
    assert economic["counts"]["demands"] == 0
    assert economic["counts"]["spotlights"] == 0
    assert economic["counts"]["finance_records"] == 0
    assert economic["primary_next_action"]["action_key"] == "review_market_operations"
    assert "does not create a marketplace" in economic["boundary"]
    assert "create a shop" in economic["boundary"]
    assert "publish listings" in economic["boundary"]
    assert "create demand" in economic["boundary"]
    assert "move money" in economic["boundary"]
    assert "payment instructions" in economic["boundary"]
    assert "private member activity" in economic["boundary"]

    lanes = {item["lane_key"]: item for item in economic["lanes"]}
    assert lanes["marketplace"]["status"] == "core_template"
    assert lanes["marketplace"]["ready"] is True
    assert lanes["shops"]["status"] == "enabled_by_template"
    assert lanes["shops"]["ready"] is True
    assert lanes["spotlight"]["status"] == "enabled_by_template"
    assert lanes["vault"]["status"] == "enabled_by_template"
    assert lanes["demand"]["status"] == "available_optional"
    assert lanes["demand"]["ready"] is False
    assert lanes["finance_support"]["status"] == "not_connected_in_this_slice"
    assert lanes["finance_support"]["ready"] is False
    assert "does not create a marketplace" in lanes["marketplace"]["boundary"]

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        assert domain.status == "draft"
        assert domain.verification_status == "unverified"
        assert db.query(CommunityDomainMembership).count() == 2
        assert db.query(CommunityNodeMembership).count() == 1
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(Clan).count() == 0


def test_member_can_read_economic_participation_but_admin_routes_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "economic-member@example.com")
    outsider = _seed_user(3, "economic-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Economic School Domain",
                "display_name": "Economic School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        member_response = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert member_response.status_code == 201, member_response.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_economic = client.get(
            f"/community-domains/{domain_id}/economic-participation"
        )
        assert member_economic.status_code == 200, member_economic.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_economic = client.get(
            f"/community-domains/{domain_id}/economic-participation"
        )
        assert outsider_economic.status_code == 403, outsider_economic.text
        assert "active Community Domain members" in outsider_economic.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    economic = member_economic.json()["economic_participation"]
    lanes = {item["lane_key"]: item for item in economic["lanes"]}
    assert economic["viewer"] == {"can_admin": False}
    assert economic["template"]["marketplace_role"] == "optional"
    assert economic["primary_next_action"] == {
        "action_key": "ask_domain_admin",
        "label": "Ask a Community Domain admin to configure economic participation",
        "route_hint": None,
        "requires_admin": True,
    }
    assert lanes["marketplace"]["route_hint"].endswith("/service-settings")
    assert lanes["shops"]["route_hint"] is None
    assert lanes["demand"]["route_hint"] is None
    assert lanes["spotlight"]["route_hint"] is None
    assert lanes["finance_support"]["route_hint"] is None
    assert lanes["marketplace"]["status"] == "optional_template"
    assert lanes["shops"]["status"] == "available_optional"
    assert lanes["spotlight"]["status"] == "enabled_by_template"
    assert economic["editable"] is False
    assert "private member activity" in economic["boundary"]


def test_roles_projection_counts_domain_and_node_roles_without_granting_permissions(
    client: TestClient,
):
    owner = _seed_owner()
    admin = _seed_user(2, "roles-admin@example.com")
    trader = _seed_user(3, "roles-trader@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Onitsha Roles Market",
                "display_name": "Onitsha Roles Market",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert line.status_code == 201, line.text
        line_id = line.json()["node"]["id"]

        admin_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": admin.id,
                "role": "domain_admin",
                "title": "Market domain administrator",
            },
        )
        assert admin_member.status_code == 201, admin_member.text

        trader_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": trader.id,
                "role": "member",
                "title": "Electronics trader",
            },
        )
        assert trader_member.status_code == 201, trader_member.text

        placed = client.post(
            f"/community-domains/{domain_id}/nodes/{line_id}/members",
            json={
                "user_id": trader.id,
                "role": "trader",
                "title": "Phone accessories trader",
            },
        )
        assert placed.status_code == 201, placed.text

        response = client.get(f"/community-domains/{domain_id}/roles")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    roles = payload["roles"]
    assert roles["editable"] is False
    assert "does not create roles" in roles["boundary"]
    assert "assign roles" in roles["boundary"]
    assert "grant permissions" in roles["boundary"]
    assert "verify authority" in roles["boundary"]

    by_key = {item["role_key"]: item for item in roles["items"]}
    assert by_key["owner"]["admin_role"] is True
    assert by_key["owner"]["assignable"] is False
    assert by_key["owner"]["active_domain_members"] == 1
    assert by_key["domain_admin"]["admin_role"] is True
    assert by_key["domain_admin"]["active_domain_members"] == 1
    assert by_key["trader"]["admin_role"] is False
    assert by_key["trader"]["active_domain_members"] == 0
    assert by_key["trader"]["active_node_memberships"] == 1
    assert by_key["trader"]["total_active_assignments"] == 1
    assert by_key["line_admin"]["scope"] == "node"
    assert by_key["line_member"]["scope"] == "node"
    assert by_key["trader"]["editable"] is False
    assert by_key["trader"]["admin_visible"] is True
    assert "grant permissions" in by_key["trader"]["boundary"]

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        assert domain.status == "draft"
        assert domain.verification_status == "unverified"
        assert db.query(CommunityDomainMembership).count() == 3
        assert db.query(CommunityNodeMembership).count() == 1
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(Clan).count() == 0


def test_member_can_read_roles_projection_but_outsider_is_rejected(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "roles-member@example.com")
    outsider = _seed_user(3, "roles-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Church Roles Domain",
                "display_name": "Church Roles Domain",
                "domain_type": "religious_body",
                "template_key": "church_religious_body",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        member_response = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": member.id,
                "role": "member",
                "title": "Department member",
            },
        )
        assert member_response.status_code == 201, member_response.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_roles = client.get(f"/community-domains/{domain_id}/roles")
        assert member_roles.status_code == 200, member_roles.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_roles = client.get(f"/community-domains/{domain_id}/roles")
        assert outsider_roles.status_code == 403, outsider_roles.text
        assert "active Community Domain members" in outsider_roles.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    roles = member_roles.json()["roles"]
    by_key = {item["role_key"]: item for item in roles["items"]}
    assert by_key["member"]["active_domain_members"] == 1
    assert by_key["domain_admin"]["admin_visible"] is False
    assert by_key["member"]["admin_visible"] is False
    assert roles["editable"] is False
    assert "private member evidence" in roles["boundary"]


def test_governance_model_projects_policy_and_review_shape_without_deciding(
    client: TestClient,
):
    owner = _seed_owner()
    domain_admin = _seed_user(2, "governance-domain-admin@example.com")
    branch_admin = _seed_user(3, "governance-branch-admin@example.com")
    requester = _seed_user(4, "governance-requester@example.com")
    new_member = _seed_user(5, "governance-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Governance Model Market",
                "display_name": "Governance Model Market",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Medical Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert line.status_code == 201, line.text
        line_id = line.json()["node"]["id"]

        for user, role in (
            (domain_admin, "domain_admin"),
            (branch_admin, "branch_admin"),
            (requester, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        placed = client.post(
            f"/community-domains/{domain_id}/nodes/{line_id}/members",
            json={
                "user_id": branch_admin.id,
                "role": "branch_admin",
                "title": "Medical line chair",
            },
        )
        assert placed.status_code == 201, placed.text

        central_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "central-member-add-review",
                "action_key": "domain_member.upsert",
                "scope_type": "domain",
                "review_mode": "domain_admin_review",
                "required_role": "domain_admin",
                "config": {"min_reviewers": 2},
                "policy_summary": "Domain admins review new member approvals.",
            },
        )
        assert central_policy.status_code == 201, central_policy.text

        node_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "line-placement-review",
                "action_key": "node_member.upsert",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "branch_admin",
                "policy_summary": "Line admins review line placements.",
            },
        )
        assert node_policy.status_code == 201, node_policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {
                    "user_id": new_member.id,
                    "role": "member",
                    "title": "Pending verified member",
                },
            },
        )
        assert review.status_code == 201, review.text

        app.dependency_overrides[get_current_user] = lambda: owner
        response = client.get(f"/community-domains/{domain_id}/governance-model")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    model = payload["governance_model"]
    assert model["editable"] is False
    assert "does not create policy" in model["boundary"]
    assert "decide reviews" in model["boundary"]
    assert "apply reviews" in model["boundary"]
    assert "grant authority" in model["boundary"]
    assert "activate billing" in model["boundary"]
    assert "private review payloads" in model["boundary"]

    assert model["policy_counts"]["total"] == 2
    assert model["policy_counts"]["active"] == 2
    assert model["policy_counts"]["domain_scoped"] == 1
    assert model["policy_counts"]["node_scoped"] == 1
    assert model["policy_counts"]["required_role"] == 2
    assert model["policy_counts"]["multi_reviewer"] == 1
    assert model["policy_counts"]["by_review_mode"]["domain_admin_review"] == 1
    assert model["policy_counts"]["by_review_mode"]["node_admin_review"] == 1
    assert model["review_counts"]["total"] == 1
    assert model["review_counts"]["open"] == 1
    assert model["review_counts"]["by_status"]["pending"] == 1
    assert model["review_counts"]["by_action"]["domain_member.upsert"] == 1

    by_key = {item["model_key"]: item for item in model["items"]}
    assert by_key["domain_admin_review"]["configured"] is True
    assert by_key["node_admin_review"]["configured"] is True
    assert by_key["required_role_review"]["count"] == 2
    assert by_key["multi_reviewer_review"]["count"] == 1
    assert by_key["action_review_record"]["count"] == 1
    assert by_key["domain_admin_review"]["editable"] is False
    assert by_key["domain_admin_review"]["admin_visible"] is True
    assert "move money" in by_key["domain_admin_review"]["boundary"]

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        assert domain.status == "draft"
        assert domain.verification_status == "unverified"
        assert db.query(CommunityDomainPolicy).count() == 2
        assert db.query(CommunityDomainActionReview).count() == 1
        assert db.query(CommunityDomainActionReviewDecision).count() == 0
        assert (
            db.query(CommunityDomainMembership)
            .filter(CommunityDomainMembership.user_id == new_member.id)
            .first()
            is None
        )
        assert db.query(Clan).count() == 0


def test_member_can_read_governance_model_but_outsider_is_rejected(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "governance-member@example.com")
    outsider = _seed_user(3, "governance-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "School Governance Model",
                "display_name": "School Governance Model",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        member_response = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": member.id,
                "role": "member",
                "title": "Parent teacher association member",
            },
        )
        assert member_response.status_code == 201, member_response.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_model = client.get(f"/community-domains/{domain_id}/governance-model")
        assert member_model.status_code == 200, member_model.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_model = client.get(f"/community-domains/{domain_id}/governance-model")
        assert outsider_model.status_code == 403, outsider_model.text
        assert "active Community Domain members" in outsider_model.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    model = member_model.json()["governance_model"]
    by_key = {item["model_key"]: item for item in model["items"]}
    assert model["viewer"] == {"can_admin": False}
    assert model["policy_counts"]["total"] == 0
    assert model["review_counts"]["total"] == 0
    assert by_key["domain_admin_review"]["admin_visible"] is False
    assert by_key["action_review_record"]["configured"] is False
    assert model["editable"] is False
    assert "private review payloads" in model["boundary"]


def test_readiness_projection_guides_package_setup_without_activation(
    client: TestClient,
):
    owner = _seed_owner()
    admin = _seed_user(2, "readiness-admin@example.com")
    trader = _seed_user(3, "readiness-trader@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Readiness Market Domain",
                "display_name": "Readiness Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Food Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert line.status_code == 201, line.text
        line_id = line.json()["node"]["id"]

        for user, role in ((admin, "domain_admin"), (trader, "member")):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        placed = client.post(
            f"/community-domains/{domain_id}/nodes/{line_id}/members",
            json={
                "user_id": trader.id,
                "role": "trader",
                "title": "Food line trader",
            },
        )
        assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "readiness-member-add-review",
                "action_key": "domain_member.upsert",
                "scope_type": "domain",
                "review_mode": "domain_admin_review",
                "required_role": "domain_admin",
                "policy_summary": "Domain admins review member changes.",
            },
        )
        assert policy.status_code == 201, policy.text

        response = client.get(f"/community-domains/{domain_id}/readiness")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    readiness = payload["readiness"]
    assert readiness["editable"] is False
    assert readiness["ready_total"] == 6
    assert readiness["blocked_total"] == 2
    assert readiness["blocked_lanes"] == ["billing", "verification"]
    assert readiness["primary_next_action"]["action_key"] == "package_quote"
    assert readiness["primary_next_action"]["requires_admin"] is True
    assert readiness["counts"]["nodes"] == 2
    assert readiness["counts"]["active_members"] == 3
    assert readiness["counts"]["active_node_memberships"] == 1
    assert readiness["counts"]["active_policies"] == 1
    assert readiness["counts"]["open_reviews"] == 0
    assert readiness["status"]["domain_status"] == "draft"
    assert readiness["status"]["verification_status"] == "unverified"
    assert "does not create nodes" in readiness["boundary"]
    assert "create a payment instruction" in readiness["boundary"]
    assert "activate billing" in readiness["boundary"]
    assert "verify authority" in readiness["boundary"]
    assert "private evidence" in readiness["boundary"]

    by_key = {item["lane_key"]: item for item in readiness["items"]}
    assert by_key["identity"]["ready"] is True
    assert by_key["structure"]["state"] == "ready"
    assert by_key["members"]["state"] == "ready"
    assert by_key["roles"]["state"] == "ready"
    assert by_key["governance"]["state"] == "ready"
    assert by_key["modules"]["state"] == "template_ready"
    assert by_key["billing"]["state"] == "quote_required"
    assert by_key["billing"]["ready"] is False
    assert by_key["verification"]["state"] == "unverified"
    assert by_key["verification"]["ready"] is False
    assert by_key["billing"]["route_hint"].endswith("/package-quote")
    assert "grant permissions" in by_key["roles"]["boundary"]

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        assert domain.status == "draft"
        assert domain.verification_status == "unverified"
        assert db.query(CommunityDomainMembership).count() == 3
        assert db.query(CommunityNodeMembership).count() == 1
        assert db.query(CommunityDomainPolicy).count() == 1
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(Clan).count() == 0


def test_member_can_read_readiness_but_admin_routes_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "readiness-member@example.com")
    outsider = _seed_user(3, "readiness-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Readiness School Domain",
                "display_name": "Readiness School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        member_response = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": member.id,
                "role": "member",
                "title": "Parent teacher association member",
            },
        )
        assert member_response.status_code == 201, member_response.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_readiness = client.get(f"/community-domains/{domain_id}/readiness")
        assert member_readiness.status_code == 200, member_readiness.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_readiness = client.get(f"/community-domains/{domain_id}/readiness")
        assert outsider_readiness.status_code == 403, outsider_readiness.text
        assert "active Community Domain members" in outsider_readiness.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    readiness = member_readiness.json()["readiness"]
    by_key = {item["lane_key"]: item for item in readiness["items"]}
    assert readiness["viewer"] == {"can_admin": False}
    assert readiness["primary_next_action"] == {
        "action_key": "ask_domain_admin",
        "label": "Ask a Community Domain admin to continue setup",
        "route_hint": None,
        "requires_admin": True,
    }
    assert by_key["members"]["route_hint"] is None
    assert by_key["billing"]["route_hint"] is None
    assert by_key["verification"]["route_hint"] is None
    assert by_key["modules"]["route_hint"].endswith("/service-settings")
    assert readiness["editable"] is False
    assert "private evidence" in readiness["boundary"]


def test_verification_requirements_project_type_specific_authority_without_verifying(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Verification Market Domain",
                "display_name": "Verification Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        response = client.get(
            f"/community-domains/{domain_id}/verification-requirements"
        )
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    requirements = payload["verification_requirements"]
    assert requirements["editable"] is False
    assert requirements["required_total"] == 5
    assert requirements["submitted_total"] == 0
    assert requirements["accepted_total"] == 0
    assert requirements["status"] == {
        "verification_status": "unverified",
        "verified": False,
        "template_key": "market_cooperative",
        "domain_type": "market_cooperative",
    }
    assert requirements["primary_next_action"] == {
        "action_key": "collect_authority_evidence",
        "label": "Prepare Community Domain authority evidence",
        "route_hint": f"/community-domains/{domain_id}/verification",
        "requires_admin": True,
    }
    assert "does not upload evidence" in requirements["boundary"]
    assert "accept evidence" in requirements["boundary"]
    assert "verify authority" in requirements["boundary"]
    assert "activate billing" in requirements["boundary"]
    assert "private evidence" in requirements["boundary"]

    by_key = {item["requirement_key"]: item for item in requirements["items"]}
    assert by_key["legal_identity"]["required"] is True
    assert by_key["authorized_representative"]["status"] == "required"
    assert by_key["administrative_contact"]["evidence_status"] == "not_tracked_in_this_slice"
    assert by_key["structure_authority"]["admin_visible"] is True
    assert by_key["market_authority_letter"]["applies_to"] == "market_cooperative"
    assert by_key["market_authority_letter"]["route_hint"].endswith("/verification")
    assert "does not upload" in by_key["market_authority_letter"]["boundary"]

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        assert domain.status == "draft"
        assert domain.verification_status == "unverified"
        assert db.query(CommunityDomainMembership).count() == 1
        assert db.query(CommunityNode).count() == 1
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(Clan).count() == 0


def test_member_can_read_verification_requirements_but_admin_routes_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "verification-member@example.com")
    outsider = _seed_user(3, "verification-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Church Verification Domain",
                "display_name": "Church Verification Domain",
                "domain_type": "religious_body",
                "template_key": "church_religious_body",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        member_response = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": member.id,
                "role": "member",
                "title": "Ministry member",
            },
        )
        assert member_response.status_code == 201, member_response.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_requirements = client.get(
            f"/community-domains/{domain_id}/verification-requirements"
        )
        assert member_requirements.status_code == 200, member_requirements.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_requirements = client.get(
            f"/community-domains/{domain_id}/verification-requirements"
        )
        assert outsider_requirements.status_code == 403, outsider_requirements.text
        assert "active Community Domain members" in outsider_requirements.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    requirements = member_requirements.json()["verification_requirements"]
    by_key = {item["requirement_key"]: item for item in requirements["items"]}
    assert requirements["viewer"] == {"can_admin": False}
    assert requirements["primary_next_action"] == {
        "action_key": "ask_domain_admin",
        "label": "Ask a Community Domain admin to prepare authority evidence",
        "route_hint": None,
        "requires_admin": True,
    }
    assert by_key["religious_body_authority"]["applies_to"] == "religious_body"
    assert by_key["religious_body_authority"]["route_hint"] is None
    assert by_key["legal_identity"]["route_hint"] is None
    assert requirements["editable"] is False
    assert "private evidence" in requirements["boundary"]


def test_activation_requirements_project_setup_blockers_without_activation(
    client: TestClient,
):
    owner = _seed_owner()
    admin = _seed_user(2, "activation-admin@example.com")
    trader = _seed_user(3, "activation-trader@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Activation Market Domain",
                "display_name": "Activation Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert line.status_code == 201, line.text

        for user, role in ((admin, "domain_admin"), (trader, "member")):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "activation-member-add-review",
                "action_key": "domain_member.upsert",
                "scope_type": "domain",
                "review_mode": "domain_admin_review",
                "required_role": "domain_admin",
                "policy_summary": "Domain admins review activation-sensitive member changes.",
            },
        )
        assert policy.status_code == 201, policy.text

        response = client.get(
            f"/community-domains/{domain_id}/activation-requirements"
        )
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    requirements = payload["activation_requirements"]
    assert requirements["editable"] is False
    assert requirements["ready_total"] == 3
    assert requirements["blocked_total"] == 5
    assert requirements["blocked_requirements"] == [
        "package_quote",
        "pricing_confirmation",
        "payment_instruction",
        "billing_activation",
        "authority_verification",
    ]
    assert requirements["primary_next_action"] == {
        "action_key": "package_quote",
        "label": "Review Community Domain package quote",
        "route_hint": f"/community-domains/{domain_id}/package-quote",
        "requires_admin": True,
    }
    assert requirements["status"] == {
        "domain_status": "draft",
        "verification_status": "unverified",
        "template_key": "market_cooperative",
        "domain_type": "market_cooperative",
    }
    assert requirements["counts"]["nodes"] == 2
    assert requirements["counts"]["active_members"] == 3
    assert requirements["counts"]["active_policies"] == 1
    assert "create a payment instruction" in requirements["boundary"]
    assert "record payment" in requirements["boundary"]
    assert "create an invoice" in requirements["boundary"]
    assert "activate billing" in requirements["boundary"]
    assert "activate the Community Domain" in requirements["boundary"]
    assert "verify authority" in requirements["boundary"]
    assert "private evidence" in requirements["boundary"]

    by_key = {item["requirement_key"]: item for item in requirements["items"]}
    assert by_key["package_quote"]["status"] == "manual_quote_required"
    assert by_key["pricing_confirmation"]["status"] == "pilot_quote_required"
    assert by_key["payment_instruction"]["status"] == "not_created"
    assert by_key["billing_activation"]["status"] == "inactive"
    assert by_key["authority_verification"]["status"] == "unverified"
    assert by_key["structure_ready"]["status"] == "ready"
    assert by_key["member_base_ready"]["status"] == "ready"
    assert by_key["governance_ready"]["status"] == "ready"
    assert by_key["billing_activation"]["route_hint"].endswith("/package-quote")
    assert "activate the Community Domain" in by_key["billing_activation"]["boundary"]

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        assert domain.status == "draft"
        assert domain.verification_status == "unverified"
        assert db.query(CommunityDomainMembership).count() == 3
        assert db.query(CommunityNode).count() == 2
        assert db.query(CommunityDomainPolicy).count() == 1
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(Clan).count() == 0


def test_member_can_read_activation_requirements_but_admin_routes_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "activation-member@example.com")
    outsider = _seed_user(3, "activation-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Activation School Domain",
                "display_name": "Activation School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        member_response = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": member.id,
                "role": "member",
                "title": "Parent teacher association member",
            },
        )
        assert member_response.status_code == 201, member_response.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_requirements = client.get(
            f"/community-domains/{domain_id}/activation-requirements"
        )
        assert member_requirements.status_code == 200, member_requirements.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_requirements = client.get(
            f"/community-domains/{domain_id}/activation-requirements"
        )
        assert outsider_requirements.status_code == 403, outsider_requirements.text
        assert "active Community Domain members" in outsider_requirements.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    requirements = member_requirements.json()["activation_requirements"]
    by_key = {item["requirement_key"]: item for item in requirements["items"]}
    assert requirements["viewer"] == {"can_admin": False}
    assert requirements["primary_next_action"] == {
        "action_key": "ask_domain_admin",
        "label": "Ask a Community Domain admin to complete activation preparation",
        "route_hint": None,
        "requires_admin": True,
    }
    assert by_key["package_quote"]["route_hint"] is None
    assert by_key["pricing_confirmation"]["route_hint"] is None
    assert by_key["payment_instruction"]["route_hint"] is None
    assert by_key["billing_activation"]["route_hint"] is None
    assert by_key["authority_verification"]["route_hint"] is None
    assert by_key["structure_ready"]["route_hint"].endswith("/nodes/tree")
    assert by_key["payment_instruction"]["admin_visible"] is False
    assert requirements["editable"] is False
    assert "private evidence" in requirements["boundary"]


def test_community_domain_draft_rejects_duplicate_domain_name(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        first = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Teachers Union Enugu",
                "display_name": "Teachers Union Enugu",
                "domain_type": "union",
            },
        )
        assert first.status_code == 201, first.text

        duplicate = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "teachers union enugu",
                "display_name": "Teachers Union Enugu Duplicate",
                "domain_type": "union",
            },
        )
        assert duplicate.status_code == 409, duplicate.text
        assert duplicate.json()["detail"]["code"] == "domain_name_taken"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_social_community_creation_still_uses_clan_spine(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Aba Market Union",
                "display_name": "Aba Market Union",
                "domain_type": "market_association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text

        created_clan = client.post(
            "/clans/",
            json={
                "name": "Aba Friends Circle",
                "description": "A lightweight social community.",
            },
        )
        assert created_clan.status_code == 201, created_clan.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        clan = db.query(Clan).one()
        membership = db.query(ClanMembership).one()

        assert domain.status == "draft"
        assert domain.clan_id is None
        assert clan.name == "Aba Friends Circle"
        assert clan.status == "active"
        assert membership.clan_id == clan.id
        assert membership.user_id == owner.id


def test_owner_builds_nested_community_domain_nodes_for_large_institution(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Onitsha Main Market Union",
                "display_name": "Onitsha Main Market Union",
                "domain_type": "market_association",
                "template_key": "market_association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain = created_domain.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "parent_node_id": root_node_id,
                "node_type": "line",
                "node_kind": "market_line",
                "description": "Electronics traders operating under the market umbrella.",
                "sort_order": 10,
            },
        )
        assert branch.status_code == 201, branch.text
        branch_node = branch.json()["node"]
        assert branch_node["parent_node_id"] == root_node_id
        assert branch_node["node_type"] == "line"
        assert branch_node["node_kind"] == "market_line"
        assert branch_node["depth"] == 1
        assert branch_node["path"].endswith(f"/{branch_node['id']}")

        department = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Phone Accessories Committee",
                "parent_node_id": branch_node["id"],
                "node_type": "committee",
                "node_kind": "trade_committee",
                "visibility_policy": "node_members",
                "inherits_parent_policy": False,
            },
        )
        assert department.status_code == 201, department.text
        department_node = department.json()["node"]
        assert department_node["parent_node_id"] == branch_node["id"]
        assert department_node["depth"] == 2
        assert department_node["path"] == f"{branch_node['path']}/{department_node['id']}"
        assert department_node["visibility_policy"] == "node_members"
        assert department_node["inherits_parent_policy"] is False

        listed = client.get(f"/community-domains/{domain_id}/nodes")
        assert listed.status_code == 200, listed.text
        listed_data = listed.json()
        assert listed_data["total"] == 3
        assert [node["name"] for node in listed_data["items"]] == [
            "Onitsha Main Market Union",
            "Electronics Line",
            "Phone Accessories Committee",
        ]
        assert "do not by themselves grant membership" in listed_data["boundary"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_community_domain_node_tree_returns_nested_structure_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-tree-member@example.com")
    outsider = _seed_user(3, "node-tree-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Tree Market Domain",
                "display_name": "Tree Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain = created_domain.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "parent_node_id": root_node_id,
                "node_type": "line",
                "node_kind": "market_line",
                "sort_order": 10,
            },
        )
        assert line.status_code == 201, line.text
        line_node = line.json()["node"]

        committee = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Warranty Committee",
                "parent_node_id": line_node["id"],
                "node_type": "committee",
                "node_kind": "trade_committee",
                "sort_order": 2,
            },
        )
        assert committee.status_code == 201, committee.text
        committee_node = committee.json()["node"]

        plumbing = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Plumbing Line",
                "parent_node_id": root_node_id,
                "node_type": "line",
                "node_kind": "market_line",
                "sort_order": 20,
            },
        )
        assert plumbing.status_code == 201, plumbing.text

        member_response = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": member.id,
                "role": "member",
                "title": "Tree viewer",
            },
        )
        assert member_response.status_code == 201, member_response.text

        app.dependency_overrides[get_current_user] = lambda: member
        response = client.get(f"/community-domains/{domain_id}/nodes/tree")
        assert response.status_code == 200, response.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_response = client.get(f"/community-domains/{domain_id}/nodes/tree")
        assert outsider_response.status_code == 403, outsider_response.text
        assert "active Community Domain members" in outsider_response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    assert payload["total"] == 4
    assert "Read-only structure tree" in payload["boundary"]
    assert "does not create nodes" in payload["boundary"]
    assert "grant roles" in payload["boundary"]
    assert "separate Community Domain" in payload["boundary"]

    root = payload["items"][0]
    assert root["id"] == root_node_id
    assert root["name"] == "Tree Market Domain"
    assert root["child_count"] == 2
    assert [child["name"] for child in root["children"]] == [
        "Electronics Line",
        "Plumbing Line",
    ]
    electronics = root["children"][0]
    assert electronics["id"] == line_node["id"]
    assert electronics["child_count"] == 1
    assert electronics["children"][0]["id"] == committee_node["id"]
    assert electronics["children"][0]["name"] == "Warranty Committee"
    assert electronics["children"][0]["children"] == []
    assert electronics["children"][0]["child_count"] == 0

    with SessionLocal() as db:
        domain_row = db.query(CommunityDomain).one()
        assert domain_row.status == "draft"
        assert domain_row.verification_status == "unverified"
        assert db.query(CommunityNode).count() == 4
        assert db.query(CommunityDomainMembership).count() == 2
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(Clan).count() == 0


def test_node_operating_summary_rolls_up_branch_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    line_admin = _seed_user(2, "operating-line-admin@example.com")
    trader = _seed_user(3, "operating-trader@example.com")
    technician = _seed_user(4, "operating-technician@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Operating Market Domain",
                "display_name": "Operating Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain = created_domain.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "parent_node_id": root_node_id,
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert line.status_code == 201, line.text
        line_id = line.json()["node"]["id"]

        committee = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Warranty Committee",
                "parent_node_id": line_id,
                "node_type": "committee",
                "node_kind": "trade_committee",
            },
        )
        assert committee.status_code == 201, committee.text
        committee_id = committee.json()["node"]["id"]

        for user in (line_admin, trader, technician):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (line_id, line_admin, "line_admin"),
            (line_id, trader, "trader"),
            (committee_id, technician, "committee_member"),
        ]
        for node_id, user, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "operating-line-member-review",
                "action_key": "node_member.role_change",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "line_admin",
                "policy_summary": "Line admins review member role changes.",
            },
        )
        assert policy.status_code == 201, policy.text

        review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.role_change",
                "community_node_id": line_id,
                "target_type": "node_member",
                "target_id": str(trader.id),
                "request_note": "Promote trader to committee support.",
                "payload": {
                    "user_id": trader.id,
                    "role": "committee_member",
                    "title": "Committee support",
                },
            },
        )
        assert review.status_code == 201, review.text

        response = client.get(
            f"/community-domains/{domain_id}/nodes/{line_id}/operating-summary"
        )
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    assert payload["community_node_id"] == line_id
    summary = payload["operating_summary"]
    assert summary["editable"] is False
    assert summary["node"]["id"] == line_id
    assert summary["scope"]["node_scope_ids"] == [line_id, committee_id]
    assert summary["scope"]["descendant_node_count"] == 1
    assert summary["counts"]["direct_child_nodes"] == 1
    assert summary["counts"]["subtree_nodes"] == 2
    assert summary["counts"]["direct_active_node_members"] == 2
    assert summary["counts"]["subtree_active_node_members"] == 3
    assert summary["counts"]["admin_assignments"] == 1
    assert summary["counts"]["active_node_policies"] == 1
    assert summary["counts"]["active_domain_policies"] == 0
    assert summary["counts"]["open_action_reviews"] == 1
    assert summary["role_counts"]["by_role"]["line_admin"] == 1
    assert summary["role_counts"]["by_role"]["trader"] == 1
    assert summary["role_counts"]["by_role"]["committee_member"] == 1
    assert summary["review_counts"]["open_by_status"] == {"pending": 1}
    assert summary["review_counts"]["open_by_action"] == {
        "node_member.role_change": 1
    }
    assert summary["primary_next_action"]["action_key"] == "review_local_queue"
    assert summary["primary_next_action"]["route_hint"].endswith(
        f"/action-reviews/reviewer-queue?community_node_id={line_id}"
    )
    assert "does not create child nodes" in summary["boundary"]
    assert "add members" in summary["boundary"]
    assert "assign roles" in summary["boundary"]
    assert "create policy" in summary["boundary"]
    assert "decide reviews" in summary["boundary"]
    assert "verify a branch" in summary["boundary"]
    assert "separate Community Domain" in summary["boundary"]
    assert "private review payloads" in summary["boundary"]

    lanes = {item["lane_key"]: item for item in summary["lanes"]}
    assert lanes["structure"]["state"] == "has_child_units"
    assert lanes["local_members"]["state"] == "ready"
    assert lanes["local_admins"]["state"] == "ready"
    assert lanes["local_governance"]["state"] == "ready"
    assert lanes["open_reviews"]["state"] == "open"
    assert lanes["open_reviews"]["ready"] is False
    assert "private review payloads" in lanes["open_reviews"]["boundary"]

    with SessionLocal() as db:
        domain_row = db.query(CommunityDomain).one()
        assert domain_row.status == "draft"
        assert domain_row.verification_status == "unverified"
        assert db.query(CommunityNode).count() == 3
        assert db.query(CommunityDomainMembership).count() == 4
        assert db.query(CommunityNodeMembership).count() == 3
        assert db.query(CommunityDomainPolicy).count() == 1
        assert db.query(CommunityDomainActionReview).count() == 1
        assert db.query(CommunityDomainActionReviewDecision).count() == 0
        assert db.query(Clan).count() == 0


def test_member_can_read_node_operating_summary_but_admin_routes_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "operating-member@example.com")
    outsider = _seed_user(3, "operating-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Operating School Domain",
                "display_name": "Operating School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Abuja Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        branch_id = branch.json()["node"]["id"]

        member_response = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert member_response.status_code == 201, member_response.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_summary = client.get(
            f"/community-domains/{domain_id}/nodes/{branch_id}/operating-summary"
        )
        assert member_summary.status_code == 200, member_summary.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_summary = client.get(
            f"/community-domains/{domain_id}/nodes/{branch_id}/operating-summary"
        )
        assert outsider_summary.status_code == 403, outsider_summary.text
        assert "active Community Domain members" in outsider_summary.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    summary = member_summary.json()["operating_summary"]
    lanes = {item["lane_key"]: item for item in summary["lanes"]}
    assert summary["viewer"] == {"can_admin": False}
    assert summary["primary_next_action"] == {
        "action_key": "ask_node_or_domain_admin",
        "label": "Ask a Community Domain admin to manage this operating unit",
        "route_hint": None,
        "requires_admin": True,
    }
    assert lanes["structure"]["route_hint"].endswith("/nodes/tree")
    assert lanes["local_members"]["route_hint"] is None
    assert lanes["local_admins"]["route_hint"] is None
    assert lanes["local_governance"]["route_hint"] is None
    assert lanes["open_reviews"]["route_hint"] is None
    assert summary["editable"] is False
    assert "private review payloads" in summary["boundary"]


def test_community_domain_node_create_rejects_duplicate_sibling_name(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Dominion School Network",
                "display_name": "Dominion School Network",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        first = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={"name": "Abuja Branch", "node_type": "branch", "node_kind": "school_branch"},
        )
        assert first.status_code == 201, first.text

        duplicate = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={"name": "Abuja Branch", "node_type": "branch", "node_kind": "school_branch"},
        )
        assert duplicate.status_code == 409, duplicate.text
        assert duplicate.json()["detail"]["code"] == "community_node_name_exists"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_only_owner_or_platform_admin_can_manage_community_domain_nodes(
    client: TestClient,
):
    owner = _seed_owner()
    outsider = _seed_user(2, "outsider@example.com")
    platform_admin = _seed_user(3, "admin@example.com", role="admin")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Teachers Union Lagos",
                "display_name": "Teachers Union Lagos",
                "domain_type": "union",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_get = client.get(f"/community-domains/{domain_id}")
        assert outsider_get.status_code == 403, outsider_get.text

        outsider_list = client.get(f"/community-domains/{domain_id}/nodes")
        assert outsider_list.status_code == 403, outsider_list.text

        outsider_create = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={"name": "Science Teachers Chapter"},
        )
        assert outsider_create.status_code == 403, outsider_create.text

        outsider_members = client.get(f"/community-domains/{domain_id}/members")
        assert outsider_members.status_code == 403, outsider_members.text

        outsider_member_create = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": outsider.id},
        )
        assert outsider_member_create.status_code == 403, outsider_member_create.text

        app.dependency_overrides[get_current_user] = lambda: platform_admin
        admin_create = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Science Teachers Chapter",
                "node_type": "chapter",
                "node_kind": "professional_chapter",
            },
        )
        assert admin_create.status_code == 201, admin_create.text

        admin_get = client.get(f"/community-domains/{domain_id}")
        assert admin_get.status_code == 200, admin_get.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_owner_adds_domain_member_and_places_member_inside_node(
    client: TestClient,
):
    owner = _seed_owner()
    teacher = _seed_user(2, "teacher@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Dominion College Network",
                "display_name": "Dominion College Network",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Abuja Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": teacher.id,
                "role": "staff",
                "title": "Mathematics Teacher",
            },
        )
        assert added.status_code == 201, added.text
        added_member = added.json()["membership"]
        assert added_member["user_id"] == teacher.id
        assert added_member["role"] == "staff"
        assert added_member["title"] == "Mathematics Teacher"
        assert added.json()["created"] is True
        assert "does not create a social Community membership" in added.json()["boundary"]

        listed_members = client.get(f"/community-domains/{domain_id}/members")
        assert listed_members.status_code == 200, listed_members.text
        member_items = listed_members.json()["items"]
        assert [item["role"] for item in member_items] == ["owner", "staff"]

        placed = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={
                "user_id": teacher.id,
                "role": "teacher",
                "title": "JSS2 Mathematics",
            },
        )
        assert placed.status_code == 201, placed.text
        node_member = placed.json()["membership"]
        assert node_member["community_node_id"] == node_id
        assert node_member["user_id"] == teacher.id
        assert node_member["role"] == "teacher"
        assert node_member["title"] == "JSS2 Mathematics"
        assert "Governance powers still need" in placed.json()["boundary"]

        listed_node_members = client.get(f"/community-domains/{domain_id}/nodes/{node_id}/members")
        assert listed_node_members.status_code == 200, listed_node_members.text
        assert listed_node_members.json()["total"] == 1
        assert listed_node_members.json()["items"][0]["user_email"] == "teacher@example.com"

        updated = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={
                "user_id": teacher.id,
                "role": "branch_admin",
                "title": "Academic coordinator",
            },
        )
        assert updated.status_code == 201, updated.text
        assert updated.json()["created"] is False
        assert updated.json()["membership"]["role"] == "branch_admin"

    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        assert db.query(CommunityDomainMembership).count() == 2
        assert db.query(CommunityNodeMembership).count() == 1
        assert db.query(ClanMembership).count() == 0


def test_member_placement_summary_projects_roles_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    teacher = _seed_user(2, "placement-teacher@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Placement School Domain",
                "display_name": "Placement School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Abuja Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        branch_id = branch.json()["node"]["id"]

        department = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Mathematics Department",
                "parent_node_id": branch_id,
                "node_type": "department",
                "node_kind": "academic_department",
            },
        )
        assert department.status_code == 201, department.text
        department_id = department.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": teacher.id,
                "role": "staff",
                "title": "Mathematics teacher",
            },
        )
        assert added.status_code == 201, added.text

        for node_id, role in ((branch_id, "teacher"), (department_id, "committee_member")):
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": teacher.id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "subject_user_id": teacher.id,
                "target_type": "domain_member",
                "target_id": str(teacher.id),
                "request_note": "Review teacher's updated placement.",
                "payload": {
                    "user_id": teacher.id,
                    "role": "staff",
                    "title": "Senior mathematics teacher",
                },
            },
        )
        assert review.status_code == 201, review.text

        response = client.get(
            f"/community-domains/{domain_id}/members/{teacher.id}/placement-summary"
        )
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    assert payload["user_id"] == teacher.id
    summary = payload["placement_summary"]
    assert summary["editable"] is False
    assert summary["viewer"] == {"can_admin": True, "self": False}
    assert summary["member"]["user_id"] == teacher.id
    assert summary["domain_role"] == "staff"
    assert summary["domain_status"] == "active"
    assert summary["counts"]["node_placements"] == 2
    assert summary["counts"]["active_node_placements"] == 2
    assert summary["counts"]["admin_assignments"] == 0
    assert summary["counts"]["open_reviews"] == 1
    assert summary["role_counts"]["by_role"] == {
        "teacher": 1,
        "committee_member": 1,
    }
    assert summary["review_counts"]["open_by_status"] == {"pending": 1}
    assert summary["review_counts"]["open_by_action"] == {"domain_member.upsert": 1}
    assert {item["community_node_id"] for item in summary["node_placements"]} == {
        branch_id,
        department_id,
    }
    assert summary["primary_next_action"]["action_key"] == "review_member_queue"
    assert "does not add the member" in summary["boundary"]
    assert "place the member in a node" in summary["boundary"]
    assert "assign roles" in summary["boundary"]
    assert "decide reviews" in summary["boundary"]
    assert "expose other domains" in summary["boundary"]
    assert "private review payloads" in summary["boundary"]

    lanes = {item["lane_key"]: item for item in summary["lanes"]}
    assert lanes["domain_membership"]["state"] == "active"
    assert lanes["node_placements"]["state"] == "placed"
    assert lanes["admin_assignments"]["state"] == "member_only"
    assert lanes["open_reviews"]["state"] == "open"
    assert lanes["open_reviews"]["ready"] is False
    assert "private review payloads" in lanes["open_reviews"]["boundary"]

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        assert domain.status == "draft"
        assert domain.verification_status == "unverified"
        assert db.query(CommunityDomainMembership).count() == 2
        assert db.query(CommunityNodeMembership).count() == 2
        assert db.query(CommunityDomainActionReview).count() == 1
        assert db.query(CommunityDomainActionReviewDecision).count() == 0
        assert db.query(Clan).count() == 0


def test_member_can_read_own_placement_summary_but_not_other_members(
    client: TestClient,
):
    owner = _seed_owner()
    teacher = _seed_user(2, "placement-self@example.com")
    other_member = _seed_user(3, "placement-other@example.com")
    outsider = _seed_user(4, "placement-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Placement Privacy Domain",
                "display_name": "Placement Privacy Domain",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user in (teacher, other_member):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: teacher
        own_summary = client.get(
            f"/community-domains/{domain_id}/members/{teacher.id}/placement-summary"
        )
        assert own_summary.status_code == 200, own_summary.text

        other_summary = client.get(
            f"/community-domains/{domain_id}/members/{other_member.id}/placement-summary"
        )
        assert other_summary.status_code == 403, other_summary.text
        assert "view another member placement summary" in other_summary.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_summary = client.get(
            f"/community-domains/{domain_id}/members/{outsider.id}/placement-summary"
        )
        assert outsider_summary.status_code == 403, outsider_summary.text
        assert "active Community Domain members" in outsider_summary.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    summary = own_summary.json()["placement_summary"]
    lanes = {item["lane_key"]: item for item in summary["lanes"]}
    assert summary["viewer"] == {"can_admin": False, "self": True}
    assert summary["primary_next_action"] == {
        "action_key": "review_own_placement",
        "label": "Review your Community Domain placement",
        "route_hint": None,
        "requires_admin": False,
    }
    assert lanes["domain_membership"]["route_hint"] is None
    assert lanes["node_placements"]["route_hint"] is None
    assert lanes["admin_assignments"]["route_hint"] is None
    assert lanes["open_reviews"]["route_hint"] is None
    assert summary["editable"] is False
    assert "private review payloads" in summary["boundary"]


def test_node_membership_requires_active_domain_membership(
    client: TestClient,
):
    owner = _seed_owner()
    outsider = _seed_user(2, "not-yet-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Onitsha Traders Domain",
                "display_name": "Onitsha Traders Domain",
                "domain_type": "market_association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Medical Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        blocked = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={"user_id": outsider.id, "role": "line_member"},
        )
        assert blocked.status_code == 409, blocked.text
        assert blocked.json()["detail"]["code"] == "community_domain_membership_required"

        inactive = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": outsider.id, "role": "trader", "status": "suspended"},
        )
        assert inactive.status_code == 201, inactive.text

        still_blocked = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={"user_id": outsider.id, "role": "line_member"},
        )
        assert still_blocked.status_code == 409, still_blocked.text
        assert still_blocked.json()["detail"]["code"] == "community_domain_membership_required"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_inactive_node_rejects_new_placements_and_action_reviews(
    client: TestClient,
):
    owner = _seed_owner()
    trader = _seed_user(2, "inactive-node-trader@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Inactive Line Market Domain",
                "display_name": "Inactive Line Market Domain",
                "domain_type": "market_association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        inactive_line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Closed Textile Line",
                "node_type": "line",
                "node_kind": "market_line",
                "status": "inactive",
            },
        )
        assert inactive_line.status_code == 201, inactive_line.text
        node_id = inactive_line.json()["node"]["id"]
        assert inactive_line.json()["node"]["status"] == "inactive"

        listed_nodes = client.get(f"/community-domains/{domain_id}/nodes")
        assert listed_nodes.status_code == 200, listed_nodes.text
        assert any(item["id"] == node_id for item in listed_nodes.json()["items"])

        blocked_child = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "parent_node_id": node_id,
                "name": "Closed Textile Sub-line",
                "node_type": "stall_cluster",
                "node_kind": "market_unit",
            },
        )
        assert blocked_child.status_code == 409, blocked_child.text
        assert blocked_child.json()["detail"]["code"] == "community_domain_node_inactive"

        blocked_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "community_node_id": node_id,
                "policy_key": "closed-textile-member-change",
                "action_key": "node_member.upsert",
                "review_mode": "node_admin_review",
            },
        )
        assert blocked_policy.status_code == 409, blocked_policy.text
        assert blocked_policy.json()["detail"]["code"] == "community_domain_node_inactive"

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": trader.id, "role": "trader"},
        )
        assert added.status_code == 201, added.text

        blocked_placement = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={"user_id": trader.id, "role": "line_member"},
        )
        assert blocked_placement.status_code == 409, blocked_placement.text
        assert (
            blocked_placement.json()["detail"]["code"]
            == "community_domain_node_inactive"
        )

        blocked_review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "community_node_id": node_id,
                "action_key": "node_member.upsert",
                "target_type": "node_member",
                "target_id": str(trader.id),
                "payload": {"user_id": trader.id, "role": "line_member"},
            },
        )
        assert blocked_review.status_code == 409, blocked_review.text
        assert (
            blocked_review.json()["detail"]["code"]
            == "community_domain_node_inactive"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        assert db.query(CommunityNodeMembership).count() == 0
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(CommunityDomainPolicy).count() == 0


def test_inactive_parent_node_blocks_descendant_writes(
    client: TestClient,
):
    owner = _seed_owner()
    staff = _seed_user(2, "inactive-parent-staff@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Parent Closed School Domain",
                "display_name": "Parent Closed School Domain",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Closed Enugu Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        branch_id = branch.json()["node"]["id"]

        department = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "parent_node_id": branch_id,
                "name": "Primary Department",
                "node_type": "department",
                "node_kind": "academic_department",
            },
        )
        assert department.status_code == 201, department.text
        department_id = department.json()["node"]["id"]

        with SessionLocal() as db:
            branch_row = (
                db.query(CommunityNode)
                .filter(CommunityNode.id == branch_id)
                .filter(CommunityNode.community_domain_id == domain_id)
                .one()
            )
            branch_row.status = "inactive"
            db.add(branch_row)
            db.commit()

        listed_nodes = client.get(f"/community-domains/{domain_id}/nodes")
        assert listed_nodes.status_code == 200, listed_nodes.text
        department_item = next(
            item for item in listed_nodes.json()["items"] if item["id"] == department_id
        )
        assert department_item["status"] == "active"

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": staff.id, "role": "staff"},
        )
        assert added.status_code == 201, added.text

        blocked_child = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "parent_node_id": department_id,
                "name": "Primary 1 Class",
                "node_type": "class",
                "node_kind": "school_class",
            },
        )
        assert blocked_child.status_code == 409, blocked_child.text
        assert blocked_child.json()["detail"]["code"] == "community_domain_node_inactive"

        blocked_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "community_node_id": department_id,
                "policy_key": "closed-parent-department-member-change",
                "action_key": "node_member.upsert",
                "review_mode": "node_admin_review",
            },
        )
        assert blocked_policy.status_code == 409, blocked_policy.text
        assert blocked_policy.json()["detail"]["code"] == "community_domain_node_inactive"

        blocked_placement = client.post(
            f"/community-domains/{domain_id}/nodes/{department_id}/members",
            json={"user_id": staff.id, "role": "teacher"},
        )
        assert blocked_placement.status_code == 409, blocked_placement.text
        assert blocked_placement.json()["detail"]["code"] == "community_domain_node_inactive"

        blocked_review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "community_node_id": department_id,
                "action_key": "node_member.upsert",
                "target_type": "node_member",
                "target_id": str(staff.id),
                "payload": {"user_id": staff.id, "role": "teacher"},
            },
        )
        assert blocked_review.status_code == 409, blocked_review.text
        assert blocked_review.json()["detail"]["code"] == "community_domain_node_inactive"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        assert db.query(CommunityNodeMembership).count() == 0
        assert db.query(CommunityDomainPolicy).count() == 0
        assert db.query(CommunityDomainActionReview).count() == 0


def test_archived_parent_node_blocks_descendant_writes(
    client: TestClient,
):
    owner = _seed_owner()
    staff = _seed_user(2, "archived-parent-staff@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Archived Parent School Domain",
                "display_name": "Archived Parent School Domain",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Archived Owerri Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        branch_id = branch.json()["node"]["id"]

        department = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "parent_node_id": branch_id,
                "name": "Archived Parent Department",
                "node_type": "department",
                "node_kind": "academic_department",
            },
        )
        assert department.status_code == 201, department.text
        department_id = department.json()["node"]["id"]

        archived = client.patch(
            f"/community-domains/{domain_id}/nodes/{branch_id}/status",
            json={
                "status": "archived",
                "status_note": "Branch absorbed into another campus.",
            },
        )
        assert archived.status_code == 200, archived.text
        assert archived.json()["node"]["status"] == "archived"

        listed_nodes = client.get(f"/community-domains/{domain_id}/nodes")
        assert listed_nodes.status_code == 200, listed_nodes.text
        listed_items = {item["id"]: item for item in listed_nodes.json()["items"]}
        assert listed_items[branch_id]["status"] == "archived"
        assert listed_items[department_id]["status"] == "active"

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": staff.id, "role": "staff"},
        )
        assert added.status_code == 201, added.text

        blocked_child = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "parent_node_id": department_id,
                "name": "Archived Parent Class",
                "node_type": "class",
                "node_kind": "school_class",
            },
        )
        assert blocked_child.status_code == 409, blocked_child.text
        assert blocked_child.json()["detail"]["code"] == "community_domain_node_inactive"

        blocked_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "community_node_id": department_id,
                "policy_key": "archived-parent-department-member-change",
                "action_key": "node_member.upsert",
                "review_mode": "node_admin_review",
            },
        )
        assert blocked_policy.status_code == 409, blocked_policy.text
        assert blocked_policy.json()["detail"]["code"] == "community_domain_node_inactive"

        blocked_placement = client.post(
            f"/community-domains/{domain_id}/nodes/{department_id}/members",
            json={"user_id": staff.id, "role": "teacher"},
        )
        assert blocked_placement.status_code == 409, blocked_placement.text
        assert (
            blocked_placement.json()["detail"]["code"]
            == "community_domain_node_inactive"
        )

        blocked_review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "community_node_id": department_id,
                "action_key": "node_member.upsert",
                "target_type": "node_member",
                "target_id": str(staff.id),
                "payload": {"user_id": staff.id, "role": "teacher"},
            },
        )
        assert blocked_review.status_code == 409, blocked_review.text
        assert blocked_review.json()["detail"]["code"] == "community_domain_node_inactive"

        blocked_reopen_child = client.patch(
            f"/community-domains/{domain_id}/nodes/{department_id}/status",
            json={
                "status": "active",
                "status_note": "Trying to reopen child before parent.",
            },
        )
        assert blocked_reopen_child.status_code == 409, blocked_reopen_child.text
        assert (
            blocked_reopen_child.json()["detail"]["code"]
            == "community_domain_node_inactive"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        assert db.query(CommunityNodeMembership).count() == 0
        assert db.query(CommunityDomainPolicy).count() == 0
        records = db.query(CommunityDomainActionReview).all()
        assert len(records) == 1
        assert records[0].action_key == "node.status.update"


def test_domain_admin_can_close_node_without_deleting_descendants(
    client: TestClient,
):
    owner = _seed_owner()
    staff = _seed_user(2, "node-close-staff@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Close Branch School Domain",
                "display_name": "Close Branch School Domain",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_data = created_domain.json()["community_domain"]
        domain_id = domain_data["id"]
        root_node_id = domain_data["root_node"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Closable Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        branch_id = branch.json()["node"]["id"]

        department = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "parent_node_id": branch_id,
                "name": "Visible Department",
                "node_type": "department",
                "node_kind": "academic_department",
            },
        )
        assert department.status_code == 201, department.text
        department_id = department.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": staff.id, "role": "staff"},
        )
        assert added.status_code == 201, added.text

        placed = client.post(
            f"/community-domains/{domain_id}/nodes/{department_id}/members",
            json={"user_id": staff.id, "role": "teacher"},
        )
        assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "community_node_id": department_id,
                "policy_key": "visible-department-member-change",
                "action_key": "node_member.role_change",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: staff
        pending_review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "community_node_id": department_id,
                "action_key": "node_member.role_change",
                "target_type": "node_member",
                "target_id": str(staff.id),
                "request_note": "Move me into department operations.",
                "payload": {"user_id": staff.id, "role": "department_operator"},
            },
        )
        assert pending_review_response.status_code == 201, pending_review_response.text
        pending_review = pending_review_response.json()["action_review"]
        expected_impact_summary = {
            "node_scope_ids": [branch_id, department_id],
            "descendant_node_count": 1,
            "active_node_member_count": 1,
            "active_policy_count": 1,
            "open_action_review_count": 1,
            "open_action_reviews_by_status": {"pending": 1},
        }

        app.dependency_overrides[get_current_user] = lambda: staff
        forbidden_preview = client.get(
            f"/community-domains/{domain_id}/nodes/{branch_id}/status-impact"
        )
        assert forbidden_preview.status_code == 403, forbidden_preview.text

        forbidden = client.patch(
            f"/community-domains/{domain_id}/nodes/{branch_id}/status",
            json={"status": "inactive"},
        )
        assert forbidden.status_code == 403, forbidden.text

        app.dependency_overrides[get_current_user] = lambda: owner
        preview = client.get(
            f"/community-domains/{domain_id}/nodes/{branch_id}/status-impact"
        )
        assert preview.status_code == 200, preview.text
        preview_data = preview.json()
        assert preview_data["current_status"] == "active"
        assert preview_data["status_mutable"] is True
        assert preview_data["node"]["id"] == branch_id
        assert preview_data["impact_summary"] == expected_impact_summary
        assert "Read-only preview" in preview_data["boundary"]

        invalid = client.patch(
            f"/community-domains/{domain_id}/nodes/{branch_id}/status",
            json={"status": "closed"},
        )
        assert invalid.status_code == 422, invalid.text
        assert invalid.json()["detail"]["code"] == "community_domain_node_status_invalid"

        root_close = client.patch(
            f"/community-domains/{domain_id}/nodes/{root_node_id}/status",
            json={"status": "inactive"},
        )
        assert root_close.status_code == 409, root_close.text
        assert (
            root_close.json()["detail"]["code"]
            == "community_domain_root_node_status_immutable"
        )

        missing_note = client.patch(
            f"/community-domains/{domain_id}/nodes/{branch_id}/status",
            json={"status": "inactive"},
        )
        assert missing_note.status_code == 422, missing_note.text
        assert (
            missing_note.json()["detail"]["code"]
            == "community_domain_node_status_note_required"
        )

        closed = client.patch(
            f"/community-domains/{domain_id}/nodes/{branch_id}/status",
            json={
                "status": "inactive",
                "status_note": "Branch paused after the term ended.",
            },
        )
        assert closed.status_code == 200, closed.text
        closed_data = closed.json()
        assert closed_data["changed"] is True
        assert closed_data["previous_status"] == "active"
        assert closed_data["node"]["status"] == "inactive"
        assert closed_data["descendant_count"] == 1
        assert closed_data["impact_summary"] == expected_impact_summary
        lifecycle_record = closed_data["lifecycle_record"]
        assert lifecycle_record["action_key"] == "node.status.update"
        assert lifecycle_record["status"] == "applied"
        assert lifecycle_record["applied_by_user_id"] == owner.id
        assert lifecycle_record["target_type"] == "community_node"
        assert lifecycle_record["target_id"] == str(branch_id)
        assert lifecycle_record["request_note"] == "Branch paused after the term ended."
        assert lifecycle_record["payload"] == {
            "community_node_id": branch_id,
            "new_status": "inactive",
            "previous_status": "active",
            "status_note": "Branch paused after the term ended.",
            "impact_summary": closed_data["impact_summary"],
        }
        assert "does not delete descendants" in closed_data["boundary"]
        assert "not an immutable audit ledger" in closed_data["boundary"]

        repeated_close = client.patch(
            f"/community-domains/{domain_id}/nodes/{branch_id}/status",
            json={"status": "inactive", "status_note": "Repeat close."},
        )
        assert repeated_close.status_code == 200, repeated_close.text
        assert repeated_close.json()["changed"] is False
        assert repeated_close.json()["lifecycle_record"] is None

        repeated_close_without_note = client.patch(
            f"/community-domains/{domain_id}/nodes/{branch_id}/status",
            json={"status": "inactive"},
        )
        assert repeated_close_without_note.status_code == 200, repeated_close_without_note.text
        assert repeated_close_without_note.json()["changed"] is False
        assert repeated_close_without_note.json()["lifecycle_record"] is None

        listed_nodes = client.get(f"/community-domains/{domain_id}/nodes")
        assert listed_nodes.status_code == 200, listed_nodes.text
        listed_items = {item["id"]: item for item in listed_nodes.json()["items"]}
        assert listed_items[branch_id]["status"] == "inactive"
        assert listed_items[department_id]["status"] == "active"

        blocked_reopen = client.patch(
            f"/community-domains/{domain_id}/nodes/{department_id}/status",
            json={"status": "active"},
        )
        assert blocked_reopen.status_code == 409, blocked_reopen.text
        assert (
            blocked_reopen.json()["detail"]["code"]
            == "community_domain_node_inactive"
        )

        blocked_child = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "parent_node_id": department_id,
                "name": "Blocked Class",
                "node_type": "class",
                "node_kind": "school_class",
            },
        )
        assert blocked_child.status_code == 409, blocked_child.text
        assert blocked_child.json()["detail"]["code"] == "community_domain_node_inactive"

        blocked_placement = client.post(
            f"/community-domains/{domain_id}/nodes/{department_id}/members",
            json={"user_id": staff.id, "role": "teacher"},
        )
        assert blocked_placement.status_code == 409, blocked_placement.text
        assert (
            blocked_placement.json()["detail"]["code"]
            == "community_domain_node_inactive"
        )

        missing_reopen_note = client.patch(
            f"/community-domains/{domain_id}/nodes/{branch_id}/status",
            json={"status": "active"},
        )
        assert missing_reopen_note.status_code == 422, missing_reopen_note.text
        assert (
            missing_reopen_note.json()["detail"]["code"]
            == "community_domain_node_status_note_required"
        )

        reopened = client.patch(
            f"/community-domains/{domain_id}/nodes/{branch_id}/status",
            json={
                "status": "active",
                "status_note": "Branch reopened for the new term.",
            },
        )
        assert reopened.status_code == 200, reopened.text
        reopened_data = reopened.json()
        assert reopened_data["changed"] is True
        assert reopened_data["previous_status"] == "inactive"
        assert reopened_data["node"]["status"] == "active"
        reopen_record = reopened_data["lifecycle_record"]
        assert reopen_record["action_key"] == "node.status.update"
        assert reopen_record["request_note"] == "Branch reopened for the new term."
        assert reopen_record["payload"]["previous_status"] == "inactive"
        assert reopen_record["payload"]["new_status"] == "active"

        activity = client.get(
            f"/community-domains/{domain_id}/action-reviews/activity",
            params={"community_node_id": branch_id, "event_type": "review_status_changed"},
        )
        assert activity.status_code == 200, activity.text
        activity_data = activity.json()
        assert activity_data["total"] == 2
        activity_items = {
            item["action_review_id"]: item for item in activity_data["items"]
        }
        close_activity_item = activity_items[lifecycle_record["id"]]
        assert close_activity_item["type"] == "review_status_changed"
        assert close_activity_item["actor_user_id"] == owner.id
        assert close_activity_item["payload"]["action_review"]["action_key"] == (
            "node.status.update"
        )
        assert close_activity_item["payload"]["action_review"]["payload"][
            "impact_summary"
        ] == closed_data["impact_summary"]
        reopen_activity_item = activity_items[reopen_record["id"]]
        assert reopen_activity_item["type"] == "review_status_changed"
        assert reopen_activity_item["actor_user_id"] == owner.id
        assert reopen_activity_item["payload"]["action_review"]["payload"][
            "status_note"
        ] == "Branch reopened for the new term."
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        nodes = {
            int(row.id): row.status
            for row in db.query(CommunityNode)
            .order_by(CommunityNode.id.asc())
            .all()
        }
        assert nodes[branch_id] == "active"
        assert nodes[department_id] == "active"
        assert db.query(CommunityNodeMembership).count() == 1
        records = db.query(CommunityDomainActionReview).all()
        assert len(records) == 3
        node_status_records = [
            row for row in records if row.action_key == "node.status.update"
        ]
        assert [row.request_note for row in node_status_records] == [
            "Branch paused after the term ended.",
            "Branch reopened for the new term.",
        ]
        review_records = [
            row for row in records if row.action_key == "node_member.role_change"
        ]
        assert len(review_records) == 1
        assert review_records[0].id == pending_review["id"]


def test_archived_node_requires_reason_and_rejects_new_writes(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "archived-node-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Archived Line Market Domain",
                "display_name": "Archived Line Market Domain",
                "domain_type": "market_association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Old Spare Parts Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert line.status_code == 201, line.text
        line_id = line.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "trader"},
        )
        assert added.status_code == 201, added.text

        missing_note = client.patch(
            f"/community-domains/{domain_id}/nodes/{line_id}/status",
            json={"status": "archived"},
        )
        assert missing_note.status_code == 422, missing_note.text
        assert (
            missing_note.json()["detail"]["code"]
            == "community_domain_node_status_note_required"
        )

        archived = client.patch(
            f"/community-domains/{domain_id}/nodes/{line_id}/status",
            json={
                "status": "archived",
                "status_note": "Line merged into the central spare parts union.",
            },
        )
        assert archived.status_code == 200, archived.text
        archived_data = archived.json()
        assert archived_data["changed"] is True
        assert archived_data["previous_status"] == "active"
        assert archived_data["node"]["status"] == "archived"
        assert archived_data["lifecycle_record"]["payload"]["new_status"] == "archived"

        preview = client.get(
            f"/community-domains/{domain_id}/nodes/{line_id}/status-impact"
        )
        assert preview.status_code == 200, preview.text
        assert preview.json()["current_status"] == "archived"

        blocked_child = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "parent_node_id": line_id,
                "name": "Archived Child Line",
                "node_type": "stall_cluster",
                "node_kind": "market_unit",
            },
        )
        assert blocked_child.status_code == 409, blocked_child.text
        assert blocked_child.json()["detail"]["code"] == "community_domain_node_inactive"

        blocked_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "community_node_id": line_id,
                "policy_key": "archived-line-member-change",
                "action_key": "node_member.upsert",
                "review_mode": "domain_admin_review",
            },
        )
        assert blocked_policy.status_code == 409, blocked_policy.text
        assert blocked_policy.json()["detail"]["code"] == "community_domain_node_inactive"

        blocked_placement = client.post(
            f"/community-domains/{domain_id}/nodes/{line_id}/members",
            json={"user_id": member.id, "role": "line_member"},
        )
        assert blocked_placement.status_code == 409, blocked_placement.text
        assert (
            blocked_placement.json()["detail"]["code"]
            == "community_domain_node_inactive"
        )

        blocked_review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "community_node_id": line_id,
                "action_key": "node_member.upsert",
                "target_type": "node_member",
                "target_id": str(member.id),
                "payload": {"user_id": member.id, "role": "line_member"},
            },
        )
        assert blocked_review.status_code == 409, blocked_review.text
        assert blocked_review.json()["detail"]["code"] == "community_domain_node_inactive"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        node = db.query(CommunityNode).filter(CommunityNode.id == line_id).one()
        assert node.status == "archived"
        assert db.query(CommunityNodeMembership).count() == 0
        records = db.query(CommunityDomainActionReview).all()
        assert len(records) == 1
        assert records[0].action_key == "node.status.update"


def test_inactive_parent_node_blocks_pending_review_approval_and_apply(
    client: TestClient,
):
    owner = _seed_owner()
    staff = _seed_user(2, "inactive-review-staff@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Closed Review Branch School",
                "display_name": "Closed Review Branch School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Review Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        branch_id = branch.json()["node"]["id"]

        department = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "parent_node_id": branch_id,
                "name": "Review Department",
                "node_type": "department",
                "node_kind": "academic_department",
            },
        )
        assert department.status_code == 201, department.text
        department_id = department.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": staff.id, "role": "staff"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: staff
        review_to_apply_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "community_node_id": department_id,
                "action_key": "node_member.upsert",
                "target_type": "node_member",
                "target_id": str(staff.id),
                "payload": {
                    "user_id": staff.id,
                    "role": "teacher",
                    "title": "Approved before closure",
                },
            },
        )
        assert review_to_apply_response.status_code == 201, review_to_apply_response.text
        review_to_apply = review_to_apply_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: owner
        approved = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review_to_apply['id']}/decision",
            json={"decision": "approve", "decision_note": "Approved while open."},
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["action_review"]["status"] == "approved"

        app.dependency_overrides[get_current_user] = lambda: staff
        pending_review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "community_node_id": department_id,
                "action_key": "node_member.upsert",
                "target_type": "node_member",
                "target_id": str(staff.id),
                "payload": {
                    "user_id": staff.id,
                    "role": "teacher",
                    "title": "Pending during closure",
                },
            },
        )
        assert pending_review_response.status_code == 201, pending_review_response.text
        pending_review = pending_review_response.json()["action_review"]

        with SessionLocal() as db:
            branch_row = (
                db.query(CommunityNode)
                .filter(CommunityNode.id == branch_id)
                .filter(CommunityNode.community_domain_id == domain_id)
                .one()
            )
            branch_row.status = "inactive"
            db.add(branch_row)
            db.commit()

        app.dependency_overrides[get_current_user] = lambda: owner
        blocked_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review_to_apply['id']}/apply"
        )
        assert blocked_apply.status_code == 409, blocked_apply.text
        assert blocked_apply.json()["detail"]["code"] == "community_domain_node_inactive"

        blocked_approval = client.post(
            f"/community-domains/{domain_id}/action-reviews/{pending_review['id']}/decision",
            json={"decision": "approve", "decision_note": "Trying after closure."},
        )
        assert blocked_approval.status_code == 409, blocked_approval.text
        assert blocked_approval.json()["detail"]["code"] == "community_domain_node_inactive"

        rejected = client.post(
            f"/community-domains/{domain_id}/action-reviews/{pending_review['id']}/decision",
            json={"decision": "reject", "decision_note": "Branch has closed."},
        )
        assert rejected.status_code == 200, rejected.text
        assert rejected.json()["action_review"]["status"] == "rejected"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        assert db.query(CommunityNodeMembership).count() == 0
        reviews = db.query(CommunityDomainActionReview).order_by(
            CommunityDomainActionReview.id.asc()
        ).all()
        assert [row.status for row in reviews] == ["approved", "rejected"]
        decisions = db.query(CommunityDomainActionReviewDecision).order_by(
            CommunityDomainActionReviewDecision.id.asc()
        ).all()
        assert [row.decision for row in decisions] == ["approve", "reject"]


def test_domain_admin_can_manage_structure_without_being_recorded_owner(
    client: TestClient,
):
    owner = _seed_owner()
    domain_admin = _seed_user(2, "domain-admin@example.com")
    teacher = _seed_user(3, "teacher-admin-test@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Union of Skilled Teachers",
                "display_name": "Union of Skilled Teachers",
                "domain_type": "union",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        promoted = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": domain_admin.id,
                "role": "domain_admin",
                "title": "National administrator",
            },
        )
        assert promoted.status_code == 201, promoted.text

        app.dependency_overrides[get_current_user] = lambda: domain_admin
        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Lagos Chapter",
                "node_type": "chapter",
                "node_kind": "professional_chapter",
            },
        )
        assert branch.status_code == 201, branch.text

        added_teacher = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": teacher.id,
                "role": "member",
                "title": "Registered teacher",
            },
        )
        assert added_teacher.status_code == 201, added_teacher.text

        owner_rewrite = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": owner.id, "role": "member"},
        )
        assert owner_rewrite.status_code == 403, owner_rewrite.text
        assert "owner role cannot be reassigned" in owner_rewrite.text

        illegal_owner = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": teacher.id, "role": "owner"},
        )
        assert illegal_owner.status_code == 403, illegal_owner.text
        assert "recorded Community Domain owner" in illegal_owner.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_node_admin_can_manage_only_local_node_members(
    client: TestClient,
):
    owner = _seed_owner()
    branch_admin = _seed_user(2, "branch-admin@example.com")
    teacher = _seed_user(3, "local-teacher@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Dominion Multi Branch School",
                "display_name": "Dominion Multi Branch School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Owerri Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        for user, role in ((branch_admin, "staff"), (teacher, "staff")):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        branch_admin_assignment = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={
                "user_id": branch_admin.id,
                "role": "branch_admin",
                "title": "Branch coordinator",
            },
        )
        assert branch_admin_assignment.status_code == 201, branch_admin_assignment.text

        app.dependency_overrides[get_current_user] = lambda: branch_admin

        can_view_domain = client.get(f"/community-domains/{domain_id}")
        assert can_view_domain.status_code == 200, can_view_domain.text

        can_view_nodes = client.get(f"/community-domains/{domain_id}/nodes")
        assert can_view_nodes.status_code == 200, can_view_nodes.text

        cannot_list_domain_members = client.get(f"/community-domains/{domain_id}/members")
        assert cannot_list_domain_members.status_code == 403, cannot_list_domain_members.text

        cannot_create_sibling_node = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Aba Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert cannot_create_sibling_node.status_code == 403, cannot_create_sibling_node.text

        can_list_local_members = client.get(
            f"/community-domains/{domain_id}/nodes/{node_id}/members"
        )
        assert can_list_local_members.status_code == 200, can_list_local_members.text

        local_assignment = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={
                "user_id": teacher.id,
                "role": "teacher",
                "title": "Primary 4 Teacher",
            },
        )
        assert local_assignment.status_code == 201, local_assignment.text
        assert local_assignment.json()["membership"]["role"] == "teacher"

        cannot_promote_local_admin = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={
                "user_id": teacher.id,
                "role": "branch_admin",
                "title": "Assistant branch admin",
            },
        )
        assert cannot_promote_local_admin.status_code == 403, cannot_promote_local_admin.text
        assert "local member roles only" in cannot_promote_local_admin.text

        app.dependency_overrides[get_current_user] = lambda: owner
        suspended_branch_admin = client.post(
            f"/community-domains/{domain_id}/members",
            json={
                "user_id": branch_admin.id,
                "role": "staff",
                "status": "suspended",
            },
        )
        assert suspended_branch_admin.status_code == 201, suspended_branch_admin.text

        app.dependency_overrides[get_current_user] = lambda: branch_admin
        cannot_manage_after_domain_suspension = client.get(
            f"/community-domains/{domain_id}/nodes/{node_id}/members"
        )
        assert cannot_manage_after_domain_suspension.status_code == 403
        assert "domain admin or node admin" in cannot_manage_after_domain_suspension.text

        cannot_assign_after_domain_suspension = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={
                "user_id": teacher.id,
                "role": "teacher",
                "title": "Primary 4 cover teacher",
            },
        )
        assert cannot_assign_after_domain_suspension.status_code == 403
        assert "domain admin or node admin" in cannot_assign_after_domain_suspension.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_ordinary_domain_member_can_view_but_not_manage_domain(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "ordinary-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Onitsha Association Domain",
                "display_name": "Onitsha Association Domain",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: member
        can_view_domain = client.get(f"/community-domains/{domain_id}")
        assert can_view_domain.status_code == 200, can_view_domain.text

        can_view_nodes = client.get(f"/community-domains/{domain_id}/nodes")
        assert can_view_nodes.status_code == 200, can_view_nodes.text

        cannot_manage_members = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": owner.id, "role": "member"},
        )
        assert cannot_manage_members.status_code == 403, cannot_manage_members.text

        cannot_create_node = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={"name": "New Local Chapter"},
        )
        assert cannot_create_node.status_code == 403, cannot_create_node.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_domain_admin_records_policy_and_decides_domain_action_review(
    client: TestClient,
):
    owner = _seed_owner()
    domain_admin = _seed_user(2, "policy-admin@example.com")
    member = _seed_user(3, "policy-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Dominion Teachers Trust",
                "display_name": "Dominion Teachers Trust",
                "domain_type": "union",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user, role in ((domain_admin, "domain_admin"), (member, "member")):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: domain_admin
        policy_response = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "member-verification-approval",
                "action_key": "member_verification.approve",
                "review_mode": "domain_admin_review",
                "required_role": "domain_admin",
                "policy_summary": "Member verification approval needs domain admin review.",
                "config": {"min_reviewers": 1},
            },
        )
        assert policy_response.status_code == 201, policy_response.text
        policy_data = policy_response.json()
        assert policy_data["created"] is True
        policy = policy_data["policy"]
        assert policy["action_key"] == "member_verification.approve"
        assert policy["community_node_id"] is None
        assert policy["config"] == {"min_reviewers": 1}

        app.dependency_overrides[get_current_user] = lambda: member
        listed_policies = client.get(f"/community-domains/{domain_id}/policies")
        assert listed_policies.status_code == 200, listed_policies.text
        assert listed_policies.json()["total"] == 1

        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "member_verification.approve",
                "subject_user_id": member.id,
                "target_type": "member_verification",
                "target_id": "verification-123",
                "request_note": "Member submitted enough evidence.",
                "payload": {"verification_id": 123},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]
        assert review["policy_id"] == policy["id"]
        assert review["status"] == "pending"
        assert review["payload"] == {"verification_id": 123}

        app.dependency_overrides[get_current_user] = lambda: domain_admin
        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Evidence accepted."},
        )
        assert decision.status_code == 200, decision.text
        decided = decision.json()["action_review"]
        assert decided["status"] == "approved"
        assert decided["decision"] == "approve"
        assert decided["decided_by_user_id"] == domain_admin.id
        assert "required approval count" in decision.json()["boundary"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        assert db.query(CommunityDomainPolicy).count() == 1
        assert db.query(CommunityDomainActionReview).count() == 1


def test_policy_listing_can_be_scoped_to_one_community_node(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Onitsha Market Policy Scope",
                "display_name": "Onitsha Market Policy Scope",
                "domain_type": "market",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        electronics_node = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={"name": "Electronics Line", "node_kind": "economic"},
        )
        assert electronics_node.status_code == 201, electronics_node.text
        electronics_node_id = electronics_node.json()["node"]["id"]

        medical_node = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={"name": "Medical Line", "node_kind": "economic"},
        )
        assert medical_node.status_code == 201, medical_node.text
        medical_node_id = medical_node.json()["node"]["id"]

        domain_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "domain-member-review",
                "action_key": "member.review",
                "required_role": "domain_admin",
            },
        )
        assert domain_policy.status_code == 201, domain_policy.text

        electronics_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "electronics-shop-review",
                "action_key": "shop.review",
                "community_node_id": electronics_node_id,
                "scope_type": "node",
                "required_role": "node_admin",
            },
        )
        assert electronics_policy.status_code == 201, electronics_policy.text
        electronics_policy_id = electronics_policy.json()["policy"]["id"]

        medical_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "medical-shop-review",
                "action_key": "shop.review",
                "community_node_id": medical_node_id,
                "scope_type": "node",
                "required_role": "node_admin",
            },
        )
        assert medical_policy.status_code == 201, medical_policy.text

        all_policies = client.get(f"/community-domains/{domain_id}/policies")
        assert all_policies.status_code == 200, all_policies.text
        assert all_policies.json()["total"] == 3

        electronics_policies = client.get(
            f"/community-domains/{domain_id}/policies",
            params={"community_node_id": electronics_node_id},
        )
        assert electronics_policies.status_code == 200, electronics_policies.text
        scoped_payload = electronics_policies.json()
        assert scoped_payload["total"] == 1
        assert scoped_payload["items"][0]["id"] == electronics_policy_id
        assert scoped_payload["items"][0]["community_node_id"] == electronics_node_id

        missing_node_policies = client.get(
            f"/community-domains/{domain_id}/policies",
            params={"community_node_id": 9999},
        )
        assert missing_node_policies.status_code == 404, missing_node_policies.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_node_admin_can_decide_node_scoped_review_but_not_domain_review(
    client: TestClient,
):
    owner = _seed_owner()
    branch_admin = _seed_user(2, "review-branch-admin@example.com")
    teacher = _seed_user(3, "review-teacher@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Dominion Global School",
                "display_name": "Dominion Global School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Abuja Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        department = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Science Department",
                "node_type": "department",
                "node_kind": "school_department",
                "parent_node_id": node_id,
            },
        )
        assert department.status_code == 201, department.text
        department_id = department.json()["node"]["id"]

        for user in (branch_admin, teacher):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "staff"},
            )
            assert added.status_code == 201, added.text

        assigned_admin = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={"user_id": branch_admin.id, "role": "branch_admin"},
        )
        assert assigned_admin.status_code == 201, assigned_admin.text

        assigned_teacher = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={"user_id": teacher.id, "role": "teacher"},
        )
        assert assigned_teacher.status_code == 201, assigned_teacher.text

        assigned_department_teacher = client.post(
            f"/community-domains/{domain_id}/nodes/{department_id}/members",
            json={"user_id": teacher.id, "role": "teacher"},
        )
        assert assigned_department_teacher.status_code == 201, (
            assigned_department_teacher.text
        )

        node_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "branch-role-change",
                "action_key": "node_member.role_change",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "branch_admin",
            },
        )
        assert node_policy.status_code == 201, node_policy.text

        domain_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "domain-billing-change",
                "action_key": "domain.billing.change",
                "review_mode": "domain_admin_review",
                "required_role": "domain_admin",
            },
        )
        assert domain_policy.status_code == 201, domain_policy.text

        app.dependency_overrides[get_current_user] = lambda: teacher
        node_review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.role_change",
                "community_node_id": node_id,
                "target_type": "node_member",
                "target_id": str(teacher.id),
            },
        )
        assert node_review_response.status_code == 201, node_review_response.text
        node_review = node_review_response.json()["action_review"]
        assert node_review["community_node_id"] == node_id
        assert node_review["policy_id"] == node_policy.json()["policy"]["id"]

        domain_review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain.billing.change",
                "target_type": "billing_setting",
                "target_id": "plan",
            },
        )
        assert domain_review_response.status_code == 201, domain_review_response.text
        domain_review = domain_review_response.json()["action_review"]
        assert domain_review["community_node_id"] is None
        assert domain_review["policy_id"] == domain_policy.json()["policy"]["id"]

        department_review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.role_change",
                "community_node_id": department_id,
                "target_type": "node_member",
                "target_id": str(teacher.id),
                "payload": {
                    "user_id": teacher.id,
                    "role": "committee_member",
                    "title": "Science committee",
                },
            },
        )
        assert department_review_response.status_code == 201, (
            department_review_response.text
        )
        department_review = department_review_response.json()["action_review"]
        assert department_review["community_node_id"] == department_id
        assert department_review["policy_id"] == node_policy.json()["policy"]["id"]

        cancel_department_review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.role_change",
                "community_node_id": department_id,
                "target_type": "node_member",
                "target_id": "science-secretary",
                "payload": {
                    "user_id": teacher.id,
                    "role": "committee_member",
                    "title": "Science secretary",
                },
            },
        )
        assert cancel_department_review_response.status_code == 201, (
            cancel_department_review_response.text
        )
        cancel_department_review = cancel_department_review_response.json()[
            "action_review"
        ]
        assert cancel_department_review["policy_id"] == node_policy.json()["policy"]["id"]

        app.dependency_overrides[get_current_user] = lambda: branch_admin
        node_reviews = client.get(
            f"/community-domains/{domain_id}/action-reviews",
            params={"community_node_id": node_id},
        )
        assert node_reviews.status_code == 200, node_reviews.text
        assert node_reviews.json()["total"] == 1

        descendant_reviews = client.get(
            f"/community-domains/{domain_id}/action-reviews",
            params={"community_node_id": node_id, "include_descendants": True},
        )
        assert descendant_reviews.status_code == 200, descendant_reviews.text
        descendant_review_data = descendant_reviews.json()
        assert descendant_review_data["total"] == 3
        assert descendant_review_data["include_descendants"] is True
        assert set(descendant_review_data["community_node_ids"]) == {
            node_id,
            department_id,
        }

        node_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{node_review['id']}/decision",
            json={"decision": "approve"},
        )
        assert node_decision.status_code == 200, node_decision.text
        assert node_decision.json()["action_review"]["status"] == "approved"

        department_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{department_review['id']}/decision",
            json={"decision": "approve"},
        )
        assert department_decision.status_code == 200, department_decision.text
        assert department_decision.json()["action_review"]["status"] == "approved"
        assert (
            department_decision.json()["action_review"]["policy_id"]
            == node_policy.json()["policy"]["id"]
        )

        inherited_cancel = client.post(
            f"/community-domains/{domain_id}/action-reviews/{cancel_department_review['id']}/cancel",
            json={"cancel_note": "Handled outside this review cycle."},
        )
        assert inherited_cancel.status_code == 200, inherited_cancel.text
        assert inherited_cancel.json()["action_review"]["status"] == "cancelled"
        assert (
            inherited_cancel.json()["action_review"]["decided_by_user_id"]
            == branch_admin.id
        )

        department_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{department_review['id']}/apply"
        )
        assert department_apply.status_code == 200, department_apply.text
        department_apply_data = department_apply.json()
        assert department_apply_data["action_review"]["status"] == "applied"
        assert department_apply_data["action_review"]["applied_by_user_id"] == branch_admin.id
        assert department_apply_data["applied"]["membership"]["community_node_id"] == department_id
        assert department_apply_data["applied"]["membership"]["role"] == "committee_member"
        assert department_apply_data["applied"]["membership"]["title"] == "Science committee"

        inherited_detail = client.get(
            f"/community-domains/{domain_id}/action-reviews/{department_review['id']}"
        )
        assert inherited_detail.status_code == 200, inherited_detail.text
        assert inherited_detail.json()["action_review"]["status"] == "applied"

        inherited_activity = client.get(
            f"/community-domains/{domain_id}/action-reviews/{department_review['id']}/activity"
        )
        assert inherited_activity.status_code == 200, inherited_activity.text
        assert "review_status_changed" in {
            item["type"] for item in inherited_activity.json()["items"]
        }

        node_summary = client.get(
            f"/community-domains/{domain_id}/action-reviews/summary",
            params={"community_node_id": node_id},
        )
        assert node_summary.status_code == 200, node_summary.text
        node_summary_data = node_summary.json()
        assert node_summary_data["community_node_id"] == node_id
        assert node_summary_data["total"] == 1
        assert node_summary_data["ready_to_apply_total"] == 1
        assert node_summary_data["attention_total"] == 0
        assert node_summary_data["by_status"] == {"approved": 1}
        assert node_summary_data["by_action"] == {"node_member.role_change": 1}
        assert node_summary_data["by_node"][0]["community_node_id"] == node_id
        assert "read-only dashboard count" in node_summary_data["boundary"]

        descendant_summary = client.get(
            f"/community-domains/{domain_id}/action-reviews/summary",
            params={"community_node_id": node_id, "include_descendants": True},
        )
        assert descendant_summary.status_code == 200, descendant_summary.text
        descendant_summary_data = descendant_summary.json()
        assert descendant_summary_data["total"] == 3
        assert descendant_summary_data["attention_total"] == 0
        assert descendant_summary_data["ready_to_apply_total"] == 1
        assert descendant_summary_data["terminal_total"] == 2
        assert descendant_summary_data["include_descendants"] is True
        assert set(descendant_summary_data["community_node_ids"]) == {
            node_id,
            department_id,
        }
        assert descendant_summary_data["by_status"] == {
            "approved": 1,
            "applied": 1,
            "cancelled": 1,
        }

        descendant_activity = client.get(
            f"/community-domains/{domain_id}/action-reviews/activity",
            params={
                "community_node_id": node_id,
                "include_descendants": True,
                "event_type": "review_created",
            },
        )
        assert descendant_activity.status_code == 200, descendant_activity.text
        descendant_activity_data = descendant_activity.json()
        assert descendant_activity_data["total"] == 3
        assert descendant_activity_data["include_descendants"] is True
        assert {
            item["community_node_id"] for item in descendant_activity_data["items"]
        } == {node_id, department_id}

        unscoped_summary = client.get(
            f"/community-domains/{domain_id}/action-reviews/summary"
        )
        assert unscoped_summary.status_code == 403, unscoped_summary.text

        domain_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{domain_review['id']}/decision",
            json={"decision": "approve"},
        )
        assert domain_decision.status_code == 403, domain_decision.text

        app.dependency_overrides[get_current_user] = lambda: owner
        domain_needs_changes = client.post(
            f"/community-domains/{domain_id}/action-reviews/{domain_review['id']}/decision",
            json={
                "decision": "needs_changes",
                "decision_note": "Billing committee must add the mandate note.",
            },
        )
        assert domain_needs_changes.status_code == 200, domain_needs_changes.text
        assert domain_needs_changes.json()["action_review"]["status"] == "needs_changes"

        domain_summary = client.get(
            f"/community-domains/{domain_id}/action-reviews/summary"
        )
        assert domain_summary.status_code == 200, domain_summary.text
        domain_summary_data = domain_summary.json()
        assert domain_summary_data["community_node_id"] is None
        assert domain_summary_data["total"] == 4
        assert domain_summary_data["attention_total"] == 0
        assert domain_summary_data["ready_to_apply_total"] == 1
        assert domain_summary_data["terminal_total"] == 2
        assert domain_summary_data["by_status"] == {
            "applied": 1,
            "approved": 1,
            "cancelled": 1,
            "needs_changes": 1,
        }
        assert domain_summary_data["by_action"] == {
            "domain.billing.change": 1,
            "node_member.role_change": 3,
        }
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_child_node_can_opt_out_of_parent_policy_inheritance(
    client: TestClient,
):
    owner = _seed_owner()
    branch_admin = _seed_user(2, "opt-out-branch-admin@example.com")
    requester = _seed_user(3, "opt-out-requester@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Independent Department School",
                "display_name": "Independent Department School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user in (branch_admin, requester):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Port Harcourt Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        branch_id = branch.json()["node"]["id"]

        department = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Independent Sports Department",
                "node_type": "department",
                "node_kind": "school_department",
                "parent_node_id": branch_id,
                "inherits_parent_policy": False,
            },
        )
        assert department.status_code == 201, department.text
        department_id = department.json()["node"]["id"]

        assigned_admin = client.post(
            f"/community-domains/{domain_id}/nodes/{branch_id}/members",
            json={"user_id": branch_admin.id, "role": "branch_admin"},
        )
        assert assigned_admin.status_code == 201, assigned_admin.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "branch-member-role-change",
                "action_key": "node_member.role_change",
                "community_node_id": branch_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "branch_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.role_change",
                "community_node_id": department_id,
                "target_type": "node_member",
                "target_id": "sports-chair",
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]
        assert review["community_node_id"] == department_id
        assert review["policy_id"] is None

        app.dependency_overrides[get_current_user] = lambda: branch_admin
        denied_cancel = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/cancel",
            json={"cancel_note": "Branch override."},
        )
        assert denied_cancel.status_code == 403, denied_cancel.text
        assert (
            denied_cancel.json()["detail"]["code"]
            == "community_domain_review_cancel_forbidden"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_inherited_policy_admin_can_view_child_review_lineage(
    client: TestClient,
):
    owner = _seed_owner()
    branch_admin = _seed_user(2, "lineage-branch-admin@example.com")
    requester = _seed_user(3, "lineage-requester@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Lineage Branch School",
                "display_name": "Lineage Branch School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user in (branch_admin, requester):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "staff"},
            )
            assert added.status_code == 201, added.text

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Lagos Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        branch_id = branch.json()["node"]["id"]

        department = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Maths Department",
                "node_type": "department",
                "node_kind": "school_department",
                "parent_node_id": branch_id,
            },
        )
        assert department.status_code == 201, department.text
        department_id = department.json()["node"]["id"]

        assigned_admin = client.post(
            f"/community-domains/{domain_id}/nodes/{branch_id}/members",
            json={"user_id": branch_admin.id, "role": "branch_admin"},
        )
        assert assigned_admin.status_code == 201, assigned_admin.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "lineage-branch-role-change",
                "action_key": "node_member.role_change",
                "community_node_id": branch_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "branch_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.role_change",
                "community_node_id": department_id,
                "target_type": "node_member",
                "target_id": "maths-secretary",
                "payload": {
                    "user_id": requester.id,
                    "role": "committee_member",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]
        assert review["community_node_id"] == department_id
        assert review["policy_id"] == policy.json()["policy"]["id"]

        app.dependency_overrides[get_current_user] = lambda: branch_admin
        needs_changes = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={
                "decision": "needs_changes",
                "decision_note": "Add the local department title.",
            },
        )
        assert needs_changes.status_code == 200, needs_changes.text
        assert needs_changes.json()["action_review"]["status"] == "needs_changes"

        app.dependency_overrides[get_current_user] = lambda: requester
        rejected_subject_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "subject_user_id": branch_admin.id,
                "request_note": "Wrong subject for the role change.",
                "payload": {
                    "user_id": requester.id,
                    "role": "committee_member",
                    "title": "Maths secretary",
                },
            },
        )
        assert rejected_subject_revision.status_code == 409, rejected_subject_revision.text
        assert (
            rejected_subject_revision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        rejected_target_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "target_id": str(branch_admin.id),
                "request_note": "Wrong target for the role change.",
                "payload": {
                    "user_id": requester.id,
                    "role": "committee_member",
                    "title": "Maths secretary",
                },
            },
        )
        assert rejected_target_revision.status_code == 409, rejected_target_revision.text
        assert (
            rejected_target_revision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        rejected_type_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "target_type": "domain_member",
                "request_note": "Wrong target family for the role change.",
                "payload": {
                    "user_id": requester.id,
                    "role": "committee_member",
                    "title": "Maths secretary",
                },
            },
        )
        assert rejected_type_revision.status_code == 409, rejected_type_revision.text
        assert (
            rejected_type_revision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        revision_response = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "request_note": "Added the local title.",
                "payload": {
                    "user_id": requester.id,
                    "role": "committee_member",
                    "title": "Maths secretary",
                },
            },
        )
        assert revision_response.status_code == 201, revision_response.text
        revision = revision_response.json()["action_review"]
        assert revision["parent_review_id"] == review["id"]
        assert revision["policy_id"] == policy.json()["policy"]["id"]
        assert revision["target_type"] == "node_member"
        assert revision["target_id"] == "maths-secretary"
        assert revision["payload"]["user_id"] == requester.id

        app.dependency_overrides[get_current_user] = lambda: owner
        demoted_branch_admin = client.post(
            f"/community-domains/{domain_id}/nodes/{branch_id}/members",
            json={"user_id": branch_admin.id, "role": "member"},
        )
        assert demoted_branch_admin.status_code == 201, demoted_branch_admin.text

        app.dependency_overrides[get_current_user] = lambda: branch_admin
        revision_detail = client.get(
            f"/community-domains/{domain_id}/action-reviews/{revision['id']}"
        )
        assert revision_detail.status_code == 403, revision_detail.text

        lineage = client.get(
            f"/community-domains/{domain_id}/action-reviews/{revision['id']}/lineage"
        )
        assert lineage.status_code == 200, lineage.text
        lineage_data = lineage.json()
        assert lineage_data["root_review_id"] == review["id"]
        assert lineage_data["latest_review_id"] == revision["id"]
        assert [item["id"] for item in lineage_data["items"]] == [
            review["id"],
            revision["id"],
        ]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_ordinary_member_cannot_create_policy_or_list_domain_reviews(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "policy-denied-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Aba Traders Domain",
                "display_name": "Aba Traders Domain",
                "domain_type": "market_association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: member
        denied_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "market-levy-approval",
                "action_key": "market_levy.approve",
            },
        )
        assert denied_policy.status_code == 403, denied_policy.text

        denied_reviews = client.get(f"/community-domains/{domain_id}/action-reviews")
        assert denied_reviews.status_code == 403, denied_reviews.text

        denied_summary = client.get(
            f"/community-domains/{domain_id}/action-reviews/summary"
        )
        assert denied_summary.status_code == 403, denied_summary.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_approved_node_review_can_apply_node_member_update_once(
    client: TestClient,
):
    owner = _seed_owner()
    branch_admin = _seed_user(2, "apply-branch-admin@example.com")
    teacher = _seed_user(3, "apply-teacher@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Apply Review School",
                "display_name": "Apply Review School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Lagos Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        for user in (branch_admin, teacher):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "staff"},
            )
            assert added.status_code == 201, added.text

        branch_admin_assignment = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={"user_id": branch_admin.id, "role": "branch_admin"},
        )
        assert branch_admin_assignment.status_code == 201, branch_admin_assignment.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "apply-node-member-change",
                "action_key": "node_member.role_change",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: teacher
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.role_change",
                "community_node_id": node_id,
                "target_type": "node_member",
                "target_id": str(teacher.id),
                "payload": {
                    "user_id": teacher.id,
                    "role": "committee_member",
                    "title": "Welfare committee",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        early_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert early_apply.status_code == 403, early_apply.text

        app.dependency_overrides[get_current_user] = lambda: branch_admin
        unapproved_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert unapproved_apply.status_code == 409, unapproved_apply.text
        assert unapproved_apply.json()["detail"]["code"] == "community_domain_review_not_approved"

        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve"},
        )
        assert decision.status_code == 200, decision.text

        applied = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert applied.status_code == 200, applied.text
        data = applied.json()
        assert data["action_review"]["status"] == "applied"
        assert data["action_review"]["applied_by_user_id"] == branch_admin.id
        assert data["action_review"]["applied_at"]
        assert data["applied"]["type"] == "node_member"
        assert data["applied"]["created"] is True
        assert data["applied"]["membership"]["user_id"] == teacher.id
        assert data["applied"]["membership"]["role"] == "committee_member"
        assert data["applied"]["membership"]["title"] == "Welfare committee"

        activity = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/activity"
        )
        assert activity.status_code == 200, activity.text
        status_items = [
            item for item in activity.json()["items"]
            if item["type"] == "review_status_changed"
        ]
        assert len(status_items) == 1
        assert status_items[0]["actor_user_id"] == branch_admin.id
        assert status_items[0]["payload"]["status"] == "applied"
        assert (
            status_items[0]["payload"]["action_review"]["applied_by_user_id"]
            == branch_admin.id
        )
        assert (
            status_items[0]["occurred_at"]
            == status_items[0]["payload"]["action_review"]["applied_at"]
        )

        node_feed = client.get(
            f"/community-domains/{domain_id}/action-reviews/activity"
            f"?community_node_id={node_id}"
        )
        assert node_feed.status_code == 200, node_feed.text
        node_feed_data = node_feed.json()
        assert node_feed_data["community_node_id"] == node_id
        assert node_feed_data["total"] == 3
        assert node_feed_data["items"][0]["type"] == "review_status_changed"
        assert node_feed_data["items"][0]["action_review_id"] == review["id"]
        assert node_feed_data["items"][0]["actor_user_id"] == branch_admin.id
        assert {item["type"] for item in node_feed_data["items"]} == {
            "review_created",
            "decision",
            "review_status_changed",
        }
        assert "read-only operational feed" in node_feed_data["boundary"]

        unscoped_feed = client.get(
            f"/community-domains/{domain_id}/action-reviews/activity"
        )
        assert unscoped_feed.status_code == 403, unscoped_feed.text

        applied_again = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert applied_again.status_code == 409, applied_again.text
        assert applied_again.json()["detail"]["code"] == "community_domain_review_already_applied"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        membership = (
            db.query(CommunityNodeMembership)
            .filter(CommunityNodeMembership.user_id == teacher.id)
            .one()
        )
        assert membership.role == "committee_member"
        review_row = db.query(CommunityDomainActionReview).one()
        assert review_row.status == "applied"
        assert review_row.applied_by_user_id == branch_admin.id
        assert review_row.applied_at is not None


def test_domain_admin_can_apply_reviewed_node_status_update(
    client: TestClient,
):
    owner = _seed_owner()
    branch_admin = _seed_user(2, "status-review-branch-admin@example.com")
    requester = _seed_user(3, "status-review-requester@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Reviewed Status Market",
                "display_name": "Reviewed Status Market",
                "domain_type": "market_association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        for user in (branch_admin, requester):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        branch_admin_assignment = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={"user_id": branch_admin.id, "role": "branch_admin"},
        )
        assert branch_admin_assignment.status_code == 201, branch_admin_assignment.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "line-status-change",
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "branch_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "target_type": "community_node",
                "target_id": str(node_id),
                "request_note": "The line is merging into a wider electronics council.",
                "payload": {
                    "status": "inactive",
                    "status_note": "Merged into the wider electronics council.",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]
        assert review["policy_id"] == policy.json()["policy"]["id"]
        assert review["payload"]["previous_status"] == "active"
        assert review["payload"]["new_status"] == "inactive"

        app.dependency_overrides[get_current_user] = lambda: branch_admin
        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Local line confirms."},
        )
        assert decision.status_code == 200, decision.text
        assert decision.json()["action_review"]["status"] == "approved"

        branch_admin_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert branch_admin_apply.status_code == 403, branch_admin_apply.text
        assert (
            branch_admin_apply.json()["detail"]["code"]
            == "community_domain_node_status_apply_domain_admin_required"
        )

        app.dependency_overrides[get_current_user] = lambda: owner
        applied = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert applied.status_code == 200, applied.text
        data = applied.json()
        assert data["action_review"]["status"] == "applied"
        assert data["action_review"]["applied_by_user_id"] == owner.id
        assert data["action_review"]["payload"]["previous_status"] == "active"
        assert data["action_review"]["payload"]["new_status"] == "inactive"
        assert (
            data["action_review"]["payload"]["status_note"]
            == "Merged into the wider electronics council."
        )
        assert data["applied"]["type"] == "node_status"
        assert data["applied"]["changed"] is True
        assert data["applied"]["previous_status"] == "active"
        assert data["applied"]["node"]["id"] == node_id
        assert data["applied"]["node"]["status"] == "inactive"
        assert data["applied"]["impact_summary"]["descendant_node_count"] == 0
        assert data["applied"]["impact_summary"]["active_node_member_count"] == 1
        assert data["applied"]["impact_summary"]["open_action_review_count"] == 1
        assert data["applied"]["impact_summary"]["open_action_reviews_by_status"] == {
            "approved": 1
        }

        node_detail = client.get(f"/community-domains/{domain_id}/nodes")
        assert node_detail.status_code == 200, node_detail.text
        line_node = [
            item for item in node_detail.json()["items"] if item["id"] == node_id
        ][0]
        assert line_node["status"] == "inactive"

        applied_again = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert applied_again.status_code == 409, applied_again.text
        assert (
            applied_again.json()["detail"]["code"]
            == "community_domain_review_already_applied"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        node = db.query(CommunityNode).filter(CommunityNode.id == node_id).one()
        assert node.status == "inactive"
        review_row = db.query(CommunityDomainActionReview).one()
        assert review_row.status == "applied"
        assert review_row.applied_by_user_id == owner.id
        assert review_row.applied_at is not None


def test_stale_reviewed_node_status_update_cannot_apply(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "stale-status-requester@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Stale Status Association",
                "display_name": "Stale Status Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Youth Wing",
                "node_type": "wing",
                "node_kind": "association_wing",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "wing-status-change",
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "target_type": "community_node",
                "target_id": str(node_id),
                "payload": {
                    "status": "inactive",
                    "status_note": "Youth wing has merged into the main council.",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]
        assert review["payload"]["previous_status"] == "active"

        app.dependency_overrides[get_current_user] = lambda: owner
        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve"},
        )
        assert decision.status_code == 200, decision.text
        assert decision.json()["action_review"]["status"] == "approved"

        direct_close = client.patch(
            f"/community-domains/{domain_id}/nodes/{node_id}/status",
            json={
                "status": "inactive",
                "status_note": "Closed directly before the reviewed change applied.",
            },
        )
        assert direct_close.status_code == 200, direct_close.text
        assert direct_close.json()["node"]["status"] == "inactive"

        stale_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert stale_apply.status_code == 409, stale_apply.text
        assert (
            stale_apply.json()["detail"]["code"]
            == "community_domain_node_status_stale"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        reviewed_row = (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.id == review["id"])
            .one()
        )
        assert reviewed_row.status == "approved"
        assert reviewed_row.applied_at is None
        node = db.query(CommunityNode).filter(CommunityNode.id == node_id).one()
        assert node.status == "inactive"


def test_reviewed_inactive_node_can_reopen_when_parent_is_active(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "reviewed-reopen-requester@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Reviewed Reopen School",
                "display_name": "Reviewed Reopen School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Aba Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "staff"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "branch-reopen-review",
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        closed = client.patch(
            f"/community-domains/{domain_id}/nodes/{node_id}/status",
            json={
                "status": "inactive",
                "status_note": "Branch paused while leadership was replaced.",
            },
        )
        assert closed.status_code == 200, closed.text
        assert closed.json()["node"]["status"] == "inactive"

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "target_type": "community_node",
                "target_id": str(node_id),
                "payload": {
                    "status": "active",
                    "status_note": "New branch leadership is ready.",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]
        assert review["payload"]["previous_status"] == "inactive"
        assert review["payload"]["new_status"] == "active"

        app.dependency_overrides[get_current_user] = lambda: owner
        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Reopen approved."},
        )
        assert decision.status_code == 200, decision.text
        assert decision.json()["action_review"]["status"] == "approved"

        applied = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert applied.status_code == 200, applied.text
        data = applied.json()
        assert data["action_review"]["status"] == "applied"
        assert data["action_review"]["payload"]["previous_status"] == "inactive"
        assert data["action_review"]["payload"]["new_status"] == "active"
        assert data["applied"]["type"] == "node_status"
        assert data["applied"]["changed"] is True
        assert data["applied"]["node"]["status"] == "active"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        node = db.query(CommunityNode).filter(CommunityNode.id == node_id).one()
        assert node.status == "active"
        review_row = (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.id == review["id"])
            .one()
        )
        assert review_row.status == "applied"
        assert review_row.applied_by_user_id == owner.id


def test_reviewed_archived_node_can_reopen_and_accept_new_structure(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "reviewed-archive-reopen-requester@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Reviewed Archive Market",
                "display_name": "Reviewed Archive Market",
                "domain_type": "market_association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Textile Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert line.status_code == 201, line.text
        node_id = line.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "archive-reopen-review",
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        archived = client.patch(
            f"/community-domains/{domain_id}/nodes/{node_id}/status",
            json={
                "status": "archived",
                "status_note": "Line archived after a long closure.",
            },
        )
        assert archived.status_code == 200, archived.text
        assert archived.json()["node"]["status"] == "archived"

        blocked_child = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Tailors Desk",
                "node_type": "desk",
                "node_kind": "market_department",
                "parent_node_id": node_id,
            },
        )
        assert blocked_child.status_code == 409, blocked_child.text
        assert (
            blocked_child.json()["detail"]["code"]
            == "community_domain_node_inactive"
        )

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "target_type": "community_node",
                "target_id": str(node_id),
                "payload": {
                    "status": "active",
                    "status_note": "Textile line has been formally restored.",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]
        assert review["payload"]["previous_status"] == "archived"
        assert review["payload"]["new_status"] == "active"

        app.dependency_overrides[get_current_user] = lambda: owner
        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Restoration confirmed."},
        )
        assert decision.status_code == 200, decision.text
        assert decision.json()["action_review"]["status"] == "approved"

        applied = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert applied.status_code == 200, applied.text
        data = applied.json()
        assert data["action_review"]["status"] == "applied"
        assert data["action_review"]["payload"]["previous_status"] == "archived"
        assert data["action_review"]["payload"]["new_status"] == "active"
        assert data["applied"]["node"]["status"] == "active"

        child = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Tailors Desk",
                "node_type": "desk",
                "node_kind": "market_department",
                "parent_node_id": node_id,
            },
        )
        assert child.status_code == 201, child.text
        assert child.json()["node"]["parent_node_id"] == node_id
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        node = db.query(CommunityNode).filter(CommunityNode.id == node_id).one()
        assert node.status == "active"
        review_row = (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.id == review["id"])
            .one()
        )
        assert review_row.status == "applied"
        assert review_row.applied_by_user_id == owner.id


def test_status_review_request_rejects_root_invalid_status_and_target_mismatch(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "status-review-invalid-requester@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Status Review Guard Association",
                "display_name": "Status Review Guard Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_data = created_domain.json()["community_domain"]
        domain_id = domain_data["id"]
        root_node_id = domain_data["root_node"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Operations Branch",
                "node_type": "branch",
                "node_kind": "association_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        branch_id = branch.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        closed = client.patch(
            f"/community-domains/{domain_id}/nodes/{branch_id}/status",
            json={
                "status": "inactive",
                "status_note": "Branch paused before invalid review request.",
            },
        )
        assert closed.status_code == 200, closed.text

        app.dependency_overrides[get_current_user] = lambda: requester
        root_review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node.status.update",
                "community_node_id": root_node_id,
                "target_type": "community_node",
                "target_id": str(root_node_id),
                "payload": {
                    "status": "inactive",
                    "status_note": "Trying to close the root node.",
                },
            },
        )
        assert root_review.status_code == 409, root_review.text
        assert (
            root_review.json()["detail"]["code"]
            == "community_domain_root_node_status_immutable"
        )

        invalid_review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node.status.update",
                "community_node_id": branch_id,
                "target_type": "community_node",
                "target_id": str(branch_id),
                "payload": {
                    "status": "sleeping",
                    "status_note": "Invalid status should not be hidden.",
                },
            },
        )
        assert invalid_review.status_code == 422, invalid_review.text
        assert (
            invalid_review.json()["detail"]["code"]
            == "community_domain_node_status_invalid"
        )

        mismatched_review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node.status.update",
                "community_node_id": branch_id,
                "target_type": "community_node",
                "target_id": str(branch_id + 999),
                "payload": {
                    "status": "active",
                    "status_note": "Target id must match the scoped node.",
                },
            },
        )
        assert mismatched_review.status_code == 409, mismatched_review.text
        assert (
            mismatched_review.json()["detail"]["code"]
            == "community_domain_node_status_target_mismatch"
        )

        wrong_type_review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node.status.update",
                "community_node_id": branch_id,
                "target_type": "node_member",
                "target_id": str(branch_id),
                "payload": {
                    "status": "active",
                    "status_note": "Target type must be a community node.",
                },
            },
        )
        assert wrong_type_review.status_code == 409, wrong_type_review.text
        assert (
            wrong_type_review.json()["detail"]["code"]
            == "community_domain_node_status_target_mismatch"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        requester_reviews = (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.requested_by_user_id == requester.id)
            .count()
        )
        assert requester_reviews == 0


def test_needs_changes_reopen_review_can_be_revised_on_inactive_node(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "reopen-revision-requester@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Reopen Revision School",
                "display_name": "Reopen Revision School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Owerri Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "staff"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "branch-reopen-revision",
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        closed = client.patch(
            f"/community-domains/{domain_id}/nodes/{node_id}/status",
            json={
                "status": "inactive",
                "status_note": "Branch paused pending new leadership.",
            },
        )
        assert closed.status_code == 200, closed.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "target_type": "community_node",
                "target_id": str(node_id),
                "payload": {
                    "status": "active",
                    "status_note": "Branch wants to reopen.",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: owner
        needs_changes = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={
                "decision": "needs_changes",
                "decision_note": "Add the leadership readiness note.",
            },
        )
        assert needs_changes.status_code == 200, needs_changes.text
        assert needs_changes.json()["action_review"]["status"] == "needs_changes"

        app.dependency_overrides[get_current_user] = lambda: requester
        bad_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "target_type": "community_node",
                "target_id": str(node_id + 123),
                "request_note": "Wrong target should be rejected.",
                "payload": {
                    "status": "active",
                    "status_note": "Leadership note added.",
                },
            },
        )
        assert bad_revision.status_code == 409, bad_revision.text
        assert (
            bad_revision.json()["detail"]["code"]
            == "community_domain_node_status_target_mismatch"
        )

        revision_response = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "target_type": "community_node",
                "target_id": str(node_id),
                "request_note": "Leadership note added.",
                "payload": {
                    "status": "active",
                    "status_note": "New leadership has signed the reopen plan.",
                },
            },
        )
        assert revision_response.status_code == 201, revision_response.text
        revision = revision_response.json()["action_review"]
        assert revision["parent_review_id"] == review["id"]
        assert revision["status"] == "pending"
        assert revision["payload"]["previous_status"] == "inactive"
        assert revision["payload"]["new_status"] == "active"
        assert (
            revision["payload"]["status_note"]
            == "New leadership has signed the reopen plan."
        )

        app.dependency_overrides[get_current_user] = lambda: owner
        approved = client.post(
            f"/community-domains/{domain_id}/action-reviews/{revision['id']}/decision",
            json={"decision": "approve", "decision_note": "Ready to reopen."},
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["action_review"]["status"] == "approved"

        applied = client.post(
            f"/community-domains/{domain_id}/action-reviews/{revision['id']}/apply"
        )
        assert applied.status_code == 200, applied.text
        assert applied.json()["applied"]["node"]["status"] == "active"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        node = db.query(CommunityNode).filter(CommunityNode.id == node_id).one()
        assert node.status == "active"
        rows = (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.action_key == "node.status.update")
            .filter(CommunityDomainActionReview.requested_by_user_id == requester.id)
            .order_by(CommunityDomainActionReview.id.asc())
            .all()
        )
        assert len(rows) == 2
        assert rows[0].status == "needs_changes"
        assert rows[1].status == "applied"
        assert rows[1].parent_review_id == rows[0].id


def test_apply_rejects_legacy_node_status_review_target_mismatch(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "legacy-target-mismatch-requester@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Legacy Target Guard Market",
                "display_name": "Legacy Target Guard Market",
                "domain_type": "market_association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        first_line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Food Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert first_line.status_code == 201, first_line.text
        node_id = first_line.json()["node"]["id"]

        second_line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Tools Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert second_line.status_code == 201, second_line.text
        other_node_id = second_line.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "legacy-target-status",
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "target_type": "community_node",
                "target_id": str(node_id),
                "payload": {
                    "status": "inactive",
                    "status_note": "Food line is closing for renovation.",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: owner
        approved = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Closure approved."},
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["action_review"]["status"] == "approved"

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.target_id = str(other_node_id)
            db.commit()

        mismatched_target_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert mismatched_target_apply.status_code == 409, mismatched_target_apply.text
        assert (
            mismatched_target_apply.json()["detail"]["code"]
            == "community_domain_node_status_target_mismatch"
        )

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            payload = json.loads(review_row.payload_json or "{}")
            payload["community_node_id"] = other_node_id
            review_row.target_id = str(node_id)
            review_row.payload_json = json.dumps(payload)
            db.commit()

        mismatched_payload_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert mismatched_payload_apply.status_code == 409, (
            mismatched_payload_apply.text
        )
        assert (
            mismatched_payload_apply.json()["detail"]["code"]
            == "community_domain_node_status_target_mismatch"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        node = db.query(CommunityNode).filter(CommunityNode.id == node_id).one()
        other_node = (
            db.query(CommunityNode).filter(CommunityNode.id == other_node_id).one()
        )
        review_row = (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.id == review["id"])
            .one()
        )
        assert node.status == "active"
        assert other_node.status == "active"
        assert review_row.status == "approved"
        assert review_row.applied_at is None


def test_decision_rejects_legacy_node_status_review_target_mismatch(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "legacy-decision-mismatch-requester@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Legacy Decision Guard Union",
                "display_name": "Legacy Decision Guard Union",
                "domain_type": "union",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        chapter = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Main Chapter",
                "node_type": "chapter",
                "node_kind": "union_chapter",
            },
        )
        assert chapter.status_code == 201, chapter.text
        node_id = chapter.json()["node"]["id"]

        other_chapter = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Second Chapter",
                "node_type": "chapter",
                "node_kind": "union_chapter",
            },
        )
        assert other_chapter.status_code == 201, other_chapter.text
        other_node_id = other_chapter.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "legacy-decision-target",
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node.status.update",
                "community_node_id": node_id,
                "target_type": "community_node",
                "target_id": str(node_id),
                "payload": {
                    "status": "inactive",
                    "status_note": "Chapter is pausing operations.",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.target_id = str(other_node_id)
            db.commit()

        app.dependency_overrides[get_current_user] = lambda: owner
        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Trying to approve."},
        )
        assert decision.status_code == 409, decision.text
        assert (
            decision.json()["detail"]["code"]
            == "community_domain_node_status_target_mismatch"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        review_row = (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.id == review["id"])
            .one()
        )
        decision_count = (
            db.query(CommunityDomainActionReviewDecision)
            .filter(CommunityDomainActionReviewDecision.action_review_id == review["id"])
            .count()
        )
        node = db.query(CommunityNode).filter(CommunityNode.id == node_id).one()
        assert review_row.status == "pending"
        assert review_row.decision is None
        assert decision_count == 0
        assert node.status == "active"


def test_reviewed_child_reopen_requires_active_parent(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "blocked-child-reopen-requester@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Blocked Child Reopen Union",
                "display_name": "Blocked Child Reopen Union",
                "domain_type": "union",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        parent = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "State Chapter",
                "node_type": "chapter",
                "node_kind": "union_chapter",
            },
        )
        assert parent.status_code == 201, parent.text
        parent_id = parent.json()["node"]["id"]

        child = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Youth Desk",
                "node_type": "desk",
                "node_kind": "union_department",
                "parent_node_id": parent_id,
            },
        )
        assert child.status_code == 201, child.text
        child_id = child.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "child-reopen-review",
                "action_key": "node.status.update",
                "community_node_id": child_id,
                "scope_type": "node",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        closed_child = client.patch(
            f"/community-domains/{domain_id}/nodes/{child_id}/status",
            json={
                "status": "inactive",
                "status_note": "Youth desk paused.",
            },
        )
        assert closed_child.status_code == 200, closed_child.text

        closed_parent = client.patch(
            f"/community-domains/{domain_id}/nodes/{parent_id}/status",
            json={
                "status": "inactive",
                "status_note": "State chapter paused.",
            },
        )
        assert closed_parent.status_code == 200, closed_parent.text

        app.dependency_overrides[get_current_user] = lambda: requester
        blocked_review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node.status.update",
                "community_node_id": child_id,
                "target_type": "community_node",
                "target_id": str(child_id),
                "payload": {
                    "status": "active",
                    "status_note": "Trying to reopen the child desk first.",
                },
            },
        )
        assert blocked_review.status_code == 409, blocked_review.text
        assert (
            blocked_review.json()["detail"]["code"]
            == "community_domain_node_inactive"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        child_node = db.query(CommunityNode).filter(CommunityNode.id == child_id).one()
        parent_node = db.query(CommunityNode).filter(CommunityNode.id == parent_id).one()
        assert child_node.status == "inactive"
        assert parent_node.status == "inactive"
        assert (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.action_key == "node.status.update")
            .filter(CommunityDomainActionReview.requested_by_user_id == requester.id)
            .count()
            == 0
        )


def test_domain_admin_can_apply_domain_member_upsert_review(
    client: TestClient,
):
    owner = _seed_owner()
    domain_admin = _seed_user(2, "apply-domain-admin@example.com")
    new_member = _seed_user(3, "apply-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Apply Domain Union",
                "display_name": "Apply Domain Union",
                "domain_type": "union",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        promoted = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": domain_admin.id, "role": "domain_admin"},
        )
        assert promoted.status_code == 201, promoted.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "domain-member-upsert",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: domain_admin
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {
                    "user_id": new_member.id,
                    "role": "member",
                    "status": "active",
                    "title": "Registered union member",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        self_queue = client.get(
            f"/community-domains/{domain_id}/action-reviews/reviewer-queue"
        )
        assert self_queue.status_code == 200, self_queue.text
        assert self_queue.json()["total"] == 0

        self_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve"},
        )
        assert self_decision.status_code == 403, self_decision.text
        assert (
            self_decision.json()["detail"]["code"]
            == "community_domain_review_self_decision_forbidden"
        )

        app.dependency_overrides[get_current_user] = lambda: owner
        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve"},
        )
        assert decision.status_code == 200, decision.text

        app.dependency_overrides[get_current_user] = lambda: domain_admin
        self_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert self_apply.status_code == 403, self_apply.text
        assert (
            self_apply.json()["detail"]["code"]
            == "community_domain_review_self_apply_forbidden"
        )

        app.dependency_overrides[get_current_user] = lambda: owner
        applied = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert applied.status_code == 200, applied.text
        data = applied.json()
        assert data["action_review"]["status"] == "applied"
        assert data["action_review"]["applied_by_user_id"] == owner.id
        assert data["action_review"]["applied_at"]
        assert data["applied"]["type"] == "domain_member"
        assert data["applied"]["created"] is True
        assert data["applied"]["membership"]["user_id"] == new_member.id
        assert data["applied"]["membership"]["title"] == "Registered union member"

        app.dependency_overrides[get_current_user] = lambda: domain_admin
        applied_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={"request_note": "Trying to revise after application."},
        )
        assert applied_revision.status_code == 409, applied_revision.text
        assert (
            applied_revision.json()["detail"]["code"]
            == "community_domain_review_not_revisionable"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        membership = (
            db.query(CommunityDomainMembership)
            .filter(CommunityDomainMembership.user_id == new_member.id)
            .one()
        )
        assert membership.role == "member"
        assert membership.status == "active"
        review_row = db.query(CommunityDomainActionReview).one()
        assert review_row.applied_by_user_id == owner.id
        assert review_row.applied_at is not None


def test_domain_member_review_rejects_numeric_target_mismatch(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "member-target-requester@example.com")
    new_member = _seed_user(3, "member-target-new@example.com")
    other_member = _seed_user(4, "member-target-other@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Member Target Guard Union",
                "display_name": "Member Target Guard Union",
                "domain_type": "union",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "member-target-upsert",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        rejected_create = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(other_member.id),
                "payload": {
                    "user_id": new_member.id,
                    "role": "member",
                },
            },
        )
        assert rejected_create.status_code == 409, rejected_create.text
        assert (
            rejected_create.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {
                    "user_id": new_member.id,
                    "role": "member",
                    "title": "Target guarded member",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.target_id = str(other_member.id)
            db.commit()

        app.dependency_overrides[get_current_user] = lambda: owner
        rejected_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Wrong target."},
        )
        assert rejected_decision.status_code == 409, rejected_decision.text
        assert (
            rejected_decision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.target_id = str(new_member.id)
            db.commit()

        approved = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Correct target."},
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["action_review"]["status"] == "approved"

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.target_id = str(other_member.id)
            db.commit()

        rejected_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert rejected_apply.status_code == 409, rejected_apply.text
        assert (
            rejected_apply.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        review_row = (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.id == review["id"])
            .one()
        )
        decision_count = (
            db.query(CommunityDomainActionReviewDecision)
            .filter(CommunityDomainActionReviewDecision.action_review_id == review["id"])
            .count()
        )
        membership = (
            db.query(CommunityDomainMembership)
            .filter(CommunityDomainMembership.user_id == new_member.id)
            .first()
        )
        assert review_row.status == "approved"
        assert review_row.applied_at is None
        assert decision_count == 1
        assert membership is None


def test_domain_member_review_rejects_subject_user_mismatch(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "member-subject-requester@example.com")
    new_member = _seed_user(3, "member-subject-new@example.com")
    other_member = _seed_user(4, "member-subject-other@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Member Subject Guard Association",
                "display_name": "Member Subject Guard Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "member-subject-upsert",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        rejected_create = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "subject_user_id": other_member.id,
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {
                    "user_id": new_member.id,
                    "role": "member",
                },
            },
        )
        assert rejected_create.status_code == 409, rejected_create.text
        assert (
            rejected_create.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "subject_user_id": new_member.id,
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {
                    "user_id": new_member.id,
                    "role": "member",
                    "title": "Subject guarded member",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = other_member.id
            db.commit()

        app.dependency_overrides[get_current_user] = lambda: owner
        rejected_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Wrong subject."},
        )
        assert rejected_decision.status_code == 409, rejected_decision.text
        assert (
            rejected_decision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = new_member.id
            db.commit()

        approved = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Correct subject."},
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["action_review"]["status"] == "approved"

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = other_member.id
            db.commit()

        rejected_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert rejected_apply.status_code == 409, rejected_apply.text
        assert (
            rejected_apply.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        review_row = (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.id == review["id"])
            .one()
        )
        decision_count = (
            db.query(CommunityDomainActionReviewDecision)
            .filter(CommunityDomainActionReviewDecision.action_review_id == review["id"])
            .count()
        )
        membership = (
            db.query(CommunityDomainMembership)
            .filter(CommunityDomainMembership.user_id == new_member.id)
            .first()
        )
        assert review_row.status == "approved"
        assert review_row.applied_at is None
        assert decision_count == 1
        assert membership is None


def test_node_member_review_rejects_subject_user_mismatch_with_label_target(
    client: TestClient,
):
    owner = _seed_owner()
    branch_admin = _seed_user(2, "node-subject-admin@example.com")
    teacher = _seed_user(3, "node-subject-teacher@example.com")
    other_teacher = _seed_user(4, "node-subject-other@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Subject Guard School",
                "display_name": "Node Subject Guard School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Main Campus",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        for user in (branch_admin, teacher, other_teacher):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "staff"},
            )
            assert added.status_code == 201, added.text

        branch_admin_assignment = client.post(
            f"/community-domains/{domain_id}/nodes/{node_id}/members",
            json={"user_id": branch_admin.id, "role": "branch_admin"},
        )
        assert branch_admin_assignment.status_code == 201, branch_admin_assignment.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "node-member-subject-guard",
                "action_key": "node_member.role_change",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: teacher
        rejected_create = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.role_change",
                "community_node_id": node_id,
                "subject_user_id": other_teacher.id,
                "target_type": "node_member",
                "target_id": "maths-chair",
                "payload": {
                    "user_id": teacher.id,
                    "role": "committee_member",
                    "title": "Mathematics chair",
                },
            },
        )
        assert rejected_create.status_code == 409, rejected_create.text
        assert (
            rejected_create.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        rejected_target_create = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.role_change",
                "community_node_id": node_id,
                "subject_user_id": teacher.id,
                "target_type": "node_member",
                "target_id": str(other_teacher.id),
                "payload": {
                    "user_id": teacher.id,
                    "role": "committee_member",
                    "title": "Mathematics chair",
                },
            },
        )
        assert rejected_target_create.status_code == 409, rejected_target_create.text
        assert (
            rejected_target_create.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        rejected_type_create = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.role_change",
                "community_node_id": node_id,
                "subject_user_id": teacher.id,
                "target_type": "domain_member",
                "target_id": "maths-chair",
                "payload": {
                    "user_id": teacher.id,
                    "role": "committee_member",
                    "title": "Mathematics chair",
                },
            },
        )
        assert rejected_type_create.status_code == 409, rejected_type_create.text
        assert (
            rejected_type_create.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.role_change",
                "community_node_id": node_id,
                "subject_user_id": teacher.id,
                "target_type": "node_member",
                "target_id": "maths-chair",
                "payload": {
                    "user_id": teacher.id,
                    "role": "committee_member",
                    "title": "Mathematics chair",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]
        assert review["target_id"] == "maths-chair"

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = other_teacher.id
            db.commit()

        app.dependency_overrides[get_current_user] = lambda: branch_admin
        rejected_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Wrong subject."},
        )
        assert rejected_decision.status_code == 409, rejected_decision.text
        assert (
            rejected_decision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = teacher.id
            review_row.target_id = str(other_teacher.id)
            db.commit()

        rejected_target_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Wrong target."},
        )
        assert rejected_target_decision.status_code == 409, rejected_target_decision.text
        assert (
            rejected_target_decision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = teacher.id
            review_row.target_id = "maths-chair"
            review_row.target_type = "domain_member"
            db.commit()

        rejected_type_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Wrong target type."},
        )
        assert rejected_type_decision.status_code == 409, rejected_type_decision.text
        assert (
            rejected_type_decision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = teacher.id
            review_row.target_id = "maths-chair"
            review_row.target_type = "node_member"
            db.commit()

        approved = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Correct subject."},
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["action_review"]["status"] == "approved"

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = other_teacher.id
            db.commit()

        rejected_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert rejected_apply.status_code == 409, rejected_apply.text
        assert (
            rejected_apply.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = teacher.id
            review_row.target_id = str(other_teacher.id)
            review_row.target_type = "node_member"
            db.commit()

        rejected_target_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert rejected_target_apply.status_code == 409, rejected_target_apply.text
        assert (
            rejected_target_apply.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = teacher.id
            review_row.target_id = "maths-chair"
            review_row.target_type = "domain_member"
            db.commit()

        rejected_type_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert rejected_type_apply.status_code == 409, rejected_type_apply.text
        assert (
            rejected_type_apply.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        review_row = (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.id == review["id"])
            .one()
        )
        decision_count = (
            db.query(CommunityDomainActionReviewDecision)
            .filter(CommunityDomainActionReviewDecision.action_review_id == review["id"])
            .count()
        )
        node_membership = (
            db.query(CommunityNodeMembership)
            .filter(CommunityNodeMembership.community_node_id == node_id)
            .filter(CommunityNodeMembership.user_id == teacher.id)
            .first()
        )
        assert review_row.status == "approved"
        assert review_row.applied_at is None
        assert decision_count == 1
        assert node_membership is None


def test_node_member_upsert_review_rejects_member_target_mismatch(
    client: TestClient,
):
    owner = _seed_owner()
    staff = _seed_user(2, "node-upsert-staff@example.com")
    other_staff = _seed_user(3, "node-upsert-other@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Upsert Guard School",
                "display_name": "Node Upsert Guard School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Placement Campus",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        for user in (staff, other_staff):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "staff"},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "node-upsert-member-guard",
                "action_key": "node_member.upsert",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: staff
        rejected_subject_create = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.upsert",
                "community_node_id": node_id,
                "subject_user_id": other_staff.id,
                "target_type": "node_member",
                "target_id": str(staff.id),
                "payload": {
                    "user_id": staff.id,
                    "role": "teacher",
                    "title": "Primary teacher",
                },
            },
        )
        assert rejected_subject_create.status_code == 409, rejected_subject_create.text
        assert (
            rejected_subject_create.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        rejected_target_create = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.upsert",
                "community_node_id": node_id,
                "subject_user_id": staff.id,
                "target_type": "node_member",
                "target_id": str(other_staff.id),
                "payload": {
                    "user_id": staff.id,
                    "role": "teacher",
                    "title": "Primary teacher",
                },
            },
        )
        assert rejected_target_create.status_code == 409, rejected_target_create.text
        assert (
            rejected_target_create.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        rejected_type_create = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.upsert",
                "community_node_id": node_id,
                "subject_user_id": staff.id,
                "target_type": "domain_member",
                "target_id": str(staff.id),
                "payload": {
                    "user_id": staff.id,
                    "role": "teacher",
                    "title": "Primary teacher",
                },
            },
        )
        assert rejected_type_create.status_code == 409, rejected_type_create.text
        assert (
            rejected_type_create.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.upsert",
                "community_node_id": node_id,
                "subject_user_id": staff.id,
                "target_type": "node_member",
                "target_id": str(staff.id),
                "payload": {
                    "user_id": staff.id,
                    "role": "teacher",
                    "title": "Primary teacher",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = other_staff.id
            db.commit()

        app.dependency_overrides[get_current_user] = lambda: owner
        rejected_subject_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Wrong subject."},
        )
        assert rejected_subject_decision.status_code == 409, rejected_subject_decision.text
        assert (
            rejected_subject_decision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = staff.id
            review_row.target_id = str(other_staff.id)
            db.commit()

        rejected_target_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Wrong target."},
        )
        assert rejected_target_decision.status_code == 409, rejected_target_decision.text
        assert (
            rejected_target_decision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = staff.id
            review_row.target_id = str(staff.id)
            review_row.target_type = "domain_member"
            db.commit()

        rejected_type_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Wrong target type."},
        )
        assert rejected_type_decision.status_code == 409, rejected_type_decision.text
        assert (
            rejected_type_decision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = staff.id
            review_row.target_id = str(staff.id)
            review_row.target_type = "node_member"
            db.commit()

        approved = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Correct target."},
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["action_review"]["status"] == "approved"

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = other_staff.id
            db.commit()

        rejected_subject_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert rejected_subject_apply.status_code == 409, rejected_subject_apply.text
        assert (
            rejected_subject_apply.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = staff.id
            review_row.target_id = str(other_staff.id)
            db.commit()

        rejected_target_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert rejected_target_apply.status_code == 409, rejected_target_apply.text
        assert (
            rejected_target_apply.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        with SessionLocal() as db:
            review_row = (
                db.query(CommunityDomainActionReview)
                .filter(CommunityDomainActionReview.id == review["id"])
                .one()
            )
            review_row.subject_user_id = staff.id
            review_row.target_id = str(staff.id)
            review_row.target_type = "domain_member"
            db.commit()

        rejected_type_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert rejected_type_apply.status_code == 409, rejected_type_apply.text
        assert (
            rejected_type_apply.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        review_row = (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.id == review["id"])
            .one()
        )
        decision_count = (
            db.query(CommunityDomainActionReviewDecision)
            .filter(CommunityDomainActionReviewDecision.action_review_id == review["id"])
            .count()
        )
        node_membership = (
            db.query(CommunityNodeMembership)
            .filter(CommunityNodeMembership.community_node_id == node_id)
            .filter(CommunityNodeMembership.user_id == staff.id)
            .first()
        )
        assert review_row.status == "approved"
        assert review_row.applied_at is None
        assert decision_count == 1
        assert node_membership is None


def test_node_member_upsert_revision_rejects_member_target_mismatch(
    client: TestClient,
):
    owner = _seed_owner()
    staff = _seed_user(2, "node-upsert-revision-staff@example.com")
    other_staff = _seed_user(3, "node-upsert-revision-other@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Upsert Revision Guard School",
                "display_name": "Node Upsert Revision Guard School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Revision Placement Campus",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        for user in (staff, other_staff):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "staff"},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "node-upsert-revision-guard",
                "action_key": "node_member.upsert",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: staff
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.upsert",
                "community_node_id": node_id,
                "subject_user_id": staff.id,
                "target_type": "node_member",
                "target_id": str(staff.id),
                "request_note": "Please place me in this branch.",
                "payload": {
                    "user_id": staff.id,
                    "role": "teacher",
                    "title": "Needs class assignment",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: owner
        needs_changes = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={
                "decision": "needs_changes",
                "decision_note": "Add the exact class before placement.",
            },
        )
        assert needs_changes.status_code == 200, needs_changes.text
        assert needs_changes.json()["action_review"]["status"] == "needs_changes"

        app.dependency_overrides[get_current_user] = lambda: staff
        rejected_subject_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "subject_user_id": other_staff.id,
                "request_note": "Wrong subject in revision.",
                "payload": {
                    "user_id": staff.id,
                    "role": "teacher",
                    "title": "Primary 1 teacher",
                },
            },
        )
        assert rejected_subject_revision.status_code == 409, rejected_subject_revision.text
        assert (
            rejected_subject_revision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        rejected_target_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "target_id": str(other_staff.id),
                "request_note": "Wrong target in revision.",
                "payload": {
                    "user_id": staff.id,
                    "role": "teacher",
                    "title": "Primary 1 teacher",
                },
            },
        )
        assert rejected_target_revision.status_code == 409, rejected_target_revision.text
        assert (
            rejected_target_revision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        rejected_type_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "target_type": "domain_member",
                "request_note": "Wrong target family in revision.",
                "payload": {
                    "user_id": staff.id,
                    "role": "teacher",
                    "title": "Primary 1 teacher",
                },
            },
        )
        assert rejected_type_revision.status_code == 409, rejected_type_revision.text
        assert (
            rejected_type_revision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        revision_response = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "request_note": "Added the exact class.",
                "payload": {
                    "user_id": staff.id,
                    "role": "teacher",
                    "title": "Primary 1 teacher",
                },
            },
        )
        assert revision_response.status_code == 201, revision_response.text
        revision_data = revision_response.json()
        revision = revision_data["action_review"]
        assert revision_data["previous_action_review"]["status"] == "needs_changes"
        assert revision["status"] == "pending"
        assert revision["parent_review_id"] == review["id"]
        assert revision["subject_user_id"] == staff.id
        assert revision["target_type"] == "node_member"
        assert revision["target_id"] == str(staff.id)
        assert revision["payload"]["title"] == "Primary 1 teacher"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        rows = (
            db.query(CommunityDomainActionReview)
            .order_by(CommunityDomainActionReview.id.asc())
            .all()
        )
        node_membership = (
            db.query(CommunityNodeMembership)
            .filter(CommunityNodeMembership.community_node_id == node_id)
            .filter(CommunityNodeMembership.user_id == staff.id)
            .first()
        )
        assert len(rows) == 2
        assert rows[0].status == "needs_changes"
        assert rows[1].status == "pending"
        assert rows[1].parent_review_id == rows[0].id
        assert node_membership is None


def test_policy_min_reviewers_requires_multiple_approvals_before_apply(
    client: TestClient,
):
    owner = _seed_owner()
    first_admin = _seed_user(2, "first-reviewer@example.com")
    second_admin = _seed_user(3, "second-reviewer@example.com")
    requester = _seed_user(4, "two-review-requester@example.com")
    new_member = _seed_user(5, "two-review-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Two Reviewer Association",
                "display_name": "Two Reviewer Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user, role in (
            (first_admin, "domain_admin"),
            (second_admin, "domain_admin"),
            (requester, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "two-reviewer-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
                "config": {"min_reviewers": 2},
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {
                    "user_id": new_member.id,
                    "role": "member",
                    "title": "Two-review approved member",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]
        assert review["required_approvals"] == 2
        assert review["approval_count"] == 0

        app.dependency_overrides[get_current_user] = lambda: first_admin
        first_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "First approval."},
        )
        assert first_decision.status_code == 200, first_decision.text
        first_data = first_decision.json()
        assert first_data["approval_count"] == 1
        assert first_data["required_approvals"] == 2
        assert first_data["action_review"]["status"] == "pending_review"
        assert len(first_data["action_review"]["decisions"]) == 1

        first_queue_after_decision = client.get(
            f"/community-domains/{domain_id}/action-reviews/reviewer-queue"
        )
        assert first_queue_after_decision.status_code == 200, first_queue_after_decision.text
        assert first_queue_after_decision.json()["total"] == 0

        first_queue_with_decided = client.get(
            f"/community-domains/{domain_id}/action-reviews/reviewer-queue",
            params={"include_decided": True},
        )
        assert first_queue_with_decided.status_code == 200, first_queue_with_decided.text
        assert first_queue_with_decided.json()["total"] == 1
        assert first_queue_with_decided.json()["items"][0]["id"] == review["id"]

        app.dependency_overrides[get_current_user] = lambda: second_admin
        second_queue_before_decision = client.get(
            f"/community-domains/{domain_id}/action-reviews/reviewer-queue"
        )
        assert second_queue_before_decision.status_code == 200, second_queue_before_decision.text
        assert second_queue_before_decision.json()["total"] == 1
        assert second_queue_before_decision.json()["items"][0]["id"] == review["id"]

        app.dependency_overrides[get_current_user] = lambda: first_admin
        duplicate_approval = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Trying to count twice."},
        )
        assert duplicate_approval.status_code == 409, duplicate_approval.text
        assert (
            duplicate_approval.json()["detail"]["code"]
            == "community_domain_review_decision_already_recorded"
        )

        changed_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "reject", "decision_note": "Trying to overwrite."},
        )
        assert changed_decision.status_code == 409, changed_decision.text
        assert (
            changed_decision.json()["detail"]["code"]
            == "community_domain_review_decision_already_recorded"
        )

        blocked_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert blocked_apply.status_code == 409, blocked_apply.text
        assert blocked_apply.json()["detail"]["code"] == "community_domain_review_not_approved"

        app.dependency_overrides[get_current_user] = lambda: owner
        demoted_first_admin = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": first_admin.id, "role": "member"},
        )
        assert demoted_first_admin.status_code == 201, demoted_first_admin.text

        app.dependency_overrides[get_current_user] = lambda: first_admin
        decided_detail = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}"
        )
        assert decided_detail.status_code == 200, decided_detail.text
        assert decided_detail.json()["action_review"]["status"] == "pending_review"

        decided_activity = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/activity"
        )
        assert decided_activity.status_code == 200, decided_activity.text
        assert "decision" in {item["type"] for item in decided_activity.json()["items"]}

        decided_lineage = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/lineage"
        )
        assert decided_lineage.status_code == 200, decided_lineage.text
        assert decided_lineage.json()["total"] == 1

        denied_comment = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/comments",
            json={"body": "I can still see this, but I should not add new notes."},
        )
        assert denied_comment.status_code == 403, denied_comment.text
        assert (
            denied_comment.json()["detail"]["code"]
            == "community_domain_review_comment_forbidden"
        )

        denied_evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/evidence",
            json={"title": "Late evidence after role change"},
        )
        assert denied_evidence.status_code == 403, denied_evidence.text
        assert (
            denied_evidence.json()["detail"]["code"]
            == "community_domain_review_evidence_forbidden"
        )

        app.dependency_overrides[get_current_user] = lambda: second_admin
        second_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Second approval."},
        )
        assert second_decision.status_code == 200, second_decision.text
        second_data = second_decision.json()
        assert second_data["approval_count"] == 2
        assert second_data["required_approvals"] == 2
        assert second_data["action_review"]["status"] == "approved"
        assert len(second_data["action_review"]["decisions"]) == 2

        applied = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert applied.status_code == 200, applied.text
        assert applied.json()["action_review"]["status"] == "applied"
        assert applied.json()["applied"]["membership"]["user_id"] == new_member.id
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        assert db.query(CommunityDomainActionReviewDecision).count() == 2
        membership = (
            db.query(CommunityDomainMembership)
            .filter(CommunityDomainMembership.user_id == new_member.id)
            .one()
        )
        assert membership.title == "Two-review approved member"


def test_policy_reviewer_can_recuse_without_approving_review(
    client: TestClient,
):
    owner = _seed_owner()
    first_admin = _seed_user(2, "recuse-first-reviewer@example.com")
    second_admin = _seed_user(3, "recuse-second-reviewer@example.com")
    requester = _seed_user(4, "recuse-requester@example.com")
    new_member = _seed_user(5, "recuse-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Recusal Review Association",
                "display_name": "Recusal Review Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user, role in (
            (first_admin, "domain_admin"),
            (second_admin, "domain_admin"),
            (requester, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "recusal-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
                "config": {"min_reviewers": 2},
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: first_admin
        recused = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "recuse", "decision_note": "Related to requester."},
        )
        assert recused.status_code == 200, recused.text
        recused_data = recused.json()
        assert recused_data["approval_count"] == 0
        assert recused_data["recusal_count"] == 1
        assert recused_data["action_review"]["status"] == "pending_review"
        assert recused_data["action_review"]["recusal_count"] == 1
        assert recused_data["decision_record"]["decision"] == "recuse"

        first_queue = client.get(
            f"/community-domains/{domain_id}/action-reviews/reviewer-queue"
        )
        assert first_queue.status_code == 200, first_queue.text
        assert first_queue.json()["total"] == 0

        late_recusal_change = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Trying to step back in."},
        )
        assert late_recusal_change.status_code == 409, late_recusal_change.text
        assert (
            late_recusal_change.json()["detail"]["code"]
            == "community_domain_review_recusal_final"
        )

        app.dependency_overrides[get_current_user] = lambda: second_admin
        approved = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Looks valid."},
        )
        assert approved.status_code == 200, approved.text
        approved_data = approved.json()
        assert approved_data["approval_count"] == 1
        assert approved_data["recusal_count"] == 1
        assert approved_data["required_approvals"] == 2
        assert approved_data["action_review"]["status"] == "pending_review"

        blocked_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert blocked_apply.status_code == 409, blocked_apply.text
        assert blocked_apply.json()["detail"]["code"] == "community_domain_review_not_approved"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        assert db.query(CommunityDomainActionReviewDecision).count() == 2
        review_row = db.query(CommunityDomainActionReview).one()
        assert review_row.status == "pending_review"
        assert review_row.decision == "approve"
        assert (
            db.query(CommunityDomainMembership)
            .filter(CommunityDomainMembership.user_id == new_member.id)
            .first()
            is None
        )


def test_policy_required_domain_role_blocks_wrong_reviewer_role(
    client: TestClient,
):
    owner = _seed_owner()
    domain_admin = _seed_user(2, "required-domain-admin@example.com")
    ordinary_admin = _seed_user(3, "required-ordinary-admin@example.com")
    requester = _seed_user(4, "required-domain-requester@example.com")
    new_member = _seed_user(5, "required-domain-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Required Domain Role Union",
                "display_name": "Required Domain Role Union",
                "domain_type": "union",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user, role in (
            (domain_admin, "domain_admin"),
            (ordinary_admin, "admin"),
            (requester, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "required-domain-admin-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
                "required_role": "domain_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: ordinary_admin
        wrong_role = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve"},
        )
        assert wrong_role.status_code == 403, wrong_role.text
        assert wrong_role.json()["detail"]["code"] == "community_domain_reviewer_role_required"

        app.dependency_overrides[get_current_user] = lambda: domain_admin
        right_role = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve"},
        )
        assert right_role.status_code == 200, right_role.text
        assert right_role.json()["action_review"]["status"] == "approved"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_policy_required_node_role_blocks_wrong_node_admin_role(
    client: TestClient,
):
    owner = _seed_owner()
    branch_admin = _seed_user(2, "required-branch-admin@example.com")
    node_admin = _seed_user(3, "required-node-admin@example.com")
    teacher = _seed_user(4, "required-node-teacher@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Required Node Role School",
                "display_name": "Required Node Role School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Port Harcourt Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        for user in (branch_admin, node_admin, teacher):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "staff"},
            )
            assert added.status_code == 201, added.text

        for user, role in (
            (branch_admin, "branch_admin"),
            (node_admin, "node_admin"),
            (teacher, "teacher"),
        ):
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "required-branch-admin-role-change",
                "action_key": "node_member.role_change",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "branch_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: teacher
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.role_change",
                "community_node_id": node_id,
                "target_type": "node_member",
                "target_id": str(teacher.id),
                "payload": {"user_id": teacher.id, "role": "committee_member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: node_admin
        wrong_role = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve"},
        )
        assert wrong_role.status_code == 403, wrong_role.text
        assert wrong_role.json()["detail"]["code"] == "community_domain_reviewer_role_required"

        app.dependency_overrides[get_current_user] = lambda: branch_admin
        right_role = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve"},
        )
        assert right_role.status_code == 200, right_role.text
        assert right_role.json()["action_review"]["status"] == "approved"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_reviewer_queue_lists_only_domain_reviews_current_user_can_decide(
    client: TestClient,
):
    owner = _seed_owner()
    domain_admin = _seed_user(2, "queue-domain-admin@example.com")
    ordinary_admin = _seed_user(3, "queue-ordinary-admin@example.com")
    requester = _seed_user(4, "queue-domain-requester@example.com")
    new_member = _seed_user(5, "queue-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Queue Domain Union",
                "display_name": "Queue Domain Union",
                "domain_type": "union",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user, role in (
            (domain_admin, "domain_admin"),
            (ordinary_admin, "admin"),
            (requester, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "queue-domain-admin-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
                "required_role": "domain_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: ordinary_admin
        ordinary_queue = client.get(
            f"/community-domains/{domain_id}/action-reviews/reviewer-queue"
        )
        assert ordinary_queue.status_code == 200, ordinary_queue.text
        assert ordinary_queue.json()["total"] == 0

        app.dependency_overrides[get_current_user] = lambda: domain_admin
        queue = client.get(f"/community-domains/{domain_id}/action-reviews/reviewer-queue")
        assert queue.status_code == 200, queue.text
        queue_data = queue.json()
        assert queue_data["total"] == 1
        assert queue_data["items"][0]["id"] == review["id"]
        assert "does not assign reviewers" in queue_data["boundary"]

        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve"},
        )
        assert decision.status_code == 200, decision.text

        after_decision = client.get(
            f"/community-domains/{domain_id}/action-reviews/reviewer-queue"
        )
        assert after_decision.status_code == 200, after_decision.text
        assert after_decision.json()["total"] == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_reviewer_queue_filters_node_reviews_by_required_node_role(
    client: TestClient,
):
    owner = _seed_owner()
    branch_admin = _seed_user(2, "queue-branch-admin@example.com")
    node_admin = _seed_user(3, "queue-node-admin@example.com")
    teacher = _seed_user(4, "queue-node-teacher@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Queue Node Role School",
                "display_name": "Queue Node Role School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Enugu Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        node_id = branch.json()["node"]["id"]

        for user in (branch_admin, node_admin, teacher):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "staff"},
            )
            assert added.status_code == 201, added.text

        for user, role in (
            (branch_admin, "branch_admin"),
            (node_admin, "node_admin"),
            (teacher, "teacher"),
        ):
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "queue-branch-admin-role-change",
                "action_key": "node_member.role_change",
                "community_node_id": node_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "branch_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: teacher
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "node_member.role_change",
                "community_node_id": node_id,
                "target_type": "node_member",
                "target_id": str(teacher.id),
                "payload": {"user_id": teacher.id, "role": "committee_member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: node_admin
        node_admin_queue = client.get(
            f"/community-domains/{domain_id}/action-reviews/reviewer-queue"
        )
        assert node_admin_queue.status_code == 200, node_admin_queue.text
        assert node_admin_queue.json()["total"] == 0

        app.dependency_overrides[get_current_user] = lambda: branch_admin
        branch_queue = client.get(
            f"/community-domains/{domain_id}/action-reviews/reviewer-queue"
        )
        assert branch_queue.status_code == 200, branch_queue.text
        assert branch_queue.json()["total"] == 1
        assert branch_queue.json()["items"][0]["id"] == review["id"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_can_track_only_their_own_action_review_requests(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "my-review-requester@example.com")
    other_member = _seed_user(3, "my-review-other-member@example.com")
    new_member = _seed_user(4, "my-review-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "My Requests Association",
                "display_name": "My Requests Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user in (requester, other_member):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "my-requests-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        my_requests = client.get(
            f"/community-domains/{domain_id}/action-reviews/my-requests"
        )
        assert my_requests.status_code == 200, my_requests.text
        assert my_requests.json()["total"] == 1
        assert my_requests.json()["items"][0]["id"] == review["id"]
        assert "does not expose" in my_requests.json()["boundary"]

        app.dependency_overrides[get_current_user] = lambda: owner
        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve"},
        )
        assert decision.status_code == 200, decision.text

        app.dependency_overrides[get_current_user] = lambda: requester
        approved_requests = client.get(
            f"/community-domains/{domain_id}/action-reviews/my-requests",
            params={"status": "approved"},
        )
        assert approved_requests.status_code == 200, approved_requests.text
        assert approved_requests.json()["total"] == 1
        assert approved_requests.json()["items"][0]["status"] == "approved"

        app.dependency_overrides[get_current_user] = lambda: other_member
        other_requests = client.get(
            f"/community-domains/{domain_id}/action-reviews/my-requests"
        )
        assert other_requests.status_code == 200, other_requests.text
        assert other_requests.json()["total"] == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_action_review_detail_visibility_is_scoped(
    client: TestClient,
):
    owner = _seed_owner()
    domain_admin = _seed_user(2, "detail-domain-admin@example.com")
    requester = _seed_user(3, "detail-requester@example.com")
    other_member = _seed_user(4, "detail-other-member@example.com")
    outsider = _seed_user(5, "detail-outsider@example.com")
    new_member = _seed_user(6, "detail-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Detail Review Association",
                "display_name": "Detail Review Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user, role in (
            (domain_admin, "domain_admin"),
            (requester, "member"),
            (other_member, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "detail-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
                "required_role": "domain_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        requester_detail = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}"
        )
        assert requester_detail.status_code == 200, requester_detail.text
        assert requester_detail.json()["action_review"]["id"] == review["id"]
        assert "visible only" in requester_detail.json()["boundary"]

        app.dependency_overrides[get_current_user] = lambda: domain_admin
        admin_detail = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}"
        )
        assert admin_detail.status_code == 200, admin_detail.text

        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Looks correct."},
        )
        assert decision.status_code == 200, decision.text

        app.dependency_overrides[get_current_user] = lambda: requester
        requester_after_decision = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}"
        )
        assert requester_after_decision.status_code == 200, requester_after_decision.text
        decided_review = requester_after_decision.json()["action_review"]
        assert decided_review["status"] == "approved"
        assert len(decided_review["decisions"]) == 1

        app.dependency_overrides[get_current_user] = lambda: other_member
        hidden_detail = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}"
        )
        assert hidden_detail.status_code == 403, hidden_detail.text
        assert hidden_detail.json()["detail"]["code"] == "community_domain_action_review_not_visible"

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_detail = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}"
        )
        assert outsider_detail.status_code == 403, outsider_detail.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_action_review_comments_follow_review_visibility(
    client: TestClient,
):
    owner = _seed_owner()
    domain_admin = _seed_user(2, "comment-domain-admin@example.com")
    requester = _seed_user(3, "comment-requester@example.com")
    other_member = _seed_user(4, "comment-other-member@example.com")
    new_member = _seed_user(5, "comment-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Comment Review Association",
                "display_name": "Comment Review Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user, role in (
            (domain_admin, "domain_admin"),
            (requester, "member"),
            (other_member, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "comment-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
                "required_role": "domain_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        requester_comment = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/comments",
            json={"body": "Please review this with the attached office records."},
        )
        assert requester_comment.status_code == 201, requester_comment.text
        requester_comment_data = requester_comment.json()["comment"]
        assert requester_comment_data["author_user_id"] == requester.id
        assert "office records" in requester_comment_data["body"]

        app.dependency_overrides[get_current_user] = lambda: domain_admin
        admin_comment = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/comments",
            json={"body": "Received. I will check the branch list."},
        )
        assert admin_comment.status_code == 201, admin_comment.text
        assert admin_comment.json()["comment"]["author_user_id"] == domain_admin.id

        comments = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/comments"
        )
        assert comments.status_code == 200, comments.text
        comments_data = comments.json()
        assert comments_data["total"] == 2
        assert [item["author_user_id"] for item in comments_data["items"]] == [
            requester.id,
            domain_admin.id,
        ]
        assert "append-only discussion trail" in comments_data["boundary"]

        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Comment trail reviewed."},
        )
        assert decision.status_code == 200, decision.text
        assert decision.json()["action_review"]["status"] == "approved"

        late_comment = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/comments",
            json={"body": "Adding this after approval should not be allowed."},
        )
        assert late_comment.status_code == 409, late_comment.text
        assert (
            late_comment.json()["detail"]["code"]
            == "community_domain_review_append_closed"
        )

        app.dependency_overrides[get_current_user] = lambda: other_member
        hidden_comments = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/comments"
        )
        assert hidden_comments.status_code == 403, hidden_comments.text
        assert (
            hidden_comments.json()["detail"]["code"]
            == "community_domain_review_comments_not_visible"
        )

        denied_comment = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/comments",
            json={"body": "I should not be in this thread."},
        )
        assert denied_comment.status_code == 403, denied_comment.text
        assert (
            denied_comment.json()["detail"]["code"]
            == "community_domain_review_comment_forbidden"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        assert db.query(CommunityDomainActionReviewComment).count() == 2


def test_action_review_evidence_records_metadata_without_file_upload(
    client: TestClient,
):
    owner = _seed_owner()
    domain_admin = _seed_user(2, "evidence-domain-admin@example.com")
    requester = _seed_user(3, "evidence-requester@example.com")
    other_member = _seed_user(4, "evidence-other-member@example.com")
    new_member = _seed_user(5, "evidence-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Evidence Review Association",
                "display_name": "Evidence Review Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user, role in (
            (domain_admin, "domain_admin"),
            (requester, "member"),
            (other_member, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "evidence-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
                "required_role": "domain_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        requester_comment = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/comments",
            json={"body": "I added the branch register extract."},
        )
        assert requester_comment.status_code == 201, requester_comment.text

        requester_evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/evidence",
            json={
                "evidence_type": "document",
                "title": "Branch register extract",
                "description": "Register page showing the proposed member.",
                "file_name": "branch-register.pdf",
                "content_type": "application/pdf",
                "storage_key": "pending/manual/branch-register.pdf",
                "checksum": "abc123",
            },
        )
        assert requester_evidence.status_code == 201, requester_evidence.text
        requester_evidence_data = requester_evidence.json()["evidence"]
        assert requester_evidence_data["submitted_by_user_id"] == requester.id
        assert requester_evidence_data["title"] == "Branch register extract"
        assert (
            requester_evidence_data["storage_key"]
            == "pending/manual/branch-register.pdf"
        )
        assert "does not upload" in requester_evidence.json()["boundary"]

        app.dependency_overrides[get_current_user] = lambda: domain_admin
        admin_evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/evidence",
            json={
                "evidence_type": "reference",
                "title": "Admin desk reference",
                "external_reference": "paper-file:ADM-001",
            },
        )
        assert admin_evidence.status_code == 201, admin_evidence.text
        assert (
            admin_evidence.json()["evidence"]["submitted_by_user_id"]
            == domain_admin.id
        )

        evidence_list = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/evidence"
        )
        assert evidence_list.status_code == 200, evidence_list.text
        evidence_data = evidence_list.json()
        assert evidence_data["total"] == 2
        assert [item["title"] for item in evidence_data["items"]] == [
            "Branch register extract",
            "Admin desk reference",
        ]
        assert "does not upload" in evidence_data["boundary"]

        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Evidence checked."},
        )
        assert decision.status_code == 200, decision.text
        assert decision.json()["action_review"]["status"] == "approved"

        late_evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/evidence",
            json={"title": "Late evidence after approval"},
        )
        assert late_evidence.status_code == 409, late_evidence.text
        assert (
            late_evidence.json()["detail"]["code"]
            == "community_domain_review_append_closed"
        )

        activity = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/activity"
        )
        assert activity.status_code == 200, activity.text
        activity_data = activity.json()
        assert activity_data["total"] == 5
        assert activity_data["items"][0]["type"] == "review_created"
        assert (
            [item["type"] for item in activity_data["items"]].count("evidence")
            == 2
        )
        assert {item["type"] for item in activity_data["items"]} == {
            "review_created",
            "comment",
            "evidence",
            "decision",
        }
        assert "read-only merged view" in activity_data["boundary"]

        domain_feed = client.get(
            f"/community-domains/{domain_id}/action-reviews/activity"
        )
        assert domain_feed.status_code == 200, domain_feed.text
        domain_feed_data = domain_feed.json()
        assert domain_feed_data["community_node_id"] is None
        assert domain_feed_data["total"] == 5
        assert domain_feed_data["items"][0]["type"] == "decision"
        assert domain_feed_data["items"][0]["action_review_id"] == review["id"]
        assert all(
            item["action_review_id"] == review["id"]
            for item in domain_feed_data["items"]
        )
        assert "read-only operational feed" in domain_feed_data["boundary"]

        evidence_feed = client.get(
            f"/community-domains/{domain_id}/action-reviews/activity?event_type=evidence"
        )
        assert evidence_feed.status_code == 200, evidence_feed.text
        evidence_feed_data = evidence_feed.json()
        assert evidence_feed_data["event_type"] == "evidence"
        assert evidence_feed_data["total"] == 2
        assert {item["type"] for item in evidence_feed_data["items"]} == {
            "evidence"
        }

        app.dependency_overrides[get_current_user] = lambda: other_member
        hidden_domain_feed = client.get(
            f"/community-domains/{domain_id}/action-reviews/activity"
        )
        assert hidden_domain_feed.status_code == 403, hidden_domain_feed.text

        hidden_evidence = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/evidence"
        )
        assert hidden_evidence.status_code == 403, hidden_evidence.text
        assert (
            hidden_evidence.json()["detail"]["code"]
            == "community_domain_review_evidence_not_visible"
        )

        denied_evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/evidence",
            json={"title": "Not allowed"},
        )
        assert denied_evidence.status_code == 403, denied_evidence.text
        assert (
            denied_evidence.json()["detail"]["code"]
            == "community_domain_review_evidence_forbidden"
        )

        hidden_activity = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/activity"
        )
        assert hidden_activity.status_code == 403, hidden_activity.text
        assert (
            hidden_activity.json()["detail"]["code"]
            == "community_domain_review_activity_not_visible"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        assert db.query(CommunityDomainActionReviewEvidence).count() == 2


def test_requester_can_cancel_pending_action_review(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "cancel-requester@example.com")
    other_member = _seed_user(3, "cancel-other-member@example.com")
    new_member = _seed_user(4, "cancel-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Cancel Request Association",
                "display_name": "Cancel Request Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user in (requester, other_member):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "cancel-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: other_member
        denied = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/cancel",
            json={"cancel_note": "Not mine."},
        )
        assert denied.status_code == 403, denied.text
        assert denied.json()["detail"]["code"] == "community_domain_review_cancel_forbidden"

        app.dependency_overrides[get_current_user] = lambda: requester
        cancelled = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/cancel",
            json={"cancel_note": "Submitted by mistake."},
        )
        assert cancelled.status_code == 200, cancelled.text
        data = cancelled.json()["action_review"]
        assert data["status"] == "cancelled"
        assert data["decision"] == "cancel"
        assert data["decision_note"] == "Submitted by mistake."
        assert data["decided_by_user_id"] == requester.id

        activity = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/activity"
        )
        assert activity.status_code == 200, activity.text
        status_items = [
            item for item in activity.json()["items"]
            if item["type"] == "review_status_changed"
        ]
        assert len(status_items) == 1
        assert status_items[0]["actor_user_id"] == requester.id
        assert status_items[0]["payload"]["status"] == "cancelled"
        assert status_items[0]["payload"]["decision"] == "cancel"

        second_cancel = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/cancel",
            json={},
        )
        assert second_cancel.status_code == 409, second_cancel.text
        assert second_cancel.json()["detail"]["code"] == "community_domain_review_not_cancellable"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_scoped_admin_can_cancel_pending_review_but_not_approved_review(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "admin-cancel-requester@example.com")
    new_member = _seed_user(3, "admin-cancel-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Admin Cancel Association",
                "display_name": "Admin Cancel Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "admin-cancel-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        pending_review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert pending_review_response.status_code == 201, pending_review_response.text
        pending_review = pending_review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: owner
        admin_cancelled = client.post(
            f"/community-domains/{domain_id}/action-reviews/{pending_review['id']}/cancel",
            json={"cancel_note": "Duplicate request."},
        )
        assert admin_cancelled.status_code == 200, admin_cancelled.text
        assert admin_cancelled.json()["action_review"]["status"] == "cancelled"

        app.dependency_overrides[get_current_user] = lambda: requester
        approved_review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert approved_review_response.status_code == 201, approved_review_response.text
        approved_review = approved_review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: owner
        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{approved_review['id']}/decision",
            json={"decision": "approve"},
        )
        assert decision.status_code == 200, decision.text

        late_cancel = client.post(
            f"/community-domains/{domain_id}/action-reviews/{approved_review['id']}/cancel",
            json={"cancel_note": "Too late."},
        )
        assert late_cancel.status_code == 409, late_cancel.text
        assert late_cancel.json()["detail"]["code"] == "community_domain_review_not_cancellable"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_cancelled_action_review_cannot_receive_late_decision(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "cancel-decision-requester@example.com")
    new_member = _seed_user(3, "cancel-decision-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Cancelled Decision Association",
                "display_name": "Cancelled Decision Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "cancelled-decision-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        cancelled = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/cancel",
            json={"cancel_note": "Submitted twice."},
        )
        assert cancelled.status_code == 200, cancelled.text
        assert cancelled.json()["action_review"]["status"] == "cancelled"

        app.dependency_overrides[get_current_user] = lambda: owner
        late_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve"},
        )
        assert late_decision.status_code == 409, late_decision.text
        assert late_decision.json()["detail"]["code"] == "community_domain_review_not_decidable"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        review_row = db.query(CommunityDomainActionReview).one()
        assert review_row.status == "cancelled"
        assert review_row.decision == "cancel"
        assert db.query(CommunityDomainActionReviewDecision).count() == 0


def test_admin_cancelled_action_review_cannot_apply_but_requester_can_revise(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "admin-cancel-revision-requester@example.com")
    new_member = _seed_user(3, "admin-cancel-revision-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Admin Cancel Revision Association",
                "display_name": "Admin Cancel Revision Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "admin-cancel-revision-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "subject_user_id": new_member.id,
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: owner
        cancelled = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/cancel",
            json={"cancel_note": "Duplicate pending request."},
        )
        assert cancelled.status_code == 200, cancelled.text
        assert cancelled.json()["action_review"]["status"] == "cancelled"

        blocked_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert blocked_apply.status_code == 409, blocked_apply.text
        assert blocked_apply.json()["detail"]["code"] == "community_domain_review_not_approved"

        forbidden_admin_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={"request_note": "Admin cannot revise on the requester's behalf."},
        )
        assert forbidden_admin_revision.status_code == 403, forbidden_admin_revision.text
        assert (
            forbidden_admin_revision.json()["detail"]["code"]
            == "community_domain_review_revision_forbidden"
        )

        app.dependency_overrides[get_current_user] = lambda: requester
        revision_response = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "request_note": "Resubmitted with clearer role context.",
                "payload": {
                    "user_id": new_member.id,
                    "role": "member",
                    "title": "Branch welfare member",
                },
            },
        )
        assert revision_response.status_code == 201, revision_response.text
        revision_data = revision_response.json()
        assert revision_data["previous_action_review"]["status"] == "cancelled"
        revision = revision_data["action_review"]
        assert revision["status"] == "pending"
        assert revision["parent_review_id"] == review["id"]
        assert revision["payload"]["title"] == "Branch welfare member"

        duplicate_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={"request_note": "Do not fork a cancelled request."},
        )
        assert duplicate_revision.status_code == 409, duplicate_revision.text
        duplicate_data = duplicate_revision.json()["detail"]
        assert duplicate_data["code"] == "community_domain_review_revision_exists"
        assert duplicate_data["existing_action_review"]["id"] == revision["id"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        rows = (
            db.query(CommunityDomainActionReview)
            .order_by(CommunityDomainActionReview.id.asc())
            .all()
        )
        assert [row.status for row in rows] == ["cancelled", "pending"]
        assert rows[0].decision == "cancel"
        assert rows[0].decision_note == "Duplicate pending request."
        assert rows[1].parent_review_id == rows[0].id
        assert db.query(CommunityDomainActionReviewDecision).count() == 0
        assert (
            db.query(CommunityDomainMembership)
            .filter(CommunityDomainMembership.user_id == new_member.id)
            .first()
            is None
        )


def test_approved_action_review_cannot_receive_late_decision(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "approved-decision-requester@example.com")
    new_member = _seed_user(3, "approved-decision-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Approved Decision Association",
                "display_name": "Approved Decision Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": requester.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "approved-decision-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: owner
        approved = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Eligible."},
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["action_review"]["status"] == "approved"

        late_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "reject", "decision_note": "Changed mind."},
        )
        assert late_decision.status_code == 409, late_decision.text
        assert late_decision.json()["detail"]["code"] == "community_domain_review_not_decidable"

        app.dependency_overrides[get_current_user] = lambda: requester
        approved_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={"request_note": "Trying to revise after approval."},
        )
        assert approved_revision.status_code == 409, approved_revision.text
        assert (
            approved_revision.json()["detail"]["code"]
            == "community_domain_review_not_revisionable"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        review_row = db.query(CommunityDomainActionReview).one()
        assert review_row.status == "approved"
        assert review_row.decision == "approve"
        assert review_row.decision_note == "Eligible."
        decision_row = db.query(CommunityDomainActionReviewDecision).one()
        assert decision_row.decision == "approve"
        assert decision_row.decision_note == "Eligible."


def test_rejected_action_review_cannot_receive_late_decision_or_apply_but_can_be_revised(
    client: TestClient,
):
    owner = _seed_owner()
    second_admin = _seed_user(2, "rejected-decision-second-admin@example.com")
    requester = _seed_user(3, "rejected-decision-requester@example.com")
    new_member = _seed_user(4, "rejected-decision-new-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Rejected Decision Association",
                "display_name": "Rejected Decision Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user, role in (
            (second_admin, "domain_admin"),
            (requester, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "rejected-decision-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "subject_user_id": new_member.id,
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: owner
        rejected = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "reject", "decision_note": "Not enough context."},
        )
        assert rejected.status_code == 200, rejected.text
        assert rejected.json()["action_review"]["status"] == "rejected"

        app.dependency_overrides[get_current_user] = lambda: second_admin
        late_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve", "decision_note": "Trying after rejection."},
        )
        assert late_decision.status_code == 409, late_decision.text
        assert late_decision.json()["detail"]["code"] == "community_domain_review_not_decidable"

        blocked_apply = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert blocked_apply.status_code == 409, blocked_apply.text
        assert blocked_apply.json()["detail"]["code"] == "community_domain_review_not_approved"

        app.dependency_overrides[get_current_user] = lambda: requester
        revision_response = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "request_note": "Added the missing context.",
                "payload": {
                    "user_id": new_member.id,
                    "role": "member",
                    "title": "Verified welfare member",
                },
            },
        )
        assert revision_response.status_code == 201, revision_response.text
        revision_data = revision_response.json()
        assert revision_data["previous_action_review"]["status"] == "rejected"
        revision = revision_data["action_review"]
        assert revision["status"] == "pending"
        assert revision["parent_review_id"] == review["id"]
        assert revision["payload"]["title"] == "Verified welfare member"

        duplicate_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={"request_note": "Do not fork the rejected request."},
        )
        assert duplicate_revision.status_code == 409, duplicate_revision.text
        duplicate_data = duplicate_revision.json()["detail"]
        assert duplicate_data["code"] == "community_domain_review_revision_exists"
        assert duplicate_data["existing_action_review"]["id"] == revision["id"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        rows = (
            db.query(CommunityDomainActionReview)
            .order_by(CommunityDomainActionReview.id.asc())
            .all()
        )
        assert [row.status for row in rows] == ["rejected", "pending"]
        assert rows[1].parent_review_id == rows[0].id
        decision_row = db.query(CommunityDomainActionReviewDecision).one()
        assert decision_row.decision == "reject"
        assert decision_row.decision_note == "Not enough context."
        assert (
            db.query(CommunityDomainMembership)
            .filter(CommunityDomainMembership.user_id == new_member.id)
            .first()
            is None
        )


def test_requester_can_revise_needs_changes_action_review(
    client: TestClient,
):
    owner = _seed_owner()
    requester = _seed_user(2, "revision-requester@example.com")
    new_member = _seed_user(3, "revision-new-member@example.com")
    other_member = _seed_user(4, "revision-other-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Revision Association",
                "display_name": "Revision Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        for user in (requester, other_member):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "revision-member-add",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: requester
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_member.upsert",
                "target_type": "domain_member",
                "target_id": str(new_member.id),
                "subject_user_id": new_member.id,
                "request_note": "Please add this person.",
                "payload": {"user_id": new_member.id, "role": "member"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        pending_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={"request_note": "Trying too early."},
        )
        assert pending_revision.status_code == 409, pending_revision.text
        assert (
            pending_revision.json()["detail"]["code"]
            == "community_domain_review_not_revisionable"
        )

        app.dependency_overrides[get_current_user] = lambda: owner
        needs_changes = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "needs_changes", "decision_note": "Add the title."},
        )
        assert needs_changes.status_code == 200, needs_changes.text
        assert needs_changes.json()["action_review"]["status"] == "needs_changes"

        app.dependency_overrides[get_current_user] = lambda: requester
        stale_comment = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/comments",
            json={"body": "Trying to add context without creating a revision."},
        )
        assert stale_comment.status_code == 409, stale_comment.text
        assert (
            stale_comment.json()["detail"]["code"]
            == "community_domain_review_append_closed"
        )

        stale_evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/evidence",
            json={"title": "Late evidence without revision"},
        )
        assert stale_evidence.status_code == 409, stale_evidence.text
        assert (
            stale_evidence.json()["detail"]["code"]
            == "community_domain_review_append_closed"
        )

        app.dependency_overrides[get_current_user] = lambda: owner
        forbidden = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={"request_note": "Admin cannot revise for requester."},
        )
        assert forbidden.status_code == 403, forbidden.text
        assert (
            forbidden.json()["detail"]["code"]
            == "community_domain_review_revision_forbidden"
        )

        app.dependency_overrides[get_current_user] = lambda: requester
        rejected_subject_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "subject_user_id": other_member.id,
                "request_note": "Wrong person in the subject.",
                "payload": {
                    "user_id": new_member.id,
                    "role": "member",
                    "title": "Branch welfare member",
                },
            },
        )
        assert rejected_subject_revision.status_code == 409, rejected_subject_revision.text
        assert (
            rejected_subject_revision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        rejected_target_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "target_id": str(other_member.id),
                "request_note": "Wrong person in the target.",
                "payload": {
                    "user_id": new_member.id,
                    "role": "member",
                    "title": "Branch welfare member",
                },
            },
        )
        assert rejected_target_revision.status_code == 409, rejected_target_revision.text
        assert (
            rejected_target_revision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        rejected_type_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "target_type": "node_member",
                "request_note": "Wrong member action family.",
                "payload": {
                    "user_id": new_member.id,
                    "role": "member",
                    "title": "Branch welfare member",
                },
            },
        )
        assert rejected_type_revision.status_code == 409, rejected_type_revision.text
        assert (
            rejected_type_revision.json()["detail"]["code"]
            == "community_domain_member_action_target_mismatch"
        )

        revision_response = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "request_note": "Added the title.",
                "payload": {
                    "user_id": new_member.id,
                    "role": "member",
                    "title": "Branch welfare member",
                },
            },
        )
        assert revision_response.status_code == 201, revision_response.text
        revision_data = revision_response.json()
        assert revision_data["previous_action_review"]["id"] == review["id"]
        assert revision_data["previous_action_review"]["status"] == "needs_changes"
        revision = revision_data["action_review"]
        assert revision["status"] == "pending"
        assert revision["parent_review_id"] == review["id"]
        assert revision["request_note"] == "Added the title."
        assert revision["payload"]["title"] == "Branch welfare member"
        assert "previous review remains unchanged" in revision_data["boundary"]

        duplicate_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={"request_note": "Do not fork this request."},
        )
        assert duplicate_revision.status_code == 409, duplicate_revision.text
        duplicate_data = duplicate_revision.json()["detail"]
        assert duplicate_data["code"] == "community_domain_review_revision_exists"
        assert duplicate_data["existing_action_review"]["id"] == revision["id"]
        assert (
            duplicate_data["existing_action_review"]["parent_review_id"]
            == review["id"]
        )

        lineage = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/lineage"
        )
        assert lineage.status_code == 200, lineage.text
        lineage_data = lineage.json()
        assert lineage_data["root_review_id"] == review["id"]
        assert lineage_data["latest_review_id"] == revision["id"]
        assert lineage_data["total"] == 2
        assert [item["id"] for item in lineage_data["items"]] == [
            review["id"],
            revision["id"],
        ]
        assert "read-only history view" in lineage_data["boundary"]

        app.dependency_overrides[get_current_user] = lambda: owner
        admin_lineage = client.get(
            f"/community-domains/{domain_id}/action-reviews/{revision['id']}/lineage"
        )
        assert admin_lineage.status_code == 200, admin_lineage.text
        assert admin_lineage.json()["requested_review_id"] == revision["id"]
        assert admin_lineage.json()["root_review_id"] == review["id"]

        app.dependency_overrides[get_current_user] = lambda: other_member
        hidden_lineage = client.get(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/lineage"
        )
        assert hidden_lineage.status_code == 403, hidden_lineage.text
        assert (
            hidden_lineage.json()["detail"]["code"]
            == "community_domain_review_lineage_not_visible"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        rows = (
            db.query(CommunityDomainActionReview)
            .order_by(CommunityDomainActionReview.id.asc())
            .all()
        )
        assert len(rows) == 2
        assert rows[0].status == "needs_changes"
        assert rows[1].status == "pending"
        assert rows[1].parent_review_id == rows[0].id


def test_inactive_parent_node_blocks_needs_changes_review_revision(
    client: TestClient,
):
    owner = _seed_owner()
    staff = _seed_user(2, "inactive-revision-staff@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Closed Revision Branch School",
                "display_name": "Closed Revision Branch School",
                "domain_type": "school",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Revision Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        branch_id = branch.json()["node"]["id"]

        department = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "parent_node_id": branch_id,
                "name": "Revision Department",
                "node_type": "department",
                "node_kind": "academic_department",
            },
        )
        assert department.status_code == 201, department.text
        department_id = department.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": staff.id, "role": "staff"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: staff
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "community_node_id": department_id,
                "action_key": "node_member.upsert",
                "target_type": "node_member",
                "target_id": str(staff.id),
                "request_note": "Please place me in this department.",
                "payload": {
                    "user_id": staff.id,
                    "role": "teacher",
                    "title": "Needs department confirmation",
                },
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: owner
        needs_changes = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={
                "decision": "needs_changes",
                "decision_note": "Add your class level before placement.",
            },
        )
        assert needs_changes.status_code == 200, needs_changes.text
        assert needs_changes.json()["action_review"]["status"] == "needs_changes"

        with SessionLocal() as db:
            branch_row = (
                db.query(CommunityNode)
                .filter(CommunityNode.id == branch_id)
                .filter(CommunityNode.community_domain_id == domain_id)
                .one()
            )
            branch_row.status = "inactive"
            db.add(branch_row)
            db.commit()

        app.dependency_overrides[get_current_user] = lambda: staff
        blocked_revision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/revision",
            json={
                "request_note": "Added the class level.",
                "payload": {
                    "user_id": staff.id,
                    "role": "teacher",
                    "title": "Primary 4 teacher",
                },
            },
        )
        assert blocked_revision.status_code == 409, blocked_revision.text
        assert (
            blocked_revision.json()["detail"]["code"]
            == "community_domain_node_inactive"
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        rows = db.query(CommunityDomainActionReview).all()
        assert len(rows) == 1
        assert rows[0].status == "needs_changes"
        assert rows[0].parent_review_id is None


def test_apply_review_keeps_unknown_actions_as_decision_records(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "unknown-apply-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Unknown Apply Association",
                "display_name": "Unknown Apply Association",
                "domain_type": "association",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "billing-change",
                "action_key": "domain.billing.change",
                "review_mode": "domain_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        app.dependency_overrides[get_current_user] = lambda: member
        review_response = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain.billing.change",
                "target_type": "billing_setting",
                "target_id": "plan",
                "payload": {"plan": "institutional_plus"},
            },
        )
        assert review_response.status_code == 201, review_response.text
        review = review_response.json()["action_review"]

        app.dependency_overrides[get_current_user] = lambda: owner
        decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/decision",
            json={"decision": "approve"},
        )
        assert decision.status_code == 200, decision.text

        applied = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review['id']}/apply"
        )
        assert applied.status_code == 409, applied.text
        assert applied.json()["detail"]["code"] == "community_domain_action_not_applicable"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
