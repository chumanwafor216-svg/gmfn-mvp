import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";

type LoanRow = {
  id?: number;
  clanId?: number;
  status?: string | null;
  title?: string | null;
  role?: string | null;
  borrowerName?: string | null;
  guarantorName?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  createdAt?: string | null;
};

type LoanDraftSummary = {
  id?: number;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  remainingAmount?: string | number | null;
  guarantorsRequired?: number | null;
  approvedGuarantors?: number | null;
  guarantorsTotal?: number | null;
  dueAt?: string | null;
  decisionAt?: string | null;
  purpose?: string | null;
  note?: string | null;
};

type SuggestedSupporter = {
  key: string;
  userId?: number;
  gmfnId?: string;
  name: string;
  reason?: string | null;
  recommendedPledge?: string | null;
  trustScore?: string | null;
  trustBand?: string | null;
};

type CollapseState = {
  overview: boolean;
  reading: boolean;
  supporters: boolean;
  routes: boolean;
};

type PersistedWithdrawalTask = {
  amountInput: string;
  noteInput: string;
  latestWithdrawalResult: any | null;
  handoffMode?: string;
  supportGap?: string;
  updatedAt?: string | null;
};

const LOAN_SUGGESTIONS_UI_STORAGE_KEY = "gmfn.loanSuggestions.sections.v2";
const WITHDRAWAL_TASK_STORAGE_KEY_PREFIXES = [
  "gmfn.withdrawal.task.v5",
  "gmfn.withdrawal.task.v4",
];

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
  if (!raw) return "—";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
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
    reading: false,
    supporters: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    reading: Boolean(raw?.reading ?? base.reading),
    supporters: Boolean(raw?.supporters ?? base.supporters),
    routes: Boolean(raw?.routes ?? base.routes),
  };
}

function normalizeLoanRow(raw: any): LoanRow | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw;

  return {
    id: positiveNumber(src?.id || src?.loan_id) || undefined,
    clanId: positiveNumber(src?.clan_id || src?.community_id) || undefined,
    status: firstTruthy(src?.status, src?.loan_status, src?.state, "open"),
    title: firstTruthy(
      src?.title,
      src?.purpose,
      src?.name,
      src?.loan_title,
      src?.description,
      "Loan support item"
    ),
    role: firstTruthy(
      src?.role,
      src?.my_role,
      src?.participant_role,
      src?.is_guarantor ? "Guarantor" : "",
      src?.is_borrower ? "Borrower" : ""
    ),
    borrowerName: firstTruthy(
      src?.borrower_name,
      src?.member_name,
      src?.requester_name
    ),
    guarantorName: firstTruthy(
      src?.guarantor_name,
      src?.supporter_name,
      src?.guarantee_name
    ),
    amount:
      src?.amount ??
      src?.principal_amount ??
      src?.loan_amount ??
      src?.outstanding_amount ??
      src?.requested_amount,
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN"),
    createdAt: firstTruthy(src?.created_at, src?.requested_at),
  };
}

function normalizeLoanSummary(raw: any): LoanDraftSummary | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw;

  return {
    id: positiveNumber(firstDefined(src?.id, src?.loan_id)) || undefined,
    status: firstTruthy(src?.status),
    amount: firstDefined(src?.amount),
    currency: firstTruthy(src?.currency, "NGN"),
    remainingAmount: firstDefined(src?.remaining_amount),
    guarantorsRequired: positiveNumber(src?.guarantors_required) || undefined,
    approvedGuarantors: positiveNumber(src?.approved_guarantors) || undefined,
    guarantorsTotal: positiveNumber(src?.guarantors_total) || undefined,
    dueAt: firstTruthy(src?.due_at),
    decisionAt: firstTruthy(src?.decision_at),
    purpose: firstTruthy(src?.purpose, src?.title),
    note: firstTruthy(src?.note, src?.description),
  };
}

