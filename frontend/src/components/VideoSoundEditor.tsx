import React, { useEffect, useRef, useState } from "react";
import type {
  MarketplaceVideoSoundMode,
  MarketplaceVideoSoundOptions,
} from "../lib/api";
import { SecondaryButton, StableButton } from "./StableButton";
import {
  brandHelperText,
  brandInnerCard,
  brandSectionLabel,
  gmfnBrand,
} from "../styles/gmfnBrand";

const MAX_SOUND_BYTES = 15 * 1024 * 1024;
const MAX_RECORDING_SECONDS = 10;
const SOUND_ACCEPT =
  "audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/ogg,audio/webm,.mp3,.m4a,.aac,.wav,.ogg,.webm";

type Props = {
  value: MarketplaceVideoSoundOptions | null;
  onChange: (value: MarketplaceVideoSoundOptions | null) => void;
  disabled?: boolean;
  debugIdPrefix: string;
};

function supportedRecordingMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/webm",
  ]) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export default function VideoSoundEditor({
  value,
  onChange,
  disabled = false,
  debugIdPrefix,
}: Props) {
  const [open, setOpen] = useState(Boolean(value));
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const previewUrl = value ? URL.createObjectURL(value.file) : "";

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function useSoundFile(file: File, source: "file" | "recording") {
    setError("");
    if ((file.size || 0) <= 0) {
      setError("This sound file is empty. Choose another file.");
      return;
    }
    if (file.size > MAX_SOUND_BYTES) {
      setError("Choose a sound file no larger than 15 MB.");
      return;
    }
    onChange({
      file,
      mode: value?.mode || "mix",
      rightsConfirmed: false,
      source,
    });
    setOpen(true);
  }

  function updateMode(mode: MarketplaceVideoSoundMode) {
    if (!value) return;
    onChange({ ...value, mode });
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function startRecording() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Audio recording is not available on this phone or browser. Choose a sound file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = supportedRecordingMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      setRecordingSeconds(0);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (timerRef.current != null) window.clearInterval(timerRef.current);
        timerRef.current = null;
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setRecording(false);
        const finalType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalType });
        const extension = finalType.includes("mp4") ? "m4a" : "webm";
        useSoundFile(
          new File([blob], `gsn-sound-${Date.now()}.${extension}`, {
            type: finalType,
          }),
          "recording"
        );
      };
      recorder.start();
      setRecording(true);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => {
          const next = current + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            window.setTimeout(stopRecording, 0);
          }
          return Math.min(next, MAX_RECORDING_SECONDS);
        });
      }, 1000);
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecording(false);
      setError("GSN could not use the microphone. Allow microphone access or choose a sound file.");
    }
  }

  return (
    <div style={{ ...brandInnerCard(), padding: 12, marginTop: 12 }}>
      <StableButton
        type="button"
        kind="secondary"
        fullWidth
        stableHeight={44}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        debugId={`${debugIdPrefix}.toggle`}
      >
        {open ? "Close sound options" : value ? "Sound ready" : "+ Add sound (optional)"}
      </StableButton>

      {open ? (
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <div>
            <div style={brandSectionLabel()}>Sound for this video</div>
            <p style={{ ...brandHelperText(), margin: "5px 0 0" }}>
              Record a short voice or choose sound you created or have permission to use.
            </p>
          </div>

          <label
            style={{
              display: "grid",
              gap: 6,
              color: gmfnBrand.colors.ink,
              fontWeight: 850,
              fontSize: 13,
            }}
          >
            Choose sound file
            <input
              type="file"
              accept={SOUND_ACCEPT}
              disabled={disabled || recording}
              data-gmfn-action-root="true"
              data-cta-id={`${debugIdPrefix}.file`}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0] || null;
                if (file) useSoundFile(file, "file");
                event.currentTarget.value = "";
              }}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 14,
                border: `1px solid ${gmfnBrand.colors.line}`,
                background: gmfnBrand.colors.panel,
                color: gmfnBrand.colors.ink,
              }}
            />
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SecondaryButton
              type="button"
              disabled={disabled || recording}
              onClick={startRecording}
              debugId={`${debugIdPrefix}.record`}
            >
              Record sound
            </SecondaryButton>
            {recording ? (
              <StableButton
                type="button"
                kind="danger"
                onClick={stopRecording}
                debugId={`${debugIdPrefix}.stop-recording`}
              >
                Stop - {recordingSeconds}s
              </StableButton>
            ) : null}
          </div>

          {value ? (
            <>
              <audio
                src={previewUrl}
                controls
                preload="metadata"
                style={{ width: "100%" }}
                data-audio-preview={debugIdPrefix}
              />
              <div
                role="group"
                aria-label="How to add this sound"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
              >
                {(
                  [
                    ["mix", "Add over video"],
                    ["replace", "Replace video sound"],
                  ] as const
                ).map(([mode, label]) => (
                  <StableButton
                    key={mode}
                    type="button"
                    kind={value.mode === mode ? "primary" : "secondary"}
                    disabled={disabled}
                    onClick={() => updateMode(mode)}
                    debugId={`${debugIdPrefix}.mode-${mode}`}
                    style={{ minHeight: 48 }}
                  >
                    {label}
                  </StableButton>
                ))}
              </div>
              <label
                style={{
                  display: "flex",
                  gap: 9,
                  alignItems: "flex-start",
                  color: gmfnBrand.colors.ink,
                  fontSize: 13,
                  lineHeight: 1.45,
                  fontWeight: 760,
                }}
              >
                <input
                  type="checkbox"
                  checked={value.rightsConfirmed}
                  disabled={disabled}
                  onChange={(event) =>
                    onChange({ ...value, rightsConfirmed: event.currentTarget.checked })
                  }
                  data-cta-id={`${debugIdPrefix}.rights`}
                  style={{ marginTop: 3, width: 18, height: 18 }}
                />
                I created this sound or have permission to use it.
              </label>
              {!value.rightsConfirmed ? (
                <p style={{ ...brandHelperText(), margin: 0, color: "#8A5A00" }}>
                  Confirm permission before GSN can prepare the video.
                </p>
              ) : null}
              <SecondaryButton
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(null);
                  setError("");
                }}
                debugId={`${debugIdPrefix}.remove`}
              >
                Remove sound
              </SecondaryButton>
            </>
          ) : null}

          {error ? (
            <p role="alert" style={{ margin: 0, color: "#991B1B", fontWeight: 800 }}>
              {error}
            </p>
          ) : null}
          <p style={{ ...brandHelperText(), margin: 0 }}>
            GSN does not provide a popular-music library yet. Music licensing and rights management must be established first.
          </p>
        </div>
      ) : null}
    </div>
  );
}
