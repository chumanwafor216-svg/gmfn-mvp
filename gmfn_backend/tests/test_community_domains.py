from __future__ import annotations

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
        assert "required approval count" in decision.json()["boundary"]
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
        domain_summary = client.get(
            f"/community-domains/{domain_id}/action-reviews/summary"
        )
        assert domain_summary.status_code == 200, domain_summary.text
        domain_summary_data = domain_summary.json()
        assert domain_summary_data["community_node_id"] is None
        assert domain_summary_data["total"] == 4
        assert domain_summary_data["attention_total"] == 1
        assert domain_summary_data["ready_to_apply_total"] == 1
        assert domain_summary_data["terminal_total"] == 2
        assert domain_summary_data["by_status"] == {
            "applied": 1,
            "approved": 1,
            "cancelled": 1,
            "pending": 1,
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
