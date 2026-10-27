from __future__ import annotations

import os
import re
import subprocess
import time
from io import BytesIO
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps, ImageStat, UnidentifiedImageError

from app.core.runtime_memory import log_runtime_event, memory_snapshot


# Hard rejection floors, not preferred recording targets. Ordinary social-video
# downloads can remain useful below HD; GSN rejects only sources that are too
# small or too choppy to survive the required preparation step.
MAX_IMAGE_LONG_EDGE = 1920
MAX_NORMALIZED_IMAGE_BYTES = 4 * 1024 * 1024
MIN_VIDEO_SHORT_EDGE = 360
MIN_VIDEO_FPS = 15.0
MIN_VIDEO_DURATION_SECONDS = 1.0
MAX_VIDEO_ASPECT_RATIO = 2.4
MAX_VIDEO_DURATION_SECONDS = 10.0
MAX_VIDEO_LONG_EDGE = 1280
# The source ceiling is deliberately higher than the published-file ceiling.
# Members may select an ordinary phone recording without knowing its duration
# or encoded size; GSN then keeps and normalises only the opening public clip.
MAX_SOURCE_VIDEO_BYTES = 100 * 1024 * 1024
MAX_NORMALIZED_VIDEO_BYTES = 15 * 1024 * 1024
MAX_GSN_NATURAL_FINISH_BYTES = 4 * 1024 * 1024
VIDEO_PROCESS_TIMEOUT_SECONDS = 50
# The production API currently runs inside a 512 MiB Render instance. FFmpeg
# otherwise sizes its decoder, filter, and encoder thread pools from the host
# CPU count, which can create a short but fatal memory spike even for a useful
# 10-second phone clip. One worker is slower but keeps preparation predictable;
# this does not lower the accepted resolution or the encoded picture quality.
FFMPEG_THREAD_LIMIT = 1

_MANAGED_VIDEO_PATH = re.compile(
    r"^/uploads/marketplace/videos/qv1_[A-Za-z0-9_-]+[.]mp4$"
)


def _runtime_memory_logging_enabled() -> bool:
    return str(os.getenv("GSN_RUNTIME_MEMORY_LOGGING", "")).strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _run_video_process(command: list[str]) -> subprocess.CompletedProcess[str]:
    """Run FFmpeg with a bounded timeout and capture its peak direct-child RSS."""

    started = time.monotonic()
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    peak_child_rss_mib = 0.0
    try:
        while True:
            elapsed = time.monotonic() - started
            remaining = VIDEO_PROCESS_TIMEOUT_SECONDS - elapsed
            if remaining <= 0:
                process.kill()
                stdout, stderr = process.communicate()
                raise subprocess.TimeoutExpired(
                    command,
                    VIDEO_PROCESS_TIMEOUT_SECONDS,
                    output=stdout,
                    stderr=stderr,
                )
            try:
                stdout, stderr = process.communicate(timeout=min(0.25, remaining))
                break
            except subprocess.TimeoutExpired:
                child_rss_mib = memory_snapshot().get("child_rss_mib")
                if child_rss_mib is not None:
                    peak_child_rss_mib = max(
                        peak_child_rss_mib,
                        float(child_rss_mib),
                    )
    finally:
        if process.poll() is None:
            process.kill()
            process.communicate()

    completed = subprocess.CompletedProcess(
        command,
        process.returncode,
        stdout=stdout,
        stderr=stderr,
    )
    if _runtime_memory_logging_enabled():
        log_runtime_event(
            "video_process_complete",
            duration_ms=round((time.monotonic() - started) * 1000.0, 1),
            return_code=int(process.returncode or 0),
            child_peak_rss_mib=round(peak_child_rss_mib, 1),
        )
    return completed


