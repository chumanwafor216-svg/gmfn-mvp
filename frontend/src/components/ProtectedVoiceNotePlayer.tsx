import React, { useEffect, useState } from "react";
import { deleteDemandAudio, fetchDemandAudioBlob } from "../lib/api";
import AudioWavePlayer from "./AudioWavePlayer";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import {
  DangerButton,
  SecondaryButton,
  SubtleButton,
} from "./StableButton";

type ProtectedVoiceNotePlayerProps = {
  attachmentId?: number | null;
  durationSeconds?: number | null;
  deletedAt?: string | null;
  canDelete?: boolean;
  onDeleted?: () => void | Promise<void>;
  debugId: string;
  label?: string;
};

export default function ProtectedVoiceNotePlayer({
  attachmentId,
  durationSeconds,
  deletedAt,
  canDelete = false,
  onDeleted,
  debugId,
  label = "Voice note",
}: ProtectedVoiceNotePlayerProps) {
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [localDeletedAt, setLocalDeletedAt] = useState("");
  const [error, setError] = useState("");
  const effectiveDeletedAt = localDeletedAt || String(deletedAt || "");

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function loadAudio() {
    if (!attachmentId) return;
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

  async function permanentlyDelete() {
    if (!attachmentId) return;
    setDeleting(true);
    setError("");
    try {
      const result = await deleteDemandAudio(attachmentId);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
      setLocalDeletedAt(result.deleted_at);
      setConfirmingDelete(false);
      await onDeleted?.();
    } catch (err: any) {
      setError(String(err?.message || "Voice note could not be deleted."));
    } finally {
      setDeleting(false);
    }
  }

  if (effectiveDeletedAt) {
    return (
      <div
        data-gsn-demand-voice-deleted="true"
        style={{
          padding: 12,
          borderRadius: 16,
          border: "1px solid rgba(100,116,139,0.18)",
          background: "#F8FAFC",
          color: "#475569",
          fontSize: 12,
          lineHeight: 1.5,
        }}
      >
        Voice note permanently deleted by its sender. The request or reply,
        sender, time, and deletion event remain in GSN history.
      </div>
    );
  }

  if (!attachmentId) return null;

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
      <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", alignItems: "center", gap: 8, color: "#0B1F33", fontWeight: 900 }}>
        <GsnLegacyIcon name="speaker" size={24} />
        <span>{label}</span>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
          {Number(durationSeconds || 0) > 0 ? (
            <span style={{ color: "#587087", fontSize: 11, fontWeight: 800 }}>
              {Math.ceil(Number(durationSeconds))}s
            </span>
          ) : null}
          {canDelete && !confirmingDelete ? (
            <SubtleButton
              type="button"
              onClick={() => setConfirmingDelete(true)}
              stableHeight={30}
              minWidth={0}
              debugId={debugId + ".delete.open"}
              style={{ minHeight: 30, height: 30, padding: "4px 8px", borderRadius: 999, color: "#9F2424", fontSize: 10.5, boxShadow: "none" }}
            >
              Delete
            </SubtleButton>
          ) : null}
        </div>
      </div>
      <AudioWavePlayer
        src={audioUrl}
        durationSeconds={durationSeconds}
        loading={loading}
        onRequestSource={loadAudio}
        onPlaybackError={setError}
        debugId={debugId}
        compact
      />
      {canDelete && confirmingDelete ? (
          <div
            data-gsn-demand-voice-delete-confirmation="true"
            style={{
              padding: 11,
              borderRadius: 14,
              border: "1px solid rgba(153,27,27,0.18)",
              background: "#FFF7F7",
              display: "grid",
              gap: 9,
            }}
          >
            <div style={{ color: "#7F1D1D", fontSize: 12, lineHeight: 1.5 }}>
              Delete this recording permanently? Listening stops immediately.
              GSN keeps the request or reply, sender, time, and deletion event.
              This cannot be undone.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <SecondaryButton
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                stableHeight={46}
                debugId={debugId + ".delete.keep"}
              >
                Keep voice note
              </SecondaryButton>
              <DangerButton
                type="button"
                onClick={() => void permanentlyDelete()}
                disabled={deleting}
                busy={deleting}
                busyLabel="Deleting..."
                stableHeight={46}
                debugId={debugId + ".delete.confirm"}
              >
                Delete permanently
              </DangerButton>
            </div>
          </div>
      ) : null}
      {error ? <div role="alert" style={{ color: "#A33B16", fontSize: 12 }}>{error}</div> : null}
    </div>
  );
}
