import React, { useEffect, useState } from "react";
import {
  deleteCommunityNoticeVoice,
  fetchCommunityNoticeVoiceBlob,
} from "../lib/api";
import AudioWavePlayer, { AudioWaveSignal } from "./AudioWavePlayer";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import { DangerButton, SecondaryButton, SubtleButton } from "./StableButton";

type Props = {
  attachmentId?: number | null;
  durationSeconds?: number | null;
  deletedAt?: string | null;
  speakerName?: string | null;
  speakerGmfnId?: string | null;
  publicAccess?: boolean;
  canDelete?: boolean;
  onDeleted?: () => void | Promise<void>;
  debugId: string;
  label?: string;
  compactPresentation?: boolean;
};

export default function CommunityNoticeVoicePlayer({
  attachmentId,
  durationSeconds,
  deletedAt,
  speakerName,
  speakerGmfnId,
  publicAccess = false,
  canDelete = false,
  onDeleted,
  debugId,
  label = "Voice announcement",
  compactPresentation = false,
}: Props) {
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
      const blob = await fetchCommunityNoticeVoiceBlob(attachmentId, publicAccess);
      setAudioUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setError(String(err?.message || "Voice announcement could not be opened."));
    } finally {
      setLoading(false);
    }
  }

  async function permanentlyDelete() {
    if (!attachmentId) return;
    setDeleting(true);
    setError("");
    try {
      const result = await deleteCommunityNoticeVoice(attachmentId);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl("");
      setLocalDeletedAt(result.deleted_at);
      setConfirmingDelete(false);
      await onDeleted?.();
    } catch (err: any) {
      setError(String(err?.message || "Voice announcement could not be deleted."));
    } finally {
      setDeleting(false);
    }
  }

  if (effectiveDeletedAt) {
    return (
      <div
        data-gsn-community-notice-voice-deleted="true"
        data-gsn-community-notice-voice-presentation={compactPresentation ? "compact-removed" : "full-removed"}
        aria-label="Voice recording removed"
        style={{
          padding: compactPresentation ? "7px 9px" : 12,
          borderRadius: compactPresentation ? 13 : 16,
          border: "1px solid rgba(100,116,139,0.18)",
          background: "#F8FAFC",
          color: "#475569",
          fontSize: compactPresentation ? 10.5 : 12,
          lineHeight: compactPresentation ? 1.3 : 1.5,
          display: compactPresentation ? "grid" : "block",
          gridTemplateColumns: compactPresentation ? "54px minmax(0, 1fr)" : undefined,
          alignItems: compactPresentation ? "center" : undefined,
          gap: compactPresentation ? 8 : undefined,
        }}
      >
        {compactPresentation ? (
          <>
            <span
              aria-hidden="true"
              style={{
                position: "relative",
                display: "block",
                width: 54,
                opacity: 0.72,
                overflow: "hidden",
              }}
            >
              <AudioWaveSignal mode="inline" />
              <span
                style={{
                  position: "absolute",
                  left: 7,
                  right: 7,
                  top: "50%",
                  height: 2,
                  borderRadius: 999,
                  background: "#9F2424",
                  transform: "rotate(-28deg)",
                }}
              />
            </span>
            <span>
              <strong style={{ display: "block", color: "#334155", fontSize: 11.5 }}>Recording removed</strong>
              Deleted by its sender. The written notice remains.
            </span>
          </>
        ) : (
          <>
            Voice announcement permanently deleted by its sender. The written notice,
            sender, and time remain in Community Memory.
          </>
        )}
      </div>
    );
  }

  if (!attachmentId) return null;

  return (
    <div
      data-gsn-community-notice-voice-player="waveform"
      data-gsn-community-notice-voice-presentation={compactPresentation ? "compact" : "full"}
      style={{
        padding: compactPresentation ? 0 : 11,
        borderRadius: compactPresentation ? 0 : 18,
        border: compactPresentation ? 0 : "1px solid rgba(13,95,168,0.16)",
        background: compactPresentation ? "transparent" : "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
        display: "grid",
        gap: compactPresentation ? 6 : 8,
      }}
    >
      {compactPresentation ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center", gap: 8, padding: "0 2px" }}>
          <div style={{ minWidth: 0, color: "#526C84", fontSize: 10.5, fontWeight: 800, lineHeight: 1.25, overflowWrap: "anywhere" }}>
            {[speakerName, speakerGmfnId].filter(Boolean).join(" · ") || "Voice message"}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
            {Number(durationSeconds || 0) > 0 ? (
              <span style={{ color: "#587087", fontSize: 10.5, fontWeight: 900 }}>
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
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", alignItems: "center", gap: 9 }}>
          <GsnLegacyIcon name="audio" size={32} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: "#0B1F33", fontSize: 14, fontWeight: 950, lineHeight: 1.15 }}>
              {label}
            </div>
            <div style={{ marginTop: 3, color: "#526C84", fontSize: 10.5, fontWeight: 780, lineHeight: 1.25, overflowWrap: "anywhere" }}>
              {[speakerName, speakerGmfnId].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div style={{ display: "grid", justifyItems: "end", gap: 4 }}>
            {Number(durationSeconds || 0) > 0 ? (
              <span style={{ color: "#587087", fontSize: 10.5, fontWeight: 900 }}>
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
      )}

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
          data-gsn-community-notice-voice-delete-confirmation="true"
          style={{
            padding: 9,
            borderRadius: 14,
            border: "1px solid rgba(153,27,27,0.18)",
            background: "#FFF7F7",
            display: "grid",
            gap: 7,
          }}
        >
          <div style={{ color: "#7F1D1D", fontSize: 11, lineHeight: 1.4 }}>
            Delete this recording permanently? Listening stops immediately,
            but the written notice and attribution remain.
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
      {error ? <div role="alert" style={{ color: "#A33B16", fontSize: 11 }}>{error}</div> : null}
    </div>
  );
}
