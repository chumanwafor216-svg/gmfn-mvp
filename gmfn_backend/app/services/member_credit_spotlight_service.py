from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.db.member_credit_models import (
    MemberCreditServiceSpendOrder,
    MemberCreditServiceVersion,
    MemberServiceCreditAccount,
    MemberServiceCreditLedgerEntry,
)
from app.db.models import (
    ClanMembership,
    MarketplaceBroadcast,
    MarketplaceProduct,
    MarketplaceShop,
    SpotlightCampaign,
    SpotlightCampaignPacingState,
    SpotlightContentVersion,
)
from app.services.feature_entitlements_service import consume_feature_units
from app.services.member_credit_permissions import require_member_credit_service_permission
from app.services.member_credit_service import MemberCreditError, request_fingerprint
from app.services.payment_operations_policy import require_payment_operations_enabled
from app.services.spotlight_lifecycle_service import activation_expiry, authorized_expiry
from app.services.spotlight_pacing_state_service import get_or_create_spotlight_campaign_pacing_state


MEMBER_CREDIT_SPOTLIGHT_WRITER_ENV = "GSN_MEMBER_CREDIT_SPOTLIGHT_WRITES_ENABLED"
SPOTLIGHT_SERVICE_CODE = "spotlight.single_day"
LEGACY_SPOTLIGHT_FEATURE_CODE = "spotlight_priority"
SPOTLIGHT_LOCK_ORDER = (
    "idempotency",
    "shop_product",
    "campaign",
    "funding",
    "placements",
    "pacing",
    "leases",
)


@dataclass(frozen=True)
class MemberCreditSpotlightResult:
    spend_order_id: int
    campaign_id: int
    placement_ids: tuple[int, ...]
    funding_source: str
    activated_at: datetime
    expires_at: datetime
    deduped: bool


def member_credit_spotlight_writers_enabled() -> bool:
    return str(os.getenv(MEMBER_CREDIT_SPOTLIGHT_WRITER_ENV, "")).strip().lower() in {
        "1", "true", "yes", "on"
    }


