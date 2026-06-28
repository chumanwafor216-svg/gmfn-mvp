from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.db.database import SessionLocal
from app.db.models import (
    Clan,
    ClanMembership,
    CommunityDomain,
    CommunityDomainAffiliation,
    CommunityDomainActionReview,
    CommunityDomainActionReviewComment,
    CommunityDomainActionReviewDecision,
    CommunityDomainActionReviewEvidence,
    CommunityDomainMembership,
    CommunityNode,
    CommunityNodeMembership,
    CommunityDomainPolicy,
    User,
    TrustSlip,
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


def test_template_operating_blueprint_is_public_planning_not_creation(
    client: TestClient,
):
    response = client.get(
        "/community-domains/templates/market_cooperative/operating-blueprint"
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["ok"] is True
    blueprint = payload["operating_blueprint"]
    assert blueprint["editable"] is False
    assert blueprint["template"]["template_key"] == "market_cooperative"
    assert blueprint["template"]["marketplace_role"] == "core"
    assert blueprint["blueprint_source"] == "market_cooperative"
    assert blueprint["uses_generic_fallback"] is False
    assert blueprint["governance_shape"] == {
        "supports_nested_nodes": True,
        "supports_inherited_policy": True,
        "supports_local_policy_override": True,
        "supports_role_scoped_review": True,
        "supports_multi_reviewer_review": True,
    }
    assert "does not create a Community Domain" in blueprint["boundary"]
    assert "create nodes" in blueprint["boundary"]
    assert "create policy" in blueprint["boundary"]
    assert "activate billing" in blueprint["boundary"]
    assert "verify authority" in blueprint["boundary"]
    assert "create marketplace activity" in blueprint["boundary"]
    assert "move money" in blueprint["boundary"]
    assert "separate schemas" in blueprint["boundary"]

    node_presets = {item["node_kind"]: item for item in blueprint["node_presets"]}
    assert "market_line" in node_presets
    assert "market_section" in node_presets
    assert "market_committee" in node_presets
    assert node_presets["market_line"]["node_type"] == "line"
    assert node_presets["market_line"]["example"] == "Electronics Line"

    role_presets = {item["role_key"]: item for item in blueprint["role_presets"]}
    assert role_presets["line_admin"]["scope"] == "node"
    assert role_presets["trader"]["label"] == "Trader"

    policy_actions = {item["action_key"] for item in blueprint["policy_presets"]}
    assert {"node_member.upsert", "evidence.verify", "domain.settings_change"}.issubset(
        policy_actions
    )
    assert "member shops" in blueprint["activity_lanes"]
    assert "market demand" in blueprint["activity_lanes"]

    with SessionLocal() as db:
        assert db.query(CommunityDomain).count() == 0
        assert db.query(CommunityNode).count() == 0
        assert db.query(CommunityDomainMembership).count() == 0
        assert db.query(CommunityDomainPolicy).count() == 0
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(Clan).count() == 0


def test_template_operating_blueprint_distinguishes_school_and_rejects_unknown(
    client: TestClient,
):
    school = client.get(
        "/community-domains/templates/school_multi_branch/operating-blueprint"
    )
    assert school.status_code == 200, school.text

    by_domain_type = client.get(
        "/community-domains/templates/school/operating-blueprint"
    )
    assert by_domain_type.status_code == 200, by_domain_type.text

    unknown = client.get(
        "/community-domains/templates/does-not-exist/operating-blueprint"
    )
    assert unknown.status_code == 404, unknown.text
    assert "template not found" in unknown.text

    blueprint = school.json()["operating_blueprint"]
    node_presets = {item["node_kind"]: item for item in blueprint["node_presets"]}
    role_presets = {item["role_key"]: item for item in blueprint["role_presets"]}
    policy_modes = {item["review_mode"] for item in blueprint["policy_presets"]}
    assert blueprint["template"]["template_key"] == "school_multi_branch"
    assert blueprint["blueprint_source"] == "school_multi_branch"
    assert blueprint["uses_generic_fallback"] is False
    assert by_domain_type.json()["operating_blueprint"]["template"]["template_key"] == (
        "school_multi_branch"
    )
    assert "school_branch" in node_presets
    assert "school_class" in node_presets
    assert "school_association" in node_presets
    assert node_presets["school_association"]["example"] == (
        "Parent Teacher Association"
    )
    assert role_presets["teacher"]["scope"] == "node"
    assert role_presets["pta_officer"]["label"] == "PTA officer"
    assert {"domain_admin_review", "node_admin_review", "required_role_review"}.issubset(
        policy_modes
    )
    assert "PTA activity" in blueprint["activity_lanes"]
    assert "approved vendors" in blueprint["activity_lanes"]

    with SessionLocal() as db:
        assert db.query(CommunityDomain).count() == 0
        assert db.query(CommunityNode).count() == 0
        assert db.query(CommunityDomainMembership).count() == 0


def test_all_public_templates_have_specific_operating_blueprints(
    client: TestClient,
):
    templates = client.get("/community-domains/templates")
    assert templates.status_code == 200, templates.text

    expected_node_kinds = {
        "school_multi_branch": {"school_branch", "school_class"},
        "church_religious_body": {"church_branch", "church_ministry"},
        "union_professional_body": {"union_chapter", "union_committee"},
        "market_cooperative": {"market_line", "market_committee"},
        "family_town_union_diaspora": {"town_union_branch", "age_grade"},
        "hospital_health_body": {"health_facility", "clinical_unit"},
        "ngo_project_network": {"ngo_field_office", "ngo_program"},
        "generic_association": {"association_branch", "association_committee"},
    }

    for item in templates.json()["items"]:
        template_key = item["template_key"]
        response = client.get(
            f"/community-domains/templates/{template_key}/operating-blueprint"
        )
        assert response.status_code == 200, response.text
        blueprint = response.json()["operating_blueprint"]
        assert blueprint["template"]["template_key"] == template_key
        assert blueprint["blueprint_source"] == template_key
        assert blueprint["uses_generic_fallback"] is False
        node_kinds = {preset["node_kind"] for preset in blueprint["node_presets"]}
        assert expected_node_kinds[template_key].issubset(node_kinds)
        assert blueprint["role_presets"]
        assert blueprint["policy_presets"]
        assert blueprint["activity_lanes"]
        assert "separate schemas" in blueprint["boundary"]

    with SessionLocal() as db:
        assert db.query(CommunityDomain).count() == 0
        assert db.query(CommunityNode).count() == 0
        assert db.query(CommunityDomainMembership).count() == 0
        assert db.query(CommunityDomainPolicy).count() == 0
        assert db.query(CommunityDomainActionReview).count() == 0
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


def test_operating_map_aggregates_domain_package_without_side_effects(
    client: TestClient,
):
    owner = _seed_owner()
    admin = _seed_user(2, "operating-map-admin@example.com")
    trader = _seed_user(3, "operating-map-trader@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Operating Map Market Domain",
                "display_name": "Operating Map Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
                "public_profile": "A market domain coordinating trusted lines.",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Building Materials Line",
                "parent_node_id": root_node_id,
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
                "title": "Building materials trader",
            },
        )
        assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "operating-map-member-review",
                "action_key": "domain_member.upsert",
                "scope_type": "domain",
                "review_mode": "domain_admin_review",
                "required_role": "domain_admin",
                "policy_summary": "Domain admins review member changes.",
            },
        )
        assert policy.status_code == 201, policy.text

        response = client.get(f"/community-domains/{domain_id}/operating-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    operating_map = payload["operating_map"]
    assert operating_map["editable"] is False
    assert operating_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert operating_map["template"]["template_key"] == "market_cooperative"
    assert operating_map["template"]["marketplace_role"] == "core"
    assert operating_map["status"]["domain_status"] == "draft"
    assert operating_map["status"]["verification_status"] == "unverified"
    assert operating_map["status"]["activation_status"] == "not_active"
    assert operating_map["status"]["billing_status"] == "quote_required"
    assert operating_map["status"]["public_url_status"] == "open_product_decision"
    assert operating_map["status"]["public_url"] is None
    assert operating_map["counts"]["nodes"] == 2
    assert operating_map["counts"]["active_members"] == 3
    assert operating_map["counts"]["active_node_memberships"] == 1
    assert operating_map["counts"]["active_policies"] == 1
    assert operating_map["counts"]["open_reviews"] == 0
    assert operating_map["counts"]["shops"] == 0
    assert operating_map["counts"]["listings"] == 0
    assert operating_map["counts"]["demands"] == 0
    assert operating_map["counts"]["spotlights"] == 0
    assert operating_map["counts"]["finance_records"] == 0
    assert operating_map["primary_next_action"] == {
        "action_key": "review_activation_requirements",
        "label": "Review Community Domain activation requirements",
        "route_hint": f"/community-domains/{domain_id}/activation-requirements",
        "requires_admin": False,
    }
    assert "does not create a payment instruction" in operating_map["boundary"]
    assert "activate billing" in operating_map["boundary"]
    assert "verify authority" in operating_map["boundary"]
    assert "/domains/:name" in operating_map["boundary"]
    assert "/community-domains/:name" in operating_map["boundary"]
    assert "create marketplace activity" in operating_map["boundary"]
    assert "create a social Community" in operating_map["boundary"]
    assert "move money" in operating_map["boundary"]
    assert "private member evidence" in operating_map["boundary"]

    lanes = {item["lane_key"]: item for item in operating_map["lanes"]}
    assert lanes["identity"]["route_hint"] == f"/community-domains/{domain_id}"
    assert lanes["structure"]["route_hint"].endswith("/nodes/tree")
    assert lanes["members"]["route_hint"].endswith("/members")
    assert lanes["roles"]["route_hint"].endswith("/roles")
    assert lanes["governance"]["route_hint"].endswith("/governance-model")
    assert lanes["readiness"]["route_hint"].endswith("/readiness")
    assert lanes["verification"]["route_hint"].endswith("/verification-requirements")
    assert lanes["activation"]["route_hint"].endswith("/activation-requirements")
    assert lanes["service_settings"]["route_hint"].endswith("/service-settings")
    assert lanes["economic_participation"]["route_hint"].endswith(
        "/economic-participation"
    )
    assert lanes["network_presence"]["route_hint"].endswith("/network-presence")
    assert lanes["structure"]["ready"] is True
    assert lanes["members"]["ready"] is True
    assert lanes["roles"]["ready"] is True
    assert lanes["governance"]["ready"] is True
    assert lanes["readiness"]["ready"] is False
    assert lanes["verification"]["ready"] is False
    assert lanes["activation"]["ready"] is False
    assert lanes["economic_participation"]["status"] == "core_template"
    assert lanes["network_presence"]["status"] == "profile_ready"
    assert "does not create records" in lanes["identity"]["boundary"]

    with SessionLocal() as db:
        domain_row = db.query(CommunityDomain).one()
        assert domain_row.status == "draft"
        assert domain_row.verification_status == "unverified"
        assert domain_row.clan_id is None
        assert db.query(CommunityDomainMembership).count() == 3
        assert db.query(CommunityNodeMembership).count() == 1
        assert db.query(CommunityDomainPolicy).count() == 1
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(Clan).count() == 0


def test_member_can_read_operating_map_but_admin_routes_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "operating-map-member@example.com")
    outsider = _seed_user(3, "operating-map-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Operating Map School Domain",
                "display_name": "Operating Map School Domain",
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
        member_map = client.get(f"/community-domains/{domain_id}/operating-map")
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(f"/community-domains/{domain_id}/operating-map")
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    operating_map = member_map.json()["operating_map"]
    lanes = {item["lane_key"]: item for item in operating_map["lanes"]}
    assert operating_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert operating_map["primary_next_action"] == {
        "action_key": "view_structure",
        "label": "View Community Domain structure",
        "route_hint": f"/community-domains/{domain_id}/nodes/tree",
        "requires_admin": False,
    }
    assert lanes["identity"]["route_hint"] == f"/community-domains/{domain_id}"
    assert lanes["structure"]["route_hint"].endswith("/nodes/tree")
    assert lanes["members"]["route_hint"] is None
    assert lanes["verification"]["route_hint"] is None
    assert lanes["activation"]["route_hint"].endswith("/activation-requirements")
    assert lanes["economic_participation"]["route_hint"].endswith(
        "/economic-participation"
    )
    assert lanes["network_presence"]["route_hint"].endswith("/network-presence")
    assert lanes["members"]["requires_admin"] is True
    assert lanes["verification"]["requires_admin"] is True
    assert operating_map["editable"] is False
    assert "private member evidence" in operating_map["boundary"]


def test_template_fit_compares_actual_domain_to_blueprint_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    admin = _seed_user(2, "template-fit-admin@example.com")
    trader = _seed_user(3, "template-fit-trader@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Template Fit Market Domain",
                "display_name": "Template Fit Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
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
                "name": "Welfare Committee",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "market_committee",
            },
        )
        assert committee.status_code == 201, committee.text

        for user, role in ((admin, "domain_admin"), (trader, "member")):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        placed = client.post(
            f"/community-domains/{domain_id}/nodes/{line_id}/members",
            json={"user_id": trader.id, "role": "trader"},
        )
        assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "template-fit-node-member-review",
                "action_key": "node_member.upsert",
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "policy_summary": "Line leaders review trader placement.",
            },
        )
        assert policy.status_code == 201, policy.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "clans": db.query(Clan).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/template-fit")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    template_fit = payload["template_fit"]
    assert template_fit["editable"] is False
    assert template_fit["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert template_fit["template"]["template_key"] == "market_cooperative"
    assert template_fit["blueprint_source"] == "market_cooperative"
    assert template_fit["uses_generic_fallback"] is False
    assert template_fit["counts"]["nodes"] == 3
    assert template_fit["counts"]["matched_node_presets"] == 2
    assert template_fit["counts"]["missing_node_presets"] == 2
    assert template_fit["counts"]["active_members"] == 3
    assert template_fit["counts"]["active_node_memberships"] == 1
    assert template_fit["counts"]["matched_role_presets"] == 1
    assert template_fit["counts"]["missing_role_presets"] == 3
    assert template_fit["counts"]["active_policies"] == 1
    assert template_fit["counts"]["matched_policy_presets"] == 1
    assert template_fit["counts"]["missing_policy_presets"] == 2
    assert template_fit["missing_sections"] == {
        "nodes": ["market_section", "market_activity_group"],
        "roles": ["line_admin", "section_leader", "verifier"],
        "policies": ["evidence.verify", "domain.settings_change"],
    }
    assert template_fit["primary_next_action"] == {
        "action_key": "review_structure_fit",
        "label": "Review Community Domain structure fit",
        "route_hint": f"/community-domains/{domain_id}/nodes/tree",
        "requires_admin": False,
    }
    assert "does not create nodes" in template_fit["boundary"]
    assert "assign roles" in template_fit["boundary"]
    assert "create policy" in template_fit["boundary"]
    assert "create marketplace activity" in template_fit["boundary"]
    assert "create a social Community" in template_fit["boundary"]
    assert "move money" in template_fit["boundary"]
    assert "private evidence" in template_fit["boundary"]

    node_fit = {item["node_kind"]: item for item in template_fit["node_fit"]}
    assert node_fit["market_line"]["present"] is True
    assert node_fit["market_line"]["observed_count"] == 1
    assert node_fit["market_line"]["route_hint"].endswith("/nodes/tree")
    assert node_fit["market_committee"]["present"] is True
    assert node_fit["market_section"]["present"] is False
    assert node_fit["market_activity_group"]["present"] is False
    assert "does not create a node" in node_fit["market_section"]["boundary"]

    role_fit = {item["role_key"]: item for item in template_fit["role_fit"]}
    assert role_fit["trader"]["present"] is True
    assert role_fit["trader"]["active_assignments"] == 1
    assert role_fit["line_admin"]["present"] is False
    assert role_fit["line_admin"]["route_hint"].endswith("/roles")
    assert "does not create roles" in role_fit["line_admin"]["boundary"]

    policy_fit = {
        (item["action_key"], item["review_mode"]): item
        for item in template_fit["policy_fit"]
    }
    node_member_policy = policy_fit[("node_member.upsert", "node_admin_review")]
    evidence_policy = policy_fit[("evidence.verify", "required_role_review")]
    assert node_member_policy["present"] is True
    assert node_member_policy["active_policies"] == 1
    assert node_member_policy["route_hint"].endswith("/policies")
    assert evidence_policy["present"] is False
    assert evidence_policy["admin_action_required"] is True
    assert "does not create policy" in evidence_policy["boundary"]

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "clans": db.query(Clan).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_template_fit_but_admin_next_action_is_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "template-fit-member@example.com")
    outsider = _seed_user(3, "template-fit-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Template Fit School Domain",
                "display_name": "Template Fit School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_fit = client.get(f"/community-domains/{domain_id}/template-fit")
        assert member_fit.status_code == 200, member_fit.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_fit = client.get(f"/community-domains/{domain_id}/template-fit")
        assert outsider_fit.status_code == 403, outsider_fit.text
        assert "active Community Domain members" in outsider_fit.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    template_fit = member_fit.json()["template_fit"]
    assert template_fit["viewer"] == {"user_id": member.id, "can_admin": False}
    assert template_fit["template"]["template_key"] == "school_multi_branch"
    assert template_fit["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_template_fit",
        "label": "Ask a Community Domain admin to review template fit",
        "route_hint": None,
        "requires_admin": True,
    }
    assert template_fit["missing_total"] > 0
    assert template_fit["community_domain"]["public_profile"] is None
    assert "private evidence" in template_fit["boundary"]
    assert all(item["route_hint"].endswith("/nodes/tree") for item in template_fit["node_fit"])
    assert all(item["route_hint"].endswith("/roles") for item in template_fit["role_fit"])
    assert all(item["route_hint"].endswith("/policies") for item in template_fit["policy_fit"])


def test_setup_plan_orders_template_fit_gaps_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    trader = _seed_user(2, "setup-plan-trader@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Setup Plan Market Domain",
                "display_name": "Setup Plan Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Food Line",
                "parent_node_id": root_node_id,
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert line.status_code == 201, line.text
        line_id = line.json()["node"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": trader.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        placed = client.post(
            f"/community-domains/{domain_id}/nodes/{line_id}/members",
            json={"user_id": trader.id, "role": "trader"},
        )
        assert placed.status_code == 201, placed.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "clans": db.query(Clan).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/setup-plan")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    setup_plan = payload["setup_plan"]
    assert setup_plan["editable"] is False
    assert setup_plan["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert setup_plan["template"]["template_key"] == "market_cooperative"
    assert setup_plan["setup_phase"] == "structure"
    assert setup_plan["completed_steps"] == 1
    assert setup_plan["open_steps"] == [
        "structure",
        "roles",
        "governance",
        "verification",
        "activation",
    ]
    assert setup_plan["primary_next_action"] == {
        "action_key": "review_structure_fit",
        "label": "Review Community Domain structure fit",
        "route_hint": f"/community-domains/{domain_id}/nodes/tree",
        "requires_admin": True,
    }
    assert "does not create nodes" in setup_plan["boundary"]
    assert "assign roles" in setup_plan["boundary"]
    assert "create policy" in setup_plan["boundary"]
    assert "activate billing" in setup_plan["boundary"]
    assert "create marketplace activity" in setup_plan["boundary"]
    assert "create a social Community" in setup_plan["boundary"]
    assert "move money" in setup_plan["boundary"]
    assert "private evidence" in setup_plan["boundary"]

    steps = {item["step_key"]: item for item in setup_plan["steps"]}
    assert steps["identity"]["completed"] is True
    assert steps["identity"]["admin_action_route_hint"] == f"/community-domains/{domain_id}"
    assert steps["structure"]["completed"] is False
    assert steps["structure"]["missing_items"] == [
        "market_section",
        "market_committee",
        "market_activity_group",
    ]
    assert steps["structure"]["detail"] == {"matched": 1, "missing": 3}
    assert steps["structure"]["route_hint"].endswith("/nodes/tree")
    assert steps["roles"]["missing_items"] == [
        "line_admin",
        "section_leader",
        "verifier",
    ]
    assert steps["roles"]["detail"] == {"matched": 1, "missing": 3}
    assert steps["governance"]["missing_items"] == [
        "node_member.upsert",
        "evidence.verify",
        "domain.settings_change",
    ]
    assert steps["verification"]["missing_items"] == ["authority_evidence"]
    assert steps["activation"]["missing_items"] == ["activation"]
    assert "does not create nodes" in steps["structure"]["boundary"]

    summary = setup_plan["template_fit_summary"]
    assert summary["matched_total"] == 2
    assert summary["missing_total"] == 9
    assert summary["missing_sections"]["nodes"] == [
        "market_section",
        "market_committee",
        "market_activity_group",
    ]

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "clans": db.query(Clan).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_setup_plan_but_admin_actions_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "setup-plan-member@example.com")
    outsider = _seed_user(3, "setup-plan-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Setup Plan School Domain",
                "display_name": "Setup Plan School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_plan = client.get(f"/community-domains/{domain_id}/setup-plan")
        assert member_plan.status_code == 200, member_plan.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_plan = client.get(f"/community-domains/{domain_id}/setup-plan")
        assert outsider_plan.status_code == 403, outsider_plan.text
        assert "active Community Domain members" in outsider_plan.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    setup_plan = member_plan.json()["setup_plan"]
    assert setup_plan["viewer"] == {"user_id": member.id, "can_admin": False}
    assert setup_plan["template"]["template_key"] == "school_multi_branch"
    assert setup_plan["setup_phase"] == "structure"
    assert setup_plan["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_continue_setup",
        "label": "Ask a Community Domain admin to continue setup",
        "route_hint": None,
        "requires_admin": True,
    }
    assert setup_plan["editable"] is False
    assert "private evidence" in setup_plan["boundary"]

    steps = {item["step_key"]: item for item in setup_plan["steps"]}
    assert steps["identity"]["route_hint"] == f"/community-domains/{domain_id}"
    assert steps["identity"]["admin_action_route_hint"] is None
    assert steps["structure"]["route_hint"].endswith("/nodes/tree")
    assert steps["structure"]["admin_action_route_hint"] is None
    assert steps["roles"]["admin_action_route_hint"] is None
    assert steps["governance"]["admin_action_route_hint"] is None
    assert steps["verification"]["admin_action_route_hint"] is None
    assert steps["activation"]["admin_action_route_hint"] is None
    assert all(item["requires_admin"] is True for item in setup_plan["steps"])


def test_capacity_plan_projects_package_usage_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    admin = _seed_user(2, "capacity-plan-admin@example.com")
    trader = _seed_user(3, "capacity-plan-trader@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Capacity Plan Market Domain",
                "display_name": "Capacity Plan Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        first_line_id = None
        for index in range(1, 40):
            line = client.post(
                f"/community-domains/{domain_id}/nodes",
                json={
                    "name": f"Capacity Line {index}",
                    "parent_node_id": root_node_id,
                    "node_type": "line",
                    "node_kind": "market_line",
                },
            )
            assert line.status_code == 201, line.text
            if first_line_id is None:
                first_line_id = line.json()["node"]["id"]

        for user, role in ((admin, "domain_admin"), (trader, "member")):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        placed_admin = client.post(
            f"/community-domains/{domain_id}/nodes/{first_line_id}/members",
            json={"user_id": admin.id, "role": "line_admin"},
        )
        assert placed_admin.status_code == 201, placed_admin.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "clans": db.query(Clan).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/capacity-plan")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    capacity_plan = payload["capacity_plan"]
    assert capacity_plan["editable"] is False
    assert capacity_plan["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert capacity_plan["template"]["template_key"] == "market_cooperative"
    assert capacity_plan["package_code"] == "community_domain_starter"
    assert capacity_plan["limits_source"] == "pilot_package_quote_defaults"
    assert capacity_plan["counts"] == {
        "nodes": 40,
        "active_members": 3,
        "active_node_memberships": 1,
        "domain_admins": 2,
        "node_admin_assignments": 1,
        "admin_assignments": 3,
    }
    assert capacity_plan["near_limit_lanes"] == ["nodes"]
    assert capacity_plan["over_limit_lanes"] == []
    assert capacity_plan["unmetered_lanes"] == ["shops", "storage"]
    assert capacity_plan["primary_next_action"] == {
        "action_key": "review_growth_capacity",
        "label": "Review Community Domain growth capacity",
        "route_hint": f"/community-domains/{domain_id}/setup-plan",
        "requires_admin": False,
    }
    assert "does not increase limits" in capacity_plan["boundary"]
    assert "meter live shop usage" in capacity_plan["boundary"]
    assert "meter storage usage" in capacity_plan["boundary"]
    assert "change pricing" in capacity_plan["boundary"]
    assert "private evidence" in capacity_plan["boundary"]

    lanes = {item["lane_key"]: item for item in capacity_plan["lanes"]}
    assert lanes["nodes"]["metered"] is True
    assert lanes["nodes"]["used"] == 40
    assert lanes["nodes"]["limit"] == 50
    assert lanes["nodes"]["remaining"] == 10
    assert lanes["nodes"]["usage_percent"] == 80
    assert lanes["nodes"]["status"] == "near_limit"
    assert lanes["nodes"]["route_hint"].endswith("/nodes/tree")
    assert lanes["members"]["status"] == "within_limit"
    assert lanes["members"]["route_hint"].endswith("/members")
    assert lanes["admins"]["used"] == 3
    assert lanes["admins"]["limit"] == 10
    assert lanes["admins"]["status"] == "within_limit"
    assert lanes["shops"]["metered"] is False
    assert lanes["shops"]["used"] is None
    assert lanes["shops"]["limit"] == 100
    assert lanes["shops"]["status"] == "not_metered_in_this_slice"
    assert "shops belong to global member identity" in lanes["shops"]["summary"]
    assert "does not create shops" in lanes["shops"]["boundary"]
    assert lanes["storage"]["metered"] is False
    assert lanes["storage"]["limit"] == 5
    assert lanes["storage"]["status"] == "not_metered_in_this_slice"
    assert "does not upload files" in lanes["storage"]["boundary"]

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "clans": db.query(Clan).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_capacity_plan_but_admin_routes_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "capacity-plan-member@example.com")
    outsider = _seed_user(3, "capacity-plan-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Capacity Plan School Domain",
                "display_name": "Capacity Plan School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_plan = client.get(f"/community-domains/{domain_id}/capacity-plan")
        assert member_plan.status_code == 200, member_plan.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_plan = client.get(f"/community-domains/{domain_id}/capacity-plan")
        assert outsider_plan.status_code == 403, outsider_plan.text
        assert "active Community Domain members" in outsider_plan.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    capacity_plan = member_plan.json()["capacity_plan"]
    assert capacity_plan["viewer"] == {"user_id": member.id, "can_admin": False}
    assert capacity_plan["template"]["template_key"] == "school_multi_branch"
    assert capacity_plan["near_limit_lanes"] == []
    assert capacity_plan["over_limit_lanes"] == []
    assert capacity_plan["primary_next_action"] == {
        "action_key": "review_setup_plan",
        "label": "Review Community Domain setup plan",
        "route_hint": f"/community-domains/{domain_id}/setup-plan",
        "requires_admin": False,
    }

    lanes = {item["lane_key"]: item for item in capacity_plan["lanes"]}
    assert lanes["nodes"]["route_hint"].endswith("/nodes/tree")
    assert lanes["members"]["route_hint"] is None
    assert lanes["members"]["requires_admin"] is True
    assert lanes["members"]["admin_visible"] is False
    assert lanes["admins"]["route_hint"].endswith("/roles")
    assert lanes["shops"]["route_hint"].endswith("/economic-participation")
    assert lanes["storage"]["route_hint"].endswith("/verification-requirements")
    assert "private evidence" in capacity_plan["boundary"]


def test_rollout_plan_projects_first_units_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    admin = _seed_user(2, "rollout-plan-admin@example.com")
    trader = _seed_user(3, "rollout-plan-trader@example.com")
    member = _seed_user(4, "rollout-plan-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Rollout Plan Market Domain",
                "display_name": "Rollout Plan Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        electronics = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "parent_node_id": root_node_id,
                "node_type": "line",
                "node_kind": "market_line",
                "sort_order": 1,
            },
        )
        assert electronics.status_code == 201, electronics.text
        electronics_id = electronics.json()["node"]["id"]

        medical = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Medical Line",
                "parent_node_id": root_node_id,
                "node_type": "line",
                "node_kind": "market_line",
                "sort_order": 2,
            },
        )
        assert medical.status_code == 201, medical.text
        medical_id = medical.json()["node"]["id"]

        for user, role in (
            (admin, "domain_admin"),
            (trader, "member"),
            (member, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        placements = [
            (electronics_id, admin.id, "line_admin"),
            (electronics_id, trader.id, "trader"),
            (medical_id, member.id, "trader"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "rollout-node-member-review",
                "action_key": "node_member.upsert",
                "scope_type": "node",
                "review_mode": "node_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "clans": db.query(Clan).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/rollout-plan")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    rollout_plan = payload["rollout_plan"]
    assert rollout_plan["editable"] is False
    assert rollout_plan["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert rollout_plan["template"]["template_key"] == "market_cooperative"
    assert rollout_plan["rollout_phase"] == "local_admins"
    assert rollout_plan["counts"] == {
        "first_level_units": 2,
        "ready_units": 1,
        "active_members": 4,
        "active_node_memberships": 3,
        "active_policies": 1,
    }
    assert rollout_plan["primary_next_action"] == {
        "action_key": "assign_local_admins",
        "label": "Assign local rollout admins",
        "route_hint": f"/community-domains/{domain_id}/roles",
        "requires_admin": True,
    }
    assert "does not create nodes" in rollout_plan["boundary"]
    assert "invite members" in rollout_plan["boundary"]
    assert "assign admins" in rollout_plan["boundary"]
    assert "create marketplace activity" in rollout_plan["boundary"]
    assert "create a social Community" in rollout_plan["boundary"]
    assert "private evidence" in rollout_plan["boundary"]

    phases = {item["phase_key"]: item for item in rollout_plan["phases"]}
    assert phases["structure"]["completed"] is True
    assert phases["structure"]["detail"] == {"first_level_units": 2}
    assert phases["local_admins"]["completed"] is False
    assert phases["local_admins"]["detail"] == {
        "units_with_admin": 1,
        "units_total": 2,
    }
    assert phases["pilot_members"]["completed"] is True
    assert phases["pilot_members"]["detail"] == {
        "ready_units": 1,
        "active_members": 4,
    }
    assert phases["governance"]["completed"] is True
    assert phases["capacity"]["completed"] is True
    assert phases["capacity"]["detail"] == {
        "near_limit_lanes": [],
        "over_limit_lanes": [],
    }
    assert "does not create nodes" in phases["structure"]["boundary"]

    units = {item["node"]["name"]: item for item in rollout_plan["rollout_units"]}
    assert units["Electronics Line"]["status"] == "ready_for_pilot"
    assert units["Electronics Line"]["ready_for_pilot"] is True
    assert units["Electronics Line"]["member_count"] == 2
    assert units["Electronics Line"]["admin_count"] == 1
    assert units["Electronics Line"]["route_hint"].endswith(
        f"/nodes/{electronics_id}/operating-summary"
    )
    assert units["Medical Line"]["status"] == "needs_local_admin"
    assert units["Medical Line"]["ready_for_pilot"] is False
    assert units["Medical Line"]["member_count"] == 1
    assert units["Medical Line"]["admin_count"] == 0
    assert units["Medical Line"]["admin_action_route_hint"].endswith("/roles")
    assert "does not invite members" in units["Medical Line"]["boundary"]

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "clans": db.query(Clan).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_rollout_plan_but_admin_actions_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "rollout-plan-member-reader@example.com")
    outsider = _seed_user(3, "rollout-plan-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Rollout Plan School Domain",
                "display_name": "Rollout Plan School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_plan = client.get(f"/community-domains/{domain_id}/rollout-plan")
        assert member_plan.status_code == 200, member_plan.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_plan = client.get(f"/community-domains/{domain_id}/rollout-plan")
        assert outsider_plan.status_code == 403, outsider_plan.text
        assert "active Community Domain members" in outsider_plan.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    rollout_plan = member_plan.json()["rollout_plan"]
    assert rollout_plan["viewer"] == {"user_id": member.id, "can_admin": False}
    assert rollout_plan["template"]["template_key"] == "school_multi_branch"
    assert rollout_plan["rollout_phase"] == "structure"
    assert rollout_plan["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_continue_rollout",
        "label": "Ask a Community Domain admin to continue rollout",
        "route_hint": None,
        "requires_admin": True,
    }
    assert rollout_plan["rollout_units"] == []
    assert rollout_plan["counts"]["first_level_units"] == 0
    assert rollout_plan["editable"] is False
    assert "private evidence" in rollout_plan["boundary"]

    phases = {item["phase_key"]: item for item in rollout_plan["phases"]}
    assert phases["structure"]["route_hint"].endswith("/nodes/tree")
    assert phases["structure"]["admin_action_route_hint"] is None
    assert phases["local_admins"]["admin_action_route_hint"] is None
    assert phases["pilot_members"]["admin_action_route_hint"] is None
    assert phases["governance"]["admin_action_route_hint"] is None
    assert phases["capacity"]["route_hint"].endswith("/capacity-plan")
    assert phases["capacity"]["admin_action_route_hint"].endswith("/capacity-plan")


def test_rollout_tree_projects_recursive_units_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    admin = _seed_user(2, "rollout-tree-admin@example.com")
    trader = _seed_user(3, "rollout-tree-trader@example.com")
    section_member = _seed_user(4, "rollout-tree-section@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Rollout Tree Market Domain",
                "display_name": "Rollout Tree Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
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

        section = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Phone Accessories Section",
                "parent_node_id": line_id,
                "node_type": "section",
                "node_kind": "market_section",
            },
        )
        assert section.status_code == 201, section.text
        section_id = section.json()["node"]["id"]

        committee = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Welfare Committee",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "market_committee",
            },
        )
        assert committee.status_code == 201, committee.text
        committee_id = committee.json()["node"]["id"]

        for user, role in (
            (admin, "domain_admin"),
            (trader, "member"),
            (section_member, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        placements = [
            (line_id, admin.id, "line_admin"),
            (line_id, trader.id, "trader"),
            (section_id, section_member.id, "trader"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "clans": db.query(Clan).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/rollout-tree")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    rollout_tree = payload["rollout_tree"]
    assert rollout_tree["editable"] is False
    assert rollout_tree["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert rollout_tree["template"]["template_key"] == "market_cooperative"
    assert rollout_tree["counts"] == {
        "nodes": 4,
        "non_root_nodes": 3,
        "ready_for_pilot": 1,
        "needs_local_admin": 2,
        "needs_pilot_members": 0,
        "inactive": 0,
        "active_node_memberships": 3,
        "active_policies": 0,
    }
    assert rollout_tree["status_counts"] == {
        "ready_for_pilot": 1,
        "needs_local_admin": 2,
    }
    assert rollout_tree["primary_next_action"] == {
        "action_key": "assign_local_admins",
        "label": "Assign local rollout admins",
        "route_hint": f"/community-domains/{domain_id}/roles",
        "requires_admin": True,
    }
    assert "does not create nodes" in rollout_tree["boundary"]
    assert "invite members" in rollout_tree["boundary"]
    assert "assign admins" in rollout_tree["boundary"]
    assert "private evidence" in rollout_tree["boundary"]

    flat = {item["node"]["name"]: item for item in rollout_tree["flat_nodes"]}
    assert flat["Rollout Tree Market Domain"]["rollout_status"] == "root"
    assert flat["Electronics Line"]["rollout_status"] == "ready_for_pilot"
    assert flat["Electronics Line"]["direct_child_count"] == 1
    assert flat["Electronics Line"]["subtree_node_count"] == 2
    assert flat["Electronics Line"]["direct_member_count"] == 2
    assert flat["Electronics Line"]["direct_admin_count"] == 1
    assert flat["Electronics Line"]["subtree_member_count"] == 3
    assert flat["Phone Accessories Section"]["rollout_status"] == "needs_local_admin"
    assert flat["Phone Accessories Section"]["direct_member_count"] == 1
    assert flat["Phone Accessories Section"]["direct_admin_count"] == 0
    assert flat["Welfare Committee"]["rollout_status"] == "needs_local_admin"
    assert flat["Welfare Committee"]["direct_member_count"] == 0
    assert flat["Welfare Committee"]["direct_admin_count"] == 0
    assert flat["Welfare Committee"]["admin_action_route_hint"].endswith("/roles")

    tree = rollout_tree["tree"][0]
    assert tree["node"]["parent_node_id"] is None
    child_names = {child["node"]["name"] for child in tree["children"]}
    assert child_names == {"Electronics Line", "Welfare Committee"}
    electronics_tree = next(
        child for child in tree["children"] if child["node"]["name"] == "Electronics Line"
    )
    assert electronics_tree["children"][0]["node"]["name"] == "Phone Accessories Section"
    assert "does not create nodes" in flat["Welfare Committee"]["boundary"]

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "clans": db.query(Clan).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_rollout_tree_but_admin_actions_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "rollout-tree-member@example.com")
    outsider = _seed_user(3, "rollout-tree-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Rollout Tree School Domain",
                "display_name": "Rollout Tree School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_tree = client.get(f"/community-domains/{domain_id}/rollout-tree")
        assert member_tree.status_code == 200, member_tree.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_tree = client.get(f"/community-domains/{domain_id}/rollout-tree")
        assert outsider_tree.status_code == 403, outsider_tree.text
        assert "active Community Domain members" in outsider_tree.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    rollout_tree = member_tree.json()["rollout_tree"]
    assert rollout_tree["viewer"] == {"user_id": member.id, "can_admin": False}
    assert rollout_tree["template"]["template_key"] == "school_multi_branch"
    assert rollout_tree["counts"]["non_root_nodes"] == 0
    assert rollout_tree["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_continue_rollout",
        "label": "Ask a Community Domain admin to continue rollout",
        "route_hint": None,
        "requires_admin": True,
    }
    assert rollout_tree["tree"][0]["admin_action_route_hint"] is None
    assert rollout_tree["flat_nodes"][0]["admin_action_route_hint"] is None
    assert "private evidence" in rollout_tree["boundary"]


def test_node_autonomy_map_projects_local_unit_autonomy_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    line_admin = _seed_user(2, "node-autonomy-line-admin@example.com")
    section_admin = _seed_user(3, "node-autonomy-section-admin@example.com")
    branch_admin = _seed_user(4, "node-autonomy-branch-admin@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Autonomy Market Domain",
                "display_name": "Node Autonomy Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
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

        section = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Phone Accessories Section",
                "parent_node_id": line_id,
                "node_type": "section",
                "node_kind": "market_section",
            },
        )
        assert section.status_code == 201, section.text
        section_id = section.json()["node"]["id"]

        committee = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Welfare Committee",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "market_committee",
            },
        )
        assert committee.status_code == 201, committee.text

        independent = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Independent Branch",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "market_branch",
                "inherits_parent_policy": False,
            },
        )
        assert independent.status_code == 201, independent.text
        independent_id = independent.json()["node"]["id"]

        for user in (line_admin, section_admin, branch_admin):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        for node_id, user_id, role in (
            (line_id, line_admin.id, "line_admin"),
            (section_id, section_admin.id, "line_admin"),
            (independent_id, branch_admin.id, "branch_admin"),
        ):
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        domain_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "node-autonomy-domain-review",
                "action_key": "domain_member.upsert",
                "scope_type": "domain",
                "review_mode": "domain_admin_review",
            },
        )
        assert domain_policy.status_code == 201, domain_policy.text

        line_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "node-autonomy-line-review",
                "action_key": "node_member.upsert",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
            },
        )
        assert line_policy.status_code == 201, line_policy.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/node-autonomy-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    autonomy = payload["node_autonomy_map"]
    assert autonomy["editable"] is False
    assert autonomy["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert autonomy["counts"] == {
        "nodes": 5,
        "non_root_nodes": 4,
        "domain_admin_count": 1,
        "active_node_memberships": 3,
        "active_policies": 2,
        "locally_governed": 1,
        "locally_administered": 1,
        "parent_controlled": 1,
        "needs_local_governance": 1,
        "inactive": 0,
    }
    assert autonomy["primary_next_action"] == {
        "action_key": "add_local_governance_to_autonomous_units",
        "label": "Add local governance where units do not inherit policy",
        "route_hint": f"/community-domains/{domain_id}/governance-coverage",
        "requires_admin": True,
    }
    assert "read-only local autonomy projection" in autonomy["boundary"]
    assert "does not grant local authority" in autonomy["boundary"]
    assert "change inheritance" in autonomy["boundary"]
    assert "create separate Community Domains" in autonomy["boundary"]

    flat = {item["node"]["name"]: item for item in autonomy["flat_nodes"]}
    assert flat["Node Autonomy Market Domain"]["autonomy_status"] == "domain_root"
    assert flat["Electronics Line"]["autonomy_status"] == "locally_governed"
    assert flat["Electronics Line"]["locally_operable"] is True
    assert flat["Electronics Line"]["local_admin_count"] == 1
    assert flat["Electronics Line"]["local_policy_count"] == 1
    assert flat["Electronics Line"]["inherited_policy_count"] == 1
    assert flat["Phone Accessories Section"]["autonomy_status"] == (
        "locally_administered"
    )
    assert flat["Phone Accessories Section"]["local_admin_count"] == 1
    assert flat["Phone Accessories Section"]["local_policy_count"] == 0
    assert flat["Phone Accessories Section"]["inherited_policy_count"] == 2
    assert flat["Welfare Committee"]["autonomy_status"] == "parent_controlled"
    assert flat["Welfare Committee"]["local_admin_count"] == 0
    assert flat["Welfare Committee"]["inherited_policy_count"] == 1
    assert flat["Independent Branch"]["autonomy_status"] == "needs_local_governance"
    assert flat["Independent Branch"]["inherits_parent_policy"] is False
    assert flat["Independent Branch"]["inherited_policy_count"] == 0
    assert flat["Independent Branch"]["admin_action_route_hint"].endswith(
        "/governance-coverage"
    )

    root_tree = autonomy["tree"][0]
    electronics_tree = next(
        child
        for child in root_tree["children"]
        if child["node"]["name"] == "Electronics Line"
    )
    assert electronics_tree["children"][0]["node"]["name"] == (
        "Phone Accessories Section"
    )

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_autonomy_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-autonomy-visible-member@example.com")
    outsider = _seed_user(3, "node-autonomy-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Autonomy School Domain",
                "display_name": "Node Autonomy School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        created_branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Branch",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert created_branch.status_code == 201, created_branch.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(f"/community-domains/{domain_id}/node-autonomy-map")
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(
            f"/community-domains/{domain_id}/node-autonomy-map"
        )
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    autonomy = member_map.json()["node_autonomy_map"]
    assert autonomy["viewer"] == {"user_id": member.id, "can_admin": False}
    assert autonomy["counts"]["nodes"] == 2
    assert autonomy["counts"]["non_root_nodes"] == 1
    assert autonomy["counts"]["domain_admin_count"] is None
    assert autonomy["counts"]["active_node_memberships"] is None
    assert autonomy["counts"]["active_policies"] is None
    assert autonomy["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_node_autonomy",
        "label": "Ask a Community Domain admin to review local autonomy",
        "route_hint": None,
        "requires_admin": True,
    }

    flat = {item["node"]["name"]: item for item in autonomy["flat_nodes"]}
    assert flat["Primary Branch"]["autonomy_status"] == "needs_local_governance"
    assert flat["Primary Branch"]["direct_member_count"] is None
    assert flat["Primary Branch"]["local_admin_count"] is None
    assert flat["Primary Branch"]["local_policy_count"] is None
    assert flat["Primary Branch"]["inherited_policy_count"] is None
    assert flat["Primary Branch"]["route_hint"].endswith("/operating-summary")
    assert flat["Primary Branch"]["admin_action_route_hint"] is None
    assert "does not grant local authority" in autonomy["boundary"]


def test_node_economic_map_projects_local_unit_economy_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    line_admin = _seed_user(2, "node-economic-line-admin@example.com")
    trader = _seed_user(3, "node-economic-trader@example.com")
    section_admin = _seed_user(4, "node-economic-section-admin@example.com")
    branch_admin = _seed_user(5, "node-economic-branch-admin@example.com")
    branch_member = _seed_user(6, "node-economic-branch-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Economic Market Domain",
                "display_name": "Node Economic Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
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

        section = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Phone Accessories Section",
                "parent_node_id": line_id,
                "node_type": "section",
                "node_kind": "market_section",
            },
        )
        assert section.status_code == 201, section.text
        section_id = section.json()["node"]["id"]

        committee = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Welfare Committee",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "market_committee",
            },
        )
        assert committee.status_code == 201, committee.text

        independent = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Independent Branch",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "market_branch",
                "inherits_parent_policy": False,
            },
        )
        assert independent.status_code == 201, independent.text
        independent_id = independent.json()["node"]["id"]

        for user in (line_admin, trader, section_admin, branch_admin, branch_member):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (line_id, line_admin.id, "line_admin"),
            (line_id, trader.id, "trader"),
            (section_id, section_admin.id, "line_admin"),
            (independent_id, branch_admin.id, "branch_admin"),
            (independent_id, branch_member.id, "trader"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        line_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "node-economic-line-review",
                "action_key": "node_member.upsert",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
            },
        )
        assert line_policy.status_code == 201, line_policy.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/node-economic-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    economic_map = payload["node_economic_map"]
    assert economic_map["editable"] is False
    assert economic_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert economic_map["template"]["marketplace_role"] == "core"
    assert economic_map["counts"] == {
        "nodes": 5,
        "non_root_nodes": 4,
        "active_node_memberships": 5,
        "active_policies": 1,
        "local_economy_ready": 1,
        "needs_local_admin": 1,
        "needs_participants": 1,
        "governance_needed": 1,
        "marketplace_optional": 0,
        "inactive": 0,
        "shops": 0,
        "listings": 0,
        "demands": 0,
        "spotlights": 0,
        "finance_records": 0,
    }
    assert economic_map["primary_next_action"] == {
        "action_key": "assign_local_admins_for_economic_units",
        "label": "Assign local admins before local economic activity",
        "route_hint": f"/community-domains/{domain_id}/roles",
        "requires_admin": True,
    }
    assert "read-only local economy planning" in economic_map["boundary"]
    assert "does not create a marketplace" in economic_map["boundary"]
    assert "payment instruction" in economic_map["boundary"]
    assert "finance record" in economic_map["boundary"]
    assert "private member activity" in economic_map["boundary"]

    flat = {item["node"]["name"]: item for item in economic_map["flat_nodes"]}
    assert flat["Node Economic Market Domain"]["economy_status"] == "domain_root"
    assert flat["Electronics Line"]["economy_status"] == "local_economy_ready"
    assert flat["Electronics Line"]["ready_for_local_economy"] is True
    assert flat["Electronics Line"]["local_admin_count"] == 1
    assert flat["Electronics Line"]["local_participant_count"] == 1
    assert flat["Electronics Line"]["effective_policy_count"] == 1
    assert flat["Phone Accessories Section"]["economy_status"] == "needs_participants"
    assert flat["Phone Accessories Section"]["local_admin_count"] == 1
    assert flat["Phone Accessories Section"]["local_participant_count"] == 0
    assert flat["Phone Accessories Section"]["effective_policy_count"] == 1
    assert flat["Welfare Committee"]["economy_status"] == "needs_local_admin"
    assert flat["Welfare Committee"]["local_admin_count"] == 0
    assert flat["Welfare Committee"]["effective_policy_count"] == 0
    assert flat["Independent Branch"]["economy_status"] == "governance_needed"
    assert flat["Independent Branch"]["local_participant_count"] == 1
    assert flat["Independent Branch"]["effective_policy_count"] == 0
    assert flat["Independent Branch"]["shops"] == 0
    assert flat["Independent Branch"]["finance_records"] == 0
    assert flat["Independent Branch"]["admin_action_route_hint"].endswith(
        "/governance-coverage"
    )

    root_tree = economic_map["tree"][0]
    electronics_tree = next(
        child
        for child in root_tree["children"]
        if child["node"]["name"] == "Electronics Line"
    )
    assert electronics_tree["children"][0]["node"]["name"] == (
        "Phone Accessories Section"
    )

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_economic_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-economic-visible-member@example.com")
    outsider = _seed_user(3, "node-economic-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Economic School Domain",
                "display_name": "Node Economic School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        created_branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Branch",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert created_branch.status_code == 201, created_branch.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(f"/community-domains/{domain_id}/node-economic-map")
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(
            f"/community-domains/{domain_id}/node-economic-map"
        )
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    economic_map = member_map.json()["node_economic_map"]
    assert economic_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert economic_map["template"]["marketplace_role"] == "optional"
    assert economic_map["counts"]["nodes"] == 2
    assert economic_map["counts"]["non_root_nodes"] == 1
    assert economic_map["counts"]["active_node_memberships"] is None
    assert economic_map["counts"]["active_policies"] is None
    assert economic_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_node_economy",
        "label": "Ask a Community Domain admin to review local economy readiness",
        "route_hint": None,
        "requires_admin": True,
    }

    flat = {item["node"]["name"]: item for item in economic_map["flat_nodes"]}
    assert flat["Primary Branch"]["economy_status"] == "marketplace_optional"
    assert flat["Primary Branch"]["local_member_count"] is None
    assert flat["Primary Branch"]["local_admin_count"] is None
    assert flat["Primary Branch"]["local_policy_count"] is None
    assert flat["Primary Branch"]["effective_policy_count"] is None
    assert flat["Primary Branch"]["shops"] == 0
    assert flat["Primary Branch"]["finance_records"] == 0
    assert flat["Primary Branch"]["route_hint"].endswith("/operating-summary")
    assert flat["Primary Branch"]["admin_action_route_hint"] is None
    assert "does not create a marketplace" in economic_map["boundary"]
    assert "private member activity" in economic_map["boundary"]


