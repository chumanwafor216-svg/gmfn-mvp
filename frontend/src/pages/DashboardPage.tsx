import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  getCommunityJoinRequests,
  getDailyInsight,
  getMarketplaceBroadcasts,
  getMe,
  getMyNotifications,
  getMyTrustSlip,
  getSelectedClanId,
  listMarketplaceRequests,
} from "../lib/api";
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

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 14,
  };
}

function shortcutTile(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 108,
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(11,99,209,0.18)"
      : "1px solid rgba(11,31,51,0.08)",
    background: primary ? "#F7FAFF" : "#FFFFFF",
    padding: 16,
    textDecoration: "none",
    boxShadow: primary ? "0 10px 24px rgba(11,99,209,0.05)" : "none",
  };
}

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function firstNonEmpty(...values: any[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
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

function readStoredImage(key: string, fallbackSrc: string): string {
  try {
    return localStorage.getItem(key) || fallbackSrc;
  } catch {
    return fallbackSrc;
  }
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
  const raw = String(src || "").trim();
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
      soft: "rgba(22,101,52,0.08)",
    };
  }

  if (tone === "yellow") {
    return {
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
      soft: "rgba(146,64,14,0.08)",
    };
  }

  if (tone === "red") {
    return {
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
      soft: "rgba(153,27,27,0.08)",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.16)",
    text: "#334155",
    soft: "rgba(51,65,85,0.07)",
  };
}

function notificationSourceLabel(kind?: string | null): string {
  const k = String(kind || "").toLowerCase();

  if (k.includes("demand") || k.includes("request")) return "Demand Box";
  if (k.includes("trust")) return "Trust";
  if (k.includes("approval") || k.includes("join")) return "Approval";
  if (k.includes("spotlight") || k.includes("marketplace")) return "Spotlight";
  if (k.includes("assistant")) return "Assistant";
  if (k.includes("money") || k.includes("pool") || k.includes("loan")) {
    return "Money";
  }

  return "Update";
}

