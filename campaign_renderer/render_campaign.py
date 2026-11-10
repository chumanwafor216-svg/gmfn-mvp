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

RENDERER_ROOT = Path(__file__).resolve().parent
REPO_ROOT = RENDERER_ROOT.parent


def hex_to_rgb(value: str) -> tuple[int, int, int]:
    value = value.strip().lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def resolve_path(path_value: str) -> Path:
    path = Path(path_value)
    if path.is_absolute():
        return path
    return (RENDERER_ROOT / path).resolve()


def load_font(path_value: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(resolve_path(path_value)), size=size)


def ease(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def color_lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(lerp(a[i], b[i], t)) for i in range(3))


def text_size(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont) -> tuple[int, int]:
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0], box[3] - box[1]


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        probe = word if not current else f"{current} {word}"
        if text_size(draw, probe, font)[0] <= max_width:
            current = probe
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_centered_lines(
    draw: ImageDraw.ImageDraw,
    lines: list[str],
    center_x: int,
    top_y: int,
    fonts: list[ImageFont.ImageFont] | ImageFont.ImageFont,
    fills: list[tuple[int, int, int, int]] | tuple[int, int, int, int],
    line_gap: int = 16,
) -> int:
    y = top_y
    for i, line in enumerate(lines):
        font = fonts[i] if isinstance(fonts, list) else fonts
        fill = fills[i] if isinstance(fills, list) else fills
        w, h = text_size(draw, line, font)
        draw.text((center_x - w / 2, y), line, font=font, fill=fill)
        y += h + line_gap
    return y


def rounded_panel(image: Image.Image, xy: tuple[int, int, int, int], radius: int, fill: tuple[int, int, int, int], outline: tuple[int, int, int, int] | None = None, width: int = 2) -> None:
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)
    image.alpha_composite(overlay)


def cover_crop(img: Image.Image, size: tuple[int, int], zoom: float = 1.0, pan_x: float = 0.5, pan_y: float = 0.5) -> Image.Image:
    target_w, target_h = size
    img = img.convert("RGB")
    scale = max(target_w / img.width, target_h / img.height) * zoom
    new_w = max(target_w, int(img.width * scale))
    new_h = max(target_h, int(img.height * scale))
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    max_x = max(0, new_w - target_w)
    max_y = max(0, new_h - target_h)
    left = int(max_x * max(0, min(1, pan_x)))
    top = int(max_y * max(0, min(1, pan_y)))
    return resized.crop((left, top, left + target_w, top + target_h))


def gradient_background(width: int, height: int, brand: dict[str, Any]) -> Image.Image:
    c1 = hex_to_rgb(brand["colors"]["navy"])
    c2 = hex_to_rgb(brand["colors"]["navy3"])
    img = Image.new("RGB", (width, height), c1)
    draw = ImageDraw.Draw(img)
    for y in range(height):
        t = y / max(1, height - 1)
        draw.line((0, y, width, y), fill=color_lerp(c1, c2, t))
    return img.convert("RGBA")