def test_node_activity_map_projects_local_unit_activity_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    line_admin = _seed_user(2, "node-activity-line-admin@example.com")
    participant = _seed_user(3, "node-activity-participant@example.com")
    section_admin = _seed_user(4, "node-activity-section-admin@example.com")
    branch_admin = _seed_user(5, "node-activity-branch-admin@example.com")
    branch_member = _seed_user(6, "node-activity-branch-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Activity School Domain",
                "display_name": "Node Activity School Domain",
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
                "name": "Main Campus",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text
        branch_id = branch.json()["node"]["id"]

        class_node = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Six Class",
                "parent_node_id": branch_id,
                "node_type": "class",
                "node_kind": "school_class",
            },
        )
        assert class_node.status_code == 201, class_node.text
        class_id = class_node.json()["node"]["id"]

        pta = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "PTA Committee",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "school_association",
            },
        )
        assert pta.status_code == 201, pta.text

        independent = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Independent Annex",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "school_branch",
                "inherits_parent_policy": False,
            },
        )
        assert independent.status_code == 201, independent.text
        independent_id = independent.json()["node"]["id"]

        for user in (line_admin, participant, section_admin, branch_admin, branch_member):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (branch_id, line_admin.id, "branch_admin"),
            (branch_id, participant.id, "member"),
            (class_id, section_admin.id, "node_admin"),
            (independent_id, branch_admin.id, "branch_admin"),
            (independent_id, branch_member.id, "member"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        branch_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "node-activity-branch-review",
                "action_key": "activity.review",
                "community_node_id": branch_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
            },
        )
        assert branch_policy.status_code == 201, branch_policy.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/node-activity-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    activity_map = payload["node_activity_map"]
    assert activity_map["editable"] is False
    assert activity_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert activity_map["template"]["template_key"] == "school_multi_branch"
    assert activity_map["template"]["activity_lanes"]
    assert activity_map["counts"] == {
        "nodes": 5,
        "non_root_nodes": 4,
        "active_node_memberships": 5,
        "active_policies": 1,
        "review_records": 0,
        "local_activity_ready": 1,
        "needs_local_admin": 1,
        "needs_participants": 1,
        "governance_needed": 1,
        "inactive": 0,
        "scheduled_activities": 0,
        "paid_activities": 0,
        "attendance_records": 0,
    }
    assert activity_map["primary_next_action"] == {
        "action_key": "assign_local_admins_for_activity_units",
        "label": "Assign local admins before local activity tracking",
        "route_hint": f"/community-domains/{domain_id}/roles",
        "requires_admin": True,
    }
    assert "read-only local activity planning" in activity_map["boundary"]
    assert "travel activities" in activity_map["boundary"]
    assert "paid activities" in activity_map["boundary"]
    assert "payment instructions" in activity_map["boundary"]
    assert "attendance" in activity_map["boundary"]
    assert "private member activity" in activity_map["boundary"]

    flat = {item["node"]["name"]: item for item in activity_map["flat_nodes"]}
    assert flat["Node Activity School Domain"]["activity_status"] == "domain_root"
    assert flat["Main Campus"]["activity_status"] == "local_activity_ready"
    assert flat["Main Campus"]["ready_for_local_activity"] is True
    assert flat["Main Campus"]["local_admin_count"] == 1
    assert flat["Main Campus"]["local_participant_count"] == 1
    assert flat["Main Campus"]["effective_policy_count"] == 1
    assert flat["Primary Six Class"]["activity_status"] == "needs_participants"
    assert flat["Primary Six Class"]["local_admin_count"] == 1
    assert flat["Primary Six Class"]["local_participant_count"] == 0
    assert flat["Primary Six Class"]["effective_policy_count"] == 1
    assert flat["PTA Committee"]["activity_status"] == "needs_local_admin"
    assert flat["PTA Committee"]["local_admin_count"] == 0
    assert flat["PTA Committee"]["effective_policy_count"] == 0
    assert flat["Independent Annex"]["activity_status"] == "governance_needed"
    assert flat["Independent Annex"]["local_participant_count"] == 1
    assert flat["Independent Annex"]["effective_policy_count"] == 0
    assert flat["Independent Annex"]["paid_activity_status"] == (
        "not_connected_in_this_slice"
    )
    assert flat["Independent Annex"]["attendance_status"] == (
        "not_connected_in_this_slice"
    )
    assert flat["Independent Annex"]["admin_action_route_hint"].endswith(
        "/governance-coverage"
    )

    root_tree = activity_map["tree"][0]
    branch_tree = next(
        child for child in root_tree["children"] if child["node"]["name"] == "Main Campus"
    )
    assert branch_tree["children"][0]["node"]["name"] == "Primary Six Class"

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_activity_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-activity-visible-member@example.com")
    outsider = _seed_user(3, "node-activity-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Activity Union Domain",
                "display_name": "Node Activity Union Domain",
                "domain_type": "professional_union",
                "template_key": "union_professional_body",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        chapter = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Lagos Chapter",
                "parent_node_id": root_node_id,
                "node_type": "chapter",
                "node_kind": "union_chapter",
            },
        )
        assert chapter.status_code == 201, chapter.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(f"/community-domains/{domain_id}/node-activity-map")
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(
            f"/community-domains/{domain_id}/node-activity-map"
        )
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    activity_map = member_map.json()["node_activity_map"]
    assert activity_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert activity_map["template"]["template_key"] == "union_professional_body"
    assert activity_map["counts"]["nodes"] == 2
    assert activity_map["counts"]["non_root_nodes"] == 1
    assert activity_map["counts"]["active_node_memberships"] is None
    assert activity_map["counts"]["active_policies"] is None
    assert activity_map["counts"]["review_records"] is None
    assert activity_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_node_activity",
        "label": "Ask a Community Domain admin to review local activity readiness",
        "route_hint": None,
        "requires_admin": True,
    }

    flat = {item["node"]["name"]: item for item in activity_map["flat_nodes"]}
    assert flat["Lagos Chapter"]["activity_status"] == "needs_local_admin"
    assert flat["Lagos Chapter"]["local_member_count"] is None
    assert flat["Lagos Chapter"]["local_admin_count"] is None
    assert flat["Lagos Chapter"]["local_policy_count"] is None
    assert flat["Lagos Chapter"]["review_record_count"] is None
    assert flat["Lagos Chapter"]["scheduled_activity_status"] == (
        "not_connected_in_this_slice"
    )
    assert flat["Lagos Chapter"]["route_hint"].endswith("/operating-summary")
    assert flat["Lagos Chapter"]["admin_action_route_hint"] is None
    assert "payment instructions" in activity_map["boundary"]
    assert "private member activity" in activity_map["boundary"]


