from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import (
    CommunityDomain,
    CommunityDomainActionReview,
    CommunityDomainActionReviewDecision,
    CommunityDomainMembership,
    CommunityDomainPolicy,
    CommunityNode,
    CommunityNodeMembership,
    User,
)


router = APIRouter(prefix="/community-domains", tags=["community-domains"])

DOMAIN_NAME_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$")
RESERVED_DOMAIN_NAMES = {
    "admin",
    "api",
    "app",
    "billing",
    "community",
    "domains",
    "gmfn",
    "gsn",
    "login",
    "root",
    "support",
    "system",
    "trust",
}
DOMAIN_ADMIN_ROLES = {"owner", "admin", "domain_admin"}
NODE_ADMIN_ROLES = {
    "node_admin",
    "branch_admin",
    "line_admin",
    "department_admin",
    "committee_admin",
    "chapter_admin",
}
NODE_LOCAL_ASSIGNABLE_ROLES = {
    "member",
    "staff",
    "teacher",
    "trader",
    "student",
    "parent",
    "committee_member",
    "line_member",
}


def _clean_str(value: Optional[str], default: str = "") -> str:
    text = str(value or "").strip()
    return text or default


def _clean_role(value: Optional[str], default: str = "member") -> str:
    return _clean_str(value, default).lower().replace(" ", "_")


def normalize_domain_name(value: str) -> str:
    text = _clean_str(value).lower()
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"[^a-z0-9-]", "", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text


def _domain_name_unavailable_reason(domain_name: str) -> Optional[str]:
    if not domain_name:
        return "domain_name_required"
    if domain_name in RESERVED_DOMAIN_NAMES:
        return "reserved_domain_name"
    if not DOMAIN_NAME_PATTERN.match(domain_name):
        return "invalid_domain_name"
    return None


def _domain_available_payload(db: Session, raw_domain_name: str) -> dict[str, Any]:
    normalized = normalize_domain_name(raw_domain_name)
    reason = _domain_name_unavailable_reason(normalized)
    if reason:
        return {
            "domain_name": raw_domain_name,
            "normalized_domain_name": normalized,
            "available": False,
            "reason": reason,
        }

    existing = (
        db.query(CommunityDomain)
        .filter(CommunityDomain.domain_name == normalized)
        .first()
    )
    if existing:
        return {
            "domain_name": raw_domain_name,
            "normalized_domain_name": normalized,
            "available": False,
            "reason": "domain_name_taken",
        }

    return {
        "domain_name": raw_domain_name,
        "normalized_domain_name": normalized,
        "available": True,
        "reason": None,
    }


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value is not None else None


def _json_dump(value: Optional[dict[str, Any]]) -> Optional[str]:
    if not value:
        return None
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def _json_load(value: Optional[str]) -> dict[str, Any]:
    if not value:
        return {}
    try:
        data = json.loads(value)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _node_payload(node: Optional[CommunityNode]) -> Optional[dict[str, Any]]:
    if node is None:
        return None
    return {
        "id": int(node.id),
        "community_domain_id": int(node.community_domain_id),
        "parent_node_id": int(node.parent_node_id) if node.parent_node_id is not None else None,
        "name": node.name,
        "node_type": node.node_type,
        "node_kind": node.node_kind,
        "path": node.path,
        "depth": int(node.depth or 0),
        "description": node.description,
        "sort_order": int(node.sort_order or 0),
        "visibility_policy": node.visibility_policy,
        "inherits_parent_policy": bool(node.inherits_parent_policy),
        "status": node.status,
    }


