import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getCommunityJoinRequests,
  getCurrentClan,
  getDailyInsight,
  getMarketplaceBroadcasts,
  getMe,
  getMyNotifications,
  getMyTrustSlip,
  getSelectedClanId,
  listMarketplaceRequests,
} from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceNotice,
  type GuidanceSnapshot,
} from "../lib/guidance";
import {
  getSmartMarketWisdomPair,
  type MarketWisdomPair,
} from "../lib/marketWisdom";

type SpotlightItem = {
  id?: number;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  image_url?: string | null;
  image?: string | null;
  source_shop_name?: string | null;
  source_clan_name?: string | null;
  source_clan_id?: number | string | null;
  source_marketplace_id?: number | string | null;
  clan_id?: number | string | null;
  marketplace_id?: number | string | null;
  author_name?: string | null;
  author_gmfn_id?: string | null;
  trust_band?: string | null;
  trust_score?: number | string | null;
  created_at?: string | null;
};

type JoinRequestItem = {
  id?: number;
  clan_id?: number;
  clan_name?: string | null;
  applicant_email?: string | null;
  status?: string | null;
  approvals?: number;
  required_approvals?: number;
};

type DemandItem = {
  id?: number;
  title?: string;
  description?: string | null;
  status?: string;
  urgency?: string | null;
  requester_name?: string | null;
  requester_nickname?: string | null;
  requester_email?: string | null;
  requester_gmfn_id?: string | null;
  created_at?: string | null;
  allow_trust_credit?: boolean;
};

type NoticeItem = {
  id?: number;
  kind?: string;
  title?: string;
  message?: string;
  action_url?: string | null;
  action_label?: string | null;
  is_read?: boolean;
  created_at?: string | null;
};

type ReadingState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
  whyText: string;
};

type GuidancePulse = {
  severity: "normal" | "important" | "urgent";
  title: string;
  body: string;
  nowLine: string;
  nextLine: string;
  wisdomLine: string;
  ctaTo: string;
  ctaLabel: string;
};

type DashboardUIState = {
  spotlightMinimized: boolean;
  demandExpanded: boolean;
  routesExpanded: boolean;
  inboxExpanded: boolean;
  trustExpanded: boolean;
};

const DASHBOARD_UI_STORAGE_KEY = "gmfn.dashboard.ui.v1";
const DASHBOARD_AVATAR_STORAGE_KEY = "gmfn.member.avatar";

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.07)",
    background: bg,
    padding: 16,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function statTile(
  bg = "#FFFFFF",
  border = "1px solid rgba(11,31,51,0.08)"
): React.CSSProperties {
  return {
    borderRadius: 16,
    border,
    background: bg,
    padding: 14,
  };
}

function routeTile(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 88,
    borderRadius: 16,
    border: primary
      ? "1px solid rgba(11,99,209,0.18)"
      : "1px solid rgba(11,31,51,0.08)",
    background: primary ? "#F7FAFF" : "#FFFFFF",
    padding: 14,
    textDecoration: "none",
    boxShadow: primary ? "0 8px 20px rgba(11,99,209,0.05)" : "none",
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "none",
    background: disabled ? "#CBD5E1" : "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 900,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.85 : 1,
    whiteSpace: "nowrap",
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  };
}

function subtleBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#F8FBFF",
    color: disabled ? "#94A3B8" : "#24415C",
    fontWeight: 800,
    fontSize: 13,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function firstNonEmpty(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function firstNumberLike(...values: any[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === "") {
      continue;
    }
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }
  return null;
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function readStoredImage(key: string): string {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function initialsFromName(name: string): string {
  const parts = safeStr(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";
  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "http://127.0.0.1:8012";
    }
  }

  return "http://127.0.0.1:8012";
}

function resolveSpotlightImageSrc(src: string): string {
  const raw = safeStr(src);
  if (!raw) return "";
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }
  if (raw.startsWith("/")) {
    return `${apiOrigin()}${raw}`;
  }
  return `${apiOrigin()}/${raw.replace(/^\/+/, "")}`;
}

function resolveUserName(me: any): string {
  const direct =
    safeStr(me?.display_name) ||
    safeStr(me?.nickname) ||
    safeStr(me?.name) ||
    safeStr(me?.first_name);

  if (direct) return direct;

  const email = safeStr(me?.email);
  if (email.includes("@")) {
    return email.split("@")[0] || "Member";
  }

  return email || "Member";
}

function resolveUserSecondary(me: any): string {
  return safeStr(me?.email || me?.phone_e164 || "");
}