def test_node_trust_map_projects_local_unit_trust_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    line_admin = _seed_user(2, "node-trust-line-admin@example.com")
    line_member = _seed_user(3, "node-trust-line-member@example.com")
    section_admin = _seed_user(4, "node-trust-section-admin@example.com")
    section_member = _seed_user(5, "node-trust-section-member@example.com")
    committee_admin = _seed_user(6, "node-trust-committee-admin@example.com")
    committee_member = _seed_user(7, "node-trust-committee-member@example.com")
    branch_admin = _seed_user(8, "node-trust-branch-admin@example.com")
    branch_member = _seed_user(9, "node-trust-branch-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Trust Market Domain",
                "display_name": "Node Trust Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
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

        section = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Phone Accessories Section",
                "parent_node_id": line_id,
                "node_type": "section",
                "node_kind": "market_section",
            },
        )
        assert section.status_code == 201, section.text
        section_id = section.json()["node"]["id"]

        committee = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Welfare Committee",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "market_committee",
            },
        )
        assert committee.status_code == 201, committee.text
        committee_id = committee.json()["node"]["id"]

        independent = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Independent Branch",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "market_branch",
                "inherits_parent_policy": False,
            },
        )
        assert independent.status_code == 201, independent.text
        independent_id = independent.json()["node"]["id"]

        for user in (
            line_admin,
            line_member,
            section_admin,
            section_member,
            committee_admin,
            committee_member,
            branch_admin,
            branch_member,
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (line_id, line_admin.id, "node_admin"),
            (line_id, line_member.id, "member"),
            (section_id, section_admin.id, "node_admin"),
            (section_id, section_member.id, "member"),
            (committee_id, committee_admin.id, "node_admin"),
            (committee_id, committee_member.id, "member"),
            (independent_id, branch_admin.id, "node_admin"),
            (independent_id, branch_member.id, "member"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        for node_id, key in (
            (line_id, "line"),
            (section_id, "section"),
            (committee_id, "committee"),
        ):
            policy = client.post(
                f"/community-domains/{domain_id}/policies",
                json={
                    "policy_key": f"node-trust-{key}-review",
                    "action_key": "trust.review",
                    "community_node_id": node_id,
                    "scope_type": "node",
                    "review_mode": "node_admin_review",
                    "required_role": "node_admin",
                },
            )
            assert policy.status_code == 201, policy.text

        line_review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "trust.review",
                "community_node_id": line_id,
                "request_note": "Review line trust evidence.",
                "payload": {"claim": "line trust readiness"},
            },
        )
        assert line_review.status_code == 201, line_review.text
        line_review_id = line_review.json()["action_review"]["id"]

        section_review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "trust.review",
                "community_node_id": section_id,
                "request_note": "Review section trust evidence.",
                "payload": {"claim": "section trust readiness"},
            },
        )
        assert section_review.status_code == 201, section_review.text

        evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{line_review_id}/evidence",
            json={
                "evidence_type": "document",
                "title": "Node trust evidence extract",
                "file_name": "node-trust-evidence.pdf",
                "storage_key": "private/evidence/node-trust-evidence.pdf",
            },
        )
        assert evidence.status_code == 201, evidence.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/node-trust-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    trust_map = payload["node_trust_map"]
    assert trust_map["editable"] is False
    assert trust_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert trust_map["counts"] == {
        "nodes": 5,
        "non_root_nodes": 4,
        "active_node_memberships": 8,
        "active_policies": 3,
        "review_records": 2,
        "active_evidence_records": 1,
        "local_trust_ready": 1,
        "needs_local_admin": 0,
        "needs_participants": 0,
        "governance_needed": 1,
        "review_needed": 1,
        "evidence_needed": 1,
        "inactive": 0,
        "credentials": 0,
        "trust_passport_entries": 0,
        "trustslips": 0,
    }
    assert trust_map["primary_next_action"] == {
        "action_key": "add_governance_for_local_trust",
        "label": "Add governance for local trust evidence",
        "route_hint": f"/community-domains/{domain_id}/governance-coverage",
        "requires_admin": True,
    }
    assert "read-only local trust" in trust_map["boundary"]
    assert "upload evidence" in trust_map["boundary"]
    assert "expose storage keys" in trust_map["boundary"]
    assert "issue TrustSlips" in trust_map["boundary"]
    assert "Trust Passport entries" in trust_map["boundary"]
    assert "private member activity" in trust_map["boundary"]
    assert "private/evidence/node-trust-evidence.pdf" not in str(trust_map)

    flat = {item["node"]["name"]: item for item in trust_map["flat_nodes"]}
    assert flat["Node Trust Market Domain"]["trust_status"] == "domain_root"
    assert flat["Electronics Line"]["trust_status"] == "local_trust_ready"
    assert flat["Electronics Line"]["ready_for_local_trust"] is True
    assert flat["Electronics Line"]["review_record_count"] == 1
    assert flat["Electronics Line"]["evidence_record_count"] == 1
    assert flat["Phone Accessories Section"]["trust_status"] == "evidence_needed"
    assert flat["Phone Accessories Section"]["review_record_count"] == 1
    assert flat["Phone Accessories Section"]["evidence_record_count"] == 0
    assert flat["Welfare Committee"]["trust_status"] == "review_needed"
    assert flat["Welfare Committee"]["review_record_count"] == 0
    assert flat["Welfare Committee"]["effective_policy_count"] == 1
    assert flat["Independent Branch"]["trust_status"] == "governance_needed"
    assert flat["Independent Branch"]["effective_policy_count"] == 0
    assert flat["Independent Branch"]["credential_status"] == (
        "not_connected_in_this_slice"
    )
    assert flat["Independent Branch"]["trust_passport_status"] == (
        "not_connected_in_this_slice"
    )
    assert flat["Independent Branch"]["trustslip_status"] == (
        "not_connected_in_this_slice"
    )
    assert flat["Independent Branch"]["admin_action_route_hint"].endswith(
        "/governance-coverage"
    )

    root_tree = trust_map["tree"][0]
    line_tree = next(
        child
        for child in root_tree["children"]
        if child["node"]["name"] == "Electronics Line"
    )
    assert line_tree["children"][0]["node"]["name"] == "Phone Accessories Section"

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_trust_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-trust-visible-member@example.com")
    outsider = _seed_user(3, "node-trust-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Trust Union Domain",
                "display_name": "Node Trust Union Domain",
                "domain_type": "professional_union",
                "template_key": "union_professional_body",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        chapter = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Lagos Chapter",
                "parent_node_id": root_node_id,
                "node_type": "chapter",
                "node_kind": "union_chapter",
            },
        )
        assert chapter.status_code == 201, chapter.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(f"/community-domains/{domain_id}/node-trust-map")
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(f"/community-domains/{domain_id}/node-trust-map")
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    trust_map = member_map.json()["node_trust_map"]
    assert trust_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert trust_map["counts"]["nodes"] == 2
    assert trust_map["counts"]["non_root_nodes"] == 1
    assert trust_map["counts"]["active_node_memberships"] is None
    assert trust_map["counts"]["active_policies"] is None
    assert trust_map["counts"]["review_records"] is None
    assert trust_map["counts"]["active_evidence_records"] is None
    assert trust_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_node_trust",
        "label": "Ask a Community Domain admin to review local trust readiness",
        "route_hint": None,
        "requires_admin": True,
    }

    flat = {item["node"]["name"]: item for item in trust_map["flat_nodes"]}
    assert flat["Lagos Chapter"]["trust_status"] == "needs_local_admin"
    assert flat["Lagos Chapter"]["local_member_count"] is None
    assert flat["Lagos Chapter"]["local_admin_count"] is None
    assert flat["Lagos Chapter"]["local_policy_count"] is None
    assert flat["Lagos Chapter"]["review_record_count"] is None
    assert flat["Lagos Chapter"]["evidence_record_count"] is None
    assert flat["Lagos Chapter"]["credential_status"] == (
        "not_connected_in_this_slice"
    )
    assert flat["Lagos Chapter"]["route_hint"].endswith("/operating-summary")
    assert flat["Lagos Chapter"]["admin_action_route_hint"] is None
    assert "read-only local trust" in trust_map["boundary"]
    assert "upload evidence" in trust_map["boundary"]
    assert "private member activity" in trust_map["boundary"]


def test_node_participation_map_projects_member_placement_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    line_admin = _seed_user(2, "node-participation-line-admin@example.com")
    line_member = _seed_user(3, "node-participation-line-member@example.com")
    section_admin = _seed_user(4, "node-participation-section-admin@example.com")
    committee_member = _seed_user(5, "node-participation-committee@example.com")
    unplaced_member = _seed_user(6, "node-participation-unplaced@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Participation Market Domain",
                "display_name": "Node Participation Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
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

        section = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Phone Accessories Section",
                "parent_node_id": line_id,
                "node_type": "section",
                "node_kind": "market_section",
            },
        )
        assert section.status_code == 201, section.text
        section_id = section.json()["node"]["id"]

        committee = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Welfare Committee",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "market_committee",
            },
        )
        assert committee.status_code == 201, committee.text
        committee_id = committee.json()["node"]["id"]

        empty_branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Empty Branch",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "market_branch",
            },
        )
        assert empty_branch.status_code == 201, empty_branch.text

        for user in (
            line_admin,
            line_member,
            section_admin,
            committee_member,
            unplaced_member,
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (line_id, line_admin.id, "node_admin"),
            (line_id, line_member.id, "member"),
            (section_id, section_admin.id, "node_admin"),
            (committee_id, committee_member.id, "member"),
            (section_id, line_admin.id, "node_admin"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(
            f"/community-domains/{domain_id}/node-participation-map"
        )
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    participation = payload["node_participation_map"]
    assert participation["editable"] is False
    assert participation["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert participation["counts"] == {
        "nodes": 5,
        "non_root_nodes": 4,
        "active_domain_members": 6,
        "active_node_memberships": 5,
        "unplaced_domain_members": 2,
        "multi_node_members": 1,
        "domain_admin_members": 1,
        "ready_local_circle": 1,
        "needs_local_admin": 1,
        "admin_only": 1,
        "empty_unit": 1,
        "inactive": 0,
    }
    assert participation["primary_next_action"] == {
        "action_key": "place_unassigned_members_into_units",
        "label": "Place unassigned members into operating units",
        "route_hint": f"/community-domains/{domain_id}/nodes/tree",
        "requires_admin": True,
    }
    assert "read-only member placement planning" in participation["boundary"]
    assert "invite members" in participation["boundary"]
    assert "place members" in participation["boundary"]
    assert "expose member lists" in participation["boundary"]
    assert "private member activity" in participation["boundary"]
    assert "issue TrustSlips" in participation["boundary"]

    flat = {item["node"]["name"]: item for item in participation["flat_nodes"]}
    assert flat["Node Participation Market Domain"]["participation_status"] == (
        "domain_root"
    )
    assert flat["Electronics Line"]["participation_status"] == "ready_local_circle"
    assert flat["Electronics Line"]["ready_for_local_participation"] is True
    assert flat["Electronics Line"]["local_member_count"] == 2
    assert flat["Electronics Line"]["local_admin_count"] == 1
    assert flat["Electronics Line"]["local_participant_count"] == 1
    assert flat["Electronics Line"]["local_multi_node_member_count"] == 1
    assert flat["Phone Accessories Section"]["participation_status"] == "admin_only"
    assert flat["Phone Accessories Section"]["local_member_count"] == 2
    assert flat["Phone Accessories Section"]["local_admin_count"] == 2
    assert flat["Phone Accessories Section"]["local_participant_count"] == 0
    assert flat["Welfare Committee"]["participation_status"] == "needs_local_admin"
    assert flat["Welfare Committee"]["local_member_count"] == 1
    assert flat["Welfare Committee"]["local_admin_count"] == 0
    assert flat["Empty Branch"]["participation_status"] == "empty_unit"
    assert flat["Empty Branch"]["local_member_count"] == 0

    root_tree = participation["tree"][0]
    line_tree = next(
        child
        for child in root_tree["children"]
        if child["node"]["name"] == "Electronics Line"
    )
    assert line_tree["children"][0]["node"]["name"] == "Phone Accessories Section"

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_participation_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-participation-visible-member@example.com")
    outsider = _seed_user(3, "node-participation-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Participation Union Domain",
                "display_name": "Node Participation Union Domain",
                "domain_type": "professional_union",
                "template_key": "union_professional_body",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        chapter = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Lagos Chapter",
                "parent_node_id": root_node_id,
                "node_type": "chapter",
                "node_kind": "union_chapter",
            },
        )
        assert chapter.status_code == 201, chapter.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(
            f"/community-domains/{domain_id}/node-participation-map"
        )
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(
            f"/community-domains/{domain_id}/node-participation-map"
        )
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    participation = member_map.json()["node_participation_map"]
    assert participation["viewer"] == {"user_id": member.id, "can_admin": False}
    assert participation["counts"]["nodes"] == 2
    assert participation["counts"]["non_root_nodes"] == 1
    assert participation["counts"]["active_domain_members"] is None
    assert participation["counts"]["active_node_memberships"] is None
    assert participation["counts"]["unplaced_domain_members"] is None
    assert participation["counts"]["multi_node_members"] is None
    assert participation["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_node_participation",
        "label": "Ask a Community Domain admin to review member placement",
        "route_hint": None,
        "requires_admin": True,
    }

    flat = {item["node"]["name"]: item for item in participation["flat_nodes"]}
    assert flat["Lagos Chapter"]["participation_status"] == "empty_unit"
    assert flat["Lagos Chapter"]["local_member_count"] is None
    assert flat["Lagos Chapter"]["local_admin_count"] is None
    assert flat["Lagos Chapter"]["local_participant_count"] is None
    assert flat["Lagos Chapter"]["local_multi_node_member_count"] is None
    assert flat["Lagos Chapter"]["route_hint"].endswith("/operating-summary")
    assert flat["Lagos Chapter"]["admin_action_route_hint"] is None
    assert "read-only member placement planning" in participation["boundary"]
    assert "expose member lists" in participation["boundary"]
    assert "private member activity" in participation["boundary"]


def test_node_service_map_projects_local_service_readiness_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    line_admin = _seed_user(2, "node-service-line-admin@example.com")
    line_member = _seed_user(3, "node-service-line-member@example.com")
    section_admin = _seed_user(4, "node-service-section-admin@example.com")
    committee_member = _seed_user(5, "node-service-committee-member@example.com")
    branch_admin = _seed_user(6, "node-service-branch-admin@example.com")
    branch_member = _seed_user(7, "node-service-branch-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Service Market Domain",
                "display_name": "Node Service Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
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

        section = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Phone Accessories Section",
                "parent_node_id": line_id,
                "node_type": "section",
                "node_kind": "market_section",
            },
        )
        assert section.status_code == 201, section.text
        section_id = section.json()["node"]["id"]

        committee = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Welfare Committee",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "market_committee",
            },
        )
        assert committee.status_code == 201, committee.text
        committee_id = committee.json()["node"]["id"]

        independent = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Independent Branch",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "market_branch",
                "inherits_parent_policy": False,
            },
        )
        assert independent.status_code == 201, independent.text
        independent_id = independent.json()["node"]["id"]

        for user in (
            line_admin,
            line_member,
            section_admin,
            committee_member,
            branch_admin,
            branch_member,
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (line_id, line_admin.id, "node_admin"),
            (line_id, line_member.id, "member"),
            (section_id, section_admin.id, "node_admin"),
            (committee_id, committee_member.id, "member"),
            (independent_id, branch_admin.id, "node_admin"),
            (independent_id, branch_member.id, "member"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "node-service-line-policy",
                "action_key": "service.review",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "node_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/node-service-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    service_map = payload["node_service_map"]
    assert service_map["editable"] is False
    assert service_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert service_map["template"]["template_key"] == "market_cooperative"
    assert service_map["template"]["default_modules"]
    assert service_map["counts"] == {
        "nodes": 5,
        "non_root_nodes": 4,
        "active_node_memberships": 6,
        "active_policies": 1,
        "template_module_count": 7,
        "local_services_ready": 1,
        "needs_local_admin": 1,
        "needs_participants": 1,
        "governance_needed": 1,
        "no_template_modules": 0,
        "inactive": 0,
        "live_service_records": 0,
        "events": 0,
        "notifications": 0,
        "shops": 0,
        "vault_links": 0,
    }
    assert service_map["primary_next_action"] == {
        "action_key": "assign_local_admins_for_service_units",
        "label": "Assign local admins before local services",
        "route_hint": f"/community-domains/{domain_id}/roles",
        "requires_admin": True,
    }
    assert "read-only local service planning" in service_map["boundary"]
    assert "enable modules" in service_map["boundary"]
    assert "persist settings" in service_map["boundary"]
    assert "activate billing" in service_map["boundary"]
    assert "grant permissions" in service_map["boundary"]
    assert "create notifications" in service_map["boundary"]
    assert "create vault links" in service_map["boundary"]
    assert "private member activity" in service_map["boundary"]
    assert "Trust Passport entries" in service_map["boundary"]

    flat = {item["node"]["name"]: item for item in service_map["flat_nodes"]}
    assert flat["Node Service Market Domain"]["service_status"] == "domain_root"
    assert flat["Electronics Line"]["service_status"] == "local_services_ready"
    assert flat["Electronics Line"]["ready_for_local_services"] is True
    assert flat["Electronics Line"]["template_module_count"] == 7
    assert flat["Electronics Line"]["effective_policy_count"] == 1
    assert flat["Phone Accessories Section"]["service_status"] == "needs_participants"
    assert flat["Phone Accessories Section"]["local_admin_count"] == 1
    assert flat["Phone Accessories Section"]["local_participant_count"] == 0
    assert flat["Phone Accessories Section"]["effective_policy_count"] == 1
    assert flat["Welfare Committee"]["service_status"] == "needs_local_admin"
    assert flat["Welfare Committee"]["local_admin_count"] == 0
    assert flat["Independent Branch"]["service_status"] == "governance_needed"
    assert flat["Independent Branch"]["local_participant_count"] == 1
    assert flat["Independent Branch"]["effective_policy_count"] == 0
    assert flat["Independent Branch"]["live_service_records"] == 0
    assert flat["Independent Branch"]["notifications"] == 0
    assert flat["Independent Branch"]["vault_links"] == 0

    root_tree = service_map["tree"][0]
    line_tree = next(
        child
        for child in root_tree["children"]
        if child["node"]["name"] == "Electronics Line"
    )
    assert line_tree["children"][0]["node"]["name"] == "Phone Accessories Section"

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_service_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-service-visible-member@example.com")
    outsider = _seed_user(3, "node-service-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Service School Domain",
                "display_name": "Node Service School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Branch",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(f"/community-domains/{domain_id}/node-service-map")
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(f"/community-domains/{domain_id}/node-service-map")
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    service_map = member_map.json()["node_service_map"]
    assert service_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert service_map["template"]["template_key"] == "school_multi_branch"
    assert service_map["counts"]["nodes"] == 2
    assert service_map["counts"]["non_root_nodes"] == 1
    assert service_map["counts"]["active_node_memberships"] is None
    assert service_map["counts"]["active_policies"] is None
    assert service_map["counts"]["template_module_count"] == 6
    assert service_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_node_services",
        "label": "Ask a Community Domain admin to review local services",
        "route_hint": None,
        "requires_admin": True,
    }

    flat = {item["node"]["name"]: item for item in service_map["flat_nodes"]}
    assert flat["Primary Branch"]["service_status"] == "needs_local_admin"
    assert flat["Primary Branch"]["local_member_count"] is None
    assert flat["Primary Branch"]["local_admin_count"] is None
    assert flat["Primary Branch"]["local_participant_count"] is None
    assert flat["Primary Branch"]["effective_policy_count"] is None
    assert flat["Primary Branch"]["template_module_count"] == 6
    assert flat["Primary Branch"]["route_hint"].endswith("/operating-summary")
    assert flat["Primary Branch"]["admin_action_route_hint"] is None
    assert flat["Primary Branch"]["live_service_records"] == 0
    assert "enable modules" in service_map["boundary"]
    assert "grant permissions" in service_map["boundary"]
    assert "private member activity" in service_map["boundary"]


def test_node_privacy_map_projects_local_visibility_without_permission_writes(
    client: TestClient,
):
    owner = _seed_owner()
    line_admin = _seed_user(2, "node-privacy-line-admin@example.com")
    line_member = _seed_user(3, "node-privacy-line-member@example.com")
    section_member = _seed_user(4, "node-privacy-section-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Privacy Market Domain",
                "display_name": "Node Privacy Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "parent_node_id": root_node_id,
                "node_type": "line",
                "node_kind": "market_line",
                "visibility_policy": "members",
            },
        )
        assert line.status_code == 201, line.text
        line_id = line.json()["node"]["id"]

        section = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Phone Accessories Section",
                "parent_node_id": line_id,
                "node_type": "section",
                "node_kind": "market_section",
                "visibility_policy": "node_members",
            },
        )
        assert section.status_code == 201, section.text
        section_id = section.json()["node"]["id"]

        committee = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Executive Committee",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "governance_committee",
                "visibility_policy": "admins",
            },
        )
        assert committee.status_code == 201, committee.text
        committee_id = committee.json()["node"]["id"]

        public_unit = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Public Showcase Unit",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "market_branch",
                "visibility_policy": "public",
            },
        )
        assert public_unit.status_code == 201, public_unit.text

        for user in (line_admin, line_member, section_member):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (line_id, line_admin.id, "node_admin"),
            (line_id, line_member.id, "member"),
            (section_id, section_member.id, "member"),
            (committee_id, line_admin.id, "node_admin"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "node-privacy-line-policy",
                "action_key": "privacy.review",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "node_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "privacy.review",
                "community_node_id": line_id,
                "request_note": "Review local privacy evidence.",
                "payload": {"claim": "privacy posture"},
            },
        )
        assert review.status_code == 201, review.text
        review_id = review.json()["action_review"]["id"]

        evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review_id}/evidence",
            json={
                "evidence_type": "document",
                "title": "Privacy posture note",
                "file_name": "node-privacy.pdf",
                "storage_key": "private/evidence/node-privacy.pdf",
            },
        )
        assert evidence.status_code == 201, evidence.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/node-privacy-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    privacy_map = payload["node_privacy_map"]
    assert privacy_map["editable"] is False
    assert privacy_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert privacy_map["counts"] == {
        "nodes": 5,
        "non_root_nodes": 4,
        "visibility_policy_counts": {
            "members": 2,
            "node_members": 1,
            "admins": 1,
            "public": 1,
        },
        "active_node_memberships": 4,
        "active_policies": 1,
        "review_records": 1,
        "active_evidence_records": 1,
        "member_visible": 1,
        "node_private": 1,
        "admin_restricted": 1,
        "public_review_needed": 1,
        "unknown_visibility": 0,
        "inactive": 0,
        "public_pages": 0,
        "published_hierarchies": 0,
        "exposed_member_lists": 0,
        "cross_domain_shares": 0,
    }
    assert privacy_map["primary_next_action"] == {
        "action_key": "review_public_node_visibility",
        "label": "Review public node visibility",
        "route_hint": f"/community-domains/{domain_id}/record-privacy-map",
        "requires_admin": True,
    }
    assert "read-only local privacy planning" in privacy_map["boundary"]
    assert "does not change permissions" in privacy_map["boundary"]
    assert "publish hierarchy" in privacy_map["boundary"]
    assert "expose member lists" in privacy_map["boundary"]
    assert "expose node rosters" in privacy_map["boundary"]
    assert "expose storage keys" in privacy_map["boundary"]
    assert "share records across institutions" in privacy_map["boundary"]
    assert "Trust Passport entries" in privacy_map["boundary"]
    assert "private/evidence/node-privacy.pdf" not in str(privacy_map)

    flat = {item["node"]["name"]: item for item in privacy_map["flat_nodes"]}
    assert flat["Node Privacy Market Domain"]["privacy_status"] == "domain_root"
    assert flat["Electronics Line"]["privacy_status"] == "member_visible"
    assert flat["Electronics Line"]["local_member_count"] == 2
    assert flat["Electronics Line"]["local_admin_count"] == 1
    assert flat["Electronics Line"]["local_policy_count"] == 1
    assert flat["Electronics Line"]["review_record_count"] == 1
    assert flat["Electronics Line"]["evidence_record_count"] == 1
    assert flat["Phone Accessories Section"]["privacy_status"] == "node_private"
    assert flat["Phone Accessories Section"]["visibility_policy"] == "node_members"
    assert flat["Executive Committee"]["privacy_status"] == "admin_restricted"
    assert flat["Executive Committee"]["visibility_policy"] == "admins"
    assert flat["Public Showcase Unit"]["privacy_status"] == "public_review_needed"
    assert flat["Public Showcase Unit"]["public_page_status"] == (
        "not_published_in_this_slice"
    )
    assert flat["Public Showcase Unit"]["member_list_status"] == (
        "not_exposed_in_this_slice"
    )
    assert flat["Public Showcase Unit"]["storage_key_status"] == (
        "not_exposed_in_this_slice"
    )
    assert flat["Public Showcase Unit"]["admin_action_route_hint"].endswith(
        "/record-privacy-map"
    )

    root_tree = privacy_map["tree"][0]
    line_tree = next(
        child
        for child in root_tree["children"]
        if child["node"]["name"] == "Electronics Line"
    )
    assert line_tree["children"][0]["node"]["name"] == "Phone Accessories Section"

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_privacy_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-privacy-visible-member@example.com")
    outsider = _seed_user(3, "node-privacy-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Privacy School Domain",
                "display_name": "Node Privacy School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Branch",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "school_branch",
                "visibility_policy": "node_members",
            },
        )
        assert branch.status_code == 201, branch.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(f"/community-domains/{domain_id}/node-privacy-map")
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(f"/community-domains/{domain_id}/node-privacy-map")
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    privacy_map = member_map.json()["node_privacy_map"]
    assert privacy_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert privacy_map["counts"]["nodes"] == 2
    assert privacy_map["counts"]["non_root_nodes"] == 1
    assert privacy_map["counts"]["visibility_policy_counts"] is None
    assert privacy_map["counts"]["active_node_memberships"] is None
    assert privacy_map["counts"]["active_policies"] is None
    assert privacy_map["counts"]["review_records"] is None
    assert privacy_map["counts"]["active_evidence_records"] is None
    assert privacy_map["primary_next_action"] == {
        "action_key": "review_record_privacy_boundaries",
        "label": "Review Community Domain privacy boundaries",
        "route_hint": f"/community-domains/{domain_id}/record-privacy-map",
        "requires_admin": False,
    }

    flat = {item["node"]["name"]: item for item in privacy_map["flat_nodes"]}
    assert flat["Primary Branch"]["privacy_status"] == "node_private"
    assert flat["Primary Branch"]["local_member_count"] is None
    assert flat["Primary Branch"]["local_admin_count"] is None
    assert flat["Primary Branch"]["local_policy_count"] is None
    assert flat["Primary Branch"]["review_record_count"] is None
    assert flat["Primary Branch"]["evidence_record_count"] is None
    assert flat["Primary Branch"]["member_list_status"] == "not_exposed_in_this_slice"
    assert flat["Primary Branch"]["storage_key_status"] == "not_exposed_in_this_slice"
    assert flat["Primary Branch"]["admin_action_route_hint"] is None
    assert "does not change permissions" in privacy_map["boundary"]
    assert "expose member lists" in privacy_map["boundary"]
    assert "private member activity" in privacy_map["boundary"]


def test_node_analytics_map_projects_local_signals_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    line_admin = _seed_user(2, "node-analytics-line-admin@example.com")
    line_member = _seed_user(3, "node-analytics-line-member@example.com")
    section_admin = _seed_user(4, "node-analytics-section-admin@example.com")
    section_member = _seed_user(5, "node-analytics-section-member@example.com")
    committee_member = _seed_user(6, "node-analytics-committee-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Analytics Market Domain",
                "display_name": "Node Analytics Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
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

        section = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Phone Accessories Section",
                "parent_node_id": line_id,
                "node_type": "section",
                "node_kind": "market_section",
            },
        )
        assert section.status_code == 201, section.text
        section_id = section.json()["node"]["id"]

        committee = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Welfare Committee",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "market_committee",
            },
        )
        assert committee.status_code == 201, committee.text
        committee_id = committee.json()["node"]["id"]

        empty_branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Empty Branch",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "market_branch",
            },
        )
        assert empty_branch.status_code == 201, empty_branch.text
        empty_branch_id = empty_branch.json()["node"]["id"]

        for user in (
            line_admin,
            line_member,
            section_admin,
            section_member,
            committee_member,
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (line_id, line_admin.id, "line_admin"),
            (line_id, line_member.id, "member"),
            (section_id, section_admin.id, "node_admin"),
            (section_id, section_member.id, "member"),
            (committee_id, committee_member.id, "member"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "node-analytics-line-policy",
                "action_key": "analytics.review",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "line_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "analytics.review",
                "community_node_id": line_id,
                "request_note": "Review local analytics evidence.",
                "payload": {"claim": "analytics posture"},
            },
        )
        assert review.status_code == 201, review.text
        review_id = review.json()["action_review"]["id"]

        evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review_id}/evidence",
            json={
                "evidence_type": "document",
                "title": "Analytics posture note",
                "file_name": "node-analytics.pdf",
                "storage_key": "private/evidence/node-analytics.pdf",
            },
        )
        assert evidence.status_code == 201, evidence.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/node-analytics-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    analytics_map = payload["node_analytics_map"]
    assert analytics_map["editable"] is False
    assert analytics_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert analytics_map["counts"] == {
        "nodes": 5,
        "non_root_nodes": 4,
        "active_node_memberships": 5,
        "active_policies": 1,
        "review_records": 1,
        "active_evidence_records": 1,
        "template_module_count": 7,
        "local_analytics_ready": 1,
        "needs_membership_signal": 1,
        "needs_governance_signal": 1,
        "needs_review_signal": 1,
        "inactive": 0,
        "exported_reports": 0,
        "live_dashboards": 0,
        "telemetry_events": 0,
        "marketplace_metrics": 0,
        "finance_metrics": 0,
    }
    assert analytics_map["status_counts"] == {
        "local_analytics_ready": 1,
        "needs_review_signal": 1,
        "needs_governance_signal": 1,
        "needs_membership_signal": 1,
    }
    assert analytics_map["primary_next_action"] == {
        "action_key": "place_members_for_node_analytics",
        "label": "Place members before local analytics",
        "route_hint": f"/community-domains/{domain_id}/node-participation-map",
        "requires_admin": True,
    }
    assert "read-only local analytics" in analytics_map["boundary"]
    assert "does not create telemetry" in analytics_map["boundary"]
    assert "export reports" in analytics_map["boundary"]
    assert "live dashboards" in analytics_map["boundary"]
    assert "marketplace metrics" in analytics_map["boundary"]
    assert "finance metrics" in analytics_map["boundary"]
    assert "Trust Passport entries" in analytics_map["boundary"]
    assert "private/evidence/node-analytics.pdf" not in str(analytics_map)

    flat = {item["node"]["name"]: item for item in analytics_map["flat_nodes"]}
    assert flat["Node Analytics Market Domain"]["analytics_status"] == "domain_root"
    assert flat["Electronics Line"]["analytics_status"] == "local_analytics_ready"
    assert flat["Electronics Line"]["ready_for_local_analytics"] is True
    assert flat["Electronics Line"]["local_member_count"] == 2
    assert flat["Electronics Line"]["local_admin_count"] == 1
    assert flat["Electronics Line"]["local_policy_count"] == 1
    assert flat["Electronics Line"]["effective_policy_count"] == 1
    assert flat["Electronics Line"]["review_record_count"] == 1
    assert flat["Electronics Line"]["evidence_record_count"] == 1
    assert flat["Electronics Line"]["signal_count"] == 2
    assert flat["Phone Accessories Section"]["analytics_status"] == (
        "needs_review_signal"
    )
    assert flat["Phone Accessories Section"]["effective_policy_count"] == 1
    assert flat["Phone Accessories Section"]["review_record_count"] == 0
    assert flat["Welfare Committee"]["analytics_status"] == (
        "needs_governance_signal"
    )
    assert flat["Welfare Committee"]["effective_policy_count"] == 0
    assert flat["Empty Branch"]["analytics_status"] == "needs_membership_signal"
    assert flat["Empty Branch"]["local_member_count"] == 0
    assert flat["Empty Branch"]["admin_action_route_hint"].endswith(
        "/node-participation-map"
    )
    assert flat["Empty Branch"]["metric_export_status"] == (
        "not_connected_in_this_slice"
    )
    assert flat["Empty Branch"]["live_dashboard_status"] == (
        "not_connected_in_this_slice"
    )
    assert flat["Empty Branch"]["marketplace_metric_status"] == (
        "not_connected_in_this_slice"
    )
    assert flat["Empty Branch"]["finance_metric_status"] == (
        "not_connected_in_this_slice"
    )
    assert flat["Empty Branch"]["trust_passport_status"] == (
        "not_connected_in_this_slice"
    )
    assert empty_branch_id == flat["Empty Branch"]["node"]["id"]

    root_tree = analytics_map["tree"][0]
    line_tree = next(
        child
        for child in root_tree["children"]
        if child["node"]["name"] == "Electronics Line"
    )
    assert line_tree["children"][0]["node"]["name"] == "Phone Accessories Section"

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_analytics_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-analytics-visible-member@example.com")
    outsider = _seed_user(3, "node-analytics-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Analytics School Domain",
                "display_name": "Node Analytics School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Branch",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert branch.status_code == 201, branch.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(f"/community-domains/{domain_id}/node-analytics-map")
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(f"/community-domains/{domain_id}/node-analytics-map")
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    analytics_map = member_map.json()["node_analytics_map"]
    assert analytics_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert analytics_map["counts"]["nodes"] == 2
    assert analytics_map["counts"]["non_root_nodes"] == 1
    assert analytics_map["counts"]["active_node_memberships"] is None
    assert analytics_map["counts"]["active_policies"] is None
    assert analytics_map["counts"]["review_records"] is None
    assert analytics_map["counts"]["active_evidence_records"] is None
    assert analytics_map["counts"]["template_module_count"] == 6
    assert analytics_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_node_analytics",
        "label": "Ask a Community Domain admin to review local analytics",
        "route_hint": None,
        "requires_admin": True,
    }

    flat = {item["node"]["name"]: item for item in analytics_map["flat_nodes"]}
    assert flat["Primary Branch"]["analytics_status"] == "needs_membership_signal"
    assert flat["Primary Branch"]["local_member_count"] is None
    assert flat["Primary Branch"]["local_admin_count"] is None
    assert flat["Primary Branch"]["local_policy_count"] is None
    assert flat["Primary Branch"]["effective_policy_count"] is None
    assert flat["Primary Branch"]["review_record_count"] is None
    assert flat["Primary Branch"]["evidence_record_count"] is None
    assert flat["Primary Branch"]["signal_count"] is None
    assert flat["Primary Branch"]["admin_action_route_hint"] is None
    assert flat["Primary Branch"]["metric_export_status"] == (
        "not_connected_in_this_slice"
    )
    assert "does not create telemetry" in analytics_map["boundary"]
    assert "export reports" in analytics_map["boundary"]
    assert "private member activity" in analytics_map["boundary"]


