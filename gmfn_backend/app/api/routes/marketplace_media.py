from __future__ import annotations

import os
import secrets
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Body, File, Form, HTTPException, UploadFile, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

router = APIRouter(prefix="/marketplace/media", tags=["marketplace-media"])

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = 15 * 1024 * 1024
MAX_VIDEO_DURATION_SECONDS = 10.0

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}

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

CONTENT_TYPE_ALIASES = {
    "image/jpg": "image/jpeg",
    "image/pjpeg": "image/jpeg",
    "image/x-png": "image/png",
}

GENERIC_CONTENT_TYPES = {"", "application/octet-stream", "binary/octet-stream"}


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


def _ensure_dirs() -> None:
    _image_upload_dir().mkdir(parents=True, exist_ok=True)
    _video_upload_dir().mkdir(parents=True, exist_ok=True)


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


def _max_bytes_for(media_type: str) -> int:
    return MAX_IMAGE_BYTES if media_type == "image" else MAX_VIDEO_BYTES


async def _read_limited_bytes(file: UploadFile, max_bytes: int) -> bytes:
    data = await file.read()
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File is too large. Maximum allowed is {max_bytes // (1024 * 1024)}MB.",
        )
    return data


class UploadUrlCreateIn(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    content_type: str = Field(min_length=1, max_length=120)
    media_type: str = Field(min_length=1, max_length=20)

    @field_validator("filename", "content_type", "media_type", mode="before")
    @classmethod
    def _reject_non_text_controls(cls, value: Any, info: Any) -> Any:
        return _reject_non_text_value(value, info.field_name)


@router.post("/upload-url")
async def create_marketplace_upload_url(
    payload: UploadUrlCreateIn,
    request: Request,
) -> Dict[str, Any]:
    _ensure_dirs()

    media_type = _validate_media_type(payload.media_type)
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


@router.put("/upload-direct/{kind}/{filename}")
async def upload_marketplace_file_direct(
    kind: str,
    filename: str,
    request: Request,
) -> Dict[str, Any]:
    _ensure_dirs()

    kind = str(kind or "").strip().lower()
    if kind not in {"images", "videos"}:
        raise HTTPException(status_code=400, detail="Invalid media path")

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
) -> Dict[str, Any]:
    _ensure_dirs()

    ext = _safe_ext(file.filename)
    content_type = _normalize_content_type(file.content_type)

    _validate_ext("image", ext)
    _validate_content_type("image", content_type, ext)

    data = await _read_limited_bytes(file, MAX_IMAGE_BYTES)
    if not data:
        raise HTTPException(status_code=400, detail="Image file is empty.")

    filename = _random_name(ext)
    filepath = _image_upload_dir() / filename
    filepath.write_bytes(data)

    return {
        "ok": True,
        "kind": "image",
        "filename": filename,
        "content_type": content_type,
        "size_bytes": len(data),
        "url": _public_url_for("images", filename),
        "clan_id": clan_id,
    }


@router.post("/video")
async def upload_marketplace_video(
    file: UploadFile = File(...),
    duration_seconds: Optional[float] = Form(default=None),
    clan_id: Optional[int] = Form(default=None),
) -> Dict[str, Any]:
    _ensure_dirs()

    ext = _safe_ext(file.filename)
    content_type = _normalize_content_type(file.content_type)

    _validate_ext("video", ext)
    _validate_content_type("video", content_type, ext)

    if duration_seconds is not None and float(duration_seconds) > MAX_VIDEO_DURATION_SECONDS:
        raise HTTPException(
            status_code=400,
            detail=f"Video must not be longer than {int(MAX_VIDEO_DURATION_SECONDS)} seconds.",
        )

    data = await _read_limited_bytes(file, MAX_VIDEO_BYTES)
    if not data:
        raise HTTPException(status_code=400, detail="Video file is empty.")

    filename = _random_name(ext)
    filepath = _video_upload_dir() / filename
    filepath.write_bytes(data)

    return {
        "ok": True,
        "kind": "video",
        "filename": filename,
        "content_type": content_type,
        "size_bytes": len(data),
        "duration_seconds": duration_seconds,
        "max_video_seconds": MAX_VIDEO_DURATION_SECONDS,
        "url": _public_url_for("videos", filename),
        "clan_id": clan_id,
    }


@router.get("/ping")
async def marketplace_media_ping() -> Dict[str, Any]:
    return {"ok": True, "message": "marketplace media router is active"}