def _domain_member_payload(row: CommunityDomainMembership) -> dict[str, Any]:
    user = getattr(row, "user", None)
    return {
        "id": int(row.id),
        "community_domain_id": int(row.community_domain_id),
        "user_id": int(row.user_id),
        "user_email": getattr(user, "email", None),
        "user_display_name": getattr(user, "display_name", None),
        "role": row.role,
        "status": row.status,
        "title": row.title,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _node_member_payload(row: CommunityNodeMembership) -> dict[str, Any]:
    user = getattr(row, "user", None)
    node = getattr(row, "community_node", None)
    return {
        "id": int(row.id),
        "community_domain_id": int(row.community_domain_id),
        "community_node_id": int(row.community_node_id),
        "community_node_name": getattr(node, "name", None),
        "user_id": int(row.user_id),
        "user_email": getattr(user, "email", None),
        "user_display_name": getattr(user, "display_name", None),
        "role": row.role,
        "status": row.status,
        "title": row.title,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _policy_payload(row: CommunityDomainPolicy) -> dict[str, Any]:
    node = getattr(row, "community_node", None)
    return {
        "id": int(row.id),
        "community_domain_id": int(row.community_domain_id),
        "community_node_id": int(row.community_node_id) if row.community_node_id is not None else None,
        "community_node_name": getattr(node, "name", None),
        "policy_key": row.policy_key,
        "action_key": row.action_key,
        "scope_type": row.scope_type,
        "review_mode": row.review_mode,
        "required_role": row.required_role,
        "status": row.status,
        "policy_summary": row.policy_summary,
        "config": _json_load(row.config_json),
        "created_by_user_id": int(row.created_by_user_id),
        "updated_by_user_id": int(row.updated_by_user_id) if row.updated_by_user_id is not None else None,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _action_review_payload(row: CommunityDomainActionReview) -> dict[str, Any]:
    node = getattr(row, "community_node", None)
    policy = getattr(row, "policy", None)
    decisions = sorted(
        getattr(row, "decisions", []) or [],
        key=lambda item: (item.created_at or datetime.min.replace(tzinfo=timezone.utc), int(item.id or 0)),
    )
    approval_count = sum(1 for item in decisions if _clean_role(item.decision) == "approve")
    return {
        "id": int(row.id),
        "community_domain_id": int(row.community_domain_id),
        "community_node_id": int(row.community_node_id) if row.community_node_id is not None else None,
        "community_node_name": getattr(node, "name", None),
        "policy_id": int(row.policy_id) if row.policy_id is not None else None,
        "policy_key": getattr(policy, "policy_key", None),
        "action_key": row.action_key,
        "requested_by_user_id": int(row.requested_by_user_id),
        "subject_user_id": int(row.subject_user_id) if row.subject_user_id is not None else None,
        "decided_by_user_id": int(row.decided_by_user_id) if row.decided_by_user_id is not None else None,
        "target_type": row.target_type,
        "target_id": row.target_id,
        "status": row.status,
        "decision": row.decision,
        "request_note": row.request_note,
        "decision_note": row.decision_note,
        "payload": _json_load(row.payload_json),
        "required_approvals": _required_review_approvals(row),
        "approval_count": approval_count,
        "decisions": [_action_review_decision_payload(item) for item in decisions],
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
        "decided_at": _iso(row.decided_at),
    }


def _action_review_decision_payload(row: CommunityDomainActionReviewDecision) -> dict[str, Any]:
    decider = getattr(row, "decider", None)
    return {
        "id": int(row.id),
        "action_review_id": int(row.action_review_id),
        "community_domain_id": int(row.community_domain_id),
        "community_node_id": int(row.community_node_id) if row.community_node_id is not None else None,
        "decided_by_user_id": int(row.decided_by_user_id),
        "decided_by_user_email": getattr(decider, "email", None),
        "decision": row.decision,
        "decision_note": row.decision_note,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _domain_payload(
    domain: CommunityDomain,
    *,
    root_node: Optional[CommunityNode] = None,
) -> dict[str, Any]:
    return {
        "id": int(domain.id),
        "domain_name": domain.domain_name,
        "display_name": domain.display_name,
        "domain_type": domain.domain_type,
        "template_key": domain.template_key,
        "owner_user_id": int(domain.owner_user_id),
        "clan_id": int(domain.clan_id) if domain.clan_id is not None else None,
        "status": domain.status,
        "verification_status": domain.verification_status,
        "country": domain.country,
        "state": domain.state,
        "public_profile": domain.public_profile,
        "created_at": _iso(domain.created_at),
        "updated_at": _iso(domain.updated_at),
        "root_node": _node_payload(root_node),
        "boundary": (
            "Draft only. This does not create a social Community, activate billing, "
            "verify ownership, or launch a public institutional domain."
        ),
    }


class CommunityDomainDraftIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    domain_name: str = Field(..., min_length=2, max_length=80)
    display_name: str = Field(..., min_length=2, max_length=160)
    domain_type: str = Field(default="generic_association", max_length=64)
    template_key: Optional[str] = Field(default=None, max_length=64)
    country: Optional[str] = Field(default=None, max_length=80)
    state: Optional[str] = Field(default=None, max_length=120)
    public_profile: Optional[str] = Field(default=None, max_length=1200)


class CommunityNodeCreateIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    name: str = Field(..., min_length=2, max_length=160)
    parent_node_id: Optional[int] = Field(default=None, ge=1)
    node_type: str = Field(default="unit", max_length=64)
    node_kind: str = Field(default="administrative", max_length=64)
    description: Optional[str] = Field(default=None, max_length=1000)
    sort_order: int = Field(default=0, ge=0, le=100000)
    visibility_policy: str = Field(default="members", max_length=32)
    inherits_parent_policy: bool = True
    status: str = Field(default="active", max_length=24)


class CommunityDomainMemberUpsertIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    user_id: int = Field(..., ge=1)
    role: str = Field(default="member", max_length=32)
    status: str = Field(default="active", max_length=24)
    title: Optional[str] = Field(default=None, max_length=120)


class CommunityNodeMemberUpsertIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    user_id: int = Field(..., ge=1)
    role: str = Field(default="member", max_length=32)
    status: str = Field(default="active", max_length=24)
    title: Optional[str] = Field(default=None, max_length=120)


class CommunityDomainPolicyUpsertIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    policy_key: str = Field(..., min_length=2, max_length=96)
    action_key: str = Field(..., min_length=2, max_length=96)
    community_node_id: Optional[int] = Field(default=None, ge=1)
    scope_type: str = Field(default="domain", max_length=24)
    review_mode: str = Field(default="domain_admin_review", max_length=48)
    required_role: Optional[str] = Field(default=None, max_length=48)
    status: str = Field(default="active", max_length=24)
    policy_summary: Optional[str] = Field(default=None, max_length=1200)
    config: Optional[dict[str, Any]] = None


class CommunityDomainActionReviewCreateIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    action_key: str = Field(..., min_length=2, max_length=96)
    community_node_id: Optional[int] = Field(default=None, ge=1)
    policy_id: Optional[int] = Field(default=None, ge=1)
    subject_user_id: Optional[int] = Field(default=None, ge=1)
    target_type: Optional[str] = Field(default=None, max_length=64)
    target_id: Optional[str] = Field(default=None, max_length=96)
    request_note: Optional[str] = Field(default=None, max_length=1200)
    payload: Optional[dict[str, Any]] = None


class CommunityDomainActionReviewDecisionIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    decision: str = Field(..., pattern="^(approve|reject|needs_changes)$")
    decision_note: Optional[str] = Field(default=None, max_length=1200)


def _get_domain_or_404(db: Session, community_domain_id: int) -> CommunityDomain:
    domain = db.get(CommunityDomain, int(community_domain_id))
    if domain is None:
        raise HTTPException(status_code=404, detail="Community Domain not found")
    return domain


def _get_user_or_404(db: Session, user_id: int) -> User:
    user = db.get(User, int(user_id))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def _get_node_or_404(
    db: Session,
    *,
    community_domain_id: int,
    community_node_id: int,
) -> CommunityNode:
    node = (
        db.query(CommunityNode)
        .filter(CommunityNode.id == int(community_node_id))
        .filter(CommunityNode.community_domain_id == int(community_domain_id))
        .first()
    )
    if node is None:
        raise HTTPException(
            status_code=404,
            detail="Node was not found inside this Community Domain.",
        )
    return node


def _get_policy_or_404(
    db: Session,
    *,
    community_domain_id: int,
    policy_id: int,
) -> CommunityDomainPolicy:
    policy = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.id == int(policy_id))
        .filter(CommunityDomainPolicy.community_domain_id == int(community_domain_id))
        .first()
    )
    if policy is None:
        raise HTTPException(status_code=404, detail="Community Domain policy not found")
    return policy


def _get_action_review_or_404(
    db: Session,
    *,
    community_domain_id: int,
    review_id: int,
) -> CommunityDomainActionReview:
    row = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.id == int(review_id))
        .filter(CommunityDomainActionReview.community_domain_id == int(community_domain_id))
        .first()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Community Domain action review not found")
    return row


def _required_review_approvals(row: CommunityDomainActionReview) -> int:
    policy = getattr(row, "policy", None)
    config = _json_load(getattr(policy, "config_json", None))
    raw_value = config.get("min_approvals", config.get("min_reviewers", 1))
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        value = 1
    return max(1, min(value, 25))


def _payload_int(payload: dict[str, Any], key: str) -> int:
    try:
        value = int(payload.get(key) or 0)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "invalid_action_review_payload",
                "message": f"Action review payload must include a valid {key}.",
            },
        ) from exc
    if value <= 0:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "invalid_action_review_payload",
                "message": f"Action review payload must include a valid {key}.",
            },
        )
    return value


