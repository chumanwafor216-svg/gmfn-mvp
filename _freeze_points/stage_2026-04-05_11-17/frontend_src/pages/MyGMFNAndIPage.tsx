import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import CompanionSettingsPanel from "../components/CompanionSettingsPanel";
import {
  emitCompanionSettingsUpdated,
  emitVisualSettingsUpdated,
} from "../lib/workspaceEvents";
import {
  getMe,
  getMySettings,
  getSelectedClanId,
  listMyClans,
  logout,
  resetMySettings,
  safeCopy,
  updateMySettings,
} from "../lib/api";

const PDF_FALLBACK_TO = "/GSN_FINAL_WHITE.pdf";

type EntryMode = "general" | "create" | "invite" | "approved" | "existing";
type MemberTab = "guide" | "settings";
type ThemePreset =
  | "professional-blue"
  | "cooperative-warm"
  | "enterprise-green";

type GuideBlock = {
  title: string;
  text: string;
};

type RouteBlock = {
  title: string;
  text: string;
};

type BenefitBlock = {
  no: number;
  title: string;
  text: string;
};

type SettingsState = {
  tonePreset: ThemePreset;
  textSize: "standard" | "large";
  contrast: "standard" | "high";
  motion: "normal" | "reduced";
  density: "comfortable" | "compact";
  preferredLanguage: string;
  preferredCurrency: string;
  trustShareLevel: "minimal" | "standard" | "detailed";
  showPhonePublic: boolean;
  showWhatsAppPublic: boolean;
  showTelegramPublic: boolean;
  showShopPublic: boolean;
  preferredCommunityId: string;
  preferredLandingTab: MemberTab;
  notificationsMode: "summary" | "detailed";
  quietNotifications: boolean;
  soundEnabled: boolean;
  unreadFirst: boolean;
  openActionsDirectly: boolean;
};

type BannerTone = "success" | "error" | "info";

const DEFAULT_SETTINGS: SettingsState = {
  tonePreset: "professional-blue",
  textSize: "standard",
  contrast: "standard",
  motion: "normal",
  density: "comfortable",
  preferredLanguage: "English",
  preferredCurrency: "NGN",
  trustShareLevel: "standard",
  showPhonePublic: false,
  showWhatsAppPublic: true,
  showTelegramPublic: false,
  showShopPublic: true,
  preferredCommunityId: "",
  preferredLandingTab: "guide",
  notificationsMode: "summary",
  quietNotifications: false,
  soundEnabled: false,
  unreadFirst: true,
  openActionsDirectly: true,
};

const FIXED_RULES: GuideBlock[] = [
  {
    title: "One person, one global identity",
    text: "Each user carries one global GMFN ID across the system. Identity should not split from one community to another.",
  },
  {
    title: "One identity, one global shop",
    text: "One identity carries one global shop. Shop visibility may appear across surfaces, but the underlying shop remains attached to the same identity.",
  },
  {
    title: "Demand follows identity",
    text: "Demand belongs to the person asking. It is identity-based, not a separate anonymous layer.",
  },
  {
    title: "Spotlight follows shop",
    text: "Spotlight belongs to the shop surface. It is not the same as demand, and it should not be confused with it.",
  },
  {
    title: "Community Home is private control",
    text: "Community Home is owner-only. It is not the public browsing surface and not the marketplace itself.",
  },
  {
    title: "Marketplace is a selected-community surface",
    text: "Marketplace reflects the selected community context. Shop Gallery is the viewing surface for a shop.",
  },
  {
    title: "Admin belongs only in Command Center",
    text: "Administrative tools must stay in Command Center. Member pages should stay clean and member-facing.",
  },
];

const READING_BLOCKS: GuideBlock[] = [
  {
    title: "Identity",
    text: "The identity layer explains who is participating. It should be stable, portable, and properly issued rather than casually self-assigned.",
  },
  {
    title: "Trust",
    text: "Trust summaries help explain how the identity is currently standing. They should be readable, calm, and easy to act on.",
  },
  {
    title: "Community",
    text: "Community is where participation, approvals, relationships, and visibility become structured. It is not just a social feed.",
  },
  {
    title: "Demand",
    text: "Demand shows what a person needs. It stays attached to the identity of the requester.",
  },
  {
    title: "Spotlight",
    text: "Spotlight shows what a shop wants to present. It is shop-based visibility, not the same thing as personal demand.",
  },
  {
    title: "Marketplace and shop",
    text: "Marketplace is the selected community market surface. Shop Gallery is the member and public viewing surface for a shop.",
  },
];

const ENTRY_PATHS: RouteBlock[] = [
  {
    title: "General public path",
    text: "Cover → Welcome → My GMFN and I or Login → Dashboard",
  },
  {
    title: "Founder / create path",
    text: "Cover → Create Entry → GMFN issuance → Dashboard",
  },
  {
    title: "Invited join path",
    text: "Cover → Join Entry → Pending Approval → Activation → GMFN issuance → Dashboard",
  },
  {
    title: "Existing user path",
    text: "Cover or Welcome → Login → Dashboard",
  },
];

const GMFN_21_THINGS: BenefitBlock[] = [
  {
    no: 1,
    title: "Gives you one global GMFN ID",
    text: "You receive one identity that stays with you across visible communities.",
  },
  {
    no: 2,
    title: "Attaches one global shop to your identity",
    text: "Your shop remains tied to your identity instead of becoming a separate broken surface.",
  },
  {
    no: 3,
    title: "Lets you appear properly in communities",
    text: "You can participate in communities through a structured membership and trust path.",
  },
  {
    no: 4,
    title: "Shows your immediate Open Trust reading",
    text: "You can see how you are currently standing in the community you are operating in now.",
  },
  {
    no: 5,
    title: "Shows your CCI reading",
    text: "You can see your cross-community integrity reading across visible communities.",
  },
  {
    no: 6,
    title: "Gives you a TrustSlip",
    text: "You can hold a trust verification surface without confusing it with the main trust explanation page.",
  },
  {
    no: 7,
    title: "Gives you a QR verification path",
    text: "A QR code helps others verify the TrustSlip more easily.",
  },
  {
    no: 8,
    title: "Lets you post demand as yourself",
    text: "Your requests stay identity-based and connected to the person asking.",
  },
  {
    no: 9,
    title: "Lets your shop appear in spotlight",
    text: "Spotlight gives shop-based visibility without merging it into demand.",
  },
  {
    no: 10,
    title: "Lets your shop appear in marketplace",
    text: "Your shop can become visible in the selected community surface.",
  },
  {
    no: 11,
    title: "Gives you a Shop Gallery surface",
    text: "Other members and the public can view your shop in a dedicated viewing surface.",
  },
  {
    no: 12,
    title: "Gives you Community Home access",
    text: "When appropriate, you can work through the private owner-facing community surface.",
  },
  {
    no: 13,
    title: "Lets communities invite and review entry properly",
    text: "Entry can move through invite, join, approval, and activation instead of informal confusion.",
  },
  {
    no: 14,
    title: "Shows you notifications that matter",
    text: "You can see important updates for trust, join requests, demand, spotlight, and money movement.",
  },
  {
    no: 15,
    title: "Supports loans and support pathways",
    text: "You can move into support, readiness, and related economic tools from one workspace.",
  },
  {
    no: 16,
    title: "Supports pool payment guidance",
    text: "You can see the payment route connected to your support or pool activity.",
  },
  {
    no: 17,
    title: "Supports withdrawal guidance",
    text: "You can follow structured withdrawal instructions where available.",
  },
  {
    no: 18,
    title: "Supports readiness and workbench tools",
    text: "You can review readiness, suggestions, and workbench movement where those tools apply.",
  },
  {
    no: 19,
    title: "Shows guarantor earnings where relevant",
    text: "You can see guarantor-related earnings in the correct place instead of scattered surfaces.",
  },
  {
    no: 20,
    title: "Helps protect identity integrity",
    text: "The system gives a place to understand identity consistency and risk signals.",
  },
  {
    no: 21,
    title: "Gives you one guided dashboard",
    text: "You start from a calmer home page that helps you move into trust, community, demand, marketplace, and shop in a structured way.",
  },
];

