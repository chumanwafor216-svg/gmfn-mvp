from __future__ import annotations

import os
import secrets
import shutil
from io import BytesIO
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from urllib.parse import urlsplit

from fastapi import APIRouter, Body, Depends, File, Form, HTTPException, UploadFile, Request
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.db.database import get_db
from app.db.models import ClanMembership, MarketplaceShop, User
from app.services.marketplace_media_quality_service import (
    MAX_NORMALIZED_VIDEO_BYTES,
    MAX_GSN_NATURAL_FINISH_BYTES,
    MAX_SOURCE_VIDEO_BYTES,
    MAX_VIDEO_ASPECT_RATIO,
    MAX_VIDEO_DURATION_SECONDS as QUALITY_MAX_VIDEO_DURATION_SECONDS,
    MIN_VIDEO_FPS,
    MIN_VIDEO_SHORT_EDGE,
    MediaQualityError,
    VideoFinishProfile,
    normalize_marketplace_image,
    normalize_marketplace_video,
    render_marketplace_image_reel,
)
from app.services.storage_service import StorageServiceError, create_presigned_upload

router = APIRouter(prefix="/marketplace/media", tags=["marketplace-media"])

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = MAX_NORMALIZED_VIDEO_BYTES
MAX_VIDEO_DURATION_SECONDS = QUALITY_MAX_VIDEO_DURATION_SECONDS
MAX_SOURCE_AUDIO_BYTES = 15 * 1024 * 1024

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}
ALLOWED_AUDIO_EXTENSIONS = {".mp3", ".m4a", ".aac", ".wav", ".ogg", ".webm"}

ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

ALLOWED_VIDEO_CONTENT_TYPES = {
    "video/mp4",
    "video/webm",
    "video/quicktime",
}

ALLOWED_AUDIO_CONTENT_TYPES = {
    "audio/mpeg",
    "audio/mp4",
    "audio/x-m4a",
    "audio/aac",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/webm",
}

CONTENT_TYPE_ALIASES = {
    "image/jpg": "image/jpeg",
    "image/pjpeg": "image/jpeg",
    "image/x-png": "image/png",
}

GENERIC_CONTENT_TYPES = {"", "application/octet-stream", "binary/octet-stream"}

IMAGE_FORMAT_EXTENSIONS = {
    "JPEG": {".jpg", ".jpeg"},
    "PNG": {".png"},
    "WEBP": {".webp"},
}


def _is_admin(user: Any) -> bool:
    return bool(getattr(user, "is_admin", False)) or str(getattr(user, "role", "") or "").strip().lower() == "admin"


def _is_community_admin(db: Session, *, clan_id: int, user_id: int) -> bool:
    membership = (
        db.query(ClanMembership)
        .filter(
            ClanMembership.clan_id == int(clan_id),
            ClanMembership.user_id == int(user_id),
            ClanMembership.left_at.is_(None),
        )
        .first()
    )
    return str(getattr(membership, "role", "") or "").strip().lower() == "admin"


def _reject_non_text_value(value: Any, field_name: str) -> Any:
    if value is None:
        return value
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be text.")
    return value


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _uploads_root() -> Path:
    raw = str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "").strip()
    return Path(raw or "uploads").expanduser()


def _base_upload_dir() -> Path:
    return _uploads_root() / "marketplace"


def _image_upload_dir() -> Path:
    return _base_upload_dir() / "images"


def _video_upload_dir() -> Path:
    return _base_upload_dir() / "videos"


def _video_processing_dir() -> Path:
    return _video_upload_dir() / ".processing"


def _ensure_dirs() -> None:
    _image_upload_dir().mkdir(parents=True, exist_ok=True)
    _video_upload_dir().mkdir(parents=True, exist_ok=True)
    _video_processing_dir().mkdir(parents=True, exist_ok=True)


def _safe_ext(filename: Optional[str]) -> str:
    if not filename:
        return ""
    return Path(filename).suffix.lower().strip()


def _random_name(ext: str) -> str:
    stamp = _now_utc().strftime("%Y%m%d%H%M%S")
    token = secrets.token_hex(8)
    return f"{stamp}_{token}{ext}"


def _public_url_for(kind: str, filename: str) -> str:
    return f"/uploads/marketplace/{kind}/{filename}"


