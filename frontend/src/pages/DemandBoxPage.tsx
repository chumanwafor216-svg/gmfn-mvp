import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import {
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  StableDisclosureSummary,
  SubtleButton,
} from "../components/StableButton";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import {
  createMarketplaceRequest,
  getCurrentClan,
  getMe,
  getSelectedClanId,
  listMyClans,
  listMarketplaceRequests,
  selectClan,
  setSelectedClanId as persistSelectedClanId,
  updateMarketplaceRequestStatus,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { revealElementWithoutJump } from "../lib/mobileRevealStability";

type DemandRow = {
  id?: number;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  urgency?: string | null;
  area?: string | null;
  whatsapp_number?: string | null;
  payment_mode?: string | null;
  allow_trust_credit?: boolean;
  status?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  requester_name?: string | null;
  requester_nickname?: string | null;
  requester_gmfn_id?: string | null;
  requester_email?: string | null;
  requester_trust_score?: number | null;
  requester_trust_band?: string | null;
  is_mine?: boolean;
  mine?: boolean;
};

type NoticeTone = "success" | "error";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
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

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    border: "1px solid rgba(20,52,83,0.24)",
    padding: 20,
    boxShadow:
      "0 30px 62px rgba(7,20,36,0.14), 0 10px 22px rgba(8,40,72,0.08), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -14px 28px rgba(18,52,86,0.06)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    border: "1px solid rgba(20,52,83,0.20)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    border: "1px solid rgba(20,52,83,0.18)",
  };
}

function detailsShell(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(13,95,168,0.12)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #FBFDFF 100%)",
    boxShadow:
      "0 14px 28px rgba(7,24,39,0.06), inset 0 1px 0 rgba(255,255,255,0.88)",
    overflow: "hidden",
  };
}

function detailsSummary(): React.CSSProperties {
  return {
    padding: "16px 18px",
    fontWeight: 900,
    color: "#0B1F33",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(13,95,168,0.11)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #FCFEFF 100%)",
    padding: "11px 12px",
    fontSize: 14,
    color: "#0B1F33",
    outline: "none",
    boxSizing: "border-box",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.92), 0 8px 18px rgba(15,23,42,0.025)",
  };
}

function textAreaStyle(): React.CSSProperties {
  return {
    ...inputStyle(),
    minHeight: 82,
    resize: "vertical" as const,
    lineHeight: 1.6,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4E6680",
    fontWeight: 900,
    letterSpacing: 0.55,
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
    background: primary
      ? "linear-gradient(180deg, rgba(11,99,209,0.14) 0%, rgba(11,99,209,0.08) 100%)"
      : "linear-gradient(180deg, rgba(100,116,139,0.12) 0%, rgba(100,116,139,0.08) 100%)",
    color: primary ? "#0B63D1" : "#31506D",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    border: primary
      ? "1px solid rgba(11,99,209,0.14)"
      : "1px solid rgba(148,163,184,0.14)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.72)",
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

function demandBrandShell(): React.CSSProperties {
  return {
    borderRadius: 26,
    border: "1px solid rgba(148,163,184,0.18)",
    background:
      "radial-gradient(circle at top left, rgba(11,99,209,0.35) 0%, rgba(11,99,209,0.00) 30%), linear-gradient(180deg, #08111F 0%, #0B1F33 54%, #102A43 100%)",
    padding: 20,
    boxShadow:
      "0 22px 48px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.10)",
    overflow: "hidden",
  };
}

function communityChoiceStyle(active: boolean): React.CSSProperties {
  return {
    height: 58,
    minHeight: 58,
    maxHeight: 58,
    justifyContent: "space-between",
    textAlign: "left",
    borderRadius: 16,
    padding: "0 13px",
    lineHeight: 1.24,
    border: active ? "1px solid rgba(11,99,209,0.24)" : undefined,
    background: active
      ? "linear-gradient(180deg, #FFFFFF 0%, #E7EFFA 100%)"
      : undefined,
    color: active ? "#123055" : undefined,
    fontWeight: active ? 900 : undefined,
    overflow: "hidden",
    overflowAnchor: "none",
    transition: "none",
  };
}

function demandActionRowStyle(
  isCompact: boolean,
  height = 54,
  minColumn = 156,
  marginTop = 0
): React.CSSProperties {
  return {
    marginTop,
    display: "grid",
    gridTemplateColumns: isCompact
      ? "1fr"
      : `repeat(auto-fit, minmax(${minColumn}px, 1fr))`,
    gridAutoRows: `${height}px`,
    gap: 10,
    alignItems: "stretch",
    justifyContent: "stretch",
    minHeight: height,
    overflowAnchor: "none",
    transition: "none",
  };
}

function demandActionStyle(height = 54): React.CSSProperties {
  return {
    width: "100%",
    height,
    minHeight: height,
    maxHeight: height,
    padding: "0 13px",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    lineHeight: 1.16,
    textAlign: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    textOverflow: "ellipsis",
    flexShrink: 0,
    overflowAnchor: "none",
    transition: "none",
  };
}

function demandIconText(
  name: GsnIconName,
  label: React.ReactNode,
  size = 22
): React.ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
        maxWidth: "100%",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <GsnLegacyIcon
        name={name}
        size={size}
        style={{ flex: "0 0 auto" }}
      />
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </span>
  );
}

function demandEmptyStateIcon(name: GsnIconName): React.ReactElement {
  return (
    <GsnLegacyIcon
      name={name}
      size={42}
      style={{
        flex: "0 0 auto",
        filter: "drop-shadow(0 12px 18px rgba(8,32,54,0.12))",
      }}
    />
  );
}

