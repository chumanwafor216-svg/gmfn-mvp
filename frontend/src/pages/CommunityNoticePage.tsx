import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { GsnRealisticIcon } from "../components/GsnRealisticIcon";
import PageTopNav from "../components/PageTopNav";
import SocialTagShareButton from "../components/SocialTagShareButton";
import { StableButton, StableDisclosureSummary } from "../components/StableButton";
import {
  acknowledgeCommunityNotice,
  getPublicCommunityDomainNotice,
  getPublicCommunityNotice,
  recordCommunityNoticeAvailability,
  recordCommunityNoticePollResponse,
  recordPublicCommunityNoticePollResponse,
} from "../lib/api";
import { buildPhoneCallUrl, buildWhatsAppChatUrl } from "../lib/whatsappLinks";

function safeText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function errorMessage(error: any): string {
  const detail = error?.detail;
  return safeText(
    detail?.message || error?.message || error,
    "GSN could not load this community message QR link."
  );
}

function attachmentAssetOrigin(): string {
  if (typeof window === "undefined") return "";
  const configured =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env?.VITE_API_BASE_URL) ||
    "/api";
  const trimmed = String(configured || "").trim().replace(/\/+$/, "");

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).origin;
    } catch {
      return window.location.origin;
    }
  }

  return window.location.origin;
}

function safeAttachmentUrl(value: unknown): string {
  const raw = safeText(value);
  if (!raw) return "";
  if (/^\/uploads\/marketplace\/(?:images|videos)\/[^?#\s]+(?:[?#][^\s]*)?$/i.test(raw)) {
    return `${attachmentAssetOrigin()}${raw}`;
  }
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function formatDate(value: unknown): string {
  const raw = safeText(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "linear-gradient(180deg, #061827 0%, #0A2237 42%, #F5F0E6 42%, #F5F0E6 100%)",
    color: "#091B2E",
  };
}

function pageInner(): React.CSSProperties {
  return {
    maxWidth: 860,
    margin: "0 auto",
    padding: "20px 16px 44px",
    display: "grid",
    gap: 16,
  };
}

function card(): React.CSSProperties {
  return {
    borderRadius: 24,
    background: "#FFFFFF",
    border: "1px solid rgba(9,27,46,0.12)",
    boxShadow: "0 22px 60px rgba(2,14,24,0.18)",
    padding: 18,
    display: "grid",
    gap: 14,
  };
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background: "#F8FBFF",
    border: "1px solid rgba(9,27,46,0.1)",
    padding: 14,
    display: "grid",
    gap: 8,
  };
}

function helper(): React.CSSProperties {
  return {
    color: "rgba(9,27,46,0.68)",
    fontSize: 14,
    lineHeight: 1.45,
  };
}

function label(): React.CSSProperties {
  return {
    color: "#A67C00",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function badge(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 900,
    color: "#155A32",
    background: "#EAF8EF",
    border: "1px solid rgba(9,27,46,0.08)",
  };
}

function actionGrid(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(142px, 1fr))",
    gap: 10,
  };
}

type CompactDisclosureProps = {
  debugId: string;
  title: string;
  summary: string;
  preview?: React.ReactNode;
  children: React.ReactNode;
};

function CompactDisclosure({
  debugId,
  title,
  summary,
  preview,
  children,
}: CompactDisclosureProps) {
  const [open, setOpen] = useState(false);

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      data-debug-id={debugId}
      style={{
        borderRadius: 16,
        border: "1px solid rgba(9,27,46,0.10)",
        background: "#F8FBFF",
        overflow: "hidden",
      }}
    >
      {!open && preview ? (
        <div
          data-debug-id={`${debugId}.preview`}
          style={{
            padding: "11px 12px 6px",
            background: "#FFFFFF",
          }}
        >
          {preview}
        </div>
      ) : null}
      <StableDisclosureSummary
        debugId={`${debugId}.toggle`}
        stableHeight={52}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "8px 12px",
          color: "#091B2E",
          background: "#F8FBFF",
        }}
      >
        <span style={{ display: "grid", gap: 2, minWidth: 0, textAlign: "left" }}>
          <span style={{ fontSize: 14, fontWeight: 950 }}>{title}</span>
          <span style={{ color: "#617085", fontSize: 12, fontWeight: 750, lineHeight: 1.3 }}>
            {summary}
          </span>
        </span>
        <span
          aria-hidden="true"
          style={{
            width: 30,
            height: 30,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            flex: "0 0 auto",
            color: "#0B2D4A",
            background: "#FFFFFF",
            border: "1px solid rgba(9,27,46,0.12)",
            fontSize: 22,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          {open ? "−" : "+"}
        </span>
      </StableDisclosureSummary>
      <div
        data-debug-id={`${debugId}.content`}
        style={{
          borderTop: "1px solid rgba(9,27,46,0.08)",
          padding: 12,
          display: "grid",
          gap: 10,
          background: "#FFFFFF",
        }}
      >
        {children}
      </div>
    </details>
  );
}