function urgencyLabel(value?: string | null): string {
  const v = String(value || "").toLowerCase();
  if (v === "high") return "Urgent";
  if (v === "low") return "Low pressure";
  return "Normal";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [trustSlip, setTrustSlip] = useState<any>(null);
  const [insight, setInsight] = useState<any>(null);

  const [spotlights, setSpotlights] = useState<SpotlightItem[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [showSpotlight, setShowSpotlight] = useState(true);

  const [pendingRequests, setPendingRequests] = useState<JoinRequestItem[]>([]);
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);

  const [demandItems, setDemandItems] = useState<DemandItem[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);

  const [marketWisdomIndex, setMarketWisdomIndex] = useState(0);
  const [activeWisdom, setActiveWisdom] = useState<MarketWisdomPair | null>(
    null
  );

  const avatarStorageKey = "gmfn.member.avatar";
  const fallbackAvatar = "/assets/user-default.png";
  const [avatarSrc, setAvatarSrc] = useState<string>(fallbackAvatar);
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
    setAvatarSrc(readStoredImage(avatarStorageKey, fallbackAvatar));
  }, []);

  useEffect(() => {
    (async () => {
      const [meRes, trustSlipRes, insightRes] = await Promise.all([
        getMe().catch(() => null),
        getMyTrustSlip().catch(() => null),
        getDailyInsight().catch(() => null),
      ]);

      setMe(meRes);
      setTrustSlip(trustSlipRes);
      setInsight(insightRes);
    })();
  }, []);

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
  const openTrustTone = useMemo(
    () => toneStyles(openTrust.tone),
    [openTrust.tone]
  );

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
  const profileName = useMemo(() => resolveUserName(me), [me]);
  const profileSecondary = useMemo(() => resolveUserSecondary(me), [me]);
  const gmfnId = safeStr(me?.gmfn_id || "Pending");
  const trustSlipCode = safeStr(trustSlip?.code || "");
  const spotlightImageSrc = safeStr(
    activeSpotlight?.image_url || activeSpotlight?.image || ""
  );

  const myShopLink = safeStr(me?.gmfn_id)
    ? `/app/shop/${encodeURIComponent(safeStr(me?.gmfn_id))}`
    : "/app/shop-control";

  const unreadCount = useMemo(
    () => notices.filter((n) => !n?.is_read).length,
    [notices]
  );

  const latestNotice = useMemo(
    () => (notices.length > 0 ? notices[0] : null),
    [notices]
  );

  const signalText = safeStr(
    activeWisdom?.proverb ||
      insight?.text ||
      "Stay visible, stay trustworthy, and move one clear step at a time."
  );

  const signalSupport = safeStr(activeWisdom?.gmfn || "");

  const demandPreview = useMemo(() => demandItems.slice(0, 2), [demandItems]);

  function openSpotlightShop() {
    const spotlightGmfnId = safeStr(activeSpotlight?.author_gmfn_id || "");
    if (!spotlightGmfnId) return;
    navigate(`/app/shop/${encodeURIComponent(spotlightGmfnId)}`);
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
        localStorage.setItem(avatarStorageKey, result);
      } catch {}

      setAvatarSrc(result);
    };

    reader.readAsDataURL(file);
  }

  function removeAvatar() {
    try {
      localStorage.removeItem(avatarStorageKey);
    } catch {}

    setAvatarSrc(fallbackAvatar);

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
      <PageTopNav
        title="Dashboard"
        subtitle="Review your identity and trust information first, then move through the system from a calmer, more guided starting page."
        backTo="/app/dashboard"
        dashboardTo="/app/dashboard"
      />

      <section
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          padding: isCompact ? 20 : 24,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.25fr) minmax(320px, 0.75fr)",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <div>
            <div style={sectionLabel()}>Dashboard</div>

            <h1
              style={{
                margin: "10px 0 0",
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.08,
                maxWidth: 760,
              }}
            >
              Good to see you, {greetingName}
            </h1>

            <div
              style={{
                marginTop: 12,
                color: "#5F7287",
                fontSize: 15,
                lineHeight: 1.85,
                maxWidth: 820,
              }}
            >
              Start here with your identity and trust summary, then move into
              community, marketplace, demand, your shop, or TrustSlip through
              the shortcut block below.
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Today’s signal</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.45,
              }}
            >
              {signalText}
            </div>

            {signalSupport ? (
              <div
                style={{
                  marginTop: 10,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                {signalSupport}
              </div>
            ) : null}

            <div
              style={{
                marginTop: 14,
                color: "#64748B",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              Today’s signal stays separate from notifications, join requests,
              and demand counts.
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Identity and trust summary</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "220px minmax(0, 1fr) 340px",
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
              }}
            >
              <img
                src={avatarSrc}
                alt="Profile"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
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
                  style={subtleBtn(avatarSrc === fallbackAvatar)}
                  disabled={avatarSrc === fallbackAvatar}
                >
                  Remove
                </button>
              </div>
            ) : null}
          </div>

          <div>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 24 : 28,
                lineHeight: 1.12,
              }}
            >
              {profileName}
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

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>GMFN ID: {gmfnId}</span>
              {trustSlipCode ? (
                <span style={badge(false)}>TrustSlip: {trustSlipCode}</span>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 14,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.8,
                maxWidth: 760,
              }}
            >
              Your GMFN ID is your global identity across the system. Your shop
              follows that identity, while demand stays identity-based and
              spotlight stays shop-based.
            </div>

            <div
              style={{
                marginTop: 16,
                ...innerCard(cciTone.bg),
                border: cciTone.border,
              }}
            >
              <div style={sectionLabel()}>CCI / Cross-Community Integrity</div>

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.7,
                }}
              >
                This is the readable trust summary of how consistently your
                identity is trusted across the communities where you are visible.
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <div style={statTile()}>
                  <div
                    style={{
                      color: "#64748B",
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.25,
                    }}
                  >
                    Current reading
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: cciTone.text,
                      fontSize: 24,
                      fontWeight: 900,
                    }}
                  >
                    {cci.classText}
                  </div>
                </div>

                <div style={statTile()}>
                  <div
                    style={{
                      color: "#64748B",
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.25,
                    }}
                  >
                    Score
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontSize: 24,
                      fontWeight: 900,
                    }}
                  >
                    {cci.scoreText}
                  </div>
                </div>

                <div style={statTile()}>
                  <div
                    style={{
                      color: "#64748B",
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.25,
                    }}
                  >
                    Status
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: cciTone.text,
                      fontSize: 24,
                      fontWeight: 900,
                    }}
                  >
                    {cci.statusText}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.8,
                }}
              >
                {cci.whyText}
              </div>
            </div>
          </div>

          <div
            style={{
              ...innerCard(openTrustTone.bg),
              border: openTrustTone.border,
            }}
          >
            <div style={sectionLabel()}>Open Trust and QR</div>

            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              Open Trust reflects your standing in your immediate community,
              while CCI summarizes behaviour across communities.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div
                  style={{
                    color: "#64748B",
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 0.25,
                  }}
                >
                  Reading
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: openTrustTone.text,
                    fontSize: 22,
                    fontWeight: 900,
                  }}
                >
                  {openTrust.classText}
                </div>
              </div>

              <div style={statTile()}>
                <div
                  style={{
                    color: "#64748B",
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 0.25,
                  }}
                >
                  Score
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: "#0B1F33",
                    fontSize: 22,
                    fontWeight: 900,
                  }}
                >
                  {openTrust.scoreText}
                </div>
              </div>

              <div style={statTile()}>
                <div
                  style={{
                    color: "#64748B",
                    fontSize: 12,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: 0.25,
                  }}
                >
                  Status
                </div>
                <div
                  style={{
                    marginTop: 6,
                    color: openTrustTone.text,
                    fontSize: 18,
                    fontWeight: 900,
                    lineHeight: 1.25,
                  }}
                >
                  {openTrust.statusText}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              {openTrust.whyText}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 136px",
                gap: 14,
                alignItems: "center",
              }}
            >
              <div>
                <Link to="/app/trust" style={primaryBtn(false)}>
                  Open Trust
                </Link>
              </div>

              {trustSlipCode ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <img
                    src={`${apiOrigin()}/trust-slips/verify/${encodeURIComponent(
                      trustSlipCode
                    )}/qr.png`}
                    alt="Trust QR"
                    style={{
                      width: 124,
                      height: 124,
                      borderRadius: 14,
                      border: "1px solid rgba(11,31,51,0.10)",
                      background: "#FFFFFF",
                      padding: 6,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 12,
                      color: "#64748B",
                      fontWeight: 700,
                      textAlign: "center",
                    }}
                  >
                    Scan to verify
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    color: "#64748B",
                    fontSize: 13,
                    lineHeight: 1.6,
                    textAlign: isCompact ? "left" : "center",
                  }}
                >
                  QR appears here when TrustSlip is available.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Shortcuts</div>

        <div
          style={{
            marginTop: 8,
            color: "#5F7287",
            fontSize: 14,
            lineHeight: 1.75,
            maxWidth: 760,
          }}
        >
          All main shortcuts now stay in one place instead of being scattered
          across the dashboard.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 12,
          }}
        >
          <Link to="/app/community" style={shortcutTile(true)}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
                lineHeight: 1.3,
              }}
            >
              Open Community
            </div>
            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 13,
                lineHeight: 1.65,
              }}
            >
              Owner-only community control and participation surface.
            </div>
          </Link>

          <Link to="/app/marketplace" style={shortcutTile(false)}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
                lineHeight: 1.3,
              }}
            >
              Marketplace
            </div>
            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 13,
                lineHeight: 1.65,
              }}
            >
              Selected-community marketplace surface.
            </div>
          </Link>

          <Link to="/app/demand-box" style={shortcutTile(false)}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
                lineHeight: 1.3,
              }}
            >
              Demand Box
            </div>
            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 13,
                lineHeight: 1.65,
              }}
            >
              Identity-based demand and visible requests.
            </div>
          </Link>

          <Link to={myShopLink} style={shortcutTile(false)}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
                lineHeight: 1.3,
              }}
            >
              Open My Shop
            </div>
            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 13,
                lineHeight: 1.65,
              }}
            >
              Open your global shop viewing surface.
            </div>
          </Link>

          <Link to="/app/trust-slip" style={shortcutTile(false)}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
                lineHeight: 1.3,
              }}
            >
              Open TrustSlip
            </div>
            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 13,
                lineHeight: 1.65,
              }}
            >
              View and share your TrustSlip details.
            </div>
          </Link>

          <Link to="/app/my-gmfn-and-i" style={shortcutTile(false)}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
                lineHeight: 1.3,
              }}
            >
              My GMFN and I
            </div>
            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 13,
                lineHeight: 1.65,
              }}
            >
              Read the main guide in plain language.
            </div>
          </Link>
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
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                lineHeight: 1.7,
                fontSize: 14,
                maxWidth: 760,
              }}
            >
              Spotlight is shop-based. The image should dominate, while seller
              details stay secondary.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSpotlight((prev) => !prev)}
            style={secondaryBtn(false)}
          >
            {showSpotlight ? "Collapse" : "Open"}
          </button>
        </div>

        {showSpotlight ? (
          spotlightLoading ? (
            <div style={{ marginTop: 16, color: "#64748B" }}>
              Loading spotlight...
            </div>
          ) : activeSpotlight ? (
            <div style={{ marginTop: 16 }}>
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

              <div
                style={{
                  marginTop: 14,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "minmax(0, 1.3fr) minmax(320px, 0.7fr)",
                  gap: 14,
                  alignItems: "start",
                }}
              >
                <div style={softCard("#FCFEFF")}>
                  <div
                    style={{
                      color: "#5F7287",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    Spotlight note
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontSize: 15,
                      lineHeight: 1.85,
                    }}
                  >
                    {safeStr(
                      activeSpotlight.body ||
                        activeSpotlight.message ||
                        "No extra detail is available yet."
                    )}
                  </div>
                </div>

                <div style={softCard("#F8FBFF")}>
                  <div style={sectionLabel()}>Seller metadata</div>

                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        color: "#5F7287",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      <strong style={{ color: "#0B1F33" }}>Seller:</strong>{" "}
                      {safeStr(
                        activeSpotlight.source_shop_name ||
                          activeSpotlight.author_name ||
                          "Community seller"
                      )}
                    </div>

                    <div
                      style={{
                        color: "#5F7287",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      <strong style={{ color: "#0B1F33" }}>Community:</strong>{" "}
                      {safeStr(
                        activeSpotlight.source_clan_name || "Selected marketplace"
                      )}
                    </div>

                    <div
                      style={{
                        color: "#5F7287",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      <strong style={{ color: "#0B1F33" }}>Trust:</strong>{" "}
                      {safeStr(activeSpotlight.trust_band || "Trusted member")}
                    </div>

                    <div
                      style={{
                        color: "#5F7287",
                        fontSize: 14,
                        lineHeight: 1.7,
                      }}
                    >
                      <strong style={{ color: "#0B1F33" }}>Posted:</strong>{" "}
                      {safeDateTime(activeSpotlight.created_at) || "—"}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
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
                      Open shop
                    </button>

                    <Link to="/app/marketplace" style={secondaryBtn(false)}>
                      Open marketplace
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 16, color: "#64748B" }}>
              No active spotlight is available yet.
            </div>
          )
        ) : null}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
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
              <div style={sectionLabel()}>Notifications preview</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                A light summary of your latest system updates.
              </div>
            </div>

            <Link to="/app/notifications" style={secondaryBtn(false)}>
              Open
            </Link>
          </div>

          <div style={{ marginTop: 14 }}>
            <div
              style={{
                ...innerCard("#F8FBFF"),
                border:
                  unreadCount > 0
                    ? "1px solid rgba(11,99,209,0.16)"
                    : "1px solid rgba(11,31,51,0.08)",
              }}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 16,
                  lineHeight: 1.45,
                }}
              >
                {unreadCount > 0
                  ? `${unreadCount} notification${
                      unreadCount > 1 ? "s are" : " is"
                    } waiting`
                  : "No new notification right now"}
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                {noticesLoading
                  ? "Loading your latest updates..."
                  : latestNotice
                  ? `${notificationSourceLabel(latestNotice.kind)}: ${safeStr(
                      latestNotice.title || latestNotice.message || "New update"
                    )}`
                  : "Demand, trust, approval, spotlight, assistant, and money updates will appear here."}
              </div>

              {latestNotice?.created_at ? (
                <div
                  style={{
                    marginTop: 8,
                    color: "#64748B",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {safeDateTime(latestNotice.created_at)}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div style={pageCard("#FFFFFF")}>
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
              <div style={sectionLabel()}>Demand Box preview</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#5F7287",
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                Identity-based demand visible from your current community view.
              </div>
            </div>

            <Link to="/app/demand-box" style={secondaryBtn(false)}>
              Open
            </Link>
          </div>

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
          </div>
        </div>
      </section>
    </div>
  );
}