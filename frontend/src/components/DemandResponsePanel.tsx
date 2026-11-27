import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  addProtectedTradeEvent,
  createDemandMediaAttachment,
  createMarketplaceRequestResponse,
  createProtectedTrade,
  createProtectedTradePaymentReference,
  getDemandSupplyTradeHandoff,
  listMarketplaceRequestResponses,
  listProtectedTrades,
  markMarketplaceRequestResponsesRead,
  type MarketplaceRequestResponseItem,
  type ProtectedTradeRecord,
} from "../lib/api";
import { APP_ROUTES } from "../lib/appRoutes";
import { withCommunityQuery } from "../lib/communityRouteContext";
import { resolveProfileImageUrl } from "../lib/profileImage";
import {
  parseProtectedTradeAgreementMessage,
  serializeProtectedTradeAgreementMessage,
  type ProtectedTradeAgreementMessage,
} from "../lib/protectedTradeAgreementMessage";
import {
  parseSellerPaymentMessage,
  serializeSellerPaymentMessage,
} from "../lib/protectedTradePaymentMessage";
import DemandPaymentDetailsCard from "./DemandPaymentDetailsCard";
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
  openTradeRecords?: boolean;
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
  openTradeRecords = false,
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
  const [sendingPaymentDetails, setSendingPaymentDetails] = useState(false);
  const [paymentAccountSetupRequired, setPaymentAccountSetupRequired] = useState(false);
  const [tradeStepsOpen, setTradeStepsOpen] = useState(Boolean(openTradeRecords));
  const [protectedTradeFormOpen, setProtectedTradeFormOpen] = useState(false);
  const [creatingProtectedTrade, setCreatingProtectedTrade] = useState(false);
  const [recordingAgreementTradeId, setRecordingAgreementTradeId] = useState(0);
  const [protectedTradeDraft, setProtectedTradeDraft] = useState({
    itemTitle: "",
    quantity: "1",
    amount: "",
    currency: "NGN",
    termsSummary: "",
    paymentTiming: "pay_now" as "pay_now" | "deferred_credit",
  });
  const [protectedTrades, setProtectedTrades] = useState<ProtectedTradeRecord[]>([]);
  const [conversationAccess, setConversationAccess] = useState<
    "loading" | "available" | "unavailable"
  >("loading");
  const threadRef = useRef<HTMLDivElement | null>(null);
  const tradeStepsRef = useRef<HTMLDetailsElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const rowsRef = useRef<MarketplaceRequestResponseItem[]>([]);
  const recipientRef = useRef(recipientUserId);
  const recipientSelectionDismissedRef = useRef(false);
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
    recipientSelectionDismissedRef.current = false;
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
    if (!recipientUserId && recipientSelectionDismissedRef.current) return;
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

  const latestAgreementMessageIdByTrade = useMemo(() => {
    const latestByTrade = new Map<number, number>();
    visibleRows.forEach((row) => {
      const agreement = parseProtectedTradeAgreementMessage(row.text);
      const messageId = Number(row.id || 0);
      if (!agreement?.tradeId || !messageId) return;
      const current = latestByTrade.get(agreement.tradeId) || 0;
      if (messageId > current) latestByTrade.set(agreement.tradeId, messageId);
    });
    return latestByTrade;
  }, [visibleRows]);

  const activePeerUserId = isOwner ? recipientUserId : ownerUserId;
  const tradeContextAvailable = Boolean(requestId && supplyProductId && supplyShopId);

  useEffect(() => {
    if (!tradeContextAvailable) return;
    if (!openTradeRecords) {
      setTradeStepsOpen(false);
      return;
    }
    setTradeStepsOpen(true);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        tradeStepsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [openTradeRecords, tradeContextAvailable]);

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
  const matchedTradeStatus = String(matchedProtectedTrade?.status || "").toLowerCase();
  const matchedPaymentStatus = String(matchedProtectedTrade?.payment_status || "").toLowerCase();
  const matchedTradeCode = String(matchedProtectedTrade?.trade_code || "Trade Record");
  const matchedTradeMeta = matchedProtectedTrade?.meta || {};
  const matchedPaymentReference = String(matchedTradeMeta.payment_reference || "").trim();
  const matchedPaymentTiming = matchedTradeMeta.payment_timing === "deferred_credit"
    ? "deferred_credit"
    : "pay_now";
  const tradeAgreementAccepted = [
    "agreed",
    "payment_instructed",
    "payment_claimed",
    "payment_under_review",
    "payment_received",
    "release_pending",
    "released",
    "received",
    "not_received",
    "disputed",
  ].includes(matchedTradeStatus);
  const deferredCreditAccepted =
    matchedPaymentTiming === "deferred_credit" && tradeAgreementAccepted;
  const dispatchUnlocked =
    matchedPaymentStatus === "seller_confirmed_received" || deferredCreditAccepted;
  const payoutDetailsPath = withCommunityQuery(APP_ROUTES.PAYOUT_DETAILS, communityId);
  const merchantVerificationPath = `${withCommunityQuery(APP_ROUTES.SHOP, communityId)}#shop-control-merchant-release-rail`;

  useEffect(() => {
    if (!tradeContextAvailable) {
      setProtectedTrades([]);
      return;
    }
    if (conversationAccess !== "available") return;
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
    conversationAccess,
  ]);

  async function sendSellerPaymentDetails() {
    if (sendingPaymentDetails) return;
    const tradeId = Number(matchedProtectedTrade?.id || 0);
    if (isOwner || !tradeId) {
      setError("A matched Trade Record is required before the seller can send payment details.");
      return;
    }

    setSendingPaymentDetails(true);
    setPaymentAccountSetupRequired(false);
    setError("");
    try {
      const details = await createProtectedTradePaymentReference(tradeId);
      const paymentMessage = serializeSellerPaymentMessage({
        itemTitle: details.item_title,
        amount: String(details.amount),
        currency: details.currency,
        accountName: details.account_name,
        accountNumber: details.account_number,
        bankName: details.bank_name,
        sortCode: details.sort_code || undefined,
        paymentReference: details.payment_reference,
        tradeCode: details.trade_code,
      });
      await createMarketplaceRequestResponse(requestId, {
        text: paymentMessage,
        client_response_id: clientKey("demand-seller-payment"),
        show_sender_photo: false,
      });
      const items = await listProtectedTrades({ limit: 50 });
      setProtectedTrades(Array.isArray(items) ? items : []);
      stickToLatestRef.current = true;
      await load();
    } catch (err: any) {
      const message = String(
        err?.message ||
          "Seller payment details could not be sent. Check the Trade Record amount and saved account details."
      );
      setPaymentAccountSetupRequired(
        /(?:seller|saved) account details (?:are missing|are incomplete)|account name, number, and bank/i.test(
          message
        )
      );
      setError(message);
    } finally {
      setSendingPaymentDetails(false);
    }
  }

  async function openProtectedTradeForm() {
    setProtectedTradeFormOpen(true);
    setError("");
    if (matchedTradeStatus === "amendment_requested" && matchedProtectedTrade?.id) {
      const meta = matchedProtectedTrade.meta || {};
      setProtectedTradeDraft({
        itemTitle: String(matchedProtectedTrade.item_title || ""),
        quantity: String(meta.quantity || "1"),
        amount: String(matchedProtectedTrade.amount || ""),
        currency: String(matchedProtectedTrade.currency || "NGN").toUpperCase(),
        termsSummary: String(matchedProtectedTrade.terms_summary || ""),
        paymentTiming: meta.payment_timing === "deferred_credit" ? "deferred_credit" : "pay_now",
      });
      return;
    }
    if (protectedTradeDraft.itemTitle || !requestId || !supplyProductId || !supplyShopId) return;
    try {
      const handoff = await getDemandSupplyTradeHandoff(requestId, supplyProductId, {
        shop_id: supplyShopId,
      });
      setProtectedTradeDraft((current) => ({
        ...current,
        itemTitle: String(handoff.item_title || handoff.product_title || "").trim(),
      }));
    } catch (err: any) {
      setError(String(err?.message || "The matched product could not be loaded for Trade Record."));
    }
  }

  async function issueProtectedTrade() {
    if (creatingProtectedTrade) return;
    const itemTitle = protectedTradeDraft.itemTitle.trim();
    const quantity = protectedTradeDraft.quantity.trim();
    const amount = protectedTradeDraft.amount.trim();
    const currency = protectedTradeDraft.currency.trim().toUpperCase();
    const termsSummary = protectedTradeDraft.termsSummary.trim();
    if (!itemTitle || !quantity || !amount || !currency || !termsSummary) {
      setError("Add the item, quantity, amount, currency, and agreed terms before issuing Trade Record.");
      return;
    }
    setCreatingProtectedTrade(true);
    setError("");
    let created: ProtectedTradeRecord | null = null;
    try {
      if (matchedTradeStatus === "amendment_requested" && matchedProtectedTrade?.id) {
        await addProtectedTradeEvent(Number(matchedProtectedTrade.id), {
          event_type: "terms.reissued",
          note: "Seller reissued the amended Trade Record agreement.",
          meta: {
            source: "demand_box_conversation",
            item_title: itemTitle,
            quantity,
            amount,
            currency,
            terms_summary: termsSummary,
            payment_timing: protectedTradeDraft.paymentTiming,
            request_id: requestId,
          },
        });
        created = {
          ...matchedProtectedTrade,
          item_title: itemTitle,
          amount,
          currency,
          terms_summary: termsSummary,
          status: "awaiting_buyer_acceptance",
          meta: {
            ...(matchedProtectedTrade.meta || {}),
            quantity,
            payment_timing: protectedTradeDraft.paymentTiming,
            deferred_credit: protectedTradeDraft.paymentTiming === "deferred_credit",
          },
        };
      } else {
        created = await createProtectedTrade({
          clan_id: communityId || undefined,
          participant_role: "seller",
          source_demand_id: requestId,
          source_match_product_id: supplyProductId,
          source_match_shop_id: supplyShopId,
          item_title: itemTitle,
          terms_summary: termsSummary,
          amount,
          currency,
          meta: {
            source: "demand_box_conversation",
            quantity,
            payment_timing: protectedTradeDraft.paymentTiming,
            deferred_credit: protectedTradeDraft.paymentTiming === "deferred_credit",
            merchant_verification_relevant: protectedTradeDraft.paymentTiming === "deferred_credit",
            conversation_request_id: requestId,
            not_escrow: true,
            not_money_custody: true,
          },
        });
      }
      const agreementMessage = serializeProtectedTradeAgreementMessage({
        tradeId: Number(created.id || 0),
        tradeCode: String(created.trade_code || ""),
        itemTitle,
        quantity,
        amount,
        currency,
        termsSummary,
        paymentTiming: protectedTradeDraft.paymentTiming,
      });
      await createMarketplaceRequestResponse(requestId, {
        text: agreementMessage,
        client_response_id: clientKey("demand-protected-trade"),
        show_sender_photo: false,
      });
      setProtectedTrades((current) => {
        const createdId = Number(created?.id || 0);
        return current.some((trade) => Number(trade.id || 0) === createdId)
          ? current.map((trade) => Number(trade.id || 0) === createdId ? created as ProtectedTradeRecord : trade)
          : [created as ProtectedTradeRecord, ...current];
      });
      setProtectedTradeFormOpen(false);
      setProtectedTradeDraft({
        itemTitle: "",
        quantity: "1",
        amount: "",
        currency,
        termsSummary: "",
        paymentTiming: "pay_now",
      });
      stickToLatestRef.current = true;
      await load();
    } catch (err: any) {
      setError(
        created?.id
          ? "Trade Record was created, but its conversation card could not be sent. Open the existing record instead of creating another."
          : String(err?.message || "Trade Record could not be issued.")
      );
    } finally {
      setCreatingProtectedTrade(false);
    }
  }

  async function recordAgreementDecision(
    agreement: ProtectedTradeAgreementMessage,
    decision: "accept" | "amend"
  ) {
    if (recordingAgreementTradeId) return;
    setRecordingAgreementTradeId(agreement.tradeId);
    setError("");
    try {
      const accepted = decision === "accept";
      await addProtectedTradeEvent(agreement.tradeId, {
        event_type: accepted ? "terms.agreed" : "terms.amendment_requested",
        note: accepted
          ? "Buyer accepted the seller's Trade Record agreement."
          : "Buyer requested changes to the Trade Record agreement in the conversation.",
        meta: { source: "demand_box_conversation", request_id: requestId },
      });
      await createMarketplaceRequestResponse(requestId, {
        text: accepted
          ? `Trade Record accepted: ${agreement.tradeCode}`
          : `Changes requested for Trade Record: ${agreement.tradeCode}`,
        client_response_id: clientKey("demand-protected-trade-decision"),
        show_sender_photo: false,
      });
      if (!accepted) {
        setText(`Please amend Trade Record ${agreement.tradeCode}: `);
        window.requestAnimationFrame(() => textareaRef.current?.focus());
      }
      setTradeStepsOpen(true);
      stickToLatestRef.current = true;
      const items = await listProtectedTrades({ limit: 50 });
      setProtectedTrades(Array.isArray(items) ? items : []);
      await load();
    } catch (err: any) {
      setError(String(err?.message || "Trade Record decision could not be recorded."));
    } finally {
      setRecordingAgreementTradeId(0);
    }
  }

  async function recordProtectedTradeStage(
    eventType: "payment.claimed" | "payment.received",
    note: string,
    conversationText: string
  ) {
    const tradeId = Number(matchedProtectedTrade?.id || 0);
    if (!tradeId || recordingAgreementTradeId) return;
    setRecordingAgreementTradeId(tradeId);
    setError("");
    try {
      await addProtectedTradeEvent(tradeId, {
        event_type: eventType,
        note,
        meta: { source: "demand_box_conversation", request_id: requestId },
      });
      await createMarketplaceRequestResponse(requestId, {
        text: conversationText,
        client_response_id: clientKey("demand-protected-trade-stage"),
        show_sender_photo: false,
      });
      const items = await listProtectedTrades({ limit: 50 });
      setProtectedTrades(Array.isArray(items) ? items : []);
      stickToLatestRef.current = true;
      await load();
    } catch (err: any) {
      setError(String(err?.message || "Trade Record step could not be recorded."));
    } finally {
      setRecordingAgreementTradeId(0);
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
                    setRecipientUserId((current) => {
                      const nextRecipientUserId = current === thread.id ? 0 : thread.id;
                      recipientSelectionDismissedRef.current = nextRecipientUserId === 0;
                      return nextRecipientUserId;
                    });
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
                      {thread.count} {thread.count === 1 ? "reply" : "replies"} · {thread.preview}
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
                      ›
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
            const sellerPaymentMessage = parseSellerPaymentMessage(row.text);
            const protectedTradeAgreement = parseProtectedTradeAgreementMessage(row.text);
            const agreementTrade = protectedTradeAgreement
              ? protectedTrades.find(
                  (trade) => Number(trade.id || 0) === protectedTradeAgreement.tradeId
                ) || null
              : null;
            const agreementStatus = String(agreementTrade?.status || "").toLowerCase();
            const agreementPaymentReference = String(
              agreementTrade?.meta?.payment_reference || ""
            ).trim();
            const agreementIsLatest = protectedTradeAgreement
              ? latestAgreementMessageIdByTrade.get(protectedTradeAgreement.tradeId) === Number(row.id || 0)
              : false;
            const agreementAwaitingBuyer =
              agreementIsLatest && agreementStatus === "awaiting_buyer_acceptance";
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
                    {sellerPaymentMessage ? (
                      <DemandPaymentDetailsCard details={sellerPaymentMessage} />
                    ) : protectedTradeAgreement ? (
                      <div
                        data-gsn-demand-protected-trade-card={protectedTradeAgreement.tradeCode}
                        style={{
                          display: "grid",
                          gap: 8,
                          padding: 10,
                          borderRadius: 14,
                          border: "1px solid rgba(172,125,29,0.28)",
                          background: "linear-gradient(180deg, #FFFDF6 0%, #F6FAFF 100%)",
                        }}
                      >
                        <div style={{ color: "#8A6416", fontSize: 10, fontWeight: 950, letterSpacing: 0.5, textTransform: "uppercase" }}>
                          Trade Record agreement
                        </div>
                        <div style={{ color: "#0B1F33", fontSize: 14, fontWeight: 950 }}>
                          {protectedTradeAgreement.itemTitle}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                          <span style={{ color: "#41556B", fontSize: 11.5, fontWeight: 850 }}>
                            Quantity: {protectedTradeAgreement.quantity}
                          </span>
                          <span style={{ color: "#0B4FA8", fontSize: 11.5, fontWeight: 950 }}>
                            {protectedTradeAgreement.currency} {protectedTradeAgreement.amount}
                          </span>
                        </div>
                        <div style={{ color: "#41556B", fontSize: 11.5, lineHeight: 1.4 }}>
                          {protectedTradeAgreement.termsSummary}
                        </div>
                        <div style={{ color: "#64748B", fontSize: 10.5, fontWeight: 850 }}>
                          {protectedTradeAgreement.paymentTiming === "deferred_credit"
                            ? "Deferred payment / credit terms"
                            : "Payment due now"} · {protectedTradeAgreement.tradeCode}
                        </div>
                        {agreementPaymentReference ? (
                          <div
                            data-gsn-demand-trade-payment-code="linked-evidence"
                            style={{
                              padding: "7px 8px",
                              borderRadius: 10,
                              background: "#EAF3FF",
                              color: "#0B4FA8",
                              fontSize: 11,
                              fontWeight: 950,
                              overflowWrap: "anywhere",
                            }}
                          >
                            Payment code: {agreementPaymentReference}
                          </div>
                        ) : null}
                        {isOwner && !mine && agreementAwaitingBuyer ? (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 }}>
                            <PrimaryButton
                              type="button"
                              onClick={() => void recordAgreementDecision(protectedTradeAgreement, "accept")}
                              busy={recordingAgreementTradeId === protectedTradeAgreement.tradeId}
                              busyLabel="Saving"
                              debugId={`demand-box.response.${requestId}.trade.accept.${protectedTradeAgreement.tradeId}`}
                              stableHeight={40}
                              style={{ borderRadius: 11, fontSize: 11.5 }}
                            >
                              Accept agreement
                            </PrimaryButton>
                            <SecondaryButton
                              type="button"
                              onClick={() => void recordAgreementDecision(protectedTradeAgreement, "amend")}
                              disabled={recordingAgreementTradeId === protectedTradeAgreement.tradeId}
                              debugId={`demand-box.response.${requestId}.trade.amend.${protectedTradeAgreement.tradeId}`}
                              stableHeight={40}
                              style={{ borderRadius: 11, fontSize: 11.5 }}
                            >
                              Request changes
                            </SecondaryButton>
                          </div>
                        ) : !agreementIsLatest ? (
                          <div style={{ color: "#64748B", fontSize: 11, fontWeight: 900 }}>
                            Superseded by the latest Trade Record agreement.
                          </div>
                        ) : agreementStatus === "amendment_requested" ? (
                          <div style={{ color: "#9A5B12", fontSize: 11, fontWeight: 900 }}>
                            Changes requested in this conversation.
                          </div>
                        ) : agreementStatus ? (
                          <div style={{ color: "#17663D", fontSize: 11, fontWeight: 900 }}>
                            Status: {agreementStatus.replace(/_/g, " ")}
                          </div>
                        ) : null}
                      </div>
                    ) : row.text ? (
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
              {newMessageCount} new {newMessageCount === 1 ? "message" : "messages"} ↓
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
              ref={tradeStepsRef}
              data-gsn-demand-trade-steps={tradeStepsOpen ? "open" : "collapsed"}
              open={tradeStepsOpen ? true : undefined}
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
                <span>Trade Records</span>
                <span style={{ color: "#64748B", fontSize: 11, fontWeight: 850 }}>
                  {matchedProtectedTrade ? "Continue record" : "Agree, pay, verify"}
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
                {(!matchedProtectedTrade?.id || matchedTradeStatus === "amendment_requested") && !isOwner ? (
                  <div style={{ display: "grid", gap: 7 }}>
                    <PrimaryButton
                      type="button"
                      onClick={() => void openProtectedTradeForm()}
                      debugId={`demand-box.response.${requestId}.protected-trade.issue`}
                      data-gsn-demand-protected-trade="seller-issue"
                      stableHeight={44}
                      style={{ borderRadius: 12, fontSize: 12 }}
                    >
                      {matchedTradeStatus === "amendment_requested" ? "Reissue Trade Record" : "Issue Trade Record"}
                    </PrimaryButton>
                    {protectedTradeFormOpen ? (
                      <div
                        data-gsn-demand-protected-trade-form="inline-conversation"
                        style={{ display: "grid", gap: 7, padding: 9, borderRadius: 13, border: "1px solid rgba(214,170,69,0.28)", background: "#FFFDF7" }}
                      >
                        <input
                          value={protectedTradeDraft.itemTitle}
                          onChange={(event) => setProtectedTradeDraft((current) => ({ ...current, itemTitle: event.target.value }))}
                          placeholder="Product or service"
                          aria-label="Trade Record product or service"
                          maxLength={160}
                          style={{ minHeight: 40, borderRadius: 11, border: "1px solid rgba(13,95,168,0.18)", padding: "8px 10px", font: "inherit" }}
                        />
                        <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1fr 0.65fr", gap: 6 }}>
                          <input
                            value={protectedTradeDraft.quantity}
                            onChange={(event) => setProtectedTradeDraft((current) => ({ ...current, quantity: event.target.value }))}
                            placeholder="Quantity"
                            aria-label="Agreed quantity"
                            style={{ minWidth: 0, minHeight: 40, borderRadius: 11, border: "1px solid rgba(13,95,168,0.18)", padding: "8px 9px", font: "inherit" }}
                          />
                          <input
                            value={protectedTradeDraft.amount}
                            onChange={(event) => setProtectedTradeDraft((current) => ({ ...current, amount: event.target.value }))}
                            placeholder="Amount"
                            aria-label="Agreed amount"
                            inputMode="decimal"
                            style={{ minWidth: 0, minHeight: 40, borderRadius: 11, border: "1px solid rgba(13,95,168,0.18)", padding: "8px 9px", font: "inherit" }}
                          />
                          <input
                            value={protectedTradeDraft.currency}
                            onChange={(event) => setProtectedTradeDraft((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                            placeholder="NGN"
                            aria-label="Currency"
                            maxLength={8}
                            style={{ minWidth: 0, minHeight: 40, borderRadius: 11, border: "1px solid rgba(13,95,168,0.18)", padding: "8px 9px", font: "inherit" }}
                          />
                        </div>
                        <select
                          value={protectedTradeDraft.paymentTiming}
                          onChange={(event) => setProtectedTradeDraft((current) => ({ ...current, paymentTiming: event.target.value === "deferred_credit" ? "deferred_credit" : "pay_now" }))}
                          aria-label="Payment timing"
                          style={{ minHeight: 40, borderRadius: 11, border: "1px solid rgba(13,95,168,0.18)", padding: "8px 10px", font: "inherit", background: "#FFFFFF" }}
                        >
                          <option value="pay_now">Payment due now</option>
                          <option value="deferred_credit">Deferred payment / credit</option>
                        </select>
                        <textarea
                          value={protectedTradeDraft.termsSummary}
                          onChange={(event) => setProtectedTradeDraft((current) => ({ ...current, termsSummary: event.target.value }))}
                          placeholder="Agreed condition, collection or delivery terms"
                          aria-label="Trade Record agreed terms"
                          rows={3}
                          maxLength={4000}
                          style={{ minHeight: 70, resize: "vertical", borderRadius: 11, border: "1px solid rgba(13,95,168,0.18)", padding: "9px 10px", font: "inherit" }}
                        />
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 7 }}>
                          <PrimaryButton
                            type="button"
                            onClick={() => void issueProtectedTrade()}
                            busy={creatingProtectedTrade}
                            busyLabel="Issuing"
                            debugId={`demand-box.response.${requestId}.protected-trade.submit`}
                            stableHeight={42}
                            style={{ borderRadius: 11, fontSize: 11.5 }}
                          >
                            Send agreement
                          </PrimaryButton>
                          <SecondaryButton
                            type="button"
                            onClick={() => setProtectedTradeFormOpen(false)}
                            disabled={creatingProtectedTrade}
                            debugId={`demand-box.response.${requestId}.protected-trade.cancel`}
                            stableHeight={42}
                            style={{ borderRadius: 11, fontSize: 11.5 }}
                          >
                            Cancel
                          </SecondaryButton>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : !matchedProtectedTrade?.id && isOwner ? (
                  <div data-gsn-demand-protected-trade="waiting-for-seller" style={{ color: "#587087", fontSize: 11.5, lineHeight: 1.4 }}>
                    Agree the item, quantity, price, and terms here. The seller then issues the Trade Record agreement in this conversation.
                  </div>
                ) : null}

                {matchedProtectedTrade?.id ? (
                  <div
                    data-gsn-demand-trade-sequence="agreement-payment-dispatch"
                    style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 5 }}
                  >
                    <span style={{ padding: "6px 5px", borderRadius: 9, background: "#E7F5EC", color: "#17663D", fontSize: 10, fontWeight: 950, textAlign: "center" }}>1 Agreement</span>
                    <span style={{ padding: "6px 5px", borderRadius: 9, background: matchedPaymentReference || deferredCreditAccepted ? "#EAF3FF" : "#F3F5F7", color: matchedPaymentReference || deferredCreditAccepted ? "#0B4FA8" : "#64748B", fontSize: 10, fontWeight: 950, textAlign: "center" }}>
                      2 {deferredCreditAccepted ? "Credit" : "Payment"}
                    </span>
                    <span style={{ padding: "6px 5px", borderRadius: 9, background: dispatchUnlocked ? "#FFF3D5" : "#F3F5F7", color: dispatchUnlocked ? "#805A0F" : "#64748B", fontSize: 10, fontWeight: 950, textAlign: "center" }}>3 Dispatch</span>
                  </div>
                ) : null}

                {matchedProtectedTrade?.id && !isOwner ? (
                  <div style={{ display: "grid", gap: 7 }}>
                    {matchedTradeStatus === "awaiting_buyer_acceptance" || matchedTradeStatus === "amendment_requested" ? (
                      <div style={{ color: "#587087", fontSize: 11.5, lineHeight: 1.4 }}>
                        {matchedTradeStatus === "amendment_requested"
                          ? "The buyer requested changes. Agree the amendment in chat, then reissue the agreement."
                          : "Waiting for the buyer to accept the agreement card."}
                      </div>
                    ) : tradeAgreementAccepted && matchedPaymentTiming === "pay_now" && !["claimed", "seller_confirmed_received"].includes(matchedPaymentStatus) ? (
                      <SecondaryButton
                        type="button"
                        onClick={() => void sendSellerPaymentDetails()}
                        busy={sendingPaymentDetails}
                        busyLabel="Sending"
                        debugId={`demand-box.response.${requestId}.account-details`}
                        data-gsn-demand-account-details="seller-direct-reference"
                        stableHeight={42}
                        style={{ borderRadius: 12, fontSize: 12 }}
                      >
                        {matchedPaymentReference ? "Resend bank details + payment code" : "Send bank details + payment code"}
                      </SecondaryButton>
                    ) : null}
                    {deferredCreditAccepted ? (
                      <div style={{ color: "#17663D", fontSize: 11.5, fontWeight: 900, lineHeight: 1.4 }}>
                        Deferred credit is agreed. You can continue to dispatch through Merchant Verification.
                      </div>
                    ) : null}
                    {matchedPaymentStatus === "claimed" ? (
                      <PrimaryButton
                        type="button"
                        onClick={() => void recordProtectedTradeStage(
                          "payment.received",
                          "Seller acknowledged receipt of the buyer's payment.",
                          `Payment received and acknowledged for ${matchedTradeCode}.`
                        )}
                        busy={recordingAgreementTradeId === Number(matchedProtectedTrade.id)}
                        busyLabel="Saving"
                        debugId={`demand-box.response.${requestId}.payment.received`}
                        stableHeight={42}
                        style={{ borderRadius: 12, fontSize: 12 }}
                      >
                        Confirm payment received
                      </PrimaryButton>
                    ) : null}
                    {paymentAccountSetupRequired ? (
                      <StableCtaLink
                        to={payoutDetailsPath}
                        debugId={`demand-box.response.${requestId}.fix-seller-account`}
                        data-gsn-demand-account-setup="missing-details-only"
                        stableHeight={42}
                        style={{ borderRadius: 12, padding: "8px 10px", fontSize: 11.5 }}
                      >
                        Add seller account details
                      </StableCtaLink>
                    ) : null}
                  </div>
                ) : matchedProtectedTrade?.id && isOwner ? (
                  <div style={{ display: "grid", gap: 7 }}>
                    {matchedPaymentTiming === "pay_now" && tradeAgreementAccepted && matchedPaymentStatus === "instruction_added" && matchedPaymentReference ? (
                      <PrimaryButton
                        type="button"
                        onClick={() => void recordProtectedTradeStage(
                          "payment.claimed",
                          "Buyer recorded that payment was sent or handed to the seller using the shared payment code.",
                          `Payment sent for ${matchedTradeCode} using code ${matchedPaymentReference}. Seller confirmation is still required.`
                        )}
                        busy={recordingAgreementTradeId === Number(matchedProtectedTrade.id)}
                        busyLabel="Saving"
                        debugId={`demand-box.response.${requestId}.payment.claimed`}
                        stableHeight={42}
                        style={{ borderRadius: 12, fontSize: 12 }}
                      >
                        I have paid
                      </PrimaryButton>
                    ) : matchedPaymentTiming === "pay_now" && tradeAgreementAccepted && !["claimed", "seller_confirmed_received"].includes(matchedPaymentStatus) ? (
                      <div style={{ color: "#587087", fontSize: 11.5, lineHeight: 1.4 }}>
                        Waiting for the seller to send bank details with the shared payment code.
                      </div>
                    ) : null}
                    {deferredCreditAccepted ? (
                      <div style={{ color: "#17663D", fontSize: 11.5, fontWeight: 900, lineHeight: 1.4 }}>
                        Deferred credit is agreed. Dispatch and tracking can now continue through Merchant Verification.
                      </div>
                    ) : matchedPaymentStatus === "claimed" ? (
                      <div style={{ color: "#587087", fontSize: 11.5, lineHeight: 1.4 }}>
                        Payment recorded as sent with the shared code. Waiting for seller acknowledgement.
                      </div>
                    ) : matchedPaymentStatus === "seller_confirmed_received" ? (
                      <div style={{ color: "#17663D", fontSize: 11.5, fontWeight: 900 }}>
                        Seller acknowledged payment. Dispatch and tracking can now continue.
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {matchedProtectedTrade?.id ? (
                  dispatchUnlocked ? (
                    !isOwner ? (
                      <StableCtaLink
                        to={merchantVerificationPath}
                        debugId={`demand-box.response.${requestId}.merchant-verification-tracking`}
                        data-gsn-demand-trade-stage="merchant-verification-tracking"
                        stableHeight={42}
                        style={{ borderRadius: 12, padding: "8px 10px", fontSize: 11.5 }}
                      >
                        Start dispatch & tracking
                      </StableCtaLink>
                    ) : (
                      <div style={{ color: "#587087", fontSize: 11, lineHeight: 1.35, padding: "7px 4px" }}>
                        The seller starts dispatch in Merchant Verification. Tracking updates stay linked to this Trade Record.
                      </div>
                    )
                  ) : (
                    <div style={{ color: "#64748B", fontSize: 11, lineHeight: 1.35 }}>
                      Dispatch unlocks after the seller acknowledges payment, or immediately when deferred credit is agreed.
                    </div>
                  )
                ) : null}

                <div style={{ color: "#64748B", fontSize: 10.5, lineHeight: 1.35 }}>
                  Only the compact bank-details card and shared payment code are sent in chat. The Finance page is never attached. Payment goes directly to the seller's saved account; GSN does not hold or automatically verify the money.
                </div>
              </div>
            </details>
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
