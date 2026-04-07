import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";

type NoticeTone = "success" | "error";

type CollapseState = {
  selection: boolean;
  summary: boolean;
  supporters: boolean;
  routes: boolean;
};

type LoanRow = {
  id?: number;
  clanId?: number;
  title?: string | null;
  amount?: string | null;
  currency?: string | null;
  status?: string | null;
  createdAt?: string | null;
  role?: string | null;
};

type LoanWorkbenchDetail = {
  id?: number;
  borrowerUserId?: number | null;
  clanId?: number | null;
  title?: string | null;
  amount?: string | null;
  currency?: string | null;
  status?: string | null;
  decisionByUserId?: number | null;
  decisionAt?: string | null;
  serviceFee?: string | null;
  netDisbursedAmount?: string | null;
  guarantorPool?: string | null;
  platformRevenue?: string | null;
  paidTotal?: string | null;
  remainingAmount?: string | null;
  repaidAt?: string | null;
  dueAt?: string | null;
  createdAt?: string | null;
  personalPoolAtRequest?: string | null;
  poolUsed?: string | null;
  guaranteeGap?: string | null;
  guarantorsRequired?: number | null;
};

type SuggestedGuarantor = {
  key: string;
  userId?: number;
  email?: string | null;
  trustScore?: string | null;
  trustBand?: string | null;
  reliabilityScore?: string | null;
  totalRequests?: number | null;
  approved?: number | null;
  declined?: number | null;
  expired?: number | null;
  reason?: string | null;
};

type LoanGuarantorRequest = {
  id?: number;
  loanId?: number | null;
  clanId?: number | null;
  guarantorUserId?: number | null;
  pledgeAmount?: string | null;
  status?: string | null;
  respondedAt?: string | null;
  isLocked?: boolean | null;
  lockedAmount?: string | null;
  releasedAmount?: string | null;
};

const LOAN_WORKBENCH_UI_STORAGE_KEY = "gmfn.loanWorkbench.sections.v1";
const FINAL_LOAN_STATUSES = new Set([
  "approved",
  "repaid",
  "closed",
  "completed",
  "cancelled",
  "defaulted",
]);

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

function firstDefined(...values: any[]): any {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return undefined;
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

async function callFirstAvailable<T = any>(
  names: string[],
  argsSets: any[][]
): Promise<T | null> {
  for (const name of names) {
    const fn = (api as any)[name];
    if (typeof fn !== "function") continue;

    for (const args of argsSets) {
      try {
        const result = await fn(...args);
        if (result) return result as T;
      } catch {
        // try next signature
      }
    }
  }

  return null;
}

function normalizeLoanRow(raw: any): LoanRow | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw;

  return {
    id: positiveNumber(firstDefined(src?.id, src?.loan_id)) || undefined,
    clanId: positiveNumber(firstDefined(src?.clan_id, src?.community_id)) || undefined,
    title: firstTruthy(
      src?.title,
      src?.purpose,
      src?.name,
      src?.loan_title,
      src?.description,
      "Loan support item"
    ),
    amount: firstTruthy(src?.amount, src?.loan_amount, src?.requested_amount),
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN"),
    status: firstTruthy(src?.status, src?.loan_status, src?.state, "open"),
    createdAt: firstTruthy(src?.created_at, src?.requested_at),
    role: firstTruthy(
      src?.role,
      src?.my_role,
      src?.participant_role,
      src?.is_borrower ? "Borrower" : "",
      src?.is_guarantor ? "Guarantor" : ""
    ),
  };
}

function normalizeLoanWorkbenchDetail(raw: any): LoanWorkbenchDetail | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw?.data || raw;

  return {
    id: positiveNumber(firstDefined(src?.id, src?.loan_id)) || undefined,
    borrowerUserId: positiveNumber(src?.borrower_user_id) || null,
    clanId: positiveNumber(firstDefined(src?.clan_id, src?.community_id)) || null,
    title: firstTruthy(
      src?.title,
      src?.purpose,
      src?.name,
      src?.loan_title,
      src?.description,
      "Loan workbench item"
    ),
    amount: firstTruthy(src?.amount),
    currency: firstTruthy(src?.currency, "NGN"),
    status: firstTruthy(src?.status, "pending"),
    decisionByUserId: positiveNumber(src?.decision_by_user_id) || null,
    decisionAt: firstTruthy(src?.decision_at),
    serviceFee: firstTruthy(src?.service_fee, "0.00"),
    netDisbursedAmount: firstTruthy(src?.net_disbursed_amount, "0.00"),
    guarantorPool: firstTruthy(src?.guarantor_pool, "0.00"),
    platformRevenue: firstTruthy(src?.platform_revenue, "0.00"),
    paidTotal: firstTruthy(src?.paid_total, "0.00"),
    remainingAmount: firstTruthy(src?.remaining_amount, "0.00"),
    repaidAt: firstTruthy(src?.repaid_at),
    dueAt: firstTruthy(src?.due_at),
    createdAt: firstTruthy(src?.created_at),
    personalPoolAtRequest: firstTruthy(src?.personal_pool_at_request, "0.00"),
    poolUsed: firstTruthy(src?.pool_used, "0.00"),
    guaranteeGap: firstTruthy(src?.guarantee_gap, "0.00"),
    guarantorsRequired: Number.isFinite(Number(src?.guarantors_required))
      ? Number(src?.guarantors_required)
      : null,
  };
}

