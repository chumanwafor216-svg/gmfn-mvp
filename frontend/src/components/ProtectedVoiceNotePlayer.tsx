import React, { useEffect, useState } from "react";
import { fetchDemandAudioBlob } from "../lib/api";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import { PrimaryButton } from "./StableButton";

type ProtectedVoiceNotePlayerProps = {
  attachmentId: number;
  durationSeconds?: number | null;
  debugId: string;
  label?: string;
};

export default function ProtectedVoiceNotePlayer({
  attachmentId,
  durationSeconds,
  debugId,
  label = "Voice note",
}: ProtectedVoiceNotePlayerProps) {
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function loadAudio() {
    setLoading(true);
    setError("");
    try {
      const blob = await fetchDemandAudioBlob(attachmentId);
      setAudioUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setError(String(err?.message || "Voice note could not be opened."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-gsn-protected-voice-player="true"
      style={{
        padding: 12,
        borderRadius: 16,
        border: "1px solid rgba(13,95,168,0.16)",
        background: "#F8FBFF",
        display: "grid",
        gap: 9,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#0B1F33", fontWeight: 900 }}>
        <GsnLegacyIcon name="speaker" size={24} />
        <span>{label}</span>
        {Number(durationSeconds || 0) > 0 ? (
          <span style={{ color: "#587087", fontSize: 12, fontWeight: 800 }}>
            {Math.ceil(Number(durationSeconds))}s
          </span>
        ) : null}
      </div>
      {audioUrl ? (
        <audio controls autoPlay preload="metadata" src={audioUrl} style={{ width: "100%" }} />
      ) : (
        <PrimaryButton
          type="button"
          onClick={() => void loadAudio()}
          disabled={loading}
          busy={loading}
          busyLabel="Opening voice note..."
          fullWidth
          stableHeight={50}
          debugId={debugId}
        >
          Listen
        </PrimaryButton>
      )}
      {error ? <div role="alert" style={{ color: "#A33B16", fontSize: 12 }}>{error}</div> : null}
    </div>
  );
}