def _upload_path_for(kind: str, filename: str) -> Path:
    if kind == "images":
        return _image_upload_dir() / filename
    if kind == "videos":
        return _video_upload_dir() / filename
    raise HTTPException(status_code=400, detail="Invalid media kind")


def _verified_shop_logo_path(value: Any) -> Path | None:
    path = urlsplit(str(value or '').strip()).path
    prefix = '/uploads/marketplace/images/'
    if not path.startswith(prefix):
        return None
    filename = Path(path).name
    if not filename or filename != path[len(prefix):]:
        return None
    root = _image_upload_dir().resolve()
    candidate = (root / filename).resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        return None
    return candidate if candidate.is_file() else None


def _validate_media_type(media_type: str) -> str:
    mt = str(media_type or "").strip().lower()
    if mt not in {"image", "video"}:
        raise HTTPException(status_code=400, detail="media_type must be 'image' or 'video'")
    return mt


def _normalize_content_type(content_type: str) -> str:
    ct = str(content_type or "").strip().lower()
    if ";" in ct:
        ct = ct.split(";", 1)[0].strip().lower()
    return CONTENT_TYPE_ALIASES.get(ct, ct)


def _validate_content_type(media_type: str, content_type: str, ext: str = "") -> None:
    ct = _normalize_content_type(content_type)

    if media_type == "image":
        if ct in GENERIC_CONTENT_TYPES and ext in ALLOWED_IMAGE_EXTENSIONS:
            return
        if ct not in ALLOWED_IMAGE_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Unsupported image content type.")
        return

    if media_type == "video":
        if ct in GENERIC_CONTENT_TYPES and ext in ALLOWED_VIDEO_EXTENSIONS:
            return
        if ct not in ALLOWED_VIDEO_CONTENT_TYPES:
            raise HTTPException(status_code=400, detail="Unsupported video content type.")
        return


def _validate_ext(media_type: str, ext: str) -> None:
    if media_type == "image":
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Unsupported image format. Use jpg, jpeg, png, or webp.",
            )
        return

    if media_type == "video":
        if ext not in ALLOWED_VIDEO_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Unsupported video format. Use mp4, webm, or mov.",
            )
        return


def _validate_decodable_image(data: bytes, *, ext: str) -> None:
    try:
        with Image.open(BytesIO(data)) as image:
            detected_format = str(image.format or "").strip().upper()
            image.verify()
    except (Image.DecompressionBombError, UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status_code=400,
            detail={
                "code": "invalid_image_file",
                "message": "This picture could not be read. Choose a valid JPG, PNG, or WebP image.",
            },
        )

    expected_extensions = IMAGE_FORMAT_EXTENSIONS.get(detected_format)
    if expected_extensions is None or ext not in expected_extensions:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "image_format_mismatch",
                "message": "The picture contents do not match its file extension.",
            },
        )


def _max_bytes_for(media_type: str) -> int:
    return MAX_IMAGE_BYTES if media_type == "image" else MAX_VIDEO_BYTES


async def _read_limited_bytes(file: UploadFile, max_bytes: int) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"File is too large. Maximum allowed is {max_bytes // (1024 * 1024)}MB.",
            )
        chunks.append(chunk)
    return b"".join(chunks)


async def _write_limited_upload(
    file: UploadFile,
    destination: Path,
    max_bytes: int,
    *,
    file_label: str = "source video",
) -> int:
    # Stream a large phone upload to disk instead of holding it in RAM.
    total = 0
    try:
        with destination.open("wb") as stream:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"This {file_label} is too large for automatic preparation. "
                            f"Choose a file up to {max_bytes // (1024 * 1024)}MB."
                        ),
                    )
                stream.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    return total


