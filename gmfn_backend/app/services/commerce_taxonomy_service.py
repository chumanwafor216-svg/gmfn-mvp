from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
import os
import re
import unicodedata
from typing import Any, Iterable, Mapping, Optional, Sequence
from uuid import uuid4

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import (
    CommerceTaxonomyConcept,
    CommerceTaxonomyConceptVersion,
    CommerceTaxonomyProposal,
    CommerceTaxonomyRedirect,
    CommerceTaxonomyRelease,
    CommerceTaxonomyTerm,
    MarketplaceProductCapability,
    MarketplaceShop,
    MarketplaceShopCapability,
    MarketplaceShopCapabilityAvailability,
    MarketplaceShopCapabilityCoverage,
)
from app.services.commerce_taxonomy_checksum import checksum_release_payload


OWNER_API_FLAG = "GSN_COMMERCE_TAXONOMY_OWNER_API_ENABLED"
ADMIN_API_FLAG = "GSN_COMMERCE_TAXONOMY_ADMIN_API_ENABLED"
PUBLICATION_FLAG = "GSN_COMMERCE_TAXONOMY_PUBLICATION_ENABLED"

SUPPORTED_LOCALES = frozenset({"en", "en-NG", "ig"})
BASE_RELEASE_LOCALES = frozenset({"en", "en-NG"})
CAPABILITY_ROLES = frozenset(
    {
        "manufactures",
        "sells",
        "repairs",
        "installs",
        "delivers",
        "rents",
        "teaches_trains",
        "professional_service",
        "other",
    }
)
AVAILABILITY_STATUSES = frozenset({"available", "on_request", "unavailable", "unspecified"})
COVERAGE_SCOPES = frozenset({"locality", "region", "country", "remote"})
CONCEPT_KINDS = frozenset({"product", "service", "hybrid"})
SENSITIVITY_LEVELS = frozenset({"standard", "regulated", "safety_critical"})
REDIRECT_KINDS = frozenset({"renamed", "merged", "retired", "reparented"})
PROPOSAL_DECISIONS = frozenset({"approved", "rejected", "duplicate"})

MAX_CAPABILITIES_PER_SHOP = 100
MAX_COVERAGE_ROWS_PER_CAPABILITY = 12
MAX_PROPOSALS_PER_OWNER_PER_DAY = 10
PROPOSAL_RETENTION_DAYS = 365
MAX_REDIRECT_DEPTH = 16

_ENVIRONMENT_KEYS = ("GSN_ENV", "APP_ENV", "ENVIRONMENT")
_APPROVED_NON_PRODUCTION_ENVIRONMENTS = frozenset({"local", "development", "dev", "test", "testing"})
_RECOGNIZED_ENVIRONMENTS = _APPROVED_NON_PRODUCTION_ENVIRONMENTS | frozenset(
    {"production", "prod", "staging", "stage", "live"}
)
_TRUTHY = frozenset({"1", "true", "yes", "on"})
_PROPOSAL_PII_PATTERN = re.compile(
    r"(?:https?://|www\.|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\+?\d[\d\s().-]{7,}\d)",
    re.IGNORECASE,
)


class CommerceTaxonomyError(ValueError):
    def __init__(self, code: str, message: str, *, status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def _flag_enabled(name: str) -> bool:
    return str(os.getenv(name, "") or "").strip().lower() in _TRUTHY


def owner_api_enabled() -> bool:
    return _flag_enabled(OWNER_API_FLAG)


def admin_api_enabled() -> bool:
    return _flag_enabled(ADMIN_API_FLAG)


def publication_enabled() -> bool:
    return _flag_enabled(PUBLICATION_FLAG)


def require_owner_api_enabled() -> None:
    if not owner_api_enabled():
        raise CommerceTaxonomyError(
            "commerce_taxonomy_owner_api_disabled",
            "Commerce capability management is not enabled.",
            status_code=404,
        )


def require_admin_api_enabled() -> None:
    if not admin_api_enabled():
        raise CommerceTaxonomyError(
            "commerce_taxonomy_admin_api_disabled",
            "Commerce taxonomy administration is not enabled.",
            status_code=404,
        )


def publication_environment_authorized() -> bool:
    present: list[str] = []
    for key in _ENVIRONMENT_KEYS:
        if key not in os.environ:
            continue
        value = str(os.environ.get(key) or "").strip().lower()
        if not value or value not in _RECOGNIZED_ENVIRONMENTS:
            return False
        present.append(value)
    return bool(present) and len(set(present)) == 1 and present[0] in _APPROVED_NON_PRODUCTION_ENVIRONMENTS


def require_publication_enabled() -> None:
    if not publication_enabled():
        raise CommerceTaxonomyError(
            "commerce_taxonomy_publication_disabled",
            "Taxonomy publication is not enabled.",
            status_code=404,
        )
    if not publication_environment_authorized():
        raise CommerceTaxonomyError(
            "commerce_taxonomy_publication_environment_prohibited",
            "Taxonomy publication requires one explicit, approved non-production environment value.",
            status_code=403,
        )


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def normalize_term(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", str(value or ""))
    return " ".join(normalized.strip().casefold().split())


def clean_text(value: Optional[str], *, maximum: int, required: bool = False) -> Optional[str]:
    if value is None:
        if required:
            raise CommerceTaxonomyError("text_required", "A required text value is missing.")
        return None
    cleaned = " ".join(unicodedata.normalize("NFKC", str(value)).strip().split())
    if required and not cleaned:
        raise CommerceTaxonomyError("text_required", "A required text value is blank.")
    if any(unicodedata.category(char) == "Cc" for char in cleaned):
        raise CommerceTaxonomyError("text_contains_control_characters", "Control characters are not allowed.")
    if len(cleaned) > maximum:
        raise CommerceTaxonomyError("text_too_long", f"Text must not exceed {maximum} characters.")
    return cleaned or None


def normalize_locale(value: str) -> str:
    raw = str(value or "").strip().replace("_", "-")
    folded = raw.casefold()
    aliases = {"en": "en", "en-ng": "en-NG", "ig": "ig"}
    locale = aliases.get(folded)
    if locale is None or locale not in SUPPORTED_LOCALES:
        raise CommerceTaxonomyError(
            "unsupported_taxonomy_locale",
            "Only English, Nigerian English and reviewed Igbo taxonomy terms are supported in this phase.",
        )
    return locale


def _new_public_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:20].upper()}"