function readStorage(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    const value = window.localStorage.getItem(key);
    return value == null ? null : String(value);
  } catch {
    return null;
  }
}

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

function hasAccessToken(): boolean {
  return Boolean(String(readStorage("access_token") || "").trim());
}

function getEntryMode(): EntryMode | null {
  const raw = String(readStorage("gmfn_entry_mode") || "").trim().toLowerCase();

  if (
    raw === "general" ||
    raw === "create" ||
    raw === "invite" ||
    raw === "approved" ||
    raw === "existing"
  ) {
    return raw as EntryMode;
  }

  return null;
}

function normalizeSettingsPayload(input: any): SettingsState {
  return {
    ...DEFAULT_SETTINGS,
    ...(input || {}),
    preferredCommunityId: safeStr(
      input?.preferredCommunityId ?? input?.preferred_community_id ?? ""
    ),
    preferredLanguage: firstTruthy(
      input?.preferredLanguage,
      input?.preferred_language,
      DEFAULT_SETTINGS.preferredLanguage
    ),
    preferredCurrency: firstTruthy(
      input?.preferredCurrency,
      input?.preferred_currency,
      DEFAULT_SETTINGS.preferredCurrency
    ),
    tonePreset: (firstTruthy(
      input?.tonePreset,
      input?.tone_preset,
      DEFAULT_SETTINGS.tonePreset
    ) || DEFAULT_SETTINGS.tonePreset) as ThemePreset,
    textSize: (firstTruthy(
      input?.textSize,
      input?.text_size,
      DEFAULT_SETTINGS.textSize
    ) || DEFAULT_SETTINGS.textSize) as SettingsState["textSize"],
    contrast: (firstTruthy(
      input?.contrast,
      DEFAULT_SETTINGS.contrast
    ) || DEFAULT_SETTINGS.contrast) as SettingsState["contrast"],
    motion: (firstTruthy(
      input?.motion,
      DEFAULT_SETTINGS.motion
    ) || DEFAULT_SETTINGS.motion) as SettingsState["motion"],
    density: (firstTruthy(
      input?.density,
      DEFAULT_SETTINGS.density
    ) || DEFAULT_SETTINGS.density) as SettingsState["density"],
    trustShareLevel: (firstTruthy(
      input?.trustShareLevel,
      input?.trust_share_level,
      DEFAULT_SETTINGS.trustShareLevel
    ) || DEFAULT_SETTINGS.trustShareLevel) as SettingsState["trustShareLevel"],
    preferredLandingTab: (firstTruthy(
      input?.preferredLandingTab,
      input?.preferred_landing_tab,
      DEFAULT_SETTINGS.preferredLandingTab
    ) || DEFAULT_SETTINGS.preferredLandingTab) as MemberTab,
    notificationsMode: (firstTruthy(
      input?.notificationsMode,
      input?.notifications_mode,
      DEFAULT_SETTINGS.notificationsMode
    ) || DEFAULT_SETTINGS.notificationsMode) as SettingsState["notificationsMode"],
    showPhonePublic: Boolean(
      input?.showPhonePublic ??
        input?.show_phone_public ??
        DEFAULT_SETTINGS.showPhonePublic
    ),
    showWhatsAppPublic: Boolean(
      input?.showWhatsAppPublic ??
        input?.show_whatsapp_public ??
        DEFAULT_SETTINGS.showWhatsAppPublic
    ),
    showTelegramPublic: Boolean(
      input?.showTelegramPublic ??
        input?.show_telegram_public ??
        DEFAULT_SETTINGS.showTelegramPublic
    ),
    showShopPublic: Boolean(
      input?.showShopPublic ??
        input?.show_shop_public ??
        DEFAULT_SETTINGS.showShopPublic
    ),
    quietNotifications: Boolean(
      input?.quietNotifications ??
        input?.quiet_notifications ??
        DEFAULT_SETTINGS.quietNotifications
    ),
    soundEnabled: Boolean(
      input?.soundEnabled ??
        input?.sound_enabled ??
        DEFAULT_SETTINGS.soundEnabled
    ),
    unreadFirst: Boolean(
      input?.unreadFirst ??
        input?.unread_first ??
        DEFAULT_SETTINGS.unreadFirst
    ),
    openActionsDirectly: Boolean(
      input?.openActionsDirectly ??
        input?.open_actions_directly ??
        DEFAULT_SETTINGS.openActionsDirectly
    ),
  };
}

function pageShell(
  bg = "#F4F8FC",
  pagePadding = "24px 18px 42px"
): React.CSSProperties {
  return {
    minHeight: "100vh",
    background: bg,
    padding: pagePadding,
    boxSizing: "border-box",
  };
}

function pageCard(bg = "#FFFFFF", padding = 22): React.CSSProperties {
  return {
    borderRadius: 26,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    boxShadow:
      "0 18px 44px rgba(15,23,42,0.05), 0 2px 10px rgba(15,23,42,0.02)",
    padding,
  };
}

function softPanel(bg = "#F8FBFF", padding = 18): React.CSSProperties {
  return {
    borderRadius: 20,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    padding,
  };
}

function innerCard(bg = "#FFFFFF", padding = 16): React.CSSProperties {
  return {
    borderRadius: 18,
    background: bg,
    border: "1px solid rgba(11,31,51,0.08)",
    padding,
  };
}

