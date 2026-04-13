import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  getCurrentClan,
  getMe,
  getMyGuarantorEarnings,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";

type GuarantorEarningItem = {
  loan_guarantor_id?: number;
  loan_id?: number;
  clan_id?: number;
  share_amount?: string | number | null;
  weight_amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type CommunityLite = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  marketplace_name?: string | null;
  community_code?: string | null;
  role?: string | null;
  member_role?: string | null;
  membership_role?: string | null;
};

type MeLite = {
  gmfn_id?: string | null;
  display_name?: string | null;
  nickname?: string | null;
  name?: string | null;
  first_name?: string | null;
  email?: string | null;
};

type NextStepState = {
  title: string;
  detail: string;
  today: string;
  tomorrow: string;
  ctaLabel: string;
  ctaTo: string;
};

type CollapseState = {
  overview: boolean;
  meaning: boolean;
  recent: boolean;
  routes: boolean;
};

const GUARANTOR_EARNINGS_UI_STORAGE_KEY = "gmfn.guarantorEarnings.sections.v1";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function toNum(x: any): number {
  const raw = safeStr(x).replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(x: any): string {
  return toNum(x).toFixed(2);
}

function safeDate(x: any): Date | null {
  const raw = safeStr(x);
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
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

function defaultCollapseState(): CollapseState {
  return {
    overview: false,
    meaning: false,
    recent: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    meaning: Boolean(raw?.meaning ?? base.meaning),
    recent: Boolean(raw?.recent ?? base.recent),
    routes: Boolean(raw?.routes ?? base.routes),
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
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

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function routeTile(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 104,
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

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    minHeight: 42,
    borderRadius: 14,
    border: "none",
    background: disabled ? "#CBD5E1" : "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    minHeight: 42,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
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

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#475569",
    fontSize: 12,
    fontWeight: 1000,
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

function getCommunityName(clan: CommunityLite | null): string {
  return safeStr(clan?.marketplace_name || clan?.name || "");
}

function getCommunityId(clan: CommunityLite | null): string {
  return safeStr(clan?.community_code || "");
}

function getCommunityRole(clan: CommunityLite | null): string {
  return firstTruthy(
    clan?.role,
    clan?.member_role,
    clan?.membership_role
  );
}

function getMemberName(me: MeLite | null): string {
  return (
    firstTruthy(
      me?.display_name,
      me?.nickname,
      me?.name,
      me?.first_name,
      me?.email
    ) || "Member"
  );
}

function normalizeEarning(raw: any): GuarantorEarningItem | null {
  if (!raw) return null;

  const src = raw?.item || raw?.earning || raw?.record || raw;

  return {
    loan_guarantor_id: Number(src?.loan_guarantor_id || src?.id || 0) || undefined,
    loan_id: Number(src?.loan_id || src?.support_loan_id || 0) || undefined,
    clan_id: Number(src?.clan_id || src?.community_id || 0) || undefined,
    share_amount:
      src?.share_amount ??
      src?.earned_amount ??
      src?.amount ??
      src?.guarantor_share ??
      null,
    weight_amount:
      src?.weight_amount ??
      src?.pledge_amount ??
      src?.locked_amount ??
      src?.weight ??
      null,
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN") || null,
    status: firstTruthy(src?.status, src?.earning_status, "pending") || null,
    created_at: firstTruthy(src?.created_at, src?.earned_at, src?.recorded_at) || null,
    updated_at: firstTruthy(src?.updated_at, src?.settled_at) || null,
  };
}

function statusTone(status: string) {
  const s = status.toLowerCase();

  if (s.includes("paid") || s.includes("earned") || s.includes("settled")) {
    return {
      bg: "#ECFDF5",
      border: "1px solid #A7F3D0",
      text: "#065F46",
    };
  }

  if (s.includes("pending") || s.includes("waiting")) {
    return {
      bg: "#EFF6FF",
      border: "1px solid #BFDBFE",
      text: "#1D4ED8",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid #E2E8F0",
    text: "#475569",
  };
}

function isSettledStatus(status: string): boolean {
  const s = safeStr(status).toLowerCase();
  return s.includes("paid") || s.includes("earned") || s.includes("settled");
}

function isPendingStatus(status: string): boolean {
  const s = safeStr(status).toLowerCase();
  return s.includes("pending") || s.includes("waiting");
}

function renderStepAction(step: NextStepState) {
  return (
    <Link to={step.ctaTo} style={primaryBtn(false)}>
      {step.ctaLabel}
    </Link>
  );
}

export default function GuarantorEarningsPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(GUARANTOR_EARNINGS_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [data, setData] = useState<any>(null);
  const [community, setCommunity] = useState<CommunityLite | null>(null);
  const [me, setMe] = useState<MeLite | null>(null);
  const [items, setItems] = useState<GuarantorEarningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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
    writeLocalJSON(GUARANTOR_EARNINGS_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      try {
        const [res, clanRes, meRes] = await Promise.all([
          getMyGuarantorEarnings(100),
          getCurrentClan().catch(() => null),
          getMe().catch(() => null),
        ]);

        const rows = (Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [])
          .map((row: any) => normalizeEarning(row))
          .filter(Boolean) as GuarantorEarningItem[];

        const sorted = [...rows].sort((a, b) => {
          const da = safeDate(a?.created_at || a?.updated_at || "")?.getTime() || 0;
          const db = safeDate(b?.created_at || b?.updated_at || "")?.getTime() || 0;
          return db - da;
        });

        setData(res || null);
        setCommunity(clanRes || null);
        setMe(meRes || null);
        setItems(sorted);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load guarantor earnings."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasExplicitCommunityTags = useMemo(() => {
    return items.some((row) => Number(row?.clan_id || 0) > 0);
  }, [items]);

  const visibleItems = useMemo(() => {
    if (!selectedClanId) return [];

    if (!hasExplicitCommunityTags) {
      return items;
    }

    return items.filter((row) => Number(row?.clan_id || 0) === selectedClanId);
  }, [items, selectedClanId, hasExplicitCommunityTags]);

  const currency = safeStr(
    visibleItems?.[0]?.currency || items?.[0]?.currency || data?.currency || "NGN"
  );

  const selectedCommunityLabel = useMemo(() => {
    return (
      getCommunityName(community) ||
      (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
    );
  }, [community, selectedClanId]);

  const communityPublicId = useMemo(() => {
    return getCommunityId(community) || "Pending";
  }, [community]);

  const memberRole = useMemo(() => {
    return getCommunityRole(community);
  }, [community]);

  const memberName = useMemo(() => getMemberName(me), [me]);
  const gmfnId = useMemo(() => firstTruthy(me?.gmfn_id, "Pending"), [me]);

  const totals = useMemo(() => {
    const total = visibleItems.reduce(
      (sum: number, row: GuarantorEarningItem) => sum + toNum(row?.share_amount),
      0
    );

    const totalWeight = visibleItems.reduce(
      (sum: number, row: GuarantorEarningItem) => sum + toNum(row?.weight_amount),
      0
    );

    const now = new Date();

    const thisMonth = visibleItems
      .filter((row: GuarantorEarningItem) => {
        const d = safeDate(row?.created_at || row?.updated_at || "");
        return !!d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce(
        (sum: number, row: GuarantorEarningItem) => sum + toNum(row?.share_amount),
        0
      );

    const thisYear = visibleItems
      .filter((row: GuarantorEarningItem) => {
        const d = safeDate(row?.created_at || row?.updated_at || "");
        return !!d && d.getFullYear() === now.getFullYear();
      })
      .reduce(
        (sum: number, row: GuarantorEarningItem) => sum + toNum(row?.share_amount),
        0
      );

    const settledCount = visibleItems.filter((row) =>
      isSettledStatus(safeStr(row?.status))
    ).length;
    const pendingCount = visibleItems.filter((row) =>
      isPendingStatus(safeStr(row?.status))
    ).length;

    const latestDate =
      visibleItems
        .map((row) => safeDate(row?.created_at || row?.updated_at || ""))
        .filter(Boolean)
        .sort((a, b) => (b!.getTime() - a!.getTime()))[0] || null;

    return { total, totalWeight, thisMonth, thisYear, settledCount, pendingCount, latestDate };
  }, [visibleItems]);

  const nextStep = useMemo<NextStepState>(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community context first",
        detail:
          "Guarantor earnings should stay anchored to the selected community support path before you read them as current context.",
        today: "Open Community Home and confirm the community you are working in.",
        tomorrow:
          "A selected community keeps support history and earnings easier to interpret.",
        ctaLabel: "Open Community Home",
        ctaTo: "/app/community",
      };
    }

    if (totals.pendingCount > 0) {
      return {
        title:
          totals.pendingCount === 1
            ? "One guarantor earning is still pending"
            : `${totals.pendingCount} guarantor earnings are still pending`,
        detail:
          "Your next move is to watch the active support path, not to ignore it. Earnings become meaningful when the support cycle closes properly.",
        today: "Review the active support items and keep the pending path moving.",
        tomorrow:
          "Settled support creates clearer earnings and stronger visible contribution.",
        ctaLabel: "Return to Loans & Support",
        ctaTo: "/app/loans",
      };
    }

    if (totals.total > 0) {
      return {
        title: "Your guarantor contribution is now visible value",
        detail:
          "Supporting responsible borrowers should not remain invisible. This page keeps that contribution readable and measurable inside the selected community context.",
        today: "Review your recent earnings and keep your support behaviour steady.",
        tomorrow:
          "Consistent guarantor support can strengthen both visible value and visible reputation over time.",
        ctaLabel: "Open Community Home",
        ctaTo: "/app/community",
      };
    }

    return {
      title: "No guarantor earnings are visible yet",
      detail:
        "That does not mean the path is useless. It means the earnings side of the support cycle has not materialized yet in your visible records.",
      today: "Continue using the guided support path rather than forcing the earnings question too early.",
      tomorrow:
        "Visible earnings usually come after responsible support behaviour has had time to settle.",
      ctaLabel: "Return to Loans & Support",
      ctaTo: "/app/loans",
    };
  }, [selectedClanId, totals.pendingCount, totals.total]);

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function copySummary() {
    const text = [
      `Community: ${selectedCommunityLabel}`,
      `Community ID: ${communityPublicId}`,
      `Member: ${memberName}`,
      `GMFN ID: ${gmfnId}`,
      memberRole ? `Role: ${memberRole}` : "",
      `Total earned: ${fmtMoney(totals.total)} ${currency}`,
      `This month: ${fmtMoney(totals.thisMonth)} ${currency}`,
      `This year: ${fmtMoney(totals.thisYear)} ${currency}`,
      `Settled items: ${totals.settledCount}`,
      `Pending items: ${totals.pendingCount}`,
    ]
      .filter(Boolean)
      .join("\n");

    safeCopy(text);
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Guarantor Earnings"
        title="Guarantor Earnings"
        subtitle="See what you have earned by supporting successful community loans."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/loans"
        backLabel="Loans & Support"
        nextLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "Loan Workbench", to: "/app/loan-workbench" },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
        utilityLinks={[
          { label: "Money Out", to: "/app/withdrawal-instructions" },
          { label: "Loan Suggestions", to: "/app/loan-suggestions" },
        ]}
      />

      {err ? (
        <div style={{ ...softCard("#FEF2E2"), marginTop: 18, color: "#991B1B", fontWeight: 900 }}>
          {err}
        </div>
      ) : null}

      <section
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
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
            <div style={sectionLabel()}>Fixed earnings context</div>

            <div
              style={{
                marginTop: 10,
                fontWeight: 1000,
                color: "#0B1F33",
                fontSize: 30,
                lineHeight: 1.15,
              }}
            >
              {nextStep.title}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#6B7A88",
                lineHeight: 1.8,
              }}
            >
              This page is the member-facing earnings record for guarantor participation.
              It should keep that contribution readable inside the selected community
              instead of leaving it buried under the wider support flow.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr 1fr"
                  : "repeat(4, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={sectionLabel()}>Community</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                  }}
                >
                  {selectedCommunityLabel}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Community ID</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {communityPublicId}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>GMFN ID</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {gmfnId}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Current step</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                  }}
                >
                  Earnings review
                </div>
              </div>
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
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Currency: {currency}</span>
              <span style={badge(false)}>Settled: {totals.settledCount}</span>
              <span style={badge(false)}>Pending: {totals.pendingCount}</span>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {renderStepAction(nextStep)}
              <button type="button" onClick={copySummary} style={secondaryBtn(false)}>
                Copy Earnings Summary
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Today</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                {nextStep.today}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Tomorrow</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                {nextStep.tomorrow}
              </div>
            </div>
          </div>
        </div>
      </section>

      {selectedClanId && !hasExplicitCommunityTags && visibleItems.length > 0 ? (
        <section
          style={{
            ...pageCard("#FFFDF5"),
            marginTop: 18,
            border: "1px solid rgba(214,175,71,0.25)",
          }}
        >
          <div style={{ fontWeight: 1000, color: "#92400E" }}>Current feed note</div>

          <div
            style={{
              marginTop: 8,
              color: "#475569",
              lineHeight: 1.8,
            }}
          >
            This earnings feed is not returning community tags yet. The page is
            staying inside your selected community context, but the API response
            should later become stricter so every earning row is explicitly
            community-scoped.
          </div>
        </section>
      ) : null}

      {loading ? (
        <div style={{ ...pageCard(), marginTop: 18, color: "#64748B" }}>
          Loading guarantor earnings...
        </div>
      ) : (
        <>
          <section style={{ ...pageCard(), marginTop: 18 }}>
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
                <div style={sectionLabel()}>Earnings overview</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Core earnings totals for the selected community context.
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleSection("overview")}
                style={collapseToggle()}
              >
                {collapsed.overview ? "Open" : "Collapse"}
              </button>
            </div>

            {!collapsed.overview ? (
              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "repeat(4, minmax(0, 1fr))",
                  gap: 14,
                }}
              >
                <div style={statTile()}>
                  <div style={sectionLabel()}>Total earned</div>
                  <div
                    style={{
                      marginTop: 8,
                      fontWeight: 1000,
                      fontSize: 28,
                      color: "#0B1F33",
                    }}
                  >
                    {fmtMoney(totals.total)} {currency}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>This month</div>
                  <div
                    style={{
                      marginTop: 8,
                      fontWeight: 1000,
                      fontSize: 28,
                      color: "#0B1F33",
                    }}
                  >
                    {fmtMoney(totals.thisMonth)} {currency}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>This year</div>
                  <div
                    style={{
                      marginTop: 8,
                      fontWeight: 1000,
                      fontSize: 28,
                      color: "#0B1F33",
                    }}
                  >
                    {fmtMoney(totals.thisYear)} {currency}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Contribution weight</div>
                  <div
                    style={{
                      marginTop: 8,
                      fontWeight: 1000,
                      fontSize: 28,
                      color: "#0B1F33",
                    }}
                  >
                    {fmtMoney(totals.totalWeight)} {currency}
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section style={{ ...pageCard("#F8FBFF"), marginTop: 18 }}>
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
                <div style={sectionLabel()}>Why this matters</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Keep the meaning of guarantor contribution visible.
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleSection("meaning")}
                style={collapseToggle()}
              >
                {collapsed.meaning ? "Open" : "Collapse"}
              </button>
            </div>

            {!collapsed.meaning ? (
              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                  gap: 12,
                }}
              >
                <div style={innerCard("#FFFFFF")}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 1000,
                      color: "#0B1F33",
                    }}
                  >
                    Visible contribution
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#475569",
                      lineHeight: 1.8,
                    }}
                  >
                    Supporting responsible borrowers can create real value over time.
                    The system should help you see that responsible guarantor support
                    is not invisible.
                  </div>
                </div>

                <div style={innerCard("#FFFDF5")}>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 1000,
                      color: "#0B1F33",
                    }}
                  >
                    Encouragement
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#475569",
                      lineHeight: 1.8,
                    }}
                  >
                    As your guarantor earnings grow, GMFN should remind you that
                    standing behind responsible people can also create visible value
                    and visible reputation for you.
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          <section style={{ ...pageCard(), marginTop: 18 }}>
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
                <div style={sectionLabel()}>Recent earnings</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Recent guarantor earnings inside the current working context.
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <span style={badge(false)}>{visibleItems.length} visible records</span>
                {totals.latestDate ? (
                  <span style={badge(false)}>
                    Latest: {safeDateTime(totals.latestDate.toISOString())}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => toggleSection("recent")}
                  style={collapseToggle()}
                >
                  {collapsed.recent ? "Open" : "Collapse"}
                </button>
              </div>
            </div>

            {!collapsed.recent ? (
              <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                {visibleItems.length === 0 ? (
                  <div style={{ color: "#7A8D9F", lineHeight: 1.8 }}>
                    {selectedClanId
                      ? "No guarantor earnings found yet in this working context."
                      : "Select a community first to keep earnings inside the correct support context."}
                  </div>
                ) : (
                  visibleItems.map((earning: GuarantorEarningItem, idx: number) => {
                    const status = safeStr(earning?.status || "—");
                    const tone = statusTone(status);

                    return (
                      <div
                        key={earning?.loan_guarantor_id || idx}
                        style={innerCard("#FFFFFF")}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ minWidth: 240 }}>
                            <div
                              style={{
                                fontWeight: 1000,
                                color: "#0B1F33",
                                fontSize: 17,
                              }}
                            >
                              Loan #{safeStr(earning?.loan_id || "—")}
                            </div>

                            <div
                              style={{
                                marginTop: 8,
                                display: "grid",
                                gap: 6,
                                color: "#64748B",
                                lineHeight: 1.7,
                                fontSize: 14,
                              }}
                            >
                              <div>
                                Contribution weight:{" "}
                                <strong style={{ color: "#0B1F33" }}>
                                  {safeStr(earning?.weight_amount || "0")}{" "}
                                  {safeStr(earning?.currency || currency)}
                                </strong>
                              </div>
                              <div>
                                Recorded: {safeDateTime(earning?.created_at || earning?.updated_at)}
                              </div>
                            </div>
                          </div>

                          <div style={{ textAlign: "right", minWidth: 140 }}>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "6px 10px",
                                borderRadius: 999,
                                background: tone.bg,
                                border: tone.border,
                                color: tone.text,
                                fontSize: 12,
                                fontWeight: 1000,
                              }}
                            >
                              {status}
                            </div>

                            <div
                              style={{
                                marginTop: 10,
                                fontSize: 12,
                                color: "#64748B",
                                fontWeight: 1000,
                              }}
                            >
                              EARNED
                            </div>

                            <div
                              style={{
                                marginTop: 6,
                                fontWeight: 1000,
                                fontSize: 18,
                                color: isSettledStatus(status) ? "#065F46" : "#0B1F33",
                              }}
                            >
                              {safeStr(earning?.share_amount || "0")}{" "}
                              {safeStr(earning?.currency || currency)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}
          </section>

          <section style={{ ...pageCard(), marginTop: 18 }}>
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
                <div style={sectionLabel()}>Working routes</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Move from earnings reading into the exact next support page you need.
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleSection("routes")}
                style={collapseToggle()}
              >
                {collapsed.routes ? "Open" : "Collapse"}
              </button>
            </div>

            {!collapsed.routes ? (
              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <Link to={nextStep.ctaTo} style={routeTile(true)}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    {nextStep.ctaLabel}
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    {nextStep.detail}
                  </div>
                </Link>

                <Link to="/app/loan-workbench" style={routeTile(false)}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Loan Workbench
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Use this when you need the deeper support work item behind the earnings result.
                  </div>
                </Link>

                <Link to="/app/loan-suggestions" style={routeTile(false)}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Loan Suggestions
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Use this when the next question is candidate fit rather than earnings history.
                  </div>
                </Link>

                <Link to="/app/community" style={routeTile(false)}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Community Home
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Return to the wider selected-community control surface.
                  </div>
                </Link>

                <Link to="/app/marketplace" style={routeTile(false)}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Marketplace
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Return to the selected-community launcher surface only after this earnings reading is complete.
                  </div>
                </Link>

                <Link to="/app/withdrawal-instructions" style={routeTile(false)}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Money Out
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Use this when the money question becomes a guided withdrawal question again.
                  </div>
                </Link>
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}