function normalizeSuggestedGuarantor(raw: any): SuggestedGuarantor | null {
  if (!raw) return null;

  const src = raw?.item || raw?.member || raw?.user || raw?.candidate || raw;
  const userId = positiveNumber(src?.user_id);

  return {
    key: userId > 0 ? `u-${userId}` : `e-${safeStr(src?.email || Math.random())}`,
    userId: userId || undefined,
    email: firstTruthy(src?.email),
    trustScore: firstTruthy(src?.trust_score),
    trustBand: firstTruthy(src?.trust_band),
    reliabilityScore: firstTruthy(src?.reliability_score),
    totalRequests: Number.isFinite(Number(src?.total_requests))
      ? Number(src?.total_requests)
      : null,
    approved: Number.isFinite(Number(src?.approved)) ? Number(src?.approved) : null,
    declined: Number.isFinite(Number(src?.declined)) ? Number(src?.declined) : null,
    expired: Number.isFinite(Number(src?.expired)) ? Number(src?.expired) : null,
    reason: firstTruthy(src?.reason),
  };
}

function normalizeLoanGuarantorRequest(raw: any): LoanGuarantorRequest | null {
  if (!raw) return null;

  const src = raw?.item || raw?.request || raw?.guarantor_request || raw;

  return {
    id: positiveNumber(src?.id) || undefined,
    loanId: positiveNumber(src?.loan_id) || null,
    clanId: positiveNumber(src?.clan_id) || null,
    guarantorUserId: positiveNumber(src?.guarantor_user_id) || null,
    pledgeAmount: firstTruthy(src?.pledge_amount, "0.00"),
    status: firstTruthy(src?.status, "pending"),
    respondedAt: firstTruthy(src?.responded_at),
    isLocked: typeof src?.is_locked === "boolean" ? src.is_locked : null,
    lockedAmount: firstTruthy(src?.locked_amount, "0.00"),
    releasedAmount: firstTruthy(src?.released_amount, "0.00"),
  };
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

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
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
    selection: false,
    summary: false,
    supporters: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    selection: Boolean(raw?.selection ?? base.selection),
    summary: Boolean(raw?.summary ?? base.summary),
    supporters: Boolean(raw?.supporters ?? base.supporters),
    routes: Boolean(raw?.routes ?? base.routes),
  };
}

