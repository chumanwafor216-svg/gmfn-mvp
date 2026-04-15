import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  createLoanInstruction,
  getCurrentClan,
  getLoanSummary,
  getMe,
  listExpectedPayments,
  safeCopy,
} from "../lib/api";

type NoticeTone = "success" | "error";

type LoanInstruction = {
  expected_payment_id?: number;
  reference?: string | null;
  reference_display?: string | null;
  reference_normalized?: string | null;
  loan_id?: number;
  amount?: string | number | null;
  currency?: string | null;
  due_at?: string | null;
  settlement?: {
    railName?: string | null;
    bankName?: string | null;
    accountName?: string | null;
    accountNumber?: string | null;
    sortCode?: string | null;
  } | null;
};

type ExpectedPaymentRow = {
  id?: number | string | null;
  expected_type?: string | null;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  reference_display?: string | null;
  reference_normalized?: string | null;
  confirmed_at?: string | null;
  due_at?: string | null;
  status_reason?: string | null;
  matched_bank_event_id?: number | string | null;
  meta?: any;
  meta_json?: any;
  loan_id?: number | string | null;
};

type CollapseState = {
  overview: boolean;
  instruction: boolean;
  result: boolean;
  routes: boolean;
};

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function n(value: unknown): number {
  const raw = safeStr(value).replace(/,/g, "");
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

function fmtMoney(value: unknown, currency: string): string {
  return `${n(value).toFixed(2)} ${currency}`;
}

function safeDateTime(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "Not set";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

function lc(value: unknown): string {
  return safeStr(value).toLowerCase();
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

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
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
  variant: "primary" | "secondary" | "soft",
  disabled = false
): React.CSSProperties {
  const primary = variant === "primary";
  const soft = variant === "soft";

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: soft
      ? "1px solid rgba(11,31,51,0.08)"
      : primary
      ? "none"
      : "1px solid rgba(11,31,51,0.10)",
    background: disabled
      ? "#CBD5E1"
      : primary
      ? "#0B63D1"
      : soft
      ? "#F8FBFF"
      : "#FFFFFF",
    color: disabled ? "#FFFFFF" : primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.86 : 1,
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...pageCard(tone === "error" ? "#FEF2F2" : "#F3FBF5"),
    border:
      tone === "error"
        ? "1px solid rgba(239,68,68,0.16)"
        : "1px solid rgba(34,197,94,0.16)",
    color: tone === "error" ? "#991B1B" : "#166534",
    fontWeight: 800,
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

function communityName(currentClan: any): string {
  return (
    firstTruthy(
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name,
      currentClan?.title
    ) || "Selected community"
  );
}

function communityPublicId(currentClan: any): string {
  return (
    firstTruthy(
      currentClan?.community_code,
      currentClan?.community?.community_code,
      currentClan?.profile?.community_code,
      currentClan?.marketplace?.community_code
    ) || "Awaiting issue"
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

function communityImageSrc(currentClan: any): string {
  return firstTruthy(
    currentClan?.community_image_url,
    currentClan?.profile_image_url,
    currentClan?.marketplace_image_url,
    currentClan?.cover_image_url,
    currentClan?.banner_url,
    currentClan?.image_url,
    currentClan?.logo_url
  );
}

function defaultCollapseState(): CollapseState {
  return {
    overview: false,
    instruction: false,
    result: false,
    routes: false,
  };
}

export default function RepaymentPage() {
  const { loanId } = useParams<{ loanId?: string }>();
  const numericLoanId = Number(loanId || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(defaultCollapseState());
  const [loading, setLoading] = useState(true);
  const [generatingInstruction, setGeneratingInstruction] = useState(false);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [instruction, setInstruction] = useState<LoanInstruction | null>(null);
  const [paymentConfirmedAt, setPaymentConfirmedAt] = useState<string | null>(null);
  const [expectedPayments, setExpectedPayments] = useState<ExpectedPaymentRow[]>([]);

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
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let alive = true;

    async function loadPage() {
      setLoading(true);
      try {
        const [meRes, clanRes, summaryRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          numericLoanId > 0 ? getLoanSummary(numericLoanId).catch(() => null) : Promise.resolve(null),
        ]);

        if (!alive) return;
        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setSummary(summaryRes || null);
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadPage();
    return () => {
      alive = false;
    };
  }, [numericLoanId]);

  useEffect(() => {
    let alive = true;

    async function loadExpected() {
      const clanId = Number(summary?.clan_id || currentClan?.id || currentClan?.clan_id || 0);
      if (clanId <= 0 || numericLoanId <= 0) {
        if (alive) setExpectedPayments([]);
        return;
      }

      try {
        const res = await listExpectedPayments({
          clan_id: clanId,
          expected_type: "repayment",
          limit: 100,
        }).catch(() => null);

        if (!alive) return;
        const items = Array.isArray(res)
          ? res
          : Array.isArray((res as any)?.items)
          ? (res as any).items
          : Array.isArray((res as any)?.data?.items)
          ? (res as any).data.items
          : [];
        setExpectedPayments(items as ExpectedPaymentRow[]);
      } catch {
        if (alive) setExpectedPayments([]);
      }
    }

    void loadExpected();
    return () => {
      alive = false;
    };
  }, [summary, currentClan, numericLoanId, instruction, paymentConfirmedAt]);

  const currency = firstTruthy(summary?.currency, "NGN");
  const loanStatus = lc(summary?.status);
  const canRepay =
    loanStatus === "approved" || loanStatus === "disbursed" || loanStatus === "active";
  const repaymentTaskActive = canRepay && !paymentConfirmedAt;

  const memberName =
    firstTruthy(
      me?.display_name,
      me?.nickname,
      me?.name,
      me?.first_name,
      me?.email
    ) || "Member";

  const gmfnId = firstTruthy(me?.gmfn_id, "Awaiting issue");
  const communityLabel = communityName(currentClan);
  const communityCode = communityPublicId(currentClan);
  const memberRole = communityRole(currentClan);
  const pictureSrc = communityImageSrc(currentClan);

  const outstandingAmount = useMemo(() => {
    const remaining = n(summary?.remaining_amount);
    if (remaining > 0) return remaining;
    return n(summary?.amount);
  }, [summary]);

  const currentExpectedPayment = useMemo(() => {
    const instructionExpectedId = Number(instruction?.expected_payment_id || 0);
    const instructionReference = firstTruthy(
      instruction?.reference_normalized,
      instruction?.reference_display,
      instruction?.reference
    ).toUpperCase();

    return (
      expectedPayments.find((item) => {
        const itemId = Number(item?.id || 0);
        const itemLoanId =
          Number(item?.loan_id || item?.meta?.loan_id || item?.meta_json?.loan_id || 0);
        const itemReference = firstTruthy(
          item?.reference_normalized,
          item?.reference_display
        ).toUpperCase();

        if (instructionExpectedId > 0 && itemId === instructionExpectedId) return true;
        if (instructionReference && itemReference && itemReference === instructionReference) return true;
        if (itemLoanId > 0 && itemLoanId === numericLoanId) return true;
        return false;
      }) || null
    );
  }, [expectedPayments, instruction, numericLoanId]);

  const routeState = useMemo(() => {
    if (!numericLoanId || !summary) {
      return {
        toneBg: "#FEF2F2",
        toneBorder: "1px solid rgba(239,68,68,0.16)",
        toneText: "#991B1B",
        step: "Context",
        title: "Loan repayment context is not ready.",
        detail: "Open a visible support item first so repayment can stay tied to the correct loan.",
      };
    }

    if (!canRepay) {
      return {
        toneBg: "#FFFBEF",
        toneBorder: "1px solid rgba(245,158,11,0.16)",
        toneText: "#92400E",
        step: "Eligibility",
        title: "Repayment opens after approval or disbursement.",
        detail: "This support item is not yet in a repayment-ready state.",
      };
    }

    if (!instruction) {
      return {
        toneBg: "#F8FBFF",
        toneBorder: "1px solid rgba(11,99,209,0.12)",
        toneText: "#0B63D1",
        step: "Instruction",
        title: "Generate the repayment instruction.",
        detail: "Use the exact loan repayment reference so the money trail can be reconciled to the correct support item.",
      };
    }

    if (!paymentConfirmedAt) {
      return {
        toneBg: "#F8FBFF",
        toneBorder: "1px solid rgba(11,99,209,0.12)",
        toneText: "#0B63D1",
        step: "Payment",
        title: "Pay using the exact repayment reference.",
        detail: "Once payment is made, keep this route focused until the repayment is clearly awaiting reconciliation.",
      };
    }

    return {
      toneBg: "#FFFBEF",
      toneBorder: "1px solid rgba(245,158,11,0.16)",
      toneText: "#92400E",
      step: "Awaiting reconciliation",
      title: "Repayment is waiting for reconciliation.",
      detail: "The payment has been declared on this route and should now remain visible until finance or admin reconciliation confirms it.",
    };
  }, [numericLoanId, summary, canRepay, instruction, paymentConfirmedAt]);

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleGenerateInstruction() {
    if (!numericLoanId || !summary) {
      setNotice({ tone: "error", text: "Loan repayment context is not ready." });
      return;
    }

    const clanId = Number(summary?.clan_id || currentClan?.id || currentClan?.clan_id || 0);
    if (clanId <= 0) {
      setNotice({ tone: "error", text: "Community context is not ready." });
      return;
    }

    if (!canRepay) {
      setNotice({
        tone: "error",
        text: "Repayment instructions open only after approval or disbursement.",
      });
      return;
    }

    if (outstandingAmount <= 0) {
      setNotice({
        tone: "error",
        text: "No outstanding repayment amount is visible for this support item.",
      });
      return;
    }

    setGeneratingInstruction(true);
    try {
      const generated = await createLoanInstruction({
        clan_id: clanId,
        loan_id: numericLoanId,
        amount: String(outstandingAmount.toFixed(2)),
        currency,
      });

      setInstruction((generated || null) as LoanInstruction | null);
      setPaymentConfirmedAt(null);
      setNotice({ tone: "success", text: "Repayment instruction generated." });
    } catch (error: any) {
      setNotice({
        tone: "error",
        text:
          safeStr(error?.message) ||
          "Repayment instruction could not be generated.",
      });
    } finally {
      setGeneratingInstruction(false);
    }
  }

  function handleConfirmPaymentMade() {
    if (!instruction) {
      setNotice({ tone: "error", text: "Generate the repayment instruction first." });
      return;
    }

    setPaymentConfirmedAt(new Date().toISOString());
    setNotice({
      tone: "success",
      text: "Repayment marked as made. Waiting for reconciliation.",
    });
  }

  function handleCopyReference() {
    const reference = firstTruthy(
      instruction?.reference_display,
      instruction?.reference
    );
    if (!reference) {
      setNotice({ tone: "error", text: "No repayment reference is visible yet." });
      return;
    }

    safeCopy(reference);
    setNotice({ tone: "success", text: "Repayment reference copied." });
  }

  function handleCopyInstruction() {
    if (!instruction) {
      setNotice({ tone: "error", text: "Generate the repayment instruction first." });
      return;
    }

    const settlement = instruction?.settlement || {};
    const text = [
      `Community: ${communityLabel}`,
      `Community ID: ${communityCode}`,
      `GMFN ID: ${gmfnId}`,
      `Member: ${memberName}`,
      memberRole ? `Role: ${memberRole}` : "",
      `Loan ID: ${numericLoanId}`,
      `Current step: ${routeState.step}`,
      `Outstanding amount: ${fmtMoney(outstandingAmount, currency)}`,
      firstTruthy(instruction?.reference_display, instruction?.reference)
        ? `Reference: ${firstTruthy(instruction?.reference_display, instruction?.reference)}`
        : "",
      settlement?.bankName ? `Bank: ${settlement.bankName}` : "",
      settlement?.accountName ? `Account name: ${settlement.accountName}` : "",
      settlement?.accountNumber ? `Account number: ${settlement.accountNumber}` : "",
      settlement?.sortCode ? `Sort code: ${settlement.sortCode}` : "",
      instruction?.due_at ? `Due at: ${safeDateTime(instruction.due_at)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    safeCopy(text);
    setNotice({ tone: "success", text: "Repayment instruction copied." });
  }

  if (loading) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 40, display: "grid", gap: 18 }}>
        <PageTopNav
          sectionLabel="Repayment"
          title="Loan Repayment"
          subtitle="Loading the repayment route..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/loans"
          backLabel="Loans & Support"
          nextLinks={[{ label: "Loan Summary", to: numericLoanId > 0 ? `/app/loan-summary/${numericLoanId}` : "/app/loans" }]}
          utilityLinks={[{ label: "Finance", to: "/app/finance" }]}
        />
        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>Loading repayment route...</div>
        </section>
      </div>
    );
  }

  if (!numericLoanId || !summary) {
    return (
      <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 40, display: "grid", gap: 18 }}>
        <PageTopNav
          sectionLabel="Repayment"
          title="Loan Repayment"
          subtitle="Repayment needs one visible support item."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/loans"
          backLabel="Loans & Support"
        />
        <section style={pageCard("#FEF2F2")}>
          <div style={{ color: "#991B1B", fontWeight: 900 }}>Loan repayment could not be opened.</div>
          <div style={{ marginTop: 8, color: "#991B1B", lineHeight: 1.8 }}>
            Open the correct support item first, then continue into repayment from its loan summary.
          </div>
        </section>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 40, display: "grid", gap: 18 }}>
      <PageTopNav
        sectionLabel="Repayment"
        title={`Loan Repayment #${numericLoanId}`}
        subtitle="Repayment is its own guided money stage. It should stay tied to one support item from exact amount and reference through payment and reconciliation."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo={`/app/loan-summary/${numericLoanId}`}
        backLabel="Loan Summary"
        nextLinks={
          repaymentTaskActive
            ? [{ label: "Loan Summary", to: `/app/loan-summary/${numericLoanId}` }]
            : [
                { label: "Loan Summary", to: `/app/loan-summary/${numericLoanId}` },
                { label: "Finance", to: "/app/finance" },
              ]
        }
        utilityLinks={
          repaymentTaskActive
            ? [{ label: "Loans & Support", to: "/app/loans" }]
            : [{ label: "Notifications", to: "/app/notifications" }]
        }
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}>
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
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div style={{ color: "#F8FBFF", fontWeight: 900, fontSize: 20, textAlign: "center", padding: 12, lineHeight: 1.3 }}>
                  {communityLabel}
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={sectionLabel()}>Fixed repayment context</div>
            <div style={{ marginTop: 10, color: "#F8FBFF", fontWeight: 900, fontSize: isCompact ? 28 : 34, lineHeight: 1.1 }}>
              Repay loan #{numericLoanId}
            </div>
            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1", maxWidth: 860 }}>
              This route should stay tied to one approved support item. The exact amount,
              exact reference, and exact next step should remain visible until repayment
              is clearly waiting for confirmation.
            </div>
            <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>Community ID: {communityCode}</span>
              <span style={badge(false)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>Member: {memberName}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Current page: Repayment</span>
              <span style={badge(false)}>Current step: {routeState.step}</span>
            </div>
          </div>

          <div style={{ ...softCard(routeState.toneBg), border: routeState.toneBorder }}>
            <div style={sectionLabel()}>Current route state</div>
            <div style={{ marginTop: 10, color: routeState.toneText, fontWeight: 900, fontSize: 20, lineHeight: 1.25 }}>
              {routeState.title}
            </div>
            <div style={{ marginTop: 10, ...helperText(), color: "#0B1F33" }}>
              {routeState.detail}
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabel()}>Repayment overview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The core repayment facts stay visible in one place.
            </div>
          </div>
          <button type="button" onClick={() => toggleSection("overview")} style={collapseToggle()}>
            {collapsed.overview ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.overview ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Loan status</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>
                {safeStr(summary?.status || "Awaiting issue")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Outstanding amount</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontSize: 18, fontWeight: 900 }}>
                {fmtMoney(outstandingAmount, currency)}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Paid total</div>
              <div style={{ marginTop: 8, color: "#0B63D1", fontSize: 18, fontWeight: 900 }}>
                {fmtMoney(summary?.paid_total, currency)}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Due at</div>
              <div style={{ marginTop: 8, color: "#92400E", fontSize: 15, fontWeight: 900, lineHeight: 1.35 }}>
                {safeDateTime(summary?.due_at)}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabel()}>Repayment instruction</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Generate the exact repayment reference for this support item.
            </div>
          </div>
          <button type="button" onClick={() => toggleSection("instruction")} style={collapseToggle()}>
            {collapsed.instruction ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.instruction ? (
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

              {!instruction ? (
                <div style={{ marginTop: 10, ...helperText() }}>
                  Generate the repayment instruction to reveal the exact reference and settlement details for this loan.
                </div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Exact amount</div>
                    <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 1000, fontSize: 18 }}>
                      {fmtMoney(instruction.amount || outstandingAmount, currency)}
                    </div>
                  </div>

                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Reference</div>
                    <div style={{ marginTop: 8, color: "#0B63D1", fontWeight: 1000, fontSize: 18, wordBreak: "break-word" }}>
                      {firstTruthy(instruction.reference_display, instruction.reference, "Awaiting reference")}
                    </div>
                  </div>

                  <div style={innerCard("#FFFFFF")}>
                    <div style={sectionLabel()}>Settlement details</div>
                    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                      <div style={helperText()}>
                        Bank: {firstTruthy(instruction?.settlement?.bankName, "Not returned yet")}
                      </div>
                      <div style={helperText()}>
                        Account name: {firstTruthy(instruction?.settlement?.accountName, "Not returned yet")}
                      </div>
                      <div style={helperText()}>
                        Account number: {firstTruthy(instruction?.settlement?.accountNumber, "Not returned yet")}
                      </div>
                      <div style={helperText()}>
                        Sort code: {firstTruthy(instruction?.settlement?.sortCode, "Not returned yet")}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Instruction actions</div>
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => void handleGenerateInstruction()}
                  disabled={generatingInstruction || !canRepay}
                  style={actionBtn("primary", generatingInstruction || !canRepay)}
                >
                  {generatingInstruction ? "Generating..." : "Generate Repayment Instruction"}
                </button>

                <button
                  type="button"
                  onClick={handleCopyReference}
                  disabled={!instruction}
                  style={actionBtn("secondary", !instruction)}
                >
                  Copy Reference
                </button>

                <button
                  type="button"
                  onClick={handleCopyInstruction}
                  disabled={!instruction}
                  style={actionBtn("secondary", !instruction)}
                >
                  Copy Full Instruction
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabel()}>Result and reconciliation</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Stay on this route until repayment is clearly awaiting reconciliation or visibly confirmed elsewhere.
            </div>
          </div>
          <button type="button" onClick={() => toggleSection("result")} style={collapseToggle()}>
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
              <div style={sectionLabel()}>Current result state</div>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Route result</div>
                  <div style={{ marginTop: 8, color: routeState.toneText, fontWeight: 900, fontSize: 16, lineHeight: 1.35 }}>
                    {routeState.title}
                  </div>
                  <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                    {routeState.detail}
                  </div>
                </div>

                {paymentConfirmedAt ? (
                  <div style={innerCard("#FFFBEF")}>
                    <div style={sectionLabel()}>Payment declared at</div>
                    <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900, fontSize: 14, lineHeight: 1.35 }}>
                      {safeDateTime(paymentConfirmedAt)}
                    </div>
                  </div>
                ) : null}

                {currentExpectedPayment ? (
                  <div
                    style={innerCard(
                      currentExpectedPayment.matched_bank_event_id ? "#F3FBF5" : "#F8FBFF"
                    )}
                  >
                    <div style={sectionLabel()}>Expected payment visibility</div>
                    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                      <div style={helperText()}>
                        Status: {safeStr(currentExpectedPayment.status || "expected")}
                      </div>
                      <div style={helperText()}>
                        Reference: {firstTruthy(
                          currentExpectedPayment.reference_display,
                          currentExpectedPayment.reference_normalized,
                          "Awaiting reference"
                        )}
                      </div>
                      <div style={helperText()}>
                        Amount: {safeStr(currentExpectedPayment.amount || "0.00")}{" "}
                        {safeStr(currentExpectedPayment.currency || currency)}
                      </div>
                      <div style={helperText()}>
                        {currentExpectedPayment.matched_bank_event_id
                          ? `Matched bank event visible: ${safeStr(currentExpectedPayment.matched_bank_event_id)}`
                          : currentExpectedPayment.confirmed_at
                          ? `Confirmed at: ${safeDateTime(currentExpectedPayment.confirmed_at)}`
                          : currentExpectedPayment.due_at
                          ? `Due at: ${safeDateTime(currentExpectedPayment.due_at)}`
                          : "Awaiting reconciliation visibility in Finance"}
                      </div>
                      {safeStr(currentExpectedPayment.status_reason) ? (
                        <div style={helperText()}>
                          Reason: {safeStr(currentExpectedPayment.status_reason)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : instruction ? (
                  <div style={innerCard("#F8FBFF")}>
                  <div style={sectionLabel()}>Expected payment visibility</div>
                  <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                      Finance has not yet shown a matching repayment expectation for this
                      generated reference.
                  </div>
                </div>
                ) : null}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>
                {repaymentTaskActive ? "Current route actions" : "Completion actions"}
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <button
                  type="button"
                  onClick={handleConfirmPaymentMade}
                  disabled={!instruction || Boolean(paymentConfirmedAt)}
                  style={actionBtn("primary", !instruction || Boolean(paymentConfirmedAt))}
                >
                  {paymentConfirmedAt ? "Payment Declared" : "I Have Paid Using This Reference"}
                </button>

                <OriginLink to={`/app/loan-summary/${numericLoanId}`} style={actionBtn("secondary")}>
                  Open Loan Summary
                </OriginLink>

                {!repaymentTaskActive ? (
                  <OriginLink to="/app/finance" style={actionBtn("secondary")}>
                    Open Finance
                  </OriginLink>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={sectionLabel()}>
              {repaymentTaskActive ? "Route focus" : "Next routes"}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {repaymentTaskActive
                ? "This repayment is still active. Keep the route focused on the exact loan, exact amount, exact reference, and reconciliation state."
                : "Related routes reopen after repayment has reached a visible conclusion."}
            </div>
          </div>
          <button type="button" onClick={() => toggleSection("routes")} style={collapseToggle()}>
            {collapsed.routes ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.routes ? (
          repaymentTaskActive ? (
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>One-task mode</div>
                <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                  Stay inside this repayment path until the instruction is generated,
                  payment is made with the exact reference, and the route is clearly
                  awaiting reconciliation.
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <OriginLink to={`/app/loan-summary/${numericLoanId}`} style={actionBtn("primary")}>
                Loan Summary
              </OriginLink>
              <OriginLink to="/app/finance" style={actionBtn("secondary")}>
                Finance
              </OriginLink>
              <OriginLink to="/app/loans" style={actionBtn("secondary")}>
                Loans & Support
              </OriginLink>
            </div>
          )
        ) : null}
      </section>
    </div>
  );
}
