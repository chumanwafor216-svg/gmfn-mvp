import React, { useEffect, useMemo, useRef, useState } from "react";
import { StableButton } from "./StableButton";

type AudioWavePlayerProps = {
  src?: string;
  durationSeconds?: number | null;
  loading?: boolean;
  onRequestSource?: () => void | Promise<void>;
  onPlaybackError?: (message: string) => void;
  debugId: string;
  compact?: boolean;
};

const WAVE_HEIGHTS = [
  8, 14, 20, 12, 25, 18, 30, 16, 22, 11, 27, 19, 32, 17, 24, 13,
  29, 21, 15, 26, 10, 23, 31, 18, 28, 14, 20, 9, 25, 17, 12, 22,
];

function formatAudioTime(value: number): string {
  const safeValue = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = String(safeValue % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function AudioWaveSignal({
  mode = "inline",
  playing = false,
}: {
  mode?: "inline" | "symbol";
  playing?: boolean;
}) {
  const heights = mode === "symbol" ? WAVE_HEIGHTS.slice(7, 23) : WAVE_HEIGHTS.slice(2, 26);
  const scale = mode === "symbol" ? 0.56 : 0.5;

  return (
    <div
      data-gsn-audio-wave-bars="true"
      aria-hidden="true"
      style={{
        width: "100%",
        height: mode === "symbol" ? 22 : 19,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: mode === "symbol" ? 2 : 1,
        overflow: "hidden",
      }}
    >
      {heights.map((height, index) => (
        <span
          key={`${height}-${index}`}
          style={{
            flex: "1 1 2px",
            minWidth: mode === "symbol" ? 2 : 1,
            maxWidth: mode === "symbol" ? 3 : 4,
            height: Math.max(4, height * scale),
            borderRadius: 999,
            background: mode === "symbol"
              ? "linear-gradient(180deg, #20C4E6 0%, #0B4EA2 100%)"
              : "rgba(11,78,162,0.54)",
            transform: playing && index % 3 === 0 ? "scaleY(1.12)" : "scaleY(1)",
            transition: "transform 160ms ease",
          }}
        />
      ))}
    </div>
  );
}

export default function AudioWavePlayer({
  src = "",
  durationSeconds,
  loading = false,
  onRequestSource,
  onPlaybackError,
  debugId,
  compact = false,
}: AudioWavePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playWhenReadyRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const effectiveDuration = useMemo(() => {
    const measured = Number(mediaDuration || 0);
    const supplied = Number(durationSeconds || 0);
    return measured > 0 ? measured : supplied > 0 ? supplied : 0;
  }, [durationSeconds, mediaDuration]);
  const progress = effectiveDuration > 0
    ? Math.min(1, Math.max(0, currentTime / effectiveDuration))
    : 0;

  useEffect(() => {
    setCurrentTime(0);
    setPlaying(false);
  }, [src]);

  useEffect(() => {
    if (!src || !playWhenReadyRef.current) return;
    playWhenReadyRef.current = false;
    void audioRef.current?.play().catch(() => {
      setPlaying(false);
      onPlaybackError?.("Tap play again to hear this recording.");
    });
  }, [onPlaybackError, src]);

  async function togglePlayback() {
    if (!src) {
      playWhenReadyRef.current = true;
      await onRequestSource?.();
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setPlaying(false);
        onPlaybackError?.("Tap play again to hear this recording.");
      }
      return;
    }
    audio.pause();
  }

  return (
    <div
      data-gsn-audio-wave-player="true"
      data-gsn-audio-playing={playing ? "true" : "false"}
      style={{
        minHeight: compact ? 58 : 66,
        borderRadius: compact ? 16 : 18,
        border: "1px solid rgba(24,92,148,0.18)",
        background: "linear-gradient(135deg, #F4F9FF 0%, #FFFFFF 55%, #FFF8E7 100%)",
        display: "grid",
        gridTemplateColumns: compact ? "44px minmax(0, 1fr)" : "50px minmax(0, 1fr)",
        alignItems: "center",
        gap: compact ? 9 : 12,
        padding: compact ? "7px 9px" : "8px 11px",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.96)",
      }}
    >
      <audio
        ref={audioRef}
        preload="metadata"
        src={src || undefined}
        onLoadedMetadata={(event) => setMediaDuration(event.currentTarget.duration || 0)}
        onDurationChange={(event) => setMediaDuration(event.currentTarget.duration || 0)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime || 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
        onError={() => {
          setPlaying(false);
          onPlaybackError?.("This recording could not be played.");
        }}
      />
      <StableButton
        type="button"
        onClick={() => void togglePlayback()}
        disabled={loading}
        aria-label={loading ? "Opening recording" : playing ? "Pause recording" : "Play recording"}
        debugId={debugId}
        stableHeight={compact ? 44 : 50}
        minWidth={compact ? 44 : 50}
        style={{
          width: compact ? 44 : 50,
          minWidth: compact ? 44 : 50,
          padding: 0,
          borderRadius: 999,
          color: "#FFFFFF",
          background: "linear-gradient(180deg, #0F72C8 0%, #073B72 100%)",
          border: "1px solid rgba(7,59,114,0.34)",
          boxShadow: "0 8px 16px rgba(7,59,114,0.20)",
        }}
      >
        {loading ? (
          <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>…</span>
        ) : playing ? (
          <span aria-hidden="true" style={{ display: "flex", gap: 4 }}>
            <span style={{ width: 4, height: 18, borderRadius: 3, background: "#FFFFFF" }} />
            <span style={{ width: 4, height: 18, borderRadius: 3, background: "#FFFFFF" }} />
          </span>
        ) : (
          <span
            aria-hidden="true"
            style={{
              width: 0,
              height: 0,
              marginLeft: 3,
              borderTop: "9px solid transparent",
              borderBottom: "9px solid transparent",
              borderLeft: "14px solid #FFFFFF",
            }}
          />
        )}
      </StableButton>
      <div style={{ minWidth: 0, display: "grid", gap: 5 }}>
        <div
          aria-hidden="true"
          style={{
            height: compact ? 30 : 34,
            display: "flex",
            alignItems: "center",
            gap: 2,
            overflow: "hidden",
          }}
        >
          {WAVE_HEIGHTS.map((height, index) => {
            const active = index / WAVE_HEIGHTS.length <= progress;
            return (
              <span
                key={`${height}-${index}`}
                style={{
                  flex: "1 1 2px",
                  minWidth: 2,
                  maxWidth: 4,
                  height: Math.max(5, compact ? height * 0.78 : height),
                  borderRadius: 999,
                  background: active
                    ? "linear-gradient(180deg, #19A7CE 0%, #0B4EA2 100%)"
                    : "rgba(100,132,160,0.34)",
                  transform: playing && index % 3 === 0 ? "scaleY(1.08)" : "scaleY(1)",
                  transition: "background 140ms ease, transform 160ms ease",
                }}
              />
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "#526C84", fontSize: compact ? 10 : 11, fontWeight: 850 }}>
          <span>{loading ? "Opening…" : playing ? "Playing" : src ? "Ready" : "Tap to listen"}</span>
          <span>{formatAudioTime(currentTime)} / {formatAudioTime(effectiveDuration)}</span>
        </div>
      </div>
    </div>
  );
}