function currentCommunityName(currentClan: any, selectedClanId: number): string {
  return (
    firstNonEmpty(
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name,
      currentClan?.title
    ) || (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
  );
}

function getCciState(me: any): ReadingState {
  const rawScore =
    me?.cci_score ??
    me?.cross_client_integrity_score ??
    me?.cross_clan_integrity_score ??
    me?.cross_community_integrity_score ??
    null;

  const rawClass =
    me?.cci_class ??
    me?.cross_client_integrity_class ??
    me?.cross_clan_integrity_class ??
    me?.cross_community_integrity_class ??
    "";

  const rawWhy =
    me?.cci_reason ??
    me?.cross_client_integrity_reason ??
    me?.cross_clan_integrity_reason ??
    me?.cross_community_integrity_reason ??
    "";

  const scoreNum =
    rawScore === null || rawScore === undefined || String(rawScore).trim() === ""
      ? null
      : Number(rawScore);

  const classText = String(rawClass || "").trim().toUpperCase();

  if (classText) {
    if (classText === "A" || classText === "A+") {
      return {
        classText,
        scoreText:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "—"
            : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is steady right now."),
      };
    }

    if (classText === "B") {
      return {
        classText,
        scoreText:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "—"
            : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(
          rawWhy || "Keep consistent positive actions across communities."
        ),
      };
    }

    if (classText === "C") {
      return {
        classText,
        scoreText:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "—"
            : String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(
          rawWhy || "A few better actions can improve your standing."
        ),
      };
    }

    return {
      classText,
      scoreText:
        scoreNum === null || Number.isNaN(scoreNum)
          ? "—"
          : String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "Your trust position needs action and repair."),
    };
  }

  if (scoreNum !== null && !Number.isNaN(scoreNum)) {
    if (scoreNum >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is looking strong."),
      };
    }

    if (scoreNum >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(
          rawWhy || "Keep consistent actions to strengthen your standing."
        ),
      };
    }

    if (scoreNum >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(
          rawWhy || "Some recent actions may have reduced your trust strength."
        ),
      };
    }

    return {
      classText: "D",
      scoreText: String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "Your trust position needs urgent improvement."),
    };
  }

  return {
    classText: "Pending",
    scoreText: "—",
    tone: "neutral",
    statusText: "CCI is being prepared",
    whyText: "A fuller cross-community reading will appear when available.",
  };
}

function getOpenTrustState(
  me: any,
  trustSlip: any,
  hasSelectedCommunity: boolean
): ReadingState {
  const rawClass = firstNonEmpty(
    me?.open_trust_class,
    me?.open_trust_band,
    me?.current_community_trust_class,
    me?.current_community_trust_band,
    me?.community_trust_class,
    me?.community_trust_band,
    me?.selected_clan_trust_class,
    me?.selected_clan_trust_band,
    trustSlip?.open_trust_class,
    trustSlip?.open_trust_band,
    trustSlip?.community_trust_class,
    trustSlip?.community_trust_band,
    me?.trust_class,
    me?.trust_band,
    trustSlip?.trust_class,
    trustSlip?.trust_band
  ).toUpperCase();

  const rawScore = firstNumberLike(
    me?.open_trust_score,
    me?.current_community_trust_score,
    me?.community_trust_score,
    me?.selected_clan_trust_score,
    trustSlip?.open_trust_score,
    trustSlip?.community_trust_score,
    me?.trust_score,
    trustSlip?.trust_score
  );

  const rawWhy = firstNonEmpty(
    me?.open_trust_reason,
    me?.current_community_trust_reason,
    me?.community_trust_reason,
    me?.selected_clan_trust_reason,
    trustSlip?.open_trust_reason,
    trustSlip?.community_trust_reason,
    me?.trust_reason,
    trustSlip?.trust_reason
  );

  if (rawClass) {
    if (rawClass === "A" || rawClass === "A+") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore)
            ? "—"
            : String(Math.round(rawScore)),
        tone: "green",
        statusText: "Strong in your current community",
        whyText: rawWhy || "Your present community reading is strong.",
      };
    }

    if (rawClass === "B") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore)
            ? "—"
            : String(Math.round(rawScore)),
        tone: "green",
        statusText: "Stable in your current community",
        whyText:
          rawWhy || "Your current community reading looks steady right now.",
      };
    }

    if (rawClass === "C") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore)
            ? "—"
            : String(Math.round(rawScore)),
        tone: "yellow",
        statusText: "Needs attention in your current community",
        whyText:
          rawWhy ||
          "Your current community reading suggests some areas need attention.",
      };
    }

    return {
      classText: rawClass,
      scoreText:
        rawScore === null || Number.isNaN(rawScore)
          ? "—"
          : String(Math.round(rawScore)),
      tone: "red",
      statusText: "At risk in your current community",
      whyText:
        rawWhy ||
        "Your current community reading shows pressure that needs attention.",
    };
  }

  if (rawScore !== null && !Number.isNaN(rawScore)) {
    if (rawScore >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Strong in your current community",
        whyText: rawWhy || "Your current community reading is strong.",
      };
    }

    if (rawScore >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Stable in your current community",
        whyText:
          rawWhy || "Your current community reading looks steady right now.",
      };
    }

    if (rawScore >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(rawScore)),
        tone: "yellow",
        statusText: "Needs attention in your current community",
        whyText:
          rawWhy ||
          "Your current community reading suggests some areas need attention.",
      };
    }

    return {
      classText: "D",
      scoreText: String(Math.round(rawScore)),
      tone: "red",
      statusText: "At risk in your current community",
      whyText:
        rawWhy ||
        "Your current community reading shows pressure that needs attention.",
    };
  }

  if (!hasSelectedCommunity) {
    return {
      classText: "Pending",
      scoreText: "—",
      tone: "neutral",
      statusText: "Select a community to view Open Trust",
      whyText:
        "Open Trust belongs to your immediate community reading, not to your cross-community integrity reading.",
    };
  }

  return {
    classText: "Pending",
    scoreText: "—",
    tone: "neutral",
    statusText: "Open Trust is being prepared",
    whyText:
      "Open Trust reflects your standing in the currently selected community and will appear here when available.",
  };
}

function toneStyles(tone: "green" | "yellow" | "red" | "neutral") {
  if (tone === "green") {
    return {
      bg: "#F3FBF5",
      border: "1px solid rgba(34,197,94,0.16)",
      text: "#166534",
    };
  }

  if (tone === "yellow") {
    return {
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
    };
  }

  if (tone === "red") {
    return {
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.16)",
    text: "#334155",
  };
}

function urgencyLabel(value?: string | null): string {
  const v = safeStr(value).toLowerCase();
  if (v === "high") return "Urgent";
  if (v === "low") return "Low pressure";
  return "Normal";
}

