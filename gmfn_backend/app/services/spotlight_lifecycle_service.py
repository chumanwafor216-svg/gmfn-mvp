from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import (
    MarketplaceBroadcast,
    MarketplaceProduct,
    SpotlightCampaign,
    SpotlightContentVersion,
    SpotlightPresentationLease,
)


SPOTLIGHT_AUTHORIZED_DAY = timedelta(hours=24)
SPOTLIGHT_SERVING = 'serving'
SPOTLIGHT_CORRECTION_HOLD = 'correction_hold'
SPOTLIGHT_WITHDRAWN = 'withdrawn'
SPOTLIGHT_EXPIRED = 'expired'
SPOTLIGHT_SERVING_CONTRACT_VERSION = 2
SPOTLIGHT_LIFECYCLE_WRITER_ENV = 'GSN_SPOTLIGHT_LIFECYCLE_WRITES_ENABLED'


class SpotlightLifecycleError(ValueError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def lifecycle_writers_enabled() -> bool:
    return str(os.getenv(SPOTLIGHT_LIFECYCLE_WRITER_ENV, '')).strip().lower() in {
        '1', 'true', 'yes', 'on'
    }


def authorized_expiry(row: object) -> Optional[datetime]:
    return _utc(getattr(row, 'authorized_expires_at', None)) or _utc(getattr(row, 'expires_at', None))


def activation_expiry(activated_at: datetime, *, authorized_days: int = 1) -> datetime:
    start = _utc(activated_at) or now_utc()
    return start + (SPOTLIGHT_AUTHORIZED_DAY * max(int(authorized_days), 1))


def row_is_serving(row: object, *, now: Optional[datetime] = None) -> bool:
    current = _utc(now) or now_utc()
    return (
        str(getattr(row, 'serving_status', SPOTLIGHT_SERVING) or SPOTLIGHT_SERVING) == SPOTLIGHT_SERVING
        and (authorized_expiry(row) is None or current < authorized_expiry(row))
    )


def ensure_initial_content_version(
    db: Session,
    *,
    campaign: SpotlightCampaign,
    placement: MarketplaceBroadcast,
) -> SpotlightContentVersion:
    existing = (
        db.query(SpotlightContentVersion)
        .filter(SpotlightContentVersion.campaign_id == int(campaign.id))
        .filter(SpotlightContentVersion.version == int(campaign.content_version or 1))
        .one_or_none()
    )
    if existing is not None:
        return existing
    row = SpotlightContentVersion(
        campaign_id=int(campaign.id),
        version=int(campaign.content_version or 1),
        content_kind=str(campaign.content_kind or 'broadcast_snapshot'),
        content_fingerprint=str(campaign.content_fingerprint or ''),
        source_product_id=campaign.source_product_id,
        message=str(placement.message or ''),
        image_url=placement.image_url,
        video_url=placement.video_url,
        change_kind='activation',
        activated_at=_utc(campaign.activated_at) or now_utc(),
    )
    db.add(row)
    db.flush()
    return row


def require_writers_enabled() -> None:
    if not lifecycle_writers_enabled():
        raise SpotlightLifecycleError(
            'spotlight_lifecycle_writers_disabled',
            'Spotlight correction and withdrawal are not enabled until status-aware readers and cache handling are released together.',
        )


def place_correction_hold(db: Session, *, campaign: SpotlightCampaign, now: Optional[datetime] = None) -> None:
    require_writers_enabled()
    current = _utc(now) or now_utc()
    campaign = (
        db.query(SpotlightCampaign)
        .filter(SpotlightCampaign.id == int(campaign.id))
        .with_for_update()
        .one()
    )
    if str(campaign.serving_status or SPOTLIGHT_SERVING) == SPOTLIGHT_WITHDRAWN:
        raise SpotlightLifecycleError('campaign_permanently_withdrawn', 'A permanently withdrawn Spotlight cannot enter correction hold.')
    if authorized_expiry(campaign) is not None and current >= authorized_expiry(campaign):
        raise SpotlightLifecycleError('campaign_expired', 'This Spotlight has expired and cannot be corrected or revived.')
    campaign.serving_status = SPOTLIGHT_CORRECTION_HOLD
    campaign.serving_status_changed_at = current
    placements = (
        db.query(MarketplaceBroadcast)
        .filter(MarketplaceBroadcast.spotlight_campaign_id == int(campaign.id))
        .with_for_update()
        .all()
    )
    for placement in placements:
        if str(placement.serving_status or SPOTLIGHT_SERVING) != SPOTLIGHT_WITHDRAWN:
            placement.serving_status = SPOTLIGHT_CORRECTION_HOLD
            placement.serving_status_changed_at = current
    invalidate_campaign_leases(db, campaign_id=int(campaign.id), reason='correction_hold', now=current)


def permanently_withdraw(db: Session, *, campaign: SpotlightCampaign, now: Optional[datetime] = None) -> None:
    require_writers_enabled()
    current = _utc(now) or now_utc()
    campaign = (
        db.query(SpotlightCampaign)
        .filter(SpotlightCampaign.id == int(campaign.id))
        .with_for_update()
        .one()
    )
    if str(campaign.serving_status or '') == SPOTLIGHT_WITHDRAWN:
        return
    campaign.serving_status = SPOTLIGHT_WITHDRAWN
    campaign.serving_status_changed_at = current
    campaign.status = 'ended'
    campaign.ended_at = current
    placements = (
        db.query(MarketplaceBroadcast)
        .filter(MarketplaceBroadcast.spotlight_campaign_id == int(campaign.id))
        .with_for_update()
        .all()
    )
    for placement in placements:
        placement.serving_status = SPOTLIGHT_WITHDRAWN
        placement.serving_status_changed_at = current
    invalidate_campaign_leases(db, campaign_id=int(campaign.id), reason='withdrawn', now=current)


def invalidate_campaign_leases(
    db: Session, *, campaign_id: int, reason: str, now: Optional[datetime] = None
) -> int:
    current = _utc(now) or now_utc()
    return (
        db.query(SpotlightPresentationLease)
        .filter(SpotlightPresentationLease.campaign_id == int(campaign_id))
        .filter(SpotlightPresentationLease.status == 'issued')
        .update(
            {
                SpotlightPresentationLease.status: 'invalidated',
                SpotlightPresentationLease.invalidated_at: current,
                SpotlightPresentationLease.invalidation_reason: str(reason)[:64],
            },
            synchronize_session=False,
        )
    )


def same_shop_product(db: Session, *, campaign: SpotlightCampaign, product_id: Optional[int]) -> Optional[MarketplaceProduct]:
    if product_id is None:
        return None
    product = db.get(MarketplaceProduct, int(product_id))
    if product is None or int(product.shop_id) != int(campaign.shop_id or 0):
        raise SpotlightLifecycleError('replacement_product_outside_entitlement', 'A corrected product must be an eligible product from the same shop.')
    if not bool(getattr(product, 'is_active', True)) or str(getattr(product, 'visibility_mode', 'community_visible')) != 'community_visible':
        raise SpotlightLifecycleError('replacement_product_ineligible', 'The selected replacement product is not eligible for this Spotlight audience.')
    return product


def replace_content(
    db: Session,
    *,
    campaign: SpotlightCampaign,
    content_kind: str,
    content_fingerprint: str,
    message: str,
    image_url: Optional[str],
    video_url: Optional[str],
    source_product_id: Optional[int] = None,
    now: Optional[datetime] = None,
) -> SpotlightContentVersion:
    require_writers_enabled()
    current = _utc(now) or now_utc()
    campaign = (
        db.query(SpotlightCampaign)
        .filter(SpotlightCampaign.id == int(campaign.id))
        .with_for_update()
        .one()
    )
    if str(campaign.serving_status or SPOTLIGHT_SERVING) == SPOTLIGHT_WITHDRAWN:
        raise SpotlightLifecycleError('campaign_permanently_withdrawn', 'A permanently withdrawn Spotlight cannot be replaced.')
    if authorized_expiry(campaign) is not None and current >= authorized_expiry(campaign):
        raise SpotlightLifecycleError('campaign_expired', 'This Spotlight has expired. Replacement cannot revive it.')
    same_shop_product(db, campaign=campaign, product_id=source_product_id)

    placements = (
        db.query(MarketplaceBroadcast)
        .filter(MarketplaceBroadcast.spotlight_campaign_id == int(campaign.id))
        .order_by(MarketplaceBroadcast.id.asc())
        .with_for_update()
        .all()
    )
    if not placements:
        raise SpotlightLifecycleError('campaign_has_no_placements', 'This Spotlight has no preserved placement entitlement to correct.')
    ensure_initial_content_version(db, campaign=campaign, placement=placements[0])
    old_version = int(campaign.content_version or 1)
    (
        db.query(SpotlightContentVersion)
        .filter(SpotlightContentVersion.campaign_id == int(campaign.id))
        .filter(SpotlightContentVersion.version == old_version)
        .update({SpotlightContentVersion.replaced_at: current}, synchronize_session=False)
    )
    new_version = old_version + 1
    version = SpotlightContentVersion(
        campaign_id=int(campaign.id),
        version=new_version,
        content_kind=str(content_kind or campaign.content_kind or 'broadcast_snapshot'),
        content_fingerprint=str(content_fingerprint or ''),
        source_product_id=int(source_product_id) if source_product_id is not None else None,
        message=str(message or ''),
        image_url=image_url,
        video_url=video_url,
        change_kind='correction',
        activated_at=current,
    )
    db.add(version)
    campaign.content_version = new_version
    campaign.content_kind = str(content_kind or campaign.content_kind or 'broadcast_snapshot')
    campaign.content_fingerprint = str(content_fingerprint or '')
    campaign.source_product_id = int(source_product_id) if source_product_id is not None else None
    campaign.serving_status = SPOTLIGHT_SERVING
    campaign.serving_status_changed_at = current

    for placement in placements:
        placement.message = str(message or '')
        placement.image_url = image_url
        placement.video_url = video_url
        placement.content_version = new_version
        placement_expiry = authorized_expiry(placement)
        if str(placement.serving_status or '') != SPOTLIGHT_WITHDRAWN:
            placement.serving_status = (
                SPOTLIGHT_SERVING
                if placement_expiry is None or current < placement_expiry
                else SPOTLIGHT_EXPIRED
            )
            placement.serving_status_changed_at = current
    invalidate_campaign_leases(db, campaign_id=int(campaign.id), reason='content_replaced', now=current)
    db.flush()
    return version


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