function demandHeroActionRowStyle(isCompact: boolean): React.CSSProperties {
  return {
    marginTop: isCompact ? 14 : 18,
    display: "grid",
    gridTemplateColumns: isCompact
      ? "minmax(0, 1fr) minmax(0, 1fr)"
      : "repeat(3, minmax(0, 1fr))",
    gridAutoRows: isCompact ? "52px" : "54px",
    gap: 10,
    alignItems: "stretch",
    overflowAnchor: "none",
    transition: "none",
  };
}

function demandHeroPrimaryActionStyle(isCompact: boolean): React.CSSProperties {
  return {
    ...demandActionStyle(isCompact ? 52 : 54),
    gridColumn: isCompact ? "1 / -1" : undefined,
  };
}

function recordCard(): React.CSSProperties {
  return {
    ...innerCard("#FCFEFF"),
    border: "1px solid rgba(11,99,209,0.11)",
    boxShadow:
      "0 14px 28px rgba(15,23,42,0.055), inset 0 1px 0 rgba(255,255,255,0.84)",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#466078",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function urgencyLabel(value?: string | null): string {
  const v = safeStr(value).toLowerCase();
  if (v === "high") return "Urgent";
  if (v === "low") return "Low pressure";
  return "Normal";
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function communityName(currentClan: any, selectedClanId: number): string {
  return (
    firstTruthy(
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name,
      currentClan?.title
    ) || (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
  );
}

function cciLabel(me: any): string {
  return firstTruthy(
    me?.cci_class,
    me?.cci_band,
    me?.cross_community_integrity_class,
    me?.cross_community_integrity_band
  );
}

function buildDemandDescription(
  description: string,
  responseEvidence: string
): string | undefined {
  const body = safeStr(description);
  const evidence = safeStr(responseEvidence);
  const parts = body ? [body] : [];

  if (evidence) {
    parts.push(`Response evidence expected: ${evidence}.`);
  }

  return parts.join("\n\n") || undefined;
}

function requesterName(row: DemandRow): string {
  return (
    firstTruthy(
      row?.requester_name,
      row?.requester_nickname,
      row?.requester_email,
      row?.requester_gmfn_id
    ) || "Member"
  );
}

function isMineRow(row: DemandRow, me: any): boolean {
  if (row?.is_mine === true || row?.mine === true) return true;

  const myGmfnId = safeStr(me?.gmfn_id).toUpperCase();
  const rowGmfnId = safeStr(row?.requester_gmfn_id).toUpperCase();

  if (myGmfnId && rowGmfnId && myGmfnId === rowGmfnId) return true;

  const myEmail = safeStr(me?.email).toLowerCase();
  const rowEmail = safeStr(row?.requester_email).toLowerCase();

  if (myEmail && rowEmail && myEmail === rowEmail) return true;

  return false;
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId }).to);
}

