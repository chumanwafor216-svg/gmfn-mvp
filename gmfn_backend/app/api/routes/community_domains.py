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
    CommunityDomainActionReviewComment,
    CommunityDomainActionReviewDecision,
    CommunityDomainActionReviewEvidence,
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
NODE_STATUS_VALUES = {"active", "inactive", "archived"}


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
    recusal_count = sum(1 for item in decisions if _clean_role(item.decision) == "recuse")
    return {
        "id": int(row.id),
        "community_domain_id": int(row.community_domain_id),
        "community_node_id": int(row.community_node_id) if row.community_node_id is not None else None,
        "community_node_name": getattr(node, "name", None),
        "policy_id": int(row.policy_id) if row.policy_id is not None else None,
        "parent_review_id": (
            int(row.parent_review_id) if row.parent_review_id is not None else None
        ),
        "policy_key": getattr(policy, "policy_key", None),
        "action_key": row.action_key,
        "requested_by_user_id": int(row.requested_by_user_id),
        "subject_user_id": int(row.subject_user_id) if row.subject_user_id is not None else None,
        "decided_by_user_id": int(row.decided_by_user_id) if row.decided_by_user_id is not None else None,
        "applied_by_user_id": int(row.applied_by_user_id) if row.applied_by_user_id is not None else None,
        "target_type": row.target_type,
        "target_id": row.target_id,
        "status": row.status,
        "decision": row.decision,
        "request_note": row.request_note,
        "decision_note": row.decision_note,
        "payload": _json_load(row.payload_json),
        "required_approvals": _required_review_approvals(row),
        "approval_count": approval_count,
        "recusal_count": recusal_count,
        "decisions": [_action_review_decision_payload(item) for item in decisions],
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
        "decided_at": _iso(row.decided_at),
        "applied_at": _iso(row.applied_at),
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


def _action_review_comment_payload(
    row: CommunityDomainActionReviewComment,
) -> dict[str, Any]:
    author = getattr(row, "author", None)
    return {
        "id": int(row.id),
        "action_review_id": int(row.action_review_id),
        "community_domain_id": int(row.community_domain_id),
        "community_node_id": (
            int(row.community_node_id) if row.community_node_id is not None else None
        ),
        "author_user_id": int(row.author_user_id),
        "author_user_email": getattr(author, "email", None),
        "body": row.body,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _action_review_evidence_payload(
    row: CommunityDomainActionReviewEvidence,
) -> dict[str, Any]:
    submitter = getattr(row, "submitter", None)
    return {
        "id": int(row.id),
        "action_review_id": int(row.action_review_id),
        "community_domain_id": int(row.community_domain_id),
        "community_node_id": (
            int(row.community_node_id) if row.community_node_id is not None else None
        ),
        "submitted_by_user_id": int(row.submitted_by_user_id),
        "submitted_by_user_email": getattr(submitter, "email", None),
        "evidence_type": row.evidence_type,
        "title": row.title,
        "description": row.description,
        "file_name": row.file_name,
        "content_type": row.content_type,
        "storage_key": row.storage_key,
        "external_reference": row.external_reference,
        "checksum": row.checksum,
        "status": row.status,
        "created_at": _iso(row.created_at),
        "updated_at": _iso(row.updated_at),
    }


def _activity_time(value: Optional[datetime]) -> datetime:
    if value is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _action_review_activity_items(
    db: Session,
    row: CommunityDomainActionReview,
) -> list[dict[str, Any]]:
    base = {
        "action_review_id": int(row.id),
        "community_node_id": (
            int(row.community_node_id) if row.community_node_id is not None else None
        ),
        "review_status": row.status,
    }
    activity_items: list[dict[str, Any]] = [
        {
            **base,
            "type": "review_created",
            "occurred_at": _iso(row.created_at),
            "sort_at": _activity_time(row.created_at),
            "sort_order": 0,
            "sort_id": int(row.id),
            "actor_user_id": int(row.requested_by_user_id),
            "payload": _action_review_payload(row),
        }
    ]

    decision_rows = (
        db.query(CommunityDomainActionReviewDecision)
        .filter(CommunityDomainActionReviewDecision.action_review_id == int(row.id))
        .order_by(
            CommunityDomainActionReviewDecision.created_at.asc(),
            CommunityDomainActionReviewDecision.id.asc(),
        )
        .all()
    )
    for decision_row in decision_rows:
        activity_items.append(
            {
                **base,
                "type": "decision",
                "occurred_at": _iso(decision_row.created_at),
                "sort_at": _activity_time(decision_row.created_at),
                "sort_order": 1,
                "sort_id": int(decision_row.id),
                "actor_user_id": int(decision_row.decided_by_user_id),
                "payload": _action_review_decision_payload(decision_row),
            }
        )

    comment_rows = (
        db.query(CommunityDomainActionReviewComment)
        .filter(CommunityDomainActionReviewComment.action_review_id == int(row.id))
        .order_by(
            CommunityDomainActionReviewComment.created_at.asc(),
            CommunityDomainActionReviewComment.id.asc(),
        )
        .all()
    )
    for comment_row in comment_rows:
        activity_items.append(
            {
                **base,
                "type": "comment",
                "occurred_at": _iso(comment_row.created_at),
                "sort_at": _activity_time(comment_row.created_at),
                "sort_order": 2,
                "sort_id": int(comment_row.id),
                "actor_user_id": int(comment_row.author_user_id),
                "payload": _action_review_comment_payload(comment_row),
            }
        )

    evidence_rows = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.action_review_id == int(row.id))
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .order_by(
            CommunityDomainActionReviewEvidence.created_at.asc(),
            CommunityDomainActionReviewEvidence.id.asc(),
        )
        .all()
    )
    for evidence_row in evidence_rows:
        activity_items.append(
            {
                **base,
                "type": "evidence",
                "occurred_at": _iso(evidence_row.created_at),
                "sort_at": _activity_time(evidence_row.created_at),
                "sort_order": 3,
                "sort_id": int(evidence_row.id),
                "actor_user_id": int(evidence_row.submitted_by_user_id),
                "payload": _action_review_evidence_payload(evidence_row),
            }
        )

    current_status = _clean_role(row.status)
    if current_status in {"cancelled", "applied"}:
        status_time = (
            row.decided_at
            if current_status == "cancelled"
            else row.applied_at or row.updated_at
        )
        status_actor_user_id = None
        if current_status == "cancelled" and row.decided_by_user_id is not None:
            status_actor_user_id = int(row.decided_by_user_id)
        elif current_status == "applied" and row.applied_by_user_id is not None:
            status_actor_user_id = int(row.applied_by_user_id)

        activity_items.append(
            {
                **base,
                "type": "review_status_changed",
                "occurred_at": _iso(status_time),
                "sort_at": _activity_time(status_time),
                "sort_order": 4,
                "sort_id": int(row.id),
                "actor_user_id": status_actor_user_id,
                "payload": {
                    "status": row.status,
                    "decision": row.decision,
                    "decision_note": row.decision_note,
                    "action_review": _action_review_payload(row),
                },
            }
        )

    return activity_items


