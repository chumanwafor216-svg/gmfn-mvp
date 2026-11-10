from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import (
    CommerceTaxonomyProposal,
    CommerceTaxonomyRelease,
    MarketplaceShop,
    MarketplaceShopCapability,
)
from app.services.commerce_taxonomy_service import (
    CommerceTaxonomyError,
    add_concept_version,
    add_redirect,
    add_term,
    create_release,
    create_shop_capability,
    get_release,
    list_shop_capabilities,
    moderate_taxonomy_proposal,
    publish_release,
    require_admin_api_enabled,
    require_owner_api_enabled,
    resolve_approved_term,
    serialize_capability,
    serialize_proposal,
    serialize_release,
    submit_taxonomy_proposal,
    update_shop_capability,
    withdraw_release,
)


router = APIRouter(prefix="/commerce-taxonomy", tags=["commerce-taxonomy"])


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CoverageInput(StrictModel):
    scope_type: Literal["locality", "region", "country", "remote"]
    country_code: Optional[str] = Field(default=None, max_length=2)
    region_name: Optional[str] = Field(default=None, max_length=120)
    locality_name: Optional[str] = Field(default=None, max_length=120)


class CapabilityCreateInput(StrictModel):
    owner_description: str = Field(min_length=1, max_length=240)
    role_code: Literal[
        "manufactures",
        "sells",
        "repairs",
        "installs",
        "delivers",
        "rents",
        "teaches_trains",
        "professional_service",
        "other",
    ]
    concept_public_id: Optional[str] = Field(default=None, max_length=64)
    release_public_id: Optional[str] = Field(default=None, max_length=64)
    availability_status: Literal["available", "on_request", "unavailable", "unspecified"] = "unspecified"
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None
    availability_note: Optional[str] = Field(default=None, max_length=240)
    coverage: list[CoverageInput] = Field(default_factory=list, max_length=12)


class CapabilityUpdateInput(StrictModel):
    owner_description: Optional[str] = Field(default=None, min_length=1, max_length=240)
    role_code: Optional[
        Literal[
            "manufactures",
            "sells",
            "repairs",
            "installs",
            "delivers",
            "rents",
            "teaches_trains",
            "professional_service",
            "other",
        ]
    ] = None
    is_active: Optional[bool] = None
    availability_status: Optional[Literal["available", "on_request", "unavailable", "unspecified"]] = None
    available_from: Optional[datetime] = None
    available_until: Optional[datetime] = None
    availability_note: Optional[str] = Field(default=None, max_length=240)
    coverage: Optional[list[CoverageInput]] = Field(default=None, max_length=12)


class ProposalCreateInput(StrictModel):
    locale: Literal["en", "en-NG", "ig"]
    term: str = Field(min_length=2, max_length=200)
    proposed_concept_public_id: Optional[str] = Field(default=None, max_length=64)


class ReleaseCreateInput(StrictModel):
    version_number: int = Field(gt=0)
    languages: list[Literal["en", "en-NG", "ig"]] = Field(min_length=2, max_length=3)
    backup_steward_name: str = Field(min_length=2, max_length=160)
    safety_reviewer_name: str = Field(min_length=2, max_length=160)


class ConceptCreateInput(StrictModel):
    canonical_label: str = Field(min_length=2, max_length=160)
    concept_kind: Literal["product", "service", "hybrid"]
    sensitivity: Literal["standard", "regulated", "safety_critical"] = "standard"
    credential_notice: Optional[str] = Field(default=None, max_length=1000)
    description: Optional[str] = Field(default=None, max_length=2000)
    lifecycle_status: Literal["active", "retired"] = "active"
    parent_public_id: Optional[str] = Field(default=None, max_length=64)
    concept_public_id: Optional[str] = Field(default=None, max_length=64)
    sort_order: int = 0


