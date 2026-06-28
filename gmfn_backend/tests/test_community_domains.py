from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, CommunityDomain, CommunityNode, User
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
    assert data["status"] == "draft"
    assert data["verification_status"] == "unverified"
    assert data["clan_id"] is None
    assert "does not create a social Community" in data["boundary"]

    root_node = data["root_node"]
    assert root_node["name"] == "Dominion College Abuja"
    assert root_node["node_type"] == "root"
    assert root_node["node_kind"] == "institution"
    assert root_node["depth"] == 0

    with SessionLocal() as db:
        assert db.query(CommunityDomain).count() == 1
        assert db.query(CommunityNode).count() == 1
        assert db.query(Clan).count() == 0
        assert db.query(ClanMembership).count() == 0


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