def _strip_activity_sort_fields(items: list[dict[str, Any]]) -> None:
    for item in items:
        item.pop("sort_at", None)
        item.pop("sort_order", None)
        item.pop("sort_id", None)


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


class CommunityNodeStatusUpdateIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    status: str = Field(..., max_length=24)
    status_note: Optional[str] = Field(default=None, max_length=1200)


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

    decision: str = Field(..., pattern="^(approve|reject|needs_changes|recuse)$")
    decision_note: Optional[str] = Field(default=None, max_length=1200)


class CommunityDomainActionReviewCancelIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    cancel_note: Optional[str] = Field(default=None, max_length=1200)


class CommunityDomainActionReviewRevisionIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    subject_user_id: Optional[int] = Field(default=None, ge=1)
    target_type: Optional[str] = Field(default=None, max_length=64)
    target_id: Optional[str] = Field(default=None, max_length=96)
    request_note: Optional[str] = Field(default=None, max_length=1200)
    payload: Optional[dict[str, Any]] = None


class CommunityDomainActionReviewCommentIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    body: str = Field(..., min_length=1, max_length=4000)


class CommunityDomainActionReviewEvidenceIn(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    evidence_type: str = Field(default="document", max_length=48)
    title: str = Field(..., min_length=2, max_length=160)
    description: Optional[str] = Field(default=None, max_length=1200)
    file_name: Optional[str] = Field(default=None, max_length=255)
    content_type: Optional[str] = Field(default=None, max_length=120)
    storage_key: Optional[str] = Field(default=None, max_length=512)
    external_reference: Optional[str] = Field(default=None, max_length=512)
    checksum: Optional[str] = Field(default=None, max_length=128)


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


def _ensure_node_accepts_writes(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
) -> None:
    current: Optional[CommunityNode] = node
    while current is not None:
        if _clean_role(current.status, "inactive") != "active":
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_node_inactive",
                    "message": "This Community Domain node or one of its parent nodes is not active, so new structure, policies, placements, or action reviews cannot be added to it.",
                },
            )
        if current.parent_node_id is None:
            return
        current = (
            db.query(CommunityNode)
            .filter(CommunityNode.community_domain_id == int(domain.id))
            .filter(CommunityNode.id == int(current.parent_node_id))
            .first()
        )
    raise HTTPException(
        status_code=404,
        detail={
            "code": "community_domain_node_parent_missing",
            "message": "This Community Domain node points to a missing parent node.",
        },
    )


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
    domain: CommunityDomain,
    community_node_id: int,
    user_id: int,
) -> Optional[CommunityNodeMembership]:
    if (
        _active_domain_membership_for_user(
            db,
            community_domain_id=int(domain.id),
            user_id=int(user_id),
        )
        is None
    ):
        return None
    membership = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == int(domain.id))
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
    domain: CommunityDomain,
    node: CommunityNode,
    current_user: User,
) -> bool:
    membership = _active_node_membership_for_user(
        db,
        domain=domain,
        community_node_id=int(node.id),
        user_id=int(current_user.id),
    )
    return membership is not None and _clean_role(membership.role) in NODE_ADMIN_ROLES


def _descendant_node_ids(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
    include_descendants: bool,
) -> list[int]:
    if not include_descendants:
        return [int(node.id)]

    path = _clean_str(node.path)
    if not path:
        return [int(node.id)]

    rows = (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == int(domain.id))
        .filter(
            (CommunityNode.id == int(node.id))
            | (CommunityNode.path.like(f"{path}/%"))
        )
        .order_by(
            CommunityNode.depth.asc(),
            CommunityNode.sort_order.asc(),
            CommunityNode.id.asc(),
        )
        .all()
    )
    return [int(item.id) for item in rows]


