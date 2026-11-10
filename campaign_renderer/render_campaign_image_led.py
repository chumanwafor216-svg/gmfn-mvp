from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from add_audio import add_audio
from render_campaign import (
    cover_crop,
    draw_logo,
    ease,
    hex_to_rgb,
    lerp,
    load_font,
    resolve_path,
    rounded_panel,
    text_size,
    wrap_text,
    write_srt,
)

RENDERER_ROOT = Path(__file__).resolve().parent


def scene_asset_key(scene: dict[str, Any]) -> str:
    return scene.get("visualAsset") or {
        "headline": "hero",
        "participation": "community",
        "question": "witnessing",
        "identity": "product",
        "pillars": "command",
        "cta": "trustslip",
    }.get(scene["type"], "hero")


def add_vignette(image: Image.Image, strength: int = 132) -> None:
    width, height = image.size
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for i in range(0, 240, 10):
        alpha = int(strength * (1 - i / 240))
        draw.rectangle((i, i, width - i, height - i), outline=(0, 0, 0, alpha), width=10)
    image.alpha_composite(overlay)


def image_led_background(scene: dict[str, Any], progress: float, brand: dict[str, Any], assets: dict[str, Image.Image], size: tuple[int, int]) -> Image.Image:
    width, height = size
    scene_type = scene["type"]
    key = scene_asset_key(scene)
    if key not in assets:
        return Image.new("RGBA", size, (*hex_to_rgb(brand["colors"]["navy"]), 255))

    pan_seed = {
        "headline": (0.43, 0.39, 0.56, 0.42),
        "participation": (0.40, 0.42, 0.55, 0.48),
        "question": (0.44, 0.43, 0.58, 0.50),
        "identity": (0.50, 0.42, 0.50, 0.53),
        "pillars": (0.46, 0.41, 0.58, 0.50),
        "cta": (0.50, 0.44, 0.50, 0.50),
    }.get(scene_type, (0.45, 0.45, 0.55, 0.50))
    pan_x = lerp(pan_seed[0], pan_seed[2], ease(progress))
    pan_y = lerp(pan_seed[1], pan_seed[3], ease(progress))
    bg = cover_crop(assets[key], size, 1.035 + 0.075 * ease(progress), pan_x, pan_y)
    bg = bg.filter(ImageFilter.GaussianBlur(0.35)).convert("RGBA")

    wash = Image.new("RGBA", size, (*hex_to_rgb(brand["colors"]["navy"]), 116))
    bg.alpha_composite(wash)

    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(shadow)
    for y in range(height):
        t = y / max(1, height - 1)
        d.line((0, y, width, y), fill=(0, 0, 0, int(18 + 165 * t)))
    bg.alpha_composite(shadow)
    add_vignette(bg)
    return bg


def draw_subtitle(image: Image.Image, text: str, brand: dict[str, Any], fonts: dict[str, ImageFont.FreeTypeFont]) -> None:
    if not text:
        return
    draw = ImageDraw.Draw(image)
    lines = wrap_text(draw, text, fonts["caption"], 890)[:3]
    line_h = text_size(draw, "Ag", fonts["caption"])[1] + 10
    panel_h = 34 + line_h * len(lines)
    x0, y0, x1, y1 = 76, image.height - panel_h - 82, image.width - 76, image.height - 82
    rounded_panel(image, (x0, y0, x1, y1), 24, (0, 0, 0, 172), None, 0)
    y = y0 + 18
    for line in lines:
        w, _ = text_size(draw, line, fonts["caption"])
        draw.text(((image.width - w) / 2, y), line, font=fonts["caption"], fill=(*hex_to_rgb(brand["colors"]["white"]), 238))
        y += line_h


def draw_word(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, font: ImageFont.ImageFont, fill: tuple[int, int, int, int], shadow: bool = True) -> None:
    x, y = xy
    if shadow:
        draw.text((x + 3, y + 4), text, font=font, fill=(0, 0, 0, 145))
    draw.text((x, y), text, font=font, fill=fill)


