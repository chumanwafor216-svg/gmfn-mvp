import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommunityShopControlPanel from "../components/CommunityShopControlPanel";
import PageTopNav from "../components/PageTopNav";
import OriginLink from "../components/OriginLink";
import { navigateWithOrigin } from "../lib/nav";
import {
  createMarketplaceBroadcast,
  getClanInviteLink,
  getMarketplaceBroadcasts,
  getMe,
  getPoolMe,
  getSelectedClanId,
  listMyClans,
  safeCopy,
  selectClan,
  uploadMarketplaceImageFile,
} from "../lib/api";
import {
  buildInviteBundle,
  getFirstCircleProgress,
  getSuggestedRelationshipsForRole,
  isContactInviteReady,
  loadFirstCircleDraft,
  relationshipLabel,
  roleLabel,
} from "../lib/firstCircle";

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

type NoticeTone = "success" | "error";
type CollapseKey =
  | "selected"
  | "tools"
  | "circle"
  | "spotlight"
  | "communities";

type CollapseState = Record<CollapseKey, boolean>;

type SpotlightDraftState = {
  description: string;
  tagNumber: string;
  expiry: string;
};

const COMMUNITY_HOME_COLLAPSE_KEY = "gmfn.communityHome.sections.v1";
const SPOTLIGHT_DRAFT_PREFIX = "gmfn.communityHome.spotlightDraft.";

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
    "Awaiting issue"
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