function normalizeSuggestedSupporter(raw: any): SuggestedSupporter | null {
  if (!raw) return null;

  const src = raw?.item || raw?.member || raw?.user || raw?.candidate || raw;

  const userId = positiveNumber(
    firstDefined(src?.user_id, src?.member_user_id, src?.id, src?.member_id)
  );
  const gmfnId = firstTruthy(
    src?.gmfn_id,
    src?.member_gmfn_id,
    src?.owner_gmfn_id
  );
  const name = firstTruthy(
    src?.display_name,
    src?.name,
    src?.nickname,
    [safeStr(src?.first_name), safeStr(src?.surname)].filter(Boolean).join(" "),
    gmfnId,
    userId ? `Member ${userId}` : ""
  );
  const reason = firstTruthy(src?.reason, src?.note, src?.detail, src?.why);
  const recommendedPledge = firstTruthy(
    src?.recommended_pledge_amount,
    src?.pledge_amount,
    src?.suggested_amount,
    src?.amount
  );

  if (!userId && !gmfnId && !name) return null;

  const key = userId > 0 ? `u-${userId}` : `g-${safeStr(gmfnId).toUpperCase()}`;

  return {
    key,
    userId: userId || undefined,
    gmfnId: gmfnId || undefined,
    name,
    reason: reason || undefined,
    recommendedPledge: recommendedPledge || undefined,
    trustScore: firstTruthy(src?.trust_score, src?.cci),
    trustBand: firstTruthy(src?.trust_band),
  };
}

function extractSuggestedSupporters(raw: any): SuggestedSupporter[] {
  const buckets = [
    raw?.items,
    raw?.suggestions,
    raw?.guarantors,
    raw?.candidates,
    raw?.recommended,
    raw?.data?.items,
    raw?.data?.suggestions,
  ];

  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;

    const rows = bucket
      .map((row: any) => normalizeSuggestedSupporter(row))
      .filter(Boolean) as SuggestedSupporter[];

    if (rows.length > 0) return rows;
  }

  return [];
}

function extractSuggestionMessage(raw: any): string {
  return firstTruthy(
    raw?.decision_message,
    raw?.message,
    raw?.summary?.message,
    raw?.summary?.note,
    raw?.borrower_message,
    raw?.liquidity_message,
    raw?.note,
    raw?.detail
  );
}

function isActiveLoan(row: LoanRow): boolean {
  const status = safeStr(row?.status).toLowerCase();
  return !FINAL_LOAN_STATUSES.has(status);
}

function isBorrowerLoan(row: LoanRow): boolean {
  const role = safeStr(row?.role).toLowerCase();
  return role === "borrower" || role.includes("borrow");
}

function getLoanAmountText(row: LoanRow | LoanDraftSummary | null): string {
  const value = safeStr(row?.amount);
  const currency = safeStr(row?.currency);

  if (!value && !currency) return "Amount pending";
  if (value && currency) return `${value} ${currency}`;
  return value || currency || "Amount pending";
}

function readWithdrawalTask(clanId: number, gmfnId: string): PersistedWithdrawalTask | null {
  if (!clanId || !gmfnId) return null;

  for (const prefix of WITHDRAWAL_TASK_STORAGE_KEY_PREFIXES) {
    const key = `${prefix}.${gmfnId || "me"}.${clanId || 0}`;
    const value = readLocalJSON<PersistedWithdrawalTask | null>(key, null);
    if (value) return value;
  }

  return null;
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

function stableTapStyle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    transform: "translateZ(0)",
    outlineOffset: 4,
  };
}

