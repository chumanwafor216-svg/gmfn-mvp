from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Path as ApiPath, UploadFile
from fastapi.responses import FileResponse
from pydantic import ValidationError
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.routes.marketplace_requests import (
    _public_description,
    _public_requester_display_name,
    _request_action_url,
    _request_visibility_scope,
    _to_out,
    create_marketplace_request,
)
from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import (
    ClanMembership,
    DemandAudioAttachment,
    MarketplaceRequest,
    MarketplaceRequestActivity,
    MarketplaceRequestResponse,
    User,
)
from app.schemas.marketplace_requests import (
    MarketplaceRequestActivityOut,
    MarketplaceRequestCreate,
    MarketplaceRequestHistoryOut,
    MarketplaceRequestOut,
    MarketplaceRequestRepostCreate,
    MarketplaceRequestResponseCreate,
    MarketplaceRequestResponseOut,
)
from app.services.demand_audio_service import (
    clone_demand_audio,
    delete_demand_audio,
    demand_audio_path,
    store_demand_audio,
)
from app.services.demand_box_access_service import request_visible_to_user
from app.services.notification_service import create_notification


router = APIRouter(prefix="/demand-box", tags=["demand-box-interactions"])


def _active_member(db: Session, *, user_id: int, clan_id: int | None) -> bool:
    if not clan_id:
        return False
    return (
        db.query(ClanMembership.id)
        .filter(
            ClanMembership.user_id == int(user_id),
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.left_at.is_(None),
        )
        .first()
        is not None
    )


def _require_request_access(
    db: Session,
    *,
    request_id: int,
    current_user: User,
) -> MarketplaceRequest:
    row = db.get(MarketplaceRequest, int(request_id))
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    if int(row.user_id) == int(current_user.id):
        return row
    if not _active_member(
        db,
        user_id=int(current_user.id),
        clan_id=getattr(row, "clan_id", None),
    ):
        raise HTTPException(status_code=404, detail="Request not found")
    if not request_visible_to_user(
        db,
        row,
        current_user_id=int(current_user.id),
    ):
        raise HTTPException(status_code=404, detail="Request not found")
    return row


def _request_audio(
    db: Session,
    *,
    request_id: int,
) -> DemandAudioAttachment | None:
    return (
        db.query(DemandAudioAttachment)
        .filter(DemandAudioAttachment.marketplace_request_id == int(request_id))
        .first()
    )


def _response_audio(
    db: Session,
    *,
    response_id: int,
) -> DemandAudioAttachment | None:
    return (
        db.query(DemandAudioAttachment)
        .filter(DemandAudioAttachment.response_id == int(response_id))
        .first()
    )


def _response_out(
    db: Session,
    row: MarketplaceRequestResponse,
    *,
    current_user_id: int,
) -> MarketplaceRequestResponseOut:
    author = db.get(User, int(row.author_user_id))
    audio = _response_audio(db, response_id=int(row.id))
    return MarketplaceRequestResponseOut(
        id=int(row.id),
        marketplace_request_id=int(row.marketplace_request_id),
        author_user_id=int(row.author_user_id),
        recipient_user_id=int(row.recipient_user_id),
        author_display_name=_public_requester_display_name(author),
        author_profile_image_url=(
            getattr(author, "profile_image_url", None)
            if bool(getattr(row, "show_sender_photo", False))
            else None
        ),
        text=str(row.text or "").strip() or None,
        audio_attachment_id=int(audio.id) if audio else None,
        audio_duration_seconds=float(audio.duration_seconds) if audio else None,
        created_at=row.created_at,
        is_mine=int(row.author_user_id) == int(current_user_id),
    )


def _parse_request_payload(payload_json: str) -> MarketplaceRequestCreate:
    try:
        return MarketplaceRequestCreate.model_validate_json(payload_json)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc


def _parse_response_payload(payload_json: str) -> MarketplaceRequestResponseCreate:
    try:
        return MarketplaceRequestResponseCreate.model_validate_json(payload_json)
    except ValidationError as exc:
        raise HTTPException(status_code=422, detail=exc.errors()) from exc