def test_node_domain_boundary_map_projects_child_domain_candidates_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    branch_admin = _seed_user(2, "node-boundary-branch-admin@example.com")
    branch_member = _seed_user(3, "node-boundary-branch-member@example.com")
    line_admin = _seed_user(4, "node-boundary-line-admin@example.com")
    line_member = _seed_user(5, "node-boundary-line-member@example.com")
    affiliate_admin = _seed_user(6, "node-boundary-affiliate-admin@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Boundary School Group",
                "display_name": "Node Boundary School Group",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        child_candidate = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "London Campus",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "school_branch",
                "visibility_policy": "public",
                "inherits_parent_policy": False,
            },
        )
        assert child_candidate.status_code == 201, child_candidate.text
        child_candidate_id = child_candidate.json()["node"]["id"]

        affiliate_review = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Abuja Campus",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "school_branch",
                "visibility_policy": "public",
            },
        )
        assert affiliate_review.status_code == 201, affiliate_review.text
        affiliate_review_id = affiliate_review.json()["node"]["id"]

        internal_line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Science Department",
                "parent_node_id": root_node_id,
                "node_type": "department",
                "node_kind": "school_department",
                "visibility_policy": "members",
            },
        )
        assert internal_line.status_code == 201, internal_line.text
        internal_line_id = internal_line.json()["node"]["id"]

        parent_unit = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Library Committee",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "school_committee",
                "visibility_policy": "members",
            },
        )
        assert parent_unit.status_code == 201, parent_unit.text

        for user in (
            branch_admin,
            branch_member,
            line_admin,
            line_member,
            affiliate_admin,
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (child_candidate_id, branch_admin.id, "branch_admin"),
            (child_candidate_id, branch_member.id, "member"),
            (internal_line_id, line_admin.id, "department_admin"),
            (internal_line_id, line_member.id, "member"),
            (affiliate_review_id, affiliate_admin.id, "branch_admin"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "node-boundary-london-campus-policy",
                "action_key": "domain_boundary.review",
                "community_node_id": child_candidate_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "branch_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "domain_boundary.review",
                "community_node_id": child_candidate_id,
                "request_note": "Review London Campus as a possible child domain.",
                "payload": {"claim": "possible child domain"},
            },
        )
        assert review.status_code == 201, review.text
        review_id = review.json()["action_review"]["id"]

        evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review_id}/evidence",
            json={
                "evidence_type": "document",
                "title": "Child domain boundary note",
                "file_name": "node-domain-boundary.pdf",
                "storage_key": "private/evidence/node-domain-boundary.pdf",
            },
        )
        assert evidence.status_code == 201, evidence.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "affiliations": db.query(CommunityDomainAffiliation).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(
            f"/community-domains/{domain_id}/node-domain-boundary-map"
        )
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    boundary_map = payload["node_domain_boundary_map"]
    assert boundary_map["editable"] is False
    assert boundary_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert boundary_map["counts"] == {
        "nodes": 5,
        "non_root_nodes": 4,
        "active_node_memberships": 5,
        "active_policies": 1,
        "review_records": 1,
        "active_evidence_records": 1,
        "child_domain_candidate": 1,
        "affiliate_review_needed": 1,
        "internal_operating_unit": 1,
        "parent_domain_unit": 1,
        "inactive": 0,
        "child_domains_created": 0,
        "affiliate_links_created": 0,
        "billing_changes": 0,
        "public_urls_published": 0,
        "members_transferred": 0,
    }
    assert boundary_map["status_counts"] == {
        "child_domain_candidate": 1,
        "affiliate_review_needed": 1,
        "internal_operating_unit": 1,
        "parent_domain_unit": 1,
    }
    assert boundary_map["primary_next_action"] == {
        "action_key": "review_child_domain_candidates",
        "label": "Review possible child Community Domains",
        "route_hint": f"/community-domains/{domain_id}/institutional-profile",
        "requires_admin": True,
    }
    assert "read-only child-domain planning" in boundary_map["boundary"]
    assert "create child Community Domains" in boundary_map["boundary"]
    assert "create affiliate links" in boundary_map["boundary"]
    assert "publish public URLs" in boundary_map["boundary"]
    assert "activate billing" in boundary_map["boundary"]
    assert "split hierarchy" in boundary_map["boundary"]
    assert "transfer members" in boundary_map["boundary"]
    assert "private/evidence/node-domain-boundary.pdf" not in str(boundary_map)

    flat = {item["node"]["name"]: item for item in boundary_map["flat_nodes"]}
    assert flat["Node Boundary School Group"]["domain_boundary_status"] == (
        "domain_root"
    )
    assert flat["London Campus"]["domain_boundary_status"] == (
        "child_domain_candidate"
    )
    assert flat["London Campus"]["recommended_boundary"] == (
        "review_possible_child_domain"
    )
    assert flat["London Campus"]["ready_for_child_domain_review"] is True
    assert flat["London Campus"]["branch_like_unit"] is True
    assert flat["London Campus"]["public_identity_signal"] is True
    assert flat["London Campus"]["detached_policy_inheritance"] is True
    assert flat["London Campus"]["local_member_count"] == 2
    assert flat["London Campus"]["local_admin_count"] == 1
    assert flat["London Campus"]["local_policy_count"] == 1
    assert flat["London Campus"]["review_record_count"] == 1
    assert flat["London Campus"]["evidence_record_count"] == 1
    assert flat["London Campus"]["signal_count"] == 2
    assert flat["London Campus"]["admin_action_route_hint"].endswith(
        "/institutional-profile"
    )
    assert flat["London Campus"]["child_domain_status"] == (
        "not_created_in_this_slice"
    )
    assert flat["London Campus"]["affiliate_link_status"] == (
        "not_created_in_this_slice"
    )
    assert flat["London Campus"]["billing_status"] == "not_changed_in_this_slice"
    assert flat["London Campus"]["public_url_status"] == (
        "not_published_in_this_slice"
    )
    assert flat["London Campus"]["member_transfer_status"] == (
        "not_moved_in_this_slice"
    )
    assert flat["Abuja Campus"]["domain_boundary_status"] == (
        "affiliate_review_needed"
    )
    assert flat["Abuja Campus"]["admin_action_route_hint"].endswith("/social-bridge")
    assert flat["Science Department"]["domain_boundary_status"] == (
        "internal_operating_unit"
    )
    assert flat["Science Department"]["recommended_boundary"] == (
        "keep_inside_parent_domain"
    )
    assert flat["Library Committee"]["domain_boundary_status"] == (
        "parent_domain_unit"
    )

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "affiliations": db.query(CommunityDomainAffiliation).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_domain_boundary_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-boundary-visible-member@example.com")
    outsider = _seed_user(3, "node-boundary-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Boundary Member School",
                "display_name": "Node Boundary Member School",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Branch",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "school_branch",
                "visibility_policy": "public",
            },
        )
        assert branch.status_code == 201, branch.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(
            f"/community-domains/{domain_id}/node-domain-boundary-map"
        )
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(
            f"/community-domains/{domain_id}/node-domain-boundary-map"
        )
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    boundary_map = member_map.json()["node_domain_boundary_map"]
    assert boundary_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert boundary_map["counts"]["nodes"] == 2
    assert boundary_map["counts"]["non_root_nodes"] == 1
    assert boundary_map["counts"]["active_node_memberships"] is None
    assert boundary_map["counts"]["active_policies"] is None
    assert boundary_map["counts"]["review_records"] is None
    assert boundary_map["counts"]["active_evidence_records"] is None
    assert boundary_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_domain_boundaries",
        "label": "Ask a Community Domain admin to review domain boundaries",
        "route_hint": None,
        "requires_admin": True,
    }

    flat = {item["node"]["name"]: item for item in boundary_map["flat_nodes"]}
    assert flat["Primary Branch"]["domain_boundary_status"] == (
        "affiliate_review_needed"
    )
    assert flat["Primary Branch"]["recommended_boundary"] == (
        "review_parent_affiliate_boundary"
    )
    assert flat["Primary Branch"]["local_member_count"] is None
    assert flat["Primary Branch"]["local_admin_count"] is None
    assert flat["Primary Branch"]["local_policy_count"] is None
    assert flat["Primary Branch"]["review_record_count"] is None
    assert flat["Primary Branch"]["evidence_record_count"] is None
    assert flat["Primary Branch"]["signal_count"] is None
    assert flat["Primary Branch"]["admin_action_route_hint"] is None
    assert flat["Primary Branch"]["child_domain_status"] == (
        "not_created_in_this_slice"
    )
    assert "create child Community Domains" in boundary_map["boundary"]
    assert "transfer members" in boundary_map["boundary"]
    assert "private member activity" in boundary_map["boundary"]


def test_node_evidence_authority_map_projects_local_evidence_authority_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    ready_admin = _seed_user(2, "node-evidence-ready-admin@example.com")
    ready_member = _seed_user(3, "node-evidence-ready-member@example.com")
    public_admin = _seed_user(4, "node-evidence-public-admin@example.com")
    public_member = _seed_user(5, "node-evidence-public-member@example.com")
    issuer_member = _seed_user(6, "node-evidence-issuer-member@example.com")
    policy_admin = _seed_user(7, "node-evidence-policy-admin@example.com")
    policy_member = _seed_user(8, "node-evidence-policy-member@example.com")
    signal_admin = _seed_user(9, "node-evidence-signal-admin@example.com")
    signal_member = _seed_user(10, "node-evidence-signal-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Evidence Authority School",
                "display_name": "Node Evidence Authority School",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        ready_node = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Verification Desk",
                "parent_node_id": root_node_id,
                "node_type": "department",
                "node_kind": "evidence_department",
                "visibility_policy": "members",
            },
        )
        assert ready_node.status_code == 201, ready_node.text
        ready_node_id = ready_node.json()["node"]["id"]

        public_node = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Public Testimony Desk",
                "parent_node_id": root_node_id,
                "node_type": "department",
                "node_kind": "public_evidence_department",
                "visibility_policy": "public",
            },
        )
        assert public_node.status_code == 201, public_node.text
        public_node_id = public_node.json()["node"]["id"]

        issuer_node = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Welfare Witness Circle",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "welfare_committee",
                "visibility_policy": "members",
            },
        )
        assert issuer_node.status_code == 201, issuer_node.text
        issuer_node_id = issuer_node.json()["node"]["id"]

        policy_node = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Science Department",
                "parent_node_id": root_node_id,
                "node_type": "department",
                "node_kind": "school_department",
                "visibility_policy": "members",
            },
        )
        assert policy_node.status_code == 201, policy_node.text
        policy_node_id = policy_node.json()["node"]["id"]

        signal_node = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Alumni Evidence Desk",
                "parent_node_id": root_node_id,
                "node_type": "department",
                "node_kind": "alumni_evidence_department",
                "visibility_policy": "members",
            },
        )
        assert signal_node.status_code == 201, signal_node.text
        signal_node_id = signal_node.json()["node"]["id"]

        users = [
            ready_admin,
            ready_member,
            public_admin,
            public_member,
            issuer_member,
            policy_admin,
            policy_member,
            signal_admin,
            signal_member,
        ]
        for user in users:
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (ready_node_id, ready_admin.id, "department_admin"),
            (ready_node_id, ready_member.id, "member"),
            (public_node_id, public_admin.id, "department_admin"),
            (public_node_id, public_member.id, "member"),
            (issuer_node_id, issuer_member.id, "member"),
            (policy_node_id, policy_admin.id, "department_admin"),
            (policy_node_id, policy_member.id, "member"),
            (signal_node_id, signal_admin.id, "department_admin"),
            (signal_node_id, signal_member.id, "member"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        for node_id, suffix in (
            (ready_node_id, "ready"),
            (public_node_id, "public"),
            (signal_node_id, "signal"),
        ):
            policy = client.post(
                f"/community-domains/{domain_id}/policies",
                json={
                    "policy_key": f"node-evidence-{suffix}-policy",
                    "action_key": "evidence.verify",
                    "community_node_id": node_id,
                    "scope_type": "node",
                    "review_mode": "node_admin_review",
                    "required_role": "department_admin",
                },
            )
            assert policy.status_code == 201, policy.text

        for node_id, suffix in (
            (ready_node_id, "ready"),
            (public_node_id, "public"),
        ):
            review = client.post(
                f"/community-domains/{domain_id}/action-reviews",
                json={
                    "action_key": "evidence.verify",
                    "community_node_id": node_id,
                    "request_note": f"Review local evidence for {suffix}.",
                    "payload": {"claim": f"{suffix} evidence posture"},
                },
            )
            assert review.status_code == 201, review.text
            review_id = review.json()["action_review"]["id"]

            evidence = client.post(
                f"/community-domains/{domain_id}/action-reviews/{review_id}/evidence",
                json={
                    "evidence_type": "document",
                    "title": f"{suffix.title()} evidence note",
                    "file_name": f"node-evidence-{suffix}.pdf",
                    "storage_key": f"private/evidence/node-evidence-{suffix}.pdf",
                },
            )
            assert evidence.status_code == 201, evidence.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(
            f"/community-domains/{domain_id}/node-evidence-authority-map"
        )
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    evidence_map = payload["node_evidence_authority_map"]
    assert evidence_map["editable"] is False
    assert evidence_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert evidence_map["counts"] == {
        "nodes": 6,
        "non_root_nodes": 5,
        "active_node_memberships": 9,
        "active_policies": 3,
        "review_records": 2,
        "active_evidence_records": 2,
        "local_evidence_authority_ready": 1,
        "public_evidence_review_needed": 1,
        "needs_local_evidence_issuer": 1,
        "needs_evidence_policy": 1,
        "needs_evidence_signal": 1,
        "inactive": 0,
        "public_evidence_published": 0,
        "credentials_issued": 0,
        "trust_passport_entries_written": 0,
        "storage_keys_exposed": 0,
        "legal_authority_verified": 0,
    }
    assert evidence_map["status_counts"] == {
        "local_evidence_authority_ready": 1,
        "public_evidence_review_needed": 1,
        "needs_local_evidence_issuer": 1,
        "needs_evidence_policy": 1,
        "needs_evidence_signal": 1,
    }
    assert evidence_map["primary_next_action"] == {
        "action_key": "review_public_evidence_exposure",
        "label": "Review public evidence exposure",
        "route_hint": f"/community-domains/{domain_id}/record-privacy-map",
        "requires_admin": True,
    }
    assert "read-only local evidence authority planning" in evidence_map["boundary"]
    assert "upload evidence" in evidence_map["boundary"]
    assert "verify evidence" in evidence_map["boundary"]
    assert "publish public evidence" in evidence_map["boundary"]
    assert "expose storage keys" in evidence_map["boundary"]
    assert "issue credentials" in evidence_map["boundary"]
    assert "Trust Passport entries" in evidence_map["boundary"]
    assert "private/evidence/node-evidence-ready.pdf" not in str(evidence_map)
    assert "private/evidence/node-evidence-public.pdf" not in str(evidence_map)

    flat = {item["node"]["name"]: item for item in evidence_map["flat_nodes"]}
    assert flat["Node Evidence Authority School"]["evidence_authority_status"] == (
        "domain_root"
    )
    assert flat["Verification Desk"]["evidence_authority_status"] == (
        "local_evidence_authority_ready"
    )
    assert flat["Verification Desk"]["ready_for_local_evidence_authority"] is True
    assert flat["Verification Desk"]["local_member_count"] == 2
    assert flat["Verification Desk"]["local_issuer_count"] == 1
    assert flat["Verification Desk"]["local_policy_count"] == 1
    assert flat["Verification Desk"]["review_record_count"] == 1
    assert flat["Verification Desk"]["evidence_record_count"] == 1
    assert flat["Verification Desk"]["signal_count"] == 2
    assert flat["Public Testimony Desk"]["evidence_authority_status"] == (
        "public_evidence_review_needed"
    )
    assert flat["Public Testimony Desk"]["admin_action_route_hint"].endswith(
        "/record-privacy-map"
    )
    assert flat["Public Testimony Desk"]["public_evidence_status"] == (
        "not_published_in_this_slice"
    )
    assert flat["Welfare Witness Circle"]["evidence_authority_status"] == (
        "needs_local_evidence_issuer"
    )
    assert flat["Science Department"]["evidence_authority_status"] == (
        "needs_evidence_policy"
    )
    assert flat["Alumni Evidence Desk"]["evidence_authority_status"] == (
        "needs_evidence_signal"
    )
    assert flat["Alumni Evidence Desk"]["credential_status"] == (
        "not_issued_in_this_slice"
    )
    assert flat["Alumni Evidence Desk"]["trust_passport_status"] == (
        "not_written_in_this_slice"
    )
    assert flat["Alumni Evidence Desk"]["storage_key_status"] == (
        "not_exposed_in_this_slice"
    )
    assert flat["Alumni Evidence Desk"]["verification_status"] == (
        "not_approved_in_this_slice"
    )

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_evidence_authority_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-evidence-visible-member@example.com")
    outsider = _seed_user(3, "node-evidence-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Evidence Member School",
                "display_name": "Node Evidence Member School",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Evidence Desk",
                "parent_node_id": root_node_id,
                "node_type": "department",
                "node_kind": "evidence_department",
                "visibility_policy": "members",
            },
        )
        assert branch.status_code == 201, branch.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(
            f"/community-domains/{domain_id}/node-evidence-authority-map"
        )
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(
            f"/community-domains/{domain_id}/node-evidence-authority-map"
        )
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    evidence_map = member_map.json()["node_evidence_authority_map"]
    assert evidence_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert evidence_map["counts"]["nodes"] == 2
    assert evidence_map["counts"]["non_root_nodes"] == 1
    assert evidence_map["counts"]["active_node_memberships"] is None
    assert evidence_map["counts"]["active_policies"] is None
    assert evidence_map["counts"]["review_records"] is None
    assert evidence_map["counts"]["active_evidence_records"] is None
    assert evidence_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_evidence_authority",
        "label": "Ask a Community Domain admin to review evidence authority",
        "route_hint": None,
        "requires_admin": True,
    }

    flat = {item["node"]["name"]: item for item in evidence_map["flat_nodes"]}
    assert flat["Primary Evidence Desk"]["evidence_authority_status"] == (
        "needs_local_evidence_issuer"
    )
    assert flat["Primary Evidence Desk"]["local_member_count"] is None
    assert flat["Primary Evidence Desk"]["local_issuer_count"] is None
    assert flat["Primary Evidence Desk"]["local_policy_count"] is None
    assert flat["Primary Evidence Desk"]["review_record_count"] is None
    assert flat["Primary Evidence Desk"]["evidence_record_count"] is None
    assert flat["Primary Evidence Desk"]["signal_count"] is None
    assert flat["Primary Evidence Desk"]["admin_action_route_hint"] is None
    assert flat["Primary Evidence Desk"]["storage_key_status"] == (
        "not_exposed_in_this_slice"
    )
    assert "verify evidence" in evidence_map["boundary"]
    assert "issue credentials" in evidence_map["boundary"]
    assert "private member activity" in evidence_map["boundary"]


def test_node_communication_map_projects_local_notice_readiness_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    ready_admin = _seed_user(2, "node-communication-ready-admin@example.com")
    ready_member = _seed_user(3, "node-communication-ready-member@example.com")
    public_admin = _seed_user(4, "node-communication-public-admin@example.com")
    public_member = _seed_user(5, "node-communication-public-member@example.com")
    no_admin_member = _seed_user(6, "node-communication-no-admin-member@example.com")
    audience_admin = _seed_user(7, "node-communication-audience-admin@example.com")
    policy_admin = _seed_user(8, "node-communication-policy-admin@example.com")
    policy_member = _seed_user(9, "node-communication-policy-member@example.com")
    signal_admin = _seed_user(10, "node-communication-signal-admin@example.com")
    signal_member = _seed_user(11, "node-communication-signal-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Communication School",
                "display_name": "Node Communication School",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        node_specs = [
            ("Notice Desk", "department", "notice_department", "members"),
            ("Public Notice Desk", "department", "public_notice_department", "public"),
            ("Parent Notice Circle", "committee", "parent_notice_circle", "members"),
            ("Emergency Desk", "department", "emergency_notice_department", "members"),
            ("Class Notice Desk", "department", "class_notice_department", "members"),
            ("Alumni Notice Desk", "department", "alumni_notice_department", "members"),
        ]
        node_ids: dict[str, int] = {}
        for name, node_type, node_kind, visibility in node_specs:
            node = client.post(
                f"/community-domains/{domain_id}/nodes",
                json={
                    "name": name,
                    "parent_node_id": root_node_id,
                    "node_type": node_type,
                    "node_kind": node_kind,
                    "visibility_policy": visibility,
                },
            )
            assert node.status_code == 201, node.text
            node_ids[name] = node.json()["node"]["id"]

        users = [
            ready_admin,
            ready_member,
            public_admin,
            public_member,
            no_admin_member,
            audience_admin,
            policy_admin,
            policy_member,
            signal_admin,
            signal_member,
        ]
        for user in users:
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (node_ids["Notice Desk"], ready_admin.id, "department_admin"),
            (node_ids["Notice Desk"], ready_member.id, "member"),
            (node_ids["Public Notice Desk"], public_admin.id, "department_admin"),
            (node_ids["Public Notice Desk"], public_member.id, "member"),
            (node_ids["Parent Notice Circle"], no_admin_member.id, "member"),
            (node_ids["Emergency Desk"], audience_admin.id, "department_admin"),
            (node_ids["Class Notice Desk"], policy_admin.id, "department_admin"),
            (node_ids["Class Notice Desk"], policy_member.id, "member"),
            (node_ids["Alumni Notice Desk"], signal_admin.id, "department_admin"),
            (node_ids["Alumni Notice Desk"], signal_member.id, "member"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        for name, suffix in (
            ("Notice Desk", "ready"),
            ("Public Notice Desk", "public"),
            ("Alumni Notice Desk", "signal"),
        ):
            policy = client.post(
                f"/community-domains/{domain_id}/policies",
                json={
                    "policy_key": f"node-communication-{suffix}-policy",
                    "action_key": "notice.publish",
                    "community_node_id": node_ids[name],
                    "scope_type": "node",
                    "review_mode": "node_admin_review",
                    "required_role": "department_admin",
                },
            )
            assert policy.status_code == 201, policy.text

        for name, suffix in (
            ("Notice Desk", "ready"),
            ("Public Notice Desk", "public"),
        ):
            review = client.post(
                f"/community-domains/{domain_id}/action-reviews",
                json={
                    "action_key": "notice.publish",
                    "community_node_id": node_ids[name],
                    "request_note": f"Review local notice readiness for {suffix}.",
                    "payload": {"claim": f"{suffix} notice posture"},
                },
            )
            assert review.status_code == 201, review.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/node-communication-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    communication_map = payload["node_communication_map"]
    assert communication_map["editable"] is False
    assert communication_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert communication_map["counts"] == {
        "nodes": 7,
        "non_root_nodes": 6,
        "active_node_memberships": 10,
        "active_policies": 3,
        "review_records": 2,
        "local_communication_ready": 1,
        "public_notice_review_needed": 1,
        "needs_local_communicator": 1,
        "needs_audience_signal": 1,
        "needs_communication_policy": 1,
        "needs_notice_review_signal": 1,
        "inactive": 0,
        "notices_created": 0,
        "notifications_sent": 0,
        "announcements_published": 0,
        "emergency_notices_sent": 0,
        "member_lists_exposed": 0,
    }
    assert communication_map["status_counts"] == {
        "local_communication_ready": 1,
        "public_notice_review_needed": 1,
        "needs_local_communicator": 1,
        "needs_audience_signal": 1,
        "needs_communication_policy": 1,
        "needs_notice_review_signal": 1,
    }
    assert communication_map["primary_next_action"] == {
        "action_key": "review_public_notice_exposure",
        "label": "Review public notice exposure",
        "route_hint": f"/community-domains/{domain_id}/record-privacy-map",
        "requires_admin": True,
    }
    assert "read-only local communication planning" in communication_map["boundary"]
    assert "create notices" in communication_map["boundary"]
    assert "send notifications" in communication_map["boundary"]
    assert "publish announcements" in communication_map["boundary"]
    assert "schedule meetings" in communication_map["boundary"]
    assert "emergency notices" in communication_map["boundary"]
    assert "expose member lists" in communication_map["boundary"]

    flat = {item["node"]["name"]: item for item in communication_map["flat_nodes"]}
    assert flat["Node Communication School"]["communication_status"] == "domain_root"
    assert flat["Notice Desk"]["communication_status"] == "local_communication_ready"
    assert flat["Notice Desk"]["ready_for_local_communication"] is True
    assert flat["Notice Desk"]["local_member_count"] == 2
    assert flat["Notice Desk"]["local_communicator_count"] == 1
    assert flat["Notice Desk"]["local_policy_count"] == 1
    assert flat["Notice Desk"]["review_record_count"] == 1
    assert flat["Notice Desk"]["notice_status"] == "not_created_in_this_slice"
    assert flat["Notice Desk"]["notification_status"] == "not_sent_in_this_slice"
    assert flat["Notice Desk"]["announcement_status"] == (
        "not_published_in_this_slice"
    )
    assert flat["Public Notice Desk"]["communication_status"] == (
        "public_notice_review_needed"
    )
    assert flat["Public Notice Desk"]["admin_action_route_hint"].endswith(
        "/record-privacy-map"
    )
    assert flat["Parent Notice Circle"]["communication_status"] == (
        "needs_local_communicator"
    )
    assert flat["Emergency Desk"]["communication_status"] == "needs_audience_signal"
    assert flat["Class Notice Desk"]["communication_status"] == (
        "needs_communication_policy"
    )
    assert flat["Alumni Notice Desk"]["communication_status"] == (
        "needs_notice_review_signal"
    )
    assert flat["Alumni Notice Desk"]["emergency_notice_status"] == (
        "not_sent_in_this_slice"
    )
    assert flat["Alumni Notice Desk"]["member_list_status"] == (
        "not_exposed_in_this_slice"
    )

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_communication_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-communication-visible-member@example.com")
    outsider = _seed_user(3, "node-communication-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Communication Member School",
                "display_name": "Node Communication Member School",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Notice Desk",
                "parent_node_id": root_node_id,
                "node_type": "department",
                "node_kind": "notice_department",
                "visibility_policy": "members",
            },
        )
        assert branch.status_code == 201, branch.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(
            f"/community-domains/{domain_id}/node-communication-map"
        )
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(
            f"/community-domains/{domain_id}/node-communication-map"
        )
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    communication_map = member_map.json()["node_communication_map"]
    assert communication_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert communication_map["counts"]["nodes"] == 2
    assert communication_map["counts"]["non_root_nodes"] == 1
    assert communication_map["counts"]["active_node_memberships"] is None
    assert communication_map["counts"]["active_policies"] is None
    assert communication_map["counts"]["review_records"] is None
    assert communication_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_communication",
        "label": "Ask a Community Domain admin to review local communication",
        "route_hint": None,
        "requires_admin": True,
    }

    flat = {item["node"]["name"]: item for item in communication_map["flat_nodes"]}
    assert flat["Primary Notice Desk"]["communication_status"] == (
        "needs_local_communicator"
    )
    assert flat["Primary Notice Desk"]["local_member_count"] is None
    assert flat["Primary Notice Desk"]["local_communicator_count"] is None
    assert flat["Primary Notice Desk"]["local_policy_count"] is None
    assert flat["Primary Notice Desk"]["review_record_count"] is None
    assert flat["Primary Notice Desk"]["admin_action_route_hint"] is None
    assert flat["Primary Notice Desk"]["notification_status"] == (
        "not_sent_in_this_slice"
    )
    assert "send notifications" in communication_map["boundary"]
    assert "expose member lists" in communication_map["boundary"]
    assert "private member activity" in communication_map["boundary"]


