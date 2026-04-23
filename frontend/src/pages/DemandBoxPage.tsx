import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  createMarketplaceRequest,
  getCurrentClan,
  getMe,
  getSelectedClanId,
  listMyClans,
  listMarketplaceRequests,
  selectClan,
  updateMarketplaceRequestStatus,
} from "../lib/api";

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

function detailsShell(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    overflow: "hidden",
  };
}

function detailsSummary(): React.CSSProperties {
  return {
    listStyle: "none",
    cursor: "pointer",
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

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 14,
  };
}

const stableTapTarget: React.CSSProperties = {
  position: "relative",
  zIndex: 10,
  isolation: "isolate",
  WebkitTapHighlightColor: "transparent",
  touchAction: "manipulation",
  userSelect: "none",
  pointerEvents: "auto",
  transform: "translateZ(0)",
  outlineOffset: 4,
  boxSizing: "border-box",
  appearance: "none",
  WebkitAppearance: "none",
};

function guardButtonPress(event?: React.SyntheticEvent<HTMLElement>) {
  event?.stopPropagation();
}

function buttonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onTouchStart" | "onMouseDown"
> {
  return {
    onPointerDown: guardButtonPress,
    onTouchStart: guardButtonPress,
    onMouseDown: guardButtonPress,
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    ...stableTapTarget,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "12px 15px",
    borderRadius: 14,
    border: "none",
    background: disabled ? "#CBD5E1" : "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 900,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    lineHeight: 1.2,
    opacity: disabled ? 0.86 : 1,
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    ...stableTapTarget,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "12px 15px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    lineHeight: 1.2,
    opacity: disabled ? 0.86 : 1,
  };
}

