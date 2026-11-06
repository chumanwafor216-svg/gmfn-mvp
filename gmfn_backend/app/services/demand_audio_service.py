from __future__ import annotations

import os
import re
import shutil
import subprocess
from dataclasses import dataclass
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

import imageio_ffmpeg
from fastapi import HTTPException, UploadFile


MAX_DEMAND_AUDIO_BYTES = 8 * 1024 * 1024
MAX_DEMAND_AUDIO_SECONDS = 60.0
PRIVATE_DEMAND_AUDIO_DIRECTORY = ".private-demandbox"
PRIVATE_SHOP_VOICE_DIRECTORY = ".private-shop-voice"
PRIVATE_COMMUNITY_NOTICE_VOICE_DIRECTORY = ".private-community-notice-voice"
ALLOWED_AUDIO_TYPES = {
    "audio/aac": ".aac",
    "audio/m4a": ".m4a",
    "audio/mp4": ".m4a",
    "audio/mpeg": ".mp3",
    "audio/ogg": ".ogg",
    "audio/wav": ".wav",
    "audio/wave": ".wav",
    "audio/webm": ".webm",
    "audio/x-m4a": ".m4a",
    "audio/x-wav": ".wav",
}
_DURATION_PATTERN = re.compile(
    r"Duration:\s*(?P<hours>\d{2}):(?P<minutes>\d{2}):(?P<seconds>\d{2}(?:\.\d+)?)"
)
_DECODED_TIME_PATTERN = re.compile(
    r"time=\s*(?P<hours>\d{2}):(?P<minutes>\d{2}):(?P<seconds>\d{2}(?:\.\d+)?)"
)
_FORMAT_PATTERN = re.compile(r"Input #0,\s*(?P<formats>.+?),\s*from")
_EXPECTED_FORMATS = {
    "audio/aac": {"aac"},
    "audio/m4a": {"m4a", "mov", "mp4"},
    "audio/mp4": {"m4a", "mov", "mp4"},
    "audio/mpeg": {"mp3"},
    "audio/ogg": {"ogg"},
    "audio/wav": {"wav"},
    "audio/wave": {"wav"},
    "audio/webm": {"matroska", "webm"},
    "audio/x-m4a": {"m4a", "mov", "mp4"},
    "audio/x-wav": {"wav"},
}


@dataclass(frozen=True)
class StoredDemandAudio:
    storage_key: str
    original_filename: str | None
    mime_type: str
    byte_size: int
    duration_seconds: Decimal


def demand_audio_directory() -> Path:
    uploads_root = Path(
        str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "uploads").strip()
    ).expanduser()
    return uploads_root / PRIVATE_DEMAND_AUDIO_DIRECTORY


def shop_voice_directory() -> Path:
    uploads_root = Path(
        str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "uploads").strip()
    ).expanduser()
    return uploads_root / PRIVATE_SHOP_VOICE_DIRECTORY


def community_notice_voice_directory() -> Path:
    uploads_root = Path(
        str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "uploads").strip()
    ).expanduser()
    return uploads_root / PRIVATE_COMMUNITY_NOTICE_VOICE_DIRECTORY


def demand_audio_path(storage_key: str) -> Path:
    safe_name = Path(str(storage_key or "")).name
    if not safe_name or safe_name != str(storage_key or ""):
        raise HTTPException(status_code=404, detail="Voice note not found")
    return demand_audio_directory() / safe_name


def shop_voice_path(storage_key: str) -> Path:
    safe_name = Path(str(storage_key or "")).name
    if not safe_name or safe_name != str(storage_key or ""):
        raise HTTPException(status_code=404, detail="Voice note not found")
    return shop_voice_directory() / safe_name


def community_notice_voice_path(storage_key: str) -> Path:
    safe_name = Path(str(storage_key or "")).name
    if not safe_name or safe_name != str(storage_key or ""):
        raise HTTPException(status_code=404, detail="Voice note not found")
    return community_notice_voice_directory() / safe_name


