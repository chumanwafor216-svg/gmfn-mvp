from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import (
    CommunityDomain,
    CommunityDomainMembership,
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


def _clean_str(value: Optional[str], default: str = "") -> str:
    text = str(value or "").strip()
    return text or default


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


def _require_domain_owner_or_admin(
    domain: CommunityDomain,
    current_user: User,
) -> None:
    is_platform_admin = _clean_str(getattr(current_user, "role", "")).lower() == "admin"
    if is_platform_admin:
        return
    if int(domain.owner_user_id) == int(current_user.id):
        return
    raise HTTPException(
        status_code=403,
        detail="Only the Community Domain owner can manage this domain structure.",
    )


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


def _find_root_node(db: Session, community_domain_id: int) -> Optional[CommunityNode]:
    return (
        db.query(CommunityNode)
        .filter(CommunityNode.community_domain_id == int(community_domain_id))
        .filter(CommunityNode.parent_node_id.is_(None))
        .order_by(CommunityNode.depth.asc(), CommunityNode.id.asc())
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
    _require_domain_owner_or_admin(domain, current_user)
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
    _require_domain_owner_or_admin(domain, current_user)

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
    _require_domain_owner_or_admin(domain, current_user)

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
    _require_domain_owner_or_admin(domain, current_user)

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
    _require_domain_owner_or_admin(domain, current_user)
    _get_user_or_404(db, payload.user_id)

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

    membership.role = _clean_str(payload.role, "member")
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
    _require_domain_owner_or_admin(domain, current_user)
    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(community_node_id),
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
    _require_domain_owner_or_admin(domain, current_user)
    node = _get_node_or_404(
        db,
        community_domain_id=int(domain.id),
        community_node_id=int(community_node_id),
    )
    _get_user_or_404(db, payload.user_id)

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

    membership.role = _clean_str(payload.role, "member")
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