def _release_languages(release: CommerceTaxonomyRelease) -> list[str]:
    try:
        parsed = json.loads(release.languages_json or "[]")
    except Exception:
        parsed = []
    return [str(item) for item in parsed if str(item) in SUPPORTED_LOCALES]


def _require_draft(release: CommerceTaxonomyRelease) -> None:
    if str(release.status or "") != "draft":
        raise CommerceTaxonomyError(
            "published_taxonomy_release_immutable",
            "Published or withdrawn taxonomy releases cannot be changed.",
            status_code=409,
        )


def create_release(
    db: Session,
    *,
    version_number: int,
    languages: Sequence[str],
    steward_user_id: int,
    backup_steward_name: str,
    safety_reviewer_name: str,
) -> CommerceTaxonomyRelease:
    normalized_languages = sorted({normalize_locale(item) for item in languages})
    if not BASE_RELEASE_LOCALES.issubset(normalized_languages):
        raise CommerceTaxonomyError(
            "taxonomy_base_languages_required",
            "Each release must include English and Nigerian English.",
        )
    backup = clean_text(backup_steward_name, maximum=160, required=True)
    reviewer = clean_text(safety_reviewer_name, maximum=160, required=True)
    if normalize_term(backup or "") == normalize_term(reviewer or ""):
        raise CommerceTaxonomyError(
            "taxonomy_independent_reviewer_required",
            "The backup steward and independent safety reviewer must be different people.",
        )
    if int(version_number) <= 0:
        raise CommerceTaxonomyError("invalid_taxonomy_version", "Taxonomy version must be positive.")
    existing = (
        db.query(CommerceTaxonomyRelease)
        .filter(CommerceTaxonomyRelease.version_number == int(version_number))
        .one_or_none()
    )
    if existing is not None:
        raise CommerceTaxonomyError("taxonomy_release_exists", "That taxonomy version already exists.", status_code=409)
    release = CommerceTaxonomyRelease(
        public_id=_new_public_id("GSN-TAX-R"),
        version_number=int(version_number),
        status="draft",
        languages_json=json.dumps(normalized_languages, separators=(",", ":"), sort_keys=True),
        steward_user_id=int(steward_user_id),
        backup_steward_name=backup,
        safety_reviewer_name=reviewer,
    )
    db.add(release)
    db.flush()
    return release


def get_release(db: Session, *, public_id: str, lock: bool = False) -> CommerceTaxonomyRelease:
    query = db.query(CommerceTaxonomyRelease).filter(CommerceTaxonomyRelease.public_id == str(public_id))
    if lock:
        query = query.with_for_update()
    release = query.one_or_none()
    if release is None:
        raise CommerceTaxonomyError("taxonomy_release_not_found", "Taxonomy release not found.", status_code=404)
    return release


def add_concept_version(
    db: Session,
    *,
    release: CommerceTaxonomyRelease,
    actor_user_id: int,
    canonical_label: str,
    concept_kind: str,
    sensitivity: str = "standard",
    credential_notice: Optional[str] = None,
    description: Optional[str] = None,
    lifecycle_status: str = "active",
    parent_public_id: Optional[str] = None,
    concept_public_id: Optional[str] = None,
    sort_order: int = 0,
) -> tuple[CommerceTaxonomyConcept, CommerceTaxonomyConceptVersion]:
    _require_draft(release)
    kind = str(concept_kind or "").strip().lower()
    if kind not in CONCEPT_KINDS:
        raise CommerceTaxonomyError("invalid_concept_kind", "Concept kind is not supported.")
    sensitivity_value = str(sensitivity or "standard").strip().lower()
    if sensitivity_value not in SENSITIVITY_LEVELS:
        raise CommerceTaxonomyError("invalid_concept_sensitivity", "Concept sensitivity is not supported.")
    lifecycle = str(lifecycle_status or "active").strip().lower()
    if lifecycle not in {"active", "retired"}:
        raise CommerceTaxonomyError("invalid_concept_lifecycle", "Concept lifecycle is not supported.")
    label = clean_text(canonical_label, maximum=160, required=True)
    notice = clean_text(credential_notice, maximum=1000)
    if sensitivity_value != "standard" and not notice:
        raise CommerceTaxonomyError(
            "sensitive_concept_notice_required",
            "Regulated and safety-critical concepts require a non-credential warning.",
        )
    concept = None
    if concept_public_id:
        concept = (
            db.query(CommerceTaxonomyConcept)
            .filter(CommerceTaxonomyConcept.public_id == str(concept_public_id))
            .one_or_none()
        )
        if concept is None:
            raise CommerceTaxonomyError("taxonomy_concept_not_found", "Stable concept not found.", status_code=404)
    else:
        concept = CommerceTaxonomyConcept(
            public_id=_new_public_id("GSN-TAX-C"),
            created_by_user_id=int(actor_user_id),
        )
        db.add(concept)
        db.flush()
    parent_id = None
    if parent_public_id:
        parent = (
            db.query(CommerceTaxonomyConcept)
            .filter(CommerceTaxonomyConcept.public_id == str(parent_public_id))
            .one_or_none()
        )
        if parent is None:
            raise CommerceTaxonomyError("taxonomy_parent_not_found", "Parent concept not found.", status_code=404)
        if int(parent.id) == int(concept.id):
            raise CommerceTaxonomyError("taxonomy_parent_cycle", "A concept cannot be its own parent.")
        parent_id = int(parent.id)
    duplicate = (
        db.query(CommerceTaxonomyConceptVersion)
        .filter(CommerceTaxonomyConceptVersion.release_id == int(release.id))
        .filter(CommerceTaxonomyConceptVersion.concept_id == int(concept.id))
        .one_or_none()
    )
    if duplicate is not None:
        raise CommerceTaxonomyError("taxonomy_concept_version_exists", "Concept already exists in this release.", status_code=409)
    version = CommerceTaxonomyConceptVersion(
        release_id=int(release.id),
        concept_id=int(concept.id),
        parent_concept_id=parent_id,
        canonical_label=label,
        description=clean_text(description, maximum=2000),
        concept_kind=kind,
        sensitivity=sensitivity_value,
        credential_notice=notice,
        lifecycle_status=lifecycle,
        sort_order=int(sort_order),
        created_by_user_id=int(actor_user_id),
    )
    db.add(version)
    db.flush()
    return concept, version


