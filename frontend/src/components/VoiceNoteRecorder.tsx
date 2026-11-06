import React, { useEffect, useMemo, useRef, useState } from "react";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import { PrimaryButton, SecondaryButton, SubtleButton } from "./StableButton";

type VoiceNoteRecorderProps = {
  value: File | null;
  onChange: (file: File | null) => void;
  onRecordingChange?: (recording: boolean) => void;
  maxSeconds?: number;
  disabled?: boolean;
  debugPrefix: string;
  compact?: boolean;
};

function preferredMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const options = [
    "audio/webm;codecs=opus",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "audio/webm",
  ];
  return options.find((value) => MediaRecorder.isTypeSupported(value)) || "";
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4")) return "m4a";
  return "webm";
}

export default function VoiceNoteRecorder({
  value,
  onChange,
  onRecordingChange,
  maxSeconds = 60,
  disabled = false,
  debugPrefix,
  compact = false,
}: VoiceNoteRecorderProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const previewUrl = useMemo(
    () => (value ? URL.createObjectURL(value) : ""),
    [value]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function startRecording() {
    setError("");
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      setSeconds(0);
      setRecording(true);
      onRecordingChange?.(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        recorderRef.current = null;
        const resolvedMimeType =
          recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: resolvedMimeType });
        chunksRef.current = [];
        if (blob.size > 0) {
          onChange(
            new File(
              [blob],
              `voice-note-${Date.now()}.${extensionForMime(resolvedMimeType)}`,
              { type: resolvedMimeType }
            )
          );
        } else {
          setError("No voice was captured. Record again before sending.");
        }
        setRecording(false);
        onRecordingChange?.(false);
      };
      recorder.start(250);
      timerRef.current = window.setInterval(() => {
        setSeconds((current) => {
          const next = current + 1;
          if (next >= maxSeconds) stopRecording();
          return Math.min(next, maxSeconds);
        });
      }, 1000);
    } catch {
      setError("Microphone access was not available. Check browser permission and try again.");
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setRecording(false);
      onRecordingChange?.(false);
    }
  }

  return (
    <div
      data-gsn-voice-note-recorder="true"
      data-gsn-voice-recording={recording ? "true" : "false"}
      style={{
        padding: compact ? 12 : 14,
        borderRadius: 18,
        border: "1px solid rgba(13,95,168,0.18)",
        background: "linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)",
        display: "grid",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <GsnLegacyIcon name="audio" size={28} />
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#0B1F33", fontWeight: 900 }}>
            {recording ? "Recording your voice" : value ? "Voice note ready" : "Record a voice note"}
          </div>
          <div style={{ color: "#587087", fontSize: 12, marginTop: 2 }}>
            Speak in the language that is natural for you. Maximum {maxSeconds} seconds.
          </div>
        </div>
      </div>

      {recording ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
          <div
            aria-live="polite"
            style={{
              minHeight: 48,
              borderRadius: 14,
              background: "#FFF4EE",
              color: "#A33B16",
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              fontWeight: 900,
            }}
          >
            {seconds}s / {maxSeconds}s
          </div>
          <PrimaryButton
            type="button"
            onClick={stopRecording}
            stableHeight={48}
            debugId={`${debugPrefix}.stop`}
          >
            Stop
          </PrimaryButton>
        </div>
      ) : value ? (
        <>
          <audio controls preload="metadata" src={previewUrl} style={{ width: "100%" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <SecondaryButton
              type="button"
              onClick={() => void startRecording()}
              disabled={disabled}
              stableHeight={48}
              debugId={`${debugPrefix}.rerecord`}
            >
              Record again
            </SecondaryButton>
            <SubtleButton
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              stableHeight={48}
              debugId={`${debugPrefix}.remove`}
            >
              Remove
            </SubtleButton>
          </div>
        </>
      ) : (
        <PrimaryButton
          type="button"
          onClick={() => void startRecording()}
          disabled={disabled}
          fullWidth
          stableHeight={52}
          debugId={`${debugPrefix}.start`}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <GsnLegacyIcon name="audio" size={22} />
            Record
          </span>
        </PrimaryButton>
      )}

      {error ? (
        <div role="alert" style={{ color: "#A33B16", fontSize: 12, fontWeight: 800 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