function fallbackInboxRows(notices: NoticeItem[]): GuidanceNotice[] {
  return notices.slice(0, 3).map((item, index) => ({
    id: safeStr(item.id || `raw-${index}`),
    kind: safeStr(item.kind || "update"),
    title: safeStr(item.title || item.kind || "Update"),
    detail: safeStr(
      item.message || "Review this update and continue from the right page."
    ),
    ctaLabel: safeStr(item.action_label || "Open Action Inbox"),
    ctaTo: safeStr(item.action_url || "/app/notifications"),
    bucket: "generalUpdates",
    unread: !item.is_read,
  }));
}

function renderGuidanceNoticeRow(item: GuidanceNotice) {
  return (
    <div key={item.id} style={innerCard("#FCFEFF")}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            color: "#0B1F33",
            fontWeight: 900,
            lineHeight: 1.35,
          }}
        >
          {item.title}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {item.unread ? <span style={badge(true)}>Unread</span> : null}
          <span style={badge(false)}>{safeStr(item.bucket || "update")}</span>
        </div>
      </div>

      <div style={{ marginTop: 8, ...helperText() }}>{item.detail}</div>

      <div style={{ marginTop: 12 }}>
        <Link to={item.ctaTo} style={secondaryBtn(false)}>
          {item.ctaLabel}
        </Link>
      </div>
    </div>
  );
}

function spotlightMarketplaceTo(item: SpotlightItem | null): string {
  const clanId = positiveNumber(
    item?.source_clan_id ||
      item?.clan_id ||
      item?.source_marketplace_id ||
      item?.marketplace_id
  );

  if (clanId > 0) {
    return `/community/${clanId}`;
  }

  return "/app/marketplace";
}