class MediaQualityError(ValueError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = str(code or "video_quality_rejected")


@dataclass(frozen=True)
class VideoInspection:
    width: int
    height: int
    fps: float
    duration_seconds: float
    codec: str

    @property
    def short_edge(self) -> int:
        return min(self.width, self.height)

    @property
    def long_edge(self) -> int:
        return max(self.width, self.height)

    @property
    def aspect_ratio(self) -> float:
        return self.long_edge / max(self.short_edge, 1)

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class NormalizedImage:
    source_width: int
    source_height: int
    output_width: int
    output_height: int
    source_size_bytes: int
    size_bytes: int
    source_format: str
    output_format: str
    content_type: str
    extension: str
    resized: bool
    orientation_normalized: bool
    transparency_preserved: bool

    def as_dict(self) -> dict[str, Any]:
        return asdict(self)


def _image_has_transparency(image: Image.Image) -> bool:
    if image.mode in {"RGBA", "LA"}:
        return True
    return image.mode == "P" and "transparency" in image.info


def _image_resample_filter() -> Any:
    return getattr(Image, "Resampling", Image).LANCZOS


@dataclass(frozen=True)
class VideoFinishProfile:
    duration_seconds: int
    brand_name: str
    title: str = ''
    public_contact: str = ''
    logo_path: Path | None = None


@dataclass(frozen=True)
class NormalizedVideo:
    source: VideoInspection
    output: VideoInspection
    source_had_audio: bool
    trimmed: bool
    kept_seconds: float
    size_bytes: int
    visual_preparation: str = "gsn_clear"
    finish_profile: str | None = None
    added_sound: bool = False
    sound_mode: str | None = None
    output_has_audio: bool = False

    def as_dict(self) -> dict[str, Any]:
        return {
            "source": self.source.as_dict(),
            "output": self.output.as_dict(),
            "source_had_audio": self.source_had_audio,
            "trimmed": self.trimmed,
            "kept_seconds": self.kept_seconds,
            "size_bytes": self.size_bytes,
            "visual_preparation": self.visual_preparation,
            "finish_profile": self.finish_profile,
            "added_sound": self.added_sound,
            "sound_mode": self.sound_mode,
            "output_has_audio": self.output_has_audio,
        }


@dataclass(frozen=True)
class ImageReelVideo:
    source_width: int
    source_height: int
    output: VideoInspection
    duration_seconds: int
    size_bytes: int
    output_has_audio: bool = False
    visual_preparation: str = "gsn_image_reel"
    finish_profile: str = "gsn_natural"

    def as_dict(self) -> dict[str, Any]:
        return {
            "source": {
                "kind": "image",
                "width": self.source_width,
                "height": self.source_height,
            },
            "output": self.output.as_dict(),
            "duration_seconds": self.duration_seconds,
            "size_bytes": self.size_bytes,
            "output_has_audio": self.output_has_audio,
            "visual_preparation": self.visual_preparation,
            "finish_profile": self.finish_profile,
        }


def normalize_marketplace_image(
    source: bytes | bytearray,
    output_path: str | Path,
) -> NormalizedImage:
    """Create a bounded, web-ready product image without inventing product detail.

    This is deliberately a conservative photographic finish, not generative
    editing: orientation is corrected, oversized pictures are reduced, and
    only mild tonal/colour/sharpness adjustments are applied. Tiny sources are
    never enlarged and animation is rejected rather than silently flattened.
    """

    raw = bytes(source or b"")
    if not raw:
        raise MediaQualityError(
            "image_empty",
            "This picture is empty or could not be read. Choose another picture.",
        )

    try:
        with Image.open(BytesIO(raw)) as opened:
            source_format = str(opened.format or "").strip().upper()
            source_width, source_height = opened.size
            if bool(getattr(opened, "is_animated", False)) and int(
                getattr(opened, "n_frames", 1) or 1
            ) > 1:
                raise MediaQualityError(
                    "animated_image_unsupported",
                    "Use a still JPG, PNG, or WebP picture. Animated pictures are not prepared as product photos.",
                )
            opened.load()
            had_transparency = _image_has_transparency(opened)
            original_orientation = opened.getexif().get(274)
            prepared = ImageOps.exif_transpose(opened).copy()
    except MediaQualityError:
        raise
    except (Image.DecompressionBombError, UnidentifiedImageError, OSError, ValueError) as exc:
        raise MediaQualityError(
            "invalid_image_file",
            "This picture could not be read. Choose a valid JPG, PNG, or WebP image.",
        ) from exc

    if source_width <= 0 or source_height <= 0:
        raise MediaQualityError(
            "image_dimensions_unknown",
            "GSN could not read this picture's dimensions. Save or export it again.",
        )

    orientation_normalized = original_orientation not in {None, 1}
    width, height = prepared.size
    longest_edge = max(width, height)
    resized = longest_edge > MAX_IMAGE_LONG_EDGE
    if resized:
        scale = MAX_IMAGE_LONG_EDGE / max(longest_edge, 1)
        width = max(1, int(round(width * scale)))
        height = max(1, int(round(height * scale)))
        prepared = prepared.resize((width, height), _image_resample_filter())

    alpha: Image.Image | None = None
    if had_transparency:
        rgba = prepared.convert("RGBA")
        alpha = rgba.getchannel("A")
        rgb = rgba.convert("RGB")
    else:
        rgb = prepared.convert("RGB")

    # The adjustment ceiling is intentionally small. It improves ordinary
    # phone images while preserving truthful product colour and condition.
    sample = ImageOps.grayscale(rgb.copy())
    sample.thumbnail((256, 256), _image_resample_filter())
    luminance = float(ImageStat.Stat(sample).mean[0] or 0.0)
    brightness_factor = 1.02 if luminance < 105 else (1.01 if luminance < 145 else 1.0)
    rgb = ImageEnhance.Brightness(rgb).enhance(brightness_factor)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.03)
    rgb = ImageEnhance.Color(rgb).enhance(1.02)
    rgb = ImageEnhance.Sharpness(rgb).enhance(1.10)

    if alpha is not None:
        prepared_output = rgb.convert("RGBA")
        prepared_output.putalpha(alpha)
        output_format = "WEBP"
        content_type = "image/webp"
        extension = ".webp"
    else:
        prepared_output = rgb
        output_format = "JPEG"
        content_type = "image/jpeg"
        extension = ".jpg"

    encoded: bytes | None = None
    attempt = prepared_output
    quality_steps = (88, 82, 76, 70, 64)
    for size_step in range(5):
        for quality in quality_steps:
            buffer = BytesIO()
            save_options: dict[str, Any] = {
                "format": output_format,
                "quality": quality,
                "optimize": True,
            }
            if output_format == "JPEG":
                save_options.update({"progressive": True, "subsampling": "4:2:0"})
            else:
                save_options.update({"method": 4})
            attempt.save(buffer, **save_options)
            candidate = buffer.getvalue()
            if len(candidate) <= MAX_NORMALIZED_IMAGE_BYTES:
                encoded = candidate
                break
        if encoded is not None:
            break
        next_width = max(360, int(round(attempt.width * 0.82)))
        next_height = max(360, int(round(attempt.height * 0.82)))
        if next_width >= attempt.width and next_height >= attempt.height:
            break
        attempt = attempt.resize((next_width, next_height), _image_resample_filter())
        resized = True

    if not encoded:
        raise MediaQualityError(
            "image_output_too_large",
            "GSN could not prepare this picture below 4 MB. Choose a simpler or smaller picture.",
        )

    destination = Path(output_path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(encoded)
    return NormalizedImage(
        source_width=int(source_width),
        source_height=int(source_height),
        output_width=int(attempt.width),
        output_height=int(attempt.height),
        source_size_bytes=len(raw),
        size_bytes=len(encoded),
        source_format=source_format,
        output_format=output_format,
        content_type=content_type,
        extension=extension,
        resized=resized,
        orientation_normalized=orientation_normalized,
        transparency_preserved=had_transparency,
    )


def _font(size: int) -> ImageFont.ImageFont:
    for name in ('DejaVuSans-Bold.ttf', 'Arial.ttf'):
        try:
            return ImageFont.truetype(name, size=size)
        except OSError:
            pass
    return ImageFont.load_default()


def _ellipsize(draw: ImageDraw.ImageDraw, value: str, font: ImageFont.ImageFont, width: int) -> str:
    text = ' '.join(str(value or '').split())
    while text and draw.textbbox((0, 0), text, font=font)[2] > width:
        text = text[:-2].rstrip() + '...'
    return text


def _build_finish_overlay(profile: VideoFinishProfile, width: int, height: int, path: Path) -> None:
    canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    margin = max(12, int(width * 0.025))
    panel_height = max(90, min(int(height * 0.25), 190))
    top = height - panel_height - margin
    draw.rounded_rectangle(
        (margin, top, width - margin, height - margin),
        radius=max(14, int(width * 0.018)),
        fill=(8, 25, 49, 224),
        outline=(199, 158, 59, 240),
        width=max(2, int(width * 0.004)),
    )
    logo_size = max(52, min(panel_height - 26, 118))
    text_left = margin * 2
    if profile.logo_path and profile.logo_path.is_file():
        try:
            with Image.open(profile.logo_path) as source:
                logo = ImageOps.contain(source.convert('RGBA'), (logo_size, logo_size))
                logo_x = margin * 2
                canvas.alpha_composite(logo, (logo_x, top + (panel_height - logo.height) // 2))
                text_left = logo_x + logo_size + margin
        except (OSError, ValueError):
            pass
    max_width = max(100, width - text_left - margin * 2)
    brand_font = _font(max(18, min(38, int(width * 0.044))))
    detail_font = _font(max(13, min(26, int(width * 0.029))))
    small_font = _font(max(11, min(20, int(width * 0.022))))
    y = top + max(12, int(panel_height * 0.1))
    for value, font, colour in (
        (profile.brand_name, brand_font, (255, 247, 225, 255)),
        (profile.title, detail_font, (255, 255, 255, 245)),
        (profile.public_contact, small_font, (232, 238, 246, 245)),
    ):
        line = _ellipsize(draw, value, font, max_width)
        if line:
            draw.text((text_left, y), line, font=font, fill=colour)
            y += draw.textbbox((0, 0), line, font=font)[3] + 3
    mark = 'Presented through GSN'
    mark_font = _font(max(10, min(16, int(width * 0.016))))
    mark_width = draw.textbbox((0, 0), mark, font=mark_font)[2]
    draw.text((width - margin * 2 - mark_width, height - margin * 2 - 14), mark, font=mark_font, fill=(199, 158, 59, 255))
    canvas.save(path, format='PNG', optimize=True)


def _safe_float(value: Any) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return 0.0
    return parsed if parsed > 0 else 0.0


def _safe_size(value: Any) -> tuple[int, int]:
    if not isinstance(value, (tuple, list)) or len(value) < 2:
        return 0, 0
    try:
        width = int(value[0] or 0)
        height = int(value[1] or 0)
    except (TypeError, ValueError):
        return 0, 0
    return max(0, width), max(0, height)


def inspect_video(
    path: str | Path,
    *,
    defer_min_duration_check: bool = False,
    defer_unknown_fps_check: bool = False,
) -> VideoInspection:
    source_path = Path(path)
    if not source_path.is_file() or source_path.stat().st_size <= 0:
        raise MediaQualityError(
            "video_empty",
            "This video is empty or could not be read. Choose a different file.",
        )

    reader = None
    try:
        reader = imageio_ffmpeg.read_frames(
            str(source_path),
            input_params=[
                "-threads",
                str(FFMPEG_THREAD_LIMIT),
                "-filter_threads",
                str(FFMPEG_THREAD_LIMIT),
            ],
            output_params=["-threads", str(FFMPEG_THREAD_LIMIT)],
        )
        metadata = next(reader)
    except Exception as exc:
        raise MediaQualityError(
            "video_unreadable",
            "GSN could not verify this video. Use a playable MP4, WebM, or MOV file.",
        ) from exc
    finally:
        if reader is not None:
            try:
                reader.close()
            except Exception:
                pass

    width, height = _safe_size(metadata.get("size"))
    if width <= 0 or height <= 0:
        width, height = _safe_size(metadata.get("source_size"))

    inspection = VideoInspection(
        width=width,
        height=height,
        fps=_safe_float(metadata.get("fps")),
        duration_seconds=_safe_float(metadata.get("duration")),
        codec=str(metadata.get("codec") or "").strip().lower(),
    )
    _validate_video_quality(
        inspection,
        defer_min_duration_check=defer_min_duration_check,
        defer_unknown_fps_check=defer_unknown_fps_check,
    )
    return inspection


def _validate_video_quality(
    inspection: VideoInspection,
    *,
    defer_min_duration_check: bool = False,
    defer_unknown_fps_check: bool = False,
) -> None:
    if inspection.width <= 0 or inspection.height <= 0:
        raise MediaQualityError(
            "video_dimensions_unknown",
            "GSN could not read this video's picture size. Record or export it again before uploading.",
        )
    if (
        not defer_min_duration_check
        and inspection.duration_seconds < MIN_VIDEO_DURATION_SECONDS
    ):
        raise MediaQualityError(
            "video_too_short",
            "The video must be at least 1 second long.",
        )
    if inspection.short_edge < MIN_VIDEO_SHORT_EDGE:
        raise MediaQualityError(
            "video_resolution_too_low",
            (
                f"This video is {inspection.width}x{inspection.height}. "
                "It is too small to remain clear after GSN prepares it. "
                "Choose a clearer copy or record it again."
            ),
        )
    if inspection.aspect_ratio > MAX_VIDEO_ASPECT_RATIO:
        raise MediaQualityError(
            "video_shape_unsupported",
            "This video is extremely narrow or wide and cannot be prepared reliably. "
            "Choose a normal portrait, square, or landscape copy.",
        )
    if inspection.fps <= 0:
        if defer_unknown_fps_check:
            return
        raise MediaQualityError(
            "video_frame_rate_unknown",
            "GSN could not confirm this video's frame rate. Record or export it again before uploading.",
        )
    if inspection.fps < MIN_VIDEO_FPS:
        raise MediaQualityError(
            "video_frame_rate_too_low",
            (
                f"This video is about {inspection.fps:.1f} frames per second. "
                "It is too choppy to prepare reliably. Choose a smoother copy or record it again."
            ),
        )


def _source_has_audio(ffmpeg_exe: str, source_path: Path) -> bool:
    try:
        probe = subprocess.run(
            [
                ffmpeg_exe,
                "-hide_banner",
                "-nostdin",
                "-threads",
                str(FFMPEG_THREAD_LIMIT),
                "-i",
                str(source_path),
            ],
            capture_output=True,
            text=True,
            timeout=12,
            check=False,
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return bool(re.search(r"Stream #[^\r\n]+Audio:", probe.stderr or "", re.IGNORECASE))


def _normalized_dimensions(inspection: VideoInspection) -> tuple[int, int]:
    scale = min(1.0, MAX_VIDEO_LONG_EDGE / max(inspection.long_edge, 1))
    width = max(2, int(round(inspection.width * scale)))
    height = max(2, int(round(inspection.height * scale)))
    if width % 2:
        width -= 1
    if height % 2:
        height -= 1
    return max(2, width), max(2, height)


def normalize_marketplace_video(
    source_path: str | Path,
    output_path: str | Path,
    *,
    finish_profile: VideoFinishProfile | None = None,
    sound_path: str | Path | None = None,
    sound_mode: str | None = None,
) -> NormalizedVideo:
    input_path = Path(source_path)
    destination = Path(output_path)
    # Some otherwise playable phone/social-video containers expose a usable
    # picture stream but report zero source duration or frame rate to the
    # lightweight metadata reader. Do not accept missing metadata as a low-
    # quality measurement. FFmpeg prepares the source first, then the
    # normalised MP4 is inspected below with both minimums still enforced.
    inspection = inspect_video(
        input_path,
        defer_min_duration_check=True,
        defer_unknown_fps_check=True,
    )

    try:
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    except Exception as exc:
        raise MediaQualityError(
            "video_processor_unavailable",
            "GSN could not prepare videos right now. Please try again shortly.",
        ) from exc

    destination.parent.mkdir(parents=True, exist_ok=True)
    width, height = _normalized_dimensions(inspection)
    output_fps = min(30.0, max(MIN_VIDEO_FPS, round(inspection.fps)))
    has_audio = _source_has_audio(ffmpeg_exe, input_path)
    added_sound_path = Path(sound_path) if sound_path is not None else None
    selected_sound_mode = str(sound_mode or "").strip().lower() or None
    if added_sound_path is not None:
        if not added_sound_path.is_file() or added_sound_path.stat().st_size <= 0:
            raise MediaQualityError(
                "sound_empty",
                "The selected sound is empty or could not be read.",
            )
        if selected_sound_mode not in {"mix", "replace"}:
            raise MediaQualityError(
                "sound_mode_invalid",
                "Choose Add over video or Replace video sound.",
            )
        if not _source_has_audio(ffmpeg_exe, added_sound_path):
            raise MediaQualityError(
                "sound_unreadable",
                "GSN could not read the selected sound. Choose another audio file or record it again.",
            )
    elif selected_sound_mode is not None:
        raise MediaQualityError(
            "sound_file_required",
            "Choose or record a sound before selecting how it should be added.",
        )
    finish_seconds = (
        int(finish_profile.duration_seconds)
        if finish_profile is not None
        else int(MAX_VIDEO_DURATION_SECONDS)
    )
    if finish_profile is not None and finish_seconds not in {5, 10}:
        raise MediaQualityError('video_finish_duration_invalid', 'Choose a 5-second or 10-second GSN finish.')
    overlay_path = destination.with_suffix('.overlay.png')
    if finish_profile is not None:
        _build_finish_overlay(finish_profile, width, height, overlay_path)

    command = [
        ffmpeg_exe,
        "-y",
        "-nostdin",
        "-v",
        "error",
        "-threads",
        str(FFMPEG_THREAD_LIMIT),
        "-filter_threads",
        str(FFMPEG_THREAD_LIMIT),
        "-i",
        str(input_path),
    ]
    sound_input_index: int | None = None
    if added_sound_path is not None:
        sound_input_index = 1
        command.extend(["-i", str(added_sound_path)])
    overlay_input_index: int | None = None
    if finish_profile is not None:
        overlay_input_index = 2 if added_sound_path is not None else 1
        command.extend(["-loop", "1", "-i", str(overlay_path)])

    command.extend(["-t", str(finish_seconds), "-map", "0:v:0"])
    if added_sound_path is not None:
        command.extend(["-map", "[prepared_audio]"])
    elif has_audio:
        command.extend(["-map", "0:a:0?"])
    command.extend(
        [
            "-vf",
            (
                f"scale={width}:{height},"
                "hqdn3d=1.0:0.8:1.5:1.0,"
                "eq=brightness=0.01:contrast=1.02:saturation=1.015,"
                "unsharp=5:5:0.20:3:3:0"
            ),
            "-r",
            f"{output_fps:g}",
            "-c:v",
            "libx264",
            "-threads",
            str(FFMPEG_THREAD_LIMIT),
            "-x264-params",
            f"threads={FFMPEG_THREAD_LIMIT}:lookahead_threads={FFMPEG_THREAD_LIMIT}",
            "-preset",
            "veryfast",
            "-crf",
            "22",
            "-maxrate",
            "2500k",
            "-bufsize",
            "5000k",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-map_metadata",
            "-1",
        ]
    )
    if added_sound_path is not None:
        command.extend(["-c:a", "aac", "-b:a", "96k" if finish_profile is not None else "128k", "-shortest"])
    elif has_audio:
        command.extend(
            [
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-af",
                "loudnorm=I=-16:TP=-1.5:LRA=11",
            ]
        )
    else:
        command.append("-an")
    command.append(str(destination))

    filter_parts: list[str] = []
    if finish_profile is not None and overlay_input_index is not None:
        command[command.index('0:v:0')] = '[finished]'
        video_filter_index = command.index('-vf')
        del command[video_filter_index : video_filter_index + 2]
        filter_parts.append(
            f'[0:v]scale={width}:{height},'
            'hqdn3d=1.4:1.0:2.0:1.5,'
            'eq=brightness=0.015:contrast=1.035:saturation=1.025,'
            'unsharp=5:5:0.35:3:3:0[base];'
            f'[base][{overlay_input_index}:v]overlay=0:0:eof_action=repeat[finished]'
        )
        command[command.index('-crf') + 1] = '23'
        command[command.index('-maxrate') + 1] = '1600k'
        command[command.index('-bufsize') + 1] = '3200k'
        if has_audio and added_sound_path is None:
            command[command.index('-b:a') + 1] = '96k'

    if added_sound_path is not None and sound_input_index is not None:
        duration_filter = f"atrim=0:{finish_seconds},apad=pad_dur={finish_seconds},atrim=0:{finish_seconds},asetpts=PTS-STARTPTS"
        if selected_sound_mode == "mix" and has_audio:
            filter_parts.append(
                f"[0:a:0]{duration_filter},volume=0.35[original_audio];"
                f"[{sound_input_index}:a:0]{duration_filter},volume=0.80[added_audio];"
                "[original_audio][added_audio]amix=inputs=2:duration=longest:dropout_transition=0,"
                "loudnorm=I=-16:TP=-1.5:LRA=11[prepared_audio]"
            )
        else:
            filter_parts.append(
                f"[{sound_input_index}:a:0]{duration_filter},"
                "loudnorm=I=-16:TP=-1.5:LRA=11[prepared_audio]"
            )

    if filter_parts:
        insert_index = command.index("-r")
        command[insert_index:insert_index] = [
            "-filter_complex_threads",
            str(FFMPEG_THREAD_LIMIT),
            "-filter_complex",
            ";".join(filter_parts),
        ]

    try:
        if _runtime_memory_logging_enabled():
            completed = _run_video_process(command)
        else:
            completed = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=VIDEO_PROCESS_TIMEOUT_SECONDS,
                check=False,
            )
    except subprocess.TimeoutExpired as exc:
        raise MediaQualityError(
            "video_processing_timeout",
            "This video took too long to prepare. Try a shorter recording or export it again.",
        ) from exc
    except OSError as exc:
        raise MediaQualityError(
            "video_processor_unavailable",
            "GSN could not prepare videos right now. Please try again shortly.",
        ) from exc

    overlay_path.unlink(missing_ok=True)
    if completed.returncode != 0 or not destination.is_file():
        destination.unlink(missing_ok=True)
        raise MediaQualityError(
            "video_processing_failed",
            "GSN could not standardise this video. Export it as MP4 and try again.",
        )

    output_size = destination.stat().st_size
    output_limit = MAX_GSN_NATURAL_FINISH_BYTES if finish_profile is not None else MAX_NORMALIZED_VIDEO_BYTES
    if output_size <= 0 or output_size > output_limit:
        destination.unlink(missing_ok=True)
        raise MediaQualityError(
            "video_output_too_large",
            "The prepared video is still too large. Use a shorter or less complex recording.",
        )

    output_inspection = inspect_video(destination)
    output_has_audio = _source_has_audio(ffmpeg_exe, destination)
    if added_sound_path is not None and not output_has_audio:
        destination.unlink(missing_ok=True)
        raise MediaQualityError(
            "sound_output_missing",
            "GSN could not attach the selected sound to the prepared video. Try another sound file.",
        )
    if output_inspection.duration_seconds > finish_seconds + 0.35:
        destination.unlink(missing_ok=True)
        raise MediaQualityError(
            "video_trim_failed",
            "GSN could not keep this video within the 10-second limit. Export a shorter clip and try again.",
        )

    effective_duration = max(
        inspection.duration_seconds,
        output_inspection.duration_seconds,
    )
    return NormalizedVideo(
        source=inspection,
        output=output_inspection,
        source_had_audio=has_audio,
        trimmed=inspection.duration_seconds > finish_seconds + 0.05,
        kept_seconds=min(effective_duration, finish_seconds),
        size_bytes=output_size,
        finish_profile='gsn_natural' if finish_profile is not None else None,
        added_sound=added_sound_path is not None,
        sound_mode=selected_sound_mode,
        output_has_audio=output_has_audio,
    )


def render_marketplace_image_reel(
    source_path: str | Path,
    output_path: str | Path,
    *,
    finish_profile: VideoFinishProfile,
) -> ImageReelVideo:
    """Turn one truthful still shop picture into a bounded portrait MP4.

    The picture is contained without crop on a softly blurred presentation
    canvas. A very small camera push and the existing GSN lower third provide
    motion and attribution; no product pixels are generated or repaired.
    """

    input_path = Path(source_path)
    destination = Path(output_path)
    finish_seconds = int(finish_profile.duration_seconds)
    if finish_seconds not in {5, 10}:
        raise MediaQualityError(
            "image_reel_duration_invalid",
            "Choose a 5-second or 10-second GSN Reel.",
        )

    try:
        with Image.open(input_path) as opened:
            if bool(getattr(opened, "is_animated", False)) and int(
                getattr(opened, "n_frames", 1) or 1
            ) > 1:
                raise MediaQualityError(
                    "animated_image_unsupported",
                    "Use one still JPG, PNG, or WebP picture for this Reel.",
                )
            opened.load()
            prepared = ImageOps.exif_transpose(opened).convert("RGBA")
    except MediaQualityError:
        raise
    except (Image.DecompressionBombError, UnidentifiedImageError, OSError, ValueError) as exc:
        raise MediaQualityError(
            "invalid_image_file",
            "This picture could not be read. Choose a valid JPG, PNG, or WebP image.",
        ) from exc

    source_width, source_height = prepared.size
    if source_width <= 0 or source_height <= 0:
        raise MediaQualityError(
            "image_dimensions_unknown",
            "GSN could not read this picture's dimensions. Save or export it again.",
        )

    width, height = 720, 1280
    destination.parent.mkdir(parents=True, exist_ok=True)
    frame_path = destination.with_suffix(".reel-frame.jpg")
    overlay_path = destination.with_suffix(".overlay.png")

    try:
        background = ImageOps.fit(
            prepared.convert("RGB"),
            (width, height),
            method=_image_resample_filter(),
            centering=(0.5, 0.5),
        )
        background = background.filter(ImageFilter.GaussianBlur(radius=28))
        background = ImageEnhance.Brightness(background).enhance(0.48)
        background = ImageEnhance.Color(background).enhance(0.82)
        canvas = background.convert("RGBA")

        foreground = ImageOps.contain(
            prepared,
            (width - 64, 900),
            method=_image_resample_filter(),
        )
        foreground_x = (width - foreground.width) // 2
        foreground_y = max(42, (1010 - foreground.height) // 2)
        shadow = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(shadow)
        shadow_draw.rounded_rectangle(
            (
                foreground_x - 10,
                foreground_y - 10,
                foreground_x + foreground.width + 10,
                foreground_y + foreground.height + 10,
            ),
            radius=28,
            fill=(0, 0, 0, 128),
        )
        canvas = Image.alpha_composite(
            canvas,
            shadow.filter(ImageFilter.GaussianBlur(radius=16)),
        )
        canvas.alpha_composite(foreground, (foreground_x, foreground_y))

        _build_finish_overlay(finish_profile, width, height, overlay_path)
        with Image.open(overlay_path) as overlay:
            canvas = Image.alpha_composite(canvas, overlay.convert("RGBA"))
        canvas.convert("RGB").save(
            frame_path,
            format="JPEG",
            quality=90,
            optimize=True,
            progressive=True,
        )

        try:
            ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        except Exception as exc:
            raise MediaQualityError(
                "video_processor_unavailable",
                "GSN could not prepare Reels right now. Please try again shortly.",
            ) from exc

        command = [
            ffmpeg_exe,
            "-y",
            "-nostdin",
            "-v",
            "error",
            "-threads",
            str(FFMPEG_THREAD_LIMIT),
            "-filter_threads",
            str(FFMPEG_THREAD_LIMIT),
            "-loop",
            "1",
            "-framerate",
            "30",
            "-i",
            str(frame_path),
            "-t",
            str(finish_seconds),
            "-vf",
            (
                "zoompan="
                "z='min(zoom+0.00012,1.035)':"
                "x='iw/2-(iw/zoom/2)':"
                "y='ih/2-(ih/zoom/2)':"
                "d=1:s=720x1280:fps=30,format=yuv420p"
            ),
            "-r",
            "30",
            "-c:v",
            "libx264",
            "-threads",
            str(FFMPEG_THREAD_LIMIT),
            "-x264-params",
            f"threads={FFMPEG_THREAD_LIMIT}:lookahead_threads={FFMPEG_THREAD_LIMIT}",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-maxrate",
            "1600k",
            "-bufsize",
            "3200k",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-map_metadata",
            "-1",
            "-an",
            str(destination),
        ]
        try:
            completed = (
                _run_video_process(command)
                if _runtime_memory_logging_enabled()
                else subprocess.run(
                    command,
                    capture_output=True,
                    text=True,
                    timeout=VIDEO_PROCESS_TIMEOUT_SECONDS,
                    check=False,
                )
            )
        except subprocess.TimeoutExpired as exc:
            raise MediaQualityError(
                "image_reel_processing_timeout",
                "This picture took too long to turn into a Reel. Try a smaller copy.",
            ) from exc
        except OSError as exc:
            raise MediaQualityError(
                "video_processor_unavailable",
                "GSN could not prepare Reels right now. Please try again shortly.",
            ) from exc

        if completed.returncode != 0 or not destination.is_file():
            destination.unlink(missing_ok=True)
            raise MediaQualityError(
                "image_reel_processing_failed",
                "GSN could not turn this picture into a Reel. Try another JPG, PNG, or WebP image.",
            )

        output_size = destination.stat().st_size
        if output_size <= 0 or output_size > MAX_GSN_NATURAL_FINISH_BYTES:
            destination.unlink(missing_ok=True)
            raise MediaQualityError(
                "image_reel_output_too_large",
                "The prepared Reel is still too large. Try a simpler picture.",
            )

        output_inspection = inspect_video(destination)
        output_has_audio = _source_has_audio(ffmpeg_exe, destination)
        if output_inspection.duration_seconds > finish_seconds + 0.35:
            destination.unlink(missing_ok=True)
            raise MediaQualityError(
                "image_reel_duration_failed",
                "GSN could not keep this Reel within the selected length. Try again.",
            )

        return ImageReelVideo(
            source_width=source_width,
            source_height=source_height,
            output=output_inspection,
            duration_seconds=finish_seconds,
            size_bytes=output_size,
            output_has_audio=output_has_audio,
        )
    finally:
        frame_path.unlink(missing_ok=True)
        overlay_path.unlink(missing_ok=True)


def _uploads_root() -> Path:
    raw = str(os.getenv("GMFN_UPLOADS_DIR", "uploads") or "").strip()
    return Path(raw or "uploads").expanduser()


def verified_marketplace_video_path(value: Any) -> Path | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    path = urlsplit(raw).path
    if not _MANAGED_VIDEO_PATH.fullmatch(path):
        return None

    filename = Path(path).name
    root = _uploads_root().resolve()
    candidate = (root / "marketplace" / "videos" / filename).resolve()
    expected_parent = (root / "marketplace" / "videos").resolve()
    try:
        candidate.relative_to(expected_parent)
    except ValueError:
        return None
    return candidate if candidate.is_file() else None


def is_verified_marketplace_video_url(value: Any) -> bool:
    return verified_marketplace_video_path(value) is not None