function chip(accent = "#0B63D1"): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 34,
    padding: "7px 12px",
    borderRadius: 999,
    background:
      accent === "#0B63D1"
        ? "rgba(11,99,209,0.08)"
        : accent === "#8A5A2B"
        ? "rgba(138,90,43,0.10)"
        : "rgba(15,118,110,0.10)",
    color: accent,
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.2,
  };
}

function utilityLink(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "9px 12px",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 800,
    border: "1px solid rgba(11,31,51,0.10)",
    fontSize: 14,
    whiteSpace: "nowrap",
  };
}

function primaryBtn(accent = "#0B63D1"): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    padding: "12px 16px",
    borderRadius: 16,
    background: accent,
    color: "#FFFFFF",
    textDecoration: "none",
    fontWeight: 900,
    border: "none",
    fontSize: 15,
    whiteSpace: "nowrap",
    cursor: "pointer",
  };
}

function secondaryBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    padding: "12px 16px",
    borderRadius: 16,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 800,
    border: "1px solid rgba(11,31,51,0.10)",
    fontSize: 15,
    whiteSpace: "nowrap",
    cursor: "pointer",
  };
}

function subtleBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "10px 14px",
    borderRadius: 14,
    background: "#F8FBFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 800,
    border: "1px solid rgba(11,31,51,0.10)",
    fontSize: 14,
    whiteSpace: "nowrap",
    cursor: "pointer",
  };
}

function backBtn(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "10px 14px",
    borderRadius: 12,
    background: "#FFFFFF",
    color: "#0B1F33",
    textDecoration: "none",
    fontWeight: 800,
    border: "1px solid rgba(11,31,51,0.10)",
    cursor: "pointer",
    fontSize: 14,
  };
}

function labelText(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 900,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  };
}

function fieldLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 900,
    letterSpacing: 0.28,
    textTransform: "uppercase",
  };
}

function valueBox(): React.CSSProperties {
  return {
    marginTop: 8,
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    padding: "12px 13px",
    color: "#0B1F33",
    fontSize: 14,
    lineHeight: 1.5,
  };
}

function selectStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 46,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    padding: "11px 12px",
    color: "#0B1F33",
    fontSize: 14,
    outline: "none",
  };
}

function bannerCard(tone: BannerTone): React.CSSProperties {
  return {
    ...softPanel(
      tone === "success" ? "#F3FBF5" : tone === "error" ? "#FEF2F2" : "#F8FBFF",
      14
    ),
    color:
      tone === "success" ? "#166534" : tone === "error" ? "#991B1B" : "#24415C",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : tone === "error"
        ? "1px solid rgba(239,68,68,0.16)"
        : "1px solid rgba(11,31,51,0.08)",
    fontWeight: 800,
  };
}

function getContinueTarget(
  isMemberRoute: boolean,
  signedIn: boolean,
  entryMode: EntryMode | null
): { label: string; to: string } {
  if (isMemberRoute || signedIn) {
    return {
      label: "Open Dashboard",
      to: "/app/dashboard",
    };
  }

  if (entryMode === "create") {
    return {
      label: "Continue to Create Entry",
      to: "/create",
    };
  }

  if (entryMode === "invite") {
    return {
      label: "Continue to Join Entry",
      to: "/join",
    };
  }

  if (entryMode === "approved") {
    return {
      label: "Continue to Activation",
      to: "/activate-membership",
    };
  }

  return {
    label: "Continue to Login",
    to: "/login",
  };
}

function getThemeFromPreset(preset: ThemePreset) {
  if (preset === "cooperative-warm") {
    return {
      accent: "#8A5A2B",
      page: "#F8F3ED",
      soft: "#FBF7F2",
      text: "#2F241A",
      subtext: "#6A5848",
      badgeBg: "rgba(138,90,43,0.10)",
      name: "Cooperative Warm",
    };
  }

  if (preset === "enterprise-green") {
    return {
      accent: "#0F766E",
      page: "#F2FAF8",
      soft: "#F4FBF9",
      text: "#102A27",
      subtext: "#4B6764",
      badgeBg: "rgba(15,118,110,0.10)",
      name: "Enterprise Green",
    };
  }

  return {
    accent: "#0B63D1",
    page: "#F4F8FC",
    soft: "#F8FBFF",
    text: "#0B1F33",
    subtext: "#4E657C",
    badgeBg: "rgba(11,99,209,0.08)",
    name: "Professional Blue",
  };
}

