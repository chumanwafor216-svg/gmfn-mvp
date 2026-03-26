import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

type CciState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
  whyText: string;
};

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 22px 54px rgba(15,23,42,0.07), 0 2px 8px rgba(15,23,42,0.03)",
    position: "relative",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
    position: "relative",
    overflow: "hidden",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
    boxShadow: "0 8px 18px rgba(15,23,42,0.035)",
  };
}

function actionBtn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(11,99,209,0.22)"
      : "1px solid rgba(11,31,51,0.12)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.85 : 1,
    fontSize: 14,
    gap: 8,
  };
}

function smallBtn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(11,99,209,0.22)"
      : "1px solid rgba(11,31,51,0.12)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    textDecoration: "none",
    cursor: "pointer",
    fontSize: 13,
    gap: 8,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#475569",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
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

function readStoredImage(key: string, fallbackSrc: string): string {
  try {
    return localStorage.getItem(key) || fallbackSrc;
  } catch {
    return fallbackSrc;
  }
}

function writeStoredImage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function removeStoredImage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
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

function getCciState(me: any): CciState {
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
        statusText: "Healthy across your visible communities",
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
        statusText: "Healthy across your visible communities",
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
    statusText: "Trust status is being prepared",
    whyText: "A fuller trust explanation will appear when available.",
  };
}

