import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import NextActionGuide, {
  type NextActionGuideItem,
} from "../components/NextActionGuide";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import TrustDocumentFamilyMap from "../components/TrustDocumentFamilyMap";
import TrustDocumentUseCases from "../components/TrustDocumentUseCases";
import { getCurrentClan, getMe, getMySettings } from "../lib/api";
import { buildGuidanceSnapshot } from "../lib/guidance";
import { buildTrustDocumentFamilyItems } from "../lib/trustDocumentFamilyMap";
import { buildTrustDocumentUseCaseItems } from "../lib/trustDocumentUseCases";
import {
  brandActionButton,
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
import * as api from "../lib/api";

type SettingsState = {
  notificationsMode: "summary" | "detailed";
  unreadFirst: boolean;
  openActionsDirectly: boolean;
  tonePreset: "balanced-default" | "cooperative-warm" | "enterprise-green";
};

type NoticeTone = "success" | "error";

const SETTINGS_STORAGE_KEY = "gmfn.myGmfnAndI.settings.v2";

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
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 108,
    borderRadius: 18,
    border: primary
      ? `1px solid ${gmfnBrand.colors.accentBorder}`
      : `1px solid ${gmfnBrand.colors.line}`,
    background: primary
      ? "linear-gradient(180deg, rgba(19,42,67,0.96) 0%, rgba(26,56,87,0.94) 100%)"
      : "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    padding: 16,
    textDecoration: "none",
    boxShadow: primary
      ? "0 14px 28px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)"
      : "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function capabilityCard(primary = false): React.CSSProperties {
  return {
    borderRadius: 18,
    border: primary
      ? `1px solid ${gmfnBrand.colors.accentBorder}`
      : `1px solid ${gmfnBrand.colors.line}`,
    background: primary
      ? "linear-gradient(180deg, rgba(19,42,67,0.96) 0%, rgba(26,56,87,0.94) 100%)"
      : "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    padding: 16,
    boxShadow: primary
      ? "0 14px 28px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)"
      : "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function sectionLabel(): React.CSSProperties {
  return brandSectionLabel();
}

function badge(primary = false): React.CSSProperties {
  return brandBadge(primary);
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  return brandActionButton(kind, disabled);
}

function helperText(): React.CSSProperties {
  return brandHelperText();
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

function stableTapStyle(): React.CSSProperties {
  return {
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
  };
}

function guardButtonPress(event: React.SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
}

function buttonGuardProps(): Pick<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "onPointerDown" | "onMouseDown"
> {
  return {
    onPointerDown: guardButtonPress,
    onMouseDown: guardButtonPress,
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

function publicCapabilityIcon(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 58,
    height: 58,
    borderRadius: 18,
    background:
      "linear-gradient(180deg, rgba(247,251,255,0.96) 0%, rgba(223,234,245,0.96) 100%)",
    border: "1px solid rgba(18,49,77,0.12)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.98), inset 0 -2px 0 rgba(8,24,42,0.05), 0 12px 22px rgba(8,24,42,0.10)",
    color: "#12314D",
    fontSize: 27,
    lineHeight: 1,
  };
}

const PUBLIC_CAPABILITY_LINES: Record<number, string> = {
  1: "Reduces risk before money moves.",
  2: "Makes buying and selling safer through visible trust.",
  3: "Lets trust travel beyond one community.",
  4: "Shows warning signals before people act.",
  5: "Helps trusted value get seen first.",
  6: "Gives stronger trust more reach.",
  7: "Carries one market presence across communities.",
  8: "Turns visible trust into people-backed lending confidence.",
  9: "Makes support accountable and measurable.",
  10: "Shortens uncertainty when urgent help is needed.",
  11: "Carries trust across distance and borders.",
  12: "Adds a visible trust layer to savings groups.",
  13: "Turns contribution memory into usable record.",
  14: "Keeps trust from resetting when people move.",
  15: "Lets a member carry their good name as proof.",
  16: "Keeps earned reputation useful in new spaces.",
  17: "Gives one trusted identity one wider shop presence.",
  18: "Makes informal service work more visible and trusted.",
  19: "Helps work decisions read credibility before commitment.",
  20: "Makes real needs visible before the market misses them.",
  21: "Turns shared trust into community economic strength.",
  22: "Builds disciplined follow-through for savings, repayment, and goals.",
};

const PUBLIC_CAPABILITY_ICONS: Record<number, string> = {
  1: "🔐",
  2: "🛒",
  3: "🌍",
  4: "🛡️",
  5: "📣",
  6: "⭐",
  7: "🏪",
  8: "💰",
  9: "🤝",
  10: "🚨",
  11: "🌐",
  12: "🧺",
  13: "📋",
  14: "🧭",
  15: "🪪",
  16: "🎖️",
  17: "🏬",
  18: "🛠️",
  19: "👤",
  20: "📦",
  21: "🏛️",
  22: "✅",
};

function publicCapabilityLine(item: (typeof GMFN_CAPABILITIES)[number]) {
  return PUBLIC_CAPABILITY_LINES[item.id] || item.gmfn || item.proverb;
}

function publicCapabilityVisual(item: (typeof GMFN_CAPABILITIES)[number]) {
  return PUBLIC_CAPABILITY_ICONS[item.id] || "◈";
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
  onClose,
}: {
  compact: boolean;
  onClose: () => void;
}) {
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
          <button
            type="button"
            onClick={onClose}
            {...buttonGuardProps()}
            style={publicCloseButton(false)}
          >
            Close
          </button>

          <button
            type="button"
            onClick={onClose}
            {...buttonGuardProps()}
            style={publicCloseButton(true)}
          >
            Continue
          </button>
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
              fontSize: compact ? 30 : 42,
              lineHeight: 1.05,
              fontWeight: 1000,
              letterSpacing: 0,
            }}
          >
            22 things GSN can do for you
          </h1>

          <div
            style={{
              marginTop: 10,
              color: "#D6E3F0",
              fontSize: 14,
              lineHeight: 1.55,
              maxWidth: 760,
            }}
          >
            Read the number, the name, the sign, and the short line. When you
            are done, close this page and continue into the entry protocol.
          </div>
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: compact
              ? "repeat(auto-fit, minmax(158px, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {GMFN_CAPABILITIES.map((item) => {
            const line = publicCapabilityLine(item);

            return (
              <article key={item.id} style={publicCapabilityCard(item.category)}>
                <span style={publicCapabilityNumber()}>{item.id}</span>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "58px 1fr",
                    gap: 13,
                    alignItems: "start",
                    paddingRight: 34,
                  }}
                >
                  <span
                    style={publicCapabilityIcon()}
                    aria-hidden="true"
                  >
                    {publicCapabilityVisual(item)}
                  </span>

                  <div>
                    <h2
                      style={{
                        margin: 0,
                        color: "#071D33",
                        fontSize: 17,
                        lineHeight: 1.18,
                        fontWeight: 1000,
                        letterSpacing: 0,
                        paddingTop: 2,
                      }}
                    >
                      {item.title}
                    </h2>

                    <div
                      style={{
                        marginTop: 8,
                        color: "#32465C",
                        fontSize: 13,
                        lineHeight: 1.42,
                        fontWeight: 700,
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
          <button
            type="button"
            onClick={onClose}
            {...buttonGuardProps()}
            style={publicCloseButton(false)}
          >
            Collapse
          </button>
          <button
            type="button"
            onClick={onClose}
            {...buttonGuardProps()}
            style={publicCloseButton(true)}
          >
            Continue
          </button>
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
  const routeState = (location.state || {}) as { returnTo?: string };
  const publicReturnTo = safeStr(routeState.returnTo) || "/cover";

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [guidance, setGuidance] = useState<any>(null);
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
  const trustDocumentItems = useMemo(
    () => buildTrustDocumentFamilyItems(isAppRoute),
    [isAppRoute]
  );
  const trustDocumentUseCases = useMemo(
    () => buildTrustDocumentUseCaseItems(trustDocumentItems),
    [trustDocumentItems]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
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
    let alive = true;

    (async () => {
      if (!isAppRoute) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const [meRes, clanRes, settingsRes, guidanceRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          getMySettings().catch(() => null),
          buildGuidanceSnapshot().catch(() => null),
        ]);

        if (!alive) return;

        const localSettings = readLocalJSON(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setSettings(
          settingsRes ? normalizeSettings(settingsRes) : normalizeSettings(localSettings)
        );
        setGuidance(guidanceRes || null);
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

  const nextBestStep = guidance?.nextBestStep || null;
  const capabilityCount = GMFN_CAPABILITY_COUNT;
  const topNavHomeTo = isAppRoute ? "/app/dashboard" : "/cover";
  const topNavHomeLabel = isAppRoute ? "Dashboard" : "Cover";
  const topNavTitle = isAppRoute ? "My GSN and I" : "GSN Guide";
  const topNavSubtitle = isAppRoute
    ? `Keep the ${capabilityCount} core capabilities visible here while workspace settings stay in a separate tab.`
    : `Understand what GSN can do before you sign in, enter a community, or move into protected routes.`;
  const heroEyebrow = isAppRoute ? "Member guide" : "Public guide";
  const heroTitle = isAppRoute
    ? `Welcome, ${displayName}`
    : "Understand what GSN can do before you enter";
  const heroBody = isAppRoute
    ? `GSN is your stable identity layer. The current executive summary says the network makes trust visible, portable, and usable across trade, finance, savings, identity, work, community participation, and disciplined follow-through. This keeps those ${capabilityCount} core capabilities visible in one place.`
    : `GSN turns community trust into something visible, portable, and usable across identity, trade, savings, finance, support, and disciplined follow-through. This public guide keeps those ${capabilityCount} core capabilities visible before you choose whether to sign in, create, or join.`;
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
          "Use the welcome route when the next job is entering, building, or joining a real community path.",
        to: "/welcome",
        keywords: ["welcome", "join", "create", "community"],
        tone: "primary",
      },
      {
        id: "sign-in",
        label: "Sign in to reopen protected routes",
        detail:
          "Use sign in when you already have an account and need dashboard, marketplace, loans, trust, or other protected member tools.",
        to: "/login",
        keywords: ["login", "sign in", "dashboard", "member", "protected"],
        tone: "secondary",
      },
    ],
    []
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
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading workspace settings...
          </div>
        </section>
      </div>
    );
  }

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
        subtitle={topNavSubtitle}
        homeTo={topNavHomeTo}
        homeLabel={topNavHomeLabel}
        backTo={topNavHomeTo}
      />

      <ExplainToggle
        label="What this screen does"
        what={
          isAppRoute
            ? "This page explains what GSN means for you as a member and keeps the core capabilities and personal settings close at hand."
            : "This page explains what GSN can do before you sign in, enter a community, or move into protected member routes."
        }
        why={
          isAppRoute
            ? "It turns the product from a collection of routes into a clearer member guide that explains what the network can actually do for you."
            : "It gives public visitors a clear reading of the product before they step into the signed-in system."
        }
        next={
          isAppRoute
            ? "Use the Guide tab to understand the capabilities first, then open Settings when you want to tune how the workspace behaves."
            : "Use the guide first, then choose whether to open the cover, create or join a community, or sign in."
        }
        tone="blue"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard(gmfnBrand.gradients.hero)}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.1fr) 320px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>{heroEyebrow}</div>

            <div
              style={{
                marginTop: 10,
                color: gmfnBrand.colors.darkText,
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              {heroTitle}
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                color: gmfnBrand.colors.darkMuted,
                maxWidth: 860,
              }}
            >
              {heroBody}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {isAppRoute ? (
                <>
                  <span style={badge(true)}>GMFN ID: {gmfnId}</span>
                  <span style={badge(false)}>Community: {communityLabel}</span>
                </>
              ) : (
                <span style={badge(true)}>Public guide before sign-in</span>
              )}
              <span style={badge(false)}>{capabilityCount} core capabilities</span>
              <span style={badge(false)}>{heroEyebrow}</span>
            </div>
          </div>

          <div
            style={{
              ...softCard(gmfnBrand.colors.overlayPanel),
              border: "1px solid rgba(148,163,184,0.16)",
            }}
          >
            <div style={sectionLabel()}>
              {isAppRoute ? "Current guidance reading" : "Best place to start"}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {safeStr(
                isAppRoute
                  ? nextBestStep?.title || "Keep your next step calm and clear"
                  : "Read the guide, then enter through the right door"
              )}
            </div>

            <div style={{ marginTop: 10, ...helperText(), color: "#D7E3F1" }}> 
              {safeStr(
                isAppRoute
                  ? nextBestStep?.detail ||
                      "Use the guide below when you want a clear explanation of what the network can do for you."
                  : "Public visitors should use this guide first, then decide whether the next step is the cover, a create-or-join route, or sign in to reopen protected member work."
              )}
            </div>
          </div>
        </div>
      </section>

      {isAppRoute ? (
        <section style={pageCard()}>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <OriginLink
              to="/app/my-gmfn-and-i"
              style={activeTab === "guide" ? actionBtn("primary") : actionBtn("secondary")}
            >
              Guide
            </OriginLink>

            <OriginLink
              to="/app/my-gmfn-and-i?tab=settings"
              style={activeTab === "settings" ? actionBtn("primary") : actionBtn("secondary")}
            >
              Settings
            </OriginLink>
          </div>
        </section>
      ) : null}

      {activeTab === "guide" ? (
        <>
          <section style={pageCard()}>
            <div style={sectionLabel()}>{capabilityCount} things GSN can do for you</div>

            <div style={{ marginTop: 10, ...helperText(), maxWidth: 920 }}>
              These are the {capabilityCount} core capabilities that explain what GSN can do for you.
            </div>

            <ExplainToggle
              label="How to use this guide"
              what="This section lists the core capabilities so you can understand what the network can do for you across identity, trust, finance, trade, and disciplined follow-through."
              why="It gives you a member-level explanation of the product instead of leaving those capabilities spread across many separate pages."
              next="Read the capability that matches what you need now, then open the related route from the page navigation when you want to act on it."
              tone="light"
              style={{ marginTop: 12 }}
            />

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {GMFN_CAPABILITIES.map((item, index) => (
                <div
                  key={item.id}
                  style={capabilityCard(index === 0)}
                >
                  <div style={sectionLabel()}>Capability {item.id}</div>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 18,
                      lineHeight: 1.3,
                    }}
                  >
                    {item.title}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={pageCard()}>
            <div style={sectionLabel()}>
              Full explanation of the {capabilityCount} core capabilities
            </div>

            <div style={{ marginTop: 10, ...helperText(), maxWidth: 920 }}>
              The executive summary uses the same explanation structure for all {capabilityCount} capabilities.
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {GMFN_CAPABILITIES.map((item) => (
                <div key={`full-${item.id}`} style={innerCard()}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span style={badge(true)}>#{item.id}</span>
                    <div
                      style={{
                        color: "#F8FBFF",
                        fontWeight: 900,
                        fontSize: 18,
                        lineHeight: 1.3,
                      }}
                    >
                      {item.title}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    <div style={helperText()}>
                      <strong style={{ color: "#F8FBFF" }}>What it is:</strong>{" "}
                      {item.whatItIs ||
                        item.proverb ||
                        "Exists in real life, made visible in GSN."}
                    </div>

                    <div style={helperText()}>
                      <strong style={{ color: "#F8FBFF" }}>How it works:</strong>{" "}
                      {item.howItWorks ||
                        item.gmfn ||
                        "Identity + trust + community."}
                    </div>

                    <div style={helperText()}>
                      <strong style={{ color: "#F8FBFF" }}>Why it matters:</strong>{" "}
                      {item.whyItMatters ||
                        item.gmfn ||
                        item.proverb ||
                        "Improves access, reduces risk."}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={pageCard()}>
            <div style={sectionLabel()}>
              {isAppRoute
                ? "Where these capabilities usually appear in the app"
                : "How to move from this public guide into the live product"}
            </div>

            <div style={{ marginTop: 10, ...helperText(), maxWidth: 920 }}>
              {isAppRoute
                ? `The ${capabilityCount} capabilities do not all live on one page. Different pages carry different parts of the system.`
                : "This public guide explains the product first. Use the next-action chooser below when you are ready to enter, create, join, or sign in."}
            </div>

            {isAppRoute ? (
              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <OriginLink to="/app/dashboard" style={routeTile(true)}>
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Dashboard
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Start here when you need the next right step.
                  </div>
                </OriginLink>

                <OriginLink to="/app/community" style={routeTile(false)}>
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Community Home
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Community power, continuity, first-circle building, and private community control start here.
                  </div>
                </OriginLink>

                <OriginLink to="/app/marketplace" style={routeTile(false)}>
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Marketplace
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Buying, selling, spotlight visibility, reputation-based visibility, and one global shop become visible here.
                  </div>
                </OriginLink>

                <OriginLink to="/app/loans" style={routeTile(false)}>
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Loans
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    People-backed loans, supporting others, emergency support, and trust savings all run through the support flow here.
                  </div>
                </OriginLink>

                <OriginLink to="/app/my-gmfn-and-i" style={routeTile(false)}>
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    My GSN and I
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Member guidance, settings, and the 22-capability explanation
                    live here. Open Focus Commitments from Dashboard when you need
                    the execution discipline layer.
                  </div>
                </OriginLink>

                <OriginLink to="/app/trust" style={routeTile(false)}>
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Trust Passport
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Portable trust identity, reputation mobility, fraud reduction before action, and deeper trust explanation live here.
                  </div>
                </OriginLink>

                <OriginLink to="/app/demand-box" style={routeTile(false)}>
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Demand Box
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Demand Box is its own core capability and its own page.
                  </div>
                </OriginLink>
              </div>
            ) : (
              <NextActionGuide
                compact={isCompact}
                defaultOpen
                eyebrow="Public next step"
                title="Which public door should you use next?"
                intro="Choose the route that matches where you are: broad orientation, community entry, or reopening your protected member work."
                items={publicGuideEntryItems}
                onSelect={(item) => {
                  if (!item.to) return;
                  window.location.assign(item.to);
                }}
              />
            )}
          </section>

          <TrustDocumentFamilyMap
            compact={isCompact}
            items={trustDocumentItems}
            title="How the trust record moves from personal meaning into public proof"
            intro={
              isAppRoute
                ? "Use this map when you want to understand the difference between the stable identity layer, the fuller personal trust story, the portable TrustSlip, and the public verification check."
                : "Use this map when you want to understand how GSN moves from a member's stable identity and fuller trust story into portable proof and public verification. Signed-in surfaces are marked clearly where they belong to the app flow."
            }
          />

          <TrustDocumentUseCases
            compact={isCompact}
            items={trustDocumentUseCases}
            title="Which trust surface should you open for which question?"
            intro={
              isAppRoute
                ? "Use this chooser when you know the human question already, like identity, trust story, portable proof, or public validity, and want the right trust surface without guessing."
                : "Use this chooser when you need to understand which trust question belongs to the signed-in record and which belongs to portable proof or public verification."
            }
          />
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
                <button
                  type="button"
                  {...buttonGuardProps()}
                  onClick={() => void saveSettings()}
                  disabled={saving}
                  style={{ ...actionBtn("primary", saving), ...stableTapStyle() }}
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>

                <button
                  type="button"
                  {...buttonGuardProps()}
                  onClick={resetSettings}
                  style={{ ...actionBtn("secondary"), ...stableTapStyle() }}
                >
                  Reset Defaults
                </button>
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
