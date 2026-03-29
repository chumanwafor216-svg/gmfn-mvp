import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  createMarketplaceBroadcast,
  deleteMarketplaceBroadcast,
  getClanInviteLink,
  getMarketplaceBroadcasts,
  getPoolMe,
  getSelectedClanId,
  listMyClans,
  safeCopy,
  selectClan,
  uploadMarketplaceImageFile,
} from "../lib/api";

type ClanItem = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  clan_name?: string | null;
  description?: string | null;
  clan_description?: string | null;
  marketplace_name?: string | null;
  marketplace_description?: string | null;
  community_global_id?: string | null;
  global_id?: string | null;
  gmfn_id?: string | null;
  clan_code?: string | null;
  code?: string | null;
  trust_band?: string | null;
  trust_class?: string | null;
  community_trust_band?: string | null;
  member_count?: number | null;
  members_count?: number | null;
};

type SpotlightItem = {
  id?: number;
  clan_id?: number;
  message?: string | null;
  tag_number?: string | null;
  image_url?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

type NoticeTone = "success" | "error";

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

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function getClanId(clan: ClanItem | null | undefined): number {
  return Number(clan?.id || clan?.clan_id || 0);
}

function getClanName(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    clan?.name,
    clan?.clan_name,
    clan?.marketplace_name,
    "Community"
  );
}

function getClanDescription(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    clan?.description,
    clan?.clan_description,
    clan?.marketplace_description,
    "This community is available from your private Community Home."
  );
}

function getClanGlobalId(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    clan?.community_global_id,
    clan?.global_id,
    clan?.gmfn_id,
    clan?.clan_code,
    clan?.code,
    getClanId(clan) ? `COMM-${getClanId(clan)}` : "",
    "Pending"
  );
}

function getClanTrust(clan: ClanItem | null | undefined): string {
  return firstTruthy(
    clan?.community_trust_band,
    clan?.trust_band,
    clan?.trust_class,
    "Visible community"
  );
}

function getClanMemberCount(clan: ClanItem | null | undefined): number {
  const count = Number(clan?.member_count ?? clan?.members_count ?? 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function getPoolAmountText(payload: any): string {
  const candidates = [
    payload?.available_balance,
    payload?.balance,
    payload?.pool_balance,
    payload?.summary?.available_balance,
    payload?.summary?.balance,
    payload?.totals?.available_balance,
    payload?.totals?.balance,
    payload?.wallet_balance,
  ];

  for (const candidate of candidates) {
    const text = safeStr(candidate);
    if (text) return text;
  }

  return "—";
}

function getPoolCurrency(payload: any): string {
  return firstTruthy(
    payload?.currency,
    payload?.summary?.currency,
    payload?.totals?.currency,
    "NGN"
  );
}

function getInviteUrl(payload: any): string {
  return firstTruthy(
    payload?.url,
    payload?.invite_url,
    payload?.link,
    payload?.invite_link
  );
}

function normalizeSpotlight(raw: any): SpotlightItem | null {
  if (!raw) return null;

  const src = raw?.item || raw?.broadcast || raw;

  return {
    id: positiveNumber(src?.id),
    clan_id: positiveNumber(src?.clan_id),
    message: firstTruthy(
      src?.message,
      src?.product_description,
      src?.description,
      src?.text,
      src?.content
    ),
    tag_number: firstTruthy(
      src?.tag_number,
      src?.tag_no,
      src?.tag,
      src?.product_tag_number
    ),
    image_url: firstTruthy(
      src?.image_url,
      src?.image,
      src?.photo_url,
      src?.banner_url
    ),
    expires_at: firstTruthy(src?.expires_at),
    created_at: firstTruthy(src?.created_at),
  };
}

function dedupeSpotlights(rows: SpotlightItem[]): SpotlightItem[] {
  const seen = new Set<number>();
  const out: SpotlightItem[] = [];

  for (const row of rows) {
    const id = Number(row?.id || 0);
    if (id > 0) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    out.push(row);
  }

  return out;
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

function resolveMediaSrc(src: string): string {
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
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
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

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
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
      whiteSpace: "nowrap",
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 40,
      padding: "9px 12px",
      borderRadius: 13,
      border: "1px solid rgba(11,31,51,0.08)",
      background: "#F8FBFF",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 13,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.86 : 1,
    };
  }

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
    opacity: disabled ? 0.86 : 1,
  };
}

function inputField(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    padding: "11px 12px",
    fontSize: 14,
    color: "#0B1F33",
    outline: "none",
    boxSizing: "border-box",
  };
}