@router.post("/requests/voice", response_model=MarketplaceRequestOut)
async def create_voice_request(
    payload_json: str = Form(...),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payload = _parse_request_payload(payload_json)
    existing = None
    if payload.client_request_id:
        existing = (
            db.query(MarketplaceRequest)
            .filter(
                MarketplaceRequest.user_id == int(current_user.id),
                MarketplaceRequest.client_request_id == payload.client_request_id,
            )
            .first()
        )
        if existing and _request_audio(db, request_id=int(existing.id)):
            return _to_out(
                db,
                existing,
                current_user,
                current_user_id=int(current_user.id),
            )

    stored = await store_demand_audio(audio)
    try:
        created = create_marketplace_request(
            payload=payload,
            db=db,
            current_user=current_user,
        )
        row = db.get(MarketplaceRequest, int(created.id))
        if not row:
            raise HTTPException(status_code=500, detail="Voice request was not saved.")
        current_audio = _request_audio(db, request_id=int(row.id))
        if current_audio:
            delete_demand_audio(stored.storage_key)
            return _to_out(
                db,
                row,
                current_user,
                current_user_id=int(current_user.id),
            )
        db.add(
            DemandAudioAttachment(
                marketplace_request_id=int(row.id),
                response_id=None,
                storage_key=stored.storage_key,
                original_filename=stored.original_filename,
                mime_type=stored.mime_type,
                byte_size=stored.byte_size,
                duration_seconds=stored.duration_seconds,
                created_by_user_id=int(current_user.id),
            )
        )
        db.add(
            MarketplaceRequestActivity(
                marketplace_request_id=int(row.id),
                actor_user_id=int(current_user.id),
                event_type="voice_added",
                detail="Voice note attached.",
            )
        )
        db.flush()
        output = _to_out(
            db,
            row,
            current_user,
            current_user_id=int(current_user.id),
        )
        db.commit()
        return output
    except Exception:
        db.rollback()
        delete_demand_audio(stored.storage_key)
        raise


@router.get(
    "/requests/{request_id}/responses",
    response_model=list[MarketplaceRequestResponseOut],
)
def list_request_responses(
    request_id: int = ApiPath(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    demand = _require_request_access(
        db,
        request_id=request_id,
        current_user=current_user,
    )
    query = db.query(MarketplaceRequestResponse).filter(
        MarketplaceRequestResponse.marketplace_request_id == int(demand.id)
    )
    if int(demand.user_id) != int(current_user.id):
        query = query.filter(
            or_(
                MarketplaceRequestResponse.author_user_id == int(current_user.id),
                MarketplaceRequestResponse.recipient_user_id == int(current_user.id),
            )
        )
    rows = query.order_by(
        MarketplaceRequestResponse.created_at.asc(),
        MarketplaceRequestResponse.id.asc(),
    ).all()
    return [
        _response_out(db, row, current_user_id=int(current_user.id))
        for row in rows
    ]


@router.post(
    "/requests/{request_id}/responses",
    response_model=MarketplaceRequestResponseOut,
)
async def create_request_response(
    request_id: int = ApiPath(..., ge=1),
    payload_json: str = Form(...),
    audio: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    demand = _require_request_access(
        db,
        request_id=request_id,
        current_user=current_user,
    )
    if str(demand.status or "").lower() != "open":
        raise HTTPException(status_code=409, detail="This request is already closed.")

    payload = _parse_response_payload(payload_json)
    existing = (
        db.query(MarketplaceRequestResponse)
        .filter(
            MarketplaceRequestResponse.author_user_id == int(current_user.id),
            MarketplaceRequestResponse.client_response_id == payload.client_response_id,
        )
        .first()
    )
    if existing:
        if int(existing.marketplace_request_id) != int(demand.id):
            raise HTTPException(status_code=409, detail="Reply key already used.")
        return _response_out(db, existing, current_user_id=int(current_user.id))

    is_owner = int(demand.user_id) == int(current_user.id)
    if is_owner:
        recipient_user_id = int(payload.recipient_user_id or 0)
        if recipient_user_id <= 0:
            raise HTTPException(status_code=400, detail="Choose the member to reply to.")
        prior_exchange = (
            db.query(MarketplaceRequestResponse.id)
            .filter(
                MarketplaceRequestResponse.marketplace_request_id == int(demand.id),
                or_(
                    MarketplaceRequestResponse.author_user_id == recipient_user_id,
                    MarketplaceRequestResponse.recipient_user_id == recipient_user_id,
                ),
            )
            .first()
        )
        if not prior_exchange or recipient_user_id == int(current_user.id):
            raise HTTPException(status_code=403, detail="That member has not replied here.")
    else:
        recipient_user_id = int(demand.user_id)

    response_text = str(payload.text or "").strip() or None
    if not response_text and audio is None:
        raise HTTPException(status_code=400, detail="Add a message or voice note.")

    stored = await store_demand_audio(audio) if audio is not None else None
    try:
        row = MarketplaceRequestResponse(
            marketplace_request_id=int(demand.id),
            author_user_id=int(current_user.id),
            recipient_user_id=recipient_user_id,
            client_response_id=payload.client_response_id,
            text=response_text,
            show_sender_photo=bool(payload.show_sender_photo),
        )
        db.add(row)
        db.flush()
        if stored:
            db.add(
                DemandAudioAttachment(
                    marketplace_request_id=None,
                    response_id=int(row.id),
                    storage_key=stored.storage_key,
                    original_filename=stored.original_filename,
                    mime_type=stored.mime_type,
                    byte_size=stored.byte_size,
                    duration_seconds=stored.duration_seconds,
                    created_by_user_id=int(current_user.id),
                )
            )
        db.add(
            MarketplaceRequestActivity(
                marketplace_request_id=int(demand.id),
                actor_user_id=int(current_user.id),
                event_type="response_added",
                detail="Private reply added.",
            )
        )
        db.commit()
        db.refresh(row)
    except Exception:
        db.rollback()
        if stored:
            delete_demand_audio(stored.storage_key)
        raise

    create_notification(
        db,
        user_id=recipient_user_id,
        kind="demand_response",
        title="New private DemandBox reply",
        message=(
            f"{_public_requester_display_name(current_user)} replied to "
            f"'{demand.title}'."
        ),
        action_url=_request_action_url(demand),
        action_label="Open reply",
    )
    return _response_out(db, row, current_user_id=int(current_user.id))


@router.get("/audio/{attachment_id}")
def get_protected_voice_note(
    attachment_id: int = ApiPath(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    attachment = db.get(DemandAudioAttachment, int(attachment_id))
    if not attachment:
        raise HTTPException(status_code=404, detail="Voice note not found")

    if attachment.marketplace_request_id is not None:
        _require_request_access(
            db,
            request_id=int(attachment.marketplace_request_id),
            current_user=current_user,
        )
    else:
        response = db.get(
            MarketplaceRequestResponse,
            int(attachment.response_id or 0),
        )
        if not response or int(current_user.id) not in {
            int(response.author_user_id),
            int(response.recipient_user_id),
        }:
            raise HTTPException(status_code=404, detail="Voice note not found")

    path = demand_audio_path(attachment.storage_key)
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Voice note not found")
    return FileResponse(
        path=path,
        media_type=attachment.mime_type,
        filename=Path(attachment.original_filename or path.name).name,
        headers={
            "Cache-Control": "no-store, private",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get(
    "/requests/{request_id}/history",
    response_model=MarketplaceRequestHistoryOut,
)
def get_request_history(
    request_id: int = ApiPath(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    demand = db.get(MarketplaceRequest, int(request_id))
    if not demand:
        raise HTTPException(status_code=404, detail="Request not found")
    if int(demand.user_id) != int(current_user.id):
        raise HTTPException(status_code=403, detail="Only the requester can view history.")
    activities = (
        db.query(MarketplaceRequestActivity)
        .filter(MarketplaceRequestActivity.marketplace_request_id == int(demand.id))
        .order_by(
            MarketplaceRequestActivity.created_at.asc(),
            MarketplaceRequestActivity.id.asc(),
        )
        .all()
    )
    return MarketplaceRequestHistoryOut(
        request=_to_out(
            db,
            demand,
            current_user,
            current_user_id=int(current_user.id),
        ),
        activities=[
            MarketplaceRequestActivityOut(
                id=int(activity.id),
                event_type=activity.event_type,
                actor_user_id=activity.actor_user_id,
                detail=activity.detail,
                created_at=activity.created_at,
            )
            for activity in activities
        ],
    )


@router.post(
    "/requests/{request_id}/repost",
    response_model=MarketplaceRequestOut,
)
def repost_request(
    payload: MarketplaceRequestRepostCreate,
    request_id: int = ApiPath(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    original = db.get(MarketplaceRequest, int(request_id))
    if not original:
        raise HTTPException(status_code=404, detail="Request not found")
    if int(original.user_id) != int(current_user.id):
        raise HTTPException(status_code=403, detail="You can only repost your own request.")
    if str(original.status or "").lower() == "open":
        raise HTTPException(status_code=409, detail="Close this request before posting it again.")

    existing = (
        db.query(MarketplaceRequest)
        .filter(
            MarketplaceRequest.user_id == int(current_user.id),
            MarketplaceRequest.client_request_id == payload.client_request_id,
        )
        .first()
    )
    if existing:
        return _to_out(
            db,
            existing,
            current_user,
            current_user_id=int(current_user.id),
        )

    created = create_marketplace_request(
        payload=MarketplaceRequestCreate(
            clan_id=original.clan_id,
            title=original.title,
            description=_public_description(original),
            category=original.category,
            urgency=original.urgency,
            area=original.area,
            whatsapp_number=original.whatsapp_number,
            expires_in_hours=48,
            payment_mode=original.payment_mode,
            allow_trust_credit=bool(original.allow_trust_credit),
            allow_one_hop_relay=False,
            visibility_scope=_request_visibility_scope(original),
            show_sender_photo=False,
            client_request_id=payload.client_request_id,
        ),
        db=db,
        current_user=current_user,
    )
    reposted = db.get(MarketplaceRequest, int(created.id))
    if not reposted:
        raise HTTPException(status_code=500, detail="Repost was not saved.")
    reposted.reposted_from_request_id = int(original.id)
    original_audio = _request_audio(db, request_id=int(original.id))
    cloned_storage_key: str | None = None
    try:
        if original_audio:
            cloned_storage_key = clone_demand_audio(original_audio.storage_key)
            db.add(
                DemandAudioAttachment(
                    marketplace_request_id=int(reposted.id),
                    response_id=None,
                    storage_key=cloned_storage_key,
                    original_filename=original_audio.original_filename,
                    mime_type=original_audio.mime_type,
                    byte_size=original_audio.byte_size,
                    duration_seconds=original_audio.duration_seconds,
                    created_by_user_id=int(current_user.id),
                )
            )
        db.add(
            MarketplaceRequestActivity(
                marketplace_request_id=int(original.id),
                actor_user_id=int(current_user.id),
                event_type="reposted",
                detail=f"Posted again as request {int(reposted.id)}.",
            )
        )
        db.add(
            MarketplaceRequestActivity(
                marketplace_request_id=int(reposted.id),
                actor_user_id=int(current_user.id),
                event_type="repost_created",
                detail=f"Linked to request {int(original.id)}.",
            )
        )
        db.commit()
        db.refresh(reposted)
    except Exception:
        db.rollback()
        if cloned_storage_key:
            delete_demand_audio(cloned_storage_key)
        raise
    return _to_out(
        db,
        reposted,
        current_user,
        current_user_id=int(current_user.id),
    )