def _domain_membership_for_user(
    db: Session,
    *,
    community_domain_id: int,
    user_id: int,
) -> Optional[CommunityDomainMembership]:
    return (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == int(community_domain_id))
        .filter(CommunityDomainMembership.user_id == int(user_id))
        .first()
    )


def _active_domain_membership_for_user(
    db: Session,
    *,
    community_domain_id: int,
    user_id: int,
) -> Optional[CommunityDomainMembership]:
    membership = _domain_membership_for_user(
        db,
        community_domain_id=int(community_domain_id),
        user_id=int(user_id),
    )
    if membership is None:
        return None
    if _clean_role(membership.status, "inactive") != "active":
        return None
    return membership


def _has_domain_admin_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> bool:
    if _clean_role(getattr(current_user, "role", "")) == "admin":
        return True
    if int(domain.owner_user_id) == int(current_user.id):
        return True

    membership = _active_domain_membership_for_user(
        db,
        community_domain_id=int(domain.id),
        user_id=int(current_user.id),
    )
    return membership is not None and _clean_role(membership.role) in DOMAIN_ADMIN_ROLES


def _require_domain_admin_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> None:
    if _has_domain_admin_scope(db, domain=domain, current_user=current_user):
        return
    raise HTTPException(
        status_code=403,
        detail="Only a Community Domain owner or domain admin can perform this action.",
    )


def _require_domain_member_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    current_user: User,
) -> None:
    if _has_domain_admin_scope(db, domain=domain, current_user=current_user):
        return
    membership = _active_domain_membership_for_user(
        db,
        community_domain_id=int(domain.id),
        user_id=int(current_user.id),
    )
    if membership is not None:
        return
    raise HTTPException(
        status_code=403,
        detail="Only active Community Domain members can view this domain.",
    )


def _active_node_membership_for_user(
    db: Session,
    *,
    community_node_id: int,
    user_id: int,
) -> Optional[CommunityNodeMembership]:
    membership = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_node_id == int(community_node_id))
        .filter(CommunityNodeMembership.user_id == int(user_id))
        .first()
    )
    if membership is None:
        return None
    if _clean_role(membership.status, "inactive") != "active":
        return None
    return membership


def _has_node_admin_scope(
    db: Session,
    *,
    node: CommunityNode,
    current_user: User,
) -> bool:
    membership = _active_node_membership_for_user(
        db,
        community_node_id=int(node.id),
        user_id=int(current_user.id),
    )
    return membership is not None and _clean_role(membership.role) in NODE_ADMIN_ROLES


def _require_node_or_domain_admin_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
    current_user: User,
) -> str:
    if _has_domain_admin_scope(db, domain=domain, current_user=current_user):
        return "domain_admin"
    if _has_node_admin_scope(db, node=node, current_user=current_user):
        return "node_admin"
    raise HTTPException(
        status_code=403,
        detail="Only a domain admin or node admin can manage this node.",
    )