function cciToneStyles(tone: "green" | "yellow" | "red" | "neutral") {
  if (tone === "green") {
    return {
      bg: "#F0FDF4",
      border: "1px solid rgba(34,197,94,0.18)",
      text: "#166534",
    };
  }

  if (tone === "yellow") {
    return {
      bg: "#FFFBEB",
      border: "1px solid rgba(245,158,11,0.18)",
      text: "#92400E",
    };
  }

  if (tone === "red") {
    return {
      bg: "#FEF2F2",
      border: "1px solid rgba(239,68,68,0.18)",
      text: "#991B1B",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid rgba(148,163,184,0.18)",
    text: "#334155",
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

  const [me, setMe] = useState<any>(null);
  const [trustSlip, setTrustSlip] = useState<any>(null);
  const [insight, setInsight] = useState<any>(null);

  const [spotlights, setSpotlights] = useState<SpotlightItem[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const [pendingRequests, setPendingRequests] = useState<JoinRequestItem[]>([]);
  const [pendingRequestsLoading, setPendingRequestsLoading] = useState(false);

  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [noticesLoading, setNoticesLoading] = useState(false);

  const [demandItems, setDemandItems] = useState<DemandItem[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);

  const [showPictureTools, setShowPictureTools] = useState(false);
  const [showGsnGuidePrompt, setShowGsnGuidePrompt] = useState(true);
  const [marketWisdomIndex, setMarketWisdomIndex] = useState(0);
  const [activeWisdom, setActiveWisdom] = useState<MarketWisdomPair | null>(
    null
  );

  const avatarStorageKey = "gmfn.member.avatar";
  const fallbackAvatar = "/assets/user-default.png";
  const [avatarSrc, setAvatarSrc] = useState<string>(fallbackAvatar);

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

        const items: SpotlightItem[] = Array.isArray(res?.items) ? res.items : [];
        setSpotlights(items);
      } finally {
        setSpotlightLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const clanId = Number(getSelectedClanId() || 0);
      if (!clanId) {
        setPendingRequests([]);
        return;
      }

      setPendingRequestsLoading(true);
      try {
        const res = await getCommunityJoinRequests(clanId).catch(() => ({
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
      } finally {
        setPendingRequestsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setNoticesLoading(true);
      try {
        const res = await getMyNotifications(12, false).catch(() => ({
          items: [],
        }));
        const rows: NoticeItem[] = Array.isArray(res?.items) ? res.items : [];
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

  function applyAvatarFile(file?: File | null) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      if (!result) return;
      setAvatarSrc(result);
      writeStoredImage(avatarStorageKey, result);
    };
    reader.readAsDataURL(file);
  }

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    applyAvatarFile(e.target.files?.[0] || null);
    e.currentTarget.value = "";
  }

  function onTakePicture(e: React.ChangeEvent<HTMLInputElement>) {
    applyAvatarFile(e.target.files?.[0] || null);
    e.currentTarget.value = "";
  }

  function removeAvatar() {
    setAvatarSrc(fallbackAvatar);
    removeStoredImage(avatarStorageKey);
  }

  function shareGsnGuide() {
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    const guideUrl = `${base}/GSN_FINAL_WHITE.pdf`;
    const text = `See what GSN can do for you:\n\n${guideUrl}`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }

  const activeSpotlight = useMemo(() => {
    if (spotlights.length === 0) return null;
    return spotlights[spotlightIndex % spotlights.length] || spotlights[0];
  }, [spotlights, spotlightIndex]);

  const spotlightImageSrc = String(
    activeSpotlight?.image_url || activeSpotlight?.image || ""
  ).trim();

  const myShopLink = String(me?.gmfn_id || "").trim()
    ? `/app/shop/${encodeURIComponent(String(me?.gmfn_id || "").trim())}`
    : "";

  const cci = useMemo(() => getCciState(me), [me]);
  const cciTone = useMemo(() => cciToneStyles(cci.tone), [cci.tone]);

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

  function openSpotlightShop() {
    const gmfnId = String(activeSpotlight?.author_gmfn_id || "").trim();
    if (!gmfnId) return;
    navigate(`/app/shop/${encodeURIComponent(gmfnId)}`);
  }

  const greetingName = safeStr(
    me?.display_name || me?.nickname || me?.email || "Member"
  );
  const profileName = safeStr(me?.display_name || me?.nickname || "Member");
  const gmfnId = safeStr(me?.gmfn_id || "Pending");
  const trustSlipCode = safeStr(trustSlip?.code || "").trim();

  const myDemandItems = useMemo(() => {
    return demandItems.filter((item) => {
      const mineId = safeStr(me?.gmfn_id || "");
      const itemId = safeStr(item.requester_gmfn_id || "");
      return !!mineId && !!itemId && mineId === itemId;
    });
  }, [demandItems, me?.gmfn_id]);

  const unreadCount = useMemo(
    () => notices.filter((n) => !n?.is_read).length,
    [notices]
  );

  const quickActions = useMemo(() => {
    return [
      { label: "My Shop", to: myShopLink || "/app/shop-control" },
      { label: "What GSN Can Do", to: "/GSN_FINAL_WHITE.pdf" },
    ] as Array<{ label: string; to: string; primary?: boolean }>;
  }, [myShopLink]);

  const attentionItems = useMemo(() => {
    return [
      {
        title: "Notifications",
        value: unreadCount,
        subtitle: unreadCount > 0 ? "Needs review" : "Nothing urgent",
        to: "/app/notifications",
      },
      {
        title: "Join requests",
        value: pendingRequestsLoading ? "…" : String(pendingRequests.length),
        subtitle:
          pendingRequests.length > 0
            ? "Community action needed"
            : "No pending request",
        to: "/app/clans",
      },
      {
        title: "Your demand posts",
        value: String(myDemandItems.length),
        subtitle:
          myDemandItems.length > 0 ? "Open your requests" : "No open post",
        to: "/app/demand-box",
      },
    ];
  }, [
    unreadCount,
    pendingRequests.length,
    pendingRequestsLoading,
    myDemandItems.length,
  ]);

  return (
    <div
      style={{
        maxWidth: 1160,
        margin: "0 auto",
        paddingBottom: 36,
        display: "grid",
        gap: 18,
      }}
    >
      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 18,
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ maxWidth: 760 }}>
            <div style={sectionLabel()}>Dashboard</div>

            <h1
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 30,
                lineHeight: 1.15,
              }}
            >
              Good to see you, {greetingName}
            </h1>

            <div
              style={{
                marginTop: 10,
                color: "#64748B",
                fontSize: 15,
                lineHeight: 1.8,
                maxWidth: 760,
              }}
            >
              This is your simple starting page. Begin from your identity, check
              what needs attention, then move into Community Home, your shop,
              demand, or trust.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {quickActions.map((item) => {
                const isGuideFile =
                  item.to.endsWith(".pdf") || item.to.endsWith(".docx");

                return isGuideFile ? (
                  <a
                    key={item.label}
                    href={item.to}
                    target="_blank"
                    rel="noreferrer"
                    style={item.primary ? actionBtn(true) : actionBtn(false)}
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    to={item.to}
                    style={item.primary ? actionBtn(true) : actionBtn(false)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          <div
            style={{
              minWidth: 240,
              flex: "0 1 290px",
              ...softCard("#FFFFFF"),
            }}
          >
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 900 }}>
              Today’s signal
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 18,
                lineHeight: 1.4,
              }}
            >
              {safeStr(
                activeWisdom?.proverb ||
                  insight?.text ||
                  "Stay visible, stay trustworthy."
              )}
            </div>

            {safeStr(activeWisdom?.gmfn || "") ? (
              <div
                style={{
                  marginTop: 10,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                {safeStr(activeWisdom?.gmfn || "")}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {showGsnGuidePrompt ? (
        <div
          style={{
            ...pageCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
            border: "1px solid rgba(11,99,209,0.14)",
            boxShadow: "0 18px 40px rgba(11,99,209,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={sectionLabel()}>Start here</div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 22,
                  fontWeight: 1000,
                  color: "#0B1F33",
                  lineHeight: 1.3,
                }}
              >
                Do you know what GSN can do for you?
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.85,
                  maxWidth: 760,
                }}
              >
                Before you continue, open the GSN guide and see how trust can
                support trade, loans, savings groups, work, reputation, Demand
                Box, Spotlight, and community opportunity across the network.
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <a
                  href="/GSN_FINAL_WHITE.pdf"
                  target="_blank"
                  rel="noreferrer"
                  style={smallBtn(true)}
                >
                  Read What GSN Can Do
                </a>

                <button
                  type="button"
                  style={smallBtn(false)}
                  onClick={shareGsnGuide}
                >
                  Forward to a Friend
                </button>

                <button
                  type="button"
                  style={smallBtn(false)}
                  onClick={() => setShowGsnGuidePrompt(false)}
                >
                  Continue to Dashboard
                </button>
              </div>
            </div>

            <div
              style={{
                minWidth: 180,
                maxWidth: 220,
                ...innerCard("#FFFFFF"),
                boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 1000,
                  color: "#4F6B8A",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Included in the guide
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gap: 8,
                  color: "#0B1F33",
                  fontSize: 14,
                  lineHeight: 1.6,
                }}
              >
                <div>• Trade before payment</div>
                <div>• Loans and support</div>
                <div>• Trust savings / ROSCA</div>
                <div>• Spotlight visibility</div>
                <div>• Demand Box access</div>
                <div>• One identity across communities</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.9fr 1.1fr",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>My identity</div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "140px 1fr",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div>
              <div
                style={{
                  width: 140,
                  height: 180,
                  borderRadius: 22,
                  overflow: "hidden",
                  border: "1px solid rgba(11,31,51,0.12)",
                  background:
                    "linear-gradient(180deg, #E7F0FF 0%, #DDEBFF 100%)",
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
                  style={smallBtn(false)}
                  onClick={() => setShowPictureTools((v) => !v)}
                >
                  {showPictureTools ? "Hide tools" : "Picture tools"}
                </button>
              </div>

              {showPictureTools ? (
                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <label style={smallBtn(true)}>
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onUpload}
                      style={{ display: "none" }}
                    />
                  </label>

                  <label style={smallBtn(false)}>
                    Take
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={onTakePicture}
                      style={{ display: "none" }}
                    />
                  </label>

                  <button
                    type="button"
                    style={smallBtn(false)}
                    onClick={removeAvatar}
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
                  fontWeight: 1000,
                  fontSize: 24,
                  lineHeight: 1.2,
                }}
              >
                {profileName}
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>GMFN ID: {gmfnId}</span>
              </div>

              <div
                style={{
                  marginTop: 12,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.8,
                }}
              >
                Your identity travels with you across the communities you belong
                to. Start from Community Home to see your communities, members,
                and shop access clearly.
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            ...pageCard(cciTone.bg),
            border: cciTone.border,
          }}
        >
          <div style={sectionLabel()}>Trust standing</div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: 1000,
                  lineHeight: 1,
                  color: cciTone.text,
                }}
              >
                {cci.classText}
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "7px 12px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.82)",
                  border: cciTone.border,
                  fontSize: 13,
                  fontWeight: 900,
                  color: cciTone.text,
                }}
              >
                Score: {cci.scoreText}
              </div>
            </div>

            {trustSlipCode ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <img
                  src={`${apiOrigin()}/trust-slips/verify/${encodeURIComponent(
                    trustSlipCode
                  )}/qr.png`}
                  alt="Trust QR"
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: 12,
                    border: "1px solid rgba(11,31,51,0.10)",
                    background: "#FFFFFF",
                    padding: 4,
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
              </div>
            ) : null}
          </div>

          <div
            style={{
              marginTop: 16,
              fontSize: 18,
              fontWeight: 900,
              lineHeight: 1.5,
              color: cciTone.text,
            }}
          >
            {cci.statusText}
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: 14,
              lineHeight: 1.8,
              color: cciTone.text,
              maxWidth: 640,
            }}
          >
            {cci.whyText}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/app/trust-slip"
              style={smallBtn(true) as React.CSSProperties}
            >
              Open TrustSlip
            </Link>
            <Link
              to="/app/trust"
              style={smallBtn(false) as React.CSSProperties}
            >
              Open Trust
            </Link>
          </div>
        </div>
      </div>

      <div style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>What needs attention</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
          }}
        >
          {attentionItems.map((item) => (
            <div key={item.title} style={softCard("#F8FBFF")}>
              <div style={{ fontSize: 13, color: "#64748B", fontWeight: 800 }}>
                {item.title}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 28,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                {item.subtitle}
              </div>
              <div style={{ marginTop: 12 }}>
                <Link
                  to={item.to}
                  style={smallBtn(false) as React.CSSProperties}
                >
                  Open
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
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
              <div style={sectionLabel()}>Notifications</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                Your latest update appears here first.
              </div>
            </div>

            <Link
              to="/app/notifications"
              style={smallBtn(false) as React.CSSProperties}
            >
              Open
            </Link>
          </div>

          <div style={{ marginTop: 14 }}>
            <div
              style={{
                ...innerCard("#F8FBFF"),
                border:
                  unreadCount > 0
                    ? "1px solid rgba(11,99,209,0.18)"
                    : "1px solid rgba(11,31,51,0.08)",
              }}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 16,
                }}
              >
                {unreadCount > 0
                  ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} waiting`
                  : "No new notification right now"}
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                {noticesLoading
                  ? "Loading your latest updates..."
                  : notices.length > 0
                  ? `${notificationSourceLabel(notices[0]?.kind)}: ${safeStr(
                      notices[0]?.title || notices[0]?.message || "New update"
                    )}`
                  : "Demand, trust, approvals, spotlight, assistant prompts, and money updates will appear here."}
              </div>
            </div>
          </div>
        </div>

        <div style={pageCard("#FFFFFF")}>
          <div>
            <div style={sectionLabel()}>Demand Box preview</div>
            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              Identity-based demand from members in your visible communities.
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {demandLoading ? (
              <div style={{ color: "#64748B" }}>Loading demand activity...</div>
            ) : demandItems.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.7 }}>
                No open demand is visible right now.
              </div>
            ) : (
              demandItems.slice(0, 3).map((item, idx) => (
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
                    <div style={{ color: "#0B1F33", fontWeight: 1000 }}>
                      {safeStr(item.title || "Need")}
                    </div>

                    <span style={badge(false)}>{urgencyLabel(item.urgency)}</span>
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      color: "#64748B",
                      fontSize: 14,
                      lineHeight: 1.7,
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

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/app/demand-box"
              style={smallBtn(true) as React.CSSProperties}
            >
              Open Demand Box
            </Link>
            <Link
              to="/app/marketplace"
              style={smallBtn(false) as React.CSSProperties}
            >
              Marketplace
            </Link>
          </div>
        </div>
      </div>

      <div style={pageCard("#FFFFFF")}>
        <div>
          <div style={sectionLabel()}>Spotlight preview</div>
          <div
            style={{
              marginTop: 8,
              color: "#64748B",
              lineHeight: 1.7,
              fontSize: 14,
            }}
          >
            Spotlight comes from shop owners inside your visible community network.
          </div>
        </div>

        {spotlightLoading ? (
          <div style={{ marginTop: 14, color: "#64748B" }}>
            Loading spotlight...
          </div>
        ) : activeSpotlight ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: spotlightImageSrc ? "0.9fr 1.1fr" : "1fr",
              gap: 16,
              alignItems: "stretch",
            }}
          >
            {spotlightImageSrc ? (
              <div
                style={{
                  width: "100%",
                  minHeight: 220,
                  borderRadius: 18,
                  overflow: "hidden",
                  background: "#EAF2FF",
                  border: "1px solid rgba(11,31,51,0.08)",
                }}
              >
                <img
                  src={resolveSpotlightImageSrc(spotlightImageSrc)}
                  alt={safeStr(
                    activeSpotlight.title || activeSpotlight.message || "Spotlight"
                  )}
                  style={{
                    width: "100%",
                    height: "100%",
                    minHeight: 220,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            ) : null}

            <div style={softCard("#FCFEFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 22,
                  lineHeight: 1.3,
                }}
              >
                {safeStr(
                  activeSpotlight.title ||
                    activeSpotlight.message ||
                    "Community Spotlight"
                )}
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.8,
                }}
              >
                {safeStr(activeSpotlight.body || activeSpotlight.message || "")}
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                <div style={{ color: "#64748B", fontSize: 14 }}>
                  Seller:{" "}
                  {safeStr(
                    activeSpotlight.source_shop_name ||
                      activeSpotlight.author_name ||
                      "Community seller"
                  )}
                </div>

                <div style={{ color: "#64748B", fontSize: 14 }}>
                  Trust: {safeStr(activeSpotlight.trust_band || "Trusted Member")}
                </div>

                <div style={{ color: "#64748B", fontSize: 14 }}>
                  Posted: {safeDateTime(activeSpotlight.created_at) || "—"}
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
                  style={smallBtn(true)}
                  onClick={openSpotlightShop}
                  disabled={!String(activeSpotlight.author_gmfn_id || "").trim()}
                >
                  Open shop
                </button>

                <Link
                  to="/app/marketplace"
                  style={smallBtn(false) as React.CSSProperties}
                >
                  Open marketplace
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, color: "#64748B" }}>
            No active spotlight is available yet.
          </div>
        )}
      </div>


      <div style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Socials</div>

        <div
          style={{
            marginTop: 10,
            color: "#0B1F33",
            fontWeight: 1000,
            fontSize: 20,
          }}
        >
          Coming soon
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#64748B",
            fontSize: 14,
            lineHeight: 1.8,
          }}
        >
          Social and community interaction space will come later, after the core
          trust, approval, demand, and market workflow is fully stabilised.
        </div>
      </div>
    </div>
  );
}