import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import NextActionGuide, {
  type NextActionGuideItem,
} from "../components/NextActionGuide";
import GsnInstallPrompt from "../components/GsnInstallPrompt";
import PageTopNav from "../components/PageTopNav";
import {
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
} from "../components/StableButton";
import {
  GsnLegacyIcon,
  type GsnIconName,
} from "../components/GsnLegacyIcon";
import { getCurrentClan, getMe, getMySettings, getSelectedClanId } from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  brandBadge,
  brandHelperText,
  brandInnerCard,
  brandPageCard,
  brandSectionLabel,
  brandSoftCard,
  gmfnBrand,
} from "../styles/gmfnBrand";
import {
  GMFN_CAPABILITY_COUNT,
  GMFN_CAPABILITIES,
} from "../lib/gmfnCapabilities";
import { isIosManualInstallTarget } from "../lib/pwaInstall";
import * as api from "../lib/api";

type SettingsState = {
  notificationsMode: "summary" | "detailed";
  unreadFirst: boolean;
  openActionsDirectly: boolean;
  tonePreset: "balanced-default" | "cooperative-warm" | "enterprise-green";
};

type NoticeTone = "success" | "error";

const SETTINGS_STORAGE_KEY = "gmfn.myGmfnAndI.settings.v2";
const SLOW_WORKSPACE_SETTINGS_LOAD_MS = 8000;

const DEFAULT_SETTINGS: SettingsState = {
  notificationsMode: "summary",
  unreadFirst: true,
  openActionsDirectly: true,
  tonePreset: "balanced-default",
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return brandPageCard(bg);
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return brandSoftCard(bg);
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return brandInnerCard(bg);
}

function routeTile(primary = false): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minHeight: 92,
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(214,170,69,0.28)"
      : "1px solid rgba(15,23,42,0.08)",
    background: primary
      ? "linear-gradient(180deg, rgba(239,246,255,0.98) 0%, rgba(255,255,255,0.995) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(250,252,255,0.99) 100%)",
    padding: 14,
    textDecoration: "none",
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    overflowAnchor: "none",
    transition: "none",
    flexShrink: 0,
    boxShadow: primary
      ? "0 16px 32px rgba(11,99,209,0.10), inset 0 1px 0 rgba(255,255,255,0.98)"
      : "0 14px 28px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.96)",
  };
}

function capabilityCard(primary = false): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "42px minmax(0, 1fr)",
    gap: 10,
    alignItems: "start",
    minHeight: 118,
    borderRadius: 14,
    border: primary
      ? "1px solid rgba(214,170,69,0.26)"
      : "1px solid rgba(15,23,42,0.08)",
    background: primary
      ? "linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(255,250,235,0.98) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(248,251,255,0.99) 100%)",
    padding: 12,
    boxShadow: primary
      ? "0 12px 24px rgba(214,170,69,0.13), inset 0 1px 0 rgba(255,255,255,0.98)"
      : "0 10px 20px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.98)",
  };
}

function capabilityVisualRail(): React.CSSProperties {
  return {
    display: "grid",
    justifyItems: "center",
    gap: 8,
    minWidth: 0,
  };
}

function appGuideMiniIconBubble(): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#7A4A00",
    background: "rgba(255,255,255,0.97)",
    border: "1px solid rgba(226,192,106,0.34)",
    boxShadow:
      "0 8px 16px rgba(8,24,42,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
  };
}

function capabilityCompactCard(primary = false): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: 7,
    alignItems: "start",
    minHeight: 132,
    borderRadius: 16,
    border: primary
      ? "1px solid rgba(214,170,69,0.24)"
      : "1px solid rgba(15,23,42,0.08)",
    background: primary
      ? "linear-gradient(180deg, rgba(255,253,246,0.99) 0%, rgba(255,255,255,0.99) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(249,251,255,0.99) 100%)",
    padding: 10,
    boxShadow:
      "0 9px 18px rgba(15,23,42,0.055), inset 0 1px 0 rgba(255,255,255,0.98)",
    overflow: "hidden",
  };
}

function capabilityCardTop(): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minWidth: 0,
  };
}

function sectionLabel(): React.CSSProperties {
  return brandSectionLabel();
}

function badge(primary = false): React.CSSProperties {
  return brandBadge(primary);
}

function helperText(): React.CSSProperties {
  return brandHelperText();
}

function appGuidePanel(compact = false): React.CSSProperties {
  return {
    borderRadius: compact ? 20 : 24,
    border: "1px solid rgba(15,23,42,0.08)",
    background: "#FFFFFF",
    boxShadow:
      compact
        ? "0 12px 26px rgba(15,23,42,0.07), inset 0 1px 0 rgba(255,255,255,0.98)"
        : "0 18px 38px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.98)",
    padding: compact ? 14 : 16,
    boxSizing: "border-box",
  };
}

function appNavyCard(compact = false): React.CSSProperties {
  return {
    borderRadius: compact ? 18 : 20,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "radial-gradient(circle at 84% 22%, rgba(214,170,69,0.18) 0%, rgba(214,170,69,0) 22%), radial-gradient(circle at 92% 76%, rgba(79,128,178,0.18) 0%, rgba(79,128,178,0) 32%), linear-gradient(180deg, #071C31 0%, #082846 100%)",
    boxShadow:
      compact
        ? "0 14px 26px rgba(8,24,42,0.15), inset 0 1px 0 rgba(255,255,255,0.08)"
        : "0 18px 34px rgba(8,24,42,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: compact ? 16 : 18,
    color: "#F8FBFF",
    boxSizing: "border-box",
  };
}