def _require_policy_reviewer_role(
    db: Session,
    *,
    domain: CommunityDomain,
    node: Optional[CommunityNode],
    policy: Optional[CommunityDomainPolicy],
    current_user: User,
) -> None:
    required_role = _clean_str(getattr(policy, "required_role", None)).lower().replace(" ", "_")
    if not required_role:
        return
    if _clean_role(getattr(current_user, "role", "")) == "admin":
        return
    if int(domain.owner_user_id) == int(current_user.id) and required_role in {"owner", "domain_admin", "admin"}:
        return

    domain_membership = _active_domain_membership_for_user(
        db,
        community_domain_id=int(domain.id),
        user_id=int(current_user.id),
    )
    if domain_membership is not None and _clean_role(domain_membership.role) == required_role:
        return

    if node is not None:
        node_membership = _active_node_membership_for_user(
            db,
            community_node_id=int(node.id),
            user_id=int(current_user.id),
        )
        if node_membership is not None and _clean_role(node_membership.role) == required_role:
            return

    raise HTTPException(
        status_code=403,
        detail={
            "code": "community_domain_reviewer_role_required",
            "message": f"This review requires a reviewer with the {required_role} role.",
        },
    )


def _can_decide_action_review(
    db: Session,
    *,
    domain: CommunityDomain,
    row: CommunityDomainActionReview,
    current_user: User,
) -> bool:
    if _clean_role(row.status) not in {"pending", "pending_review"}:
        return False

    node: Optional[CommunityNode] = None
    try:
        if row.community_node_id is not None:
            node = _get_node_or_404(
                db,
                community_domain_id=int(domain.id),
                community_node_id=int(row.community_node_id),
            )
            _require_node_or_domain_admin_scope(
                db,
                domain=domain,
                node=node,
                current_user=current_user,
            )
        else:
            _require_domain_admin_scope(db, domain=domain, current_user=current_user)
        _require_policy_reviewer_role(
            db,
            domain=domain,
            node=node,
            policy=getattr(row, "policy", None),
            current_user=current_user,
        )
    except HTTPException:
        return False

    return True


def _has_user_decision(row: CommunityDomainActionReview, user_id: int) -> bool:
    return any(
        int(decision.decided_by_user_id) == int(user_id)
        for decision in (getattr(row, "decisions", []) or [])
    )


def _find_root_node(db: Session, community_domain_id: int) -> Optional[CommunityNode]:
    return (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == int(community_domain_id))
        .filter(CommunityNode.parent_node_id.is_(None))
        .order_by(CommunityNode.depth.asc(), CommunityNode.id.asc())
        .first()
    )


def _matching_policy(
    db: Session,
    *,
    community_domain_id: int,
    action_key: str,
    community_node_id: Optional[int],
) -> Optional[CommunityDomainPolicy]:
    query = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == int(community_domain_id))
        .filter(CommunityDomainPolicy.action_key == _clean_role(action_key))
        .filter(CommunityDomainPolicy.status == "active")
    )
    if community_node_id is not None:
        node_policy = (
            query.filter(CommunityDomainPolicy.community_node_id == int(community_node_id))
            .order_by(CommunityDomainPolicy.id.desc())
            .first()
        )
        if node_policy is not None:
            return node_policy
    return (
        query.filter(CommunityDomainPolicy.community_node_id.is_(None))
        .order_by(CommunityDomainPolicy.id.desc())
        .first()
    )


@router.get("/availability", response_model=dict[str, Any])
def check_community_domain_availability(
    domain_name: str = Query(..., min_length=1, max_length=120),
    db: Session = Depends(get_db),
):
    return _domain_available_payload(db, domain_name)


@router.post("/drafts", status_code=201, response_model=dict[str, Any])
def create_community_domain_draft(
    payload: CommunityDomainDraftIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    availability = _domain_available_payload(db, payload.domain_name)
    if not availability["available"]:
        raise HTTPException(
            status_code=409,
            detail={
                "code": availability["reason"],
                "message": "This Community Domain name is not available.",
                "availability": availability,
            },
        )

    domain_type = _clean_str(payload.domain_type, "generic_association")
    template_key = _clean_str(payload.template_key, domain_type)

    domain = CommunityDomain(
        domain_name=availability["normalized_domain_name"],
        display_name=_clean_str(payload.display_name),
        domain_type=domain_type,
        template_key=template_key,
        owner_user_id=int(current_user.id),
        status="draft",
        verification_status="unverified",
        country=_clean_str(payload.country) or None,
        state=_clean_str(payload.state) or None,
        public_profile=_clean_str(payload.public_profile) or None,
    )
    db.add(domain)

    try:
        db.flush()
        root_node = CommunityNode(
            community_domain_id=int(domain.id),
            name=domain.display_name,
            node_type="root",
            node_kind="institution",
            path=f"/{int(domain.id)}",
            depth=0,
            visibility_policy="members",
            inherits_parent_policy=True,
            status="active",
        )
        db.add(root_node)
        db.add(
            CommunityDomainMembership(
                community_domain_id=int(domain.id),
                user_id=int(current_user.id),
                role="owner",
                status="active",
                title="Domain owner",
            )
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "domain_name_taken",
                "message": "This Community Domain name is already reserved.",
            },
        ) from exc

    db.refresh(domain)
    db.refresh(root_node)

    return {
        "ok": True,
        "community_domain": _domain_payload(domain, root_node=root_node),
    }


