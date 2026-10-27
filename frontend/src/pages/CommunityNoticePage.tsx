import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { GsnRealisticIcon } from "../components/GsnRealisticIcon";
import PageTopNav from "../components/PageTopNav";
import SocialTagShareButton from "../components/SocialTagShareButton";
import { StableButton } from "../components/StableButton";
import {
  acknowledgeCommunityNotice,
  getPublicCommunityDomainNotice,
  getPublicCommunityNotice,
  recordCommunityNoticeAvailability,
  recordCommunityNoticePollResponse,
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

function actionErrorMessage(error: any): string {
  const fallback = "GSN could not complete this announcement action.";
  return safeText(error?.detail?.message || error?.detail || error?.message || error, fallback);
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
  const [ownPollOption, setOwnPollOption] = useState("");

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
  const pollEnabled = Boolean(notice?.poll_enabled && pollQuestion && pollOptions.length >= 2 && noticeEventId && clanId);
  const senderWhatsAppNumber = safeText(notice?.sender_whatsapp_number);
  const senderWhatsAppLabel = safeText(notice?.sender_whatsapp_label, "the announcer");
  const contactReady = Boolean(notice?.sender_contact_ready && senderWhatsAppNumber);
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

  async function answerPoll(option: string) {
    if (!pollEnabled || actionBusy) return;
    setActionBusy(`poll-${option}`);
    setSignInRequired(false);
    try {
      const result = await recordCommunityNoticePollResponse(noticeEventId, {
        clan_id: clanId,
        option,
      });
      setOwnPollOption(option);
      showAction("success", safeText(result?.message, `Poll response saved: ${option}.`));
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
        subtitle="Announcement-only public package"
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
          <p style={{ margin: 0, maxWidth: 680, color: "rgba(248,251,255,0.78)", lineHeight: 1.55 }}>
            One announcement package from {domainName}. Read it, use its approved actions, or share it onward without opening the announcement creator or the wider community.
          </p>
        </div>

        <section style={card()}>
          {loading ? (
            <div style={softCard()}>Loading this community message.</div>
          ) : message ? (
            <div style={{ ...softCard(), background: "#FFF4D6", color: "#6B4A00" }}>{message}</div>
          ) : notice ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 8, minWidth: 0, flex: "1 1 260px" }}>
                  <div style={label()}>{domainName}</div>
                  <h2 style={{ margin: 0, fontSize: 25, lineHeight: 1.2, letterSpacing: 0, overflowWrap: "break-word" }}>
                    {headline}
                  </h2>
                  {fullBody && fullBody !== headline ? (
                    <p style={{ ...helper(), margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                      {fullBody}
                    </p>
                  ) : null}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge()}>GSN announcement</span>
                    {createdAt ? <span style={badge()}>Posted {createdAt}</span> : null}
                    {expiresAt ? <span style={badge()}>Until {expiresAt}</span> : null}
                  </div>
                </div>
                <div style={{ borderRadius: 18, background: "#FFFFFF", border: "1px solid rgba(9,27,46,0.12)", padding: 10 }}>
                  <QRCodeSVG value={pageUrl || code} size={128} bgColor="#FFFFFF" fgColor="#07172C" level="M" marginSize={1} />
                </div>
              </div>

              {acknowledgementEnabled || availabilityEnabled || pollEnabled ? (
                <div style={softCard()} data-debug-id="community-notice.response-actions">
                  <div style={label()}>Respond to this announcement</div>
                  <p style={{ ...helper(), margin: 0 }}>
                    These actions use the existing GSN community record. You must be signed in as an active member of {domainName} to save a response.
                  </p>
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
                      <div style={actionGrid()}>
                        {pollOptions.map((option: string, index: number) => (
                          <StableButton
                            key={`${option}-${index}`}
                            kind={ownPollOption === option ? "primary" : "secondary"}
                            debugId={`community-notice.poll-option.${index}`}
                            onClick={() => void answerPoll(option)}
                            disabled={Boolean(actionBusy)}
                            busy={actionBusy === `poll-${option}`}
                            busyLabel="Saving..."
                          >
                            {option}
                          </StableButton>
                        ))}
                      </div>
                      <p style={{ ...helper(), margin: 0 }}>
                        Choose one option. You may change your answer while this announcement remains active.
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={softCard()} data-debug-id="community-notice.announcer-contact">
                <div style={label()}>Contact the announcer</div>
                {contactReady ? (
                  <>
                    <p style={{ ...helper(), margin: 0 }}>
                      {senderWhatsAppLabel} has chosen to publish this verified contact with the announcement.
                    </p>
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
                    The announcer has not published a contact with this announcement.
                  </p>
                )}
              </div>

              {attachmentUrl ? (
                <div style={softCard()} data-debug-id="community-notice.attachment-package">
                  <div style={label()}>{attachmentKind === "poster" ? "Poster" : "Announcement action"}</div>
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
                </div>
              ) : null}

              <div style={softCard()} data-debug-id="community-notice.share-package">
                <div style={label()}>Share this announcement</div>
                <p style={{ ...helper(), margin: 0 }}>
                  Share this exact announcement package. GSN prepares it; you choose the channel and send it yourself.
                </p>
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
              </div>

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

              <div style={{ ...softCard(), background: "#F5F0E6" }}>
                <div style={label()}>Boundary</div>
                <p style={{ ...helper(), margin: 0 }}>
                  {safeText(notice.boundary, "GSN shows this announcement package and its approved actions only. It does not expose the creator, member lists, private contacts, admin tools, open comments, or the wider community.")}
                </p>
              </div>
            </>
          ) : (
            <div style={softCard()}>GSN could not find this community message.</div>
          )}
        </section>
      </section>
    </main>
  );
}
