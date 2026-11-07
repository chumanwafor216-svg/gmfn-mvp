import React, { useEffect, useMemo, useRef, useState } from "react";
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

function messageTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function messageDay(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Earlier";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const key = parsed.toDateString();
  if (key === today.toDateString()) return "Today";
  if (key === yesterday.toDateString()) return "Yesterday";
  return parsed.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: parsed.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
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
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [recipientUserId, setRecipientUserId] = useState(0);
  const [error, setError] = useState("");
  const threadRef = useRef<HTMLDivElement | null>(null);
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
        if (!names.has(row.recipient_user_id)) {
          names.set(row.recipient_user_id, `Member ${row.recipient_user_id}`);
        }
      }
    });
    return Array.from(names.entries()).map(([id, name]) => ({ id, name }));
  }, [currentUserId, ownerUserId, rows]);

  useEffect(() => {
    if (!isOwner) return;
    if (participants.length === 0) {
      if (recipientUserId) setRecipientUserId(0);
      return;
    }
    if (participants.some((participant) => participant.id === recipientUserId)) {
      return;
    }
    setRecipientUserId(participants[0].id);
  }, [isOwner, participants, recipientUserId]);

  const selectedParticipant = useMemo(
    () => participants.find((participant) => participant.id === recipientUserId) || null,
    [participants, recipientUserId]
  );

  const visibleRows = useMemo(() => {
    if (!isOwner) return rows;
    if (!recipientUserId) return [];
    return rows.filter((row) => {
      const authorId = Number(row.author_user_id || 0);
      const recipientId = Number(row.recipient_user_id || 0);
      return (
        (authorId === ownerUserId && recipientId === recipientUserId) ||
        (authorId === recipientUserId && recipientId === ownerUserId)
      );
    });
  }, [isOwner, ownerUserId, recipientUserId, rows]);

  useEffect(() => {
    if (loading || !threadRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      if (threadRef.current) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading, recipientUserId, visibleRows.length]);

  async function send() {
    if (voiceRecording) {
      setError("Tap Stop and wait for Voice note ready before sending your reply.");
      return;
    }
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

      {isOwner && participants.length > 1 ? (
        <label
          data-gsn-demand-conversation-participant="true"
          style={{ display: "grid", gap: 6, color: "#29445E", fontSize: 12, fontWeight: 850 }}
        >
          <span>Private conversation</span>
          <select
            value={recipientUserId}
            onChange={(event) => setRecipientUserId(Number(event.target.value || 0))}
            style={{
              minHeight: 46,
              borderRadius: 14,
              border: "1px solid rgba(13,95,168,0.18)",
              padding: "0 12px",
              background: "#FFFFFF",
              color: "#0B1F33",
              font: "inherit",
              fontWeight: 800,
            }}
          >
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                Conversation with {participant.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {loading ? (
        <div style={{ color: "#587087", fontSize: 13 }}>Loading private replies...</div>
      ) : visibleRows.length ? (
        <div
          ref={threadRef}
          data-gsn-demand-conversation="whatsapp-like"
          aria-label={
            selectedParticipant
              ? `Private conversation with ${selectedParticipant.name}`
              : "Private conversation"
          }
          style={{
            maxHeight: compact ? 420 : 520,
            overflowY: "auto",
            overscrollBehavior: "contain",
            padding: compact ? "14px 10px" : 14,
            borderRadius: 18,
            border: "1px solid rgba(42,91,68,0.15)",
            backgroundColor: "#EAF2EB",
            backgroundImage:
              "radial-gradient(circle at 18px 18px, rgba(11,79,168,0.035) 0 2px, transparent 2.5px), radial-gradient(circle at 38px 40px, rgba(172,125,29,0.045) 0 2px, transparent 2.5px)",
            backgroundSize: "56px 56px",
            display: "grid",
            gap: 7,
            scrollbarGutter: "stable",
          }}
        >
          <div
            style={{
              justifySelf: "center",
              maxWidth: "92%",
              padding: "6px 10px",
              borderRadius: 10,
              background: "#FFF7D6",
              color: "#5F4A16",
              boxShadow: "0 1px 2px rgba(15,23,42,0.08)",
              fontSize: 10,
              fontWeight: 800,
              lineHeight: 1.35,
              textAlign: "center",
            }}
          >
            Private exchange. Only the requester and this member can read or play it.
          </div>
          {visibleRows.map((row, index) => {
            const photoUrl = resolveProfileImageUrl(row.author_profile_image_url);
            const mine = Boolean(row.is_mine);
            const day = messageDay(row.created_at);
            const priorDay = index > 0 ? messageDay(visibleRows[index - 1].created_at) : "";
            return (
              <React.Fragment key={row.id}>
                {day !== priorDay ? (
                  <div
                    data-gsn-demand-conversation-day="true"
                    style={{
                      justifySelf: "center",
                      margin: "3px 0",
                      padding: "4px 9px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.88)",
                      color: "#536A81",
                      boxShadow: "0 1px 2px rgba(15,23,42,0.08)",
                      fontSize: 10,
                      fontWeight: 900,
                    }}
                  >
                    {day}
                  </div>
                ) : null}
                <div
                  data-gsn-demand-message-direction={mine ? "outgoing" : "incoming"}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: mine ? "row-reverse" : "row",
                    alignItems: "flex-end",
                    gap: 7,
                  }}
                >
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={`${row.author_display_name} profile`}
                      data-gsn-demand-message-avatar="portrait"
                      style={{
                        width: 34,
                        height: 34,
                        flex: "0 0 34px",
                        borderRadius: 999,
                        objectFit: "cover",
                        border: "2px solid rgba(255,255,255,0.96)",
                        boxShadow: "0 2px 7px rgba(15,23,42,0.16)",
                      }}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      data-gsn-demand-message-avatar="initials"
                      style={{
                        width: 34,
                        height: 34,
                        flex: "0 0 34px",
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        background: mine ? "#0B4FA8" : "#FFFFFF",
                        color: mine ? "#FFFFFF" : "#0B4FA8",
                        border: "2px solid rgba(255,255,255,0.96)",
                        boxShadow: "0 2px 7px rgba(15,23,42,0.14)",
                        fontSize: 11,
                        fontWeight: 950,
                      }}
                    >
                      {initials(row.author_display_name)}
                    </span>
                  )}
                  <div
                    style={{
                      minWidth: 0,
                      maxWidth: "calc(88% - 41px)",
                      padding: "9px 10px 7px",
                      borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: mine ? "#DDF5E5" : "#FFFFFF",
                      border: mine
                        ? "1px solid rgba(45,133,85,0.14)"
                        : "1px solid rgba(148,163,184,0.16)",
                      boxShadow: "0 1px 3px rgba(15,23,42,0.10)",
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        color: mine ? "#17663D" : "#0B4FA8",
                        fontSize: 11,
                        fontWeight: 950,
                        lineHeight: 1.2,
                      }}
                    >
                      {row.author_display_name}
                    </div>
                    {row.text ? (
                      <div
                        style={{
                          color: "#17324A",
                          fontSize: 13,
                          lineHeight: 1.48,
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {row.text}
                      </div>
                    ) : null}
                    {Number(row.audio_attachment_id || 0) > 0 || row.audio_deleted_at ? (
                      <ProtectedVoiceNotePlayer
                        attachmentId={Number(row.audio_attachment_id)}
                        durationSeconds={row.audio_duration_seconds}
                        deletedAt={row.audio_deleted_at}
                        canDelete={mine}
                        onDeleted={load}
                        label="Reply voice note"
                        debugId={`demand-box.response.${row.id}.listen`}
                      />
                    ) : null}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 5,
                        color: "#6B7F90",
                        fontSize: 9,
                        fontWeight: 800,
                        lineHeight: 1,
                      }}
                    >
                      {row.author_gmfn_id ? <span>{row.author_gmfn_id}</span> : null}
                      <time dateTime={row.created_at}>{messageTime(row.created_at)}</time>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        <div
          data-gsn-demand-conversation="whatsapp-like"
          style={{
            padding: "18px 14px",
            borderRadius: 18,
            border: "1px solid rgba(42,91,68,0.15)",
            background: "#EAF2EB",
            color: "#536A81",
            fontSize: 12,
            lineHeight: 1.45,
            textAlign: "center",
          }}
        >
          No private replies yet. Start the conversation below.
        </div>
      )}
      {isOwner && participants.length === 0 ? (
        <div style={{ color: "#587087", fontSize: 12 }}>
          When someone replies, you can answer them here.
        </div>
      ) : (
        <div
          data-gsn-demand-reply-composer="true"
          style={{
            padding: compact ? "12px 10px 2px" : 12,
            borderRadius: 18,
            border: "1px solid rgba(13,95,168,0.12)",
            background: "#F8FBFF",
            display: "grid",
            gap: 10,
          }}
        >
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
            onRecordingChange={setVoiceRecording}
            maxSeconds={60}
            disabled={sending || voiceRecording}
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
              {voiceRecording ? "Stop recording first" : "Send private reply"}
            </span>
          </PrimaryButton>
          {voiceRecording ? (
            <div style={{ color: "#587087", fontSize: 12, textAlign: "center" }}>
              Tap Stop above. Sending unlocks when your voice note is ready.
            </div>
          ) : null}
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
