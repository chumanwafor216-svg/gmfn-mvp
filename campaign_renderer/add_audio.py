from __future__ import annotations

import argparse
import html
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any


def build_ssml(spec: dict[str, Any], voice_name: str) -> str:
    pieces: list[str] = []
    for scene in spec["scenes"]:
        narration = html.escape(scene.get("narration", "").strip())
        if narration:
            pieces.append(f"{narration}<break time=\"260ms\"/>")
    body = "\n      ".join(pieces)
    return f"""<?xml version=\"1.0\"?>
<speak version=\"1.0\" xml:lang=\"en-GB\">
  <voice name=\"{html.escape(voice_name)}\">
    <prosody rate=\"+12%\" volume=\"x-loud\">
      {body}
    </prosody>
  </voice>
</speak>
"""


def build_plain_text(spec: dict[str, Any]) -> str:
    return " ".join(scene.get("narration", "").strip() for scene in spec["scenes"] if scene.get("narration", "")).strip()


def lavfi_textfile_path(path: Path) -> str:
    escaped = path.resolve().as_posix().replace(":", "\\:").replace("'", "\\'")
    return f"'{escaped}'"


def synthesize_with_flite(ffmpeg: str, text_path: Path, output_path: Path) -> None:
    filter_arg = f"flite=textfile={lavfi_textfile_path(text_path)}:voice=slt"
    subprocess.run(
        [ffmpeg, "-y", "-f", "lavfi", "-i", filter_arg, str(output_path)],
        check=True,
        capture_output=True,
        text=True,
    )


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def add_audio(render_dir: Path, spec_path: Path, voice_name: str | None = None) -> Path:
    render_dir = render_dir.resolve()
    spec_path = spec_path.resolve()
    manifest_path = render_dir / "render_manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    outputs = manifest["generated_outputs"]
    silent_video = Path(outputs["video_mp4"]).resolve()

    selected_voice = voice_name or spec.get("audio", {}).get("voiceName") or "Microsoft Hazel Desktop"
    ssml_path = render_dir / "narration.ssml"
    narration_text_path = render_dir / "narration.txt"
    narration_wav = render_dir / "narration_tts.wav"
    ssml_path.write_text(build_ssml(spec, selected_voice), encoding="utf-8")
    narration_text_path.write_text(build_plain_text(spec), encoding="utf-8")

    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required to add audio to campaign renders")

    synth_script = Path(__file__).resolve().parent / "tools" / "synthesize_narration.ps1"
    speech_engine = "windows_system_speech"
    try:
        subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(synth_script),
                "-SsmlPath",
                str(ssml_path),
                "-OutputPath",
                str(narration_wav),
                "-VoiceName",
                selected_voice,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError:
        speech_engine = "ffmpeg_flite_slt_fallback"
        synthesize_with_flite(ffmpeg, narration_text_path, narration_wav)

    video_duration = ffprobe_duration(silent_video)
    audio_video = render_dir / f"{spec['campaignId']}_vertical_1080x1920_with_audio.mp4"
    music_filter = (
        "sine=frequency=146.83:sample_rate=44100:duration={duration},"
        "volume=0.014,lowpass=f=1000,afade=t=in:st=0:d=2,"
        "afade=t=out:st={fade_start}:d=3"
    ).format(duration=video_duration, fade_start=max(0, video_duration - 3))

    cmd = [
        ffmpeg,
        "-y",
        "-i",
        str(silent_video),
        "-i",
        str(narration_wav),
        "-f",
        "lavfi",
        "-i",
        music_filter,
        "-filter_complex",
        "[1:a]atempo=1.10,volume=1.35,apad[narration];[2:a]volume=1.0[music];[narration][music]amix=inputs=2:duration=longest:dropout_transition=2[a]",
        "-map",
        "0:v:0",
        "-map",
        "[a]",
        "-c:v",
        "copy",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-t",
        f"{video_duration:.3f}",
        "-movflags",
        "+faststart",
        str(audio_video),
    ]
    subprocess.run(cmd, check=True, capture_output=True, text=True)

    outputs["video_mp4_silent"] = str(silent_video)
    outputs["video_mp4"] = str(audio_video)
    outputs["narration_wav"] = str(narration_wav)
    outputs["narration_ssml"] = str(ssml_path)
    outputs["narration_text"] = str(narration_text_path)
    manifest["audio_status"] = (
        "audio_added_with_local_tts_voiceover_and_generated_copyright_safe_low_volume_music_bed; "
        "requires human listening review before publication"
    )
    manifest["audio_voice"] = selected_voice
    manifest["audio_engine"] = speech_engine
    manifest["generated_outputs"] = outputs
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return audio_video


def main() -> None:
    parser = argparse.ArgumentParser(description="Add narration and a simple generated music bed to a GSN campaign render.")
    parser.add_argument("render_dir")
    parser.add_argument("--spec", required=True)
    parser.add_argument("--voice")
    args = parser.parse_args()
    out = add_audio(Path(args.render_dir), Path(args.spec), args.voice)
    print(out)


if __name__ == "__main__":
    main()