class UploadUrlCreateIn(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str = Field(min_length=1, max_length=120)
    media_type: str = Field(min_length=1, max_length=20)

    @field_validator("filename", "content_type", "media_type", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


class R2UploadUrlCreateIn(UploadUrlCreateIn):
    clan_id: Optional[int] = Field(default=None, ge=1)
    expires: int = Field(default=600, ge=60, le=3600)


@router.post("/upload-url")
async def create_marketplace_upload_url(
    payload: UploadUrlCreateIn,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _ensure_dirs()

    media_type = _validate_media_type(payload.media_type)
    if media_type == "video":
        raise HTTPException(
            status_code=400,
            detail={
                "code": "verified_video_upload_required",
                "message": "Videos must use the verified GSN video upload so quality, duration, and format can be checked.",
            },
        )
    ext = _safe_ext(payload.filename)
    content_type = _normalize_content_type(payload.content_type)

    _validate_ext(media_type, ext)
    _validate_content_type(media_type, content_type, ext)

    generated_name = _random_name(ext)
    kind = "images" if media_type == "image" else "videos"

    base = str(request.base_url).rstrip("/")
    upload_url = f"{base}/marketplace/media/upload-direct/{kind}/{generated_name}"
    public_url = _public_url_for(kind, generated_name)

    return {
        "ok": True,
        "media_type": media_type,
        "object_key": f"marketplace/{kind}/{generated_name}",
        "upload_url": upload_url,
        "public_url": public_url,
        "max_bytes": _max_bytes_for(media_type),
    }


@router.post("/r2-upload-url")
async def create_marketplace_r2_upload_url(
    payload: R2UploadUrlCreateIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    current_user_id = int(getattr(current_user, "id", 0) or 0)
    use_community_credit_account = False
    if not _is_admin(current_user):
        if payload.clan_id is None:
            raise HTTPException(status_code=403, detail="Community R2 upload URL creation requires a community id and community admin access.")
        if not _is_community_admin(db, clan_id=int(payload.clan_id), user_id=current_user_id):
            raise HTTPException(status_code=403, detail="Community admin access required for community R2 upload spending.")
        use_community_credit_account = True

    media_type = _validate_media_type(payload.media_type)
    if media_type == "video":
        raise HTTPException(
            status_code=400,
            detail={
                "code": "verified_video_upload_required",
                "message": "Direct R2 video upload is unavailable until it passes the same GSN quality gate.",
            },
        )
    ext = _safe_ext(payload.filename)
    content_type = _normalize_content_type(payload.content_type)

    _validate_ext(media_type, ext)
    _validate_content_type(media_type, content_type, ext)

    generated_name = _random_name(ext)
    kind = "images" if media_type == "image" else "videos"
    object_key = f"marketplace/{kind}/{generated_name}"

    try:
        result = create_presigned_upload(
            db=db,
            object_key=object_key,
            content_type=content_type,
            expires=int(payload.expires or 600),
            reference_type="marketplace_media_r2_upload",
            reference_id=object_key,
            clan_id=payload.clan_id,
            user_id=current_user_id or None,
            pipeline_credit_owner_type="community" if use_community_credit_account else None,
            meta={
                "media_type": media_type,
                "filename": payload.filename,
                "route": "/marketplace/media/r2-upload-url",
            },
        )
    except StorageServiceError as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "r2_upload_unavailable",
                "message": str(exc),
                "boundary": "No R2 upload URL is issued unless storage config and Pipeline Credit spend gate both pass.",
            },
        ) from exc

    return {
        "ok": True,
        "storage_provider": "cloudflare_r2",
        "media_type": media_type,
        "object_key": result["object_key"],
        "upload_url": result["upload_url"],
        "public_url": result["public_url"],
        "max_bytes": _max_bytes_for(media_type),
        "pipeline_credit_gate": result.get("pipeline_credit_gate"),
        "spend_account_scope": "community" if use_community_credit_account else "configured_provider_account",
        "boundary": "This legacy presigned route does not migrate existing local upload routes and does not provide the verified GSN image finish. Current product screens must use the authenticated /marketplace/media/image route.",
    }


@router.put("/upload-direct/{kind}/{filename}")
async def upload_marketplace_file_direct(
    kind: str,
    filename: str,
    request: Request,
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _ensure_dirs()

    kind = str(kind or "").strip().lower()
    if kind not in {"images", "videos"}:
        raise HTTPException(status_code=400, detail="Invalid media path")
    if kind == "videos":
        raise HTTPException(
            status_code=400,
            detail={
                "code": "verified_video_upload_required",
                "message": "Direct video upload cannot bypass the GSN quality gate.",
            },
        )

    ext = _safe_ext(filename)
    media_type = "image" if kind == "images" else "video"

    _validate_ext(media_type, ext)

    content_type = _normalize_content_type(request.headers.get("content-type"))
    _validate_content_type(media_type, content_type, ext)

    raw = await request.body()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    max_bytes = _max_bytes_for(media_type)
    if len(raw) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File is too large. Maximum allowed is {max_bytes // (1024 * 1024)}MB.",
        )

    if media_type == "image":
        _validate_decodable_image(raw, ext=ext)

    filepath = _upload_path_for(kind, filename)
    filepath.write_bytes(raw)

    return {
        "ok": True,
        "kind": kind[:-1],
        "filename": filename,
        "content_type": content_type,
        "size_bytes": len(raw),
        "url": _public_url_for(kind, filename),
    }


@router.post("/image")
async def upload_marketplace_image(
    file: UploadFile = File(...),
    clan_id: Optional[int] = Form(default=None),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    _ensure_dirs()

    ext = _safe_ext(file.filename)
    content_type = _normalize_content_type(file.content_type)

    _validate_ext("image", ext)
    _validate_content_type("image", content_type, ext)

    data = await _read_limited_bytes(file, MAX_IMAGE_BYTES)
    if not data:
        raise HTTPException(status_code=400, detail="Image file is empty.")

    _validate_decodable_image(data, ext=ext)

    temporary_path = _image_upload_dir() / f".{_random_name('.processing')}"
    try:
        normalized = normalize_marketplace_image(data, temporary_path)
    except MediaQualityError as exc:
        temporary_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail={"code": exc.code, "message": str(exc)},
        ) from exc
    filename = f"qi1_{_random_name(normalized.extension)}"
    filepath = _image_upload_dir() / filename
    temporary_path.replace(filepath)

    return {
        "ok": True,
        "kind": "image",
        "filename": filename,
        "content_type": normalized.content_type,
        "size_bytes": normalized.size_bytes,
        "url": _public_url_for("images", filename),
        "clan_id": clan_id,
        "quality_verified": True,
        "finish": "gsn_clear",
        "preparation": normalized.as_dict(),
        "boundary": "GSN applied a conservative non-generative finish; it did not invent detail or change product identity.",
    }


@router.post("/image-reel")
async def create_marketplace_image_reel(
    file: UploadFile = File(...),
    clan_id: Optional[int] = Form(default=None),
    duration_seconds: int = Form(default=10),
    shop_id: int = Form(...),
    title: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Create a reviewed short Reel from one owner-selected shop picture."""

    _ensure_dirs()
    if duration_seconds not in {5, 10}:
        raise HTTPException(status_code=400, detail="Choose a 5-second or 10-second GSN Reel.")

    selected_shop = db.query(MarketplaceShop).filter(MarketplaceShop.id == int(shop_id)).first()
    if selected_shop is None:
        raise HTTPException(status_code=404, detail="Shop not found.")
    if int(selected_shop.owner_user_id) != int(current_user.id) and not _is_admin(current_user):
        raise HTTPException(status_code=403, detail="You can only create a Reel for a shop you own.")

    ext = _safe_ext(file.filename)
    content_type = _normalize_content_type(file.content_type)
    _validate_ext("image", ext)
    _validate_content_type("image", content_type, ext)

    data = await _read_limited_bytes(file, MAX_IMAGE_BYTES)
    if not data:
        raise HTTPException(status_code=400, detail="Image file is empty.")
    _validate_decodable_image(data, ext=ext)

    processing_token = secrets.token_hex(8)
    prepared_image_path = _video_processing_dir() / f"{processing_token}.source"
    output_path = _video_processing_dir() / f"{processing_token}.image-reel.mp4"
    filename = f"qv1_{_random_name('.mp4')}"
    filepath = _video_upload_dir() / filename
    finish = VideoFinishProfile(
        duration_seconds=int(duration_seconds),
        brand_name=str(selected_shop.name or "").strip()[:120],
        title=" ".join(str(title or "").split())[:80],
        public_contact=str(selected_shop.whatsapp_number or "").strip()[:32],
        logo_path=_verified_shop_logo_path(selected_shop.image_url),
    )

    try:
        prepared_image = normalize_marketplace_image(data, prepared_image_path)
        reel = render_marketplace_image_reel(
            prepared_image_path,
            output_path,
            finish_profile=finish,
        )
        shutil.move(str(output_path), str(filepath))
    except MediaQualityError as exc:
        raise HTTPException(
            status_code=400,
            detail={"code": exc.code, "message": str(exc)},
        ) from exc
    finally:
        prepared_image_path.unlink(missing_ok=True)
        output_path.unlink(missing_ok=True)
        output_path.with_suffix(".reel-frame.jpg").unlink(missing_ok=True)
        output_path.with_suffix(".overlay.png").unlink(missing_ok=True)

    return {
        "ok": True,
        "kind": "video",
        "source_kind": "image",
        "filename": filename,
        "content_type": "video/mp4",
        "size_bytes": int(reel.size_bytes),
        "source_size_bytes": len(data),
        "duration_seconds": reel.output.duration_seconds,
        "quality_verified": True,
        "quality": reel.as_dict(),
        "url": _public_url_for("videos", filename),
        "clan_id": clan_id,
        "finish": {
            "profile": "gsn_natural",
            "duration_seconds": int(finish.duration_seconds),
            "brand_name": finish.brand_name,
            "title": finish.title,
            "public_contact_present": bool(finish.public_contact),
            "logo_applied": bool(finish.logo_path),
            "max_output_bytes": MAX_GSN_NATURAL_FINISH_BYTES,
        },
        "sound": {
            "added": False,
            "output_has_audio": False,
        },
        "preparation": {
            "source_image": prepared_image.as_dict(),
            "motion": "gentle_camera_push",
            "truth_boundary": "Presentation only: GSN contained the selected picture without product crop, added a subtle camera push and attribution, and did not invent or repair product detail.",
        },
    }


@router.post("/video")
async def upload_marketplace_video(
    file: UploadFile = File(...),
    sound_file: Optional[UploadFile] = File(default=None),
    sound_mode: Optional[str] = Form(default=None),
    sound_rights_confirmed: bool = Form(default=False),
    duration_seconds: Optional[float] = Form(default=None),
    clan_id: Optional[int] = Form(default=None),
    finish_profile: Optional[str] = Form(default=None),
    finish_duration_seconds: Optional[int] = Form(default=None),
    finish_shop_id: Optional[int] = Form(default=None),
    finish_title: Optional[str] = Form(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    _ensure_dirs()

    ext = _safe_ext(file.filename)
    content_type = _normalize_content_type(file.content_type)

    _validate_ext("video", ext)
    _validate_content_type("video", content_type, ext)

    selected_sound_mode = str(sound_mode or "").strip().lower() or None
    sound_ext = _safe_ext(sound_file.filename) if sound_file is not None else ""
    if sound_file is not None:
        if selected_sound_mode not in {"mix", "replace"}:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "sound_mode_invalid",
                    "message": "Choose Add over video or Replace video sound.",
                },
            )
        if not sound_rights_confirmed:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "sound_rights_confirmation_required",
                    "message": "Confirm that you created this sound or have permission to use it.",
                },
            )
        if sound_ext not in ALLOWED_AUDIO_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "sound_format_unsupported",
                    "message": "Use MP3, M4A, AAC, WAV, OGG, or WebM audio.",
                },
            )
        sound_content_type = _normalize_content_type(sound_file.content_type)
        if not (
            sound_content_type in ALLOWED_AUDIO_CONTENT_TYPES
            or sound_content_type in GENERIC_CONTENT_TYPES
        ):
            raise HTTPException(
                status_code=400,
                detail={
                    "code": "sound_content_type_unsupported",
                    "message": "The selected file is not a supported audio file.",
                },
            )
    elif selected_sound_mode is not None or sound_rights_confirmed:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "sound_file_required",
                "message": "Choose or record a sound before adding sound settings.",
            },
        )

    selected_finish: VideoFinishProfile | None = None
    selected_shop: MarketplaceShop | None = None
    profile_name = str(finish_profile or '').strip().lower()
    if profile_name:
        if profile_name != 'gsn_natural':
            raise HTTPException(status_code=400, detail='Unknown video finish profile.')
        if finish_duration_seconds not in {5, 10}:
            raise HTTPException(status_code=400, detail='Choose a 5-second or 10-second GSN finish.')
        if not finish_shop_id:
            raise HTTPException(status_code=400, detail='A seller shop is required for the GSN finish.')
        selected_shop = db.query(MarketplaceShop).filter(MarketplaceShop.id == int(finish_shop_id)).first()
        if selected_shop is None:
            raise HTTPException(status_code=404, detail='Shop not found.')
        if int(selected_shop.owner_user_id) != int(current_user.id) and not _is_admin(current_user):
            raise HTTPException(status_code=403, detail='You can only finish video for a shop you own.')
        selected_finish = VideoFinishProfile(
            duration_seconds=int(finish_duration_seconds),
            brand_name=str(selected_shop.name or '').strip()[:120],
            title=' '.join(str(finish_title or '').split())[:80],
            public_contact=str(selected_shop.whatsapp_number or '').strip()[:32],
            logo_path=_verified_shop_logo_path(selected_shop.image_url),
        )

    processing_token = secrets.token_hex(8)
    input_path = _video_processing_dir() / f"{processing_token}.source{ext}"
    sound_input_path = (
        _video_processing_dir() / f"{processing_token}.sound{sound_ext}"
        if sound_file is not None
        else None
    )
    output_path = _video_processing_dir() / f"{processing_token}.normalized.mp4"
    filename = f"qv1_{_random_name('.mp4')}"
    filepath = _video_upload_dir() / filename

    try:
        source_size_bytes = await _write_limited_upload(
            file,
            input_path,
            MAX_SOURCE_VIDEO_BYTES,
        )
        if source_size_bytes <= 0:
            raise HTTPException(status_code=400, detail="Video file is empty.")
        if sound_file is not None and sound_input_path is not None:
            sound_size_bytes = await _write_limited_upload(
                sound_file,
                sound_input_path,
                MAX_SOURCE_AUDIO_BYTES,
                file_label="sound file",
            )
            if sound_size_bytes <= 0:
                raise HTTPException(status_code=400, detail="Sound file is empty.")
        normalized = normalize_marketplace_video(
            input_path,
            output_path,
            finish_profile=selected_finish,
            sound_path=sound_input_path,
            sound_mode=selected_sound_mode,
        )
        shutil.move(str(output_path), str(filepath))
    except MediaQualityError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "code": exc.code,
                "message": str(exc),
                "standard": {
                    "minimum_short_edge": MIN_VIDEO_SHORT_EDGE,
                    "minimum_fps": MIN_VIDEO_FPS,
                    "maximum_aspect_ratio": MAX_VIDEO_ASPECT_RATIO,
                    "maximum_public_seconds": int(MAX_VIDEO_DURATION_SECONDS),
                    "output_format": "MP4",
                },
            },
        ) from exc
    finally:
        input_path.unlink(missing_ok=True)
        if sound_input_path is not None:
            sound_input_path.unlink(missing_ok=True)
        output_path.unlink(missing_ok=True)
        output_path.with_suffix('.overlay.png').unlink(missing_ok=True)

    return {
        "ok": True,
        "kind": "video",
        "filename": filename,
        "content_type": "video/mp4",
        "size_bytes": int(normalized.size_bytes),
        "source_size_bytes": source_size_bytes,
        "max_source_bytes": MAX_SOURCE_VIDEO_BYTES,
        "duration_seconds": normalized.output.duration_seconds,
        "source_duration_seconds": normalized.source.duration_seconds,
        "max_video_seconds": MAX_VIDEO_DURATION_SECONDS,
        "trimmed": normalized.trimmed,
        "quality_verified": True,
        "quality": normalized.as_dict(),
        "visual_preparation": {
            "profile": normalized.visual_preparation,
            "truth_boundary": "Conservative non-generative preparation only; GSN does not invent detail or change product identity or condition.",
        },
        "url": _public_url_for("videos", filename),
        "clan_id": clan_id,
        "finish": (
            {
                "profile": "gsn_natural",
                "duration_seconds": int(selected_finish.duration_seconds),
                "brand_name": selected_finish.brand_name,
                "title": selected_finish.title,
                "public_contact_present": bool(selected_finish.public_contact),
                "logo_applied": bool(selected_finish.logo_path),
                "max_output_bytes": MAX_GSN_NATURAL_FINISH_BYTES,
                "truth_boundary": "Presentation only: GSN does not certify the product or alter its claimed condition.",
            }
            if selected_finish is not None
            else None
        ),
        "sound": {
            "added": normalized.added_sound,
            "mode": normalized.sound_mode,
            "output_has_audio": normalized.output_has_audio,
            "rights_confirmed": bool(sound_file is not None and sound_rights_confirmed),
        },
    }


@router.get("/ping")
async def marketplace_media_ping() -> Dict[str, Any]:
    return {"ok": True, "message": "marketplace media router is active"}