function appGuideIconBox(active = false, compact = false): React.CSSProperties {
  return {
    width: compact ? 44 : 54,
    height: compact ? 44 : 54,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
    background: active
      ? "linear-gradient(180deg, #071C31 0%, #082846 100%)"
      : "linear-gradient(180deg, #08233A 0%, #061827 100%)",
    border: "1px solid rgba(214,170,69,0.24)",
    color: "#F2C766",
    fontWeight: 1000,
    boxShadow:
      "0 10px 20px rgba(8,24,42,0.13), inset 0 1px 0 rgba(255,255,255,0.08)",
  };
}

function appGuideNumber(): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(180deg, #F2C766 0%, #D6AA45 100%)",
    color: "#08233A",
    fontSize: 11,
    fontWeight: 1000,
    flex: "0 0 auto",
    boxShadow: "0 8px 16px rgba(214,170,69,0.22)",
  };
}

function selectStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: `1px solid ${gmfnBrand.colors.lineStrong}`,
    background: gmfnBrand.colors.panel,
    padding: "11px 12px",
    fontSize: 14,
    color: gmfnBrand.colors.ink,
    outline: "none",
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function checkboxRow(): React.CSSProperties {
  return {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    color: gmfnBrand.colors.ink,
    fontSize: 14,
    lineHeight: 1.6,
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...softCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
  };
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

function publicGuideShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    padding: "18px",
    boxSizing: "border-box",
    background:
      "radial-gradient(circle at 16% 0%, rgba(201,154,39,0.16) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 92% 10%, rgba(83,132,178,0.18) 0%, rgba(83,132,178,0) 30%), linear-gradient(180deg, #07131F 0%, #12304A 42%, #D9E4EF 42.1%, #EEF3F8 100%)",
    color: "#F8FBFF",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  };
}

function publicGuideFrame(): React.CSSProperties {
  return {
    width: "min(100%, 1160px)",
    margin: "0 auto",
    display: "grid",
    gap: 14,
  };
}

function publicGuideHeader(): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(214,228,242,0.22)",
    background:
      "linear-gradient(180deg, rgba(13,31,50,0.92) 0%, rgba(7,20,35,0.98) 100%)",
    boxShadow:
      "0 24px 54px rgba(1,9,22,0.34), inset 0 1px 0 rgba(255,255,255,0.08)",
    padding: "18px",
  };
}

function publicCapabilityCard(category: string): React.CSSProperties {
  const accent =
    category === "trade"
      ? "#C8A85C"
      : category === "visibility"
      ? "#5E8CB7"
      : category === "finance"
      ? "#5E9C84"
      : category === "support"
      ? "#8B9BB0"
      : category === "community"
      ? "#6F87AD"
      : category === "identity"
      ? "#A8775B"
      : category === "work"
      ? "#7E8C9C"
      : "#1D4D76";

  return {
    position: "relative",
    overflow: "hidden",
    minHeight: 150,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.13)",
    background:
      `linear-gradient(90deg, ${accent} 0%, ${accent} 1.2%, rgba(255,255,255,0) 1.21%), radial-gradient(circle at 14% 12%, rgba(18,49,77,0.055) 0%, rgba(18,49,77,0) 32%), linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(239,245,251,0.985) 100%)`,
    boxShadow:
      "0 14px 28px rgba(8,24,42,0.13), inset 0 1px 0 rgba(255,255,255,0.96), inset 0 -1px 0 rgba(8,24,42,0.04)",
    padding: "16px 16px 15px",
  };
}

function publicCapabilityCardIos(category: string): React.CSSProperties {
  return {
    ...publicCapabilityCard(category),
    minHeight: "auto",
    padding: "14px 14px 13px",
    borderRadius: 16,
  };
}

function publicCapabilityNumber(): React.CSSProperties {
  return {
    position: "absolute",
    top: 13,
    right: 13,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 38,
    height: 32,
    borderRadius: 11,
    background:
      "linear-gradient(180deg, #12314D 0%, #081D33 100%)",
    color: "#F4D37B",
    border: "1px solid rgba(201,154,39,0.30)",
    boxShadow:
      "0 10px 22px rgba(1,9,22,0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
    fontWeight: 1000,
    fontSize: 13,
  };
}

function publicCapabilityNumberIos(): React.CSSProperties {
  return {
    ...publicCapabilityNumber(),
    top: 12,
    right: 12,
    width: 32,
    height: 28,
    borderRadius: 10,
    fontSize: 12,
  };
}

function publicCapabilityIcon(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 58,
    height: 58,
    borderRadius: 18,
    background: "rgba(255,255,255,0.97)",
    border: "1px solid rgba(226,192,106,0.34)",
    boxShadow:
      "0 12px 22px rgba(8,24,42,0.09), inset 0 1px 0 rgba(255,255,255,0.96)",
    color: "#7A4A00",
    fontSize: 27,
    lineHeight: 1,
  };
}

function publicCapabilityIconIos(): React.CSSProperties {
  return {
    ...publicCapabilityIcon(),
    width: 48,
    height: 48,
    borderRadius: 15,
  };
}

