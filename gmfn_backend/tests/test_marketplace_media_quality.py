from __future__ import annotations

import asyncio
import subprocess
from io import BytesIO
from pathlib import Path
from types import SimpleNamespace

import imageio_ffmpeg
import pytest
from fastapi import HTTPException
from PIL import Image

from app.api.routes.marketplace_media import _read_limited_bytes, _write_limited_upload
from app.api.routes.marketplace import _require_verified_marketplace_video
from app.db.database import engine
from app.services.marketplace_media_quality_service import (
    FFMPEG_THREAD_LIMIT,
    MAX_GSN_NATURAL_FINISH_BYTES,
    MAX_NORMALIZED_IMAGE_BYTES,
    MAX_NORMALIZED_VIDEO_BYTES,
    MAX_SOURCE_VIDEO_BYTES,
    MAX_VIDEO_DURATION_SECONDS,
    MIN_VIDEO_FPS,
    MIN_VIDEO_SHORT_EDGE,
    MediaQualityError,
    VideoFinishProfile,
    VideoInspection,
    _build_finish_overlay,
    inspect_video,
    is_verified_marketplace_video_url,
    normalize_marketplace_image,
    normalize_marketplace_video,
    render_marketplace_image_reel,
)


class _ChunkedUpload:
    def __init__(self, chunks: list[bytes]) -> None:
        self.chunks = list(chunks)
        self.read_sizes: list[int] = []

    async def read(self, size: int) -> bytes:
        self.read_sizes.append(size)
        return self.chunks.pop(0) if self.chunks else b""


def _image_bytes(
    *,
    size: tuple[int, int] = (2400, 1600),
    mode: str = "RGB",
    image_format: str = "JPEG",
) -> bytes:
    output = BytesIO()
    colour = (38, 70, 105, 180) if mode == "RGBA" else (38, 70, 105)
    Image.new(mode, size, colour).save(output, format=image_format)
    return output.getvalue()


def test_image_finish_is_bounded_web_ready_and_does_not_upscale(tmp_path: Path):
    source = _image_bytes(size=(2400, 1600))
    output = tmp_path / "prepared"

    result = normalize_marketplace_image(source, output)

    assert output.is_file()
    assert result.output_format == "JPEG"
    assert result.content_type == "image/jpeg"
    assert result.output_width == 1920
    assert result.output_height == 1280
    assert result.resized is True
    assert result.size_bytes <= MAX_NORMALIZED_IMAGE_BYTES

    small_output = tmp_path / "small"
    small = normalize_marketplace_image(
        _image_bytes(size=(320, 240)), small_output
    )
    assert small.output_width == 320
    assert small.output_height == 240
    assert small.resized is False


def test_image_finish_preserves_transparency_with_webp(tmp_path: Path):
    output = tmp_path / "transparent"
    result = normalize_marketplace_image(
        _image_bytes(size=(700, 500), mode="RGBA", image_format="PNG"),
        output,
    )

    assert result.output_format == "WEBP"
    assert result.content_type == "image/webp"
    assert result.transparency_preserved is True
    with Image.open(output) as prepared:
        assert prepared.mode == "RGBA"
        assert prepared.getchannel("A").getextrema() == (180, 180)


def test_gsn_finish_overlay_has_standard_navy_and_gold_frame(tmp_path: Path):
    overlay_path = tmp_path / "gsn-reel-frame.png"

    _build_finish_overlay(
        VideoFinishProfile(duration_seconds=5, brand_name="Ada Home Foods"),
        720,
        1280,
        overlay_path,
    )

    with Image.open(overlay_path).convert("RGBA") as overlay:
        assert overlay.getpixel((360, 8))[:3] == (6, 21, 42)
        assert overlay.getpixel((360, 15))[:3] == (199, 158, 59)


def test_image_finish_rejects_unreadable_input(tmp_path: Path):
    with pytest.raises(MediaQualityError) as exc_info:
        normalize_marketplace_image(b"not an image", tmp_path / "bad")

    assert exc_info.value.code == "invalid_image_file"


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


def _make_audio(
    path: Path,
    *,
    seconds: float = 2,
    frequency: int = 660,
) -> Path:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-nostdin",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency={frequency}:sample_rate=44100",
            "-t",
            str(seconds),
            "-c:a",
            "pcm_s16le",
            str(path),
        ],
        check=True,
        capture_output=True,
        timeout=45,
    )
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