export default function DemandBoxPage() {
  const location = useLocation();
  const routeSelectedClanId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return positiveNumber(
      query.get("clan_id") ||
        query.get("community") ||
        query.get("community_id")
    );
  }, [location.search]);
  const [selectedClanId, setSelectedClanIdState] = useState<number>(() =>
    routeSelectedClanId || Number(getSelectedClanId() || 0)
  );
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "demand-box.nav.dashboard"),
      community: routeTarget("communityHome", selectedClanId, "demand-box.open-community"),
      marketplace: routeTarget("marketplace", selectedClanId, "demand-box.return"),
      notifications: routeTarget(
        "notifications",
        selectedClanId,
        "demand-box.open-notifications"
      ),
    }),
    [selectedClanId]
  );

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [myOpenRows, setMyOpenRows] = useState<DemandRow[]>([]);
  const [visibleRows, setVisibleRows] = useState<DemandRow[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState("normal");
  const [area, setArea] = useState("");
  const [category, setCategory] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [expiresInHours, setExpiresInHours] = useState("72");
  const [paymentMode, setPaymentMode] = useState("");
  const [responseEvidence, setResponseEvidence] = useState("");
  const [allowTrustCredit, setAllowTrustCredit] = useState(false);

  const [creating, setCreating] = useState(false);
  const [selectingClanId, setSelectingClanId] = useState<number>(0);
  const [updatingDemandId, setUpdatingDemandId] = useState<number>(0);
  const [createCommunityConfirmed, setCreateCommunityConfirmed] =
    useState(false);
  const demandCreateRevealRef = useRef<number | null>(null);

  useEffect(() => {
    if (routeSelectedClanId <= 0) return;
    persistSelectedClanId(routeSelectedClanId);
    setSelectedClanIdState(routeSelectedClanId);
  }, [routeSelectedClanId]);

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
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadPage = useCallback(async (clanId = selectedClanId) => {
    setLoading(true);

    try {
      const [meRes, currentClanRes, clansRes, myRes, visibleRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
        listMyClans().catch(() => []),
        listMarketplaceRequests({
          clan_id: clanId || undefined,
          mine_only: true,
          status: "open",
          limit: 50,
        }).catch(() => []),
        listMarketplaceRequests({
          clan_id: clanId || undefined,
          mine_only: false,
          status: "open",
          limit: 50,
        }).catch(() => []),
      ]);

      const communityRows = rowsOf<any>(clansRes);
      const selectedCommunity =
        communityRows.find(
          (row) => Number(row?.id || row?.clan_id || 0) === Number(clanId)
        ) || currentClanRes || null;
      const myRows = rowsOf<DemandRow>(myRes);
      const visibleAll = rowsOf<DemandRow>(visibleRes);

      const filteredVisible = visibleAll.filter(
        (row) => !isMineRow(row, meRes || null)
      );

      setMe(meRes || null);
      setCurrentClan(selectedCommunity);
      setCommunities(communityRows);
      setMyOpenRows(myRows);
      setVisibleRows(filteredVisible);
    } finally {
      setLoading(false);
    }
  }, [selectedClanId]);

  useEffect(() => {
    void loadPage(selectedClanId);
  }, [loadPage, selectedClanId]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  const revealDemandCreate = useCallback((attempt = 0) => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    if (demandCreateRevealRef.current !== null) {
      window.cancelAnimationFrame(demandCreateRevealRef.current);
      demandCreateRevealRef.current = null;
    }

    const target = document.getElementById("demand-box-create");
    if (!target) {
      if (attempt >= 6) return;
      demandCreateRevealRef.current = window.requestAnimationFrame(() => {
        revealDemandCreate(attempt + 1);
      });
      return;
    }

    revealElementWithoutJump(target, {
      surface: "demand-box",
      targetId: "demand-box-create",
      reason: "create-reveal",
    });

    demandCreateRevealRef.current = null;
  }, []);

  async function handleChooseDemandCommunity(community: any) {
    const clanId = Number(community?.id || community?.clan_id || 0);
    if (!clanId) {
      showNotice("error", "This community cannot be selected yet.");
      return;
    }

    setSelectingClanId(clanId);

    try {
      await selectClan(clanId);
      setSelectedClanIdState(clanId);
      setCurrentClan(community);
      if (isCreateMode) {
        setCreateCommunityConfirmed(true);
      }
      showNotice(
        "success",
        `${communityName(community, clanId)} selected for this demand.`
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Could not select that community."
      );
    } finally {
      setSelectingClanId(0);
    }
  }

  async function handleCreateDemand() {
    if (!selectedClanId) {
      showNotice("error", "Select a community first before creating a demand.");
      return;
    }

    if (!safeStr(title)) {
      showNotice("error", "Add what you need first.");
      return;
    }

    setCreating(true);

    try {
      await createMarketplaceRequest({
        title: safeStr(title),
        description: buildDemandDescription(description, responseEvidence),
        category: safeStr(category) || undefined,
        urgency: safeStr(urgency) || undefined,
        area: safeStr(area) || undefined,
        whatsapp_number: safeStr(whatsappNumber) || undefined,
        expires_in_hours: Number(expiresInHours || 0) > 0 ? Number(expiresInHours) : undefined,
        payment_mode: safeStr(paymentMode) || undefined,
        allow_trust_credit: allowTrustCredit,
        clan_id: selectedClanId,
      });

      setTitle("");
      setDescription("");
      setUrgency("normal");
      setArea("");
      setCategory("");
      setWhatsappNumber("");
      setExpiresInHours("72");
      setPaymentMode("");
      setResponseEvidence("");
      setAllowTrustCredit(false);

      await loadPage();
      showNotice("success", "Demand posted successfully.");
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Demand could not be created."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateDemandStatus(
    row: DemandRow,
    status: "fulfilled" | "cancelled"
  ) {
    const demandId = Number(row?.id || 0);
    if (!demandId) {
      showNotice("error", "This demand does not have a usable ID.");
      return;
    }

    setUpdatingDemandId(demandId);

    try {
      await updateMarketplaceRequestStatus(demandId, status);
      await loadPage();
      showNotice(
        "success",
        status === "fulfilled"
          ? "Demand marked as fulfilled."
          : "Demand cancelled."
      );
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Demand status could not be updated."
      );
    } finally {
      setUpdatingDemandId(0);
    }
  }

  const currentCommunityName = useMemo(
    () => communityName(currentClan, selectedClanId),
    [currentClan, selectedClanId]
  );

  const memberName = useMemo(() => {
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
  const memberCciLabel = cciLabel(me);

  const visiblePreview = useMemo(() => visibleRows.slice(0, 1), [visibleRows]);
  const extraVisibleRows = useMemo(() => visibleRows.slice(1, 5), [visibleRows]);
  const hiddenVisibleRowsCount = Math.max(visibleRows.length - 1, 0);
  const extraMyOpenRows = useMemo(() => myOpenRows.slice(1), [myOpenRows]);
  const demandMode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return safeStr(params.get("mode") || "").toLowerCase();
  }, [location.search]);
  const hasLegacyCreateHash = location.hash === "#demand-box-create";
  const isCreateMode = demandMode === "create" || hasLegacyCreateHash;
  const currentPath = `${location.pathname}${location.search}${
    hasLegacyCreateHash ? location.hash : ""
  }`;
  const originPath = useMemo(() => {
    if (!location.state || typeof location.state !== "object") return "";
    return safeStr(
      (location.state as any).originPath || (location.state as any).from || ""
    );
  }, [location.state]);
  const demandReturnTo =
    originPath && originPath !== currentPath ? originPath : routes.marketplace;
  const demandReturnLabel =
    originPath && originPath !== currentPath ? "Back to source" : "Marketplace";

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (loading) return;
    if (!isCreateMode) return;
    if (communities.length > 1 && !createCommunityConfirmed) return;

    revealDemandCreate();

      if (typeof window !== "undefined") {
        const params = new URLSearchParams(location.search);
        if (params.get("mode") === "create") {
          params.delete("mode");
        }
        const nextSearch = params.toString();
        const cleanUrl = `${location.pathname}${
          nextSearch ? `?${nextSearch}` : ""
        }`;
        window.history.replaceState(window.history.state, "", cleanUrl);
      }
    }, [
      communities.length,
      createCommunityConfirmed,
      isCreateMode,
    loading,
    location.pathname,
    location.search,
    revealDemandCreate,
  ]);

  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        demandCreateRevealRef.current !== null
      ) {
        window.cancelAnimationFrame(demandCreateRevealRef.current);
      }
    };
  }, []);

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
          sectionLabel="Demand Box"
          title="Demand Box"
          subtitle="Loading Demand Box..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={demandReturnTo}
          backLabel={demandReturnLabel}
        />

        <section style={pageCard("#FFFFFF")}>
          <div
            style={{
              color: "#64748B",
              lineHeight: 1.8,
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontWeight: 900,
            }}
          >
            <GsnLegacyIcon name="refresh" size={30} />
            <span>Loading Demand Box...</span>
          </div>
        </section>
      </div>
    );
  }

  if (!selectedClanId) {
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
          sectionLabel="Demand Box"
          title="Demand Box"
          subtitle="Choose the community before posting your personal request."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={demandReturnTo}
          backLabel={demandReturnLabel}
        />

        {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

        <section style={demandBrandShell()}>
          <div style={{ ...sectionLabel(), color: "#C9D7E8" }}>
            Choose community first
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#F8FBFF",
              fontSize: 28,
              fontWeight: 900,
              lineHeight: 1.15,
              maxWidth: 760,
            }}
          >
            Open Community Home first, then choose the community where this need belongs.
          </div>

          <div
            style={{
              marginTop: 12,
              ...helperText(),
              color: "#D7E3F1",
              maxWidth: 860,
            }}
          >
            Pick the community first. That helps people know where your request
            is coming from before they answer.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gap: 10,
            }}
          >
            {communities.length > 0 ? (
              communities.map((community, index) => {
                const clanId = Number(community?.id || community?.clan_id || 0);
                const busy = selectingClanId === clanId;

                return (
                  <SecondaryButton
                    key={`${clanId || index}`}
                    onClick={() => handleChooseDemandCommunity(community)}
                    disabled={busy || !clanId}
                    busy={busy}
                    busyLabel={
                      <>
                        <span>{communityName(community, clanId)}</span>
                        <span style={{ opacity: 0.76 }}>Selecting...</span>
                      </>
                    }
                    fullWidth
                    stableHeight={58}
                    debugId={`demand-box.community-missing.${clanId || index}`}
                    style={communityChoiceStyle(false)}
                  >
                    <span>{communityName(community, clanId)}</span>
                    <span style={{ opacity: 0.76 }}>
                      Choose
                    </span>
                  </SecondaryButton>
                );
              })
            ) : (
              <div style={{ color: "#D7E3F1", lineHeight: 1.8 }}>
                No community is available yet. Create or join a community first,
                then return to Demand Box.
              </div>
            )}

            <div style={demandActionRowStyle(isCompact, 54, 168)}>
              <StableCtaLink
                to={routes.community}
                debugId="demand-box.open-community"
                stableHeight={54}
                style={demandActionStyle(54)}
              >
                {demandIconText("community", "Community", 20)}
              </StableCtaLink>
              <StableCtaLink
                to={routes.dashboard}
                debugId="demand-box.missing-community-dashboard"
                stableHeight={54}
                style={demandActionStyle(54)}
              >
                {demandIconText("home", "Dashboard", 20)}
              </StableCtaLink>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (isCreateMode && communities.length > 1 && !createCommunityConfirmed) {
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
          sectionLabel="Demand Box"
          title="Choose community"
          subtitle="Community Home holds all your communities. Pick the one this demand should come from."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={demandReturnTo}
          backLabel={demandReturnLabel}
        />

        {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

        <section style={demandBrandShell()}>
          <div style={{ ...sectionLabel(), color: "#C9D7E8" }}>
            Demand flow
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#F8FBFF",
              fontSize: isCompact ? 28 : 34,
              fontWeight: 900,
              lineHeight: 1.12,
              maxWidth: 780,
            }}
          >
            Choose the community for this demand.
          </div>

          <div
            style={{
              marginTop: 12,
              ...helperText(),
              color: "#D7E3F1",
              maxWidth: 860,
            }}
          >
            Your request is personal. The community gives it the right trusted
            context. After you choose, GSN opens that community's marketplace
            demand form.
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={badge(false)}>Step 1: choose community</span>
            <span style={badge(false)}>Step 2: fill request</span>
            <span style={badge(false)}>Step 3: post demand</span>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 10,
            }}
          >
            {communities.map((community, index) => {
              const clanId = Number(community?.id || community?.clan_id || 0);
              const active = clanId > 0 && clanId === selectedClanId;
              const busy = selectingClanId === clanId;
              const ChoiceButton = active ? PrimaryButton : SecondaryButton;

              return (
                <ChoiceButton
                  key={`${clanId || index}`}
                  onClick={() => handleChooseDemandCommunity(community)}
                  disabled={busy || !clanId}
                  busy={busy}
                  busyLabel={
                    <>
                      <span>{communityName(community, clanId)}</span>
                      <span style={{ opacity: 0.82 }}>Opening...</span>
                    </>
                  }
                  fullWidth
                  stableHeight={58}
                  debugId={`demand-box.create-community.${clanId || index}`}
                  style={communityChoiceStyle(active)}
                >
                  <span>{communityName(community, clanId)}</span>
                  <span style={{ opacity: 0.82 }}>
                    {active ? "Use this" : "Choose"}
                  </span>
                </ChoiceButton>
              );
            })}
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
        sectionLabel="Demand Box"
        title={
          isCreateMode
            ? `${currentCommunityName} Demand Box`
            : "Demand Box"
        }
        subtitle={
          isCreateMode
            ? `You are posting from the ${currentCommunityName} marketplace.`
            : "Ask for what you need, from the right community, with trust attached."
        }
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={demandReturnTo}
        backLabel={demandReturnLabel}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      {!isCreateMode ? (
      <section
        style={{
          ...demandBrandShell(),
          padding: isCompact ? 16 : 20,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ ...sectionLabel(), color: "#C9D7E8" }}>
              Trusted request
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 24 : 34,
                lineHeight: 1.12,
              }}
            >
              Ask clearly from {currentCommunityName}.
            </div>

            <div
              style={{
                marginTop: 10,
                ...helperText(),
                color: "#D7E3F1",
                maxWidth: 840,
                lineHeight: isCompact ? 1.45 : 1.75,
              }}
            >
              Post one real need, keep the community context attached, and close
              it when it is answered.
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>From: {memberName}</span>
              <span style={badge(false)}>{currentCommunityName}</span>
              <span style={badge(false)}>My open needs: {myOpenRows.length}</span>
              <span style={badge(false)}>Visible needs: {visibleRows.length}</span>
              {memberCciLabel ? (
                <span style={badge(false)}>Trust: {memberCciLabel}</span>
              ) : null}
            </div>

            <div style={demandHeroActionRowStyle(isCompact)}>
              <SecondaryButton
                onClick={() => {
                  revealDemandCreate();
                }}
                debugId="demand-box.create"
                stableHeight={isCompact ? 52 : 54}
                style={demandHeroPrimaryActionStyle(isCompact)}
              >
                {demandIconText("document", "Create demand", 20)}
              </SecondaryButton>
              <StableCtaLink
                to={demandReturnTo}
                debugId="demand-box.return"
                stableHeight={isCompact ? 52 : 54}
                style={demandActionStyle(isCompact ? 52 : 54)}
              >
                {demandIconText("shop", demandReturnLabel, 20)}
              </StableCtaLink>
              <StableCtaLink
                to={routes.dashboard}
                debugId="demand-box.hero-dashboard"
                stableHeight={isCompact ? 52 : 54}
                style={demandActionStyle(isCompact ? 52 : 54)}
              >
                {demandIconText("home", "Dashboard", 20)}
              </StableCtaLink>
            </div>
          </div>

          <div
            style={{
              ...softCard("rgba(255,255,255,0.96)"),
              border: "1px solid rgba(212,175,55,0.14)",
              boxShadow: "0 18px 38px rgba(2,12,27,0.16)",
            }}
          >
            <div style={sectionLabel()}>Current state</div>

            <div
              style={{
                marginTop: 8,
                color: "#123055",
                fontWeight: 900,
                lineHeight: 1.28,
                fontSize: isCompact ? 18 : 20,
              }}
            >
              {myOpenRows.length > 0
                ? "You already have live demand."
                : "No personal demand is open."}
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(myOpenRows.length > 0)}>
                Mine: {myOpenRows.length}
              </span>
              <span style={badge(visibleRows.length > 0)}>
                Community: {visibleRows.length}
              </span>
              <span style={badge(true)}>Next: post or review</span>
              {safeStr(me?.gmfn_id) ? (
                <span style={badge(false)}>GSN ID: {safeStr(me?.gmfn_id)}</span>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#31506D",
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1.45,
              }}
            >
              Create only one clear request at a time. Mark it fulfilled or
              cancel it when the need is settled.
            </div>
          </div>
        </div>
      </section>
      ) : null}

      <section
        id="demand-box-create"
        style={pageCard(
          isCreateMode
            ? "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"
            : "#FFFFFF"
        )}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={sectionLabel()}>
              {isCreateMode ? "Marketplace demand form" : "Create demand"}
            </div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontSize: isCompact ? 24 : 30,
                fontWeight: 900,
                lineHeight: 1.12,
              }}
            >
              {isCreateMode
                ? `Create demand from ${currentCommunityName}.`
                : "Tell your community what you need."}
            </div>
            <div
              style={{
                marginTop: 8,
                ...helperText(),
                maxWidth: 760,
              }}
            >
              {isCreateMode
                ? "Fill in the need, contact, area, and evidence expectation. GSN keeps the community context attached."
                : "Keep it simple: what you need, where it is needed, how people can reach you, and what evidence or payment should be clear first."}
            </div>
          </div>
        </div>

        {isCreateMode ? (
          <div
            style={{
              marginTop: 14,
              ...innerCard("#F8FBFF"),
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <span style={badge(true)}>Community: {currentCommunityName}</span>
            <span style={badge(false)}>Marketplace context active</span>
            <span style={badge(false)}>Step 2: fill the request</span>
            <span style={badge(false)}>Step 3: post demand</span>
          </div>
        ) : null}

        {!isCreateMode ? (
        <details
          style={{
            marginTop: 14,
            ...innerCard("#F8FBFF"),
            padding: 0,
            overflow: "hidden",
          }}
        >
          <StableDisclosureSummary
            style={{
              ...detailsSummary(),
              padding: "0 14px",
            }}
            stableHeight={50}
            debugId="demand-box.change-community.summary"
          >
            <span>Change community</span>
            <span style={{ color: "#64748B", fontSize: 13 }}>
              {currentCommunityName}
            </span>
          </StableDisclosureSummary>

          <div
            style={{
              padding: "0 14px 14px",
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            {communities.length > 0 ? (
              communities.map((community, index) => {
                const clanId = Number(community?.id || community?.clan_id || 0);
                const active = clanId > 0 && clanId === selectedClanId;
                const busy = selectingClanId === clanId;
                const ChoiceButton = active ? PrimaryButton : SecondaryButton;

                return (
                  <ChoiceButton
                    key={`${clanId || index}`}
                    onClick={() => handleChooseDemandCommunity(community)}
                    disabled={busy || !clanId}
                    busy={busy}
                    busyLabel={
                      <>
                        <span>{communityName(community, clanId)}</span>
                        <span style={{ opacity: 0.82 }}>Selecting...</span>
                      </>
                    }
                    fullWidth
                    stableHeight={58}
                    debugId={`demand-box.form-community.${clanId || index}`}
                    style={communityChoiceStyle(active)}
                  >
                    <span>{communityName(community, clanId)}</span>
                    <span style={{ opacity: 0.82 }}>
                      {active ? "Selected" : "Choose"}
                    </span>
                  </ChoiceButton>
                );
              })
            ) : (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No community is available yet. Create or join one first.
              </div>
            )}
          </div>
        </details>
        ) : null}

        <div
          style={{
            marginTop: 12,
            ...innerCard("#FCFEFF"),
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={badge(true)}>Community: {currentCommunityName}</span>
          <span style={badge(false)}>Evidence optional</span>
          <span style={badge(false)}>Payment terms optional</span>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                <div style={sectionLabel()}>What do you need?</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Example: Need 5 bags of rice this week"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>

              <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                <div style={sectionLabel()}>Explain briefly</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a short explanation so people can understand the need quickly"
                  style={{ ...textAreaStyle(), marginTop: 8 }}
                />
              </div>

              <div style={{ gridColumn: isCompact ? "auto" : "1 / span 2" }}>
                <div style={sectionLabel()}>How should people contact you?</div>
                <input
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="Phone, WhatsApp, or short contact instruction"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>

              <div>
                <div style={sectionLabel()}>Urgency</div>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  style={{ ...inputStyle(), marginTop: 8 }}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <div style={sectionLabel()}>Area / location</div>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Area"
                  style={{ ...inputStyle(), marginTop: 8 }}
                />
              </div>

              <div>
                <div style={sectionLabel()}>Payment terms</div>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  style={{ ...inputStyle(), marginTop: 8 }}
                >
                  <option value="">Choose if needed</option>
                  <option value="Pay now">Pay now</option>
                  <option value="Pay later">Pay later</option>
                  <option value="Trust credit">Trust credit</option>
                  <option value="Negotiable">Negotiable</option>
                  <option value="Support / no payment">Support / no payment</option>
                </select>
              </div>

              <div>
                <div style={sectionLabel()}>Evidence from responder</div>
                <select
                  value={responseEvidence}
                  onChange={(e) => setResponseEvidence(e.target.value)}
                  style={{ ...inputStyle(), marginTop: 8 }}
                >
                  <option value="">Choose if needed</option>
                  <option value="Please share your GSN ID before work starts">
                    Share GSN ID first
                  </option>
                  <option value="Please share your TrustSlip before work starts">
                    Share TrustSlip first
                  </option>
                  <option value="Please confirm GSN ID and TrustSlip before work starts">
                    GSN ID and TrustSlip
                  </option>
                  <option value="No extra evidence needed before response">
                    No extra evidence
                  </option>
                </select>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                ...innerCard("#F8FBFF"),
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span style={badge(false)}>Sent by {memberName}</span>
              {safeStr(me?.gmfn_id) ? (
                <span style={badge(false)}>GSN ID {safeStr(me?.gmfn_id)}</span>
              ) : null}
              {memberCciLabel ? (
                <span style={badge(false)}>Wider consistency {memberCciLabel}</span>
              ) : null}
              <span style={badge(false)}>From {currentCommunityName}</span>
            </div>

            <div style={demandActionRowStyle(isCompact, 54, 180, 14)}>
              <PrimaryButton
                onClick={() => handleCreateDemand()}
                disabled={creating}
                busy={creating}
                busyLabel="Posting..."
                fullWidth
                stableHeight={54}
                debugId="demand-box.post"
                style={demandActionStyle(54)}
              >
                {demandIconText("document", "Post demand", 20)}
              </PrimaryButton>

              <StableCtaLink
                to={routes.notifications}
                fullWidth
                stableHeight={54}
                debugId="demand-box.open-notifications"
                style={demandActionStyle(54)}
              >
                {demandIconText("alert", "Notifications", 20)}
              </StableCtaLink>
            </div>
          </div>

          <div style={detailsShell()}>
            <details>
              <StableDisclosureSummary
                style={detailsSummary()}
                stableHeight={52}
                debugId="demand-box.more-detail"
              >
                <span>More detail</span>
                <span style={{ color: "#64748B", fontSize: 13 }}>Optional</span>
              </StableDisclosureSummary>

              <div style={{ padding: "0 18px 18px", display: "grid", gap: 12 }}>
                <div>
                  <div style={sectionLabel()}>Category</div>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Optional category"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div>
                  <div style={sectionLabel()}>Expiry in hours</div>
                  <input
                    type="number"
                    min="1"
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(e.target.value)}
                    placeholder="72"
                    style={{ ...inputStyle(), marginTop: 8 }}
                  />
                </div>

                <div style={innerCard("#F8FBFF")}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      color: "#0B1F33",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allowTrustCredit}
                      onChange={(e) => setAllowTrustCredit(e.target.checked)}
                    />
                    Open to trust credit where appropriate
                  </label>
                </div>
              </div>
            </details>
          </div>
        </div>
      </section>

      {!isCreateMode ? (
      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>My live demand</div>

          <div
            style={{
              marginTop: 10,
              ...helperText(),
              maxWidth: 760,
            }}
          >
            Keep only real needs open. When people have helped, or the need no
            longer matters, close it cleanly.
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {myOpenRows.length === 0 ? (
              <div
                style={{
                  ...recordCard(),
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                {demandEmptyStateIcon("document")}
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                    No open demand right now.
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    When you need goods, service, support, or help, create one
                    clear demand from the right community.
                  </div>
                </div>
              </div>
            ) : (
              <>
              {myOpenRows.slice(0, 1).map((row, index) => {
                const rowId = Number(row?.id || 0);
                const busy = updatingDemandId === rowId;

                return (
                  <div key={`${row?.id || index}`} style={recordCard()}>
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
                          lineHeight: 1.35,
                        }}
                      >
                        {firstTruthy(row?.title, "Need")}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={badge(true)}>{urgencyLabel(row?.urgency)}</span>
                        {safeStr(row?.status) ? (
                          <span style={badge(false)}>{safeStr(row?.status)}</span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, ...helperText() }}>
                      {firstTruthy(row?.description, "No extra detail yet.")}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {safeStr(row?.area) ? (
                        <span style={badge(false)}>Area: {safeStr(row?.area)}</span>
                      ) : null}
                      {safeStr(row?.payment_mode) ? (
                        <span style={badge(false)}>
                          Terms: {safeStr(row?.payment_mode)}
                        </span>
                      ) : null}
                      {row?.allow_trust_credit ? (
                        <span style={badge(false)}>Open to trust credit</span>
                      ) : null}
                      {safeStr(row?.created_at) ? (
                        <span style={badge(false)}>
                          {safeDateTime(row?.created_at)}
                        </span>
                      ) : null}
                    </div>

                    <div style={demandActionRowStyle(isCompact, 54, 160, 12)}>
                      <SecondaryButton
                        onClick={() => handleUpdateDemandStatus(row, "fulfilled")}
                        disabled={busy}
                        busy={busy}
                        busyLabel="Updating..."
                        debugId={`demand-box.request.${row?.id || index}.fulfilled`}
                        style={demandActionStyle(54)}
                      >
                        {demandIconText("check", "Fulfilled", 20)}
                      </SecondaryButton>

                      <SubtleButton
                        onClick={() => handleUpdateDemandStatus(row, "cancelled")}
                        disabled={busy}
                        busy={busy}
                        busyLabel="Updating..."
                        debugId={`demand-box.request.${row?.id || index}.cancelled`}
                        style={demandActionStyle(54)}
                      >
                        {demandIconText("lock", "Cancel", 20)}
                      </SubtleButton>
                    </div>
                  </div>
                );
              })}

              {extraMyOpenRows.length > 0 ? (
                <details style={detailsShell()}>
                  <StableDisclosureSummary
                    style={detailsSummary()}
                    stableHeight={52}
                    debugId="demand-box.more-my-demand.summary"
                  >
                    <span>More of my demand</span>
                    <span style={{ color: "#64748B", fontSize: 13 }}>
                      {extraMyOpenRows.length} more
                    </span>
                  </StableDisclosureSummary>

                  <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
                    {extraMyOpenRows.map((row, index) => {
                      const rowId = Number(row?.id || 0);
                      const busy = updatingDemandId === rowId;
                      const debugIndex = index + 1;

                      return (
                        <div key={`${row?.id || debugIndex}`} style={recordCard()}>
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
                                lineHeight: 1.35,
                              }}
                            >
                              {firstTruthy(row?.title, "Need")}
                            </div>

                            <div
                              style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                            >
                              <span style={badge(true)}>
                                {urgencyLabel(row?.urgency)}
                              </span>
                              {safeStr(row?.status) ? (
                                <span style={badge(false)}>
                                  {safeStr(row?.status)}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div style={{ marginTop: 8, ...helperText() }}>
                            {firstTruthy(row?.description, "No extra detail yet.")}
                          </div>

                          <div
                            style={{
                              marginTop: 10,
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {safeStr(row?.area) ? (
                              <span style={badge(false)}>
                                Area: {safeStr(row?.area)}
                              </span>
                            ) : null}
                            {safeStr(row?.payment_mode) ? (
                              <span style={badge(false)}>
                                Terms: {safeStr(row?.payment_mode)}
                              </span>
                            ) : null}
                            {row?.allow_trust_credit ? (
                              <span style={badge(false)}>Open to trust credit</span>
                            ) : null}
                            {safeStr(row?.created_at) ? (
                              <span style={badge(false)}>
                                {safeDateTime(row?.created_at)}
                              </span>
                            ) : null}
                          </div>

                          <div style={demandActionRowStyle(isCompact, 54, 160, 12)}>
                            <SecondaryButton
                              onClick={() =>
                                handleUpdateDemandStatus(row, "fulfilled")
                              }
                              disabled={busy}
                              busy={busy}
                              busyLabel="Updating..."
                              debugId={`demand-box.request.${row?.id || debugIndex}.fulfilled`}
                              style={demandActionStyle(54)}
                            >
                              {demandIconText("check", "Fulfilled", 20)}
                            </SecondaryButton>

                            <SubtleButton
                              onClick={() =>
                                handleUpdateDemandStatus(row, "cancelled")
                              }
                              disabled={busy}
                              busy={busy}
                              busyLabel="Updating..."
                              debugId={`demand-box.request.${row?.id || debugIndex}.cancelled`}
                              style={demandActionStyle(54)}
                            >
                              {demandIconText("lock", "Cancel", 20)}
                            </SubtleButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ) : null}
              </>
            )}
          </div>
        </section>

        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Requests I can answer</div>

          <div
            style={{
              marginTop: 10,
              ...helperText(),
              maxWidth: 760,
            }}
          >
            These are open needs from people in your current community. Read the
            trust signs before you decide how to respond. Trust-credit openness
            is a request preference, not approval to release goods, credit, or
            money.
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {visiblePreview.length === 0 ? (
              <div
                style={{
                  ...recordCard(),
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                {demandEmptyStateIcon("community")}
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                    No visible demand is waiting right now.
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>
                    When someone in this community asks for help, their request
                    will appear here with the identity and trust signs available.
                  </div>
                </div>
              </div>
            ) : (
              <>
              {visiblePreview.map((row, index) => (
                <div key={`${row?.id || index}`} style={recordCard()}>
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
                        lineHeight: 1.35,
                      }}
                    >
                      {firstTruthy(row?.title, "Need")}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={badge(true)}>{urgencyLabel(row?.urgency)}</span>
                      {safeStr(row?.requester_trust_band) ? (
                        <span style={badge(false)}>
                          Trust {safeStr(row?.requester_trust_band)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ marginTop: 8, ...helperText() }}>
                    {firstTruthy(row?.description, "No extra detail yet.")}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badge(false)}>By: {requesterName(row)}</span>
                    {safeStr(row?.requester_gmfn_id) ? (
                      <span style={badge(false)}>
                        GSN ID {safeStr(row?.requester_gmfn_id)}
                      </span>
                    ) : null}
                    {safeStr(row?.whatsapp_number) ? (
                      <span style={badge(false)}>
                        Contact: {safeStr(row?.whatsapp_number)}
                      </span>
                    ) : null}
                    {safeStr(row?.area) ? (
                      <span style={badge(false)}>Area: {safeStr(row?.area)}</span>
                    ) : null}
                    {safeStr(row?.payment_mode) ? (
                      <span style={badge(false)}>
                        Terms: {safeStr(row?.payment_mode)}
                      </span>
                    ) : null}
                    {row?.allow_trust_credit ? (
                      <span style={badge(false)}>Open to trust credit</span>
                    ) : null}
                  </div>
                </div>
              ))}

              {extraVisibleRows.length > 0 ? (
                <details style={detailsShell()}>
                  <StableDisclosureSummary
                    style={detailsSummary()}
                    stableHeight={52}
                    debugId="demand-box.more-visible-demand.summary"
                  >
                    <span>More community demand</span>
                    <span style={{ color: "#64748B", fontSize: 13 }}>
                      {hiddenVisibleRowsCount} more
                    </span>
                  </StableDisclosureSummary>

                  <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
                    {extraVisibleRows.map((row, index) => {
                      const debugIndex = index + 1;

                      return (
                        <div key={`${row?.id || debugIndex}`} style={recordCard()}>
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
                                lineHeight: 1.35,
                              }}
                            >
                              {firstTruthy(row?.title, "Need")}
                            </div>

                            <div
                              style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                            >
                              <span style={badge(true)}>
                                {urgencyLabel(row?.urgency)}
                              </span>
                              {safeStr(row?.requester_trust_band) ? (
                                <span style={badge(false)}>
                                  Trust {safeStr(row?.requester_trust_band)}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div style={{ marginTop: 8, ...helperText() }}>
                            {firstTruthy(row?.description, "No extra detail yet.")}
                          </div>

                          <div
                            style={{
                              marginTop: 10,
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <span style={badge(false)}>By: {requesterName(row)}</span>
                            {safeStr(row?.requester_gmfn_id) ? (
                              <span style={badge(false)}>
                                GSN ID {safeStr(row?.requester_gmfn_id)}
                              </span>
                            ) : null}
                            {safeStr(row?.whatsapp_number) ? (
                              <span style={badge(false)}>
                                Contact: {safeStr(row?.whatsapp_number)}
                              </span>
                            ) : null}
                            {safeStr(row?.area) ? (
                              <span style={badge(false)}>
                                Area: {safeStr(row?.area)}
                              </span>
                            ) : null}
                            {safeStr(row?.payment_mode) ? (
                              <span style={badge(false)}>
                                Terms: {safeStr(row?.payment_mode)}
                              </span>
                            ) : null}
                            {row?.allow_trust_credit ? (
                              <span style={badge(false)}>Open to trust credit</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              ) : null}
              </>
            )}
          </div>

          <div style={demandActionRowStyle(isCompact, 54, 156, 14)}>
            <StableCtaLink
              to={demandReturnTo}
              debugId="demand-box.bottom-return"
              stableHeight={54}
              style={demandActionStyle(54)}
            >
              {demandIconText("shop", demandReturnLabel, 20)}
            </StableCtaLink>
            <StableCtaLink
              to={routes.dashboard}
              debugId="demand-box.bottom-dashboard"
              stableHeight={54}
              style={demandActionStyle(54)}
            >
              {demandIconText("home", "Dashboard", 20)}
            </StableCtaLink>
          </div>
        </section>
      </section>
      ) : null}
    </div>
  );
}