def _node_lifecycle_impact_summary(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
) -> dict[str, Any]:
    node_scope_ids = _descendant_node_ids(
        db,
        domain=domain,
        node=node,
        include_descendants=True,
    )
    open_review_statuses = {"pending", "pending_review", "needs_changes", "approved"}
    open_reviews = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(CommunityDomainActionReview.community_node_id.in_(node_scope_ids))
        .filter(CommunityDomainActionReview.status.in_(open_review_statuses))
        .all()
    )
    reviews_by_status: dict[str, int] = {}
    for review in open_reviews:
        status_key = _clean_role(review.status, "unknown")
        reviews_by_status[status_key] = reviews_by_status.get(status_key, 0) + 1

    active_node_member_count = (
        db.query(CommunityNodeMembership)
        .filter(CommunityNodeMembership.community_domain_id == int(domain.id))
        .filter(CommunityNodeMembership.community_node_id.in_(node_scope_ids))
        .filter(CommunityNodeMembership.status == "active")
        .count()
    )
    active_policy_count = (
        db.query(CommunityDomainPolicy)
        .filter(CommunityDomainPolicy.community_domain_id == int(domain.id))
        .filter(CommunityDomainPolicy.community_node_id.in_(node_scope_ids))
        .filter(CommunityDomainPolicy.status == "active")
        .count()
    )
    return {
        "node_scope_ids": node_scope_ids,
        "descendant_node_count": max(len(node_scope_ids) - 1, 0),
        "active_node_member_count": int(active_node_member_count),
        "active_policy_count": int(active_policy_count),
        "open_action_review_count": len(open_reviews),
        "open_action_reviews_by_status": reviews_by_status,
    }


def _node_inherits_policy_from_node(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
    ancestor_node_id: int,
) -> bool:
    if int(node.id) == int(ancestor_node_id):
        return True

    current = node
    while current.parent_node_id is not None:
        if not bool(current.inherits_parent_policy):
            return False
        if int(current.parent_node_id) == int(ancestor_node_id):
            return True
        parent = (
            db.query(CommunityNode)
            .filter(CommunityNode.community_domain_id == int(domain.id))
            .filter(CommunityNode.id == int(current.parent_node_id))
            .first()
        )
        if parent is None:
            return False
        current = parent

    return False


def _policy_can_govern_node(
    db: Session,
    *,
    domain: CommunityDomain,
    policy: CommunityDomainPolicy,
    node: Optional[CommunityNode],
) -> bool:
    if policy.community_node_id is None:
        return True
    if node is None:
        return False
    return _node_inherits_policy_from_node(
        db,
        domain=domain,
        node=node,
        ancestor_node_id=int(policy.community_node_id),
    )


def _require_node_or_domain_admin_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    node: CommunityNode,
    current_user: User,
) -> str:
    if _has_domain_admin_scope(db, domain=domain, current_user=current_user):
        return "domain_admin"
    if _has_node_admin_scope(db, domain=domain, node=node, current_user=current_user):
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
            domain=domain,
            community_node_id=int(node.id),
            user_id=int(current_user.id),
        )
        if node_membership is not None and _clean_role(node_membership.role) == required_role:
            return
        if (
            policy is not None
            and policy.community_node_id is not None
            and int(policy.community_node_id) != int(node.id)
            and _policy_can_govern_node(
                db,
                domain=domain,
                policy=policy,
                node=node,
            )
        ):
            policy_scope_membership = _active_node_membership_for_user(
                db,
                domain=domain,
                community_node_id=int(policy.community_node_id),
                user_id=int(current_user.id),
            )
            if (
                policy_scope_membership is not None
                and _clean_role(policy_scope_membership.role) == required_role
            ):
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
    if int(row.requested_by_user_id) == int(current_user.id):
        return False

    try:
        node = _require_action_review_decider_scope(
            db,
            domain=domain,
            row=row,
            current_user=current_user,
        )
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


def _require_action_review_decider_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    row: CommunityDomainActionReview,
    current_user: User,
) -> Optional[CommunityNode]:
    if row.community_node_id is None:
        _require_domain_admin_scope(db, domain=domain, current_user=current_user)
        return None

    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(row.community_node_id),
    )
    if _has_domain_admin_scope(db, domain=domain, current_user=current_user):
        return node

    try:
        _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=node,
            current_user=current_user,
        )
        return node
    except HTTPException:
        policy = getattr(row, "policy", None)
        if (
            policy is None
            or policy.community_node_id is None
            or not _policy_can_govern_node(
                db,
                domain=domain,
                policy=policy,
                node=node,
            )
        ):
            raise

        policy_node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(policy.community_node_id),
        )
        _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=policy_node,
            current_user=current_user,
        )
        return node


def _require_action_review_admin_scope(
    db: Session,
    *,
    domain: CommunityDomain,
    row: CommunityDomainActionReview,
    current_user: User,
) -> tuple[Optional[CommunityNode], str]:
    if row.community_node_id is None:
        _require_domain_admin_scope(db, domain=domain, current_user=current_user)
        return None, "domain_admin"

    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(row.community_node_id),
    )
    try:
        actor_scope = _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=node,
            current_user=current_user,
        )
        return node, actor_scope
    except HTTPException:
        policy = getattr(row, "policy", None)
        if (
            policy is None
            or policy.community_node_id is None
            or not _policy_can_govern_node(
                db,
                domain=domain,
                policy=policy,
                node=node,
            )
        ):
            raise

        policy_node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(policy.community_node_id),
        )
        _require_node_or_domain_admin_scope(
            db,
            domain=domain,
            node=policy_node,
            current_user=current_user,
        )
        return node, "node_admin"


def _can_view_action_review(
    db: Session,
    *,
    domain: CommunityDomain,
    row: CommunityDomainActionReview,
    current_user: User,
) -> bool:
    if int(row.requested_by_user_id) == int(current_user.id):
        return True
    if _has_user_decision(row, int(current_user.id)):
        return True
    if (
        row.decided_by_user_id is not None
        and int(row.decided_by_user_id) == int(current_user.id)
    ):
        return True
    if (
        row.applied_by_user_id is not None
        and int(row.applied_by_user_id) == int(current_user.id)
    ):
        return True

    try:
        _require_action_review_admin_scope(
            db,
            domain=domain,
            row=row,
            current_user=current_user,
        )
        return True
    except HTTPException:
        return _can_decide_action_review(
            db,
            domain=domain,
            row=row,
            current_user=current_user,
        )