function actionErrorMessage(error: any): string {
  const fallback = "GSN could not complete this announcement action.";
  return safeText(error?.detail?.message || error?.detail || error?.message || error, fallback);
}

function publicPollResponseToken(publicCode: string): string {
  const storageKey = `gsn.communityNotice.publicPoll.${publicCode}`;
  if (typeof window === "undefined") return "";
  try {
    const stored = window.localStorage.getItem(storageKey)?.trim();
    if (stored) return stored;
    const generated =
      typeof window.crypto?.randomUUID === "function"
        ? `${window.crypto.randomUUID()}.${window.crypto.randomUUID()}`
        : typeof window.crypto?.getRandomValues === "function"
          ? Array.from(window.crypto.getRandomValues(new Uint8Array(32)), (value) => value.toString(16).padStart(2, "0")).join("")
          : `session.${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}.${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    return `session.${Date.now().toString(36)}.${Math.random().toString(36).slice(2)}.${Math.random().toString(36).slice(2)}`;
  }
}

export default function CommunityNoticePage() {
  const { publicCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const code = safeText(publicCode);
  const [notice, setNotice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionTone, setActionTone] = useState<"success" | "error">("success");
  const [signInRequired, setSignInRequired] = useState(false);
  const [ownAcknowledged, setOwnAcknowledged] = useState(false);
  const [ownAvailability, setOwnAvailability] = useState<"yes" | "maybe" | "no" | "">("");
  const [pollSelections, setPollSelections] = useState<string[]>([]);
  const [pollResult, setPollResult] = useState<{
    counts?: Record<string, number | string | null>;
    total?: number | string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!code) {
        setLoading(false);
        setMessage("This message link is missing its QR code.");
        return;
      }
      setLoading(true);
      setMessage("");
      try {
        let payload: any | null = null;
        try {
          payload = await getPublicCommunityNotice(code);
        } catch {
          payload = await getPublicCommunityDomainNotice(code);
        }
        if (!cancelled) setNotice(payload?.notice || null);
      } catch (error: any) {
        if (!cancelled) setMessage(errorMessage(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [code]);

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return notice?.public_path || "";
    return window.location.href;
  }, [notice?.public_path]);

  const domainName = safeText(
    notice?.community?.name || notice?.community_domain?.display_name || notice?.source_community_name,
    safeText(notice?.community_domain_name, "This community")
  );
  const headline = safeText(notice?.body || notice?.title, "Community announcement");
  const fullBody = safeText(notice?.full_body);
  const attachmentUrl = safeAttachmentUrl(notice?.attachment_url);
  const attachmentKind = safeText(notice?.attachment_kind, "link").toLowerCase();
  const attachmentLabel = safeText(
    notice?.attachment_label,
    attachmentKind === "poster"
      ? "Open poster"
      : attachmentKind === "video"
        ? "Open video"
        : attachmentKind === "document"
          ? "Open document"
          : "Open link"
  );
  const attachmentActionLabel = /^(open|view|answer|choose|join|vote)\b/i.test(attachmentLabel)
    ? attachmentLabel
    : `Open ${attachmentLabel}`;
  const expiresAt = formatDate(notice?.expires_at);
  const createdAt = formatDate(notice?.created_at);
  const noticeEventId = Number(notice?.event_id || 0);
  const clanId = Number(notice?.clan_id || notice?.community?.id || 0);
  const acknowledgementEnabled = Boolean(notice?.acknowledgement_enabled && noticeEventId && clanId);
  const availabilityEnabled = Boolean(notice?.availability_enabled && noticeEventId && clanId);
  const pollQuestion = safeText(notice?.poll_question);
  const pollOptions = Array.isArray(notice?.poll_options)
    ? notice.poll_options.map((option: unknown) => safeText(option)).filter(Boolean).slice(0, 7)
    : [];
  const pollSelectionMode = notice?.poll_selection_mode === "multiple" ? "multiple" : "single";
  const pollAudience = notice?.poll_audience === "public_link" ? "public_link" : "members";
  const pollEnabled = Boolean(notice?.poll_enabled && pollQuestion && pollOptions.length >= 2 && noticeEventId && clanId);
  const visiblePollResult = pollResult || notice?.poll_summary || null;
  const senderWhatsAppNumber = safeText(notice?.sender_whatsapp_number);
  const senderWhatsAppLabel = safeText(notice?.sender_whatsapp_label, "the announcer");
  const contactReady = Boolean(notice?.sender_contact_ready && senderWhatsAppNumber);
  const fullBodyNeedsDisclosure =
    fullBody.length > 220 ||
    fullBody.split(/\r?\n/).filter((line) => line.trim()).length > 3;
  const shareMessage = [
    `${domainName} shared a GSN announcement.`,
    headline,
    fullBody && fullBody !== headline ? fullBody : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  function showAction(tone: "success" | "error", text: string, requiresSignIn = false) {
    setActionTone(tone);
    setActionMessage(text);
    setSignInRequired(requiresSignIn);
  }

  function handleActionError(error: any, fallback: string) {
    const needsSignIn = Number(error?.status || 0) === 401;
    showAction(
      "error",
      needsSignIn
        ? `Sign in as an active member of ${domainName} to record this response.`
        : safeText(actionErrorMessage(error), fallback),
      needsSignIn
    );
  }

  async function copyLink() {
    if (!pageUrl || typeof navigator === "undefined" || !navigator.clipboard) return;
    await navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function openAttachment() {
    if (!attachmentUrl || typeof window === "undefined") return;
    window.open(attachmentUrl, "_blank", "noopener,noreferrer");
  }

  function openAnnouncerWhatsApp() {
    if (typeof window === "undefined") return;
    const chatUrl = buildWhatsAppChatUrl(
      senderWhatsAppNumber,
      `Hello ${senderWhatsAppLabel}. I opened your GSN announcement from ${domainName}: ${headline}`
    );
    if (!chatUrl) {
      showAction("error", "The announcer has not published a WhatsApp contact.");
      return;
    }
    window.open(chatUrl, "_blank", "noopener,noreferrer");
    showAction("success", "WhatsApp opened for the announcer's published contact.");
  }

  function callAnnouncer() {
    if (typeof window === "undefined") return;
    const callUrl = buildPhoneCallUrl(senderWhatsAppNumber);
    if (!callUrl) {
      showAction("error", "The announcer has not published a phone contact.");
      return;
    }
    window.location.href = callUrl;
  }

  async function acknowledgeAnnouncement() {
    if (!acknowledgementEnabled || actionBusy) return;
    setActionBusy("acknowledge");
    setSignInRequired(false);
    try {
      const result = await acknowledgeCommunityNotice(noticeEventId, { clan_id: clanId });
      setOwnAcknowledged(true);
      showAction("success", safeText(result?.message, "Announcement acknowledged."));
    } catch (error: any) {
      handleActionError(error, "This announcement could not be acknowledged.");
    } finally {
      setActionBusy("");
    }
  }

  async function answerAvailability(response: "yes" | "maybe" | "no") {
    if (!availabilityEnabled || actionBusy) return;
    setActionBusy(`availability-${response}`);
    setSignInRequired(false);
    try {
      const result = await recordCommunityNoticeAvailability(noticeEventId, {
        clan_id: clanId,
        response,
      });
      setOwnAvailability(response);
      showAction("success", safeText(result?.message, "Your response was saved."));
    } catch (error: any) {
      handleActionError(error, "Your response could not be saved.");
    } finally {
      setActionBusy("");
    }
  }

  function togglePollOption(option: string) {
    if (!pollEnabled || actionBusy) return;
    setPollSelections((current) => {
      const selected = current.some((answer) => answer.toLowerCase() === option.toLowerCase());
      if (pollSelectionMode === "single") return [option];
      return selected
        ? current.filter((answer) => answer.toLowerCase() !== option.toLowerCase())
        : [...current, option];
    });
  }

  async function submitPollResponse() {
    if (!pollEnabled || actionBusy) return;
    if (pollSelections.length === 0) {
      showAction("error", "Choose an answer before you press OK.");
      return;
    }
    setActionBusy("poll-submit");
    setSignInRequired(false);
    try {
      let result: any;
      try {
        result = await recordCommunityNoticePollResponse(noticeEventId, {
          clan_id: clanId,
          options: pollSelections,
        });
      } catch (memberError: any) {
        const memberStatus = Number(memberError?.status || 0);
        if (pollAudience !== "public_link" || ![401, 403].includes(memberStatus)) {
          throw memberError;
        }
        const responseToken = publicPollResponseToken(code);
        if (!responseToken) throw memberError;
        result = await recordPublicCommunityNoticePollResponse(code, {
          response_token: responseToken,
          options: pollSelections,
        });
      }
      setPollResult(result?.poll_summary || null);
      showAction("success", safeText(result?.message, "Your poll response was saved."));
    } catch (error: any) {
      handleActionError(error, "Your poll response could not be saved.");
    } finally {
      setActionBusy("");
    }
  }

  function signInToRespond() {
    navigate("/login", {
      state: {
        from: {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
      },
    });
  }

  return (
    <main style={pageShell()} data-debug-id="community-notice.public-page">
      <PageTopNav
        sectionLabel="GSN transmission"
        title="Community announcement"
        subtitle="Public announcement"
      />
      <section style={pageInner()}>
        <div style={{ color: "#F8FBFF", display: "grid", gap: 8, padding: "8px 2px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <GsnRealisticIcon name="spotlight-megaphone" size={46} decorative />
            <div>
              <div style={{ ...label(), color: "#F3C85B" }}>GSN transmission</div>
              <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.08, letterSpacing: 0 }}>
                {loading ? "Loading message" : domainName}
              </h1>
            </div>
          </div>
          <p style={{ margin: 0, color: "rgba(248,251,255,0.78)", lineHeight: 1.4 }}>
            Read, respond, or share.
          </p>
        </div>

        <section style={card()}>
          {loading ? (
            <div style={softCard()}>Loading this community message.</div>
          ) : message ? (
            <div style={{ ...softCard(), background: "#FFF4D6", color: "#6B4A00" }}>{message}</div>
          ) : notice ? (
            <>
              <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
                  <div style={label()}>{domainName}</div>
                  <h2 style={{ margin: 0, fontSize: 25, lineHeight: 1.2, letterSpacing: 0, overflowWrap: "break-word" }}>
                    {headline}
                  </h2>
                  {fullBody && fullBody !== headline ? (
                    fullBodyNeedsDisclosure ? (
                      <CompactDisclosure
                        debugId="community-notice.full-message"
                        title="Read full message"
                        summary="Open the complete announcement"
                        preview={(
                          <p
                            style={{
                              ...helper(),
                              margin: 0,
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical",
                              WebkitLineClamp: 3,
                              overflow: "hidden",
                              whiteSpace: "pre-wrap",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {fullBody}
                          </p>
                        )}
                      >
                        <p style={{ ...helper(), margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                          {fullBody}
                        </p>
                      </CompactDisclosure>
                    ) : (
                      <p style={{ ...helper(), margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                        {fullBody}
                      </p>
                    )
                  ) : null}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge()}>GSN announcement</span>
                    {createdAt ? <span style={badge()}>Posted {createdAt}</span> : null}
                    {expiresAt ? <span style={badge()}>Until {expiresAt}</span> : null}
                  </div>
              </div>

              {acknowledgementEnabled || availabilityEnabled || pollEnabled ? (
                <div style={softCard()} data-debug-id="community-notice.response-actions">
                  <div style={label()}>Respond to this announcement</div>
                  {acknowledgementEnabled || availabilityEnabled ? (
                    <p style={{ ...helper(), margin: 0 }}>
                      Member acknowledgement and availability require sign-in.
                    </p>
                  ) : null}
                  {acknowledgementEnabled ? (
                    <StableButton
                      kind={ownAcknowledged ? "secondary" : "primary"}
                      debugId="community-notice.acknowledge"
                      onClick={() => void acknowledgeAnnouncement()}
                      disabled={ownAcknowledged || Boolean(actionBusy)}
                      busy={actionBusy === "acknowledge"}
                      busyLabel="Saving..."
                      fullWidth
                    >
                      {ownAcknowledged ? "Acknowledged" : "Acknowledge announcement"}
                    </StableButton>
                  ) : null}
                  {availabilityEnabled ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      <div style={{ color: "#091B2E", fontWeight: 900 }}>Are you available?</div>
                      <div style={actionGrid()}>
                        {(["yes", "maybe", "no"] as const).map((response) => (
                          <StableButton
                            key={response}
                            kind={ownAvailability === response ? "primary" : "secondary"}
                            debugId={`community-notice.availability.${response}`}
                            onClick={() => void answerAvailability(response)}
                            disabled={Boolean(actionBusy)}
                            busy={actionBusy === `availability-${response}`}
                            busyLabel="Saving..."
                          >
                            {response === "yes" ? "Yes" : response === "maybe" ? "Maybe" : "No"}
                          </StableButton>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {pollEnabled ? (
                    <div style={{ display: "grid", gap: 8 }} data-debug-id="community-notice.choice-poll">
                      <div style={{ color: "#091B2E", fontWeight: 900 }}>{pollQuestion}</div>
                      <p style={{ ...helper(), margin: 0 }}>
                        {pollAudience === "public_link"
                          ? "Anyone with this link can vote. No name is collected."
                          : "Community members must sign in to vote."}
                      </p>
                      <div style={actionGrid()}>
                        {pollOptions.map((option: string, index: number) => (
                          <StableButton
                            key={`${option}-${index}`}
                            kind={pollSelections.some((answer) => answer.toLowerCase() === option.toLowerCase()) ? "primary" : "secondary"}
                            debugId={`community-notice.poll-option.${index}`}
                            onClick={() => togglePollOption(option)}
                            aria-pressed={pollSelections.some((answer) => answer.toLowerCase() === option.toLowerCase())}
                            disabled={Boolean(actionBusy)}
                          >
                            {pollSelections.some((answer) => answer.toLowerCase() === option.toLowerCase()) ? "✓ " : ""}{option}
                          </StableButton>
                        ))}
                      </div>
                      <p style={{ ...helper(), margin: 0 }}>
                        {pollSelectionMode === "multiple"
                          ? "Choose one or more, then press OK."
                          : "Choose one, then press OK."}
                      </p>
                      <StableButton
                        kind="primary"
                        debugId="community-notice.poll-submit"
                        onClick={() => void submitPollResponse()}
                        disabled={Boolean(actionBusy) || pollSelections.length === 0}
                        busy={actionBusy === "poll-submit"}
                        busyLabel="Saving..."
                        fullWidth
                      >
                        OK — send response
                      </StableButton>
                      {visiblePollResult ? (
                        <div
                          data-debug-id="community-notice.poll-results"
                          style={{ ...softCard(), display: "grid", gap: 7, padding: 12 }}
                        >
                          <div style={{ color: "#091B2E", fontSize: 13, fontWeight: 900 }}>
                            Poll result · {Number(visiblePollResult.total || 0)} responses
                          </div>
                          {pollOptions.map((option: string) => (
                            <div
                              key={`result-${option}`}
                              style={{ display: "flex", justifyContent: "space-between", gap: 10, color: "#48657D", fontSize: 13, fontWeight: 800 }}
                            >
                              <span>{option}</span>
                              <span>{Number(visiblePollResult.counts?.[option] || 0)}</span>
                            </div>
                          ))}
                          <p style={{ ...helper(), margin: 0 }}>
                            {pollAudience === "public_link"
                              ? "Browser-response counts are not proof of unique people."
                              : "Member totals. Names stay private to authorised admins."}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <CompactDisclosure
                debugId="community-notice.announcer-contact"
                title="Contact announcer"
                summary={contactReady ? `${senderWhatsAppLabel} · message or call` : "No public contact was added"}
              >
                {contactReady ? (
                  <>
                    <div style={actionGrid()}>
                      <StableButton
                        kind="primary"
                        debugId="community-notice.contact-whatsapp"
                        onClick={openAnnouncerWhatsApp}
                      >
                        Message announcer
                      </StableButton>
                      <StableButton
                        kind="secondary"
                        debugId="community-notice.contact-call"
                        onClick={callAnnouncer}
                      >
                        Call announcer
                      </StableButton>
                    </div>
                  </>
                ) : (
                  <p style={{ ...helper(), margin: 0 }}>
                    No public contact was published with this announcement.
                  </p>
                )}
              </CompactDisclosure>

              {attachmentUrl ? (
                <CompactDisclosure
                  debugId="community-notice.attachment-package"
                  title={attachmentKind === "poster" ? "Poster" : "Attachment"}
                  summary={attachmentLabel}
                >
                  {attachmentKind === "poster" ? (
                    <img
                      src={attachmentUrl}
                      alt={attachmentLabel}
                      style={{
                        width: "100%",
                        maxHeight: 420,
                        objectFit: "contain",
                        borderRadius: 16,
                        border: "1px solid rgba(9,27,46,0.12)",
                        background: "#FFFFFF",
                      }}
                    />
                  ) : (
                    <p style={{ ...helper(), margin: 0 }}>{attachmentLabel}</p>
                  )}
                  <StableButton kind="primary" debugId="community-notice.open-attachment" onClick={openAttachment} fullWidth>
                    {attachmentActionLabel}
                  </StableButton>
                </CompactDisclosure>
              ) : null}

              <CompactDisclosure
                debugId="community-notice.share-package"
                title="Share announcement"
                summary="WhatsApp, social channels, link or QR"
              >
                <div style={actionGrid()}>
                  <StableButton kind="secondary" debugId="community-notice.copy-link" onClick={copyLink}>
                    {copied ? "Copied" : "Copy announcement link"}
                  </StableButton>
                  <SocialTagShareButton
                    target={{
                      title: `${domainName} announcement`,
                      message: shareMessage,
                      socialMessage: headline,
                      socialUrl: pageUrl,
                      url: pageUrl,
                    }}
                    disabled={!pageUrl}
                    buttonLabel="Share announcement"
                    buttonKind="primary"
                    debugId="community-notice.share"
                    fullWidth
                    onResult={(tone, text) => showAction(tone, text)}
                  />
                </div>
                <div
                  style={{
                    justifySelf: "center",
                    borderRadius: 16,
                    background: "#FFFFFF",
                    border: "1px solid rgba(9,27,46,0.12)",
                    padding: 8,
                  }}
                >
                  <QRCodeSVG value={pageUrl || code} size={112} bgColor="#FFFFFF" fgColor="#07172C" level="M" marginSize={1} />
                </div>
                <p style={{ ...helper(), margin: 0, textAlign: "center" }}>
                  You choose the channel and send it yourself.
                </p>
              </CompactDisclosure>

              {actionMessage ? (
                <div
                  role="status"
                  style={{
                    ...softCard(),
                    color: actionTone === "success" ? "#155A32" : "#7F1D1D",
                    background: actionTone === "success" ? "#EAF8EF" : "#FFFAFA",
                    border: `1px solid ${actionTone === "success" ? "#BBE5C8" : "#FECACA"}`,
                    fontSize: 13,
                    fontWeight: 800,
                    lineHeight: 1.45,
                  }}
                >
                  <span>{actionMessage}</span>
                  {signInRequired ? (
                    <StableButton
                      kind="secondary"
                      debugId="community-notice.sign-in-to-respond"
                      onClick={signInToRespond}
                      fullWidth
                    >
                      Sign in to respond
                    </StableButton>
                  ) : null}
                </div>
              ) : null}

              <CompactDisclosure
                debugId="community-notice.page-boundary"
                title="About this page"
                summary="Announcement only. Private community details stay hidden."
              >
                <p style={{ ...helper(), margin: 0 }}>
                  {safeText(notice.boundary, "GSN shows this announcement and its approved actions. It does not expose member lists, private contacts, admin tools or the wider community.")}
                </p>
              </CompactDisclosure>
            </>
          ) : (
            <div style={softCard()}>GSN could not find this community message.</div>
          )}
        </section>
      </section>
    </main>
  );
}