def add_term(
    db: Session,
    *,
    release: CommerceTaxonomyRelease,
    concept_public_id: str,
    locale: str,
    term: str,
    term_kind: str,
    actor_user_id: int,
    approved: bool,
) -> CommerceTaxonomyTerm:
    _require_draft(release)
    locale_value = normalize_locale(locale)
    if locale_value not in _release_languages(release):
        raise CommerceTaxonomyError("locale_not_in_release", "That locale is not enabled for this release.")
    kind = str(term_kind or "").strip().lower()
    if kind not in {"canonical", "alias"}:
        raise CommerceTaxonomyError("invalid_taxonomy_term_kind", "Term kind is not supported.")
    cleaned = clean_text(term, maximum=200, required=True) or ""
    normalized = normalize_term(cleaned)
    if len(normalized) < 2:
        raise CommerceTaxonomyError("taxonomy_term_too_short", "Taxonomy terms must contain at least two characters.")
    concept = (
        db.query(CommerceTaxonomyConcept)
        .filter(CommerceTaxonomyConcept.public_id == str(concept_public_id))
        .one_or_none()
    )
    if concept is None:
        raise CommerceTaxonomyError("taxonomy_concept_not_found", "Stable concept not found.", status_code=404)
    in_release = (
        db.query(CommerceTaxonomyConceptVersion.id)
        .filter(CommerceTaxonomyConceptVersion.release_id == int(release.id))
        .filter(CommerceTaxonomyConceptVersion.concept_id == int(concept.id))
        .first()
    )
    if in_release is None:
        raise CommerceTaxonomyError("concept_not_in_release", "Concept is not defined in this release.")
    duplicate = (
        db.query(CommerceTaxonomyTerm)
        .filter(CommerceTaxonomyTerm.release_id == int(release.id))
        .filter(CommerceTaxonomyTerm.locale == locale_value)
        .filter(CommerceTaxonomyTerm.normalized_term == normalized)
        .one_or_none()
    )
    if duplicate is not None:
        raise CommerceTaxonomyError("taxonomy_term_conflict", "That term already resolves in this release.", status_code=409)
    now = utcnow()
    row = CommerceTaxonomyTerm(
        release_id=int(release.id),
        concept_id=int(concept.id),
        locale=locale_value,
        term=cleaned,
        normalized_term=normalized,
        term_kind=kind,
        review_status="approved" if approved else "draft",
        reviewed_by_user_id=int(actor_user_id) if approved else None,
        reviewed_at=now if approved else None,
        created_by_user_id=int(actor_user_id),
    )
    db.add(row)
    db.flush()
    return row


def add_redirect(
    db: Session,
    *,
    release: CommerceTaxonomyRelease,
    source_public_id: str,
    target_public_id: str,
    redirect_kind: str,
    actor_user_id: int,
    reason: Optional[str] = None,
) -> CommerceTaxonomyRedirect:
    _require_draft(release)
    kind = str(redirect_kind or "").strip().lower()
    if kind not in REDIRECT_KINDS:
        raise CommerceTaxonomyError("invalid_taxonomy_redirect_kind", "Redirect kind is not supported.")
    concepts = {
        row.public_id: row
        for row in db.query(CommerceTaxonomyConcept)
        .filter(CommerceTaxonomyConcept.public_id.in_([str(source_public_id), str(target_public_id)]))
        .all()
    }
    source = concepts.get(str(source_public_id))
    target = concepts.get(str(target_public_id))
    if source is None or target is None:
        raise CommerceTaxonomyError("taxonomy_redirect_concept_missing", "Redirect concepts must both exist.", status_code=404)
    if int(source.id) == int(target.id):
        raise CommerceTaxonomyError("taxonomy_redirect_self", "A concept cannot redirect to itself.")
    release_concept_ids = {
        int(row[0])
        for row in db.query(CommerceTaxonomyConceptVersion.concept_id)
        .filter(CommerceTaxonomyConceptVersion.release_id == int(release.id))
        .all()
    }
    if int(source.id) not in release_concept_ids or int(target.id) not in release_concept_ids:
        raise CommerceTaxonomyError("taxonomy_redirect_outside_release", "Redirect concepts must be defined in the same release.")
    row = CommerceTaxonomyRedirect(
        release_id=int(release.id),
        source_concept_id=int(source.id),
        target_concept_id=int(target.id),
        redirect_kind=kind,
        reason=clean_text(reason, maximum=1000),
        created_by_user_id=int(actor_user_id),
    )
    db.add(row)
    db.flush()
    _assert_redirect_graph_acyclic(db, release_id=int(release.id))
    return row


def _assert_redirect_graph_acyclic(db: Session, *, release_id: int) -> None:
    redirects = {
        int(row.source_concept_id): int(row.target_concept_id)
        for row in db.query(CommerceTaxonomyRedirect)
        .filter(CommerceTaxonomyRedirect.release_id == int(release_id))
        .all()
    }
    for source in redirects:
        seen: set[int] = set()
        current = source
        for _ in range(MAX_REDIRECT_DEPTH + 1):
            if current in seen:
                raise CommerceTaxonomyError("taxonomy_redirect_cycle", "Taxonomy redirects cannot contain a cycle.")
            seen.add(current)
            target = redirects.get(current)
            if target is None:
                break
            current = target
        else:
            raise CommerceTaxonomyError("taxonomy_redirect_depth_exceeded", "Taxonomy redirect chain is too deep.")