def _can_contribute_to_action_review(
    db: Session,
    *,
    domain: CommunityDomain,
    row: CommunityDomainActionReview,
    current_user: User,
) -> bool:
    if int(row.requested_by_user_id) == int(current_user.id):
        return True

    try:
        _require_action_review_admin_scope(
            db,
            domain=domain,
            row=row,
            current_user=current_user,
        )
        return True
    except HTTPException:
        return _can_decide_action_review(
            db,
            domain=domain,
            row=row,
            current_user=current_user,
        )


def _ensure_action_review_accepts_append(row: CommunityDomainActionReview) -> None:
    if _clean_role(row.status) in {"pending", "pending_review"}:
        return
    raise HTTPException(
        status_code=409,
        detail={
            "code": "community_domain_review_append_closed",
            "message": "Comments and evidence can only be added while this Community Domain action review is pending.",
        },
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
        node = _get_node_or_404(
            db,
            community_domain_id=int(community_domain_id),
            community_node_id=int(community_node_id),
        )
        node_policy = (
            query.filter(CommunityDomainPolicy.community_node_id == int(community_node_id))
            .order_by(CommunityDomainPolicy.id.desc())
            .first()
        )
        if node_policy is not None:
            return node_policy

        current = node
        while current.parent_node_id is not None and bool(current.inherits_parent_policy):
            parent_policy = (
                query.filter(
                    CommunityDomainPolicy.community_node_id == int(current.parent_node_id)
                )
                .order_by(CommunityDomainPolicy.id.desc())
                .first()
            )
            if parent_policy is not None:
                return parent_policy
            parent = (
                db.query(CommunityNode)
                .filter(CommunityNode.community_domain_id == int(community_domain_id))
                .filter(CommunityNode.id == int(current.parent_node_id))
                .first()
            )
            if parent is None:
                break
            current = parent

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
    _ensure_node_accepts_writes(db, domain=domain, node=parent_node)

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


@router.get("/{community_domain_id}/nodes/{community_node_id}/status-impact", response_model=dict[str, Any])
def get_community_domain_node_status_impact(
    community_domain_id: int,
    community_node_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_admin_scope(db, domain=domain, current_user=current_user)
    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(community_node_id),
    )
    impact_summary = _node_lifecycle_impact_summary(db, domain=domain, node=node)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "node": _node_payload(node),
        "current_status": _clean_role(node.status, "inactive"),
        "status_mutable": node.parent_node_id is not None,
        "impact_summary": impact_summary,
        "boundary": (
            "Read-only preview of the records currently sitting inside this "
            "node tree. It does not close, reopen, archive, notify, cancel "
            "reviews, remove members, or create a lifecycle record."
        ),
    }


