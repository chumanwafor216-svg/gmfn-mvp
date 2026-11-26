import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  createDemandMediaAttachment,
  createMarketplaceRequestResponse,
  getMyWithdrawalDestination,
  listMarketplaceRequestResponses,
  listProtectedTrades,
  markMarketplaceRequestResponsesRead,
  type MarketplaceRequestResponseItem,
  type ProtectedTradeRecord,
} from "../lib/api";
import { APP_ROUTES } from "../lib/appRoutes";
import { withCommunityQuery } from "../lib/communityRouteContext";
import { resolveProfileImageUrl } from "../lib/profileImage";
import GsnMicrophoneIcon from "./GsnMicrophoneIcon";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import ProtectedVoiceNotePlayer from "./ProtectedVoiceNotePlayer";
import ProtectedDemandMedia from "./ProtectedDemandMedia";
import {
  PrimaryButton,
  SecondaryButton,
  StableButton,
  StableCtaLink,
  StableDisclosureSummary,
  SubtleButton,
} from "./StableButton";
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
  embedded?: boolean;
  communityId?: number;
  preferredRecipientUserId?: number;
  preferredRecipientName?: string;
  supplyProductId?: number;
  supplyShopId?: number;
  protectedTradePath?: string;
  onUnreadChanged?: () => void;
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

function focusedTradePath(
  basePath: string,
  tradeId: number,
  focus: "record" | "tracking" | "confirmation"
): string {
  const [pathAndSearch] = String(basePath || APP_ROUTES.MARKETPLACE).split("#", 1);
  const [pathname, search = ""] = pathAndSearch.split("?", 2);
  const query = new URLSearchParams(search);
  query.set("protected_trade_id", String(tradeId));
  query.set("trade_focus", focus);
  return `${pathname}?${query.toString()}#marketplace-trade-evidence`;
}