def test_node_vault_map_projects_local_document_readiness_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    ready_admin = _seed_user(2, "node-vault-ready-admin@example.com")
    ready_member = _seed_user(3, "node-vault-ready-member@example.com")
    public_admin = _seed_user(4, "node-vault-public-admin@example.com")
    public_member = _seed_user(5, "node-vault-public-member@example.com")
    no_admin_member = _seed_user(6, "node-vault-no-admin-member@example.com")
    audience_admin = _seed_user(7, "node-vault-audience-admin@example.com")
    policy_admin = _seed_user(8, "node-vault-policy-admin@example.com")
    policy_member = _seed_user(9, "node-vault-policy-member@example.com")
    signal_admin = _seed_user(10, "node-vault-signal-admin@example.com")
    signal_member = _seed_user(11, "node-vault-signal-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Vault School",
                "display_name": "Node Vault School",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        node_specs = [
            ("Records Vault", "department", "document_vault", "members"),
            ("Public Archive Vault", "department", "public_document_vault", "public"),
            ("Welfare Documents", "committee", "welfare_documents", "members"),
            ("Emergency Documents", "department", "emergency_documents", "members"),
            ("Class Documents", "department", "class_documents", "members"),
            ("Alumni Documents", "department", "alumni_documents", "members"),
        ]
        node_ids: dict[str, int] = {}
        for name, node_type, node_kind, visibility in node_specs:
            node = client.post(
                f"/community-domains/{domain_id}/nodes",
                json={
                    "name": name,
                    "parent_node_id": root_node_id,
                    "node_type": node_type,
                    "node_kind": node_kind,
                    "visibility_policy": visibility,
                },
            )
            assert node.status_code == 201, node.text
            node_ids[name] = node.json()["node"]["id"]

        users = [
            ready_admin,
            ready_member,
            public_admin,
            public_member,
            no_admin_member,
            audience_admin,
            policy_admin,
            policy_member,
            signal_admin,
            signal_member,
        ]
        for user in users:
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (node_ids["Records Vault"], ready_admin.id, "department_admin"),
            (node_ids["Records Vault"], ready_member.id, "member"),
            (node_ids["Public Archive Vault"], public_admin.id, "department_admin"),
            (node_ids["Public Archive Vault"], public_member.id, "member"),
            (node_ids["Welfare Documents"], no_admin_member.id, "member"),
            (node_ids["Emergency Documents"], audience_admin.id, "department_admin"),
            (node_ids["Class Documents"], policy_admin.id, "department_admin"),
            (node_ids["Class Documents"], policy_member.id, "member"),
            (node_ids["Alumni Documents"], signal_admin.id, "department_admin"),
            (node_ids["Alumni Documents"], signal_member.id, "member"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        for name, suffix in (
            ("Records Vault", "ready"),
            ("Public Archive Vault", "public"),
            ("Alumni Documents", "signal"),
        ):
            policy = client.post(
                f"/community-domains/{domain_id}/policies",
                json={
                    "policy_key": f"node-vault-{suffix}-policy",
                    "action_key": "vault.share",
                    "community_node_id": node_ids[name],
                    "scope_type": "node",
                    "review_mode": "node_admin_review",
                    "required_role": "department_admin",
                },
            )
            assert policy.status_code == 201, policy.text

        review_ids: dict[str, int] = {}
        for name, suffix in (
            ("Records Vault", "ready"),
            ("Public Archive Vault", "public"),
        ):
            review = client.post(
                f"/community-domains/{domain_id}/action-reviews",
                json={
                    "action_key": "vault.share",
                    "community_node_id": node_ids[name],
                    "request_note": f"Review local document vault readiness for {suffix}.",
                    "payload": {"claim": f"{suffix} document vault posture"},
                },
            )
            assert review.status_code == 201, review.text
            review_ids[name] = review.json()["action_review"]["id"]

        for name, suffix in (
            ("Records Vault", "ready"),
            ("Public Archive Vault", "public"),
        ):
            evidence = client.post(
                f"/community-domains/{domain_id}/action-reviews/{review_ids[name]}/evidence",
                json={
                    "evidence_type": "document",
                    "title": f"Node vault {suffix} document extract",
                    "file_name": f"node-vault-{suffix}.pdf",
                    "storage_key": f"private/evidence/node-vault-{suffix}.pdf",
                },
            )
            assert evidence.status_code == 201, evidence.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/node-vault-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    vault_map = payload["node_vault_map"]
    assert vault_map["editable"] is False
    assert vault_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert vault_map["counts"] == {
        "nodes": 7,
        "non_root_nodes": 6,
        "active_node_memberships": 10,
        "active_policies": 3,
        "review_records": 2,
        "active_evidence_records": 2,
        "local_vault_ready": 1,
        "public_vault_review_needed": 1,
        "needs_vault_steward": 1,
        "needs_vault_audience": 1,
        "needs_vault_policy": 1,
        "needs_document_signal": 1,
        "inactive": 0,
        "files_uploaded": 0,
        "files_downloaded": 0,
        "vault_links_created": 0,
        "storage_keys_exposed": 0,
        "member_lists_exposed": 0,
        "external_readers_connected": 0,
    }
    assert vault_map["status_counts"] == {
        "local_vault_ready": 1,
        "public_vault_review_needed": 1,
        "needs_vault_steward": 1,
        "needs_vault_audience": 1,
        "needs_vault_policy": 1,
        "needs_document_signal": 1,
    }
    assert vault_map["primary_next_action"] == {
        "action_key": "review_public_vault_exposure",
        "label": "Review public vault exposure",
        "route_hint": f"/community-domains/{domain_id}/record-privacy-map",
        "requires_admin": True,
    }
    assert "read-only local vault planning" in vault_map["boundary"]
    assert "upload files" in vault_map["boundary"]
    assert "download files" in vault_map["boundary"]
    assert "create vault links" in vault_map["boundary"]
    assert "expose storage keys" in vault_map["boundary"]
    assert "expose member lists" in vault_map["boundary"]
    assert "Trust Passport entries" in vault_map["boundary"]
    assert "private/evidence" not in str(vault_map)

    flat = {item["node"]["name"]: item for item in vault_map["flat_nodes"]}
    assert flat["Node Vault School"]["vault_status"] == "domain_root"
    assert flat["Records Vault"]["vault_status"] == "local_vault_ready"
    assert flat["Records Vault"]["ready_for_local_vault"] is True
    assert flat["Records Vault"]["local_member_count"] == 2
    assert flat["Records Vault"]["local_steward_count"] == 1
    assert flat["Records Vault"]["local_policy_count"] == 1
    assert flat["Records Vault"]["review_record_count"] == 1
    assert flat["Records Vault"]["evidence_record_count"] == 1
    assert flat["Records Vault"]["signal_count"] == 2
    assert flat["Records Vault"]["file_upload_status"] == "not_uploaded_in_this_slice"
    assert flat["Records Vault"]["file_download_status"] == (
        "not_downloaded_in_this_slice"
    )
    assert flat["Records Vault"]["vault_link_status"] == "not_created_in_this_slice"
    assert flat["Public Archive Vault"]["vault_status"] == (
        "public_vault_review_needed"
    )
    assert flat["Public Archive Vault"]["admin_action_route_hint"].endswith(
        "/record-privacy-map"
    )
    assert flat["Welfare Documents"]["vault_status"] == "needs_vault_steward"
    assert flat["Emergency Documents"]["vault_status"] == "needs_vault_audience"
    assert flat["Class Documents"]["vault_status"] == "needs_vault_policy"
    assert flat["Alumni Documents"]["vault_status"] == "needs_document_signal"
    assert flat["Alumni Documents"]["storage_key_status"] == (
        "not_exposed_in_this_slice"
    )
    assert flat["Alumni Documents"]["member_list_status"] == (
        "not_exposed_in_this_slice"
    )
    assert flat["Alumni Documents"]["external_reader_status"] == (
        "not_connected_in_this_slice"
    )

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_vault_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-vault-visible-member@example.com")
    outsider = _seed_user(3, "node-vault-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Vault Member School",
                "display_name": "Node Vault Member School",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Vault",
                "parent_node_id": root_node_id,
                "node_type": "department",
                "node_kind": "document_vault",
                "visibility_policy": "members",
            },
        )
        assert branch.status_code == 201, branch.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(f"/community-domains/{domain_id}/node-vault-map")
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(f"/community-domains/{domain_id}/node-vault-map")
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    vault_map = member_map.json()["node_vault_map"]
    assert vault_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert vault_map["counts"]["nodes"] == 2
    assert vault_map["counts"]["non_root_nodes"] == 1
    assert vault_map["counts"]["active_node_memberships"] is None
    assert vault_map["counts"]["active_policies"] is None
    assert vault_map["counts"]["review_records"] is None
    assert vault_map["counts"]["active_evidence_records"] is None
    assert vault_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_local_vault",
        "label": "Ask a Community Domain admin to review local vault readiness",
        "route_hint": None,
        "requires_admin": True,
    }

    flat = {item["node"]["name"]: item for item in vault_map["flat_nodes"]}
    assert flat["Primary Vault"]["vault_status"] == "needs_vault_steward"
    assert flat["Primary Vault"]["local_member_count"] is None
    assert flat["Primary Vault"]["local_steward_count"] is None
    assert flat["Primary Vault"]["local_policy_count"] is None
    assert flat["Primary Vault"]["review_record_count"] is None
    assert flat["Primary Vault"]["evidence_record_count"] is None
    assert flat["Primary Vault"]["signal_count"] is None
    assert flat["Primary Vault"]["admin_action_route_hint"] is None
    assert flat["Primary Vault"]["storage_key_status"] == "not_exposed_in_this_slice"
    assert "download files" in vault_map["boundary"]
    assert "create vault links" in vault_map["boundary"]
    assert "private member activity" in vault_map["boundary"]


def test_node_scheduled_activity_map_projects_local_schedule_readiness_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    ready_admin = _seed_user(2, "node-schedule-ready-admin@example.com")
    ready_member = _seed_user(3, "node-schedule-ready-member@example.com")
    public_admin = _seed_user(4, "node-schedule-public-admin@example.com")
    public_member = _seed_user(5, "node-schedule-public-member@example.com")
    no_admin_member = _seed_user(6, "node-schedule-no-admin-member@example.com")
    audience_admin = _seed_user(7, "node-schedule-audience-admin@example.com")
    policy_admin = _seed_user(8, "node-schedule-policy-admin@example.com")
    policy_member = _seed_user(9, "node-schedule-policy-member@example.com")
    signal_admin = _seed_user(10, "node-schedule-signal-admin@example.com")
    signal_member = _seed_user(11, "node-schedule-signal-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Schedule School",
                "display_name": "Node Schedule School",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        node_specs = [
            ("Meeting Desk", "department", "meeting_department", "members"),
            ("Public Events Desk", "department", "public_events_department", "public"),
            ("Welfare Meetings", "committee", "welfare_meeting_circle", "members"),
            ("Emergency Schedule", "department", "emergency_schedule", "members"),
            ("Class Schedule", "department", "class_schedule", "members"),
            ("Alumni Calendar", "department", "alumni_calendar", "members"),
        ]
        node_ids: dict[str, int] = {}
        for name, node_type, node_kind, visibility in node_specs:
            node = client.post(
                f"/community-domains/{domain_id}/nodes",
                json={
                    "name": name,
                    "parent_node_id": root_node_id,
                    "node_type": node_type,
                    "node_kind": node_kind,
                    "visibility_policy": visibility,
                },
            )
            assert node.status_code == 201, node.text
            node_ids[name] = node.json()["node"]["id"]

        users = [
            ready_admin,
            ready_member,
            public_admin,
            public_member,
            no_admin_member,
            audience_admin,
            policy_admin,
            policy_member,
            signal_admin,
            signal_member,
        ]
        for user in users:
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (node_ids["Meeting Desk"], ready_admin.id, "department_admin"),
            (node_ids["Meeting Desk"], ready_member.id, "member"),
            (node_ids["Public Events Desk"], public_admin.id, "department_admin"),
            (node_ids["Public Events Desk"], public_member.id, "member"),
            (node_ids["Welfare Meetings"], no_admin_member.id, "member"),
            (node_ids["Emergency Schedule"], audience_admin.id, "department_admin"),
            (node_ids["Class Schedule"], policy_admin.id, "department_admin"),
            (node_ids["Class Schedule"], policy_member.id, "member"),
            (node_ids["Alumni Calendar"], signal_admin.id, "department_admin"),
            (node_ids["Alumni Calendar"], signal_member.id, "member"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        for name, suffix in (
            ("Meeting Desk", "ready"),
            ("Public Events Desk", "public"),
            ("Alumni Calendar", "signal"),
        ):
            policy = client.post(
                f"/community-domains/{domain_id}/policies",
                json={
                    "policy_key": f"node-schedule-{suffix}-policy",
                    "action_key": "activity.schedule",
                    "community_node_id": node_ids[name],
                    "scope_type": "node",
                    "review_mode": "node_admin_review",
                    "required_role": "department_admin",
                },
            )
            assert policy.status_code == 201, policy.text

        for name, suffix in (
            ("Meeting Desk", "ready"),
            ("Public Events Desk", "public"),
        ):
            review = client.post(
                f"/community-domains/{domain_id}/action-reviews",
                json={
                    "action_key": "activity.schedule",
                    "community_node_id": node_ids[name],
                    "request_note": f"Review local schedule readiness for {suffix}.",
                    "payload": {"claim": f"{suffix} schedule posture"},
                },
            )
            assert review.status_code == 201, review.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(
            f"/community-domains/{domain_id}/node-scheduled-activity-map"
        )
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    schedule_map = payload["node_scheduled_activity_map"]
    assert schedule_map["editable"] is False
    assert schedule_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert schedule_map["counts"] == {
        "nodes": 7,
        "non_root_nodes": 6,
        "active_node_memberships": 10,
        "active_policies": 3,
        "review_records": 2,
        "local_schedule_ready": 1,
        "public_schedule_review_needed": 1,
        "needs_activity_coordinator": 1,
        "needs_schedule_audience": 1,
        "needs_schedule_policy": 1,
        "needs_attendance_signal": 1,
        "inactive": 0,
        "events_created": 0,
        "meetings_created": 0,
        "calendar_entries_created": 0,
        "attendance_records": 0,
        "reminders_sent": 0,
        "notifications_sent": 0,
        "payment_instructions_created": 0,
    }
    assert schedule_map["status_counts"] == {
        "local_schedule_ready": 1,
        "public_schedule_review_needed": 1,
        "needs_activity_coordinator": 1,
        "needs_schedule_audience": 1,
        "needs_schedule_policy": 1,
        "needs_attendance_signal": 1,
    }
    assert schedule_map["primary_next_action"] == {
        "action_key": "review_public_schedule_exposure",
        "label": "Review public schedule exposure",
        "route_hint": f"/community-domains/{domain_id}/record-privacy-map",
        "requires_admin": True,
    }
    assert "read-only local schedule planning" in schedule_map["boundary"]
    assert "create events" in schedule_map["boundary"]
    assert "create meetings" in schedule_map["boundary"]
    assert "create calendar entries" in schedule_map["boundary"]
    assert "record attendance" in schedule_map["boundary"]
    assert "send reminders" in schedule_map["boundary"]
    assert "payment instructions" in schedule_map["boundary"]
    assert "Trust Passport entries" in schedule_map["boundary"]

    flat = {
        item["node"]["name"]: item for item in schedule_map["flat_nodes"]
    }
    assert flat["Node Schedule School"]["schedule_status"] == "domain_root"
    assert flat["Meeting Desk"]["schedule_status"] == "local_schedule_ready"
    assert flat["Meeting Desk"]["ready_for_local_schedule"] is True
    assert flat["Meeting Desk"]["local_member_count"] == 2
    assert flat["Meeting Desk"]["local_coordinator_count"] == 1
    assert flat["Meeting Desk"]["local_policy_count"] == 1
    assert flat["Meeting Desk"]["review_record_count"] == 1
    assert flat["Meeting Desk"]["meeting_status"] == "not_created_in_this_slice"
    assert flat["Meeting Desk"]["calendar_status"] == "not_created_in_this_slice"
    assert flat["Meeting Desk"]["attendance_status"] == "not_recorded_in_this_slice"
    assert flat["Public Events Desk"]["schedule_status"] == (
        "public_schedule_review_needed"
    )
    assert flat["Public Events Desk"]["admin_action_route_hint"].endswith(
        "/record-privacy-map"
    )
    assert flat["Welfare Meetings"]["schedule_status"] == (
        "needs_activity_coordinator"
    )
    assert flat["Emergency Schedule"]["schedule_status"] == (
        "needs_schedule_audience"
    )
    assert flat["Class Schedule"]["schedule_status"] == "needs_schedule_policy"
    assert flat["Alumni Calendar"]["schedule_status"] == "needs_attendance_signal"
    assert flat["Alumni Calendar"]["payment_status"] == (
        "not_connected_in_this_slice"
    )
    assert flat["Alumni Calendar"]["notification_status"] == (
        "not_sent_in_this_slice"
    )

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_scheduled_activity_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-schedule-visible-member@example.com")
    outsider = _seed_user(3, "node-schedule-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Schedule Member School",
                "display_name": "Node Schedule Member School",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Schedule Desk",
                "parent_node_id": root_node_id,
                "node_type": "department",
                "node_kind": "meeting_department",
                "visibility_policy": "members",
            },
        )
        assert branch.status_code == 201, branch.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(
            f"/community-domains/{domain_id}/node-scheduled-activity-map"
        )
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(
            f"/community-domains/{domain_id}/node-scheduled-activity-map"
        )
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    schedule_map = member_map.json()["node_scheduled_activity_map"]
    assert schedule_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert schedule_map["counts"]["nodes"] == 2
    assert schedule_map["counts"]["non_root_nodes"] == 1
    assert schedule_map["counts"]["active_node_memberships"] is None
    assert schedule_map["counts"]["active_policies"] is None
    assert schedule_map["counts"]["review_records"] is None
    assert schedule_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_schedules",
        "label": "Ask a Community Domain admin to review local scheduled activity",
        "route_hint": None,
        "requires_admin": True,
    }

    flat = {
        item["node"]["name"]: item for item in schedule_map["flat_nodes"]
    }
    assert flat["Primary Schedule Desk"]["schedule_status"] == (
        "needs_activity_coordinator"
    )
    assert flat["Primary Schedule Desk"]["local_member_count"] is None
    assert flat["Primary Schedule Desk"]["local_coordinator_count"] is None
    assert flat["Primary Schedule Desk"]["local_policy_count"] is None
    assert flat["Primary Schedule Desk"]["review_record_count"] is None
    assert flat["Primary Schedule Desk"]["admin_action_route_hint"] is None
    assert flat["Primary Schedule Desk"]["attendance_status"] == (
        "not_recorded_in_this_slice"
    )
    assert "create calendar entries" in schedule_map["boundary"]
    assert "record attendance" in schedule_map["boundary"]
    assert "private member activity" in schedule_map["boundary"]


def test_node_paid_activity_map_projects_local_payment_readiness_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    ready_admin = _seed_user(2, "node-paid-ready-admin@example.com")
    ready_member = _seed_user(3, "node-paid-ready-member@example.com")
    public_admin = _seed_user(4, "node-paid-public-admin@example.com")
    public_member = _seed_user(5, "node-paid-public-member@example.com")
    no_admin_member = _seed_user(6, "node-paid-no-admin-member@example.com")
    audience_admin = _seed_user(7, "node-paid-audience-admin@example.com")
    policy_admin = _seed_user(8, "node-paid-policy-admin@example.com")
    policy_member = _seed_user(9, "node-paid-policy-member@example.com")
    signal_admin = _seed_user(10, "node-paid-signal-admin@example.com")
    signal_member = _seed_user(11, "node-paid-signal-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Paid Activity Union",
                "display_name": "Node Paid Activity Union",
                "domain_type": "union_professional_body",
                "template_key": "union_professional_body",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        node_specs = [
            ("Dues Desk", "department", "dues_department", "members"),
            ("Public Fundraising Desk", "committee", "public_fundraising", "public"),
            ("Welfare Contributions", "committee", "welfare_contributions", "members"),
            ("Travel Fees", "department", "travel_fees", "members"),
            ("Ticket Desk", "department", "ticket_desk", "members"),
            ("ROSCA Contributions", "committee", "rosca_contributions", "members"),
        ]
        node_ids: dict[str, int] = {}
        for name, node_type, node_kind, visibility in node_specs:
            node = client.post(
                f"/community-domains/{domain_id}/nodes",
                json={
                    "name": name,
                    "parent_node_id": root_node_id,
                    "node_type": node_type,
                    "node_kind": node_kind,
                    "visibility_policy": visibility,
                },
            )
            assert node.status_code == 201, node.text
            node_ids[name] = node.json()["node"]["id"]

        users = [
            ready_admin,
            ready_member,
            public_admin,
            public_member,
            no_admin_member,
            audience_admin,
            policy_admin,
            policy_member,
            signal_admin,
            signal_member,
        ]
        for user in users:
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": "member"},
            )
            assert added.status_code == 201, added.text

        placements = [
            (node_ids["Dues Desk"], ready_admin.id, "department_admin"),
            (node_ids["Dues Desk"], ready_member.id, "member"),
            (node_ids["Public Fundraising Desk"], public_admin.id, "committee_admin"),
            (node_ids["Public Fundraising Desk"], public_member.id, "member"),
            (node_ids["Welfare Contributions"], no_admin_member.id, "member"),
            (node_ids["Travel Fees"], audience_admin.id, "department_admin"),
            (node_ids["Ticket Desk"], policy_admin.id, "department_admin"),
            (node_ids["Ticket Desk"], policy_member.id, "member"),
            (node_ids["ROSCA Contributions"], signal_admin.id, "committee_admin"),
            (node_ids["ROSCA Contributions"], signal_member.id, "member"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        for name, suffix in (
            ("Dues Desk", "ready"),
            ("Public Fundraising Desk", "public"),
            ("ROSCA Contributions", "signal"),
        ):
            policy = client.post(
                f"/community-domains/{domain_id}/policies",
                json={
                    "policy_key": f"node-paid-activity-{suffix}-policy",
                    "action_key": "paid_activity.collect",
                    "community_node_id": node_ids[name],
                    "scope_type": "node",
                    "review_mode": "node_admin_review",
                    "required_role": "department_admin",
                },
            )
            assert policy.status_code == 201, policy.text

        for name, suffix in (
            ("Dues Desk", "ready"),
            ("Public Fundraising Desk", "public"),
        ):
            review = client.post(
                f"/community-domains/{domain_id}/action-reviews",
                json={
                    "action_key": "paid_activity.collect",
                    "community_node_id": node_ids[name],
                    "request_note": f"Review local paid activity readiness for {suffix}.",
                    "payload": {"claim": f"{suffix} paid activity posture"},
                },
            )
            assert review.status_code == 201, review.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/node-paid-activity-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    paid_map = payload["node_paid_activity_map"]
    assert paid_map["editable"] is False
    assert paid_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert paid_map["counts"] == {
        "nodes": 7,
        "non_root_nodes": 6,
        "active_node_memberships": 10,
        "active_policies": 3,
        "review_records": 2,
        "local_paid_activity_ready": 1,
        "public_payment_review_needed": 1,
        "needs_payment_steward": 1,
        "needs_payer_audience": 1,
        "needs_paid_activity_policy": 1,
        "needs_finance_review_signal": 1,
        "inactive": 0,
        "dues_created": 0,
        "levies_created": 0,
        "tickets_created": 0,
        "travel_fees_created": 0,
        "contributions_created": 0,
        "invoices_created": 0,
        "payment_instructions_created": 0,
        "receipts_recorded": 0,
        "bank_matches_created": 0,
        "ledger_entries_written": 0,
    }
    assert paid_map["status_counts"] == {
        "local_paid_activity_ready": 1,
        "public_payment_review_needed": 1,
        "needs_payment_steward": 1,
        "needs_payer_audience": 1,
        "needs_paid_activity_policy": 1,
        "needs_finance_review_signal": 1,
    }
    assert paid_map["primary_next_action"] == {
        "action_key": "review_public_payment_exposure",
        "label": "Review public payment exposure",
        "route_hint": f"/community-domains/{domain_id}/record-privacy-map",
        "requires_admin": True,
    }
    assert "read-only local payment readiness planning" in paid_map["boundary"]
    assert "create dues" in paid_map["boundary"]
    assert "create tickets" in paid_map["boundary"]
    assert "create travel fees" in paid_map["boundary"]
    assert "create contributions" in paid_map["boundary"]
    assert "create payment instructions" in paid_map["boundary"]
    assert "write ledger entries" in paid_map["boundary"]
    assert "move money" in paid_map["boundary"]
    assert "Trust Passport entries" in paid_map["boundary"]

    flat = {item["node"]["name"]: item for item in paid_map["flat_nodes"]}
    assert flat["Node Paid Activity Union"]["paid_activity_status"] == "domain_root"
    assert flat["Dues Desk"]["paid_activity_status"] == "local_paid_activity_ready"
    assert flat["Dues Desk"]["ready_for_local_paid_activity"] is True
    assert flat["Dues Desk"]["local_member_count"] == 2
    assert flat["Dues Desk"]["local_steward_count"] == 1
    assert flat["Dues Desk"]["local_policy_count"] == 1
    assert flat["Dues Desk"]["review_record_count"] == 1
    assert flat["Dues Desk"]["dues_status"] == "not_created_in_this_slice"
    assert flat["Dues Desk"]["payment_instruction_status"] == (
        "not_created_in_this_slice"
    )
    assert flat["Dues Desk"]["ledger_status"] == "not_written_in_this_slice"
    assert flat["Public Fundraising Desk"]["paid_activity_status"] == (
        "public_payment_review_needed"
    )
    assert flat["Public Fundraising Desk"]["admin_action_route_hint"].endswith(
        "/record-privacy-map"
    )
    assert flat["Welfare Contributions"]["paid_activity_status"] == (
        "needs_payment_steward"
    )
    assert flat["Travel Fees"]["paid_activity_status"] == "needs_payer_audience"
    assert flat["Ticket Desk"]["paid_activity_status"] == (
        "needs_paid_activity_policy"
    )
    assert flat["ROSCA Contributions"]["paid_activity_status"] == (
        "needs_finance_review_signal"
    )
    assert flat["ROSCA Contributions"]["contribution_status"] == (
        "not_created_in_this_slice"
    )
    assert flat["ROSCA Contributions"]["bank_match_status"] == (
        "not_connected_in_this_slice"
    )

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_node_paid_activity_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "node-paid-visible-member@example.com")
    outsider = _seed_user(3, "node-paid-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Node Paid Member Union",
                "display_name": "Node Paid Member Union",
                "domain_type": "union_professional_body",
                "template_key": "union_professional_body",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Dues Desk",
                "parent_node_id": root_node_id,
                "node_type": "department",
                "node_kind": "dues_department",
                "visibility_policy": "members",
            },
        )
        assert branch.status_code == 201, branch.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(f"/community-domains/{domain_id}/node-paid-activity-map")
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(
            f"/community-domains/{domain_id}/node-paid-activity-map"
        )
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    paid_map = member_map.json()["node_paid_activity_map"]
    assert paid_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert paid_map["counts"]["nodes"] == 2
    assert paid_map["counts"]["non_root_nodes"] == 1
    assert paid_map["counts"]["active_node_memberships"] is None
    assert paid_map["counts"]["active_policies"] is None
    assert paid_map["counts"]["review_records"] is None
    assert paid_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_paid_activity",
        "label": "Ask a Community Domain admin to review local paid activity",
        "route_hint": None,
        "requires_admin": True,
    }

    flat = {item["node"]["name"]: item for item in paid_map["flat_nodes"]}
    assert flat["Primary Dues Desk"]["paid_activity_status"] == (
        "needs_payment_steward"
    )
    assert flat["Primary Dues Desk"]["local_member_count"] is None
    assert flat["Primary Dues Desk"]["local_steward_count"] is None
    assert flat["Primary Dues Desk"]["local_policy_count"] is None
    assert flat["Primary Dues Desk"]["review_record_count"] is None
    assert flat["Primary Dues Desk"]["admin_action_route_hint"] is None
    assert flat["Primary Dues Desk"]["payment_instruction_status"] == (
        "not_created_in_this_slice"
    )
    assert flat["Primary Dues Desk"]["receipt_status"] == (
        "not_recorded_in_this_slice"
    )
    assert "create payment instructions" in paid_map["boundary"]
    assert "write ledger entries" in paid_map["boundary"]
    assert "private member activity" in paid_map["boundary"]


