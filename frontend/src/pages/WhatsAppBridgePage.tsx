import React, { useEffect, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { StableButton, StableDisclosureSummary } from "../components/StableButton";
import { getCurrentClan, listCommunityNotices, safeCopy } from "../lib/api";
import { buildPublicWhatsAppUrl, shareablePublicFrontendUrl } from "../lib/publicLinks";
import {
  brandBadge,
  brandHelperText,
  brandInnerCard,
  brandPageCard,
  brandSectionLabel,
  brandSoftCard,
  gmfnBrand,
} from "../styles/gmfnBrand";

type CommunityNoticeItem = {
  title?: string | null;
  body?: string | null;
  full_body?: string | null;
  public_code?: string | null;
  public_path?: string | null;
  notice_kind?: string | null;
  market_need_pulse?: boolean | null;
  created_at?: string | null;
  source_community_name?: string | null;
};

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function positiveNumber(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function truncateWords(text: string, maxWords: number): string {
  const words = safeStr(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function noticePublicPath(item: CommunityNoticeItem | null | undefined): string {
  const storedPath = firstTruthy(item?.public_path);
  if (storedPath) return storedPath;

  const publicCode = firstTruthy(item?.public_code);
  return publicCode ? `/community-notices/${encodeURIComponent(publicCode)}` : "";
}

function isMarketNeedPulseNotice(item: CommunityNoticeItem | null | undefined): boolean {
  return Boolean(
    item?.market_need_pulse || safeStr(item?.notice_kind).toLowerCase() === "market_need_pulse"
  );
}

function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= 640 : false
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    function onResize() {
      setIsPhone(window.innerWidth <= 640);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isPhone;
}

function iconTile(name: GsnIconName, tone: "navy" | "gold" | "blue" = "blue"): React.ReactNode {
  const bg =
    tone === "navy"
      ? "linear-gradient(180deg, #071827 0%, #103456 100%)"
      : tone === "gold"
        ? "linear-gradient(180deg, rgba(242,199,102,0.28) 0%, rgba(255,255,255,0.92) 100%)"
        : "linear-gradient(180deg, rgba(220,237,255,0.96) 0%, rgba(255,255,255,0.96) 100%)";

  return (
    <span
      aria-hidden="true"
      style={{
        width: 46,
        height: 46,
        borderRadius: 16,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "0 0 auto",
        background: bg,
        border:
          tone === "navy"
            ? "1px solid rgba(242,199,102,0.34)"
            : "1px solid rgba(11,31,51,0.09)",
        boxShadow:
          "0 12px 24px rgba(7,20,36,0.10), inset 0 1px 0 rgba(255,255,255,0.72)",
      }}
    >
      <GsnLegacyIcon name={name} size={32} />
    </span>
  );
}

export default function WhatsAppBridgePage() {
  const isPhone = useIsPhone();
  const [community, setCommunity] = useState<any>(null);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
  const [latestPublicNotice, setLatestPublicNotice] = useState<CommunityNoticeItem | null>(null);
  const [loadingNotice, setLoadingNotice] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");

  useEffect(() => {
    let active = true;
    setLoadingCommunity(true);
    getCurrentClan({ timeoutMs: 6000 })
      .then((row) => {
        if (active) setCommunity(row || null);
      })
      .catch(() => {
        if (active) setCommunity(null);
      })
      .finally(() => {
        if (active) setLoadingCommunity(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const communityId = positiveNumber(community?.id || community?.clan_id);
  const communityName = firstTruthy(
    community?.name,
    community?.clan_name,
    community?.marketplace_name,
    "this community"
  );

  useEffect(() => {
    let active = true;
    setLatestPublicNotice(null);

    if (!communityId) {
      setLoadingNotice(false);
      return () => {
        active = false;
      };
    }

    setLoadingNotice(true);
    listCommunityNotices({ clan_id: communityId, limit: 10, scope: "selected" })
      .then((res) => {
        if (!active) return;
        const rows = Array.isArray(res?.notices) ? res.notices : [];
        const publicNotice = rows.find(
          (item: CommunityNoticeItem) =>
            Boolean(noticePublicPath(item)) && !isMarketNeedPulseNotice(item)
        );
        setLatestPublicNotice(publicNotice || null);
      })
      .catch(() => {
        if (active) setLatestPublicNotice(null);
      })
      .finally(() => {
        if (active) setLoadingNotice(false);
      });

    return () => {
      active = false;
    };
  }, [communityId]);

  const publicNoticePath = noticePublicPath(latestPublicNotice);
  const publicNoticeUrl = publicNoticePath ? shareablePublicFrontendUrl(publicNoticePath) : "";
  const noticeHeadline = truncateWords(
    firstTruthy(latestPublicNotice?.title, latestPublicNotice?.body, latestPublicNotice?.full_body, "Official community bulletin"),
    18
  );
  const noticeSummary = truncateWords(
    firstTruthy(latestPublicNotice?.full_body, latestPublicNotice?.body, latestPublicNotice?.title, ""),
    32
  );
  const canBroadcast = Boolean(publicNoticeUrl);
  const broadcastMessage = canBroadcast
    ? [
        `${communityName} has posted an official GSN bulletin.`,
        "",
        noticeHeadline,
        noticeSummary && noticeSummary !== noticeHeadline ? noticeSummary : "",
        "",
        "View the public bulletin:",
        publicNoticeUrl,
        "",
        "For replies or actions, open GSN so the community record stays complete.",
      ]
        .filter((line) => line !== "")
        .join("\n")
    : "";
  const whatsappShareUrl = canBroadcast ? buildPublicWhatsAppUrl(broadcastMessage) : "";

  async function copyText(text: string, success: string) {
    if (!text) {
      setCopyNotice("No public bulletin link is ready yet.");
      return;
    }
    const ok = await safeCopy(text);
    setCopyNotice(ok ? success : "Copy was blocked. Select the message and copy it manually.");
    if (typeof window !== "undefined") {
      window.setTimeout(() => setCopyNotice(""), 2400);
    }
  }

  function openWhatsAppShare() {
    if (!whatsappShareUrl) {
      setCopyNotice("No public bulletin link is ready yet.");
      return;
    }
    if (typeof window === "undefined") return;
    window.open(whatsappShareUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      data-gsn-whatsapp-bridge="root"
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: isPhone ? "14px 12px 104px" : "20px 24px 64px",
        display: "grid",
        gap: 16,
      }}
    >
      <PageTopNav
        sectionLabel="Community Domain"
        title="Community Domain Bulletin Bridge"
        subtitle="Broadcast approved public bulletins."
        homeTo="/app/community"
        homeLabel="Community Home"
        backTo="/app/marketplace"
        backLabel="Marketplace"
      />

      <section style={{ ...brandPageCard(), display: "grid", gap: 14 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isPhone ? "1fr" : "auto minmax(0, 1fr)",
            gap: 14,
            alignItems: "center",
          }}
        >
          {iconTile("document", "navy")}
          <div style={{ minWidth: 0 }}>
            <div style={brandSectionLabel()}>Community Domain bulletin</div>
            <h1
              style={{
                margin: "6px 0 0",
                color: gmfnBrand.colors.ink,
                fontSize: isPhone ? 28 : 38,
                lineHeight: 1.04,
                fontWeight: 1000,
              }}
            >
              Broadcast the community bulletin.
            </h1>
            <p style={{ ...brandHelperText(), margin: "8px 0 0", maxWidth: 680 }}>
              This page only shares an already-published Community Domain bulletin output.
              It does not expose platform tools or create community actions.
            </p>
          </div>
        </div>

        <div style={{ ...brandSoftCard(canBroadcast ? "#F0FDF4" : "#FFF7ED"), display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={brandBadge(true)}>
              {loadingCommunity ? "Checking community" : communityName}
            </span>
            <span style={brandBadge(false)}>Output only</span>
            <span style={brandBadge(false)}>No internal tools</span>
            <span style={brandBadge(false)}>No WhatsApp scraping</span>
          </div>
          <div style={{ color: gmfnBrand.colors.ink, fontSize: 20, fontWeight: 1000 }}>
            {loadingNotice
              ? "Checking for a public bulletin"
              : canBroadcast
                ? noticeHeadline
                : "No public bulletin ready"}
          </div>
          <p style={{ ...brandHelperText(), margin: 0 }}>
            {canBroadcast
              ? "Copy this message to WhatsApp, Facebook, Instagram, TikTok, or email. The public link opens only the bulletin output."
              : "Turn on public bulletin sharing and publish an announcement first. Nothing should be broadcast from this page until a GSN action exists."}
          </p>
          {canBroadcast ? (
            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(13,95,168,0.12)",
                background: "#FFFFFF",
                padding: "13px 14px",
                color: gmfnBrand.colors.ink,
                fontWeight: 850,
                lineHeight: 1.45,
                overflowWrap: "anywhere",
              }}
            >
              {publicNoticeUrl}
            </div>
          ) : null}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr",
              gap: 10,
            }}
          >
            <StableButton
              kind="primary"
              debugId="whatsapp-bridge.copy-bulletin-message"
              onClick={() => void copyText(broadcastMessage, "Bulletin message copied.")}
              fullWidth
              stableHeight={54}
              disabled={!canBroadcast}
            >
              Copy Bulletin Message
            </StableButton>
            <StableButton
              kind="primary"
              debugId="whatsapp-bridge.open-whatsapp-share"
              onClick={openWhatsAppShare}
              fullWidth
              stableHeight={54}
              disabled={!canBroadcast}
              style={{
                background: canBroadcast
                  ? "linear-gradient(180deg, #20C767 0%, #118C43 100%)"
                  : undefined,
                border: canBroadcast ? "1px solid rgba(17,140,67,0.22)" : undefined,
                boxShadow: canBroadcast ? "0 14px 28px rgba(17,140,67,0.18)" : undefined,
              }}
            >
              Share to WhatsApp
            </StableButton>
          </div>
          {copyNotice ? (
            <div
              role="status"
              style={{
                ...brandInnerCard(copyNotice.includes("copied") ? "#F0FDF4" : "#FFF7ED"),
                color: copyNotice.includes("copied") ? "#166534" : "#8A5A08",
                fontWeight: 850,
              }}
            >
              {copyNotice}
            </div>
          ) : null}
        </div>
      </section>

      <details style={brandPageCard()}>
        <StableDisclosureSummary debugId="whatsapp-bridge.anchors.open" stableHeight={48}>
          Channel governance
        </StableDisclosureSummary>
        <div style={{ display: "grid", gap: 12, paddingTop: 12 }}>
          <div style={brandInnerCard("#F9FBFF")}>
            <div style={{ color: gmfnBrand.colors.ink, fontWeight: 1000 }}>
              Where to post it
            </div>
            <p style={{ ...brandHelperText(), margin: "6px 0 0" }}>
              Post the bulletin message to the community WhatsApp group, Facebook, Instagram, TikTok, or email group
              only after the public GSN bulletin exists.
            </p>
          </div>
          <div style={brandInnerCard("#FFFDF5")}>
            <div style={{ color: gmfnBrand.colors.ink, fontWeight: 1000 }}>
              What it must not do
            </div>
            <p style={{ ...brandHelperText(), margin: "6px 0 0" }}>
              It must not expose private tools, member records, admin controls,
              creation screens, approval paths, or internal GSN structure.
            </p>
          </div>
        </div>
      </details>

      <section style={{ ...brandSoftCard("#EEF6FF"), display: "grid", gap: 8, color: gmfnBrand.colors.ink }}>
        <div style={{ fontWeight: 1000 }}>Decision boundary</div>
        <div style={{ ...brandHelperText(), fontWeight: 760 }}>
          GSN records GSN actions only. The Community Domain Bulletin Bridge broadcasts public bulletin
          outputs only. Replies, acknowledgements, interest, approval, and
          verification must happen inside the owning GSN screen.
        </div>
      </section>
    </div>
  );
}