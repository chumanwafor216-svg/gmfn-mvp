import React, { useEffect, useMemo, useRef, useState } from "react";
import AudioWavePlayer, { AudioWaveSignal } from "./AudioWavePlayer";
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
  heroWaveform?: boolean;
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
  heroWaveform = false,
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
      recorder.start();
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
      data-gsn-voice-recorder-presentation={heroWaveform ? "hero" : "standard"}
      style={{
        padding: compact ? 12 : 14,
        borderRadius: 18,
        border: "1px solid rgba(13,95,168,0.18)",
        background: "linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)",
        display: "grid",
        gap: 10,
      }}
    >
      {heroWaveform || recording || value ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {heroWaveform ? null : <GsnLegacyIcon name="audio" size={24} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#0B1F33", fontWeight: 900 }}>
              {recording ? "Recording voice message" : value ? "Voice message ready" : "Record a voice message"}
            </div>
            {heroWaveform ? (
              <div style={{ color: "#587087", fontSize: 12, marginTop: 2 }}>{maxSeconds} seconds</div>
            ) : null}
          </div>
        </div>
      ) : null}

      {heroWaveform && !value ? (
        <button
          type="button"
          onClick={() => {
            if (!recording) void startRecording();
          }}
          disabled={disabled || recording}
          aria-label={recording ? "Recording voice note" : "Tap to record a voice note"}
          data-gsn-voice-recorder-waveform="hero"
          data-gsn-voice-recorder-waveform-state={recording ? "recording" : "ready"}
          style={{
            minHeight: 92,
            padding: "12px 16px",
            borderRadius: 18,
            border: recording
              ? "2px solid rgba(163,59,22,0.24)"
              : "2px solid rgba(15,114,200,0.22)",
            background: recording
              ? "linear-gradient(135deg, #FFF4EE 0%, #FFFFFF 56%, #FFF8E7 100%)"
              : "linear-gradient(135deg, #EEF8FF 0%, #FFFFFF 56%, #FFF8E7 100%)",
            display: "grid",
            justifyItems: "center",
            alignContent: "center",
            gap: 7,
            boxShadow: recording
              ? "0 12px 28px rgba(163,59,22,0.10)"
              : "0 12px 28px rgba(15,114,200,0.10)",
            width: "100%",
            color: "inherit",
            font: "inherit",
            cursor: disabled || recording ? "default" : "pointer",
            opacity: disabled ? 0.65 : 1,
          }}
        >
          <div style={{ width: "min(100%, 220px)" }}>
            <AudioWaveSignal mode="hero" playing={recording} />
          </div>
          <div
            aria-live={recording ? "polite" : undefined}
            style={{
              color: recording ? "#A33B16" : "#0B4EA2",
              fontSize: 13,
              fontWeight: 900,
              textAlign: "center",
            }}
          >
            {recording ? `${seconds}s / ${maxSeconds}s` : "Tap to record"}
          </div>
        </button>
      ) : null}

      {recording ? (
        heroWaveform ? (
          <PrimaryButton
            key="stop-recording"
            type="button"
            onClick={stopRecording}
            fullWidth
            stableHeight={52}
            debugId={`${debugPrefix}.stop`}
          >
            Stop recording
          </PrimaryButton>
        ) : (
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
        )
      ) : value ? (
        <>
          <AudioWavePlayer
            src={previewUrl}
            onPlaybackError={setError}
            debugId={`${debugPrefix}.preview`}
            compact
          />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 10 }}>
            <SecondaryButton
              type="button"
              onClick={() => void startRecording()}
              disabled={disabled}
              stableHeight={42}
              debugId={`${debugPrefix}.rerecord`}
            >
              Record again
            </SecondaryButton>
            <SubtleButton
              type="button"
              onClick={() => onChange(null)}
              disabled={disabled}
              stableHeight={34}
              minWidth={0}
              debugId={`${debugPrefix}.remove`}
              style={{ minHeight: 34, height: 34, padding: "4px 10px", borderRadius: 999, color: "#9F2424", fontSize: 11, boxShadow: "none" }}
            >
              Remove
            </SubtleButton>
          </div>
        </>
      ) : heroWaveform ? null : (
        <button
          key="start-recording"
          type="button"
          onClick={() => void startRecording()}
          disabled={disabled}
          aria-label="Record a voice message"
          data-gsn-voice-recorder-waveform="standard"
          data-gsn-voice-recorder-waveform-state="ready"
          style={{
            minHeight: 72,
            width: "100%",
            padding: "10px 14px",
            borderRadius: 16,
            border: "2px solid rgba(15,114,200,0.22)",
            background: "linear-gradient(135deg, #EEF8FF 0%, #FFFFFF 56%, #FFF8E7 100%)",
            display: "grid",
            justifyItems: "center",
            gap: 4,
            color: "#0B4EA2",
            font: "inherit",
            fontWeight: 900,
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.65 : 1,
          }}
        >
          <div style={{ width: "min(100%, 220px)" }}>
            <AudioWaveSignal mode="hero" />
          </div>
          <span>Record a voice message</span>
        </button>
      )}

      {error ? (
        <div role="alert" style={{ color: "#A33B16", fontSize: 12, fontWeight: 800 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
