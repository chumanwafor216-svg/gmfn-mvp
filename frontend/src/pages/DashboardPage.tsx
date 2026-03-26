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

function smallBtn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    borderRadius: 12,
    border: primary
      ? "1px solid rgba(11,99,209,0.22)"
      : "1px solid rgba(11,31,51,0.12)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 13,
    gap: 8,
    opacity: disabled ? 0.85 : 1,
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
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [me, setMe] = useState<any>(null);
  const [trustSlip, setTrustSlip] = useState<any>(null);
  const [insight, setInsight] = useState<any>(null);

  const [spotlights, setSpotlights] = useState<SpotlightItem[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [showSpotlight, setShowSpotlight] = useState(true);

  const [pendingRequests, setPendingRequests] = useState<JoinRequestItem[]>([]);
  const [pendingRequestsLoading, setPendingRequestsLoading] = useState(false);

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
      if (!selectedClanId) {
        setPendingRequests([]);
        return;
      }

      setPendingRequestsLoading(true);
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
      } finally {
        setPendingRequestsLoading(false);
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

  const activeSpotlight = useMemo(() => {
    if (spotlights.length === 0) return null;
    return spotlights[spotlightIndex % spotlights.length] || spotlights[0];
  }, [spotlights, spotlightIndex]);

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

  const greetingName = safeStr(
    me?.display_name || me?.nickname || me?.email || "Member"
  );
  const profileName = safeStr(me?.display_name || me?.nickname || "Member");
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

  const myDemandItems = useMemo(() => {
    const mineId = safeStr(me?.gmfn_id || "");
    if (!mineId) return [];

    return demandItems.filter(
      (item) => safeStr(item.requester_gmfn_id || "") === mineId
    );
  }, [demandItems, me?.gmfn_id]);

  const joinRequestsLink = selectedClanId
    ? `/app/community/${selectedClanId}/join-requests`
    : "/app/community";

  const quickLinks = useMemo(
    () => [
      { label: "Community Home", to: "/app/community", primary: true },
      { label: "My Shop", to: myShopLink },
      { label: "Trust", to: "/app/trust" },
      { label: "Demand Box", to: "/app/demand-box" },
      { label: "Create Community", to: "/create" },
    ],
    [myShopLink]
  );

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
        to: joinRequestsLink,
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
    joinRequestsLink,
    myDemandItems.length,
  ]);

  const latestNotice = notices.length > 0 ? notices[0] : null;

  function openSpotlightShop() {
    const spotlightGmfnId = safeStr(activeSpotlight?.author_gmfn_id || "");
    if (!spotlightGmfnId) return;
    navigate(`/app/shop/${encodeURIComponent(spotlightGmfnId)}`);
  }

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
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div>
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
              This is your starting page. Check your trust position, review what
              needs attention, then move into Community Home, your shop, demand,
              or trust.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {quickLinks.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  style={item.primary ? actionBtn(true) : actionBtn(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 900 }}>
              Today’s Signal / Market Wisdom
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Identity preview</div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div
              style={{
                width: 120,
                height: 150,
                borderRadius: 22,
                overflow: "hidden",
                border: "1px solid rgba(11,31,51,0.12)",
                background: "linear-gradient(180deg, #E7F0FF 0%, #DDEBFF 100%)",
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
                One identity follows you across the communities you belong to.
                Use Community Home for your private control surface.
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
                  to="/app/community"
                  style={smallBtn(true) as React.CSSProperties}
                >
                  Open Community Home
                </Link>
                <Link
                  to={myShopLink}
                  style={smallBtn(false) as React.CSSProperties}
                >
                  Open My Shop
                </Link>
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
          <div style={sectionLabel()}>Trust quick summary</div>

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
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
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
                  color: "#64748B",
                  lineHeight: 1.7,
                  fontSize: 14,
                }}
              >
                Your latest updates appear here first.
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
                  : latestNotice
                  ? `${notificationSourceLabel(latestNotice.kind)}: ${safeStr(
                      latestNotice.title || latestNotice.message || "New update"
                    )}`
                  : "Demand, trust, approvals, spotlight, assistant prompts, and money updates will appear here."}
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
            <div style={sectionLabel()}>Spotlight display</div>
            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              Spotlight comes from shops visible in your current community
              network.
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSpotlight((prev) => !prev)}
            style={smallBtn(false)}
          >
            {showSpotlight ? "Collapse" : "Open"}
          </button>
        </div>

        {showSpotlight ? (
          spotlightLoading ? (
            <div style={{ marginTop: 14, color: "#64748B" }}>
              Loading spotlight...
            </div>
          ) : activeSpotlight ? (
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: spotlightImageSrc
                  ? "minmax(260px, 0.9fr) minmax(0, 1.1fr)"
                  : "1fr",
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
                      activeSpotlight.title ||
                        activeSpotlight.message ||
                        "Spotlight"
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
                    style={smallBtn(
                      true,
                      !safeStr(activeSpotlight.author_gmfn_id || "")
                    )}
                    onClick={openSpotlightShop}
                    disabled={!safeStr(activeSpotlight.author_gmfn_id || "")}
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
          )
        ) : null}
      </div>

      <div style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>What GSN is for</div>

        <div
          style={{
            marginTop: 10,
            color: "#0B1F33",
            fontWeight: 1000,
            fontSize: 20,
            lineHeight: 1.35,
          }}
        >
          GSN makes existing trust visible, structured, and usable in economic
          life.
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#64748B",
            fontSize: 14,
            lineHeight: 1.8,
            maxWidth: 760,
          }}
        >
          For the full explanation, open My GMFN and I. That is the main guide
          page for understanding how identity, trust, demand, spotlight, and
          community work together.
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
            to="/app/my-gmfn-and-i"
            style={smallBtn(true) as React.CSSProperties}
          >
            Open My GMFN and I
          </Link>
        </div>
      </div>
    </div>
  );
}