@router.patch("/{community_domain_id}/nodes/{community_node_id}/status", response_model=dict[str, Any])
def update_community_domain_node_status(
    community_domain_id: int,
    community_node_id: int,
    payload: CommunityNodeStatusUpdateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_admin_scope(db, domain=domain, current_user=current_user)
    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(community_node_id),
    )
    if node.parent_node_id is None:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_root_node_status_immutable",
                "message": "The root Community Domain node is controlled by the domain lifecycle, not the node status endpoint.",
            },
        )

    requested_status = _clean_role(payload.status, "active")
    if requested_status not in NODE_STATUS_VALUES:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "community_domain_node_status_invalid",
                "message": "Node status must be active, inactive, or archived.",
            },
        )

    parent_node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(node.parent_node_id),
    )
    if requested_status == "active":
        _ensure_node_accepts_writes(db, domain=domain, node=parent_node)

    previous_status = _clean_role(node.status, "inactive")
    changed = previous_status != requested_status
    status_note = _clean_str(payload.status_note) or None
    if changed and not status_note:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "community_domain_node_status_note_required",
                "message": "A status note is required when changing a Community Domain node status.",
            },
        )

    impact_summary = _node_lifecycle_impact_summary(db, domain=domain, node=node)
    node.status = requested_status
    lifecycle_record: Optional[CommunityDomainActionReview] = None
    if changed:
        now = datetime.now(timezone.utc)
        lifecycle_record = CommunityDomainActionReview(
            community_domain_id=int(domain.id),
            community_node_id=int(node.id),
            action_key="node.status.update",
            requested_by_user_id=int(current_user.id),
            applied_by_user_id=int(current_user.id),
            target_type="community_node",
            target_id=str(int(node.id)),
            status="applied",
            decision="applied",
            request_note=status_note,
            payload_json=_json_dump(
                {
                    "community_node_id": int(node.id),
                    "previous_status": previous_status,
                    "new_status": requested_status,
                    "status_note": status_note,
                    "impact_summary": impact_summary,
                }
            ),
            decided_at=now,
            applied_at=now,
        )
        db.add(lifecycle_record)
    db.add(node)
    db.commit()
    db.refresh(node)
    if lifecycle_record is not None:
        db.refresh(lifecycle_record)

    return {
        "ok": True,
        "changed": changed,
        "community_domain_id": int(domain.id),
        "previous_status": previous_status,
        "node": _node_payload(node),
        "descendant_count": impact_summary["descendant_node_count"],
        "impact_summary": impact_summary,
        "lifecycle_record": (
            _action_review_payload(lifecycle_record)
            if lifecycle_record is not None
            else None
        ),
        "boundary": (
            "Node status controls whether new structure, policies, placements, "
            "and node-scoped reviews can be added here. It does not delete "
            "descendants, remove members, cancel pending reviews, or change the "
            "Community Domain lifecycle. Actual status changes create an applied "
            "operational action record with an impact snapshot, but this is not "
            "an immutable audit ledger."
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
    _ensure_node_accepts_writes(db, domain=domain, node=node)
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
        policy_node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(payload.community_node_id),
        )
        _ensure_node_accepts_writes(db, domain=domain, node=policy_node)
        node_id = int(policy_node.id)

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
    include_descendants: bool = Query(default=False),
    status: Optional[str] = Query(default=None, max_length=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    node: Optional[CommunityNode] = None
    node_scope_ids: list[int] = []
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
        node_scope_ids = _descendant_node_ids(
            db,
            domain=domain,
            node=node,
            include_descendants=bool(include_descendants),
        )
    else:
        _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    query = db.query(CommunityDomainActionReview).filter(
        CommunityDomainActionReview.community_domain_id == int(domain.id)
    )
    if node is not None:
        query = query.filter(CommunityDomainActionReview.community_node_id.in_(node_scope_ids))
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
        "community_node_ids": node_scope_ids,
        "include_descendants": bool(include_descendants),
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
    node: Optional[CommunityNode] = None
    if payload.community_node_id is not None:
        node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=int(payload.community_node_id),
        )
        _ensure_node_accepts_writes(db, domain=domain, node=node)
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
        if not _policy_can_govern_node(
            db,
            domain=domain,
            policy=policy,
            node=node,
        ):
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


@router.get("/{community_domain_id}/action-reviews/my-requests", response_model=dict[str, Any])
def list_my_community_domain_action_reviews(
    community_domain_id: int,
    status: Optional[str] = Query(default=None, max_length=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)

    query = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(CommunityDomainActionReview.requested_by_user_id == int(current_user.id))
    )
    if status:
        query = query.filter(CommunityDomainActionReview.status == _clean_role(status))

    rows = query.order_by(
        CommunityDomainActionReview.created_at.desc(),
        CommunityDomainActionReview.id.desc(),
    ).all()
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "items": [_action_review_payload(row) for row in rows],
        "total": len(rows),
        "boundary": (
            "My requests only shows action reviews submitted by the current user. "
            "It does not expose the wider governance queue or admin review list."
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


@router.get("/{community_domain_id}/action-reviews/activity", response_model=dict[str, Any])
def list_community_domain_action_review_activity(
    community_domain_id: int,
    community_node_id: Optional[int] = Query(default=None, ge=1),
    include_descendants: bool = Query(default=False),
    status: Optional[str] = Query(default=None, max_length=24),
    event_type: Optional[str] = Query(default=None, max_length=48),
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    node: Optional[CommunityNode] = None
    node_scope_ids: list[int] = []
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
        node_scope_ids = _descendant_node_ids(
            db,
            domain=domain,
            node=node,
            include_descendants=bool(include_descendants),
        )
    else:
        _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    query = db.query(CommunityDomainActionReview).filter(
        CommunityDomainActionReview.community_domain_id == int(domain.id)
    )
    if node is not None:
        query = query.filter(CommunityDomainActionReview.community_node_id.in_(node_scope_ids))
    if status:
        query = query.filter(CommunityDomainActionReview.status == _clean_role(status))

    rows = query.order_by(
        CommunityDomainActionReview.updated_at.desc(),
        CommunityDomainActionReview.id.desc(),
    ).all()

    requested_event_type = _clean_role(event_type) if event_type else None
    activity_items: list[dict[str, Any]] = []
    for row in rows:
        for item in _action_review_activity_items(db, row):
            if requested_event_type and _clean_role(item["type"]) != requested_event_type:
                continue
            activity_items.append(item)

    activity_items.sort(
        key=lambda item: (
            item["sort_at"],
            -int(item["sort_order"]),
            int(item["sort_id"]),
        ),
        reverse=True,
    )
    activity_items = activity_items[: int(limit)]
    _strip_activity_sort_fields(activity_items)

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "community_node_id": int(node.id) if node is not None else None,
        "community_node_ids": node_scope_ids,
        "include_descendants": bool(include_descendants),
        "items": activity_items,
        "total": len(activity_items),
        "limit": int(limit),
        "event_type": requested_event_type,
        "boundary": (
            "Domain activity is a read-only operational feed for admins. It merges "
            "existing review creation, decisions, comments, evidence metadata, and "
            "terminal row status changes; it is not an immutable audit ledger, "
            "notification feed, TrustEvent stream, or action executor."
        ),
    }


@router.get(
    "/{community_domain_id}/action-reviews/summary",
    response_model=dict[str, Any],
)
def get_community_domain_action_review_summary(
    community_domain_id: int,
    community_node_id: Optional[int] = Query(default=None, ge=1),
    include_descendants: bool = Query(default=False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    node: Optional[CommunityNode] = None
    node_scope_ids: list[int] = []
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
        node_scope_ids = _descendant_node_ids(
            db,
            domain=domain,
            node=node,
            include_descendants=bool(include_descendants),
        )
    else:
        _require_domain_admin_scope(db, domain=domain, current_user=current_user)

    query = db.query(CommunityDomainActionReview).filter(
        CommunityDomainActionReview.community_domain_id == int(domain.id)
    )
    if node is not None:
        query = query.filter(
            CommunityDomainActionReview.community_node_id.in_(node_scope_ids)
        )

    rows = query.all()
    by_status: dict[str, int] = {}
    by_action: dict[str, int] = {}
    by_node: dict[str, dict[str, Any]] = {}
    pending_statuses = {"pending", "pending_review"}
    approved_statuses = {"approved"}
    terminal_statuses = {"applied", "cancelled", "rejected"}

    for row in rows:
        status_key = _clean_role(row.status, "unknown")
        action_key = _clean_role(row.action_key, "unknown")
        by_status[status_key] = by_status.get(status_key, 0) + 1
        by_action[action_key] = by_action.get(action_key, 0) + 1

        node_key = (
            str(row.community_node_id)
            if row.community_node_id is not None
            else "domain"
        )
        if node_key not in by_node:
            row_node = getattr(row, "community_node", None)
            by_node[node_key] = {
                "community_node_id": (
                    int(row.community_node_id)
                    if row.community_node_id is not None
                    else None
                ),
                "community_node_name": getattr(row_node, "name", None),
                "total": 0,
                "by_status": {},
            }
        node_bucket = by_node[node_key]
        node_bucket["total"] += 1
        node_bucket["by_status"][status_key] = (
            node_bucket["by_status"].get(status_key, 0) + 1
        )

    attention_total = sum(by_status.get(status, 0) for status in pending_statuses)
    ready_to_apply_total = sum(by_status.get(status, 0) for status in approved_statuses)
    terminal_total = sum(by_status.get(status, 0) for status in terminal_statuses)
    by_node_items = sorted(
        by_node.values(),
        key=lambda item: (
            item["community_node_id"] is not None,
            item["community_node_name"] or "",
            item["community_node_id"] or 0,
        ),
    )

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "community_node_id": int(node.id) if node is not None else None,
        "community_node_ids": node_scope_ids,
        "include_descendants": bool(include_descendants),
        "total": len(rows),
        "attention_total": attention_total,
        "ready_to_apply_total": ready_to_apply_total,
        "terminal_total": terminal_total,
        "by_status": by_status,
        "by_action": by_action,
        "by_node": by_node_items,
        "boundary": (
            "Action review summary is a read-only dashboard count for admins. "
            "It does not decide, assign, notify, apply, verify evidence, or "
            "replace the detailed review/activity records."
        ),
    }


@router.get("/{community_domain_id}/action-reviews/{review_id}", response_model=dict[str, Any])
def get_community_domain_action_review(
    community_domain_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )
    if not _can_view_action_review(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_action_review_not_visible",
                "message": "This action review is not visible to the current user.",
            },
        )

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review": _action_review_payload(row),
        "boundary": (
            "Action review detail is visible only to the requester, eligible "
            "reviewers, and scoped admins. It does not apply the requested action."
        ),
    }


@router.get(
    "/{community_domain_id}/action-reviews/{review_id}/comments",
    response_model=dict[str, Any],
)
def list_community_domain_action_review_comments(
    community_domain_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )
    if not _can_view_action_review(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_comments_not_visible",
                "message": "Only users who can view this action review can view its comments.",
            },
        )

    comments = (
        db.query(CommunityDomainActionReviewComment)
        .filter(CommunityDomainActionReviewComment.action_review_id == int(row.id))
        .order_by(
            CommunityDomainActionReviewComment.created_at.asc(),
            CommunityDomainActionReviewComment.id.asc(),
        )
        .all()
    )
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review_id": int(row.id),
        "items": [_action_review_comment_payload(comment) for comment in comments],
        "total": len(comments),
        "boundary": (
            "Review comments are an append-only discussion trail. They do not "
            "decide, revise, reopen, cancel, or apply the action review."
        ),
    }