function accountDetailsMessage(destination: any): string {
  const accountName = String(
    destination?.account_name || destination?.destination_name || ""
  ).trim();
  const accountNumber = String(
    destination?.account_number || destination?.bank_account_number || ""
  ).trim();
  if (!accountName || !accountNumber) return "";

  const bankName = String(destination?.bank_name || destination?.bank || "").trim();
  const sortCode = String(
    destination?.sort_code || destination?.bank_sort_code || ""
  ).trim();
  const currency = String(destination?.currency || "").trim().toUpperCase();

  return [
    "Payment account details (please verify before paying):",
    `Account name: ${accountName}`,
    `Account number / wallet: ${accountNumber}`,
    bankName ? `Bank / wallet provider: ${bankName}` : "",
    sortCode ? `Sort code: ${sortCode}` : "",
    currency ? `Currency: ${currency}` : "",
    "GSN has not verified these details and does not move the money.",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function DemandResponsePanel({
  requestId,
  ownerUserId,
  currentUser,
  isOwner,
  compact = false,
  embedded = false,
  communityId = 0,
  preferredRecipientUserId = 0,
  preferredRecipientName = "Seller",
  supplyProductId = 0,
  supplyShopId = 0,
  protectedTradePath = "",
  onUnreadChanged,
}: DemandResponsePanelProps) {
  const [rows, setRows] = useState<MarketplaceRequestResponseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<File | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaLink, setMediaLink] = useState("");
  const [mediaKind, setMediaKind] = useState<"image" | "video" | "document">("image");
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [recipientUserId, setRecipientUserId] = useState(
    isOwner ? Number(preferredRecipientUserId || 0) : 0
  );
  const [error, setError] = useState("");
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [addingAccountDetails, setAddingAccountDetails] = useState(false);
  const [tradeStepsOpen, setTradeStepsOpen] = useState(false);
  const [protectedTrades, setProtectedTrades] = useState<ProtectedTradeRecord[]>([]);
  const [conversationAccess, setConversationAccess] = useState<
    "loading" | "available" | "unavailable"
  >("loading");
  const threadRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rowsRef = useRef<MarketplaceRequestResponseItem[]>([]);
  const recipientRef = useRef(recipientUserId);
  const stickToLatestRef = useRef(true);
  const openedThreadRef = useRef("");
  const currentUserId = Number(currentUser?.id || currentUser?.user_id || 0);
  const canSharePhoto = Boolean(String(currentUser?.profile_image_url || "").trim());

  function normalizedRows(result: any): MarketplaceRequestResponseItem[] {
    const items = Array.isArray(result)
      ? result
      : Array.isArray(result?.items)
        ? result.items
        : [];
    const unique = new Map<number, MarketplaceRequestResponseItem>();
    items.forEach((row: MarketplaceRequestResponseItem) => unique.set(Number(row.id), row));
    return Array.from(unique.values()).sort((left, right) => {
      const timeDifference = new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
      return timeDifference || Number(left.id) - Number(right.id);
    });
  }

  async function load(options: { silent?: boolean } = {}) {
    const silent = options.silent === true;
    if (!silent) {
      setLoading(true);
      setConversationAccess("loading");
      setError("");
    }
    try {
      const result: any = await listMarketplaceRequestResponses(requestId);
      const nextRows = normalizedRows(result);
      const previousIds = new Set(rowsRef.current.map((row) => Number(row.id)));
      const selectedPeerId = isOwner ? Number(recipientRef.current || 0) : ownerUserId;
      const incoming = nextRows.filter((row) => {
        if (previousIds.has(Number(row.id)) || Number(row.author_user_id) !== selectedPeerId) return false;
        return Number(row.recipient_user_id) === currentUserId;
      });
      rowsRef.current = nextRows;
      setRows(nextRows);
      if (silent && incoming.length > 0 && !stickToLatestRef.current) {
        setNewMessageCount((current) => current + incoming.length);
      }
      setConversationAccess("available");
    } catch (err: any) {
      if (!silent) {
        setRows([]);
        rowsRef.current = [];
        setConversationAccess("unavailable");
        setError(String(err?.message || "Private replies could not be loaded."));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [requestId]);

  useEffect(() => {
    recipientRef.current = recipientUserId;
  }, [recipientUserId]);

  useEffect(() => {
    if (!isOwner || !preferredRecipientUserId) return;
    setRecipientUserId(Number(preferredRecipientUserId));
  }, [isOwner, preferredRecipientUserId]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (!active || (typeof document !== "undefined" && document.visibilityState !== "visible")) return;
      void load({ silent: true });
    };
    const timer = window.setInterval(refresh, 4000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [requestId, ownerUserId, currentUserId, isOwner]);

  const participants = useMemo(() => {
    const names = new Map<number, string>();
    if (isOwner && preferredRecipientUserId > 0) {
      names.set(preferredRecipientUserId, preferredRecipientName || "Seller");
    }
    rows.forEach((row) => {
      if (row.author_user_id !== ownerUserId) {
        names.set(row.author_user_id, row.author_display_name || "Member");
      }
      if (
        row.recipient_user_id !== ownerUserId &&
        row.recipient_user_id !== currentUserId
      ) {
        if (!names.has(row.recipient_user_id)) {
          names.set(
            row.recipient_user_id,
            row.recipient_display_name || row.recipient_gmfn_id || `Member ${row.recipient_user_id}`
          );
        }
      }
    });
    return Array.from(names.entries()).map(([id, name]) => ({ id, name }));
  }, [currentUserId, isOwner, ownerUserId, preferredRecipientName, preferredRecipientUserId, rows]);

  useEffect(() => {
    if (!isOwner) return;
    if (participants.length === 0) {
      if (recipientUserId) setRecipientUserId(0);
      return;
    }
    if (participants.some((participant) => participant.id === recipientUserId)) {
      return;
    }
    setRecipientUserId(
      preferredRecipientUserId > 0
        ? preferredRecipientUserId
        : participants.length === 1
          ? participants[0].id
          : 0
    );
  }, [isOwner, participants, preferredRecipientUserId, recipientUserId]);

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
        const responderRow = threadRows.find(
          (row) => Number(row.author_user_id || 0) === participant.id
        );
        return {
          ...participant,
          count: threadRows.length,
          lastRow,
          profileImageUrl: responderRow?.author_profile_image_url || null,
          preview: lastRow ? responsePreview(lastRow) : "No replies yet",
          unreadCount: threadRows.filter(
            (row) => row.is_unread && Number(row.author_user_id) === participant.id
          ).length,
        };
      })
      .filter((thread) => thread.count > 0 || thread.id === preferredRecipientUserId);
  }, [isOwner, ownerUserId, participants, preferredRecipientUserId, rows]);

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

  const activePeerUserId = isOwner ? recipientUserId : ownerUserId;
  const tradeContextAvailable = Boolean(requestId && supplyProductId && supplyShopId);
  const matchedProtectedTrade = useMemo(() => {
    if (!tradeContextAvailable) return null;
    return (
      protectedTrades.find((trade) => {
        const meta = trade?.meta || {};
        const sourceDemandId = Number(meta?.source_demand_id || 0);
        const sourceProductId = Number(
          meta?.source_match_product_id || trade?.product_id || 0
        );
        const sourceShopId = Number(meta?.source_match_shop_id || trade?.shop_id || 0);
        const participantIds = [
          Number(trade?.buyer_user_id || 0),
          Number(trade?.seller_user_id || 0),
        ];
        return (
          sourceDemandId === requestId &&
          sourceProductId === supplyProductId &&
          sourceShopId === supplyShopId &&
          participantIds.includes(currentUserId) &&
          (!activePeerUserId || participantIds.includes(activePeerUserId))
        );
      }) || null
    );
  }, [
    activePeerUserId,
    currentUserId,
    protectedTrades,
    requestId,
    supplyProductId,
    supplyShopId,
    tradeContextAvailable,
  ]);
  const payoutDetailsPath = withCommunityQuery(APP_ROUTES.PAYOUT_DETAILS, communityId);
  const protectedTradeBasePath = withCommunityQuery(
    protectedTradePath || APP_ROUTES.MARKETPLACE,
    communityId
  );

  useEffect(() => {
    if (!tradeContextAvailable) {
      setProtectedTrades([]);
      return;
    }
    if (!tradeStepsOpen) return;
    let cancelled = false;
    void listProtectedTrades({ limit: 50 })
      .then((items) => {
        if (!cancelled) setProtectedTrades(Array.isArray(items) ? items : []);
      })
      .catch(() => {
        if (!cancelled) setProtectedTrades([]);
      });
    return () => {
      cancelled = true;
    };
  }, [
    requestId,
    supplyProductId,
    supplyShopId,
    tradeContextAvailable,
    tradeStepsOpen,
  ]);

  async function addSavedAccountDetails() {
    if (addingAccountDetails) return;
    setAddingAccountDetails(true);
    setError("");
    try {
      const destination = await getMyWithdrawalDestination({
        clan_id: communityId || undefined,
        gmfn_id: String(currentUser?.gmfn_id || "").trim() || undefined,
      });
      const preparedMessage = accountDetailsMessage(destination);
      if (!preparedMessage) {
        setError(
          "Saved account details are incomplete. Open Account details, save the account name and number, then return here."
        );
        return;
      }
      setText((current) =>
        [current.trim(), preparedMessage].filter(Boolean).join("\n\n")
      );
      window.requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (err: any) {
      setError(
        String(
          err?.message ||
            "Saved account details could not be loaded. Open Account details and check them first."
        )
      );
    } finally {
      setAddingAccountDetails(false);
    }
  }

  function scrollToLatest() {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
    stickToLatestRef.current = true;
    setNewMessageCount(0);
  }

  useEffect(() => {
    if (loading || !threadRef.current) return;
    const threadKey = `${requestId}:${activePeerUserId}`;
    const openingThread = openedThreadRef.current !== threadKey;
    openedThreadRef.current = threadKey;
    if (!openingThread && !stickToLatestRef.current) return;
    const frame = window.requestAnimationFrame(() => {
      scrollToLatest();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activePeerUserId, loading, requestId, visibleRows.length]);

  useEffect(() => {
    if (!activePeerUserId || !visibleRows.some((row) => row.is_unread)) return;
    let cancelled = false;
    void markMarketplaceRequestResponsesRead(requestId, activePeerUserId)
      .then(() => {
        if (cancelled) return;
        setRows((current) => {
          const next = current.map((row) =>
            Number(row.author_user_id) === activePeerUserId &&
            Number(row.recipient_user_id) === currentUserId
              ? { ...row, is_unread: false, read_at: row.read_at || new Date().toISOString() }
              : row
          );
          rowsRef.current = next;
          return next;
        });
        onUnreadChanged?.();
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activePeerUserId, currentUserId, onUnreadChanged, requestId, visibleRows]);

  async function send() {
    if (voiceRecording) {
      setError("Tap Stop and wait for Voice note ready before sending your reply.");
      return;
    }
    if (!text.trim() && !voice && !mediaFile && !mediaLink.trim()) {
      setError("Add a message, voice note, or attachment.");
      return;
    }
    if (isOwner && !recipientUserId) {
      setError("Choose the member you are replying to.");
      return;
    }

    setSending(true);
    setError("");
    try {
      const created = await createMarketplaceRequestResponse(
        requestId,
        {
          text: text.trim() || (mediaFile || mediaLink.trim() ? "Attachment" : undefined),
          client_response_id: clientKey("demand-response"),
          recipient_user_id: isOwner ? recipientUserId : undefined,
          supply_product_id: isOwner && supplyProductId ? supplyProductId : undefined,
          supply_shop_id: isOwner && supplyShopId ? supplyShopId : undefined,
          show_sender_photo: canSharePhoto && showPhoto,
        },
        voice
      );
      let attachmentError = "";
      if (mediaFile || mediaLink.trim()) {
        try {
          await createDemandMediaAttachment("response", created.id, {
            kind: mediaLink.trim() ? "link" : mediaKind,
            file: mediaFile,
            link: mediaLink.trim() || undefined,
          });
        } catch (attachmentErr: any) {
          attachmentError = String(attachmentErr?.message || "The attachment could not be added.");
        }
      }
      setText("");
      setVoice(null);
      setMediaFile(null);
      setMediaLink("");
      setShowPhoto(false);
      setAttachmentsOpen(false);
      setVoiceOpen(false);
      stickToLatestRef.current = true;
      await load();
      if (attachmentError) {
        setError(`Reply sent, but the attachment was not added: ${attachmentError}`);
      }
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
        padding: embedded ? 0 : compact ? 12 : 14,
        borderRadius: embedded ? 0 : compact ? 22 : 18,
        border: embedded
          ? "none"
          : compact
            ? "1px solid rgba(13,95,168,0.18)"
            : "1px solid rgba(13,95,168,0.16)",
        background: embedded
          ? "transparent"
          : compact
            ? "linear-gradient(180deg, #F6FBFF 0%, #FFFFFF 100%)"
            : "#FFFFFF",
        boxShadow: embedded ? "none" : compact ? "0 10px 24px rgba(15,55,95,0.10)" : undefined,
        display: "grid",
        gap: embedded ? 9 : 12,
      }}
    >
      {conversationAccess === "available" && compact ? (
        <div
          data-gsn-demand-privacy-notice="compact"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#587087", fontSize: 11, fontWeight: 850 }}
        >
          <GsnLegacyIcon name="shield" size={14} />
          Private conversation. Only the requester and this member can read or play it.
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
                <StableButton
                  key={thread.id}
                  type="button"
                  debugId={`demand-box.response.${requestId}.thread.${thread.id}`}
                  data-gsn-demand-thread-row="true"
                  aria-pressed={selected}
                  onClick={() => {
                    setNewMessageCount(0);
                    stickToLatestRef.current = true;
                    setRecipientUserId((current) => (current === thread.id ? 0 : thread.id));
                  }}
                  aria-expanded={selected}
                  style={{
                    width: "100%",
                    minHeight: 64,
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0, 1fr) auto",
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
                  {resolveProfileImageUrl(thread.profileImageUrl) ? (
                    <img
                      src={resolveProfileImageUrl(thread.profileImageUrl)}
                      alt=""
                      data-gsn-demand-thread-avatar="portrait"
                      style={{
                        width: 38,
                        height: 38,
                        flex: "0 0 38px",
                        borderRadius: 999,
                        objectFit: "cover",
                        border: "2px solid rgba(255,255,255,0.96)",
                        boxShadow: "0 2px 7px rgba(15,23,42,0.16)",
                      }}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      data-gsn-demand-thread-avatar="initials"
                      style={{
                        width: 38,
                        height: 38,
                        flex: "0 0 38px",
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        background: "#EAF3FF",
                        color: "#0B4FA8",
                        border: "2px solid rgba(255,255,255,0.96)",
                        fontSize: 11,
                        fontWeight: 950,
                      }}
                    >
                      {initials(thread.name)}
                    </span>
                  )}
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
                      {thread.count} {thread.count === 1 ? "reply" : "replies"} Â· {thread.preview}
                    </span>
                  </span>
                  {thread.unreadCount > 0 ? (
                    <span
                      data-gsn-demand-thread-unread={thread.unreadCount}
                      aria-label={`${thread.unreadCount} unread messages`}
                      style={{
                        minWidth: 24,
                        height: 24,
                        padding: "0 7px",
                        borderRadius: 999,
                        display: "grid",
                        placeItems: "center",
                        background: "#0B6CE3",
                        color: "#FFFFFF",
                        fontSize: 11,
                        fontWeight: 950,
                      }}
                    >
                      {thread.unreadCount}
                    </span>
                  ) : (
                    <span aria-hidden="true" style={{ color: "#0B4FA8", fontSize: 22, lineHeight: 1 }}>
                      â€º
                    </span>
                  )}
                </StableButton>
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
      ) : isOwner && participantThreads.length > 0 && !selectedParticipant ? (
        <div
          data-gsn-demand-conversation-picker="true"
          style={{
            padding: compact ? "14px 12px" : "16px 14px",
            borderRadius: 18,
            border: "1px solid rgba(13,95,168,0.14)",
            background: "#F6FAFF",
            color: "#536A81",
            fontSize: 12,
            lineHeight: 1.45,
            textAlign: "center",
          }}
        >
          Choose a conversation above to open it.
        </div>
      ) : visibleRows.length ? (
        <div
          ref={threadRef}
          data-gsn-demand-conversation="whatsapp-like"
          onScroll={(event) => {
            const element = event.currentTarget;
            stickToLatestRef.current =
              element.scrollHeight - element.scrollTop - element.clientHeight < 48;
            if (stickToLatestRef.current && newMessageCount) setNewMessageCount(0);
          }}
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
          {visibleRows.map((row, index) => {
            const photoUrl = resolveProfileImageUrl(row.author_profile_image_url);
            const mine = Boolean(row.is_mine);
            const day = messageDay(row.created_at);
            const previousRow = index > 0 ? visibleRows[index - 1] : null;
            const priorDay = previousRow ? messageDay(previousRow.created_at) : "";
            const repeatAuthor = Boolean(
              previousRow &&
              Number(previousRow.author_user_id) === Number(row.author_user_id) &&
              day === priorDay
            );
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
                  data-gsn-demand-message-repeat={repeatAuthor ? "true" : undefined}
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: mine ? "row-reverse" : "row",
                    alignItems: "flex-end",
                    gap: 7,
                  }}
                >
                  {repeatAuthor ? (
                    <span aria-hidden="true" style={{ width: compact ? 28 : 34, flex: `0 0 ${compact ? 28 : 34}px` }} />
                  ) : photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={`${row.author_display_name} profile`}
                      data-gsn-demand-message-avatar="portrait"
                      style={{
                        width: compact ? 28 : 34,
                        height: compact ? 28 : 34,
                        flex: `0 0 ${compact ? 28 : 34}px`,
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
                        width: compact ? 28 : 34,
                        height: compact ? 28 : 34,
                        flex: `0 0 ${compact ? 28 : 34}px`,
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
                      maxWidth: compact ? "calc(98% - 35px)" : "calc(90% - 41px)",
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
                    {!repeatAuthor ? (
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
                    ) : null}
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
                    {row.media_attachments?.map((attachment) => (
                      <ProtectedDemandMedia
                        key={attachment.id}
                        attachment={attachment}
                        compact
                      />
                    ))}
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
          {newMessageCount > 0 ? (
            <SubtleButton
              type="button"
              data-gsn-demand-new-message-indicator="true"
              onClick={scrollToLatest}
              debugId={`demand-box.response.${requestId}.new-messages`}
              stableHeight={38}
              style={{
                position: "sticky",
                bottom: 4,
                justifySelf: "center",
                minHeight: 38,
                padding: "8px 13px",
                borderRadius: 999,
                border: "1px solid rgba(11,108,227,0.32)",
                background: "#FFFFFF",
                color: "#0B4FA8",
                boxShadow: "0 7px 18px rgba(15,23,42,0.16)",
                font: "inherit",
                fontSize: 11,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {newMessageCount} new {newMessageCount === 1 ? "message" : "messages"} â†“
            </SubtleButton>
          ) : null}
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
      ) : conversationAccess === "available" && (!isOwner || participantThreads.length === 0 || selectedParticipant) ? (
        <div
          data-gsn-demand-reply-composer="true"
          style={{
            padding: compact ? 9 : 12,
            borderRadius: 18,
            border: "1px solid rgba(13,95,168,0.12)",
            background: "#F8FBFF",
            display: "grid",
            gap: 8,
            position: "sticky",
            bottom: 0,
            zIndex: 2,
          }}
        >
          {!isOwner ? (
            <details data-gsn-demand-preset-messages="collapsed" style={{ minWidth: 0 }}>
              <StableDisclosureSummary
                debugId={`demand-box.response.${requestId}.preset-messages`}
                stableHeight={38}
                style={{
                  width: "100%",
                  minHeight: 38,
                  padding: "7px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(13,95,168,0.14)",
                  background: "#FFFFFF",
                  color: "#0B4FA8",
                  fontSize: 11.5,
                  fontWeight: 900,
                  justifyContent: "space-between",
                }}
              >
                <span>Preset messages</span>
                <span aria-hidden="true">+</span>
              </StableDisclosureSummary>
              <div
                aria-label="Preset messages"
                style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  paddingTop: 7,
                  paddingBottom: 2,
                }}
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
                    debugId={`demand-box.response.${requestId}.preset.${reply.toLowerCase().replace(/[^a-z]+/g, "-")}`}
                    stableHeight={38}
                    style={{
                      flex: "0 0 auto",
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
            </details>
          ) : null}
          {tradeContextAvailable ? (
            <details
              data-gsn-demand-trade-steps="collapsed"
              onToggle={(event) => setTradeStepsOpen(event.currentTarget.open)}
              style={{ minWidth: 0 }}
            >
              <StableDisclosureSummary
                debugId={`demand-box.response.${requestId}.trade-steps`}
                stableHeight={40}
                style={{
                  width: "100%",
                  minHeight: 40,
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid rgba(214,170,69,0.32)",
                  background: "linear-gradient(180deg, #FFFDF7 0%, #F7FAFD 100%)",
                  color: "#17324A",
                  fontSize: 12,
                  fontWeight: 950,
                  justifyContent: "space-between",
                }}
              >
                <span>Trade steps</span>
                <span style={{ color: "#64748B", fontSize: 11, fontWeight: 850 }}>
                  {matchedProtectedTrade ? "Continue record" : "Account, protect, track"}
                </span>
              </StableDisclosureSummary>
              <div
                data-gsn-demand-trade-steps-panel="true"
                style={{
                  display: "grid",
                  gap: 7,
                  marginTop: 7,
                  padding: 9,
                  borderRadius: 14,
                  border: "1px solid rgba(13,95,168,0.12)",
                  background: "#FFFFFF",
                }}
              >
                {!isOwner ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 7,
                      alignItems: "center",
                    }}
                  >
                    <SecondaryButton
                      type="button"
                      onClick={() => void addSavedAccountDetails()}
                      busy={addingAccountDetails}
                      busyLabel="Loading"
                      debugId={`demand-box.response.${requestId}.account-details`}
                      data-gsn-demand-account-details="review-before-send"
                      stableHeight={42}
                      style={{ borderRadius: 12, fontSize: 12 }}
                    >
                      Add account details
                    </SecondaryButton>
                    <StableCtaLink
                      to={payoutDetailsPath}
                      debugId={`demand-box.response.${requestId}.manage-account-details`}
                      stableHeight={42}
                      style={{ borderRadius: 12, padding: "8px 10px", fontSize: 11.5 }}
                    >
                      Manage
                    </StableCtaLink>
                  </div>
                ) : null}

                {matchedProtectedTrade?.id ? (
                  <StableCtaLink
                    to={focusedTradePath(
                      protectedTradeBasePath,
                      Number(matchedProtectedTrade.id),
                      "record"
                    )}
                    debugId={`demand-box.response.${requestId}.protected-trade.open`}
                    data-gsn-demand-protected-trade="associated-record"
                    stableHeight={44}
                    style={{ borderRadius: 12, fontSize: 12 }}
                  >
                    Open Protected Trade
                  </StableCtaLink>
                ) : isOwner ? (
                  <StableCtaLink
                    to={protectedTradeBasePath}
                    debugId={`demand-box.response.${requestId}.protected-trade.start`}
                    data-gsn-demand-protected-trade="requester-start"
                    stableHeight={44}
                    style={{ borderRadius: 12, fontSize: 12 }}
                  >
                    Start Protected Trade
                  </StableCtaLink>
                ) : (
                  <div
                    data-gsn-demand-protected-trade="waiting-for-requester"
                    style={{ color: "#587087", fontSize: 11.5, lineHeight: 1.4 }}
                  >
                    The requester starts the linked Protected Trade. It will appear here for both sides.
                  </div>
                )}

                {matchedProtectedTrade?.id ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 7,
                    }}
                  >
                    <StableCtaLink
                      to={focusedTradePath(
                        protectedTradeBasePath,
                        Number(matchedProtectedTrade.id),
                        "tracking"
                      )}
                      debugId={`demand-box.response.${requestId}.trade-tracking`}
                      data-gsn-demand-trade-stage="tracking-evidence"
                      stableHeight={42}
                      style={{ borderRadius: 12, padding: "8px 7px", fontSize: 11.5 }}
                    >
                      Tracking update
                    </StableCtaLink>
                    <StableCtaLink
                      to={focusedTradePath(
                        protectedTradeBasePath,
                        Number(matchedProtectedTrade.id),
                        "confirmation"
                      )}
                      debugId={`demand-box.response.${requestId}.trade-confirmation`}
                      data-gsn-demand-trade-stage="confirmation-remarks"
                      stableHeight={42}
                      style={{ borderRadius: 12, padding: "8px 7px", fontSize: 11.5 }}
                    >
                      Confirm / remarks
                    </StableCtaLink>
                  </div>
                ) : null}

                <div style={{ color: "#64748B", fontSize: 10.5, lineHeight: 1.35 }}>
                  Account details stay in the draft until you press Send. GSN records evidence; it does not verify payment or guarantee delivery.
                </div>
              </div>
            </details>
          ) : null}
          <div
            data-gsn-demand-composer-row="compact"
            style={{
              display: "grid",
              gridTemplateColumns: "42px minmax(0, 1fr) 46px",
              gap: 7,
              alignItems: "end",
              minWidth: 0,
            }}
          >
            <SubtleButton
              type="button"
              aria-label="Add attachment"
              aria-expanded={attachmentsOpen}
              onClick={() => setAttachmentsOpen((current) => !current)}
              debugId={`demand-box.response.${requestId}.attachments`}
              stableHeight={42}
              style={{ minWidth: 42, width: 42, padding: 0, borderRadius: 999, fontSize: 22 }}
            >
              +
            </SubtleButton>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (!sending && !voiceRecording && (text.trim() || voice || mediaFile || mediaLink.trim())) {
                    void send();
                  }
                }
              }}
              placeholder="Message..."
              aria-label="Private message"
              maxLength={1500}
              rows={1}
              style={{
                width: "100%",
                minWidth: 0,
                minHeight: 42,
                maxHeight: 110,
                resize: "vertical",
                borderRadius: 18,
                border: "1px solid rgba(13,95,168,0.18)",
                padding: "10px 12px",
                color: "#0B1F33",
                background: "#FFFFFF",
                font: "inherit",
                lineHeight: 1.35,
              }}
            />
            {text.trim() || voice || mediaFile || mediaLink.trim() ? (
              <PrimaryButton
                type="button"
                aria-label="Send message"
                onClick={() => void send()}
                disabled={sending || voiceRecording}
                busy={sending}
                busyLabel="..."
                debugId={`demand-box.response.${requestId}.send`}
                stableHeight={46}
                style={{ minWidth: 46, width: 46, padding: 0, borderRadius: 999, fontSize: 19 }}
              >
                Send
              </PrimaryButton>
            ) : (
              <PrimaryButton
                type="button"
                aria-label="Record voice note"
                aria-expanded={voiceOpen}
                onClick={() => setVoiceOpen((current) => !current)}
                debugId={`demand-box.response.${requestId}.voice-toggle`}
                stableHeight={46}
                style={{ minWidth: 46, width: 46, padding: 0, borderRadius: 999 }}
              >
                <GsnMicrophoneIcon size={22} />
              </PrimaryButton>
            )}
          </div>
          {voiceOpen || voice ? (
            <VoiceNoteRecorder
              value={voice}
              onChange={setVoice}
              onRecordingChange={setVoiceRecording}
              maxSeconds={60}
              disabled={sending}
              debugPrefix={`demand-box.response.${requestId}.voice`}
              compact
              startLabel="Record voice note"
            />
          ) : null}
          {attachmentsOpen ? (
            <div
              data-gsn-demand-attachment-options="expanded"
              style={{
                display: "grid",
                gap: 7,
                padding: 9,
                borderRadius: 14,
                border: "1px solid rgba(13,95,168,0.12)",
                background: "#FFFFFF",
              }}
            >
              <div style={{ color: "#29445E", fontSize: 12, fontWeight: 900 }}>
                Photo, video, document or link
              </div>
              <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
              <input
                type="file"
                data-gmfn-action-root="true"
                data-cta-id={`demand-box.response.${requestId}.attachment-file`}
                aria-label="Choose attachment"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => {
                  const selected = event.target.files?.[0] || null;
                  setMediaFile(selected);
                  setMediaLink("");
                  setMediaKind(
                    selected?.type.startsWith("video/")
                      ? "video"
                      : selected?.type.startsWith("image/")
                        ? "image"
                        : "document"
                  );
                }}
              />
              <input
                type="url"
                value={mediaLink}
                onChange={(event) => {
                  setMediaLink(event.target.value);
                  if (event.target.value) setMediaFile(null);
                }}
                placeholder="https://example.com/item"
                aria-label="Attached link"
                style={{ minHeight: 42, borderRadius: 12, border: "1px solid rgba(13,95,168,0.18)", padding: "8px 10px", font: "inherit" }}
              />
              {mediaFile ? <span style={{ color: "#587087", fontSize: 11 }}>{mediaFile.name}</span> : null}
            </div>
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
            </div>
          ) : null}
          {voiceRecording ? (
            <div style={{ color: "#587087", fontSize: 12, textAlign: "center" }}>
              Recording continues here. Tap Stop before sending.
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
