from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable, Optional

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.db.models import (
    MarketplaceAttentionEvent,
    MarketplaceBroadcast,
    SpotlightCampaign,
    SpotlightCampaignPacingState,
    SpotlightContentVersion,
    SpotlightExposureEvent,
    SpotlightPresentationLease,
)
from app.services.marketplace_media_cleanup_service import (
    process_marketplace_media_deletion_tasks,
    queue_marketplace_media_deletions,
)


def _utc_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _empty_result() -> dict[str, Any]:
    return {
        "scanned_campaigns": 0,
        "campaigns_compacted": 0,
        "placement_rows_deleted": 0,
        "presentation_leases_deleted": 0,
        "pacing_rows_deleted": 0,
        "content_versions_scrubbed": 0,
        "exposure_links_detached": 0,
        "attention_links_detached": 0,
        "media_cleanup": [],
        "media_cleanup_queued": 0,
    }


def _compact_campaign_rows(
    db: Session,
    *,
    campaigns: Iterable[SpotlightCampaign],
    current_time: datetime,
    source: str,
    clear_source_product: bool,
    withdrawn: bool,
) -> tuple[dict[str, Any], list[int]]:
    result = _empty_result()
    campaign_rows = list(campaigns)
    result["scanned_campaigns"] = len(campaign_rows)
    media_urls: set[str] = set()

    for campaign in campaign_rows:
        placements = (
            db.query(MarketplaceBroadcast)
            .filter(MarketplaceBroadcast.spotlight_campaign_id == campaign.id)
            .all()
        )
        placement_ids = [int(row.id) for row in placements]
        content_versions = (
            db.query(SpotlightContentVersion)
            .filter(SpotlightContentVersion.campaign_id == campaign.id)
            .all()
        )

        for row in [*placements, *content_versions]:
            for value in (row.image_url, row.video_url):
                cleaned = str(value or "").strip()
                if cleaned:
                    media_urls.add(cleaned)

        result["presentation_leases_deleted"] += (
            db.query(SpotlightPresentationLease)
            .filter(SpotlightPresentationLease.campaign_id == campaign.id)
            .delete(synchronize_session=False)
        )
        result["pacing_rows_deleted"] += (
            db.query(SpotlightCampaignPacingState)
            .filter(SpotlightCampaignPacingState.campaign_id == campaign.id)
            .delete(synchronize_session=False)
        )
        if placement_ids:
            result["exposure_links_detached"] += (
                db.query(SpotlightExposureEvent)
                .filter(SpotlightExposureEvent.placement_broadcast_id.in_(placement_ids))
                .update(
                    {SpotlightExposureEvent.placement_broadcast_id: None},
                    synchronize_session=False,
                )
            )
            result["attention_links_detached"] += (
                db.query(MarketplaceAttentionEvent)
                .filter(MarketplaceAttentionEvent.broadcast_id.in_(placement_ids))
                .update(
                    {MarketplaceAttentionEvent.broadcast_id: None},
                    synchronize_session=False,
                )
            )
        result["placement_rows_deleted"] += (
            db.query(MarketplaceBroadcast)
            .filter(MarketplaceBroadcast.spotlight_campaign_id == campaign.id)
            .delete(synchronize_session=False)
        )

        for content_version in content_versions:
            content_version.message = ""
            content_version.image_url = None
            content_version.video_url = None
            if clear_source_product:
                content_version.source_product_id = None
        result["content_versions_scrubbed"] += len(content_versions)

        if clear_source_product:
            campaign.source_product_id = None
        if withdrawn:
            campaign.serving_status = "withdrawn"
            campaign.status = "ended"
        else:
            if campaign.serving_status != "withdrawn":
                campaign.serving_status = "expired"
            if campaign.status != "ended":
                campaign.status = "expired"
        campaign.serving_status_changed_at = current_time
        if campaign.ended_at is None:
            campaign.ended_at = current_time
        campaign.payload_compacted_at = current_time
        result["campaigns_compacted"] += 1

    queued = queue_marketplace_media_deletions(
        db,
        media_urls=sorted(media_urls),
        source=source,
    )
    result["media_cleanup"] = list(queued["immediate"])
    result["media_cleanup_queued"] = len(queued["task_ids"])
    return result, list(queued["task_ids"])


def compact_spotlight_payloads_for_deleted_product(
    db: Session,
    *,
    product_id: int,
    now: Optional[datetime] = None,
) -> tuple[dict[str, Any], list[int]]:
    """Stop and compact every Spotlight sourced from a permanently deleted product.

    This function deliberately does not commit. The caller commits it with the
    product deletion and then processes the returned durable media tasks.
    """

    current_time = _utc_aware(now or datetime.now(timezone.utc))
    campaigns = (
        db.query(SpotlightCampaign)
        .filter(SpotlightCampaign.source_product_id == int(product_id))
        .with_for_update()
        .all()
    )
    return _compact_campaign_rows(
        db,
        campaigns=campaigns,
        current_time=current_time,
        source="deleted_product_spotlight",
        clear_source_product=True,
        withdrawn=True,
    )


def compact_expired_spotlight_payloads(
    db: Session,
    *,
    now: Optional[datetime] = None,
    limit: int = 100,
) -> dict[str, Any]:
    """Remove expired delivery payload while retaining minimal audit evidence."""

    current_time = _utc_aware(now or datetime.now(timezone.utc))
    bounded_limit = max(1, min(int(limit), 500))
    try:
        campaigns = (
            db.query(SpotlightCampaign)
            .filter(
                SpotlightCampaign.payload_compacted_at.is_(None),
                or_(
                    SpotlightCampaign.authorized_expires_at <= current_time,
                    and_(
                        SpotlightCampaign.authorized_expires_at.is_(None),
                        SpotlightCampaign.expires_at <= current_time,
                    ),
                ),
            )
            .order_by(
                func.coalesce(
                    SpotlightCampaign.authorized_expires_at,
                    SpotlightCampaign.expires_at,
                ).asc(),
                SpotlightCampaign.id.asc(),
            )
            .limit(bounded_limit)
            .with_for_update(skip_locked=True)
            .all()
        )
        result, task_ids = _compact_campaign_rows(
            db,
            campaigns=campaigns,
            current_time=current_time,
            source="expired_spotlight",
            clear_source_product=False,
            withdrawn=False,
        )
        if not campaigns:
            db.rollback()
            return result
        db.commit()
    except Exception:
        db.rollback()
        raise

    result["media_cleanup"].extend(
        process_marketplace_media_deletion_tasks(
            db,
            task_ids=task_ids,
            limit=max(len(task_ids), 1),
        )
    )
    return result