export default function LoanWorkbenchPage() {
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(LOAN_WORKBENCH_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<number>(0);
  const [loanDetail, setLoanDetail] = useState<LoanWorkbenchDetail | null>(null);
  const [suggestedGuarantors, setSuggestedGuarantors] = useState<SuggestedGuarantor[]>([]);
  const [guarantorRequests, setGuarantorRequests] = useState<LoanGuarantorRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
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
    writeLocalJSON(LOAN_WORKBENCH_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  async function loadLoanList() {
    const [meRes, clanRes, loansRes] = await Promise.all([
      typeof (api as any).getMe === "function"
        ? (api as any).getMe().catch(() => null)
        : Promise.resolve(null),
      typeof (api as any).getCurrentClan === "function"
        ? (api as any).getCurrentClan().catch(() => null)
        : Promise.resolve(null),
      typeof (api as any).listMyLoans === "function"
        ? (api as any).listMyLoans().catch(() => [])
        : Promise.resolve([]),
    ]);

    const normalizedLoans = rowsOf<any>(loansRes)
      .map((row) => normalizeLoanRow(row))
      .filter(Boolean) as LoanRow[];

    const filteredLoans = normalizedLoans.filter((row) => {
      const rowClanId = Number(row?.clanId || 0);
      return rowClanId <= 0 || rowClanId === selectedClanId;
    });

    filteredLoans.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    setMe(meRes || null);
    setCurrentClan(clanRes || null);
    setLoans(filteredLoans);

    return filteredLoans;
  }

  async function loadLoanWorkbench(loanId: number) {
    if (!loanId) {
      setLoanDetail(null);
      setSuggestedGuarantors([]);
      setGuarantorRequests([]);
      return;
    }

    const [detailRes, suggestionRes, requestRes] = await Promise.all([
      callFirstAvailable(
        ["getLoanSummary", "getLoan", "getLoanById"],
        [[loanId], [{ loan_id: loanId }], []]
      ),
      callFirstAvailable(
        [
          "getLoanGuarantorSuggestions",
          "getLoanGuarantorFit",
          "getGuarantorFitForLoan",
        ],
        [
          [loanId, { clan_id: selectedClanId || undefined, limit: 12 }],
          [{ loan_id: loanId, clan_id: selectedClanId || undefined, limit: 12 }],
          [loanId],
        ]
      ),
      callFirstAvailable(
        [
          "getLoanGuarantorRequests",
          "listLoanGuarantorRequests",
          "getLoanGuarantorInbox",
        ],
        [
          [loanId],
          [{ loan_id: loanId, clan_id: selectedClanId || undefined }],
          [{ clan_id: selectedClanId || undefined, status: "pending", limit: 50 }],
        ]
      ),
    ]);

    const normalizedDetail = normalizeLoanWorkbenchDetail(detailRes);
    const normalizedSuggestions = rowsOf<any>(suggestionRes)
      .map((row) => normalizeSuggestedGuarantor(row))
      .filter(Boolean) as SuggestedGuarantor[];
    const normalizedRequests = rowsOf<any>(requestRes)
      .map((row) => normalizeLoanGuarantorRequest(row))
      .filter((row): row is LoanGuarantorRequest => row != null)
      .filter((row) => {
        if (!row.loanId) return true;
        return Number(row.loanId) === Number(loanId);
       });

    setLoanDetail(normalizedDetail);
    setSuggestedGuarantors(normalizedSuggestions);
    setGuarantorRequests(normalizedRequests);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const loadedLoans = await loadLoanList();

        if (!alive) return;

        const activeBorrower = loadedLoans.find((row) => {
          const role = safeStr(row.role).toLowerCase();
          const status = safeStr(row.status).toLowerCase();
          return (
            (role === "borrower" || role.includes("borrow") || !role) &&
            !FINAL_LOAN_STATUSES.has(status)
          );
        });

        const nextLoanId =
          positiveNumber(activeBorrower?.id) ||
          positiveNumber(loadedLoans[0]?.id);

        setSelectedLoanId(nextLoanId);

        if (nextLoanId) {
          await loadLoanWorkbench(nextLoanId);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  async function handleSelectLoan(loanId: number) {
    setSelectedLoanId(loanId);
    await loadLoanWorkbench(loanId);
  }

  async function handleRefresh() {
    setRefreshing(true);

    try {
      const loadedLoans = await loadLoanList();
      const activeId =
        positiveNumber(selectedLoanId) || positiveNumber(loadedLoans[0]?.id);

      if (activeId) {
        await loadLoanWorkbench(activeId);
      }

      setNotice({
        tone: "success",
        text: "Loan workbench refreshed.",
      });
    } catch {
      setNotice({
        tone: "error",
        text: "Loan workbench could not be refreshed right now.",
      });
    } finally {
      setRefreshing(false);
    }
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function handleCopy(text: string, successText: string, emptyText: string) {
    const value = safeStr(text);
    if (!value) {
      setNotice({ tone: "error", text: emptyText });
      return;
    }

    if (typeof (api as any).safeCopy === "function") {
      (api as any).safeCopy(value);
    } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(value);
    }

    setNotice({ tone: "success", text: successText });
  }

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

  const communityLabel = useMemo(() => {
    return (
      firstTruthy(
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No selected community")
    );
  }, [currentClan, selectedClanId]);

  const selectedLoanRow = useMemo(() => {
    return (
      loans.find((row) => positiveNumber(row.id) === positiveNumber(selectedLoanId)) ||
      null
    );
  }, [loans, selectedLoanId]);

  const workbenchTitle = firstTruthy(
    loanDetail?.title,
    selectedLoanRow?.title,
    "Loan workbench"
  );

  const currentStatus = firstTruthy(
    loanDetail?.status,
    selectedLoanRow?.status,
    "pending"
  );

  const guarantorsRequired = positiveNumber(loanDetail?.guarantorsRequired ?? 0);
  const guaranteeGap = safeStr(loanDetail?.guaranteeGap || "0.00");
  const paidTotal = safeStr(loanDetail?.paidTotal || "0.00");
  const remainingAmount = safeStr(loanDetail?.remainingAmount || "0.00");

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
          sectionLabel="Loan Workbench"
          title="Loan Workbench"
          subtitle="Preparing the deeper loan workbench..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/loans"
          backLabel="Loans"
          nextLinks={[
            { label: "Loan Readiness", to: "/app/loan-readiness" },
            { label: "Loan Suggestions", to: "/app/loan-suggestions" },
          ]}
          utilityLinks={[
            { label: "Marketplace", to: "/app/marketplace" },
            { label: "Notifications", to: "/app/notifications" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading loan workbench...
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
        sectionLabel="Loan Workbench"
        title="Loan Workbench"
        subtitle="This page now shows the exact loan-side working fields returned by the backend: amount, guarantee gap, guarantors required, paid total, remaining amount, pool used, and related guarantor fit data."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/loans"
        backLabel="Loans"
        nextLinks={[
          { label: "Loan Readiness", to: "/app/loan-readiness" },
          { label: "Loan Suggestions", to: "/app/loan-suggestions" },
        ]}
        utilityLinks={[
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
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
            <div style={sectionLabel()}>Loan workbench overview</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              Workbench for {memberName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 860 }}>
              This is the deeper institutional work surface for the current loan path. It now reads the exact backend fields instead of broad placeholders.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Community: {communityLabel}</span>
              <span style={badge(false)}>
                Active work item: {selectedLoanId ? String(selectedLoanId) : "None"}
              </span>
              <span style={badge(false)}>Status: {currentStatus}</span>
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
                onClick={() => void handleRefresh()}
                disabled={refreshing}
                style={actionBtn("primary", refreshing)}
              >
                {refreshing ? "Refreshing..." : "Refresh Workbench"}
              </button>

              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    selectedLoanId ? String(selectedLoanId) : "",
                    "Loan ID copied.",
                    "Loan ID is not ready yet."
                  )
                }
                style={actionBtn("secondary", !selectedLoanId)}
                disabled={!selectedLoanId}
              >
                Copy Loan ID
              </button>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Current work item</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {workbenchTitle}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              Guarantee gap: {guaranteeGap} • Required guarantors: {guarantorsRequired}
            </div>

            <div style={{ marginTop: 8, ...helperText() }}>
              Paid total: {paidTotal} • Remaining amount: {remainingAmount}
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
            <div style={sectionLabel()}>Loan selection</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Choose which loan item the workbench should focus on.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("selection")}
            style={collapseToggle()}
          >
            {collapsed.selection ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.selection ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {loans.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No loan item is visible for this selected community.
              </div>
            ) : (
              loans.map((item) => {
                const active = positiveNumber(item.id) === positiveNumber(selectedLoanId);

                return (
                  <div
                    key={String(item.id || item.title)}
                    style={innerCard(active ? "#F7FAFF" : "#FCFEFF")}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isCompact
                          ? "1fr"
                          : "minmax(0, 1.1fr) minmax(0, 0.9fr) auto",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "#0B1F33",
                            fontWeight: 900,
                            fontSize: 16,
                            lineHeight: 1.35,
                          }}
                        >
                          {safeStr(item.title || "Loan item")}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={badge(true)}>
                            {safeStr(item.amount || "0.00")} {safeStr(item.currency || "NGN")}
                          </span>
                          <span style={badge(false)}>Status: {safeStr(item.status || "open")}</span>
                          <span style={badge(false)}>Role: {safeStr(item.role || "borrower")}</span>
                        </div>
                      </div>

                      <div style={{ ...helperText(), fontSize: 13 }}>
                        {safeStr(item.createdAt)
                          ? `Created: ${safeDateTime(item.createdAt)}`
                          : "Created time not visible"}
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
                          onClick={() => void handleSelectLoan(positiveNumber(item.id))}
                          style={active ? actionBtn("primary") : actionBtn("secondary")}
                        >
                          {active ? "Selected" : "Open Workbench"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
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
            <div style={sectionLabel()}>Workbench summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Exact backend loan fields are shown here.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("summary")}
            style={collapseToggle()}
          >
            {collapsed.summary ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.summary ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr 1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Amount</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.25,
                }}
              >
                {safeStr(loanDetail?.amount || "0.00")} {safeStr(loanDetail?.currency || "NGN")}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Guarantee gap</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.25,
                }}
              >
                {safeStr(loanDetail?.guaranteeGap || "0.00")}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Guarantors required</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontWeight: 900,
                  fontSize: 22,
                }}
              >
                {safeStr(loanDetail?.guarantorsRequired ?? 0)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Status</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.25,
                }}
              >
                {safeStr(loanDetail?.status || currentStatus)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Service fee</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                {safeStr(loanDetail?.serviceFee || "0.00")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Net disbursed</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                {safeStr(loanDetail?.netDisbursedAmount || "0.00")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Paid total</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                {safeStr(loanDetail?.paidTotal || "0.00")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Remaining amount</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                {safeStr(loanDetail?.remainingAmount || "0.00")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Pool used</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                {safeStr(loanDetail?.poolUsed || "0.00")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Personal pool at request</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                {safeStr(loanDetail?.personalPoolAtRequest || "0.00")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Guarantor pool</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                {safeStr(loanDetail?.guarantorPool || "0.00")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Platform revenue</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 16,
                }}
              >
                {safeStr(loanDetail?.platformRevenue || "0.00")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Created</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 14,
                  lineHeight: 1.35,
                }}
              >
                {safeDateTime(loanDetail?.createdAt) || "—"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Due</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 14,
                  lineHeight: 1.35,
                }}
              >
                {safeDateTime(loanDetail?.dueAt) || "—"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Decision at</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 14,
                  lineHeight: 1.35,
                }}
              >
                {safeDateTime(loanDetail?.decisionAt) || "—"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Repaid at</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 14,
                  lineHeight: 1.35,
                }}
              >
                {safeDateTime(loanDetail?.repaidAt) || "—"}
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
            <div style={sectionLabel()}>Guarantor fit and request queue</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Candidate quality and guarantor request state stay together here.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("supporters")}
            style={collapseToggle()}
          >
            {collapsed.supporters ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.supporters ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Suggested guarantors
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {suggestedGuarantors.length === 0 ? (
                  <div style={helperText()}>
                    No guarantor-fit rows are visible right now for this loan.
                  </div>
                ) : (
                  suggestedGuarantors.map((item) => (
                    <div key={item.key} style={innerCard("#FFFFFF")}>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {safeStr(item.email || item.userId || "Candidate")}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={badge(true)}>
                          Trust: {safeStr(item.trustScore || "0")} / {safeStr(item.trustBand || "—")}
                        </span>
                        <span style={badge(false)}>
                          Reliability: {safeStr(item.reliabilityScore || "0")}
                        </span>
                      </div>

                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        Total requests: {safeStr(item.totalRequests ?? 0)} • Approved: {safeStr(item.approved ?? 0)} • Declined: {safeStr(item.declined ?? 0)} • Expired: {safeStr(item.expired ?? 0)}
                      </div>

                      {safeStr(item.reason) ? (
                        <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                          Reason: {safeStr(item.reason)}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Guarantor request queue
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {guarantorRequests.length === 0 ? (
                  <div style={helperText()}>
                    No guarantor request row is visible right now for this loan.
                  </div>
                ) : (
                  guarantorRequests.map((item, index) => (
                    <div key={`${item.id || index}`} style={innerCard("#F8FBFF")}>
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
                          Guarantor user: {safeStr(item.guarantorUserId ?? "—")}
                        </div>

                        <span style={badge(true)}>
                          Pledge: {safeStr(item.pledgeAmount || "0.00")}
                        </span>
                      </div>

                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        Status: {safeStr(item.status || "pending")} • Locked: {String(Boolean(item.isLocked))} • Locked amount: {safeStr(item.lockedAmount || "0.00")} • Released amount: {safeStr(item.releasedAmount || "0.00")}
                      </div>

                      {safeStr(item.respondedAt) ? (
                        <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                          Responded: {safeDateTime(item.respondedAt)}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
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
            <div style={sectionLabel()}>Working routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Move from the deeper workbench into the exact next page you need.
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
            <Link to="/app/loan-readiness" style={routeTile(true)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Loan Readiness
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Use this when the question is whether the current support path is clean enough to continue or restart.
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
                Use this when the question is guarantor fit and candidate quality.
              </div>
            </Link>

            <Link to="/app/loans" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Loans Overview
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return to the broader support overview.
              </div>
            </Link>

            <Link to="/app/marketplace#marketplace-loans-support" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Support Path
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return to the selected-community working surface that starts the support request.
              </div>
            </Link>

            <Link to="/app/payment/pool" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Money In
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Use this when the work is payment into the pool.
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
                Use this when the work is withdrawal handling.
              </div>
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}