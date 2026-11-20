from __future__ import annotations

from datetime import datetime, timezone
import secrets
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import (
    MarketplaceProduct,
    MarketplacePublicDiscoveryPublication,
    MarketplacePublicDiscoverySearchEvent,
    MarketplaceShop,
    User,
)
from app.services.marketplace_public_discovery_service import (
    PUBLIC_DISCOVERY_AUTHORITY_VERSION,
    PUBLIC_DISCOVERY_NOTICE_VERSION,
    PUBLIC_DISCOVERY_SCAN_LIMIT,
    item_search_text,
    normalized_text,
    project_publication,
    public_discovery_enabled,
    public_discovery_ready,
    search_query_hash,
)
from app.services.marketplace_shop_privacy_service import (
    ShopPrivacyScope,
    marketplace_shop_privacy_authority_enabled,
    resolve_shop_privacy_decision,
)


router = APIRouter(
    prefix="/marketplace/public-discovery",
    tags=["marketplace-public-discovery"],
)


class PublicationUpdateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    state: Literal["published", "hidden", "paused", "withdrawn"]
    confirm_publication: bool = False
    authority_version: str = Field(default=PUBLIC_DISCOVERY_AUTHORITY_VERSION, max_length=40)
    notice_version: str = Field(default=PUBLIC_DISCOVERY_NOTICE_VERSION, max_length=40)
    expires_at: Optional[datetime] = None


def _no_store(payload: dict, *, status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        payload,
        status_code=status_code,
        headers={
            "Cache-Control": "private, no-store, max-age=0",
            "Pragma": "no-cache",
        },
    )


def _utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _effective_state(
    publication: Optional[MarketplacePublicDiscoveryPublication],
    *,
    now: Optional[datetime] = None,
) -> str:
    if publication is None:
        return "legacy_unpublished"
    current = now or datetime.now(timezone.utc)
    expires_at = _utc(publication.expires_at)
    if publication.state == "published" and expires_at is not None and expires_at <= current:
        return "expired"
    return str(publication.state)


def _serialize_publication(
    publication: Optional[MarketplacePublicDiscoveryPublication],
) -> Optional[dict]:
    if publication is None:
        return None
    return {
        "publication_id": publication.public_id,
        "state": publication.state,
        "effective_state": _effective_state(publication),
        "authority_version": publication.authority_version,
        "notice_version": publication.notice_version,
        "published_at": publication.published_at.isoformat() if publication.published_at else None,
        "expires_at": publication.expires_at.isoformat() if publication.expires_at else None,
        "state_changed_at": publication.state_changed_at.isoformat(),
    }