@router.post(
    "/{community_domain_id}/action-reviews/{review_id}/comments",
    status_code=201,
    response_model=dict[str, Any],
)
def create_community_domain_action_review_comment(
    community_domain_id: int,
    review_id: int,
    payload: CommunityDomainActionReviewCommentIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )
    if not _can_contribute_to_action_review(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_comment_forbidden",
                "message": "Only the requester or a current scoped reviewer/admin can comment on this action review.",
            },
        )
    _ensure_action_review_accepts_append(row)

    comment = CommunityDomainActionReviewComment(
        action_review_id=int(row.id),
        community_domain_id=int(domain.id),
        community_node_id=(
            int(row.community_node_id) if row.community_node_id is not None else None
        ),
        author_user_id=int(current_user.id),
        body=_clean_str(payload.body),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review_id": int(row.id),
        "comment": _action_review_comment_payload(comment),
        "boundary": (
            "Comment recorded. This does not decide, revise, reopen, cancel, "
            "or apply the action review."
        ),
    }


@router.get(
    "/{community_domain_id}/action-reviews/{review_id}/evidence",
    response_model=dict[str, Any],
)
def list_community_domain_action_review_evidence(
    community_domain_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )
    if not _can_view_action_review(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_evidence_not_visible",
                "message": "Only users who can view this action review can view its evidence.",
            },
        )

    evidence_items = (
        db.query(CommunityDomainActionReviewEvidence)
        .filter(CommunityDomainActionReviewEvidence.action_review_id == int(row.id))
        .filter(CommunityDomainActionReviewEvidence.status == "active")
        .order_by(
            CommunityDomainActionReviewEvidence.created_at.asc(),
            CommunityDomainActionReviewEvidence.id.asc(),
        )
        .all()
    )
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review_id": int(row.id),
        "items": [_action_review_evidence_payload(item) for item in evidence_items],
        "total": len(evidence_items),
        "boundary": (
            "Review evidence records metadata for documents or references supplied "
            "with a Community Domain action review. This endpoint does not upload, "
            "download, verify, or approve files."
        ),
    }


@router.post(
    "/{community_domain_id}/action-reviews/{review_id}/evidence",
    status_code=201,
    response_model=dict[str, Any],
)
def create_community_domain_action_review_evidence(
    community_domain_id: int,
    review_id: int,
    payload: CommunityDomainActionReviewEvidenceIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )
    if not _can_contribute_to_action_review(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_evidence_forbidden",
                "message": "Only the requester or a current scoped reviewer/admin can add evidence to this action review.",
            },
        )
    _ensure_action_review_accepts_append(row)

    evidence = CommunityDomainActionReviewEvidence(
        action_review_id=int(row.id),
        community_domain_id=int(domain.id),
        community_node_id=(
            int(row.community_node_id) if row.community_node_id is not None else None
        ),
        submitted_by_user_id=int(current_user.id),
        evidence_type=_clean_role(payload.evidence_type, "document"),
        title=_clean_str(payload.title),
        description=_clean_str(payload.description) or None,
        file_name=_clean_str(payload.file_name) or None,
        content_type=_clean_str(payload.content_type) or None,
        storage_key=_clean_str(payload.storage_key) or None,
        external_reference=_clean_str(payload.external_reference) or None,
        checksum=_clean_str(payload.checksum) or None,
        status="active",
    )
    db.add(evidence)
    db.commit()
    db.refresh(evidence)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review_id": int(row.id),
        "evidence": _action_review_evidence_payload(evidence),
        "boundary": (
            "Evidence metadata recorded. This does not upload, download, verify, "
            "approve, revise, cancel, or apply the action review."
        ),
    }