@router.get("/{community_domain_id}", response_model=dict[str, Any])
def get_community_domain(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    return {
        "ok": True,
        "community_domain": _domain_payload(
            domain,
            root_node=_find_root_node(db, community_domain_id=int(domain.id)),
        ),
    }


@router.get("/{community_domain_id}/nodes", response_model=dict[str, Any])
def list_community_domain_nodes(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)

    nodes = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == int(domain.id))
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "items": [_node_payload(node) for node in nodes],
        "total": len(nodes),
        "boundary": (
            "Structure only. Nodes organize the institution but do not by "
            "themselves grant membership, payment rights, verification, or governance authority."
        ),
    }


@router.post("/{community_domain_id}/nodes", status_code=201, response_model=dict[str, Any])
def create_community_domain_node(
    community_domain_id: int,
    payload: CommunityNodeCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    parent_node: Optional[CommunityNode]
    if payload.parent_node_id is None:
        parent_node = _find_root_node(db, community_domain_id=int(domain.id))
        if parent_node is None:
            raise HTTPException(
                status_code=409,
                detail="Community Domain does not have a root node yet.",
            )
    else:
        parent_node = (
            db.query(CommunityNode)
            .filter(CommunityNode.id == int(payload.parent_node_id))
            .filter(CommunityNode.community_domain_id == int(domain.id))
            .first()
        )
        if parent_node is None:
            raise HTTPException(
                status_code=404,
                detail="Parent node was not found inside this Community Domain.",
            )

    node = CommunityNode(
        community_domain_id=int(domain.id),
        parent_node_id=int(parent_node.id),
        name=_clean_str(payload.name),
        node_type=_clean_str(payload.node_type, "unit"),
        node_kind=_clean_str(payload.node_kind, "administrative"),
        depth=int(parent_node.depth or 0) + 1,
        description=_clean_str(payload.description) or None,
        sort_order=int(payload.sort_order or 0),
        visibility_policy=_clean_str(payload.visibility_policy, "members"),
        inherits_parent_policy=bool(payload.inherits_parent_policy),
        status=_clean_str(payload.status, "active"),
    )
    db.add(node)

    try:
        db.flush()
        parent_path = _clean_str(parent_node.path, f"/{int(domain.id)}")
        node.path = f"{parent_path}/{int(node.id)}"
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_node_name_exists",
                "message": "A node with this name already exists under the same parent.",
            },
        ) from exc

    db.refresh(node)

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node": _node_payload(node),
        "boundary": (
            "Structure only. This node does not create a separate Community Domain, "
            "social Community, billing account, or verified branch."
        ),
    }


@router.get("/{community_domain_id}/members", response_model=dict[str, Any])
def list_community_domain_members(
    community_domain_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    rows = (
        db.query(CommunityDomainMembership)
        .filter(CommunityDomainMembership.community_domain_id == int(domain.id))
        .order_by(
            CommunityDomainMembership.status.asc(),
            CommunityDomainMembership.role.asc(),
            CommunityDomainMembership.id.asc(),
        )
        .all()
    )
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "items": [_domain_member_payload(row) for row in rows],
        "total": len(rows),
        "boundary": (
            "Institutional membership only. This does not create a social Community "
            "membership, payment right, loan approval, or verified legal authority."
        ),
    }


@router.post("/{community_domain_id}/members", status_code=201, response_model=dict[str, Any])
def upsert_community_domain_member(
    community_domain_id: int,
    payload: CommunityDomainMemberUpsertIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_admin_scope(db, domain=domain, current_user=current_user)
    _get_user_or_404(db, payload.user_id)
    requested_role = _clean_role(payload.role, "member")
    if requested_role == "owner" and int(payload.user_id) != int(domain.owner_user_id):
        raise HTTPException(
            status_code=403,
            detail="Only the recorded Community Domain owner can hold the owner role.",
        )
    if int(payload.user_id) == int(domain.owner_user_id) and requested_role != "owner":
        raise HTTPException(
            status_code=403,
            detail="The recorded Community Domain owner role cannot be reassigned here.",
        )

    membership = _domain_membership_for_user(
        db,
        community_domain_id=int(domain.id),
        user_id=int(payload.user_id),
    )
    created = membership is None
    if membership is None:
        membership = CommunityDomainMembership(
            community_domain_id=int(domain.id),
            user_id=int(payload.user_id),
        )
        db.add(membership)

    membership.role = requested_role
    membership.status = _clean_str(payload.status, "active")
    membership.title = _clean_str(payload.title) or None

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_member_exists",
                "message": "This user is already a member of the Community Domain.",
            },
        ) from exc

    db.refresh(membership)
    return {
        "ok": True,
        "created": created,
        "community_domain_id": int(domain.id),
        "membership": _domain_member_payload(membership),
        "boundary": (
            "Institutional membership only. This does not create a social Community "
            "membership. Node placement, governance authority, billing authority, "
            "and verification require their own scoped records."
        ),
    }


@router.get("/{community_domain_id}/nodes/{community_node_id}/members", response_model=dict[str, Any])
def list_community_node_members(
    community_domain_id: int,
    community_node_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(community_node_id),
    )
    _require_node_or_domain_admin_scope(
        db,
        domain=domain,
        node=node,
        current_user=current_user,
    )

    rows = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == int(domain.id))
        .filter(CommunityNodeMembership.community_node_id == int(node.id))
        .order_by(
            CommunityNodeMembership.status.asc(),
            CommunityNodeMembership.role.asc(),
            CommunityNodeMembership.id.asc(),
        )
        .all()
    )
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "community_node_id": int(node.id),
        "items": [_node_member_payload(row) for row in rows],
        "total": len(rows),
        "boundary": (
            "Node membership says where a domain member belongs. It does not by "
            "itself grant governance authority, payment authority, or verification."
        ),
    }