def _canonical_release_payload(db: Session, *, release: CommerceTaxonomyRelease) -> dict[str, Any]:
    concepts = (
        db.query(CommerceTaxonomyConceptVersion, CommerceTaxonomyConcept)
        .join(CommerceTaxonomyConcept, CommerceTaxonomyConcept.id == CommerceTaxonomyConceptVersion.concept_id)
        .filter(CommerceTaxonomyConceptVersion.release_id == int(release.id))
        .order_by(CommerceTaxonomyConcept.public_id.asc())
        .all()
    )
    terms = (
        db.query(CommerceTaxonomyTerm, CommerceTaxonomyConcept)
        .join(CommerceTaxonomyConcept, CommerceTaxonomyConcept.id == CommerceTaxonomyTerm.concept_id)
        .filter(CommerceTaxonomyTerm.release_id == int(release.id))
        .order_by(CommerceTaxonomyTerm.locale.asc(), CommerceTaxonomyTerm.normalized_term.asc())
        .all()
    )
    concept_public_ids = {
        int(concept.id): str(concept.public_id)
        for _, concept in concepts
    }
    redirect_rows = (
        db.query(CommerceTaxonomyRedirect)
        .filter(CommerceTaxonomyRedirect.release_id == int(release.id))
        .order_by(CommerceTaxonomyRedirect.source_concept_id.asc())
        .all()
    )
    return {
        "contract_version": 1,
        "release_public_id": str(release.public_id),
        "version_number": int(release.version_number),
        "languages": sorted(_release_languages(release)),
        "concepts": [
            {
                "public_id": str(concept.public_id),
                "parent_public_id": concept_public_ids.get(version.parent_concept_id),
                "canonical_label": str(version.canonical_label),
                "description": version.description,
                "concept_kind": str(version.concept_kind),
                "sensitivity": str(version.sensitivity),
                "credential_notice": version.credential_notice,
                "lifecycle_status": str(version.lifecycle_status),
                "sort_order": int(version.sort_order or 0),
            }
            for version, concept in concepts
        ],
        "terms": [
            {
                "concept_public_id": str(concept.public_id),
                "locale": str(term.locale),
                "term": str(term.term),
                "normalized_term": str(term.normalized_term),
                "term_kind": str(term.term_kind),
                "review_status": str(term.review_status),
            }
            for term, concept in terms
        ],
        "redirects": [
            {
                "source_public_id": concept_public_ids.get(int(row.source_concept_id)),
                "target_public_id": concept_public_ids.get(int(row.target_concept_id)),
                "redirect_kind": str(row.redirect_kind),
                "reason": row.reason,
            }
            for row in redirect_rows
        ],
    }


def release_checksum(db: Session, *, release: CommerceTaxonomyRelease) -> str:
    payload = _canonical_release_payload(db, release=release)
    return checksum_release_payload(payload)


def verify_release_integrity(db: Session, *, release: CommerceTaxonomyRelease) -> bool:
    if not release.checksum:
        return False
    return str(release.checksum) == release_checksum(db, release=release)


def _validate_release_for_publication(db: Session, *, release: CommerceTaxonomyRelease) -> None:
    _require_draft(release)
    languages = set(_release_languages(release))
    if not BASE_RELEASE_LOCALES.issubset(languages):
        raise CommerceTaxonomyError("taxonomy_base_languages_required", "Published releases require English and Nigerian English.")
    if not clean_text(release.backup_steward_name, maximum=160, required=True):
        raise CommerceTaxonomyError("taxonomy_backup_steward_required", "A backup taxonomy steward is required.")
    if not clean_text(release.safety_reviewer_name, maximum=160, required=True):
        raise CommerceTaxonomyError("taxonomy_safety_reviewer_required", "An independent safety reviewer is required.")
    if normalize_term(release.backup_steward_name or "") == normalize_term(release.safety_reviewer_name or ""):
        raise CommerceTaxonomyError("taxonomy_independent_reviewer_required", "The safety reviewer must be independent.")
    versions = (
        db.query(CommerceTaxonomyConceptVersion)
        .filter(CommerceTaxonomyConceptVersion.release_id == int(release.id))
        .all()
    )
    if not versions:
        raise CommerceTaxonomyError("taxonomy_release_empty", "A taxonomy release cannot be published without concepts.")
    concept_ids = {int(row.concept_id) for row in versions}
    for row in versions:
        if row.parent_concept_id is not None and int(row.parent_concept_id) not in concept_ids:
            raise CommerceTaxonomyError("taxonomy_parent_outside_release", "Every parent must exist in the same release.")
        if str(row.sensitivity) != "standard" and not clean_text(row.credential_notice, maximum=1000, required=True):
            raise CommerceTaxonomyError("sensitive_concept_notice_required", "Sensitive concepts require a non-credential warning.")
    terms = (
        db.query(CommerceTaxonomyTerm)
        .filter(CommerceTaxonomyTerm.release_id == int(release.id))
        .all()
    )
    if any(str(term.review_status) != "approved" for term in terms):
        raise CommerceTaxonomyError("taxonomy_terms_unapproved", "Every published taxonomy term must be approved.")
    if any(str(term.locale) == "ig" and term.reviewed_by_user_id is None for term in terms):
        raise CommerceTaxonomyError("igbo_alias_review_required", "Every Igbo term must have a recorded reviewer.")
    canonical_pairs = {(int(term.concept_id), str(term.locale)) for term in terms if str(term.term_kind) == "canonical"}
    for concept_id in concept_ids:
        for locale in BASE_RELEASE_LOCALES:
            if (concept_id, locale) not in canonical_pairs:
                raise CommerceTaxonomyError(
                    "taxonomy_canonical_term_missing",
                    "Every concept requires approved English and Nigerian English canonical terms.",
                )
    _assert_redirect_graph_acyclic(db, release_id=int(release.id))