function defaultDashboardUIState(): DashboardUIState {
  return {
    spotlightMinimized: false,
    demandExpanded: false,
    routesExpanded:
      typeof window !== "undefined" ? window.innerWidth > 1100 : true,
    inboxExpanded: false,
    trustExpanded: false,
  };
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

function normalizeDashboardUIState(raw: any): DashboardUIState {
  const base = defaultDashboardUIState();

  return {
    spotlightMinimized: Boolean(
      raw?.spotlightMinimized ?? base.spotlightMinimized
    ),
    demandExpanded: Boolean(raw?.demandExpanded ?? base.demandExpanded),
    routesExpanded: Boolean(raw?.routesExpanded ?? base.routesExpanded),
    inboxExpanded: Boolean(raw?.inboxExpanded ?? base.inboxExpanded),
    trustExpanded: Boolean(raw?.trustExpanded ?? base.trustExpanded),
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [uiState, setUiState] = useState<DashboardUIState>(() =>
    normalizeDashboardUIState(
      readLocalJSON(DASHBOARD_UI_STORAGE_KEY, defaultDashboardUIState())
    )
  );

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [trustSlip, setTrustSlip] = useState<any>(null);
  const [insight, setInsight] = useState<any>(null);

  const [guidance, setGuidance] = useState<GuidanceSnapshot | null>(null);
  const [guidanceLoading, setGuidanceLoading] = useState(false);
  const [guidanceError, setGuidanceError] = useState("");

  const [spotlights, setSpotlights] = useState<SpotlightItem[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const [pendingRequests, setPendingRequests] = useState<JoinRequestItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);

  const [demandItems, setDemandItems] = useState<DemandItem[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);

  const [marketWisdomIndex, setMarketWisdomIndex] = useState(0);
  const [activeWisdom, setActiveWisdom] = useState<MarketWisdomPair | null>(
    null
  );

  const [avatarSrc, setAvatarSrc] = useState<string>("");
  const [pictureOptionsOpen, setPictureOptionsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    writeLocalJSON(DASHBOARD_UI_STORAGE_KEY, uiState);
  }, [uiState]);

  useEffect(() => {
    setAvatarSrc(readStoredImage(DASHBOARD_AVATAR_STORAGE_KEY));
  }, []);

  useEffect(() => {
    (async () => {
      const [meRes, clanRes, trustSlipRes, insightRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
        getMyTrustSlip().catch(() => null),
        getDailyInsight().catch(() => null),
      ]);

      setMe(meRes);
      setCurrentClan(clanRes);
      setTrustSlip(trustSlipRes);
      setInsight(insightRes);
    })();
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setGuidanceLoading(true);
      setGuidanceError("");

      try {
        const snapshot = await buildGuidanceSnapshot();
        if (!alive) return;
        setGuidance(snapshot);
      } catch (err: any) {
        if (!alive) return;
        setGuidanceError(
          safeStr(err?.message) ||
            "Guided dashboard focus could not be prepared right now."
        );
      } finally {
        if (alive) {
          setGuidanceLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  useEffect(() => {
    (async () => {
      setSpotlightLoading(true);
      try {
        const res = await getMarketplaceBroadcasts({
          active_only: true,
          limit: 20,
        }).catch(() => ({ items: [] }));

        const items: SpotlightItem[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
          ? res.items
          : [];

        setSpotlights(items);
      } finally {
        setSpotlightLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selectedClanId) {
        setPendingRequests([]);
        return;
      }

      try {
        const res = await getCommunityJoinRequests(selectedClanId).catch(() => ({
          items: [],
        }));

        const rows: JoinRequestItem[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
          ? res.items
          : [];

        const pending = rows.filter(
          (r) => String(r?.status || "").toLowerCase() === "pending"
        );

        setPendingRequests(pending);
      } catch {
        setPendingRequests([]);
      }
    })();
  }, [selectedClanId]);

  useEffect(() => {
    (async () => {
      setNoticesLoading(true);
      try {
        const res = await getMyNotifications(12, false).catch(() => ({
          items: [],
        }));

        const rows: NoticeItem[] = Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res)
          ? res
          : [];

        setNotices(rows);
      } finally {
        setNoticesLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setDemandLoading(true);
      try {
        const rows = await listMarketplaceRequests({
          status: "open",
          mine_only: false,
          limit: 6,
        }).catch(() => []);

        setDemandItems(Array.isArray(rows) ? rows : []);
      } finally {
        setDemandLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (spotlights.length <= 1) return;

    const timer = window.setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % spotlights.length);
    }, 15000);

    return () => window.clearInterval(timer);
  }, [spotlights.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMarketWisdomIndex((prev) => prev + 1);
    }, 600000);

    return () => window.clearInterval(timer);
  }, []);

  const activeSpotlight = useMemo(() => {
    if (spotlights.length === 0) return null;
    return spotlights[spotlightIndex % spotlights.length] || spotlights[0];
  }, [spotlights, spotlightIndex]);

  const cci = useMemo(() => getCciState(me), [me]);
  const openTrust = useMemo(
    () => getOpenTrustState(me, trustSlip, Boolean(selectedClanId)),
    [me, trustSlip, selectedClanId]
  );

  const cciTone = useMemo(() => toneStyles(cci.tone), [cci.tone]);
  const openTrustTone = useMemo(() => toneStyles(openTrust.tone), [openTrust.tone]);

  useEffect(() => {
    const hour = new Date().getHours();

    setActiveWisdom((prev) =>
      getSmartMarketWisdomPair({
        hour,
        unread: notices.filter((n) => !n?.is_read).length,
        pendingRequests: pendingRequests.length,
        hasSpotlight: Boolean(activeSpotlight),
        hasGmfnId: Boolean(me?.gmfn_id),
        trustTone: cci.tone,
        previousId: prev?.id,
      })
    );
  }, [
    marketWisdomIndex,
    notices,
    pendingRequests.length,
    activeSpotlight,
    me?.gmfn_id,
    cci.tone,
  ]);

  const greetingName = useMemo(() => resolveUserName(me), [me]);
  const profileSecondary = useMemo(() => resolveUserSecondary(me), [me]);
  const profileInitials = useMemo(
    () => initialsFromName(resolveUserName(me)),
    [me]
  );

  const gmfnId = safeStr(me?.gmfn_id || "Pending");
  const trustSlipCode = safeStr(trustSlip?.code || "");
  const spotlightImageSrc = safeStr(
    activeSpotlight?.image_url || activeSpotlight?.image || ""
  );

  const myShopLink = safeStr(me?.gmfn_id)
    ? `/app/shop/${encodeURIComponent(safeStr(me?.gmfn_id))}`
    : "/app/shop/me";

  const unreadCount = useMemo(
    () => notices.filter((n) => !n?.is_read).length,
    [notices]
  );

  const nextBestStep = guidance?.nextBestStep || null;
  const todayTomorrow = guidance?.todayTomorrow || null;
  const trustJourney = guidance?.trustJourneySummary || null;
  const trustExplainer = guidance?.trustChangeExplainer || null;
  const weeklyFocus = guidance?.weeklyFocus || null;
  const recoveryPath = guidance?.recoveryPath || null;
  const actionInbox = guidance?.actionInboxSummary || null;

  const inboxPreview = useMemo<GuidanceNotice[]>(() => {
    if (actionInbox) {
      const rows: GuidanceNotice[] = [
        ...actionInbox.actNow,
        ...actionInbox.dueSoon,
        ...actionInbox.watchAndWait,
        ...actionInbox.generalUpdates,
      ];

      if (rows.length > 0) {
        return rows.slice(0, 3);
      }
    }

    return fallbackInboxRows(notices);
  }, [actionInbox, notices]);

  const signalText = safeStr(
    activeWisdom?.proverb ||
      guidance?.marketWisdomCard?.text ||
      insight?.text ||
      "Stay visible, stay trustworthy, and move one clear step at a time."
  );

  const signalSupport = safeStr(
    activeWisdom?.gmfn ||
      (!activeWisdom && guidance?.marketWisdomCard?.title
        ? guidance.marketWisdomCard.title
        : "")
  );

  const demandPreview = useMemo(() => demandItems.slice(0, 2), [demandItems]);

  const guidancePulse = useMemo<GuidancePulse | null>(() => {
    if (!guidance && !nextBestStep && !todayTomorrow && !weeklyFocus) return null;

    const severity = (
      safeStr(
        nextBestStep?.severity ||
          recoveryPath?.severity ||
          ((actionInbox?.actNow.length || 0) > 0 ? "important" : "normal")
      ).toLowerCase() || "normal"
    ) as GuidancePulse["severity"];

    const title = safeStr(
      nextBestStep?.title ||
        weeklyFocus?.title ||
        recoveryPath?.title ||
        "Keep your path steady"
    );

    const body = safeStr(
      nextBestStep?.detail ||
        recoveryPath?.detail ||
        weeklyFocus?.detail ||
        "Review your current position and continue from the right page."
    );

    const nowLine = safeStr(
      todayTomorrow?.today || body || "Complete the next right step now."
    );

    const nextLine = safeStr(
      todayTomorrow?.tomorrow ||
        weeklyFocus?.detail ||
        weeklyFocus?.title ||
        "Keep tomorrow lighter by finishing the current step well."
    );

    const wisdomLine = safeStr(
      activeWisdom?.proverb || guidance?.marketWisdomCard?.text || signalText
    );

    const ctaTo = safeStr(
      nextBestStep?.ctaTo ||
        recoveryPath?.ctaTo ||
        weeklyFocus?.ctaTo ||
        "/app/community"
    );

    const ctaLabel = safeStr(
      nextBestStep?.ctaLabel ||
        recoveryPath?.ctaLabel ||
        weeklyFocus?.ctaLabel ||
        "Open important step"
    );

    return {
      severity:
        severity === "urgent" || severity === "important" ? severity : "normal",
      title,
      body,
      nowLine,
      nextLine,
      wisdomLine,
      ctaTo,
      ctaLabel,
    };
  }, [
    guidance,
    nextBestStep,
    todayTomorrow,
    weeklyFocus,
    recoveryPath,
    actionInbox,
    activeWisdom,
    signalText,
  ]);

  const nextRouteTo = safeStr(
    weeklyFocus?.ctaTo ||
      recoveryPath?.ctaTo ||
      nextBestStep?.ctaTo ||
      "/app/notifications"
  );

  const nextRouteLabel = safeStr(
    weeklyFocus?.ctaLabel ||
      recoveryPath?.ctaLabel ||
      "Open next step"
  );

  function updateUiState(patch: Partial<DashboardUIState>) {
    setUiState((prev) => ({
      ...prev,
      ...patch,
    }));
  }

  function openSpotlightShop() {
    const spotlightGmfnId = safeStr(activeSpotlight?.author_gmfn_id || "");
    if (!spotlightGmfnId) return;
    navigate(`/app/shop/${encodeURIComponent(spotlightGmfnId)}`);
  }

  function openSpotlightMarketplace() {
    navigate(spotlightMarketplaceTo(activeSpotlight));
  }

  function openAvatarPicker() {
    fileInputRef.current?.click();
  }

  function onAvatarSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result) return;

      try {
        localStorage.setItem(DASHBOARD_AVATAR_STORAGE_KEY, result);
      } catch {}

      setAvatarSrc(result);
    };

    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    try {
      localStorage.removeItem(DASHBOARD_AVATAR_STORAGE_KEY);
    } catch {}

    setAvatarSrc("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "220px minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                width: "100%",
                height: isCompact ? 240 : 270,
                borderRadius: 28,
                overflow: "hidden",
                border: "1px solid rgba(11,31,51,0.10)",
                background: "linear-gradient(180deg, #E8F0FF 0%, #DDEBFF 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Profile"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center 15%",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    color: "#0B63D1",
                    fontWeight: 900,
                    fontSize: 44,
                  }}
                >
                  {profileInitials}
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarSelected}
              style={{ display: "none" }}
            />

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setPictureOptionsOpen((prev) => !prev)}
                style={{
                  ...secondaryBtn(false),
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                <span>Picture options</span>
                <span>{pictureOptionsOpen ? "−" : "+"}</span>
              </button>
            </div>

            {pictureOptionsOpen ? (
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
                  onClick={openAvatarPicker}
                  style={subtleBtn(false)}
                >
                  Upload
                </button>
                <button
                  type="button"
                  onClick={openAvatarPicker}
                  style={subtleBtn(false)}
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={removeAvatar}
                  style={subtleBtn(!avatarSrc)}
                  disabled={!avatarSrc}
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={sectionLabel()}>Identity and trust summary</div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: isCompact ? 26 : 32,
                    lineHeight: 1.1,
                  }}
                >
                  Good to see you, {greetingName}
                </div>

                {profileSecondary ? (
                  <div
                    style={{
                      marginTop: 8,
                      color: "#64748B",
                      fontSize: 14,
                      lineHeight: 1.6,
                    }}
                  >
                    {profileSecondary}
                  </div>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={badge(true)}>
                  Community: {currentCommunityName(currentClan, selectedClanId)}
                </span>
                <span style={badge(false)}>
                  Pending approvals: {pendingRequests.length}
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                maxWidth: 860,
              }}
            >
              Start with your identity and trust reading first, then move into the right working surface.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>
                TrustSlip: {trustSlipCode || "Pending"}
              </span>
            </div>

            <div
              style={{
                marginTop: 16,
                ...innerCard("#F8FBFF"),
              }}
            >
              <div style={sectionLabel()}>Trust and verification</div>

              <div
                style={{
                  marginTop: 12,
                  ...innerCard("#FFFFFF"),
                  padding: 0,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                    gap: 0,
                  }}
                >
                  <div
                    style={{
                      padding: 14,
                      background: openTrustTone.bg,
                      borderRight: "1px solid rgba(11,31,51,0.08)",
                    }}
                  >
                    <div style={sectionLabel()}>Open Trust</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: openTrustTone.text,
                        fontSize: 24,
                        fontWeight: 900,
                      }}
                    >
                      {openTrust.classText}
                    </div>
                    <div style={{ marginTop: 6, color: "#64748B", fontSize: 13 }}>
                      Score: {openTrust.scoreText}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#5F7287",
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      {openTrust.statusText}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 14,
                      background: cciTone.bg,
                      borderRight: "1px solid rgba(11,31,51,0.08)",
                    }}
                  >
                    <div style={sectionLabel()}>CCI</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: cciTone.text,
                        fontSize: 24,
                        fontWeight: 900,
                      }}
                    >
                      {cci.classText}
                    </div>
                    <div style={{ marginTop: 6, color: "#64748B", fontSize: 13 }}>
                      Score: {cci.scoreText}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#5F7287",
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      {cci.statusText}
                    </div>
                  </div>

                  <div
                    style={{
                      padding: 14,
                      background: "#FFFFFF",
                    }}
                  >
                    <div style={sectionLabel()}>TrustSlip</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#0B1F33",
                        fontSize: isCompact ? 16 : 18,
                        fontWeight: 900,
                        lineHeight: 1.25,
                        wordBreak: "break-word",
                      }}
                    >
                      {trustSlipCode || "Pending"}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#5F7287",
                        fontSize: 12,
                        lineHeight: 1.45,
                      }}
                    >
                      {trustSlipCode
                        ? "Verification surface ready"
                        : "Still preparing"}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  ...innerCard("#FFFFFF"),
                  padding: 0,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "118px minmax(0, 1fr)",
                    gap: 0,
                    alignItems: "stretch",
                  }}
                >
                  <div
                    style={{
                      padding: 14,
                      borderRight: "1px solid rgba(11,31,51,0.08)",
                      background: "#FFFFFF",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <div style={sectionLabel()}>QR</div>

                    {trustSlipCode ? (
                      <>
                        <img
                          src={`${apiOrigin()}/trust-slips/verify/${encodeURIComponent(
                            trustSlipCode
                          )}/qr.png`}
                          alt="Trust QR"
                          style={{
                            width: 88,
                            height: 88,
                            borderRadius: 12,
                            border: "1px solid rgba(11,31,51,0.10)",
                            background: "#FFFFFF",
                            padding: 5,
                            objectFit: "contain",
                          }}
                        />
                        <div
                          style={{
                            fontSize: 11,
                            color: "#64748B",
                            fontWeight: 700,
                            textAlign: "center",
                          }}
                        >
                          Scan to verify
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#64748B",
                          textAlign: "center",
                          lineHeight: 1.4,
                        }}
                      >
                        QR will appear here
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      padding: 14,
                      background: "#FFFFFF",
                    }}
                  >
                    <div style={sectionLabel()}>Trust Passport</div>

                    <div
                      style={{
                        marginTop: 10,
                        color: "#0B1F33",
                        fontSize: 16,
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      Why trust changed, what helped, what weakened it, and what improves next
                    </div>

                    <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                      Open Trust is your current community reading. CCI is your wider cross-community reading. TrustSlip is the portable verification surface.
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <Link to="/app/trust" style={secondaryBtn(false)}>
                        Open Trust
                      </Link>
                      <Link to="/app/trust-slip" style={primaryBtn(false)}>
                        Open TrustSlip
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Spotlight</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Spotlight stays high because it is one of the main visibility surfaces.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              updateUiState({ spotlightMinimized: !uiState.spotlightMinimized })
            }
            style={secondaryBtn(false)}
          >
            {uiState.spotlightMinimized ? "Restore spotlight" : "Minimize spotlight"}
          </button>
        </div>

        {uiState.spotlightMinimized ? (
          <div style={{ marginTop: 14, ...innerCard("#FFFBEF") }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  {safeStr(
                    activeSpotlight?.title ||
                      activeSpotlight?.message ||
                      "No active spotlight yet"
                  )}
                </div>

                <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                  {safeStr(
                    activeSpotlight?.source_shop_name ||
                      activeSpotlight?.author_name ||
                      "Spotlight stays ready here."
                  )}
                </div>
              </div>

              <span style={badge(true)}>Spotlight minimized</span>
            </div>
          </div>
        ) : spotlightLoading ? (
          <div style={{ marginTop: 16, color: "#64748B" }}>
            Loading spotlight...
          </div>
        ) : activeSpotlight ? (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div
              style={{
                position: "relative",
                width: "100%",
                minHeight: isCompact ? 260 : 360,
                borderRadius: 28,
                overflow: "hidden",
                border: "1px solid rgba(11,31,51,0.08)",
                background:
                  "linear-gradient(180deg, #DCE9FB 0%, #EAF2FF 100%)",
              }}
            >
              {spotlightImageSrc ? (
                <img
                  src={resolveSpotlightImageSrc(spotlightImageSrc)}
                  alt={safeStr(
                    activeSpotlight.title ||
                      activeSpotlight.message ||
                      "Spotlight"
                  )}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: isCompact ? 260 : 360,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : null}

              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(11,31,51,0.06) 0%, rgba(11,31,51,0.18) 35%, rgba(11,31,51,0.70) 100%)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  left: 18,
                  right: 18,
                  bottom: 18,
                  display: "grid",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    ...badge(true),
                    width: "fit-content",
                    background: "rgba(255,255,255,0.16)",
                    color: "#FFFFFF",
                  }}
                >
                  Shop spotlight
                </span>

                <div
                  style={{
                    color: "#FFFFFF",
                    fontWeight: 900,
                    fontSize: isCompact ? 24 : 34,
                    lineHeight: 1.15,
                    maxWidth: 820,
                    textShadow: "0 2px 12px rgba(0,0,0,0.28)",
                  }}
                >
                  {safeStr(
                    activeSpotlight.title ||
                      activeSpotlight.message ||
                      "Community Spotlight"
                  )}
                </div>
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "minmax(0, 1.25fr) auto",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={sectionLabel()}>Seller metadata</div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badge(true)}>
                      Seller:{" "}
                      {safeStr(
                        activeSpotlight.source_shop_name ||
                          activeSpotlight.author_name ||
                          "Community seller"
                      )}
                    </span>
                    <span style={badge(false)}>
                      Marketplace:{" "}
                      {safeStr(
                        activeSpotlight.source_clan_name ||
                          currentCommunityName(currentClan, selectedClanId)
                      )}
                    </span>
                    <span style={badge(false)}>
                      Trust: {safeStr(activeSpotlight.trust_band || "Trusted member")}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      ...helperText(),
                      fontSize: 13,
                    }}
                  >
                    {safeStr(
                      activeSpotlight.body ||
                        activeSpotlight.message ||
                        "Open the seller’s shop directly or move into the seller’s marketplace context."
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    justifyContent: isCompact ? "flex-start" : "flex-end",
                  }}
                >
                  <button
                    type="button"
                    style={primaryBtn(
                      !safeStr(activeSpotlight.author_gmfn_id || "")
                    )}
                    onClick={openSpotlightShop}
                    disabled={!safeStr(activeSpotlight.author_gmfn_id || "")}
                  >
                    Open Shop
                  </button>

                  <button
                    type="button"
                    style={secondaryBtn(false)}
                    onClick={openSpotlightMarketplace}
                  >
                    Open Marketplace
                  </button>
                </div>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
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
                  <div style={sectionLabel()}>Demand signal</div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Demand stays compact here. Open it only when you need the detail.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    updateUiState({ demandExpanded: !uiState.demandExpanded })
                  }
                  style={secondaryBtn(false)}
                >
                  {uiState.demandExpanded ? "Minimize demand" : "Open demand"}
                </button>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>Visible demand: {demandItems.length}</span>
                <span style={badge(false)}>
                  {demandPreview[0]
                    ? safeStr(demandPreview[0].title || "Need")
                    : "No open demand visible right now"}
                </span>
              </div>

              {uiState.demandExpanded ? (
                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  {demandLoading ? (
                    <div style={{ color: "#64748B" }}>Loading demand activity...</div>
                  ) : demandPreview.length === 0 ? (
                    <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                      No open demand is visible right now.
                    </div>
                  ) : (
                    demandPreview.map((item, idx) => (
                      <div key={item.id || idx} style={innerCard("#FCFEFF")}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 10,
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              color: "#0B1F33",
                              fontWeight: 900,
                              lineHeight: 1.4,
                            }}
                          >
                            {safeStr(item.title || "Need")}
                          </div>

                          <span style={badge(false)}>{urgencyLabel(item.urgency)}</span>
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            color: "#5F7287",
                            fontSize: 14,
                            lineHeight: 1.75,
                          }}
                        >
                          {safeStr(item.description || "No extra detail yet.")}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            color: "#64748B",
                            fontSize: 13,
                          }}
                        >
                          By:{" "}
                          {safeStr(
                            item.requester_name ||
                              item.requester_nickname ||
                              item.requester_email ||
                              "Member"
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  <div>
                    <Link to="/app/demand-box" style={secondaryBtn(false)}>
                      Open Demand Box
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, color: "#64748B" }}>
            No active spotlight is available yet.
          </div>
        )}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>What matters now</div>

            {guidanceError ? (
              <div
                style={{
                  marginTop: 12,
                  ...softCard("#FEF2F2"),
                  color: "#991B1B",
                  border: "1px solid rgba(239,68,68,0.16)",
                  fontWeight: 800,
                }}
              >
                {guidanceError}
              </div>
            ) : guidanceLoading && !guidancePulse ? (
              <div style={{ marginTop: 12, color: "#64748B", lineHeight: 1.8 }}>
                Preparing your guided focus...
              </div>
            ) : guidancePulse ? (
              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                <div style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        ...badge(true),
                        background:
                          guidancePulse.severity === "urgent"
                            ? "rgba(220,38,38,0.08)"
                            : guidancePulse.severity === "important"
                            ? "rgba(245,158,11,0.12)"
                            : "rgba(11,99,209,0.08)",
                        color:
                          guidancePulse.severity === "urgent"
                            ? "#B91C1C"
                            : guidancePulse.severity === "important"
                            ? "#92400E"
                            : "#0B63D1",
                      }}
                    >
                      {guidancePulse.severity}
                    </span>
                    <span style={badge(false)}>Important</span>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      color: "#0B1F33",
                      fontSize: isCompact ? 22 : 28,
                      fontWeight: 900,
                      lineHeight: 1.15,
                    }}
                  >
                    {guidancePulse.title}
                  </div>

                  <div style={{ marginTop: 10, ...helperText() }}>
                    {guidancePulse.nowLine}
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <Link to={guidancePulse.ctaTo} style={primaryBtn(false)}>
                      {guidancePulse.ctaLabel}
                    </Link>
                  </div>
                </div>

                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Next step</div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontSize: 18,
                      fontWeight: 900,
                      lineHeight: 1.35,
                    }}
                  >
                    {weeklyFocus?.title || "Next clean route"}
                  </div>

                  <div style={{ marginTop: 8, ...helperText() }}>
                    {weeklyFocus?.detail || guidancePulse.nextLine}
                  </div>

                  <div style={{ marginTop: 14 }}>
                    <Link to={nextRouteTo} style={secondaryBtn(false)}>
                      {nextRouteLabel}
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 12, color: "#64748B", lineHeight: 1.8 }}>
                No urgent step is blocking you right now.
              </div>
            )}
          </div>

          <div
            style={{
              borderRadius: 22,
              border: "1px solid rgba(180,126,0,0.18)",
              background:
                "linear-gradient(135deg, #FFE08A 0%, #FFD166 35%, #FFF3C4 100%)",
              padding: 18,
              boxShadow: "0 14px 30px rgba(180,126,0,0.08)",
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
              <div style={sectionLabel()}>Market wisdom</div>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  minHeight: 28,
                  padding: "5px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.55)",
                  color: "#805A00",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                ● Live signal
              </span>
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#4D3500",
                fontSize: isCompact ? 20 : 24,
                fontWeight: 900,
                lineHeight: 1.25,
              }}
            >
              {signalText}
            </div>

            {signalSupport ? (
              <div
                style={{
                  marginTop: 10,
                  color: "#6D4A00",
                  fontSize: 13,
                  lineHeight: 1.7,
                  fontWeight: 700,
                }}
              >
                {signalSupport}
              </div>
            ) : null}

            <div style={{ marginTop: 14, ...helperText(), color: "#6D4A00" }}>
              {guidancePulse?.wisdomLine ||
                todayTomorrow?.today ||
                "Keep the next step visible and trustworthy."}
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Main short routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep the main routes together here instead of scattering route buttons around the page.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              updateUiState({ routesExpanded: !uiState.routesExpanded })
            }
            style={secondaryBtn(false)}
          >
            {uiState.routesExpanded ? "Collapse" : "Open"}
          </button>
        </div>

        {uiState.routesExpanded ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <Link to="/app/community" style={routeTile(true)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                  lineHeight: 1.3,
                }}
              >
                Community Home
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                Private community control room.
              </div>
            </Link>

            <Link to="/app/marketplace" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                  lineHeight: 1.3,
                }}
              >
                Marketplace
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                Selected-community market surface.
              </div>
            </Link>

            <Link to="/app/notifications" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                  lineHeight: 1.3,
                }}
              >
                Action Inbox
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                What needs response now.
              </div>
            </Link>

            <Link to={myShopLink} style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                  lineHeight: 1.3,
                }}
              >
                Shop Gallery
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                Open your visible shop surface.
              </div>
            </Link>

            <Link to="/app/trust" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                  lineHeight: 1.3,
                }}
              >
                Trust
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                Read trust and change explanations.
              </div>
            </Link>

            <Link to="/app/demand-box" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                  lineHeight: 1.3,
                }}
              >
                Demand Box
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                Identity-based need surface.
              </div>
            </Link>

            <Link to="/app/my-gmfn-and-i" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                  lineHeight: 1.3,
                }}
              >
                My GMFN and I
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                Guide in plain language.
              </div>
            </Link>

            <Link to="/app/my-gmfn-and-i?tab=settings" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                  lineHeight: 1.3,
                }}
              >
                Settings
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 12 }}>
                Readability and workspace controls.
              </div>
            </Link>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Action Inbox summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep this condensed until you need to open it.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              updateUiState({ inboxExpanded: !uiState.inboxExpanded })
            }
            style={secondaryBtn(false)}
          >
            {uiState.inboxExpanded ? "Collapse" : "Open"}
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={badge(true)}>
            Act now: {actionInbox?.actNow.length || 0}
          </span>
          <span style={badge(false)}>
            Due soon: {actionInbox?.dueSoon.length || 0}
          </span>
          <span style={badge(false)}>
            Watch: {actionInbox?.watchAndWait.length || 0}
          </span>
          <span style={badge(false)}>
            Unread: {actionInbox?.unreadCount ?? unreadCount}
          </span>
        </div>

        {uiState.inboxExpanded ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {noticesLoading && inboxPreview.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                Loading action inbox...
              </div>
            ) : inboxPreview.length > 0 ? (
              inboxPreview.map(renderGuidanceNoticeRow)
            ) : (
              <div style={innerCard("#FCFEFF")}>
                <div style={helperText()}>
                  No urgent action is waiting in the inbox right now.
                </div>
              </div>
            )}

            <div>
              <Link to="/app/notifications" style={secondaryBtn(false)}>
                Open Action Inbox
              </Link>
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Trust journey</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep this condensed until you need the detail.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              updateUiState({ trustExpanded: !uiState.trustExpanded })
            }
            style={secondaryBtn(false)}
          >
            {uiState.trustExpanded ? "Collapse" : "Open"}
          </button>
        </div>

        <div
          style={{
            marginTop: 12,
            color: "#0B1F33",
            fontSize: 20,
            fontWeight: 900,
            lineHeight: 1.25,
          }}
        >
          {safeStr(trustJourney?.heading || "Your trust path is steady.")}
        </div>

        <div style={{ marginTop: 10, ...helperText() }}>
          {safeStr(
            trustJourney?.detail ||
              "Steady participation, prompt response, and disciplined follow-up protect tomorrow’s options."
          )}
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={badge(true)}>
            Built: {trustJourney?.builtCount || 0}
          </span>
          <span style={badge(false)}>
            Protected: {trustJourney?.protectedCount || 0}
          </span>
          <span style={badge(false)}>
            Weakened: {trustJourney?.weakenedCount || 0}
          </span>
          <span style={badge(false)}>
            Repair: {trustJourney?.repairCount || 0}
          </span>
        </div>

        {uiState.trustExpanded ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                What helped
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {(trustExplainer?.helps || []).slice(0, 2).map((item, index) => (
                  <div key={`help-${index}`} style={helperText()}>
                    {item}
                  </div>
                ))}

                {(trustExplainer?.helps || []).length === 0 ? (
                  <div style={helperText()}>
                    No positive movement explanation is visible right now.
                  </div>
                ) : null}
              </div>
            </div>

            {(trustExplainer?.weakens || []).length > 0 ? (
              <div style={innerCard("#FFFBEF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  What weakened trust
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {(trustExplainer?.weakens || []).slice(0, 2).map((item, index) => (
                    <div key={`weak-${index}`} style={helperText()}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {recoveryPath ? (
              <div style={innerCard("#FFFBEF")}>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      ...badge(true),
                      background: "rgba(245,158,11,0.12)",
                      color: "#92400E",
                    }}
                  >
                    {safeStr(recoveryPath.severity || "important")}
                  </span>
                  <span style={badge(false)}>Recovery path</span>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#0B1F33",
                    fontSize: 18,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  {recoveryPath.title}
                </div>

                <div style={{ marginTop: 10, ...helperText() }}>
                  {recoveryPath.detail}
                </div>

                <div style={{ marginTop: 12 }}>
                  <Link to={recoveryPath.ctaTo} style={secondaryBtn(false)}>
                    {recoveryPath.ctaLabel}
                  </Link>
                </div>
              </div>
            ) : null}

            <div>
              <Link to="/app/trust" style={secondaryBtn(false)}>
                Open Trust
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}