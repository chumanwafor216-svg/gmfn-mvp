from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Optional
from urllib.parse import unquote, urlparse

from sqlalchemy.orm import Session

from app.db.models import (
    MarketplaceBroadcast,
    MarketplaceMediaDeletionTask,
    MarketplaceProduct,
    MarketplaceShop,
    ShopDiaryEntry,
    SpotlightContentVersion,
    User,
    VaultPrivateOffer,
)
from app.services.storage_service import (
    StorageServiceError,
    delete_r2_object,
    r2_object_key_from_public_url,
)


def _safe_text(value: object) -> str:
    return str(value or "").strip()


def _without_url_secrets(value: str) -> str:
    try:
        parsed = urlparse(value)
        return parsed._replace(query="", fragment="").geturl()
    except ValueError:
        return value


def _uploads_root() -> Path:
    raw = _safe_text(os.getenv("GMFN_UPLOADS_DIR", "uploads"))
    return Path(raw or "uploads").expanduser()


def _safe_path_segments(value: str) -> Optional[list[str]]:
    decoded = unquote(value).replace(chr(92), "/")
    if "\x00" in decoded:
        return None
    segments = decoded.split("/")
    if any(segment in {".", ".."} for segment in segments):
        return None
    return segments


def canonical_marketplace_media_target(media_url: object) -> Optional[dict[str, Any]]:
    """Resolve only media managed inside this instance's Marketplace namespace."""

    value = _safe_text(media_url)
    if not value:
        return None
    try:
        parsed = urlparse(value)
    except ValueError:
        return None

    if not parsed.scheme and not parsed.netloc:
        segments = _safe_path_segments(parsed.path)
        if (
            not segments
            or len(segments) < 4
            or segments[:3] != ["", "uploads", "marketplace"]
            or any(not segment for segment in segments[3:])
        ):
            return None
        try:
            root = _uploads_root().resolve()
            marketplace_root = (root / "marketplace").resolve()
            candidate = (root.joinpath(*segments[2:])).resolve()
            candidate.relative_to(marketplace_root)
            relative = candidate.relative_to(root).as_posix()
        except (OSError, RuntimeError, ValueError):
            return None
        canonical_relative = relative.casefold() if os.name == "nt" else relative
        return {
            "provider": "local",
            "canonical_key": f"local:{canonical_relative}",
            "local_path": candidate,
            "object_key": None,
        }

    object_key = r2_object_key_from_public_url(value)
    if not object_key:
        return None
    key_segments = _safe_path_segments(object_key)
    if (
        not key_segments
        or len(key_segments) < 2
        or key_segments[0] != "marketplace"
        or any(not segment for segment in key_segments)
    ):
        return None
    normalized_key = "/".join(key_segments)
    return {
        "provider": "cloudflare_r2",
        "canonical_key": f"r2:{normalized_key}",
        "local_path": None,
        "object_key": normalized_key,
    }


def _reference_columns():
    return (
        MarketplaceProduct.image_url,
        MarketplaceProduct.video_url,
        MarketplaceShop.image_url,
        ShopDiaryEntry.image_url,
        ShopDiaryEntry.video_url,
        SpotlightContentVersion.image_url,
        SpotlightContentVersion.video_url,
        MarketplaceBroadcast.image_url,
        MarketplaceBroadcast.video_url,
        VaultPrivateOffer.media_url,
        VaultPrivateOffer.thumbnail_url,
        User.profile_image_url,
    )


def marketplace_media_is_referenced(db: Session, media_url: object) -> bool:
    """Compare canonical managed-object identity across every surviving reference."""

    target = canonical_marketplace_media_target(media_url)
    if target is None:
        return False
    return str(target["canonical_key"]) in marketplace_media_reference_keys(
        db,
        [media_url],
    )


def marketplace_media_reference_keys(
    db: Session,
    media_urls: Iterable[object],
) -> set[str]:
    """Scan reference columns once for a bounded batch of managed media targets."""

    target_keys = {
        str(target["canonical_key"])
        for media_url in media_urls
        if (target := canonical_marketplace_media_target(media_url)) is not None
    }
    if not target_keys:
        return set()

    referenced_keys: set[str] = set()
    for column in _reference_columns():
        rows = db.query(column).filter(column.isnot(None)).yield_per(500)
        for (candidate_url,) in rows:
            candidate = canonical_marketplace_media_target(candidate_url)
            if candidate is not None:
                canonical_key = str(candidate["canonical_key"])
                if canonical_key in target_keys:
                    referenced_keys.add(canonical_key)
                    if referenced_keys == target_keys:
                        return referenced_keys
    return referenced_keys