@router.get("")
def search_public_merchants(
    q: str = Query(default="", max_length=160),
    category: str = Query(default="", max_length=120),
    area: str = Query(default="", max_length=120),
    cursor: int = Query(default=0, ge=0, le=100000),
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
):
    if not public_discovery_ready():
        return _no_store(
            {
                "detail": "Public merchant discovery is not available.",
                "code": "PUBLIC_DISCOVERY_NOT_READY",
            },
            status_code=503,
        )

    publication_scan = (
        db.query(MarketplacePublicDiscoveryPublication)
        .filter(MarketplacePublicDiscoveryPublication.state == "published")
        .order_by(
            MarketplacePublicDiscoveryPublication.published_at.desc(),
            MarketplacePublicDiscoveryPublication.id.desc(),
        )
        .limit(PUBLIC_DISCOVERY_SCAN_LIMIT + 1)
        .all()
    )
    scan_limit_reached = len(publication_scan) > PUBLIC_DISCOVERY_SCAN_LIMIT
    publications = publication_scan[:PUBLIC_DISCOVERY_SCAN_LIMIT]
    coverage_complete = not scan_limit_reached
    query_text = normalized_text(q)
    category_text = normalized_text(category)
    area_text = normalized_text(area)
    eligible: list[dict] = []
    excluded_unavailable_count = 0

    for publication in publications:
        projection = project_publication(db, publication=publication)
        if projection.item is None:
            if projection.unavailable:
                excluded_unavailable_count += 1
            continue
        item = projection.item
        if query_text and query_text not in item_search_text(item):
            continue
        category_haystack = normalized_text(
            " ".join([*(item.get("categories") or []), *(item.get("capability_terms") or [])])
        )
        if category_text and category_text not in category_haystack:
            continue
        area_haystack = normalized_text(
            " ".join(
                [
                    *(item.get("service_areas") or []),
                    "remote" if item.get("remote_available") else "",
                ]
            )
        )
        if area_text and area_text not in area_haystack:
            continue
        eligible.append(item)

    total = len(eligible)
    page_items = eligible[cursor : cursor + limit]
    next_cursor = cursor + len(page_items)
    if next_cursor >= total:
        next_cursor = None

    suggestion_values: list[str] = []
    seen_suggestions: set[str] = set()
    for item in eligible:
        for value in [
            item.get("offer_name"),
            item.get("shop_name"),
            *(item.get("categories") or []),
        ]:
            label = str(value or "").strip()
            key = normalized_text(label)
            if label and key not in seen_suggestions:
                seen_suggestions.add(key)
                suggestion_values.append(label)
            if len(suggestion_values) >= 8:
                break
        if len(suggestion_values) >= 8:
            break

    try:
        db.add(
            MarketplacePublicDiscoverySearchEvent(
                query_hash=search_query_hash(q, category, area),
                result_count=total,
                excluded_unavailable_count=excluded_unavailable_count,
                zero_result=total == 0,
                has_category_filter=bool(category_text),
                has_area_filter=bool(area_text),
                coverage_complete=coverage_complete,
                scan_limit_reached=scan_limit_reached,
                scanned_publication_count=len(publications),
            )
        )
        db.commit()
    except Exception:
        db.rollback()

    return _no_store(
        {
            "items": page_items,
            "count": len(page_items),
            "total": total,
            "next_cursor": next_cursor,
            "suggestions": suggestion_values,
            "scan_limit_reached": scan_limit_reached,
            "coverage_complete": coverage_complete,
            "total_is_complete": coverage_complete,
            "scanned_publication_count": len(publications),
            "scan_limit": PUBLIC_DISCOVERY_SCAN_LIMIT,
        }
    )


@router.get("/owner/preview")
def owner_publication_preview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.owner_user_id == int(current_user.id))
        .first()
    )
    if shop is None:
        raise HTTPException(status_code=404, detail="Create your shop before managing public discovery.")

    products = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.shop_id == int(shop.id))
        .order_by(MarketplaceProduct.created_at.desc(), MarketplaceProduct.id.desc())
        .all()
    )
    publications = (
        db.query(MarketplacePublicDiscoveryPublication)
        .filter(MarketplacePublicDiscoveryPublication.shop_id == int(shop.id))
        .all()
    )
    publication_by_product = {
        int(publication.product_id): publication for publication in publications
    }
    privacy = resolve_shop_privacy_decision(
        db,
        owner_user_id=int(current_user.id),
        scope=ShopPrivacyScope.UNAUTHENTICATED_PUBLIC,
        shop_active=bool(shop.is_active),
        authorized=True,
    )

    items = []
    for product in products:
        publication = publication_by_product.get(int(product.id))
        items.append(
            {
                "product_id": int(product.id),
                "name": product.name,
                "description": product.description,
                "image_url": product.image_url,
                "video_url": product.video_url,
                "is_active": bool(product.is_active),
                "visibility_mode": product.visibility_mode,
                "effective_state": _effective_state(publication),
                "publication": _serialize_publication(publication),
                "eligible_to_publish": bool(
                    product.is_active
                    and shop.is_active
                    and product.visibility_mode != "vault_private"
                    and privacy.shop_visible
                    and public_discovery_ready()
                ),
            }
        )

    return _no_store(
        {
            "feature_enabled": public_discovery_enabled(),
            "privacy_authority_enabled": marketplace_shop_privacy_authority_enabled(),
            "ready": public_discovery_ready(),
            "shop": {
                "id": int(shop.id),
                "name": shop.name,
                "is_active": bool(shop.is_active),
                "public_shop_enabled": bool(privacy.shop_visible),
            },
            "authority_version": PUBLIC_DISCOVERY_AUTHORITY_VERSION,
            "notice_version": PUBLIC_DISCOVERY_NOTICE_VERSION,
            "legacy_notice": (
                "Existing products are not added to public discovery automatically. "
                "Choose Publish for each product you want people outside your communities to find."
            ),
            "direct_shop_rule": (
                "Hiding, pausing or withdrawing public discovery does not disable an existing direct shop link."
            ),
            "items": items,
        }
    )