def test_governance_coverage_projects_recursive_policy_fit_without_writes(
    client: TestClient,
):
    owner = _seed_owner()
    line_admin = _seed_user(2, "governance-line-admin@example.com")
    section_admin = _seed_user(3, "governance-section-admin@example.com")
    branch_admin = _seed_user(4, "governance-branch-admin@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Governance Coverage Market Domain",
                "display_name": "Governance Coverage Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
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

        section = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Phone Accessories Section",
                "parent_node_id": line_id,
                "node_type": "section",
                "node_kind": "market_section",
            },
        )
        assert section.status_code == 201, section.text
        section_id = section.json()["node"]["id"]

        committee = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Welfare Committee",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "market_committee",
            },
        )
        assert committee.status_code == 201, committee.text

        independent = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Independent Branch",
                "parent_node_id": root_node_id,
                "node_type": "branch",
                "node_kind": "market_branch",
                "inherits_parent_policy": False,
            },
        )
        assert independent.status_code == 201, independent.text
        independent_id = independent.json()["node"]["id"]

        for user, role in (
            (line_admin, "domain_admin"),
            (section_admin, "member"),
            (branch_admin, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        placements = [
            (line_id, line_admin.id, "line_admin"),
            (section_id, section_admin.id, "line_admin"),
            (independent_id, branch_admin.id, "branch_admin"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        domain_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "governance-domain-member-review",
                "action_key": "domain_member.upsert",
                "scope_type": "domain",
                "review_mode": "domain_admin_review",
            },
        )
        assert domain_policy.status_code == 201, domain_policy.text

        line_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "governance-line-member-review",
                "action_key": "node_member.upsert",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
            },
        )
        assert line_policy.status_code == 201, line_policy.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "clans": db.query(Clan).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/governance-coverage")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    coverage = payload["governance_coverage"]
    assert coverage["editable"] is False
    assert coverage["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert coverage["counts"] == {
        "nodes": 5,
        "non_root_nodes": 4,
        "active_policies": 2,
        "domain_policies": 1,
        "node_scoped_policies": 1,
        "open_reviews": 0,
        "governed_locally": 1,
        "governed_by_inheritance": 1,
        "needs_local_admin": 1,
        "needs_policy": 1,
        "inactive": 0,
    }
    assert coverage["status_counts"] == {
        "governed_locally": 1,
        "governed_by_inheritance": 1,
        "needs_local_admin": 1,
        "needs_policy": 1,
    }
    assert coverage["primary_next_action"] == {
        "action_key": "assign_local_governance_admins",
        "label": "Assign local governance admins",
        "route_hint": f"/community-domains/{domain_id}/roles",
        "requires_admin": True,
    }
    assert "does not create policy" in coverage["boundary"]
    assert "assign roles" in coverage["boundary"]
    assert "verify legal or institutional authority" in coverage["boundary"]
    assert "private review payloads" in coverage["boundary"]

    flat = {item["node"]["name"]: item for item in coverage["flat_nodes"]}
    assert flat["Governance Coverage Market Domain"]["governance_status"] == (
        "domain_policy_present"
    )
    assert flat["Governance Coverage Market Domain"]["local_policy_count"] == 1
    assert flat["Electronics Line"]["governance_status"] == "governed_locally"
    assert flat["Electronics Line"]["local_policy_count"] == 1
    assert flat["Electronics Line"]["inherited_policy_count"] == 1
    assert flat["Electronics Line"]["local_admin_count"] == 1
    assert flat["Phone Accessories Section"]["governance_status"] == (
        "governed_by_inheritance"
    )
    assert flat["Phone Accessories Section"]["local_policy_count"] == 0
    assert flat["Phone Accessories Section"]["inherited_policy_count"] == 2
    assert flat["Phone Accessories Section"]["local_admin_count"] == 1
    assert flat["Welfare Committee"]["governance_status"] == "needs_local_admin"
    assert flat["Welfare Committee"]["local_admin_count"] == 0
    assert flat["Welfare Committee"]["effective_policy_count"] == 1
    assert flat["Independent Branch"]["governance_status"] == "needs_policy"
    assert flat["Independent Branch"]["inherits_parent_policy"] is False
    assert flat["Independent Branch"]["inherited_policy_count"] == 0
    assert flat["Independent Branch"]["local_admin_count"] == 1
    assert flat["Independent Branch"]["admin_action_route_hint"].endswith("/policies")

    tree = coverage["tree"][0]
    assert tree["node"]["parent_node_id"] is None
    electronics_tree = next(
        child for child in tree["children"] if child["node"]["name"] == "Electronics Line"
    )
    assert electronics_tree["children"][0]["node"]["name"] == "Phone Accessories Section"

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "clans": db.query(Clan).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_governance_coverage_but_admin_actions_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "governance-coverage-member@example.com")
    outsider = _seed_user(3, "governance-coverage-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Governance Coverage School Domain",
                "display_name": "Governance Coverage School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_coverage = client.get(
            f"/community-domains/{domain_id}/governance-coverage"
        )
        assert member_coverage.status_code == 200, member_coverage.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_coverage = client.get(
            f"/community-domains/{domain_id}/governance-coverage"
        )
        assert outsider_coverage.status_code == 403, outsider_coverage.text
        assert "active Community Domain members" in outsider_coverage.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    coverage = member_coverage.json()["governance_coverage"]
    assert coverage["viewer"] == {"user_id": member.id, "can_admin": False}
    assert coverage["counts"]["domain_policies"] == 0
    assert coverage["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_complete_governance_coverage",
        "label": "Ask a Community Domain admin to complete governance coverage",
        "route_hint": None,
        "requires_admin": True,
    }
    assert coverage["tree"][0]["governance_status"] == "needs_domain_policy"
    assert coverage["tree"][0]["admin_action_route_hint"] is None
    assert coverage["flat_nodes"][0]["admin_action_route_hint"] is None
    assert "private review payloads" in coverage["boundary"]


def test_analytics_projects_aggregate_domain_snapshot_without_private_records(
    client: TestClient,
):
    owner = _seed_owner()
    admin = _seed_user(2, "analytics-admin@example.com")
    trader = _seed_user(3, "analytics-trader@example.com")
    section_member = _seed_user(4, "analytics-section@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Analytics Market Domain",
                "display_name": "Analytics Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
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

        section = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Phone Accessories Section",
                "parent_node_id": line_id,
                "node_type": "section",
                "node_kind": "market_section",
            },
        )
        assert section.status_code == 201, section.text
        section_id = section.json()["node"]["id"]

        committee = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Welfare Committee",
                "parent_node_id": root_node_id,
                "node_type": "committee",
                "node_kind": "market_committee",
            },
        )
        assert committee.status_code == 201, committee.text

        for user, role in (
            (admin, "domain_admin"),
            (trader, "member"),
            (section_member, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        placements = [
            (line_id, admin.id, "line_admin"),
            (line_id, trader.id, "trader"),
            (section_id, section_member.id, "trader"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        domain_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "analytics-domain-member-review",
                "action_key": "domain_member.upsert",
                "scope_type": "domain",
                "review_mode": "domain_admin_review",
            },
        )
        assert domain_policy.status_code == 201, domain_policy.text

        line_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "analytics-line-member-review",
                "action_key": "node_member.upsert",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
            },
        )
        assert line_policy.status_code == 201, line_policy.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "clans": db.query(Clan).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/analytics")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    analytics = payload["analytics"]
    assert analytics["editable"] is False
    assert analytics["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert analytics["template"]["template_key"] == "market_cooperative"
    assert analytics["summary"] == {
        "nodes": 4,
        "active_nodes": 4,
        "non_root_nodes": 3,
        "leaf_nodes": 2,
        "max_depth": 2,
        "active_members": 4,
        "active_domain_admins": 2,
        "active_node_memberships": 3,
        "active_node_admins": 1,
        "active_policies": 2,
        "open_reviews": 0,
        "applied_reviews": 0,
        "enabled_module_templates": 7,
    }
    assert analytics["distribution"]["domain_members_by_role"] == {
        "owner": 1,
        "domain_admin": 1,
        "member": 2,
    }
    assert analytics["distribution"]["node_members_by_role"] == {
        "line_admin": 1,
        "trader": 2,
    }
    assert analytics["distribution"]["policies_by_scope"] == {
        "domain": 1,
        "node": 1,
    }
    assert analytics["coverage_gaps"] == {
        "nodes_missing_local_admin": 2,
        "nodes_without_member_placement": 1,
        "nodes_without_local_policy": 2,
    }
    assert analytics["primary_next_action"] == {
        "action_key": "assign_local_admins",
        "label": "Assign local admins where coverage is missing",
        "route_hint": f"/community-domains/{domain_id}/roles",
        "requires_admin": True,
    }
    lanes = {item["lane_key"]: item for item in analytics["lanes"]}
    assert lanes["structure"]["route_hint"].endswith("/rollout-tree")
    assert lanes["membership"]["route_hint"].endswith("/members")
    assert lanes["local_admins"]["state"] == "coverage_gap"
    assert lanes["governance"]["route_hint"].endswith("/governance-coverage")
    assert lanes["economic"]["state"] == "not_metered_in_this_slice"
    assert "Aggregate membership analytics only" in lanes["membership"]["boundary"]
    assert "not wired to live marketplace" in lanes["economic"]["boundary"]
    assert "expose private member" in analytics["boundary"]
    assert "meter live marketplace/shop/finance usage" in analytics["boundary"]

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "clans": db.query(Clan).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_analytics_but_admin_routes_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "analytics-member@example.com")
    outsider = _seed_user(3, "analytics-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Analytics School Domain",
                "display_name": "Analytics School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_analytics = client.get(f"/community-domains/{domain_id}/analytics")
        assert member_analytics.status_code == 200, member_analytics.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_analytics = client.get(f"/community-domains/{domain_id}/analytics")
        assert outsider_analytics.status_code == 403, outsider_analytics.text
        assert "active Community Domain members" in outsider_analytics.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    analytics = member_analytics.json()["analytics"]
    assert analytics["viewer"] == {"user_id": member.id, "can_admin": False}
    assert analytics["summary"]["active_members"] == 2
    assert analytics["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_analytics",
        "label": "Ask a Community Domain admin to review analytics gaps",
        "route_hint": None,
        "requires_admin": True,
    }
    lanes = {item["lane_key"]: item for item in analytics["lanes"]}
    assert lanes["membership"]["route_hint"] is None
    assert lanes["local_admins"]["route_hint"] is None
    assert lanes["reviews"]["route_hint"] is None
    assert lanes["governance"]["route_hint"].endswith("/governance-coverage")
    assert "private member" in analytics["boundary"]


def test_evidence_map_projects_safe_evidence_readiness_without_private_records(
    client: TestClient,
):
    owner = _seed_owner()
    admin = _seed_user(2, "evidence-map-admin@example.com")
    trader = _seed_user(3, "evidence-map-trader@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Evidence Map Market Domain",
                "display_name": "Evidence Map Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
                "public_profile": "Public-safe market profile.",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
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

        for user, role in (
            (admin, "domain_admin"),
            (trader, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        placements = [
            (line_id, admin.id, "line_admin"),
            (line_id, trader.id, "trader"),
        ]
        for node_id, user_id, role in placements:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "evidence-map-line-evidence-review",
                "action_key": "evidence.verify",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "line_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "evidence.verify",
                "community_node_id": line_id,
                "request_note": "Review line evidence before it is used.",
                "payload": {"claim": "line evidence readiness"},
            },
        )
        assert review.status_code == 201, review.text
        review_id = review.json()["action_review"]["id"]

        evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review_id}/evidence",
            json={
                "evidence_type": "document",
                "title": "Branch register extract",
                "file_name": "branch-register.pdf",
                "storage_key": "private/evidence/branch-register.pdf",
            },
        )
        assert evidence.status_code == 201, evidence.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/evidence-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    evidence_map = payload["evidence_map"]
    assert evidence_map["editable"] is False
    assert evidence_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert evidence_map["template"]["template_key"] == "market_cooperative"
    assert evidence_map["summary"] == {
        "verification_status": "unverified",
        "identity_anchor_present": True,
        "public_profile_present": True,
        "active_members": 3,
        "active_node_memberships": 2,
        "domain_admin_appointments": 2,
        "node_admin_appointments": 1,
        "active_policies": 1,
        "action_reviews": 1,
        "open_reviews": 1,
        "review_evidence_records": 1,
        "evidence_submitters": 1,
    }
    assert evidence_map["distribution"] == {
        "evidence_by_type": {"document": 1},
        "evidence_by_scope": {"domain": 0, "node": 1},
    }
    assert evidence_map["coverage"] == {
        "nodes_with_member_evidence": 1,
        "nodes_with_admin_evidence": 1,
        "nodes_with_policy_evidence": 1,
        "active_non_root_nodes": 1,
    }
    assert evidence_map["primary_next_action"] == {
        "action_key": "prepare_authority_evidence",
        "label": "Prepare Community Domain authority evidence",
        "route_hint": f"/community-domains/{domain_id}/verification-requirements",
        "requires_admin": True,
    }

    lanes = {item["lane_key"]: item for item in evidence_map["lanes"]}
    assert lanes["authority_evidence"]["state"] == "unverified"
    assert lanes["membership_evidence"]["count"] == 3
    assert lanes["node_membership_evidence"]["route_hint"].endswith("/rollout-tree")
    assert lanes["role_appointment_evidence"]["count"] == 3
    assert lanes["governance_evidence"]["route_hint"].endswith("/governance-coverage")
    assert lanes["review_evidence"]["count"] == 1
    assert lanes["public_safe_summary"]["state"] == "profile_present"
    assert lanes["trust_mobility"]["state"] == "not_connected_in_this_slice"
    assert "does not expose files" in evidence_map["boundary"]
    assert "storage keys" in evidence_map["boundary"]
    assert "create TrustSlips" in evidence_map["boundary"]
    assert "private member" in evidence_map["boundary"]
    assert "branch-register.pdf" not in str(evidence_map)
    assert "private/evidence/branch-register.pdf" not in str(evidence_map)

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_evidence_map_but_admin_routes_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "evidence-map-member@example.com")
    outsider = _seed_user(3, "evidence-map-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Evidence Map School Domain",
                "display_name": "Evidence Map School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(f"/community-domains/{domain_id}/evidence-map")
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(f"/community-domains/{domain_id}/evidence-map")
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    evidence_map = member_map.json()["evidence_map"]
    assert evidence_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert evidence_map["summary"]["active_members"] == 2
    assert evidence_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_evidence",
        "label": "Ask a Community Domain admin to review evidence readiness",
        "route_hint": None,
        "requires_admin": True,
    }
    lanes = {item["lane_key"]: item for item in evidence_map["lanes"]}
    assert lanes["authority_evidence"]["route_hint"] is None
    assert lanes["membership_evidence"]["route_hint"] is None
    assert lanes["role_appointment_evidence"]["route_hint"] is None
    assert lanes["review_evidence"]["route_hint"] is None
    assert lanes["node_membership_evidence"]["route_hint"].endswith("/rollout-tree")
    assert lanes["public_safe_summary"]["route_hint"].endswith("/network-presence")
    assert "private member" in evidence_map["boundary"]


def test_trust_mobility_projects_portability_readiness_without_issuing_records(
    client: TestClient,
):
    owner = _seed_owner()
    admin = _seed_user(2, "trust-mobility-admin@example.com")
    member = _seed_user(3, "trust-mobility-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Trust Mobility Market Domain",
                "display_name": "Trust Mobility Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
                "public_profile": "A public-safe profile for trusted market coordination.",
            },
        )
        assert created.status_code == 201, created.text
        domain = created.json()["community_domain"]
        domain_id = domain["id"]
        root_node_id = domain["root_node"]["id"]

        with SessionLocal() as db:
            domain_row = db.get(CommunityDomain, domain_id)
            assert domain_row is not None
            domain_row.verification_status = "verified"
            db.commit()

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Trusted Traders Line",
                "parent_node_id": root_node_id,
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert line.status_code == 201, line.text
        line_id = line.json()["node"]["id"]

        for user, role in (
            (admin, "domain_admin"),
            (member, "member"),
        ):
            added = client.post(
                f"/community-domains/{domain_id}/members",
                json={"user_id": user.id, "role": role},
            )
            assert added.status_code == 201, added.text

        placed = client.post(
            f"/community-domains/{domain_id}/nodes/{line_id}/members",
            json={"user_id": member.id, "role": "trader"},
        )
        assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "trust-mobility-evidence-review",
                "action_key": "evidence.verify",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
            },
        )
        assert policy.status_code == 201, policy.text

        review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "evidence.verify",
                "community_node_id": line_id,
                "request_note": "Review trusted trader evidence.",
                "payload": {"claim": "member is trusted by the market line"},
            },
        )
        assert review.status_code == 201, review.text
        review_id = review.json()["action_review"]["id"]

        evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review_id}/evidence",
            json={
                "evidence_type": "attestation",
                "title": "Trader standing attestation",
                "file_name": "trusted-trader-attestation.pdf",
                "storage_key": "private/evidence/trusted-trader-attestation.pdf",
            },
        )
        assert evidence.status_code == 201, evidence.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "trust_slips": db.query(TrustSlip).count(),
                "clans": db.query(Clan).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/trust-mobility")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    trust_mobility = payload["trust_mobility"]
    assert trust_mobility["editable"] is False
    assert trust_mobility["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert trust_mobility["template"]["template_key"] == "market_cooperative"
    assert trust_mobility["summary"] == {
        "domain_status": "draft",
        "verification_status": "verified",
        "public_profile_present": True,
        "active_members": 3,
        "active_node_memberships": 1,
        "active_policies": 1,
        "open_reviews": 1,
        "review_evidence_records": 1,
        "trust_slips": 0,
        "trust_passport_entries": 0,
        "relay_paths": 0,
    }
    assert trust_mobility["ready_total"] == 6
    assert trust_mobility["blocked_lanes"] == [
        "trustslip_bridge",
        "trust_passport_bridge",
        "external_relay",
    ]
    assert trust_mobility["primary_next_action"] == {
        "action_key": "review_trust_mobility_boundaries",
        "label": "Review trust mobility boundaries before any release design",
        "route_hint": f"/community-domains/{domain_id}/network-presence",
        "requires_admin": False,
    }

    lanes = {item["lane_key"]: item for item in trust_mobility["lanes"]}
    assert lanes["identity_readiness"]["ready"] is True
    assert lanes["authority_readiness"]["status"] == "verified"
    assert lanes["membership_trace"]["count"] == 3
    assert lanes["governance_trace"]["count"] == 1
    assert lanes["evidence_trace"]["status"] == "metadata_present"
    assert lanes["public_presence"]["status"] == "profile_present"
    assert lanes["trustslip_bridge"]["status"] == "not_connected_in_this_slice"
    assert lanes["trust_passport_bridge"]["ready"] is False
    assert lanes["external_relay"]["count"] == 0
    assert "does not create TrustSlips" in trust_mobility["boundary"]
    assert "write Trust Passport entries" in trust_mobility["boundary"]
    assert "expose files" in trust_mobility["boundary"]
    assert "expose storage keys" in trust_mobility["boundary"]
    assert "private member" in trust_mobility["boundary"]
    assert "create a social Community" in trust_mobility["boundary"]
    assert "trusted-trader-attestation.pdf" not in str(trust_mobility)
    assert "private/evidence/trusted-trader-attestation.pdf" not in str(trust_mobility)

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "trust_slips": db.query(TrustSlip).count(),
            "clans": db.query(Clan).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_trust_mobility_but_admin_routes_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "trust-mobility-member@example.com")
    outsider = _seed_user(3, "trust-mobility-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Trust Mobility School Domain",
                "display_name": "Trust Mobility School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
                "public_profile": "A public-safe school network profile.",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_mobility = client.get(f"/community-domains/{domain_id}/trust-mobility")
        assert member_mobility.status_code == 200, member_mobility.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_mobility = client.get(
            f"/community-domains/{domain_id}/trust-mobility"
        )
        assert outsider_mobility.status_code == 403, outsider_mobility.text
        assert "active Community Domain members" in outsider_mobility.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    trust_mobility = member_mobility.json()["trust_mobility"]
    assert trust_mobility["viewer"] == {"user_id": member.id, "can_admin": False}
    assert trust_mobility["summary"]["verification_status"] == "unverified"
    assert trust_mobility["summary"]["trust_slips"] == 0
    assert trust_mobility["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_prepare_trust_mobility",
        "label": "Ask a Community Domain admin to prepare trust mobility",
        "route_hint": None,
        "requires_admin": True,
    }
    lanes = {item["lane_key"]: item for item in trust_mobility["lanes"]}
    assert lanes["identity_readiness"]["route_hint"].endswith("/operating-map")
    assert lanes["authority_readiness"]["route_hint"] is None
    assert lanes["membership_trace"]["route_hint"] is None
    assert lanes["evidence_trace"]["route_hint"] is None
    assert lanes["trustslip_bridge"]["route_hint"] is None
    assert lanes["trust_passport_bridge"]["route_hint"] is None
    assert lanes["external_relay"]["route_hint"] is None
    assert lanes["governance_trace"]["route_hint"].endswith("/governance-coverage")
    assert lanes["public_presence"]["route_hint"].endswith("/network-presence")
    assert "private member" in trust_mobility["boundary"]


def test_subscription_lifecycle_projects_billing_plan_without_payment_writes(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Subscription Lifecycle Market",
                "display_name": "Subscription Lifecycle Market",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
            }

        response = client.get(
            f"/community-domains/{domain_id}/subscription-lifecycle"
        )
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    subscription = payload["subscription_lifecycle"]
    assert subscription["editable"] is False
    assert subscription["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert subscription["package"]["package_code"] == "community_domain_starter"
    assert subscription["package"]["pricing_status"] == "pilot_quote_required"
    assert subscription["package"]["billing_cycle"] == "manual_quote"
    assert subscription["package"]["price_amount"] is None
    assert subscription["summary"] == {
        "domain_status": "draft",
        "verification_status": "unverified",
        "billing_status": "not_metered_in_this_slice",
        "subscription_status": "not_configured",
        "payment_instruction_status": "not_created_in_this_slice",
        "payment_confirmation_status": "not_recorded_in_this_slice",
        "renewal_status": "not_configured",
        "next_billing_at": None,
        "subscription_started_at": None,
        "subscription_expires_at": None,
        "grace_period_days": None,
    }
    assert subscription["ready_total"] == 1
    assert subscription["blocked_lanes"] == [
        "pricing_confirmation",
        "payment_instruction",
        "payment_confirmation",
        "billing_activation",
        "subscription_period",
        "renewal_policy",
        "suspension_reactivation",
    ]
    assert subscription["primary_next_action"] == {
        "action_key": "review_manual_quote",
        "label": "Review manual Community Domain package quote",
        "route_hint": f"/community-domains/{domain_id}/package-quote",
        "requires_admin": True,
    }

    lanes = {item["lane_key"]: item for item in subscription["lanes"]}
    assert lanes["quote_preview"]["status"] == "draft_quote"
    assert lanes["quote_preview"]["ready"] is True
    assert lanes["pricing_confirmation"]["status"] == "pilot_quote_required"
    assert lanes["payment_instruction"]["status"] == "not_created_in_this_slice"
    assert lanes["payment_confirmation"]["status"] == "not_recorded_in_this_slice"
    assert lanes["billing_activation"]["status"] == "not_active"
    assert lanes["subscription_period"]["status"] == "not_configured"
    assert lanes["renewal_policy"]["status"] == "not_configured"
    assert lanes["suspension_reactivation"]["status"] == "not_enforced_in_this_slice"
    assert "does not create a quote acceptance" in subscription["boundary"]
    assert "create a payment instruction" in subscription["boundary"]
    assert "record payment" in subscription["boundary"]
    assert "activate billing" in subscription["boundary"]
    assert "renew a domain" in subscription["boundary"]
    assert "private finance" in subscription["boundary"]

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_subscription_lifecycle_but_admin_routes_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "subscription-lifecycle-member@example.com")
    outsider = _seed_user(3, "subscription-lifecycle-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Subscription School Domain",
                "display_name": "Subscription School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_lifecycle = client.get(
            f"/community-domains/{domain_id}/subscription-lifecycle"
        )
        assert member_lifecycle.status_code == 200, member_lifecycle.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_lifecycle = client.get(
            f"/community-domains/{domain_id}/subscription-lifecycle"
        )
        assert outsider_lifecycle.status_code == 403, outsider_lifecycle.text
        assert "active Community Domain members" in outsider_lifecycle.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    subscription = member_lifecycle.json()["subscription_lifecycle"]
    assert subscription["viewer"] == {"user_id": member.id, "can_admin": False}
    assert subscription["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_subscription",
        "label": "Ask a Community Domain admin to review subscription setup",
        "route_hint": None,
        "requires_admin": True,
    }
    lanes = {item["lane_key"]: item for item in subscription["lanes"]}
    assert lanes["quote_preview"]["route_hint"] is None
    assert lanes["pricing_confirmation"]["route_hint"] is None
    assert lanes["payment_instruction"]["route_hint"] is None
    assert lanes["payment_confirmation"]["route_hint"] is None
    assert lanes["billing_activation"]["route_hint"] is None
    assert lanes["subscription_period"]["route_hint"] is None
    assert lanes["renewal_policy"]["route_hint"] is None
    assert lanes["suspension_reactivation"]["route_hint"] is None
    assert subscription["summary"]["billing_status"] == "not_metered_in_this_slice"
    assert "private finance" in subscription["boundary"]


def test_social_bridge_projects_linked_community_without_upgrade_writes(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Social Bridge Market Domain",
                "display_name": "Social Bridge Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        created_clan = client.post(
            "/clans/",
            json={
                "name": "Social Bridge Market Circle",
                "description": "The existing lightweight community circle.",
            },
        )
        assert created_clan.status_code == 201, created_clan.text
        clan_id = created_clan.json()["id"]

        created_affiliate = client.post(
            "/clans/",
            json={
                "name": "Social Bridge Affiliate Circle",
                "description": "A related lightweight community circle.",
            },
        )
        assert created_affiliate.status_code == 201, created_affiliate.text
        affiliate_id = created_affiliate.json()["id"]

        with SessionLocal() as db:
            domain = db.get(CommunityDomain, domain_id)
            assert domain is not None
            domain.clan_id = clan_id
            db.add(
                CommunityDomainAffiliation(
                    parent_clan_id=clan_id,
                    affiliate_clan_id=affiliate_id,
                    requested_by_user_id=owner.id,
                    decided_by_user_id=owner.id,
                    status="approved",
                    request_note="Existing clan-to-clan relationship.",
                    decision_note="Approved before Community Domain bridge projection.",
                )
            )
            db.commit()

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "clans": db.query(Clan).count(),
                "clan_members": db.query(ClanMembership).count(),
                "affiliations": db.query(CommunityDomainAffiliation).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/social-bridge")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    social_bridge = payload["social_bridge"]
    assert social_bridge["editable"] is False
    assert social_bridge["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert social_bridge["linked_community"] == {
        "linked": True,
        "id": clan_id,
        "name": "Social Bridge Market Circle",
        "status": "active",
        "community_code": None,
        "member_count": 1,
    }
    assert social_bridge["summary"] == {
        "bridge_status": "linked",
        "domain_clan_id_present": True,
        "upgrade_path_status": "not_connected_in_this_slice",
        "affiliation_spine_status": "clan_to_clan_only",
        "linked_member_count": 1,
        "outbound_affiliations": 1,
        "inbound_affiliations": 0,
        "active_affiliations": 1,
        "pending_affiliations": 0,
    }
    assert social_bridge["primary_next_action"] == {
        "action_key": "review_social_bridge_boundaries",
        "label": "Review social Community bridge boundaries",
        "route_hint": f"/community-domains/{domain_id}/network-presence",
        "requires_admin": True,
    }

    lanes = {item["lane_key"]: item for item in social_bridge["lanes"]}
    assert lanes["concept_separation"]["status"] == "separated"
    assert lanes["linked_social_community"]["status"] == "linked"
    assert lanes["linked_social_community"]["ready"] is True
    assert lanes["upgrade_existing_community"]["status"] == "not_connected_in_this_slice"
    assert lanes["affiliation_spine"]["status"] == "clan_affiliations_visible"
    assert lanes["affiliation_spine"]["count"] == 1
    assert lanes["membership_alignment"]["count"] == 1
    assert lanes["marketplace_context"]["status"] == "not_created_in_this_slice"
    assert "does not create a social Community" in social_bridge["boundary"]
    assert "upgrade an existing Community" in social_bridge["boundary"]
    assert "set clan_id" in social_bridge["boundary"]
    assert "create affiliations" in social_bridge["boundary"]
    assert "copy members" in social_bridge["boundary"]
    assert "private member records" in social_bridge["boundary"]

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "clans": db.query(Clan).count(),
            "clan_members": db.query(ClanMembership).count(),
            "affiliations": db.query(CommunityDomainAffiliation).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_social_bridge_but_linked_community_details_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "social-bridge-member@example.com")
    outsider = _seed_user(3, "social-bridge-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Social Bridge School Domain",
                "display_name": "Social Bridge School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        created_clan = client.post(
            "/clans/",
            json={
                "name": "Social Bridge School Circle",
                "description": "A private lightweight school circle.",
            },
        )
        assert created_clan.status_code == 201, created_clan.text
        clan_id = created_clan.json()["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        with SessionLocal() as db:
            domain = db.get(CommunityDomain, domain_id)
            assert domain is not None
            domain.clan_id = clan_id
            db.commit()

        app.dependency_overrides[get_current_user] = lambda: member
        member_bridge = client.get(f"/community-domains/{domain_id}/social-bridge")
        assert member_bridge.status_code == 200, member_bridge.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_bridge = client.get(f"/community-domains/{domain_id}/social-bridge")
        assert outsider_bridge.status_code == 403, outsider_bridge.text
        assert "active Community Domain members" in outsider_bridge.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    social_bridge = member_bridge.json()["social_bridge"]
    assert social_bridge["viewer"] == {"user_id": member.id, "can_admin": False}
    assert social_bridge["linked_community"] == {
        "linked": True,
        "id": None,
        "name": None,
        "status": "hidden_for_member",
        "community_code": None,
        "member_count": None,
    }
    assert social_bridge["summary"]["bridge_status"] == "linked"
    assert social_bridge["summary"]["linked_member_count"] is None
    assert social_bridge["summary"]["outbound_affiliations"] is None
    assert social_bridge["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_social_bridge",
        "label": "Ask a Community Domain admin to review the social Community bridge",
        "route_hint": None,
        "requires_admin": True,
    }
    lanes = {item["lane_key"]: item for item in social_bridge["lanes"]}
    assert lanes["concept_separation"]["route_hint"].endswith("/operating-map")
    assert lanes["linked_social_community"]["route_hint"] is None
    assert lanes["upgrade_existing_community"]["route_hint"] is None
    assert lanes["affiliation_spine"]["route_hint"] is None
    assert lanes["membership_alignment"]["route_hint"] is None
    assert lanes["marketplace_context"]["route_hint"].endswith("/economic-participation")
    assert "private member records" in social_bridge["boundary"]


def test_institutional_profile_projects_real_world_package_without_writes(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Onitsha Main Market Domain",
                "display_name": "Onitsha Main Market Traders Association",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
                "public_profile": (
                    "Institutional domain for a large market association with "
                    "trade lines, committees, and trusted economic activity."
                ),
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        created_line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "node_type": "line",
                "node_kind": "market_line",
                "description": "Electronics traders and section leaders.",
            },
        )
        assert created_line.status_code == 201, created_line.text

        created_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "line-placement-review",
                "action_key": "node_member.upsert",
                "review_mode": "node_admin_review",
                "scope_type": "node",
                "policy_summary": "Line leaders review trader placement.",
            },
        )
        assert created_policy.status_code == 201, created_policy.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/institutional-profile")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    institutional_profile = payload["institutional_profile"]
    assert institutional_profile["editable"] is False
    assert institutional_profile["viewer"] == {"user_id": owner.id, "can_admin": True}

    profile = institutional_profile["institutional_profile"]
    assert profile["domain_type"] == "market_cooperative"
    assert profile["template_key"] == "market_cooperative"
    assert profile["template_label"] == "Market / cooperative"
    assert profile["marketplace_role"] == "core"
    assert "shops" in profile["default_modules"]
    assert "market_line" in {item["node_kind"] for item in profile["node_presets"]}
    assert "member shops" in profile["activity_lanes"]

    assert institutional_profile["summary"] == {
        "domain_status": "draft",
        "verification_status": "unverified",
        "public_profile_ready": True,
        "root_node_ready": True,
        "structure_ready": True,
        "governance_ready": True,
        "authority_verified": False,
        "total_node_count": 2,
        "operating_unit_count": 1,
        "active_member_count": 1,
        "active_policy_count": 1,
        "pending_review_count": 0,
        "module_count": len(profile["default_modules"]),
        "preset_node_kind_count": len(profile["node_presets"]),
    }
    assert institutional_profile["primary_next_action"] == {
        "action_key": "review_institutional_profile",
        "label": "Review the Community Domain institutional profile",
        "route_hint": f"/community-domains/{domain_id}/dashboard",
        "requires_admin": True,
    }

    lanes = {item["lane_key"]: item for item in institutional_profile["lanes"]}
    assert lanes["institution_identity"]["status"] == "identified"
    assert lanes["public_profile"]["status"] == "ready"
    assert lanes["structure_archetype"]["status"] == "modeled"
    assert lanes["governance_archetype"]["status"] == "policy_backed"
    assert lanes["economic_posture"]["status"] == "template_core"
    assert lanes["authority_evidence"]["status"] == "unverified"
    assert lanes["customization_boundary"]["status"] == "configuration_not_schema_fork"
    assert lanes["customization_boundary"]["route_hint"].endswith("/service-settings")
    assert "custom schema" in institutional_profile["boundary"]
    assert "custom billing package" in institutional_profile["boundary"]
    assert "verification" in institutional_profile["boundary"]
    assert "activation" in institutional_profile["boundary"]
    assert "private member/review/evidence exposure" in institutional_profile["boundary"]

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_institutional_profile_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "institutional-profile-member@example.com")
    outsider = _seed_user(3, "institutional-profile-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Dominion Schools Institutional Domain",
                "display_name": "Dominion Schools Institutional Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added.status_code == 201, added.text

        created_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "school-member-review",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
                "policy_summary": "Domain admins review school member changes.",
            },
        )
        assert created_policy.status_code == 201, created_policy.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_profile = client.get(
            f"/community-domains/{domain_id}/institutional-profile"
        )
        assert member_profile.status_code == 200, member_profile.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_profile = client.get(
            f"/community-domains/{domain_id}/institutional-profile"
        )
        assert outsider_profile.status_code == 403, outsider_profile.text
        assert "active Community Domain members" in outsider_profile.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    institutional_profile = member_profile.json()["institutional_profile"]
    assert institutional_profile["viewer"] == {"user_id": member.id, "can_admin": False}
    assert institutional_profile["summary"]["active_member_count"] == 2
    assert institutional_profile["summary"]["active_policy_count"] is None
    assert institutional_profile["summary"]["pending_review_count"] is None
    assert institutional_profile["summary"]["public_profile_ready"] is False
    assert institutional_profile["summary"]["governance_ready"] is True
    assert institutional_profile["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_institutional_profile",
        "label": "Ask a Community Domain admin to review the institutional profile",
        "route_hint": None,
        "requires_admin": True,
    }

    profile = institutional_profile["institutional_profile"]
    assert profile["template_key"] == "school_multi_branch"
    assert profile["marketplace_role"] == "optional"
    assert "school_branch" in {item["node_kind"] for item in profile["node_presets"]}

    lanes = {item["lane_key"]: item for item in institutional_profile["lanes"]}
    assert lanes["institution_identity"]["route_hint"].endswith("/operating-map")
    assert lanes["public_profile"]["route_hint"] is None
    assert lanes["structure_archetype"]["route_hint"].endswith("/rollout-tree")
    assert lanes["governance_archetype"]["route_hint"] is None
    assert lanes["authority_evidence"]["route_hint"] is None
    assert lanes["customization_boundary"]["route_hint"] is None
    assert "private member/review/evidence exposure" in institutional_profile["boundary"]


