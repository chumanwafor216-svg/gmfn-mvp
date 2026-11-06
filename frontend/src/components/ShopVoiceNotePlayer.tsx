import React, { useEffect, useRef, useState } from "react";
import { deleteShopVoice, fetchShopVoiceBlob } from "../lib/api";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
} from "./StableButton";

type ShopVoiceNotePlayerProps = {
  attachmentId?: number | null;
  durationSeconds?: number | null;
  deletedAt?: string | null;
  speakerName?: string | null;
  speakerGmfnId?: string | null;
  shopName?: string | null;
  publicAccess?: boolean;
  canDelete?: boolean;
  onDeleted?: () => void | Promise<void>;
  debugId: string;
  label: string;
  compactInline?: boolean;
};

export default function ShopVoiceNotePlayer({
  attachmentId,
  durationSeconds,
  deletedAt,
  speakerName,
  speakerGmfnId,
  shopName,
  publicAccess = false,
  canDelete = false,
  onDeleted,
  debugId,
  label,
  compactInline = false,
}: ShopVoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playAfterLoadRef = useRef(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [localDeletedAt, setLocalDeletedAt] = useState("");
  const [error, setError] = useState("");
  const effectiveDeletedAt = localDeletedAt || String(deletedAt || "");

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!compactInline || !audioUrl || !playAfterLoadRef.current) return;
    playAfterLoadRef.current = false;
    void audioRef.current?.play().catch(() => {
      setPlaying(false);
      setError("Tap Listen again to play this voice note.");
    });
  }, [audioUrl, compactInline]);

  async function loadAudio() {
    if (!attachmentId) return;
    setLoading(true);
    setError("");
    try {
      const blob = await fetchShopVoiceBlob(attachmentId, publicAccess);
      setAudioUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      setError(String(err?.message || "Voice note could not be opened."));
    } finally {
      setLoading(false);
    }
  }

  async function toggleCompactAudio() {
    if (!audioUrl) {
      playAfterLoadRef.current = true;
      await loadAudio();
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      setError("");
      try {
        await audio.play();
      } catch {
        setPlaying(false);
        setError("Tap Play again to hear this voice note.");
      }
    } else {
      audio.pause();
    }
  }

  async function permanentlyDelete() {
    if (!attachmentId) return;
    setDeleting(true);
    setError("");
    try {
      const result = await deleteShopVoice(attachmentId);
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
        data-gsn-shop-voice-deleted="true"
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
        Voice note permanently deleted by its sender. The shop item or update,
        sender, and time remain in GSN history.
      </div>
    );
  }

  if (!attachmentId) return null;

  if (compactInline) {
    const attribution = [speakerName, speakerGmfnId].filter(Boolean).join(" · ");
    const durationLabel = Number(durationSeconds || 0) > 0
      ? `${Math.ceil(Number(durationSeconds))}s`
      : "";
    const secondaryLabel = error
      ? "Try again"
      : [speakerGmfnId, durationLabel].filter(Boolean).join(" · ");
    return (
      <div
        data-gsn-shop-voice-player="true"
        data-gsn-shop-voice-inline="true"
        className="public-shop-inline-voice"
        title={[label, shopName, attribution, error].filter(Boolean).join(" · ")}
      >
        <audio
          ref={audioRef}
          preload="metadata"
          src={audioUrl || undefined}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onError={() => {
            setPlaying(false);
            setError("This voice note could not be played.");
          }}
        />
        <PrimaryButton
          type="button"
          onClick={() => void toggleCompactAudio()}
          disabled={loading}
          busy={loading}
          busyLabel="Opening..."
          stableHeight={42}
          minWidth={0}
          debugId={debugId}
          aria-label={`${playing ? "Pause" : "Listen to"} ${label}${attribution ? ` from ${attribution}` : ""}`}
          style={{
            width: "100%",
            minWidth: 0,
            height: 42,
            minHeight: 42,
            padding: "4px 9px",
            borderRadius: 12,
            display: "grid",
            gridTemplateColumns: "auto minmax(0, 1fr)",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            lineHeight: 1.05,
          }}
        >
          <GsnLegacyIcon name="speaker" size={19} />
          <span style={{ minWidth: 0, display: "grid", textAlign: "left" }}>
            <span style={{ fontWeight: 950 }}>{playing ? "Pause" : audioUrl ? "Play" : "Listen"}</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 8.5, fontWeight: 800, opacity: 0.86 }}>
              {secondaryLabel || "Voice note"}
            </span>
          </span>
        </PrimaryButton>
      </div>
    );
  }

  return (
    <div
      data-gsn-shop-voice-player="true"
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
      <div style={{ color: "#526C84", fontSize: 11.5, lineHeight: 1.4 }}>
        {[shopName, speakerName, speakerGmfnId].filter(Boolean).join(" · ")}
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
      {canDelete ? (
        confirmingDelete ? (
          <div
            data-gsn-shop-voice-delete-confirmation="true"
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
              The shop item or update and its attribution remain. This cannot be undone.
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
        ) : (
          <DangerButton
            type="button"
            onClick={() => setConfirmingDelete(true)}
            stableHeight={46}
            fullWidth
            debugId={debugId + ".delete.open"}
          >
            Delete voice note
          </DangerButton>
        )
      ) : null}
      {error ? <div role="alert" style={{ color: "#A33B16", fontSize: 12 }}>{error}</div> : null}
    </div>
  );
}