def _verified_duration_seconds(path: Path, mime_type: str) -> float:
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
            detail="GSN could not verify this voice note. Try recording it again.",
        ) from exc

    output = f"{result.stdout}\n{result.stderr}"
    duration_matches = [
        *_DURATION_PATTERN.finditer(output),
        *_DECODED_TIME_PATTERN.finditer(output),
    ]
    format_match = _FORMAT_PATTERN.search(output)
    actual_formats = {
        value.strip().lower()
        for value in str(format_match.group("formats") if format_match else "").split(",")
        if value.strip()
    }
    expected_formats = _EXPECTED_FORMATS.get(mime_type, set())
    if (
        result.returncode != 0
        or not duration_matches
        or not actual_formats.intersection(expected_formats)
    ):
        raise HTTPException(
            status_code=400,
            detail="Use a playable MP3, M4A, AAC, WAV, OGG, or WebM voice note.",
        )
    duration = max(
        int(match.group("hours")) * 3600
        + int(match.group("minutes")) * 60
        + float(match.group("seconds"))
        for match in duration_matches
    )
    if duration <= 0:
        raise HTTPException(status_code=400, detail="The voice note is empty.")
    if duration > MAX_DEMAND_AUDIO_SECONDS:
        raise HTTPException(
            status_code=400,
            detail="Voice notes can be up to 60 seconds.",
        )
    return duration


async def store_demand_audio(upload: UploadFile) -> StoredDemandAudio:
    return await _store_audio(upload, directory=demand_audio_directory())


async def store_shop_voice(upload: UploadFile) -> StoredDemandAudio:
    return await _store_audio(upload, directory=shop_voice_directory())


async def store_community_notice_voice(upload: UploadFile) -> StoredDemandAudio:
    return await _store_audio(upload, directory=community_notice_voice_directory())


async def _store_audio(
    upload: UploadFile,
    *,
    directory: Path,
) -> StoredDemandAudio:
    mime_type = str(upload.content_type or "").split(";", 1)[0].strip().lower()
    suffix = ALLOWED_AUDIO_TYPES.get(mime_type)
    if not suffix:
        raise HTTPException(
            status_code=400,
            detail="Use an MP3, M4A, AAC, WAV, OGG, or WebM voice note.",
        )

    content = await upload.read(MAX_DEMAND_AUDIO_BYTES + 1)
    if not content:
        raise HTTPException(status_code=400, detail="The voice note is empty.")
    if len(content) > MAX_DEMAND_AUDIO_BYTES:
        raise HTTPException(
            status_code=400,
            detail="Voice notes must be smaller than 8 MB.",
        )

    directory.mkdir(parents=True, exist_ok=True)
    storage_key = f"{uuid4().hex}{suffix}"
    path = directory / storage_key
    path.write_bytes(content)
    try:
        duration = _verified_duration_seconds(path, mime_type)
    except Exception:
        path.unlink(missing_ok=True)
        raise

    return StoredDemandAudio(
        storage_key=storage_key,
        original_filename=Path(upload.filename).name if upload.filename else None,
        mime_type=mime_type,
        byte_size=len(content),
        duration_seconds=Decimal(str(round(duration, 2))),
    )


def delete_demand_audio(storage_key: str) -> None:
    demand_audio_path(storage_key).unlink(missing_ok=True)


def delete_shop_voice(storage_key: str) -> None:
    shop_voice_path(storage_key).unlink(missing_ok=True)


def delete_community_notice_voice(storage_key: str) -> None:
    community_notice_voice_path(storage_key).unlink(missing_ok=True)


def clone_demand_audio(storage_key: str) -> str:
    source = demand_audio_path(storage_key)
    if not source.is_file():
        raise HTTPException(status_code=409, detail="The original voice note is unavailable.")
    target_key = f"{uuid4().hex}{source.suffix.lower()}"
    target = demand_audio_directory() / target_key
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)
    return target_key