def test_delegation_map_projects_authority_without_permission_writes(
    client: TestClient,
):
    owner = _seed_owner()
    line_admin = _seed_user(2, "delegation-line-admin@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Delegation Market Domain",
                "display_name": "Delegation Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": line_admin.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        created_line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert created_line.status_code == 201, created_line.text
        line_id = created_line.json()["node"]["id"]

        created_section = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Phone Accessories Section",
                "parent_node_id": line_id,
                "node_type": "section",
                "node_kind": "market_section",
            },
        )
        assert created_section.status_code == 201, created_section.text
        section_id = created_section.json()["node"]["id"]

        for node_id in (line_id, section_id):
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{node_id}/members",
                json={"user_id": line_admin.id, "role": "line_admin"},
            )
            assert placed.status_code == 201, placed.text

        central_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "domain-settings-review",
                "action_key": "domain.settings_change",
                "review_mode": "multi_reviewer_review",
                "policy_summary": "Market-wide settings need central review.",
                "config": {"min_reviewers": 2},
            },
        )
        assert central_policy.status_code == 201, central_policy.text

        node_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "line-member-review",
                "action_key": "node_member.upsert",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "policy_summary": "Line admins review local trader placement.",
            },
        )
        assert node_policy.status_code == 201, node_policy.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/delegation-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    delegation = payload["delegation_map"]
    assert delegation["editable"] is False
    assert delegation["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert delegation["summary"] == {
        "active_node_count": 3,
        "active_operating_unit_count": 2,
        "central_authority_count": 1,
        "local_admin_assignment_count": 2,
        "operating_units_with_local_admin": 2,
        "operating_units_missing_local_admin": 0,
        "active_policy_count": 2,
        "central_policy_count": 1,
        "local_policy_count": 1,
        "operating_units_using_inherited_policy": 1,
        "operating_units_missing_policy": 0,
        "open_review_count": 0,
        "verification_status": "unverified",
    }
    assert delegation["delegation_shape"]["supports_domain_policy"] is True
    assert delegation["delegation_shape"]["supports_node_policy"] is True
    assert delegation["delegation_shape"]["supports_inherited_policy"] is True
    assert "line_admin" in delegation["delegation_shape"]["local_authority_roles"]

    lanes = {item["lane_key"]: item for item in delegation["lanes"]}
    assert lanes["central_authority"]["status"] == "covered"
    assert lanes["local_delegation"]["status"] == "covered"
    assert lanes["policy_delegation"]["status"] == "covered_by_domain_or_local_policy"
    assert lanes["inheritance_model"]["status"] == "inheriting"
    assert lanes["review_queue"]["status"] == "clear"
    assert lanes["authority_boundary"]["status"] == "unverified"
    assert delegation["primary_next_action"] == {
        "action_key": "review_governance_coverage",
        "label": "Review Community Domain governance coverage",
        "route_hint": f"/community-domains/{domain_id}/governance-coverage",
        "requires_admin": True,
    }
    assert "does not assign roles" in delegation["boundary"]
    assert "create node memberships" in delegation["boundary"]
    assert "change inheritance" in delegation["boundary"]
    assert "private member/review/evidence records" in delegation["boundary"]

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_delegation_map_but_admin_details_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "delegation-member@example.com")
    outsider = _seed_user(3, "delegation-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Delegation School Domain",
                "display_name": "Delegation School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        created_branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Abuja Campus",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert created_branch.status_code == 201, created_branch.text

        created_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "school-member-review",
                "action_key": "domain_member.upsert",
                "review_mode": "domain_admin_review",
                "policy_summary": "Domain admins review school member changes.",
            },
        )
        assert created_policy.status_code == 201, created_policy.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_delegation = client.get(f"/community-domains/{domain_id}/delegation-map")
        assert member_delegation.status_code == 200, member_delegation.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_delegation = client.get(
            f"/community-domains/{domain_id}/delegation-map"
        )
        assert outsider_delegation.status_code == 403, outsider_delegation.text
        assert "active Community Domain members" in outsider_delegation.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    delegation = member_delegation.json()["delegation_map"]
    assert delegation["viewer"] == {"user_id": member.id, "can_admin": False}
    assert delegation["summary"]["active_node_count"] == 2
    assert delegation["summary"]["active_operating_unit_count"] == 1
    assert delegation["summary"]["central_authority_count"] is None
    assert delegation["summary"]["local_admin_assignment_count"] is None
    assert delegation["summary"]["operating_units_with_local_admin"] is None
    assert delegation["summary"]["active_policy_count"] is None
    assert delegation["summary"]["central_policy_count"] is None
    assert delegation["summary"]["open_review_count"] is None
    assert delegation["summary"]["operating_units_using_inherited_policy"] == 1
    assert delegation["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_delegation",
        "label": "Ask a Community Domain admin to review delegation",
        "route_hint": None,
        "requires_admin": True,
    }

    lanes = {item["lane_key"]: item for item in delegation["lanes"]}
    assert lanes["central_authority"]["route_hint"] is None
    assert lanes["local_delegation"]["route_hint"] is None
    assert lanes["policy_delegation"]["route_hint"] is None
    assert lanes["inheritance_model"]["route_hint"].endswith("/rollout-tree")
    assert lanes["review_queue"]["route_hint"] is None
    assert lanes["authority_boundary"]["route_hint"] is None
    assert "private member/review/evidence records" in delegation["boundary"]


def test_identity_context_projects_one_member_across_domain_and_social_contexts_without_writes(
    client: TestClient,
):
    owner = _seed_owner()

    with SessionLocal() as db:
        db_owner = db.get(User, owner.id)
        assert db_owner is not None
        db_owner.gmfn_id = "GMFN-U-IDENTITY"
        db_owner.display_name = "Identity Owner"
        db.commit()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Identity Context Market Domain",
                "display_name": "Identity Context Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        created_clan = client.post(
            "/clans/",
            json={
                "name": "Identity Context Market Circle",
                "description": "The linked lightweight social Community.",
            },
        )
        assert created_clan.status_code == 201, created_clan.text
        clan_id = created_clan.json()["id"]

        created_line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert created_line.status_code == 201, created_line.text
        line_id = created_line.json()["node"]["id"]

        placed_owner = client.post(
            f"/community-domains/{domain_id}/nodes/{line_id}/members",
            json={"user_id": owner.id, "role": "line_admin"},
        )
        assert placed_owner.status_code == 201, placed_owner.text

        with SessionLocal() as db:
            domain = db.get(CommunityDomain, domain_id)
            assert domain is not None
            domain.clan_id = clan_id
            db.commit()
            before_counts = {
                "users": db.query(User).count(),
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "clans": db.query(Clan).count(),
                "clan_members": db.query(ClanMembership).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/identity-context")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    identity_context = payload["identity_context"]
    assert identity_context["editable"] is False
    assert identity_context["member_identity"] == {
        "user_id": owner.id,
        "gsn_id": "GMFN-U-IDENTITY",
        "email": "domain-owner@example.com",
        "display_name": "Identity Owner",
        "single_identity_rule": (
            "One global member identity can carry many Community Domain, "
            "social Community, marketplace, shop, finance, and trust contexts."
        ),
    }
    assert identity_context["current_domain_context"]["domain_role"] == "owner"
    assert identity_context["current_domain_context"]["domain_status"] == "active"
    assert identity_context["current_domain_context"]["role_counts"] == {
        "line_admin": 1
    }
    assert identity_context["current_domain_context"]["admin_assignment_count"] == 1
    assert len(identity_context["current_domain_context"]["node_placements"]) == 1
    assert identity_context["context_counts"] == {
        "active_community_domain_contexts": 1,
        "active_social_community_contexts": 1,
        "current_domain_node_placements": 1,
        "current_domain_open_member_reviews": 0,
    }
    assert identity_context["social_bridge"] == {
        "domain_has_linked_social_community": True,
        "member_in_linked_social_community": True,
        "linked_social_state": "member_of_linked_social_community",
    }
    lanes = {item["lane_key"]: item for item in identity_context["lanes"]}
    assert lanes["global_member_identity"]["status"] == "present"
    assert lanes["domain_membership"]["status"] == "active"
    assert lanes["node_context"]["status"] == "placed"
    assert lanes["linked_social_context"]["status"] == "member_of_linked_social_community"
    assert lanes["open_member_reviews"]["status"] == "clear"
    assert identity_context["primary_next_action"] == {
        "action_key": "review_member_context",
        "label": "Review your Community Domain identity context",
        "route_hint": f"/community-domains/{domain_id}/dashboard",
        "requires_admin": False,
    }
    assert "does not issue a GSN/GMFN ID" in identity_context["boundary"]
    assert "merge identities" in identity_context["boundary"]
    assert "other domain names" in identity_context["boundary"]

    with SessionLocal() as db:
        after_counts = {
            "users": db.query(User).count(),
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "clans": db.query(Clan).count(),
            "clan_members": db.query(ClanMembership).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
        }
    assert after_counts == before_counts


def test_identity_context_rejects_outsider_and_does_not_issue_missing_gsn_id(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "identity-context-member@example.com")
    outsider = _seed_user(3, "identity-context-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Identity Context School Domain",
                "display_name": "Identity Context School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_context = client.get(f"/community-domains/{domain_id}/identity-context")
        assert member_context.status_code == 200, member_context.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_context = client.get(
            f"/community-domains/{domain_id}/identity-context"
        )
        assert outsider_context.status_code == 403, outsider_context.text
        assert "active Community Domain members" in outsider_context.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    identity_context = member_context.json()["identity_context"]
    assert identity_context["member_identity"] == {
        "user_id": member.id,
        "gsn_id": None,
        "email": "identity-context-member@example.com",
        "display_name": None,
        "single_identity_rule": (
            "One global member identity can carry many Community Domain, "
            "social Community, marketplace, shop, finance, and trust contexts."
        ),
    }
    assert identity_context["context_counts"]["active_community_domain_contexts"] == 1
    assert identity_context["context_counts"]["active_social_community_contexts"] == 0
    assert identity_context["social_bridge"] == {
        "domain_has_linked_social_community": False,
        "member_in_linked_social_community": False,
        "linked_social_state": "not_linked_to_social_community",
    }
    lanes = {item["lane_key"]: item for item in identity_context["lanes"]}
    assert lanes["global_member_identity"]["status"] == "missing"
    assert lanes["domain_membership"]["status"] == "active"
    assert lanes["node_context"]["status"] == "not_placed"
    assert identity_context["primary_next_action"] == {
        "action_key": "confirm_global_member_id",
        "label": "Confirm this member has one stable GSN ID",
        "route_hint": None,
        "requires_admin": False,
    }

    with SessionLocal() as db:
        db_member = db.get(User, member.id)
        assert db_member is not None
        assert db_member.gmfn_id is None


def test_activity_map_projects_template_activity_without_paid_activity_writes(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Activity Map Market Domain",
                "display_name": "Activity Map Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        created_line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert created_line.status_code == 201, created_line.text

        created_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "activity-evidence-review",
                "action_key": "evidence.verify",
                "review_mode": "domain_admin_review",
                "policy_summary": "Activity evidence needs domain admin review.",
            },
        )
        assert created_policy.status_code == 201, created_policy.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/activity-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    activity_map = payload["activity_map"]
    assert activity_map["editable"] is False
    assert activity_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert activity_map["template"]["template_key"] == "market_cooperative"
    assert activity_map["template"]["marketplace_role"] == "core"
    assert "member shops" in activity_map["template"]["activity_lanes"]
    assert "ROSCA/contributions" in activity_map["template"]["activity_lanes"]
    assert activity_map["summary"] == {
        "activity_lane_count": len(activity_map["template"]["activity_lanes"]),
        "active_operating_unit_count": 1,
        "active_member_count": 1,
        "active_policy_count": 1,
        "review_record_count": 0,
        "open_review_count": 0,
        "evidence_record_count": 0,
        "paid_activity_status": "not_connected_in_this_slice",
        "scheduled_activity_status": "not_connected_in_this_slice",
        "marketplace_metering_status": "not_metered_in_this_slice",
    }

    lanes = {item["lane_key"]: item for item in activity_map["lanes"]}
    assert lanes["template_activity_lanes"]["status"] == "mapped"
    assert lanes["operating_unit_context"]["status"] == "mapped"
    assert lanes["activity_governance"]["status"] == "policy_backed"
    assert lanes["activity_evidence"]["status"] == "not_recorded"
    assert lanes["reviewed_activity_records"]["status"] == "not_recorded"
    assert lanes["marketplace_activity_boundary"]["status"] == "template_core"
    assert lanes["paid_activity_boundary"]["status"] == "not_connected_in_this_slice"
    assert lanes["scheduled_activity_boundary"]["status"] == "not_connected_in_this_slice"
    assert activity_map["primary_next_action"] == {
        "action_key": "review_activity_boundaries",
        "label": "Review Community Domain activity boundaries",
        "route_hint": f"/community-domains/{domain_id}/institutional-profile",
        "requires_admin": True,
    }
    assert "dues" in activity_map["boundary"]
    assert "travel fees" in activity_map["boundary"]
    assert "payment instructions" in activity_map["boundary"]
    assert "Trust Passport entries" in activity_map["boundary"]

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_activity_map_but_admin_activity_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "activity-map-member@example.com")
    outsider = _seed_user(3, "activity-map-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Activity Map School Domain",
                "display_name": "Activity Map School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        created_policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "school-activity-review",
                "action_key": "evidence.verify",
                "review_mode": "domain_admin_review",
                "policy_summary": "School activity evidence needs review.",
            },
        )
        assert created_policy.status_code == 201, created_policy.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_activity = client.get(f"/community-domains/{domain_id}/activity-map")
        assert member_activity.status_code == 200, member_activity.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_activity = client.get(f"/community-domains/{domain_id}/activity-map")
        assert outsider_activity.status_code == 403, outsider_activity.text
        assert "active Community Domain members" in outsider_activity.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    activity_map = member_activity.json()["activity_map"]
    assert activity_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert activity_map["template"]["template_key"] == "school_multi_branch"
    assert "PTA activity" in activity_map["template"]["activity_lanes"]
    assert activity_map["summary"]["activity_lane_count"] == len(
        activity_map["template"]["activity_lanes"]
    )
    assert activity_map["summary"]["active_member_count"] == 2
    assert activity_map["summary"]["active_policy_count"] is None
    assert activity_map["summary"]["review_record_count"] is None
    assert activity_map["summary"]["evidence_record_count"] is None
    assert activity_map["summary"]["paid_activity_status"] == (
        "not_connected_in_this_slice"
    )
    assert activity_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_activity_map",
        "label": "Ask a Community Domain admin to review the activity map",
        "route_hint": None,
        "requires_admin": True,
    }

    lanes = {item["lane_key"]: item for item in activity_map["lanes"]}
    assert lanes["template_activity_lanes"]["route_hint"].endswith(
        "/institutional-profile"
    )
    assert lanes["activity_governance"]["route_hint"] is None
    assert lanes["activity_evidence"]["route_hint"] is None
    assert lanes["reviewed_activity_records"]["route_hint"] is None
    assert lanes["paid_activity_boundary"]["route_hint"] is None
    assert lanes["scheduled_activity_boundary"]["route_hint"] is None
    assert "private member/review/evidence/finance exposure" in activity_map["boundary"]


def test_member_verification_map_projects_institutional_readiness_without_credentials(
    client: TestClient,
):
    owner = _seed_owner()
    admin = _seed_user(2, "member-verification-admin@example.com")
    member = _seed_user(3, "member-verification-member@example.com")

    with SessionLocal() as db:
        for user_id, gmfn_id in [
            (owner.id, "GMFN-U-MEMBER-VERIFY-OWNER"),
            (admin.id, "GMFN-U-MEMBER-VERIFY-ADMIN"),
            (member.id, "GMFN-U-MEMBER-VERIFY-MEMBER"),
        ]:
            db_user = db.get(User, user_id)
            assert db_user is not None
            db_user.gmfn_id = gmfn_id
        db.commit()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Member Verification Market Domain",
                "display_name": "Member Verification Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added_admin = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": admin.id, "role": "domain_admin"},
        )
        assert added_admin.status_code == 201, added_admin.text

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "trader"},
        )
        assert added_member.status_code == 201, added_member.text

        created_line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert created_line.status_code == 201, created_line.text
        line_id = created_line.json()["node"]["id"]

        for user_id, role in [
            (owner.id, "line_admin"),
            (admin.id, "branch_admin"),
            (member.id, "trader"),
        ]:
            placed = client.post(
                f"/community-domains/{domain_id}/nodes/{line_id}/members",
                json={"user_id": user_id, "role": role},
            )
            assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "member-verification-evidence-review",
                "action_key": "member.verify",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "line_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "member.verify",
                "community_node_id": line_id,
                "subject_user_id": member.id,
                "target_type": "domain_member",
                "target_id": str(member.id),
                "request_note": "Review member standing before public trust use.",
                "payload": {"claim": "member standing readiness"},
            },
        )
        assert review.status_code == 201, review.text
        review_id = review.json()["action_review"]["id"]

        evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review_id}/evidence",
            json={
                "evidence_type": "document",
                "title": "Member register extract",
                "file_name": "member-register.pdf",
                "storage_key": "private/evidence/member-register.pdf",
            },
        )
        assert evidence.status_code == 201, evidence.text

        with SessionLocal() as db:
            before_counts = {
                "users": db.query(User).count(),
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(
            f"/community-domains/{domain_id}/member-verification-map"
        )
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    verification_map = payload["member_verification_map"]
    assert verification_map["editable"] is False
    assert verification_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert verification_map["summary"] == {
        "verification_status": "unverified",
        "active_member_count": 3,
        "members_with_gsn_id": 3,
        "members_without_unit_placement": 0,
        "domain_admin_count": 2,
        "node_admin_assignment_count": 2,
        "active_node_membership_count": 3,
        "active_policy_count": 1,
        "member_review_count": 1,
        "open_member_review_count": 1,
        "review_evidence_record_count": 1,
        "credential_issuance_status": "not_connected_in_this_slice",
    }
    assert verification_map["role_distribution"] == {
        "domain_roles": {"owner": 1, "domain_admin": 1, "trader": 1},
        "node_roles": {"line_admin": 1, "branch_admin": 1, "trader": 1},
    }
    lanes = {item["lane_key"]: item for item in verification_map["lanes"]}
    assert lanes["membership_register"]["status"] == "present"
    assert lanes["global_identity_anchors"]["status"] == "anchored"
    assert lanes["operating_unit_placement"]["status"] == "placed"
    assert lanes["role_appointments"]["status"] == "admin_roles_present"
    assert lanes["governance_policy"]["status"] == "policy_backed"
    assert lanes["member_review_evidence"]["status"] == "evidence_present"
    assert lanes["credential_boundary"]["status"] == "not_connected_in_this_slice"
    assert verification_map["primary_next_action"] == {
        "action_key": "resolve_open_member_reviews",
        "label": "Resolve open member verification-related reviews",
        "route_hint": f"/community-domains/{domain_id}/action-reviews/reviewer-queue",
        "requires_admin": True,
    }
    assert "does not perform KYC" in verification_map["boundary"]
    assert "issue credentials" in verification_map["boundary"]
    assert "Trust Passport entries" in verification_map["boundary"]
    assert "private member/review/evidence records" in verification_map["boundary"]
    assert "private/evidence/member-register.pdf" not in str(verification_map)

    with SessionLocal() as db:
        after_counts = {
            "users": db.query(User).count(),
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_member_verification_map_but_admin_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "member-verification-map-member@example.com")
    outsider = _seed_user(3, "member-verification-map-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Member Verification School Domain",
                "display_name": "Member Verification School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(
            f"/community-domains/{domain_id}/member-verification-map"
        )
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(
            f"/community-domains/{domain_id}/member-verification-map"
        )
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    verification_map = member_map.json()["member_verification_map"]
    assert verification_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert verification_map["summary"]["active_member_count"] == 2
    assert verification_map["summary"]["members_with_gsn_id"] is None
    assert verification_map["summary"]["members_without_unit_placement"] is None
    assert verification_map["summary"]["domain_admin_count"] is None
    assert verification_map["summary"]["node_admin_assignment_count"] is None
    assert verification_map["summary"]["active_node_membership_count"] == 0
    assert verification_map["summary"]["active_policy_count"] is None
    assert verification_map["summary"]["member_review_count"] is None
    assert verification_map["summary"]["review_evidence_record_count"] is None
    assert verification_map["role_distribution"] == {
        "domain_roles": None,
        "node_roles": None,
    }
    assert verification_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_member_verification_map",
        "label": "Ask a Community Domain admin to review member verification readiness",
        "route_hint": None,
        "requires_admin": True,
    }

    lanes = {item["lane_key"]: item for item in verification_map["lanes"]}
    assert lanes["membership_register"]["route_hint"] is None
    assert lanes["global_identity_anchors"]["route_hint"] is None
    assert lanes["operating_unit_placement"]["route_hint"].endswith("/rollout-tree")
    assert lanes["role_appointments"]["route_hint"] is None
    assert lanes["governance_policy"]["route_hint"] is None
    assert lanes["member_review_evidence"]["route_hint"] is None
    assert lanes["credential_boundary"]["route_hint"] is None
    assert "private member/review/evidence records" in verification_map["boundary"]


