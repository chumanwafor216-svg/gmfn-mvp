import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useParams } from "react-router-dom";
import { GsnRealisticIcon } from "../components/GsnRealisticIcon";
import PageTopNav from "../components/PageTopNav";
import { StableButton } from "../components/StableButton";
import { getPublicCommunityDomainNotice, getPublicCommunityNotice } from "../lib/api";

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

export default function CommunityNoticePage() {
  const { publicCode } = useParams();
  const code = safeText(publicCode);
  const [notice, setNotice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

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
  const body = safeText(notice?.full_body || notice?.body || notice?.title, "Community message");
  const attachmentUrl = safeAttachmentUrl(notice?.attachment_url);
  const attachmentLabel = safeText(notice?.attachment_label, "Open attachment");
  const expiresAt = formatDate(notice?.expires_at);
  const createdAt = formatDate(notice?.created_at);

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

  return (
    <main style={pageShell()} data-debug-id="community-notice.public-page">
      <PageTopNav
        sectionLabel="Public message"
        title="GSN message QR"
        subtitle="Public-safe community notice"
      />
      <section style={pageInner()}>
        <div style={{ color: "#F8FBFF", display: "grid", gap: 8, padding: "8px 2px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <GsnRealisticIcon name="spotlight-megaphone" size={46} decorative />
            <div>
              <div style={{ ...label(), color: "#F3C85B" }}>GSN Message QR</div>
              <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.08, letterSpacing: 0 }}>
                {loading ? "Loading message" : domainName}
              </h1>
            </div>
          </div>
          <p style={{ margin: 0, maxWidth: 680, color: "rgba(248,251,255,0.78)", lineHeight: 1.55 }}>
            A public-safe message shared from this community. GSN shows the message; the community officers keep authority over the content.
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
                    {body}
                  </h2>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge()}>Public QR</span>
                    <span style={badge()}>{safeText(notice.expiry_policy, "standard")}</span>
                    {createdAt ? <span style={badge()}>Posted {createdAt}</span> : null}
                    {expiresAt ? <span style={badge()}>Until {expiresAt}</span> : null}
                  </div>
                </div>
                <div style={{ borderRadius: 18, background: "#FFFFFF", border: "1px solid rgba(9,27,46,0.12)", padding: 10 }}>
                  <QRCodeSVG value={pageUrl || code} size={128} bgColor="#FFFFFF" fgColor="#07172C" level="M" marginSize={1} />
                </div>
              </div>

              <div style={softCard()}>
                <div style={label()}>Share</div>
                <p style={{ ...helper(), margin: 0 }}>
                  Print or display this QR when the message is meant for public access, such as a sermon topic, programme theme, reading note, or message of the day.
                </p>
                <StableButton kind="secondary" debugId="community-notice.copy-link" onClick={copyLink}>
                  {copied ? "Copied" : "Copy QR Link"}
                </StableButton>
              </div>

              {attachmentUrl ? (
                <div style={softCard()}>
                  <div style={label()}>Attachment</div>
                  <p style={{ ...helper(), margin: 0 }}>{attachmentLabel}</p>
                  <StableButton kind="primary" debugId="community-notice.open-attachment" onClick={openAttachment}>
                    Open attachment
                  </StableButton>
                </div>
              ) : null}

              <div style={{ ...softCard(), background: "#F5F0E6" }}>
                <div style={label()}>Boundary</div>
                <p style={{ ...helper(), margin: 0 }}>
                  {safeText(notice.boundary, "GSN shows a public-safe community message only. It does not expose member lists, open comments, prove attendance, collect money, or replace the community officer's authority.")}
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
