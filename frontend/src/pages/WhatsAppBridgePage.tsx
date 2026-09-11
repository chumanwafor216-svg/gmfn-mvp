import React, { useEffect, useMemo, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { StableButton, StableCtaLink, StableDisclosureSummary } from "../components/StableButton";
import { getCurrentClan, safeCopy } from "../lib/api";
import { routeWithCommunity } from "../lib/appRoutes";
import { buildPublicWhatsAppUrl, shareablePublicFrontendUrl } from "../lib/publicLinks";
import {
  brandBadge,
  brandClampLines,
  brandHelperText,
  brandInnerCard,
  brandPageCard,
  brandSectionLabel,
  brandSoftCard,
  gmfnBrand,
} from "../styles/gmfnBrand";

type BridgeDestination = {
  key: string;
  label: string;
  detail: string;
  icon: GsnIconName;
  to: string;
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

function destinationRows(communityId: number): BridgeDestination[] {
  const withCommunity = (path: string) => routeWithCommunity(path, communityId);

  return [
    {
      key: "community-domain",
      label: "Community Domain",
      detail: "Open governed community setup and owner controls.",
      icon: "community",
      to: withCommunity("/app/community-domain"),
    },
    {
      key: "notice-board",
      label: "Notice Board",
      detail: "Post or read the official community bulletin.",
      icon: "document",
      to: withCommunity("/app/community"),
    },
    {
      key: "demand-box",
      label: "Demand Box",
      detail: "Post a need or check open community requests.",
      icon: "marketplace",
      to: withCommunity("/app/demand-box?mode=create"),
    },
    {
      key: "ask-community",
      label: "Ask Community",
      detail: "Ask one yes, maybe, or no market-need question.",
      icon: "speaker",
      to: withCommunity("/app/demand-box?mode=ask_community"),
    },
    {
      key: "meeting-response",
      label: "Meeting Response",
      detail: "Prepare meeting interest and response links.",
      icon: "calendar",
      to: withCommunity("/app/shop-control#shop-control-community-packages"),
    },
    {
      key: "attendance",
      label: "Attendance",
      detail: "Open meeting and attendance record tools.",
      icon: "qr",
      to: withCommunity("/app/shop-control#shop-control-community-packages"),
    },
    {
      key: "shop-gallery",
      label: "Shop Gallery",
      detail: "Manage shop diaries, public blocks, and products.",
      icon: "shop",
      to: withCommunity("/app/shop-control#shop-control-gallery-tools"),
    },
    {
      key: "spotlight",
      label: "Spotlight",
      detail: "Create or refresh the current shop spotlight.",
      icon: "megaphone",
      to: withCommunity("/app/shop-control#shop-control-spotlight"),
    },
    {
      key: "reports",
      label: "Reports",
      detail: "Open community reports and value summaries.",
      icon: "chart",
      to: withCommunity("/app/community-domain"),
    },
  ];
}

function destinationCard(item: BridgeDestination): React.ReactNode {
  return (
    <StableCtaLink
      key={item.key}
      to={item.to}
      kind="secondary"
      debugId={`whatsapp-bridge.destination.${item.key}`}
      style={{
        minHeight: 92,
        borderRadius: 18,
        justifyContent: "flex-start",
        padding: "14px",
        textAlign: "left",
        background: "linear-gradient(180deg, #FFFFFF 0%, #F5FAFF 100%)",
        border: "1px solid rgba(13,95,168,0.14)",
        color: gmfnBrand.colors.ink,
      }}
    >
      {iconTile(item.icon)}
      <span style={{ display: "grid", gap: 5, minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 1000, ...brandClampLines(1) }}>
          {item.label}
        </span>
        <span style={{ color: gmfnBrand.colors.muted, fontSize: 12.5, lineHeight: 1.35 }}>
          {item.detail}
        </span>
      </span>
    </StableCtaLink>
  );
}

export default function WhatsAppBridgePage() {
  const isPhone = useIsPhone();
  const [community, setCommunity] = useState<any>(null);
  const [loadingCommunity, setLoadingCommunity] = useState(true);
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
  const bridgePath = routeWithCommunity("/app/whatsapp-bridge", communityId);
  const bridgeUrl = shareablePublicFrontendUrl(bridgePath);
  const destinations = useMemo(() => destinationRows(communityId), [communityId]);
  const groupDescriptionLine = `Official GSN Bridge for ${communityName}: ${bridgeUrl}`;
  const pinnedMessage = [
    `Official GSN Bridge for ${communityName}`,
    "",
    "Use this link for notices, Demand Box, Ask Community, meeting response, attendance, shop updates, Spotlight, and reports.",
    bridgeUrl,
    "",
    "Please keep discussion in WhatsApp, but complete official actions inside GSN.",
  ].join("\n");
  const whatsappShareUrl = buildPublicWhatsAppUrl(pinnedMessage);

  async function copyText(text: string, success: string) {
    const ok = await safeCopy(text);
    setCopyNotice(
      ok ? success : "Copy was blocked. Select the message and copy it manually."
    );
    if (typeof window !== "undefined") {
      window.setTimeout(() => setCopyNotice(""), 2400);
    }
  }

  function openWhatsAppShare() {
    if (typeof window === "undefined") return;
    window.open(whatsappShareUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      data-gsn-whatsapp-bridge="root"
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: isPhone ? "14px 12px 104px" : "20px 24px 64px",
        display: "grid",
        gap: 16,
      }}
    >
      <PageTopNav
        sectionLabel="Community"
        title="WhatsApp Bridge"
        subtitle="Keep chat in WhatsApp. Keep official actions inside GSN."
        homeTo="/app/community"
        homeLabel="Community Home"
        backTo="/app/marketplace"
        backLabel="Marketplace"
        nextLinks={[{ label: "Open Demand Box", to: routeWithCommunity("/app/demand-box", communityId) }]}
      />

      <section
        style={{
          ...brandPageCard(),
          display: "grid",
          gap: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isPhone ? "1fr" : "auto minmax(0, 1fr)",
            gap: 14,
            alignItems: "center",
          }}
        >
          {iconTile("phone", "navy")}
          <div style={{ minWidth: 0 }}>
            <div style={brandSectionLabel()}>Real home of the bridge</div>
            <h1
              style={{
                margin: "6px 0 0",
                color: gmfnBrand.colors.ink,
                fontSize: isPhone ? 28 : 38,
                lineHeight: 1.04,
                fontWeight: 1000,
              }}
            >
              GSN holds the action.
            </h1>
            <p style={{ ...brandHelperText(), margin: "8px 0 0", maxWidth: 720 }}>
              WhatsApp points members here. GSN keeps the notice, request,
              response, attendance, shop, Spotlight, and report record.
            </p>
          </div>
        </div>

        <div
          style={{
            ...brandSoftCard("#F6FAFF"),
            display: "grid",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={brandBadge(true)}>
              {loadingCommunity ? "Checking community" : communityName}
            </span>
            <span style={brandBadge(false)}>No WhatsApp scraping</span>
            <span style={brandBadge(false)}>Link-based pilot</span>
          </div>
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
            {bridgeUrl}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isPhone ? "1fr" : "1fr 1fr",
              gap: 10,
            }}
          >
            <StableButton
              kind="primary"
              debugId="whatsapp-bridge.copy-pinned-message"
              onClick={() => void copyText(pinnedMessage, "Bridge message copied. Pin it in WhatsApp.")}
              fullWidth
              stableHeight={54}
            >
              Copy Bridge Message
            </StableButton>
            <StableButton
              kind="primary"
              debugId="whatsapp-bridge.open-whatsapp-share"
              onClick={openWhatsAppShare}
              fullWidth
              stableHeight={54}
              style={{
                background: "linear-gradient(180deg, #20C767 0%, #118C43 100%)",
                border: "1px solid rgba(17,140,67,0.22)",
                boxShadow: "0 14px 28px rgba(17,140,67,0.18)",
              }}
            >
              Share to WhatsApp
            </StableButton>
          </div>
          {copyNotice ? (
            <div
              role="status"
              style={{
                ...brandInnerCard(copyNotice.startsWith("Bridge") ? "#F0FDF4" : "#FFF7ED"),
                color: copyNotice.startsWith("Bridge") ? "#166534" : "#8A5A08",
                fontWeight: 850,
              }}
            >
              {copyNotice}
            </div>
          ) : null}
        </div>
      </section>

      <section style={{ ...brandPageCard(), display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {iconTile("navigation", "gold")}
          <div>
            <div style={brandSectionLabel()}>Choose GSN action</div>
            <div style={{ color: gmfnBrand.colors.ink, fontSize: 22, fontWeight: 1000 }}>
              Send people to the right GSN tool.
            </div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isPhone ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {destinations.map(destinationCard)}
        </div>
      </section>

      <details style={brandPageCard()}>
        <StableDisclosureSummary debugId="whatsapp-bridge.anchors.open" stableHeight={48}>
          WhatsApp anchors
        </StableDisclosureSummary>
        <div style={{ display: "grid", gap: 12, paddingTop: 12 }}>
          <div style={brandInnerCard("#F9FBFF")}>
            <div style={{ color: gmfnBrand.colors.ink, fontWeight: 1000 }}>
              Group description
            </div>
            <p style={{ ...brandHelperText(), margin: "6px 0 12px" }}>
              Put the permanent bridge link in the group description so it does
              not sink inside chat.
            </p>
            <StableButton
              kind="secondary"
              debugId="whatsapp-bridge.copy-group-description"
              onClick={() =>
                void copyText(groupDescriptionLine, "Group description line copied.")
              }
              stableHeight={48}
            >
              Copy Description Line
            </StableButton>
          </div>
          <div style={brandInnerCard("#FFFDF5")}>
            <div style={{ color: gmfnBrand.colors.ink, fontWeight: 1000 }}>
              Pinned message
            </div>
            <p style={{ ...brandHelperText(), margin: "6px 0 0" }}>
              Pin the bridge message in WhatsApp and refresh it when the pin expires.
              Status can remind people, but it is not the home of the bridge.
            </p>
          </div>
        </div>
      </details>

      <section
        style={{
          ...brandSoftCard("#EEF6FF"),
          display: "grid",
          gap: 8,
          color: gmfnBrand.colors.ink,
        }}
      >
        <div style={{ fontWeight: 1000 }}>Decision boundary</div>
        <div style={{ ...brandHelperText(), fontWeight: 760 }}>
          GSN records GSN actions only. WhatsApp conversation remains outside GSN
          unless a member opens a link and acts inside the app.
        </div>
      </section>
    </div>
  );
}