def test_network_exchange_map_projects_outward_readiness_without_exchange_writes(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Network Exchange Market Domain",
                "display_name": "Network Exchange Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
                "public_profile": "A public-safe market domain profile.",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        created_line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "node_type": "line",
                "node_kind": "market_line",
            },
        )
        assert created_line.status_code == 201, created_line.text
        line_id = created_line.json()["node"]["id"]

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "network-exchange-evidence-review",
                "action_key": "evidence.verify",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "line_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "evidence.verify",
                "community_node_id": line_id,
                "request_note": "Review exchange evidence privately.",
                "payload": {"claim": "outward exchange readiness"},
            },
        )
        assert review.status_code == 201, review.text
        review_id = review.json()["action_review"]["id"]

        evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review_id}/evidence",
            json={
                "evidence_type": "document",
                "title": "Exchange readiness note",
                "file_name": "exchange-readiness.pdf",
                "storage_key": "private/evidence/exchange-readiness.pdf",
            },
        )
        assert evidence.status_code == 201, evidence.text

        created_clan = client.post(
            "/clans/",
            json={
                "name": "Network Exchange Market Circle",
                "description": "The linked lightweight Community.",
            },
        )
        assert created_clan.status_code == 201, created_clan.text
        clan_id = created_clan.json()["id"]

        created_affiliate = client.post(
            "/clans/",
            json={
                "name": "Network Exchange Affiliate Circle",
                "description": "A related lightweight Community.",
            },
        )
        assert created_affiliate.status_code == 201, created_affiliate.text
        affiliate_id = created_affiliate.json()["id"]

        with SessionLocal() as db:
            domain = db.get(CommunityDomain, domain_id)
            assert domain is not None
            domain.clan_id = clan_id
            domain.verification_status = "verified"
            db.add(
                CommunityDomainAffiliation(
                    parent_clan_id=clan_id,
                    affiliate_clan_id=affiliate_id,
                    requested_by_user_id=owner.id,
                    decided_by_user_id=owner.id,
                    status="approved",
                    request_note="Existing clan-to-clan relationship.",
                    decision_note="Approved before network exchange map projection.",
                )
            )
            db.commit()

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "clans": db.query(Clan).count(),
                "clan_members": db.query(ClanMembership).count(),
                "affiliations": db.query(CommunityDomainAffiliation).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/network-exchange-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    exchange_map = payload["network_exchange_map"]
    assert exchange_map["editable"] is False
    assert exchange_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert exchange_map["summary"] == {
        "domain_status": "draft",
        "verification_status": "verified",
        "marketplace_role": "core",
        "public_profile_present": True,
        "linked_social_community": True,
        "linked_social_member_count": 1,
        "outbound_affiliations": 1,
        "inbound_affiliations": 0,
        "active_affiliations": 1,
        "pending_affiliations": 0,
        "active_member_count": 1,
        "active_node_count": 2,
        "active_policy_count": 1,
        "active_evidence_count": 1,
        "domain_exchange_status": "not_connected_in_this_slice",
        "cross_domain_discovery_status": "not_connected_in_this_slice",
        "external_finance_status": "not_connected_in_this_slice",
    }
    assert exchange_map["linked_social_community"] == {
        "id": clan_id,
        "name": "Network Exchange Market Circle",
        "status": "active",
    }
    lanes = {item["lane_key"]: item for item in exchange_map["lanes"]}
    assert lanes["internal_domain_anchor"]["status"] == "anchored"
    assert lanes["social_bridge_exchange"]["status"] == "linked"
    assert lanes["affiliation_exchange"]["status"] == "clan_affiliations_visible"
    assert lanes["affiliation_exchange"]["ready"] is False
    assert lanes["marketplace_exchange_boundary"]["status"] == "template_core"
    assert lanes["trust_evidence_exchange"]["status"] == "evidence_present"
    assert lanes["public_network_presence"]["status"] == "profile_ready"
    assert lanes["cross_domain_discovery_boundary"]["status"] == (
        "not_connected_in_this_slice"
    )
    assert lanes["external_finance_boundary"]["status"] == (
        "not_connected_in_this_slice"
    )
    assert exchange_map["primary_next_action"] == {
        "action_key": "review_exchange_boundaries",
        "label": "Review Community Domain network exchange boundaries",
        "route_hint": f"/community-domains/{domain_id}/network-presence",
        "requires_admin": True,
    }
    assert "does not create domain-to-domain exchange" in exchange_map["boundary"]
    assert "cross-domain discovery" in exchange_map["boundary"]
    assert "marketplace records" in exchange_map["boundary"]
    assert "Trust Passport entries" in exchange_map["boundary"]
    assert "payment instructions" in exchange_map["boundary"]
    assert "private member" in exchange_map["boundary"]
    assert "private/evidence/exchange-readiness.pdf" not in str(exchange_map)

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "clans": db.query(Clan).count(),
            "clan_members": db.query(ClanMembership).count(),
            "affiliations": db.query(CommunityDomainAffiliation).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_network_exchange_map_but_exchange_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "network-exchange-member@example.com")
    outsider = _seed_user(3, "network-exchange-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Network Exchange School Domain",
                "display_name": "Network Exchange School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
                "public_profile": "A school network with public-safe identity.",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        created_clan = client.post(
            "/clans/",
            json={
                "name": "Network Exchange School Circle",
                "description": "A private lightweight school Community.",
            },
        )
        assert created_clan.status_code == 201, created_clan.text
        clan_id = created_clan.json()["id"]

        with SessionLocal() as db:
            domain = db.get(CommunityDomain, domain_id)
            assert domain is not None
            domain.clan_id = clan_id
            db.commit()

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(
            f"/community-domains/{domain_id}/network-exchange-map"
        )
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(
            f"/community-domains/{domain_id}/network-exchange-map"
        )
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    exchange_map = member_map.json()["network_exchange_map"]
    assert exchange_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert exchange_map["summary"]["linked_social_community"] is True
    assert exchange_map["summary"]["linked_social_member_count"] is None
    assert exchange_map["summary"]["outbound_affiliations"] is None
    assert exchange_map["summary"]["inbound_affiliations"] is None
    assert exchange_map["summary"]["active_policy_count"] is None
    assert exchange_map["summary"]["active_evidence_count"] is None
    assert exchange_map["summary"]["domain_exchange_status"] == (
        "not_connected_in_this_slice"
    )
    assert exchange_map["linked_social_community"] == {
        "id": None,
        "name": None,
        "status": "hidden_for_member",
    }
    assert exchange_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_network_exchange",
        "label": "Ask a Community Domain admin to review network exchange readiness",
        "route_hint": None,
        "requires_admin": True,
    }

    lanes = {item["lane_key"]: item for item in exchange_map["lanes"]}
    assert lanes["internal_domain_anchor"]["route_hint"].endswith("/operating-map")
    assert lanes["social_bridge_exchange"]["route_hint"] is None
    assert lanes["affiliation_exchange"]["route_hint"] is None
    assert lanes["marketplace_exchange_boundary"]["route_hint"].endswith(
        "/economic-participation"
    )
    assert lanes["trust_evidence_exchange"]["route_hint"] is None
    assert lanes["cross_domain_discovery_boundary"]["route_hint"] is None
    assert lanes["external_finance_boundary"]["route_hint"] is None
    assert "private member" in exchange_map["boundary"]


def test_record_privacy_map_projects_record_boundaries_without_permission_writes(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "record-privacy-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Record Privacy Market Domain",
                "display_name": "Record Privacy Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
                "public_profile": "Public-safe privacy profile for a market domain.",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "trader"},
        )
        assert added_member.status_code == 201, added_member.text

        line = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Electronics Line",
                "node_type": "line",
                "node_kind": "market_line",
                "visibility_policy": "node_members",
            },
        )
        assert line.status_code == 201, line.text
        line_id = line.json()["node"]["id"]

        department = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Executive Committee",
                "parent_node_id": line_id,
                "node_type": "committee",
                "node_kind": "governance_committee",
                "visibility_policy": "admins",
            },
        )
        assert department.status_code == 201, department.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "record-privacy-review",
                "action_key": "record.review",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "line_admin",
                "policy_summary": "Private record evidence needs review.",
            },
        )
        assert policy.status_code == 201, policy.text

        review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "record.review",
                "community_node_id": line_id,
                "subject_user_id": member.id,
                "target_type": "domain_member",
                "target_id": str(member.id),
                "request_note": "Review private record handling.",
                "payload": {"record_type": "member standing note"},
            },
        )
        assert review.status_code == 201, review.text
        review_id = review.json()["action_review"]["id"]

        evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review_id}/evidence",
            json={
                "evidence_type": "document",
                "title": "Private standing note",
                "file_name": "private-standing-note.pdf",
                "storage_key": "private/evidence/private-standing-note.pdf",
            },
        )
        assert evidence.status_code == 201, evidence.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/record-privacy-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    privacy_map = payload["record_privacy_map"]
    assert privacy_map["editable"] is False
    assert privacy_map["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert privacy_map["summary"] == {
        "public_profile_present": True,
        "public_url_status": "open_product_decision",
        "active_node_count": 3,
        "visibility_policy_counts": {"members": 1, "node_members": 1, "admins": 1},
        "active_member_count": 2,
        "active_policy_count": 1,
        "review_record_count": 1,
        "open_review_count": 1,
        "active_evidence_count": 1,
        "marketplace_private_record_status": "not_exposed_in_this_slice",
        "finance_private_record_status": "not_connected_in_this_slice",
        "cross_domain_record_sharing_status": "not_connected_in_this_slice",
    }
    lanes = {item["lane_key"]: item for item in privacy_map["lanes"]}
    assert lanes["public_identity_boundary"]["status"] == "profile_ready"
    assert lanes["member_register_boundary"]["status"] == "members_present"
    assert lanes["operating_unit_visibility"]["status"] == "policies_present"
    assert lanes["governance_record_boundary"]["status"] == "policy_backed"
    assert lanes["review_payload_boundary"]["status"] == "open_reviews"
    assert lanes["evidence_storage_boundary"]["status"] == "evidence_present"
    assert lanes["marketplace_finance_boundary"]["status"] == (
        "not_connected_in_this_slice"
    )
    assert lanes["cross_domain_privacy_boundary"]["status"] == (
        "not_connected_in_this_slice"
    )
    assert privacy_map["primary_next_action"] == {
        "action_key": "review_open_private_record_decisions",
        "label": "Review open private-record decisions",
        "route_hint": f"/community-domains/{domain_id}/action-reviews/reviewer-queue",
        "requires_admin": True,
    }
    assert "does not change permissions" in privacy_map["boundary"]
    assert "expose member lists" in privacy_map["boundary"]
    assert "expose storage keys" in privacy_map["boundary"]
    assert "share records across institutions" in privacy_map["boundary"]
    assert "private/evidence/private-standing-note.pdf" not in str(privacy_map)

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_record_privacy_map_but_admin_record_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "record-privacy-map-member@example.com")
    outsider = _seed_user(3, "record-privacy-map-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Record Privacy School Domain",
                "display_name": "Record Privacy School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
                "public_profile": "Public-safe school privacy profile.",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        created_branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
                "visibility_policy": "node_members",
            },
        )
        assert created_branch.status_code == 201, created_branch.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(
            f"/community-domains/{domain_id}/record-privacy-map"
        )
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(
            f"/community-domains/{domain_id}/record-privacy-map"
        )
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    privacy_map = member_map.json()["record_privacy_map"]
    assert privacy_map["viewer"] == {"user_id": member.id, "can_admin": False}
    assert privacy_map["summary"]["public_profile_present"] is True
    assert privacy_map["summary"]["active_node_count"] == 2
    assert privacy_map["summary"]["visibility_policy_counts"] is None
    assert privacy_map["summary"]["active_member_count"] is None
    assert privacy_map["summary"]["active_policy_count"] is None
    assert privacy_map["summary"]["review_record_count"] is None
    assert privacy_map["summary"]["active_evidence_count"] is None
    assert privacy_map["summary"]["cross_domain_record_sharing_status"] == (
        "not_connected_in_this_slice"
    )
    assert privacy_map["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_record_privacy",
        "label": "Ask a Community Domain admin to review record privacy",
        "route_hint": None,
        "requires_admin": True,
    }

    lanes = {item["lane_key"]: item for item in privacy_map["lanes"]}
    assert lanes["public_identity_boundary"]["route_hint"].endswith(
        "/network-presence"
    )
    assert lanes["member_register_boundary"]["route_hint"] is None
    assert lanes["operating_unit_visibility"]["route_hint"].endswith("/rollout-tree")
    assert lanes["governance_record_boundary"]["route_hint"] is None
    assert lanes["review_payload_boundary"]["route_hint"] is None
    assert lanes["evidence_storage_boundary"]["route_hint"] is None
    assert lanes["marketplace_finance_boundary"]["route_hint"] is None
    assert lanes["cross_domain_privacy_boundary"]["route_hint"] is None
    assert "member directories" in privacy_map["boundary"]


def test_configuration_map_projects_template_adjustment_without_schema_writes(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "configuration-map-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Configuration Market Domain",
                "display_name": "Configuration Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
                "public_profile": "Public-safe configuration profile.",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "trader"},
        )
        assert added_member.status_code == 201, added_member.text

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

        placed = client.post(
            f"/community-domains/{domain_id}/nodes/{line_id}/members",
            json={"user_id": member.id, "role": "trader"},
        )
        assert placed.status_code == 201, placed.text

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "configuration-evidence-review",
                "action_key": "evidence.verify",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "line_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "evidence.verify",
                "community_node_id": line_id,
                "request_note": "Review configuration evidence privately.",
                "payload": {"claim": "configuration readiness"},
            },
        )
        assert review.status_code == 201, review.text
        review_id = review.json()["action_review"]["id"]

        evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review_id}/evidence",
            json={
                "evidence_type": "document",
                "title": "Configuration readiness note",
                "file_name": "configuration-readiness.pdf",
                "storage_key": "private/evidence/configuration-readiness.pdf",
            },
        )
        assert evidence.status_code == 201, evidence.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/configuration-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    configuration = payload["configuration_map"]
    assert configuration["editable"] is False
    assert configuration["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert configuration["template"]["template_key"] == "market_cooperative"
    assert configuration["template"]["marketplace_role"] == "core"
    assert configuration["summary"]["configuration_mode"] == (
        "template_preset_configuration"
    )
    assert configuration["summary"]["custom_schema_status"] == (
        "not_connected_in_this_slice"
    )
    assert configuration["summary"]["custom_billing_status"] == (
        "not_connected_in_this_slice"
    )
    assert configuration["summary"]["public_profile_present"] is True
    assert configuration["summary"]["active_node_count"] == 2
    assert configuration["summary"]["active_operating_unit_count"] == 1
    assert configuration["summary"]["observed_node_kinds"] == ["market_line"]
    assert configuration["summary"]["active_member_count"] == 2
    assert configuration["summary"]["active_node_member_count"] == 1
    assert configuration["summary"]["active_policy_count"] == 1
    assert configuration["summary"]["review_record_count"] == 1
    assert configuration["summary"]["active_evidence_count"] == 1
    assert configuration["blueprint"]["node_preset_count"] >= 1
    assert "shops" in configuration["blueprint"]["default_modules"]

    lanes = {item["lane_key"]: item for item in configuration["lanes"]}
    assert lanes["template_preset"]["status"] == "selected"
    assert lanes["identity_configuration"]["status"] == "profile_ready"
    assert lanes["structure_configuration"]["status"] == "configured"
    assert lanes["role_configuration"]["status"] == "configured"
    assert lanes["governance_configuration"]["status"] == "policy_backed"
    assert lanes["module_configuration"]["status"] == "template_modules"
    assert lanes["evidence_configuration"]["status"] == "evidence_present"
    assert lanes["package_allowance_configuration"]["status"] == "pilot_allowances"
    assert lanes["custom_schema_boundary"]["status"] == "configuration_not_schema_fork"
    assert configuration["primary_next_action"] == {
        "action_key": "review_configuration_boundaries",
        "label": "Review configuration boundaries",
        "route_hint": f"/community-domains/{domain_id}/institutional-profile",
        "requires_admin": True,
    }
    assert "custom schema" in configuration["boundary"]
    assert "custom billing package" in configuration["boundary"]
    assert "per-client code fork" in configuration["boundary"]
    assert "custom permission model" in configuration["boundary"]
    assert "private record exposure" in configuration["boundary"]
    assert "private/evidence/configuration-readiness.pdf" not in str(configuration)

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_configuration_map_but_admin_configuration_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "configuration-map-visible-member@example.com")
    outsider = _seed_user(3, "configuration-map-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Configuration School Domain",
                "display_name": "Configuration School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        created_branch = client.post(
            f"/community-domains/{domain_id}/nodes",
            json={
                "name": "Primary Branch",
                "node_type": "branch",
                "node_kind": "school_branch",
            },
        )
        assert created_branch.status_code == 201, created_branch.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(f"/community-domains/{domain_id}/configuration-map")
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(
            f"/community-domains/{domain_id}/configuration-map"
        )
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    configuration = member_map.json()["configuration_map"]
    assert configuration["viewer"] == {"user_id": member.id, "can_admin": False}
    assert configuration["template"]["template_key"] == "school_multi_branch"
    assert configuration["summary"]["configuration_mode"] == (
        "template_preset_configuration"
    )
    assert configuration["summary"]["public_profile_present"] is False
    assert configuration["summary"]["active_node_count"] == 2
    assert configuration["summary"]["active_operating_unit_count"] == 1
    assert configuration["summary"]["observed_node_kinds"] is None
    assert configuration["summary"]["active_member_count"] == 2
    assert configuration["summary"]["active_policy_count"] is None
    assert configuration["summary"]["review_record_count"] is None
    assert configuration["summary"]["active_evidence_count"] is None
    assert configuration["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_configuration",
        "label": "Ask a Community Domain admin to review configuration",
        "route_hint": None,
        "requires_admin": True,
    }

    lanes = {item["lane_key"]: item for item in configuration["lanes"]}
    assert lanes["template_preset"]["route_hint"].endswith("/institutional-profile")
    assert lanes["identity_configuration"]["route_hint"].endswith("/network-presence")
    assert lanes["structure_configuration"]["route_hint"].endswith("/rollout-tree")
    assert lanes["role_configuration"]["route_hint"] is None
    assert lanes["governance_configuration"]["route_hint"] is None
    assert lanes["module_configuration"]["route_hint"] is None
    assert lanes["evidence_configuration"]["route_hint"] is None
    assert lanes["custom_schema_boundary"]["route_hint"] is None
    assert "custom schema" in configuration["boundary"]
    assert "schema forks" in lanes["custom_schema_boundary"]["boundary"]


def test_compliance_map_projects_operational_risk_without_compliance_writes(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "compliance-map-member@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Compliance Market Domain",
                "display_name": "Compliance Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
                "public_profile": "Public-safe compliance profile.",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        with SessionLocal() as db:
            domain = db.get(CommunityDomain, domain_id)
            assert domain is not None
            domain.verification_status = "verified"
            db.commit()

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "trader"},
        )
        assert added_member.status_code == 201, added_member.text

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

        policy = client.post(
            f"/community-domains/{domain_id}/policies",
            json={
                "policy_key": "compliance-risk-review",
                "action_key": "compliance.review",
                "community_node_id": line_id,
                "scope_type": "node",
                "review_mode": "node_admin_review",
                "required_role": "line_admin",
            },
        )
        assert policy.status_code == 201, policy.text

        review = client.post(
            f"/community-domains/{domain_id}/action-reviews",
            json={
                "action_key": "compliance.review",
                "community_node_id": line_id,
                "request_note": "Review compliance posture privately.",
                "payload": {"claim": "compliance posture"},
            },
        )
        assert review.status_code == 201, review.text
        review_id = review.json()["action_review"]["id"]

        evidence = client.post(
            f"/community-domains/{domain_id}/action-reviews/{review_id}/evidence",
            json={
                "evidence_type": "document",
                "title": "Compliance posture note",
                "file_name": "compliance-posture.pdf",
                "storage_key": "private/evidence/compliance-posture.pdf",
            },
        )
        assert evidence.status_code == 201, evidence.text

        with SessionLocal() as db:
            before_counts = {
                "domains": db.query(CommunityDomain).count(),
                "nodes": db.query(CommunityNode).count(),
                "domain_members": db.query(CommunityDomainMembership).count(),
                "node_members": db.query(CommunityNodeMembership).count(),
                "policies": db.query(CommunityDomainPolicy).count(),
                "reviews": db.query(CommunityDomainActionReview).count(),
                "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
                "clans": db.query(Clan).count(),
                "trust_slips": db.query(TrustSlip).count(),
            }

        response = client.get(f"/community-domains/{domain_id}/compliance-map")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    compliance = payload["compliance_map"]
    assert compliance["editable"] is False
    assert compliance["viewer"] == {"user_id": owner.id, "can_admin": True}
    assert compliance["summary"]["verification_status"] == "verified"
    assert compliance["summary"]["public_profile_present"] is True
    assert compliance["summary"]["active_member_count"] == 2
    assert compliance["summary"]["active_node_count"] == 2
    assert compliance["summary"]["active_policy_count"] == 1
    assert compliance["summary"]["review_record_count"] == 1
    assert compliance["summary"]["open_review_count"] == 1
    assert compliance["summary"]["active_evidence_count"] == 1
    assert compliance["summary"]["compliance_engine_status"] == (
        "not_connected_in_this_slice"
    )
    assert compliance["summary"]["legal_advice_status"] == "not_provided"
    assert compliance["summary"]["payment_compliance_status"] == (
        "not_connected_in_this_slice"
    )
    assert compliance["summary"]["cross_domain_record_sharing_status"] == (
        "not_connected_in_this_slice"
    )

    lanes = {item["lane_key"]: item for item in compliance["lanes"]}
    assert lanes["authority_verification"]["status"] == "verified"
    assert lanes["governance_controls"]["status"] == "policy_backed"
    assert lanes["record_privacy_controls"]["status"] == "mapped"
    assert lanes["billing_payment_boundary"]["status"] == (
        "not_connected_in_this_slice"
    )
    assert lanes["public_claims_boundary"]["status"] == "profile_ready"
    assert lanes["marketplace_finance_boundary"]["status"] == (
        "not_connected_in_this_slice"
    )
    assert lanes["cross_domain_sharing_boundary"]["status"] == (
        "not_connected_in_this_slice"
    )
    assert lanes["audit_trail"]["status"] == "records_present"
    assert compliance["primary_next_action"] == {
        "action_key": "resolve_open_governance_reviews",
        "label": "Resolve open governance reviews",
        "route_hint": f"/community-domains/{domain_id}/action-reviews/reviewer-queue",
        "requires_admin": True,
    }
    assert "not legal advice" in compliance["boundary"]
    assert "does not certify compliance" in compliance["boundary"]
    assert "does not create payment instructions" in compliance["boundary"]
    assert "share records across institutions" in compliance["boundary"]
    assert "private member/review/evidence/finance records" in compliance["boundary"]
    assert "private/evidence/compliance-posture.pdf" not in str(compliance)

    with SessionLocal() as db:
        after_counts = {
            "domains": db.query(CommunityDomain).count(),
            "nodes": db.query(CommunityNode).count(),
            "domain_members": db.query(CommunityDomainMembership).count(),
            "node_members": db.query(CommunityNodeMembership).count(),
            "policies": db.query(CommunityDomainPolicy).count(),
            "reviews": db.query(CommunityDomainActionReview).count(),
            "evidence": db.query(CommunityDomainActionReviewEvidence).count(),
            "clans": db.query(Clan).count(),
            "trust_slips": db.query(TrustSlip).count(),
        }
    assert after_counts == before_counts


def test_member_can_read_compliance_map_but_admin_risk_counts_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "compliance-map-visible-member@example.com")
    outsider = _seed_user(3, "compliance-map-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created_domain = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Compliance School Domain",
                "display_name": "Compliance School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
            },
        )
        assert created_domain.status_code == 201, created_domain.text
        domain_id = created_domain.json()["community_domain"]["id"]

        added_member = client.post(
            f"/community-domains/{domain_id}/members",
            json={"user_id": member.id, "role": "member"},
        )
        assert added_member.status_code == 201, added_member.text

        app.dependency_overrides[get_current_user] = lambda: member
        member_map = client.get(f"/community-domains/{domain_id}/compliance-map")
        assert member_map.status_code == 200, member_map.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_map = client.get(f"/community-domains/{domain_id}/compliance-map")
        assert outsider_map.status_code == 403, outsider_map.text
        assert "active Community Domain members" in outsider_map.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    compliance = member_map.json()["compliance_map"]
    assert compliance["viewer"] == {"user_id": member.id, "can_admin": False}
    assert compliance["summary"]["verification_status"] == "unverified"
    assert compliance["summary"]["public_profile_present"] is False
    assert compliance["summary"]["active_member_count"] == 2
    assert compliance["summary"]["active_node_count"] == 1
    assert compliance["summary"]["active_policy_count"] is None
    assert compliance["summary"]["review_record_count"] is None
    assert compliance["summary"]["open_review_count"] is None
    assert compliance["summary"]["active_evidence_count"] is None
    assert compliance["summary"]["compliance_engine_status"] == (
        "not_connected_in_this_slice"
    )
    assert compliance["summary"]["legal_advice_status"] == "not_provided"
    assert compliance["primary_next_action"] == {
        "action_key": "ask_domain_admin_to_review_compliance_posture",
        "label": "Ask a Community Domain admin to review compliance posture",
        "route_hint": None,
        "requires_admin": True,
    }

    lanes = {item["lane_key"]: item for item in compliance["lanes"]}
    assert lanes["authority_verification"]["route_hint"] is None
    assert lanes["governance_controls"]["route_hint"] is None
    assert lanes["record_privacy_controls"]["route_hint"].endswith(
        "/record-privacy-map"
    )
    assert lanes["billing_payment_boundary"]["route_hint"] is None
    assert lanes["public_claims_boundary"]["route_hint"].endswith("/network-presence")
    assert lanes["marketplace_finance_boundary"]["route_hint"].endswith(
        "/economic-participation"
    )
    assert lanes["cross_domain_sharing_boundary"]["route_hint"] is None
    assert lanes["audit_trail"]["route_hint"] is None
    assert "not legal advice" in compliance["boundary"]
    assert "does not certify compliance" in compliance["boundary"]


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


def test_network_presence_projects_public_readiness_without_publishing(
    client: TestClient,
):
    owner = _seed_owner()

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Network Market Domain",
                "display_name": "Network Market Domain",
                "domain_type": "market_cooperative",
                "template_key": "market_cooperative",
                "public_profile": "A market association coordinating trusted traders.",
            },
        )
        assert created.status_code == 201, created.text
        domain_id = created.json()["community_domain"]["id"]

        response = client.get(f"/community-domains/{domain_id}/network-presence")
        assert response.status_code == 200, response.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    payload = response.json()
    assert payload["ok"] is True
    assert payload["community_domain_id"] == domain_id
    presence = payload["network_presence"]
    assert presence["editable"] is False
    assert presence["identity"]["domain_name"] == "network-market-domain"
    assert presence["identity"]["public_profile_present"] is True
    assert presence["identity"]["public_profile"] == (
        "A market association coordinating trusted traders."
    )
    assert presence["status"]["public_url_status"] == "open_product_decision"
    assert presence["status"]["public_url"] is None
    assert presence["status"]["verification_status"] == "unverified"
    assert presence["status"]["marketplace_role"] == "core"
    assert presence["primary_next_action"]["action_key"] == "prepare_verification"
    assert "does not publish a public page" in presence["boundary"]
    assert "/domains/:name" in presence["boundary"]
    assert "/community-domains/:name" in presence["boundary"]
    assert "create outward links" in presence["boundary"]
    assert "verify the domain" in presence["boundary"]
    assert "create marketplace exposure" in presence["boundary"]
    assert "create vault links" in presence["boundary"]
    assert "social Community bridge" in presence["boundary"]
    assert "private member activity" in presence["boundary"]

    lanes = {item["lane_key"]: item for item in presence["lanes"]}
    assert lanes["public_identity"]["status"] == "ready"
    assert lanes["public_identity"]["ready"] is True
    assert lanes["verified_domain_badge"]["status"] == "unverified"
    assert lanes["public_url"]["status"] == "open_product_decision"
    assert lanes["public_url"]["ready"] is False
    assert lanes["marketplace_exposure"]["status"] == "market_facing_template"
    assert lanes["marketplace_exposure"]["ready"] is True
    assert lanes["spotlight_exposure"]["status"] == "enabled_by_template"
    assert lanes["vault_links"]["status"] == "not_created_in_this_slice"
    assert lanes["social_community_bridge"]["status"] == "not_created_in_this_slice"
    assert "finalize a public URL" in lanes["public_url"]["boundary"]

    with SessionLocal() as db:
        domain = db.query(CommunityDomain).one()
        assert domain.status == "draft"
        assert domain.verification_status == "unverified"
        assert domain.clan_id is None
        assert db.query(CommunityDomainActionReview).count() == 0
        assert db.query(Clan).count() == 0


def test_member_can_read_network_presence_but_admin_routes_and_profile_are_hidden(
    client: TestClient,
):
    owner = _seed_owner()
    member = _seed_user(2, "network-member@example.com")
    outsider = _seed_user(3, "network-outsider@example.com")

    try:
        app.dependency_overrides[get_current_user] = lambda: owner
        created = client.post(
            "/community-domains/drafts",
            json={
                "domain_name": "Network School Domain",
                "display_name": "Network School Domain",
                "domain_type": "school",
                "template_key": "school_multi_branch",
                "public_profile": "A school network with several branches.",
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
        member_presence = client.get(
            f"/community-domains/{domain_id}/network-presence"
        )
        assert member_presence.status_code == 200, member_presence.text

        app.dependency_overrides[get_current_user] = lambda: outsider
        outsider_presence = client.get(
            f"/community-domains/{domain_id}/network-presence"
        )
        assert outsider_presence.status_code == 403, outsider_presence.text
        assert "active Community Domain members" in outsider_presence.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    presence = member_presence.json()["network_presence"]
    lanes = {item["lane_key"]: item for item in presence["lanes"]}
    assert presence["viewer"] == {"can_admin": False}
    assert presence["identity"]["public_profile_present"] is True
    assert presence["identity"]["public_profile"] is None
    assert presence["primary_next_action"] == {
        "action_key": "ask_domain_admin",
        "label": "Ask a Community Domain admin to prepare public presence",
        "route_hint": None,
        "requires_admin": True,
    }
    assert lanes["public_identity"]["route_hint"] is None
    assert lanes["verified_domain_badge"]["route_hint"] is None
    assert lanes["public_url"]["route_hint"] is None
    assert lanes["marketplace_exposure"]["route_hint"] is None
    assert presence["status"]["public_url"] is None
    assert presence["editable"] is False
    assert "private member activity" in presence["boundary"]


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