const PUBLIC_CAPABILITY_LINES: Record<number, string> = {
  1: "Reduces risk before money moves.",
  2: "Makes buying and selling safer through visible trust.",
  3: "Lets trust travel beyond one community.",
  4: "Shows warning signals before people act.",
  5: "Helps recorded value get seen first.",
  6: "Gives stronger trust more reach.",
  7: "Carries one market presence across communities.",
  8: "Turns visible trust into people-backed support confidence.",
  9: "Makes support accountable and measurable.",
  10: "Shortens uncertainty when urgent help is needed.",
  11: "Carries trust across distance and borders.",
  12: "Adds a visible trust layer to savings groups.",
  13: "Turns contribution memory into usable record.",
  14: "Keeps trust from resetting when people move.",
  15: "Lets a member carry their good name as a checkable record.",
  16: "Keeps earned reputation useful in new spaces.",
  17: "Gives one identity one wider shop presence.",
  18: "Makes informal service work more visible and reviewable.",
  19: "Helps work decisions read credibility before commitment.",
  20: "Makes real needs visible before the market misses them.",
  21: "Turns shared trust into community economic strength.",
  22: "Builds disciplined follow-through for savings, repayment, and goals.",
};

const CAPABILITY_ICON_NAMES: Record<number, GsnIconName> = {
  1: "shield",
  2: "shop",
  3: "globe",
  4: "alert",
  5: "spark",
  6: "spark",
  7: "shop",
  8: "wallet",
  9: "community",
  10: "alert",
  11: "globe",
  12: "wallet",
  13: "document",
  14: "globe",
  15: "id",
  16: "chart",
  17: "shop",
  18: "briefcase",
  19: "user",
  20: "document",
  21: "community",
  22: "check",
};

function publicCapabilityLine(item: (typeof GMFN_CAPABILITIES)[number]) {
  return PUBLIC_CAPABILITY_LINES[item.id] || item.gmfn || item.proverb;
}

function capabilityIconName(item: (typeof GMFN_CAPABILITIES)[number]): GsnIconName {
  return CAPABILITY_ICON_NAMES[item.id] || "spark";
}

function publicCategoryKey(category: string): string {
  if (category === "trade") return "MARKET";
  if (category === "visibility") return "VISIBILITY";
  if (category === "finance") return "MONEY";
  if (category === "support") return "SUPPORT";
  if (category === "community") return "COMMUNITY";
  if (category === "identity") return "TRUST ID";
  if (category === "work") return "WORK";
  return "OPERATING";
}

function publicToneKey(tone: string): string {
  if (tone === "alert") return "RISK";
  if (tone === "spotlight") return "REACH";
  if (tone === "calm") return "STEADY";
  return "FOCUS";
}

function publicKeyChip(kind: "category" | "tone" = "category"): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 24,
    padding: "4px 8px",
    borderRadius: 999,
    border:
      kind === "category"
        ? "1px solid rgba(18,49,77,0.13)"
        : "1px solid rgba(201,154,39,0.22)",
    background:
      kind === "category"
        ? "rgba(18,49,77,0.07)"
        : "rgba(201,154,39,0.10)",
    color: kind === "category" ? "#12314D" : "#76591D",
    fontSize: 10,
    fontWeight: 1000,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
}

