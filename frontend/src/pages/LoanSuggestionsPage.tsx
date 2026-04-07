import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";

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
};

type SuggestedSupporter = {
  key: string;
  userId?: number;
  gmfnId?: string;
  name: string;
  reason?: string | null;
  recommendedPledge?: string | null;
};

type CollapseState = {
  overview: boolean;
  reading: boolean;
  supporters: boolean;
  routes: boolean;
};

const LOAN_SUGGESTIONS_UI_STORAGE_KEY = "gmfn.loanSuggestions.sections.v1";

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

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function getLoanAmountText(row: LoanRow | LoanDraftSummary | null): string {
  const value = safeStr(row?.amount);
  const currency = safeStr(row?.currency);

  if (!value && !currency) return "Amount pending";
  if (value && currency) return `${value} ${currency}`;
  return value || currency || "Amount pending";
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
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [guidance, setGuidance] = useState<GuidanceSnapshot | null>(null);
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
        const [meRes, clanRes, loansRes, guidanceRes] = await Promise.all([
          typeof (api as any).getMe === "function"
            ? (api as any).getMe().catch(() => null)
            : Promise.resolve(null),
          typeof (api as any).getCurrentClan === "function"
            ? (api as any).getCurrentClan().catch(() => null)
            : Promise.resolve(null),
          typeof (api as any).listMyLoans === "function"
            ? (api as any).listMyLoans().catch(() => [])
            : Promise.resolve([]),
          buildGuidanceSnapshot().catch(() => null),
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
        setGuidance(guidanceRes || null);
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

  const activeBorrowerLoan = useMemo(() => {
    const rows = loans.filter((row) => isActiveLoan(row) && isBorrowerLoan(row));

    rows.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return rows[0] || null;
  }, [loans]);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (!activeBorrowerLoan?.id || !selectedClanId) {
        setLoanSummary(null);
        setSuggestionRaw(null);
        setSuggestedSupporters([]);
        return;
      }

      const loanId = positiveNumber(activeBorrowerLoan.id);
      if (!loanId) {
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
                limit: 8,
              })
              .catch(() => null)
          : Promise.resolve(null),
      ]);

      if (!alive) return;

      setLoanSummary(normalizeLoanSummary(summaryRes));
      setSuggestionRaw(suggestionsRes);
      setSuggestedSupporters(extractSuggestedSupporters(suggestionsRes));
    })();

    return () => {
      alive = false;
    };
  }, [activeBorrowerLoan?.id, selectedClanId]);

  const suggestionMessage = useMemo(() => {
    return extractSuggestionMessage(suggestionRaw);
  }, [suggestionRaw]);

  const requiredGuarantors = positiveNumber(loanSummary?.guarantorsRequired);
  const approvedGuarantors = positiveNumber(loanSummary?.approvedGuarantors);
  const sentGuarantors = positiveNumber(loanSummary?.guarantorsTotal);

  const fitReading = useMemo(() => {
    if (!activeBorrowerLoan) {
      return {
        title: "Start a support request first.",
        detail:
          "Loan suggestions only become meaningful after a borrower-side support path exists.",
        tone: "neutral" as const,
      };
    }

    if (requiredGuarantors > 0 && suggestedSupporters.length === 0) {
      return {
        title: "No fit guarantor suggestion is visible yet.",
        detail:
          "The current amount or structure may still need a better fit before suggestions become clearer.",
        tone: "watch" as const,
      };
    }

    if (requiredGuarantors > 0 && suggestedSupporters.length > 0) {
      return {
        title: "Fit suggestions are available.",
        detail:
          suggestionMessage ||
          "Review the suggested supporters and move into the working surface that sends the requests.",
        tone: "ready" as const,
      };
    }

    return {
      title: "This support draft may not currently need guarantors.",
      detail:
        suggestionMessage ||
        "The current support structure does not show a strong guarantor requirement right now.",
      tone: "neutral" as const,
    };
  }, [activeBorrowerLoan, requiredGuarantors, suggestedSupporters.length, suggestionMessage]);

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
      : {
          bg: "#F8FBFF",
          border: "1px solid rgba(11,99,209,0.12)",
          text: "#0B63D1",
        };

  const nextRoute = useMemo(() => {
    if (!activeBorrowerLoan) {
      return {
        title: "Start the support request first.",
        ctaTo: "/app/marketplace#marketplace-loans-support",
        ctaLabel: "Start Support Request",
      };
    }

    if (requiredGuarantors > 0 && suggestedSupporters.length > 0) {
      return {
        title: "Open the working surface that sends guarantor requests.",
        ctaTo: "/app/marketplace#marketplace-loans-support",
        ctaLabel: "Open Support Path",
      };
    }

    if (
      safeStr(guidance?.nextBestStep?.kind).toLowerCase().includes("loan") ||
      safeStr(guidance?.nextBestStep?.kind).toLowerCase().includes("guarantor")
    ) {
      return {
        title: safeStr(guidance?.nextBestStep?.title || "Open next loan step"),
        ctaTo: safeStr(guidance?.nextBestStep?.ctaTo || "/app/loans"),
        ctaLabel: safeStr(guidance?.nextBestStep?.ctaLabel || "Open Loans"),
      };
    }

    return {
      title: "Review the full support flow.",
      ctaTo: "/app/loans",
      ctaLabel: "Open Loans",
    };
  }, [activeBorrowerLoan, requiredGuarantors, suggestedSupporters.length, guidance]);

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
          subtitle="Preparing the calmer fit-suggestion surface..."
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
            { label: "Notifications", to: "/app/notifications" },
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
        subtitle="This page is for fit reading. It helps you see whether the current support draft has useful guarantor suggestions before you move into the sending surface."
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
          { label: "Notifications", to: "/app/notifications" },
        ]}
      />

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.08fr) 320px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Suggestion overview</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Loan fit suggestions for {memberName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 860 }}>
              This page is for reading fit, not for carrying the entire support process. Start a borrower-side support request first, then use this page to see whether the system is returning meaningful guarantor suggestions.
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
                Current borrower item: {activeBorrowerLoan ? "Visible" : "None"}
              </span>
              <span style={badge(false)}>
                Suggestions: {suggestedSupporters.length}
              </span>
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
              A quick reading of the current borrower-side support draft.
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
              <div style={sectionLabel()}>Suggested fit</div>
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
                      : "Start a support request first to see fit suggestions.")
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
                What this page is for
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                This page is for reading fit. The actual sending of guarantor requests should happen in the working support surface, not here.
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
            <div style={sectionLabel()}>Suggested supporters</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The strongest visible guarantor-fit suggestions for the current draft.
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
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {suggestedSupporters.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No visible fit suggestion is returned right now for this support draft.
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
                      <Link
                        to="/app/marketplace#marketplace-loans-support"
                        style={actionBtn("secondary")}
                      >
                        Open Support Path
                      </Link>
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
            <div style={sectionLabel()}>Working routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Move from fit reading into the exact next support page you need.
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
            <Link to={nextRoute.ctaTo} style={routeTile(true)}>
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
            </Link>

            <Link to="/app/loan-readiness" style={routeTile(false)}>
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
                Use this when the question is whether the next support step is clean enough to start.
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
                Use this for deeper support handling after the fit reading is done.
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
                Loans
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return to the broader support overview.
              </div>
            </Link>

            <Link to="/app/notifications" style={routeTile(false)}>
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
                Use this when people are waiting directly on your response.
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
                Return to the selected-community working surface.
              </div>
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}