@router.post("/{community_domain_id}/nodes/{community_node_id}/members", status_code=201, response_model=dict[str, Any])
def upsert_community_node_member(
    community_domain_id: int,
    community_node_id: int,
    payload: CommunityNodeMemberUpsertIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(community_node_id),
    )
    scope = _require_node_or_domain_admin_scope(
        db,
        domain=domain,
        node=node,
        current_user=current_user,
    )
    _get_user_or_404(db, payload.user_id)
    requested_role = _clean_role(payload.role, "member")
    if scope == "node_admin" and requested_role not in NODE_LOCAL_ASSIGNABLE_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Node admins can assign local member roles only.",
        )

    domain_membership = _domain_membership_for_user(
        db,
        community_domain_id=int(domain.id),
        user_id=int(payload.user_id),
    )
    if domain_membership is None or _clean_str(domain_membership.status).lower() != "active":
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_membership_required",
                "message": "Add this user as an active Community Domain member before placing them in a node.",
            },
        )

    membership = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_node_id == int(node.id))
        .filter(CommunityNodeMembership.user_id == int(payload.user_id))
        .first()
    )
    created = membership is None
    if membership is None:
        membership = CommunityNodeMembership(
            community_domain_id=int(domain.id),
            community_node_id=int(node.id),
            user_id=int(payload.user_id),
        )
        db.add(membership)

    membership.role = requested_role
    membership.status = _clean_str(payload.status, "active")
    membership.title = _clean_str(payload.title) or None

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_node_member_exists",
                "message": "This user is already assigned to this Community Domain node.",
            },
        ) from exc

    db.refresh(membership)
    return {
        "ok": True,
        "created": created,
        "community_domain_id": int(domain.id),
        "community_node_id": int(node.id),
        "membership": _node_member_payload(membership),
        "boundary": (
            "Node membership scopes belonging inside the institution. Governance "
            "powers still need a policy/action-review layer before delegation is complete."
        ),
    }


@router.get("/{community_domain_id}/policies", response_model=dict[str, Any])
def list_community_domain_policies(
    community_domain_id: int,
    community_node_id: Optional[int] = Query(default=None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    if community_node_id is not None:
        _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(community_node_id),
        )

    query = db.query(CommunityDomainPolicy).filter(
        CommunityDomainPolicy.community_domain_id == int(domain.id)
    )
    if community_node_id is not None:
        query = query.filter(CommunityDomainPolicy.community_node_id == int(community_node_id))

    rows = query.order_by(
        CommunityDomainPolicy.status.asc(),
        CommunityDomainPolicy.scope_type.asc(),
        CommunityDomainPolicy.action_key.asc(),
        CommunityDomainPolicy.id.asc(),
    ).all()
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "items": [_policy_payload(row) for row in rows],
        "total": len(rows),
        "boundary": (
            "Policies record how actions should be reviewed. They do not by "
            "themselves approve payment, verify ownership, or override platform rules."
        ),
    }


@router.post("/{community_domain_id}/policies", status_code=201, response_model=dict[str, Any])
def upsert_community_domain_policy(
    community_domain_id: int,
    payload: CommunityDomainPolicyUpsertIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    node_id: Optional[int] = None
    if payload.community_node_id is not None:
        node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(payload.community_node_id),
        )
        node_id = int(node.id)

    policy_key = _clean_role(payload.policy_key)
    policy = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == int(domain.id))
        .filter(CommunityDomainPolicy.policy_key == policy_key)
        .first()
    )
    created = policy is None
    if policy is None:
        policy = CommunityDomainPolicy(
            community_domain_id=int(domain.id),
            policy_key=policy_key,
            created_by_user_id=int(current_user.id),
        )
        db.add(policy)

    policy.community_node_id = node_id
    policy.action_key = _clean_role(payload.action_key)
    policy.scope_type = _clean_role(payload.scope_type, "domain")
    policy.review_mode = _clean_role(payload.review_mode, "domain_admin_review")
    policy.required_role = _clean_role(payload.required_role) if payload.required_role else None
    policy.status = _clean_role(payload.status, "active")
    policy.policy_summary = _clean_str(payload.policy_summary) or None
    policy.config_json = _json_dump(payload.config)
    policy.updated_by_user_id = int(current_user.id)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_policy_exists",
                "message": "A policy with this key already exists in this Community Domain.",
            },
        ) from exc

    db.refresh(policy)
    return {
        "ok": True,
        "created": created,
        "community_domain_id": int(domain.id),
        "policy": _policy_payload(policy),
        "boundary": (
            "Policy recorded. This creates a review rule record, not automatic "
            "legal authority, payment approval, verification, or a vote result."
        ),
    }


@router.get("/{community_domain_id}/action-reviews", response_model=dict[str, Any])
def list_community_domain_action_reviews(
    community_domain_id: int,
    community_node_id: Optional[int] = Query(default=None, ge=1),
    status: Optional[str] = Query(default=None, max_length=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    node: Optional[CommunityNode] = None
    if community_node_id is not None:
        node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(community_node_id),
        )
        _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=node,
            current_user=current_user,
        )
    else:
        _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    query = db.query(CommunityDomainActionReview).filter(
        CommunityDomainActionReview.community_domain_id == int(domain.id)
    )
    if node is not None:
        query = query.filter(CommunityDomainActionReview.community_node_id == int(node.id))
    if status:
        query = query.filter(CommunityDomainActionReview.status == _clean_role(status))

    rows = query.order_by(
        CommunityDomainActionReview.created_at.desc(),
        CommunityDomainActionReview.id.desc(),
    ).all()
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "community_node_id": int(node.id) if node is not None else None,
        "items": [_action_review_payload(row) for row in rows],
        "total": len(rows),
        "boundary": (
            "Action reviews are decision records. They do not execute the requested "
            "business action until a later endpoint applies that decision."
        ),
    }