export default function MyGMFNAndIPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 920;
  });

  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [me, setMe] = useState<any>(null);
  const [myClans, setMyClans] = useState<any[]>([]);
  const [loadingMemberContext, setLoadingMemberContext] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState("");
  const [banner, setBanner] = useState<{
    tone: BannerTone;
    text: string;
  } | null>(null);

  const isMemberRoute = useMemo(
    () => location.pathname.startsWith("/app/"),
    [location.pathname]
  );

  const signedIn = useMemo(() => hasAccessToken(), []);
  const entryMode = useMemo(() => getEntryMode(), []);
  const continueTarget = useMemo(
    () => getContinueTarget(isMemberRoute, signedIn, entryMode),
    [isMemberRoute, signedIn, entryMode]
  );

  const activeTab = useMemo<MemberTab>(() => {
    if (!isMemberRoute) return "guide";
    const params = new URLSearchParams(location.search);
    return params.get("tab") === "settings" ? "settings" : "guide";
  }, [isMemberRoute, location.search]);

  const theme = useMemo(
    () => getThemeFromPreset(settings.tonePreset),
    [settings.tonePreset]
  );

  const pagePadding = useMemo(() => {
    const baseBottom = isMemberRoute && isCompact ? "140px" : "42px";

    if (settings.density === "compact") {
      return `18px 14px ${baseBottom}`;
    }

    return `24px 18px ${baseBottom}`;
  }, [settings.density, isMemberRoute, isCompact]);

  const sectionGap = settings.density === "compact" ? 14 : 18;
  const panelPadding = settings.density === "compact" ? 16 : 22;
  const innerPadding = settings.density === "compact" ? 12 : 16;

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 920);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!saveStatusText) return;

    const timer = window.setTimeout(() => {
      setSaveStatusText("");
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [saveStatusText]);

  useEffect(() => {
    if (!banner) return;

    const timer = window.setTimeout(() => {
      setBanner(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [banner]);

  useEffect(() => {
    if (!isMemberRoute) return;

    let alive = true;

    (async () => {
      setLoadingMemberContext(true);

      try {
        const [meRes, clansRes, settingsRes] = await Promise.all([
          getMe().catch(() => null),
          listMyClans().catch(() => ({ items: [] })),
          getMySettings().catch(() => DEFAULT_SETTINGS),
        ]);

        if (!alive) return;

        const clanRows = Array.isArray(clansRes)
          ? clansRes
          : Array.isArray(clansRes?.items)
          ? clansRes.items
          : [];

        const normalizedSettings = normalizeSettingsPayload(settingsRes);

        setMe(meRes || null);
        setMyClans(clanRows);
        setSettings(normalizedSettings);
        emitVisualSettingsUpdated(normalizedSettings);
        emitCompanionSettingsUpdated(normalizedSettings);
      } finally {
        if (alive) {
          setLoadingMemberContext(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [isMemberRoute]);

  async function updateSettingsField<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) {
    const previous = settings;
    const next = normalizeSettingsPayload({
      ...settings,
      [key]: value,
    });

    setSettings(next);
    emitVisualSettingsUpdated(next);
    emitCompanionSettingsUpdated(next);
    setSaveStatusText("Saving...");

    if (!isMemberRoute) {
      setSaveStatusText("Saved.");
      return;
    }

    try {
      const saved = await updateMySettings({
        [key]: value,
      } as Partial<SettingsState>);

      const normalizedSaved = normalizeSettingsPayload(saved);
      setSettings(normalizedSaved);
      emitVisualSettingsUpdated(normalizedSaved);
      emitCompanionSettingsUpdated(normalizedSaved);
      setSaveStatusText("Saved.");
    } catch {
      setSettings(previous);
      emitVisualSettingsUpdated(previous);
      emitCompanionSettingsUpdated(previous);
      setSaveStatusText("Save failed.");
    }
  }

  function goBackPublic() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/welcome");
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  async function handleResetSettings() {
    setSaveStatusText("Resetting...");

    try {
      const saved = await resetMySettings();
      const normalizedSaved = normalizeSettingsPayload(saved);
      setSettings(normalizedSaved);
      emitVisualSettingsUpdated(normalizedSaved);
      emitCompanionSettingsUpdated(normalizedSaved);
      setSaveStatusText("Settings reset.");
    } catch {
      setSettings(DEFAULT_SETTINGS);
      emitVisualSettingsUpdated(DEFAULT_SETTINGS);
      emitCompanionSettingsUpdated(DEFAULT_SETTINGS);
      setSaveStatusText("Settings reset.");
    }
  }

  async function openPdfFallback() {
    try {
      const pdfUrl =
        typeof window !== "undefined"
          ? new URL(PDF_FALLBACK_TO, window.location.origin).toString()
          : PDF_FALLBACK_TO;

      const res = await fetch(pdfUrl, {
        method: "HEAD",
        cache: "no-store",
      }).catch(() => null);

      if (!res || res.ok || res.status === 405) {
        window.open(pdfUrl, "_blank", "noopener,noreferrer");
        return;
      }

      navigate(isMemberRoute ? "/app/my-gmfn-and-i" : "/guide");
      setBanner({
        tone: "info",
        text: "PDF fallback is not available yet. Guide opened instead.",
      });
    } catch {
      navigate(isMemberRoute ? "/app/my-gmfn-and-i" : "/guide");
      setBanner({
        tone: "info",
        text: "PDF fallback is not available yet. Guide opened instead.",
      });
    }
  }

  function openGuide() {
    navigate("/app/my-gmfn-and-i");
  }

  function copyGmfnId() {
    safeCopy(gmfnId);
    setBanner({
      tone: "success",
      text: "GMFN ID copied.",
    });
  }

  const memberGuideTo = "/app/my-gmfn-and-i";
  const memberSettingsTo = "/app/my-gmfn-and-i?tab=settings";

  const gmfnId = firstTruthy(me?.gmfn_id, "Pending");
  const displayName = firstTruthy(
    me?.display_name,
    me?.nickname,
    [safeStr(me?.first_name), safeStr(me?.surname)].filter(Boolean).join(" "),
    me?.email,
    "Member"
  );
  const businessName = firstTruthy(
    me?.business_name,
    me?.shop_name,
    me?.marketplace_name,
    "Not available yet"
  );
  const phoneNumber = firstTruthy(me?.phone_e164, me?.phone, "Not available yet");
  const whatsappNumber = firstTruthy(
    me?.whatsapp_number,
    me?.phone_whatsapp,
    "Not available yet"
  );
  const telegramHandle = firstTruthy(
    me?.telegram_handle,
    me?.telegram_username,
    "Not available yet"
  );
  const emailAddress = firstTruthy(me?.email, "Not available yet");
  const country = firstTruthy(me?.country, me?.country_name, "Not available yet");

  const selectedClanIdFromStorage = String(getSelectedClanId() || "").trim();

  const communityOptions = useMemo(() => {
    return myClans.map((row) => {
      const id = String(row?.id || row?.clan_id || "").trim();
      const name = firstTruthy(row?.name, row?.clan_name, `Community ${id}`);
      return { id, name };
    });
  }, [myClans]);

  const currentPreferredCommunityLabel = useMemo(() => {
    const match = communityOptions.find(
      (item) => item.id === settings.preferredCommunityId
    );
    if (match) return match.name;

    if (!settings.preferredCommunityId && selectedClanIdFromStorage) {
      const selectedMatch = communityOptions.find(
        (item) => item.id === selectedClanIdFromStorage
      );
      return selectedMatch?.name || "Current selected community";
    }

    return "Current selected community";
  }, [communityOptions, settings.preferredCommunityId, selectedClanIdFromStorage]);

  const previewSummary = [
    theme.name,
    settings.textSize === "large" ? "Large text" : "Standard text",
    settings.contrast === "high" ? "High contrast" : "Standard contrast",
    settings.notificationsMode === "detailed"
      ? "Detailed notifications"
      : "Summary notifications",
  ];

  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 14,
    color: active ? "#FFFFFF" : theme.text,
    background: active ? theme.accent : "#FFFFFF",
    border: active
      ? "1px solid transparent"
      : "1px solid rgba(11,31,51,0.10)",
    whiteSpace: "nowrap",
  });

  const optionButtonStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "10px 12px",
    borderRadius: 12,
    border: active
      ? `1px solid ${theme.accent}`
      : "1px solid rgba(11,31,51,0.10)",
    background: active ? theme.badgeBg : "#FFFFFF",
    color: active ? theme.accent : theme.text,
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
  });

  const toggleButtonStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 86,
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: active
      ? `1px solid ${theme.accent}`
      : "1px solid rgba(11,31,51,0.10)",
    background: active ? theme.badgeBg : "#FFFFFF",
    color: active ? theme.accent : theme.text,
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
  });

  return (
    <div
      style={{
        ...pageShell(
          activeTab === "settings" ? theme.page : "#F4F8FC",
          pagePadding
        ),
      }}
    >
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        {isMemberRoute ? (
          <PageTopNav
            sectionLabel={activeTab === "settings" ? "Settings" : "Guide"}
            title={activeTab === "settings" ? "Settings" : "My GMFN and I"}
            subtitle={
              activeTab === "settings"
                ? "Workspace preferences, visibility controls, readability choices, contact visibility, and account utilities."
                : "A plain-language guide to identity, trust, community, demand, shop, entry flow, and the concrete things GMFN can do for you."
            }
            homeTo="/app/dashboard"
            homeLabel="Dashboard"
            backTo="/app/dashboard"
            nextLinks={[
              { label: "Trust", to: "/app/trust" },
              { label: "Community", to: "/app/community" },
              { label: "Marketplace", to: "/app/marketplace" },
            ]}
            utilityLinks={[
              { label: "Notifications", to: "/app/notifications" },
            ]}
          />
        ) : (
          <div
            style={{
              marginBottom: 14,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button type="button" onClick={goBackPublic} style={backBtn()}>
              ← Back
            </button>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link to="/cover" style={utilityLink()}>
                Cover
              </Link>
              <Link to="/welcome" style={utilityLink()}>
                Welcome
              </Link>
              <Link to={continueTarget.to} style={utilityLink()}>
                {continueTarget.label}
              </Link>
            </div>
          </div>
        )}

        {banner ? (
          <div style={{ marginTop: 16, ...bannerCard(banner.tone) }}>
            {banner.text}
          </div>
        ) : null}

        {isMemberRoute ? (
          <section
            style={{
              ...pageCard("#FFFFFF", 16),
              marginTop: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={labelText()}>Inside My GMFN and I</div>
                <div
                  style={{
                    marginTop: 8,
                    color: theme.text,
                    fontSize: 18,
                    fontWeight: 900,
                  }}
                >
                  Guide and Settings
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link
                  to={memberGuideTo}
                  style={tabButtonStyle(activeTab === "guide")}
                >
                  Guide
                </Link>
                <Link
                  to={memberSettingsTo}
                  style={tabButtonStyle(activeTab === "settings")}
                >
                  Settings
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {isMemberRoute && activeTab === "settings" ? (
          <>
            <section
              style={{
                ...pageCard(
                  `linear-gradient(180deg, ${theme.soft} 0%, #FFFFFF 100%)`,
                  panelPadding
                ),
                marginTop: sectionGap,
              }}
            >
              <div style={labelText()}>Workspace settings</div>

              <div style={{ marginTop: 12 }}>
                <span style={chip(theme.accent)}>Settings</span>
              </div>

              <h1
                style={{
                  margin: "14px 0 0",
                  fontSize: isCompact ? 30 : 42,
                  lineHeight: 1.08,
                  fontWeight: 900,
                  color: theme.text,
                  maxWidth: 860,
                }}
              >
                Calm, controlled settings for readability, visibility, tone, and
                personal workspace preference.
              </h1>

              <p
                style={{
                  margin: "14px 0 0",
                  fontSize: 16,
                  lineHeight: 1.82,
                  color: theme.subtext,
                  maxWidth: 920,
                }}
              >
                Settings are for personal preference, readability, visibility,
                notification behavior, and account utilities. They do not change
                protocol rules, trust rules, or community governance.
              </p>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {previewSummary.map((item) => (
                  <span
                    key={item}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 32,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: theme.badgeBg,
                      color: theme.accent,
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {item}
                  </span>
                ))}

                {saveStatusText ? (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      minHeight: 32,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background:
                        saveStatusText === "Save failed."
                          ? "#FEF2F2"
                          : "#EAF7EE",
                      color:
                        saveStatusText === "Save failed."
                          ? "#991B1B"
                          : "#166534",
                      fontSize: 12,
                      fontWeight: 900,
                    }}
                  >
                    {saveStatusText}
                  </span>
                ) : null}
              </div>
            </section>

            <section
              style={{
                marginTop: sectionGap,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
                gap: sectionGap,
                alignItems: "start",
              }}
            >
              <div style={pageCard("#FFFFFF", panelPadding)}>
                <div style={labelText()}>Appearance and tone</div>

                <div
                  style={{
                    marginTop: 12,
                    color: theme.text,
                    fontSize: 28,
                    fontWeight: 900,
                    lineHeight: 1.15,
                  }}
                >
                  Choose a controlled workspace tone
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: theme.subtext,
                    fontSize: 15,
                    lineHeight: 1.8,
                    maxWidth: 840,
                  }}
                >
                  Use one of the approved institutional presets. No free color
                  picker. The goal is calm readability across different user
                  groups and literacy levels.
                </div>

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
                  {[
                    {
                      key: "professional-blue" as ThemePreset,
                      title: "Professional Blue",
                      text: "Calm institutional default for broad mixed use.",
                      accent: "#0B63D1",
                      bg: "#F8FBFF",
                    },
                    {
                      key: "cooperative-warm" as ThemePreset,
                      title: "Cooperative Warm",
                      text: "Softer warm tone for relational, community-led work.",
                      accent: "#8A5A2B",
                      bg: "#FBF7F2",
                    },
                    {
                      key: "enterprise-green" as ThemePreset,
                      title: "Enterprise Green",
                      text: "Structured green tone for business and operational use.",
                      accent: "#0F766E",
                      bg: "#F4FBF9",
                    },
                  ].map((item) => {
                    const active = settings.tonePreset === item.key;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          void updateSettingsField("tonePreset", item.key)
                        }
                        style={{
                          ...innerCard(item.bg, innerPadding),
                          textAlign: "left",
                          cursor: "pointer",
                          border: active
                            ? `1px solid ${item.accent}`
                            : "1px solid rgba(11,31,51,0.08)",
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 12,
                            borderRadius: 999,
                            background: item.accent,
                          }}
                        />

                        <div
                          style={{
                            marginTop: 12,
                            color: "#0B1F33",
                            fontWeight: 900,
                            fontSize: 16,
                          }}
                        >
                          {item.title}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            color: "#5E7288",
                            fontSize: 14,
                            lineHeight: 1.75,
                          }}
                        >
                          {item.text}
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              minHeight: 30,
                              padding: "6px 10px",
                              borderRadius: 999,
                              background: active
                                ? "rgba(11,31,51,0.06)"
                                : "#FFFFFF",
                              color: active ? item.accent : "#51657A",
                              fontSize: 12,
                              fontWeight: 900,
                            }}
                          >
                            {active ? "Active" : "Choose"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div style={{ marginTop: 18 }}>
                  <CompanionSettingsPanel />
                </div>

                <div
                  style={{
                    marginTop: 18,
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "repeat(2, minmax(0, 1fr))",
                    gap: 14,
                  }}
                >
                  <div style={softPanel(theme.soft, innerPadding)}>
                    <div style={fieldLabel()}>Text size</div>
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          void updateSettingsField("textSize", "standard")
                        }
                        style={optionButtonStyle(
                          settings.textSize === "standard"
                        )}
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void updateSettingsField("textSize", "large")
                        }
                        style={optionButtonStyle(settings.textSize === "large")}
                      >
                        Large
                      </button>
                    </div>
                  </div>

                  <div style={softPanel(theme.soft, innerPadding)}>
                    <div style={fieldLabel()}>Contrast</div>
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          void updateSettingsField("contrast", "standard")
                        }
                        style={optionButtonStyle(
                          settings.contrast === "standard"
                        )}
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void updateSettingsField("contrast", "high")
                        }
                        style={optionButtonStyle(settings.contrast === "high")}
                      >
                        High
                      </button>
                    </div>
                  </div>

                  <div style={softPanel(theme.soft, innerPadding)}>
                    <div style={fieldLabel()}>Motion</div>
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          void updateSettingsField("motion", "normal")
                        }
                        style={optionButtonStyle(settings.motion === "normal")}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void updateSettingsField("motion", "reduced")
                        }
                        style={optionButtonStyle(settings.motion === "reduced")}
                      >
                        Reduced
                      </button>
                    </div>
                  </div>

                  <div style={softPanel(theme.soft, innerPadding)}>
                    <div style={fieldLabel()}>Spacing density</div>
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          void updateSettingsField("density", "comfortable")
                        }
                        style={optionButtonStyle(
                          settings.density === "comfortable"
                        )}
                      >
                        Comfortable
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void updateSettingsField("density", "compact")
                        }
                        style={optionButtonStyle(
                          settings.density === "compact"
                        )}
                      >
                        Compact
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={pageCard("#FFFFFF", panelPadding)}>
                <div style={labelText()}>Current identity snapshot</div>

                {loadingMemberContext ? (
                  <div
                    style={{
                      marginTop: 14,
                      color: theme.subtext,
                      fontSize: 14,
                      lineHeight: 1.75,
                    }}
                  >
                    Loading your current member context...
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 14,
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <div style={softPanel(theme.soft, innerPadding)}>
                      <div style={fieldLabel()}>Display name</div>
                      <div style={valueBox()}>{displayName}</div>
                    </div>

                    <div style={softPanel(theme.soft, innerPadding)}>
                      <div style={fieldLabel()}>GMFN ID</div>
                      <div style={valueBox()}>{gmfnId}</div>
                    </div>

                    <div style={softPanel(theme.soft, innerPadding)}>
                      <div style={fieldLabel()}>Business name</div>
                      <div style={valueBox()}>{businessName}</div>
                    </div>

                    <div style={softPanel(theme.soft, innerPadding)}>
                      <div style={fieldLabel()}>Email</div>
                      <div style={valueBox()}>{emailAddress}</div>
                    </div>

                    <div style={softPanel(theme.soft, innerPadding)}>
                      <div style={fieldLabel()}>Phone</div>
                      <div style={valueBox()}>{phoneNumber}</div>
                    </div>

                    <div style={softPanel(theme.soft, innerPadding)}>
                      <div style={fieldLabel()}>WhatsApp</div>
                      <div style={valueBox()}>{whatsappNumber}</div>
                    </div>

                    <div style={softPanel(theme.soft, innerPadding)}>
                      <div style={fieldLabel()}>Telegram</div>
                      <div style={valueBox()}>{telegramHandle}</div>
                    </div>

                    <div style={softPanel(theme.soft, innerPadding)}>
                      <div style={fieldLabel()}>Country</div>
                      <div style={valueBox()}>{country}</div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section
              style={{
                marginTop: sectionGap,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: sectionGap,
                alignItems: "start",
              }}
            >
              <div style={pageCard("#FFFFFF", panelPadding)}>
                <div style={labelText()}>Visibility and privacy</div>

                <div
                  style={{
                    marginTop: 12,
                    color: theme.text,
                    fontSize: 26,
                    fontWeight: 900,
                    lineHeight: 1.16,
                  }}
                >
                  Control what is visibly shared
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: theme.subtext,
                    fontSize: 15,
                    lineHeight: 1.8,
                  }}
                >
                  These controls are for display and sharing preference. They do
                  not alter protocol rules or trust computation.
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {[
                    {
                      key: "showPhonePublic" as const,
                      label: "Show phone publicly",
                    },
                    {
                      key: "showWhatsAppPublic" as const,
                      label: "Show WhatsApp publicly",
                    },
                    {
                      key: "showTelegramPublic" as const,
                      label: "Show Telegram publicly",
                    },
                    {
                      key: "showShopPublic" as const,
                      label: "Show shop publicly where allowed",
                    },
                  ].map((item) => (
                    <div key={item.key} style={softPanel(theme.soft, innerPadding)}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            color: theme.text,
                            fontSize: 15,
                            fontWeight: 800,
                          }}
                        >
                          {item.label}
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() =>
                              void updateSettingsField(item.key, true as any)
                            }
                            style={toggleButtonStyle(
                              settings[item.key] === true
                            )}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void updateSettingsField(item.key, false as any)
                            }
                            style={toggleButtonStyle(
                              settings[item.key] === false
                            )}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={softPanel(theme.soft, innerPadding)}>
                    <div style={fieldLabel()}>Trust sharing level</div>
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          void updateSettingsField("trustShareLevel", "minimal")
                        }
                        style={optionButtonStyle(
                          settings.trustShareLevel === "minimal"
                        )}
                      >
                        Minimal
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void updateSettingsField("trustShareLevel", "standard")
                        }
                        style={optionButtonStyle(
                          settings.trustShareLevel === "standard"
                        )}
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void updateSettingsField("trustShareLevel", "detailed")
                        }
                        style={optionButtonStyle(
                          settings.trustShareLevel === "detailed"
                        )}
                      >
                        Detailed
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div style={pageCard("#FFFFFF", panelPadding)}>
                <div style={labelText()}>Working defaults</div>

                <div
                  style={{
                    marginTop: 12,
                    color: theme.text,
                    fontSize: 26,
                    fontWeight: 900,
                    lineHeight: 1.16,
                  }}
                >
                  Save your normal working preference
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: theme.subtext,
                    fontSize: 15,
                    lineHeight: 1.8,
                  }}
                >
                  These defaults help the workspace feel familiar and calmer.
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gap: 14,
                  }}
                >
                  <div style={softPanel(theme.soft, innerPadding)}>
                    <div style={fieldLabel()}>Preferred default community</div>
                    <select
                      value={settings.preferredCommunityId}
                      onChange={(e) =>
                        void updateSettingsField(
                          "preferredCommunityId",
                          e.target.value
                        )
                      }
                      style={{ ...selectStyle(), marginTop: 8 }}
                    >
                      <option value="">
                        {communityOptions.length > 0
                          ? "Use current selected community"
                          : "No community loaded yet"}
                      </option>
                      {communityOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                    <div
                      style={{
                        marginTop: 8,
                        color: theme.subtext,
                        fontSize: 13,
                        lineHeight: 1.7,
                      }}
                    >
                      Current preferred community: {currentPreferredCommunityLabel}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "repeat(2, minmax(0, 1fr))",
                      gap: 14,
                    }}
                  >
                    <div style={softPanel(theme.soft, innerPadding)}>
                      <div style={fieldLabel()}>Preferred language</div>
                      <select
                        value={settings.preferredLanguage}
                        onChange={(e) =>
                          void updateSettingsField(
                            "preferredLanguage",
                            e.target.value
                          )
                        }
                        style={{ ...selectStyle(), marginTop: 8 }}
                      >
                        <option>English</option>
                        <option>French</option>
                        <option>Arabic</option>
                        <option>Portuguese</option>
                      </select>
                    </div>

                    <div style={softPanel(theme.soft, innerPadding)}>
                      <div style={fieldLabel()}>Preferred currency</div>
                      <select
                        value={settings.preferredCurrency}
                        onChange={(e) =>
                          void updateSettingsField(
                            "preferredCurrency",
                            e.target.value
                          )
                        }
                        style={{ ...selectStyle(), marginTop: 8 }}
                      >
                        <option>NGN</option>
                        <option>USD</option>
                        <option>GBP</option>
                        <option>EUR</option>
                      </select>
                    </div>

                    <div style={softPanel(theme.soft, innerPadding)}>
                      <div style={fieldLabel()}>
                        Preferred landing tab inside My GMFN and I
                      </div>
                      <select
                        value={settings.preferredLandingTab}
                        onChange={(e) =>
                          void updateSettingsField(
                            "preferredLandingTab",
                            e.target.value as MemberTab
                          )
                        }
                        style={{ ...selectStyle(), marginTop: 8 }}
                      >
                        <option value="guide">Guide</option>
                        <option value="settings">Settings</option>
                      </select>
                    </div>

                    <div style={softPanel(theme.soft, innerPadding)}>
                      <div style={fieldLabel()}>Notification detail</div>
                      <select
                        value={settings.notificationsMode}
                        onChange={(e) =>
                          void updateSettingsField(
                            "notificationsMode",
                            e.target.value as "summary" | "detailed"
                          )
                        }
                        style={{ ...selectStyle(), marginTop: 8 }}
                      >
                        <option value="summary">Summary</option>
                        <option value="detailed">Detailed</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              style={{
                marginTop: sectionGap,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "minmax(0, 1fr) minmax(0, 1fr)",
                gap: sectionGap,
                alignItems: "start",
              }}
            >
              <div style={pageCard("#FFFFFF", panelPadding)}>
                <div style={labelText()}>Notifications and calm mode</div>

                <div
                  style={{
                    marginTop: 12,
                    color: theme.text,
                    fontSize: 26,
                    fontWeight: 900,
                    lineHeight: 1.16,
                  }}
                >
                  Choose how the app speaks back to you
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: theme.subtext,
                    fontSize: 15,
                    lineHeight: 1.8,
                  }}
                >
                  These settings reduce noise and make response handling clearer.
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {[
                    {
                      key: "quietNotifications" as const,
                      label: "Quiet notifications",
                    },
                    {
                      key: "soundEnabled" as const,
                      label: "Sound enabled",
                    },
                    {
                      key: "unreadFirst" as const,
                      label: "Show unread summary first",
                    },
                    {
                      key: "openActionsDirectly" as const,
                      label: "Open action pages directly from notifications",
                    },
                  ].map((item) => (
                    <div key={item.key} style={softPanel(theme.soft, innerPadding)}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            color: theme.text,
                            fontSize: 15,
                            fontWeight: 800,
                            maxWidth: 520,
                          }}
                        >
                          {item.label}
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() =>
                              void updateSettingsField(item.key, true as any)
                            }
                            style={toggleButtonStyle(
                              settings[item.key] === true
                            )}
                          >
                            On
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void updateSettingsField(item.key, false as any)
                            }
                            style={toggleButtonStyle(
                              settings[item.key] === false
                            )}
                          >
                            Off
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={pageCard("#FFFFFF", panelPadding)}>
                <div style={labelText()}>Account utilities</div>

                <div
                  style={{
                    marginTop: 12,
                    color: theme.text,
                    fontSize: 26,
                    fontWeight: 900,
                    lineHeight: 1.16,
                  }}
                >
                  Quick actions
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: theme.subtext,
                    fontSize: 15,
                    lineHeight: 1.8,
                  }}
                >
                  These actions help with copying identity, moving back to the
                  guide, resetting settings, and leaving the session.
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={copyGmfnId}
                    style={secondaryBtn()}
                  >
                    Copy GMFN ID
                  </button>

                  <button
                    type="button"
                    onClick={openGuide}
                    style={secondaryBtn()}
                  >
                    Open Guide
                  </button>

                  <button
                    type="button"
                    onClick={() => void openPdfFallback()}
                    style={secondaryBtn()}
                  >
                    Open PDF fallback
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleResetSettings()}
                    style={subtleBtn()}
                  >
                    Reset settings
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={primaryBtn(theme.accent)}
                  >
                    Logout
                  </button>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section
              style={{
                ...pageCard(
                  "linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)",
                  panelPadding
                ),
                marginTop: isMemberRoute ? sectionGap : 0,
              }}
            >
              <div style={labelText()}>
                {isMemberRoute ? "Member guide" : "Public guide"}
              </div>

              <div style={{ marginTop: 12 }}>
                <span style={chip()}>My GMFN and I</span>
              </div>

              <h1
                style={{
                  margin: "14px 0 0",
                  fontSize: isCompact ? 32 : 46,
                  lineHeight: 1.06,
                  fontWeight: 900,
                  color: "#0B1F33",
                  maxWidth: 860,
                }}
              >
                A calmer explanation of what the system is doing, what it can do
                for you, and where you fit into it.
              </h1>

              <p
                style={{
                  margin: "14px 0 0",
                  fontSize: 17,
                  lineHeight: 1.82,
                  color: "#35516B",
                  maxWidth: 920,
                }}
              >
                This page is for people who need plain language, guided
                movement, and lower cognitive burden. It now does two things
                together: it explains the system, and it clearly shows the
                practical things GMFN can do for you.
              </p>

              <div
                style={{
                  marginTop: 20,
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <Link to={continueTarget.to} style={primaryBtn()}>
                  {continueTarget.label}
                </Link>

                <button
                  type="button"
                  onClick={() => void openPdfFallback()}
                  style={secondaryBtn()}
                >
                  Open PDF fallback
                </button>
              </div>
            </section>

            <section
              style={{
                marginTop: sectionGap,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "minmax(0, 1.18fr) minmax(320px, 0.82fr)",
                gap: sectionGap,
                alignItems: "start",
              }}
            >
              <div style={pageCard("#FFFFFF", panelPadding)}>
                <div style={labelText()}>The core idea</div>

                <div
                  style={{
                    marginTop: 12,
                    color: "#0B1F33",
                    fontSize: isCompact ? 25 : 32,
                    fontWeight: 900,
                    lineHeight: 1.15,
                    maxWidth: 820,
                  }}
                >
                  The system is trying to make real trust easier to see, easier
                  to understand, and easier to use.
                </div>

                <div
                  style={{
                    marginTop: 12,
                    color: "#5E7288",
                    fontSize: 15,
                    lineHeight: 1.85,
                    maxWidth: 900,
                  }}
                >
                  Many people already move through life using trust,
                  relationships, reputation, and community knowledge. GMFN / GSN
                  does not try to replace that reality. It tries to structure it
                  better so that people can move with more clarity, less
                  confusion, and more practical confidence.
                </div>

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
                  <div style={innerCard("#F8FBFF", innerPadding)}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 16,
                      }}
                    >
                      Plain language
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#5E7288",
                        fontSize: 14,
                        lineHeight: 1.75,
                      }}
                    >
                      The experience should explain itself clearly instead of
                      sounding technical or abstract.
                    </div>
                  </div>

                  <div style={innerCard("#F8FBFF", innerPadding)}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 16,
                      }}
                    >
                      Guided movement
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#5E7288",
                        fontSize: 14,
                        lineHeight: 1.75,
                      }}
                    >
                      A person should know where to go next without being forced
                      to interpret too many choices at once.
                    </div>
                  </div>

                  <div style={innerCard("#F8FBFF", innerPadding)}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 16,
                      }}
                    >
                      Institutional calm
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#5E7288",
                        fontSize: 14,
                        lineHeight: 1.75,
                      }}
                    >
                      The system should feel trustworthy, ordered, and safe for
                      unbanked and underbanked users.
                    </div>
                  </div>
                </div>
              </div>

              <div style={pageCard("#F8FBFF", panelPadding)}>
                <div style={labelText()}>How to use this page</div>

                <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                  <div style={softPanel("#FFFFFF", innerPadding)}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 15,
                        fontWeight: 900,
                      }}
                    >
                      First
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#5E7288",
                        fontSize: 14,
                        lineHeight: 1.75,
                      }}
                    >
                      Read the fixed rules so you understand what does not
                      change in the system.
                    </div>
                  </div>

                  <div style={softPanel("#FFFFFF", innerPadding)}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 15,
                        fontWeight: 900,
                      }}
                    >
                      Then
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#5E7288",
                        fontSize: 14,
                        lineHeight: 1.75,
                      }}
                    >
                      Read the 21 practical things GMFN can do for you.
                    </div>
                  </div>

                  <div style={softPanel("#FFFFFF", innerPadding)}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 15,
                        fontWeight: 900,
                      }}
                    >
                      After that
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#5E7288",
                        fontSize: 14,
                        lineHeight: 1.75,
                      }}
                    >
                      Continue using the route that matches your real stage in
                      the system.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              style={{
                marginTop: sectionGap,
                ...pageCard("#FFFFFF", panelPadding),
              }}
            >
              <div style={labelText()}>What stays fixed</div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                {FIXED_RULES.map((item) => (
                  <div key={item.title} style={innerCard("#FCFEFF", innerPadding)}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 16,
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        color: "#5E7288",
                        fontSize: 14,
                        lineHeight: 1.75,
                      }}
                    >
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              style={{
                marginTop: sectionGap,
                ...pageCard("#FFFFFF", panelPadding),
              }}
            >
              <div style={labelText()}>21 things GMFN can do for you</div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                {GMFN_21_THINGS.map((item) => (
                  <div key={item.no} style={innerCard("#FCFEFF", innerPadding)}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 34,
                        height: 34,
                        borderRadius: 999,
                        background: "rgba(11,99,209,0.08)",
                        color: "#0B63D1",
                        fontWeight: 900,
                        fontSize: 13,
                      }}
                    >
                      {item.no}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        color: "#0B1F33",
                        fontSize: 16,
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        color: "#5E7288",
                        fontSize: 14,
                        lineHeight: 1.75,
                      }}
                    >
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              style={{
                marginTop: sectionGap,
                ...pageCard("#FFFFFF", panelPadding),
              }}
            >
              <div style={labelText()}>How to read the system</div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                {READING_BLOCKS.map((item) => (
                  <div key={item.title} style={innerCard("#FFFFFF", innerPadding)}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 16,
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        color: "#5E7288",
                        fontSize: 14,
                        lineHeight: 1.75,
                      }}
                    >
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              style={{
                marginTop: sectionGap,
                ...pageCard("#F8FBFF", panelPadding),
              }}
            >
              <div style={labelText()}>Entry map</div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                {ENTRY_PATHS.map((item) => (
                  <div key={item.title} style={innerCard("#FFFFFF", innerPadding)}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 16,
                        lineHeight: 1.35,
                      }}
                    >
                      {item.title}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        color: "#5E7288",
                        fontSize: 14,
                        lineHeight: 1.75,
                      }}
                    >
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              style={{
                marginTop: sectionGap,
                ...pageCard(
                  "linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)",
                  panelPadding
                ),
              }}
            >
              <div style={labelText()}>Continue</div>

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: isCompact ? 26 : 34,
                  fontWeight: 900,
                  lineHeight: 1.12,
                  maxWidth: 760,
                }}
              >
                Move forward using the route that matches your real stage.
              </div>

              <div
                style={{
                  marginTop: 12,
                  color: "#5E7288",
                  fontSize: 15,
                  lineHeight: 1.8,
                  maxWidth: 860,
                }}
              >
                This guide should reduce confusion, not create more of it. Once
                you understand the main idea and the practical benefits,
                continue to the correct next step.
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <Link to={continueTarget.to} style={primaryBtn()}>
                  {continueTarget.label}
                </Link>

                {isMemberRoute ? (
                  <Link to="/app/dashboard" style={secondaryBtn()}>
                    Back to Dashboard
                  </Link>
                ) : (
                  <Link to="/welcome" style={secondaryBtn()}>
                    Back to Welcome
                  </Link>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}