class TermCreateInput(StrictModel):
    concept_public_id: str = Field(min_length=1, max_length=64)
    locale: Literal["en", "en-NG", "ig"]
    term: str = Field(min_length=2, max_length=200)
    term_kind: Literal["canonical", "alias"]
    approved: bool = False


class RedirectCreateInput(StrictModel):
    source_public_id: str = Field(min_length=1, max_length=64)
    target_public_id: str = Field(min_length=1, max_length=64)
    redirect_kind: Literal["renamed", "merged", "retired", "reparented"]
    reason: Optional[str] = Field(default=None, max_length=1000)


class WithdrawInput(StrictModel):
    reason: str = Field(min_length=2, max_length=1000)


class ProposalDecisionInput(StrictModel):
    decision: Literal["approved", "rejected", "duplicate"]
    reason: str = Field(min_length=2, max_length=1000)
    duplicate_of_public_id: Optional[str] = Field(default=None, max_length=64)


def _platform_admin_required(user: Any) -> None:
    if str(getattr(user, "role", "") or "").strip().lower() == "admin":
        return
    raise HTTPException(
        status_code=403,
        detail={
            "code": "platform_admin_required",
            "message": "Only a GSN platform administrator can manage taxonomy releases.",
        },
    )


def _raise_taxonomy_error(exc: CommerceTaxonomyError) -> None:
    raise HTTPException(
        status_code=int(exc.status_code),
        detail={"code": exc.code, "message": exc.message},
    ) from exc


def _shop_or_404(db: Session, *, shop_id: int) -> MarketplaceShop:
    shop = db.get(MarketplaceShop, int(shop_id))
    if shop is None:
        raise HTTPException(status_code=404, detail="Shop not found")
    return shop


def _capability_or_404(db: Session, *, shop_id: int, capability_public_id: str) -> MarketplaceShopCapability:
    capability = (
        db.query(MarketplaceShopCapability)
        .filter(MarketplaceShopCapability.shop_id == int(shop_id))
        .filter(MarketplaceShopCapability.public_id == str(capability_public_id))
        .one_or_none()
    )
    if capability is None:
        raise HTTPException(status_code=404, detail="Shop capability not found")
    return capability