@router.put("/owner/products/{product_id}")
def update_owner_publication(
    product_id: int,
    payload: PublicationUpdateInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = (
        db.query(MarketplaceProduct)
        .filter(
            MarketplaceProduct.id == int(product_id),
            MarketplaceProduct.seller_user_id == int(current_user.id),
        )
        .first()
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Shop product not found.")
    shop = (
        db.query(MarketplaceShop)
        .filter(
            MarketplaceShop.id == int(product.shop_id),
            MarketplaceShop.owner_user_id == int(current_user.id),
        )
        .first()
    )
    if shop is None:
        raise HTTPException(status_code=404, detail="Owner shop not found.")

    now = datetime.now(timezone.utc)
    expires_at = _utc(payload.expires_at)
    if payload.state == "published":
        if payload.authority_version != PUBLIC_DISCOVERY_AUTHORITY_VERSION:
            raise HTTPException(status_code=409, detail="Publication authority version is not current.")
        if payload.notice_version != PUBLIC_DISCOVERY_NOTICE_VERSION:
            raise HTTPException(status_code=409, detail="Publication notice version is not current.")
        if not payload.confirm_publication:
            raise HTTPException(status_code=409, detail="Confirm this product for public discovery.")
        if not public_discovery_ready():
            raise HTTPException(
                status_code=409,
                detail="Public discovery and shop privacy authorities must both be enabled.",
            )
        if expires_at is not None and expires_at <= now:
            raise HTTPException(status_code=409, detail="Publication expiry must be in the future.")
        if (
            not bool(product.is_active)
            or not bool(shop.is_active)
            or str(product.visibility_mode or "").strip().lower() == "vault_private"
        ):
            raise HTTPException(status_code=409, detail="This product is not eligible for public discovery.")
        privacy = resolve_shop_privacy_decision(
            db,
            owner_user_id=int(current_user.id),
            scope=ShopPrivacyScope.UNAUTHENTICATED_PUBLIC,
            shop_active=bool(shop.is_active),
            authorized=True,
        )
        if not privacy.enforcement_enabled or not privacy.shop_visible:
            raise HTTPException(
                status_code=409,
                detail="Enable your public shop privacy setting before publishing.",
            )

    publication = (
        db.query(MarketplacePublicDiscoveryPublication)
        .filter(MarketplacePublicDiscoveryPublication.product_id == int(product.id))
        .first()
    )
    if publication is None:
        publication = MarketplacePublicDiscoveryPublication(
            public_id=f"pd_{secrets.token_urlsafe(18)}",
            shop_id=int(shop.id),
            product_id=int(product.id),
            owner_user_id=int(current_user.id),
            state=payload.state,
            authority_version=payload.authority_version,
            authority_source="owner_confirmed",
            notice_version=payload.notice_version,
            published_at=now if payload.state == "published" else None,
            expires_at=expires_at,
            state_changed_at=now,
        )
        db.add(publication)
    else:
        publication.state = payload.state
        publication.authority_version = payload.authority_version
        publication.notice_version = payload.notice_version
        publication.expires_at = expires_at
        publication.state_changed_at = now
        if payload.state == "published":
            publication.published_at = now

    db.commit()
    db.refresh(publication)
    return _no_store(
        {
            "product_id": int(product.id),
            "name": product.name,
            "publication": _serialize_publication(publication),
            "direct_shop_link_changed": False,
            "payment_changed": False,
            "spotlight_changed": False,
        }
    )