def draw_network(draw: ImageDraw.ImageDraw, width: int, height: int, brand: dict[str, Any], alpha: int = 95) -> None:
    gold = (*hex_to_rgb(brand["colors"]["goldSoft"]), alpha)
    green = (*hex_to_rgb(brand["colors"]["green"]), alpha)
    points = [(130, 280), (315, 220), (520, 335), (735, 250), (910, 390), (250, 880), (530, 780), (825, 960), (640, 1240)]
    for i in range(len(points) - 1):
        draw.line((*points[i], *points[i + 1]), fill=(*gold[:3], max(22, alpha // 3)), width=3)
    for idx, (x, y) in enumerate(points):
        color = green if idx % 3 == 0 else gold
        draw.ellipse((x - 10, y - 10, x + 10, y + 10), fill=color)


def draw_logo(image: Image.Image, logo: Image.Image, x: int, y: int, size: int, alpha: int = 255) -> None:
    mark = logo.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
    if alpha < 255:
        a = mark.getchannel("A").point(lambda v: int(v * alpha / 255))
        mark.putalpha(a)
    image.alpha_composite(mark, (x, y))


def draw_caption(image: Image.Image, narration: str, brand: dict[str, Any], fonts: dict[str, ImageFont.FreeTypeFont]) -> None:
    if not narration:
        return
    draw = ImageDraw.Draw(image)
    max_width = 880
    lines = wrap_text(draw, narration, fonts["caption"], max_width)
    line_h = text_size(draw, "Ag", fonts["caption"])[1] + 12
    panel_h = max(92, 34 + line_h * len(lines))
    x0, y0, x1, y1 = 70, image.height - panel_h - 78, image.width - 70, image.height - 78
    rounded_panel(image, (x0, y0, x1, y1), 30, (2, 12, 20, 205), (*hex_to_rgb(brand["colors"]["gold"]), 155), 2)
    y = y0 + 26
    for line in lines[:3]:
        w, h = text_size(draw, line, fonts["caption"])
        draw.text(((image.width - w) / 2, y), line, font=fonts["caption"], fill=(*hex_to_rgb(brand["colors"]["white"]), 238))
        y += line_h


def draw_brand_header(image: Image.Image, brand: dict[str, Any], logo: Image.Image, fonts: dict[str, ImageFont.FreeTypeFont]) -> None:
    draw_logo(image, logo, 74, 68, 72)
    draw = ImageDraw.Draw(image)
    draw.text((164, 77), "GSN", font=fonts["brand"], fill=(*hex_to_rgb(brand["colors"]["white"]), 245))
    draw.text((164, 124), "Global Support Network", font=fonts["small"], fill=(*hex_to_rgb(brand["colors"]["goldSoft"]), 230))


def scene_background(scene_type: str, progress: float, spec: dict[str, Any], brand: dict[str, Any], assets: dict[str, Image.Image], size: tuple[int, int]) -> Image.Image:
    width, height = size
    if scene_type in {"participation", "identity"}:
        key = "hero" if scene_type == "participation" else "witnessing"
        bg = cover_crop(assets[key], size, 1.05 + 0.05 * progress, 0.44 + 0.08 * progress, 0.42)
        bg = bg.filter(ImageFilter.GaussianBlur(1.2)).convert("RGBA")
        overlay = Image.new("RGBA", size, (*hex_to_rgb(brand["colors"]["navy"]), 168))
        bg.alpha_composite(overlay)
        return bg
    return gradient_background(width, height, brand)


def draw_scene(image: Image.Image, scene: dict[str, Any], progress: float, spec: dict[str, Any], brand: dict[str, Any], logo: Image.Image, fonts: dict[str, ImageFont.FreeTypeFont]) -> None:
    draw = ImageDraw.Draw(image)
    width, height = image.size
    scene_type = scene["type"]
    white = (*hex_to_rgb(brand["colors"]["white"]), 255)
    gold = (*hex_to_rgb(brand["colors"]["goldSoft"]), 255)
    green = (*hex_to_rgb(brand["colors"]["green"]), 255)
    muted = (*hex_to_rgb(brand["colors"]["muted"]), 235)

    draw_network(draw, width, height, brand, 85)
    draw_brand_header(image, brand, logo, fonts)

    if scene_type == "headline":
        y = int(470 - 55 * (1 - ease(progress)))
        fonts_list = [fonts["hero"], fonts["hero"]]
        fills = [white, white]
        draw_centered_lines(draw, ["YOUR COMMUNITY", "ALREADY HAS TRUST."], width // 2, y, fonts_list, fills, 22)
        trust_w, _ = text_size(draw, "TRUST.", fonts["hero"])
        line_w, _ = text_size(draw, "ALREADY HAS TRUST.", fonts["hero"])
        tx = width // 2 - line_w / 2 + (line_w - trust_w)
        draw.text((tx, y + 112), "TRUST.", font=fonts["hero"], fill=green)
        draw.text((width // 2 - 330, y + 260), "People know who participates. Who contributes. Who follows through.", font=fonts["body"], fill=muted)

    elif scene_type == "participation":
        rounded_panel(image, (70, 340, 1010, 1040), 42, (2, 12, 20, 168), (*hex_to_rgb(brand["colors"]["gold"]), 120), 2)
        y = 415
        for i, line in enumerate(scene["onScreen"]):
            delay = i * 0.14
            local = ease((progress - delay) / 0.35)
            if local <= 0:
                continue
            alpha = int(255 * min(1, local))
            draw.text((125, y + int(24 * (1 - local))), line, font=fonts["large"], fill=(*hex_to_rgb(brand["colors"]["white"]), alpha))
            y += 122

    elif scene_type == "question":
        for idx, bubble in enumerate(["conversation", "meeting notes", "memory", "old list"]):
            bx = 110 + (idx % 2) * 470
            by = 380 + (idx // 2) * 185 + int(math.sin(progress * math.pi * 2 + idx) * 10)
            rounded_panel(image, (bx, by, bx + 360, by + 86), 28, (247, 250, 255, 38), (242, 199, 102, 80), 2)
            draw.text((bx + 32, by + 25), bubble, font=fonts["small"], fill=(247, 250, 255, 185))
        draw_centered_lines(draw, scene["onScreen"], width // 2, 780, fonts["heroSmall"], [white, gold], 20)

    elif scene_type == "identity":
        logo_size = int(300 + 40 * ease(progress))
        draw_logo(image, logo, (width - logo_size) // 2, 380, logo_size)
        draw_centered_lines(draw, scene["onScreen"], width // 2, 740, fonts["title"], [white, gold], 20)
        line = "Participation. Opportunity. Support. Trusted activity."
        w, _ = text_size(draw, line, fonts["body"])
        draw.text(((width - w) / 2, 1030), line, font=fonts["body"], fill=muted)

    elif scene_type == "pillars":
        words = scene["onScreen"]
        for i, word in enumerate(words):
            local = ease((progress - i * 0.16) / 0.32)
            if local <= 0:
                continue
            cx = width // 2
            y = 430 + i * 220
            alpha = int(255 * min(1, local))
            rounded_panel(image, (140, y - 50, 940, y + 98), 42, (247, 250, 255, int(22 + 42 * local)), (*hex_to_rgb(brand["colors"]["gold"]), int(90 * local)), 2)
            w, h = text_size(draw, word, fonts["pillar"])
            fill = gold if word == "TRUST" else white
            draw.text((cx - w / 2, y - h / 2), word, font=fonts["pillar"], fill=(*fill[:3], alpha))

    elif scene_type == "cta":
        draw_logo(image, logo, 390, 260, 300)
        draw_centered_lines(draw, ["YOUR COMMUNITY CAN HELP", "SHAPE WHAT COMES NEXT."], width // 2, 640, fonts["title"], [white, white], 18)
        rounded_panel(image, (88, 990, 992, 1188), 76, (*hex_to_rgb(brand["colors"]["green"]), 235), (*hex_to_rgb(brand["colors"]["goldSoft"]), 185), 4)
        cta = spec.get("ctaText", brand["defaultCta"]).upper()
        w, _ = text_size(draw, cta, fonts["cta"])
        draw.text(((width - w) / 2, 1034), cta, font=fonts["cta"], fill=white)
        url = "globalsupportnetwork.org/pilot/"
        w, _ = text_size(draw, url, fonts["url"])
        draw.text(((width - w) / 2, 1110), url, font=fonts["url"], fill=(255, 255, 255, 240))
        footer = "Founder review draft - not published"
        w, _ = text_size(draw, footer, fonts["small"])
        draw.text(((width - w) / 2, 1340), footer, font=fonts["small"], fill=(247, 250, 255, 150))

    draw_caption(image, scene.get("narration", ""), brand, fonts)


def apply_scene_fade(image: Image.Image, scene_progress: float, scene_duration: float) -> Image.Image:
    fade_seconds = 0.42
    local_time = scene_progress * scene_duration
    remaining = scene_duration - local_time
    amount = 0.0
    if local_time < fade_seconds:
        amount = max(amount, 1 - local_time / fade_seconds)
    if remaining < fade_seconds:
        amount = max(amount, 1 - remaining / fade_seconds)
    if amount <= 0:
        return image
    overlay = Image.new("RGBA", image.size, (0, 0, 0, int(180 * amount)))
    image.alpha_composite(overlay)
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
    image = scene_background(scene["type"], progress, spec, brand, assets, size)
    draw_scene(image, scene, progress, spec, brand, logo, fonts)
    return apply_scene_fade(image, progress, duration).convert("RGB")


def write_srt(spec: dict[str, Any], out_path: Path) -> None:
    def stamp(seconds: float) -> str:
        ms = int(round((seconds - int(seconds)) * 1000))
        total = int(seconds)
        h = total // 3600
        m = (total % 3600) // 60
        s = total % 60
        return f"{h:02}:{m:02}:{s:02},{ms:03}"

    lines = []
    for idx, scene in enumerate(spec["scenes"], 1):
        lines.append(str(idx))
        lines.append(f"{stamp(scene['start'])} --> {stamp(scene['end'])}")
        lines.append(scene.get("narration", ""))
        lines.append("")
    out_path.write_text("\n".join(lines), encoding="utf-8")


def render_static(spec: dict[str, Any], brand: dict[str, Any], logo: Image.Image, assets: dict[str, Image.Image], fonts: dict[str, ImageFont.FreeTypeFont], out_dir: Path) -> dict[str, str]:
    outputs: dict[str, str] = {}
    frame0 = make_frame(1.4, spec, brand, logo, assets, fonts)
    thumb = out_dir / "thumbnail_1080x1920.png"
    frame0.save(thumb)
    outputs["thumbnail"] = str(thumb)

    end = make_frame(31.0, spec, brand, logo, assets, fonts)
    end_path = out_dir / "end_card_1080x1920.png"
    end.save(end_path)
    outputs["end_card"] = str(end_path)

    poster = Image.new("RGBA", (1080, 1350), hex_to_rgb(brand["colors"]["navy"]) + (255,))
    poster.alpha_composite(gradient_background(1080, 1350, brand))
    d = ImageDraw.Draw(poster)
    draw_network(d, 1080, 1350, brand, 80)
    draw_logo(poster, logo, 74, 64, 96)
    d.text((190, 86), "GSN", font=fonts["brand"], fill=(*hex_to_rgb(brand["colors"]["white"]), 255))
    d.text((74, 300), "YOUR COMMUNITY\nALREADY HAS TRUST.", font=fonts["posterHero"], fill=(*hex_to_rgb(brand["colors"]["white"]), 255), spacing=18)
    d.text((74, 585), "People know who participates.\nWho contributes. Who helps.\nWho follows through.", font=fonts["posterBody"], fill=(*hex_to_rgb(brand["colors"]["muted"]), 240), spacing=12)
    rounded_panel(poster, (74, 840, 1006, 1040), 52, (*hex_to_rgb(brand["colors"]["green"]), 235), (*hex_to_rgb(brand["colors"]["goldSoft"]), 170), 4)
    d.text((135, 887), "JOIN THE GSN COMMUNITY PILOT", font=fonts["posterCta"], fill=(*hex_to_rgb(brand["colors"]["white"]), 255))
    d.text((135, 962), "globalsupportnetwork.org/pilot/", font=fonts["url"], fill=(255, 255, 255, 240))
    d.text((74, 1232), f"{spec['campaignId']} - Founder review draft", font=fonts["small"], fill=(*hex_to_rgb(brand["colors"]["goldSoft"]), 205))
    poster_path = out_dir / "poster_1080x1350.png"
    poster.convert("RGB").save(poster_path)
    outputs["poster_1080x1350"] = str(poster_path)

    square = poster.crop((0, 0, 1080, 1080))
    square_path = out_dir / "square_1080x1080.png"
    square.convert("RGB").save(square_path)
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
        "title": load_font(brand["fonts"]["bold"], 58),
        "hero": load_font(brand["fonts"]["bold"], 92),
        "heroSmall": load_font(brand["fonts"]["bold"], 76),
        "pillar": load_font(brand["fonts"]["bold"], 74),
        "cta": load_font(brand["fonts"]["bold"], 47),
        "url": load_font(brand["fonts"]["regular"], 44),
        "posterHero": load_font(brand["fonts"]["bold"], 76),
        "posterBody": load_font(brand["fonts"]["regular"], 42),
        "posterCta": load_font(brand["fonts"]["bold"], 46),
    }

    fps = int(spec["outputs"]["video"].get("fps", 12))
    duration = float(spec["outputs"]["video"].get("durationSeconds", spec["scenes"][-1]["end"]))
    total_frames = int(duration * fps)
    for frame_index in range(total_frames):
        t = frame_index / fps
        frame = make_frame(t, spec, brand, logo, assets, fonts)
        frame.save(frames_dir / f"frame_{frame_index:05d}.png")

    static_outputs = render_static(spec, brand, logo, assets, fonts, out_dir)
    captions_path = out_dir / "captions.srt"
    write_srt(spec, captions_path)

    mp4_path = out_dir / f"{spec['campaignId']}_vertical_1080x1920.mp4"
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required to render MP4 output")
    cmd = [
        ffmpeg,
        "-y",
        "-framerate", str(fps),
        "-i", str(frames_dir / "frame_%05d.png"),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-movflags", "+faststart",
        str(mp4_path),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

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
        "audio_status": "no narration audio file supplied; rendered silent MP4 with captions/subtitles on screen and SRT file",
        "approval_boundary": spec.get("approvalBoundary"),
    }
    (out_dir / "render_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    if not keep_frames:
        shutil.rmtree(frames_dir)
    return out_dir


def main() -> None:
    parser = argparse.ArgumentParser(description="Render GSN campaign assets from structured JSON.")
    parser.add_argument("--spec", default="campaign_renderer/specs/campaign-001.json")
    parser.add_argument("--brand", default="campaign_renderer/brand.gsn.json")
    parser.add_argument("--output-root", default="campaign_renderer/renders")
    parser.add_argument("--keep-frames", action="store_true")
    args = parser.parse_args()
    out = render_campaign(Path(args.spec).resolve(), Path(args.brand).resolve(), Path(args.output_root).resolve(), args.keep_frames)
    print(out)


if __name__ == "__main__":
    main()