@router.post("/{community_domain_id}/action-reviews", status_code=201, response_model=dict[str, Any])
def create_community_domain_action_review(
    community_domain_id: int,
    payload: CommunityDomainActionReviewCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)

    node_id: Optional[int] = None
    if payload.community_node_id is not None:
        node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(payload.community_node_id),
        )
        node_id = int(node.id)

    if payload.subject_user_id is not None:
        _get_user_or_404(db, payload.subject_user_id)

    policy: Optional[CommunityDomainPolicy] = None
    if payload.policy_id is not None:
        policy = _get_policy_or_404(
            db,
            community_domain_id=int(domain.id),
            policy_id=int(payload.policy_id),
        )
    else:
        policy = _matching_policy(
            db,
            community_domain_id=int(domain.id),
            action_key=payload.action_key,
            community_node_id=node_id,
        )

    action_key = _clean_role(payload.action_key)
    if policy is not None:
        if _clean_role(policy.status, "inactive") != "active":
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_policy_inactive",
                    "message": "This Community Domain policy is not active.",
                },
            )
        if _clean_role(policy.action_key) != action_key:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_policy_action_mismatch",
                    "message": "This policy does not govern the requested action.",
                },
            )
        if policy.community_node_id is not None and int(policy.community_node_id) != int(node_id or 0):
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_policy_node_mismatch",
                    "message": "This policy belongs to a different Community Domain node.",
                },
            )

    row = CommunityDomainActionReview(
        community_domain_id=int(domain.id),
        community_node_id=node_id,
        policy_id=int(policy.id) if policy is not None else None,
        action_key=action_key,
        requested_by_user_id=int(current_user.id),
        subject_user_id=int(payload.subject_user_id) if payload.subject_user_id is not None else None,
        target_type=_clean_role(payload.target_type) if payload.target_type else None,
        target_id=_clean_str(payload.target_id) or None,
        status="pending",
        request_note=_clean_str(payload.request_note) or None,
        payload_json=_json_dump(payload.payload),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review": _action_review_payload(row),
        "boundary": (
            "Review requested. This records that an action needs decision; it does "
            "not perform the action, move money, verify identity, or change membership by itself."
        ),
    }


@router.get("/{community_domain_id}/action-reviews/reviewer-queue", response_model=dict[str, Any])
def list_community_domain_reviewer_queue(
    community_domain_id: int,
    include_decided: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)

    candidate_rows = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(CommunityDomainActionReview.status.in_(["pending", "pending_review"]))
        .order_by(
            CommunityDomainActionReview.created_at.asc(),
            CommunityDomainActionReview.id.asc(),
        )
        .all()
    )

    rows = []
    for row in candidate_rows:
        if not include_decided and _has_user_decision(row, int(current_user.id)):
            continue
        if _can_decide_action_review(
            db,
            domain=domain,
            row=row,
            current_user=current_user,
        ):
            rows.append(row)

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "items": [_action_review_payload(row) for row in rows],
        "total": len(rows),
        "include_decided": bool(include_decided),
        "boundary": (
            "Reviewer queue only lists pending reviews this user is currently "
            "allowed to decide. It does not assign reviewers or send notifications."
        ),
    }


@router.post("/{community_domain_id}/action-reviews/{review_id}/decision", response_model=dict[str, Any])
def decide_community_domain_action_review(
    community_domain_id: int,
    review_id: int,
    payload: CommunityDomainActionReviewDecisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )

    node: Optional[CommunityNode] = None
    if row.community_node_id is not None:
        node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(row.community_node_id),
        )
        _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=node,
            current_user=current_user,
        )
    else:
        _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    _require_policy_reviewer_role(
        db,
        domain=domain,
        node=node,
        policy=getattr(row, "policy", None),
        current_user=current_user,
    )

    if _clean_role(row.status) == "applied":
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_already_applied",
                "message": "This Community Domain action review has already been applied.",
            },
        )

    decision = _clean_role(payload.decision)
    decision_row = (
        db.query(CommunityDomainActionReviewDecision)
        .filter(CommunityDomainActionReviewDecision.action_review_id == int(row.id))
        .filter(CommunityDomainActionReviewDecision.decided_by_user_id == int(current_user.id))
        .first()
    )
    if decision_row is None:
        decision_row = CommunityDomainActionReviewDecision(
            action_review_id=int(row.id),
            community_domain_id=int(domain.id),
            community_node_id=int(row.community_node_id) if row.community_node_id is not None else None,
            decided_by_user_id=int(current_user.id),
        )
        db.add(decision_row)

    decision_row.decision = decision
    decision_row.decision_note = _clean_str(payload.decision_note) or None
    db.flush()

    decision_rows = (
        db.query(CommunityDomainActionReviewDecision)
        .filter(CommunityDomainActionReviewDecision.action_review_id == int(row.id))
        .order_by(CommunityDomainActionReviewDecision.created_at.asc(), CommunityDomainActionReviewDecision.id.asc())
        .all()
    )
    approval_count = sum(1 for item in decision_rows if _clean_role(item.decision) == "approve")
    rejection_count = sum(1 for item in decision_rows if _clean_role(item.decision) == "reject")
    needs_changes_count = sum(1 for item in decision_rows if _clean_role(item.decision) == "needs_changes")
    required_approvals = _required_review_approvals(row)

    row.decision = decision
    row.decision_note = _clean_str(payload.decision_note) or None
    row.decided_by_user_id = int(current_user.id)
    row.decided_at = datetime.now(timezone.utc)
    if rejection_count > 0:
        row.status = "rejected"
    elif needs_changes_count > 0:
        row.status = "needs_changes"
    elif approval_count >= required_approvals:
        row.status = "approved"
    else:
        row.status = "pending_review"

    db.add(row)
    db.commit()
    db.refresh(decision_row)
    db.refresh(row)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review": _action_review_payload(row),
        "decision_record": _action_review_decision_payload(decision_row),
        "approval_count": approval_count,
        "required_approvals": required_approvals,
        "boundary": (
            "Decision recorded. The review becomes approved only when the policy's "
            "required approval count is satisfied."
        ),
    }