def publish_release(
    db: Session,
    *,
    release_public_id: str,
    actor_user_id: int,
) -> CommerceTaxonomyRelease:
    require_admin_api_enabled()
    require_publication_enabled()
    release = get_release(db, public_id=release_public_id, lock=True)
    _validate_release_for_publication(db, release=release)
    release.checksum = release_checksum(db, release=release)
    release.status = "published"
    release.published_by_user_id = int(actor_user_id)
    release.published_at = utcnow()
    db.flush()
    return release


def withdraw_release(
    db: Session,
    *,
    release_public_id: str,
    actor_user_id: int,
    reason: str,
) -> CommerceTaxonomyRelease:
    require_admin_api_enabled()
    release = get_release(db, public_id=release_public_id, lock=True)
    if str(release.status) != "published":
        raise CommerceTaxonomyError("taxonomy_release_not_published", "Only a published release can be withdrawn.", status_code=409)
    if not verify_release_integrity(db, release=release):
        raise CommerceTaxonomyError("taxonomy_release_integrity_failed", "Release integrity verification failed.", status_code=409)
    release.status = "withdrawn"
    release.withdrawn_by_user_id = int(actor_user_id)
    release.withdrawn_at = utcnow()
    release.withdrawal_reason = clean_text(reason, maximum=1000, required=True)
    db.flush()
    return release