def activate_single_day_spotlight(
    db: Session,
    *,
    member_user_id: int,
    service_version_id: int,
    funding_source: str,
    shop_id: int,
    product_id: int,
    placement_clan_ids: list[int],
    message: str,
    image_url: Optional[str],
    video_url: Optional[str],
    idempotency_key: str,
    now: Optional[datetime] = None,
    commit: bool = True,
) -> MemberCreditSpotlightResult:
    if not member_credit_spotlight_writers_enabled():
        raise MemberCreditError("member_credit_spotlight_writers_disabled")
    current = _aware(now)
    source = str(funding_source or "").strip()
    if source not in {"member_credit", "legacy_entitlement"}:
        raise MemberCreditError("explicit_funding_source_required")
    clan_ids = tuple(dict.fromkeys(int(value) for value in placement_clan_ids if int(value) > 0))
    if not clan_ids:
        raise MemberCreditError("spotlight_placement_required")
    key = str(idempotency_key or "").strip()
    if not key:
        raise MemberCreditError("idempotency_key_required")
    fingerprint = request_fingerprint(
        {
            "member_user_id": int(member_user_id),
            "service_version_id": int(service_version_id),
            "funding_source": source,
            "shop_id": int(shop_id),
            "product_id": int(product_id),
            "placement_clan_ids": clan_ids,
            "message": str(message or ""),
            "image_url": image_url,
            "video_url": video_url,
        }
    )
    existing = (
        db.query(MemberCreditServiceSpendOrder)
        .filter(MemberCreditServiceSpendOrder.idempotency_key == key)
        .with_for_update()
        .one_or_none()
    )
    if existing is not None:
        if str(existing.request_fingerprint) != fingerprint:
            raise MemberCreditError("conflicting_idempotency_fingerprint")
        if str(existing.status) != "completed" or existing.spotlight_campaign_id is None:
            raise MemberCreditError("spotlight_spend_incomplete_retry_required")
        return _result_for_spend(db, spend=existing, deduped=True)

    service = db.get(MemberCreditServiceVersion, int(service_version_id))
    if (
        service is None
        or str(service.status) != "test_active"
        or str(service.service_code) != SPOTLIGHT_SERVICE_CODE
        or int(service.duration_seconds) != 24 * 60 * 60
    ):
        raise MemberCreditError("single_day_spotlight_service_not_test_active")

    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.id == int(shop_id))
        .filter(MarketplaceShop.owner_user_id == int(member_user_id))
        .filter(MarketplaceShop.is_active.is_(True))
        .with_for_update()
        .one_or_none()
    )
    product = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.id == int(product_id))
        .filter(MarketplaceProduct.shop_id == int(shop_id))
        .filter(MarketplaceProduct.seller_user_id == int(member_user_id))
        .filter(MarketplaceProduct.is_active.is_(True))
        .with_for_update()
        .one_or_none()
    )
    if shop is None or product is None or str(product.visibility_mode) != "community_visible":
        raise MemberCreditError("spotlight_product_not_eligible")
    memberships = (
        db.query(ClanMembership.clan_id)
        .filter(ClanMembership.user_id == int(member_user_id))
        .filter(ClanMembership.clan_id.in_(clan_ids))
        .filter(ClanMembership.left_at.is_(None))
        .all()
    )
    if {int(row[0]) for row in memberships} != set(clan_ids):
        raise MemberCreditError("spotlight_community_boundary_rejected")

    active_campaigns = (
        db.query(SpotlightCampaign)
        .filter(SpotlightCampaign.owner_user_id == int(member_user_id))
        .filter(SpotlightCampaign.status == "active")
        .with_for_update()
        .all()
    )
    for campaign in active_campaigns:
        expiry = authorized_expiry(campaign)
        if expiry is not None and current >= expiry:
            continue
        pacing = db.get(SpotlightCampaignPacingState, int(campaign.id))
        if pacing is not None and (
            bool(pacing.exhausted)
            or int(pacing.consumed_delivery_rounds) >= int(pacing.max_delivery_rounds)
        ):
            raise MemberCreditError("delivery_exhausted_purchase_rejected_before_consumption")
        raise MemberCreditError("active_spotlight_campaign_purchase_rejected")

    spend = MemberCreditServiceSpendOrder(
        member_user_id=int(member_user_id),
        service_version_id=int(service.id),
        funding_source=source,
        credit_cost=int(service.credit_cost),
        idempotency_key=key,
        request_fingerprint=fingerprint,
        status="pending",
        created_at=current,
    )
    expires = activation_expiry(current, authorized_days=1)
    try:
        with db.begin_nested():
            if source == 'member_credit':
                require_payment_operations_enabled()
                require_member_credit_service_permission(
                    db,
                    member_user_id=int(member_user_id),
                    service_code=str(service.service_code),
                )
            db.add(spend)
            db.flush()
            if source == "member_credit":
                _consume_member_credits(
                    db,
                    member_user_id=int(member_user_id),
                    units=int(service.credit_cost),
                    spend_order_id=int(spend.id),
                    fingerprint=fingerprint,
                    now=current,
                )
            else:
                usage = consume_feature_units(
                    db,
                    owner_user_id=int(member_user_id),
                    feature_code=LEGACY_SPOTLIGHT_FEATURE_CODE,
                    units=1,
                    shop_id=int(shop_id),
                    reference_key=f"member-credit-spotlight-spend:{spend.id}",
                    note="Explicit legacy entitlement funding for internal Spotlight spend",
                    commit=False,
                    now=current,
                )
                if not bool(usage.get("ok")):
                    raise MemberCreditError(str(usage.get("reason") or "legacy_entitlement_unavailable"))
            campaign, placements = _persist_spotlight_activation(
                db,
                member_user_id=int(member_user_id),
                shop=shop,
                product=product,
                clan_ids=clan_ids,
                message=str(message or ""),
                image_url=image_url,
                video_url=video_url,
                spend_order_id=int(spend.id),
                activated_at=current,
                expires_at=expires,
            )
            spend.status = "completed"
            spend.spotlight_campaign_id = int(campaign.id)
            spend.result_json = json.dumps(
                {"campaign_id": int(campaign.id), "placement_ids": [int(row.id) for row in placements]},
                sort_keys=True,
            )
            spend.completed_at = current
            db.flush()
    except Exception:
        raise
    if commit:
        db.commit()
    return _result_for_spend(db, spend=spend, deduped=False)