function routeTile(primary = false): React.CSSProperties {
  return {
    ...stableTapStyle(),
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
    whiteSpace: "normal",
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      ...stableTapStyle(),
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
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      ...stableTapStyle(),
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
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
    };
  }

  return {
    ...stableTapStyle(),
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
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    opacity: disabled ? 0.86 : 1,
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    ...stableTapStyle(),
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
    textAlign: "center",
    cursor: "pointer",
    whiteSpace: "normal",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function communityName(currentClan: any, clanId: number): string {
  return (
    firstTruthy(
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name,
      currentClan?.title
    ) || (clanId ? `Community ${clanId}` : "No current community")
  );
}

function communityPublicId(currentClan: any): string {
  return (
    firstTruthy(
      currentClan?.community_code,
      currentClan?.community?.community_code,
      currentClan?.profile?.community_code,
      currentClan?.marketplace?.community_code
    ) || "Pending"
  );
}

function communityRole(currentClan: any): string {
  return (
    firstTruthy(
      currentClan?.role,
      currentClan?.member_role,
      currentClan?.membership_role,
      currentClan?.participant_role
    ) || ""
  );
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
      return "";
    }
  }

  if (typeof window !== "undefined") {
    return String(window.location.origin || "").trim().replace(/\/+$/, "");
  }

  return "";
}

