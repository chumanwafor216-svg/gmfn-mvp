from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from types import SimpleNamespace

import imageio_ffmpeg
import pytest
from fastapi import HTTPException

from app.api.routes.marketplace_media import _read_limited_bytes, _write_limited_upload
from app.api.routes.marketplace import _require_verified_marketplace_video
from app.services.marketplace_media_quality_service import (
    FFMPEG_THREAD_LIMIT,
    MAX_GSN_NATURAL_FINISH_BYTES,
    MAX_NORMALIZED_VIDEO_BYTES,
    MAX_SOURCE_VIDEO_BYTES,
    MAX_VIDEO_DURATION_SECONDS,
    MIN_VIDEO_SHORT_EDGE,
    MediaQualityError,
    VideoFinishProfile,
    VideoInspection,
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


def test_quality_gate_rejects_only_genuinely_tiny_video(tmp_path: Path):
    source = _make_video(tmp_path / "low.mp4", size="568x320")

    with pytest.raises(MediaQualityError) as exc_info:
        inspect_video(source)

    assert exc_info.value.code == "video_resolution_too_low"
    assert "too small" in str(exc_info.value)


def test_quality_gate_accepts_usable_576x1296_social_portrait(tmp_path: Path):
    source = _make_video(tmp_path / "social-portrait.mp4", size="576x1296")
    output = tmp_path / "qv1_social_portrait.mp4"

    inspection = inspect_video(source)
    result = normalize_marketplace_video(source, output)

    assert inspection.width == 576
    assert inspection.height == 1296
    assert inspection.short_edge >= MIN_VIDEO_SHORT_EDGE
    assert output.is_file()
    assert result.output.short_edge >= MIN_VIDEO_SHORT_EDGE
    assert result.output.long_edge <= 1280


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
    assert result.output.short_edge >= MIN_VIDEO_SHORT_EDGE
    assert result.output.fps >= 20
    assert result.output.codec == "h264"
    assert result.size_bytes == output.stat().st_size


def test_gsn_natural_finish_is_bounded_branded_profile(tmp_path: Path):
    source = _make_video(tmp_path / 'seller.mp4', seconds=7, with_audio=True)
    output = tmp_path / 'qv1_finished.mp4'

    result = normalize_marketplace_video(
        source,
        output,
        finish_profile=VideoFinishProfile(
            duration_seconds=5,
            brand_name='Ada Home Foods',
            title='Fresh soup packs',
            public_contact='+234 800 000 0000',
        ),
    )

    assert output.is_file()
    assert result.finish_profile == 'gsn_natural'
    assert result.trimmed is True
    assert result.output.duration_seconds <= 5.35
    assert result.size_bytes <= MAX_GSN_NATURAL_FINISH_BYTES


def test_normalizer_caps_decoder_filter_and_encoder_threads(
    tmp_path: Path,
    monkeypatch,
):
    source = tmp_path / "source.mp4"
    output = tmp_path / "qv1_output.mp4"
    source.write_bytes(b"source")
    source_inspection = VideoInspection(
        width=576,
        height=1296,
        fps=30.0,
        duration_seconds=8.0,
        codec="h264",
    )
    output_inspection = VideoInspection(
        width=568,
        height=1280,
        fps=30.0,
        duration_seconds=8.0,
        codec="h264",
    )
    commands: list[list[str]] = []

    def fake_inspect(path, **_kwargs):
        return output_inspection if Path(path) == output else source_inspection

    def fake_run(command, **_kwargs):
        commands.append(command)
        if "-c:v" in command:
            Path(command[-1]).write_bytes(b"normalised")
            return SimpleNamespace(returncode=0, stderr="")
        return SimpleNamespace(returncode=1, stderr="")

    monkeypatch.setattr(
        "app.services.marketplace_media_quality_service.inspect_video",
        fake_inspect,
    )
    monkeypatch.setattr(
        "app.services.marketplace_media_quality_service.imageio_ffmpeg.get_ffmpeg_exe",
        lambda: "ffmpeg",
    )
    monkeypatch.setattr(
        "app.services.marketplace_media_quality_service.subprocess.run",
        fake_run,
    )

    normalize_marketplace_video(source, output)

    encode_command = next(command for command in commands if "-c:v" in command)
    input_index = encode_command.index("-i")
    codec_index = encode_command.index("-c:v")
    thread_indexes = [
        index for index, value in enumerate(encode_command) if value == "-threads"
    ]
    assert len(thread_indexes) == 2
    assert thread_indexes[0] < input_index
    assert thread_indexes[1] > codec_index
    assert all(
        encode_command[index + 1] == str(FFMPEG_THREAD_LIMIT)
        for index in thread_indexes
    )
    filter_index = encode_command.index("-filter_threads")
    assert filter_index < input_index
    assert encode_command[filter_index + 1] == str(FFMPEG_THREAD_LIMIT)
    x264_index = encode_command.index("-x264-params")
    assert encode_command[x264_index + 1] == "threads=1:lookahead_threads=1"


def test_normalizer_defers_unreliable_source_duration_until_output_is_verified(
    tmp_path: Path,
    monkeypatch,
):
    source = _make_video(tmp_path / "social-download.mp4", seconds=2)
    output = tmp_path / "qv1_social_download.mp4"
    real_read_frames = imageio_ffmpeg.read_frames

    def read_frames_with_unknown_source_duration(path, *args, **kwargs):
        reader = real_read_frames(path, *args, **kwargs)
        metadata = next(reader)
        if Path(path) == source:
            metadata = {**metadata, "duration": 0}

        def wrapped_reader():
            try:
                yield metadata
            finally:
                reader.close()

        return wrapped_reader()

    monkeypatch.setattr(
        "app.services.marketplace_media_quality_service.imageio_ffmpeg.read_frames",
        read_frames_with_unknown_source_duration,
    )

    result = normalize_marketplace_video(source, output)

    assert output.is_file()
    assert result.source.duration_seconds == 0
    assert result.output.duration_seconds >= 1
    assert result.kept_seconds >= 1


def test_normalizer_still_rejects_a_genuinely_subsecond_output(tmp_path: Path):
    source = _make_video(tmp_path / "too-short.mp4", seconds=0.4)
    output = tmp_path / "qv1_too_short.mp4"

    with pytest.raises(MediaQualityError) as exc_info:
        normalize_marketplace_video(source, output)

    assert exc_info.value.code == "video_too_short"


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
    assert body["finish"] is None
    assert body["filename"].startswith("qv1_")
    assert body["filename"].endswith(".mp4")
    assert (upload_root / "marketplace" / "videos" / body["filename"]).is_file()


def test_video_upload_accepts_source_above_published_limit_and_reduces_it(
    client,
    override_current_user,
    monkeypatch,
    tmp_path: Path,
):
    upload_root = tmp_path / "uploads"
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(upload_root))
    source = _make_video(
        tmp_path / "large-phone-source.mp4",
        seconds=12,
        with_audio=True,
    )
    with source.open("ab") as stream:
        stream.write(b"\0" * (MAX_NORMALIZED_VIDEO_BYTES + 1))

    assert source.stat().st_size > MAX_NORMALIZED_VIDEO_BYTES
    assert source.stat().st_size < MAX_SOURCE_VIDEO_BYTES

    with source.open("rb") as stream:
        response = client.post(
            "/marketplace/media/video",
            files={"file": ("large-phone-source.mp4", stream, "video/mp4")},
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["source_size_bytes"] > MAX_NORMALIZED_VIDEO_BYTES
    assert body["size_bytes"] <= MAX_NORMALIZED_VIDEO_BYTES
    assert body["max_source_bytes"] == MAX_SOURCE_VIDEO_BYTES
    assert body["trimmed"] is True


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


def test_large_upload_stream_limit_removes_partial_file(tmp_path: Path):
    upload = _ChunkedUpload([b"aa", b"bb", b"should-not-be-read"])
    destination = tmp_path / "partial.source.mp4"

    with pytest.raises(HTTPException) as exc_info:
        asyncio.run(_write_limited_upload(upload, destination, 3))

    assert exc_info.value.status_code == 400
    assert not destination.exists()
    assert len(upload.read_sizes) == 2
    assert upload.chunks == [b"should-not-be-read"]
