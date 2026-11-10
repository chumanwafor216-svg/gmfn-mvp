import React, { useEffect, useRef, useState } from "react";
import { deleteShopVoice, fetchShopVoiceBlob } from "../lib/api";
import AudioWavePlayer, { AudioWaveSignal } from "./AudioWavePlayer";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import {
  DangerButton,
  SecondaryButton,
  SubtleButton,
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
  symbolOnly?: boolean;
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
  symbolOnly = false,
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
    if ((!compactInline && !symbolOnly) || !audioUrl || !playAfterLoadRef.current) return;
    playAfterLoadRef.current = false;
    void audioRef.current?.play().catch(() => {
      setPlaying(false);
      setError("Tap play again to hear this voice note.");
    });
  }, [audioUrl, compactInline, symbolOnly]);

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
        setError("Tap play again to hear this voice note.");
      }
      return;
    }
    audio.pause();
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

  if (symbolOnly) {
    const attribution = [speakerName, speakerGmfnId].filter(Boolean).join(" · ");
    const actionLabel = loading
      ? "Opening"
      : playing
      ? "Pause"
      : "Play";
    return (
      <div
        data-gsn-shop-voice-player="true"
        data-gsn-shop-voice-symbol="true"
        title={[label, shopName, attribution, error].filter(Boolean).join(" - ")}
        style={{ display: "grid", placeItems: "center", position: "relative" }}
      >
        <audio
          ref={audioRef}
          preload="metadata"
          src={audioUrl || undefined}
          onPlay={() => {
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            if (audioRef.current) audioRef.current.currentTime = 0;
          }}
          onError={() => {
            setPlaying(false);
            setError("This shop message could not be played.");
          }}
        />
        <SecondaryButton
          type="button"
          onClick={() => void toggleCompactAudio()}
          disabled={loading}
          stableHeight={84}
          minWidth={84}
          debugId={debugId}
          aria-label={`${actionLabel} ${label}${attribution ? ` from ${attribution}` : ""}`}
          style={{
            width: 84,
            minWidth: 84,
            height: 84,
            minHeight: 84,
            padding: 0,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            position: "relative",
            color: "#0B4EA2",
            background: "rgba(255,255,255,0.96)",
            border: "2px solid rgba(244,213,124,0.82)",
            boxShadow:
              "0 14px 28px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.98)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "grid",
              gridTemplateRows: "28px 22px",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              width: 58,
              opacity: loading ? 0.58 : 1,
            }}
          >
            {playing ? (
              <span style={{ display: "flex", justifyContent: "center", gap: 4 }}>
                <span style={{ width: 5, height: 20, borderRadius: 3, background: "#0B4EA2" }} />
                <span style={{ width: 5, height: 20, borderRadius: 3, background: "#0B4EA2" }} />
              </span>
            ) : (
              <span
                style={{
                  width: 0,
                  height: 0,
                  borderTop: "11px solid transparent",
                  borderBottom: "11px solid transparent",
                  borderLeft: "17px solid #0B4EA2",
                  filter: "drop-shadow(0 3px 5px rgba(11,78,162,0.24))",
                }}
              />
            )}
            <AudioWaveSignal mode="symbol" playing={playing} />
          </span>
        </SecondaryButton>
        {error ? (
          <span
            role="alert"
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              padding: 0,
              margin: -1,
              overflow: "hidden",
              clip: "rect(0, 0, 0, 0)",
              whiteSpace: "nowrap",
              border: 0,
            }}
          >
            {error}
          </span>
        ) : null}
      </div>
    );
  }

  if (compactInline) {
    const attribution = [speakerName, speakerGmfnId].filter(Boolean).join(" · ");
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
          onPlay={() => {
            setPlaying(true);
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            if (audioRef.current) audioRef.current.currentTime = 0;
          }}
          onError={() => {
            setPlaying(false);
            setError("This voice note could not be played.");
          }}
        />
        <SecondaryButton
          type="button"
          onClick={() => void toggleCompactAudio()}
          disabled={loading}
          busy={loading}
          busyLabel="Opening..."
          stableHeight={40}
          minWidth={0}
          debugId={debugId}
          aria-label={`${playing ? "Pause" : "Play"} ${label}${attribution ? ` from ${attribution}` : ""}`}
          style={{
            width: "100%",
            minWidth: 0,
            height: 40,
            minHeight: 40,
            padding: "3px 7px",
            borderRadius: 10,
            display: "grid",
            gridTemplateColumns: "22px minmax(0, 1fr)",
            alignItems: "center",
            gap: 5,
            fontSize: 10,
            lineHeight: 1.05,
          }}
        >
          <span aria-hidden="true" style={{ display: "grid", placeItems: "center", color: "#0B4EA2" }}>
            {playing ? (
              <span style={{ display: "flex", gap: 3 }}>
                <span style={{ width: 3, height: 12, borderRadius: 3, background: "currentColor" }} />
                <span style={{ width: 3, height: 12, borderRadius: 3, background: "currentColor" }} />
              </span>
            ) : (
              <span style={{ width: 0, height: 0, marginLeft: 2, borderTop: "6px solid transparent", borderBottom: "6px solid transparent", borderLeft: "10px solid currentColor" }} />
            )}
          </span>
          <AudioWaveSignal mode="inline" playing={playing} />
        </SecondaryButton>
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
      <div style={{ color: "#526C84", fontSize: 11.5, lineHeight: 1.4 }}>
        {[shopName, speakerName, speakerGmfnId].filter(Boolean).join(" · ")}
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
      ) : null}
      {error ? <div role="alert" style={{ color: "#A33B16", fontSize: 12 }}>{error}</div> : null}
    </div>
  );
}
