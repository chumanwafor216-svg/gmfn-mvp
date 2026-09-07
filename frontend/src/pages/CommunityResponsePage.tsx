import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate, useParams } from "react-router-dom";
import { GsnRealisticIcon } from "../components/GsnRealisticIcon";
import PageTopNav from "../components/PageTopNav";
import { StableButton } from "../components/StableButton";
import {
  getAccessToken,
  getPublicCommunityDomainResponseChannel,
  recordPublicCommunityDomainResponse,
  type CommunityDomainResponseType,
} from "../lib/api";

type ResponseDraft = {
  response_type: CommunityDomainResponseType;
  body: string;
  wants_private_follow_up: boolean;
  preferred_follow_up_channel: "gsn" | "whatsapp" | "phone" | "none";
};

const DEFAULT_RESPONSE_TYPES: Array<{ value: CommunityDomainResponseType; label: string }> = [
  { value: "question", label: "Question" },
  { value: "comment", label: "Comment" },
  { value: "need_request", label: "Need / request" },
  { value: "pastoral_follow_up", label: "Private follow-up" },
  { value: "suggestion", label: "Suggestion" },
  { value: "concern", label: "Concern" },
  { value: "testimony_benefit", label: "Testimony / benefit" },
  { value: "meeting_feedback", label: "Meeting feedback" },
];

function safeText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function errorMessage(error: any): string {
  const detail = error?.detail;
  return safeText(
    detail?.message || error?.message || error,
    "GSN could not load this response QR link."
  );
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

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    border: "1px solid rgba(9,27,46,0.16)",
    background: "#FFFFFF",
    color: "#091B2E",
    padding: "0 12px",
    fontSize: 16,
    fontWeight: 800,
    boxSizing: "border-box",
  };
}

function badge(tone: "good" | "warn" | "info" = "info"): React.CSSProperties {
  const palette =
    tone === "good"
      ? { color: "#155A32", background: "#EAF8EF" }
      : tone === "warn"
      ? { color: "#6B4A00", background: "#FFF4D6" }
      : { color: "#0B4D78", background: "#EAF5FF" };
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "5px 10px",
    fontSize: 12,
    fontWeight: 900,
    border: "1px solid rgba(9,27,46,0.08)",
    ...palette,
  };
}