@router.get("/shops/{shop_id}/capabilities")
def owner_list_capabilities(
    shop_id: int,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    try:
        require_owner_api_enabled()
        shop = _shop_or_404(db, shop_id=shop_id)
        if int(shop.owner_user_id) != int(current_user.id):
            raise CommerceTaxonomyError("shop_owner_required", "Only the Shop owner can view capability management.", status_code=403)
        return {"items": list_shop_capabilities(db, shop_id=int(shop.id))}
    except CommerceTaxonomyError as exc:
        _raise_taxonomy_error(exc)


@router.post("/shops/{shop_id}/capabilities", status_code=201)
def owner_create_capability(
    shop_id: int,
    payload: CapabilityCreateInput,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    try:
        capability = create_shop_capability(
            db,
            shop=_shop_or_404(db, shop_id=shop_id),
            actor_user_id=int(current_user.id),
            owner_description=payload.owner_description,
            role_code=payload.role_code,
            concept_public_id=payload.concept_public_id,
            release_public_id=payload.release_public_id,
            availability_status=payload.availability_status,
            available_from=payload.available_from,
            available_until=payload.available_until,
            availability_note=payload.availability_note,
            coverage=[item.model_dump() for item in payload.coverage],
        )
        item = serialize_capability(db, capability=capability)
        db.commit()
        return {"item": item}
    except CommerceTaxonomyError as exc:
        db.rollback()
        _raise_taxonomy_error(exc)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Duplicate or invalid Shop capability") from exc


@router.patch("/shops/{shop_id}/capabilities/{capability_public_id}")
def owner_update_capability(
    shop_id: int,
    capability_public_id: str,
    payload: CapabilityUpdateInput,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    try:
        require_owner_api_enabled()
        coverage = None if payload.coverage is None else [item.model_dump() for item in payload.coverage]
        capability = update_shop_capability(
            db,
            capability=_capability_or_404(db, shop_id=shop_id, capability_public_id=capability_public_id),
            actor_user_id=int(current_user.id),
            owner_description=payload.owner_description,
            role_code=payload.role_code,
            is_active=payload.is_active,
            availability_status=payload.availability_status,
            available_from=payload.available_from,
            available_until=payload.available_until,
            availability_note=payload.availability_note,
            replace_coverage=coverage,
        )
        item = serialize_capability(db, capability=capability)
        db.commit()
        return {"item": item}
    except CommerceTaxonomyError as exc:
        db.rollback()
        _raise_taxonomy_error(exc)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Duplicate or invalid Shop capability") from exc


@router.post("/shops/{shop_id}/term-proposals", status_code=201)
def owner_submit_term_proposal(
    shop_id: int,
    payload: ProposalCreateInput,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    try:
        proposal = submit_taxonomy_proposal(
            db,
            shop=_shop_or_404(db, shop_id=shop_id),
            actor_user_id=int(current_user.id),
            locale=payload.locale,
            term=payload.term,
            proposed_concept_public_id=payload.proposed_concept_public_id,
        )
        item = serialize_proposal(proposal)
        db.commit()
        return {"item": item}
    except CommerceTaxonomyError as exc:
        db.rollback()
        _raise_taxonomy_error(exc)


@router.get("/resolve")
def owner_resolve_term(
    term: str = Query(min_length=2, max_length=200),
    locale: Literal["en", "en-NG", "ig"] = Query(default="en-NG"),
    release_public_id: Optional[str] = Query(default=None, max_length=64),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    del current_user
    try:
        require_owner_api_enabled()
        return {"item": resolve_approved_term(db, term=term, locale=locale, release_public_id=release_public_id)}
    except CommerceTaxonomyError as exc:
        _raise_taxonomy_error(exc)


@router.post("/admin/releases", status_code=201)
def admin_create_release(
    payload: ReleaseCreateInput,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    try:
        _platform_admin_required(current_user)
        require_admin_api_enabled()
        release = create_release(
            db,
            version_number=payload.version_number,
            languages=payload.languages,
            steward_user_id=int(current_user.id),
            backup_steward_name=payload.backup_steward_name,
            safety_reviewer_name=payload.safety_reviewer_name,
        )
        item = serialize_release(release)
        db.commit()
        return {"item": item}
    except CommerceTaxonomyError as exc:
        db.rollback()
        _raise_taxonomy_error(exc)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Taxonomy release already exists") from exc


@router.post("/admin/releases/{release_public_id}/concepts", status_code=201)
def admin_add_concept(
    release_public_id: str,
    payload: ConceptCreateInput,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    try:
        _platform_admin_required(current_user)
        require_admin_api_enabled()
        concept, version = add_concept_version(
            db,
            release=get_release(db, public_id=release_public_id, lock=True),
            actor_user_id=int(current_user.id),
            canonical_label=payload.canonical_label,
            concept_kind=payload.concept_kind,
            sensitivity=payload.sensitivity,
            credential_notice=payload.credential_notice,
            description=payload.description,
            lifecycle_status=payload.lifecycle_status,
            parent_public_id=payload.parent_public_id,
            concept_public_id=payload.concept_public_id,
            sort_order=payload.sort_order,
        )
        db.commit()
        return {
            "item": {
                "public_id": concept.public_id,
                "canonical_label": version.canonical_label,
                "concept_kind": version.concept_kind,
                "sensitivity": version.sensitivity,
                "credential_status": "not_assessed" if version.sensitivity != "standard" else "not_applicable",
            }
        }
    except CommerceTaxonomyError as exc:
        db.rollback()
        _raise_taxonomy_error(exc)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Duplicate or invalid taxonomy concept") from exc


@router.post("/admin/releases/{release_public_id}/terms", status_code=201)
def admin_add_term(
    release_public_id: str,
    payload: TermCreateInput,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    try:
        _platform_admin_required(current_user)
        require_admin_api_enabled()
        term = add_term(
            db,
            release=get_release(db, public_id=release_public_id, lock=True),
            concept_public_id=payload.concept_public_id,
            locale=payload.locale,
            term=payload.term,
            term_kind=payload.term_kind,
            actor_user_id=int(current_user.id),
            approved=payload.approved,
        )
        db.commit()
        return {"item": {"term": term.term, "locale": term.locale, "review_status": term.review_status}}
    except CommerceTaxonomyError as exc:
        db.rollback()
        _raise_taxonomy_error(exc)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Taxonomy term already resolves in this release") from exc


@router.post("/admin/releases/{release_public_id}/redirects", status_code=201)
def admin_add_redirect(
    release_public_id: str,
    payload: RedirectCreateInput,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    try:
        _platform_admin_required(current_user)
        require_admin_api_enabled()
        row = add_redirect(
            db,
            release=get_release(db, public_id=release_public_id, lock=True),
            source_public_id=payload.source_public_id,
            target_public_id=payload.target_public_id,
            redirect_kind=payload.redirect_kind,
            actor_user_id=int(current_user.id),
            reason=payload.reason,
        )
        db.commit()
        return {"item": {"redirect_kind": row.redirect_kind}}
    except CommerceTaxonomyError as exc:
        db.rollback()
        _raise_taxonomy_error(exc)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Duplicate or invalid taxonomy redirect") from exc


@router.post("/admin/releases/{release_public_id}/publish")
def admin_publish_release(
    release_public_id: str,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    try:
        _platform_admin_required(current_user)
        release = publish_release(db, release_public_id=release_public_id, actor_user_id=int(current_user.id))
        item = serialize_release(release)
        db.commit()
        return {"item": item}
    except CommerceTaxonomyError as exc:
        db.rollback()
        _raise_taxonomy_error(exc)


@router.post("/admin/releases/{release_public_id}/withdraw")
def admin_withdraw_release(
    release_public_id: str,
    payload: WithdrawInput,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    try:
        _platform_admin_required(current_user)
        release = withdraw_release(
            db,
            release_public_id=release_public_id,
            actor_user_id=int(current_user.id),
            reason=payload.reason,
        )
        item = serialize_release(release)
        db.commit()
        return {"item": item}
    except CommerceTaxonomyError as exc:
        db.rollback()
        _raise_taxonomy_error(exc)


@router.get("/admin/proposals")
def admin_list_proposals(
    status: Literal["pending", "approved", "rejected", "duplicate", "withdrawn"] = Query(default="pending"),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    try:
        _platform_admin_required(current_user)
        require_admin_api_enabled()
        rows = (
            db.query(CommerceTaxonomyProposal)
            .filter(CommerceTaxonomyProposal.status == status)
            .order_by(CommerceTaxonomyProposal.id.asc())
            .limit(int(limit))
            .all()
        )
        return {"items": [serialize_proposal(row) for row in rows]}
    except CommerceTaxonomyError as exc:
        _raise_taxonomy_error(exc)


@router.post("/admin/proposals/{proposal_public_id}/decision")
def admin_decide_proposal(
    proposal_public_id: str,
    payload: ProposalDecisionInput,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_user),
):
    try:
        _platform_admin_required(current_user)
        proposal = moderate_taxonomy_proposal(
            db,
            proposal_public_id=proposal_public_id,
            actor_user_id=int(current_user.id),
            decision=payload.decision,
            reason=payload.reason,
            duplicate_of_public_id=payload.duplicate_of_public_id,
        )
        item = serialize_proposal(proposal)
        db.commit()
        return {"item": item}
    except CommerceTaxonomyError as exc:
        db.rollback()
        _raise_taxonomy_error(exc)
