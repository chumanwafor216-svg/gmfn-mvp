from __future__ import annotations

from fastapi.testclient import TestClient

from app.core.auth import get_current_user
from app.db.database import SessionLocal
from app.db.models import (
    Clan,
    ClanMembership,
    CommunityDomain,
    CommunityDomainActionReview,
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
        assert "specific business route" in decision.json()["boundary"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        assert db.query(CommunityDomainPolicy).count() == 1
        assert db.query(CommunityDomainActionReview).count() == 1


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

        app.dependency_overrides[get_current_user] = lambda: branch_admin
        node_reviews = client.get(
            f"/community-domains/{domain_id}/action-reviews",
            params={"community_node_id": node_id},
        )
        assert node_reviews.status_code == 200, node_reviews.text
        assert node_reviews.json()["total"] == 1

        node_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{node_review['id']}/decision",
            json={"decision": "approve"},
        )
        assert node_decision.status_code == 200, node_decision.text
        assert node_decision.json()["action_review"]["status"] == "approved"

        domain_decision = client.post(
            f"/community-domains/{domain_id}/action-reviews/{domain_review['id']}/decision",
            json={"decision": "approve"},
        )
        assert domain_decision.status_code == 403, domain_decision.text
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
        assert data["applied"]["type"] == "node_member"
        assert data["applied"]["created"] is True
        assert data["applied"]["membership"]["user_id"] == teacher.id
        assert data["applied"]["membership"]["role"] == "committee_member"
        assert data["applied"]["membership"]["title"] == "Welfare committee"

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
        assert data["applied"]["type"] == "domain_member"
        assert data["applied"]["created"] is True
        assert data["applied"]["membership"]["user_id"] == new_member.id
        assert data["applied"]["membership"]["title"] == "Registered union member"
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