function publicCloseButton(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: primary ? 48 : 40,
    padding: primary ? "13px 18px" : "10px 14px",
    borderRadius: 999,
    border: primary
      ? "1px solid rgba(255,255,255,0.78)"
      : "1px solid rgba(201,154,39,0.32)",
    background: primary
      ? "linear-gradient(180deg, #FFFFFF 0%, #EEF4FA 64%, #DCE7F2 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)",
    color: primary ? "#10253B" : "#F3D06A",
    fontSize: primary ? 15 : 13,
    fontWeight: 1000,
    cursor: "pointer",
    textDecoration: "none",
    boxShadow: primary
      ? "0 16px 28px rgba(1,13,32,0.24), inset 0 1px 0 rgba(255,255,255,0.90)"
      : "0 12px 24px rgba(1,13,32,0.16), inset 0 1px 0 rgba(255,255,255,0.10)",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function PublicCapabilitiesGuidePage({
  compact,
  ios,
  onClose,
}: {
  compact: boolean;
  ios: boolean;
  onClose: () => void;
}) {
  const useIosSingleColumn = compact && ios;

  return (
    <main style={publicGuideShell()}>
      <div style={publicGuideFrame()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <SecondaryButton
            onClick={onClose}
            debugId="my-gmfn.public.close-top"
            style={publicCloseButton(false)}
          >
            Close
          </SecondaryButton>

          <PrimaryButton
            onClick={onClose}
            debugId="my-gmfn.public.continue-top"
            style={publicCloseButton(true)}
          >
            Continue
          </PrimaryButton>
        </div>

        <section style={publicGuideHeader()}>
          <div
            style={{
              color: "#C8A85C",
              fontSize: 12,
              fontWeight: 1000,
              letterSpacing: 2.8,
              textTransform: "uppercase",
            }}
          >
            My GSN and I
          </div>

          <h1
            style={{
              margin: "10px 0 0",
              color: "#F8FBFF",
              fontSize: useIosSingleColumn ? 28 : compact ? 30 : 42,
              lineHeight: 1.05,
              fontWeight: 1000,
              letterSpacing: 0,
            }}
          >
            22 things GSN does
          </h1>

          <div
            style={{
              marginTop: 10,
              color: "#D6E3F0",
              fontSize: useIosSingleColumn ? 13.5 : 14,
              lineHeight: useIosSingleColumn ? 1.48 : 1.55,
              maxWidth: 760,
            }}
          >
            Read the number, the name, the sign, and the short line. When you
            are done, close this page and continue into the entry protocol.
          </div>
        </section>

        {ios ? (
          <GsnInstallPrompt
            tone="dark"
            compact={compact}
            surface="my-gsn-and-i-ios"
          />
        ) : null}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: useIosSingleColumn
              ? "1fr"
              : compact
              ? "repeat(auto-fit, minmax(158px, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
            gap: useIosSingleColumn ? 9 : 10,
          }}
        >
          {GMFN_CAPABILITIES.map((item) => {
            const line = publicCapabilityLine(item);

            return (
              <article
                key={item.id}
                style={
                  useIosSingleColumn
                    ? publicCapabilityCardIos(item.category)
                    : publicCapabilityCard(item.category)
                }
              >
                <span
                  style={
                    useIosSingleColumn
                      ? publicCapabilityNumberIos()
                      : publicCapabilityNumber()
                  }
                >
                  {item.id}
                </span>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: useIosSingleColumn
                      ? "48px minmax(0, 1fr)"
                      : "58px 1fr",
                    gap: useIosSingleColumn ? 10 : 13,
                    alignItems: "start",
                    paddingRight: useIosSingleColumn ? 28 : 34,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={
                      useIosSingleColumn
                        ? publicCapabilityIconIos()
                        : publicCapabilityIcon()
                    }
                    aria-hidden="true"
                  >
                    <GsnLegacyIcon
                      name={capabilityIconName(item)}
                      size={useIosSingleColumn ? 36 : 42}
                      decorative
                    />
                  </span>

                  <div style={{ minWidth: 0 }}>
                    <h2
                      style={{
                        margin: 0,
                        color: "#071D33",
                        fontSize: useIosSingleColumn ? 16 : 17,
                        lineHeight: useIosSingleColumn ? 1.14 : 1.18,
                        fontWeight: 1000,
                        letterSpacing: 0,
                        paddingTop: 2,
                        overflowWrap: "normal",
                        wordBreak: "normal",
                      }}
                    >
                      {item.title}
                    </h2>

                    <div
                      style={{
                        marginTop: 8,
                        color: "#32465C",
                        fontSize: useIosSingleColumn ? 12.5 : 13,
                        lineHeight: useIosSingleColumn ? 1.36 : 1.42,
                        fontWeight: 700,
                        overflowWrap: "normal",
                        wordBreak: "normal",
                      }}
                    >
                      {line}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        maxWidth: "100%",
                      }}
                    >
                      <span style={publicKeyChip("category")}>
                        {publicCategoryKey(item.category)}
                      </span>
                      <span style={publicKeyChip("tone")}>
                        {publicToneKey(item.tone)}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 18,
          }}
        >
          <SecondaryButton
            onClick={onClose}
            debugId="my-gmfn.public.collapse-bottom"
            style={publicCloseButton(false)}
          >
            Collapse
          </SecondaryButton>
          <PrimaryButton
            onClick={onClose}
            debugId="my-gmfn.public.continue-bottom"
            style={publicCloseButton(true)}
          >
            Continue
          </PrimaryButton>
        </div>
      </div>
    </main>
  );
}

function readLocalJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJSON(key: string, value: any) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function normalizeSettings(raw: any): SettingsState {
  const tone = safeStr(raw?.tonePreset || raw?.tone_preset);

  return {
    notificationsMode:
      safeStr(raw?.notificationsMode || raw?.notifications_mode) === "detailed"
        ? "detailed"
        : "summary",
    unreadFirst: Boolean(raw?.unreadFirst ?? raw?.unread_first ?? true),
    openActionsDirectly: Boolean(
      raw?.openActionsDirectly ?? raw?.open_actions_directly ?? true
    ),
    tonePreset:
      tone === "cooperative-warm" || tone === "enterprise-green"
        ? (tone as SettingsState["tonePreset"])
        : "balanced-default",
  };
}

async function callFirstAvailable<T = any>(
  names: string[],
  argsSets: any[][]
): Promise<T | null> {
  for (const name of names) {
    const fn = (api as any)[name];
    if (typeof fn !== "function") continue;

    for (const args of argsSets) {
      try {
        const result = await fn(...args);
        if (result) return result as T;
      } catch {
        // try next signature
      }
    }
  }

  return null;
}