def _consume_member_credits(
    db: Session,
    *,
    member_user_id: int,
    units: int,
    spend_order_id: int,
    fingerprint: str,
    now: datetime,
) -> None:
    account = (
        db.query(MemberServiceCreditAccount)
        .filter(MemberServiceCreditAccount.member_user_id == int(member_user_id))
        .with_for_update()
        .one_or_none()
    )
    if account is None or int(account.balance_units) < int(units):
        raise MemberCreditError("insufficient_member_credits")
    before = int(account.balance_units)
    version = int(account.version)
    after = before - int(units)
    updated = (
        db.query(MemberServiceCreditAccount)
        .filter(MemberServiceCreditAccount.id == int(account.id))
        .filter(MemberServiceCreditAccount.version == version)
        .filter(MemberServiceCreditAccount.balance_units >= int(units))
        .update(
            {
                MemberServiceCreditAccount.balance_units: after,
                MemberServiceCreditAccount.version: version + 1,
                MemberServiceCreditAccount.updated_at: now,
            },
            synchronize_session=False,
        )
    )
    if updated != 1:
        raise MemberCreditError("member_credit_spend_conflict")
    db.add(
        MemberServiceCreditLedgerEntry(
            account_id=int(account.id),
            units_delta=-int(units),
            balance_after=after,
            entry_type="service_spend",
            idempotency_key=f"spotlight-spend:{spend_order_id}",
            request_fingerprint=fingerprint,
            reference_type="member_credit_service_spend_order",
            reference_id=str(spend_order_id),
            created_at=now,
        )
    )
    db.flush()


def _persist_spotlight_activation(
    db: Session,
    *,
    member_user_id: int,
    shop: MarketplaceShop,
    product: MarketplaceProduct,
    clan_ids: tuple[int, ...],
    message: str,
    image_url: Optional[str],
    video_url: Optional[str],
    spend_order_id: int,
    activated_at: datetime,
    expires_at: datetime,
) -> tuple[SpotlightCampaign, list[MarketplaceBroadcast]]:
    content_fingerprint = hashlib.sha256(
        json.dumps(
            {"product_id": int(product.id), "message": message, "image_url": image_url, "video_url": video_url},
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()
    campaign = SpotlightCampaign(
        owner_user_id=int(member_user_id),
        shop_id=int(shop.id),
        origin_clan_id=int(clan_ids[0]),
        source_product_id=int(product.id),
        content_kind="product_snapshot",
        content_fingerprint=content_fingerprint,
        status="active",
        serving_status="serving",
        content_version=1,
        source_kind="member_credit_internal",
        commercial_mode="member_credit",
        distribution_scope="direct_communities",
        opportunity_intent="offer",
        opportunity_category="product",
        opportunity_geo_scope="community",
        opportunity_availability="available",
        created_at=activated_at,
        activated_at=activated_at,
        expires_at=expires_at,
        authorized_expires_at=expires_at,
        serving_status_changed_at=activated_at,
    )
    db.add(campaign)
    db.flush()
    placements: list[MarketplaceBroadcast] = []
    for clan_id in clan_ids:
        row = MarketplaceBroadcast(
            publication_key=f"member-credit-spend:{spend_order_id}",
            spotlight_campaign_id=int(campaign.id),
            serving_status="serving",
            content_version=1,
            clan_id=int(clan_id),
            author_user_id=int(member_user_id),
            shop_id=int(shop.id),
            message=message,
            image_url=image_url,
            video_url=video_url,
            priority_mode="paid",
            visibility_scope="direct_communities",
            expires_at=expires_at,
            authorized_expires_at=expires_at,
            serving_status_changed_at=activated_at,
            created_at=activated_at,
        )
        db.add(row)
        placements.append(row)
    db.flush()
    db.add(
        SpotlightContentVersion(
            campaign_id=int(campaign.id),
            version=1,
            content_kind="product_snapshot",
            content_fingerprint=content_fingerprint,
            source_product_id=int(product.id),
            message=message,
            image_url=image_url,
            video_url=video_url,
            change_kind="activation",
            activated_at=activated_at,
        )
    )
    get_or_create_spotlight_campaign_pacing_state(db, campaign_id=int(campaign.id), now=activated_at)
    db.flush()
    return campaign, placements


def _result_for_spend(
    db: Session, *, spend: MemberCreditServiceSpendOrder, deduped: bool
) -> MemberCreditSpotlightResult:
    campaign = db.get(SpotlightCampaign, int(spend.spotlight_campaign_id))
    if campaign is None:
        raise MemberCreditError("completed_spotlight_campaign_missing")
    placements = (
        db.query(MarketplaceBroadcast)
        .filter(MarketplaceBroadcast.spotlight_campaign_id == int(campaign.id))
        .order_by(MarketplaceBroadcast.id.asc())
        .all()
    )
    return MemberCreditSpotlightResult(
        spend_order_id=int(spend.id),
        campaign_id=int(campaign.id),
        placement_ids=tuple(int(row.id) for row in placements),
        funding_source=str(spend.funding_source),
        activated_at=_aware(campaign.activated_at),
        expires_at=_aware(authorized_expiry(campaign)),
        deduped=deduped,
    )


def _aware(value: Optional[datetime]) -> datetime:
    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