function subtleBtn(disabled = false): React.CSSProperties {
  return {
    ...stableTapTarget,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#F8FBFF",
    color: disabled ? "#94A3B8" : "#24415C",
    fontWeight: 800,
    fontSize: 13,
    textAlign: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    lineHeight: 1.2,
    opacity: disabled ? 0.86 : 1,
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
    minHeight: 100,
    resize: "vertical" as const,
    lineHeight: 1.6,
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
    whiteSpace: "normal",
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

function whiteActionBtn(disabled = false): React.CSSProperties {
  return {
    ...secondaryBtn(disabled),
    minHeight: 44,
    padding: "10px 14px",
    border: "1px solid rgba(11,99,209,0.14)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F4F8FC 100%)",
    color: disabled ? "#94A3B8" : "#123055",
    fontWeight: 900,
    lineHeight: 1.22,
    boxShadow:
      "0 10px 20px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.86)",
  };
}

function communityChoiceBtn(active: boolean, disabled = false): React.CSSProperties {
  return {
    ...(active ? whiteActionBtn(disabled) : secondaryBtn(disabled)),
    width: "100%",
    minHeight: 52,
    justifyContent: "space-between",
    textAlign: "left",
    borderRadius: 16,
    padding: "11px 13px",
    lineHeight: 1.24,
  };
}

function recordCard(): React.CSSProperties {
  return {
    ...innerCard("#FCFEFF"),
    border: "1px solid rgba(11,99,209,0.08)",
    boxShadow: "0 10px 22px rgba(15,23,42,0.035)",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
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
  responseProof: string
): string | undefined {
  const body = safeStr(description);
  const proof = safeStr(responseProof);
  const parts = body ? [body] : [];

  if (proof) {
    parts.push(`Response proof expected: ${proof}.`);
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

export default function DemandBoxPage() {
  const location = useLocation();
  const [selectedClanId, setSelectedClanIdState] = useState<number>(() =>
    Number(getSelectedClanId() || 0)
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
  const [responseProof, setResponseProof] = useState("");
  const [allowTrustCredit, setAllowTrustCredit] = useState(false);

  const [creating, setCreating] = useState(false);
  const [selectingClanId, setSelectingClanId] = useState<number>(0);
  const [updatingDemandId, setUpdatingDemandId] = useState<number>(0);
  const [createCommunityConfirmed, setCreateCommunityConfirmed] =
    useState(false);

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

  async function loadPage(clanId = selectedClanId) {
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
  }

  useEffect(() => {
    void loadPage(selectedClanId);
  }, [selectedClanId]);

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function scrollToDemandCreate() {
    if (typeof document === "undefined") return;

    document.getElementById("demand-box-create")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

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
        description: buildDemandDescription(description, responseProof),
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
      setResponseProof("");
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

  const visiblePreview = useMemo(() => visibleRows.slice(0, 6), [visibleRows]);
  const isCreateMode = location.hash === "#demand-box-create";
  const currentPath = `${location.pathname}${location.search}${location.hash}`;
  const originPath = useMemo(() => {
    if (!location.state || typeof location.state !== "object") return "";
    return safeStr(
      (location.state as any).originPath || (location.state as any).from || ""
    );
  }, [location.state]);
  const demandReturnTo =
    originPath && originPath !== currentPath ? originPath : "/app/marketplace";
  const demandReturnLabel =
    originPath && originPath !== currentPath ? "Back to source" : "Marketplace";

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (loading) return;
    if (!isCreateMode) return;
    if (communities.length > 1 && !createCommunityConfirmed) return;

    const timer = window.setTimeout(() => {
      document.getElementById("demand-box-create")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [communities.length, createCommunityConfirmed, isCreateMode, loading]);

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
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo={demandReturnTo}
          backLabel={demandReturnLabel}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading Demand Box...
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
          homeTo="/app/dashboard"
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
                  <button
                    key={`${clanId || index}`}
                    type="button"
                    {...buttonGuardProps()}
                    onClick={(event) => {
                      guardButtonPress(event);
                      void handleChooseDemandCommunity(community);
                    }}
                    disabled={busy || !clanId}
                    style={communityChoiceBtn(false, busy || !clanId)}
                  >
                    <span>{communityName(community, clanId)}</span>
                    <span style={{ opacity: 0.76 }}>
                      {busy ? "Selecting..." : "Choose"}
                    </span>
                  </button>
                );
              })
            ) : (
              <div style={{ color: "#D7E3F1", lineHeight: 1.8 }}>
                No community is available yet. Create or join a community first,
                then return to Demand Box.
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <OriginLink to="/app/community" style={whiteActionBtn(false)}>
                Open Community Home
              </OriginLink>
              <OriginLink to="/app/dashboard" style={whiteActionBtn(false)}>
                Dashboard
              </OriginLink>
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
          homeTo="/app/dashboard"
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

              return (
                <button
                  key={`${clanId || index}`}
                  type="button"
                  {...buttonGuardProps()}
                  onClick={(event) => {
                    guardButtonPress(event);
                    void handleChooseDemandCommunity(community);
                  }}
                  disabled={busy || !clanId}
                  style={communityChoiceBtn(active, busy || !clanId)}
                >
                  <span>{communityName(community, clanId)}</span>
                  <span style={{ opacity: 0.82 }}>
                    {busy ? "Opening..." : active ? "Use this" : "Choose"}
                  </span>
                </button>
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
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo={demandReturnTo}
        backLabel={demandReturnLabel}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      {!isCreateMode ? (
      <section style={demandBrandShell()}>
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
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              Ask clearly. Let your trust speak before people answer.
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                color: "#D7E3F1",
                maxWidth: 840,
              }}
            >
              Demand Box is for a real personal need: a service, goods,
              support, or help. Choose the right community first so people know
              the community your request is coming from.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Member: {memberName}</span>
              {safeStr(me?.gmfn_id) ? (
                <span style={badge(false)}>GSN ID: {safeStr(me?.gmfn_id)}</span>
              ) : null}
              {memberCciLabel ? (
                <span style={badge(false)}>CCI: {memberCciLabel}</span>
              ) : null}
              <span style={badge(false)}>Context: {currentCommunityName}</span>
              <span style={badge(false)}>My open needs: {myOpenRows.length}</span>
              <span style={badge(false)}>Visible needs: {visibleRows.length}</span>
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                {...buttonGuardProps()}
                onClick={(event) => {
                  guardButtonPress(event);
                  scrollToDemandCreate();
                }}
                style={whiteActionBtn(false)}
              >
                Create demand
              </button>
              <OriginLink to={demandReturnTo} style={whiteActionBtn(false)}>
                {demandReturnLabel}
              </OriginLink>
              <OriginLink to="/app/dashboard" style={secondaryBtn(false)}>
                Dashboard
              </OriginLink>
            </div>
          </div>

          <div
            style={{
              ...softCard("rgba(255,255,255,0.96)"),
              border: "1px solid rgba(212,175,55,0.14)",
              boxShadow: "0 18px 38px rgba(2,12,27,0.16)",
            }}
          >
            <div style={sectionLabel()}>About Demand Box</div>

            <div
              style={{
                marginTop: 10,
                color: "#123055",
                fontWeight: 900,
                lineHeight: 1.45,
              }}
            >
              GSN keeps the request guided from start to finish.
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={sectionLabel()}>1</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  Choose community
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>2</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  Say need and contact
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>3</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  Agree proof and pay
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>4</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  Close it when settled
                </div>
              </div>
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
                ? "Fill in the need, contact, area, and proof expectation. GSN keeps the community context attached."
                : "Keep it simple: what you need, where it is needed, how people can reach you, and what proof or payment should be clear first."}
            </div>
          </div>

          {!isCreateMode ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <OriginLink to={demandReturnTo} style={whiteActionBtn(false)}>
              {demandReturnLabel}
            </OriginLink>
            <OriginLink to="/app/dashboard" style={whiteActionBtn(false)}>
              Dashboard
            </OriginLink>
          </div>
          ) : null}
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
        <div
          style={{
            marginTop: 14,
            ...innerCard("#F8FBFF"),
            display: "grid",
            gap: 12,
          }}
        >
          <div style={sectionLabel()}>Step 1: choose community</div>
          <div
            style={{
              ...helperText(),
              maxWidth: 820,
            }}
          >
            Your need is personal, but the community gives it trusted context.
            Choose where people should see and answer it.
          </div>

          <div
            style={{
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

                return (
                  <button
                    key={`${clanId || index}`}
                    type="button"
                    {...buttonGuardProps()}
                    onClick={(event) => {
                      guardButtonPress(event);
                      void handleChooseDemandCommunity(community);
                    }}
                    disabled={busy || !clanId}
                    style={communityChoiceBtn(active, busy || !clanId)}
                  >
                    <span>{communityName(community, clanId)}</span>
                    <span style={{ opacity: 0.82 }}>
                      {active ? "Selected" : busy ? "Selecting..." : "Choose"}
                    </span>
                  </button>
                );
              })
            ) : (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No community is available yet. Create or join one first.
              </div>
            )}
          </div>
        </div>
        ) : null}

        <div
          style={{
            marginTop: 14,
            ...innerCard("#FCFEFF"),
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <span style={badge(false)}>Your GSN trust signal travels with it</span>
          <span style={badge(false)}>Community gives context</span>
          <span style={badge(false)}>Proof and payment stay visible</span>
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
                <div style={sectionLabel()}>Proof from responder</div>
                <select
                  value={responseProof}
                  onChange={(e) => setResponseProof(e.target.value)}
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
                  <option value="No extra proof needed before response">
                    No extra proof
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
                <span style={badge(false)}>CCI {memberCciLabel}</span>
              ) : null}
              <span style={badge(false)}>From {currentCommunityName}</span>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(2, minmax(160px, 220px))",
                gap: 10,
                alignItems: "stretch",
              }}
            >
              <button
                type="button"
                {...buttonGuardProps()}
                onClick={(event) => {
                  guardButtonPress(event);
                  void handleCreateDemand();
                }}
                disabled={creating || !safeStr(title)}
                style={{
                  ...primaryBtn(creating || !safeStr(title)),
                  width: "100%",
                  minHeight: 46,
                }}
              >
                {creating ? "Posting..." : "Post demand"}
              </button>

              <OriginLink
                to="/app/notifications"
                style={{ ...whiteActionBtn(false), width: "100%" }}
              >
                Open notifications
              </OriginLink>
            </div>
          </div>

          <div style={detailsShell()}>
            <details>
              <summary
                {...buttonGuardProps()}
                onClick={guardButtonPress}
                style={detailsSummary()}
              >
                <span>More detail</span>
                <span style={{ color: "#64748B", fontSize: 13 }}>Optional</span>
              </summary>

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
                    Allow trust credit where appropriate
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
              <div style={recordCard()}>
                <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                  No open demand right now.
                </div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  When you need goods, service, support, or help, create one
                  clear demand from the right community.
                </div>
              </div>
            ) : (
              myOpenRows.map((row, index) => {
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
                        <span style={badge(false)}>Trust credit allowed</span>
                      ) : null}
                      {safeStr(row?.created_at) ? (
                        <span style={badge(false)}>
                          {safeDateTime(row?.created_at)}
                        </span>
                      ) : null}
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
                        {...buttonGuardProps()}
                        onClick={(event) => {
                          guardButtonPress(event);
                          void handleUpdateDemandStatus(row, "fulfilled");
                        }}
                        disabled={busy}
                        style={secondaryBtn(busy)}
                      >
                        {busy ? "Updating..." : "Mark fulfilled"}
                      </button>

                      <button
                        type="button"
                        {...buttonGuardProps()}
                        onClick={(event) => {
                          guardButtonPress(event);
                          void handleUpdateDemandStatus(row, "cancelled");
                        }}
                        disabled={busy}
                        style={subtleBtn(busy)}
                      >
                        {busy ? "Updating..." : "Cancel demand"}
                      </button>
                    </div>
                  </div>
                );
              })
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
            trust signs before you decide how to respond.
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {visiblePreview.length === 0 ? (
              <div style={recordCard()}>
                <div style={{ color: "#0B1F33", fontWeight: 900 }}>
                  No visible demand is waiting right now.
                </div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  When someone in this community asks for help, their request
                  will appear here with the identity and trust signs available.
                </div>
              </div>
            ) : (
              visiblePreview.map((row, index) => (
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
                      <span style={badge(false)}>Trust credit allowed</span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <OriginLink to={demandReturnTo} style={secondaryBtn(false)}>
              {demandReturnLabel}
            </OriginLink>
            <OriginLink to="/app/dashboard" style={secondaryBtn(false)}>
              Dashboard
            </OriginLink>
          </div>
        </section>
      </section>
      ) : null}
    </div>
  );
}
