from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ShopDiaryEntry, ShopVoiceAttachment, User
from app.schemas.shop_diary import ShopDiaryEntryCreateIn
from app.services.demand_audio_service import (
    PRIVATE_SHOP_VOICE_DIRECTORY,
    delete_shop_voice,
    shop_voice_path,
    store_shop_voice,
)
from app.services.marketplace_media_cleanup_service import (
    queue_marketplace_media_deletions,
)
from app.services.shop_voice_service import (
    SHOP_VOICE_PRODUCT,
    SHOP_VOICE_UPDATE,
    SHOP_VOICE_WELCOME,
    require_exact_shop_owner,
    resolve_shop_voice_parent,
    shop_voice_is_public,
    shop_voice_payload,
)
from app.services.trust_events_services import log_trust_event
from app.api.routes.shop_diary import (
    CONFIRMED_TRADE_STATES,
    _active_membership,
    _entry_out,
    _is_admin,
    _resolved_evidence_class,
    _safe_str,
    _validate_product_link,
    _validate_trade_link,
)
from app.services.community_domain_feature_policy import require_domain_shop_diary_enabled


router = APIRouter(prefix="/shop-voice", tags=["shop-voice"])


class ShopVoiceDeleteIn(BaseModel):
    confirmation: str = Field(..., pattern="^DELETE VOICE NOTE$")


def _parse_shop_update_payload(payload_json: str) -> ShopDiaryEntryCreateIn:
    try:
        return ShopDiaryEntryCreateIn.model_validate_json(payload_json)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _managed_voice_url(storage_key: str) -> str:
    return f"/uploads/{PRIVATE_SHOP_VOICE_DIRECTORY}/{storage_key}"


async def _replace_voice(
    *,
    parent_kind: str,
    parent_id: int,
    audio: UploadFile,
    db: Session,
    current_user: User,
):
    shop, _parent = resolve_shop_voice_parent(
        db,
        parent_kind=parent_kind,
        parent_id=parent_id,
    )
    require_exact_shop_owner(shop, current_user)
    stored = await store_shop_voice(audio)
    previous_storage_key = ""
    try:
        attachment = (
            db.query(ShopVoiceAttachment)
            .filter(
                ShopVoiceAttachment.parent_kind == parent_kind,
                ShopVoiceAttachment.parent_id == int(parent_id),
            )
            .first()
        )
        if attachment is None:
            attachment = ShopVoiceAttachment(
                parent_kind=parent_kind,
                parent_id=int(parent_id),
                shop_id=int(shop.id),
                created_by_user_id=int(current_user.id),
                storage_key=stored.storage_key,
                original_filename=stored.original_filename,
                mime_type=stored.mime_type,
                byte_size=stored.byte_size,
                duration_seconds=stored.duration_seconds,
                created_at=_now_utc(),
                updated_at=_now_utc(),
            )
            db.add(attachment)
        else:
            previous_storage_key = str(attachment.storage_key or "")
            attachment.shop_id = int(shop.id)
            attachment.created_by_user_id = int(current_user.id)
            attachment.storage_key = stored.storage_key
            attachment.original_filename = stored.original_filename
            attachment.mime_type = stored.mime_type
            attachment.byte_size = stored.byte_size
            attachment.duration_seconds = stored.duration_seconds
            attachment.deleted_at = None
            attachment.deleted_by_user_id = None
            attachment.updated_at = _now_utc()
        db.flush()
        if previous_storage_key and previous_storage_key != stored.storage_key:
            queue_marketplace_media_deletions(
                db,
                media_urls=[_managed_voice_url(previous_storage_key)],
                source="shop_voice_replaced",
            )
        log_trust_event(
            db,
            event_type="shop.voice.recorded",
            clan_id=getattr(shop, "clan_id", None),
            actor_user_id=int(current_user.id),
            subject_user_id=int(shop.owner_user_id),
            meta={
                "shop_voice_attachment_id": int(attachment.id),
                "shop_id": int(shop.id),
                "parent_kind": parent_kind,
                "parent_id": int(parent_id),
                "reason": "shop_voice_recorded",
            },
            commit=False,
            refresh=False,
        )
        db.commit()
        db.refresh(attachment)
        return shop_voice_payload(
            db,
            parent_kind=parent_kind,
            parent_id=int(parent_id),
        )
    except Exception:
        db.rollback()
        delete_shop_voice(stored.storage_key)
        raise


