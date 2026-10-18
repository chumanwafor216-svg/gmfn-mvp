from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path

import imageio_ffmpeg
import pytest
from fastapi import HTTPException

from app.api.routes.marketplace_media import _read_limited_bytes
from app.api.routes.marketplace import _require_verified_marketplace_video
from app.services.marketplace_media_quality_service import (
    MAX_VIDEO_DURATION_SECONDS,
    MediaQualityError,
    inspect_video,
    is_verified_marketplace_video_url,
    normalize_marketplace_video,
)


class _ChunkedUpload:
    def __init__(self, chunks: list[bytes]) -> None:
        self.chunks = list(chunks)
        self.read_sizes: list[int] = []

    async def read(self, size: int) -> bytes:
        self.read_sizes.append(size)
        return self.chunks.pop(0) if self.chunks else b""


def _make_video(
    path: Path,
    *,
    size: str = "1280x720",
    fps: int = 24,
    seconds: float = 2,
    with_audio: bool = False,
) -> Path:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        ffmpeg,
        "-y",
        "-nostdin",
        "-v",
        "error",
        "-f",
        "lavfi",
        "-i",
        f"color=c=navy:s={size}:r={fps}",
    ]
    if with_audio:
        command.extend(
            [
                "-f",
                "lavfi",
                "-i",
                "sine=frequency=880:sample_rate=44100",
            ]
        )
    command.extend(
        [
            "-t",
            str(seconds),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
        ]
    )
    if with_audio:
        command.extend(["-c:a", "aac"])
    command.append(str(path))
    subprocess.run(command, check=True, capture_output=True, timeout=45)
    return path


def test_quality_gate_rejects_video_below_720p(tmp_path: Path):
    source = _make_video(tmp_path / "low.mp4", size="640x360")

    with pytest.raises(MediaQualityError) as exc_info:
        inspect_video(source)

    assert exc_info.value.code == "video_resolution_too_low"
    assert "720p" in str(exc_info.value)


def test_quality_gate_rejects_extra_wide_video(tmp_path: Path):
    source = _make_video(tmp_path / "wide.mp4", size="1920x720")

    with pytest.raises(MediaQualityError) as exc_info:
        inspect_video(source)

    assert exc_info.value.code == "video_shape_unsupported"


def test_normalizer_physically_trims_and_standardises_video(tmp_path: Path):
    source = _make_video(
        tmp_path / "long-source.mp4",
        seconds=12,
        with_audio=True,
    )
    output = tmp_path / "qv1_output.mp4"

    result = normalize_marketplace_video(source, output)

    assert output.is_file()
    assert result.trimmed is True
    assert result.source_had_audio is True
    assert result.source.duration_seconds >= 11.9
    assert result.output.duration_seconds <= MAX_VIDEO_DURATION_SECONDS + 0.1
    assert result.output.short_edge >= 720
    assert result.output.fps >= 20
    assert result.output.codec == "h264"
    assert result.size_bytes == output.stat().st_size


def test_verified_video_url_requires_qv1_managed_file(
    tmp_path: Path,
    monkeypatch,
):
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(tmp_path))
    video_dir = tmp_path / "marketplace" / "videos"
    video_dir.mkdir(parents=True)
    verified = video_dir / "qv1_example.mp4"
    legacy = video_dir / "legacy.mp4"
    verified.write_bytes(b"verified-placeholder")
    legacy.write_bytes(b"legacy-placeholder")

    assert is_verified_marketplace_video_url(
        "/uploads/marketplace/videos/qv1_example.mp4"
    )
    assert not is_verified_marketplace_video_url(
        "/uploads/marketplace/videos/legacy.mp4"
    )
    assert not is_verified_marketplace_video_url("https://example.com/video.mp4")


def test_new_publication_rejects_unverified_url_but_preserves_same_legacy_value():
    with pytest.raises(HTTPException) as exc_info:
        _require_verified_marketplace_video("https://example.com/new.mp4")

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail["code"] == "verified_video_required"
    assert (
        _require_verified_marketplace_video(
            "https://example.com/existing.mp4",
            allowed_legacy_values=("https://example.com/existing.mp4",),
        )
        == "https://example.com/existing.mp4"
    )


def test_video_upload_is_server_verified_and_ignores_claimed_short_duration(
    client,
    override_current_user,
    monkeypatch,
    tmp_path: Path,
):
    upload_root = tmp_path / "uploads"
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(upload_root))
    source = _make_video(
        tmp_path / "claimed-short.mp4",
        seconds=12,
        with_audio=True,
    )

    with source.open("rb") as stream:
        response = client.post(
            "/marketplace/media/video",
            data={"duration_seconds": "1"},
            files={"file": ("claimed-short.mp4", stream, "video/mp4")},
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["quality_verified"] is True
    assert body["trimmed"] is True
    assert body["source_duration_seconds"] >= 11.9
    assert body["duration_seconds"] <= MAX_VIDEO_DURATION_SECONDS + 0.1
    assert body["content_type"] == "video/mp4"
    assert body["filename"].startswith("qv1_")
    assert body["filename"].endswith(".mp4")
    assert (upload_root / "marketplace" / "videos" / body["filename"]).is_file()


def test_legacy_direct_video_upload_contract_is_closed(
    client,
    override_current_user,
):
    response = client.post(
        "/marketplace/media/upload-url",
        json={
            "filename": "bypass.mp4",
            "content_type": "video/mp4",
            "media_type": "video",
        },
    )

    assert response.status_code == 400, response.text
    assert response.json()["detail"]["code"] == "verified_video_upload_required"


def test_upload_limit_stops_reading_after_the_limit_is_crossed():
    upload = _ChunkedUpload([b"aa", b"bb", b"should-not-be-read"])

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_read_limited_bytes(upload, 3))

    assert exc_info.value.status_code == 400
    assert len(upload.read_sizes) == 2
    assert upload.chunks == [b"should-not-be-read"]
