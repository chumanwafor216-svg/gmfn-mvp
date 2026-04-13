import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  createLoanInstruction,
  getCurrentClan,
  getLoanSummary,
  getMe,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";

type NoticeTone = "success" | "error";

type CollapseState = {
  overview: boolean;
  amount: boolean;
  instruction: boolean;
  result: boolean;
  routes: boolean;
};

type LoanSummaryView = {
  id: number;
  clanId?: number | null;
  amount: string;
  remainingAmount: string;
  currency: string;
  status: string;
  purpose: string;
  note: string;
  createdAt: string;
  dueAt: string;
};

type LoanPaymentInstructionView = {
  amount: string;
  currency: string;
  reference: string;
  instructionText: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode: string;
  railName: string;
  supportNote: string;
  createdAt: string;
  raw: any;
};

const LOAN_PAYMENT_UI_STORAGE_KEY = "gmfn.loanPayment.sections.v1";
const LOAN_PAYMENT_TASK_KEY_PREFIX = "gmfn.loanPayment.task.v1";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function moneyNumber(value: any): number {
  const raw = safeStr(value).replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(value: any): string {
  return moneyNumber(value).toFixed(2);
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
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

function taskStorageKey(clanId: number, loanId: number): string {
  return `${LOAN_PAYMENT_TASK_KEY_PREFIX}.${clanId || 0}.${loanId || 0}`;
}

function defaultCollapseState(): CollapseState {
  return {
    overview: false,
    amount: false,
    instruction: false,
    result: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    amount: Boolean(raw?.amount ?? base.amount),
    instruction: Boolean(raw?.instruction ?? base.instruction),
    result: Boolean(raw?.result ?? base.result),
    routes: Boolean(raw?.routes ?? base.routes),
  };
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

function communityName(currentClan: any, clanId: number): string {
  return (
    firstTruthy(
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name,
      currentClan?.title
    ) || (clanId ? `Community ${clanId}` : "No selected community")
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

function normalizeLoanSummary(raw: any): LoanSummaryView | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw;

  const id = positiveNumber(src?.id || src?.loan_id);
  if (!id) return null;

  return {
    id,
    clanId: positiveNumber(src?.clan_id || src?.community_id) || null,
    amount: fmtMoney(
      src?.amount ??
        src?.loan_amount ??
        src?.requested_amount ??
        src?.principal_amount ??
        0
    ),
    remainingAmount: fmtMoney(
      src?.remaining_amount ?? src?.outstanding_amount ?? 0
    ),
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN"),
    status: firstTruthy(src?.status, src?.loan_status, src?.state, "pending"),
    purpose: firstTruthy(src?.purpose, src?.title, src?.name),
    note: firstTruthy(src?.note, src?.description),
    createdAt: firstTruthy(src?.created_at, src?.requested_at),
    dueAt: firstTruthy(src?.due_at),
  };
}

function normalizeLoanInstruction(raw: any): LoanPaymentInstructionView | null {
  if (!raw) return null;

  const src = raw?.item || raw?.instruction || raw?.data || raw;
  const settlement = src?.settlement || src?.bank || src;

  const reference = firstTruthy(
    src?.reference,
    src?.payment_reference,
    src?.reference_code,
    src?.expected_reference,
    src?.code
  );

  const amount = fmtMoney(
    src?.amount ?? src?.expected_amount ?? src?.payment_amount ?? 0
  );

  return {
    amount,
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN"),
    reference,
    instructionText: firstTruthy(
      src?.instruction_text,
      src?.detail,
      src?.message,
      settlement?.support_note
    ),
    bankName: firstTruthy(
      settlement?.bank_name,
      settlement?.bankName,
      src?.bank_name,
      src?.provider,
      src?.rail_name
    ),
    accountName: firstTruthy(
      settlement?.account_name,
      settlement?.accountName,
      src?.account_name,
      src?.bank_account_name
    ),
    accountNumber: firstTruthy(
      settlement?.account_number,
      settlement?.accountNumber,
      src?.account_number,
      src?.bank_account_number
    ),
    sortCode: firstTruthy(
      settlement?.sort_code,
      settlement?.sortCode,
      src?.sort_code,
      src?.bank_code
    ),
    railName: firstTruthy(
      settlement?.rail_name,
      settlement?.railName,
      src?.rail_name,
      src?.provider
    ),
    supportNote: firstTruthy(
      settlement?.support_note,
      settlement?.supportNote
    ),
    createdAt: firstTruthy(src?.created_at, src?.updated_at),
    raw: src,
  };
}

export default function LoanPaymentInstructionsPage() {
  const { loanId } = useParams();
  const numericLoanId = Number(loanId || 0);
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(LOAN_PAYMENT_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [summary, setSummary] = useState<LoanSummaryView | null>(null);
  const [instruction, setInstruction] = useState<LoanPaymentInstructionView | null>(
    null
  );
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);

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
    writeLocalJSON(LOAN_PAYMENT_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setNotice(null);

      try {
        if (!numericLoanId) {
          throw new Error("Missing or invalid loan ID.");
        }

        const [meRes, clanRes, summaryRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          getLoanSummary(numericLoanId).catch(() => null),
        ]);

        const normalizedSummary = normalizeLoanSummary(summaryRes);
        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setSummary(normalizedSummary);

        const storageClanId = positiveNumber(
          normalizedSummary?.clanId || selectedClanId
        );
        const stored = readLocalJSON<LoanPaymentInstructionView | null>(
          taskStorageKey(storageClanId, numericLoanId),
          null
        );

        if (stored) {
          setInstruction(stored);
        } else {
          setInstruction(null);
        }

        const initialAmount = safeStr(normalizedSummary?.remainingAmount || "");
        if (initialAmount) {
          setAmount(initialAmount);
        }
      } catch (e: any) {
        setNotice({
          tone: "error",
          text: safeStr(e?.message) || "Unable to load loan payment details.",
        });
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [numericLoanId, selectedClanId]);

  const currency = useMemo(
    () => safeStr(summary?.currency || instruction?.currency || "NGN"),
    [summary, instruction]
  );

  const communityLabel = useMemo(
    () => communityName(currentClan, selectedClanId),
    [currentClan, selectedClanId]
  );

  const communityPublicCode = useMemo(
    () => communityPublicId(currentClan),
    [currentClan]
  );

  const memberRole = useMemo(
    () => communityRole(currentClan),
    [currentClan]
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

  const gmfnId = useMemo(() => firstTruthy(me?.gmfn_id, "Pending"), [me]);
  const pictureSrc = useMemo(() => communityImageSrc(currentClan), [currentClan]);

  const stageReading = useMemo(() => {
    if (!summary?.id) {
      return {
        tone: "red" as const,
        step: "Context",
        title: "Loan context is not ready.",
        detail: "The repayment route needs a real loan summary before it can continue.",
      };
    }

    if (!safeStr(amount) || Number(amount) <= 0) {
      return {
        tone: "blue" as const,
        step: "Amount",
        title: "Enter the repayment amount.",
        detail: "The repayment route needs a real amount before it can generate the exact instruction.",
      };
    }

    if (!instruction) {
      return {
        tone: "blue" as const,
        step: "Instruction generation",
        title: "Generate the repayment instruction.",
        detail: "Repayment should not proceed without the exact matching reference and destination details.",
      };
    }

    return {
      tone: "green" as const,
      step: "Repayment instruction ready",
      title: "Repayment instruction is ready.",
      detail: "Use the exact amount and exact reference so the repayment can be matched correctly.",
    };
  }, [summary, amount, instruction]);

  const stageTone =
    stageReading.tone === "green"
      ? {
          bg: "#F3FBF5",
          border: "1px solid rgba(34,197,94,0.16)",
          text: "#166534",
        }
      : stageReading.tone === "red"
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

  async function generateInstructions() {
    setBusy(true);
    setNotice(null);

    try {
      if (!numericLoanId) {
        throw new Error("Missing loan ID.");
      }

      const clanId = positiveNumber(summary?.clanId || selectedClanId);
      if (!clanId) {
        throw new Error("No selected community found. Open a community first.");
      }

      const cleanAmount = String(amount || "").trim();
      if (!cleanAmount || Number(cleanAmount) <= 0) {
        throw new Error("Enter a valid repayment amount.");
      }

      const out = await createLoanInstruction({
        clan_id: clanId,
        loan_id: numericLoanId,
        amount: cleanAmount,
        currency,
      });

      const normalizedInstruction = normalizeLoanInstruction(out);
      if (!normalizedInstruction) {
        throw new Error("Instruction was generated, but the response was not readable.");
      }

      setInstruction(normalizedInstruction);
      writeLocalJSON(taskStorageKey(clanId, numericLoanId), normalizedInstruction);

      setNotice({
        tone: "success",
        text: "Loan payment instructions generated.",
      });
    } catch (e: any) {
      setNotice({
        tone: "error",
        text:
          safeStr(e?.message) ||
          "Unable to generate loan payment instructions.",
      });
    } finally {
      setBusy(false);
    }
  }

  function copyPaymentDetails() {
    if (!instruction) {
      setNotice({
        tone: "error",
        text: "Generate instructions first.",
      });
      return;
    }

    const text = [
      `Community: ${communityLabel}`,
      `Community ID: ${communityPublicCode}`,
      `GMFN ID: ${gmfnId}`,
      `Loan ID: ${summary?.id || numericLoanId}`,
      `Amount: ${instruction.amount} ${instruction.currency}`,
      instruction.reference ? `Reference: ${instruction.reference}` : "",
      instruction.railName ? `Rail: ${instruction.railName}` : "",
      instruction.bankName ? `Bank: ${instruction.bankName}` : "",
      instruction.accountName ? `Account name: ${instruction.accountName}` : "",
      instruction.accountNumber ? `Account number: ${instruction.accountNumber}` : "",
      instruction.sortCode ? `Sort/Bank code: ${instruction.sortCode}` : "",
      instruction.supportNote ? `Note: ${instruction.supportNote}` : "",
      instruction.instructionText ? `Instruction: ${instruction.instructionText}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    safeCopy(text);
    setNotice({
      tone: "success",
      text: "Payment details copied.",
    });
  }

  function copyReference() {
    if (!safeStr(instruction?.reference)) {
      setNotice({
        tone: "error",
        text: "No payment reference is visible yet.",
      });
      return;
    }

    safeCopy(String(instruction?.reference || ""));
    setNotice({
      tone: "success",
      text: "Payment reference copied.",
    });
  }

  function resetInstruction() {
    setInstruction(null);
    const clanId = positiveNumber(summary?.clanId || selectedClanId);
    writeLocalJSON(taskStorageKey(clanId, numericLoanId), null);
    setNotice({
      tone: "success",
      text: "Instruction cleared.",
    });
  }

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
          maxWidth: 1100,
          margin: "0 auto",
          paddingBottom: 40,
          display: "grid",
          gap: 18,
        }}
      >
        <PageTopNav
          sectionLabel="Loan Payment Instructions"
          title="Loan Payment Instructions"
          subtitle="Preparing the repayment instruction route..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/loan-summary"
          backLabel="Loan Summary"
          nextLinks={[
            { label: "Loan Workbench", to: "/app/loan-workbench" },
            { label: "Finance", to: "/app/finance" },
          ]}
          utilityLinks={[
            { label: "Loans", to: "/app/loans" },
            { label: "Marketplace", to: "/app/marketplace" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading loan payment instructions...
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <PageTopNav
        sectionLabel="Loan Payment Instructions"
        title="Loan Payment Instructions"
        subtitle="This page should keep repayment focused from context to exact instruction. The member should not be forced back into a loose dashboard once repayment is chosen."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo={summary?.id ? `/app/loan-summary/${summary.id}` : "/app/loans"}
        backLabel="Loan Summary"
        nextLinks={[
          { label: "Loan Workbench", to: "/app/loan-workbench" },
          { label: "Finance", to: "/app/finance" },
        ]}
        utilityLinks={[
          { label: "Loans", to: "/app/loans" },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
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
                border: "1px solid rgba(11,31,51,0.08)",
                overflow: "hidden",
                background: "linear-gradient(180deg, #E8F0FF 0%, #DDEBFF 100%)",
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
                    color: "#37506A",
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
            <div style={sectionLabel()}>Fixed repayment context</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#0B1F33",
                lineHeight: 1.12,
              }}
            >
              Repay loan #{summary?.id || numericLoanId}
            </div>

            <div
              style={{
                marginTop: 10,
                ...helperText(),
                maxWidth: 860,
              }}
            >
              Repayment should remain deterministic. The member needs the exact
              amount, the exact matching reference, and the exact destination details
              before paying. GMFN should guide and reconcile, not hold the money.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Community ID: {communityPublicCode}</span>
              <span style={badge(false)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>Member: {memberName}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Current step: {stageReading.step}</span>
            </div>
          </div>

          <div
            style={{
              ...softCard(stageTone.bg),
              border: stageTone.border,
            }}
          >
            <div style={sectionLabel()}>Current route state</div>

            <div
              style={{
                marginTop: 10,
                color: stageTone.text,
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {stageReading.title}
            </div>

            <div style={{ marginTop: 10, ...helperText(), color: "#0B1F33" }}>
              {stageReading.detail}
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
            <div style={sectionLabel()}>Repayment overview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Core facts for the current support item.
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
              gridTemplateColumns: isCompact
                ? "1fr 1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Loan ID</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 18,
                  color: "#0B1F33",
                }}
              >
                {summary?.id || numericLoanId || "—"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Status</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 18,
                  color: "#0B1F33",
                }}
              >
                {safeStr(summary?.status || "Pending")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Total amount</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 18,
                  color: "#0B1F33",
                }}
              >
                {summary ? `${summary.amount} ${summary.currency}` : `0.00 ${currency}`}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Remaining amount</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 18,
                  color: "#0B1F33",
                }}
              >
                {summary ? `${summary.remainingAmount} ${summary.currency}` : `0.00 ${currency}`}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Created</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 900,
                  fontSize: 14,
                  color: "#0B1F33",
                  lineHeight: 1.35,
                }}
              >
                {safeDateTime(summary?.createdAt)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Due</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 900,
                  fontSize: 14,
                  color: "#0B1F33",
                  lineHeight: 1.35,
                }}
              >
                {safeDateTime(summary?.dueAt)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Purpose</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 900,
                  fontSize: 14,
                  color: "#0B1F33",
                  lineHeight: 1.35,
                }}
              >
                {safeStr(summary?.purpose || "—")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Note</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 900,
                  fontSize: 14,
                  color: "#0B1F33",
                  lineHeight: 1.35,
                }}
              >
                {safeStr(summary?.note || "—")}
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
            <div style={sectionLabel()}>Repayment amount</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Enter the exact repayment amount before generating the instruction.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("amount")}
            style={collapseToggle()}
          >
            {collapsed.amount ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.amount ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Amount entry</div>

              <div style={{ marginTop: 14, display: "grid", gap: 12, maxWidth: 420 }}>
                <div>
                  <div
                    style={{
                      marginBottom: 8,
                      color: "#475569",
                      fontWeight: 900,
                      fontSize: 14,
                    }}
                  >
                    Repayment amount
                  </div>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter repayment amount"
                    style={inputStyle()}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => void generateInstructions()}
                    disabled={busy}
                    style={actionBtn("primary", busy)}
                  >
                    {busy ? "Generating..." : "Generate Instructions"}
                  </button>

                  <button
                    type="button"
                    onClick={resetInstruction}
                    disabled={!instruction}
                    style={actionBtn("secondary", !instruction)}
                  >
                    Clear Instruction
                  </button>
                </div>
              </div>
            </div>

            <div style={softCard("#FFFBEF")}>
              <div style={sectionLabel()}>Repayment warning</div>
              <div style={{ marginTop: 10, ...helperText(), color: "#0B1F33" }}>
                Use the exact generated reference. A wrong reference or wrong amount can delay reconciliation and leave the repayment unmatched.
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
            <div style={sectionLabel()}>Payment instruction</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The exact repayment reference and destination details.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("instruction")}
            style={collapseToggle()}
          >
            {collapsed.instruction ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.instruction ? (
          !instruction ? (
            <div style={{ marginTop: 14, color: "#64748B", lineHeight: 1.8 }}>
              Generate instructions to view the repayment reference and payment details for this loan.
            </div>
          ) : (
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 320px",
                gap: 16,
                alignItems: "start",
              }}
            >
              <div style={innerCard("#FCFEFF")}>
                <div style={sectionLabel()}>Instruction details</div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Amount</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#0B1F33",
                        fontWeight: 1000,
                        fontSize: 18,
                      }}
                    >
                      {instruction.amount} {instruction.currency}
                    </div>
                  </div>

                  {instruction.reference ? (
                    <div style={innerCard("#FFFFFF")}>
                      <div style={sectionLabel()}>Payment reference</div>
                      <div
                        style={{
                          marginTop: 8,
                          color: "#0B1F33",
                          fontWeight: 1000,
                          fontSize: 18,
                          wordBreak: "break-word",
                        }}
                      >
                        {instruction.reference}
                      </div>
                    </div>
                  ) : null}

                  {(instruction.railName ||
                    instruction.bankName ||
                    instruction.accountName ||
                    instruction.accountNumber ||
                    instruction.sortCode) ? (
                    <div style={innerCard("#FFFFFF")}>
                      <div style={sectionLabel()}>Destination</div>

                      <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                        {instruction.railName ? (
                          <div style={helperText()}>Rail: {instruction.railName}</div>
                        ) : null}
                        {instruction.bankName ? (
                          <div style={helperText()}>Bank: {instruction.bankName}</div>
                        ) : null}
                        {instruction.accountName ? (
                          <div style={helperText()}>Account name: {instruction.accountName}</div>
                        ) : null}
                        {instruction.accountNumber ? (
                          <div style={helperText()}>Account number: {instruction.accountNumber}</div>
                        ) : null}
                        {instruction.sortCode ? (
                          <div style={helperText()}>Sort/Bank code: {instruction.sortCode}</div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {instruction.instructionText ? (
                    <div style={innerCard("#FFFFFF")}>
                      <div style={sectionLabel()}>Instruction note</div>
                      <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                        {instruction.instructionText}
                      </div>
                    </div>
                  ) : null}

                  {instruction.supportNote ? (
                    <div style={innerCard("#FFFBEF")}>
                      <div style={sectionLabel()}>Settlement note</div>
                      <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                        {instruction.supportNote}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={softCard("#FFFFFF")}>
                <div style={sectionLabel()}>Instruction actions</div>

                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <button
                    type="button"
                    onClick={copyReference}
                    disabled={!safeStr(instruction.reference)}
                    style={actionBtn("primary", !safeStr(instruction.reference))}
                  >
                    Copy Reference
                  </button>

                  <button
                    type="button"
                    onClick={copyPaymentDetails}
                    style={actionBtn("secondary")}
                  >
                    Copy Payment Details
                  </button>
                </div>
              </div>
            </div>
          )
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
            <div style={sectionLabel()}>Result and next move</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              What the member should do after the instruction is generated.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("result")}
            style={collapseToggle()}
          >
            {collapsed.result ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.result ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Repayment route result</div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Current state</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 16,
                      lineHeight: 1.35,
                    }}
                  >
                    {!instruction
                      ? "Waiting for instruction generation"
                      : "Instruction ready for payment"}
                  </div>
                </div>

                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>What to do next</div>
                  <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                    {!instruction
                      ? "Generate the instruction first so the member can see the exact reference and destination."
                      : "Pay using the exact reference, then use Finance or the wider support pages to watch the repayment become visible."}
                  </div>
                </div>

                {instruction?.createdAt ? (
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Generated at</div>
                    <div
                      style={{
                        marginTop: 8,
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 14,
                        lineHeight: 1.35,
                      }}
                    >
                      {safeDateTime(instruction.createdAt)}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Next routes</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <Link to="/app/finance" style={actionBtn("primary")}>
                  Open Finance
                </Link>

                <Link
                  to={summary?.id ? `/app/loan-summary/${summary.id}` : "/app/loans"}
                  style={actionBtn("secondary")}
                >
                  Return To Loan Summary
                </Link>

                <Link to="/app/notifications" style={actionBtn("secondary")}>
                  Action Inbox
                </Link>
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
              Keep related routes visible but secondary.
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
            <Link
              to={summary?.id ? `/app/loan-summary/${summary.id}` : "/app/loans"}
              style={actionBtn("primary")}
            >
              Loan Summary
            </Link>

            <Link to="/app/loan-workbench" style={actionBtn("secondary")}>
              Loan Workbench
            </Link>

            <Link to="/app/finance" style={actionBtn("secondary")}>
              Finance
            </Link>

            <Link to="/app/loans" style={actionBtn("secondary")}>
              Loans
            </Link>

            <Link to="/app/marketplace" style={actionBtn("secondary")}>
              Marketplace
            </Link>

            <Link to="/app/notifications" style={actionBtn("secondary")}>
              Action Inbox
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}