export default function CommunityResponsePage() {
  const { publicCode } = useParams();
  const navigate = useNavigate();
  const code = safeText(publicCode);
  const signedIn = Boolean(getAccessToken());
  const [channel, setChannel] = useState<any | null>(null);
  const [responseTypes, setResponseTypes] = useState(DEFAULT_RESPONSE_TYPES);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<ResponseDraft>({
    response_type: "question",
    body: "",
    wants_private_follow_up: false,
    preferred_follow_up_channel: "gsn",
  });

  async function load() {
    if (!code) {
      setLoading(false);
      setMessage("This response link is missing its QR code.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const payload = await getPublicCommunityDomainResponseChannel(code);
      setChannel(payload?.response_channel || null);
      const types = Array.isArray(payload?.response_types)
        ? payload.response_types
            .map((item: any) => ({
              value: safeText(item?.value) as CommunityDomainResponseType,
              label: safeText(item?.label, safeText(item?.value)),
            }))
            .filter((item: { value: string; label: string }) => item.value && item.label)
        : [];
      if (types.length) setResponseTypes(types);
    } catch (error: any) {
      setMessage(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [code]);

  const pageUrl = useMemo(() => {
    if (typeof window === "undefined") return channel?.public_path || "";
    return window.location.href;
  }, [channel?.public_path]);

  const domainName = safeText(
    channel?.community_domain?.display_name,
    safeText(channel?.community_domain_name, "This community")
  );
  const title = safeText(channel?.title, "Meeting Response Box");
  const prompt = safeText(
    channel?.prompt,
    "Leave a question, comment, need, suggestion, or follow-up request for the organisers."
  );
  const openedAt = formatDate(channel?.response_opened_at || channel?.created_at);
  const expiresAt = formatDate(channel?.response_expires_at);
  const isActive = Boolean(channel?.active);
  const allowPrivateFollowUp = Boolean(channel?.allow_private_follow_up);

  function updateDraft<K extends keyof ResponseDraft>(field: K, value: ResponseDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submitResponse() {
    if (!signedIn) {
      const next = typeof window === "undefined" ? `/community-responses/${code}` : window.location.pathname;
      navigate(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    if (!safeText(draft.body)) {
      setMessage("Write the question, comment, need, or follow-up before sending.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await recordPublicCommunityDomainResponse(code, {
        response_type: draft.response_type,
        body: draft.body,
        wants_private_follow_up: draft.wants_private_follow_up,
        preferred_follow_up_channel: draft.preferred_follow_up_channel,
      });
      setSubmitted(true);
      setDraft((current) => ({ ...current, body: "", wants_private_follow_up: false }));
      setMessage(safeText(result?.message, "Response recorded for the organisers."));
      await load();
    } catch (error: any) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={pageShell()} data-debug-id="community-response.public-page">
      <PageTopNav
        sectionLabel="Response Box"
        title="GSN response QR"
        subtitle="Questions, feedback, needs, and follow-up"
      />
      <section style={pageInner()}>
        <div style={{ color: "#F8FBFF", display: "grid", gap: 8, padding: "8px 2px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <GsnRealisticIcon name="qr-record" size={46} decorative />
            <div>
              <div style={{ ...label(), color: "#F3C85B" }}>GSN Response QR</div>
              <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.08, letterSpacing: 0 }}>
                {loading ? "Loading response" : title}
              </h1>
            </div>
          </div>
          <p style={{ margin: 0, maxWidth: 680, color: "rgba(248,251,255,0.78)", lineHeight: 1.55 }}>
            Send a question, comment, need, or follow-up request after the meeting or service. GSN keeps the official response record inside the community.
          </p>
        </div>

        <section style={card()}>
          {loading ? (
            <div style={softCard()}>Loading this response QR.</div>
          ) : message && !channel ? (
            <div style={{ ...softCard(), background: "#FFF4D6", color: "#6B4A00" }}>{message}</div>
          ) : channel ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "grid", gap: 8, minWidth: 0, flex: "1 1 260px" }}>
                  <div style={label()}>{domainName}</div>
                  <h2 style={{ margin: 0, fontSize: 25, lineHeight: 1.2, letterSpacing: 0, overflowWrap: "break-word" }}>
                    {title}
                  </h2>
                  <p style={{ ...helper(), margin: 0 }}>{prompt}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(isActive ? "good" : "warn")}>{isActive ? "Open now" : "Closed"}</span>
                    <span style={badge("info")}>{safeText(channel.response_count, "0")} responses</span>
                    {openedAt ? <span style={badge("info")}>Opened {openedAt}</span> : null}
                    {expiresAt ? <span style={badge("warn")}>Closes {expiresAt}</span> : null}
                  </div>
                </div>
                <div style={{ borderRadius: 18, background: "#FFFFFF", border: "1px solid rgba(9,27,46,0.12)", padding: 10 }}>
                  <QRCodeSVG value={pageUrl || code} size={128} bgColor="#FFFFFF" fgColor="#07172C" level="M" marginSize={1} />
                </div>
              </div>

              <div style={softCard()}>
                <div style={label()}>Send response</div>
                <select
                  value={draft.response_type}
                  disabled={busy || !isActive || submitted}
                  onChange={(event) => updateDraft("response_type", event.target.value as CommunityDomainResponseType)}
                  style={inputStyle()}
                >
                  {responseTypes.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={draft.body}
                  disabled={busy || !isActive || submitted}
                  maxLength={1000}
                  rows={5}
                  onChange={(event) => updateDraft("body", event.target.value)}
                  placeholder="Write your question, feedback, need, suggestion, or follow-up request."
                  style={{ ...inputStyle(), minHeight: 132, resize: "vertical", paddingTop: 12, lineHeight: 1.35 }}
                />
                {allowPrivateFollowUp ? (
                  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "#24364A", lineHeight: 1.35 }}>
                    <input
                      type="checkbox"
                      checked={draft.wants_private_follow_up}
                      disabled={busy || !isActive || submitted}
                      onChange={(event) => updateDraft("wants_private_follow_up", event.target.checked)}
                    />
                    I want a private follow-up from the organisers.
                  </label>
                ) : null}
                <select
                  value={draft.preferred_follow_up_channel}
                  disabled={busy || !isActive || submitted || !draft.wants_private_follow_up}
                  onChange={(event) => updateDraft("preferred_follow_up_channel", event.target.value as ResponseDraft["preferred_follow_up_channel"])}
                  style={inputStyle()}
                >
                  <option value="gsn">GSN follow-up</option>
                  <option value="whatsapp">WhatsApp preference</option>
                  <option value="phone">Phone preference</option>
                  <option value="none">No private follow-up</option>
                </select>
                <StableButton
                  kind="primary"
                  debugId="community-response.submit"
                  disabled={busy || !isActive || submitted}
                  busy={busy}
                  busyLabel="Sending..."
                  onClick={submitResponse}
                >
                  {submitted ? "Response Sent" : signedIn ? "Send Response" : "Sign In To Respond"}
                </StableButton>
                {message ? (
                  <div style={{ ...helper(), color: submitted ? "#155A32" : "#6B4A00" }}>{message}</div>
                ) : null}
              </div>

              <div style={{ ...softCard(), background: "#F5F0E6" }}>
                <div style={label()}>Boundary</div>
                <p style={{ ...helper(), margin: 0 }}>
                  {safeText(channel.boundary, "GSN records governed response evidence only. It is not an anonymous public comment wall, emergency support, or proof that every issue was resolved.")}
                </p>
              </div>
            </>
          ) : (
            <div style={softCard()}>GSN could not find this response QR.</div>
          )}
        </section>
      </section>
    </main>
  );
}