@router.get(
    "/{community_domain_id}/action-reviews/{review_id}/activity",
    response_model=dict[str, Any],
)
def get_community_domain_action_review_activity(
    community_domain_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )
    if not _can_view_action_review(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_activity_not_visible",
                "message": "Only users who can view this action review can view its activity.",
            },
        )

    activity_items = _action_review_activity_items(db, row)
    activity_items.sort(
        key=lambda item: (item["sort_at"], item["sort_order"], item["sort_id"])
    )
    _strip_activity_sort_fields(activity_items)

    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review_id": int(row.id),
        "items": activity_items,
        "total": len(activity_items),
        "boundary": (
            "Activity is a read-only merged view of review creation, decisions, "
            "comments, evidence metadata, and row-level terminal status changes. "
            "It does not decide, revise, reopen, cancel, upload, verify, or apply anything."
        ),
    }


@router.get(
    "/{community_domain_id}/action-reviews/{review_id}/lineage",
    response_model=dict[str, Any],
)
def get_community_domain_action_review_lineage(
    community_domain_id: int,
    review_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )

    ancestors: list[CommunityDomainActionReview] = []
    current = row
    seen_ids = {int(row.id)}
    while current.parent_review_id is not None and len(seen_ids) < 50:
        parent = _get_action_review_or_404(
            db,
            community_domain_id=int(domain.id),
            review_id=int(current.parent_review_id),
        )
        if int(parent.id) in seen_ids:
            break
        ancestors.append(parent)
        seen_ids.add(int(parent.id))
        current = parent

    lineage = list(reversed(ancestors)) + [row]
    current = row
    while len(seen_ids) < 50:
        child = (
            db.query(CommunityDomainActionReview)
            .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
            .filter(CommunityDomainActionReview.parent_review_id == int(current.id))
            .order_by(
                CommunityDomainActionReview.created_at.asc(),
                CommunityDomainActionReview.id.asc(),
            )
            .first()
        )
        if child is None or int(child.id) in seen_ids:
            break
        lineage.append(child)
        seen_ids.add(int(child.id))
        current = child

    if not any(
        _can_view_action_review(
            db,
            domain=domain,
            row=item,
            current_user=current_user,
        )
        for item in lineage
    ):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_lineage_not_visible",
                "message": "Only users who can view a review in this chain can view its lineage.",
            },
        )

    root_review = lineage[0]
    latest_review = lineage[-1]
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "root_review_id": int(root_review.id),
        "latest_review_id": int(latest_review.id),
        "requested_review_id": int(row.id),
        "items": [_action_review_payload(item) for item in lineage],
        "total": len(lineage),
        "boundary": (
            "Lineage shows linked revisions for one Community Domain action "
            "review. It is a read-only history view and does not reopen, decide, "
            "or apply any review."
        ),
    }


@router.post(
    "/{community_domain_id}/action-reviews/{review_id}/revision",
    status_code=201,
    response_model=dict[str, Any],
)
def revise_community_domain_action_review(
    community_domain_id: int,
    review_id: int,
    payload: CommunityDomainActionReviewRevisionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )

    if int(row.requested_by_user_id) != int(current_user.id):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_revision_forbidden",
                "message": "Only the original requester can revise this Community Domain action review.",
            },
        )

    current_status = _clean_role(row.status)
    if current_status not in {"cancelled", "rejected", "needs_changes"}:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_not_revisionable",
                "message": "Only cancelled, rejected, or needs-changes reviews can be revised.",
            },
        )

    existing_revision = (
        db.query(CommunityDomainActionReview)
        .filter(CommunityDomainActionReview.community_domain_id == int(domain.id))
        .filter(CommunityDomainActionReview.parent_review_id == int(row.id))
        .order_by(
            CommunityDomainActionReview.created_at.desc(),
            CommunityDomainActionReview.id.desc(),
        )
        .first()
    )
    if existing_revision is not None:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_revision_exists",
                "message": (
                    "This Community Domain action review already has a revision. "
                    "Continue from the existing revision instead of creating a fork."
                ),
                "existing_action_review": _action_review_payload(existing_revision),
            },
        )

    node_id: Optional[int] = (
        int(row.community_node_id) if row.community_node_id is not None else None
    )
    node: Optional[CommunityNode] = None
    if node_id is not None:
        node = _get_node_or_404(
            db,
            community_domain_id=int(domain.id),
            community_node_id=node_id,
        )
        _ensure_node_accepts_writes(db, domain=domain, node=node)

    policy: Optional[CommunityDomainPolicy] = getattr(row, "policy", None)
    if policy is None:
        policy = _matching_policy(
            db,
            community_domain_id=int(domain.id),
            action_key=row.action_key,
            community_node_id=node_id,
        )
    if policy is not None:
        if _clean_role(policy.status, "inactive") != "active":
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_policy_inactive",
                    "message": "This Community Domain policy is not active.",
                },
            )
        if _clean_role(policy.action_key) != _clean_role(row.action_key):
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_policy_action_mismatch",
                    "message": "This policy does not govern the requested action.",
                },
            )
        if not _policy_can_govern_node(
            db,
            domain=domain,
            policy=policy,
            node=node,
        ):
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_policy_node_mismatch",
                    "message": "This policy belongs to a different Community Domain node.",
                },
            )

    fields_set = payload.model_fields_set
    subject_user_id = (
        payload.subject_user_id
        if "subject_user_id" in fields_set
        else row.subject_user_id
    )
    if subject_user_id is not None:
        _get_user_or_404(db, int(subject_user_id))

    target_type = (
        _clean_role(payload.target_type)
        if "target_type" in fields_set and payload.target_type
        else row.target_type
    )
    target_id = (
        _clean_str(payload.target_id) or None
        if "target_id" in fields_set
        else row.target_id
    )
    request_note = (
        _clean_str(payload.request_note) or None
        if "request_note" in fields_set
        else row.request_note
    )
    revision_payload = (
        payload.payload if "payload" in fields_set else _json_load(row.payload_json)
    )

    revision = CommunityDomainActionReview(
        community_domain_id=int(domain.id),
        community_node_id=node_id,
        policy_id=int(policy.id) if policy is not None else None,
        parent_review_id=int(row.id),
        action_key=_clean_role(row.action_key),
        requested_by_user_id=int(current_user.id),
        subject_user_id=int(subject_user_id) if subject_user_id is not None else None,
        target_type=target_type,
        target_id=target_id,
        status="pending",
        request_note=request_note,
        payload_json=_json_dump(revision_payload),
    )
    db.add(revision)
    db.commit()
    db.refresh(revision)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "previous_action_review": _action_review_payload(row),
        "action_review": _action_review_payload(revision),
        "boundary": (
            "Revision created as a new pending review. The previous review remains "
            "unchanged for audit history; this does not apply the requested action."
        ),
    }