def test_normalizer_adds_sound_to_a_silent_video(tmp_path: Path):
    source = _make_video(tmp_path / "silent.mp4")
    sound = _make_audio(tmp_path / "voice.wav")
    output = tmp_path / "qv1_with_sound.mp4"

    result = normalize_marketplace_video(
        source,
        output,
        sound_path=sound,
        sound_mode="replace",
    )

    assert output.is_file()
    assert result.source_had_audio is False
    assert result.added_sound is True
    assert result.sound_mode == "replace"
    assert result.output_has_audio is True


def test_normalizer_mixes_added_sound_with_original_audio(tmp_path: Path):
    source = _make_video(tmp_path / "spoken.mp4", with_audio=True)
    sound = _make_audio(tmp_path / "music.wav", frequency=440)
    output = tmp_path / "qv1_mixed.mp4"

    result = normalize_marketplace_video(
        source,
        output,
        sound_path=sound,
        sound_mode="mix",
    )

    assert output.is_file()
    assert result.source_had_audio is True
    assert result.added_sound is True
    assert result.sound_mode == "mix"
    assert result.output_has_audio is True


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


def test_image_reel_creates_bounded_vertical_managed_video(tmp_path: Path):
    prepared_image = tmp_path / "prepared-image"
    normalize_marketplace_image(
        _image_bytes(size=(1600, 900)),
        prepared_image,
    )
    output = tmp_path / "qv1_picture_reel.mp4"

    result = render_marketplace_image_reel(
        prepared_image,
        output,
        finish_profile=VideoFinishProfile(
            duration_seconds=5,
            brand_name="Ada Home Foods",
            title="Fresh soup packs",
            public_contact="+234 800 000 0000",
        ),
    )

    assert output.is_file()
    assert result.source_width == 1600
    assert result.source_height == 900
    assert result.output.width == 720
    assert result.output.height == 1280
    assert result.output.duration_seconds <= 5.35
    assert result.output.codec == "h264"
    assert result.output_has_audio is False
    assert result.size_bytes <= MAX_GSN_NATURAL_FINISH_BYTES


def test_image_reel_adds_confirmed_owner_sound(tmp_path: Path):
    prepared_image = tmp_path / "prepared-image"
    normalize_marketplace_image(_image_bytes(size=(900, 1600)), prepared_image)
    sound = _make_audio(tmp_path / "owner-sound.wav", frequency=440)
    output = tmp_path / "qv1_picture_reel_with_sound.mp4"

    result = render_marketplace_image_reel(
        prepared_image,
        output,
        finish_profile=VideoFinishProfile(
            duration_seconds=5,
            brand_name="Ada Home Foods",
        ),
        sound_path=sound,
    )

    assert output.is_file()
    assert result.added_sound is True
    assert result.output_has_audio is True
    assert result.output.duration_seconds <= 5.35
    assert result.size_bytes <= MAX_GSN_NATURAL_FINISH_BYTES


def _seed_picture_reel_shop() -> None:
    with engine.begin() as connection:
        connection.exec_driver_sql(
            """
            INSERT INTO marketplace_shops (
                id, clan_id, owner_user_id, shop_name, is_active
            ) VALUES (1, 1, 1, 'Ada Home Foods', 1)
            """
        )


def test_image_reel_upload_rejects_sound_without_rights_confirmation(
    client,
    override_current_user,
    seed_clan_admin_membership,
    tmp_path: Path,
):
    _seed_picture_reel_shop()
    sound = _make_audio(tmp_path / "unconfirmed-picture-reel.wav")

    with sound.open("rb") as sound_stream:
        response = client.post(
            "/marketplace/media/image-reel",
            data={
                "duration_seconds": "5",
                "shop_id": "1",
                "sound_mode": "replace",
            },
            files={
                "file": ("shop.jpg", _image_bytes(), "image/jpeg"),
                "sound_file": (
                    "unconfirmed-picture-reel.wav",
                    sound_stream,
                    "audio/wav",
                ),
            },
        )

    assert response.status_code == 400, response.text
    assert response.json()["detail"]["code"] == "sound_rights_confirmation_required"