function resolveMemberName(me: any): string {
  const direct =
    safeStr(me?.display_name) ||
    safeStr(me?.nickname) ||
    safeStr(me?.name) ||
    safeStr(me?.first_name);

  if (direct) return direct;

  const email = safeStr(me?.email);
  if (email.includes("@")) return email.split("@")[0] || "Member";

  return email || "Member";
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
      minHeight: 38,
      padding: "8px 12px",
      borderRadius: 12,
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

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#24415C",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function inputStyle(): React.CSSProperties {
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

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 110,
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

function previewMediaBox(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 220,
    borderRadius: 22,
    border: "1px solid rgba(212,175,55,0.16)",
    background: "linear-gradient(180deg, #0A1625 0%, #11263B 56%, #193A58 100%)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow:
      "0 20px 42px rgba(2,12,27,0.18), inset 0 1px 0 rgba(255,255,255,0.04)",
  };
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

  return "Not available yet";
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

function removeLocal(key: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function spotlightDraftStorageKey(clanId: number): string {
  return `${SPOTLIGHT_DRAFT_PREFIX}${clanId}`;
}

function defaultCollapseState(): CollapseState {
  return {
    selected: false,
    tools: true,
    circle: false,
    spotlight: true,
    communities: true,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    selected: Boolean(raw?.selected ?? base.selected),
    tools: Boolean(raw?.tools ?? base.tools),
    circle: Boolean(raw?.circle ?? base.circle),
    spotlight: Boolean(raw?.spotlight ?? base.spotlight),
    communities: Boolean(raw?.communities ?? base.communities),
  };
}

export default function CommunityHomePage() {
  const navigate = useNavigate();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [clans, setClans] = useState<ClanItem[]>([]);
  const [selectedClan, setSelectedClan] = useState<ClanItem | null>(null);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [inviteLink, setInviteLink] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [changingClanId, setChangingClanId] = useState<number>(0);

  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [spotlightDescription, setSpotlightDescription] = useState("");
  const [spotlightTagNumber, setSpotlightTagNumber] = useState("");
  const [spotlightExpiry, setSpotlightExpiry] = useState("");
  const [spotlightImageFile, setSpotlightImageFile] = useState<File | null>(
    null
  );
  const [spotlightPreviewUrl, setSpotlightPreviewUrl] = useState("");
  const [spotlightFileInputKey, setSpotlightFileInputKey] = useState(0);
  const [publishingSpotlight, setPublishingSpotlight] = useState(false);

  const [firstCircleDraft, setFirstCircleDraft] = useState(() =>
    loadFirstCircleDraft()
  );

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(COMMUNITY_HOME_COLLAPSE_KEY, defaultCollapseState())
    )
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
    writeLocalJSON(COMMUNITY_HOME_COLLAPSE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2600);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  useEffect(() => {
    if (!spotlightImageFile) {
      setSpotlightPreviewUrl("");
      return;
    }

    const objectUrl = URL.createObjectURL(spotlightImageFile);
    setSpotlightPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [spotlightImageFile]);

  useEffect(() => {
    function refreshFirstCircleDraft() {
      setFirstCircleDraft(loadFirstCircleDraft());
    }

    refreshFirstCircleDraft();

    if (typeof window === "undefined") return;

    window.addEventListener("focus", refreshFirstCircleDraft);
    window.addEventListener("storage", refreshFirstCircleDraft);
    document.addEventListener("visibilitychange", refreshFirstCircleDraft);

    return () => {
      window.removeEventListener("focus", refreshFirstCircleDraft);
      window.removeEventListener("storage", refreshFirstCircleDraft);
      document.removeEventListener("visibilitychange", refreshFirstCircleDraft);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clansRes] = await Promise.all([
          getMe().catch(() => null),
          listMyClans().catch(() => ({ items: [] })),
        ]);

        const rows: ClanItem[] = Array.isArray(clansRes)
          ? clansRes
          : Array.isArray(clansRes?.items)
          ? clansRes.items
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

        setMe(meRes || null);
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

  useEffect(() => {
    let alive = true;

    const clanId = getClanId(selectedClan);

    if (!clanId) {
      setPoolInfo(null);
      setInviteLink("");
      return;
    }

    (async () => {
      const [poolRes, inviteRes] = await Promise.all([
        getPoolMe("NGN", 20).catch(() => null),
        getClanInviteLink(clanId).catch(() => null),
      ]);

      if (!alive) return;

      setPoolInfo(poolRes);
      setInviteLink(getInviteUrl(inviteRes));
    })();

    return () => {
      alive = false;
    };
  }, [selectedClan]);

  useEffect(() => {
    const clanId = getClanId(selectedClan);
    if (!clanId) {
      setSpotlightDescription("");
      setSpotlightTagNumber("");
      setSpotlightExpiry("");
      setSpotlightImageFile(null);
      setSpotlightPreviewUrl("");
      setSpotlightFileInputKey((x) => x + 1);
      return;
    }

    const draft = readLocalJSON<SpotlightDraftState>(
      spotlightDraftStorageKey(clanId),
      {
        description: "",
        tagNumber: "",
        expiry: "",
      }
    );

    setSpotlightDescription(draft.description || "");
    setSpotlightTagNumber(draft.tagNumber || "");
    setSpotlightExpiry(draft.expiry || "");
    setSpotlightImageFile(null);
    setSpotlightPreviewUrl("");
    setSpotlightFileInputKey((x) => x + 1);
  }, [selectedClan]);

  useEffect(() => {
    const clanId = getClanId(selectedClan);
    if (!clanId) return;

    writeLocalJSON(spotlightDraftStorageKey(clanId), {
      description: spotlightDescription,
      tagNumber: spotlightTagNumber,
      expiry: spotlightExpiry,
    });
  }, [selectedClan, spotlightDescription, spotlightTagNumber, spotlightExpiry]);

  const selectedClanName = getClanName(selectedClan);
  const selectedClanDescription = getClanDescription(selectedClan);
  const selectedClanGlobalId = getClanGlobalId(selectedClan);
  const selectedClanTrust = getClanTrust(selectedClan);
  const selectedClanMemberCount = getClanMemberCount(selectedClan);
  const selectedClanId = getClanId(selectedClan);

  const poolAmount = getPoolAmountText(poolInfo);
  const poolCurrency = getPoolCurrency(poolInfo);

  const sortedClans = useMemo(() => {
    return [...clans].sort((a, b) => getClanName(a).localeCompare(getClanName(b)));
  }, [clans]);

  const firstCircleProgress = useMemo(
    () => getFirstCircleProgress(firstCircleDraft),
    [firstCircleDraft]
  );

  const readyFirstCircleContacts = useMemo(() => {
    return firstCircleDraft.contacts.filter(
      (item) => item.selected && isContactInviteReady(item)
    );
  }, [firstCircleDraft]);

  const firstCircleRelationshipHints = useMemo(() => {
    return getSuggestedRelationshipsForRole(firstCircleDraft.memberRole);
  }, [firstCircleDraft.memberRole]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: CollapseKey) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function openGrowYourCircle() {
    setCollapsed((prev) => ({ ...prev, circle: false }));

    if (typeof document !== "undefined") {
      const el = document.getElementById("community-home-grow-your-circle");
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function openSpotlightGears() {
    setCollapsed((prev) => ({ ...prev, spotlight: false }));

    if (typeof document !== "undefined") {
      const el = document.getElementById("community-home-spotlight-gears");
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  function openShopControlPanel() {
    if (typeof document !== "undefined") {
      const el = document.getElementById("community-home-shop-control");
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  async function handleSelectCommunity(clan: ClanItem, openAfter = false) {
    const clanId = getClanId(clan);
    if (!clanId) {
      showNotice("error", "This community is missing a usable ID.");
      return;
    }

    setChangingClanId(clanId);

    try {
      await selectClan(clanId);
      setSelectedClan(clan);

      if (openAfter) {
        navigateWithOrigin(navigate, "/app/marketplace", location);
      } else {
        showNotice(
          "success",
          `${getClanName(clan)} is now your selected community.`
        );
      }
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "This community could not be selected right now."
      );
    } finally {
      setChangingClanId(0);
    }
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

  async function openSelectedMarketplace() {
    if (!selectedClanId || !selectedClan) {
      showNotice("error", "Select a community first.");
      return;
    }

    setChangingClanId(selectedClanId);

    try {
      await selectClan(selectedClanId);
      navigateWithOrigin(navigate, "/app/marketplace", location);
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Selected community could not be opened."
      );
    } finally {
      setChangingClanId(0);
    }
  }

  function clearSpotlightDraft() {
    const clanId = getClanId(selectedClan);

    setSpotlightImageFile(null);
    setSpotlightDescription("");
    setSpotlightTagNumber("");
    setSpotlightExpiry("");
    setSpotlightPreviewUrl("");
    setSpotlightFileInputKey((x) => x + 1);

    if (clanId) {
      removeLocal(spotlightDraftStorageKey(clanId));
    }
  }

  function copyFirstCircleInviteBundle() {
    if (readyFirstCircleContacts.length === 0) {
      showNotice("error", "No ready invite draft is available yet.");
      return;
    }

    const bundle = buildInviteBundle({
      draft: firstCircleDraft,
      memberName: resolveMemberName(me),
      gmfnId: safeStr(me?.gmfn_id || ""),
      communityName: selectedClanName || "your community",
    });

    safeCopy(bundle);
    showNotice("success", "First-circle invite bundle copied.");
  }

  async function publishSpotlight() {
    if (!selectedClanId) {
      showNotice("error", "Select a community before publishing spotlight.");
      return;
    }

    const description = safeStr(spotlightDescription);
    const tagNumber = safeStr(spotlightTagNumber);
    const expiry = safeStr(spotlightExpiry);

    const combinedMessage = [description, tagNumber ? `Tag: ${tagNumber}` : ""]
      .filter(Boolean)
      .join("\n");

    if (!combinedMessage && !spotlightImageFile) {
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
          uploadRes?.path,
          uploadRes?.item?.image_url,
          uploadRes?.data?.image_url
        );

        if (!imageUrl) {
          throw new Error(
            "Image upload completed but the system did not return a usable image link."
          );
        }
      }

      await createMarketplaceBroadcast({
        clan_id: selectedClanId,
        message: combinedMessage || "Spotlight update",
        image_url: imageUrl || undefined,
        expires_at: expiry || undefined,
      });

      clearSpotlightDraft();

      showNotice(
        "success",
        "Spotlight uploaded successfully. It should now appear on the dashboard spotlight screen."
      );
    } catch (err: any) {
      showNotice("error", safeStr(err?.message) || "Spotlight upload failed.");
    } finally {
      setPublishingSpotlight(false);
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
          subtitle="Loading your current community workspace..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "Marketplace", to: "/app/marketplace" },
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
          subtitle="This page helps you choose a working community, confirm the context, and move into the right community route."
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
            Community Home is where you choose a working community, confirm the
            current context, use invite tools, grow your trusted circle, and
            move into the right community route when one is available.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <OriginLink to="/app/clans" style={actionBtn("primary")}>
              Create New Community
            </OriginLink>
            <OriginLink to="/app/build-first-circle" style={actionBtn("secondary")}>
              Build Your First Circle
            </OriginLink>
            <OriginLink to="/app/dashboard" style={actionBtn("secondary")}>
              Dashboard
            </OriginLink>
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
        subtitle="Choose your working community, confirm the current context, use community tools, and move into the right route when you are ready."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
          { label: "Trust", to: "/app/trust" },
          { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard(
          "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
        )}
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
            <div style={sectionLabel()}>Selected community</div>
            <div
              style={{
                marginTop: 8,
                color: "#C7D4E5",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              This is the community context you are working in now.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("selected")}
            style={collapseToggle()}
          >
            {collapsed.selected ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.selected ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.12fr) minmax(320px, 0.88fr)",
              gap: 16,
              alignItems: "stretch",
            }}
          >
            <div>
              <div
                style={{
                  color: "#F8FBFF",
                  fontSize: isCompact ? 28 : 34,
                  fontWeight: 900,
                  lineHeight: 1.08,
                }}
              >
                {selectedClanName}
              </div>

              <div
                style={{
                  marginTop: 12,
                  color: "#D7E3F1",
                  fontSize: 15,
                  lineHeight: 1.85,
                  maxWidth: 760,
                }}
              >
                {selectedClanDescription}
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>Community ID: {selectedClanGlobalId}</span>
                <span style={badge(false)}>Trust: {selectedClanTrust}</span>
                <span style={badge(false)}>Members: {selectedClanMemberCount}</span>
                <span style={badge(false)}>Current page: Community Home</span>
                <span style={badge(false)}>Current step: Confirm community context</span>
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
                  onClick={() => void openSelectedMarketplace()}
                  disabled={!selectedClanId || changingClanId === selectedClanId}
                  style={actionBtn(
                    "primary",
                    !selectedClanId || changingClanId === selectedClanId
                  )}
                >
                  {changingClanId === selectedClanId
                    ? "Opening..."
                    : "Enter Community"}
                </button>

                <button
                  type="button"
                  onClick={copyCommunityId}
                  style={actionBtn("secondary")}
                >
                  Copy Community ID
                </button>
              </div>
            </div>

            <div
              style={{
                ...softCard("rgba(255,255,255,0.94)"),
                border: "1px solid rgba(148,163,184,0.16)",
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
                selected community context.
              </div>
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
            <div style={sectionLabel()}>Community tools</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              Keep your main community actions together so the next step stays clear.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("tools")}
            style={collapseToggle()}
          >
            {collapsed.tools ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.tools ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            <OriginLink to="/app/clans" style={actionBtn("primary")}>
              Create New Community
            </OriginLink>

            <button
              type="button"
              onClick={copyInviteLink}
              style={actionBtn("secondary", !inviteLink)}
              disabled={!inviteLink}
            >
              Copy Invite Link
            </button>

            <OriginLink to="/app/demand-box" style={actionBtn("secondary")}>
              Demand Box
            </OriginLink>

            <button
              type="button"
              onClick={openGrowYourCircle}
              style={actionBtn("secondary")}
            >
              Grow Trusted Circle
            </button>

            <button
              type="button"
              onClick={openSpotlightGears}
              style={actionBtn("secondary")}
            >
              Manage Spotlight
            </button>

            <button
              type="button"
              onClick={openShopControlPanel}
              style={actionBtn("secondary")}
            >
              Shop Control
            </button>

            <OriginLink to="/app/notifications" style={actionBtn("secondary")}>
              Notifications
            </OriginLink>

            <OriginLink to="/app/payment/pool" style={actionBtn("secondary")}>
              Money In
            </OriginLink>

            <OriginLink to="/app/withdrawal-instructions" style={actionBtn("secondary")}>
              Money Out
            </OriginLink>

            <button
              type="button"
              onClick={() => void openSelectedMarketplace()}
              disabled={!selectedClanId || changingClanId === selectedClanId}
              style={actionBtn(
                "secondary",
                !selectedClanId || changingClanId === selectedClanId
              )}
            >
              {changingClanId === selectedClanId
                ? "Opening..."
                : "Open Marketplace"}
            </button>
          </div>
        ) : null}
      </section>

      <div id="community-home-shop-control">
        <CommunityShopControlPanel />
      </div>

      <section
        id="community-home-grow-your-circle"
        style={pageCard("#FFFFFF")}
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
            <div style={sectionLabel()}>Grow your trusted circle</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              Bring in the people you already trust and already do real life with.
              This is not a random invite tool.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("circle")}
            style={collapseToggle()}
          >
            {collapsed.circle ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.circle ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>First-circle progress</div>

              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {firstCircleProgress.nextStepText}
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
                  Role: {roleLabel(firstCircleDraft.memberRole)}
                </span>
                <span style={badge(false)}>
                  Selected: {firstCircleProgress.selectedCount}
                </span>
                <span style={badge(false)}>
                  Ready: {firstCircleProgress.readyCount}
                </span>
                <span style={badge(false)}>
                  Target: {firstCircleProgress.targetCount}
                </span>
              </div>

              <div
                style={{
                  marginTop: 14,
                  color: "#5F7287",
                  fontSize: 14,
                  lineHeight: 1.75,
                }}
              >
                Build this circle from serious real-life relationships: suppliers,
                buyers, family-support people, remittance contacts, group
                officers, savings partners, and other trusted people.
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <OriginLink to="/app/build-first-circle" style={actionBtn("primary")}>
                  Open First Circle
                </OriginLink>

                <button
                  type="button"
                  onClick={copyFirstCircleInviteBundle}
                  disabled={readyFirstCircleContacts.length === 0}
                  style={actionBtn(
                    "secondary",
                    readyFirstCircleContacts.length === 0
                  )}
                >
                  Copy Invite Bundle
                </button>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Role-based hints</div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {firstCircleRelationshipHints.length > 0 ? (
                  firstCircleRelationshipHints.map((item) => (
                    <span key={item} style={badge(false)}>
                      {relationshipLabel(item)}
                    </span>
                  ))
                ) : (
                  <span style={badge(false)}>Choose your member role first</span>
                )}
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {firstCircleDraft.contacts.length === 0 ? (
                  <div style={{ color: "#64748B", lineHeight: 1.75 }}>
                    No trusted person has been added yet.
                  </div>
                ) : (
                  firstCircleDraft.contacts.slice(0, 3).map((item) => (
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
                        <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                          {safeStr(item.name || "Contact")}
                        </div>

                        <span style={badge(item.selected)}>
                          {item.selected ? "Selected" : "Saved"}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={badge(false)}>
                          {relationshipLabel(item.relationship)}
                        </span>
                        <span style={badge(false)}>
                          {isContactInviteReady(item)
                            ? "Invite ready"
                            : "Needs phone or email"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
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
            <div style={sectionLabel()}>Spotlight management</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              Choose the spotlight image and details here, preview it first, then
              publish it to the dashboard spotlight screen.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("spotlight")}
            style={collapseToggle()}
          >
            {collapsed.spotlight ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.spotlight ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Prepare spotlight</div>

              <div style={{ marginTop: 14 }}>
                <div style={sectionLabel()}>Product description</div>
                <textarea
                  value={spotlightDescription}
                  onChange={(e) => setSpotlightDescription(e.target.value)}
                  placeholder="Write the spotlight product description..."
                  style={{ ...textAreaStyle(), marginTop: 8 }}
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
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Expiry (optional)</div>
                  <input
                    type="datetime-local"
                    value={spotlightExpiry}
                    onChange={(e) => setSpotlightExpiry(e.target.value)}
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <div style={sectionLabel()}>Image</div>
                <input
                  key={spotlightFileInputKey}
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setSpotlightImageFile(e.target.files?.[0] || null)
                  }
                  style={{ ...inputStyle(), marginTop: 8, paddingTop: 10 }}
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

                <button
                  type="button"
                  onClick={clearSpotlightDraft}
                  style={actionBtn("secondary")}
                >
                  Clear Draft
                </button>
              </div>
            </div>

            <div
              style={{
                ...innerCard("rgba(255,255,255,0.98)"),
                border: "1px solid rgba(212,175,55,0.12)",
                boxShadow: "0 16px 34px rgba(2,12,27,0.10)",
              }}
            >
              <div style={sectionLabel()}>Preview before publish</div>

              <div style={{ marginTop: 14 }}>
                <div style={previewMediaBox()}>
                  {spotlightPreviewUrl ? (
                    <img
                      src={spotlightPreviewUrl}
                      alt="Spotlight preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: 220,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        padding: 18,
                        textAlign: "center",
                        color: "#D7E3F1",
                        fontWeight: 800,
                        fontSize: 16,
                        lineHeight: 1.5,
                      }}
                    >
                      No image selected yet
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    color: "#0B1F33",
                    fontSize: 18,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  {safeStr(spotlightDescription) || "No description written yet"}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {safeStr(spotlightTagNumber) ? (
                    <span style={badge(true)}>Tag: {safeStr(spotlightTagNumber)}</span>
                  ) : (
                    <span style={badge(false)}>Tag not entered yet</span>
                  )}

                  {safeStr(spotlightExpiry) ? (
                    <span style={badge(false)}>Expiry: {safeStr(spotlightExpiry)}</span>
                  ) : (
                    <span style={badge(false)}>No expiry set</span>
                  )}

                  <span style={badge(false)}>
                    Community: {selectedClanName || "No community selected"}
                  </span>
                </div>
              </div>
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
            <div style={sectionLabel()}>Your communities</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              Choose the community you want to work with, then open that selected
              community surface separately.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>{sortedClans.length} communities</span>
            <button
              type="button"
              onClick={() => toggleSection("communities")}
              style={collapseToggle()}
            >
              {collapsed.communities ? "Open" : "Collapse"}
            </button>
          </div>
        </div>

        {!collapsed.communities ? (
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
                        ? "This is your current community context."
                        : "Select this community to make it your current community context."}
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
                        onClick={() => void handleSelectCommunity(clan, false)}
                        disabled={working}
                        style={actionBtn("secondary", working)}
                      >
                        {active ? "Selected" : working ? "Selecting..." : "Select"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleSelectCommunity(clan, true)}
                        disabled={working}
                        style={actionBtn("primary", working)}
                      >
                        {working ? "Opening..." : "Enter Community"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