@router.post("/shops/{shop_id}/welcome")
async def replace_shop_welcome_voice(
    shop_id: int,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _replace_voice(
        parent_kind=SHOP_VOICE_WELCOME,
        parent_id=shop_id,
        audio=audio,
        db=db,
        current_user=current_user,
    )


@router.post("/updates/{entry_id}")
async def replace_shop_update_voice(
    entry_id: int,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _replace_voice(
        parent_kind=SHOP_VOICE_UPDATE,
        parent_id=entry_id,
        audio=audio,
        db=db,
        current_user=current_user,
    )


@router.post("/updates")
async def create_shop_update_with_voice(
    payload_json: str = Form(...),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = _parse_shop_update_payload(payload_json)
    shop, _parent = resolve_shop_voice_parent(
        db,
        parent_kind=SHOP_VOICE_WELCOME,
        parent_id=int(payload.shop_id),
    )
    require_exact_shop_owner(shop, current_user)
    clan_id = int(payload.clan_id or shop.clan_id or 0) or None
    if clan_id is not None and not _is_admin(current_user):
        membership = _active_membership(
            db,
            user_id=int(current_user.id),
            clan_id=clan_id,
        )
        if not membership:
            raise HTTPException(
                status_code=403,
                detail="Use a community where this shop owner is an active member",
            )
        require_domain_shop_diary_enabled(db, clan_id=clan_id)
    product = _validate_product_link(
        db,
        product_id=payload.product_id,
        shop_id=int(shop.id),
        owner_user_id=int(shop.owner_user_id),
    )
    trade, trade_outcome = _validate_trade_link(
        db,
        trade_id=payload.protected_trade_id,
        shop_id=int(shop.id),
        current_user=current_user,
    )
    if trade is not None:
        state = _safe_str((trade_outcome or {}).get("derived_outcome_state"))
        if state not in CONFIRMED_TRADE_STATES:
            raise HTTPException(
                status_code=400,
                detail="Linked Trade Evidence is not confirmed enough for a Shop Diary confirmed activity",
            )
    evidence_class = _resolved_evidence_class(payload.evidence_class, trade_outcome)
    occurred_at = payload.occurred_at or _now_utc()
    stored = await store_shop_voice(audio)
    try:
        entry = ShopDiaryEntry(
            clan_id=clan_id,
            shop_id=int(shop.id),
            owner_user_id=int(shop.owner_user_id),
            product_id=int(product.id) if product is not None else None,
            protected_trade_id=int(trade.id) if trade is not None else None,
            activity_type=payload.activity_type,
            evidence_class=evidence_class,
            note=_safe_str(payload.note, "Voice update"),
            image_url=None,
            video_url=None,
            occurred_at=occurred_at,
            is_public=bool(payload.is_public),
            is_active=True,
            created_at=_now_utc(),
            updated_at=_now_utc(),
        )
        db.add(entry)
        db.flush()
        attachment = ShopVoiceAttachment(
            parent_kind=SHOP_VOICE_UPDATE,
            parent_id=int(entry.id),
            shop_id=int(shop.id),
            created_by_user_id=int(current_user.id),
            storage_key=stored.storage_key,
            original_filename=stored.original_filename,
            mime_type=stored.mime_type,
            byte_size=stored.byte_size,
            duration_seconds=stored.duration_seconds,
            created_at=_now_utc(),
            updated_at=_now_utc(),
        )
        db.add(attachment)
        db.flush()
        log_trust_event(
            db,
            event_type="shop_diary.entry.created",
            clan_id=clan_id,
            actor_user_id=int(current_user.id),
            subject_user_id=int(shop.owner_user_id),
            meta={
                "shop_diary_entry_id": int(entry.id),
                "shop_id": int(shop.id),
                "product_id": int(product.id) if product is not None else None,
                "protected_trade_id": int(trade.id) if trade is not None else None,
                "activity_type": entry.activity_type,
                "evidence_class": entry.evidence_class,
                "voice_attachment_id": int(attachment.id),
                "reason": "shop_diary_voice_entry_created",
            },
            commit=False,
            refresh=False,
        )
        db.commit()
        db.refresh(entry)
        return _entry_out(db, entry)
    except Exception:
        db.rollback()
        delete_shop_voice(stored.storage_key)
        raise


@router.post("/products/{product_id}")
async def replace_product_voice(
    product_id: int,
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _replace_voice(
        parent_kind=SHOP_VOICE_PRODUCT,
        parent_id=product_id,
        audio=audio,
        db=db,
        current_user=current_user,
    )


@router.get("/public/{attachment_id}")
def play_public_shop_voice(
    attachment_id: int,
    db: Session = Depends(get_db),
):
    attachment = db.get(ShopVoiceAttachment, int(attachment_id))
    if attachment is None or not shop_voice_is_public(db, attachment):
        raise HTTPException(status_code=404, detail="Voice note not found")
    path = shop_voice_path(attachment.storage_key)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Voice note not found")
    return FileResponse(
        path,
        media_type=attachment.mime_type,
        headers={"Cache-Control": "no-store"},
    )


@router.get("/protected/{attachment_id}")
def play_protected_shop_voice(
    attachment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attachment = db.get(ShopVoiceAttachment, int(attachment_id))
    if attachment is None or attachment.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Voice note not found")
    shop, _parent = resolve_shop_voice_parent(
        db,
        parent_kind=attachment.parent_kind,
        parent_id=int(attachment.parent_id),
    )
    require_exact_shop_owner(shop, current_user)
    path = shop_voice_path(attachment.storage_key)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Voice note not found")
    return FileResponse(
        path,
        media_type=attachment.mime_type,
        headers={"Cache-Control": "no-store, private"},
    )


@router.post("/{attachment_id}/delete")
def delete_shop_voice_attachment(
    attachment_id: int,
    _payload: ShopVoiceDeleteIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attachment = db.get(ShopVoiceAttachment, int(attachment_id))
    if attachment is None:
        raise HTTPException(status_code=404, detail="Voice note not found")
    if int(attachment.created_by_user_id) != int(current_user.id):
        raise HTTPException(status_code=403, detail="Only the sender can delete this voice note")
    if attachment.deleted_at is not None:
        return {
            "attachment_id": int(attachment.id),
            "status": "already_deleted",
            "deleted_at": attachment.deleted_at,
        }
    deleted_at = _now_utc()
    queue_marketplace_media_deletions(
        db,
        media_urls=[_managed_voice_url(attachment.storage_key)],
        source="shop_voice_owner_delete",
    )
    attachment.deleted_at = deleted_at
    attachment.deleted_by_user_id = int(current_user.id)
    attachment.original_filename = None
    attachment.updated_at = deleted_at
    log_trust_event(
        db,
        event_type="shop.voice.deleted",
        clan_id=None,
        actor_user_id=int(current_user.id),
        subject_user_id=int(current_user.id),
        meta={
            "shop_voice_attachment_id": int(attachment.id),
            "shop_id": int(attachment.shop_id),
            "parent_kind": attachment.parent_kind,
            "parent_id": int(attachment.parent_id),
            "reason": "shop_voice_owner_deleted",
        },
        commit=False,
        refresh=False,
    )
    db.commit()
    return {
        "attachment_id": int(attachment.id),
        "status": "deleted",
        "deleted_at": deleted_at,
    }
