from __future__ import annotations

import os
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

import imageio_ffmpeg
from fastapi import HTTPException, UploadFile


MAX_DEMAND_IMAGE_BYTES = 10 * 1024 * 1024
MAX_DEMAND_VIDEO_BYTES = 25 * 1024 * 1024
MAX_DEMAND_DOCUMENT_BYTES = 10 * 1024 * 1024
MAX_DEMAND_VIDEO_SECONDS = 30.0
PRIVATE_DEMAND_MEDIA_DIRECTORY = ".private-demandbox-media"
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
ALLOWED_VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}
ALLOWED_DOCUMENT_TYPES = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}
_DURATION_PATTERN = re.compile(
    r"Duration:\s*(?P<hours>\d{2}):(?P<minutes>\d{2}):(?P<seconds>\d{2}(?:\.\d+)?)"
)


@dataclass(frozen=True)
class StoredDemandMedia:
    storage_key: str
    original_filename: str | None
    mime_type: str
    byte_size: int
    duration_seconds: float | None


def demand_media_directory() -> Path:
    uploads_root = Path(
        str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "uploads").strip()
    ).expanduser()
    return uploads_root / PRIVATE_DEMAND_MEDIA_DIRECTORY


def demand_media_path(storage_key: str) -> Path:
    safe_name = Path(str(storage_key or "")).name
    if not safe_name or safe_name != str(storage_key or ""):
        raise HTTPException(status_code=404, detail="Media not found")
    return demand_media_directory() / safe_name


def validate_demand_media_link(value: str) -> str:
    link = str(value or "").strip()
    parsed = urlparse(link)
    if (
        len(link) > 2000
        or parsed.scheme not in {"http", "https"}
        or not parsed.netloc
        or parsed.username
        or parsed.password
        or any(ord(character) < 32 for character in link)
    ):
        raise HTTPException(status_code=400, detail="Enter a valid http or https link.")
    return link


async def store_demand_media(upload: UploadFile, *, kind: str) -> StoredDemandMedia:
    normalized_kind = str(kind or "").strip().lower()
    mime_type = str(upload.content_type or "").split(";", 1)[0].strip().lower()
    if normalized_kind == "image":
        suffix = ALLOWED_IMAGE_TYPES.get(mime_type)
        maximum = MAX_DEMAND_IMAGE_BYTES
    elif normalized_kind == "video":
        suffix = ALLOWED_VIDEO_TYPES.get(mime_type)
        maximum = MAX_DEMAND_VIDEO_BYTES
    elif normalized_kind == "document":
        suffix = ALLOWED_DOCUMENT_TYPES.get(mime_type)
        maximum = MAX_DEMAND_DOCUMENT_BYTES
    else:
        raise HTTPException(status_code=400, detail="Choose a photo, short video, or document.")
    if not suffix:
        raise HTTPException(
            status_code=400,
            detail="Use a JPG, PNG, WebP, MP4, WebM, MOV, PDF, TXT, DOC, or DOCX file.",
        )

    content = await upload.read(maximum + 1)
    if not content:
        raise HTTPException(status_code=400, detail="The attachment is empty.")
    if len(content) > maximum:
        raise HTTPException(
            status_code=400,
            detail=(
                "Photos must be smaller than 10 MB."
                if normalized_kind == "image"
                else "Videos must be smaller than 25 MB."
                if normalized_kind == "video"
                else "Documents must be smaller than 10 MB."
            ),
        )
    if normalized_kind == "image" and not _image_signature_matches(mime_type, content):
        raise HTTPException(status_code=400, detail="The photo file is not valid.")
    if normalized_kind == "document" and not _document_signature_matches(mime_type, content):
        raise HTTPException(status_code=400, detail="The document file is not valid.")

    directory = demand_media_directory()
    directory.mkdir(parents=True, exist_ok=True)
    storage_key = f"{uuid4().hex}{suffix}"
    path = directory / storage_key
    path.write_bytes(content)
    duration = None
    try:
        if normalized_kind == "video":
            duration = _verified_video_duration(path)
    except Exception:
        path.unlink(missing_ok=True)
        raise

    return StoredDemandMedia(
        storage_key=storage_key,
        original_filename=Path(upload.filename).name if upload.filename else None,
        mime_type=mime_type,
        byte_size=len(content),
        duration_seconds=duration,
    )


def _image_signature_matches(mime_type: str, content: bytes) -> bool:
    if mime_type == "image/jpeg":
        return content.startswith(b"\xff\xd8\xff")
    if mime_type == "image/png":
        return content.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/webp":
        return content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    return False


def _document_signature_matches(mime_type: str, content: bytes) -> bool:
    if mime_type == "application/pdf":
        return content.startswith(b"%PDF-")
    if mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return content.startswith(b"PK\x03\x04")
    if mime_type == "application/msword":
        return content.startswith(b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1")
    if mime_type == "text/plain":
        return b"\x00" not in content[:4096]
    return False


def _verified_video_duration(path: Path) -> float:
    try:
        result = subprocess.run(
            [
                imageio_ffmpeg.get_ffmpeg_exe(),
                "-hide_banner",
                "-nostdin",
                "-i",
                str(path),
                "-f",
                "null",
                "-",
            ],
            capture_output=True,
            text=True,
            timeout=20,
            check=False,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        raise HTTPException(
            status_code=400,
            detail="GSN could not verify this video. Try a shorter video.",
        ) from exc
    match = _DURATION_PATTERN.search(f"{result.stdout}\n{result.stderr}")
    if result.returncode != 0 or not match:
        raise HTTPException(status_code=400, detail="Use a playable short video.")
    duration = (
        int(match.group("hours")) * 3600
        + int(match.group("minutes")) * 60
        + float(match.group("seconds"))
    )
    if duration <= 0:
        raise HTTPException(status_code=400, detail="The video is empty.")
    if duration > MAX_DEMAND_VIDEO_SECONDS:
        raise HTTPException(status_code=400, detail="Videos can be up to 30 seconds.")
    return round(duration, 2)


def delete_demand_media(storage_key: str) -> None:
    demand_media_path(storage_key).unlink(missing_ok=True)