def test_image_reel_upload_embeds_confirmed_owner_sound(
    client,
    override_current_user,
    seed_clan_admin_membership,
    monkeypatch,
    tmp_path: Path,
):
    _seed_picture_reel_shop()
    upload_root = tmp_path / "uploads"
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(upload_root))
    sound = _make_audio(tmp_path / "confirmed-picture-reel.wav")

    with sound.open("rb") as sound_stream:
        response = client.post(
            "/marketplace/media/image-reel",
            data={
                "duration_seconds": "5",
                "shop_id": "1",
                "sound_mode": "replace",
                "sound_rights_confirmed": "true",
            },
            files={
                "file": ("shop.jpg", _image_bytes(), "image/jpeg"),
                "sound_file": (
                    "confirmed-picture-reel.wav",
                    sound_stream,
                    "audio/wav",
                ),
            },
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["source_kind"] == "image"
    assert body["quality_verified"] is True
    assert body["sound"] == {
        "added": True,
        "mode": "replace",
        "output_has_audio": True,
        "rights_confirmed": True,
    }
    assert (upload_root / "marketplace" / "videos" / body["filename"]).is_file()


def test_image_reel_rejects_unapproved_duration(tmp_path: Path):
    prepared_image = tmp_path / "prepared-image"
    normalize_marketplace_image(_image_bytes(), prepared_image)

    with pytest.raises(MediaQualityError) as exc_info:
        render_marketplace_image_reel(
            prepared_image,
            tmp_path / "bad-reel.mp4",
            finish_profile=VideoFinishProfile(
                duration_seconds=8,
                brand_name="Ada Home Foods",
            ),
        )

    assert exc_info.value.code == "image_reel_duration_invalid"


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

    visual_filter = encode_command[encode_command.index("-vf") + 1]
    assert "hqdn3d=1.0:0.8:1.5:1.0" in visual_filter
    assert "eq=brightness=0.01:contrast=1.02:saturation=1.015" in visual_filter
    assert "unsharp=5:5:0.20:3:3:0" in visual_filter

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


def test_normalizer_defers_unknown_source_fps_until_output_is_verified(
    tmp_path: Path,
    monkeypatch,
):
    source = _make_video(tmp_path / "phone-video.mp4", seconds=2)
    output = tmp_path / "qv1_phone_video.mp4"
    real_read_frames = imageio_ffmpeg.read_frames

    def read_frames_with_unknown_source_fps(path, *args, **kwargs):
        reader = real_read_frames(path, *args, **kwargs)
        metadata = next(reader)
        if Path(path) == source:
            metadata = {**metadata, "fps": 0}

        def wrapped_reader():
            try:
                yield metadata
            finally:
                reader.close()

        return wrapped_reader()

    monkeypatch.setattr(
        "app.services.marketplace_media_quality_service.imageio_ffmpeg.read_frames",
        read_frames_with_unknown_source_fps,
    )

    result = normalize_marketplace_video(source, output)

    assert output.is_file()
    assert result.source.fps == 0
    assert result.output.fps >= MIN_VIDEO_FPS


def test_normalizer_still_rejects_genuinely_low_source_fps(tmp_path: Path):
    source = _make_video(tmp_path / "genuinely-choppy.mp4", fps=10, seconds=2)
    output = tmp_path / "qv1_genuinely_choppy.mp4"

    with pytest.raises(MediaQualityError) as exc_info:
        normalize_marketplace_video(source, output)

    assert exc_info.value.code == "video_frame_rate_too_low"


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


def test_video_upload_rejects_sound_without_rights_confirmation(
    client,
    override_current_user,
    tmp_path: Path,
):
    source = _make_video(tmp_path / "silent-upload.mp4")
    sound = _make_audio(tmp_path / "unconfirmed.wav")

    with source.open("rb") as video_stream, sound.open("rb") as sound_stream:
        response = client.post(
            "/marketplace/media/video",
            data={"sound_mode": "replace"},
            files={
                "file": ("silent-upload.mp4", video_stream, "video/mp4"),
                "sound_file": ("unconfirmed.wav", sound_stream, "audio/wav"),
            },
        )

    assert response.status_code == 400, response.text
    assert response.json()["detail"]["code"] == "sound_rights_confirmation_required"


def test_video_upload_embeds_confirmed_user_sound(
    client,
    override_current_user,
    monkeypatch,
    tmp_path: Path,
):
    upload_root = tmp_path / "uploads"
    monkeypatch.setenv("GMFN_UPLOADS_DIR", str(upload_root))
    source = _make_video(tmp_path / "silent-upload.mp4")
    sound = _make_audio(tmp_path / "confirmed.wav")

    with source.open("rb") as video_stream, sound.open("rb") as sound_stream:
        response = client.post(
            "/marketplace/media/video",
            data={
                "sound_mode": "replace",
                "sound_rights_confirmed": "true",
            },
            files={
                "file": ("silent-upload.mp4", video_stream, "video/mp4"),
                "sound_file": ("confirmed.wav", sound_stream, "audio/wav"),
            },
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["sound"] == {
        "added": True,
        "mode": "replace",
        "output_has_audio": True,
        "rights_confirmed": True,
    }


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