def delete_unreferenced_marketplace_media(
    db: Session,
    *,
    media_url: object,
    referenced_keys: Optional[set[str]] = None,
) -> dict[str, Any]:
    """Attempt one canonical, reference-safe managed-object deletion."""

    value = _safe_text(media_url)
    if not value:
        return {"status": "empty", "provider": None}
    target = canonical_marketplace_media_target(value)
    if target is None:
        return {"status": "unmanaged", "provider": None}
    canonical_key = str(target["canonical_key"])
    is_referenced = (
        canonical_key in referenced_keys
        if referenced_keys is not None
        else marketplace_media_is_referenced(db, value)
    )
    if is_referenced:
        return {"status": "retained_referenced", "provider": None}

    provider = str(target["provider"])
    if provider == "local":
        local_path = target["local_path"]
        try:
            if not isinstance(local_path, Path) or not local_path.is_file():
                return {"status": "already_absent", "provider": "local"}
            local_path.unlink()
            return {"status": "deleted", "provider": "local"}
        except OSError:
            return {"status": "delete_failed", "provider": "local"}

    try:
        delete_r2_object(object_key=str(target["object_key"]))
        return {"status": "deleted", "provider": "cloudflare_r2"}
    except StorageServiceError:
        return {"status": "delete_failed", "provider": "cloudflare_r2"}
    except Exception:
        return {"status": "delete_failed", "provider": "cloudflare_r2"}


def queue_marketplace_media_deletions(
    db: Session,
    *,
    media_urls: Iterable[object],
    source: str,
) -> dict[str, Any]:
    """Persist managed deletion work in the same transaction as payload removal."""

    task_ids: list[int] = []
    immediate: list[dict[str, Any]] = []
    seen_canonical: set[str] = set()
    seen_unmanaged: set[str] = set()
    for raw_value in media_urls:
        value = _without_url_secrets(_safe_text(raw_value))
        if not value:
            continue
        target = canonical_marketplace_media_target(value)
        if target is None:
            if value not in seen_unmanaged:
                seen_unmanaged.add(value)
                immediate.append(
                    {"media_url": value, "status": "unmanaged", "provider": None}
                )
            continue

        canonical_key = str(target["canonical_key"])
        if canonical_key in seen_canonical:
            continue
        seen_canonical.add(canonical_key)
        task = (
            db.query(MarketplaceMediaDeletionTask)
            .filter(MarketplaceMediaDeletionTask.canonical_key == canonical_key)
            .with_for_update()
            .first()
        )
        if task is None:
            task = MarketplaceMediaDeletionTask(
                canonical_key=canonical_key,
                media_url=value,
                source=_safe_text(source) or "marketplace",
            )
        else:
            task.media_url = value
            task.source = _safe_text(source) or "marketplace"
            task.last_error = None
            task.updated_at = datetime.now(timezone.utc)
        db.add(task)
        db.flush()
        task_ids.append(int(task.id))

    return {"task_ids": task_ids, "immediate": immediate}


def process_marketplace_media_deletion_tasks(
    db: Session,
    *,
    task_ids: Optional[Iterable[int]] = None,
    limit: int = 100,
) -> list[dict[str, Any]]:
    """Retry pending cleanup; successful or safely retained tasks leave no queue row."""

    bounded_limit = max(1, min(int(limit), 500))
    query = db.query(MarketplaceMediaDeletionTask)
    if task_ids is not None:
        normalized_ids = sorted({int(value) for value in task_ids if int(value) > 0})
        if not normalized_ids:
            return []
        query = query.filter(MarketplaceMediaDeletionTask.id.in_(normalized_ids))
    tasks = (
        query.order_by(
            MarketplaceMediaDeletionTask.updated_at.asc(),
            MarketplaceMediaDeletionTask.id.asc(),
        )
        .limit(bounded_limit)
        .with_for_update(skip_locked=True)
        .all()
    )
    referenced_keys = marketplace_media_reference_keys(
        db,
        [task.media_url for task in tasks],
    )
    results: list[dict[str, Any]] = []
    for task in tasks:
        result = delete_unreferenced_marketplace_media(
            db,
            media_url=task.media_url,
            referenced_keys=referenced_keys,
        )
        results.append({"media_url": task.media_url, **result})
        if result.get("status") == "delete_failed":
            task.attempts = int(task.attempts or 0) + 1
            task.last_error = "managed_object_delete_failed"
            task.updated_at = datetime.now(timezone.utc)
            db.add(task)
        else:
            db.delete(task)
    db.commit()
    return results
