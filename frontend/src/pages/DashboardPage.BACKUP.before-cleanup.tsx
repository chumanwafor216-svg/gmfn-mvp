import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getCommunityJoinRequests,
  getDailyInsight,
  getMarketplaceBroadcasts,
  getMe,
  getMyUnreadNotificationCount,
  getSelectedClanId,
} from "../lib/api";

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

type CciState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
  whyText: string;
};

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 18,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function btn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    borderRadius: 12,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.12)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: "none",
    opacity: disabled ? 0.85 : 1,
  };
}

function smallBtn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 12px",
    borderRadius: 12,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.12)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.85 : 1,
  };
}

function tiny(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.2,
  };
}

function safeStr(x: any): string {
  return String(x ?? "");
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

const MARKET_WISDOM_ROTATION = [
  "Stay consistent. Small positive actions strengthen long-term trust.",
  "Paying back on time protects your future access across the network.",
  "Trust grows when members keep promises and communicate clearly.",
  "A good reputation can open doors faster than money alone.",
  "Use spotlight wisely. Announce what matters and respect people’s attention.",
  "Invite people you truly know. Strong communities begin with real trust.",
];

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
        statusText: "Healthy across your communities",
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
        statusText: "Healthy across your communities",
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
    whyText:
      "Recent trust-change explanation will appear through notifications when available.",
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

export default function DashboardPage() {
  const navigate = useNavigate();

  const [me, setMe] = useState<any>(null);
  const [insight, setInsight] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const [spotlights, setSpotlights] = useState<SpotlightItem[]>([]);
  const [spotlightLoading, setSpotlightLoading] = useState(false);
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [spotlightOpen, setSpotlightOpen] = useState(true);

  const [showPictureTools, setShowPictureTools] = useState(false);
  const [showIdentityDetails, setShowIdentityDetails] = useState(false);
  const [showSetup, setShowSetup] = useState(true);
  const [marketWisdomIndex, setMarketWisdomIndex] = useState(0);

  const avatarStorageKey = "gmfn.member.avatar";
  const fallbackAvatar = "/assets/user-default.png";
  const [avatarSrc, setAvatarSrc] = useState<string>(fallbackAvatar);

  useEffect(() => {
    setAvatarSrc(readStoredImage(avatarStorageKey, fallbackAvatar));
  }, []);

  useEffect(() => {
    (async () => {
      const [meRes, insightRes, unreadRes] = await Promise.all([
        getMe().catch(() => null),
        getDailyInsight().catch(() => null),
        getMyUnreadNotificationCount().catch(() => null),
      ]);

      setMe(meRes);
      setInsight(insightRes);
      setUnread(Number(unreadRes?.unread_count || 0));
    })();
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const clanId = Number(getSelectedClanId() || 0);
        if (!clanId) return;

        const res = await getCommunityJoinRequests(clanId);
        const rows = Array.isArray(res) ? res : res?.items || [];

        const pending = rows.filter(
          (r: any) => String(r.status || "").toLowerCase() === "pending"
        );

        setPendingRequests(pending);
      } catch {
        setPendingRequests([]);
      }
    }

    load();
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
    if (spotlights.length <= 1) return;
    const timer = window.setInterval(() => {
      setSpotlightIndex((prev) => (prev + 1) % spotlights.length);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [spotlights.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMarketWisdomIndex(
        (prev) => (prev + 1) % MARKET_WISDOM_ROTATION.length
      );
    }, 24000);
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

  const hasAvatar = avatarSrc !== fallbackAvatar;
  const hasIdentity = Boolean(me?.gmfn_id || me?.email || me?.nickname);
  const hasShopIdentity = Boolean(me?.gmfn_id);
  const setupDoneCount = [hasIdentity, hasAvatar, hasShopIdentity].filter(Boolean)
    .length;

  function openSpotlightShop() {
    const gmfnId = String(activeSpotlight?.author_gmfn_id || "").trim();

    if (!gmfnId) {
      console.warn("Missing author_gmfn_id in spotlight:", activeSpotlight);
      return;
    }

    navigate(`/app/shop/${encodeURIComponent(gmfnId)}`);
  }

  function openMyShop() {
    const gmfnId = String(me?.gmfn_id || "").trim();
    if (!gmfnId) return;
    navigate(`/app/shop/${encodeURIComponent(gmfnId)}`);
  }

  function openManageMyShop() {
    navigate("/app/shop-control");
  }

  function openJoinRequests() {
    const clanId = getSelectedClanId();
    if (!clanId) {
      alert("No community selected");
      return;
    }
    navigate(`/app/community/${clanId}/join-requests`);
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 30 }}>
      <div
        style={{
          ...card("#F8FBFF"),
          marginTop: 18,
          paddingTop: 14,
          paddingBottom: 14,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 1000, color: "#0B1F33" }}>
          Dashboard
        </div>
        <div
          style={{
            marginTop: 4,
            color: "#6B7A88",
            lineHeight: 1.6,
            fontSize: 14,
          }}
        >
          Check your identity, trust position, community spotlight, and your next
          action.
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>PERSONAL IDENTITY</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "1.3fr 0.7fr",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div style={softCard()}>
            <div
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: 22,
                overflow: "hidden",
                border: "1px solid rgba(11,31,51,0.08)",
                background: "#EAF2FF",
              }}
            >
              <img
                src={avatarSrc}
                alt="My Picture"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                style={smallBtn(false)}
                onClick={() => setShowPictureTools((v) => !v)}
              >
                {showPictureTools ? "Close Picture Tools" : "Manage Picture"}
              </button>
            </div>

            {showPictureTools ? (
              <div
                style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}
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
                  Take Picture
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={onTakePicture}
                    style={{ display: "none" }}
                  />
                </label>

                <label style={smallBtn(false)}>
                  Change
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onUpload}
                    style={{ display: "none" }}
                  />
                </label>

                <button type="button" style={smallBtn(false)} onClick={removeAvatar}>
                  Remove
                </button>
              </div>
            ) : null}
          </div>

          <div style={softCard()}>
            <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 20 }}>
              {safeStr(me?.display_name || me?.nickname || me?.email || "Member")}
            </div>

            <div style={{ marginTop: 8, ...tiny() }}>GMFN ID</div>
            <div style={{ fontWeight: 1000, fontSize: 16, color: "#0B1F33" }}>
              {safeStr(me?.gmfn_id || "Pending")}
            </div>

            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                style={smallBtn(false)}
                onClick={() => setShowIdentityDetails((v) => !v)}
              >
                {showIdentityDetails ? "Hide Details" : "Show Details"}
              </button>
            </div>

            {showIdentityDetails ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: "#FFFFFF",
                  border: "1px solid rgba(11,31,51,0.08)",
                  display: "grid",
                  gap: 6,
                  fontSize: 13,
                }}
              >
                <div>
                  <strong>Email:</strong> {safeStr(me?.email || "—")}
                </div>
                <div>
                  <strong>Nickname:</strong> {safeStr(me?.nickname || "—")}
                </div>
                <div>
                  <strong>Member ID:</strong> {safeStr(me?.id || "—")}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>CROSS-COMMUNITY TRUST</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 14,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              borderRadius: 18,
              background: cciTone.bg,
              border: cciTone.border,
              padding: 16,
              color: cciTone.text,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 1000 }}>CCI CLASS</div>
            <div style={{ marginTop: 8, fontSize: 32, fontWeight: 1000 }}>
              {cci.classText}
            </div>
            <div style={{ marginTop: 8, fontSize: 14, fontWeight: 900 }}>
              Score {cci.scoreText}
            </div>
          </div>

          <div
            style={{
              borderRadius: 18,
              border: "1px solid rgba(11,31,51,0.08)",
              background: "#FFFFFF",
              padding: 16,
            }}
          >
            <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
              {cci.statusText}
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Cross-client integrity shows how your actions are being read across
              the wider GMFN network, not just inside one community.
            </div>
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 12,
                background: "#F8FBFF",
                border: "1px solid rgba(11,31,51,0.08)",
                color: "#0B1F33",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              <strong>Why it changed:</strong> {cci.whyText}
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
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
            <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 22 }}>
              Complete Your Setup
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              New members should complete these steps before full activity begins.
            </div>
          </div>

          <button
            type="button"
            style={smallBtn(false)}
            onClick={() => setShowSetup((v) => !v)}
          >
            {showSetup ? "Hide Setup" : "Show Setup"}
          </button>
        </div>

        <div style={{ marginTop: 12, color: "#64748B", fontSize: 13 }}>
          Progress: {setupDoneCount} / 3 ready
        </div>

        {showSetup ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div style={softCard()}>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                1. Identity
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                Confirm your visible member details and picture.
              </div>
              <div
                style={{
                  marginTop: 10,
                  color: hasIdentity ? "#166534" : "#92400E",
                  fontWeight: 900,
                }}
              >
                {hasIdentity ? "Ready" : "Needs attention"}
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  style={smallBtn(false)}
                  onClick={() => setShowIdentityDetails(true)}
                >
                  Open Identity
                </button>
              </div>
            </div>

            <div style={softCard()}>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                2. Money In & Out
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                Add your money details before full use of the app.
              </div>
              <div style={{ marginTop: 10, color: "#92400E", fontWeight: 900 }}>
                Required
              </div>
              <div style={{ marginTop: 12 }}>
                <Link to="/app/community" style={smallBtn(false) as React.CSSProperties}>
                  Open Setup Path
                </Link>
              </div>
            </div>

            <div style={softCard()}>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                3. Create / Manage My Shop
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                Create your shop, add products and keep your shop identity ready.
              </div>
              <div
                style={{
                  marginTop: 10,
                  color: hasShopIdentity ? "#166534" : "#92400E",
                  fontWeight: 900,
                }}
              >
                {hasShopIdentity ? "Shop path available" : "Shop path pending"}
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  style={smallBtn(false)}
                  onClick={openManageMyShop}
                >
                  Manage My Shop
                </button>
              </div>
            </div>

            <div style={softCard()}>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>4. Spotlight</div>
              <div
                style={{
                  marginTop: 6,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                When your shop is ready, use spotlight to announce yourself properly.
              </div>
              <div style={{ marginTop: 10, color: "#92400E", fontWeight: 900 }}>
                Controlled through shop management
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  style={smallBtn(false)}
                  onClick={openManageMyShop}
                >
                  Open Spotlight Handle
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>MOST USED ACTIONS</div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/app/community" style={btn(true)}>
            Open Community
          </Link>

          {myShopLink ? (
            <button type="button" style={btn(false)} onClick={openMyShop}>
              Open My Shop
            </button>
          ) : (
            <button type="button" style={btn(false, true)} disabled>
              Open My Shop
            </button>
          )}

          <button type="button" style={btn(false)} onClick={openManageMyShop}>
            Manage My Shop
          </button>

          <Link to="/app/marketplace" style={btn(false)}>
            Open Marketplace
          </Link>

          <Link to="/app/clans" style={btn(false)}>
            Open Finances
          </Link>

          <Link to="/app/trust-slip" style={btn(false)}>
            Open TrustSlip
          </Link>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={tiny()}>MEMBERSHIP REQUESTS / NOTIFICATIONS</div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 18,
            border: "1px solid rgba(11,31,51,0.08)",
            background: "#FFFFFF",
            padding: 18,
            boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 1000, color: "#0B1F33" }}>
            Membership Requests
          </div>

          <div style={{ marginTop: 8, color: "#64748B", lineHeight: 1.6 }}>
            Review people asking to join your community.
          </div>

          {pendingRequests.length > 0 ? (
            <div style={{ marginTop: 14 }}>
              {pendingRequests.map((req: any, idx: number) => (
                <div
                  key={req.id || idx}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: "#F8FAFC",
                    border: "1px solid rgba(11,31,51,0.06)",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ fontWeight: 900, color: "#0B1F33" }}>
                    {req.applicant_email || "A member"}
                  </div>

                  <div style={{ marginTop: 4, fontSize: 13, color: "#475569" }}>
                    invited by{" "}
                    <strong>{req.invited_by_email || "community member"}</strong>
                  </div>

                  <div style={{ marginTop: 4, fontSize: 13, color: "#475569" }}>
                    wants to join{" "}
                    <strong>{req.clan_name || "this community"}</strong>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={openJoinRequests}
                style={{
                  marginTop: 8,
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "#0B63D1",
                  color: "#fff",
                  border: "none",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Review Requests
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 14, color: "#94A3B8" }}>
              No pending requests at the moment.
            </div>
          )}
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
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
            <div style={tiny()}>COMMUNITY SPOTLIGHT</div>
            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Spotlight gives a direct shop-page entry for the current seller.
            </div>
          </div>

          <button
            type="button"
            style={smallBtn(false)}
            onClick={() => setSpotlightOpen((v) => !v)}
          >
            {spotlightOpen ? "Hide Spotlight" : "Show Spotlight"}
          </button>
        </div>

        {spotlightOpen ? (
          spotlightLoading ? (
            <div style={{ marginTop: 14, color: "#64748B" }}>
              Loading spotlight...
            </div>
          ) : activeSpotlight ? (
            <div style={{ marginTop: 16 }}>
              {spotlightImageSrc ? (
                <div
                  style={{
                    width: "100%",
                    minHeight: 300,
                    borderRadius: 22,
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
                      height: 300,
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 300,
                    borderRadius: 22,
                    border: "1px solid rgba(11,31,51,0.08)",
                    background:
                      "linear-gradient(135deg, rgba(11,99,209,0.08) 0%, rgba(234,242,255,1) 35%, rgba(255,255,255,1) 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748B",
                    fontWeight: 900,
                    fontSize: 20,
                  }}
                >
                  Spotlight Image Not Available
                </div>
              )}

              <div
                style={{
                  marginTop: 16,
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 24,
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
                  lineHeight: 1.7,
                }}
              >
                {safeStr(activeSpotlight.body || activeSpotlight.message || "")}
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                <div style={{ color: "#64748B", fontSize: 14 }}>
                  Posted: {safeDateTime(activeSpotlight.created_at) || "—"}
                </div>
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
                  {activeSpotlight.trust_score !== null &&
                  activeSpotlight.trust_score !== undefined &&
                  String(activeSpotlight.trust_score).trim() !== ""
                    ? ` · Score ${activeSpotlight.trust_score}`
                    : ""}
                </div>
                <div style={{ color: "#64748B", fontSize: 14 }}>
                  Community:{" "}
                  {safeStr(
                    activeSpotlight.source_clan_name
                      ? `${activeSpotlight.source_clan_name} Marketplace`
                      : "Selected marketplace"
                  )}
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  style={btn(
                    true,
                    !String(activeSpotlight.author_gmfn_id || "").trim()
                  )}
                  onClick={openSpotlightShop}
                  disabled={!String(activeSpotlight.author_gmfn_id || "").trim()}
                >
                  Open Shop Page
                </button>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 14, color: "#64748B" }}>
              No active spotlight available yet.
            </div>
          )
        ) : null}
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
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
            <div style={{ color: "#C2410C", fontWeight: 1000, fontSize: 18 }}>
              💡 GMFN Market Wisdom
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Global GMFN guidance and worldwide market signals for all members.
            </div>
          </div>

          <button
            type="button"
            style={smallBtn(false)}
            onClick={() =>
              setMarketWisdomIndex(
                (prev) => (prev + 1) % MARKET_WISDOM_ROTATION.length
              )
            }
          >
            Next Wisdom
          </button>
        </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 16,
            border: "1px solid rgba(11,31,51,0.08)",
            background: "#FFF9F5",
            padding: 16,
            color: "#7C2D12",
            fontSize: 15,
            lineHeight: 1.7,
            fontWeight: 700,
          }}
        >
          {safeStr(insight?.text || MARKET_WISDOM_ROTATION[marketWisdomIndex])}
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
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
            <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 22 }}>
              Notifications
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              Local updates from your communities and network activity.
            </div>
          </div>

          <Link to="/app/notifications" style={btn(false)}>
            Open Notifications
          </Link>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "220px 1fr",
            gap: 14,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(11,31,51,0.08)",
              background: "#F8FBFF",
              padding: 16,
            }}
          >
            <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>
              UNREAD
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: 34,
                fontWeight: 1000,
              }}
            >
              {unread}
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(11,31,51,0.08)",
              background: "#FFFFFF",
              padding: 16,
            }}
          >
            <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
              What you will see here
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#64748B",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              Invitations, trust-related actions, community activity, approvals,
              reminders, and other network updates will appear inside your
              notifications area.
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 22 }}>
          Community Social Space
        </div>
        <div
          style={{
            marginTop: 6,
            color: "#64748B",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          This is reserved for the social side of community life. It is not active
          yet.
        </div>
      </div>
    </div>
  );
}
export async function getJoinRequestStatus(requestId: number) {
  const res = await fetch(
    `/api/clans/join-requests/${requestId}/status`
  );
  return res.json();
}

export async function activateMembership(payload: {
  gmfn_id: string;
  password: string;
  confirm_password: string;
}) {
  const res = await fetch(`/api/auth/activate-membership`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return res.json();
}