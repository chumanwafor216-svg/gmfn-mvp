from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.db.database import SessionLocal
from app.db.models import (
    Clan,
    ClanMembership,
    CommunityDomain,
    CommunityDomainMembership,
    CommunityNode,
    CommunityNodeMembership,
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
        domain_membership = db.query(CommunityDomainMembership).one()
        assert domain_membership.user_id == owner.id
        assert domain_membership.role == "owner"
        assert domain_membership.status == "active"
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
