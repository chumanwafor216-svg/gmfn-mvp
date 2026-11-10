from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from PIL import Image

REQUIRED_OUTPUTS = [
    "video_mp4",
    "captions_srt",
    "thumbnail",
    "end_card",
    "poster_1080x1350",
    "square_1080",
]

EXPECTED_SIZES = {
    "thumbnail": (1080, 1920),
    "end_card": (1080, 1920),
    "poster_1080x1350": (1080, 1350),
    "square_1080": (1080, 1080),
}


def ffprobe_video(path: Path) -> dict:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height,avg_frame_rate,duration",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    data = json.loads(result.stdout)
    return data["streams"][0]


def ffprobe_audio(path: Path) -> list[dict]:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "a",
            "-show_entries",
            "stream=codec_type,codec_name,duration",
            "-of",
            "json",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(result.stdout).get("streams", [])


def assert_image(path: Path, expected: tuple[int, int]) -> None:
    with Image.open(path) as img:
        if img.size != expected:
            raise AssertionError(f"{path} expected {expected}, got {img.size}")
        colors = set()
        dark = 0
        samples = 0
        step_x = max(1, img.width // 24)
        step_y = max(1, img.height // 24)
        rgb = img.convert("RGB")
        for y in range(0, img.height, step_y):
            for x in range(0, img.width, step_x):
                pixel = rgb.getpixel((x, y))
                colors.add(pixel)
                if sum(pixel) < 180:
                    dark += 1
                samples += 1
        if len(colors) < 8:
            raise AssertionError(f"{path} appears too uniform: {len(colors)} sampled colors")
        if dark < 3:
            raise AssertionError(f"{path} appears too light/blank: {dark}/{samples} dark samples")


def main() -> None:
    parser = argparse.ArgumentParser(description="Verify a GSN campaign render output directory.")
    parser.add_argument("render_dir")
    args = parser.parse_args()
    render_dir = Path(args.render_dir).resolve()
    manifest_path = render_dir / "render_manifest.json"
    if not manifest_path.exists():
        raise AssertionError(f"Missing manifest: {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    outputs = manifest.get("generated_outputs", {})
    for key in REQUIRED_OUTPUTS:
        if key not in outputs:
            raise AssertionError(f"Missing output key: {key}")
        if not Path(outputs[key]).exists():
            raise AssertionError(f"Missing output file for {key}: {outputs[key]}")

    video_path = Path(outputs["video_mp4"])
    video = ffprobe_video(video_path)
    if int(video["width"]) != 1080 or int(video["height"]) != 1920:
        raise AssertionError(f"Unexpected video dimensions: {video}")
    duration = float(video["duration"])
    if duration < 30 or duration > 45:
        raise AssertionError(f"Unexpected video duration: {duration}")
    if "audio_added" in manifest.get("audio_status", ""):
        audio_streams = ffprobe_audio(video_path)
        if not audio_streams:
            raise AssertionError("Manifest says audio was added, but the MP4 has no audio stream")

    for key, size in EXPECTED_SIZES.items():
        assert_image(Path(outputs[key]), size)

    captions = Path(outputs["captions_srt"]).read_text(encoding="utf-8")
    if "Join the GSN Community Pilot" not in captions:
        raise AssertionError("Captions do not include final CTA narration")
    if manifest.get("render_status") != "rendered_for_human_review_not_published":
        raise AssertionError("Render status must remain human-review/not-published")

    print(f"Render verification passed: {render_dir}")
    print(f"Video: 1080x1920, {duration:.1f}s, {video.get('avg_frame_rate')}")


if __name__ == "__main__":
    main()