function textAreaField(): React.CSSProperties {
  return {
    ...inputField(),
    minHeight: 120,
    resize: "vertical",
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

export default function CommunityHomePage() {
  const navigate = useNavigate();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [clans, setClans] = useState<ClanItem[]>([]);
  const [selectedClan, setSelectedClan] = useState<ClanItem | null>(null);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [spotlightItems, setSpotlightItems] = useState<SpotlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingClanId, setChangingClanId] = useState<number>(0);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );

  const [spotlightDescription, setSpotlightDescription] = useState("");
  const [spotlightTagNumber, setSpotlightTagNumber] = useState("");
  const [spotlightExpiry, setSpotlightExpiry] = useState("");
  const [spotlightImageFile, setSpotlightImageFile] = useState<File | null>(null);
  const [publishingSpotlight, setPublishingSpotlight] = useState(false);
  const [deletingSpotlightId, setDeletingSpotlightId] = useState<number>(0);

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
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const res = await listMyClans().catch(() => ({ items: [] }));
        const rows: ClanItem[] = Array.isArray(res)
          ? res
          : Array.isArray(res?.items)
          ? res.items
          : [];

        const storedId = Number(getSelectedClanId() || 0);
        const current =
          rows.find((item) => getClanId(item) === storedId) || rows[0] || null;

        if (current) {
          const currentId = getClanId(current);

          if (currentId && currentId !== storedId) {
            await selectClan(currentId).catch(() => null);
          }
        }

        if (!alive) return;

        setClans(rows);
        setSelectedClan(current);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  async function loadSpotlightsForClan(clanId: number) {
    if (!clanId) {
      setSpotlightItems([]);
      return;
    }

    const res = await getMarketplaceBroadcasts({
      clan_id: clanId,
      active_only: false,
      limit: 100,
    }).catch(() => ({ items: [] }));

    const rows = Array.isArray(res)
      ? res
      : Array.isArray((res as any)?.items)
      ? (res as any).items
      : [];

    const items = dedupeSpotlights(
      rows
        .map((row: any) => normalizeSpotlight(row))
        .filter(Boolean) as SpotlightItem[]
    );

    setSpotlightItems(items);
  }

  useEffect(() => {
    let alive = true;

    const clanId = getClanId(selectedClan);

    if (!clanId) {
      setPoolInfo(null);
      setInviteLink("");
      setSpotlightItems([]);
      return;
    }

    (async () => {
      const [poolRes, inviteRes, spotlightRes] = await Promise.all([
        getPoolMe("NGN", 20).catch(() => null),
        getClanInviteLink(clanId).catch(() => null),
        getMarketplaceBroadcasts({
          clan_id: clanId,
          active_only: false,
          limit: 100,
        }).catch(() => ({ items: [] })),
      ]);

      if (!alive) return;

      const spotlightRows = Array.isArray(spotlightRes)
        ? spotlightRes
        : Array.isArray((spotlightRes as any)?.items)
        ? (spotlightRes as any).items
        : [];

      setPoolInfo(poolRes);
      setInviteLink(getInviteUrl(inviteRes));
      setSpotlightItems(
        dedupeSpotlights(
          spotlightRows
            .map((row: any) => normalizeSpotlight(row))
            .filter(Boolean) as SpotlightItem[]
        )
      );
    })();

    return () => {
      alive = false;
    };
  }, [selectedClan]);

  const selectedClanName = getClanName(selectedClan);
  const selectedClanDescription = getClanDescription(selectedClan);
  const selectedClanGlobalId = getClanGlobalId(selectedClan);
  const selectedClanTrust = getClanTrust(selectedClan);
  const selectedClanMemberCount = getClanMemberCount(selectedClan);
  const poolAmount = getPoolAmountText(poolInfo);
  const poolCurrency = getPoolCurrency(poolInfo);
  const selectedClanId = getClanId(selectedClan);

  const sortedClans = useMemo(() => {
    return [...clans].sort((a, b) =>
      getClanName(a).localeCompare(getClanName(b))
    );
  }, [clans]);

  async function handleSelectCommunity(clan: ClanItem, openAfter = false) {
    const clanId = getClanId(clan);
    if (!clanId) return;

    setChangingClanId(clanId);

    try {
      await selectClan(clanId).catch(() => null);
      setSelectedClan(clan);

      if (openAfter) {
        navigate("/app/marketplace");
      }
    } finally {
      setChangingClanId(0);
    }
  }

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function copyInviteLink() {
    if (!inviteLink) {
      showNotice("error", "Invite link is not ready yet.");
      return;
    }

    safeCopy(inviteLink);
    showNotice("success", "Invite link copied.");
  }

  function copyCommunityId() {
    if (!selectedClanGlobalId) {
      showNotice("error", "Community ID is not ready yet.");
      return;
    }

    safeCopy(selectedClanGlobalId);
    showNotice("success", "Community ID copied.");
  }

  function openSpotlightGears() {
    const node = document.getElementById("community-home-spotlight-gears");
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function publishSpotlight() {
    if (!selectedClanId) {
      showNotice("error", "Select a community before publishing spotlight.");
      return;
    }

    const description = safeStr(spotlightDescription);
    const tagNumber = safeStr(spotlightTagNumber);
    const expiry = safeStr(spotlightExpiry);

    if (!description && !spotlightImageFile) {
      showNotice("error", "Add a spotlight description or image first.");
      return;
    }

    try {
      setPublishingSpotlight(true);

      let imageUrl = "";

      if (spotlightImageFile) {
        const uploadRes = await uploadMarketplaceImageFile(
          spotlightImageFile,
          selectedClanId
        );
        imageUrl = firstTruthy(
          uploadRes?.image_url,
          uploadRes?.url,
          uploadRes?.file_url,
          uploadRes?.path
        );
      }

      const payload: any = {
        clan_id: selectedClanId,
        message: description,
        description,
        product_description: description,
        image_url: imageUrl || undefined,
        expires_at: expiry || undefined,
      };

      if (tagNumber) {
        payload.tag_number = tagNumber;
        payload.product_tag_number = tagNumber;
      }

      await createMarketplaceBroadcast(payload);

      setSpotlightDescription("");
      setSpotlightTagNumber("");
      setSpotlightExpiry("");
      setSpotlightImageFile(null);

      await loadSpotlightsForClan(selectedClanId);
      showNotice("success", "Spotlight gears published successfully.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Spotlight publish failed."
      );
    } finally {
      setPublishingSpotlight(false);
    }
  }

  async function removeSpotlight(id: number) {
    if (!id) return;

    try {
      setDeletingSpotlightId(id);
      await deleteMarketplaceBroadcast(id);
      await loadSpotlightsForClan(selectedClanId);
      showNotice("success", "Spotlight item removed.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Spotlight item could not be removed."
      );
    } finally {
      setDeletingSpotlightId(0);
    }
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
          sectionLabel="Community Home"
          title="Community Home"
          subtitle="Preparing your private community control room..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "Marketplace", to: "/app/marketplace" },
            { label: "Demand Box", to: "/app/demand-box" },
            { label: "Notifications", to: "/app/notifications" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading your communities...
          </div>
        </section>
      </div>
    );
  }

  if (clans.length === 0) {
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
          sectionLabel="Community Home"
          title="Community Home"
          subtitle="This is your private control room for choosing communities and moving into the selected community surface."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
            { label: "Trust", to: "/app/trust" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>No communities yet</div>

          <div
            style={{
              marginTop: 12,
              color: "#0B1F33",
              fontSize: 28,
              fontWeight: 900,
              lineHeight: 1.15,
              maxWidth: 760,
            }}
          >
            You do not have any visible communities in Community Home yet.
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#5F7287",
              fontSize: 15,
              lineHeight: 1.8,
              maxWidth: 860,
            }}
          >
            Community Home is your private control room. It is where you choose
            communities, create a new one, use invite links, and move into the
            selected community surface when a community is available.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link to="/create" style={actionBtn("primary")}>
              Create New Community
            </Link>
            <Link to="/app/dashboard" style={actionBtn("secondary")}>
              Dashboard
            </Link>
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
        sectionLabel="Community Home"
        title="Community Home"
        subtitle="Your private control room for choosing a community, copying invite links, creating demand, managing spotlight gears, and moving into the selected community surface."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Selected Community", to: "/app/marketplace" },
          { label: "Demand Box", to: "/app/demand-box" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
          { label: "Trust", to: "/app/trust" },
          { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      {notice ? (
        <div style={noticeCard(notice.tone)}>{notice.text}</div>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>What this page is</div>

          <div
            style={{
              marginTop: 10,
              color: "#0B1F33",
              fontSize: isCompact ? 28 : 34,
              fontWeight: 900,
              lineHeight: 1.1,
              maxWidth: 780,
            }}
          >
            This is your private community control room.
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#5F7287",
              fontSize: 15,
              lineHeight: 1.85,
              maxWidth: 860,
            }}
          >
            Community Home is not the dashboard and not the public shop surface.
            It is the place where you choose which community to work with, then
            move into the selected community surface. Demand, spotlight, invite,
            and money movement should feel controlled here, not scattered.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={badge(true)}>
              Selected: {selectedClanName || "No community selected"}
            </span>
            <span style={badge(false)}>Community ID: {selectedClanGlobalId}</span>
            <span style={badge(false)}>Community trust: {selectedClanTrust}</span>
            <span style={badge(false)}>Members: {selectedClanMemberCount}</span>
          </div>

          <div
            style={{
              marginTop: 16,
              ...innerCard("#F8FBFF"),
            }}
          >
            <div style={sectionLabel()}>Selected community summary</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.3,
              }}
            >
              {selectedClanName}
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              {selectedClanDescription}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link to="/app/marketplace" style={actionBtn("primary")}>
                Open Selected Community
              </Link>

              <button
                type="button"
                onClick={copyCommunityId}
                style={actionBtn("secondary")}
              >
                Copy Community ID
              </button>
            </div>
          </div>
        </div>

        <div style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}>
          <div style={sectionLabel()}>Community actions</div>

          <div
            style={{
              marginTop: 10,
              color: "#0B1F33",
              fontSize: 24,
              fontWeight: 900,
              lineHeight: 1.2,
            }}
          >
            Use the main actions from one place.
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            These actions stay together here so people do not need to look for
            them in different places.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link to="/create" style={actionBtn("primary")}>
              Create New Community
            </Link>

            <button
              type="button"
              onClick={copyInviteLink}
              style={actionBtn("secondary", !inviteLink)}
              disabled={!inviteLink}
            >
              Copy Invite Link
            </button>

            <Link to="/app/demand-box" style={actionBtn("secondary")}>
              Demand Box
            </Link>

            <button type="button" onClick={openSpotlightGears} style={actionBtn("secondary")}>
              Spotlight Gears
            </button>

            <Link to="/app/notifications" style={actionBtn("secondary")}>
              Notifications
            </Link>

            <Link to="/app/payment/pool" style={actionBtn("secondary")}>
              Money In
            </Link>

            <Link to="/app/withdrawal-instructions" style={actionBtn("secondary")}>
              Money Out
            </Link>
          </div>

          <div
            style={{
              marginTop: 16,
              ...softCard("#FFFFFF"),
            }}
          >
            <div style={sectionLabel()}>Your pool position</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              {poolAmount} {poolCurrency}
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              This shows only your own visible pool position in the currently
              selected community context, not everyone else’s amount.
            </div>
          </div>
        </div>
      </section>

      <section id="community-home-spotlight-gears" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Spotlight gears</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              Manage spotlight from Community Home.
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.8,
                maxWidth: 860,
              }}
            >
              Spotlight gears live here because this page is private. Publish the
              image, product description, and tag number here, then let the
              spotlight screen feed into Dashboard.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/app/dashboard" style={actionBtn("secondary")}>
              Dashboard Spotlight Screen
            </Link>
            <span style={badge(false)}>{spotlightItems.length} spotlight items</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.02fr) minmax(320px, 0.98fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={innerCard("#FCFEFF")}>
            <div style={sectionLabel()}>Upload spotlight</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 20,
                fontWeight: 900,
                lineHeight: 1.25,
              }}
            >
              Publish a spotlight item
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              Use the existing system path here. Add the description, tag number,
              optional image, and optional expiry.
            </div>

            <div style={{ marginTop: 16 }}>
              <div style={sectionLabel()}>Product description</div>
              <textarea
                value={spotlightDescription}
                onChange={(e) => setSpotlightDescription(e.target.value)}
                placeholder="Write the spotlight product description..."
                style={{ ...textAreaField(), marginTop: 8 }}
              />
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <div style={sectionLabel()}>Tag number</div>
                <input
                  value={spotlightTagNumber}
                  onChange={(e) => setSpotlightTagNumber(e.target.value)}
                  placeholder="Enter tag number"
                  style={{ ...inputField(), marginTop: 8 }}
                />
              </div>

              <div>
                <div style={sectionLabel()}>Expiry (optional)</div>
                <input
                  type="datetime-local"
                  value={spotlightExpiry}
                  onChange={(e) => setSpotlightExpiry(e.target.value)}
                  style={{ ...inputField(), marginTop: 8 }}
                />
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <div style={sectionLabel()}>Image (optional)</div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSpotlightImageFile(e.target.files?.[0] || null)}
                style={{ ...inputField(), marginTop: 8, paddingTop: 10 }}
              />
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={publishSpotlight}
                disabled={publishingSpotlight}
                style={actionBtn("primary", publishingSpotlight)}
              >
                {publishingSpotlight ? "Publishing..." : "Publish Spotlight"}
              </button>

              <Link to="/app/dashboard" style={actionBtn("secondary")}>
                View on Dashboard
              </Link>
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div style={sectionLabel()}>Current spotlight items</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 20,
                fontWeight: 900,
                lineHeight: 1.25,
              }}
            >
              Spotlight queue for this community
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              These items are managed here privately, then shown publicly through
              the Dashboard spotlight screen.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gap: 12,
              }}
            >
              {spotlightItems.length === 0 ? (
                <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                  No spotlight item is visible for this community yet.
                </div>
              ) : (
                spotlightItems.map((item) => {
                  const imageSrc = resolveMediaSrc(firstTruthy(item?.image_url));

                  return (
                    <div key={`spotlight-${item.id}`} style={innerCard("#FCFEFF")}>
                      {imageSrc ? (
                        <div
                          style={{
                            width: "100%",
                            minHeight: 180,
                            borderRadius: 18,
                            border: "1px solid rgba(11,31,51,0.08)",
                            background:
                              "linear-gradient(180deg, #E8F0FF 0%, #DDEBFF 100%)",
                            overflow: "hidden",
                          }}
                        >
                          <img
                            src={imageSrc}
                            alt="Spotlight"
                            style={{
                              width: "100%",
                              height: "100%",
                              minHeight: 180,
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        </div>
                      ) : null}

                      <div
                        style={{
                          marginTop: imageSrc ? 12 : 0,
                          color: "#0B1F33",
                          fontSize: 16,
                          fontWeight: 900,
                          lineHeight: 1.45,
                        }}
                      >
                        {firstTruthy(item?.message, "Spotlight item")}
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {safeStr(item?.tag_number) ? (
                          <span style={badge(true)}>Tag: {safeStr(item?.tag_number)}</span>
                        ) : null}

                        {safeStr(item?.expires_at) ? (
                          <span style={badge(false)}>
                            Expires: {safeStr(item?.expires_at)}
                          </span>
                        ) : (
                          <span style={badge(false)}>No expiry set</span>
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => removeSpotlight(Number(item?.id || 0))}
                          disabled={deletingSpotlightId === Number(item?.id || 0)}
                          style={actionBtn(
                            "secondary",
                            deletingSpotlightId === Number(item?.id || 0)
                          )}
                        >
                          {deletingSpotlightId === Number(item?.id || 0)
                            ? "Removing..."
                            : "Remove Spotlight"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
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
            <div style={sectionLabel()}>Your communities</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 24,
                fontWeight: 900,
                lineHeight: 1.2,
              }}
            >
              Choose the community you want to work with.
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.8,
                maxWidth: 860,
              }}
            >
              Once you choose a community, the selected community surface opens
              separately. That next surface is where members and shop galleries
              become visible.
            </div>
          </div>

          <span style={badge(false)}>{sortedClans.length} communities</span>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {sortedClans.map((clan, index) => {
            const clanId = getClanId(clan);
            const active = clanId > 0 && clanId === getClanId(selectedClan);
            const working = clanId > 0 && clanId === changingClanId;

            return (
              <div key={`${clanId || index}`} style={innerCard("#FCFEFF")}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "minmax(0, 1.2fr) minmax(0, 0.9fr) auto",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 17,
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      {getClanName(clan)}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        color: "#5F7287",
                        fontSize: 14,
                        lineHeight: 1.75,
                      }}
                    >
                      {getClanDescription(clan)}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={badge(active)}>
                        {active ? "Selected" : "Available"}
                      </span>
                      <span style={badge(false)}>
                        Community ID: {getClanGlobalId(clan)}
                      </span>
                      <span style={badge(false)}>
                        Trust: {getClanTrust(clan)}
                      </span>
                      <span style={badge(false)}>
                        Members: {getClanMemberCount(clan)}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      color: "#64748B",
                      fontSize: 13,
                      lineHeight: 1.7,
                    }}
                  >
                    {active
                      ? "This is your current working community."
                      : "Select this community to make it your current working community."}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: isCompact ? "flex-start" : "flex-end",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectCommunity(clan, false)}
                      disabled={working}
                      style={actionBtn("secondary", working)}
                    >
                      {active ? "Selected" : working ? "Selecting..." : "Select"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectCommunity(clan, true)}
                      disabled={working}
                      style={actionBtn("primary", working)}
                    >
                      {working ? "Opening..." : "Open Community"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}