import React, { useEffect, useMemo, useState } from "react";
import {
  createMarketplaceRequestResponse,
  listMarketplaceRequestResponses,
  type MarketplaceRequestResponseItem,
} from "../lib/api";
import { resolveProfileImageUrl } from "../lib/profileImage";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import ProtectedVoiceNotePlayer from "./ProtectedVoiceNotePlayer";
import { PrimaryButton } from "./StableButton";
import VoiceNoteRecorder from "./VoiceNoteRecorder";

type DemandResponsePanelProps = {
  requestId: number;
  ownerUserId: number;
  currentUser: any;
  isOwner: boolean;
  compact?: boolean;
};

function clientKey(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
}

function initials(value: string): string {
  const parts = String(value || "Member").trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "M";
}

export default function DemandResponsePanel({
  requestId,
  ownerUserId,
  currentUser,
  isOwner,
  compact = false,
}: DemandResponsePanelProps) {
  const [rows, setRows] = useState<MarketplaceRequestResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<File | null>(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [recipientUserId, setRecipientUserId] = useState(0);
  const [error, setError] = useState("");
  const currentUserId = Number(currentUser?.id || currentUser?.user_id || 0);
  const canSharePhoto = Boolean(String(currentUser?.profile_image_url || "").trim());

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result: any = await listMarketplaceRequestResponses(requestId);
      setRows(
        Array.isArray(result)
          ? result
          : Array.isArray(result?.items)
            ? result.items
            : []
      );
    } catch (err: any) {
      setError(String(err?.message || "Private replies could not be loaded."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [requestId]);

  const participants = useMemo(() => {
    const names = new Map<number, string>();
    rows.forEach((row) => {
      if (row.author_user_id !== ownerUserId) {
        names.set(row.author_user_id, row.author_display_name || "Member");
      }
      if (
        row.recipient_user_id !== ownerUserId &&
        row.recipient_user_id !== currentUserId
      ) {
        names.set(row.recipient_user_id, `Member ${row.recipient_user_id}`);
      }
    });
    return Array.from(names.entries()).map(([id, name]) => ({ id, name }));
  }, [currentUserId, ownerUserId, rows]);

  useEffect(() => {
    if (!isOwner || recipientUserId || participants.length === 0) return;
    setRecipientUserId(participants[0].id);
  }, [isOwner, participants, recipientUserId]);

  async function send() {
    if (!text.trim() && !voice) {
      setError("Add a short message or voice note.");
      return;
    }
    if (isOwner && !recipientUserId) {
      setError("Choose the member you are replying to.");
      return;
    }

    setSending(true);
    setError("");
    try {
      await createMarketplaceRequestResponse(
        requestId,
        {
          text: text.trim() || undefined,
          client_response_id: clientKey("demand-response"),
          recipient_user_id: isOwner ? recipientUserId : undefined,
          show_sender_photo: canSharePhoto && showPhoto,
        },
        voice
      );
      setText("");
      setVoice(null);
      setShowPhoto(false);
      await load();
    } catch (err: any) {
      setError(String(err?.message || "Reply could not be sent."));
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      data-gsn-demand-private-replies="true"
      style={{
        padding: compact ? 0 : 14,
        borderRadius: compact ? 0 : 18,
        border: compact ? "none" : "1px solid rgba(13,95,168,0.16)",
        background: compact ? "transparent" : "#FFFFFF",
        display: "grid",
        gap: 12,
      }}
    >
      {!compact ? <div>
        <div style={{ color: "#0B1F33", fontSize: 16, fontWeight: 950 }}>
          Listen & reply
        </div>
        <div style={{ marginTop: 3, color: "#587087", fontSize: 12, lineHeight: 1.45 }}>
          Replies stay private between the requester and each responding member.
        </div>
      </div> : null}

      {loading ? (
        <div style={{ color: "#587087", fontSize: 13 }}>Loading private replies...</div>
      ) : rows.length ? (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((row) => {
            const photoUrl = resolveProfileImageUrl(row.author_profile_image_url);
            return (
              <div
                key={row.id}
                style={{
                  padding: 11,
                  borderRadius: 15,
                  background: row.is_mine ? "#EFF7FF" : "#F8FBFF",
                  border: "1px solid rgba(13,95,168,0.12)",
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt=""
                      style={{ width: 36, height: 36, borderRadius: 999, objectFit: "cover" }}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        background: "#DCEBFA",
                        color: "#0B4FA8",
                        fontSize: 12,
                        fontWeight: 950,
                      }}
                    >
                      {initials(row.author_display_name)}
                    </span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                      {row.author_display_name}
                    </div>
                    <div style={{ color: "#64748B", fontSize: 11 }}>
                      {row.author_gmfn_id ? `${row.author_gmfn_id} · ` : ""}
                      {new Date(row.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                {row.text ? (
                  <div style={{ color: "#29445E", fontSize: 13, lineHeight: 1.55 }}>
                    {row.text}
                  </div>
                ) : null}
                {Number(row.audio_attachment_id || 0) > 0 || row.audio_deleted_at ? (
                  <ProtectedVoiceNotePlayer
                    attachmentId={Number(row.audio_attachment_id)}
                    durationSeconds={row.audio_duration_seconds}
                    deletedAt={row.audio_deleted_at}
                    canDelete={Boolean(row.is_mine)}
                    onDeleted={load}
                    label="Reply voice note"
                    debugId={`demand-box.response.${row.id}.listen`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ color: "#587087", fontSize: 13 }}>
          No private replies yet.
        </div>
      )}

      {isOwner && participants.length === 0 ? (
        <div style={{ color: "#587087", fontSize: 12 }}>
          When someone replies, you can answer them here.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {isOwner && participants.length > 1 ? (
            <select
              value={recipientUserId}
              onChange={(event) => setRecipientUserId(Number(event.target.value || 0))}
              style={{
                minHeight: 46,
                borderRadius: 14,
                border: "1px solid rgba(13,95,168,0.18)",
                padding: "0 12px",
                background: "#FFFFFF",
              }}
            >
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  Reply to {participant.name}
                </option>
              ))}
            </select>
          ) : null}
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Write a private reply"
            maxLength={1500}
            style={{
              minHeight: 76,
              resize: "vertical",
              borderRadius: 14,
              border: "1px solid rgba(13,95,168,0.18)",
              padding: 12,
              color: "#0B1F33",
              font: "inherit",
            }}
          />
          <VoiceNoteRecorder
            value={voice}
            onChange={setVoice}
            maxSeconds={60}
            disabled={sending}
            debugPrefix={`demand-box.response.${requestId}.voice`}
            compact
          />
          {canSharePhoto ? (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 9, color: "#29445E", fontSize: 12 }}>
              <input
                type="checkbox"
                checked={showPhoto}
                onChange={(event) => setShowPhoto(event.target.checked)}
              />
              <img
                src={resolveProfileImageUrl(currentUser?.profile_image_url)}
                alt=""
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  objectFit: "cover",
                  border: "1px solid rgba(13,95,168,0.16)",
                }}
              />
              <span>
                Show my current profile photo with this reply. This is optional and does not prove reliability.
              </span>
            </label>
          ) : null}
          <PrimaryButton
            type="button"
            onClick={() => void send()}
            disabled={sending}
            busy={sending}
            busyLabel="Sending reply..."
            fullWidth
            stableHeight={52}
            debugId={`demand-box.response.${requestId}.send`}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <GsnLegacyIcon name="audio" size={21} />
              Send private reply
            </span>
          </PrimaryButton>
        </div>
      )}

      {error ? (
        <div role="alert" style={{ color: "#A33B16", fontSize: 12, fontWeight: 800 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