def resolve_approved_term(
    db: Session,
    *,
    term: str,
    locale: str,
    release_public_id: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    locale_value = normalize_locale(locale)
    if release_public_id:
        release = get_release(db, public_id=release_public_id)
        if str(release.status) not in {"published", "withdrawn"}:
            return None
    else:
        release = (
            db.query(CommerceTaxonomyRelease)
            .filter(CommerceTaxonomyRelease.status == "published")
            .order_by(CommerceTaxonomyRelease.version_number.desc())
            .first()
        )
        if release is None:
            return None
    if not verify_release_integrity(db, release=release):
        raise CommerceTaxonomyError("taxonomy_release_integrity_failed", "Release integrity verification failed.", status_code=409)
    normalized = normalize_term(term)
    locale_order = [locale_value]
    if locale_value == "ig":
        locale_order.extend(["en-NG", "en"])
    elif locale_value == "en-NG":
        locale_order.append("en")
    rows = (
        db.query(CommerceTaxonomyTerm)
        .filter(CommerceTaxonomyTerm.release_id == int(release.id))
        .filter(CommerceTaxonomyTerm.review_status == "approved")
        .filter(CommerceTaxonomyTerm.normalized_term == normalized)
        .filter(CommerceTaxonomyTerm.locale.in_(locale_order))
        .all()
    )
    by_locale = {str(row.locale): row for row in rows}
    matched = next((by_locale.get(item) for item in locale_order if by_locale.get(item) is not None), None)
    if matched is None:
        return None
    original_concept_id = int(matched.concept_id)
    resolved_concept_id = original_concept_id
    redirect_path: list[int] = []
    redirects = {
        int(row.source_concept_id): int(row.target_concept_id)
        for row in db.query(CommerceTaxonomyRedirect)
        .filter(CommerceTaxonomyRedirect.release_id == int(release.id))
        .all()
    }
    for _ in range(MAX_REDIRECT_DEPTH):
        next_id = redirects.get(resolved_concept_id)
        if next_id is None:
            break
        if next_id in redirect_path or next_id == original_concept_id:
            raise CommerceTaxonomyError("taxonomy_redirect_cycle", "Taxonomy redirect cycle detected.", status_code=409)
        redirect_path.append(next_id)
        resolved_concept_id = next_id
    concept = db.get(CommerceTaxonomyConcept, resolved_concept_id)
    version = (
        db.query(CommerceTaxonomyConceptVersion)
        .filter(CommerceTaxonomyConceptVersion.release_id == int(release.id))
        .filter(CommerceTaxonomyConceptVersion.concept_id == resolved_concept_id)
        .one()
    )
    original = db.get(CommerceTaxonomyConcept, original_concept_id)
    return {
        "release_public_id": str(release.public_id),
        "release_status": str(release.status),
        "matched_locale": str(matched.locale),
        "matched_term": str(matched.term),
        "original_concept_public_id": str(original.public_id),
        "concept_public_id": str(concept.public_id),
        "redirected": resolved_concept_id != original_concept_id,
        "canonical_label": str(version.canonical_label),
        "concept_kind": str(version.concept_kind),
        "sensitivity": str(version.sensitivity),
        "credential_status": "not_assessed" if str(version.sensitivity) != "standard" else "not_applicable",
        "credential_notice": version.credential_notice,
    }


def require_shop_owner(shop: MarketplaceShop, *, user_id: int) -> None:
    if int(shop.owner_user_id) != int(user_id):
        raise CommerceTaxonomyError(
            "shop_owner_required",
            "Only the global Shop owner can manage its declared capabilities.",
            status_code=403,
        )


def _validate_coverage_rows(rows: Sequence[Mapping[str, Any]]) -> list[dict[str, Optional[str]]]:
    if len(rows) > MAX_COVERAGE_ROWS_PER_CAPABILITY:
        raise CommerceTaxonomyError("coverage_limit_exceeded", "Too many coverage areas were supplied.")
    result: list[dict[str, Optional[str]]] = []
    seen: set[tuple[Optional[str], ...]] = set()
    for raw in rows:
        scope = str(raw.get("scope_type") or "").strip().lower()
        if scope not in COVERAGE_SCOPES:
            raise CommerceTaxonomyError("invalid_coverage_scope", "Coverage scope is not supported.")
        country = clean_text(raw.get("country_code"), maximum=2)
        country = country.upper() if country else None
        region = clean_text(raw.get("region_name"), maximum=120)
        locality = clean_text(raw.get("locality_name"), maximum=120)
        expected = {
            "remote": (None, None, None),
            "country": (country, None, None),
            "region": (country, region, None),
            "locality": (country, region, locality),
        }[scope]
        if scope == "remote":
            if any((country, region, locality)):
                raise CommerceTaxonomyError("remote_coverage_fields_prohibited", "Remote coverage cannot expose a location.")
        elif not country or (scope in {"region", "locality"} and not region) or (scope == "locality" and not locality):
            raise CommerceTaxonomyError("coverage_fields_required", "Coverage is missing a required public-safe area.")
        country, region, locality = expected
        key = (scope, country, normalize_term(region or "") or None, normalize_term(locality or "") or None)
        if key in seen:
            raise CommerceTaxonomyError("duplicate_coverage", "Duplicate coverage areas are not allowed.", status_code=409)
        seen.add(key)
        result.append(
            {
                "scope_type": scope,
                "country_code": country,
                "region_name": region,
                "locality_name": locality,
            }
        )
    return result


def create_shop_capability(
    db: Session,
    *,
    shop: MarketplaceShop,
    actor_user_id: int,
    owner_description: str,
    role_code: str,
    availability_status: str = "unspecified",
    available_from: Optional[datetime] = None,
    available_until: Optional[datetime] = None,
    availability_note: Optional[str] = None,
    coverage: Sequence[Mapping[str, Any]] = (),
    concept_public_id: Optional[str] = None,
    release_public_id: Optional[str] = None,
) -> MarketplaceShopCapability:
    require_owner_api_enabled()
    require_shop_owner(shop, user_id=actor_user_id)
    role = str(role_code or "").strip().lower()
    if role not in CAPABILITY_ROLES:
        raise CommerceTaxonomyError("invalid_capability_role", "Capability role is not supported.")
    availability = str(availability_status or "unspecified").strip().lower()
    if availability not in AVAILABILITY_STATUSES:
        raise CommerceTaxonomyError("invalid_availability", "Availability status is not supported.")
    if available_from and available_until and available_until < available_from:
        raise CommerceTaxonomyError("invalid_availability_dates", "Availability end cannot precede its start.")
    description = clean_text(owner_description, maximum=240, required=True) or ""
    normalized_description = normalize_term(description)
    active_count = (
        db.query(func.count(MarketplaceShopCapability.id))
        .filter(MarketplaceShopCapability.shop_id == int(shop.id))
        .filter(MarketplaceShopCapability.is_active.is_(True))
        .scalar()
        or 0
    )
    if int(active_count) >= MAX_CAPABILITIES_PER_SHOP:
        raise CommerceTaxonomyError("shop_capability_limit_exceeded", "This Shop has reached the capability limit.")
    concept_id = None
    release_id = None
    mapping_status = "unmapped"
    if bool(concept_public_id) != bool(release_public_id):
        raise CommerceTaxonomyError("capability_mapping_incomplete", "Concept and release must be supplied together.")
    if concept_public_id and release_public_id:
        release = get_release(db, public_id=str(release_public_id))
        if str(release.status) != "published" or not verify_release_integrity(db, release=release):
            raise CommerceTaxonomyError("capability_release_not_currently_eligible", "New mappings require an intact published release.")
        concept = (
            db.query(CommerceTaxonomyConcept)
            .filter(CommerceTaxonomyConcept.public_id == str(concept_public_id))
            .one_or_none()
        )
        if concept is None:
            raise CommerceTaxonomyError("taxonomy_concept_not_found", "Stable concept not found.", status_code=404)
        version = (
            db.query(CommerceTaxonomyConceptVersion)
            .filter(CommerceTaxonomyConceptVersion.release_id == int(release.id))
            .filter(CommerceTaxonomyConceptVersion.concept_id == int(concept.id))
            .one_or_none()
        )
        if version is None or str(version.lifecycle_status) != "active":
            raise CommerceTaxonomyError("taxonomy_concept_not_selectable", "Concept is not active in that release.")
        concept_id = int(concept.id)
        release_id = int(release.id)
        mapping_status = "owner_selected"
    duplicate_query = (
        db.query(MarketplaceShopCapability)
        .filter(MarketplaceShopCapability.shop_id == int(shop.id))
        .filter(MarketplaceShopCapability.role_code == role)
    )
    if concept_id is None:
        duplicate_query = duplicate_query.filter(MarketplaceShopCapability.normalized_description == normalized_description)
    else:
        duplicate_query = duplicate_query.filter(MarketplaceShopCapability.concept_id == concept_id)
    if duplicate_query.first() is not None:
        raise CommerceTaxonomyError("duplicate_shop_capability", "That Shop capability already exists.", status_code=409)
    normalized_coverage = _validate_coverage_rows(coverage)
    capability = MarketplaceShopCapability(
        public_id=_new_public_id("GSN-CAP"),
        shop_id=int(shop.id),
        concept_id=concept_id,
        taxonomy_release_id=release_id,
        owner_description=description,
        normalized_description=normalized_description,
        role_code=role,
        mapping_status=mapping_status,
        claim_basis="owner_declared",
        is_active=True,
        created_by_user_id=int(actor_user_id),
    )
    db.add(capability)
    db.flush()
    db.add(
        MarketplaceShopCapabilityAvailability(
            capability_id=int(capability.id),
            availability_status=availability,
            available_from=available_from,
            available_until=available_until,
            note=clean_text(availability_note, maximum=240),
        )
    )
    for item in normalized_coverage:
        db.add(MarketplaceShopCapabilityCoverage(capability_id=int(capability.id), **item))
    db.flush()
    return capability


def list_shop_capabilities(db: Session, *, shop_id: int, limit: int = MAX_CAPABILITIES_PER_SHOP) -> list[dict[str, Any]]:
    bounded_limit = max(1, min(int(limit), MAX_CAPABILITIES_PER_SHOP))
    rows = (
        db.query(MarketplaceShopCapability)
        .filter(MarketplaceShopCapability.shop_id == int(shop_id))
        .order_by(MarketplaceShopCapability.is_active.desc(), MarketplaceShopCapability.id.asc())
        .limit(bounded_limit)
        .all()
    )
    return [serialize_capability(db, capability=row) for row in rows]


def serialize_capability(db: Session, *, capability: MarketplaceShopCapability) -> dict[str, Any]:
    availability = (
        db.query(MarketplaceShopCapabilityAvailability)
        .filter(MarketplaceShopCapabilityAvailability.capability_id == int(capability.id))
        .one_or_none()
    )
    coverage = (
        db.query(MarketplaceShopCapabilityCoverage)
        .filter(MarketplaceShopCapabilityCoverage.capability_id == int(capability.id))
        .order_by(MarketplaceShopCapabilityCoverage.id.asc())
        .limit(MAX_COVERAGE_ROWS_PER_CAPABILITY)
        .all()
    )
    concept_payload = None
    if capability.concept_id is not None and capability.taxonomy_release_id is not None:
        concept = db.get(CommerceTaxonomyConcept, int(capability.concept_id))
        version = (
            db.query(CommerceTaxonomyConceptVersion)
            .filter(CommerceTaxonomyConceptVersion.release_id == int(capability.taxonomy_release_id))
            .filter(CommerceTaxonomyConceptVersion.concept_id == int(capability.concept_id))
            .one_or_none()
        )
        release = db.get(CommerceTaxonomyRelease, int(capability.taxonomy_release_id))
        if concept is not None and version is not None and release is not None:
            concept_payload = {
                "public_id": str(concept.public_id),
                "release_public_id": str(release.public_id),
                "release_status": str(release.status),
                "canonical_label": str(version.canonical_label),
                "concept_kind": str(version.concept_kind),
                "sensitivity": str(version.sensitivity),
                "credential_status": "not_assessed" if str(version.sensitivity) != "standard" else "not_applicable",
                "credential_notice": version.credential_notice,
            }
    return {
        "public_id": str(capability.public_id),
        "shop_id": int(capability.shop_id),
        "owner_description": str(capability.owner_description),
        "role_code": str(capability.role_code),
        "mapping_status": str(capability.mapping_status),
        "claim_basis": "owner_declared",
        "is_active": bool(capability.is_active),
        "concept": concept_payload,
        "availability": {
            "status": str(availability.availability_status) if availability else "unspecified",
            "available_from": availability.available_from.isoformat() if availability and availability.available_from else None,
            "available_until": availability.available_until.isoformat() if availability and availability.available_until else None,
            "note": availability.note if availability else None,
            "uncertainty": (
                "Availability was not specified by the owner. Confirm before relying on it."
                if availability is None or str(availability.availability_status) == "unspecified"
                else "Available only after confirming with the owner."
                if str(availability.availability_status) == "on_request"
                else None
            ),
        },
        "coverage": [
            {
                "scope_type": str(row.scope_type),
                "country_code": row.country_code,
                "region_name": row.region_name,
                "locality_name": row.locality_name,
            }
            for row in coverage
        ],
    }


def update_shop_capability(
    db: Session,
    *,
    capability: MarketplaceShopCapability,
    actor_user_id: int,
    owner_description: Optional[str] = None,
    role_code: Optional[str] = None,
    is_active: Optional[bool] = None,
    availability_status: Optional[str] = None,
    available_from: Optional[datetime] = None,
    available_until: Optional[datetime] = None,
    availability_note: Optional[str] = None,
    replace_coverage: Optional[Sequence[Mapping[str, Any]]] = None,
) -> MarketplaceShopCapability:
    require_owner_api_enabled()
    shop = db.get(MarketplaceShop, int(capability.shop_id))
    if shop is None:
        raise CommerceTaxonomyError("shop_not_found", "Shop not found.", status_code=404)
    require_shop_owner(shop, user_id=actor_user_id)
    if owner_description is not None:
        description = clean_text(owner_description, maximum=240, required=True) or ""
        capability.owner_description = description
        capability.normalized_description = normalize_term(description)
    if role_code is not None:
        role = str(role_code).strip().lower()
        if role not in CAPABILITY_ROLES:
            raise CommerceTaxonomyError("invalid_capability_role", "Capability role is not supported.")
        capability.role_code = role
    if is_active is not None:
        capability.is_active = bool(is_active)
    availability = (
        db.query(MarketplaceShopCapabilityAvailability)
        .filter(MarketplaceShopCapabilityAvailability.capability_id == int(capability.id))
        .one_or_none()
    )
    if availability is None:
        availability = MarketplaceShopCapabilityAvailability(
            capability_id=int(capability.id),
            availability_status="unspecified",
        )
        db.add(availability)
    if availability_status is not None:
        status = str(availability_status).strip().lower()
        if status not in AVAILABILITY_STATUSES:
            raise CommerceTaxonomyError("invalid_availability", "Availability status is not supported.")
        availability.availability_status = status
    if available_from is not None:
        availability.available_from = available_from
    if available_until is not None:
        availability.available_until = available_until
    if availability.available_from and availability.available_until and availability.available_until < availability.available_from:
        raise CommerceTaxonomyError("invalid_availability_dates", "Availability end cannot precede its start.")
    if availability_note is not None:
        availability.note = clean_text(availability_note, maximum=240)
    if replace_coverage is not None:
        normalized_coverage = _validate_coverage_rows(replace_coverage)
        (
            db.query(MarketplaceShopCapabilityCoverage)
            .filter(MarketplaceShopCapabilityCoverage.capability_id == int(capability.id))
            .delete(synchronize_session=False)
        )
        for item in normalized_coverage:
            db.add(MarketplaceShopCapabilityCoverage(capability_id=int(capability.id), **item))
    db.flush()
    return capability


def submit_taxonomy_proposal(
    db: Session,
    *,
    shop: MarketplaceShop,
    actor_user_id: int,
    locale: str,
    term: str,
    proposed_concept_public_id: Optional[str] = None,
) -> CommerceTaxonomyProposal:
    require_owner_api_enabled()
    require_shop_owner(shop, user_id=actor_user_id)
    locale_value = normalize_locale(locale)
    cleaned = clean_text(term, maximum=200, required=True) or ""
    if _PROPOSAL_PII_PATTERN.search(cleaned):
        raise CommerceTaxonomyError(
            "taxonomy_proposal_contact_data_prohibited",
            "Taxonomy proposals cannot contain links, contact details or telephone numbers.",
        )
    normalized = normalize_term(cleaned)
    if len(normalized) < 2:
        raise CommerceTaxonomyError("taxonomy_term_too_short", "Proposed terms must contain at least two characters.")
    since = utcnow() - timedelta(days=1)
    count = (
        db.query(func.count(CommerceTaxonomyProposal.id))
        .filter(CommerceTaxonomyProposal.proposer_user_id == int(actor_user_id))
        .filter(CommerceTaxonomyProposal.created_at >= since)
        .scalar()
        or 0
    )
    if int(count) >= MAX_PROPOSALS_PER_OWNER_PER_DAY:
        raise CommerceTaxonomyError("taxonomy_proposal_rate_limited", "Daily taxonomy proposal limit reached.", status_code=429)
    duplicate = (
        db.query(CommerceTaxonomyProposal)
        .filter(CommerceTaxonomyProposal.locale == locale_value)
        .filter(CommerceTaxonomyProposal.normalized_term == normalized)
        .filter(CommerceTaxonomyProposal.status.in_(["pending", "approved"]))
        .order_by(CommerceTaxonomyProposal.id.asc())
        .first()
    )
    if duplicate is not None:
        raise CommerceTaxonomyError("taxonomy_proposal_duplicate", "That term is already pending or approved.", status_code=409)
    concept_id = None
    if proposed_concept_public_id:
        concept = (
            db.query(CommerceTaxonomyConcept)
            .filter(CommerceTaxonomyConcept.public_id == str(proposed_concept_public_id))
            .one_or_none()
        )
        if concept is None:
            raise CommerceTaxonomyError("taxonomy_concept_not_found", "Stable concept not found.", status_code=404)
        concept_id = int(concept.id)
    row = CommerceTaxonomyProposal(
        public_id=_new_public_id("GSN-TAX-P"),
        proposer_user_id=int(actor_user_id),
        shop_id=int(shop.id),
        proposed_concept_id=concept_id,
        locale=locale_value,
        term=cleaned,
        normalized_term=normalized,
        status="pending",
        retention_until=utcnow() + timedelta(days=PROPOSAL_RETENTION_DAYS),
    )
    db.add(row)
    db.flush()
    return row


def moderate_taxonomy_proposal(
    db: Session,
    *,
    proposal_public_id: str,
    actor_user_id: int,
    decision: str,
    reason: str,
    duplicate_of_public_id: Optional[str] = None,
) -> CommerceTaxonomyProposal:
    require_admin_api_enabled()
    decision_value = str(decision or "").strip().lower()
    if decision_value not in PROPOSAL_DECISIONS:
        raise CommerceTaxonomyError("invalid_proposal_decision", "Proposal decision is not supported.")
    row = (
        db.query(CommerceTaxonomyProposal)
        .filter(CommerceTaxonomyProposal.public_id == str(proposal_public_id))
        .with_for_update()
        .one_or_none()
    )
    if row is None:
        raise CommerceTaxonomyError("taxonomy_proposal_not_found", "Taxonomy proposal not found.", status_code=404)
    if str(row.status) != "pending":
        raise CommerceTaxonomyError("taxonomy_proposal_already_decided", "Taxonomy proposal is already closed.", status_code=409)
    duplicate_id = None
    if decision_value == "duplicate":
        if not duplicate_of_public_id:
            raise CommerceTaxonomyError("duplicate_proposal_reference_required", "Duplicate decisions require the original proposal.")
        duplicate = (
            db.query(CommerceTaxonomyProposal)
            .filter(CommerceTaxonomyProposal.public_id == str(duplicate_of_public_id))
            .one_or_none()
        )
        if duplicate is None or int(duplicate.id) == int(row.id):
            raise CommerceTaxonomyError("duplicate_proposal_reference_invalid", "Duplicate proposal reference is invalid.")
        duplicate_id = int(duplicate.id)
    row.status = decision_value
    row.moderation_reason = clean_text(reason, maximum=1000, required=True)
    row.duplicate_of_proposal_id = duplicate_id
    row.reviewed_by_user_id = int(actor_user_id)
    row.reviewed_at = utcnow()
    db.flush()
    return row


def serialize_release(release: CommerceTaxonomyRelease) -> dict[str, Any]:
    return {
        "public_id": str(release.public_id),
        "version_number": int(release.version_number),
        "status": str(release.status),
        "languages": _release_languages(release),
        "checksum": release.checksum,
        "published_at": release.published_at.isoformat() if release.published_at else None,
        "withdrawn_at": release.withdrawn_at.isoformat() if release.withdrawn_at else None,
    }


def serialize_proposal(proposal: CommerceTaxonomyProposal) -> dict[str, Any]:
    return {
        "public_id": str(proposal.public_id),
        "shop_id": int(proposal.shop_id),
        "locale": str(proposal.locale),
        "term": str(proposal.term),
        "status": str(proposal.status),
        "retention_until": proposal.retention_until.isoformat(),
        "created_at": proposal.created_at.isoformat() if proposal.created_at else None,
    }


def product_capability_count(db: Session, *, product_id: int) -> int:
    return int(
        db.query(func.count(MarketplaceProductCapability.id))
        .filter(MarketplaceProductCapability.product_id == int(product_id))
        .scalar()
        or 0
    )
