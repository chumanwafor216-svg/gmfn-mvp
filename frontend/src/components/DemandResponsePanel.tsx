import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createMarketplaceRequestResponse,
  listMarketplaceRequestResponses,
  type MarketplaceRequestResponseItem,
} from "../lib/api";
import { resolveProfileImageUrl } from "../lib/profileImage";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import ProtectedVoiceNotePlayer from "./ProtectedVoiceNotePlayer";
import { PrimaryButton, SecondaryButton } from "./StableButton";
import VoiceNoteRecorder from "./VoiceNoteRecorder";

const SELLER_QUICK_REPLIES = [
  "I can help.",
  "Unavailable.",
  "I need more details.",
] as const;

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

function responsePreview(row: MarketplaceRequestResponseItem): string {
  const text = String(row.text || "").trim();
  if (text) return text;
  if (Number(row.audio_attachment_id || 0) > 0 || row.audio_deleted_at) return "Voice note";
  return "Private reply";
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
  const [conversationAccess, setConversationAccess] = useState<
    "loading" | "available" | "unavailable"
  >("loading");
  const threadRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const currentUserId = Number(currentUser?.id || currentUser?.user_id || 0);
  const canSharePhoto = Boolean(String(currentUser?.profile_image_url || "").trim());

  async function load() {
    setLoading(true);
    setConversationAccess("loading");
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
      setConversationAccess("available");
    } catch (err: any) {
      setRows([]);
      setConversationAccess("unavailable");
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

  const participantThreads = useMemo(() => {
    if (!isOwner) return [];
    const grouped = new Map<number, MarketplaceRequestResponseItem[]>();
    rows.forEach((row) => {
      const authorId = Number(row.author_user_id || 0);
      const recipientId = Number(row.recipient_user_id || 0);
      const peerId = authorId === ownerUserId ? recipientId : authorId;
      if (!peerId || peerId === ownerUserId) return;
      const threadRows = grouped.get(peerId) || [];
      threadRows.push(row);
      grouped.set(peerId, threadRows);
    });
    return participants
      .map((participant) => {
        const threadRows = grouped.get(participant.id) || [];
        const lastRow = threadRows[threadRows.length - 1];
        return {
          ...participant,
          count: threadRows.length,
          lastRow,
          preview: lastRow ? responsePreview(lastRow) : "No replies yet",
        };
      })
      .filter((thread) => thread.count > 0);
  }, [isOwner, ownerUserId, participants, rows]);

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
      data-gsn-demand-conversation-access={conversationAccess}
      style={{
        padding: compact ? 12 : 14,
        borderRadius: compact ? 22 : 18,
        border: compact
          ? "1px solid rgba(13,95,168,0.18)"
          : "1px solid rgba(13,95,168,0.16)",
        background: compact
          ? "linear-gradient(180deg, #F6FBFF 0%, #FFFFFF 100%)"
          : "#FFFFFF",
        boxShadow: compact ? "0 10px 24px rgba(15,55,95,0.10)" : undefined,
        display: "grid",
        gap: 12,
      }}
    >
      {conversationAccess === "available" && compact ? (
        <div data-gsn-demand-conversation-heading="true">
          <div style={{ color: "#0B1F33", fontSize: 16, fontWeight: 950 }}>
            Private conversation
          </div>
          <div style={{ marginTop: 3, color: "#587087", fontSize: 12, lineHeight: 1.45 }}>
            Only the requester and responder can see these replies.
          </div>
        </div>
      ) : null}
      {conversationAccess === "available" && !compact ? <div>
        <div style={{ color: "#0B1F33", fontSize: 16, fontWeight: 950 }}>
          Listen & reply
        </div>
        <div style={{ marginTop: 3, color: "#587087", fontSize: 12, lineHeight: 1.45 }}>
          Replies stay private between the requester and each responding member.
        </div>
      </div> : null}

      {conversationAccess === "available" && isOwner && participantThreads.length > 0 ? (
        <div data-gsn-demand-thread-list="true" style={{ display: "grid", gap: 7 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              color: "#29445E",
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            <span>Responses</span>
            <span>{participantThreads.length} private threads</span>
          </div>
          <div
            data-gsn-demand-thread-list-scroll="true"
            style={{
              display: "grid",
              gap: 6,
              maxHeight: compact ? 260 : 320,
              overflowY: "auto",
              padding: 2,
              overscrollBehavior: "contain",
            }}
          >
            {participantThreads.map((thread) => {
              const selected = thread.id === recipientUserId;
              return (
                <button
                  key={thread.id}
                  type="button"
                  data-gsn-demand-thread-row="true"
                  aria-pressed={selected}
                  onClick={() => setRecipientUserId(thread.id)}
                  style={{
                    width: "100%",
                    minHeight: 64,
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 11px",
                    borderRadius: 14,
                    border: selected
                      ? "2px solid rgba(13,95,168,0.48)"
                      : "1px solid rgba(13,95,168,0.14)",
                    background: selected ? "#EAF3FF" : "#FFFFFF",
                    color: "#0B1F33",
                    textAlign: "left",
                    font: "inherit",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ minWidth: 0, display: "grid", gap: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, overflowWrap: "anywhere" }}>
                      Conversation with {thread.name}
                    </span>
                    <span
                      style={{
                        color: "#587087",
                        fontSize: 11,
                        lineHeight: 1.25,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {thread.count} {thread.count === 1 ? "reply" : "replies"} · {thread.preview}
                    </span>
                  </span>
                  <span aria-hidden="true" style={{ color: "#0B4FA8", fontSize: 22, lineHeight: 1 }}>
                    ›
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {conversationAccess === "available" && isOwner && selectedParticipant ? (
        <div
          data-gsn-demand-selected-thread="true"
          style={{ color: "#587087", fontSize: 11, fontWeight: 850 }}
        >
          Conversation with {selectedParticipant.name}
        </div>
      ) : null}

      {conversationAccess === "loading" || loading ? (
        <div style={{ color: "#587087", fontSize: 13 }}>Loading private replies...</div>
      ) : conversationAccess === "unavailable" ? (
        <div
          data-gsn-demand-conversation-unavailable="true"
          style={{
            padding: compact ? "12px 10px" : "14px",
            borderRadius: 16,
            border: "1px solid rgba(163,59,22,0.16)",
            background: "#FFF8F4",
            color: "#7C3218",
            fontSize: 12,
            lineHeight: 1.45,
          }}
        >
          Private replies are not available here. Request actions remain below.
        </div>
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
          No replies yet. Send the first message.
        </div>
      )}
      {conversationAccess === "available" && isOwner && participants.length === 0 ? (
        <div style={{ color: "#587087", fontSize: 12 }}>
          Replies appear here.
        </div>
      ) : conversationAccess === "available" ? (
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
          {!isOwner ? (
            <div
              data-gsn-demand-seller-quick-replies="editable"
              aria-label="Optional quick replies"
              style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
            >
              {SELLER_QUICK_REPLIES.map((reply) => (
                <SecondaryButton
                  key={reply}
                  type="button"
                  aria-pressed={text === reply}
                  onClick={() => {
                    setText(reply);
                    window.requestAnimationFrame(() => textareaRef.current?.focus());
                  }}
                  debugId={`demand-box.response.${requestId}.quick.${reply.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                  stableHeight={38}
                  style={{
                    flex: "1 1 118px",
                    minWidth: 0,
                    borderRadius: 999,
                    padding: "7px 10px",
                    fontSize: 11.5,
                    fontWeight: 850,
                  }}
                >
                  {reply}
                </SecondaryButton>
              ))}
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
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
      ) : null}

      {error ? (
        <div role="alert" style={{ color: "#A33B16", fontSize: 12, fontWeight: 800 }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}
