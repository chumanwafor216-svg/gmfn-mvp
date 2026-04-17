import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CommunityShopControlPanel from "../components/CommunityShopControlPanel";
import ExplainToggle from "../components/ExplainToggle";
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
  listMarketplaceRequests,
  listMyClans,
  listExpectedPayments,
  safeCopy,
  selectClan,
  uploadMarketplaceImageFile,
} from "../lib/api";
import {
  getCommunityMoneySurface,
  type CommunityMoneySurface,
} from "../lib/communityMoney";
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

type ActiveCommunitySpotlight = {
  id?: number;
  message: string;
  imageUrl: string;
  expiresAt: string;
  createdAt: string;
};

type DemandRow = {
  id?: number;
  title?: string | null;
  description?: string | null;
  urgency?: string | null;
  status?: string | null;
  created_at?: string | null;
  area?: string | null;
  requester_gmfn_id?: string | null;
  requester_email?: string | null;
  is_mine?: boolean;
  mine?: boolean;
};

type ExpectedPaymentRecord = {
  id?: number | null;
  expected_type?: string | null;
  amount?: string | null;
  currency?: string | null;
  reference_display?: string | null;
  status?: string | null;
  status_reason?: string | null;
  due_at?: string | null;
  matched_bank_event_id?: number | null;
  confirmed_at?: string | null;
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

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
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
    background: primary ? "rgba(29,78,216,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#1D4ED8" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
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
      background: disabled ? "#CBD5E1" : "#1D4ED8",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
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
      border: "1px solid rgba(29,78,216,0.10)",
      background: "#F5FAFF",
      color: disabled ? "#94A3B8" : "#1E4063",
      fontWeight: 800,
      fontSize: 13,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
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
    border: "1px solid rgba(11,99,209,0.12)",
    background: "#FDFEFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
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
    border: "1px solid rgba(11,99,209,0.12)",
    background: "#FDFEFF",
    color: "#1E4063",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    textAlign: "center",
    whiteSpace: "normal",
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
    background: "linear-gradient(180deg, #15314C 0%, #21496C 56%, #2B5E88 100%)",
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

function demandUrgencyLabel(value?: string | null): string {
  const urgency = safeStr(value).toLowerCase();
  if (urgency === "high") return "Urgent";
  if (urgency === "low") return "Low pressure";
  return "Normal";
}

function safeDateTime(value: any): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function isMineDemandRow(row: DemandRow, me: any): boolean {
  if (row?.is_mine === true || row?.mine === true) return true;

  const myGmfnId = safeStr(me?.gmfn_id).toUpperCase();
  const rowGmfnId = safeStr(row?.requester_gmfn_id).toUpperCase();
  if (myGmfnId && rowGmfnId && myGmfnId === rowGmfnId) return true;

  const myEmail = safeStr(me?.email).toLowerCase();
  const rowEmail = safeStr(row?.requester_email).toLowerCase();
  return Boolean(myEmail && rowEmail && myEmail === rowEmail);
}

function expectedPaymentState(item: ExpectedPaymentRecord): string {
  if (safeStr(item.confirmed_at)) return "Confirmed";
  if (item.matched_bank_event_id) return "Matched";
  if (safeStr(item.reference_display)) return "Awaiting reconciliation";
  return "Awaiting issue";
}

function expectedPaymentNextAction(item: ExpectedPaymentRecord): string {
  const state = expectedPaymentState(item);
  if (state === "Confirmed") {
    return "Use the unlocked money route or dependent feature.";
  }
  if (state === "Matched") {
    return "Wait for reconciliation to finish and confirmation to post.";
  }
  if (state === "Awaiting reconciliation") {
    return "Pay with the exact reference, then wait for the bank match.";
  }
  return "Generate or refresh the instruction so a usable reference can be issued.";
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
  const [activeCommunitySpotlight, setActiveCommunitySpotlight] =
    useState<ActiveCommunitySpotlight | null>(null);
  const [activeCommunitySpotlightLoading, setActiveCommunitySpotlightLoading] =
    useState(false);
  const [activeCommunitySpotlightSyncIssue, setActiveCommunitySpotlightSyncIssue] =
    useState("");
  const [publishingSpotlight, setPublishingSpotlight] = useState(false);
  const [moneySurface, setMoneySurface] = useState<CommunityMoneySurface | null>(null);
  const [expectedPayments, setExpectedPayments] = useState<ExpectedPaymentRecord[]>([]);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeSyncIssue, setFinanceSyncIssue] = useState("");
  const [myOpenDemands, setMyOpenDemands] = useState<DemandRow[]>([]);
  const [visibleDemands, setVisibleDemands] = useState<DemandRow[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);
  const [demandSyncIssue, setDemandSyncIssue] = useState("");

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
    let alive = true;

    const clanId = getClanId(selectedClan);

    if (!clanId) {
      setMyOpenDemands([]);
      setVisibleDemands([]);
      setDemandSyncIssue("");
      setDemandLoading(false);
      return;
    }

    (async () => {
      setDemandLoading(true);

      try {
        const [myRes, visibleRes] = await Promise.all([
          listMarketplaceRequests({
            clan_id: clanId,
            mine_only: true,
            status: "open",
            limit: 20,
          }).catch((err) => ({
            items: [],
            __failed: String(err?.message || err || "My demand refresh failed."),
          })),
          listMarketplaceRequests({
            clan_id: clanId,
            mine_only: false,
            status: "open",
            limit: 20,
          }).catch((err) => ({
            items: [],
            __failed: String(
              err?.message || err || "Visible demand refresh failed."
            ),
          })),
        ]);

        if (!alive) return;

        const myRows = rowsOf<DemandRow>(myRes).sort((a, b) =>
          safeStr(b?.created_at).localeCompare(safeStr(a?.created_at))
        );
        const visibleRows = rowsOf<DemandRow>(visibleRes)
          .filter((row) => !isMineDemandRow(row, me))
          .sort((a, b) =>
            safeStr(b?.created_at).localeCompare(safeStr(a?.created_at))
          );

        setMyOpenDemands(myRows);
        setVisibleDemands(visibleRows);
        setDemandSyncIssue(
          [safeStr((myRes as any)?.__failed), safeStr((visibleRes as any)?.__failed)]
            .filter(Boolean)
            .join(" ")
        );
      } finally {
        if (alive) {
          setDemandLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClan, me]);

  useEffect(() => {
    let alive = true;

    const clanId = getClanId(selectedClan);
    const gmfnId = safeStr(me?.gmfn_id);

    if (!clanId || !gmfnId) {
      setMoneySurface(null);
      setExpectedPayments([]);
      setFinanceSyncIssue("");
      setFinanceLoading(false);
      return;
    }

    (async () => {
      setFinanceLoading(true);

      try {
        const [surfaceRes, expectedRes] = await Promise.all([
          getCommunityMoneySurface(clanId, gmfnId, "NGN").catch((err) => ({
            __failed: String(err?.message || err || "Finance page refresh failed."),
          })),
          listExpectedPayments({ clan_id: clanId, limit: 30 }).catch((err) => ({
            items: [],
            __failed: String(err?.message || err || "Expected payment refresh failed."),
          })),
        ]);

        if (!alive) return;

        const nextSurface =
          surfaceRes && !("__failed" in (surfaceRes as any))
            ? (surfaceRes as CommunityMoneySurface)
            : null;
        const nextExpectedPayments = rowsOf<ExpectedPaymentRecord>(expectedRes).filter(
          (item) => !["applied", "cancelled", "expired"].includes(safeStr(item?.status).toLowerCase())
        );

        setMoneySurface(nextSurface);
        setExpectedPayments(nextExpectedPayments);
        setFinanceSyncIssue(
          [
            safeStr((surfaceRes as any)?.__failed),
            safeStr((expectedRes as any)?.__failed),
          ]
            .filter(Boolean)
            .join(" ")
        );
      } finally {
        if (alive) {
          setFinanceLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClan, me]);

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

  const urgentDemandCount = useMemo(() => {
    return [...myOpenDemands, ...visibleDemands].filter(
      (row) => safeStr(row?.urgency).toLowerCase() === "high"
    ).length;
  }, [myOpenDemands, visibleDemands]);

  const demandPreviewRows = useMemo(() => {
    return [...myOpenDemands, ...visibleDemands]
      .sort((a, b) => safeStr(b?.created_at).localeCompare(safeStr(a?.created_at)))
      .slice(0, 3);
  }, [myOpenDemands, visibleDemands]);

  const demandNextAction = useMemo(() => {
    if (!selectedClanId) {
      return {
        title: "Select a community before managing demand",
        detail:
          "Demand belongs to a real community. Choose your active community first, then create or review live need signals here.",
      };
    }

    if (urgentDemandCount > 0) {
      return {
        title: "Review urgent demand before it drifts",
        detail:
          "Urgent need signals are already live in this community. Open Demand Box or Action Inbox and decide the next clean follow-up.",
      };
    }

    if (myOpenDemands.length > 0) {
      return {
        title: "Keep your open demand current",
        detail:
          "You already have live demand in this community. Review it, update it, or close it cleanly so notices and visibility stay credible.",
      };
    }

    return {
      title: "Create the next real demand from Community Home",
      detail:
        "Start the next real demand here, then continue in Demand Box when you want the fuller follow-up view.",
    };
  }, [selectedClanId, urgentDemandCount, myOpenDemands.length]);

  const activeExpectedPayments = useMemo(() => {
    return expectedPayments;
  }, [expectedPayments]);

  const pendingFinanceCount = useMemo(() => {
    return activeExpectedPayments.filter((item) => {
      const state = expectedPaymentState(item);
      return state === "Matched" || state === "Awaiting reconciliation";
    }).length;
  }, [activeExpectedPayments]);

  const financePreviewPayments = useMemo(() => {
    return activeExpectedPayments
      .slice()
      .sort((a, b) => safeStr(b?.due_at).localeCompare(safeStr(a?.due_at)))
      .slice(0, 3);
  }, [activeExpectedPayments]);

  const financeNextAction = useMemo(() => {
    if (!selectedClanId) {
      return {
        title: "Select a community before reviewing the finance file",
        detail:
          "Choose your community first, then review pool position, references, and payment follow-through here.",
      };
    }

    if (pendingFinanceCount > 0) {
    return {
      title: "Reconciliation is waiting inside the finance record",
      detail:
        "One or more expected payments are still waiting for confirmation or bank match. Open Finance and review the live record before moving on.",
    };
  }

    if (moneySurface?.pendingWithdrawals && safeStr(moneySurface.pendingWithdrawals) !== "0.00") {
      return {
        title: "A money-out record is already open",
        detail:
          "Withdrawal movement is already visible in the community finance file. Review the current record and destination details before opening another page.",
      };
    }

    return {
      title: "Community Home holds the live finance file",
      detail:
        "Review the current money record here first, then open Finance when you need the deeper event history and fuller finance page.",
    };
  }, [selectedClanId, pendingFinanceCount, moneySurface]);

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

  const communitySpotlightNextAction = useMemo(() => {
    const hasDraft =
      Boolean(safeStr(spotlightDescription)) ||
      Boolean(safeStr(spotlightTagNumber)) ||
      Boolean(safeStr(spotlightExpiry)) ||
      Boolean(spotlightImageFile);

    if (activeCommunitySpotlight) {
      return {
        title: "Keep the live spotlight visible or replace it deliberately",
        detail: activeCommunitySpotlight.expiresAt
          ? "A spotlight is already active for this community. Let it run until expiry unless there is a real reason to replace the current live item."
          : "A spotlight is already active without an expiry. Replace it only when you are ready for the new image and message to become the live community signal.",
      };
    }

    if (hasDraft) {
      return {
        title: "Publish the prepared spotlight when the message is ready",
        detail:
          "Your draft is already in progress. Review the preview carefully, then publish so the live community spotlight state updates from backend truth.",
      };
    }

    return {
      title: "Prepare a spotlight draft first",
      detail:
        "Add the description, optional expiry, and image here. Once the draft looks right, publish it so the live state can appear below.",
    };
  }, [
    activeCommunitySpotlight,
    spotlightDescription,
    spotlightTagNumber,
    spotlightExpiry,
    spotlightImageFile,
  ]);

  async function refreshActiveCommunitySpotlight(clanId: number) {
    if (!clanId) {
      setActiveCommunitySpotlight(null);
      setActiveCommunitySpotlightLoading(false);
      setActiveCommunitySpotlightSyncIssue("");
      return;
    }

    setActiveCommunitySpotlightLoading(true);

    try {
      const res = await getMarketplaceBroadcasts({
        clan_id: clanId,
        active_only: true,
        limit: 12,
      }).catch((err) => ({
        items: [],
        __failed: String(err?.message || err || "Spotlight refresh failed."),
      }));

      const rows = Array.isArray((res as any)?.items)
        ? (res as any).items
        : Array.isArray(res)
        ? res
        : [];

      const firstActive = rows[0] || null;

      setActiveCommunitySpotlight(
        firstActive
          ? {
              id: Number(firstActive?.id || 0) || undefined,
              message: safeStr(firstActive?.message || ""),
              imageUrl: safeStr(firstActive?.image_url || ""),
              expiresAt: safeStr(firstActive?.expires_at || ""),
              createdAt: safeStr(firstActive?.created_at || ""),
            }
          : null
      );
      setActiveCommunitySpotlightSyncIssue(safeStr((res as any)?.__failed || ""));
    } finally {
      setActiveCommunitySpotlightLoading(false);
    }
  }

  useEffect(() => {
    const clanId = getClanId(selectedClan);

    if (!clanId) {
      setActiveCommunitySpotlight(null);
      setActiveCommunitySpotlightLoading(false);
      return;
    }

    let alive = true;

    async function loadIfAlive() {
      if (!alive) return;
      await refreshActiveCommunitySpotlight(clanId);
    }

    void loadIfAlive();

    const timer = window.setInterval(() => {
      void loadIfAlive();
    }, 60000);

    function handleFocusRefresh() {
      void loadIfAlive();
    }

    function handleVisibilityRefresh() {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void loadIfAlive();
      }
    }

    window.addEventListener("focus", handleFocusRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", handleFocusRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, [selectedClan]);

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
          `${getClanName(clan)} is now your current community.`
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

      await refreshActiveCommunitySpotlight(selectedClanId);
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
          subtitle="Loading your current community..."
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
          subtitle="Choose a working community here, confirm where you are, and move into the right community route."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
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
            Choose a working community here, confirm where you are, use invite
            tools, grow your trusted circle, and move into the right community
            route when one is available.
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
        subtitle="Choose your working community, confirm where you are, use community tools, and move into the right route when you are ready."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
          { label: "Trust", to: "/app/trust" },
          { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      <ExplainToggle
        label="What this screen does"
        what="Community Home is where you confirm the community you are working in, open its live tools, and keep the right community context before you go elsewhere."
        why="Many actions depend on the correct community being active first, so this screen anchors trust, demand, money, invites, and spotlight work in the right place."
        next="Confirm the selected community first, then open the tools, circle, spotlight, or other community sections you need next."
        tone="light"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard(
          "linear-gradient(180deg, #10243A 0%, #163552 52%, #244B72 100%)"
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
            <div style={{ ...sectionLabel(), color: "#D7E3F1" }}>Selected community</div>
            <div
              style={{
                marginTop: 8,
                color: "#C7D4E5",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              You are currently working in this community.
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
                <span
                  style={{
                    ...badge(true),
                    background: "rgba(255,255,255,0.16)",
                    color: "#FFFFFF",
                    border: "1px solid rgba(255,255,255,0.10)",
                  }}
                >
                  Community ID: {selectedClanGlobalId}
                </span>
                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#F8FBFF",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Trust: {selectedClanTrust}
                </span>
                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#F8FBFF",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Members: {selectedClanMemberCount}
                </span>
                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#F8FBFF",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Current page: Community Home
                </span>
                <span
                  style={{
                    ...badge(false),
                    background: "rgba(255,255,255,0.12)",
                    color: "#F8FBFF",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  Current step: Confirm community
                </span>
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
                This shows only your own visible pool position in your current
                community.
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
            <div style={sectionLabel()}>Finance File & Record</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 860,
              }}
            >
              Review your current pool position, pending money movement, payment
              reference state, and next finance action here before you open the
              fuller finance record.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>
              Pool: {safeStr(moneySurface?.poolAmount || poolAmount)} {safeStr(moneySurface?.poolCurrency || poolCurrency)}
            </span>
            <span style={badge(false)}>
              Expected payments: {activeExpectedPayments.length}
            </span>
            <span style={badge(false)}>Waiting: {pendingFinanceCount}</span>
          </div>
        </div>

        <ExplainToggle
          label="What this finance record does"
          what="This keeps the current community money reading in one place so users can see pool position, pending movement, expected payments, and the next finance action before opening deeper records."
          why="Finance is easier to trust when the community can read the live money state here first instead of jumping straight into a larger ledger view."
          next="Read the next action and live finance record first, then open Finance, Money In, Money Out, Payment Rails, or Payout Details only when you need the fuller route."
          tone="light"
          style={{ marginTop: 12 }}
        />

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.12fr) minmax(320px, 0.88fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={softCard("#F8FBFF")}>
            <div style={sectionLabel()}>Current next action</div>
            <ExplainToggle
              label="What this finance next action does"
              what="This card highlights the next clean finance step for the current community after reading the money record below."
              why="It helps users avoid guessing whether they should review Finance, pay in, pay out, or reconcile something first."
              next="Read this action first, then open the linked finance route that matches the move you need to make next."
              tone="light"
              style={{ marginTop: 12 }}
            />
            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 22,
                fontWeight: 900,
                lineHeight: 1.28,
              }}
            >
              {financeNextAction.title}
            </div>
            <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.78 }}>
              {financeNextAction.detail}
            </div>

            {financeSyncIssue ? (
              <div style={{ marginTop: 12, ...noticeCard("error") }}>
                {financeSyncIssue}
              </div>
            ) : null}

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <OriginLink to="/app/finance" style={actionBtn("primary")}>
                Open Finance
              </OriginLink>
              <OriginLink to="/app/payment/pool" style={actionBtn("secondary")}>
                Money In
              </OriginLink>
              <OriginLink to="/app/withdrawal-instructions" style={actionBtn("secondary")}>
                Money Out
              </OriginLink>
              <OriginLink to="/app/payment-rails" style={actionBtn("soft")}>
                Payment Rails
              </OriginLink>
              <OriginLink to="/app/payout-details" style={actionBtn("soft")}>
                Payout Details
              </OriginLink>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Live finance record</div>

            <ExplainToggle
              label="What this live finance record does"
              what="This card gathers the current community money reading into one place, including pool position, movement, record status, money routes, and expected payments."
              why="It helps users understand the live finance picture here first instead of jumping across several money routes to work out what state the community is in."
              next="Read this summary first, then open Finance, Payment Rails, Money In, Money Out, or Payout Details only when you need the deeper route."
              tone="light"
              style={{ marginTop: 12 }}
            />

            {financeLoading ? (
              <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.75 }}>
                Loading your current community finance record.
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div style={innerCard("#FCFEFF")}>
                  <div style={sectionLabel()}>Pool position</div>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontSize: 20,
                      fontWeight: 900,
                      lineHeight: 1.28,
                    }}
                  >
                    {safeStr(moneySurface?.poolAmount || poolAmount)} {safeStr(moneySurface?.poolCurrency || poolCurrency)}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(true)}>
                      Available: {safeStr(moneySurface?.effectiveAvailable || "0.00")}
                    </span>
                    <span style={badge(false)}>
                      Reserved: {safeStr(moneySurface?.reservedPool || "0.00")}
                    </span>
                  </div>
                </div>

                <div style={innerCard("#FCFEFF")}>
                  <div style={sectionLabel()}>Movement</div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span style={badge(true)}>
                      Pending in: {safeStr(moneySurface?.pendingDeposits || "0.00")}
                    </span>
                    <span style={badge(false)}>
                      Pending out: {safeStr(moneySurface?.pendingWithdrawals || "0.00")}
                    </span>
                    <span style={badge(false)}>
                      Recent events: {Array.isArray(moneySurface?.recentPoolEvents) ? moneySurface?.recentPoolEvents.length : 0}
                    </span>
                  </div>
                </div>

                <div style={innerCard("#FCFEFF")}>
                  <div style={sectionLabel()}>Record status</div>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontWeight: 900,
                      lineHeight: 1.35,
                    }}
                  >
                    {safeStr(moneySurface?.poolReference)
                      ? `Reference ${safeStr(moneySurface?.poolReference)} is active in the current finance file.`
                      : "No active pool reference is visible in the current finance file."}
                  </div>
                  <div style={{ marginTop: 8, color: "#5F7287", fontSize: 13, lineHeight: 1.7 }}>
                    {activeExpectedPayments.length > 0
                      ? `${activeExpectedPayments.length} expected payment record${
                          activeExpectedPayments.length === 1 ? "" : "s"
                        } are open in this community.`
                      : "No expected payment record is open right now."}
                  </div>
                </div>

                <div style={innerCard("#FCFEFF")}>
                  <div style={sectionLabel()}>Money routes</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                    <div>
                      <div style={{ color: "#0B1F33", fontWeight: 900, lineHeight: 1.35 }}>
                        {safeStr(moneySurface?.depositRoute?.title || "Money In route")}
                      </div>
                      <div style={{ marginTop: 6, color: "#5F7287", fontSize: 13, lineHeight: 1.7 }}>
                        {safeStr(
                          moneySurface?.depositRoute?.detail ||
                            "Generate and use the current deposit instruction from the finance file."
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ color: "#0B1F33", fontWeight: 900, lineHeight: 1.35 }}>
                        {safeStr(moneySurface?.withdrawalRoute?.title || "Money Out route")}
                      </div>
                      <div style={{ marginTop: 6, color: "#5F7287", fontSize: 13, lineHeight: 1.7 }}>
                        {safeStr(
                          moneySurface?.withdrawalRoute?.detail ||
                            "Use the current payout route only after the finance file is ready."
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <OriginLink to="/app/payment-rails" style={actionBtn("soft")}>
                        Review Payment Rails
                      </OriginLink>
                      <OriginLink to="/app/payout-details" style={actionBtn("soft")}>
                        Review Payout Details
                      </OriginLink>
                    </div>
                  </div>
                </div>

                <div style={innerCard("#FCFEFF")}>
                  <div style={sectionLabel()}>Expected payments & reconciliation</div>
                  {financePreviewPayments.length === 0 ? (
                    <div style={{ marginTop: 10, color: "#5F7287", fontSize: 13, lineHeight: 1.7 }}>
                      No payment is waiting here right now.
                    </div>
                  ) : (
                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      {financePreviewPayments.map((item, index) => (
                        <div key={`${item.id || index}`} style={innerCard("#FFFFFF")}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <span style={badge(true)}>
                              {safeStr(item.expected_type || "Expected payment")}
                            </span>
                            <span style={badge(false)}>
                              State: {expectedPaymentState(item)}
                            </span>
                            {safeStr(item.status) ? (
                              <span style={badge(false)}>
                                Status: {safeStr(item.status)}
                              </span>
                            ) : null}
                          </div>
                          <div
                            style={{
                              marginTop: 10,
                              color: "#0B1F33",
                              fontWeight: 900,
                              lineHeight: 1.35,
                            }}
                          >
                            {safeStr(item.amount || "0.00")} {safeStr(item.currency || moneySurface?.poolCurrency || poolCurrency)}
                          </div>
                          <div style={{ marginTop: 8, color: "#5F7287", fontSize: 13, lineHeight: 1.7 }}>
                            {[
                              item.reference_display
                                ? `Reference: ${safeStr(item.reference_display)}`
                                : "",
                              item.confirmed_at
                                ? `Confirmed: ${safeDateTime(item.confirmed_at)}`
                                : item.due_at
                                ? `Due: ${safeDateTime(item.due_at)}`
                                : "",
                              `Next action: ${expectedPaymentNextAction(item)}`,
                            ]
                              .filter(Boolean)
                              .join(" - ")}
                          </div>
                          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <OriginLink to="/app/finance" style={actionBtn("soft")}>
                              Open Finance Record
                            </OriginLink>
                            <OriginLink
                              to={
                                expectedPaymentState(item) === "Awaiting issue"
                                  ? "/app/payment/pool"
                                  : "/app/payment-rails"
                              }
                              style={actionBtn("soft")}
                            >
                              {expectedPaymentState(item) === "Awaiting issue"
                                ? "Open Money In"
                                : "Open Payment Rails"}
                            </OriginLink>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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
            <div style={sectionLabel()}>Demand Control Box</div>
            <div
              style={{
                marginTop: 8,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.75,
                maxWidth: 860,
              }}
            >
              Raise demand here, review what is already open, and continue into
              Demand Box when you need the fuller follow-up path.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>My open: {myOpenDemands.length}</span>
            <span style={badge(false)}>Community open: {visibleDemands.length}</span>
            <span style={badge(false)}>Urgent: {urgentDemandCount}</span>
          </div>
        </div>

        <ExplainToggle
          label="What this demand box does"
          what="This keeps the current community's live need signals in one place so users can raise a new demand, review what is already open, and decide the next follow-up."
          why="Demand works best when it feels like a real community signal desk rather than a static note or a hidden side route."
          next="Read the next action first, then create a new demand or open Demand Box when you need the fuller workflow and follow-up view."
          tone="light"
          style={{ marginTop: 12 }}
        />

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.12fr) minmax(320px, 0.88fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div style={softCard("#F8FBFF")}>
            <div style={sectionLabel()}>Current next action</div>
            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 22,
                fontWeight: 900,
                lineHeight: 1.28,
              }}
            >
              {demandNextAction.title}
            </div>
            <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.78 }}>
              {demandNextAction.detail}
            </div>

            {demandSyncIssue ? (
              <div style={{ marginTop: 12, ...noticeCard("error") }}>
                {demandSyncIssue}
              </div>
            ) : null}

            <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <OriginLink to="/app/demand-box#demand-box-create" style={actionBtn("primary")}>
                Create Demand
              </OriginLink>
              <OriginLink to="/app/demand-box" style={actionBtn("secondary")}>
                Open Demand Box
              </OriginLink>
              <OriginLink to="/app/notifications" style={actionBtn("soft")}>
                Open Action Inbox
              </OriginLink>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Live demand summary</div>

            <ExplainToggle
              label="What this live demand summary does"
              what="This card shows the open demand items that are currently visible for your community, including urgency, area, and the latest signal details."
              why="It helps users read the live need picture here first instead of guessing whether the community has active demand before opening the full Demand Box."
              next="Check what is already live here, then open Demand Box only when you need to create, update, or manage the underlying demand items."
              tone="light"
              style={{ marginTop: 12 }}
            />

            {demandLoading ? (
              <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.75 }}>
                Loading the current demand state for this community.
              </div>
            ) : demandPreviewRows.length === 0 ? (
              <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.75 }}>
                No open demand is visible right now. Create the next real need here
                when the community has something that should become a live signal.
              </div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {demandPreviewRows.map((row, index) => (
                  <div key={`${row?.id || index}`} style={innerCard("#FCFEFF")}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={badge(true)}>{demandUrgencyLabel(row?.urgency)}</span>
                      {safeStr(row?.status) ? (
                        <span style={badge(false)}>{safeStr(row?.status)}</span>
                      ) : null}
                      {safeStr(row?.area) ? (
                        <span style={badge(false)}>{safeStr(row?.area)}</span>
                      ) : null}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        color: "#0B1F33",
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      {firstTruthy(row?.title, row?.description, "Open community demand")}
                    </div>
                    <div style={{ marginTop: 8, color: "#5F7287", fontSize: 13, lineHeight: 1.7 }}>
                      {safeDateTime(row?.created_at) || "Recently posted"}
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <span style={badge(false)}>
                        {isMineDemandRow(row, me) ? "My demand" : "Community demand"}
                      </span>
                      <OriginLink to="/app/demand-box" style={actionBtn("soft")}>
                        Manage in Demand Box
                      </OriginLink>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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
              Keep this circle deliberate.
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

        <ExplainToggle
          label="What this trusted circle does"
          what="This is where the community owner builds the first layer of trusted real-life people who strengthen identity, support, and early growth."
          why="The trusted circle should feel deliberate, not random, because these relationships shape how the community becomes credible and useful."
          next="Review the progress first, then open First Circle to add or prepare the right people before copying the invite bundle."
          tone="light"
          style={{ marginTop: 12 }}
        />

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

        <ExplainToggle
          label="What this spotlight management does"
          what="This is where the current community prepares, previews, publishes, and checks the live spotlight that feeds the dashboard featured stage."
          why="Spotlight works better when users can see the publishing flow as one managed visibility lane instead of guessing between draft fields and live status."
          next="Prepare the spotlight details first, preview the result, then publish it and check the live state panel to confirm what the dashboard should now show."
          tone="light"
          style={{ marginTop: 12 }}
        />

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

              <ExplainToggle
                label="What this spotlight draft does"
                what="This draft card is where the current community sets the spotlight message, tag, expiry, and image before anything goes live."
                why="It keeps the publish step cleaner by separating preparation from the live state and preview checks."
                next="Fill in the draft first, review the preview beside it, then publish only when the spotlight details look complete."
                tone="light"
                style={{ marginTop: 12 }}
              />

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

              <div
                style={{
                  marginTop: 14,
                  ...innerCard("#FFFFFF"),
                  border: "1px solid rgba(11,31,51,0.08)",
                }}
              >
                <div style={sectionLabel()}>Live spotlight state</div>
                <ExplainToggle
                  label="What this live state does"
                  what="This confirms what spotlight is actually live for the current community right now, including the image, message, and expiry state that the dashboard should be showing."
                  why="It separates the published result from the draft fields so users can tell whether the community's live visibility state really updated."
                  next="Check this panel after publishing or refreshing, then return to the dashboard only when the live state here matches what you expect to see featured."
                  tone="light"
                  style={{ marginTop: 12 }}
                />
                {activeCommunitySpotlightLoading ? (
                  <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.75 }}>
                    Refreshing live spotlight state...
                  </div>
                ) : activeCommunitySpotlight ? (
                  <>
                    <div
                      style={{
                        marginTop: 12,
                        borderRadius: 18,
                        overflow: "hidden",
                        border: "1px solid rgba(212,175,55,0.14)",
                        background:
                  "linear-gradient(180deg, rgba(24,58,88,0.98) 0%, rgba(38,84,122,0.98) 100%)",
                        minHeight: 180,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {activeCommunitySpotlight.imageUrl ? (
                        <img
                          src={activeCommunitySpotlight.imageUrl}
                          alt="Live community spotlight"
                          style={{
                            width: "100%",
                            minHeight: 180,
                            maxHeight: 260,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            padding: 20,
                            textAlign: "center",
                            color: "#D7E3F1",
                            fontWeight: 800,
                            fontSize: 14,
                            lineHeight: 1.7,
                          }}
                        >
                          The active spotlight is live, but no image is attached to it.
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        color: "#0B1F33",
                        fontSize: 16,
                        fontWeight: 900,
                        lineHeight: 1.4,
                      }}
                    >
                      {activeCommunitySpotlight.message || "Live spotlight is active."}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={badge(true)}>Active now</span>
                      {activeCommunitySpotlight.expiresAt ? (
                        <span style={badge(false)}>
                          Expires: {new Date(activeCommunitySpotlight.expiresAt).toLocaleString()}
                        </span>
                      ) : (
                        <span style={badge(false)}>No expiry set</span>
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        color: "#5F7287",
                        fontSize: 13,
                        lineHeight: 1.75,
                      }}
                    >
                      This live spotlight belongs to your current community and
                      should return after refresh or restart while it remains active.
                    </div>
                  </>
                ) : activeCommunitySpotlightSyncIssue ? (
                  <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.75 }}>
                    Live spotlight data could not be confirmed just now. Refresh from this page or
                    retry after the community spotlight source becomes available again.
                    <div style={{ marginTop: 8, color: "#8A1C1C" }}>
                      Refresh note: {activeCommunitySpotlightSyncIssue}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 10, color: "#5F7287", fontSize: 14, lineHeight: 1.75 }}>
                    No active community spotlight is live right now. Publish from this panel and
                    the active state will appear here after backend confirmation.
                  </div>
                )}
                <div
                  style={{
                    marginTop: 12,
                    ...innerCard("#FCFEFF"),
                    border: "1px solid rgba(11,31,51,0.08)",
                  }}
                >
                  <div style={sectionLabel()}>Current next action</div>
                  <ExplainToggle
                    label="What this next action does"
                    what="This card names the next clean spotlight step for your current community after checking the live state above."
                    why="It helps you avoid guessing whether to publish, refresh, or replace the current run."
                    next="Follow this step first, then return to the dashboard once the live spotlight state matches what you expect."
                    tone="light"
                    style={{ marginTop: 12 }}
                  />
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontSize: 16,
                      fontWeight: 900,
                      lineHeight: 1.35,
                    }}
                  >
                    {communitySpotlightNextAction.title}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#5F7287",
                      fontSize: 13,
                      lineHeight: 1.75,
                    }}
                  >
                    {communitySpotlightNextAction.detail}
                  </div>
                </div>
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

              <ExplainToggle
                label="What this preview does"
                what="This preview shows how the current spotlight draft should look before it is published to the live featured surface."
                why="It helps users catch missing image, message, or tag details before they turn a draft into the community's live spotlight."
                next="Review this preview first, then publish only when it matches the spotlight you want the dashboard to feature."
                tone="light"
                style={{ marginTop: 12 }}
              />

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
              Choose the community you want to work with, then open it when you
              are ready to continue there.
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
                        ? "You are in your current community."
                        : "Select this community to make it current."}
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