def draw_frame_content(image: Image.Image, scene: dict[str, Any], progress: float, spec: dict[str, Any], brand: dict[str, Any], logo: Image.Image, fonts: dict[str, ImageFont.FreeTypeFont]) -> None:
    draw = ImageDraw.Draw(image)
    width, _ = image.size
    scene_type = scene["type"]
    white = (*hex_to_rgb(brand["colors"]["white"]), 255)
    gold = (*hex_to_rgb(brand["colors"]["goldSoft"]), 255)
    green = (*hex_to_rgb(brand["colors"]["green"]), 255)
    muted = (*hex_to_rgb(brand["colors"]["muted"]), 235)

    draw_logo(image, logo, 68, 64, 72, 240)
    draw_word(draw, (154, 74), "GSN", fonts["brand"], white)

    if scene_type == "headline":
        y = int(246 - 38 * (1 - ease(progress)))
        draw_word(draw, (78, y), "YOUR COMMUNITY", fonts["hero"], white)
        draw_word(draw, (78, y + 116), "ALREADY HAS", fonts["hero"], white)
        draw_word(draw, (78, y + 232), "TRUST.", fonts["hero"], green)
        draw.line((82, y + 362, 560, y + 362), fill=gold, width=7)

    elif scene_type == "participation":
        y = 474
        for i, word in enumerate(scene["onScreen"]):
            local = ease((progress - i * 0.12) / 0.30)
            if local <= 0:
                continue
            alpha = int(255 * min(1, local))
            fill = (*hex_to_rgb(brand["colors"]["white"]), alpha)
            draw_word(draw, (96, y), word, fonts["large"], fill)
            draw.line((96, y + 80, 96 + int(540 * local), y + 80), fill=(*hex_to_rgb(brand["colors"]["goldSoft"]), alpha), width=4)
            y += 120

    elif scene_type == "question":
        for idx, bubble in enumerate(["conversation", "meeting", "memory", "chat"]):
            bx = 88 + (idx % 2) * 460
            by = 322 + (idx // 2) * 150 + int(math.sin(progress * math.pi * 2 + idx) * 8)
            rounded_panel(image, (bx, by, bx + 365, by + 78), 26, (247, 250, 255, 44), (242, 199, 102, 88), 2)
            draw.text((bx + 28, by + 22), bubble.upper(), font=fonts["small"], fill=(247, 250, 255, 198))
        draw_word(draw, (82, 782), "BUT WHERE DOES", fonts["heroSmall"], white)
        draw_word(draw, (82, 884), "THAT EVIDENCE GO?", fonts["heroSmall"], gold)

    elif scene_type == "identity":
        rounded_panel(image, (72, 700, 1008, 1014), 34, (1, 10, 16, 178), (242, 199, 102, 130), 2)
        draw_word(draw, (112, 752), "GSN MAKES TRUSTED", fonts["title"], white)
        draw_word(draw, (112, 828), "ACTIVITY MORE VISIBLE", fonts["title"], gold)
        draw.text((112, 930), "Participation. Opportunity. Support. Trust evidence.", font=fonts["body"], fill=muted)

    elif scene_type == "pillars":
        for i, word in enumerate(scene["onScreen"]):
            local = ease((progress - i * 0.13) / 0.32)
            if local <= 0:
                continue
            y = 330 + i * 190
            alpha = int(255 * min(1, local))
            rounded_panel(image, (80, y, 1000, y + 112), 30, (0, 0, 0, int(112 + 42 * local)), (242, 199, 102, int(95 * local)), 2)
            fill = gold if word == "TRUST" else white
            draw_word(draw, (122, y + 22), word, fonts["pillar"], (*fill[:3], alpha))

    elif scene_type == "cta":
        draw_logo(image, logo, 390, 238, 300, 255)
        draw_word(draw, (86, 650), "YOUR COMMUNITY CAN HELP", fonts["title"], white)
        draw_word(draw, (86, 728), "SHAPE WHAT COMES NEXT.", fonts["title"], gold)
        rounded_panel(image, (84, 984, 996, 1192), 70, (*hex_to_rgb(brand["colors"]["green"]), 236), (*hex_to_rgb(brand["colors"]["goldSoft"]), 180), 4)
        cta = spec.get("ctaText", brand["defaultCta"]).upper()
        w, _ = text_size(draw, cta, fonts["cta"])
        draw.text(((width - w) / 2, 1030), cta, font=fonts["cta"], fill=white)
        url = "globalsupportnetwork.org/pilot/"
        w, _ = text_size(draw, url, fonts["url"])
        draw.text(((width - w) / 2, 1110), url, font=fonts["url"], fill=(255, 255, 255, 242))

    draw_subtitle(image, scene.get("narration", ""), brand, fonts)


def apply_scene_fade(image: Image.Image, scene_progress: float, scene_duration: float) -> Image.Image:
    fade_seconds = 0.36
    local_time = scene_progress * scene_duration
    remaining = scene_duration - local_time
    amount = 0.0
    if local_time < fade_seconds:
        amount = max(amount, 1 - local_time / fade_seconds)
    if remaining < fade_seconds:
        amount = max(amount, 1 - remaining / fade_seconds)
    if amount <= 0:
        return image
    image.alpha_composite(Image.new("RGBA", image.size, (0, 0, 0, int(170 * amount))))
    return image


def make_frame(time_s: float, spec: dict[str, Any], brand: dict[str, Any], logo: Image.Image, assets: dict[str, Image.Image], fonts: dict[str, ImageFont.FreeTypeFont]) -> Image.Image:
    video = spec["outputs"]["video"]
    size = (int(video["width"]), int(video["height"]))
    scene = spec["scenes"][-1]
    for candidate in spec["scenes"]:
        if candidate["start"] <= time_s < candidate["end"]:
            scene = candidate
            break
    duration = scene["end"] - scene["start"]
    progress = (time_s - scene["start"]) / duration
    image = image_led_background(scene, progress, brand, assets, size)
    draw_frame_content(image, scene, progress, spec, brand, logo, fonts)
    return apply_scene_fade(image, progress, duration).convert("RGB")


def render_static(spec: dict[str, Any], brand: dict[str, Any], logo: Image.Image, assets: dict[str, Image.Image], fonts: dict[str, ImageFont.FreeTypeFont], out_dir: Path) -> dict[str, str]:
    outputs: dict[str, str] = {}
    thumb = out_dir / "thumbnail_1080x1920.png"
    make_frame(1.6, spec, brand, logo, assets, fonts).save(thumb)
    outputs["thumbnail"] = str(thumb)

    end_path = out_dir / "end_card_1080x1920.png"
    make_frame(31.4, spec, brand, logo, assets, fonts).save(end_path)
    outputs["end_card"] = str(end_path)

    poster = make_frame(2.2, spec, brand, logo, assets, fonts).resize((1080, 1920), Image.Resampling.LANCZOS).crop((0, 180, 1080, 1530))
    poster_path = out_dir / "poster_1080x1350.png"
    poster.save(poster_path)
    outputs["poster_1080x1350"] = str(poster_path)

    square = poster.crop((0, 135, 1080, 1215))
    square_path = out_dir / "square_1080x1080.png"
    square.save(square_path)
    outputs["square_1080"] = str(square_path)
    return outputs


def render_campaign(spec_path: Path, brand_path: Path, output_root: Path, keep_frames: bool) -> Path:
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    brand = json.loads(brand_path.read_text(encoding="utf-8"))
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_dir = output_root / f"{spec['campaignId']}_{spec['version']}_{timestamp}"
    frames_dir = out_dir / "frames"
    frames_dir.mkdir(parents=True, exist_ok=True)

    logo = Image.open(resolve_path(brand["logoPath"]))
    assets = {key: Image.open(resolve_path(value)) for key, value in spec.get("assets", {}).items()}
    fonts = {
        "brand": load_font(brand["fonts"]["bold"], 42),
        "small": load_font(brand["fonts"]["regular"], 28),
        "caption": load_font(brand["fonts"]["regular"], 34),
        "body": load_font(brand["fonts"]["regular"], 38),
        "large": load_font(brand["fonts"]["bold"], 58),
        "title": load_font(brand["fonts"]["bold"], 56),
        "hero": load_font(brand["fonts"]["bold"], 92),
        "heroSmall": load_font(brand["fonts"]["bold"], 76),
        "pillar": load_font(brand["fonts"]["bold"], 74),
        "cta": load_font(brand["fonts"]["bold"], 47),
        "url": load_font(brand["fonts"]["regular"], 44),
    }

    fps = int(spec["outputs"]["video"].get("fps", 12))
    duration = float(spec["outputs"]["video"].get("durationSeconds", spec["scenes"][-1]["end"]))
    total_frames = int(duration * fps)
    for frame_index in range(total_frames):
        frame = make_frame(frame_index / fps, spec, brand, logo, assets, fonts)
        frame.save(frames_dir / f"frame_{frame_index:05d}.png")

    static_outputs = render_static(spec, brand, logo, assets, fonts, out_dir)
    captions_path = out_dir / "captions.srt"
    write_srt(spec, captions_path)

    mp4_path = out_dir / f"{spec['campaignId']}_vertical_1080x1920_silent.mp4"
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required to render MP4 output")
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-framerate",
            str(fps),
            "-i",
            str(frames_dir / "frame_%05d.png"),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-movflags",
            "+faststart",
            str(mp4_path),
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    manifest = {
        "campaign_id": spec["campaignId"],
        "renderer_case_id": spec.get("rendererCaseId"),
        "version": spec.get("version"),
        "date_time_generated_utc": timestamp,
        "campaign_theme": spec.get("theme"),
        "source_spec": str(spec_path),
        "brand_config": str(brand_path),
        "generated_outputs": {
            "video_mp4": str(mp4_path),
            "captions_srt": str(captions_path),
            **static_outputs,
        },
        "platform_variants": ["vertical_1080x1920", "poster_1080x1350", "square_1080", "thumbnail", "end_card"],
        "cta": {"text": spec.get("ctaText"), "url": spec.get("ctaUrl")},
        "render_status": "rendered_for_human_review_not_published",
        "audio_status": "silent_render_created; audio post-processing not yet run",
        "approval_boundary": spec.get("approvalBoundary"),
    }
    (out_dir / "render_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    if spec.get("audio", {}).get("tts"):
        add_audio(out_dir, spec_path, spec.get("audio", {}).get("voiceName"))

    if not keep_frames:
        shutil.rmtree(frames_dir)
    return out_dir


def main() -> None:
    parser = argparse.ArgumentParser(description="Render image-led GSN campaign assets from structured JSON.")
    parser.add_argument("--spec", default="campaign_renderer/specs/campaign-001-youtube-v2.json")
    parser.add_argument("--brand", default="campaign_renderer/brand.gsn.json")
    parser.add_argument("--output-root", default="campaign_renderer/renders")
    parser.add_argument("--keep-frames", action="store_true")
    args = parser.parse_args()
    out = render_campaign(Path(args.spec).resolve(), Path(args.brand).resolve(), Path(args.output_root).resolve(), args.keep_frames)
    print(out)


if __name__ == "__main__":
    main()
