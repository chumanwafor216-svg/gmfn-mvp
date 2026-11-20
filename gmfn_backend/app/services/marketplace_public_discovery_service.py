from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import os
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.db.models import (
    CommerceTaxonomyConceptVersion,
    CommerceTaxonomyRelease,
    MarketplaceProduct,
    MarketplaceProductCapability,
    MarketplacePublicDiscoveryPublication,
    MarketplaceShop,
    MarketplaceShopCapability,
    MarketplaceShopCapabilityAvailability,
    MarketplaceShopCapabilityCoverage,
    User,
)
from app.services.marketplace_shop_privacy_service import (
    ShopPrivacyScope,
    contact_ready_for_shop,
    marketplace_shop_privacy_authority_enabled,
    resolve_shop_privacy_decision,
)


PUBLIC_DISCOVERY_ENV = "GSN_PUBLIC_MERCHANT_DISCOVERY_V1_ENABLED"
PUBLIC_DISCOVERY_AUTHORITY_VERSION = "public-discovery-v1"
PUBLIC_DISCOVERY_NOTICE_VERSION = "legacy-confirmation-v1"
PUBLIC_DISCOVERY_SCAN_LIMIT = 500


def public_discovery_enabled() -> bool:
    return str(os.getenv(PUBLIC_DISCOVERY_ENV, "") or "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def public_discovery_ready() -> bool:
    return public_discovery_enabled() and marketplace_shop_privacy_authority_enabled()


def normalized_text(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def search_query_hash(query: str, category: str, area: str) -> Optional[str]:
    normalized = "|".join(
        [normalized_text(query), normalized_text(category), normalized_text(area)]
    ).strip("|")
    if not normalized:
        return None
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _aware(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


@dataclass(frozen=True)
class DiscoveryProjection:
    item: Optional[dict[str, Any]]
    unavailable: bool


def _taxonomy_labels(db: Session, product_id: int) -> tuple[list[str], set[int]]:
    rows = (
        db.query(
            MarketplaceProductCapability.concept_id,
            CommerceTaxonomyConceptVersion.canonical_label,
        )
        .join(
            CommerceTaxonomyRelease,
            CommerceTaxonomyRelease.id == MarketplaceProductCapability.taxonomy_release_id,
        )
        .join(
            CommerceTaxonomyConceptVersion,
            (CommerceTaxonomyConceptVersion.release_id == MarketplaceProductCapability.taxonomy_release_id)
            & (CommerceTaxonomyConceptVersion.concept_id == MarketplaceProductCapability.concept_id),
        )
        .filter(
            MarketplaceProductCapability.product_id == int(product_id),
            MarketplaceProductCapability.mapping_status.in_(["owner_selected", "admin_approved"]),
            CommerceTaxonomyRelease.status == "published",
            CommerceTaxonomyConceptVersion.lifecycle_status == "active",
        )
        .all()
    )
    labels = sorted(
        {
            str(label or "").strip()
            for _, label in rows
            if str(label or "").strip()
        },
        key=str.lower,
    )
    return labels, {int(concept_id) for concept_id, _ in rows}


def _capability_projection(
    db: Session,
    *,
    shop_id: int,
    concept_ids: set[int],
    now: datetime,
) -> tuple[list[str], list[str], bool, str]:
    query = db.query(MarketplaceShopCapability).filter(
        MarketplaceShopCapability.shop_id == int(shop_id),
        MarketplaceShopCapability.is_active.is_(True),
        MarketplaceShopCapability.mapping_status.in_(["owner_selected", "admin_approved"]),
    )
    if concept_ids:
        query = query.filter(MarketplaceShopCapability.concept_id.in_(concept_ids))
    capabilities = query.all()
    if not capabilities:
        return [], [], False, "unspecified"

    capability_ids = [int(capability.id) for capability in capabilities]
    availability_rows = (
        db.query(MarketplaceShopCapabilityAvailability)
        .filter(MarketplaceShopCapabilityAvailability.capability_id.in_(capability_ids))
        .all()
    )
    availability_by_capability = {
        int(row.capability_id): row for row in availability_rows
    }

    states: list[str] = []
    available_capability_ids: list[int] = []
    for capability in capabilities:
        row = availability_by_capability.get(int(capability.id))
        state = str(getattr(row, "availability_status", "unspecified") or "unspecified")
        available_from = _aware(getattr(row, "available_from", None))
        available_until = _aware(getattr(row, "available_until", None))
        in_window = not (
            (available_from is not None and available_from > now)
            or (available_until is not None and available_until < now)
        )
        if state != "unavailable" and in_window:
            available_capability_ids.append(int(capability.id))
            states.append(state)

    if not available_capability_ids:
        return [], [], False, "unavailable"

    coverage_rows = (
        db.query(MarketplaceShopCapabilityCoverage)
        .filter(
            MarketplaceShopCapabilityCoverage.capability_id.in_(available_capability_ids),
            MarketplaceShopCapabilityCoverage.scope_type.in_(["region", "country", "remote"]),
        )
        .all()
    )
    service_areas: set[str] = set()
    remote_available = False
    for coverage in coverage_rows:
        scope_type = str(coverage.scope_type or "")
        if scope_type == "remote":
            remote_available = True
            service_areas.add("Remote")
        elif scope_type == "region":
            region = str(coverage.region_name or "").strip()
            country = str(coverage.country_code or "").strip().upper()
            label = ", ".join(part for part in [region, country] if part)
            if label:
                service_areas.add(label)
        elif scope_type == "country":
            country = str(coverage.country_code or "").strip().upper()
            if country:
                service_areas.add(country)

    availability = (
        "available"
        if "available" in states
        else "on_request"
        if "on_request" in states
        else "unspecified"
    )
    capability_terms = sorted(
        {
            str(capability.owner_description or "").strip()
            for capability in capabilities
            if int(capability.id) in available_capability_ids
            and str(capability.owner_description or "").strip()
        },
        key=str.lower,
    )
    return capability_terms, sorted(service_areas, key=str.lower), remote_available, availability


def project_publication(
    db: Session,
    *,
    publication: MarketplacePublicDiscoveryPublication,
    now: Optional[datetime] = None,
) -> DiscoveryProjection:
    current = now or datetime.now(timezone.utc)
    expires_at = _aware(publication.expires_at)
    if publication.state != "published" or (expires_at is not None and expires_at <= current):
        return DiscoveryProjection(item=None, unavailable=True)

    product = db.query(MarketplaceProduct).filter(MarketplaceProduct.id == publication.product_id).first()
    shop = db.query(MarketplaceShop).filter(MarketplaceShop.id == publication.shop_id).first()
    owner = db.query(User).filter(User.id == publication.owner_user_id).first()
    if product is None or shop is None or owner is None:
        return DiscoveryProjection(item=None, unavailable=True)
    if (
        not bool(product.is_active)
        or not bool(shop.is_active)
        or str(product.visibility_mode or "").strip().lower() == "vault_private"
        or int(product.shop_id) != int(shop.id)
        or int(product.seller_user_id) != int(owner.id)
    ):
        return DiscoveryProjection(item=None, unavailable=True)

    privacy = resolve_shop_privacy_decision(
        db,
        owner_user_id=int(owner.id),
        scope=ShopPrivacyScope.UNAUTHENTICATED_PUBLIC,
        shop_active=bool(shop.is_active),
        authorized=True,
    )
    if not privacy.enforcement_enabled or not privacy.shop_visible:
        return DiscoveryProjection(item=None, unavailable=False)

    categories, concept_ids = _taxonomy_labels(db, int(product.id))
    capability_terms, service_areas, remote_available, availability = _capability_projection(
        db,
        shop_id=int(shop.id),
        concept_ids=concept_ids,
        now=current,
    )
    if availability == "unavailable":
        return DiscoveryProjection(item=None, unavailable=True)

    gmfn_id = str(owner.gmfn_id or "").strip()
    if not gmfn_id:
        return DiscoveryProjection(item=None, unavailable=True)

    item = {
        "publication_id": publication.public_id,
        "shop_path": f"/shop/{gmfn_id}",
        "shop_gsn_id": gmfn_id,
        "shop_name": str(shop.name or "").strip(),
        "shop_description": str(shop.description or "").strip() or None,
        "offer_id": int(product.id),
        "offer_name": str(product.name or "").strip(),
        "offer_description": str(product.description or "").strip() or None,
        "price": str(product.price or "").strip() or None,
        "currency": str(product.currency or "").strip() or None,
        "image_url": str(product.image_url or "").strip() or None,
        "video_url": str(product.video_url or "").strip() or None,
        "categories": categories,
        "capability_terms": capability_terms,
        "service_areas": service_areas,
        "remote_available": remote_available,
        "availability": availability,
        "contact_available": contact_ready_for_shop(shop, decision=privacy),
        "expires_at": expires_at.isoformat() if expires_at is not None else None,
    }
    return DiscoveryProjection(item=item, unavailable=False)


def item_search_text(item: dict[str, Any]) -> str:
    values = [
        item.get("shop_name"),
        item.get("shop_description"),
        item.get("offer_name"),
        item.get("offer_description"),
        *(item.get("categories") or []),
        *(item.get("capability_terms") or []),
        *(item.get("service_areas") or []),
    ]
    return normalized_text(" ".join(str(value or "") for value in values))