@router.post("/{community_domain_id}/action-reviews/{review_id}/apply", response_model=dict[str, Any])
def apply_community_domain_action_review(
    community_domain_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )

    node: Optional[CommunityNode] = None
    actor_scope = "domain_admin"
    if row.community_node_id is not None:
        node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(row.community_node_id),
        )
        actor_scope = _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=node,
            current_user=current_user,
        )
    else:
        _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    if _clean_role(row.status) == "applied":
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_already_applied",
                "message": "This Community Domain action review has already been applied.",
            },
        )
    if _clean_role(row.status) != "approved" or _clean_role(row.decision or "") != "approve":
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_not_approved",
                "message": "Only approved Community Domain action reviews can be applied.",
            },
        )

    action_key = _clean_role(row.action_key)
    payload = _json_load(row.payload_json)
    applied: dict[str, Any]

    if action_key == "domain_member.upsert":
        user_id = _payload_int(payload, "user_id")
        _get_user_or_404(db, user_id)
        requested_role = _clean_role(str(payload.get("role") or "member"))
        if requested_role == "owner" and int(user_id) != int(domain.owner_user_id):
            raise HTTPException(
                status_code=403,
                detail="Only the recorded Community Domain owner can hold the owner role.",
            )
        if int(user_id) == int(domain.owner_user_id) and requested_role != "owner":
            raise HTTPException(
                status_code=403,
                detail="The recorded Community Domain owner role cannot be reassigned here.",
            )

        membership = _domain_membership_for_user(
            db,
            community_domain_id=int(domain.id),
            user_id=int(user_id),
        )
        created = membership is None
        if membership is None:
            membership = CommunityDomainMembership(
                community_domain_id=int(domain.id),
                user_id=int(user_id),
            )
            db.add(membership)

        membership.role = requested_role
        membership.status = _clean_str(str(payload.get("status") or "active"), "active")
        membership.title = _clean_str(str(payload.get("title") or "")) or None
        row.status = "applied"
        db.add(row)
        db.commit()
        db.refresh(membership)
        db.refresh(row)
        applied = {
            "type": "domain_member",
            "created": created,
            "membership": _domain_member_payload(membership),
        }
    elif action_key in {"node_member.upsert", "node_member.role_change"}:
        if node is None:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_review_node_required",
                    "message": "This action must be scoped to a Community Domain node.",
                },
            )
        user_id = _payload_int(payload, "user_id")
        _get_user_or_404(db, user_id)
        requested_role = _clean_role(str(payload.get("role") or "member"))
        if actor_scope == "node_admin" and requested_role not in NODE_LOCAL_ASSIGNABLE_ROLES:
            raise HTTPException(
                status_code=403,
                detail="Node admins can apply local member roles only.",
            )

        domain_membership = _domain_membership_for_user(
            db,
            community_domain_id=int(domain.id),
            user_id=int(user_id),
        )
        if domain_membership is None or _clean_role(domain_membership.status, "inactive") != "active":
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_membership_required",
                    "message": "Add this user as an active Community Domain member before placing them in a node.",
                },
            )

        membership = (
            db.query(CommunityNodeMembership)
            .filter(CommunityNodeMembership.community_node_id == int(node.id))
            .filter(CommunityNodeMembership.user_id == int(user_id))
            .first()
        )
        created = membership is None
        if membership is None:
            membership = CommunityNodeMembership(
                community_domain_id=int(domain.id),
                community_node_id=int(node.id),
                user_id=int(user_id),
            )
            db.add(membership)

        membership.role = requested_role
        membership.status = _clean_str(str(payload.get("status") or "active"), "active")
        membership.title = _clean_str(str(payload.get("title") or "")) or None
        row.status = "applied"
        db.add(row)
        db.commit()
        db.refresh(membership)
        db.refresh(row)
        applied = {
            "type": "node_member",
            "created": created,
            "membership": _node_member_payload(membership),
        }
    else:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_action_not_applicable",
                "message": "This action review records a decision but is not yet wired to an apply handler.",
            },
        )

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review": _action_review_payload(row),
        "applied": applied,
        "boundary": (
            "Approved review applied for this limited Community Domain action. "
            "Payment, verification, billing, Marketplace, and external legal effects are not applied here."
        ),
    }