@router.post("/{community_domain_id}/action-reviews/{review_id}/cancel", response_model=dict[str, Any])
def cancel_community_domain_action_review(
    community_domain_id: int,
    review_id: int,
    payload: CommunityDomainActionReviewCancelIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    domain = _get_domain_or_404(db, community_domain_id)
    _require_domain_member_scope(db, domain=domain, current_user=current_user)
    row = _get_action_review_or_404(
        db,
        community_domain_id=int(domain.id),
        review_id=int(review_id),
    )

    is_requester = int(row.requested_by_user_id) == int(current_user.id)
    is_scoped_admin = False
    if not is_requester:
        try:
            _require_action_review_admin_scope(
                db,
                domain=domain,
                row=row,
                current_user=current_user,
            )
            is_scoped_admin = True
        except HTTPException:
            is_scoped_admin = False

    if not is_requester and not is_scoped_admin:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_cancel_forbidden",
                "message": "Only the requester or a scoped admin can cancel this action review.",
            },
        )

    if _clean_role(row.status) not in {"pending", "pending_review"}:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_not_cancellable",
                "message": "Only pending Community Domain action reviews can be cancelled.",
            },
        )

    row.status = "cancelled"
    row.decision = "cancel"
    row.decision_note = _clean_str(payload.cancel_note) or None
    row.decided_by_user_id = int(current_user.id)
    row.decided_at = datetime.now(timezone.utc)

    db.add(row)
    db.commit()
    db.refresh(row)
    return {
        "ok": True,
        "community_domain_id": int(domain.id),
        "action_review": _action_review_payload(row),
        "boundary": (
            "Action review cancelled before approval/application. This does not "
            "delete the audit record or reverse any already-applied business action."
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

    node = _require_action_review_decider_scope(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    )
    _require_policy_reviewer_role(
        db,
        domain=domain,
        node=node,
        policy=getattr(row, "policy", None),
        current_user=current_user,
    )

    if int(row.requested_by_user_id) == int(current_user.id):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_self_decision_forbidden",
                "message": "The requester cannot decide their own Community Domain action review.",
            },
        )

    current_status = _clean_role(row.status)
    if current_status == "applied":
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_already_applied",
                "message": "This Community Domain action review has already been applied.",
            },
        )
    if current_status not in {"pending", "pending_review"}:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_not_decidable",
                "message": "Only pending Community Domain action reviews can receive decisions.",
            },
        )

    decision = _clean_role(payload.decision)
    decision_row = (
        db.query(CommunityDomainActionReviewDecision)
        .filter(CommunityDomainActionReviewDecision.action_review_id == int(row.id))
        .filter(CommunityDomainActionReviewDecision.decided_by_user_id == int(current_user.id))
        .first()
    )
    if decision_row is not None:
        if _clean_role(decision_row.decision) == "recuse":
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "community_domain_review_recusal_final",
                    "message": "This reviewer has already recused from this Community Domain action review.",
                },
            )
        raise HTTPException(
            status_code=409,
            detail={
                "code": "community_domain_review_decision_already_recorded",
                "message": "This reviewer has already recorded a decision for this Community Domain action review.",
            },
        )
    if decision == "approve" and node is not None:
        _ensure_node_accepts_writes(db, domain=domain, node=node)

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
    recusal_count = sum(1 for item in decision_rows if _clean_role(item.decision) == "recuse")
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
        "recusal_count": recusal_count,
        "required_approvals": required_approvals,
        "boundary": (
            "Decision recorded. The review becomes approved only when the policy's "
            "required approval count is satisfied. A recusal records a reviewer "
            "stepping aside; it does not approve, reject, or apply the action."
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

    node, actor_scope = _require_action_review_admin_scope(
        db,
        domain=domain,
        row=row,
        current_user=current_user,
    )

    if int(row.requested_by_user_id) == int(current_user.id):
        raise HTTPException(
            status_code=403,
            detail={
                "code": "community_domain_review_self_apply_forbidden",
                "message": "The requester cannot apply their own Community Domain action review.",
            },
        )

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
        row.applied_by_user_id = int(current_user.id)
        row.applied_at = datetime.now(timezone.utc)
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
        _ensure_node_accepts_writes(db, domain=domain, node=node)
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
        row.applied_by_user_id = int(current_user.id)
        row.applied_at = datetime.now(timezone.utc)
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