export default function MyGMFNAndIPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAppRoute = location.pathname.startsWith("/app/");
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "my-gmfn.route.dashboard-target"),
      community: routeTarget("communityHome", selectedClanId, "my-gmfn.route.community-target"),
      marketplace: routeTarget("marketplace", selectedClanId, "my-gmfn.route.marketplace-target"),
      loans: routeTarget("loans", selectedClanId, "my-gmfn.route.loans-target"),
      guide: routeTarget("profile", selectedClanId, "my-gmfn.route.guide-target"),
      settings: routeTarget("settings", selectedClanId, "my-gmfn.route.settings-target"),
      trust: routeTarget("trust", selectedClanId, "my-gmfn.route.trust-target"),
      demandBox: routeTarget("demandBox", selectedClanId, "my-gmfn.route.demand-box-target"),
    }),
    [selectedClanId]
  );
  const routeState = (location.state || {}) as { returnTo?: string };
  const publicReturnTo = safeStr(routeState.returnTo) || "/cover";

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });
  const [isIosTarget, setIsIosTarget] = useState<boolean>(() =>
    isIosManualInstallTarget()
  );

  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [settings, setSettings] = useState<SettingsState>(() =>
    readLocalJSON(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS)
  );

  const activeTab = useMemo(() => {
    if (!isAppRoute) return "guide";
    const params = new URLSearchParams(location.search);
    return safeStr(params.get("tab")).toLowerCase() === "settings"
      ? "settings"
      : "guide";
  }, [isAppRoute, location.search]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
      setIsIosTarget(isIosManualInstallTarget());
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    writeLocalJSON(SETTINGS_STORAGE_KEY, settings);
  }, [settings]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!loading || !isAppRoute) {
      setSlowLoad(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setSlowLoad(true);
    }, SLOW_WORKSPACE_SETTINGS_LOAD_MS);

    return () => window.clearTimeout(timer);
  }, [loading, isAppRoute]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!isAppRoute) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [meRes, clanRes, settingsRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          getMySettings().catch(() => null),
        ]);

        if (!alive) return;

        const localSettings = readLocalJSON(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setSettings(
          settingsRes ? normalizeSettings(settingsRes) : normalizeSettings(localSettings)
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isAppRoute]);

  const displayName = useMemo(() => {
    return (
      firstTruthy(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Member"
    );
  }, [me]);

  const gmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id, "Awaiting issue");
  }, [me]);

  const communityLabel = useMemo(() => {
    return (
      firstTruthy(
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || "No current community"
    );
  }, [currentClan]);

  const capabilityCount = GMFN_CAPABILITY_COUNT;
  const topNavHomeTo = isAppRoute ? routes.dashboard : "/cover";
  const topNavHomeLabel = isAppRoute ? "Dashboard" : "Cover";
  const topNavTitle = isAppRoute ? "My GSN and I" : "GSN Guide";
  const topNavSubtitle = isAppRoute
    ? `Keep the ${capabilityCount} core capabilities visible here while workspace settings stay in a separate tab.`
    : `Understand what GSN can do before you sign in, enter a community, or move into protected pages.`;
  const publicGuideEntryItems = useMemo<NextActionGuideItem[]>(
    () => [
      {
        id: "open-cover",
        label: "Open GSN cover",
        detail:
          "Start from the public front door when you want the broadest entry view before choosing a path.",
        to: "/cover",
        keywords: ["cover", "entry", "front door", "open gsn"],
        tone: "secondary",
      },
      {
        id: "create-or-join",
        label: "Create or join a community",
        detail:
          "Use the welcome page when the next job is entering, building, or joining a real community path.",
        to: "/welcome",
        keywords: ["welcome", "join", "create", "community"],
        tone: "primary",
      },
      {
        id: "sign-in",
        label: "Sign in to reopen protected pages",
        detail:
          "Use sign in when you already have an account and need dashboard, marketplace, loans, trust, or other protected member tools.",
        to: "/login",
        keywords: ["login", "sign in", "dashboard", "member", "protected"],
        tone: "secondary",
      },
    ],
    []
  );
  const appGuideRoutes = useMemo(
    () => [
      {
        label: "Dashboard",
        detail: "Start here for your next step.",
        icon: "chart" as GsnIconName,
        to: routes.dashboard,
        debugId: "my-gmfn.route.dashboard",
      },
      {
        label: "Community Home",
        detail: "Community power and private control.",
        icon: "home" as GsnIconName,
        to: routes.community,
        debugId: "my-gmfn.route.community",
      },
      {
        label: "Marketplace",
        detail: "Buying, selling, and visibility.",
        icon: "shop" as GsnIconName,
        to: routes.marketplace,
        debugId: "my-gmfn.route.marketplace",
      },
      {
        label: "Loans & Support",
        detail: "Support actions and community-backed loans.",
        icon: "wallet" as GsnIconName,
        to: routes.loans,
        debugId: "my-gmfn.route.loans",
      },
      {
        label: "Trust Passport",
        detail: "Deeper trust identity and evidence.",
        icon: "shield" as GsnIconName,
        to: routes.trust,
        debugId: "my-gmfn.route.trust",
      },
      {
        label: "Demand Box",
        detail: "Needs and opportunities.",
        icon: "document" as GsnIconName,
        to: routes.demandBox,
        debugId: "my-gmfn.route.demand-box",
      },
      {
        label: "My GSN and I",
        detail: "Guidance, settings, and capability overview.",
        icon: "user" as GsnIconName,
        to: routes.guide,
        debugId: "my-gmfn.route.my-gmfn",
        active: true,
      },
    ],
    [routes]
  );

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  async function saveSettings() {
    setSaving(true);

    try {
      const payload = {
        notificationsMode: settings.notificationsMode,
        notifications_mode: settings.notificationsMode,
        unreadFirst: settings.unreadFirst,
        unread_first: settings.unreadFirst,
        openActionsDirectly: settings.openActionsDirectly,
        open_actions_directly: settings.openActionsDirectly,
        tonePreset: settings.tonePreset,
        tone_preset: settings.tonePreset,
      };

      const saved = await callFirstAvailable(
        [
          "updateMySettings",
          "saveMySettings",
          "updateSettings",
          "saveSettings",
          "setMySettings",
        ],
        [[payload]]
      );

      writeLocalJSON(SETTINGS_STORAGE_KEY, settings);

      if (saved) {
        showNotice("success", "Settings saved.");
      } else {
        showNotice(
          "success",
          "Settings saved on this device."
        );
      }
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Settings could not be saved right now."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
    showNotice("success", "Settings reset to the calmer defaults.");
  }

  function closePublicGuide() {
    navigate(publicReturnTo, { replace: false });
  }

  if (!isAppRoute) {
    return (
      <PublicCapabilitiesGuidePage
        compact={isCompact}
        ios={isIosTarget}
        onClose={closePublicGuide}
      />
    );
  }

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          paddingBottom: 40,
          display: "grid",
          gap: 18,
        }}
      >
        <PageTopNav
          sectionLabel={topNavTitle}
          title={topNavTitle}
          subtitle={isAppRoute ? "Loading your workspace settings..." : "Loading the public guide..."}
          homeTo={topNavHomeTo}
          homeLabel={topNavHomeLabel}
          backTo={topNavHomeTo}
        />

        <section style={pageCard()}>
          <div style={{ color: "#64748B", lineHeight: 1.8, fontWeight: 800 }}>
            {slowLoad
              ? "This is taking longer than expected."
              : "Loading workspace settings..."}
          </div>
          {slowLoad ? (
            <p
              style={{
                margin: "10px 0 0",
                color: "#617085",
                fontSize: 14,
                lineHeight: 1.65,
                maxWidth: 680,
              }}
            >
              Your guide can still open from Dashboard after the connection
              settles. Wait here, or use the Dashboard link above and come back.
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: isCompact ? 28 : 40,
        display: "grid",
        gap: isCompact ? 14 : 18,
        WebkitTextSizeAdjust: "100%",
      }}
    >
      {!isCompact ? (
        <PageTopNav
          sectionLabel={topNavTitle}
          title={topNavTitle}
          subtitle={topNavSubtitle}
          homeTo={topNavHomeTo}
          homeLabel={topNavHomeLabel}
          backTo={topNavHomeTo}
        />
      ) : null}

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section style={appGuidePanel(isCompact)}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(280px, 0.92fr)",
            gap: isCompact ? 12 : 16,
            alignItems: "start",
          }}
        >
          <div style={appNavyCard(isCompact)}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "48px minmax(0, 1fr)" : "54px minmax(0, 1fr)",
                alignItems: "center",
                gap: isCompact ? 10 : 12,
              }}
            >
              <span style={appGuideIconBox(true, isCompact)}>
                <GsnLegacyIcon
                  name="shield"
                  size={isCompact ? 38 : 44}
                  decorative
                />
              </span>
              <div
                style={{
                  fontSize: isCompact ? 20 : 26,
                  lineHeight: 1.08,
                  fontWeight: 1000,
                }}
              >
                My GSN and I
              </div>
            </div>

            <div
              style={{
                marginTop: isCompact ? 14 : 18,
                color: "#DCEBFA",
                fontSize: isCompact ? 14 : 15,
                lineHeight: 1.45,
                fontWeight: 700,
              }}
            >
              See the 22 things GSN does and where each tool lives.
            </div>

            <StableCtaLink
              to={routes.dashboard}
              kind="primary"
              debugId="my-gmfn.hero.dashboard"
              style={{
                marginTop: isCompact ? 14 : 18,
                width: "fit-content",
                minHeight: isCompact ? 44 : 52,
                borderRadius: 999,
                padding: isCompact ? "11px 17px" : "14px 20px",
                background:
                  "linear-gradient(180deg, #F2C766 0%, #D6AA45 100%)",
                color: "#07172C",
                border: "1px solid rgba(255,255,255,0.38)",
                boxShadow: "0 14px 24px rgba(214,170,69,0.22)",
              }}
            >
              Dashboard {">"}
            </StableCtaLink>
          </div>

          <div style={appNavyCard(isCompact)}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "48px minmax(0, 1fr)" : "54px minmax(0, 1fr)",
                alignItems: "center",
                gap: isCompact ? 10 : 12,
              }}
            >
              <span style={appGuideIconBox(false, isCompact)}>
                <GsnLegacyIcon
                  name="user"
                  size={isCompact ? 38 : 44}
                  decorative
                />
              </span>
              <div>
                <div
                  style={{
                    fontSize: isCompact ? 20 : 26,
                    lineHeight: 1.08,
                    fontWeight: 1000,
                    overflowWrap: "anywhere",
                  }}
                >
                  Welcome, {displayName}
                </div>
                <div
                  style={{
                    marginTop: 7,
                    color: "#DCEBFA",
                    fontSize: isCompact ? 13 : 14,
                    lineHeight: 1.42,
                    fontWeight: 700,
                  }}
                >
                  GSN keeps your identity, trust, and opportunities visible in one place.
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: isCompact ? 14 : 18,
                display: "grid",
                gap: 8,
              }}
            >
              <span style={badge(true)}>GSN ID: {gmfnId}</span>
              <span style={badge(false)}>Community: {communityLabel}</span>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: isCompact ? 12 : 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "180px 180px minmax(0, 1fr)",
            gap: 10,
            alignItems: "stretch",
          }}
        >
          <StableCtaLink
            to={routes.guide}
            kind={activeTab === "guide" ? "primary" : "secondary"}
            debugId="my-gmfn.tab.guide"
            style={{
              minHeight: isCompact ? 46 : 52,
              borderRadius: 999,
              padding: isCompact ? "10px 12px" : undefined,
              fontSize: isCompact ? 14 : undefined,
              gap: 7,
            }}
          >
            <GsnLegacyIcon name="spark" size={24} decorative />
            {capabilityCount} Capabilities
          </StableCtaLink>

          <StableCtaLink
            to={routes.settings}
            kind={activeTab === "settings" ? "primary" : "secondary"}
            debugId="my-gmfn.tab.settings"
            style={{
              minHeight: isCompact ? 46 : 52,
              borderRadius: 999,
              padding: isCompact ? "10px 12px" : undefined,
              fontSize: isCompact ? 14 : undefined,
            }}
          >
            Member Guide
          </StableCtaLink>

          <StableCtaLink
            to={routes.trust}
            kind="secondary"
            debugId="my-gmfn.quick-guide.trust"
            style={{
              gridColumn: isCompact ? "1 / -1" : undefined,
              minHeight: isCompact ? 72 : 82,
              borderRadius: 18,
              justifyContent: "flex-start",
              padding: isCompact ? "12px 14px" : "14px 16px",
              textAlign: "left",
              fontSize: isCompact ? 13.5 : undefined,
              lineHeight: 1.35,
            }}
          >
            <span style={appGuideMiniIconBubble()}>
              <GsnLegacyIcon name="spark" size={24} decorative />
            </span>
            <span>
              <strong>Quick Guide</strong>
              <br />
              Strengthen your identity evidence. Add a clear photo/selfie to keep your Trust Passport and TrustSlip strong.
            </span>
          </StableCtaLink>
        </div>
      </section>

      {activeTab === "guide" ? (
        <>
          <section style={appGuidePanel(isCompact)}>
            <div
              style={{
                color: "#07172C",
                fontSize: isCompact ? 22 : 28,
                fontWeight: 1000,
                lineHeight: 1.08,
              }}
            >
              22 things GSN does
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                fontSize: isCompact ? 13 : 14,
                fontWeight: 700,
                lineHeight: 1.45,
              }}
            >
              Institutional map of the {capabilityCount} core capabilities.
              This guide explains what GSN is built to support; it is not proof
              that any one member, shop, payout, paid verification, or protected
              trade release is already approved.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "repeat(2, minmax(0, 1fr))"
                  : "repeat(4, minmax(0, 1fr))",
                gap: isCompact ? 9 : 10,
              }}
            >
              {GMFN_CAPABILITIES.map((item, index) => (
                <div
                  key={item.id}
                  style={
                    isCompact
                      ? capabilityCompactCard(index === 0)
                      : capabilityCard(index === 0)
                  }
                >
                  {isCompact ? (
                    <div style={capabilityCardTop()}>
                      <span style={appGuideNumber()}>{item.id}</span>
                      <span style={appGuideMiniIconBubble()}>
                        <GsnLegacyIcon
                          name={capabilityIconName(item)}
                          size={24}
                          decorative
                        />
                      </span>
                    </div>
                  ) : (
                    <span style={capabilityVisualRail()}>
                      <span style={appGuideNumber()}>{item.id}</span>
                      <span style={appGuideMiniIconBubble()}>
                        <GsnLegacyIcon
                          name={capabilityIconName(item)}
                          size={28}
                          decorative
                        />
                      </span>
                    </span>
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        color: "#07172C",
                        fontSize: isCompact ? 11.2 : 12.5,
                        fontWeight: 1000,
                        lineHeight: isCompact ? 1.14 : 1.18,
                        overflowWrap: "normal",
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        color: "#425466",
                        fontSize: isCompact ? 10.4 : 11.5,
                        fontWeight: 700,
                        lineHeight: isCompact ? 1.28 : 1.35,
                      }}
                    >
                      {publicCapabilityLine(item)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={appGuidePanel(isCompact)}>
            <div
              style={{
                color: "#07172C",
                fontSize: isCompact ? 21 : 27,
                fontWeight: 1000,
                lineHeight: 1.1,
              }}
            >
              {isAppRoute
                ? "Where You See These In The App"
                : "How To Move Into The Live Product"}
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                fontSize: isCompact ? 13 : 14,
                fontWeight: 700,
                lineHeight: 1.45,
              }}
            >
              {isAppRoute
                ? "Different pages carry different parts of the system."
                : "Choose the page that matches where you are now."}
            </div>

            {isAppRoute ? (
              <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
                {appGuideRoutes.map((item) => (
                  <StableCtaLink
                    key={item.label}
                    to={item.to}
                    kind={item.active ? "primary" : "secondary"}
                    debugId={item.debugId}
                    style={{
                      ...routeTile(Boolean(item.active)),
                      minHeight: isCompact ? 76 : 92,
                      padding: isCompact ? 12 : 14,
                      gap: isCompact ? 11 : 14,
                    }}
                  >
                    <span style={appGuideIconBox(Boolean(item.active), isCompact)}>
                      <GsnLegacyIcon
                        name={item.icon}
                        size={isCompact ? 38 : 44}
                        decorative
                      />
                    </span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "#07172C",
                          fontSize: isCompact ? 13.8 : 15,
                          fontWeight: 1000,
                          lineHeight: 1.2,
                        }}
                      >
                        {item.label}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: 5,
                          color: "#64748B",
                          fontSize: isCompact ? 11.8 : 12.5,
                          fontWeight: 700,
                          lineHeight: 1.38,
                        }}
                      >
                        {item.detail}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      style={{
                        color: item.active ? "#C99B3B" : "#A7B0BE",
                        fontSize: 22,
                        fontWeight: 900,
                        lineHeight: 1,
                      }}
                    >
                      {">"}
                    </span>
                  </StableCtaLink>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                <NextActionGuide
                  compact={isCompact}
                  defaultOpen
                  eyebrow="Public next step"
                  title="Which public door should you use next?"
                  intro="Choose the page that matches where you are: broad orientation, community entry, or reopening your protected member work."
                  items={publicGuideEntryItems}
                  onSelect={(item) => {
                    if (!item.to) return;
                    window.location.assign(item.to);
                  }}
                />
              </div>
            )}

            <div
              style={{
                marginTop: 18,
                borderRadius: 20,
                border: "1px solid rgba(214,170,69,0.16)",
                background:
                  "linear-gradient(180deg, rgba(255,249,232,0.96) 0%, rgba(255,253,246,0.98) 100%)",
                padding: isCompact ? 18 : 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  color: "#07172C",
                  fontSize: 16,
                  fontWeight: 1000,
                }}
              >
                <span style={appGuideMiniIconBubble()}>
                  <GsnLegacyIcon name="document" size={28} decorative />
                </span>
                How to use this page
              </div>

              <div style={{ marginTop: 18, display: "grid", gap: 15 }}>
                {[
                  "Learn the capability.",
                  "See where it lives.",
                  "Open the right page.",
                ].map((step, index) => (
                  <div
                    key={step}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "32px minmax(0, 1fr)",
                      gap: 12,
                      alignItems: "center",
                      color: "#243247",
                      fontSize: 14,
                      fontWeight: 850,
                    }}
                  >
                    <span style={appGuideNumber()}>{index + 1}</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section style={pageCard()}>
          <div style={sectionLabel()}>Workspace settings</div>

          <div style={{ marginTop: 10, ...helperText(), maxWidth: 860 }}>
            Keep the app calmer and easier to read without changing the {capabilityCount} core capabilities guide.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.05fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard()}>
              <div style={sectionLabel()}>Notification reading mode</div>

              <div style={{ marginTop: 8, ...helperText() }}>
                Choose whether the inbox and related pages should feel shorter or fuller.
              </div>

              <div style={{ marginTop: 12 }}>
                <select
                  value={settings.notificationsMode}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      notificationsMode: e.target.value as SettingsState["notificationsMode"],
                    }))
                  }
                  style={selectStyle()}
                >
                  <option value="summary">Summary</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>

              <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <label style={checkboxRow()}>
                  <input
                    type="checkbox"
                    checked={settings.unreadFirst}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        unreadFirst: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    Put unread items first so the most unread work rises to the top.
                  </span>
                </label>

                <label style={checkboxRow()}>
                  <input
                    type="checkbox"
                    checked={settings.openActionsDirectly}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        openActionsDirectly: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    Open the destination page directly from the primary action instead of reviewing it here first.
                  </span>
                </label>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={sectionLabel()}>Tone preset</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Choose how the guidance language should sound.
                </div>

                <div style={{ marginTop: 12 }}>
                  <select
                    value={settings.tonePreset}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        tonePreset: e.target.value as SettingsState["tonePreset"],
                      }))
                    }
                    style={selectStyle()}
                  >
                    <option value="balanced-default">Balanced default</option>
                    <option value="cooperative-warm">Cooperative warm</option>
                    <option value="enterprise-green">Enterprise direct</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <PrimaryButton
                  onClick={() => void saveSettings()}
                  busy={saving}
                  busyLabel="Saving..."
                  debugId="my-gmfn.settings.save"
                >
                  Save Settings
                </PrimaryButton>

                <SecondaryButton
                  onClick={resetSettings}
                  debugId="my-gmfn.settings.reset"
                >
                  Reset Defaults
                </SecondaryButton>
              </div>
            </div>

            <div style={softCard()}>
              <div style={sectionLabel()}>Current reading</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={innerCard()}>
                  <div style={sectionLabel()}>Notification mode</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {settings.notificationsMode === "detailed"
                      ? "Detailed"
                      : "Summary"}
                  </div>
                </div>

                <div style={innerCard()}>
                  <div style={sectionLabel()}>Unread ordering</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {settings.unreadFirst ? "Unread first" : "Latest first"}
                  </div>
                </div>

                <div style={innerCard()}>
                  <div style={sectionLabel()}>Primary action style</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {settings.openActionsDirectly ? "Open directly" : "Review first"}
                  </div>
                </div>

                <div style={innerCard()}>
                  <div style={sectionLabel()}>Tone</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {settings.tonePreset === "cooperative-warm"
                      ? "Cooperative warm"
                      : settings.tonePreset === "enterprise-green"
                      ? "Enterprise direct"
                      : "Balanced default"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