function resolveMediaUrl(src: string): string {
  const raw = safeStr(src);
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  const origin = apiOrigin();
  if (!origin) return raw;

  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}/${raw.replace(/^\/+/, "")}`;
}

function communityImageSrc(currentClan: any): string {
  const raw = firstTruthy(
    currentClan?.community_image_url,
    currentClan?.profile_image_url,
    currentClan?.marketplace_image_url,
    currentClan?.cover_image_url,
    currentClan?.banner_url,
    currentClan?.image_url,
    currentClan?.logo_url,
    currentClan?.community?.community_image_url,
    currentClan?.community?.image_url,
    currentClan?.profile?.profile_image_url
  );

  return resolveMediaUrl(raw);
}

export default function LoanSuggestionsPage() {
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(LOAN_SUGGESTIONS_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loanSummary, setLoanSummary] = useState<LoanDraftSummary | null>(null);
  const [suggestionRaw, setSuggestionRaw] = useState<any>(null);
  const [suggestedSupporters, setSuggestedSupporters] = useState<SuggestedSupporter[]>(
    []
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
    writeLocalJSON(LOAN_SUGGESTIONS_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
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

        if (!alive) return;

        const normalizedLoans = rowsOf<any>(loansRes)
          .map((row) => normalizeLoanRow(row))
          .filter(Boolean) as LoanRow[];

        const filteredLoans = normalizedLoans.filter((row) => {
          const rowClanId = Number(row?.clanId || 0);
          return rowClanId <= 0 || rowClanId === selectedClanId;
        });

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setLoans(filteredLoans);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

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

  const gmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id, "Pending");
  }, [me]);

  const communityLabel = useMemo(() => {
    return communityName(currentClan, selectedClanId);
  }, [currentClan, selectedClanId]);

  const publicCommunityId = useMemo(() => {
    return communityPublicId(currentClan);
  }, [currentClan]);

  const memberRole = useMemo(() => {
    return communityRole(currentClan);
  }, [currentClan]);

  const pictureSrc = useMemo(() => {
    return communityImageSrc(currentClan);
  }, [currentClan]);

  const activeBorrowerLoan = useMemo(() => {
    const rows = loans.filter((row) => isActiveLoan(row) && isBorrowerLoan(row));

    rows.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return rows[0] || null;
  }, [loans]);

  const withdrawalTask = useMemo(
    () => readWithdrawalTask(selectedClanId, safeStr(me?.gmfn_id)),
    [selectedClanId, me]
  );

  const cameFromWithdrawalSupport = useMemo(() => {
    return (
      safeStr(withdrawalTask?.handoffMode) === "withdrawal-support" ||
      Boolean(safeStr(withdrawalTask?.supportGap))
    );
  }, [withdrawalTask]);

  const withdrawalAmount = safeStr(withdrawalTask?.amountInput);
  const supportGap = safeStr(withdrawalTask?.supportGap);
  const withdrawalNote = safeStr(withdrawalTask?.noteInput);

  async function loadSuggestionsForLoan(loanId: number) {
    if (!loanId || !selectedClanId) {
      setLoanSummary(null);
      setSuggestionRaw(null);
      setSuggestedSupporters([]);
      return;
    }

    const [summaryRes, suggestionsRes] = await Promise.all([
      typeof (api as any).getLoanSummary === "function"
        ? (api as any).getLoanSummary(loanId).catch(() => null)
        : Promise.resolve(null),
      typeof (api as any).getLoanGuarantorSuggestions === "function"
        ? (api as any)
            .getLoanGuarantorSuggestions(loanId, {
              clan_id: selectedClanId,
              limit: 12,
            })
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    setLoanSummary(normalizeLoanSummary(summaryRes));
    setSuggestionRaw(suggestionsRes);
    setSuggestedSupporters(extractSuggestedSupporters(suggestionsRes));
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      const loanId = positiveNumber(activeBorrowerLoan?.id);

      if (!loanId || !selectedClanId) {
        if (!alive) return;
        setLoanSummary(null);
        setSuggestionRaw(null);
        setSuggestedSupporters([]);
        return;
      }

      await loadSuggestionsForLoan(loanId);

      if (!alive) return;
    })();

    return () => {
      alive = false;
    };
  }, [activeBorrowerLoan?.id, selectedClanId]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const loanId = positiveNumber(activeBorrowerLoan?.id);
      if (!loanId) return;
      await loadSuggestionsForLoan(loanId);
    } finally {
      setRefreshing(false);
    }
  }

  const suggestionMessage = useMemo(() => {
    return extractSuggestionMessage(suggestionRaw);
  }, [suggestionRaw]);

  const requiredGuarantors = positiveNumber(loanSummary?.guarantorsRequired);
  const approvedGuarantors = positiveNumber(loanSummary?.approvedGuarantors);
  const sentGuarantors = positiveNumber(loanSummary?.guarantorsTotal);

  const fitReading = useMemo(() => {
    if (!selectedClanId || !safeStr(me?.gmfn_id)) {
      return {
        title: "Community or member identity is not ready.",
        detail:
          "The fit-reading stage works best when your current community and visible member identity are ready.",
        tone: "error" as const,
      };
    }

    if (cameFromWithdrawalSupport && !activeBorrowerLoan) {
      return {
        title: "Money Out has already handed off into support continuation.",
        detail:
          "Start or resume the borrower-side support draft first, then return here for guarantor fit reading.",
        tone: "watch" as const,
      };
    }

    if (!activeBorrowerLoan) {
      return {
        title: "Start a support draft first.",
        detail:
          "Loan suggestions only become meaningful after a borrower-side support item exists.",
        tone: "neutral" as const,
      };
    }

    if (requiredGuarantors > 0 && suggestedSupporters.length === 0) {
      return {
        title: "No fit guarantor suggestion is shown yet.",
        detail:
          suggestionMessage ||
          "The current amount or structure may still need a better fit before suggestions become clearer.",
        tone: "watch" as const,
      };
    }

    if (suggestedSupporters.length > 0) {
      return {
        title: "Fit suggestions are available.",
        detail:
          suggestionMessage ||
          "Review the strongest candidates, then continue into the deeper support workbench.",
        tone: "ready" as const,
      };
    }

    return {
      title: "This support item may not currently need guarantors.",
      detail:
        suggestionMessage ||
        "The current support structure does not show a strong guarantor requirement right now.",
      tone: "neutral" as const,
    };
  }, [
    selectedClanId,
    me,
    cameFromWithdrawalSupport,
    activeBorrowerLoan,
    requiredGuarantors,
    suggestedSupporters.length,
    suggestionMessage,
  ]);

  const fitTone =
    fitReading.tone === "ready"
      ? {
          bg: "#F3FBF5",
          border: "1px solid rgba(34,197,94,0.16)",
          text: "#166534",
        }
      : fitReading.tone === "watch"
      ? {
          bg: "#FFFBEF",
          border: "1px solid rgba(245,158,11,0.16)",
          text: "#92400E",
        }
      : fitReading.tone === "error"
      ? {
          bg: "#FEF2F2",
          border: "1px solid rgba(239,68,68,0.16)",
          text: "#991B1B",
        }
      : {
          bg: "#F8FBFF",
          border: "1px solid rgba(11,99,209,0.12)",
          text: "#0B63D1",
        };

  const nextRoute = useMemo(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community first.",
        detail:
          "Fit reading is clearer once your current community is in place.",
        ctaTo: "/app/community",
        ctaLabel: "Open Community Home",
      };
    }

    if (cameFromWithdrawalSupport && !activeBorrowerLoan) {
      return {
        title: "Start the borrower-side support draft from the Money Out handoff.",
        detail:
          "Money Out has already shown that support is needed. Resume the support draft, then return here for fit reading.",
        ctaTo: "/app/marketplace#marketplace-loans-support",
        ctaLabel: "Open Support Start Page",
      };
    }

    if (!activeBorrowerLoan) {
      return {
        title: "Start the support request first.",
        detail:
          "This becomes useful only after the borrower-side support item exists.",
        ctaTo: "/app/marketplace#marketplace-loans-support",
        ctaLabel: "Start Support Request",
      };
    }

    if (suggestedSupporters.length > 0) {
      return {
        title: "Continue into the deeper support workbench.",
        detail:
          "The fit picture is visible enough. The next move is the deeper workbench.",
        ctaTo: "/app/loan-workbench",
        ctaLabel: "Open Loan Workbench",
      };
    }

    return {
      title: "Return to the active support draft and review it.",
      detail:
        "If the fit picture is still weak, review the active support item before moving again.",
      ctaTo: "/app/loan-workbench",
      ctaLabel: "Open Loan Workbench",
    };
  }, [selectedClanId, cameFromWithdrawalSupport, activeBorrowerLoan, suggestedSupporters.length]);

  const suggestionsSupportActive =
    cameFromWithdrawalSupport || Boolean(activeBorrowerLoan);

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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
          sectionLabel="Loan Suggestions"
          title="Loan Suggestions"
          subtitle="Loading the fit-suggestion stage..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/loan-readiness"
          backLabel="Loan Readiness"
          nextLinks={[
            { label: "Loan Workbench", to: "/app/loan-workbench" },
            { label: "Loans", to: "/app/loans" },
          ]}
          utilityLinks={[
            { label: "Marketplace", to: "/app/marketplace" },
            { label: "Money Out", to: "/app/withdrawal-instructions" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading loan suggestions...
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
        sectionLabel="Loan Suggestions"
        title="Loan Suggestions"
        subtitle="Use this stage to read guarantor fit before you continue deeper into the support flow."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/loan-readiness"
        backLabel="Loan Readiness"
        nextLinks={[
          { label: "Loan Workbench", to: "/app/loan-workbench" },
          { label: "Loans", to: "/app/loans" },
        ]}
        utilityLinks={
          suggestionsSupportActive
            ? [{ label: "Loan Readiness", to: "/app/loan-readiness" }]
            : [
                { label: "Marketplace", to: "/app/marketplace" },
                { label: "Money Out", to: "/app/withdrawal-instructions" },
              ]
        }
      />

      <ExplainToggle
        label="What this screen does"
        what="This page reads the current support item and shows whether the visible fit signals are strong enough to continue into the deeper workbench."
        why="It gives you a recommendation layer before you commit time to supporter selection and detailed workbench actions."
        next="Read the suggestion summary first, then use the fit reading and suggested supporters below to decide whether to continue."
        tone="blue"
      />

      <section
        style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "180px minmax(0, 1fr) 320px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                width: "100%",
                height: 148,
                borderRadius: 20,
                border: "1px solid rgba(212,175,55,0.22)",
                overflow: "hidden",
                background: "linear-gradient(180deg, rgba(8,17,31,0.88) 0%, rgba(16,42,67,0.96) 100%)",
                boxShadow: "0 20px 44px rgba(2,12,27,0.32)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {pictureSrc ? (
                <img
                  src={pictureSrc}
                  alt={communityLabel}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 20,
                    textAlign: "center",
                    padding: 12,
                    lineHeight: 1.3,
                  }}
                >
                  {communityLabel}
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={sectionLabel()}>Fixed suggestion context</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Loan fit suggestions for {memberName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1", maxWidth: 860 }}>
              Compare fit here, then continue into the deeper workbench
              when the next move is clear.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Community ID: {publicCommunityId}</span>
              <span style={badge(false)}>GMFN ID: {gmfnId}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Fit suggestions</span>
              {cameFromWithdrawalSupport ? (
                <span style={badge(false)}>Money Out support handoff</span>
              ) : null}
            </div>
          </div>

          <div
            style={{
              ...softCard(fitTone.bg),
              border: fitTone.border,
            }}
          >
            <div style={sectionLabel()}>Current reading</div>

            <div
              style={{
                marginTop: 10,
                color: fitTone.text,
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {fitReading.title}
            </div>

            <div style={{ marginTop: 10, ...helperText(), color: "#0B1F33" }}>
              {fitReading.detail}
            </div>

            {activeBorrowerLoan?.id ? (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  disabled={refreshing}
                  style={actionBtn("secondary", refreshing)}
                >
                  {refreshing ? "Refreshing..." : "Refresh Fit Check"}
                </button>
              </div>
            ) : null}
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
            <div style={sectionLabel()}>Suggestion summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A quick reading of the current borrower-side support item.
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
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr 1fr"
                : "repeat(5, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Current draft</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {activeBorrowerLoan ? safeStr(activeBorrowerLoan.title || "Visible") : "None"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Amount</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {getLoanAmountText(loanSummary || activeBorrowerLoan)}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Required guarantors</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {requiredGuarantors}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Fit suggestions</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {suggestedSupporters.length}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Approved / sent</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {approvedGuarantors} / {sentGuarantors}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Status</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {safeStr(loanSummary?.status || activeBorrowerLoan?.status || "Awaiting issue")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Decision at</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 14,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {safeDateTime(loanSummary?.decisionAt)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Due at</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 14,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {safeDateTime(loanSummary?.dueAt)}
              </div>
            </div>

            {cameFromWithdrawalSupport ? (
              <>
                <div style={statTile("#FFFBEF")}>
                  <div style={sectionLabel()}>Money Out amount</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#92400E",
                      fontSize: 16,
                      fontWeight: 900,
                      lineHeight: 1.25,
                    }}
                  >
                    {withdrawalAmount ? withdrawalAmount : "Not available yet"}
                  </div>
                </div>

                <div style={statTile("#FFFBEF")}>
                  <div style={sectionLabel()}>Support gap</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#92400E",
                      fontSize: 16,
                      fontWeight: 900,
                      lineHeight: 1.25,
                    }}
                  >
                    {safeStr(supportGap || "Not available yet")}
                  </div>
                </div>
              </>
            ) : null}
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
            <div style={sectionLabel()}>Suggestion reading</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Read the fit message before deciding the next move.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("reading")}
            style={collapseToggle()}
          >
            {collapsed.reading ? "Open" : "Collapse"}
          </button>
        </div>

        <ExplainToggle
          label="What this reading does"
          what="This section explains the current fit message and shows whether this is the right moment to move into the deeper workbench."
          why="It helps you interpret the suggestion instead of treating it like a vague status line."
          next="Read the fit message first, then check the supporters list below if you are ready to move toward guarantor selection."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {!collapsed.reading ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                What the fit check is saying
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                {safeStr(
                  suggestionMessage ||
                    (activeBorrowerLoan
                      ? "The system has not returned a fuller fit note yet."
                      : "Start or resume the support draft first to see fit suggestions.")
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
                What this stage is for
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                Stay with fit reading here until you are ready to continue into the
                deeper workbench.
              </div>
            </div>

            {cameFromWithdrawalSupport ? (
              <div style={innerCard("#FFFBEF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  Money Out handoff context
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <div style={helperText()}>
                    Requested withdrawal amount: {withdrawalAmount || "Pending"}
                  </div>
                  <div style={helperText()}>
                    Support gap: {safeStr(supportGap || "Pending")}
                  </div>
                  {withdrawalNote ? (
                    <div style={helperText()}>
                      Note: {withdrawalNote}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
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
            <div style={sectionLabel()}>Suggested supporters</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The strongest visible guarantor-fit suggestions for the current support item.
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

        <ExplainToggle
          label="Why these supporters appear"
          what="This section lists the strongest visible supporter matches for the current support item."
          why="It helps you start from the best current fit instead of guessing who to approach first."
          next="Review the reason and suggested pledge for each supporter, then continue into the workbench when you are ready to act."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {!collapsed.supporters ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {suggestedSupporters.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No fit suggestion is available for this support item right now.
              </div>
            ) : (
              suggestedSupporters.map((item) => (
                <div key={item.key} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "minmax(0, 1.05fr) auto",
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
                        {item.name}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {safeStr(item.reason) ? (
                          <span style={badge(false)}>{safeStr(item.reason)}</span>
                        ) : null}

                        {safeStr(item.recommendedPledge) ? (
                          <span style={badge(true)}>
                            Suggested pledge: {safeStr(item.recommendedPledge)}
                          </span>
                        ) : null}

                        {safeStr(item.trustScore) ? (
                          <span style={badge(false)}>
                            Trust: {safeStr(item.trustScore)}
                            {safeStr(item.trustBand) ? ` / ${safeStr(item.trustBand)}` : ""}
                          </span>
                        ) : null}
                      </div>

                      {safeStr(item.gmfnId) ? (
                        <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                          GMFN ID: {safeStr(item.gmfnId)}
                        </div>
                      ) : null}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: isCompact ? "flex-start" : "flex-end",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <OriginLink to="/app/loan-workbench" style={actionBtn("secondary")}>
                        Open Loan Workbench
                      </OriginLink>
                    </div>
                  </div>
                </div>
              ))
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
            <div style={sectionLabel()}>
              {suggestionsSupportActive ? "Support continuation routes" : "Next routes"}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {suggestionsSupportActive
                ? "Stay inside the support flow and move only to the next continuation step."
                : "Move into the next page you need."}
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
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <OriginLink to={nextRoute.ctaTo} style={routeTile(true)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                {nextRoute.ctaLabel}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                {nextRoute.title}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                {nextRoute.detail}
              </div>
            </OriginLink>

            <OriginLink to="/app/loan-readiness" style={routeTile(false)}>
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
                Open this when the question is whether the next support move is clean enough to continue.
              </div>
            </OriginLink>

            <OriginLink to="/app/loan-workbench" style={routeTile(false)}>
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
                Open this for deeper support handling after the fit picture is clear enough.
              </div>
            </OriginLink>

            {!suggestionsSupportActive ? (
              <OriginLink to="/app/loans" style={routeTile(false)}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 17,
                    lineHeight: 1.3,
                  }}
                >
                  Loans & Support
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  Return to the broader support overview only after the current fit-reading stage is complete.
                </div>
              </OriginLink>
            ) : null}

            <OriginLink to="/app/guarantor-inbox" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Incoming Guarantor Requests
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open the dedicated guarantor decision queue when responses are waiting on you.
              </div>
            </OriginLink>

            {!suggestionsSupportActive ? (
              <>
                <OriginLink to="/app/withdrawal-instructions" style={routeTile(false)}>
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
                    Return to the originating withdrawal path only when you need to verify the handoff source.
                  </div>
                </OriginLink>

                <OriginLink to="/app/notifications" style={routeTile(false)}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Action Inbox
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Open this when the broader waiting picture matters around support response.
                  </div>
                </OriginLink>
              </>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}




